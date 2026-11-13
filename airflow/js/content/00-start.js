/* Mission 0: pick a path, see the whole picture, meet the Brewline setup, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VER = 'Apache Airflow ' + G.meta('apache-airflow') + ' on Python ' + G.meta('python');
  G.expect(G.meta('apache-airflow') === '3.4.0', 'the course text says Airflow 3.4.0');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline\'s nightly job as an Airflow DAG', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Every night a set of jobs copies the orders, loads them into the warehouse, checks them and publishes the reports. Until now these ran as lines in a crontab on one server. This course moves them to **Apache Airflow**. The picture is the job as Airflow sees it: a **DAG**, a graph of tasks. It is the design the course builds toward. Mission 2 runs a smaller one for real. Press Next to run it.', cap: 'Eight tasks. An arrow means "start after".' },
          { say: 'Step 1. The first task is a **sensor**. It waits until the files of the day have arrived, so nothing starts on half a delivery.', on: [], focus: ['check'], status: { check: 'run' }, cap: 'A sensor waits for something outside Airflow.' },
          { say: 'Step 2. The files are there. Airflow starts **extract_orders**, and it starts only after the sensor has succeeded.', on: ['e1'], focus: ['check', 'extract'], status: { check: 'ok', extract: 'run' }, cap: 'A task starts when everything before it has succeeded.' },
          { say: 'Step 3. Extract and load run one after the other. If a task fails, Airflow **retries** it as many times as you allowed, and waits between tries.', on: ['e2'], focus: ['extract', 'load'], status: { check: 'ok', extract: 'ok', load: 'run' }, cap: 'Retries are part of the task definition.' },
          { say: 'Step 4. The transform and the quality checks run. The checks compare row counts with the source. Only data that passes them is published.', on: ['e3', 'e4'], focus: ['load', 'xform', 'qual'], status: { check: 'ok', extract: 'ok', load: 'ok', xform: 'ok', qual: 'run' }, cap: 'Check before you publish.' },
          { say: 'Step 5. The checks pass. **publish** swaps the new table in, and **cleanup** removes the temporary files. The run is green. The alert task did not run, because nothing failed.', on: ['e5', 'e7'], focus: ['qual', 'pub', 'clean'], status: { check: 'ok', extract: 'ok', load: 'ok', xform: 'ok', qual: 'ok', pub: 'ok', alert: 'skip', clean: 'ok' }, tags: ['tg_rule8'], cap: 'Cleanup runs because its trigger rule is all_done.' },
          { say: 'Now a bad night. The quality checks **fail**. publish never starts: its upstream task failed, so Airflow marks it `upstream_failed`. The alert task runs, because its trigger rule is `one_failed`. Cleanup runs too, because `all_done` means "run when every parent has finished, whatever happened". One more fact for later: the state of the **run** follows its last tasks, so mission 13 shows how to make the run fail as well.', on: ['e6', 'e8'], focus: ['qual', 'pub', 'alert', 'clean'], status: { check: 'ok', extract: 'ok', load: 'ok', xform: 'ok', qual: 'fail', pub: 'skip', alert: 'ok', clean: 'ok' }, tags: ['tg_rule6', 'tg_rule8'], cap: 'The failure is visible, contained and reported.' },
          { say: 'You will build every part of this: tasks and dependencies (mission 2), schedules and dates (3), safe re-runs (4), passing data (5), retries and trigger rules (6), sensors (7), limits (8), connections (9), tests (10), operations (11), deployment (12), and the mistakes to avoid (13).', focus: ['check', 'extract', 'load', 'xform', 'qual', 'pub', 'alert', 'clean'], cap: 'One job, thirteen missions.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same tool, different expectations. Press Next to read the gap area by area. A senior is judged on how the pipeline behaves on a bad night, not on the number of operators they know.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['DAGs and tasks', 'Write a DAG with a few tasks and set the order.', 'Keep DAG files cheap to parse, small in scope and easy to review.'],
          ['Time', 'Say what a schedule and a logical date are.', 'Pick the timetable, explain data intervals, and run a safe backfill.'],
          ['Loads', 'Load a day of data.', 'Make every task safe to run twice, and design incremental loads and late data.'],
          ['Passing data', 'Return a value from one task and read it in the next.', 'Keep big data out of XCom, use mapping and assets, and know the limits.'],
          ['Failure', 'Set retries and read a failed task log.', 'Choose retries, backoff, timeouts, trigger rules and alerts for each kind of failure.'],
          ['Waiting', 'Use a sensor.', 'Choose poke, reschedule or deferrable, and keep waiting from using up the slots.'],
          ['Capacity', 'Know that there are limits.', 'Size pools and limits, pick an executor, and find why a task does not start.'],
          ['Secrets', 'Use a connection instead of a password in code.', 'Run a secrets backend, mask values, and keep tasks away from the metadata database.'],
          ['Testing', 'Run a DAG once with a test command.', 'Build checks into CI: import tests, unit tests, lint rules.'],
          ['Operations', 'Read the UI and the logs.', 'Upgrade versions, clean the metadata database, watch the scheduler, and handle an incident.'],
          ['Deployment', 'Know that DAG files must reach the scheduler.', 'Design how code, images and dependencies ship, and what a managed service changes.']
        ],
        steps: [
          { upto: 3, say: 'Writing and timing come first. A junior who can write a DAG, schedule it and explain the logical date is already useful. A senior makes the loads safe to run again.' },
          { upto: 7, say: 'Data passing, failure, waiting and capacity are where a pipeline meets reality. This is where most interview questions come from.' },
          { upto: 11, say: 'Secrets, tests, operations and deployment are the work around the DAG. Teams hire seniors to own them.' }
        ]
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'docs', title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is where Brewline starts. Four jobs run from the crontab of one server, and nobody has written down what depends on what.',
            tabs: [{
              layer: 'TODAY', name: 'The crontab', c: 'raw',
              cols: ['Time', 'Command', 'What goes wrong'],
              rows: [
                ['02:00', 'extract_orders.sh', 'If the source is late, it copies half a file and nobody knows.'],
                ['02:30', 'load_orders.sh', 'It starts at 02:30 even when the extract failed at 02:05.'],
                ['03:00', 'build_marts.sh', 'It reads whatever the load left behind.'],
                ['06:00', 'send_report.sh', 'A failure is found when the manager asks where the report is.']
              ],
              trk: 0
            }],
            notes: ['Cron starts a command at a time. It does not know whether the command before it worked, it does not retry, and it keeps no history of runs.']
          },
          {
            say: 'This is the same work in Airflow. Tasks start when their parents have succeeded, they retry, and every run and every attempt is recorded.',
            tabs: [{
              layer: 'IN AIRFLOW', name: 'What replaces each line', c: 'raw',
              cols: ['Cron line', 'In Airflow', 'What it adds'],
              rows: [
                ['The times 02:00, 02:30, 03:00', 'One DAG with a schedule and dependencies between tasks', 'A task starts when its parents succeeded, not when the clock says so.'],
                ['A script that dies', 'A task with retries and a timeout', 'A short outage heals itself, a stuck task is stopped.'],
                ['Mail from cron, or nothing', 'Callbacks and a failure alert task', 'Somebody is told, with the log of the attempt.'],
                ['"Did it run last Tuesday?"', 'The run history in the metadata database', 'You can look it up, and you can run a missed day again.']
              ],
              trk: 0
            }],
            notes: ['Airflow does not make your scripts better. It makes the order, the retries and the history visible and the same every night.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data or control moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something and wrote down what it did: ' + VER + ' with the scheduler, the DAG processor, the API server and the triggerer, a local executor and a SQLite metadata database. Task logs, run states, timings and error messages on those screens are real output. A **From documentation** tag means the fact comes from the Airflow documentation and source that I read, and I did not run it.', 'Recorded means run. From documentation means read.'],
          ['One machine is not production', 'Everything recorded ran on one machine. I did not run Celery, Kubernetes, a managed service such as Amazon MWAA, Google Cloud Composer or Astronomer, or a real production database. Where a behaviour depends on those, the screen says so. Timings are from this machine and are shown as examples, not as limits.', 'Recorded here is not the same as measured on your platform.'],
          ['Models are labelled', 'A few labs apply a rule to settings that I did not run, for example the retry delay for a multiplier of 3. Each of those rules was written from the Airflow source, and a check compares it with Airflow\'s own function or with the recorded runs. The lab says when it is a model.', 'A model is checked against a real run, and it says so.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-versions', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it. If your version differs, the ideas stay and some names and defaults may not.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['Apache Airflow', G.meta('apache-airflow') + ', installed with the official constraints file for Python 3.12', 'Run'],
          ['Task SDK', G.meta('apache-airflow-task-sdk') + ' (the package that DAG authors import from: `airflow.sdk`)', 'Run'],
          ['Providers', 'standard ' + G.meta('apache-airflow-providers-standard') + ', sqlite ' + G.meta('apache-airflow-providers-sqlite') + ', http ' + G.meta('apache-airflow-providers-http') + ', smtp ' + G.meta('apache-airflow-providers-smtp') + ', common-sql ' + G.meta('apache-airflow-providers-common-sql'), 'Run'],
          ['Processes', G.counts('af.stack').processes.join(', '), 'Run'],
          ['Executor and database', G.counts('af.stack').executor + ' with ' + G.counts('af.stack').database + ' as the metadata database', 'Run'],
          ['Test tools', 'pytest ' + G.meta('pytest') + ', ruff ' + G.meta('ruff'), 'Run'],
          ['Celery and Kubernetes executors', 'Described from the documentation', 'Not run'],
          ['Managed services', 'Amazon MWAA, Google Cloud Composer, Astronomer: described from their public pages', 'Not run'],
          ['PostgreSQL or MySQL as the database', 'The recording used SQLite, which allows one writer at a time. Production uses PostgreSQL or MySQL', 'Not run']
        ],
        steps: [
          { upto: 5, say: 'Everything in the first six rows ran on one machine. The dates in the recorded output are shifted to 14 March 2026 so that the course text stays the same when I record again.' },
          { upto: 9, say: 'The last three rows are the ones that you will meet at work. The course teaches the ideas and the settings, and it says where I read and where I ran.' }
        ]
      })
    ]
  });
})();
