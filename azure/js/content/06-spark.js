/* Mission 6: Spark and the lakehouse on Azure. Where Spark runs, bronze, silver and gold, Delta Lake, reaching the lake safely, and catalogs.
   The layers, the Delta log, the merge, time travel, the refused write, OPTIMIZE and VACUUM, the ANSI cast and the plans were run in a local Apache Spark
   (version in the recording) with open-source Delta Lake, on one machine. That is not Databricks, Synapse or Fabric. How those services are priced, set up
   and secured comes from documentation, and the screens say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var META = { spark: G.meta('spark'), delta: G.meta('delta-spark'), java: G.meta('java') };
  var T = { bronze: G.table('spark.bronze'), silver: G.table('spark.silver'), quar: G.table('spark.quarantine'), gold: G.table('spark.gold'),
            v0: G.cols('delta.at_v0', ['order_id', 'status', 'total_eur', 'order_date', 'country']),
            v1: G.cols('delta.at_v1', ['order_id', 'status', 'total_eur', 'order_date', 'country']), hist: G.table('delta.history') };
  var LY = G.counts('spark.layers'), AN = G.counts('spark.ansi'), TT = G.counts('delta.time_travel'), OP = G.counts('delta.optimize'), VC = G.counts('delta.vacuum');
  var PR = G.counts('spark.prune'), SC = G.counts('delta.schema'), OPS = G.counts('spark.ops');
  var M = G.file('spark/medallion.py'), MG = G.file('spark/merge.py');
  var C0 = G.file('delta/00000000000000000000.json'), C1 = G.file('delta/00000000000000000001.json');
  var C1M = JSON.parse(G.lines(C1, 1, G.span(C1, /"commitInfo"/, /^}$/)[1])).commitInfo.operationMetrics;

  G.expect(LY.bronze_rows === 7 && LY.bronze_files === 2 && LY.silver_rows === 5 && LY.quarantine_rows === 1 && LY.gold_rows === 4, 'seven bronze rows in two files, five silver, one quarantined, four gold');
  G.expect(AN.default_in_this_version === 'true' && AN.try_cast.join() === '10.50,NULL' && AN.cast_with_ansi_off.join() === '10.50,NULL', 'the ANSI cast fails by default and try_cast gives NULL');
  G.expect(TT.v0_rows === 5 && TT.v1_rows === 6 && TT.o3_v0 === 'COMPLETED' && TT.o3_v1 === 'CANCELLED', 'version 0 has five orders and version 1 has six, with O3 cancelled');
  G.expect(C1M.numTargetRowsUpdated === '1' && C1M.numTargetRowsInserted === '1' && C1M.numTargetRowsCopied === '4' && C1M.numTargetFilesAdded === '4' && C1M.numTargetFilesRemoved === '1', 'the merge updated one row, inserted one, copied four, added four files and removed one');
  G.expect(OP.files_before === 20 && OP.files_after === 1 && OP.removed === 20 && OP.added === 1 && OP.parquet_files_on_disk_after === 21 && VC.dry_run_files === 20 && VC.default_retention_hours === 168, 'OPTIMIZE turns 20 files into 1, 21 stay on disk, and a dry run lists 20');
  G.expect(PR.partitions_in_table === 3 && PR.scan_with_filter[0].numFiles === 2 && PR.scan_with_filter[0].numPartitions === 1 && PR.scan_without_filter[0].numFiles === 5 && PR.scan_without_filter[0].numPartitions === 3, 'the filter reads 2 files in 1 folder, the full scan 5 files in 3');
  G.expect(SC.before.length === 7 && SC.after.length === 8 && SC.after[7] === 'channel', 'schema evolution adds the column channel');

  /* the code that was run, and text made from the recording */
  var ANSI_ERR = G.text('spark.ansi_error'), VAC_ERR = G.text('delta.vacuum_error'), SCH_ERR = G.text('delta.schema_error');
  /* the terminal does not wrap lines, so long messages are cut at spaces */
  function wrap(s, n) { var out = [], line = ''; s.split(' ').forEach(function (w) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }); if (line) out.push(line); return out; }
  function errs(lines, n) { return lines.reduce(function (acc, l) { return acc.concat(wrap(l, n || 94)); }, []).map(function (l) { return { c: 'err', t: l, d: 110 }; }); }
  function nth(code, re, n) { var l = code.split('\n'), c = 0; for (var i = 0; i < l.length; i++) if (re.test(l[i]) && ++c === n) return i + 1; throw new Error('no match ' + n + ' for ' + re); }
  var PLAN_PRUNE = G.text('spark.plan_prune');
  var PLAN_JOINS = ['== Plan A: the default settings ==', G.text('spark.plan_join_default').replace('== Physical Plan ==\n', ''), '',
                    '== Plan B: broadcast joins turned off ==', G.text('spark.plan_join_no_broadcast').replace('== Physical Plan ==\n', '')].join('\n');
  var FOLDER0 = G.text('delta.listing_v0'), FOLDER1 = G.text('delta.listing_v1');

  var ABFS = [
    'account = "stbrewlinelakeprod"',
    'container = "curated"',
    '',
    '# Spark reaches ADLS Gen2 through the ABFS driver: abfss://<container>@<account>.dfs.core.windows.net/<path>',
    'path = f"abfss://{container}@{account}.dfs.core.windows.net/orders/daily_revenue"',
    '',
    'df = spark.read.format("delta").load(path)',
    'df.where("order_date >= \'2026-03-01\'").show()',
    '',
    '# a service principal, for a cluster that cannot use a managed identity or a catalog credential',
    'host = f"{account}.dfs.core.windows.net"',
    'spark.conf.set(f"fs.azure.account.auth.type.{host}", "OAuth")',
    'spark.conf.set(f"fs.azure.account.oauth.provider.type.{host}",',
    '               "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider")',
    'spark.conf.set(f"fs.azure.account.oauth2.client.id.{host}", client_id)',
    'spark.conf.set(f"fs.azure.account.oauth2.client.secret.{host}", client_secret)',
    'spark.conf.set(f"fs.azure.account.oauth2.client.endpoint.{host}",',
    '               f"https://login.microsoftonline.com/{tenant_id}/oauth2/token")'
  ].join('\n');

  var APPEND_BUG = [
    'good, bad = to_silver(to_bronze(spark, "bronze/orders"))',
    'good.write.format("delta").mode("append").save("silver/orders")'
  ].join('\n');
  var APPEND_FIX = [
    'from delta.tables import DeltaTable',
    '',
    'good, bad = to_silver(to_bronze(spark, "bronze/orders"))',
    '(DeltaTable.forPath(spark, "silver/orders").alias("t")',
    '    .merge(good.alias("s"), "t.order_id = s.order_id")',
    '    .whenMatchedUpdateAll()',
    '    .whenNotMatchedInsertAll()',
    '    .execute())'
  ].join('\n');

  var SECRET_BUG = [
    'host = "stbrewlinelakeprod.dfs.core.windows.net"',
    'spark.conf.set(f"fs.azure.account.auth.type.{host}", "OAuth")',
    'spark.conf.set(f"fs.azure.account.oauth2.client.secret.{host}", "example-secret-value-1234")'
  ].join('\n');
  var SECRET_FIX = SECRET_BUG.replace('"example-secret-value-1234"', 'dbutils.secrets.get(scope="kv-brewline", key="lake-sp-secret")');

  var PART_BUG = [
    'silver = spark.read.format("delta").load("silver/orders")',
    'silver.write.format("delta").partitionBy("order_id").save("silver/orders_by_key")'
  ].join('\n');
  var PART_FIX = PART_BUG.replace('partitionBy("order_id")', 'partitionBy("order_date")');

  var GOLD_SQL = [
    'SELECT order_date,',
    '       country,',
    '       COUNT(*)         AS orders,',
    '       SUM(total_eur)   AS revenue_eur',
    'FROM silver_orders',
    "WHERE status = 'COMPLETED'",
    'GROUP BY order_date, country',
    'ORDER BY order_date, country;'
  ].join('\n');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Spark and the lakehouse on Azure', short: 'Spark and lakehouse', blurb: 'Where Spark runs, bronze, silver and gold, Delta, reaching the lake without secrets, and catalogs', minutes: 50,
    focus: ['stg', 'int', 'mart', 'air'],
    goals: [
      'Say where **Spark runs on Azure** (Databricks, Synapse, Fabric) and how to choose.',
      'Build **bronze, silver and gold** and say what each layer promises.',
      'Read what **Delta** adds to Parquet: the log, atomic commits, history, merge and schema checks.',
      'Keep a table healthy with **OPTIMIZE and VACUUM**, and read a plan for **pruning and shuffles**.',
      'Reach ADLS Gen2 from Spark **without a secret in the code**.',
      'Say what a **catalog** adds, and how Unity Catalog, Purview and Fabric differ.'
    ],
    say: 'Mission 6 is where the data gets cleaned at scale. I ran real Apache Spark ' + META.spark + ' with open-source Delta Lake on my own machine and recorded what it did: the three layers, the Delta log, a merge, time travel, a refused write, small files and a plan that skips folders. That is Spark, but not Databricks, Synapse or Fabric. How those services differ, bill and sign in comes from documentation, and the screens say so. The Databricks tutorial goes deeper on Spark and Delta.',
    scenes: [
      B.cmp({
        id: 'm6-where', t: 1, src: 'docs', title: 'Where Spark runs on Azure',
        say: 'Spark is open source, and Azure offers several places to run it. Press Next to compare them. Services change quickly, so read the current page of a service before you plan on it.',
        cols: ['Service', 'What it is', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Azure Databricks', 'The Databricks platform as an Azure service: workspaces, clusters, jobs, SQL warehouses, Unity Catalog and Delta', 'a team that wants the richest Spark tooling, scheduled jobs and table governance in one place', 'Classic compute is billed twice, for the Databricks units and for the virtual machines under them. It has its own workspace and its own admin.'],
          ['Synapse Spark pools', 'Spark pools and notebooks inside a Synapse workspace, next to its SQL pools', 'teams that already work in a Synapse workspace and want Spark beside its SQL', 'Microsoft has said that new investment goes to Fabric. Check the support dates of the Spark runtime before you build on it.'],
          ['Fabric Spark', 'Spark notebooks and job definitions in a Microsoft Fabric workspace, on lakehouse items in OneLake', 'teams that want engineering, warehouse and Power BI in one product', 'Billing is by capacity, shared by every workload on it. It is a newer product, so check each feature.'],
          ['HDInsight', 'Managed open-source clusters: Spark, Hadoop, Kafka and more', 'moving an existing cluster setup with little change', 'It is the oldest option, and some parts are being retired. Check the current notes before choosing it for new work.'],
          ['Spark that you run yourself', 'Open-source Spark on Kubernetes or on virtual machines', 'special needs, or a platform team that wants full control', 'You own upgrades, scaling and security. It is rarely worth it for a small team.']
        ],
        steps: [
          { upto: 2, say: 'The two that most data teams meet first. Databricks is a separate platform that runs on Azure. Synapse Spark lives inside a Synapse workspace.' },
          { upto: 3, say: 'Fabric is the product that Microsoft is investing in. Spark is one of its engines, and it works on the OneLake store.' },
          { upto: 5, say: 'The older and do-it-yourself options. They exist, and for a new platform they are rarely the first choice.' }
        ],
        pick: 'For a new platform, shortlist **Azure Databricks** and **Fabric**. Use **Synapse Spark** when you already live in a Synapse workspace, and read its support dates. Decide on team skills, governance and the way you want to be billed, not on feature lists.'
      }),

      B.flow({
        id: 'm6-lh-flow', t: 1, src: 'docs', title: 'A lakehouse on Azure', g: 'lakehouse', legend: true,
        steps: [
          { say: 'A lakehouse keeps data as files in a lake and adds tables and rules on top, so that one copy serves engineers and analysts. On Azure the lake is ADLS Gen2 and Spark does the heavy work. Press Next to follow the Brewline orders through it.', cap: 'Files in a lake, with tables on top.' },
          { say: 'Step 1. Data Factory and Event Hubs land files in bronze, exactly as the source sent them. The European branch sends text files with semicolons, decimal commas and dates with the day first. Bronze keeps them that way.', on: ['l1'], focus: ['src', 'br'], cap: 'Bronze is what arrived.' },
          { say: 'Step 2. A Spark job reads a folder of bronze. The job starts for the run, and you pay for its nodes only while it runs.', on: ['l2'], focus: ['br', 'sp'], tags: ['tg_run'], cap: 'Spark reads one zone.' },
          { say: 'Step 3. The job writes silver: typed columns, one row for each order, and bad rows set aside. Silver is a Delta table, which is Parquet files plus a log in a folder named `_delta_log`.', on: ['l3'], focus: ['sp', 'sv'], tags: ['tg_run', 'tg_log'], cap: 'Silver is clean and typed.' },
          { say: 'Step 4. A second job reads silver and writes gold: the tables that the business asks about, such as revenue for each day and country.', on: ['l4', 'l4b'], focus: ['sv', 'sp', 'gd'], tags: ['tg_run'], cap: 'Gold answers questions.' },
          { say: 'Step 5. SQL clients and Power BI read gold. Several engines can read one Delta folder, so analysts need no copy of the data.', on: ['l5'], focus: ['gd', 'bi'], cap: 'One copy, many readers.' },
          { say: 'Step 6. A catalog sits across the whole picture. It gives each table a name and an owner, decides who may read it, and records which tables feed which. Without one, access is decided folder by folder and nobody knows where a number came from.', on: ['l6'], focus: ['sp', 'ct'], cap: 'A catalog names and protects.' }
        ]
      }),

      B.rows({
        id: 'm6-layers', t: 1, src: 'rec', title: 'Follow the orders through bronze, silver and gold',
        steps: [
          {
            say: 'This is bronze: two files from the European branch, seven rows, every column kept as text. Look at what a real source sends: a status with a trailing space, a decimal comma, a total that says "n/a", and order O2 twice, in two files.',
            tabs: [{ layer: 'BRONZE', name: 'orders, as they arrived', c: 'stg', cols: T.bronze.cols, rows: T.bronze.rows, trk: 4 }],
            notes: ['I ran this in a local Spark ' + META.spark + ' session. The files are `orders_20260314_0600.csv` and `orders_20260314_1200.csv`.']
          },
          {
            say: 'Silver has five rows. Statuses are trimmed and in capitals, the total is a decimal number, and the time is a real timestamp. O2 appears once, from the newer file, with its new status. O4 had no number as a total, so it waits in a quarantine table with the reason.',
            tabs: [
              { layer: 'SILVER', name: 'orders, clean and typed', c: 'int', cols: T.silver.cols, rows: T.silver.rows, chg: [[1, 1], [1, 6]], trk: 1 },
              { layer: 'QUARANTINE', name: 'rows that could not be used', c: 'qual', cols: T.quar.cols, rows: T.quar.rows, trk: 0 }
            ],
            ops: ['trim, upper, try_cast, to_timestamp, and keep the newest file for each order'],
            notes: ['Seven rows went in. Five reached silver, one went to quarantine, and one was the older copy of O2.']
          },
          {
            say: 'Gold counts completed orders for each day and country. Four rows answer the question that finance asks every morning. O2 counts in the first day with its new status, and nothing was lost on the way.',
            tabs: [
              { layer: 'SILVER', name: 'orders, clean and typed', c: 'int', cols: ['order_id', 'status', 'total_eur', 'order_date', 'country'], rows: T.silver.rows.map(function (r) { return [r[0], r[1], r[2], r[4], r[5]]; }), trk: 1 },
              { layer: 'GOLD', name: 'revenue for each day and country', c: 'mart', cols: T.gold.cols, rows: T.gold.rows, trk: 0 }
            ],
            ops: ['keep COMPLETED, group by day and country, count and sum'],
            notes: ['The four gold rows add up to **' + T.gold.rows.reduce(function (a, r) { return a + parseFloat(r[3]); }, 0).toFixed(2) + ' euro** from ' + T.gold.rows.reduce(function (a, r) { return a + parseInt(r[2], 10); }, 0) + ' completed orders.']
          }
        ]
      }),

      B.code({
        id: 'm6-code', t: 1, src: 'rec', title: 'The three steps in PySpark', file: 'medallion.py', lang: 'python', code: M,
        steps: [
          { say: 'These three functions made the tables you just saw. This is PySpark, which is Python that builds a plan for Spark to run. I ran it in Apache Spark ' + META.spark + ', the open-source engine that the Azure services are built on.', lines: null },
          { say: 'Bronze reads the semicolon files and keeps every column as text, because a cast at this stage could lose a value. `_metadata.file_name` is a hidden column of the file source, and it records which file each row came from.', lines: G.span(M, /^def to_bronze/, /alias\("source_file"\)/) },
          { say: 'The cleaning is one line for each column. `trim` and `upper` make "completed " into COMPLETED. `replace` swaps the decimal comma for a point. `to_timestamp` reads the day-first format.', lines: G.span(M, /cleaned = /, /order_date/) },
          { say: 'This line matters most. `try_cast` gives NULL for a value that is not a number. A plain `cast` stops the job in Spark 4, as the next screen shows.', lines: G.span(M, /try_cast/) },
          { say: 'A window numbers the rows of each order, newest file first, and the filter keeps number one. That is how O2 appears once, with the status from the later file.', lines: G.span(M, /newest_first = /, /select\("order_id", "status"/) },
          { say: 'Rows with no total are not thrown away. They go to a quarantine table with a reason, so that someone can fix the source.', lines: G.span(M, /bad = /, /select\("order_id", "total"/) },
          { say: 'Gold keeps the completed orders, groups by day and country, and counts and sums. It is the smallest of the three steps.', lines: G.span(M, /^def to_gold/, /orderBy/) }
        ],
        note: 'The file is the code of `azure/verify/spark_job.py`, written to the recording and run as shown. The data is the six order lines of the previous screen and the paths are shortened.'
      }),

      B.term({
        id: 'm6-ansi', t: 1, src: 'rec', title: 'A cast that works on one runtime and fails on another',
        say: 'Here is the same bad value, "n/a", cast to a number three ways. Spark ' + META.spark + ' has ANSI mode on by default. Watch what a plain cast does with it.',
        lines: [
          { c: 'dim', t: '# Spark ' + META.spark + ', spark.sql.ansi.enabled = ' + AN.default_in_this_version + ' (the default in this version)', d: 350 },
          { c: 'cmd', t: '>>> messy.select(F.col("total").cast("decimal(10,2)")).collect()', d: 600 }
        ].concat(errs([ANSI_ERR])).concat([
          { c: 'cmd', t: '>>> messy.select(F.expr("try_cast(total as decimal(10,2))")).collect()', d: 600 },
          { c: 'ok', t: '[' + AN.try_cast.join(', ') + ']   # the bad value became NULL', d: 200 },
          { c: 'cmd', t: '>>> spark.conf.set("spark.sql.ansi.enabled", "false")', d: 500 },
          { c: 'cmd', t: '>>> messy.select(F.col("total").cast("decimal(10,2)")).collect()', d: 500 },
          { c: 'warn', t: '[' + AN.cast_with_ansi_off.join(', ') + ']   # with ANSI off, the same cast returns NULL and says nothing', d: 200 }
        ]),
        after: 'The older default in Spark 3 was to return NULL, and Spark 4 changed it to an error. The change is in the Spark migration guide, and I only recorded the version that I ran. The runtimes of Databricks, Synapse and Fabric carry different Spark versions, so a job can behave differently after an upgrade. **Use `try_cast` and a quarantine table**, and then the job does not depend on the setting.',
        afterKind: 'tip',
        doneSay: 'Silent NULLs hide bad data and an error stops the night. A quarantine table does neither: the bad rows are kept, counted and visible.'
      }),

      B.talk({
        id: 'm6-delta-talk', t: 1, src: 'docs', title: 'What Delta adds to Parquet files',
        say: 'Parquet files alone are just files. Delta Lake adds a log, and the log is what makes them a table. Press Next for what that buys you.',
        items: [
          ['A folder with a log', 'A Delta table is a folder of Parquet files plus a folder named `_delta_log`. Each change to the table writes a numbered JSON file there. The table is whatever the log says it is, not whatever files happen to be in the folder.', 'The log is the table.'],
          ['Commits appear all at once', 'A commit counts when its JSON file exists, and the writer creates it only if that number is free. A reader sees the table before a commit or after it, never half of it. Delta runs on ADLS Gen2, which is one of the stores that its documentation lists.', 'No half-written tables.'],
          ['History and time travel', 'Because old log entries stay, you can read the table as it was at an earlier version or time, and list every change. The files of an old version stay on storage until a cleanup removes them.', 'Every version can be read, for a while.'],
          ['Checks on write', 'Delta refuses to append rows whose columns do not match the table, so a new column in a file does not slip in. You can allow a change on purpose and it is written to the log.', 'A schema is enforced, then evolved on purpose.'],
          ['Merge', 'MERGE updates the rows that match a key and inserts the rows that do not. It is how a load is made safe to repeat, as in mission 5.', 'Upsert in one commit.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Other open table formats exist.', t: 'Apache Iceberg and Apache Hudi do similar work with their own metadata. On Azure, Delta is the format that Databricks, Synapse Spark and Fabric write by default. Check the format that your tools read before you choose.' }
      }),

      B.talk({
        id: 'm6-delta-extras', t: 3, src: 'docs', title: 'Three Delta features to know by name',
        say: 'Three newer Delta features come up in interviews. Press Next for what each one does and what to check first.',
        items: [
          ['Change data feed', 'With the table property `delta.enableChangeDataFeed = true`, Delta records row-level changes from that moment on. A reader can ask for them, and each row says insert, update_preimage, update_postimage or delete. It is off by default, and VACUUM removes old change data as well.', 'A feed of row changes.'],
          ['Deletion vectors', 'To delete or update one row, Delta can mark the row as deleted in a small side file and rewrite the data file later. Row-level changes get cheaper. A reader has to support the feature before it can read such a table.', 'Mark now, rewrite later.'],
          ['Liquid clustering', 'An alternative to partitioning and Z-ordering. You name the clustering columns with `CLUSTER BY`, and you can change them later without rewriting the data. The writers have to support the table feature.', 'Clustering you can change.'],
          ['Check your runtime', 'The lessons ran Delta Lake ' + META.delta + ' on a laptop. Synapse Spark, Fabric and Databricks ship their own versions, so read what the one you use supports before you rely on a feature.', 'The version decides.']
        ],
        cols: 1
      }),

      B.term({
        id: 'm6-folder', t: 1, src: 'rec', title: 'What the silver folder looks like',
        say: 'Here is the silver table right after its first write. It is one data file and one log entry. Then I merged a late file into it, and you can see what the folder looks like after.',
        lines: [{ c: 'cmd', t: '$ ls -R silver/orders        # after the first write, hidden files left out', d: 400 }]
          .concat(FOLDER0.split('\n').map(function (l) { return { c: /_delta_log/.test(l) ? 'hl' : 'out', t: l, d: 60 }; }))
          .concat([{ c: 'cmd', t: '$ ls -R silver/orders        # after the merge', d: 700 }])
          .concat(FOLDER1.split('\n').map(function (l) { return { c: /_delta_log/.test(l) ? 'hl' : 'out', t: l, d: 60 }; })),
        after: 'After the merge there are **five** data files, and only four of them belong to the table. The log says that the first file was **removed** at version 1, and the other four were **added**. The first file is still on storage. Each JSON file has a small checksum file beside it, and the `.crc` files of the local disk are left out here. In a lake the same layout sits under a path such as `silver/orders/` in a container.',
        afterKind: 'tip',
        doneSay: 'A folder that holds five files is a table of four. Only the log knows which.'
      }),

      B.code({
        id: 'm6-log', t: 1, src: 'rec', title: 'The first commit, line by line', file: '00000000000000000000.json', lang: 'json', code: C0,
        steps: [
          { say: 'This is the first log file of silver, as Spark ' + META.spark + ' and Delta ' + META.delta + ' wrote it. The real file has one JSON object on each line. I show each object indented, with the ids and clock replaced, and the statistics shortened to the columns order_id and total_eur.', lines: null },
          { say: '`commitInfo` says what happened: a write, in the mode that fails if the table exists, with its counts. It is a record for people and tools, not part of the table.', lines: G.span(C0, /"commitInfo"/, /^}$/) },
          { say: '`metaData` is the schema of the table, the partition columns and the format. A table with a changed schema gets a new `metaData` entry.', lines: G.span(C0, /"metaData"/, /^}$/) },
          { say: '`protocol` says which versions of the Delta protocol a reader and a writer must understand. A reader that is too old must refuse the table and not guess.', lines: G.span(C0, /"protocol"/, /^}$/) },
          { say: '`add` puts a data file in the table. It carries the path, the size, whether the change touches data, and statistics of the file: the number of rows and the smallest and largest values. Those statistics let an engine skip a file that cannot hold the rows it wants.', lines: G.span(C0, /"add"/, /^}$/) }
        ],
        note: 'Commit 0 of `silver/orders`, from the recording. The timestamps are replaced by one fixed value and the random ids in file names by `<uuid1>`, so that the recording is the same on every run.'
      }),

      B.code({
        id: 'm6-merge', t: 1, src: 'rec', title: 'A merge: update what matches, insert what is new', file: 'merge.py', lang: 'python', code: MG,
        steps: [
          { say: 'A late file arrived: order O3 is now cancelled, and O7 is a new order. `new_rows` is that file, cleaned by the same `to_silver` function. This merge puts both into silver in one commit.', lines: null },
          { say: 'Open the silver table by its path, and give it the name `t` for the target.', lines: G.span(MG, /DeltaTable.forPath/, /DeltaTable.forPath/) },
          { say: '`merge` joins the new rows, named `s`, to the table on the order id. That condition decides what counts as the same order.', lines: G.span(MG, /\.merge\(/, /\.merge\(/) },
          { say: 'When the key matches, update the row. O3 gets its new status.', lines: G.span(MG, /whenMatchedUpdateAll/, /whenMatchedUpdateAll/) },
          { say: 'When there is no match, insert. O7 is added. Running the same merge again changes nothing, which is why it is safe to repeat.', lines: G.span(MG, /whenNotMatchedInsertAll/, /execute/) }
        ]
      }),

      B.code({
        id: 'm6-merge-log', t: 1, src: 'rec', title: 'What the merge wrote to the log', file: '00000000000000000001.json', lang: 'json', code: C1,
        steps: [
          { say: 'This is the log entry of the merge. Delta never edits a file. A change writes new files and says which old ones are gone.', lines: null },
          { say: 'The record names the operation and counts what it did: **' + C1M.numTargetRowsUpdated + ' row updated, ' + C1M.numTargetRowsInserted + ' inserted, ' + C1M.numTargetRowsCopied + ' copied**. The copied rows did not change. They had to be written again because they sat in the file that held O3.', lines: G.span(C1, /"commitInfo"/, /^}$/) },
          { say: 'Four `add` entries: **' + C1M.numTargetFilesAdded + ' new files**. The merge ran with four shuffle partitions in my session, and each partition that had rows became a file. With Spark\'s default of 200, the same merge could write far more tiny files.', lines: [G.at(C1, /"add"/), G.at(C1, /"remove"/) - 2] },
          { say: 'And one `remove` entry: the file from version 0, which held five rows including O3. It is no longer part of the table, but it stays on storage until a cleanup deletes it.', lines: G.span(C1, /"remove"/, /^}$/) }
        ],
        note: 'The statistics of each file are shortened to order_id and total_eur, and the timings that the log also records are left out. Everything else is as written.'
      }),

      B.rows({
        id: 'm6-travel', t: 1, src: 'rec', title: 'Time travel and history',
        steps: [
          {
            say: 'Version 0 is the table as it was first written: five orders, and O3 is COMPLETED.',
            tabs: [{ layer: 'VERSION 0', name: 'silver, as first written', c: 'int', cols: T.v0.cols, rows: T.v0.rows, trk: 2 }],
            ops: [],
            notes: ['Read with `spark.read.format("delta").option("versionAsOf", 0).load("silver/orders")`.']
          },
          {
            say: 'Version 1 is the table after the merge. O3 is now CANCELLED and O7 is new. The old version did not go away: both can be read.',
            tabs: [
              { layer: 'VERSION 0', name: 'silver, as first written', c: 'int', cols: T.v0.cols, rows: T.v0.rows, trk: 2 },
              { layer: 'VERSION 1', name: 'silver, after the merge', c: 'mart', cols: T.v1.cols, rows: T.v1.rows, chg: [[2, 1], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4]], trk: 2 }
            ],
            ops: ['MERGE: one row updated, one inserted'],
            notes: ['Version 0 has ' + TT.v0_rows + ' rows and version 1 has ' + TT.v1_rows + '.']
          },
          {
            say: 'The history lists every commit with the operation and its counts. Version 2 is the append of a new order with a new column, and the next screen shows how Delta treated that.',
            tabs: [{ layer: 'HISTORY', name: 'DESCRIBE HISTORY of silver', c: 'qual', cols: T.hist.cols, rows: T.hist.rows, trk: 1 }],
            ops: [],
            notes: ['Time travel reads old files, so it works only while they exist. A cleanup with VACUUM ends it for the versions it removes.']
          }
        ]
      }),

      B.term({
        id: 'm6-enforce', t: 1, src: 'rec', title: 'A write that Delta refuses',
        say: 'A new order arrives with a column that silver does not have. First I append it as it is, then I allow the new column on purpose.',
        lines: [
          { c: 'dim', t: '# one new order from the app, with an extra column named channel', d: 300 },
          { c: 'cmd', t: '>>> extra.write.format("delta").mode("append").save("silver/orders")', d: 600 }
        ].concat(errs(SCH_ERR.split('\n').slice(0, 6).filter(Boolean))).concat([
          { c: 'dim', t: '...', d: 80 },
          { c: 'hl', t: G.grep(SCH_ERR, /channel/), d: 200 },
          { c: 'cmd', t: '>>> extra.write.format("delta").mode("append").option("mergeSchema", "true").save("silver/orders")', d: 700 },
          { c: 'ok', t: 'columns before: ' + SC.before.length + '   columns after: ' + SC.after.length + '  (' + SC.after[SC.after.length - 1] + ' is new)', d: 200 }
        ]),
        after: 'The refusal protects the table: a typo in a column name, or a source that adds a field, does not change the schema by accident. **`mergeSchema`** says that you want the change. It is written to the log as a new `metaData` entry, and rows that were there before show NULL in the new column.',
        afterKind: 'tip',
        doneSay: 'Enforce by default, evolve on purpose. A schema that changes silently is a bug that nobody can date.'
      }),

      B.term({
        id: 'm6-small', t: 1, src: 'rec', title: 'Small files, OPTIMIZE and VACUUM',
        say: 'A table that is written in many small pieces gets slow, because each file costs a request. Here is a table written by 20 tasks, then compacted, and then what VACUUM allows.',
        lines: [
          { c: 'dim', t: '# 2,000 rows, written by 20 tasks into a new Delta table', d: 300 },
          { c: 'cmd', t: '>>> spark.sql("' + OPS.detail.replace('{path}', 'bronze/clicks_demo') + '").first().numFiles', d: 600 },
          { c: 'out', t: String(OP.files_before), d: 150 },
          { c: 'cmd', t: '>>> spark.sql("' + OPS.optimize.replace('{path}', 'bronze/clicks_demo') + '")', d: 700 },
          { c: 'ok', t: 'numFilesRemoved = ' + OP.removed + ', numFilesAdded = ' + OP.added, d: 200 },
          { c: 'cmd', t: '>>> spark.sql("' + OPS.detail.replace('{path}', 'bronze/clicks_demo') + '").first().numFiles', d: 600 },
          { c: 'out', t: String(OP.files_after), d: 150 },
          { c: 'warn', t: 'Parquet files in the folder: ' + OP.parquet_files_on_disk_after + '   (the table uses 1, the 20 old files are still there)', d: 250 },
          { c: 'cmd', t: '>>> spark.sql("' + OPS.vacuum_short.replace('{path}', 'bronze/clicks_demo') + '")', d: 700 }
        ].concat(errs(VAC_ERR.split('\n').slice(0, 3))).concat([
          { c: 'dim', t: '...', d: 80 },
          { c: 'err', t: VAC_ERR.split('\n').filter(Boolean).pop(), d: 150 },
          { c: 'dim', t: '# the safety check is switched off for the next command only (retentionDurationCheck.enabled = false)', d: 500 },
          { c: 'cmd', t: '>>> spark.sql("' + OPS.vacuum_dry.replace('{path}', 'bronze/clicks_demo') + '")', d: 800 },
          { c: 'ok', t: 'would delete ' + VC.dry_run_files + ' files (a dry run, nothing is deleted)', d: 200 }
        ]),
        after: '**OPTIMIZE** rewrote 20 small files as 1, and the log now lists only the new one. It does not delete anything: the old files stay for time travel. **VACUUM** deletes the files that the log no longer uses and that are older than the retention period, **' + VC.default_retention_hours + ' hours** by default. Spark refuses a shorter period unless you switch the check off, because a reader or writer that is still working on an old version would break. The paths in the commands are shortened.',
        afterKind: 'tip',
        doneSay: 'Compact on a schedule, clean up after the retention period, and never shorten the check just to see the space come back.'
      }),

      B.code({
        id: 'm6-plan-prune', t: 2, src: 'rec', title: 'Read a plan: which folders does this query read?', file: 'plan.txt', lang: 'text', code: PLAN_PRUNE,
        steps: [
          { say: 'I wrote a copy of silver partitioned by day, which gives one folder for each day, and asked for the orders of one day with two columns. This is the physical plan that Spark made, in its formatted layout.', lines: null },
          { say: 'The scan is where the files are read. `PartitionFilters` says that Spark will look only at folders where `order_date` is 2026-03-15. It decides this from the folder names, before it opens a file.', lines: G.span(PLAN_PRUNE, /PartitionFilters/) },
          { say: '`ReadSchema` lists the columns that are read from the files: `order_id` and `total_eur`. Parquet is columnar, so the other columns are not read at all.', lines: G.span(PLAN_PRUNE, /ReadSchema/) },
          { say: 'The metrics of the scan after the query ran confirm it. With the filter, **' + PR.scan_with_filter[0].numFiles + ' files in ' + PR.scan_with_filter[0].numPartitions + ' folder** were read. The same query without the filter read **' + PR.scan_without_filter[0].numFiles + ' files in ' + PR.scan_without_filter[0].numPartitions + ' folders**.', lines: null }
        ],
        note: 'The same idea saves money in Synapse serverless SQL, which bills for the data it reads (mission 7). Partition by a column that queries filter on and that has few values, such as the day.'
      }),

      B.code({
        id: 'm6-plan-join', t: 2, src: 'rec', title: 'Read a plan: broadcast or shuffle?', file: 'join-plans.txt', lang: 'text', code: PLAN_JOINS,
        steps: [
          { say: 'I joined the orders to a table of three countries and printed the plan twice. Plan A uses the default settings. Plan B has broadcast joins turned off. They are the same query.', lines: null },
          { say: 'In plan A the small table is **broadcast**: a copy is sent to every task, and each task joins the part of the orders that it already holds. Spark does this by default for a table under about 10 MB.', lines: G.span(PLAN_JOINS, /BroadcastHashJoin/, /BroadcastExchange/) },
          { say: 'In plan B, Spark joins by sorting. A `SortMergeJoin` needs the rows with the same key on the same node.', lines: G.span(PLAN_JOINS, /SortMergeJoin/) },
          { say: 'Each side goes through an `Exchange hashpartitioning`. That is a **shuffle**: every row is sent across the network to the node that owns its key. It is the expensive step in most slow Spark jobs.', lines: [nth(PLAN_JOINS, /Exchange hashpartitioning/, 1), nth(PLAN_JOINS, /Exchange hashpartitioning/, 1)] },
          { say: 'Both sides are exchanged and sorted, so a big table pays twice. When one side is small, broadcast it. When both are large, the shuffle is unavoidable, and the work is to keep the data skew and the number of partitions under control.', lines: [nth(PLAN_JOINS, /Exchange hashpartitioning/, 2), nth(PLAN_JOINS, /Exchange hashpartitioning/, 2)] }
        ],
        note: 'The long details of each file scan are cut to the operator and its columns. The Databricks tutorial in this repo has labs on join strategies, skew and adaptive query execution.'
      }),

      B.code({
        id: 'm6-abfss', t: 1, src: 'docs', title: 'Reach the lake from Spark', file: 'read_lake.py', lang: 'python', code: ABFS,
        steps: [
          { say: 'Spark reads ADLS Gen2 through the ABFS driver, which is part of Hadoop. A path starts with `abfss://`, then the container, an at sign, the account name, `dfs.core.windows.net`, and the folder. The extra s means that it uses TLS.', lines: G.span(ABFS, /# Spark reaches/, /^path = /) },
          { say: 'From here the code is ordinary Spark. A Delta folder is read with the `delta` format, and the filter is the one from the plans.', lines: G.span(ABFS, /^df = /, /show\(\)/) },
          { say: 'The lines below are the documented Hadoop settings for a sign-in with a service principal: a client id, a secret and a tenant. Use them only when the platform cannot give the cluster a managed identity. The secret expires, and someone must rotate it.', lines: G.span(ABFS, /# a service principal/, /oauth2\/token/) },
          { say: 'On Databricks, Synapse and Fabric you often do not set any of this. The platform signs in with an identity that holds a role on the storage account, as mission 3 explained, and the next screen compares the ways.', lines: null }
        ],
        note: 'These are the setting names from the Hadoop Azure documentation. They are shown as an example and were not run against a lake. The OAuth endpoint and the setting names can differ by Spark and Hadoop version, so check the page of your runtime.'
      }),

      B.cmp({
        id: 'm6-auth', t: 1, src: 'docs', title: 'Who is Spark when it reads the lake?',
        say: 'The storage account only sees an identity and a role. Press Next to compare the four ways that Spark can present one. This is the same RBAC and ACL logic as mission 3.',
        cols: ['How Spark signs in', 'The identity', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['A managed identity, or a catalog credential that wraps one', 'An Azure managed identity that holds a Storage Blob Data role. On Databricks it is an access connector, registered in Unity Catalog as a storage credential.', 'no secret to store or rotate, and access that is decided in one place', 'The role must be on the right scope, and the catalog or the workspace must be set up to use it.'],
          ['A service principal with a secret', 'An app registration with a client secret or a certificate, set in the Spark settings', 'Spark that runs anywhere, even outside Azure', 'The secret expires. Keep it in Key Vault, read it at run time, and rotate it.'],
          ['The signed-in user', 'The Entra identity of the person who runs the notebook, where the service supports it', 'exploration, where the audit log should name the person', 'A scheduled job has no person. Availability depends on the service, so check it.'],
          ['An account key or a SAS token', 'A shared secret with broad power over the account', 'a quick test on a throwaway account', 'It names no identity in the logs and a key opens everything. Avoid it for real data.']
        ],
        steps: [
          { upto: 1, say: 'The first choice, because nothing secret exists to leak. The identity is the platform\'s, and you manage a role assignment.' },
          { upto: 3, say: 'A service principal and the signed-in user. Both use Entra ID. One has a secret that you must look after, and the other has a person behind it.' },
          { upto: 4, say: 'Keys and SAS tokens are the last resort. They work, and they leave no trail of who did what.' }
        ],
        pick: 'Use a **managed identity** or a catalog credential. Use a **service principal** with its secret in **Key Vault** only where that is impossible. Keep **account keys** out of production.'
      }),

      B.cmp({
        id: 'm6-catalog', t: 1, src: 'docs', title: 'Catalogs on Azure',
        say: 'A catalog gives tables names, owners and rules. Azure has more than one, and they do different jobs. Press Next to compare. Features change, so read the current page of each product.',
        cols: ['Catalog', 'What it does', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Unity Catalog', 'The governance layer of Databricks: a metastore, catalogs, schemas, tables, grants, lineage and audit', 'permissions on tables and files that are used through Databricks', 'It governs what goes through Databricks. Other engines reach the files by other paths.'],
          ['Microsoft Purview', 'A governance service for the whole data estate: scans sources, builds a map of data assets, a business glossary, labels and lineage', 'finding and classifying data across many services, and company-wide policy', 'It describes and governs data, and it does not run your queries. Setup, scans and sources need work and are billed.'],
          ['Fabric workspaces and OneLake', 'Items in workspaces with roles, sensitivity labels and lineage inside Fabric', 'teams that work in Fabric', 'The scope is the Fabric tenant.'],
          ['Hive metastore', 'The older Spark registry that gives names to folders', 'simple Spark setups and older jobs', 'Weak access control: anyone who can read the folder can read the data.']
        ],
        steps: [
          { upto: 1, say: 'Unity Catalog works inside Databricks. If your tables live there, it is the place for grants.' },
          { upto: 3, say: 'Purview looks across the estate, and Fabric has its own workspace model. The first is wide and the second is deep.' },
          { upto: 4, say: 'The Hive metastore is the old way. It names folders and does little else, so treat it as a migration job.' }
        ],
        pick: 'Use the **catalog of the engine** for grants, such as Unity Catalog, and **Purview** when you need one map, one glossary and labels across services. Keep names and owners in a catalog from the first table, because access by folder does not scale.'
      }),

      B.talk({
        id: 'm6-fabric', t: 2, src: 'docs', title: 'Fabric and OneLake in five ideas',
        say: 'Fabric changes the picture because storage and engines come in one product. Press Next for the five ideas to know. Fabric moves fast, so check the current documentation before you rely on a detail.',
        items: [
          ['OneLake', 'One logical lake for the whole Fabric tenant. Every workspace stores its data there, and Delta tables are the standard format. Paths use `abfss://` with a OneLake host name, so Spark code looks familiar.', 'One lake, built in.'],
          ['Lakehouse items', 'A lakehouse has a Tables area for Delta tables and a Files area for anything else. Notebooks and Spark jobs read and write both.', 'Tables and files in one item.'],
          ['Shortcuts', 'A shortcut is a pointer to data somewhere else, such as an ADLS Gen2 container, shown in the lakehouse as a folder or table. Nothing is copied. This is how an existing lake can join a Fabric workspace.', 'Point to the lake you have.'],
          ['The SQL endpoint', 'Each lakehouse has a SQL analytics endpoint that reads its Delta tables with T-SQL, for people who prefer SQL to Spark.', 'T-SQL on Delta.'],
          ['Capacity', 'All workloads share one capacity that you buy by size. You pay for the capacity while it exists, whether the work is Spark, SQL or Power BI. A busy notebook can slow someone else\'s report.', 'One bill, shared compute.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check before you plan.', t: 'Product names, limits and prices in Fabric have changed several times. Treat this screen as the shape of the product and read the pages of your region and plan.' }
      }),

      B.decide({
        id: 'm6-choose', t: 2, src: 'docs', title: 'Decision: how should the nightly silver job run?',
        scenario: 'The silver and gold build takes **about 30 minutes** each night. Four engineers also explore the data in notebooks during the day. The budget is tight, and a failed run must not leave the cluster in a strange state.',
        opts: [
          { t: 'One cluster that stays up all day, with the nightly notebook scheduled on it', d: 'Always ready, and nothing to start.', lose: 'You pay for the machines for 24 hours to use them for 30 minutes at night, and the job shares the cluster with people exploring.' },
          { t: 'A job cluster, or serverless job compute, that starts for the run and ends after it, with a pinned runtime', d: 'You pay while the job runs. Each run starts clean with a known runtime, and exploration cannot slow it down.' },
          { t: 'A dedicated SQL pool that is loaded every night', d: 'T-SQL, and a place that analysts can query.', lose: 'It bills while it is on, keeps a second copy of the data, and the Spark code would have to be rewritten.' }
        ],
        pick: 1,
        why: 'Compute that exists only for the run costs the least and leaves the least to look after. A pinned runtime means an upgrade is a decision, as the ANSI example shows. The engineers get their own interactive cluster that stops itself after a short idle time, so that exploration costs only the hours it is used.',
        when: 'If the job ran every few minutes, the start time of a new cluster would dominate, and a warm pool or an always-on streaming job could win. Decide with the run length and how often it runs.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'Which part of a Delta table says which Parquet files belong to it?',
        opts: [
          { t: 'The names of the files in the folder', fb: 'A folder can hold files that are no longer part of the table, as the recording shows.' },
          { t: 'The JSON files in the `_delta_log` folder', fb: '' },
          { t: 'The last modified time of the folder', fb: 'Time says nothing about which files are current.' },
          { t: 'The catalog entry for the table', fb: 'A catalog names the table. It does not list its files.' }
        ],
        ok: 1, why: 'The log is the table. Each commit lists files that were added and removed, and a reader replays the log to know the current set. A folder can hold more files than the table uses.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'OPTIMIZE turned the 20 files of the recorded table into 1. How many Parquet files were in the folder afterwards?',
        opts: [
          { t: '1, because OPTIMIZE deletes the old files', fb: 'OPTIMIZE adds the compact file and removes the others from the log, and it does not delete them.' },
          { t: String(OP.parquet_files_on_disk_after) + ', because the 20 old files stay until VACUUM removes them', fb: '' },
          { t: '20, because OPTIMIZE only changes the log', fb: 'It wrote a new file as well.' },
          { t: '0, because the table is empty until the next write', fb: 'The table kept all 2,000 rows.' }
        ],
        ok: 1, why: 'The new file was added, the 20 old ones were marked as removed in the log, and none was deleted. They stay so that older versions can still be read, until VACUUM deletes files older than the retention period.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'VACUUM with a retention of 0 hours was refused. What does the check protect?',
        opts: [
          { t: 'Readers, writers and time travel that may still use files younger than the retention period', fb: '' },
          { t: 'The Spark license', fb: 'There is no license check. The message talks about corrupting the table.' },
          { t: 'The log, which VACUUM would delete', fb: 'VACUUM deletes data files that the log no longer uses, not the log.' },
          { t: 'The storage account from deletion', fb: 'A different feature, soft delete, protects blobs from deletion.' }
        ],
        ok: 0, why: 'A job that started before a change may still be reading an old file. The default minimum of ' + VC.default_retention_hours + ' hours, seven days, gives readers time to finish and keeps recent versions available. Shorten it only when nothing else uses the table.'
      }),

      B.quiz({
        id: 'm6-q4', t: 1,
        q: 'A Spark 4 job stops with CAST_INVALID_INPUT on the value "n/a". Which change makes bad values NULL without a setting that affects every job?',
        opts: [
          { t: 'Use `try_cast` for that column', fb: '' },
          { t: 'Use `cast` twice', fb: 'A second cast fails in the same way.' },
          { t: 'Add a retry to the job', fb: 'The value is still bad on the next try.' },
          { t: 'Convert the column to string', fb: 'It moves the problem to the next step that needs a number.' }
        ],
        ok: 0, why: '`try_cast` returns NULL for input that is malformed, and you can send those rows to a quarantine table. Turning ANSI mode off would also give NULLs, for every job and for every kind of error, and nothing would say so.'
      }),

      B.quiz({
        id: 'm6-q5', t: 2,
        q: 'In a plan, which line shows that Spark will read only the folders of one day?',
        code: PLAN_PRUNE.split('\n').slice(5, 12).join('\n'), file: 'plan.txt', lang: 'text',
        opts: [
          { t: 'Output', fb: 'It lists the columns that leave the scan.' },
          { t: 'PartitionFilters', fb: '' },
          { t: 'Batched: true', fb: 'It says that rows are read in batches.' },
          { t: 'ReadSchema', fb: 'It lists the columns that are read, which saves columns, not folders.' }
        ],
        ok: 1, why: '`PartitionFilters` holds the conditions on partition columns, which are in folder names. Spark applies them before it opens a file. `ReadSchema` is the other saving, from the columns, and it is separate.'
      }),

      B.quiz({
        id: 'm6-q6', t: 2,
        q: 'A join of a large table to a table of 3 rows shows a SortMergeJoin with two Exchange steps. What do you try first?',
        opts: [
          { t: 'Add more nodes', fb: 'More nodes shuffle the same data a little faster, and the cost stays.' },
          { t: 'Broadcast the small table, with a hint or by checking the broadcast threshold and the statistics', fb: '' },
          { t: 'Sort both tables first', fb: 'The join already sorts them. The cost is the shuffle.' },
          { t: 'Turn off adaptive execution', fb: 'It changes plans while they run and often helps.' }
        ],
        ok: 1, why: 'A broadcast join sends a copy of the small table to every task, so the big table is never shuffled. Spark does it on its own when it knows the table is small. If it did not, the statistics are missing or the threshold is too low, and a broadcast hint fixes it.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the nightly silver build in order.',
        items: [
          'Read the new bronze files, with every column as text',
          'Clean and type the columns, and use try_cast',
          'Set the rows that cannot be used aside, with a reason',
          'Keep the newest row for each order',
          'Merge the rows into the silver Delta table by key',
          'Build gold from silver',
          'Check the counts: bronze rows, silver, quarantine and duplicates add up'
        ],
        why: 'Bronze stays as text so that nothing is lost, and cleaning comes before the quarantine decision. The newest row is chosen before the merge, so that one key does not match twice. Gold is built from the finished silver, and the count check closes the loop.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, src: 'rec', q: 'The job retries after a timeout and silver now holds every order twice. Click the line that causes it.',
        file: 'silver_job.py', lang: 'python', code: APPEND_BUG, bad: [2],
        hint: 'What does a second run of this line do to the table?',
        why: 'An append adds the rows again on every run, so a retry doubles them. A merge on the key updates a row that exists and inserts one that does not, so running it twice leaves the same table. This is the same rule as mission 5: make the load safe to repeat.',
        fix: APPEND_FIX,
        cheer: 'Append is for events. A table that has keys wants a merge.'
      }),

      B.bug({
        id: 'm6-bug2', t: 1, src: 'docs', q: 'A notebook sets the sign-in to the lake. Click the line that will end up in Git and in the logs.',
        file: 'lake_login.py', lang: 'python', code: SECRET_BUG, bad: [3],
        hint: 'One value here is a secret.',
        why: 'The client secret is typed into the notebook, so it is in the repository, in the notebook history and in whatever prints the configuration. Read it from a secret scope that is backed by Key Vault, with `dbutils.secrets.get` on Databricks. Better still, use a managed identity, so that no secret exists. The secret in the example is made up.',
        fix: SECRET_FIX,
        cheer: 'A secret in code is a secret in Git.'
      }),

      B.bug({
        id: 'm6-bug3', t: 2, src: 'docs', q: 'The table of 40 million orders was rewritten with a partition column. Queries got slower. Click the line that is the problem.',
        file: 'repartition_table.py', lang: 'python', code: PART_BUG, bad: [2],
        hint: 'How many different values does the partition column have?',
        why: 'Every order has its own id, so the table gets one folder and at least one tiny file for each order. The listing and the open calls dominate everything, and OPTIMIZE cannot fix a layout of 40 million folders. Partition by a column with few values that queries filter on, such as the day, and keep the files large.',
        fix: PART_FIX,
        cheer: 'A partition column needs few values and a filter that uses it.'
      }),

      B.challenge({
        id: 'm6-ch', t: 2, title: 'Coding round: the gold table in Spark SQL', file: 'gold_daily_revenue.sql', lang: 'sql',
        q: 'Silver is a table named `silver_orders`. **Write the Spark SQL that builds the gold table**: for each day and country, the number of completed orders and their revenue in euro, ordered by day and country.',
        data: [{ name: 'silver_orders', cols: ['order_id', 'status', 'total_eur', 'order_date', 'country'], rows: T.silver.rows.map(function (r) { return [r[0], r[1], r[2], r[4], r[5]]; }) }],
        starter: '-- one row for each day and country, completed orders only\nSELECT ...\nFROM silver_orders',
        hints: ['Filter the rows first with WHERE, on the status.', 'Group by the two columns that must stay in the result.', 'COUNT(*) counts rows, SUM adds the totals, and ORDER BY comes last.'],
        sol: GOLD_SQL,
        res: { msg: LY.gold_rows + ' rows', cols: T.gold.cols, rows: T.gold.rows },
        expl: ['`WHERE status = \'COMPLETED\'` keeps only the orders that count as revenue, before any grouping.', '`GROUP BY order_date, country` makes one row for each pair. Every other column must be an aggregate.', 'This is the same query that the `to_gold` function ran in PySpark. Spark SQL and the DataFrame calls become the same plan.', 'In production this would be a view or a job that writes the gold table, and the filter on status would be a documented rule.'],
        cx: 'One pass over the silver table and a hash aggregation by day and country. The time is linear in the rows, and the shuffle moves only the partial results.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the silver job fails after a runtime upgrade', time: '02:20',
        alert: '**The nightly silver job failed with `[CAST_INVALID_INPUT] The value \'n/a\' of the type "STRING" cannot be cast to "DECIMAL(10,2)"`.** It ran every night until yesterday. The only change was that someone moved the job to a newer runtime on Monday. The source file has contained "n/a" in the total for months.',
        clues: ['The same file worked on the old runtime', 'The error names the value and suggests `try_cast`', 'The newer runtime carries Spark 4'],
        opts: [
          { t: 'Use try_cast for the total, send the rows that fail to a quarantine table, and alert when the quarantine grows', fb: '' },
          { t: 'Turn ANSI mode off for the whole workspace', fb: 'It restores the old behavior for every job at once, and bad values become NULL with nothing to say so.' },
          { t: 'Move the job back to the old runtime', fb: 'It works tonight and postpones the problem. The bad value was always in the file, and the old runtime hid it.' },
          { t: 'Ask the source team to stop sending "n/a"', fb: 'Worth asking, but a job cannot depend on it. It should handle bad rows.' }
        ],
        best: 0,
        why: 'The recording shows both behaviors: a plain cast fails in Spark ' + META.spark + ', and a cast with ANSI off returns NULL without a word. `try_cast` makes the intent explicit, a quarantine table keeps the bad rows with a reason, and an alert on its size turns a hidden problem into a visible one.',
        checks: [
          ['Read the error', 'It names the value, the types and the function to use instead.'],
          ['Find the change', 'A runtime upgrade changed the default of ANSI mode.'],
          ['Fix the code', 'try_cast for the column, and the failing rows go to quarantine.'],
          ['Rerun and compare', 'The silver count plus the quarantine count equals the bronze count minus the duplicates.'],
          ['Pin and test upgrades', 'A runtime upgrade runs against a copy of last week\'s data first.']
        ],
        tell: 'The nightly job failed with a cast error because we had moved it to a runtime with Spark 4, where ANSI mode is on by default, and the source has always sent "n/a" in the total. I changed the cast to try_cast, wrote the rows that fail to a quarantine table with a reason, reran the job and checked that silver plus quarantine matched bronze. I added an alert on the size of the quarantine, and runtime upgrades now run against a copy of the data first.',
        prevent: ['Use **try_cast** and a **quarantine table**', 'Test a **runtime upgrade** on a copy of real data', 'Alert on **quarantine size**', 'Do not change **ANSI mode** for the whole workspace to fix one job']
      }),

      B.incident({
        id: 'm6-inc2', t: 2, src: 'rec', title: 'Incident: the dashboard went from 8 seconds to 3 minutes', time: '09:30',
        alert: '**A dashboard that read the silver orders table in 8 seconds in January now takes 3 minutes.** Storage cost has grown too. The table gets a merge every 10 minutes. A look at the folder shows **38,000 Parquet files, most under 1 MB**, and the log has 9,000 commits.',
        clues: ['Each merge writes several small files and removes others', 'The old files stay on storage', 'The slow part is listing and opening files, not reading rows'],
        opts: [
          { t: 'Compact with OPTIMIZE on a schedule, and run VACUUM after the retention period', fb: '' },
          { t: 'Give the dashboard a bigger cluster', fb: 'More nodes do not make 38,000 small reads cheap. The cost is in opening files.' },
          { t: 'Delete the old files by hand in the portal', fb: 'A file that is still in the log would break the table. Only VACUUM knows which are safe.' },
          { t: 'Move the table to a dedicated SQL pool', fb: 'It hides the problem and adds a second copy to keep in sync.' }
        ],
        best: 0,
        why: 'The recording shows the pattern at small scale: a merge of two rows wrote ' + C1M.numTargetFilesAdded + ' files, and OPTIMIZE turned 20 files into 1 without deleting any. VACUUM then removes what the log no longer uses, after the retention of ' + VC.default_retention_hours + ' hours. Scheduling both keeps a table that is merged often in good shape.',
        checks: [
          ['Count the files', 'DESCRIBE DETAIL gives the number of files and the total size of the table.'],
          ['Find the cause', 'Frequent merges with many shuffle partitions write many small files.'],
          ['Compact', 'OPTIMIZE, or the automatic compaction setting of your platform.'],
          ['Clean up', 'VACUUM after the retention period, and not before.'],
          ['Prevent it', 'Schedule maintenance, and write fewer, larger files from the merge.']
        ],
        tell: 'The dashboard slowed because the silver table had 38,000 small files from a merge every ten minutes, and the old files from each merge were still on storage. I compacted the table with OPTIMIZE, which turned them into a few large files, and scheduled OPTIMIZE and VACUUM with the default retention of seven days. I also lowered the number of shuffle partitions of the merge, so each run writes fewer files.',
        prevent: ['Schedule **OPTIMIZE** and **VACUUM** for tables with frequent writes', 'Keep the default **retention**', 'Write **fewer, larger files** from each job', 'Watch **file count and size** with DESCRIBE DETAIL']
      }),

      B.qa({
        id: 'qa-spark-where', t: 1, tag: 'Spark', secs: 60,
        q: 'Where can you run Spark on Azure, and how do you choose?',
        pts: ['Azure Databricks: the full platform, billed in its own units plus the machines', 'Synapse Spark: inside a Synapse workspace, with investment moving to Fabric', 'Fabric Spark: in a Fabric workspace, on OneLake, billed by capacity', 'HDInsight and self-run Spark for older or special cases', 'Choose by team skills, governance needs, billing and support dates', 'Run jobs on compute that exists only for the run'],
        short: 'There are three main places. Azure Databricks is the Databricks platform as an Azure service, with jobs, SQL warehouses and Unity Catalog, and classic compute is billed in Databricks units plus the virtual machines. Synapse has Spark pools inside a workspace beside its SQL pools, but Microsoft has said that new investment goes to Fabric, so I check the support dates of the runtime. Fabric has Spark notebooks and jobs on OneLake, billed by a shared capacity.\n\nThere are also HDInsight and self-run Spark, which I would keep for old setups or special needs.\n\nI choose by the team\'s skills, how much governance I need, how the billing fits the workload, and the support dates. Whatever I choose, I run production jobs on compute that starts for the run and stops after it.',
        fu: [
          ['Why not always run a cluster?', 'You pay for machines that sit idle. A job cluster starts for the run and ends after it, with a pinned runtime.'],
          ['What about Synapse Spark?', 'It still works, but check the runtime support dates and the direction of the product before building something new on it.']
        ],
        trap: 'Choosing by a feature list and forgetting who will operate it.',
        real: 'Describe how you chose where a Spark job runs.'
      }),

      B.qa({
        id: 'qa-medallion', t: 1, tag: 'Lakehouse', secs: 60,
        q: 'What are bronze, silver and gold, and why use layers?',
        pts: ['Bronze: data as it arrived, as text, with the file name', 'Silver: typed, deduplicated and validated, bad rows set aside', 'Gold: tables shaped for questions, such as revenue by day', 'Each layer has one promise and one owner', 'Rebuild later layers from bronze when a rule was wrong', 'The names are a convention'],
        short: 'Bronze keeps the data exactly as it arrived, with every column as text and the name of the file. That is the copy I can always rebuild from. Silver is typed, has one row for each key, and validates the data. Rows that cannot be used go to a quarantine table with a reason. Gold holds the tables for business questions, such as revenue for each day and country.\n\nEach layer makes one promise, so a problem is easier to place. If a rule was wrong, I fix the code and rebuild silver and gold from bronze, without asking the source again.\n\nThe names are a convention, and some teams say raw, clean and curated. What matters is that every layer has one rule and one owner, and that I can check that the counts add up between them.',
        fu: [
          ['Why keep bronze as text?', 'A cast at that stage can lose or change a value. Text keeps what the source sent.'],
          ['Do you need all three?', 'For a small dataset two may do. Add a layer when a layer has a different owner or a different promise.']
        ],
        trap: 'Cleaning in bronze, and then having no copy of what the source sent.',
        real: 'Describe a bug that you fixed by rebuilding from bronze.'
      }),

      B.qa({
        id: 'qa-delta', t: 1, tag: 'Delta', secs: 75,
        q: 'What does Delta Lake add to a folder of Parquet files?',
        pts: ['A transaction log in `_delta_log`: numbered JSON commits that add and remove files', 'Atomic commits: a reader sees a whole version, never half', 'History and time travel, until old files are vacuumed', 'Schema enforcement, and evolution on purpose', 'MERGE for upserts', 'Maintenance: OPTIMIZE and VACUUM'],
        short: 'Delta adds a log. A Delta table is Parquet files plus a `_delta_log` folder, where each commit is a numbered JSON file that lists the files it added and removed. The table is whatever the log says, so a folder can hold files that are no longer part of it.\n\nThat gives atomic commits, because a commit counts when its file exists, so a reader sees a whole version and never half of one. It gives history and time travel, since old log entries and files stay until a cleanup. It enforces the schema on write, and lets me evolve it on purpose. It gives MERGE, which makes a load safe to repeat.\n\nIt also needs maintenance: OPTIMIZE compacts small files, and VACUUM deletes files that the log no longer uses, after a retention period of seven days by default.',
        fu: [
          ['Is Delta the only table format?', 'No. Iceberg and Hudi do similar work. Delta is the default of Databricks, Synapse Spark and Fabric, so I check what my tools read.'],
          ['What breaks time travel?', 'VACUUM. It deletes the files of old versions once they pass the retention period.']
        ],
        trap: 'Thinking that the folder is the table. The log is the table.',
        real: 'Describe a problem that the log or MERGE solved for you.'
      }),

      B.qa({
        id: 'qa-smallfiles', t: 2, tag: 'Lakehouse', secs: 90,
        q: 'Queries on a table slowed down over months. What do you check?',
        pts: ['The number and the size of the files: many small files are slow', 'How often the table is written, and with how many tasks', 'The partition column: few values, and used in filters', 'The plan: partition filters and the columns that are read', 'OPTIMIZE on a schedule, then VACUUM after the retention', 'Fix the writer so that it writes fewer, larger files'],
        short: 'I start with the files. I look at the number and the size of the files of the table, because many small files make every query pay for opening them. Frequent merges or streaming writes with many tasks are the usual cause, so I check how often it is written and with how many partitions.\n\nThen I read the plan of a slow query. PartitionFilters should show that a filter on the partition column skips folders, and the read schema should show only the needed columns. A partition column with too many values, such as an id, is a bug in the layout.\n\nThe cure is to compact with OPTIMIZE on a schedule and run VACUUM after the retention period. The better cure is to change the writer so that it writes fewer, larger files, and to partition by a column with few values that queries use.',
        fu: [
          ['Why does a bigger cluster not help?', 'The cost is in opening and listing thousands of files, and more nodes do not make that cheap.'],
          ['How do you see the file count?', 'DESCRIBE DETAIL on a Delta table gives the number of files and the size.']
        ],
        trap: 'Scaling the cluster before looking at the files.',
        real: 'Describe a slow table and what you changed.'
      }),

      B.qa({
        id: 'qa-spark-auth', t: 2, tag: 'Spark', secs: 75,
        q: 'How does Spark sign in to ADLS Gen2 without a secret in the code?',
        pts: ['The storage account sees an identity and a role, plus ACLs', 'A managed identity with a Storage Blob Data role, or a catalog credential that wraps one', 'On Databricks: an access connector registered as a storage credential', 'A service principal only when needed, with the secret in Key Vault', 'Never an account key or a SAS in notebooks', 'Give each job its own identity with the least access'],
        short: 'The storage account only sees an identity and a role, plus ACLs on folders. So the best way is to give Spark a managed identity that holds a Storage Blob Data role on the right scope. On Databricks, that is an access connector with a managed identity, registered in Unity Catalog as a storage credential, so no secret exists at all.\n\nWhere that is impossible I use a service principal, with the settings for the ABFS driver, and I read its secret from a secret scope that is backed by Key Vault at run time, never typing it in a notebook. I do not use account keys or SAS tokens for real data, because they name no identity in the logs.\n\nI give each job its own identity with the least access that it needs, so that a mistake or a leak stays small.',
        fu: [
          ['What is the abfss path?', '`abfss://container@account.dfs.core.windows.net/path`. The driver is ABFS, and the extra s means TLS.'],
          ['Why a role and an ACL?', 'The role is checked first. An ACL on a folder can grant more access for a path, as mission 3 showed.']
        ],
        trap: 'Putting the client secret in a notebook "just for now".',
        real: 'Describe how a job of yours signs in to storage.'
      }),

      B.qa({
        id: 'qa-catalog', t: 2, tag: 'Governance', secs: 75,
        q: 'What is a data catalog for, and which ones exist on Azure?',
        pts: ['Names for tables, owners, and rules for who may read them', 'Lineage: which tables feed which', 'Discovery: people can find data and its description', 'Unity Catalog governs tables that go through Databricks', 'Purview maps and governs the estate across services', 'Fabric has workspace roles, labels and lineage'],
        short: 'A catalog gives tables names and owners, decides who may read them, shows which tables feed which, and lets people find data with a description. Without one, access is decided folder by folder and nobody knows where a number came from.\n\nOn Azure there are several. Unity Catalog is the governance layer of Databricks: catalogs, schemas, grants, lineage and audit for what goes through Databricks. Microsoft Purview looks across the estate: it scans sources, builds a map of assets with a glossary, labels and lineage, and supports company-wide policy. Fabric has its own workspace roles, sensitivity labels and lineage. The old Hive metastore only names folders.\n\nI use the catalog of the engine for grants and Purview when one map across services is needed, and I add names and owners from the first table.',
        fu: [
          ['Does Purview run queries?', 'No. It describes and governs data. The engines run the queries.'],
          ['Why not just use folder permissions?', 'They do not scale, they say nothing about columns, and they give no lineage or description.']
        ],
        trap: 'Treating a catalog as documentation only. It should also hold the access rules.',
        real: 'Describe how people found and got access to data in a place you worked.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Lakehouse Reader', color: '#BFDBFE',
        pts: [
          'Spark runs on **Azure Databricks, Synapse and Fabric**. Choose by skills, governance, billing and support dates, and run jobs on compute that exists only for the run.',
          '**Bronze** is what arrived, **silver** is clean and typed with bad rows set aside, **gold** answers questions. Use **try_cast** and a **quarantine table**.',
          '**Delta** is Parquet files plus a log. Commits are atomic, history and **time travel** exist, the schema is enforced, and **MERGE** makes a load safe to repeat.',
          'Keep tables healthy: **OPTIMIZE** compacts, **VACUUM** deletes after the retention. Read plans for **PartitionFilters**, **ReadSchema** and **shuffles**.',
          'Sign in to the lake with a **managed identity**, not a secret. A **catalog** adds names, owners, grants and lineage.'
        ],
        lines: [
          'I keep bronze as text and quarantine what I cannot use.',
          'I never trust the folder: the log is the table.',
          'I run jobs on compute that stops when the work is done.'
        ]
      })
    ]
  });
})();
