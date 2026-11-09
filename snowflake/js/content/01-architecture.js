/* Mission 1: how Snowflake is built, and what happens when you press Run. */
(function () {
  var B = LAB.b;

  var FIRST = [
    '-- 1. Set your context',
    'USE ROLE SYSADMIN;',
    'CREATE WAREHOUSE IF NOT EXISTS WH_TRANSFORM',
    "  WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE;",
    'USE WAREHOUSE WH_TRANSFORM;',
    '',
    '-- 2. Create a database and a schema',
    'CREATE DATABASE IF NOT EXISTS BREWLINE;',
    'CREATE SCHEMA IF NOT EXISTS BREWLINE.RAW;',
    '',
    '-- 3. Create a table with column types',
    'CREATE OR REPLACE TABLE BREWLINE.RAW.ORDERS (',
    '  order_id    STRING,',
    '  customer_id STRING,',
    '  order_ts    TIMESTAMP_NTZ,',
    '  status      STRING,',
    '  total_usd   NUMBER(10,2)',
    ');',
    '',
    '-- 4. Add three rows',
    'INSERT INTO BREWLINE.RAW.ORDERS VALUES',
    "  ('O-5001', 'C-42', '2026-03-14 09:12:00', 'PLACED',  67.00),",
    "  ('O-5002', 'C-77', '2026-03-14 09:15:00', 'PLACED',  12.50),",
    "  ('O-5003', 'C-42', '2026-03-14 10:02:00', 'SHIPPED', 28.00);",
    '',
    '-- 5. Query it',
    'SELECT * FROM BREWLINE.RAW.ORDERS ORDER BY order_ts;'
  ].join('\n');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'How Snowflake works', short: 'Architecture', blurb: 'Three layers, micro-partitions, the life of a query', minutes: 20,
    focus: ['sf'],
    goals: [
      'Name the **three layers** of Snowflake and say what each one does.',
      'Explain **micro-partitions** and why they let a query skip data.',
      'Follow a query from **Run** to result, including the **result cache**.',
      'Find your way around **accounts, databases, schemas** and your session context.'
    ],
    say: 'Mission 1 is the foundation. Almost every performance, cost and recovery answer later in this course goes back to how Snowflake is built, so we take it slowly.',
    scenes: [
      B.flow({
        id: 'm1-arch', t: 1, title: 'The three layers', g: 'arch', legend: false,
        steps: [
          { say: 'Snowflake has three layers. Cloud services coordinates, virtual warehouses do the computing, and storage holds the data. Press Next to light up each one.', cap: 'The key idea: **storage and compute are separate**, so each one scales and bills on its own.' },
          { say: 'Cloud services handles login, roles, metadata, query planning and transactions. It runs all the time and you never size it.', focus: ['a_cs', 'cs1', 'cs2', 'cs3', 'cs4'], cap: 'Metadata stores the **minimum and maximum of every column in every micro-partition**. The optimizer uses it to skip data. Cloud services usage is free up to **10% of your daily warehouse credits**.' },
          { say: 'A virtual warehouse is a cluster of compute that runs queries and loads. You create as many as you need. Brewline uses one each for loading, transformation, BI and the website, so they never compete for the same compute.', focus: ['a_cp', 'w1', 'w2', 'w3', 'w4'], cap: 'A heavy job on **WH_TRANSFORM** cannot slow a dashboard on **WH_BI**.' },
          { say: 'Storage keeps one copy of every table as compressed, columnar micro-partitions in cloud object storage. Every warehouse reads that same copy. You pay for storage separately from compute.', focus: ['a_st', 'st'], cap: 'Micro-partitions are **immutable**, which is why Time Travel and cloning work. Mission 5 covers both.' },
          { say: 'Follow one dashboard query. The BI tool sends it to cloud services, which checks the role and plans the query. WH_BI runs the plan and reads only the micro-partitions it needs from storage.', focus: ['cl3', 'a_cs', 'a_cp', 'w3', 'a_st', 'st'], on: ['q3', 'q5', 'q6'], cap: 'Plan, prune, execute. **Fewer partitions read means a faster, cheaper query.**' }
        ]
      }),

      B.talk({
        id: 'm1-objects', t: 1, title: 'Where things live',
        say: 'Before any SQL, you need to know where objects live and how to name them. Press Next for each point.',
        items: [
          ['Organization and account', 'Your company has an **organization**. Inside it you create **accounts**. Each account lives in one cloud (AWS, Azure or Google Cloud) and one region, with its own users, roles, warehouses and data.', 'One account is one Snowflake environment in one cloud region.'],
          ['Databases and schemas', 'Data lives in a **database**, and a database is split into **schemas**. Brewline uses the database `BREWLINE` with the schemas `RAW`, `CORE` and `MARTS`, one for each layer of the pipeline.', 'Database first, then schema, then the objects.'],
          ['Objects inside a schema', 'Tables and views, but also **stages** (file locations), **file formats**, **pipes**, **streams**, **tasks**, **functions** and **sequences**. Everything you build is an object with an owner role.', 'Everything is an object, and every object has an owner role.'],
          ['Fully qualified names', 'Write names as `database.schema.object`, for example `BREWLINE.RAW.ORDERS`. Unquoted names are stored in **upper case**, so `orders` and `ORDERS` are the same table. A quoted name such as `"orders"` is a different, case-sensitive table. Avoid quotes.', 'Use `db.schema.object` and avoid quoted names.'],
          ['Session context', 'Every session has a current **role**, **warehouse**, **database** and **schema**. `USE ROLE`, `USE WAREHOUSE` and `USE SCHEMA` set them. Many "object does not exist" errors mean the wrong context, not a missing object.', 'Check your context before you debug.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm1-first', t: 1, title: 'Your first worksheet', file: 'worksheet: first_steps.sql', code: FIRST,
        ctx: { role: 'SYSADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'This is the smallest useful worksheet: context, objects, a table, some rows and a query. Press Next to go through it.', lines: null },
          { say: 'First the context. A role decides what you may do. A warehouse supplies compute. This one is X-Small, suspends after 60 seconds idle, and resumes by itself when a query arrives.', lines: [1, 5] },
          { say: 'A database and a schema. IF NOT EXISTS makes the statement safe to run twice.', lines: [7, 9] },
          { say: 'A table with column types. STRING holds text. TIMESTAMP_NTZ is a timestamp without a time zone. NUMBER(10,2) holds up to 10 digits with 2 after the decimal point, which is the right type for money.', lines: [11, 18] },
          { say: 'Three rows, the same three orders you saw in the data screen.', lines: [20, 24] },
          { say: 'Now query it. Press Run to see the result.', lines: [26, 27], run: true }
        ],
        result: { cols: ['ORDER_ID', 'CUSTOMER_ID', 'ORDER_TS', 'STATUS', 'TOTAL_USD'], rows: [['O-5001', 'C-42', '2026-03-14 09:12:00.000', 'PLACED', '67.00'], ['O-5002', 'C-77', '2026-03-14 09:15:00.000', 'PLACED', '12.50'], ['O-5003', 'C-42', '2026-03-14 10:02:00.000', 'SHIPPED', '28.00']], msg: '3 rows' },
        note: '`CREATE OR REPLACE TABLE` drops the old table. It is fine for practice and dangerous in production, where you would use `CREATE TABLE IF NOT EXISTS` and migrate changes on purpose.'
      }),

      B.flow({
        id: 'm1-query', t: 1, title: 'What happens when you press Run', g: 'qlife', legend: true,
        steps: [
          { say: 'You press Run and the query travels through the layers. Follow the numbers. Most of the trip happens in cloud services, before any warehouse starts.', cap: 'Six stops. A **result cache hit** skips stops 4 and 5 completely.' },
          { say: '1. The client sends your SQL to cloud services. Snowflake checks your login and which role you are using. A wrong role is the most common reason a query fails at this point.', on: ['q1'], focus: ['u', 'auth'], cap: 'Authentication and **role-based access** are checked first.' },
          { say: '2. The optimizer parses the SQL and reads table metadata. It decides which micro-partitions can contain matching rows and ignores the rest.', on: ['q2'], focus: ['auth', 'plan'], cap: 'This is where **pruning** is decided, from the min and max values.' },
          { say: '3. Before using any compute, Snowflake checks the result cache. If the same query ran recently and the data has not changed, the stored result goes straight back to you. No warehouse runs and no credits are used.', on: ['q3', 'q4'], focus: ['plan', 'rc', 'u'], cap: 'A cache hit is **free and instant**.' },
          { say: '4. On a miss, the plan goes to your warehouse. If the warehouse is suspended, it resumes first, usually within a few seconds.', on: ['q5'], focus: ['plan', 'wh'], cap: 'Resuming starts the **per-second billing** clock. Mission 2 covers the numbers.' },
          { say: '5. The warehouse reads the partitions it needs, first from its local disk cache, then from storage for anything missing. It joins and aggregates in memory.', on: ['q6', 'q7'], focus: ['wh', 'lc', 'st'], cap: 'The **local disk cache** makes repeat queries on the same data faster.' },
          { say: '6. The result returns to you and is saved in the result cache. Run the same query again and the result cache answers instantly.', on: ['q8'], focus: ['wh', 'u'], cap: 'Results stay cached for **24 hours**, renewed each time they are reused.' }
        ]
      }),

      B.talk({
        id: 'm1-micro', t: 1, title: 'Micro-partitions',
        say: 'Micro-partitions explain pruning, Time Travel and cloning. Three ideas, press Next for each.',
        items: [
          ['Tables are stored as micro-partitions', 'Snowflake splits every table into **micro-partitions**: blocks that each hold roughly **50 to 500 MB of uncompressed data**, stored compressed and **by column**. You never create or manage them.', 'You never manage micro-partitions. Snowflake does.'],
          ['Each partition carries statistics', 'For every column in every micro-partition, Snowflake records the **minimum and maximum value**, the number of distinct values and more. A query with `WHERE order_ts >= ...` can **skip** every partition whose range cannot match. This is called **pruning**.', 'Metadata lets a query skip data it does not need.'],
          ['Micro-partitions are immutable', 'An UPDATE or DELETE never edits a partition in place. Snowflake writes **new partitions** and keeps the old ones for a while. That one design choice gives you **Time Travel**, **zero-copy clones** and consistent reads while data loads.', 'Immutable partitions explain Time Travel and clones.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm1-editions', t: 2, title: 'Editions: what you get at each level',
        say: 'Features depend on the edition your company bought. Interviewers ask which edition a feature needs, so know the main differences. Press Next to see them.',
        cols: ['', 'Standard', 'Enterprise', 'Business Critical'],
        hl: 2,
        rows: [
          ['Time Travel retention', 'Up to 1 day', 'Up to 90 days', 'Up to 90 days'],
          ['Multi-cluster warehouses', 'No', 'Yes', 'Yes'],
          ['Masking and row access policies', 'No', 'Yes', 'Yes'],
          ['Search optimization, materialized views, query acceleration', 'No', 'Yes', 'Yes'],
          ['Private connectivity, customer-managed keys (Tri-Secret Secure)', 'No', 'No', 'Yes'],
          ['Account failover and failback across regions', 'No', 'No', 'Yes']
        ],
        steps: [
          { upto: 2, say: 'Time Travel length and multi-cluster warehouses are the first two differences. Both matter for production pipelines.' },
          { upto: 4, say: 'Column and row security, plus the performance features, start at Enterprise.' },
          { upto: 6, say: 'Business Critical adds private networking, your own encryption keys and failover, which regulated industries often require.' }
        ],
        pick: 'Most data engineering teams need **Enterprise** or higher, because production pipelines use multi-cluster warehouses, long Time Travel and masking. Pick **Business Critical** when regulation requires private connectivity or customer-managed keys. Check the current edition table in the Snowflake documentation before you quote it to a customer.'
      }),

      B.talk({
        id: 'm1-caches', t: 2, title: 'Three caches',
        say: 'Snowflake has three caches. Name all three, say where each one lives, and say what clears it.',
        items: [
          ['Result cache', 'Lives in cloud services. If you run the **same query text** again, the underlying data has **not changed**, and your role still has access, Snowflake returns the stored result with **no warehouse running**. Results last **24 hours** and each reuse renews them. Queries with `CURRENT_TIMESTAMP()` or `RANDOM()` are never reused.', 'The result cache can answer a repeated dashboard query for free.'],
          ['Warehouse (local disk) cache', 'Each warehouse keeps recently read micro-partitions on local SSD. A second query on the same data skips the trip to storage. **Suspending the warehouse clears it.**', 'The local cache disappears when the warehouse suspends.'],
          ['Metadata cache', 'Table statistics live in cloud services, so `COUNT(*)`, `MIN` and `MAX` over a whole table, and commands such as `SHOW TABLES`, can often answer **without a running warehouse**.', 'Simple aggregates and SHOW commands can run on metadata alone.'],
          ['The design consequence', 'A very short auto-suspend saves credits but throws the warehouse cache away. For a BI warehouse queried all day, **5 to 10 minutes** of auto-suspend can cost less overall than 60 seconds, because queries stay fast.', 'Tune auto-suspend per workload. Do not apply 60 seconds everywhere.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A new analyst runs `SELECT * FROM ORDERS` and gets "SQL compilation error: Object \'ORDERS\' does not exist or not authorized." You can see the table. What do you check first?',
        opts: [
          { t: 'The analyst\'s role, database and schema in the session context', fb: '' },
          { t: 'Increase the warehouse size', fb: 'Size has nothing to do with whether an object is visible.' },
          { t: 'Recreate the table', fb: 'The table exists. Recreating it would destroy data and fix nothing.' },
          { t: 'Run UNDROP TABLE', fb: 'UNDROP restores dropped tables. This one was never dropped.' }
        ],
        ok: 0, why: 'That error means the object is not visible to the **current role or context**. Run `SELECT CURRENT_ROLE(), CURRENT_DATABASE(), CURRENT_SCHEMA();` and check the grants, or use the full name `BREWLINE.RAW.ORDERS`.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'You suspend every warehouse for the weekend. What do you still pay for?',
        opts: [
          { t: 'Storage', fb: '' },
          { t: 'Nothing at all', fb: 'Stored data still costs money, billed by the terabyte.' },
          { t: 'Compute at half the normal rate', fb: 'There is no half rate. A suspended warehouse uses no credits.' },
          { t: 'Only the cloud services layer', fb: 'Cloud services is free up to 10% of daily warehouse credits, and you pay for stored data regardless.' }
        ],
        ok: 0, why: 'Storage and compute bill separately. A suspended warehouse uses **no credits**, but your data stays stored. Serverless features such as Snowpipe or automatic clustering also run without a warehouse and bill on their own.'
      }),

      B.quiz({
        id: 'm1-q3', t: 2,
        q: 'A dashboard query takes 20 seconds on every refresh, although no data changed. The SQL filters on `order_ts > DATEADD(\'hour\', -24, CURRENT_TIMESTAMP())`. Why does the result cache not help?',
        opts: [
          { t: '`CURRENT_TIMESTAMP()` is evaluated at run time, so each run counts as a different query', fb: '' },
          { t: 'The result cache needs the Enterprise edition', fb: 'The result cache works on every edition.' },
          { t: 'The result cache only keeps results for one hour', fb: 'It keeps them for 24 hours, renewed on each reuse.' },
          { t: 'The warehouse is too small to cache anything', fb: 'The result cache lives in cloud services and does not depend on warehouse size.' }
        ],
        ok: 0, why: 'A query that calls a function evaluated at execution time, such as `CURRENT_TIMESTAMP()`, cannot reuse a stored result. Let the BI tool pass a fixed boundary, for example a date literal, so identical refreshes send identical SQL.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the life of a query in order.',
        items: [
          'The client sends your SQL to cloud services',
          'Cloud services checks your login and role',
          'The optimizer parses the SQL and picks the micro-partitions to read',
          'Snowflake checks the result cache. On a miss, the plan goes to the warehouse',
          'The warehouse reads partitions from its local cache or from storage',
          'The result returns to you and is saved in the result cache'
        ],
        why: 'Everything before the warehouse happens in cloud services. That is why a result cache hit uses no compute at all.'
      }),

      B.qa({
        id: 'qa-arch', t: 1, tag: 'Snowflake basics', secs: 60,
        q: 'Explain the Snowflake architecture.',
        pts: ['Three layers: storage, compute, cloud services', 'Storage and compute scale and bill separately', 'Micro-partitions with min and max metadata allow pruning', 'Several warehouses read the same data without competing', 'Tie it to a design choice: a warehouse per workload'],
        short: 'Snowflake has three layers. Storage keeps one copy of each table as compressed, columnar micro-partitions in cloud object storage. Compute is made of virtual warehouses, which are independent clusters that run queries and loads. Cloud services handles login, roles, metadata, query planning and transactions.\n\nBecause storage and compute are separate, each one scales and bills on its own. I can run several warehouses on the same data without them competing, so I give loading, transformation and BI their own warehouses. The metadata holds the minimum and maximum of every column per micro-partition, which lets a query skip data it does not need. That is why filtering on well-organized columns makes queries faster and cheaper.',
        fu: [
          ['What is a micro-partition?', 'The unit of storage: an immutable block holding roughly 50 to 500 MB of uncompressed data, stored compressed and by column. Snowflake keeps statistics per column for each one, and the optimizer uses them to prune.'],
          ['What happens when a warehouse suspends?', 'You stop paying for compute. The local disk cache is lost, so the first queries after a resume read from storage and run slower.'],
          ['Where does the result cache live?', 'In cloud services. A repeated identical query on unchanged data can return in milliseconds with no warehouse running.']
        ],
        trap: 'Reciting the three layers and stopping there. Add one sentence that links the design to a decision, such as "so I give each workload its own warehouse."'
      }),

      B.qa({
        id: 'qa-cache', t: 2, tag: 'Snowflake basics', secs: 60,
        q: 'What caches does Snowflake use, and how does that change the way you run warehouses?',
        pts: ['Result cache in cloud services, 24 hours, same query and unchanged data', 'Warehouse local disk cache, lost on suspend', 'Metadata answers for counts, min and max', 'Run-time functions and changed data skip the result cache', 'Design effect: auto-suspend trade-off and consistent SQL text from BI tools'],
        short: 'There are three. The result cache lives in cloud services: the same query text on unchanged data, by a role with access, returns the stored result with no warehouse running, for 24 hours and renewed on reuse. The warehouse cache keeps recently read micro-partitions on local SSD and disappears when the warehouse suspends. The metadata cache answers things like counts, minimums and maximums without scanning.\n\nIt changes how I run warehouses. A 60-second auto-suspend saves credits but clears the local cache, so for a BI warehouse used all day I accept 5 to 10 minutes. I also keep BI SQL stable, without run-time functions in filters, so the result cache can help.',
        fu: [
          ['Does a different role get the cached result?', 'Only if that role has the privileges the original query needed. Snowflake checks access before it returns a cached result.'],
          ['How would you check whether a query used a cache?', 'In Query History or the Query Profile. A result cache hit shows "query result reuse", and the profile of a warehouse query shows how much was read from cache and how much from remote storage.']
        ],
        trap: 'Saying "suspend as fast as possible to save money". That ignores the cache and can make an all-day BI warehouse slower and more expensive.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Worksheet Starter', color: '#BFDBFE',
        pts: [
          'Three layers: **cloud services**, **virtual warehouses**, **storage**. Storage and compute scale and bill separately.',
          'Tables are **immutable micro-partitions** with min and max metadata. That enables pruning, Time Travel and clones.',
          'Names are `database.schema.object`. Unquoted names are upper case. Check your **session context** first when an object seems missing.',
          'Life of a query: authenticate, optimize, check **result cache**, run on the warehouse, cache the result.',
          'Three caches: result (cloud services, 24 hours), local disk (lost on suspend), metadata.'
        ],
        lines: [
          'Storage and compute are separate, so I give each workload its own warehouse over the same data.',
          'A result cache hit uses no compute, but a run-time function in the filter prevents it.',
          'Pruning comes from min and max metadata on immutable micro-partitions.'
        ]
      })
    ]
  });
})();
