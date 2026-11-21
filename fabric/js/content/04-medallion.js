/* Mission 4: from bronze to gold. The silver notebook, a merge that is safe to repeat, bad rows, and the gold table. Everything here ran on real Spark and Delta Lake. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var RUNS = G.table('silver.merge_runs').rows, SM = C('silver.merge'), VR = C('silver.variants'), PL = C('silver.plain_append'), DE = C('silver.dup_error'), GT = C('gold.table'), GS = G.table('gold.sample'), CD = G.table('cdf.changes').rows, CF = C('cdf');
  var RJ = G.table('silver.rejects').rows;
  var VC = VR['with the condition'], VN = VR['with no condition'], VX = VR['changed lines only'], VT = G.table('silver.variants').rows;
  var PY = G.file('02_silver.py'), CH = G.file('02b_changed_only.py'), GOLD = G.file('03_gold.sql');
  G.expect(RUNS.length === 8 && RUNS[4][2] === 2000 && RUNS[4][3] === 40 && RUNS[5][2] === 0 && RUNS[5][3] === 0 && RUNS[6][3] === 40 && RUNS[6][7] === 0 && RUNS[7][7] === 40, 'eight merge runs: day 5 updates 40, the same file again changes nothing, a replay of day 4 reverts 40');
  G.expect(SM.rows === 10000 && SM.distinct_ids === 10000 && SM.rejects === 17 && SM.rejects_no_id === 12 && SM.rejects_amount === 5, 'silver holds 10,000 distinct orders and 17 rejected lines');
  G.expect(VN.rerun_updated === 2040 && VC.rerun_updated === 0 && VC.rerun_change_rows === 0 && VN.rerun_change_rows > 0 && VC.rerun_files_written > 0 && VX.rerun_files_written === 0, 'the three merges: no condition updates every matched row and fills the change feed, the condition updates none, and only a filtered source writes no files');
  G.expect(PL.rows_after_two_appends === 2 * PL.rows_in_file && PL.distinct_ids < PL.rows_after_two_appends, 'a plain append twice doubles the rows');
  G.expect(DE.condition === 'DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE' && DE.rows_unchanged === true, 'a source with a repeated key makes the merge fail and changes nothing');
  G.expect(GT.equal === true && GT.version === 0, 'gold adds up to silver');
  G.expect(CF.change_types.length === 4 && CD.length === 4, 'the change feed has four change types');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Bronze to gold', short: 'Medallion', blurb: 'A merge that is safe to repeat, bad rows kept, and a gold table', minutes: 28,
    focus: ['mart', 'air'],
    goals: [
      'Write a silver step that **types**, **rejects** bad rows and **merges** by key.',
      'Say what a merge **condition** prevents, and why a repeat is not the same as a **replay**.',
      'Explain the error of a source that has the **same key twice**.',
      'Build a **gold** table and check that it adds up.'
    ],
    say: 'This is the mission that you will be asked to whiteboard. The silver notebook is short, and almost every line of it answers an interview question: why a bad row is kept, why a merge has a condition, why the source must have one row for each key. I ran it for the five daily files, then again, then in the wrong order. All the numbers are from real Spark and Delta Lake.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'rec', title: 'The silver step for one day', g: 'medallion', legend: true,
        steps: [
          { say: 'The bronze table holds every line of every file, as text. Silver is typed, has one row for each order, and can be rerun. Press Next.', focus: ['br', 'sv', 'go', 'rej'], cap: 'Bronze on the left, gold on the right.' },
          { say: 'Step 1. The notebook picks **one day** of bronze by its source file, and **tries to type** the columns with `try_cast`, which gives NULL where a value does not fit and does not stop the job.', on: ['e2'], focus: ['br', 'sv'], cap: 'Pick a day and try to type it.' },
          { say: 'Step 2. A line with **no order id** or **an amount that is not a number** cannot be loaded. It goes to a **rejects** table with the reason, and the day goes on. The recording sent ' + SM.rejects + ' lines there.', on: ['e5'], focus: ['sv', 'rej'], tags: ['tg_rej'], cap: 'Bad lines are kept, with a reason.' },
          { say: 'Step 3. The good lines are made unique by order id, and **merged** into silver: new orders are inserted, and an order that already exists is updated **only if its status or amount differs**.', on: ['e3'], focus: ['sv'], tags: ['tg_merge'], cap: 'Merge by key, with a condition.' },
          { say: 'Step 4. Gold is built from silver. If the silver step runs twice, silver must not change, and so gold must not change. That is the property that makes a retry safe.', on: ['e4'], focus: ['sv', 'go'], tags: ['tg_gold'], cap: 'A rerun changes nothing.' }
        ]
      }),

      B.code({
        id: 'm4-code', t: 1, src: 'rec', title: 'The silver notebook', file: '02_silver.py', lang: 'python', code: PY,
        steps: [
          { say: 'This is the second cell of the notebook. It cleans **one day** of bronze and merges it. I ran it for five days, and the lines of the next screens are its results. Press Next.', lines: null },
          { say: '`prepare` takes one day. Its rows are picked by their `_source_file`, and three columns are typed with `try_cast`. `try_cast` returns NULL for a value that does not fit. A plain `cast` would stop the whole job in Spark 4, which is stricter than older versions.', lines: G.span(PY, /def prepare/, /amount_n/) },
          { say: 'A line is **bad** if it has no order id or its amount could not be typed. This is the one place where the notebook decides what is acceptable.', lines: G.span(PY, /is_bad = /) },
          { say: 'The bad lines are **appended to a rejects table** with a reason. Nothing is dropped silently, and somebody can look at the table in the morning.', lines: G.span(PY, /typed\.where\(is_bad\)/, /saveAsTable\("silver_rejects"\)/) },
          { say: 'The good lines are typed and made **unique by order id**. A merge refuses a source in which one key appears twice, as a later screen shows.', lines: G.span(PY, /typed\.where\(~is_bad\)/, /dropDuplicates/) },
          { say: '`to_silver` is the merge: match on the order id. A matching row is updated **only when the status or the amount differs**. A row that does not match is inserted. This condition is what makes a repeat of the same file change no row.', lines: G.span(PY, /def to_silver/, /\.execute\(\)/) }
        ],
        note: 'The condition compares only the columns that can change. List them with care: a column that is missing from the condition is a change that is never applied.'
      }),

      B.term({
        id: 'm4-rejects', t: 1, src: 'rec', title: 'The rows that could not be loaded',
        say: 'After the five days I asked the rejects table what it held.',
        lines: function () {
          return G.term([['SELECT _reason, count(*) AS rows, min(_source_file) FROM silver_rejects GROUP BY _reason;', RJ.map(function (r) { return r[0] + ' | ' + r[1] + ' | ' + r[2]; }).join('\n')]]);
        },
        after: '**' + SM.rejects_no_id + '** lines had no order id (in the day 2 file) and **' + SM.rejects_amount + '** had an amount that is not a number (in the day 3 file). They are in the rejects table with their source file and a reason, and not in silver. The report is right, and the five lines are not lost. Add a rule: a rejects table that grows faster than usual is an alert.',
        afterKind: 'tip',
        doneSay: 'Bad lines are kept with a reason.'
      }),

      B.widget({ id: 'm4-lab', kind: 'mergelab', t: 1, src: 'rec', title: 'Lab: eight runs of the silver merge' }),

      B.term({
        id: 'm4-runs', t: 1, src: 'rec', title: 'Eight runs, in numbers',
        say: 'The same eight runs as in the lab, as the history of the table printed them.',
        lines: function () {
          return G.term([['SELECT run, inserted, updated, version, rows_in_table, cancelled FROM runs;', RUNS.map(function (r) { return r[0] + ' | ' + r[2] + ' | ' + r[3] + ' | ' + r[4] + ' | ' + n(r[5]) + ' | ' + r[7]; }).join('\n')]]);
        },
        after: 'Days 1 to 4 inserted **2,000** orders each. Day 5 inserted 2,000 and **updated ' + RUNS[4][3] + '**. The same day 5 again changed **no row**: **' + RUNS[5][2] + '** inserted, **' + RUNS[5][3] + '** updated. It still made version ' + RUNS[5][4] + ' and Delta rewrote **' + RUNS[5][8] + '** files that hold the rows that matched, with the same rows in them. That is a safe repeat. The next two lines are not: **replaying day 4** after day 5 updated **' + RUNS[6][3] + '** rows back to their old status, and the cancelled orders fell from ' + RUNS[5][7] + ' to **' + RUNS[6][7] + '**.',
        afterKind: 'warn',
        doneSay: 'Repeating is safe. Replaying an old file out of order is not.'
      }),

      B.cmp({
        id: 'm4-variants', t: 1, src: 'rec', title: 'Three versions of the merge, each run twice',
        say: 'I made three copies of the silver step. One has the condition of the notebook, one has no condition, and one merges only the lines that are new or different. Each ran for the five days and then for day 5 a second time, on tables that record their changes.',
        cols: ['Merge', 'Rows updated by the second run', 'Files rewritten', 'Change records', 'Made a commit'],
        hl: 0,
        rows: VT.map(function (r) { return [r[0], n(r[1]), n(r[2]), n(r[3]), r[4] ? 'yes' : 'no']; }),
        steps: [
          { upto: 1, say: 'The condition of the notebook: the second run updated **' + VC.rerun_updated + '** rows and recorded **' + VC.rerun_change_rows + '** changes. The table says that nothing happened, which is true. Delta still rewrote **' + VC.rerun_files_written + '** files, because a merge rewrites every file that holds a row that **matches**, whether or not that row changes.' },
          { upto: 2, say: 'No condition: **' + n(VN.rerun_updated) + '** rows updated, and the change feed holds **' + n(VN.rerun_change_rows) + '** records for a file that held nothing new. The table is the same, and every step that reads the changes does the work again.' },
          { upto: 3, say: 'Only the new or different lines: nothing matched, so **' + VX.rerun_files_written + '** files were rewritten and the run made ' + (VX.rerun_commit ? 'a commit' : '**no commit**') + '. For a big table this is the version to use, and the filter is a join of the source against the table.' }
        ]
      }),

      B.code({
        id: 'm4-changed', t: 2, src: 'rec', title: 'Merging only what changed', file: '02b_changed_only.py', lang: 'python', code: CH,
        steps: [
          { say: 'A later cell of the same notebook. It reuses `prepare` from the cell before and filters the source before the merge. Press Next.', lines: null },
          { say: '`same` says when a line is **identical** to the row of the table: same key, same status, same amount. `eqNullSafe` treats two NULLs as equal.', lines: G.span(CH, /same = \(/, /eqNullSafe\(F\.col\("t\.amount"\)\)/) },
          { say: 'A **left anti join** keeps the lines of the source that have **no identical row** in the table: the new ones and the changed ones.', lines: G.span(CH, /changed = good/) },
          { say: 'Now the merge has no condition on the matched rows, because every matching line is a real change. A file whose rows are all unchanged is not touched.', lines: G.span(CH, /DeltaTable\.forName/, /\.execute\(\)/) }
        ],
        note: 'The join reads the target table, so it costs a read. It pays when the table is large and the changes are few. On a small table the condition of the first notebook is enough.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'Gold is rebuilt from the changes of silver, so that only the days and stores that changed are recomputed. Every night it recomputes everything, and the numbers are right. Click the line in the silver merge that causes it.',
        file: 'silver_merge.py', lang: 'python',
        code: '(\n    DeltaTable.forName(spark, "silver_orders").alias("t")\n    .merge(good.alias("s"), "t.order_id = s.order_id")\n    .whenMatchedUpdateAll()\n    .whenNotMatchedInsertAll()\n    .execute()\n)\n',
        bad: [4],
        hint: 'What does the change feed record for a row that matches and has not changed?',
        why: '`whenMatchedUpdateAll()` with **no condition** updates every row that matches, including the rows with the same values. In the recording the second run of the same file updated **' + n(VN.rerun_updated) + '** rows and the change feed held **' + n(VN.rerun_change_rows) + '** records for it. With the condition it updated **' + VC.rerun_updated + '** rows and recorded **' + VC.rerun_change_rows + '**. Compare the columns that can change.',
        fix: '(\n    DeltaTable.forName(spark, "silver_orders").alias("t")\n    .merge(good.alias("s"), "t.order_id = s.order_id")\n    .whenMatchedUpdateAll(condition="t.status <> s.status OR t.amount <> s.amount")\n    .whenNotMatchedInsertAll()\n    .execute()\n)\n',
        cheer: 'Write only what changed.'
      }),

      B.term({
        id: 'm4-plain', t: 1, src: 'rec', title: 'A plain append is not a load',
        say: 'For comparison I appended the day 4 file to a table twice, with no merge.',
        lines: function () {
          return G.term([
            ['SELECT count(*) FROM silver_plain;   -- the day 4 file, appended twice', String(PL.rows_after_two_appends)],
            ['SELECT count(DISTINCT order_id) FROM silver_plain;', String(PL.distinct_ids)]
          ]);
        },
        after: 'The file had **' + n(PL.rows_in_file) + '** lines. Two appends made **' + n(PL.rows_after_two_appends) + '** rows for **' + n(PL.distinct_ids) + '** orders: every order is there twice, and every revenue figure is doubled. A pipeline that retries a failed append does this. A merge by key does not.',
        afterKind: 'warn',
        doneSay: 'A retry of a plain append doubles the data.'
      }),

      B.term({
        id: 'm4-dup', t: 1, src: 'rec', title: 'A source that has the same key twice',
        say: 'A merge needs **one source row for each target row**. I gave it two rows with the same order id and different amounts.',
        lines: function () { return G.plain(X('silver.dup_error')); },
        after: 'Delta refused with `' + DE.condition + '`: if two source rows match one target row, **the result would depend on the order**, so there is no right answer. The table was not changed (' + (DE.rows_unchanged ? 'the row count stayed the same' : 'check it') + '). That is why the notebook ends the `good` frame with `dropDuplicates(["order_id"])`. If the choice of the surviving row matters, choose it on purpose, for example the latest by a timestamp.',
        afterKind: 'tip',
        doneSay: 'One source row for each key.'
      }),

      B.cmp({
        id: 'm4-replay', t: 2, src: 'rec', title: 'Safe to repeat is not safe to replay',
        say: 'The two properties are easy to confuse. Press Next to compare them with the recorded runs.',
        cols: ['', 'Repeat', 'Replay out of order'],
        hl: 2,
        rows: [
          ['What you do', 'Run day 5 again, straight away', 'Run day 4 again after day 5 has been loaded'],
          ['What the merge does', 'Rows match and nothing differs: ' + RUNS[5][3] + ' updated', 'Rows match and the **older** values differ: ' + RUNS[6][3] + ' updated'],
          ['Cancelled orders', String(RUNS[5][7]) + ' before and after', RUNS[5][7] + ' before, **' + RUNS[6][7] + '** after'],
          ['The fix', 'Nothing: the condition already handles it', 'A column that says which version of a row is newer, and a condition that updates only to a newer one']
        ],
        steps: [
          { upto: 2, say: 'A repeat changes nothing, because the file holds what the table already has. A replay of an older file holds older values, and the condition says "different".' },
          { upto: 4, say: 'The condition needs to know **which is newer**. Use a timestamp or a version that the source provides, and compare it: update only when the source row is newer than the target row.' }
        ]
      }),

      B.code({
        id: 'm4-gold', t: 1, src: 'rec', title: 'The gold table', file: '03_gold.sql', lang: 'sql', code: GOLD,
        steps: [
          { say: 'Gold is the table that the report reads. It is a Spark SQL cell. Press Next.', lines: null },
          { say: '`CREATE OR REPLACE TABLE ... AS SELECT` builds the table from silver in one step. In a Fabric notebook this creates a Delta table by default. The recording set the same default.', lines: G.span(GOLD, /CREATE OR REPLACE/) },
          { say: 'One row for each **store and day**, with the number of orders and the revenue. Refunded orders are left out of both.', lines: G.span(GOLD, /SELECT CAST/, /SUM\(amount\)/) },
          { say: 'The `WHERE` and the `GROUP BY` say which orders count. This is a **business rule**, so it is in one place, and a report cannot disagree with another report about it.', lines: G.span(GOLD, /WHERE status/, /GROUP BY/) }
        ],
        note: 'The first run is version 0 of the table. Every rebuild is a new version, so an earlier gold can still be read while its files exist.'
      }),

      B.term({
        id: 'm4-goldrun', t: 1, src: 'rec', title: 'Does gold add up?',
        say: 'After the five days I built gold, and checked it against silver.',
        lines: function () {
          return G.term([
            ['SELECT order_date, store_id, orders, revenue FROM gold_daily_revenue ORDER BY 1, 2 LIMIT 6;', GS.rows.map(function (r) { return r.join(' | '); }).join('\n')],
            ['SELECT sum(revenue) FROM gold_daily_revenue;   -- against silver without refunds', GT.revenue.toFixed(2) + '   (silver: ' + GT.silver_revenue.toFixed(2) + ')']
          ]);
        },
        after: 'Gold has **' + GT.rows + '** rows (5 days times 12 stores) and **' + n(GT.orders) + '** orders. Its revenue is **' + n(GT.revenue) + '**, equal to the same sum over silver. This check is cheap and worth keeping in the pipeline: **a gold table that does not add up to silver is a bug**, whatever the dashboard says.',
        afterKind: 'tip',
        doneSay: 'Gold must add up to silver.'
      }),

      B.cmp({
        id: 'm4-cdf', t: 3, src: 'rec', title: 'Change data feed: what changed, and not just what is there',
        say: 'Rebuilding gold from all of silver every night is simple and gets slow. Delta can record the changes of a table if you ask. I enabled the **change data feed** on a copy of silver and ran the five days again.',
        cols: ['Change type', 'Rows', 'What it is'],
        hl: 0,
        rows: [
          [CD[0][0], n(CD[0][1]), 'The row that was removed (one order was deleted by hand)'],
          [CD[1][0], n(CD[1][1]), 'A row that is new in this table'],
          [CD[2][0], n(CD[2][1]), 'A changed row, with its **new** values'],
          [CD[3][0], n(CD[3][1]), 'The same changed row, with its **old** values']
        ],
        steps: [
          { upto: 2, say: 'Inserts and deletes are what you expect. Every row of silver was inserted once, **' + n(CD[1][1]) + '** of them.' },
          { upto: 4, say: 'An update appears **twice**, as a before and an after. The **' + CD[2][1] + '** cancelled orders of day 5 are 40 pairs. A later step can read only these rows with `table_changes`, and update gold for the days and stores that they touch.' }
        ]
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'You run the silver notebook twice for the same day. What should the second run do to silver?',
        opts: [
          { t: 'Nothing: no rows inserted, no rows updated', fb: '' },
          { t: 'Insert the file again, so the table has every order twice', fb: 'That is a plain append, and it doubled the rows in the recording.' },
          { t: 'Delete and reload the table', fb: 'It would work and costs a full rewrite every night.' },
          { t: 'Fail, because the rows exist', fb: 'A merge does not fail on existing keys.' }
        ],
        ok: 0, why: 'The recording: the second run of day 5 inserted ' + RUNS[5][2] + ' rows and updated ' + RUNS[5][3] + '. Delta still rewrote the ' + RUNS[5][8] + ' files that hold matching rows, with the same rows in them.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'The merge fails with `' + DE.condition + '`. What is the cause?',
        opts: [
          { t: 'Two rows of the source match the same row of the target', fb: '' },
          { t: 'The target table is locked', fb: 'Delta does not lock tables for readers, and this error is about the data.' },
          { t: 'The target has more rows than the source', fb: 'That is normal.' },
          { t: 'The schema of the source has an extra column', fb: 'That gives a schema error, not this one.' }
        ],
        ok: 0, why: 'A merge needs one source row for each target row. Remove duplicates before the merge, and choose the surviving row on purpose.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'Why does the silver notebook send the bad lines to a rejects table?',
        opts: [
          { t: 'So that nothing is dropped silently and somebody can look at them', fb: '' },
          { t: 'Because Delta cannot store NULL', fb: 'It can.' },
          { t: 'To make silver smaller', fb: 'The rejects are 17 lines. The reason is traceability.' },
          { t: 'Because merges cannot handle NULL keys', fb: 'The lines are kept for their own sake, not because of the merge.' }
        ],
        ok: 0, why: 'The recording kept ' + SM.rejects_no_id + ' lines without an order id and ' + SM.rejects_amount + ' with a bad amount, each with its source file and a reason.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2,
        q: 'The day 4 file is replayed after the day 5 file. What happens in the recording?',
        opts: [
          { t: String(RUNS[6][3]) + ' rows go back to an older status, because the condition only asks "different"', fb: '' },
          { t: 'Nothing, because the merge is idempotent', fb: 'Idempotent means a repeat is safe. It does not order the versions of a row.' },
          { t: 'The merge fails', fb: 'It ran and updated rows.' },
          { t: 'Silver gets the old rows as new ones', fb: 'The keys exist, so they match and are updated.' }
        ],
        ok: 0, why: 'The cancelled orders fell from ' + RUNS[5][7] + ' to ' + RUNS[6][7] + ' and came back with the second replay of day 5. A condition on a version or a timestamp prevents it.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps of the silver notebook in order.',
        items: ['Pick the rows of one day from bronze by source file', 'Type the columns with `try_cast`', 'Append lines with no id or a bad amount to the rejects table, with a reason', 'Make the good lines unique by order id', 'Merge into silver, updating only rows that differ', 'Build gold and check that it adds up to silver'],
        why: 'Type first, route the bad lines, make the keys unique, and merge with a condition. Gold comes last, and the check at the end catches a mistake in any step.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'rec', title: 'Decision: how does silver follow the daily file?',
        scenario: 'Orders arrive in daily files. A few hundred old orders change status each day. Reports need the current status. The source can resend an old file after an outage.',
        opts: [
          { t: 'Merge by order id with a condition on the columns that change, and add a version or timestamp to the condition', d: 'A rerun changes nothing, a retry is safe, and a replay of an older file cannot revert a newer value.', lose: 'The source needs a version or timestamp column, and the condition has to list the columns that can change.' },
          { t: 'Merge by order id with a condition on the columns only', d: 'Simple, and safe to repeat. The recording: the second run of the same file changed nothing.', lose: 'A replay out of order reverts rows. In the recording 40 orders went back to an older status.' },
          { t: 'Append every file and take the latest row of each order when you read', d: 'No merge, and a full history.', lose: 'Every reader has to know the rule, the table grows without end, and a plain append of a retried file doubled the rows in the recording.' },
          { t: 'Overwrite silver from all of bronze every night', d: 'Always right, with no state to protect.', lose: 'A full rewrite every night. It works while the table is small and stops working when it is not.' }
        ],
        pick: 0,
        why: 'The recording shows both failures of the simpler options: a retried append doubled the rows, and a replay reverted 40 orders. A merge with a condition and a version handles a repeat and an out-of-order file.',
        when: 'If files always arrive in order and are never resent, the condition on the columns is enough.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: yesterday\'s revenue is exactly double', time: '07:05',
        alert: '**The revenue of yesterday is twice what the stores report.** The pipeline had a failure at 02:10 and retried. Silver shows two rows for every order of yesterday.',
        clues: ['The silver step appends the day\'s file to silver and does not merge', 'The pipeline has `retry: 2` on the notebook activity', 'The first run wrote its rows before it failed on a later cell'],
        opts: [
          { t: 'Rebuild silver for the day with a merge by key, and change the notebook so that a retry cannot add rows again', fb: '' },
          { t: 'Divide the revenue by two in the report', fb: 'Next time the job does not fail and the figure is wrong again.' },
          { t: 'Remove the retry from the pipeline', fb: 'The retry is fine when the notebook is safe to repeat. The notebook is the problem.' },
          { t: 'Delete yesterday\'s rows from silver and wait for tomorrow', fb: 'Yesterday would be missing from the report.' }
        ],
        best: 0,
        why: 'A plain append is not safe to repeat. In the recording the same file appended twice gave ' + n(PL.rows_after_two_appends) + ' rows for ' + n(PL.distinct_ids) + ' orders. A merge by key gives the same table however often it runs, which is what makes a retry safe.',
        checks: [
          ['Check the counts', 'Rows against distinct order ids in silver.'],
          ['Find the retry', 'The pipeline ran the notebook twice.'],
          ['Find the append', 'The notebook adds rows without a key.'],
          ['Fix and rebuild', 'Merge by key, then rebuild gold for the day.']
        ],
        tell: 'The silver notebook appended rows without a key, the pipeline retried it after a failure and the day was added twice, so revenue doubled. I changed it to merge by order id, rebuilt the day, and added a check that rows equal distinct order ids.',
        prevent: ['**Merge by key** in silver', 'Check **rows against distinct keys** after every load', 'Make every notebook **safe to repeat** before you add a retry']
      }),

      B.qa({
        id: 'qa-medallion', t: 1, tag: 'Fabric', secs: 75,
        q: 'Explain the medallion architecture with your own example.',
        pts: ['Bronze: raw, as it arrived', 'Silver: typed, cleaned, deduplicated', 'Gold: business tables', 'Each layer can be rebuilt from the one before'],
        short: 'It is three layers of tables in a lakehouse. **Bronze** holds the data as it arrived, as text, with the source file added, so nothing is lost. **Silver** types the columns, sends lines that cannot be loaded to a rejects table, and merges by key so that there is one row for each order and a rerun changes nothing. **Gold** holds the tables that reports read, here one row for each store and day. Each layer can be rebuilt from the one before. In my example five daily files gave 10,157 lines in bronze, 10,000 orders in silver and 17 rejected lines, and a gold table with 60 rows whose revenue equals the sum over silver.',
        fu: [['Why not load straight to gold?', 'A bad line would stop it, and you could not rebuild.'], ['Where do the layers live?', 'Each is a Delta table. They can be in one lakehouse or several.']],
        trap: 'Describing the layers without saying how a rerun behaves.',
        real: 'Describe the layers of the last pipeline you built.'
      }),

      B.qa({
        id: 'qa-merge', t: 1, tag: 'Fabric', secs: 75,
        q: 'How do you write a merge that is safe to run twice?',
        pts: ['Match on a key', 'Update only when something differs', 'One source row for each key', 'A version or timestamp for out of order files'],
        short: 'I match on the business key, insert rows that do not match, and update a matching row only when something differs, with `whenMatchedUpdateAll(condition=...)` on the columns that can change. I also make the source unique by key, because Delta refuses a merge in which two source rows match one target row. In my recording the second run of the same file inserted nothing and updated nothing, while the same merge without the condition updated all 2,040 matched rows and filled the change feed with 4,080 records. A merge still rewrites every file that holds a matching row, so on a big table I also filter the source to new or different lines first. A repeat is not a replay: running an older file after a newer one reverted 40 rows, so I add a version or timestamp column to the condition.',
        fu: [['What about deletes?', '`whenMatchedDelete` or `whenNotMatchedBySourceDelete`, with a rule for when a missing row is a delete.'], ['How do you test it?', 'Run it twice and compare, then run an old file.']],
        trap: 'An unconditional update.',
        real: 'Say how you tested your last merge.'
      }),

      B.qa({
        id: 'qa-duplicates', t: 1, tag: 'Fabric', secs: 60,
        q: 'A merge fails because of duplicate keys in the source. What do you do?',
        pts: ['It is the error DELTA_MULTIPLE_SOURCE_ROW_MATCHING...', 'Two source rows match one target row', 'Remove duplicates on purpose', 'Choose the surviving row by a rule'],
        short: 'The error says that multiple source rows matched and attempted to modify the same target row. The result would depend on the order of the rows, so Delta refuses, and in my recording the table was not changed. I make the source unique by key before the merge. With `dropDuplicates` the surviving row is arbitrary, so if it matters I choose it on purpose, for example the row with the latest timestamp, with a window function. I also look at why the source has duplicates, because they may be a real problem upstream, and I count them in a check so that a change in their number is visible.',
        fu: [['Is it the same in SQL MERGE?', 'Yes, the same rule.'], ['Could you ignore it?', 'No, the choice of row decides the data.']],
        trap: 'Using dropDuplicates and never looking at what it dropped.',
        real: 'Describe a duplicate that was a real problem.'
      }),

      B.qa({
        id: 'qa-badrows', t: 1, tag: 'Fabric', secs: 60,
        q: 'How do you handle bad rows in a load?',
        pts: ['Do not stop the load', 'Do not drop them silently', 'A rejects table with a reason', 'Alert on its growth'],
        short: 'A bad line should not stop the night, and it should not vanish. In my silver notebook I type with `try_cast`, which gives NULL for a value that does not fit, and treat a line as bad when it has no key or a column cannot be typed. Those lines are appended to a rejects table with the source file and a reason, and the good lines go on. In the recording 12 lines had no order id and 5 had an amount that was not a number, and all 17 were in the rejects table the next morning. I alert when the rejects table grows faster than usual, and I tell the owner of the feed. If a feed starts to send many rejects, I want to know that more than I want a green job.',
        fu: [['What about a threshold?', 'Fail the job if rejects exceed a percentage, so a broken feed does not look healthy.'], ['Who fixes them?', 'The owner of the source, with the table as evidence.']],
        trap: 'Filtering bad rows out with no record.',
        real: 'Say how you found out about your last bad feed.'
      }),

      B.qa({
        id: 'qa-cdf', t: 3, tag: 'Fabric', secs: 60,
        q: 'What is the Delta change data feed and when do you use it?',
        pts: ['A table property that records changes', 'Insert, update_preimage, update_postimage, delete', 'Read with table_changes', 'Incremental downstream steps'],
        short: 'The change data feed is a Delta table property, `delta.enableChangeDataFeed`, that makes the table record row-level changes. `table_changes` then returns the rows that changed since a version, with a change type: insert, delete, and an update as two rows, the values before and after. I use it for incremental steps: instead of rebuilding gold from all of silver, I read only the changes and update the days and stores that they touch. In my recording a silver copy with the feed showed 10,000 inserts, 40 updates as 40 pairs and one delete. It adds some storage and write cost, so I turn it on only for tables that feed an incremental step.',
        fu: [['Is it on by default?', 'No, you set the property.'], ['Does it replace a merge?', 'No. It reads changes. The merge makes them.']],
        trap: 'Enabling it on every table.',
        real: 'Describe a gold table that was too slow to rebuild.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Medallion Builder', color: '#BBF7D0',
        pts: [
          'Silver **types with `try_cast`**, sends bad lines to a **rejects table** (' + SM.rejects + ' in the recording) and **merges by key**.',
          'A merge **condition** made a repeat of day 5 update **' + VC.rerun_updated + '** rows. Without it, **' + n(VN.rerun_updated) + '** rows were updated and **' + n(VN.rerun_change_rows) + '** changes were recorded.',
          'A **plain append** twice gave ' + n(PL.rows_after_two_appends) + ' rows for ' + n(PL.distinct_ids) + ' orders.',
          'Two source rows for one key fail with `' + DE.condition + '`.',
          'A **replay** of day 4 reverted **' + RUNS[6][3] + '** rows. Gold equals silver: **' + n(GT.revenue) + '**.'
        ],
        lines: [
          'I can write a merge that is safe to repeat.',
          'I can say what a replay does.',
          'I check that gold adds up to silver.'
        ]
      })
    ]
  });
})();
