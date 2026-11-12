/* Mission 9: pandas, Polars and DuckDB. Real results from the three libraries on this machine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var NUF = G.file('m9/nulls_and_types.py'), MFF = G.file('m9/merge_fanout.py'), TEF = G.file('m9/three_engines.py'), LPF = G.file('m9/lazy_polars.py'), SJF = G.file('m9/safe_join.py'), LOF = G.file('m9/latest_per_order.py');
  var NUT = G.text('m9/nulls_and_types.py'), MFT = G.text('m9/merge_fanout.py'), TET = G.text('m9/three_engines.py'), LPT = G.text('m9/lazy_polars.py'), SJT = G.text('m9/safe_join.py'), LOT = G.text('m9/latest_per_order.py');
  var EN = G.counts('m9.engines'), FO = G.counts('m9.fanout'), D2 = G.counts('m9.duckdb2');
  G.expect(/Relations no longer have fetchone\(\)/.test(D2.fetchone_error || ''), 'DuckDB ' + G.meta('duckdb') + ' answers that a relation has no fetchone()');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }
  function fo(how, dup) { return FO.cases.filter(function (c) { return c.how === how && c.dup === dup; })[0]; }
  function mb(x) { return Math.round(x) + ' MB'; }

  G.expect(/pandas  dtypes: \{'order_id': 'str', 'total': 'float64', 'store': 'str'\}/.test(NUT) && /pandas  count of total: 2|count of total: 2 /.test(NUT) && /pandas  rows per store: \{'London': 2, 'Singapore': 1\} \(the missing store is dropped\)/.test(NUT) && /polars  rows per store: \{'London': 2, 'Singapore': 1, None: 1\}/.test(NUT) && /duckdb  rows per store: \{'London': 2, 'Singapore': 1, None: 1\}/.test(NUT) && /duckdb  count\(\*\), count\(total\), sum, avg: \(4, 2, 20\.7, 10\.35\)/.test(NUT), 'a missing store is dropped by pandas and kept by Polars and DuckDB');
  G.expect(/^orders: 6 rows, total 8275 cents/.test(MFT) && /pandas  left join: 8 rows, total 10905 cents/.test(MFT) && /polars  left join: 8 rows, total 10905 cents/.test(MFT) && /duckdb  left join: 8 rows, total 10905 cents/.test(MFT) && /who is repeated: \['O-4', 'O-4', 'O-6', 'O-6'\]/.test(MFT), 'all three engines turn 6 rows into 8 and 8275 cents into 10905');
  G.expect(/pandas  validate m:1 -> MergeError: Merge keys are not unique in right dataset; not a many-to-one merge/.test(MFT) && /polars  validate m:1 -> ComputeError: join keys did not fulfill m:1 validation/.test(MFT) && /Check the key yourself: \[\(3, 2\)\]/.test(MFT) && /after drop_duplicates and validate m:1: 6 rows, total 8275 cents/.test(MFT), 'validate m:1 stops the join in pandas and Polars, and DuckDB needs a check');
  G.expect(fo('left', 1).rows === 9 && fo('left', 1).cents === 11465 && fo('inner', 0).rows === 6 && fo('inner', 0).cents === 8275 && fo('left', 0).rows === 7 && fo('left', 0).cents === 8835, 'the lab cases');
  G.expect(/same answer from all three: True/.test(TET) && /Paris +150,613 paid orders +3,235,372\.73/.test(TET), 'the three engines gave the same answer');
  G.expect(/PROJECT 3\/4 COLUMNS/.test(LPT) && /SELECTION: col\("status"\) == "paid"/.test(LPT) && /Parquet SCAN \[orders\.parquet\]/.test(LPT) && /ESTIMATED ROWS: 2000000/.test(LPT), 'the Polars plan pushes the filter and the columns into the Parquet scan');
  var E = EN.engines, PD = E['pandas'], PE = E['polars eager'], PL = E['polars lazy'], DK = E['duckdb'];
  G.expect(PD.seconds > PL.seconds && PD.seconds > DK.seconds && PD.extra_mb > 3 * PL.extra_mb && PD.extra_mb > 3 * DK.extra_mb && PE.extra_mb > 3 * DK.extra_mb, 'pandas was slower than the lazy and SQL engines, and held more than three times the memory');
  G.expect(/tests passed$/.test(SJT) && /tests passed$/.test(LOT) && /a repeated key raises: customers has more than one row for customer_id \[3\]/.test(SJT), 'both coding rounds pass');
  var LEAST = Object.keys(E).sort(function (a, b) { return E[a].extra_mb - E[b].extra_mb; })[0];
  G.expect(LEAST === 'duckdb', 'DuckDB added the least memory');

  var BUG_MERGE = ['orders = pd.read_csv("orders.csv")', 'customers = pd.read_csv("customers_history.csv")', 'df = orders.merge(customers, on="customer_id", how="left")', 'print(df["total_cents"].sum())'].join('\n');
  var BUG_MERGE_FIX = ['orders = pd.read_csv("orders.csv")', 'customers = pd.read_csv("customers_history.csv")', 'current = customers.sort_values("valid_from").drop_duplicates("customer_id", keep="last")', 'df = orders.merge(current, on="customer_id", how="left", validate="m:1")', 'print(df["total_cents"].sum())'].join('\n');
  var SJROWS = SJT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });
  var LOROWS = LOT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });
  var ENROWS = ['pandas', 'polars eager', 'polars lazy', 'duckdb'].map(function (k) { return [k, E[k].seconds.toFixed(3), mb(E[k].extra_mb), mb(E[k].peak_mb)]; });

  LAB.addChapter({
    id: 'm9', n: 9, title: 'pandas, Polars and DuckDB', short: 'Dataframes', blurb: 'Choose an engine, and keep joins from multiplying rows', minutes: 36,
    focus: ['stg', 'ing'],
    goals: [
      'Say how **pandas, Polars and DuckDB** treat a missing value, and where they differ.',
      'Spot and stop a **join that multiplies rows**, with `validate="m:1"` or a key check.',
      'Read a **lazy plan** and see which columns and filters are pushed into the file scan.',
      'Choose an engine from the **size of the data**, the memory you have, and the team.',
      'Write a join that cannot change the number of rows.'
    ],
    say: 'Mission 9 compares three libraries on the same questions: pandas, Polars and DuckDB. They give the same answers on small tables, and different answers in two places that cause real incidents: a missing value in a group key, and a join on a key that is not unique. They also differ a lot in memory on a file with two million rows. All the results are real runs on this machine.',
    scenes: [
      B.talk({
        id: 'm9-talk', t: 1, src: 'docs', title: 'One question, three engines',
        say: 'Press Next for what each engine is, and how to choose.',
        items: [
          ['pandas', 'The most widely used. A table in memory, one machine, one step at a time. pandas 3 reads text as a `str` column and never changes the original table behind your back (copy on write).', 'Familiar. Memory hungry.'],
          ['Polars', 'A newer dataframe library, written in Rust. It runs on all cores, and a **lazy** query is planned before it runs, so it reads only what it needs.', 'Fast. Plans the work.'],
          ['DuckDB', 'A SQL engine inside your Python process. It reads CSV and Parquet files directly, and can also query a pandas or Polars table by name.', 'SQL on files, no server.'],
          ['How to choose', 'Small data and a team that knows pandas: pandas. A bigger file, or several steps that can be planned: Polars or DuckDB. Mostly SQL: DuckDB. The recording below measures time and memory on one file.', 'Measure on your data.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm9-nulls', t: 1, src: 'rec', title: 'A missing value in three engines', file: 'nulls_and_types.py', lang: 'python', code: NUF,
        steps: [
          { say: 'The same four orders, in each engine. Two totals and one store are missing. The output is real.', lines: null },
          { say: 'The data: `None` in a list of numbers, and `None` in a list of names.', lines: G.span(NUF, /^data = /, /^data = /) },
          { say: 'pandas turns a missing number into `NaN`, a float. `count` skips it, `sum` and `mean` skip it, and `NaN == NaN` is `False`.', lines: G.span(NUF, /^p = pd\.DataFrame/, /print\("pandas  NaN/) },
          { say: '`groupby` in pandas **drops** the rows whose key is missing, unless you pass `dropna=False`. The totals per group no longer add up to the table.', lines: G.span(NUF, /print\("pandas  rows per store/, /dropna=False/) },
          { say: 'Polars has a real null. `count` skips nulls and `null_count` counts them. `group_by` keeps the null group.', lines: G.span(NUF, /^q = pl\.DataFrame/, /print\("polars  rows per store/) },
          { say: 'DuckDB follows SQL: `count(*)` counts rows, `count(total)` skips NULL, and `GROUP BY` keeps the NULL group.', lines: G.span(NUF, /^print\("duckdb  rows per store/, /duckdb  count/) }
        ]
      }),

      B.term({
        id: 'm9-nulls-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output, with pandas ' + G.meta('pandas') + ', Polars ' + G.meta('polars') + ' and DuckDB ' + G.meta('duckdb') + '.',
        lines: function () { return G.plain(NUT, { cmd: 'python nulls_and_types.py' }); },
        after: 'All three agree on the sum and the mean of the totals: they skip the missing values. They **disagree on the groups**: pandas returned 2 stores and 3 rows in total, and Polars and DuckDB returned 3 groups, with the missing store as its own group. A report that groups by a column with gaps loses those rows in pandas, with no warning.',
        afterKind: 'warn',
        doneSay: 'Check for missing keys before you group.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1, src: 'rec',
        q: 'The same table has 4 orders, and one has no store. How many rows did each engine count in the groups by store?',
        opts: [
          { t: 'pandas 3 rows in 2 groups. Polars and DuckDB 4 rows in 3 groups, with None as a group.', fb: '' },
          { t: 'All three: 4 rows in 3 groups', fb: 'pandas drops a missing key by default, as the recording shows.' },
          { t: 'All three: 3 rows in 2 groups', fb: 'Polars and DuckDB keep the null group.' },
          { t: 'pandas 4 rows, Polars and DuckDB 3 rows', fb: 'It is the other way round: pandas loses the group.' }
        ],
        ok: 0, why: 'pandas `groupby` drops missing keys unless you pass `dropna=False`, so the three rows of two stores were counted and the fourth was lost. Polars and DuckDB count the null group, so all 4 rows are there.'
      }),

      B.code({
        id: 'm9-fan', t: 1, src: 'rec', title: 'A join that multiplies rows', file: 'merge_fanout.py', lang: 'python', code: MFF,
        steps: [
          { say: 'Six orders and a customer table. Customer 3 has **two** rows, like a table that keeps history. The same left join runs in all three engines. The output is real.', lines: null },
          { say: 'Six orders, 8,275 cents in total. The customer table has four rows for three customers.', lines: G.span(MFF, /^orders = /, /^customers = /) },
          { say: 'The pandas left join. Each of customer 3\'s orders matches two rows, so it appears twice.', lines: G.span(MFF, /^merged = /, /print\("pandas  left join/) },
          { say: 'Polars and DuckDB do the same, because the data is the same.', lines: G.span(MFF, /^joined = /, /print\("duckdb  left join/) },
          { say: 'The repeated orders are O-4 and O-6, the two orders of customer 3.', lines: G.span(MFF, /^print\("who is repeated/, /^print\("who is repeated/) },
          { say: '`validate="m:1"` says that the key must be unique on the right side. pandas and Polars raise. DuckDB has no such option, so you check the key with a `GROUP BY ... HAVING count(*) > 1`.', lines: G.span(MFF, /^try:/, /HAVING count/) },
          { say: 'The fix: keep one row for each customer, and let `validate` guard the join from now on.', lines: G.span(MFF, /^fixed = /, /print\("after drop_duplicates/) }
        ]
      }),

      B.term({
        id: 'm9-fan-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `merge_fanout.py`.',
        lines: function () { return G.plain(MFT, { cmd: 'python merge_fanout.py' }); },
        after: 'Six orders became **8 rows**, and 8,275 cents became **10,905**: revenue 31.8 percent too high, in all three engines, with no error. With `validate="m:1"`, pandas raised `MergeError` and Polars raised `ComputeError`. After keeping one row for each customer, the result was back to **6 rows and 8,275 cents**.',
        afterKind: 'warn',
        doneSay: 'A join on a key that is not unique multiplies rows. Validate the key.'
      }),

      B.widget({ id: 'm9-lab-fan', kind: 'fanout', t: 1, src: 'rec', title: 'Lab: a join that multiplies rows' }),

      B.quiz({
        id: 'm9-q2', t: 1, src: 'rec',
        q: 'In the recording, the customer table had two rows for customer 3. What did the left join do to the six orders?',
        opts: [
          { t: 'It gave 8 rows and 10,905 cents: O-4 and O-6 appeared twice', fb: '' },
          { t: 'It raised an error, because the key is not unique', fb: 'Without `validate`, none of the three engines raised an error.' },
          { t: 'It kept 6 rows and picked one match', fb: 'A join returns every match.' },
          { t: 'It dropped the orders of customer 3', fb: 'That is what an inner join does to an order with no match. Here each order had two matches.' }
        ],
        ok: 0, why: 'A join returns one row for each pair of matching rows. Each of customer 3\'s two orders matched two customer rows, so it appeared twice and the revenue grew by 2,630 cents.'
      }),

      B.bug({
        id: 'm9-bug1', t: 1, src: 'rec', q: 'The revenue by city report is 30 percent higher than the till total since the data team switched to a customer history file. Click the line that lets the number grow.',
        file: 'report.py', lang: 'python', code: BUG_MERGE, bad: [3],
        hint: 'How many rows does the customer table have for one customer now?',
        why: 'The history file has one row for each period of each customer, so the key `customer_id` is no longer unique. The join returned every match, and an order was counted once for each period. Pick the current row of each customer first, and add `validate="m:1"` so that it raises when the key repeats.',
        fix: BUG_MERGE_FIX,
        cheer: 'Validate the key of the right side.'
      }),

      B.quiz({
        id: 'm9-q3', t: 2, src: 'rec',
        q: 'DuckDB has no `validate` option for a join. What did the recording use to find the repeated customer?',
        opts: [
          { t: 'A query: GROUP BY customer_id HAVING count(*) > 1, which returned [(3, 2)]', fb: '' },
          { t: 'The join itself raised an error', fb: 'DuckDB joined the rows without an error.' },
          { t: 'drop_duplicates', fb: 'That is a pandas method, and it removes the evidence instead of finding it.' },
          { t: 'A second join', fb: 'The recording used a count of rows for each key.' }
        ],
        ok: 0, why: 'The check is plain SQL: group the right side by the key and look for counts above one. It returned customer 3 with 2 rows. Put it in the pipeline as a test, so a repeated key fails the run before the join.'
      }),

      B.code({
        id: 'm9-eng', t: 1, src: 'rec', title: 'The same question in three engines', file: 'three_engines.py', lang: 'python', code: TEF,
        steps: [
          { say: 'Two million made-up orders in a Parquet file, and one question: paid revenue for each store, biggest first. The output is real.', lines: null },
          { say: 'The data comes from a seeded random generator and is written once to `orders.parquet`.', lines: G.span(TEF, /^rng = /, /to_parquet/) },
          { say: '**pandas** reads the three columns it needs into memory, filters, groups and sorts.', lines: blk(TEF, 'with_pandas') },
          { say: '**Polars** scans the file lazily: it builds a plan, and `collect()` runs it.', lines: blk(TEF, 'with_polars') },
          { say: '**DuckDB** runs SQL on the file by name.', lines: blk(TEF, 'with_duckdb') },
          { say: 'All three answers are compared, and the top three stores are printed.', lines: [G.at(TEF, /^a = /), last(TEF)] }
        ]
      }),

      B.term({
        id: 'm9-eng-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `three_engines.py`.',
        lines: function () { return G.plain(TET, { cmd: 'python three_engines.py' }); },
        after: 'The three engines returned **exactly the same rows**. The choice between them is not about the answer. It is about time, memory and how you want to write the question.',
        afterKind: 'tip',
        doneSay: 'Same answer. The cost is what differs.'
      }),

      B.cmp({
        id: 'm9-bench', t: 1, src: 'rec', title: 'What each engine cost on two million rows',
        say: 'The same question, run 5 times for each engine in a new process each time. The table shows the median on this machine. The file is ' + EN.file_mb + ' MB.',
        cols: ['Engine', 'Seconds', 'Memory added', 'Peak memory'],
        hl: 0,
        rows: ENROWS,
        steps: [
          { upto: 1, say: 'pandas read the columns into memory first, so it needed the most memory, and it was the slowest here.' },
          { upto: 2, say: 'Polars in eager mode reads the file first too, and it uses all cores.' },
          { upto: 4, say: 'The lazy Polars query and DuckDB read only the columns and rows that the question needs, and needed far less memory.' }
        ],
        pick: 'On this machine, with this file, pandas needed about **' + Math.round(PD.extra_mb / DK.extra_mb) + ' times** the extra memory of DuckDB. The ratio is a fact about this recording, not a law.'
      }),

      B.quiz({
        id: 'm9-q4', t: 1, src: 'rec',
        q: 'Which engine added the least memory while it answered the question, and about how much did pandas add?',
        opts: [
          { t: 'DuckDB added about ' + mb(DK.extra_mb) + ', and pandas about ' + mb(PD.extra_mb), fb: '' },
          { t: 'pandas added the least, because it is the simplest', fb: 'pandas read the columns into memory and added the most.' },
          { t: 'Polars eager added the least', fb: 'Polars eager reads the whole table first, like pandas. It added ' + mb(PE.extra_mb) + '.' },
          { t: 'They all added about the same', fb: 'The range was from ' + mb(DK.extra_mb) + ' to ' + mb(PD.extra_mb) + '.' }
        ],
        ok: 0, why: 'DuckDB and the lazy Polars query only read the columns and rows they need and process them in pieces. pandas needed the table in memory. These are medians of five runs on this machine.'
      }),

      B.code({
        id: 'm9-lazy', t: 2, src: 'rec', title: 'A lazy query has a plan', file: 'lazy_polars.py', lang: 'python', code: LPF,
        steps: [
          { say: 'The same question with Polars lazy mode, and `explain()` prints the plan instead of running it. The output is real.', lines: null },
          { say: '`scan_parquet` does not read anything. Each step adds to the plan.', lines: G.span(LPF, /^query = /, /\.sort\(/) },
          { say: '`explain()` shows the plan after the optimizer has rewritten it.', lines: G.span(LPF, /^print\(query\.explain/, /^print\(query\.explain/) }
        ]
      }),

      B.term({
        id: 'm9-lazy-run', t: 2, src: 'rec', title: 'Run it',
        say: 'Read the plan from the bottom: the scan comes first.',
        lines: function () { return G.plain(LPT, { cmd: 'python lazy_polars.py' }); },
        after: 'The scan reads **3 of the 4 columns** (`PROJECT 3/4 COLUMNS`), and the filter `status == "paid"` is applied **inside** the scan (`SELECTION`), so rows that do not match are never kept. Nothing in your code asked for that. The optimizer pushed the column choice and the filter down into the file read.',
        afterKind: 'tip',
        doneSay: 'A plan lets the engine skip work.'
      }),

      B.quiz({
        id: 'm9-q5', t: 2, src: 'rec',
        q: 'The plan says `PROJECT 3/4 COLUMNS` and `SELECTION: col("status") == "paid"` under the Parquet scan. What does that tell you?',
        opts: [
          { t: 'The scan reads only 3 of 4 columns and applies the filter while reading', fb: '' },
          { t: 'The query ran and returned 3 rows', fb: '`explain()` prints the plan. It does not run the query.' },
          { t: 'The file has 3 columns', fb: 'The file has 4 columns. The plan uses 3 of them.' },
          { t: 'The filter runs after the whole file is in memory', fb: 'That is what happens without pushdown. The plan shows it inside the scan.' }
        ],
        ok: 0, why: 'Projection pushdown picks the columns, and predicate pushdown applies the filter in the scan. Parquet can skip the unused columns entirely, so less data is read from the disk and less is held in memory.'
      }),

      B.cmp({
        id: 'm9-pick', t: 1, src: 'docs', title: 'Which engine, when',
        say: 'A short guide. Press Next to read each engine.',
        cols: ['Engine', 'Strength', 'Watch for', 'Pick it when'],
        hl: 0,
        rows: [
          ['pandas', 'The biggest community, the most examples, many libraries accept a DataFrame.', 'The whole table sits in memory. A key with gaps is dropped by `groupby`.', 'The data fits in memory and the team knows it.'],
          ['Polars', 'Fast, multi-threaded, lazy plans, strict types.', 'A different API. Eager mode holds the table in memory like pandas.', 'A bigger file or a chain of steps that can be planned.'],
          ['DuckDB', 'SQL on CSV and Parquet files, little memory, no server.', 'No `validate` on joins. In version ' + G.meta('duckdb') + ' a relation has no `fetchone()`: DuckDB says so in its error message.', 'The logic is SQL, or you query files directly.'],
          ['A cluster (Spark and others)', 'Data that does not fit on one machine.', 'Setup, cost and a slower start for small jobs.', 'One machine really is not enough. Name the numbers first.']
        ],
        steps: [
          { upto: 2, say: 'pandas and Polars are dataframe libraries, and they differ in memory and in planning.' },
          { upto: 4, say: 'DuckDB is SQL on files, and a cluster is for the rest.' }
        ],
        pick: 'Start with the **smallest tool that fits**: usually a single machine with DuckDB or Polars before a cluster.'
      }),

      B.decide({
        id: 'm9-decide', t: 2, src: 'rec', title: 'Decision: a 40 GB Parquet file on a 16 GB machine',
        scenario: 'Every night you receive one Parquet file of about 40 GB with orders. You need paid revenue for each store, as in the recording. Your job runs on a machine with 16 GB of memory. In the recording on a 2 million row file, pandas added **' + mb(PD.extra_mb) + '** while DuckDB added **' + mb(DK.extra_mb) + '** and the lazy Polars query **' + mb(PL.extra_mb) + '**.',
        opts: [
          { t: 'pandas, reading the three columns you need', d: 'The code you already know.', lose: 'It loads the three columns into memory first. At 40 GB of file the columns may still not fit, and the job dies with an out-of-memory error.' },
          { t: 'DuckDB, with SQL on the file', d: 'Reads only the columns and rows it needs, and processes the file in pieces.', lose: '' },
          { t: 'Polars lazy with `scan_parquet`', d: 'Also plans the work and reads only what it needs. A streaming collect handles larger data.', lose: 'A different API to learn, and the streaming mode has limits for some operations.' },
          { t: 'Rent a cluster', d: 'Memory is no problem.', lose: 'Cost and setup for a question that one machine can answer.' }
        ],
        pick: 1,
        why: 'DuckDB added the least memory in the recording and reads straight from the file. For one aggregation on one machine it is the simplest fit. Polars lazy is a close second, and a good choice when the team prefers a dataframe API.',
        when: 'If the query needs many steps that are easier to write in Python, use Polars lazy. If the data grows to hundreds of gigabytes or many users share it, look at a cluster or a warehouse, and measure first.'
      }),

      B.challenge({
        id: 'm9-ch1', t: 1, lang: 'python', file: 'safe_join.py',
        q: '**Coding round: a join that cannot multiply rows.** Write `safe_join(orders, customers, key="customer_id")` with pandas. It left-joins `orders` to `customers`. When `customers` has more than one row for a key, raise a `ValueError` that names the keys. The result must have exactly one row for each order, in the order of `orders`. An order with no customer stays, with an empty city.',
        data: [{ name: 'orders', cols: ['order_id', 'customer_id', 'total_cents'], rows: [['O-1', '1', '1250'], ['O-2', '2', '475'], ['O-3', '3', '820'], ['O-4', '9', '1990']] }, { name: 'customers', cols: ['customer_id', 'city'], rows: [['1', 'London'], ['2', 'London'], ['3', 'Singapore']] }],
        starter: 'import pandas as pd\n\ndef safe_join(orders, customers, key="customer_id"):\n    ...',
        hints: ['`customers[key].duplicated(keep=False)` marks every row of a repeated key. `.unique().tolist()` gives the keys for the message.', 'Raise before the join. Then `orders.merge(customers, on=key, how="left", validate="m:1")` as a second guard.', 'A left join keeps an order with no customer, with a missing city. Check `len(out) == len(orders)` at the end.'],
        sol: fn(SJF, 'safe_join'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: SJROWS },
        expl: ['The check names the keys, so the message tells the reader what to fix. It runs before the join, so the failure happens where the cause is.', '`validate="m:1"` is a second guard. It fails if a later change makes the key repeat in a way that the first check missed.', 'The row count of the result equals the row count of `orders`: that is the property that a left join to a dimension should have.'],
        cx: 'O(n + m) for the key check and the join.'
      }),

      B.challenge({
        id: 'm9-ch2', t: 2, lang: 'python', file: 'latest_per_order.py',
        q: '**Coding round: the latest row.** An orders history table has one row for each status change: `(order_id, status, updated_at)`. Write `latest_per_order(rows)` with **DuckDB SQL**. Return one row for each order, the one with the latest `updated_at`, sorted by `order_id`.',
        data: [{ name: 'rows', cols: ['order_id', 'status', 'updated_at'], rows: [['O-1', 'placed', '2026-03-14 08:00'], ['O-2', 'placed', '2026-03-14 09:00'], ['O-1', 'paid', '2026-03-14 08:05'], ['O-3', 'placed', '2026-03-14 07:00'], ['O-1', 'refunded', '2026-03-15 10:00'], ['O-2', 'paid', '2026-03-14 09:30']] }],
        starter: 'import duckdb\nimport pandas as pd\n\ndef latest_per_order(rows):\n    ...',
        hints: ['DuckDB can query a pandas DataFrame by its variable name: `FROM df`.', '`row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC)` numbers the rows of each order from the newest.', '`QUALIFY ... = 1` filters on a window function, with no subquery.'],
        sol: fn(LOF, 'latest_per_order'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: LOROWS },
        expl: ['`QUALIFY` is a DuckDB clause that filters after the window function. In other databases you wrap the query in a subquery or a CTE and filter on `rn = 1`.', 'Two rows with the same `updated_at` would make the choice random. In a real table add a tie breaker to the `ORDER BY`, such as a sequence number.', 'The empty input and the one-row input worked, because the frame is built with explicit column names.'],
        cx: 'O(n log n) for the window sort.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: revenue grew 32 percent in one night', time: '07:55',
        alert: 'The revenue dashboard shows 32 percent more revenue for yesterday than the tills. No source changed. The load job and its tests are green. A colleague says the customer dimension was rebuilt last night to keep history.',
        clues: ['The report joins `orders` to `customers` on `customer_id` with a left join.', 'The new customer table has one row for each period of each customer.', 'The row count of the report is higher than the row count of `orders`.'],
        opts: [
          { t: 'Count the report rows against the order rows, then count the rows for each customer_id in the customer table', fb: '' },
          { t: 'Remove the left join and use an inner join', fb: 'An inner join still multiplies rows for a repeated key.' },
          { t: 'Divide the revenue by 1.32', fb: 'It hides the problem, and the next change breaks it again.' },
          { t: 'Roll the dashboard back to last week', fb: 'It buries the cause. The report will break again when the table is used.' }
        ],
        best: 0, why: 'In the recording, six orders became eight rows when one customer had two rows, and revenue grew from 8,275 to 10,905 cents, with no error from pandas, Polars or DuckDB. Counting the rows of the join against the rows of `orders` finds it in a minute.',
        checks: [
          ['Compare the number of rows of the report with the number of orders', 'More rows in the report than orders means that the join multiplied them.'],
          ['Count the rows for each customer_id in the new table', 'Customers with history have several rows.'],
          ['Pick the current row for each customer before the join', 'For example the row with the latest `valid_from`, or the one with `is_current`.'],
          ['Add `validate="m:1"` to the join, or a test on the key', 'A repeated key fails the run before it reaches the dashboard.'],
          ['Add a check that the row count after a join to a dimension equals the row count before', 'A left join to a dimension must not change the number of rows.']
        ],
        tell: 'Revenue was 32 percent too high because the customer table was rebuilt with history, so the key customer_id was no longer unique. The left join returned a row for every period of every customer, and orders were counted once for each. I joined to the current row of each customer instead, added validate m:1 to the join, and added a check that the row count after a join to a dimension equals the row count before it.',
        prevent: ['Joins to a dimension use `validate="m:1"`, or a key check in SQL.', 'A test compares the row counts before and after each join.', 'Changes to a table that others join to are announced and tested.', 'Revenue is reconciled with an independent total every day.']
      }),

      B.qa({
        id: 'qa-joinfan', t: 1, tag: 'Dataframes', secs: 60,
        q: 'A join made your revenue too high. What happened, and how do you prevent it?',
        pts: ['The key is not unique on one side, so rows multiply', 'No error is raised', 'validate="m:1", or a key check', 'Compare row counts before and after'],
        short: 'The key was not unique on the right side, so each left row matched several right rows and appeared several times. In a recording, six orders became eight rows and 8,275 cents became 10,905, in pandas, Polars and DuckDB, with no error. I prevent it by checking the key: `validate="m:1"` in pandas and Polars raised an error in the recording, and in DuckDB I run a GROUP BY with HAVING count(*) > 1. I also compare the row count after a join to a dimension with the count before, and I reconcile revenue with an independent total.',
        fu: [['How do you choose which duplicate to keep?', 'By a rule: the current row, the latest `valid_from`, or the row with a flag. Never by chance.'], ['Does an inner join help?', 'No. It also multiplies rows for a repeated key, and it silently drops orders with no match.']],
        trap: 'Dropping duplicates after the join, which hides the cause.',
        real: 'Tell about a number that was wrong because of a join.'
      }),

      B.qa({
        id: 'qa-engines', t: 1, tag: 'Dataframes', secs: 60,
        q: 'pandas, Polars or DuckDB: how do you choose?',
        pts: ['Size of the data and the memory you have', 'The team and the language of the logic', 'Lazy engines read only what they need', 'Measure on your data'],
        short: 'I start from the size of the data and the machine, then from the team. For data that fits in memory and a team that knows pandas, pandas. For a bigger file or a chain of steps, Polars lazy or DuckDB, because they plan the work and read only the columns and rows they need. If the logic is mostly SQL, or I query files directly, DuckDB. In a recording on two million rows, pandas added about ' + Math.round(PD.extra_mb) + ' MB of memory and DuckDB about ' + Math.round(DK.extra_mb) + ' MB for the same answer, on one machine. I measure on the real data before I choose, and I do not move to a cluster until one machine is shown not to be enough.',
        fu: [['What about Spark?', 'For data that does not fit on one machine, or a platform that already runs it. Not for a file that DuckDB or Polars can handle in seconds.'], ['Can you mix them?', 'Yes. DuckDB can query a pandas or Polars table by name, and they exchange data through Arrow.']],
        trap: 'Saying that one engine is always fastest. It depends on the data and the machine.',
        real: 'Say which engine your team uses and why.'
      }),

      B.qa({
        id: 'qa-nullsframes', t: 1, tag: 'Dataframes', secs: 60,
        q: 'How do missing values behave in pandas, Polars and DuckDB?',
        pts: ['pandas: NaN in float columns, and groupby drops missing keys', 'Polars and DuckDB: a real null, and the group is kept', 'count skips missing, sum and mean skip them', 'NaN does not equal NaN'],
        short: 'pandas stores a missing number as `NaN`, and `NaN == NaN` is false, so I use `isna`. `count`, `sum` and `mean` skip missing values in all three engines. The difference is in grouping: in a recording, `groupby` in pandas dropped the row with a missing store and returned 3 rows in 2 groups, while Polars and DuckDB kept it as a null group and returned 4 rows in 3. I pass `dropna=False` in pandas, or I fill or check the key first, so the groups add up to the table.',
        fu: [['What about integers with gaps?', 'A plain integer column becomes a float in older pandas. Use a nullable integer type, or Polars and DuckDB, which have a real null.'], ['How do you test for it?', 'Assert that the counts of the groups add up to the number of rows.']],
        trap: 'Assuming that all engines group the same way.',
        real: 'Tell about a report where rows went missing in a groupby.'
      }),

      B.qa({
        id: 'qa-bigframe', t: 2, tag: 'Dataframes', secs: 60,
        q: 'A file is bigger than your memory. What do you do?',
        pts: ['Read only the columns you need', 'A lazy or streaming engine, or DuckDB', 'Parquet lets the engine skip columns and row groups', 'Process in chunks, or add a cluster last'],
        short: 'I read only the columns I need, and I use an engine that streams, such as DuckDB or Polars lazy, so that the filter and the column choice are pushed into the file read. A Parquet file helps, because the reader can skip whole columns and row groups. In a recording the Polars plan showed the scan reading 3 of 4 columns with the filter inside the scan, and DuckDB added about ' + Math.round(DK.extra_mb) + ' MB of memory against about ' + Math.round(PD.extra_mb) + ' MB for pandas. If that is still not enough, I process the file in chunks that I can rerun, and only then a cluster.',
        fu: [['What if the file is CSV?', 'Convert it to Parquet once. CSV has no column skipping, and every read parses the text again.'], ['Chunks in pandas?', 'Possible with `chunksize`, but a join or a sort across chunks needs more work. A streaming engine does it for you.']],
        trap: 'Buying a bigger machine before checking the plan.',
        real: 'Describe the largest file that you processed on one machine.'
      }),

      B.qa({
        id: 'qa-vector', t: 2, tag: 'Dataframes', secs: 60,
        q: 'Why do people say "do not loop over a DataFrame"?',
        pts: ['Row loops run in Python, one row at a time', 'Column operations run in compiled code', 'Use vectorised methods, expressions or SQL', 'Measure before you rewrite'],
        short: 'A loop over rows, with `iterrows` or `apply(axis=1)`, runs Python code for every row, and Python does a row at a time. A column operation, such as a comparison or a sum, runs in compiled code over the whole column. So I write the logic as column expressions in pandas, expressions in Polars, or SQL in DuckDB, and I keep a Python function for the few things that cannot be expressed. I measure before I rewrite, because for a table of a few thousand rows it does not matter.',
        fu: [['What if the logic is really complicated?', 'Split it into column steps, use `np.where` or `case when`, or write a small function over arrays and not over rows.'], ['And Polars?', 'Its expressions run in parallel in compiled code, and a Python lambda in `map_elements` loses that.']],
        trap: 'Rewriting working code for speed without a measurement.',
        real: 'Tell about a loop that you replaced, and by how much it got faster.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Frame Keeper', color: '#FBCFE8',
        pts: [
          '**pandas drops a missing group key**: 3 rows in 2 groups. Polars and DuckDB keep the null group: 4 rows in 3. Check the key, or pass `dropna=False`.',
          'A join on a key that is **not unique** turned 6 orders into **8 rows** and 8,275 cents into **10,905**, in all three engines, with no error.',
          '`validate="m:1"` raised in pandas and Polars. In DuckDB, run `GROUP BY key HAVING count(*) > 1`. Compare the row count before and after a join.',
          'The three engines gave the **same answer** on two million rows. pandas added about **' + mb(PD.extra_mb) + '**, DuckDB about **' + mb(DK.extra_mb) + '**.',
          'A lazy plan pushes the **columns** (`PROJECT 3/4 COLUMNS`) and the **filter** into the file scan. Pick the smallest tool that fits, and measure.'
        ],
        lines: [
          'I check the key before I join, and the row count after.',
          'I know where pandas, Polars and DuckDB differ on missing values.',
          'I choose an engine from the data size, the memory and the team, and I can show the numbers.'
        ]
      })
    ]
  });
})();
