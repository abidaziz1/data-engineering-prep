/* Mission 4: idempotent and incremental loads. The three loads, their tables after each run, and the incremental loads with a late row are recorded from Apache Airflow 3.4.0
   (`airflow dags test` on SQLite, airflow/verify/capture_af.py). The patterns and their trade-offs are from documentation and from the best-practice guidance of the Airflow project. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ID = G.counts('af.idempotent'), INC = G.counts('af.incremental').steps;
  var APPEND = G.file('dags/brewline_load_append.py'), REPLACE = G.file('dags/brewline_load_replace.py'), UPSERT = G.file('dags/brewline_load_upsert.py'), INCR = G.file('dags/brewline_incremental.py');
  G.expect(ID.brewline_load_append.map(function (r) { return r.rows; }).join() === '3,6,9,12' && ID.brewline_load_replace.map(function (r) { return r.rows; }).join() === '3,3,6,6' && ID.brewline_load_upsert.map(function (r) { return r.rows; }).join() === '3,3,6,6', 'the recorded row counts of the three loads');
  G.expect(INC[1].brewline_incr_window.join() === 'O-1,O-2,O-3' && INC[1].brewline_incr_lookback.join() === 'O-1,O-2,O-3,O-4' && INC[2].brewline_incr_lookback.join() === 'O-1,O-2,O-3,O-4', 'the recorded incremental loads');

  var APPEND_BUG = [
    'from airflow.sdk import dag, task',
    'from airflow.providers.common.sql.hooks.sql import DbApiHook',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=True)',
    'def brewline_orders():',
    '    @task(retries=3)',
    '    def load(ds=None):',
    '        hook = DbApiHook.get_hook("warehouse")',
    '        hook.run("INSERT INTO orders_daily SELECT * FROM staging.orders WHERE order_date = %s", parameters=(ds,))',
    '',
    '    load()',
    '',
    '',
    'brewline_orders()'
  ].join('\n');
  var APPEND_FIX = APPEND_BUG.replace('        hook.run("INSERT INTO orders_daily SELECT * FROM staging.orders WHERE order_date = %s", parameters=(ds,))',
    '        hook.run(\n            [\n                "DELETE FROM orders_daily WHERE order_date = %s",\n                "INSERT INTO orders_daily SELECT * FROM staging.orders WHERE order_date = %s",\n            ],\n            parameters=(ds,),\n            autocommit=False,\n        )');
  var TRUNC_BUG = [
    'from airflow.sdk import dag, task',
    'from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_customers():',
    '    empty = SQLExecuteQueryOperator(task_id="empty_table", conn_id="warehouse", sql="TRUNCATE TABLE dim_customers")',
    '    fill = SQLExecuteQueryOperator(task_id="fill_table", conn_id="warehouse", sql="INSERT INTO dim_customers SELECT * FROM staging.customers")',
    '    empty >> fill',
    '',
    '',
    'brewline_customers()'
  ].join('\n');
  var TRUNC_FIX = TRUNC_BUG.replace('    empty = SQLExecuteQueryOperator(task_id="empty_table", conn_id="warehouse", sql="TRUNCATE TABLE dim_customers")\n    fill = SQLExecuteQueryOperator(task_id="fill_table", conn_id="warehouse", sql="INSERT INTO dim_customers SELECT * FROM staging.customers")\n    empty >> fill',
    '    build_and_swap = SQLExecuteQueryOperator(task_id="build_and_swap", conn_id="warehouse", sql=[\n        "CREATE OR REPLACE TABLE dim_customers_{{ ds_nodash }} AS SELECT * FROM staging.customers",\n        "ALTER TABLE dim_customers_{{ ds_nodash }} SWAP WITH dim_customers",\n    ])');

  function stepsRows() {
    return INC.map(function (s) { return [s.step, s.source.join(', '), s.brewline_incr_window.join(', ') || 'none', s.brewline_incr_lookback.join(', ') || 'none']; });
  }

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Idempotent and incremental loads', short: 'Idempotent', blurb: 'Make every task safe to run twice, and load only what changed', minutes: 65,
    focus: ['ing'],
    goals: [
      'Explain **idempotency** and why retries, clears and backfills make it a requirement.',
      'Choose a safe write pattern: **delete then insert in one transaction**, **upsert**, **swap**.',
      'Build an **incremental load** from the date of the run, and say what a **late-arriving row** does to it.',
      'Find the duplicate rows that a retry leaves behind.',
      'Decide between a full refresh and an incremental load.'
    ],
    say: 'Mission 4 is the one that separates pipelines that survive from pipelines that need a person every night. I ran three loads of the same three orders for 14 March, 14 March again, 15 March, and 14 March once more, and counted the rows. Then I ran two incremental loads with a row that arrives late. The counts are real.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, src: 'docs', title: 'Idempotent: running it twice is the same as running it once',
        say: 'Press Next for each idea. The word is longer than the idea.',
        items: [
          ['The idea', 'A task is **idempotent** when running it twice for the same input leaves the world in the same state as running it once. "Load the orders of 14 March" is idempotent if the table holds the orders of 14 March exactly once afterwards, however often you run it.', 'Same input, same result, any number of runs.'],
          ['Why Airflow needs it', 'Airflow runs a task **at least once**. A retry runs it again after a failure. A person clears it in the UI. A backfill runs old days again. A worker that dies can leave a task to be run again. Each of these repeats work, and you cannot tell in advance which attempt will be the last.', 'Repeats are normal, not rare.'],
          ['The write is the hard part', 'Reading is safe to repeat. Writing is not: a second `INSERT` adds a second copy. The three safe patterns are **delete then insert** in one transaction, **upsert** on a key, and **write elsewhere then swap**.', 'Make the write safe, not the schedule.'],
          ['Dates, not clocks', 'A task that uses `ds` or the data interval always touches the same slice of data. A task that uses "now" touches a different slice each time it runs (mission 3).', 'Parameterise by the run, not by the clock.'],
          ['Where it gets hard', 'A task that sends an email, calls a payment API or posts a message has an effect that you cannot take back. Idempotency there means a key that the other side uses to ignore the second request, or a check of what was already done.', 'Side effects need keys.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm4-w-idem', kind: 'idem', t: 1, src: 'rec', title: 'Lab: run the same load again' }),

      B.code({
        id: 'm4-code-replace', t: 1, src: 'rec', title: 'Delete the day, then insert it, in one transaction', file: 'brewline_load_replace.py', lang: 'python', code: REPLACE,
        steps: [
          { say: 'This is the load that stayed at 3, 3, 6, 6 rows in the recording. It handles one day at a time.', lines: null },
          { say: 'The task gets `ds`, the logical date. Everything it writes carries that date in the column `dt`.', lines: G.span(REPLACE, /def load\(ds=None\)/, /def load\(ds=None\)/) },
          { say: 'The `with` block is **one transaction**: both statements commit together or not at all. If the task dies between them, the table keeps the old rows. Without the transaction a failure after the delete would leave the day empty.', lines: G.span(REPLACE, /with sqlite3.connect/, /with sqlite3.connect/) },
          { say: '`DELETE ... WHERE dt = ?` removes what an earlier try wrote for this day. The insert then writes the day again. Run it twice, ten times, after a retry or a backfill: the day is in the table once.', lines: G.span(REPLACE, /DELETE FROM/, /INSERT INTO/) }
        ],
        note: 'The recorded table had ' + ID.brewline_load_replace.map(function (r) { return r.rows; }).join(', ') + ' rows after the four runs. The append version of the same load had ' + ID.brewline_load_append.map(function (r) { return r.rows; }).join(', ') + '.'
      }),

      B.code({
        id: 'm4-code-upsert', t: 1, src: 'rec', title: 'Upsert: insert, or update when the key exists', file: 'brewline_load_upsert.py', lang: 'python', code: UPSERT,
        steps: [
          { say: 'The second safe pattern needs a **unique key**. Here the order id is the primary key.', lines: G.span(UPSERT, /CREATE TABLE/, /CREATE TABLE/) },
          { say: '`ON CONFLICT(order_id) DO UPDATE` inserts a new row, or updates the row that has the same key. The second run finds the keys and updates them, so the count does not grow. The same idea is called `MERGE` in most warehouses.', lines: G.span(UPSERT, /INSERT INTO/, /\],?$/) }
        ],
        note: 'An upsert does not remove rows that disappeared from the source. If an order can be deleted at the source, you need a delete step or a soft-delete flag as well.'
      }),

      B.cmp({
        id: 'm4-cmp', t: 1, src: 'docs', title: 'Safe write patterns',
        say: 'Four ways to write a load that you can repeat. Press Next to compare them. The right one depends on the size of the table and on what your database can do in one statement.',
        cols: ['Pattern', 'How it works', 'Good for', 'Watch out for'],
        hl: 1,
        rows: [
          ['Delete then insert', 'Delete the slice of the run, insert it again, in one transaction.', 'Daily or hourly partitions of a table.', 'Needs a column that identifies the slice. Do both statements in one transaction.'],
          ['Upsert or merge', 'Insert new keys and update existing ones.', 'Tables with a natural key, such as an order id.', 'Needs a unique key. Rows removed at the source stay.'],
          ['Write elsewhere, then swap', 'Build a new table or partition, check it, then swap it in with one metadata operation.', 'Full refreshes and dimension tables that readers query all day.', 'Needs space for two copies. Name the temporary table by the run so that runs do not collide.'],
          ['Overwrite a partition', 'Replace one partition of a partitioned table with the new data.', 'Lakes and warehouses that support it.', 'Know whether your engine overwrites only the partitions that you write.']
        ],
        steps: [
          { upto: 2, say: 'Delete-then-insert and upsert cover most daily loads. Choose by what is easier to name: a slice or a key.' },
          { upto: 4, say: 'A swap is what you want when readers must never see a half-loaded table. Partition overwrite is the same idea inside one table.' }
        ]
      }),

      B.code({
        id: 'm4-code-incr', t: 1, src: 'rec', title: 'An incremental load: read only the day of the run', file: 'brewline_incremental.py', lang: 'python', code: INCR,
        steps: [
          { say: 'This file builds two DAGs from one function. Both load from a `source_orders` table into a target table with an upsert. They differ in one number: how many days back they read.', lines: null },
          { say: '`lookback_days` is 0 for the first DAG and 1 for the second. The first reads only the logical day. The second reads the day before as well.', lines: G.span(INCR, /^def make/, /^def make/) },
          { say: 'The query reads the source rows whose `updated_at` falls in the window: from `ds` minus the lookback to the end of `ds`. Nothing in it depends on the clock, so a rerun for the same day reads the same window.', lines: G.span(INCR, /rows = con.execute/, /\)\.fetchall/) },
          { say: 'The write is an upsert on `order_id`, so loading a row twice changes nothing.', lines: G.span(INCR, /executemany/, /^                \)$/) },
          { say: 'Two lines at the bottom create the two DAGs: one with no lookback and one with one day.', lines: G.span(INCR, /^brewline_incr_window/, /^brewline_incr_lookback/) }
        ]
      }),

      B.rows({
        id: 'm4-late', t: 1, src: 'rec', title: 'A row arrives late',
        steps: [
          {
            say: 'I ran both DAGs for 14 March, then two more orders reached the source: O-3 with an update time on 15 March, and **O-4, which carries an update time of 14 March 23:30 but arrived after the run of 14 March was over**. Then I ran both DAGs for 15 March, and once more.',
            tabs: [{
              layer: 'RECORDED', name: 'Order ids in each table after each step', c: 'raw',
              cols: ['Step', 'In the source', 'Window of one day', 'Window with one day of lookback'],
              rows: stepsRows(),
              trk: 0
            }],
            notes: ['The load that reads only the day of the run never sees O-4: its update time is on 14 March, and the run of 14 March is over. The load with a lookback finds it. The third row shows both loads run again for 15 March: nothing changed, because both write with an upsert.']
          }
        ]
      }),

      B.cmp({
        id: 'm4-incr', t: 2, src: 'docs', title: 'Incremental strategies and how each one fails',
        say: 'An incremental load reads only what changed. Press Next to compare the common designs. Each one has a way of losing or repeating rows, and the way matters more than the name.',
        cols: ['Strategy', 'How it picks the rows', 'It loses rows when', 'It repeats rows when'],
        hl: 2,
        rows: [
          ['Window by run date', 'Rows whose date column falls in the logical day.', 'A row arrives after its day was loaded, as O-4 did.', 'The window is wider than a day and the write is an append.'],
          ['Window with lookback', 'The day and the N days before it.', 'A row arrives later than N days.', 'Never, with an upsert. It reads rows twice and writes them once.'],
          ['High-water mark', 'Rows newer than the largest value already loaded.', 'A late row has a value below the mark.', 'The mark is stored in the same run as the load and the run is repeated.'],
          ['Change data capture', 'The log of inserts, updates and deletes of the source.', 'The log is cut or the reader falls behind.', 'The consumer reads the same event twice and the write is not an upsert.'],
          ['Full refresh', 'Everything, every time.', 'Never. It is the baseline.', 'Never, with a swap. It costs time and money on big tables.']
        ],
        steps: [
          { upto: 2, say: 'A window by date is simple and loses late rows. A lookback keeps it simple and covers late rows up to N days.' },
          { upto: 4, say: 'A high-water mark is compact and fragile: it trusts that the source never writes behind it. Change data capture is the most exact and needs the most to operate.' },
          { upto: 5, say: 'A full refresh is the answer when the table is small, or when the source cannot tell you what changed. Use a swap so that readers never see a gap.' }
        ]
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A load task inserts the rows of the day with a plain `INSERT`. It fails after the insert, and Airflow retries it. What is in the table afterwards?',
        opts: [
          { t: 'The rows of the day, once', fb: 'That needs a delete or an upsert. A plain insert adds the rows again.' },
          { t: 'The rows of the day, twice', fb: '' },
          { t: 'Nothing, because the failed try is rolled back', fb: 'Only if both statements ran in one transaction that failed. A committed insert stays.' },
          { t: 'Airflow detects the duplicates and removes them', fb: 'Airflow does not look at your data.' }
        ],
        ok: 1, why: 'The recording shows the append load going from 3 to 6 rows when it ran again for the same day. A retry is the same thing as running it again.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'Which load is idempotent?',
        opts: [
          { t: '`INSERT INTO orders SELECT * FROM staging`', fb: 'Run it twice and the rows are there twice.' },
          { t: 'In one transaction: `DELETE FROM orders WHERE dt = :ds`, then `INSERT ... WHERE dt = :ds`', fb: '' },
          { t: '`INSERT INTO orders SELECT * FROM staging WHERE dt = now()::date`', fb: 'The clock decides the slice, so a rerun for an old day loads today.' },
          { t: 'A task that appends and then counts the rows', fb: 'The count does not make it safe.' }
        ],
        ok: 1, why: 'The delete removes what an earlier try wrote for this slice and the insert writes it again, all in one transaction. The result is the same after one run or ten.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'You back-fill 30 days of a load that uses an upsert on the order id. Some days already hold data. What is the result?',
        opts: [
          { t: 'Duplicate rows for the days that already had data', fb: 'The primary key prevents that: existing keys are updated.' },
          { t: 'The same rows as before, with fresh values where the source changed', fb: '' },
          { t: 'An error for every existing key', fb: 'ON CONFLICT DO UPDATE handles a conflict. It does not raise one.' },
          { t: 'The rows of the old days are deleted', fb: 'An upsert never deletes.' }
        ],
        ok: 1, why: 'An upsert inserts new keys and updates existing ones. It makes the backfill safe, and the recording shows 3, 3, 6, 6 rows over the four runs.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2,
        q: 'The window-of-one-day load missed order O-4 in the recording. What is the smallest change that finds it, without breaking idempotency?',
        opts: [
          { t: 'Read the day of the run and the day before, and keep the upsert', fb: '' },
          { t: 'Run the DAG twice a day', fb: 'The row still falls outside the window of its own day, no matter how often it runs.' },
          { t: 'Switch the write from an upsert to an append', fb: 'That repeats rows and does not find O-4.' },
          { t: 'Delete the whole target table every day', fb: 'That works and is a full refresh. It costs the most.' }
        ],
        ok: 0, why: 'A lookback window reads rows twice, and the upsert writes them once. The recorded load with one day of lookback loaded O-1, O-2, O-3 and O-4 and stayed the same on a rerun. A row that arrives later than the lookback needs a wider window or a reconciliation job.'
      }),

      B.quiz({
        id: 'm4-q5', t: 2,
        q: 'A task calls a payment API to refund an order. A retry would refund twice. How do you make the task idempotent?',
        opts: [
          { t: 'Set `retries=0` and accept the failures', fb: 'That moves the problem to a person at night, and the first try may still have succeeded.' },
          { t: 'Send an idempotency key, for example the order id and the run id, so that the API ignores a second request with the same key', fb: '' },
          { t: 'Sleep for a minute before the call', fb: 'Waiting does not remove a duplicate.' },
          { t: 'Call the API from the DAG file instead of a task', fb: 'The file is parsed again and again, so it would refund on every parse.' }
        ],
        ok: 1, why: 'A side effect that you cannot take back needs a key that the other side remembers, or a check of what was already done. Many payment APIs accept an idempotency key for this.'
      }),

      B.quiz({
        id: 'm4-q6', t: 2,
        q: 'A dimension table of 40 million rows is rebuilt every night. Readers query it all day. Which write keeps the readers from ever seeing a half-built table?',
        opts: [
          { t: '`TRUNCATE` in one task and `INSERT` in the next', fb: 'Between the two tasks the table is empty, and a failure leaves it empty.' },
          { t: 'Build a new table, check it, and swap it in with one operation', fb: '' },
          { t: '`DELETE FROM` the whole table and insert in one task', fb: 'It is one task, but the delete and the insert of 40 million rows lock and bloat the table.' },
          { t: 'Insert the new rows next to the old ones', fb: 'Readers then see both copies.' }
        ],
        ok: 1, why: 'A swap is a metadata change, so readers see the old table or the new one. Name the new table by the run so that two runs cannot build the same name.'
      }),

      B.bug({
        id: 'm4-bug1', t: 1, q: 'This load runs every day with 3 retries and catchup on. A retry after a partial failure leaves duplicate rows. Click the line that is wrong.',
        file: 'brewline_orders.py', lang: 'python', code: APPEND_BUG, bad: [G.at(APPEND_BUG, /hook\.run\("INSERT/)],
        hint: 'What is in the table if the first try inserted and then failed?',
        why: 'A plain insert adds the rows of the day each time the task runs. With retries and catchup it runs more than once. Delete the slice and insert it again in one transaction, or upsert on a key.',
        fix: APPEND_FIX,
        cheer: 'Any task with retries must be safe to repeat.'
      }),

      B.bug({
        id: 'm4-bug2', t: 2, q: 'The nightly rebuild of `dim_customers` once left the table **empty** for an hour. Click the line that explains it.',
        file: 'brewline_customers.py', lang: 'python', code: TRUNC_BUG, bad: [G.at(TRUNC_BUG, /empty = /), G.at(TRUNC_BUG, /fill = /)],
        hint: 'What is in the table between the two tasks, and after a failure of the second one?',
        why: 'The truncate commits in its own task. Until the second task succeeds, the table is empty, and a failure of the second task leaves it empty until somebody reruns. Build the new table first and swap it in with one statement, so that readers see the old table or the new one.',
        fix: TRUNC_FIX,
        cheer: 'Never empty a table that people read until the replacement is ready.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put a safe rebuild of a table in order.',
        items: [
          'Build the new table under a name that contains the run, such as `dim_customers_20260314`',
          'Run the quality checks on the new table: row counts, keys, nulls',
          'Swap the new table in with one operation',
          'Drop the old table, or keep it for a few days',
          'Record the run and the counts for the next comparison'
        ],
        why: 'The old table stays in service until the new one has passed its checks. The swap is one operation. If a step fails, the old table is still there and the task can run again.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: how do you reload 14 March after a bug fix?',
        scenario: 'A transform had a bug on 14 March and the orders table of that day holds wrong totals. The table has 2 billion rows partitioned by day, and one day is about 5 million. The load task is idempotent by date. How do you correct 14 March?',
        opts: [
          { t: 'A full refresh of the whole table', d: 'It cannot leave anything stale.', lose: 'It rereads and rewrites 2 billion rows to fix 5 million. It takes hours, costs a lot and blocks everything else.' },
          { t: 'Clear the task instance of 14 March, or backfill that single day', d: 'The task replaces exactly the slice of that day, and nothing else moves.' },
          { t: 'Run an `UPDATE` by hand on the wrong rows', d: 'It is quick.', lose: 'Nobody can see or repeat it, and the next rerun of the day overwrites it again. A manual fix hides the real cause.' }
        ],
        pick: 1,
        why: 'The load is idempotent by date, so rerunning one day is exact and cheap. A manual change is invisible to the pipeline, and a full refresh is the most expensive way to fix one slice.',
        when: 'Choose the full refresh when the bug touched most of the table, or when you cannot say which slices are wrong.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: revenue doubled on 14 March', time: '08:05',
        alert: '**The revenue dashboard shows twice the real number for 14 March. Other days look right.** The nightly load task failed at 02:41 with a timeout after the insert had committed, and Airflow retried it at 02:46.',
        clues: ['The load is a plain `INSERT` of the day\'s rows', 'The task has `retries=2`', '`SELECT order_id, count(*) ... GROUP BY order_id HAVING count(*) > 1` returns every order of 14 March'],
        opts: [
          { t: 'Replace the slice of 14 March by running the load again with a delete-then-insert in one transaction, then change the load so that it is idempotent', fb: '' },
          { t: 'Run the load once more to get the right total', fb: 'A third copy makes it worse.' },
          { t: 'Divide the dashboard figure by two', fb: 'It hides the duplicates for one day and breaks on the next retry.' },
          { t: 'Set `retries=0`', fb: 'That moves the problem to a person at night and does not remove the duplicates.' }
        ],
        best: 0,
        why: 'The first try committed its insert and then timed out. The retry inserted the same rows again. The recording shows the same effect: the append load went from 3 to 6 rows when it ran twice for one day. Fix the data for the day, then fix the load.',
        checks: [
          ['Find the damage', 'Group by the key and look for counts above 1. Check the neighbouring days too.'],
          ['Repair the day', 'Run the corrected load for 14 March. Compare counts with the source.'],
          ['Close the gap', 'Add a unique key or a delete-then-insert in one transaction, and a test that runs the task twice and checks the count (mission 10).']
        ],
        tell: 'The first try had already committed its insert when it timed out, so the retry inserted the day twice. I repaired 14 March with a delete-then-insert, added a unique key, and added a test that runs the load twice.',
        prevent: ['Give every load a **key** to upsert on, or a **slice** to replace', 'Test that **two runs equal one**', 'Do not append without a key']
      }),

      B.talk({
        id: 'm4-ext', t: 3, src: 'docs', title: 'Extra: side effects, keys and the outbox',
        say: 'Press Next. Databases give you transactions. Emails and API calls do not. This is how teams get the same safety.',
        items: [
          ['An idempotency key', 'You send a key with the request, for example `refund-O-1042-run-20260314`. The service stores the key with the result and returns the stored result when it sees the key again. The key must not change between tries, so build it from values of the run and not from the clock.', 'The other side does the deduplication.'],
          ['Check, then act', 'The task first reads whether the effect already happened, for example a row in a table of sent messages, and does nothing if it did. This is safe only if the check and the act are one atomic step, or if a second send is harmless.', 'Look before you leap, atomically.'],
          ['The outbox', 'The task writes the message to a table in the same transaction as the data change. A separate job reads the table, sends the messages and marks them as sent. Airflow retries the sender, and the table remembers what was sent.', 'Make the side effect a row.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-idem', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is an idempotent task, and why does Airflow need it?',
        pts: ['Running it twice gives the same state as running it once', 'Retries, clears, backfills and lost workers repeat work', 'Make the write safe: delete then insert, upsert, swap', 'Use the run date, not the clock'],
        short: 'A task is idempotent when running it twice for the same input leaves the same state as running it once. Airflow needs it because it runs a task at least once. A retry after a failure, a clear in the UI, a backfill and a worker that dies all run work again, and I cannot know which attempt is the last.\n\nReading is safe to repeat. The write is the problem: a second insert adds a second copy. So I write with a delete and an insert in one transaction, or with an upsert on a key, or I build a new table and swap it in. And I parameterise the task by the run, with `ds` or the data interval, and never by the clock, so that a rerun touches the same slice.\n\nIn my recording an append load grew from 3 to 6 rows when it ran twice for the same day, and a delete-then-insert load stayed at 3.',
        fu: [['Does Airflow guarantee that a task runs once?', 'No. It guarantees at least once.'], ['What about an email?', 'Use a key that the receiver remembers, or an outbox table.']],
        trap: 'Saying that retries are safe because the DAG is correct. A retry repeats the task, so the task must be safe.',
        real: 'Name a load in your team that is not safe to run twice, and the pattern that would fix it.'
      }),

      B.qa({
        id: 'qa-safe', t: 1, tag: 'Design', secs: 75,
        q: 'How do you make a daily load idempotent?',
        pts: ['Know the slice of the run: the logical date or the interval', 'Delete the slice and insert it in one transaction, or upsert on a key', 'Or build elsewhere and swap', 'Test by running it twice'],
        short: 'First I define the slice that a run owns: the logical date, or the data interval. The task reads only that slice from the source, never "now".\n\nThen I choose the write. If the table is partitioned by day, I delete that day and insert it again in one transaction. If there is a natural key, I upsert on it. For a full rebuild I write a new table, check it, and swap it in with one operation, so that readers never see a half-built table.\n\nFinally I test it by running the task twice and comparing the counts, and I make backfills part of the design: with an upsert or a replace, a backfill of 30 days is just 30 safe runs.\n\nA row that is deleted at the source needs its own handling, because an upsert never removes rows.',
        fu: [['What if there is no key?', 'Use the slice: delete the slice of the run, then insert. Or make a key from the run and the row position.']],
        trap: 'Adding a deduplication query at the end of the pipeline and calling it done. It hides the cause and costs a scan every day.',
        real: 'Describe how your team reloads a day, and which pattern it uses.'
      }),

      B.qa({
        id: 'qa-late', t: 2, tag: 'Design', secs: 90,
        q: 'How do you handle late-arriving data in an incremental load?',
        pts: ['A window by date loses a row that arrives after its day', 'A lookback window with an upsert reads rows twice and writes them once', 'A high-water mark trusts the source never to write behind it', 'A reconciliation job for the rest'],
        short: 'A load that reads only the day of the run loses a row that arrives after its day was loaded. In my recording a row with an update time of 14 March 23:30 reached the source after the run of 14 March, and the load that read only the day never saw it.\n\nThe simplest fix is a lookback window: each run reads the day and the N days before it, and writes with an upsert. Rows are read twice and written once, and a rerun changes nothing. N is a business decision: how late can data be? The lookback load in the recording found the late row and stayed stable on a rerun.\n\nA high-water mark is smaller, and it trusts that the source never writes a value below the mark. For anything later than N days I run a reconciliation job that compares counts and sums with the source and repairs the difference.',
        fu: [['How do you choose N?', 'Measure how late rows arrive in the source and cover most of them, then reconcile the rest.']],
        trap: 'Claiming that an incremental load by the update time is always complete.',
        real: 'Describe how late your data can be, and how you find out that a row was missed.'
      }),

      B.qa({
        id: 'qa-incr', t: 2, tag: 'Design', secs: 75,
        q: 'Incremental load or full refresh: how do you decide?',
        pts: ['Size and cost of the table', 'Can the source say what changed?', 'Late rows and deletes', 'A full refresh with a swap is the safe baseline'],
        short: 'I start from the size and from what the source can tell me. For a small table a full refresh with a swap is the simplest and the safest, and it cannot lose a row. As the table grows the cost of reading and writing everything every night becomes the problem.\n\nThen I need an incremental design, and its failure mode matters: a window by date loses late rows, a lookback covers a few days, a high-water mark trusts the source, and change data capture is the most exact and the most work. Deletes at the source need a flag or a change feed, because an upsert never removes rows.\n\nWhatever I choose, the load must be idempotent, and I keep a way to rebuild fully, so that when I find a hole I can repair it.',
        fu: [['What is your fallback?', 'A full refresh of the table, run on a schedule or by hand, so that drift never lasts.']],
        trap: 'Going incremental from day one because it sounds more advanced.',
        real: 'Name a table in your team that is rebuilt fully, and say when you would stop doing that.'
      }),

      B.qa({
        id: 'qa-side', t: 2, tag: 'Design', secs: 60,
        q: 'A task sends a Slack message or calls a payment API. How do you make it safe to retry?',
        pts: ['An idempotency key that the receiver remembers', 'Or check what was already done, atomically', 'Or an outbox table', 'Build keys from the run, not the clock'],
        short: 'A side effect that I cannot take back needs a memory. The cleanest way is an idempotency key: I send a key built from values of the run, for example the order id and the logical date, and the service ignores a second request with the same key. Many payment APIs support this.\n\nIf the service has no keys, I keep the memory myself: I record in a table that the message was sent and check it first, and I make the check and the record one atomic step. Or I use an outbox: the task writes the message to a table in the same transaction as the data change, and a separate job sends it and marks it sent.\n\nThe key must be stable between retries, so it comes from the run and never from the clock or a random value.',
        fu: [['What if the call succeeded but the response was lost?', 'That is exactly the case that keys solve: the retry sends the same key and gets the stored result.']],
        trap: 'Setting retries to zero for such tasks. The failure still needs handling, and the first try may have worked.',
        real: 'Name a task with a side effect in your team, and how it avoids a double send.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Safe Re-runner', color: '#C7D2FE',
        pts: [
          'A task is **idempotent** when running it twice leaves the same state as once. Airflow runs tasks **at least once**: retries, clears and backfills repeat work.',
          'Make the **write** safe: **delete then insert** in one transaction, **upsert** on a key, or build elsewhere and **swap**. A plain `INSERT` is the bug.',
          'Parameterise by the **run** (`ds`, the data interval), never by the clock.',
          'An incremental load by date **loses late rows**. A **lookback** with an upsert finds them. A high-water mark trusts the source.',
          'Side effects need **keys** or an **outbox**. Test every load by running it twice.'
        ],
        lines: [
          'I can make a load safe to run twice.',
          'I can explain late-arriving data.',
          'I can repair a day that holds duplicates.'
        ]
      })
    ]
  });
})();
