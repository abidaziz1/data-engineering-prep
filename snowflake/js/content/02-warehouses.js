/* Mission 2: virtual warehouses, credits and compute cost. */
(function () {
  var B = LAB.b;

  var WH = [
    '-- 1. One warehouse per workload',
    'CREATE WAREHOUSE IF NOT EXISTS WH_LOAD',
    "  WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE",
    '  INITIALLY_SUSPENDED = TRUE;',
    'CREATE WAREHOUSE IF NOT EXISTS WH_BI',
    "  WAREHOUSE_SIZE = 'MEDIUM' AUTO_SUSPEND = 300 AUTO_RESUME = TRUE",
    "  MIN_CLUSTER_COUNT = 1 MAX_CLUSTER_COUNT = 3 SCALING_POLICY = 'STANDARD';",
    '',
    '-- 2. Resize it. New queries use the new size at once.',
    "ALTER WAREHOUSE WH_BI SET WAREHOUSE_SIZE = 'LARGE';",
    '',
    '-- 3. Stop it now, then start it again',
    'ALTER WAREHOUSE WH_BI SUSPEND;',
    'ALTER WAREHOUSE WH_BI RESUME IF SUSPENDED;',
    '',
    '-- 4. See what you have',
    'SHOW WAREHOUSES;'
  ].join('\n');

  var GUARD = [
    'USE ROLE ACCOUNTADMIN;',
    '',
    '-- 1. A monthly credit budget with a warning and a hard stop',
    'CREATE OR REPLACE RESOURCE MONITOR RM_BI WITH CREDIT_QUOTA = 200',
    '  FREQUENCY = MONTHLY START_TIMESTAMP = IMMEDIATELY',
    '  TRIGGERS ON 75 PERCENT DO NOTIFY',
    '           ON 100 PERCENT DO SUSPEND',
    '           ON 110 PERCENT DO SUSPEND_IMMEDIATE;',
    'ALTER WAREHOUSE WH_BI SET RESOURCE_MONITOR = RM_BI;',
    '',
    '-- 2. Stop runaway and stuck queries',
    'ALTER WAREHOUSE WH_BI SET',
    '  STATEMENT_TIMEOUT_IN_SECONDS = 1800',
    '  STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 300;',
    '',
    '-- 3. Label work so cost can be attributed to a team',
    "ALTER SESSION SET QUERY_TAG = 'team=finance;job=daily_revenue';"
  ].join('\n');

  var BUGWH = [
    'CREATE WAREHOUSE WH_REPORTING',
    "  WAREHOUSE_SIZE = 'XLARGE'",
    '  AUTO_SUSPEND = 0',
    '  AUTO_RESUME = TRUE;'
  ].join('\n');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Warehouses and credits', short: 'Warehouses', blurb: 'Sizes, billing, scale up or out, guardrails', minutes: 24,
    focus: ['air'],
    goals: [
      'Explain what a **virtual warehouse** is and how **credits** are billed.',
      'Set **size, auto-suspend and auto-resume** and give a reason for each.',
      'Choose **scale up or scale out** from the symptom you see.',
      'Put **guardrails** on spend with monitors, timeouts and query tags.'
    ],
    say: 'Mission 2 is compute and money. In Snowflake the two are the same topic, because every second a warehouse runs costs credits. Interviewers use this topic to find out whether you think about cost.',
    scenes: [
      B.talk({
        id: 'm2-basics', t: 1, title: 'Warehouses, sizes and credits',
        say: 'Five facts you need to know cold. Press Next for each one.',
        items: [
          ['A warehouse is compute you switch on', 'A **virtual warehouse** is a cluster of servers that runs your queries, loads and transformations. It stores no data. You can create, resize, suspend and drop warehouses in seconds.', 'Warehouses run work. Storage keeps data. They are separate.'],
          ['Sizes double in cost', 'X-Small uses **1 credit per hour**. Small is 2, Medium 4, Large 8, X-Large 16, 2X-Large 32, 3X-Large 64, 4X-Large 128. Each size has twice the servers of the one below it.', 'Credits per hour double with every size.'],
          ['You pay per second, with a 60 second minimum', 'Billing runs **per second** while a warehouse is running. Each time a warehouse starts or resumes, Snowflake bills at least **60 seconds**. A credit costs a fixed amount set by your contract and edition.', 'Per-second billing, 60 second minimum on each start.'],
          ['Auto-suspend and auto-resume', '**Auto-suspend** stops the warehouse after it has been idle for the time you set. **Auto-resume** starts it again when the next query arrives. A suspended warehouse uses no credits.', 'Idle time is the first cost to attack.'],
          ['Warehouses do not compete', 'Different warehouses never compete for compute, even when they read the same table. That is why teams give each workload its own warehouse. A decision exercise later in this mission puts it into practice.', 'Separate warehouses mean separate performance and a separate cost line.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm2-sql', t: 1, title: 'Create, resize and suspend', file: 'worksheet: warehouses.sql', code: WH,
        ctx: { role: 'SYSADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'The statements you will run most often on warehouses. Press Next to go through them.', lines: null },
          { say: 'Create one warehouse per workload. WH_LOAD is X-Small and suspends after 60 seconds. WH_BI is Medium with up to three clusters, for many analysts at once. INITIALLY_SUSPENDED stops it from starting, and billing, at creation.', lines: [1, 7] },
          { say: 'Resize with ALTER. Queries already running finish on the old size. New queries use the new size immediately.', lines: [9, 10] },
          { say: 'SUSPEND stops the warehouse now. RESUME IF SUSPENDED is safe to run even when it is already on.', lines: [12, 14] },
          { say: 'SHOW WAREHOUSES lists them with state, size and settings. Press Run.', lines: [16, 17], run: true }
        ],
        result: { cols: ['name', 'state', 'size', 'min_cluster_count', 'max_cluster_count', 'auto_suspend', 'auto_resume'], rows: [['WH_BI', 'STARTED', 'Large', '1', '3', '300', 'true'], ['WH_LOAD', 'SUSPENDED', 'X-Small', '1', '1', '60', 'true']], msg: '2 rows (some columns left out)' },
        note: 'Multi-cluster settings (`MIN_CLUSTER_COUNT`, `MAX_CLUSTER_COUNT`) need Enterprise edition or higher.'
      }),

      B.widget({ id: 'm2-lab', t: 1, title: 'Lab: size the warehouse', kind: 'wh' }),

      B.cmp({
        id: 'm2-tools', t: 1, title: 'Scale up, scale out, or something else',
        say: 'When a workload is slow, there are four common levers. Interviewers love asking which one you would pull. Press Next to see each row.',
        cols: ['', 'Scale up (bigger size)', 'Scale out (multi-cluster)', 'Query acceleration', 'Fix the data access'],
        rows: [
          ['Use it for', 'One big slow query: large scans, heavy joins, spilling', 'Many users at once, queries waiting in a queue', 'A few very large scans on a warehouse that otherwise runs small queries', 'Queries that read far more data than they need'],
          ['It does not help', 'Concurrency. Fifty queries still queue', 'A single slow query', 'Queries that are already short', 'Compute-bound work on well-pruned data'],
          ['What it costs', 'Credits per hour double with each size', 'Each running cluster bills at the full rate', 'Extra serverless credits', 'Engineering time, plus clustering credits if you recluster']
        ],
        steps: [
          { upto: 1, say: 'What each lever is for. A bigger warehouse helps one heavy query. More clusters help many users. Query acceleration offloads big scans. Fixing data access makes every query read less.' },
          { upto: 2, say: 'What each one does not fix. Most wrong answers in interviews are here: a bigger warehouse does not fix queueing, and more clusters do not fix a slow query.' },
          { upto: 3, say: 'And what each costs. Say the cost every time you recommend one.' }
        ],
        pick: 'Diagnose first. **One slow query**: open the Query Profile, fix pruning and joins, then consider a bigger size. **Queued queries**: scale out. **A few outlier scans**: query acceleration. Reading less data beats adding compute almost every time.'
      }),

      B.widget({ id: 'm2-queue', t: 2, title: 'Lab: the 9 AM rush', kind: 'queue' }),

      B.talk({
        id: 'm2-multi', t: 2, title: 'Multi-cluster warehouses in detail',
        say: 'Multi-cluster warehouses are the standard answer to concurrency. Here are the settings and the costs.',
        items: [
          ['Min and max clusters', '`MIN_CLUSTER_COUNT` and `MAX_CLUSTER_COUNT` set the range. With min 1 and max 3, Snowflake runs one cluster and adds up to two more when queries queue. If min equals max, the warehouse runs in **maximized mode** with every cluster always on. Multi-cluster needs **Enterprise** edition or higher.', 'Set a range, and Snowflake adds and removes clusters.'],
          ['STANDARD or ECONOMY', '**STANDARD** is the default. It starts another cluster as soon as queries queue and shuts clusters down after a few minutes of low load. **ECONOMY** starts one only when it can keep it busy for about 6 minutes, which saves credits but lets queries wait.', 'STANDARD favors speed. ECONOMY favors cost.'],
          ['What it costs', 'Every running cluster bills at the **full hourly rate of the size**. A Large warehouse with 3 clusters running for an hour uses 8 x 3 = **24 credits**. Set the maximum from the number of users you really have.', 'Cost grows with each running cluster.'],
          ['What it does not fix', 'It adds places to run at once. A slow query stays slow on every cluster, so it never replaces tuning.', 'Multi-cluster fixes queueing, not slow queries.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm2-idle', t: 2, title: 'Lab: auto-suspend and idle cost', kind: 'idle' }),

      B.sql({
        id: 'm2-guard', t: 2, title: 'Guardrails: monitors, timeouts and tags', file: 'worksheet: guardrails.sql', code: GUARD,
        ctx: { role: 'ACCOUNTADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'A cost incident usually starts with one runaway query or one warehouse left on. These statements put a ceiling on both. Press Next.', lines: null },
          { say: 'Resource monitors are created by ACCOUNTADMIN, so switch role first.', lines: [1, 1] },
          { say: 'This monitor gives WH_BI 200 credits a month. At 75 percent you get a notification. At 100 percent it suspends the warehouse once running queries finish. At 110 percent it stops everything immediately. Then you attach it to the warehouse.', lines: [3, 9] },
          { say: 'Timeouts protect you from a query that never ends and from a queue that never moves. The default statement timeout is two days, which is far too long for a dashboard.', lines: [11, 14] },
          { say: 'A query tag labels every statement in the session. Later you can group cost and run time by the tag, so you can tell finance which team spent what.', lines: [16, 17] }
        ],
        note: 'Resource monitors cover **warehouse** credits only. Serverless features such as Snowpipe and automatic clustering need **budgets**, which Mission 11 covers.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A teammate creates a reporting warehouse and the bill doubles. Click the line that causes it.',
        file: 'create_wh_reporting.sql', lang: 'sql', code: BUGWH, bad: 3,
        hint: 'Look at the setting that decides when the warehouse stops.',
        why: '`AUTO_SUSPEND = 0` means **never suspend**. An idle X-Large warehouse burns **16 credits every hour**, which is **384 credits a day**, with no queries at all. Use a value between 60 and 600 seconds, chosen for the workload.',
        fix: 'CREATE WAREHOUSE WH_REPORTING\n  WAREHOUSE_SIZE = \'XLARGE\'\n  AUTO_SUSPEND = 120\n  AUTO_RESUME = TRUE;'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'A Large warehouse (8 credits per hour) has auto-suspend set to 60 seconds. It is suspended, then one 30 second query arrives. About how many credits does that one query cost?',
        opts: [
          { t: 'About 0.07 credits', fb: 'That bills only the 30 query seconds. The warehouse also runs for the 60 idle seconds before it suspends.' },
          { t: 'About 0.13 credits', fb: 'That uses the 60 second minimum alone. The warehouse actually runs for 90 seconds, which is more than the minimum.' },
          { t: 'About 0.20 credits', fb: '' },
          { t: '8 credits', fb: 'That is a full hour. Billing is per second, not per hour.' }
        ],
        ok: 2, why: 'The warehouse runs for the 30 second query plus the 60 seconds it waits before suspending: 90 seconds. 8 credits per hour x 90 / 3600 = **0.2 credits**. Idle seconds before suspend are part of the bill.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'Dashboards run fast one at a time, but at 9 AM forty analysts wait in a queue. What fixes it?',
        opts: [
          { t: 'A multi-cluster warehouse (scale out)', fb: '' },
          { t: 'A larger warehouse size (scale up)', fb: 'Each query is already fast. A bigger size does not add places to run at the same time.' },
          { t: 'A clustering key on every table', fb: 'Clustering reduces data read per query. It does not change how many queries run at once.' },
          { t: 'A longer Time Travel period', fb: 'Time Travel is a recovery feature and has nothing to do with concurrency.' }
        ],
        ok: 0, why: 'Queueing means too many concurrent queries for one cluster. A **multi-cluster** warehouse adds clusters when queries queue and removes them when load drops.'
      }),

      B.quiz({
        id: 'm2-q3', t: 2,
        q: 'You resize a warehouse from Large to 4X-Large and a nightly query takes the same time. What is the most likely reason?',
        opts: [
          { t: 'The query is not limited by compute: it reads little data or waits on something a bigger warehouse cannot speed up', fb: '' },
          { t: 'The resize needs a restart that you skipped', fb: 'New queries use the new size right away, and no restart is needed.' },
          { t: 'Snowflake limits how many servers one query may use', fb: 'There is no such cap. A query can use every server in the warehouse, but only if its work can be split up. A small or skewed query cannot.' },
          { t: 'Credits ran out', fb: 'The query would have failed or been suspended, not run at the same speed.' }
        ],
        ok: 0, why: 'A query that does not get faster with more compute is not compute-bound. Look at the Query Profile for poor pruning, a single-threaded step, a join on skewed keys or simply too little data to parallelize.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, title: 'Decision: how many warehouses?',
        scenario: 'Brewline has four kinds of work. **Loaders** run overnight for 20 minutes. **Hourly transformations** run for about 10 minutes. **Forty analysts** use dashboards from 9 to 6. **The website** sends small queries to an API all day and night.',
        opts: [
          { t: 'One large shared warehouse', d: 'Everything runs on one warehouse called WH_ALL.', lose: 'A heavy hourly job slows the dashboards, the always-on website keeps the warehouse awake at night, and you cannot tell which workload costs what.' },
          { t: 'One warehouse per workload', d: 'WH_LOAD, WH_TRANSFORM, WH_BI and WH_APP, each sized and tuned for its own work.' },
          { t: 'One warehouse per analyst', d: 'Every person gets their own.', lose: 'Forty mostly idle warehouses each bill for their own start-ups and idle seconds, and nobody tunes them. Use multi-cluster scaling for concurrency instead.' }
        ],
        pick: 1,
        why: 'Separate warehouses give **isolation** (a transformation cannot slow a dashboard), **right-sizing** (X-Small for loading, Large and multi-cluster for BI) and **cost attribution** (each warehouse is a line on the bill). The API warehouse stays small with a longer auto-suspend, because queries arrive all day.',
        when: 'A very small team can start with **one shared warehouse** and split when workloads begin to interfere. Large companies often add **one warehouse per team** so finance can charge costs back.'
      }),

      B.talk({
        id: 'm2-gen2', t: 3, title: 'Generation 2 warehouses',
        say: 'Snowflake now offers a second generation of standard warehouses. Know what it is and how to evaluate it. This area changes quickly, so confirm details in the documentation.',
        items: [
          ['What it is', 'A second generation of standard warehouses on newer hardware, generally available since **May 2025**. It is aimed at faster scans, joins and data changes for analytics and data engineering work.', 'Gen2 is a hardware generation, not a new feature to learn.'],
          ['What it costs', 'Third-party sources report that Gen2 uses roughly **1.25 to 1.35 times** the credits per hour of Gen1 at the same size, depending on the cloud, and that it stops at 4X-Large. I could not confirm these figures in Snowflake\'s own tables from here, so check the **Service Consumption Table** before you quote a number.', 'Faster hardware saves money only if the job finishes proportionally sooner.'],
          ['How to decide', 'Run the same representative job on a Gen1 and a Gen2 warehouse of the same size. Compare **credits used per job** first and treat runtime as the second number. Move a workload when credits per job fall, or when the speed gain is worth the extra cost.', 'Test on your own workload and compare credits.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-size', t: 1, tag: 'Warehouses', secs: 60,
        q: 'What is the difference between scaling up and scaling out in Snowflake?',
        pts: ['Scale up: a bigger size for one heavy query', 'Scale out: more clusters for many concurrent queries', 'Credits double with each size, and each running cluster bills at the full rate', 'Diagnose first: one slow query or a queue', 'Neither fixes poor pruning or a bad join'],
        short: 'Scaling up means a bigger warehouse size. It gives one query more servers, so it helps a large scan, a heavy join or spilling. Scaling out means a multi-cluster warehouse, which adds clusters when queries queue. It helps when many users run queries at the same time.\n\nI diagnose first. If one query is slow, I open the Query Profile and fix pruning and joins before I add compute. If queries wait in a queue, I scale out. Cost matters in both cases: credits double with each size, and every running cluster bills at the full rate. A bigger warehouse does not fix queueing, and more clusters do not fix a slow query.',
        fu: [
          ['How do you know a query is limited by compute?', 'I double the size once and measure. If the runtime does not drop by about half, the query is not compute-bound, and I look at pruning, join keys and data volume instead.'],
          ['When would you use the Query Acceleration Service?', 'When a warehouse mostly runs small queries but a few large scans slow it down. The service offloads part of those scans to serverless compute, so I avoid sizing the whole warehouse for the outliers.']
        ],
        trap: 'Saying "I would use a bigger warehouse" for every problem. It shows you reach for spending before diagnosis.'
      }),

      B.qa({
        id: 'qa-cost', t: 2, tag: 'Warehouses', secs: 75,
        q: 'How do you keep Snowflake compute cost under control?',
        pts: ['A warehouse per workload, right-sized', 'Auto-suspend tuned per workload, never zero', 'Resource monitors with notify and suspend thresholds', 'Statement and queue timeouts, query tags for attribution', 'Efficient queries: prune, select needed columns, incremental loads', 'Review spend every week from the usage views'],
        short: 'I treat cost as a design constraint with four levers. First, a warehouse per workload, sized for its work, so I can see and tune each cost line. Second, auto-suspend tuned per workload: 60 seconds for batch jobs, longer for an all-day BI warehouse so its cache stays warm. Never zero. Third, guardrails: resource monitors with a notification at 75 percent and a suspend at 100 percent, statement timeouts, and query tags so spend can be attributed to teams.\n\nFourth, efficient queries: filters that prune, only the columns needed, and incremental loads instead of full rebuilds. I review the usage views every week, starting with the most expensive warehouses and queries.',
        long: 'I treat cost as a design constraint, and I use four levers.\n\nFirst, structure. Each workload gets its own warehouse, sized for its work: X-Small for loading, Medium for transformation, Large and multi-cluster for BI. That isolates performance and gives me one cost line per workload.\n\nSecond, idle time. Auto-suspend is tuned per workload. Batch jobs use 60 seconds. An all-day BI warehouse gets a few minutes so its cache stays warm and users do not wait on cold reads. I never set it to zero.\n\nThird, guardrails. Resource monitors notify at 75 percent of a monthly credit quota and suspend at 100 percent. Statement timeouts stop runaway queries, and queue timeouts stop stuck ones. Query tags let me attribute cost to teams and jobs.\n\nFourth, the queries themselves. Filters that prune, only the needed columns, and incremental loads instead of full rebuilds usually save more than any warehouse setting.\n\nI review the usage views every week, looking at the top warehouses and the top queries by time and credits. Resource monitors cover warehouses only, so I add budgets for serverless features.',
        fu: [
          ['What is a resource monitor?', 'A credit quota on the account or on warehouses, with actions at thresholds: notify, suspend after running queries finish, or suspend immediately. It turns an unexpected spike into an alert before it becomes an unexpected invoice.'],
          ['How do you attribute cost to a team?', 'Separate warehouses per workload, plus query tags set by each job or tool. The usage views can then be grouped by warehouse or tag.']
        ],
        trap: 'Listing only "auto-suspend and resource monitors". Show the design lever first (warehouse per workload) and the query lever last, because that is where most savings are.',
        real: 'Add one real saving you made: the warehouse you right-sized, the query you fixed, and the credits per day before and after.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Warehouse Operator', color: '#99F6E4',
        pts: [
          'A **virtual warehouse** is switchable compute. Credits per hour **double with each size**. Billing is **per second**, 60 second minimum on each start.',
          'Set **auto-suspend** per workload and never to zero. Idle seconds before suspend are billed.',
          '**Scale up** for one heavy query. **Scale out** (multi-cluster) for queueing. Neither fixes poor pruning.',
          'Each **running cluster** bills at the full hourly rate.',
          'Guardrails: **resource monitors**, statement timeouts, queue timeouts, **query tags**. Serverless features need budgets.'
        ],
        lines: [
          'I give each workload its own warehouse, so I get isolation and one cost line per workload.',
          'A bigger warehouse does not fix queueing, and more clusters do not fix a slow query.',
          'I double the size once. If the runtime does not halve, the query is not compute-bound.'
        ]
      })
    ]
  });
})();
