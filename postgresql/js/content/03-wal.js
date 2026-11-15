/* Mission 3: the write-ahead log, checkpoints and crash recovery. Every number is from the recording. A crash was made by killing every process of the server with signal 9. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var SG = C('wal.segment'), FP = C('wal.fpi'), CK = C('wal.checkpoint'), CM = C('wal.commits'), WL = C('wal.wal_level'), CR = C('crash');
  var RECS = G.table('wal.records').rows;
  var sum = function (label) { return RECS.filter(function (r) { return r[0] === label; }).reduce(function (a, r) { return a + r[3]; }, 0); };
  var FIRST = sum('first update after a checkpoint'), SECOND = sum('second update on the same page');
  G.expect(SG.segment_bytes === 16777216 && SG.name_chars === 24, 'a log segment is 16 MB and its name has 24 characters');
  G.expect(FP.first_update_fpi_bytes > 8000 && FP.second_update_fpi_bytes === 0 && FP.every_statement_ends_with_commit === true && FIRST > 18000 && SECOND < 200, 'the first change after a checkpoint writes whole pages');
  G.expect(CM.on.wal_syncs === 1000 && CM.off.wal_syncs < 10 && CM.one_transaction.wal_syncs === 1, 'one flush for each commit');
  G.expect(CK.manual_counts_as_requested === true, 'a manual checkpoint counts as requested');
  G.expect(CR.paid_after_crash === 2000 && CR.uncommitted_rows_after_crash === 0 && CR.unlogged_after_clean_restart === 1000 && CR.unlogged_after_crash === 0 && CR.log_says_recovery && CR.log_says_redo && CR.log_says_ready, 'a crash keeps what was committed and loses what was not');
  G.expect(WL.default === 'replica' && WL.logical_slot_refused === true, 'logical decoding needs wal_level logical');
  var AUTO = 'import psycopg\n\ncon = psycopg.connect(DSN, autocommit=True)\nfor row in rows:\n    con.execute("INSERT INTO orders VALUES (%s, %s)", row)\n';
  var fmt = function (b) { return n(b) + ' bytes'; };

  LAB.addChapter({
    id: 'm3', n: 3, title: 'The write-ahead log and crash recovery', short: 'WAL', blurb: 'what a commit waits for, what a checkpoint does, and what happens after a crash', minutes: 18,
    focus: ['ing', 'air'],
    goals: [
      'Say why a **commit** waits for the log and not for the data files.',
      'Say what a **checkpoint** does and what a **full page image** costs.',
      'Explain what a server does after a **crash**, and what survives.',
      'Say what `wal_level`, `synchronous_commit` and **unlogged** tables change.'
    ],
    say: 'PostgreSQL promises that a committed transaction survives a crash. It does not keep that promise by writing the data files at commit. It writes a short record to a log first, and the files catch up later. This mission reads the log, counts what a commit costs, and kills a server on purpose.',
    scenes: [
      B.flow({
        id: 'm3-flow', t: 1, src: 'docs', title: 'The log first, the pages later', g: 'wal', legend: true,
        steps: [
          { say: 'A statement changes a row. Two things have to happen, and the order matters. Press Next.', focus: ['st', 'buf', 'wal'], cap: 'A change has to survive a crash.' },
          { say: 'Step 1. The change is made to the page **in memory**, in shared buffers. The page is now dirty: it differs from its copy in the data file. Writing every dirty page at commit would be slow and scattered.', on: ['e1'], focus: ['st', 'buf'], cap: 'The page changes in memory.' },
          { say: 'Step 2. The change is also written as a short **record** to the write-ahead log, which is appended in order. At **commit** the backend waits until that record is **on disk**. Then the commit returns.', on: ['e2'], focus: ['st', 'wal'], tags: ['tg_commit'], cap: 'The commit waits for the log.' },
          { say: 'Step 3. Later, a **checkpoint** writes the dirty pages to the data files, in batches. The log before the checkpoint is no longer needed for recovery.', on: ['e3', 'e4'], focus: ['buf', 'chk', 'df'], tags: ['tg_later'], cap: 'Pages are written later.' },
          { say: 'Step 4. If the server stops without writing the pages, **recovery** starts from the last checkpoint and **replays** the log. Every committed change comes back.', on: ['e5'], focus: ['wal', 'rec'], tags: ['tg_crash'], cap: 'Recovery replays the log.' },
          { say: 'Step 5. After the replay the data files are as they would have been. The log is the **only copy of the truth** between two checkpoints, which is also why replicas, backups and change data capture all read it (missions 7 and 8).', on: ['e6'], focus: ['rec', 'df'], cap: 'Replicas and backups use the same log.' }
        ]
      }),

      B.term({
        id: 'm3-dir', t: 1, src: 'rec', title: 'The log on disk',
        say: 'The log is a series of files of 16 MB in `pg_wal`. A new server has one.',
        lines: function () {
          return G.term([
            ['ls $PGDATA/pg_wal', X('wal.dir')],
            ['SHOW wal_segment_size;', '16MB'],
            ['SELECT pg_walfile_name(pg_current_wal_lsn());', '000000010000000000000001   (' + SG.name_chars + ' characters: timeline, then position)']
          ]);
        },
        after: 'A segment is **' + n(SG.segment_bytes) + ' bytes**. Its name has **' + SG.name_chars + ' hexadecimal characters**: eight for the timeline (mission 8), then the position. The server numbers every byte of the log with an **LSN**, a log sequence number such as `0/16B3748`, and the difference of two LSNs is a number of bytes. Mission 4 uses that to count what a load writes. Segments that are no longer needed are recycled or removed after a checkpoint, **unless** something still needs them: an archive, a replica or a **replication slot** (mission 7).',
        afterKind: 'tip',
        doneSay: 'The log is a series of 16 MB files, and the LSN is a byte position.'
      }),

      B.cmp({
        id: 'm3-records', t: 1, src: 'rec', title: 'What a statement writes to the log',
        say: 'I read the log between two positions with the pg_walinspect extension, after four statements on a table of 1,000 rows.',
        cols: ['Statement', 'Resource manager', 'Record type', 'Record bytes', 'Full page image bytes'],
        hl: 3,
        rows: RECS.map(function (r) { return [r[0], r[1], r[2], n(r[3]), n(r[4])]; }),
        steps: [
          { upto: 4, say: 'The **first update after a checkpoint** wrote **' + n(FIRST) + ' bytes** for one row. Three of its four records carry a **full page image** of 2,900 to 8,100 bytes.' },
          { upto: 7, say: 'The **second update on the same page** wrote **' + n(SECOND) + ' bytes**: a prune record, a `HOT_UPDATE` and the commit. No page image.' },
          { upto: 10, say: 'A `DELETE` is a 54 byte record plus a 59 byte prune. A delete writes **less** than an update, because it does not write a new version.' },
          { upto: 13, say: 'An insert is a 65 byte heap record, and its index entry (`Btree INSERT_LEAF`) carried a page image of 5,420 bytes: the first change to that index page after the checkpoint. Every statement ends with a 34 byte `COMMIT`.' }
        ]
      }),

      B.term({
        id: 'm3-fpi', t: 2, src: 'rec', title: 'The first change after a checkpoint is the expensive one',
        say: 'I ran `CHECKPOINT`, updated one row, and updated a second row on the same page.',
        lines: function () {
          return G.term([
            ['CHECKPOINT; UPDATE w SET v = v + 1 WHERE id = 1;', 'log written: ' + fmt(FIRST) + ' (page images: ' + fmt(FP.first_update_fpi_bytes + 2924 + 7400) + ')'],
            ['UPDATE w SET v = v + 1 WHERE id = 2;   -- same page', 'log written: ' + fmt(SECOND) + ' (page images: ' + fmt(FP.second_update_fpi_bytes) + ')']
          ]);
        },
        after: 'A crash can leave a page half written on disk. To make recovery safe, PostgreSQL writes a **full copy of a page** into the log the first time that page changes after a checkpoint (`full_page_writes`, on by default). That one-row update cost **' + n(FIRST) + ' bytes**, and the next one on the same page **' + n(SECOND) + '**: about **' + Math.round(FIRST / SECOND) + ' times** less. The consequence for a data engineer: a bulk update that touches every page right after a checkpoint writes a lot of log, and checkpoints that are too close together make it worse. Longer `checkpoint_timeout` and a larger `max_wal_size` mean fewer page images.',
        afterKind: 'tip',
        doneSay: 'The first touch of a page after a checkpoint writes the whole page.'
      }),

      B.cmp({
        id: 'm3-commits', t: 1, src: 'rec', title: 'The price of a commit',
        say: 'I inserted 1,000 rows one by one, and counted how many times the log was flushed to disk.',
        cols: ['1,000 single-row inserts', 'Commits', 'WAL flushes to disk', 'Seconds on this machine'],
        hl: 2,
        rows: G.table('wal.commits').rows.map(function (r) { return [r[0], n(r[1]), n(r[2]), String(r[3])]; }),
        steps: [
          { upto: 1, say: 'One transaction for each insert, with the default `synchronous_commit = on`: **' + n(CM.on.wal_syncs) + ' flushes**, one for each commit. Each one waits for the disk.' },
          { upto: 2, say: 'The same with `synchronous_commit = off`: **' + CM.off.wal_syncs + ' flushes**. The commit returns before the log is on disk, and the WAL writer flushes every 200 ms. A crash can lose the **last few commits** (but never corrupts the database).' },
          { upto: 3, say: 'All 1,000 in **one transaction**: **' + CM.one_transaction.wal_syncs + ' flush**. Grouping rows into one transaction is the safe way to get the saving, with no loss of durability. The seconds are small here, because this machine\'s disk is fast: on a slower disk the first row is the one that hurts.' }
        ]
      }),

      B.term({
        id: 'm3-checkpoint', t: 1, src: 'rec', title: 'A checkpoint, as the log reports it',
        say: 'I switched on `log_checkpoints` and ran `CHECKPOINT` by hand.',
        lines: function () {
          return G.term([
            ['CHECKPOINT;', 'CHECKPOINT'],
            ['-- the server log:', X('wal.checkpoint_log')],
            ['SELECT checkpoints_timed, checkpoints_req FROM pg_stat_bgwriter;', 'before: ' + CK.timed_before + ' | ' + CK.req_before + '    after: ' + CK.timed_after + ' | ' + CK.req_after]
          ]);
        },
        after: 'A checkpoint writes all dirty pages and records a point from which recovery can start. It happens when **`checkpoint_timeout`** has passed (5 minutes by default), when the log has grown by **`max_wal_size`** (1 GB by default), and when someone asks. A manual one counts as **requested**: `checkpoints_req` went from ' + CK.req_before + ' to ' + CK.req_after + ' and the timed counter stayed at ' + CK.timed_after + '. If `checkpoints_req` is high on a busy server, the log fills `max_wal_size` before the timeout, and raising it is the usual cure. The numbers in the log line (buffers written, times) vary from run to run, so the lesson does not quote them.',
        afterKind: 'tip',
        doneSay: 'A checkpoint writes the dirty pages. Timed is healthy, requested is a hint.'
      }),

      B.term({
        id: 'm3-crash', t: 1, src: 'rec', title: 'A server that is killed',
        say: 'Two thousand rows were committed, and one session held 500 more in a transaction that was never committed. I killed every process of the server with signal 9 and started it again.',
        lines: function () {
          return G.term([
            ['kill -9 <postmaster and its children>', ''],
            ['pg_ctl start', ''],
            ['-- the server log:', X('crash.log')],
            ['SELECT count(*) FROM paid;', String(CR.paid_after_crash)],
            ['SELECT count(*) FROM paid WHERE id > 2000;   -- the uncommitted rows', String(CR.uncommitted_rows_after_crash)]
          ]);
        },
        after: 'The server noticed that it **had not been shut down properly**, started **automatic recovery**, replayed the log from the last checkpoint, and opened for connections. All **' + n(CR.committed_before_crash) + '** committed rows were there, and the **' + CR.uncommitted_before_crash + '** uncommitted rows were gone: **' + CR.uncommitted_rows_after_crash + '**. No backup was involved. This is a process crash. A real power cut can also lose what the operating system had not written yet, which is why the server calls `fsync` at commit. I did not cut power, and the result of a kill does not prove that `fsync` works.',
        afterKind: 'warn',
        doneSay: 'A crash replays the log. Committed stays, uncommitted goes.'
      }),

      B.cmp({
        id: 'm3-unlogged', t: 2, src: 'rec', title: 'Tables that skip the log',
        say: 'An **unlogged** table writes no log for its rows. I made one next to a normal table, restarted the server cleanly, and then crashed it.',
        cols: ['Event', 'Normal table (paid)', 'Unlogged table (staging)'],
        hl: 2,
        rows: [
          ['1,000 rows inserted', '1,000', '1,000'],
          ['After a clean restart (fast shutdown)', n(CR.paid_after_clean_restart), n(CR.unlogged_after_clean_restart)],
          ['2,000 rows in all, then a crash and recovery', n(CR.paid_after_crash), n(CR.unlogged_after_crash)]
        ],
        steps: [
          { upto: 2, say: 'After a **clean** restart both tables kept their rows: the pages were written at shutdown.' },
          { upto: 3, say: 'After a **crash** the unlogged table was **empty** (' + CR.unlogged_after_crash + ' rows), because it has no log to replay. The normal table had all ' + n(CR.paid_after_crash) + '. Mission 4 shows what the saving is: a load of 100,000 rows into an unlogged table wrote 34 bytes of log. Use it for **staging tables that you can reload**, and never for anything else. An unlogged table is not copied to a standby either.' }
        ]
      }),

      B.term({
        id: 'm3-level', t: 2, src: 'rec', title: 'How much the log says: wal_level',
        say: 'The log can carry only what recovery and a standby need, or enough to decode every change of every row. I asked a default server for the second.',
        lines: function () {
          return G.term([
            ['SHOW wal_level;', WL.default],
            ['SELECT pg_create_logical_replication_slot(\'s1\', \'test_decoding\');', X('wal.logical_needs_level').split('\n')[1]]
          ]);
        },
        after: 'The default is **`' + WL.default + '`**: enough for crash recovery, a standby and an archive. **Logical decoding**, which change data capture and logical replication use, needs **`logical`**, and the server **refused** to create the slot. Changing `wal_level` needs a **restart**, as mission 1 showed, so a team that plans CDC sets it before the day it is needed. `logical` writes a little more log.',
        afterKind: 'warn',
        doneSay: 'CDC needs wal_level logical, and that needs a restart.'
      }),

      B.cmp({
        id: 'm3-dur', t: 2, src: 'docs', title: 'Durability settings, and what each one risks',
        say: 'Four settings decide how safe a commit is. This screen is from documentation: I did not cut power to the machine.',
        cols: ['Setting', 'Default', 'If you turn it off', 'Use it for'],
        hl: 2,
        rows: [
          ['`fsync`', 'on', 'The server does not wait for the disk at all. After a crash the **database can be corrupt**.', 'Never in production. A throwaway test cluster.'],
          ['`synchronous_commit`', 'on', 'A commit returns before its log is on disk. A crash can lose the **last few commits**, but the database stays consistent.', 'A session that loads data that can be reloaded.'],
          ['`full_page_writes`', 'on', 'No page images. A crash can leave a torn page that recovery cannot fix.', 'Almost never.'],
          ['`wal_level`', 'replica', 'Not a durability setting: it decides what the log contains.', 'logical for CDC.']
        ],
        steps: [
          { upto: 1, say: '`fsync = off` is the one that corrupts. It is sometimes switched off to make tests faster, and it must never reach a real server.' },
          { upto: 3, say: '`synchronous_commit = off` is the **safe** way to trade a few commits for speed, and it can be set for one session or one transaction. The recorded comparison of mission 3: ' + CM.off.wal_syncs + ' flushes instead of ' + n(CM.on.wal_syncs) + '.' },
          { upto: 4, say: 'Do not confuse the last row with the others: it changes what the log says, not how safe a commit is.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 1, src: 'docs', q: 'A loader inserts 20,000 rows and spends most of its time waiting for the disk. Click the line that causes that.',
        file: 'loader.py', lang: 'python', code: AUTO, bad: [3],
        hint: 'What does autocommit do to every statement?',
        why: 'With `autocommit=True` **every INSERT is its own transaction**, so each one waits for a log flush. The recording counted **' + n(CM.on.wal_syncs) + '** flushes for 1,000 inserts and **' + CM.one_transaction.wal_syncs + '** for the same rows in one transaction. Open a transaction (the default in psycopg), insert in batches, and commit once, or use `COPY` (mission 4).',
        fix: 'import psycopg\n\nwith psycopg.connect(DSN) as con:\n    with con.cursor() as cur:\n        cur.executemany("INSERT INTO orders VALUES (%s, %s)", rows)\n',
        cheer: 'One transaction, one flush.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'A commit returns. What has certainly been written to disk?',
        opts: [
          { t: 'The log record of the commit', fb: '' },
          { t: 'The changed data pages', fb: 'They are written later, by a checkpoint or the background writer.' },
          { t: 'Nothing: the data is in memory until the next checkpoint', fb: 'The log record is on disk, and that is what makes the commit safe.' },
          { t: 'The index pages only', fb: 'Indexes are pages too and follow the same rule.' }
        ],
        ok: 0, why: 'The commit waits for the flush of the log. In the recording each of 1,000 commits was one flush, and the data pages were written later.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'The server is killed. A transaction had inserted 500 rows and not committed. What does the table hold after recovery?',
        opts: [
          { t: 'None of the 500 rows', fb: '' },
          { t: 'All 500 rows, because they were written to the log', fb: 'The log holds them, but recovery only keeps what was committed.' },
          { t: 'Half of them', fb: 'A transaction is all or nothing.' },
          { t: 'The table is corrupt and needs a restore', fb: 'Crash recovery is automatic and the table is consistent.' }
        ],
        ok: 0, why: 'The recording: ' + n(CR.committed_before_crash) + ' committed rows survived and **' + CR.uncommitted_rows_after_crash + '** of the ' + CR.uncommitted_before_crash + ' uncommitted rows did.'
      }),

      B.quiz({
        id: 'm3-q3', t: 2,
        q: 'Why did the first update after a checkpoint write ' + Math.round(FIRST / 1000) + ' kB of log for one row?',
        opts: [
          { t: 'The first change to a page after a checkpoint writes a full image of the page', fb: '' },
          { t: 'The row is very wide', fb: 'It is an order of a few dozen bytes.' },
          { t: 'The update waited for the disk and wrote a retry', fb: 'There is no retry. The size comes from the page images.' },
          { t: 'Updates always write 8 kB', fb: 'The next update on the same page wrote ' + SECOND + ' bytes.' }
        ],
        ok: 0, why: 'The recording: ' + n(FIRST) + ' bytes for the first update, with page images, and ' + SECOND + ' for the second.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'You set `synchronous_commit = off` for a load session, and the server crashes. What can you lose?',
        opts: [
          { t: 'The last few commits of that session, and the database stays consistent', fb: '' },
          { t: 'The whole table', fb: 'The database stays consistent, and only the most recent commits can be lost.' },
          { t: 'Nothing, the setting only affects replicas', fb: 'The setting changes when the commit returns on the primary.' },
          { t: 'The database is corrupt', fb: 'That is `fsync = off`.' }
        ],
        ok: 0, why: 'The recording: ' + CM.off.wal_syncs + ' flushes for 1,000 commits. The commits were acknowledged before the flush, so a crash in that window loses them.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'The server was killed at 03:12 and is started again. Put what it does in order.',
        items: [
          'It finds that it was not shut down properly',
          'It reads where the last checkpoint says that recovery must start',
          'It replays the log from that point to the end',
          'It writes a checkpoint of the recovered state',
          'It accepts connections'
        ],
        why: 'The log lines of the recording follow exactly this order: *not properly shut down*, *redo starts*, *redo done*, *checkpoint starting: end-of-recovery*, *ready to accept connections*.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: a nightly staging load that is slow',
        scenario: 'A nightly job loads 50 million rows into a staging table, merges them into `orders`, and truncates the staging table. The load spends its time on the log. The staging data can always be reloaded from the files.',
        opts: [
          { t: 'Load with `COPY` into an **unlogged** staging table, in one transaction, and keep everything else as it is', d: 'The staging load writes almost no log. The merge into `orders` is logged and durable as usual.', lose: 'After a crash the staging table is empty, and the job must start again from the files. It cannot be used on a standby.' },
          { t: 'Switch `fsync` off during the night', d: 'Every flush disappears.', lose: 'A crash at night can corrupt the **whole database**, and not just the staging table.' },
          { t: 'Set `synchronous_commit = off` for the whole server', d: 'Commits return faster.', lose: 'Every application on the server can lose its last commits, for a job that only needs to be fast in one session.' }
        ],
        pick: 0,
        why: 'The risk should be as small as the thing that is risked. A staging table that can be reloaded is exactly what **unlogged** is for. The recording: a load of 100,000 rows into an unlogged table wrote 34 bytes of log (mission 4). `fsync = off` risks everything for a small saving.',
        when: 'If the load is already fast enough, keep the defaults.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the server restarted by itself', time: '03:15',
        alert: '**The operating system killed PostgreSQL at 03:12**, the service restarted, and the log says *database system was not properly shut down; automatic recovery in progress*. The loader had a transaction open. A colleague asks whether any committed orders are lost, and why the staging table is empty.',
        clues: ['The log shows `redo starts at`, `redo done at` and `database system is ready to accept connections`', 'The loader\'s transaction was not committed', 'The staging table is an unlogged table'],
        opts: [
          { t: 'Nothing committed is lost. The uncommitted load is gone and has to be run again, and an unlogged table is emptied by a crash', fb: '' },
          { t: 'Restore last night\'s backup', fb: 'Crash recovery already replayed the log. A restore would throw away the day\'s commits.' },
          { t: 'Run `pg_resetwal` to repair the log', fb: 'That tool is a last resort that can corrupt the database. It is not needed here.' },
          { t: 'Assume that data is lost and reload everything', fb: 'The committed data is intact, and a full reload costs hours for nothing.' }
        ],
        best: 0,
        why: 'The recording of a killed server: **' + n(CR.paid_after_crash) + '** committed rows were there afterwards, the **' + CR.uncommitted_before_crash + '** uncommitted rows were gone, and the unlogged table held **' + CR.unlogged_after_crash + '** rows. The log lines are the proof that recovery ran.',
        checks: [
          ['Read the server log', 'Look for *automatic recovery*, *redo done* and *ready to accept connections*.'],
          ['Count what matters', 'Compare the row counts of the important tables with last night\'s numbers.'],
          ['Re-run the lost work', 'The transaction that was open has to start again. Make it idempotent (mission 4).'],
          ['Find out why it was killed', 'An out-of-memory kill points at `work_mem` times connections, or at another process.']
        ],
        tell: 'The server was killed and recovered by itself. I read the log to confirm the recovery, checked the counts of the main tables, and re-ran the load that had not committed. Nothing that was committed was lost. The staging table is unlogged by design, so it was empty and the load refilled it. I am looking at why the system killed the process.',
        prevent: ['Make loads **idempotent**, so that a re-run is safe', 'Keep **unlogged** tables for data that can be rebuilt', 'Watch the **memory** of the machine, and `work_mem` times the number of connections']
      }),

      B.qa({
        id: 'qa-wal', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'What is the write-ahead log, and why does PostgreSQL have it?',
        pts: ['Every change is written to the log before the data files', 'A commit waits for the log to reach the disk', 'The data pages are written later by checkpoints', 'Recovery, replicas and backups all use it'],
        short: 'It is an append-only log of every change, and the rule is that **the log reaches the disk before the change counts**. A commit waits until its record is flushed, and the changed data pages are written later, in batches, by a checkpoint. That is faster than writing scattered pages at every commit, and it is safe, because after a crash the server replays the log from the last checkpoint and gets every committed change back. The same log feeds a **standby**, which replays it, a **base backup with archive** for point-in-time recovery, and **logical decoding** for change data capture. In my recording one single-row update wrote 18 KB of log when it was the first change to a page after a checkpoint, and the next one on the same page wrote 162 bytes.',
        fu: [['Where is it?', 'In `pg_wal`, in 16 MB segments.'], ['What is an LSN?', 'The position of a byte in the log. Differences of LSNs are byte counts.']],
        trap: 'Saying that the log is only for replication.',
        real: 'Say how you watch the log volume on your server.'
      }),

      B.qa({
        id: 'qa-checkpoint', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'What is a checkpoint, and what do you watch?',
        pts: ['Writes all dirty pages and marks a recovery start point', 'Triggered by checkpoint_timeout or max_wal_size', 'Timed ones are normal, requested ones mean the log fills up', 'Checkpoints too close together mean more full page images'],
        short: 'A checkpoint writes every dirty page to the data files and records a point from which crash recovery can start, so the older log can be recycled. It runs when `checkpoint_timeout` has passed (5 minutes by default), when the log has grown by `max_wal_size` (1 GB), or when asked. I watch `pg_stat_bgwriter`: timed checkpoints are healthy, and many **requested** ones mean the log fills `max_wal_size` before the timeout, so I raise it. The reason to avoid too many is the full page image: the first change to a page after a checkpoint writes the whole page, and in my recording that made a one-row update 18 KB of log against 162 bytes for the next one. A longer timeout makes recovery after a crash take longer, which is the trade.',
        fu: [['Does a checkpoint lock tables?', 'No. It spreads its writes over `checkpoint_completion_target` of the interval.'], ['Can you force one?', '`CHECKPOINT`. It is counted as requested.']],
        trap: 'Believing that a checkpoint is a backup.',
        real: 'Say what max_wal_size is on your servers and why.'
      }),

      B.qa({
        id: 'qa-crash', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'What happens when PostgreSQL crashes?',
        pts: ['The next start runs automatic recovery', 'It replays the log from the last checkpoint', 'Committed transactions survive, uncommitted ones vanish', 'Unlogged tables are emptied'],
        short: 'The next start notices that the server was not shut down cleanly and runs **crash recovery** by itself: it reads where the last checkpoint says to begin, **replays the log** to the end, writes a checkpoint, and opens for connections. Everything that was committed is there, because the commit waited for its log record. Everything that was not committed is gone, because the server ignores changes of transactions that did not commit. I killed a server with signal 9 with 2,000 committed rows and 500 uncommitted ones: after the restart there were 2,000 and 0, and the log said *automatic recovery in progress*. **Unlogged tables** are truncated, because they have no log. A kill is not a power cut: for the machine itself, durability relies on `fsync`, which I did not test.',
        fu: [['How long does it take?', 'It depends on the log since the last checkpoint. A longer checkpoint timeout means a longer recovery.'], ['Do you need a backup for this?', 'No. A backup is for losing the disk or an operator mistake.']],
        trap: 'Saying that the data files are always consistent after a crash without recovery.',
        real: 'Describe a crash you handled, and what you checked afterwards.'
      }),

      B.qa({
        id: 'qa-synccommit', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What does synchronous_commit do, and when would you change it?',
        pts: ['On: a commit returns after its log is flushed to disk', 'Off: it returns at once and the WAL writer flushes soon after', 'A crash can lose the last commits but cannot corrupt', 'Can be set for one session or transaction'],
        short: 'With `on`, the default, a commit returns only after its log record has been flushed to disk, so a committed transaction survives a crash. With `off` it returns at once, and the WAL writer flushes within a fraction of a second. In my recording 1,000 separate commits were 1,000 flushes with `on` and 3 with `off`. The price of `off` is that a crash can lose the **last few commits**, but it can never corrupt the database, unlike `fsync = off`. I only change it for one session that loads data that can be reloaded, never for the server. The safe way to get most of the saving is to put many rows in one transaction: the same 1,000 rows in one transaction were one flush. With synchronous replication the setting also decides whether a commit waits for a standby.',
        fu: [['Is it global?', 'It can be set globally, for a role, a session or a single transaction.'], ['Is it the same as fsync?', 'No. fsync off risks corruption.']],
        trap: 'Switching fsync off instead.',
        real: 'Say where you accepted losing recent commits, and why.'
      }),

      B.qa({
        id: 'qa-fpi', t: 3, tag: 'PostgreSQL', secs: 60,
        q: 'What are full page writes, and what do they cost?',
        pts: ['The first change to a page after a checkpoint logs the whole page', 'It protects against torn pages after a crash', 'A page image is up to 8 kB', 'More checkpoints mean more images'],
        short: 'After a crash a page may be half written on disk. To be able to repair it, PostgreSQL writes a **complete image of a page into the log** the first time that page changes after a checkpoint, with `full_page_writes` on, which is the default. In my recording the first update after a checkpoint wrote about 18.7 KB of log for one row, three records with page images between 2.9 and 8.1 KB, and the second update on the same page wrote 162 bytes. So the cost is concentrated right after each checkpoint, and bulk updates and checkpoints close together make it larger. I lengthen `checkpoint_timeout` and raise `max_wal_size` to reduce it, and `wal_compression` can compress the images, at some CPU cost, which I did not measure.',
        fu: [['What is a torn page?', 'A page that was written only in part when the machine stopped.'], ['Can you switch it off?', 'On a file system that guarantees atomic page writes. From documentation. Not by default.']],
        trap: 'Switching full_page_writes off to save space.',
        real: 'Say how you noticed a spike in log volume after a checkpoint.'
      }),

      B.qa({
        id: 'qa-unlogged', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'When would you use an unlogged table?',
        pts: ['Rows are not written to the log', 'Much faster to load', 'Truncated after a crash and not copied to a standby', 'For staging data that can be rebuilt'],
        short: 'For data that I can rebuild: a staging table that a load fills and a merge empties. An unlogged table writes **no log** for its rows, so a load is much cheaper: in my recording `COPY` of 100,000 rows into one wrote 34 bytes of log, against 12.3 MB for a logged table with a primary key. The price is that the table is **emptied after a crash** (1,000 rows before, 0 after, while the logged table kept all 2,000), that it is **not replicated** to a standby, and that it is not in a point-in-time recovery. After a clean restart the rows are kept. So I never put anything in it that is the only copy, and my loads are idempotent, so that starting again from the files is always possible.',
        fu: [['Can you turn it into a normal table?', '`ALTER TABLE ... SET LOGGED`, which rewrites it and writes it to the log.'], ['Is a temporary table the same?', 'No. A temporary table belongs to one session and disappears with it.']],
        trap: 'Putting a source of truth in an unlogged table.',
        real: 'Say which of your tables could be unlogged.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Log Reader', color: '#FDE68A',
        pts: [
          'The **log reaches the disk first**; a commit waits for it. The pages follow at a **checkpoint**. Segments are ' + n(SG.segment_bytes) + ' bytes.',
          'The first change to a page after a checkpoint writes the whole page: **' + n(FIRST) + '** bytes against **' + SECOND + '**.',
          '**' + n(CM.on.wal_syncs) + '** flushes for 1,000 commits, **' + CM.one_transaction.wal_syncs + '** in one transaction, ' + CM.off.wal_syncs + ' with `synchronous_commit = off`.',
          'After a crash, recovery replays the log: **' + n(CR.paid_after_crash) + '** committed rows stayed, **' + CR.uncommitted_rows_after_crash + '** uncommitted ones did.',
          '**Unlogged** tables are emptied by a crash. **CDC** needs `wal_level = logical`, which needs a restart.'
        ],
        lines: [
          'I can explain why a commit is safe.',
          'I group rows into transactions.',
          'I use unlogged tables only for data I can rebuild.'
        ]
      })
    ]
  });
})();
