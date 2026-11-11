/* Mission 9: Python and UDFs. How PySpark works, what a Python UDF costs in the plan, pandas UDFs and Arrow, how many times a UDF is called, a wrong return type that gives NULL, and
   a NULL input that fails. Plans, call counts and errors are real output of Spark 4.0.1. Nothing is timed. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SAME = G.counts('udf.same'), CALLS = G.counts('udf.calls'), BAT = G.counts('udf.batches'), WT = G.table('udf.wrong_type'), NUL = G.text('udf.null');
  var PY = G.file('code/udfs.py');
  var FUNCS = G.lines(PY, G.at(PY, /^def label_python/), G.at(PY, /return \{k: S\.plan_text/));
  var CALLCODE = G.lines(PY, G.at(PY, /^def runs_more_than_once/), G.at(PY, /return out/));
  var BATCODE = G.lines(PY, G.at(PY, /^def arrow_batches/), G.at(PY, /'calls': os\.path\.getsize/));
  var WRONG = G.lines(PY, G.at(PY, /^def wrong_return_type/), G.at(PY, /return \[list\(r\)/));
  var NULLC = G.lines(PY, G.at(PY, /^def null_handling/), G.at(PY, /return \[l\.strip\(\)/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var plan = function (k) { return G.text('udf.plan.' + k); };
  var op = function (k) { return (plan(k).match(/BatchEvalPython|ArrowEvalPython/) || ['no Python operator'])[0]; };
  var call = function (k) { if (CALLS[k] === undefined) throw new Error('no call count ' + k); return CALLS[k]; };
  G.expect(op('Python UDF') === 'BatchEvalPython' && op('Python UDF with Arrow') === 'ArrowEvalPython' && op('pandas UDF') === 'ArrowEvalPython' && op('built-in functions') === 'no Python operator', 'the operators of the four versions');
  G.expect(SAME.all_three_agree === true && call('deterministic, result filtered, then used twice') > call('deterministic, result used once') && call('non-deterministic, result filtered, then used twice') === CALLS.rows, 'call counts of the UDF');
  G.expect(BAT.calls >= BAT.rows / BAT.maxRecordsPerBatch && BAT.calls < BAT.rows / 100, 'a pandas UDF runs once for each batch');
  G.expect(WT.rows.every(function (r) { return r[1] === 'NULL' || r[1] === '' || r[1] === null; }) && /NoneType/.test(NUL), 'the two UDF failures');
  var LABELS = SAME.labels.map(function (l) { return [l[0], n0(l[1])]; });

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Python and UDFs', short: 'Python', blurb: 'How PySpark works, what a UDF costs, pandas UDFs, and the two silent failures', minutes: 50,
    focus: ['stg', 'int'],
    goals: [
      'Explain how **PySpark** works: Python on the driver, the JVM doing the work.',
      'Say what a **Python UDF** adds to the plan, and why the optimiser cannot see inside it.',
      'Choose between **built-in functions, a Python UDF, a UDF with Arrow and a pandas UDF**.',
      'Predict **how many times** a UDF is called, and why it can be more than once for each row.',
      'Spot the **wrong return type** that gives NULL, and the **NULL input** that fails.',
      'Say when to use `toPandas`, and when it is a mistake.'
    ],
    say: 'Mission 9 is about the place where Python meets Spark, and where most PySpark performance and most PySpark surprises come from. DataFrame code is not slow in Python, because Python only describes the plan and the JVM runs it. A UDF is the exception: it takes the data out of the JVM, row by row, to run your function. I labelled the 400,000 orders four ways, read the plan of each, counted how often a function is called, and recorded the two failures that make no noise.',
    scenes: [
      B.talk({
        id: 'm9-how', t: 1, src: 'docs', title: 'How PySpark works',
        say: 'PySpark is a Python program that drives a JVM. Press Next for the four parts of the picture.',
        items: [
          ['Python describes, the JVM runs', 'When you write `df.filter(...).groupBy(...)`, Python sends **plan fragments** to the JVM through a bridge called Py4J. The JVM builds the plan, optimises it and runs it. The rows never pass through Python. So a DataFrame job in Python is as fast as the same job in Scala.', 'DataFrame code is JVM code.'],
          ['When Python runs per row', 'The data **does** go to Python when you use a **UDF**, an RDD function, `mapInPandas`, `applyInPandas`, or `toPandas`. For a UDF, the JVM starts Python worker processes next to each executor, sends them rows, and reads the answers back.', 'A UDF takes the rows out of the JVM.'],
          ['The cost of leaving the JVM', 'Each row is serialised, sent to the Python process, run through your function, serialised again, and sent back. The optimiser cannot look inside the function: it cannot push a filter through it or prune a column it uses. And the Python workers use memory **outside the heap**, as mission 6 showed.', 'Serialising, no optimiser, extra memory.'],
          ['Built-in functions first', 'Spark has hundreds of built-in functions in `pyspark.sql.functions`: strings, dates, arrays, maps, JSON, regular expressions, `when`, `coalesce`. They run in the JVM, and the optimiser can see them. A UDF is the last resort.', 'Look in pyspark.sql.functions.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The question to ask:', t: 'can this be a `when`, a join to a small table, or a built-in function? If yes, it is not a UDF.' }
      }),

      B.code({
        id: 'm9-funcs', t: 1, src: 'rec', title: 'One label, four ways', file: 'udfs.py', lang: 'python', code: FUNCS,
        steps: [
          { say: 'The label of an order from its status: PAID is "ok", REFUNDED is "check", anything else is "other". I wrote it four ways. Press Next.', lines: null },
          { say: 'First, as a plain **Python function**: a dictionary lookup with a default. This is the function that the two UDFs wrap.', lines: G.span(FUNCS, /^def label_python/, /return \{/) },
          { say: 'Second, as a **pandas UDF**. The decorator `@pandas_udf(StringType())` says it returns strings, and the function takes a pandas Series, the whole batch of statuses, and returns a Series of labels.', lines: G.span(FUNCS, /^@pandas_udf/, /return status\.map/) },
          { say: 'In `plans`, the **built-in** version is a chain of `F.when`: no Python at all.', lines: G.span(FUNCS, /builtin = /) },
          { say: 'The **Python UDF** wraps the plain function with `udf(label_python, StringType())`. And the **Arrow** version is the same with `useArrow=True`, which makes the data travel in Arrow batches.', lines: G.span(FUNCS, /py = o\.withColumn/, /arrow = /) },
          { say: 'Then the function returns the plan of each version, as text. The next screens read them.', lines: G.span(FUNCS, /return \{k: S\.plan_text/) }
        ],
        note: 'Recorded. The four DataFrames select the same two columns of the orders and add a `label` column.'
      }),

      B.cmp({
        id: 'm9-four', t: 1, src: 'rec', title: 'Four versions, one operator that differs',
        say: 'I read the physical plan of each version. All four give the same counts. Only the operator that computes the label is different. Press Next to read the table.',
        cols: ['Version', 'Operator in the plan', 'Where the logic runs', 'The optimiser can'],
        hl: 1,
        rows: [
          ['Built-in `F.when`', op('built-in functions'), 'In the JVM, as part of the projection', 'See it, reorder it, push filters past it'],
          ['Python UDF', op('Python UDF'), 'In Python workers, one row at a time', 'Treat it as a black box'],
          ['Python UDF with Arrow', op('Python UDF with Arrow'), 'In Python workers, rows sent in Arrow batches, function called for each row', 'Treat it as a black box'],
          ['pandas UDF', op('pandas UDF'), 'In Python workers, a batch at a time, as a pandas Series', 'Treat it as a black box']
        ],
        steps: [
          { upto: 1, say: 'The built-in version has no operator for Python at all. The label is part of the ordinary projection. That is the best case.' },
          { upto: 2, say: '`BatchEvalPython` is the classic UDF. Rows are pickled in small batches and sent to Python, and the function is called for each row.' },
          { upto: 4, say: '`ArrowEvalPython` is used by the Arrow-based UDF and by the pandas UDF. Arrow is a columnar format that moves a batch of values at once, so the transfer is cheaper. A pandas UDF also computes a whole batch with vectorised code.' }
        ],
        pick: 'In an interview: **built-in, then pandas UDF, then a Python UDF**. And say the reason: the further you go to the right, the more the optimiser is blind and the more data crosses the JVM boundary.'
      }),

      B.widget({ id: 'm9-lab', kind: 'udflab', t: 1, src: 'rec', title: 'Lab: four plans and how often the function runs' }),

      B.rows({
        id: 'm9-same', t: 1, src: 'rec', title: 'All four versions give the same answer',
        steps: [
          {
            say: 'A UDF is not wrong. It is expensive. I grouped the orders by label with each version, and compared the results. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Orders for each label', c: 'raw', cols: ['label', 'orders'], rows: LABELS, trk: 1 }],
            notes: ['Recorded: `groupBy("label").count()` of the three versions that were compared (built-in, Python UDF, pandas UDF).']
          },
          {
            say: 'The built-in version, the Python UDF and the pandas UDF all returned exactly these counts: **' + LABELS.map(function (l) { return l[0] + ' ' + l[1]; }).join(', ') + '**. The recording compared the three result lists with `==` and the answer is **' + SAME.all_three_agree + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Orders for each label', c: 'raw', cols: ['label', 'orders'], rows: LABELS, trk: 1, chg: [[0, 1], [1, 1], [2, 1]] }],
            notes: ['So the choice is about cost, not correctness. And about what can go wrong later, which the next screens show.']
          }
        ]
      }),

      B.code({
        id: 'm9-calls', t: 2, src: 'rec', title: 'Counting the calls of a function', file: 'udfs.py', lang: 'python', code: CALLCODE,
        steps: [
          { say: 'How many times does Spark call your function for 1,000 rows? I counted from outside Spark. Press Next.', lines: null },
          { say: 'The function `counted` appends **one byte to a file** each time it is called, and returns twice its input. The size of the file is the number of calls. An accumulator would be unreliable here, because it can count a retried task twice.', lines: G.span(CALLCODE, /def counted/, /return x \* 2/) },
          { say: 'The input is 1,000 rows of `total_cents`. The function is used in three shapes: its result used **once**, used **twice**, and **filtered and then used twice**.', lines: G.span(CALLCODE, /o = spark\.read/, /result filtered, then used twice/) },
          { say: 'And twice over: as a normal function, which Spark assumes is **deterministic**, and marked with `asNondeterministic()`, which tells Spark that the result may change from call to call.', lines: G.span(CALLCODE, /for label, det in/, /asNondeterministic/) }
        ],
        note: 'Recorded: six counts. The deterministic function used after a filter is the one that surprises.'
      }),

      B.rows({
        id: 'm9-calls-rows', t: 2, src: 'rec', title: 'The same function called once, or four times for a row',
        steps: [
          {
            say: 'Here are the six counts, for ' + n0(CALLS.rows) + ' rows. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Calls of the function', c: 'raw', cols: ['case', 'calls for ' + n0(CALLS.rows) + ' rows'], rows: Object.keys(CALLS).filter(function (k) { return k !== 'rows'; }).map(function (k) { return [k, n0(CALLS[k])]; }), trk: 0 }],
            notes: ['Recorded: bytes in a tally file, one for each call.']
          },
          {
            say: 'A deterministic function whose result is used once, or twice, ran **' + n0(call('deterministic, result used once')) + '** times: once for each row. That is what you would expect.',
            tabs: [{ layer: 'RECORDED', name: 'Calls of the function', c: 'raw', cols: ['case', 'calls for ' + n0(CALLS.rows) + ' rows'], rows: Object.keys(CALLS).filter(function (k) { return k !== 'rows'; }).map(function (k) { return [k, n0(CALLS[k])]; }), trk: 0, chg: [[0, 1], [1, 1]] }],
            notes: ['Spark computed the function once and reused the value for the second column.']
          },
          {
            say: 'But when the result was **filtered and then used twice**, a deterministic function ran **' + n0(call('deterministic, result filtered, then used twice')) + '** times for ' + n0(CALLS.rows) + ' rows. Four times for each row. The optimiser pushed the expression into the filter and into each output column, and since the function is deterministic, it is allowed to repeat it.',
            tabs: [{ layer: 'RECORDED', name: 'Calls of the function', c: 'raw', cols: ['case', 'calls for ' + n0(CALLS.rows) + ' rows'], rows: Object.keys(CALLS).filter(function (k) { return k !== 'rows'; }).map(function (k) { return [k, n0(CALLS[k])]; }), trk: 2, chg: [[2, 1]] }],
            notes: ['If the function calls a service or reads a file, a plan like this multiplies the load by four. You would not see it in your code.']
          },
          {
            say: 'A **non-deterministic** function ran **' + n0(call('non-deterministic, result filtered, then used twice')) + '** times in the same shape, because Spark is not allowed to repeat it. So `asNondeterministic()` is also the tool to say "call this once for each row". The count depends on the plan, so never build logic on it.',
            tabs: [{ layer: 'RECORDED', name: 'Calls of the function', c: 'raw', cols: ['case', 'calls for ' + n0(CALLS.rows) + ' rows'], rows: Object.keys(CALLS).filter(function (k) { return k !== 'rows'; }).map(function (k) { return [k, n0(CALLS[k])]; }), trk: 5, chg: [[3, 1], [4, 1], [5, 1]] }],
            notes: ['A UDF with a side effect (a write, a counter, an API call) is a bug waiting for a plan to change. Keep UDFs pure.']
          }
        ]
      }),

      B.code({
        id: 'm9-batches', t: 2, src: 'rec', title: 'A pandas UDF is called for a batch, not a row', file: 'udfs.py', lang: 'python', code: BATCODE,
        steps: [
          { say: 'The pandas UDF in this function does nothing to the data. It only records that it was called. Press Next.', lines: null },
          { say: '`batch_counter` takes a pandas Series, appends one byte to a tally file, and returns the Series as it came. One byte per call.', lines: G.span(BATCODE, /@pandas_udf/, /return x/) },
          { say: 'The query reads the 400,000 orders, applies the UDF to `total_cents` and sums the result. The tally counts the calls.', lines: G.span(BATCODE, /spark\.read\.parquet/) }
        ],
        note: 'Recorded: ' + n0(BAT.rows) + ' rows, `spark.sql.execution.arrow.maxRecordsPerBatch` of ' + n0(BAT.maxRecordsPerBatch) + '.'
      }),

      B.rows({
        id: 'm9-batches-rows', t: 2, src: 'rec', title: 'Forty-odd calls instead of four hundred thousand',
        steps: [
          {
            say: 'The pandas UDF was called **' + BAT.calls + '** times for ' + n0(BAT.rows) + ' rows. A Python UDF would have been called ' + n0(BAT.rows) + ' times.',
            tabs: [{ layer: 'RECORDED', name: 'Calls of a pandas UDF', c: 'raw', cols: ['what', 'value'], rows: [['rows', n0(BAT.rows)], ['maxRecordsPerBatch', n0(BAT.maxRecordsPerBatch)], ['calls of the function', BAT.calls], ['rows for each call, on average', n0(Math.round(BAT.rows / BAT.calls))]], trk: 2 }],
            notes: ['Recorded: the size of the tally file. The calls are a little more than 400,000 divided by 10,000, because each of the partitions ends with a smaller batch.']
          },
          {
            say: 'This is the reason a pandas UDF is faster: **the per-call cost is paid ' + BAT.calls + ' times**, and the work inside is vectorised pandas or NumPy code. The batch size is `spark.sql.execution.arrow.maxRecordsPerBatch`. A bigger batch means fewer calls and more memory for each call in the Python worker.',
            tabs: [{ layer: 'RECORDED', name: 'Calls of a pandas UDF', c: 'raw', cols: ['what', 'value'], rows: [['rows', n0(BAT.rows)], ['maxRecordsPerBatch', n0(BAT.maxRecordsPerBatch)], ['calls of the function', BAT.calls], ['rows for each call, on average', n0(Math.round(BAT.rows / BAT.calls))]], trk: 3, chg: [[2, 1]] }],
            notes: ['If a pandas UDF runs a container out of memory, a smaller batch is the first thing to try. Mission 6 had the incident.']
          }
        ]
      }),

      B.code({
        id: 'm9-wrong', t: 1, src: 'rec', title: 'A wrong return type gives NULL, with no error', file: 'udfs.py', lang: 'python', code: WRONG,
        steps: [
          { say: 'A UDF must declare the type that it returns. What if the function returns something else? Press Next.', lines: null },
          { say: 'The function turns a status into upper case, so it returns a **string**. But it is declared `IntegerType()`.', lines: G.span(WRONG, /bad = udf/) },
          { say: 'Two rows go in: `paid` and `new`. The column `v` is added with the UDF, and the rows are collected.', lines: G.span(WRONG, /df = spark\.createDataFrame/, /collect/) }
        ],
        note: 'Recorded: the result is on the next screen.'
      }),

      B.rows({
        id: 'm9-wrong-rows', t: 1, src: 'rec', title: 'What the wrong type returned',
        steps: [
          {
            say: 'Here are the rows. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'A UDF declared integer, returning text', c: 'raw', cols: WT.cols, rows: WT.rows.map(function (r) { return [r[0], r[1] === '' || r[1] === null ? 'NULL' : r[1]]; }), trk: 0 }],
            notes: ['Recorded: the rows of the collected DataFrame.']
          },
          {
            say: 'Every `v` is **NULL**. No error, no warning, no log line. Spark could not turn the string `PAID` into an integer, and it quietly made a NULL. With a million rows, a whole column of NULLs may go to a report.',
            tabs: [{ layer: 'RECORDED', name: 'A UDF declared integer, returning text', c: 'raw', cols: WT.cols, rows: WT.rows.map(function (r) { return [r[0], r[1] === '' || r[1] === null ? 'NULL' : r[1]]; }), trk: 0, chg: [[0, 1], [1, 1]] }],
            notes: ['A test with one row and an assertion that the column is not all NULL would have caught it. Mission 12 writes such tests.']
          }
        ]
      }),

      B.code({
        id: 'm9-null', t: 1, src: 'rec', title: 'A NULL input fails the UDF', file: 'udfs.py', lang: 'python', code: NULLC,
        steps: [
          { say: 'The second silent-looking failure. A UDF that takes the length of a customer id. One of the two customers is NULL, a guest. Press Next.', lines: null },
          { say: 'The function is `lambda s: len(s)`. It has no check for `None`.', lines: G.span(NULLC, /f = udf/) },
          { say: 'The DataFrame has two rows: `c00001` and a NULL. Spark calls the function with `None` for the NULL. `len(None)` is a Python error, and the task fails.', lines: G.span(NULLC, /df = spark\.createDataFrame/, /df\.withColumn/) },
          { say: 'The message that Spark reports is the Python error: **' + NUL + '**. This one is not silent. It stops the job, on the first guest order.', lines: G.span(NULLC, /TypeError/) }
        ],
        note: 'Recorded. About a quarter of the Brewline orders have a NULL customer id, so this failure arrives in the first partition. The cure is a check for `None` inside the function, or a built-in like `length`, which handles NULL.'
      }),

      B.talk({
        id: 'm9-safe', t: 1, src: 'docs', title: 'Writing a UDF that you can trust',
        say: 'If you must write one, these rules save the most pain. Press Next.',
        items: [
          ['Declare the return type, and test it', 'The declared type must match what the function returns. A mismatch gives NULL, as you saw. Test with a row and assert on the result.', 'Declared type equals real type.'],
          ['Handle None', 'Spark passes `None` for a NULL. Check for it at the top of the function, and decide what a NULL means.', 'Expect None.'],
          ['Keep it pure', 'No writes, no counters, no calls to a service inside the function. The plan can call it more than once, as the recording showed, or zero times for a row that was filtered out.', 'No side effects.'],
          ['Mark non-deterministic work', 'A function that depends on time, randomness or external state is `asNondeterministic()`, so that Spark does not repeat it.', 'Say when it is not pure.'],
          ['Do not capture big objects', 'A function that uses a large dictionary or model inside its closure ships it to every task. Use a broadcast variable, or better, a join to a small table.', 'No big closures.'],
          ['Prefer batches', 'A pandas UDF, or `mapInPandas` and `applyInPandas` for group logic, does the work for a batch at a time with vectorised code.', 'Vectorise.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm9-driver', t: 1, src: 'docs', title: 'collect(), toPandas() and the driver',
        say: 'The other way that Python takes the rows out of the JVM is to pull them to the driver. Press Next for the rules.',
        items: [
          ['collect() and toPandas()', 'Both bring **every row** of the DataFrame to the driver, as Python objects. On a big table they run the driver out of memory. Mission 2 had the bug: `len(df.collect())` where `df.count()` would do.', 'Everything lands in one process.'],
          ['When they are right', 'For a small result: a summary, a list of twelve stores, a sample for a plot. Reduce first with `limit`, `groupBy` or `sample`, and then bring it back. `spark.sql.execution.arrow.pyspark.enabled` makes `toPandas` faster by using Arrow.', 'Small results only.'],
          ['A guard', '`spark.driver.maxResultSize` (1 GiB by default) stops a collect that is too big with an error, instead of letting the driver die. The recording of mission 14 shows the message.', 'The default is a safety net.'],
          ['pandas API on Spark', '`pyspark.pandas` offers the pandas API on Spark DataFrames, so that pandas code can scale. It builds Spark plans underneath, and some pandas habits (row by row loops, an index that needs a global order) are slow. It also depends on the version of pandas that you install.', 'Pandas style, Spark engine.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The review question:', t: 'for every collect or toPandas in a pull request, ask how many rows come back at the largest day.' }
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: map 40 product codes to categories',
        scenario: 'The business has about 40 product codes that map to 8 categories, and the mapping changes every month when the menu changes. A job needs the category of each order line. A colleague suggests a Python UDF with a dictionary of the 40 codes. You decide.',
        opts: [
          { t: 'A Python UDF with a dictionary inside', d: 'Quick to write.', lose: 'A UDF blocks the optimiser, ships rows to Python, and the dictionary is code that changes every month, so each change is a release.' },
          { t: 'Put the mapping in a small table and join to it (a broadcast join)', d: 'The mapping is data. The join runs in the JVM.', lose: '' },
          { t: 'A pandas UDF with a dictionary inside', d: 'Faster than a Python UDF.', lose: 'Still a UDF with the mapping hidden in code, and still outside the JVM. The table is simpler and the optimiser can see it.' }
        ],
        pick: 1,
        why: 'Rules that change are **data**, not code. A 40-row table broadcast to every executor costs almost nothing, runs in the JVM, can be versioned and tested, and can be read by the business. A UDF is for logic that no join or built-in function can express.',
        when: 'If the rule is a real algorithm (a parser, a model, a checksum), a pandas UDF is the right tool, with the rules above.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, q: 'This UDF is supposed to return the length of the status. A report shows the whole column as NULL, with no error. Click the line that causes it.',
        file: 'status_len.py', lang: 'python',
        code: ['from pyspark.sql.functions import udf', 'from pyspark.sql.types import IntegerType', 'to_upper = udf(lambda s: s.upper(), IntegerType())', 'df = df.withColumn("v", to_upper("status"))'].join('\n'),
        bad: [3],
        hint: 'Compare what the lambda returns with the declared type.',
        why: 'The lambda returns a **string**, and the UDF is declared to return an **integer**. Spark does not stop. It returns NULL for every row, which is what the recording showed for `paid` and `new`. Declare `StringType()` for a string result, or return `len(s)` if you want an integer. And test it.',
        fix: ['from pyspark.sql.functions import udf', 'from pyspark.sql.types import StringType', 'to_upper = udf(lambda s: s.upper() if s is not None else None, StringType())', 'df = df.withColumn("v", to_upper("status"))'].join('\n'),
        cheer: 'The declared type must match what the function returns, and None must be handled.'
      }),

      B.incident({
        id: 'm9-inc', t: 1, src: 'rec', title: 'Incident: the job dies on the first guest order', time: '03:10',
        alert: '**A new customer-segment job fails within a minute with `TypeError: object of type \'NoneType\' has no len()`.** It passed in the test on ten rows. Production has 400 million orders.',
        clues: ['The error comes from a Python UDF', 'The test data had a customer id on every row', 'About a quarter of the real orders are guests with a NULL customer id'],
        opts: [
          { t: 'Handle None in the function (or use a built-in that is null-safe, like `length`), and add a NULL row to the test data', fb: '' },
          { t: 'Retry the job', fb: 'Every retry fails on the same row.' },
          { t: 'Filter out the NULLs from the report and ignore the error', fb: 'The error stops the job before any filter. And you would drop a quarter of the orders.' },
          { t: 'Increase the memory', fb: 'It is not a memory problem.' }
        ],
        best: 0,
        why: 'Spark calls a UDF with `None` for a NULL. `len(None)` is an error in Python. The test data had no NULL, so nobody saw it. In the recording the message was **' + NUL + '**. A built-in like `length` returns NULL for a NULL, and needs no check.',
        checks: [
          ['Read the Python error', 'The traceback names the line and the type: `NoneType`.'],
          ['Find the cause', 'The function has no check for `None`.'],
          ['Fix it', 'Return `None` for `None`, or use a built-in function.'],
          ['Guard', 'Put NULLs, empty strings and ties into every test fixture. Mission 12 shows how.']
        ],
        tell: 'The UDF failed on a NULL customer id: Spark passes None to the function, and len(None) is an error. The test data had no guest orders. I used the built-in length, and added a NULL row to the test fixture.',
        prevent: ['Test fixtures with NULLs and ties', 'Prefer built-in functions: they handle NULL', 'Review every UDF for None']
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'Which version of the label has no Python operator in its plan?',
        opts: [{ t: 'The Python UDF', fb: 'The plan has ' + op('Python UDF') + '.' }, { t: 'The pandas UDF', fb: 'The plan has ' + op('pandas UDF') + '.' }, { t: 'The built-in `F.when` chain', fb: '' }, { t: 'The Arrow UDF', fb: 'The plan has ' + op('Python UDF with Arrow') + '.' }],
        ok: 2,
        why: 'The built-in version is part of the ordinary projection and runs in the JVM. The optimiser can see it.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'A UDF is declared to return an integer and returns a string. What happens?',
        opts: [{ t: 'The job fails with a type error', fb: 'That would be easier.' }, { t: 'The column is NULL for every row, with no error', fb: '' }, { t: 'Spark converts the string to a number', fb: 'It cannot.' }, { t: 'Spark ignores the declaration', fb: 'It uses it, and that is the problem.' }],
        ok: 1,
        why: 'In the recording, `v` was NULL for both rows.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'A pandas UDF is applied to 400,000 rows with the default batch size. About how many times is the Python function called?',
        opts: [{ t: '400,000', fb: 'That is a Python UDF.' }, { t: 'About ' + BAT.calls, fb: '' }, { t: 'Once', fb: 'There are several partitions and several batches.' }, { t: 'Zero', fb: 'It runs.' }],
        ok: 1,
        why: 'The recording counted ' + BAT.calls + ' calls, with up to ' + n0(BAT.maxRecordsPerBatch) + ' rows in each batch.'
      }),

      B.quiz({
        id: 'm9-q4', t: 2,
        q: 'Why can the optimiser not push a filter through a Python UDF?',
        opts: [{ t: 'It does not know what the function does inside', fb: '' }, { t: 'Filters cannot be pushed in Spark', fb: 'They can, through built-in expressions.' }, { t: 'The UDF is slow', fb: 'Speed is not the reason.' }, { t: 'Python is not allowed in plans', fb: 'It is allowed.' }],
        ok: 0,
        why: 'To a UDF the optimiser sees only "a black box that takes columns and returns a column". It cannot reorder it, prune its columns or use its result in a pushed filter.'
      }),

      B.quiz({
        id: 'm9-q5', t: 2,
        q: 'A deterministic UDF is used after a filter and in two output columns. For 1,000 rows, the recording counted how many calls?',
        opts: [{ t: '1,000', fb: 'That was the case with a non-deterministic function.' }, { t: '4,000', fb: '' }, { t: '2,000', fb: 'It was more than that.' }, { t: '500', fb: 'No.' }],
        ok: 1,
        why: 'The optimiser may repeat a deterministic expression, and did: ' + n0(call('deterministic, result filtered, then used twice')) + ' calls. Never count on the number of calls.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the steps of replacing a slow UDF in order.',
        items: [
          'Find the UDF in the plan: BatchEvalPython or ArrowEvalPython',
          'Read the function and ask whether a built-in function or a join can do it',
          'Write the replacement with built-in functions',
          'Compare the counts or rows of the old and the new version on the same data',
          'Look at the plan again: the Python operator should be gone',
          'Keep a test with NULLs and ties'
        ],
        why: 'Equal answers first, then a plan without the Python operator. The test keeps the behaviour, including the awkward rows, from changing.'
      }),

      B.qa({
        id: 'qa-udf', t: 1, tag: 'PySpark', secs: 90,
        q: 'Python UDF, pandas UDF or a built-in function: how do you choose?',
        pts: ['Built-in first: JVM, optimiser sees it', 'Python UDF: rows pickled to Python workers, black box', 'pandas UDF: batches in Arrow, vectorised', 'Plan shows BatchEvalPython / ArrowEvalPython', 'Failures: wrong type gives NULL, None input fails', 'Rules that change are data: join'],
        short: 'I go **built-in first**, because built-in functions run in the JVM and the optimiser can see and reorder them. If the logic is a lookup or a rule that changes, I make it a table and **join** to it. If I truly need custom logic, I use a **pandas UDF**: the data travels in Arrow batches and the function is vectorised, so in my test it was called 42 times for 400,000 rows. A plain **Python UDF** is the last choice, since each row is pickled to a Python worker and the optimiser sees a black box. In the plan I look for `BatchEvalPython` or `ArrowEvalPython`. And I test the two silent failures: a wrong declared return type, which gave NULL for every row, and a None input, which failed the job.',
        fu: [['How many times is a UDF called?', 'Not necessarily once for each row. I counted 4,000 calls for 1,000 rows when a deterministic function was used after a filter and in two columns.'], ['Is a UDF always slower?', 'Usually, because of serialisation and the closed box. I did not time it, since a laptop run proves little. I compare plans and counts.']],
        trap: 'Reaching for a UDF before looking at pyspark.sql.functions.',
        real: 'You inherit a job with six UDFs. What do you do?'
      }),

      B.qa({
        id: 'qa-pyspark', t: 1, tag: 'PySpark', secs: 75,
        q: 'How does PySpark work, and when does it become slow?',
        pts: ['Python drives a JVM through Py4J', 'DataFrame code is plan fragments: the JVM runs it', 'Same speed as Scala for DataFrame work', 'Slow when data leaves the JVM: UDF, RDD lambdas, collect, toPandas', 'Python workers outside the heap: memoryOverhead', 'Use built-ins, Arrow, small results'],
        short: 'PySpark is a Python program that talks to a JVM through Py4J. When I write DataFrame code, Python only sends plan fragments, and the JVM optimises and runs the plan, so it is as fast as Scala. It becomes slow when the data has to **leave the JVM**: a Python UDF, a function on an RDD, `mapInPandas`, or pulling rows to the driver with `collect` or `toPandas`. Then rows are serialised and sent to Python worker processes, which also use memory outside the heap, so the overhead setting matters. I keep the work in built-in functions, use pandas UDFs with Arrow when I need Python, and only collect small results.',
        fu: [['What is Py4J?', 'A bridge that lets Python call JVM objects. It carries the plan, not the data.'], ['What is Arrow?', 'A columnar in-memory format that moves a batch of values between the JVM and Python cheaply.']],
        trap: 'Saying that PySpark is slower than Scala for all work.',
        real: 'A PySpark job is slow. What do you look at first?'
      }),

      B.qa({
        id: 'qa-collect', t: 2, tag: 'PySpark', secs: 60,
        q: 'What is wrong with collect() and toPandas() on a big DataFrame?',
        pts: ['Every row comes to the driver as Python objects', 'Driver out of memory', 'maxResultSize as a guard', 'Reduce first: limit, groupBy, sample', 'Arrow makes toPandas faster', 'count() instead of len(collect())'],
        short: 'Both bring **every row** to the driver, one machine, as Python objects. On a big table the driver runs out of memory, long before the executors are busy. `spark.driver.maxResultSize` is a guard that stops it with an error. I reduce first, with a `limit`, a `groupBy` or a `sample`, and bring back only a small result. Arrow makes `toPandas` faster. And I do not use `len(df.collect())`: `df.count()` counts on the executors and returns one number.',
        fu: [['How would you plot a big table?', 'Aggregate or sample in Spark, then `toPandas` the small result.'], ['What if the result must be big?', 'Write it to files from the executors, and do not pass it through the driver.']],
        trap: 'Using toPandas to "see the data" on a table of billions.',
        real: 'The driver crashed in the last stage of your job. What do you check?'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'UDF Skeptic', color: '#FBCFE8',
        pts: [
          'PySpark **describes**, the JVM **runs**. DataFrame code is as fast as Scala. Data leaves the JVM only for UDFs, RDD functions and `collect`.',
          'Four plans: built-in has **no Python operator**, a Python UDF has **' + op('Python UDF') + '**, Arrow and pandas UDFs have **' + op('pandas UDF') + '**. All four gave the same counts.',
          'A **pandas UDF** was called **' + BAT.calls + '** times for ' + n0(BAT.rows) + ' rows. A deterministic UDF after a filter was called **' + n0(call('deterministic, result filtered, then used twice')) + '** times for ' + n0(CALLS.rows) + ' rows.',
          'A wrong **return type** gives **NULL** with no error. A **None** input fails the job: `' + NUL + '`.',
          'Rules that change are **data**: join to a small table. Keep UDFs pure, declare the type, handle None.',
          '`collect` and `toPandas` bring everything to the driver. Use `count()`, and reduce first.'
        ],
        lines: [
          'I look in pyspark.sql.functions before I write a UDF.',
          'I put NULLs in my test data.',
          'I read the plan for BatchEvalPython.'
        ]
      })
    ]
  });
})();
