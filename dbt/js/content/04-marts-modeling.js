/* Mission 4: intermediate models, marts, grain, keys. */
(function () {
  var B = LAB.b, G = LAB.get;

  var INT = G.file('models/intermediate/int_orders__with_items.sql');
  var DIM = G.file('models/marts/core/dim_customers.sql');
  var DIM_C = G.sql('compiled/day1/dim_customers');
  var REV = G.file('models/marts/finance/fct_daily_revenue.sql');
  var NAIVE = [
    'select',
    '    cast(o.ordered_at as date) as order_date,',
    '    sum(o.order_total_usd) as revenue_usd',
    "from {{ ref('stg_brewline__orders') }} as o",
    "join {{ ref('stg_brewline__order_items') }} as i on i.order_id = o.order_id",
    "where o.order_status <> 'CANCELLED'",
    'group by 1'
  ].join('\n');
  var NAIVE_T = G.table('fanout_naive').rows[0], RIGHT_T = G.table('fanout_right').rows[0];

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Intermediate models and marts', short: 'Marts', blurb: 'Grain, joins, keys, and the models people query', minutes: 30,
    focus: ['int', 'mart'],
    goals: [
      'State the **grain** of a model and protect it when you join.',
      'Build an **intermediate** model that adds up order lines, and a **mart** that people query.',
      'Tell a **fact** from a **dimension**, and create a **surrogate key**.',
      'Spot the **join fan-out** that doubles revenue, and fix it.'
    ],
    say: 'Mission 4 is where the business logic lives. The most useful question in modeling is "one row per what?" Answer it first, write it down, and most of the bugs you would have shipped disappear.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, title: 'Grain, facts and dimensions',
        say: 'Four ideas. Press Next for each.',
        items: [
          ['Grain: one row per what?', 'Every model has a **grain**: the thing that one row stands for. `fct_orders` has one row per **order**. `fct_daily_revenue` has one row per **day**. State it in the description, test it with `unique`, and never change it by accident.', 'If you cannot finish the sentence "one row per ...", the model is not ready.'],
          ['Facts record events', 'A **fact** table has one row per event or transaction: an order, a payment, a click. It holds measures you add up, such as the total, and keys that point at dimensions.', 'fct_orders, fct_daily_revenue.'],
          ['Dimensions describe things', 'A **dimension** has one row per thing: a customer, a product. It holds the descriptive columns people filter and group by.', 'dim_customers, dim_products.'],
          ['Intermediate models are building blocks', 'When two marts need the same join or the same sum, build it once in an **intermediate** model. Nobody queries it directly. It is the place for reshaping and for adding up lines before a join.', 'int_orders__with_items adds up order lines once.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm4-int', t: 1, title: 'Intermediate: add up the lines first', file: 'models/intermediate/int_orders__with_items.sql', code: INT,
        result: G.result('int_orders'),
        steps: [
          { say: 'An order has several lines. The orders table has one row per order and order_items has one row per line. This model combines them without changing the grain: the result is still one row per order.', lines: null },
          { say: 'First the lines are collapsed. For each order the CTE counts the lines, adds up the units and adds up the line totals. The grain of this CTE is already one row per order.', lines: G.span(INT, /^with items as/, /^\)$/) },
          { say: 'Then the orders are joined to those sums. A left join keeps an order that has no lines at all, such as O-5010, and coalesce turns the missing numbers into zeros.', lines: G.span(INT, /^select$/, /^left join items/) },
          { say: 'Run it. Ten orders in, ten rows out. Look at O-5009: the order total is 30.00 but the lines add up to 29.00. And O-5010 has no lines. Both are data problems that a test will catch in Mission 6.', run: true, lines: null }
        ],
        note: 'Because the lines were added up **before** the join, each order stays one row. Join first and sum later, and the order total repeats once per line.'
      }),

      B.widget({ id: 'm4-fanout', t: 1, kind: 'fanout', title: 'Lab: the join that doubles your revenue' }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A teammate wrote the daily revenue model like this. The finance team says March 14 looks too high. Click a line that causes it.',
        file: 'models/marts/finance/fct_daily_revenue.sql', lang: 'jinja', code: NAIVE, bad: [G.at(NAIVE, /sum\(o\.order_total_usd\)/), G.at(NAIVE, /^join/)],
        hint: 'How many rows does an order have after the join?',
        why: 'Joining orders to order lines gives **one row per line**, so an order with two lines appears twice, and `sum(order_total_usd)` adds its total twice. On March 14 this query returns **' + NAIVE_T[1] + '** while the true revenue is **' + RIGHT_T[1] + '**. The lines are not needed for an order-level total, so drop the join, or add up the lines first.',
        fix: REV,
        cheer: 'Whenever a join and a sum meet, ask what the grain is after the join.'
      }),

      B.sql({
        id: 'm4-dim', t: 1, title: 'A dimension with a surrogate key', file: 'models/marts/core/dim_customers.sql', code: DIM,
        compiled: { label: 'What the warehouse receives after compiling', file: 'target/compiled/brewline/.../dim_customers.sql', code: DIM_C },
        result: G.result('dim_customers'),
        steps: [
          { say: 'dim_customers has one row per customer. It reads two staging models and a seed. Press Next to read it.', lines: null },
          { say: 'Three CTEs prepare the inputs: the customers, the country names from the seed, and the order counts per customer. Each CTE has one clear grain, one row per customer or per country.', lines: G.span(DIM, /^with customers as/, /^\)$/) },
          { say: 'The order counts exclude cancelled orders. That is a business rule, so it sits in a mart, where people expect to find rules.', lines: G.span(DIM, /^orders as/, /^\)$/) },
          { say: 'The first column is a surrogate key made by a macro from the dbt_utils package. It hashes the business key into a stable text key.', lines: G.span(DIM, /generate_surrogate_key/) },
          { say: 'This is what the macro compiled to: an md5 hash of the customer id, with a safe marker for NULL. The same id gives the same key in every environment, with no sequence to keep in sync.', compiled: true, lines: G.span(DIM, /generate_surrogate_key/), clines: G.span(DIM_C, /md5\(/) },
          { say: 'The joins are left joins from customers, so every customer stays one row even if a country is unknown or no orders exist.', lines: G.span(DIM, /^from customers as c/, /^left join orders/) },
          { say: 'Run it. Four customers. C-12 has one order that counts, because the other one was cancelled.', run: true, lines: null }
        ],
        note: 'A surrogate key is useful when the business key is long, composite or can change. For a single clean key such as `customer_id`, many teams use the business key directly. Choose one and be consistent.'
      }),

      B.rows({
        id: 'm4-rows', t: 1, title: 'Follow order O-5001 into the marts',
        steps: [
          {
            say: 'In staging O-5001 is one clean row, the shipped version.',
            tabs: [{ layer: 'STAGING', name: 'stg_brewline__orders', c: 'stg', cols: G.table('stg_orders').cols, rows: G.where('stg_orders', 'order_id', ['O-5001']).rows, trk: 0 }]
          },
          {
            say: 'The intermediate model adds what the order lines say: two lines, three units, and 67.00 in total.',
            tabs: [{ layer: 'INTERMEDIATE', name: 'int_orders__with_items', c: 'int', cols: G.table('int_orders').cols, rows: G.where('int_orders', 'order_id', ['O-5001']).rows, trk: 0, chg: [[0, 6], [0, 7], [0, 8]] }],
            notes: ['Order total 67.00 and line total 67.00 agree, so this order is reconciled.']
          },
          {
            say: 'fct_orders keeps the order and adds a flag, is_reconciled, that says whether the totals agree. For O-5001 it is true.',
            tabs: [{ layer: 'MART', name: 'fct_orders', c: 'mart', cols: G.table('fct_orders_day1').cols, rows: G.where('fct_orders_day1', 'order_id', ['O-5001']).rows, trk: 0, chg: [[0, 6]] }]
          },
          {
            say: 'fct_daily_revenue rolls the day up. March 14 has three orders: 67.00 plus 12.50 plus 28.00 is 107.50. Its grain is one row per day.',
            tabs: [{ layer: 'MART', name: 'fct_daily_revenue', c: 'mart', cols: G.table('fct_daily_revenue_day1').cols, rows: G.where('fct_daily_revenue_day1', 'order_date', ['2026-03-14']).rows, trk: 0, chg: [[0, 1], [0, 2]] }],
            notes: ['The finance dashboard reads this table. It never sees the raw versions.']
          }
        ]
      }),

      B.sql({
        id: 'm4-rev', t: 1, title: 'A mart that people query', file: 'models/marts/finance/fct_daily_revenue.sql', code: REV,
        result: G.result('fct_daily_revenue_day1'),
        steps: [
          { say: 'The mart for finance is short on purpose. Press Next to read it.', lines: null },
          { say: 'The grain is set by the GROUP BY. One row per calendar day. The cast turns a timestamp into a date.', lines: G.span(REV, /^select$/, /^group by/) },
          { say: 'The business rule is one visible line: cancelled orders never count as revenue. When finance changes this rule, there is exactly one place to edit.', lines: G.span(REV, /^where order_status/) },
          { say: 'Run it. Four days. The cancelled order O-5005 on March 15 is not in the sum, so that day shows 55.00 and one order.', run: true, lines: null }
        ],
        note: 'It reads `fct_orders`, not a staging model. Marts read marts and intermediate models, so a rule such as "latest version only" is applied once.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'What is the grain of `fct_orders`?',
        opts: [
          { t: 'One row per order line', fb: 'Lines are in order_items. fct_orders adds them up per order.' },
          { t: 'One row per order, its latest version', fb: '' },
          { t: 'One row per customer per day', fb: 'That would be a periodic summary table.' },
          { t: 'One row per version of each order, as in RAW', fb: 'Staging already removed the older versions.' }
        ],
        ok: 1, why: 'One row per order, with its current status. You protect that grain with a `unique` test on `order_id`, which the project has, and by adding up the order lines **before** joining.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'Where should the rule "cancelled orders never count as revenue" live?',
        opts: [
          { t: 'In every dashboard, in the BI tool', fb: 'Each dashboard would carry its own copy and they would drift apart.' },
          { t: 'In the mart that finance queries, in one visible WHERE clause', fb: '' },
          { t: 'In the staging model, so cancelled orders never leave RAW', fb: 'Staging should not drop rows. Other teams may need cancelled orders.' },
          { t: 'In the loader', fb: 'The loader has no idea what finance counts as revenue.' }
        ],
        ok: 1, why: 'Business rules go in marts, where they are visible, tested and owned. Staging stays mechanical, and the BI tool stays thin.'
      }),

      B.challenge({
        id: 'm4-ch', t: 1,
        q: 'Write a model with **revenue per day per product category**, **without cancelled orders**. Use the **order lines**, because the amount depends on the product. Return `order_date`, `category` and `revenue_usd`.',
        data: [
          { name: 'stg_brewline__order_items (first 6 rows)', cols: ['order_id', 'product_id', 'line_total_usd'], rows: G.cols('stg_order_items', ['order_id', 'product_id', 'line_total_usd']).rows.slice(0, 6) },
          { name: 'stg_brewline__products', cols: ['product_id', 'category'], rows: G.cols('stg_products', ['product_id', 'category']).rows }
        ],
        lang: 'jinja', file: 'models/marts/finance/fct_daily_revenue_by_category.sql',
        starter: 'select\n    -- order_date, category, revenue_usd\nfrom {{ ref(\'stg_brewline__order_items\') }} as i',
        hints: ['Three tables are involved: lines, orders (for the date and status) and products (for the category).', 'Sum the **line** totals, not the order totals, so a join cannot repeat an amount.', 'Filter cancelled orders in the WHERE clause and group by the date and the category.'],
        sol: G.file('scenario/ch_m4_category.sql'),
        res: G.result('ch_m4_category'),
        expl: ['The grain is one row per day and category, and the amount comes from the lines, so each line is counted once.', 'The join to orders brings the date and the status. The join to products brings the category.', 'The cancelled order O-5005, a 29.00 scale on 15 March, is filtered out, so that day shows only the kettle. Compare with fct_daily_revenue: 14, 15 and 16 March agree. 17 March shows 68.00 here and 89.00 there, because the lines of O-5009 add up to 29.00, not its 30.00 total, and O-5010 has no lines. It is the reconciliation problem again.'],
        cx: 'Two joins and one aggregation, linear in the number of lines.'
      }),

      B.cmp({
        id: 'm4-keys', t: 2, title: 'Keys: natural, surrogate hash or sequence',
        say: 'Interviewers like to ask how you build keys. Press Next to compare the three options.',
        cols: ['', 'Natural key', 'Hash surrogate key', 'Sequence'],
        hl: 2,
        rows: [
          ['What it is', 'The business id, such as `customer_id`', 'A hash of the business key, made by `generate_surrogate_key`', 'An incrementing number from the warehouse'],
          ['Stable across environments', 'Yes', 'Yes: same input, same hash', 'No: dev and prod number rows differently'],
          ['Works for several columns', 'Awkward', 'Yes: hash the columns together', 'Yes'],
          ['Breaks when', 'The business changes the id', 'You change the list of columns or their order', 'You rebuild the table and the numbers move'],
          ['Typical use in dbt', 'Single clean ids', 'Composite keys, joins across sources, tests of uniqueness', 'Rare, because a rebuild reshuffles it']
        ],
        steps: [
          { upto: 2, say: 'Stability first. A key that differs between dev and prod makes every comparison between environments harder.' },
          { upto: 4, say: 'Then what breaks each one. A hash is only as stable as its inputs, so treat the column list as part of the contract.' },
          { upto: 5, say: 'In dbt the hash is the usual choice for composite keys, because it is deterministic and needs no state.' }
        ],
        pick: 'Use the **natural key** when it is a single, clean, stable id. Use a **hash surrogate key** for composite keys and cross-source joins. Avoid **sequences** in dbt. Whatever you pick, test it with `unique` and `not_null`.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, title: 'Decision: one wide table or facts and dimensions?',
        scenario: 'The BI team wants "one table with everything": orders, customers, products and the country, **60 columns**. Five dashboards will use it. Today analysts join `fct_orders`, `dim_customers` and `dim_products` themselves, and they get the joins wrong about once a month.',
        opts: [
          { t: 'Build one wide table and stop maintaining the facts and dimensions', d: 'Simplest for the dashboards.', lose: 'Every attribute change rebuilds a huge table, the grain gets muddy, and the next team that needs a different grain starts from scratch.' },
          { t: 'Keep facts and dimensions as the core, and add a thin wide mart on top for the dashboards', d: 'The wide model joins the core models with ref() and changes nothing below it.' },
          { t: 'Leave it. Teach the analysts to join correctly', d: 'No new work.', lose: 'It fails about once a month. Training does not fix a design that makes the mistake easy.' }
        ],
        pick: 1,
        why: 'The core stays right, small and reusable, and the wide mart is a **view or table built from it**. The dashboards get their one table, and the joins are written once and tested. If the wide table is wrong, you fix one model.',
        when: 'For a tiny project with one dashboard, skip the wide layer. For a very large fact table, keep the wide mart a view so the core is not copied.'
      }),

      B.qa({
        id: 'qa-grain', t: 1, tag: 'Modeling', secs: 60,
        q: 'How do you decide the grain of a model, and how do you protect it?',
        pts: ['Finish the sentence "one row per ..." before writing SQL', 'Write the grain in the model description', 'Test it: unique and not_null on the key', 'Add up lines before joining, so a join cannot repeat a measure', 'Check row counts before and after a join in review', 'Do not change the grain without telling the people who query it'],
        short: 'I start by finishing the sentence "one row per ..." for the model. For an orders fact it is one row per order, for daily revenue it is one row per day. I write it into the model description so a reader sees it.\n\nThen I protect it. I put a unique and a not_null test on the key, so a duplicate fails the build. The biggest threat is a join that changes the grain. For example, joining orders to order lines gives one row per line, and a sum of the order total then counts each order once per line. So I add up the lines first, in an intermediate model, and join the result back, which keeps one row per order. In review I compare row counts before and after each join.\n\nIf the grain must change, I treat it as a breaking change: a new model or a new version, announced to the people who query it.',
        fu: [
          ['What is join fan-out?', 'A join that produces more rows than the left side because the right side has several matches per key. Any sum of a left-side measure after the join is then too high.'],
          ['How would a test catch fan-out?', 'A unique test on the key of the result, or a reconciliation test that compares the sum of the measure before and after the join.']
        ],
        trap: 'Naming the grain only after the model is built. By then, the dashboards depend on the accidental grain.',
        real: 'Give a case where a join changed a number. How was it found, and how large was the error?'
      }),

      B.qa({
        id: 'qa-model-orders', t: 2, tag: 'Modeling', secs: 90,
        q: 'Walk me through how you would model orders for analytics in dbt.',
        pts: ['Source declared and staged: one staging model per raw table, newest version per order', 'Intermediate model adds up the lines per order', 'fct_orders at the grain of one row per order, dimensions for customers and products', 'Business rules such as cancelled orders in the mart, in one place', 'Tests: unique and not_null on keys, relationships, accepted values, reconciliation', 'Materialization chosen from size: table or incremental for the fact'],
        short: 'I begin with the sources and the questions. I declare the raw orders, order lines, customers and products as sources and add freshness. Each gets one staging model: renamed, cast, with one row per key. For orders that means keeping the newest version, because the loader appends every change.\n\nNext an intermediate model collapses the order lines to one row per order, so a join cannot repeat the order total. The fact table, fct_orders, then has one row per order with the status, the total, the line total and a flag for whether they agree. Customers and products become dimensions with a hash surrogate key. A daily revenue mart sits on top of the fact and applies the business rule that cancelled orders do not count.\n\nI test every key with unique and not_null, add relationships to the dimensions, accepted values on status and a reconciliation test between order and line totals. The fact is a table, and an incremental model once it gets big. I document the grain of each model.',
        fu: [
          ['Where does the reconciliation test go?', 'In tests/ as a singular test, set to warn at first. It compares the order total with the sum of its lines and returns the orders that disagree.'],
          ['What would make you add an intermediate layer?', 'Two marts that need the same join or the same aggregation, or a model that grows past what a reviewer can read in one sitting.']
        ],
        trap: 'Describing tables and columns only. The answer should name the grain, where the rules live, and how you would notice a mistake.',
        real: 'Replace the example with your own fact table. Name its grain, its size and its refresh time.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Mart Designer', color: '#BBF7D0',
        pts: [
          'Finish the sentence **"one row per ..."** for every model. That is the grain.',
          '**Facts** are events with measures. **Dimensions** are things with attributes.',
          '**Intermediate** models hold shared building blocks. Marts hold **business rules**.',
          'Add up the lines **before** joining, or a join repeats the order total.',
          'A **hash surrogate key** from `generate_surrogate_key` is stable across environments.'
        ],
        lines: [
          'I write the grain in the description and protect it with a unique test.',
          'Business rules live in marts, in one visible place.',
          'Before I trust a number after a join, I compare the row counts.'
        ]
      })
    ]
  });
})();
