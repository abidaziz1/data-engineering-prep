/* Mission 14: the boss round. Two drills that cross missions, a design decision, three coding rounds, the mock interview, and a one-page review.
   The coding rounds are run by the verifier: the model solution of round 1 passes its five tests with pytest next to Apache Airflow 3.4.0, the broken DAG of round 2 fails to import and
   its fixed version imports, passes the AIR rules of ruff and gives the same table after two runs, and round 3 uses the recorded blocked DAG (airflow/verify/capture_af.py).
   The learner cannot run Python in the browser, so each round shows the model solution and what the verifier did with it. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RD = G.counts('af.rounds'), FD = G.counts('af.failed_deps'), BF = G.counts('af.backfill'), ID = G.counts('af.idempotent'), DBA = G.counts('af.db_access'), IM = G.counts('af.imports');
  var R1DAG = G.file('round1/dags/brewline_store_revenue.py'), R1LOGIC = G.file('round1/dags/store_logic.py'), R1TEST = G.file('round1/tests/test_dag.py'), R1UNIT = G.file('round1/tests/test_store_logic.py');
  var R2 = G.file('rounds/fix_me.py'), R2FIX = G.file('rounds/fix_me_fixed.py'), BLOCKED = G.file('dags/brewline_blocked.py');
  G.expect(RD.round1.rc === 0 && /5 passed/.test(RD.round1.summary), 'the model solution of round 1 passes five tests');
  G.expect(/schedule_interval/.test(RD.round2.broken_error) && RD.round2.fixed_imports && RD.round2.fixed_ruff_clean && RD.round2.rows_after_two_runs.join() === '2,2' && RD.round2.notify_rule === 'all_done' && RD.round2.load_retries === 2 && RD.round2.catchup === false, 'the recorded round 2');
  G.expect(FD.pool_full.state === 'scheduled', 'the recorded blocked task is scheduled');

  var BLOCKED_CODE = BLOCKED.split('\n').slice(G.at(BLOCKED, /^with DAG\(dag_id="brewline_blocked"/) - 1, G.at(BLOCKED, /slow_extract >> load_after_extract/)).join('\n');
  var BLOCKED_FIX = BLOCKED_CODE.replace('wait_for_slot = BashOperator(task_id="wait_for_slot", bash_command="echo report", pool="tiny_pool")', 'wait_for_slot = BashOperator(task_id="wait_for_slot", bash_command="echo report", pool="report_pool")');
  function r1Lines() { return G.plain(G.text('af.round1_pytest'), { cmd: 'pytest -q   # on the model solution of round 1', d: 60 }); }
  function r2Lines() {
    return [].concat(
      [{ c: 'cmd', t: '# DagBag on the broken file', d: 350 }, { c: 'err', t: 'fix_me.py: ' + RD.round2.broken_error, d: 80 }],
      [{ c: 'cmd', t: '# the same checks on the fixed file', d: 350 }],
      [{ c: 'ok', t: 'imports: ' + RD.round2.fixed_imports + ', ruff --select AIR clean: ' + RD.round2.fixed_ruff_clean, d: 80 }],
      [{ c: 'ok', t: 'rows in the table after two runs for the same day: ' + RD.round2.rows_after_two_runs.join(' and '), d: 80 }],
      [{ c: 'ok', t: 'schedule ' + RD.round2.schedule + ', catchup ' + RD.round2.catchup + ', load retries ' + RD.round2.load_retries + ', notify trigger rule ' + RD.round2.notify_rule, d: 80 }]);
  }
  function r3Lines() { return G.plain(FD.pool_full.failed_deps, { cmd: 'airflow tasks failed-deps ' + FD.pool_full.dag_id + ' ' + FD.pool_full.task_id + ' <run_id>', d: 80 }); }

  var BOSS = [
    ['qa-what', 1], ['qa-arch', 1], ['qa-logical', 1], ['qa-idem', 1], ['qa-retries', 1], ['qa-trigger', 1], ['qa-sensor', 1], ['qa-whynot', 1], ['qa-secrets', 1], ['qa-test', 1], ['qa-deploy', 1],
    ['qa-v3', 2], ['qa-cron', 2], ['qa-late', 2], ['qa-assets', 2], ['qa-defer', 2], ['qa-nodb', 2], ['qa-upgrade', 2], ['qa-managed', 2], ['qa-review', 2], ['qa-oncall', 2], ['qa-watcher', 3]
  ];

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Drills, three coding rounds, a mock interview and a one-page review', minutes: 90,
    focus: ['air', 'ci', 'qual'],
    goals: [
      'Handle **two incidents** that cross missions: a backfill that doubled revenue, and an upgrade night.',
      'Decide **what to build first** when a team moves from cron to Airflow.',
      'Work **three coding rounds**: write a DAG with tests, fix a broken DAG, and find why a task does not run.',
      'Answer **the interview questions** of every mission in the time of a real interview.',
      'Take away **one page** of numbers and rules.'
    ],
    say: 'Mission 14 is the boss round. First two drills that mix what you learned, because nobody has an incident in only one mission. Then a design decision and three coding rounds. I cannot grade Python in a browser, so each round shows a model solution that my verifier ran: pytest, the import check, ruff and the real tables. Then the mock interview with the questions of every mission, and a one-page review.',
    scenes: [
      B.incident({
        id: 'm14-inc1', t: 2, src: 'rec', title: 'Drill: thirty days of doubled revenue, and a refused backfill', time: '11:20',
        alert: '**After a bug fix an engineer ran a backfill for 30 days of `brewline_orders_load`. The revenue of those 30 days is now doubled. They then tried to start a second backfill for the next range, and Airflow refused it.** The load task uses a plain `INSERT`, and the backfill used `--reprocess-behavior completed`.',
        clues: ['The recorded append load went ' + ID.brewline_load_append.map(function (r) { return r.rows; }).join(', ') + ' rows over four runs, and the delete-then-insert load stayed at ' + ID.brewline_load_replace.map(function (r) { return r.rows; }).join(', '), 'The recorded second backfill was refused: `' + BF.second_backfill_while_running.error.replace(/^airflow\.models\.backfill\./, '') + '`', 'With `completed`, the finished days run again, and the recorded tries went from ' + BF.tries_after_none.join(', ') + ' to ' + BF.tries_after_completed.join(', ')],
        opts: [
          { t: 'Change the load to delete-then-insert in one transaction, wait for the running backfill to complete, then repair the 30 days with a backfill of `completed` that you dry-run first and limit with `--max-active-runs`, and compare the counts with the source', fb: '' },
          { t: 'Run the second backfill again until it is accepted, and delete the duplicates by hand afterwards', fb: 'Only one backfill per DAG can run, and a hand-made delete is invisible to the pipeline. The next rerun makes new duplicates.' },
          { t: 'Divide the revenue by two in the dashboard', fb: 'It hides 30 days of wrong data, and the next run changes it again.' },
          { t: 'Set `retries=0` on the load task', fb: 'The load did not fail. It repeated.' }
        ],
        best: 0,
        why: 'Two facts from the recordings fit together. A plain insert repeats its rows whenever the task repeats, and a backfill with `completed` repeats every finished day. So the load must be idempotent before any backfill runs. The refusal of the second backfill is a rule of Airflow: one running backfill for each DAG.',
        checks: [
          ['Stop the damage', 'Pause the DAG, and let the running backfill finish or cancel it. Nothing else can start for this DAG until then.'],
          ['Fix the cause', 'Delete the slice of the day and insert it in one transaction, or upsert on a key. Test it by running it twice (mission 10).'],
          ['Repair', 'Dry-run a backfill of the 30 days, choose `completed`, set `--max-active-runs`, and compare row counts and sums with the source after it completes.']
        ],
        tell: 'The load appended, so the backfill doubled 30 days. I paused the DAG, changed the load to delete-then-insert in one transaction, waited for the first backfill to complete, and repaired the range with a dry-run backfill and a low limit, then compared counts with the source.',
        prevent: ['Idempotent loads before any backfill', 'A dry run for every backfill', 'A test that runs the task twice']
      }),

      B.incident({
        id: 'm14-inc2', t: 2, src: 'rec', title: 'Drill: the first night on Airflow 3.4', time: '03:10',
        alert: '**You upgraded production from Airflow 2 to 3.4.0 at 22:00. At 03:10 the pager says that 8 tasks failed with a `RuntimeError`, and the DAG `brewline_reports` is missing from the UI.** The rest of the night ran.',
        clues: ['The error of the 8 tasks is the one recorded in mission 9: `' + DBA.error + '`', 'The missing DAG shows an import error: `' + G.counts('af.broken')['old_style.py'].import_errors['old_style.py'].replace(/\s*\(\/[^)]*\)/, '') + '`', 'No lint or import test ran before the upgrade'],
        opts: [
          { t: 'Replace the database access in the 8 tasks with SDK calls or your own store, fix the removed import, rerun the failed tasks, and add ruff with the AIR rules and an import test to CI so that the next upgrade finds this in a pull request', fb: '' },
          { t: 'Downgrade to Airflow 2 now', fb: 'A downgrade is slow, and the XCom migration of 3.4.0 has to be copied back. The fixes are small.' },
          { t: 'Give the workers the database credentials again', fb: 'Airflow 3 blocks direct access by design. Credentials on workers defeat the point.' },
          { t: 'Ignore the missing DAG until Monday', fb: 'It is a failure that is already visible, and one import error hides a whole DAG.' }
        ],
        best: 0,
        why: 'Both errors are the ones that the recordings produced: a task may not open a session on the metadata database in Airflow 3, and `days_ago` is gone. They are code changes, not platform problems, and ruff with the AIR rules plus the import test finds both before an upgrade.',
        checks: [
          ['Scope', 'List the failed task instances and the import errors. Two causes explain all of them.'],
          ['Fix and rerun', 'Fix the code, deploy it (mission 12), and clear the failed tasks, which are safe to rerun if they are idempotent.'],
          ['Prevent', 'Lint and import-test every DAG in an Airflow 3 image, and rehearse the upgrade in staging (mission 11).']
        ],
        tell: 'Eight tasks opened database sessions, which Airflow 3 blocks, and one DAG used the removed days_ago. I fixed both in code, rerun the failed tasks, and added ruff with the AIR rules and an import test to CI. I should have run them before the upgrade.',
        prevent: ['Run ruff AIR and the import test before every upgrade', 'Rehearse on staging with a copy of the database', 'Search for create_session in tasks']
      }),

      B.decide({
        id: 'm14-dec', t: 2, src: 'docs', title: 'Decision: what do you build first when Brewline moves from cron to Airflow?',
        scenario: 'Brewline has 40 cron jobs on three servers. Eight of them form the nightly pipeline, with dependencies and the failures that hurt most. The rest are small and independent. Three engineers have eight weeks. The company wants fewer missed reports and no surprises. What do you build first?',
        opts: [
          { t: 'Move all 40 jobs in one weekend, as BashOperator tasks', d: 'Cron disappears at once.', lose: 'Nobody has run a DAG in production yet. Forty jobs share one learning curve, one set of mistakes, and one bad Monday. Nothing is idempotent or tested.' },
          { t: 'Build the platform first for six weeks: Kubernetes, a secrets backend, a Git bundle, dashboards, then start', d: 'A solid base.', lose: 'Six weeks without a single DAG in production, and the platform is designed from guesses. The company still has missed reports.' },
          { t: 'Move the eight-job nightly pipeline first, with idempotent tasks, retries and timeouts, tests in CI and an alert, run it beside cron for two weeks, then move the rest in groups', d: 'The pipeline that hurts most gets fixed first, the first DAGs teach the team, and cron stays as a fallback until the numbers match.' }
        ],
        pick: 2,
        why: 'Start where the pain is and where the value of Airflow is largest: dependencies, retries and visibility. Run both systems side by side and compare outputs. The platform grows from what the first DAGs need.',
        when: 'Build more platform first if you have a compliance rule that forbids running before secrets and audit are in place.'
      }),

      B.talk({
        id: 'm14-r1-spec', t: 2, src: 'rec', title: 'Coding round 1: write a DAG with tests',
        say: 'Press Next to read the task. Write it on paper or in your editor first, then compare with the model solution on the next screens. I ran the model solution: all five of its tests pass.',
        items: [
          ['The task', 'Write a DAG `brewline_store_revenue`. Every day at 03:00 UTC it computes the revenue of each store for the **day of the run** from a list of orders (each has a `store` and a `total` as text such as "19.99") and writes it to a table `store_revenue(store, dt, revenue_cents)`.', 'One DAG, two tasks, a table.'],
          ['The rules', 'It must be **safe to run twice**. Tasks **retry twice** with a delay, and one of them has a **timeout**. The DAG has an **owner and tags**, a fixed start date, and no catchup. The amounts must be **exact in cents**.', 'Everything that the missions said.'],
          ['The tests', 'Write a unit test for the revenue function (including 19.99), a test that every DAG imports and follows the rules of the team, and a test that runs the DAG **twice** for one day and checks that the table is the same.', 'Three layers of mission 10.'],
          ['How it is judged', 'Plain Python logic in its own module. Parameterised by `ds`. Delete-then-insert in one transaction. Retries, a timeout, an owner, tags, a fixed start date. Decimal arithmetic and not floats. A test that fails if the load appends.', 'Seven things to find in an answer.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm14-r1-dag', t: 2, src: 'rec', title: 'Round 1: the model DAG', file: 'brewline_store_revenue.py', lang: 'python', code: R1DAG,
        steps: [
          { say: 'The model solution. The rules are in another file, `store_logic.py`, so that a test can call them without Airflow. Press Next to read this file in parts.', lines: null },
          { say: 'The DAG: 03:00 UTC, a fixed start date, no catchup, an owner, **2 retries** with a delay in `default_args`, and tags. These are the team rules of mission 10.', lines: G.span(R1DAG, /^@dag\(/, /^\)$/) },
          { say: '`compute` reads the orders of **the day of the run** with `ds`, never the clock. It has an `execution_timeout`. Its result is a small dictionary, which is fine for XCom.', lines: G.span(R1DAG, /execution_timeout/, /return revenue_by_store/) },
          { say: '`load` is **idempotent**. The database path is read when the task runs, so that a test can point it elsewhere. In one transaction it deletes the day and inserts it again.', lines: G.span(R1DAG, /def load/, /executemany/) }
        ],
        note: 'The logic file has one function. It adds `int(Decimal(total) * 100)`, so 19.99 gives 1999 and not 1998: `' + R1LOGIC.split('\n').filter(function (l) { return /cents = /.test(l); })[0].trim() + '`.'
      }),

      B.code({
        id: 'm14-r1-test', t: 2, src: 'rec', title: 'Round 1: the tests', file: 'test_dag.py', lang: 'python', code: R1TEST,
        steps: [
          { say: 'Three tests of the DAG, and two unit tests of the logic in another file. The fixture builds the DagBag once.', lines: G.span(R1TEST, /^@pytest.fixture/, /return DagBag/) },
          { say: 'The import test, as in mission 10.', lines: G.span(R1TEST, /def test_no_import_errors/, /import_errors == \{\}/) },
          { say: 'The team rules: tags and the owner, and a retry on every task.', lines: G.span(R1TEST, /def test_team_rules/, /retries >= 1/) },
          { say: 'The test that matters most for a load. It points the database at a temporary file, runs the DAG **twice** for the same day, and counts the rows after each run. An appending load would give 4 rows and 8098 cents at the second count, and the test would fail.', lines: G.span(R1TEST, /def test_running_the_dag_twice/, /assert counts ==/) }
        ],
        note: 'The unit tests of the logic: ' + R1UNIT.split('\n').filter(function (l) { return /^def test/.test(l); }).map(function (l) { return l.replace(/^def |\(\):$/g, ''); }).join(' and ') + '.'
      }),

      B.term({
        id: 'm14-r1-term', t: 2, src: 'rec', title: 'Round 1: what the verifier saw',
        say: 'This is the real output of pytest on the model solution, next to Airflow 3.4.0.',
        lines: r1Lines,
        after: 'Five tests passed: two unit tests of the logic, the import test, the team rules, and the run of the DAG twice with the same table. If your answer passes these five and has the seven features of the list, it is a good answer.',
        afterKind: 'tip',
        doneSay: 'Write the idempotency test first. It is the one that interviewers remember.'
      }),

      B.bug({
        id: 'm14-r2-bug', t: 2, q: 'Coding round 2: fix a broken DAG. It must run at 02:00 UTC every day, with no catchup and a fixed start date, be safe to rerun, retry the load twice, and notify the team after the load whatever its outcome. It has **six** mistakes. Click one of them, then read all six.',
        file: 'fix_me.py', lang: 'python', code: R2, bad: [G.at(R2, /schedule_interval/), G.at(R2, /start_date=datetime\.now/), G.at(R2, /catchup=True/), G.at(R2, /con\.executemany/), G.at(R2, /def load/) - 1, G.at(R2, /def notify/) - 1],
        hint: 'Start with the one that stops the file from importing. Then read the requirements one by one.',
        why: 'The six: (1) `schedule_interval` was removed in Airflow 3, so the file fails with `' + RD.round2.broken_error + '`. (2) `datetime.now()` is a moving start date. (3) `catchup=True` is against the requirement. (4) A plain `INSERT` repeats rows on every rerun. (5) The load has no retries. (6) `notify` has the default trigger rule, so it does not run after a failed load: it needs `all_done`. In my run the fixed file imported, passed ruff with the AIR rules, kept ' + RD.round2.rows_after_two_runs.join(' and ') + ' rows after two runs of the same day, and had the retries and the trigger rule.',
        fix: R2FIX,
        cheer: 'Read the requirements against the file, line by line.'
      }),

      B.term({
        id: 'm14-r2-term', t: 2, src: 'rec', title: 'Round 2: what the verifier did with it',
        say: 'These are the real results of the checks on the broken file and on the fixed file, in Airflow 3.4.0.',
        lines: r2Lines,
        after: 'The broken file does not import, so the DAG processor would hide it from the UI. The fixed file imports, passes the AIR rules, gives the same table after two runs, and meets each requirement. This is the order of work in a real fix: make it import first, then check the rules, then the behaviour.',
        afterKind: 'tip',
        doneSay: 'Make it import, make it lint, make it repeat.'
      }),

      B.code({
        id: 'm14-r3-code', t: 2, src: 'rec', title: 'Coding round 3: find why a task does not run', file: 'brewline_blocked.py', lang: 'python', code: BLOCKED_CODE,
        steps: [
          { say: 'The report task `wait_for_slot` has been in the state `' + FD.pool_full.state + '` for 25 minutes. The scheduler is healthy and the run is going. This is the DAG, from the recording. Press Next, then look at what `airflow tasks failed-deps` printed.', lines: null },
          { say: 'Two tasks use the same pool. `hold_slot` sleeps for 30 seconds in `tiny_pool`, and `wait_for_slot` uses the same pool.', lines: G.span(BLOCKED_CODE, /hold_slot = /, /wait_for_slot = /) }
        ]
      }),

      B.term({
        id: 'm14-r3-term', t: 2, src: 'rec', title: 'Round 3: what Airflow said',
        say: 'This is the real output of `airflow tasks failed-deps` for the waiting task, taken while it waited.',
        lines: r3Lines,
        after: 'The task is not stuck. Its dependency "Pool Slots Available" is not met: the pool `tiny_pool` has one slot and `hold_slot` holds it. The task starts when the slot is free. The recorded pool list shows `tiny_pool` with 1 slot (mission 8).',
        afterKind: 'tip',
        doneSay: 'Read the message before you touch a setting.'
      }),

      B.bug({
        id: 'm14-r3-bug', t: 2, q: 'Round 3, the answer: the task `wait_for_slot` waits although the DAG is healthy. Click the line that explains why.',
        file: 'brewline_blocked.py', lang: 'python', code: BLOCKED_CODE, bad: [G.at(BLOCKED_CODE, /wait_for_slot = /)],
        hint: 'Read the message: which dependency is not met, and what do two tasks of this DAG share?',
        why: 'Both `hold_slot` and `wait_for_slot` use `tiny_pool`, which has one slot. While `hold_slot` runs, `wait_for_slot` has no open slot and stays `scheduled`, as `failed-deps` said. Give the report its own pool, or enlarge the pool if the system behind it can take it. Do not raise `parallelism`: it was not the limit.',
        fix: BLOCKED_FIX,
        cheer: 'The message names the dependency. Believe it.'
      }),

      B.qa({
        id: 'qa-migrate', t: 2, tag: 'Design', secs: 90,
        q: 'Your company runs 40 cron jobs. How do you move them to Airflow?',
        pts: ['Inventory and classify: dependencies, failures that hurt', 'Start with the pipeline that hurts most', 'Idempotent tasks, retries, timeouts, tests in CI, an alert', 'Run beside cron, compare outputs, retire in groups'],
        short: 'I start with an inventory: what each job does, what it depends on, how it fails, who cares. The jobs with dependencies and the failures that hurt most go first, not all 40 at once.\n\nFor the first pipeline I make the tasks idempotent, because Airflow retries and backfills, I add retries and timeouts, secrets in connections, tests in CI and an alert on failure. At first a task can simply call the old script, and I split it where a different failure needs a different action.\n\nI run Airflow beside cron for a couple of weeks and compare the outputs. When the numbers match, I turn the cron line off and keep the script. Then I move the rest in groups, and I let what the first DAGs needed shape the platform: the executor, the DAG bundle, the secrets backend.',
        fu: [['What do you not move?', 'A one-line job on one machine with no dependencies can stay in cron.']],
        trap: 'Moving everything in one weekend, or building the platform for months before the first DAG.',
        real: 'Describe the first job that you would move, and the numbers that would tell you the move worked.'
      }),

      B.qa({
        id: 'qa-design', t: 2, tag: 'Design', secs: 90,
        q: 'Design the Airflow setup for a team of five that owns about 100 DAGs.',
        pts: ['PostgreSQL, more than one scheduler, a triggerer', 'Executor chosen for the work: Celery or Kubernetes', 'A Git bundle, one pinned image, secrets in a backend', 'CI, monitoring, cleanup, deferrable sensors'],
        short: 'I choose the pieces by the work. The metadata database is PostgreSQL, not SQLite. I run two schedulers for availability, a DAG processor, an API server and a triggerer, so that waits can be deferred. For the executor, Celery fits many small tasks, and Kubernetes fits tasks that need isolation. If nobody on the team wants to operate the platform, I would look at a managed service and check which Airflow version it offers.\n\nCode reaches Airflow through a Git bundle, which versions each run, and one image pinned with the constraints file for every part. Secrets sit in a secrets backend, and connections are used by id.\n\nCI runs ruff with the AIR rules, the import test, unit tests and dag.test. For operations I alert on the health of each part, on failed task instances and on late runs, and I run db clean with a dry run first. And I write the standards down: idempotent tasks, timeouts, no top-level work.',
        fu: [['What would you do first?', 'The first pipeline end to end, with tests and alerts.']],
        trap: 'Listing tools without saying what problem each one solves.',
        real: 'Name two choices in your setup and the problem each one solves.'
      }),

      B.qa({
        id: 'qa-oncall', t: 2, tag: 'Operations', secs: 90,
        q: 'Walk me through how you handle an Airflow incident at night.',
        pts: ['Health of each part: scheduler, DAG processor, triggerer, API server, database', 'Scope: one DAG or all', 'State, logs, failed-deps, limits', 'Recent changes, mitigate, fix the cause, write it up'],
        short: 'First the health of each part, from the health endpoint: the scheduler, the DAG processor, the triggerer, the API server and the database. If one is down, that explains a whole class of symptoms. Then scope: is it one DAG or all of them, one task or one kind of task?\n\nFor a task I read its state. If it is scheduled or queued I run failed-deps, which names the unmet dependency, and I look at pools, DAG limits and the executor limit. If it failed I read the log of the try and the retries. I always ask what changed: a deploy, an upgrade, a rotated password, a late file.\n\nThen I mitigate in the safest way: pause the DAG, clear a task that is idempotent, or unblock a hung task. I fix the cause after the pipeline is back, and I write down what happened and what alert would have caught it earlier.',
        fu: [['What do you not do?', 'Restart things at random, or clear many runs without a dry run.']],
        trap: 'Starting with a restart. It hides the cause.',
        real: 'Describe the last Airflow incident you handled, in this order.'
      }),

      B.qa({
        id: 'qa-scale', t: 2, tag: 'Operations', secs: 90,
        q: 'How do you scale Airflow to thousands of DAGs and tasks?',
        pts: ['Parsing: cheap top level, enough parsing processes, no live calls', 'More than one scheduler, PostgreSQL, cleanup', 'Pools, limits and parallelism sized together', 'Mapping over batches, deferrable sensors, fewer tiny tasks'],
        short: 'Scale shows up in five places. Parsing: I keep the top level of files cheap, because the DAG processor parses every file again and again, and I size the parsing processes. Scheduling: I run more than one scheduler, which Airflow supports with row-level locks on PostgreSQL or MySQL, and I remember that parallelism is per scheduler. The database: PostgreSQL, and a regular db clean with a dry run, because every run, try and XCom is a row.\n\nCapacity: pools for the systems that tasks call, DAG limits for runaway runs, and an executor sized for the workload. And design: map over batches and not over single items, use deferrable sensors so that waiting holds no slots, and avoid thousands of tiny tasks or generated DAGs, because each one is parsed, stored and scheduled.\n\nI measure first: parse time, the scheduler loop, task start latency.',
        fu: [['What breaks first?', 'Usually parsing time or the metadata database.']],
        trap: 'Adding workers when the bottleneck is the scheduler or the database.',
        real: 'Name the number that you would watch first on your platform.'
      }),

      B.qa({
        id: 'qa-cost', t: 3, tag: 'Operations', secs: 60,
        q: 'How do you reduce the cost of an Airflow platform?',
        pts: ['Waiting should not hold workers: deferrable sensors', 'Right-size workers and pools; pods only where isolation pays', 'Fewer tiny tasks and DAGs; cleanup of the database', 'Managed or self-managed is a cost decision too'],
        short: 'I look at where the money goes. Waiting is the first suspect: in my recording four sensors used about 28 slot seconds in poke mode and about 1 when deferred, so moving waits to the triggerer frees workers. Then right-sizing: workers and pools matched to the load, and a pod for each task only where isolation is worth the start-up cost.\n\nThen design: fewer tiny tasks and fewer generated DAGs, since each one costs scheduling and database rows, and a regular db clean with a dry run to keep the metadata database small. Large values in XCom also cost database space.\n\nFinally the platform decision itself. A managed service trades a fee for the work of operating Airflow, and the version policy comes with it. I compare the total cost, including the engineers\' time, and not just the invoice.',
        fu: [['How do you know where waste is?', 'Slot seconds by DAG, tasks that wait in scheduled, and the largest tables of the metadata database.']],
        trap: 'Cutting workers first. Look at what holds them.',
        real: 'Name the largest source of idle workers or idle slots in your platform.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm14-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Items marked (docs) come from the Airflow documentation or the release notes and were not run. Everything else comes from a recording or a check that the README describes. Take a screenshot or print the page.',
        sections: [
          { h: 'DAGs and tasks', items: ['DAG = tasks and arrows, no cycle. Task instance = one task in one run. Operator = the template of a task', 'TaskFlow (`@dag`, `@task`) or operators and `>>`. Import from `airflow.sdk` and `airflow.providers.standard`', '`airflow dags test` runs a DAG once, in one process, with no scheduler', 'No import, no DAG: removed argument, duplicate task id, cycle, missing module', 'The top level of a file runs on every parse. A 2 second sleep cost 2 seconds each time', 'Safe mode reads files that contain "airflow" and also "dag" or "asset" (docs)'] },
          { h: 'Time', items: ['Logical date names the run. Data interval = start and end. `ds` = logical date as text', 'A cron string in Airflow 3 is a trigger timetable: the interval is a point. Use `CronDataIntervalTimetable` for a window', 'Both day of month and day of week set: either one matches', 'New York spring: a 02:00 job ran at 03:00 and the gap was 23 hours', 'Catchup off by default. 4 days back with catchup on made 5 runs. `max_active_runs` caps parallel runs', 'Backfill: dry run, `--reprocess-behavior none/failed/completed`, one running backfill per DAG. A manual run can have no `ds`'] },
          { h: 'Loads and data', items: ['Idempotent: running twice = once. Append went 3, 6, 9, 12 rows. Delete-then-insert and upsert stayed 3, 3, 6, 6', 'A window by day misses a late row. A lookback with an upsert finds it', 'XCom is for small values. Big data goes to storage and the path goes through XCom', 'Mapping: `partial` and `expand`. Empty list = skipped. Above `max_map_length` (' + G.cfg('core.max_map_length') + ') the list task fails', 'Assets: one run per event for one asset in 3.4. An AND of assets waits for each and batches the events', 'Task loops (3.4): a task group repeated with `.loop()`, one iteration after another'] },
          { h: 'Failure', items: ['`retries=N` = N+1 tries. Defaults: ' + G.cfg('core.default_task_retries') + ' retries, ' + G.cfg('core.default_task_retry_delay') + ' s delay, no timeout', 'Backoff waited 1, 2, 5, 10 s. `max_retry_delay` has no effect without the multiplier', '`all_done` for cleanup, `one_failed` for alerts, `none_failed_min_one_success` for the join after a branch', 'A failed parent gives `upstream_failed`. A skipped parent skips an `all_success` child. In 3.4.0 `all_done_min_one_success` also skips', 'A cleanup at the end can make the run succeed. Add a watcher (`one_failed`, a child of every task)', 'A deadline alert reports and does not stop the run. A retry policy decides by exception'] },
          { h: 'Waiting and capacity', items: ['Poke ' + G.counts('af.waiting').poke.facts.slot_seconds + ' slot seconds, reschedule ' + G.counts('af.waiting').reschedule.facts.slot_seconds + ', deferrable ' + G.counts('af.waiting').deferrable.facts.slot_seconds + '. Deferral needs a triggerer', 'Sensor default timeout: 7 days (' + G.cfg('sensors.default_timeout') + ' s). Default poke interval 60 s (docs)', '`parallelism` ' + G.cfg('core.parallelism') + ' per scheduler. `max_active_tasks` ' + G.cfg('core.max_active_tasks_per_dag') + ' per run in Airflow 3. `max_active_runs` ' + G.cfg('core.max_active_runs_per_dag') + '. `default_pool` ' + G.cfg('core.default_pool_task_slot_count') + ' slots', '`priority_weight`: the highest goes first in a full pool', '`airflow tasks failed-deps`: pool full, DAG limit, upstream running, `depends_on_past`', 'The executor runs inside the scheduler. Local, Celery, Kubernetes (docs)'] },
          { h: 'Secrets, testing, operating, deploying', items: ['Connections and variables by id. Lookup: secrets backend, environment, then the database through the API server. The environment won in the recording', 'Masking shows `***`, not for secrets under 5 characters. Tasks cannot open the metadata database in Airflow 3', 'Test in layers: ruff AIR, DagBag import test, unit tests of plain logic, `dag.test()`, a staging run', 'Health: scheduler, DAG processor, triggerer, database. `airflow db clean --dry-run` first', 'Upgrade from 2: lint, fix removals (`schedule_interval`, `days_ago`, `Dataset`), rehearse, back up. 3.4 needs Python 3.11+ (docs)', 'Bundles: local (no versioning), Git (versioning, `tracking_ref`), S3 and GCS (no). Install with the constraints file. SQLite is for testing (docs)'] }
        ]
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Airflow Architect', color: '#FDE68A',
        pts: [
          'Incidents cross missions: a plain `INSERT` plus a **backfill** doubles data, and an **upgrade** meets removed imports and blocked database access on the first night.',
          'Move from cron by starting with the **pipeline that hurts most**, run beside cron, compare outputs, and let the first DAGs shape the platform.',
          'A good DAG answer has: plain logic in a module, **`ds` not the clock**, delete-then-insert, retries, a timeout, an owner, tags, a fixed start date, and a **test that runs it twice**.',
          'A broken DAG gets fixed in order: make it **import**, make it **lint**, make it **repeat**, then check the requirements.',
          'A task that does not run: **read `failed-deps`**, then check the pool, the DAG limit, the executor limit and `depends_on_past`.'
        ],
        lines: [
          'I can write a DAG with tests.',
          'I can fix a broken DAG and find why a task does not run.',
          'I can answer the questions of every mission.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
