/* Mission 13: drills that mix missions, a coding round, the boss round of interview questions, and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path,
     tier 2 adds the senior questions, tier 3 adds the rest. */
  var BOSS = [
    ['qa-platform', 1], ['qa-compute', 2], ['qa-lazy', 1], ['qa-shuffle', 1], ['qa-join', 2], ['qa-skew', 2], ['qa-aqe', 3],
    ['qa-delta', 1], ['qa-schema', 1], ['qa-merge', 2], ['qa-conflict', 2], ['qa-smallfiles', 1], ['qa-layout', 2],
    ['qa-medallion', 1], ['qa-idem', 2], ['qa-scd', 2], ['qa-stream', 1], ['qa-watermark', 2],
    ['qa-uc', 1], ['qa-grants', 2], ['qa-sdp', 1], ['qa-cdc', 2], ['qa-jobs', 1], ['qa-repair', 2],
    ['qa-slow', 1], ['qa-cost', 2], ['qa-test', 1], ['qa-deploy', 2], ['qa-storage', 2]
  ];

  var D = G.counts('spark.defaults'), Z = G.counts('layout.zorder'), SB = G.counts('layout.small_before'), SA = G.counts('layout.small_after');
  var CONF = G.counts('delta.conflicts'), WM = G.counts('stream.watermark_runs'), SDPRUNS = G.counts('sdp.runs'), PART = G.counts('layout.partitioning');
  var MB = function (b) { return Math.round(parseInt(b, 10) / 1048576); };
  G.expect(MB(D['spark.sql.autoBroadcastJoinThreshold']) === 10 && D['spark.sql.shuffle.partitions'] === '200' && D['spark.sql.adaptive.enabled'] === 'true', 'the Spark defaults quoted in the cheat sheet');
  G.expect(Z.scan_files_before === 16 && Z.scan_files_after === 1 && SB.numFiles === 40 && SA.numFiles === 1 && PART.cust100.numFiles === 100, 'the layout numbers quoted in the cheat sheet');
  G.expect(CONF.append_append.a === 'committed' && CONF.update_append.a === 'ConcurrentAppendException' && WM[2].dropped_by_watermark === 1 && SDPRUNS[2].rows.silver_orders === 10, 'the concurrency, watermark and pipeline results quoted in the cheat sheet');
  var d0 = parseInt(D['spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes'], 10) / 1048576;

  var TOP = [
    'from pyspark.sql import Window, functions as F',
    '',
    'per_customer = (orders',
    '    .groupBy("order_date", "customer_id")',
    '    .agg(F.sum("total_usd").alias("spend")))',
    '',
    'by_spend = Window.partitionBy("order_date").orderBy(F.col("spend").desc())',
    '',
    'top = (per_customer',
    '    .withColumn("rnk", F.rank().over(by_spend))',
    '    .where("rnk = 1")',
    '    .select("order_date", "customer_id", "spend"))'
  ].join('\n');

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Drills that mix topics, a coding round, a mock interview and a one-page review', minutes: 50,
    focus: ['src', 'stg', 'int', 'mart', 'con', 'sf', 'air', 'mon', 'qual', 'snap', 'ci'],
    goals: [
      'Solve **drills** that combine several missions, with the first move and the reasoning.',
      'Write a **ranking query** with a window function and handle ties.',
      'Answer a **mock interview round** against a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the numbers, settings and decision rules.'
    ],
    say: 'This is the last mission. First two drills that mix topics, then a design decision and a coding round, then the boss round: real interview questions with no notes. Be honest when you grade yourself. Honest grades make the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm13-inc1', t: 1, src: 'docs', title: 'Drill: a new engineer cannot read a table', time: '10:05',
        alert: 'A new engineer runs `select * from brewline_prod.gold.daily_revenue` in a notebook and gets a **permission error**. A teammate in the same team runs the same query without a problem.',
        clues: ['The table exists', 'The engineer joined the `analysts` group in Microsoft Entra ID an hour ago', 'The `analysts` group holds `USE CATALOG`, `USE SCHEMA` and `SELECT` for gold'],
        opts: [
          { t: 'Check whether the engineer is a member of `analysts` in the Databricks account, and wait for or trigger the identity sync if they are not', fb: '' },
          { t: 'Grant `ALL PRIVILEGES` on the catalog to the engineer', fb: 'It hides the problem and gives far more than the role needs. A grant to one person is also the pattern mission 7 warns about.' },
          { t: 'Restart the cluster the engineer uses', fb: 'Privileges are checked by Unity Catalog on each query. A restart changes nothing.' },
          { t: 'Copy the table into the engineer\'s own schema', fb: 'You create a second copy that will drift, and you skip the access question.' }
        ],
        best: 0,
        why: 'The group has every privilege it needs, and a teammate can read the table. So the privileges are right. What differs is the engineer\'s membership of the group in the Databricks account. A change in Entra ID reaches Databricks through the identity sync, and it may not have arrived yet.',
        checks: [
          ['Read the error', 'It names the privilege or the object. The engineer holds neither through any group.'],
          ['Check the group in Databricks', 'Is the engineer listed as a member of `analysts` in the account?'],
          ['Check the sync', 'Automatic identity management mirrors Entra ID. If the membership is missing, find out when the sync runs, or sign out and in.'],
          ['Test again', 'After the membership appears, the query works with no grant change.'],
          ['Keep it clean', 'Never grant to the person to speed things up.']
        ],
        tell: 'A new engineer could not read the gold table although their team could. The group had all three privileges, so I checked their membership in the Databricks account and found that the change in Entra ID had not synced yet. After the membership appeared, the query worked, and I changed no grant. I avoided a grant to the person, because that would have created a special case nobody would remember. To prevent the delay, we add new members to groups before their first day.',
        prevent: ['**Add people to groups** before they start', 'Never **grant to a person** to work around a delay', 'Use **SHOW GRANTS** and the group list to find the cause', 'Know how and when the **identity sync** runs']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, src: 'rec', title: 'Drill: the nightly job is slow and costs three times more', time: '07:30',
        alert: '**The nightly job used to finish in 40 minutes. Now it needs 2 hours, and its cost is three times higher.** It runs on a job cluster with 8 workers. Nothing in the code changed. Last week a new supplier started to send many small files every few minutes.',
        clues: ['The job reads the table with a filter on `customer_id`', 'The table is fed by a stream with a 10-second trigger', 'The run time grew a little every day'],
        opts: [
          { t: 'Check the number and size of the files in the table, and the files that the slow stage reads, then compact and fix the trigger', fb: '' },
          { t: 'Add 8 more workers to the cluster', fb: 'More machines do not make opening thousands of small files cheap, and they double the bill again.' },
          { t: 'Move the job to an all-purpose cluster', fb: 'The all-purpose rate for each DBU is higher. The job would cost more.' },
          { t: 'Turn off retries so a failed run stops sooner', fb: 'The job does not fail. It runs slowly.' }
        ],
        best: 0,
        why: 'Run time grew every day after a source began to send small files, and a stream with a short trigger adds a file for each commit. In the recording, 40 small files became 1 with `OPTIMIZE`, and a filter read 1 file of 16 after the layout was fixed. Compaction and a better layout cut the work, and the work is what the cluster bills for.',
        checks: [
          ['Find what changed', 'A new supplier, many small files, a short trigger.'],
          ['Count the files', '`DESCRIBE DETAIL` shows the file count and the average size.'],
          ['Read the slow stage', 'The stage reads a huge number of files for a small amount of data.'],
          ['Fix the layout', 'Run `OPTIMIZE`, and cluster the table by the filter column.'],
          ['Stop it returning', 'Turn on optimized writes and auto compaction, lengthen the trigger, and schedule `OPTIMIZE`.']
        ],
        tell: 'The nightly job went from 40 minutes to 2 hours and its cost tripled, with no code change. A new supplier was sending small files every few minutes into a table fed by a stream with a 10-second trigger, so the table had thousands of tiny files. I checked the file count and the average size, ran OPTIMIZE, and clustered the table by the column the job filters on. The run time came back to normal. To prevent a repeat, we turned on optimized writes and auto compaction, lengthened the trigger, and added an alert on the average file size.',
        prevent: ['Alert on the **average file size** of each table', '**Optimized writes** and **auto compaction** on tables fed by streams', 'A **longer trigger** where the data does not need seconds', '**Liquid clustering** on the filter columns']
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: what do you build first in week one?',
        scenario: 'Brewline starts a new lakehouse on Azure Databricks. You are the first data engineer. The analysts want a revenue dashboard in **three weeks**. There is **one workspace**, a storage account, and no structure yet.',
        opts: [
          { t: 'Point the dashboard at the raw files and fix the structure later', d: 'The fastest first demo.', lose: 'Nothing is governed, nothing is tested, and every analyst reads raw files. Fixing it later means rewriting the dashboard and the access rules.' },
          { t: 'Set up the catalog and groups, then bronze, silver and gold in a declarative pipeline that a job runs from a bundle in Git', d: 'Structure first, one thin slice of data end to end.' },
          { t: 'Request the biggest cluster and build everything in notebooks', d: 'Power first.', lose: 'The size of the cluster is not the problem. Notebooks without Git, tests or a job give you no repeatability, and the bill grows with the cluster.' }
        ],
        pick: 1,
        why: 'A thin slice of the real structure gives the dashboard governed tables from the first day: Unity Catalog names and grants, the layers, a pipeline that orders itself, a job with a trigger and alerts, and code in Git that a pull request can test. It is slower for the first demo and faster for every change after it.',
        when: 'If the first deadline is a demo that will be thrown away, a quick look at the raw files is a fair start, as long as nobody mistakes it for the platform.'
      }),

      B.challenge({
        id: 'm13-ch', t: 2, title: 'Coding round: the top customer for each day',
        q: 'The `orders` table has the date, the customer and the amount of each order. **Write PySpark that returns, for each day, the customer with the highest total spend.** If two customers tie for the top on a day, **return both**.',
        data: [{ name: 'orders', cols: ['order_date', 'customer_id', 'total_usd'], rows: [['2026-03-14', 'C-42', '67.00'], ['2026-03-14', 'C-77', '12.50'], ['2026-03-14', 'C-42', '28.00'], ['2026-03-15', 'C-91', '55.00'], ['2026-03-15', 'C-77', '20.00'], ['2026-03-16', 'C-77', '44.50'], ['2026-03-16', 'C-42', '16.00'], ['2026-03-16', 'C-91', '44.50']] }],
        lang: 'python', file: 'top_customer.py',
        hints: ['Add up the amounts for each day and customer first.', 'Rank the customers within each day. A window partitioned by the day, ordered by spend descending.', 'Which ranking function keeps both customers when two tie: `row_number`, `rank` or `dense_rank`?'],
        sol: TOP,
        res: { msg: '4 rows: two customers tie on 16 March', cols: ['order_date', 'customer_id', 'spend'], rows: [['2026-03-14', 'C-42', '95.00'], ['2026-03-15', 'C-91', '55.00'], ['2026-03-16', 'C-77', '44.50'], ['2026-03-16', 'C-91', '44.50']] },
        expl: ['Group first: one row for each day and customer, with the sum of the amounts. C-42 spent 67.00 and 28.00 on 14 March, which makes 95.00.', '`rank()` gives the same rank to equal values, so both 44.50 totals on 16 March get rank 1. `row_number()` would pick one of them at random.', 'Use `dense_rank()` when you want the second place without a gap after a tie. For the top row, `rank()` and `dense_rank()` give the same result.', 'The code ran on open-source Spark in the verification step, and the result above is the output.'],
        cx: 'One shuffle to group by day and customer, and one to rank inside each day. The data moves twice. A day with one very large customer base could skew the second shuffle.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm13-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Items marked (docs) come from documentation and were not run. Everything else comes from a recording or a check described in the README. Take a screenshot or print the page.',
        sections: [
          { h: 'Platform', items: ['Control plane: web app, jobs, cluster manager, catalog. Classic compute in your subscription. Serverless in the Databricks account (docs)', 'Tables are files and a log in your storage. Compute is replaceable', 'Classic: DBUs plus VMs. Serverless: one rate. Idle time bills', 'Jobs compute for jobs, serverless first, all-purpose only for people (docs)'] },
          { h: 'Spark', items: ['Transformations plan, actions run. Read a plan from the bottom. `Exchange` is a shuffle', 'Defaults: ' + D['spark.sql.shuffle.partitions'] + ' shuffle partitions, broadcast under ' + MB(D['spark.sql.autoBroadcastJoinThreshold']) + ' MB, adaptive execution on', 'Broadcast the small side. Sort-merge for two big tables. Hints: broadcast, merge, shuffle_hash', 'Skew: one slow task. AQE splits it. Salt the key. Skew needs a partition of at least ' + Math.round(d0) + ' MB and ' + D['spark.sql.adaptive.skewJoin.skewedPartitionFactor'].replace(/\.0$/, '') + ' times the median', 'Built-in functions, not Python functions. Never `collect()` a big table'] },
          { h: 'Delta Lake', items: ['Parquet files plus a JSON log of add and remove actions. The table is the replay of the log', 'UPDATE and DELETE rewrite files. `DESCRIBE HISTORY`, `VERSION AS OF`, `RESTORE`', 'Schema mismatch fails. `mergeSchema` opts in. Constraints reject bad values', 'MERGE: unique key, deduplicated source, update only if newer. Appends do not conflict. A read-then-change can fail with a concurrent append'] },
          { h: 'Layout and cost', items: ['OPTIMIZE: ' + SB.numFiles + ' small files became ' + SA.numFiles + '. Z-order: a filter read ' + Z.scan_files_after + ' of ' + Z.total_files_before + ' files', 'Partition only big tables, on few values. ' + PART.cust100.partition_values + ' values gave ' + PART.cust100.numFiles + ' tiny files. New tables: liquid clustering (docs)', 'VACUUM keeps 168 hours (7 days). A shorter retention ends time travel and RESTORE', 'Cost = DBUs x rate + VM hours x price. Jobs compute, spot workers, autoscaling, auto-termination (docs)'] },
          { h: 'Pipelines and streaming', items: ['Bronze: raw plus the file name. Silver: one row for each key. Gold: business tables from silver only', 'Checkpoint: offsets first, commit last. An empty trigger reads 0 rows', 'Watermark: largest event time minus the delay. A late event is dropped: ' + WM[2].dropped_by_watermark + ' row in the recording', 'Declarative: references give the order. Streaming table appends, materialized view recomputes. A dry run catches typos. Expectations and AUTO CDC are Databricks features (docs)'] },
          { h: 'Catalog and security', items: ['catalog.schema.table. A reader needs `USE CATALOG`, `USE SCHEMA` and `SELECT`. Grants inherit from catalog and schema (docs)', 'Grant to groups. Jobs run as service principals. Masks and row filters are attached to the table (docs)', 'Managed table: UNDROP in 7 days by default. External table: the files stay (docs)', 'Secrets in Key Vault, read with `dbutils.secrets.get`. Never in code'] },
          { h: 'Jobs and delivery', items: ['A job is tasks plus dependencies. Trigger on the data. Retries for transient failures, a timeout, one concurrent run for writers (docs)', '`run_if`: AT_LEAST_ONE_FAILED to alert, ALL_DONE to clean up. A repair reruns failed tasks and dependents, so make tasks idempotent (docs)', 'pytest with local Spark: logic in functions, exact assertions, a row that breaks each rule', 'A bundle: dev in development mode, prod in production mode. Deploy as a service principal with OIDC (docs)'] },
          { h: 'Azure', items: ['Entra ID, automatic identity management, service principals (docs)', 'ADLS Gen2, access connector, role on the storage account, storage credential, external location, grants (docs)', 'VNet injection, secure cluster connectivity, Private Link. Serverless needs its own path to a firewalled storage account (docs)'] },
          { h: 'Say it in one line', items: ['Read the plan before you tune.', 'Make the work smaller before you make the cluster bigger.', 'Make every write safe to run twice.', 'Grant to groups, run as service principals, keep secrets in the vault.', 'Say what you know from practice, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Databricks Architect', color: '#FDE68A',
        pts: [
          'You can follow data from **files to gold tables** on Databricks, and say what it costs and who can read it.',
          'You choose by **evidence**: the plan before the guess, the file count before the resize, the grants before the fix.',
          'You make writes **safe to repeat**, protect production with **groups, service principals and a pipeline**, and keep history with **Delta**.',
          'You know which facts came from **recordings** and which from **documentation**, and you say so.',
          'Next: practise the answers out loud, then run the Brewline examples on a free or trial workspace.'
        ],
        lines: [
          'I read the plan and the first error before I change anything.',
          'I protect every key, every grant and every production table.',
          'I say what I know, and I say when I would check the documentation.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
