/* Mission 9: boss round. Two drills that mix the missions, a design decision, a coding round, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, n = G.n, M = function (k) { return G.meta(k); };
  var BL = C('bronze.log'), SM = C('silver.merge'), PL = C('silver.plain_append'), DE = C('silver.dup_error'), GT = C('gold.table'), GP = C('gold.pinned');
  var VR = C('silver.variants'), VC = VR['with the condition'], VN = VR['with no condition'], VX = VR['changed lines only'];
  var RUNS = G.table('silver.merge_runs').rows, RT = C('bronze.retry');
  var SCH = C('schema.mismatch'), SK = C('schema.constraints'), FS = C('files.small'), FO = C('files.optimize'), FV = C('files.vacuum'), TE = C('files.timetravel_error');
  var PLY = G.table('partition.layout').rows, RS = C('restore'), DR = C('drop'), CF = C('cdf'), IN = C('bronze.infer');
  var CHG = G.file('02_silver.py');
  var QA = [['qa-what', 1], ['qa-lakewh', 1], ['qa-capacity', 1],
    ['qa-delta', 1], ['qa-time', 1], ['qa-files', 1], ['qa-shortcut', 2],
    ['qa-notebook', 1], ['qa-default-lh', 1], ['qa-bronze-text', 1], ['qa-vorder', 3],
    ['qa-medallion', 1], ['qa-merge', 1], ['qa-duplicates', 1], ['qa-badrows', 1], ['qa-cdf', 3],
    ['qa-schema', 1], ['qa-optimize', 1], ['qa-vacuum', 1], ['qa-partition', 2], ['qa-restore', 2],
    ['qa-endpoint', 1], ['qa-directlake', 1], ['qa-t-sql', 2], ['qa-fallback', 2],
    ['qa-pipeline', 1], ['qa-retry', 1], ['qa-dataflow', 1], ['qa-realtime', 2],
    ['qa-throttling', 1], ['qa-cicd', 1], ['qa-roles', 1], ['qa-cost', 2]];
  var SOL = 'def merge_day(good, target="silver_orders"):\n    (\n        DeltaTable.forName(spark, target).alias("t")\n        .merge(good.dropDuplicates(["order_id"]).alias("s"), "t.order_id = s.order_id")\n        .whenMatchedUpdateAll(condition="t.status <> s.status OR t.amount <> s.amount")\n        .whenNotMatchedInsertAll()\n        .execute()\n    )\n';

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a design decision, a coding round, a mock interview and a one-page review', minutes: 40,
    focus: ['src', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'ci'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write the **idempotent silver merge** from a list of requirements.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm9-drill1', t: 1, src: 'rec', title: 'Drill 1: revenue is double and the folder keeps growing', time: '06:55',
        alert: '**Yesterday\'s revenue is exactly twice what the stores report, and the silver folder has far more files than last week.** The nightly pipeline failed at 02:14 on a later cell and its retry succeeded. The silver notebook has a merge, and nobody has looked at it since it was written.',
        clues: ['The landing notebook appends the file with `mode("append")`', 'The silver merge has `whenMatchedUpdateAll()` with no condition', 'No maintenance notebook has ever run'],
        opts: [
          { t: 'Make landing replace the rows of its source file, give the merge a condition, repair the day, and add the weekly OPTIMIZE and VACUUM notebook', fb: '' },
          { t: 'Remove the retry and divide yesterday\'s revenue by two', fb: 'The retry is fine for a step that is safe to repeat. The figure would be wrong again on the next failure.' },
          { t: 'Delete the silver table and rebuild it from bronze', fb: 'Bronze has the doubled lines too, so the rebuild would repeat the problem.' },
          { t: 'Double the capacity', fb: 'The data is wrong because of the steps, not because of the units.' }
        ],
        best: 0,
        why: 'Three missions at once. **Mission 7**: the retry of a plain append gave **' + n(RT.plain_rows_after_two_runs) + '** lines for a file of **' + n(RT.rows_in_file) + '**, and `replaceWhere` kept **' + n(RT.once_rows_after_three_runs) + '**. **Mission 4**: a merge without a condition updated **' + n(VN.rerun_updated) + '** rows on a repeat and filled the change feed with **' + n(VN.rerun_change_rows) + '** records. **Mission 5**: nothing compacted the files that those writes made.',
        checks: [
          ['Compare counts', 'Lines in bronze against lines in the file, rows against distinct keys in silver.'],
          ['Read the pipeline log', 'A failure after the append, then a retry.'],
          ['Read the merge', 'A matched update with no condition.'],
          ['Fix and repair', 'Replace the rows of the file, add the condition, repair the day, schedule maintenance.']
        ],
        tell: 'The landing step appended twice because of the retry, so bronze and then the report had every line of yesterday twice. The silver merge also updated every matched row each night, and nothing compacted the files. I changed landing to replace the rows of its file, gave the merge a condition, repaired the day and added a weekly maintenance notebook.',
        prevent: ['Make every step **safe to repeat** before you add a retry', 'Give every merge a **condition**, and check rows against distinct keys', '**Schedule** OPTIMIZE and VACUUM']
      }),

      B.incident({
        id: 'm9-drill2', t: 2, src: 'docs', title: 'Drill 2: analysts are rejected at 09:00 and last week cannot be read', time: '09:20',
        alert: '**At 09:00 analysts got "capacity limit" errors, and one of them cannot read `silver_orders` as of last Monday.** Yesterday a colleague added a maintenance notebook: `OPTIMIZE` and `VACUUM RETAIN 0 HOURS` on every table, scheduled at 08:30, on the same F64 that the analysts use.',
        clues: ['The capacity metrics show a stage in which interactive requests are rejected', 'The maintenance notebook rewrites every table', 'The time travel error names a file that does not exist'],
        opts: [
          { t: 'Stop the maintenance run, move it off peak and to a size that does not rewrite everything, and use the default retention', fb: '' },
          { t: 'Restore silver to last Monday', fb: 'The files of that version are gone, so a restore cannot work.' },
          { t: 'Double the capacity and keep the notebook', fb: 'The notebook still deletes the history, and the capacity bill is higher.' },
          { t: 'Tell the analyst that time travel is broken', fb: 'It works while the files exist. The notebook removed them.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 8**: a heavy background job on the shared capacity pushed it into the stage that rejects interactive requests, and smoothing makes the effect last for hours. **Mission 5**: a vacuum with zero hours deleted the files of the old versions, and reading version 5 failed with `' + TE.condition + '` in the recording. The fix is the opposite of both: off peak, and the default retention.',
        checks: [
          ['Find the stage', 'Capacity metrics: the throttling stage and its start.'],
          ['Find the job', 'The maintenance notebook at 08:30.'],
          ['Read the history error', 'The files of an old version were vacuumed.'],
          ['Fix both', 'Stop and move the job, and set the retention back to the default of 7 days.']
        ],
        tell: 'A maintenance notebook ran at the start of the working day on the shared capacity, which put it into the stage that rejects interactive requests, and its zero-hour vacuum deleted the history that the analyst needed. I stopped it, moved it to the night, and set the retention back to the default. I will review maintenance notebooks like production code.',
        prevent: ['Run **maintenance off peak**', 'Keep the **retention** at 7 days or more', 'Keep **production** on its own capacity']
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: how should Brewline lay out Fabric?',
        scenario: 'Four data engineers write PySpark. Eight analysts write T-SQL, and a few of them need tables of their own. A model reads gold for fifteen reports. There are development, test and production stages, and the nightly pipeline must not be rejected.',
        opts: [
          { t: 'Lakehouse for bronze, silver and gold, read by analysts through its SQL endpoint, a warehouse for the analysts\' own tables, a Direct Lake model on gold, separate workspaces for each stage, and production on its own capacity', d: 'Each group works in a tool it knows. Gold is stored once, an experiment cannot throttle the pipeline, and a change moves from stage to stage.', lose: 'More items and more capacities to run, and rules for what the analysts may do in the warehouse.' },
          { t: 'One workspace, one lakehouse and one capacity for everything', d: 'The simplest to run.', lose: 'Analysts cannot create tables through the read-only endpoint, and an experiment shares the pool with the pipeline.' },
          { t: 'Everything in one warehouse', d: 'One T-SQL place for everybody.', lose: 'The engineers lose the files area and the notebook workflow, and the medallion layers are harder to build.' }
        ],
        pick: 0,
        why: 'Every row of the answer comes from a mission: the **endpoint is read-only** (6), **Direct Lake** reads gold in place (6), **the capacity is the shared part** (1 and 8), and **stages are separate workspaces** (8). It costs items and capacities and saves incidents. This is from documentation.',
        when: 'A small team without analysts who build tables can start with one lakehouse, one workspace and one capacity, and split when the first heavy job hurts.'
      }),

      B.challenge({
        id: 'm9-ch', t: 1, title: 'Coding round: the silver merge', file: 'silver_merge.py', lang: 'python',
        q: 'A DataFrame `good` holds one day of typed orders (`order_id`, `store_id`, `customer_id`, `order_ts`, `status`, `amount`) and **may hold the same `order_id` twice**. Write `merge_day(good, target)` for the Delta table `silver_orders` so that: a new order is **inserted**, an existing order is **updated only if its `status` or `amount` differs**, the same day run **twice changes no row**, and a repeated key in `good` does **not** make the merge fail.',
        starter: 'from delta.tables import DeltaTable\n\n\ndef merge_day(good, target="silver_orders"):\n    ...\n',
        hints: ['A merge refuses a source in which one key appears twice. `good.dropDuplicates(["order_id"])` makes it unique.', '`DeltaTable.forName(spark, target).alias("t").merge(source.alias("s"), "t.order_id = s.order_id")` starts the merge.', '`whenMatchedUpdateAll(condition="...")` takes a SQL condition on the matched row. Compare `status` and `amount`.', '`whenNotMatchedInsertAll()` inserts the new orders, and `.execute()` runs it.'],
        sol: SOL,
        res: { cols: ['run of the notebook of this course', 'inserted', 'updated'], rows: [['day 5, the first time', String(RUNS[4][2]), String(RUNS[4][3])], ['day 5 again', String(RUNS[5][2]), String(RUNS[5][3])], ['the same merge without the condition, again', String(VN.rerun_inserted), n(VN.rerun_updated)]] },
        expl: ['`dropDuplicates(["order_id"])` gives **one source row for each key**. Without it the merge stops with `' + DE.condition + '`.', '`whenMatchedUpdateAll(condition=...)` updates a matched row **only when it differs**. The second run of day 5 updated **' + RUNS[5][3] + '** rows. Without the condition it updated **' + n(VN.rerun_updated) + '**.', '`whenNotMatchedInsertAll()` inserts the orders that the table does not have.'],
        cx: 'Add a version or timestamp to the condition so that a replay of an older file cannot revert a newer value, and filter the source to new or different lines first if the table is large: a merge rewrites every file that holds a matching row.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm9-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers of the table sections come from the recording on real Apache Spark ' + M('spark') + ' and Delta Lake ' + M('delta') + '. The sections on the platform come from documentation and were not run. Take a screenshot or print the page.',
        sections: [
          { h: 'The map (docs)', items: ['A **capacity** is shared compute, sized F2 to F2048 (the number is capacity units). A **workspace** holds **items**. Tables are **Delta in OneLake**: one copy, many engines', 'One unit is **two Spark cores**: F64 is 128, and up to 384 with bursting', 'Lakehouse for Spark, files and the medallion layers. Warehouse for T-SQL writes. The **endpoint** of a lakehouse is **read-only**. Eventhouse and KQL for events'] },
          { h: 'Delta tables', items: ['A table is **Parquet files plus a `_delta_log`**. The commit is the log file. Bronze had ' + BL.commits + ' commits and ' + BL.parquet_files + ' files after five appends', '`VERSION AS OF` read ' + n(G.table('bronze.timetravel').rows[0][1]) + ' rows at version 0 and ' + n(G.table('bronze.timetravel').rows[4][1]) + ' at version 4. A **managed** drop deleted the folder, an **external** one kept it and its ' + DR.external_rows_still_readable + ' rows readable', 'A checkpoint every ten commits (' + FS.json_commits + ' commits, ' + (FS.checkpoints.length - 1) + ' checkpoints). A CHECK constraint raised the writer version from ' + SK.protocol_before + ' to ' + SK.protocol_after_check] },
          { h: 'Notebooks and bronze', items: ['Fabric Spark is Apache Spark on a capacity. A default lakehouse gives short paths. Check the runtime version (Runtime 2.0 is Spark 4.1 and Delta 4.2 in the pages that I read)', 'Bronze reads as **text**, adds the source file and appends: ' + n(BL.rows) + ' lines from five files. Schema inference read the amount as `' + IN.amount_type_day1 + '` on day 1 and `' + IN.amount_type_day3 + '` on day 3, and the append failed'] },
          { h: 'Silver and merges', items: ['Type with `try_cast`, send ' + SM.rejects + ' bad lines to a **rejects table**, merge by key with a condition: ' + n(SM.rows) + ' orders', 'Same file again: ' + RUNS[5][3] + ' rows updated. **No condition**: ' + n(VN.rerun_updated) + ' updated and ' + n(VN.rerun_change_rows) + ' change records. **Filtered source**: ' + VX.rerun_files_written + ' files rewritten and ' + (VX.rerun_commit ? 'a commit' : 'no commit'), 'A **plain append** twice: ' + n(PL.rows_after_two_appends) + ' rows for ' + n(PL.distinct_ids) + ' orders. A **replay** of day 4 reverted ' + RUNS[6][3] + ' rows. Two source rows for one key: `' + DE.condition + '`'] },
          { h: 'Table care', items: ['A write that does not fit is refused (`' + SCH.condition + '`). `mergeSchema` adds a column and old rows read NULL. Constraints refuse bad rows for every writer', 'Forty writes made ' + FS.files + ' files. `OPTIMIZE` made ' + FO.files_added + ' and the folder kept ' + FO.parquet_files_in_folder + ' until `VACUUM`. Retention 7 days. Zero hours: version 5 unreadable (`' + TE.condition + '`)', 'Partitions make at least one file for each value: ' + PLY[1][2] + ' by date, ' + PLY[2][2] + ' by store, ' + PLY[3][2] + ' by customer. `RESTORE` brought back ' + n(RS.rows_after_restore) + ' rows from ' + n(RS.rows_after_bad_overwrite)] },
          { h: 'SQL and Power BI (docs, one lab recorded)', items: ['The Warehouse supports a **subset** of T-SQL. Triggers are not supported. CTAS builds a table', '**Direct Lake** reads Delta files with no copy. **Framing** pins a version: a reader on version ' + GP.pinned_version + ' showed ' + GP.dates_pinned + ' while the latest showed ' + GP.dates_latest + '. **Fallback** to DirectQuery is slower: views and SQL security are causes'] },
          { h: 'Pipelines (docs, retry recorded)', items: ['A schedule, a **day parameter**, notebooks in order **on success**, retries, timeouts, an alert on **fail**', 'A retry of a plain append gave ' + n(RT.plain_rows_after_two_runs) + ' lines for a file of ' + n(RT.rows_in_file) + '. `replaceWhere` kept ' + n(RT.once_rows_after_three_runs) + '. Notebook for logic, Dataflow Gen2 for analysts, Copy for moving'] },
          { h: 'Capacity and delivery (docs)', items: ['Smoothing: background over **24 hours**. **10 minutes** free, then **60** interactive delay, then **24 hours** interactive rejection, then background rejection', 'Roles: Admin, Member, Contributor, Viewer. Git saves items as folders with a **`.platform`** file and a **logical id**. Production on its own capacity', 'Certifications named in job posts: **DP-700** (Fabric Data Engineer Associate) and DP-600, usually as desirable'] }
        ]
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Fabric Partner', color: '#99F6E4',
        pts: [
          'You can explain the **capacity, the workspace and OneLake**, and why a Delta table is the shared part.',
          'You can read a **Delta log**, use time travel, and say what **OPTIMIZE** and **VACUUM** do to the folder and to history.',
          'You can write a **bronze, silver, gold** path whose every step is **safe to repeat**, and say what a **replay** does.',
          'You can choose between the **endpoint**, the **Warehouse** and **Direct Lake**, and explain the **fallback**.',
          'You can read **throttling**, keep production on its own capacity, and ship a change through **Git** and stages.'
        ],
        lines: [
          'I can explain what the table did, and why.',
          'I can recover from my own mistakes.',
          'I can talk to the people who run the platform.'
        ]
      })
    ])
  });
})();
