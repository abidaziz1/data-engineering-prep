/* Mission 10: transactions, isolation and locks. Every transcript in this mission is a real run: two client sessions, A and B, connected to a PostgreSQL server,
   executed the statements in the order shown. The recording keeps what each statement returned, including errors. DuckDB and SQLite appear once, for contrast. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LAB10 = G.counts('m10.lab'), TR = G.counts('m10.transfer'), DI = G.counts('m10.dirty'), RP = G.counts('m10.replace'), SP = G.counts('m10.savepoint'), LK = G.counts('m10.locks'), QU = G.counts('m10.queue');
  var DD = G.counts('m10.deadlock_default').postgres, DL = G.counts('m10.deadlock'), LF = G.counts('m10.lost_fixes'), SR = G.counts('m10.skew_retry'), DK = G.counts('m10.duckdb_conflict'), SL = G.counts('m10.sqlite_locked'), DEF = G.counts('m10.default_level');
  function run(sc, lv) { return LAB10.runs[sc + '|' + lv]; }
  function outs(r) { return r.steps.map(function (x) { return x.out; }); }
  function has(r, re) { return r.steps.some(function (x) { return re.test(x.out); }); }
  function out(steps, who, re) { var f = steps.filter(function (x) { return x.who === who && re.test(x.sql); }); return f.length ? f[f.length - 1].out : ''; }

  G.expect(DD === '1s', 'the default deadlock_timeout of this server is one second');
  G.expect(DEF.postgres === 'read committed' && LAB10.levels.join() === 'read committed,repeatable read,serializable', 'the default level of this PostgreSQL server is read committed');
  G.expect(run('nonrep', 'read committed').anomaly && outs(run('nonrep', 'read committed'))[1] === '100' && outs(run('nonrep', 'read committed'))[3] === '150' && !run('nonrep', 'repeatable read').anomaly && outs(run('nonrep', 'repeatable read'))[3] === '100' && !run('nonrep', 'serializable').anomaly, 'a non-repeatable read at read committed: 100 then 150, and not at repeatable read or serializable');
  G.expect(run('phantom', 'read committed').anomaly && outs(run('phantom', 'read committed'))[1] === '2' && outs(run('phantom', 'read committed'))[3] === '3' && outs(run('phantom', 'repeatable read'))[3] === '2' && !run('phantom', 'repeatable read').anomaly, 'a phantom at read committed (2 then 3) and none at repeatable read');
  G.expect(run('lost', 'read committed').anomaly && run('lost', 'read committed').final === '120' && has(run('lost', 'repeatable read'), /could not serialize access due to concurrent update/) && run('lost', 'repeatable read').final === '110' && has(run('lost', 'serializable'), /concurrent update/), 'the lost update leaves 120 at read committed, and repeatable read stops session B and leaves 110');
  G.expect(run('skew', 'read committed').final === '0' && run('skew', 'repeatable read').final === '0' && run('skew', 'repeatable read').anomaly && has(run('skew', 'serializable'), /could not serialize access due to read\/write dependencies among transactions/) && run('skew', 'serializable').final === '1' && !run('skew', 'serializable').anomaly, 'write skew leaves nobody on call at repeatable read, and serializable stops one session');
  G.expect(TR.before === '150' && TR.autocommit.total_after === '300' && TR.transaction.total_after === '150' && /violates check constraint/.test(TR.autocommit.steps[1].out) && /current transaction is aborted/.test(TR.transaction.steps[3].out) && TR.transaction.steps[4].out === 'ROLLBACK', 'without a transaction the transfer creates money (total 300), and with one nothing changes (150)');
  G.expect(DI.steps[1].out === 'read uncommitted' && DI.steps[4].out === '100' && DI.final === '100', 'a READ UNCOMMITTED session did not see the uncommitted 999');
  G.expect(RP.steps[0].out === '2' && RP.steps[4].out === '2' && RP.steps[6].out === '3', 'a reader saw 2 rows before the replace commit and 3 after it, never 0');
  G.expect(/duplicate key/.test(out(SP.steps, 'A', /1, 'Ana again'/)) && SP.rows_after === '4', 'a savepoint keeps the work before the failed insert: 4 rows');
  G.expect(/could not obtain lock on row/.test(out(LK.steps, 'B', /NOWAIT/)) && out(LK.steps, 'B', /SKIP LOCKED/) === '2' && /canceling statement due to lock timeout/.test(out(LK.steps, 'B', /UPDATE jobs/)), 'NOWAIT fails at once, SKIP LOCKED returns job 2 and lock_timeout cancels the wait');
  G.expect(out(QU.steps, 'A', /SKIP LOCKED/) === '1' && out(QU.steps, 'B', /SKIP LOCKED/) === '2' && QU.final.join(';') === '1, done;2, done;3, pending', 'two workers claimed jobs 1 and 2');
  G.expect(DL.victim === 'A' && /deadlock detected/.test(out(DL.steps, 'A', /id = 2/)) && out(DL.steps, 'B', /id = 1/) === 'UPDATE 1' && DL.final.join(';') === '1, 101;2, 51', 'a deadlock: session A is stopped and session B commits');
  G.expect(LF.atomic.final === '130' && LF.forupdate.final === '130' && /waited for A, then: 110/.test(out(LF.forupdate.steps, 'B', /FOR UPDATE/)), 'an atomic update and FOR UPDATE both keep both additions: 130');
  G.expect(/read\/write dependencies/.test(out(SR.steps, 'B', /Ben/)) && SR.steps[9].out === '1' && SR.final === '1', 'after the serialization failure the retry sees 1 doctor on call');
  G.expect(/Conflict on update/.test(DK.steps[1].out) && /database is locked/.test(SL.steps[1].out), 'DuckDB reports a write conflict and SQLite says the database is locked');
  var CT = G.on('m10.ch_transfer', 'duckdb'), CI = G.on('m10.ch_incr', 'duckdb'), CK = G.table('m10.ch_skip');
  G.expect(CT.rows.map(function (r) { return r[2]; }).join() === '70,80' && CI.rows[0][0] === '110' && CK.rows[0][0] === '1', 'the coding rounds');

  var TRANSFER_SOL = ['BEGIN;'].concat(G.file('m10.ch_transfer').split('\n').filter(function (l) { return /^UPDATE/.test(l); })).concat(['COMMIT;']).concat(G.file('m10.ch_transfer').split('\n').filter(function (l) { return /^SELECT/.test(l); })).join('\n');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }
  function cell(r) { return r.anomaly ? 'it happened' : /could not serialize/.test(JSON.stringify(outs(r))) ? 'stopped with a serialization failure' : 'prevented'; }

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Transactions and locks', short: 'Transactions', blurb: 'All or nothing, isolation levels and their anomalies, lost updates and write skew, locks, deadlocks and retries, on two real PostgreSQL sessions', minutes: 60,
    focus: ['con', 'int'],
    goals: [
      'Group statements into a **transaction** that commits or rolls back as one.',
      'Name the problems of concurrent sessions: **non-repeatable read, phantom, lost update and write skew**.',
      'Pick an **isolation level**, and know that a serialization failure means "retry".',
      'Use **row locks**, NOWAIT, SKIP LOCKED and lock timeouts, and avoid a **deadlock**.',
      'Explain how PostgreSQL, DuckDB and SQLite handle two writers.'
    ],
    say: 'Mission 10 is about two people changing the same data at the same time. I could describe it, and I would rather show it. Every transcript here comes from two real PostgreSQL sessions, A and B, that ran the statements in the order you see. You can switch the isolation level and watch the same script give different results.',
    scenes: [
      B.talk({
        id: 'm10-what', t: 1, src: 'docs', title: 'Two sessions, one table',
        say: 'Press Next for six ideas about transactions.',
        items: [
          ['A transaction is all or nothing', '`BEGIN` starts one, `COMMIT` keeps its changes and `ROLLBACK` throws them away. Without one, every statement commits on its own, and a failure halfway leaves half a change.', 'Group the statements.'],
          ['ACID in one line each', 'Atomic: all or nothing. Consistent: the rules and constraints hold. Isolated: sessions do not see each other\'s half-done work. Durable: a commit survives a crash.', 'Four promises.'],
          ['Isolation is a dial', 'More isolation means fewer surprises and more work for the engine and the application. The levels are READ COMMITTED, REPEATABLE READ and SERIALIZABLE.', 'Choose a level on purpose.'],
          ['Snapshots, not queues', 'PostgreSQL keeps several versions of a row. A session reads through a snapshot, so readers do not block writers and writers do not block readers.', 'MVCC.'],
          ['Locks decide who waits', 'Two writers of the same row take turns. A row lock makes the second one wait. `NOWAIT`, `SKIP LOCKED` and a lock timeout change what waiting means.', 'Wait, skip or give up.'],
          ['Retries are normal', 'A deadlock or a serialization failure is the engine saying "try again". Code that talks to a database must be ready to repeat a whole transaction.', 'Expect to retry.']
        ],
        cols: 1
      }),

      B.widget({
        id: 'm10-transfer-auto', kind: 'txlog', t: 1, src: 'rec', title: 'A transfer without a transaction', key: 'm10.transfer', variant: 'autocommit', mood: 'worried',
        text: 'Ana has 100 and Ben has 50: 150 together. A job moves 150 from Ana to Ben in two statements, with no transaction. The table has a rule: a balance cannot go below 0. Watch what each statement does.',
        tiles: [[TR.before, 'total before the transfer'], [TR.autocommit.total_after, 'total after: money was created', 'bad']],
        note: 'The first statement committed on its own, so Ben has 200. The second one failed, because Ana would be at -50. Nothing undid the first. The constraint worked, and the job still left the data wrong.'
      }),

      B.widget({
        id: 'm10-transfer-tx', kind: 'txlog', t: 1, src: 'rec', title: 'The same transfer in a transaction', key: 'm10.transfer', variant: 'transaction', mood: 'happy',
        text: 'The same two statements between BEGIN and COMMIT. The second statement fails again. Look at what the session does next, and at what COMMIT says.',
        tiles: [[TR.before, 'total before the transfer'], [TR.transaction.total_after, 'total after: nothing changed', 'good']],
        note: 'After the error PostgreSQL refuses every command until the transaction ends: "current transaction is aborted". The final COMMIT answers ROLLBACK, because a failed transaction cannot commit. Both balances are as they were.'
      }),

      B.bug({
        id: 'm10-bug-autocommit', t: 1, title: 'Bug hunt: half a transfer',
        q: 'A job moves money between two accounts. When the debit fails the credit stays, and the books are off by the amount. Click the line where the job should start protecting both statements.',
        file: 'transfer.sql', lang: 'sql',
        code: ['UPDATE acct SET balance = balance + 150 WHERE id = 2;', 'UPDATE acct SET balance = balance - 150 WHERE id = 1;'].join('\n'),
        bad: [1], hint: 'What should come before the first statement, and after the second?',
        why: 'Each statement commits on its own when there is no transaction. Put `BEGIN` before the first and `COMMIT` after the second, so that a failure of either one undoes both. In the recording the unprotected version left a total of 300 where 150 was right.',
        fix: ['BEGIN;', 'UPDATE acct SET balance = balance + 150 WHERE id = 2;', 'UPDATE acct SET balance = balance - 150 WHERE id = 1;', 'COMMIT;'].join('\n'),
        cheer: 'Statements that belong together go between BEGIN and COMMIT.'
      }),

      B.cmp({
        id: 'm10-acid', t: 1, src: 'docs', title: 'ACID',
        say: 'Four promises of a transaction. Press Next for each.',
        cols: ['Letter', 'Promise', 'What you saw'],
        hl: 1,
        rows: [
          ['Atomic', 'All the statements take effect, or none', 'The transfer left both balances alone after the error'],
          ['Consistent', 'Constraints and rules hold after the commit', 'The CHECK on the balance rejected the debit'],
          ['Isolated', 'Concurrent transactions do not see each other\'s unfinished work', 'The reader saw 2 rows while the replacement was uncommitted'],
          ['Durable', 'A committed change survives a crash', 'Not shown here. The engine writes a log before it confirms the commit.']
        ],
        steps: [
          { upto: 1, say: 'Atomic: the transaction with the failed debit changed nothing.' },
          { upto: 2, say: 'Consistent: the engine enforces the rules that you declared. A transaction cannot commit a row that breaks a constraint.' },
          { upto: 3, say: 'Isolated: other sessions see the data from before or after your transaction, and not the middle. How strictly depends on the isolation level.' },
          { upto: 4, say: 'Durable: after COMMIT returns, the change is safe. This course did not crash a server, so nothing here shows it.' }
        ],
        pick: 'ACID is a set of promises. Isolation is the one you can tune.'
      }),

      B.quiz({
        id: 'm10-q-atomic', t: 1, q: 'In the recorded transaction the second UPDATE failed, and the session then ran COMMIT. What did COMMIT return, and what was the total?',
        opts: [
          { t: 'COMMIT, and a total of 300', fb: 'That was the run without a transaction.' },
          { t: 'ROLLBACK, and a total of 150', fb: '' },
          { t: 'An error, and a total of 300', fb: 'COMMIT itself did not fail. It ended the aborted transaction and answered ROLLBACK.' },
          { t: 'COMMIT, and a total of 150', fb: 'A transaction that hit an error cannot commit its work, so the answer was not COMMIT.' }
        ],
        ok: 1, why: 'After an error the transaction is aborted. A COMMIT on it ends it as a rollback, and the engine says so with the status ROLLBACK. Both balances stayed as they were, so the total stayed at 150.'
      }),

      B.flow({
        id: 'm10-flow', t: 2, src: 'docs', title: 'Versions and snapshots (MVCC)', g: 'mvcc', legend: true,
        steps: [
          { say: 'PostgreSQL does not change a row in place. It keeps versions, and each session reads through a snapshot. Press Next to see what that does to a reader.', tags: ['tg_v1'] },
          { say: 'Step 1. Session B updates Ana\'s balance from 100 to 150. The old version is marked as replaced, and it stays stored.', on: ['m1'], focus: ['v_w', 'v_old'], cap: 'Mark the old version.' },
          { say: 'Step 2. B adds a new version with 150. Other sessions can see it only after B commits.', on: ['m2'], focus: ['v_w', 'v_new'], tags: ['tg_v2'], cap: 'Add the new version.' },
          { say: 'Step 3. A session at REPEATABLE READ took its snapshot at its first statement. For that snapshot the old version is the true one, so it keeps reading 100.', on: ['m3'], focus: ['v_old', 'v_rr'], cap: 'Same snapshot.' },
          { say: 'Step 4. A session at READ COMMITTED takes a new snapshot for each statement. Its next statement starts after B\'s commit and reads 150.', on: ['m4'], focus: ['v_new', 'v_rc'], cap: 'New snapshot.' }
        ]
      }),

      B.widget({ id: 'm10-lab-iso', kind: 'isolation', t: 1, src: 'rec', title: 'Lab: two sessions, four problems, three levels' }),

      B.quiz({
        id: 'm10-q-nonrep', t: 1, q: 'Session A reads Ana\'s balance (100). Session B updates it to 150 and commits. Session A reads again, in the same transaction, at READ COMMITTED. What does A see?',
        opts: [
          { t: '100, because A has not finished', fb: 'That is what REPEATABLE READ gives. READ COMMITTED takes a new snapshot for each statement.' },
          { t: '150', fb: '' },
          { t: 'An error', fb: 'No error is raised at READ COMMITTED. The two reads simply differ.' },
          { t: 'NULL', fb: 'The row exists in both reads.' }
        ],
        ok: 1, why: 'At READ COMMITTED every statement sees what was committed before it started, so the second read saw 150. That is a non-repeatable read. At REPEATABLE READ and SERIALIZABLE the same script kept returning 100.'
      }),

      B.quiz({
        id: 'm10-q-phantom', t: 2, q: 'Session A counts the accounts with a balance of at least 50: 2. Session B inserts a third account and commits. At REPEATABLE READ on PostgreSQL, what does A\'s second count show?',
        opts: [
          { t: '3', fb: 'That happened at READ COMMITTED.' },
          { t: '2', fb: '' },
          { t: 'An error', fb: 'No error was raised. The snapshot simply does not contain the new row.' },
          { t: '1', fb: 'Nothing was deleted, so the count cannot fall.' }
        ],
        ok: 1, why: 'The snapshot of A was taken at its first statement and does not contain B\'s new row. The SQL standard allows phantom rows at REPEATABLE READ, and PostgreSQL does not show them. The recording gave 3 at READ COMMITTED and 2 at the two stricter levels.'
      }),

      B.cmp({
        id: 'm10-levels', t: 2, src: 'rec', title: 'What each level prevented in the recording',
        say: 'The same four scripts, at three levels. Press Next for each problem.',
        cols: ['Problem', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
        hl: 0,
        rows: LAB10.scenarios.map(function (m) { return [m.title, cell(run(m.id, 'read committed')), cell(run(m.id, 'repeatable read')), cell(run(m.id, 'serializable'))]; }),
        steps: [
          { upto: 1, say: 'A non-repeatable read happens only at READ COMMITTED.' },
          { upto: 2, say: 'The phantom behaves the same way on PostgreSQL, because its REPEATABLE READ uses one snapshot.' },
          { upto: 3, say: 'The lost update happened at READ COMMITTED. At the two stricter levels the second writer was stopped and had to retry.' },
          { upto: 4, say: 'Write skew got through at READ COMMITTED and at REPEATABLE READ. Only SERIALIZABLE stopped it.' }
        ],
        pick: 'Each stricter level removed one more problem, and the price is that some transactions must be retried.'
      }),

      B.widget({
        id: 'm10-dirty', kind: 'txlog', t: 2, src: 'rec', title: 'A dirty read: asked for, not given', key: 'm10.dirty',
        text: 'A dirty read means seeing another session\'s unfinished change. The standard has a level for it, READ UNCOMMITTED. Session A asks for that level, and session B changes a balance and does not commit.',
        tiles: [[DI.steps[4].out, 'what session A read while B was uncommitted'], ['999', 'the uncommitted value that A did not see', 'good']],
        note: 'PostgreSQL accepted the level, and `SHOW transaction_isolation` says read uncommitted. Session A still read 100. In the PostgreSQL documentation this level behaves like READ COMMITTED. Other engines may differ.'
      }),

      B.widget({
        id: 'm10-replace', kind: 'txlog', t: 2, src: 'rec', title: 'Replace a table without an empty moment', key: 'm10.replace',
        text: 'Mission 9 replaced a period with a DELETE and an INSERT. Here a reader counts the rows while that replacement is half done, and again after it commits.',
        tiles: [[RP.steps[4].out, 'rows the reader saw during the replacement'], [RP.steps[6].out, 'rows after the commit']],
        note: 'The reader never saw an empty table. During the transaction it saw the old rows, and after COMMIT it saw the new ones. The delete and the insert became visible together.'
      }),

      B.widget({
        id: 'm10-lost-atomic', kind: 'txlog', t: 2, src: 'rec', title: 'Fix 1 for a lost update: let the database add', key: 'm10.lost_fixes', variant: 'atomic',
        text: 'The lost update came from the application reading a balance and writing back its own sum. If the database does the addition, no stale value exists. Each session adds to the row in one statement.',
        tiles: [[LF.atomic.final, '100 plus 10 plus 20: both additions kept', 'good']],
        note: 'Session B\'s UPDATE `balance = balance + 20` read the row at the moment it ran, after A\'s commit, so it added to 110. No application code held an old number.'
      }),

      B.widget({
        id: 'm10-lost-lock', kind: 'txlog', t: 2, src: 'rec', title: 'Fix 2: lock the row you read', key: 'm10.lost_fixes', variant: 'forupdate',
        text: 'When the application must read, think and write back, `SELECT ... FOR UPDATE` locks the row. A second session that asks for the same lock waits. Session B asks while A holds the row.',
        tiles: [[out(LF.forupdate.steps, 'B', /FOR UPDATE/).replace('waited for A, then: ', ''), 'what B read after waiting'], [LF.forupdate.final, 'final balance: both additions kept', 'good']],
        note: 'B\'s `FOR UPDATE` did not return until A committed, and then it returned 110, not the 100 that B would have read before. B added 20 to the fresh value.'
      }),

      B.bug({
        id: 'm10-bug-readmodify', t: 2, title: 'Bug hunt: two orders, one stock count',
        q: 'Two web servers sell the last items at nearly the same time. Each one reads the stock (100), subtracts its own order in code and writes the result back. The stock shows 90, and 30 items were sold. Click the line that loses an update.',
        file: 'sell.py', lang: 'python',
        code: ['stock = db.query("SELECT qty FROM stock WHERE sku = %s", sku)', 'new_qty = stock - ordered', 'db.execute("UPDATE stock SET qty = %s WHERE sku = %s", new_qty, sku)'].join('\n'),
        bad: [3], hint: 'Whose number does the UPDATE write?',
        why: 'The UPDATE writes a value that was computed from an old read. In the recording the second writer overwrote the first: 120 instead of 130. Let the database do the arithmetic (`SET qty = qty - %s`), or lock the row when you read it (`FOR UPDATE`).',
        fix: ['db.execute("UPDATE stock SET qty = qty - %s WHERE sku = %s AND qty >= %s", ordered, sku, ordered)'].join('\n'),
        cheer: 'Do the arithmetic in the statement, not in the application.'
      }),

      B.widget({
        id: 'm10-skew-retry', kind: 'txlog', t: 2, src: 'rec', title: 'Write skew at SERIALIZABLE, and the retry', key: 'm10.skew_retry',
        text: 'Two doctors are on call. The rule: at least one must stay. Each session checks that two are on call, and each sets its own doctor off call. At SERIALIZABLE the engine stops one of them. Then the application retries.',
        tiles: [[SR.steps[9].out, 'on call, as the retry saw it'], [SR.final, 'doctor still on call at the end', 'good']],
        note: 'Session B\'s update failed with SQLSTATE 40001. The application rolled back and ran the transaction again from the start. The retry counted 1 doctor on call, so the application can now refuse to set the last one off.'
      }),

      B.quiz({
        id: 'm10-q-skew', t: 2, q: 'Two sessions each check that 2 people are on call and each sets a different person off call. Which level stopped the second one in the recording?',
        opts: [
          { t: 'READ COMMITTED', fb: 'Both updates committed and nobody was left on call.' },
          { t: 'REPEATABLE READ', fb: 'It prevented the phantom and the lost update, but write skew got through: 0 on call.' },
          { t: 'SERIALIZABLE', fb: '' },
          { t: 'None of them', fb: 'SERIALIZABLE stopped it with a serialization failure.' }
        ],
        ok: 2, why: 'The two transactions wrote different rows, so there was no write conflict. Each decision depended on a read that the other one invalidated. SERIALIZABLE tracks such read and write dependencies and stopped the second session with SQLSTATE 40001. Under the lower levels 0 doctors were left.'
      }),

      B.widget({
        id: 'm10-locks', kind: 'txlog', t: 2, src: 'rec', title: 'Locks: NOWAIT, SKIP LOCKED and a timeout', key: 'm10.locks',
        text: 'Session A locks job 1 with `FOR UPDATE` and holds it. Session B then tries three different ways to deal with that lock.',
        tiles: [['55P03', 'the SQLSTATE of NOWAIT and of the lock timeout'], [out(LK.steps, 'B', /SKIP LOCKED/), 'the job that SKIP LOCKED gave B']],
        note: '`NOWAIT` fails at once. `SKIP LOCKED` ignores the locked row and returns job 2. A `lock_timeout` of 300 ms lets B wait, and then cancels the statement. Without any of them B would wait until A commits.'
      }),

      B.widget({
        id: 'm10-queue', kind: 'txlog', t: 2, src: 'rec', title: 'A job queue with SKIP LOCKED', key: 'm10.queue',
        text: 'Two workers each ask for the next pending job, at the same time, with `FOR UPDATE SKIP LOCKED`. Neither waits for the other, and they do not take the same job.',
        tiles: [[out(QU.steps, 'A', /SKIP LOCKED/), 'job taken by worker A'], [out(QU.steps, 'B', /SKIP LOCKED/), 'job taken by worker B'], ['3 pending', 'left in the queue']],
        note: 'This is the standard way to build a work queue in a database. A worker that crashes releases its lock when its transaction ends, and the job becomes available again.'
      }),

      B.widget({
        id: 'm10-deadlock', kind: 'txlog', t: 2, src: 'rec', title: 'A deadlock', key: 'm10.deadlock',
        text: 'Session A holds row 1 and wants row 2. Session B holds row 2 and wants row 1. Neither can go on. The engine notices and ends one of them.',
        tiles: [['deadlock detected', 'the error of session ' + DL.victim + ' (SQLSTATE 40P01)', 'bad'], [DL.final.join(' and '), 'the rows after the other session committed']],
        note: 'The engine checks for a deadlock after a lock has been waited for a short time (300 ms in this recording, one second by default). It stopped session A, the one that had waited longest. A ROLLBACK released its lock, and B finished. The cure is an order: if every transaction touches the rows in the same order, the cycle cannot form.'
      }),

      B.widget({
        id: 'm10-savepoint', kind: 'txlog', t: 2, src: 'rec', title: 'A savepoint: keep the work before the error', key: 'm10.savepoint',
        text: 'A batch inserts rows in one transaction. One row breaks the primary key. A savepoint lets the transaction undo only that statement.',
        tiles: [[SP.rows_after, 'rows in the table after the commit']],
        note: 'Without the savepoint the error would have aborted the whole transaction, and COMMIT would have rolled back the first insert too. `ROLLBACK TO SAVEPOINT s1` undid only the failed statement, and the batch went on.'
      }),

      B.cmp({
        id: 'm10-other', t: 3, src: 'rec', title: 'Two writers on three engines',
        say: 'The same collision, on PostgreSQL, DuckDB and SQLite. Press Next for each one.',
        cols: ['Engine', 'What the second writer got', 'Text of the result'],
        hl: 0,
        rows: [
          ['PostgreSQL ' + G.meta('postgres'), 'Waited for the first writer (row lock), then went on', out(LF.forupdate.steps, 'B', /FOR UPDATE/)],
          ['DuckDB ' + G.meta('duckdb'), 'Stopped at once with a conflict', DK.steps[1].out],
          ['SQLite ' + G.meta('sqlite'), 'Refused to start a second write transaction', SL.steps[1].out]
        ],
        steps: [
          { upto: 1, say: 'PostgreSQL locks at row level. The second writer waits until the first commits, then continues. The wait is the default, and NOWAIT or a timeout changes it.' },
          { upto: 2, say: 'DuckDB did not wait. Its second UPDATE of the same row stopped with a transaction conflict, and the application must retry. DuckDB documents optimistic concurrency control for this.' },
          { upto: 3, say: 'SQLite allows one writer at a time for the whole database. With a timeout of 0 the second writer got "database is locked" at BEGIN IMMEDIATE.' }
        ],
        pick: 'The same code can behave differently on each engine. Test your retry logic on the engine that you use.'
      }),

      B.challenge({
        id: 'm10-ch-transfer', t: 1, title: 'Coding round: move 30 from Ana to Ben', file: 'transfer.sql', lang: 'sql',
        q: 'Move **30** from Ana (id 1) to Ben (id 2) in **one transaction**, so that either both changes happen or neither does. Then return the table ordered by id.',
        data: [{ name: 'acct', cols: ['id', 'owner', 'balance'], rows: [['1', 'Ana', '100'], ['2', 'Ben', '50']], types: ['INTEGER', 'VARCHAR', 'INTEGER'], pk: ['id'] }],
        starter: '-- move 30 from Ana to Ben, safely\nBEGIN;\n...\nCOMMIT;\n\nSELECT ...;',
        hints: ['BEGIN starts the transaction and COMMIT ends it.', 'Two UPDATE statements: one subtracts and one adds.', 'Name the rows with WHERE id = ...'],
        sol: TRANSFER_SOL,
        res: res('m10.ch_transfer', 'duckdb'),
        expl: ['BEGIN and COMMIT make the two UPDATE statements one unit. If either fails, ROLLBACK leaves both balances alone.', 'Ana goes from 100 to 70 and Ben from 50 to 80. The total stays at 150.', 'A CHECK constraint on the balance would make a debit that overdraws fail, and the transaction would then roll back as the recording showed.'],
        cx: 'Two single row updates by key. The cost is the commit: one write to the log for the whole transaction.'
      }),

      B.challenge({
        id: 'm10-ch-incr', t: 1, title: 'Coding round: add 10 without a lost update', file: 'add_ten.sql', lang: 'sql',
        q: 'Add **10** to the balance of Ana (id 1) in a way that cannot lose another session\'s update, then return her balance. Do not read the balance into the application first.',
        data: [{ name: 'acct', cols: ['id', 'owner', 'balance'], rows: [['1', 'Ana', '100'], ['2', 'Ben', '50']], types: ['INTEGER', 'VARCHAR', 'INTEGER'], pk: ['id'] }],
        starter: '-- add 10 to Ana in one statement\nUPDATE acct\nSET ...\nWHERE ...;\n\nSELECT ...;',
        hints: ['The new value is computed from the old one inside the statement.', '`balance = balance + 10`', 'The WHERE clause picks Ana by id.'],
        sol: G.file('m10.ch_incr'),
        res: res('m10.ch_incr', 'duckdb'),
        expl: ['`SET balance = balance + 10` reads the row when the UPDATE runs and adds to that value. No old number from the application can overwrite another session\'s change.', 'In the recording this form kept both additions: 100 plus 10 plus 20 gave 130.', 'The statement locks the row until the transaction ends, so a second writer waits and then adds to the new value.'],
        cx: 'One lookup by primary key and one row written.'
      }),

      B.challenge({
        id: 'm10-ch-skip', t: 2, title: 'Coding round: claim the next job (PostgreSQL)', file: 'claim_job.sql', lang: 'sql', engine: 'postgres',
        q: 'Several workers claim jobs at the same time. Write the PostgreSQL query that returns the **id of the next pending job** (lowest id first) and **locks it**, so that another worker running the same query takes a different job and does not wait.',
        data: [{ name: 'jobs', cols: ['id', 'state'], rows: [['1', 'pending'], ['2', 'pending'], ['3', 'pending']], types: ['INTEGER', 'VARCHAR'], pk: ['id'] }],
        starter: '-- the next pending job, locked, without waiting for other workers\nSELECT ...',
        hints: ['Order by id and take one row with LIMIT 1.', '`FOR UPDATE` locks the row.', '`SKIP LOCKED` ignores rows that another transaction has locked.'],
        sol: G.file('m10.ch_skip'),
        res: res('m10.ch_skip'),
        expl: ['`FOR UPDATE` locks the chosen row until the transaction ends. `SKIP LOCKED` makes the query pass over rows that other workers hold.', 'With nobody else running, the query returns job 1. In the recorded queue, worker A got 1 and worker B got 2 at the same time, and neither waited.', 'The lock stays until COMMIT or ROLLBACK, so the worker must run the query inside a transaction, mark the job and commit.'],
        cx: 'An index on the state and id lets the query find the first unlocked pending row without scanning the table.'
      }),

      B.decide({
        id: 'm10-dec-iso', t: 2, title: 'Decision: which isolation level for the month-end report?',
        scenario: 'A finance report reads six tables, one after the other, and takes about 4 minutes. Orders keep arriving while it runs. The numbers of the six tables must agree with each other, because the report adds them up. The default level is READ COMMITTED.',
        opts: [
          { t: 'READ COMMITTED, the default', d: 'Nothing to change. No retries.', lose: 'Each query takes a new snapshot, so an order that arrives mid-report can be in the second table and missing from the first. The totals disagree.' },
          { t: 'Lock all six tables for the whole report', d: 'Nothing can change while the report runs.', lose: 'Writers wait for 4 minutes, and the shop stops taking orders.' },
          { t: 'REPEATABLE READ, read only', d: 'One snapshot for the whole report. Writers go on.', lose: '' },
          { t: 'SERIALIZABLE, with retries', d: 'The strictest level.', lose: 'The report only reads, so it gains nothing over REPEATABLE READ, and it adds tracking cost and the chance of a failure to retry.' }
        ],
        pick: 2,
        why: 'The report needs one consistent view of the data. At REPEATABLE READ the session reads through one snapshot taken at its first statement, so all six tables agree, and writers are not blocked. In the recording the same snapshot kept returning 100 and 2 while other sessions committed changes.',
        when: 'If the report also writes and must not conflict with other writers, consider SERIALIZABLE and be ready to retry.'
      }),

      B.incident({
        id: 'm10-inc-deadlock', t: 2, time: '02:40',
        alert: 'The nightly batch fails about once a week with "deadlock detected". Two jobs run in parallel. Job 1 updates account 1 and then account 2. Job 2 updates account 2 and then account 1. When the error appears, the batch stops and nobody retries.',
        clues: ['The error is SQLSTATE 40P01.', 'The failing transaction is one of two that run at the same time.', 'Each job updates the same two rows, in a different order.'],
        opts: [
          { t: 'Raise the lock timeout so that the jobs wait longer', fb: 'A deadlock is not a long wait. Both sessions wait for each other forever, so a longer timeout does nothing.' },
          { t: 'Make both jobs update the rows in the same order, and retry the transaction when error 40P01 appears', fb: '' },
          { t: 'Run the two jobs with SERIALIZABLE', fb: 'That changes the rules of isolation. It does not remove a cycle of row locks.' },
          { t: 'Turn off deadlock detection', fb: 'Then the two sessions would wait forever. The detection is what rescues you.' }
        ],
        best: 1,
        why: 'A deadlock needs a cycle: each session holds a row that the other wants. If every transaction takes the rows in the same order, such as by ascending id, one of them waits and the cycle cannot form. For the rare case that remains, the application retries the whole transaction. In the recording the engine stopped session A after 300 ms with error 40P01, session B committed, and a retry of A would have succeeded.',
        checks: [['Read the error', 'The server log names the two statements that waited for each other.'], ['Compare the order', 'List the rows that each job locks and in which order.'], ['Fix the order', 'Sort the keys before updating, for example `ORDER BY id`.'], ['Add a retry', 'Catch SQLSTATE 40P01 and 40001 and repeat the whole transaction a few times.']],
        tell: 'The nightly batch deadlocked about once a week. Two jobs updated the same two accounts in opposite orders, which makes a cycle of row locks. I made both jobs process the accounts in ascending id order, and I wrapped the transaction in a retry that catches 40P01 and 40001 and repeats the whole transaction up to three times. I confirmed the behaviour with two sessions: the engine stopped one after 300 ms and the other committed.',
        prevent: ['Touch rows in one agreed order in every transaction.', 'Retry whole transactions on 40P01 and 40001, with a small limit.', 'Keep transactions short, and do not call other services inside one.']
      }),

      B.qa({
        id: 'qa-acid', t: 1, tag: 'Transactions', secs: 60,
        q: 'What is a transaction, and what does ACID mean?',
        pts: ['A group of statements that commit or roll back together', 'Atomic, Consistent, Isolated, Durable', 'BEGIN, COMMIT, ROLLBACK', 'An example'],
        short: 'A transaction groups statements so that they take effect together or not at all: BEGIN starts it, COMMIT keeps it and ROLLBACK undoes it. ACID is the set of promises: atomic means all or nothing, consistent means constraints still hold, isolated means concurrent transactions do not see each other\'s unfinished work, and durable means a commit survives a crash. My example is a transfer of 150 between two accounts. Without a transaction the credit committed and the debit failed, and the total went from 150 to 300. In a transaction the failure undid both, the COMMIT answered ROLLBACK, and the total stayed 150.',
        fu: [['What happens to a transaction after an error in PostgreSQL?', 'It is aborted. Every command fails until ROLLBACK, and a COMMIT ends it as a rollback.']],
        trap: 'Running related statements in autocommit mode.',
        real: 'Tell about a job that left a half-finished change.'
      }),

      B.qa({
        id: 'qa-isolation', t: 1, tag: 'Transactions', secs: 60,
        q: 'What are the isolation levels and the problems they prevent?',
        pts: ['READ COMMITTED, REPEATABLE READ, SERIALIZABLE', 'Non-repeatable read, phantom, lost update, write skew', 'Stricter means fewer anomalies and more retries', 'The default is READ COMMITTED on PostgreSQL'],
        short: 'READ COMMITTED lets each statement see what was committed before it started, which is the default on PostgreSQL. REPEATABLE READ gives the transaction one snapshot. SERIALIZABLE also detects patterns that no one-at-a-time order could produce. In my two-session test, a non-repeatable read happened only at READ COMMITTED (100 then 150). The phantom did too, on PostgreSQL. The lost update left 120 at READ COMMITTED and was stopped with a serialization failure at the other two. Write skew left nobody on call at REPEATABLE READ, and only SERIALIZABLE stopped it. The price of a stricter level is that the application must retry some transactions.',
        fu: [['Does READ UNCOMMITTED give dirty reads on PostgreSQL?', 'No. In my test a session at that level read 100, not the uncommitted 999.']],
        trap: 'Assuming that REPEATABLE READ prevents everything.',
        real: 'Tell about a concurrency bug and the level that fixed it.'
      }),

      B.qa({
        id: 'qa-lost-update', t: 2, tag: 'Transactions', secs: 60,
        q: 'What is a lost update and how do you prevent it?',
        pts: ['Read, compute in the application, write back', 'The later write overwrites the earlier one', 'Atomic UPDATE with arithmetic', 'SELECT FOR UPDATE', 'Higher isolation and retry'],
        short: 'Two sessions read the same value, each computes a new one in the application, and each writes back. The second write overwrites the first. In my test both read 100, one wrote 110 and the other 120, and 120 stayed at READ COMMITTED. There are three fixes. The best is an atomic statement, SET balance = balance + 20, so no old value exists: both additions were kept and the result was 130. Second, SELECT FOR UPDATE locks the row, and the second session waited and then read 110. Third, REPEATABLE READ or SERIALIZABLE stops the second writer with a serialization failure, and the application retries.',
        fu: [['Which fix do you prefer?', 'The atomic UPDATE, because it needs no read and no lock held across application code.']],
        trap: 'Doing arithmetic in the application on a value that was read earlier.',
        real: 'Tell about a counter or stock number that went wrong under load.'
      }),

      B.qa({
        id: 'qa-write-skew', t: 2, tag: 'Transactions', secs: 60,
        q: 'What is write skew, and which isolation level stops it?',
        pts: ['Two transactions read the same condition and write different rows', 'No write conflict exists', 'REPEATABLE READ does not stop it', 'SERIALIZABLE does, with a failure to retry'],
        short: 'Write skew happens when two transactions each check a condition, such as "at least two doctors on call", and each then changes a different row so that the condition breaks. They write different rows, so there is no write conflict. In my test both transactions committed at READ COMMITTED and at REPEATABLE READ, and nobody was left on call. At SERIALIZABLE the second one failed with SQLSTATE 40001 and the message about read and write dependencies. The application rolled back and retried, and the retry saw 1 doctor on call and could refuse. The alternatives are to lock the rows that were read, or to make a constraint check the rule.',
        fu: [['Why does the retry matter?', 'A serialization failure does not mean the data is wrong. It means this attempt must start again on fresh data.']],
        trap: 'Believing that REPEATABLE READ gives full safety.',
        real: 'Tell about a rule that two sessions broke together.'
      }),

      B.qa({
        id: 'qa-deadlock', t: 2, tag: 'Locks', secs: 60,
        q: 'What is a deadlock and how do you avoid it?',
        pts: ['A cycle of waits', 'The engine detects it and aborts one transaction', 'Same lock order', 'Retry on the error', 'Short transactions'],
        short: 'A deadlock is a cycle of waits: session A holds row 1 and wants row 2, and session B holds row 2 and wants row 1. The engine detects it after a short wait and aborts one transaction. In my run it stopped session A with "deadlock detected" (40P01), and B committed. I avoid deadlocks by touching rows in the same order in every transaction, for example by ascending id. I keep transactions short and do not hold a lock while I call another service. And I retry the whole transaction when the error appears, because the abort is expected and the retry normally succeeds.',
        fu: [['Does a longer lock timeout help?', 'No. In a deadlock nobody can progress, so waiting longer changes nothing. The detection is what resolves it.']],
        trap: 'Treating a deadlock as an outage instead of a retry.',
        real: 'Tell about a deadlock you found in a log and how you fixed it.'
      }),

      B.qa({
        id: 'qa-retry', t: 2, tag: 'Locks', secs: 60,
        q: 'Which errors should the application retry, and how?',
        pts: ['Serialization failure 40001', 'Deadlock 40P01', 'Retry the whole transaction', 'Limit the number of attempts, with a pause'],
        short: 'I retry the two errors that mean "try again": a serialization failure (SQLSTATE 40001) and a deadlock (40P01). I retry the whole transaction from BEGIN, not just the failed statement, because the snapshot and the decisions of the first attempt are gone. In my test a failed attempt at SERIALIZABLE rolled back, started again, and the retry read fresh data. I cap the attempts, for example at three, and wait a short random time between them. I do not retry errors that repeat by themselves, such as a constraint violation or a syntax error. And the code inside the transaction must be safe to run twice, so no emails or external calls inside it.',
        fu: [['What about a lock timeout?', 'It is a choice. I retry once or twice for a short wait, and I report the problem if the lock stays busy.']],
        trap: 'Retrying only the last statement, or retrying forever.',
        real: 'Tell about a retry wrapper that you wrote.'
      }),

      B.qa({
        id: 'qa-skip-locked', t: 3, tag: 'Locks', secs: 60,
        q: 'How do you build a work queue in a database?',
        pts: ['A table with a state', 'FOR UPDATE SKIP LOCKED', 'Claim, process and commit in one transaction', 'A crash releases the lock'],
        short: 'A table of jobs with a state column, and workers that claim a job with SELECT ... WHERE state = \'pending\' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED. FOR UPDATE locks the row, and SKIP LOCKED makes other workers pass over rows that are locked, so nobody waits and nobody takes the same job. In my test two workers ran the query at the same time and got jobs 1 and 2, with job 3 left pending. The worker processes the job and updates its state in the same transaction and commits. If the worker crashes, its transaction ends and the lock is released, so the job returns to the queue. An index on state and id keeps the query fast.',
        fu: [['What about NOWAIT?', 'It raises an error at once when the row is locked, which suits code that prefers to report and move on. SKIP LOCKED suits queues.']],
        trap: 'Selecting jobs without a lock, so two workers take the same one.',
        real: 'Tell about a queue or a scheduler that used the database.'
      }),

      B.qa({
        id: 'qa-mvcc', t: 2, tag: 'Transactions', secs: 60,
        q: 'What is MVCC, and why do readers not block writers?',
        pts: ['Several versions of a row', 'Each session reads through a snapshot', 'Writers add versions', 'Old versions are cleaned up'],
        short: 'Multiversion concurrency control keeps several versions of a row. A writer does not change a row in place: it adds a new version and marks the old one as replaced after the commit. Each session reads through a snapshot that decides which versions it may see. So a reader never waits for a writer, and a writer never waits for a reader. Only two writers of the same row wait for each other. In my test a session at REPEATABLE READ kept reading 100 while another session committed 150, and a session at READ COMMITTED read 150 on its next statement. Old versions are removed by a cleanup process once no session needs them, which is why long transactions can bloat a table.',
        fu: [['Why is a very long transaction a problem?', 'It holds its snapshot open, so old versions cannot be removed and tables grow.']],
        trap: 'Leaving a transaction open for hours.',
        real: 'Tell about a long running transaction that caused trouble.'
      }),

      B.qa({
        id: 'qa-engines-tx', t: 3, tag: 'Transactions', secs: 60,
        q: 'How do PostgreSQL, DuckDB and SQLite handle two writers?',
        pts: ['PostgreSQL: row locks and waiting', 'DuckDB: optimistic, conflict error', 'SQLite: one writer at a time', 'Test the retry logic on the engine you use'],
        short: 'They differ, and the same code can behave differently on each. PostgreSQL locks rows. The second writer of a row waits for the first to finish, and then continues, unless I ask for NOWAIT, SKIP LOCKED or a lock timeout. In my test DuckDB did not wait: the second update of the same row failed with "TransactionContext Error: Conflict on update!", so the application must retry. SQLite allows one writer at a time for the whole database file: the second BEGIN IMMEDIATE failed with "database is locked". So I design for the engine in use, I keep write transactions short, and I test the retry path with two real sessions, as I did here.',
        fu: [['Where does DuckDB fit best?', 'In analytical work with one process writing. For many concurrent writers, a server database such as PostgreSQL is the better fit.']],
        trap: 'Moving code between engines and keeping the same concurrency assumptions.',
        real: 'Tell about a concurrency bug that appeared after a move to another engine.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Concurrency Tamer', color: '#FBCFE8',
        pts: [
          'A **transaction** commits or rolls back as one. Without it a failed debit left a credit behind: total 300 instead of 150. In a transaction the total stayed 150 and COMMIT answered ROLLBACK.',
          '**READ COMMITTED** gave a non-repeatable read (100 then 150) and a phantom. **REPEATABLE READ** kept one snapshot (100, and 2).',
          'A **lost update** left 120 at READ COMMITTED. Fix it with an **atomic UPDATE** (130), with **FOR UPDATE**, or with a higher level and a retry.',
          '**Write skew** got through REPEATABLE READ (0 on call). **SERIALIZABLE** stopped it with SQLSTATE 40001, and the retry saw 1.',
          '**NOWAIT** fails at once, **SKIP LOCKED** passes over locked rows, and a **lock timeout** gives up. SKIP LOCKED builds a work queue.',
          'A **deadlock** is a cycle of waits: the engine stopped one session with 40P01. Lock in one order and **retry the whole transaction**. DuckDB reports a conflict, and SQLite says the database is locked.'
        ],
        lines: [
          'I put statements that belong together in one transaction.',
          'I do arithmetic in the UPDATE, and I retry on 40001 and 40P01.',
          'I touch rows in one agreed order to avoid deadlocks.'
        ]
      })
    ]
  });
})();
