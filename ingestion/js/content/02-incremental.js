/* Mission 2: full, incremental and merged loads. strategies.py and boundary.py ran for real with dlt on DuckDB. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var T = G.table('strategies.cases').rows, S = C('strategies'), BD = G.table('boundary.cases').rows, STC = G.file('strategies.py');
  G.expect(T[0][2] === 200 && T[0][3] === 100 && T[1][2] === 100 && T[2][2] === 100, 'append twice gives 200 rows for 100 orders, replace and merge give 100');
  G.expect(T[3][2] === 110 && T[3][4] === 109 && T[4][2] === 121 && T[5][2] === 110 && T[5][1] === '100, 20' && T[6][1] === '100, 20, 0', 'a deleted order stays, append with a cursor duplicates, merge with a cursor writes 20 and then 0');
  G.expect(S.order11_in_destination === true && S.order12_destination === 'PLACED' && S.shipped_destination === 10 && S.shipped_shop === 11, 'a deleted order stays and a silent update is missed');
  G.expect(BD[0][1] === '100, 21' && BD[1][1] === '100, 20' && BD[3][1] === '100, 109' && BD[3][3] === 'SHIPPED' && BD[2][3] === 'PLACED', 'a lag of one day catches the silent update, and a key at the boundary drops the changed row');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Incremental loading', short: 'Incremental', blurb: 'Append, replace, merge and a cursor, and what each one gets wrong', minutes: 24,
    focus: ['stg'],
    goals: [
      'Choose between **append**, **replace** and **merge**, and say what each does on a repeat.',
      'Read an **incremental load** with a cursor, and say what it saves.',
      'Say why a cursor never sees a **delete** and can miss a **silent update**.',
      'Make a load **safe to run twice**.'
    ],
    say: 'A full load is simple and costs a lot. An incremental load is cheap and has gaps. I loaded the same pretend shop seven ways with dlt and wrote down what each run wrote and what the table held in the end.',
    scenes: [
      B.code({
        id: 'm2-code', t: 1, src: 'rec', title: 'strategies.py: seven ways to load', file: 'strategies.py', lang: 'python', code: STC,
        steps: [
          { say: 'One program, seven cases, and the same shop. Press Next.', lines: null },
          { say: 'Each case is a **loading method** (`append`, `replace` or `merge`), a list of **days**, and whether a **cursor** is used.', lines: G.span(STC, /^CASES = \[/, /^\]$/) },
          { say: 'For each case a **new pipeline** is made, and the resource is run once for each day. The program writes down **how many rows each run wrote**.', lines: G.span(STC, /for k, \(label, strategy, days, cursor\)/, /wrote\.append/) },
          { say: 'At the end it counts the **rows** in the destination, the **distinct orders**, and what the **shop holds** on the last day.', lines: G.span(STC, /rows, distinct = sp\.totals/, /len\(source\.orders_on/) },
          { say: 'Three more questions about the two gaps of a cursor: order 11 was **deleted** in the shop on day 2, and order 12 was **shipped** without a new `updated_at`.', lines: G.span(STC, /^name, day = 'case5'/, /orders shipped in the destination/) }
        ]
      }),

      B.term({
        id: 'm2-out', t: 1, src: 'rec', title: 'What strategies.py printed',
        say: 'The table first, then the two gaps. Read the last two columns of every row.',
        lines: function () { return G.plain(X('strategies.run')); },
        after: '**Append** loaded the same day twice and held **' + T[0][2] + '** rows for **' + T[0][3] + '** orders. **Replace** and **merge** held **' + T[2][2] + '**. With a **cursor**, day 2 wrote only **' + T[5][1].split(', ')[1] + '** rows (10 new orders and 10 shipped ones) instead of **' + T[3][1].split(', ')[1] + '**, and a second read of day 2 wrote **0**. But the table held **' + T[5][2] + '** orders and the shop **' + T[5][4] + '**: order 11 was deleted in the shop and **stayed**, and order 12 was shipped without a new `updated_at`, so the destination still said **' + S.order12_destination + '**.',
        afterKind: 'warn',
        doneSay: 'Cheap, and with two gaps.'
      }),

      B.widget({ id: 'm2-lab', kind: 'loadlab', t: 1, src: 'rec', title: 'Lab: seven ways to load the same shop' }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'rec', title: 'A cursor, and what it cannot see', g: 'cursor', legend: true,
        steps: [
          { say: 'The shop has an `updated_at` on every order. The loader will use it as a cursor. Press Next.', focus: ['shop', 'rd', 'mrg', 'tab', 'cur'], cap: 'A cursor on updated_at.' },
          { say: 'Step 1. The shop holds **109** orders on day 2. The loader does not want all of them.', on: ['e1'], focus: ['shop', 'rd'], cap: 'The shop has the orders.' },
          { say: 'Step 2. The loader asks only for orders with **`updated_at` at or after the cursor**. That is how day 2 wrote **' + T[5][1].split(', ')[1] + '** rows and not **' + T[3][1].split(', ')[1] + '**.', on: ['e2'], focus: ['rd', 'mrg'], tags: ['tg_silent'], cap: 'Only what changed.' },
          { say: 'Step 3. A **merge** on the id puts each row in place: it updates an order that exists and inserts a new one. The same day twice leaves the same table.', on: ['e3'], focus: ['mrg', 'tab'], tags: ['tg_same'], cap: 'Merge on the id.' },
          { say: 'Step 4. The loader moves the **cursor** to the newest `updated_at` that it saw, and saves it. A **deleted** order never comes back in an answer, so the table keeps it.', on: ['e4'], focus: ['mrg', 'cur'], tags: ['tg_del'], cap: 'The cursor moves forward.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A nightly job loads the orders. After a failed night the job was run again, and the table now has twice the orders. Click the line that cannot be repeated.',
        file: 'resource.py', lang: 'python',
        code: '@dlt.resource(name=\'orders\', write_disposition=\'append\')\ndef orders():\n    for page in source.get_orders(1):\n        yield page\n',
        bad: [1],
        hint: 'What does append do with a row that is already in the table?',
        why: '**Append** adds every row of every run, so a repeat of a load adds the same orders again: in the recording **' + n(T[0][2]) + '** rows for **' + n(T[0][3]) + '** orders. A load that may be repeated needs a **key** and a **merge** (or a replace of the whole table).',
        fix: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders():\n    for page in source.get_orders(1):\n        yield page\n',
        cheer: 'A repeat should change nothing.'
      }),

      B.bug({
        id: 'm2-bug2', t: 2, q: 'The warehouse says order 12 is PLACED, and the shop says it was shipped yesterday. The loader uses `updated_at` as its cursor. Click the line that cannot see the change.',
        file: 'resource.py', lang: 'python',
        code: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders(updated=dlt.sources.incremental(\'updated_at\', initial_value=START)):\n    for page in source.get_orders(day[0], since=updated.last_value):\n        yield page\n',
        bad: [2],
        hint: 'The shop changed the status and left updated_at alone. Where could the loader look further back?',
        why: 'The shop changed the status of order 12 **without moving `updated_at`**, so the cursor never asks for it: the destination said **' + S.order12_destination + '**. Two answers: ask the shop to update `updated_at` on every change, or give the cursor a **lookback window**. With `lag` of one day the second run read **' + BD[3][1].split(', ')[1] + '** orders and the table said **' + BD[3][3] + '**. The price of a lookback is that every run re-reads that window.',
        fix: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders(updated=dlt.sources.incremental(\'updated_at\', initial_value=START, lag=86400)):\n    for page in source.get_orders(day[0], since=updated.last_value):\n        yield page\n',
        cheer: 'Look back a little.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'Which write disposition makes it safe to load the same day twice, with 100 orders each time?',
        opts: [
          { t: 'Merge on the order id (or replace the table)', fb: '' },
          { t: 'Append', fb: 'It left 200 rows for 100 orders in the recording.' },
          { t: 'Append with a cursor', fb: 'The cursor does not remove a row that changed.' },
          { t: 'None: a load can never be repeated', fb: 'Merge and replace made it safe.' }
        ],
        ok: 0, why: 'The recording: append **' + n(T[0][2]) + '**, replace **' + n(T[1][2]) + '**, merge **' + n(T[2][2]) + '** rows for **' + n(T[0][3]) + '** orders.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'What does an incremental load with a cursor save you?',
        opts: [
          { t: 'Reading and writing the rows that did not change: day 2 wrote 20 rows and not 109', fb: '' },
          { t: 'The need for a primary key', fb: 'A merge still needs one.' },
          { t: 'The need to handle deleted rows', fb: 'A cursor makes deletes harder, not easier.' },
          { t: 'Nothing: it is slower than a full load', fb: 'It wrote 20 rows instead of 109.' }
        ],
        ok: 0, why: 'The cursor asked only for the orders with `updated_at` at or after its last value. In the recording day 2 wrote **' + T[5][1].split(', ')[1] + '** rows, and a repeat of day 2 wrote **0**.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'The shop deletes order 11. The loader runs with a cursor on `updated_at`. What happens to the row of order 11 in the destination?',
        opts: [
          { t: 'It stays, because a deleted row never shows up in the answer', fb: '' },
          { t: 'It is deleted by the merge', fb: 'A merge only inserts and updates.' },
          { t: 'The next run fails', fb: 'The run is fine: it simply never hears of the delete.' },
          { t: 'It is marked as deleted automatically', fb: 'Nothing marks it unless the source says so.' }
        ],
        ok: 0, why: 'In the recording order 11 was **still in the destination** after day 2: ' + (S.order11_in_destination ? 'yes' : 'no') + '. A delete needs a **soft-delete flag**, a comparison of ids, or **change capture**.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'Append with a cursor loaded day 2 and the table grew from 100 to 121 rows for 110 orders. What went wrong?',
        opts: [
          { t: 'The 10 orders that changed were added again as new rows, because append never replaces', fb: '' },
          { t: 'The cursor read too few rows', fb: 'It read 21 rows, which is right for a cursor.' },
          { t: 'DuckDB duplicates rows', fb: 'The database did what it was told.' },
          { t: 'The shop sent the same order twice', fb: 'The shop sent each order once.' }
        ],
        ok: 0, why: 'A cursor decides **which rows to read**, and the write disposition decides **what to do with them**. For rows that change you need a **merge**: **' + n(T[4][2]) + '** rows against **' + n(T[5][2]) + '**.'
      }),

      B.quiz({
        id: 'm2-q5', t: 3, src: 'rec',
        q: 'Under append with a cursor, day 2 wrote 21 rows. With a key on `id`, the same load wrote 20. What is the 21st row?',
        opts: [
          { t: 'Order 12, which was shipped but kept its `updated_at`: the API returns it again at the cursor, and only a key makes dlt skip it', fb: '' },
          { t: 'Order 11, the deleted one', fb: 'A deleted order is never returned.' },
          { t: 'A header row of the API', fb: 'The API sends only orders.' },
          { t: 'A random duplicate', fb: 'The rules of the data have no random numbers.' }
        ],
        ok: 0, why: 'The API answers with `updated_at >= cursor`, so the rows **at the cursor** come back every time. dlt drops the ones it already saw: by the **key** when there is one, and by the **whole row** when there is none. Order 12 had changed, so without a key it counted as new: **' + BD[0][1] + '** against **' + BD[1][1] + '**. The numbers are recorded; the rule of the de-duplication is from the documentation of dlt, and the run with a key is the evidence.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the steps in order to move a table from a full load to an incremental one.',
        items: ['Find a cursor column that really moves on every change', 'Add a primary key, and switch to merge', 'Load once and run it again to prove that a repeat changes nothing', 'Compare the counts and a few rows with the source', 'Plan something for deletes and silent changes (a lookback, or a full reload now and then)'],
        why: 'A cursor is only as good as the column. A merge needs a key, a repeat proves it, and the two gaps are decided before they show up in a report.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how do deleted orders reach the warehouse?',
        scenario: 'Finance reports revenue from the warehouse, and the shop deletes cancelled orders. In the recording, order 11 stayed in the destination after it was deleted. The shop has no soft-delete flag, and the table has 40 million rows.',
        opts: [
          { t: 'Capture changes from the shop database log, so deletes arrive as events', d: 'Deletes, updates and inserts arrive in order, with a few seconds of lag.', lose: 'A new component to run and monitor, and access to the database log.' },
          { t: 'Once a night, read all the ids, and mark the ones that are missing as deleted', d: 'No new component. It catches every delete, with a day of lag.', lose: 'Reading 40 million ids every night, and a bug can mark good rows as deleted.' },
          { t: 'Ignore deletes, and tell finance', d: 'Nothing to build.', lose: 'The revenue is wrong by every cancelled order, and nobody sees it.' }
        ],
        pick: 0,
        why: 'The recording shows what a cursor does with a delete: **nothing**. The log is the only place that **sees** it as it happens. The nightly id comparison is a good second choice when the source does not allow log access. The options are from documentation.',
        when: 'If a day of lag is fine and the table is small, the nightly comparison is much less to operate. If the shop can add a soft-delete flag and `updated_at`, ask for that first.'
      }),

      B.incident({
        id: 'm2-inc', t: 1, src: 'rec', title: 'Incident: after a retry, revenue is twice as high', time: '07:50',
        alert: '**The revenue of yesterday is exactly twice the number of finance.** The nightly load failed at 03:10 on the last page, and the scheduler ran the whole job again at 03:40. Both runs finished. The resource uses `append`.',
        clues: ['Exactly twice, not a few percent', 'A run failed, and a retry ran', 'The write disposition is append'],
        opts: [
          { t: 'Make the load a merge on the order id, remove the duplicate rows, and run the repeat to prove that it changes nothing', fb: '' },
          { t: 'Turn off the retries', fb: 'Retries are needed. The load must survive them.' },
          { t: 'Divide the revenue by two in the report', fb: 'It breaks tomorrow, when there is no retry.' },
          { t: 'Delete yesterday and wait for the next run', fb: 'The next run appends again.' }
        ],
        best: 0,
        why: 'The recording shows it: append loaded the same day twice and held **' + n(T[0][2]) + '** rows for **' + n(T[0][3]) + '** orders, and merge held **' + n(T[2][2]) + '**. A retry repeats a load, so a load has to be **safe to repeat**.',
        checks: [
          ['Compare with finance', 'Exactly twice.'],
          ['Count rows and distinct ids', '200 rows, 100 distinct.'],
          ['Read the scheduler history', 'A failure and a retry.'],
          ['Fix and prove', 'Merge on a key, de-duplicate, run it twice.']
        ],
        tell: 'The job appends, and a failed night was retried, so every order of the day was in the table twice. I changed the resource to merge on the order id, removed the duplicates, and ran the day twice to prove that the table does not change.',
        prevent: ['Make every load **idempotent**: merge on a key, or replace', 'Test a **repeat** in a staging run', 'Alert when **rows exceed distinct ids**']
      }),

      B.incident({
        id: 'm2-inc2', t: 2, src: 'rec', title: 'Incident: a cancelled order is still in the revenue, and a shipped one is not', time: '10:15',
        alert: '**Finance finds two orders that the warehouse gets wrong: order 11 was deleted in the shop and is still counted, and order 12 shows PLACED where the shop says shipped.** The loader merges on the id with a cursor on `updated_at`. Every run is green.',
        clues: ['The loader uses a cursor and a merge', 'One order was deleted at the source', 'One order changed without a new updated_at'],
        opts: [
          { t: 'Add a way to see deletes (a flag, an id comparison or log capture) and a lookback window for silent changes', fb: '' },
          { t: 'Switch the loader to append', fb: 'It duplicates every change, and it still never sees a delete.' },
          { t: 'Trust the shop and change nothing', fb: 'The warehouse is wrong now.' },
          { t: 'Delete both rows by hand', fb: 'It fixes two orders, and the next ones will be wrong too.' }
        ],
        best: 0,
        why: 'The recording shows both gaps in one run: after day 2 the destination still held order **11** (' + (S.order11_in_destination ? 'deleted in the shop' : '') + '), and order **12** said **' + S.order12_destination + '** while the shop said SHIPPED. A merge with a cursor is **cheap and blind** to both. A lookback of one day read **' + BD[3][1].split(', ')[1] + '** rows and fixed order 12.',
        checks: [
          ['Compare ids with the source', 'Order 11 is only in the warehouse.'],
          ['Compare statuses', 'Order 12 differs.'],
          ['Read the cursor column', 'The shop did not move updated_at.'],
          ['Fix and prevent', 'See deletes, add a lookback, and compare counts each night.']
        ],
        tell: 'A cursor on updated_at cannot see a deleted row, and it cannot see a change that did not move updated_at, so two orders were wrong while every run was green. I added a nightly comparison of ids to mark deletes and a lookback window of one day for silent changes, and I added a check of counts against the source.',
        prevent: ['Ask the source for a **soft-delete flag** and a reliable **`updated_at`**', 'Add a **lookback** for the cursor', 'Compare **counts and ids** with the source every night']
      }),

      B.qa({
        id: 'qa-incr', t: 1, tag: 'Ingestion', secs: 60,
        q: 'What is the difference between a full load, an incremental load and change capture?',
        pts: ['Full: everything every time', 'Incremental: a cursor column', 'Change capture: the database log', 'What each one misses'],
        short: 'A **full load** reads everything every time: simple and always right, and costly for big tables. An **incremental load** reads only the rows changed since a **cursor**, usually `updated_at`: in my run day 2 wrote **' + T[5][1].split(', ')[1] + '** rows instead of **' + T[3][1].split(', ')[1] + '**. Its gaps are **deletes**, which never come back in an answer, and changes that do not move the cursor. **Change capture** reads the database **log** and sees inserts, updates and deletes in order, at the price of a component to run. I pick by how the table changes, how big it is, and whether deletes matter.',
        fu: [['Which column makes a good cursor?', 'One that moves on every change, is indexed, and is set by the database and not by the application.'], ['How do you handle deletes in an incremental load?', 'A soft-delete flag, a nightly id comparison, or change capture.']],
        trap: 'Saying incremental has no downsides.',
        real: 'Describe a table where you chose each method.'
      }),

      B.qa({
        id: 'qa-idem', t: 1, tag: 'Ingestion', secs: 60,
        q: 'How do you make a load safe to repeat?',
        pts: ['Merge on a key, or replace', 'Never append rows that change', 'Prove it with a repeat', 'Retries need it'],
        short: 'A load must be **idempotent**: running it twice leaves the same table as running it once, because retries and backfills repeat loads. I **merge on a primary key**, or **replace** the table or the partition, and I do not append rows that can change. I prove it by running a day twice: in my recording append gave **' + n(T[0][2]) + '** rows for **' + n(T[0][3]) + '** orders, while merge and replace gave **' + n(T[2][2]) + '**, and a repeat of a day with a cursor wrote **0** rows. For append-only data such as events, I add a unique event id and de-duplicate in the first model.',
        fu: [['Append is never right?', 'It is right for immutable events, with a de-duplication step on an event id.'], ['What about a table with no key?', 'Replace a partition, or build a key from the columns that identify a row.']],
        trap: 'Making the scheduler skip retries instead of fixing the load.',
        real: 'Describe a load that you made idempotent.'
      }),

      B.qa({
        id: 'qa-deletes', t: 2, tag: 'Ingestion', secs: 60,
        q: 'How do deleted rows reach the warehouse?',
        pts: ['A cursor never sees a delete', 'A soft-delete flag', 'An id comparison', 'Log-based change capture'],
        short: 'A cursor **never sees a delete**: in my recording order 11 was deleted in the shop and stayed in the destination, because a deleted row is simply not in the answer. There are three ways. A **soft-delete flag** in the source (`deleted_at`), which makes the delete a normal update. A **comparison of ids**, reading all the ids now and then and marking the missing ones as deleted. Or **log-based change capture**, where the delete arrives as an event. I choose by lag, table size, and whether the source gives me log access. Whatever I choose, I keep the row and mark it, and I do not hard delete it in the warehouse.',
        fu: [['Why not hard delete in the warehouse?', 'History, audits and late-arriving facts. A flag keeps them.'], ['What does Fivetran do?', 'From documentation: it can mark deleted rows with a flag column, for sources that report them.']],
        trap: 'Believing that a merge deletes.',
        real: 'Describe how you found out about a missed delete.'
      }),

      B.qa({
        id: 'qa-cursor', t: 2, tag: 'Ingestion', secs: 60,
        q: 'What goes wrong with an `updated_at` cursor?',
        pts: ['Silent changes', 'Equal timestamps at the boundary', 'Clock and time zones', 'A lookback window'],
        short: 'It is only as honest as the column. **Silent changes**: in my run order 12 was shipped without a new `updated_at`, and the destination kept PLACED until I added a **lookback of one day**, which re-read **' + BD[3][1].split(', ')[1] + '** rows and fixed it. **Equal timestamps**: many rows can share the cursor value, so the read must be inclusive (`>=`) and the loader must drop the rows it already has, which dlt does by key. **Clocks and time zones**: a cursor set by an application on a server with a drifting clock goes backwards. And it **cannot see deletes**. So I prefer a cursor set by the database, a lookback, a merge on a key, and a nightly count against the source.',
        fu: [['Strict greater-than?', 'It loses the rows that share the last timestamp and were not read yet.'], ['Cost of a lookback?', 'Every run re-reads the window, so keep it short.']],
        trap: 'Trusting a column that the application sets.',
        real: 'Describe a cursor that lied to you.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Cursor Keeper', color: '#F0ABFC',
        pts: [
          '**Append** left **' + n(T[0][2]) + '** rows for **' + n(T[0][3]) + '** orders when a day was loaded twice. **Merge** and **replace** left **' + n(T[2][2]) + '**.',
          'A **cursor** made day 2 write **' + T[5][1].split(', ')[1] + '** rows and not **' + T[3][1].split(', ')[1] + '**, and a repeat wrote **0**.',
          'A cursor never sees a **delete**: order 11 stayed. It can miss a **silent change**: order 12 stayed PLACED until a **lookback**.',
          'A cursor decides what to **read**, and the write disposition decides what to **do** with it. Rows that change need a **merge**.',
          'Every load must be **safe to repeat**, and the proof is a repeat.'
        ],
        lines: [
          'I make every load safe to repeat.',
          'I say what a cursor misses.',
          'I plan for deletes before the report asks.'
        ]
      })
    ]
  });
})();
