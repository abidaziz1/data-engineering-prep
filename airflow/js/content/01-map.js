/* Mission 1: the map. What Airflow is and is not, the parts of Airflow 3, and what changed from Airflow 2.
   The start-up lines, the jobs table and the health answer are recorded from Apache Airflow 3.4.0 on one machine. The tour of the parts and the comparisons are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SU = G.counts('af.stack_startup'), ST = G.counts('af.stack'), HE = G.counts('af.health');
  G.expect(ST.processes.length === 4 && ST.executor === 'LocalExecutor' && ST.database === 'SQLite', 'the recorded stack is four processes, LocalExecutor, SQLite');
  G.expect(HE.scheduler.status === 'healthy' && HE.metadatabase.status === 'healthy', 'the recorded health answer is healthy');

  function startLines() {
    var out = [];
    [['airflow api-server -H 127.0.0.1', 'api-server'], ['airflow scheduler', 'scheduler'], ['airflow dag-processor', 'dag-processor'], ['airflow triggerer', 'triggerer']].forEach(function (p) {
      out = out.concat(G.plain(SU[p[1]].join('\n'), { cmd: p[0], d: 90 }));
    });
    out = out.concat(G.plain(G.text('af.jobs_check'), { cmd: 'airflow jobs check --job-type SchedulerJob' }));
    return out;
  }

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map: what Airflow is, and what it is not', short: 'Map', blurb: 'The parts of Airflow 3, what each one does, and what to use instead', minutes: 38,
    focus: ['air'],
    goals: [
      'Say what Airflow does (orders, schedules, runs, retries and records work) and what it does not do (move big data, stream, store results).',
      'Name the **parts of Airflow 3**: DAG processor, scheduler and executor, workers, API server, triggerer and the metadata database.',
      'Follow a DAG from a file to a finished run, and say where your code runs at each step.',
      'Explain what changed from Airflow 2 to 3, and why tasks no longer open the database.',
      'Choose between Airflow, cron, dbt, Spark and a streaming system for a job.'
    ],
    say: 'Mission 1 is the map. Airflow is a few cooperating processes and a database. If you know which process does what, every later mission is easier, and so is every interview. Recorded screens come from Airflow 3.4.0 running on one machine. The tour of the parts and the comparisons come from the documentation.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, src: 'docs', title: 'What Airflow does, and what it does not',
        say: 'Press Next for each idea. The last one is the one that saves you from a bad design.',
        items: [
          ['A workflow in code', 'You write a **DAG** (a directed acyclic graph) in Python. Its nodes are **tasks** and its arrows say which task starts after which. The file lives in Git like any other code, so a change has a review and a history.', 'Pipelines as code.'],
          ['It decides when and in what order', 'The **scheduler** creates a **DAG run** when the schedule says so, or when something happens (an asset update, a click, an API call). It starts a task when everything before it has succeeded.', 'Time and order.'],
          ['It runs, retries and records', 'A task that fails can be retried after a delay. Every run and every attempt is stored with its state, its start and end time and its log.', 'Retries, history and logs.'],
          ['It gives you one place to look', 'The UI and the API show what ran, what failed, what waits and why. A team on call looks in one place, not in six crontabs.', 'A shared view of the pipeline.'],
          ['It does not do the heavy work', 'Airflow starts the work and waits for it. The transform runs in the warehouse, in Spark or in a container. If a task loads a 20 GB file into memory on a worker, that is a design mistake. Airflow is also not a streaming system, because it works in runs, and it is not a data store.', 'Airflow is the conductor. It is not the orchestra.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm1-flow', t: 1, src: 'docs', title: 'The parts of Airflow 3, and how a DAG file becomes a run', g: 'arch', legend: false,
        steps: [
          { say: 'Airflow is not one program. It is a few processes that share a metadata database. Press Next to follow one DAG from a file to a finished run, and to see where your code runs.', cap: 'Six parts and a database.' },
          { say: 'Step 1. Your DAG files sit in a **DAG bundle**: a folder, or a Git repository that Airflow keeps in sync. The **DAG processor** reads the files.', on: ['e1'], focus: ['bundle', 'proc'], cap: 'Files in, DAGs out.' },
          { say: 'Step 2. The DAG processor imports each file in its own process, finds the DAG objects, and stores a **serialized copy** of each DAG in the metadata database. **Your top-level code runs here, every time the file is parsed.** That is why heavy work at the top of a file is a mistake.', on: ['e2'], focus: ['proc', 'db'], cap: 'Parsing runs your top-level code.' },
          { say: 'Step 3. The **scheduler** reads the serialized DAGs. It creates DAG runs when a schedule says so, decides which task instances are ready, and writes their states to the database.', on: ['e3'], focus: ['sched', 'db'], cap: 'The scheduler never runs your task code.' },
          { say: 'Step 4. The **executor** is part of the scheduler. It starts ready tasks: the LocalExecutor as a process on the same machine, the CeleryExecutor by sending a message to a queue, the KubernetesExecutor as a pod.', on: ['e4'], focus: ['sched', 'work'], cap: 'The executor decides where a task runs.' },
          { say: 'Step 5. A **worker** runs your task code through the Task SDK. The task talks to the API server over HTTP: it reports its state and asks for connections, variables and XCom values. **It does not open the metadata database.**', on: ['e5'], focus: ['work', 'api'], tags: ['tg_nodb'], cap: 'New in Airflow 3.' },
          { say: 'Step 6. The **API server** is the only part that serves tasks from the database. It also serves the UI and the REST API.', on: ['e6'], focus: ['api', 'db'], cap: 'One door to the database for tasks.' },
          { say: 'Step 7. People and scripts use the UI and the REST API, and both go through the API server. The `airflow` command line is a separate tool that, on a machine with the configuration, reads and writes the database itself.', on: ['e7'], focus: ['user', 'api'], cap: 'The API server is the front door.' },
          { say: 'Step 8. Some waits go to the **triggerer**. A deferred task gives up its worker slot, and one async process waits for many events at once. Mission 7 shows it.', on: ['e8'], focus: ['trig', 'db'], cap: 'Waiting without holding a slot.' }
        ]
      }),

      B.term({
        id: 'm1-term', t: 1, src: 'rec', title: 'The four processes starting',
        say: 'These are the real first lines of the four processes of the recording, and the check that the scheduler is alive. I started them by hand on one machine, with a SQLite database and the LocalExecutor.',
        lines: startLines,
        after: 'The DAG processor says how it works: it processes files with up to 2 processes at a time, and it looks at each file at most once every 3 seconds. **I set the 3 seconds for the recording. The default checks for new files every ' + G.table('af.config').rows.filter(function (r) { return r[0] === 'dag_processor.refresh_interval'; })[0][1] + ' seconds and re-parses a file at most every ' + G.table('af.config').rows.filter(function (r) { return r[0] === 'dag_processor.min_file_process_interval'; })[0][1] + ' seconds.** So a new file can take minutes to appear in a default setup.',
        afterKind: 'tip',
        doneSay: 'Four processes, one database. In production the same four run on separate machines or pods, and the database is PostgreSQL or MySQL.'
      }),

      B.cmp({
        id: 'm1-cmp', t: 1, src: 'docs', title: 'Airflow and the tools around it',
        say: 'Newcomers use Airflow for the wrong job, or use another tool for the job Airflow was built for. Press Next to compare. Airflow orchestrates. The others do the work.',
        cols: ['Tool', 'What it is for', 'What it does not do'],
        hl: 1,
        rows: [
          ['cron', 'Start a command at a time on one machine.', 'Order tasks, retry, keep a history, or run on more than one machine.'],
          ['Airflow', 'Order, schedule, run, retry and record tasks that live in other systems.', 'Transform big data itself, serve low-latency streams, or store your data.'],
          ['dbt', 'Build SQL models in the warehouse in the right order and test them.', 'Wait for files, call APIs, or run work outside the warehouse.'],
          ['Spark', 'Process large data in parallel on a cluster.', 'Decide when a job runs or what runs after it.'],
          ['Kafka or Flink', 'Move and process events continuously, with low delay.', 'Run a job once a night with dependencies and a history of runs.'],
          ['A managed workflow service', 'Run Airflow for you: the processes, the database, the upgrades.', 'Fix a bad DAG. Your design problems come with you.']
        ],
        steps: [
          { upto: 2, say: 'Cron is where Brewline started. Airflow keeps what cron does, the time, and adds the order, the retries and the history.' },
          { upto: 4, say: 'dbt and Spark do work. Airflow often **calls** them: a task runs `dbt build`, or submits a Spark job and waits. That is the normal division.' },
          { upto: 6, say: 'Streaming systems run all the time. Airflow runs in runs. If a "pipeline" must react in seconds to every event, Airflow is the wrong tool. A managed service changes who runs the processes, not how you design the DAG.' }
        ]
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the life of a DAG file in order.',
        items: [
          'You save the DAG file in the DAG bundle',
          'The DAG processor imports the file and stores the serialized DAG in the metadata database',
          'The scheduler creates a DAG run because the schedule says so',
          'The scheduler marks the first tasks as scheduled and the executor starts them',
          'A worker runs the task code and reports its state to the API server',
          'The scheduler sees the success and schedules the next tasks'
        ],
        why: 'Files become DAGs in the database before anything runs. The scheduler works from the stored copy, so it never imports your file. The worker reports to the API server, and the scheduler reads the new state from the database.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'Which part of Airflow 3 imports your DAG files?',
        opts: [
          { t: 'The scheduler', fb: 'In Airflow 2 the scheduler did. In Airflow 3 the scheduler works from stored copies.' },
          { t: 'The DAG processor', fb: '' },
          { t: 'The API server', fb: 'The API server serves the UI, the REST API and the execution API. It does not parse files.' },
          { t: 'The worker', fb: 'A worker imports the file of the task it runs, to find that task. The DAG processor does the regular parsing of every file.' }
        ],
        ok: 1, why: 'The DAG processor reads files from the bundle, imports them and stores the serialized DAGs. A slow file delays new versions of that DAG. It does not slow the scheduler.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Where does the code of your Python task run?',
        opts: [
          { t: 'In the scheduler process', fb: 'The scheduler decides and records. It never runs task code.' },
          { t: 'On a worker, started by the executor', fb: '' },
          { t: 'In the metadata database', fb: 'The database stores state. It runs no Python.' },
          { t: 'In the web browser that shows the UI', fb: 'The UI only shows state.' }
        ],
        ok: 1, why: 'The executor starts a worker process, or sends the task to a worker on another machine or pod. The task code runs there, with the packages that are installed there.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Brewline wants a pipeline that reacts within two seconds to each click on the website. What fits?',
        opts: [
          { t: 'An Airflow DAG scheduled every second', fb: 'Airflow works in runs. A run has overhead, and a scheduler is not built for one run a second.' },
          { t: 'A streaming system, with Airflow starting or checking it if needed', fb: '' },
          { t: 'A cron line every minute', fb: 'That is one minute late, not two seconds.' },
          { t: 'An Airflow sensor that polls every second', fb: 'A sensor still sits inside a run. Polling a thousand times a minute is the wrong pattern for events.' }
        ],
        ok: 1, why: 'Continuous, low-latency work belongs to a streaming system such as Kafka with Flink or Spark Structured Streaming. Airflow can deploy, monitor or backfill around it.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2,
        q: 'In Airflow 3, how does a task get a connection or a variable?',
        opts: [
          { t: 'It opens a SQLAlchemy session on the metadata database', fb: 'That was possible in Airflow 2. Airflow 3 blocks it, and mission 9 shows the error.' },
          { t: 'It asks the API server through the Task SDK, which uses the execution API', fb: '' },
          { t: 'The scheduler copies the secret into the task process', fb: 'The scheduler never sees your task process.' },
          { t: 'It reads the airflow.cfg file of the scheduler', fb: 'Connections and variables live in the database or a secrets backend, not in airflow.cfg.' }
        ],
        ok: 1, why: 'Tasks talk to the API server over HTTP. This keeps database credentials away from the code that runs on workers, and it lets workers run in other networks and in other languages.'
      }),

      B.quiz({
        id: 'm1-q5', t: 2,
        q: 'A DAG file imports a library and calls a slow API at the top of the file. What does Airflow 3 slow down?',
        opts: [
          { t: 'Every task the scheduler starts, by the same time', fb: 'The scheduler does not run the file.' },
          { t: 'The DAG processor, so new versions of that DAG appear late, and each task that imports the file pays too', fb: '' },
          { t: 'Only the UI', fb: 'The UI reads stored data. The cost lands before that.' },
          { t: 'Nothing, because the DAG is already stored', fb: 'The file is parsed again and again, and your top-level code runs each time.' }
        ],
        ok: 1, why: 'The top level of a DAG file runs on every parse and when a task of that file starts. Mission 12 measures the parse time of a light file and of a file that sleeps for two seconds.'
      }),

      B.cmp({
        id: 'm1-v3', t: 2, src: 'docs', title: 'What changed from Airflow 2 to Airflow 3',
        say: 'Airflow 3.0 changed the architecture. Press Next to read the changes that matter for design and for interviews. They come from the Airflow 3.0 release notes and the documentation.',
        cols: ['Area', 'Airflow 2', 'Airflow 3'],
        hl: 2,
        rows: [
          ['How tasks reach Airflow', 'Tasks use the metadata database directly.', 'Tasks use the **Task SDK** and the **execution API** of the API server. No direct database access.'],
          ['Who parses files', 'The scheduler, in processes it starts.', 'A separate **DAG processor**.'],
          ['The UI and the API', 'A webserver for the UI and a REST API.', 'An **API server** for the UI, the REST API and the execution API.'],
          ['Imports for DAG authors', '`airflow.models`, `airflow.decorators` and more.', '`airflow.sdk` is the public interface. Many old paths still work in 3.4 and warn.'],
          ['Schedules', '`schedule_interval`, `timetable` and datasets.', 'One `schedule` argument. **Assets** replace datasets.'],
          ['Logical dates', 'Every run had one, including manual runs.', 'A run can have none. The default for a catchup is off.'],
          ['Backfills', 'A command that ran on your machine.', 'Created through the API and run by the scheduler.'],
          ['DAG versions', 'One current version.', 'Airflow stores each version of a DAG and ties each run to one.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are the architecture. Tasks no longer share the database. That is the biggest change, and the reason for most upgrade work.' },
          { upto: 6, say: 'Imports and schedules changed on the surface. Mission 11 runs the old imports in Airflow 3.4.0 and shows which still work and which fail.' },
          { upto: 8, say: 'Dates, backfills and versions changed behaviour. A manual run can have no logical date, and mission 3 records what a task sees then.' }
        ]
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: which jobs go into Airflow?',
        scenario: 'Brewline has three jobs. **A:** a nightly pipeline of eight steps with dependencies, a sensor on a partner file, and a quality gate before publishing. **B:** a script that purges temp files on one server every Sunday. **C:** a service that counts website clicks per minute for a live dashboard. Which job is the best fit for Airflow?',
        opts: [
          { t: 'Job A, the nightly pipeline', d: 'It has order, a wait, a gate and a need for retries and a history.' },
          { t: 'Job B, the Sunday purge', d: 'It is a job that must run on a schedule.', lose: 'It is one command on one machine with no dependencies. Cron does it with less to run, and an Airflow DAG adds a deployment to maintain for no benefit.' },
          { t: 'Job C, the click counter', d: 'It must run all the time, so it needs a strong scheduler.', lose: 'A live count is a streaming job. Airflow works in runs, so a minute-by-minute service is the wrong shape. Use a streaming engine and let Airflow watch it, if it needs watching at all.' }
        ],
        pick: 0,
        why: 'Airflow earns its place when there is order, waiting, retries or history across tasks. It is not needed for one command on one machine, and it is not built for continuous streaming.',
        when: 'Change the answer when the purge needs a record that auditors can read: then a one-task DAG with history can be justified.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'docs', title: 'Incident: the UI works, but nothing has run since 02:00', time: '07:40',
        alert: '**No DAG run has been created since 02:00. The UI loads and shows the DAGs. Tasks that were running at 02:00 have finished or failed.** The health page shows the scheduler as unhealthy.',
        clues: ['The API server answers every request', 'The last scheduler heartbeat is older than the threshold', 'The metadata database accepts connections'],
        opts: [
          { t: 'Restart the scheduler, read its log for the reason it stopped, and check that the executor started', fb: '' },
          { t: 'Restart the API server', fb: 'The UI already works. The API server does not create runs.' },
          { t: 'Restart the DAG processor', fb: 'It parses files. It does not create runs. New DAG versions would be late, but runs would still be created.' },
          { t: 'Clear all task instances of last night', fb: 'That repeats work without fixing what stopped the work. It can also load data twice.' }
        ],
        best: 0,
        why: 'The scheduler creates runs and starts tasks. Without a heartbeat it does neither, and the other parts can look fine. The log of the scheduler says why it stopped: a database error, a crash, or a full disk.',
        checks: [
          ['Health', 'The health endpoint or `airflow jobs check --job-type SchedulerJob` tells you whether a scheduler job is alive. The recording printed "' + G.text('af.jobs_check') + '" for a healthy one.'],
          ['Scheduler log', 'The last lines before it stopped. A lost database connection and an out-of-memory kill look different.'],
          ['Catch up', 'After the restart, the scheduler creates the runs that it missed only for DAGs with catchup on. Look at the runs of last night and trigger the missing ones on purpose.']
        ],
        tell: 'The scheduler stopped at 02:00 and I restarted it. I found the reason in its log, then listed the DAGs that missed a run and triggered them with their logical dates so that no day is loaded twice.',
        prevent: 'Run two schedulers where your setup allows it, alert on the scheduler heartbeat, and keep the metadata database healthy.'
      }),

      B.talk({
        id: 'm1-ext', t: 3, src: 'docs', title: 'Extra: DAGs in other languages (Airflow 3.4, experimental)',
        say: 'Press Next. This is the newest part of the architecture. The release notes of Airflow 3.4.0 call it experimental.',
        items: [
          ['A DAG that is not Python', 'Airflow 3.4.0 can read a complete DAG, with schedule, tasks and dependencies, written in **TypeScript, Go or Java**, or in a native **YAML** format. A `.yaml` file carries a `$schema` marker and is validated against a schema.', 'Python is no longer the only way to author a DAG.'],
          ['How it works', 'A pluggable **DAG importer** in the Task SDK tells the DAG processor how to recognise each format. The processor runs the matching language runtime, and the DAGs appear in Airflow like Python DAGs.', 'The DAG processor learned new file types.'],
          ['What to do with it today', 'The importer framework and the language SDKs are experimental in 3.4, and their APIs may change. Read the feature, and keep production DAGs in Python until your team has a reason and a plan to test the experimental part.', 'Know it exists. Do not bet on it yet.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-what', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is Apache Airflow, and what is it not good for?',
        pts: ['Workflows as Python code: DAGs of tasks', 'Scheduling, ordering, retries, history and a UI', 'It orchestrates other systems and does not do the heavy work itself', 'Not for low-latency streaming, and not a data store'],
        short: 'Airflow is a workflow orchestrator. You write a pipeline as a DAG in Python: tasks, and the order between them. Airflow decides when a run starts, starts each task when its parents have succeeded, retries failures and keeps a history of every run and attempt, with a UI and an API on top.\n\nThe key point is that Airflow orchestrates. The work happens in other systems: the warehouse runs SQL, Spark processes big data, a container runs a script. A task should start that work and wait for it.\n\nIt is a poor fit for continuous, low-latency streaming, because it works in runs. And it does not store your data. If someone loads a large file into a worker and processes it there, the pipeline will be slow and fragile, and the fix is to push that work to a system built for it.',
        fu: [['Why not just cron?', 'Cron starts commands at times. It does not know about dependencies, it does not retry, and it keeps no history.'], ['Can Airflow run a job every second?', 'It can be configured to, but it is not built for it. Use a streaming system.']],
        trap: 'Saying that Airflow is an ETL tool that processes data. It starts and orders the processing. It does not do it.',
        real: 'Describe a task of yours that does heavy work on a worker, and where you would move that work.'
      }),

      B.qa({
        id: 'qa-arch', t: 1, tag: 'Airflow', secs: 90,
        q: 'Walk me through the architecture of Airflow 3. What runs where?',
        pts: ['DAG bundle, DAG processor, metadata database', 'Scheduler with the executor inside it', 'Workers run task code through the Task SDK', 'API server for UI, REST and the execution API', 'Triggerer for deferred waits'],
        short: 'Your DAG files sit in a DAG bundle, a folder or a Git repository. The DAG processor imports them and stores serialized DAGs in the metadata database. The scheduler reads those, creates DAG runs on schedule, decides which tasks are ready and hands them to its executor.\n\nThe executor starts the task: locally, through a Celery queue or as a Kubernetes pod. A worker runs the task code through the Task SDK and talks to the API server over HTTP to report its state and to get connections, variables and XCom values. In Airflow 3 the task does not open the metadata database.\n\nThe API server also serves the UI and the REST API. The triggerer is a separate process for deferred tasks: it waits for many events with async code, so a waiting task holds no worker slot.',
        fu: [['Why did Airflow 3 move parsing to its own process?', 'The scheduler no longer imports user code. A slow or broken file cannot stall the scheduling loop.'], ['What does the scheduler do not do?', 'It does not run task code and it does not parse files.']],
        trap: 'Saying that the scheduler runs the tasks. It decides and records. The executor and the workers run them.',
        real: 'Name the executor and the database that your team runs, and the part of Airflow that you have had to restart.'
      }),

      B.qa({
        id: 'qa-v3', t: 2, tag: 'Airflow 3', secs: 90,
        q: 'What changed between Airflow 2 and Airflow 3, and what does it mean for DAG authors?',
        pts: ['Task SDK and execution API: no direct database access for tasks', 'Separate DAG processor and an API server', '`airflow.sdk` imports, one `schedule` argument, assets', 'No required logical date, catchup off by default, DAG versioning'],
        short: 'The big change is the architecture. Tasks use the Task SDK and talk to an API server through the execution API, so they no longer open the metadata database. A separate DAG processor parses files, and an API server replaces the webserver.\n\nFor DAG authors this has three effects. First, imports move to `airflow.sdk`. The old paths still work for now and warn. Second, code that used a database session in a task breaks, and you replace it with the SDK calls or with your own storage. Third, some defaults changed: `schedule` is the one argument for time and assets, catchup is off by default, and a manual run can have no logical date.\n\nI also mention DAG versioning: Airflow stores each version of a DAG and ties each run to one, so you can see which version produced a run.',
        fu: [['What breaks first in an upgrade?', 'Direct database access in tasks and removed imports. Run ruff with the AIR rules to find them.'], ['Why is catchup off by default now?', 'A new DAG with an old start date no longer floods the scheduler with runs.']],
        trap: 'Listing only the new UI. The UI is the smallest part of the change.',
        real: 'Say which Airflow version your team runs, and what would break first in an upgrade to 3.'
      }),

      B.qa({
        id: 'qa-when', t: 2, tag: 'Design', secs: 75,
        q: 'When would you not use Airflow?',
        pts: ['One command on one machine, no dependencies', 'Continuous or low-latency streaming', 'Work that needs sub-second response', 'A team that cannot operate or buy it'],
        short: 'I would not use it for a single command on one machine with no dependencies. Cron does that with nothing to operate, and Airflow adds a deployment for no gain.\n\nI would not use it for streaming or anything that must react in seconds to each event. Airflow works in runs, and the overhead of a run is wrong for that. A streaming engine fits, and Airflow can still deploy or monitor it.\n\nI would also think twice if the team cannot run it. Airflow has several processes and a database to keep healthy. A managed service removes part of that work, and a workflow feature inside the warehouse or the cloud may be enough for a small pipeline.\n\nThe test is whether there is order, waiting, retries or history across tasks. If there is, Airflow earns its place.',
        fu: [['What if the pipeline is only three SQL statements?', 'A scheduled query or a dbt job can do it. Add Airflow when the dependencies on other systems start to grow.']],
        trap: 'Saying Airflow is always the right orchestrator. Operating it is a cost.',
        real: 'Name one job at your company that does not need Airflow, and say what you would use for it.'
      }),

      B.qa({
        id: 'qa-ext', t: 3, tag: 'Airflow 3.4', secs: 60,
        q: 'Airflow 3.4 can read DAGs that are not written in Python. What is that, and would you use it?',
        pts: ['A pluggable DAG importer in the Task SDK', 'TypeScript, Go and Java SDKs and a YAML DAG format', 'Experimental in 3.4', 'Keep production DAGs in Python until there is a reason'],
        short: 'In 3.4.0 the Task SDK has a pluggable DAG importer. Each format registers an importer, the DAG processor runs the matching language runtime, and the DAGs show up in Airflow like Python DAGs. The formats are TypeScript, Go and Java SDKs and a native YAML format that is validated against a schema.\n\nThe release notes call the importer framework and the language SDKs experimental, and their APIs may change. So I would read about it and try it on a non-critical DAG, and I would keep production DAGs in Python until a team has a real reason, for example engineers who write Go, and a plan to test and upgrade the experimental part.',
        fu: [['Why would a team want it?', 'Task code in the language the team already uses, and DAGs for teams that do not write Python.']],
        trap: 'Presenting it as stable. The release notes say experimental.',
        real: 'Say whether your team would write a DAG in another language, and why or why not.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Map Reader', color: '#A5F3FC',
        pts: [
          'Airflow **orders, schedules, runs, retries and records** tasks. The heavy work happens in other systems.',
          'The **DAG processor** parses files. The **scheduler** creates runs and decides. The **executor** starts tasks. **Workers** run your code. The **API server** serves the UI, the REST API and the tasks. The **triggerer** waits for deferred tasks.',
          'In Airflow 3 a task talks to the **API server**. It does not open the metadata database.',
          'The **top level of a DAG file runs on every parse.** Keep it cheap.',
          'Choose Airflow when there is **order, waiting, retries or history** across tasks. Use cron for one command and a streaming engine for events.'
        ],
        lines: [
          'I can say where my code runs.',
          'I can explain what changed in Airflow 3.',
          'I know when not to use Airflow.'
        ]
      })
    ]
  });
})();
