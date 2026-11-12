/* Mission 9: changing data. INSERT, UPDATE and DELETE, RETURNING, constraints, loads that are safe to run twice, upserts, MERGE, NULL-safe comparison and slowly changing dimensions.
   Every result and every error text was returned by the engines when the recorder ran the statements. Each block ran inside a transaction that was rolled back. */
(function () {
  var B = LAB.b, G = LAB.get;
  function flat(t) { return t.rows.map(function (r) { return r.map(function (c) { return /^-?\d+(\.\d+)?$/.test(c) ? String(parseFloat(c)) : c === 'true' ? '1' : c === 'false' ? '0' : c; }).join('|'); }).join(';'); }
  function inFile(key, text) { return G.file(key).indexOf(text) >= 0; }
  var CI = G.on('m9.crud_insert', 'duckdb'), CU = G.on('m9.crud_update', 'duckdb'), CR = G.on('m9.crud', 'duckdb'), RE = G.on('m9.returning', 'duckdb');
  var UA = G.on('m9.update_all', 'duckdb'), UW = G.on('m9.update_where', 'duckdb');
  var ERR = { pk: {}, nn: {}, ck: {} };
  ['duckdb', 'postgres', 'sqlite'].forEach(function (e) { ERR.pk[e] = G.text('m9.pk_error.' + e + '.error'); ERR.nn[e] = G.text('m9.notnull_error.' + e + '.error'); ERR.ck[e] = G.text('m9.check_error.' + e + '.error'); });
  var AP1 = G.on('m9.append_once', 'duckdb').rows[0], AP2 = G.on('m9.append_twice', 'duckdb').rows[0], DI1 = G.on('m9.delete_insert_once', 'duckdb').rows[0], DI2 = G.on('m9.delete_insert', 'duckdb').rows[0];
  var UP1 = G.on('m9.upsert_run1', 'duckdb').rows[0], UP2 = G.on('m9.upsert_twice', 'duckdb').rows[0], UPT = G.on('m9.upsert', 'duckdb'), DN = G.on('m9.do_nothing', 'duckdb');
  var MR = G.on('m9.merge_result', 'duckdb'), MRP = G.on('m9.merge_result', 'postgres'), MSE = G.text('m9.merge.sqlite.error');
  var MD = { duckdb: G.text('m9.merge_dup.duckdb.error'), postgres: G.text('m9.merge_dup.postgres.error'), sqlite: G.text('m9.merge_dup.sqlite.error') };
  var UD = G.text('m9.upsert_dup.postgres.error'), UDV = { duckdb: G.on('m9.upsert_dup_value', 'duckdb').rows[0][2], sqlite: G.on('m9.upsert_dup_value', 'sqlite').rows[0][2] };
  var DF = G.on('m9.distinct_from', 'duckdb'), NE = G.on('m9.not_equal', 'duckdb');
  var S0 = G.on('m9.scd2_before', 'duckdb'), S1 = G.on('m9.scd2_closed', 'duckdb'), S2 = G.on('m9.scd2_final', 'duckdb'), S3 = G.on('m9.scd2', 'duckdb'), SC = G.on('m9.scd_compare', 'duckdb'), SB = G.on('m9.scd_bug', 'duckdb');
  var CHC = G.on('m9.ch_close', 'duckdb'), CHU = G.on('m9.ch_upsert', 'duckdb');
  var CRUD = G.file('m9.crud'), RETQ = G.file('m9.returning'), APQ = G.file('m9.append_twice'), UPQ = G.file('m9.upsert'), DNQ = G.file('m9.do_nothing'), DIQ = G.file('m9.delete_insert'), MQ = G.file('m9.merge_result'), DFQ = G.file('m9.distinct_from'), SCQ = G.file('m9.scd2'), SCCQ = G.file('m9.scd_compare');

  G.expect(CI.rows.length === 3 && CU.rows[0].join() === 'ESP-01,Espresso beans,35' && CR.rows.length === 2 && flat(G.on('m9.crud', 'postgres')) === flat(CR) && flat(G.on('m9.crud', 'sqlite')) === flat(CR), 'insert 3 rows, update one quantity to 35, delete the rows below 10: 2 rows remain on all engines');
  G.expect(flat(RE) === 'LAT-01|35;MUG-01|18' && flat(G.on('m9.returning', 'postgres')) === flat(RE) && flat(G.on('m9.returning', 'sqlite')) === flat(RE), 'RETURNING gives the changed rows on all three engines');
  G.expect(UA.rows.every(function (r) { return r[1] === '0'; }) && UW.rows.map(function (r) { return r[1]; }).join() === '40,25,0', 'UPDATE without WHERE zeroes all 3 rows and with WHERE only one');
  G.expect(/PRIMARY KEY or UNIQUE constraint violation/.test(ERR.pk.duckdb) && /duplicate key value violates unique constraint/.test(ERR.pk.postgres) && /UNIQUE constraint failed/.test(ERR.pk.sqlite) && /NOT NULL/i.test(ERR.nn.duckdb) && /not-null constraint/.test(ERR.nn.postgres) && /NOT NULL constraint failed/.test(ERR.nn.sqlite) && /CHECK constraint failed/.test(ERR.ck.duckdb) && /violates check constraint/.test(ERR.ck.postgres) && /CHECK constraint failed/.test(ERR.ck.sqlite), 'the nine constraint error texts');
  G.expect(AP1.join() === '10,410.00' && AP2.join() === '20,820.00' && DI1.join() === '10,410.00' && DI2.join() === '10,410.00' && UP1.join() === '11,456.50' && UP2.join() === '11,456.50', 'append twice doubles to 20 rows and 820.00, delete and insert stays at 10 and 410.00, upsert stays at 11 and 456.50');
  G.expect(UPT.rows.length === 11 && UPT.rows[1].join() === '1,2026-03-02,57.50' && flat(G.on('m9.upsert', 'postgres')) === flat(UPT) && flat(G.on('m9.upsert', 'sqlite')) === flat(UPT) && DN.rows[0].join() === '1,2026-03-02,55.00' && DN.rows.length === 3, 'upsert corrects 57.50 and adds 44.00, and DO NOTHING keeps 55.00');
  G.expect(MR.rows.length === 11 && flat(MR) === flat(MRP) && flat(MR) === flat(UPT) && /syntax error/.test(MSE), 'MERGE gives the same 11 rows as the upsert on DuckDB and PostgreSQL, and SQLite has no MERGE');
  G.expect(/cannot affect the same target row more than once/.test(MD.duckdb) && /cannot affect row a second time/.test(MD.postgres) && /cannot affect row a second time/.test(UD) && UDV.duckdb === '57.50' && UDV.sqlite === '58', 'duplicate source keys: errors in MERGE, an error on PostgreSQL upsert, the first value on DuckDB and the last on SQLite');
  G.expect(flat(DF) === '2|silver|gold;9|NULL|gold' && flat(NE) === '2|silver|gold' && flat(G.on('m9.distinct_from', 'sqlite')) === flat(DF), 'IS DISTINCT FROM finds customers 2 and 9 and <> finds only 2');
  G.expect(S0.rows.length === 5 && S1.rows[2].slice(4).join() === '2026-03-09,false' && S2.rows.length === 7 && S2.rows[5].join() === '6,2,gold,2026-03-10,9999-12-31,true' && S2.rows[6].join() === '7,9,gold,2026-03-10,9999-12-31,true' && flat(S3) === flat(S2) && flat(G.on('m9.scd2', 'postgres')) === flat(S2) && flat(G.on('m9.scd2', 'sqlite')) === flat(S2), 'the SCD2 steps close one row and insert two, a second run changes nothing, on all three engines');
  G.expect(SC.rows.length === 8 && SC.rows.filter(function (r) { return r[2] !== r[3]; }).map(function (r) { return r[0]; }).join() === '1003,1012' && flat(SC) === flat(G.on('m9.scd_compare', 'sqlite')), 'overwriting the tier would relabel orders 1003 and 1012');
  G.expect(SB.rows.length === 1 && SB.rows[0].join() === '2,2', 'inserting without closing leaves customer 2 with two current rows');
  G.expect(CHC.rows.length === 5 && CHC.rows[2].slice(4).join() === '2026-03-09,false' && CHU.rows.length === 11 && flat(CHU) === flat(UPT) && inFile('m9.upsert', "(1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00)"), 'the coding rounds');

  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }
  var STORE_DAY = G.table('data.daily_revenue');
  var INCOMING = { cols: ['store_id', 'day', 'revenue'], rows: [['1', '2026-03-02', '57.50'], ['2', '2026-03-05', '50.00'], ['1', '2026-03-06', '44.00']], types: ['INTEGER', 'DATE', 'DECIMAL(10,2)'] };
  var DIM = G.table('data.customer_dim'), CHG = G.table('data.customer_changes');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Changing data', short: 'Changes', blurb: 'INSERT, UPDATE and DELETE, constraints, loads that are safe to run twice, upsert and MERGE, and slowly changing dimensions', minutes: 60,
    focus: ['ing', 'stg', 'snap'],
    goals: [
      'Change rows with **INSERT, UPDATE and DELETE**, and see the changed rows with RETURNING.',
      'Let **constraints** stop bad rows, and read the three error messages.',
      'Write loads that are **safe to run twice**: delete and insert, upsert and MERGE.',
      'Compare values safely with **IS DISTINCT FROM** when NULL can appear.',
      'Keep history with a **type 2 slowly changing dimension**, and run it again without damage.'
    ],
    say: 'Mission 9 is about writing. Reading data forgives mistakes, and writing does not. A job that runs twice, an UPDATE without WHERE or a NULL in a comparison can cost a day. Every statement here ran in a transaction that was rolled back, so the recording shows real effects and the data stays clean. You will build a load that you can safely retry, and a dimension that keeps history.',
    scenes: [
      B.talk({
        id: 'm9-what', t: 1, src: 'docs', title: 'Writing data safely',
        say: 'Press Next for six ideas about changing data.',
        items: [
          ['Three statements change rows', '`INSERT` adds rows, `UPDATE` changes values and `DELETE` removes rows. UPDATE and DELETE without a WHERE clause touch every row.', 'Add, change, remove.'],
          ['Constraints guard the table', 'A primary key, NOT NULL and CHECK reject bad rows before they land. The error text differs by engine, and the idea is the same.', 'Let the table say no.'],
          ['A job will run twice', 'Retries, restarts and reruns are normal. A load that appends rows doubles the data when it runs twice. A safe load gives the same table after one run or after two.', 'Same result after a retry.'],
          ['Upsert and MERGE', 'An upsert inserts a row, or updates it when the key already exists. MERGE does the same with more control. Both need a unique key and one source row for each key.', 'Insert or update.'],
          ['Compare with NULL in mind', '`<>` is not true when a value is NULL, so a new row can slip past a change check. `IS DISTINCT FROM` treats NULL as a value.', 'NULL needs a null-safe test.'],
          ['History needs new rows', 'A dimension that overwrites a value forgets what was true before. A type 2 dimension closes the old row and adds a new one, with validity dates.', 'Close the old row, add a new one.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm9-crud', t: 1, src: 'rec', title: 'INSERT, UPDATE and DELETE', file: 'stock.sql', code: CRUD, ctx: G.ctx('duckdb'),
        result: res('m9.crud', 'duckdb'),
        steps: [
          { say: 'A small table of stock, so that you can watch each statement change it. The primary key is the SKU.' },
          { say: '`INSERT` adds three rows. The table now has ' + CI.rows.length + ' rows.', lines: G.span(CRUD, /^INSERT INTO stock/) },
          { say: '`UPDATE` changes the quantity of one SKU. The WHERE clause picks the row. Espresso beans went from 40 to ' + CU.rows[0][2] + '.', lines: G.span(CRUD, /^UPDATE stock/) },
          { say: '`DELETE` removes the rows below 10 units. The mug had 8.', lines: G.span(CRUD, /^DELETE FROM/) },
          { say: 'Run it. Two rows are left: the espresso beans (35) and the oat milk (25). The three engines ran the same statements and ended with the same rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm9-returning', t: 1, src: 'rec', title: 'RETURNING: see the rows you changed', file: 'returning.sql', code: RETQ, ctx: G.ctx('duckdb'),
        result: res('m9.returning', 'duckdb'),
        steps: [
          { say: 'After a change you often want to know which rows it touched. `RETURNING` gives them back, without a second query.' },
          { say: '`RETURNING sku, qty` lists the new values of the rows that the UPDATE changed.', lines: G.span(RETQ, /RETURNING/) },
          { say: 'Run it. Two rows had less than 30 units and got 10 more: the oat milk (35) and the mug (18). DuckDB, PostgreSQL and SQLite returned the same two rows.', run: true }
        ]
      }),

      B.bug({
        id: 'm9-bug-update', t: 1, title: 'Bug hunt: the quantities that went to zero',
        q: 'A job should set the quantity of the mug to 0. After it ran, all ' + UA.rows.length + ' SKUs show 0. Click the line that caused it.',
        file: 'sell_out.sql', lang: 'sql',
        code: ['UPDATE stock', 'SET qty = 0;'].join('\n'),
        bad: [2], hint: 'Which rows does this statement touch?',
        why: 'Without a WHERE clause an UPDATE changes every row. All three SKUs got 0. With `WHERE sku = \'MUG-01\'` only the mug changed and the quantities were 40, 25 and 0. Run the WHERE as a SELECT first, check the row count, and do changes inside a transaction.',
        fix: ['UPDATE stock', 'SET qty = 0', "WHERE sku = 'MUG-01';"].join('\n'),
        cheer: 'Say which rows you want before you say what to change.'
      }),

      B.cmp({
        id: 'm9-constraints', t: 1, src: 'rec', title: 'Constraints: what the engines say',
        say: 'Three bad inserts, on the same table, on three engines. Press Next for each kind.',
        cols: ['Bad row', 'DuckDB', 'PostgreSQL', 'SQLite'],
        hl: 0,
        rows: [
          ['A key that exists', ERR.pk.duckdb, ERR.pk.postgres, ERR.pk.sqlite],
          ['NULL in a NOT NULL column', ERR.nn.duckdb, ERR.nn.postgres, ERR.nn.sqlite],
          ['A value that breaks a CHECK', ERR.ck.duckdb, ERR.ck.postgres, ERR.ck.sqlite]
        ],
        steps: [
          { upto: 1, say: 'A duplicate key. The statement fails and no row is added. Every engine names the key or the constraint.' },
          { upto: 2, say: 'A NULL where the column forbids it. PostgreSQL names the column and the table.' },
          { upto: 3, say: 'A quantity of -3 against `CHECK (qty >= 0)`. The wording differs, and the effect is the same: the row is rejected.' }
        ],
        pick: 'A constraint turns a silent bad row into a loud error at load time. Add them, and let the job fail early.'
      }),

      B.sql({
        id: 'm9-append-twice', t: 1, src: 'rec', title: 'A load that runs twice', file: 'append_twice.sql', code: APQ, ctx: G.ctx('duckdb'),
        result: res('m9.append_twice', 'duckdb'),
        steps: [
          { say: 'The simplest load: `INSERT ... SELECT` into a table with no key. It works once. What happens when the job runs twice?' },
          { say: 'The same INSERT appears twice, as if the scheduler retried the job.', lines: G.span(APQ, /^INSERT INTO loaded/) },
          { say: 'Run it. After one run the table had ' + AP1[0] + ' rows and ' + AP1[1] + ' of revenue. After the second run it has ' + AP2[0] + ' rows and ' + AP2[1] + '. Every number on the dashboard is double. The three engines agree: nothing in the table stopped the repeat.', run: true }
        ]
      }),

      B.flow({
        id: 'm9-flow', t: 2, src: 'docs', title: 'A reload that is safe to run twice', g: 'upsert', legend: true,
        steps: [
          { say: 'The idea: load into a staging table, then match each staging row to the target on the key. Press Next to follow the rows.', tags: ['tg_u1'] },
          { say: 'Step 1. The source file is read.', on: ['r1'], focus: ['u_src', 'u_stage'], cap: 'Read.' },
          { say: 'Step 2. The rows land in a staging table as they arrive, with no changes.', on: ['r2'], focus: ['u_stage', 'u_match'], tags: ['tg_u2'], cap: 'Stage.' },
          { say: 'Step 3. A staging row whose key exists in the target is a matched row. Its values replace the old ones.', on: ['r3'], focus: ['u_match', 'u_upd'], cap: 'Update.' },
          { say: 'Step 4. A staging row with a new key has no match. It is inserted.', on: ['r4'], focus: ['u_match', 'u_ins'], cap: 'Insert.' },
          { say: 'Step 5. Both paths end in the target table. Because each key appears once, running the same load again updates the same rows with the same values and inserts nothing.', on: ['r5', 'r6'], focus: ['u_upd', 'u_ins', 'u_tgt'], cap: 'One row for each key.' }
        ]
      }),

      B.sql({
        id: 'm9-upsert', t: 1, src: 'rec', title: 'Upsert: INSERT ... ON CONFLICT', file: 'upsert.sql', code: UPQ, ctx: G.ctx('duckdb'),
        result: res('m9.upsert', 'duckdb'),
        steps: [
          { say: 'The table `store_day` has a primary key on store and day, and holds the daily revenue. A feed brings three rows: two corrections and one new day.' },
          { say: '`ON CONFLICT (store_id, day) DO UPDATE` says what to do when the key exists: set the revenue to the incoming value. `excluded` is the row that was refused.', lines: G.span(UPQ, /^ON CONFLICT/, /DO UPDATE SET/) },
          { say: 'Run it. 11 rows. Store 1 on 2 March is now 57.50 and no longer 55.00. Store 1 on 6 March was added with 44.00. The statement ran twice in this scene, and the table stayed at ' + UP1[0] + ' rows and ' + UP1[1] + ' of revenue after each run. DuckDB, PostgreSQL and SQLite returned the same table.', run: true }
        ],
        note: 'SQLite needs `WHERE true` after the SELECT, so that the parser does not take ON CONFLICT for part of a join.'
      }),

      B.sql({
        id: 'm9-do-nothing', t: 2, src: 'rec', title: 'DO NOTHING: the first value wins', file: 'do_nothing.sql', code: DNQ, ctx: G.ctx('duckdb'),
        result: res('m9.do_nothing', 'duckdb'),
        steps: [
          { say: 'Sometimes you only want to add the rows that are missing and keep what is there. `DO NOTHING` skips the rows whose key exists.' },
          { say: 'Run it. Store 1 on 2 March keeps 55.00, and the correction 57.50 was ignored. Store 1 on 6 March was added with 44.00. Use DO NOTHING for facts that never change, and DO UPDATE for values that can be corrected.', run: true }
        ]
      }),

      B.sql({
        id: 'm9-delete-insert', t: 2, src: 'rec', title: 'Delete and insert a partition', file: 'delete_insert.sql', code: DIQ, ctx: G.ctx('duckdb'),
        result: res('m9.delete_insert', 'duckdb'),
        steps: [
          { say: 'Another safe pattern: remove the rows of the period that you are about to reload, then insert them again. It needs no key.' },
          { say: 'The DELETE and the INSERT use the same date range, so the period is replaced as a whole.', lines: G.span(DIQ, /^DELETE FROM loaded/, /^INSERT INTO loaded SELECT store_id, day, revenue FROM daily_revenue WHERE/) },
          { say: 'Run it. The table has ' + DI2[0] + ' rows and ' + DI2[1] + ' of revenue after the reload, the same as before it. Both statements belong in one transaction. Otherwise a failure between them leaves a hole.', run: true }
        ]
      }),

      B.cmp({
        id: 'm9-load-cmp', t: 2, src: 'rec', title: 'Three loads, run once and run twice',
        say: 'The same feed, three ways to load it. Press Next for each one.',
        cols: ['Load', 'After one run', 'After two runs', 'Safe to run twice?'],
        hl: 3,
        rows: [
          ['Append with INSERT', AP1[0] + ' rows, ' + AP1[1], AP2[0] + ' rows, ' + AP2[1], 'No: the data doubles'],
          ['Delete the period, then insert', DI1[0] + ' rows, ' + DI1[1], DI2[0] + ' rows, ' + DI2[1], 'Yes, with one transaction'],
          ['Upsert with ON CONFLICT', UP1[0] + ' rows, ' + UP1[1], UP2[0] + ' rows, ' + UP2[1], 'Yes, with a unique key']
        ],
        steps: [
          { upto: 1, say: 'The append doubled to 20 rows and 820.00.' },
          { upto: 2, say: 'Delete and insert stayed at 10 rows and 410.00. It replaces a period, so it suits partitioned data.' },
          { upto: 3, say: 'The upsert stayed at 11 rows and 456.50. It suits tables that change row by row, and it needs a unique key.' }
        ],
        pick: 'Make every job idempotent: the same input must give the same table, however many times it runs.'
      }),

      B.sql({
        id: 'm9-merge', t: 2, src: 'rec', title: 'MERGE: match, update, insert', file: 'merge.sql', code: MQ, ctx: G.ctx('postgres'),
        result: res('m9.merge_result', 'postgres'),
        steps: [
          { say: '`MERGE` is the standard statement for this job. It joins a source to a target and says what to do for each case.' },
          { say: '`WHEN MATCHED THEN UPDATE` handles the keys that exist. `WHEN NOT MATCHED THEN INSERT` handles the new ones.', lines: G.span(MQ, /^WHEN MATCHED/, /INSERT \(store_id/) },
          { say: 'Run it on PostgreSQL. The same 11 rows as the upsert, with the corrected 57.50 and the new 44.00. DuckDB gave identical rows. SQLite stopped with: ' + MSE + '. It has no MERGE, so there you use ON CONFLICT.', run: true }
        ]
      }),

      B.cmp({
        id: 'm9-dup-source', t: 3, src: 'rec', title: 'Two source rows with one key',
        say: 'The feed contains the key (1, 2 March) twice, with 57.50 and 58.00. Press Next to see what each engine does.',
        cols: ['Statement', 'DuckDB', 'PostgreSQL', 'SQLite'],
        hl: 0,
        rows: [
          ['MERGE', MD.duckdb, MD.postgres, MD.sqlite],
          ['INSERT ... ON CONFLICT DO UPDATE', 'No error. The table kept ' + UDV.duckdb, UD, 'No error. The table kept ' + UDV.sqlite]
        ],
        steps: [
          { upto: 1, say: 'MERGE refuses to touch one target row twice, on DuckDB and PostgreSQL. SQLite has no MERGE.' },
          { upto: 2, say: 'The upsert behaves differently on each engine. PostgreSQL raises an error. DuckDB kept the first value, 57.50. SQLite kept the last, 58. The same statement gave three outcomes.' }
        ],
        pick: 'Deduplicate the source first, with the pattern from mission 8. Then the key is unique, and every engine gives the same answer.'
      }),

      B.sql({
        id: 'm9-distinct-from', t: 2, src: 'rec', title: 'Detect changes: IS DISTINCT FROM', file: 'changed_customers.sql', code: DFQ, ctx: G.ctx('duckdb'),
        result: res('m9.distinct_from', 'duckdb'),
        steps: [
          { say: 'The feed `customer_changes` lists customers with a tier. Which ones are new or changed compared with the current dimension?' },
          { say: 'The LEFT JOIN keeps customers that are not in the dimension yet. For them `d.tier` is NULL.', lines: G.span(DFQ, /^LEFT JOIN/) },
          { say: '`IS DISTINCT FROM` is a comparison that treats NULL as a value: NULL is distinct from gold, and NULL is not distinct from NULL.', lines: G.span(DFQ, /IS DISTINCT FROM/) },
          { say: 'Run it. Two rows: customer 2 changed from silver to gold, and customer 9 is new. With `<>` instead, I ran ' + NE.rows.length + ' row: only customer 2, because NULL <> gold is not true and the new customer slipped through. DuckDB, PostgreSQL and SQLite agreed.', run: true }
        ]
      }),

      B.cmp({
        id: 'm9-scd-types', t: 2, src: 'docs', title: 'Slowly changing dimensions: the types',
        say: 'A dimension describes a thing, such as a customer. Its values change slowly. Press Next for the three types you will meet most.',
        cols: ['Type', 'What happens to a change', 'History', 'Use it when'],
        hl: 2,
        rows: [
          ['Type 1', 'The old value is overwritten', 'Lost', 'The old value was an error, or nobody needs it'],
          ['Type 2', 'The old row is closed and a new row is added, with validity dates', 'Kept in full', 'Reports must show what was true at the time'],
          ['Type 3', 'A second column keeps the previous value', 'One step back', 'You only ever compare with the last value']
        ],
        steps: [
          { upto: 1, say: 'Type 1 is the simplest, and it rewrites the past: an old order shows the new value.' },
          { upto: 2, say: 'Type 2 adds a row for each version. The dimension has valid_from, valid_to and an is_current flag, as `customer_dim` does.' },
          { upto: 3, say: 'Type 3 holds one previous value in a column. It is rare, because it forgets anything older.' }
        ],
        pick: 'Choose type 2 when a report must be correct for the past. Choose type 1 when history has no value.'
      }),

      B.sql({
        id: 'm9-scd2', t: 2, src: 'rec', title: 'A type 2 dimension in two statements', file: 'scd2.sql', code: SCQ, ctx: G.ctx('duckdb'),
        result: res('m9.scd2', 'duckdb'),
        steps: [
          { say: 'The dimension `customer_dim` has a row for each version of a customer. The feed of 10 March has new tiers. Two statements apply it. They run on a copy called `dim`.' },
          { say: 'Statement 1 closes the current row of every customer whose tier changed: valid_to is the day before the change, and is_current becomes false.', lines: G.span(SCQ, /^UPDATE dim/, /\);$/) },
          { say: 'Statement 2 inserts a current row for every customer in the feed that has no current row with that tier. That covers the changed customers and the new ones. The new keys continue after the highest key.', lines: G.span(SCQ, /^INSERT INTO dim/, /^\);$/) },
          { say: 'Both statements run a second time at the end of the script. Run it. The dimension has 7 rows after the first run, and 7 rows after the second: the guard conditions find nothing left to do. DuckDB, PostgreSQL and SQLite returned the same rows. SQLite shows is_current as 1 and 0.', run: true }
        ]
      }),

      B.widget({ id: 'm9-lab-scd', kind: 'scd2', t: 2, src: 'rec', title: 'Lab: apply the change feed, stage by stage' }),

      B.sql({
        id: 'm9-scd-compare', t: 2, src: 'rec', title: 'Why history matters: orders by tier', file: 'orders_by_tier.sql', code: SCCQ, ctx: G.ctx('duckdb'),
        result: res('m9.scd_compare', 'duckdb'),
        steps: [
          { say: 'Two dimensions after the same feed: `dim2` keeps history, `dim1` overwrote the tier. Join each order to both.' },
          { say: 'The history join matches the order date to the validity period of the row.', lines: G.span(SCCQ, /^JOIN dim2/) },
          { say: 'Run it. Orders 1003 and 1012 belong to customer 2, and they were placed before 10 March. With history they are silver, the tier that was true then. With the tier overwritten they show gold. A report of revenue by tier would move those two orders from silver to gold.', run: true }
        ]
      }),

      B.bug({
        id: 'm9-bug-scd', t: 2, title: 'Bug hunt: the customer with two current rows',
        q: 'A new dimension job inserts a row for each changed customer. Afterwards customer 2 has ' + SB.rows[0][1] + ' rows with `is_current = true`, and revenue by customer is counted twice. Click the statement that adds a version without closing the old one.',
        file: 'scd2_bug.sql', lang: 'sql',
        code: G.file('m9.scd_bug').split('\n').slice(1, 6).join('\n'),
        bad: [1], hint: 'What happens to the old row of a customer whose tier changed?',
        why: 'The job adds the new version and never closes the old one. Both rows stay current, so a join on `is_current` returns two rows for customer 2 and doubles the numbers. Close the old row first (valid_to and is_current), and add a check that every customer has exactly one current row.',
        fix: ['UPDATE dim SET valid_to = \'2026-03-09\', is_current = false', 'WHERE is_current AND EXISTS (SELECT 1 FROM customer_changes AS c WHERE c.customer_id = dim.customer_id AND c.tier <> dim.tier);', '-- then the INSERT of the new rows'].join('\n'),
        cheer: 'A dimension job has two halves. Close, then insert.'
      }),

      B.quiz({
        id: 'm9-q-update', t: 1, q: 'A table has 3 rows. What does `DELETE FROM stock;` do?',
        opts: [
          { t: 'It returns an error: DELETE needs a WHERE clause', fb: 'The statement is valid. The engine does not ask for a WHERE clause.' },
          { t: 'It deletes only the first row', fb: 'DELETE has no limit unless you add one. It removes every row that matches.' },
          { t: 'It deletes all 3 rows and keeps the empty table', fb: '' },
          { t: 'It drops the table', fb: 'DROP TABLE removes the table. DELETE only removes rows.' }
        ],
        ok: 2, why: 'Without a WHERE clause the condition is true for every row, so every row goes and the table stays with its columns and constraints. The same holds for UPDATE: in the recording an UPDATE without WHERE set all 3 quantities to 0.'
      }),

      B.quiz({
        id: 'm9-q-conflict', t: 2, q: 'An upsert has an incoming correction for a key that exists. You want the correction to replace the old value. Which clause?',
        opts: [
          { t: 'ON CONFLICT DO NOTHING', fb: 'It keeps the old value and ignores the correction: in the recording 55.00 stayed.' },
          { t: 'ON CONFLICT DO UPDATE SET revenue = excluded.revenue', fb: '' },
          { t: 'INSERT with no ON CONFLICT clause', fb: 'It fails with a duplicate key error, and no row changes.' },
          { t: 'DELETE the whole table first', fb: 'It would work, and it loses every row that is not in the feed.' }
        ],
        ok: 1, why: 'DO UPDATE sets the columns of the existing row from `excluded`, the row that was refused. The recording shows 55.00 becoming 57.50, and the second run of the same statement changing nothing.'
      }),

      B.quiz({
        id: 'm9-q-scd', t: 2, q: 'Order 1003 of customer 2 was placed on 2 March. The tier of customer 2 changed to gold on 10 March. Which tier should a type 2 dimension give for that order?',
        opts: [
          { t: 'Gold, the current tier', fb: 'That is the result of overwriting the value (type 1).' },
          { t: 'Silver, the tier on 2 March', fb: '' },
          { t: 'NULL, because two rows match', fb: 'Only one row has a validity period that contains 2 March, so one row matches.' },
          { t: 'Both tiers, in two rows', fb: 'A correct type 2 dimension has no overlapping periods. One row matches an order date.' }
        ],
        ok: 1, why: 'The old row is valid from 12 January to 9 March, and it contains 2 March. The new gold row starts on 10 March. The recording joined the order to the silver row, and the overwritten table showed gold.'
      }),

      B.challenge({
        id: 'm9-ch-upsert', t: 1, title: 'Coding round: load the corrections safely', file: 'load_corrections.sql', lang: 'sql',
        q: 'The table `store_day` has the primary key (store_id, day). Load the rows of `incoming` into it. A key that exists must take the **incoming revenue**, and a new key must be added. The load must be safe to run twice. Then return the table ordered by store and day.',
        data: [
          { name: 'store_day (primary key: store_id, day)', cols: ['store_id', 'day', 'revenue'], rows: STORE_DAY.rows, types: ['INTEGER', 'DATE', 'DECIMAL(10,2)'], pk: ['store_id', 'day'] },
          { name: 'incoming', cols: INCOMING.cols, rows: INCOMING.rows, types: INCOMING.types }
        ],
        starter: '-- load incoming into store_day, then show the table\nINSERT INTO store_day\nSELECT ...;\n\nSELECT ...;',
        hints: ['`INSERT ... SELECT` reads the rows of incoming.', '`ON CONFLICT (store_id, day) DO UPDATE SET ...` handles a key that exists.', '`excluded.revenue` is the incoming value.'],
        sol: G.file('m9.ch_upsert'),
        res: res('m9.ch_upsert', 'duckdb'),
        expl: ['The INSERT adds the new key (store 1, 6 March). For a key that exists, ON CONFLICT DO UPDATE replaces the revenue with `excluded.revenue`: store 1 on 2 March becomes 57.50.', 'Running it again finds the same keys and the same values, so the table stays at 11 rows. That is what makes it safe to retry.', 'The incoming rows must have one row for each key. Two rows with the same key give an error on PostgreSQL and an arbitrary winner elsewhere.'],
        cx: 'One lookup of the key for each incoming row, and a write for each row that is new or changed.'
      }),

      B.challenge({
        id: 'm9-ch-close', t: 2, title: 'Coding round: close the rows that changed', file: 'close_rows.sql', lang: 'sql',
        q: 'The table `customer_dim` keeps a row for each version of a customer. The feed `customer_changes` has the new tiers of 10 March. **Close the current row** of every customer whose tier is different in the feed: set `valid_to` to `2026-03-09` and `is_current` to false. Then return the dimension ordered by `customer_key`.',
        data: [
          { name: 'customer_dim', cols: DIM.cols, rows: DIM.rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DATE', 'DATE', 'BOOLEAN'] },
          { name: 'customer_changes', cols: CHG.cols, rows: CHG.rows, types: ['INTEGER', 'VARCHAR', 'DATE'] }
        ],
        starter: '-- close the current row of customers whose tier changed\nUPDATE customer_dim\nSET ...\nWHERE ...;\n\nSELECT ...;',
        hints: ['Only current rows can be closed: `WHERE is_current`.', 'A correlated EXISTS looks for the same customer in the feed with another tier.', 'Customers 1 and 4 are in the feed with the tier they already have.'],
        sol: G.file('m9.ch_close'),
        res: res('m9.ch_close', 'duckdb'),
        expl: ['`EXISTS` with `c.tier <> customer_dim.tier` finds the customers whose tier differs: only customer 2.', 'The UPDATE changes only that row: valid_to 2026-03-09 and is_current false. Customers 1 and 4 are in the feed with the same tier and stay current.', 'A new customer such as 9 has no current row, so nothing is closed for it. The next statement of the job adds the new rows.'],
        cx: 'One scan of the current rows and a lookup in the feed for each.'
      }),

      B.challenge({
        id: 'm9-ch-changed', t: 2, title: 'Coding round: new or changed customers', file: 'changed.sql', lang: 'sql',
        q: 'Return the customers of `customer_changes` that are **new or have a different tier** than their current row in `customer_dim`: `customer_id`, `old_tier` and `new_tier`, ordered by customer. A new customer has a NULL old tier.',
        data: [
          { name: 'customer_dim', cols: DIM.cols, rows: DIM.rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DATE', 'DATE', 'BOOLEAN'] },
          { name: 'customer_changes', cols: CHG.cols, rows: CHG.rows, types: ['INTEGER', 'VARCHAR', 'DATE'] }
        ],
        starter: '-- new or changed customers\nSELECT ...',
        hints: ['A LEFT JOIN keeps the customers that are not in the dimension.', 'Join on the current row only.', 'Compare the tiers with IS DISTINCT FROM, not with <>.'],
        sol: DFQ,
        res: res('m9.distinct_from', 'duckdb'),
        expl: ['The LEFT JOIN to the current rows gives NULL as the old tier for customer 9, who is new.', '`IS DISTINCT FROM` is true for silver against gold and for NULL against gold. It is false for gold against gold, so customers 1 and 4 are left out.', 'With `<>` customer 9 would be missing, because a comparison with NULL is never true.'],
        cx: 'One join on the key, and a comparison for each feed row.'
      }),

      B.decide({
        id: 'm9-dec-load', t: 2, title: 'Decision: how does the nightly job write yesterday?',
        scenario: 'A job loads the orders of yesterday into a reporting table every night at 02:00. It sometimes fails halfway and the scheduler retries it, and sometimes someone reruns a whole week. The table is read by dashboards all day. How should the job write?',
        opts: [
          { t: 'INSERT the rows of yesterday', d: 'The simplest statement.', lose: 'A retry or a rerun doubles the rows. In the recording an append run twice gave 20 rows and 820.00 where 10 and 410.00 were right.' },
          { t: 'TRUNCATE the table and reload everything', d: 'Always correct.', lose: 'Dashboards see an empty or half-filled table during the load, and the job gets slower every month.' },
          { t: 'Delete the loaded days, then insert them again, in one transaction', d: 'Replaces a whole period. Needs no unique key.', lose: '' },
          { t: 'Skip the job when it fails and fix it by hand', d: 'No code to write.', lose: 'The table is wrong until someone notices, and manual fixes are not repeatable.' }
        ],
        pick: 2,
        why: 'Replacing the period inside one transaction gives the same table after one run or after five, and readers never see a half-loaded day. In the recording the delete and insert kept 10 rows and 410.00 on every run.',
        when: 'If the table changes row by row and has a unique key, an upsert or MERGE is a better fit, with the source deduplicated first.'
      }),

      B.incident({
        id: 'm9-inc-update', t: 2, time: '14:03',
        alert: 'At 14:03 a script ran `UPDATE stock SET qty = 0` in the production database to sell out one product. The dashboard now shows zero stock for every product, and the website says "out of stock" everywhere.',
        clues: ['The statement has no WHERE clause.', 'It ran in autocommit mode: no transaction was open.', 'A backup from 02:00 exists, and orders have arrived since then.'],
        opts: [
          { t: 'Restore the 02:00 backup over the table', fb: 'It brings the stock back and loses 12 hours of orders and stock movements.' },
          { t: 'Stop the shop, find the old values from a log or a snapshot taken before the change, and write them back with a targeted UPDATE', fb: '' },
          { t: 'Run UPDATE again with a guess of the values', fb: 'A guess makes the data wrong in a new way.' },
          { t: 'Wait: the next stock sync will repair it', fb: 'The shop shows out of stock to customers until then, and a sync may overwrite more.' }
        ],
        best: 1,
        why: 'The old values are recoverable from a point-in-time snapshot or a change log. A targeted UPDATE that writes them back keeps the orders since 02:00. In the recording, an UPDATE without WHERE set all 3 rows to 0, and the same statement with `WHERE sku = \'MUG-01\'` changed one row.',
        checks: [['Stop the damage', 'Pause the shop or the stock feed so that new writes do not pile on.'], ['Find the old values', 'Use a snapshot, point-in-time recovery or the change log, and compare with the current table.'], ['Write them back', 'A targeted UPDATE inside a transaction, with the row count checked before COMMIT.'], ['Prevent it', 'Run changes in a transaction, run the WHERE as a SELECT first, and limit who can write to production.']],
        tell: 'An UPDATE without WHERE zeroed the stock of every product at 14:03. I paused the stock feed, found the values from the snapshot taken before the change, and wrote them back with a targeted UPDATE in a transaction, checking the row count before COMMIT, so the orders since the morning backup were kept. Afterwards I added a rule to run every change as a SELECT first and inside a transaction.',
        prevent: ['Run the WHERE as a SELECT first and check the row count.', 'Use a transaction and COMMIT only after the count looks right.', 'Keep point-in-time recovery on, and limit write access to production.']
      }),

      B.qa({
        id: 'qa-dml', t: 1, tag: 'Writing data', secs: 60,
        q: 'What are INSERT, UPDATE and DELETE, and how do you make them safe?',
        pts: ['Add, change, remove rows', 'WHERE picks the rows', 'Run the WHERE as a SELECT first', 'Transaction and row count', 'RETURNING shows the changed rows'],
        short: 'INSERT adds rows, UPDATE changes values and DELETE removes rows. UPDATE and DELETE without a WHERE clause touch every row: in my test an UPDATE without WHERE set all three quantities to 0. To be safe I run the WHERE as a SELECT first and check the row count, I do the change inside a transaction, and I commit only when the count looks right. RETURNING gives back the rows that were changed, so I can check them in the same statement. DuckDB, PostgreSQL and SQLite all returned them in my test. In production I also limit who can write, and keep point-in-time recovery on.',
        fu: [['What is the difference between DELETE and TRUNCATE?', 'DELETE removes the rows that match a condition and can be rolled back. TRUNCATE empties a whole table quickly, and its transaction behavior depends on the engine.']],
        trap: 'Running UPDATE or DELETE without a WHERE clause on production.',
        real: 'Tell about a change you made safely, or a mistake that taught you to.'
      }),

      B.qa({
        id: 'qa-constraints', t: 1, tag: 'Writing data', secs: 60,
        q: 'Why do you use constraints, and which ones?',
        pts: ['Reject bad rows at write time', 'Primary key, NOT NULL, CHECK, foreign key', 'Loud error is better than silent bad data', 'Warehouses may not enforce them'],
        short: 'A constraint rejects a bad row when it is written, so the problem shows up in the job that wrote it, not in a dashboard weeks later. I use a primary key or unique constraint for the grain of the table, NOT NULL for required columns, CHECK for simple rules such as qty >= 0, and foreign keys where the engine enforces them. In my test all three engines rejected a duplicate key, a NULL in a NOT NULL column and a negative quantity, each with its own message. Some analytic warehouses accept constraints but do not enforce them, so there I also write tests that check the same rules after each load.',
        fu: [['What if a constraint blocks a valid load?', 'The data or the constraint is wrong. I fix the cause. I do not drop the constraint to get the job green.']],
        trap: 'Assuming that a key is unique because it is declared in a warehouse that does not enforce it.',
        real: 'Tell about a bad row that a constraint caught.'
      }),

      B.qa({
        id: 'qa-idempotent', t: 1, tag: 'Loads', secs: 60,
        q: 'What is an idempotent load and how do you build one?',
        pts: ['Same result after one run or many', 'Retries and reruns are normal', 'Delete and insert a period in one transaction', 'Upsert or MERGE with a unique key'],
        short: 'An idempotent load gives the same table after one run or after many. Jobs retry and people rerun them, so I design for it. A plain INSERT is not safe: in my test it gave 20 rows and 820.00 after two runs where 10 rows and 410.00 were right. Two patterns are safe. I delete the period that I reload and insert it again, in one transaction, so readers never see a half-loaded day. Or I upsert into a table with a unique key, which gave 11 rows and 456.50 after one run and after two. Either way I deduplicate the source first, and I add a test that a rerun does not change the totals.',
        fu: [['Which do you choose for a table partitioned by day?', 'Delete and insert the day. It is simple, fast, and needs no key.']],
        trap: 'Appending rows in a job that the scheduler can retry.',
        real: 'Tell about a retry that doubled data, or a load that you made safe.'
      }),

      B.qa({
        id: 'qa-upsert-merge', t: 2, tag: 'Loads', secs: 60,
        q: 'Upsert or MERGE: how do they work and how do they differ?',
        pts: ['Update the row if the key exists, insert if not', 'ON CONFLICT is shorter and needs a unique constraint', 'MERGE is the standard and has more cases', 'SQLite has no MERGE'],
        short: 'Both match incoming rows to the table on a key. A matched row is updated and an unmatched row is inserted. INSERT ... ON CONFLICT DO UPDATE is short and needs a unique constraint on the key. MERGE is the SQL standard: it joins a source to a target and has WHEN MATCHED and WHEN NOT MATCHED branches, and it can add conditions, so it can also do deletes. In my test both gave the same 11 rows on DuckDB and PostgreSQL, and SQLite stopped with a syntax error on MERGE, so there I use ON CONFLICT. DO NOTHING keeps the old value: store 1 stayed at 55.00 instead of the corrected 57.50.',
        fu: [['What if the source has the same key twice?', 'MERGE raises an error on DuckDB and PostgreSQL. I deduplicate the source first.']],
        trap: 'An upsert whose source has duplicate keys.',
        real: 'Tell about a table you kept in sync with an upsert.'
      }),

      B.qa({
        id: 'qa-merge-dups', t: 3, tag: 'Loads', secs: 60,
        q: 'What happens when the source of an upsert has the same key twice?',
        pts: ['MERGE raises an error', 'ON CONFLICT differs by engine', 'Deduplicate the source first', 'Test the key'],
        short: 'The answer depends on the statement and the engine, which is why I never rely on it. In my test MERGE refused on DuckDB with "cannot affect the same target row more than once" and on PostgreSQL with "cannot affect row a second time". INSERT ... ON CONFLICT DO UPDATE raised an error on PostgreSQL, kept the first value (57.50) on DuckDB and kept the last value (58) on SQLite. Three engines gave three outcomes, and two of them are silent. So I deduplicate the source before the load, with ROW_NUMBER over the key and the load time, and I add a test that the key is unique in the staging table.',
        fu: [['Why is a silent winner dangerous?', 'The load succeeds with a value that depends on row order, so the result can change between runs or engines.']],
        trap: 'Trusting that the last row wins.',
        real: 'Tell about a load that picked the wrong duplicate.'
      }),

      B.qa({
        id: 'qa-scd', t: 2, tag: 'Dimensions', secs: 60,
        q: 'How do you build a type 2 slowly changing dimension?',
        pts: ['Row for each version with valid_from and valid_to', 'Close the old row', 'Insert the new row', 'Idempotent guards', 'Join facts by date'],
        short: 'A type 2 dimension keeps a row for each version, with valid_from, valid_to and an is_current flag. For each change feed I run two statements. First I close the current row of every key whose attribute changed: valid_to is the day before the change and is_current becomes false. Then I insert a current row for every key in the feed that has no current row with that value, which covers changed and new keys. In my test one row was closed, two were inserted, and running both statements again changed nothing. Facts join to it by key and by date being between the validity dates. A check that each key has one current row catches the bug of forgetting the first statement.',
        fu: [['How do you join an order to the dimension?', 'On the key, and on the order date between valid_from and valid_to. In my test orders 1003 and 1012 got silver, the tier at that time.']],
        trap: 'Inserting the new row without closing the old one.',
        real: 'Tell about a dimension where history mattered.'
      }),

      B.qa({
        id: 'qa-null-safe', t: 2, tag: 'Dimensions', secs: 60,
        q: 'How do you compare two columns when NULL can appear?',
        pts: ['<> is not true when a value is NULL', 'IS DISTINCT FROM treats NULL as a value', 'Matters for change detection', 'Alternatives: coalesce with a sentinel'],
        short: 'A comparison with NULL is never true, so `old <> new` misses a change from or to NULL. IS DISTINCT FROM treats NULL as a value: NULL is distinct from gold, and NULL is not distinct from NULL. In my change detection a new customer had a NULL old tier. With <> I found 1 changed customer, and with IS DISTINCT FROM I found 2, the changed one and the new one. DuckDB, PostgreSQL and SQLite all returned that. If an engine lacks it, I use coalesce with a sentinel value that cannot occur, or two explicit tests with IS NULL. It matters most when I compare a staging row with its current row.',
        fu: [['What does NULL = NULL return?', 'NULL, which is not true. That is why joins on a nullable key drop those rows.']],
        trap: 'Using <> for change detection on a nullable column.',
        real: 'Tell about a change check that missed new rows.'
      }),

      B.qa({
        id: 'qa-scd-choice', t: 3, tag: 'Dimensions', secs: 60,
        q: 'Which slowly changing dimension type do you choose?',
        pts: ['Type 1 overwrites and loses history', 'Type 2 keeps full history', 'Type 3 keeps one previous value', 'Decide by the question reports ask'],
        short: 'I choose by the question that reports must answer. Type 1 overwrites the value and is right when the old value was an error or nobody needs the past. Type 2 keeps a row for each version and is right when a report must show what was true at the time. In my test, orders 1003 and 1012 were silver when they were placed, and an overwritten dimension would have shown them as gold, moving revenue between tiers in old reports. Type 3 keeps one previous value in a column and is rare. Type 2 costs more rows, more joins by date and a job that must be idempotent, so I use it only for attributes where history has value.',
        fu: [['Can you mix types in one dimension?', 'Yes. Often some columns are type 1 and others type 2. It is called a hybrid, and I document which is which.']],
        trap: 'Choosing type 2 for every column, and paying for history that nobody reads.',
        real: 'Tell about an attribute whose history changed a report.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Safe Writer', color: '#FED7AA',
        pts: [
          '**INSERT, UPDATE, DELETE.** Without WHERE they touch every row: an UPDATE zeroed all 3 quantities. Check the WHERE as a SELECT, use a transaction, read RETURNING.',
          '**Constraints** reject bad rows at write time. The three engines refused a duplicate key, a NULL and a negative quantity with different words.',
          'A job runs twice. Append doubled 10 rows to 20 and 410.00 to 820.00. **Delete and insert a period** and **upsert** stayed correct.',
          '**ON CONFLICT DO UPDATE** and **MERGE** need a unique key and one source row for each key. With duplicate source keys, engines raise an error or pick the first or the last value.',
          '**IS DISTINCT FROM** finds changes when NULL appears: 2 customers against 1 with <>.',
          'A **type 2 dimension** closes the old row and inserts the new one, with guards so that a rerun changes nothing. History keeps old orders at their old tier.'
        ],
        lines: [
          'I make every load safe to run twice, and I test it by running it twice.',
          'I deduplicate the source before an upsert.',
          'I close the old row before I insert the new version.'
        ]
      })
    ]
  });
})();
