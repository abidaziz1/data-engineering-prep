/* Mission 3: incremental models on Snowflake, strategy by strategy. */
(function () {
  var B = LAB.b, G = LAB.get;

  var FCT = G.file('models/marts/core/fct_orders.sql');
  var NOKEY = G.file('scenario/fct_orders_merge_nokey.sql');
  var RUN = G.script('incr_merge', /^(create or replace temporary view|merge into|drop view if exists)/);
  var NOKEY_INSERT = G.stmt('incr_merge_nokey', /^insert into/);
  var PRED_MERGE = G.stmt('incr_predicates', /^merge into/);
  var SCHEMA = G.script('incr_schema_append', /^(alter\s+table|merge into)/);
  function firstBatch(k) {
    var w = G.stmts(k).filter(function (s) { return s.kind !== 'meta' && s.kind !== 'txn'; }), n = -1;
    w.forEach(function (s, i) { if (n < 0 && /^drop/i.test(s.sql)) n = i; });
    return w.slice(0, n + 1).map(function (s) { return s.sql + ';'; }).join('\n\n');
  }
  var MB = firstBatch('incr_microbatch');

  G.expect(!G.stmts('incr_merge_nokey').some(function (s) { return /^merge into/.test(s.sql); }), 'a merge strategy without a key is sent as a plain insert');
  G.expect(G.wrapped('incr_merge', /^merge into/), 'the merge runs between begin and commit');
  G.expect(LAB.W.stratInfo.oneTxn('incr_delete_insert'), 'delete+insert runs between begin and commit');
  G.expect(!LAB.W.stratInfo.oneTxn('incr_microbatch'), 'microbatch sends delete and insert without a transaction');
  G.expect(/add column/i.test(SCHEMA), 'append_new_columns adds a column with alter table');
  G.expect(/dateadd\(day, -7/.test(PRED_MERGE), 'the predicate sits in the merge');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Incremental models on Snowflake', short: 'Incremental', blurb: 'Merge, delete+insert, append, microbatch and the day rows change', minutes: 38,
    focus: ['mart'],
    goals: [
      'Read the **statements** of an incremental run on Snowflake: the temporary view, the merge and the cleanup.',
      'Choose between **merge, delete+insert, append and microbatch**, and say what each does to the table.',
      'Make a merge on a big table cheaper with **predicates** and **update columns**.',
      'Handle **duplicates in a batch**, **late rows** and a **backfill**.'
    ],
    say: 'Mission 3 is about the biggest tables. A full rebuild of an orders fact table takes minutes today and hours next year. An incremental model keeps the run short by touching only new rows. On Snowflake that means a temporary object, a merge or a delete and an insert, and a few rules that decide whether the table stays correct.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, title: 'Four ways to load new rows',
        say: 'An incremental model reads only the new rows. The strategy decides how they get into the table. Press Next for each.',
        items: [
          ['Merge', 'One statement. Snowflake matches the new rows to the table on the key, updates the matches and inserts the rest. This is what dbt-snowflake sends when you set a `unique_key`.', 'One statement, key-based.'],
          ['Delete+insert', 'Two statements. dbt deletes the rows whose key is in the new batch, then inserts the batch. Both run in one transaction in the recording.', 'Two statements, atomic.'],
          ['Append', 'One insert. It is the cheapest, and it never replaces anything. It suits events that never change. A rerun adds the same rows again.', 'Insert only.'],
          ['Microbatch', 'dbt splits the run into time windows, for example one day each. For each window it deletes that day\'s rows and inserts the rebuilt ones. You can rerun a single day.', 'Replace whole windows.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm3-code', t: 1, title: 'The incremental model, line by line', file: 'models/marts/core/fct_orders.sql', lang: 'jinja', code: FCT,
        steps: [
          { say: 'This is the real fct_orders model of the Brewline project. Press Next to read it.', lines: null },
          { say: 'The config says the model is incremental, that order_id identifies a row, and what to do when the model gets a new column. We come back to the last one.', lines: G.span(FCT, /^\{\{$/, /^\}\}$/) },
          { say: 'The query is an ordinary SELECT over the intermediate model. On the first run it is all that runs, and it builds the whole table.', lines: G.span(FCT, /^select$/, /^from \{\{ ref/) },
          { say: 'The if block is the heart of it. `is_incremental()` is true only when the table already exists and the run is not a full refresh.', lines: G.span(FCT, /is_incremental/, /endif/) },
          { say: 'So on later runs the WHERE clause keeps only rows loaded after the newest load time already in the table. The `coalesce` handles an empty table.', lines: G.span(FCT, /where loaded_at/, /where loaded_at/) }
        ],
        note: 'Filter on the column that moves **when a row changes**. Here that is `loaded_at`. The business date `ordered_at` does not change when an order ships.'
      }),

      B.flow({
        id: 'm3-flow', t: 1, title: 'What an incremental merge does', g: 'incr', legend: true,
        steps: [
          { say: 'Here is a later run of fct_orders on Snowflake, step by step. Press Next to follow the data.', tags: ['tg_first'], cap: 'The very first run skips all of this: it just creates the table.' },
          { say: 'The model reads the intermediate view. It holds every version of every order, loaded since the beginning.', on: ['i1'], focus: ['up', 'filt'], cap: 'The input is large and mostly old.' },
          { say: 'The filter keeps only rows loaded after the newest row already in the table. Unchanged orders are never read.', on: ['i2'], tags: ['tg_skip'], focus: ['filt', 'tmp'], cap: 'This is where the savings come from.' },
          { say: 'dbt puts the new rows in a temporary view. A view stores nothing, so the query runs when the merge reads it.', on: ['i3'], focus: ['tmp', 'mrg'], cap: 'The view disappears with the session.' },
          { say: 'One merge matches the view to the table on order_id. A matched order is updated. An unmatched order is inserted.', on: ['i3', 'i4'], focus: ['mrg', 'drp'], cap: 'This is what unique_key is for.' },
          { say: 'Last, dbt drops the temporary view. The table has one row per order again.', on: ['i5'], focus: ['drp', 'tgt'], cap: 'Cleanup is part of the run.' }
        ]
      }),

      B.code({
        id: 'm3-run', t: 1, title: 'The statements of a real incremental run', file: 'sent to Snowflake, in order', lang: 'sql', code: RUN,
        steps: [
          { say: 'This is the recorded second run of fct_orders on Snowflake. Between these statements dbt also sent a few DESCRIBE calls to read the columns of the table and the view. Press Next.', lines: null },
          { say: 'First the temporary view. It holds the model query, filtered to new rows.', lines: G.span(RUN, /^create or replace temporary view/, /^  \)/) },
          { say: 'The filter is the part you wrote. It reads the newest `loaded_at` in the table. Because this runs inside a view, Snowflake plans it together with the merge.', lines: G.span(RUN, /^where loaded_at/, /^where loaded_at/) },
          { say: 'The merge names the table and the view, and the match condition: the same order_id.', lines: G.span(RUN, /^merge into/, /^\s+on \(\(/) },
          { say: 'A matched row is updated, column by column. The column list came from DESCRIBE, so a new column in the model needs the schema-change setting.', lines: G.span(RUN, /when matched then update/, /^\s+"ORDER_ID" = /) },
          { say: 'An unmatched row is inserted.', lines: G.span(RUN, /when not matched then insert/, /^\s+values/) },
          { say: 'The last statement drops the temporary view.', lines: [G.at(RUN, /^drop view/), G.at(RUN, /^drop view/)] }
        ],
        note: 'In the recording, dbt sent `begin` before the merge and `commit` after it. If the merge fails, the table stays as it was.'
      }),

      B.rows({
        id: 'm3-rows', t: 1, title: 'Day two, with example rows',
        steps: [
          {
            say: 'These example rows show the effect of the merge. Before the run, the table has two orders. O-5010 is still PLACED.',
            tabs: [{ layer: 'MART', name: 'fct_orders before the run (example rows)', c: 'mart', cols: ['order_id', 'order_status', 'order_total_usd', 'loaded_at'], rows: [['O-5009', 'SHIPPED', '31.00', '2026-03-17 09:00'], ['O-5010', 'PLACED', '67.00', '2026-03-17 09:00']], trk: 1 }],
            notes: ['The rows on this screen are made up to show the effect. The statements on the other screens are recorded.']
          },
          {
            say: 'Overnight the loader added two rows to RAW. O-5010 shipped, and O-5011 is new. Both were loaded on 18 March, so the filter selects them. This is what the temporary view holds.',
            tabs: [{ layer: 'VIEW', name: 'fct_orders__dbt_tmp (example rows)', c: 'int', cols: ['order_id', 'order_status', 'order_total_usd', 'loaded_at'], rows: [['O-5010', 'SHIPPED', '67.00', '2026-03-18 09:00'], ['O-5011', 'PLACED', '12.50', '2026-03-18 09:00']], trk: 0 }],
            notes: ['O-5009 is not in the view. It was not loaded again, so it is never read.']
          },
          {
            say: 'After the merge, O-5010 is updated in place, O-5011 is inserted, and O-5009 was never touched. Three orders, each once.',
            tabs: [{ layer: 'MART', name: 'fct_orders after the run (example rows)', c: 'mart', cols: ['order_id', 'order_status', 'order_total_usd', 'loaded_at'], rows: [['O-5009', 'SHIPPED', '31.00', '2026-03-17 09:00'], ['O-5010', 'SHIPPED', '67.00', '2026-03-18 09:00'], ['O-5011', 'PLACED', '12.50', '2026-03-18 09:00']], trk: 2, chg: [[1, 1], [1, 3]] }],
            notes: ['The yellow cells changed. A merge replaced the old version of O-5010, instead of adding a second row.']
          }
        ]
      }),

      B.widget({ id: 'm3-lab', t: 1, kind: 'strat', title: 'Lab: six ways to load day two' }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This model runs without an error and the tests on other columns pass. Orders that change get a **second row** in the table. Click the line that causes it.',
        file: 'models/marts/core/fct_orders.sql', lang: 'jinja', code: NOKEY, bad: G.at(NOKEY, /incremental_strategy='merge'/),
        hint: 'A merge matches new rows to old rows. What tells dbt which columns make two rows the same row?',
        why: 'The config asks for a merge but gives no `unique_key`. A merge needs to know what makes two rows the same row. Without a key, dbt has nothing to match on. It does not even send a merge: it sends a plain insert, so every new row is added next to the old version of the order. The next screen shows the statement.',
        fix: FCT,
        cheer: 'A merge without a key is an insert with extra steps.'
      }),

      B.code({
        id: 'm3-nokey', t: 1, title: 'What the missing key did', file: 'sent to Snowflake, strategy merge without unique_key', lang: 'sql', code: NOKEY_INSERT,
        steps: [
          { say: 'I removed the key and ran the model again with the strategy set to merge. Press Next.', lines: null },
          { say: 'There is no merge statement at all. With nothing to match on, dbt sent a plain insert.', lines: [1, 1] },
          { say: 'The insert reads the temporary view and adds every row to the table. A new version of an order that is already there is simply added next to it.', lines: G.span(NOKEY_INSERT, /^\s+select/, /^\s+from/) }
        ],
        note: 'No test fails unless you wrote a unique test on `order_id`. That is why every incremental model with a key gets `unique` and `not_null`.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Which statement does dbt send on the **first** run of an incremental model, when the table does not exist?',
        opts: [
          { t: 'A merge, with an empty table as the target', fb: 'There is no target to merge into.' },
          { t: '`create or replace transient table ... as (select ...)`, with no filter', fb: '' },
          { t: 'An insert into a table that dbt creates empty', fb: 'dbt builds the table and loads it in one statement.' },
          { t: 'Nothing, until the first row arrives', fb: 'dbt always builds the table on the first run.' }
        ],
        ok: 1, why: 'On the first run `is_incremental()` is false, so the `if` block disappears and dbt runs the full query inside the table statement. You can see that statement in the recording of the first run.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put an incremental merge run in order.',
        items: [
          'dbt creates a temporary view with the new rows',
          'dbt asks Snowflake for the columns of the table and the view',
          'dbt begins a transaction',
          'dbt sends the merge',
          'dbt commits the transaction',
          'dbt drops the temporary view'
        ],
        why: 'The view, the column check, then the transaction around the merge, and the cleanup. The create and the drop sit outside the transaction.'
      }),

      B.code({
        id: 'm3-pred', t: 2, title: 'Predicates keep a merge from scanning everything', file: 'sent to Snowflake, merge with incremental_predicates', lang: 'sql', code: PRED_MERGE,
        steps: [
          { say: 'On a table of billions of rows, a merge must find the matching rows. I added one setting to fct_orders and recorded the merge. Press Next.', lines: null },
          { say: 'The predicate became part of the ON condition, next to the key match. Only table rows from the last 7 days can match.', lines: G.span(PRED_MERGE, /^\s+on \(DBT_INTERNAL_DEST/, /^\s+on \(DBT_INTERNAL_DEST/) },
          { say: 'With a condition on a date column, Snowflake can skip the storage partitions of the table that hold older dates. That is how the merge stays cheap as the table grows.', lines: null }
        ],
        note: 'The trade-off is exact: an order that changes **after** more than 7 days cannot match, so the merge inserts a second row for it. Set the window to the lateness you really see, and test it.'
      }),

      B.quiz({
        id: 'm3-q2', t: 2,
        q: 'The merge has an `incremental_predicates` window of 7 days on `ordered_at`. An order from 20 days ago ships today and arrives in the new batch. What happens?',
        opts: [
          { t: 'The merge updates the old row, as usual', fb: 'The predicate removes rows older than 7 days from the match.' },
          { t: 'The merge fails with an error', fb: 'The statement is valid. It simply finds no match.' },
          { t: 'The merge inserts a second row for the order', fb: '' },
          { t: 'The merge deletes the old row', fb: 'A merge from dbt does not delete unless you ask for it.' }
        ],
        ok: 2, why: 'The old row is outside the window, so it cannot match. The new version counts as unmatched and is inserted. The table now has two rows for the order. A unique test on `order_id` finds it. A wider window or a periodic full refresh prevents it.'
      }),

      B.code({
        id: 'm3-schema', t: 2, title: 'A new column in the model', file: 'sent to Snowflake when the model gets a new column', lang: 'sql', code: SCHEMA,
        steps: [
          { say: 'I added a column to the model and ran it again with `on_schema_change=\'append_new_columns\'`. Press Next to see the statements.', lines: null },
          { say: 'dbt compared the columns of the table with the columns of the temporary view, found one extra, and altered the table first.', lines: G.span(SCHEMA, /^alter\s+table/, /^\s+BOOLEAN/) },
          { say: 'Then the merge includes the new column. Old rows keep an empty value for it, because they were not loaded again.', lines: G.span(SCHEMA, /^merge into/, /^\s+on \(\(/) }
        ],
        note: 'To fill in the old rows, run a full refresh. With `on_schema_change=\'fail\'` dbt stops and asks you to decide. The default, `ignore`, drops the new column without a word.'
      }),

      B.code({
        id: 'm3-mb', t: 2, title: 'Microbatch: one window at a time', file: 'dbt run --event-time-start 2026-03-17 --event-time-end 2026-03-19, first batch', lang: 'sql', code: MB,
        steps: [
          { say: 'Microbatch needs an event time column. I ran two days. These are the four statements of the first day. The second day repeats them. Press Next.', lines: null },
          { say: 'The temporary view reads the upstream model for one day only. The time bounds are in the statement.', lines: G.span(MB, /^from \(select/, /^from \(select/) },
          { say: 'The delete removes that day\'s rows from the table.', lines: G.span(MB, /^delete from/, /^    \)/) },
          { say: 'The insert puts the rebuilt day back.', lines: G.span(MB, /^insert into/, /^    \)/) },
          { say: 'Then the temporary view is dropped. Notice what is missing: no `begin` and no `commit` around the delete and the insert.', lines: [G.at(MB, /^drop view/), G.at(MB, /^drop view/)] }
        ],
        note: 'In this recording dbt did not wrap the delete and the insert in a transaction. If the insert fails, that day stays empty until you rerun it. Rerunning is safe, because the same window is deleted and rebuilt.'
      }),

      B.quiz({
        id: 'm3-q3', t: 2,
        q: 'A microbatch run for 18 March deletes the day, and then the insert fails. What is the safe next step?',
        opts: [
          { t: 'Rerun the batch for 18 March', fb: '' },
          { t: 'Switch the model to append so the insert cannot fail', fb: 'Append fails the same way, and it duplicates rows on every rerun.' },
          { t: 'Run a full refresh of the whole table', fb: 'It works, and it rebuilds years of data to fix one day.' },
          { t: 'Leave it. The next run will fix it', fb: 'The next run processes the next day. The missing day stays missing.' }
        ],
        ok: 0, why: 'Each batch deletes its own window and inserts it again, so a rerun of the same window gives the same result. Design for reruns instead of relying on one transaction.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, title: 'Decision: loading a very large event table',
        scenario: 'Brewline\'s clickstream table gets **400 million rows a day** and holds 3 TB. Events never change after they are written, but some arrive **up to two days late**. A merge on the event id takes over an hour.',
        opts: [
          { t: 'Merge on the event id', d: 'Handles late rows by key.', lose: 'Each incoming key must be looked up in 3 TB. Event ids are random, so the lookup cannot skip partitions. It is correct and slow, and the immutable events do not need it.' },
          { t: 'Append the new rows each run', d: 'The cheapest load.', lose: 'A retry or a reload adds the same events twice, and a late event needs its own repair job.' },
          { t: 'Microbatch by event day with a lookback of two days', d: 'Each run replaces the last three days as whole windows.' },
          { t: 'Rebuild the table every night', d: 'The simplest model.', lose: 'It reprocesses 3 TB for 400 million new rows, and the run grows with the table.' }
        ],
        pick: 2,
        why: 'Events do not change, so there is no key-based update to do. Late events land in recent days, so replacing the **last few days as windows** repairs them. Each window is independent, so you can rerun a day, run days in parallel and backfill a month with one command. A table loaded in time order is usually well organised by date, so the windows prune well.',
        when: 'If rows change by key and the table is moderate, merge is simpler and exact. If rows only arrive in order and never late, append is the cheapest.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, title: 'Incident: the merge fails with a duplicate row error', time: '02:40',
        alert: 'The fct_orders merge failed at 02:40 with **Duplicate row detected during DML action**. The loader finished at 02:30. Yesterday\'s run was fine.',
        clues: ['The loader delivered two versions of order O-5010 in the same load: PLACED at 02:10 and SHIPPED at 02:25', 'The model used to keep one row per order in staging, until a refactor last week', 'Rerunning the job fails the same way'],
        opts: [
          { t: 'Keep the latest version of each order inside the batch, in the model query', fb: '' },
          { t: 'Turn off the duplicate check for the session', fb: 'The error stops, and Snowflake then updates the row from one of the matches without any rule. You may keep the older version.' },
          { t: 'Switch the model to append', fb: 'It keeps both versions forever and doubles the orders downstream.' },
          { t: 'Rerun until it passes', fb: 'The batch is the same every time, so it fails every time.' }
        ],
        best: 0,
        why: 'A merge is ambiguous when two new rows match one existing row, and Snowflake rejects it by default. The batch must hold one row per key. The model query is the right place to enforce it.',
        checks: [
          ['Read the error', 'Duplicate row detected during DML action means one existing row matched several new rows.'],
          ['Look at the batch', 'Select the temporary view logic and group by order_id with `having count(*) > 1`. O-5010 appears twice.'],
          ['Find the change', 'Last week\'s refactor moved the de-duplication out of the model that fct_orders reads.'],
          ['Fix the query', 'Add `qualify row_number() over (partition by order_id order by loaded_at desc) = 1` so one row per order remains.'],
          ['Rerun and test', 'Rerun the job, and add a test that the batch has one row per key.']
        ],
        tell: 'The merge failed with a duplicate row error. The loader had delivered two versions of one order in the same batch, and Snowflake rejects a merge when two new rows match one existing row. I confirmed it by counting rows per order in the batch, then restored the de-duplication in the model query with a row_number filter on the load time. After the rerun the job passed, and I added a test for one row per key in the batch.',
        prevent: ['Keep **one row per key** in the model query, in the model that feeds the merge', 'Add a **unique test** on the key of the incremental model', 'Do not turn off the **duplicate check** to make an error go away', 'Test with a **batch that holds two versions** of one key']
      }),

      B.qa({
        id: 'qa-merge', t: 1, tag: 'Incremental', secs: 60,
        q: 'How does an incremental merge work on Snowflake, and what can go wrong?',
        pts: ['First run: create or replace transient table with the full query', 'Later runs: the WHERE filter selects new rows into a temporary view', 'One merge matches on the unique key: update the matches, insert the rest', 'The merge sits in a transaction; the view is dropped afterwards', 'Risks: a filter that misses updates, no key, two new rows for one key'],
        short: 'On the first run dbt creates the table with `create or replace transient table ... as (select ...)`. On later runs `is_incremental()` is true, so my WHERE clause keeps only rows loaded after the newest load time already in the table. dbt puts them in a temporary view, reads the columns of the table and the view, and sends one `merge`: it matches on my `unique_key`, updates the matches and inserts the rest. The merge runs inside a transaction, and then dbt drops the view.\n\nTwo things decide whether it is right. The filter must use a column that moves when a row changes, such as the load time, or updates are missed without any error. And the batch must hold one row per key: if two new rows match the same existing row, Snowflake rejects the merge by default, so I keep the latest version of each key in the model query. On big tables I add incremental predicates so the merge scans only recent partitions.',
        fu: [
          ['What happens without a unique key?', 'dbt does not send a merge. It sends a plain insert, so every new row is added next to the old version.'],
          ['How do you test it?', 'Run it twice, with a changed row and a new row in the second load, and compare the table with the source.']
        ],
        trap: 'Describing only the speed benefit. The expected answer includes the key, the filter column and the duplicate case.',
        real: 'Name a table you made incremental, its size, the run time before and after, and one problem you hit.'
      }),

      B.qa({
        id: 'qa-strategy', t: 2, tag: 'Incremental', secs: 90,
        q: 'How do you choose an incremental strategy on Snowflake?',
        pts: ['Start from how rows change: by key, appended only, or by time window', 'Merge is the default and simplest; add predicates on big tables', 'Delete+insert is two statements in one transaction; useful with a date predicate', 'Append only for immutable events, with a unique test', 'Microbatch for large time series: rerun a day, backfill by dates', 'Check what a failure leaves behind; measure bytes scanned and credits'],
        short: 'I start from how rows change. If rows are updated by key and the table is moderate, merge is the default and the simplest: one statement that is easy to read. If the table is large and changes land in recent periods, I restrict the merge with incremental predicates, or I use delete+insert by date, so Snowflake can skip old partitions. If events never change, append is the cheapest, but a rerun duplicates rows, so I pair it with a unique test or move to microbatch.\n\nFor large time series I prefer microbatch. dbt rebuilds one window at a time, a failed day can be rerun alone, and a backfill is a command with a start and an end date.\n\nI also look at what a failure leaves behind. In the recordings I made, merge and delete+insert ran inside a transaction, and microbatch did not. So with microbatch I rely on rerunning the window.\n\nThen I measure bytes scanned, run time and credits, before and after.',
        fu: [
          ['When is delete+insert better than merge?', 'When you can delete by a date range that prunes well, and updates replace whole groups of rows. Merge is better for sparse updates by key.'],
          ['What does a backfill look like?', 'For microbatch, a run with `--event-time-start` and `--event-time-end`. For others, a full refresh or a filtered rerun by date.']
        ],
        trap: 'Saying "merge is always right". On very large tables with random keys it is the slowest option.',
        real: 'Describe a table where you changed the strategy, and what you measured.'
      }),

      B.qa({
        id: 'qa-late', t: 2, tag: 'Incremental', secs: 75,
        q: 'How do you handle late-arriving or duplicate records in an incremental model, and how do you backfill?',
        pts: ['New means a larger load time, not a later business date', 'Lookback window re-reads recent rows; the key makes the re-read harmless', 'One row per key inside each batch, or Snowflake rejects the merge', 'Microbatch with a lookback for big append-only tables', 'Backfill with event-time start and end, or a full refresh', 'Safety net: periodic full refresh or a reconciliation test; test with an updated and a late row'],
        short: 'I decide what counts as new, and I use the load time, because that column changes when a row is added or updated. Rows that arrive late get a lookback window: instead of "newer than the newest", the filter re-reads the last two days, and the key makes the re-read harmless. Inside one batch I keep only the latest version of each key, because Snowflake rejects a merge in which two new rows match the same existing row.\n\nFor very large append-only tables I use microbatch with a lookback of a few days. dbt replaces whole days, so late events land in the right day and I can rerun one day alone. A backfill is one command with `--event-time-start` and `--event-time-end`.\n\nAs a safety net I schedule a periodic full refresh or a reconciliation test against RAW. In CI I test with an updated row and a late row as well as a new row.',
        fu: [
          ['What does a bigger lookback cost?', 'Every run reads and rewrites more rows. Set it to the lateness you actually see, with some margin.'],
          ['What about deleted source rows?', 'An incremental filter never sees them. Use a soft-delete flag, a full refresh, or a periodic comparison.']
        ],
        trap: 'Saying "just use merge". Merge handles changed keys, and it does not handle rows your filter never selects.',
        real: 'Say how late your data really arrives, and which window you chose.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Merge Master', color: '#FED7AA',
        pts: [
          'An incremental run is a **temporary view, a merge or a delete and insert, and a drop**. The first run builds the whole table.',
          '**Merge** needs a `unique_key`. Without one, dbt sends a plain insert and every new row is added.',
          '**Predicates** keep a merge from scanning the whole table. They cannot match rows older than the window.',
          '**One row per key** in each batch, or Snowflake rejects the merge.',
          '**Microbatch** replaces time windows and reruns safely. It sent no transaction in the recording.'
        ],
        lines: [
          'I test an incremental model with an updated row, a late row and a duplicate.',
          'The filter column must move when a row changes.',
          'I design for reruns.'
        ]
      })
    ]
  });
})();
