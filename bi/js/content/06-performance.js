/* Mission 6: speed. Aggregate tables, what they cannot answer, and which columns cost space. Numbers are DuckDB results. */
(function () {
  var B = LAB.b, G = LAB.get;
  var A = G.counts('perf.agg'), CAN = G.table('perf.can_answer'), COL = G.table('perf.columns'), CC = G.counts('perf.columns'), PG = G.table('perf.page'), PC = G.counts('perf.page'), TR = G.table('tile.region_month');
  var BUILD = G.file('sql/agg_build.sql'), FROMAGG = G.file('sql/tile_from_agg.sql');
  var n = G.n;
  G.expect(A.tile_same_numbers === true, 'the tile gives the same numbers from the aggregate table and from the fact table');
  G.expect(A.customers_march_summed_from_agg > A.customers_march_true * 3, 'adding the daily customer counts of the aggregate overstates the customers of March');
  G.expect(CC.top_two[0] === 'order_id' && CC.top_two_share_pct > 50, 'order_id and one more column take more than half of the Parquet file');
  var BUG = 'SELECT strftime(order_date, \'%Y-%m\') AS month,\n       sum(revenue)            AS revenue,\n       sum(customers_that_day) AS customers\nFROM agg_day_store_category\nWHERE order_date >= DATE \'2026-03-01\'\nGROUP BY month;';

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Performance: what a dashboard asks of your tables', short: 'Speed', blurb: 'Aggregate tables, the questions they cannot answer, and the columns that cost', minutes: 18,
    focus: ['mon', 'mart', 'stg'],
    goals: [
      'Build an **aggregate table** and say which tiles it can answer.',
      'Explain why a **distinct count** or a missing column sends a tile back to the fact table.',
      'Find the **columns that cost space** in a model.',
      'Work through a **slow dashboard** in a fixed order.'
    ],
    say: 'When a dashboard is slow, the analyst opens a ticket for you. Most of the time the answer is not a bigger warehouse. It is a smaller table, fewer columns, or a question that should never have gone to the fact table.',
    scenes: [
      B.flow({
        id: 'm6-agg', t: 1, src: 'docs', title: 'A small table answers most tiles', g: 'agg', legend: true,
        steps: [
          { say: 'A tile is a question with a grain: revenue **by region and month**. The fact table has a much finer grain: one row for each product on an order. Press Next.', focus: ['tile', 'fact'], cap: 'The question is coarser than the table.' },
          { say: 'Step 1. Before the query runs, something decides which table to read. In Looker this is called aggregate awareness, in Power BI aggregations. In a plain setup it is you, pointing the tile at another table.', on: ['g1'], focus: ['tile', 'route'], cap: 'Which table can answer?' },
          { say: 'Step 2. An **aggregate table** holds the data already summed to a coarser grain, here day, store and category. If the tile needs only columns that the aggregate has, and a measure that adds up, the small table is enough.', on: ['g2'], focus: ['route', 'agg'], tags: ['tg_yes'], cap: 'Coarser grain, far fewer rows.' },
          { say: 'Step 3. Ask for something that was summed away, such as a single product, or for a number that does not add up, such as distinct customers, and the small table cannot help. The query goes to the fact table.', on: ['g3'], focus: ['route', 'fact'], tags: ['tg_no'], cap: 'Detail and distinct counts need the fact.' },
          { say: 'An aggregate table is one more thing to load, test and keep in step with the fact. Build one when a dashboard needs it, at the grain of the tiles that people open most.', focus: ['agg', 'fact'], tags: ['tg_yes', 'tg_no'], cap: 'A second table to keep in step.' }
        ]
      }),

      B.sql({
        id: 'm6-build', t: 1, src: 'rec', title: 'Building the aggregate table', file: 'agg_build.sql', code: BUILD,
        result: { cols: ['table', 'rows', 'grain'], rows: G.table('perf.tables').rows, msg: 'the table was created' },
        steps: [
          { say: 'The aggregate for the Brewline dashboard. Read its grain in the `GROUP BY`.' },
          { say: 'One row for each **day, store and category**. The product and the customer are gone.', lines: G.span(BUILD, /^GROUP BY/) },
          { say: 'Revenue, units and orders are sums and counts at that grain. They add up over days and over stores.', lines: G.span(BUILD, /sum\(l\.line_amount\)/, /count\(DISTINCT o\.order_id\)/) },
          { say: 'The last column is a trap that I left in on purpose: customers **that day**, in that store and category. It is a correct number for one row and it does not add up. Remember it.', lines: G.span(BUILD, /customers_that_day/) },
          { say: 'Run it. ' + n(A.fact_rows) + ' lines become **' + n(A.agg_rows) + '** rows: ' + A.times_fewer_rows + ' times fewer. The most it could ever have is ' + n(A.most_rows_possible) + ', which is ' + A.days + ' days times ' + A.stores + ' stores times ' + A.categories + ' categories.', run: true }
        ],
        note: 'The saving depends on the data. A year later the fact table has grown by all new lines and the aggregate by at most 48 rows a day.'
      }),

      B.sql({
        id: 'm6-same', t: 1, src: 'rec', title: 'The same tile from the small table', file: 'tile_from_agg.sql', code: FROMAGG,
        result: { cols: TR.cols, rows: TR.rows, msg: TR.rows.length + ' rows' },
        steps: [
          { say: 'The revenue tile from mission 1, now reading the aggregate.' },
          { say: 'The region is not in the aggregate, but the store is, and the store dimension knows the region. A join to a small dimension is fine.', lines: G.span(FROMAGG, /^FROM agg_day_store_category/, /^JOIN dim_store/) },
          { say: 'The month comes from the day. A coarser time grain can always be derived from a finer one.', lines: G.span(FROMAGG, /strftime/) },
          { say: 'Run it. Twelve rows, and I compared them with the result from the fact table: **the same twelve numbers**.', run: true }
        ],
        note: 'That comparison is the test you run after every load of an aggregate: the same total from both tables. An aggregate that drifts from its fact is worse than no aggregate.'
      }),

      B.rows({
        id: 'm6-can', t: 1, src: 'rec', title: 'What the small table can answer',
        steps: [
          {
            say: 'Five questions from the dashboard. Three of them fit the aggregate.',
            tabs: [{ layer: 'RECORDED', name: 'Can agg_day_store_category answer it?', c: 'raw', cols: CAN.cols, rows: CAN.rows, trk: 0 }],
            notes: ['Two rules decide. Every column of the question must be in the grain of the aggregate, or derivable from it. And the measure must add up.']
          },
          {
            say: 'The customer count is the one to remember. Adding the daily counts of the aggregate for March gives **' + n(A.customers_march_summed_from_agg) + '**. The real number of customers who ordered in March is **' + n(A.customers_march_true) + '**. A customer who bought coffee and tea in two stores on two days is in several rows.',
            tabs: [{ layer: 'RECORDED', name: 'Can agg_day_store_category answer it?', c: 'raw', cols: CAN.cols, rows: CAN.rows, trk: 0 }],
            notes: ['A column that does not add up should not be in an aggregate table under a name that invites a sum. Leave it out, or name it so that nobody adds it.']
          }
        ]
      }),

      B.widget({ id: 'm6-lab', kind: 'agg', t: 1, src: 'rec', title: 'Lab: which table answers which tile' }),

      B.rows({
        id: 'm6-cols', t: 1, src: 'rec', title: 'Which columns cost space',
        steps: [
          {
            say: 'A copy in a BI tool is stored by column and compressed. A column with few different values compresses to almost nothing. A column where almost every value is different does not. I wrote the wide sales table to a Parquet file and measured each column.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes for each column, ' + n(CC.rows) + ' rows', c: 'raw', cols: COL.cols, rows: COL.rows.map(function (r) { return [r[0], n(r[1]), n(r[2]), r[3]]; }), trk: 0 }],
            notes: ['`' + CC.top_two[0] + '` and `' + CC.top_two[1] + '` take **' + CC.top_two_share_pct + ' %** of the file. `region` and `category`, with four values each, take under 4 % each.']
          },
          {
            say: 'Does the dashboard need the order id? A chart by region and month does not. Dropping columns that no tile uses is the cheapest speed-up there is, and you can do it in the view or the table that feeds the model.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes for each column, ' + n(CC.rows) + ' rows', c: 'raw', cols: COL.cols, rows: COL.rows.map(function (r) { return [r[0], n(r[1]), n(r[2]), r[3]]; }), trk: 0 }],
            notes: ['This is a Parquet file written by DuckDB. The engines inside Power BI and Tableau compress in their own way, so their numbers differ. The rule is the same in both sets of documentation: high-cardinality columns cost the most.']
          }
        ]
      }),

      B.cmp({
        id: 'm6-tools', t: 2, src: 'docs', title: 'The speed features of each tool',
        say: 'Each tool has a way to see what a tile costs and a way to make it cheaper. Press Next.',
        cols: ['', 'Power BI', 'Tableau', 'Looker'],
        hl: 0,
        rows: [
          ['See what a visual sends', 'Performance analyzer shows the DAX query of each visual and, for DirectQuery, the SQL.', 'A performance recording shows the queries and how long each took.', 'The SQL tab of an explore shows the generated SQL.'],
          ['A small table for common questions', 'Aggregations: a summary table that the engine uses when it can, and the detail table otherwise.', 'An extract that is aggregated to the visible dimensions when it is built.', 'Aggregate awareness: an `aggregate_table` under an explore. Looker picks the smallest table that can answer.'],
          ['Push work to the source', 'Query folding: Power Query steps are translated into one source query. A step that cannot be folded makes the refresh pull the rows and work on them locally.', 'A live connection sends the filters and aggregates to the database.', 'Everything is pushed down. Looker only writes SQL.'],
          ['Carry less', 'Remove unused columns and avoid high-cardinality columns in an imported model.', 'Hide unused fields before the extract is built, and use extract filters.', 'Select fewer fields in the explore. The warehouse reads only those columns.']
        ],
        steps: [
          { upto: 2, say: 'First find out what the tile really sends. Then give the common questions a small table.' },
          { upto: 4, say: 'Query folding is the Power BI term you are most likely to be asked about. It means that the filter runs in your warehouse, where it is cheap.' }
        ]
      }),

      B.talk({
        id: 'm6-slow', t: 1, src: 'docs', title: 'A slow dashboard, in order',
        say: 'When the ticket says "the dashboard is slow", work through these in order. Press Next for each.',
        items: [
          ['1. Which tile, and what does it send?', 'Use the tool to see the query behind the slow visual. One slow tile out of six is a different problem from a slow page.', 'Find the query first.'],
          ['2. Where does it run?', 'A copy answers from memory, so a slow import model points at the model itself: too many columns, a heavy measure, too many visuals. A live model points at the warehouse.', 'Copy or live decides where to look.'],
          ['3. How many rows does it read?', 'A tile by region and month that reads every order line is asking a coarse question of a fine table. Give it an aggregate.', 'Match the grain of the table to the grain of the question.'],
          ['4. What does it carry?', 'Unused columns, and columns with a value for almost every row, such as ids and timestamps to the second. Remove them from the model or round them.', 'Fewer and narrower columns.'],
          ['5. Does the filter reach the source?', 'For an import, check that the date filter of the refresh runs in the warehouse. For a live model, check that the warehouse can use it: a partition or a clustering key on the date.', 'Filter where the data lives.'],
          ['6. Only then: more hardware', 'A larger warehouse or a larger capacity makes every query faster and every month more costly. It is the last step, not the first.', 'Size is the last lever.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'The aggregate table has one row for each day, store and category. Which tile can it answer?',
        opts: [
          { t: 'Revenue by product, this month', fb: 'The product was summed away. Only the category is left.' },
          { t: 'Units by region and week', fb: '' },
          { t: 'Customers who ordered this quarter', fb: 'A distinct count does not add up over days and stores.' },
          { t: 'The ten largest orders', fb: 'Single orders are not in the aggregate.' }
        ],
        ok: 1, why: 'Region comes from the store, week comes from the day, and units add up. All three conditions hold, so ' + n(A.agg_rows) + ' rows are enough.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'An imported model is larger than expected. Which column is the first one to question?',
        opts: [
          { t: '`region`, a text column', fb: 'Four different values compress to almost nothing.' },
          { t: '`order_id`, different on almost every row', fb: '' },
          { t: '`quantity`, a small integer', fb: 'Three different values.' },
          { t: '`status`, completed or refunded', fb: 'Two different values.' }
        ],
        ok: 1, why: 'In the recording `order_id` alone took ' + COL.rows[0][3] + ' of the file. If no tile needs it, do not load it.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'This query feeds two monthly tiles from the aggregate table. One of the two numbers is far too high. Click the line.',
        file: 'monthly_from_agg.sql', lang: 'sql', code: BUG, bad: [G.at(BUG, /sum\(customers_that_day\)/)],
        hint: 'Which of the two measures adds up over days, stores and categories?',
        why: 'Revenue adds up. A count of distinct customers for one day, store and category does not: the same customer is in many rows. On the Brewline data the sum for March is ' + n(A.customers_march_summed_from_agg) + ' and the true number is ' + n(A.customers_march_true) + '.',
        fix: 'SELECT strftime(order_date, \'%Y-%m\')  AS month,\n       count(DISTINCT customer_id)    AS customers\nFROM fact_orders                      -- the distinct count needs the detail\nWHERE order_date >= DATE \'2026-03-01\'\nGROUP BY month;',
        cheer: 'A distinct count belongs to exactly one grain. Change the grain and you must count again.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'docs', title: 'Incident: the sales page takes 40 seconds', time: '08:50',
        alert: '**Store managers report that the sales page takes about 40 seconds to open since Monday.** Last week it took a few seconds. The model is live on the warehouse.',
        clues: ['A new tile "Top 10 products" was added on Monday', 'The query history shows one query from the page that reads the whole fact table, including a text column with product descriptions', 'The other five tiles read the aggregate table and return quickly'],
        opts: [
          { t: 'Look at the query of the new tile, give it the columns it needs and a table at its grain', fb: '' },
          { t: 'Scale the warehouse up for the morning', fb: 'The five fast tiles do not need it, and the slow one would still read every line.' },
          { t: 'Move the whole page to an import', fb: 'A large change for one tile. Find out what the tile sends first.' },
          { t: 'Remove the aggregate table, so that all tiles behave the same', fb: 'That makes five fast tiles slow.' }
        ],
        best: 0,
        why: 'One tile changed and one query is slow. The page waits for its slowest tile. The new tile asks for products, which the aggregate does not have, so it went to the fact table and carried a wide text column with it.',
        checks: [
          ['Isolate', 'Open the page with the new tile removed, or read the timings for each tile in the tool.'],
          ['Read the query', 'Which table, which columns, which filter? A missing date filter is common on a new tile.'],
          ['Fit a table', 'A second aggregate at the grain of day and product, or a filter that lets the warehouse skip most of the fact.'],
          ['Compare', 'Check that the top ten from the new table match the fact table.']
        ],
        tell: 'The page became slow because one new tile ranked products, which the existing aggregate could not answer, so it read the whole fact table with a wide text column. I built an aggregate by day and product, pointed the tile at it and checked the result against the fact. The page is back to a few seconds.',
        prevent: ['Review the **query of a new tile** before it goes to 200 people', 'Keep a short list of **which aggregate serves which grain**', 'Alert on **queries from the BI service account that scan the full fact**']
      }),

      B.qa({
        id: 'qa-slow', t: 1, tag: 'BI', secs: 75,
        q: 'A dashboard is slow. How do you approach it?',
        pts: ['Find the slow tile and the query it sends', 'Copy or live: model problem or warehouse problem', 'Rows read against the grain of the question: aggregate table', 'Columns carried: drop unused and high-cardinality columns', 'Hardware last'],
        short: 'I start with the tool\'s own view of what each visual sends, because one slow tile and a slow page are different problems. Then I ask where the query runs. If the model is a copy, the cause is in the model: too many columns, a heavy measure, too many visuals on a page. If it is live, the cause is in the warehouse. Next I compare the grain of the question with the grain of the table it reads. A chart by region and month that reads every order line needs an aggregate table. I also look at what the model carries: unused columns and columns with a different value on almost every row. More hardware is the last step.',
        fu: [['How do you check that an aggregate is correct?', 'The same total from the aggregate and from the fact, after every load.'], ['What is query folding?', 'Power Query steps translated into one query that runs in the source, so the filter is applied there and not after the rows have been pulled.']],
        trap: 'Starting with "scale up the warehouse".',
        real: 'Give the before and after of one dashboard you made faster, with numbers if you have them.'
      }),

      B.qa({
        id: 'qa-agg', t: 2, tag: 'Modeling', secs: 75,
        q: 'What is an aggregate table, and what are its limits?',
        pts: ['The fact summed to a coarser grain', 'Answers tiles whose columns are in that grain and whose measures add up', 'Cannot answer detail or distinct counts at another grain', 'Must be loaded and reconciled with the fact'],
        short: 'An aggregate table is the fact table summed to a coarser grain, for example one row for each day, store and category. Most tiles ask coarse questions, so they can read the small table. In the recording for this course 122,196 order lines became 21,449 rows, and a revenue tile gave the same twelve numbers from both. There are two limits. A tile that needs a column that was summed away, such as the product, must go to the fact. And a measure that does not add up, such as a distinct count of customers, is only right at the exact grain it was computed for: adding the daily counts gave 7,696 customers for a month that had 1,788. The cost is one more table to load and to reconcile.',
        fu: [['Who decides which table a query reads?', 'Looker with aggregate awareness and Power BI with aggregations can decide for each query. Otherwise the tile is pointed at a table by hand.'], ['How do you serve distinct counts fast?', 'An aggregate at exactly that grain, or an approximate count that can be merged.']],
        trap: 'Presenting aggregates as free. They are a second copy of the truth.',
        real: 'Name the grain of an aggregate you built.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Query Tuner', color: '#A7F3D0',
        pts: [
          'A tile is a coarse question. Give it a table at **its grain**: ' + n(A.fact_rows) + ' lines became ' + n(A.agg_rows) + ' rows.',
          'An aggregate answers a tile when its **columns are in the grain** and its **measure adds up**.',
          'A **distinct count** summed from an aggregate is wrong: ' + n(A.customers_march_summed_from_agg) + ' against ' + n(A.customers_march_true) + '.',
          '**High-cardinality columns** cost the most. `order_id` took ' + COL.rows[0][3] + ' of the file.',
          'For a slow dashboard: the query, where it runs, rows read, columns carried, and hardware last.'
        ],
        lines: [
          'I match the grain of a table to the question.',
          'I reconcile an aggregate with its fact.',
          'I read the query before I scale anything.'
        ]
      })
    ]
  });
})();
