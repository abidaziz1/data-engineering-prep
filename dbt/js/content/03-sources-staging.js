/* Mission 3: sources, freshness and staging models. */
(function () {
  var B = LAB.b, G = LAB.get;

  var SRC = G.file('models/staging/brewline/_brewline__sources.yml');
  var STG = G.file('models/staging/brewline/stg_brewline__orders.sql');
  var STG_C = G.sql('compiled/day1/stg_brewline__orders');
  var RAWDIRECT = G.file('scenario/stg_orders_raw_direct.sql');
  var LOST = G.ls('source_orders_down').filter(function (n) { return G.ls('raw_direct_down').indexOf(n) < 0; });
  var fresh = function (k) { return G.grep(G.log(k), /freshness of/).replace(/^\d\d:\d\d:\d\d\s+/gm, ''); };

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Sources and staging', short: 'Staging', blurb: 'Declare raw tables, check freshness, clean one table per model', minutes: 28,
    focus: ['src', 'stg'],
    goals: [
      'Declare a **source** in YAML and read from it with `source()`.',
      'Set up **freshness** checks and read a warning or an error.',
      'Write a **staging model**: rename, cast, remove duplicate versions, nothing more.',
      'Explain why staging is **one model per source table**, and where the naming conventions come from.'
    ],
    say: 'Mission 3 is the front door. The raw tables are messy and you do not control them. Staging is where you decide, once, what a clean version looks like, so nobody downstream has to think about it again.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, title: 'Sources and staging in two minutes',
        say: 'Two ideas, one after the other. Press Next for each.',
        items: [
          ['A source is a promise about a raw table', 'You list the raw tables in a YAML file. After that, models read them with `source(\'brewline\', \'orders\')`. dbt knows the table is **not** one of its models, can draw it in the lineage, and can check how fresh it is.', 'Declare it once, read it everywhere.'],
          ['Freshness asks: did the loader run?', 'You name the column that holds the load time, then set a warning and an error threshold. `dbt source freshness` compares the newest value with the clock.', 'Every other test passes on old data. Only freshness looks at the clock.'],
          ['Staging cleans one table at a time', 'A staging model reads **one** source table and does the boring work: rename columns, cast types, lower-case emails, keep the newest version of each row. It does no joins and no sums.', 'One raw table in, one clean table out.'],
          ['Why bother?', 'Everything downstream then starts from tables with the same names, the same types and one row per key. When the loader changes a column name, you fix **one** file.', 'Staging is where the mess stops.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm3-src', t: 1, title: 'Declaring sources', file: 'models/staging/brewline/_brewline__sources.yml', lang: 'yaml', code: SRC,
        steps: [
          { say: 'This YAML file is the real one from the project. It lists the four raw tables. Press Next to read it.', lines: null },
          { say: 'The source has a name, a description and a schema. The name is what you pass to source() as the first argument. The schema is where the loader put the tables.', lines: G.span(SRC, /^sources:/, /schema: raw/) },
          { say: 'Freshness. `loaded_at_field` is the column with the load time. Warn after 12 hours, error after 24. Set once here, these thresholds apply to every table in the source.', lines: G.span(SRC, /^    config:/, /error_after/) },
          { say: 'Now the tables. Each one can have a description and column notes. The orders table says what makes it special: it keeps every version of an order.', lines: G.span(SRC, /^      - name: orders/, /Business key/) },
          { say: 'The other three tables. A source table needs only a name. Everything else is optional, but descriptions end up in the docs.', lines: G.span(SRC, /^      - name: order_items/, /^        description: The product catalog/) }
        ],
        note: 'Sources can also be tested like models. A `unique` or `not_null` test on a raw column catches a bad load before staging hides it.'
      }),

      B.term({
        id: 'm3-fresh-warn', t: 1, title: 'Freshness: a warning', g: 'dag',
        say: 'I set the newest orders row to 14 hours ago and ran the freshness check. The warning threshold is 12 hours, so dbt warns. Watch the source block.',
        initial: G.wait('dag'),
        lines: function () { return G.term('freshness_warn'); },
        after: 'A **WARN** does not fail the command. It shows up in the log, and a scheduler can alert on it. At 24 hours the same check becomes an error.',
        afterKind: 'tip',
        doneSay: 'Warn at twelve hours, error at twenty-four. Pick thresholds from how often the loader really runs, not from a guess.'
      }),

      B.term({
        id: 'm3-fresh-error', t: 1, title: 'Freshness: an error', g: 'dag',
        say: 'Now the newest row is 30 hours old. The error threshold is 24 hours, so the status is ERROR STALE. The command ends with an error, which a scheduler can use to stop the run.',
        initial: G.wait('dag'),
        lines: function () { return G.term('freshness_error'); },
        after: 'The loader stopped. Without this check, the nightly build would **succeed** on old data, every test would pass, and the dashboard would show yesterday\'s numbers as if they were today\'s.',
        afterKind: 'warn',
        doneSay: 'This is the failure that nothing else catches. The data is valid. It is just old.'
      }),

      B.rows({
        id: 'm3-rows', t: 1, title: 'Follow order O-5001 into staging',
        steps: [
          {
            say: 'Here are the two versions of order O-5001 in RAW. The loader appended a new row when the status changed. The marked row is the newest.',
            tabs: [{ layer: 'RAW', name: 'raw.orders', c: 'raw', cols: G.table('raw_orders').cols, rows: G.where('raw_orders', 'order_id', ['O-5001']).rows, trk: 1 }],
            notes: ['Both rows have the same `order_id`. A query that reads this table directly counts the order twice.']
          },
          {
            say: 'The staging model keeps one row per order: the one with the newest load time. It also renames order_ts to ordered_at, upper-cases the status and casts the total to a decimal.',
            tabs: [
              { layer: 'RAW', name: 'raw.orders', c: 'raw', cols: G.table('raw_orders').cols, rows: G.where('raw_orders', 'order_id', ['O-5001']).rows, trk: 1 },
              { layer: 'STAGING', name: 'stg_brewline__orders', c: 'stg', cols: G.table('stg_orders').cols, rows: G.where('stg_orders', 'order_id', ['O-5001']).rows, trk: 0, chg: [[0, 2], [0, 3], [0, 4]] }
            ],
            ops: ['`row_number() over (partition by order_id order by _loaded_at desc) = 1`, then rename and cast'],
            notes: ['The yellow cells changed name or type. Staging **removed** the older version and changed no value.']
          }
        ]
      }),

      B.sql({
        id: 'm3-sql', t: 1, title: 'The staging model for orders', file: 'models/staging/brewline/stg_brewline__orders.sql', code: STG,
        compiled: { label: 'What the warehouse receives after compiling', file: 'target/compiled/brewline/.../stg_brewline__orders.sql', code: STG_C },
        result: G.result('stg_orders'),
        steps: [
          { say: 'This is the real staging model. It has three parts. Press Next to read them.', lines: null },
          { say: 'The first part reads the raw table through source(). Giving it a clear name, source, makes the rest easy to read.', lines: G.span(STG, /^with source as/, /^\),$/) },
          { say: 'The second part keeps the latest version of each order. QUALIFY filters on a window function, here the row number within each order. The newest load time gets number 1. Snowflake, BigQuery, DuckDB and Databricks support QUALIFY. Where it is missing, use a subquery.', lines: G.span(STG, /^latest as/, /^\)$/) },
          { say: 'The last part is the clean output. It renames order_ts to ordered_at, upper-cases the status, casts the total to a decimal, and renames the load time. No joins, no sums.', lines: G.span(STG, /^select$/, /^from latest/) },
          { say: 'In the compiled version only the source() call changed. It became the real raw table.', compiled: true, lines: G.span(STG, /^with source as/, /^\),$/), clines: G.span(STG_C, /^with source as/, /^\),$/) },
          { say: 'Run it. Ten rows for ten orders, even though RAW has twelve rows. Every status is upper case, and the dates are real timestamps.', run: true, lines: null }
        ],
        note: 'Staging models are views. They cost nothing to store and always show the current raw data. The tables come later, in the marts.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A teammate wrote the staging model for orders and tested it locally. Click the line that will cause trouble in the project.',
        file: 'models/staging/brewline/stg_brewline__orders.sql', lang: 'jinja', code: RAWDIRECT, bad: G.at(RAWDIRECT, /raw\.orders/),
        hint: 'Look at how the model reads the raw table.',
        why: 'Typing `raw.orders` hides the source from dbt. I ran `dbt ls --select source:brewline.orders+` on this version and it listed only the source itself, so dbt no longer knew about **' + LOST.length + ' downstream nodes**: ' + LOST.join(', ') + '. Freshness warnings on that source would not reach them, the lineage graph has a gap, and the schema is typed in.',
        fix: STG,
        cheer: 'Always go through source(). It is what makes freshness, lineage and impact checks work.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Freshness is set to warn after 12 hours and error after 24 hours. The orders loader stopped 30 hours ago. What does `dbt source freshness` report?',
        opts: [
          { t: 'PASS, because the tests on the data all pass', fb: 'Freshness is about the clock, not the values. It does not look at test results.' },
          { t: 'WARN, because 30 hours is above 12', fb: 'Both thresholds are crossed. The more serious one wins.' },
          { t: 'ERROR STALE, because 30 hours is above the 24-hour error threshold', fb: '' },
          { t: 'Nothing, because freshness only runs inside dbt build', fb: 'dbt build does not run freshness unless you ask for it. It is its own command.' }
        ],
        ok: 2, why: 'The newest `_loaded_at` is compared with now. Beyond the error threshold the status is **ERROR STALE**. The real run printed: ' + fresh('freshness_error').split('\n')[1].replace(/\s*\.{2,}\s*/, ' ... ') + '.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'Which of these belongs in a **staging** model?',
        opts: [
          { t: 'Renaming columns, casting types and keeping the newest version of each row', fb: '' },
          { t: 'Joining orders to customers to add the customer name', fb: 'Joins belong in intermediate or mart models. Staging keeps the grain of one source table.' },
          { t: 'Adding up revenue per day', fb: 'Aggregation changes the grain. That is a mart job.' },
          { t: 'The rule that decides when a customer counts as a VIP', fb: 'Business rules belong in marts, where they are visible and tested.' }
        ],
        ok: 0, why: 'Staging does the boring, mechanical cleaning of one source table and keeps its grain. Joins, sums and business rules come later, so the cleaning is done once and the rules live in one place.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps of staging a new raw table in order.',
        items: [
          'Declare the raw table under a source in YAML',
          'Create stg_<source>__<table>.sql that selects from source()',
          'Rename the columns to the project\'s naming standard',
          'Cast each column to the right type',
          'Keep one row per key, the newest version',
          'Add unique and not_null tests on the key'
        ],
        why: 'Declare, read, rename, cast, deduplicate, test. The tests come last because they check the result of the other steps, and they stay in the project to catch the next bad load.'
      }),

      B.challenge({
        id: 'm3-ch', t: 1,
        q: 'Write a model that returns the **latest version of every order** straight from the raw table: `order_id`, `status`, `total_usd` and `_loaded_at`, one row per order, sorted by order id. Your warehouse **does not support QUALIFY**, so use a subquery or a CTE.',
        data: [{ name: 'raw.orders, orders O-5001 and O-5003', cols: G.table('raw_orders').cols, rows: G.where('raw_orders', 'order_id', ['O-5001', 'O-5003']).rows }],
        lang: 'jinja', file: 'models/scratch/latest_orders.sql',
        starter: 'select\n    -- your columns\nfrom {{ source(\'brewline\', \'orders\') }}',
        hints: ['Number the versions of each order with a window function.', '`row_number() over (partition by order_id order by _loaded_at desc)` gives the newest row the number 1.', 'You cannot filter on a window function in the same SELECT, so put it in a CTE and filter on the number outside.'],
        sol: G.file('scenario/ch_m3_latest.sql'),
        res: G.result('ch_m3_latest'),
        expl: ['The CTE numbers every version of every order. Number 1 is the newest.', 'The outer query keeps number 1, so each order appears once. Ten orders come out of twelve raw rows.', 'This is what QUALIFY does in one line. On warehouses that support it, prefer QUALIFY: it is shorter and harder to get wrong.'],
        cx: 'One sort per order key: roughly O(n log n) in the number of raw rows. The window function does the work.'
      }),

      B.cmp({
        id: 'm3-names', t: 2, title: 'Layers and naming conventions',
        say: 'Most dbt projects use the same three layers and the same name patterns. They come from dbt Labs\' own style guide, and they make a project readable to strangers. Press Next for each layer.',
        cols: ['Layer', 'Name pattern', 'Usually built as', 'Contains', 'Does not contain'],
        hl: 1,
        rows: [
          ['Staging', '`stg_<source>__<table>`', 'View', 'Renames, casts, deduplication, light cleaning. One model per source table.', 'Joins, aggregations, business rules'],
          ['Intermediate', '`int_<entity>__<verb>`', 'View or ephemeral', 'Joins and reshaping that more than one mart needs, such as adding up order lines.', 'The final answer people query'],
          ['Marts', '`fct_<event>` and `dim_<thing>`', 'Table or incremental', 'Business logic at a stated grain: facts for events, dimensions for things.', 'Raw column names, hidden joins']
        ],
        steps: [
          { upto: 1, say: 'Staging. Notice the double underscore between the source and the table. It makes `stg_brewline__orders` easy to split by eye, and it keeps a source name that contains an underscore unambiguous.' },
          { upto: 2, say: 'Intermediate. This layer is optional. Skip it if a mart can read staging directly without repeating logic.' },
          { upto: 3, say: 'Marts. Facts record things that happened, such as an order. Dimensions describe things, such as a customer.' }
        ],
        pick: 'Follow the conventions even on a small project. The point is that the next engineer can find a model without asking. Write down where your team **differs** from them.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, title: 'Decision: where should "latest version of an order" live?',
        scenario: 'The loader appends every version of an order to RAW, so `raw.orders` has **many rows per order**. Three models and two dashboards need one row per order. The table has **40 million rows** and grows by 200,000 a day.',
        opts: [
          { t: 'In every model that needs it', d: 'Each author adds a QUALIFY where they read orders.', lose: 'Five copies of the same rule will drift. One author will forget it and the dashboard will double count.' },
          { t: 'Once, in the staging model', d: 'stg_brewline__orders keeps the newest version. Everything else reads staging. If the view gets slow, make that one model incremental.' },
          { t: 'In the loader', d: 'Ask the ingestion team to upsert instead of append.', lose: 'The cleanest fix, but you do not own the loader. It also removes the history that snapshots and audits sometimes need.' }
        ],
        pick: 1,
        why: 'The rule belongs where the mess is cleaned. One staging model means one place to fix and one place to test. At 40 million rows, window functions over the full table on every query get costly, and that is the signal to make this one model **incremental** (Mission 7), not to spread the rule around.',
        when: 'If the ingestion team can upsert and nobody needs the history, fix it in the loader. It is the cheapest long-term answer, but it needs an owner on the other side.'
      }),

      B.qa({
        id: 'qa-staging', t: 1, tag: 'Modeling', secs: 60,
        q: 'What goes in a staging model, and what does not?',
        pts: ['One staging model per source table', 'Renaming, casting, light cleaning and deduplication', 'No joins and no aggregations: the grain stays the same', 'Reads the raw table through source(), never a typed table name', 'Built as a view, with unique and not_null tests on the key', 'Named stg_<source>__<table>'],
        short: 'A staging model is a clean copy of one source table. It reads the raw table through source(), renames columns to the project\'s standard, casts them to proper types, trims and lowers where needed, and keeps one row per key, for example the latest version of each order. I name it stg_<source>__<table> and build it as a view, so it costs nothing to store and always reflects the raw data.\n\nWhat I keep out: joins, aggregations and business rules. Those change the grain and hide logic where people do not expect it. They go in intermediate and mart models, which are tested and documented as part of the business logic.\n\nThe payoff is that everything downstream starts from tables with consistent names, types and one row per key. When the loader renames a column, I change one staging file and nothing else. I add unique and not_null tests on the key, so a bad load is caught at the front door.',
        fu: [
          ['Why one staging model per source table?', 'It keeps each model small, gives every raw table one clean face, and means a loader change touches one file.'],
          ['Would you ever join in staging?', 'Rarely. One accepted case is a tiny lookup that is part of the same source and always needed. Even then, I would rather join in an intermediate model so the staging model keeps the source\'s grain.']
        ],
        trap: 'Putting business logic in staging "because it is convenient". It hides rules in the layer people trust to be mechanical.',
        real: 'Describe a source that arrived messy and what you fixed in staging. Give a number: columns, duplicate rate, null rate.'
      }),

      B.qa({
        id: 'qa-fresh', t: 2, tag: 'Data quality', secs: 75,
        q: 'How would you find out that a source has stopped loading, before a stakeholder does?',
        pts: ['Define source freshness with a loaded_at_field and warn and error thresholds', 'Run dbt source freshness as its own scheduled job and alert on failure', 'Pick thresholds from the loader\'s real schedule', 'Add volume checks: row counts per day against a recent average', 'Decide whether a stale source should stop the transformation run', 'Make the alert go to the loader\'s owner'],
        short: 'I configure freshness on every source that matters. I name the column that holds the load time and set a warning and an error threshold based on how often the loader really runs, for example warn at 12 hours and error at 24 for a daily load. A separate scheduled job runs dbt source freshness every hour and alerts the owner of the loader when it errors.\n\nFreshness alone is not enough, because a loader can run on time and load nothing. So I add a volume check: a test that compares today\'s row count with the recent average and warns when it drops sharply.\n\nThen I decide what a stale source should do to the transformation run. For critical marts, I let the scheduler skip the build when freshness fails, so people see yesterday\'s numbers with a clear stale flag instead of wrong numbers. For the rest I let the build run and alert. The key is that the alert reaches the loader\'s owner, as well as the analytics channel.',
        fu: [
          ['What column should loaded_at_field be?', 'The time the loader wrote the row, not the business event time. An event time can be old by design, and a late loader would still look fresh if you use the wrong one.'],
          ['Can you skip models whose sources are stale?', 'Yes. dbt can select sources by freshness status in newer versions, so a job builds only what is downstream of fresh data. Check the current documentation for the exact selector.']
        ],
        trap: 'Relying on tests to catch a stopped loader. Tests check values, and old values are still valid values.',
        real: 'Describe a time a load stopped. How long before someone noticed, and what would have caught it sooner?'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Source Wrangler', color: '#E2E8F0',
        pts: [
          'A **source** declares a raw table. Models read it with `source()`, never with a typed name.',
          '**Freshness** compares the newest load time with the clock. Warn first, then error.',
          '**Staging** is one model per source table: rename, cast, keep the newest version. No joins, no sums.',
          'Name it `stg_<source>__<table>` and build it as a **view**.',
          'Put the rule for duplicate versions in **one** place, the staging model.'
        ],
        lines: [
          'Every other test passes on old data. Only freshness looks at the clock.',
          'Staging is where the mess stops. Nothing downstream should have to clean again.',
          'I never type a raw table name in a model. I use source().'
        ]
      })
    ]
  });
})();
