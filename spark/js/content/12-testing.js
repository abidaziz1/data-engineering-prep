/* Mission 12: testing Spark code. Transformations as functions from a DataFrame to a DataFrame, a local session, tiny data, pytest, and a bug that one test catches and three do
   not. The test files ran for real with pytest and PySpark 4.0.1: once on the clean code and once on a copy with a bug. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TS = G.counts('test.summary'), CLEAN = G.text('test.pytest_clean'), BUG = G.text('test.pytest_bug');
  var TR = G.file('code/app/transforms.py'), TB = G.file('code/app/transforms_bug.py'), TT = G.file('code/app/test_transforms.py');
  var cut = function (a, b) { var r = G.span(TT, a, b); return G.lines(TT, r[0], r[1]); };
  var FIX = cut(/^@pytest\.fixture/, /^    s\.stop\(\)/);
  var T1 = cut(/^def test_paid_and_refunded/, /assertDataFrameEqual\(got, want\)/);
  var T3 = cut(/^def test_empty_input/, /assertSchemaEqual\(got/);
  var T4 = cut(/^def test_guest_orders/, /== 0\.5/);
  var FILTER_OK = TR.split('\n').filter(function (l) { return /isin\('PAID', 'REFUNDED'\)/.test(l); })[0];
  var FILTER_BAD = TB.split('\n').filter(function (l) { return /== 'PAID'/.test(l); })[0];
  G.expect(TS.clean.failed === 0 && TS.clean.passed === 4 && TS.bug.failed === 1 && TS.bug.passed === 3, 'the clean code passes four tests and the buggy copy fails one');
  G.expect(/test_paid_and_refunded_orders_count/.test(BUG) && /DIFFERENT_ROWS/.test(BUG) && FILTER_OK && FILTER_BAD, 'the failing test is the one that has a refunded order');
  var diffRows = BUG.split('\n').filter(function (l) { return /^E\s+! Row/.test(l); }).map(function (l) { return l.replace(/^E\s+! /, ''); });
  G.expect(diffRows.length === 2 && /orders=1/.test(diffRows[0]) && /orders=2/.test(diffRows[1]), 'actual and expected rows of the failing test');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Testing Spark code', short: 'Tests', blurb: 'Small functions, a local session, tiny data, pytest, and the bug that tests catch', minutes: 45,
    focus: ['qual', 'ci'],
    goals: [
      'Write a transformation as a **function from a DataFrame to a DataFrame**, so that it can be tested.',
      'Set up a **pytest fixture** with a **local Spark session**, and build tiny test data with an explicit schema.',
      'Compare results with **assertDataFrameEqual** and **assertSchemaEqual**.',
      'List the **edge cases** to put in every test: NULLs, empty input, ties, other statuses.',
      'Tell a **unit test** from a **data check** and a **small end-to-end run**.',
      'Explain why a **weak test** passes while the code is wrong.'
    ],
    say: 'Mission 12 is about trusting your code. Spark makes it easy to write a transformation that runs and is wrong, because it never fails on a wrong number. The answer is the same as anywhere else: small functions, tiny data, and tests that run on every change. I wrote four tests for two Brewline functions and ran them with pytest on a real local Spark. Then I changed one word in the code, and ran them again.',
    scenes: [
      B.talk({
        id: 'm12-why', t: 1, src: 'docs', title: 'Why Spark code needs tests',
        say: 'A wrong Spark job does not crash. It writes a number. Press Next for what tests do about it.',
        items: [
          ['Wrong numbers are quiet', 'A filter on the wrong status, a join that doubles rows, a time zone that moves a day: none of these raises an error. The job finishes and the dashboard is wrong. The only defence is a test that knows the right answer.', 'No error does not mean right.'],
          ['Make the logic a function', 'Put each business rule in a **function from a DataFrame to a DataFrame**, in a module, away from the code that reads and writes. A function can be tested with a tiny DataFrame. A script that reads production files cannot.', 'DataFrame in, DataFrame out.'],
          ['A local session is enough', 'A test does not need a cluster. `SparkSession.builder.master("local[2]")` runs the real engine in your process. Two cores are better than one, because they catch code that cannot be sent to a second process.', 'The real engine, on your machine.'],
          ['Tiny data, written by hand', 'Three to ten rows, in the test, with the schema spelled out. You can see the input and the expected output on one screen. The rows are chosen for the awkward cases.', 'Choose the awkward rows.'],
          ['Two layers', 'A **unit test** checks a function on tiny data. A **data check** runs inside the real pipeline on the real data and checks counts, NULLs and keys. You need both.', 'Tests on code, checks on data.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'A testing path for a Spark job', g: 'test', legend: true,
        steps: [
          { say: 'This is the path that a function takes until it runs in production. Press Next to walk it.', cap: 'A function becomes a release.' },
          { say: 'Step 1. Write the logic as **small functions**: a DataFrame in, a DataFrame out. The read and the write stay outside.', on: ['t1'], focus: ['e_fn', 'e_unit'], tags: ['tg_fast'], cap: 'Small functions.' },
          { say: 'Step 2. **Unit tests** run each function on tiny data in a local session. They are fast and many, and they run on every change.', on: ['t2'], focus: ['e_unit', 'e_data'], cap: 'Unit tests on tiny data.' },
          { say: 'Step 3. **Data checks** run in the real pipeline: the output is not empty, a key is unique, the row count is near the usual. They fail the job before a bad table is published.', on: ['t3'], focus: ['e_data', 'e_smoke'], cap: 'Data checks in the pipeline.' },
          { say: 'Step 4. A **small end-to-end run** sends a sample through the real job with `spark-submit`. It catches what unit tests cannot: packaging, settings, paths.', on: ['t4'], focus: ['e_smoke', 'e_ci'], cap: 'A small run of the whole job.' },
          { say: 'Step 5. **CI** runs the tests on every change. A red test **blocks the merge**.', on: ['t5', 't6'], focus: ['e_ci', 'e_gate', 'e_prod'], cap: 'CI blocks a red test.' },
          { say: 'Step 6. In production, **monitoring** watches the row counts and the sizes of each run. It is the last guard.', on: ['t7'], focus: ['e_prod', 'e_watch'], cap: 'Monitoring watches the runs.' }
        ]
      }),

      B.code({
        id: 'm12-funcs', t: 1, src: 'rec', title: 'Two functions to test', file: 'transforms.py', lang: 'python', code: TR,
        steps: [
          { say: 'The Brewline module has two transformations. Each takes the orders as a DataFrame and returns a DataFrame. Press Next.', lines: null },
          { say: '`daily_revenue` keeps the **paid and refunded** orders, and groups by store and day. The docstring says why: a refund is revenue that was booked first, so it still counts. New and cancelled orders do not.', lines: G.span(TR, /^def daily_revenue/, /New and cancelled/) },
          { say: 'The filter is `isin("PAID", "REFUNDED")`. Remember this line. A one-word change here is the bug of this mission.', lines: G.span(TR, /isin\('PAID', 'REFUNDED'\)/) },
          { say: 'Then the group by store and day, the count and the sum of the total.', lines: G.span(TR, /groupBy\('store_id'/, /agg\(/) },
          { say: '`guest_share` computes the share of orders with no customer id: the number of NULLs divided by the number of rows.', lines: G.span(TR, /^def guest_share/, /return orders\.agg/) }
        ],
        note: 'Recorded: these files ran under pytest. Nothing in them reads or writes files, so a test can call them with a DataFrame it builds in memory.'
      }),

      B.code({
        id: 'm12-fixture', t: 1, src: 'rec', title: 'The session for tests', file: 'test_transforms.py', lang: 'python', code: FIX,
        steps: [
          { say: 'Starting Spark takes seconds, so the tests share one session. Press Next.', lines: null },
          { say: '`@pytest.fixture(scope="session")` makes one `spark` object for the whole run. `yield` hands it to the tests, and the line after it stops the session at the end.', lines: G.span(FIX, /@pytest\.fixture/, /yield s/) },
          { say: '`master("local[2]")` is the real engine with two cores. `spark.sql.shuffle.partitions` is 2, so a tiny group by does not make 200 empty tasks. The UI is off, and the time zone is UTC so that a test means the same on every machine.', lines: G.span(FIX, /s = \(SparkSession/, /getOrCreate/) }
        ],
        note: 'Recorded. A setting like the time zone belongs in the fixture: a test that depends on the machine\'s zone passes in one office and fails in another.'
      }),

      B.code({
        id: 'm12-test1', t: 1, src: 'rec', title: 'A test with tiny data', file: 'test_transforms.py', lang: 'python', code: T1,
        steps: [
          { say: 'The most important test of the file. Press Next.', lines: null },
          { say: 'Three orders in one store on one day: a PAID one for 1,000, a REFUNDED one for 500 and a CANCELLED one for 700. Each status is there on purpose.', lines: G.span(T1, /df = orders\(spark/) },
          { say: 'The function runs on it. Then the **expected** result is written by hand: one row, store s01, the day, **2** orders and **1,500** in revenue. Paid plus refunded, and the cancelled order left out.', lines: G.span(T1, /got = T\.daily_revenue/, /want = /) },
          { say: '`assertDataFrameEqual(got, want)` compares the two DataFrames. It ignores the order of rows by default, and it prints the differences when they do not match.', lines: G.span(T1, /assertDataFrameEqual/) }
        ],
        note: 'Recorded. The expected value comes from a rule in the docstring, not from running the code and copying the answer.'
      }),

      B.code({
        id: 'm12-edges', t: 1, src: 'rec', title: 'The awkward cases', file: 'test_transforms.py', lang: 'python', code: T3 + '\n\n' + T4,
        steps: [
          { say: 'Two more tests, for cases that break pipelines. Press Next.', lines: null },
          { say: '**Empty input.** A pipeline runs on a day with no orders. The function must return an empty DataFrame **with the same schema**, and not fail. `assertSchemaEqual` compares the schemas.', lines: G.span(T3 + '\n\n' + T4, /def test_empty_input/, /assertSchemaEqual/) },
          { say: '**NULLs.** Four orders, two of them guests with a NULL customer id. The share must be **0.5**. A function that forgets how NULL behaves gets this wrong, and so does a test data set with no NULL in it.', lines: G.span(T3 + '\n\n' + T4, /def test_guest_orders/, /== 0\.5/) }
        ],
        note: 'Recorded. The fourth test, not shown, checks that each store and day is its own row. It builds three rows over two stores and two days and expects three groups.'
      }),

      B.term({
        id: 'm12-clean', t: 1, src: 'rec', title: 'Run the tests on the clean code',
        say: 'Four tests, run with pytest on a real local Spark. Watch the dots.',
        lines: G.plain(CLEAN, { cmd: 'pytest -q' }),
        after: 'Four dots, four passes: **' + TS.clean.passed + ' passed**, ' + TS.clean.failed + ' failed. The functions do what the docstrings say, on the awkward rows as well.',
        afterKind: 'tip',
        doneSay: 'A green run is only as good as the rows in the tests.'
      }),

      B.cmp({
        id: 'm12-diff', t: 1, src: 'rec', title: 'The one-word bug',
        say: 'Now a copy of the module with one change. Read the two lines carefully. Press Next.',
        cols: ['Version', 'The filter line'],
        hl: 1,
        rows: [
          ['transforms.py, the clean code', '`' + FILTER_OK.trim() + '`'],
          ['transforms_bug.py, the copy', '`' + FILTER_BAD.trim() + '`']
        ],
        steps: [
          { upto: 1, say: 'The clean code keeps paid **and refunded** orders.' },
          { upto: 2, say: 'The copy keeps only paid orders. It looks like a harmless simplification, and a reviewer reading the diff quickly could approve it. The job would run, and revenue would be lower by every refunded order.' }
        ],
        pick: 'This is the kind of change that a code review misses and a test with a refunded order catches. **The test is the memory of the rule.**'
      }),

      B.term({
        id: 'm12-bug', t: 1, src: 'rec', title: 'Run the same tests on the buggy copy',
        say: 'The same four tests, with the environment variable `TRANSFORMS` pointing at the copy. Watch which one fails.',
        lines: G.plain(BUG, { cmd: 'TRANSFORMS=transforms_bug pytest -q' }),
        after: 'Exactly one test fails: **test_paid_and_refunded_orders_count**. The report prints the row that the code produced and the row that was expected: **' + diffRows[0] + '** against **' + diffRows[1] + '**. One order and 1,000 instead of two orders and 1,500. The other **' + TS.bug.passed + '** tests still pass.',
        afterKind: 'warn',
        doneSay: 'One good test caught it. Three weak ones did not.'
      }),

      B.rows({
        id: 'm12-summary', t: 1, src: 'rec', title: 'Four tests, one that mattered',
        steps: [
          {
            say: 'The two runs side by side. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Results of pytest', c: 'raw', cols: ['code under test', 'passed', 'failed'], rows: [['transforms.py (clean)', TS.clean.passed, TS.clean.failed], ['transforms_bug.py (one word changed)', TS.bug.passed, TS.bug.failed]], trk: 0 }],
            notes: ['Recorded: the summary line of each pytest run.']
          },
          {
            say: 'Three of the four tests **passed on the buggy code**. They check the number of groups, the schema of an empty result and the guest share. None of them has a refunded order and an expected revenue. A suite of four tests said "mostly green", and the code was wrong.',
            tabs: [{ layer: 'RECORDED', name: 'Results of pytest', c: 'raw', cols: ['code under test', 'passed', 'failed'], rows: [['transforms.py (clean)', TS.clean.passed, TS.clean.failed], ['transforms_bug.py (one word changed)', TS.bug.passed, TS.bug.failed]], trk: 1, chg: [[1, 1], [1, 2]] }],
            notes: ['Count tests by the rules they protect, not by their number. One rule, one test with the awkward row.']
          }
        ]
      }),

      B.talk({
        id: 'm12-good', t: 1, src: 'docs', title: 'What a good Spark test has',
        say: 'Some habits make tests useful and fast. Press Next for each.',
        items: [
          ['An explicit schema', 'Build test DataFrames with a **schema string**, as the recording does. Letting Spark guess the types from Python rows gives longs where you wanted ints, and the test then passes or fails for the wrong reason.', 'Spell out the types.'],
          ['An expected value from a rule', 'Write the expected output by hand, from the business rule. If you run the code and paste its output as "expected", the test only proves that the code equals itself.', 'Expected from the rule.'],
          ['The awkward rows', 'Put in a NULL, an empty input, a tie, a duplicate key, a record on a boundary (midnight, the last day of the month), and every status the rule treats differently.', 'The edge cases are the test.'],
          ['`assertDataFrameEqual`', 'From `pyspark.testing`. It compares rows and schemas, ignores the row order unless you ask for it, and prints a readable difference. Use `assertSchemaEqual` for the schema alone.', 'Built-in, readable.'],
          ['Fast', 'One shared session, two cores, two shuffle partitions, no UI. A suite of fifty such tests runs in the time of a coffee. If tests are slow, people stop running them.', 'Share the session.'],
          ['No Spark in the logic that does not need it', 'A pure Python helper (a date rule, a parser) needs no session. Test it with plain asserts, and keep the Spark tests for the DataFrame logic.', 'Test Python as Python.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm12-kinds', t: 1, src: 'docs', title: 'Kinds of checks, and what each catches',
        say: 'Four kinds of checks, each on a different layer. Press Next.',
        cols: ['Check', 'Runs on', 'Catches', 'Cost'],
        hl: 2,
        rows: [
          ['Unit test of a function', 'Tiny data in a local session', 'A wrong rule, a NULL, a schema change', 'Seconds. On every change'],
          ['Data check inside the pipeline', 'The real data, in the job', 'An empty input, a duplicate key, a count far from usual', 'Extra work for each run. Fails the job'],
          ['Small end-to-end run', 'A sample of real files, through spark-submit', 'Packaging, paths, settings, a missing library', 'Minutes. Before release, or nightly'],
          ['Plan check', 'The plan of a query', 'A broadcast join that became a sort-merge join, a Python UDF that came back', 'Seconds. Fragile if it is too strict']
        ],
        steps: [
          { upto: 2, say: 'Unit tests and data checks answer different questions: "is my code right?" and "is today\'s data sane?".' },
          { upto: 4, say: 'The small end-to-end run and the plan check catch the things that live between the code and the cluster.' }
        ],
        pick: 'A good answer in an interview names **at least two layers**: unit tests on tiny data, and data checks in the pipeline.'
      }),

      B.talk({
        id: 'm12-checks', t: 2, src: 'docs', title: 'Data checks inside the job',
        say: 'Unit tests cannot know what today\'s data looks like. A data check can. Press Next for the usual list.',
        items: [
          ['The output is not empty', 'A job that writes zero rows should fail, not succeed. This one check would have caught the incident of mission 2.', 'Zero rows is an error.'],
          ['The key is unique', 'Count rows against distinct keys. A dimension with a repeated key doubles the revenue of a join, as mission 4 recorded.', 'Unique where it must be.'],
          ['Not null where it must be', 'A column that must be filled is checked. A column that may be NULL, like the customer id of a guest, has an expected share, and the check watches the share.', 'Watch the NULL share.'],
          ['The count is near the usual', 'Compare today\'s row count with the recent days. A drop of half, or a rise of ten times, deserves a stop. The rule can be crude and still save a morning.', 'A band around the usual.'],
          ['Reconciliation', 'The total of the output equals the total of the source, for a rule that should keep it. Revenue by store adds up to revenue in all.', 'The parts add up.'],
          ['What to do on failure', 'Fail the job, and keep the previous good table, or write the bad rows to a **quarantine** table with a reason and a count. Never publish and hope.', 'Fail or quarantine.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Libraries exist:', t: 'Deequ, Great Expectations and Soda are used for this. A few `assert` lines in the job already cover most of the value.' }
      }),

      B.talk({
        id: 'm12-plan', t: 3, src: 'docs', title: 'Extra: test the plan as well as the rows',
        say: 'Some problems are about how the job runs, and not about its answer. Press Next for the idea.',
        items: [
          ['A plan is text', 'In mission 2 you read `explain()`. In a test you can capture the same text and assert on it: that it contains `BroadcastHashJoin`, that the number of `Exchange` lines is not more than two, that no `BatchEvalPython` appears.', 'Assert on the plan text.'],
          ['What it protects', 'A change to a table\'s size, a setting or a function can turn a cheap plan into an expensive one with the same answer. A plan test is the alarm for that.', 'Same answer, worse plan.'],
          ['Keep it loose', 'Plans change between Spark versions. Assert on the few things that matter (the join type, the exchanges), never on the whole text, or the test breaks at every upgrade.', 'Few, loose assertions.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'docs', title: 'Decision: where the tests run',
        scenario: 'Brewline has forty unit tests for its Spark functions, and a nightly job that takes two hours on a cluster. A developer opens pull requests many times a day. You decide where each kind of test runs.',
        opts: [
          { t: 'Unit tests with a local session on every pull request; the end-to-end run on a sample, nightly', d: 'Fast feedback on every change, and a deeper check once a day.', lose: '' },
          { t: 'Everything on the shared cluster for every pull request', d: 'It is the closest to production.', lose: 'Each pull request waits for the cluster, costs cluster time, and the queue discourages small changes.' },
          { t: 'Only the nightly run on the cluster', d: 'Cheap, and the same as production.', lose: 'A bug is found the next morning, far from the change that made it. People stop trusting the nightly job.' }
        ],
        pick: 0,
        why: 'The unit tests are the fast loop: a local session, tiny data, run on every pull request. The slow, real run is the safety net, and it runs less often. Each catches different things.',
        when: 'When a bug only shows on large data (skew, memory), a performance test on a copy of production data on a schedule is the extra layer.'
      }),

      B.bug({
        id: 'm12-bug-test', t: 1, q: 'This test passes on the clean code and also on the copy with the missing refunds. Click the line that makes it too weak to protect the rule.',
        file: 'test_revenue.py', lang: 'python',
        code: ['def test_daily_revenue(spark):', '    df = orders(spark, [(1, "s01", "c1", datetime(2026, 11, 1, 9), "PAID", 1000), (2, "s01", "c2", datetime(2026, 11, 1, 10), "REFUNDED", 500)])', '    got = T.daily_revenue(df)', '    assert got.count() > 0'].join('\n'),
        bad: [4],
        hint: 'What would the buggy copy return for this input?',
        why: 'The assertion says only that there is **at least one row**. The buggy copy returns one row too, with one order and 1,000, so it passes. The test has the refunded order, but never checks the answer. Compare with the expected rows: **2** orders and **1,500**.',
        fix: ['def test_daily_revenue(spark):', '    df = orders(spark, [(1, "s01", "c1", datetime(2026, 11, 1, 9), "PAID", 1000), (2, "s01", "c2", datetime(2026, 11, 1, 10), "REFUNDED", 500)])', '    got = T.daily_revenue(df)', '    want = spark.createDataFrame([("s01", date(2026, 11, 1), 2, 1500)], "store_id string, day date, orders long, revenue_cents long")', '    assertDataFrameEqual(got, want)'].join('\n'),
        cheer: 'Assert the answer, not just that there is one.'
      }),

      B.incident({
        id: 'm12-inc', t: 1, src: 'rec', title: 'Incident: revenue is lower than the ledger', time: '11:15',
        alert: '**Finance says the daily revenue table is lower than the ledger since last Tuesday.** The pipeline ran every night without errors. The only recent change was a refactor of the revenue function.',
        clues: ['The gap is about the size of the refunds', 'The pull request that changed the function was approved by one reviewer in ten minutes', 'The tests passed'],
        opts: [
          { t: 'Compare the new code with the old: the refactor probably dropped the refunded orders. Restore the rule, add a test with a refunded order and the expected total, and add a reconciliation with the source', fb: '' },
          { t: 'Add executors so the job is more accurate', fb: 'Accuracy does not depend on cluster size.' },
          { t: 'Tell finance that the ledger is wrong', fb: 'You have not checked the code. Check it first.' },
          { t: 'Turn off the refactor flag and move on', fb: 'You would repeat the mistake with the next change. Add the test.' }
        ],
        best: 0,
        why: 'The gap that equals the refunds points to the filter. In the recording, changing `isin("PAID", "REFUNDED")` to `== "PAID"` kept three of four tests green, and the one test with a refunded order failed: **' + diffRows[0] + '** against **' + diffRows[1] + '**.',
        checks: [
          ['Diff the change', 'Read the function before and after. The status filter is the first suspect when the gap looks like one status.'],
          ['Reproduce it', 'Write the failing test first, with a refunded order and the expected total. It fails on the new code.'],
          ['Fix it', 'Restore the rule, make the test pass, and backfill the days that were wrong.'],
          ['Guard', 'A reconciliation: the total of the table against the total of the source for the day.']
        ],
        tell: 'The revenue was lower by the refunds because a refactor changed the status filter to paid only. The existing tests had no refunded order, so they stayed green. I restored the rule, wrote the test that fails on the bug, backfilled the days, and added a reconciliation against the source.',
        prevent: ['A test for every status the rule treats differently', 'A reconciliation of totals against the source', 'Review the filter lines of a refactor with extra care']
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'What is the best shape for a piece of Spark logic that you want to test?',
        opts: [{ t: 'A function from a DataFrame to a DataFrame', fb: '' }, { t: 'A notebook cell', fb: 'It cannot be called from a test.' }, { t: 'A script that reads production files and writes the result', fb: 'A test would need production.' }, { t: 'A UDF', fb: 'A UDF is one expression, not a unit of logic.' }],
        ok: 0,
        why: 'The functions of the recording take the orders as an argument and return a DataFrame, so a test can pass tiny data in memory.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1,
        q: 'The suite of four tests ran on the buggy copy. How many failed?',
        opts: [{ t: 'None', fb: 'One test has a refunded order.' }, { t: String(TS.bug.failed), fb: '' }, { t: 'All four', fb: 'The others do not check refunds.' }, { t: 'Two', fb: 'The recording shows one.' }],
        ok: 1,
        why: 'Only `test_paid_and_refunded_orders_count` failed. ' + TS.bug.passed + ' passed on the buggy code.'
      }),

      B.quiz({
        id: 'm12-q3', t: 1,
        q: 'Why does the fixture set `spark.sql.shuffle.partitions` to 2?',
        opts: [{ t: 'To make the test data bigger', fb: 'It is the opposite.' }, { t: 'A group by on a few rows would otherwise run 200 tasks, which slows the test for nothing', fb: '' }, { t: 'Spark needs exactly 2 to run locally', fb: 'It does not.' }, { t: 'To test skew', fb: 'No.' }],
        ok: 1,
        why: 'Mission 3 showed 200 tasks for 48 records. In a test with six rows it is the same waste, repeated in every test.'
      }),

      B.quiz({
        id: 'm12-q4', t: 2,
        q: 'You run the function, paste its output into the test as the expected value, and it passes. What does the test prove?',
        opts: [{ t: 'The code is right', fb: 'Only if the output was right to begin with.' }, { t: 'Only that the code is equal to itself', fb: '' }, { t: 'That Spark works', fb: 'That is not the test\'s job.' }, { t: 'Nothing is possible to say', fb: 'It proves that the behaviour does not change, which is a regression test, but not that it is correct.' }],
        ok: 1,
        why: 'Write the expected value from the business rule. A copied output makes a regression test at best.'
      }),

      B.quiz({
        id: 'm12-q5', t: 2,
        q: 'A job succeeds and writes zero rows. Which check would have stopped it?',
        opts: [{ t: 'A unit test of one function', fb: 'The function may be right.' }, { t: 'A data check that the output is not empty', fb: '' }, { t: 'A larger cluster', fb: 'It has nothing to do with it.' }, { t: 'A plan test', fb: 'The plan is fine.' }],
        ok: 1,
        why: 'Zero rows is a data fact, so a data check in the job catches it. Unit tests check code on made-up rows.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put the steps of adding a test for a bug in order.',
        items: [
          'Write down the rule in plain words',
          'Write a test with tiny data that shows the rule, including the awkward row',
          'Run it on the broken code and watch it fail',
          'Fix the code',
          'Run the whole suite and watch it pass',
          'Add the test to CI, so that a red run blocks the merge'
        ],
        why: 'A test that has never failed has not been shown to catch anything. Failing first proves that it can.'
      }),

      B.qa({
        id: 'qa-testspark', t: 1, tag: 'Testing', secs: 90,
        q: 'How do you test Spark code?',
        pts: ['Logic in functions: DataFrame in, DataFrame out', 'pytest with a session-scoped local Spark fixture', 'Tiny data with an explicit schema, awkward rows', 'assertDataFrameEqual and assertSchemaEqual', 'Data checks in the pipeline', 'CI on every change; small end-to-end run'],
        short: 'I keep the logic in **functions from a DataFrame to a DataFrame**, separate from the code that reads and writes. I test them with **pytest** and a session-scoped fixture that starts a **local Spark** with two cores, a small number of shuffle partitions and the time zone fixed. The input is a few rows that I write by hand with an **explicit schema**, including the awkward ones: NULLs, an empty input, ties, and every status the rule treats differently. I compare with `assertDataFrameEqual` against an expected result written from the rule, and `assertSchemaEqual` for the schema. On top I add **data checks** inside the pipeline: not empty, unique key, a count near the usual. CI runs the unit tests on every change and a small end-to-end run on a sample. In my recording, one test with a refunded order caught a one-word bug that three other tests missed.',
        fu: [['How do you keep the tests fast?', 'One shared session, local[2], two shuffle partitions, no UI, tiny data.'], ['How do you test streaming?', 'With the file source and `availableNow`, as in mission 10, on a few small files.']],
        trap: 'Saying that you test by running the job on production data and looking at it.',
        real: 'Write a test for a function that deduplicates orders. What rows do you put in?'
      }),

      B.qa({
        id: 'qa-weaktest', t: 2, tag: 'Testing', secs: 60,
        q: 'Your tests are green and the numbers are wrong. What went wrong?',
        pts: ['Tests assert too little: count() > 0', 'No row for the rule that broke', 'Expected value copied from the code', 'Test data has no NULL, tie, empty case', 'No reconciliation against the source', 'Fix: failing test first, then the code'],
        short: 'The tests were too weak. Typical causes: they assert only that there are rows, no test has a row for the rule that broke, the expected value was copied from the code\'s own output, or the test data has no NULLs, ties or empty cases. In my recording, three of four tests passed on code that dropped the refunded orders, because only one of them had a refunded order and an expected total. So I write the failing test first, from the business rule, then fix the code, and I add a **reconciliation** in the pipeline: the total of the output against the total of the source. Tests protect rules, so I count rules covered and not the number of tests.',
        fu: [['How do you know a test can fail?', 'Run it on broken code first. If it never failed, it has not been shown to catch anything.'], ['What about mutation testing?', 'It changes the code on purpose and checks that some test fails. I did it by hand with the one-word change.']],
        trap: 'Counting tests as a measure of safety.',
        real: 'Tell me about a bug that your tests missed and what you added afterwards.'
      }),

      B.qa({
        id: 'qa-dq', t: 2, tag: 'Testing', secs: 75,
        q: 'What is the difference between a unit test and a data check?',
        pts: ['Unit test: code on tiny made-up data, at build time', 'Data check: the real data, at run time', 'Unit: is the rule right? Check: is today\'s data sane?', 'Checks: not empty, unique key, NULL share, count band, reconciliation', 'On failure: fail the job or quarantine', 'Both are needed'],
        short: 'A **unit test** runs my code on a few made-up rows, in CI, and answers "is the rule right?". A **data check** runs inside the pipeline on the real data and answers "is today\'s data sane?". For checks I use: the output is not empty, a key is unique, the share of NULLs is as expected, the row count is within a band around the usual, and the total of the output equals the total of the source. On failure the job stops and keeps the last good table, or the bad rows go to a quarantine table with a reason. A unit test cannot know that a partner sent half a file, and a data check cannot tell me that the revenue rule is wrong, so I need both.',
        fu: [['Which tools?', 'Deequ, Great Expectations or Soda for rules as configuration, or plain asserts in the job for the basics.'], ['Where do the results go?', 'To a metrics table and an alert, so a failure is seen, not just logged.']],
        trap: 'Saying that unit tests are enough.',
        real: 'What checks run at the end of your pipelines?'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Test Writer', color: '#FECACA',
        pts: [
          'Wrong Spark numbers are **quiet**. Put the logic in **DataFrame in, DataFrame out** functions and test them.',
          'A `pytest` fixture with a **local** session, **two** cores and **two** shuffle partitions. Tiny data with an **explicit schema**.',
          'Use `assertDataFrameEqual` and `assertSchemaEqual`. Put in NULLs, an empty input and every status.',
          'Clean code: **' + TS.clean.passed + ' passed**. One word changed: **' + TS.bug.failed + ' failed** and **' + TS.bug.passed + ' passed**. Only the test with a refunded order caught it.',
          '**Data checks** in the pipeline: not empty, unique key, NULL share, count band, reconciliation.',
          'Unit tests and a small end-to-end run in **CI**. A red test blocks the merge.'
        ],
        lines: [
          'I write the failing test first.',
          'I put the awkward row in the test.',
          'I reconcile the output with the source.'
        ]
      })
    ]
  });
})();
