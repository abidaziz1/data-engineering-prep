/* Mission 4: Data Factory. Pipelines, activities, linked services, datasets, integration runtimes, the copy activity, expressions and
   metadata-driven pipelines. The pipeline files were checked with a checker built on the classes of the Azure SDK for Python (azure-mgmt-datafactory),
   which carry the shape of the Data Factory API. That checker is not Data Factory, and nothing here ran in a factory. The expression lab is a model
   written from the documented functions. Everything about how the service behaves comes from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CK = G.counts('adf.check'), F = G.file('adf/pl_orders_daily.json');
  G.expect(CK.files['pl_orders_daily.json'].valid === true && Object.keys(CK.files).length === 5, 'the good pipeline passes and five files were checked');
  G.expect(CK.files['pl_missing_sink.json'].findings[0].code === 'MISSING_PROPERTY' && CK.files['pl_unknown_activity.json'].findings[0].code === 'UNKNOWN_ACTIVITY_TYPE', 'the missing sink and the unknown activity are found');
  G.expect(CK.files['pl_dependency_typo.json'].findings.map(function (f) { return f.code; }).join() === 'UNKNOWN_DEPENDENCY,INVALID_CONDITION' && CK.files['pl_expression_brace.json'].findings[0].code === 'EXPRESSION_SYNTAX', 'the dependency and expression findings');
  G.expect(CK.dependency_conditions.join() === 'Completed,Failed,Skipped,Succeeded' && CK.activity_types >= 30, 'the dependency conditions and the activity types of the SDK');

  function checkLines() {
    var out = [{ c: 'cmd', t: '$ python3 azure/verify/adf_check.py azure/verify/adfproj/*.json', d: 350 }];
    Object.keys(CK.files).sort().forEach(function (f) {
      var r = CK.files[f];
      out.push({ c: r.valid ? 'ok' : 'err', t: f + '   ' + (r.valid ? 'valid' : 'INVALID'), d: 260 });
      r.findings.forEach(function (x) { out.push({ c: 'warn', t: '    ' + x.code + '   ' + x.where + ': ' + x.message, d: 140 }); });
    });
    return out;
  }

  var CONFIG = [
    'CREATE TABLE etl.config (',
    '    source_schema  varchar(50)  NOT NULL,',
    '    source_table   varchar(100) NOT NULL,',
    '    sink_directory varchar(200) NOT NULL,',
    '    load_type      varchar(20)  NOT NULL,',
    '    watermark_col  varchar(100) NULL,',
    '    enabled        bit          NOT NULL DEFAULT 1',
    ');',
    '',
    'INSERT INTO etl.config VALUES',
    "    ('dbo', 'orders',    'raw/orders',    'incremental', 'modified_at', 1),",
    "    ('dbo', 'customers', 'raw/customers', 'incremental', 'modified_at', 1),",
    "    ('dbo', 'stores',    'raw/stores',    'full',        NULL,          1);",
    '',
    'SELECT source_schema, source_table, sink_directory, load_type, watermark_col',
    'FROM etl.config',
    'WHERE enabled = 1;'
  ].join('\n');

  var QUOTE_BUG = [
    '"source": {',
    '  "type": "AzureSqlSource",',
    '  "sqlReaderQuery": {',
    '    "value": "SELECT * FROM dbo.orders WHERE modified_at > @{activity(\'GetWatermark\').output.firstRow.last_value}",',
    '    "type": "Expression"',
    '  }',
    '}'
  ].join('\n');
  var QUOTE_FIX = QUOTE_BUG.replace("> @{activity('GetWatermark').output.firstRow.last_value}", "> '@{activity('GetWatermark').output.firstRow.last_value}'");
  var DEP_BUG = [
    '{',
    '  "name": "AdvanceWatermark",',
    '  "type": "SqlServerStoredProcedure",',
    '  "dependsOn": [',
    '    { "activity": "CopyOrders", "dependencyConditions": [ "Success" ] }',
    '  ],',
    '  "typeProperties": { "storedProcedureName": "etl.set_watermark" }',
    '}'
  ].join('\n');
  var DEP_FIX = DEP_BUG.replace('"Success"', '"Succeeded"');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Data Factory: pipelines and the copy activity', short: 'Data Factory', blurb: 'Pipelines, linked services, runtimes, the copy activity, expressions and metadata-driven design', minutes: 45,
    focus: ['air', 'src'],
    goals: [
      'Name the parts of a factory: **pipeline, activity, linked service, dataset, integration runtime and trigger**.',
      'Read a **pipeline definition** line by line, and say what each part does.',
      'Choose the right **integration runtime** for a source in the cloud, in a private network, or on premises.',
      'Tune a **copy activity**: DIUs, parallel copies, staging and fault tolerance.',
      'Write **dynamic content** with parameters, system variables and functions, and avoid the quoting and month mistakes.',
      'Design one **metadata-driven pipeline** instead of a hundred copies.'
    ],
    say: 'Mission 4 is Data Factory, the service that moves and orders the data of most Azure platforms. A pipeline is JSON that you build in a visual editor. I checked the pipeline files of this course with a checker built on the real classes of the Azure SDK, so the errors you see are real findings, but Data Factory itself never ran. How the service behaves comes from documentation, and the screens say so.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, src: 'docs', title: 'The parts of a factory',
        say: 'Data Factory has a small vocabulary, and every screen of the studio uses it. Press Next for the seven words.',
        items: [
          ['Factory', 'The Azure resource that holds everything: pipelines, datasets, linked services, triggers and runtimes. It has its own managed identity, and one factory can run many pipelines at once.', 'The container of everything else.'],
          ['Pipeline', 'A group of activities that run together, as one unit that you start, monitor and rerun. A pipeline is a definition. Each time it runs, that is a pipeline run with its own id.', 'A definition, and many runs of it.'],
          ['Activity', 'One step in a pipeline: copy data, look up a value, run a stored procedure, loop over a list, call a notebook. Activities have inputs, outputs, a retry policy, and dependencies on other activities.', 'One step.'],
          ['Linked service', 'The connection to a store or a compute service: the server name, and how to sign in. Prefer a managed identity here, so there is no secret to keep. It says where, and not what.', 'The connection.'],
          ['Dataset', 'A named view of data inside a linked service: a table, a folder and file format, a path with parameters. A copy activity reads one dataset and writes another.', 'The shape of the data.'],
          ['Integration runtime', 'The compute that executes an activity: it copies the data, runs a data flow, or reaches a private network. Mission 4 compares the kinds on a later screen.', 'The engine that does the work.'],
          ['Trigger', 'What starts a pipeline: a schedule, a tumbling window, a storage event or a custom event. A trigger is separate from the pipeline, so one pipeline can have many triggers. Mission 5 covers them.', 'What starts a run.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'One run of a copy pipeline', g: 'adf', legend: true,
        steps: [
          { say: 'A pipeline that copies the changed orders into the lake. Press Next to follow one run. The numbers match the steps.', cap: 'A trigger, a pipeline, a runtime and two stores.' },
          { say: 'Step 1. A trigger fires and starts a pipeline run. Step 2. The first activity, a lookup, reads the old watermark. The activities run in the order of their dependencies.', on: ['d1', 'd2'], focus: ['tr', 'a1', 'a2'], cap: 'The trigger starts the run.' },
          { say: 'Step 3. The copy activity hands the work to an integration runtime. The runtime is the compute that moves the bytes. The activity itself only describes what to move.', on: ['d3'], focus: ['a2', 'ir'], cap: 'The activity describes. The runtime does.' },
          { say: 'Step 4. The runtime reads from the source through the source linked service. Step 5. It writes Parquet files into the raw zone through the sink linked service. Both connections sign in with a managed identity.', on: ['d4', 'd5'], focus: ['sr', 'ir', 'dk'], cap: 'Read through one linked service, write through another.' },
          { say: 'Step 6. When the copy succeeds, the next activity moves the watermark. Step 7. Every run and every activity is logged in Monitor, with its inputs, outputs and errors.', on: ['d6', 'd7'], focus: ['a2', 'a3', 'mn'], cap: 'Every run leaves a record.' }
        ]
      }),

      B.code({
        id: 'm4-json', t: 1, src: 'rec', title: 'A pipeline, as the factory stores it', file: 'pl_orders_daily.json', lang: 'json', code: F,
        steps: [
          { say: 'This is the JSON of the pipeline from the picture. The studio draws it, and Git stores it. The checker found nothing wrong with it. Walk through it once, and you can read any pipeline.', lines: null },
          { say: 'A parameter has a type and a default. A run can pass another value. Everything that changes between runs, such as the date, should be a parameter and not text inside an activity.', lines: G.span(F, /"parameters"/, /"run_date"/) },
          { say: 'The first activity is a lookup that reads one row. `firstRowOnly` true gives one object, and the later activities read `output.firstRow.last_value`. The policy sets a timeout of 10 minutes and one retry, 30 seconds later.', lines: G.span(F, /"name": "GetWatermark"/, /"retryIntervalInSeconds": 30/) },
          { say: 'The copy activity waits for the lookup with `dependsOn` and the condition `Succeeded`. Without a dependency, activities start at the same time.', lines: G.span(F, /"name": "CopyOrders"/, /"dependsOn"/) },
          { say: 'The query is an expression, because its value has `"type": "Expression"`. The parts in `@{...}` are filled in at run time with the watermark and the trigger time. The quotes around them are part of the SQL.', lines: G.span(F, /"sqlReaderQuery": \{/, /"type": "Expression"/) },
          { say: 'The sink writes Parquet through the Data Lake write settings. Four data integration units is a fixed choice here. The copy retries twice, a minute apart, and gives up after an hour.', lines: G.span(F, /"sink": \{/, /"retryIntervalInSeconds": 60/) },
          { say: 'The last activity runs a stored procedure that moves the watermark, and it depends on the copy. A failed copy means the watermark stays where it was, and tomorrow\'s run repeats the work.', lines: G.span(F, /"name": "AdvanceWatermark"/, /"linkedServiceName"/) }
        ],
        note: 'The file is `azure/verify/adfproj/pl_orders_daily.json`. The checker passes it, which says that every activity type, source type and sink type exists in the API and that the dependencies are sound. It does not say that the query works or that the linked services exist.'
      }),

      B.term({
        id: 'm4-check', t: 1, src: 'rec', title: 'Check a pipeline file before you publish it',
        say: 'Here is the checker running on the good pipeline and on four copies that I broke on purpose: a missing sink, an activity type that does not exist, a dependency with a typo, and an expression with a missing brace. Watch what each mistake looks like.',
        lines: function () { return checkLines(); },
        after: 'The checker reads the classes of the Azure SDK for Python, which carry the shape of the Data Factory API: **' + CK.activity_types + ' activity types**, **' + CK.source_types + ' copy sources** and **' + CK.sink_types + ' copy sinks**, and which properties each one needs. It adds three rules that the factory applies when you publish: names are unique, a dependency names an activity that exists, and the dependencies have no loop. This is a model of the service, not the service. A pipeline that passes can still fail at run time.',
        afterKind: 'tip',
        doneSay: 'Run a check like this in the pull request. The studio finds the same mistakes only when someone clicks Publish.'
      }),

      B.talk({
        id: 'm4-copy', t: 1, src: 'docs', title: 'The copy activity',
        say: 'The copy activity is the workhorse of Data Factory. Press Next for the settings that decide its speed and its safety.',
        items: [
          ['Data integration units', 'A DIU is a measure of the power of the copy: a mix of CPU, memory and network. The allowed range is 2 to 256. Leave it on Auto and the service picks a value from the source, the sink and the data. Raising it helps only when the DIUs are the bottleneck, and it raises the bill in proportion.', 'Start with Auto.'],
          ['Parallel copies', 'A copy can read in parallel: for a database, by splitting the table into ranges (a physical or a dynamic range partition); for files, one thread per file. Parallel reads are the lever when a single source query is the bottleneck.', 'Split the source.'],
          ['Staging', 'Some paths go through a staging store in Blob or ADLS, for example loading Synapse with the COPY command. The data is written once to staging and loaded from there. It is faster for large loads and it costs storage operations.', 'A stop on the way.'],
          ['Sink behavior', 'A copy into files can merge files, flatten the hierarchy, or preserve it. A copy into a table can insert, upsert on keys, or call a stored procedure. A plain insert is not safe to repeat. Mission 5 makes it safe.', 'Insert is not idempotent.'],
          ['Fault tolerance and checks', 'A copy can skip rows that do not fit the sink and log them, and it can verify that the data arrived intact. Turn on the logging when you skip rows, or you lose data silently.', 'Skip with a log, not in silence.'],
          ['Read the monitor', 'The details of a finished copy show the duration split into queue, transfer and other stages, the DIUs used, the throughput, and the parallel copies. Start there before you change anything.', 'Measure first.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm4-ir', t: 1, src: 'docs', title: 'Integration runtimes: where the copy runs',
        say: 'A runtime is the compute of an activity, and where it runs decides what it can reach. Press Next to compare the four kinds.',
        cols: ['Runtime', 'Where it runs', 'Reach it for', 'The catch'],
        hl: 1,
        rows: [
          ['Azure integration runtime', 'Microsoft-managed, in a region that the service picks or you choose', 'cloud stores that have public endpoints, copies between Azure services, data flows', 'It reaches only public endpoints, unless the store allows it by firewall rule.'],
          ['Azure runtime in a managed virtual network', 'Microsoft-managed, inside a managed network of the factory', 'stores that allow only private connections, through managed private endpoints', 'Each private endpoint must be approved by the owner of the target, and the runtime starts a little slower.'],
          ['Self-hosted integration runtime', 'Software on a machine that you run: a virtual machine or a server on premises', 'a database that is behind a firewall, on premises or in your own virtual network', 'You patch and size the machine. Add nodes for availability.'],
          ['Azure-SSIS integration runtime', 'A managed cluster that runs SSIS packages', 'moving existing SQL Server Integration Services packages without rewriting them', 'You pay while it runs, and the packages stay the old way.']
        ],
        steps: [
          { upto: 2, say: 'Azure runtimes. The plain one reaches public endpoints. The managed network one reaches private ones, and the owner of the target must approve the link.' },
          { upto: 4, say: 'A self-hosted runtime is the answer for a private database that Microsoft cannot reach. SSIS is for lifting old packages, not for new work.' }
        ],
        pick: 'Start with the **Azure runtime**, move to the **managed virtual network** runtime when the stores must be private, and use a **self-hosted runtime** only for sources that Microsoft cannot reach.'
      }),

      B.widget({ id: 'm4-expr-lab', kind: 'adfexpr', t: 1, src: 'docs', title: 'Lab: dynamic content' }),

      B.talk({
        id: 'm4-params', t: 1, src: 'docs', title: 'Parameters, variables and system values',
        say: 'Four places hold a value in a pipeline, and each one has a job. Press Next for each.',
        items: [
          ['Pipeline parameters', 'A parameter is passed in when the run starts and cannot change during it. Use them for what differs between runs: the date, the table, the environment. A trigger can fill them from its own time.', 'Fixed for one run.'],
          ['Variables', 'A variable is set during the run with a Set Variable activity. It is a string, a boolean or an array. Be careful in a loop that runs in parallel: all iterations share one variable.', 'Changed by the run, and shared.'],
          ['System variables', 'Values that the service fills in: `@pipeline().RunId`, `@pipeline().TriggerTime`, `@pipeline().Pipeline` and `@pipeline().DataFactory`. They are what you write into audit tables.', 'Facts about this run.'],
          ['Global parameters', 'A global parameter belongs to the factory and is the same in every pipeline. It is the place for values that change by environment, such as the lake URL. A release can override them for production.', 'One value for the whole factory.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm4-activities', t: 1, src: 'docs', title: 'The activity for each job',
        say: 'A factory has dozens of activity types, and a pipeline needs only a handful. Press Next to read the common ones in three groups.',
        cols: ['Job', 'Activity', 'Use it when', 'Watch for'],
        hl: 1,
        rows: [
          ['Move data', 'Copy', 'Source to sink, with no transformation to speak of.', 'DIUs, parallelism, and a sink that is safe to repeat.'],
          ['Read a value', 'Lookup', 'A watermark, a list of tables, a small configuration.', 'It returns a limited number of rows and a limited size.'],
          ['Read facts about files', 'Get Metadata', 'Does a file exist, how big is it, which files are in a folder.', 'Child items come back as a list that a loop can use.'],
          ['Repeat', 'ForEach', 'Run the same steps for each table or file.', 'A batch count sets how many run at once, and it has an upper limit.'],
          ['Branch', 'If Condition, Switch', 'Full load or incremental, depending on a value.', 'Nested activities have their own limits.'],
          ['Wait for a condition', 'Until, Validation, Wait', 'A file must arrive, or a job must finish.', 'A loop with no exit costs money.'],
          ['Run SQL', 'Script, Stored procedure', 'Merge, move a watermark, call a procedure.', 'The identity needs rights on the database.'],
          ['Call code', 'Notebook, Databricks, Function, Web', 'Heavy transformation or an outside service.', 'You pay for that service as well.'],
          ['Transform visually', 'Data flow', 'Joins and clean-up without writing Spark.', 'A cluster starts and bills by vCore-hour.'],
          ['Chain pipelines', 'Execute Pipeline', 'Reuse a pipeline, or split a big one.', 'A parent can wait for the child or not.'],
          ['Stop on purpose', 'Fail', 'A check found bad data and the run must stop.', 'Give an error message that a person can act on.']
        ],
        steps: [
          { upto: 4, say: 'Move and look. Copy, lookup and metadata are the first three you use. ForEach turns one pipeline into a loop over a list.' },
          { upto: 7, say: 'Control and SQL. Branching, waiting and calling the database.' },
          { upto: 11, say: 'Code, data flows, other pipelines, and a way to fail with a message.' }
        ],
        pick: 'Keep a pipeline to **Copy, Lookup, ForEach, a script or stored procedure, and Fail**. Add a data flow or a notebook only when the transformation needs it.'
      }),

      B.talk({
        id: 'm4-dataflow', t: 2, src: 'docs', title: 'Mapping data flows',
        say: 'A data flow is a visual transformation that runs on Spark, and Data Factory manages the cluster for you. Press Next for what to know.',
        items: [
          ['What it is', 'You draw sources, joins, aggregates and sinks. The service turns the drawing into Spark code and runs it on a cluster that it starts for the run. You write no Spark.', 'Spark without writing Spark.'],
          ['What it costs', 'A data flow bills by vCore-hours while the cluster runs, and a cluster has a minimum size of 8 vCores. A debug session keeps a cluster alive and bills as well. A time-to-live setting lets a later flow reuse a warm cluster, at the cost of keeping it on.', 'Pay while the cluster is up.'],
          ['When to choose it', 'For joins, clean-up and shaping when the team prefers a visual tool and the data is moderate. For heavy or complex work, Databricks or Synapse Spark in code is easier to test and review.', 'Visual, for moderate jobs.'],
          ['What to watch', 'Cluster start can take minutes, which hurts short jobs. Large flows are hard to review as a picture. Put the logic that matters under version control and test it with small data.', 'Startup time and reviewability.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm4-meta', t: 1, src: 'docs', title: 'One pipeline for many tables', g: 'adfdag', legend: false,
        steps: [
          { say: 'A hundred tables should not mean a hundred pipelines. One pipeline reads a list of tables and loops over it. Press Next to watch a run. The boxes change color as the activities finish.', cap: 'A metadata-driven pipeline.', status: { lk: 'wait', fe: 'wait', cp: 'wait', wm: 'wait', nt: 'wait', fl: 'wait' } },
          { say: 'The first activity reads the configuration table: which tables are enabled, where each one goes, and how to load it.', on: [], status: { lk: 'run', fe: 'wait', cp: 'wait', wm: 'wait', nt: 'wait', fl: 'wait' }, cap: 'Read the list.' },
          { say: 'The list goes to a ForEach. It starts one iteration for each table, a few at a time. A batch count sets how many run in parallel, and the upper limit is 50.', on: ['f1'], status: { lk: 'ok', fe: 'run', cp: 'wait', wm: 'wait', nt: 'wait', fl: 'wait' }, cap: 'One iteration for each table.' },
          { say: 'Inside each iteration a copy moves one table. The source, the sink and the load type come from the row of the configuration table, through parameters on the datasets.', on: ['f2'], status: { lk: 'ok', fe: 'run', cp: 'run', wm: 'wait', nt: 'wait', fl: 'wait' }, cap: 'The row decides what to copy.' },
          { say: 'When a copy succeeds, a stored procedure moves that table\'s watermark. When every table has finished, the run ends in success.', on: ['f3'], status: { lk: 'ok', fe: 'ok', cp: 'ok', wm: 'ok', nt: 'wait', fl: 'wait' }, cap: 'The success path.' },
          { say: 'Now the failure path. A copy fails after its retries. A dependency on the Failed outcome starts the notification, and nothing moves the watermark for that table.', on: ['f4'], status: { lk: 'ok', fe: 'run', cp: 'fail', wm: 'skip', nt: 'run', fl: 'wait' }, cap: 'A failed copy starts the notification.' },
          { say: 'The notification goes out, and a Fail activity ends the run with a clear message, so the run is marked failed and the alert fires. Without it, a handled failure can leave the run green.', on: ['f5'], status: { lk: 'ok', fe: 'fail', cp: 'fail', wm: 'skip', nt: 'ok', fl: 'fail' }, tags: ['tg_retry'], cap: 'End the run on purpose.' }
        ]
      }),

      B.sql({
        id: 'm4-config', t: 1, src: 'docs', title: 'The configuration table behind the loop', lang: 'tsql',
        code: CONFIG,
        ctx: { role: 'Entra ID: brewline-engineers', wh: 'Azure SQL database', db: 'brewline_meta' },
        steps: [
          { say: 'The pipeline needs one place that says what to copy. A small table in the database does it. Adding a table to the load is then one INSERT, not a new pipeline.', lines: null },
          { say: 'Each row is one table to load: the source, the destination folder in the lake, how to load it, and the column that carries the change time. `enabled` lets you switch a table off without deleting its row.', lines: G.span(CONFIG, /^CREATE TABLE/, /^\);/) },
          { say: 'Three rows. Two tables load incrementally by their change column, and the small stores table is copied in full every night, because its watermark would cost more than the copy.', lines: G.span(CONFIG, /^INSERT INTO/, /'stores'/) },
          { say: 'The lookup runs this query. Its result is an array of objects, and the ForEach takes it as `@activity(\'LookupTables\').output.value`. Inside the loop, `item().source_table` is the table of the current iteration.', lines: G.span(CONFIG, /^SELECT/, /^WHERE/), run: true }
        ],
        result: { cols: ['source_schema', 'source_table', 'sink_directory', 'load_type', 'watermark_col'], rows: [['dbo', 'orders', 'raw/orders', 'incremental', 'modified_at'], ['dbo', 'customers', 'raw/customers', 'incremental', 'modified_at'], ['dbo', 'stores', 'raw/stores', 'full', 'NULL']], msg: '3 rows, worked out by hand' },
        note: 'The result is what the query returns for these three rows. It was not run on Azure SQL. The statements are written for T-SQL and parse with sqlglot in the T-SQL dialect.'
      }),

      B.talk({
        id: 'm4-git', t: 2, src: 'docs', title: 'Git: how pipelines are versioned',
        say: 'A pipeline is JSON, so it belongs in Git. Press Next for how the studio does it.',
        items: [
          ['Connect the development factory only', 'You connect the development factory to a Git repository, in Azure DevOps or GitHub. Test and production factories are not connected. They receive releases.', 'Dev is in Git. Prod is not.'],
          ['Branches and pull requests', 'You work in a feature branch, and the studio saves each change as a commit. You merge to the collaboration branch with a pull request, so a colleague reviews the JSON.', 'Review the change.'],
          ['Publish', 'Publish validates the factory and writes ARM templates to a publish branch. Those templates are what a release deploys to test and production. Mission 13 builds that release.', 'Publish produces the release files.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'The orders database runs on a server inside the company network, behind a firewall that Microsoft cannot reach. Which integration runtime do you use?',
        opts: [
          { t: 'The default Azure integration runtime', fb: 'It runs in Microsoft\'s network and cannot see a private server.' },
          { t: 'A self-hosted integration runtime, installed on a machine that can reach the server', fb: '' },
          { t: 'The Azure-SSIS integration runtime', fb: 'That is for running SSIS packages.' },
          { t: 'No runtime is needed, because the linked service finds the server', fb: 'A linked service only describes the connection. A runtime does the connecting.' }
        ],
        ok: 1, why: 'A self-hosted runtime runs on your side of the firewall and makes outbound connections to the service. It reaches what the machine can reach. Add a second node so a restart does not stop the loads.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'What does a **dataset** hold that a **linked service** does not?',
        opts: [
          { t: 'The password of the source', fb: 'Connection details, and how to sign in, belong to the linked service.' },
          { t: 'The shape of the data: a table, or a path and a format', fb: '' },
          { t: 'The schedule of the pipeline', fb: 'Schedules belong to triggers.' },
          { t: 'The compute that runs the copy', fb: 'That is the integration runtime.' }
        ],
        ok: 1, why: 'A linked service says where and how to connect. A dataset says what inside it: which table, or which folder, file format and schema. Parameters on a dataset let one dataset serve many tables.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'The trigger fires on 2026-03-14 at 06:00 UTC. What does `@formatDateTime(pipeline().TriggerTime, \'yyyy-mm-dd\')` return?',
        opts: [
          { t: '2026-03-14', fb: 'That needs a capital MM for the month.' },
          { t: '2026-00-14', fb: '' },
          { t: '2026-06-14', fb: 'The hour is 06, but lower-case mm is the minute, not the hour.' },
          { t: 'An error, because the pattern is wrong', fb: 'The pattern is valid. It means something else.' }
        ],
        ok: 1, why: 'In a date pattern, MM is the month and mm is the minute. At 06:00 the minute is 00, so the month part is 00. The lab on an earlier screen shows it with three trigger times. The expression runs without an error, which is why it hurts.'
      }),

      B.quiz({
        id: 'm4-q4', t: 1,
        q: 'A copy activity does not set `dataIntegrationUnits`. What happens?',
        opts: [
          { t: 'It runs with one unit, the smallest', fb: 'The service does not default to the smallest.' },
          { t: 'The service chooses a value from the source, the sink and the data', fb: '' },
          { t: 'The pipeline fails validation, because the setting is required', fb: 'It is optional.' },
          { t: 'It uses the maximum of 256 units', fb: 'That would be very expensive, and it is not what Auto does.' }
        ],
        ok: 1, why: 'Left unset, or set to Auto, the service picks the number of DIUs for the copy. Raise it only after the monitor shows that DIUs are the bottleneck, because each unit adds cost.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the build of the daily copy pipeline in order.',
        items: [
          'Create the linked services for the database and the lake, signing in with the managed identity',
          'Create the datasets, with the date as a parameter on the lake dataset',
          'Add the lookup, the copy and the stored procedure, with dependencies',
          'Run it in debug mode with a small date range',
          'Add a trigger, and set the retry policy and the timeout',
          'Check it with the pipeline checker, and open a pull request'
        ],
        why: 'Connections first, then the shape of the data, then the steps, then proof with a small run, then the automation, then review. Starting the trigger before a debug run means the first run is a production run.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This copy query is built from the watermark. The copy fails with a SQL error about a conversion. Click the line that is wrong.',
        file: 'copy-source.json', lang: 'json', code: QUOTE_BUG, bad: [4],
        hint: 'The watermark is text that the database must read as a date.',
        why: 'Line 4 puts the watermark into the SQL with no quotes, so the query reads `modified_at > 2026-03-13T06:00:00Z`, which SQL cannot parse. A date literal needs single quotes around it, as in the good pipeline. In an expression string the quotes are part of the text, and `@{...}` only fills in the value.',
        fix: QUOTE_FIX,
        cheer: 'Print the final query to the log once, and read it.'
      }),

      B.bug({
        id: 'm4-bug2', t: 2, q: 'The checker rejects this activity. Click the line with the mistake.',
        file: 'advance-watermark.json', lang: 'json', code: DEP_BUG, bad: [5],
        hint: 'The checker named the four values that a dependency condition can take.',
        why: 'The conditions that a dependency can use are ' + CK.dependency_conditions.join(', ') + '. `Success` is not one of them, and the checker said so: it listed these four. `Succeeded` runs the activity after the copy succeeds.',
        fix: DEP_FIX,
        cheer: 'Run the checker in the pull request.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: how do you load 150 tables every night?',
        scenario: 'Brewline has **150 tables** in Azure SQL to copy into the raw zone every night. The tables are similar: a source table, a folder, and a column that tells what changed. New tables appear every month. **Two engineers** maintain the factory.',
        opts: [
          { t: 'One pipeline for each table, copied and edited by hand', d: 'Simple to understand for one table.', lose: 'A hundred and fifty pipelines to change when a rule changes, and a new table needs a new pipeline. Mistakes hide in the copies.' },
          { t: 'One metadata-driven pipeline: a configuration table, a lookup, a ForEach and a parameterized copy', d: 'A new table is one row. One place to fix a rule.' },
          { t: 'A mapping data flow for every table, in one big flow', d: 'A visual design with no code.', lose: 'The copy activity is cheaper for plain movement. A cluster starts for every run, and one big flow is hard to review and to test.' }
        ],
        pick: 1,
        why: 'The tables are alike, so the rule should live in one place. A configuration table, a lookup and a loop turn a new table into one row, and the copy activity is the cheapest way to move plain data. Keep the loop count within the limits and the retry policy on each copy.',
        when: 'If a few tables need very different handling, keep them out of the loop in their own pipelines. A loop is for tables that are alike.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'docs', title: 'Incident: the copy takes four hours', time: '08:30',
        alert: '**The nightly copy of `dbo.orders`, about 100 GB, now takes four hours. It took one hour in January.** The pipeline has not changed. The copy details show the longest stage is the transfer, and the throughput is a fraction of the earlier one. The source is an Azure SQL database.',
        clues: ['Data integration units are on Auto', 'The source query reads the whole table with no partitioning', 'The source database sits at its CPU limit during the copy'],
        opts: [
          { t: 'Read the copy details first, then check the source database load and add a partitioned read, with a window outside business hours', fb: '' },
          { t: 'Set the DIUs to the maximum of 256', fb: 'The bottleneck is the source. More DIUs add cost and pressure on the database, and may not help.' },
          { t: 'Delete the pipeline and rebuild it', fb: 'Nothing is wrong with the definition. The load changed.' },
          { t: 'Switch the sink to a bigger storage account', fb: 'The sink was not the slow part. The copy details say the transfer from the source is.' }
        ],
        best: 0,
        why: 'The copy details name the slow stage, and it is the read from the source, which is at its CPU limit because other work now shares the database. A single query reads the table on one thread. A partitioned read, by physical or dynamic ranges, reads in parallel, and a window that avoids the busy hours or a read replica protects the production workload.',
        checks: [
          ['Open the copy details', 'Which stage took the time: queue, transfer, or waiting? What were the DIUs and the throughput?'],
          ['Check the source', 'CPU, DTU or vCore load of the database during the copy window.'],
          ['Split the read', 'Turn on a partition option on the source, so several threads read ranges of the table.'],
          ['Move the window', 'Run when the source is quiet, or read from a replica.'],
          ['Keep the evidence', 'Alert on duration, and chart throughput, so the next slowdown shows in days, not months.']
        ],
        tell: 'Our nightly copy of 100 GB from Azure SQL grew from one hour to four. The copy details showed that the slow stage was the read from the source, which sat at its CPU limit because other jobs now ran in the same window. I turned on partitioned reads on the source so several threads read ranges of the table, moved the copy to a quieter window, and left the DIUs on Auto. The copy came back to about an hour. I added an alert on copy duration.',
        prevent: ['Read the **copy details** before you change DIUs', 'Use **partitioned reads** for large source tables', 'Run copies in a **quiet window** or from a replica', 'Alert on **duration and throughput**']
      }),

      B.incident({
        id: 'm4-inc2', t: 2, src: 'docs', title: 'Incident: duplicate rows after a retry', time: '09:20',
        alert: '**Revenue in the warehouse is 6 percent higher than in the source.** The nightly copy into a SQL staging table failed at 02:40 after loading part of the day, and its retry at 02:41 loaded the whole day again. The copy uses the default insert behavior. The pipeline run shows success.',
        clues: ['A count by order id shows 8,400 ids with two rows each', 'The first attempt wrote part of the day before it failed', 'The sink is set to insert, and the retry policy allows two retries'],
        opts: [
          { t: 'Make the load safe to repeat: write to a staging table or a run-dated folder, then merge or swap in one step, and remove the duplicates', fb: '' },
          { t: 'Turn off the retry', fb: 'It hides the symptom and leaves a half-loaded day after every failure.' },
          { t: 'Rely on a primary key to reject duplicates', fb: 'A key on a warehouse table may not be enforced, and a rejected row fails the whole copy.' },
          { t: 'Add DIUs so that the copy does not fail', fb: 'A bigger copy can still fail halfway. The load must survive a failure.' }
        ],
        best: 0,
        why: 'A retry repeats the whole copy, and a plain insert repeats its rows. The load must give the same result when it runs once or twice. Writing to a staging table and then merging on the key, or writing files to a folder named by the run date and overwriting it, does that. A row-count gate against the source would have failed the run.',
        checks: [
          ['Measure the damage', 'A count by key shows which rows exist twice, and how many.'],
          ['Find the cause', 'Two attempts on one day, and a sink that inserts.'],
          ['Repair the table', 'Delete the duplicates, keeping one row for each key, and check the count against the source.'],
          ['Make it repeatable', 'Stage and merge, or overwrite a dated folder. Use upsert on keys where the sink supports it.'],
          ['Add a gate', 'Compare the row count with the source and fail the run if they differ.']
        ],
        tell: 'Revenue in the warehouse was 6 percent too high because the nightly load ran twice. The first attempt failed after loading part of the day, and the retry loaded the whole day again through a plain insert. I removed the duplicates, then changed the load to write to a staging table and merge on the order id, and I added a row-count gate that compares the staging table with the source. A retry now gives the same result as a clean run.',
        prevent: ['Make every load **safe to repeat**', 'Load through **staging and a merge**, or overwrite a **dated folder**', 'Add a **row-count gate** against the source', 'Do not rely on **keys that are not enforced**']
      }),

      B.qa({
        id: 'qa-adf', t: 1, tag: 'Data Factory', secs: 60,
        q: 'Explain how Azure Data Factory works: pipelines, activities, linked services, datasets and integration runtimes.',
        pts: ['A pipeline is a group of activities that runs as one unit', 'An activity is one step, with dependencies and a retry policy', 'A linked service is the connection to a store or a compute service', 'A dataset is the shape of data inside a linked service', 'An integration runtime is the compute that executes an activity', 'A trigger starts a run, and Monitor logs every run'],
        short: 'A factory holds everything. A pipeline is a group of activities that I start, monitor and rerun as one unit, and each start is a pipeline run. An activity is one step, such as a copy, a lookup or a stored procedure, with dependencies on other activities and a retry policy.\n\nA linked service is the connection to a store or a compute service, and I sign in with a managed identity so there is no secret. A dataset is a named view of data inside a linked service: a table, or a path with a format. The copy activity reads one dataset and writes another.\n\nThe integration runtime is the compute that does the work. The Azure runtime reaches public endpoints, a managed virtual network runtime reaches private ones, and a self-hosted runtime reaches a database behind my firewall.\n\nA trigger starts a pipeline on a schedule, a tumbling window or an event, and every run and every activity is logged in Monitor with its inputs, outputs and errors. I keep the factory in Git, and I release it through templates.',
        fu: [
          ['What is the difference between a pipeline and a pipeline run?', 'A pipeline is the definition. A run is one execution of it, with its own id, parameters and result.'],
          ['Where do secrets go?', 'Nowhere in the factory if I can avoid it. A managed identity signs in. When a secret is unavoidable, it lives in Key Vault, and the linked service refers to it.']
        ],
        trap: 'Describing Data Factory as an ETL engine that transforms data. It orchestrates and copies, and heavy transformation runs in other engines.',
        real: 'Describe a pipeline you built and the runtime that it used.'
      }),

      B.qa({
        id: 'qa-ir', t: 1, tag: 'Data Factory', secs: 60,
        q: 'What are integration runtimes, and which one do you choose for a private SQL Server?',
        pts: ['The runtime is the compute that executes activities', 'Azure runtime: managed, reaches public endpoints', 'Managed virtual network runtime: private endpoints that the target owner approves', 'Self-hosted runtime: software on a machine in your network', 'SSIS runtime runs SSIS packages', 'A private SQL Server needs the self-hosted runtime, with more than one node'],
        short: 'An integration runtime is the compute where an activity runs, and where it runs decides what it can reach.\n\nThe Azure integration runtime is managed by Microsoft and reaches public endpoints. An Azure runtime in a managed virtual network reaches stores that allow only private connections, through managed private endpoints, and the owner of each target must approve the endpoint. The self-hosted runtime is software that I install on a machine in my own network, and it makes outbound connections to the service, so it reaches whatever that machine can reach. The Azure-SSIS runtime runs existing SSIS packages.\n\nFor a private SQL Server that Microsoft cannot reach, I use a self-hosted runtime. I size and patch the machine, and I add a second node so that a restart does not stop the loads. For cloud stores I start with the Azure runtime and move to the managed network one when the stores must be private.',
        fu: [
          ['What does a managed private endpoint need?', 'An approval on the target resource, by someone with rights on it. Until it is approved, the connection fails.'],
          ['What is the risk of a self-hosted runtime?', 'It is a machine I must patch and keep available, and everything that it can reach is reachable by the pipeline.']
        ],
        trap: 'Using the self-hosted runtime for cloud stores because it feels more controlled. It adds a machine to maintain for no gain.',
        real: 'Describe a source that needed a self-hosted runtime and how you made it available.'
      }),

      B.qa({
        id: 'qa-copy', t: 2, tag: 'Data Factory', secs: 90,
        q: 'A copy activity is slow. How do you find the cause and speed it up?',
        pts: ['Open the copy details: duration by stage, DIUs used, throughput', 'Find the bottleneck: source, sink or the copy itself', 'Parallel reads by partitioning the source', 'DIUs only when they are the limit, because they raise the cost', 'Staging for loads into Synapse, and fewer larger files', 'Alert on duration so slowdowns show early'],
        short: 'I start with the copy details of a slow run, not with a guess. They split the time by stage, and show the DIUs used, the throughput and the parallel copies. That tells me whether the bottleneck is the source, the sink or the copy itself.\n\nIf the source is slow, one thread reads one query, so I turn on a partition option, by physical or dynamic ranges, so that several threads read in parallel. I also check the load on the source database and move the window if other work shares it. If files are the problem, many tiny files cost more than a few large ones, so I batch them.\n\nI raise the DIUs only when the details show that they are the limit, because each unit adds cost. For loads into Synapse I use staging with the COPY command.\n\nAfterwards I chart throughput and alert on duration, so that the next slowdown appears in days and not in months.',
        fu: [
          ['What is the default for DIUs?', 'Auto. The service chooses from the source, the sink and the data. The allowed range for a manual value is 2 to 256.'],
          ['When does staging help?', 'For large loads into Synapse through the COPY command, where an intermediate store allows a fast parallel load.']
        ],
        trap: 'Raising DIUs first. It costs more and often changes nothing when the source is the bottleneck.',
        real: 'Describe a slow copy you fixed, and the stage where the time went.'
      }),

      B.qa({
        id: 'qa-meta', t: 2, tag: 'Data Factory', secs: 90,
        q: 'How would you design the load of 150 similar tables in Data Factory?',
        pts: ['One metadata-driven pipeline, not one per table', 'A configuration table with source, sink and load type', 'A lookup reads the enabled rows, and ForEach loops over them', 'A parameterized dataset and copy for each iteration', 'Watermark per table, and a safe-to-repeat sink', 'Retries, a failure path that ends the run, and an alert'],
        short: 'I would not build 150 pipelines. I build one metadata-driven pipeline. A small configuration table holds one row for each table: the source, the destination folder, the load type and the change column, with an enabled flag. A lookup reads the enabled rows, and a ForEach loops over them, a limited number at a time. Inside the loop, a copy activity uses datasets with parameters, so one dataset serves every table, and the row decides the query.\n\nEach table has its own watermark, moved by a stored procedure only after its copy succeeds, and the sink is safe to repeat, by staging and merging or by overwriting a dated folder. I give the copy a retry policy and a timeout. A failure path sends a notification and ends the run with a Fail activity, so that the run is marked failed and the alert fires.\n\nA new table becomes one row, and a change of rule is made in one place. Tables that need special handling stay in their own pipelines.',
        fu: [
          ['What are the limits of ForEach?', 'It has a batch count with an upper limit of 50 parallel iterations, and limits on the number of items. Check the current limits page.'],
          ['What can go wrong in a parallel loop?', 'Variables are shared by all iterations, so do not use a variable for per-table values. Use item() and parameters.']
        ],
        trap: 'Putting a variable inside a parallel loop. All iterations share it.',
        real: 'Describe a loop you built, and the number of tables it handled.'
      }),

      B.qa({
        id: 'qa-expr', t: 1, tag: 'Data Factory', secs: 60,
        q: 'How do parameters and dynamic content work in Data Factory? Give an example and a mistake.',
        pts: ['Parameters are fixed for one run, variables are set during it', 'System variables such as TriggerTime and RunId', 'Expressions start with @, or sit inside @{ } in text', 'Functions such as concat, formatDateTime, addDays and if', 'Single quotes in a string are doubled', 'A mistake: mm is minutes, MM is the month'],
        short: 'A pipeline parameter is passed in when the run starts and stays fixed, and a variable is set during the run. System variables such as `pipeline().TriggerTime` and `pipeline().RunId` give facts about the run.\n\nDynamic content is an expression. It starts with `@`, or it sits inside `@{ }` in a text, and it uses functions such as `concat`, `formatDateTime`, `addDays` and `if`. A real one is the folder of a run: `@concat(\'raw/orders/dt=\', formatDateTime(pipeline().TriggerTime, \'yyyy-MM-dd\'))`.\n\nMistakes I watch for: inside a string, a single quote is written twice, so a query that needs quotes around a value must double them. A pattern with lower-case `mm` writes the minute, and not the month, so the date comes out wrong without an error. A value without the leading `@` is plain text. And I check the final text with a debug run.',
        fu: [
          ['What is the difference between @{...} and @?', 'A string that starts with @ is one expression and returns its type. Text with @{...} holes is a string with the values filled in.'],
          ['Where do you keep a value that differs by environment?', 'A global parameter, which a release can override for production.']
        ],
        trap: 'Using a variable for a value that should be a parameter. A variable can be changed by the run, and it is shared in loops.',
        real: 'Describe an expression that went wrong and how you found it.'
      }),

      B.qa({
        id: 'qa-df', t: 2, tag: 'Data Factory', secs: 60,
        q: 'When would you use a mapping data flow instead of the copy activity or Spark code?',
        pts: ['The copy activity moves data and is the cheapest for plain movement', 'A data flow is a visual transformation on managed Spark', 'It bills by vCore-hour, with a minimum cluster size, and startup time', 'Good for joins and clean-up of moderate data by a team that prefers a visual tool', 'Heavy or complex work is easier to test and review as code in Databricks or Synapse', 'Keep important logic under version control'],
        short: 'If the job only moves data, I use the copy activity, because it is the cheapest and simplest. A mapping data flow is a visual transformation: I draw sources, joins and aggregates, and the service runs it as Spark on a cluster that it starts for the run, so I write no Spark.\n\nIt bills by vCore-hours while the cluster runs, with a minimum cluster size, and the start takes minutes, which is slow for short jobs. A time-to-live setting reuses a warm cluster, at the cost of keeping it on.\n\nI use a data flow for joins and clean-up of moderate data when the team prefers a visual tool. For heavy or complex transformations I prefer code in Databricks or Synapse Spark, because it is easier to test, to review in a pull request and to run on a schedule, and a pipeline calls it as a notebook activity. Whatever I choose, I keep the logic that matters under version control.',
        fu: [
          ['What is the cost trap of data flows?', 'A debug session keeps a cluster alive and bills. Turn it off when you stop, and set the time-to-live on purpose.'],
          ['How do you test a data flow?', 'With a small input in debug mode, and with checks on row counts and key values after the run.']
        ],
        trap: 'Using a data flow for plain copying because it feels like the main tool. The copy activity is cheaper.',
        real: 'Describe a transformation that you moved from a data flow to code, or the reverse, and why.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Pipeline Starter', color: '#A7F3D0',
        pts: [
          'A factory holds **pipelines, activities, linked services, datasets, runtimes and triggers**. A pipeline is JSON that Git can store.',
          'A **linked service** connects, a **dataset** shapes, an **integration runtime** does the work. Use a **managed identity** to sign in.',
          'Tune a **copy** by reading the details first: **partition the source**, keep DIUs on **Auto** until they are the limit, **stage** loads into Synapse.',
          'Dynamic content: **parameters** are fixed, **variables** change, quote strings by **doubling**, and **MM is the month while mm is the minute**.',
          'Build **one metadata-driven pipeline** for similar tables, and make each load **safe to repeat**.'
        ],
        lines: [
          'I read the copy details before I change a setting.',
          'I put a rule in one place and a table in a row.',
          'I make every load safe to run twice.'
        ]
      })
    ]
  });
})();
