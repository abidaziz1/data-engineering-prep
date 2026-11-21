/* Mission 3: notebooks and Spark. What Fabric Spark is, and the bronze notebook that ran on real Spark and Delta Lake. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var BH = G.table('bronze.history').rows, BL = C('bronze.log'), LA = G.table('lake.landing').rows, IN = C('bronze.infer');
  var PY = G.file('01_bronze.py');
  G.expect(BL.all_strings === true && BL.rows === 10157 && BL.commits === 5, 'bronze keeps every column as text and holds 10,157 rows');
  G.expect(LA.length === 5 && LA[1][1] === 2012 && LA[3][1] === 2100 && LA[4][1] === 2040, 'the five daily files');
  G.expect(IN.amount_type_day1 === 'double' && IN.amount_type_day3 === 'string' && IN.rows_after_failed_append === 2000 && !!IN.condition, 'schema inference reads amount as a number in day 1 and as text in day 3, and the append fails');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Notebooks and Spark', short: 'Spark', blurb: 'A notebook lands a file in a bronze table', minutes: 20,
    focus: ['ing'],
    goals: [
      'Say what **Fabric Spark** is, and what a **session** and a **default lakehouse** do.',
      'Write the **bronze** step: read a file and **append** it as a Delta table.',
      'Say why bronze keeps **every column as text**.',
      'Recognize a **schema mismatch** caused by schema inference.'
    ],
    say: 'A Fabric notebook is where most of the table work happens, and it is plain PySpark. The code on these screens is the notebook that I ran on real Spark and Delta Lake, with the files in a folder that is laid out like a lakehouse. What Fabric adds around it (sessions, pools, runtimes) is from documentation, and I say so. We land the daily file as bronze first.',
    scenes: [
      B.talk({
        id: 'm3-spark', t: 1, src: 'docs', title: 'Fabric Spark in four points',
        say: 'You do not need to learn a new Spark. You need to know what surrounds it. Press Next for each point.',
        items: [
          ['It is Apache Spark', 'A notebook runs PySpark, Spark SQL, Scala or R on a **Spark session**. The session is a cluster that Fabric starts for you and that takes units from your capacity while it runs. The Spark code of this course is ordinary Spark.', 'Ordinary Spark on a capacity.'],
          ['A default lakehouse', 'A notebook can attach a **default lakehouse**. Then `Files/landing/...` is a path inside it, and `spark.table("bronze_orders")` is a table of it. The recording works the same way: the code runs in a folder that has Files and Tables folders.', 'The default lakehouse gives short paths and names.'],
          ['Pools and sessions', 'Starting a session takes time and cores. Fabric offers **starter pools** that start much faster than a custom pool, and **custom pools** that you size yourself. The sizes you may use depend on the capacity, as mission 1 showed.', 'Starter pools start fast. Custom pools are yours.'],
          ['The runtime sets the versions', 'A Fabric **runtime** fixes the versions of Spark and Delta Lake. The documentation lists Runtime 1.3 and Runtime 2.0, and says that Runtime 2.0 has Spark 4.1 and Delta 4.2, is generally available and is not the default. This course ran Spark ' + M('spark') + ' and Delta ' + M('delta') + '. Check the versions of the runtime that your workspace uses.', 'Check the runtime version before you rely on a feature.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm3-landing', t: 1, src: 'rec', title: 'The five files that land, and what is wrong with them',
        say: 'These are the five daily files of Brewline in Files/landing. Each one has a problem that a real feed would have. Press Next to read them.',
        cols: ['File', 'Lines', 'Bytes', 'What is in it'],
        hl: 0,
        rows: [
          [LA[0][0], n(LA[0][1]), n(LA[0][2]), '2,000 new orders. Nothing is wrong'],
          [LA[1][0], n(LA[1][1]), n(LA[1][2]), '2,000 new orders and **12 lines with no order id**'],
          [LA[2][0], n(LA[2][1]), n(LA[2][2]), '2,000 new orders and **5 lines whose amount is "n/a"**'],
          [LA[3][0], n(LA[3][1]), n(LA[3][2]), '2,000 new orders and **100 orders of the day before, sent again**'],
          [LA[4][0], n(LA[4][1]), n(LA[4][2]), '2,000 new orders and **40 orders of the day before with a changed status**']
        ],
        steps: [
          { upto: 3, say: 'Two files carry bad lines. The load must not stop on them, and it must not hide them. Bronze keeps them, and mission 4 routes them.' },
          { upto: 5, say: 'Two files carry lines that were seen before. A load that appends them blindly would double the orders, or keep the old status. That is the problem of mission 4.' }
        ]
      }),

      B.code({
        id: 'm3-code', t: 1, src: 'rec', title: 'The bronze notebook', file: '01_bronze.py', lang: 'python', code: PY,
        steps: [
          { say: 'This is the first cell of the notebook. It lands **one day** in bronze. It ran on the five files of the recording. Press Next.', lines: null },
          { say: 'The path is **relative**: `Files/landing/...` inside the default lakehouse. A date goes in, and the file of that date is read.', lines: G.span(PY, /path = f"Files/) },
          { say: '`header=True` takes the column names from the first line, and nothing else is set, so **every column stays a string**. There is no `inferSchema`. Bronze records what arrived and does not judge it.', lines: G.span(PY, /spark\.read\.option\("header"/, /\.csv\(path\)/) },
          { say: 'The name of the **source file** is added as a column. Later steps use it to find the rows of one day, and an auditor can use it to find where a row came from.', lines: G.span(PY, /withColumn\("_source_file"/) },
          { say: '`mode("append")` and `saveAsTable` write a Delta table in the lakehouse. The first call creates the table, and every later call adds a commit. Nothing is merged and nothing is removed.', lines: G.span(PY, /df\.write\.format/) }
        ],
        note: 'In the recording each call wrote one commit. The table has five versions after five days.'
      }),

      B.term({
        id: 'm3-run', t: 1, src: 'rec', title: 'Run it for five days',
        say: 'I called `land` for each of the five dates and then looked at the history of the table.',
        lines: function () {
          var pairs = [];
          pairs = LA.map(function (r, k) { return ['land("2026-03-0' + (k + 1) + '")', String(r[1])]; });
          pairs.push(['DESCRIBE HISTORY bronze_orders;   -- version, operation, files added, rows written', BH.map(function (r) { return r[0] + ' | ' + r[1] + ' | ' + r[2] + ' | ' + r[3]; }).join('\n')]);
          return G.term(pairs);
        },
        after: 'Five calls, five commits and **' + n(BL.rows) + '** rows: the sum of the five files. The first call shows as `CREATE TABLE AS SELECT` because it created the table, and the others as `WRITE`. Bronze now holds the two bad days **as they came**, which is the point of it.',
        afterKind: 'tip',
        doneSay: 'Five calls, five commits, nothing lost.'
      }),

      B.term({
        id: 'm3-sample', t: 1, src: 'rec', title: 'Everything in bronze is text',
        say: 'I read three rows of bronze and asked for the type of each column.',
        lines: function () { return G.plain(X('bronze.sample')).concat([{ c: 'cmd', t: '$ spark.table("bronze_orders").dtypes', d: 350 }, { c: 'out', t: BL.columns.map(function (c) { return c + ': string'; }).join(', '), d: 40 }]); },
        after: 'Every column is a **string**, including the amount and the timestamp, and the table holds ' + n(BL.rows) + ' rows from all five files. Typing happens in silver, where a row that cannot be typed can be sent somewhere on purpose.',
        afterKind: 'tip',
        doneSay: 'Bronze keeps text. Silver gives the types.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This notebook loads bronze with a "convenient" setting. It works on day 1 and fails on day 3. Click the line that causes it.',
        file: 'bronze_infer.py', lang: 'python',
        code: 'def land(day):\n    df = (\n        spark.read.option("header", True)\n        .option("inferSchema", True)\n        .csv(f"Files/landing/orders_{day}.csv")\n    )\n    df.write.format("delta").mode("append").saveAsTable("bronze_infer")\n',
        bad: [4],
        hint: 'What type does a column get when one value is "n/a"?',
        why: 'Schema inference looks at the **data of the file** each time. In day 1 the amount column read as `' + IN.amount_type_day1 + '`, and in day 3, where five amounts are "n/a", it read as `' + IN.amount_type_day3 + '`, so the append was refused with `' + IN.condition + '` and the table kept its ' + n(IN.rows_after_failed_append) + ' rows. A load whose result depends on the content of the file fails on the first odd file. Read bronze **as text**, or give an explicit schema.',
        fix: 'def land(day):\n    df = (\n        spark.read.option("header", True)       # every column stays a string\n        .csv(f"Files/landing/orders_{day}.csv")\n    )\n    df.write.format("delta").mode("append").saveAsTable("bronze_orders")\n',
        cheer: 'Bronze keeps text.'
      }),

      B.term({
        id: 'm3-infer', t: 1, src: 'rec', title: 'The error that the day 3 file causes',
        say: 'Here is what Delta Lake printed when the day 3 file was appended to the table that day 1 had created with inferred types.',
        lines: function () { return G.plain(X('bronze.infer_error')); },
        after: 'Delta checks the **schema of every write** against the schema of the table, and refuses a write that does not fit. That is **schema enforcement**, and mission 5 shows it again. The error is useful here: it stopped a table from getting a column that is sometimes a number and sometimes text.',
        afterKind: 'warn',
        doneSay: 'Delta refuses a write whose schema does not fit.'
      }),

      B.cmp({
        id: 'm3-run-modes', t: 2, src: 'docs', title: 'Ways to run Spark code in Fabric',
        say: 'A notebook is not the only way to run code on Spark. Press Next to compare three.',
        cols: ['', 'Notebook', 'Spark job definition', 'Notebook in a pipeline'],
        hl: 1,
        rows: [
          ['What it is', 'Cells that you edit and run', 'A batch job from a main file, with arguments', 'A pipeline activity that runs a notebook'],
          ['Good for', 'Development, exploration, small jobs', 'Packaged, reviewed code that runs without a person', 'Scheduling and ordering notebooks'],
          ['Watch for', 'Cells run in the order that you click', 'Less interactive to develop', 'Parameters, retries and the session start time']
        ],
        steps: [
          { upto: 2, say: 'A notebook is where you develop. A Spark job definition is the form for code that is packaged and run as a job.' },
          { upto: 3, say: 'In production, notebooks usually run from a pipeline, with a day as a parameter. Mission 7 does that.' }
        ]
      }),

      B.talk({
        id: 'm3-vorder', t: 3, src: 'docs', title: 'V-Order and resource profiles',
        say: 'Two Fabric settings that you can hear about in an interview. Press Next for each.',
        items: [
          ['V-Order', 'V-Order is a write-time optimization of Parquet files for Fabric engines such as the SQL endpoint and Power BI. The documentation says new workspaces ship with it **off** for Spark, and that you can switch it on in a session or per table with the table property `delta.parquet.vorder.enabled`. An older page says that it is on by default. This did not run here, because it is a Fabric feature, and the files of the recording are ordinary Parquet.', 'Check the default of your workspace.'],
          ['Resource profiles', 'A profile is a set of Spark settings for a workload. New workspaces start on a profile for write-heavy work, which has V-Order off, and a read-heavy profile switches it on. The idea is to tune the write for the readers that matter.', 'A profile tunes the write for its readers.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Why does the bronze notebook read the CSV without schema inference?',
        opts: [
          { t: 'So that every column stays text and a strange value cannot break the load', fb: '' },
          { t: 'Because Spark cannot infer types from a CSV', fb: 'It can, and the recording shows what it did on day 3.' },
          { t: 'Because Delta tables cannot hold numbers', fb: 'They can. Silver holds a decimal amount.' },
          { t: 'To make the file smaller', fb: 'The size does not change.' }
        ],
        ok: 0, why: 'With inference the amount column was `' + IN.amount_type_day1 + '` on day 1 and `' + IN.amount_type_day3 + '` on day 3, and the append failed. As text, all five files load.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'What does `mode("append")` do when it writes a Delta table that already exists?',
        opts: [
          { t: 'Adds the new rows as a new version and keeps the old ones', fb: '' },
          { t: 'Replaces the table', fb: 'That is `overwrite`.' },
          { t: 'Merges rows with the same key', fb: 'An append has no key. A merge does, and mission 4 uses it.' },
          { t: 'Fails if the table exists', fb: 'That is `errorifexists`.' }
        ],
        ok: 0, why: 'Each of the five calls added one commit. The table went from ' + n(BH[0][3]) + ' rows at version 0 to ' + n(BL.rows) + ' at version 4.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1, src: 'docs',
        q: 'In a notebook with a default lakehouse, what does the path `Files/landing/orders_2026-03-01.csv` point to?',
        opts: [
          { t: 'A file in the Files area of the default lakehouse', fb: '' },
          { t: 'A table called landing', fb: 'Tables are read by name, and Files is for files.' },
          { t: 'A file on your laptop', fb: 'The notebook runs on Spark in Fabric.' },
          { t: 'A file in every lakehouse of the workspace', fb: 'A relative path uses the default lakehouse only.' }
        ],
        ok: 0, why: 'The default lakehouse is what makes relative paths and short table names work. Without one, a notebook needs full paths.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps of the bronze notebook in order.',
        items: ['Build the path of the file from the date', 'Read the CSV with a header and no type inference', 'Add the name of the source file as a column', 'Append to the bronze Delta table', 'Check the number of rows against the file'],
        why: 'Read as text, add the audit column, append, and compare counts. Bronze changes nothing in the data.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision: how should bronze store the columns?',
        scenario: 'The daily feed has 6 columns. Some days a value is blank or says "n/a". Analysts ask for typed columns "so that they can use bronze directly".',
        opts: [
          { t: 'Keep every column as text in bronze, and type them in silver', d: 'Every line of every file lands. The recording kept the 12 blank ids and 5 "n/a" amounts in bronze and sent them to a rejects table in silver.', lose: 'Bronze is not friendly for analysts. They use silver or gold.' },
          { t: 'Infer the types when reading', d: 'Typed columns with no extra code.', lose: 'The result changes with the content of the file. In the recording the append of day 3 failed and the table stopped taking days.' },
          { t: 'Give an explicit schema with types and drop the lines that do not fit', d: 'Typed bronze with a stable schema.', lose: 'Rows that do not fit are lost without a trace, and you cannot rebuild silver from bronze.' }
        ],
        pick: 0,
        why: 'Bronze is the record of what arrived. Keeping text is the only choice that cannot fail on a strange value and cannot lose a line. The cost is one more layer for the analysts, and that layer is what silver is for.',
        when: 'A feed whose producer enforces a schema can use an explicit schema in bronze.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the nightly bronze load fails on Wednesday', time: '03:20',
        alert: '**The notebook failed with a schema mismatch when it wrote bronze_orders.** Monday and Tuesday loaded fine. The new file has 2,005 lines, and the dashboard shows Tuesday\'s data.',
        clues: ['The notebook reads the file with `inferSchema`', 'The amount column of the table is a number', 'The new file has five lines where the amount is "n/a"'],
        opts: [
          { t: 'Read the file as text, as bronze should, so that Wednesday loads and the five lines are visible', fb: '' },
          { t: 'Turn on `mergeSchema` so that the write is accepted', fb: 'It would change the table. A column that is sometimes a number and sometimes text is the problem, not a missing column.' },
          { t: 'Delete the five lines from the file by hand', fb: 'You would lose evidence, and the next file may have other lines.' },
          { t: 'Rerun the notebook until it passes', fb: 'It fails the same way each time.' }
        ],
        best: 0,
        why: 'The recording: day 1 read the amount as `' + IN.amount_type_day1 + '`, day 3 as `' + IN.amount_type_day3 + '`, and the append was refused with `' + IN.condition + '`. Reading everything as text makes the load independent of the content, and silver handles the five lines.',
        checks: [
          ['Read the error', 'It names a schema mismatch for the amount column.'],
          ['Find the setting', '`inferSchema` makes the type depend on the file.'],
          ['Look at the file', 'Five lines with "n/a" in the amount.'],
          ['Fix the notebook', 'Read as text. Route bad lines in silver.']
        ],
        tell: 'The bronze notebook inferred the amount as a number on good days and as text on the day with "n/a" values, and Delta refused the write because the schema changed. I changed the notebook to read everything as text, so Wednesday loads, and silver now sends the five bad lines to a rejects table.',
        prevent: ['**Read bronze as text**', 'Keep a **rejects table** and alert on its size', '**Test** the load with a file that has bad lines']
      }),

      B.qa({
        id: 'qa-notebook', t: 1, tag: 'Fabric', secs: 75,
        q: 'How would you load a daily file into a lakehouse from a notebook?',
        pts: ['Land the file in Files', 'Read it as text, add the source file', 'Append to a bronze Delta table', 'Type and merge in silver'],
        short: 'The file lands in the Files area, for example `Files/landing/orders_2026-03-01.csv`. A notebook with the lakehouse as its default reads it with a header and **no type inference**, so every column stays text, adds the name of the source file as a column, and **appends** it to a bronze Delta table with `saveAsTable`. Bronze records what arrived, including bad lines. A second step types the columns, sends rows that cannot be typed to a rejects table, and merges the rest into silver by key. I ran this on real Spark and Delta: five files gave five commits and 10,157 rows, and reading with schema inference failed on the day that had "n/a" in an amount.',
        fu: [['Why not overwrite?', 'You lose the history of what arrived, and a failure leaves you with less.'], ['Where do you parameterize it?', 'The date is a parameter that a pipeline passes in.']],
        trap: 'Inferring types in bronze.',
        real: 'Say how your last load handled a bad line.'
      }),

      B.qa({
        id: 'qa-default-lh', t: 1, tag: 'Fabric', secs: 45,
        q: 'What does it mean to attach a default lakehouse to a notebook?',
        pts: ['Relative Files paths work', 'Tables by short name', 'The notebook knows which lakehouse to write to', 'Without it, use full paths'],
        short: 'The notebook is attached to one lakehouse as its default. After that, `Files/landing/...` is a path inside it and `spark.table("bronze_orders")` reads a table of it, so the code has short, stable paths and names and does not carry the identifiers of a workspace. It also means the code runs against whichever lakehouse is attached, which is useful when the same notebook runs in development and in production. Without a default lakehouse, the notebook needs full paths. This is from documentation, and in my recording the code ran in a folder with the same shape, so that the relative paths worked the same way.',
        fu: [['Can a notebook use two lakehouses?', 'Yes, with full paths for the second one.'], ['How do you switch environments?', 'Attach another lakehouse, or pass it in as a parameter.']],
        trap: 'Hard-coding a workspace id in the notebook.',
        real: 'Say how your notebooks find their data.'
      }),

      B.qa({
        id: 'qa-bronze-text', t: 1, tag: 'Fabric', secs: 60,
        q: 'Why do you keep bronze columns as text?',
        pts: ['Nothing can fail on a strange value', 'Nothing is lost', 'You can rebuild silver', 'Typing happens where bad rows can be routed'],
        short: 'Bronze is the record of what arrived, so it must accept anything. If I infer types, the result depends on the file. In my recording the amount was a number on day 1 and text on day 3, where five lines said "n/a", and the append failed. If I drop lines that do not fit, I lose evidence and cannot rebuild silver. Reading everything as text makes the load independent of the content: all 10,157 lines of the five files landed, including 12 with no order id and five with a bad amount. Silver then casts with `try_cast`, sends the lines that cannot be typed to a rejects table with a reason, and merges the rest.',
        fu: [['Is it ever typed?', 'If the producer guarantees a schema, an explicit schema is fine.'], ['What about size?', 'Text costs some space in Parquet. I accept it for bronze.']],
        trap: 'Dropping rows silently.',
        real: 'Describe a feed that broke a typed load.'
      }),

      B.qa({
        id: 'qa-vorder', t: 3, tag: 'Fabric', secs: 60,
        q: 'What is V-Order?',
        pts: ['A write-time Parquet optimization for Fabric engines', 'Helps reads from SQL and Power BI', 'A setting per session or table', 'Check the default of the workspace'],
        short: 'V-Order is a write-time optimization of Parquet files that Microsoft built for Fabric engines such as the SQL analytics endpoint and Power BI, and it helps the reads of those engines at some cost at write time. It is a setting: a Spark session property, or a table property named `delta.parquet.vorder.enabled`. In the documentation that I read through search summaries, new workspaces ship with it off for Spark and the write-heavy profile keeps it off, and a read-heavy profile turns it on, but one older page still says it is on by default, so I would check the workspace. I did not run it, because it is a Fabric feature, and my recorded files are ordinary Parquet.',
        fu: [['Does it change the table format?', 'The files stay valid Parquet and Delta, from documentation.'], ['When would you enable it?', 'For tables that dashboards read heavily.']],
        trap: 'Saying that it is always on.',
        real: 'Say how you would measure whether it helps.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Notebook Runner', color: '#99F6E4',
        pts: [
          'Fabric Spark is **Apache Spark** on your capacity. A default lakehouse gives short paths and names.',
          'Bronze reads the file **as text**, adds the source file and **appends**. Five days gave **' + BL.commits + '** commits and **' + n(BL.rows) + '** rows.',
          'Schema inference read the amount as `' + IN.amount_type_day1 + '` on day 1 and `' + IN.amount_type_day3 + '` on day 3, and the append failed.',
          'Delta **enforces the schema** of every write.',
          'The runtime fixes the Spark and Delta versions. Check it. V-Order is a Fabric setting that did not run here.'
        ],
        lines: [
          'I can write the bronze step.',
          'I can say why bronze is text.',
          'I know what a default lakehouse does.'
        ]
      })
    ]
  });
})();
