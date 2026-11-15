/* Mission 2: row versions, vacuum and bloat. Every number is from the recording of a real server with autovacuum switched off, except where a screen says otherwise. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var VE = C('mvcc.versions'), BL = C('mvcc.bloat'), HD = C('mvcc.held'), HT = C('mvcc.hot'), AV = C('mvcc.autovacuum');
  var BR = G.table('mvcc.bloat').rows, HR = G.table('mvcc.hot').rows, AR = G.table('mvcc.autovacuum').rows, PR = G.table('mvcc.page').rows;
  var mbOf = function (b) { return (b / 1048576).toFixed(1) + ' MB'; };
  G.expect(VE.ctid_before === '(0,1)' && VE.ctid_after === '(0,4)' && VE.other_rows_same_ctid === true && VE.versions_on_page_after_update === 4 && VE.old_version_xmax_is_update_xid === true, 'an update writes a new version at a new position and ends the old one');
  G.expect(BL.vacuum_shrinks === false && BL.vacuum_full_shrinks === true && BL.ratio_after_3 === 4 && BL.size_after_vacuum_full === BL.size_start, 'vacuum does not shrink the file and vacuum full does');
  G.expect(HD.removed_while_held === 0 && HD.not_yet_removable_while_held === 10000 && HD.removed_after_commit === 10000, 'an open snapshot keeps dead rows from being removed');
  G.expect(HT.indexed_pct === 0 && HT.quarter_fillfactor_pct === 100 && HT.quarter_full_pct === 0, 'HOT updates need room on the page');
  G.expect(AV.threshold === 2050 && AV.ran_below_threshold === false && AV.ran_above_threshold === true && AV.insert_vacuum_runs === 1, 'autovacuum waits for the threshold');
  var PAGE = PR.map(function (r) { return [r[0], r[1], r[2], r[3] === '' || r[3] === null ? '-' : String(r[3]), String(r[4]), r[5] || '-']; });
  var NIGHTLY = '-- 02:00 nightly maintenance\nVACUUM FULL orders;\nANALYZE orders;\n';

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Row versions, vacuum and bloat', short: 'Row versions', blurb: 'what an update really writes, what vacuum frees, and why a table grows', minutes: 19,
    focus: ['stg', 'mon'],
    goals: [
      'Say what an **UPDATE** writes, and why the old row is still there.',
      'Say what `VACUUM` does and does not do to the **size of the file**.',
      'Find what **holds vacuum back**, and say when autovacuum starts.',
      'Know when an update can be **HOT**, and why a load that rewrites unchanged rows hurts.'
    ],
    say: 'PostgreSQL never changes a row in place. An update writes a new version of the row, and a delete only marks the old one as ended. That one design choice gives readers a consistent view without locks, and it is the reason for dead rows, for vacuum and for tables that grow. We look at a real page, then at four numbers that every data engineer should be able to read.',
    scenes: [
      B.term({
        id: 'm2-versions', t: 1, src: 'rec', title: 'An update writes a new row',
        say: 'Three rows in a small table. I read the hidden columns `ctid`, the position of a row version, and `xmin`, the transaction that created it. Then I updated one row.',
        lines: function () {
          return G.term([
            ['SELECT ctid, xmin, xmax, id, balance FROM acct WHERE id = 1;', VE.ctid_before + ' | X + ' + VE.xmin_before + ' | 0 | 1 | 100'],
            ['UPDATE acct SET balance = balance + 50 WHERE id = 1;', 'UPDATE 1'],
            ['SELECT ctid, xmin, xmax, id, balance FROM acct WHERE id = 1;', VE.ctid_after + ' | X + ' + VE.xmin_after + ' | 0 | 1 | 150'],
            ['SELECT count(*) FROM heap_page_items(get_raw_page(\'acct\', 0));   -- pageinspect', String(VE.versions_on_page_after_update)]
          ]);
        },
        after: 'The row moved from position **' + VE.ctid_before + '** to **' + VE.ctid_after + '**, and the transaction that created it changed (`xmin` went from X to X + ' + VE.xmin_after + '): this is a **new row version**. The page now holds **' + VE.versions_on_page_after_update + '** row versions for **3** visible rows. The old version is still there, ended by the updating transaction. The other two rows kept their positions (' + VE.other_rows_same_ctid + '). A delete does the same without the new version: it only records who ended the row.',
        afterKind: 'tip',
        doneSay: 'An update is an insert of a new version and an end of the old one.'
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'docs', title: 'Row versions and who sees which', g: 'mvcc', legend: true,
        steps: [
          { say: 'Reader A started a query before an update. Reader B will start after it. They look at the same row. Press Next.', focus: ['a', 'b', 'v1', 'v2'], cap: 'Two readers, one row.' },
          { say: 'Step 1. The update writes a **new version** next to the old one, and records that the old one was ended by this transaction. Nothing is overwritten.', on: ['e1'], focus: ['v1', 'v2'], cap: 'An update writes a new version.' },
          { say: 'Step 2. Reader A, whose snapshot is older than the update, still reads the **old version**. It is not blocked and it does not see half a change.', on: ['e2'], focus: ['a', 'v1'], tags: ['tg_old'], cap: 'A sees the old version.' },
          { say: 'Step 3. Reader B, whose snapshot is newer, reads the **new version**. Readers never wait for writers. This is **multi-version concurrency control**.', on: ['e3'], focus: ['b', 'v2'], cap: 'B sees the new version.' },
          { say: 'Step 4. When no snapshot can see the old version any more, it is **dead**. `VACUUM` finds such versions and removes them.', on: ['e4'], focus: ['vac', 'v1'], tags: ['tg_dead'], cap: 'VACUUM removes dead versions.' },
          { say: 'Step 5. The space is not given back to the operating system. It becomes **free space inside the file**, and new row versions use it. An **open snapshot** keeps old versions alive, and that is what makes a table grow.', on: ['e5'], focus: ['vac', 'free'], tags: ['tg_hold'], cap: 'The space is reused, not returned.' }
        ]
      }),

      B.cmp({
        id: 'm2-page', t: 3, src: 'rec', title: 'Line pointers of one page, step by step',
        say: 'This is the first page of the small table, read with pageinspect after each step. Press Next to follow the version of row 1.',
        cols: ['Step', 'Line pointer', 'State', 'xmin (X + )', 'xmax (X + )', 'ctid'],
        hl: 2,
        rows: PAGE,
        steps: [
          { upto: 3, say: 'Three rows, three line pointers. `xmax` is 0: nobody ended them.' },
          { upto: 7, say: 'After the update, row 1 has **two** versions: line pointer 1 with `xmax` set and a `ctid` that points to 4, and line pointer 4, the new version.' },
          { upto: 12, say: 'An insert that was **rolled back** left a version too (line pointer 5, created by a transaction that never committed). Nobody can see it. It is dead on arrival.' },
          { upto: 16, say: 'After `VACUUM`, the dead version at 5 is gone, and line pointer 1 became a **redirect** to 4. The state column says `redirect` and `normal`.' }
        ]
      }),

      B.widget({ id: 'm2-lab', kind: 'bloat', t: 1, src: 'rec', title: 'Lab: a table that is updated again and again' }),

      B.term({
        id: 'm2-held', t: 1, src: 'rec', title: 'What holds vacuum back',
        say: 'Session A opened a transaction at the repeatable read level and ran one query, so it holds a snapshot. Then I updated 10,000 rows and ran `VACUUM VERBOSE` from another session. Then A committed and I ran it again.',
        lines: function () {
          return G.term([['VACUUM (VERBOSE) held;', X('mvcc.vacuum_held')]]);
        },
        after: 'While A held its snapshot, vacuum **removed ' + HD.removed_while_held + '** rows and reported **' + n(HD.not_yet_removable_while_held) + ' dead but not yet removable**: the old versions might still be needed by A. After A committed, the same command removed **' + n(HD.removed_after_commit) + '**. A transaction that stays open, an idle in transaction session, an abandoned prepared transaction, or a standby with `hot_standby_feedback` (mission 7) each **keeps the horizon back** for the whole database, not for one table.',
        afterKind: 'warn',
        doneSay: 'One old transaction keeps dead rows alive in every table.'
      }),

      B.cmp({
        id: 'm2-hot', t: 2, src: 'rec', title: 'When an update can be HOT',
        say: 'A **heap-only tuple** update writes the new version on the **same page** and needs no new index entries. It is much cheaper. I updated 20,000 rows, and 5,000 rows, in five tables and counted the HOT updates.',
        cols: ['Case', 'Rows updated', 'HOT updates', 'HOT %', 'Table bytes'],
        hl: 3,
        rows: HR.map(function (r) { return [r[0], n(r[1]), n(r[2]), r[3] + ' %', n(r[4])]; }),
        steps: [
          { upto: 2, say: 'Updating a column that has an **index** is never HOT: the index needs a new entry that points to the new version. A column without an index could be HOT, but the pages were full (fillfactor 100), so there was **no room** for a second version: ' + HT.full_page_pct + ' %.' },
          { upto: 4, say: 'With **fillfactor 70**, each page keeps 30 % free. Updating every row used up that room after about 45 % of the rows. A quarter of the rows with fillfactor 100 got ' + HT.quarter_full_pct + ' %.' },
          { upto: 5, say: 'A quarter of the rows with fillfactor 70: **' + HT.quarter_fillfactor_pct + ' %** HOT. A table that is updated in place all day benefits from free room on its pages, and from fewer indexes on the columns it updates.' }
        ]
      }),

      B.cmp({
        id: 'm2-av', t: 1, src: 'rec', title: 'When autovacuum starts',
        say: 'Autovacuum starts on a table when its dead rows pass **50 + 20 % of its rows**. For my table of 10,000 rows that is ' + n(AV.threshold) + '. I switched autovacuum on with a one second nap and updated the table in two steps.',
        cols: ['Step', 'Dead rows made so far', 'Dead rows counted now', 'Autovacuum runs'],
        hl: 3,
        rows: AR.map(function (r) { return [r[0], n(r[1]), n(r[2]), String(r[3])]; }),
        steps: [
          { upto: 1, say: 'The table had **' + AV.insert_vacuum_runs + ' run** before any update: a table that only receives inserts is also vacuumed after a number of inserts, to set the visibility map.' },
          { upto: 2, say: '1,500 dead rows are below the threshold of ' + n(AV.threshold) + '. I waited four seconds. **No new run**, and the counter showed the ' + n(AR[1][2]) + ' dead rows.' },
          { upto: 3, say: '2,500 are above it. A second run started within seconds and the dead rows went to **' + AV.dead_after_run + '**. The formula is `autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor * rows`. On a table of 100 million rows the scale factor of 20 % waits for **20 million** dead rows, which is why big tables get their own setting.' }
        ]
      }),

      B.cmp({
        id: 'm2-wrap', t: 3, src: 'docs', title: 'Transaction ids run out, and freezing',
        say: 'One more thing that vacuum does. This screen is from documentation: I did not run a wraparound.',
        cols: ['Question', 'Answer', 'What to do'],
        hl: 1,
        rows: [
          ['How are transactions numbered?', 'With a 32-bit counter. Ids are compared in a circle, so about two billion are "in the past" and two billion "in the future".', 'Nothing, until a table has not been vacuumed for a very long time.'],
          ['What happens to an old row?', 'A row whose creator is far in the past must be **frozen**, or its id would soon look like the future and the row would disappear.', 'Vacuum freezes old rows. It is automatic.'],
          ['When does autovacuum force it?', 'When a table is older than `autovacuum_freeze_max_age`, 200,000,000 by default (recorded in the settings table of mission 1), even if autovacuum is switched off.', 'Watch `age(datfrozenxid)` for each database, and alert early.'],
          ['What if it fails?', 'Near the limit the server warns, and at the end it **stops accepting writes** until a vacuum has finished.', 'A long open transaction or an unused replication slot is the usual cause. Mission 7 shows a slot.']
        ],
        steps: [
          { upto: 2, say: 'A transaction number is small and it wraps around, so old rows need to be marked as frozen. Vacuum does it as part of its normal work.' },
          { upto: 4, say: 'The cure is not a setting. It is a vacuum that can finish, which needs the horizon to move: no old transactions and no abandoned slots.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 1, src: 'docs', q: 'The orders table is 30 GB for 8 GB of data, and an engineer adds this script to run every night. Click the line that is the problem.',
        file: 'nightly_maintenance.sql', lang: 'sql', code: NIGHTLY, bad: [2],
        hint: 'Which of these takes a lock that stops every query on the table while it runs?',
        why: '`VACUUM FULL` **rewrites the whole table** into a new file and holds an **exclusive lock** for the whole time, so every query on the table waits. The lab of this mission shows it shrinking the file, and also what it costs. Plain `VACUUM` runs beside normal traffic, and autovacuum already does it. If a table really has to shrink, do it once, in a window, with `pg_repack` or a copy and swap (from documentation), and fix what made it grow.',
        fix: '-- 02:00 nightly maintenance\nVACUUM (ANALYZE) orders;\n',
        cheer: 'Routine work should not need an exclusive lock.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'An order row is updated once. What does the table hold afterwards?',
        opts: [
          { t: 'Two versions of the row, until vacuum removes the old one', fb: '' },
          { t: 'One row, changed in place', fb: 'PostgreSQL never changes a row version in place.' },
          { t: 'One row and a copy of the old values in the WAL only', fb: 'The log records the change, but the old version also stays in the table until it is vacuumed.' },
          { t: 'Two rows that both show up in queries', fb: 'A query sees one version of each row, the one that its snapshot may see.' }
        ],
        ok: 0, why: 'The page held **' + VE.versions_on_page_after_update + '** versions for 3 visible rows after one update.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'A table is 29 MB and holds 7 MB of live rows. You run `VACUUM`. What is its size afterwards?',
        opts: [
          { t: 'The same 29 MB, with the space free for new rows', fb: '' },
          { t: 'About 7 MB, the size of the live data', fb: 'That is what `VACUUM FULL` does. Plain VACUUM does not give space back to the file system.' },
          { t: 'Zero, the table is emptied', fb: 'VACUUM never removes live rows.' },
          { t: 'It depends on the autovacuum settings', fb: 'The result of a manual VACUUM does not depend on them.' }
        ],
        ok: 0, why: 'The recording: ' + mbOf(BL.size_after_3) + ' before and ' + mbOf(BL.size_after_vacuum) + ' after `VACUUM`, with ' + BR[4][6] + ' % free space. `VACUUM FULL` brought it to ' + mbOf(BL.size_after_vacuum_full) + '.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: '`VACUUM` reports 10,000 dead rows that are "not yet removable". What is the most likely cause?',
        opts: [
          { t: 'A transaction that started before the rows died is still open', fb: '' },
          { t: 'The table has no primary key', fb: 'A key does not decide what vacuum can remove.' },
          { t: 'The disk is full', fb: 'A full disk gives other errors.' },
          { t: 'Autovacuum is switched off', fb: 'The command was run by hand, and it still could not remove them.' }
        ],
        ok: 0, why: 'The recording: while one session held a snapshot, **' + n(HD.not_yet_removable_while_held) + '** dead rows were not removable, and after it committed **' + n(HD.removed_after_commit) + '** were removed.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'Why was an update of an indexed column never a HOT update?',
        opts: [
          { t: 'The index needs a new entry that points to the new version', fb: '' },
          { t: 'Indexed columns are stored on a different page', fb: 'The table and the index are separate files, and that is not the reason.' },
          { t: 'HOT only works with fillfactor 70', fb: 'It also needs room on the page, but an indexed column is excluded whatever the fillfactor is.' },
          { t: 'A HOT update needs autovacuum to be on', fb: 'Autovacuum is not involved in deciding whether an update is HOT.' }
        ],
        ok: 0, why: 'The recording: ' + HR[0][3] + ' % HOT for the indexed column, and ' + HT.quarter_fillfactor_pct + ' % for an unindexed column with room on the page.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'A table is four times the size of its data and growing. Put the steps in order.',
        items: [
          'Measure it: dead rows and free space, with `pgstattuple` or `pg_stat_user_tables`',
          'Look for what holds the horizon: old transactions, idle in transaction sessions, slots, standby feedback',
          'Run a plain `VACUUM` so that the space can be reused',
          'Fix the cause: the job that updates every row, or the session that never ends',
          'Only if the disk is the problem, shrink the file in a window (`pg_repack`, or a copy and swap)'
        ],
        why: 'Vacuum cannot do its work while the horizon is held back, so look for that before you run anything. `VACUUM FULL` is the last step because it takes an exclusive lock.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: a table of 40 GB that holds 10 GB',
        scenario: 'The events table was updated heavily last quarter and is now 40 GB for 10 GB of live rows. It has stopped growing. The disk has 300 GB free. Queries on it are fine. The finance team asks if the table can be made smaller.',
        opts: [
          { t: 'Leave it. The free space inside the file is reused, and the table has stopped growing', d: 'No lock, no risk, no work. New rows fill the free pages.', lose: 'The file keeps its size, and a backup copies the free pages too.' },
          { t: 'Run `VACUUM FULL events` tonight', d: 'The file becomes 10 GB.', lose: 'An exclusive lock for the whole rewrite, so every query on the table waits for hours, and the rewrite needs 10 GB of extra disk.' },
          { t: 'Use `pg_repack` in a quiet period, if the extension is installed', d: 'Rebuilds the table beside the live one and swaps it at the end, with only a short lock.', lose: 'An extension to install and to trust, and it needs room for a full copy.' }
        ],
        pick: 0,
        why: 'The disk is not the problem and the table is stable. The recorded lab shows that the free space is **reused**, so the size will not grow again until the data does. Shrinking has costs and risks that this table does not justify. If the disk were short, the third option is the usual way. `pg_repack` did not run in this course.',
        when: 'If the table were growing, or the disk were nearly full, the answer changes: find what makes it bloat first.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: the table is four times its data', time: '09:20',
        alert: '**The `ledger` table has grown from 7 MB to 29 MB in an afternoon**, and the disk alarm is close. The row count did not change. The loader runs `UPDATE ledger SET amount = amount + 1` for every row every hour.',
        clues: ['`pgstattuple` shows about 100,000 dead rows and half of the file as free space', 'Autovacuum is off on this table, set by an engineer months ago', '`VACUUM` has not run since the morning'],
        opts: [
          { t: 'Switch autovacuum back on, run a plain `VACUUM` now, and change the loader so that it only updates rows that changed', fb: '' },
          { t: 'Run `VACUUM FULL` during working hours', fb: 'It would stop every query on the table for the duration of the rewrite.' },
          { t: 'Drop the table and reload it every hour', fb: 'It loses the history and breaks everything that reads from it.' },
          { t: 'Add disk', fb: 'The table will grow again at the same rate.' }
        ],
        best: 0,
        why: 'The recording of this table: after three updates of every row it was **' + mbOf(BL.size_after_3) + '**, four times its start (' + BL.ratio_after_3 + '), and **`VACUUM` did not shrink it** (' + mbOf(BL.size_after_vacuum) + ') but made the space reusable: one more update of every row left it at ' + mbOf(BR[5][1]) + '. The cure is to stop writing rows that did not change, and to let vacuum run.',
        checks: [
          ['Measure', '`SELECT * FROM pgstattuple(\'ledger\')` shows dead rows and free space.'],
          ['Vacuum now', 'A plain `VACUUM` runs beside the traffic and makes the space reusable.'],
          ['Turn autovacuum back on', 'Autovacuum off on a busy table is almost always a mistake.'],
          ['Stop the churn', 'Update only the rows that changed, as mission 4 does.']
        ],
        tell: 'The loader rewrote every row each hour, and autovacuum was off, so dead rows filled the file. I switched autovacuum on and vacuumed once, and the space became reusable at once. The loader now updates only rows that changed. The file keeps its size, but it will not grow, and a shrink was not needed.',
        prevent: ['Never switch **autovacuum off** on a table that is written', 'Alert on **dead rows** and on the **age of the oldest transaction**', 'Write **only what changed**']
      }),

      B.qa({
        id: 'qa-mvcc', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'How does PostgreSQL handle concurrent reads and writes?',
        pts: ['Multi-version concurrency control', 'An update writes a new row version, a delete ends one', 'A query sees the versions its snapshot may see', 'Readers do not block writers'],
        short: 'With multi-version concurrency control. PostgreSQL does not change a row in place. An **update writes a new version** of the row and records that the old version was ended by the updating transaction, and a delete only records the ending. Each query takes a **snapshot** and sees the versions that were committed before it. So readers never wait for writers and writers never wait for readers, and a reader sees a consistent state. The price is the old versions: they stay in the table until no snapshot can see them, and then vacuum removes them. I looked at a page: one update of one row left four versions for three visible rows, and the row had moved to a new position. This is why a table that is updated a lot needs vacuum.',
        fu: [['What is a snapshot?', 'The list of transactions that were committed when the query or transaction began.'], ['What does a rollback do?', 'Nothing to the page: the versions stay and are ignored, and vacuum removes them.']],
        trap: 'Saying that PostgreSQL uses read locks for SELECT.',
        real: 'Describe a table that you update a lot, and how you watch its size.'
      }),

      B.qa({
        id: 'qa-vacuum', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'What does VACUUM do, and does it make the table smaller?',
        pts: ['Removes dead row versions and makes their space reusable', 'Updates the free space map and the visibility map', 'Does not return space to the operating system', 'VACUUM FULL rewrites the table and needs an exclusive lock'],
        short: 'It finds row versions that no snapshot can see any more, removes them, and records the space as **free inside the file**. It also updates the free space map, the visibility map that lets index-only scans skip the table, and freezes old rows. A plain `VACUUM` runs beside normal traffic and normally does **not** make the file smaller: in my recording a table of 29 MB with 75 % free space after vacuum was still 29 MB, and the next update of every row did not grow it, because the new versions went into the freed space. Only `VACUUM FULL` rewrites the table to the size of its live rows (7 MB), and it holds an exclusive lock, so it is for a window, or replaced by `pg_repack`.',
        fu: [['What is autovacuum?', 'A background process that runs vacuum and analyze on tables when enough rows have changed.'], ['Does it lock the table?', 'A plain VACUUM takes a light lock that allows reads and writes.']],
        trap: 'Saying that VACUUM returns the space to the disk.',
        real: 'Say how vacuum is monitored on your servers.'
      }),

      B.qa({
        id: 'qa-bloat', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'A table keeps growing although the number of rows does not. Why, and what do you do?',
        pts: ['Updates and deletes leave dead versions', 'Vacuum cannot remove them while an old snapshot exists', 'Look for old transactions, idle in transaction, slots', 'Stop rewriting unchanged rows, then vacuum'],
        short: 'Because every update writes a new row version, and the old ones stay until vacuum removes them. If vacuum cannot keep up, or cannot remove them, the file grows. I check the dead rows and the free space with `pgstattuple`, then I look for what holds the **horizon** back: an old or idle-in-transaction session, an abandoned prepared transaction, a replication slot or a standby with feedback. In my recording one open snapshot made vacuum report 10,000 dead rows as not yet removable, and they were removed as soon as it committed. Then I fix the cause: stop updating rows that did not change (a load that rewrites unchanged rows made a table twice as big in one night), make sure autovacuum is on, and tune it for that table. Shrinking the file comes last.',
        fu: [['How do you find the oldest transaction?', '`pg_stat_activity` ordered by `xact_start`, and `backend_xmin`.'], ['What about indexes?', 'They bloat too, and `REINDEX CONCURRENTLY` rebuilds them without a long lock.']],
        trap: 'Starting with VACUUM FULL.',
        real: 'Describe the largest bloat that you have seen and its cause.'
      }),

      B.qa({
        id: 'qa-autovacuum', t: 2, tag: 'PostgreSQL', secs: 75,
        q: 'When does autovacuum run, and how do you tune it for a big table?',
        pts: ['When dead rows pass threshold + scale factor * rows', 'Defaults: 50 and 0.2', 'A big table waits for millions of dead rows', 'Set the scale factor and cost limits for that table'],
        short: 'A table is vacuumed when its dead rows pass `autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor * rows`, which is 50 + 20 % by default, checked every `autovacuum_naptime`. I recorded it: on a table of 10,000 rows the limit was 2,050, and after 1,500 updates there was no run, while after 2,500 a run started within seconds. A table that only gets inserts is vacuumed too, after enough inserts, to set the visibility map. On a table of 100 million rows the default waits for 20 million dead rows, so I lower the scale factor for that table with `ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.01)`, and raise the cost limit so that the workers do not sleep too much. Autovacuum is never the thing to switch off.',
        fu: [['How many workers?', '`autovacuum_max_workers`, 3 by default. From documentation.'], ['What about analyze?', 'It has its own threshold and keeps the statistics fresh.']],
        trap: 'Switching autovacuum off to save I/O.',
        real: 'Name a table where you changed autovacuum settings.'
      }),

      B.qa({
        id: 'qa-hot', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What is a HOT update?',
        pts: ['Heap-only tuple: the new version is on the same page', 'No index entry is needed', 'Only when no indexed column changes and the page has room', 'Fillfactor leaves room'],
        short: 'A heap-only tuple update writes the new row version on the **same page** as the old one and does not touch any index, because no indexed column changed. It is much cheaper than a normal update, and the old version can be cleaned up quickly when the page is next read. It needs two things: no indexed column in the update, and **room on the page**. In my recording updating an indexed column was never HOT, a table with full pages got no HOT updates at all, and with fillfactor 70 a quarter of the rows were updated 100 % HOT. So for a table that is updated all day I keep few indexes on the updated columns and set a lower fillfactor, such as 70 or 80, at the cost of a bigger table.',
        fu: [['How do you see it?', '`n_tup_hot_upd` in `pg_stat_user_tables`.'], ['Does fillfactor apply to existing pages?', 'Only to pages written after the change, or after a rewrite.']],
        trap: 'Saying that every update is cheap.',
        real: 'Name a table that you gave a lower fillfactor.'
      }),

      B.qa({
        id: 'qa-horizon', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'Vacuum runs but the dead rows stay. What holds it back?',
        pts: ['The xmin horizon: the oldest snapshot still in use', 'Long transactions and idle in transaction sessions', 'Prepared transactions and replication slots', 'A standby with hot_standby_feedback'],
        short: 'The horizon: vacuum can only remove a row version that **no snapshot can see**, so the oldest snapshot in the whole server decides. The candidates are an old running query, a session that is idle in transaction, a forgotten prepared transaction, a replication slot that nobody reads, and a standby that has `hot_standby_feedback` on and a long query. I look at `pg_stat_activity` for the oldest `xact_start` and `backend_xmin`, at `pg_prepared_xacts` and at `pg_replication_slots`. In my recording a single session with a snapshot made vacuum report 10,000 dead rows as not yet removable. It does not matter which table the old session touched: the horizon is global. The fix is to end the old transaction, and to set `idle_in_transaction_session_timeout` so that it cannot happen again.',
        fu: [['Is it per table?', 'No. It is per database, or for the whole server for some objects.'], ['What does the timeout do?', 'It ends a session that has been idle in a transaction for longer than the limit.']],
        trap: 'Looking only at the table that is bloated.',
        real: 'Describe an old transaction that you found and ended.'
      }),

      B.qa({
        id: 'qa-wrap', t: 3, tag: 'PostgreSQL', secs: 60,
        q: 'What is transaction id wraparound?',
        pts: ['Transaction ids are 32 bits and are compared in a circle', 'Old rows must be frozen before their id looks like the future', 'Autovacuum forces freezing at autovacuum_freeze_max_age', 'Near the limit the server refuses writes'],
        short: 'Transaction ids are 32-bit numbers compared in a circle, so only about two billion ids are "in the past". A row that was created long ago must be **frozen** by vacuum before its id would start to look like it is in the future, or it would seem to vanish. Autovacuum forces this when a table is older than `autovacuum_freeze_max_age`, which is 200 million by default, even if autovacuum is switched off. If vacuum cannot finish, the server warns and then stops accepting writes until it has. The usual causes are a long open transaction or a replication slot that holds the horizon, so I monitor `age(datfrozenxid)` for each database and alert long before the limit. This answer is from documentation: I did not run a wraparound.',
        fu: [['What is frozen?', 'A row marked as visible to everybody, whatever its transaction id.'], ['Does the 64-bit xid exist?', 'Not in PostgreSQL 16. From documentation.']],
        trap: 'Believing that autovacuum off means that no vacuum ever runs.',
        real: 'Say what you alert on for transaction age.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Vacuum Keeper', color: '#C7D2FE',
        pts: [
          'An **update writes a new version**: one update left **' + VE.versions_on_page_after_update + '** versions for 3 visible rows. A delete only ends a version.',
          '`VACUUM` frees dead versions inside the file. It did **not** shrink ' + mbOf(BL.size_after_3) + ' (' + mbOf(BL.size_after_vacuum) + ' after). `VACUUM FULL` did (' + mbOf(BL.size_after_vacuum_full) + '), with an exclusive lock.',
          'An **open snapshot** kept ' + n(HD.not_yet_removable_while_held) + ' dead rows alive. Look for old transactions, slots and standby feedback.',
          'Autovacuum waits for **50 + 20 % of the rows**: ' + n(AV.threshold) + ' for 10,000 rows.',
          'An update is **HOT** with room on the page and no indexed column: ' + HT.quarter_fillfactor_pct + ' % against ' + HT.full_page_pct + ' %.'
        ],
        lines: [
          'I can explain why a table grows.',
          'I look for the old transaction first.',
          'I do not reach for VACUUM FULL.'
        ]
      })
    ]
  });
})();
