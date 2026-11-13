/* Mission 1: the map. What Python does in a data platform, the fragile Brewline script, what running it twice does, and what a notebook hides. */
(function () {
  var B = LAB.b, G = LAB.get;
  var V7 = G.file('m1/load_orders_v7.py'), V8 = G.file('m1/load_orders_v8.py'), PF = G.file('m1/partial_failure.py'), NB = G.file('m1/notebook_cells.py');
  var T7a = G.text('m1/load_orders_v7.py#1'), T7b = G.text('m1/load_orders_v7.py#2');
  var PFa = G.text('m1/partial_failure.py#1'), PFb = G.text('m1/partial_failure.py#2');
  var T8a = G.text('m1/load_orders_v8.py#1'), T8b = G.text('m1/load_orders_v8.py#2');
  var NBT = G.text('m1/notebook_cells.py'), VER = G.text('m1/versions.py');

  function tup(t) { var m = /\((\d+), (\d+), ([\d.]+)\)/.exec(t); G.expect(!!m, 'a (rows, orders, total) line in the output'); return { n: +m[1], d: +m[2], sum: m[3] }; }
  var R1 = tup(T7a), R2 = tup(T7b), K1 = tup(T8a), K2 = tup(T8b);
  G.expect(R1.n === 6 && R1.d === 6 && R2.n === 12 && R2.d === 6, 'the first run holds 6 rows and the second run 12 rows for 6 orders');
  G.expect(K1.n === 6 && K2.n === 6 && K1.sum === K2.sum, 'the safe script holds 6 rows after both runs');
  G.expect(/loaded 2 of 4/.test(PFa) && /O-1007.*O-1007/.test(PFb), 'the partial run loads 2 rows, and the rerun holds them twice');
  function nbNum(label) { var l = NBT.split('\n').filter(function (x) { return x.indexOf(label) === 0; })[0]; G.expect(!!l, 'notebook line ' + label); return l.trim().split(/\s+/).pop(); }
  var N_ORDER = nbNum('top to bottom'), N_TWICE = nbNum('cell 2 pressed twice'), N_TAX = nbNum('tax before');
  G.expect(N_ORDER === '13.63' && N_TWICE === '27.25' && N_TAX === '12.5', 'the three notebook runs give 13.63, 27.25 and 12.5');
  var PYV = G.meta('python'), PANDAS = G.meta('pandas');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map: Python in a data platform', short: 'Map', blurb: 'What Python does in a data platform, and how a Brewline script fails', minutes: 22,
    focus: ['src', 'stg', 'ing', 'mart', 'con'],
    goals: [
      'Say what **Python does in a data platform**, and where something else should do the work.',
      'Read the Brewline script and name **why running it twice doubles the table**.',
      'Explain what a **notebook hides**, and why a script is what you run in production.',
      'Say what **idempotent** means, and read a version of the script that is.',
      'Know which mission of this course fixes which failure.'
    ],
    say: 'Mission 1 is the map. Brewline has one script that works on one laptop, and this mission shows five ways it breaks. The runs on these screens are real: I ran the script with Python ' + PYV + ' and wrote down what it printed. The rest of the course takes the failures one at a time.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, src: 'docs', title: 'What Python does in a data platform',
        say: 'Python is the language of the glue. Press Next for the five jobs it does, and then for the jobs that belong to something else.',
        items: [
          ['It gets data in', 'A script calls an API, reads files from SFTP, queries a database or reads a message. It handles the awkward parts: logins, pages, retries, odd file formats.', 'Extract.'],
          ['It reshapes what SQL cannot reach', 'Parsing a log line, flattening nested JSON, calling a library, cleaning a text field. For joins and aggregates on large tables, SQL in the warehouse is usually the better tool.', 'Transform, when SQL is not enough.'],
          ['It checks data at the edges', 'Validate a row before it is stored, quarantine what fails, count what went in and what came out.', 'Guard.'],
          ['It describes the pipeline', 'Airflow, Dagster and Prefect describe tasks and their order in Python code. Tests, deployment scripts and tools around the pipeline are Python too.', 'Orchestrate and test.'],
          ['It stays small', 'A job is a short program with one purpose. It reads from one place, writes to another, and says what it did. Big jobs are made of small ones.', 'Small, named, repeatable.'],
          ['It is not the engine', 'Joining two 100 GB tables in a Python loop is slow and uses a lot of memory. Give that work to the warehouse, Spark or DuckDB, and use Python to start it and check the result.', 'Know where the work should run.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm1-flow', t: 1, src: 'docs', title: 'Brewline Python jobs in the platform', g: 'master', legend: true,
        steps: [
          { say: 'This is the platform the course builds, drawn small. Three sources, three jobs, one warehouse, and five things around them that decide whether it can be trusted. Press Next to follow an order.', cap: 'Three jobs and five supports.' },
          { say: 'Step 1. The extract job reads from three places: a database export, a partner API and supplier files. Each one fails in its own way: a changed column, a rate limit, a half-uploaded file.', on: ['e1a', 'e1b', 'e1c'], focus: ['s_db', 's_api', 's_file', 'j_ext'], cap: 'Reading is the risky part.' },
          { say: 'Step 2. Extract hands over what it read, as files or in memory. It should not hand over a half-read batch.', on: ['e2'], focus: ['j_ext', 'j_tr'], cap: 'Hand over whole batches.' },
          { say: 'Step 3. Transform fixes types, drops duplicates, converts time zones and joins the small tables. This is plain functions, so it is the easiest part to test.', on: ['e3'], focus: ['j_tr', 'j_ld'], cap: 'Plain functions.' },
          { say: 'Step 4. Load writes to the warehouse. If it runs twice, or stops halfway, the table must still be right. This is where idempotency lives.', on: ['e4'], focus: ['j_ld', 'wh'], cap: 'Safe to run twice.' },
          { say: 'Around the jobs: an environment that is the same everywhere, config and secrets kept out of the code, tests that run before a change ships, logs that say what happened, and a scheduler that runs the jobs. Each has its own mission.', focus: ['c_env', 'c_cfg', 'c_test', 'c_log', 'c_sch'], cap: 'The five supports.' }
        ]
      }),

      B.cmp({
        id: 'm1-where', t: 1, src: 'docs', title: 'Python, or something else?',
        say: 'Good engineers do not use Python for everything. Press Next to read which jobs fit it, and which fit another tool.',
        cols: ['The job', 'Python is a good fit when', 'Reach for something else when'],
        hl: 1,
        rows: [
          ['Call an API', 'You need pages, retries, a token and a clear log of what came back.', 'A managed connector already does it and you only need the data.'],
          ['Parse a messy file', 'The format is odd, or the rules are many, or you need a library for it.', 'The file is a clean CSV that the warehouse can load directly.'],
          ['Clean one million rows', 'It fits in memory and you use pandas, Polars or DuckDB, not a Python loop.', 'It is already in the warehouse. A SQL statement is shorter and faster.'],
          ['Join two huge tables', 'Never as a Python loop.', 'The warehouse, Spark or DuckDB join them. Python starts the job.'],
          ['Run every night', 'Python describes the job and the order of the tasks.', 'A scheduler runs it. Do not write your own loop with `time.sleep`.'],
          ['Check the data', 'Rules are code: types, ranges, uniqueness, quarantine of bad rows.', 'The rule is a simple SQL test that the warehouse tool already runs.']
        ],
        steps: [
          { upto: 2, say: 'Python is strong at the edges: calling things and reading things that have no clean format.' },
          { upto: 4, say: 'For volume, give the work to an engine and keep Python as the driver.' },
          { upto: 6, say: 'Scheduling and checking are where a small tool beats a custom script.' }
        ],
        pick: 'Use Python for **the edges and the glue**, and a data engine for **volume**. If a SQL statement does the job, write the statement.'
      }),

      B.code({
        id: 'm1-v7', t: 1, src: 'rec', title: 'The script that runs from cron', file: 'load_orders_v7.py', lang: 'python', code: V7,
        steps: [
          { say: 'Meet load_orders_v7. It reads every CSV in `incoming/`, adds a day to each row and writes the rows to a SQLite table. Mina wrote it on her laptop and cron runs it each night. Python ' + PYV + ' ran this exact file for the recording.', lines: null },
          { say: 'It connects to a database file and creates a table if it is missing. There is no primary key, so the table accepts the same order any number of times.', lines: G.span(V7, /^con = sqlite3/, /^con.execute\("CREATE/) },
          { say: 'It reads every file that matches `incoming/*.csv`. Note `open(path)` with no `with` and no encoding. The file is closed when Python gets around to it, and the encoding is whatever the machine says.', lines: G.span(V7, /^for path in glob/, /csv\.DictReader/) },
          { say: 'It turns the total into a float, and sets `day` to today. Two quiet bugs: money as a float, and the day of the load instead of the day of the order.', lines: G.span(V7, /r\["total"\] = float/, /datetime\.date\.today/) },
          { say: 'It inserts every row. This is plain `INSERT`, so a second run adds the same orders again.', lines: G.span(V7, /^for r in rows/, /^con\.commit/) },
          { say: 'Last, it prints the number of rows, the number of distinct orders and the total, so a person can see if the run looks right.', lines: G.span(V7, /^print\("loaded"/) }
        ],
        note: 'The script is short on purpose. Most scripts that cause incidents are.'
      }),

      B.term({
        id: 'm1-run7', t: 1, src: 'rec', title: 'Cron runs it twice',
        say: 'The first night the job ran, and then a retry wrapper around cron started it again after a timeout. These are two real runs of the file you just read, in a folder with six orders.',
        lines: function () { return G.plain(T7a, { cmd: 'python load_orders_v7.py   # night 1' }).concat(G.plain(T7b, { cmd: 'python load_orders_v7.py   # the wrapper runs it again' })); },
        after: 'After the second run the table holds **' + R2.n + ' rows for ' + R2.d + ' orders**, and the total is **' + R2.sum + '** instead of ' + R1.sum + '. Nothing failed. Nothing printed a warning. A report on this table is now wrong by a factor of two. The last line is also worth reading: every row has the same `day`, which is the day the script ran, not the day of the order.',
        afterKind: 'warn',
        doneSay: 'No error and a wrong table is the worst result a script can give. The rest of this mission is about not trusting a script that cannot be run twice.'
      }),

      B.bug({
        id: 'm1-bug1', t: 1, src: 'rec', q: 'This is the loading step of load_orders_v7. A second run doubles the table. Click the line that makes that possible.',
        file: 'load_orders_v7.py', lang: 'python',
        code: ['con = sqlite3.connect("warehouse.db")', 'con.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL, day TEXT)")', '', 'for r in rows:', '    con.execute("INSERT INTO orders VALUES (?, ?, ?, ?)", (r["order_id"], r["customer_id"], r["total"], r["day"]))', 'con.commit()'].join('\n'),
        bad: [2],
        hint: 'What stops the database from storing the same order_id twice?',
        why: 'The table has no primary key and the statement is a plain `INSERT`, so the database accepts a repeated order. In the recording the second run held ' + R2.n + ' rows for ' + R2.d + ' orders. The fix is a key on `order_id` and an upsert, which version 8 shows.',
        fix: ['con = sqlite3.connect("warehouse.db")', 'con.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT PRIMARY KEY, customer_id TEXT, total_cents INTEGER, ordered_at TEXT)")', '', 'with con:', '    con.executemany("INSERT INTO orders VALUES (?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET total_cents = excluded.total_cents", rows)'].join('\n'),
        cheer: 'A key plus an upsert is the simplest way to make a load safe to repeat.'
      }),

      B.term({
        id: 'm1-partial', t: 1, src: 'rec', title: 'The file with a bad value',
        say: 'On another night the supplier file has `n/a` in the total of the third row. The loop commits one row at a time. Read the first run, then the run after somebody restarts the job.',
        lines: function () { return G.plain(PFa, { cmd: 'python partial_failure.py   # night 3' }).concat(G.plain(PFb, { cmd: 'python partial_failure.py   # restarted in the morning' })); },
        after: 'The first run stopped after **2 of 4 rows**, and the table kept them because each row was committed. The restart read the file from the top, so the first two orders are now in the table **twice**. A job that can stop halfway leaves a state that a second run cannot repair. The tools for this are transactions, and a load that replaces rows by key. Mission 7 covers both.',
        afterKind: 'warn',
        doneSay: 'A crash is not the problem. A crash that leaves half the work in place, with a restart that repeats it, is the problem.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1, src: 'rec',
        q: 'In the recording, the second run of load_orders_v7 finished without an error. What does the table hold afterwards?',
        opts: [
          { t: R1.n + ' rows, because a second run does nothing when the data is already there', fb: 'Nothing in the script checks for existing rows. The recording shows ' + R2.n + ' rows.' },
          { t: R2.n + ' rows for ' + R2.d + ' distinct orders, and every total is counted twice', fb: '' },
          { t: 'An error message about duplicate order ids', fb: 'The table has no key, so the database raises no error. That is the problem.' },
          { t: R2.d + ' rows, because SQLite removes duplicates when it commits', fb: 'SQLite stores what you insert. It deduplicates only when a key or a constraint says to.' }
        ],
        ok: 1, why: 'Plain `INSERT` into a table without a key adds the rows again. The count of distinct orders stayed at ' + R2.d + ' while the row count doubled. Printing both numbers is a cheap check that catches this.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1, src: 'rec',
        q: 'After the partial failure, the job is restarted and reads the same file from the top. Which statement about the table is true?',
        opts: [
          { t: 'It is correct, because the first run rolled back its rows', fb: 'Each row was committed on its own, so nothing rolled back.' },
          { t: 'It holds O-1007 and O-1008 twice, and O-1009 and O-1010 are still missing', fb: '' },
          { t: 'It holds all four orders once', fb: 'The restart stops at the same bad row again, so orders 9 and 10 never load.' },
          { t: 'It is empty, because the error cleared the table', fb: 'An error in Python does not touch the database unless you roll back.' }
        ],
        ok: 1, why: 'The file still has `n/a` in the third row, so the restart stops there again. The first two rows were inserted a second time. Two failures at once: duplicates, and orders that never arrive.'
      }),

      B.cmp({
        id: 'm1-fail', t: 1, src: 'docs', title: 'Five ways a script fails, and where this course fixes them',
        say: 'Version 7 shows two of these in real output. The others are ahead of you. Press Next to see where each one is fixed.',
        cols: ['The failure', 'What you see', 'Mission'],
        hl: 2,
        rows: [
          ['It cannot run twice', 'Rows double after a restart, with no error', '7: retries and idempotency'],
          ['It stops halfway', 'Some rows loaded, some missing, a restart repeats the first ones', '7: transactions, and loads by key'],
          ['It trusts the clock', 'Orders land on the wrong day, and one hour a year goes missing', '6: dates, time zones and money'],
          ['It trusts memory', 'Fine on 10,000 rows, killed on 10 million', '4: generators, and 10: speed and memory'],
          ['It is not the same everywhere', 'Works on the laptop, fails on the server after a library upgrade', '2: environments and packaging'],
          ['Nobody can change it safely', 'No tests, one big file, a fix in one place breaks another', '12: tests, and 14: design']
        ],
        steps: [
          { upto: 2, say: 'The first two are the ones in the recording: a run that cannot be repeated, and a run that stops halfway.' },
          { upto: 4, say: 'The next two are about the clock and about memory. Both stay hidden until the data is large or the date is unlucky.' },
          { upto: 6, say: 'The last two are about people: the machine that runs the code, and the next person who has to change it.' }
        ],
        pick: 'Fix them in this order: **safe to repeat**, then **correct on dates**, then **bounded in memory**, then **tested**. A script that is wrong quietly costs more than one that is slow.'
      }),

      B.code({
        id: 'm1-nb', t: 1, src: 'rec', title: 'What a notebook hides', file: 'notebook_cells.py', lang: 'python', code: NB,
        steps: [
          { say: 'The data team used to run this logic in a notebook. A notebook is cells that share one set of variables. This file stands in for three cells, and it runs them in an order you choose.', lines: null },
          { say: 'Three cells: set a total to zero, add an order of 12.50, add 9 percent tax.', lines: G.span(NB, /^cells = \{/, /^\}$/) },
          { say: 'A function runs the cells in the order you give it, in one shared namespace, like a notebook does.', lines: G.span(NB, /^def run/, /return round/) },
          { say: 'Pressed top to bottom, the total is **' + N_ORDER + '**. Press cell 2 twice, which happens when you tweak it and rerun, and the answer is **' + N_TWICE + '**. Run the tax before the order and it is **' + N_TAX + '**. The code did not change. Only the order did.', lines: G.span(NB, /^print\("top to bottom/, /^print\("tax before/) }
        ],
        note: 'This is real output from Python ' + PYV + '. A script runs from the first line to the last, in the same order, every time. That is why a notebook is a good place to explore and a script is what you run at night.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1, src: 'rec',
        q: 'A colleague sends you a notebook with a total of ' + N_ORDER + ' and says it is correct. You rerun it top to bottom and get a different number. What is the most likely cause?',
        opts: [
          { t: 'Python is not deterministic', fb: 'The same code in the same order always gives the same result.' },
          { t: 'The notebook was last run in a different order, or cells were edited and run again, so it holds state that no longer matches the code', fb: '' },
          { t: 'The notebook is on a different Python version', fb: 'A version change can matter, but a different total from simple arithmetic points at hidden state first.' },
          { t: 'Jupyter rounds numbers differently', fb: 'The notebook does not change how numbers are rounded.' }
        ],
        ok: 1, why: 'In the recording the same three cells gave ' + N_ORDER + ', ' + N_TWICE + ' and ' + N_TAX + ' depending on the order. Restart the kernel and run all cells before you trust a notebook, and put anything that runs at night into a script.'
      }),

      B.cmp({
        id: 'm1-forms', t: 1, src: 'docs', title: 'Notebook, script, package, scheduled task',
        say: 'Code grows through four forms. Press Next to read what each is good for.',
        cols: ['Form', 'Good for', 'Weak at'],
        hl: 1,
        rows: [
          ['Notebook', 'Exploring data, drawing a chart, explaining a result to someone.', 'Running at night. Hidden state, hard to test, hard to review in a diff.'],
          ['Script', 'One job with a clear start and end. Run by hand or by cron.', 'Sharing code between jobs. Copies drift apart.'],
          ['Package', 'Code that many jobs share, with tests, a version and a lock file.', 'Quick experiments. It takes a little setup.'],
          ['Scheduled task', 'A script or a package function that an orchestrator runs, retries and watches.', 'Anything that has no clear input and output.']
        ],
        steps: [
          { upto: 2, say: 'Explore in a notebook. When it works, move the logic into a script.' },
          { upto: 4, say: 'When two scripts copy a function, make a package. When something must run daily, make it a task that an orchestrator runs.' }
        ],
        pick: 'Explore in a **notebook**, ship from a **script or package**, and let a **scheduler** run it. Never ship a notebook that you have not restarted and run top to bottom.'
      }),

      B.code({
        id: 'm1-v8', t: 1, src: 'rec', title: 'The same job, safe to run twice', file: 'load_orders_v8.py', lang: 'python', code: V8,
        steps: [
          { say: 'Version 8 does the same job. It was run twice for the recording, and the table was the same after both runs.', lines: null },
          { say: '`order_id` is a primary key now. The database itself refuses a second row for the same order.', lines: G.span(V8, /^con\.execute\("""CREATE/, /ordered_at TEXT\)"""\)/) },
          { say: 'Reading is a generator. It opens each file in a `with` block, with an explicit encoding and `newline=""`, and yields one tuple per row. The money is an integer number of cents, built from a `Decimal`, so there are no float errors.', lines: G.span(V8, /^def read_orders/, /yield \(r/) },
          { say: 'The write is one transaction, written as `with con:`. If an error is raised inside, SQLite rolls back and no half-loaded table remains.', lines: G.span(V8, /^with con:/, /read_orders\(/) },
          { say: 'The statement is an upsert: insert the row, and if the key exists, update it. Running it again rewrites the same values and changes nothing.', lines: G.span(V8, /"INSERT INTO orders VALUES/, /ordered_at = excluded/) }
        ],
        note: 'You will meet each idea again: generators in mission 4, files in mission 5, money in mission 6, transactions and upserts in missions 7 and 8.'
      }),

      B.term({
        id: 'm1-run8', t: 1, src: 'rec', title: 'Run it twice, get the same table',
        say: 'Same data, same two runs, version 8. Compare the numbers with the last recording.',
        lines: function () { return G.plain(T8a, { cmd: 'python load_orders_v8.py   # night 1' }).concat(G.plain(T8b, { cmd: 'python load_orders_v8.py   # the wrapper runs it again' })); },
        after: 'Both runs print **(' + K1.n + ', ' + K1.d + ', ' + K1.sum + ')**: ' + K1.n + ' rows, ' + K1.d + ' distinct orders, and a total of ' + K1.sum + ' cents. The row count never moved. A job with this property is called **idempotent**: running it once or ten times leaves the same result.',
        afterKind: 'tip',
        doneSay: 'Idempotent is the word an interviewer listens for. Say it, and say how you got it: a key, an upsert and a transaction.'
      }),

      B.quiz({
        id: 'm1-q4', t: 1, src: 'rec',
        q: 'Which change makes load_orders_v8 safe to run twice?',
        opts: [
          { t: 'Reading files with a generator', fb: 'A generator helps memory. It does nothing about repeated rows.' },
          { t: 'A primary key on order_id together with an upsert in one transaction', fb: '' },
          { t: 'Storing the total as an integer number of cents', fb: 'That fixes float errors, not repeats.' },
          { t: 'Printing the row count at the end', fb: 'Printing shows the problem. It does not prevent it.' }
        ],
        ok: 1, why: 'The key identifies an order, the upsert replaces instead of adding, and the transaction makes the write all or nothing. Together they give the same table after one run or ten.'
      }),

      B.order({
        id: 'm1-order', t: 1, src: 'docs', q: 'Put the steps of a safe nightly load in order.',
        items: ['Read the files and check each row', 'Turn the rows into the types the table needs', 'Open a transaction', 'Write the rows by key (upsert)', 'Commit, then print how many rows went in and how many were rejected'],
        why: 'Check before you write, write all or nothing, and report counts. A restart after any step leaves the table as it was, or finishes the job to the same result.',
        cheer: 'Say the order out loud: read, check, convert, transaction, upsert, count.'
      }),

      B.code({
        id: 'm1-versions', t: 1, src: 'rec', title: 'What this course ran on', file: 'versions.py', lang: 'python', code: G.file('m1/versions.py'),
        steps: [
          { say: 'Every program in this course ran on one machine with these versions. When a lesson shows output, it is the output of these.', lines: null },
          { say: 'The line it printed first: Python ' + PYV + ', the CPython interpreter, on x86-64. The libraries follow. pandas ' + PANDAS + ' is version 3, which has a string type of its own and always copies on write (mission 9).', lines: G.span(G.file('m1/versions.py'), /^print\(sys\.version/) }
        ],
        note: 'Output of `versions.py`:\n\n' + VER.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.cmp({
        id: 'm1-levels', t: 2, src: 'docs', title: 'Junior or senior: what changes in Python',
        say: 'Same language, different questions. Press Next to read the gap area by area.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Scripts', 'Write a script that reads, cleans and loads a file.', 'Make it safe to run twice, bounded in memory, observable and tested.'],
          ['Data structures', 'Pick a list, dict or set for a job.', 'Say what each costs in time and memory, and measure before tuning.'],
          ['Files and APIs', 'Read CSV and JSON, call an API.', 'Handle encodings, partial files, pagination under change, rate limits and timeouts.'],
          ['Dataframes', 'Use pandas for a groupby and a merge.', 'Choose between pandas, Polars and DuckDB, and prevent a merge from multiplying rows.'],
          ['Quality', 'Run the tests that exist.', 'Design the tests, the contracts at the boundaries and the checks in CI.'],
          ['Operations', 'Read a log and fix a bug.', 'Own retries, backfills, alerts and the review of other people\'s jobs.']
        ],
        steps: [
          { upto: 3, say: 'Scripts, structures, files and APIs. A junior writes them. A senior makes them survive a bad night.' },
          { upto: 6, say: 'Dataframes, quality and operations. These are about decisions and about what happens after you ship.' }
        ],
        pick: '**Junior path** for your first data engineering role. **Senior path** if you have shipped Python jobs already: it keeps every junior topic and adds design, speed, testing and operations. **Everything** adds Python 3.14 features and the deepest follow-ups.'
      }),

      B.decide({
        id: 'm1-decide', t: 2, src: 'docs', title: 'Decision: what do you do first with the inherited script?',
        scenario: 'You inherit `load_orders_v7.py` and a nightly cron entry. Finance has complained twice about doubled totals. You have one week and no tests. A colleague suggests rewriting everything as a package with a framework.',
        opts: [
          { t: 'Rewrite it as a package with an orchestrator', d: 'Clean design, tests, a scheduler. It will take weeks and the old script keeps running.', lose: 'The doubled totals continue for weeks, and a rewrite without tests can add new bugs.' },
          { t: 'Make the load safe to repeat, then add a test that runs it twice', d: 'Add a key and an upsert in one transaction. Write one test with the six-order sample that checks the table after two runs.', lose: '' },
          { t: 'Tell finance to deduplicate in their reports', d: 'No change to the script. The report removes repeated order ids.', lose: 'Every consumer now has to know the table is unreliable, and the totals in other tools stay wrong.' },
          { t: 'Add a line that deletes the table before each run', d: 'The table is rebuilt from the files each night.', lose: 'It works only while the files hold all history. A restart in the middle leaves an empty table, and nothing is safe if two runs overlap.' }
        ],
        pick: 1,
        why: 'The incident is duplicates, so fix that first and prove it with a test. The change is small, it can ship in a day, and the test becomes the safety net for every later change, including the rewrite. A rewrite is a plan for the weeks after.',
        when: 'If the old script cannot be changed safely at all, or runs on a platform that is being retired, a rewrite first can be right. Even then, write the test of "run twice, same table" before the first line of the new code.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: Monday revenue is exactly doubled', time: '09:10',
        alert: 'The Monday report shows revenue exactly twice the Sunday number for the same stores. Nobody changed the report. The nightly job shows a success in the log.',
        clues: ['The job log has two lines that start with "loaded" for Sunday night, 02:00 and 02:07.', 'A retry wrapper around cron on the new server starts the job again when the first run does not finish within five minutes.', 'The `orders` table has no primary key.'],
        opts: [
          { t: 'Delete the table and reload it from the files', fb: 'It may fix the table, but it destroys evidence, and the same restart will double it again tomorrow.' },
          { t: 'Count rows against distinct order ids, and look at the job log for repeated runs', fb: '' },
          { t: 'Ask finance to wait until the next day to see if it corrects itself', fb: 'Nothing in the job corrects duplicates. Waiting only makes the table larger.' },
          { t: 'Add `sleep 60` to cron so that jobs never overlap', fb: 'It hides the symptom and does not make a second run safe.' }
        ],
        best: 1, why: 'Rows against distinct ids confirms the diagnosis in one query, and the log shows why a second run happened. In the recording the same pair of numbers (' + R2.n + ' and ' + R2.d + ') told the story.',
        checks: [
          ['Count rows and distinct order ids', 'The two numbers differ by exactly the number of repeated rows. Equal numbers mean the cause is elsewhere.'],
          ['Read the job log for the night', 'Two "loaded" lines mean the job ran twice, and the timestamps give the gap.'],
          ['Look at how the job is started', 'A retry wrapper or an orchestrator that retries on a timeout starts a second run while the first is still alive.'],
          ['Check that the table has a key', 'No key means nothing stops duplicates. This is the root cause.'],
          ['Fix the table, then the job', 'Remove the repeated rows with a statement you reviewed, then ship the key and the upsert.']
        ],
        tell: 'On Monday the revenue was doubled. I compared the row count with the number of distinct order ids and found every Sunday order twice. The log showed the job started twice because the scheduler restarted it after a timeout, and the table had no key. I removed the repeats, added a primary key and an upsert in one transaction, and added a test that runs the load twice. Revenue was correct the same day.',
        prevent: ['Every load is keyed and replaces by key, so a second run changes nothing.', 'A test runs the load twice and compares the table.', 'The job prints rows in, rows rejected and rows in the table, and an alert fires when the table grows by more than the file.', 'The scheduler never starts a second copy while one is running.']
      }),

      B.qa({
        id: 'qa-pyrole', t: 1, tag: 'Role', secs: 60,
        q: 'What do you use Python for as a data engineer?',
        pts: ['Getting data in: APIs, files, databases', 'Reshaping data that SQL cannot reach, and checking it', 'Describing and testing pipelines', 'Knowing when to leave volume to an engine'],
        short: 'I use Python at the edges and as the glue. It calls APIs with retries and pagination, reads awkward files, validates rows and quarantines the bad ones, and it describes pipelines for the orchestrator. I use it for transformations that are hard in SQL, like parsing log lines or flattening nested JSON. For volume I do not loop in Python. I give joins and aggregates to the warehouse, Spark or DuckDB, and use Python to start the job and check the result. Every job I write is small, has one purpose, and is safe to run twice.',
        fu: [['What would you not use Python for?', 'Joining or aggregating very large tables in a loop, and scheduling. A warehouse or Spark does the first, and an orchestrator does the second.'], ['How do you decide between Python and SQL?', 'If the data is already in the warehouse and the logic is set-based, SQL. If it needs a library, a network call or row-by-row parsing, Python.']],
        trap: 'Saying "everything". It sounds like you reach for Python even when a statement in the warehouse is shorter and faster.',
        real: 'Name one job you wrote and the input and output of it. Say what it did when it failed.'
      }),

      B.qa({
        id: 'qa-notebook', t: 1, tag: 'Practice', secs: 60,
        q: 'Would you run a notebook in production?',
        pts: ['Notebooks hide state and run in any order', 'Hard to test and to review in a diff', 'Explore in a notebook, ship a script or package', 'If forced: restart, run all, parameterize, and wrap with a scheduler'],
        short: 'I use notebooks to explore and to explain, not to run nightly jobs. A notebook keeps state between cells, so the result depends on the order you pressed Run in. In a recording I ran the same three cells in three orders and got three different totals. Notebooks are also hard to test and the diffs are noisy. I move the logic into a script or a package with tests, and let the notebook import it. If a team insists on running a notebook, I make it restart and run all cells from the top, take its inputs as parameters, and run it from a scheduler.',
        fu: [['What is your first step when you inherit a notebook?', 'Restart the kernel and run all cells. If the result changes, the notebook had hidden state, and I note which cell depended on which.'], ['How do you review a notebook change?', 'I convert it to a script with `jupyter nbconvert`, or ask for the logic to live in a module so that the diff is plain code.']],
        trap: 'Defending notebooks as production code because they are convenient. The convenience is the hidden state.',
        real: 'If you have run a notebook in production, say what broke and what you changed.'
      }),

      B.qa({
        id: 'qa-idem', t: 1, tag: 'Reliability', secs: 60,
        q: 'What does it mean for a pipeline to be idempotent, and how do you get there?',
        pts: ['Running it once or many times leaves the same result', 'Needed because retries and restarts happen', 'A key plus an upsert, or a replace of the whole partition', 'A transaction so a stop leaves no half state'],
        short: 'Idempotent means the result of running the job once is the same as running it ten times. It matters because retries, restarts and overlapping runs are normal. I get there with a key on the data and an upsert that replaces by key, or by replacing a whole partition for a day. I write in one transaction so a failure leaves the old state or the new state, never half. And I test it: a test runs the load twice and compares the tables. In a recording, a script without these gave 12 rows for 6 orders after a second run, and the version with them gave 6 both times.',
        fu: [['Is delete-and-reload idempotent?', 'It gives the same end state, but between the delete and the reload the table is empty and a failure leaves it empty. Wrap both in one transaction, or load into a new table and swap.'], ['What about appends from a stream?', 'Add an event id and deduplicate on it, or write with a key. At-least-once delivery plus a key gives the effect of exactly once.']],
        trap: 'Saying "I just check if the file was already processed". A flag that is set after the load can be missing after a crash. The data should carry the key.',
        real: 'Describe a load you made safe to repeat, and how you tested it.'
      }),

      B.qa({
        id: 'qa-sqlpy', t: 2, tag: 'Judgement', secs: 60,
        q: 'A transformation could be written in SQL in the warehouse or in pandas in a script. How do you decide?',
        pts: ['Where does the data live, and how big is it', 'Is the logic set-based or row by row', 'Does it need a library or a network call', 'Who will maintain it, and how will it be tested'],
        short: 'First, where the data is and how big. If it is already in the warehouse and the logic is set-based, SQL is shorter, faster and closer to the data, and it can be tested with a SQL test tool. If it needs a library, a network call, or row-by-row parsing, Python. Size matters too: pandas needs the data in memory, so for large inputs I use DuckDB or Polars lazily, or leave it in the warehouse. Last, maintenance: logic that analysts need to read belongs in SQL, and logic that engineers test and version belongs in a package.',
        fu: [['What if both would work?', 'I choose the one that moves less data. A statement that runs where the data lives avoids a download and an upload.'], ['Where does dbt fit?', 'It runs SQL in the warehouse with tests and docs, so it takes the transformations that are set-based. Python covers the edges around it.']],
        trap: 'Pulling a whole table into pandas to filter it. Filter in the warehouse and bring back only what you need.',
        real: 'Give one transformation you left in SQL and one you wrote in Python, and why.'
      }),

      B.qa({
        id: 'qa-inherit', t: 2, tag: 'Judgement', secs: 60,
        q: 'You inherit a nightly Python script with no tests that has caused two incidents. What do you do in the first week?',
        pts: ['Read it and write down how it can fail', 'Make a copy of real input as a test sample', 'Fix the cause of the incidents first, and prove it with a test', 'Add logging, counts and an alert before refactoring'],
        short: 'I read the script and list how it can fail: reruns, stops halfway, the clock, memory, bad input. I take a small sample of real input and run the script on it, so I have a baseline. I fix the cause of the two incidents first, for example a key and an upsert, and write a test that fails before the fix and passes after. Then I add counts to the log, rows in, rows rejected and rows in the table, and an alert on a surprise. Only then do I refactor, because now a test protects each change.',
        fu: [['Would you rewrite it?', 'Not first. A rewrite without tests trades known bugs for new ones. I refactor in small steps behind the tests, and rewrite a part when its tests are in place.'], ['What if you cannot run it locally?', 'I make it runnable: config from environment variables, a local database or a temporary folder, and a fake for each service.']],
        trap: 'Starting with a rewrite. The first deliverable is a test that reproduces the incident.',
        real: 'Describe a script you inherited and the first thing you changed.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Script Writer', color: '#FDE68A',
        pts: [
          'Python is the **glue and the edges** of a platform: it gets data in, checks it, and describes the pipeline. Volume goes to an engine.',
          'A script that **cannot run twice** is wrong the first time something retries. In the recording a second run held **' + R2.n + ' rows for ' + R2.d + ' orders** with no error.',
          'A **notebook hides state**: the same three cells gave ' + N_ORDER + ', ' + N_TWICE + ' and ' + N_TAX + '. Ship scripts and packages.',
          '**Idempotent** means once or ten times gives the same table. Get it with a **key, an upsert and a transaction**, and test it by running the load twice.',
          'The next missions fix the other failures: environments, memory, the clock, retries, speed and tests.'
        ],
        lines: [
          'I make every load safe to run twice, and I test it by running it twice.',
          'I explore in notebooks and ship scripts.',
          'I give volume to an engine and use Python for the edges.'
        ]
      })
    ]
  });
})();
