window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "drift": {
   "order111": "(111, 'SPRING', 'web', '4.1', 1111, None)",
   "order112": "(112, None, 'web', '4.1', 1112, None)",
   "order116": "(116, None, None, None, 1116, None)",
   "order117": "(117, None, None, None, None, '11.17')",
   "versions": 2
  },
  "first": {
   "columns": [
    "id",
    "status",
    "total_cents",
    "updated_at",
    "customer__id",
    "customer__tier",
    "_dlt_load_id",
    "_dlt_id"
   ],
   "lines": 200,
   "orders": 100,
   "tables": [
    "_dlt_loads",
    "_dlt_pipeline_state",
    "_dlt_version",
    "orders",
    "orders__lines"
   ]
  },
  "protocol": {
   "again": 0,
   "check_bad": "FAILED, Config validation error: -5 is less than the minimum of 1",
   "check_ok": "SUCCEEDED",
   "fields": 17,
   "full": [
    20,
    2
   ],
   "inc": [
    20,
    2
   ],
   "record_keys": "stream, data, emitted_at",
   "spec": "count (integer), seed (integer), records_per_slice (integer), always_updated (boolean), parallelism (integer)",
   "state": "{\"stream_descriptor\": {\"name\": \"users\"}, \"stream_state\": {\"seed\": 1, \"updated_at\": \"<time of the run>\", \"loop_offset\": 20}}",
   "streams": [
    [
     "products",
     7,
     "full_refresh and incremental",
     "updated_at",
     "id"
    ],
    [
     "purchases",
     8,
     "full_refresh and incremental",
     "updated_at",
     "id"
    ],
    [
     "users",
     17,
     "full_refresh and incremental",
     "updated_at",
     "id"
    ]
   ]
  },
  "state": {
   "fresh_wrote": 0,
   "last_value": "2026-03-02T09:30:00+00:00",
   "loads": 2,
   "remembered": 10,
   "window": {
    "append": [
     [
      20,
      20
     ],
     140,
     110
    ],
    "merge": [
     [
      20,
      20
     ],
     110,
     110
    ]
   }
  },
  "strategies": {
   "order11_in_destination": true,
   "order12_destination": "PLACED",
   "shipped_destination": 10,
   "shipped_shop": 11
  },
  "sync": {
   "added": [
    "_airbyte_raw_id",
    "_airbyte_extracted_at",
    "_airbyte_meta"
   ],
   "source_columns": 17
  }
 },
 "files": {
  "boundary.py": "\"\"\"The order that was shipped without a new updated_at (order 12), under four loads with a cursor: which one sees the change?\"\"\"\nimport tempfile\n\nimport dlt\n\nimport shop_pipeline as sp\nimport source\n\nCASES = [('append, no key', 'append', False, 0), ('append, key id', 'append', True, 0), ('merge, key id', 'merge', True, 0), ('merge, key id, lag of one day', 'merge', True, 86400)]\nwork = tempfile.mkdtemp()\nprint('%-32s %-10s %-11s %s' % ('case', 'runs wrote', 'in the end', 'order 12 in the destination'))\nfor k, (label, strategy, key, lag) in enumerate(CASES):\n    name, day = 'boundary%d' % k, [1]\n    p = sp.make_pipeline(name, work)\n\n    @dlt.resource(name='orders', write_disposition=strategy, **({'primary_key': 'id'} if key else {}))\n    def orders(updated=dlt.sources.incremental('updated_at', initial_value=sp.START, lag=lag)):\n        for page in source.get_orders(day[0], since=updated.last_value):\n            yield page\n    wrote = []\n    for d in (1, 2):\n        day[0] = d\n        wrote.append(sp.run(p, orders))\n    status = sp.query(work, name, \"select string_agg(status, ', ' order by status) from shop.orders where id = 12\")[0][0]\n    print('%-32s %-10s %-11d %s' % (label, ', '.join(map(str, wrote)), sp.totals(work, name)[0], status))\n",
  "challenge.py": "\"\"\"The coding round: load the orders so that a day can be loaded again without a duplicate, and only what changed is read.\"\"\"\nimport tempfile\n\nimport dlt\n\nimport shop_pipeline as sp\nimport source\n\nSTART = sp.START\nday = [1]\n\n# --- your answer starts here ---\n@dlt.resource(name='orders', write_disposition='merge', primary_key='id')\ndef orders(updated=dlt.sources.incremental('updated_at', initial_value=START)):\n    for page in source.get_orders(day[0], since=updated.last_value):\n        yield page\n# --- your answer ends here ---\n\n\nwork = tempfile.mkdtemp()\np = sp.make_pipeline('challenge', work)\nfor d in (1, 2, 3, 3):\n    day[0] = d\n    p.run(orders())\n    wrote = p.last_trace.last_normalize_info.row_counts.get('orders', 0)\n    print('day %d: wrote %d, destination holds %d rows (%d distinct orders)' % ((d, wrote) + sp.totals(work, 'challenge')))\n",
  "drift.py": "\"\"\"Day 3 brings new fields and a number sent as text. What happens to the destination under five rules (schema contracts)?\"\"\"\nimport tempfile\n\nimport shop_pipeline as sp\n\nMODES = [('evolve (the default)', None), (\"columns: freeze\", {'columns': 'freeze'}), (\"columns: discard_row\", {'columns': 'discard_row'}),\n         (\"columns: discard_value\", {'columns': 'discard_value'}), (\"data_type: freeze\", {'data_type': 'freeze'})]\nwork = tempfile.mkdtemp()\nBASE = None\nfor k, (label, mode) in enumerate(MODES):\n    name = 'drift%d' % k\n    day = [1]\n    p = sp.make_pipeline(name, work)\n    resource = sp.orders_resource('merge', day, True)\n    for d in (1, 2):\n        day[0] = d\n        sp.run(p, resource)\n    before = {c[0] for c in sp.query(work, name, \"select column_name from information_schema.columns where table_schema = 'shop' and table_name = 'orders'\")}\n    day[0] = 3\n    try:\n        wrote = sp.run(p, resource, **({'schema_contract': mode} if mode else {}))\n        result = 'loaded %d' % wrote\n        error = ''\n    except Exception as e:                                           # noqa: BLE001\n        cause = e\n        while cause.__cause__ is not None:\n            cause = cause.__cause__\n        result, error = 'failed', str(cause).split('. ', 1)[-1].split(' Offending')[0].replace('\\n', ' ').strip()\n    after = [c[0] for c in sp.query(work, name, \"select column_name from information_schema.columns where table_schema = 'shop' and table_name = 'orders' order by ordinal_position\")]\n    print('%s | %s | in the destination: %d | new columns: %s%s' % (label, result, sp.totals(work, name)[0], ', '.join(c for c in after if c not in before) or 'none', (' | ' + error) if error else ''))\n    if k == 0:\n        BASE = (work, name)\nprint()\nw, n = BASE\nfor i in (111, 112, 116, 117):\n    print('order %d under evolve:' % i, sp.query(w, n, 'select id, coupon, channel__name, channel__app__version, total_cents, total_cents__v_text from shop.orders where id = %d' % i)[0])\nprint('schema versions kept by dlt:', sp.query(w, n, 'select count(*) from shop._dlt_version')[0][0])\n",
  "first_load.py": "\"\"\"The first load: 100 orders from the shop API into DuckDB, and everything that dlt leaves behind.\"\"\"\nimport tempfile\n\nimport shop_pipeline as sp\n\nwork = tempfile.mkdtemp()\np = sp.make_pipeline('first', work)\nwrote = sp.run(p, sp.orders_resource('append', [1]))\nprint('orders written by the run:', wrote)\nprint('tables in the dataset shop:', ', '.join(t[0] for t in sp.query(work, 'first', \"select table_name from information_schema.tables where table_schema = 'shop' order by 1\")))\nprint()\nprint('columns of orders:')\nfor name, kind in sp.query(work, 'first', \"select column_name, data_type from information_schema.columns where table_schema = 'shop' and table_name = 'orders' order by ordinal_position\"):\n    print('  %-16s %s' % (name, kind))\nprint()\nrows = sp.query(work, 'first', \"select count(*) from shop.orders__lines\")[0][0]\nprint('orders__lines: %d rows, the lines of the orders' % rows)\nprint('order 5:', sp.query(work, 'first', \"select id, status, total_cents, customer__id, customer__tier from shop.orders where id = 5\")[0])\nprint('its lines:', sp.query(work, 'first', \"select l._dlt_list_idx, l.sku, l.qty from shop.orders__lines l join shop.orders o on l._dlt_parent_id = o._dlt_id where o.id = 5 order by 1\"))\nprint('_dlt_loads: %d row, status %d' % tuple(sp.query(work, 'first', \"select count(*), min(status) from shop._dlt_loads\")[0]))\n",
  "protocol.py": "\"\"\"What Airbyte does with a connector. A connector is a program that is called with spec, check, discover or read, and prints one JSON message for each line.\"\"\"\nimport json\nimport os\nimport subprocess\nimport tempfile\n\nCONNECTOR = os.path.abspath(os.path.join('.venv-source-faker', 'bin', 'source-faker'))\nwork = tempfile.mkdtemp()\nKEEP = {'SPEC', 'CONNECTION_STATUS', 'CATALOG', 'RECORD', 'STATE'}            # LOG and TRACE messages are not shown\n\n\ndef save(name, obj):\n    path = os.path.join(work, name)\n    with open(path, 'w') as f:\n        json.dump(obj, f)\n    return path\n\n\ndef call(*args):\n    done = subprocess.run([CONNECTOR, *args], capture_output=True, text=True, cwd=work)\n    return [m for m in (json.loads(line) for line in done.stdout.splitlines() if line.startswith('{')) if m['type'] in KEEP]\n\n\ndef of(messages, kind):\n    return [m for m in messages if m['type'] == kind]\n\n\nconfig = save('config.json', {'count': 20, 'seed': 1, 'records_per_slice': 10, 'parallelism': 1, 'always_updated': False})\nspec = of(call('spec'), 'SPEC')[0]['spec']['connectionSpecification']\nprint('spec: the connector asks for', ', '.join('%s (%s)' % (k, v['type']) for k, v in spec['properties'].items()))\nprint('check, count 20:', of(call('check', '--config', config), 'CONNECTION_STATUS')[0]['connectionStatus']['status'])\nbad = of(call('check', '--config', save('bad.json', {'count': -5})), 'CONNECTION_STATUS')[0]['connectionStatus']\nprint('check, count -5: %s, %s' % (bad['status'], bad['message']))\ncatalog = of(call('discover', '--config', config), 'CATALOG')[0]['catalog']\nfor s in sorted(catalog['streams'], key=lambda s: s['name']):\n    print('discover: %-9s %2d fields, sync modes %s, cursor %s, primary key %s' % (s['name'], len(s['json_schema']['properties']), ' and '.join(s['supported_sync_modes']), s['default_cursor_field'][0], s['source_defined_primary_key'][0][0]))\n\n\ndef configured(mode, destination):\n    return save('catalog-%s.json' % mode, {'streams': [{'stream': s, 'sync_mode': mode, 'destination_sync_mode': destination} for s in catalog['streams'] if s['name'] == 'users']})\n\n\nfull = call('read', '--config', config, '--catalog', configured('full_refresh', 'overwrite'))\nprint('read users, full_refresh: %d RECORD messages, %d STATE messages' % (len(of(full, 'RECORD')), len(of(full, 'STATE'))))\nfirst = of(full, 'RECORD')[0]['record']\nprint('a RECORD has the keys', ', '.join(first), 'and the fields of the row are in data (id %s, %d fields)' % (first['data']['id'], len(first['data'])))\ninc = call('read', '--config', config, '--catalog', configured('incremental', 'append'))\nprint('read users, incremental: %d RECORD messages, %d STATE messages' % (len(of(inc, 'RECORD')), len(of(inc, 'STATE'))))\nstate = of(inc, 'STATE')[-1]\nshown = json.loads(json.dumps(state['state']))\nshown['stream']['stream_state']['updated_at'] = '<time of the run>'\nprint('the last STATE message:', json.dumps(shown['stream']))\nagain = call('read', '--config', config, '--catalog', configured('incremental', 'append'), '--state', save('state.json', [state]))\nprint('read again with that state: %d RECORD messages' % len(of(again, 'RECORD')))\n",
  "shop_pipeline.py": "\"\"\"The dlt side of the Brewline ingestion: one pipeline for each experiment, and one resource for each way of loading.\"\"\"\nimport os\n\nimport dlt\nimport duckdb\n\nimport source\n\nSTART = '2026-01-01T00:00:00+00:00'\n\n\ndef make_pipeline(name, workdir, state_dir='dlt'):\n    return dlt.pipeline(pipeline_name=name, destination=dlt.destinations.duckdb(os.path.join(workdir, name + '.duckdb')),\n                        dataset_name='shop', pipelines_dir=os.path.join(workdir, state_dir))\n\n\ndef orders_resource(strategy, day, cursor=False, **hints):\n    \"\"\"A resource that reads the orders of one day. `day` is a list of one item, so that a run can move to the next day.\"\"\"\n    kw = {'name': 'orders', 'write_disposition': strategy}\n    if strategy == 'merge':\n        kw['primary_key'] = 'id'\n    kw.update(hints)\n    if cursor:\n        @dlt.resource(**kw)\n        def orders(updated=dlt.sources.incremental('updated_at', initial_value=START)):\n            for page in source.get_orders(day[0], since=updated.last_value):\n                yield page\n    else:\n        @dlt.resource(**kw)\n        def orders():\n            for page in source.get_orders(day[0]):\n                yield page\n    return orders\n\n\ndef run(pipeline, resource, **kw):\n    \"\"\"Runs the pipeline once and returns the number of order rows that this run wrote.\"\"\"\n    pipeline.run(resource(), **kw)\n    return pipeline.last_trace.last_normalize_info.row_counts.get('orders', 0)\n\n\ndef query(workdir, name, sql):\n    con = duckdb.connect(os.path.join(workdir, name + '.duckdb'), read_only=True)\n    try:\n        return con.sql(sql).fetchall()\n    finally:\n        con.close()\n\n\ndef totals(workdir, name):\n    \"\"\"(rows, distinct orders) in the destination.\"\"\"\n    return query(workdir, name, 'select count(*), count(distinct id) from shop.orders')[0]\n",
  "source.py": "\"\"\"A stand-in for the shop API of Brewline: the orders as the shop holds them at the end of a day (1 to 3). Fixed rules, no random numbers.\"\"\"\nSKUS = ['MUG', 'BEANS-250', 'FILTER', 'GRINDER']\n\n\ndef _base(i):\n    return {'id': i, 'status': 'PLACED', 'total_cents': 1000 + i, 'updated_at': '2026-03-01T08:00:00+00:00',\n            'customer': {'id': 'C%03d' % (1 + (i * 13) % 40), 'tier': ['bronze', 'silver', 'gold'][i % 3]},\n            'lines': [{'sku': SKUS[(i + k) % 4], 'qty': 1 + (i + k) % 3} for k in range(1 + i % 3)]}\n\n\ndef orders_on(day):\n    \"\"\"Every order that the shop holds at the end of `day`.\"\"\"\n    rows = {i: _base(i) for i in range(1, 101)}\n    if day >= 2:\n        for i in range(1, 11):                                         # ten orders are shipped\n            rows[i].update(status='SHIPPED', updated_at='2026-03-02T09:00:00+00:00')\n        for i in range(101, 111):                                      # ten new orders\n            rows[i] = dict(_base(i), updated_at='2026-03-02T09:30:00+00:00')\n        del rows[11]                                                   # an order is deleted for good\n        rows[12]['status'] = 'SHIPPED'                                 # a change that did not move updated_at\n    if day >= 3:\n        for i in range(111, 116):                                      # new orders with a coupon and a channel\n            rows[i] = dict(_base(i), updated_at='2026-03-03T10:00:00+00:00', coupon='SPRING' if i % 2 else None, channel={'name': 'web', 'app': {'version': '4.1'}})\n        rows[116] = dict(_base(116), updated_at='2026-03-03T10:30:00+00:00', total_cents='1116')    # a number sent as text\n        rows[117] = dict(_base(117), updated_at='2026-03-03T10:40:00+00:00', total_cents='11.17')   # an amount with a decimal point, sent as text\n    return rows\n\n\ndef get_orders(day, since=None, page_size=50):\n    \"\"\"Like GET /orders?updated_since=...: the orders changed at or after `since`, in pages of 50.\"\"\"\n    rows = [r for _, r in sorted(orders_on(day).items()) if since is None or r['updated_at'] >= since]\n    for k in range(0, len(rows), page_size):\n        yield rows[k:k + page_size]\n",
  "state.py": "\"\"\"State and backfills: where dlt remembers the cursor, and what a repeated load or a window of old data does.\"\"\"\nimport tempfile\n\nimport dlt\n\nimport shop_pipeline as sp\n\nwork = tempfile.mkdtemp()\nday = [1]\np = sp.make_pipeline('state', work)\nresource = sp.orders_resource('merge', day, True)\nfor d in (1, 2):\n    day[0] = d\n    sp.run(p, resource)\ncursor = p.state['sources']['state']['resources']['orders']['incremental']['updated_at']\nprint('the cursor after day 2: last_value =', cursor['last_value'])\nprint('rows at the cursor that dlt remembers:', len(cursor['unique_hashes']))\nprint('loads recorded in the destination:', sp.query(work, 'state', 'select count(*) from shop._dlt_loads')[0][0])\nfresh = sp.make_pipeline('state', work, 'dlt-fresh')\nday[0] = 2\nprint('a new working folder, the same destination, day 2 again: wrote', sp.run(fresh, resource))\nprint()\nfor strategy in ('append', 'merge'):\n    name = 'window_' + strategy\n    q = sp.make_pipeline(name, work)\n    day[0] = 1\n    sp.run(q, sp.orders_resource(strategy, day, True))\n    day[0] = 2\n    wrote = []\n    for _ in range(2):\n        @dlt.resource(name='orders', write_disposition=strategy, **({'primary_key': 'id'} if strategy == 'merge' else {}))\n        def window(updated=dlt.sources.incremental('updated_at', initial_value='2026-03-02T00:00:00+00:00', end_value='2026-03-03T00:00:00+00:00')):\n            import source\n            for page in source.get_orders(day[0], since=updated.start_value):\n                yield page\n        wrote.append(sp.run(q, window))\n    rows, distinct = sp.totals(work, name)\n    print('a window of day 2 loaded twice with %s: wrote %s, %d rows, %d distinct orders' % (strategy, ', '.join(map(str, wrote)), rows, distinct))\n",
  "strategies.py": "\"\"\"Seven ways to load the orders: what each run wrote, and what the destination holds in the end.\"\"\"\nimport tempfile\n\nimport source\nimport shop_pipeline as sp\n\nCASES = [\n    ('append, the same day twice', 'append', [1, 1], False),\n    ('replace, the same day twice', 'replace', [1, 1], False),\n    ('merge on id, the same day twice', 'merge', [1, 1], False),\n    ('merge on id, day 1 then day 2, the whole list', 'merge', [1, 2], False),\n    ('append with a cursor, day 1 then day 2', 'append', [1, 2], True),\n    ('merge with a cursor, day 1 then day 2', 'merge', [1, 2], True),\n    ('merge with a cursor, day 1, day 2, day 2 again', 'merge', [1, 2, 2], True),\n]\nwork = tempfile.mkdtemp()\nprint('%-48s %-14s %-11s %-9s %s' % ('case', 'runs wrote', 'in the end', 'distinct', 'the shop holds'))\nfor k, (label, strategy, days, cursor) in enumerate(CASES):\n    name = 'case%d' % k\n    day = [1]\n    p = sp.make_pipeline(name, work)\n    resource = sp.orders_resource(strategy, day, cursor)\n    wrote = []\n    for d in days:\n        day[0] = d\n        wrote.append(sp.run(p, resource))\n    rows, distinct = sp.totals(work, name)\n    print('%-48s %-14s %-11d %-9d %d' % (label, ', '.join(map(str, wrote)), rows, distinct, len(source.orders_on(days[-1]))))\nprint()\nname, day = 'case5', [2]\nprint('with a cursor, order 11 (deleted in the shop on day 2): still in the destination, %s' % (len(sp.query(work, name, 'select id from shop.orders where id = 11')) == 1))\nprint('with a cursor, order 12 (shipped on day 2, updated_at not moved): the shop says SHIPPED, the destination says', sp.query(work, name, 'select status from shop.orders where id = 12')[0][0])\nprint('with a cursor, orders shipped in the destination:', sp.query(work, name, \"select count(*) from shop.orders where status = 'SHIPPED'\")[0][0], 'of', sum(1 for o in source.orders_on(2).values() if o['status'] == 'SHIPPED'), 'in the shop')\n",
  "sync_modes.py": "\"\"\"The same 20 users, synced twice in four ways with PyAirbyte: what each sync read, and what the destination holds.\"\"\"\nimport contextlib\nimport io\nimport os\nimport tempfile\n\nimport airbyte as ab\nimport sqlalchemy\n\nCASES = [('full refresh, replace', 'replace', True, True), ('full refresh, append', 'append', True, True), ('full refresh, merge', 'merge', True, True),\n         ('incremental, a cursor that always moves', 'append', False, True), ('incremental, a cursor that tells the truth', 'append', False, False)]\nwork = tempfile.mkdtemp()\nquiet = io.StringIO()                                                      # PyAirbyte prints a progress report for every sync\nprint('%-44s %-14s %-13s %s' % ('case', 'sync 1, 2 read', 'rows after', 'distinct ids'))\nfor k, (label, strategy, full, moves) in enumerate(CASES):\n    source = ab.get_source('source-faker', config={'count': 20, 'seed': 1, 'always_updated': moves}, pip_url='airbyte-source-faker', install_if_missing=True, streams=['users'])\n    cache = ab.new_local_cache('case%d' % k, cache_dir=os.path.join(work, 'c%d' % k))\n    read, rows = [], []\n    for _ in range(2):\n        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):\n            result = source.read(cache=cache, write_strategy=strategy, force_full_refresh=full)\n        read.append(result.processed_records)\n        rows.append(len(list(cache['users'])))\n    ids = len({r['id'] for r in cache['users']})\n    print('%-44s %-14s %-13s %d' % (label, ', '.join(map(str, read)), ', '.join(map(str, rows)), ids))\nengine = cache.get_sql_engine()\ncolumns = [c['name'] for c in sqlalchemy.inspect(engine).get_columns('users', schema=cache.schema_name)]\nprint()\nprint('columns that PyAirbyte adds to users:', ', '.join(c for c in columns if c.startswith('_airbyte')))\nprint('the other %d columns come from the source' % sum(1 for c in columns if not c.startswith('_airbyte')))\n"
 },
 "meta": {
  "airbyte": "0.71.3",
  "connector": "airbyte-source-faker",
  "dlt": "1.32.0",
  "duckdb": "1.5.6",
  "note": "Recorded by ingestion/verify/capture_ingestion.py: dlt on DuckDB, and the Airbyte Faker connector through PyAirbyte. Fivetran, the Airbyte platform and CDC tools were not run.",
  "python_airbyte": "3.11.18",
  "python_dlt": "3.13.18",
  "recorded_on": "2026-11-21"
 },
 "tables": {
  "boundary.cases": {
   "cols": [
    "case",
    "runs wrote",
    "in the end",
    "order 12 in the destination"
   ],
   "rows": [
    [
     "append, no key",
     "100, 21",
     121,
     "PLACED, SHIPPED"
    ],
    [
     "append, key id",
     "100, 20",
     120,
     "PLACED"
    ],
    [
     "merge, key id",
     "100, 20",
     110,
     "PLACED"
    ],
    [
     "merge, key id, lag of one day",
     "100, 109",
     110,
     "SHIPPED"
    ]
   ]
  },
  "challenge.days": {
   "cols": [
    "day",
    "wrote",
    "rows",
    "distinct orders"
   ],
   "rows": [
    [
     1,
     100,
     100,
     100
    ],
    [
     2,
     20,
     110,
     110
    ],
    [
     3,
     7,
     117,
     117
    ],
    [
     3,
     0,
     117,
     117
    ]
   ]
  },
  "drift.modes": {
   "cols": [
    "contract",
    "result",
    "in the destination",
    "new columns",
    "error"
   ],
   "rows": [
    [
     "evolve (the default)",
     "loaded 7",
     117,
     "coupon, channel__name, channel__app__version, total_cents__v_text",
     ""
    ],
    [
     "columns: freeze",
     "failed",
     110,
     "none",
     "Contract on `columns` with `contract_mode=freeze` is violated. Can't add table column `coupon` to table `orders` because `columns` are frozen."
    ],
    [
     "columns: discard_row",
     "loaded 2",
     112,
     "total_cents__v_text",
     ""
    ],
    [
     "columns: discard_value",
     "loaded 7",
     117,
     "total_cents__v_text",
     ""
    ],
    [
     "data_type: freeze",
     "failed",
     110,
     "none",
     "Contract on `data_type` with `contract_mode=freeze` is violated. Can't add variant column `total_cents__v_text` for table `orders` because `data_types` are frozen."
    ]
   ]
  },
  "strategies.cases": {
   "cols": [
    "case",
    "runs wrote",
    "in the end",
    "distinct orders",
    "the shop holds"
   ],
   "rows": [
    [
     "append, the same day twice",
     "100, 100",
     200,
     100,
     100
    ],
    [
     "replace, the same day twice",
     "100, 100",
     100,
     100,
     100
    ],
    [
     "merge on id, the same day twice",
     "100, 100",
     100,
     100,
     100
    ],
    [
     "merge on id, day 1 then day 2, the whole list",
     "100, 109",
     110,
     110,
     109
    ],
    [
     "append with a cursor, day 1 then day 2",
     "100, 21",
     121,
     110,
     109
    ],
    [
     "merge with a cursor, day 1 then day 2",
     "100, 20",
     110,
     110,
     109
    ],
    [
     "merge with a cursor, day 1, day 2, day 2 again",
     "100, 20, 0",
     110,
     110,
     109
    ]
   ]
  },
  "sync.cases": {
   "cols": [
    "case",
    "sync 1, 2 read",
    "rows after",
    "distinct ids"
   ],
   "rows": [
    [
     "full refresh, replace",
     "20, 20",
     "20, 20",
     20
    ],
    [
     "full refresh, append",
     "20, 20",
     "20, 40",
     20
    ],
    [
     "full refresh, merge",
     "20, 20",
     "20, 20",
     20
    ],
    [
     "incremental, a cursor that always moves",
     "20, 20",
     "20, 40",
     20
    ],
    [
     "incremental, a cursor that tells the truth",
     "20, 0",
     "20, 20",
     20
    ]
   ]
  }
 },
 "text": {
  "boundary.run": "python boundary.py\ncase                             runs wrote in the end  order 12 in the destination\nappend, no key                   100, 21    121         PLACED, SHIPPED\nappend, key id                   100, 20    120         PLACED\nmerge, key id                    100, 20    110         PLACED\nmerge, key id, lag of one day    100, 109   110         SHIPPED",
  "challenge.run": "python challenge.py\nday 1: wrote 100, destination holds 100 rows (100 distinct orders)\nday 2: wrote 20, destination holds 110 rows (110 distinct orders)\nday 3: wrote 7, destination holds 117 rows (117 distinct orders)\nday 3: wrote 0, destination holds 117 rows (117 distinct orders)",
  "drift.run": "python drift.py\nevolve (the default) | loaded 7 | in the destination: 117 | new columns: coupon, channel__name, channel__app__version, total_cents__v_text\ncolumns: freeze | failed | in the destination: 110 | new columns: none | Contract on `columns` with `contract_mode=freeze` is violated. Can't add table column `coupon` to table `orders` because `columns` are frozen.\ncolumns: discard_row | loaded 2 | in the destination: 112 | new columns: total_cents__v_text\ncolumns: discard_value | loaded 7 | in the destination: 117 | new columns: total_cents__v_text\ndata_type: freeze | failed | in the destination: 110 | new columns: none | Contract on `data_type` with `contract_mode=freeze` is violated. Can't add variant column `total_cents__v_text` for table `orders` because `data_types` are frozen.\n\norder 111 under evolve: (111, 'SPRING', 'web', '4.1', 1111, None)\norder 112 under evolve: (112, None, 'web', '4.1', 1112, None)\norder 116 under evolve: (116, None, None, None, 1116, None)\norder 117 under evolve: (117, None, None, None, None, '11.17')\nschema versions kept by dlt: 2",
  "first.run": "python first_load.py\norders written by the run: 100\ntables in the dataset shop: _dlt_loads, _dlt_pipeline_state, _dlt_version, orders, orders__lines\n\ncolumns of orders:\n  id               BIGINT\n  status           VARCHAR\n  total_cents      BIGINT\n  updated_at       TIMESTAMP WITH TIME ZONE\n  customer__id     VARCHAR\n  customer__tier   VARCHAR\n  _dlt_load_id     VARCHAR\n  _dlt_id          VARCHAR\n\norders__lines: 200 rows, the lines of the orders\norder 5: (5, 'PLACED', 1005, 'C026', 'gold')\nits lines: [(0, 'BEANS-250', 3), (1, 'FILTER', 1), (2, 'GRINDER', 2)]\n_dlt_loads: 1 row, status 0",
  "protocol.run": "python protocol.py\nspec: the connector asks for count (integer), seed (integer), records_per_slice (integer), always_updated (boolean), parallelism (integer)\ncheck, count 20: SUCCEEDED\ncheck, count -5: FAILED, Config validation error: -5 is less than the minimum of 1\ndiscover: products   7 fields, sync modes full_refresh and incremental, cursor updated_at, primary key id\ndiscover: purchases  8 fields, sync modes full_refresh and incremental, cursor updated_at, primary key id\ndiscover: users     17 fields, sync modes full_refresh and incremental, cursor updated_at, primary key id\nread users, full_refresh: 20 RECORD messages, 2 STATE messages\na RECORD has the keys stream, data, emitted_at and the fields of the row are in data (id 1, 17 fields)\nread users, incremental: 20 RECORD messages, 2 STATE messages\nthe last STATE message: {\"stream_descriptor\": {\"name\": \"users\"}, \"stream_state\": {\"seed\": 1, \"updated_at\": \"<time of the run>\", \"loop_offset\": 20}}\nread again with that state: 0 RECORD messages",
  "state.run": "python state.py\nthe cursor after day 2: last_value = 2026-03-02T09:30:00+00:00\nrows at the cursor that dlt remembers: 10\nloads recorded in the destination: 2\na new working folder, the same destination, day 2 again: wrote 0\n\na window of day 2 loaded twice with append: wrote 20, 20, 140 rows, 110 distinct orders\na window of day 2 loaded twice with merge: wrote 20, 20, 110 rows, 110 distinct orders",
  "strategies.run": "python strategies.py\ncase                                             runs wrote     in the end  distinct  the shop holds\nappend, the same day twice                       100, 100       200         100       100\nreplace, the same day twice                      100, 100       100         100       100\nmerge on id, the same day twice                  100, 100       100         100       100\nmerge on id, day 1 then day 2, the whole list    100, 109       110         110       109\nappend with a cursor, day 1 then day 2           100, 21        121         110       109\nmerge with a cursor, day 1 then day 2            100, 20        110         110       109\nmerge with a cursor, day 1, day 2, day 2 again   100, 20, 0     110         110       109\n\nwith a cursor, order 11 (deleted in the shop on day 2): still in the destination, True\nwith a cursor, order 12 (shipped on day 2, updated_at not moved): the shop says SHIPPED, the destination says PLACED\nwith a cursor, orders shipped in the destination: 10 of 11 in the shop",
  "sync.run": "python sync_modes.py\ncase                                         sync 1, 2 read rows after    distinct ids\nfull refresh, replace                        20, 20         20, 20        20\nfull refresh, append                         20, 20         20, 40        20\nfull refresh, merge                          20, 20         20, 20        20\nincremental, a cursor that always moves      20, 20         20, 40        20\nincremental, a cursor that tells the truth   20, 0          20, 20        20\n\ncolumns that PyAirbyte adds to users: _airbyte_raw_id, _airbyte_extracted_at, _airbyte_meta\nthe other 17 columns come from the source",
  "tool.versions": "dlt 1.32.0 with DuckDB 1.5.6 on Python 3.13.18\nPyAirbyte 0.71.3 on Python 3.11.18, with the connector airbyte-source-faker (installed from PyPI)"
 }
};
