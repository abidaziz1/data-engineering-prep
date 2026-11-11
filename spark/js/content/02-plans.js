/* Mission 2: lazy evaluation and the plans. Which lines start a job, the four plans of one query (parsed, analyzed, optimized, physical), what the optimiser did to it,
   and why SQL and DataFrames are one thing. Every plan and every job count is from a real Spark 4.0.1 in local mode. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LZ = G.table('lazy.steps');
  var PARSED = G.text('plans.parsed'), ANALYZED = G.text('plans.analyzed'), OPT = G.text('plans.optimized'), FMT = G.text('plans.formatted').replace(/\n{3,}/g, '\n\n').trim();
  var FOLD = '-- the plan that I wrote (analyzed)\n' + G.text('plans.fold_before') + '\n\n-- the plan that runs (optimized)\n' + G.text('plans.fold_after');
  var PY = G.file('code/plans.py');
  var QUERY = G.lines(PY, G.at(PY, /^def plans_of/), G.at(PY, /return q, S\.plan_text/));
  var SQLAPI = G.lines(PY, G.at(PY, /^def sql_and_dataframe/), G.at(PY, /return sql, api/));
  var SAME = G.counts('plans.same');
  G.expect(SAME.sql_and_dataframe_have_the_same_plan === true, 'SQL and DataFrame give the same plan');
  G.expect(LZ.rows[0][1] === 1 && LZ.rows[1][1] === 0 && LZ.rows[6][1] >= 1, 'a transformation starts no job and an action does');
  var jobs = function (label) { var r = LZ.rows.filter(function (x) { return x[0].indexOf(label) === 0; })[0]; if (!r) throw new Error('no lazy step ' + label); return r[1]; };

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Lazy evaluation and the plan', short: 'Plan', blurb: 'What runs when, and the four plans Spark builds for one query', minutes: 55,
    focus: ['stg', 'src'],
    goals: [
      'Say which lines of a program start a **job**, and why most lines start none.',
      'Name the four plans: **parsed, analyzed, optimized, physical**, and what each one adds.',
      'Read a **physical plan** from the bottom up: scan, filter, partial aggregate, exchange, final aggregate.',
      'Find **partition filters** and **pushed filters** in a scan, and say what they save.',
      'Explain what the optimiser did to a query: combine filters, fold constants, prune columns.',
      'Say why a **SQL query and a DataFrame** are the same thing to Spark.'
    ],
    say: 'Mission 2 is the most important one. Almost every Spark tuning question starts with reading a plan, and you cannot read a plan until you know that Spark builds one before it does anything. I ran one small query on the Brewline orders and asked Spark for every plan it made. Then I counted the jobs that each line of the program started. The numbers are real. The surprises in them are the lesson.',
    scenes: [
      B.talk({
        id: 'm2-lazy', t: 1, src: 'docs', title: 'Transformations are lazy, actions are not',
        say: 'Spark does not run a line when you write it. It records the step and waits. Press Next for the three ideas.',
        items: [
          ['Transformations', '`filter`, `select`, `join`, `groupBy`, `withColumn` return a **new DataFrame** and run nothing. A DataFrame is a description: where the data is, and what to do with it. It is immutable, so `df.filter(...)` without an assignment changes nothing.', 'A transformation adds a step.'],
          ['Actions', '`count`, `collect`, `show`, `take`, and `write` make Spark **run** the plan, and bring back a result or write files. An action starts at least one job.', 'An action runs the plan.'],
          ['Why wait', 'Because the whole plan is known before it runs, Spark can **reorder, merge and drop** steps. It can read only the columns you use, skip files that cannot match, and pick a better join. If it ran every line at once, it could not see the end of the query.', 'Waiting lets Spark optimise the whole query.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The classic bug:', t: 'a job that "succeeds" in three seconds and writes nothing. A transformation was never assigned or no action ran. Mission 12 shows a test that catches it.' }
      }),

      B.rows({
        id: 'm2-jobs', t: 1, src: 'rec', title: 'Which line starts a job?',
        steps: [
          {
            say: 'I wrote a small pipeline one line at a time, and after each line counted the jobs that Spark had started. Look at the first column: the line. Look at the second: the jobs. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Jobs started by each line', c: 'raw', cols: LZ.cols, rows: LZ.rows, trk: 0 }],
            notes: ['Recorded: a job group around each line, and the number of job ids Spark reported for it.']
          },
          {
            say: 'The first line, `read.parquet`, started **' + jobs('spark.read.parquet') + '** job, although it is not an action. To build the DataFrame Spark has to know the **schema**, so it reads the footers of the Parquet files. That job reads no data rows. Everything else that only describes the work started none: `filter`, `select`, `groupBy`, even `explain()` and `.columns`.',
            tabs: [{ layer: 'RECORDED', name: 'Jobs started by each line', c: 'raw', cols: LZ.cols, rows: LZ.rows, trk: 4 }],
            notes: ['`explain()` builds the plan and prints it, and runs nothing. It is free. Use it all the time.']
          },
          {
            say: 'Now the actions. `count()` started **' + jobs('.count') + '** jobs, `collect()` and `show(3)` and the write **' + jobs('.collect') + '** each. Not one. That is adaptive execution: Spark runs the first part of the query up to a shuffle, looks at the real sizes, and plans the rest. Each such piece is its own job in the UI.',
            tabs: [{ layer: 'RECORDED', name: 'Jobs started by each line', c: 'raw', cols: LZ.cols, rows: LZ.rows, trk: 6 }],
            notes: ['So "one action is one job" is a rule of thumb, not a law. The number you see depends on the plan.']
          }
        ]
      }),

      B.code({
        id: 'm2-query', t: 1, src: 'rec', title: 'The query that I asked Spark about', file: 'plans.py', lang: 'python', code: QUERY,
        steps: [
          { say: 'This is the query. Paid orders from 5 November on, the store and the total, and revenue by store. Four transformations, and then I asked for the plans. Press Next.', lines: null },
          { say: 'Two `filter` calls: one on the status, one on the day. I wrote them as two steps on purpose, to see what the optimiser does with them.', lines: G.span(QUERY, /filter\(F\.col\('status'\)/) },
          { say: '`select` keeps two columns and `groupBy` with `agg` sums the total by store. Nothing has run.', lines: G.span(QUERY, /select\('store_id'/) },
          { say: 'The last line asks for the plan as text twice: in the `extended` mode, which prints four plans, and in the `formatted` mode, which numbers the steps of the final one.', lines: G.span(QUERY, /return q, S\.plan_text/) }
        ],
        note: 'Recorded: the plans on the next screens are the output of these two calls, on the 400,000 Brewline orders. Expression ids like `#12` are renumbered from 1 so that the text is the same on every run.'
      }),

      B.flow({
        id: 'm2-stages', t: 1, src: 'docs', title: 'Code to tasks in seven steps', g: 'plan', legend: true,
        steps: [
          { say: 'Before a single row is read, your query goes through a pipeline of plans. This is the path. Press Next to walk it. The next four screens show the recorded text of the first four plans.', cap: 'Your code becomes tasks.' },
          { say: 'Step 1. Your code is turned into a **parsed logical plan**: a tree of operators exactly as you wrote them. Names are just words. Nothing has checked that a column exists.', on: ['q1'], focus: ['p_code', 'p_parsed'], tags: ['tg_lazy'], cap: 'The parsed plan is your code as a tree.' },
          { say: 'Step 2. The **analyzer** looks every name up in the catalog and in the data source, and gives every column a type and a unique id. A wrong column name fails here, with a message that suggests the right one.', on: ['q2'], focus: ['p_parsed', 'p_analyzed'], tags: ['tg_cat'], cap: 'The analyzed plan has names and types.' },
          { say: 'Step 3. The **optimizer**, called Catalyst, rewrites the tree with rules: it combines filters, moves them down, folds constants, drops columns that nobody uses. The result means the same and costs less.', on: ['q3'], focus: ['p_analyzed', 'p_opt'], cap: 'The optimized plan means the same, for less.' },
          { say: 'Step 4. The **planner** picks real implementations: a file scan, a hash aggregate, a sort-merge or broadcast join, and where an exchange (a shuffle) has to go. This is the **physical plan**, the one `explain()` prints by default.', on: ['q4'], focus: ['p_opt', 'p_phys'], cap: 'The physical plan has real operators.' },
          { say: 'Step 5. With **adaptive query execution** the physical plan is a first guess. After a shuffle stage has run, Spark knows the real sizes, and it can plan the rest again. The plan is marked `isFinalPlan=false` until then.', on: ['q5'], focus: ['p_phys', 'p_aqe'], tags: ['tg_same'], cap: 'Adaptive execution plans again at run time.' },
          { say: 'Step 6. The scheduler cuts the plan into **stages** at every exchange, and each stage into one **task** per partition. These are what the executors receive.', on: ['q6'], focus: ['p_aqe', 'p_dag'], cap: 'Stages and tasks go to the executors.' },
          { say: 'Step 7. The **SQL tab** of the Spark UI draws the plan with the numbers of each run next to each operator. It is the first place to look when a query is slow.', on: ['q7'], focus: ['p_dag', 'p_ui'], cap: 'The SQL tab shows the plan and the numbers.' }
        ]
      }),

      B.code({
        id: 'm2-parsed', t: 1, src: 'rec', title: 'Plan 1: parsed', file: 'parsed plan', lang: 'text', code: PARSED,
        steps: [
          { say: 'The parsed plan is printed as a tree. Read it from the **bottom up**, because the data flows up. The deepest line is the source. Press Next.', lines: null },
          { say: '`Relation` is the Parquet source, with its eight columns. This is where the data comes in.', lines: G.span(PARSED, /Relation/) },
          { say: 'Two `Filter` lines. They are the two `filter` calls, still separate, in the order I wrote them: first the status, then the day.', lines: G.span(PARSED, /Filter \(dt/, /Filter \(status/) },
          { say: 'Then `Project`, the `select`, and on top the `Aggregate`, the `groupBy` with the sum.', lines: G.span(PARSED, /Project/) },
          { say: 'Look at the top line. There is a quote in front of `\'Aggregate`, `\'store_id` and `\'sum`. A quote means **unresolved**: Spark has not yet checked that the operator and its columns exist. The analyzer does that next.', lines: G.span(PARSED, /^\'?Aggregate/) }
        ],
        note: 'Recorded with `explain(extended=True)` on Spark ' + G.counts('submit.version').spark + '. The `#` numbers are column ids.'
      }),

      B.code({
        id: 'm2-analyzed', t: 1, src: 'rec', title: 'Plan 2: analyzed', file: 'analyzed plan', lang: 'text', code: ANALYZED,
        steps: [
          { say: 'The analyzed plan is the same tree with every name resolved. Press Next.', lines: null },
          { say: 'The first line is new: the **schema of the result**, `store_id` as a string and `revenue` as a bigint. Spark now knows the type of the answer before it has read a row.', lines: G.span(ANALYZED, /^store_id: string/) },
          { say: 'The quotes are gone. Every column is found, with a unique id such as `#1`. The `L` after an id means a long integer. If a name did not exist, the query would have stopped here with an error that suggests the closest column names.', lines: G.span(ANALYZED, /^Aggregate/) },
          { say: 'The two filters are still two filters. The optimiser has not touched the plan yet.', lines: G.span(ANALYZED, /Filter \(dt/, /Filter \(status/) }
        ],
        note: 'A typo in a column name is caught in this step, before any data is read. Mission 14 shows the real message.'
      }),

      B.code({
        id: 'm2-optimized', t: 1, src: 'rec', title: 'Plan 3: optimized', file: 'optimized plan', lang: 'text', code: OPT,
        steps: [
          { say: 'Now the same query after the optimiser. It means the same and has fewer lines. Press Next.', lines: null },
          { say: 'The two `Filter` lines became **one**, with the conditions joined by `AND`. The rows are judged once.', lines: G.span(OPT, /Filter/) },
          { say: 'The optimiser added `isnotnull` checks for `status` and `dt`. A comparison with a constant can never be true for NULL, so Spark may drop NULLs early, and it can tell the file reader to do the same.', lines: G.span(OPT, /Filter/) },
          { say: 'In the analyzed plan the day was `cast(2026-11-05 as date)`. Here it is the plain value `2026-11-05`. Spark worked it out **once**, at planning time, and not once for each row. That is **constant folding**.', lines: G.span(OPT, /Filter/) }
        ],
        note: 'These rules have names in the Spark source: `CombineFilters`, `InferFiltersFromConstraints`, `ConstantFolding`. You do not call them. You read their result.'
      }),

      B.code({
        id: 'm2-physical', t: 1, src: 'rec', title: 'Plan 4: physical, read from the bottom', file: 'formatted plan', lang: 'text', code: FMT,
        steps: [
          { say: 'The physical plan is the one that `explain()` prints. The `formatted` mode numbers the operators and lists what each one does. Spark runs them from number 1 up. Press Next.', lines: null },
          { say: '**(1) Scan parquet** reads the files. Look at three lines. `PartitionFilters` is the filter on the `dt` folder: whole folders are skipped. `PushedFilters` is handed to the Parquet reader, which can skip row groups. `ReadSchema` shows that only **three** of the eight columns are read.', lines: G.span(FMT, /^\(1\) Scan parquet/, /^ReadSchema/) },
          { say: '**(2) Filter** and **(3) Project** keep the rows that are paid, and the two columns that are needed. The filter appears again after the scan: the reader only pushed it as a hint, and Spark applies it to be safe.', lines: G.span(FMT, /^\(2\) Filter/, /^Output \[2\]/) },
          { say: '**(4) HashAggregate** with `partial_sum`. Every task adds up **its own rows first**, per store. This is the partial aggregation that makes a group by cheap: the shuffle will move partial sums, not orders.', lines: G.span(FMT, /^\(4\) HashAggregate/, /^Results \[2\]/) },
          { say: '**(5) Exchange** is the shuffle. `hashpartitioning(store_id, 8)` means: send each row to one of 8 partitions by the hash of the store id, so all rows of a store meet. This is where Spark cuts the plan into two stages.', lines: G.span(FMT, /^\(5\) Exchange/, /^Arguments/) },
          { say: '**(6) HashAggregate** again, now with the plain `sum`. It adds the partial sums of each store. And **(7) AdaptiveSparkPlan** at the top says `isFinalPlan=false`: this is a first plan, and adaptive execution may change the rest after the shuffle ran.', lines: G.span(FMT, /^\(6\) HashAggregate/, /^\(7\)/) }
        ],
        note: 'Recorded: `explain(mode="formatted")`. The shuffle has 8 partitions because the recording session sets `spark.sql.shuffle.partitions` to 8. The default is 200. Mission 3 compares them.'
      }),

      B.cmp({
        id: 'm2-did', t: 1, src: 'rec', title: 'What the optimiser did to this query',
        say: 'Six things happened between the code and the plan. Each one is a line that you can find in the screens you just saw. Press Next to read the pattern.',
        cols: ['What it did', 'Where to see it', 'What it saves'],
        hl: 2,
        rows: [
          ['Combined two filters into one', 'Two `Filter` lines in the analyzed plan, one in the optimized', 'The rows are judged once'],
          ['Added `isnotnull` checks', 'In the `Filter` of the optimized plan', 'NULL rows leave early, and the reader can skip them'],
          ['Folded a constant', '`cast(2026-11-05 as date)` became `2026-11-05`', 'No cast for every row'],
          ['Pruned columns', '`ReadSchema` has 3 columns, the table has 8', 'Parquet is columnar: five columns are never read'],
          ['Pushed filters to the scan', '`PartitionFilters` and `PushedFilters` in the scan', 'Whole folders and row groups are skipped'],
          ['Split the aggregate in two', '`partial_sum` before the Exchange, `sum` after', 'The shuffle moves partial sums instead of orders']
        ],
        steps: [
          { upto: 3, say: 'The first three change the tree and cost nothing to run. They make the query smaller before any data is touched.' },
          { upto: 6, say: 'The last three decide how much data is read and moved. They are the ones that make a query on a big table finish.' }
        ],
        pick: 'The optimiser can only do what the **plan lets it see**. A filter written as a Python function, a column hidden inside a UDF, or a cast of the partition column hides the intent. Reading the plan is how you check that it saw what you meant.'
      }),

      B.code({
        id: 'm2-fold', t: 2, src: 'rec', title: 'The plan you wrote is not the plan that runs', file: 'optimizer_example', lang: 'text', code: FOLD,
        steps: [
          { say: 'A smaller example, on ten numbers made with `range`. I wrote a column `x = id * (2 + 3)` and then two filters. Here is the plan as I wrote it, and then as it runs. Press Next.', lines: null },
          { say: 'As written: a `Project` that computes `x`, then a filter on `x`, then a filter on `id`. The sum `(2 + 3)` is inside the multiplication.', lines: G.span(FOLD, /^Filter \(id#1L < cast\(9/, /Project/) },
          { say: 'As it runs: `(2 + 3)` is now `5`. The filter on `x` was **pushed below the Project** and rewritten in terms of the source column, `id * 5 > 10`. The two filters were combined into one. The `Project` is above, and cheaper.', lines: G.span(FOLD, /^Project \[id#1L, \(id#1L \* 5\)/, /Range/) },
          { say: 'Filters move down because the earlier a row is dropped, the less work is left. The optimiser may only do this because it can see inside every step. Mission 9 shows the one thing it cannot see inside: a Python function.', lines: null }
        ],
        note: 'Recorded: `spark.range(10)` with a `withColumn` and two `filter` calls, plan shown by `explain(extended=True)`.'
      }),

      B.code({
        id: 'm2-sql', t: 1, src: 'rec', title: 'SQL and DataFrame are the same thing', file: 'plans.py', lang: 'python', code: SQLAPI,
        steps: [
          { say: 'The same question asked two ways. Revenue of paid orders, by store. One as SQL, one as DataFrame calls. Press Next.', lines: null },
          { say: 'The orders become a **temporary view**, a name that SQL can use. The view is only a name for the plan, not a copy of the data.', lines: G.span(SQLAPI, /createOrReplaceTempView/) },
          { say: 'The SQL text goes through the **parser**, the first step of the pipeline you walked through.', lines: G.span(SQLAPI, /spark\.sql\(/) },
          { say: 'The DataFrame calls build the same tree without a parser. I compared the two formatted plans, as text. They are **identical**: ' + (SAME.sql_and_dataframe_have_the_same_plan ? 'the recording says true.' : 'the recording says they differ.') + ' There is no speed difference between the two spellings. Choose by readability and by what you want to test.', lines: G.span(SQLAPI, /api = /) }
        ],
        note: 'Recorded: the formatted physical plans of both queries, compared after renumbering the ids. The same optimiser and the same planner serve both spellings.'
      }),

      B.widget({ id: 'm2-lab', kind: 'exchange', t: 1, src: 'rec', title: 'Lab: count the shuffles' }),

      B.talk({
        id: 'm2-wide', t: 1, src: 'docs', title: 'Narrow and wide',
        say: 'The Exchange lines decide the cost of a query. Spark has a name for the two kinds of step. Press Next for each.',
        items: [
          ['Narrow', 'Each output partition depends on **one** input partition. `filter`, `select`, `withColumn`, `map`, and `union` are narrow. Spark pipelines them in one stage, one task per partition, with no data movement.', 'No shuffle. One stage.'],
          ['Wide', 'An output partition depends on **many** input partitions, so rows must move. `groupBy`, `distinct`, `orderBy`, `join` (without a broadcast), `repartition` and window functions are wide. Each one adds an Exchange and cuts a stage.', 'A shuffle. A new stage.'],
          ['The costs', 'A shuffle writes to the local disk of every map task, then reads over the network. It is the main cost of most jobs. Fewer, smaller shuffles is the goal: filter early, select only the columns you need, and use broadcast joins where a table is small.', 'Move less data, fewer times.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm2-explain', t: 2, src: 'docs', title: 'Five ways to ask for a plan',
        say: 'The same plan can be printed at different levels of detail. Press Next for each mode.',
        items: [
          ['simple', '`df.explain()` prints only the **physical** plan. This is the one to read first, and the one to paste in a ticket.', 'The default.'],
          ['extended', '`df.explain(True)` or `mode="extended"` prints all four plans: parsed, analyzed, optimized, physical. Use it to see what the optimiser changed.', 'All four plans.'],
          ['formatted', '`mode="formatted"` prints a tree with numbered operators, and a list of what each one does. It is the easiest to read for a long plan.', 'Numbered operators.'],
          ['cost', '`mode="cost"` adds the size and row estimates, when statistics exist. If you see no numbers, there are no statistics for the table.', 'Estimates, if there are statistics.'],
          ['codegen', '`mode="codegen"` prints the generated Java code. You will almost never need it.', 'For people who debug the engine.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A report is slow and the driver runs out of memory on a big day. It only needs the number of paid orders. Click the line that causes it.',
        file: 'report.py', lang: 'python',
        code: ['orders = spark.read.parquet("/lake/orders")', 'paid = orders.filter(F.col("status") == "PAID")', 'n = len(paid.collect())', 'print("paid orders:", n)'].join('\n'),
        bad: [3],
        hint: 'What does collect() bring to the driver?',
        why: '`collect()` is an action that sends **every row** to the driver, as Python objects, only to take their length. On a big table it runs out of memory, and before that it is slow. `count()` is an action that counts on the executors, and returns one number.',
        fix: ['orders = spark.read.parquet("/lake/orders")', 'paid = orders.filter(F.col("status") == "PAID")', 'n = paid.count()', 'print("paid orders:", n)'].join('\n'),
        cheer: 'Let the executors count. Bring back only the answer.'
      }),

      B.incident({
        id: 'm2-inc', t: 1, src: 'docs', title: 'Incident: the job succeeded and wrote nothing', time: '06:10',
        alert: '**The nightly orders job finished in four seconds and the curated table is empty.** The logs show no error. Yesterday it took twenty minutes.',
        clues: ['There is no stage in the Spark UI for the job', 'A colleague edited the job yesterday and added a cleaning step', 'The job ends with a line that builds the output DataFrame'],
        opts: [
          { t: 'Read the code for a transformation whose result is thrown away, or a write that was lost, and add a check that the output has rows', fb: '' },
          { t: 'Rerun the job with more executors', fb: 'It did not fail for lack of resources. It did no work at all.' },
          { t: 'Turn off adaptive execution', fb: 'That changes how a plan runs, and nothing ran.' },
          { t: 'Increase the driver memory', fb: 'No memory problem is reported.' }
        ],
        best: 0,
        why: 'A job with no stages never ran an action. The new cleaning step probably builds a DataFrame and drops it, because DataFrames are immutable and `df.dropna()` without an assignment does nothing. Or the final write was removed.',
        checks: [
          ['Look at the Spark UI', 'No jobs for the application means no action ran. Jobs with zero tasks means an empty input.'],
          ['Read the diff', 'Look for a transformation on a line by itself, like `df.dropna()`, and for the write at the end.'],
          ['Fix it', 'Assign the result, `df = df.dropna()`, and check that the write is there.'],
          ['Guard', 'Count the output and fail the job if it is empty or far from the usual size. Mission 12 writes such a test.']
        ],
        tell: 'The job finished in four seconds and wrote nothing. The Spark UI had no stages, so no action had run. A change the day before had added `df.dropna()` on a line of its own, which does nothing because DataFrames are immutable. I assigned it back, and added a check that the output has rows.',
        prevent: ['Assign every transformation or chain it', 'Count the output and fail on zero rows', 'A unit test on the transformation function']
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'Which of these lines starts a job that reads the data?',
        opts: [
          { t: '`df = orders.filter(F.col("status") == "PAID")`', fb: 'A transformation. It only adds a step.' },
          { t: '`df.explain()`', fb: 'It prints the plan and runs nothing.' },
          { t: '`df.count()`', fb: '' },
          { t: '`df.columns`', fb: 'The schema is known from the plan.' }
        ],
        ok: 2,
        why: 'Only an action runs the plan. In the recording `filter`, `select`, `groupBy`, `explain` and `columns` started no job, and `count`, `collect`, `show` and the write did.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'You write `df.withColumn("x", F.lit(1))` on a line of its own. What happens to `df`?',
        opts: [
          { t: 'It gets a new column x', fb: 'DataFrames are immutable.' },
          { t: 'Nothing: the call returns a new DataFrame that you did not keep', fb: '' },
          { t: 'The job fails', fb: 'It is valid code. It just does nothing useful.' },
          { t: 'The column is added when the next action runs', fb: 'It is added to the new DataFrame, which nobody has.' }
        ],
        ok: 1,
        why: 'A transformation returns a new DataFrame and leaves the old one alone. Assign the result, or chain the calls.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'In `explain()`, what does one `Exchange` line mean?',
        opts: [
          { t: 'A shuffle: rows move between partitions across the cluster', fb: '' },
          { t: 'A currency conversion', fb: 'A joke, but no.' },
          { t: 'A cache', fb: 'A cache shows as `InMemoryTableScan`.' },
          { t: 'A write to the output', fb: 'That is a `Write` or `Insert` operator.' }
        ],
        ok: 0,
        why: 'Exchange is the physical operator for a shuffle, and also the place where the scheduler cuts a stage. Count them before you run a job.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'The scan of a query shows `PartitionFilters: [dt >= 2026-11-05]` and `PushedFilters: [EqualTo(status,PAID)]`. What is the difference?',
        opts: [
          { t: 'None, they are the same', fb: 'They are different mechanisms.' },
          { t: 'Partition filters skip whole folders. Pushed filters are handed to the file reader to skip row groups', fb: '' },
          { t: 'Pushed filters skip folders, partition filters skip columns', fb: 'It is the other way round, and neither skips columns.' },
          { t: 'Both only affect the Python side', fb: 'They are inside the JVM scan.' }
        ],
        ok: 1,
        why: 'A partition filter works on the folder names, so the files of other days are never opened. A pushed filter works on the min and max values in the file footer, so a row group that cannot match is skipped.'
      }),

      B.quiz({
        id: 'm2-q5', t: 2,
        q: 'A column name has a typo in a DataFrame call. When does Spark report it?',
        opts: [
          { t: 'At the first action, after reading the data', fb: 'It is earlier.' },
          { t: 'When the analyzer resolves the plan, before any data is read', fb: '' },
          { t: 'Never, it returns NULL', fb: 'With the default settings it is an error.' },
          { t: 'At the end of the job', fb: 'It would be too late to be useful.' }
        ],
        ok: 1,
        why: 'The analyzer looks every column up. Spark raises the error as soon as the DataFrame is built, with a suggestion of the closest names. No file has been read.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the stages of a query, from your code to the executors, in order.',
        items: ['Parsed logical plan', 'Analyzed logical plan', 'Optimized logical plan', 'Physical plan', 'Stages and tasks', 'Run on the executors'],
        why: 'Parse the text, resolve the names, optimise the tree, choose real operators, cut into stages and tasks, and run. Adaptive execution may re-plan the later part while it runs.'
      }),

      B.qa({
        id: 'qa-lazy', t: 1, tag: 'Spark plans', secs: 75,
        q: 'What is lazy evaluation, and why does Spark use it?',
        pts: ['Transformations only record steps', 'Actions run the plan', 'Immutable DataFrames', 'Whole plan is optimised together', 'Column pruning, filter pushdown, join choice', 'Pitfall: nothing runs without an action'],
        short: 'In Spark, transformations such as `filter`, `select` and `join` do not run. They return a new immutable DataFrame that describes the work. An **action** such as `count`, `collect` or `write` makes Spark run it. Waiting lets Spark see the **whole query** before it runs anything, so the Catalyst optimiser can combine filters, push them down to the files, read only the columns that are used, and choose the join. The pitfall is that a transformation whose result is not used does nothing, and a job without an action succeeds without work. I check that by counting the output.',
        fu: [['Is `explain()` an action?', 'No. It builds and prints the plan and starts no job.'], ['Is `read.parquet` lazy?', 'Mostly. It runs one small job to read the schema from the file footers, but reads no data rows until an action runs.']],
        trap: 'Saying that Spark runs each line when it is written, or that cache() is what makes it lazy.',
        real: 'Tell me about a bug you found that came from a transformation that did nothing.'
      }),

      B.qa({
        id: 'qa-catalyst', t: 1, tag: 'Spark plans', secs: 90,
        q: 'What does the Catalyst optimiser do?',
        pts: ['Four plans: parsed, analyzed, optimized, physical', 'Analyzer resolves names and types', 'Rules rewrite the tree', 'Examples: combine filters, fold constants, prune columns, push filters', 'Planner picks the join and the aggregate', 'Adaptive execution re-plans at run time'],
        short: 'Catalyst takes the query through four plans. The **parsed** plan is my code as a tree. The **analyzed** plan has every name and type resolved against the catalog. The **optimized** plan is rewritten by rules, for example combining filters, folding constants, pruning columns and pushing filters down to the scan. The **physical** plan chooses real operators, such as the type of join and where the exchanges go. Since Spark 3, adaptive query execution can plan the later part again at run time, with the real sizes. I look at `explain` to see what it did, and I know that it can only optimise what it can see: a Python UDF is a wall.',
        fu: [['Name two rules.', 'For example `ConstantFolding` and `PushDownPredicates`. Combining filters is `CombineFilters`.'], ['Is there a cost-based part?', 'Yes. With table statistics, Spark can use a cost model, for instance to pick a join order. Adaptive execution works from the sizes it measures instead.']],
        trap: 'Describing Catalyst as a cache or as a scheduler.',
        real: 'Show me an explain output and tell me what the optimiser changed.'
      }),

      B.qa({
        id: 'qa-readplan', t: 1, tag: 'Spark plans', secs: 90,
        q: 'How do you read a physical plan?',
        pts: ['Bottom up: the data flows up', 'Scan: PartitionFilters, PushedFilters, ReadSchema', 'Filter and Project: narrow', 'Exchange = shuffle = new stage', 'Partial then final aggregate', 'Join type: broadcast, sort-merge, shuffled hash', 'isFinalPlan with adaptive execution'],
        short: 'I read it from the bottom up, because the data flows up. At the bottom is the **scan**: I check `PartitionFilters` for folders skipped, `PushedFilters` for what the reader gets, and `ReadSchema` for the columns that are read. Above are narrow operators such as `Filter` and `Project`. Every `Exchange` is a **shuffle** and a stage boundary, so I count them. A group by shows a `partial` aggregate before the exchange and a final one after it. For joins I look at the name: `BroadcastHashJoin` has no shuffle of the big side, `SortMergeJoin` shuffles and sorts both. With adaptive execution the top says `isFinalPlan=false` until the stages have run.',
        fu: [['How do you know that a filter was pushed?', 'It is in `PushedFilters` or `PartitionFilters` in the scan. A filter that exists only as a `Filter` operator above the scan was not pushed.'], ['What do you look for in a slow query?', 'A shuffle that could be a broadcast, a scan that reads all columns or all folders, and a Python UDF operator.']],
        trap: 'Reading the plan from the top and calling the aggregate the first step.',
        real: 'Here is a plan. Tell me what is expensive in it.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Plan Reader', color: '#C7D2FE',
        pts: [
          'Transformations are **lazy**. An **action** runs the plan. `explain()` runs nothing.',
          'In the recording, `read.parquet` started **' + jobs('spark.read.parquet') + '** job for the schema, `filter` and `select` started none, and `count` started **' + jobs('.count') + '**: adaptive execution makes jobs.',
          'Four plans: **parsed, analyzed, optimized, physical**. The analyzer adds types, the optimiser rewrites, the planner picks operators.',
          'Read a physical plan **from the bottom**: scan, filter, partial aggregate, **Exchange**, final aggregate.',
          'The optimiser **combined** two filters, **folded** a constant, **pruned** to 3 of 8 columns and **pushed** filters to the scan.',
          'SQL and DataFrames give **the same plan**.'
        ],
        lines: [
          'I run explain before I run a big job.',
          'I count the Exchange lines.',
          'I assign every transformation, and I count the output.'
        ]
      })
    ]
  });
})();
