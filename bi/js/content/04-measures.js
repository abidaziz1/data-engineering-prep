/* Mission 4: measures. The numbers are DuckDB results. The DAX, Tableau and LookML next to them were written from documentation and not run by their tools. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SH = G.table('measures.share'), AOV = G.counts('measures.aov'), AS = G.table('measures.aov_by_store'), D = G.table('measures.distinct'), DC = G.counts('measures.distinct'), Y = G.table('measures.ytd'), CO = G.table('measures.cohort'), COC = G.counts('measures.cohort');
  var SHARE = G.file('sql/share.sql'), AOVQ = G.file('sql/aov.sql'), DIST = G.file('sql/distinct.sql'), YTD = G.file('sql/ytd.sql'), COH = G.file('sql/cohort.sql'), VIEW = G.file('lookml/views/order_lines.view.lkml'), TMDL = G.file('powerbi/fact_order_lines.tmdl'), LK = G.counts('lookml.summary');
  var n = G.n, north = G.row('measures.share', 'North');
  G.expect(AOV.ratio_of_sums !== AOV.average_of_ratios, 'the ratio of sums and the average of ratios differ');
  G.expect(DC.sum_of_the_months > DC.quarter * 2, 'the monthly customer counts add up to far more than the customers of the quarter');
  G.expect(CO.rows.reduce(function (a, r) { return a + r[1]; }, 0) === COC.customers_who_ordered, 'every customer is in exactly one first-order quarter');
  var BUG = 'SELECT s.region,\n       avg(st.average_order_value) AS average_order_value\nFROM store_daily_stats st          -- one row for each store and day\nJOIN dim_store s ON s.store_id = st.store_id\nWHERE st.order_date >= DATE \'2026-03-01\'\nGROUP BY s.region;';

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Measures and the semantic layer', short: 'Measures', blurb: 'One formula, many filters: DAX, Tableau calculations and LookML', minutes: 22,
    focus: ['mart', 'stg'],
    goals: [
      'Explain a **measure** and why it is computed again for every filter.',
      'Read a simple measure in **DAX, a Tableau calculation and LookML**.',
      'Tell **additive** numbers from numbers that do not add up.',
      'Decide what belongs in the **warehouse** and what in the **semantic layer**.'
    ],
    say: 'A measure is where the business agrees on a number. You will not write many of them. You will be asked why two dashboards disagree, and the answer is usually in this mission: a ratio that was averaged, or a distinct count that was summed.',
    scenes: [
      B.talk({
        id: 'm4-what', t: 1, src: 'docs', title: 'A column, a calculated column and a measure',
        say: 'Three things look alike in a BI model and behave very differently. Press Next for each.',
        items: [
          ['A column', 'A value that is stored for every row: `line_amount`, `region`, `order_date`. It comes from your table. You group by it, filter by it, or add it up.', 'Stored, one value for each row.'],
          ['A calculated column', 'A new value for every row, computed when the data is loaded and then stored: `line_amount * 0.2 AS tax`. It costs space and it does not change when a viewer clicks. In most cases it belongs in the warehouse, where every tool can use it.', 'Computed at load time. Push it to the warehouse.'],
          ['A measure', 'A formula that is computed **when a tile asks**, over the rows that the filters of the moment leave: `SUM(line_amount)`. It stores nothing. The same measure gives one number for North and another for South.', 'Computed at query time, inside the filters.'],
          ['The semantic layer', 'The set of measures and relationships that everybody shares. Its job is that "revenue" means the same thing on every dashboard. Power BI keeps it in the semantic model, Tableau in a published data source, Looker in LookML.', 'One definition of each number.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm4-three', t: 1, src: 'docs', title: 'The same measures in three languages',
        say: 'Four Brewline measures, written for each tool and as the SQL that I ran. Press Next and read across. The syntax is from the documentation of each tool.',
        cols: ['Measure', 'Power BI (DAX)', 'Tableau', 'LookML', 'SQL that was run'],
        hl: 0,
        rows: [
          ['Revenue', '`SUM ( fact_order_lines[line_amount] )`', '`SUM([line_amount])`', '`type: sum` with `sql: ${line_amount} ;;`', '`sum(l.line_amount)`'],
          ['Customers', '`DISTINCTCOUNT ( fact_orders[customer_id] )`', '`COUNTD([customer_id])`', '`type: count_distinct`', '`count(DISTINCT o.customer_id)`'],
          ['Average order value', '`DIVIDE ( [Revenue], DISTINCTCOUNT ( fact_orders[order_id] ) )`', '`SUM([line_amount]) / COUNTD([order_id])`', '`type: number` with `sql: ${revenue} / NULLIF(${orders.order_count}, 0) ;;`', '`sum(l.line_amount) / count(DISTINCT o.order_id)`'],
          ['Share of all regions', '`DIVIDE ( [Revenue], CALCULATE ( [Revenue], REMOVEFILTERS ( dim_store[region] ) ) )`', '`SUM([line_amount]) / TOTAL(SUM([line_amount]))`', '`type: percent_of_total`', '`sum(x) / sum(sum(x)) OVER ()`']
        ],
        steps: [
          { upto: 2, say: 'A sum and a distinct count. The three tools say the same thing with different brackets.' },
          { upto: 3, say: 'A ratio. Every tool divides **one aggregate by another**. None of them averages a stored ratio, and you will see why in two screens.' },
          { upto: 4, say: 'A share. The denominator must ignore the region filter. DAX removes the filter, Tableau computes a total over the table, LookML has a type for it, and SQL uses a window.' }
        ]
      }),

      B.sql({
        id: 'm4-share', t: 1, src: 'rec', title: 'A measure that ignores a filter on purpose', file: 'share.sql', code: SHARE,
        result: { cols: SH.cols, rows: SH.rows, msg: SH.rows.length + ' rows' },
        steps: [
          { say: 'The share of each region in the revenue of March 2026. The numerator follows the region. The denominator must not.' },
          { say: 'The numerator: revenue inside the group, which is one region.', lines: G.span(SHARE, /sum\(l\.line_amount\)\s+AS revenue,/) },
          { say: 'The denominator: the same sum **over all groups**. `OVER ()` with nothing inside means "all rows of the result". This is what `REMOVEFILTERS` does in DAX.', lines: G.span(SHARE, /revenue_all_regions/) },
          { say: 'Run it. North has ' + n(north.revenue) + ' of ' + n(north.revenue_all_regions) + ', which is **' + north.share_pct + ' %**. The four shares add up to 100.', run: true }
        ],
        note: 'Recorded in DuckDB. When an analyst says "CALCULATE changes the filter context", this is the picture: one part of the formula is computed with a filter taken away.'
      }),

      B.widget({ id: 'm4-lab', kind: 'context', t: 1, src: 'rec', title: 'Lab: one measure, many filters' }),

      B.sql({
        id: 'm4-aov', t: 1, src: 'rec', title: 'A ratio: divide the sums, do not average the ratios', file: 'aov.sql', code: AOVQ,
        result: { cols: ['ratio_of_sums', 'average_of_ratios'], rows: [[AOV.ratio_of_sums, AOV.average_of_ratios]], msg: '1 row' },
        steps: [
          { say: 'Average order value for March 2026. There are two ways to get one number for the company, and they do not agree.' },
          { say: 'First, revenue and orders for each of the twelve stores.', lines: G.span(AOVQ, /^WITH per_store AS/, /GROUP BY o\.store_id/) },
          { say: '**Ratio of sums**: all revenue divided by all orders. This is the measure. It is what "average order value" means for the company.', lines: G.span(AOVQ, /ratio_of_sums/) },
          { say: '**Average of ratios**: the average of the twelve store averages. It treats a small store like a large one.', lines: G.span(AOVQ, /average_of_ratios/) },
          { say: 'Run it. **' + AOV.ratio_of_sums + '** against **' + AOV.average_of_ratios + '**. The difference comes from store s01, which has about three times the orders of the others and a lower average.', run: true }
        ],
        note: 'A table that stores a ratio for each store or each day invites this mistake. Store the numerator and the denominator, and let the measure divide.'
      }),

      B.rows({
        id: 'm4-aovstores', t: 2, src: 'rec', title: 'Why the two numbers differ',
        steps: [
          {
            say: 'The twelve stores in March. Store s01 has ' + n(AS.rows[0][2]) + ' orders with an average of ' + AS.rows[0][3] + '. The other stores have around 300 orders each.',
            tabs: [{ layer: 'RECORDED', name: 'Revenue, orders and average order value by store, March 2026', c: 'raw', cols: AS.cols, rows: AS.rows, trk: 0 }],
            notes: ['The average of the twelve averages gives s01 a weight of one twelfth. In the real total it carries far more than a twelfth of the orders.']
          }
        ]
      }),

      B.sql({
        id: 'm4-distinct', t: 1, src: 'rec', title: 'A number that does not add up', file: 'distinct.sql', code: DIST,
        result: { cols: D.cols, rows: D.rows, msg: D.rows.length + ' rows' },
        steps: [
          { say: 'Customers who ordered in each month of the first quarter of 2026.' },
          { say: 'A **distinct** count. A customer who ordered twice in January is counted once in January.', lines: G.span(DIST, /count\(DISTINCT customer_id\)/) },
          { say: 'Run it. The three months add up to ' + n(DC.sum_of_the_months) + '. The number of customers who ordered in the quarter is **' + n(DC.quarter) + '**. Somebody who ordered in all three months is in all three rows.', run: true }
        ],
        note: 'Revenue is **additive**: months add up to the quarter. A distinct count is not. An average and a ratio are not either. You cannot store these by month and sum them later, and that limits what an aggregate table can answer (mission 6).'
      }),

      B.code({
        id: 'm4-lookml', t: 1, src: 'rec', title: 'Measures as code: a LookML view', file: 'order_lines.view.lkml', lang: 'lookml', code: VIEW,
        steps: [
          { say: 'This is how Looker stores a model: a text file. A **view** describes one table. I did not run Looker, but a LookML parser read this file, and my own check compared it with the tables. Press Next.', lines: null },
          { say: 'The view points at a table in the warehouse.', lines: G.span(VIEW, /sql_table_name/) },
          { say: 'A **primary key**. The order lines have no single key column, so the view builds one from the order and the line number. Looker uses the primary key to keep sums right when a join fans out. If this key is not unique, the numbers are wrong and nothing warns you.', lines: G.span(VIEW, /dimension: line_key/, /^  \}/) },
          { say: 'A **dimension** is a column to group or filter by. `hidden: yes` keeps a raw column out of the menu that analysts see. `${TABLE}` stands for the table of this view.', lines: G.span(VIEW, /dimension: line_amount/, /^  \}/) },
          { say: 'A **measure**. `type: sum` over the dimension above. `${line_amount}` refers to the dimension by name, so the column is written in one place. The description is what an analyst reads in the menu.', lines: G.span(VIEW, /measure: revenue/, /^  \}/) }
        ],
        note: 'The parser lkml ' + G.meta('lkml') + ' read ' + LK.views + ' views with ' + LK.dimensions + ' dimensions, ' + LK.dimension_groups + ' dimension group and ' + LK.measures + ' measures. Every `${TABLE}` column exists in the Brewline tables. That check is mine. It is not Looker\'s validator.'
      }),

      B.code({
        id: 'm4-tmdl', t: 2, src: 'docs', title: 'Measures as code: a Power BI table in TMDL', file: 'fact_order_lines.tmdl', lang: 'tmdl', code: TMDL,
        steps: [
          { say: 'Power BI can save a model as a project of text files. The model is written in a format called **TMDL**. I wrote this file from the documentation. No Power BI tool opened it, so read it as an illustration of the format.', lines: null },
          { say: 'A measure with its DAX. `Revenue` is the sum that you have seen.', lines: G.span(TMDL, /measure Revenue =/, /formatString/) },
          { say: '`CALCULATE` computes a measure with a changed filter. `REMOVEFILTERS` takes the region filter away. This is the denominator of the share.', lines: G.span(TMDL, /measure 'Revenue all regions'/, /formatString/) },
          { say: '`DIVIDE` is a division that returns blank when the denominator is zero.', lines: G.span(TMDL, /measure 'Share of revenue'/, /formatString/) },
          { say: 'A column. `isHidden` and `summarizeBy: none` stop a viewer from dragging a raw amount into a chart and summing it without the measure.', lines: G.span(TMDL, /column line_amount/, /sourceColumn: line_amount/) },
          { say: 'The partition says where the rows come from. The filter on `RangeStart` and `RangeEnd` is how Power BI cuts a table into partitions for incremental refresh. Mission 5 uses it.', lines: G.span(TMDL, /partition fact_order_lines/, /Kept$/) }
        ],
        note: 'From documentation. The value for you is the diff: when a measure changes, a pull request shows one changed line of DAX.'
      }),

      B.sql({
        id: 'm4-cohort', t: 2, src: 'rec', title: 'A value fixed at another level', file: 'cohort.sql', code: COH,
        result: { cols: CO.cols, rows: CO.rows, msg: CO.rows.length + ' rows' },
        steps: [
          { say: 'Marketing asks: in which quarter did each customer place their first order? The chart shows quarters, but the value is a fact about the **customer**.' },
          { say: 'The first order date is computed for each customer, whatever the chart groups by.', lines: G.span(COH, /^WITH first_order AS/, /^\)/) },
          { say: 'Then the customers are counted by that quarter.', lines: G.span(COH, /^SELECT CAST/, /^ORDER BY/) },
          { say: 'Run it. ' + n(CO.rows[0][1]) + ' customers first ordered in ' + CO.rows[0][0] + '. The five rows add up to ' + n(COC.customers_who_ordered) + ', because every customer is in exactly one of them.', run: true }
        ],
        note: 'Tableau writes this as a level of detail expression: `{ FIXED [customer_id] : MIN([order_date]) }`. In DAX it is a calculated column or `CALCULATE` with `ALLEXCEPT`. Often the simplest answer is a column `first_order_date` on a customer dimension in the warehouse.'
      }),

      B.sql({
        id: 'm4-ytd', t: 2, src: 'rec', title: 'A running total', file: 'ytd.sql', code: YTD,
        result: { cols: Y.cols, rows: Y.rows, msg: Y.rows.length + ' rows' },
        steps: [
          { say: 'Revenue by month and the total for the year so far.' },
          { say: 'A window in month order. Each row adds itself to everything before it.', lines: G.span(YTD, /sum\(revenue\) OVER/) },
          { say: 'Run it. March brings the year to ' + n(Y.rows[2][2]) + '.', run: true }
        ],
        note: 'DAX has `TOTALYTD ( [Revenue], dim_date[date] )` and Tableau has `RUNNING_SUM(SUM([line_amount]))`. Time measures in DAX need a date dimension with one row for every day and no gaps. The Brewline `dim_date` has ' + G.counts('perf.agg').days + ' rows for that reason.'
      }),

      B.cmp({
        id: 'm4-where', t: 2, src: 'docs', title: 'Warehouse or semantic layer: where does a rule live?',
        say: 'Every business rule has to live somewhere. Press Next for a way to decide.',
        cols: ['The rule', 'Put it in', 'Why'],
        hl: 1,
        rows: [
          ['A value for each row: tax, a cleaned status, the first order date of a customer', 'The warehouse', 'Every tool and every export gets the same value, and it can be tested in the pipeline.'],
          ['A number that adds up: revenue, units', 'The warehouse as a column, the tool as a simple sum', 'The measure is one line and cannot go wrong.'],
          ['A ratio, a distinct count, a share, a year to date', 'The semantic layer', 'It must be computed inside the filters of the moment. A stored value would be wrong for most cells.'],
          ['Which rows count: "revenue excludes refunds"', 'The warehouse, or one shared measure', 'If each report filters by hand, the reports disagree.'],
          ['Formatting, names for people, folders', 'The semantic layer', 'It is about how people read the number.']
        ],
        steps: [
          { upto: 2, say: 'Row-level values and additive numbers go as far upstream as they can. That is your side.' },
          { upto: 5, say: 'Anything that depends on the filter has to be a measure. Your job there is to supply the numerator and the denominator at the right grain.' }
        ]
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A table has one row for each store and day with a column `average_order_value`. A tile shows the monthly value for a region as the average of that column. What is wrong?',
        opts: [
          { t: 'Nothing. An average of averages is the average', fb: 'Only when every store and day has the same number of orders.' },
          { t: 'It weights a quiet day like a busy day. The tile needs revenue and orders, divided after summing', fb: '' },
          { t: 'The tile should use the maximum', fb: 'The maximum answers another question.' },
          { t: 'The table is too small', fb: 'Size is not the problem. The stored ratio is.' }
        ],
        ok: 1, why: 'In the recording the ratio of sums is ' + AOV.ratio_of_sums + ' and the average of the twelve store ratios is ' + AOV.average_of_ratios + '. Store the parts and divide in the measure.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'Which of these numbers can you store by day and add up to get the month?',
        opts: [
          { t: 'Customers who ordered', fb: 'A customer who ordered on two days would be counted twice.' },
          { t: 'Units sold', fb: '' },
          { t: 'Average order value', fb: 'A ratio does not add up.' },
          { t: 'Share of revenue', fb: 'Shares of different totals cannot be added.' }
        ],
        ok: 1, why: 'Units and revenue are additive. Distinct counts, averages, ratios and shares are not. In the recording the three monthly customer counts add up to ' + n(DC.sum_of_the_months) + ' while the quarter has ' + n(DC.quarter) + '.'
      }),

      B.quiz({
        id: 'm4-q3', t: 2,
        q: 'What is the difference between a calculated column and a measure?',
        opts: [
          { t: 'They are the same. The name depends on the tool', fb: 'They are computed at different moments.' },
          { t: 'A calculated column is computed for every row when the data loads. A measure is computed when a tile asks, inside the filters', fb: '' },
          { t: 'A measure is stored and a column is not', fb: 'It is the other way round.' },
          { t: 'A calculated column can only hold text', fb: 'It can hold any type.' }
        ],
        ok: 1, why: 'A calculated column costs space and never reacts to a click. A measure stores nothing and reacts to every click. A row-level value usually belongs in the warehouse, so that every tool has it.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This query gives a monthly average order value by region. The finance number is different. Click the line that causes it.',
        file: 'aov_by_region.sql', lang: 'sql', code: BUG, bad: [G.at(BUG, /avg\(st\.average_order_value\)/)],
        hint: 'What does one row of `store_daily_stats` hold, and how many orders stand behind it?',
        why: 'The query averages a ratio that was stored for each store and day. A day with 5 orders weighs as much as a day with 50. The measure must sum revenue and orders first and divide once.',
        fix: 'SELECT s.region,\n       sum(st.revenue) / sum(st.orders) AS average_order_value\nFROM store_daily_stats st          -- one row for each store and day\nJOIN dim_store s ON s.store_id = st.store_id\nWHERE st.order_date >= DATE \'2026-03-01\'\nGROUP BY s.region;',
        cheer: 'Whenever you see `avg` over a column that is itself an average, stop.'
      }),

      B.qa({
        id: 'qa-semantic', t: 1, tag: 'BI', secs: 75,
        q: 'What is a semantic layer, and why do companies want one?',
        pts: ['One shared definition of tables, joins and measures', 'A measure is a formula computed inside the filters of each query', 'Without it, each report defines revenue again and the numbers disagree', 'Power BI semantic model, Tableau published data source, LookML'],
        short: 'A semantic layer is the place where a company writes down, once, how its tables join and what its numbers mean. Revenue is defined as one measure, and every report uses that measure. A measure is a formula and not a stored value: it is computed again for every tile, inside whatever filters apply. Without a shared layer each report writes its own version of revenue, one includes refunds and one does not, and the dashboards disagree. In Power BI the layer is the semantic model, in Tableau a published data source, and in Looker the LookML project.',
        fu: [['What should not be in it?', 'Row-level cleaning and values that every tool needs. Those belong in the warehouse.'], ['How do you keep it honest?', 'Store it as files, review changes, and reconcile a few totals against the warehouse after each load.']],
        trap: 'Describing it as "a database view". A view returns rows. A measure reacts to filters.',
        real: 'Name one measure your team argued about, and how it was settled.'
      }),

      B.qa({
        id: 'qa-additive', t: 1, tag: 'Modeling', secs: 60,
        q: 'What are additive and non-additive measures? Give examples.',
        pts: ['Additive: sums correctly over every dimension (revenue, units)', 'Non-additive: distinct counts, ratios, averages, shares', 'Semi-additive: adds over some dimensions and not over time (a balance, a stock level)', 'Store the parts, compute the rest in the measure'],
        short: 'An additive measure can be summed over any dimension: revenue by day adds up to revenue by month, and revenue by store adds up to revenue by region. A non-additive measure cannot. A distinct count of customers is the usual example: somebody who ordered in two months is in both monthly counts, so the months add up to more than the quarter. Ratios, averages and shares behave the same way. There is a third kind, semi-additive, such as a stock level: you can add it over stores and you must not add it over days. So I store the additive parts, such as revenue and order counts, and let the tool compute the rest at query time.',
        fu: [['How does that affect aggregate tables?', 'An aggregate table can answer only additive measures, or it must be at exactly the grain of the question.'], ['How would you serve a distinct count fast?', 'With an approximate distinct count that can be merged, if the warehouse has one, or with an aggregate at the exact grain.']],
        trap: 'Saying only "you cannot sum averages". Name distinct counts, and say what to store instead.',
        real: 'Mention a semi-additive number from your own work, if you have one.'
      }),

      B.qa({
        id: 'qa-context', t: 2, tag: 'Power BI', secs: 75,
        q: 'In plain words, what is filter context in DAX, and what does CALCULATE do?',
        pts: ['Filter context: the filters around a cell (slicers, rows, columns)', 'A measure is evaluated inside that context', 'CALCULATE evaluates an expression with the context changed', 'Typical use: remove a filter for a total, or add one for a segment'],
        short: 'Every cell of a report has a set of filters around it: the slicers on the page, and the row and column it sits in. That set is the filter context, and a measure is evaluated inside it. That is why one measure shows one number for North and another for South. CALCULATE evaluates an expression with that context changed: it can remove a filter, add one, or replace one. The share of revenue is the standard example. The numerator is revenue in the current context, and the denominator is revenue with the region filter removed. In SQL I would write the denominator as a window over all rows.',
        fu: [['What is row context?', 'The current row while a calculated column or an iterator such as SUMX is evaluated. It is not a filter.'], ['Why does a data engineer need this?', 'To supply tables in which the filters can travel: unique keys on dimensions and one grain for each fact.']],
        trap: 'Reciting function names. Explain the cell and its filters.',
        real: 'If you have never written DAX, say so, and explain the idea through SQL.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Measure Writer', color: '#FDE68A',
        pts: [
          'A **measure** is a formula that is computed when a tile asks, inside the filters of that cell.',
          'A sum, a distinct count, a ratio and a share look the same in **DAX, Tableau and LookML** apart from the brackets.',
          'For a ratio, **divide the sums**: ' + AOV.ratio_of_sums + ' and not ' + AOV.average_of_ratios + '.',
          'A **distinct count does not add up**: ' + n(DC.sum_of_the_months) + ' over three months, ' + n(DC.quarter) + ' in the quarter.',
          'Row-level values and additive columns belong in the **warehouse**. Anything that depends on the filter belongs in the **semantic layer**.'
        ],
        lines: [
          'I can read a measure in three tools.',
          'I store parts, not ratios.',
          'I know which numbers add up.'
        ]
      })
    ]
  });
})();
