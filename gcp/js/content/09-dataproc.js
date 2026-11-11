/* Mission 9: Spark on Google Cloud. Dataproc clusters and Serverless Spark, Cloud Storage instead of HDFS, the BigQuery connector, and the four things that decide the cost and the
   speed of a Spark job: what the plan reads, how many tasks a shuffle makes, how many files a write makes, and skew. A real PySpark job was run in LOCAL MODE on this machine
   (made-up orders, 60,000 rows) and its plan, task counts, files and partitions were recorded. There was no cluster, no Dataproc, no YARN, no Cloud Storage and no BigQuery
   connector: how Dataproc runs Spark, its prices and the connector options are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PR = G.counts('spark.pruning'), SH = G.counts('spark.shuffle'), SF = G.table('spark.small_files'), SK = G.counts('spark.skew'), JN = G.counts('spark.join'), WR = G.counts('spark.written');
  var CODE = G.file('code/spark_job.py'), FL = G.table('cli.flags');
  G.expect(PR.all_days.PartitionFilters === 'none' && /dt = 2026-11-03/.test(PR.one_day.PartitionFilters) && PR.one_day.ReadSchema === 'struct<store_id:string,total_cents:int>' && WR.partitions === 10, 'the pruning plan');
  G.expect(SH.shuffle_partitions_setting === 200 && SH.tasks_per_stage_without_aqe[0] === 200 && SH.tasks_per_stage_with_aqe[0] < 10, 'the shuffle tasks');
  G.expect(SF.rows.length === 3 && SF.rows[0][1] === 200 && SF.rows[1][1] === 4 && SF.rows[2][1] === 1, 'the file counts');
  G.expect(SK.by_store.largest_over_median > 3 && SK.by_store_and_salt.largest_over_median < SK.by_store.largest_over_median && JN.small_table_join === 'BroadcastHashJoin' && JN.threshold_off_join === 'SortMergeJoin', 'the skew and the join');
  var dpc = FL.rows.filter(function (r) { return r[0] === 'gcloud dataproc clusters create'; })[0], dpb = FL.rows.filter(function (r) { return r[0] === 'gcloud dataproc batches submit pyspark'; })[0];
  G.expect(dpc[2] === '-' && dpb[2] === '-' && /delete-max-idle/.test(dpc[1]), 'the Dataproc flags exist');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var GC = [
    'gcloud dataproc clusters create orders-nightly \\',
    '  --region=asia-southeast1 \\',
    '  --image-version=2.2-debian12 \\',
    '  --num-workers=2 --num-secondary-workers=4 \\',
    '  --autoscaling-policy=orders-policy \\',
    '  --delete-max-idle=30m \\',
    '  --properties=spark:spark.sql.adaptive.enabled=true',
    '',
    'gcloud dataproc batches submit pyspark gs://brewline-code-dev/orders_job.py \\',
    '  --region=asia-southeast1 \\',
    '  --deps-bucket=brewline-tmp-dev \\',
    '  --service-account=sa-pipeline@brewline-dev.iam.gserviceaccount.com \\',
    '  --subnet=data \\',
    '  --version=2.2'
  ].join('\n');
  var BQ = [
    'orders = (spark.read.format("bigquery")',
    '          .option("table", "brewline-dev.curated.orders")',
    '          .option("filter", "order_ts >= \'2026-11-04 16:00:00\' AND order_ts < \'2026-11-05 16:00:00\'")',
    '          .load())',
    '',
    'daily = orders.groupBy("store_id").sum("total_cents")',
    '',
    '(daily.write.format("bigquery")',
    '      .option("writeMethod", "direct")',
    '      .mode("overwrite")',
    '      .save("brewline-dev.staging.daily_by_store"))'
  ].join('\n');
  var BUGW = [
    'orders = spark.read.parquet("gs://brewline-landing-dev/orders/")',
    'cleaned = orders.where("status != \'CANCELLED\'")',
    'cleaned.repartition(200).write.mode("overwrite").parquet("gs://brewline-staging-dev/orders/")'
  ].join('\n');
  var FIXW = [
    'orders = spark.read.parquet("gs://brewline-landing-dev/orders/")',
    'cleaned = orders.where("status != \'CANCELLED\'")',
    'cleaned.repartition(4).write.mode("overwrite").parquet("gs://brewline-staging-dev/orders/")'
  ].join('\n');
  var BUGS = [
    'daily = (orders.repartition("store_id")',
    '               .groupBy("store_id")',
    '               .agg(F.sum("total_cents").alias("revenue_cents")))',
    'daily.write.mode("overwrite").parquet(out_path)'
  ].join('\n');
  var FIXS = [
    'salted = orders.withColumn("salt", F.pmod(F.hash("order_id"), F.lit(4)))',
    'partial = salted.groupBy("store_id", "salt").agg(F.sum("total_cents").alias("part"))',
    'daily = partial.groupBy("store_id").agg(F.sum("part").alias("revenue_cents"))',
    'daily.write.mode("overwrite").parquet(out_path)'
  ].join('\n');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Spark on Google Cloud: Dataproc and serverless', short: 'Spark', blurb: 'Clusters and serverless, Cloud Storage and the BigQuery connector, partition pruning, shuffles, small files, skew and joins', minutes: 48,
    focus: ['stg', 'int'],
    goals: [
      'Choose between a **Dataproc cluster**, **Serverless Spark** and plain **BigQuery SQL**.',
      'Explain why storage lives in **Cloud Storage** and not in HDFS, and why clusters can be **ephemeral**.',
      'Read a Spark plan: **partition filters**, **read schema**, **shuffle** and **joins**.',
      'Fix **small files** and **skew**, the two usual reasons that a Spark job is slow or costly.',
      'Read and write BigQuery from Spark with the **connector**.',
      'Say how a **Hadoop** estate moves to Google Cloud.'
    ],
    say: 'Mission 9 is Spark, because many job descriptions list Dataproc, Spark or PySpark, and many companies arrive on Google Cloud with Spark code that already exists. I ran a real PySpark job in local mode on this machine and recorded its plan, its task counts, the files it wrote and its skew. There was no cluster, so how Dataproc and Serverless Spark run it, and what they cost, come from documentation. The four things you learn here, what the plan reads, how a shuffle splits, how many files a write makes, and skew, are the same on any cluster.',
    scenes: [
      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'A nightly Spark job on an ephemeral cluster', g: 'dataproc', legend: true,
        steps: [
          { say: 'A nightly Spark job on Google Cloud usually has this shape: a cluster is created for the job and deleted after it, so you pay for the run and not for the night. Press Next to follow it. The alternative, in the corner of the picture, is to skip the cluster.', cap: 'Create, run, delete.' },
          { say: 'Step 1. The schedule lives in **Composer**. At the start of the run a task creates a **Dataproc cluster**: a master, a few workers, and often cheaper secondary workers on spot VMs. Creating one takes about a couple of minutes.', on: ['k1'], focus: ['sp_dag', 'sp_create'], cap: 'Composer creates the cluster.' },
          { say: 'Step 2. The **Spark job** is submitted to the cluster. Its code sits in a bucket, and the job gets the cluster\'s resources for as long as it runs.', on: ['k2'], focus: ['sp_create', 'sp_job'], cap: 'The job is submitted.' },
          { say: 'Step 3. The job reads and writes **Cloud Storage** through the `gs://` connector, and **BigQuery** through the BigQuery connector. The **data does not live in the cluster**. This is what makes the next step possible.', on: ['k4', 'k5'], focus: ['sp_job', 'sp_gcs', 'sp_bq'], cap: 'Data lives in Cloud Storage and BigQuery.' },
          { say: 'The table definitions can live in a **Metastore**, a managed Hive-compatible catalogue, so that any cluster sees the same tables.', on: ['k6'], focus: ['sp_meta', 'sp_job'], cap: 'A metastore holds the table definitions.' },
          { say: 'Step 4. When the job ends, Composer **deletes the cluster**. Nothing is lost, because nothing lived there. **Serverless Spark** goes one step further: you submit the job as a batch, and there is no cluster to create or delete.', on: ['k3', 'k7'], focus: ['sp_job', 'sp_del', 'sp_srv'], cap: 'Delete the cluster, or never have one.' }
        ]
      }),

      B.cmp({
        id: 'm9-which', t: 1, src: 'docs', title: 'Dataproc cluster, Serverless Spark or SQL',
        say: 'Three ways to run a transformation on Google Cloud, and when each fits. Press Next to read the pattern.',
        cols: ['Option', 'You manage', 'Good for', 'Watch out for'],
        hl: 2,
        rows: [
          ['Dataproc cluster', 'the cluster: size, image, autoscaling, deletion', 'Existing Spark and Hadoop jobs, special libraries, long interactive work, control of the machines', 'A cluster that nobody deletes costs money all night'],
          ['Serverless Spark (batches)', 'only the job and its settings', 'A scheduled Spark job with no need for a cluster of your own', 'Less control of the environment, and cold start for each batch'],
          ['BigQuery SQL', 'nothing', 'Anything that SQL can express over data in BigQuery', 'Logic that needs loops or libraries']
        ],
        steps: [
          { upto: 1, say: 'A cluster gives control and asks for care: create it, size it, and delete it.' },
          { upto: 2, say: 'Serverless Spark removes the cluster. You still write Spark, and you pay for the run.' },
          { upto: 3, say: 'If it is SQL in disguise, run it in BigQuery. Spark is for what SQL cannot do, or for code that already exists.' }
        ],
        pick: 'Try **SQL first**. Choose **Serverless Spark** for Spark code that runs on a schedule. Choose a **cluster** when you need the control: a library, a special machine, or a long interactive session.'
      }),

      B.talk({
        id: 'm9-ephemeral', t: 1, src: 'docs', title: 'Why a cluster can be thrown away',
        say: 'The big idea of Spark on Google Cloud is that the cluster holds no data. Press Next for what follows from it.',
        items: [
          ['Storage is separate', 'On an old Hadoop cluster, data lived in **HDFS** on the machines, so the cluster had to stay up. On Google Cloud, data lives in **Cloud Storage** (and BigQuery). The cluster is compute only. Delete it and the data is untouched.', 'Compute and storage are separate.'],
          ['Ephemeral clusters', 'So create a cluster for **one job**, with the size that job needs, and delete it afterwards. A scheduled deletion after an idle time (the `--delete-max-idle` flag) is a safety net for the day that someone forgets.', 'Pay for the run, not the night.'],
          ['Autoscaling and spot VMs', 'An **autoscaling policy** adds and removes workers with the load. **Secondary workers** on spot VMs are cheap and can disappear at any time, so they hold no HDFS data: they are for compute that can be redone.', 'Cheap workers for work that can be repeated.'],
          ['Setup and images', 'A **Dataproc image version** fixes the versions of Spark and Hadoop. **Initialization actions** install extras when a cluster starts. A slow start is a hint to build a custom image. Keep the image version in code, and test an upgrade before you move.', 'Fix the versions, and keep them in code.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A sign of a design that has not moved:', t: 'a cluster that runs for weeks with HDFS holding the only copy of the data. It is a data center in the cloud, with the costs of both.' }
      }),

      B.talk({
        id: 'm9-conn', t: 1, src: 'docs', title: 'Reading and writing: Cloud Storage and BigQuery',
        say: 'Spark on Google Cloud talks to two storage systems. Press Next for each.',
        items: [
          ['Cloud Storage', 'The **Cloud Storage connector** makes `gs://bucket/path` work like a file system path, for Parquet, Avro, ORC and CSV. It is on Dataproc images by default. Partition folders such as `dt=2026-11-03` are partitions for Spark, as in the next lab.', 'gs:// paths work everywhere.'],
          ['BigQuery', 'The **spark-bigquery connector** reads a table with the BigQuery **Storage Read API**, in parallel, and pushes **column selection and filters** down, so that BigQuery does the pruning. It writes either **directly** (the Storage Write API) or **indirectly** (files in a temporary bucket and a load job).', 'BigQuery prunes, then Spark reads.'],
          ['Which one to use', 'Use **Cloud Storage** for the lake and for intermediate files. Use the **BigQuery connector** when the source or the result is a table that people query with SQL. Do not read a BigQuery table through a full export if the connector can push the filter.', 'Files for the lake, a connector for tables.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm9-lab', kind: 'spark', t: 1, src: 'rec', title: 'Lab: what a Spark job reads, shuffles and writes' }),

      B.code({
        id: 'm9-job', t: 1, src: 'rec', title: 'The Spark job that made the recordings', file: 'spark_job.py', lang: 'python', code: CODE,
        steps: [
          { say: 'This is a real PySpark job. I ran it in local mode on this machine, on made-up orders, and it prints the results that the lab shows. A cluster runs the same Spark. Press Next for the five experiments.', lines: null },
          { say: 'First the data: ' + n0(60000) + ' orders over 10 days, with store s01 holding about a third of them. It is written as Parquet in one folder for each day, which is **' + WR.partitions + ' partitions** and ' + WR.files + ' files.', lines: G.span(CODE, /^# 60,000 orders/, /orders\.write\.partitionBy/) },
          { say: '**1. What the plan reads.** The job asks Spark to explain the plan, and picks out the partition filter and the read schema, for all days and for one day.', lines: G.span(CODE, /^# 1\. What the plan reads/, /'one_day': \{'PartitionFilters'/) },
          { say: '**2. A shuffle.** It runs a group by with 200 shuffle partitions, without and with **adaptive query execution**, and counts the tasks of each stage through the status tracker.', lines: G.span(CODE, /^# 2\. How many tasks/, /^out\['shuffle'\]/) },
          { say: '**3. Small files.** The same data is written three ways, and the files are counted: `repartition(200)`, `repartition(4)` and `coalesce(1)`.', lines: G.span(CODE, /^# 3\. Small files/, /^out\['small_files'\]/) },
          { say: '**4. Skew.** The rows are split by store, and then by store plus a salt, and the size of the biggest partition is compared with the median.', lines: G.span(CODE, /^# 4\. Skew/, /^out\['skew'\]/) },
          { say: '**5. A join.** The orders are joined with a table of 12 stores, with the default broadcast threshold and with it turned off.', lines: G.span(CODE, /^# 5\. A join/, /'threshold_off_join'/) }
        ],
        note: 'Recorded with PySpark ' + G.meta('pyspark') + ' in local mode (two cores). On a cluster the numbers of tasks and the timings differ, and the plan and the rules are the same.'
      }),

      B.rows({
        id: 'm9-prune', t: 1, src: 'rec', title: 'What the plan reads: folders and columns',
        steps: [
          {
            say: 'The query asks for the sum by store. With **no filter** the plan reads all **' + WR.partitions + '** day folders, and only the columns it needs: `' + PR.all_days.ReadSchema + '`. The other two columns of the files, the order id and the folder name, are not read.',
            tabs: [{ layer: 'RECORDED', name: 'The plan lines for all days', c: 'raw', cols: ['plan line', 'value'], rows: [['PartitionFilters', PR.all_days.PartitionFilters], ['ReadSchema', PR.all_days.ReadSchema]], trk: 0 }],
            notes: ['Recorded: the formatted plan of the Spark ' + G.meta('pyspark') + ' query. "none" means that the plan has no partition filter, so every folder is read.']
          },
          {
            say: 'With `WHERE dt = \'2026-11-03\'` the plan gets a **partition filter**: `' + PR.one_day.PartitionFilters + '`. Spark opens **one** folder out of ' + WR.partitions + '. The columns read are the same two. This is the Spark twin of the BigQuery partition filter of mission 5.',
            tabs: [{ layer: 'RECORDED', name: 'The plan lines for one day', c: 'raw', cols: ['plan line', 'value'], rows: [['PartitionFilters', PR.one_day.PartitionFilters], ['ReadSchema', PR.one_day.ReadSchema]], trk: 0 }],
            notes: ['The folder layout `dt=...` is what makes this possible. A layout that does not match the filters leaves Spark reading everything.']
          }
        ]
      }),

      B.rows({
        id: 'm9-shuffle', t: 1, src: 'rec', title: 'A shuffle makes as many tasks as the setting says',
        steps: [
          {
            say: 'Adding up twelve stores needs a shuffle. The setting `spark.sql.shuffle.partitions` was **' + SH.shuffle_partitions_setting + '**, so the shuffle stage ran **' + SH.tasks_per_stage_without_aqe[0] + '** tasks, almost all of them for no data. The stages of the job had these task counts: **' + SH.tasks_per_stage_without_aqe.join(', ') + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Tasks in each stage of the group by', c: 'raw', cols: ['adaptive execution', 'tasks in each stage'], rows: [['off', SH.tasks_per_stage_without_aqe.join(', ')], ['on', SH.tasks_per_stage_with_aqe.join(', ')]], trk: 0 }],
            notes: ['Recorded with the job status tracker of Spark ' + G.meta('pyspark') + '. Tiny tasks are cheap one by one and wasteful together: each has a scheduling cost.']
          },
          {
            say: 'With **adaptive query execution** on, Spark looks at the size of the data after the shuffle, and **merges** the small partitions. The task counts became **' + SH.tasks_per_stage_with_aqe.join(', ') + '**. You do not tune the number by hand for each job: you leave AQE on, and set the shuffle partitions as an upper bound.',
            tabs: [{ layer: 'RULE', name: 'What to set', c: 'raw', cols: ['Setting', 'Advice'], rows: [['spark.sql.adaptive.enabled', 'leave it on'], ['spark.sql.shuffle.partitions', 'an upper bound, larger for big data'], ['a very big shuffle', 'more partitions, so that each fits in memory']], trk: 0 }],
            notes: ['Both numbers (200 and merged) are from this local run. The shape is the same on a cluster: a fixed number of partitions is wrong for most jobs, and AQE makes it right at run time.']
          }
        ]
      }),

      B.rows({
        id: 'm9-files', t: 1, src: 'rec', title: 'One task, one file: the small file problem',
        steps: [
          {
            say: 'A write makes **one file for each task**. The same 60,000 rows, written three ways: `repartition(200)` made **' + SF.rows[0][1] + ' files** of about ' + SF.rows[0][3] + ' KB each, `repartition(4)` made **' + SF.rows[1][1] + '** of about ' + SF.rows[1][3] + ' KB, and `coalesce(1)` made **' + SF.rows[2][1] + '** of about ' + SF.rows[2][3] + ' KB. The total size is not the same: many small files compress worse.',
            tabs: [{ layer: 'RECORDED', name: 'The same rows, three writes', c: 'raw', cols: SF.cols, rows: SF.rows, trk: 0 }],
            notes: ['Recorded with PySpark ' + G.meta('pyspark') + '. Sizes are rounded to whole kilobytes. On real data aim for files of tens to hundreds of megabytes.']
          },
          {
            say: 'Why does it matter? Every file costs a **listing**, an **open** and a **task** for the next reader, and Cloud Storage bills operations. Thousands of tiny files make the next job slow, and BigQuery loads and external tables slow too. One huge file cannot be read in parallel. The fix is to choose the number of output files on purpose.',
            tabs: [{ layer: 'RULE', name: 'Choosing the number of files', c: 'raw', cols: ['Want', 'Use'], rows: [['fewer files, with a shuffle', 'repartition(n)'], ['fewer files, no shuffle', 'coalesce(n) (it can only reduce)'], ['files by day folder', 'partitionBy and a repartition by the same column'], ['a target size', 'n = total size divided by about 256 MB']], trk: 0 }],
            notes: ['`coalesce(1)` gave one file and also one task for the whole write: it is fine for a small result and a bottleneck for a large one.']
          }
        ]
      }),

      B.rows({
        id: 'm9-skew', t: 1, src: 'rec', title: 'Skew: one key, one slow task',
        steps: [
          {
            say: 'Split the rows **by store**, and the biggest partition holds **' + n0(SK.by_store.largest) + '** rows while the median holds **' + n0(SK.by_store.median) + '**: **' + SK.by_store.largest_over_median + ' times** the median. Store s01 has **' + Math.round(SK.share_of_s01 * 100) + '%** of the rows, and all of them go to one partition and one task. The stage ends when that task ends.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in the partitions', c: 'raw', cols: ['split', 'biggest', 'median', 'biggest over median'], rows: [['by store', n0(SK.by_store.largest), n0(SK.by_store.median), SK.by_store.largest_over_median], ['by store and a salt of 4', n0(SK.by_store_and_salt.largest), n0(SK.by_store_and_salt.median), SK.by_store_and_salt.largest_over_median]], trk: 0 }],
            notes: ['Recorded: rows counted in each partition after a repartition into 8 partitions. The same thing happens in a join on a hot key, and in a group by.']
          },
          {
            say: 'A **salt** spreads the hot key. Add a small value from a hash to the key, so that s01 is cut into four keys. Group by store and salt first, then add the parts together by store. In the recording the biggest partition fell to **' + SK.by_store_and_salt.largest_over_median + ' times** the median.',
            tabs: [{ layer: 'RULE', name: 'Ways to deal with skew', c: 'raw', cols: ['Way', 'How it helps', 'Cost'], rows: [['a salt', 'cuts the hot key into several keys', 'a second aggregation step'], ['broadcast the small side of a join', 'no shuffle of the big side', 'the small side must fit in memory'], ['filter the hot key and handle it alone', 'two simple paths', 'more code'], ['adaptive skew join', 'Spark splits skewed partitions of a join by itself', 'depends on the version and the data']], trk: 0 }],
            notes: ['Adaptive query execution also has a **skew join** setting. Check that it is on, and measure before you add salts by hand.']
          }
        ]
      }),

      B.rows({
        id: 'm9-join', t: 1, src: 'rec', title: 'A join with a small table',
        steps: [{
          say: 'Joining the orders to a table of 12 stores used a **' + JN.small_table_join + '** under the default threshold of ' + (JN.default_threshold_bytes / 1048576) + ' MiB: the small table is **sent to every worker**, and the big table is not shuffled. With the threshold turned off, Spark used a **' + JN.threshold_off_join + '**: both sides are sorted and shuffled. The result is the same, and the work is not.',
          tabs: [{ layer: 'RECORDED', name: 'The join chosen by the plan', c: 'raw', cols: ['setting', 'join in the plan'], rows: [['default broadcast threshold (10 MiB)', JN.small_table_join], ['threshold turned off', JN.threshold_off_join]], trk: 0 }],
          notes: ['Recorded from the formatted plans of Spark ' + G.meta('pyspark') + '. You can also force a broadcast with a hint, when you know that one side is small and the statistics do not.']
        }]
      }),

      B.code({
        id: 'm9-bq', t: 1, src: 'docs', title: 'PySpark with BigQuery', file: 'bq_job.py', lang: 'python', code: BQ,
        steps: [
          { say: 'This is how a job reads a BigQuery table and writes the result back with the connector. It is from the documentation of the connector, and I did not run it. The names of the options are the ones I know: check the README of the connector version on your image. Press Next.', lines: null },
          { say: 'The `bigquery` format reads a table. The `filter` option is **pushed down**: BigQuery applies it, so only the rows of that Singapore day leave BigQuery. The columns that the job uses are pushed down too.', lines: G.span(BQ, /spark\.read\.format/, /\.load\(\)/) },
          { say: 'The transformation is ordinary Spark: a sum by store. Spark does the work on the rows that the connector gave it.', lines: G.span(BQ, /^daily = /) },
          { say: 'The write goes to BigQuery. The **direct** method uses the Storage Write API and needs no staging bucket. The **indirect** method writes files to a temporary bucket and runs a load job, which suits big batches. The save mode decides what happens to an existing table.', lines: G.span(BQ, /daily\.write/, /\.save/) }
        ],
        note: 'The filter here is the pruning rule of mission 5: the partition column compared with constants. A filter that BigQuery cannot push down makes Spark read everything.'
      }),

      B.code({
        id: 'm9-gcloud', t: 2, src: 'docs', title: 'Creating a cluster, and submitting a serverless batch', file: 'dataproc.sh', lang: 'bash', code: GC,
        steps: [
          { say: 'These are the two ways to run the nightly job from the command line. I checked every flag against the help pages of the installed `gcloud`: ' + dpc[1].split(' ').length + ' flags of the cluster command and ' + dpb[1].split(' ').length + ' of the batch command exist. I did not run them. One needed a correction: the idle deletion flag is `--delete-max-idle`.', lines: null },
          { say: 'The cluster: a region, an image version that fixes Spark and Hadoop, two workers and four cheaper secondary workers, an autoscaling policy, and **deletion after 30 minutes idle**, so that a forgotten cluster does not run all night.', lines: G.span(GC, /clusters create/, /delete-max-idle/) },
          { say: 'A Spark property can be set when the cluster is created. The prefix `spark:` writes it to the Spark configuration.', lines: G.span(GC, /properties=spark/) },
          { say: 'The serverless batch needs no cluster: the code in a bucket, a region, a bucket for dependencies, the **service account** the job runs as, the subnet, and a runtime version.', lines: G.span(GC, /batches submit/, /--version/) }
        ],
        note: 'In production, Composer creates the cluster, submits the job and deletes the cluster with three operators, or submits the batch with one. Mission 10 shows that DAG.'
      }),

      B.cmp({
        id: 'm9-hadoop', t: 2, src: 'docs', title: 'Moving a Hadoop estate to Google Cloud',
        say: 'Many Spark jobs on Google Cloud arrive as a migration. Here is the usual mapping. Press Next to read the pattern.',
        cols: ['On premises', 'On Google Cloud', 'Note'],
        hl: 1,
        rows: [
          ['HDFS', 'Cloud Storage', 'Copy with a transfer service or a distributed copy. Change `hdfs://` paths to `gs://`'],
          ['Hive tables and the metastore', 'BigQuery tables, or a Dataproc Metastore', 'Move what people query to BigQuery. Keep a metastore for Spark and Hive jobs'],
          ['Spark and MapReduce jobs', 'Dataproc, Serverless Spark, or SQL', 'Lift and shift first, then rewrite the worthwhile ones as SQL'],
          ['Oozie or cron', 'Composer', 'Rewrite the workflows as DAGs'],
          ['HBase', 'Bigtable', 'The HBase API is compatible, and the row key design matters'],
          ['A permanent cluster', 'Ephemeral clusters', 'The point of the move: stop paying for idle machines']
        ],
        steps: [
          { upto: 2, say: 'Storage first: HDFS to Cloud Storage and Hive tables to BigQuery. Data has to be there before jobs can move.' },
          { upto: 6, say: 'Then the jobs and the schedule, and the permanent cluster becomes many short ones.' }
        ],
        pick: 'Do it in **two steps**. **Lift and shift** to get off the data center with little change, then **modernise**: move SQL-shaped jobs to BigQuery and let the rest run on ephemeral clusters or serverless.'
      }),

      B.talk({
        id: 'm9-tune', t: 2, src: 'docs', title: 'A checklist for a slow or costly Spark job',
        say: 'When a Spark job is slow, the cause is nearly always one of five things. Press Next for them in the order that I check.',
        items: [
          ['Read less', 'Is the data **partitioned** the way the filter asks, and is the format Parquet, so that only the needed columns are read? Look at the plan for the partition filter and the read schema, as in the lab.', 'Look at the plan first.'],
          ['Shuffle less', 'Is there a shuffle that could be a **broadcast join**? Is the **number of shuffle partitions** sensible, with AQE on? A big shuffle spills to disk when the partitions are too few.', 'A broadcast avoids a shuffle.'],
          ['Write sensibly', 'How many **files** does the write make, and how big? A thousand tiny files slow the next reader, and one huge file cannot be read in parallel.', 'One task, one file.'],
          ['Balance the work', 'Is one task far slower than the rest? That is **skew**: a hot key, or a null key. Compare the maximum task time with the median in the Spark UI.', 'Compare the slowest task with the median.'],
          ['Avoid the slow paths', 'Prefer the DataFrame API and built-in functions to Python UDFs, which move every row out of the JVM. Cache only what is used twice. Size executors so that they do not run out of memory and spill.', 'Built-in functions, not UDFs.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: how to run the nightly Spark job',
        scenario: 'The orders job runs for about 25 minutes every night and reads about 40 GB of Parquet. A colleague proposes to create a cluster once and keep it running, "so that it is always ready, and we do not wait for a start".',
        opts: [
          { t: 'A permanent cluster, always on', d: 'No start time. The cluster is there for anyone to use.', lose: 'It runs for 24 hours to do 25 minutes of work, so about 98 percent of the bill is idle time, and the cluster becomes a shared machine that drifts.' },
          { t: 'An ephemeral cluster, created by the Composer DAG, with idle deletion as a safety net, or a serverless batch', d: 'You pay for the run and a couple of minutes of start. Every night starts from a clean, versioned image.', lose: '' },
          { t: 'A bigger permanent cluster, so that the job finishes in five minutes', d: 'The job would be faster.', lose: 'It is the idle cost again, multiplied. Speed does not need the cluster to be always on.' }
        ],
        pick: 1,
        why: 'Storage is in Cloud Storage, so the cluster can be thrown away. A couple of minutes of start in a nightly job costs nothing, and the idle time you save is most of the bill.',
        when: 'For interactive work by many analysts all day, a long-lived cluster, or notebooks on serverless sessions, is a better fit.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, q: 'The next job in the pipeline got much slower after this step was added, and the listing of the output folder takes minutes. Click the line that causes it.',
        file: 'clean.py', lang: 'python', code: BUGW, bad: [3],
        hint: 'How many files does this write make?',
        why: '`repartition(200)` makes 200 tasks and so **200 files**. In the recording the 200-file write made files of about ' + SF.rows[0][3] + ' KB and took ' + SF.rows[0][2] + ' KB in total, against ' + SF.rows[1][2] + ' KB for four files. Choose the number of files from the size of the data: a few hundred megabytes in each.',
        fix: FIXW,
        cheer: 'One task, one file: choose the number.'
      }),

      B.bug({
        id: 'm9-bug2', t: 1, q: 'The stage of this job has 7 tasks that end in seconds and one that runs for twenty minutes. Click the line that sends all of one store to one place.',
        file: 'daily.py', lang: 'python', code: BUGS, bad: [1],
        hint: 'What does repartition by one column do to a store with a third of the rows?',
        why: 'Repartitioning by `store_id` sends every row of a store to the **same partition**. Store s01 holds about ' + Math.round(SK.share_of_s01 * 100) + '% of the rows, so one partition was **' + SK.by_store.largest_over_median + ' times** the median in the recording. A **salt** splits the hot key, and a second sum adds the parts.',
        fix: FIXS,
        cheer: 'Spread the hot key with a salt.'
      }),

      B.incident({
        id: 'm9-inc', t: 1, src: 'rec', title: 'Incident: the nightly job went from 25 minutes to 3 hours', time: '07:40',
        alert: '**The nightly Spark job on the orders table took three hours and missed the morning reports.** Nothing changed in the code. The cluster is the same size. In the Spark UI, one task of the last stage is still running, and all the others finished early.',
        clues: ['One task is far slower than the median', 'Store s01 opened two new branches and now has half of the orders', 'The job groups by store', 'The output folder has about 3,000 files'],
        opts: [
          { t: 'Find the hot key and spread it with a salt (and check adaptive skew handling), and reduce the number of output files', fb: '' },
          { t: 'Double the size of the cluster', fb: 'One task is slow, so the other workers are idle. More workers cannot make that task finish sooner.' },
          { t: 'Cache the input data', fb: 'The data is read once. A cache would only add memory pressure.' },
          { t: 'Rerun the job until it is fast', fb: 'It will have the same slow task every time, because the skew is in the data.' }
        ],
        best: 0,
        why: 'One slow task among fast ones is skew. The data changed (a store grew), and a partition by that key now holds half the rows. Spread the key, and fix the file count, which is a second, smaller cost.',
        checks: [
          ['Look at the stage', 'Compare the slowest task with the median, and the rows or bytes each task read.'],
          ['Find the key', 'Count rows by the grouping key. A key with half of them is the cause.'],
          ['Fix', 'A salt and a second aggregation, or a broadcast of the small side if it is a join.'],
          ['Prevent', 'A check on the skew of the biggest keys in the nightly summary, and an alert on the runtime.']
        ],
        tell: 'One store grew to half of the orders, and the job grouped by store, so one task did half of the work while the others idled. I added a salt and a second aggregation, repartitioned the output into a sensible number of files, and added the runtime and the size of the biggest key to the nightly summary.',
        prevent: ['Report the biggest keys after each run', 'Leave adaptive query execution on, including skew handling', 'Choose the number of output files on purpose']
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'Why can a Dataproc cluster be deleted after each job without losing the data?',
        opts: [
          { t: 'Dataproc copies the data to a backup first', fb: 'Nothing is copied. The data was never in the cluster.' },
          { t: 'The data lives in Cloud Storage or BigQuery, and the cluster is only compute', fb: '' },
          { t: 'HDFS survives the deletion', fb: 'HDFS lives on the cluster and goes with it.' },
          { t: 'It cannot: the data is lost', fb: 'Only if you stored the only copy in HDFS, which is the design to avoid.' }
        ],
        ok: 1,
        why: 'Separate storage and compute is the whole idea. It is what lets you pay for the run and not the night.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'You write a DataFrame with `repartition(200)`. How many output files do you expect?',
        opts: [
          { t: 'One', fb: 'That would be coalesce(1).' },
          { t: 'About 200, one for each task', fb: '' },
          { t: 'Ten, one for each day', fb: 'That needs partitionBy on the day, and this write has none.' },
          { t: 'It depends on the cluster size', fb: 'The number of files follows the number of tasks, not the number of machines.' }
        ],
        ok: 1,
        why: 'In the recording it made ' + SF.rows[0][1] + ' files. A write makes one file for each task that has data.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'The plan of a query on a folder-per-day table shows `PartitionFilters: none`. What does that mean?',
        opts: [
          { t: 'The table is not partitioned', fb: 'It is. The filter does not use the partition.' },
          { t: 'The query reads every day folder', fb: '' },
          { t: 'The query is invalid', fb: 'It ran.' },
          { t: 'Spark pruned all folders', fb: 'That would read nothing.' }
        ],
        ok: 1,
        why: 'No partition filter means all ' + WR.partitions + ' folders are read. Add a filter on the partition column, as in the one-day plan.'
      }),

      B.quiz({
        id: 'm9-q4', t: 2,
        q: 'A stage has one task at 20 minutes and the rest at 5 seconds. What is the first thing to suspect?',
        opts: [
          { t: 'The cluster is too small', fb: 'Most workers are idle. More of them will not help.' },
          { t: 'Skew: one key holds far more of the rows', fb: '' },
          { t: 'The network is down', fb: 'The other tasks ran normally.' },
          { t: 'The Spark version', fb: 'There is no sign of that.' }
        ],
        ok: 1,
        why: 'The recording showed ' + SK.by_store.largest_over_median + ' times the median for the biggest partition. A salt, a broadcast or adaptive skew handling spreads it.'
      }),

      B.quiz({
        id: 'm9-q5', t: 2,
        q: 'You join a big table with a 12-row table. Which join should the plan show?',
        opts: [
          { t: 'A sort-merge join', fb: 'That shuffles and sorts both sides, which the small side does not need.' },
          { t: 'A broadcast hash join', fb: '' },
          { t: 'A cross join', fb: 'A cross join multiplies every row with every row.' },
          { t: 'No join: Spark cannot join them', fb: 'It can.' }
        ],
        ok: 1,
        why: 'Under the default threshold Spark broadcast the small table in the recording. With the threshold off it chose a sort-merge join.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the life of a nightly Spark job on an ephemeral cluster in order.',
        items: [
          'The schedule starts the DAG',
          'A task creates the cluster, with idle deletion as a safety net',
          'A task submits the job, with its code and parameters',
          'The job reads from Cloud Storage or BigQuery and writes the result',
          'A check compares the output with what was expected',
          'A task deletes the cluster, even if the job failed'
        ],
        why: 'The cluster exists only for the run. The delete task must run even when the job fails, or the cluster stays up and the bill grows. The idle deletion is the second net.'
      }),

      B.qa({
        id: 'qa-dp', t: 1, tag: 'Spark', secs: 90,
        q: 'How do you run Spark on Google Cloud, and how do you keep the cost under control?',
        pts: ['Data in Cloud Storage and BigQuery, not HDFS', 'Ephemeral clusters or serverless batches', 'Autoscaling and spot secondary workers', 'Idle deletion as a safety net', 'Composer creates, runs and deletes', 'SQL in BigQuery when it fits'],
        short: 'I keep the data in Cloud Storage and BigQuery and use Spark only as compute, so a cluster can be thrown away. For a scheduled job I create an **ephemeral Dataproc cluster** in a Composer DAG, run the job and delete the cluster, with a delete-on-idle setting as a safety net, or I submit a **serverless Spark batch** and have no cluster at all. I use autoscaling and cheaper secondary workers on spot VMs for compute that can be repeated.\n\nTo control cost I check that a job reads only the partitions and columns it needs, that the shuffle and the number of files are sensible, and that skew is handled. And I ask first whether the job is really SQL: if it is, it runs in BigQuery with no cluster to manage.',
        fu: [['Why not a permanent cluster?', 'You pay for idle time, and the cluster drifts. Ephemeral clusters start clean and are versioned in code.'], ['What are secondary workers?', 'Workers on cheaper machines, such as spot VMs, that hold no HDFS data. They can disappear, so they are for work that can be redone.']],
        trap: 'Describing a permanent cluster with HDFS as the design.',
        real: 'Tell me how you cut the cost of a Spark workload.'
      }),

      B.qa({
        id: 'qa-skew', t: 2, tag: 'Spark', secs: 90,
        q: 'A Spark stage has one very slow task. What is happening and how do you fix it?',
        pts: ['Skew: a hot key sends too many rows to one partition', 'Compare slowest and median task', 'Find the key by counting rows by key', 'A salt and a two-step aggregation', 'Broadcast the small side of a join', 'Adaptive skew handling, and a check after each run'],
        short: 'It is almost always **skew**: one key holds far more of the rows, so one partition and one task do most of the work, and the stage ends when that task ends. In my recording a partition by store gave a partition that was **3.4 times** the median, because one store has a third of the orders, and a salt brought it down to 1.8.\n\nI confirm it in the Spark UI by comparing the slowest task with the median, and by counting rows by key. The fixes are a **salt**, which splits the hot key and needs a second aggregation, a **broadcast** of the small side of a join so the big side is not shuffled, handling the hot key on its own path, and adaptive skew handling. Then I add a check of the biggest keys to the nightly report, because the skew will change as the business does.',
        fu: [['Why not just add workers?', 'The other workers are idle. The slow task is one task, and it does not get faster.'], ['Can skew be in the input and not in the key?', 'Yes: one huge file among small ones gives a slow task too. Compare the bytes that each task reads.']],
        trap: 'Saying "I would add more executors".',
        real: 'Describe a job that was slow because of skew, and what the Spark UI showed.'
      }),

      B.qa({
        id: 'qa-files', t: 1, tag: 'Spark', secs: 60,
        q: 'What is the small file problem, and how do you avoid it?',
        pts: ['One task writes one file', 'Many tiny files: slow listing, opening and tasks, costly operations', 'One huge file: no parallel read', 'Choose the number of output files from the data size', 'repartition or coalesce on purpose, with partitionBy', 'Compact old small files'],
        short: 'A Spark write makes one file for each task that has data. A write with a lot of tasks makes many tiny files, and every file costs a listing, an open and a task for the next reader, plus operations on Cloud Storage. In my recording the same 60,000 rows made 200 files of about 4 KB with `repartition(200)`, and 4 files of about 112 KB with `repartition(4)`.\n\nThe opposite is one huge file, which cannot be read in parallel. So I choose the number of output files from the size of the data, aiming for tens to hundreds of megabytes each, with `repartition` or `coalesce`, and for partitioned output I repartition by the same column that I partition by. For tables that already have many small files, I run a compaction job.',
        fu: [['When is coalesce better than repartition?', 'When you only want fewer partitions and want to avoid a full shuffle. It cannot increase them.'], ['Does BigQuery care?', 'Loads and external tables over many small files are slower, so yes.']],
        trap: 'Ignoring the file count, or writing everything as one file.',
        real: 'Tell me about a pipeline that was slow because of the number of files.'
      }),

      B.qa({
        id: 'qa-sqlspark', t: 2, tag: 'Spark', secs: 75,
        q: 'When would you use Spark and not BigQuery SQL?',
        pts: ['SQL first: no cluster, cheapest to run and read', 'Spark for logic SQL cannot express: loops, libraries, custom formats', 'Existing Spark code and skills', 'Data that is in files and must stay there', 'Machine learning libraries, graph work', 'Move SQL-shaped jobs to BigQuery over time'],
        short: 'I try SQL in BigQuery first, because there is no cluster to manage and it is the cheapest to run and to read. I use Spark when the logic cannot be written in SQL: an algorithm with a loop, a library that only exists for Spark, a custom file format, or a job that already exists and works. I also use it when the data must stay in files for other engines.\n\nWhen I inherit Spark jobs, I lift and shift them to Dataproc or serverless Spark first to get off the old cluster, and then I move the ones that are SQL in disguise into BigQuery with Dataform, because that removes the cluster entirely.',
        fu: [['What is a sign that a Spark job is SQL in disguise?', 'A DataFrame job that only filters, joins and aggregates. It can be a BigQuery query.'], ['What would stop you moving it?', 'A library, a UDF with real logic, or data that cannot leave the files.']],
        trap: 'Choosing Spark because the team likes it, without a reason.',
        real: 'Describe a job that you rewrote from Spark to SQL, and what changed.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Spark Handler', color: '#FDE68A',
        pts: [
          'Data lives in **Cloud Storage and BigQuery**, so a cluster can be **ephemeral**. **Serverless Spark** has no cluster at all.',
          'Composer creates the cluster, submits the job and **deletes** it. **Idle deletion** is the safety net.',
          'A plan with **PartitionFilters: none** reads **' + WR.partitions + ' of ' + WR.partitions + '** folders. One day read **1**. Only the needed columns are read.',
          'A shuffle with 200 partitions ran **' + SH.tasks_per_stage_without_aqe[0] + '** tasks. With **adaptive execution** the stages had **' + SH.tasks_per_stage_with_aqe.join(', ') + '**.',
          'One task, one file: **' + SF.rows[0][1] + '** files against **' + SF.rows[1][1] + '** against **' + SF.rows[2][1] + '**. Choose the number on purpose.',
          '**Skew**: **' + SK.by_store.largest_over_median + ' times** the median by store, **' + SK.by_store_and_salt.largest_over_median + '** with a salt. A small table is **broadcast**. Use SQL when it fits.'
        ],
        lines: [
          'I read the plan before I tune anything.',
          'I choose the number of output files, and I look for the hot key.',
          'I delete the cluster, and I set idle deletion as well.'
        ]
      })
    ]
  });
})();
