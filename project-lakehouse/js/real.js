window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "after_day1": {
   "bronze": 305,
   "gold": 12,
   "gold_orders": 300,
   "gold_revenue": 1457550,
   "ledger": 1,
   "order5": "PLACED",
   "quarantine": 4,
   "refunded": 0,
   "shipped": 0,
   "silver": 300,
   "silver_distinct": 300
  },
  "after_day2": {
   "bronze": 767,
   "gold": 24,
   "gold_orders": 415,
   "gold_revenue": 2082883,
   "ledger": 3,
   "order5": "SHIPPED",
   "quarantine": 8,
   "refunded": 1,
   "shipped": 40,
   "silver": 416,
   "silver_distinct": 416
  },
  "after_day3": {
   "bronze": 850,
   "gold": 36,
   "gold_orders": 495,
   "gold_revenue": 2679963,
   "ledger": 4,
   "order5": "SHIPPED",
   "quarantine": 10,
   "refunded": 1,
   "shipped": 40,
   "silver": 496,
   "silver_distinct": 496
  },
  "after_day3_again": {
   "bronze": 850,
   "gold": 36,
   "gold_orders": 495,
   "gold_revenue": 2679963,
   "ledger": 4,
   "order5": "SHIPPED",
   "quarantine": 10,
   "refunded": 1,
   "shipped": 40,
   "silver": 496,
   "silver_distinct": 496
  },
  "runs": {
   "day1": {
    "bronze_rows": 305,
    "day": 1,
    "files": 1,
    "gate": [
     "PASS every bronze row of the run is valid or quarantined: 305",
     "PASS silver has one row for each order: 300",
     "PASS gold revenue equals silver revenue without the refunded orders: 1457550",
     "PASS gold orders equal silver orders without the refunded ones: 300"
    ],
    "gold_days": 1,
    "gold_rows": 12,
    "inserted": 300,
    "left": 0,
    "nothing_to_do": false,
    "quarantined": 4,
    "updated": 0,
    "valid": 301,
    "warning": ""
   },
   "day2": {
    "bronze_rows": 462,
    "day": 2,
    "files": 2,
    "gate": [
     "PASS every bronze row of the run is valid or quarantined: 462",
     "PASS silver has one row for each order: 416",
     "PASS gold revenue equals silver revenue without the refunded orders: 2082883",
     "PASS gold orders equal silver orders without the refunded ones: 415"
    ],
    "gold_days": 2,
    "gold_rows": 24,
    "inserted": 116,
    "left": 259,
    "nothing_to_do": false,
    "quarantined": 4,
    "updated": 41,
    "valid": 458,
    "warning": ""
   },
   "day3": {
    "bronze_rows": 83,
    "day": 3,
    "files": 1,
    "gate": [
     "PASS every bronze row of the run is valid or quarantined: 83",
     "PASS silver has one row for each order: 496",
     "PASS gold revenue equals silver revenue without the refunded orders: 2679963",
     "PASS gold orders equal silver orders without the refunded ones: 495"
    ],
    "gold_days": 2,
    "gold_rows": 24,
    "inserted": 80,
    "left": 1,
    "nothing_to_do": false,
    "quarantined": 2,
    "updated": 0,
    "valid": 81,
    "warning": "coupon"
   },
   "day3_again": {
    "bronze_rows": 0,
    "day": 3,
    "files": 0,
    "gate": [],
    "gold_days": 0,
    "gold_rows": 0,
    "inserted": 0,
    "left": 0,
    "nothing_to_do": true,
    "quarantined": 0,
    "updated": 0,
    "valid": 0,
    "warning": ""
   }
  },
  "tests": {
   "passed": 7
  },
  "tour": {
   "gold": [
    "36",
    "3",
    "12"
   ]
  }
 },
 "files": {
  ".github/workflows/ci.yml": "# NOT RUN in the walkthrough that describes this project: it is a sketch of the checks that a pull request would run.\nname: ci\non: [pull_request]\njobs:\n  tests:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with: { distribution: temurin, java-version: '21' }\n      - uses: actions/setup-python@v5\n        with: { python-version: '3.12' }\n      - run: pip install -r requirements.txt\n      - run: python -m pytest -q tests\n",
  ".gitignore": "lakehouse_data/\n__pycache__/\n.pytest_cache/\nspark-warehouse/\nmetastore_db/\nderby.log\n.venv/\n",
  "Dockerfile": "# NOT BUILT in the walkthrough that describes this project: it is a sketch of how the pipeline would be packaged.\nFROM eclipse-temurin:21-jre\nRUN apt-get update && apt-get install -y python3 python3-venv && rm -rf /var/lib/apt/lists/*\nWORKDIR /app\nCOPY requirements.txt .\nRUN python3 -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt\nCOPY lakehouse lakehouse\nENV LAKEHOUSE_HOME=/data\nENTRYPOINT [\"/venv/bin/python\", \"-m\", \"lakehouse.run\"]\n",
  "Makefile": "PYTHON ?= .venv/bin/python\nexport LAKEHOUSE_HOME ?= $(CURDIR)/lakehouse_data\n\nsetup:\n\tpython3 -m venv .venv && .venv/bin/pip install -r requirements.txt\n\ntest:\n\t$(PYTHON) -m pytest -q tests\n\n# one run for one day of the pretend source: land the files, bronze, silver, gold, and the quality gate\nday-%:\n\t$(PYTHON) -m lakehouse.run --day $*\n\nclean:\n\trm -rf lakehouse_data\n",
  "README.md": "# Brewline lakehouse: Spark and Delta Lake, bronze to gold\n\nA small medallion lakehouse for a coffee retailer, built the way a senior data engineer would defend it: raw files that are never lost, a silver layer that validates, de-duplicates and merges safely, a quarantine for what breaks a rule, gold tables that are rebuilt for exactly the days that changed, and a quality gate that fails the run when the layers disagree.\n\n```\nlanding files (JSON lines)  ->  bronze (raw text + where it came from)  ->  silver (validated, merged)  ->  gold (daily revenue)\n                                                                        \\->  quarantine (bad rows, with the reason)\n                                                                                      quality gate after every run\n```\n\nDelta Lake gives every table a history, so a table can be read as it was at an earlier version. The source is a stand-in: `lakehouse/landing.py` writes the files of three days, with fixed rules, so that every run gives the same numbers.\n\n## Run it\n\n```bash\nmake setup               # a virtual environment with pyspark 4.0.1 and delta-spark 4.0.1 (Java 17 or later is needed)\nmake test                # 7 tests, about two minutes: the source, the rules, and the pipeline end to end\nmake day-1               # land the files of day 1, then bronze, silver, gold, and the gate\nmake day-2               # new orders, status changes with one refund, and a file that is delivered twice\nmake day-3               # a field that nobody announced, amounts that are text, and an old event that arrives late\npython -m lakehouse.tour # the history of silver, the table at each version, and the quarantine\n```\n\n## What is in it\n\n| File | What it does |\n| --- | --- |\n| `lakehouse/landing.py` | The pretend source: three days of order events, with dirty lines on purpose |\n| `lakehouse/bronze.py` | Appends the raw text of every line of every new file, with its file and line number. A ledger of the ingested files makes the step safe to repeat |\n| `lakehouse/rules.py` | The validation rules as Spark expressions, and the one place that parses the raw text |\n| `lakehouse/silver.py` | Parses, quarantines the bad rows with their reason, keeps the latest event of each order in the batch, and merges into silver: an event is applied only when it is newer than the one in the table. The order date is set once, when the order is first inserted |\n| `lakehouse/gold.py` | Daily revenue for each store, by the date when the order was placed, without the refunded orders. It recomputes the days of the orders that a run touched, and replaces each day as a whole |\n| `lakehouse/quality.py` | The gate: every bronze row is valid or quarantined, one silver row for each order, and gold equals silver in revenue and in orders |\n| `lakehouse/run.py` | One run for one day: the steps in order, and an exit code of 1 if the gate fails |\n| `lakehouse/tour.py` | A look at the history and the versions of a Delta table |\n| `tests/` | The source, the rules on a handful of records, and the pipeline over three days with a replay and a late event |\n\n## Design decisions\n\n- **Bronze keeps the text.** A line that is cut, or has the wrong type, or has a field that nobody announced, still reaches bronze. Parsing happens in silver, where a failure becomes a quarantined row with a reason and not a lost one.\n- **Merge, and only when newer.** The merge updates a row only when the event is newer than the one in silver, so a file that is delivered twice, or an old event that arrives late, changes nothing.\n- **Quarantine, not delete.** A row that breaks a rule is kept with the reason (`parse_error`, `bad_type`, `bad_amount`, `bad_status`, `unknown_store`). A replay quarantines the same rows again, so the quarantine can hold repeats.\n- **Gold by order date.** An order stays on the day when it was placed, so a shipment never moves revenue between days. A refund restates the day of its order. Each affected day is replaced as a whole with `replaceWhere`, so a repeat leaves the same table.\n- **A gate that fails the run.** Layers that disagree are a bug, and the exit code stops whatever comes next.\n\n## What is not covered\n\nNo cloud storage, no cluster, no streaming, no schema registry, no table maintenance (`OPTIMIZE`, `VACUUM`), no access control, no scheduler, no alerts and no deployment. The Dockerfile and the CI workflow are sketches that did not run.\n\nThree limits of the design itself:\n\n- **The gate compares the layers with each other, not with the source.** A file that never arrived makes every layer agree. A manifest from the source, with its files and rows, would catch it.\n- **The order date is the date of the first event that silver saw.** If the first event to arrive is a late one, the date is wrong.\n- **No deletes.** The pretend source never deletes an order, and a stream of events cannot show a delete unless the source sends one.\n",
  "lakehouse/__init__.py": "\"\"\"The Brewline lakehouse: landing files, bronze, silver, gold and a quality gate.\n\nIt runs on Spark and Delta Lake.\n\"\"\"\n",
  "lakehouse/bronze.py": "\"\"\"Bronze: every line of every new file, as raw text, with where it came from.\n\nNothing is parsed, cleaned or dropped here, so nothing can be lost here. A ledger of the\nfiles that were ingested makes the step safe to repeat: a file that is already in the ledger\nis not read again.\n\"\"\"\n\nimport glob\nimport os\n\nfrom delta.tables import DeltaTable\nfrom pyspark.sql import Window\nfrom pyspark.sql import functions as F\n\nfrom . import config\n\n\ndef new_files(spark):\n    \"\"\"The files of the landing zone that the ledger does not know.\"\"\"\n    found = sorted(glob.glob(os.path.join(config.LANDING, 'date=*', '*.json')))\n    known = set()\n    if DeltaTable.isDeltaTable(spark, config.LEDGER):\n        known = {r['file'] for r in spark.read.format('delta').load(config.LEDGER).collect()}\n    return [f for f in found if f not in known]\n\n\ndef ingest(spark, run_id):\n    \"\"\"Appends the raw lines of the new files to bronze, and the files to the ledger.\n\n    Returns the files and the number of lines.\n    \"\"\"\n    files = new_files(spark)\n    if not files:\n        return [], 0\n    by_file = Window.partitionBy('file').orderBy(F.monotonically_increasing_id())\n    numbered = F.row_number().over(by_file)\n    raw = (\n        spark.read.text(files)\n        .withColumn('file', F.input_file_name())\n        .withColumn('line_no', numbered)\n        .withColumnRenamed('value', 'raw')\n        .withColumn('run_id', F.lit(run_id))\n    )\n    path = F.regexp_replace('file', '^file:', '').alias('file')\n    rows = raw.select('run_id', path, 'line_no', 'raw')\n    rows.write.format('delta').mode('append').save(config.BRONZE)\n    n = rows.count()\n    ledger = spark.createDataFrame([(f, run_id) for f in files], 'file string, run_id string')\n    ledger.write.format('delta').mode('append').save(config.LEDGER)\n    return files, n\n",
  "lakehouse/config.py": "\"\"\"Paths and rules of the Brewline lakehouse.\n\nEverything lives under one folder, LAKEHOUSE_HOME, so that a test or a run never touches\nanything else.\n\"\"\"\n\nimport os\n\n\ndef set_home(path):\n    \"\"\"Points every path at another folder.\n\n    The modules read these names when they run, so a test can use a folder of its own.\n    \"\"\"\n    global ROOT, LANDING, BRONZE, LEDGER, SILVER, QUARANTINE, GOLD\n    ROOT = path\n    LANDING = os.path.join(ROOT, 'landing', 'orders')\n    BRONZE = os.path.join(ROOT, 'bronze', 'orders_raw')\n    LEDGER = os.path.join(ROOT, 'bronze', 'ingested_files')\n    SILVER = os.path.join(ROOT, 'silver', 'orders')\n    QUARANTINE = os.path.join(ROOT, 'silver', 'quarantine')\n    GOLD = os.path.join(ROOT, 'gold', 'daily_revenue')\n\n\nset_home(os.environ.get('LAKEHOUSE_HOME', os.path.abspath('lakehouse_data')))\n\nSTORES = list(range(1, 13))\nSTATUSES = ['PLACED', 'SHIPPED', 'REFUNDED']\nEXPECTED_FIELDS = ['order_id', 'store_id', 'status', 'amount_cents', 'event_time', 'lines']\n",
  "lakehouse/gold.py": "\"\"\"Gold: revenue and orders for each day and store, without the refunded orders.\n\nA day is the date when the order was placed. Only the days of the orders that a run touched\nare recomputed (a refund restates the day of its order), and each day is replaced as a\nwhole, so a repeat changes nothing.\n\"\"\"\n\nfrom pyspark.sql import functions as F\n\nfrom . import config\n\n\ndef refresh(spark, dates):\n    \"\"\"Recomputes the given days (a list of 'YYYY-MM-DD') from silver.\n\n    Returns the number of rows written.\n    \"\"\"\n    if not dates:\n        return 0\n    silver = spark.read.format('delta').load(config.SILVER)\n    live = silver.where(F.col('order_date').isin(dates) & (F.col('status') != 'REFUNDED'))\n    orders, revenue = F.count('*').alias('orders'), F.sum('amount_cents').alias('revenue_cents')\n    daily = live.groupBy('order_date', 'store_id').agg(orders, revenue)\n    predicate = 'order_date IN (%s)' % ', '.join(\"'%s'\" % d for d in dates)\n    writer = daily.write.format('delta').mode('overwrite')\n    writer.option('replaceWhere', predicate).save(config.GOLD)\n    return daily.count()\n",
  "lakehouse/landing.py": "\"\"\"The landing zone: JSON-lines files of order events, as a source system would drop them.\n\nA stand-in for the source, with fixed rules and no random numbers.\n\nDay 1 is mostly clean, with a few dirty lines on purpose. Day 2 brings new orders, status\nchanges (one of them a refund), and a file that is delivered twice. Day 3 adds a field that\nnobody announced, an amount that is text, and an old event of order 5 that arrives late,\nafter the update that it must not undo.\n\"\"\"\n\nimport datetime\nimport json\nimport os\n\nDAY1 = datetime.datetime(2026, 3, 1, tzinfo=datetime.timezone.utc)\nSKUS = ['MUG', 'BEANS-250', 'FILTER', 'GRINDER']\n\n\ndef when(day, minute):\n    moment = DAY1 + datetime.timedelta(days=day - 1, minutes=minute)\n    return moment.strftime('%Y-%m-%dT%H:%M:%SZ')\n\n\ndef event(i, day, status='PLACED', minute=None, **override):\n    e = {\n        'order_id': i,\n        'store_id': 1 + (i * 7) % 12,\n        'status': status,\n        'amount_cents': 1000 + (i * 37) % 9000,\n        'event_time': when(day, i % 1440 if minute is None else minute),\n        'lines': [{'sku': SKUS[(i + k) % 4], 'qty': 1 + (i + k) % 3} for k in range(1 + i % 3)],\n    }\n    e.update(override)\n    return e\n\n\ndef lines(events):\n    return [json.dumps(e, sort_keys=True) for e in events]\n\n\ndef day1():\n    ev = [event(i, 1) for i in range(1, 301)]\n    # a negative amount, an unknown status, an unknown store, and a duplicate of order 7\n    ev += [\n        event(301, 1, amount_cents=-500),\n        event(302, 1, status='LOST'),\n        event(303, 1, store_id=99),\n        event(7, 1),\n    ]\n    # a line that is cut in the middle\n    cut = '{\"order_id\": 304, \"store_id\": 3, \"status\": \"PLAC'\n    return lines(ev) + [cut]\n\n\ndef day2():\n    new = lines([event(i, 2) for i in range(305, 421)])\n    # 40 orders ship, and order 41 is refunded\n    shipped = [event(i, 2, status='SHIPPED', minute=600 + i) for i in range(1, 41)]\n    changes = lines(shipped + [event(41, 2, status='REFUNDED', minute=700)])\n    # the first file of day 1 is delivered again\n    return {'part-0002.json': new + changes, 'replay-part-0001.json': day1()}\n\n\ndef day3():\n    ev = [event(i, 3) for i in range(421, 501)]\n    for e in ev[:20]:\n        # a new field that nobody announced\n        e['coupon'] = 'SPRING'\n    # two amounts that are text\n    ev += [event(501, 3, amount_cents='12.50'), event(502, 3, amount_cents='9.99')]\n    # an old event of order 5, delivered late\n    ev.append(event(5, 1, minute=3))\n    return lines(ev)\n\n\ndef files_for_day(day):\n    \"\"\"The files that arrive on a day, as a dict from the name of the file to its lines.\"\"\"\n    if day == 1:\n        return {'part-0001.json': day1()}\n    if day == 2:\n        return day2()\n    if day == 3:\n        return {'part-0001.json': day3()}\n    raise ValueError('the pretend source has three days')\n\n\ndef write_day(day, landing):\n    \"\"\"Writes the files of a day into the landing zone: landing/date=YYYY-MM-DD/<file>.\n\n    Returns the paths.\n    \"\"\"\n    folder = os.path.join(landing, 'date=' + when(day, 0)[:10])\n    os.makedirs(folder, exist_ok=True)\n    paths = []\n    for name, content in sorted(files_for_day(day).items()):\n        path = os.path.join(folder, name)\n        with open(path, 'w') as f:\n            f.write('\\n'.join(content) + '\\n')\n        paths.append(path)\n    return paths\n",
  "lakehouse/quality.py": "\"\"\"The quality gate: the layers must agree with each other.\n\nIt returns the checks, and the run fails when one of them does.\n\"\"\"\n\nimport json\n\nfrom pyspark.sql import functions as F\n\nfrom . import config\n\n\ndef unexpected_fields(spark, run_id):\n    \"\"\"Fields in the raw text of this run that are not in the contract.\n\n    A warning, because bronze keeps the raw text and nothing is lost.\n    \"\"\"\n    bronze = spark.read.format('delta').load(config.BRONZE).where(F.col('run_id') == run_id)\n    seen = set()\n    for row in bronze.select('raw').collect():\n        try:\n            seen |= set(json.loads(row['raw']))\n        except (ValueError, TypeError):\n            continue\n    return sorted(seen - set(config.EXPECTED_FIELDS))\n\n\ndef gate(spark, run_id, stats):\n    checks = []\n    silver = spark.read.format('delta').load(config.SILVER)\n    gold = spark.read.format('delta').load(config.GOLD)\n    live = silver.where(F.col('status') != 'REFUNDED')\n\n    def check(name, got, want):\n        checks.append((name, got == want, got, want))\n\n    seen = stats['valid'] + stats['quarantined']\n    check('every bronze row of the run is valid or quarantined', seen, stats['bronze_rows'])\n    ids = silver.select('order_id').distinct().count()\n    check('silver has one row for each order', silver.count(), ids)\n    revenue = live.agg(F.sum('amount_cents')).collect()[0][0]\n    gold_revenue = gold.agg(F.sum('revenue_cents')).collect()[0][0]\n    gold_orders = gold.agg(F.sum('orders')).collect()[0][0]\n    check('gold revenue equals silver revenue without the refunded orders', gold_revenue, revenue)\n    check('gold orders equal silver orders without the refunded ones', gold_orders, live.count())\n    return checks\n",
  "lakehouse/rules.py": "\"\"\"The rules of the silver layer, as Spark column expressions.\n\nOne place for them, so that the pipeline and the tests use the same ones.\n\"\"\"\n\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.types import ArrayType, LongType, StringType, StructField, StructType\n\nfrom . import config\n\nLINE_SCHEMA = StructType([StructField('sku', StringType()), StructField('qty', LongType())])\n\nORDER_SCHEMA = StructType(\n    [\n        StructField('order_id', LongType()),\n        StructField('store_id', LongType()),\n        StructField('status', StringType()),\n        StructField('amount_cents', LongType()),\n        StructField('event_time', StringType()),\n        StructField('lines', ArrayType(LINE_SCHEMA)),\n        # Spark puts the raw text here when the record cannot be read as the schema says\n        StructField('_corrupt', StringType()),\n    ]\n)\n\nPARSE_OPTIONS = {'mode': 'PERMISSIVE', 'columnNameOfCorruptRecord': '_corrupt'}\n\n\ndef parse_json(raw):\n    \"\"\"The struct of an order from its raw text.\n\n    A record that cannot be read as the schema says gets its text in `_corrupt`.\n    \"\"\"\n    return F.from_json(raw, ORDER_SCHEMA, PARSE_OPTIONS)\n\n\ndef reason(o):\n    \"\"\"Why a parsed record is not valid, or null when it is. `o` is the struct of parse_json.\n\n    Spark does not give a null struct for a cut line: it gives a struct of nulls with the\n    text in `_corrupt`, so the order id tells the two bad cases apart.\n    \"\"\"\n    return (\n        F.when(o['_corrupt'].isNotNull() & o['order_id'].isNull(), F.lit('parse_error'))\n        .when(o['_corrupt'].isNotNull(), F.lit('bad_type'))\n        .when(o['order_id'].isNull(), F.lit('missing_order_id'))\n        .when(o['amount_cents'].isNull() | (o['amount_cents'] <= 0), F.lit('bad_amount'))\n        .when(~o['status'].isin(config.STATUSES), F.lit('bad_status'))\n        .when(~o['store_id'].isin(config.STORES), F.lit('unknown_store'))\n    )\n",
  "lakehouse/run.py": "\"\"\"One run of the lakehouse for one day of the pretend source.\n\nLand the files, ingest to bronze, build silver, refresh gold, and check.\n\nRun:   python -m lakehouse.run --day 2\nPrints what each step did, and exits with 1 when the quality gate fails.\n\"\"\"\n\nimport argparse\nimport sys\n\nfrom . import bronze, config, gold, landing, quality, silver\nfrom .spark import session\n\n\ndef run(day):\n    spark = session()\n    landing.write_day(day, config.LANDING)\n    run_id = 'day-%d' % day\n    files, n = bronze.ingest(spark, run_id)\n    out = ['day %d: %d new files, %d bronze rows' % (day, len(files), n)]\n    if not files:\n        out.append('nothing to do: every file is in the ledger')\n        return out, True\n    stats = silver.process(spark, run_id)\n    left = stats['distinct'] - stats['inserted'] - stats['updated']\n    out.append(\n        'silver: %d valid, %d quarantined; merge inserted %d, updated %d, left %d alone'\n        % (stats['valid'], stats['quarantined'], stats['inserted'], stats['updated'], left)\n    )\n    dates = stats['batch_dates']\n    out.append('gold: %d rows for %d days' % (gold.refresh(spark, dates), len(dates)))\n    extra = quality.unexpected_fields(spark, run_id)\n    if extra:\n        out.append('warning: unexpected fields in the files: ' + ', '.join(extra))\n    checks = quality.gate(spark, run_id, stats)\n    for name, ok, got, want in checks:\n        text = '' if ok else ' (expected %s)' % want\n        out.append('%s %s: %s%s' % ('PASS' if ok else 'FAIL', name, got, text))\n    return out, all(ok for _, ok, _, _ in checks)\n\n\nif __name__ == '__main__':\n    ap = argparse.ArgumentParser()\n    ap.add_argument('--day', type=int, required=True)\n    lines, ok = run(ap.parse_args().day)\n    print('\\n'.join(lines))\n    sys.exit(0 if ok else 1)\n",
  "lakehouse/silver.py": "\"\"\"Silver: the orders, parsed, validated and de-duplicated, with the latest event winning.\n\nRows that break a rule go to a quarantine table with the reason, and are never dropped. The\nmerge is safe to repeat: an event is applied only when it is newer than the one that the\ntable holds. The order date is the date of the first event that silver saw for the order,\nand an update never changes it, so an order stays on the day when it was placed.\n\"\"\"\n\nfrom delta.tables import DeltaTable\nfrom pyspark.sql import Window\nfrom pyspark.sql import functions as F\n\nfrom . import config, rules\n\n\ndef parse(spark, run_id):\n    \"\"\"The bronze rows of this run, parsed.\n\n    `o` is a struct, with the raw text in `o._corrupt` when the record cannot be read.\n    \"\"\"\n    bronze = spark.read.format('delta').load(config.BRONZE).where(F.col('run_id') == run_id)\n    parsed = bronze.withColumn('o', rules.parse_json(F.col('raw')))\n    return parsed.withColumn('reason', rules.reason(F.col('o')))\n\n\ndef process(spark, run_id):\n    \"\"\"Quarantines the bad rows, and merges the good ones into silver. Returns what it did.\"\"\"\n    parsed = parse(spark, run_id).cache()\n    total = parsed.count()\n    bad = parsed.where(F.col('reason').isNotNull())\n    quarantined = bad.select('run_id', 'file', 'line_no', 'reason', 'raw')\n    qn = quarantined.count()\n    quarantined.write.format('delta').mode('append').save(config.QUARANTINE)\n\n    good = parsed.where(F.col('reason').isNull()).select('o.*', 'file', 'line_no')\n    good = good.drop('_corrupt')\n    good = good.withColumn('event_time', F.to_timestamp('event_time'))\n    good = good.withColumn('order_date', F.to_date('event_time'))\n    order = [F.col('event_time').desc(), F.col('file').desc(), F.col('line_no').desc()]\n    latest = Window.partitionBy('order_id').orderBy(*order)\n    ranked = good.withColumn('rn', F.row_number().over(latest))\n    batch = ranked.where('rn = 1').drop('rn', 'file', 'line_no')\n    valid, distinct = good.count(), batch.count()\n\n    if not DeltaTable.isDeltaTable(spark, config.SILVER):\n        batch.limit(0).write.format('delta').partitionBy('order_date').save(config.SILVER)\n    target = DeltaTable.forPath(spark, config.SILVER)\n    # an update changes everything except the order date\n    changed = {c: 's.' + c for c in batch.columns if c != 'order_date'}\n    (\n        target.alias('t')\n        .merge(batch.alias('s'), 't.order_id = s.order_id')\n        .whenMatchedUpdate(condition='s.event_time > t.event_time', set=changed)\n        .whenNotMatchedInsertAll()\n        .execute()\n    )\n    m = target.history(1).select('operationMetrics').collect()[0][0]\n    # the days whose numbers may have changed: the order dates of this batch, as silver holds them\n    silver = spark.read.format('delta').load(config.SILVER)\n    days = silver.join(batch.select('order_id'), 'order_id').select('order_date').distinct()\n    batch_dates = sorted(r[0].isoformat() for r in days.collect())\n    parsed.unpersist()\n    return {\n        'bronze_rows': total,\n        'quarantined': qn,\n        'valid': valid,\n        'distinct': distinct,\n        'inserted': int(m['numTargetRowsInserted']),\n        'updated': int(m['numTargetRowsUpdated']),\n        'batch_dates': batch_dates,\n    }\n",
  "lakehouse/spark.py": "\"\"\"One Spark session with Delta Lake, for the pipeline and for the tests.\"\"\"\n\nfrom delta import configure_spark_with_delta_pip\nfrom pyspark.sql import SparkSession\n\nDELTA_CATALOG = 'org.apache.spark.sql.delta.catalog.DeltaCatalog'\n\n\ndef session(name='brewline-lakehouse'):\n    builder = (\n        SparkSession.builder.master('local[2]')\n        .appName(name)\n        .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')\n        .config('spark.sql.catalog.spark_catalog', DELTA_CATALOG)\n        .config('spark.sql.shuffle.partitions', '4')\n        .config('spark.ui.enabled', 'false')\n        .config('spark.ui.showConsoleProgress', 'false')\n        .config('spark.sql.session.timeZone', 'UTC')\n    )\n    spark = configure_spark_with_delta_pip(builder).getOrCreate()\n    spark.sparkContext.setLogLevel('ERROR')\n    return spark\n",
  "lakehouse/tour.py": "\"\"\"A look at what Delta Lake keeps.\n\nThe history of the silver table, the table as it was at an earlier version, and the\nquarantine by reason. Run it after a few days of the pipeline.\n\nRun:   python -m lakehouse.tour\n\"\"\"\n\nfrom delta.tables import DeltaTable\n\nfrom . import config\nfrom .spark import session\n\n\ndef read(spark, path, **options):\n    return spark.read.format('delta').options(**options).load(path)\n\n\ndef tour(spark):\n    out = ['history of silver:']\n    history = DeltaTable.forPath(spark, config.SILVER).history().orderBy('version').collect()\n    for h in history:\n        m = h['operationMetrics'] or {}\n        extra = ''\n        if h['operation'] == 'MERGE':\n            extra = ', inserted %s, updated %s' % (\n                m.get('numTargetRowsInserted', '0'),\n                m.get('numTargetRowsUpdated', '0'),\n            )\n        out.append('  version %d  %s%s' % (h['version'], h['operation'], extra))\n    out += ['', 'silver as it was at each version:']\n    for h in history:\n        old = read(spark, config.SILVER, versionAsOf=h['version'])\n        status = old.where('order_id = 5').select('status').collect()\n        order5 = status[0][0] if status else 'not there yet'\n        out.append('  version %d: %d orders, order 5 is %s' % (h['version'], old.count(), order5))\n    out += ['', 'quarantine by reason:']\n    by_reason = read(spark, config.QUARANTINE).groupBy('reason').count().orderBy('reason')\n    for r in by_reason.collect():\n        out.append('  %-14s %d' % (r['reason'], r['count']))\n    gold = read(spark, config.GOLD)\n    days = gold.select('order_date').distinct().count()\n    stores = gold.select('store_id').distinct().count()\n    out += ['', 'gold: %d rows, %d days, %d stores' % (gold.count(), days, stores)]\n    return out\n\n\nif __name__ == '__main__':\n    print('\\n'.join(tour(session())))\n",
  "requirements.txt": "pyspark==4.0.1\ndelta-spark==4.0.1\npytest\n",
  "tests/conftest.py": "import pathlib\nimport sys\n\nimport pytest\n\nsys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))\n\nfrom lakehouse import config  # noqa: E402\nfrom lakehouse.spark import session  # noqa: E402\n\n\n@pytest.fixture(scope='session')\ndef spark():\n    return session('brewline-tests')\n\n\n@pytest.fixture()\ndef home(tmp_path):\n    \"\"\"A lakehouse folder of its own for one test.\"\"\"\n    config.set_home(str(tmp_path))\n    return tmp_path\n",
  "tests/test_landing.py": "\"\"\"Tests of the pretend source. No Spark is needed.\"\"\"\n\nimport json\n\nfrom lakehouse import landing\n\n\ndef test_day_one_has_the_orders_and_the_dirty_lines_on_purpose():\n    lines = landing.files_for_day(1)['part-0001.json']\n    assert len(lines) == 305\n    # the line that is cut in the middle\n    assert sum(1 for line in lines if line.startswith('{\"order_id\": 304')) == 1\n    # the duplicate of order 7\n    parsed = [json.loads(line) for line in lines[:-1]]\n    assert sorted(e['order_id'] for e in parsed).count(7) == 2\n\n\ndef test_day_two_delivers_the_first_file_of_day_one_again():\n    files = landing.files_for_day(2)\n    assert files['replay-part-0001.json'] == landing.files_for_day(1)['part-0001.json']\n    assert len(files['part-0002.json']) == 116 + 41\n\n\ndef test_day_three_has_a_new_field_two_text_amounts_and_a_late_event():\n    events = [json.loads(line) for line in landing.files_for_day(3)['part-0001.json']]\n    assert len(events) == 80 + 2 + 1\n    # an old event of order 5\n    assert events[-1]['order_id'] == 5 and events[-1]['event_time'] < '2026-03-02'\n    assert sum(1 for e in events if 'coupon' in e) == 20\n    text_amounts = [e['amount_cents'] for e in events if isinstance(e['amount_cents'], str)]\n    assert text_amounts == ['12.50', '9.99']\n\n\ndef test_the_source_is_deterministic():\n    assert landing.files_for_day(2) == landing.files_for_day(2)\n",
  "tests/test_pipeline.py": "\"\"\"The pipeline end to end on a folder of its own: days 1 to 3, with the replay and the late event.\n\nIt starts Spark and takes about two minutes.\n\"\"\"\n\nfrom pyspark.sql import functions as F\n\nfrom lakehouse import config, run\n\n\ndef table(spark, path):\n    return spark.read.format('delta').load(path)\n\n\ndef test_three_days_with_a_replay_and_a_late_event(spark, home):\n    lines1, ok1 = run.run(1)\n    assert ok1 and table(spark, config.SILVER).count() == 300\n\n    lines2, ok2 = run.run(2)\n    assert ok2\n    silver = table(spark, config.SILVER)\n    assert silver.count() == 416\n    assert silver.where('order_id = 5').collect()[0]['status'] == 'SHIPPED'\n    # a refunded order is not in gold\n    gold_orders = table(spark, config.GOLD).agg(F.sum('orders')).collect()[0][0]\n    assert silver.where(\"status = 'REFUNDED'\").count() == 1 and gold_orders == 415\n    # the 4 dirty lines of day 1, and the same 4 in the replay\n    assert table(spark, config.QUARANTINE).count() == 8\n\n    lines3, ok3 = run.run(3)\n    assert ok3\n    # the late event did not undo the update\n    order5 = table(spark, config.SILVER).where('order_id = 5').collect()[0]['status']\n    assert order5 == 'SHIPPED'\n\n    again, ok4 = run.run(3)\n    assert ok4 and again[-1] == 'nothing to do: every file is in the ledger'\n    assert table(spark, config.SILVER).count() == 496\n",
  "tests/test_rules.py": "\"\"\"Tests of the validation rules, on a handful of records in a small Spark session.\"\"\"\n\nfrom pyspark.sql import functions as F\n\nfrom lakehouse import rules\n\n\ndef reasons(spark, texts):\n    df = spark.createDataFrame([(t,) for t in texts], 'raw string')\n    df = df.withColumn('o', rules.parse_json(F.col('raw')))\n    return [r['reason'] for r in df.withColumn('reason', rules.reason(F.col('o'))).collect()]\n\n\ndef record(**changes):\n    \"\"\"The text of an order, with some fields changed. A field set to None is left out.\"\"\"\n    fields = {\n        'order_id': 1,\n        'store_id': 3,\n        'status': 'PLACED',\n        'amount_cents': 1200,\n        'event_time': '2026-03-01T10:00:00Z',\n    }\n    fields.update(changes)\n    pairs = []\n    for key, value in fields.items():\n        if value is not None:\n            pairs.append('\"%s\": %s' % (key, '\"%s\"' % value if isinstance(value, str) else value))\n    return '{' + ', '.join(pairs) + '}'\n\n\ndef test_every_rule_names_its_reason(spark):\n    texts = [\n        record(),\n        record(amount_cents=-5),\n        record(status='LOST'),\n        record(store_id=99),\n        record(amount_cents='12.50'),\n        '{\"order_id\": 4, \"store_id\": 3, \"status\": \"PLAC',\n        record(order_id=None),\n    ]\n    assert reasons(spark, texts) == [\n        None,\n        'bad_amount',\n        'bad_status',\n        'unknown_store',\n        'bad_type',\n        'parse_error',\n        'missing_order_id',\n    ]\n\n\ndef test_a_field_that_is_not_in_the_contract_does_not_make_a_record_invalid(spark):\n    text = record()[:-1] + ', \"coupon\": \"SPRING\"}'\n    assert reasons(spark, [text]) == [None]\n"
 },
 "meta": {
  "delta": "4.0.1",
  "java": "21.0.12.1",
  "note": "Recorded by project-lakehouse/verify/capture_lakehouse.py: the real project in a temporary copy, with Spark and Delta Lake on one machine.",
  "pyspark": "4.0.1",
  "python": "3.13.18",
  "recorded_on": "2026-11-21"
 },
 "tables": {
  "history": {
   "cols": [
    "version",
    "operation",
    "inserted",
    "updated"
   ],
   "rows": [
    [
     0,
     "WRITE",
     0,
     0
    ],
    [
     1,
     "MERGE",
     300,
     0
    ],
    [
     2,
     "MERGE",
     116,
     41
    ],
    [
     3,
     "MERGE",
     80,
     0
    ]
   ]
  },
  "quarantine": {
   "cols": [
    "reason",
    "rows"
   ],
   "rows": [
    [
     "bad_amount",
     2
    ],
    [
     "bad_status",
     2
    ],
    [
     "bad_type",
     2
    ],
    [
     "parse_error",
     2
    ],
    [
     "unknown_store",
     2
    ]
   ]
  },
  "versions": {
   "cols": [
    "version",
    "orders",
    "order 5"
   ],
   "rows": [
    [
     0,
     0,
     "not there yet"
    ],
    [
     1,
     300,
     "PLACED"
    ],
    [
     2,
     416,
     "SHIPPED"
    ],
    [
     3,
     496,
     "SHIPPED"
    ]
   ]
  }
 },
 "text": {
  "run.day1": "python -m lakehouse.run --day 1\nday 1: 1 new files, 305 bronze rows\nsilver: 301 valid, 4 quarantined; merge inserted 300, updated 0, left 0 alone\ngold: 12 rows for 1 days\nPASS every bronze row of the run is valid or quarantined: 305\nPASS silver has one row for each order: 300\nPASS gold revenue equals silver revenue without the refunded orders: 1457550\nPASS gold orders equal silver orders without the refunded ones: 300",
  "run.day2": "python -m lakehouse.run --day 2\nday 2: 2 new files, 462 bronze rows\nsilver: 458 valid, 4 quarantined; merge inserted 116, updated 41, left 259 alone\ngold: 24 rows for 2 days\nPASS every bronze row of the run is valid or quarantined: 462\nPASS silver has one row for each order: 416\nPASS gold revenue equals silver revenue without the refunded orders: 2082883\nPASS gold orders equal silver orders without the refunded ones: 415",
  "run.day3": "python -m lakehouse.run --day 3\nday 3: 1 new files, 83 bronze rows\nsilver: 81 valid, 2 quarantined; merge inserted 80, updated 0, left 1 alone\ngold: 24 rows for 2 days\nwarning: unexpected fields in the files: coupon\nPASS every bronze row of the run is valid or quarantined: 83\nPASS silver has one row for each order: 496\nPASS gold revenue equals silver revenue without the refunded orders: 2679963\nPASS gold orders equal silver orders without the refunded ones: 495",
  "run.day3_again": "python -m lakehouse.run --day 3\nday 3: 0 new files, 0 bronze rows\nnothing to do: every file is in the ledger",
  "tests.run": "pytest -q tests\n7 passed",
  "tool.versions": "Spark 4.0.1 with Delta Lake 4.0.1 on Java 21.0.12.1 and Python 3.13.18",
  "tour.run": "python -m lakehouse.tour\nhistory of silver:\n  version 0  WRITE\n  version 1  MERGE, inserted 300, updated 0\n  version 2  MERGE, inserted 116, updated 41\n  version 3  MERGE, inserted 80, updated 0\n\nsilver as it was at each version:\n  version 0: 0 orders, order 5 is not there yet\n  version 1: 300 orders, order 5 is PLACED\n  version 2: 416 orders, order 5 is SHIPPED\n  version 3: 496 orders, order 5 is SHIPPED\n\nquarantine by reason:\n  bad_amount     2\n  bad_status     2\n  bad_type       2\n  parse_error    2\n  unknown_store  2\n\ngold: 36 rows, 3 days, 12 stores"
 }
};
