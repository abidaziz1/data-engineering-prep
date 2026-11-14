/* Mission 8: capacity. Pools, DAG limits, priorities, executors, and why a task does not start.
   The pool and DAG-limit runs, the priority order, the pool list and the `airflow tasks failed-deps` messages are recorded from Apache Airflow 3.4.0 with a scheduler and the LocalExecutor
   (airflow/verify/capture_af.py). The executors other than LocalExecutor are described from documentation and were not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PL = G.counts('af.pools'), FD = G.counts('af.failed_deps'), POOLS = G.file('dags/brewline_pools.py');
  var TWO = PL.brewline_pool_two_slots, LIM = PL.brewline_dag_limit, PRI = PL.brewline_pool_priority;
  G.expect(TWO.peak_running === 2 && LIM.peak_running === 2 && PRI.peak_running === 1 && PRI.start_order.join() === 'report_5,report_4,report_3,report_2,report_1', 'the recorded pool runs');
  G.expect(G.cfg('core.parallelism') === '32' && G.cfg('core.max_active_tasks_per_dag') === '16' && G.cfg('core.max_active_runs_per_dag') === '16' && G.cfg('core.default_pool_task_slot_count') === '128', 'the recorded capacity defaults');
  var starts = function (d) { return d.tasks.slice().sort(function (a, b) { return a.start - b.start; }).map(function (t) { return t.start; }).join(', '); };

  var NOPOOL_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_stores():',
    '    @task',
    '    def list_stores():',
    '        return [f"S-{n:03d}" for n in range(200)]',
    '',
    '    @task',
    '    def export_store(store):',
    '        print("calling the warehouse for", store)  # the warehouse allows 4 queries at a time',
    '',
    '    export_store.expand(store=list_stores())',
    '',
    '',
    'brewline_stores()'
  ].join('\n');
  var NOPOOL_FIX = NOPOOL_BUG.replace('    @task\n    def export_store(store):', '    @task(pool="warehouse_pool")\n    def export_store(store):');
  var PAST_BUG = [
    'from datetime import timedelta',
    '',
    'from airflow.sdk import DAG',
    'from airflow.providers.standard.operators.bash import BashOperator',
    'import pendulum',
    '',
    'with DAG(',
    '    dag_id="brewline_daily_load",',
    '    schedule="@daily",',
    '    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),',
    '    catchup=False,',
    '    default_args={"depends_on_past": True, "retries": 2, "retry_delay": timedelta(minutes=5)},',
    ') as dag:',
    '    BashOperator(task_id="load", bash_command="echo loading {{ ds }}")'
  ].join('\n');
  var PAST_FIX = PAST_BUG.replace('"depends_on_past": True, ', '');

  function poolLines() { return G.plain(G.text('af.pools_list'), { cmd: 'airflow pools list', d: 90 }); }
  function failedLines() {
    var out = [];
    ['pool_full', 'dag_limit', 'upstream_running', 'depends_on_past'].forEach(function (k) {
      out = out.concat(G.plain(FD[k].failed_deps, { cmd: 'airflow tasks failed-deps ' + FD[k].dag_id + ' ' + FD[k].task_id + ' <run_id>', d: 80 }));
    });
    return out;
  }

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Capacity: pools, limits and executors', short: 'Capacity', blurb: 'Pools, DAG limits, priorities and executors, and the reasons a task does not start', minutes: 60,
    focus: ['mon'],
    goals: [
      'Name the **four limits** between a ready task and a running task: pool, DAG run, executor, and the task itself.',
      'Use a **pool** to protect a system that tasks call, and know what **priority_weight** does.',
      'Say what the **default values** are and which one decides first.',
      'Choose an **executor**: Local, Celery, Kubernetes, and say what each costs.',
      'Find out **why a task does not start** with `airflow tasks failed-deps`.'
    ],
    say: 'Mission 8 is capacity. A task can be ready and still not run, and every engineer on call has asked why. I ran six tasks in a pool of two slots, six tasks under a DAG limit of two, and five tasks with different priorities in a pool of one slot. Then I made four different reasons happen on purpose and kept the message that Airflow printed for each.',
    scenes: [
      B.talk({
        id: 'm8-talk', t: 1, src: 'rec', title: 'Four limits between a ready task and a running task',
        say: 'Press Next for each limit. A task starts when it passes all four. The lowest one decides.',
        items: [
          ['A pool', 'A **pool** is a number of slots. A task takes one slot (or more, with `pool_slots`) while it is queued or running. A task with no pool uses `default_pool`, which has ' + G.cfg('core.default_pool_task_slot_count') + ' slots by default. A pool is how you protect a system: "the warehouse takes four queries at a time" becomes a pool of four.', 'A limit that you name and share across DAGs.'],
          ['The DAG run', '`max_active_tasks` limits the tasks that run at once in one DAG run. The default is ' + G.cfg('core.max_active_tasks_per_dag') + '. In Airflow 2 it was a limit for the whole DAG, and in Airflow 3 it is **per run**. `max_active_runs` limits the runs of one DAG (' + G.cfg('core.max_active_runs_per_dag') + ' by default).', 'A limit on one DAG.'],
          ['The executor', '`parallelism` is the largest number of task instances that run at once **per scheduler**, whatever the number of workers: ' + G.cfg('core.parallelism') + ' by default. It is the cap on the whole installation, or on each scheduler if you run several.', 'A limit on everything.'],
          ['The task itself', 'A task can limit its own copies: `max_active_tis_per_dag` across runs, and `max_active_tis_per_dagrun` inside one run. They are useful for a mapped task.', 'A limit on one task.'],
          ['Who picks first', 'When more tasks are ready than there are slots, tasks are chosen by `priority_weight`, highest first. The default `weight_rule` is `' + G.cfg('core.default_task_weight_rule') + '`: a task\'s weight includes the weights of the tasks after it.', 'Priority breaks the tie.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm8-code', t: 1, src: 'rec', title: 'Two DAGs: a pool of two slots, and priorities', file: 'brewline_pools.py', lang: 'python', code: POOLS,
        steps: [
          { say: 'These are the DAGs of the recording. Both use a pool that I created with the command line before the run.', lines: null },
          { say: 'The first DAG has six tasks that each sleep for three seconds. They all use `warehouse_pool`, a pool of **two slots**.', lines: G.span(POOLS, /dag_id="brewline_pool_two_slots"/, /pool="warehouse_pool"/) },
          { say: 'The second DAG has five tasks with `priority_weight` from 1 to 5, and they share a pool of **one slot**. Only one runs at a time, so the weight decides the order.', lines: G.span(POOLS, /dag_id="brewline_pool_priority"/, /priority_weight=n/) }
        ],
        note: 'The pools were created with `airflow pools set warehouse_pool 2 "two slots for the warehouse"`. A pool must exist before a task uses it, or the task will not be scheduled.'
      }),

      B.term({
        id: 'm8-pools', t: 1, src: 'rec', title: 'The pools of the recording',
        say: 'This is the real output of `airflow pools list`. Every Airflow has the default pool. The others are the ones that the recording created.',
        lines: poolLines,
        after: 'Each pool has a number of slots and a column `include_deferred`. It is `False` here, so a deferred task (mission 7) does not count against the slots. Switch it on if you want a pool to limit waiting tasks too.',
        afterKind: 'tip',
        doneSay: 'A pool is the cheapest way to say "this system takes only so many at a time".'
      }),

      B.widget({ id: 'm8-w-cap', kind: 'capacity', t: 1, src: 'rec', title: 'Lab: pool, DAG limit and priority' }),

      B.cmp({
        id: 'm8-recorded', t: 1, src: 'rec', title: 'What the three runs showed',
        say: 'Press Next for the recorded numbers. The times are seconds after the first task started, on one machine.',
        cols: ['Run', 'Setting', 'Tasks at once', 'Start times (s)'],
        hl: 2,
        rows: [
          ['Six tasks of 3 seconds', 'Pool `warehouse_pool` with 2 slots', TWO.peak_running + ' at most', starts(TWO)],
          ['Six tasks of 3 seconds', 'DAG `max_active_tasks=2`, default pool', LIM.peak_running + ' at most', starts(LIM)],
          ['Five tasks of 2 seconds', 'Pool `single_pool` with 1 slot, `priority_weight` 1 to 5', PRI.peak_running + ' at a time', starts(PRI)]
        ],
        steps: [
          { upto: 1, say: 'Six tasks in a pool of two run in **three waves** of two. The gap between waves is a little more than the three seconds of work, because the scheduler needs a moment to start the next ones.' },
          { upto: 2, say: 'A DAG limit of two gives the same three waves. The default pool had room for all six, so the DAG limit decided.' },
          { upto: 3, say: 'With one slot the tasks ran one after another, and the start order was **' + PRI.start_order.join(', ') + '**: the highest weight first.' }
        ]
      }),

      B.term({
        id: 'm8-failed', t: 1, src: 'rec', title: 'Why does my task not start? Ask Airflow',
        say: 'The command `airflow tasks failed-deps` prints the dependencies of a task instance that are not met. I made four different reasons happen, and these are the real messages.',
        lines: failedLines,
        after: 'The first is a **full pool**: no open slots. The second is the **DAG limit**. The third says that an **upstream task is still running**, so the task is not scheduled yet. The fourth is `depends_on_past`: the same task of the run before has not succeeded. The lab below puts the four next to the symptom and the fix.',
        afterKind: 'tip',
        doneSay: 'Before you change any setting, run `failed-deps`. It says which one is blocking.'
      }),

      B.widget({ id: 'm8-w-why', kind: 'whyidle', t: 1, src: 'rec', title: 'Lab: find the reason a task does not run' }),

      B.cmp({
        id: 'm8-exec', t: 1, src: 'docs', title: 'Executors: where a task runs',
        say: 'The executor decides where a task runs. It lives **inside the scheduler process**. Press Next to compare the common ones. I ran only the first. The others are described from the Airflow documentation.',
        cols: ['Executor', 'How it runs a task', 'Good for', 'Costs'],
        hl: 1,
        rows: [
          ['`LocalExecutor` (default)', 'A process on the machine of the scheduler.', 'Development, and small single-machine setups.', 'It shares the machine with the scheduler. No scaling beyond one machine.'],
          ['`CeleryExecutor`', 'Sends the task to a queue. A pool of long-running workers takes it.', 'Steady load, low start-up time, many small tasks.', 'A broker to run, workers to size and update, and all tasks share the worker environment.'],
          ['`KubernetesExecutor`', 'Starts a pod for each task.', 'Isolation, different images and sizes for each task, bursty load.', 'A pod start for every task, so it adds seconds. You need a cluster.'],
          ['`EdgeExecutor`', 'Workers from the edge3 provider take the tasks.', 'Workers that sit outside your main cluster. The provider documentation has the details.', 'A provider to install. I did not run it.'],
          ['Several at once', 'A comma-separated list in the `executor` setting, available since 2.10.', 'Mixing a cheap local path and a heavy remote path.', 'More configuration, and the choice per task has to be understood.']
        ],
        steps: [
          { upto: 2, say: 'Local is the default, and the documentation says that it fits small single-machine installations. Celery is the classic scale-out.' },
          { upto: 4, say: 'Kubernetes trades start-up time for isolation. Edge is for workers that cannot sit in your cluster.' },
          { upto: 5, say: 'You can run more than one. Use it when two kinds of work really need two kinds of executor.' }
        ]
      }),

      B.cmp({
        id: 'm8-defaults', t: 2, src: 'rec', title: 'The defaults that decide how much runs at once',
        say: 'These are the values that Airflow 3.4.0 reports for a fresh installation. Press Next to read what each one limits.',
        cols: ['Setting', 'Default', 'What it limits'],
        hl: 1,
        rows: [
          ['`core.parallelism`', G.cfg('core.parallelism'), 'Task instances running at once, per scheduler.'],
          ['`core.max_active_tasks_per_dag`', G.cfg('core.max_active_tasks_per_dag'), 'Task instances running at once in one DAG run.'],
          ['`core.max_active_runs_per_dag`', G.cfg('core.max_active_runs_per_dag'), 'Active runs of one DAG.'],
          ['`core.default_pool_task_slot_count`', G.cfg('core.default_pool_task_slot_count'), 'Slots of `default_pool`, which tasks without a pool use. It applies when the pool is first created.'],
          ['`scheduler.max_tis_per_query`', G.cfg('scheduler.max_tis_per_query'), 'Task instances that the scheduler looks at in each loop.'],
          ['`core.default_task_weight_rule`', G.cfg('core.default_task_weight_rule'), 'How a task\'s priority weight is calculated.'],
          ['`scheduler.task_queued_timeout`', G.cfg('scheduler.task_queued_timeout') + ' s', 'How long a task may stay `queued` before it is retried or failed.']
        ],
        steps: [
          { upto: 3, say: 'Three numbers cap the running tasks: the executor, the DAG run and the pool. A default installation allows 32 at once, 16 in a run, and 128 in the default pool. The lowest decides, and here it is the first.' },
          { upto: 7, say: 'The other settings shape how fast the scheduler fills those limits and how long a task may wait. Change one at a time and measure.' }
        ]
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'A pool has two slots and six tasks of three seconds use it. About how long does the DAG take, and how many waves did the recording show?',
        opts: [
          { t: 'About 3 seconds, one wave', fb: 'Only two tasks can run at once.' },
          { t: 'About 9 seconds or a little more, three waves of two', fb: '' },
          { t: 'About 18 seconds, one task at a time', fb: 'The pool allows two at once.' },
          { t: 'It depends on the executor only', fb: 'The pool limit applies first.' }
        ],
        ok: 1, why: 'Six tasks in waves of two make three waves. The recording started the tasks at ' + starts(TWO) + ' seconds, and at most ' + TWO.peak_running + ' ran at once.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'Which task starts first when five ready tasks share one slot and have `priority_weight` of 1, 2, 3, 4 and 5?',
        opts: [
          { t: 'The one with weight 1', fb: 'A higher weight goes first.' },
          { t: 'The one with weight 5', fb: '' },
          { t: 'The one that was defined first in the file', fb: 'Order in the file does not decide.' },
          { t: 'A random one', fb: 'The weight decides, so it is predictable.' }
        ],
        ok: 1, why: 'The recorded start order was ' + PRI.start_order.join(', ') + '. Give the tasks that must finish first a higher weight.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'You do not set a pool on a task. Which pool does it use?',
        opts: [
          { t: 'None: it is unlimited', fb: 'Every task is in a pool.' },
          { t: '`default_pool`, with ' + G.cfg('core.default_pool_task_slot_count') + ' slots by default', fb: '' },
          { t: 'A pool named after the DAG', fb: 'Airflow does not create pools for you.' },
          { t: 'The pool of the previous task', fb: 'Pools are not inherited.' }
        ],
        ok: 1, why: 'The recorded pool list starts with `default_pool` and ' + G.cfg('core.default_pool_task_slot_count') + ' slots. A task that does not name a pool uses it.'
      }),

      B.quiz({
        id: 'm8-q4', t: 1,
        q: 'A task is in the state `scheduled` and does not start. The pool is full. What does `airflow tasks failed-deps` print?',
        opts: [
          { t: 'Nothing: the task is fine', fb: 'It names the dependency that is not met.' },
          { t: 'A message that there are 0 open slots in the pool and that the task requires 1 pool slot', fb: '' },
          { t: 'The traceback of the failure', fb: 'The task has not failed. It has not started.' },
          { t: 'An import error', fb: 'The DAG imported fine.' }
        ],
        ok: 1, why: 'The recorded message was: "' + FD.pool_full.failed_deps.split('\n')[1] + '". When you see `scheduled` for a long time, a full pool is one of the first things to check.'
      }),

      B.quiz({
        id: 'm8-q5', t: 1,
        q: 'What does `depends_on_past=True` do on a task?',
        opts: [
          { t: 'It reads data from earlier days', fb: 'It is about task states, not data.' },
          { t: 'The task of this run starts only if the same task succeeded in the previous run', fb: '' },
          { t: 'It reruns the previous day first', fb: 'Nothing is rerun for you.' },
          { t: 'It disables retries', fb: 'It is unrelated to retries.' }
        ],
        ok: 1, why: 'The recorded message was: "' + FD.depends_on_past.failed_deps.split('\n').slice(-1)[0].trim() + '". One failed day then blocks every later day until you fix or clear it.'
      }),

      B.quiz({
        id: 'm8-q6', t: 2,
        q: 'You migrate from Airflow 2. A DAG has `max_active_tasks=8` and runs 3 DAG runs at the same time. How many tasks can the DAG run at most in Airflow 3?',
        opts: [
          { t: '8 across all runs', fb: 'That was Airflow 2.' },
          { t: '8 for each run, so up to 24 at once, if the pool and `parallelism` allow it', fb: '' },
          { t: '3', fb: 'The limit counts tasks, not runs.' },
          { t: '16, the default', fb: 'The DAG sets its own value.' }
        ],
        ok: 1, why: 'The parameter documentation in the installed package says: concurrently per DAG run, and that in Airflow 2 this was a global limit on the DAG. Check the capacity of the systems that your tasks call after an upgrade.'
      }),

      B.quiz({
        id: 'm8-q7', t: 2,
        q: 'Where does the executor run, according to the documentation?',
        opts: [
          { t: 'In its own process, which you start separately', fb: 'That is a common guess. It is wrong.' },
          { t: 'Inside the scheduler process', fb: '' },
          { t: 'Inside the API server', fb: 'The API server serves the UI and the APIs.' },
          { t: 'Inside each worker', fb: 'Workers run tasks. They do not decide.' }
        ],
        ok: 1, why: 'The documentation says: the executor logic runs inside the scheduler process, and runs the tasks locally or not depending on the executor selected. The LocalExecutor therefore uses the scheduler\'s machine.'
      }),

      B.quiz({
        id: 'm8-q8', t: 2,
        q: 'A mapped task creates 200 copies and the warehouse accepts four queries at a time. What is the cleanest limit?',
        opts: [
          { t: 'Lower `parallelism` to 4', fb: 'It slows every DAG on the installation.' },
          { t: 'A pool of four slots for that task', fb: '' },
          { t: 'Hope that the warehouse queues them', fb: 'It may reject them or slow down for all users.' },
          { t: 'Set `retries=10`', fb: 'Retries do not limit the load.' }
        ],
        ok: 1, why: 'A pool says "this system takes four at a time" in one place and shares it across DAGs. `max_active_tis_per_dagrun` limits one task inside one run, and a pool also limits other DAGs that use the same system.'
      }),

      B.bug({
        id: 'm8-bug1', t: 1, q: 'This DAG starts 200 queries against a warehouse that allows four at a time. The warehouse rejects the rest. Click the line that needs a change.',
        file: 'brewline_stores.py', lang: 'python', code: NOPOOL_BUG, bad: [G.at(NOPOOL_BUG, /def export_store/) - 1, G.at(NOPOOL_BUG, /def export_store/)],
        hint: 'What limits how many copies of a task run at once, across all DAGs?',
        why: 'The task is in `default_pool`, which has ' + G.cfg('core.default_pool_task_slot_count') + ' slots, and the DAG limit is ' + G.cfg('core.max_active_tasks_per_dag') + '. A pool of four slots for the warehouse makes the limit explicit and protects the warehouse from every DAG that uses it.',
        fix: NOPOOL_FIX,
        cheer: 'Name the limit of every system you call.'
      }),

      B.bug({
        id: 'm8-bug2', t: 2, q: 'On Monday the `load` task failed. On Tuesday, Wednesday and Thursday it did not start, although the source was fine. Click the line that explains it.',
        file: 'brewline_daily_load.py', lang: 'python', code: PAST_BUG, bad: [G.at(PAST_BUG, /depends_on_past/)],
        hint: 'What has to be true about yesterday for today\'s task to start?',
        why: 'With `depends_on_past=True` in the default arguments, each day\'s `load` starts only after the day before succeeded. One failure blocks every later day, and `airflow tasks failed-deps` says so. Make the loads idempotent and independent, and handle a failed day by rerunning it.',
        fix: PAST_FIX,
        cheer: 'Chains of days turn one failure into a week of silence.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the way to a running task in order.',
        items: [
          'The parents have succeeded, so the dependencies are met and the task is `scheduled`',
          'The scheduler checks the limits: the pool, the DAG run, the executor',
          'A slot is free, and the executor gets the task, which is now `queued`',
          'A worker starts the task, which is now `running`',
          'The task ends in `success` or `failed`, and its slot is free again'
        ],
        why: 'A task can wait at the second step for as long as the limits are full. `failed-deps` shows which limit it is waiting for.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: which executor for Brewline?',
        scenario: 'Brewline runs about 400 task instances a night. Most last a minute and call the warehouse. A few are heavy Spark submissions with different Python dependencies. The team is three engineers, and the company already runs a Kubernetes cluster that another team operates. Which executor do you start with?',
        opts: [
          { t: '`LocalExecutor` on a bigger machine', d: 'The simplest, with nothing extra to run.', lose: 'It shares the machine with the scheduler, so a heavy task slows scheduling, and the dependencies of the heavy jobs would all have to live in one environment.' },
          { t: '`CeleryExecutor` with a broker and ten workers', d: 'It scales well for many small tasks and starts them fast.', lose: 'It needs a broker and workers that your three engineers must run and update, and every task shares the worker environment. The heavy jobs with different dependencies do not fit.' },
          { t: '`KubernetesExecutor`, using the cluster that exists', d: 'Each task gets its own pod and image, the cluster is already operated by another team, and a pod start of a few seconds is small for tasks that last a minute.' }
        ],
        pick: 2,
        why: 'The deciding facts are isolation for the heavy jobs and a cluster that someone else runs. The cost of a pod start is small next to a one-minute task.',
        when: 'Choose Celery when the work is many short tasks and start-up time matters more than isolation, or when you have no cluster. Choose Local for a small single-machine installation.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'docs', title: 'Incident: tasks are scheduled and nothing starts', time: '04:25',
        alert: '**The 04:00 DAGs have been `scheduled` for 25 minutes. The scheduler is healthy. The UI shows 32 tasks `running` across several DAGs.** Nobody changed anything.',
        clues: ['`core.parallelism` is at its default of ' + G.cfg('core.parallelism'), 'The pools show free slots', 'The pool and DAG limit checks show nothing that blocks the waiting tasks'],
        opts: [
          { t: 'Check the executor limit: 32 running tasks is `parallelism`. Raise it if the workers can take more, or find the DAG that holds the slots', fb: '' },
          { t: 'Add slots to `default_pool`', fb: 'The pools have free slots. The limit is elsewhere.' },
          { t: 'Delete the 32 running tasks', fb: 'You lose their work and the limit is still the same.' },
          { t: 'Restart the API server', fb: 'The API server does not start tasks.' }
        ],
        best: 0,
        why: '32 tasks running at once is exactly the default of `parallelism`, which caps the running tasks per scheduler whatever the number of pools or workers. The pools were free and no DAG limit was reached, so the cap was the executor.',
        checks: [
          ['Count', 'Count the running task instances. If they equal `parallelism`, the executor limit is the reason.'],
          ['Who holds them', 'Group the running tasks by DAG. A sensor or a long task of one DAG can hold many slots.'],
          ['Then change one thing', 'Raise `parallelism` only if the workers and the target systems can take more, and keep the pools to protect the targets.']
        ],
        tell: 'The 32 running tasks were exactly the parallelism of the scheduler. I found which DAG held them, moved its waits out of the slots, and raised parallelism after checking the worker capacity.',
        prevent: ['Alert when running tasks sit at the **executor limit** for more than a few minutes', 'Give sensors and calls to rate-limited services their own **pool**', 'Review the limits together, not one at a time']
      }),

      B.talk({
        id: 'm8-ext1', t: 3, src: 'docs', title: 'Extra: the limits at the task level and in the scheduler loop',
        say: 'Press Next. Three smaller knobs for a mapped task or a big installation.',
        items: [
          ['Per task', '`max_active_tis_per_dag` limits how many instances of one task run at once across all runs of the DAG. `max_active_tis_per_dagrun` limits them inside one run. Both are the right tool for one mapped task that calls a fragile system.', 'Limit one task, not the DAG.'],
          ['pool_slots', 'A task can occupy more than one slot with `pool_slots`. A heavy task with `pool_slots=2` in a pool of three leaves room for one light task. The Airflow documentation shows exactly this example.', 'Weigh the tasks.'],
          ['The scheduler loop', 'In each loop the scheduler looks at up to `max_tis_per_query` task instances (' + G.cfg('scheduler.max_tis_per_query') + ' by default), creates at most `max_dagruns_per_loop_to_schedule` runs (' + G.cfg('scheduler.max_dagruns_per_loop_to_schedule') + '), and checks for queued tasks that waited longer than `task_queued_timeout` (' + G.cfg('scheduler.task_queued_timeout') + ' seconds). A big installation tunes these after it measures the loop.', 'Measure before you change.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-pools', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is a pool, and when do you use one?',
        pts: ['A named number of slots that tasks share', 'A task takes a slot while queued or running', 'Protects a system that tasks call', 'priority_weight breaks ties'],
        short: 'A pool is a named number of slots. A task takes a slot while it is queued or running, and when the pool is full the other tasks of that pool wait. A task with no pool uses the default pool, which has 128 slots.\n\nI use a pool to protect a system. If the warehouse accepts four queries at a time, I create a pool of four and put every task that calls the warehouse in it, across all DAGs. When more tasks are ready than there are slots, the `priority_weight` decides who goes first. In my recording six tasks in a pool of two ran in three waves, and five tasks with weights from 1 to 5 in a pool of one started in the order 5, 4, 3, 2, 1.\n\nA pool is also how I keep sensors from taking over the workers.',
        fu: [['How do tasks use more than one slot?', 'With the `pool_slots` argument.'], ['What does include_deferred do?', 'It makes deferred tasks count against the slots.']],
        trap: 'Using `parallelism` to protect a target system. It slows everything.',
        real: 'Name the system in your team that needs a pool, and its limit.'
      }),

      B.qa({
        id: 'qa-whynot', t: 1, tag: 'Operations', secs: 90,
        q: 'A task is ready but does not run. How do you find out why?',
        pts: ['Read the state: none, scheduled, queued', 'airflow tasks failed-deps names the unmet dependency', 'The four usual reasons: pool, DAG limit, upstream, depends_on_past', 'Then the executor limit'],
        short: 'First I read the state. A task that is `scheduled` has its dependencies met and waits for a slot. A task with no state has not been scheduled yet, so something upstream is not done.\n\nThen I run `airflow tasks failed-deps` for that task instance. It prints the dependency that is not met. I made four reasons happen on purpose: the pool had no open slots, the DAG limit was reached, an upstream task was still running, and `depends_on_past` was waiting for the same task of the previous run.\n\nIf none of those, I look at the executor: `parallelism` is the cap on running tasks per scheduler, 32 by default. And I check that the scheduler and the executor are healthy. I change one setting at a time and look at the result.',
        fu: [['What if the state is queued for a long time?', 'The executor has it but no worker takes it. Check the workers, and `task_queued_timeout`.']],
        trap: 'Restarting the scheduler first. It rarely helps and it hides the cause.',
        real: 'Describe the last time a task would not start, and what was blocking it.'
      }),

      B.qa({
        id: 'qa-limits', t: 2, tag: 'Airflow', secs: 75,
        q: 'Explain the limits on concurrency in Airflow, from the cluster down to a task.',
        pts: ['parallelism per scheduler', 'Pools', 'max_active_runs and max_active_tasks (per run in Airflow 3)', 'Task-level limits, and priority'],
        short: 'From the top: `parallelism` caps the task instances that run at once per scheduler, whatever the number of workers. Pools cap the tasks that share a named resource, and a task with no pool uses the default pool. At the DAG level, `max_active_runs` caps the active runs, and `max_active_tasks` caps the tasks running at once. In Airflow 3 that last one is per run, where in Airflow 2 it was for the whole DAG. At the task level, `max_active_tis_per_dag` and `max_active_tis_per_dagrun` limit the copies of one task.\n\nThe lowest limit decides. In my recording a pool of two and a DAG limit of two gave the same three waves for six tasks. When tasks compete, `priority_weight` decides who goes first.',
        fu: [['What changed in Airflow 3?', 'max_active_tasks became a per-run limit.']],
        trap: 'Raising everything at once. Find the limit that is blocking.',
        real: 'Say which of these limits your team has changed, and why.'
      }),

      B.qa({
        id: 'qa-executor', t: 2, tag: 'Design', secs: 75,
        q: 'How do you choose an executor?',
        pts: ['Local: small, single machine, shares the scheduler\'s host', 'Celery: scale-out workers, fast start, shared environment', 'Kubernetes: pod per task, isolation, start-up cost', 'The executor runs inside the scheduler'],
        short: 'I start from the kind of work. The LocalExecutor, the default, runs tasks as processes on the scheduler\'s machine. It is fine for development and for small single-machine installations, and a heavy task there slows the scheduler.\n\nCeleryExecutor sends tasks to a queue and workers take them. It scales out and starts tasks quickly, and it needs a broker and workers that you size and update, and all tasks share the worker environment.\n\nKubernetesExecutor starts a pod for each task, so each task can have its own image and size and the load can be bursty, at the cost of a pod start for every task and a cluster to run.\n\nThe executor logic runs inside the scheduler in all cases. I ran only the LocalExecutor, so for the others I rely on the documentation and test on my own platform.',
        fu: [['Can you use more than one?', 'Yes, since 2.10, with a comma-separated list in the executor setting.']],
        trap: 'Choosing Kubernetes because it is fashionable. A pod start for a ten-second task is a large overhead.',
        real: 'Name your executor and the constraint that made you choose it.'
      }),

      B.qa({
        id: 'qa-dop', t: 3, tag: 'Airflow 3', secs: 60,
        q: 'What happens to a DAG that uses `depends_on_past`?',
        pts: ['A task starts only if the same task succeeded in the previous run', 'One failure blocks every later run', 'The message in failed-deps', 'Prefer idempotent independent runs'],
        short: 'With `depends_on_past=True` a task instance starts only if the same task succeeded in the previous run. That sounds safe, and it turns one failed day into a chain: every later day waits until somebody fixes or clears the failed one. `airflow tasks failed-deps` shows the reason in words: depends_on_past is true, but a previous task instance is not in a successful state.\n\nA backfill makes it worse. The 3.4.0 source refuses a backfill of such a DAG with the reprocess behaviour set to none, and refuses reverse order, because the days must run in order.\n\nI prefer independent runs with idempotent tasks, and I use depends_on_past only when a day truly needs the state of the day before, such as a running balance.',
        fu: [['Is there a middle way?', 'Check the previous state in a task that fails clearly, or keep a state table.']],
        trap: 'Setting depends_on_past=True in default_args for the whole DAG by habit.',
        real: 'Name a DAG with depends_on_past in your team and whether it needs it.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Slot Counter', color: '#BAE6FD',
        pts: [
          'A ready task passes four limits: its **pool**, the **DAG run**, the **executor** (`parallelism`, per scheduler), and its own task limits. The lowest decides. Defaults: ' + G.cfg('core.parallelism') + ', ' + G.cfg('core.max_active_tasks_per_dag') + ', ' + G.cfg('core.default_pool_task_slot_count') + ' slots in the default pool.',
          'A **pool** protects a system. `priority_weight` breaks ties, highest first. In Airflow 3 `max_active_tasks` is **per run**.',
          '`airflow tasks failed-deps` names the reason: **pool full, DAG limit, upstream running, depends_on_past**.',
          'The **executor** runs inside the scheduler. Local is the default. Celery and Kubernetes scale out, with different costs. I ran only Local.',
          '`depends_on_past` turns one failure into a chain. Prefer independent, idempotent runs.'
        ],
        lines: [
          'I can protect a system with a pool.',
          'I can find out why a task does not start.',
          'I can choose an executor and say what it costs.'
        ]
      })
    ]
  });
})();
