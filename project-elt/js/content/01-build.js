/* Mission 1: build it. The shop, the dlt load, the dbt models and tests. Every file is the file of projects/brewline-elt, and the day-1 run went through Airflow for real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, D2 = RUNS.day2, A1 = C('after_day1');
  var SH = G.file('ingestion/shop_api.py'), LD = G.file('ingestion/load_orders.py'), FCT = G.file('dbt/models/marts/fct_orders.sql');
  G.expect(D1.state === 'success' && D1.dbt.PASS === 22 && D1.dbt.TOTAL === 22 && /orders 200, order lines 401, stores 12/.test(D1.load) && A1.raw_orders === 200 && A1.fct_orders === 200, 'day 1 loads 200 orders and 401 lines, and all 22 dbt checks pass');
  G.expect(D2.state === 'success' && /orders 60, order lines 120/.test(D2.load), 'day 2 writes 60 order rows');

  var ORDERS_BLOCK = G.lines(LD, G.at(LD, /^    @dlt\.resource\(name='orders'/), G.at(LD, /^    @dlt\.resource\(name='orders'/) + 3);

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Build it: the load and the models', short: 'Build', blurb: 'The shop, the dlt load, and the dbt models and tests', minutes: 22,
    focus: ['src', 'stg'],
    goals: [
      'Read the **shop**, and the traps that day 3 holds.',
      'Explain the **load**: a cursor, a lookback and a merge on the id.',
      'Read the **models** and say what grain each one has.',
      'Say what each **test** guards, and what a failing one does.'
    ],
    say: 'A pipeline is a few small files that agree with each other. I will show the shop that it reads, the load that copies it, and the models that clean it, with the runs that I made through Airflow. Read each file as you would in a review.',
    scenes: [
      B.code({
        id: 'm1-shop', t: 1, src: 'rec', title: 'shop_api.py: the pretend source, and its traps', file: 'shop_api.py', lang: 'python', code: SH,
        steps: [
          { say: 'The source is a Python function with fixed rules, so that every run gives the same numbers. Press Next.', lines: null },
          { say: 'The **prices** are in cents. The total of an order is the **sum of quantity times price** over its lines: a rule that a test will check.', lines: G.span(SH, /^PRICES = /, /^DAY1 = /) },
          { say: 'An order has a store, a status, a total, an `updated_at` and a list of **lines**. The changes of a day are **spread over the day**, and not all at one minute.', lines: G.span(SH, /^def stamp/, /return \(DAY1/) },
          { say: '**Day 2**: 20 orders are shipped, 30 are new, and one is refunded. Each shipped order gets a new `updated_at`, so that a cursor can see it.', lines: G.span(SH, /if day >= 2:/, /rows\[21\]\.update/) },
          { say: '**Day 3**: 25 new orders, and one of them has a **product with no price** (`CAPSULE-10`). That is the first trap. Five more orders are shipped.', lines: G.span(SH, /if day >= 3:/, /updated_at=stamp\(3, i\)\)/) },
          { say: 'The second trap: on day 3 **store 4 is renamed**. A report that joins the name now would rewrite the history of the store, unless something keeps the old name.', lines: G.span(SH, /^def stores_on/, /return \[\{'id': s/) },
          { say: 'The API answers like `GET /orders?updated_since=...`: the orders changed at or after a time, in pages of 100.', lines: G.span(SH, /^def get_orders/, /yield rows\[k:k \+ page_size\]/) }
        ]
      }),

      B.code({
        id: 'm1-load', t: 1, src: 'rec', title: 'load_orders.py: an incremental, repeatable load', file: 'load_orders.py', lang: 'python', code: LD,
        steps: [
          { say: 'One file that loads one day. Press Next.', lines: null },
          { say: 'A dlt **pipeline** has a destination (a DuckDB file), a dataset name (`raw`) and a folder for its own state.', lines: G.span(LD, /^def build/, /pipelines_dir/) },
          { say: 'The **orders** resource: `merge` on the `id`, a **cursor** on `updated_at`, and a **lookback** of 3,600 seconds. It asks the shop only for what changed, a little further back than the cursor, and the merge puts each row in place.', lines: G.span(LD, /@dlt\.resource\(name='orders'/, /yield page/) },
          { say: 'The **stores** are replaced in every run: twelve rows, and a rename is simply a new value. The **history** of a rename is kept later, by a dbt snapshot.', lines: G.span(LD, /@dlt\.resource\(name='stores'/, /yield page/) },
          { say: 'The program prints one line that says what the run wrote. The orchestrator and this walkthrough read it.', lines: G.span(LD, /pipeline\.run\(resources\)/, /print\('loaded day/) }
        ]
      }),

      B.term({
        id: 'm1-day1', t: 1, src: 'rec', title: 'Day 1 through Airflow',
        say: 'This is the real first run of the DAG for 1 March, in the order of its four steps.',
        lines: function () { return G.plain(X('run.day1')); },
        after: 'The load wrote **' + n(A1.raw_orders) + '** orders and **401** lines. dbt ran **' + D1.dbt.TOTAL + '** checks (the seed, the models, the snapshot and the tests) and **' + D1.dbt.PASS + '** passed. The gate compared the warehouse with the shop: **' + n(A1.raw_orders) + '** orders in the shop, **' + n(A1.raw_orders) + '** in `raw`, **' + n(A1.fct_orders) + '** in the marts. Then the marts were published.',
        afterKind: 'tip',
        doneSay: 'The first day is clean.'
      }),

      B.code({
        id: 'm1-model', t: 1, src: 'rec', title: 'fct_orders.sql: one row for each order', file: 'fct_orders.sql', lang: 'sql', code: FCT,
        steps: [
          { say: 'The central model, in a few lines. Press Next.', lines: null },
          { say: 'First the **lines** are added up for each order: quantity times the price from the seed. This is where a line with no price would drop out.', lines: G.span(FCT, /^with lines as/, /^\)$/) },
          { say: 'Then the orders are joined to that result and to the stores. The result has **one row for each order**: that is the **grain**, and the tests check it.', lines: G.span(FCT, /^select$/, /left join \{\{ ref\('stg_stores'\) \}\}/) }
        ],
        note: 'A model that joins the orders directly to their lines would have one row for each line. The next bug hunt runs that mistake.'
      }),

      B.cmp({
        id: 'm1-tests', t: 1, src: 'rec', title: 'The 14 tests, and what each one guards',
        say: 'dbt tests are queries that must return no rows. Press Next to see what the project checks.',
        cols: ['Test', 'It guards against', 'What happened in the runs'],
        hl: 1,
        rows: [
          ['`unique` and `not_null` on every key', 'Duplicate orders from a bad merge or a join that multiplies rows', 'Passed. The bug hunt below makes it fail'],
          ['`accepted_values` on the status', 'A new status that a report quietly ignores', 'Passed'],
          ['`relationships`: order to store', 'An order that points at a store that is not there', 'Passed'],
          ['`relationships`: line to a priced product', 'A product that was launched without a price', '**Failed on day 3**: one line'],
          ['A singular test: the total equals the lines', 'A wrong price, a wrong quantity, or a line that dropped out of the join', 'Passed. It also fails in the fan-out hunt']
        ],
        steps: [
          { upto: 3, say: 'The first three are **structural** tests. They are cheap, and they catch most of what goes wrong in a merge or a join.' },
          { upto: 5, say: 'The last two are about the **business**: a price must exist, and the money must add up. The first one stopped day 3, and the second is the check that the totals of the shop and of the lines agree.' }
        ]
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'After a night with a retry, the raw table has more orders than the shop has. The resource uses a cursor. Click the line that adds rows instead of putting them in place.',
        file: 'load_orders.py', lang: 'python',
        code: ORDERS_BLOCK.replace("write_disposition='merge', primary_key='id'", "write_disposition='append'"),
        bad: [1],
        hint: 'What does append do with an order that is already in the table?',
        why: 'The cursor has a **lookback**, so every run reads the last hour again, and **append** adds those rows again. In my run the second load of day 1 wrote **9** rows, and the table held **209** rows for **200** orders. With a **merge** on the `id` the same run changes nothing.',
        fix: ORDERS_BLOCK,
        cheer: 'A lookback needs a merge.'
      }),

      B.bug({
        id: 'm1-bug2', t: 1, q: 'The model of the orders joins them straight to their lines. dbt fails two tests and the marts are not built. Click the line that multiplies the rows.',
        file: 'fct_orders.sql', lang: 'sql',
        code: 'select\n    o.order_id,\n    o.store_id,\n    s.region,\n    o.status,\n    o.updated_date,\n    o.total_cents,\n    l.qty * p.price_cents as lines_total_cents,\n    1                     as line_count\nfrom {{ ref(\'stg_orders\') }} o\njoin {{ ref(\'stg_order_lines\') }} l using (order_id)\njoin {{ ref(\'product_prices\') }} p on p.sku = l.sku\nleft join {{ ref(\'stg_stores\') }} s using (store_id)\n',
        bad: [11],
        hint: 'How many rows does an order with three lines give in this join?',
        why: 'A join to the lines gives **one row for each line**: **401** rows for **200** orders. The test `unique_fct_orders_order_id` found **134** ids that appeared more than once, and the singular test found **335** rows whose total differed from the line. dbt stopped: **2** errors, and **2** things skipped. The fix is to add up the lines **first**, and join the result.',
        fix: FCT + '\n',
        cheer: 'Add up first, then join.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'What is the grain of `fct_orders`?',
        opts: [
          { t: 'One row for each order', fb: '' },
          { t: 'One row for each line of an order', fb: 'That is `stg_order_lines`.' },
          { t: 'One row for each store and day', fb: 'That is `orders_daily`.' },
          { t: 'One row for each run of the pipeline', fb: 'A run is not a business object.' }
        ],
        ok: 0, why: 'The model adds up the lines first, so each order appears once: **' + n(A1.fct_orders) + '** rows for **' + n(A1.raw_orders) + '** orders after day 1. The test `unique` on `order_id` guards it.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'The load reads the last hour again on every run. Why is that safe?',
        opts: [
          { t: 'The merge on the id puts a row in place, so a repeat changes nothing', fb: '' },
          { t: 'The shop sends each order only once', fb: 'It sends any order that changed at or after the time.' },
          { t: 'dbt removes the duplicates later', fb: 'dbt only fails when there are duplicates.' },
          { t: 'It is not safe, and the team accepts it', fb: 'The merge makes it safe.' }
        ],
        ok: 0, why: 'A **lookback** catches changes that arrive late, and a **merge** makes the repeat harmless: in the backfill the same day wrote **0** rows and the table stayed the same.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Where did the lines of each order go in the raw schema?',
        opts: [
          { t: 'Into a child table `orders__lines`, linked to the order', fb: '' },
          { t: 'Into a text column of `orders`', fb: 'dlt makes a table of its own for a list.' },
          { t: 'They were dropped', fb: 'The recording shows 401 lines.' },
          { t: 'Into the stores table', fb: 'The stores are another resource.' }
        ],
        ok: 0, why: 'The run line says **order lines 401** for **200** orders. The staging model `stg_order_lines` joins the child table to its parent through `_dlt_parent_id`.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2,
        q: 'Which test would have caught the fan-out of the second bug hunt, even with no singular test?',
        opts: [
          { t: '`unique` on `order_id` of `fct_orders`', fb: '' },
          { t: '`accepted_values` on the status', fb: 'The statuses were fine.' },
          { t: '`relationships` to the stores', fb: 'The stores were fine.' },
          { t: '`not_null` on the total', fb: 'The totals were not null.' }
        ],
        ok: 0, why: 'A join that multiplies rows makes the key appear more than once. In the hunt **134** ids were duplicated, and the unique test reported them.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision (ADR 1): how to load and transform',
        scenario: 'Brewline needs its shop in a warehouse every day, with tests, for a team of three. The data is small today, and the shop may grow. Nobody wants to run a cluster.',
        opts: [
          { t: 'dlt for the load, dbt for the models, in a warehouse', d: 'Each tool does one job, the load is code in Git, and the models are SQL that analysts can read and test.', lose: 'Two tools to learn, and the contract between them (the raw tables) has to be kept.' },
          { t: 'One Spark job that reads, cleans and writes', d: 'One program, and it scales a long way.', lose: 'A cluster or a service to run, and the business rules are hidden in code instead of tested SQL.' },
          { t: 'Stored procedures in the warehouse, fed by a CSV export', d: 'No new tools.', lose: 'No tests, no lineage, and a load that cannot be repeated safely.' }
        ],
        pick: 0,
        why: 'The raw tables are the **contract** between the two tools, and they were recorded: `orders`, `orders__lines` and `stores`. The load can be repeated, and the models can be tested. This is a design judgement from documentation, and no other option was built.',
        when: 'If the volume is huge, or the transformations need code that SQL cannot express, move the heavy step to Spark and keep the tests and the gate.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Builder', color: '#CBD5E1',
        pts: [
          'The shop is a stand-in with fixed rules, and day 3 holds two **traps**: a product with no price, and a renamed store.',
          'The load is **incremental** (a cursor), **late-proof** (a lookback of one hour) and **repeatable** (a merge on the id): the second load of a day wrote **0** rows, and the bug hunt with append left **209** rows for **200** orders.',
          'The models have a **grain**: `fct_orders` has one row for each order. A join to the lines made **401** rows and two tests failed.',
          'The 14 tests are structural (keys, values, relationships) and about the business (a price exists, the money adds up).',
          'Day 1 went through Airflow: **' + n(A1.raw_orders) + '** orders, **' + D1.dbt.PASS + '** of **' + D1.dbt.TOTAL + '** checks passed.'
        ],
        lines: [
          'I know the grain of every model.',
          'I make a repeat harmless.',
          'I test the business as well as the shape.'
        ]
      })
    ]
  });
})();
