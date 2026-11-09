/* Mission 7: finding out why a query is slow, and fixing the cause. */
(function () {
  var B = LAB.b;

  var CLUSTER = [
    '-- How well is the table clustered on the column we filter by?',
    "SELECT SYSTEM$CLUSTERING_INFORMATION('core.orders', '(order_date)');",
    '',
    '-- Add a clustering key. Snowflake reclusters in the background.',
    'ALTER TABLE core.orders CLUSTER BY (order_date);',
    '',
    '-- Expression keys work. Use a date, not a raw timestamp,',
    '-- so the number of distinct values stays low.',
    'ALTER TABLE core.events CLUSTER BY (TO_DATE(event_ts), event_type);',
    '',
    '-- Check what automatic clustering cost in the last 7 days.',
    'SELECT * FROM TABLE(INFORMATION_SCHEMA.AUTOMATIC_CLUSTERING_HISTORY(',
    "       DATE_RANGE_START => DATEADD('day', -7, CURRENT_DATE()),",
    "       TABLE_NAME => 'BREWLINE.CORE.ORDERS'));"
  ].join('\n');

  var HISTORY = [
    '-- The 10 slowest queries in the last 7 days, with the signs that explain why',
    'SELECT query_id,',
    '       warehouse_name,',
    '       total_elapsed_time / 1000                        AS seconds,',
    '       partitions_scanned,',
    '       partitions_total,',
    '       bytes_spilled_to_remote_storage / POWER(1024, 3) AS gb_spilled_remote,',
    '       queued_overload_time / 1000                      AS seconds_queued',
    'FROM snowflake.account_usage.query_history',
    "WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())",
    '  AND warehouse_name IS NOT NULL',
    'ORDER BY total_elapsed_time DESC',
    'LIMIT 10;'
  ].join('\n');

  var BUGPRUNE = [
    'SELECT c.country, SUM(o.total_usd) AS revenue_usd',
    'FROM core.orders o',
    'JOIN core.customers c ON c.customer_id = o.customer_id',
    "WHERE TO_CHAR(o.order_ts, 'YYYY-MM') = '2026-03'",
    'GROUP BY c.country;'
  ].join('\n');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Why is it slow?', short: 'Performance', blurb: 'Pruning, the query profile, clustering, and fixing causes', minutes: 28,
    focus: ['mon'],
    goals: [
      'Explain **partition pruning** and what stops it from working.',
      'Read a **Query Profile** and spot the three usual problems: no pruning, a join explosion, and spilling.',
      'Choose between **clustering, search optimization, materialized views and query acceleration**.',
      'Tell a **tuning story** with evidence: what you measured, what you changed, what improved.'
    ],
    say: 'Mission 7 is performance. The senior habit is simple: diagnose with evidence before you change anything. A bigger warehouse is the last lever, not the first.',
    scenes: [
      B.widget({ id: 'm7-prune', t: 1, title: 'Lab: micro-partitions and pruning', kind: 'prune' }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'This query scans every partition of a 10 TB table, even though it needs only one month. Click the line that stops pruning.',
        file: 'revenue_march.sql', lang: 'sql', code: BUGPRUNE, bad: 4,
        hint: 'Snowflake prunes by comparing the filter with the stored minimum and maximum of a column. What does this filter compare?',
        why: 'A **function wrapped around the column** (`TO_CHAR(order_ts, ...)`) means Snowflake cannot compare the filter with the stored min and max, so it reads every partition. Compare the raw column with a range instead.',
        fix: "SELECT c.country, SUM(o.total_usd) AS revenue_usd\nFROM core.orders o\nJOIN core.customers c ON c.customer_id = o.customer_id\nWHERE o.order_ts >= '2026-03-01'\n  AND o.order_ts <  '2026-04-01'\nGROUP BY c.country;"
      }),

      B.flow({
        id: 'm7-profile', t: 1, title: 'Reading a Query Profile', g: 'profile', legend: false,
        steps: [
          { say: 'When a query is slow, open its Query Profile before you change any setting. Each box is an operator. Snowflake shows rows, time and warnings for each one. This query is slow. Press Next to diagnose it.', cap: 'Read it left to right: **scan, filter, join, aggregate, result.** Look for the box with the largest share of time.' },
          { say: 'Symptom one. The scan reads 11 of 12 partitions, although the query needs one month. Pruning failed.', focus: ['p1'], tags: ['tg1'], cap: '**Cause:** the filter wraps the column in a function, or the table is not ordered by the filter column. **Fix:** compare the raw column with a range, or cluster by it.' },
          { say: 'Symptom two. 41 million rows go into the join and 3.2 billion come out. That is a row explosion. The customer table has several versions per customer, and the join ignored the validity dates.', focus: ['p2', 'p3'], tags: ['tg2'], cap: '**Cause:** joining a history table on the business key alone. **Fix:** join on the key and the valid-from and valid-to range, or deduplicate first.' },
          { say: 'Symptom three. The aggregate spills 38 gigabytes to remote storage, because it is processing billions of rows. Fix the join and the spill disappears.', focus: ['p4'], tags: ['tg3'], cap: 'A bigger warehouse would only **hide** the spill and raise the bill.' },
          { say: 'Fix the causes in order: pruning, then the join, then the spill. Only then ask whether a bigger warehouse is justified.', cap: 'Say it like this: "I diagnose with the profile first. Size is the last lever, not the first."' }
        ]
      }),

      B.talk({
        id: 'm7-diagnose', t: 2, title: 'Symptom, cause, fix',
        say: 'Five symptoms you will see in a profile or in query history, with the cause and the fix for each. Press Next.',
        items: [
          ['Scans almost every partition', '**Cause:** the filter does not match how the data is ordered, or a function wraps the column. **Fix:** filter on the raw column with a range, cluster a big table by the filter column, or change how data is loaded.', 'Partitions scanned close to partitions total means pruning failed.'],
          ['Rows out are far larger than rows in at a join', '**Cause:** duplicate keys on one side, such as several versions of a customer. **Fix:** join on the key plus the validity range, or deduplicate first, and check row counts before and after.', 'A join that multiplies rows is a bug, not a performance setting.'],
          ['Bytes spilled to local or remote storage', '**Cause:** an operator ran out of memory. **Fix:** process less data by filtering earlier and selecting fewer columns. A bigger warehouse for that one job is a last resort.', 'Spilling to remote storage is far slower than memory.'],
          ['High queued time', '**Cause:** more concurrent queries than the warehouse can run. **Fix:** scale out with a multi-cluster warehouse, or move heavy jobs to their own warehouse.', 'Queueing is a concurrency problem, not a slow-query problem.'],
          ['One step takes most of the time, on skewed keys', '**Cause:** one key holds most of the rows, so one server does most of the work. **Fix:** filter or pre-aggregate the heavy key, and review the join order.', 'Skew makes a big warehouse behave like a small one.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm7-cluster', t: 2, title: 'Clustering keys in the worksheet', file: 'worksheet: clustering.sql', code: CLUSTER,
        ctx: { role: 'SYSADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'Here are the commands to check and set clustering. Press Next to go through them.', lines: null },
          { say: 'Always measure first. This function reports how well the table is clustered on a column. An average depth near 1 means well clustered. Press Run. A depth of 21 means the data is scattered.', lines: [1, 2], run: true },
          { say: 'Add the key. Snowflake reclusters in the background. That background work costs credits, so it is a trade.', lines: [4, 5] },
          { say: 'Expression keys work. Use a date rather than a raw timestamp. With a timestamp nearly every value is unique, so the key cannot group rows.', lines: [7, 9] },
          { say: 'And measure the cost. If reclustering costs more than the queries save, remove the key.', lines: [11, 14] }
        ],
        result: { cols: ['cluster_by_keys', 'total_partition_count', 'average_overlaps', 'average_depth'], rows: [['LINEAR(order_date)', '2481', '38.2', '21.4']], msg: '1 row (JSON fields shown as columns)' },
        note: 'Cluster **large** tables (many TB, thousands of partitions) on the column most queries filter by. On small tables clustering costs credits and gains nothing.'
      }),

      B.cmp({
        id: 'm7-tools', t: 2, title: 'Four ways to read less data',
        say: 'Four features help Snowflake read less data or answer faster. Interviewers like to ask which one you would pick for a given problem. Press Next to see each row.',
        cols: ['', 'Clustering key', 'Search optimization', 'Materialized view', 'Query acceleration'],
        rows: [
          ['Helps with', 'Range filters on a large table, by skipping partitions', 'Point lookups and very selective filters on a huge table', 'The same aggregation or filter run again and again on one table', 'A few very large scans on a warehouse that otherwise runs small queries'],
          ['Does not help', 'Small tables, or filters on many different columns', 'Full scans and big aggregations', 'Joins (a materialized view reads one table) and one-off queries', 'Queries that are already short'],
          ['What it costs', 'Background reclustering credits', 'Extra storage and maintenance compute', 'Storage and background maintenance compute', 'Serverless credits when it kicks in']
        ],
        steps: [
          { upto: 1, say: 'What each one is for. They solve different access patterns, so the first question is always which pattern is slow.' },
          { upto: 2, say: 'What each one does not help. A common wrong answer is to cluster by a unique ID or to expect a materialized view to speed up a join.' },
          { upto: 3, say: 'And what each costs. Say the cost every time you recommend one.' }
        ],
        pick: 'Diagnose the access pattern first. **Date range scans** on a huge table: clustering. **Lookups of single rows**: search optimization. **A repeated aggregation**: a materialized view, or a dynamic table. **A few outlier scans**: query acceleration. All of these need Enterprise edition or higher.'
      }),

      B.sql({
        id: 'm7-history', t: 2, title: 'Find the slow queries with evidence', file: 'worksheet: slow_queries.sql', code: HISTORY,
        ctx: { role: 'SYSADMIN', wh: 'WH_BI', db: 'SNOWFLAKE.ACCOUNT_USAGE' },
        steps: [
          { say: 'Tuning starts with a list of the worst offenders. Query history already holds the signs that explain why. Press Next.', lines: null },
          { say: 'Time first: elapsed time in seconds, per warehouse.', lines: [2, 4] },
          { say: 'Then the three signs. Partitions scanned against partitions total shows pruning. Bytes spilled shows memory pressure. Queued time shows concurrency trouble.', lines: [5, 8] },
          { say: 'The account usage view keeps a year of history. Filter by time and sort by elapsed time. Press Run and read the signs next to each query.', lines: [9, 13], run: true }
        ],
        result: { cols: ['QUERY_ID', 'WAREHOUSE_NAME', 'SECONDS', 'PARTITIONS_SCANNED', 'PARTITIONS_TOTAL', 'GB_SPILLED_REMOTE', 'SECONDS_QUEUED'], rows: [['01b2...e91', 'WH_BI', '312.4', '2301', '2481', '38.0', '0'], ['01b2...f07', 'WH_TRANSFORM', '188.9', '412', '2481', '0', '0'], ['01b2...a15', 'WH_BI', '97.2', '54', '2481', '0', '41.3']], msg: '3 of 10 rows shown, illustrative values' },
        note: 'Read the three rows as three different diagnoses. The first scans 2301 of 2481 partitions and spills 38 GB. The second reads little but runs long on its own. The third is fast to run but waited 41 seconds in a queue. `ACCOUNT_USAGE` views can lag by up to about 45 minutes.'
      }),

      B.talk({
        id: 'm7-habits', t: 2, title: 'Habits that make queries cheaper',
        say: 'Five habits that prevent most slow queries. They are also what a good code review looks for. Press Next.',
        items: [
          ['Filter early, on raw columns', 'Compare the column as stored. A function around the column, such as `TO_CHAR(order_ts, ...)`, can stop pruning. Use a range on the raw column.', 'Do not wrap filter columns in functions.'],
          ['Select only the columns you need', 'Snowflake is columnar, so reading fewer columns reads less data. `SELECT *` on a wide table pays for columns you never use, and it breaks when someone adds a column.', 'Name your columns.'],
          ['Check join keys and row counts', 'Before a join, confirm the key is unique on at least one side. Duplicate keys multiply rows. Compare row counts before and after on a sample.', 'A join should not change the row count by accident.'],
          ['Avoid big sorts and DISTINCT on huge sets', '`ORDER BY` on billions of rows and `DISTINCT` force large sorts and spills. Aggregate or filter first, and use `QUALIFY` for top-N instead of sorting everything.', 'Reduce the data, then sort it.'],
          ['Use the right data types', 'Dates stored as text cannot prune and compare slowly. Store DATE, TIMESTAMP and NUMBER as themselves.', 'Types are a performance feature.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A dashboard query that used to take 8 seconds now takes 5 minutes. What do you do first?',
        opts: [
          { t: 'Open the Query Profile and check partitions scanned, spilling and join row counts', fb: '' },
          { t: 'Double the warehouse size', fb: 'That costs more and may not help. You do not know the cause yet.' },
          { t: 'Add a clustering key to every table', fb: 'Clustering costs credits and only helps when scanning is the problem. Measure first.' },
          { t: 'Rewrite the dashboard in Python', fb: 'That adds work without a diagnosis.' }
        ],
        ok: 0, why: 'Diagnose with evidence. The profile shows whether the problem is **pruning, a join explosion, spilling or queueing**, and each one has a different fix.'
      }),

      B.quiz({
        id: 'm7-q2', t: 2,
        q: 'A 10 TB table is clustered by `order_date`. The API looks up a single order with `WHERE order_id = \'O-5001\'` and it is slow. What fits best?',
        opts: [
          { t: 'Search optimization on order_id', fb: '' },
          { t: 'Cluster the table by order_id instead', fb: 'A unique ID has the highest possible cardinality, so it cannot group rows, and it would break the date clustering that analysts need.' },
          { t: 'A materialized view over the whole table', fb: 'A materialized view suits a repeated aggregate, not single-row lookups.' },
          { t: 'A 4X larger warehouse', fb: 'The lookup reads far too much data. More compute treats the symptom at a much higher price.' }
        ],
        ok: 0, why: '**Search optimization** builds a structure for selective lookups, so Snowflake can find the few partitions that hold one order. Clustering stays on the date for the range queries.'
      }),

      B.quiz({
        id: 'm7-q3', t: 2,
        q: 'A query spills 40 GB to remote storage. What do you try first?',
        opts: [
          { t: 'Make the query process less data: filter earlier, select fewer columns, fix a join that multiplies rows', fb: '' },
          { t: 'Move it to a 6X-Large warehouse', fb: 'More memory hides the symptom, but the cause is too much data. Use it only after the query is lean.' },
          { t: 'Increase the result cache size', fb: 'The result cache is not involved. Spilling happens while the query runs.' },
          { t: 'Add Time Travel retention', fb: 'Time Travel has nothing to do with memory use.' }
        ],
        ok: 0, why: 'Spilling means an operator ran out of memory. The durable fix is to **process less data**. A bigger warehouse is a last resort, and only for a query that is already well written.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the slow-query investigation in order.',
        items: [
          'Find the slow query and open its Query Profile',
          'Compare partitions scanned with total partitions',
          'Look for spilling and for joins that multiply rows',
          'Fix the cause: filters, join keys, clustering or search optimization',
          'Only then consider a bigger warehouse',
          'Measure again and record the before and after'
        ],
        why: 'Evidence first, cheap fixes next, spending last. Recording before and after turns a fix into a story you can tell in an interview.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, title: 'Decision: speed up core.orders',
        scenario: '`core.orders` has **8 billion rows**. Analysts filter by a **date range**. The website API also looks up **one order by order_id**. Both access patterns are slow.',
        opts: [
          { t: 'Cluster by order_id', d: 'One key for everything.', lose: 'A unique ID as a clustering key has the highest possible cardinality. It cannot group rows, and reclustering it costs a lot.' },
          { t: 'Cluster by order_date and add search optimization on order_id', d: 'Different tools for the two access patterns.' },
          { t: 'Create a materialized view', d: 'Precompute results.', lose: 'A materialized view suits a repeated aggregate on one table. It does not help ad hoc date ranges or ID lookups.' },
          { t: 'Make the warehouse 4X bigger', d: 'Throw compute at it.', lose: 'Both problems are about reading too much data. Compute treats the symptom at four times the price.' }
        ],
        pick: 1,
        why: 'The two access patterns need different tools. **Clustering on the date** lets range queries skip partitions. **Search optimization on order_id** makes single-row lookups fast. Both reduce the data read, and neither adds compute.',
        when: 'Choose a **bigger warehouse** only after the profile shows the work is genuinely large and already pruned. Choose a **materialized view** when the same aggregate is queried repeatedly.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, title: 'Incident: the Finance dashboard crawls', time: '09:40',
        alert: 'The Finance dashboard takes **5 minutes** instead of 8 seconds. It started after Monday\'s model change, and the warehouse bill for WH_BI has doubled.',
        clues: ['WH_BI is Large with multi-cluster enabled', 'No queueing is visible in query history', 'The query text is unchanged since last week'],
        opts: [
          { t: 'Open the Query Profile of a slow run and compare rows in and out at each operator', fb: '' },
          { t: 'Scale WH_BI up to 4X-Large', fb: 'No queueing means size is not the problem, and it would multiply the bill.' },
          { t: 'Add clustering keys to every table in the schema', fb: 'You have no evidence that scanning is the problem, and clustering costs credits.' },
          { t: 'Roll back Monday\'s change without looking', fb: 'It may be right, but you would not know why. Look first, so you can fix the cause and prove it.' }
        ],
        best: 0,
        why: 'The query text did not change, so **the data or a model underneath did**. The profile shows where rows or time jump, and that points at the exact operator to fix.',
        checks: [
          ['Compare with last week', 'Find a fast run from last week in query history and open both profiles side by side.'],
          ['Pruning', 'Partitions scanned against total. A big change means a filter stopped pruning or a table lost its order.'],
          ['Join row counts', 'Rows in and rows out at each join. A jump means a table gained duplicate keys, such as a history table.'],
          ['Spilling', 'Bytes spilled to local or remote storage at the aggregate or join.'],
          ['What changed', 'Monday\'s model change: a new join, a new column in `SELECT *`, or a table rebuilt in a different order.']
        ],
        tell: 'The dashboard slowed from 8 seconds to 5 minutes after a model change. I compared the profile with a run from last week. A join to the customer history table had started returning several rows per customer, so rows went from 41 million to 3.2 billion and the aggregate spilled. I joined on the validity range, which brought the query back to 9 seconds and the warehouse bill back to normal.',
        prevent: ['Add a **row count test** that catches a join multiplying rows', 'Review the **Query Profile** of changed models in the pull request', 'Alert on **query time** for the top dashboard queries', 'Keep a short **before and after** note in the pull request for every performance fix']
      }),

      B.qa({
        id: 'qa-prune', t: 1, tag: 'Performance', secs: 60,
        q: 'What is partition pruning, and why does it matter?',
        pts: ['Snowflake stores min and max per column per micro-partition', 'A query skips partitions whose range cannot match the filter', 'Reading less data is faster and cheaper', 'It works when filters use raw columns and the data is well ordered', 'Clustering improves the order of large tables'],
        short: 'Snowflake stores a table as micro-partitions and keeps the minimum and maximum of every column for each one. When a query filters on a column, Snowflake compares the filter with those ranges and skips every partition that cannot contain a match. That is pruning. It matters because reading less data makes a query faster and cheaper, and compute time is the bill.\n\nPruning works when the filter uses the raw column and the data is reasonably ordered by that column. A function around the column stops it, and so does data that is scattered across partitions. For large tables where the order is poor, a clustering key improves it. I check the Query Profile for partitions scanned compared with partitions total to see whether pruning is working.',
        fu: [
          ['What stops pruning from working?', 'A function wrapped around the filter column, a filter on a column that is not ordered in storage, or an implicit cast that changes the column type in the comparison.'],
          ['Does a bigger warehouse help pruning?', 'No. Pruning decides how much data is read. A bigger warehouse reads the same data faster, but it does not read less.']
        ],
        trap: 'Describing pruning without saying how you would see it. Name the evidence: partitions scanned against partitions total in the profile.'
      }),

      B.qa({
        id: 'qa-tune', t: 2, tag: 'Performance', secs: 75,
        q: 'Walk me through how you tune a slow Snowflake query.',
        pts: ['Start with evidence: query ID, history and the Query Profile', 'Check partitions scanned against total, spilling, join row counts and queueing', 'Fix the cause: filters, join keys, clustering, search optimization, rewrite', 'Change warehouse size last, and test by doubling once', 'Measure again and record before and after'],
        short: 'I start with evidence. I find the query ID, look at query history for time, partitions scanned and total, spilling and queueing, and open the Query Profile to see which operator takes the time. The profile usually shows one of four causes: poor pruning, a join that multiplies rows, spilling, or queueing.\n\nI fix the cause. For pruning I filter on raw columns with ranges and, for a large table, consider a clustering key or search optimization for lookups. For a join I fix the keys or deduplicate. For spilling I process less data. For queueing I scale out or separate workloads. I change the warehouse size last, and I test it by doubling once to see whether the runtime really halves. Then I measure again and record the before and after in the pull request.',
        long: 'I start with evidence, never with a setting. I take the query ID and look at query history: elapsed time, partitions scanned compared with total, bytes spilled and queued time. Then I open the Query Profile and find the operator that takes most of the time.\n\nUsually it is one of four things. Poor pruning, where the scan reads almost every partition. A join that multiplies rows, often because a history table has several versions per key. Spilling, where an operator ran out of memory. Or queueing, which is a concurrency problem and not a query problem.\n\nI fix the cause. For pruning I filter on the raw column with a range, and for a large table I consider a clustering key, or search optimization when the access pattern is single-row lookups. For a join I fix the keys, deduplicate, or join on the validity range. For spilling I process less data by filtering earlier and selecting fewer columns. For queueing I use a multi-cluster warehouse or move the workload.\n\nI touch the warehouse size last. I double it once and check whether the runtime halves. If it does not, the query is not compute-bound. Finally I measure again and write the before and after in the pull request, so the improvement is on record and a regression is easy to spot.',
        fu: [
          ['How do you know the fix worked?', 'I compare the same query before and after on elapsed time, partitions scanned, bytes spilled and credits used, and I keep the numbers in the pull request.'],
          ['What if the profile shows nothing obvious?', 'I check whether the data volume grew, whether a source table changed shape, and whether the warehouse was shared with a heavy job at the time.']
        ],
        trap: 'Opening with "I would increase the warehouse size". It shows you reach for spending before you diagnose.',
        real: 'Use a real tuning story. Name the query, what the profile showed, the change you made, and the numbers before and after.'
      }),

      B.qa({
        id: 'qa-cluster', t: 2, tag: 'Performance', secs: 60,
        q: 'When would you add a clustering key, and how do you choose it?',
        pts: ['Only for large tables, many TB and thousands of partitions', 'Choose the column most queries filter or join on, usually a date', 'Prefer low to medium cardinality, use expressions such as TO_DATE', 'Avoid unique IDs and raw timestamps', 'Measure with SYSTEM$CLUSTERING_INFORMATION and watch the reclustering cost'],
        short: 'I add a clustering key only for a large table, many terabytes and thousands of partitions, where queries filter on a predictable column and the profile shows poor pruning. I choose the column that most queries filter or join on, which is usually a date.\n\nI prefer low to medium cardinality, and I use an expression such as TO_DATE of a timestamp so the number of distinct values stays manageable. I avoid unique IDs, which cannot group rows, and raw timestamps for the same reason. Before I add the key I run SYSTEM$CLUSTERING_INFORMATION to see how scattered the data is. After I add it I measure the query speed-up and watch the automatic clustering cost, and I drop the key if the cost is higher than the saving.',
        fu: [
          ['Why not cluster every table?', 'Reclustering uses credits in the background, and on small tables the data already fits in a few partitions, so there is nothing to gain.'],
          ['What is average depth?', 'The average number of overlapping micro-partitions for a column value. Near 1 means well clustered. A large number means the data is scattered.']
        ],
        trap: 'Choosing a high-cardinality column such as an ID or a timestamp. It cannot group rows, and the reclustering cost is high.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Performance Tuner', color: '#FEF08A',
        pts: [
          '**Pruning** skips micro-partitions using min and max metadata. A **function around the filter column** stops it.',
          'Read the **Query Profile**: partitions scanned against total, join rows in and out, spilling, queued time.',
          'Fix causes in order: **pruning, join keys, spilling**, then queueing. Warehouse size comes last.',
          '**Clustering** for large range-filtered tables. **Search optimization** for lookups. **Materialized view** for repeated aggregations. **Query acceleration** for outlier scans.',
          'Always **measure before and after** and write it down.'
        ],
        lines: [
          'I diagnose with the profile before I touch warehouse size.',
          'I filter on the raw column with a range, so pruning can work.',
          'I choose a clustering key from the access pattern, and I watch what reclustering costs.'
        ]
      })
    ]
  });
})();
