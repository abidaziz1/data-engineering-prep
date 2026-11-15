/* Mission 2: grain, keys, relationships, and the join that multiplies rows. Every number is a DuckDB result on the Brewline tables. */
(function () {
  var B = LAB.b, G = LAB.get;
  var T = G.table('model.tables'), F = G.counts('model.fanout'), FT = G.table('model.fanout'), M = G.counts('model.m2m'), MT = G.table('model.m2m'), REL = G.table('model.relationships');
  var RIGHT = G.file('sql/fanout_right.sql'), WRONG = G.file('sql/fanout_wrong.sql'), FIXED = G.file('sql/fanout_fixed.sql'), M2M = G.file('sql/m2m.sql');
  var n = G.n;
  G.expect(F.shipping_wrong > F.shipping_right * 2 && F.shipping_fixed === F.shipping_right, 'the join to the lines doubles the shipping total and the pre-aggregated join does not');
  G.expect(M.revenue_summed_over_codes > M.revenue_of_orders_with_a_code, 'revenue summed over promotion codes counts some orders twice');
  G.expect(REL.rows.every(function (r) { return r[3] === 0 && r[4] === 0; }), 'every relationship has a unique key on the one side and no orphan rows');
  var BUG = 'SELECT s.region,\n       sum(l.line_amount)  AS revenue,\n       sum(o.shipping_fee) AS shipping\nFROM fact_orders o\nJOIN fact_order_lines l ON l.order_id = o.order_id\nJOIN dim_store s        ON s.store_id = o.store_id\nGROUP BY s.region;';

  LAB.addChapter({
    id: 'm2', n: 2, title: 'The model: grain, keys and joins that multiply', short: 'Model', blurb: 'A star schema, the grain of each table, and why a join can double a number', minutes: 20,
    focus: ['stg', 'mart'],
    goals: [
      'Say the **grain** of a table in one sentence, and why a BI model needs it.',
      'Explain a **star schema** and the direction of its relationships.',
      'Spot a **fan-out**: a join that repeats rows and inflates a sum.',
      'Handle a **many-to-many** relationship without counting twice.'
    ],
    say: 'Most wrong numbers on a dashboard are not calculation errors. They are joins that repeated a row. In this mission you meet the Brewline model, break a total on purpose, and fix it in the tables.',
    scenes: [
      B.flow({
        id: 'm2-star', t: 1, src: 'rec', title: 'The Brewline star schema', g: 'star', legend: true,
        steps: [
          { say: 'This is the model behind the sales dashboard. The table in the middle is the **fact**: the order lines. Around it are **dimensions**, the things you group and filter by. Press Next.', focus: ['lines'], cap: 'A fact in the middle, dimensions around it.' },
          { say: 'Arrow 1. Many lines belong to **one order**. The order holds what is true once for the whole order: the store, the customer, the shipping fee.', on: ['r1'], focus: ['lines', 'orders'], tags: ['tg_many'], cap: 'Many lines, one order.' },
          { say: 'Arrow 2. An order belongs to one **store**, and the store carries the city and the region. A filter on region reaches the lines by walking back along arrows 2 and 1.', on: ['r1', 'r2'], focus: ['orders', 'store', 'lines'], cap: 'A filter travels from the one side to the many side.' },
          { say: 'Arrows 3 and 4. Each line has one **product** and one **day**. Category comes from the product, and month and quarter come from the day.', on: ['r3', 'r4'], focus: ['lines', 'product', 'date'], cap: 'Every arrow points at exactly one row.' },
          { say: 'Arrow 5 is the difficult one. An order can carry **two promotion codes**, so the bridge table has more than one row for some orders. Follow it to the lines and one line can appear under two codes.', on: ['r5'], focus: ['promo', 'orders'], tags: ['tg_m2m'], cap: 'A bridge makes a many-to-many path.' },
          { say: 'All five arrows were checked on the data: the "one" side of each has no repeated key, and no row points at nothing. You will see that check in a moment.', focus: ['lines', 'orders', 'store', 'product', 'date', 'promo'], cap: 'The arrows are promises about the data.' }
        ]
      }),

      B.rows({
        id: 'm2-grain', t: 1, src: 'rec', title: 'Every table has a grain',
        steps: [
          {
            say: 'The **grain** is what one row means. Say it as "one row for each ...". If you cannot finish that sentence for a table, a BI model built on it will count something twice.',
            tabs: [{ layer: 'RECORDED', name: 'The Brewline tables', c: 'raw', cols: T.cols, rows: T.rows, trk: 0 }],
            notes: [n(F.orders) + ' orders have ' + n(F.lines) + ' lines: ' + F.lines_per_order + ' lines for each order on average, and ' + F.max_lines_on_an_order + ' at most.']
          },
          {
            say: 'Here are the first four orders. Order 1 has a shipping fee of 2.50. That fee is a fact about the **order**.',
            tabs: [{ layer: 'RECORDED', name: 'fact_orders, four rows', c: 'raw', cols: G.table('model.orders_sample').cols, rows: G.table('model.orders_sample').rows, trk: 0 }],
            notes: ['A column belongs in the table whose grain it shares. A shipping fee has the grain of the order.']
          },
          {
            say: 'And here are their lines. Order 1 has **two lines**. If you join the two tables, order 1 becomes two rows, and its fee of 2.50 is there twice.',
            tabs: [{ layer: 'RECORDED', name: 'fact_order_lines, the lines of those four orders', c: 'raw', cols: G.table('model.lines_sample').cols, rows: G.table('model.lines_sample').rows, trk: 0 }],
            notes: ['Nothing is wrong with either table. The mistake is to add up a column after a join that repeated it.']
          }
        ]
      }),

      B.sql({
        id: 'm2-wrong', t: 1, src: 'rec', title: 'A join that doubles the shipping total', file: 'fanout_wrong.sql', code: WRONG,
        result: { cols: FT.cols.slice(0, 3), rows: [FT.rows[0].slice(0, 3), FT.rows[1].slice(0, 3)], msg: 'two queries, side by side' },
        steps: [
          { say: 'A tile wants the total shipping. Somebody builds it on the model that already joins orders to lines, because that is where revenue comes from.' },
          { say: 'The join. For every line, the order row is repeated. A fee that was stored once is now present once for each line.', lines: G.span(WRONG, /^FROM fact_orders/, /^JOIN fact_order_lines/) },
          { say: 'The sum adds every copy.', lines: G.span(WRONG, /sum\(o\.shipping_fee\)/) },
          { say: 'Run it next to the plain sum from the orders table. The orders table gives **' + n(F.shipping_right) + '**. The join read ' + n(F.lines) + ' rows and gives **' + n(F.shipping_wrong) + '**: ' + F.times_too_high + ' times too high. There is no error message. The tile just shows a larger number.', run: true }
        ],
        note: 'This is called a fan-out. The ratio ' + F.times_too_high + ' is the average number of lines on an order, which is why the wrong number looks plausible.'
      }),

      B.sql({
        id: 'm2-fixed', t: 1, src: 'rec', title: 'Fix it: bring both sides to the same grain', file: 'fanout_fixed.sql', code: FIXED,
        result: { cols: ['rows_read', 'shipping_total', 'revenue_total'], rows: [[F.orders, F.shipping_fixed, F.revenue_total]], msg: '1 row' },
        steps: [
          { say: 'The rule: before you join two facts, bring them to the same grain.' },
          { say: 'The lines are summed to **one row for each order** first. Revenue is still there, as one number for each order.', lines: G.span(FIXED, /^WITH lines AS/, /^\)/) },
          { say: 'Now the join meets one row with one row. Nothing is repeated.', lines: G.span(FIXED, /^FROM fact_orders/, /^JOIN lines/) },
          { say: 'Run it. ' + n(F.orders) + ' rows, shipping **' + n(F.shipping_fixed) + '**, the same as the orders table alone, and revenue ' + n(F.revenue_total) + ' in the same query.', run: true }
        ],
        note: 'In a warehouse you often build this as a table: an orders fact with the revenue of its lines already added. Then no BI model can get it wrong.'
      }),

      B.widget({ id: 'm2-lab', kind: 'fanout', t: 1, src: 'rec', title: 'Lab: four orders, three ways to add the shipping' }),

      B.cmp({
        id: 'm2-tools', t: 1, src: 'docs', title: 'How each tool protects you, and where it stops',
        say: 'All three tools know about this trap. Each has a defence, and each defence depends on something that you provide. Press Next.',
        cols: ['Tool', 'What it does', 'What it needs from your tables'],
        hl: 2,
        rows: [
          ['Power BI', 'A relationship has a cardinality: one to many, one to one or many to many. A measure on the order table is computed on the order table, so it is not repeated by the lines.', 'A key that really is unique on the one side. Power BI refuses to load a one-to-many relationship when the key repeats.'],
          ['Tableau', 'Tables are linked by relationships, and each measure is aggregated at the level of its own table before the tables are combined.', 'The right cardinality on the relationship, and tables that each have one clear grain.'],
          ['Looker', 'Every view declares a primary key and every join declares its relationship. With those, Looker computes sums and counts so that a fan-out does not inflate them. The documentation calls this symmetric aggregates.', 'A primary key that is truly unique. A wrong `primary_key` or a wrong `relationship` gives a wrong number without an error.'],
          ['Any tool, custom SQL', 'Nothing. A hand-written join in a custom query, a database view or a derived table fans out exactly as in the recording.', 'You, bringing both sides to the same grain first.']
        ],
        steps: [
          { upto: 3, say: 'The three defences are the same idea: compute each measure at the grain of its own table. They all rest on one promise from you: the key is unique.' },
          { upto: 4, say: 'The last row is where most real bugs live. As soon as somebody writes the join by hand, the tool cannot help.' }
        ]
      }),

      B.rows({
        id: 'm2-keys', t: 1, src: 'rec', title: 'Check the promises: unique keys and no orphans',
        steps: [
          {
            say: 'A relationship is a promise about the data. Two checks prove it: the key on the "one" side never repeats, and every row on the "many" side finds its match. This is the result for the four relationships of the Brewline model.',
            tabs: [{ layer: 'RECORDED', name: 'Relationship checks', c: 'raw', cols: REL.cols, rows: REL.rows, trk: 0 }],
            notes: ['All zeros. Run these two checks in the pipeline, after the load and before the BI refresh. In dbt they are the tests `unique` and `relationships`.']
          },
          {
            say: 'Think about what a failure would do. One repeated store id would double every line of that store on every tile. One order with a store id that is not in the dimension would vanish from a chart by region, or show up as a blank region.',
            tabs: [{ layer: 'RECORDED', name: 'Relationship checks', c: 'raw', cols: REL.cols, rows: REL.rows, trk: 0 }],
            notes: ['A repeated key inflates. A missing key hides rows. The dashboard shows a number either way.']
          }
        ]
      }),

      B.sql({
        id: 'm2-m2m', t: 2, src: 'rec', title: 'Many to many: an order under two promotion codes', file: 'm2m.sql', code: M2M,
        result: { cols: MT.cols, rows: MT.rows, msg: MT.rows.length + ' rows' },
        steps: [
          { say: 'Marketing wants revenue by promotion code. ' + n(M.orders_with_two_codes) + ' orders carry two codes, so the bridge table has two rows for each of them.' },
          { say: 'The join from the bridge to the lines repeats every line of such an order, once for each code.', lines: G.span(M2M, /^FROM bridge_order_promos/, /^JOIN fact_order_lines/) },
          { say: 'Run it. Each row on its own is true: the orders that used SPRING really did bring in that revenue. Now add the five rows up: **' + n(M.revenue_summed_over_codes) + '**. The orders with a code brought in **' + n(M.revenue_of_orders_with_a_code) + '**. The total of the chart is too high.', run: true }
        ],
        note: 'The rows are right and their sum is wrong. A total row on that chart must be computed on its own, as a distinct count or a sum over orders. BI tools do this for a measure when the model is built correctly, and a custom query does not.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'Which sentence is a grain?',
        opts: [
          { t: 'The table holds sales data', fb: 'That is a topic. It does not say what one row means.' },
          { t: 'One row for each product on an order', fb: '' },
          { t: 'The table is refreshed every night', fb: 'That is a schedule.' },
          { t: 'The table has 122,196 rows', fb: 'That is a size. It does not say what a row is.' }
        ],
        ok: 1, why: 'A grain says what one row is. If two rows could describe the same product on the same order, the table has no clear grain and sums on it are not safe.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'The shipping total on a tile is about twice the number in the finance report. Nothing failed. What do you check first?',
        opts: [
          { t: 'Whether the refresh ran twice', fb: 'A refresh replaces the copy. It does not add the rows a second time.' },
          { t: 'Whether the fee is summed after a join to a table with more rows for each order', fb: '' },
          { t: 'Whether the currency changed', fb: 'A currency change would not give a factor near the number of lines for each order.' },
          { t: 'Whether the chart type is wrong', fb: 'A chart draws the number it is given.' }
        ],
        ok: 1, why: 'A factor near 2 is the average number of lines on an order: ' + F.lines_per_order + ' in the Brewline data. That points at a fan-out. Divide the wrong number by the right one and see whether the ratio means something.'
      }),

      B.quiz({
        id: 'm2-q3', t: 2,
        q: 'A filter on region must reach the order lines. Along which direction does a filter travel in a star schema?',
        opts: [
          { t: 'Out of the fact, into the dimension', fb: 'That direction would let a line filter the stores. Tools call it bidirectional filtering, and it is switched off by default for good reasons.' },
          { t: 'Out of the dimension, the one side, into the fact, the many side', fb: '' },
          { t: 'In both directions, always', fb: 'Both directions together can create ambiguous paths and slow queries.' },
          { t: 'A filter does not travel. Every table is filtered on its own', fb: 'Then a region filter could never change a revenue number.' }
        ],
        ok: 1, why: 'A filter starts on a dimension and follows the relationship to the fact. That is why dimensions are small tables with one row for each key: they are the place where filters start.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This query feeds a tile with revenue and shipping by region. One of the two numbers is wrong. Click the line that makes it wrong.',
        file: 'tile_revenue_shipping.sql', lang: 'sql', code: BUG, bad: [G.at(BUG, /sum\(o\.shipping_fee\)/)],
        hint: 'Which column has the grain of the order, and which the grain of the line?',
        why: 'Revenue has the grain of the line, so it is right after the join. The shipping fee has the grain of the order, and the join repeats it for every line. On the Brewline data that makes it ' + F.times_too_high + ' times too high.',
        fix: 'WITH lines AS (\n  SELECT order_id, sum(line_amount) AS revenue\n  FROM fact_order_lines\n  GROUP BY order_id\n)\nSELECT s.region,\n       sum(l.revenue)      AS revenue,\n       sum(o.shipping_fee) AS shipping\nFROM fact_orders o\nJOIN lines l     ON l.order_id = o.order_id\nJOIN dim_store s ON s.store_id = o.store_id\nGROUP BY s.region;',
        cheer: 'Ask of every summed column: what is its grain, and did a join repeat it?'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: one wide table or a star?',
        scenario: 'The analysts ask you for "one big table with everything" for their dashboards: every order line with the store, the product, the customer and the order columns next to it. The warehouse is a column store. The dashboards run in Power BI and in Looker.',
        opts: [
          { t: 'One wide table with every column, and nothing else', d: 'One table to explain. No joins in the tool.', lose: 'The shipping fee is repeated on every line of an order, so the first person who sums it gets the fan-out again, this time with no join to blame. A change of a store name rewrites every line.' },
          { t: 'A star: facts at their own grain, small dimensions, checked keys', d: 'Each measure is computed at the grain of its table, filters start on small tables, and a dimension changes in one place.' },
          { t: 'The raw source tables, and let each tool model them', d: 'No work for you.', lose: 'Each tool rebuilds the same joins and the same rules, three times and slightly differently. The numbers stop agreeing between dashboards.' }
        ],
        pick: 1,
        why: 'A star keeps each number at its own grain, and both tools are built around it: Power BI relationships and Looker joins expect a unique key on a small table. A wide table is a fine output for one export or one extract, built from the star.',
        when: 'Build a wide table when one tile reads billions of rows and the join cost dominates, or for a tool that cannot join. Keep order-level numbers out of it, or allocate them to the lines.'
      }),

      B.qa({
        id: 'qa-grain', t: 1, tag: 'Modeling', secs: 60,
        q: 'What is the grain of a table, and why does a BI model depend on it?',
        pts: ['Grain: what one row means, "one row for each ..."', 'A measure is safe to sum only at its own grain', 'A join to a finer table repeats coarser rows', 'Checked by a unique key'],
        short: 'The grain is what one row of a table means, for example one row for each order, or one row for each product on an order. A BI model depends on it because a measure is only safe to add up at its own grain. If I join orders to order lines, every order row is repeated for each of its lines, so a shipping fee that is stored on the order is counted several times. So for each table I can say the grain in one sentence, I have a key that proves it, and I keep each number in the table whose grain it shares.',
        fu: [['How do you prove a grain?', 'With a uniqueness test on the key, run after every load.'], ['What if a number has no natural grain in the fact, like an order discount?', 'Keep it on the order, or allocate it to the lines by a rule and say so in the column name.']],
        trap: 'Saying "the level of detail" and stopping. Give the sentence and the key.',
        real: 'Describe one table you built and say its grain.'
      }),

      B.qa({
        id: 'qa-fanout', t: 1, tag: 'Modeling', secs: 75,
        q: 'A dashboard total is too high and nothing failed. How do you find the cause?',
        pts: ['Compare with a trusted number and compute the ratio', 'Find the measure\'s grain and the joins on its path', 'A join to a finer table or a repeated key is the usual cause', 'Fix in the tables: same grain before the join, unique keys'],
        short: 'I start by comparing the number with one I trust and looking at the ratio, because the ratio often names the cause. In the recording behind this course a shipping total was 2.1 times too high, and 2.1 was the average number of lines on an order. Then I look at the grain of the measure and at every join between its table and the tile. A join to a table with more rows for the same key repeats the measure, and so does a dimension whose key is not unique. The fix belongs in the tables: bring both sides to the same grain before joining, and test that every dimension key is unique.',
        fu: [['Would the BI tool not prevent this?', 'It does when the model has the right keys and relationships. A custom query, a view or a wrong primary key gets past it.'], ['What test would have caught it?', 'A uniqueness test on the dimension key, and a reconciliation of the dashboard total against the source total.']],
        trap: 'Blaming the refresh. A refresh replaces data. It does not multiply it.',
        real: 'Tell a short story of a doubled number, if you have one.'
      }),

      B.qa({
        id: 'qa-star', t: 2, tag: 'Modeling', secs: 75,
        q: 'Why do BI tools prefer a star schema over one wide table or the raw source tables?',
        pts: ['Facts hold numbers at one grain, dimensions hold the things to filter by', 'Filters start on small tables and travel to the fact', 'Each measure is computed at the grain of its own table', 'One place to change a name or a hierarchy'],
        short: 'A star schema splits the data into facts and dimensions. A fact holds numbers at one grain, and a dimension holds one row for each thing you filter or group by, such as a store or a day. BI engines are built around that shape: a filter starts on a small dimension and follows a one-to-many relationship to the fact, and each measure is computed at the grain of its own table, which is what protects sums from a fan-out. A wide table repeats order-level values on every line and makes every change to a dimension a rewrite. Raw source tables leave every tool to rebuild the same joins. I still build wide tables, for one extract or one heavy tile, from the star.',
        fu: [['When is a wide table the better choice?', 'When join cost dominates on very large data, or the tool cannot join. Keep the coarser numbers out of it.'], ['What is a snowflake schema?', 'A star whose dimensions are split further, for example a region table behind the store table. It saves space and adds a join.']],
        trap: 'Saying "because Kimball said so". Explain filters and grain.',
        real: 'Mention the size of the largest fact you modeled, if you know it.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Grain Keeper', color: '#BBF7D0',
        pts: [
          'The **grain** is what one row means. A number belongs in the table whose grain it shares.',
          'A join to a finer table **repeats rows**. The shipping total went from ' + n(F.shipping_right) + ' to ' + n(F.shipping_wrong) + ' with no error.',
          '**Bring both sides to the same grain** before you join two facts.',
          'A relationship is a promise: a **unique key** on the one side and **no orphans** on the many side. Test both after every load.',
          'With a **many-to-many** path, each row can be right while the sum of the rows is wrong.'
        ],
        lines: [
          'I can say the grain of every table I own.',
          'I can find a fan-out from the ratio.',
          'I test the keys before the dashboard reads them.'
        ]
      })
    ]
  });
})();
