/* Mission 4: Glue, EMR and the Data Catalog. The catalog calls (a table with partition keys, registered partitions, partition filter expressions,
   a schema change that leaves old partitions alone, partition projection settings, a job definition) were recorded with boto3 against moto, an AWS emulator.
   Glue job code, job bookmarks, worker types, prices, EMR and Lake Formation come from documentation: Glue jobs and EMR did not run anywhere. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TBL = G.file('glue/table_input.json'), PROJ = G.file('glue/table_projection.json');
  var DISC = G.counts('glue.discover'), EXPR = G.counts('glue.expressions'), ERR = G.counts('glue.errors'), SCH = G.counts('glue.schema_change'), PRJ = G.counts('glue.projection'), JOB = G.counts('glue.job');
  G.expect(DISC.prefixes_found.length === 4 && DISC.registered === 4 && DISC.errors.length === 0, 'four partition folders found and registered');
  G.expect(EXPR.length === 6 && EXPR[1].expression === "dt >= '2026-03-15'" && EXPR[1].partitions.join() === '2026-03-15,2026-03-16,2026-03-17', 'the partition expressions');
  G.expect(ERR.duplicate_database.code === 'AlreadyExistsException' && ERR.missing_table.code === 'EntityNotFoundException' && ERR.duplicate_partition === 'AlreadyExistsException', 'the catalog errors');
  G.expect(SCH.versions_before === 1 && SCH.versions_after === 2 && SCH.columns_now.length === 5 && SCH.partition_still_has_old_columns.length === 4, 'a schema change leaves the registered partition on the old columns and adds a table version');
  G.expect(PRJ.registered_partitions === 0 && PRJ.parameters['projection.enabled'] === 'true', 'a projected table has no registered partitions');
  G.expect(JOB.worker_type === 'G.1X' && JOB.workers === 5 && JOB.glue_version === '5.0', 'the recorded job definition');
  var ex = function (n) { return EXPR[n]; };

  var JOBCODE = [
    'import sys',
    'from awsglue.context import GlueContext',
    'from awsglue.dynamicframe import DynamicFrame',
    'from awsglue.job import Job',
    'from awsglue.utils import getResolvedOptions',
    'from pyspark.context import SparkContext',
    'from pyspark.sql import functions as F',
    '',
    "args = getResolvedOptions(sys.argv, ['JOB_NAME', 'RUN_DATE'])",
    'glue = GlueContext(SparkContext.getOrCreate())',
    "job = Job(glue)",
    "job.init(args['JOB_NAME'], args)",
    '',
    'raw = glue.create_dynamic_frame.from_catalog(',
    "    database='brewline_lake', table_name='raw_orders',",
    '    push_down_predicate="dt = \'%s\'" % args[\'RUN_DATE\'],',
    "    transformation_ctx='raw_orders')",
    '',
    "clean = (raw.toDF().dropDuplicates(['order_id'])",
    "         .withColumn('total_usd', F.col('total_usd').cast('decimal(12,2)')))",
    '',
    'glue.write_dynamic_frame.from_options(',
    "    frame=DynamicFrame.fromDF(clean, glue, 'clean_orders'),",
    "    connection_type='s3',",
    "    connection_options={'path': 's3://brewline-lake/clean/orders/', 'partitionKeys': ['dt']},",
    "    format='glueparquet', format_options={'compression': 'snappy'},",
    "    transformation_ctx='clean_orders')",
    '',
    'job.commit()'
  ].join('\n');
  var BOOKMARK_BUG = [
    "job.init(args['JOB_NAME'], args)",
    "orders = glue.create_dynamic_frame.from_catalog(database='brewline_lake', table_name='raw_orders')",
    "glue.write_dynamic_frame.from_options(frame=orders, connection_type='s3',",
    "                                      connection_options={'path': 's3://brewline-lake/clean/orders/'}, format='glueparquet')",
    'job.commit()'
  ].join('\n');
  var BOOKMARK_FIX = BOOKMARK_BUG.replace("table_name='raw_orders')", "table_name='raw_orders',\n                                              transformation_ctx='raw_orders')");

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Glue, EMR and the Data Catalog', short: 'Glue', blurb: 'The catalog, partitions and schema changes, Glue jobs, bookmarks, worker sizes, EMR and Lake Formation', minutes: 40,
    focus: ['stg', 'int', 'air'],
    goals: [
      'Say what the **Glue Data Catalog** stores and who reads it.',
      'Register and filter **partitions**, and explain **partition projection**.',
      'Read a **Glue job**, and say what a **bookmark**, a **worker** and a **DPU** are.',
      'Choose between **Glue, EMR and Athena** for a transformation.',
      'Explain what **Lake Formation** adds on top of IAM.'
    ],
    say: 'Mission 4 is the catalog and the transformation engines. The Glue Data Catalog is the shared memory of the lake: it knows which folders are which tables, with which columns and partitions. Glue jobs and EMR clusters do the transformations. The catalog calls are recorded against an emulator, and the rest comes from documentation, because no Glue job or EMR cluster ran.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, src: 'docs', title: 'What Glue is',
        say: 'Glue is a family of services around data integration. Press Next for the parts you will meet.',
        items: [
          ['The Data Catalog', 'A central store of table definitions: databases, tables, columns, partitions and where the files are. Athena, Redshift Spectrum, EMR, Glue jobs and Lake Formation all read it, so the schema lives in one place. It is compatible with the Hive metastore API.', 'The shared memory of the lake.'],
          ['Crawlers', 'A crawler scans a path in S3, guesses the format and columns, and writes or updates a table in the catalog. Handy for exploring, and slow and surprising in production, where explicit definitions are safer.', 'A guess, not a contract.'],
          ['ETL jobs', 'A job runs a Spark script, or a small Python script, on managed workers. You choose a worker type and a number of workers and pay for the Data Processing Units (DPUs) while the job runs. There are no clusters to patch.', 'Serverless Spark, billed by the second.'],
          ['Workflows, triggers and interactive sessions', 'Triggers start jobs on a schedule or after another job. Workflows chain them. Interactive sessions let you build a script in a notebook. For anything bigger than a chain of jobs, teams use Step Functions or Airflow.', 'Light orchestration, built in.'],
          ['Data Quality', 'Rules written in a small language, DQDL, check a table or a data frame: row counts, completeness, uniqueness. A failing rule can stop the job.', 'Checks inside the pipeline.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'The catalog at the centre', g: 'catalog', legend: true,
        steps: [
          { say: 'The files sit in S3. The catalog knows what they mean. Press Next to follow a new table from the files to the people who query it.', cap: 'Files, definitions and readers.' },
          { say: 'Step 1. Parquet files sit under folders named by date. On their own they are only bytes with a location.', on: ['c1'], focus: ['files', 'crawl'], cap: 'Files in S3, with no schema yet.' },
          { say: 'Step 2. A crawler, or a `CREATE EXTERNAL TABLE` statement, writes the table definition into the catalog: the columns, the format, the partition keys and the location.', on: ['c2'], focus: ['crawl', 'cat'], cap: 'The definition goes into the catalog.' },
          { say: 'Step 3. The catalog points back at the files by location. It does not copy data. Delete the table and the files stay. Delete the files and the table is empty.', on: ['c3'], focus: ['cat', 'files'], cap: 'The catalog points. It does not store.' },
          { say: 'Step 4. Athena, Redshift Spectrum and Glue jobs read the same definition. Change a column in one place and every engine sees it.', on: ['c4', 'c4b', 'c4c'], focus: ['cat', 'ath', 'rss', 'gj', 'emr'], cap: 'One definition, many readers.' },
          { say: 'Step 5. Lake Formation sits next to the catalog and decides who may see which database, table and column. Mission 10 returns to it.', on: ['c5'], focus: ['lf', 'cat'], cap: 'Permissions on tables, not on paths.' }
        ]
      }),

      B.code({
        id: 'm4-table', t: 1, src: 'rec', title: 'A table definition in the catalog', file: 'table_input.json', lang: 'json', code: TBL,
        steps: [
          { say: 'This is the request that created the table `orders` in the recorded run. The catalog stores exactly this. The AWS SDK checked the structure against the Glue service model before sending it.', lines: null },
          { say: '`TableType` says the table is `EXTERNAL_TABLE`: the data lives outside the catalog, in S3. Dropping the table does not delete the files.', lines: G.span(TBL, /"TableType"/) },
          { say: 'The partition keys are separate from the columns. Here there is one, `dt`, a string. In S3 it appears as a folder name, `dt=2026-03-14/`, and not inside the files.', lines: G.span(TBL, /"PartitionKeys"/, /^  \],?$/) },
          { say: 'The columns of the data, with their types. Types here are Hive types: `string`, `decimal(12,2)`, `bigint`.', lines: G.span(TBL, /"Columns"/, /^    \],?$/) },
          { say: 'Where the files are, and how to read them: the input format, the output format and the serializer. For Parquet these are fixed strings that you copy from the documentation. A crawler fills them in for you.', lines: G.span(TBL, /"Location"/, /^    \}$/) },
          { say: 'Table parameters. `classification` names the file format, and crawlers set it so that Glue jobs know how to read the files. `EXTERNAL` repeats that the files belong to you.', lines: G.span(TBL, /^  "Parameters"/, /^  \}$/) }
        ],
        note: 'For a table that you write by hand, copy the whole definition from a table that works, not from memory. A missing input format or serializer gives a table that exists and returns nothing.'
      }),

      B.cmp({
        id: 'm4-parts', t: 1, src: 'rec', title: 'Partitions: find, register, filter',
        say: 'A folder in S3 does not become a partition by itself. I listed the prefixes under the table, registered them in the catalog, and asked for partitions with six filter expressions. Press Next to read what came back. The partition column is a string, so comparisons are alphabetical, and ISO dates sort correctly.',
        cols: ['Filter expression', 'Partitions returned'],
        hl: 1,
        rows: EXPR.map(function (e) { return ['`' + e.expression + '`', e.partitions.length + ': ' + e.partitions.join(', ')]; }),
        steps: [
          { upto: 2, say: 'Equals and greater-or-equal. The second one returns three partitions, from the 15th on.' },
          { upto: 4, say: '`BETWEEN` includes both ends. `IN` lists exact values.' },
          { upto: 6, say: '`LIKE` matches a pattern and `AND` combines conditions. The filter runs in the catalog, so only the matching partitions are returned to the engine.' }
        ],
        pick: 'Register partitions as the data arrives, not once a week. A day that is in S3 but not in the catalog is **invisible** to every query. The recorded run found **' + DISC.prefixes_found.length + '** folders and registered **' + DISC.registered + '**, and a second registration of the same partition failed with `' + ERR.duplicate_partition + '`.'
      }),

      B.code({
        id: 'm4-proj', t: 2, src: 'rec', title: 'Partition projection', file: 'table_projection.json', lang: 'json', code: PROJ,
        steps: [
          { say: 'A table with thousands of partitions makes every query ask the catalog for a long list, and the list must be kept up to date. **Partition projection** replaces the list with a rule. Athena works out the partitions from the rule and never asks the catalog.', lines: null },
          { say: 'The switch is one table parameter, `projection.enabled`.', lines: G.span(PROJ, /"projection.enabled"/) },
          { say: 'The rule is a handful of more parameters. Here: the column `dt` is a date, from 2026-01-01 to now, in the format `yyyy-MM-dd`, with one step of one day.', lines: G.span(PROJ, /"projection.dt.type"/, /"projection.dt.interval.unit"/) },
          { say: '`storage.location.template` says where the files of a value are. Athena builds the S3 path from the template, for example `dt=2026-03-14/`.', lines: G.span(PROJ, /"storage.location.template"/) },
          { say: 'The recorded table has **' + PRJ.registered_partitions + ' registered partitions**. With projection on, Athena does not need any: a new day needs no registration, as long as the files sit under the template path.', lines: null }
        ],
        note: 'Projection is a feature of Athena. Other engines, such as Glue jobs and EMR, ignore the settings and need real partitions in the catalog. The settings I stored were accepted by the catalog, which only keeps them. Whether a query uses them was not tested here: it depends on Athena, which did not run.'
      }),

      B.talk({
        id: 'm4-schema', t: 2, src: 'rec', title: 'A schema change in the catalog',
        say: 'Add a column and see what the catalog does. I changed the table by adding the column `channel`. Press Next for what I measured, and what to do about it.',
        items: [
          ['The table changed, the partitions did not', 'After the update the table listed ' + SCH.columns_now.length + ' columns: ' + SCH.columns_now.join(', ') + '. The partition I looked at still listed the old ' + SCH.partition_still_has_old_columns.length + '. Each partition stores its own copy of the columns, from the day it was registered.', 'A partition remembers its own schema.'],
          ['The catalog kept both versions', 'The catalog held ' + SCH.versions_before + ' version of the table before the change and ' + SCH.versions_after + ' after it. You can read the history and, in an emergency, go back.', 'Table versions are kept.'],
          ['What a query sees', 'For Parquet, Athena reads columns by name (documentation, check the current behaviour). A new column is NULL in files that do not have it. A column whose **type** changed is the dangerous case: partitions that disagree with the table raise `HIVE_PARTITION_SCHEMA_MISMATCH`.', 'Adding is safe. Changing a type is not.'],
          ['How to evolve safely', 'Add columns at the end, never reuse a name for another meaning, and never change a type in place. For a type change, write a new column or a new table. Table formats such as Iceberg keep the schema in the table metadata and handle all of this for you.', 'Add, do not alter.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm4-job', t: 1, src: 'docs', title: 'A Glue job script', file: 'orders_to_parquet.py', lang: 'python', code: JOBCODE,
        steps: [
          { say: 'A Glue Spark job is a Python script with a standard frame. It gets its parameters, creates a Glue context on top of Spark, and starts a job object. The job object is what tracks bookmarks.', lines: G.span(JOBCODE, /^import sys/, /^job\.init/) },
          { say: 'Read the raw table from the catalog. `push_down_predicate` makes Glue list and read only the partitions of the run date, not the whole history. `transformation_ctx` is the name under which the bookmark state is stored.', lines: G.span(JOBCODE, /raw = glue.create_dynamic_frame/, /transformation_ctx='raw_orders'/) },
          { say: 'A DynamicFrame is the Glue record collection. It copes with columns whose type varies between records. Convert it to a Spark DataFrame with `toDF()` when you need the full Spark API: remove duplicates, cast the amount to a decimal.', lines: G.span(JOBCODE, /clean = /, /F.col\('total_usd'\)/) },
          { say: 'Write Parquet into the clean zone, partitioned by `dt`. `glueparquet` is the Glue optimized writer. The `transformation_ctx` again names the step for the bookmark.', lines: G.span(JOBCODE, /glue.write_dynamic_frame.from_options/, /transformation_ctx='clean_orders'/) },
          { say: '`job.commit()` saves the bookmark. Without it, the next run starts from the old position and processes the same files again.', lines: G.span(JOBCODE, /job.commit/) }
        ],
        note: 'This script follows the Glue documentation. No Glue job ran for this course, so I checked only that the file parses as Python. The calls and argument names are the documented ones.'
      }),

      B.cmp({
        id: 'm4-bookmark', t: 1, src: 'docs', title: 'Job bookmarks',
        say: 'A bookmark remembers what a job has already read, so the next run reads only what is new. Press Next to read how it works and where it breaks.',
        cols: ['Question', 'Answer'],
        hl: 1,
        rows: [
          ['What does it remember?', 'For S3 sources, the last-modified time of the objects that earlier runs read. For JDBC sources, the highest value of a key column.'],
          ['How do I turn it on?', 'Set the job parameter `--job-bookmark-option job-bookmark-enable`, give each read a `transformation_ctx`, and call `job.commit()` at the end.'],
          ['What breaks it?', 'A read without a `transformation_ctx`, a missing `job.commit()`, or a changed source path under the same context name.'],
          ['What does it miss?', 'Files that are changed or replaced in place get a new modification time and are read again. JDBC bookmarks find new rows and not changed rows.'],
          ['How do I start over?', 'Reset or rewind the bookmark from the console or the API, then run the job.'],
          ['Is it exactly once?', 'No. A job that fails after writing but before committing writes the same output again, so make the output safe to repeat.']
        ],
        steps: [
          { upto: 2, say: 'What it stores and what you must do for it to work.' },
          { upto: 4, say: 'Where it fails quietly: a missing context, a file that was rewritten.' },
          { upto: 6, say: 'Reset it when needed, and do not treat it as a guarantee of exactly-once output.' }
        ],
        pick: 'Use bookmarks for **append-only S3 data**. Write **new files, never rewrite old ones**, and make each write **safe to repeat**, for example by writing to a deterministic partition and overwriting that partition only.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, src: 'docs', q: 'Bookmarks are enabled on this job, yet every run processes all the files again. Click the line that is wrong.',
        file: 'bookmark_bug.py', lang: 'python', code: BOOKMARK_BUG, bad: [2],
        hint: 'How does the bookmark know which read it belongs to?',
        why: 'A bookmark is stored under the `transformation_ctx` of each read. The read on line 2 has none, so Glue keeps no state for it and every run starts from the beginning. Name the read, and keep `job.commit()` at the end so the state is saved. This is documented Glue behaviour.',
        fix: BOOKMARK_FIX,
        cheer: 'A bookmark needs a name, a commit and an enabled job.'
      }),

      B.cmp({
        id: 'm4-workers', t: 1, src: 'docs', title: 'Sizing a Glue job',
        say: 'A Glue job has a worker type and a number of workers. Press Next to read the settings that decide the speed and the bill. The prices are examples.',
        cols: ['Setting', 'What it means', 'Example or default'],
        hl: 1,
        rows: [
          ['DPU', 'The unit of billing. A DPU is documented as 4 vCPUs and 16 GB of memory.', 'About $0.44 for each DPU-hour in the US East price lists I found. Billed by the second with a one minute minimum.'],
          ['Worker type', 'How much each worker has. G.1X is 1 DPU (4 vCPUs, 16 GB), G.2X is 2 DPUs, and the sizes go up to G.16X. R workers carry twice the memory for the same vCPUs. G.025X is a quarter DPU for light streaming jobs.', 'G.1X for most jobs. Larger or R workers for memory-heavy joins.'],
          ['Number of workers', 'How many workers the job gets. More workers means a faster job and the same total DPU-hours if the work scales evenly.', 'The recorded job definition used ' + JOB.workers + ' ' + JOB.worker_type + ' workers.'],
          ['Auto scaling', 'The job adds and removes workers during the run, up to a maximum, and you pay for what it uses.', 'Set a sensible maximum, because a runaway job still costs.'],
          ['Flex execution class', 'Runs on spare capacity, can start later and cost less. For jobs that nobody waits for.', 'About $0.29 for each DPU-hour in some sources. Check the current price.'],
          ['Timeout and retries', 'A timeout stops a stuck job, and a stuck job bills until it stops. Retries run it again after a failure.', 'Left blank, the API documents a timeout of 2,880 minutes (48 hours) up to Glue 4.0 and 480 minutes (8 hours) from Glue 5.0. Set your own.'],
          ['Maximum concurrent runs', 'How many runs of one job may overlap. `StartJobRun` fails with `ConcurrentRunsExceededException` when the limit is reached.', 'The default is 1.']
        ],
        steps: [
          { upto: 3, say: 'Units and sizes. Think in DPU-hours: workers times hours.' },
          { upto: 5, say: 'Scaling and the cheaper execution class.' },
          { upto: 7, say: 'Guard rails: a timeout, retries and the number of overlapping runs. A hung job on 10 G.1X workers with the old 48 hour default bills 10 x 48 x $0.44 = **$211.20** before it stops.' }
        ],
        pick: 'Start with **G.1X workers and auto scaling with a maximum**, set a **timeout** of about 3 times the normal run time, keep **one concurrent run** for jobs that write the same table, and measure DPU-hours before you buy bigger workers.'
      }),

      B.cmp({
        id: 'm4-engine', t: 1, src: 'docs', title: 'Glue, EMR or Athena',
        say: 'Three ways to transform data on AWS. Press Next to compare them. The right answer depends on the logic, the size, and who runs it.',
        cols: ['Question', 'Athena (SQL)', 'Glue jobs (Spark)', 'EMR (Serverless or on EC2)'],
        hl: 2,
        rows: [
          ['What do you write?', 'SQL: CREATE TABLE AS SELECT, INSERT INTO', 'PySpark or Scala, with Glue helpers', 'Spark, Hive, Flink, Trino and more'],
          ['What do you run?', 'Nothing. It is serverless.', 'Nothing. Workers start for the job.', 'Serverless applications, or clusters that you size and tune'],
          ['Cost model', 'Terabytes scanned', 'DPU-hours', 'vCPU and memory hours, or instance hours, with Spot discounts on EC2'],
          ['Good at', 'SQL transformations and small to medium jobs', 'Python logic, joins at scale, bookmarks, catalog integration', 'Custom engines, tuning, long-running or very large workloads'],
          ['Watch for', 'Query time and partition write limits', 'Start-up time, worker sizing, DynamicFrame habits', 'Operations: versions, scaling, idle clusters']
        ],
        steps: [
          { upto: 2, say: 'What you write and what you operate. Athena asks the least of you, EMR the most.' },
          { upto: 4, say: 'Cost and strengths. Pick the model that matches your workload and your team.' },
          { upto: 5, say: 'And the traps for each. Most disappointing bills come from the thing in the last row.' }
        ],
        pick: 'Use **Athena** when the logic is SQL, **Glue** when you need Python and the catalog and want no clusters, and **EMR** when you need an engine or control that Glue does not give. Move up only when the simpler tool fails a measured need.'
      }),

      B.talk({
        id: 'm4-lf', t: 2, src: 'docs', title: 'Lake Formation',
        say: 'IAM controls access to services and S3 paths. Lake Formation controls access to tables and columns. Press Next for how it works.',
        items: [
          ['Permissions on catalog objects', 'You grant `SELECT` on a table, or on some columns of it, to a role or an account. The engine asks Lake Formation, and Lake Formation vends temporary access to the underlying files only for what was granted.', 'Grants on tables, not on paths.'],
          ['Tags instead of lists', 'LF-tags label databases, tables and columns, for example `sensitivity=pii`. One grant on a tag covers every object that carries it, and new tables inherit the grant when tagged.', 'Grant on a tag, not on a thousand tables.'],
          ['Row and column filters', 'Data filters hide columns and rows from a grant, for example the e-mail column of customers or the rows of other regions.', 'Fine-grained control, enforced by the engine.'],
          ['Sharing across accounts', 'Share databases and tables with other accounts through the catalog, with the grants kept in one place. The other account sees the tables as resource links.', 'Share without copying data.'],
          ['It works with IAM, not instead of it', 'The caller still needs IAM permission to call the service. When Lake Formation controls a table, it needs the grant as well. Engines must support it: Athena, Redshift Spectrum, EMR and recent Glue versions do, with differences between them.', 'Both must allow.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm4-table-formats', t: 3, src: 'docs', title: 'Table formats on S3: Iceberg, Delta and Hudi',
        say: 'Files and a catalog get you far. Table formats add transactions on top. Press Next for what they give you.',
        items: [
          ['Transactions on files', 'A table format keeps a log of which files make up the table at each moment. A write is one atomic commit of that log, so readers never see half a write. This works on plain S3.', 'ACID on object storage.'],
          ['Row-level changes', 'Update, delete and merge rewrite only the affected files. That is how a lake deletes one person data on request, which is slow and painful with plain folders of Parquet.', 'Deletes without rewriting the lake.'],
          ['Time travel and schema evolution', 'You can query the table as of an earlier snapshot, and add, rename or reorder columns without breaking old files.', 'History and safe changes.'],
          ['Compaction as a service', 'AWS offers managed compaction for Iceberg tables in the Glue Data Catalog and in S3 Tables, which rewrites many small files into fewer large ones. Some strategies also sort the data. Check the current options for your table type.', 'Small files fixed for you.'],
          ['Choosing', 'Athena, EMR, Glue and Redshift read Apache Iceberg tables. Delta and Hudi have their own support. If AWS services are your main engines, Iceberg has the widest native support. Check the engine and version for each format before you commit.', 'Match the format to your engines.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A job writes the folder `curated/orders/dt=2026-03-18/` at 02:00. Analysts query the table at 09:00 and see nothing for the 18th. The table is not projected. Why?',
        opts: [
          { t: 'Athena caches the previous day for 24 hours', fb: 'Athena has no such cache for table data.' },
          { t: 'The partition is not registered in the catalog, so the engine does not know the folder exists', fb: '' },
          { t: 'Parquet files cannot be read on the day they are written', fb: 'They can be read at once. The problem is the catalog.' },
          { t: 'The partition key must be an integer', fb: 'A string partition key works. The recorded table used one.' }
        ],
        ok: 1, why: 'A folder is not a partition until the catalog says so. Register it with the job, with `ALTER TABLE ... ADD PARTITION`, with a crawler, or avoid the problem with partition projection.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'A Glue job runs on 10 G.1X workers for 24 minutes. At $0.44 for each DPU-hour, what does one run cost?',
        opts: [
          { t: 'About $0.18', fb: 'That is one DPU for 24 minutes. The job has 10 workers, so multiply by 10.' },
          { t: 'About $1.76', fb: '' },
          { t: 'About $4.40', fb: 'That is one hour of the 10 DPUs. The job ran for 24 minutes.' },
          { t: 'About $10.56', fb: 'That multiplies the minutes by the rate without converting to hours.' }
        ],
        ok: 1, why: 'A G.1X worker is one DPU, so 10 workers are 10 DPUs. 24 minutes is 0.4 of an hour, so the job used 4 DPU-hours. 4 times $0.44 is $1.76. The one minute minimum does not change this.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'Which engine uses the partition projection settings in a table definition?',
        opts: [
          { t: 'Every engine that reads the Glue Data Catalog', fb: 'The settings are only a table parameter. Engines must know how to use them.' },
          { t: 'Athena', fb: '' },
          { t: 'Only Glue ETL jobs', fb: 'Glue jobs need real partitions.' },
          { t: 'Amazon S3 itself', fb: 'S3 knows nothing about tables.' }
        ],
        ok: 1, why: 'Partition projection is an Athena feature. A table that relies on it has no registered partitions, so a Glue job or an EMR cluster that reads the same table sees none.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps of a daily incremental Glue load in order.',
        items: [
          'A trigger or a schedule starts the job for the run date',
          'The job reads only the new raw partition, with a push-down predicate and a bookmark',
          'It removes duplicates and casts the types',
          'It writes Parquet into the date partition of the clean zone',
          'It registers the new partition in the catalog',
          'It runs the data quality rules, then commits the bookmark'
        ],
        why: 'Read only what is new, transform, write, make the data visible in the catalog, check it, and only then commit. Committing last means a failed run is read again and not skipped.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: how do you build the nightly clean-up of orders?',
        scenario: 'Every night, **40 GB** of raw order files must become deduplicated Parquet in the clean zone. The logic is **SQL only**: remove duplicates by `order_id`, cast three columns, add one derived column. Two engineers maintain it. They want **little to operate** and **a low bill**.',
        opts: [
          { t: 'A Glue Spark job with 10 workers', d: 'Full Spark power. Bookmarks. Catalog integration.', lose: 'It works and costs a few dollars a night. For SQL-only logic on 40 GB it is more machinery than needed: a script, a job definition, worker sizing and a library of Glue habits to maintain.' },
          { t: 'An EMR cluster that starts every night', d: 'Full control. Spot instances.', lose: 'More to operate: cluster versions, bootstrap steps, scaling, failure handling. Control that this job does not need.' },
          { t: 'Athena: a scheduled `INSERT INTO` or CTAS statement', d: 'SQL in, files out. Nothing to run. Pay for the bytes scanned.' }
        ],
        pick: 2,
        why: 'The logic is SQL and the size is modest, so Athena does it with the least to operate. 40 GB of Parquet scans for a fraction of a dollar. The two engineers maintain a SQL file in Git.',
        when: 'Choose Glue when the logic needs Python, custom code or a library, when you need job bookmarks, or when a single query would exceed Athena limits. Choose EMR for engines Glue lacks or for very large, steady workloads where Spot pricing and tuning pay off. Check the Athena limits on partitions written by one statement and on query time.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'docs', title: 'Incident: yesterday is missing from the dashboard', time: '09:30',
        alert: '**The revenue dashboard shows no orders for yesterday.** The raw files and the clean files for the date are in S3. The nightly job succeeded. The table is a normal partitioned table, and a crawler updates its partitions every Sunday.',
        clues: ['The folder `dt=2026-03-17/` exists in S3', 'The job log shows success and 1.2 million rows written', 'The crawler runs once a week'],
        opts: [
          { t: 'Register the missing partition now, and make the job register new partitions itself', fb: '' },
          { t: 'Re-run the nightly job to create the data again', fb: 'The data is already there. The catalog does not know about it, so a re-run changes nothing.' },
          { t: 'Delete the table and recreate it from the dashboard', fb: 'This removes the definition that other queries use and fixes only today.' },
          { t: 'Increase the Athena query timeout', fb: 'The query is not slow. It finds no partition for that day.' }
        ],
        best: 0,
        why: 'The files exist, but a partition is visible to queries only after it is in the catalog, and the weekly crawler has not run since. Run `ALTER TABLE ... ADD PARTITION` or the repair command now, then make the job add its own partition at the end of every run, or switch the table to partition projection.',
        checks: [
          ['Compare S3 and the catalog', 'List the partitions of the table and the folders in S3. The 17th is in S3 only.'],
          ['Check the schedule', 'The crawler runs weekly, so any day after the last run is missing.'],
          ['Fix today', 'Register the partition so the dashboard shows the data.'],
          ['Fix the cause', 'Have the job register its partition, or use partition projection for the date column.'],
          ['Alarm on the gap', 'Compare the newest partition with today and alert when it is more than a day behind.']
        ],
        tell: 'Yesterday was missing from the dashboard because the new partition folder existed in S3 but not in the Glue Data Catalog. A crawler updated partitions only on Sundays. I registered the partition by hand to restore the dashboard, then changed the nightly job to add its own partition at the end of each run. We also check the newest partition against the date every morning and alert when the gap is more than a day.',
        prevent: ['Have each job **register its own partition**', 'Use **partition projection** for date columns', 'Alert when the **newest partition is stale**', 'Do not rely on a **weekly crawler** for a daily table']
      }),

      B.incident({
        id: 'm4-inc2', t: 2, src: 'docs', title: 'Incident: the Glue bill tripled', time: '11:00',
        alert: '**The Glue line of the bill tripled in a month, and the nightly job now runs for 3 hours instead of 5 minutes.** Nobody changed the code. Last week the loader started writing to a new table location, and a teammate recreated the catalog table to match.',
        clues: ['The job reads the raw table with no push-down predicate', 'The new table definition has no partition keys', 'The raw data now holds three years of files'],
        opts: [
          { t: 'Restore the partition keys on the table and read only the run-date partition', fb: '' },
          { t: 'Double the number of workers', fb: 'More workers finish the useless work faster and bill about the same DPU-hours. The job should not read three years at all.' },
          { t: 'Move the raw data to Glacier', fb: 'The job would fail on archived objects, and the question is what it reads.' },
          { t: 'Turn off the bookmark', fb: 'The bookmark was not the problem. Without partition keys there was nothing to push the date filter into.' }
        ],
        best: 0,
        why: 'The recreated table has no partition keys, so the push-down predicate `dt = ...` has nothing to match and the job reads every file. Three years of data instead of one day multiplies the work by about a thousand. Restore the partition keys and register the partitions, and the job reads one day again.',
        checks: [
          ['Compare the runtime', '5 minutes became 3 hours. Look at what changed in the input.'],
          ['Check the data read', 'The job metrics show the bytes read are far larger than before.'],
          ['Read the table definition', 'The new definition has no partition keys, so the predicate cannot prune.'],
          ['Fix the table', 'Recreate it with the keys, register the partitions, and run the job for one day.'],
          ['Protect it', 'Keep table definitions in templates, and add a check for the bytes read by each run.']
        ],
        tell: 'The Glue bill tripled because the nightly job started to read every file. A teammate had recreated the raw table without its partition keys, so the push-down predicate no longer pruned anything and the job read three years of data instead of one day. I restored the partition keys, registered the partitions, and the job went back to five minutes. Table definitions now live in templates, and we alarm when a run reads far more bytes than usual.',
        prevent: ['Keep **table definitions in templates**', 'Alarm on **bytes read** and **runtime** of each run', 'Use **push-down predicates** on every partitioned read', 'Review **catalog changes** like code changes']
      }),

      B.qa({
        id: 'qa-glue', t: 1, tag: 'Glue', secs: 60,
        q: 'What is AWS Glue, and what are its main parts?',
        pts: ['The Data Catalog: table definitions shared by all engines', 'Crawlers that infer schemas', 'ETL jobs: serverless Spark, billed in DPU-hours', 'Triggers and workflows for light orchestration', 'Data Quality rules', 'Integrates with Athena, Redshift Spectrum, EMR and Lake Formation'],
        short: 'Glue is AWS data integration. The most used part is the Data Catalog, a central store of table definitions with columns, partitions and locations. Athena, Redshift Spectrum, EMR and Glue jobs all read it, so the schema lives in one place.\n\nGlue ETL jobs run Spark scripts on managed workers. I choose a worker type and a number of workers and pay for DPU-hours while the job runs, so there is no cluster to patch. Crawlers scan S3 and infer a schema, which is good for exploring and risky in production. Triggers and workflows chain jobs, and Glue Data Quality lets me check a table with rules.\n\nFor bigger orchestration I use Step Functions or Airflow. For SQL-only transformations, Athena can be simpler than a Glue job.',
        fu: [
          ['What does the catalog not store?', 'The data. It stores definitions and the location of the files. Dropping an external table leaves the files in place.'],
          ['What is a DynamicFrame?', 'A Glue record collection that copes with columns whose type varies between records. I convert it to a Spark DataFrame to use the full Spark API.']
        ],
        trap: 'Describing Glue as only an ETL tool. The catalog is the part that every other service depends on.',
        real: 'Describe a Glue job you wrote or tuned, and its DPU-hours before and after.'
      }),

      B.qa({
        id: 'qa-catalog', t: 1, tag: 'Glue', secs: 60,
        q: 'What is the Glue Data Catalog, and how do partitions get into it?',
        pts: ['A central store of table definitions, compatible with the Hive metastore', 'It points at files in S3 and does not store data', 'Partitions are folders that must be registered', 'Register with a crawler, ADD PARTITION, MSCK REPAIR, or the job itself', 'Or use partition projection in Athena', 'A stale partition list is the usual cause of "missing data"'],
        short: 'The Data Catalog stores the definitions of databases and tables: columns, formats, partition keys and the S3 location. It is compatible with the Hive metastore, so Athena, Redshift Spectrum, EMR and Glue jobs use it. It points at the files and does not hold data.\n\nPartitions are folders such as `dt=2026-03-14/`, but a folder does not count until it is registered. I can run a crawler, `ALTER TABLE ADD PARTITION`, `MSCK REPAIR TABLE`, or let the job register its partition when it finishes, which is what I prefer. For date columns I can use partition projection in Athena, so no partitions are stored and nothing can go stale.\n\nWhen analysts say data is missing, the first thing I check is whether the new partition is registered. Filter expressions on partitions run in the catalog, so only matching partitions go back to the engine.',
        fu: [
          ['What happens when you add a column?', 'The table gets it, and a new table version is kept. Existing partitions keep their own column list, and Parquet files without the column read it as NULL. Changing a type is the dangerous case.'],
          ['Crawler or explicit tables?', 'A crawler for exploring. Explicit definitions in templates for production, because a crawler can change a schema without anyone asking.']
        ],
        trap: 'Believing that writing a folder to S3 makes the data queryable. The catalog must know about it, or the table must use projection.',
        real: 'Describe a time a partition was missing and how you made sure it could not happen again.'
      }),

      B.qa({
        id: 'qa-bookmark', t: 2, tag: 'Glue', secs: 90,
        q: 'How do Glue job bookmarks work, and when do they fail?',
        pts: ['They remember what earlier runs read', 'For S3, the last-modified time of the objects', 'Need job-bookmark-enable, a transformation_ctx on each read, and job.commit()', 'Files rewritten in place are read again', 'JDBC bookmarks find new rows, not changed rows', 'Not exactly once: make writes safe to repeat'],
        short: 'A bookmark stores what earlier runs of a job have already read, so the next run reads only what is new. For S3 sources, Glue compares the last-modified time of the objects. For JDBC sources it uses the highest value of a key column.\n\nTo work, the job needs the option `job-bookmark-enable`, a `transformation_ctx` name on every read, and a `job.commit()` at the end. A read without a name has no state, so every run starts over.\n\nBookmarks fail quietly in a few cases. A file that is replaced in place gets a new modification time and is read again. A changed source path under the same name keeps the old state. JDBC bookmarks miss updated rows.\n\nThey are also not exactly once. A job that fails after writing and before committing writes the same output again, so I write to a deterministic partition and overwrite only that partition. When I need exact control I pass the run date and filter on it myself.',
        fu: [
          ['How do you reprocess a day?', 'Rewind the bookmark or run with a parameter for that date, and overwrite that date partition so the result is the same.'],
          ['What do you use instead for CDC?', 'A table format such as Iceberg, or DMS into S3 with a change column, and a merge. A bookmark only finds new rows.']
        ],
        trap: 'Treating a bookmark as a guarantee. It is a convenience for append-only files.',
        real: 'Describe a job that reprocessed data by accident and what stopped it.'
      }),

      B.qa({
        id: 'qa-glueemr', t: 2, tag: 'Glue', secs: 90,
        q: 'When would you choose EMR over Glue, and Athena over both?',
        pts: ['Athena for SQL-only transformations and queries, with nothing to run', 'Glue for Python logic, the catalog, bookmarks and no clusters', 'EMR for other engines, deep tuning, custom libraries or very large steady loads', 'EMR Serverless removes cluster work but keeps Spark control', 'Cost models differ: bytes scanned, DPU-hours, vCPU and memory hours', 'Start with the simplest tool that meets a measured need'],
        short: 'I start with the simplest tool. If the logic is SQL and the data is moderate, Athena does it with a scheduled `INSERT INTO` or CTAS and nothing to operate, and I pay for the bytes it scans.\n\nWhen I need Python code, custom logic, bookmarks or tight catalog integration, I use a Glue job. Workers start for the run, I pay for DPU-hours, and there is no cluster.\n\nI choose EMR for what Glue does not give: engines such as Hive, Presto or Flink, deep tuning, custom libraries or images, or very large steady workloads where Spot instances on EC2 make it cheaper. EMR Serverless gives Spark without cluster work, billed by vCPU and memory hours.\n\nI decide with a measured need, for example a job that exceeds an Athena limit or costs more on Glue than on tuned EMR, not with a preference. The cost of a team operating a cluster counts too.',
        fu: [
          ['What are the limits of Athena for transformations?', 'A single query has a time limit, and a query that writes partitions has a limit on how many it can write at once. Check the current numbers before you rely on it.'],
          ['How do you cut EMR cost?', 'Transient clusters that stop after the job, Spot instances for task nodes, right-sized instances, and EMR Serverless for spiky loads.']
        ],
        trap: 'Choosing Spark for everything. A SQL statement on Athena is often cheaper and simpler.',
        real: 'Describe a workload you moved between engines and the numbers behind the move.'
      }),

      B.qa({
        id: 'qa-lf', t: 2, tag: 'Glue', secs: 60,
        q: 'What does Lake Formation add on top of IAM?',
        pts: ['Grants on databases, tables and columns, not on S3 paths', 'LF-tags to grant by label', 'Row and column filters', 'Cross-account sharing through the catalog', 'The engine enforces it: Athena, Redshift Spectrum, EMR, Glue', 'IAM and Lake Formation must both allow'],
        short: 'IAM controls access to services and to S3 paths. Lake Formation controls access to the tables and columns in the Data Catalog. I grant `SELECT` on a table or on some columns to a role, and the engine asks Lake Formation, which hands out temporary access to only the files that the grant covers.\n\nI use LF-tags to grant by label, for example everything tagged `sensitivity=public`, so new tables are covered when they are tagged. Data filters hide columns or rows, for example the e-mail column. Cross-account sharing happens through the catalog, so I do not copy data or write long bucket policies.\n\nIt works together with IAM, not instead of it. The caller needs IAM permission to call the service, and the grant in Lake Formation. Not every engine and version supports every feature, so I check before I promise fine-grained control.',
        fu: [
          ['Why add a second layer to IAM and bucket policies?','They work on paths. With many tables and columns, a table-level grant model is easier to reason about and to audit.'],
          ['What is a common failure?', 'A role that has the IAM permission and S3 access but no Lake Formation grant, and fails with AccessDenied on the table.']
        ],
        trap: 'Believing that Lake Formation replaces IAM. A request needs both layers to allow it.',
        real: 'Describe a grant model you set up, and how you tested that it hid what it should.'
      }),

      B.qa({
        id: 'qa-schema', t: 2, tag: 'Glue', secs: 90,
        q: 'How do you handle schema evolution in a data lake on AWS?',
        pts: ['Add columns at the end, never change a type in place', 'The catalog keeps table versions, and partitions keep their own schema', 'Parquet is read by column name, so a new column is NULL in old files', 'A type change breaks queries: write a new column or table', 'Iceberg handles evolution in the table metadata', 'Contracts and checks at the boundary of each zone'],
        short: 'I treat the schema as a contract at each zone boundary. Adding a column at the end is safe: the catalog gets the new column and keeps the old table version, and old files read it as NULL because Parquet is read by column name. I recorded that existing partitions keep their own column list, so I check them when a query shows odd results.\n\nChanging a type or the meaning of a column is not safe. Partitions that disagree with the table raise errors such as a partition schema mismatch. For a type change I write a new column or a new table and migrate readers.\n\nA table format such as Iceberg keeps the schema in the table metadata and supports add, rename and reorder without breaking old files. For streams I use the Glue Schema Registry or the schema in Avro files.\n\nI also put checks at the boundary, such as Glue Data Quality rules, so a surprise from a source stops at raw and does not reach curated.',
        fu: [
          ['What do you do when a source renames a column?', 'Keep the old column in raw as received, map the new name in the clean job, and tell the consumers. Never rename in place.'],
          ['How do you find a breaking change early?', 'A schema check or a data quality rule on the raw zone, which fails the pipeline with a clear message.']
        ],
        trap: 'Letting a crawler rewrite the schema every run. Schema changes should be decisions in code review.',
        real: 'Describe a schema change that broke a query, and how you fixed the process.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Catalog Keeper', color: '#BBF7D0',
        pts: [
          'The **Data Catalog** stores definitions and locations, not data. Every engine reads the same one.',
          'A folder is **not a partition until it is registered**, unless the table uses **partition projection** in Athena.',
          'A schema change updates the table and leaves **old partitions on the old columns**. Add columns, do not change types.',
          'A Glue job needs a **context name on each read**, an **enabled bookmark** and **job.commit()**. A bookmark is not exactly once.',
          'Cost is **DPU-hours**: workers times hours. Use auto scaling with a maximum, a timeout and **push-down predicates**.',
          'Choose **Athena, Glue or EMR** by the logic and the need. **Lake Formation** adds table and column grants next to IAM.'
        ],
        lines: [
          'I register the partition before I say the data is there.',
          'I measure DPU-hours before I choose bigger workers.',
          'I choose the simplest engine that meets the need.'
        ]
      })
    ]
  });
})();
