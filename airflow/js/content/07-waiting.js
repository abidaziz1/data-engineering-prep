/* Mission 7: waiting. Sensors in poke and reschedule mode, deferrable sensors, and the triggerer.
   The three runs (four sensors waiting for a partner file in a pool of two slots) are recorded from Apache Airflow 3.4.0 with a scheduler and a triggerer running
   (airflow/verify/capture_af.py). The defaults and the description of the triggerer are from the installed package and the documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var WT = G.counts('af.waiting'), WAIT = G.file('dags/brewline_waiting.py');
  var P = WT.poke.facts, R = WT.reschedule.facts, D = WT.deferrable.facts;
  G.expect(P.slot_seconds > R.slot_seconds && R.slot_seconds > D.slot_seconds && P.max_holding_a_slot === 2 && D.max_deferred === 4 && WT.poke.files_created_at === 14, 'the recorded sensor runs');
  var POOLS = G.text('af.pools_list');

  var SENSOR_BUG = [
    'from airflow.sdk import DAG',
    'from airflow.providers.standard.sensors.filesystem import FileSensor',
    'import pendulum',
    '',
    'with DAG(dag_id="brewline_partner_files", schedule="0 1 * * *", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False) as dag:',
    '    for n in range(1, 41):',
    '        FileSensor(task_id=f"wait_for_file_{n}", filepath=f"/data/partner/file_{n}.csv", poke_interval=30, pool="partner_pool")'
  ].join('\n');
  var SENSOR_FIX = SENSOR_BUG.replace('poke_interval=30, pool="partner_pool")', 'poke_interval=30, timeout=60 * 60 * 5, deferrable=True, pool="partner_pool")');
  var TIMEOUT_BUG = [
    'from airflow.sdk import DAG',
    'from airflow.providers.standard.sensors.python import PythonSensor',
    'import pendulum',
    '',
    'def partner_file_ready():',
    '    return False  # a stand-in: the file never arrives today',
    '',
    'with DAG(dag_id="brewline_wait_partner", schedule="0 1 * * *", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False, max_active_runs=1) as dag:',
    '    PythonSensor(task_id="wait_for_partner", python_callable=partner_file_ready, mode="reschedule", poke_interval=300)'
  ].join('\n');
  var TIMEOUT_FIX = TIMEOUT_BUG.replace('mode="reschedule", poke_interval=300)', 'mode="reschedule", poke_interval=300, timeout=4 * 60 * 60)');

  function waitModeRows() {
    return ['poke', 'reschedule', 'deferrable'].map(function (m) {
      var f = WT[m].facts;
      return [m, f.slot_seconds + ' slot seconds', 'at most ' + f.max_holding_a_slot + ' of 2 slots held', f.max_deferred ? 'up to ' + f.max_deferred + ' deferred' : 'none deferred', f.seconds_until_all_done + ' s'];
    });
  }

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Waiting: sensors, deferral and the triggerer', short: 'Waiting', blurb: 'Wait for a file or an event without holding a slot', minutes: 55,
    focus: ['mon'],
    goals: [
      'Say what a **sensor** is and why waiting costs a **slot**.',
      'Choose between **poke**, **reschedule** and **deferrable** sensors, with numbers.',
      'Explain the **triggerer** and what a deferred task is doing while it waits.',
      'Set a **timeout** on every sensor, and know the default.',
      'Choose between waiting and an **asset** schedule.'
    ],
    say: 'Mission 7 is waiting. Many pipelines start with "wait until the partner file is there". I ran four sensors that wait for a file that appears after 14 seconds, in a pool of two slots, in three ways, with a real scheduler and a real triggerer. I sampled the state of every task twice a second and counted the slots that each way used.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, src: 'docs', title: 'A sensor is a task that waits',
        say: 'Press Next for each idea. Waiting looks free. It is not.',
        items: [
          ['What a sensor does', 'A **sensor** is a task that checks a condition again and again until it is true: a file exists, a partition appears, another DAG finished, a time has come. When the condition is true it succeeds, and its children run.', 'A task whose only job is to wait.'],
          ['Waiting costs a slot', 'A task in the `running` state occupies a **worker slot** for as long as it runs, even when it only sleeps between checks. A pool of two slots with two sensors in it has no room for the third task, as the lab shows.', 'An idle sensor still holds a slot.'],
          ['Three ways to wait', '**Poke** keeps the slot for the whole wait. **Reschedule** gives the slot back between checks and is scheduled again after the poke interval. **Deferrable** hands the wait to the **triggerer**, a separate process, and holds no slot at all.', 'Hold it, give it back, or hand it over.'],
          ['Every wait needs an end', 'A sensor has a `timeout`. If the condition is not true by then, the sensor fails. The default comes from the setting `sensors.default_timeout`: ' + G.cfg('sensors.default_timeout') + ' seconds, which is seven days. The default `poke_interval` is 60 seconds.', 'Set a timeout that matches the business.'],
          ['Sometimes there is nothing to wait for', 'If the other side can say "I am done", an **asset** schedule (mission 5) starts the work when the data is ready and no task waits at all.', 'An event beats a poll.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-code', t: 1, src: 'rec', title: 'Three DAGs, four sensors each', file: 'brewline_waiting.py', lang: 'python', code: WAIT,
        steps: [
          { say: 'This file builds three DAGs in a loop, one for each mode. Each has four sensors that wait for a partner file, and all of them use the pool `partner_pool` with **two slots**.', lines: null },
          { say: 'The function that a poke or reschedule sensor calls. It returns true when the file exists.', lines: G.span(WAIT, /^def file_arrived/, /return os.path/) },
          { say: 'A **deferrable** sensor is a `FileSensor` with `deferrable=True`. It hands the wait to the triggerer and checks every 2 seconds there.', lines: G.span(WAIT, /if mode == "deferrable"/, /FileSensor\(/) },
          { say: 'The other two use a `PythonSensor` with `mode=mode`, which is `poke` or `reschedule`. `poke_interval=2` checks every two seconds, and `timeout=60` ends the wait after a minute.', lines: G.span(WAIT, /PythonSensor\(/, /^                \)$/) }
        ],
        note: 'The file `FileSensor` needs a connection called `fs_default`. The deferrable run failed the first time I ran it, because the connection did not exist, and the recording added it. The default Airflow does not define it.'
      }),

      B.widget({ id: 'm7-w-wait', kind: 'waiting', t: 1, src: 'rec', title: 'Lab: four sensors, two slots, three modes' }),

      B.cmp({
        id: 'm7-cmp', t: 1, src: 'rec', title: 'The three modes, with the recorded numbers',
        say: 'The same four sensors and the same file, which appeared after 14 seconds. Press Next for what each mode cost and what it needs.',
        cols: ['Mode', 'How it waits', 'Slot seconds used', 'Needs'],
        hl: 2,
        rows: [
          ['`poke`', 'Sleeps in the task between checks and keeps the slot.', P.slot_seconds + '. Two sensors held both slots for 14 seconds, and the other two waited in `scheduled`.', 'Nothing extra. Use it for a wait of seconds.'],
          ['`reschedule`', 'Ends the try between checks (`up_for_reschedule`) and is scheduled again.', R.slot_seconds + '. The slots were free between checks.', 'Nothing extra. The scheduler handles each check as a new try, so a short poke interval creates many.'],
          ['`deferrable`', 'Hands the wait to the triggerer, which waits with async code.', D.slot_seconds + '. All four sensors were `deferred` at once and held no slot.', 'A running **triggerer** process, and a deferrable operator.']
        ],
        steps: [
          { upto: 1, say: 'Poke is the simplest and the most expensive. It is right when the wait is short and slots are plentiful.' },
          { upto: 2, say: 'Reschedule is the cheap fix with no new process. Each check is a short task, and the poke interval should be a minute or more.' },
          { upto: 3, say: 'Deferrable is the best for long waits and many sensors. It asks you to run a triggerer, and the recorded run needed that extra process.' }
        ],
        note: 'Slot seconds: one second of one pool slot in use. Counted from samples taken twice a second, on one machine, with 4 sensors and 2 slots. The file appeared 14 seconds after the start, and all four sensors finished at about ' + D.seconds_until_all_done + ' seconds in every mode.'
      }),

      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'What a deferred task does while it waits', g: 'deferral', legend: false,
        steps: [
          { say: 'A deferrable sensor starts like any task. Press Next to follow it. The picture is from the Airflow documentation, and the numbers on the other screens were recorded.', cap: 'Six steps from start to finish.' },
          { say: 'Step 1. The task starts on a worker slot and runs its first lines.', focus: ['start'], cap: 'It holds a slot for a moment.' },
          { say: 'Step 2. It calls `defer()` with a **trigger**: a small piece of async code that knows how to wait. The task goes to the `deferred` state and **the slot is freed**.', on: ['e1'], focus: ['start', 'defer'], tags: ['tg_slot'], cap: 'defer() frees the slot.' },
          { say: 'Step 3. A **triggerer** process picks up the trigger. One triggerer runs many triggers in one async event loop. The recording shows the setting `triggerer.capacity` with the default of ' + G.cfg('triggerer.capacity') + ' at the same time.', on: ['e2'], focus: ['defer', 'trig'], cap: 'Thousands of waits in one process.' },
          { say: 'Step 4. The event fires: the file arrived. The trigger sends an event and finishes.', on: ['e3'], focus: ['trig', 'fire'], cap: 'An event wakes the task up.' },
          { say: 'Step 5. The scheduler sets the task to `scheduled` again. It goes through the executor like a normal task and needs a free slot again.', on: ['e4'], focus: ['fire', 'sched'], cap: 'It queues for a slot again.' },
          { say: 'Step 6. A worker runs the rest of the task: it reads the event and succeeds or fails. In the recorded run each sensor was `deferred` for about 13 seconds and used its slot again for about a second at the end.', on: ['e5'], focus: ['sched', 'resume'], cap: 'A short run to finish.' }
        ]
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'Two sensors in poke mode wait in a pool of two slots. A third task of the same pool is ready. What did the recording show for the other two sensors?',
        opts: [
          { t: 'They ran at once, because sensors use no slots', fb: 'A sensor in poke mode uses a slot for the whole wait.' },
          { t: 'They stayed in `scheduled` until the first two sensors finished', fb: '' },
          { t: 'They failed with a pool error', fb: 'A full pool makes tasks wait. It does not fail them.' },
          { t: 'They were deferred', fb: 'Only deferrable sensors defer.' }
        ],
        ok: 1, why: 'In the poke run the third and fourth sensors were `scheduled` for about 15 seconds. The two running ones held both slots for the 14 seconds that the file took, and the numbers add up to ' + P.slot_seconds + ' slot seconds.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'What state does a sensor in reschedule mode have between two checks?',
        opts: [
          { t: '`running`', fb: 'That is poke mode.' },
          { t: '`up_for_reschedule`', fb: '' },
          { t: '`deferred`', fb: 'That is the deferrable mode.' },
          { t: '`up_for_retry`', fb: 'That state follows a failed try.' }
        ],
        ok: 1, why: 'The recorded reschedule run lists `' + WT.reschedule.states_seen.join(', ') + '`. Between checks the task holds no slot. The recording counted ' + R.slot_seconds + ' slot seconds against ' + P.slot_seconds + ' for poke.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'What do you need to run, besides the scheduler, to use deferrable operators?',
        opts: [
          { t: 'A triggerer process', fb: '' },
          { t: 'A second metadata database', fb: 'The triggerer uses the same database.' },
          { t: 'A Celery worker', fb: 'The executor does not matter for this.' },
          { t: 'Nothing. The scheduler does it', fb: 'The scheduler does not run triggers. Without a triggerer, deferred tasks wait forever.' }
        ],
        ok: 0, why: 'A deferred task waits in the triggerer. The recording started a triggerer, and the health check listed a triggerer job as running.'
      }),

      B.quiz({
        id: 'm7-q4', t: 1,
        q: 'A sensor has no `timeout` set. What is the default wait?',
        opts: [
          { t: 'One hour', fb: 'That is not the default.' },
          { t: 'Seven days: the setting `sensors.default_timeout` is ' + G.cfg('sensors.default_timeout') + ' seconds', fb: '' },
          { t: 'Forever', fb: 'There is a limit, and it is long.' },
          { t: 'Until the next run of the DAG', fb: 'A sensor does not know the next run.' }
        ],
        ok: 1, why: 'A sensor with no timeout waits for ' + G.cfg('sensors.default_timeout') + ' seconds, seven days. In a daily DAG with `max_active_runs=1` that blocks six more runs. Set a timeout in hours.'
      }),

      B.quiz({
        id: 'm7-q5', t: 2,
        q: 'You switch 40 poke sensors to `deferrable=True`, and the partner pool has `include_deferred` set to false. How many pool slots do the 40 waiting sensors hold?',
        opts: [
          { t: 'None while they are deferred', fb: '' },
          { t: '40', fb: 'That is poke mode, or a pool that includes deferred tasks.' },
          { t: '1', fb: 'Each sensor counts on its own.' },
          { t: '2, the size of the pool', fb: 'The pool size is a limit, not a use.' }
        ],
        ok: 0, why: 'The recording shows the `include_deferred` column of the pool list as `False` for every pool. With it off, deferred tasks do not count against the slots. The Admin page can switch it on if you want a limit on waiting tasks too.'
      }),

      B.quiz({
        id: 'm7-q6', t: 2,
        q: 'A deferred task\'s trigger fires. What must be free for the task to finish?',
        opts: [
          { t: 'Nothing: the triggerer finishes the task', fb: 'The triggerer only sends the event.' },
          { t: 'A slot: the task is scheduled again and runs on a worker', fb: '' },
          { t: 'The whole pool', fb: 'It needs one slot.' },
          { t: 'The scheduler lock', fb: 'There is no such lock.' }
        ],
        ok: 1, why: 'After the event the scheduler sets the task to `scheduled`, and it runs the rest of its code on a worker. In the recorded deferrable run each sensor went `deferred`, then `scheduled`, then `running` and `success`.'
      }),

      B.quiz({
        id: 'm7-q7', t: 2,
        q: 'You wait for a partner file with a reschedule sensor and a `poke_interval` of 5 seconds. What is the cost?',
        opts: [
          { t: 'None: reschedule is free', fb: 'It is cheaper in slots, not free.' },
          { t: 'Many short task tries: every check is a new try that the scheduler schedules and the database records', fb: '' },
          { t: 'The sensor holds the slot', fb: 'That is poke mode.' },
          { t: 'The triggerer does the work', fb: 'That is deferrable mode.' }
        ],
        ok: 1, why: 'Each check ends the try and schedules a new one. The recorded reschedule run alternated `up_for_reschedule` and `queued` with a 2-second interval. For a wait of hours use an interval of minutes, or defer.'
      }),

      B.quiz({
        id: 'm7-q8', t: 2,
        q: 'A partner can call your API when its file is ready. What is the best design?',
        opts: [
          { t: 'A poke sensor every 10 seconds', fb: 'It polls forever for something that can tell you.' },
          { t: 'An event: the partner call (or a small task) updates an asset, and a DAG schedules on the asset', fb: '' },
          { t: 'A reschedule sensor every minute', fb: 'Cheaper than poke, and still a poll.' },
          { t: 'A cron line at the latest time the file might arrive', fb: 'It waits for the worst case, and still fails when the file is later.' }
        ],
        ok: 1, why: 'When the other side can signal, an event removes the wait and the guess. The recorded asset consumers started on an update without any sensor.'
      }),

      B.bug({
        id: 'm7-bug1', t: 1, q: 'Forty partner files arrive between 01:00 and 05:00. The pool `partner_pool` has two slots, and the DAG\'s other tasks never get a slot. Click the line that causes it.',
        file: 'brewline_partner_files.py', lang: 'python', code: SENSOR_BUG, bad: [G.at(SENSOR_BUG, /FileSensor\(task_id/)],
        hint: 'What does a sensor do with its slot while it waits, in the default mode?',
        why: 'The default mode is `poke`: each waiting sensor keeps its slot until its file arrives, and the default timeout is seven days. Two sensors fill the pool and the other 38 wait. Defer the wait to the triggerer and set a timeout that matches the business.',
        fix: SENSOR_FIX,
        cheer: 'A sensor with no mode and no timeout is a slot leak.'
      }),

      B.bug({
        id: 'm7-bug2', t: 2, q: 'The partner file did not arrive today. The sensor is in reschedule mode, the DAG is daily, and `max_active_runs=1`. Tomorrow\'s run does not start. Click the line to fix.',
        file: 'brewline_wait_partner.py', lang: 'python', code: TIMEOUT_BUG, bad: [G.at(TIMEOUT_BUG, /PythonSensor\(task_id/)],
        hint: 'How long will this sensor wait before it gives up?',
        why: 'With no `timeout` the sensor waits for the default of seven days, and with `max_active_runs=1` every later run waits behind it. Set a timeout after which the sensor fails, and let an alert tell you.',
        fix: TIMEOUT_FIX,
        cheer: 'Every wait needs an end.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the life of a deferrable sensor in order.',
        items: [
          'The sensor starts on a worker slot',
          'It calls `defer()` with a trigger, and its state becomes `deferred`',
          'The slot is free for other tasks',
          'The triggerer runs the trigger and waits for the file',
          'The trigger fires, and the scheduler sets the task to `scheduled`',
          'A worker runs the rest of the task, and it succeeds'
        ],
        why: 'The wait happens in the triggerer, so the worker slot is free between steps 2 and 5. The task needs a slot again only for its last moments.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'rec', title: 'Decision: how should the nightly DAG wait for a file that comes between 01:00 and 05:00?',
        scenario: 'The partner file arrives at some time between 01:00 and 05:00, and the DAG has 12 such files to wait for. The cluster has a pool of 8 slots shared with other DAGs. You can run a triggerer. Which mode do you choose?',
        opts: [
          { t: '`poke` with a 30-second interval', d: 'The simplest. The first check is immediate.', lose: '12 sensors hold 12 slots for hours, and the pool has 8. The other DAGs starve. The recording shows two sensors holding both slots of a two-slot pool.' },
          { t: '`reschedule` with a 5-minute interval', d: 'No slot is held between checks. No new process.', lose: 'It works, and it is the second choice. Every check is a new task try that needs a free slot, so a busy pool can delay a check, and 12 sensors checking every 5 minutes make hundreds of short tries a night.' },
          { t: '`deferrable=True`, with a timeout of five hours', d: 'The waits cost no slot at all, and a triggerer handles all 12 in one process.' }
        ],
        pick: 2,
        why: 'Twelve long waits are what the triggerer is for. The recorded deferrable run held ' + D.slot_seconds + ' slot seconds for four sensors, against ' + P.slot_seconds + ' for poke. Reschedule is the second choice and a good one when you do not run a triggerer.',
        when: 'Choose reschedule when you cannot run a triggerer, or when the checks are rare and cheap.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: nothing else runs while we wait for the partner', time: '03:10',
        alert: '**At 03:10 the pool `partner_pool` has 2 slots in use and 38 tasks `scheduled`. The load tasks of other DAGs that use the same pool do not start.** All 40 partner sensors run in the default mode, and 22 of the files have not arrived.',
        clues: ['The sensors use `partner_pool`, which has two slots', 'The default sensor mode is `poke`', 'The list of pools shows the slots: `partner_pool | 2`'],
        opts: [
          { t: 'Switch the sensors to reschedule or deferrable mode, and set a timeout, so that waiting stops holding the slots', fb: '' },
          { t: 'Raise the pool to 40 slots', fb: 'It lets all sensors wait, and the pool can then starve other work on the workers.' },
          { t: 'Restart the scheduler', fb: 'The tasks are in the right state. The scheduler is doing what the pool says.' },
          { t: 'Clear the 38 scheduled tasks', fb: 'They go back to the same queue.' }
        ],
        best: 0,
        why: 'The recording shows the same thing in small: two poke sensors held both slots of a two-slot pool, and the other two waited in `scheduled`. Moving the wait out of the slot solves it at the root. A bigger pool only moves the limit.',
        checks: [
          ['See it', 'Look at the pool in the UI or `airflow pools list`. The recorded list shows each pool and its slots, and `include_deferred`.'],
          ['Fix it', 'Deferrable sensors need a triggerer. If there is none, use reschedule with a poke interval of minutes.'],
          ['Cap it', 'Set a `timeout` on every sensor, so that a missing file fails after hours and not after seven days.']
        ],
        tell: 'Forty sensors in poke mode filled a pool of two slots, and the other work waited. I moved the waits to reschedule mode, then to deferrable mode once a triggerer was running, and set a timeout on every sensor.',
        prevent: 'Make `mode` and `timeout` required in review for every sensor.'
      }),

      B.talk({
        id: 'm7-ext1', t: 3, src: 'docs', title: 'Extra: the triggerer, and the other ways to wait',
        say: 'Press Next. This is from the Airflow documentation and the installed package.',
        items: [
          ['One event loop', 'A **trigger** is a small piece of asynchronous Python code. All triggers run in one Python process, the triggerer, which uses an event loop. The setting `triggerer.capacity` limits how many triggers one triggerer runs: ' + G.cfg('triggerer.capacity') + ' by default. For more waits, or for high availability, run more than one triggerer.', 'Cheap waiting, in bulk.'],
          ['Only operators defer', 'Deferral is available to class-based operators. You cannot defer from inside a plain `PythonOperator` or a TaskFlow function. Many sensors have a deferrable form, and the standard provider ships the triggers for the common ones, such as `FileTrigger`.', 'Use the deferrable variant of a sensor.'],
          ['Async tasks (3.2)', 'Airflow 3.2 also supports Python-native async tasks. They keep the task process running and use a shared event loop. The documentation compares them with deferred operators. Deferral frees the process, and an async task keeps it.', 'Read the comparison before you pick.'],
          ['Human input', 'Operators that wait for a person do not use deferral or the triggerer. They wait in the scheduler-managed `awaiting_input` state.', 'A deployment that only waits for humans needs no triggerer.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-sensor', t: 1, tag: 'Airflow', secs: 75,
        q: 'What is a sensor, and what are the modes?',
        pts: ['A task that waits until a condition is true', 'poke keeps the slot, reschedule gives it back between checks', 'deferrable hands the wait to the triggerer', 'Always set a timeout'],
        short: 'A sensor is a task that waits for a condition: a file, a partition, a time, another DAG. When the condition is true it succeeds and its children run.\n\nThe cost is the worker slot. In poke mode the sensor keeps its slot for the whole wait. In reschedule mode it ends its try between checks, is `up_for_reschedule`, and needs a slot only for each check. A deferrable sensor hands the wait to the triggerer, which runs many waits in one async process, so it holds no slot at all.\n\nI ran four sensors for a file that arrived after 14 seconds, in a pool of two slots. Poke used about 28 slot seconds and left two sensors waiting for a slot. Reschedule used 5. Deferrable used 1. And I always set a timeout: the default is seven days.',
        fu: [['What do you need for deferrable sensors?', 'A running triggerer, and a sensor that has a deferrable form.']],
        trap: 'Using poke for every wait because it is the default.',
        real: 'Name a sensor in your team, its mode, and its timeout.'
      }),

      B.qa({
        id: 'qa-defer', t: 2, tag: 'Airflow', secs: 75,
        q: 'How does a deferrable operator work, and what are its trade-offs?',
        pts: ['The task calls defer() with a trigger and frees its slot', 'The triggerer runs many triggers in one async loop', 'The event reschedules the task, which finishes on a worker', 'Needs a triggerer, async-safe code, and one more thing to run'],
        short: 'When a deferrable operator has nothing to do but wait, it calls defer with a trigger. The task goes to the deferred state and releases its slot. A triggerer process picks up the trigger and runs it in an event loop together with thousands of others. When the trigger fires, the scheduler sets the task to scheduled again, a worker runs the rest of it, and it succeeds or fails.\n\nThe trade-offs are that you must run a triggerer, which is one more process to keep healthy, that the trigger code must be async and must not block the loop, and that the task still needs a slot at the end. In return the waits cost almost no slot. In my recording four deferred sensors held about one slot second in total, against 28 for poke.',
        fu: [['Can any task defer?', 'Only class-based operators written for it. Not a plain Python function.']],
        trap: 'Putting blocking code in a trigger. It stalls every other trigger in that triggerer.',
        real: 'Say whether your deployment runs a triggerer, and which operators use it.'
      }),

      B.qa({
        id: 'qa-wait-design', t: 2, tag: 'Design', secs: 60,
        q: 'A partner delivers a file at an unknown time. How do you build the pipeline?',
        pts: ['If the partner can signal: an event or an asset', 'Otherwise a deferrable or reschedule sensor', 'A timeout, an alert, and a plan for a missing file', 'Idempotent tasks after the sensor'],
        short: 'If the partner can tell us when the file is ready, I prefer an event: a small task or an API call updates an asset, and the pipeline schedules on the asset. There is nothing to wait for and no guess.\n\nIf not, I use a sensor, and I choose the mode by the length of the wait. For hours I use a deferrable sensor if a triggerer runs, and a reschedule sensor with a poke interval of minutes if not. Poke is for waits of seconds.\n\nEvery sensor has a timeout that matches the business, for example five hours, and a failure alerts a person, because a missing file is a business problem. And the tasks after the sensor are idempotent, so that a late file followed by a rerun does not load anything twice.',
        fu: [['What if the file arrives late every Monday?', 'Move the timeout, or schedule on the event. Do not widen every timeout.']],
        trap: 'Polling every second in poke mode, around the clock.',
        real: 'Describe a late delivery you had, and what the pipeline did.'
      }),

      B.qa({
        id: 'qa-triggerer', t: 3, tag: 'Airflow', secs: 60,
        q: 'What is the triggerer, and how do you size and run it?',
        pts: ['A separate process with one async event loop', 'Runs triggers for deferred tasks', 'capacity limits the triggers for one process', 'Run more than one for availability'],
        short: 'The triggerer is a separate Airflow process that runs triggers, the small async pieces of code that deferred tasks wait on. All of them share one Python event loop, which is why thousands of waits cost little.\n\nI size it by the number of simultaneous waits. The setting `triggerer.capacity` limits the triggers of one process, and the default is 1,000. For more, or for availability, I run more than one triggerer, and Airflow spreads the triggers among them.\n\nThe code in a trigger must not block. A blocking call stalls every other trigger in that process. I also watch the triggerer as part of the health check, because a dead triggerer means that deferred tasks never wake up. In my recording the health check listed it next to the scheduler and the DAG processor.',
        fu: [['What happens if the triggerer is down?', 'Deferred tasks stay deferred until a triggerer comes back.']],
        trap: 'Forgetting to run a triggerer after switching sensors to deferrable.',
        real: 'Say how many triggerers your deployment runs, and who watches them.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Sensor Tuner', color: '#DDD6FE',
        pts: [
          'A **sensor** is a task that waits. In **poke** mode it holds a slot for the whole wait. In **reschedule** mode it gives the slot back between checks. A **deferrable** sensor holds no slot and waits in the **triggerer**.',
          'Recorded: four sensors, two slots, a file after 14 seconds: **' + P.slot_seconds + '** slot seconds for poke, **' + R.slot_seconds + '** for reschedule, **' + D.slot_seconds + '** for deferrable.',
          'Every sensor needs a **timeout**. The default is **seven days**. Set it in hours.',
          'Deferrable operators need a running **triggerer**. It runs many waits in one async loop.',
          'If the other side can signal, use an **asset** and wait for nothing.'
        ],
        lines: [
          'I can choose the mode of a sensor.',
          'I can explain what the triggerer does.',
          'I set a timeout on every wait.'
        ]
      })
    ]
  });
})();
