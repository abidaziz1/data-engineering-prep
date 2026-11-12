/* Mission 2: DAGs and tasks. The DAG files, their runs, the templates and the import errors are recorded from Apache Airflow 3.4.0 on one machine (airflow/verify/capture_af.py).
   The comparison of styles and the list of task states are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FIRST = G.file('dags/brewline_first.py'), NIGHTLY = G.file('dags/brewline_nightly.py');
  var BR = G.counts('af.broken'), FR = G.counts('af.first_run'), RN = G.counts('af.render');
  G.expect(FR.states.join() === 'success,success,success' && FR.tasks.join() === 'extract,transform,load', 'the first run has three successful tasks');
  G.expect(FR.summary.orders === 2 && FR.summary.total === 20.5, 'the first run summary is 2 orders and 20.5');

  var tr = G.span(FIRST, /def transform/, /return \{/), ex = G.span(FIRST, /def extract/, /return orders/), ld = G.span(FIRST, /def load/, /print\(f"wrote/);

  var AF2 = G.file('dags_broken/broken_airflow2.py'), DUP = G.file('dags_broken/broken_duplicate.py'), CYC = G.file('dags_broken/broken_cycle.py');
  var AF2_FIX = AF2.replace('schedule_interval="@daily"', 'schedule="@daily"');
  var DUP_FIX = DUP.replace('EmptyOperator(task_id="load")\n    EmptyOperator(task_id="load")', 'EmptyOperator(task_id="load_orders")\n    EmptyOperator(task_id="load_customers")');
  var CYC_FIX = CYC.replace('extract >> load >> check >> extract', 'extract >> load >> check');

  function errLines() {
    var out = [];
    Object.keys(BR).forEach(function (f) {
      var errs = BR[f].import_errors;
      Object.keys(errs).forEach(function (k) { out.push({ c: 'err', t: f + ': ' + errs[k].replace(/\s*\(\/[^)]*\)/, ''), d: 80 }); });
    });
    return [{ c: 'cmd', t: '$ DagBag(dag_folder).import_errors', d: 350 }].concat(out);
  }
  function renderLines() {
    return [].concat(
      G.plain(RN.dates, { cmd: 'airflow tasks render brewline_templates dates 2026-03-14' }),
      G.plain(RN.partition_path, { cmd: 'airflow tasks render brewline_templates partition_path 2026-03-14' }),
      G.plain(RN.previous_day, { cmd: 'airflow tasks render brewline_templates previous_day 2026-03-14' }));
  }

  LAB.addChapter({
    id: 'm2', n: 2, title: 'DAGs and tasks: your first pipeline', short: 'DAGs', blurb: 'Write a DAG, read its run, and fix the files that fail to import', minutes: 55,
    focus: ['ing'],
    goals: [
      'Define a **DAG**, a **task**, an **operator**, a **task instance** and a **DAG run**, and say how they differ.',
      'Write a DAG in the **TaskFlow** style and in the **classic operator** style, and choose between them.',
      'Read a task\'s **state** and the log of a run.',
      'Use **templates** such as `{{ ds }}` and know when Airflow fills them in.',
      'Find and fix a DAG file that does not import: a removed argument, a duplicate task id, a cycle, a missing module.'
    ],
    say: 'Mission 2 is your first pipeline. Every DAG on the screens of this mission is a real file that I ran with Apache Airflow 3.4.0, and the output is what Airflow printed. First the words, then two ways to write the same idea, then the ways a file can go wrong.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, src: 'docs', title: 'Five words that every Airflow conversation uses',
        say: 'Press Next for each word. People mix them up in interviews, and the mix-up shows.',
        items: [
          ['DAG', 'A **directed acyclic graph**: tasks with arrows between them, and no loop. "Acyclic" means that you cannot follow the arrows and come back to where you started. The DAG also carries the schedule, the start date and settings such as `catchup`.', 'The whole pipeline definition.'],
          ['Task', 'One node of the DAG: one unit of work with a `task_id`. Retries, timeouts and the trigger rule are settings of a task.', 'One step you can see, retry and time.'],
          ['Operator', 'A **template for a task**. `BashOperator` runs a shell command, `PythonOperator` calls a function, `EmptyOperator` does nothing. When you write `BashOperator(task_id="x", ...)` you create a task from that template. A function with `@task` is a task too.', 'The kind of work a task does.'],
          ['DAG run', 'One execution of the DAG: the 14 March run, or a run that you started by hand. A run has a state (running, success, failed) and a **logical date** (mission 3).', 'One execution of the whole DAG.'],
          ['Task instance', 'One task in one run, with its own state, number of tries, start time, end time and log. "The `load` task failed on 14 March" means one task instance failed.', 'One step in one run.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm2-code1', t: 1, src: 'rec', title: 'The first DAG, in the TaskFlow style', file: 'brewline_first.py', lang: 'python', code: FIRST,
        steps: [
          { say: 'This is a real file that I ran. It uses the **TaskFlow** style: ordinary Python functions with a `@task` decorator. Press Next to read it in parts.', lines: null },
          { say: 'The imports. `airflow.sdk` is the public interface for DAG authors in Airflow 3: `dag` and `task` come from it. The output folder comes from an environment variable, so that the file ran anywhere.', lines: G.span(FIRST, /^import json/, /^OUT/) },
          { say: 'The `@dag` decorator turns the function below it into a DAG. `schedule="@daily"` makes one run a day. `start_date` is the first date it may run for. `catchup=False` means: do not create runs for the days between the start date and now. `tags` show in the UI.', lines: G.span(FIRST, /^@dag\(/, /^\)$/) },
          { say: 'The first task. It is a plain function. `ds=None` asks Airflow to pass the logical date as text such as `2026-03-14`. Whatever the function **returns** is stored as an **XCom**, so a later task can read it.', lines: [ex[0] - 1, ex[1]] },
          { say: '`transform` takes `orders`. That is the list that `extract` returned. It returns a small summary.', lines: [tr[0] - 1, tr[1]] },
          { say: '`load` writes a file whose name contains the date. A task that writes to a path built from the date gives the same file when it runs again for the same day. Mission 4 builds on this.', lines: [ld[0] - 1, ld[1]] },
          { say: 'The last lines wire the DAG. Calling `extract()` inside the DAG function does **not** run it. It records that `transform` needs the output of `extract`, and Airflow turns that into an arrow. The file ends by calling `brewline_first()`, which builds the DAG that the DAG processor finds.', lines: G.span(FIRST, /load\(transform/, /^brewline_first\(\)/) }
        ],
        note: 'Nothing in the DAG function body runs when the DAG runs. It only describes the graph. The tasks run later, on a worker.'
      }),

      B.term({
        id: 'm2-run', t: 1, src: 'rec', title: 'Running the DAG once with airflow dags test',
        say: 'This is the real output of `airflow dags test`, which runs every task of one DAG run in a single process, without the scheduler. Watch for the lines `Done. Returned value was` and `Pushing xcom`.',
        lines: function () { return G.plain(G.text('af.first_run'), { cmd: 'airflow dags test brewline_first 2026-03-14', d: 55 }); },
        after: 'Three tasks ran in order and all three succeeded. `extract` returned a list of 2 orders and `transform` returned `{\'orders\': 2, \'total\': 20.5}`. Each returned value was pushed as an XCom. The last line says that the run finished with state success. `dags test` is the fastest way to try a DAG: it needs no running scheduler.',
        afterKind: 'tip',
        doneSay: 'Run `airflow dags test` before you push a DAG. It is not a unit test, but it catches a surprising number of mistakes.'
      }),

      B.rows({
        id: 'm2-xcom', t: 1, src: 'rec', title: 'What the run left in the database',
        steps: [
          {
            say: 'Each task instance has a row with its state and its number of tries, and the returned values are stored as XComs. This is what the metadata database held after that run.',
            tabs: [
              {
                layer: 'TASK INSTANCES', name: 'The three task instances', c: 'raw',
                cols: G.table('af.first_run_ti').cols,
                rows: G.table('af.first_run_ti').rows,
                trk: 0
              },
              {
                layer: 'XCOM', name: 'What the tasks returned', c: 'raw',
                cols: G.table('af.first_run_xcom').cols,
                rows: G.table('af.first_run_xcom').rows,
                trk: 0
              }
            ],
            notes: ['`map_index` is -1 because these tasks are not mapped (mission 5). `try_number` is 1: nothing was retried. The `load` task returned nothing, so it has no XCom row. XCom is for small values. Mission 5 shows what happens with big ones.']
          }
        ]
      }),

      B.code({
        id: 'm2-code2', t: 1, src: 'rec', title: 'The same idea with classic operators', file: 'brewline_nightly.py', lang: 'python', code: NIGHTLY,
        steps: [
          { say: 'The second style creates **operator objects** and wires them with `>>`. This is the Brewline nightly pipeline. It is older and still common, and you will read a lot of it at work.', lines: null },
          { say: 'In Airflow 3 the common operators live in the **standard provider**: `airflow.providers.standard`. The old paths such as `airflow.operators.bash` still work in 3.4.0 and print a deprecation warning.', lines: G.span(NIGHTLY, /^from airflow.sdk import DAG/, /PythonOperator$/) },
          { say: 'A function for the `PythonOperator`. `**context` receives the run\'s values, such as `ds`.', lines: G.span(NIGHTLY, /^def check_order_files/, /print\(/) },
          { say: 'The DAG. `default_args` are settings that every task gets: an owner, **2 retries** and a delay of 5 minutes. The cron string `0 2 * * *` runs it at 02:00 every day.', lines: G.span(NIGHTLY, /^with DAG\(/, /\) as dag:/) },
          { say: 'Six tasks. Each one is an operator object. The `notify` task has `trigger_rule="all_done"`, so it runs when every parent has finished, whatever their state.', lines: G.span(NIGHTLY, /start = EmptyOperator/, /notify = /) },
          { say: 'The `>>` operator sets the order. `a >> b` means "b runs after a". A chain reads like the order of work.', lines: G.span(NIGHTLY, /^    start >> /, /^    start >> /) }
        ],
        note: 'The recorded run of this DAG started the tasks in the order ' + G.counts('af.nightly').order.join(', ') + ', and every one succeeded.'
      }),

      B.cmp({
        id: 'm2-cmp', t: 1, src: 'docs', title: 'TaskFlow or classic operators',
        say: 'Both styles produce the same DAG. Press Next to compare them. Most teams mix them: TaskFlow for Python, an operator for a ready-made integration.',
        cols: ['', 'TaskFlow (`@task`)', 'Classic operators'],
        hl: 1,
        rows: [
          ['A task is', 'A Python function.', 'An object from a class such as `BashOperator`.'],
          ['Passing data', 'Return a value and pass it as an argument. Airflow stores and reads the XCom for you.', 'Use `xcom_push` and `xcom_pull` or a template such as `{{ ti.xcom_pull(...) }}`.'],
          ['Order', 'Follows from the arguments. `>>` works too.', 'You write `a >> b`.'],
          ['Best for', 'Python logic, small data hand-offs, readable DAGs.', 'Ready-made integrations: run a SQL file, call an API, wait for a file, start a container.'],
          ['Watch out for', 'Hiding big data in return values.', 'Many fields are templated: a `{{ }}` in a string is rendered, and a typo shows only at run time.']
        ],
        steps: [
          { upto: 2, say: 'TaskFlow reads like normal Python. The classic style reads like a diagram of objects.' },
          { upto: 5, say: 'Use the operator when somebody already wrote the integration. Use `@task` when the work is your own Python. A good DAG often has both.' }
        ]
      }),

      B.cmp({
        id: 'm2-states', t: 1, src: 'docs', title: 'The states of a task instance',
        say: 'A task instance moves through states. Press Next to read them in groups. You will see these words in the UI, in logs and in every incident.',
        cols: ['State', 'What it means', 'What happens next'],
        hl: 1,
        rows: [
          ['none', 'The task instance exists but the scheduler has not looked at it yet.', 'The scheduler checks its dependencies.'],
          ['scheduled', 'Its dependencies are met. It waits for the executor.', 'It becomes queued when there is room.'],
          ['queued', 'The executor has it and a worker will pick it up.', 'It starts to run.'],
          ['running', 'The task code is running on a worker.', 'It ends in success, failed, up_for_retry, deferred or up_for_reschedule.'],
          ['success', 'The task finished without an error.', 'Its children can run.'],
          ['failed', 'The task raised an error and has no retries left, or it timed out.', 'Its children get upstream_failed with the default trigger rule.'],
          ['up_for_retry', 'The task failed and has retries left. It waits for the retry delay.', 'It goes back to scheduled when the wait is over.'],
          ['up_for_reschedule', 'A sensor in reschedule mode checked and found nothing yet.', 'It is scheduled again after the poke interval.'],
          ['deferred', 'The task gave its wait to the triggerer and holds no worker slot.', 'It is scheduled again when the trigger fires.'],
          ['skipped', 'A branch or a skip chose not to run it.', 'Its children follow their trigger rules.'],
          ['upstream_failed', 'A parent failed, so this task did not run.', 'Its own children follow their trigger rules.']
        ],
        steps: [
          { upto: 3, say: 'The first three are about waiting for a place to run. Many "my task does not run" questions end here, and mission 8 has a lab for them.' },
          { upto: 6, say: 'Running, success and failed are the ones you know. A failed task with retries left is not failed yet: it is up_for_retry.' },
          { upto: 9, say: 'Two waiting states belong to sensors. Mission 7 compares them and records the slots that each one used.' },
          { upto: 11, say: 'Skipped and upstream_failed mean that the task never ran. Both are results of a decision, and a trigger rule can change what happens next (mission 6).' }
        ]
      }),

      B.term({
        id: 'm2-render', t: 1, src: 'rec', title: 'Templates: Airflow fills them in just before the task runs',
        say: 'A string in a templated field can contain `{{ ... }}`. Airflow renders it with the values of the run just before the task starts. `airflow tasks render` shows the result without running the task. These three commands are real.',
        lines: renderLines,
        after: '`ds` is the logical date as `YYYY-MM-DD`, and `ds_nodash` is the same without dashes. `params.region` comes from the `params` of the DAG. `macros.ds_add(ds, -1)` is the day before. **The logical date here is midnight although the cron string is `0 2 * * *`: I rendered the task for the date 2026-03-14, and rendering takes that date as the logical date.** Mission 3 explains how Airflow chooses the logical date of a real run.',
        afterKind: 'tip',
        doneSay: 'Use `tasks render` when a template gives a surprise. It prints what the task would run.'
      }),

      B.term({
        id: 'm2-errors', t: 1, src: 'rec', title: 'Four DAG files that do not import',
        say: 'The DAG processor imports every file, and a file that fails is not a DAG. Airflow stores the error and shows it in the UI. These are the real errors of four broken files that I wrote on purpose. You will fix them in a minute.',
        lines: errLines,
        after: 'The first is an Airflow 2 argument that Airflow 3 removed. The second is a **cycle**: Airflow refuses a graph that you can follow in a circle. The third is a **duplicate** task id. The fourth is a module that exists on the developer\'s machine and not where the DAG processor runs. The last file, `toplevel_slow.py`, imports fine, and mission 12 shows why it is still a problem.',
        afterKind: 'tip',
        doneSay: 'An import error is the best kind of error: it appears before anything runs. Look for it first when a DAG is missing.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the steps of your first DAG in order, from an empty file to a run.',
        items: [
          'Write the DAG file with a `dag_id`, a schedule and the tasks',
          'Check that the file imports and that the DagBag shows no errors',
          'Run `airflow dags test` for one date and read the log',
          'Put the file in the DAG bundle so that the DAG processor finds it',
          'Unpause the DAG, because new DAGs are paused by default',
          'Trigger a run, or wait for the schedule, and watch the task instances'
        ],
        why: 'Catch import errors before the file reaches Airflow, and try one run before a schedule runs it for you. New DAGs start **paused**: the recording lists ' + G.counts('af.dags_list').paused + ' paused DAGs out of ' + G.counts('af.dags_list').dags + ', because `dags_are_paused_at_creation` is ' + G.cfg('core.dags_are_paused_at_creation') + ' by default.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'The `load` task failed on 14 March and ran fine on 13 March. What failed?',
        opts: [
          { t: 'The DAG', fb: 'The DAG is the definition. It does not fail.' },
          { t: 'A task instance of `load`, in the run of 14 March', fb: '' },
          { t: 'The operator', fb: 'An operator is a template. It does not run.' },
          { t: 'The scheduler', fb: 'The scheduler keeps running. A task instance reports a failure.' }
        ],
        ok: 1, why: 'A task instance is one task in one run. It has its own state, tries and log. The DAG run has a state too: it fails when a task fails and nothing handles it.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'What does `extract >> transform >> load` mean?',
        opts: [
          { t: 'The three tasks start at the same time', fb: 'The arrows set an order. Tasks without an arrow between them can run together.' },
          { t: '`transform` runs after `extract` succeeds, and `load` runs after `transform` succeeds', fb: '' },
          { t: 'The output of `extract` is passed to `load`', fb: '`>>` sets order only. Data passes through XCom, which TaskFlow arranges with arguments.' },
          { t: '`load` runs first because it is last', fb: 'The arrow points in the direction of time.' }
        ],
        ok: 1, why: '`a >> b` is shorthand for "b is downstream of a". With the default trigger rule, b starts when a has succeeded.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'You saved a new DAG file in the DAG folder and it does not appear in the UI. What do you check first?',
        opts: [
          { t: 'Restart the scheduler', fb: 'The scheduler does not parse files. Restarting it changes nothing here.' },
          { t: 'The import errors of the DAG processor', fb: '' },
          { t: 'Delete the metadata database', fb: 'That removes all history and fixes nothing.' },
          { t: 'Increase `parallelism`', fb: 'That limits running tasks. It does not decide which files are found.' }
        ],
        ok: 1, why: 'A file that does not import produces an import error, not a DAG. After that, check that the DAG processor is running and that the file is in the bundle it reads.'
      }),

      B.quiz({
        id: 'm2-q4', t: 1,
        q: 'The task `previous_day` has `bash_command="echo {{ macros.ds_add(ds, -1) }}"`. When does Airflow turn `{{ ... }}` into a date?',
        opts: [
          { t: 'When the DAG processor parses the file', fb: 'At parse time there is no run, so there is no `ds`.' },
          { t: 'Just before the task runs, with the values of that run', fb: '' },
          { t: 'When the DAG is unpaused', fb: 'Unpausing creates no values for a template.' },
          { t: 'Never. You must format the string yourself', fb: 'Templating is built in for fields that the operator marks as templated.' }
        ],
        ok: 1, why: 'Rendering happens for each task instance, just before it runs, with the context of its run. That is why `airflow tasks render` can show the result for a date.'
      }),

      B.quiz({
        id: 'm2-q5', t: 2,
        q: 'A file builds a DAG through a helper library of your own, and the text "airflow" does not appear anywhere in the file. The DAG never appears. What is the likely reason?',
        opts: [
          { t: 'The metadata database is full', fb: 'A full database gives errors, not silence for one file.' },
          { t: 'DAG discovery safe mode skipped the file', fb: '' },
          { t: 'The DAG is paused', fb: 'A paused DAG still appears in the list.' },
          { t: 'The executor is LocalExecutor', fb: 'The executor decides where tasks run, not which files are read.' }
        ],
        ok: 1, why: 'The recording shows `dag_discovery_safe_mode` is ' + G.cfg('core.dag_discovery_safe_mode') + ' by default. With it on, the DAG processor reads only files that contain the word "airflow" and also "dag" or "asset", in any letter case (the rule is in the 3.4.0 source). Add the words in a comment or turn the mode off. An `.airflowignore` file can exclude files with ' + G.cfg('core.dag_ignore_file_syntax') + ' patterns.'
      }),

      B.quiz({
        id: 'm2-q6', t: 2,
        q: 'A TaskFlow task calls `requests.get(...)` inside the DAG function but outside any `@task` function. How often does that call run?',
        opts: [
          { t: 'Once for every DAG run', fb: 'The DAG function body is not run per DAG run.' },
          { t: 'Every time the file is parsed, which can be many times an hour', fb: '' },
          { t: 'Only when the scheduler starts', fb: 'The scheduler does not run it. The DAG processor does, repeatedly.' },
          { t: 'Never, because Airflow blocks network calls at parse time', fb: 'Airflow does not block it.' }
        ],
        ok: 1, why: 'Code outside a task runs when the file is parsed. The DAG processor parses each file again and again. Put the call inside a task so that it runs once per task instance, on a worker.'
      }),

      B.bug({
        id: 'm2-bug1', t: 1, q: 'This DAG came from an Airflow 2 project. The DAG processor reports an import error. Click the line that is wrong.',
        file: 'broken_airflow2.py', lang: 'python', code: AF2, bad: [G.at(AF2, /schedule_interval/)],
        hint: 'Read the error: `' + BR['broken_airflow2.py'].import_errors['broken_airflow2.py'] + '`.',
        why: 'Airflow 3 removed `schedule_interval`. The one argument for time is `schedule`. The same argument takes a cron string, a timetable object or a list of assets.',
        fix: AF2_FIX,
        cheer: 'Search a migrated project for `schedule_interval` and `timetable=` first.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, q: 'This DAG has two tasks. Airflow refuses it with `' + BR['broken_duplicate.py'].import_errors['broken_duplicate.py'] + '`. Click a line that is wrong.',
        file: 'broken_duplicate.py', lang: 'python', code: DUP, bad: [G.at(DUP, /EmptyOperator\(task_id="load"\)/), G.at(DUP, /EmptyOperator\(task_id="load"\)/) + 1],
        hint: 'Two lines make the same `task_id`.',
        why: 'The `task_id` identifies a task inside a DAG, so it must be unique. In a loop that creates tasks, put the loop variable into the id.',
        fix: DUP_FIX,
        cheer: 'A task id is a name. Names must be unique inside the DAG.'
      }),

      B.bug({
        id: 'm2-bug3', t: 2, q: 'This DAG is rejected with `' + BR['broken_cycle.py'].import_errors['broken_cycle.py'] + '`. Click the line that is wrong.',
        file: 'broken_cycle.py', lang: 'python', code: CYC, bad: [G.at(CYC, /extract >> load >> check >> extract/)],
        hint: 'Follow the arrows. Where do you end up?',
        why: 'The last arrow sends `check` back to `extract`, so every task waits for another one and none can start. A DAG must have no cycle. If the work really repeats, make it a new run or a new DAG run, not a loop of tasks.',
        fix: CYC_FIX,
        cheer: 'Draw the arrows when a graph is rejected.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: the new DAG is not in the UI', time: '09:20',
        alert: '**You merged `brewline_orders.py` into the DAG repository 15 minutes ago. The file is on the server. The UI does not list the DAG.** The DAG processor and the scheduler both run.',
        clues: ['The UI shows an import error for the file: `' + BR['broken_import.py'].import_errors['broken_import.py'] + '`', 'The file starts with `import brewline_utils`', '`brewline_utils` is a helper module that lives in the developer\'s own repository'],
        opts: [
          { t: 'Ship `brewline_utils` into the environment of the DAG processor and the workers, for example in the DAG bundle or in the image, and check that the file imports', fb: '' },
          { t: 'Restart the scheduler', fb: 'The scheduler does not parse files. The error comes from the DAG processor.' },
          { t: 'Raise `dagbag_import_timeout`', fb: 'The error is a missing module, not a slow import.' },
          { t: 'Delete the import error from the UI', fb: 'The error comes back at the next parse, because the cause is still there.' }
        ],
        best: 0,
        why: 'The error message names the cause. The DAG processor imports the file in its own environment, so a helper module must exist there. The workers need it too, because they import the file to run the task.',
        checks: [
          ['Reproduce', 'Run `python dags/brewline_orders.py` in the same environment as the DAG processor. The same error appears without Airflow.'],
          ['Both places', 'Check the DAG processor image and the worker image. A module that exists in only one of them fails later.'],
          ['After the fix', 'Wait for the next parse, or restart the DAG processor, and check that the DAG is listed and that the import error is gone.']
        ],
        tell: 'I read the import error, saw that the helper module was missing in the DAG processor environment, shipped the module with the DAG bundle, and confirmed that the DAG appeared and that no import error remained.',
        prevent: 'Add an import test to CI that loads every DAG file in the production image. Mission 10 builds it.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how big should a task be?',
        scenario: 'The Brewline load script does four things: it downloads the day\'s files, validates them, loads them into a staging table, and swaps the staging table into production. It takes 25 minutes, and the swap takes one second. A failure in the load step happens about once a month. How do you build it?',
        opts: [
          { t: 'One task that runs the whole script', d: 'Simple. One place to look.', lose: 'A failure at minute 20 repeats the download and the validation on every retry, and the log of one task mixes four steps. You cannot rerun only the load.' },
          { t: 'Four tasks, one for each step, in a row', d: 'Each step can be retried and timed on its own, and the graph shows where it failed.' },
          { t: 'One task for each file, 400 of them, plus the four steps', d: 'The most detail.', lose: 'The scheduler records and schedules 400 task instances for work that takes seconds each. The overhead is larger than the work. Dynamic task mapping (mission 5) is the tool when a list is really large, and even then you group the files.' }
        ],
        pick: 1,
        why: 'A task is the unit that you want to retry, time, see and alert on. Four tasks give you that for four steps. One task hides the step that failed, and hundreds of tiny tasks add overhead that is larger than the work.',
        when: 'Use one task when the steps cannot be separated: for example when they must run in one database transaction.'
      }),

      B.talk({
        id: 'm2-ext', t: 3, src: 'rec', title: 'Extra: how the DAG processor finds files',
        say: 'Press Next. This is the part of the DAG processor that you only learn after a file goes missing.',
        items: [
          ['Safe mode', 'With `dag_discovery_safe_mode` on (the default is ' + G.cfg('core.dag_discovery_safe_mode') + '), the DAG processor reads only files that contain the word "airflow" and also "dag" or "asset", in any letter case. The recording\'s start-up line says `dag_discovery_safe_mode=True`.', 'A file that builds DAGs with a helper can be skipped.'],
          ['.airflowignore', 'A file named `.airflowignore` in the DAG folder lists paths that the DAG processor skips. The default syntax is **' + G.cfg('core.dag_ignore_file_syntax') + '** patterns, like `.gitignore`.', 'Keep tests and helpers out of the parse.'],
          ['How often files are read', 'The default refresh interval for new files is ' + G.cfg('dag_processor.refresh_interval') + ' seconds, and a file is parsed again at most every ' + G.cfg('dag_processor.min_file_process_interval') + ' seconds. The recording set both to 3 seconds. A DAG that disappears from the file is marked stale after ' + G.cfg('dag_processor.stale_dag_threshold') + ' seconds without a parse.', 'A change can take minutes to show up.'],
          ['A timeout', 'A file that takes longer than `dagbag_import_timeout` (' + G.cfg('core.dagbag_import_timeout') + ' seconds by default) to import fails with a timeout error. `dag_file_processor_timeout` (' + G.cfg('core.dag_file_processor_timeout') + ' seconds) limits the whole processing of one file.', 'Slow imports end as errors.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-dag', t: 1, tag: 'Airflow', secs: 60,
        q: 'Explain DAG, task, operator, DAG run and task instance.',
        pts: ['DAG: tasks and arrows, no cycle, plus schedule and settings', 'Operator: the template. Task: one node made from it', 'DAG run: one execution. Task instance: one task in one run', 'State and retries belong to the task instance'],
        short: 'A DAG is the definition of a pipeline: tasks, the arrows between them, and settings such as the schedule. It has no cycle. A task is one node of that graph, and an operator is the template that a task is made from: a BashOperator runs a command, a PythonOperator calls a function. A function with the task decorator is a task too.\n\nA DAG run is one execution of the whole DAG, for example the run of 14 March, or one that somebody started by hand. A task instance is one task in one run. That is where state, tries, start and end time and the log live. When I say that the load task failed on 14 March, I mean that one task instance failed.',
        fu: [['What makes a graph acyclic?', 'You cannot follow the arrows and end up where you started. Airflow rejects a cycle when it imports the file.'], ['Where is retry configured?', 'On the task. The number of tries is stored on the task instance.']],
        trap: 'Using "DAG" for a run. The DAG is the definition and the run is one execution.',
        real: 'Say how many DAGs and tasks your team has, and which pipeline you know best.'
      }),

      B.qa({
        id: 'qa-first', t: 1, tag: 'Airflow', secs: 75,
        q: 'You have to write a new DAG. How do you build it and check it before it reaches production?',
        pts: ['Write tasks that are units of retry, with clear ids', 'Import check: the DagBag shows no error', '`airflow dags test` for one date', 'Review in Git, paused first, then unpaused and triggered'],
        short: 'I start from the steps I want to retry and see separately, and I give each one a clear task id. I write it with TaskFlow for my Python code and an operator where a ready-made integration exists.\n\nBefore I push, I check that the file imports, with a DagBag test, and I run `airflow dags test` for one date to see every task run in order. That catches wrong arguments, a missing module, a cycle and many template errors without a scheduler.\n\nThen the change goes through a pull request. In production the DAG starts paused. I unpause it, trigger a run for a past date, watch the task instances, and only then let the schedule take over. CI repeats the import test on every change so that a broken file never reaches the DAG folder.',
        fu: [['What does dags test not check?', 'It does not use the scheduler or the executor. Timing, pools and concurrency behave differently in a real run.'], ['Why start paused?', 'A schedule with an old start date could start runs before you are ready.']],
        trap: 'Copying the file to production and watching the UI. Import errors and bad arguments are cheaper to find first.',
        real: 'Describe how a DAG reaches production in your team, and which check you would add.'
      }),

      B.qa({
        id: 'qa-style', t: 1, tag: 'Airflow', secs: 60,
        q: 'TaskFlow or classic operators: when do you use which?',
        pts: ['Same DAG, two ways to write it', 'TaskFlow for your Python logic and small data hand-offs', 'Operators for ready-made integrations', 'Mix them'],
        short: 'They build the same kind of DAG. With TaskFlow a task is a Python function with a decorator, and a value that one function returns becomes the argument of the next. Airflow stores the value as an XCom for me. With classic operators a task is an object, such as a BashOperator, and I set the order with the arrow operator.\n\nI use TaskFlow for my own Python code, because it reads like normal Python and it is easy to test. I use an operator when somebody already wrote the integration: a SQL operator, a transfer between systems, a sensor, a container. Most real DAGs mix the two.\n\nThe thing I watch in both is the amount of data: a return value or an XCom is not a place for a large dataset.',
        fu: [['How do you test a TaskFlow task?', 'The decorated function has a `.function` attribute, or you keep the logic in a normal module and test that.']],
        trap: 'Saying that one style is deprecated. Both are supported in Airflow 3.',
        real: 'Say which style your team uses and why.'
      }),

      B.qa({
        id: 'qa-size', t: 2, tag: 'Design', secs: 75,
        q: 'How do you decide what goes into one task?',
        pts: ['A task is the unit you retry, time and alert on', 'Split where a different failure needs a different action', 'Avoid hundreds of tiny tasks', 'One transaction means one task'],
        short: 'A task is the unit that I want to retry, time and see in the UI. So I split a script where a failure at that point would need a different action. For a load that downloads, validates, loads to staging and swaps, I use four tasks: a retry of the load does not download again, and the graph shows the step that failed.\n\nI do not go the other way. Hundreds of tiny tasks cost scheduling and database overhead that can be larger than the work, so for a long list I use dynamic task mapping and group the items. And when steps must be atomic, for example they must happen in one database transaction, they stay in one task.\n\nEvery task should be safe to run twice. That matters more than the exact size.',
        fu: [['How many tasks is too many?', 'It depends on your database and scheduler. Watch the scheduler loop time and the size of the task instance table, and group before it hurts.']],
        trap: 'Putting the whole pipeline in one task so that it is easy to schedule. You lose retries and visibility.',
        real: 'Name a task in your team that is too big or too small, and say how you would split it.'
      }),

      B.qa({
        id: 'qa-parse', t: 2, tag: 'Airflow', secs: 75,
        q: 'Why is code at the top of a DAG file a problem, and what do you put there instead?',
        pts: ['The DAG processor runs top-level code on every parse', 'Slow calls delay new DAG versions, and each worker import pays too', 'Keep the top level to imports and DAG definitions', 'Move calls, reads and heavy imports into tasks'],
        short: 'The DAG processor imports every DAG file again and again, and it runs all the code at the top level each time. A database query or an API call there runs on every parse, for every file, all day. It slows how fast new versions of the DAG appear, and in the worst case the import times out and the DAG shows an import error.\n\nWorkers also import the file to run a task, so they pay the cost on every task start.\n\nSo the top level keeps only imports and the DAG and task definitions. Calls, file reads and heavy libraries go inside tasks, where they run once per task instance on a worker. In the recording a light file imported in about two milliseconds and a file with a two-second sleep at the top took two seconds on every parse.',
        fu: [['How do you find slow files?', 'The DAG processor logs the parse time per file, and `dag_file_processor_timeout` and `dagbag_import_timeout` cut off the worst ones.']],
        trap: 'Saying that top-level code is fine as long as the DAG still works. It works, and it costs on every parse.',
        real: 'Describe a DAG file in your team that does work at the top level, and how you would move it.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'DAG Writer', color: '#BBF7D0',
        pts: [
          'A **DAG** is tasks and arrows with no cycle. A **task** is one node, an **operator** is its template, a **DAG run** is one execution and a **task instance** is one task in one run.',
          'Write DAGs with **TaskFlow** (`@dag`, `@task`) or classic operators and `>>`. Import from `airflow.sdk` and from the standard provider.',
          'A task returns a value, and Airflow stores it as an **XCom**. `airflow dags test` runs a whole DAG once without a scheduler.',
          '**Templates** like `{{ ds }}` are filled in just before a task runs. `airflow tasks render` shows the result.',
          'A file that does not import is not a DAG. The error is stored, and it appears in the UI. Fix **removed arguments, duplicate ids, cycles and missing modules** first.'
        ],
        lines: [
          'I can write and run a first DAG.',
          'I can read a task state and an import error.',
          'I keep top-level code cheap.'
        ]
      })
    ]
  });
})();
