/* Mission 5: passing data. XCom, dynamic task mapping, assets, and task loops.
   The DAG files, the XCom rows, the mapped task instances, the edge cases, the stored sizes, the asset runs and the loops are recorded from Apache Airflow 3.4.0
   (airflow/verify/capture_af.py). The advice on where data should live is from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var XC = G.file('dags/brewline_xcom.py'), MAP = G.file('dags/brewline_mapping.py'), ASSETS = G.file('dags/brewline_assets.py'), LOOP = G.file('dags/brewline_loop.py');
  var ME = G.counts('af.mapping_edge'), XS = G.counts('af.xcom_size'), AS = G.counts('af.assets'), LP = G.counts('af.loops');
  G.expect(ME.empty.load_store === 'skipped' && ME.big.list_stores === 'failed' && ME.big.load_store === 'upstream_failed' && ME.big_list_length === 1100, 'the recorded edge cases of mapping');
  G.expect(XS.rows.length === 4 && XS.rows[3].stored_bytes > 10000000, 'the recorded XCom sizes');
  G.expect(AS.consumer_runs_after_3_events === 3 && AS.and_runs_after_extra_orders_event === 2, 'the recorded asset runs');
  G.expect(LP.fixed.task_instances.length === 6 && LP.until.task_instances.length === 13, 'the recorded task loops');
  var MAXMAP = G.cfg('core.max_map_length');

  var BIG_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    'def fetch_events(day):',
    '    return [{"type": "purchase", "day": day}]  # a stand-in: the real source returns about 4 million rows',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_events():',
    '    @task',
    '    def extract(ds=None):',
    '        return fetch_events(ds)',
    '',
    '    @task',
    '    def transform(events):',
    '        return [e for e in events if e["type"] == "purchase"]',
    '',
    '    transform(extract())',
    '',
    '',
    'brewline_events()'
  ].join('\n');
  var BIG_FIX = [
    'import json',
    'from pathlib import Path',
    '',
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    'STAGING = Path("/data/staging")',
    '',
    '',
    'def fetch_events(day):',
    '    return [{"type": "purchase", "day": day}]  # a stand-in: the real source returns about 4 million rows',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_events():',
    '    @task',
    '    def extract(ds=None):',
    '        path = STAGING / f"events_{ds}.jsonl"',
    '        path.parent.mkdir(parents=True, exist_ok=True)',
    '        path.write_text("\\n".join(json.dumps(e) for e in fetch_events(ds)))',
    '        return str(path)  # a short string: where the data is, not the data',
    '',
    '    @task',
    '    def transform(path):',
    '        events = [json.loads(line) for line in Path(path).read_text().splitlines()]',
    '        return len([e for e in events if e["type"] == "purchase"])',
    '',
    '    transform(extract())',
    '',
    '',
    'brewline_events()'
  ].join('\n');
  var MAPBUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    'def list_keys(prefix):',
    '    return [f"{prefix}part-{n:05d}.csv" for n in range(40000)]',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_files():',
    '    @task',
    '    def list_files():',
    '        return list_keys("raw/orders/")',
    '',
    '    @task',
    '    def load_file(key):',
    '        print("loading", key)',
    '',
    '    load_file.expand(key=list_files())',
    '',
    '',
    'brewline_files()'
  ].join('\n');
  var MAPFIX = MAPBUG.replace('    @task\n    def list_files():\n        return list_keys("raw/orders/")\n\n    @task\n    def load_file(key):\n        print("loading", key)\n\n    load_file.expand(key=list_files())',
    '    @task\n    def list_batches():\n        keys = list_keys("raw/orders/")\n        return [keys[i:i + 100] for i in range(0, len(keys), 100)]\n\n    @task\n    def load_batch(keys):\n        for key in keys:\n            print("loading", key)\n\n    load_batch.expand(keys=list_batches())');

  var xs = XS.rows;
  function sizeRows() { return xs.map(function (r) { return [r.task.replace(/^return_/, '').replace('_', ' ').toUpperCase(), r.stored_bytes.toLocaleString('en-US') + ' bytes', r.state]; }); }

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Passing data: XCom, mapping and assets', short: 'Data', blurb: 'Pass small values with XCom, fan out with mapping, and start DAGs from assets', minutes: 70,
    focus: ['ing'],
    goals: [
      'Pass a value between tasks with **XCom**, and say what must **not** go through it.',
      'Fan a task out with **dynamic task mapping**, and know its edge cases: the empty list and `max_map_length`.',
      'Schedule a DAG on an **asset**, and say when a consumer runs for one event and when for several.',
      'Choose between XCom, storage, assets and parameters for a piece of data.',
      'Recognise a **task loop**, the 3.4 way to repeat a group of tasks.'
    ],
    say: 'Mission 5 is how data moves around a DAG. Tasks run on different workers, so a variable in one task is gone in the next. I ran an XCom DAG, a mapped DAG with five stores, the two edge cases of mapping, four XComs of growing size, two producer and two consumer DAGs for assets, and the new task loops. Everything quoted is real output.',
    scenes: [
      B.talk({
        id: 'm5-talk', t: 1, src: 'docs', title: 'Three ways to move data between tasks',
        say: 'Press Next for each. Pick the way by how big the data is and by what the next task needs.',
        items: [
          ['XCom: small values through the database', 'A task\'s return value is stored by Airflow as an **XCom** ("cross-communication") in the metadata database. The next task reads it. XCom is for **small** things: a count, a path, a date, a status, a short list of ids.', 'A note passed between tasks.'],
          ['Storage: the data itself', 'The real data lives in a file, an object store, a table or a queue. One task writes it and the next reads it. What you pass between the tasks is the **location**.', 'Pass the address, not the parcel.'],
          ['Assets: an event that says data changed', 'A task says that it updated an **asset**, a named piece of data such as a table or a file. A DAG that schedules on that asset runs when it is updated. It carries no data. It carries the news.', 'A signal between DAGs.'],
          ['Mapping: one task, many copies', 'When a list is only known at run time, **dynamic task mapping** creates one task instance for each item. The list itself travels as an XCom, so it must be small too.', 'Fan out over a list.'],
          ['The rule', 'Small and short-lived goes through XCom. Anything big goes to storage, and the path goes through XCom. Work that must start when somebody else\'s data changes goes through assets.', 'Pointers, not data.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-code-xcom', t: 1, src: 'rec', title: 'XCom in a DAG: returns, keys and pulls', file: 'brewline_xcom.py', lang: 'python', code: XC,
        steps: [
          { say: 'This file shows the three ways to put a value into XCom and read it back. I ran it and read the rows from the database on the next screen.', lines: null },
          { say: 'A task that **returns** a value pushes it as an XCom with the key `return_value`. Here `count_orders` returns the number 3.', lines: G.span(XC, /def count_orders/, /return 3/) },
          { say: 'With `multiple_outputs=True`, a returned dictionary is stored once as a whole **and** once for each key. Downstream tasks can then read `summary["revenue"]` as one value.', lines: G.span(XC, /multiple_outputs=True/, /return \{/) },
          { say: 'A task can push any key by hand with `ti.xcom_push`. The value is stored under that key.', lines: G.span(XC, /def push_extra/, /xcom_push/) },
          { say: 'And it can pull by task id and key with `ti.xcom_pull`. This is the manual way. TaskFlow does the same when you pass a returned value as an argument.', lines: G.span(XC, /def report/, /print\(f/) },
          { say: 'The last lines pass `n` and `s` as arguments, which creates the arrows from `count_orders` and `summarize`. `<< p` makes `report` wait for `push_extra`, because a manual pull has no argument to create the arrow.', lines: G.span(XC, /n = count_orders/, /report\(n, s\)/) }
        ],
        note: 'A manual `xcom_pull` does not create a dependency. If `push_extra` has no arrow to `report`, `report` can run first and find nothing.'
      }),

      B.rows({
        id: 'm5-rows-xcom', t: 1, src: 'rec', title: 'What the database held',
        steps: [
          {
            say: 'After one run of that DAG, these were the rows of the XCom table. Each has the task that wrote it, the key and the value.',
            tabs: [{
              layer: 'XCOM', name: 'Rows after one run', c: 'raw',
              cols: G.table('af.xcom').cols,
              rows: G.table('af.xcom').rows,
              trk: 0
            }],
            notes: ['`summarize` wrote three rows: its `return_value` as a whole, and `orders` and `revenue` because of `multiple_outputs`. `push_extra` wrote the key that it chose. The values are stored as JSON text, which is why a value must be JSON-friendly with the default backend.']
          }
        ]
      }),

      B.widget({ id: 'm5-w-fanout', kind: 'fanout', t: 1, src: 'rec', title: 'Lab: mapped tasks and the size of an XCom' }),

      B.code({
        id: 'm5-code-map', t: 1, src: 'rec', title: 'Dynamic task mapping: one task, one copy for each store', file: 'brewline_mapping.py', lang: 'python', code: MAP,
        steps: [
          { say: 'Brewline has five stores, and tomorrow there may be six. Mapping lets the DAG create one task instance for each store **when the run happens**.', lines: null },
          { say: '`list_stores` returns a list. This is the data that decides how many copies there will be.', lines: G.span(MAP, /def list_stores/, /return \[/) },
          { say: '`load_store` is written once, for one store. It takes `store`, the item, and `region`, a value that is the same for every copy.', lines: G.span(MAP, /def load_store/, /return \{/) },
          { say: '`summarize` receives the results of all the copies. It arrives as a lazy sequence, so `list(results)` reads them.', lines: G.span(MAP, /def summarize/, /print\(f"loaded/) },
          { say: '`partial(region="sg")` fixes the arguments that do not change. `.expand(store=list_stores())` says: make one task instance for each item of that list. Airflow decides the number when `list_stores` has finished.', lines: G.span(MAP, /summarize\(load_store/, /summarize\(load_store/) }
        ],
        note: 'Only keyword arguments go to `partial()` and `expand()`. For a classic operator you map the same way: `Operator.partial(task_id=...).expand(...)`.'
      }),

      B.flow({
        id: 'm5-flow-map', t: 1, src: 'rec', title: 'What happens at run time', g: 'mapping', legend: true,
        steps: [
          { say: 'The DAG has three tasks: the list, the mapped load, and the summary. At this point the load task has **no copies**: Airflow does not know the length of the list yet. Press Next to follow a run.', cap: 'The graph shows one box for the mapped task.' },
          { say: 'Step 1. `list_stores` runs and returns five ids. The recording shows its XCom: `' + G.table('af.mapping_xcom').rows[0][3] + '`.', status: { list: 'run' }, focus: ['list'], cap: 'The list is an XCom.' },
          { say: 'Step 2. The scheduler reads the list and creates **five task instances** of `load_store`, with `map_index` 0 to 4. The recording has exactly these rows: `load_store` with map index ' + G.table('af.mapping_ti').rows.filter(function (r) { return r[0] === 'load_store'; }).map(function (r) { return r[1]; }).join(', ') + '.', on: ['a0', 'a1', 'a2', 'a3', 'a4'], status: { list: 'ok', m0: 'run', m1: 'run', m2: 'run', m3: 'run', m4: 'run' }, focus: ['list', 'm0', 'm1', 'm2', 'm3', 'm4'], cap: 'One copy for each item.' },
          { say: 'Step 3. Each copy runs by itself. If one failed, as shown here for illustration because the recorded run had no failure, it would be retried without the others. Pools and limits (mission 8) decide how many run at once.', status: { list: 'ok', m0: 'ok', m1: 'ok', m2: 'fail', m3: 'ok', m4: 'retry' }, focus: ['m0', 'm1', 'm2', 'm3', 'm4'], cap: 'Failures are per copy.' },
          { say: 'Step 4. `summarize` waits for all the copies. With the default trigger rule, a failed copy stops it. It then receives the five results in order.', on: ['b0', 'b1', 'b2', 'b3', 'b4'], status: { list: 'ok', m0: 'ok', m1: 'ok', m2: 'ok', m3: 'ok', m4: 'ok', sum: 'run' }, focus: ['sum'], tags: ['tg_expand'], cap: 'The results come back as one lazy list.' }
        ]
      }),

      B.rows({
        id: 'm5-rows-map', t: 1, src: 'rec', title: 'The mapped run in the database',
        steps: [
          {
            say: 'These are the task instances and the XCom values of the recorded run. A task that is not mapped has `map_index` -1.',
            tabs: [
              { layer: 'TASK INSTANCES', name: 'One row for each copy', c: 'raw', cols: G.table('af.mapping_ti').cols, rows: G.table('af.mapping_ti').rows, trk: 0 },
              { layer: 'XCOM', name: 'One value for each copy', c: 'raw', cols: G.table('af.mapping_xcom').cols, rows: G.table('af.mapping_xcom').rows, trk: 0 }
            ],
            notes: ['Each copy has its own try number, state, log and XCom. The `load_store` values show `orders` of 50 for every store: the task multiplies the length of the store name by 10. The numbers are made up for the demonstration.']
          }
        ]
      }),

      B.cmp({
        id: 'm5-edge', t: 1, src: 'rec', title: 'Two edge cases of mapping, run for real',
        say: 'Two things go wrong in real pipelines: the list is empty, or the list is long. Press Next. I ran both, and the states below are what Airflow 3.4.0 recorded.',
        cols: ['The list is', 'The task that returns it', 'The mapped task', 'A task after it with `all_done`'],
        hl: 2,
        rows: [
          ['Empty: `[]`', ME.empty.list_stores, ME.empty.load_store, ME.empty.summarize],
          ['' + ME.big_list_length.toLocaleString('en-US') + ' items, above `max_map_length` (' + MAXMAP + ')', ME.big.list_stores, ME.big.load_store, 'not part of the test']
        ],
        steps: [
          { upto: 1, say: 'An **empty list** creates no copies. The mapped task is **skipped**, not failed. A task after it that must run anyway needs a trigger rule such as `all_done`. A task with the default rule would be skipped too.' },
          { upto: 2, say: 'A list above `max_map_length` makes the task that **returns** it fail, with this error: `' + ME.big_error + '`. The mapped task then has no upstream and is `upstream_failed`. The limit protects the scheduler. Group the items into batches instead (the bug screen shows how).' }
        ]
      }),

      B.code({
        id: 'm5-code-assets', t: 1, src: 'rec', title: 'Assets: producers and consumers', file: 'brewline_assets.py', lang: 'python', code: ASSETS,
        steps: [
          { say: 'This file has four DAGs. Two **land** data and say so. Two **consume** the assets. I ran all four on a real scheduler.', lines: null },
          { say: 'An **asset** has a name and a URI. The URI is a label, and Airflow does not open it. Here `orders_raw` stands for the raw orders in the lake.', lines: G.span(ASSETS, /^orders_raw = /, /^customers_raw = /) },
          { say: 'A producer says which asset it updated with `outlets=[...]` on the task. When the task succeeds, Airflow records an **asset event**.', lines: G.span(ASSETS, /outlets=\[orders_raw\]/, /print\("landed the orders/) },
          { say: 'A consumer schedules on an asset: `schedule=[orders_raw]`. It has no cron string. It runs when the asset is updated. Inside, `triggering_asset_events` says which events started the run.', lines: G.span(ASSETS, /dag_id="brewline_orders_daily"/, /print\(f"triggered by/) },
          { say: 'A consumer with two assets in the list waits until **both** have an update, then runs once.', lines: G.span(ASSETS, /dag_id="brewline_customer_orders"/, /print\(f"triggered by/) }
        ]
      }),

      B.flow({
        id: 'm5-flow-assets', t: 1, src: 'rec', title: 'How an update becomes a run', g: 'assets', legend: false,
        steps: [
          { say: 'Two producers, two assets, two consumers. This is the setup of the recording. Press Next to follow the events.', cap: 'Producers write, consumers react.' },
          { say: 'Step 1. A producer task succeeds. Airflow records an event for the asset in its `outlets`.', on: ['e1', 'e2'], focus: ['p_orders', 'a_orders', 'p_cust', 'a_cust'], cap: 'An event is a row in the database.' },
          { say: 'Step 2. The consumer of `orders_raw` has one asset. In Airflow 3.4 it gets **one run for each event**: ' + AS.producer_runs + ' updates of `orders_raw` made ' + AS.consumer_runs_after_3_events + ' runs, and each run took exactly one event.', on: ['e3'], focus: ['a_orders', 'c_daily'], tags: ['tg_each'], cap: 'One event, one run.' },
          { say: 'Step 3. The second consumer lists two assets. It **waits** until each of them has an update, and then runs once and takes the queued events together. It had ' + AS.and_consumer_runs_before + ' runs after the three orders updates, and ' + AS.and_consumer_runs_after + ' after the first customers update.', on: ['e4', 'e5'], focus: ['a_orders', 'a_cust', 'c_both'], tags: ['tg_both'], cap: 'An AND of assets batches the events.' }
        ]
      }),

      B.widget({ id: 'm5-w-assets', kind: 'assets', t: 1, src: 'rec', title: 'Lab: which updates start which consumer' }),

      B.cmp({
        id: 'm5-cmp', t: 2, src: 'docs', title: 'Where should the data live?',
        say: 'A decision table for the four places that engineers use. Press Next to read it. Most mistakes in this mission come from putting data in the wrong one.',
        cols: ['Mechanism', 'Good for', 'Limit', 'Example'],
        hl: 1,
        rows: [
          ['XCom', 'A small value for the next task of the same run.', 'It lives in the metadata database. Large values and many XComs slow the database.', 'A row count, a file path, a batch id.'],
          ['Storage (file, table, object store)', 'The data itself, of any size.', 'You manage names, cleanup and permissions.', 'A Parquet file per run, a staging table.'],
          ['Asset', 'Starting a DAG when data that it needs was updated.', 'It carries no data and no values.', '`orders_raw` was loaded.'],
          ['Params or `dag_run.conf`', 'A value that a person or a trigger chooses for one run.', 'A manual run only. It is not computed.', 'A region or a date for a backfill.'],
          ['Variable', 'A setting that many DAGs share and that changes rarely.', 'A database or secrets lookup on use. Not for run-specific values.', 'A threshold, a feature switch.']
        ],
        steps: [
          { upto: 3, say: 'XCom, storage and assets answer three different questions: "what does the next task need", "where is the data", and "when did it change".' },
          { upto: 5, say: 'Params and variables are inputs from people. Neither one is a place to hand data from task to task.' }
        ]
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A task returns the number 3. Where does Airflow store it by default, and under which key?',
        opts: [
          { t: 'In the metadata database, as an XCom with the key `return_value`', fb: '' },
          { t: 'In the scheduler\'s memory', fb: 'Tasks run on workers, and memory does not survive the task.' },
          { t: 'In a file on the worker', fb: 'The next task may run on another machine.' },
          { t: 'In the DAG file', fb: 'DAG files are code. A run never writes to them.' }
        ],
        ok: 0, why: 'The recorded table has `count_orders | return_value | 3`. The default XCom backend is `' + G.cfg('core.xcom_backend') + '`, which stores values in the database.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'A task returns a dictionary and has `multiple_outputs=True`. How many XCom rows does it write for `{"orders": 3, "revenue": 41.5}`?',
        opts: [
          { t: 'One, for the whole dictionary', fb: 'That is the default. This task asked for more.' },
          { t: 'Three: the dictionary as `return_value`, and one for each key', fb: '' },
          { t: 'Two, one for each key', fb: 'The whole dictionary is stored too.' },
          { t: 'None, because dictionaries are not allowed', fb: 'JSON-friendly dictionaries are fine.' }
        ],
        ok: 1, why: 'The recording shows `summarize` with the keys `orders`, `return_value` and `revenue`. The extra keys let a later task use one value without taking the whole dictionary.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'You map a task over `["SG-01", "SG-02", "SG-03", "SG-04", "SG-05"]`. How many task instances of the mapped task does Airflow create?',
        opts: [
          { t: 'One', fb: 'There is one definition and one box in the graph, but not one instance.' },
          { t: 'Five, with `map_index` 0 to 4', fb: '' },
          { t: 'Six, with a summary instance', fb: 'The summary is another task.' },
          { t: 'It depends on the pool size', fb: 'The pool limits how many run at once, not how many exist.' }
        ],
        ok: 1, why: 'The recorded run has five `load_store` rows with map index 0 to 4. They have their own state, try number and XCom.'
      }),

      B.quiz({
        id: 'm5-q4', t: 1,
        q: 'The list returned for mapping is empty. What happens to the mapped task?',
        opts: [
          { t: 'It fails', fb: 'No error occurs. There is nothing to run.' },
          { t: 'It is skipped, and a following task with the default rule is skipped too', fb: '' },
          { t: 'It runs once with no argument', fb: 'There are no items to run for.' },
          { t: 'Airflow retries the list task', fb: 'The list task succeeded with an empty result.' }
        ],
        ok: 1, why: 'The recording shows the mapped task as `' + ME.empty.load_store + '`. A task with `trigger_rule="all_done"` after it still ran (`' + ME.empty.summarize + '`). Decide what an empty day means for your pipeline.'
      }),

      B.quiz({
        id: 'm5-q5', t: 2,
        q: 'You map a task over a list of 1,100 items. What did Airflow 3.4.0 do with the default `max_map_length`?',
        opts: [
          { t: 'It created 1,100 copies', fb: 'The default limit is ' + MAXMAP + '.' },
          { t: 'The task that returned the list failed, and the mapped task became upstream_failed', fb: '' },
          { t: 'It created the first ' + MAXMAP + ' copies and ignored the rest', fb: 'Silently ignoring items would lose data. Airflow fails instead.' },
          { t: 'It split the list into batches', fb: 'Airflow does not group items for you.' }
        ],
        ok: 1, why: 'The recording shows `' + ME.big.list_stores + '` for the list task, with the reason `unmappable_return_value_length`, and `' + ME.big.load_store + '` for the mapped task. Batch the items so that each copy takes a group.'
      }),

      B.quiz({
        id: 'm5-q6', t: 2,
        q: 'A consumer DAG has `schedule=[orders_raw]` and is unpaused. The producer succeeds three times. How many runs of the consumer did the recording show in Airflow 3.4.0?',
        opts: [
          { t: 'One run that took all three events', fb: 'That was the behaviour before 3.4. A single-asset schedule now makes one run for each event.' },
          { t: 'Three runs, each with one event', fb: '' },
          { t: 'Zero, until a person triggers it', fb: 'An asset update starts the run by itself.' },
          { t: 'Six, one for each of the producer\'s tasks', fb: 'The count follows asset events.' }
        ],
        ok: 1, why: 'The recording: ' + AS.consumer_runs_after_3_events + ' runs of type `' + AS.consumer_run_types[0] + '`, each log saying "1 event(s)". The release notes of 3.4 say that single-asset schedules and OR expressions create one run for each event, and that schedules which need several events keep batching.'
      }),

      B.quiz({
        id: 'm5-q7', t: 2,
        q: 'The consumer of `[orders_raw, customers_raw]` has had one run. Then only `customers_raw` is updated. What did the recording show?',
        opts: [
          { t: 'No new run: it needs an update of both assets since the last run', fb: '' },
          { t: 'A new run, because customers_raw changed', fb: 'The condition needs both.' },
          { t: 'Two new runs', fb: 'Nothing batches to two here.' },
          { t: 'The DAG is paused automatically', fb: 'Airflow does not pause a DAG for this.' }
        ],
        ok: 0, why: 'The recorded run count stayed at ' + AS.and_runs_after_extra_customers_event + ' after the extra customers update. An orders update after it made the next run, and the log says it took one event of each: ' + AS.and_consumer_logs_all[1].replace(/\[info\].*$/, '').trim().split('\n').join('; ') + '.'
      }),

      B.quiz({
        id: 'm5-q8', t: 2,
        q: 'Which of these is a good use of `dag_run.conf` or params?',
        opts: [
          { t: 'Passing the 2 GB result of one task to the next', fb: 'Params are inputs for the run, not a data channel.' },
          { t: 'Letting a person pick the region for a manual backfill', fb: '' },
          { t: 'Storing the count of rows of the last run', fb: 'That is a result. A task returns it as an XCom or writes it to a table.' },
          { t: 'Holding a password', fb: 'Use a connection or a secrets backend (mission 9).' }
        ],
        ok: 1, why: 'Params and `dag_run.conf` are the way to give a manual run its inputs. Results go through XCom or storage.'
      }),

      B.bug({
        id: 'm5-bug1', t: 1, q: 'This DAG moves about 4 million events from `extract` to `transform`. The metadata database fills up and the task is slow. Click the line that is wrong.',
        file: 'brewline_events.py', lang: 'python', code: BIG_BUG, bad: [G.at(BIG_BUG, /return fetch_events\(ds\)/)],
        hint: 'What does a return value turn into?',
        why: 'The returned list is stored as an XCom, so the database receives four million rows of JSON, and the next task downloads them through the API server. Write the data to storage and return only its location.',
        fix: BIG_FIX,
        cheer: 'XCom carries addresses, not parcels.'
      }),

      B.bug({
        id: 'm5-bug2', t: 2, q: 'The list has 40,000 files. The DAG fails with an error about mapping. Click the line that is wrong.',
        file: 'brewline_files.py', lang: 'python', code: MAPBUG, bad: [G.at(MAPBUG, /load_file\.expand/)],
        hint: 'How many task instances does that make, and what is the default limit?',
        why: 'One copy for each of 40,000 keys is far above `max_map_length` (' + MAXMAP + '), and it would be 40,000 task instances of a job that takes a second. Group the keys into batches of 100 and map over the batches: 400 copies, each one a loop over 100 keys.',
        fix: MAPFIX,
        cheer: 'Map over groups when each item is cheap.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the life of a mapped task in order.',
        items: [
          'The task that returns the list runs and succeeds',
          'The scheduler reads the list and creates one task instance for each item',
          'The copies run, each with its own `map_index`, state and log',
          'A failed copy is retried without touching the others',
          'When all copies have finished, the task after them runs and gets the results'
        ],
        why: 'The number of copies is known only after the list task has run. Each copy is a full task instance with its own retries. The task after the group waits for all of them.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: how do you pass 3 GB from extract to transform?',
        scenario: '`extract` pulls about 3 GB of order events. `transform` runs on another worker, maybe on another machine. The two tasks run an hour apart on a bad night, because of retries. What do you pass between them?',
        opts: [
          { t: 'Return the data from `extract` and take it as an argument of `transform`', d: 'It reads like normal Python. TaskFlow does the rest.', lose: 'The 3 GB goes into the metadata database and out again through the API server. The database grows, the UI slows, and one large row can fail the task.' },
          { t: 'Write the data to object storage or a staging table, and pass the path or the table name', d: 'The database stores a few bytes. Any worker can read it, an hour later too.' },
          { t: 'Write a file to the local disk of the first worker', d: 'It is simple and fast.', lose: 'The second task may run on another machine, and the disk is gone after a pod restart. A retry hour later finds nothing.' }
        ],
        pick: 1,
        why: 'Storage is built for data and survives restarts. The XCom carries the location, and you control cleanup with a lifecycle rule or a task.',
        when: 'A custom XCom backend that stores values in object storage gives the same result with TaskFlow ergonomics. The Airflow documentation describes an object storage backend. It adds a moving part, so use it when many tasks need it.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'docs', title: 'Incident: the metadata database is 40 times bigger', time: '14:10',
        alert: '**The metadata database grew from 8 GB to 320 GB in two months and the UI takes ten seconds to open a DAG. The `xcom_v2` table is the largest one.** Nobody changed the scheduler or the number of DAGs.',
        clues: ['A new DAG returns a list of 4 million rows from a task', 'That DAG runs hourly', 'Nothing deletes old XCom rows'],
        opts: [
          { t: 'Make the tasks write the data to storage and return only a path, and clean old XComs and old runs with the supported cleanup command', fb: '' },
          { t: 'Add more memory to the database server', fb: 'It hides the growth for a while. The table keeps growing and every query reads more.' },
          { t: 'Drop the XCom table', fb: 'Running DAGs lose the values they depend on.' },
          { t: 'Set `retries=0` on the DAG', fb: 'Retries are not the cause.' }
        ],
        best: 0,
        why: 'The values that tasks return become rows. Large and frequent returns make the table the biggest in the database. The recording stored a 10 MB value in one row, and the database accepted it, which is exactly why this goes unnoticed. Move the data out and clean up.',
        checks: [
          ['Find the writers', 'Sum the size of the values by DAG and task in the XCom table. One DAG usually explains most of it.'],
          ['Fix the tasks', 'Write to storage, pass the path. Check the DAG with a run and look at the new row sizes.'],
          ['Clean', '`airflow db clean` with a dry run first removes old rows (mission 11). Set a retention that your audit rules allow.']
        ],
        tell: 'One DAG returned millions of rows through XCom. I changed it to write to storage and return a path, cleaned the old rows with a dry run first, and added an alert on the size of the table.',
        prevent: ['Review **return values** in code review: a task returns a small fact, not the data', 'Alert on the **growth of the XCom table**', 'Pass a **path or a key** to the data']
      }),

      B.talk({
        id: 'm5-ext1', t: 3, src: 'docs', title: 'Extra: more mapping tools',
        say: 'Press Next. Three things that you will need once a DAG grows.',
        items: [
          ['A readable index', 'By default a mapped copy has a number. `map_index_template` renames each copy from its input in the UI, for example by its date or store, so that you can find the failed one. It is a Jinja template on the task.', 'Name the copies.'],
          ['Several arguments at once', '`expand_kwargs` takes a list of dictionaries and gives each copy a full set of arguments, when the items are not a simple list of one value.', 'Map over bundles of arguments.'],
          ['Zip and cross product', 'Several arguments in one `expand` make every combination. To pair them item by item, zip them first.', 'Know which one you wrote.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-ext2', t: 3, src: 'rec', title: 'Extra: task loops, new in Airflow 3.4', file: 'brewline_loop.py', lang: 'python', code: LOOP,
        steps: [
          { say: 'A **task loop** repeats a group of tasks. The number of repeats can be decided at run time. The loop is new in Airflow 3.4.0. I ran both DAGs in this file.', lines: null },
          { say: 'The body is a **task group**, and `.loop(max_iterations=3)` repeats it three times, one after another. Each iteration gets a `loop` object. `loop.index` counts from 1, and `loop.previous` is the result of the iteration before.', lines: G.span(LOOP, /^def loop_fixed/, /accumulate\.loop/) },
          { say: 'The recorded log of the fixed loop: `' + G.text('af.loop_fixed').split('\n').filter(function (l) { return /iteration/.test(l); }).join('`, `') + '`. The database has the copies as task instances with map index 1 to 3, plus one **gate** task for each iteration.', lines: G.span(LOOP, /^def loop_fixed/, /accumulate\.loop/) },
          { say: 'The second loop runs **until a condition is met**. The `until` function reads the result of the iteration and returns a `LoopDecision`: stop or continue. `max_iterations=10` is a cap. If the condition is never met, the gate fails.', lines: G.span(LOOP, /^    def accurate_enough/, /refine\.loop/) }
        ],
        note: 'The until loop ran ' + (LP.until.task_instances.filter(function (t) { return t.task_id === 'refine.improve'; }).length) + ' iterations before the error was small enough, and the whole DAG had ' + LP.until.task_instances.length + ' task instances. A loop runs its iterations one after another. Mapping runs its copies in parallel.'
      }),

      B.qa({
        id: 'qa-xcom', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is XCom, and what should not go through it?',
        pts: ['A value stored in the metadata database by a task, read by another', 'A return value is pushed with the key return_value', 'Small values only: counts, paths, ids', 'Large data goes to storage and the path goes through XCom'],
        short: 'XCom is how tasks pass small values to each other. When a task returns a value, Airflow stores it in the metadata database under the key `return_value`, and a downstream task reads it. A task can also push and pull other keys by hand.\n\nIt is meant for small things: a row count, a file path, a batch id, a short list. The default backend stores values in the database, so large values and a high number of XComs slow the database and the UI. In my recording the database accepted a 10 MB value, which is exactly why this goes unnoticed until the table is huge.\n\nFor real data I write to storage, such as a file, a table or an object store, and pass only the location through XCom. If I want that automatic, a custom XCom backend can store values in object storage.',
        fu: [['Does a manual xcom_pull create a dependency?', 'No. Add the arrow yourself.'], ['What is multiple_outputs?', 'It stores each key of a returned dictionary as its own XCom as well.']],
        trap: 'Saying that XCom is for passing data between tasks, full stop. It is for small values.',
        real: 'Name the largest value that a task of yours returns today, and what you would do with it.'
      }),

      B.qa({
        id: 'qa-map', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is dynamic task mapping, and when do you use it?',
        pts: ['One task definition, one task instance for each item of a list', 'The list is decided at run time', 'partial for fixed arguments, expand for the list', 'Each copy has its own retries and log; limit: max_map_length'],
        short: 'Dynamic task mapping lets a DAG create one task instance for each item of a list that is only known when the run happens. I write the task once, fix the arguments that do not change with `partial`, and use `expand` with the list. In my recording a list of five stores gave five task instances with map index 0 to 4, each with its own try number, state, log and XCom.\n\nI use it for a list that changes: stores, files, tables, customers. A failed copy is retried alone, and the task after the group gets all the results.\n\nThe edge cases matter. An empty list skips the mapped task, so the next task needs a trigger rule such as all_done. A list above max_map_length, which is 1,024 by default, makes the list task fail. And for thousands of cheap items I map over batches, not over single items.',
        fu: [['Where does the list live?', 'It is an XCom, so it must be small. Return ids, not records.']],
        trap: 'Mapping over every row of a file. Task instances have an overhead that is larger than the work.',
        real: 'Name a list in your pipeline that changes size, and say how you handle an empty day.'
      }),

      B.qa({
        id: 'qa-assets', t: 2, tag: 'Airflow 3', secs: 75,
        q: 'What are assets, and how is asset scheduling different from a time schedule?',
        pts: ['An asset is a named piece of data, with a URI that is a label', 'A producer task lists it in outlets', 'A consumer schedules on it and runs when it is updated', 'One run for each event for a single asset in 3.4; several assets batch'],
        short: 'An asset is a name for a piece of data, such as a table or a file, with a URI that Airflow treats as a label. A producer task lists the asset in its outlets, and Airflow records an event when that task succeeds. A consumer DAG schedules on the asset instead of on a clock and runs when the event arrives.\n\nThat replaces a guess like "start the report at 06:00 and hope the load is done" with "start the report when the load says it is done". It also connects DAGs of different teams without importing each other.\n\nIn Airflow 3.4 a consumer with one asset gets one run for each event. A consumer with several assets in an AND waits until each has an event and then runs once with all queued events. I recorded both. An asset carries no data. It carries the news that data changed.',
        fu: [['Can you combine time and assets?', 'Yes. There are timetables that run on a schedule or on asset updates.'], ['What does the URI do?', 'Nothing by itself. Airflow does not open it.']],
        trap: 'Thinking that an asset moves data. It signals an update.',
        real: 'Name a DAG in your team that starts "after the other team is done", and how it knows today.'
      }),

      B.qa({
        id: 'qa-mapedge', t: 2, tag: 'Airflow', secs: 75,
        q: 'What can go wrong with mapped tasks, and how do you handle it?',
        pts: ['Empty list: the mapped task is skipped, so use trigger rules after it', 'A list above max_map_length makes the list task fail', 'Too many small copies: batch the items', 'Limits: pools and max_active_tis'],
        short: 'Three things. First, an empty list. The mapped task is skipped, not failed, and a following task with the default rule is skipped as well. I decide what an empty day means: a task with all_done or none_failed_min_one_success after the group, or a check that fails loudly.\n\nSecond, size. A list above max_map_length, 1,024 by default, makes the task that returns it fail, and the mapped task becomes upstream_failed. I recorded that with 1,100 items. And even below the limit, thousands of tiny copies cost scheduling overhead, so I map over batches and loop inside each copy.\n\nThird, capacity. A mapped task can start many instances at once, so I put it in a pool to protect the system it calls, which mission 8 covers.',
        fu: [['How do you find which store failed?', 'Use map_index_template to name the copies by their input, and look at the failed index.']],
        trap: 'Assuming that the mapped task runs once when the list is empty.',
        real: 'Describe how your pipeline treats a day with no files, and whether that is a failure.'
      }),

      B.qa({
        id: 'qa-bigdata', t: 2, tag: 'Design', secs: 75,
        q: 'How do you pass a large dataset between tasks?',
        pts: ['Not through XCom: it lives in the metadata database', 'Write to storage, pass the location', 'Name the output by the run, and clean it up', 'Or a custom XCom backend that stores values in object storage'],
        short: 'I do not pass it through XCom. The default backend stores values in the metadata database and every reader loads them through the API server, so large values and many of them slow the database and the UI.\n\nI write the data to storage that all workers can reach, such as an object store or a staging table, and I return only the location. I build the name from the run, for example from the logical date, so that a retry writes the same place and a backfill does not collide with today. A lifecycle rule or a cleanup task removes old files.\n\nIf many tasks need this and I want the ergonomics of returning values, a custom XCom backend can store values in object storage and keep a reference in the database. It is one more moving part, so I choose it when the pattern repeats.',
        fu: [['Why not the local disk?', 'The next task may run on another machine, and a pod restart wipes it.']],
        trap: 'Saying that the database can take it because a test with 10 MB passed.',
        real: 'Name where intermediate data lives in your pipelines, and how long it stays.'
      }),

      B.qa({
        id: 'qa-loop', t: 3, tag: 'Airflow 3.4', secs: 60,
        q: 'Airflow 3.4 adds task loops. What are they, and how are they different from mapping?',
        pts: ['A task group repeated with .loop(), a number of times decided at run time', 'Iterations run one after another, and can use the previous result', 'A fixed count, or until a condition with a cap', 'Mapping runs the copies in parallel'],
        short: 'A task loop repeats a decorated task group. You call `.loop(max_iterations=N)` on the group. The loop can run a fixed number of times, or until a condition that you give as `until`, with the cap as a safety limit. Each iteration can read the result of the previous one, and the iterations run one after another. Tasks inside one iteration can still run in parallel.\n\nThe graph stays acyclic. Airflow creates the next iteration only when the gate says to continue.\n\nMapping is different: it creates many copies at once, one for each item, and they run in parallel. I use a loop when each step depends on the one before, such as refining an estimate or following pages, and mapping when the items are independent. I ran both a fixed loop and an until loop in my recording.',
        fu: [['What happens if the condition is never met?', 'The gate of the last iteration fails.']],
        trap: 'Using a loop for independent items. Mapping is the right tool.',
        real: 'Name a task of yours that polls or pages in a Python loop, and say whether a task loop fits.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Data Passer', color: '#FBCFE8',
        pts: [
          'A returned value becomes an **XCom** in the metadata database. It is for **small** values. Big data goes to storage and the **path** goes through XCom.',
          '**Dynamic task mapping** makes one task instance for each item of a list: `partial` for fixed arguments, `expand` for the list. An **empty list skips** the mapped task, and a list above `max_map_length` (' + MAXMAP + ') makes the list task fail.',
          'An **asset** is a named piece of data. A producer lists it in `outlets`. A consumer with one asset runs **once for each event** in 3.4. A consumer with several assets waits for all of them and batches the events.',
          'XCom, storage, assets and params answer different questions: what does the next task need, where is the data, when did it change, what did a person choose.',
          '**Task loops** (3.4) repeat a task group one iteration after another. Mapping runs its copies in parallel.'
        ],
        lines: [
          'I can pass a value and know when not to.',
          'I can map a task and handle the empty list.',
          'I can start a DAG from an asset.'
        ]
      })
    ]
  });
})();
