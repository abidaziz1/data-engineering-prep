/* Mission 10: orchestration. Cloud Composer (managed Airflow), DAG design, idempotent tasks, retries, tests, Workflows and Scheduler, and Dataform for the SQL graph. Real
   Apache Airflow 3 with the Google provider was run on this machine: it parsed the DAG files, listed an import error, rendered a template and ran a task that fails twice
   (no cloud needed). The Dataform compiler was run on a small project. Cloud Composer, Workflows and the Dataform service were not reachable: how they run, and their prices,
   are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var AD = G.counts('af.dags'), AF = G.counts('af.flaky'), AP = G.counts('af.parse'), AR = G.text('af.render');
  var DAG = G.file('dags/brewline_daily.py'), FLK = G.file('dags/flaky_demo.py'), HVY = G.file('dags/heavy_top_level.py'), BRK = G.file('dags/broken_import.py');
  var DFO = G.file('dataform/orders.sqlx'), DFS = G.file('dataform/stg_orders.sqlx'), DFD = G.file('dataform/daily_sales.sqlx'), DFR = G.file('dataform/orders_raw.sqlx'), DFC = G.file('dataform/constants.js'), DFW = G.file('dataform/workflow_settings.yaml');
  var DA = G.table('df.actions'), DC = G.counts('df.compile'), DE = G.counts('df.compile_error'), DI1 = G.text('df.incremental_first'), DI2 = G.text('df.incremental_next'), DB = G.counts('df.bigquery_options'), DSQ = G.text('df.daily_sales');
  G.expect(AD.dags.indexOf('brewline_daily') >= 0 && AD.brewline_daily.tasks.join(',') === 'start,merge_orders,check_rows' && AD.brewline_daily.catchup === false && AD.brewline_daily.retries.merge_orders === 2 && AD.brewline_daily.bq_template_fields.indexOf('configuration') >= 0, 'the parsed DAG');
  G.expect(Object.keys(AD.import_errors).join(',') === 'broken_import.py' && /bigqeury/.test(AD.import_errors['broken_import.py']), 'the import error');
  G.expect(AF.state === 'success' && AF.tasks.filter(function (t) { return t.task === 'extract'; })[0].tries === 3 && AP.slower_by_at_least_1_9 === true && /20261110/.test(AR), 'the flaky run, the parse time and the render');
  G.expect(DC.tables === 3 && DC.assertions === 2 && DC.declarations === 1 && DC.errors === 0 && DA.rows.length === 3 && DE.errors >= 2 && DB.unique_key[0] === 'order_id', 'the Dataform compile');
  var flaky = AF.tasks.filter(function (t) { return t.task === 'extract'; })[0];
  var BUGT = [
    'import pendulum',
    'from airflow.sdk import DAG',
    'from airflow.providers.standard.operators.empty import EmptyOperator',
    '',
    'prices = requests.get("https://prices.example.com/today").json()',
    '',
    'with DAG(dag_id="prices_daily", schedule="@daily", start_date=pendulum.datetime(2026, 11, 1)):',
    '    EmptyOperator(task_id="start")'
  ].join('\n');
  var FIXT = [
    'import pendulum',
    'from airflow.sdk import DAG, task',
    '',
    'with DAG(dag_id="prices_daily", schedule="@daily", start_date=pendulum.datetime(2026, 11, 1)):',
    '',
    '    @task',
    '    def fetch_prices():',
    '        import requests          # the call runs in the task, not when the file is read',
    '        return requests.get("https://prices.example.com/today", timeout=30).json()',
    '',
    '    fetch_prices()'
  ].join('\n');
  var BUGD = [
    'load = BigQueryInsertJobOperator(',
    '    task_id="load_day",',
    '    configuration={"query": {"query": "INSERT INTO sales.daily SELECT * FROM staging.orders WHERE DATE(order_ts) = CURRENT_DATE()", "useLegacySql": False}},',
    ')'
  ].join('\n');
  var FIXD = [
    'load = BigQueryInsertJobOperator(',
    '    task_id="load_day",',
    '    configuration={"query": {"query": "DELETE FROM sales.daily WHERE sale_date = \'{{ ds }}\'; INSERT INTO sales.daily SELECT * FROM staging.orders WHERE DATE(order_ts) = \'{{ ds }}\'", "useLegacySql": False}},',
    ')'
  ].join('\n');
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Orchestration: Composer, Airflow and Dataform', short: 'Orchestrate', blurb: 'DAGs, retries, idempotent tasks, tests, Workflows and Scheduler, and Dataform for the SQL graph', minutes: 56,
    focus: ['air'],
    goals: [
      'Read and write an **Airflow DAG**: tasks, order, schedule, retries and templates.',
      'Make a task **idempotent**, using the **data interval** and not the clock.',
      'Find a **broken DAG** before the scheduler does, and say why a slow import hurts.',
      'Choose between **Composer**, **Workflows**, **Cloud Scheduler** and **Dataform**.',
      'Write a **Dataform** project: `ref`, incremental tables, assertions, and a compile in CI.',
      'Say what to **test** in a pipeline and where.'
    ],
    say: 'Mission 10 is orchestration, and in the job descriptions that I read it was the most common single tool after BigQuery: Cloud Composer, which is managed Airflow, and often Dataform or dbt beside it. Airflow was installed here for real, version 3 with the Google provider. It parsed the DAG files, reported a typo in an import, rendered a templated BigQuery job, and ran a task that fails twice and succeeds on the third try. Composer itself was not reachable, so what it adds comes from documentation. I also compiled a real Dataform project.',
    scenes: [
      B.flow({
        id: 'm10-flow', t: 1, src: 'docs', title: 'Cloud Composer: from Git to a running task', g: 'composer', legend: true,
        steps: [
          { say: 'An orchestrator decides **what runs, in which order, when, and what to do when it fails**. Cloud Composer is Apache Airflow run for you by Google. Press Next to follow a change from Git to a running task.', cap: 'Managed Airflow.' },
          { say: 'Step 1. The code of the DAGs sits in **Git**. A **Cloud Build** job (or GitHub Actions) tests it and, when the tests pass, copies the files to the **DAGs bucket** of the Composer environment.', on: ['r1', 'r2'], focus: ['c_git', 'c_cb', 'c_bucket'], cap: 'Git, tests, and a copy to the DAGs bucket.' },
          { say: 'Step 2. The **scheduler** reads the files of the bucket, builds the DAGs, and decides which runs are due. It does this over and over, so a DAG file must be quick to read.', on: ['r3'], focus: ['c_bucket', 'c_sched'], cap: 'The scheduler reads the DAG files again and again.' },
          { say: 'Step 3. **Workers** run the tasks. A task in a data pipeline rarely does the work itself: it **starts** a BigQuery job or a Dataflow job and waits for the result. The worker is a remote control.', on: ['r4', 'r5'], focus: ['c_sched', 'c_work', 'c_bq', 'c_df'], cap: 'Workers start the jobs.' },
          { say: 'Step 4. Every state, which run, which task, which try, lives in the **metadata database**, and the **web interface** reads it. This is where you see a failed task and clear it to run it again.', on: ['r7', 'r8'], focus: ['c_work', 'c_meta', 'c_ui'], cap: 'State is in a database, and the UI shows it.' }
        ]
      }),

      B.talk({
        id: 'm10-airflow', t: 1, src: 'docs', title: 'Airflow in eight words',
        say: 'Airflow has a small vocabulary. Eight words let you read any DAG. Press Next for each pair.',
        items: [
          ['DAG and task', 'A **DAG** is a directed graph without cycles: tasks and the order between them. A **task** is one step. An **operator** is a kind of task: a BigQuery job, a Python function, a bash command.', 'A graph of steps.'],
          ['Schedule and data interval', 'A **schedule** says when a run is created (a cron line, or `@daily`). Each run covers a **data interval**, for example the day before. The run for the interval starts when the interval ends. So the 02:00 run on 11 November handles 10 November.', 'A run is for a stretch of data.'],
          ['Retries and timeouts', 'A task can **retry** a number of times with a delay, and have an **execution timeout**. A retry is for a temporary problem. A **sensor** waits for something, such as a file, and a **deferrable** operator waits without holding a worker.', 'Retry the temporary, wait without a worker.'],
          ['Templates and XCom', 'Many fields are **templates**: `{{ ds }}` becomes the date of the run when the task starts. **XCom** passes small values from one task to the next. Do not pass data through it: pass a name or an id.', 'Templates carry the date. XCom carries small facts.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The version matters.', t: 'The DAG files here use the Airflow 3 imports (`airflow.sdk`). Composer environments run an Airflow version chosen by the image you pick, and import paths and some features differ between Airflow 2 and 3. Check the image of your environment.' }
      }),

      B.talk({
        id: 'm10-composer', t: 1, src: 'docs', title: 'What Composer adds',
        say: 'Composer is Airflow, plus Google running it for you. Press Next for what that means in practice. This is from documentation. No Composer environment was used for this course.',
        items: [
          ['An environment', 'You create a Composer **environment**, a named, sized Airflow installation in a project and region. It includes the scheduler, the workers, the triggerer, the web server, a database and a **bucket** for DAGs. You choose a size, an image version, a service account and a network.', 'A whole Airflow, created by one command.'],
          ['It is always on', 'An environment has a **cost floor**: the scheduler and the database run all day, whether or not a DAG runs. So an environment suits a platform with many DAGs. For three simple steps a day, a smaller tool costs less (next screens).', 'Pay for the platform, not per run.'],
          ['The service account', 'Tasks run as the **environment\'s service account**, so its roles are the roles of every DAG. For a platform with several teams, use one environment for each trust boundary, or a service account for each task through operator settings, and keep the roles small (mission 2).', 'One account for all the DAGs in it.'],
          ['Keep it boring', 'Pin the image version, install only the Python packages that you need, keep the DAG folder in Git, and treat an upgrade as a project with tests. A surprise upgrade breaks DAGs in the middle of the night.', 'Versions in code, upgrades by plan.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-dag', t: 1, src: 'rec', title: 'A DAG: the daily orders merge', file: 'brewline_daily.py', lang: 'python', code: DAG,
        steps: [
          { say: 'This is the DAG of the nightly job, and it is a real file: Airflow ' + G.meta('apache-airflow') + ' parsed it for this course. It is an ordinary Python file. Press Next to read it.', lines: null },
          { say: 'The `DAG` has an id, a schedule (`0 2 * * *` is 02:00 every day), a start date **with a time zone**, `catchup=False` and default arguments: every task retries twice. Time zones matter: this one is Singapore time.', lines: G.span(DAG, /^with DAG\(/, /\) as dag:/) },
          { say: '`catchup=False` means: do not create a run for every day since the start date. Leave it on and a new DAG with an old start date runs hundreds of times at once.', lines: G.span(DAG, /catchup=False/) },
          { say: 'The middle task is the real work: a `BigQueryInsertJobOperator` that runs a `MERGE`. Note `{{ ds_nodash }}`: a template that becomes `20261110` for the run of 10 November, so the task reads the staging table of **its own day**, never the clock.', lines: G.span(DAG, /merge_orders = /, /^    \)$/) },
          { say: 'A small Python task checks the result. The decorator `@task` turns a function into a task, and the argument `ds` is filled with the run date.', lines: G.span(DAG, /@task/, /return "checked/) },
          { say: 'The last line draws the graph: start, then merge, then check. `>>` means "then".', lines: G.span(DAG, /start >> merge_orders/) }
        ],
        note: 'Recorded: this file was parsed by Apache Airflow ' + G.meta('apache-airflow') + ' with apache-airflow-providers-google. The BigQuery job was not run. Nothing in it reached Google.'
      }),

      B.rows({
        id: 'm10-parse', t: 1, src: 'rec', title: 'What Airflow made of the files',
        steps: [
          {
            say: 'I pointed Airflow at the folder of DAG files and asked what it found. It built **' + AD.dags.length + ' DAGs**: ' + AD.dags.join(', ') + '. For `brewline_daily` it found the tasks in order, **' + AD.brewline_daily.tasks.join(' then ') + '**, a retry count of **' + AD.brewline_daily.retries.merge_orders + '** on each, and `catchup` set to ' + AD.brewline_daily.catchup + '.',
            tabs: [{ layer: 'RECORDED', name: 'The DAG brewline_daily, as Airflow read it', c: 'raw', cols: ['task', 'runs before', 'retries'], rows: AD.brewline_daily.edges.map(function (e) { return [e[0], e[1].join(', ') || '-', AD.brewline_daily.retries[e[0]]]; }), trk: 0 }],
            notes: ['Recorded with Airflow ' + G.meta('apache-airflow') + '. The schedule was `' + AD.brewline_daily.schedule + '`.']
          },
          {
            say: 'One file did **not** become a DAG: `broken_import.py`. It is listed as an **import error**, with the message the Python gives. The typo is in the name of a module: `bigqeury`. The scheduler would show this in the UI, and the DAG would simply not run.',
            tabs: [{ layer: 'RECORDED', name: 'The import errors of the folder', c: 'raw', cols: ['file', 'error'], rows: Object.keys(AD.import_errors).map(function (k) { return [k, AD.import_errors[k]]; }), trk: 0 }],
            notes: ['A DAG that does not parse does not run, and nothing pages you unless you look. Parse every DAG in CI, and fail on an import error: it takes seconds.']
          }
        ]
      }),

      B.term({
        id: 'm10-render', t: 1, src: 'rec', title: 'Render a template without running the task',
        say: 'A templated field is only text until the task runs. Airflow can render it for a given date, so that you can read the SQL that a run would send. This is the command, and the rendered configuration of the merge task, run by the real Airflow.',
        lines: [].concat(
          G.plain('', { cmd: 'airflow tasks render brewline_daily merge_orders 2026-11-10', d: 400 }),
          G.plain(wrap(AR, 92), { d: 80 })
        ),
        after: 'The template `orders_{{ ds_nodash }}` became **orders_20261110**. The MERGE reads the staging table of that one day, and a retry or a backfill of the same day reads the same table. A task that uses `CURRENT_DATE()` would read a different one tomorrow.',
        afterKind: 'tip',
        doneSay: 'Render before you run. It is the cheapest test of a templated task.'
      }),

      B.widget({ id: 'm10-lab', kind: 'dag', t: 1, src: 'rec', title: 'Lab: retries against a source that is not ready' }),

      B.code({
        id: 'm10-flaky', t: 1, src: 'rec', title: 'A task that fails twice', file: 'flaky_demo.py', lang: 'python', code: FLK,
        steps: [
          { say: 'To see retries I wrote a task that fails on purpose twice, with a counter in a file, and succeeds on the third try. Airflow ' + G.meta('apache-airflow') + ' ran the whole DAG on this machine, with no cloud. Press Next.', lines: null },
          { say: 'The decorator gives the task **2 retries** and a delay of one second between tries. Two retries means three tries in all.', lines: G.span(FLK, /@task\(retries=2/) },
          { say: 'The counter lives in a **file**, because each try runs in a fresh process and a variable would be forgotten. For the first two tries the function raises, as a source that is not ready would.', lines: G.span(FLK, /tries = int/, /raise RuntimeError/) },
          { say: 'The next task takes the value of the first. It runs only if the first succeeds.', lines: G.span(FLK, /def load/, /return value/) }
        ],
        note: 'The real result of the run: extract ended in state `' + flaky.state + '` after **' + flaky.tries + ' tries**, the task after it ran once, and the DAG run ended in `' + AF.state + '`.'
      }),

      B.talk({
        id: 'm10-idem', t: 1, src: 'docs', title: 'Idempotent tasks and the data interval',
        say: 'A task will be retried, cleared and run again by a backfill. Three rules make that safe. Press Next for each.',
        items: [
          ['Use the interval, not the clock', 'The task for the run of 10 November must process 10 November, whenever it runs. Take the date from the template (`{{ ds }}` or the data interval), and never from `now()` or `CURRENT_DATE()`. Otherwise a retry the next morning processes the wrong day.', 'The run decides the day.'],
          ['Replace, do not append', 'Overwrite the partition of that day, or merge by key, as mission 6 showed. An append plus a retry is a double count. A DAG is only as safe as its writes.', 'The same run twice gives the same table.'],
          ['Backfill is the test', 'A **backfill** runs the DAG for a range of past intervals. If your tasks are idempotent and use the interval, a backfill of a month is a routine. If not, it is a fire. Keep `catchup=False` for new DAGs, and backfill on purpose.', 'A month of reruns should be boring.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'In Airflow 3,', t: 'a run started by hand may have no logical date at all, so code that reads the date of the run must handle that. Read the migration notes for your version.' }
      }),

      B.cmp({
        id: 'm10-ops', t: 2, src: 'docs', title: 'The Google operators you will meet',
        say: 'The Google provider for Airflow has an operator for most services. A few come up in almost every data platform. Press Next to read the pattern. The names are from the provider documentation as I know it: check the reference of your version.',
        cols: ['Operator', 'What it does', 'Note'],
        hl: 1,
        rows: [
          ['BigQueryInsertJobOperator', 'Runs any BigQuery job from a configuration: query, load, copy, extract', 'Has template fields (recorded: configuration, job_id, project_id and more). The one you will use most'],
          ['GCSToBigQueryOperator', 'Loads files from Cloud Storage into a table', 'Mind the write disposition (mission 4)'],
          ['DataflowStartFlexTemplateOperator', 'Launches a Flex Template', 'The job id is returned, and a sensor can wait for it'],
          ['DataprocCreateClusterOperator, DataprocSubmitJobOperator, DataprocDeleteClusterOperator', 'The three steps of an ephemeral cluster', 'Delete with a trigger rule that runs even when the job failed'],
          ['DataprocCreateBatchOperator', 'Runs a serverless Spark batch', 'No cluster to create or delete'],
          ['Operators for Pub/Sub, Cloud Run jobs and Dataform', 'Publish, start a job, compile and run a workflow', 'Check the provider reference for the exact names']
        ],
        steps: [
          { upto: 2, say: 'BigQuery operators carry most of the work. A task that starts a job and waits is the pattern.' },
          { upto: 5, say: 'Cluster steps come in threes. The delete must always run.' },
          { upto: 6, say: 'And an operator for the rest. If there is no operator, a Python task with a client library is fine.' }
        ],
        pick: 'Prefer an operator to your own code when it exists: it handles waiting, errors and retries in a known way. Prefer **deferrable** mode for long jobs, so that a worker is not held while a job runs for an hour.'
      }),

      B.cmp({
        id: 'm10-orch', t: 1, src: 'docs', title: 'Composer, Workflows, Scheduler, Dataform or a scheduled query',
        say: 'Airflow is the tool people name first, and it is not always the right one. Five options, and when each fits. Press Next to read the pattern.',
        cols: ['Tool', 'What it is', 'Use it for', 'Too much, or too little, when'],
        hl: 2,
        rows: [
          ['BigQuery scheduled query', 'A query on a schedule', 'One table, one query, no dependencies', 'There are steps, order, retries or alerts'],
          ['Cloud Scheduler', 'A cron trigger for a URL, a topic or a job', 'Start one thing at a time', 'You need to wait for it or to chain steps'],
          ['Workflows', 'A serverless engine that calls APIs in steps, with conditions and retries', 'A short chain of API calls, with no servers and no fixed cost', 'You need rich scheduling, backfill, or hundreds of tasks'],
          ['Dataform', 'A SQL workflow inside BigQuery: tables in dependency order, assertions, Git', 'A graph of SQL tables', 'The steps are not SQL'],
          ['Cloud Composer', 'Managed Airflow', 'A platform with many DAGs, mixed tools, backfill, sensors, and a team that knows Airflow', 'A few simple steps: the always-on cost is not worth it']
        ],
        steps: [
          { upto: 2, say: 'A scheduled query and a scheduler trigger are the smallest tools. Use them when there is nothing to coordinate.' },
          { upto: 4, say: 'Workflows chains API calls cheaply, and Dataform runs a graph of SQL tables. Many platforms use Dataform for the SQL and call it from a small trigger.' },
          { upto: 5, say: 'Composer when the whole platform needs one control tower: mixed tools, backfills and a lot of DAGs.' }
        ],
        pick: 'Match the **size of the tool** to the size of the problem. A common design: **Dataform** for the SQL graph, **Composer** (or Workflows) to start it after the loads finish, and a **scheduled query** for the odd single table.'
      }),

      B.talk({
        id: 'm10-dataform', t: 1, src: 'docs', title: 'Dataform: SQL as a graph',
        say: 'Dataform is the tool of Google Cloud for the transformation step, and it lives inside BigQuery. Job descriptions list it, or dbt, or both. Press Next for the ideas, and then you will see a real project compile.',
        items: [
          ['SQLX files and ref', 'A **SQLX** file is SQL with a `config` block on top and small JavaScript expressions inside. `${ref("stg_orders")}` points to another table of the project. Dataform reads the `ref`s to learn the **order**: it runs a table after the tables it reads.', 'The references are the dependencies.'],
          ['Table types', 'A `config` says what the file builds: a **table**, a **view**, an **incremental** table (add only new rows, or merge by a key), or a **declaration** (a table that already exists, which others `ref`). Options set the partition and the cluster of the result.', 'The type says what to build.'],
          ['Assertions', 'Assertions are the tests of mission 6 with a name: `uniqueKey`, `nonNull`, `rowConditions`, or a SQL file that returns the bad rows. They run as part of the workflow, and a failure stops what depends on the table.', 'Tests are part of the graph.'],
          ['Git, releases and schedules', 'The project is a **Git** repository. A **release configuration** compiles it (and says in which dataset and project the tables go), and a **workflow configuration** runs it on a schedule, as a service account. The **Dataform CLI** compiles and runs it from a laptop or CI.', 'Code in Git, runs on a schedule.'],
          ['And dbt', '**dbt** does the same job with Jinja templates and YAML. Many job descriptions accept either. The ideas carry over: refs, tests, incremental models, a graph. I used Dataform here because it is part of BigQuery.', 'The ideas are shared.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-df-settings', t: 1, src: 'rec', title: 'The project settings and the source', file: 'workflow_settings.yaml', lang: 'yaml', code: DFW + '\n\n# definitions/sources/orders_raw.sqlx\n' + DFR,
        steps: [
          { say: 'A Dataform project starts with a settings file. I compiled this project with the real Dataform compiler ' + G.meta('dataform-cli') + ', offline: it needs no account to compile. Press Next.', lines: null },
          { say: 'The **default project** and **location** say where the tables go. The default dataset is where an action goes when its file does not name one. The assertions get a dataset of their own.', lines: G.span(DFW + '\n\n# definitions/sources/orders_raw.sqlx\n' + DFR, /defaultProject/, /defaultAssertionDataset/) },
          { say: 'A **declaration** says "this table exists, and I do not build it". It gives other files a name to `ref`. Here it is the raw orders table, which Pub/Sub or a load job fills.', lines: G.span(DFW + '\n\n# definitions/sources/orders_raw.sqlx\n' + DFR, /^config \{/, /^\}/) }
        ],
        note: 'In the console a Dataform repository also has a service account. Give it the BigQuery roles of the datasets that it writes, and nothing more.'
      }),

      B.code({
        id: 'm10-df-stg', t: 1, src: 'rec', title: 'A view that removes repeats', file: 'stg_orders.sqlx', lang: 'sql', code: DFS,
        steps: [
          { say: 'The staging step is the QUALIFY of mission 6, as a Dataform view. Press Next.', lines: null },
          { say: 'The `config` makes it a **view** in the `staging` dataset, with a description that shows in the catalog.', lines: G.span(DFS, /^config \{/, /^\}/) },
          { say: '`ref("raw", "orders_raw")` points to the declaration. The compiler turns it into the full name `brewline-dev.raw.orders_raw` and records the dependency.', lines: G.span(DFS, /FROM \$\{ref/) },
          { say: 'The `QUALIFY` keeps the latest delivery of each order, exactly as in the earlier mission.', lines: G.span(DFS, /QUALIFY/) }
        ],
        note: 'A view costs nothing to store, and each query on it pays for what it reads.'
      }),

      B.code({
        id: 'm10-df-orders', t: 1, src: 'rec', title: 'An incremental table with assertions', file: 'orders.sqlx', lang: 'sql', code: DFO,
        steps: [
          { say: 'The curated orders table is **incremental**: after the first run it adds only what is new. Press Next to read the `config`.', lines: null },
          { say: '`type: "incremental"` and a `uniqueKey`. With a key, Dataform writes the new rows with a **merge** on `order_id`: an order that changed is updated, and a new order is inserted.', lines: G.span(DFO, /type: "incremental"/, /uniqueKey: \["order_id"\],/) },
          { say: 'The `bigquery` block sets the **partition** (the day of `order_ts`), the **cluster** (`store_id`), and `requirePartitionFilter`: the guardrails of missions 4 and 5 live in the file that builds the table.', lines: G.span(DFO, /bigquery: \{/, /^  \},/) },
          { say: 'The **assertions** are tests that run after the table is built: `order_id` is unique, three columns are never null, and the total is not negative. A failure stops everything that depends on this table.', lines: G.span(DFO, /assertions: \{/, /^  \}$/) },
          { say: 'The query reads the staging view. `when(incremental(), ...)` adds a filter **only on incremental runs**: take the orders newer than the newest one already in the table (`self()`).', lines: G.span(DFO, /^SELECT/, /\$\{when/) }
        ],
        note: 'Filtering on the newest timestamp is a **watermark**. It misses a row that arrives late with an older timestamp. For late data, reprocess the last few days with a lookback, or merge by the key over a window.'
      }),

      B.rows({
        id: 'm10-df-compile', t: 1, src: 'rec', title: 'What the compiler made of it',
        steps: [
          {
            say: 'I ran the Dataform compiler on the project. It found **' + DC.tables + ' tables** (a view, an incremental table and a table), **' + DC.declarations + ' declaration**, and generated **' + DC.assertions + ' assertions** from the `config`. No error. And it worked out the **order** from the `ref`s: raw, then staging, then curated, then the daily table.',
            tabs: [{ layer: 'RECORDED', name: 'The actions and what each one depends on', c: 'raw', cols: DA.cols, rows: DA.rows, trk: 0 }],
            notes: ['Recorded with the Dataform compiler ' + G.meta('dataform-cli') + ', offline. A compile checks the structure and builds the SQL. It does not run anything in BigQuery.']
          },
          {
            say: 'The assertions got names that you will see in the console: **' + DC.assertion_names.join('** and **') + '**. The `uniqueKey` check is a query that returns the keys that appear more than once, and the row condition is a query that returns the rows that break the condition. Empty means pass, as in mission 6.',
            tabs: [{ layer: 'RECORDED', name: 'The assertions generated', c: 'raw', cols: ['assertion', 'comes from'], rows: [[DC.assertion_names[0], 'assertions.rowConditions or uniqueKey of the config'], [DC.assertion_names[1], 'assertions.uniqueKey of the config']], trk: 0 }],
            notes: ['Names can change between compiler versions. The idea does not: one generated query for each assertion.']
          }
        ]
      }),

      B.code({
        id: 'm10-df-incr', t: 2, src: 'rec', title: 'One file, two queries', file: 'orders_clean.sql', lang: 'sql', code: '-- the first run: take everything\n' + DI1 + '\n\n-- every later run: only what is new\n' + DI2,
        steps: [
          { say: 'The incremental file produces two queries. The compiler shows both. Press Next.', lines: null },
          { say: 'The **first run** has no filter: the table does not exist yet, so everything is taken. The `ref` became the full name of the staging view.', lines: [2, 3] },
          { say: 'Every **later run** has the filter on the newest `order_ts` of the table itself, written with the full name that `self()` expanded to. Dataform merges these rows by the key.', lines: [6, 8] }
        ],
        note: 'The two queries were read from the output of the compiler. The first one is what runs when the table is created, and the second when it exists.'
      }),

      B.code({
        id: 'm10-df-daily', t: 2, src: 'rec', title: 'A JavaScript include in a table', file: 'daily_sales.sqlx', lang: 'sql', code: DFD,
        steps: [
          { say: 'The daily table reads the curated orders and adds them up by Singapore day and by store. One detail is worth a screen: the list of statuses comes from a JavaScript file. Press Next.', lines: null },
          { say: 'A file in the `includes` folder is available in every SQLX file **under the name of the file**. `constants.js` exports `SALE_STATUSES`, and `${constants.SALE_STATUSES}` pastes it into the SQL. One place for the values that many files share.', lines: G.span(DFD, /WHERE order_ts/) },
          { say: 'The grouping uses the Singapore day: `DATE(order_ts, "Asia/Singapore")`. Note that this table is **partitioned by `sale_date`**, which is a plain date, so the day filter of mission 5 does not have the problem of the time zone here.', lines: G.span(DFD, /DATE\(order_ts/, /GROUP BY/) }
        ],
        note: 'I first wrote `require("includes/constants")` in a `js` block, and the compiler refused it: "Cannot find module". The include must sit in the `includes` folder at the root of the project, and be used by name. A real compile error, found by a real compile.'
      }),

      B.rows({
        id: 'm10-df-error', t: 1, src: 'rec', title: 'A typo in a ref, caught before anything runs',
        steps: [{
          say: 'I changed `ref("stg_orders")` to `ref("' + DE.typo.replace('ref("', '').replace('")', '') + '")` in one file and compiled again. The compiler found **' + DE.errors + ' kinds of message**, all pointing to the same file. No query was sent to BigQuery, and no table was touched.',
          tabs: [{ layer: 'RECORDED', name: 'The messages of the compiler', c: 'raw', cols: ['message'], rows: DE.messages.map(function (m) { return [m]; }), trk: 0 }],
          notes: ['This is why a Dataform compile belongs in CI. It runs in a second, needs no credentials, and catches a misspelt reference, a missing dependency and a bad config. Mission 14 puts it in the Cloud Build file.']
        }]
      }),

      B.talk({
        id: 'm10-test', t: 1, src: 'docs', title: 'What to test, and where',
        say: 'A pipeline has four kinds of failure, and each one has a cheap test. Press Next for each.',
        items: [
          ['The files parse', 'Load every DAG file and fail on an **import error**, as the recorded listing found `bigqeury`. In CI, with no cloud. Compile the Dataform project too.', 'Parse and compile in CI.'],
          ['The logic is right', 'Unit-test the Python in a task, and the SQL on a small table in a dev project or in DuckDB (mission 6). Render the templates for a date and read the SQL, as in the render screen.', 'Test the logic on small data.'],
          ['The run is safe to repeat', 'Run a task twice and compare the table. Run a DAG for a past date. A test that runs the load twice is the most valuable test of a pipeline.', 'Run it twice.'],
          ['The data is right', 'Assertions after each table, and checks that compare counts and sums with the source. They run in production, on every run, and they stop what comes next.', 'Check the data on every run.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A DAG can be run on a laptop.', t: 'Airflow has a `dag.test()` that runs a DAG in one process, with no scheduler: that is how the flaky DAG of this mission was run here. Use it for tests that need no cloud, and use a dev project for the rest.' }
      }),

      B.decide({
        id: 'm10-dec', t: 1, src: 'docs', title: 'Decision: how to schedule twelve daily SQL steps',
        scenario: 'Brewline has twelve SQL steps that build the curated layer each night, in a dependency order, after the loads. A teammate has already created twelve scheduled queries, spaced thirty minutes apart "so that each one is done before the next starts".',
        opts: [
          { t: 'Keep the twelve scheduled queries, with gaps between them', d: 'Nothing to install.', lose: 'The gaps are guesses. A slow day makes step 5 start before step 4 has finished, and nothing retries or alerts. The order lives in a spreadsheet.' },
          { t: 'A Dataform project for the SQL graph, started by a trigger (Workflows or Composer) after the loads, with assertions between steps', d: 'The order comes from the `ref`s, a step runs when its inputs are ready, and a failed assertion stops the steps below.', lose: '' },
          { t: 'A Composer DAG with twelve BigQuery tasks that you write by hand', d: 'Full control, with retries and alerts.', lose: 'It works, and you rebuild by hand what Dataform derives from the `ref`s. A change to one table means a change to the DAG as well.' }
        ],
        pick: 1,
        why: 'The dependencies are already in the SQL, as `ref`s. Let a tool read them. A trigger that waits for the loads is a few lines in Workflows or Composer. Assertions turn a bad table into a stopped pipeline.',
        when: 'If the twelve steps include Python, Spark or API calls, Composer should own the order, and may start Dataform for the SQL part.'
      }),

      B.bug({
        id: 'm10-bug', t: 1, q: 'The scheduler of an environment is slow, and every DAG starts late. One new file is blamed. Click the line that is the problem.',
        file: 'prices_daily.py', lang: 'python', code: BUGT, bad: [5],
        hint: 'When does this line run?',
        why: 'A call to a web service sits at the **top of the file**, so it runs every time the scheduler reads the file, which is again and again, for every parse and on every worker that loads it. In my run a call that took two seconds made that one file **' + AP.slower_by_seconds + ' seconds** slower to read. Move the call into a task, so that it runs once, when the task runs.',
        fix: FIXT,
        cheer: 'Do the work in a task, not at the top of the file.'
      }),

      B.bug({
        id: 'm10-bug2', t: 1, q: 'A retry of this task, the next morning, loads the wrong day. Click the line that makes it so.',
        file: 'load_day.py', lang: 'python', code: BUGD, bad: [3],
        hint: 'Which day does CURRENT_DATE() mean when the task is retried tomorrow?',
        why: '`CURRENT_DATE()` is the day on which the task runs, not the day it is for. A retry or a backfill runs on another day, and loads that day. Use the **template of the run** (`{{ ds }}`), and replace the day (delete then insert) so that a repeat gives the same table. The render screen showed `ds_nodash` becoming the date of the run.',
        fix: FIXD,
        cheer: 'The run decides the day.'
      }),

      B.incident({
        id: 'm10-inc', t: 1, src: 'rec', title: 'Incident: the 02:00 DAG did not run', time: '07:45',
        alert: '**The orders DAG did not run last night.** The dashboards have no data for yesterday. Nobody was paged. The DAG list shows `brewline_daily`, last run two days ago. A teammate merged a change to the DAGs folder at 17:30.',
        clues: ['The last run is from two days ago', 'A change to the DAG folder was merged yesterday', 'The Airflow UI has a banner about DAG import errors', 'Another file in the same folder has a typo in an import'],
        opts: [
          { t: 'Open the import errors list, find the file that fails to parse, fix it, and then check whether the DAG itself is paused or has a wrong start date and schedule', fb: '' },
          { t: 'Restart the scheduler', fb: 'The scheduler is fine. A file that does not parse stays broken after a restart.' },
          { t: 'Trigger the DAG by hand every night', fb: 'It works around the problem and leaves the cause, and a person must remember each night.' },
          { t: 'Delete the DAGs folder and copy it again', fb: 'The same broken file would be copied again.' }
        ],
        best: 0,
        why: 'A DAG that does not parse does not run, and Airflow lists the file as an import error, as the recorded run of `broken_import.py` did. When a DAG is missing or late, read the import errors first. Then check that it is not paused, and that the start date, time zone and schedule are right.',
        checks: [
          ['Read the import errors', 'The list names the file and the Python error, for example a misspelt module.'],
          ['Check the DAG itself', 'Is it paused? Is the start date in the future? Is the time zone what you think it is?'],
          ['Fix and rerun', 'Fix the typo, wait for a parse, and run the missed interval with a backfill or a manual run for that date.'],
          ['Prevent', 'Parse every DAG in CI, fail on import errors, and alert when a DAG has not run on time.']
        ],
        tell: 'A change merged in the evening had a typo in an import, so the file failed to parse and the DAG was silently missing from the scheduler. I fixed the typo, ran the missed day with a manual run for its date, and added a CI step that parses every DAG and fails on an import error, plus an alert on a DAG that has not succeeded on time.',
        prevent: ['Parse every DAG file in CI and fail on import errors', 'An alert on a DAG that did not run or did not finish on time', 'Idempotent tasks, so that the missed day is a routine rerun']
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'The run of 02:00 on 11 November, with a daily schedule, processes which day of data?',
        opts: [
          { t: '11 November', fb: 'The interval is not over until the run starts.' },
          { t: '10 November: the run starts when its data interval has ended', fb: '' },
          { t: 'Whatever day it is when the task starts', fb: 'That is the problem that templates avoid.' },
          { t: '12 November', fb: 'A run is never for a future interval.' }
        ],
        ok: 1,
        why: 'A run covers a data interval and starts when the interval ends. Use the template of the run, such as `{{ ds }}`, and the task is right whenever it runs.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'A task has `retries=2`. The source fails three times before it is ready. How does the task end?',
        opts: [
          { t: 'Success, on the fourth try', fb: 'Two retries mean three tries in all.' },
          { t: 'Failed after three tries, and the next tasks do not run', fb: '' },
          { t: 'Success, because Airflow keeps trying', fb: 'It stops when the retries are used.' },
          { t: 'Skipped', fb: 'A failed task is failed, not skipped.' }
        ],
        ok: 1,
        why: 'In the recorded run, a source that failed twice with two retries succeeded on the third try. One more failure would have used up the retries.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1,
        q: 'Why is a slow call at the top of a DAG file harmful?',
        opts: [
          { t: 'It runs only once, so it is harmless', fb: 'It runs at every parse.' },
          { t: 'The scheduler runs the file again and again, so the call repeats and slows everything', fb: '' },
          { t: 'It changes the schedule', fb: 'It does not.' },
          { t: 'It is not allowed by Airflow', fb: 'It is allowed, which is why it is a trap.' }
        ],
        ok: 1,
        why: 'In the recording a two-second call at the top made the file ' + AP.slower_by_seconds + ' seconds slower to parse. Put the work in a task.'
      }),

      B.quiz({
        id: 'm10-q4', t: 2,
        q: 'Which tool fits "three API calls in a row, once a day, with a retry, and no servers to keep"?',
        opts: [
          { t: 'Cloud Composer', fb: 'It has a fixed cost that is more than this job is worth.' },
          { t: 'Workflows, triggered by Cloud Scheduler', fb: '' },
          { t: 'A permanent Dataproc cluster', fb: 'Nothing here needs Spark.' },
          { t: 'A BigQuery scheduled query', fb: 'The steps are API calls, not SQL.' }
        ],
        ok: 1,
        why: 'Workflows chains API calls with conditions and retries, and costs nothing when it is idle. Composer is for a platform.'
      }),

      B.quiz({
        id: 'm10-q5', t: 2,
        q: 'A Dataform incremental table has a `uniqueKey`. What does Dataform do with the new rows?',
        opts: [
          { t: 'Appends them', fb: 'That would duplicate a changed order.' },
          { t: 'Merges them on the key: updates matching rows and inserts new ones', fb: '' },
          { t: 'Replaces the whole table', fb: 'That is a table, not an incremental one.' },
          { t: 'Deletes the old rows and does nothing else', fb: 'It does not.' }
        ],
        ok: 1,
        why: 'With a key, an incremental table is a merge. Without one it appends, which is only right for a source with no changes.'
      }),

      B.order({
        id: 'm10-ord', t: 1, q: 'Put a safe change to a pipeline in order.',
        items: [
          'Write the change in a branch, with the DAG and the SQL',
          'Parse every DAG and compile the Dataform project in CI',
          'Run the tests, including the one that runs a task twice',
          'Run it in a dev project for a past date',
          'Review the diff, and merge',
          'Copy the DAGs to the Composer bucket, and watch the first run'
        ],
        why: 'The cheapest checks come first: parse and compile need no cloud. The run for a past date tests the idempotence for real. Watching the first production run is the last safety net.'
      }),

      B.qa({
        id: 'qa-dag', t: 1, tag: 'Orchestration', secs: 90,
        q: 'How do you design an Airflow DAG that is safe to retry and to backfill?',
        pts: ['Tasks take the date from the run, never from the clock', 'Writes replace or merge, so a repeat is harmless', 'Retries for temporary failures, timeouts, alerts', 'Small DAG files with no top-level work', 'catchup off for new DAGs, backfill on purpose', 'Tests: parse, render, run twice'],
        short: 'Every task takes its date from the run, with a template such as `{{ ds }}`, and never from `now()`, so a retry or a backfill processes the day it is for. Every write replaces the partition of that day or merges by key, so that a repeat gives the same table. Tasks have retries for temporary failures, an execution timeout, and an alert when they finally fail.\n\nI keep the DAG file small and free of work at the top level, because the scheduler reads it again and again. I set `catchup=False` for a new DAG and backfill on purpose. And I test it: parse every DAG in CI, render the templates for a date to read the SQL, and run a task twice and compare the table. In my recording, a task that failed twice succeeded on its third try, and the rendered SQL named the staging table of the run\'s own day.',
        fu: [['What is a data interval?', 'The stretch of data that a run is for. The run starts when the interval has ended.'], ['How would you backfill a month?', 'Run the DAG for each past interval, with idempotent tasks, and a limit on how many run at once.']],
        trap: 'Using the current date in a task, or appending on every run.',
        real: 'Describe a DAG that you made safe to rerun, and how you proved it.'
      }),

      B.qa({
        id: 'qa-composer', t: 2, tag: 'Orchestration', secs: 90,
        q: 'Composer, Workflows or Dataform: how do you choose?',
        pts: ['Match the tool to the size of the problem', 'Dataform for a graph of SQL tables', 'Workflows for a short chain of API calls, no fixed cost', 'Composer for a platform: many DAGs, mixed tools, backfill', 'Composer has an always-on cost', 'Combine: a trigger starts Dataform after the loads'],
        short: 'I match the tool to the size of the problem. For a graph of SQL tables I use **Dataform**: it reads the `ref`s, so the order comes from the SQL, and assertions are part of the graph. For a short chain of API calls with conditions and retries I use **Workflows**, which has no servers and no cost when idle. For a platform with many DAGs, mixed tools such as Dataflow, Spark and BigQuery, sensors and backfills, I use **Cloud Composer**, and I accept its always-on cost.\n\nOften I combine them: Composer or Workflows starts the Dataform workflow after the loads have finished. A single table that does not depend on anything can be a scheduled query. What I avoid is twelve scheduled queries spaced by guesses.',
        fu: [['What is the cost floor of Composer?', 'The scheduler and the database run all day, whether or not any DAG runs, so it needs a platform to justify it.'], ['And dbt?', 'It plays the Dataform role with Jinja and YAML. Many teams accept either. I would pick the one the team already knows.']],
        trap: 'Saying Airflow for everything.',
        real: 'Tell me about a time you replaced a heavy orchestrator with a lighter one, or the reverse.'
      }),

      B.qa({
        id: 'qa-dataform', t: 2, tag: 'Orchestration', secs: 90,
        q: 'How does Dataform (or dbt) manage a graph of SQL transformations?',
        pts: ['SQLX files with ref and config', 'Dependencies from the refs, run in order', 'Table types: view, table, incremental, declaration', 'Assertions as tests in the graph', 'Git, release and workflow configurations', 'Compile in CI'],
        short: 'Each transformation is a file with a `config` block and SQL, and `ref()` points at another table. The tool reads the refs, builds the dependency graph and runs each table after its inputs. The `config` says what to build: a view, a table, an incremental table (merge by a key, with a filter on the new rows) or a declaration for a table that already exists, and sets the partition and cluster of the result.\n\nAssertions, such as unique key, not null and row conditions, run in the graph and stop what depends on a bad table. The project is in Git, a release configuration compiles it and a workflow configuration runs it on a schedule. And I compile it in CI: a real compile caught a misspelt `ref` in about a second, with no query sent. dbt is the same idea with Jinja.',
        fu: [['What is the risk of an incremental table?', 'A late row with an old timestamp is missed by a filter on the newest timestamp, so reprocess a lookback window or merge over it.'], ['Where do the values that many files share live?', 'In a JavaScript include, used by its file name.']],
        trap: 'Describing it as a scheduler. It orders SQL by its references, and something else triggers it.',
        real: 'Describe how you tested the SQL of a pipeline before it ran in production.'
      }),

      B.qa({
        id: 'qa-test-pipe', t: 1, tag: 'Orchestration', secs: 75,
        q: 'How do you test a data pipeline?',
        pts: ['Parse and compile in CI: import errors, refs', 'Unit tests for the logic on small data', 'Render templates, read the SQL', 'Run it twice, compare', 'Assertions and reconciliation in production', 'A dev project for a past date'],
        short: 'In four layers. First, **structure**: parse every DAG and compile the SQL project in CI, which finds import errors and misspelt references in seconds with no cloud. Second, **logic**: unit tests for the Python and tests of the SQL on a small table, and I render the templates for a date and read the SQL. Third, **repeatability**: I run a task twice and compare the table, and I run the DAG for a past date in a dev project. Fourth, **data**: assertions after each table and checks that compare counts and sums with the source, on every production run, stopping what comes next.\n\nIn my own run the parse step listed the typo in an import, and the test that ran the load twice failed on the buggy copy and passed on the right one.',
        fu: [['What do you do about tests that need the cloud?', 'A dev project, small data, and a service account with the same roles as production.'], ['How do you know the tests are good?', 'I break the code on purpose and check that a test fails, as I did with the copy of the function.']],
        trap: 'Saying that you test in production.',
        real: 'Tell me about a bug that your tests found, and one that they missed.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Orchestrator', color: '#A7F3D0',
        pts: [
          'A **DAG** is tasks and their order. A run covers a **data interval** and starts when it ends. The date comes from the **template**, never from the clock.',
          '**Retries** are for temporary failures: a task that failed twice succeeded on its **third try** with two retries. A task that fails more often fails the run.',
          'A DAG that does not parse does not run. Airflow listed the import error **bigqeury**. **Parse every file in CI.** No slow work at the top of a file.',
          '**Composer** is Airflow with an always-on cost. **Workflows** chains API calls cheaply. **Scheduler** triggers. **Dataform** runs a SQL graph.',
          '**Dataform**: `ref` gives the order, an **incremental** table with a `uniqueKey` merges, **assertions** are tests in the graph, and a **compile** in CI caught a typo in a `ref`.',
          'Test **structure, logic, repeatability and data**, and run every task **twice**.'
        ],
        lines: [
          'I take the date from the run, and I write with replace or merge.',
          'I parse every DAG and compile the SQL in CI.',
          'I choose the smallest tool that does the job.'
        ]
      })
    ]
  });
})();
