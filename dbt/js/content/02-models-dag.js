/* Mission 2: models, ref(), the DAG, and selecting what to run. */
(function () {
  var B = LAB.b, G = LAB.get;

  var CUST = G.file('models/staging/brewline/stg_brewline__customers.sql');
  var CUST_C = G.sql('compiled/day1/stg_brewline__customers');
  var INT_BAD = G.file('scenario/int_orders_hardcoded.sql');
  var INT_OK = G.file('models/intermediate/int_orders__with_items.sql');
  var UP = G.ls('up'), UP_BAD = G.ls('hardcoded_up');
  var MISSING = UP.filter(function (n) { return UP_BAD.indexOf(n) < 0; });
  var five = function (k, n) { var t = G.table(k); return { cols: t.cols, rows: t.rows.slice(0, n) }; };

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Models, ref() and the graph', short: 'Models', blurb: 'One file per model, ref() for order, selectors to choose', minutes: 26,
    focus: ['stg', 'int', 'mart'],
    goals: [
      'Write a **model**: one SELECT in one file, and read the SQL dbt compiles from it.',
      'Use **`ref()`** and **`source()`**, and say what each one gives dbt.',
      'Read the **graph** that those calls create, and say what runs first.',
      'Pick what to run with **selectors**: `+model`, `model+`, tags, folders and more.'
    ],
    say: 'Mission 2 is the core of dbt. A model is a file with a SELECT. A ref is an arrow between two models. Everything dbt does for you, the order, the parallel runs, the lineage, the selectors, follows from those two ideas.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, title: 'A model is a file',
        say: 'Four rules. They are the whole mental model for writing dbt. Press Next for each.',
        items: [
          ['One file, one model', 'The file name is the model name. `stg_brewline__customers.sql` creates a view called `stg_brewline__customers`. The folder decides the defaults, such as view or table, and the schema.', 'File name in, relation name out.'],
          ['A SELECT and nothing else', 'No `CREATE`, no `INSERT`, no trailing semicolon. dbt wraps your query in the right statement for the warehouse and for the materialization you chose.', 'You write the query. dbt writes the DDL.'],
          ['ref() and source() are arrows', 'Write `{{ ref(\'other_model\') }}` for another model and `{{ source(\'brewline\', \'orders\') }}` for a raw table. dbt replaces each call with the real table name and remembers the arrow.', 'Every call draws one line in the graph.'],
          ['Config sits close to the model', 'A model can set its own config at the top, with `{{ config(materialized=\'table\') }}`, or inherit it from `dbt_project.yml` or a YAML file. The closest setting wins.', 'Most models set nothing and inherit.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm2-sql', t: 1, title: 'A real model, and the SQL it becomes', file: 'models/staging/brewline/stg_brewline__customers.sql', code: CUST,
        compiled: { label: 'What the warehouse receives after compiling', file: 'target/compiled/brewline/.../stg_brewline__customers.sql', code: CUST_C },
        result: G.result('stg_customers'),
        steps: [
          { say: 'This is a real staging model from the Brewline project. It is a plain SELECT. Press Next to read it.', lines: null },
          { say: 'The select list cleans the raw customers: it lowers the email and upper-cases the country code, and it renames the country column. One staging model does this much and no more.', lines: [1, 6] },
          { say: 'The FROM clause does not name a table. It calls source(). That call tells dbt that this model reads the raw customers table, and it lets dbt check how fresh that table is.', lines: [G.at(CUST, /^from /), G.at(CUST, /^from /)] },
          { say: 'This is what the warehouse really receives. dbt replaced the source() call with the full name of the raw table. Nothing else changed.', compiled: true, lines: [G.at(CUST, /^from /), G.at(CUST, /^from /)], clines: [G.at(CUST_C, /^from /), G.at(CUST_C, /^from /)] },
          { say: 'Press Run to see the rows the view returns. The email for Omar is now lower case and the country codes are upper case. This table is real output from DuckDB.', run: true, lines: null }
        ],
        note: 'The wrapper is not in this file. dbt adds `create view ... as (` around the SELECT, because this folder is configured as views.'
      }),

      B.flow({
        id: 'm2-flow', t: 1, title: 'Every ref() draws an arrow', g: 'dag', legend: true,
        steps: [
          { say: 'This is the Brewline project as dbt sees it. Nobody drew it. dbt built it by reading every ref and source call. Press Next to follow the arrows.', cap: 'Short labels on the blocks. The files are `stg_brewline__orders.sql` and so on.' },
          { say: 'Each staging view calls source() on one raw table. That is one arrow from each source on the left.', on: ['a1', 'a2', 'a3', 'a4'], focus: ['s_products', 's_items', 's_orders', 's_customers', 'stg_products', 'stg_items', 'stg_orders', 'stg_customers'], cap: 'Four `source()` calls, four arrows.' },
          { say: 'int_orders calls ref() twice, once for the order lines and once for the orders. Two calls, two arrows.', on: ['b2', 'b3'], focus: ['stg_items', 'stg_orders', 'int_orders'], cap: 'It must wait for **both** staging views.' },
          { say: 'fct_orders reads int_orders. One more arrow.', on: ['c1'], focus: ['int_orders', 'fct_orders'], cap: 'A mart reads an intermediate model, never a raw table.' },
          { say: 'dim_customers makes three calls: customers, orders and the country seed. Three arrows into one block.', on: ['b4', 'b5', 'b6'], focus: ['stg_customers', 'stg_orders', 'seed_country', 'dim_customers'], cap: 'A model can read any number of parents.' },
          { say: 'dim_products is simple: one staging view in, one table out.', on: ['b1'], focus: ['stg_products', 'dim_products'], cap: 'Two versions of this model exist. Mission 9 explains why.' },
          { say: 'The snapshot reads the raw customers directly. It is not behind a staging view on purpose, because a snapshot should record the source as it is.', on: ['a5'], focus: ['s_customers', 'snap_customers'], cap: 'Mission 8 covers snapshots.' },
          { say: 'At the right edge, fct_daily_revenue reads fct_orders, and the finance dashboard is declared as an exposure that reads fct_daily_revenue.', on: ['c2', 'c3'], focus: ['fct_orders', 'fct_revenue', 'dash'], cap: 'The dashboard is not a dbt model. It is a **note** that something depends on this table.' },
          { say: 'Now you can predict the run order. A block starts when every parent has finished. The four staging views start together, because none of them has a parent that is a model.', focus: ['stg_products', 'stg_items', 'stg_orders', 'stg_customers'], cap: 'Independent branches run **in parallel**, up to the thread count.' }
        ]
      }),

      B.widget({ id: 'm2-sel', t: 1, kind: 'sel', title: 'Lab: choose what to run' }),

      B.cmp({
        id: 'm2-cmds', t: 1, title: 'The commands you type every day',
        say: 'Nine commands cover almost everything. Press Next to read them in groups.',
        cols: ['Command', 'What it does', 'Creates objects?'],
        hl: 1,
        rows: [
          ['`dbt compile`', 'Renders the SQL for the selected models and writes it to `target/compiled`.', 'No'],
          ['`dbt ls`', 'Lists the nodes that a selector matches. The safe way to test a selector.', 'No'],
          ['`dbt show`', 'Runs a model\'s query and prints a few rows, without saving them.', 'No'],
          ['`dbt run`', 'Builds the models: views, tables and incremental tables.', 'Yes'],
          ['`dbt seed`', 'Loads the CSV files in `seeds/` as tables.', 'Yes'],
          ['`dbt snapshot`', 'Records changed source rows in the snapshot tables.', 'Yes'],
          ['`dbt test`', 'Runs the data tests and the unit tests.', 'Only with `--store-failures`'],
          ['`dbt build`', 'Runs models, seeds, snapshots and tests together, in graph order, and skips what depends on a failure.', 'Yes'],
          ['`dbt source freshness`', 'Checks how recently each source was loaded.', 'No']
        ],
        steps: [
          { upto: 3, say: 'The first three create nothing. Use them freely while you write a model.' },
          { upto: 6, say: 'These create or change objects in your target schema. Check which target you are on before you press Enter.' },
          { upto: 9, say: 'test, build and freshness are the checks. build is the one a scheduler runs, because it does everything in one pass and stops bad data from reaching children.' }
        ],
        pick: 'While you develop, loop on `dbt build --select +my_model`. In the scheduler, run `dbt build`. Keep `dbt run` and `dbt test` for the moments when you want to run only the models or only the tests.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'Which command builds `fct_orders` and everything it needs, such as the staging views it reads?',
        opts: [
          { t: '`dbt run --select fct_orders`', fb: 'That builds only fct_orders. It fails if its parents do not exist yet.' },
          { t: '`dbt run --select +fct_orders`', fb: '' },
          { t: '`dbt run --select fct_orders+`', fb: 'A plus after the name adds the children, not the parents.' },
          { t: '`dbt run --exclude fct_orders`', fb: 'That builds everything except fct_orders.' }
        ],
        ok: 1, why: 'A plus sign on the left adds all the parents. The real `dbt ls` for this selector listed ' + UP.filter(function (n) { return n.indexOf('source:') !== 0; }).join(', ') + ', and the two sources they read.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'A model needs the output of another model. What do you write in its FROM clause?',
        opts: [
          { t: 'The full table name, for example `analytics_staging.stg_brewline__orders`', fb: 'That works once, then breaks in every other environment, and dbt cannot see the dependency.' },
          { t: '`{{ ref(\'stg_brewline__orders\') }}`', fb: '' },
          { t: '`{{ source(\'stg_brewline__orders\') }}`', fb: 'source() is for raw tables that a loader fills, not for dbt models.' },
          { t: '`{{ this }}`', fb: 'this is the table of the model you are writing, not another one.' }
        ],
        ok: 1, why: '`ref()` resolves to the right schema for the current target, and it tells dbt about the dependency. That gives you the correct run order, working lineage, and a model that behaves the same in dev, CI and production.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A teammate typed the staging table name instead of calling `ref()`. The model still builds in prod. Click the line that will cause trouble.',
        file: 'models/intermediate/int_orders__with_items.sql', lang: 'jinja', code: INT_BAD, bad: G.at(INT_BAD, /analytics_staging\.stg_brewline__order_items/),
        hint: 'Look at where the order lines come from.',
        why: 'A hard-coded name hides the dependency from dbt. I ran `dbt ls --select +fct_orders` on this version, and the list lost **' + MISSING.join('** and **') + '**. So dbt may build this model before its input exists, selectors and docs miss the link, and in dev the query reads **production** data because the schema is typed in.',
        fix: INT_OK,
        cheer: 'Hard-coded schema names are one of the first things to look for in a dbt code review.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the build of the Brewline orders chain in order.',
        items: [
          'The raw orders and order_items tables are read as sources',
          'stg_brewline__orders and stg_brewline__order_items build, in parallel',
          'int_orders__with_items builds, after both staging views',
          'fct_orders builds from the intermediate view',
          'fct_daily_revenue builds from fct_orders',
          'The finance dashboard exposure is marked as served'
        ],
        why: 'Each block waits for all of its parents. Two staging views can run side by side, but the intermediate view must wait for both. This order was never written down. It came from the ref calls.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, title: 'Decision: one big model or several small ones?',
        scenario: 'An analyst wrote **one model of 300 lines** with six CTEs. It cleans three raw tables, joins them, adds up order lines and computes customer lifetime value. It runs in 9 minutes. Two other teams copied parts of it into their own models.',
        opts: [
          { t: 'Leave it. It works and it is already in production', d: 'No risk this week.', lose: 'Nobody can test one CTE alone, a change anywhere reruns all 9 minutes, and the copies drift apart.' },
          { t: 'Split it by purpose', d: 'Staging models for the cleaning, an intermediate model for the join and the sums, and a mart for lifetime value. Each connected with ref().' },
          { t: 'Move the CTEs into macros', d: 'Reuse by copying the code at compile time.', lose: 'The same CTE is compiled again into every model, so nothing is built once and shared. Macros are for repeated expressions, not for shared tables.' }
        ],
        pick: 1,
        why: 'Splitting gives each piece a name, a test, a place in the graph and a single build. The cleaning is built once and shared. A change to lifetime value reruns only that model. Reviewers can read 30 lines at a time.',
        when: 'Do not split a model that is only 20 lines long, or one that nobody else will ever reuse. The goal is a graph that explains itself, not the most models.'
      }),

      B.challenge({
        id: 'm2-ch', t: 1,
        q: 'Write a model called `dim_customers_basic`. It returns **one row per customer** with the customer id, the full name, the **number of orders** and the **time of the first order**. Use the staging models with `ref()`, not the raw tables.',
        data: [
          { name: 'stg_brewline__customers', cols: ['customer_id', 'full_name'], rows: G.cols('stg_customers', ['customer_id', 'full_name']).rows },
          { name: 'stg_brewline__orders (first 5 rows)', cols: ['order_id', 'customer_id', 'ordered_at'], rows: G.cols('stg_orders', ['order_id', 'customer_id', 'ordered_at']).rows.slice(0, 5) }
        ],
        lang: 'jinja', file: 'models/marts/core/dim_customers_basic.sql',
        starter: 'select\n    -- your columns\nfrom {{ ref(\'stg_brewline__customers\') }} as c',
        hints: ['You need a join from customers to orders and a GROUP BY on the customer.', 'Use a left join, so a customer with no orders would still appear.', '`count(o.order_id)` counts matching orders only. `count(*)` would count a customer with no orders as 1.'],
        sol: G.file('scenario/ch_m2_customers.sql'),
        res: G.result('ch_m2_customers'),
        expl: ['Two `ref()` calls make two arrows, so dbt builds both staging views before this model.', 'The left join keeps customers that have no orders. Their count would be 0 and the first order time would be empty.', 'Grouping by `customer_id` and `full_name` gives one row per customer. The grain is the customer.'],
        cx: 'One pass over the orders, grouped by customer: linear in the number of orders.'
      }),

      B.qa({
        id: 'qa-ref', t: 1, tag: 'Models', secs: 60,
        q: 'What does `ref()` do, and why not just write the table name?',
        pts: ['It resolves to the correct table or view for the current target', 'It records the dependency, so dbt builds in the right order and in parallel', 'It powers lineage, docs and selectors such as +model', 'It makes the same code work in dev, CI and production', 'A hard-coded name breaks all four'],
        short: 'ref() is how one dbt model refers to another. At compile time dbt replaces it with the real relation name for the current target, so the same file reads from dev_alice in my dev environment, from a pull request schema in CI and from the production schema in the scheduled run.\n\nIt also tells dbt about the dependency. All the ref and source calls together form the graph, so dbt knows the build order, runs independent models in parallel, skips the children of a failed model, and draws lineage in the docs. Selectors such as +fct_orders work because of that graph.\n\nIf you type the table name instead, all of that disappears. The code works until the schema changes, it reads production data from a dev environment, and dbt may build a model before its input exists. I treat a hard-coded schema in a model as a review comment every time.',
        fu: [
          ['What is the difference between ref() and source()?', 'ref() points at another dbt model, seed or snapshot. source() points at a raw table that a loader fills. Declaring sources lets dbt check freshness and show the raw tables in the lineage.'],
          ['What happens if two models ref each other?', 'dbt refuses to run. It reports a circular dependency during graph building, before anything touches the warehouse.']
        ],
        trap: 'Describing ref() as "a way to avoid typing the schema". That is a side effect. The point is the dependency graph.',
        real: 'Say a real case where a hard-coded name caused trouble, or where lineage found an impact you would have missed.'
      }),

      B.qa({
        id: 'qa-order', t: 2, tag: 'Models', secs: 75,
        q: 'How does dbt decide what to run first, and what happens when one model fails?',
        pts: ['The graph comes from ref() and source() calls', 'A node runs when all its parents have finished', 'Independent branches run in parallel, up to the thread count', 'A failed model makes its children skip, while unrelated branches continue', 'dbt retry reruns only the failed and skipped nodes', 'Tests run between a model and its children in dbt build'],
        short: 'dbt reads every ref() and source() call and builds a directed graph with no cycles. It sorts the graph so that each node waits for all its parents. Nodes that do not depend on each other run in parallel, up to the thread count in the profile, usually four to sixteen.\n\nWhen a model fails, dbt marks everything that depends on it as skipped and carries on with the branches that do not. With dbt build, tests sit between a model and its children, so a failing test also stops the children, which keeps bad data from spreading. At the end I see how many nodes passed, failed and skipped.\n\nI fix the cause and run dbt retry, which reads the run results and reruns only the failed and skipped nodes, so I do not rebuild an hour of healthy models. For a wide graph I look at the longest chain, because threads cannot shorten it.',
        fu: [
          ['How many threads should you use?', 'Start with the number of parallel branches you have and what the warehouse tolerates. More threads help until the longest chain is the limit or the warehouse queues queries.'],
          ['Can you make a model run even if its parent failed?', 'Not by default. Model-level settings exist for upstream failures in newer versions, so check the current documentation, but most teams prefer to fix the parent.']
        ],
        trap: 'Saying dbt runs models "top to bottom in the folder". Folders and file names do not set the order. Only the graph does.',
        real: 'Describe a run where a failure skipped a branch, and how long recovery took.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Model Builder', color: '#BFDBFE',
        pts: [
          'A model is a **SELECT in a file**. The file name is the model name.',
          '`ref()` points at models, `source()` at raw tables. Each call draws an **arrow**.',
          'The arrows give dbt the **order**, the **parallelism**, the **lineage** and the **selectors**.',
          '`+model` adds parents, `model+` adds children, `@model` adds both for CI. `dbt ls` shows what a selector matches.',
          'A failed model **skips its children**. `dbt retry` reruns only the failed and skipped nodes.'
        ],
        lines: [
          'I never hard-code a schema in a model. I use ref() and source().',
          'Before a big run I check the selector with dbt ls.',
          'The graph decides the order. The folder does not.'
        ]
      })
    ]
  });
})();
