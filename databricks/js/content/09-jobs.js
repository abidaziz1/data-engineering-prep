/* Mission 9: jobs. Tasks, dependencies, triggers, retries, alerts and repair runs.
   Jobs are a Databricks service, so every screen comes from documentation. The job definitions use the field names of the Databricks Python SDK,
   and the verification step checks each field and enum value against that SDK. No job ran on Databricks. */
(function () {
  var B = LAB.b, G = LAB.get;

  var JOB = [
    '{',
    '  "name": "brewline_nightly",',
    '  "max_concurrent_runs": 1,',
    '  "queue": { "enabled": true },',
    '  "timeout_seconds": 7200,',
    '  "run_as": { "service_principal_name": "svc_pipeline" },',
    '  "git_source": {',
    '    "git_url": "https://github.com/brewline/data-pipelines",',
    '    "git_provider": "gitHub",',
    '    "git_branch": "main"',
    '  },',
    '  "parameters": [ { "name": "run_date", "default": "" } ],',
    '  "trigger": {',
    '    "pause_status": "UNPAUSED",',
    '    "file_arrival": {',
    '      "url": "abfss://landing@brewlinelake.dfs.core.windows.net/orders/",',
    '      "wait_after_last_change_seconds": 300',
    '    }',
    '  },',
    '  "email_notifications": { "on_failure": ["data-eng@brewline.example"] },',
    '  "health": {',
    '    "rules": [ { "metric": "RUN_DURATION_SECONDS", "op": "GREATER_THAN", "value": 3600 } ]',
    '  },',
    '  "job_clusters": [',
    '    {',
    '      "job_cluster_key": "etl",',
    '      "new_cluster": { "spark_version": "17.3.x-scala2.13", "node_type_id": "Standard_D4ds_v5", "num_workers": 4 }',
    '    }',
    '  ],',
    '  "tasks": [',
    '    {',
    '      "task_key": "ingest_bronze",',
    '      "job_cluster_key": "etl",',
    '      "spark_python_task": { "python_file": "src/ingest_bronze.py", "source": "GIT" },',
    '      "max_retries": 2,',
    '      "min_retry_interval_millis": 60000,',
    '      "timeout_seconds": 3600',
    '    },',
    '    {',
    '      "task_key": "upsert_silver",',
    '      "depends_on": [ { "task_key": "ingest_bronze" } ],',
    '      "job_cluster_key": "etl",',
    '      "spark_python_task": { "python_file": "src/upsert_silver.py", "source": "GIT" },',
    '      "max_retries": 2,',
    '      "min_retry_interval_millis": 60000',
    '    },',
    '    {',
    '      "task_key": "build_gold",',
    '      "depends_on": [ { "task_key": "upsert_silver" } ],',
    '      "job_cluster_key": "etl",',
    '      "spark_python_task": { "python_file": "src/build_gold.py", "source": "GIT" }',
    '    },',
    '    {',
    '      "task_key": "check_quality",',
    '      "depends_on": [ { "task_key": "build_gold" } ],',
    '      "sql_task": { "warehouse_id": "<sql-warehouse-id>", "file": { "path": "sql/check_revenue.sql", "source": "GIT" } }',
    '    },',
    '    {',
    '      "task_key": "notify_on_failure",',
    '      "depends_on": [ { "task_key": "ingest_bronze" }, { "task_key": "upsert_silver" }, { "task_key": "build_gold" }, { "task_key": "check_quality" } ],',
    '      "run_if": "AT_LEAST_ONE_FAILED",',
    '      "job_cluster_key": "etl",',
    '      "notebook_task": { "notebook_path": "notebooks/notify", "source": "GIT" }',
    '    }',
    '  ]',
    '}'
  ].join('\n');

  var SDK = [
    'from databricks.sdk import WorkspaceClient',
    'from databricks.sdk.service import jobs',
    '',
    'w = WorkspaceClient()',
    '',
    'created = w.jobs.create(',
    '    name="brewline_nightly",',
    '    max_concurrent_runs=1,',
    '    schedule=jobs.CronSchedule(quartz_cron_expression="0 30 2 * * ?", timezone_id="UTC"),',
    '    tasks=[',
    '        jobs.Task(',
    '            task_key="ingest_bronze",',
    '            spark_python_task=jobs.SparkPythonTask(python_file="src/ingest_bronze.py"),',
    '            max_retries=2,',
    '            min_retry_interval_millis=60_000,',
    '        ),',
    '    ],',
    ')',
    '',
    'run = w.jobs.run_now(job_id=created.job_id)',
    'w.jobs.repair_run(run_id=run.run_id, rerun_all_failed_tasks=True)'
  ].join('\n');

  var CONDITION = [
    '{',
    '  "task_key": "has_rows",',
    '  "depends_on": [ { "task_key": "ingest_bronze" } ],',
    '  "condition_task": { "op": "GREATER_THAN", "left": "{{tasks.ingest_bronze.values.rows_loaded}}", "right": "0" }',
    '},',
    '{',
    '  "task_key": "upsert_silver",',
    '  "depends_on": [ { "task_key": "has_rows", "outcome": "true" } ],',
    '  "spark_python_task": { "python_file": "src/upsert_silver.py", "source": "GIT" }',
    '}'
  ].join('\n');

  var BUG = [
    '{',
    '  "task_key": "notify_on_failure",',
    '  "depends_on": [ { "task_key": "build_gold" }, { "task_key": "check_quality" } ],',
    '  "run_if": "ALL_SUCCESS",',
    '  "notebook_task": { "notebook_path": "notebooks/notify", "source": "GIT" }',
    '}'
  ].join('\n');
  var BUGFIX = [
    '{',
    '  "task_key": "notify_on_failure",',
    '  "depends_on": [ { "task_key": "build_gold" }, { "task_key": "check_quality" } ],',
    '  "run_if": "AT_LEAST_ONE_FAILED",',
    '  "notebook_task": { "notebook_path": "notebooks/notify", "source": "GIT" }',
    '}'
  ].join('\n');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Jobs: tasks, triggers and retries', short: 'Jobs', blurb: 'Run the pipeline on a trigger, with retries, alerts and repair runs', minutes: 36,
    focus: ['snap'],
    goals: [
      'Describe a **job**: tasks, dependencies, compute, a trigger and notifications.',
      'Read a **cron schedule** and choose between a schedule and a **file arrival** trigger.',
      'Set **retries, timeouts and concurrency** so that a failure heals itself and a double run cannot happen.',
      'Use **run if** conditions to send an alert only when something failed.',
      'Explain a **repair run** and why your tasks must be **idempotent**.'
    ],
    say: 'Mission 9 is jobs, the part of Databricks that runs your work without you. Jobs are a Databricks service. I could not run one, so every screen comes from the documentation. The job definitions use the field names of the Databricks Python SDK, and in the verification step I checked each name and each enum value against that SDK. The part I could not check is behaviour, so where a detail matters I say that you should read the current page.',
    scenes: [
      B.talk({
        id: 'm9-talk', t: 1, src: 'docs', title: 'What a job is',
        say: 'Press Next for the parts of a job. Databricks calls the service Lakeflow Jobs. It used to be called Workflows.',
        items: [
          ['Tasks', 'A **job** is a named set of **tasks**. A task runs one unit of work: a notebook, a Python script or wheel, a SQL query or file, a dbt project, a JAR, a declarative pipeline, another job, an if/else check, or a loop over a list.', 'One task, one unit of work.'],
          ['Dependencies', 'Each task lists the tasks it **depends on**. The job runs them in that order, and runs tasks without a dependency between them at the same time. The result is a graph, like the one in the next screen.', 'A graph of tasks.'],
          ['Compute', 'A task runs on serverless compute, on a **job cluster** that starts for the run and stops after it, or on an existing all-purpose cluster. Mission 1 explained why a production job should avoid the last one.', 'Choose it for each task or share one.'],
          ['A trigger', 'A job starts on a schedule, when a file arrives, when a table updates, when another job finishes, continuously, or when someone or something calls it through the API.', 'What starts a run.'],
          ['Alerts and identity', 'A job sends notifications on start, success, failure or a slow run, and it runs as a user or as a **service principal**. Use a service principal in production, so the job does not depend on one person.', 'Who runs it, who hears about it.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'The Brewline job as a graph of tasks', g: 'tasks', legend: false,
        steps: [
          { say: 'This is the pipeline of missions 5 and 8 as a job. Boxes are tasks and arrows are dependencies. Press Next to watch one run, and then one failure.', cap: 'Seven boxes. A task starts when everything it depends on has finished.' },
          { say: 'A file lands in the landing folder. A file arrival trigger starts the job. The first task, bronze, begins.', on: ['t1'], focus: ['land', 'brz'], status: { land: 'ok', brz: 'run' }, cap: 'The trigger starts the run.' },
          { say: 'Bronze finishes. Two tasks depend on it, silver and the customer dimension, and nothing orders them against each other, so they run **at the same time**.', on: ['t2', 't6'], focus: ['brz', 'slv', 'dim'], status: { land: 'ok', brz: 'ok', slv: 'run', dim: 'run' }, cap: 'Independent tasks run in parallel.' },
          { say: 'Gold depends on both silver and the dimension. It waits until both have finished.', on: ['t3', 't7'], focus: ['slv', 'dim', 'gld'], status: { land: 'ok', brz: 'ok', slv: 'ok', dim: 'ok', gld: 'run' }, cap: 'A task with two parents waits for both.' },
          { say: 'The quality check runs after gold. It compares revenue with the source. If it passes, the job succeeds.', on: ['t4'], focus: ['gld', 'dq'], status: { land: 'ok', brz: 'ok', slv: 'ok', dim: 'ok', gld: 'ok', dq: 'run' }, cap: 'Check before you tell anyone it is done.' },
          { say: 'Now a failure. The silver task fails after its retries. Everything that depends on it never starts: gold and the check are **excluded**. The alert task runs, because its condition is that at least one task failed.', on: ['t5'], focus: ['slv', 'gld', 'dq', 'ntf'], status: { land: 'ok', brz: 'ok', slv: 'fail', dim: 'ok', gld: 'skip', dq: 'skip', ntf: 'run' }, cap: 'A failure stops its dependents and wakes the alert.' }
        ]
      }),

      B.code({
        id: 'm9-json', t: 1, src: 'docs', title: 'The job as a definition', file: 'job.json', lang: 'json', code: JOB,
        steps: [
          { say: 'A job is data: a JSON document that the Jobs API accepts. You can also write it in a bundle file (mission 11) or with the Python SDK. This is the Brewline job. Press Next to read it in parts.', lines: null },
          { say: 'Run **one at a time**: `max_concurrent_runs` is 1, and with `queue` enabled a second run waits instead of being skipped. The whole job times out after 2 hours, and it runs as a **service principal**.', lines: G.span(JOB, /"max_concurrent_runs"/, /"run_as"/) },
          { say: 'The code lives in **Git**. The job checks out the branch for each run, so a change reaches production through a pull request. The job also has a parameter, `run_date`, that tasks can read.', lines: G.span(JOB, /"git_source"/, /"parameters"/) },
          { say: 'The **trigger** is a file arrival in the landing folder. The wait of 300 seconds after the last change lets a burst of files finish before the run starts.', lines: G.span(JOB, /"trigger"/, /^  \},$/) },
          { say: 'Alerts: an email on failure, and a **health rule** that warns when a run lasts more than 3,600 seconds.', lines: G.span(JOB, /"email_notifications"/, /RUN_DURATION_SECONDS/) },
          { say: 'One **job cluster**, shared by the tasks. It starts when the run starts and stops when the run ends. It bills for the run and for nothing else.', lines: G.span(JOB, /"job_clusters"/, /^  \],$/) },
          { say: 'The first task. It runs a Python file from Git on the job cluster. If it fails, Databricks **retries** it twice, waiting 60 seconds between tries, and it gives up if the task runs longer than an hour.', lines: G.span(JOB, /"task_key": "ingest_bronze"/, /"timeout_seconds": 3600/) },
          { say: '`depends_on` is what makes the graph. Silver starts only after bronze has succeeded.', lines: G.span(JOB, /"task_key": "upsert_silver"/, /"depends_on"/) },
          { say: 'The last task alerts. `run_if` set to `AT_LEAST_ONE_FAILED` means: run when at least one of the tasks I depend on failed. It lists all four, so it hears about any of them.', lines: G.span(JOB, /"task_key": "notify_on_failure"/, /"run_if"/) }
        ],
        note: 'The field names come from the Databricks Python SDK, and I checked them in the verification step. The runtime string and the node type are examples: use a runtime and a VM size that your workspace offers.'
      }),

      B.cmp({
        id: 'm9-triggers', t: 1, src: 'docs', title: 'What can start a job',
        say: 'A job needs a trigger, or somebody has to start it. Press Next to compare the options. This follows the Databricks documentation, and some options may be in preview in your workspace.',
        cols: ['Trigger', 'It starts a run when', 'Use it for'],
        hl: 2,
        rows: [
          ['Schedule', 'The clock matches a cron expression, in a time zone you choose.', 'Work that has a fixed time, such as a report at 07:00.'],
          ['File arrival', 'A new file lands in a Unity Catalog storage location. You can wait for a quiet period before the run starts.', 'Sources that deliver at unpredictable times.'],
          ['Table update', 'A table you name changes. You can wait for a quiet period.', 'A job downstream of a table another team maintains.'],
          ['Job completion', 'Another job finishes. The documentation marks this one as beta.', 'Chains of jobs owned by different teams.'],
          ['Continuous', 'Always: when a run ends, the next starts. It cannot be combined with other triggers.', 'Streaming work that must never stop.'],
          ['Manual or API', 'A person clicks, or another system calls the API.', 'Backfills, tests and one-off runs.']
        ],
        steps: [
          { upto: 2, say: 'A schedule runs whether or not new data exists. A file arrival trigger runs when there is something to do.' },
          { upto: 4, say: 'Table updates and job completion connect jobs without a guessed time. That removes the "start at 06:00 and hope upstream is done" habit.' },
          { upto: 6, say: 'Continuous keeps the compute alive. Mission 8 showed the cost. Manual and API runs are for you, for backfills and tests.' }
        ],
        pick: 'Prefer a **trigger that reflects the data**: file arrival or table update. Use a **schedule** only when the business needs a fixed time. You can combine triggers, except continuous.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'A job has the schedule `0 30 2 * * ?` in the time zone UTC. When does it run?',
        opts: [
          { t: 'Every day at 02:30:00 UTC', fb: '' },
          { t: 'Every 30 minutes, starting at 02:00', fb: 'That would be `0 0/30 2 * * ?` or similar. The fields are seconds, minutes, hours, day of month, month and day of week. Here seconds is 0, minutes is 30 and hours is 2.' },
          { t: 'At 02:30 on the 2nd day of every month', fb: 'The day-of-month field holds `*`, which means every day.' },
          { t: 'Every day at 30 seconds past 02:00', fb: 'The first field is seconds, and it holds 0. The second field, minutes, holds 30.' }
        ],
        ok: 0, why: 'Databricks uses Quartz cron expressions. Read them as seconds, minutes, hours, day of month, month, day of week. `0 30 2 * * ?` is second 0, minute 30, hour 2, any day of the month, any month, and `?` for no particular day of the week.'
      }),

      B.cmp({
        id: 'm9-settings', t: 1, src: 'docs', title: 'Settings that make a job safe',
        say: 'A job that works once is easy. These settings make it work every night. Press Next to read what each protects against.',
        cols: ['Setting', 'Protects against', 'Watch out for'],
        hl: 2,
        rows: [
          ['`max_retries` with `min_retry_interval_millis`', 'A short, random failure: a lost node, a network blip, a busy source.', 'A retry hides a bug that fails every time. It also repeats the work, so a task that appends can write twice.'],
          ['`timeout_seconds` on a task or a job', 'A task that hangs and bills for hours.', 'Set it well above the normal run time, or good runs get cut.'],
          ['`max_concurrent_runs` with `queue`', 'Two runs at the same time, for example a manual run during the scheduled one.', 'A long queue means the data is late. Alert on it.'],
          ['`health` rules', 'A run that takes much longer than usual but does not fail.', 'A rule needs a notification target to be of any use.'],
          ['`email_notifications` or webhooks', 'Nobody knowing that a job failed.', 'Alerts that fire daily are ignored. Fix the cause.'],
          ['`run_if`', 'Cleanup or alert tasks that must run when something failed.', 'It looks at the tasks it depends on. List all that you watch.']
        ],
        steps: [
          { upto: 2, say: 'Retries and timeouts handle one task going wrong in a normal way.' },
          { upto: 4, say: 'Concurrency and health rules handle a whole run going wrong in an unusual way.' },
          { upto: 6, say: 'Notifications and `run_if` make sure that a human hears about it.' }
        ],
        pick: 'Set **retries on tasks that read from outside systems**, a **timeout** everywhere, and **max concurrent runs of 1** for anything that writes a table. Then make the writes safe to repeat.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'A task fails once a month because a worker node is lost during the run. The next attempt always works. Which setting lets the job heal without a person?',
        opts: [
          { t: 'Retries: `max_retries` with a `min_retry_interval_millis`', fb: '' },
          { t: 'A longer `timeout_seconds`', fb: 'The task fails fast with an error. It does not hang, so a longer timeout changes nothing.' },
          { t: '`max_concurrent_runs` set to 10', fb: 'That lets more runs overlap. It has nothing to do with one task failing.' },
          { t: 'A health rule on the run duration', fb: 'It sends an alert about a slow run. It does not start another attempt.' }
        ],
        ok: 0, why: 'A lost node is a transient failure, and a retry starts a fresh attempt of the task. Keep the number small, such as 2, and keep the writes safe to repeat.'
      }),

      B.code({
        id: 'm9-cond', t: 2, src: 'docs', title: 'An if/else task, and values between tasks', file: 'job.json (two tasks)', lang: 'json', code: CONDITION,
        steps: [
          { say: 'Sometimes a later task should run only when an earlier one found work. Instead of failing on an empty run, you can branch.', lines: null },
          { say: 'The first task is an **if/else condition** task. It compares two values. The left value reads a **task value** that the bronze task set, `rows_loaded`. A task can publish values for later tasks in the same run.', lines: [1, 4] },
          { say: 'The next task depends on the condition and on its **outcome**: `"true"`. It runs only when the condition was true. If bronze loaded 0 rows, silver is excluded, and the run ends without an error.', lines: [6, 9] }
        ],
        note: 'The dynamic value syntax, `{{tasks.<task>.values.<name>}}`, comes from the Databricks documentation on dynamic value references. A skipped silver on a quiet night is cheaper than a silver run that finds nothing.'
      }),

      B.cmp({
        id: 'm9-runif', t: 2, src: 'docs', title: 'Run if: six conditions',
        say: 'By default, a task runs only when every task it depends on succeeded. `run_if` changes that. The documentation lists six conditions. Press Next to read them.',
        cols: ['`run_if` value', 'The task runs when', 'Typical use'],
        hl: 2,
        rows: [
          ['`ALL_SUCCESS` (the default)', 'All dependencies succeeded.', 'Normal work.'],
          ['`AT_LEAST_ONE_SUCCESS`', 'At least one dependency succeeded.', 'Combine the results of branches that may fail.'],
          ['`NONE_FAILED`', 'No dependency failed. Some may have been skipped.', 'A join after an optional branch.'],
          ['`ALL_DONE`', 'All dependencies finished, whatever their result.', 'Cleanup that must always run.'],
          ['`AT_LEAST_ONE_FAILED`', 'At least one dependency failed.', 'An alert or a rollback.'],
          ['`ALL_FAILED`', 'Every dependency failed.', 'A last resort fallback.']
        ],
        steps: [
          { upto: 3, say: 'The first three decide when to continue. The default is the strictest.' },
          { upto: 4, say: '`ALL_DONE` is for tasks that must run at the end, such as stopping a temporary resource, even after a failure.' },
          { upto: 6, say: 'The last two react to failure. When the condition is not met, Databricks marks the task as excluded.' }
        ],
        pick: 'Use `AT_LEAST_ONE_FAILED` for the alert, and `ALL_DONE` for cleanup. For a job-wide alert you can also use the notification settings of the job.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, q: 'This alert task is supposed to send a message when the job fails. It has never sent one. Click the line that explains it.',
        file: 'job.json (one task)', lang: 'json', code: BUG, bad: [G.at(BUG, /"run_if"/)],
        hint: 'Look at when the task is allowed to run.',
        why: '`ALL_SUCCESS` is the default, and it says: run only when every dependency succeeded. An alert for a failure would then run only when nothing failed. Use `AT_LEAST_ONE_FAILED`.',
        fix: BUGFIX,
        cheer: 'Most teams find this one after the first missed alert.'
      }),

      B.rows({
        id: 'm9-repair', t: 2, src: 'docs', title: 'Repair a failed run',
        steps: [
          {
            say: 'The gold task failed on a bad file, and the quality check was excluded. You fix the cause. You do not want to rerun the 40-minute bronze and silver tasks.',
            tabs: [{ layer: 'RUN 1', name: 'task states of the failed run', c: 'snap', cols: ['task', 'state', 'ran for'], rows: [['ingest_bronze', 'succeeded', '12 min'], ['upsert_silver', 'succeeded', '28 min'], ['build_gold', 'FAILED', '3 min'], ['check_quality', 'excluded', 'did not start']], trk: 2 }],
            notes: ['These durations are an example, not a recording.']
          },
          {
            say: 'A **repair run** reruns the failed tasks and the tasks that depend on them, inside the same run. Bronze and silver keep their results and are not run again. Compute for the repair starts only for what needs it.',
            tabs: [
              { layer: 'RUN 1', name: 'task states of the failed run', c: 'snap', cols: ['task', 'state', 'ran for'], rows: [['ingest_bronze', 'succeeded', '12 min'], ['upsert_silver', 'succeeded', '28 min'], ['build_gold', 'FAILED', '3 min'], ['check_quality', 'excluded', 'did not start']] },
              { layer: 'REPAIR', name: 'what the repair does', c: 'snap', cols: ['task', 'in the repair'], rows: [['ingest_bronze', 'not run again'], ['upsert_silver', 'not run again'], ['build_gold', 'runs again, from its start'], ['check_quality', 'runs, because it depends on gold']], trk: 2 }
            ],
            ops: ['you repair the run'],
            notes: ['A repair reruns each failed task **from the beginning**. The documentation says that jobs do not make your tasks idempotent, so a rerun can duplicate data. Use writes that are safe to repeat: overwrite or merge.']
          },
          {
            say: 'In the SDK, the call is `repair_run`. In the UI it is a button on the failed run. Either way, check the cause first: a repair of a task that fails for the same reason fails again.',
            code: { file: 'repair with the SDK', lang: 'python', code: 'w.jobs.repair_run(run_id=run.run_id, rerun_all_failed_tasks=True)' }
          }
        ]
      }),

      B.quiz({
        id: 'm9-q3', t: 2,
        q: 'The `build_gold` task failed. `ingest_bronze` and `upsert_silver` succeeded, and `check_quality` was excluded. You repair the run. Which tasks run?',
        opts: [
          { t: '`build_gold` and `check_quality`', fb: '' },
          { t: 'All four tasks, from the start', fb: 'That is a new run. A repair keeps the results of tasks that succeeded.' },
          { t: 'Only `build_gold`', fb: '`check_quality` depends on gold. It was excluded, so the repair runs it once gold succeeds.' },
          { t: 'Only `ingest_bronze`, because it is the first task', fb: 'A repair starts from the tasks that did not succeed, not from the first task.' }
        ],
        ok: 0, why: 'A repair reruns the failed tasks and the tasks that depend on them. The tasks that succeeded keep their results. This is why every task should be safe to run twice.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: a schedule or a file arrival trigger?',
        scenario: 'Suppliers send order files at **unpredictable times** between 01:00 and 06:00, often **ten files within five minutes**. The dashboard must be ready by **07:00**. A run takes about 25 minutes.',
        opts: [
          { t: 'A schedule at 06:00', d: 'Simple. One run a day.', lose: 'A file that arrives at 06:20 misses the run. And on days when every file is in by 03:00, the data waits three hours for no reason.' },
          { t: 'A file arrival trigger that waits 5 minutes after the last change', d: 'A run starts when files land and the burst is over.' },
          { t: 'A continuous job', d: 'Always running.', lose: 'The compute bills all night for a daily delivery. A continuous job is for work that must react in seconds.' }
        ],
        pick: 1,
        why: 'The trigger follows the data. The wait of 300 seconds after the last change groups the burst of ten files into one run, so you do not start ten runs. With `max_concurrent_runs` of 1 and queueing, files that arrive during a run start the next run when it ends.',
        when: 'Choose the schedule when the business needs a fixed cut-off, such as a financial close at 06:00 that must not include later files. Choose continuous when results are needed within seconds.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'docs', title: 'Incident: every day is counted twice in gold', time: '07:40',
        alert: '**The revenue dashboard shows 18 March twice.** The nightly job ran at 02:30. A teammate started a second run by hand at 02:40, while the first was still running. The gold task appends one row for each day.',
        clues: ['The job has `max_concurrent_runs` set to 10', 'The gold task appends rows instead of merging', 'Both runs finished without an error'],
        opts: [
          { t: 'Set `max_concurrent_runs` to 1 with queueing, make gold write with a merge or overwrite, and remove the duplicate rows', fb: '' },
          { t: 'Delete the duplicate rows by hand and tell the team not to start manual runs', fb: 'It fixes today. The next overlapping run, manual or triggered, brings the problem back.' },
          { t: 'Add retries to the gold task', fb: 'Both runs succeeded. Retries are for failures, and they would repeat an append and add more duplicates.' },
          { t: 'Turn off the schedule', fb: 'The job would no longer run. The cause is overlap and a write that is not safe to repeat.' }
        ],
        best: 0,
        why: 'Two causes met. The job allowed 10 runs at the same time, and gold appended, so each run added its own row. Limit the job to one run, and queue the second. Then change the write to a merge on the date, so that even an accidental second run changes nothing.',
        checks: [
          ['Look at the run list', 'Two runs overlap: 02:30 scheduled and 02:40 manual.'],
          ['Read the job settings', '`max_concurrent_runs` is 10. The default is 1.'],
          ['Read the gold task', 'It appends one row per day.'],
          ['Fix both', 'Set the limit to 1 with queueing. Change gold to a merge by date, so a repeat is harmless.'],
          ['Clean the data', 'Remove the duplicate rows with a delete on the second copy, or restore the table to a version before the runs.']
        ],
        tell: 'The dashboard counted 18 March twice because the nightly job ran twice at the same time: the scheduled run and a manual run that a teammate started ten minutes later. The job allowed ten concurrent runs, and the gold task appended a row for each day, so both runs wrote it. I set max concurrent runs to 1 with queueing, changed gold to a merge by date so that a repeat changes nothing, and removed the duplicates. We also review the concurrency setting of every job that writes a table.',
        prevent: ['**max_concurrent_runs of 1** and a queue for jobs that write tables', 'Writes that are **safe to repeat**: merge by key or overwrite a partition', 'A **uniqueness test** on the gold key', 'A rule that manual runs go through the **repair** button or a queued run']
      }),

      B.code({
        id: 'm9-sdk', t: 3, src: 'docs', title: 'The same job with the Python SDK', file: 'create_job.py', lang: 'python', code: SDK,
        steps: [
          { say: 'You can create and run jobs from code. The Databricks SDK for Python mirrors the Jobs API. I checked the class and field names against the SDK, and I did not run this code against a workspace.', lines: null },
          { say: 'The client reads its host and credentials from the environment or from a profile. Never put a token in the file.', lines: [1, 4] },
          { say: '`jobs.create` takes the settings you saw in the JSON. The schedule is a Quartz cron expression and a time zone.', lines: [6, 9] },
          { say: 'A task has a key, a task type with its settings, and the retry settings.', lines: [10, 16] },
          { say: '`run_now` starts a run. `repair_run` reruns the failed tasks of a run.', lines: [19, 20] }
        ]
      }),

      B.qa({
        id: 'qa-jobs', t: 1, tag: 'Jobs', secs: 60,
        q: 'How do you run and monitor a pipeline on Databricks?',
        pts: ['A job with tasks and dependencies', 'A trigger: file arrival, table update or schedule', 'Compute: serverless or a job cluster, not all-purpose', 'Retries, timeouts, max concurrent runs of 1', 'Notifications and health rules', 'Runs as a service principal, code in Git'],
        short: 'I define a job: tasks with dependencies, so bronze, silver and gold run in order, and independent tasks run in parallel. The code lives in Git, and the job checks it out for each run. It runs as a service principal, not as a person.\n\nI start it with a trigger that follows the data, such as a file arrival or a table update, and use a schedule only for a fixed cut-off. Compute is serverless, or a job cluster that starts for the run and stops after it. I do not run production jobs on all-purpose clusters.\n\nFor safety I set retries on tasks that read outside systems, a timeout, and max concurrent runs of 1 with a queue for jobs that write tables. I add an email on failure and a health rule on the run duration, plus an alert task that runs when something failed. I read all of this from the documentation, and I define the job as code, so it goes through review.',
        fu: [
          ['Why a service principal?', 'The job does not depend on a person who may leave, and its privileges can be limited to what the pipeline needs.'],
          ['How do you see failures over time?', 'In the run list, and by querying the job run system tables, which mission 10 uses.']
        ],
        trap: 'Describing only the schedule. A senior answer covers dependencies, retries, concurrency and alerts.',
        real: 'Describe the triggers and alerts of a job you ran, and one failure it caught.'
      }),

      B.qa({
        id: 'qa-retries', t: 2, tag: 'Jobs', secs: 90,
        q: 'How do you design retries, timeouts and alerts for a job?',
        pts: ['Retries for transient failures only, with an interval', 'A timeout on tasks and on the job', 'Idempotent tasks, because a retry repeats the work', 'max concurrent runs of 1 and a queue', 'A health rule for slow runs and a failure alert', 'run_if for cleanup and alert tasks'],
        short: 'I match each setting to a kind of failure. Retries are for transient failures, such as a lost node or a busy source, so I use two or three with an interval of a minute or more. A retry hides a bug that fails every time, so I alert on the first failure as well as the last.\n\nEvery task gets a timeout that sits well above its normal run time, so a hung task cannot bill for hours. The job gets a health rule on the run duration, so a slow run raises an alert before it fails.\n\nA retry repeats the work, so every task must be safe to run twice: a merge by key, or an overwrite of a partition, never a blind append. I set max concurrent runs to 1 with a queue for any job that writes a table. An alert task uses `AT_LEAST_ONE_FAILED`, and a cleanup task uses `ALL_DONE`. This comes from the documentation, and I have used the same pattern on my own jobs.',
        fu: [
          ['What is idempotent here?', 'Running the task twice leaves the same result as running it once. A merge by key is. An append is not.'],
          ['What if a task needs a long retry wait?', 'Use a longer minimum retry interval, for example when a source rate-limits you.']
        ],
        trap: 'Setting many retries to make the job "reliable". It repeats the work and can multiply duplicates.',
        real: 'Describe a failure that a retry cured and one that a retry hid.'
      }),

      B.qa({
        id: 'qa-repair', t: 2, tag: 'Jobs', secs: 90,
        q: 'A job failed halfway through. How do you rerun it safely?',
        pts: ['Find and fix the cause first', 'Repair the run: it reruns failed tasks and their dependents only', 'Tasks that succeeded keep their results', 'A repair reruns a task from its beginning', 'Tasks must be idempotent, or the rerun duplicates data', 'Check the data and the alerts afterwards'],
        short: 'First I find the cause, because a repair of a task that fails for the same reason fails again. Then I use a repair run. It reruns the failed tasks and the tasks that depend on them inside the same run. The tasks that already succeeded, such as bronze and silver, keep their results, so I do not pay for them twice.\n\nA repair reruns each failed task from its beginning, and the documentation says that jobs do not make tasks idempotent. So the rerun is safe only if the task is: a merge by key, or an overwrite of one partition, not an append. That is why I design every task to be safe to repeat.\n\nAfter the repair I check the output, for example the row counts and the revenue total against the source, and I confirm that the alert for the failure was handled. If the failure left half-written data, I restore the Delta table to the version before the run.',
        fu: [
          ['How do you undo half-written data?', 'With `RESTORE` to the version before the failed run. Mission 3 showed it. The history of the table tells you the version.'],
          ['Repair or a new run?', 'Repair when only part of the run failed and the input is the same. A new run when the input changed.']
        ],
        trap: 'Rerunning the whole job without thinking about duplicates.',
        real: 'Describe a repair you ran and how you checked the data afterwards.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Job Runner', color: '#FECACA',
        pts: [
          'A **job** is tasks plus **dependencies**, compute, a trigger, alerts and an identity. Independent tasks run in parallel.',
          'Prefer a trigger that follows the data: **file arrival** or **table update**. Quartz cron reads seconds, minutes, hours, day, month, weekday.',
          '**Retries** for transient failures, a **timeout** everywhere, **max concurrent runs of 1** with a queue for jobs that write.',
          '`run_if`: **AT_LEAST_ONE_FAILED** for alerts, **ALL_DONE** for cleanup. The default is ALL_SUCCESS.',
          'A **repair run** reruns failed tasks and their dependents. Tasks must be **idempotent**.',
          'Run as a **service principal**, keep code in **Git**, and define the job as code.'
        ],
        lines: [
          'I make every task safe to run twice.',
          'I allow one run at a time for jobs that write tables.',
          'I trigger on the data, not on a guess of the clock.'
        ]
      })
    ]
  });
})();
