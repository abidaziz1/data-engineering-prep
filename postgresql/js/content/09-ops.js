/* Mission 9: roles, settings and a healthy server. Roles, policies, pg_hba.conf, settings, locks, rewrites and pg_stat_statements on a real server. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var PV = C('ops.privileges'), RL = C('ops.rls'), HB = C('ops.hba'), SE = C('ops.settings'), SO = C('ops.sort'), TO = C('ops.timeouts'), QU = C('ops.queue'), MT = C('ops.migration_timeout'), RW = C('ops.rewrites'), PS = C('ops.pgss');
  var PRIV = G.table('ops.privileges').rows, SETT = G.table('ops.settings').rows, HBA = G.table('ops.hba').rows, REW = G.table('ops.rewrites').rows, PGSS = G.table('ops.pgss').rows;
  var ROLES = G.file('roles.sql'), MIG = G.file('migrate.sql'), HBAF = G.file('pg_hba.conf');
  var rowsOf = function (t) { return t.split('\n'); };
  G.expect(PV.denied_without_grant && PV.create_in_public_refused && PV.granted_works && PV.new_table_denied && PV.default_privileges_cover_new && PV.old_table_still_denied && PV.star_denied_by_column_grant && PV.granted_columns_work, 'the privilege steps');
  G.expect(RL.no_policy_rows === 0 && RL.policy_rows === RL.expected_store_5 && RL.superuser_rows === 200000, 'row level security: none without a policy, one store with it, all for a superuser');
  G.expect(HB.no_password_refused && HB.wrong_password_refused && HB.right_password_ok && HB.no_entry_refused && HB.password_encryption === 'scram-sha-256', 'pg_hba.conf decides who gets in');
  G.expect(SE.shared_buffers_context === 'postmaster' && SE.shared_buffers_pending === true && SE.shared_buffers_value_unchanged === true && SE.work_mem_applied === true && SE.work_mem_pending === false, 'a restart setting waits and a user setting applies');
  G.expect(SO.spilled === true && SO.in_memory_after === true && SO.disk_kb > 1000, 'a sort spills at 4 MB and fits at 64 MB');
  G.expect(TO.statement && TO.idle && TO.lock, 'the three timeouts');
  G.expect(QU.b_blocked_by_a && QU.c_blocked_by_b && QU.c_waited_at_least_1s && MT.refused && MT.reader_not_blocked, 'the lock queue and the lock timeout');
  G.expect(RW['ADD COLUMN c1 int'] === 'no' && RW['ADD COLUMN c2 int DEFAULT 0'] === 'no' && RW['ADD COLUMN c3 timestamptz DEFAULT clock_timestamp()'] === 'yes' && RW['ALTER COLUMN store_id TYPE bigint'] === 'yes', 'which statements rewrite the table');
  G.expect(PS.point_lookup_calls === 200 && PS.one_row_per_normalized_query && PS.placeholder_in_text && PS.preload_required, 'pg_stat_statements groups queries and needs a restart');
  var GRANTBUG = 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;\n\n-- the nightly job makes a new table every quarter\nCREATE TABLE orders_q2 AS SELECT * FROM orders;\n';
  var MIGBUG = '-- migration, run at 10:00 on a busy server\nALTER TABLE orders ADD COLUMN channel text;\n';
  var TYPEBUG = '-- change the type of the store id\nALTER TABLE orders ALTER COLUMN store_id TYPE bigint;\n';
  var rs = function (re, re2) { return G.span(ROLES, re, re2); };

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Roles, settings and a healthy server', short: 'Operations', blurb: 'who may read what, which setting needs a restart, a migration that stops the application, and what to watch', minutes: 22,
    focus: ['ci', 'mon'],
    goals: [
      'Give a role the **right access** to existing and **future** tables, and limit it by column or row.',
      'Say what `pg_hba.conf` decides, and which settings need a **restart**.',
      'Run a **migration** without queueing the application behind it, and know which statements **rewrite** a table.',
      'Use **timeouts** and **pg_stat_statements** to find what is wrong.'
    ],
    say: 'The last mission is the one that gets you paged. A role that sees too much, a setting that does not apply, a migration that waits behind a report and stops every query behind it. We recorded each of them on a real server, so you can recognise it by its words.',
    scenes: [
      B.cmp({
        id: 'm9-priv', t: 1, src: 'rec', title: 'Giving a role access: the steps and their traps',
        say: 'A new role, `analyst`, and one table. Each row is something that I tried, and what the server answered.',
        cols: ['Step', 'The server said'],
        hl: 1,
        rows: PRIV.map(function (r) { return [r[0], r[1].replace(/^refused: /, 'Refused: ').replace(/^allowed$/, 'Allowed')]; }),
        steps: [
          { upto: 2, say: 'A new role has **no access** to a table, and since PostgreSQL 15 it cannot **create tables in the `public` schema** either. Both are refused.' },
          { upto: 3, say: '`GRANT SELECT ON orders TO analyst` is allowed, and the same query works.' },
          { upto: 6, say: 'The trap. A **new table** made by the owner is **not** readable: a grant covers the tables that **exist** at that moment. `ALTER DEFAULT PRIVILEGES` covers tables made **afterwards**, and it does **not** fix the table that was made before it: `orders_q2` stayed refused.' },
          { upto: 8, say: 'A grant can be **per column**. `reporting` could read `order_id` and `amount`, and `SELECT *` was **refused**, because one column of it was not allowed. A reporting tool that runs `SELECT *` needs a view.' }
        ]
      }),

      B.cmp({
        id: 'm9-rls', t: 1, src: 'rec', title: 'Row level security: one store each',
        say: 'Privileges decide which tables and columns. **Row level security** decides which rows. I turned it on for the orders table and gave the analyst a policy.',
        cols: ['Who', 'State of the table', 'Rows seen'],
        hl: 2,
        rows: G.table('ops.rls').rows.map(function (r) { return [r[0], r[1], n(r[2])]; }),
        steps: [
          { upto: 1, say: 'With row level security **on and no policy**, the analyst sees **' + RL.no_policy_rows + '** rows. The default is to **deny**.' },
          { upto: 2, say: 'With `CREATE POLICY store_five ... USING (store_id = 5)` the analyst sees **' + n(RL.policy_rows) + '** rows, the ones of store 5 (the same number as a count on the table).' },
          { upto: 3, say: 'A **superuser** sees all **' + n(RL.superuser_rows) + '**: superusers, and roles with `BYPASSRLS`, bypass the policies. By default the **owner** of the table also bypasses them, unless it is forced. Policies protect against analysts, and not against people who administer the server.' }
        ]
      }),

      B.term({
        id: 'm9-hba', t: 1, src: 'rec', title: 'Who gets in: pg_hba.conf',
        say: 'The file `pg_hba.conf` is read from top to bottom, and the first matching line decides. I wrote four lines and tried four connections.',
        lines: function () {
          return G.term([
            ['SELECT line_number, type, database, user_name, address, auth_method FROM pg_hba_file_rules;', HBA.map(function (r) { return r.join(' | '); }).join('\n')],
            ['psql -U analyst   # no password', rowsOf(X('ops.hba_results'))[0].split(':       ')[1]],
            ['psql -U analyst   # wrong password', rowsOf(X('ops.hba_results'))[1].split(':    ')[1]],
            ['psql -U analyst   # the right password', rowsOf(X('ops.hba_results'))[2].split(':    ')[1]],
            ['psql -U etl       # no line for this role', rowsOf(X('ops.hba_results'))[3].split(':          ')[1]]
          ]);
        },
        after: 'Three different refusals, and they point at different problems. *no password supplied*: the client sent none, and the line for this user needs one. *password authentication failed*: a line matched, and the password was wrong. ***no pg_hba.conf entry***: **no line matched** the host, user and database, so the server refuses before it looks at a password. The method `scram-sha-256` is the default (`password_encryption` was **' + HB.password_encryption + '**). A change to the file needs a **reload**, and `pg_hba_file_rules` shows the lines that the server read, and any error in them. Never leave `trust` on a network address.',
        afterKind: 'warn',
        doneSay: 'No entry means no line matched. Check the order of the lines.'
      }),

      B.cmp({
        id: 'm9-settings', t: 1, src: 'rec', title: 'A setting that waits for a restart',
        say: 'I changed three settings with `ALTER SYSTEM` and reloaded. Then I read `pg_settings`.',
        cols: ['Moment', 'Setting', 'Value', 'Context', 'Pending restart'],
        hl: 4,
        rows: SETT.map(function (r) {
          var v = r[3] === '8kB' ? (Number(r[2]) * 8 / 1024) + ' MB' : r[3] === 'kB' ? (Number(r[2]) / 1024) + ' MB' : r[2];
          return [r[0], r[1], v, r[4], r[6] ? 'yes' : 'no'];
        }),
        steps: [
          { upto: 3, say: 'Before: `shared_buffers` 128 MB and `max_connections` 100 with the context **postmaster**, and `work_mem` 4 MB, **user**.' },
          { upto: 6, say: 'After the change and a reload: `work_mem` is **8 MB** at once, for new sessions. `shared_buffers` and `max_connections` **did not change**. Their value is the old one, and the column **pending restart** is **yes**. The new value is in `postgresql.auto.conf` and waits for the next restart. A setting that is pending is a time bomb: the day the server restarts for another reason, it comes up different.' }
        ]
      }),

      B.term({
        id: 'm9-sort', t: 2, src: 'rec', title: 'work_mem: a sort that spills to disk',
        say: 'I sorted 200,000 orders by a text column. With the default `work_mem` of 4 MB, and with 64 MB for the session.',
        lines: function () {
          return G.term([['SELECT * FROM orders ORDER BY note;', rowsOf(X('ops.sort_spill')).filter(function (l) { return /Sort Method|SET work_mem/.test(l); }).join('\n')]]);
        },
        after: 'At 4 MB the sort did not fit: **external merge, ' + n(SO.disk_kb) + ' kB on disk**. At 64 MB it ran in memory with **quicksort, ' + n(SO.memory_kb) + ' kB**. `work_mem` is the memory for **each sort or hash in each query**, so one complex query can use it several times, and a server with 200 connections can use 200 times that. This is why you **raise it for one session or one role that runs the big queries**, and not for the whole server. A server that runs out of memory is killed by the operating system, as mission 3 showed.',
        afterKind: 'warn',
        doneSay: 'work_mem is for each sort in each query. Raise it for the big job only.'
      }),

      B.term({
        id: 'm9-timeouts', t: 1, src: 'rec', title: 'Three timeouts, and the words they use',
        say: 'Three settings stop a query or a session that takes too long. I triggered each of them.',
        lines: function () {
          return G.term([
            ['SET statement_timeout = \'100ms\'; SELECT pg_sleep(2);', rowsOf(X('ops.timeouts'))[1]],
            ['SET idle_in_transaction_session_timeout = \'300ms\'; BEGIN; SELECT 1; -- wait; SELECT 2;', rowsOf(X('ops.timeouts'))[4]],
            ['SET lock_timeout = \'200ms\'; SELECT count(*) FROM orders_q2;   -- another session holds a lock', rowsOf(X('ops.timeouts'))[8]]
          ]);
        },
        after: '**`statement_timeout`** cancels a query that runs too long. **`idle_in_transaction_session_timeout`** ends a session that opened a transaction and went quiet, which holds the **vacuum horizon back** (mission 2) and locks. **`lock_timeout`** gives up when a **lock** is not granted in time, and it is what makes a migration safe (the next screens). Set them on the **role** of each application (`ALTER ROLE app SET statement_timeout = ...`), with the values that fit its job, and a long one for the loader.',
        afterKind: 'tip',
        doneSay: 'Timeouts turn a hang into an error you can read.'
      }),

      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'A migration that waits, and the queries behind it', g: 'queue', legend: true,
        steps: [
          { say: 'Three sessions and one table. Nothing is wrong yet. Press Next.', focus: ['a', 'b', 'c', 'tbl'], cap: 'Three sessions, one table.' },
          { say: 'Step 1. Session A ran a query on the table and **did not commit**. It holds a share lock until it does, for a report that runs for ten minutes, or a session that is idle in a transaction.', on: ['e1'], focus: ['a', 'tbl'], tags: ['tg_hold'], cap: 'A holds a share lock.' },
          { say: 'Step 2. Session B runs `ALTER TABLE ... ADD COLUMN`. It needs an **exclusive lock**, which conflicts with A\'s. B **waits for A**. A migration that waits is not yet a disaster.', on: ['e2', 'e4'], focus: ['b', 'a'], tags: ['tg_exclusive'], cap: 'B waits for A.' },
          { say: 'Step 3. Session C, an ordinary `SELECT` from the application, arrives. It would not conflict with A. It **waits behind B**, because lock requests are served in order and B asked first. Every new query on the table queues up behind B.', on: ['e3', 'e5'], focus: ['c', 'b'], tags: ['tg_wait'], cap: 'C waits behind B.' },
          { say: 'Step 4. The cure is `lock_timeout`. B gives up after a few seconds with an error, the queue behind it drains, and nobody noticed. B runs again when A has finished.', on: ['e6'], focus: ['fix', 'b'], cap: 'A timeout lets B give up.' }
        ]
      }),

      B.widget({ id: 'm9-lab', kind: 'queuelab', t: 1, src: 'rec', title: 'Lab: the queue behind a migration' }),

      B.term({
        id: 'm9-migtimeout', t: 1, src: 'rec', title: 'The same migration, with a lock timeout',
        say: 'Session A has the table open again. This time B sets `lock_timeout` before the `ALTER TABLE`. Then a new reader arrives.',
        lines: function () {
          return G.term([
            ['SET lock_timeout = \'300ms\'; ALTER TABLE orders ADD COLUMN migrated2 int;', rowsOf(X('ops.migration_timeout'))[1]],
            ['SELECT 1 FROM orders LIMIT 1;   -- a new reader, right after', 'returned at once: ' + MT.reader_not_blocked]
          ]);
        },
        after: 'B was **refused after 300 ms** with *canceling statement due to lock timeout*, and the reader **was not blocked at all**: B was no longer in the queue. The migration did not happen, and the application did not stop. The pattern for a real migration is a **short lock timeout and a retry loop**: try again in a minute, and again, until A is gone. The project file does exactly this with `lock_timeout = \'3s\'`.',
        afterKind: 'tip',
        doneSay: 'A short lock_timeout keeps a waiting migration from stopping the others.'
      }),

      B.code({
        id: 'm9-mig', t: 1, src: 'rec', title: 'The safe migration of the project', file: 'migrate.sql', lang: 'sql', code: MIG,
        steps: [
          { say: 'The migration of the project. It ran as it is on the orders table. Press Next.', lines: null },
          { say: '`SET lock_timeout` comes **first**. It applies to the statements after it, in this session.', lines: G.span(MIG, /SET lock_timeout/) },
          { say: 'Then the change, which needs an **exclusive lock** for a moment. If the lock is not granted in three seconds, the statement fails and nothing is left waiting. A script around it **retries**.', lines: G.span(MIG, /ALTER TABLE/) }
        ],
        note: 'Adding a column with no default, or with a constant default, does not rewrite the table (next screen). A change of type does.'
      }),

      B.cmp({
        id: 'm9-rewrite', t: 1, src: 'rec', title: 'Which statements rewrite the table',
        say: 'A rewrite copies the whole table to a new file while holding the exclusive lock. I ran seven changes on a table of 200,000 rows and checked if the file of the table changed.',
        cols: ['Statement', 'Table rewritten'],
        hl: 1,
        rows: REW.map(function (r) { return ['`' + r[0] + '`', r[1] === 'yes' ? 'Yes: a new file' : 'No']; }),
        steps: [
          { upto: 2, say: 'A column with **no default**, or with a **constant default**, is **instant**: since PostgreSQL 11 the value is stored in the catalog and not written to every row.' },
          { upto: 3, say: 'A **volatile default** (`clock_timestamp()`, `random()`) must be computed for every row, so the table is **rewritten** under an exclusive lock.' },
          { upto: 5, say: 'A change of **type** from `integer` to `bigint`, or from `text` to `varchar(40)`, also **rewrites**. On a table of hundreds of GB that is an outage. The way around it is a new column, a backfill in batches, and a swap.' },
          { upto: 7, say: '**`numeric(10,2)` to `numeric(12,2)`** did **not** rewrite: increasing the precision with the same scale is only a change of the declaration. And a `NOT NULL` column with a constant default is instant too.' }
        ]
      }),

      B.term({
        id: 'm9-pgss', t: 1, src: 'rec', title: 'pg_stat_statements: which queries cost the most',
        say: 'The extension records every normalized query with its number of calls. It has to be loaded when the server starts. I tried it without that, then restarted with it and ran a small workload.',
        lines: function () {
          return G.term([
            ['CREATE EXTENSION pg_stat_statements;  SELECT count(*) FROM pg_stat_statements;', rowsOf(X('ops.pgss_not_loaded'))[2]],
            ['shared_preload_libraries = \'pg_stat_statements\'   # restart', ''],
            ['SELECT query, calls, rows FROM pg_stat_statements ORDER BY calls DESC;', PGSS.map(function (r) { return r[0] + ' | ' + r[1] + ' | ' + r[2]; }).join('\n')]
          ]);
        },
        after: 'Without the preload the view **refuses**: *' + rowsOf(X('ops.pgss_not_loaded'))[2] + '*, and the preload needs a **restart** (mission 1 and the settings screen). After it, two hundred queries that differ only by the id became **one row** with `$1`: **' + PS.point_lookup_calls + ' calls**. The same view has the **total time** and the mean time of each query, which vary from run to run and were not quoted. Sort by total time to find what the server spends its day on, and start there before you tune anything.',
        afterKind: 'tip',
        doneSay: 'pg_stat_statements groups queries and counts them. It needs a restart.'
      }),

      B.code({
        id: 'm9-roles', t: 1, src: 'rec', title: 'The roles of the project', file: 'roles.sql', lang: 'sql', code: ROLES,
        steps: [
          { say: 'The file ran on the project database. Press Next.', lines: null },
          { say: 'A **login role** with a password. In real life the password comes from a secret manager, and is not in a file.', lines: rs(/CREATE ROLE/) },
          { say: '`GRANT SELECT ON ALL TABLES` covers the tables that **exist now**. `ALTER DEFAULT PRIVILEGES` covers the tables made **afterwards** by the role that ran it.', lines: rs(/GRANT SELECT ON ALL/, /ALTER DEFAULT/) },
          { say: '**Row level security** on, and a policy for this role: store 5 only. Without the policy, the role sees nothing.', lines: rs(/ENABLE ROW LEVEL/, /CREATE POLICY/) }
        ],
        note: 'The password `change-me` is a placeholder. Never commit a real one.'
      }),

      B.code({
        id: 'm9-hbafile', t: 3, src: 'docs', title: 'A pg_hba.conf for a small team', file: 'pg_hba.conf', lang: 'ini', code: HBAF,
        steps: [
          { say: 'A sample for a small team. I did not use these addresses in the recording, so this screen is from documentation. Press Next.', lines: null },
          { say: 'The local administrator uses **peer** authentication: the operating system user. No password travels.', lines: G.span(HBAF, /^local/) },
          { say: 'Analysts connect from one network with **scram-sha-256**. The first matching line decides, so more specific lines go **first**.', lines: G.span(HBAF, /analyst/) },
          { say: 'A pipeline role can reach one database from one subnet, and the **replication** line is the only one that allows a replica to connect.', lines: G.span(HBAF, /etl/, /replicator/) }
        ],
        note: 'A network address and a password method are the two things to get right. `trust` on a network is an open door.'
      }),

      B.cmp({
        id: 'm9-watch', t: 1, src: 'docs', title: 'What to watch on a PostgreSQL server',
        say: 'Every view of this list appeared in this course. Press Next to read what to alert on.',
        cols: ['Where', 'What to look at', 'Alert when', 'Mission'],
        hl: 2,
        rows: [
          ['`pg_stat_activity`', 'Sessions by state and age. Idle in transaction', 'Many sessions near `max_connections`, or a transaction that is hours old', '1, 2'],
          ['`pg_stat_user_tables`', 'Dead rows, last autovacuum, size', 'Dead rows high, and the table growing', '2'],
          ['`pg_stat_replication` and `pg_replication_slots`', 'Lag in bytes, inactive slots, `wal_status`', 'A slot that is inactive, or a standby that is far behind', '7'],
          ['`pg_stat_archiver`', 'Failures of `archive_command`', 'Any failure, or no new segment for a long time', '8'],
          ['`pg_stat_bgwriter`', 'Requested checkpoints', 'Many requested checkpoints', '3'],
          ['`pg_stat_statements`', 'Total time and calls for each query', 'A new query at the top', '9'],
          ['`age(datfrozenxid)`', 'How old the oldest unfrozen row is', 'Well before 200 million', '2']
        ],
        steps: [
          { upto: 3, say: 'Sessions, tables and replication: the three that most often explain an outage.' },
          { upto: 7, say: 'The archive, the checkpoints, the queries and the transaction age. A dashboard of these is the minimum for a server that matters.' }
        ]
      }),

      B.cmp({
        id: 'm9-pooler', t: 3, src: 'docs', title: 'A connection pooler: what it does and what it breaks',
        say: 'Mission 1 ended with a pooler as the answer to too many connections. This screen is from documentation: I did not run PgBouncer.',
        cols: ['Mode', 'A server connection is held', 'What works', 'What breaks'],
        hl: 1,
        rows: [
          ['Session pooling', 'For the whole client session', 'Everything', 'It saves little: one server connection for each client that is connected'],
          ['Transaction pooling', 'For one transaction', 'Many clients on few server connections', 'Session state: `SET`, temporary tables, advisory locks, and some prepared statements'],
          ['Statement pooling', 'For one statement', 'Simple autocommit queries', 'Multi-statement transactions']
        ],
        steps: [
          { upto: 1, say: 'Session pooling is safe and saves the least.' },
          { upto: 3, say: '**Transaction pooling** is the one that makes a difference, and the one that breaks code that relies on session state. A loader that makes a temporary table must keep one connection for its transaction, which it does anyway.' }
        ]
      }),

      B.bug({
        id: 'm9-bug', t: 1, src: 'docs', q: 'An analyst can read every table of the schema on Monday. In April the nightly job makes a new table and the analyst gets *permission denied*. Click the line that is the cause.',
        file: 'grants.sql', lang: 'sql', code: GRANTBUG, bad: [1],
        hint: 'Which tables does this statement cover?',
        why: '`GRANT ... ON ALL TABLES` covers the tables that **exist at that moment**. The recording: a new table `orders_q2` made afterwards was refused, and `ALTER DEFAULT PRIVILEGES` fixed the tables made **after it**, not the one that already existed. Run `ALTER DEFAULT PRIVILEGES ... GRANT SELECT ON TABLES TO analyst` for the role that creates the tables, and grant on the existing ones once.',
        fix: 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;\nALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst;\n\nCREATE TABLE orders_q2 AS SELECT * FROM orders;\n',
        cheer: 'Cover the tables of tomorrow.'
      }),

      B.bug({
        id: 'm9-bug2', t: 1, src: 'docs', q: 'This migration runs on a busy server in the morning. A report is running, and soon every query on the table hangs. Click the line that causes it.',
        file: 'migration.sql', lang: 'sql', code: MIGBUG, bad: [2],
        hint: 'What happens when the lock cannot be granted at once?',
        why: 'The `ALTER TABLE` needs an exclusive lock and **waits behind the report**. Every query that arrives afterwards **waits behind the `ALTER`**, as the recording shows (C blocked by B, B by A). Put `SET lock_timeout = \'3s\'` before it, so that it gives up and tries again later.',
        fix: '-- migration, run at 10:00 on a busy server\nSET lock_timeout = \'3s\';\nALTER TABLE orders ADD COLUMN channel text;\n',
        cheer: 'Give the lock a deadline.'
      }),

      B.bug({
        id: 'm9-bug3', t: 2, src: 'docs', q: 'The store id has to become a bigint on a table of 400 GB. This statement is planned for Tuesday afternoon. Click the line that is the problem.',
        file: 'type.sql', lang: 'sql', code: TYPEBUG, bad: [2],
        hint: 'What does a change of type do to the table file?',
        why: 'A change of type from `integer` to `bigint` **rewrites the table** under an **exclusive lock**: the recording shows `ALTER COLUMN store_id TYPE bigint` as **' + REW[3][1] + '** for a rewrite. On 400 GB that is hours of outage. Add a new column, copy the values in batches, keep them in step with a trigger, and swap names in a short transaction.',
        fix: 'ALTER TABLE orders ADD COLUMN store_id_big bigint;\n-- backfill in batches of a few thousand rows, then swap the columns in a short transaction\n',
        cheer: 'Never rewrite a big table in one step.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'You run `GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst`. In April a new table is made. Can the analyst read it?',
        opts: [
          { t: 'No, unless default privileges were set for the role that creates tables', fb: '' },
          { t: 'Yes, the grant covers the whole schema forever', fb: 'It covers the tables that exist at that moment.' },
          { t: 'Yes, for the first hour', fb: 'There is no such grace period.' },
          { t: 'Only if the analyst reconnects', fb: 'The privilege is not a matter of the session.' }
        ],
        ok: 0, why: 'The recording: *' + PRIV[3][1].replace('refused: ', '') + '* for the table made afterwards, and *allowed* for the one made after `ALTER DEFAULT PRIVILEGES`.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'You change `max_connections` with `ALTER SYSTEM` and run `pg_reload_conf()`. What is the value now?',
        opts: [
          { t: 'The old one, and `pending_restart` is true', fb: '' },
          { t: 'The new one', fb: 'A setting with the context postmaster needs a restart.' },
          { t: 'The new one for new sessions', fb: 'That is how settings with the context user behave, such as work_mem.' },
          { t: 'Zero', fb: 'The server keeps the old value.' }
        ],
        ok: 0, why: 'The recording: `shared_buffers` and `max_connections` kept their value and showed `pending_restart`, while `work_mem` was **' + SETT[5][2] + ' kB** at once.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'Session A holds a share lock and has not committed. B runs `ALTER TABLE` and waits. C runs a simple `SELECT`. What does C do?',
        opts: [
          { t: 'It waits behind B', fb: '' },
          { t: 'It runs at once, because A and C do not conflict', fb: 'It would, if B were not in the queue. B asked first and conflicts with everyone.' },
          { t: 'It cancels B', fb: 'It does not.' },
          { t: 'It fails with an error', fb: 'It waits. An error comes only if a timeout is set.' }
        ],
        ok: 0, why: 'The recording: C was blocked by **B**, B by **A**, and C waited more than a second.'
      }),

      B.quiz({
        id: 'm9-q4', t: 2,
        q: 'Which of these takes an exclusive lock for the time of a rewrite of a big table?',
        opts: [
          { t: '`ALTER COLUMN store_id TYPE bigint`', fb: '' },
          { t: '`ADD COLUMN channel text`', fb: 'It does not rewrite: it changes the catalog.' },
          { t: '`ADD COLUMN c2 int DEFAULT 0`', fb: 'A constant default is stored in the catalog since version 11.' },
          { t: '`ALTER COLUMN amount TYPE numeric(12,2)` from `numeric(10,2)`', fb: 'Increasing the precision with the same scale did not rewrite.' }
        ],
        ok: 0, why: 'The recording: the type change to bigint was **' + REW[3][1] + '** for a rewrite, and so was a volatile default.'
      }),

      B.quiz({
        id: 'm9-q5', t: 2,
        q: 'Row level security is on for `orders`, with a policy for `analyst`. Who still sees every row?',
        opts: [
          { t: 'Superusers and roles with BYPASSRLS, and by default the table owner', fb: '' },
          { t: 'Nobody: the policy applies to everyone', fb: 'Superusers bypassed it: ' + n(RL.superuser_rows) + ' rows.' },
          { t: 'Only the analyst', fb: 'The policy limits the analyst to one store.' },
          { t: 'Every role without a policy', fb: 'A role without a policy sees **no** rows when row level security is on.' }
        ],
        ok: 0, why: 'The recording: the analyst without a policy saw ' + RL.no_policy_rows + ', with one ' + n(RL.policy_rows) + ', and the superuser ' + n(RL.superuser_rows) + '.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Run a migration on a busy server without stopping the application. Put the steps in order.',
        items: [
          'Check that it will not rewrite the table: a new column with no default, or a constant default',
          'Set a short `lock_timeout` in the migration session',
          'Run the statement, and be ready for it to fail with *lock timeout*',
          'If it fails, look at `pg_stat_activity` for the long transaction that blocks it, and try again',
          'Create indexes with `CREATE INDEX CONCURRENTLY`, outside the transaction'
        ],
        why: 'The first step avoids a long lock, the timeout avoids the queue, and the retry makes the whole thing safe. A plain `CREATE INDEX` blocks writes for as long as it builds.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: two hundred application instances and one primary',
        scenario: 'A microservice platform has two hundred instances, each with a pool of ten connections to the same primary. The server has 32 GB of memory and `max_connections = 100`. The services connect only for a few milliseconds at a time.',
        opts: [
          { t: 'A pooler in transaction mode in front of the primary, with a few dozen server connections, and no session state in the services', d: 'Two thousand client connections share thirty server connections. The server keeps its memory for queries.', lose: 'One more component to run and to make highly available, and code that uses `SET`, temporary tables or advisory locks has to change.' },
          { t: 'Raise `max_connections` to 2,000', d: 'No new component.', lose: 'Two thousand processes with their own memory, and the contention for locks grows with them. It needs a restart and it will be slow.' },
          { t: 'Cut every pool to one connection and hope', d: 'Fewer connections.', lose: 'Two hundred is still above one hundred, and a slow query blocks the whole instance.' }
        ],
        pick: 0,
        why: 'The services are short and many, which is what a pooler in transaction mode is for. Mission 1 recorded the cost of a connection (a process each) and the refusal when slots run out. PgBouncer and its pool modes did not run: this answer is from documentation, and the table of pool modes in this mission says what it breaks.',
        when: 'Twenty long-running workers do not need a pooler.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: a migration stopped the whole application', time: '10:05',
        alert: '**At 10:03 a migration `ALTER TABLE orders ADD COLUMN` started. At 10:05 every query on `orders` hangs** and the application is down. A 12-minute report has been running on the table since 10:00.',
        clues: ['`pg_stat_activity` shows the report as `idle in transaction` or active, and the migration as `Lock / relation`', '`pg_blocking_pids` of the migration names the report, and the application queries name the migration', 'The migration has no `lock_timeout`'],
        opts: [
          { t: 'Cancel the migration with `pg_cancel_backend`, so that the queue drains, and run it later with a `lock_timeout` and a retry', fb: '' },
          { t: 'Kill the report with `pg_terminate_backend`', fb: 'It may be a good move later, but the quickest relief is to remove the migration from the queue, because the application waits on it.' },
          { t: 'Restart the server', fb: 'It ends every session, and the migration can start again at once.' },
          { t: 'Wait ten minutes for the report', fb: 'The application is down for all of them.' }
        ],
        best: 0,
        why: 'The recording of the same chain: A (an open reader) held the table, **B** (`ALTER TABLE`) was blocked by A, and **C** (a plain `SELECT`) was blocked by B, for more than a second. With `lock_timeout = 300 ms`, B was refused and C **was not blocked** (' + MT.reader_not_blocked + ').',
        checks: [
          ['See the chain', '`SELECT pid, wait_event_type, pg_blocking_pids(pid), query FROM pg_stat_activity`.'],
          ['Remove the head of the queue', '`SELECT pg_cancel_backend(<pid of the migration>)`.'],
          ['Decide about the report', 'It can finish, or be ended, once the application is back.'],
          ['Run it again, safely', '`SET lock_timeout`, a retry, and a quiet moment.']
        ],
        tell: 'A migration waited behind a long report, and every query on the table waited behind the migration, so the application stopped. I cancelled the migration, which drained the queue, and the application came back at once. We now run migrations with a lock timeout and a retry, and we check for long transactions first.',
        prevent: ['Every migration sets **`lock_timeout`**', 'Alert on **long transactions** and **sessions waiting for locks**', 'Run migrations when there are **no long reports**']
      }),

      B.qa({
        id: 'qa-roles', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'How do you give analysts read access to the data and nothing more?',
        pts: ['A login role with only SELECT on the tables it needs', 'ALTER DEFAULT PRIVILEGES for future tables', 'Column grants or views to hide columns', 'Row level security for rows'],
        short: 'I create a **role** that can log in, and grant it `USAGE` on the schema and `SELECT` on the tables it needs, by the group of roles and not by person. A grant on all tables covers the tables that exist **now**, so I also set `ALTER DEFAULT PRIVILEGES` for the role that creates new tables: in my recording a table made later was refused, and the grant for the earlier one did not fix it. For columns I grant `SELECT (col, ...)` or use a **view**, because a `SELECT *` over a column that is not granted fails. For rows I use **row level security** with a policy: an analyst with no policy saw 0 rows, with a policy for one store 16,667, and a superuser all 200,000. Since PostgreSQL 15 an ordinary role cannot create tables in `public`. Passwords come from a secret manager.',
        fu: [['What is a group role?', 'A role with no login that other roles are members of.'], ['Who bypasses row level security?', 'Superusers, `BYPASSRLS` and, by default, the owner.']],
        trap: 'Granting once and forgetting future tables.',
        real: 'Describe how access to the warehouse tables is managed in your team.'
      }),

      B.qa({
        id: 'qa-hba', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What does pg_hba.conf do, and what do its errors mean?',
        pts: ['It decides who may connect, from where, to which database, and how', 'Read from top to bottom, the first match wins', 'No pg_hba.conf entry means no line matched', 'Reload after a change'],
        short: 'It is the file that says which **user**, from which **address**, to which **database**, may connect and with which **method** (`scram-sha-256`, `peer`, `reject`, `trust`). It is read from top to bottom and the **first matching line decides**, so specific lines go first. The errors tell the cause: in my recording *no password supplied* meant that the client sent none, *password authentication failed* that a line matched and the password was wrong, and *no pg_hba.conf entry for host ..., user ..., database ...* that **no line matched at all**, so the server refused before it asked for a password. A change needs a reload, and `pg_hba_file_rules` shows what the server read and any error. I never use `trust` on a network address, and I use `scram-sha-256`, which is the default password method.',
        fu: [['What is peer?', 'It trusts the operating system user name, for local connections.'], ['Is SSL involved?', 'The `hostssl` type requires it. From documentation.']],
        trap: 'Debugging a password when the line did not match.',
        real: 'Say how access from the pipelines is restricted.'
      }),

      B.qa({
        id: 'qa-workmem', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What is work_mem, and how do you set it?',
        pts: ['Memory for each sort or hash in each query', 'Spills to disk beyond it', 'Multiplied by operations and connections', 'Raise it per role or session, not globally'],
        short: '`work_mem` is the memory that **each sort or hash operation** of a query may use before it spills to temporary files on disk. A query can have several such operations, and a server has many connections, so the total can be a multiple of the setting. In my recording a sort of 200,000 rows with the default 4 MB used an **external merge with 12 MB on disk**, and at 64 MB it ran in memory with a quicksort of 21 MB. I do not raise it for the whole server: I set it for the **role or the session** that runs the big queries, with `SET` or `ALTER ROLE`, and I look in `EXPLAIN (ANALYZE)` for `Sort Method: external merge` and for hash batches. The sizes of other memory settings, such as `maintenance_work_mem` for index builds and `shared_buffers`, are separate.',
        fu: [['How do you see spills overall?', '`temp_files` and `temp_bytes` in `pg_stat_database`.'], ['What about the OS killing the server?', 'Too high a work_mem times the connections can use all the memory.']],
        trap: 'Setting a huge work_mem for the whole server.',
        real: 'Describe a query that you fixed with work_mem.'
      }),

      B.qa({
        id: 'qa-locks', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'A migration makes the whole application hang. Why, and how do you prevent it?',
        pts: ['ALTER TABLE needs an exclusive lock and waits behind open transactions', 'New queries queue behind the waiting ALTER', 'lock_timeout makes the migration give up', 'Retry, and avoid rewrites'],
        short: 'An `ALTER TABLE` needs an **exclusive lock**, and if a long transaction already holds a lock on the table, the migration **waits**. At the same time lock requests are served in order, so every **new query on the table queues behind the migration**, even a plain `SELECT` that would not conflict with the long transaction. In my recording A held the table open, B (`ALTER TABLE`) waited for A, and C (a `SELECT`) waited for B, for more than a second, as `pg_stat_activity` and `pg_blocking_pids` showed. The cure is `SET lock_timeout = \'3s\'` before the statement: B was refused after 300 ms and C was not blocked at all. I run migrations with a short timeout and a retry loop, I check for long transactions first, and I avoid statements that rewrite the table.',
        fu: [['How do you end the head of the queue?', '`pg_cancel_backend(pid)` for the migration.'], ['Do indexes lock too?', 'A plain `CREATE INDEX` blocks writes. Use `CONCURRENTLY`.']],
        trap: 'Running a migration with no lock timeout.',
        real: 'Describe a migration that stopped a service.'
      }),

      B.qa({
        id: 'qa-ddlsafe', t: 2, tag: 'PostgreSQL', secs: 75,
        q: 'Which schema changes are safe on a big table, and which are not?',
        pts: ['Safe: add a column with no default or a constant default', 'Rewrites: a volatile default, a change of type', 'Use a new column and a backfill for a type change', 'CREATE INDEX CONCURRENTLY'],
        short: 'Safe and fast: adding a column with no default, or with a **constant default**, which since PostgreSQL 11 only changes the catalog, and increasing the precision of a numeric with the same scale. In my recording those did not change the table file. Not safe: a **volatile default** such as `clock_timestamp()`, and a change of **type** such as `integer` to `bigint` or `text` to `varchar(40)`, which **rewrite the table** under an exclusive lock, so on a big table they are an outage. For a type change I add a **new column**, backfill it in batches, keep it in step with a trigger or the application, and swap in a short transaction. I create indexes with `CREATE INDEX CONCURRENTLY`, and I put `lock_timeout` in front of everything that needs a lock.',
        fu: [['Is adding a NOT NULL constraint safe?', 'It scans the table unless a check constraint was added `NOT VALID` and validated first. From documentation.'], ['How do you drop a column?', 'It is instant, and the space is reclaimed later by rewrites.']],
        trap: 'Changing a type in place on a big table.',
        real: 'Describe a type change you did without downtime.'
      }),

      B.qa({
        id: 'qa-pgss', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'How do you find the queries that cost the most?',
        pts: ['pg_stat_statements, loaded at server start', 'It groups queries with their parameters removed', 'Sort by total time and by calls', 'Then read the plan'],
        short: 'With the `pg_stat_statements` extension. It has to be listed in `shared_preload_libraries`, which needs a restart: in my recording a server without it refused the view with *pg_stat_statements must be loaded via shared_preload_libraries*. It then records every query with its constants replaced by `$1`, so that two hundred lookups that differ by an id became **one row with 200 calls**. The view has the total and mean time, the rows and the buffers of each query. I sort by total time to see what the server spends its day on, by calls for chatty clients, and then read the plan of the top ones with `EXPLAIN (ANALYZE)`. I reset it after a release to see the new picture, and I also set `log_min_duration_statement` to catch single slow runs.',
        fu: [['Does it cost much?', 'A small overhead. It is common to leave it on.'], ['What about the text of the query?', 'It is the normalized text, with `$1` placeholders.']],
        trap: 'Tuning a query that costs a second a day.',
        real: 'Say which query was at the top of yours.'
      }),

      B.qa({
        id: 'qa-pooler', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'When do you need a connection pooler?',
        pts: ['Many short-lived client connections', 'A connection is a process with memory', 'Transaction pooling shares server connections', 'It breaks session state'],
        short: 'When many clients connect for short times, such as hundreds of microservice instances or serverless functions, because each connection is a **process** with its own memory (mission 1 counted them) and the server cannot hold thousands. A pooler such as **PgBouncer** keeps a small number of server connections and hands them to clients. In **transaction pooling** a server connection is held for one transaction, which makes the big difference, and it **breaks session state**: `SET`, temporary tables, advisory locks and some prepared statements. So the services must not rely on session state. A pooler is one more component to run and to make highly available. I did not run one here, and this answer is from documentation. I first look at whether the clients can simply be limited: twenty long-running workers do not need one.',
        fu: [['What are the pool modes?', 'Session, transaction and statement.'], ['Where does it run?', 'Next to the application, or in front of the database.']],
        trap: 'Raising max_connections instead.',
        real: 'Say how connections are pooled in your platform.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Server Steward', color: '#C7D2FE',
        pts: [
          'A grant covers tables that **exist**. Use `ALTER DEFAULT PRIVILEGES` for new ones. **Row level security**: 0 rows without a policy, ' + n(RL.policy_rows) + ' with one, ' + n(RL.superuser_rows) + ' for a superuser.',
          '`pg_hba.conf` is read top to bottom. *No entry* means that no line matched.',
          '`work_mem` spilled **' + n(SO.disk_kb) + ' kB** at 4 MB. A setting with the context **postmaster** shows `pending_restart` until a restart.',
          'A waiting `ALTER TABLE` makes every new query **queue behind it**. `lock_timeout` refused B after 300 ms and C was **not blocked**.',
          'A volatile default and a type change **rewrite** the table. `pg_stat_statements` needs a **restart**.'
        ],
        lines: [
          'I give roles access to tomorrow\'s tables too.',
          'I give every migration a lock timeout.',
          'I know which setting needs a restart.'
        ]
      })
    ]
  });
})();
