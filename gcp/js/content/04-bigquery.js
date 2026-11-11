/* Mission 4: BigQuery, the warehouse. What happens inside a query, datasets and tables, nested columns, the request bodies of the client, ways to load, external tables,
   time travel and storage billing. The request bodies were built with the real BigQuery client library, offline: to_api_repr() shows the JSON that it would send, and nothing
   was sent. The DDL was read by sqlglot's BigQuery parser, which checks syntax and is not BigQuery. How the service works inside, and its rules, are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TBL = G.file('bq/table.json'), DS = G.file('bq/dataset.json'), LD = G.file('bq/load.json'), EX = G.file('bq/external.json'), DDL = G.file('sql/orders_ddl.sql');
  var SM = G.counts('bq.summary'), DP = G.counts('bq.dispositions'), SC = G.table('bq.schema'), PS = G.counts('sql.ddl_parse'), CS = G.table('sql.column_sizes'), ST = G.counts('sql.storage'), W0 = G.counts('sql.world');
  G.expect(SM.partitioning.type === 'DAY' && SM.partitioning.field === 'order_ts' && SM.clustering.join(',') === 'store_id,status' && SM.require_partition_filter === true, 'the table body');
  G.expect(SM.dataset_location === 'asia-southeast1' && SM.dataset_time_travel_hours === 48 && SM.dataset_billing_model === 'PHYSICAL', 'the dataset body');
  G.expect(SM.load.writeDisposition === 'WRITE_APPEND' && SM.load.createDisposition === 'CREATE_NEVER' && SM.load.schemaUpdateOptions[0] === 'ALLOW_FIELD_ADDITION', 'the load body');
  G.expect(PS.parsed_as === 'Create' && PS.properties.length === 4 && PS.columns.length === 7, 'the parsed DDL');
  G.expect(DP.source_format_names_exist === true && DP.write.indexOf('WRITE_TRUNCATE') >= 0, 'the load dispositions exist in the client');
  var leaf = CS.rows.filter(function (r) { return /^items\./.test(r[0]); }), leafShare = leaf.reduce(function (a, r) { return a + r[3]; }, 0);
  var BUGCFG = [
    'job_config = bigquery.LoadJobConfig(',
    '    source_format=bigquery.SourceFormat.PARQUET,',
    '    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,',
    '    create_disposition=bigquery.CreateDisposition.CREATE_NEVER,',
    ')',
    'client.load_table_from_uri(uri_of_today, "brewline-dev.raw.orders_raw", job_config=job_config)'
  ].join('\n');
  var FIXCFG = [
    'job_config = bigquery.LoadJobConfig(',
    '    source_format=bigquery.SourceFormat.PARQUET,',
    '    write_disposition=bigquery.WriteDisposition.WRITE_APPEND,',
    '    create_disposition=bigquery.CreateDisposition.CREATE_NEVER,',
    ')',
    'client.load_table_from_uri(uri_of_today, "brewline-dev.raw.orders_raw", job_config=job_config)'
  ].join('\n');
  var INFO = [
    'SELECT table_name,',
    '       ROUND(total_logical_bytes / POW(1024, 3), 2) AS logical_gib,',
    '       ROUND(active_logical_bytes / POW(1024, 3), 2) AS active_gib',
    'FROM `brewline-dev`.`region-asia-southeast1`.INFORMATION_SCHEMA.TABLE_STORAGE',
    'WHERE table_schema = \'curated\'',
    'ORDER BY total_logical_bytes DESC;'
  ].join('\n');
  var gibf = function (n) { return (n / Math.pow(1024, 3)).toFixed(1); };

  LAB.addChapter({
    id: 'm4', n: 4, title: 'BigQuery: tables, loads and what is inside', short: 'BigQuery', blurb: 'How a query runs, datasets and tables, nested columns, loading, external tables, time travel and storage billing', minutes: 50,
    focus: ['stg', 'mart'],
    goals: [
      'Describe what happens inside BigQuery when a **query** runs: planner, slots, storage, shuffle.',
      'Pick between a **native table**, an **external table**, a **view** and a **materialized view**.',
      'Use **nested and repeated** columns, and say why a query reads only the **leaf** columns that it names.',
      'Read the **request bodies** that create a table, a dataset and a load, and say what each setting does.',
      'Choose a **way to load**: load job, Storage Write API, BigQuery subscription or Datastream.',
      'Explain **time travel**, **snapshots**, **clones** and the two ways storage is billed.'
    ],
    say: 'Mission 4 is the warehouse. BigQuery is the product that appears in almost every Google Cloud data engineer posting, so this is the largest block of the course: three missions on it. This first one is the foundation: how a query runs, what a table is made of, and how data gets in. I built the requests of the real client library offline and read them with you, and I ran the table definition through a BigQuery parser. How the service works inside comes from documentation.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'One query, inside BigQuery', g: 'bq_arch', legend: true,
        steps: [
          { say: 'BigQuery is a serverless warehouse. You send SQL, and you never create a server. Press Next to see what happens to one query. The most important idea is at the bottom of the picture: storage and compute are separate, so a query can use a lot of compute for a few seconds without a cluster that you pay for in between.', cap: 'Storage and compute are separate.' },
          { say: 'Step 1. Your SQL becomes a **job**. A job has an id, a location, a state and a result. Everything you do in BigQuery is a job: queries, loads, copies and exports. The job history is where you later find out who spent what.', on: ['p1'], focus: ['q_sql', 'q_plan'], cap: 'A query is a job.' },
          { say: 'Step 2. The planner reads **metadata**: which partitions exist, how the table is clustered, how big the pieces are. If your filter names the partition column the right way, whole partitions are ruled out before any data is read. This is where cost is decided.', on: ['p2'], focus: ['q_plan', 'q_meta'], cap: 'The planner rules out partitions.' },
          { say: 'Step 3. The plan is cut into **stages**, and each stage runs on **slots**: units of compute. A big query gets many slots at once. On the on-demand price model you pay for the bytes read, and on the capacity model you pay for slots by the hour.', on: ['p3'], focus: ['q_plan', 'q_slots'], cap: 'Stages run on slots.' },
          { say: 'Step 4. Storage is **columnar**: each column is stored on its own, compressed. A query reads only the columns that it names. That is why `SELECT *` is expensive and `SELECT order_id, total_cents` is not.', on: ['p4'], focus: ['q_slots', 'q_stor'], cap: 'Only the named columns are read.' },
          { say: 'Step 5. A join or a group by needs rows with the same key to meet, so BigQuery **shuffles** rows between stages, through a fast shared layer. A key with far more rows than the others, a hot key, makes one slot work longer than the rest. That is skew.', on: ['p5'], focus: ['q_slots', 'q_shuf'], cap: 'A shuffle moves rows between stages.' },
          { say: 'Step 6. The result goes to a temporary table, or to a table that you named. A repeated identical query on unchanged data can be served from the **cache** for free. Mission 5 is about reading less, and this picture is why it works.', on: ['p6'], focus: ['q_slots', 'q_res'], cap: 'The result is a table, or the cache.' }
        ]
      }),

      B.talk({
        id: 'm4-objects', t: 1, src: 'docs', title: 'Datasets and tables',
        say: 'Four ideas make the objects of BigQuery easy to hold in your head. Press Next for each.',
        items: [
          ['A dataset is a folder with rules', 'A **dataset** lives in a project and has a **location**. It is the unit where you set access, a default table expiration and billing options. Brewline has three: `raw`, `staging` and `curated`, one per layer, so each layer gets its own access.', 'A layer is a dataset.'],
          ['A table has a schema and a layout', 'A **table** has columns with types, and a layout: whether it is **partitioned** and **clustered** (mission 5). Types include `INT64`, `STRING`, `TIMESTAMP`, and also `STRUCT` and `ARRAY`. Columns are `NULLABLE`, `REQUIRED` or `REPEATED`.', 'The schema is what, the layout is how it is read.'],
          ['A view is a saved query', 'A **view** stores SQL and no data, so it is always current and costs the bytes of whatever it reads. A **materialized view** stores the result and keeps it up to date, so a query on it reads less, and BigQuery can rewrite queries to use it.', 'A view reads, a materialized view remembers.'],
          ['Everything else', '**Snapshots** and **clones** copy a table at a moment. **External tables** point at files in Cloud Storage. **Temporary tables** hold query results for a day. **Routines** are functions and procedures. The `INFORMATION_SCHEMA` views describe all of it in SQL.', 'It is all queryable metadata.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm4-types', t: 1, src: 'docs', title: 'Which kind of table',
        say: 'Seven kinds of table-like thing, and a reason to use each. Press Next to read the pattern.',
        cols: ['Kind', 'Data lives', 'Use it for', 'Watch out for'],
        hl: 2,
        rows: [
          ['Native table', 'in BigQuery storage', 'Almost everything: the fastest, cheapest to query, full features', 'You pay for storage'],
          ['External table', 'in files, for example Cloud Storage', 'Reading files in place, or a first look at a landing folder', 'Slower, less pruning, no time travel, no cache of the data'],
          ['BigLake table', 'in files, with BigQuery security on top', 'A lake that several engines share, with row and column security', 'Check the formats and features that your case needs'],
          ['View', 'nowhere: it is a query', 'A stable name over changing logic, and a slice for sharing', 'Each query pays for what the view reads'],
          ['Materialized view', 'in BigQuery, kept in step', 'A heavy aggregate that many queries repeat', 'Only some SQL is allowed, and refresh has a cost'],
          ['Snapshot', 'a read-only copy at a time', 'A backup before a risky change', 'Pay for the data that changes later'],
          ['Clone', 'a writable copy that shares storage', 'A test copy of a big table, in seconds', 'Pay for the differences']
        ],
        steps: [
          { upto: 3, say: 'Native tables are the default. External and BigLake tables are for data that has to stay in files.' },
          { upto: 5, say: 'Views and materialized views give names and speed to logic. A materialized view is a cache with rules.' },
          { upto: 7, say: 'Snapshots and clones are cheap copies. Use them before a risky change.' }
        ],
        pick: 'Land files in Cloud Storage, **load** them into native tables for everything that people query, and keep external tables for exploration. The loading cost is small, and the query cost and speed gain are large.'
      }),

      B.talk({
        id: 'm4-nested', t: 1, src: 'docs', title: 'Nested and repeated columns',
        say: 'BigQuery lets one row hold lists and records. It is the feature that most newcomers meet last, and it is the reason a good BigQuery model looks different from a star schema in a classic warehouse.',
        items: [
          ['STRUCT and ARRAY', 'A **STRUCT** is a record with named fields. An **ARRAY** is a list. An order can carry its lines as `ARRAY<STRUCT<sku STRING, qty INT64, unit_cents INT64>>`. The lines live inside the order row: no second table and no join.', 'The order owns its lines.'],
          ['UNNEST turns a list into rows', 'To work with the lines you write `FROM orders AS o, UNNEST(o.items) AS i`. Each line becomes a row next to its order. Mission 6 does this on the Brewline orders.', 'UNNEST is the join with yourself.'],
          ['Leaf columns are separate', 'Inside storage, every **leaf field** is its own column. A query that names `items.sku` reads only that leaf, not `items.qty`. The table in the next screen shows the sizes of the leaves.', 'A nested table is still columnar.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'When to nest:', t: 'when a child row has no life without its parent and you always read them together, like order lines. When a child is shared or has its own key, like customers, keep a table.' }
      }),

      B.rows({
        id: 'm4-leaf', t: 1, src: 'rec', title: 'The sizes of the columns, leaves included',
        steps: [
          {
            say: 'I took the ' + W0.orders.toLocaleString('en-US') + ' Brewline orders and computed the logical size of every column with the sizes that the documentation gives for each data type: 8 bytes for an integer or a timestamp, two bytes plus the text length for a string, and zero for a null. The three leaves of the order lines are **' + Math.round(leafShare * 100) + '%** of the table.',
            tabs: [{ layer: 'RECORDED', name: 'Logical bytes of each column of the sample', c: 'raw', cols: ['column', 'type', 'bytes in the sample', 'share'], rows: CS.rows.map(function (r) { return [r[0], r[1], r[2].toLocaleString('en-US'), Math.round(r[3] * 1000) / 10 + '%']; }), trk: 0 }],
            notes: ['This is **our estimate** from the documented type sizes, computed by a small program on made-up data. It is not what BigQuery measures. For the real number, look at the storage of a table in the console or in the `TABLE_STORAGE` view.']
          },
          {
            say: 'The sample is ' + (ST.sample_logical_bytes / 1e6).toFixed(1) + ' million bytes, small enough to read. The lessons picture the same table **' + ST.scale.toLocaleString('en-US') + ' times bigger**, which is ' + (W0.scaled_orders / 1e6).toFixed(0) + ' million orders and about **' + gibf(ST.scaled_logical_bytes) + ' GiB**. That scale is what the next mission uses to put money on a query.',
            tabs: [{ layer: 'RECORDED', name: 'The sample and the picture', c: 'raw', cols: ['What', 'Value'], rows: [['orders in the sample', W0.orders.toLocaleString('en-US')], ['days (partitions)', ST.days], ['logical bytes in the sample', ST.sample_logical_bytes.toLocaleString('en-US')], ['multiplier used in the lessons', ST.scale.toLocaleString('en-US')], ['orders at that scale', W0.scaled_orders.toLocaleString('en-US')], ['logical size at that scale', gibf(ST.scaled_logical_bytes) + ' GiB']], trk: 0 }],
            notes: ['A multiplier is a way to talk about a big table without a big file. It assumes that the new rows look like the sample.']
          }
        ]
      }),

      B.code({
        id: 'm4-ddl', t: 1, src: 'rec', title: 'A table definition: columns, partitions and clusters', file: 'orders.sql', lang: 'sql', code: DDL,
        steps: [
          { say: 'This is the definition of the curated orders table, in BigQuery SQL. I did not run it on BigQuery. I gave it to sqlglot\'s BigQuery parser, which read it without error and found the parts below. That is a **syntax** check and not a promise that BigQuery accepts it. Press Next.', lines: null },
          { say: 'The columns. Two are `NOT NULL`, because an order without an id or a time is a bug that you want to refuse at load time. The last column is a list of structs: the order lines.', lines: G.span(DDL, /order_id INT64/, /items ARRAY/) },
          { say: '`PARTITION BY DATE(order_ts)` cuts the table into one partition for each day of the timestamp. A query that filters on the day reads only those days. Mission 5 shows what that saves.', lines: G.span(DDL, /^PARTITION BY/) },
          { say: '`CLUSTER BY store_id, status` sorts the data inside each partition by those columns, so a filter on a store reads fewer blocks. The order of the columns matters: the first one is the most useful filter.', lines: G.span(DDL, /^CLUSTER BY/) },
          { say: '`require_partition_filter` makes BigQuery **refuse** a query that does not filter on the partition. It is a guardrail against a costly full scan. `partition_expiration_days` deletes partitions older than that, here 400 days.', lines: G.span(DDL, /^OPTIONS/, /^\)/) }
        ],
        note: 'The parser recognised: ' + PS.properties.map(function (p) { return p[1]; }).join('; ') + '.'
      }),

      B.code({
        id: 'm4-table', t: 1, src: 'rec', title: 'The same table as the client would send it', file: 'table.json', lang: 'json', code: TBL,
        steps: [
          { say: 'The Python client builds a `Table` object, and `to_api_repr()` shows the JSON body that it would send to the REST API. I printed it offline: nothing was sent to Google. Reading this body is the quickest way to learn what each Python setting really does.', lines: null },
          { say: 'The **schema**: each field has a name, a type and a mode. `REQUIRED` columns refuse nulls, `REPEATED` is an array, and a `RECORD` has its own `fields`, as the order lines do.', lines: G.span(TBL, /"schema"/, /"fields": \[/) },
          { say: '**Time partitioning**: by day on `order_ts`, with an expiry of 34,560,000,000 milliseconds, which is 400 days. Note that the API wants a **string** for big numbers.', lines: G.span(TBL, /"timePartitioning"/, /"expirationMs"/) },
          { say: '**Clustering** on two columns, in order, and `requirePartitionFilter` set to true.', lines: G.span(TBL, /"clustering"/, /requirePartitionFilter/) }
        ],
        note: 'Recorded with google-cloud-bigquery ' + G.meta('google-cloud-bigquery') + ', offline. The body is what the library builds. Whether the service accepts it depends on your project and permissions.'
      }),

      B.rows({
        id: 'm4-schema', t: 1, src: 'rec', title: 'The schema, with its modes',
        steps: [{
          say: 'Three modes decide what a column may hold. `REQUIRED` refuses a null. `NULLABLE` allows one. `REPEATED` is a list, and an empty list is not a null. A load job with a column that is `REQUIRED` in the table and missing in the file fails at once, which is what you want.',
          tabs: [{ layer: 'RECORDED', name: 'Schema of the orders table, as the client holds it', c: 'raw', cols: SC.cols, rows: SC.rows, trk: 0 }],
          notes: ['A `RECORD` is a struct. Its own fields are nested in the JSON of the previous screen: `sku`, `qty` and `unit_cents`.']
        }]
      }),

      B.code({
        id: 'm4-dataset', t: 1, src: 'rec', title: 'A dataset, as the client would send it', file: 'dataset.json', lang: 'json', code: DS,
        steps: [
          { say: 'A dataset body is shorter and has more consequences. The first setting is the one that you cannot change later.', lines: null },
          { say: 'The **location**. It is part of the dataset for good. Everything inside lives there, and so do the jobs that read it.', lines: G.span(DS, /"location"/) },
          { say: 'A **default expiration** for new tables, here 30 days. A raw layer that should not live for ever can set this, so that forgotten tables clean themselves up.', lines: G.span(DS, /defaultTableExpirationMs/) },
          { say: '**Time travel** of 48 hours instead of the default seven days, and **physical** storage billing. Both change what you pay and what you can undo. The next screens explain them.', lines: G.span(DS, /maxTimeTravelHours/, /storageBillingModel/) },
          { say: 'Access: a group reads, and a service account writes. In practice you would set access through Terraform, so it is reviewed. The roles are the dataset-level roles of mission 2.', lines: G.span(DS, /"access"/, /WRITER/) }
        ],
        note: 'Recorded with the real client, offline. Time travel can be set between 2 and 7 days. A shorter window lowers the cost of physical storage and shortens the time in which you can undo a mistake.'
      }),

      B.talk({
        id: 'm4-time', t: 1, src: 'docs', title: 'Time travel, snapshots, clones and the fail-safe',
        say: 'BigQuery keeps history for you, in four forms. Press Next for each.',
        items: [
          ['Time travel', 'You can query a table **as it was** at a moment within the window, with `FOR SYSTEM_TIME AS OF`. The window is seven days by default and can be set from two to seven. It is how you undo a bad `DELETE` or `MERGE`: select the old state and write it back.', 'Query the past, for up to seven days.'],
          ['Fail-safe', 'After the time travel window, BigQuery keeps deleted data for seven more days. You cannot query it yourself. It is for recovery through Google support, and it is not a backup plan.', 'A last resort, not a plan.'],
          ['Snapshots', 'A **table snapshot** is a read-only copy of a table at a time. It costs only the data that has since changed in the base table. Take one before a risky change, and keep it as long as you need.', 'A backup before a change.'],
          ['Clones', 'A **table clone** is a writable copy that shares unchanged storage with the original. You pay for the differences. It is the cheap way to make a test copy of a large table.', 'A test copy in seconds.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'These protect against mistakes, not against loss of the project.', t: 'For a disaster plan, copy critical datasets to another project or another region. Mission 14 comes back to this.' }
      }),

      B.flow({
        id: 'm4-load-flow', t: 1, src: 'docs', title: 'Four ways into a table', g: 'bq_load', legend: true,
        steps: [
          { say: 'Data reaches BigQuery in four main ways. They differ in how fresh the data is, what they cost, and how much code you write. Press Next to see each one.', cap: 'Four ways in.' },
          { say: 'Way 1. A **load job** reads files from Cloud Storage and adds their rows. It is batch, it is atomic, and it is free of query cost on the shared pool. It is the right default for files.', on: ['l1', 'l2'], focus: ['i_gcs', 'i_load', 'i_tbl'], cap: 'A load job reads files, atomically.' },
          { say: 'Way 2. A **BigQuery subscription** on a Pub/Sub topic writes each message as a row, with no code. It is the simplest way to land events.', on: ['l3', 'l4'], focus: ['i_ps', 'i_sub', 'i_tbl'], cap: 'A subscription writes events without code.' },
          { say: 'Way 3. **Dataflow** transforms data first, and writes through the **Storage Write API**: streaming rows, with offsets that can give exactly-once writes. Use it when events need real work before they land.', on: ['l5', 'l6'], focus: ['i_df', 'i_wapi', 'i_tbl'], cap: 'Dataflow transforms, then writes rows.' },
          { say: 'Way 4. **Datastream** follows the change log of a database and writes the inserts, updates and deletes. Mission 11 is about it.', on: ['l7', 'l8'], focus: ['i_ds', 'i_cdc', 'i_tbl'], cap: 'Datastream writes database changes.' }
        ]
      }),

      B.cmp({
        id: 'm4-ways', t: 1, src: 'docs', title: 'How to choose a way to load',
        say: 'Here are the differences in one table. Press Next to read the pattern.',
        cols: ['Way', 'Fresh', 'Code you write', 'Cost', 'Use it when'],
        hl: 4,
        rows: [
          ['Load job from Cloud Storage', 'minutes to hours', 'a few lines, or none', 'no query cost for the load', 'Files arrive, and a batch is fine'],
          ['BigQuery subscription', 'seconds', 'none', 'Pub/Sub plus Storage Write API', 'Events go to a table as they are'],
          ['Storage Write API from code or Dataflow', 'seconds', 'a client or a pipeline', 'billed by data written', 'You need to transform or to control exactly-once'],
          ['Datastream', 'seconds to minutes', 'none, but a source to configure', 'billed by data processed', 'You want a database copied, with its changes'],
          ['Legacy streaming inserts', 'seconds', 'a client call', 'billed by data inserted', 'Old code. New work should use the Storage Write API']
        ],
        steps: [
          { upto: 2, say: 'Files by load job, events by subscription. Those two cover a lot of real platforms.' },
          { upto: 4, say: 'When events need work, or when a database is the source, add a pipeline or Datastream.' },
          { upto: 5, say: 'The old streaming insert call still exists. The documentation recommends the Storage Write API for new code.' }
        ],
        pick: 'Start with the **simplest** way that meets the freshness. A load job for files and a subscription for events need no pipeline to run. Add Dataflow when the data needs real work before it lands.'
      }),

      B.code({
        id: 'm4-load', t: 1, src: 'rec', title: 'A load job, as the client would send it', file: 'load.json', lang: 'json', code: LD,
        steps: [
          { say: 'This is the configuration of a load job that I built with the client, offline. Three settings do most of the work, and each one has a wrong value that costs data.', lines: null },
          { say: 'The **format**. Parquet carries its own schema and types, so you do not have to describe the columns. Valid names include ' + DP.source_formats.join(', ') + '.', lines: G.span(LD, /sourceFormat/) },
          { say: 'The **write disposition**: `WRITE_APPEND` adds rows. The other values are ' + DP.write.filter(function (x) { return x !== 'WRITE_APPEND'; }).join(' and ') + '. The next screen shows what each does to existing data.', lines: G.span(LD, /writeDisposition/) },
          { say: 'The **create disposition**: `CREATE_NEVER` refuses to create a missing table, so a typo in a table name fails instead of making a new table by accident. And **schema update options** allow a load to add a column, and nothing else.', lines: G.span(LD, /createDisposition/, /ALLOW_FIELD_ADDITION/) }
        ],
        note: 'Recorded with google-cloud-bigquery ' + G.meta('google-cloud-bigquery') + ', offline. The disposition names in the list above were read from the installed library.'
      }),

      B.cmp({
        id: 'm4-disp', t: 1, src: 'docs', title: 'What each write disposition does',
        say: 'A write disposition says what a load does to a table that already has data. Pick the wrong one and you lose data or fail. Press Next to read them.',
        cols: ['Disposition', 'Table has rows', 'Table is empty', 'Use it for'],
        hl: 3,
        rows: [
          ['WRITE_APPEND', 'adds the new rows after them', 'adds the rows', 'A daily load into a raw or history table, with a guard against repeats'],
          ['WRITE_TRUNCATE', 'replaces everything with the new rows', 'adds the rows', 'A full reload of a small table, or one partition by name'],
          ['WRITE_EMPTY', 'fails, and changes nothing', 'adds the rows', 'A first load that must never overwrite anything']
        ],
        steps: [
          { upto: 1, say: 'Append adds. It is safe to forget, and unsafe to repeat: a retry adds the day twice.' },
          { upto: 2, say: 'Truncate replaces. Used on a whole table it wipes the history. Used on a single partition it is a good idempotent load.' },
          { upto: 3, say: 'Empty refuses. It is the safest default for a one-time load.' }
        ],
        pick: 'A load job is atomic: all rows are added, or none. Whether a **retry** is safe depends on the disposition, and that is a design decision. Mission 6 compares five ways to make a load safe to repeat.'
      }),

      B.talk({
        id: 'm4-external', t: 1, src: 'docs', title: 'External tables and the lake',
        say: 'Not every file has to be loaded. An external table lets BigQuery read files where they are. The recorded body below is how it looks. Press Next for the trade.',
        items: [
          ['What it is', 'An **external table** points at files in Cloud Storage and reads them when queried. With `hivePartitioningOptions` set to `AUTO`, BigQuery reads folders like `dt=2026-11-10` as a partition column, so a filter on `dt` reads fewer files.', 'Files, queried in place.'],
          ['What you give up', 'The query is slower, the data is not in columnar BigQuery storage, there is no time travel, and the optimizer has less to work with (for example fewer statistics). A load into a native table is usually the better steady state.', 'Convenience against speed.'],
          ['BigLake and Iceberg', '**BigLake** tables add BigQuery security (row and column) and metadata caching on top of files, so that several engines can share one lake. Open table formats such as **Apache Iceberg** bring table features to files. Both are moving fast, so check the current documentation for supported formats and limits.', 'A lake with warehouse rules, still changing.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm4-ext', t: 2, src: 'rec', title: 'An external table over Hive-style folders', file: 'external.json', lang: 'json', code: EX,
        steps: [
          { say: 'This is the body of an external table over the landing bucket, built offline with the client. Press Next.', lines: null },
          { say: 'The format is Parquet, the files are everything under `orders/`, and BigQuery should detect the schema from the files.', lines: G.span(EX, /"sourceFormat"/, /autodetect/) },
          { say: 'With **AUTO** mode and the prefix, the folder name `dt=2026-11-10` becomes a column, so `WHERE dt = ...` can skip other folders. The prefix tells BigQuery where the keys start.', lines: G.span(EX, /hivePartitioningOptions/, /sourceUriPrefix/) }
        ],
        note: 'Autodetect is handy and risky: it reads a sample and picks types, and a column that looks like an integer today can hold text tomorrow. For production, give the schema.'
      }),

      B.code({
        id: 'm4-info', t: 1, src: 'docs', title: 'Ask BigQuery about itself', file: 'storage_by_table.sql', lang: 'sql', code: INFO,
        steps: [
          { say: 'Every dataset and every region has `INFORMATION_SCHEMA` views that describe tables, columns, partitions, jobs and storage. They are plain SQL, so a data engineer builds the monitoring of a platform with them. This query lists the biggest tables of a dataset. I did not run it.', lines: null },
          { say: 'A **regional** view is addressed with the region: `region-asia-southeast1`. Forgetting this, or naming the wrong region, gives a "not found" error that looks like a missing view.', lines: G.span(INFO, /FROM/) },
          { say: '`TABLE_STORAGE` gives logical and physical bytes, and the split into active and long-term. Other views worth knowing are `TABLES`, `COLUMNS`, `PARTITIONS` and the `JOBS` views, which mission 14 uses for cost.', lines: G.span(INFO, /^SELECT/, /active_gib/) }
        ],
        note: 'From documentation. The view and column names are the ones I know. Check them against the current reference before you build a dashboard on them.'
      }),

      B.cmp({
        id: 'm4-bill', t: 2, src: 'docs', title: 'How storage is billed',
        say: 'Storage has two switches, and both live on the dataset. Press Next to read them.',
        cols: ['Choice', 'What it means', 'Think about'],
        hl: 2,
        rows: [
          ['Logical billing (default)', 'You pay for the uncompressed size of the data, by the documented size of each type', 'Simple, and it ignores how well your data compresses'],
          ['Physical billing', 'You pay for the compressed size on disk, and for time travel and fail-safe bytes too', 'Can be cheaper for data that compresses well, and costlier when history is long'],
          ['Active and long-term', 'A table or partition that has not changed for 90 days is billed at a lower rate', 'Do not rewrite old partitions without a reason']
        ],
        steps: [
          { upto: 2, say: 'Logical or physical is set on the dataset. Compare both on real data before you switch: the answer depends on compression and on how much history you keep.' },
          { upto: 3, say: 'Long-term pricing is automatic. A job that rewrites old partitions every night throws that discount away.' }
        ],
        pick: 'Storage is usually the **small** part of a BigQuery bill. Query bytes, and slots on the capacity model, are the big part. Mission 5 is about them.'
      }),

      B.decide({
        id: 'm4-dec', t: 1, src: 'docs', title: 'Decision: raw files as an external table, or loaded?',
        scenario: 'Partner campaign files land in Cloud Storage every day, about 2 GB. Analysts query them all day and join them to orders. Someone proposes "just make an external table, so there is nothing to load and nothing to pay for storage".',
        opts: [
          { t: 'External table over the bucket, queried directly', d: 'No load step, and the newest file is visible at once.', lose: 'Every query re-reads and re-parses the files, joins are slower, and there is no time travel. The query bill and the waiting grow with every analyst.' },
          { t: 'A daily load job into a native partitioned table, with the files kept in Cloud Storage as the raw copy', d: 'Fast, cheap to query, full features, and the original files are still there for replay.', lose: '' },
          { t: 'A view that reads the external table', d: 'A nice name for analysts.', lose: 'A view stores no data. It has the same problem as the external table, with a prettier name.' }
        ],
        pick: 1,
        why: 'Storage in BigQuery is cheap, and a load job is free of query cost. The load is a small price for a table that is fast, cheap and rich in features. Keep the files as the source of truth, and use an external table only to explore.',
        when: 'For data that is queried rarely, such as a yearly audit, an external or BigLake table avoids storing a second copy.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A daily load job is meant to add each day to the raw table. After a week the table holds only today. Click the line that causes it.',
        file: 'load_daily.py', lang: 'python', code: BUGCFG, bad: [3],
        hint: 'What does this disposition do to the rows that are already there?',
        why: '`WRITE_TRUNCATE` replaces the whole table with the new rows, so every day wipes the previous days. A daily append wants `WRITE_APPEND`, plus a way to survive a retry (mission 6). If the intent is to replace one day, truncate one **partition**, by naming the partition in the destination.',
        fix: FIXCFG,
        cheer: 'Append adds. Truncate replaces.'
      }),

      B.incident({
        id: 'm4-inc', t: 1, src: 'docs', title: 'Incident: the load fails after a partner adds a column', time: '06:05',
        alert: '**The morning load of the campaign files failed.** The job error says that the new file has a column that does not exist in the table: `discount_code`. The partner did not announce a change. The dashboards are empty.',
        clues: ['The table has no column discount_code', 'The load uses CREATE_NEVER and no schema update options', 'The file is valid Parquet'],
        opts: [
          { t: 'Add the column to the table (a nullable column), reload the file, and agree how schema changes are announced and handled', fb: '' },
          { t: 'Set autodetect on and let every load reshape the table', fb: 'A load that changes the table by itself also lets a typo or a bad file change it. The next surprise would be silent.' },
          { t: 'Drop the extra column from the file by hand each morning', fb: 'It hides the change, and the new column carries data that someone wants.' },
          { t: 'Switch to WRITE_TRUNCATE so that the table matches the file', fb: 'It would wipe the history and then fail the same way, because the schema rule is separate.' }
        ],
        best: 0,
        why: 'A new nullable column is an additive change that is safe to allow, deliberately. Add it, reload, and write down a rule: additive changes are allowed through a reviewed change, and anything else stops the load and pages a person.',
        checks: [
          ['Read the error', 'Which column, which file, which job. Compare the file schema with the table schema.'],
          ['Make the change', 'Add the nullable column in a reviewed change, or allow field addition for this one table.'],
          ['Reload', 'Run the load again. It is atomic, so nothing half-loaded exists.'],
          ['Prevent', 'Schema checks in the pipeline, and an agreement with the partner about announcing changes.']
        ],
        tell: 'The partner added a column, and our table did not have it, so the load refused the file, as it should. I added the column as nullable, reloaded the file, and wrote a rule that additive changes go through review while anything else stops the load.',
        prevent: ['A schema check before each load', 'Allow additive changes on purpose, one table at a time', 'A written contract with each partner']
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A query names `items.sku` of a nested orders table. What does BigQuery read?',
        opts: [
          { t: 'The whole items column, with qty and unit_cents', fb: 'Each leaf field is stored as its own column.' },
          { t: 'Only the sku leaf', fb: '' },
          { t: 'The whole row of each order', fb: 'The storage is columnar, not row by row.' },
          { t: 'Nothing: nested fields cannot be queried', fb: 'They can, with UNNEST or with a dotted path.' }
        ],
        ok: 1,
        why: 'Nested data is still columnar. In the recording the three leaves hold ' + Math.round(leafShare * 100) + '% of the bytes of the orders, so naming one of them saves a lot.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'You deleted rows by mistake an hour ago. What is the fastest way back?',
        opts: [
          { t: 'Ask Google support', fb: 'Support is for the fail-safe period, after time travel ends.' },
          { t: 'Query the table `FOR SYSTEM_TIME AS OF` before the delete, and write the rows back', fb: '' },
          { t: 'Nothing: deletes are final', fb: 'Time travel keeps history for the window of the dataset.' },
          { t: 'Reload every file from the start', fb: 'It works but is slow, and unnecessary within the time travel window.' }
        ],
        ok: 1,
        why: 'Time travel is seven days by default, and you can set two to seven. A snapshot before a risky change is better still.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'A load job runs twice by mistake with WRITE_APPEND. What happens?',
        opts: [
          { t: 'BigQuery notices and skips the second one', fb: 'A load job does not know that it is a repeat.' },
          { t: 'The rows are added twice', fb: '' },
          { t: 'The second job fails because the table is not empty', fb: 'That is WRITE_EMPTY.' },
          { t: 'The table is replaced by the second load', fb: 'That is WRITE_TRUNCATE.' }
        ],
        ok: 1,
        why: 'Append is atomic, but it is not idempotent. Mission 6 shows the ways to make a repeat harmless.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2,
        q: 'An external table over Parquet is slower than a native table. Why, mainly?',
        opts: [
          { t: 'Parquet is a row format', fb: 'Parquet is columnar.' },
          { t: 'The data is read and parsed from files each time, with fewer statistics and less optimisation', fb: '' },
          { t: 'External tables are limited to 1 GB', fb: 'There is no such small limit.' },
          { t: 'They cannot use partitions', fb: 'They can, with Hive partitioning.' }
        ],
        ok: 1,
        why: 'A native table is stored in BigQuery\'s own columnar format, with metadata that the planner uses. A file is read as it is. Load the data that people query often.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the creation of a safe landing table in order.',
        items: [
          'Create the dataset in the right location with a default expiration',
          'Define the table with a schema, a partition and a cluster',
          'Set require_partition_filter on the table',
          'Load a day with CREATE_NEVER and the right write disposition',
          'Check row counts against the files',
          'Take a snapshot before the first risky change'
        ],
        why: 'The location and the layout come first, because they are hard to change. A guardrail on the partition filter protects the bill from the start. The load comes next with the safest dispositions, and the check proves it worked.'
      }),

      B.qa({
        id: 'qa-bq', t: 1, tag: 'BigQuery', secs: 90,
        q: 'How does BigQuery work, and why is it fast and cheap at scale?',
        pts: ['Serverless, storage and compute separated', 'Columnar storage: only the named columns are read', 'A query is a job, split into stages that run on many slots', 'Shuffle moves rows between stages', 'Partition and cluster metadata prune data', 'Pay for bytes read, or for slots'],
        short: 'BigQuery is serverless: storage and compute are separate, so a query can use a lot of compute for a few seconds without a cluster that I keep running. Data is stored in columns, each compressed, so a query reads only the columns it names.\n\nA query becomes a job. The planner reads metadata, such as partitions and clusters, to rule out data, and cuts the work into stages that run on many slots at once. Between stages, rows with the same key are shuffled together. On the on-demand model I pay for the bytes read, and on the capacity model for slots. So the way to make it cheaper is to read less: fewer columns, fewer partitions, and no repeats.',
        fu: [['What makes a query slow even though it reads little?', 'Skew: one key with many more rows, so one slot runs long. Or a join that explodes rows, or a huge shuffle.'], ['What is a slot?', 'A unit of compute that runs a part of a stage. The more slots, the more parallel the stage.']],
        trap: 'Saying that BigQuery is fast because it is "in the cloud", without columnar storage and parallel stages.',
        real: 'Describe a query that you made cheaper, and what it read before and after.'
      }),

      B.qa({
        id: 'qa-load', t: 1, tag: 'BigQuery', secs: 75,
        q: 'How do you load data into BigQuery, and how do you choose?',
        pts: ['By freshness and by source', 'Files: load job, atomic, no query cost', 'Events: BigQuery subscription, or Dataflow with the Storage Write API', 'Database: Datastream', 'Simplest way that meets the freshness', 'Make the load safe to repeat'],
        short: 'I choose by the source and the freshness. For files in Cloud Storage I use a load job: it is atomic, it has no query cost, and Parquet or Avro carry the schema. For events from Pub/Sub I use a BigQuery subscription when the data can land as it is, and Dataflow with the Storage Write API when it needs work first. For a database I use Datastream, which writes the inserts, updates and deletes.\n\nI start with the simplest way that meets the freshness, because every pipeline I add is something to run. And whatever I choose, I make it safe to repeat, because retries will happen.',
        fu: [['What about the old streaming inserts?', 'They still work, but the documentation recommends the Storage Write API for new code.'], ['What do you set on a load job?', 'The format, a write disposition that fits (append, truncate or empty), CREATE_NEVER, and schema update options on purpose.']],
        trap: 'Naming one method for every case.',
        real: 'Tell me about a load that failed halfway, and what the table looked like afterwards.'
      }),

      B.qa({
        id: 'qa-ext', t: 2, tag: 'BigQuery', secs: 75,
        q: 'External table or native table: how do you decide?',
        pts: ['External: files read in place, convenient, slower', 'No time travel, fewer statistics, less pruning', 'Native: columnar, fast, features, cost of storage', 'Load what is queried often', 'Keep the files as the raw copy', 'BigLake for a shared lake with security'],
        short: 'An external table reads files where they are, which is convenient for a first look or for data that is rarely queried. But the files are parsed on every query, there is no time travel, and the planner has less to work with, so it is slower and often costlier per query.\n\nA native table is stored in BigQuery\'s columnar format with partitions, clusters and statistics, so it is fast, cheap to query and has the full feature set. Storage costs a little. So I load what people query often into native tables, keep the original files in Cloud Storage as the source of truth, and use external or BigLake tables for exploration and for a lake that other engines share.',
        fu: [['What is BigLake?', 'Tables over files with BigQuery security and metadata caching, so several engines can share one lake.'], ['How do you partition an external table?', 'With Hive-style folders such as dt=2026-11-10 and the hive partitioning option.']],
        trap: 'Choosing external tables to avoid paying for storage, without counting the query bill.',
        real: 'Describe a lake table that you moved into the warehouse, and why.'
      }),

      B.qa({
        id: 'qa-undo', t: 2, tag: 'BigQuery', secs: 75,
        q: 'Someone ran a bad MERGE on a production table. What do you do?',
        pts: ['Stop pipelines that write to it', 'Time travel: query the state before the MERGE', 'Write it back, or restore a snapshot', 'Know the window, from two to seven days', 'Fail-safe is not a plan', 'Prevent: snapshots before risky changes, reviews, a dev copy with a clone'],
        short: 'First I stop the jobs that write to the table, so that nothing makes it worse. Then I use time travel: with `FOR SYSTEM_TIME AS OF` I can query the table as it was before the MERGE, as long as I am inside the window, which is seven days by default and can be set from two to seven. I write those rows back to a new table, check them, and swap or merge them in. If I took a snapshot before the change, I restore from that.\n\nThe fail-safe period after time travel is for Google support and is not a plan. To prevent it, I snapshot before risky changes, I test the MERGE on a clone of the table, and I review the SQL.',
        fu: [['Why a clone for testing?', 'It is a writable copy that shares storage, so you test on real data in seconds and pay only for what changes.'], ['What if the window has passed?', 'Then you rely on a snapshot, an export, or the raw files. This is why raw files are kept.']],
        trap: 'Saying that you restore from a backup that you never set up.',
        real: 'Tell me about a time you recovered data, and what you changed afterwards.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Table Builder', color: '#BBF7D0',
        pts: [
          'A query is a **job**. The planner prunes with metadata, **slots** run the stages, **columnar** storage means only named columns are read.',
          'A **dataset** holds access, location and defaults. A table has a **schema** and a **layout**: partition and cluster.',
          '**Nested** columns keep children with their parent. Each **leaf** is its own column, so name only the leaf you need.',
          'Read the **request body**: location, expiry, time travel and billing model on a dataset, disposition and schema options on a load.',
          'Load files with a **load job**, events with a **subscription**, work first with **Dataflow**, a database with **Datastream**.',
          '**Append** adds, **truncate** replaces, **empty** refuses. **Time travel** gives seven days, a **snapshot** is a backup before a change.'
        ],
        lines: [
          'I load what people query into native tables and keep the files as the raw copy.',
          'I pick the write disposition on purpose, and I make a retry harmless.',
          'I snapshot before a risky change.'
        ]
      })
    ]
  });
})();
