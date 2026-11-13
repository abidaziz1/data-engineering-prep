/* Mission 10: testing DAGs and CI. Unit tests of plain logic, a DAG integrity test, a run with dag.test(), and lint with the Airflow rules of ruff.
   The test project, the green and red pytest runs and the ruff runs are recorded with pytest and ruff next to Apache Airflow 3.4.0 (airflow/verify/capture_af.py).
   The CI pipeline is a design from documentation: I did not run a CI service. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LOGIC = G.file('project/good/dags/orders_logic.py'), DAGF = G.file('project/good/dags/brewline_orders.py'), INTEG = G.file('project/good/tests/test_dag_integrity.py'), UNIT = G.file('project/good/tests/test_orders.py');
  var BLOGIC = G.file('project/broken/dags/orders_logic.py'), BDAG = G.file('project/broken/dags/brewline_orders.py');
  var PT = G.counts('af.pytest'), RF = G.counts('af.ruff');
  G.expect(PT.green.rc === 0 && /6 passed/.test(PT.green.summary) && PT.red.rc === 1 && /3 failed, 3 passed/.test(PT.red.summary), 'the recorded pytest runs');
  G.expect(RF.findings_old_style === 8 && RF.good_dags_clean === true, 'the recorded ruff runs');

  var TESTCALL_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_double():',
    '    @task',
    '    def double(x):',
    '        return x * 2',
    '',
    '    double(21)',
    '',
    '',
    'brewline_double()',
    '',
    '',
    '# a test for the logic of the task',
    '@task',
    'def double(x):',
    '    return x * 2',
    '',
    '',
    'def test_double():',
    '    assert double(21) == 42'
  ].join('\n');
  var TESTCALL_FIX = TESTCALL_BUG.replace('    assert double(21) == 42', '    assert double.function(21) == 42');
  var TESTDATE_BUG = [
    'from datetime import date',
    '',
    '',
    'def partition_path(table, day):',
    '    return f"s3://brewline-lake/{table}/dt={day.isoformat()}/"',
    '',
    '',
    'def test_partition_path_for_the_run():',
    '    assert partition_path("orders", date.today()) == "s3://brewline-lake/orders/dt=2026-03-14/"'
  ].join('\n');
  var TESTDATE_FIX = TESTDATE_BUG.replace('date.today()', 'date(2026, 3, 14)');

  function pytestLines(which) { return function () { return G.plain(G.text('af.pytest_' + which), { cmd: 'pytest -q' + (which === 'red' ? '   # in the copy of the project with three mistakes' : ''), d: 45 }); }; }
  function ruffLines() {
    return [].concat(G.plain(G.text('af.ruff_old_style'), { cmd: 'ruff check dags --select AIR   # on a DAG written for Airflow 2', d: 60 }), G.plain(G.text('af.ruff_good'), { cmd: 'ruff check dags --select AIR   # on the DAGs of this course', d: 60 }));
  }

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Testing DAGs and CI', short: 'Testing', blurb: 'Unit tests, the import test, dag.test and lint, in a CI pipeline', minutes: 60,
    focus: ['ci'],
    goals: [
      'Keep the rules of a pipeline in **plain Python** that a test can call without Airflow.',
      'Write a **DAG integrity test**: no import errors, tags, owners, retries.',
      'Run a whole DAG with **`dag.test()`** inside pytest.',
      'Use **ruff with the AIR rules** to find Airflow 2 code and style mistakes.',
      'Put the checks in a **CI** pipeline in the right order.'
    ],
    say: 'Mission 10 is how you know a change is safe before it runs at 02:00. I built a small project with a plain Python module, a DAG, an integrity test, a logic test and a test that runs the DAG. Then I made a copy with three mistakes and recorded what pytest said. I also ran ruff with the Airflow rules on a DAG written for Airflow 2.',
    scenes: [
      B.talk({
        id: 'm10-talk', t: 1, src: 'docs', title: 'Four layers of checks, cheap first',
        say: 'Press Next for each layer. Each one catches different mistakes, and each one is slower than the one before.',
        items: [
          ['Lint', 'A linter reads the code and finds mistakes without running it. **ruff** has a set of rules for Airflow, the `AIR` rules, that find removed arguments, old imports and naming mistakes. It runs in a second.', 'Mistakes you can see in the text.'],
          ['The import test', 'Load every DAG file with a `DagBag` and assert that there are **no import errors**. It catches a missing module, a duplicate task id, a cycle and a removed argument, the four errors of mission 2.', 'Does the file load?'],
          ['Unit tests', 'Tests of your own logic. If the rules of the pipeline live in plain Python functions, a test calls them with small inputs and needs no scheduler and no database.', 'Is the logic right?'],
          ['A DAG test', '`dag.test()` runs every task of one DAG run in one process. It checks that the tasks work together for a given date. It does not use the scheduler or the executor, so it does not test pools, limits or timing.', 'Does the DAG run?'],
          ['A staging run', 'A run on a real Airflow with test data. It tests what the rest cannot: connections, pools, the executor, the environment. It is the slowest layer and the closest to production.', 'Does it work where it will run?']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm10-flow', t: 1, src: 'docs', title: 'The checks in a pull request', g: 'ci', legend: true,
        steps: [
          { say: 'This is the pipeline that runs for every pull request. Press Next. The order puts the cheap checks first, so that most mistakes stop the pipeline in seconds.', cap: 'Cheap checks first.' },
          { say: 'Step 1. **ruff** with the AIR rules reads the changed files. It takes a second and needs no Airflow.', on: [], status: { lint: 'run' }, focus: ['lint'], tags: ['tg_fast'], cap: 'Lint.' },
          { say: 'Step 2. The **import test** loads every DAG file in the image that production uses. A missing module or a duplicate task id fails here.', on: ['e1'], status: { lint: 'ok', imp: 'run' }, focus: ['lint', 'imp'], cap: 'Does every file load?' },
          { say: 'Step 3. **pytest** runs the unit tests of the logic.', on: ['e2'], status: { lint: 'ok', imp: 'ok', unit: 'run' }, focus: ['imp', 'unit'], cap: 'Is the logic right?' },
          { say: 'Step 4. **`dag.test()`** runs a sample run of the DAGs that changed, with test data.', on: ['e3'], status: { lint: 'ok', imp: 'ok', unit: 'ok', dtest: 'run' }, focus: ['unit', 'dtest'], tags: ['tg_slow'], cap: 'Does the DAG run end to end?' },
          { say: 'Step 5. A person **reviews** and merges. Step 6. The merge triggers the sync that puts the new files into the DAG bundle that Airflow reads. A failed step anywhere stops the merge.', on: ['e4', 'e5'], status: { lint: 'ok', imp: 'ok', unit: 'ok', dtest: 'ok', gate: 'ok', sync: 'run' }, focus: ['gate', 'sync'], cap: 'Only checked code reaches Airflow.' },
          { say: 'This is the shape of the pipeline. The recorded runs on the next screens are the pytest and ruff steps. I did not run a CI service, so how you wire it in GitHub Actions, GitLab CI or Jenkins is yours.', cap: 'The recorded parts are the checks, not the service.' }
        ]
      }),

      B.code({
        id: 'm10-code-logic', t: 1, src: 'rec', title: 'Put the rules in plain Python', file: 'orders_logic.py', lang: 'python', code: LOGIC,
        steps: [
          { say: 'This is the first file of the test project. It has no `airflow` import. It contains the rules of the pipeline as two plain functions, so that a test can call them in a millisecond.', lines: null },
          { say: '`normalize_order` turns one raw order into one clean row. The id is stripped and upper-cased, and the amount becomes **whole cents**, so that no float is stored.', lines: G.span(LOGIC, /^def normalize_order/, /^    \}$/) },
          { say: '`revenue_cents` adds the cents of the rows.', lines: G.span(LOGIC, /^def revenue_cents/, /return sum/) }
        ],
        note: 'The rule for the amount is `round(float(total) * 100)`. The copy of the project with mistakes uses `int(...)` instead, and the next screens show what that does.'
      }),

      B.code({
        id: 'm10-code-dag', t: 1, src: 'rec', title: 'The DAG imports the logic and stays thin', file: 'brewline_orders.py', lang: 'python', code: DAGF,
        steps: [
          { say: 'The DAG file is short. It imports the two functions and uses them inside tasks.', lines: null },
          { say: 'The DAG has **tags**, an **owner** and **retries** in its default arguments. The tests of the next screen check that every DAG has them.', lines: G.span(DAGF, /^@dag\(/, /^\)$/) },
          { say: 'Each task calls the plain functions. There is almost nothing here to test, and that is the point.', lines: G.span(DAGF, /def transform/, /OUT \/ f"revenue/) }
        ]
      }),

      B.code({
        id: 'm10-code-tests', t: 1, src: 'rec', title: 'The tests: logic, integrity and a run', file: 'test_dag_integrity.py', lang: 'python', code: INTEG,
        steps: [
          { say: 'This file tests every DAG of the project, not one by one. It runs with no Airflow services, in about a second.', lines: null },
          { say: 'A **fixture** builds the `DagBag` once for all tests. The `DagBag` imports every file in the folder.', lines: G.span(INTEG, /^@pytest.fixture/, /return DagBag/) },
          { say: 'The first test says that there are **no import errors**. It would have caught all four broken files of mission 2.', lines: G.span(INTEG, /def test_no_import_errors/, /assert dagbag.import_errors/) },
          { say: 'The next two are **rules of the team**: every DAG has tags and no task keeps the default owner, and every task retries at least once.', lines: G.span(INTEG, /def test_every_dag_has_tags/, /does not retry/) },
          { say: 'The last test **runs the DAG** with `dag.test()` for one date, with the output folder in a temporary directory, and asserts that the run succeeded.', lines: G.span(INTEG, /def test_the_dag_runs/, /assert run.state/) }
        ],
        note: 'The unit tests of the logic are in `test_orders.py`: ' + UNIT.split('\n').filter(function (l) { return /^def test/.test(l); }).map(function (l) { return l.replace(/^def |\(\):$/g, ''); }).join(' and ') + '.'
      }),

      B.term({
        id: 'm10-green', t: 1, src: 'rec', title: 'pytest on the good project',
        say: 'This is the real output of pytest on the project that you just read.',
        lines: pytestLines('green'),
        after: 'Six tests passed: three rules of the team, a no-import-errors test, the `dag.test()` run and two unit tests of the logic. The test of the DAG run executed the tasks with the real SDK in one process.',
        afterKind: 'tip',
        doneSay: 'Green means that these six things hold. It does not mean the pipeline is right.'
      }),

      B.term({
        id: 'm10-red', t: 1, src: 'rec', title: 'pytest on a copy with three mistakes',
        say: 'In the copy I removed the tags and the owner, removed the retries, and wrote `int(...)` where the logic has `round(...)`. This is what pytest said.',
        lines: pytestLines('red'),
        after: 'Three tests failed and each one points at its cause. The missing tags and the missing retries are the rules of the team. The third is **a real bug**: `int(float("19.99") * 100)` is **1998**, not 1999, because 19.99 is not exact in binary. The shop and the warehouse would disagree by a cent on some orders. The unit test catches it in milliseconds.',
        afterKind: 'tip',
        doneSay: 'A float times 100 is not cents. Round it.'
      }),

      B.term({
        id: 'm10-ruff', t: 1, src: 'rec', title: 'ruff with the Airflow rules',
        say: 'The `AIR` rules of ruff know Airflow. The first run is on a DAG that I wrote in the Airflow 2 style. The second run is on the DAGs of this course.',
        lines: ruffLines,
        after: 'Eight findings on the old file. `AIR301` means removed in Airflow 3: `schedule_interval`, `days_ago` and `provide_context`. `AIR311` and `AIR312` mean "still works, but moved or going away": the imports of `DAG`, `Variable`, `BashOperator` and `PythonOperator`. `AIR001` is a naming rule: the variable of a task should match its `task_id`. The second run is clean.',
        afterKind: 'tip',
        doneSay: 'Run ruff with AIR before and after an upgrade. It finds the old code for you.'
      }),

      B.cmp({
        id: 'm10-layers', t: 2, src: 'rec', title: 'What each layer caught in the recording',
        say: 'Press Next. The same mistakes, looked at from the layer that finds them. Recorded means that I ran the check.',
        cols: ['Mistake', 'Lint (ruff)', 'Import test', 'Unit test', 'dag.test()'],
        hl: 1,
        rows: [
          ['`schedule_interval` (removed in Airflow 3)', 'Yes: `AIR301`', 'Yes: the TypeError of mission 2', 'No', 'No: the file does not load'],
          ['A duplicate task id', 'No', 'Yes', 'No', 'No: the file does not load'],
          ['`int()` where `round()` is needed', 'No', 'No', 'Yes: 1998 is not 1999', 'It runs fine. The total is wrong'],
          ['No retries, no tags, the default owner', 'No', 'No', 'Not a unit test. A test of the team rules', 'No'],
          ['A bad Jinja template in a field', 'No', 'No', 'No', 'Yes, when the task renders'],
          ['A pool that is too small, a missing connection', 'No', 'No', 'No', 'No. Only a staging run']
        ],
        steps: [
          { upto: 2, say: 'Removed arguments and duplicate ids stop at the cheapest layers. They never reach a run.' },
          { upto: 4, say: 'A wrong number is only caught by a test that knows the right number. A rule of the team needs a test that you write for the rule.' },
          { upto: 6, say: 'Pools, connections and timing belong to the slowest layer. No cheap check can tell you whether production has a connection.' }
        ]
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'Where do you put the rules of a pipeline so that they are easy to test?',
        opts: [
          { t: 'Inside the `@task` functions, with Airflow imports at the top', fb: 'A test then needs Airflow to import the file.' },
          { t: 'In plain Python functions in a module, and the task calls them', fb: '' },
          { t: 'In the DAG file, at the top level', fb: 'Top-level code runs on every parse.' },
          { t: 'In a Jinja template', fb: 'Templates are hard to test on their own.' }
        ],
        ok: 1, why: 'The recorded project keeps `normalize_order` and `revenue_cents` in a module with no Airflow import. The unit test calls them with a dictionary and checks the result.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'What does `assert dagbag.import_errors == {}` check?',
        opts: [
          { t: 'That every DAG file in the folder loads without an error', fb: '' },
          { t: 'That every task succeeds', fb: 'Nothing runs. The files are imported.' },
          { t: 'That the DAGs have tags', fb: 'That is another test.' },
          { t: 'That the scheduler is healthy', fb: 'A DagBag test needs no scheduler.' }
        ],
        ok: 0, why: 'A `DagBag` imports every file and keeps the errors by file name. The recorded broken files gave a TypeError, a cycle error, a duplicate id error and a missing module, and each one would make this test fail.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1,
        q: 'The recorded unit test failed with 1998 against 1999 for the order of 19.99. What is the cause?',
        opts: [
          { t: 'A bug in pytest', fb: 'The test is right.' },
          { t: '`int(float("19.99") * 100)` truncates 1998.999..., because 19.99 is not exact as a float', fb: '' },
          { t: 'The order id was wrong', fb: 'Only the total differed.' },
          { t: 'The DAG was paused', fb: 'A unit test does not use the DAG.' }
        ],
        ok: 1, why: 'Floats cannot hold 19.99 exactly, so the product is a little below 1999 and `int` cuts it. `round` gives 1999. Better still, keep money as integers or decimals from the start.'
      }),

      B.quiz({
        id: 'm10-q4', t: 1,
        q: 'Which command runs one whole DAG, task after task, in one process, with no scheduler?',
        opts: [
          { t: '`airflow dags trigger`', fb: 'That asks the scheduler to start a run.' },
          { t: '`airflow dags test` (and `dag.test()` in Python)', fb: '' },
          { t: '`airflow dags list`', fb: 'That lists the DAGs.' },
          { t: '`airflow db migrate`', fb: 'That changes the database schema.' }
        ],
        ok: 1, why: 'Mission 2 used it for the first run, and the integrity test calls `dag.test()` in pytest. It does not test pools, limits or timing.'
      }),

      B.quiz({
        id: 'm10-q5', t: 2,
        q: 'ruff reports `AIR301` for `schedule_interval`. What does AIR301 mean?',
        opts: [
          { t: 'The name is removed in Airflow 3 and will fail', fb: '' },
          { t: 'The name works but is deprecated', fb: 'That is the `AIR311` and `AIR312` family.' },
          { t: 'A naming style suggestion', fb: 'That is `AIR001`.' },
          { t: 'A security finding', fb: 'The AIR rules are about Airflow usage.' }
        ],
        ok: 0, why: 'The recorded output says "`schedule_interval` is removed in Airflow 3.0". The ruff rule set marks removals with AIR301, still-working deprecations with AIR311 and AIR312, and a naming rule with AIR001.'
      }),

      B.quiz({
        id: 'm10-q6', t: 2,
        q: 'A unit test calls a TaskFlow task like a function: `assert double(21) == 42`. What happens?',
        opts: [
          { t: 'It passes', fb: 'Calling the decorated name builds a task, not the result.' },
          { t: 'It fails: the call returns a template for an XCom, not 42. Use `double.function(21)`', fb: '' },
          { t: 'It raises an import error', fb: 'The import is fine.' },
          { t: 'It starts a DAG run', fb: 'Nothing runs.' }
        ],
        ok: 1, why: 'I ran it. Outside a DAG, the call created an ad-hoc DAG and returned the text `{{ task_instance.xcom_pull(task_ids=\'double\', dag_id=\'adhoc_airflow\', key=\'return_value\') }}`. The decorated object has a `.function` attribute that holds your original function, and `double.function(21)` returned 42.'
      }),

      B.quiz({
        id: 'm10-q7', t: 2,
        q: 'Your tests pass in CI and a DAG fails at night because a connection does not exist in production. Which layer would have caught it?',
        opts: [
          { t: 'Lint', fb: 'It reads text. It cannot know what production has.' },
          { t: 'A staging run in an environment that mirrors production', fb: '' },
          { t: 'The import test', fb: 'The file loaded fine.' },
          { t: 'A unit test', fb: 'A unit test does not touch connections.' }
        ],
        ok: 1, why: 'Connections, pools and the environment exist only in a real deployment. Put a smoke run in staging, and keep the connection ids in a list that the deployment checks.'
      }),

      B.quiz({
        id: 'm10-q8', t: 2,
        q: 'The `dag.test()` run succeeds in CI. Which of these does it prove?',
        opts: [
          { t: 'The tasks work together for that date, in order, with the test data', fb: '' },
          { t: 'The pool of the warehouse is big enough', fb: '`dag.test()` does not use pools.' },
          { t: 'The DAG finishes in time at 02:00', fb: 'It does not use the scheduler or the executor, so it says nothing about timing.' },
          { t: 'The DAG is idempotent', fb: 'Run it twice and compare, as mission 4 did.' }
        ],
        ok: 0, why: 'It runs the tasks in one process and checks the result for one date. To test idempotency, run it twice and compare. For pools and timing use a staging run.'
      }),

      B.bug({
        id: 'm10-bug1', t: 1, q: 'This unit test of the logic of the task `double` fails with a strange value. Click the line that is wrong.',
        file: 'test_double.py', lang: 'python', code: TESTCALL_BUG, bad: [G.at(TESTCALL_BUG, /assert double\(21\)/)],
        hint: 'What does calling a decorated task return?',
        why: 'Calling a `@task` object builds a task and returns a reference to its XCom, not the value. The object keeps your function as `.function`, so `double.function(21)` calls the plain function and returns 42. Even better, keep the logic in a plain module and test that.',
        fix: TESTCALL_FIX,
        cheer: 'Test the function, not the task object.'
      }),

      B.bug({
        id: 'm10-bug2', t: 2, q: 'This test passes today and fails tomorrow, with no change in the code. Click the line that is wrong.',
        file: 'test_paths.py', lang: 'python', code: TESTDATE_BUG, bad: [G.at(TESTDATE_BUG, /date\.today/)],
        hint: 'What does the test depend on?',
        why: 'The test reads the clock, so its expected value is only right on 14 March. A test needs a fixed input, and so does a task: the run date comes from `ds`, never from `today()`. Mission 3 made the same point for tasks.',
        fix: TESTDATE_FIX,
        cheer: 'A test that depends on the clock is a flaky test.'
      }),

      B.order({
        id: 'm10-ord', t: 1, q: 'Put the checks of a pull request in order, cheapest first.',
        items: [
          'Lint the changed files with ruff and the AIR rules',
          'Load every DAG file with a DagBag and assert that there are no import errors',
          'Run the unit tests of the plain Python logic',
          'Run `dag.test()` for the DAGs that changed, with test data',
          'Review and merge, then sync the files to the DAG bundle'
        ],
        why: 'The cheap checks come first, so that most mistakes stop the pipeline in seconds. A run of whole DAGs costs more, and a human review is last, because nobody should read a change that fails the machines.'
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: what do you test?',
        scenario: 'Brewline has 60 DAGs and four engineers. Mistakes reach production about twice a month: a bad import, a wrong total, a missing retry. Management wants fewer mistakes without slowing down merges. What do you build?',
        opts: [
          { t: 'A full end-to-end test of every DAG against a copy of production, for each pull request', d: 'It finds the most.', lose: 'It takes an hour for each pull request, needs a copy of production, and engineers learn to merge without waiting. Most mistakes did not need it.' },
          { t: 'Layers: ruff, a DagBag import test and team-rule tests for all DAGs, unit tests for the logic, `dag.test()` for the DAGs that changed, and a nightly staging run', d: 'Most mistakes stop in seconds. The expensive run happens once a night.' },
          { t: 'Review only: two engineers read each change', d: 'No tooling to maintain.', lose: 'A person does not see a removed argument, a float that truncates or a duplicate task id reliably, and review slows every change.' }
        ],
        pick: 1,
        why: 'The recorded mistakes are all caught by cheap layers: a removed argument by lint, an import error by the DagBag, a wrong total by a unit test, a missing retry by a team-rule test. Spend the expensive run where cheap checks cannot reach.',
        when: 'Add per-pull-request staging runs for the few DAGs whose failure is costly, such as the one that feeds finance.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, src: 'rec', title: 'Incident: revenue is a few cents lower than the shop\'s numbers', time: '09:05',
        alert: '**Finance says that the daily revenue in the warehouse is lower than the shop\'s report by about 40 cents on a busy day. It started on Friday, after a merge that "cleaned up" the order code.**',
        clues: ['The merge replaced `round(float(total) * 100)` with `int(float(total) * 100)`', 'No unit test covered amounts such as 19.99', 'The difference is one cent for some orders and zero for others'],
        opts: [
          { t: 'Revert to `round`, add a unit test with 19.99 and other awkward amounts, and reload the days since Friday', fb: '' },
          { t: 'Add the missing cents to the report by hand each day', fb: 'It hides the bug and the next change breaks it again.' },
          { t: 'Add retries to the load task', fb: 'The task does not fail. It computes a wrong value.' },
          { t: 'Blame the shop\'s numbers', fb: 'Check your own arithmetic first. The recording shows the truncation.' }
        ],
        best: 0,
        why: 'The recorded failing test shows the cause: `int(float("19.99") * 100)` is 1998. A few cents of difference appear only for amounts that are not exact in binary. A unit test with such amounts would have failed in the pull request, and a backfill of the idempotent loads repairs the days.',
        checks: [
          ['Reproduce', 'Run the function on 19.99. You get 1998 and not 1999.'],
          ['Fix and guard', 'Use `round`, or better, decimals or integer cents from the source. Add the test with awkward amounts.'],
          ['Repair', 'Backfill the days since Friday with a dry run first (mission 3). The loads are idempotent, so it is safe.']
        ],
        tell: 'A cleanup replaced round with int, which truncates amounts like 19.99 to 1998 cents. I reverted it, added a unit test with awkward amounts, and backfilled the days since Friday.',
        prevent: 'A unit test for every rule that touches money, and a review rule: no float arithmetic on amounts.'
      }),

      B.talk({
        id: 'm10-ext', t: 3, src: 'docs', title: 'Extra: more of dag.test(), and data tests',
        say: 'Press Next. Three more tools for a test suite.',
        items: [
          ['The arguments of dag.test()', 'In 3.4.0 the signature is `test(run_after, logical_date, run_conf, conn_file_path, variable_file_path, use_executor, mark_success_pattern)`. `run_conf` gives the run its parameters. The two file arguments load connections and variables from files, so a test needs no database entries. `mark_success_pattern` marks matching tasks as successful without running them, for example a long extract. `use_executor` runs through the configured executor instead of in the process.', 'Control what runs and with which settings.'],
          ['Test the data too', 'A pipeline can run correctly and produce bad data. Add checks that run **as tasks**: row counts against the source, uniqueness of the key, no nulls in required columns. The quality gate of mission 0 is exactly this. Tools such as dbt tests or a data quality library fit here.', 'Code tests and data tests are different layers.'],
          ['Test the DAG as a set', 'The integrity test of this mission runs over every DAG of the project. Add rules that matter to your team, for example a maximum parse time or a naming pattern for `dag_id`, and they apply to every new DAG without a review comment.', 'A rule that is checked is a rule that holds.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-test', t: 1, tag: 'Airflow', secs: 75,
        q: 'How do you test DAGs?',
        pts: ['Plain Python logic with unit tests', 'A DagBag integrity test for all DAGs', 'dag.test() for a run', 'Lint with the AIR rules, and a staging run'],
        short: 'In layers, cheapest first. I keep the rules of the pipeline in plain Python functions, so that unit tests call them with small inputs and need no Airflow. A DagBag integrity test loads every DAG file and asserts that there are no import errors, and it can also check the rules of the team: tags, owners, retries.\n\nThen `dag.test()` runs one whole DAG in one process for a given date, which checks that the tasks work together. It does not use the scheduler, so it says nothing about pools or timing. For that I use a staging run on a real Airflow.\n\nBefore all of that, ruff with the AIR rules finds removed arguments and old imports in a second. In my recording the three failing tests of a broken copy were two team rules and one real bug, a float that truncated 19.99 to 1998 cents.',
        fu: [['How do you test a TaskFlow task?', 'Call `task.function(...)`, or keep the logic in a module and test that.']],
        trap: 'Saying that you test DAGs by running them in production. Import errors and wrong totals are cheap to find earlier.',
        real: 'Say which of these layers your team has today, and which one you would add first.'
      }),

      B.qa({
        id: 'qa-ci', t: 2, tag: 'Operations', secs: 75,
        q: 'What does your CI pipeline for Airflow DAGs look like?',
        pts: ['ruff with the AIR rules', 'Import test in the production image', 'Unit tests and dag.test()', 'Review, merge, sync to the DAG bundle; a staging run'],
        short: 'For every pull request I run, in this order, ruff with the AIR rules, the import test that loads every DAG file in the same image that production uses, the unit tests of the plain Python logic, and `dag.test()` for the DAGs that changed. Each step is cheap, and a failure stops the pipeline.\n\nThe import test runs in the production image on purpose: a module that exists on a laptop and not in the image is the classic way a DAG disappears from the UI. After review the merge syncs the files to the DAG bundle, and a nightly run in staging covers what the cheap layers cannot: connections, pools and the environment.\n\nI did not run a CI service for this course, so the pipeline is a design. The checks inside it I ran: pytest and ruff.',
        fu: [['How do you stop a broken DAG from reaching production?', 'The import test is a required check on the main branch.']],
        trap: 'Running the import test on the laptop image and not the production image.',
        real: 'Describe how a DAG change reaches production in your team, and which checks block it.'
      }),

      B.qa({
        id: 'qa-lint', t: 2, tag: 'Airflow 3', secs: 60,
        q: 'How do you find Airflow 2 code in a project that you must upgrade?',
        pts: ['ruff with the AIR rules', 'AIR301 removed, AIR311 and AIR312 deprecated or moved', 'The import test in an Airflow 3 environment', 'Fix the removals first'],
        short: 'I run ruff with the AIR rules. They know Airflow: AIR301 marks names that were removed in Airflow 3, such as `schedule_interval`, `days_ago` and `provide_context`. AIR311 and AIR312 mark code that still works but moved or is going away, such as the old import paths of the operators and `airflow.DAG`. In my recording one old file gave eight findings.\n\nThen I run the import test in an Airflow 3 environment, because a rule can miss a case and the DagBag does not. I fix the removals first, since they break at import time, and the deprecations next, because they only warn in 3.4.\n\nAfter that, a staging run catches the behaviour changes that no linter sees, like the per-run `max_active_tasks`.',
        fu: [['Does ruff fix them?', 'Some are fixable with `--fix`. Others need a decision.']],
        trap: 'Upgrading Airflow first and reading import errors in production.',
        real: 'Run ruff with AIR on one of your DAG folders and count the findings.'
      }),

      B.qa({
        id: 'qa-money', t: 2, tag: 'Design', secs: 60,
        q: 'A test fails because 19.99 times 100 gives 1998. What do you do?',
        pts: ['Floats are not exact: 19.99 is a little below 19.99', 'round, or integer cents, or Decimal', 'Add the awkward amounts to the unit test', 'Check the days that ran with the bug'],
        short: 'A float cannot hold 19.99 exactly, so 19.99 times 100 is a little below 1999 and `int` cuts it to 1998. I replace the truncation with `round`, and better, I keep money as integer cents or a decimal type from the source on, so that no float arithmetic touches amounts.\n\nThen I add the awkward amounts to the unit test, 19.99, 0.1 plus 0.2, 1.005, so that the next change fails in the pull request.\n\nFinally I ask which days ran with the bug. If the loads are idempotent, a backfill with a dry run repairs them, and I tell finance which days changed and by how much.',
        fu: [['Is Decimal enough?', 'Create it from a string, not from a float.']],
        trap: 'Rounding at the very end of a long calculation. The error is already in.',
        real: 'Describe a number that did not match between two systems and what caused it.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Test Writer', color: '#A7F3D0',
        pts: [
          'Test in **layers, cheapest first**: lint, the import test, unit tests, `dag.test()`, then a staging run.',
          'Keep the **rules in plain Python** so that a unit test needs no Airflow. A `@task` object is not your function: use `.function`.',
          'A **DagBag integrity test** over all DAGs checks that nothing fails to import, and the **rules of the team**: tags, owners, retries.',
          '**ruff with the AIR rules** finds Airflow 2 code: `AIR301` removed, `AIR311` and `AIR312` moved or deprecated, `AIR001` naming.',
          '`dag.test()` runs one DAG once, in one process. It does not test pools, limits, timing or connections.'
        ],
        lines: [
          'I can test the logic of a task without Airflow.',
          'I can write an integrity test.',
          'I can order the checks of a pull request.'
        ]
      })
    ]
  });
})();
