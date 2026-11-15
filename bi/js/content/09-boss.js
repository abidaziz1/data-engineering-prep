/* Mission 9: boss round. Two drills that mix the missions, a design decision, a coding round, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var F = G.counts('model.fanout'), AOV = G.counts('measures.aov'), DC = G.counts('measures.distinct'), R = G.counts('refresh.policy'), HA = G.counts('hyper.append'), A = G.counts('perf.agg'), CC = G.counts('perf.columns'), S = G.counts('rls.summary'), SH = G.table('measures.share'), SZ = G.table('hyper.sizes'), PC = G.counts('perf.page'), CH = G.counts('tableau.change');
  var n = G.n;
  var QA = [['qa-parts', 1], ['qa-three', 2], ['qa-grain', 1], ['qa-fanout', 1], ['qa-star', 2], ['qa-modes', 1], ['qa-extract', 2], ['qa-semantic', 1], ['qa-additive', 1], ['qa-context', 3],
    ['qa-incr', 1], ['qa-fresh', 1], ['qa-late', 2], ['qa-slow', 1], ['qa-agg', 2], ['qa-rls', 1], ['qa-svc', 2], ['qa-git', 1], ['qa-lookml', 3]];

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a design decision, a coding round, a mock interview and a one-page review', minutes: 30,
    focus: ['sf', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'ci'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills that mix what you have learned, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm9-inc1', t: 1, src: 'docs', title: 'Drill: two dashboards, two revenue numbers', time: '11:30',
        alert: '**Finance shows a revenue of the quarter on a Tableau dashboard. Sales shows a higher number for the same quarter on a Power BI report.** Both read tables that you load.',
        clues: ['The Power BI model joins orders, order lines and the promotion bridge, and the report has a table by promotion code with a total row', 'The Tableau data source reads the aggregate table by day, store and category', 'Both were refreshed after last night\'s load, and the load checks passed'],
        opts: [
          { t: 'Check the grain behind each number: the path through the promotion bridge repeats lines, so that total counts some orders twice', fb: '' },
          { t: 'Refresh both dashboards again', fb: 'Both are fresh. A refresh copies the same rows again.' },
          { t: 'Tell sales that finance is right, because finance owns revenue', fb: 'You do not know that yet. Find the cause before you pick a side.' },
          { t: 'Rebuild the aggregate table', fb: 'The aggregate matched the fact table in last night\'s check.' }
        ],
        best: 0,
        why: 'Two fresh dashboards that disagree are a model question. An order with two promotion codes appears under both codes, so a total over the codes is too high. In the recording the five codes summed to ' + n(G.counts('model.m2m').revenue_summed_over_codes) + ' while the orders behind them brought in ' + n(G.counts('model.m2m').revenue_of_orders_with_a_code) + '.',
        checks: [
          ['Ratio', 'Divide the higher number by the lower one. A ratio near a known average, such as codes for each order, names the join.'],
          ['Path', 'Follow the measure from its table to the tile. Any many-to-many step on the way repeats rows.'],
          ['Fix', 'Compute the total at the grain of the order, and show the split by code as a separate, labelled view.'],
          ['Agree', 'One shared measure for revenue, in one model that both teams use.']
        ],
        tell: 'The two numbers differed because the Power BI report totalled revenue over promotion codes, and an order with two codes was counted under both. I showed the ratio, traced the many-to-many path through the bridge table, moved the total to a measure at the grain of the order, and proposed one shared revenue measure for both teams.',
        prevent: ['A **reconciliation** of each published model against the warehouse total after the load', '**One certified model** for revenue', 'A note on every bridge table: **rows are right, sums over them are not**']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, src: 'docs', title: 'Drill: last quarter changed after the books were closed', time: '16:05',
        alert: '**Finance closed the quarter on a number from the dashboard. A week later the warehouse shows a slightly lower number for the same quarter, and the dashboard still shows the old one.**',
        clues: ['Refunds can be booked up to 90 days after an order', 'The imported model uses incremental refresh and reloads the newest two months', 'Row counts of the model and the warehouse are equal'],
        opts: [
          { t: 'Compare sums by month to find the partitions that differ, reload those, and widen the refresh window to cover the 90 days', fb: '' },
          { t: 'Trust the row counts: the model is complete', fb: 'A changed row is one row before and one after. Counts cannot see it.' },
          { t: 'Switch off incremental refresh for good', fb: 'It repairs the number and gives up the saving. Size the window first.' },
          { t: 'Tell finance that refunds are not part of revenue', fb: 'That is a business rule, and it is not yours to change in an incident.' }
        ],
        best: 0,
        why: 'This is the late change from mission 5. In the recording a window of two months reloaded ' + R.percent_of_full + ' % of the rows and left the model ' + R.difference_after_incremental.toFixed(2) + ' too high, because the refund was on an order from ' + R.late_order_month + '. Reloading the changed months brought the difference to ' + R.difference_after_refreshing_changed_months + '.',
        checks: [
          ['Find', 'Sum completed revenue by month in the model and in the warehouse. The months that differ are the stale partitions.'],
          ['Repair', 'Refresh those partitions by name, or run one full refresh.'],
          ['Resize', 'Set the window to the business rule: 90 days means at least four months.'],
          ['Prove', 'Add a nightly check that compares a sum, and tell finance from which date the dashboard is reliable.']
        ],
        tell: 'The dashboard kept an old number because refunds arrive up to 90 days late and the refresh only reloaded two months. Row counts matched, so nobody noticed. I compared sums by month, reloaded the two stale partitions, widened the window to four months and added a nightly comparison of sums.',
        prevent: ['A refresh window that **matches the business rule**', 'A **sum reconciliation** after every refresh', 'An **updated_at** column on every fact that can change']
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: a new dashboard for 500 store staff',
        scenario: 'Brewline wants a daily sales page for 500 store staff, opened mostly between 07:30 and 08:30. Data is loaded once a night. Each person may see only their own store. The page has six tiles. Five of them are sums by store and category, and one lists the ten best products of the store.',
        opts: [
          { t: 'A live model on the fact table, with the rule enforced in the warehouse', d: 'Always current, and the rule sits at the data.', lose: 'Five hundred people in one hour, six tiles each, all on the fact table. The data changes once a night, so the warehouse pays for freshness that does not exist.' },
          { t: 'A copy refreshed by the pipeline after the load, read from two aggregate tables, with row-level security in the tool from one entitlement table', d: 'Viewers are served from memory. The aggregates keep the copy small. One table says who sees which store.' },
          { t: 'One copy for each store, built by a loop in the pipeline', d: 'No row rule needed.', lose: 'Five hundred staff over twelve stores is twelve models to deploy and keep the same. One model with a row rule does it once.' }
        ],
        pick: 1,
        why: 'Each part of the answer comes from one mission. The source changes nightly, so a copy is as fresh as live (3). The pipeline triggers the refresh (5). Sums by store and category fit an aggregate, and the product list needs a second one (6). A row rule on the store dimension from an entitlement table handles the 500 people (7).',
        when: 'Go live if the data starts to change during the day, or if the rule must be enforced by the warehouse for an audit.'
      }),

      B.challenge({
        id: 'm9-ch', t: 1, title: 'Coding round: share of revenue by region', file: 'share_by_region.sql', lang: 'sql',
        q: 'Write a query that returns, for **March 2026**, the revenue of each region and its **share of the total revenue in percent**, with one decimal, ordered by region. Revenue is the sum of `line_amount`. The region is on the store, and the store is on the order.',
        data: [
          { name: 'fact_order_lines (four of ' + n(F.lines) + ' rows)', cols: ['order_id', 'line_no', 'line_amount'], rows: G.table('model.lab_lines').rows.slice(0, 4), types: ['INTEGER', 'INTEGER', 'DOUBLE'] },
          { name: 'fact_orders (four of ' + n(F.orders) + ' rows)', cols: ['order_id', 'order_date', 'store_id'], rows: G.table('model.orders_sample').rows.map(function (r) { return [r[0], r[1], r[2]]; }), types: ['INTEGER', 'DATE', 'VARCHAR'] },
          { name: 'dim_store (four of 12 rows)', cols: ['store_id', 'region'], rows: G.table('model.stores').rows.filter(function (r, k) { return k % 3 === 0; }).map(function (r) { return [r[0], r[2]]; }), types: ['VARCHAR', 'VARCHAR'] }
        ],
        starter: '-- revenue and share of total by region, March 2026\nSELECT s.region, ...',
        hints: ['Join the lines to their order and the order to its store. Each join goes to exactly one row, so nothing is repeated.', 'The total is the sum over all regions. A window with an empty `OVER ()` gives it on every row.', 'You can put an aggregate inside a window: `sum(sum(x)) OVER ()`.'],
        sol: G.file('sql/share.sql'),
        res: { cols: SH.cols, rows: SH.rows },
        expl: ['Both joins go from many rows to one row, so the revenue is not inflated. That is the first thing an interviewer checks.', 'The inner `sum` is the revenue of the region. The outer `sum(...) OVER ()` adds those up over all regions.', 'The four shares are ' + SH.rows.map(function (r) { return r[3]; }).join(', ') + '. They add up to 100.'],
        cx: 'One pass over the lines of the month, two hash joins to small tables, and a window over four rows. The cost is the scan of the fact, which a date filter on a partitioned table keeps small.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm9-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Items marked (docs) come from the documentation of the tools and were not run. Every number comes from the recording. Take a screenshot or print the page.',
        sections: [
          { h: 'The parts', items: ['Connection, model, measures, reports. Power BI: Power Query, semantic model, DAX. Tableau: data source, calculated fields. Looker: views, explores, LookML (docs)', 'A tile is a query. Six tiles and one click are twelve queries on a live connection'] },
          { h: 'The model', items: ['Grain = what one row means. A number belongs in the table whose grain it shares', 'A join to a finer table repeats rows: shipping ' + n(F.shipping_right) + ' became ' + n(F.shipping_wrong) + ', ' + F.times_too_high + ' times too high', 'Bring both sides to the same grain before joining two facts', 'A relationship is a promise: unique key on the one side, no orphans. Test it'] },
          { h: 'Where the query runs', items: ['Copy (import, extract): answers from memory, as old as the last refresh', 'Live (DirectQuery, live connection, Looker): as fresh as the tables, runs on the warehouse', 'An extract is a columnar file: ' + n(SZ.rows[0][3]) + ' bytes of CSV, ' + n(SZ.rows[2][3]) + ' bytes as .hyper'] },
          { h: 'Measures', items: ['A measure is computed at query time, inside the filters of the cell', 'Ratio: divide the sums. ' + AOV.ratio_of_sums + ', not ' + AOV.average_of_ratios, 'A distinct count does not add up: ' + n(DC.sum_of_the_months) + ' over three months, ' + n(DC.quarter) + ' in the quarter', 'Row values and additive columns in the warehouse. Filter-dependent numbers in the semantic layer'] },
          { h: 'Refresh', items: ['Trigger from the pipeline: load, checks, refresh, wait', 'Incremental refresh reloaded ' + n(R.rows_incremental_refresh) + ' of ' + n(R.rows_full_refresh) + ' rows and missed a refund from ' + R.late_order_month + ': ' + R.difference_after_incremental.toFixed(2) + ' too high', 'Same row count, different sum: order ' + HA.late_order_id + ' stayed "' + HA.late_order_status_in_extract + '" in the appended extract', 'Power BI: RangeStart and RangeEnd. Looker: datagroups. Tableau: full or incremental extract refresh (docs)'] },
          { h: 'Speed', items: ['Aggregate at the grain of the tiles: ' + n(A.fact_rows) + ' lines became ' + n(A.agg_rows) + ' rows', 'It answers a tile when the columns are in its grain and the measure adds up', 'Summed daily customers: ' + n(A.customers_march_summed_from_agg) + '. True: ' + n(A.customers_march_true), 'High-cardinality columns cost most: ' + CC.top_two.join(' and ') + ' took ' + CC.top_two_share_pct + ' % of the file'] },
          { h: 'Security and files', items: ['Row-level security = a filter by viewer on a dimension, from an entitlement table. Unknown viewer: ' + S.unknown_user_lines + ' rows', 'A service account means that the warehouse sees one login, and the tool enforces the rule', 'Edit rights on a restricted model usually lift the row filter (docs)', 'Model as text: TMDL, Tableau XML, LookML. CI: parse, names, keys', 'Dev to prod changes only the connection: ' + CH.attributes_changed.length + ' attributes in the recording'] }
        ]
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'BI Partner', color: '#DDD6FE',
        pts: [
          'You can read a dashboard as **queries on your tables**, in three tools.',
          'You can find a **doubled number** from its ratio and fix it in the tables.',
          'You can choose between a **copy and a live query**, and say who pays.',
          'You can **trigger and size a refresh**, and prove it with a sum.',
          'You can make a dashboard **fast and safe** with an aggregate and an entitlement table, and ship the model as **files**.'
        ],
        lines: [
          'I build tables that a BI model cannot break.',
          'I own freshness, cost and access.',
          'I can talk to the people who build the charts.'
        ]
      })
    ])
  });
})();
