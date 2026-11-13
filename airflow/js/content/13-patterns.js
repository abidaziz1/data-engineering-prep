/* Mission 13: patterns and anti-patterns. A design review of everything before it, the way a run gets its state, dynamic DAG generation, dependency isolation and self-checks.
   The watcher recording, the DAG factory file and the numbers in the table of anti-patterns are recorded from Apache Airflow 3.4.0 (airflow/verify/capture_af.py).
   The advice is from the best practices guide of the Airflow documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var WA = G.counts('af.watcher'), WATCH = G.file('dags/brewline_watcher.py'), WAIT = G.file('dags/brewline_waiting.py');
  var ID = G.counts('af.idempotent'), PC = G.counts('af.parse_cost'), XS = G.counts('af.xcom_size'), ME = G.counts('af.mapping_edge'), WT = G.counts('af.waiting');
  G.expect(WA.hides.run_state === 'success' && WA.hides.tasks.check_quality === 'failed' && WA.hides.tasks.cleanup === 'success' && WA.watcher.run_state === 'failed' && WA.watcher.tasks.watcher === 'failed', 'the recorded watcher pattern');

  var LOCAL_BUG = [
    'import csv',
    '',
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_export():',
    '    @task',
    '    def extract():',
    '        with open("/tmp/orders.csv", "w") as f:',
    '            csv.writer(f).writerows([["O-1", 12.5], ["O-2", 8.0]])',
    '',
    '    @task',
    '    def load():',
    '        with open("/tmp/orders.csv") as f:',
    '            print(len(list(csv.reader(f))), "rows to load")',
    '',
    '    extract() >> load()',
    '',
    '',
    'brewline_export()'
  ].join('\n');
  var LOCAL_FIX = LOCAL_BUG.replace('    @task\n    def extract():\n        with open("/tmp/orders.csv", "w") as f:\n            csv.writer(f).writerows([["O-1", 12.5], ["O-2", 8.0]])\n\n    @task\n    def load():\n        with open("/tmp/orders.csv") as f:\n            print(len(list(csv.reader(f))), "rows to load")\n\n    extract() >> load()',
    '    @task\n    def extract(ds=None):\n        path = f"/shared/staging/orders_{ds}.csv"  # a shared store that every worker can reach\n        with open(path, "w") as f:\n            csv.writer(f).writerows([["O-1", 12.5], ["O-2", 8.0]])\n        return path\n\n    @task\n    def load(path):\n        with open(path) as f:\n            print(len(list(csv.reader(f))), "rows to load")\n\n    load(extract())');
  var VARTOP_BUG = [
    'from airflow.sdk import Variable, dag, task',
    'import pendulum',
    '',
    'REGION = Variable.get("brewline_region")',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_region_load():',
    '    @task',
    '    def load():',
    '        print("loading region", REGION)',
    '',
    '    load()',
    '',
    '',
    'brewline_region_load()'
  ].join('\n');
  var VARTOP_FIX = VARTOP_BUG.replace('from airflow.sdk import Variable, dag, task', 'from airflow.sdk import Variable, dag, task').replace('REGION = Variable.get("brewline_region")\n\n\n', '\n').replace('        print("loading region", REGION)', '        print("loading region", Variable.get("brewline_region"))');
  var SWALLOW_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    'def send_report():',
    '    raise ConnectionError("the mail server refused the connection")',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_report():',
    '    @task(retries=3)',
    '    def report():',
    '        try:',
    '            send_report()',
    '        except Exception:',
    '            print("could not send the report")',
    '',
    '    report()',
    '',
    '',
    'brewline_report()'
  ].join('\n');
  var SWALLOW_FIX = SWALLOW_BUG.replace('        try:\n            send_report()\n        except Exception:\n            print("could not send the report")', '        send_report()  # let the error out: the task fails, retries, and alerts');
  var SLEEP_BUG = [
    'import time',
    '',
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="0 1 * * *", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_partner_load():',
    '    @task',
    '    def load():',
    '        time.sleep(60 * 60 * 2)  # the partner file usually arrives within two hours',
    '        print("loading the partner file")',
    '',
    '    load()',
    '',
    '',
    'brewline_partner_load()'
  ].join('\n');
  var SLEEP_FIX = [
    'from airflow.providers.standard.sensors.filesystem import FileSensor',
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="0 1 * * *", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_partner_load():',
    '    wait = FileSensor(task_id="wait_for_file", filepath="/data/partner/orders.csv", deferrable=True, poke_interval=60, timeout=60 * 60 * 5)',
    '',
    '    @task',
    '    def load():',
    '        print("loading the partner file")',
    '',
    '    wait >> load()',
    '',
    '',
    'brewline_partner_load()'
  ].join('\n');
  var DBGEN_BUG = [
    'import sqlite3',
    '',
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    'con = sqlite3.connect("/data/brewline.db")',
    'CUSTOMERS = [r[0] for r in con.execute("SELECT customer_id FROM customers")]  # about 3,000 rows',
    '',
    'for cid in CUSTOMERS:',
    '',
    '    @dag(dag_id=f"export_{cid}", schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    '    def export(cid=cid):',
    '        @task',
    '        def run():',
    '            print("exporting", cid)',
    '',
    '        run()',
    '',
    '    export()'
  ].join('\n');
  var DBGEN_FIX = [
    'import sqlite3',
    '',
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(dag_id="export_customers", schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def export_customers():',
    '    @task',
    '    def list_batches():',
    '        con = sqlite3.connect("/data/brewline.db")',
    '        ids = [r[0] for r in con.execute("SELECT customer_id FROM customers")]',
    '        return [ids[i:i + 100] for i in range(0, len(ids), 100)]',
    '',
    '    @task',
    '    def export(batch):',
    '        for cid in batch:',
    '            print("exporting", cid)',
    '',
    '    export.expand(batch=list_batches())',
    '',
    '',
    'export_customers()'
  ].join('\n');

  function antiRows() {
    return [
      ['Work at the top of a DAG file', 'It runs on every parse.', 'A `time.sleep(2)` at the top cost ' + PC.median_seconds['toplevel_slow.py'].toFixed(2) + ' s on each parse; a light file cost ' + (PC.median_seconds['light.py'] * 1000).toFixed(1) + ' ms.', 'Move it into a task.'],
      ['`Variable.get()` at the top', 'A request to the database or backend on every parse (the documentation).', 'Mission 9.', 'Use `{{ var.value.name }}` or read it inside the task.'],
      ['A plain `INSERT`', 'Duplicates on every retry or rerun.', 'The append load grew ' + ID.brewline_load_append.map(function (r) { return r.rows; }).join(', ') + ' rows; delete-then-insert stayed at ' + ID.brewline_load_replace.map(function (r) { return r.rows; }).join(', ') + '.', 'Delete the slice and insert, or upsert.'],
      ['"Now" instead of the run date', 'A rerun loads the wrong day.', 'Mission 3: the clock moves, `ds` does not.', 'Use `ds` or the data interval.'],
      ['Large values in XCom', 'The metadata database grows and slows.', 'A 10 MB value was stored: ' + XS.rows[3].stored_bytes.toLocaleString('en-US') + ' bytes in one row.', 'Write to storage and pass the path.'],
      ['A poke sensor with the default timeout', 'It holds a slot and waits up to seven days.', 'Poke used ' + WT.poke.facts.slot_seconds + ' slot seconds. Deferrable used ' + WT.deferrable.facts.slot_seconds + '.', 'Defer or reschedule, and set a timeout.'],
      ['No retries and no timeout', 'A blip fails the night and a hang blocks the DAG.', 'Mission 6: the defaults are ' + G.cfg('core.default_task_retries') + ' retries and no timeout.', 'Set both in `default_args`.'],
      ['`depends_on_past` for everything', 'One failure blocks every later day.', 'Mission 8: `failed-deps` printed the reason.', 'Independent, idempotent runs.'],
      ['A cleanup as the last task', 'The run ends as success although a task failed.', 'The recorded run was `' + WA.hides.run_state + '` with `check_quality` ' + WA.hides.tasks.check_quality + '.', 'A watcher task (below).'],
      ['Thousands of tiny tasks or DAGs', 'Overhead larger than the work, and the map limit.', '1,100 items failed at the limit of ' + ME.max_map_length + '.', 'Map over batches.'],
      ['A local file between tasks', 'The next task may run on another machine.', 'Mission 5 and the best practices guide.', 'Storage, and pass the path.'],
      ['A secret in code', 'It lives in Git for ever.', 'Mission 9.', 'A connection by id.']
    ];
  }

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Patterns and anti-patterns', short: 'Patterns', blurb: 'A design review of everything so far, and the patterns that senior engineers add', minutes: 60,
    focus: ['con'],
    goals: [
      'Run a **design review** of a DAG against the habits of good pipelines.',
      'Spot the **twelve anti-patterns** of this course in code.',
      'Explain why a cleanup task can make a failed run look **successful**, and use the **watcher** pattern.',
      'Generate DAGs **dynamically** without paying for it at every parse.',
      'Isolate **dependencies** with virtualenvs, containers or pods, and add **self-checks**.'
    ],
    say: 'Mission 13 is the review. The first screens collect the mistakes of the earlier missions in one table, with the numbers from the recordings. Then comes one new thing that I recorded: a cleanup task at the end of a DAG can make the whole run succeed although a task failed. After that, dynamic DAGs, isolated dependencies and self-checks.',
    scenes: [
      B.talk({
        id: 'm13-talk', t: 1, src: 'docs', title: 'Habits of good pipelines',
        say: 'Press Next for each habit. They come from the best practices guide of the Airflow documentation, and each one has a mission behind it.',
        items: [
          ['A task is a transaction', 'The guide says to treat tasks like transactions in a database: never produce incomplete results. A task either leaves complete output or none. This is also what makes a retry safe.', 'All or nothing.'],
          ['The same outcome on every rerun', 'Use an upsert and not an insert. Read and write a **specific partition**. Never read "the latest data": someone may update the input between reruns, and the output changes.', 'Parameterise by the run.'],
          ['No local files between tasks', 'Tasks of one run can run on different servers, so a file on the disk of one is not there for the next. Pass **small** values through XCom and larger data through remote storage, and pass the path.', 'The next task may be elsewhere.'],
          ['No secrets inside tasks', 'Use connections and retrieve them by a unique id. Do not keep passwords or tokens in the code.', 'A connection by id.'],
          ['A cheap top level', 'Only the code that creates operators and builds the graph belongs at the top of a file. The DAG processor runs everything else on every parse. Variables at the top level cost a request on each parse unless you use the cache or a Jinja template.', 'Imports and definitions.'],
          ['Check your own results', 'Add **self-checks**: a downstream task that verifies what the upstream task produced, such as that a partition exists and that the counts look right.', 'Trust, and verify.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm13-anti', t: 1, src: 'rec', title: 'Twelve anti-patterns, with the evidence of this course',
        say: 'Press Next to read them in groups. Each row says what goes wrong, what the recordings showed, and the fix. Most of them you have met in an earlier mission.',
        cols: ['Anti-pattern', 'What goes wrong', 'Evidence', 'Fix'],
        hl: 0,
        rows: antiRows(),
        steps: [
          { upto: 4, say: 'The first four are about **time and repeats**: parse time, variables, inserts and the clock. They all show up as wrong data or slow parsing.' },
          { upto: 8, say: 'The next four are about **waiting and limits**: XCom size, sensors, retries and timeouts, and chains of days. They show up as stuck pipelines.' },
          { upto: 12, say: 'The last four are about **shape and safety**: the run state, tiny tasks, local files and secrets.' }
        ]
      }),

      B.code({
        id: 'm13-code-watcher', t: 1, src: 'rec', title: 'The run that looked fine: cleanup hides a failure', file: 'brewline_watcher.py', lang: 'python', code: WATCH,
        steps: [
          { say: 'This file has two DAGs with the same three tasks. The check fails on purpose. I ran both. Press Next to read them.', lines: null },
          { say: 'In the first DAG `check_quality` raises an error. `publish` comes after it, and `cleanup` after that with `trigger_rule="all_done"`.', lines: G.span(WATCH, /dag_id="brewline_teardown_hides"/, /check_quality\(\) >> publish\(\) >> cleanup\(\)/) },
          { say: 'In the second DAG there is one more task, the **watcher**. It has `trigger_rule="one_failed"` and it **always fails** when it runs. It is downstream of **all** the other tasks, so it runs only if one of them failed.', lines: G.span(WATCH, /def watcher/, /raise AirflowException/) },
          { say: 'The wiring: the usual chain, and then `[checked, published, cleaned] >> watcher()` so that the watcher is a child of every task.', lines: G.span(WATCH, /checked = check_quality/, /\] >> watcher/) }
        ],
        note: 'The recorded result of the first DAG: `check_quality` ' + WA.hides.tasks.check_quality + ', `publish` ' + WA.hides.tasks.publish + ', `cleanup` ' + WA.hides.tasks.cleanup + ', and the run was **' + WA.hides.run_state + '**. With the watcher the run was **' + WA.watcher.run_state + '**, because the watcher ' + WA.watcher.tasks.watcher + '.'
      }),

      B.cmp({
        id: 'm13-watcher', t: 1, src: 'rec', title: 'The state of a run follows its last tasks',
        say: 'Press Next. The two recorded runs side by side. This is the most surprising fact of the mission, and it applies to any DAG that ends in a cleanup.',
        cols: ['Task', 'Without a watcher', 'With a watcher'],
        hl: 2,
        rows: [
          ['`check_quality`', WA.hides.tasks.check_quality, WA.watcher.tasks.check_quality],
          ['`publish`', WA.hides.tasks.publish, WA.watcher.tasks.publish],
          ['`cleanup` (`all_done`)', WA.hides.tasks.cleanup, WA.watcher.tasks.cleanup],
          ['`watcher` (`one_failed`)', 'not in the DAG', WA.watcher.tasks.watcher],
          ['**The run**', '**' + WA.hides.run_state + '**', '**' + WA.watcher.run_state + '**']
        ],
        steps: [
          { upto: 3, say: 'In both runs the check fails and the publish never starts. The cleanup runs, because `all_done` runs after anything.' },
          { upto: 5, say: 'Without the watcher, the last task of the DAG is the cleanup, and it succeeded, so **the run succeeded**. A dashboard of runs shows green. The documentation explains it: the run gets the state of the final task, so a teardown with `all_done` can hide a failure. With the watcher, a task that fails by design makes the run fail.' }
        ],
        note: 'Trigger rules look only at direct parents. The watcher must be a direct child of every task that you want it to watch.'
      }),

      B.code({
        id: 'm13-code-factory', t: 1, src: 'rec', title: 'A DAG factory done right: one file, three DAGs', file: 'brewline_waiting.py', lang: 'python', code: WAIT,
        steps: [
          { say: 'Mission 7 used this file. It is also a small, safe example of **generating DAGs in a loop**: one file creates three DAGs, one for each sensor mode.', lines: null },
          { say: 'The loop runs over a fixed tuple of three names. Nothing here calls a database or an API, so the file parses in milliseconds.', lines: G.span(WAIT, /^for mode in/, /^for mode in/) },
          { say: 'The `dag_id` is built from the loop variable, so each DAG has a unique id.', lines: G.span(WAIT, /dag_id=f"brewline_wait_/, /dag_id=f"brewline_wait_/) },
          { say: 'The last line stores the DAG in the module `globals()` under its id. The DAG processor finds DAGs among the global names of the module, so this makes each one visible.', lines: G.span(WAIT, /globals\(\)/, /globals\(\)/) }
        ],
        note: 'The rule from the best practices guide: generate DAGs from environment variables, from generated Python code in the DAG folder, or from a metadata file in the DAG folder. Avoid a live query of a database or an API at parse time.'
      }),

      B.cmp({
        id: 'm13-isolation', t: 2, src: 'docs', title: 'When a task needs different packages',
        say: 'Two tasks can need two versions of the same library. Press Next. These are the ways that the Airflow documentation lists to keep their dependencies apart.',
        cols: ['Operator', 'How it isolates', 'Good for', 'Costs'],
        hl: 1,
        rows: [
          ['`PythonVirtualenvOperator`', 'Builds a virtual environment for the task and runs the function there.', 'A task with its own packages, on a worker that allows it.', 'The environment is created for each run unless cached, which takes time.'],
          ['`ExternalPythonOperator`', 'Runs the function in an existing, separate Python environment.', 'Heavy or fixed environments that you prepare in advance.', 'You must keep the environment present on every worker.'],
          ['`DockerOperator`, `KubernetesPodOperator`', 'Runs the task in a container or a pod. Dependencies are fully independent, including system libraries.', 'Very different environments, and tasks in other languages.', 'You need to understand containers or pods, and Airflow needs access to the engine or the cluster.']
        ],
        steps: [
          { upto: 1, say: 'A virtual environment is the lightest way to give one task its own packages.' },
          { upto: 2, say: 'An existing environment saves the build time and moves the work to your deployment.' },
          { upto: 3, say: 'A container or a pod is the strongest isolation. The guide says it is far more involved, and it is the way to go when the task needs a very different environment.' }
        ]
      }),

      B.talk({
        id: 'm13-selfcheck', t: 1, src: 'docs', title: 'Self-checks: ask the data whether the task worked',
        say: 'Press Next. A task can succeed and still leave wrong data. A check in the DAG finds out.',
        items: [
          ['What to check', 'After a task that pushes data to S3, a downstream check can confirm that the partition exists and that simple counts make sense. After a task that starts a service, an HTTP sensor can confirm that the service answers. The guide gives both examples.', 'A check after the work.'],
          ['Where it goes', 'The check is a task with an arrow from the work. If the check fails, the next tasks do not run, and the failure points at the data and not at the code. In the nightly DAG of mission 0 it is the `quality_checks` task before `publish`.', 'A gate before publish.'],
          ['What it is not', 'A self-check is not a unit test. It runs on real data, each night, and it catches what changed in the world: a late file, a partial load, a source that sent half a day.', 'Tests guard code. Checks guard data.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm13-q1', t: 1,
        q: 'A DAG ends with `cleanup` (`all_done`). An earlier task failed. What state does the run get, according to the recording?',
        opts: [
          { t: 'failed, because a task failed', fb: 'The run takes the state of its last tasks, not of any task.' },
          { t: 'success, because the last task succeeded', fb: '' },
          { t: 'skipped', fb: 'The run is not skipped.' },
          { t: 'upstream_failed', fb: 'That is a task state.' }
        ],
        ok: 1, why: 'The recorded run was `' + WA.hides.run_state + '`, with the check `' + WA.hides.tasks.check_quality + '` and the cleanup `' + WA.hides.tasks.cleanup + '`. A watcher task with `one_failed` makes the run fail.'
      }),

      B.quiz({
        id: 'm13-q2', t: 1,
        q: 'The watcher task has `trigger_rule="one_failed"` and raises an error. Which tasks must be its parents?',
        opts: [
          { t: 'Only the first task', fb: 'The rule looks only at direct parents.' },
          { t: 'Every task that it should watch', fb: '' },
          { t: 'Only the cleanup', fb: 'It would miss a failure of the earlier tasks.' },
          { t: 'None. It looks at the whole DAG', fb: 'Trigger rules use direct parents only.' }
        ],
        ok: 1, why: 'The documentation says that trigger rules rely on the direct upstream tasks. The recorded watcher was wired as `[checked, published, cleaned] >> watcher()`.'
      }),

      B.quiz({
        id: 'm13-q3', t: 1,
        q: 'Two tasks of a DAG share data through the file `/tmp/orders.csv`. The DAG runs on the KubernetesExecutor. What goes wrong?',
        opts: [
          { t: 'Nothing: the file is on disk', fb: 'Each task runs in its own pod, with its own disk.' },
          { t: 'The second task runs in another pod and does not find the file', fb: '' },
          { t: 'Airflow copies the file automatically', fb: 'It does not.' },
          { t: 'The first task is retried until the file appears', fb: 'It succeeded, so it is not retried.' }
        ],
        ok: 1, why: 'The best practices guide says that you should not store files or configuration on the local filesystem, because the downstream task is likely to run on a different server. Write to shared storage and pass the path.'
      }),

      B.quiz({
        id: 'm13-q4', t: 1,
        q: 'Which top-level line costs the most at every parse?',
        opts: [
          { t: '`import pendulum`', fb: 'An import is cached after the first time.' },
          { t: '`REGION = Variable.get("brewline_region")`', fb: '' },
          { t: '`with DAG(...) as dag:`', fb: 'Defining the DAG is the job of the file.' },
          { t: 'A task decorated with `@task`', fb: 'Defining a task is cheap.' }
        ],
        ok: 1, why: 'The documentation says that `Variable.get()` at the top level makes a request every time the DAG file is parsed unless caching is enabled, and can make the file time out. Use a Jinja template or read it inside the task.'
      }),

      B.quiz({
        id: 'm13-q5', t: 1,
        q: 'A report task wraps its work in `try: ... except Exception: print("could not send")`. The mail server is down. What does Airflow show?',
        opts: [
          { t: 'A failed task, with retries', fb: 'The error was swallowed, so the task did not fail.' },
          { t: 'A successful task: the error never reached Airflow', fb: '' },
          { t: 'A skipped task', fb: 'It ran to the end.' },
          { t: 'An import error', fb: 'The file is fine.' }
        ],
        ok: 1, why: 'Airflow knows only what the task reports. A swallowed exception is a success, so the retries never happen and nobody is alerted. Let the error out.'
      }),

      B.quiz({
        id: 'm13-q6', t: 2,
        q: 'Which is the best way to build 3,000 similar exports?',
        opts: [
          { t: 'A file that queries the customer table at parse time and creates a DAG for each row', fb: 'A query at parse time, and 3,000 DAGs to parse and store.' },
          { t: 'One DAG that lists batches of customers in a task and maps over the batches', fb: '' },
          { t: '3,000 hand-written DAG files', fb: 'It does not scale and nobody maintains it.' },
          { t: 'One task with a loop over all customers in one process', fb: 'A failure at customer 2,900 repeats everything, and the log is one block.' }
        ],
        ok: 1, why: 'Mapping makes the copies when the run happens, in a task, once a day, not at every parse. Batching keeps the number of task instances low: 3,000 customers in batches of 100 are 30 copies.'
      }),

      B.quiz({
        id: 'm13-q7', t: 2,
        q: 'Two tasks need two incompatible versions of one library. What is the lightest isolation?',
        opts: [
          { t: 'A `PythonVirtualenvOperator`', fb: '' },
          { t: 'A second Airflow cluster', fb: 'It is the heaviest answer.' },
          { t: 'Install both versions in the same environment', fb: 'A Python environment holds one version of a package.' },
          { t: 'Rewrite the library', fb: 'It does not solve the dependency conflict.' }
        ],
        ok: 0, why: 'The guide lists the virtualenv operator first: it builds an environment for the task. Containers and pods isolate more, at a higher cost in understanding and setup.'
      }),

      B.quiz({
        id: 'm13-q8', t: 2,
        q: 'A DAG file reads a JSON file of table names from the DAG folder and creates one DAG for each table. Is that acceptable?',
        opts: [
          { t: 'Yes: the metadata is a file in the DAG folder, which the guide lists as a way to generate DAGs', fb: '' },
          { t: 'No: DAGs must be written by hand', fb: 'The guide describes dynamic generation.' },
          { t: 'No: reading a file is as slow as a database', fb: 'A small local file is cheap. The danger is a slow call.' },
          { t: 'Yes, but only with a database', fb: 'The guide prefers files and environment variables.' }
        ],
        ok: 0, why: 'The documentation names three ways to configure dynamic DAGs: environment variables, generated Python code in the DAG folder, and a generated configuration file in the DAG folder. Keep the work small, and avoid live calls at parse time.'
      }),

      B.bug({
        id: 'm13-bug1', t: 1, q: 'On the KubernetesExecutor this DAG fails in `load` with "No such file or directory". Click a line that causes it.',
        file: 'brewline_export.py', lang: 'python', code: LOCAL_BUG, bad: [G.at(LOCAL_BUG, /with open\("\/tmp\/orders.csv", "w"\)/), G.at(LOCAL_BUG, /with open\("\/tmp\/orders.csv"\) as f/)],
        hint: 'Where does each task run, and where is its /tmp?',
        why: 'Each task can run on a different machine or in its own pod, with its own disk. The file that the first task wrote is not there for the second. Write to storage that every worker can reach, build the name from the run, and pass the path through XCom.',
        fix: LOCAL_FIX,
        cheer: 'A file on a local disk is a note in a room that you do not return to.'
      }),

      B.bug({
        id: 'm13-bug2', t: 2, q: 'The DAG processor needs a long time for this file, and sometimes it times out. Click the line that costs on every parse.',
        file: 'brewline_region_load.py', lang: 'python', code: VARTOP_BUG, bad: [G.at(VARTOP_BUG, /REGION = Variable\.get/)],
        hint: 'How often is the top level of a file executed?',
        why: '`Variable.get()` at the top level asks the database or the secrets backend on every parse of the file. With many files that is a lot of requests, and a slow backend can time the parse out. Read the variable inside the task, or pass it with a Jinja template such as `{{ var.value.brewline_region }}`, which waits until the task runs.',
        fix: VARTOP_FIX,
        cheer: 'Ask for a variable when you need it, not when the file is read.'
      }),

      B.bug({
        id: 'm13-bug3', t: 1, q: 'The mail server was down all night, yet the DAG is green and nobody got the report. Click the line that hides the failure.',
        file: 'brewline_report.py', lang: 'python', code: SWALLOW_BUG, bad: [G.at(SWALLOW_BUG, /except Exception/)],
        hint: 'What does Airflow see when the exception is caught?',
        why: 'The `except Exception` catches the error and prints a message, so the task ends normally. Airflow records a success, never retries and never alerts. Let the error leave the task: the task fails, the retries run, and the failure alert fires.',
        fix: SWALLOW_FIX,
        cheer: 'A task that swallows errors turns every failure into a quiet success.'
      }),

      B.bug({
        id: 'm13-bug4', t: 2, q: 'This task waits for a partner file with `sleep`. Some nights it holds a worker slot for two hours and some nights the file is later. Click the line that causes it.',
        file: 'brewline_partner_load.py', lang: 'python', code: SLEEP_BUG, bad: [G.at(SLEEP_BUG, /time\.sleep/)],
        hint: 'What is the right task for waiting?',
        why: 'A sleep inside a task holds a slot for its whole length and waits for a fixed time, whether or not the file is there. A sensor waits for the condition, and a deferrable sensor holds no slot while it waits. Set a timeout so that a missing file fails after a limit.',
        fix: SLEEP_FIX,
        cheer: 'Wait for the condition, not for a time.'
      }),

      B.bug({
        id: 'm13-bug5', t: 2, q: 'This file creates one DAG for each of about 3,000 customers, from a query that runs at parse time. The DAG list is slow and the DAG processor is busy all day. Click a line that causes it.',
        file: 'export_dags.py', lang: 'python', code: DBGEN_BUG, bad: [G.at(DBGEN_BUG, /CUSTOMERS = /), G.at(DBGEN_BUG, /con = sqlite3/)],
        hint: 'What runs on every parse, and how many DAGs come out?',
        why: 'The query runs every time the file is parsed, and it creates 3,000 DAGs that the processor must serialize and the scheduler must track. One DAG that maps over batches of customers does the same work with one DAG, and the list is read once a day, inside a task.',
        fix: DBGEN_FIX,
        cheer: 'Make the copies when the run happens, not when the file is read.'
      }),

      B.order({
        id: 'm13-ord', t: 1, q: 'Put the questions of a design review of a new DAG in order.',
        items: [
          'Who owns the DAG, what are its tags, and what is its schedule and start date?',
          'Is every task idempotent, and does it use the run date instead of the clock?',
          'Do tasks that call outside have retries, a backoff and a timeout, and do waits use deferrable sensors?',
          'Does data move through storage, with only paths and small values in XCom?',
          'Are secrets in connections, and is the top level cheap?',
          'Are there self-checks, an alert on failure, a watcher if the DAG ends in a cleanup, and tests in CI?'
        ],
        why: 'The first questions are about identity and correctness of the repeat, which decide whether the rest is safe. Limits, data and secrets come next. Observability and tests come last, because they depend on the shape that the earlier answers gave.'
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: one DAG for each franchise store, or one DAG for all?',
        scenario: 'Brewline has 2,000 franchise stores. Each night, every store\'s orders are exported to the store\'s own bucket. The stores have the same logic. A few stores want their export at another hour. New stores open every week. How do you build it?',
        opts: [
          { t: 'A generated DAG for each store, from a query of the store table at parse time', d: 'Each store can have its own schedule, and the UI shows one DAG for each.', lose: '2,000 DAGs to parse, store and track. A query that runs on every parse, and a new store appears only after the next parse. One slow store call at the top blocks the file.' },
          { t: 'One DAG that lists batches of stores in a task and maps over the batches, plus a few separate DAGs for the stores with their own hour', d: 'The list is read once a night, the copies are made when the run happens, and a new store is picked up without a code change.' },
          { t: 'One task with a loop over the 2,000 stores', d: 'The simplest code.', lose: 'A failure at store 1,800 repeats everything, the log is one block, and you cannot retry one store.' }
        ],
        pick: 1,
        why: 'The work is the same for every store, so mapping fits. A batch keeps the number of task instances low. The few exceptions get their own DAGs, which are few and static.',
        when: 'Choose a generated DAG for each store only when stores have different logic or owners, and generate the files from a static list at build time.'
      }),

      B.incident({
        id: 'm13-inc', t: 2, src: 'rec', title: 'Incident: the dashboard is green and the table is empty', time: '08:15',
        alert: '**The run dashboard shows last night\'s `brewline_nightly` as success. The revenue table for yesterday is empty. The data team asks why nobody was alerted.** The DAG ends with a `cleanup` task that has `trigger_rule="all_done"`.',
        clues: ['The task `quality_checks` failed at 02:40 after its retries', '`publish` was `upstream_failed`', 'The recorded teardown DAG had the same shape: failed check, upstream_failed publish, successful cleanup, and a run that ended as success'],
        opts: [
          { t: 'Add a watcher task with `one_failed` that is a child of every task, and alert on failed task instances as well as on failed runs', fb: '' },
          { t: 'Remove the cleanup task', fb: 'The temporary files would stay, and the next failure hides in another way.' },
          { t: 'Add retries to the cleanup', fb: 'The cleanup succeeded. The problem is the state of the run.' },
          { t: 'Change the dashboard colours', fb: 'The data says success. The data is the problem.' }
        ],
        best: 0,
        why: 'The state of the run follows its last tasks, so a successful teardown makes a failed pipeline look green. The recording shows exactly this, and the documentation names the watcher pattern as the fix. The watcher fails when any task fails, and the run fails with it.',
        checks: [
          ['Find the hole', 'Look at the leaf tasks of the DAG. If a cleanup with `all_done` is one of them, the run state follows it.'],
          ['Fix', 'Add the watcher as a direct child of every task. It is skipped when everything passes and fails when anything fails.'],
          ['Alert on tasks', 'Alert on failed task instances as well as runs, so that a masked failure still pages somebody.']
        ],
        tell: 'The cleanup was the last task and it succeeded, so the run was green although the checks failed. I added a watcher task as a child of every task and an alert on failed task instances.',
        prevent: ['Add a **review question** for every DAG that ends in a cleanup: what is the state of the run when a task fails?', 'Make a **watcher** a child of every task that matters', 'Alert on **failed task instances** and on the state of the run']
      }),

      B.talk({
        id: 'm13-ext', t: 3, src: 'docs', title: 'Extra: more patterns from the guide',
        say: 'Press Next. Three more things that the best practices guide covers.',
        items: [
          ['Wait for the system after a change', 'After you change DAG files, give the system time before you trigger. The files must reach the DAG processor, the processor must parse them and store the DAGs. The guide says that this can take seconds to many minutes, and that you should wait for the DAG to appear in the UI. The settings that matter are `refresh_interval`, `min_file_process_interval` and `parsing_processes`.', 'Do not trigger a DAG that you just pushed.'],
          ['An integration DAG for upgrades', 'Before an upgrade the guide suggests a staging environment, a backup of the database, disabling the scheduler, an "integration test" DAG that runs a small slice of real work, and pruning old data to make the migration faster. Mission 11 had the same steps.', 'A rehearsal with real DAGs.'],
          ['Cluster policies', 'A cluster policy lets the platform team enforce rules on every DAG, for example by skipping DAGs that break a rule, with an exception that the guide describes. It is the platform-side partner of the integrity tests of mission 10.', 'Rules for all DAGs, in one place.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-antipatterns', t: 1, tag: 'Airflow', secs: 90,
        q: 'What are the most common mistakes that you see in Airflow DAGs?',
        pts: ['Heavy or slow top-level code', 'Non-idempotent writes and the clock instead of the run date', 'Big data in XCom, local files between tasks, secrets in code', 'No retries, timeouts or alerts; sensors that hold slots'],
        short: 'I group them. The first group is the top level of the file: work at import time, such as a variable lookup or an API call, runs on every parse. The second is repeatability: a plain insert that duplicates on retry, or a task that reads the clock instead of the run date, so a rerun loads the wrong day.\n\nThe third is data and secrets: big values in XCom, a local file between tasks that may run on different machines, and passwords in code. The fourth is failure handling: no retries and no timeouts, a poke sensor that holds a slot for days, and an exception that is caught and swallowed, so Airflow records a success.\n\nAnd one I recorded: a cleanup task at the end with all_done can make the run succeed although a task failed. A watcher task fixes it.',
        fu: [['Which one costs the most?', 'Non-idempotent loads, because they damage data and nobody sees it at once.']],
        trap: 'Listing operators that you dislike. The costly mistakes are about repeatability and limits.',
        real: 'Pick the anti-pattern that is in your code today and say how you would remove it.'
      }),

      B.qa({
        id: 'qa-review', t: 2, tag: 'Design', secs: 90,
        q: 'How do you review a DAG that a colleague wrote?',
        pts: ['Owner, tags, schedule and start date', 'Idempotency and use of the run date', 'Retries, timeouts, sensors, pools', 'Data movement, secrets, top level, self-checks, tests'],
        short: 'I go in a fixed order. First the basics: an owner, tags, the schedule and a fixed start date, and the catchup setting. Then repeatability: is every write safe to run twice, and does every task use the run date and not the clock? That decides whether retries and backfills are safe.\n\nThen limits and failure: retries with a backoff and a timeout on every task that calls outside Airflow, a deferrable sensor with a timeout for waits, a pool for fragile systems, and a trigger rule on every join and cleanup. If the DAG ends in a cleanup I ask what state the run gets when a task fails, and I look for a watcher.\n\nThen data and secrets: only paths and small values in XCom, no local files between tasks, connections for secrets, and a cheap top level. Last, self-checks, an alert on failure, and tests in CI.',
        fu: [['What do you not review?', 'Style that a linter checks. ruff does that before I look.']],
        trap: 'Reading only the happy path. Ask what happens on the second run and on the worst night.',
        real: 'Write the first five questions of your own review checklist.'
      }),

      B.qa({
        id: 'qa-dynamic', t: 2, tag: 'Design', secs: 75,
        q: 'How do you generate DAGs dynamically, and what do you watch for?',
        pts: ['From environment variables, generated code or a config file in the DAG folder', 'No live database or API calls at parse time', 'Unique dag_ids, and keep the number of DAGs sensible', 'Consider mapping instead'],
        short: 'The Airflow guide names three sources of configuration for dynamic DAGs: environment variables, generated Python code in the DAG folder, and a generated configuration file in the DAG folder. A loop over a small static list that creates DAGs and stores them in the module globals works, and I recorded one of those: one file, three DAGs.\n\nWhat I avoid is a live call at parse time, such as a database query or an API request, because the DAG processor runs the file again and again, so the cost repeats and a slow service can time the parse out. I also keep the number of DAGs sensible, since each one has to be parsed, stored and tracked.\n\nIf the DAGs differ only by an item of a list, I prefer one DAG with dynamic task mapping over batches of items, because the list is read once per run, inside a task.',
        fu: [['How do you keep ids unique?', 'Build the dag_id from the loop variable.']],
        trap: 'A DAG for each customer, built from a query at the top of the file.',
        real: 'Say how many DAGs your team generates and from what.'
      }),

      B.qa({
        id: 'qa-watcher', t: 3, tag: 'Airflow', secs: 60,
        q: 'What is the watcher pattern, and when do you need it?',
        pts: ['A task with trigger rule one_failed that always fails', 'A direct child of every task', 'The run state follows the last tasks, so an all_done cleanup can hide a failure', 'Recorded: the run was success without it, failed with it'],
        short: 'The state of a DAG run follows its final tasks. If the last task is a cleanup with the trigger rule all_done, it runs after a failure and succeeds, and the run ends as success although an earlier task failed. I recorded exactly that: a failed check, a publish that was upstream_failed, a successful cleanup, and a run that was success.\n\nThe watcher pattern fixes it. I add a task with the rule one_failed that raises an error whenever it runs. It must be a direct child of every task that I want to watch, because trigger rules look only at direct parents. If everything passes, the watcher is skipped. If anything fails, it runs and fails, and the run fails with it. I also alert on failed task instances as well as on failed runs.',
        fu: [['Why must it be a direct child?', 'Trigger rules only look at direct parents.']],
        trap: 'Assuming that a failed task always fails the run.',
        real: 'Check one DAG of yours that ends in a cleanup, and say what state its run gets on failure.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Pattern Spotter', color: '#FBCFE8',
        pts: [
          'Treat a task like a **transaction**: complete output or none, the same outcome on every rerun, a specific partition, an upsert and not an insert.',
          'No **local files** between tasks, no **secrets** in code, no big values in XCom, and a **cheap top level**: `Variable.get()` at the top costs a request on every parse.',
          'The **state of a run follows its last tasks**. A cleanup with `all_done` at the end can turn a failed night into a green run. Add a **watcher** (`one_failed`, a child of every task) and alert on failed task instances.',
          '**Dynamic DAGs**: generate from a static source in the DAG folder, never from a live call at parse time. Prefer **mapping over batches** to thousands of DAGs.',
          '**Self-checks** guard the data. **Virtualenvs, containers and pods** isolate dependencies. Review every DAG in a fixed order.'
        ],
        lines: [
          'I can review a DAG against the habits of good pipelines.',
          'I can spot the twelve anti-patterns.',
          'I know why a green run can hide a failure.'
        ]
      })
    ]
  });
})();
