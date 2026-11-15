/* Mission 4: loading data. Every number is from the recording of a real server. Seconds are quoted only as "on this machine". */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var LM = G.table('load.methods').rows, UP = G.table('load.upsert').rows, LW = G.table('load.wal').rows, CE = C('load.copy_error'), DU = C('load.dup'), AN = C('load.analyze'), PL = C('project.load'), US = C('load.upsert'), MS = C('load.methods_summary');
  var NU = G.table('load.csv_nulls').rows;
  var SQL = G.file('upsert.sql'), PY = G.file('load_orders.py');
  var mbOf = function (b) { return (b / 1048576).toFixed(1) + ' MB'; };
  G.expect(LM[0][4] === 20000 && LM[1][4] < 20 && LM[3][1] === 1 && LM[3][5] < LM[0][5] / 20, 'copy is one statement and the row by row load is 20,000 flushes');
  G.expect(CE.rows_in_table_after_error === 0 && CE.names_the_line && CE.names_the_column, 'one bad row stops the whole copy');
  G.expect(US.plain_second_updated === 100000 && US.table_doubled_by_plain_rerun === true && US.distinct_updated === 0 && US.distinct_size_unchanged === true && US.changed_updated === 1000 && US.merge_same_updated === 0, 'a plain rerun rewrites everything and the guarded one writes nothing');
  G.expect(DU.upsert_refused === true && DU.merge_refused === true, 'a duplicate key in one batch is refused by both');
  G.expect(LW[2][1] < 100 && LW[1][1] < LW[0][1] && AN.reltuples_before === -1 && AN.estimate_before < 5 && AN.estimate_after > 20 && AN.actual > 100, 'an unlogged load writes nothing and statistics change the estimate');
  G.expect(PL.first_run === 5000 && PL.second_run_same_file === 0 && PL.third_run_one_row_changed === 1 && PL.fourth_run_file_with_a_duplicate_row === 0, 'the project loader is idempotent');
  var PLAIN = 'INSERT INTO orders\nSELECT * FROM stg\nON CONFLICT (order_id) DO UPDATE\nSET amount = EXCLUDED.amount, status = EXCLUDED.status;\n';
  var span = function (a, b) { return G.span(SQL, a, b); };

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Loading data', short: 'Loading', blurb: 'COPY, staging tables, an upsert that is safe to run twice, and what a load writes', minutes: 20,
    focus: ['mart', 'air'],
    goals: [
      'Load a file with **COPY** and say why it beats a loop of INSERTs.',
      'Write a load that is **safe to run twice**: staging, `DISTINCT ON`, `ON CONFLICT ... WHERE`.',
      'Say what a **bad row**, a **duplicate key** and an **unlogged** table do.',
      'Say why a big load needs an **ANALYZE** afterwards.'
    ],
    say: 'Loading is the part of PostgreSQL that your code touches every night. It is also where the mechanisms of the last two missions show up as money: each statement is a round trip, each commit a flush, and each rewritten row a new version for vacuum. We load the same rows four ways, then make one load that can run twice without leaving a trace.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'A nightly load: staging, then one upsert', g: 'load', legend: true,
        steps: [
          { say: 'A file of orders arrives every night, with some orders new and some changed. Press Next.', focus: ['file', 'stg', 'up', 'ord'], cap: 'A file, a staging table, a target.' },
          { say: 'Step 1. `COPY` reads the **whole file in one statement** into a **staging table**. The table is temporary and has no key, so a bad batch cannot hurt the real data.', on: ['e1'], focus: ['file', 'stg'], tags: ['tg_copy'], cap: 'COPY loads the file.' },
          { say: 'Step 2. One `INSERT ... SELECT` moves the rows to `orders`. `DISTINCT ON` first removes duplicates inside the file, because the upsert refuses a key that appears twice in one batch.', on: ['e2'], focus: ['stg', 'up'], tags: ['tg_dup'], cap: 'Duplicates are removed first.' },
          { say: 'Step 3. `ON CONFLICT (order_id) DO UPDATE` updates a row that already exists, and inserts a row that does not. A `WHERE` clause compares the old and the new values.', on: ['e3'], focus: ['chk', 'up'], cap: 'A row is updated only if it differs.' },
          { say: 'Step 4. Rows that did not change are **skipped**. Every update writes a new row version, so a load that rewrites unchanged rows makes the table bigger and keeps vacuum busy. Run the same file twice and nothing is written.', on: ['e4'], focus: ['up', 'ord'], tags: ['tg_skip', 'tg_cost'], cap: 'Unchanged rows are not written.' }
        ]
      }),

      B.widget({ id: 'm4-lab', kind: 'loadlab', t: 1, src: 'rec', title: 'Lab: four ways to load 20,000 rows' }),

      B.term({
        id: 'm4-copyerr', t: 1, src: 'rec', title: 'One bad row stops the whole COPY',
        say: 'I sent six rows with `COPY`. The fifth had the text "abc" where a customer number belongs.',
        lines: function () {
          return G.term([
            ['COPY orders_c FROM STDIN (FORMAT csv);   -- six rows, the fifth has "abc" as customer_id', X('load.copy_error').split('\n').slice(1).join('\n')],
            ['SELECT count(*) FROM orders_c;', String(CE.rows_in_table_after_error)]
          ]);
        },
        after: 'The error names the **line** (5) and the **column** (`customer_id`), which is what you need to find the row. And the table holds **' + CE.rows_in_table_after_error + '** rows: the four good rows before it were rolled back too. `COPY` is **all or nothing**. For files that may hold bad rows, copy into a **staging table with text columns**, then cast and filter in SQL and write the rejects to a table of their own. PostgreSQL 17 adds an option to skip bad rows, and it was not run here, because the server is version 16.',
        afterKind: 'warn',
        doneSay: 'COPY is all or nothing. The error names the line and the column.'
      }),

      B.cmp({
        id: 'm4-csv', t: 1, src: 'rec', title: 'How COPY reads a CSV: NULL, quotes, commas',
        say: 'I copied three lines into a table of three text columns. Press Next to see what each one became.',
        cols: ['The line', 'Column a', 'Column b', 'Column c'],
        hl: 2,
        rows: [
          ['`1,,""`', NU[0][0], (NU[0][1] ? 'NULL' : '"' + NU[0][2] + '"') + ' (nothing between the commas)', (NU[0][3] === '' ? 'an empty string' : NU[0][3]) + ' (two quotes)'],
          ['`2,"x,y",z`', NU[1][0], '`' + NU[1][2] + '`, a comma inside quotes', NU[1][3]],
          ['`3,NULL,"q""r"`', NU[2][0], '`' + NU[2][2] + '`, the text and not a null', '`' + NU[2][3] + '`, a doubled quote is one quote']
        ],
        steps: [
          { upto: 1, say: 'In CSV format an **unquoted empty field is NULL**, and a **quoted empty field** `""` is an empty string. A file written by another tool may mean something else, and `NULL \'\'` or `FORCE_NULL` change it.' },
          { upto: 2, say: 'A comma inside **quotes** belongs to the value.' },
          { upto: 3, say: 'The word `NULL` is **just text** in CSV format. A column that is not NULL but holds the text "NULL" is a bug that appears weeks later, so check the null marker of every source.' }
        ]
      }),

      B.widget({ id: 'm4-upsert', kind: 'upsert', t: 1, src: 'rec', title: 'Lab: six runs of an upsert' }),

      B.code({
        id: 'm4-sql', t: 1, src: 'rec', title: 'The upsert of the Brewline loader', file: 'upsert.sql', lang: 'sql', code: SQL,
        steps: [
          { say: 'This is the statement of the project, run by every load of this mission. `stg` is the staging table that `COPY` filled. Press Next.', lines: null },
          { say: '`DISTINCT ON (order_id)` keeps **one row for each order**. With `ORDER BY order_id, order_ts DESC` it keeps the **newest** one. Without it, an order that appears twice in the file stops the load with *cannot affect row a second time*.', lines: span(/SELECT DISTINCT ON/, /ORDER BY/) },
          { say: '`ON CONFLICT (order_id)` names the unique key. A row whose key does not exist is **inserted**. A row whose key exists goes to `DO UPDATE`. This needs a unique index or a primary key on `order_id`.', lines: span(/ON CONFLICT/, /ON CONFLICT/) },
          { say: '`SET ... = EXCLUDED....` takes the **new** values. `EXCLUDED` is the row that the insert proposed.', lines: span(/^SET /, /note = EXCLUDED/) },
          { say: 'The `WHERE` compares the whole old row with the whole new row, with `IS DISTINCT FROM`, which treats two NULLs as equal. The update **happens only if something differs**. This line is what makes the load safe to run twice.', lines: span(/^WHERE/, /IS DISTINCT FROM/) }
        ],
        note: 'A plain `DO UPDATE` without the WHERE rewrote all 100,000 rows in the recording and doubled the table.'
      }),

      B.code({
        id: 'm4-py', t: 1, src: 'rec', title: 'The loader around it', file: 'load_orders.py', lang: 'python', code: PY,
        steps: [
          { say: 'The Python file of the project. It runs in **one transaction**, so a failure leaves the table as it was. Press Next.', lines: null },
          { say: 'The staging table is **temporary** and made `LIKE orders`, so it has the same columns and **no key**. `ON COMMIT DROP` removes it at the end.', lines: G.span(PY, /CREATE TEMP TABLE/) },
          { say: '`COPY ... FROM STDIN` streams the file to the server in chunks of 64 kB. This is one statement, however many rows the file has.', lines: G.span(PY, /with con.cursor\(\)\.copy/, /copy.write\(chunk\)/) },
          { say: 'Then the upsert of the previous screen. `rowcount` is the number of rows that were **inserted or updated**, and it is the number to log and to alert on.', lines: G.span(PY, /return con\.execute\(UPSERT\)/) }
        ],
        note: 'No other cleanup is needed: if anything fails, the `with con.transaction()` block rolls back and the temporary table goes with it.'
      }),

      B.term({
        id: 'm4-run', t: 1, src: 'rec', title: 'Running the loader four times',
        say: 'I ran this loader on a file of 5,000 orders four times: the first time, the same file again, a file with one amount changed, and a file in which one order appears twice.',
        lines: function () {
          return G.term([
            ['python3 load_orders.py $DSN orders.csv', String(PL.first_run)],
            ['python3 load_orders.py $DSN orders.csv   # the same file', String(PL.second_run_same_file)],
            ['python3 load_orders.py $DSN orders.csv   # one amount changed to 77.00', String(PL.third_run_one_row_changed)],
            ['python3 load_orders.py $DSN orders.csv   # one order twice in the file', String(PL.fourth_run_file_with_a_duplicate_row)],
            ['SELECT count(*), max(amount) FILTER (WHERE order_id = 10) FROM orders;', PL.rows_in_table + ' | ' + PL.changed_amount]
          ]);
        },
        after: 'The number is the count of rows written. **' + n(PL.first_run) + '** the first night, **' + PL.second_run_same_file + '** for the same file (nothing to do), **' + PL.third_run_one_row_changed + '** for the one changed amount, and **' + PL.fourth_run_file_with_a_duplicate_row + '** for the file with a duplicate, which did not fail: `DISTINCT ON` kept one row and it had not changed. The table holds **' + n(PL.rows_in_table) + '** rows, and the changed order has the new amount. This is what **idempotent** means: running a load again changes nothing that is already right.',
        afterKind: 'tip',
        doneSay: 'A run that writes zero rows is a healthy run.'
      }),

      B.term({
        id: 'm4-dup', t: 1, src: 'rec', title: 'The same key twice in one batch',
        say: 'Without `DISTINCT ON`, a staging table that holds order 1 twice stops both the upsert and `MERGE`.',
        lines: function () {
          return G.term([
            ['INSERT ... ON CONFLICT DO UPDATE   -- staging holds order 1 twice', X('load.dup_upsert').split('\n').slice(1).join('\n')],
            ['MERGE ...   -- the same staging table', X('load.dup_merge').split('\n').slice(1).join('\n')]
          ]);
        },
        after: 'Both refuse, with a hint that says what to do: a row cannot be changed **twice in one command**, so the batch must have **one row for each key**. Source files do contain duplicates (a retried export, an event that was sent twice), so the load removes them on purpose and decides **which row wins**: here the newest by `order_ts`. If two rows with the same key and the same time exist, the choice is arbitrary, so add a tie-breaker to the `ORDER BY`.',
        afterKind: 'warn',
        doneSay: 'One row for each key in a batch, and you choose which one.'
      }),

      B.cmp({
        id: 'm4-merge', t: 2, src: 'docs', title: 'ON CONFLICT or MERGE',
        say: 'PostgreSQL 15 added `MERGE`. Both did the job in the recording: the second run with the same file and `MERGE` returned `' + US.merge_same_status + '`, and a run with 500 changed rows `' + US.merge_changed_status + '`. This screen compares them, and its last column is from documentation.',
        cols: ['', '`INSERT ... ON CONFLICT`', '`MERGE`'],
        hl: 2,
        rows: [
          ['What it needs', 'A unique index or constraint on the conflict columns', 'A join condition. No unique index is required'],
          ['Cases', 'Insert, or update on conflict. Can also do nothing', 'Matched: update or delete. Not matched: insert. More than one branch'],
          ['The tag it returns', '`INSERT 0 N`, with N rows inserted or updated', '`MERGE N`, with N rows inserted, updated or deleted'],
          ['A duplicate in the source', 'Refused: *cannot affect row a second time*', 'Refused: *MERGE command cannot affect row a second time*'],
          ['Under concurrent writers', 'Built for it: no unique violation on a race', 'Can fail with a unique violation, if two sessions insert the same new key'],
          ['Use it for', 'The normal idempotent load of a keyed table', 'Loads that also delete, or that have several rules, and a single writer']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are what you write. `ON CONFLICT` is simpler when a unique key exists.' },
          { upto: 5, say: 'Both refuse a duplicate in the source. The recording has the two messages.' },
          { upto: 6, say: '`MERGE` is more general, and is documented to behave differently when two sessions race for the same new key. I did not race two sessions, so this row is from documentation.' }
        ]
      }),

      B.cmp({
        id: 'm4-wal', t: 2, src: 'rec', title: 'What 100,000 rows of COPY write to the log',
        say: 'The same 100,000 rows copied into three tables. I counted the bytes that the log grew by.',
        cols: ['100,000 rows by COPY into', 'WAL written', 'Table', 'Primary key'],
        hl: 1,
        rows: LW.map(function (r) { return [r[0], r[1] < 1000 ? r[1] + ' bytes' : mbOf(r[1]), mbOf(r[2]), mbOf(r[3])]; }),
        steps: [
          { upto: 1, say: 'A normal table with its primary key **in place**: **' + mbOf(LW[0][1]) + '** of log. The table and the key are the same in all three cases. The log has both the rows and the index entries.' },
          { upto: 2, say: 'The same load with the key **added after the load**: **' + mbOf(LW[1][1]) + '**. Building an index in one pass writes less than inserting into it row by row. For a **first big load**, load first and index after.' },
          { upto: 3, say: 'An **unlogged** table: **' + LW[2][1] + ' bytes**. Mission 3 showed the price: it is empty after a crash.' }
        ]
      }),

      B.term({
        id: 'm4-analyze', t: 2, src: 'rec', title: 'After a big load: ANALYZE',
        say: 'I loaded 100,000 orders into a new table and asked for the plan of a query, before and after `ANALYZE`.',
        lines: function () {
          return G.term([
            ['SELECT reltuples FROM pg_class WHERE relname = \'orders_s\';   -- before', String(AN.reltuples_before)],
            ['EXPLAIN ANALYZE ' + X('load.plan_before_analyze').split('\n')[0], X('load.plan_before_analyze').split('\n').slice(1).join('\n')],
            ['ANALYZE orders_s;', 'ANALYZE'],
            ['EXPLAIN ANALYZE ' + X('load.plan_after_analyze').split('\n')[0], X('load.plan_after_analyze').split('\n').slice(1).join('\n')]
          ]);
        },
        after: 'Before `ANALYZE` the table had **no statistics** (`reltuples` was ' + AN.reltuples_before + ') and the planner **guessed**: it expected **' + AN.estimate_before + '** rows and found **' + AN.actual + '**. After it, the estimate was **' + AN.estimate_after + '**, better but still lower than the real number, because the planner multiplies the frequency of `status = open` by the frequency of `store_id = 5`, as if they were independent. Mission 5 fixes that with extended statistics. Autovacuum analyzes a table by itself after enough changes, **but not at once**. A pipeline that loads a big table and queries it in the next step should run `ANALYZE` in between.',
        afterKind: 'tip',
        doneSay: 'Analyze after a big load. A guess of 2 rows against 167 chooses bad plans.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, src: 'docs', q: 'A nightly load runs this upsert. The table doubles in size every night although only a few hundred orders change. Click the line that causes it.',
        file: 'upsert.sql', lang: 'sql', code: PLAIN, bad: [3],
        hint: 'What happens to a row that exists and has not changed?',
        why: '`DO UPDATE` with **no condition** updates every existing row, including the ones whose values are the same, and every update writes a **new row version**. The recording: the second run of the same file returned `' + US.plain_second_status + '`, updated **' + n(US.plain_second_updated) + '** rows and doubled the table from ' + mbOf(UP[0][4]) + ' to ' + mbOf(UP[1][4]) + '. Add `WHERE (old values) IS DISTINCT FROM (new values)`.',
        fix: 'INSERT INTO orders\nSELECT * FROM stg\nON CONFLICT (order_id) DO UPDATE\nSET amount = EXCLUDED.amount, status = EXCLUDED.status\nWHERE (orders.amount, orders.status) IS DISTINCT FROM (EXCLUDED.amount, EXCLUDED.status);\n',
        cheer: 'Write only what changed.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'You have a CSV file of two million rows. Which way of loading it into a table is the right default?',
        opts: [
          { t: '`COPY` into a staging table, then SQL', fb: '' },
          { t: 'A loop of single-row `INSERT` statements in autocommit', fb: 'The recording: 20,000 statements, 20,000 commits and 20,000 log flushes for 20,000 rows.' },
          { t: 'One `INSERT` statement with two million values', fb: 'The statement would be enormous, and the server holds all of it in memory. Batches of a thousand rows are the largest sensible size, and COPY is better.' },
          { t: 'Open one connection for each row', fb: 'That is the connection storm of mission 1.' }
        ],
        ok: 0, why: 'The recording of 20,000 rows: `COPY` was **' + LM[3][1] + '** statement, the row by row load **' + n(LM[0][1]) + '**, and `COPY` took ' + LM[3][5] + ' s against ' + LM[0][5] + ' s on this machine.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'The last row of a file of 100,000 rows has a letter in a number column. What does `COPY` do?',
        opts: [
          { t: 'Stops with an error that names the line and the column, and loads nothing', fb: '' },
          { t: 'Loads the 99,999 good rows and skips the bad one', fb: 'Not in PostgreSQL 16. COPY is all or nothing.' },
          { t: 'Loads everything and stores NULL for the bad value', fb: 'It does not guess.' },
          { t: 'Loads the rows in the first batch and stops', fb: 'There are no batches. One COPY is one transaction.' }
        ],
        ok: 0, why: 'The recording: *' + X('load.copy_error').split('\n')[2] + '*, and **' + CE.rows_in_table_after_error + '** rows in the table afterwards.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'The upsert returns `INSERT 0 100000` the second night, for the same file as the first night. What does that tell you?',
        opts: [
          { t: 'Every existing row was updated, although nothing changed: add a WHERE on the values', fb: '' },
          { t: 'The load is healthy: 100,000 new rows', fb: 'The file had the same 100,000 orders as the night before, so none of them was new.' },
          { t: 'The first number, 0, is the number of errors', fb: '0 is a leftover from an old version of the tag and is always 0 for INSERT.' },
          { t: 'The table was truncated first', fb: 'There was no truncate.' }
        ],
        ok: 0, why: 'The tag counts rows **inserted or updated**. The recording: ' + n(US.plain_second_updated) + ' updates, a table of ' + mbOf(UP[1][4]) + ' instead of ' + mbOf(UP[0][4]) + '. With the guard the same file gave `' + US.distinct_status + '`.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2,
        q: 'The staging table has two rows for order 7. Without `DISTINCT ON`, what happens to the upsert?',
        opts: [
          { t: 'It stops with an error that says a row cannot be affected a second time', fb: '' },
          { t: 'The last row wins silently', fb: 'PostgreSQL does not choose for you, because the choice depends on the data.' },
          { t: 'Both rows are inserted', fb: 'The key is unique, so only one can exist.' },
          { t: 'The first row wins silently', fb: 'It does not choose.' }
        ],
        ok: 0, why: 'The recording: *' + X('load.dup_upsert').split('\n')[1] + '*. The hint says to make sure that no rows in the same command have duplicate keys.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Make the nightly load safe to run twice. Put the steps in order.',
        items: [
          'Open one transaction',
          '`COPY` the file into a temporary staging table without a key',
          'Remove duplicate keys with `DISTINCT ON` and decide which row wins',
          '`INSERT ... ON CONFLICT DO UPDATE ... WHERE the row differs`',
          'Commit once, log the number of rows written, and `ANALYZE` after a large change'
        ],
        why: 'One transaction makes the load all or nothing. The staging table keeps a bad file away from the real table. The condition makes a second run write nothing, and the logged count is the number that says it worked.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: a table of 200 million orders and a new file every night',
        scenario: 'The orders table has 200 million rows. Every night a file of 300,000 new and changed orders arrives. Reports read the table all day. Someone suggests `TRUNCATE` and a full reload each night, because "it is simpler".',
        opts: [
          { t: 'The incremental upsert: staging with `COPY`, `ON CONFLICT ... WHERE the row differs`, one transaction', d: 'The load writes about 300,000 rows. Readers see a consistent table the whole time, because the commit is atomic.', lose: 'A unique key and some SQL to keep. Deletions in the source need a rule of their own.' },
          { t: '`TRUNCATE` and reload the whole table every night', d: 'No logic: the table is what the source says.', lose: 'The table is empty or half loaded while the load runs, unless it is one transaction, and then `TRUNCATE` blocks every reader for hours. 200 million rows of log and statistics every night.' },
          { t: 'Load into a new table and rename it over the old one', d: 'Readers switch in an instant, and the new table has no dead rows.', lose: 'Needs room for two copies, and the rename takes a short exclusive lock. Grants, indexes and dependent views have to be recreated.' }
        ],
        pick: 0,
        why: 'The change is 0.15 % of the table, and the upsert writes only that. The recording shows what a load that rewrites unchanged rows costs, and what one that writes only the changes costs: nothing. A table swap is the right tool for a **small** table that is rebuilt completely, and it did not run in this course.',
        when: 'A dimension table of a few thousand rows that is replaced as a whole is fine with a swap.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the orders table doubled and the disk is filling', time: '06:40',
        alert: '**The orders table was 8 MB yesterday and is 17 MB this morning, with the same number of orders.** The load of last night reported `INSERT 0 100000`. The disk alarm says 85 %, and the table is read by every dashboard.',
        clues: ['The loader uses `ON CONFLICT ... DO UPDATE SET ...` with no `WHERE`', 'The source file did not change since the night before', '`pg_stat_user_tables` shows 100,000 updates last night and almost no inserts'],
        opts: [
          { t: 'Add `WHERE ... IS DISTINCT FROM` to the upsert, run `VACUUM`, and watch that the size stays', fb: '' },
          { t: '`VACUUM FULL orders` immediately', fb: 'It takes an exclusive lock on a table that every dashboard reads. Plain VACUUM makes the space reusable first.' },
          { t: 'Truncate and reload', fb: 'It breaks the dashboards for the length of the load and does not fix the cause.' },
          { t: 'Delete the oldest rows', fb: 'The data is not the problem. The dead versions are.' }
        ],
        best: 0,
        why: 'The recording of this exact load: the **second run of the same file** returned `' + US.plain_second_status + '`, updated ' + n(US.plain_second_updated) + ' rows, and the table went from ' + mbOf(UP[0][4]) + ' to **' + mbOf(UP[1][4]) + '**. With the condition the next run returned `' + US.distinct_status + '` and the size did not change.',
        checks: [
          ['Read the tag', '`INSERT 0 100000` for a file with no new orders is the sign.'],
          ['Confirm with the counters', '`n_tup_upd` against `n_tup_ins` in `pg_stat_user_tables`.'],
          ['Fix the statement', 'Compare old and new values with `IS DISTINCT FROM`.'],
          ['Vacuum, do not shrink', 'A plain `VACUUM` lets the next night reuse the space.']
        ],
        tell: 'The upsert rewrote every row each night, which doubled the table with dead versions. I added a condition so that only changed rows are written, and ran a plain VACUUM, so the space is reused and the size is stable. The load now logs how many rows it wrote, and a night with a huge number pages me.',
        prevent: ['Log **rows written** by every load, and alert on a surprising number', 'Review every `DO UPDATE` for a **condition**', 'Keep autovacuum **on**']
      }),

      B.qa({
        id: 'qa-copy', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'How do you load a large file into PostgreSQL?',
        pts: ['COPY, in one statement, from a client stream', 'Into a staging table, then SQL', 'All or nothing: a bad row stops it', 'Add indexes after the first big load'],
        short: 'With `COPY`, usually `COPY ... FROM STDIN` from the client (`\\copy` in psql, or the copy call of the driver), because it reads the whole file in **one statement** and avoids the per-row round trip and the per-row overhead. I load into a **staging table** that has no key and often text columns, and then use SQL to cast, clean, deduplicate and move the rows. In my recording 20,000 rows took one statement with `COPY` and 20,000 with INSERT, and ' + '0.03 against 4.5 seconds on that machine. `COPY` is all or nothing: one bad row stops it, with the line and column in the error, and loads nothing. For a **first big load** into an empty table I load first and build the indexes after: 7.9 MB of log against 12.3 MB.',
        fu: [['What about `COPY FROM file`?', 'It reads on the server and needs a privilege and a file on the server. The client form needs neither.'], ['Can it skip bad rows?', 'Not in 16. A later version has an option for it. From documentation.']],
        trap: 'Looping over rows with INSERT, with a commit for each.',
        real: 'Describe the largest load you ran and how long it took.'
      }),

      B.qa({
        id: 'qa-upsert', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'How do you write an upsert in PostgreSQL, and how do you make it safe to run twice?',
        pts: ['INSERT ... ON CONFLICT (key) DO UPDATE', 'EXCLUDED holds the proposed row', 'Add WHERE old IS DISTINCT FROM new', 'DISTINCT ON in the source, one row for each key'],
        short: '`INSERT ... ON CONFLICT (key) DO UPDATE SET col = EXCLUDED.col`, which needs a unique index on the key. `EXCLUDED` is the row that the insert proposed. To make the load idempotent I add `WHERE (target columns) IS DISTINCT FROM (EXCLUDED columns)`, so that a row is updated only if something changed. That matters, because every update writes a new row version. In my recording the same file loaded twice with a plain `DO UPDATE` returned `INSERT 0 100000` and doubled the table, and with the condition it returned `INSERT 0 0` and the table kept its size. I also remove duplicates from the source with `DISTINCT ON`, because a key twice in one batch stops the statement with *cannot affect row a second time*. I load in one transaction and log the count of rows written.',
        fu: [['What does `INSERT 0 N` mean?', 'N rows were inserted or updated. The first number is a leftover and is always 0.'], ['What about deletes?', 'An upsert does not delete. Use `MERGE` or a separate rule.']],
        trap: 'An upsert without a condition, run every night.',
        real: 'Say how your loads report how many rows they wrote.'
      }),

      B.qa({
        id: 'qa-idempotent', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'What does idempotent mean for a load, and how do you get it?',
        pts: ['Running it again gives the same result', 'A natural key and an upsert', 'No duplicates from a retry', 'The load is one transaction'],
        short: 'It means that running the load twice leaves the data in the same state as running it once, which is what a retry after a failure needs. I get it with a **natural or business key**, an upsert on that key, and a condition that skips rows that did not change, in **one transaction**, so a failed run changes nothing. The proof is the count: in my recording the same 5,000 rows loaded a second time wrote **0** rows, one changed amount wrote **1**, and a file with a duplicate row loaded without an error and wrote 0. A load that appends without a key is not idempotent: a retry duplicates the day. A full refresh is idempotent but costly and visible to readers while it runs.',
        fu: [['What if the source has no key?', 'Build one from the columns that identify a row, or load into a day partition and replace the partition.'], ['Where does the orchestrator come in?', 'It retries tasks. An idempotent task makes that safe.']],
        trap: 'Retrying an append that has no key.',
        real: 'Describe a job that duplicated data after a retry.'
      }),

      B.qa({
        id: 'qa-batch', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'Why is inserting rows one by one slow, and what do you do instead?',
        pts: ['A round trip for every statement', 'A commit and a log flush for every row in autocommit', 'Group rows in one transaction', 'Use multi-row INSERT or COPY'],
        short: 'Two costs repeat for every row: the **round trip** to the server for each statement, and, in autocommit, a **commit that waits for the log to reach the disk**. In my recording 20,000 single-row inserts with a commit each were 20,000 statements and 20,000 log flushes. The same rows in one transaction were 7 flushes, in 20 statements of 1,000 rows each 3 flushes and a fraction of the time, and with `COPY` one statement and one flush. So I group rows in **one transaction**, use **multi-row `INSERT`** or the driver\'s batch mode for small sets, and use `COPY` for files. Prepared statements also save planning. I do not make one connection for each row, because each is a process.',
        fu: [['What is the best batch size?', 'There is no magic number. A thousand rows for each statement is a sane default.'], ['Does `executemany` help?', 'In psycopg 3 it uses pipeline mode, which sends statements without waiting. From documentation.']],
        trap: 'Believing that the database is slow, when the client is.',
        real: 'Say how you found an insert loop and what it cost.'
      }),

      B.qa({
        id: 'qa-merge', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'When do you use MERGE instead of ON CONFLICT?',
        pts: ['MERGE joins source and target, with matched and not matched branches', 'It can delete as well as update and insert', 'ON CONFLICT needs a unique index and handles races', 'Both refuse a duplicate in the source'],
        short: '`MERGE`, new in PostgreSQL 15, joins a source to a target and has branches for **matched** and **not matched** rows, so it can update, insert and **delete** in one statement, with conditions on each branch. It needs no unique index. `INSERT ... ON CONFLICT` needs a unique constraint and does only insert or update, but it is built to be safe when two sessions insert the same key at the same time. For the normal keyed upsert I use ON CONFLICT, and I use MERGE when a load must also delete, or has several rules, and has a single writer. In my recording both gave the same result: a rerun wrote 0 rows, and 500 changed rows wrote 500, and both refused a duplicate key in the source. The concurrency difference is from documentation, because I did not race two sessions.',
        fu: [['What does MERGE return?', 'The tag `MERGE N`. Returning rows needs a later version.'], ['Is MERGE atomic?', 'Yes. It is one statement in one transaction.']],
        trap: 'Using MERGE with several concurrent writers and no retry.',
        real: 'Name a load where you needed the delete branch.'
      }),

      B.qa({
        id: 'qa-analyze', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'Why run ANALYZE after a big load?',
        pts: ['The planner needs statistics about the data', 'A new table has none, and guesses', 'Autovacuum analyzes later, not at once', 'Bad estimates choose bad plans'],
        short: 'Because the planner chooses a plan from **statistics** about the table: how many rows, how many distinct values, and the most common ones. A freshly loaded table has none, so the planner guesses. In my recording a table of 100,000 rows had `reltuples` of -1, the planner expected 2 rows for a filter that returned 167, and after `ANALYZE` it expected 44, still lower than the truth because it assumed two columns were independent. Autovacuum does analyze after enough changes, but only after its naptime, and a pipeline that loads and queries in the next step runs a query on a table with no statistics. So I run `ANALYZE` after a large load, especially into a new or truncated table, and I raise the statistics target on columns that need it.',
        fu: [['What if the estimate is still wrong?', 'Extended statistics for columns that depend on each other (mission 5), or a higher statistics target.'], ['Does it lock?', 'No. It takes a light lock and reads a sample.']],
        trap: 'Assuming that the planner always knows the data.',
        real: 'Describe a plan that changed after an ANALYZE.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Bulk Loader', color: '#BBF7D0',
        pts: [
          '`COPY` is **' + LM[3][1] + '** statement, one flush. A row by row load with commits was **' + n(LM[0][1]) + '** of each.',
          'A bad row stops the whole `COPY`, and the error names the **line and column**. Stage into text columns and clean in SQL.',
          'Make a load **idempotent**: `DISTINCT ON`, `ON CONFLICT ... WHERE the row differs`, one transaction. The same file wrote **' + US.distinct_updated + '** rows the second time.',
          'A plain `DO UPDATE` rewrote ' + n(US.plain_second_updated) + ' rows and doubled the table. `MERGE` gave the same result and also deletes.',
          '`ANALYZE` after a big load: the estimate was ' + AN.estimate_before + ' for ' + AN.actual + ' real rows before it, and an **unlogged** load wrote ' + LW[2][1] + ' bytes of log.'
        ],
        lines: [
          'I load with COPY and a staging table.',
          'My loads write nothing the second time.',
          'I log how many rows each load wrote.'
        ]
      })
    ]
  });
})();
