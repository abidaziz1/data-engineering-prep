/* Mission 2: OneLake and Delta tables. A table is a folder of Parquet files and a log. The recording is real Delta Lake on a lakehouse-shaped folder. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var BH = G.table('bronze.history').rows, TT = G.table('bronze.timetravel').rows, BL = C('bronze.log'), DR = C('drop'), FS = C('files.small'), SC = C('schema.constraints'), TE = C('files.timetravel_error'), BD = C('bronze.detail');
  G.expect(BL.commits === 5 && BL.parquet_files === 5 && BL.all_strings === true && BL.kinds_in_first_commit.indexOf('protocol') >= 0 && BL.kinds_in_first_commit.indexOf('metaData') >= 0 && BL.kinds_in_first_commit.indexOf('add') >= 0, 'bronze has five commits, five files and all-text columns');
  G.expect(TT[0][1] === 2000 && TT[4][1] === 10157, 'time travel returns the rows of each version');
  G.expect(DR.managed_folder_before === true && DR.managed_folder_after === false && DR.external_folder_after === true && DR.external_rows_still_readable === 100, 'a managed drop removes the folder and an external drop keeps it');
  G.expect(FS.checkpoints.length === 5 && FS.json_commits === 41, 'a checkpoint every ten commits');
  G.expect(SC.protocol_before === 2 && SC.protocol_after_check === 3, 'a check constraint raises the writer version');
  G.expect(TE.condition === 'FAILED_READ_FILE.FILE_NOT_EXIST', 'a vacuumed version cannot be read');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'OneLake and Delta tables', short: 'OneLake and Delta', blurb: 'A table is a folder of Parquet files and a log', minutes: 22,
    focus: ['stg', 'ing'],
    goals: [
      'Say what is **inside** a lakehouse table: Parquet files and a log.',
      'Read **versions** and use **time travel**.',
      'Tell the **Files** area from the **Tables** area, and a managed table from an external one.',
      'Choose between a **shortcut**, a copy and **mirroring**.'
    ],
    say: 'Every Fabric table is a Delta table, and a Delta table is a folder. Once you know what is in the folder, a long list of questions about Fabric answers itself: why a notebook and a SQL query see the same table, why a rerun can be safe, why a delete does not free space, and why last week can still be read. I opened real Delta tables to show you. The folder layout is the one of a lakehouse. OneLake itself is from documentation.',
    scenes: [
      B.flow({
        id: 'm2-flow', t: 1, src: 'rec', title: 'What a write does to a Delta table', g: 'delta', legend: true,
        steps: [
          { say: 'A notebook appends a daily file to the bronze table. This is what happens in the folder. Press Next.', focus: ['w', 'pq', 'log', 'r'], cap: 'A write, two folders, a reader.' },
          { say: 'Step 1. The job writes **new Parquet files** into the table folder. It never edits an existing file. The recording: each append wrote **one** file, and after five appends the folder held ' + BL.parquet_files + '.', on: ['e1'], focus: ['w', 'pq'], tags: ['tg_add'], cap: 'New files are added.' },
          { say: 'Step 2. Then it writes **one JSON file** into the `_delta_log` folder. This is the **commit**. Until that file exists, the new Parquet files are not part of the table. If the job dies before it, nothing changed.', on: ['e2'], focus: ['w', 'log'], tags: ['tg_commit'], cap: 'The log file is the commit.' },
          { say: 'Step 3. A reader reads the **log first**. It lists which files make up the version it wants. This is why every engine that can read the log sees the same table.', on: ['e3'], focus: ['log', 'r'], cap: 'The reader starts with the log.' },
          { say: 'Step 4. Then it reads only those Parquet files. A reader that started before the commit still sees the old version. Two readers can see two versions, and neither is wrong.', on: ['e4'], focus: ['pq', 'r'], tags: ['tg_snap'], cap: 'Only the listed files are read.' }
        ]
      }),

      B.term({
        id: 'm2-tree', t: 1, src: 'rec', title: 'The bronze table, as a folder',
        say: 'This is the folder of the bronze table after five appends, with the names of the data files shortened so that you can follow them.',
        lines: function () { return G.plain(X('bronze.tree'), { cmd: 'ls -R Tables/bronze_orders' }); },
        after: 'Five Parquet files and five commits, one for each daily file. The version of a table is the **number of its last commit**, here **' + (BL.commits - 1) + '**. Delta Lake 4.0 also wrote a small `.crc` checksum file next to each commit (' + BL.crc_files + ' of them), which this listing leaves out.',
        afterKind: 'tip',
        doneSay: 'A table is files plus a log. The log is the commit.'
      }),

      B.term({
        id: 'm2-commit', t: 1, src: 'rec', title: 'The first commit, read as text',
        say: 'The log is plain JSON, one action on each line. This is the first commit of the bronze table, with the long values shortened.',
        lines: function () { return G.plain(X('bronze.commit0'), { cmd: 'cat Tables/bronze_orders/_delta_log/00000000000000000000.json' }); },
        after: 'Four actions. `commitInfo` says what the operation was. `protocol` says which version of the Delta rules a reader must know (reader **' + BD.minReaderVersion + '**, writer **' + BD.minWriterVersion + '**). `metaData` holds the schema: **every column is a string**, because bronze keeps the raw text. `add` names a data file and records its **size and statistics**, the number of rows and the smallest and largest `order_id`, which is how a query can skip a file.',
        afterKind: 'tip',
        doneSay: 'The log holds the schema, the files and their statistics.'
      }),

      B.widget({ id: 'm2-lab', kind: 'loglab', t: 1, src: 'rec', title: 'Lab: the log of a table, version by version' }),

      B.term({
        id: 'm2-travel', t: 1, src: 'rec', title: 'Time travel: read the table as it was',
        say: 'Because every commit lists its own files, an older version can still be read. I counted the rows at each of the five versions.',
        lines: function () {
          return G.term(TT.map(function (r) { return ['SELECT count(*) FROM bronze_orders VERSION AS OF ' + r[0] + ';', String(r[1])]; }));
        },
        after: 'Version 0 held one day of orders (**' + n(TT[0][1]) + '**) and version 4 holds all five (**' + n(TT[4][1]) + '**). `VERSION AS OF` takes a number, and `TIMESTAMP AS OF` takes a time. This is how you compare a table with its yesterday, undo a bad load, and rerun a report on the data it saw. It only works while the files of that version still exist. Mission 5 shows what ends that.',
        afterKind: 'tip',
        doneSay: 'Every version is readable while its files exist.'
      }),

      B.cmp({
        id: 'm2-areas', t: 1, src: 'rec', title: 'The Files area and the Tables area',
        say: 'A lakehouse has two areas. They look alike in a file browser and they are different. Press Next to read them.',
        cols: ['', 'Files', 'Tables'],
        hl: 2,
        rows: [
          ['What it holds', 'Anything: CSV, JSON, images, Parquet, a folder that you made', 'Delta tables, each one a folder with a `_delta_log`'],
          ['What reads it', 'Spark reads the files by path', 'Spark by table name, the SQL endpoint, Power BI'],
          ['Schema and history', 'None. A CSV is only bytes', 'A schema, versions and statistics in the log'],
          ['In the recording', 'Files/landing, with ' + C('lake.landing').files + ' daily CSV files', 'bronze_orders, silver_orders, gold_daily_revenue and the others']
        ],
        steps: [
          { upto: 2, say: 'Files is where data **arrives**. Tables is where data becomes something that engines share. The landing folder is a good place to keep the original files, because bronze can be rebuilt from them.' },
          { upto: 4, say: 'Only the Tables area is visible to the SQL endpoint and to Power BI. A CSV in Files is not a table until a notebook writes it as one.' }
        ]
      }),

      B.term({
        id: 'm2-drop', t: 2, src: 'rec', title: 'Managed and external tables: what DROP removes',
        say: 'I made two tables with 100 rows each. One was managed: the lakehouse owns its folder. The other was external: it pointed at a folder that I own. Then I dropped both.',
        lines: function () {
          return G.term([
            ['DROP TABLE tmp_managed;   -- the folder was under Tables/', 'folder exists afterwards: ' + DR.managed_folder_after],
            ['DROP TABLE tmp_external;  -- the folder was Files/exports/ext_orders', 'folder exists afterwards: ' + DR.external_folder_after],
            ['spark.read.format("delta").load("Files/exports/ext_orders").count()', String(DR.external_rows_still_readable)]
          ]);
        },
        after: 'Dropping a **managed** table deletes its data. Dropping an **external** table removes only the name, and the files stay and can still be read. In a lakehouse the tables under Tables are managed. Shortcuts behave like the external case: they point at data that someone else owns, from documentation.',
        afterKind: 'warn',
        doneSay: 'Managed drop deletes the data. External drop keeps it.'
      }),

      B.cmp({
        id: 'm2-link', t: 1, src: 'docs', title: 'Shortcut, copy or mirroring',
        say: 'Data often lives somewhere else. Fabric gives you three ways to bring it in. Press Next to compare them.',
        cols: ['', 'Shortcut', 'Copy with a pipeline', 'Mirroring'],
        hl: 1,
        rows: [
          ['What it is', 'A logical link to data in another workspace or in external storage', 'A copy of the data into OneLake on a schedule', 'Near real-time replication of an operational database into OneLake'],
          ['Is data copied?', 'No', 'Yes', 'Yes, kept in step by the service'],
          ['Freshness', 'Whatever the source holds now', 'As old as the last run', 'Close to the source'],
          ['Good for', 'Reading data that someone else owns, without a second copy', 'A stable snapshot, or a source that is not supported by the others', 'Operational databases that need continuous change capture'],
          ['Watch for', 'You depend on the source\'s availability and permissions', 'Cost, schedule and a rerun that must be safe', 'Which sources and features are supported today']
        ],
        steps: [
          { upto: 3, say: 'A shortcut copies nothing, and a copy copies everything. Mirroring sits between: the service copies and keeps it fresh for you.' },
          { upto: 5, say: 'Choose by who owns the data and how fresh it must be. The documentation says shortcuts suit live read-only access, and mirroring suits operational databases that need continuous change capture.' }
        ]
      }),

      B.talk({
        id: 'm2-checkpoint', t: 3, src: 'rec', title: 'Two details of the log: checkpoints and protocol versions',
        say: 'Two small things that interviewers like. Press Next for each.',
        items: [
          ['Checkpoints', 'A table that was written 40 times had **' + FS.json_commits + '** JSON commits and **' + (FS.checkpoints.length - 1) + '** checkpoint files, one at versions 10, 20, 30 and 40, and a `_last_checkpoint` pointer. A checkpoint is the whole state of the table so far in one Parquet file, so a reader does not have to replay every JSON file from the start.', 'A checkpoint every ten commits keeps readers fast.'],
          ['Protocol versions', 'The table started at writer version **' + SC.protocol_before + '**. After I added a **CHECK constraint** it was **' + SC.protocol_after_check + '**. A feature that needs a newer protocol raises the minimum, and a reader or writer that does not know it must refuse the table. Check which features an engine supports before you turn on a new table feature.', 'A new table feature can lock out an older engine.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A notebook \'cleans up\' the lakehouse to save space. After it runs, a report on bronze_orders fails. Click the line that breaks the table.',
        file: 'cleanup.py', lang: 'python',
        code: '# "free space": remove old files from the table folders\nimport os\nfor name in os.listdir("/lakehouse/default/Tables"):\n    folder = f"/lakehouse/default/Tables/{name}"\n    for f in os.listdir(folder):\n        if f.endswith(".parquet"):\n            os.remove(f"{folder}/{f}")\n',
        bad: [7],
        hint: 'Which files does the log still list?',
        why: 'The log still lists every Parquet file, so a reader that opens the table goes looking for files that are gone. The recording shows the same failure after a vacuum took the files of an old version: reading version 5 failed with `' + TE.condition + '`. Never delete data files by hand. Use `OPTIMIZE` to compact files and `VACUUM` to remove the ones that no version inside the retention period needs.',
        fix: '# let Delta decide which files nobody needs\nfor name in ["bronze_orders", "silver_orders", "gold_daily_revenue"]:\n    spark.sql(f"VACUUM {name}")      # the default retention is 7 days\n',
        cheer: 'Use VACUUM, not rm.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'In a Delta table, what makes a write count as done?',
        opts: [
          { t: 'The JSON file that is added to the `_delta_log` folder', fb: '' },
          { t: 'The Parquet files appearing in the folder', fb: 'Files that the log does not list are not part of the table.' },
          { t: 'The notebook cell finishing', fb: 'A cell can finish without a commit if the job failed before the log file.' },
          { t: 'A checkpoint being written', fb: 'Checkpoints only speed up readers.' }
        ],
        ok: 0, why: 'The commit is the log file. The recording: each of five appends added one Parquet file and one JSON file, and a reader at version 3 saw ' + n(TT[3][1]) + ' rows while version 4 held ' + n(TT[4][1]) + '.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'You run `SELECT count(*) FROM bronze_orders VERSION AS OF 1`. What do you get in the recording?',
        opts: [
          { t: String(TT[1][1]) + ' rows: the first two days', fb: '' },
          { t: String(TT[0][1]) + ' rows: the first day only', fb: 'That is version 0.' },
          { t: String(TT[4][1]) + ' rows: the whole table', fb: 'That is the latest version, version 4.' },
          { t: 'An error, because time travel needs a timestamp', fb: 'VERSION AS OF takes a version number.' }
        ],
        ok: 0, why: 'Version 1 is the table after the second commit: two files, ' + n(TT[1][1]) + ' rows.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'You drop a table in the Tables area of a lakehouse. What happens to its data?',
        opts: [
          { t: 'It is deleted, because the table is managed', fb: '' },
          { t: 'It stays, because dropping only removes the name', fb: 'That is an external table. In the recording the managed folder was gone and the external one stayed.' },
          { t: 'It moves to a recycle folder for 7 days', fb: 'Not for a plain DROP TABLE of a managed table in the recording.' },
          { t: 'It depends on the capacity', fb: 'The capacity does not decide this.' }
        ],
        ok: 0, why: 'In the recording the managed folder existed before the drop and not after it. An external table kept its folder and all ' + DR.external_rows_still_readable + ' rows.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the steps of an append to a Delta table in order.',
        items: ['The job writes new Parquet files into the table folder', 'The job writes one JSON file for the next version into `_delta_log`', 'A reader that starts now reads the log and finds the new version', 'The reader opens only the files that the version lists'],
        why: 'Files first, commit last. A reader that started before the commit still sees the old version, and a failed job leaves files that no version lists.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: a partner keeps its price list in storage that you do not own',
        scenario: 'A supplier updates a price list in its own cloud storage several times a day. Brewline needs the current prices in a silver table. The supplier says the data may be read but not copied elsewhere for more than a day.',
        opts: [
          { t: 'A shortcut to the supplier\'s folder, read by a notebook that builds the silver table', d: 'No copy sits in OneLake, so the data is as fresh as the source and the supplier\'s rule is easy to keep.', lose: 'Your job now depends on the supplier\'s availability and permissions, and a read of someone else\'s storage may be slower than a read of OneLake.' },
          { t: 'A pipeline that copies the list into the lakehouse every hour', d: 'A stable local copy, and fast reads.', lose: 'A copy that must be deleted within a day, a schedule to keep, and a window in which the data is stale.' },
          { t: 'Mirroring', d: 'Continuous freshness.', lose: 'Mirroring is for supported operational databases, not for a folder of files.' }
        ],
        pick: 0,
        why: 'The supplier owns the data and limits copies, so the choice that copies nothing is the natural one. Its cost is the dependency on the source, which you watch. All three are from documentation, and I did not run any of them.',
        when: 'If the supplier\'s storage is slow or unreliable, a short-lived copy with a deletion job is the fallback.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: a comparison with last week fails', time: '10:15',
        alert: '**An analyst runs `SELECT ... FROM silver_orders VERSION AS OF 40` to compare with last week and gets "File does not exist".** Yesterday the same query worked. A maintenance notebook was added last night.',
        clues: ['The new notebook runs `VACUUM silver_orders RETAIN 0 HOURS`', 'The latest version of the table reads fine', 'The log still lists the old version'],
        opts: [
          { t: 'Remove the zero-hour retention from the maintenance notebook, and keep the default of 7 days or more', fb: '' },
          { t: 'Run `OPTIMIZE` again', fb: 'OPTIMIZE compacts files. It cannot bring back files that a vacuum deleted.' },
          { t: 'Tell the analyst that time travel is broken in Fabric', fb: 'Time travel works while the files exist. The maintenance job removed them.' },
          { t: 'Restore the table to version 40', fb: 'A restore needs the files of that version, and they are gone.' }
        ],
        best: 0,
        why: 'The recording: after `OPTIMIZE` the old files were still in the folder and version 5 could be read. After `VACUUM RETAIN 0 HOURS` the folder held one file, and reading version 5 failed with `' + TE.condition + '`. A vacuum deletes what no **current** version needs, so the retention period is the length of your history.',
        checks: [
          ['Reproduce it', 'Read an old version and a new one, and compare.'],
          ['Find what changed', 'A maintenance notebook with a zero-hour retention.'],
          ['Understand the loss', 'The files are deleted and cannot be restored from the log.'],
          ['Fix the job', 'Use the default retention, and say what history you promise.']
        ],
        tell: 'A maintenance notebook vacuumed silver with a retention of zero hours, which deleted the files of every old version, so time travel to last week fails. I will use the default of seven days, or longer if people need more history, and write down how far back we promise to go.',
        prevent: ['Keep the **retention** at 7 days or more', 'Review maintenance notebooks like **production code**', '**Say** how much history people can rely on']
      }),

      B.qa({
        id: 'qa-delta', t: 1, tag: 'Fabric', secs: 75,
        q: 'What is a Delta table, and why does Fabric use it?',
        pts: ['Parquet files plus a transaction log', 'The commit is a JSON file in _delta_log', 'ACID, schema and versions', 'One table that every engine can read'],
        short: 'A Delta table is a folder of **Parquet files** plus a **`_delta_log`** folder of JSON files. A write adds new Parquet files and then adds one log file, which is the commit. A reader reads the log to find which files belong to a version, so readers see a consistent version and a failed write leaves no trace. The log also holds the schema, the file statistics and the history. I opened one: five appends gave five data files and five commits, and I read the table as of each version. Fabric uses Delta as the common format in OneLake, so a notebook, the SQL endpoint and a Power BI model read the same table without copies.',
        fu: [['Does it support updates?', 'Yes: it writes new files and marks old ones as removed in the log.'], ['Where is the history?', 'In the log, and in DESCRIBE HISTORY.']],
        trap: 'Saying that it is just Parquet.',
        real: 'Say how you checked a table that looked wrong.'
      }),

      B.qa({
        id: 'qa-time', t: 1, tag: 'Fabric', secs: 60,
        q: 'What is time travel, and when does it stop working?',
        pts: ['VERSION AS OF and TIMESTAMP AS OF', 'Each commit lists its own files', 'It needs those files to exist', 'VACUUM removes them after the retention'],
        short: 'Every commit in the Delta log lists the files that make up that version, so I can read the table as of a version number or a timestamp. In my recording the bronze table held 2,000 rows at version 0 and 10,157 at version 4. It works only while the Parquet files of that version still exist. `VACUUM` deletes files that no current version uses and that are older than the retention period, 7 days by default. After a vacuum with zero hours, reading an old version failed with a file-not-found error. So the retention is the length of the history I can promise, and I keep it at the default or longer.',
        fu: [['How do you undo a bad load?', 'RESTORE to a version, while its files exist.'], ['Is it a backup?', 'No. It is history inside the same storage.']],
        trap: 'Treating time travel as a backup.',
        real: 'Describe a time you compared a table with an earlier version.'
      }),

      B.qa({
        id: 'qa-files', t: 1, tag: 'Fabric', secs: 60,
        q: 'What is the difference between the Files area and the Tables area of a lakehouse?',
        pts: ['Files: any file, no schema', 'Tables: Delta, schema and log', 'Only Tables is visible to the SQL endpoint', 'Managed tables: drop deletes the data'],
        short: '**Files** holds files of any shape, such as the daily CSVs that land, and Spark reads them by path. It has no schema and no history. **Tables** holds Delta tables, each a folder with a log, and engines read them by name, including the SQL analytics endpoint and Power BI. A CSV in Files is not visible to them until a notebook writes it as a table. In my recording the landing CSVs sat in Files and the bronze, silver and gold tables in Tables. Tables under Tables are managed, so dropping one deletes its data, while an external table or a shortcut points at data that somebody else owns, and dropping it removes only the name.',
        fu: [['Where do raw files go?', 'Files/landing, kept so that bronze can be rebuilt.'], ['Can a table live in Files?', 'As an external Delta table, yes, but the lakehouse does not manage it.']],
        trap: 'Dropping a table that you thought was external.',
        real: 'Say what you keep in Files.'
      }),

      B.qa({
        id: 'qa-shortcut', t: 2, tag: 'Fabric', secs: 75,
        q: 'Shortcut, copy or mirroring: how do you decide?',
        pts: ['Shortcut: no copy, live, read-only', 'Copy: a snapshot on a schedule', 'Mirroring: continuous replication of a database', 'Ownership, freshness and dependencies'],
        short: 'I ask who owns the data and how fresh it must be. A **shortcut** is a logical link to data in another workspace or in external storage, so nothing is copied and I read what the source holds now. It fits data that somebody else owns, and I depend on their availability and permissions. A **copy** with a pipeline gives a stable snapshot that I control, at the cost of a schedule, storage and staleness. **Mirroring** replicates a supported operational database into OneLake and keeps it close to the source, which suits continuous change capture without writing the pipeline. All three are from documentation, I did not run them, and I would check which sources and features are supported today.',
        fu: [['Can you write through a shortcut?', 'It depends on the target and the permissions. Check the documentation.'], ['What if the source goes down?', 'Then reads through the shortcut fail.']],
        trap: 'Copying data that a shortcut could read.',
        real: 'Describe a feed that you would put behind a shortcut.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Log Reader', color: '#99F6E4',
        pts: [
          'A Delta table is **Parquet files plus a `_delta_log`**. The commit is the log file.',
          'Bronze had **' + BL.commits + '** commits and **' + BL.parquet_files + '** files after five appends, with every column as text.',
          '`VERSION AS OF` read **' + n(TT[0][1]) + '** rows at version 0 and **' + n(TT[4][1]) + '** at version 4.',
          'A **managed** drop deletes data. An **external** drop and a shortcut keep it.',
          'Never delete data files by hand. A vacuum with zero hours made version 5 unreadable.'
        ],
        lines: [
          'I can say what is inside a table folder.',
          'I can read an older version of a table.',
          'I know which drops delete data.'
        ]
      })
    ]
  });
})();
