/* Mission 15: drills that mix missions, a design decision, a coding round in SQL on recorded numbers, the boss round of interview questions, and a one-page review.
   Every number on the cheat sheet comes from a recording in an earlier mission: the Cloud Storage emulator and client, DuckDB running translated BigQuery SQL on made-up orders (the bytes
   are an estimate from documented type sizes), Apache Beam local runners, a small model of Pub/Sub delivery, local PySpark, Airflow, the Dataform compiler, Checkov, schema checks, and
   the gcloud and bq help pages. Nothing ran on Google Cloud. Facts about the services come from documentation, and names and limits change: check them before you rely on them. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: every interview question of missions 1 to 14, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions, tier 3 the extra ones. */
  var BOSS = [];
  LAB.chapters.forEach(function (ch) { ch.scenes.forEach(function (s) { if (s.type === 'qa') BOSS.push([s.id, s.t]); }); });

  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var GIB = function (b) { return (b / 1024 / 1024 / 1024).toFixed(2) + ' GiB'; };
  var usd = function (x) { return '$' + x.toFixed(2); };
  var ES = G.table('sql.estimates').rows, IR = G.table('idem.runs').rows, SG = G.counts('gcs.signed'), PC = G.counts('gcs.precondition'), FS = G.table('formats.sizes').rows, FC = G.counts('formats.column_read');
  var BL = G.counts('beam.late'), BD = G.counts('beam.dedupe'), BDL = G.counts('beam.dead_letter'), S60 = G.table('beam.sessions_60').rows, S10 = G.table('beam.sessions_10').rows, PM = G.table('pubsub.model').rows;
  var SK = G.counts('spark.skew'), SF = G.table('spark.small_files').rows, SH = G.counts('spark.shuffle'), SJ = G.counts('spark.join'), AF = G.counts('af.flaky'), AP = G.counts('af.parse'), DF = G.counts('df.compile'), FN = G.counts('fn.summary');
  var RP = G.counts('sql.row_policy'), NT = G.counts('sql.null_trap'), W0 = G.counts('sql.world'), DD = G.counts('sql.dedup'), PII = G.table('sql.pii_scan').rows, LK = G.counts('sql.leak'), SP = G.counts('sql.split');
  var CK = G.counts('tf.checkov'), CI = G.counts('ci.summary'), COST = G.table('sql.cost_by_label').rows, CW = G.counts('sql.cost_world');
  function est(name) { return ES.filter(function (r) { return r[0] === name; })[0]; }
  function idem(method, step) { return IR.filter(function (r) { return r[0] === method && r[1] === step; })[0]; }
  function fmt(name) { return FS.filter(function (r) { return r[0] === name; })[0]; }
  function pm(sit, msg) { return PM.filter(function (r) { return r[0] === sit && r[1] === msg; })[0]; }
  function pii(col) { return PII.filter(function (r) { return r[0] === col; })[0]; }
  var SELSTAR = est('SELECT *'), ONEDAY = est('three columns and a filter, one UTC day'), SGBAD = est('one Singapore day, filtered with DATE(ts, zone)'), SGOK = est('one Singapore day, filtered with two bounds');
  var OWNER_CHECKS = CK.baseline.failed.filter(function (x) { return /pipeline_role/.test(x); }).length;
  G.expect(BOSS.length >= 50 && BOSS[0][0] !== undefined, 'the boss round has the questions of the earlier missions');
  G.expect(SELSTAR[4] === 43308285952 && ONEDAY[4] === 817889280 && SGBAD[2] === '14 of 14' && SGOK[2] === '2 of 14', 'the estimates that the drills quote');
  G.expect(idem('append', 'the same batch again')[4] === 1402 && idem('merge', 'the same batch again')[4] === 0 && idem('overwrite_partition', 'the same batch again')[4] === 0 && idem('merge', 'corrected batch')[4] === 8, 'the load results');
  G.expect(SG.expires_seconds === 900 && SG.other_object_name_verifies === false && SG.longer_expiry_verifies === false && PC.sent_parameter === 'ifGenerationMatch=0', 'the signed URL and the precondition');
  G.expect(BL.no_lateness.dropped === 2 && BL.late_accumulating.dropped === 1 && BD.unique_events === 40 && BD.delivered === 42 && BDL.dead === 3 && S60.length === 2 && S10.length === 5, 'the Beam numbers');
  G.expect(pm('slow handler', 'm1')[3] === 4 && pm('poison, no dead letter', 'm1')[3] === 61 && pm('poison, dead letter after 5', 'm1')[3] === 5 && pm('ordering key blocks', 'a2')[3] === 0, 'the Pub/Sub model numbers');
  G.expect(SK.by_store.largest_over_median === 3.36 && SK.by_store_and_salt.largest_over_median === 1.76 && SH.tasks_per_stage_without_aqe[0] === 200 && SJ.small_table_join === 'BroadcastHashJoin', 'the Spark numbers');
  G.expect(AF.tasks[0].tries === 3 && AP.slower_by_seconds === 2 && DF.tables === 3 && DF.assertions === 2 && FN.clean.passed === 4 && FN.bug.failed === 1, 'the orchestration numbers');
  G.expect(RP.orders_visible_to_a_manager_of_s01 === 6825 && NT.not_in_rows === 0 && NT.not_exists_rows === 767 && DD.new_became_paid_on_second_delivery === 45 && pii('customers.email')[2] === 1 && pii('customers.phone')[3] === 1, 'the SQL and governance numbers');
  G.expect(LK.corr_leaky_feature === 0.307 && LK.corr_clean_feature === 0.01 && SP.customers_in_both_when_split_by_order === 1535 && SP.customers_in_both_when_split_by_customer === 0, 'the ML data numbers');
  G.expect(CK.baseline.failed_count === 11 && CK.all_fixed.passed === 15 && OWNER_CHECKS === 2 && CI.cloudbuild_bad.exit_code === 1 && CI.deploy.uses_a_key_file === false, 'the delivery numbers');
  G.expect(COST.length === 3 && COST[0][0] === 'dashboard_refresh' && CW.jobs === 763, 'the cost numbers');
  G.expect(Math.abs(fmt('Parquet (snappy)')[2] - 0.293) < 1e-9 && fmt('ORC (zstd)')[2] === 0.136 && FC.two_columns_share === 0.103, 'the file format numbers');

  /* The coding round: the five cheapest queries and their share of the worst, from the recorded estimates of mission 5. */
  var WORST = Math.max.apply(null, ES.map(function (r) { return r[4]; }));
  var CHROWS = ES.slice().sort(function (a, b) { return a[4] - b[4]; }).slice(0, 5).map(function (r) { return [r[0], n0(r[4]), (Math.round(1000 * r[4] / WORST) / 10).toFixed(1)]; });
  var CH_SQL = [
    'SELECT query,',
    '       billed_bytes,',
    '       ROUND(100.0 * billed_bytes / MAX(billed_bytes) OVER (), 1) AS pct_of_worst',
    'FROM estimates',
    'ORDER BY billed_bytes',
    'LIMIT 5'
  ].join('\n');
  G.expect(CHROWS.length === 5 && CHROWS[0][0] === 'three columns and a filter, one UTC day' && CHROWS[0][2] === '1.9' && CHROWS[4][2] === '13.4', 'the coding round result');

  LAB.addChapter({
    id: 'm15', n: 15, title: 'Boss round', short: 'Boss round', blurb: 'Drills that mix the missions, a design decision, a coding round, and a mock interview', minutes: 80,
    focus: ['src', 'air', 'ci'],
    goals: [
      'Handle **two incidents** that cross missions: a day counted twice, and a key in a public repository.',
      'Decide **what to build first** on an empty Google Cloud project, and defend it.',
      'Compare costs with **one SQL query** on the recorded estimates.',
      'Answer **the interview questions** of every mission in the time of a real interview.',
      'Take away **one page** of numbers and rules.'
    ],
    say: 'Mission 15 is the boss round. First two drills that mix what you learned, because nobody has an incident in only one mission. Then a design decision, a coding round in SQL on the numbers that I recorded, and the mock interview with the questions of every mission. At the end there is one page to review. Everything here ran offline, and I say again that nothing ran on Google Cloud.',
    scenes: [
      B.incident({
        id: 'm15-inc1', t: 2, src: 'rec', title: 'Drill: a day counted twice, and a bill that grew', time: '08:40',
        alert: '**The Monday sales report shows yesterday\'s revenue at exactly twice the finance number, and the BigQuery bill climbed.** The nightly load failed with a timeout at 03:10 and Composer retried it, and the retry succeeded. The same week, an analyst rewrote the dashboard filter as `DATE(order_ts, "Asia/Singapore") = ...` to show Singapore days.',
        clues: ['In the recording, appending the same batch twice left ' + n0(idem('append', 'the same batch again')[4]) + ' rows wrong, and a MERGE left 0', 'The load had already started when the timeout hit, so the retry ran it again', 'A filter written as `DATE(ts, zone)` read ' + SGBAD[2] + ' partitions, and two timestamp bounds read ' + SGOK[2], 'No check compared the table with the source'],
        opts: [
          { t: 'Reload the day, make the load safe to repeat (replace the partition in one transaction, or MERGE on the key), write the filter as two timestamp bounds, require a partition filter on the table, and add a count check against the source', fb: '' },
          { t: 'Delete the duplicate rows by hand and move on', fb: 'That repairs yesterday, and the next retry does it again.' },
          { t: 'Turn off retries in Composer', fb: 'The retry is what rescued the run. The load must be safe to repeat.' },
          { t: 'Tell finance to use the number of the report', fb: 'The two numbers now disagree for good, and the bill is still too big.' }
        ],
        best: 0,
        why: 'Two separate faults share one morning. A load that is not safe to repeat counted a day twice, and a filter that wraps the column in a function stopped the partitions from being skipped. In the recording the append left ' + n0(idem('append', 'the same batch again')[4]) + ' rows wrong and the other four methods left none, and the two ways of writing the filter read ' + GIB(SGBAD[4]) + ' and ' + GIB(SGOK[4]) + '. Fix each cause, and add the check that would have caught it.',
        checks: [
          ['Repair the data', 'Reload the day, then compare counts and sums with the source (mission 11).'],
          ['Make the load safe to repeat', 'Replace the partition in one transaction, or MERGE on the key. Prove it by running it twice.'],
          ['Fix the bytes', 'Write the filter as a range on the partition column, and set `require_partition_filter` on the table so that a query without one is refused.'],
          ['Guard', 'A reconciliation count after every load, and a cap on the bytes billed for the dashboard account.']
        ],
        tell: 'Yesterday was counted twice because a timeout made Composer retry a load that had already started, and the load was an append. I reloaded the day, changed the load to replace the partition in one transaction, rewrote the dashboard filter as two timestamp bounds, set a required partition filter on the table, and added a count check against the source.',
        prevent: ['Every load safe to run twice', 'A required partition filter, and filters written as ranges', 'A reconciliation check after every load']
      }),

      B.incident({
        id: 'm15-inc2', t: 2, src: 'rec', title: 'Drill: a key file in a public repository', time: '14:05',
        alert: '**A secret scanner reports a service account key file in a public repository, committed three weeks ago. The account is `sa-pipeline`.** The Terraform of this account gives it the Owner role on the project.',
        clues: ['In the recording, Checkov flagged the Owner role with ' + OWNER_CHECKS + ' checks', 'A key file works from anywhere until the key is deleted', 'The deploy workflow of mission 2 has no key file: it signs in with a short-lived token', 'The audit logs record the calls that a key made'],
        opts: [
          { t: 'Delete the key now, read the audit logs for calls made with it since the commit, narrow the role to what the pipeline needs, move the job to a federated identity, forbid key creation with an organization policy, and remove the file from the repository history', fb: '' },
          { t: 'Delete the file from the repository and carry on', fb: 'The key still works, and it is in the history and in every clone. Deleting a file revokes nothing.' },
          { t: 'Rotate the key next month with the other secrets', fb: 'A leaked key is an open door today. Revoke it today.' },
          { t: 'Make the repository private', fb: 'Anyone who copied the key keeps it. Only deleting the key helps.' }
        ],
        best: 0,
        why: 'A leaked key is valid until somebody deletes it, so revoke first. Then ask what it did: the audit logs show the calls. The damage was large because the account was an Owner, and the scan of the Terraform had already flagged that with ' + OWNER_CHECKS + ' checks. The lasting fix removes the cause: no key files (federated identity), a narrow role, and an organization policy that blocks new keys.',
        checks: [
          ['Revoke', 'Delete the key of the service account. Every copy of the file becomes useless.'],
          ['Look for use', 'The audit logs: calls made as that account since the commit, from addresses that you do not know.'],
          ['Reduce the damage', 'Replace Owner with the roles the pipeline needs, as in the fixed Terraform file, and better on the datasets than on the project.'],
          ['Remove the cause', 'A federated identity for the pipeline, and an organization policy that forbids creating keys.'],
          ['Clean up', 'Remove the file from the history, and tell the security team that the repository was public.']
        ],
        tell: 'A key of the pipeline account was public for three weeks, and the account was an Owner. I deleted the key at once, read the audit logs for calls made with it, replaced the Owner role with a narrow predefined role, moved the pipeline to a federated identity, blocked key creation with an organization policy, and cleaned the repository history.',
        prevent: ['**No key files**: federated identity for pipelines', 'A **narrow role**, scanned in every pull request', 'An **organization policy** that blocks key creation', 'A **secret scanner** on every repository']
      }),

      B.decide({
        id: 'm15-dec', t: 2, src: 'docs', title: 'Decision: what do four engineers build first?',
        scenario: 'Brewline Asia-Pacific has four engineers and eight weeks, and an empty Google Cloud project. The business wants orders in BigQuery with a daily report that people trust, a live view for store managers, and later a model that predicts reorders. Managers like demos, and a live screen would impress them.',
        opts: [
          { t: 'The live streaming view and the model first, because they impress, and the foundations after the demo', d: 'The most exciting demo, early.', lose: 'Without IAM, Terraform, loads that are safe to repeat and checks, the live view shows numbers that nobody can trust, and the model learns from them. A stream makes each of those gaps harder to find.' },
          { t: 'Foundations first: projects and IAM in Terraform, a landing bucket, partitioned tables, idempotent batch loads and checks. Then the daily report. Then streaming. Then governance and the model', d: 'Each step is something that the next one needs, and each can be shown to the business when it is done.', lose: '' },
          { t: 'Everything by hand in the console, and write it down later', d: 'The fastest way to a first table.', lose: 'There is no record and no review, the first handover loses half of it, and the second environment will differ. Terraform in week one is cheaper than in month six.' }
        ],
        pick: 1,
        why: 'Order the work by what the next step needs. The recordings show how small gaps grow: an append that runs twice leaves ' + n0(idem('append', 'the same batch again')[4]) + ' wrong rows, a filter written the wrong way reads ' + (SGBAD[4] / SGOK[4]).toFixed(1) + ' times the bytes, and an Owner role is flagged by ' + OWNER_CHECKS + ' checks. Foundations are cheap in week one. A live view can come in week five, on tables that the team already trusts.',
        when: 'If the business has a hard date for a live view, build a thin version early on the same foundations: a topic, a subscription with a dead-letter topic, and one table, with the checks from the first day.'
      }),

      B.challenge({
        id: 'm15-ch', t: 2, title: 'Coding round: compare every query with the worst one', file: 'compare.sql', lang: 'sql',
        q: 'The table `estimates` holds the billed bytes of eleven queries on the orders table, recorded in mission 5 at the size of the lessons. **Write one query that returns the five cheapest queries, with their billed bytes and the percent of the most expensive query\'s bytes, rounded to one decimal.**',
        data: [{ name: 'estimates (recorded in mission 5)', cols: ['query', 'billed_bytes'], rows: ES.map(function (r) { return [r[0], n0(r[4])]; }) }],
        starter: '-- the five cheapest queries\nSELECT query, billed_bytes, ...\nFROM estimates',
        hints: ['A window function can see the whole table: `MAX(billed_bytes) OVER ()` is the largest value, on every row.', 'The percent of the worst is 100 times the bytes divided by that maximum.', 'Sort by billed bytes, smallest first, and keep five.'],
        sol: CH_SQL,
        res: { msg: '5 rows', cols: ['query', 'billed_bytes', 'pct_of_worst'], rows: CHROWS },
        expl: ['`MAX(billed_bytes) OVER ()` is a window function with an empty window: it looks at all eleven rows and gives the largest value to every row, without collapsing them. A `GROUP BY` would have collapsed them.', '`100.0 * billed_bytes / MAX(...)` is the share of the worst query. The `100.0` makes it decimal, so that the division does not round down to a whole number. `ROUND(..., 1)` keeps one decimal.', '`ORDER BY billed_bytes` with `LIMIT 5` keeps the five cheapest. Look at the result: the cheapest query reads under 2 percent of the bytes of `SELECT *`, because it reads one partition and four columns.'],
        cx: 'One pass over eleven rows. The same shape works over a month of job history, where the "worst" is the most expensive job of the period.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm15-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from a recording in an earlier mission, made offline with open-source tools and made-up data. Take a screenshot or print the page.',
        sections: [
          { h: 'Access and identity', items: ['Roles are inherited downwards: organization, folder, project, resource. One service account for each job, and the narrowest predefined role', 'No key files: the deploy workflow has no secret and the scan flagged the Owner role with ' + OWNER_CHECKS + ' checks', 'A V4 signed URL was valid for ' + SG.expires_seconds + ' s and was signed offline. A changed object name and a longer expiry did not verify'] },
          { h: 'Cloud Storage and file formats', items: ['A create-only write sends `' + PC.sent_parameter + '`. The real service answers HTTP 412 when the object exists (documentation). The emulator accepted it and answered a wrong location, so test this in a dev project', 'The same 100,000 rows: CSV ' + (fmt('CSV')[1] / 1e6).toFixed(2) + ' MB, JSON lines ' + fmt('JSON lines')[2] + ' times that, Parquet snappy ' + fmt('Parquet (snappy)')[2] + ', zstd ' + fmt('Parquet (zstd)')[2] + ', ORC ' + fmt('ORC (zstd)')[2], 'Reading two columns of the Parquet file read ' + (FC.two_columns_share * 100).toFixed(1) + ' percent of its bytes. A gzip file cannot be split: one reader for each file'] },
          { h: 'BigQuery bytes and cost', items: ['`SELECT *` and `LIMIT 10` both billed ' + GIB(SELSTAR[4]) + ' at the size of the lessons. One UTC day with a filter: ' + GIB(ONEDAY[4]) + ' (' + ONEDAY[2] + ' partitions)', 'A Singapore day written as `DATE(ts, zone)` read ' + SGBAD[2] + ' partitions and ' + GIB(SGBAD[4]) + '. Written as two bounds: ' + SGOK[2] + ' and ' + GIB(SGOK[4]), 'The estimate comes from documented type sizes and an example price of 6.25 US dollars for each TiB. Only a dry run gives the real number'] },
          { h: 'SQL for pipelines', items: [n0(W0.raw_deliveries) + ' raw rows for ' + n0(W0.orders) + ' orders: ' + DD.ids_delivered_twice + ' arrived twice, and ' + DD.new_became_paid_on_second_delivery + ' of those first as NEW and then as PAID. `QUALIFY` keeps the latest delivery', 'Append twice: ' + n0(idem('append', 'the same batch again')[4]) + ' wrong rows. MERGE, replacing the partition and reloading: 0. MERGE with no delete left ' + idem('merge', 'corrected batch')[4] + ' orders that had vanished from the source', '`NOT IN` against a list with a NULL returned ' + NT.not_in_rows + ' customers. `NOT EXISTS` returned ' + NT.not_exists_rows + '. Guest orders have no customer id'] },
          { h: 'Pub/Sub, Beam and Dataflow', items: ['Pub/Sub model: a slow handler with a short deadline got ' + pm('slow handler', 'm1')[3] + ' deliveries. A poison message with no dead letter got ' + pm('poison, no dead letter', 'm1')[3] + ' in a minute, and with a dead letter after 5 it stopped at ' + pm('poison, dead letter after 5', 'm1')[3] + '. An ordering key held back the messages behind the poison one', 'No allowed lateness dropped ' + BL.no_lateness.dropped + ' of ' + BL.no_lateness.sent + ' events, and allowed lateness dropped ' + BL.late_accumulating.dropped + '. Session windows: a gap of 60 s gave ' + S60.length + ' sessions, a gap of 10 s gave ' + S10.length, BDL.dead + ' of ' + BDL.lines_in + ' lines went to the dead letter and the pipeline went on. ' + BD.delivered + ' deliveries kept ' + BD.kept_with_300s_windows + ' unique events with 300 s windows and ' + BD.kept_with_60s_windows + ' with 60 s'] },
          { h: 'Spark on Dataproc', items: ['Shuffle: ' + SH.tasks_per_stage_without_aqe.join(' and ') + ' tasks with the default of ' + SH.shuffle_partitions_setting + ' partitions, ' + SH.tasks_per_stage_with_aqe.join(', ') + ' with adaptive execution', 'Files written: ' + SF.map(function (r) { return r[0] + ' made ' + r[1] + ' (' + r[3] + ' KB each)'; }).join(', '), 'Skew: the largest store partition was ' + SK.by_store.largest_over_median + ' times the median, and ' + SK.by_store_and_salt.largest_over_median + ' after salting. A small table was joined by ' + SJ.small_table_join + ', and by ' + SJ.threshold_off_join + ' with the threshold off'] },
          { h: 'Orchestration, Dataform and functions', items: ['A flaky extract succeeded on try ' + AF.tasks[0].tries + ', and the run was a success. A sleep at the top of a DAG file made every parse about ' + AP.slower_by_seconds + ' s slower', 'Dataform compiled ' + DF.tables + ' tables and ' + DF.assertions + ' assertions with ' + DF.errors + ' errors, and a misspelt `ref` was an error before anything ran', 'Function tests: ' + FN.clean.passed + ' pass. When a duplicate delivery was stored twice, ' + FN.bug.failed + ' failed'] },
          { h: 'Governance and data for models', items: ['A row policy for the manager of store s01 shows ' + n0(RP.orders_visible_to_a_manager_of_s01) + ' of ' + n0(RP.orders) + ' orders. The scan for personal data (two regular expressions, a stand-in) found ' + Math.round(pii('customers.email')[2] * 100) + ' percent of the email column and ' + Math.round(pii('customers.phone')[3] * 100) + ' percent of the phone column, and nothing in the others', 'A feature built through the label window moved with the label at ' + LK.corr_leaky_feature + ', the clean one at ' + LK.corr_clean_feature, 'Split by order: ' + n0(SP.customers_in_both_when_split_by_order) + ' customers in both parts. Split by customer: ' + SP.customers_in_both_when_split_by_customer] },
          { h: 'Operations and cost', items: ['Checkov found ' + CK.baseline.failed_count + ' gaps in a small Terraform file, and the fixed file passed ' + CK.all_fixed.passed + ' checks. Read a plan for replace and destroy. A Cloud Build file with `step` for `steps` failed the schema check with exit code ' + CI.cloudbuild_bad.exit_code, 'In the made-up job log, the dashboard that refreshed every 15 minutes cost ' + usd(COST[0][3]) + ' in a week at the example price, the analysts without labels ' + usd(COST[1][3]) + ', and the nightly job ' + usd(COST[2][3]), 'Alert on freshness and lag, with a runbook. A budget warns after the spend: add early thresholds and a forecast, and use quotas and `maximum_bytes_billed` to refuse'] },
          { h: 'Say it in one line', items: ['Make every load and every run safe to repeat.', 'Filter on the partition column, and read only the columns you need.', 'Give each job its own identity and the narrowest role. No key files.', 'Everything in Git, and read the plan before you approve it.', 'Alert on what a person must act on: late data.', 'Say what you ran, say what was a stand-in, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm15-recap', n: 15, badge: 'Cloud Architect', color: '#BFDBFE',
        pts: [
          'You can follow Brewline from a **file in a bucket** through **BigQuery, Pub/Sub, Dataflow, Spark, Composer and Dataform**, to **governance, models, Terraform, delivery, alerts and cost**.',
          'You make **loads and runs safe to repeat**, you **filter on the partition column**, and you **read the plan** before you approve a change.',
          'You give every job **its own identity** and the **narrowest role**, with **no key files**.',
          'You **alert on late data**, you find the spender with a **query by label**, and you **cut bytes** before you buy capacity.',
          'You say what you **ran**, what was a **stand-in**, and when you would **check the documentation**, because Google Cloud changes its names and its limits often.'
        ],
        lines: [
          'I make everything safe to run twice.',
          'I read the plan, and I alert on late data.',
          'I say what I ran, and what I did not.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
