/* Mission 8: backups, point-in-time recovery and checksums. Real pg_dump, pg_restore, pg_basebackup, pg_verifybackup and pg_checksums runs, and a recovery to a restore point. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var DU = C('bk.dump'), BB = C('bk.basebackup'), AR = C('bk.archive'), PI = C('bk.pitr'), CK = C('bk.checksums');
  var DS = G.table('bk.dump_sizes').rows;
  var SH = G.file('backup.sh');
  var mbOf = function (b) { return (b / 1048576).toFixed(1) + ' MB'; };
  var rowsOf = function (t) { return t.split('\n'); };
  G.expect(DU.custom_smaller_than_plain === true && DU.rows_restored === DU.rows_original && DU.sum_equal === true && DU.rows_after_table_only_restore === DU.rows_original && DU.roles_in_database_dump === false && DU.roles_in_globals_dump === true, 'a dump restores the same rows and does not carry roles');
  G.expect(BB.verified_ok === true && BB.damaged_detected === true && BB.manifest_present === true, 'a base backup verifies and a damaged copy does not');
  G.expect(AR.archived_at_least_2 === true && AR.failed === 0 && PI.table_back === true && PI.rows_back === 12 && PI.later_work_gone === true && PI.timeline_after === 2 && PI.recovered_to_restore_point === true, 'recovery to a restore point brings back the table and leaves the later work behind');
  G.expect(CK.clean_check_zero_bad === true && CK.damaged_check_found_one === true && CK.query_refused === true && CK.default_off_on_initdb === true, 'checksums find one damaged block, and are off by default');
  var RESTORE = 'psql -c "DROP DATABASE brewline"\npsql -c "CREATE DATABASE brewline"\npg_restore -d brewline yesterday.dump\n';
  var sp = function (re, re2) { return G.span(SH, re, re2); };

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Backups, recovery and checksums', short: 'Recovery', blurb: 'dumps, base backups, a restore to a named point, and a page that is damaged', minutes: 21,
    focus: ['ci', 'src'],
    goals: [
      'Say what a **logical dump** gives you, and what it does not (roles, point in time).',
      'Take a **base backup**, verify it, and say what is missing from it without the archive.',
      'Recover a **dropped table** to a **restore point**, and read the log of the recovery.',
      'Say what **data checksums** catch, and what a damaged page looks like.'
    ],
    say: 'A backup that has not been restored is a hope. This mission takes both kinds of backup of a real server, restores them, drops a table by mistake, and brings it back to the moment before. The only thing it cannot show is the day that a real disk fails: for that, you test the restore.',
    scenes: [
      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'A base backup and the log, then a point in time', g: 'backup', legend: true,
        steps: [
          { say: 'A copy of the files alone is not enough, and the log alone is not enough. Together they can take you to any moment. Press Next.', focus: ['base', 'arch', 'rp', 'bad', 'new', 'tl'], cap: 'Files and log together.' },
          { say: 'Step 1. A **base backup** copies the data directory while the server runs. On its own it is a copy of the server **as it was at a moment**, slightly torn, and it needs the log from that moment on to be consistent.', on: ['e1'], focus: ['base', 'arch'], cap: 'A base backup is a start.' },
          { say: 'Step 2. The **archive** keeps every log segment after it. `archive_command` copies each segment when it is full. Without the archive you can only go back to the end of the backup.', on: ['e2'], focus: ['arch', 'rp'], cap: 'The archive keeps the log.' },
          { say: 'Step 3. Before something risky, name a moment with `pg_create_restore_point`. Then the mistake happens: a table is dropped.', on: ['e3'], focus: ['rp', 'bad'], tags: ['tg_after'], cap: 'A mistake after the restore point.' },
          { say: 'Step 4. To recover, you start a **new server** from the base backup, and give it the archive. It replays the log **until the restore point** and stops there.', on: ['e4', 'e5'], focus: ['base', 'arch', 'new'], tags: ['tg_stop'], cap: 'Replay stops at the point.' },
          { say: 'Step 5. The new server continues on a **new timeline**, with the table back. What happened after the restore point is not in it: it is lost with that history. You copy the table back into production.', on: ['e6'], focus: ['new', 'tl'], cap: 'The table is back, on timeline 2.' }
        ]
      }),

      B.cmp({
        id: 'm8-dump', t: 1, src: 'rec', title: 'A logical dump, three formats',
        say: 'A **dump** is a file of SQL, or something that can be turned into SQL, made by `pg_dump`. I dumped a table of 100,000 orders in three formats.',
        cols: ['Format', 'Command', 'Size', 'Files'],
        hl: 1,
        rows: DS.map(function (r) { return [r[0], '`' + r[1] + '`', mbOf(r[2]), String(r[3])]; }),
        steps: [
          { upto: 1, say: '**Plain SQL**: ' + mbOf(DS[0][2]) + ', the biggest, readable, and restored with `psql`. Good for small databases and for reading.' },
          { upto: 2, say: '**Custom** format (`-Fc`): **' + mbOf(DS[1][2]) + '**, compressed, **' + DU.plain_over_custom + ' times** smaller, and restored with `pg_restore`, which can restore **one table** or **one schema** and in parallel.' },
          { upto: 3, say: '**Directory** format with `-j 2`: ' + mbOf(DS[2][2]) + ' in a folder, dumped by **two jobs at once**, and restored in parallel. For big databases it is the default choice.' }
        ]
      }),

      B.term({
        id: 'm8-restore', t: 1, src: 'rec', title: 'Restore a dump, and what it does not carry',
        say: 'I restored the custom dump into a new database, and then restored only one table into another. I also listed the contents of the dump, and asked `pg_dumpall` for the roles.',
        lines: function () {
          return G.term([
            ['pg_restore -l brewline.dump', X('bk.toc')],
            ['pg_restore -d restored brewline.dump;  SELECT count(*), sum(amount) FROM orders;   -- original, then restored', DU.rows_original + ' | equal sums: ' + DU.sum_equal + '    then    ' + DU.rows_restored],
            ['pg_restore -d only_orders -t orders brewline.dump;  SELECT count(*) FROM orders;', String(DU.rows_after_table_only_restore)],
            ['pg_dumpall --globals-only | grep analyst', X('bk.globals')]
          ]);
        },
        after: 'The list shows what is **in** the dump: the table, its data and its key. The restored database had the same **' + n(DU.rows_restored) + '** rows and the same sum of amounts. `-t orders` restored **one table**, and the list says what it could pick from. Two things are not in a database dump. **Roles** belong to the whole server, so `pg_dump` does not carry them (' + DU.roles_in_database_dump + '): `pg_dumpall --globals-only` writes them, with the password as a **hash** (`' + X('bk.globals').split("PASSWORD '")[1].replace("';", '') + '`). And a dump is **one moment**, taken in a consistent snapshot: it cannot take you to another one.',
        afterKind: 'warn',
        doneSay: 'A dump restores tables. Roles come from pg_dumpall. It is one moment.'
      }),

      B.term({
        id: 'm8-schema', t: 2, src: 'rec', title: 'A dump is SQL: the schema of one table',
        say: 'With `--schema-only` a dump is the definition of the objects. This is the table of the project, as `pg_dump` writes it.',
        lines: function () {
          return G.term([['pg_dump -s -t orders brewline', X('bk.schema_only')]]);
        },
        after: 'The table and its key as **statements**, with the owner. A schema-only dump is a good thing to keep **in version control**, to compare between environments and to review. The dump of a newer server may not load into an older one, and a dump from an older server into a newer one is the supported way to upgrade a small database. A dump restores the **logical state**, and so it rebuilds every index, which is why restoring a big dump takes hours.',
        afterKind: 'tip',
        doneSay: 'A dump is SQL. Keep schema dumps under version control.'
      }),

      B.term({
        id: 'm8-base', t: 1, src: 'rec', title: 'A base backup, and its checks',
        say: 'A physical backup copies the files. I ran `pg_basebackup`, read its label, and verified it. Then I added one byte to a data file of a copy and verified again.',
        lines: function () {
          return G.term([
            ['pg_basebackup -D base -X stream -c fast', ''],
            ['cat base/backup_label', X('bk.backup_label')],
            ['pg_verifybackup base', rowsOf(X('bk.verify_ok'))[1]],
            ['pg_verifybackup base_damaged   # one extra byte in the table file', rowsOf(X('bk.verify_bad'))[1]]
          ]);
        },
        after: 'The label says where the backup **started** in the log (`START WAL LOCATION`), that it was **streamed** and taken from the **primary**, and on which timeline. `pg_basebackup` also wrote a **manifest** (' + BB.manifest_present + ') with the size and checksum of every file, and `pg_verifybackup` compared them: **' + rowsOf(X('bk.verify_ok'))[1] + '**. In the damaged copy it said **' + rowsOf(X('bk.verify_bad'))[1].replace('pg_verifybackup: error: ', '') + '**. Verifying proves that the files are what they were. It does **not** prove that the backup can be restored: only a restore proves that.',
        afterKind: 'tip',
        doneSay: 'pg_verifybackup checks the files. Only a restore checks the backup.'
      }),

      B.term({
        id: 'm8-archive', t: 1, src: 'rec', title: 'The archive of the log',
        say: 'For point-in-time recovery the primary was started with `archive_mode = on` and an `archive_command` that copies each finished segment to a folder. I read `pg_stat_archiver` after a switch of segment.',
        lines: function () {
          return G.term([
            ['archive_command = \'cp %p /archive/%f\'', ''],
            ['SELECT pg_switch_wal();   -- close the current segment', ''],
            ['SELECT archived_count >= 2, failed_count FROM pg_stat_archiver;', AR.archived_at_least_2 + ' | ' + AR.failed],
            ['ls /archive | wc -l', String(AR.segments_in_archive)]
          ]);
        },
        after: 'No archive failed (**' + AR.failed + '**), and **' + AR.segments_in_archive + '** segments were in the folder. `archive_command` runs for every finished segment and **must succeed**: if it fails, the server **keeps the segment and tries again**, and `pg_wal` grows (mission 7 had a slot with the same effect). Archiving to a **different disk** than the data is the point: a backup on the same disk is not a backup. Most teams use a tool such as pgBackRest or WAL-G for this, and their details are from documentation: none of them ran here.',
        afterKind: 'warn',
        doneSay: 'Archive the log somewhere else, and alert when it fails.'
      }),

      B.term({
        id: 'm8-pitr', t: 1, src: 'rec', title: 'Recover a dropped table to a named point',
        say: 'After the base backup I created `daily_totals` (12 rows), named a **restore point**, and then dropped the table. I did more work after that. Then I started a new server from the base backup with a target.',
        lines: function () {
          return G.term([
            ['SELECT pg_create_restore_point(\'before_mistake\');  DROP TABLE daily_totals;  CREATE TABLE after_mistake ...;', ''],
            ['restore_command = \'cp /archive/%f %p\'   recovery_target_name = \'before_mistake\'   recovery_target_action = \'promote\'   # and an empty recovery.signal', ''],
            ['pg_ctl start;   -- the log of the new server', X('bk.pitr_log')],
            ['SELECT count(*) FROM daily_totals;   -- on the recovered server', String(PI.rows_back)],
            ['SELECT to_regclass(\'after_mistake\');   -- the later work', 'null'],
            ['SELECT timeline_id FROM pg_control_checkpoint();', String(PI.timeline_after)]
          ]);
        },
        after: 'The new server logged *starting point-in-time recovery*, **restored segments from the archive**, replayed to the restore point (*recovery stopping at restore point "before_mistake"*) and **promoted** itself: **timeline ' + PI.timeline_after + '**. `daily_totals` was back with **' + PI.rows_back + '** rows, and the table that I created **after** the mistake was **not there** (' + PI.later_work_gone + '): it belongs to the history that we left. In real life you would now **copy the one table** from this server into production with `pg_dump -t`, and keep the rest. History file of the new timeline: `' + X('bk.history_file') + '`.',
        afterKind: 'tip',
        doneSay: 'A base backup, the archived log and a target bring back one moment.'
      }),

      B.code({
        id: 'm8-code', t: 1, src: 'docs', title: 'The backup script of the project', file: 'backup.sh', lang: 'bash', code: SH,
        steps: [
          { say: 'The commands of this mission, in one script. I ran each of them in the recording, and not the script as a whole, so this screen is from documentation. Press Next.', lines: null },
          { say: 'A **logical** backup in the custom format. It is one moment, and a restore rebuilds every index.', lines: sp(/pg_dump/) },
          { say: 'A **physical** backup that **streams** the log that is written during the copy, so that it is consistent, with a fast checkpoint at the start.', lines: sp(/pg_basebackup/) },
          { say: 'Verify it right away. It is cheap and it catches a damaged copy.', lines: sp(/pg_verifybackup/) },
          { say: 'The recovery recipe in comments: a copy of the backup, a `restore_command`, a **target**, and an empty `recovery.signal` file.', lines: sp(/To recover/, /recovery\.signal/) }
        ],
        note: 'A script is not a backup strategy. Schedule it, store the result off the machine, and test the restore on a calendar.'
      }),

      B.term({
        id: 'm8-checksums', t: 3, src: 'rec', title: 'Data checksums: a damaged page is found',
        say: 'A server made with `initdb --data-checksums` checks every page on read. I stopped it, changed one byte in a table file, and ran `pg_checksums`, and then started it and read the table.',
        lines: function () {
          return G.term([
            ['pg_checksums --check -D $PGDATA   # before', rowsOf(X('bk.checksums_ok')).slice(1).join('\n')],
            ['# one byte of the table file is changed', ''],
            ['pg_checksums --check -D $PGDATA   # after', rowsOf(X('bk.checksums_bad')).slice(1).join('\n')],
            ['SELECT count(*) FROM t;', rowsOf(X('bk.checksum_error')).slice(1).join('\n')]
          ]);
        },
        after: 'Before the change **0** pages were bad, after it **1**, and `pg_checksums` named the **file and the block**. The running server refused to read the page: it warned that the **checksum did not match** and then raised *invalid page in block 0*, so the query **failed loudly** and did not return wrong numbers. Checksums are **off by default** in `initdb` (' + CK.default_off_on_initdb + '), and they cost a little CPU. They turn silent corruption into an error. Many managed services switch them on. The repair is a restore from a backup, or from a standby, because the data in the page is gone.',
        afterKind: 'warn',
        doneSay: 'Checksums turn silent corruption into an error. Switch them on at initdb.'
      }),

      B.cmp({
        id: 'm8-compare', t: 1, src: 'docs', title: 'Which backup for which job',
        say: 'Three ways, and what each is good for. The recorded rows are from this mission. The last row is from documentation.',
        cols: ['', 'Logical dump', 'Base backup plus archive', 'Storage snapshot (managed service)'],
        hl: 2,
        rows: [
          ['What you get', 'SQL or a dump file of one database', 'The files of the whole server, plus the log', 'A copy of the volume, taken by the platform'],
          ['Point in time', 'One moment', 'Any moment in the archive', 'Often any moment, by the platform\'s own log'],
          ['Restore one table', 'Yes: `pg_restore -t`', 'On a new server, then dump the table', 'On a new instance, then dump the table'],
          ['Different PostgreSQL version', 'Yes, forwards', 'No, the same major version', 'No'],
          ['Cost of restoring a big database', 'Hours: the indexes are rebuilt', 'Copy the files and replay the log', 'Depends on the platform'],
          ['Roles', 'Not in `pg_dump`: use `pg_dumpall --globals-only`', 'Included', 'Included']
        ],
        steps: [
          { upto: 3, say: 'A dump is for **portability** and for single tables. A base backup with the archive is for **disaster recovery and going back in time**.' },
          { upto: 6, say: 'Big databases use the physical kind as the main backup and keep dumps of the **critical tables** as a second, simple copy. A managed service\'s snapshots and their guarantees are from documentation, and differ by provider.' }
        ]
      }),

      B.bug({
        id: 'm8-bug', t: 1, src: 'docs', q: 'At 14:03 somebody dropped a table by mistake. The last dump was made at 02:00. An engineer starts this to "restore the database". Click the line that makes it worse.',
        file: 'restore.sh', lang: 'bash', code: RESTORE, bad: [1],
        hint: 'What happens to the work done between 02:00 and now, and what could you do beside production instead?',
        why: '`DROP DATABASE` destroys the **current data**: twelve hours of orders that were not in the dump. Restore **beside** production instead: into a new database, or, best, a **point-in-time recovery** on a new server to just before the mistake, and then copy the **one table** back. The recording: a dump restored into a **new database** gave the same ' + n(DU.rows_restored) + ' rows, and `-t` restored a single table.',
        fix: 'psql -c "CREATE DATABASE brewline_restored"\npg_restore -d brewline_restored -t daily_totals yesterday.dump\n# then copy the table into brewline with pg_dump -t and psql\n',
        cheer: 'Restore beside production.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'You restored a custom-format dump into a new server, and your analyst cannot log in. Why?',
        opts: [
          { t: 'Roles are not part of a database dump: they come from `pg_dumpall --globals-only`', fb: '' },
          { t: 'The dump is corrupt', fb: 'The rows were restored and equal. The roles are a separate object.' },
          { t: 'The restore must be run as the analyst', fb: 'It is not related to who runs it.' },
          { t: 'Passwords cannot be dumped', fb: 'They can: as a hash, in the globals dump.' }
        ],
        ok: 0, why: 'The recording: the roles in the database dump: ' + DU.roles_in_database_dump + '; in the globals dump: ' + DU.roles_in_globals_dump + ', with the password as a hash.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'You need one table out of a dump of 400 GB. Which format lets you restore only it?',
        opts: [
          { t: 'Custom or directory format, with `pg_restore -t`', fb: '' },
          { t: 'Plain SQL, with `psql -t`', fb: 'A plain dump is read in full by psql. There is no way to pick a table.' },
          { t: 'None: a dump restores everything', fb: 'The custom formats list their contents and restore parts.' },
          { t: 'A base backup', fb: 'It is the files of the whole server.' }
        ],
        ok: 0, why: 'The recording: `pg_restore -l` listed the contents, and `-t orders` restored one table of ' + n(DU.rows_after_table_only_restore) + ' rows.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'You have a base backup from Sunday and no archived log. A table was dropped on Wednesday. What is the best you can recover?',
        opts: [
          { t: 'The state of the end of the backup on Sunday', fb: '' },
          { t: 'The state just before the DROP on Wednesday', fb: 'That needs the archived log from Sunday to Wednesday.' },
          { t: 'Nothing: a base backup is useless alone', fb: 'It restores to the moment of the backup.' },
          { t: 'Any moment, because PostgreSQL logs everything', fb: 'Only a log that was **archived** can be replayed.' }
        ],
        ok: 0, why: 'The recording: recovery needed `restore_command` and the archive, and replayed **segments from the archive** until the restore point.'
      }),

      B.quiz({
        id: 'm8-q4', t: 2,
        q: 'After a point-in-time recovery to a restore point, the recovered server shows `timeline_id = 2`. What does that tell you?',
        opts: [
          { t: 'It continues on a new history that branches off at the restore point', fb: '' },
          { t: 'It is the second backup', fb: 'The timeline counts histories, not backups.' },
          { t: 'The recovery failed once', fb: 'A timeline is not a retry counter.' },
          { t: 'A standby is attached', fb: 'A standby does not change the timeline by itself.' }
        ],
        ok: 0, why: 'The recording: *selected new timeline ID: 2*, and the history file: `' + X('bk.history_file') + '`.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'A table was dropped by mistake at 14:03. Put the recovery in order.',
        items: [
          'Do not touch production and do not restore over it',
          'Decide the target: a time just before 14:03, or a restore point if you made one',
          'Restore the base backup to a new directory, with the archive and the target in its settings',
          'Start it, read the log until *archive recovery complete*, and check the table',
          'Dump the table from the recovered server and load it into production'
        ],
        why: 'Production kept working during the recovery, and only the one table moves back. The log lines of the recording follow this order, ending at *archive recovery complete*.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: a 2 TB database with one hour of acceptable data loss',
        scenario: 'The orders database is 2 TB. Management accepts losing at most an hour of data and wants to be back within four hours of a disaster. Today a nightly `pg_dump` takes six hours, and nobody has restored it.',
        opts: [
          { t: 'A weekly base backup and a continuous archive of the log, kept off the machine, with a restore test every month', d: 'The loss is limited by the archive, which is seconds. A restore copies files and replays log, instead of rebuilding indexes for hours.', lose: 'More moving parts: the archive, retention of old segments, and a tool such as pgBackRest or WAL-G. It restores the whole server at one version.' },
          { t: 'Keep the nightly dump and make it faster', d: 'Nothing new to learn.', lose: 'The loss is up to a day, not an hour, and the restore rebuilds 2 TB of indexes, probably more than four hours.' },
          { t: 'Rely on the storage snapshots of the platform, and never test', d: 'Nothing to run.', lose: 'The snapshot guarantees are the provider\'s and differ, and an untested restore is a hope.' }
        ],
        pick: 0,
        why: 'The two numbers are the **recovery point** (an hour) and the **recovery time** (four hours). Only the log gives a recovery point in minutes, and only files give a recovery time in hours. The recording shows both parts working on a small server. pgBackRest and WAL-G did not run. Keep dumps of the critical tables as a second, simple copy.',
        when: 'A database of a few GB can live with a nightly dump.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: a table was dropped by mistake', time: '14:10',
        alert: '**`daily_totals` was dropped at 14:03 by a migration that ran in production by mistake.** Reports are failing. The last dump is from 02:00. The team has base backups and an archived log, and nobody named a restore point.',
        clues: ['`pg_stat_archiver` shows that segments are archived, with no failures', 'The migration log says that the drop happened at 14:03:12', 'Orders have been arriving all day, and they must not be lost'],
        opts: [
          { t: 'Start a new server from the base backup and the archive, recover to just before 14:03:12, and copy the table into production', fb: '' },
          { t: 'Restore the 02:00 dump over production', fb: 'It would throw away twelve hours of orders.' },
          { t: 'Recreate the table by hand from the report definitions', fb: 'The data is gone, and the report would be wrong.' },
          { t: 'Stop production and recover it in place', fb: 'It is an outage for a one-table problem.' }
        ],
        best: 0,
        why: 'The recording of this exact case: after recovery to the restore point the table was back with **' + PI.rows_back + '** rows on **timeline ' + PI.timeline_after + '**, and the work done after the drop was not in it (' + PI.later_work_gone + '). Production stayed up, and only the table moved back.',
        checks: [
          ['Keep production running', 'Recover beside it, on another server or directory.'],
          ['Choose the target', '`recovery_target_time` just before the drop, or a restore point.'],
          ['Read the log', 'Wait for *archive recovery complete*, then check the table and its rows.'],
          ['Copy it back', '`pg_dump -t daily_totals` from the recovered server into production.']
        ],
        tell: 'A migration dropped a table in production. I did not restore over production. I started a second server from the base backup, with the archive and a recovery target just before the drop, checked that the table was there, and copied only that table back. Production lost nothing. We now name a restore point before every migration.',
        prevent: ['Name a **restore point** before every migration', '**Test** the recovery on a calendar', 'Never run a migration on production without a **review** of where it runs']
      }),

      B.qa({
        id: 'qa-dump', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'How do you back up a PostgreSQL database?',
        pts: ['Logical: pg_dump, in the custom or directory format', 'Physical: pg_basebackup plus the archived WAL', 'Verify, store off the machine, and test restores', 'Roles are in pg_dumpall --globals-only'],
        short: 'There are two kinds. A **logical** backup is `pg_dump`, which writes SQL or a custom or directory format, takes a consistent snapshot of one database, and can restore a single table with `pg_restore`. It does not include the roles, which come from `pg_dumpall --globals-only`, and it is one moment. A **physical** backup is `pg_basebackup`, a copy of the data directory, which with the **archived log** can go to any moment. In my recording a dump of 100,000 orders was 6.1 MB as plain SQL and 2.3 MB in the custom format, and it restored the same rows and sums. For a big database I use the physical kind as the main backup, dumps of the critical tables as a second copy, `pg_verifybackup` after each backup, storage on another machine, and a restore test on a calendar.',
        fu: [['Does pg_dump lock the database?', 'No. It takes a snapshot and readers and writers continue.'], ['How do you speed it up?', 'The directory format with `-j`.']],
        trap: 'Taking backups and never restoring one.',
        real: 'Say when you last restored a backup and what it taught you.'
      }),

      B.qa({
        id: 'qa-pitr', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'What is point-in-time recovery and what does it need?',
        pts: ['A base backup plus the archived WAL', 'archive_command copies every segment', 'Recovery replays to a time, a name or an LSN', 'The recovered server starts a new timeline'],
        short: 'It takes a database back to any moment after a base backup. It needs two things: a **base backup**, and the **write-ahead log archived continuously** with `archive_mode` and `archive_command`. To recover, I copy the base backup to a new directory, set `restore_command` to fetch segments from the archive, set a **target** (`recovery_target_time`, a name made with `pg_create_restore_point`, or an LSN), create `recovery.signal`, and start the server. It replays the log to the target and stops. In my recording I named a restore point, dropped a table, and recovered: the table was back with 12 rows, the work done after the mistake was not in it, and the server continued on **timeline 2**. I recover **beside** production and copy only what I need back, and I test it, because an archive that fails silently makes recovery impossible.',
        fu: [['What if the archive fails?', 'The server keeps the segment and retries, and `pg_wal` grows. Monitor `pg_stat_archiver`.'], ['What is a timeline?', 'A branch of the history. Every recovery to a point starts a new one.']],
        trap: 'Restoring the dump over production.',
        real: 'Describe a recovery that you ran or practised.'
      }),

      B.qa({
        id: 'qa-backuptypes', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'Logical or physical backup: how do you choose?',
        pts: ['Logical: one database, one table, other versions, rebuilds indexes', 'Physical: the whole server, any point in time, fast restore', 'Same major version only for physical', 'Big databases use physical as the main one'],
        short: 'A **logical** backup (`pg_dump`) is portable and selective: one database or one table, and it can be restored into a **newer major version**. The price is that the restore **rebuilds every index**, which takes hours on a big database, and that it is one moment. A **physical** backup (`pg_basebackup` with the archive) copies files, so a restore is fast, it can go to **any moment**, and it includes the roles, but it needs the **same major version** and restores the whole server. In my recording the dump was 2.3 MB in the custom format and restored in one command, and the base backup was 81.5 MB for the whole server and verified with `pg_verifybackup`. For a big database I use physical backups as the main one, and logical dumps for critical tables and for upgrades.',
        fu: [['Which one for an upgrade?', 'A logical dump, or logical replication, or `pg_upgrade`. From documentation.'], ['Can a standby be a backup?', 'No. It copies mistakes too, such as a drop.']],
        trap: 'Believing that a standby is a backup.',
        real: 'Say which kind your main backup is, and its restore time.'
      }),

      B.qa({
        id: 'qa-verify', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'How do you know that a backup works?',
        pts: ['pg_verifybackup checks files against the manifest', 'Only a restore proves it', 'Restore to a new server and run queries', 'Monitor the archive and test on a schedule'],
        short: '`pg_verifybackup` checks the files of a base backup against its **manifest**: in my recording it said *backup successfully verified* for the good copy, and reported a size mismatch when I added one byte to a file. That proves that the files are what they were, but not that the server **starts** and that the data is right. So I also **restore** to a new server regularly, read the recovery log until *archive recovery complete*, and run checks: the row counts and a few queries of the important tables. I monitor `pg_stat_archiver` for failures, because a gap in the archive breaks recovery after that point. And I write the restore time down: it is the number that management needs.',
        fu: [['Does amcheck help?', 'It checks the structure of indexes and tables on a running server. From documentation.'], ['How often?', 'Often enough that the procedure is known: monthly is a common start.']],
        trap: 'Counting a verified backup as a tested one.',
        real: 'Say how long your last restore test took.'
      }),

      B.qa({
        id: 'qa-checksums', t: 3, tag: 'PostgreSQL', secs: 60,
        q: 'What are data checksums?',
        pts: ['A checksum on every page, checked when it is read', 'Off by default at initdb', 'A mismatch is an error, not wrong data', 'The repair is a restore or a standby'],
        short: 'With `initdb --data-checksums`, or `pg_checksums --enable` on a stopped server, every page gets a checksum that is verified when it is read from disk. A page that was damaged by the disk or the memory then raises an error instead of returning wrong rows. In my recording I changed one byte of a table file: `pg_checksums --check` reported one bad checksum and named the file and block, and the running server warned *page verification failed* and refused the read with *invalid page in block 0*. They are **off by default**, and cost a little CPU and some log, so many people switch them on for new servers. A damaged page is repaired from a backup or a standby, because the data in it is gone. I ran this on a throwaway server, and what the cost is on your hardware is something to measure.',
        fu: [['Can you enable them later?', 'Yes, offline, with `pg_checksums --enable`. From documentation.'], ['What is ignore_checksum_failure?', 'A setting that lets a superuser read a bad page anyway, to rescue data.']],
        trap: 'Believing that a replica or RAID makes checksums unnecessary.',
        real: 'Say whether your servers have checksums on.'
      }),

      B.qa({
        id: 'qa-timeline', t: 3, tag: 'PostgreSQL', secs: 60,
        q: 'What is a timeline?',
        pts: ['A branch of the history of a server', 'A recovery to a point, or a promotion, starts a new one', 'The history file says where it branched', 'It is the first 8 characters of a WAL file name'],
        short: 'A timeline is a **branch of the history** of the database. A server starts on timeline 1. Every **promotion** of a standby and every **recovery to a point in time** starts a new timeline, so that the log of the new history cannot be mixed up with the log of the old one that it left behind. The **history file** records where it branched: in my recording `1  0/<lsn>  at restore point "before_mistake"`. The number is also the first eight hexadecimal characters of every WAL file name. After a recovery to a restore point the work that happened after it on timeline 1 is not part of timeline 2, which is the point of recovering, and the reason that you copy back only what you need. A standby follows its primary across timelines only if it is told to.',
        fu: [['What does recovery_target_timeline do?', 'It says which timeline to follow. The default is the latest.'], ['Can you go back?', 'You can recover from the same backup to a different target, which makes another timeline.']],
        trap: 'Expecting the work after the restore point to survive.',
        real: 'Say what you did after a promotion.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Restore Pro', color: '#FED7AA',
        pts: [
          'A dump: plain ' + mbOf(DS[0][2]) + ', custom **' + mbOf(DS[1][2]) + '**, and it restored **' + n(DU.rows_restored) + '** equal rows. **Roles** come from `pg_dumpall --globals-only`.',
          'A **base backup** plus the **archive** go to any moment. `pg_verifybackup` checks the files, and **only a restore** checks the backup.',
          'Recovery to `before_mistake`: the table was back (' + PI.rows_back + ' rows), the later work was not, and the server was on **timeline ' + PI.timeline_after + '**.',
          'Recover **beside** production and copy back only the table.',
          '**Checksums** (off by default) found one bad block and made the query fail with *invalid page*.'
        ],
        lines: [
          'I restore beside production.',
          'I name a restore point before a migration.',
          'I test the restore on a calendar.'
        ]
      })
    ]
  });
})();
