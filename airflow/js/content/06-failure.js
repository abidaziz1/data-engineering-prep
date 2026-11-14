/* Mission 6: when things fail. Retries, backoff, timeouts, callbacks, trigger rules, branching, retry policies and deadlines.
   The retry runs, the backoff waits, the timeout, the callbacks, the 130 trigger-rule cells, the branch runs, the retry policy and the deadline callback are recorded from
   Apache Airflow 3.4.0 (airflow/verify/capture_af.py). The retry lab and the trigger-rule lab are checked against those recordings. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FLAKY = G.file('dags/brewline_flaky.py'), TIMEOUT = G.file('dags/brewline_timeout.py'), CALLBACKS = G.file('dags/brewline_callbacks.py'), BRANCH = G.file('dags/brewline_branch.py');
  var POLICY = G.file('dags/brewline_retry_policy.py'), DEADLINE = G.file('dags/brewline_deadline.py');
  var RT = G.counts('af.retries'), TO = G.counts('af.timeout'), CB = G.counts('af.callbacks'), BR = G.counts('af.branch'), RP = G.counts('af.retry_policy'), DL = G.counts('af.deadline'), BO = G.counts('af.backoff'), TR = G.counts('af.trigger_rules');
  G.expect(RT.final_state === 'success' && RT.try_number === 3 && RT.retries === 3, 'the flaky task succeeded on its third try');
  G.expect(TO.state === 'failed' && /AirflowTaskTimeout/.test(TO.error), 'the slow task timed out');
  G.expect(CB.file.join() === 'retry task=export try=1,failure task=export try=2', 'the recorded callbacks');
  G.expect(RP.tries.call_partner === 3 && RP.tries.read_secret === 1 && RP.final.read_secret === 'failed', 'the recorded retry policy');
  G.expect(DL.callback_seen_before_run_end === true && DL.run_state === 'success' && DL.deadline_seconds === 5, 'the recorded deadline');
  G.expect(BO.delays_in_database.join() === '1,2,5,10', 'the recorded backoff waits');
  G.expect(TR.results.all_done_min_one_success['201'] === 'skipped' && TR.results.one_failed['210'] === 'success' && TR.results.none_failed_min_one_success['102'] === 'success', 'the recorded trigger rules');

  var NOTIFY_BUG = [
    'from airflow.sdk import dag, task',
    'from airflow.providers.standard.operators.bash import BashOperator',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_report():',
    '    @task',
    '    def build_report():',
    '        raise RuntimeError("the warehouse is down")',
    '',
    '    alert_team = BashOperator(task_id="alert_team", bash_command="echo the report failed")',
    '    build_report() >> alert_team',
    '',
    '',
    'brewline_report()'
  ].join('\n');
  var NOTIFY_FIX = NOTIFY_BUG.replace('bash_command="echo the report failed")', 'bash_command="echo the report failed", trigger_rule="one_failed")');
  var JOIN_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_loads():',
    '    @task.branch',
    '    def choose():',
    '        return "incremental_load"',
    '',
    '    @task',
    '    def full_load():',
    '        print("loading everything")',
    '',
    '    @task',
    '    def incremental_load():',
    '        print("loading yesterday")',
    '',
    '    @task',
    '    def build_marts():',
    '        print("building marts")',
    '',
    '    choose() >> [full_load(), incremental_load()] >> build_marts()',
    '',
    '',
    'brewline_loads()'
  ].join('\n');
  var JOIN_FIX = JOIN_BUG.replace('    @task\n    def build_marts():', '    @task(trigger_rule="none_failed_min_one_success")\n    def build_marts():');
  var RETRY_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@hourly", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False, max_active_runs=1)',
    'def brewline_partner():',
    '    @task',
    '    def call_partner():',
    '        import time',
    '        time.sleep(60 * 60 * 6)  # the partner API sometimes never answers',
    '',
    '    call_partner()',
    '',
    '',
    'brewline_partner()'
  ].join('\n');
  var RETRY_FIX = RETRY_BUG.replace('    @task\n    def call_partner():', '    @task(execution_timeout=timedelta(minutes=10), retries=3, retry_delay=timedelta(seconds=30), retry_exponential_backoff=2, max_retry_delay=timedelta(minutes=5))\n    def call_partner():').replace('from airflow.sdk import dag, task\n', 'from datetime import timedelta\n\nfrom airflow.sdk import dag, task\n');

  function attemptLines() {
    var out = [];
    [1, 2, 3].forEach(function (n) { out = out.concat(G.plain(RT.attempt_logs[n], { cmd: '# the log of try ' + n, d: 70 })); });
    return out;
  }
  function timeoutLines() { return G.plain(TO.log, { cmd: '# the task log of slow_export, which sleeps for ' + TO.sleep_seconds + ' seconds with execution_timeout of ' + TO.execution_timeout_seconds + ' seconds', d: 80 }); }

  LAB.addChapter({
    id: 'm6', n: 6, title: 'When things fail: retries, trigger rules and deadlines', short: 'Failure', blurb: 'Retries and backoff, timeouts, alerts, trigger rules, branching and deadlines', minutes: 80,
    focus: ['qual'],
    goals: [
      'Set **retries**, a **retry delay**, **exponential backoff** and a **timeout** on a task, and read what happened from the task instances.',
      'Use **callbacks** and a failure-only task to tell somebody about a failure.',
      'Choose the right **trigger rule** for a cleanup, an alert and a join after a branch.',
      'Use **branching**, and handle the skipped branch.',
      'Choose between a **retry**, a **retry policy by exception**, and a **deadline alert**.'
    ],
    say: 'Mission 6 is about the bad night. I made tasks fail on purpose and recorded what Airflow 3.4.0 did: retries with a delay, a backoff that I compared with the formula in the source, a timeout, callbacks, all thirteen trigger rules against ten mixes of parents, a branch, a retry policy by exception, and a deadline alert. The two labs replay those recordings.',
    scenes: [
      B.talk({
        id: 'm6-talk', t: 1, src: 'docs', title: 'Six tools for a failure',
        say: 'Press Next for each tool. A pipeline needs most of them. A good design says which one fits which kind of failure.',
        items: [
          ['Retries', 'A task with `retries=3` runs up to **four** times. After a failure it waits for `retry_delay` and goes to `up_for_retry`. Retries heal short outages: a restarting API, a lock, a network blip.', 'Try again, a few times.'],
          ['Backoff', 'A **multiplier** makes each wait longer than the one before, with a bit of jitter, so that many tasks do not hit a recovering service at the same moment. `max_retry_delay` caps it.', 'Wait longer each time.'],
          ['Timeouts', '`execution_timeout` stops a task that runs too long. Without one, a hanging task can hold a slot for hours, and the next run waits behind it. By default there is none.', 'A hang is a failure too.'],
          ['Trigger rules', 'A task starts when its **trigger rule** is met. The default is `all_success`. Others run a cleanup after a failure, an alert only on failure, or a join after a branch.', 'What the parents must have done.'],
          ['Callbacks and alerts', 'A callback is a function that Airflow calls when a task fails, retries or succeeds. An alert can also be a normal task with a trigger rule.', 'Tell somebody.'],
          ['Deadlines', 'A **deadline alert** calls a function when a run has not finished by a time that you set. It does not stop the run. It is for "this is taking too long", not for "this failed".', 'A watch on the clock.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'A bad night in the nightly DAG', g: 'master', legend: true,
        steps: [
          { say: 'This is the nightly DAG from mission 0. This time we follow a failure in the middle. The sensor and the extract worked. Press Next.', status: { check: 'ok', extract: 'ok' }, focus: ['check', 'extract'], cap: 'A run is going.' },
          { say: 'The load runs and fails, because the warehouse is busy. The task has `retries=2`, so it is not failed yet: it goes to `up_for_retry` and waits for its retry delay.', on: ['e2'], status: { check: 'ok', extract: 'ok', load: 'retry' }, focus: ['load'], cap: 'A failed try with retries left.' },
          { say: 'The delay is over and the second try succeeds. Nothing downstream noticed, except that the run took longer. This is the case that retries are for.', on: ['e2', 'e3'], status: { check: 'ok', extract: 'ok', load: 'ok', xform: 'run' }, focus: ['load', 'xform'], cap: 'A short outage healed itself.' },
          { say: 'Now a failure that retries cannot fix: the quality check finds that the row count is wrong. After its tries it is `failed`. The task `publish` has the default rule `all_success`, so Airflow sets it to `upstream_failed` and never starts it.', on: ['e4', 'e5'], status: { check: 'ok', extract: 'ok', load: 'ok', xform: 'ok', qual: 'fail', pub: 'skip' }, focus: ['qual', 'pub'], cap: 'A failed parent stops its children.' },
          { say: 'The alert task has `trigger_rule="one_failed"`: it runs when a parent failed. And cleanup has `all_done`: it runs when every parent has finished, whatever happened. The recorded trigger-rule grid on the next screens shows these rules for every mix of parents.', on: ['e6', 'e8'], status: { check: 'ok', extract: 'ok', load: 'ok', xform: 'ok', qual: 'fail', pub: 'skip', alert: 'ok', clean: 'ok' }, tags: ['tg_rule6', 'tg_rule8'], focus: ['qual', 'alert', 'clean'], cap: 'Failure is contained, reported and cleaned up. The state of the run itself is a topic of mission 13.' }
        ]
      }),

      B.code({
        id: 'm6-code-flaky', t: 1, src: 'rec', title: 'A task that fails twice and then works', file: 'brewline_flaky.py', lang: 'python', code: FLAKY,
        steps: [
          { say: 'This task needs a source that is "not ready" for the first two tries. A counter in a file survives between tries, so the third try works.', lines: null },
          { say: '`retries=3` allows three more tries after the first. `retry_delay` of two seconds is the wait after each failure. The default delay is **' + G.cfg('core.default_task_retry_delay') + ' seconds**, and the default number of retries is **' + G.cfg('core.default_task_retries') + '**: a task with no settings fails once and stays failed.', lines: G.span(FLAKY, /@task\(retries/, /@task\(retries/) },
          { say: 'The first two tries raise an error. The third returns a value.', lines: G.span(FLAKY, /tries = int/, /return "rows=10"/) },
          { say: '`load` takes the value. It starts only after `extract` has finally succeeded.', lines: G.span(FLAKY, /def load/, /print\("loading"/) }
        ]
      }),

      B.term({
        id: 'm6-term-retries', t: 1, src: 'rec', title: 'Three tries, three logs',
        say: 'Each try has its own log. These are the real logs of the three tries of `extract` on a running scheduler.',
        lines: attemptLines,
        after: 'The first two logs end with the error, and the third ends with the returned value. The gaps between the end of one try and the start of the next were ' + RT.gap_seconds_between_tries.join(' and ') + ' seconds for a retry delay of ' + RT.retry_delay_seconds + ' seconds: the delay is the earliest time, and the scheduler and the executor add some time on top. The numbers are from this machine.',
        afterKind: 'tip',
        doneSay: 'Each try is a row in the database. The next screen shows them.'
      }),

      B.rows({
        id: 'm6-rows-retries', t: 1, src: 'rec', title: 'What the database kept',
        steps: [
          {
            say: 'Each try of a task instance is kept as its own row. The first two are archived with the reason `retry`. The third is the current row.',
            tabs: [{
              layer: 'TASK INSTANCE', name: 'Tries of the task extract', c: 'raw',
              cols: G.table('af.retries_rows').cols,
              rows: G.table('af.retries_rows').rows,
              trk: 0
            }],
            notes: ['`working_set` 1 marks the current row. A query on the task instance table must filter on it, or it counts every try. The task finished with state ' + RT.final_state + ' and `try_number` ' + RT.try_number + '.']
          }
        ]
      }),

      B.widget({ id: 'm6-w-retry', kind: 'retry', t: 1, src: 'rec', title: 'Lab: retries, delay and backoff' }),

      B.code({
        id: 'm6-code-timeout', t: 1, src: 'rec', title: 'A timeout stops a task that hangs', file: 'brewline_timeout.py', lang: 'python', code: TIMEOUT,
        steps: [
          { say: 'A task that sleeps for ten seconds, with an `execution_timeout` of three. This stands for an export that hangs.', lines: null },
          { say: '`execution_timeout` is the longest that one try may run. `retries=0` makes the timeout visible: there is no second try.', lines: G.span(TIMEOUT, /@task\(execution_timeout/, /def slow_export/) }
        ],
        note: 'The default is no timeout: the recorded setting `default_task_execution_timeout` is empty. A task without one can run forever.'
      }),

      B.term({
        id: 'm6-term-timeout', t: 1, src: 'rec', title: 'The timeout in the log',
        say: 'This is the real log of that task. It ended after about ' + TO.seconds_until_failed + ' seconds, not ' + TO.sleep_seconds + '.',
        lines: timeoutLines,
        after: 'The error is `AirflowTaskTimeout`. The task state is `' + TO.state + '`. With `retries` above zero it would have gone to `up_for_retry` instead, and a timeout counts as a failure of that try.',
        afterKind: 'tip',
        doneSay: 'Set a timeout on every task that calls something outside Airflow.'
      }),

      B.code({
        id: 'm6-code-callbacks', t: 1, src: 'rec', title: 'Callbacks: a function for each outcome', file: 'brewline_callbacks.py', lang: 'python', code: CALLBACKS,
        steps: [
          { say: 'A callback is a function that Airflow calls with the **context** of the task instance. This helper writes a line to a file, so that the recording can show when each callback ran.', lines: G.span(CALLBACKS, /^def note/, /return callback/) },
          { say: 'The task fails on purpose. It has one retry, and three callbacks: one for a retry, one for the final failure and one for success.', lines: G.span(CALLBACKS, /@task\(retries=1/, /raise RuntimeError/) }
        ],
        note: 'The file held: ' + CB.file.map(function (l) { return '"' + l + '"'; }).join(' and ') + '. The retry callback ran after the first try, the failure callback after the last one, and the success callback never ran. The final state of the run was ' + CB.run_state + '.'
      }),

      B.widget({ id: 'm6-w-trig', kind: 'trig', t: 1, src: 'rec', title: 'Lab: trigger rules for every mix of three parents' }),

      B.cmp({
        id: 'm6-rules', t: 1, src: 'rec', title: 'The thirteen trigger rules',
        say: 'Airflow 3.4.0 has thirteen. Press Next to read them in groups. The "runs when" column follows the Airflow documentation, and the lab above replays all of them against recorded runs.',
        cols: ['Rule', 'Runs when', 'Use it for'],
        hl: 1,
        rows: [
          ['`all_success` (default)', 'Every parent succeeded.', 'A normal step.'],
          ['`all_failed`', 'Every parent failed.', 'An alert when all redundant sources failed.'],
          ['`all_done`', 'Every parent has finished, whatever happened.', 'Cleanup and a final notification.'],
          ['`one_failed`', 'At least one parent failed. It does not wait for the others.', 'An alert on the first failure.'],
          ['`one_success`', 'At least one parent succeeded. It does not wait for the others.', 'The first of several sources that works.'],
          ['`one_done`', 'At least one parent succeeded or failed.', 'React to the first finished.'],
          ['`none_failed`', 'No parent failed or is upstream_failed. Skipped is fine.', 'Optional steps before a task.'],
          ['`none_failed_min_one_success`', 'No parent failed, and at least one succeeded.', 'The join after a branch.'],
          ['`none_skipped`', 'No parent was skipped. Failures are allowed.', 'Rare. Check the lab before you use it.'],
          ['`all_skipped`', 'Every parent was skipped.', 'A "nothing to do today" step.'],
          ['`all_done_min_one_success`', 'Every parent finished and at least one succeeded. In 3.4.0 a skipped parent **skips** the task.', 'Check the lab. It is easy to get wrong.'],
          ['`all_done_setup_success`', 'Like `all_done`, and an upstream setup task must have succeeded.', 'The default for teardown tasks.'],
          ['`always`', 'No condition. It runs at once.', 'A task that does not depend on its parents.']
        ],
        steps: [
          { upto: 3, say: 'Start with the three that you will use most: the default, a rule that waits for everything, and a rule that runs after anything. `all_done` is the cleanup rule.' },
          { upto: 6, say: '`one_failed` and `one_success` start as soon as one parent has the state. That is the alert rule and the "first one wins" rule.' },
          { upto: 10, say: '`none_failed_min_one_success` is the join after a branch: skipped parents are fine, failed ones are not. Compare it with `none_skipped`, which looks similar and does something else.' },
          { upto: 13, say: 'The last three are special. `all_done_min_one_success` reads in the documentation as if skipped parents were ignored. In the recording and in the 3.4.0 source a skipped parent skips the task. The recorded grid and the source agree, so trust them and re-check after an upgrade.' }
        ]
      }),

      B.code({
        id: 'm6-code-branch', t: 1, src: 'rec', title: 'Branching: pick one path and skip the other', file: 'brewline_branch.py', lang: 'python', code: BRANCH,
        steps: [
          { say: 'A **branch** task returns the id of the task to run next. The other path is skipped. This DAG chooses between a full load and an incremental load from a parameter.', lines: null },
          { say: '`@task.branch` returns the task id. `params` give the run its input: a person can set `full_refresh` when triggering.', lines: G.span(BRANCH, /@task.branch/, /return "full_load"/) },
          { say: 'The join has `trigger_rule="none_failed_min_one_success"`. One parent will be skipped, and with the default rule the join would be skipped as well.', lines: G.span(BRANCH, /@task\(trigger_rule/, /def build_marts/) },
          { say: 'The arrow `pick >> [full, incremental] >> build_marts()` fans out and joins again.', lines: G.span(BRANCH, /pick >> \[/, /pick >> \[/) }
        ],
        note: 'The recording ran it twice. With `full_refresh` true, `' + Object.keys(BR.full.states).map(function (k) { return k + ' ' + BR.full.states[k]; }).join(', ') + '`. With it false, `' + Object.keys(BR.incremental.states).map(function (k) { return k + ' ' + BR.incremental.states[k]; }).join(', ') + '`.'
      }),

      B.code({
        id: 'm6-code-policy', t: 2, src: 'rec', title: 'A retry policy: the exception decides', file: 'brewline_retry_policy.py', lang: 'python', code: POLICY,
        steps: [
          { say: 'A plain `retries=3` treats every error alike. A wrong API key is retried three times, and it will fail three times. A **retry policy** looks at the exception and decides. This arrived with the pluggable retry policies of Airflow 3.3.', lines: null },
          { say: 'Two rules. A `PermissionError` means **fail now**, with a reason. A `ConnectionError` means **retry after one second**.', lines: G.span(POLICY, /^policy = /, /^\)$/) },
          { say: 'Both tasks have `retries=3` and the same policy. `call_partner` raises a connection error twice, then works. `read_secret` raises a permission error.', lines: G.span(POLICY, /@task\(retries=3, retry_policy=policy\)/, /return "ok"/) }
        ],
        note: 'The recording: `call_partner` ended as `' + RP.final.call_partner + '` after ' + RP.tries.call_partner + ' tries, and `read_secret` ended as `' + RP.final.read_secret + '` after ' + RP.tries.read_secret + ' try. The database keeps the reason of each retry in `retry_reason`.'
      }),

      B.code({
        id: 'm6-code-deadline', t: 2, src: 'rec', title: 'A deadline alert: tell me when the run is late', file: 'brewline_deadline.py', lang: 'python', code: DEADLINE,
        steps: [
          { say: 'A deadline alert watches the clock for a **run**. It does not stop anything. When the time passes and the run is not done, Airflow calls your function.', lines: null },
          { say: 'The reference is `DAGRUN_QUEUED_AT`, the interval is five seconds, and the callback is a `SyncCallback` that names a function. A synchronous callback runs on the executor. An async one runs in the triggerer.', lines: G.span(DEADLINE, /deadline=DeadlineAlert\(/, /^    \),$/) },
          { say: 'The task sleeps for 20 seconds, so the run is late.', lines: G.span(DEADLINE, /def slow_load/, /time.sleep\(20\)/) }
        ],
        note: 'The recording: the callback ran while the run was still going (`' + DL.callback_seen_before_run_end + '`), and the run ended as `' + DL.run_state + '` after the task\'s ' + DL.task_seconds + ' seconds. A deadline reports. It does not cancel.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'A task has `retries=3`. What is the largest number of times it can run?',
        opts: [
          { t: '3', fb: 'Three retries come after the first try.' },
          { t: '4', fb: '' },
          { t: '2', fb: 'Retries add to the first try. They do not replace it.' },
          { t: 'Unlimited, until it succeeds', fb: 'The number of retries is a limit.' }
        ],
        ok: 1, why: 'One first try and three retries. The recorded flaky task needed three tries and had `retries=3`, so it succeeded with one retry to spare.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You do not set `retries` or `retry_delay` on a task. What happens when it fails?',
        opts: [
          { t: 'It is retried 3 times after 5 minutes', fb: 'Those are not the defaults.' },
          { t: 'It fails and stays failed. If you set retries but no delay, the wait is ' + G.cfg('core.default_task_retry_delay') + ' seconds', fb: '' },
          { t: 'It is retried until it works', fb: 'Retries are limited, and the default is ' + G.cfg('core.default_task_retries') + '.' },
          { t: 'Airflow pauses the DAG', fb: 'Airflow does not pause a DAG for a failed task.' }
        ],
        ok: 1, why: 'The recorded defaults are `default_task_retries` of ' + G.cfg('core.default_task_retries') + ' and `default_task_retry_delay` of ' + G.cfg('core.default_task_retry_delay') + ' seconds. Set both on your DAGs through `default_args`.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'The `load` task failed. The `publish` task after it has the default trigger rule. What state does `publish` get?',
        opts: [
          { t: 'success', fb: 'It would run only if the load succeeded.' },
          { t: 'upstream_failed', fb: '' },
          { t: 'skipped', fb: '`skipped` comes from a branch or a skip. A failed parent gives `upstream_failed`.' },
          { t: 'failed', fb: 'The task never ran, so it did not fail itself.' }
        ],
        ok: 1, why: 'The recorded grid has `all_success` with one failed parent as `' + TR.results.all_success['210'] + '`. The task never starts. Its own children follow their trigger rules.'
      }),

      B.quiz({
        id: 'm6-q4', t: 1,
        q: 'A cleanup task must run after the pipeline whether it succeeded, failed or was skipped. Which trigger rule?',
        opts: [
          { t: '`all_success`', fb: 'It would not run after a failure.' },
          { t: '`all_done`', fb: '' },
          { t: '`one_failed`', fb: 'It would not run when everything succeeded.' },
          { t: '`all_failed`', fb: 'Only when every parent failed.' }
        ],
        ok: 1, why: '`all_done` runs when every parent has finished, in any state. In the recorded grid it gave `success` for all ten mixes of parents.'
      }),

      B.quiz({
        id: 'm6-q5', t: 1,
        q: 'The task `slow_export` sleeps for 10 seconds and has `execution_timeout` of 3 seconds and `retries=0`. What did the recording show?',
        opts: [
          { t: 'The task succeeded after 10 seconds', fb: 'The timeout stops it first.' },
          { t: 'The task failed with `AirflowTaskTimeout` after about 3 seconds', fb: '' },
          { t: 'The task was skipped', fb: 'A timeout is a failure.' },
          { t: 'The task was retried forever', fb: 'It has no retries.' }
        ],
        ok: 1, why: 'The recorded error is `' + TO.error.replace(/, PID: \d+/, '') + '`, and the state is `' + TO.state + '`.'
      }),

      B.quiz({
        id: 'm6-q6', t: 2,
        q: 'A task has `retry_delay` of 30 seconds, `retry_exponential_backoff=2` and `max_retry_delay` of 5 minutes. About how long is the wait before the third retry?',
        opts: [
          { t: 'Exactly 30 seconds', fb: 'The multiplier makes the waits grow.' },
          { t: 'At least 2 minutes: the base is 30 x 2 x 2 = 120 seconds, plus a jitter of up to the same again, cut at 300', fb: '' },
          { t: 'Exactly 90 seconds', fb: 'Backoff multiplies. It does not add.' },
          { t: 'Always 5 minutes', fb: 'That is the cap, not the usual wait.' }
        ],
        ok: 1, why: 'The base for failed try k is the delay times the multiplier to the power k minus 1. Airflow adds a jitter from a hash, between zero and the base, and the cap cuts the result. Airflow\'s own function gave 5 and 10 seconds for the third and fourth wait of the recorded task, where the bases were 4 and 8.'
      }),

      B.quiz({
        id: 'm6-q7', t: 2,
        q: 'You set `max_retry_delay=timedelta(minutes=5)` on a task with a fixed `retry_delay` of 10 minutes and no multiplier. What is the wait?',
        opts: [
          { t: '5 minutes', fb: 'The cap applies only with a multiplier.' },
          { t: '10 minutes: without a multiplier the cap is not applied', fb: '' },
          { t: '15 minutes', fb: 'Nothing adds the two.' },
          { t: 'The DAG fails to import', fb: 'The settings are allowed.' }
        ],
        ok: 1, why: 'In Airflow\'s own function, run over a grid of settings, the delay stayed at the fixed value whenever the multiplier was off, with or without a cap. The lab above shows it.'
      }),

      B.quiz({
        id: 'm6-q8', t: 2,
        q: 'A branch task chooses `incremental_load`. `full_load` is skipped. The `build_marts` task after both has the default rule. What state does `build_marts` get?',
        opts: [
          { t: 'success', fb: 'A skipped parent stops a default task.' },
          { t: 'skipped', fb: '' },
          { t: 'failed', fb: 'Nothing failed.' },
          { t: 'upstream_failed', fb: 'That needs a failed parent.' }
        ],
        ok: 1, why: 'With `all_success`, a skipped parent skips the child. The recorded grid has one success and one skipped parent as `' + TR.results.all_success['102'] + '`. The fix is `none_failed_min_one_success` on the join, which the recording used and which ran `build_marts` after the branch.'
      }),

      B.quiz({
        id: 'm6-q9', t: 2,
        q: 'What is the difference between `execution_timeout` and a deadline alert?',
        opts: [
          { t: 'They are the same', fb: 'One stops a task. The other only reports.' },
          { t: '`execution_timeout` stops one try of one task. A deadline alert watches a run and calls a function, and does not stop anything', fb: '' },
          { t: 'A deadline alert stops the run', fb: 'The recorded run ended as success after the deadline had passed.' },
          { t: '`execution_timeout` works on runs', fb: 'It works on a single task try.' }
        ],
        ok: 1, why: 'The recorded deadline callback ran while the 20-second task was still going, and the run ended as `' + DL.run_state + '`. Use a timeout to stop a hang and a deadline to tell people that something is late.'
      }),

      B.quiz({
        id: 'm6-q10', t: 2,
        q: 'The `one_failed` rule and the `all_done` rule on an alert task: which one is right for "tell me as soon as any parent fails"?',
        opts: [
          { t: '`all_done`', fb: 'It waits until every parent has finished.' },
          { t: '`one_failed`', fb: '' },
          { t: '`all_failed`', fb: 'That needs every parent to fail.' },
          { t: '`none_failed`', fb: 'It runs when nothing failed.' }
        ],
        ok: 1, why: 'The documentation says `one_failed` does not wait for all upstream tasks to be done. The alert starts at the first failure. Use `all_done` for a final message after everything.'
      }),

      B.bug({
        id: 'm6-bug1', t: 1, q: 'This DAG should alert the team when the report fails. The alert task never runs when `build_report` fails. Click the line that is wrong.',
        file: 'brewline_report.py', lang: 'python', code: NOTIFY_BUG, bad: [G.at(NOTIFY_BUG, /alert_team = BashOperator/)],
        hint: 'With the default trigger rule, what happens to a child of a failed task?',
        why: 'The alert has the default `all_success`, so a failed parent makes it `upstream_failed` and it never starts. Give the alert a rule that fits: `one_failed` runs it when a parent failed.',
        fix: NOTIFY_FIX,
        cheer: 'An alert that only runs on success is a broken alert.'
      }),

      B.bug({
        id: 'm6-bug2', t: 2, q: 'The `build_marts` task never runs, although the branch chose a path that succeeded. Click the line that is wrong.',
        file: 'brewline_loads.py', lang: 'python', code: JOIN_BUG, bad: [G.at(JOIN_BUG, /def build_marts/) - 1, G.at(JOIN_BUG, /def build_marts/)],
        hint: 'One parent was skipped. What does the default rule do with that?',
        why: 'The branch skips `full_load`. The join has `all_success`, and a skipped parent skips it. `none_failed_min_one_success` accepts skipped parents and still needs one success. The recorded branch DAG used it.',
        fix: JOIN_FIX,
        cheer: 'Every join after a branch needs a trigger rule.'
      }),

      B.bug({
        id: 'm6-bug3', t: 2, q: 'The partner API sometimes never answers. The hourly DAG has `max_active_runs=1`. One night the DAG stopped producing data for six hours. Click the line that explains it.',
        file: 'brewline_partner.py', lang: 'python', code: RETRY_BUG, bad: [G.at(RETRY_BUG, /@task$/), G.at(RETRY_BUG, /def call_partner/)],
        hint: 'What stops a task that hangs?',
        why: 'The task has no `execution_timeout` and no retries. A hang holds the one allowed run, and every later hourly run waits behind it. Set a timeout, a few retries and a backoff with a cap, so that a hang becomes a failure that heals or alerts.',
        fix: RETRY_FIX,
        cheer: 'A task without a timeout can hold the whole DAG.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the life of a task that fails once and then works in order.',
        items: [
          'The task runs and raises an error',
          'Airflow sets it to `up_for_retry` because retries are left',
          'The retry delay passes',
          'The scheduler schedules it again and the executor starts the second try',
          'The second try succeeds and the children can run'
        ],
        why: 'A failed try with retries left is not failed yet. It waits in `up_for_retry`. Every try keeps its own log and its own row in the database.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'rec', title: 'Decision: how should the partner API call retry?',
        scenario: 'Brewline calls a partner API every night. It fails in two ways: the API sometimes refuses connections for a few minutes while it restarts, and once in a while the API key has expired and every call is rejected with a permission error. Which setup do you choose?',
        opts: [
          { t: '`retries=0`, and a person reruns it', d: 'No wasted tries.', lose: 'A short restart of the API wakes somebody up at night, and the first try would have worked ten minutes later.' },
          { t: '`retries=5` with a fixed delay of one minute', d: 'It heals a restart.', lose: 'A bad key is retried five times, and each retry is a rejected call. And every task of the DAG that fails at the same time retries at the same moment.' },
          { t: 'Exponential backoff with a cap for the connection errors, and a retry policy that fails at once on a permission error', d: 'The restart heals with growing waits, and the bad key fails in one try with a clear reason.' }
        ],
        pick: 2,
        why: 'The two failures need different actions. The recorded retry policy retried a `ConnectionError` and failed a `PermissionError` after one try, with the reason stored in `retry_reason`.',
        when: 'If you are on a version before the retry policies of Airflow 3.3, use the first option for both and add a check at the start of the task that fails fast on a bad key.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the nightly DAG has been "running" for six hours', time: '08:30',
        alert: '**The `brewline_partner` DAG, hourly, `max_active_runs=1`, has one run that started at 02:00 and is still running. The runs of 03:00 to 08:00 are queued behind it. The dashboard is six hours old.** The running task is `call_partner`.',
        clues: ['The task log ends at "connecting to the partner API"', 'The task has no `execution_timeout`', 'The default for `default_task_execution_timeout` is empty, which means no limit'],
        opts: [
          { t: 'Mark the stuck task failed or clear it so that the queue drains, then add an execution timeout, retries and a backoff to the task', fb: '' },
          { t: 'Raise `max_active_runs` so that the queued runs start', fb: 'They would call the same hanging API and hang too.' },
          { t: 'Restart the scheduler', fb: 'The task runs on a worker. A scheduler restart does not stop it.' },
          { t: 'Delete the queued runs', fb: 'You lose the hours and the hanging task is still there.' }
        ],
        best: 0,
        why: 'A task without a timeout can hold a slot and a run for as long as the call hangs. With `max_active_runs=1` the other runs wait. First unblock, then fix the cause: the timeout turns a hang into a failure, and retries with a backoff heal a flaky API.',
        checks: [
          ['Unblock', 'Set the stuck task instance to failed or clear it, as you decide. Then the queued runs start, one at a time.'],
          ['Refill', 'After the fix, the runs of 03:00 to 08:00 may need a backfill or a clear, and the loads must be idempotent (mission 4).'],
          ['Close the gap', 'A timeout on every task that calls outside Airflow, and an alert on runs that exceed a time (a deadline alert).']
        ],
        tell: 'A task without a timeout hung on the partner API and held the only allowed run. I unblocked the queue, then added a timeout, retries with a backoff, and a deadline alert so that a late run tells us at once.',
        prevent: ['Require **`execution_timeout`** in code review for every task that calls a network service', 'Set `retries` and a retry delay next to every timeout', 'Alert on tasks that run much longer than their usual duration']
      }),

      B.talk({
        id: 'm6-ext1', t: 3, src: 'docs', title: 'Extra: deadlines, in more detail',
        say: 'Press Next. This is from the Airflow documentation, and the callback part was recorded above.',
        items: [
          ['Four references', 'A deadline is a reference time plus an interval. `DAGRUN_QUEUED_AT` measures from when the run was queued, and watches for resource problems. `DAGRUN_LOGICAL_DATE` measures from when the run was scheduled to start, and fits "done before the next run". `FIXED_DATETIME` is a fixed moment. `AVERAGE_RUNTIME` uses the average of recent successful runs, and creates no deadline when there is not enough history.', 'Choose the clock that fits the question.'],
          ['Callbacks', 'A deadline calls an `AsyncCallback` or a `SyncCallback`. A synchronous callback runs on the executor like a top-priority task. An asynchronous one runs in the triggerer. The recorded callback was synchronous and was imported by name from the DAGs folder.', 'It must be importable where it runs.'],
          ['Negative intervals', 'An interval can be negative, so that the deadline lies before the reference, for example "one hour before the report is due".', 'A warning before the miss.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm6-ext2', t: 3, src: 'docs', title: 'Extra: what happens when a worker dies',
        say: 'Press Next. A task that fails with an exception is the easy case. A task that vanishes is harder.',
        items: [
          ['Heartbeats', 'A running task sends a heartbeat. If none arrives for `task_instance_heartbeat_timeout` seconds (' + G.cfg('scheduler.task_instance_heartbeat_timeout') + ' by default), the scheduler marks the task instance as failed and schedules it again, which uses a retry if there is one.', 'A silent task is treated as failed.'],
          ['Queued too long', 'A task that stays `queued` longer than `task_queued_timeout` (' + G.cfg('scheduler.task_queued_timeout') + ' seconds by default) is retried or set to failed.', 'A lost message in the queue does not wait forever.'],
          ['Orphans', 'The scheduler checks for orphaned tasks every ' + G.cfg('scheduler.orphaned_tasks_check_interval') + ' seconds by default and adopts or resets them. This is one more reason for idempotent tasks: a task that was running can start again.', 'Runs at least once.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-retries', t: 1, tag: 'Airflow', secs: 75,
        q: 'How do you configure retries, and how do you decide the numbers?',
        pts: ['retries and retry_delay in default_args, per task where needed', 'Exponential backoff with a cap for flaky services', 'A timeout so that a hang becomes a failure', 'Tasks must be idempotent'],
        short: 'I set `retries` and `retry_delay` in `default_args`, and change them for tasks that call flaky services. The defaults are no retries and a five minute delay, so a task with no settings fails once and stays failed.\n\nFor calls to a service that restarts or throttles, I add exponential backoff with a cap. Each wait is longer than the last, with some jitter, so many tasks do not hit the service together. In my recording the waits were 1, 2, 5 and 10 seconds with a one second delay and a cap of 10.\n\nI always pair retries with an `execution_timeout`, because a hang is a failure that retries cannot heal. And the task must be idempotent, because a retry repeats it. For errors that retrying cannot fix, such as a bad credential, I use a retry policy that fails at once.',
        fu: [['Where is the retry count of a task stored?', 'The task instance has a try number, and each try is its own row.'], ['What does retry_exponential_backoff=2 do?', 'It doubles the base wait each time, with jitter, up to the cap.']],
        trap: 'Setting retries to 10 with no delay. A flaky service gets ten calls in a minute.',
        real: 'Say which retry settings your team uses, and when they last helped.'
      }),

      B.qa({
        id: 'qa-trigger', t: 1, tag: 'Airflow', secs: 75,
        q: 'What is a trigger rule? Give me examples of when you would change the default.',
        pts: ['The condition on the parents that decides when a task starts', 'Default all_success', 'all_done for cleanup, one_failed for alerts', 'none_failed_min_one_success for a join after a branch'],
        short: 'A trigger rule is the condition on a task\'s parents that decides whether it starts. The default is `all_success`: every parent must have succeeded. If a parent failed, the task gets `upstream_failed`, and if one was skipped, the task is skipped.\n\nI change it in three cases. A cleanup task uses `all_done`, so it runs whatever happened. An alert task uses `one_failed`, so it starts at the first failure. And the join after a branch uses `none_failed_min_one_success`, because one branch is always skipped and the default would skip the join as well.\n\nThere are thirteen rules. I ran each against ten mixes of three parents, and a few are easy to get wrong: `none_skipped` allows failures, and in 3.4.0 `all_done_min_one_success` is skipped when any parent was skipped.',
        fu: [['What is upstream_failed?', 'The task never ran, because a parent failed.']],
        trap: 'Using the default on an alert task. It never runs when something fails.',
        real: 'Name the cleanup and alert tasks in your DAGs, and the rules that they use.'
      }),

      B.qa({
        id: 'qa-branch', t: 2, tag: 'Airflow', secs: 60,
        q: 'How do you branch in a DAG, and what is the usual mistake?',
        pts: ['@task.branch returns the id of the task to run', 'The other paths are skipped', 'The join needs a trigger rule that accepts skipped parents', 'none_failed_min_one_success'],
        short: 'A branch task returns the id of the next task, or a list of ids, and Airflow skips the paths that were not chosen. I use it for choices that are only known at run time, such as a full load on a flag and an incremental load otherwise.\n\nThe usual mistake is the join. A task after both branches has the default rule, and a skipped parent skips it, so the rest of the DAG silently does not run. The fix is `none_failed_min_one_success` on the join: skipped parents are fine, failed ones are not, and one must have succeeded. My recorded branch DAG did exactly that and built the marts on both paths.',
        fu: [['Can a branch pick several paths?', 'Yes, return a list of task ids.']],
        trap: 'Forgetting the join rule and wondering why nothing runs after the branch.',
        real: 'Describe a decision in your pipeline that is made at run time, and how it is branched.'
      }),

      B.qa({
        id: 'qa-alert', t: 2, tag: 'Operations', secs: 75,
        q: 'How do you make sure the right person knows when a pipeline fails, and only then?',
        pts: ['A failure callback or a one_failed alert task', 'Alert on the final failure, not on every retry', 'A deadline alert for late runs', 'Include the log link and the run'],
        short: 'I alert on outcomes that need a person. A failure callback on the DAG or an alert task with `one_failed` fires when a task fails for good, after its retries, and it carries the DAG, the task, the run and the log link. I do not alert on every retry, because that trains people to ignore alerts.\n\nSlow is also a failure, so I add a deadline alert: if the run is not done by a time, a function is called, and the run keeps going. In my recording the callback ran while the run was still running.\n\nFor the on-call, I keep the alert short and put the fix in the runbook. I also watch the scheduler itself, because a silent scheduler produces no failures at all.',
        fu: [['What does a retry callback do?', 'It runs after a failed try that will be retried. I use it for metrics, not for paging.']],
        trap: 'Mailing every failed try to the whole team.',
        real: 'Describe your last pipeline alert, whether it was useful, and what you changed.'
      }),

      B.qa({
        id: 'qa-policy', t: 3, tag: 'Airflow 3.3', secs: 60,
        q: 'Retries treat every exception alike. How do you change that?',
        pts: ['A retry policy: rules by exception type', 'RetryAction: retry, fail, reschedule, default', 'A per-rule delay and a reason', 'Recorded: PermissionError fails at once, ConnectionError retries'],
        short: 'Since Airflow 3.3 a task can have a retry policy. I list rules that match an exception and give an action: retry, fail now, reschedule, or the default. A rule can carry its own retry delay and a reason, and Airflow stores the reason with the try.\n\nI recorded the typical case. A task raised a connection error twice and then worked: it was retried after one second each time and succeeded on the third try. Another task raised a permission error: it failed after one try, with the reason "A wrong credential does not fix itself". That saves the retries and the noise, and the reason shows in the database.\n\nI keep the plain `retries` as the limit and use the policy to say which errors deserve them.',
        fu: [['Where is the reason visible?', 'In the retry_reason column of the task instance table and in the UI.']],
        trap: 'Retrying an authentication error five times.',
        real: 'Name an error in your pipeline that should never be retried.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Failure Planner', color: '#FECACA',
        pts: [
          '`retries=N` allows **N+1 tries**. The defaults are no retries and a ' + G.cfg('core.default_task_retry_delay') + ' second delay. **Backoff** multiplies the wait and adds jitter. `max_retry_delay` caps it, and only with a multiplier.',
          'Set an **`execution_timeout`** on every task that calls outside Airflow. By default there is none, and one hang can hold a whole DAG.',
          'The **trigger rule** decides when a task starts. `all_done` for cleanup, `one_failed` for alerts, `none_failed_min_one_success` for a join after a branch. A failed parent gives `upstream_failed`.',
          '**Callbacks** run on retry, failure and success. A **retry policy** decides by exception. A **deadline alert** reports a late run and does not stop it.',
          'Every retry repeats the task, so the task must be **idempotent**. Each try is its own row in the database.'
        ],
        lines: [
          'I can set retries, backoff and a timeout.',
          'I can pick the right trigger rule.',
          'I can alert on a failure and on a late run.'
        ]
      })
    ]
  });
})();
