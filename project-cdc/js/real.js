window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "after_backlog": {
   "bronze": 387,
   "deleted": 5,
   "live": 245,
   "refunded": 1,
   "revenue": 1336770,
   "shipped": 130,
   "silver": 250,
   "silver_distinct": 250,
   "source": 245,
   "source_revenue": 1336770
  },
  "after_changes": {
   "bronze": 287,
   "deleted": 5,
   "live": 245,
   "refunded": 1,
   "revenue": 1336770,
   "shipped": 30,
   "silver": 250,
   "silver_distinct": 250,
   "source": 245,
   "source_revenue": 1336770
  },
  "after_identity": {
   "bronze": 389,
   "deleted": 5,
   "live": 245,
   "refunded": 1,
   "revenue": 1336770,
   "shipped": 132,
   "silver": 250,
   "silver_distinct": 250,
   "source": 245,
   "source_revenue": 1336770
  },
  "after_replay": {
   "bronze": 287,
   "deleted": 5,
   "live": 245,
   "refunded": 1,
   "revenue": 1336770,
   "shipped": 30,
   "silver": 250,
   "silver_distinct": 250,
   "source": 245,
   "source_revenue": 1336770
  },
  "after_snapshot": {
   "bronze": 200,
   "deleted": 0,
   "live": 200,
   "refunded": 0,
   "revenue": 943700,
   "shipped": 0,
   "silver": 200,
   "silver_distinct": 200,
   "source": 200,
   "source_revenue": 943700
  },
  "offsets": {
   "create": 200,
   "delete": 280,
   "read": 0,
   "update": 387,
   "update_full": 388
  },
  "ops": {
   "c": 50,
   "d": 5,
   "r": 200,
   "u": 134
  },
  "runs": {
   "backlog": {
    "batches": 1,
    "events": 100,
    "gate": [
     "PASS every message of the topic is in bronze: 387",
     "PASS silver has one row for each order: 250",
     "PASS the live orders of silver equal the orders of the source: 245",
     "PASS the revenue of silver equals the revenue of the source: 1336770",
     "PASS every live order of silver equals its row in the source: 0"
    ],
    "inserted": 0,
    "left": 0,
    "new_messages": 100,
    "nothing_new": false,
    "updated": 100
   },
   "changes": {
    "batches": 1,
    "events": 87,
    "gate": [
     "PASS every message of the topic is in bronze: 287",
     "PASS silver has one row for each order: 250",
     "PASS the live orders of silver equal the orders of the source: 245",
     "PASS the revenue of silver equals the revenue of the source: 1336770",
     "PASS every live order of silver equals its row in the source: 0"
    ],
    "inserted": 50,
    "left": 0,
    "new_messages": 87,
    "nothing_new": false,
    "updated": 36
   },
   "identity": {
    "batches": 1,
    "events": 2,
    "gate": [
     "PASS every message of the topic is in bronze: 389",
     "PASS silver has one row for each order: 250",
     "PASS the live orders of silver equal the orders of the source: 245",
     "PASS the revenue of silver equals the revenue of the source: 1336770",
     "PASS every live order of silver equals its row in the source: 0"
    ],
    "inserted": 0,
    "left": 0,
    "new_messages": 2,
    "nothing_new": false,
    "updated": 2
   },
   "replay": {
    "batches": 1,
    "events": 87,
    "gate": [
     "PASS every message of the topic is in bronze: 287",
     "PASS silver has one row for each order: 250",
     "PASS the live orders of silver equal the orders of the source: 245",
     "PASS the revenue of silver equals the revenue of the source: 1336770",
     "PASS every live order of silver equals its row in the source: 0"
    ],
    "inserted": 0,
    "left": 86,
    "new_messages": 0,
    "nothing_new": false,
    "updated": 0
   },
   "snapshot": {
    "batches": 1,
    "events": 200,
    "gate": [
     "PASS every message of the topic is in bronze: 200",
     "PASS silver has one row for each order: 200",
     "PASS the live orders of silver equal the orders of the source: 200",
     "PASS the revenue of silver equals the revenue of the source: 943700",
     "PASS every live order of silver equals its row in the source: 0"
    ],
    "inserted": 200,
    "left": 0,
    "new_messages": 200,
    "nothing_new": false,
    "updated": 0
   }
  },
  "slot": {
   "active_after_resume": true,
   "active_before": true,
   "active_while_stopped": false,
   "retained_dropped": true,
   "retained_grew": true
  },
  "tests": {
   "passed": 8
  },
  "topic": {
   "backlog": 387,
   "changes": 287,
   "identity": 389,
   "snapshot": 200
  }
 },
 "files": {
  ".github/workflows/ci.yml": "# NOT RUN in the walkthrough that describes this project: it is a sketch of the checks that a pull request would run.\nname: ci\non: [pull_request]\njobs:\n  tests:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with: { distribution: temurin, java-version: '21' }\n      - uses: actions/setup-python@v5\n        with: { python-version: '3.12' }\n      - run: pip install -r requirements.txt\n      - run: python -m pytest -q tests\n",
  ".gitignore": "cdc_data/\n__pycache__/\n.pytest_cache/\nspark-warehouse/\nmetastore_db/\nderby.log\n.venv/\n",
  "Makefile": "PYTHON ?= .venv/bin/python\nexport CDC_HOME ?= $(CURDIR)/cdc_data\n\nsetup:\n\tpython3 -m venv .venv && .venv/bin/pip install -r requirements.txt\n\ntest:\n\t$(PYTHON) -m pytest -q tests\n\n# the services of the pipeline on this machine (needs KAFKA_HOME and DEBEZIUM_PLUGINS, see README)\nstack:\n\t$(PYTHON) -m stack.local\n\n# read the new messages into bronze, apply them to silver, and check silver against Postgres\nrun:\n\t$(PYTHON) -m cdc.run\n\nclean:\n\trm -rf cdc_data\n",
  "README.md": "# Brewline CDC: PostgreSQL, Debezium, Kafka, Spark and Delta Lake\n\nA small change data capture pipeline for a coffee retailer, built the way a senior data engineer would defend it: the changes of the shop's database are read from its log, travel through Kafka, and become a table that always matches the database. Every change is applied once in effect, even when a message is delivered twice. A delete is a mark that an old event cannot undo. A gate compares the table with the database itself.\n\n```\nPostgres (orders)  ->  WAL + replication slot  ->  Debezium (Kafka Connect)  ->  Kafka topic\n                                                                                     |\n        silver (current state, soft deletes)  <-  stream with foreachBatch  <-  bronze (every message, as text)\n                          \\--- quality gate: silver against the rows of Postgres ---/\n```\n\nThe database is a stand-in: `db/seed.sql` and `db/changes.sql` hold a small, deterministic shop. The services run on one machine, without containers, through `stack/local.py`.\n\n## Run it\n\nYou need Java 17 or later, the PostgreSQL 16 server programs, an unpacked Apache Kafka 4.4.0, and the Debezium PostgreSQL connector 3.7.1.Final (the plugin archive of Maven Central, unpacked).\n\n```bash\nmake setup                                   # a virtual environment with pyspark 4.0.1 and delta-spark 4.0.1\nmake test                                    # 8 tests, about two minutes: the parser and the merge, with no service\nexport KAFKA_HOME=... DEBEZIUM_PLUGINS=...   # see stack/local.py for what each one is\nmake stack                                   # PostgreSQL, Kafka and Kafka Connect; prints the settings to export\n# in another terminal, with the settings that it printed exported:\npsql -U postgres -d brewline -f db/schema.sql -f db/seed.sql    # the table, the publication, the role, and 200 orders\npython connect/register.py                   # starts the connector: a snapshot, and then the changes\nmake run                                     # bronze, silver, and the gate\npsql -U postgres -d brewline -f db/changes.sql && make run      # a day of changes\npython -m cdc.run --replay-last-batch        # what a crash before the commit of a batch looks like\n```\n\n## What is in it\n\n| File | What it does |\n| --- | --- |\n| `db/schema.sql` | The `orders` table, the publication that Debezium reads, and the role of the connector |\n| `db/seed.sql`, `db/changes.sql`, `db/backlog.sql` | The shop: 200 orders, a day of inserts, updates and deletes, and 100 updates that happen while the connector is stopped |\n| `connect/orders-connector.json` | The Debezium connector: the table, the slot, the publication, a snapshot first, and JSON without a schema |\n| `connect/register.py` | Creates or updates the connector on a Connect worker |\n| `cdc/envelope.py` | The change event as Spark columns: the key, the operation, the log position and the row |\n| `cdc/bronze.py` | Reads the new messages of the topic into a Delta table, as text, with their partition and offset. A checkpoint remembers what was read |\n| `cdc/silver.py` | Keeps the latest event of each order in a batch, and merges it into silver only when its log position is newer. A delete marks the row |\n| `cdc/stream.py` | The streaming job: it reads the new rows of bronze and applies each micro-batch to silver |\n| `cdc/quality.py` | The gate: the messages of the topic are in bronze, one silver row for each order, and the live orders equal the rows of Postgres |\n| `cdc/run.py` | One run: bronze, silver, the gate, and an exit code of 1 if the gate fails |\n| `stack/local.py` | PostgreSQL, Kafka and a Connect worker with the Debezium plugin, on one machine |\n| `tests/` | The parser, and the merge: order, repeats, two events of one row in a batch, deletes |\n\n## Design decisions\n\n- **Read the log, not the table.** Debezium reads the write-ahead log through a replication slot, so it sees every update and every delete, and it does not query the table again and again.\n- **Order by the log position, not by arrival.** Every event carries the `lsn` of the log. A message that arrives twice, or after a newer one, has an `lsn` that is not newer than the row, and the merge leaves the row alone.\n- **One event for each row in a batch.** Delta Lake refuses a merge in which two source rows match one row of the table, so the batch keeps the latest event of each key first.\n- **A delete is a mark.** The row stays, with `is_deleted` and the `lsn` of the delete. If the row were removed, an old event that arrives late would insert it again.\n- **At-least-once everywhere, and a merge that is safe to repeat.** A connector that restarts can send a message again, and `foreachBatch` can run a batch again after a crash. Neither changes silver.\n- **A gate that reads the source.** The gate compares silver with the rows of Postgres, so a message that never reached Kafka makes it fail.\n- **A slot holds the log.** While the connector is stopped, Postgres keeps the log that the slot has not confirmed. That is what makes the connector safe to restart, and it is what fills the disk when nobody restarts it.\n\n## What is not covered\n\nNo schema change (adding or renaming a column), no incremental snapshot of a large table, one partition only (so no ordering question between partitions), no schema registry or Avro, no TLS or login, no cloud storage, no cluster of brokers or workers, no scheduler and no alerts. The CI workflow is a sketch that did not run.\n\nTwo limits of the design itself:\n\n- **Order is by `lsn` for one table and one partition.** Events of two tables, or of one table in two partitions, have no common order here.\n- **A new field in the table changes the events.** The parser knows five columns, and a sixth is ignored until someone adds it.\n",
  "cdc/__init__.py": "\"\"\"The Brewline change data capture pipeline: Postgres, Debezium, Kafka, Spark and Delta Lake.\"\"\"\n",
  "cdc/bronze.py": "\"\"\"Bronze: every message of the topic, as it came, with where it came from in Kafka.\n\nThe value is the text of the change event. Nothing is parsed here, so nothing can be lost here.\nA Structured Streaming checkpoint remembers the offsets that were read, so a rerun reads only\nwhat is new.\n\"\"\"\n\nimport os\n\nfrom delta.tables import DeltaTable\nfrom pyspark.sql import functions as F\n\nfrom . import config\n\n\ndef count(spark):\n    if not DeltaTable.isDeltaTable(spark, config.BRONZE):\n        return 0\n    return spark.read.format('delta').load(config.BRONZE).count()\n\n\ndef ingest(spark):\n    \"\"\"Reads the new messages of the topic into bronze, once. Returns how many it added.\"\"\"\n    before = count(spark)\n    source = (\n        spark.readStream.format('kafka')\n        .option('kafka.bootstrap.servers', config.BOOTSTRAP)\n        .option('subscribe', config.TOPIC)\n        .option('startingOffsets', 'earliest')\n        .load()\n    )\n    messages = source.select(\n        'topic',\n        'partition',\n        'offset',\n        F.col('timestamp').alias('kafka_time'),\n        F.col('value').cast('string').alias('value'),\n    )\n    query = (\n        messages.writeStream.format('delta')\n        .option('checkpointLocation', os.path.join(config.CHECKPOINTS, 'bronze'))\n        .trigger(availableNow=True)\n        .start(config.BRONZE)\n    )\n    query.awaitTermination()\n    return count(spark) - before\n\n\ndef topic_size(spark):\n    \"\"\"The number of messages that the topic holds now, from its first and its last offsets.\"\"\"\n    topic = (\n        spark.read.format('kafka')\n        .option('kafka.bootstrap.servers', config.BOOTSTRAP)\n        .option('subscribe', config.TOPIC)\n        .option('startingOffsets', 'earliest')\n        .option('endingOffsets', 'latest')\n        .load()\n    )\n    return topic.count()\n",
  "cdc/config.py": "\"\"\"Where things are. Everything that the pipeline writes lives under one folder, CDC_HOME.\"\"\"\n\nimport os\n\nBOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:9092')\nTOPIC = os.environ.get('CDC_TOPIC', 'brewline.public.orders')\n\nPG_HOST = os.environ.get('PGHOST', 'localhost')\nPG_PORT = os.environ.get('PGPORT', '5432')\nPG_URL = 'jdbc:postgresql://%s:%s/brewline' % (PG_HOST, PG_PORT)\nPG_PROPERTIES = {'user': 'postgres', 'driver': 'org.postgresql.Driver'}\n\nPACKAGES = [\n    'org.apache.spark:spark-sql-kafka-0-10_2.13:4.0.1',\n    'org.postgresql:postgresql:42.7.4',\n]\n\n\ndef set_home(path):\n    \"\"\"Points every path at another folder, so that a test or a run uses a folder of its own.\"\"\"\n    global ROOT, BRONZE, SILVER, CHECKPOINTS\n    ROOT = path\n    BRONZE = os.path.join(ROOT, 'bronze', 'orders_events')\n    SILVER = os.path.join(ROOT, 'silver', 'orders')\n    CHECKPOINTS = os.path.join(ROOT, 'checkpoints')\n\n\nset_home(os.environ.get('CDC_HOME', os.path.abspath('cdc_data')))\n",
  "cdc/envelope.py": "\"\"\"The Debezium change event, as Spark columns.\n\nWith the JSON converter and no schema, the value of a message is the envelope itself:\nbefore and after (the row), source (where it came from, with the log position `lsn`), and op\n(c create, u update, d delete, r read of the snapshot).\n\"\"\"\n\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.types import LongType, StringType, StructField, StructType\n\nROW = StructType(\n    [\n        StructField('id', LongType()),\n        StructField('store_id', LongType()),\n        StructField('status', StringType()),\n        StructField('amount_cents', LongType()),\n        StructField('updated_at', StringType()),\n    ]\n)\nSOURCE = StructType([StructField('lsn', LongType()), StructField('snapshot', StringType())])\nENVELOPE = StructType(\n    [\n        StructField('before', ROW),\n        StructField('after', ROW),\n        StructField('source', SOURCE),\n        StructField('op', StringType()),\n    ]\n)\nCOLUMNS = ['store_id', 'status', 'amount_cents', 'updated_at']\n\n\ndef parse(events):\n    \"\"\"Adds the fields of the envelope to a DataFrame with the raw text in `value`.\n\n    The key of the row is the id of the row after the change, or before it for a delete.\n    \"\"\"\n    parsed = events.withColumn('e', F.from_json('value', ENVELOPE))\n    return parsed.select(\n        'offset',\n        F.coalesce('e.after.id', 'e.before.id').alias('id'),\n        F.col('e.op').alias('op'),\n        F.col('e.source.lsn').alias('lsn'),\n        *[F.col('e.after.' + c).alias(c) for c in COLUMNS],\n    )\n",
  "cdc/quality.py": "\"\"\"The quality gate: silver must agree with the database that the events came from.\n\nUnlike a gate that compares layers with each other, this one reads the source itself, so a\nmessage that never reached Kafka makes it fail.\n\"\"\"\n\nfrom functools import reduce\n\nfrom pyspark.sql import functions as F\n\nfrom . import bronze, config\n\nCOLUMNS = ['store_id', 'status', 'amount_cents']\n\n\ndef source_orders(spark):\n    return spark.read.jdbc(config.PG_URL, 'orders', properties=config.PG_PROPERTIES)\n\n\ndef gate(spark):\n    checks = []\n    silver = spark.read.format('delta').load(config.SILVER)\n    live = silver.where(~F.col('is_deleted'))\n    source = source_orders(spark)\n\n    def check(name, got, want):\n        checks.append((name, got == want, got, want))\n\n    check('every message of the topic is in bronze', bronze.count(spark), bronze.topic_size(spark))\n    ids = silver.select('id').distinct().count()\n    check('silver has one row for each order', silver.count(), ids)\n    check('the live orders of silver equal the orders of the source', live.count(), source.count())\n    revenue = live.agg(F.sum('amount_cents')).collect()[0][0]\n    check('the revenue of silver equals the revenue of the source', revenue, total(source))\n    joined = source.alias('p').join(live.alias('s'), 'id', 'full_outer')\n    same = reduce(lambda a, b: a & b, [F.col('p.' + c) == F.col('s.' + c) for c in COLUMNS])\n    differ = joined.where(~F.coalesce(same, F.lit(False))).count()\n    check('every live order of silver equals its row in the source', differ, 0)\n    return checks\n\n\ndef total(source):\n    return source.agg(F.sum('amount_cents')).collect()[0][0]\n",
  "cdc/run.py": "\"\"\"One run of the pipeline: read the new messages into bronze, apply them to silver, check.\n\nRun:   python -m cdc.run [--replay-last-batch]\nPrints what each step did, and exits with 1 when the quality gate fails.\n--replay-last-batch removes the commit of the last silver batch first, as a crash would.\n\"\"\"\n\nimport argparse\nimport sys\n\nfrom . import bronze, quality, stream\nfrom .spark import session\n\n\ndef run(replay_last=False):\n    spark = session()\n    added = bronze.ingest(spark)\n    out = ['bronze: %d new messages' % added]\n    batches = stream.process(spark, replay_last)\n    if not batches:\n        out.append('silver: nothing new')\n    else:\n        events = sum(b['events'] for b in batches)\n        inserted = sum(b['inserted'] for b in batches)\n        updated = sum(b['updated'] for b in batches)\n        left = sum(b['distinct'] for b in batches) - inserted - updated\n        out.append(\n            'silver: %d events in %d batch(es); merge inserted %d, updated %d, left %d alone'\n            % (events, len(batches), inserted, updated, left)\n        )\n    checks = quality.gate(spark)\n    for name, ok, got, want in checks:\n        text = '' if ok else ' (expected %s)' % want\n        out.append('%s %s: %s%s' % ('PASS' if ok else 'FAIL', name, got, text))\n    return out, all(ok for _, ok, _, _ in checks)\n\n\nif __name__ == '__main__':\n    ap = argparse.ArgumentParser()\n    ap.add_argument('--replay-last-batch', action='store_true')\n    lines, ok = run(ap.parse_args().replay_last_batch)\n    print('\\n'.join(lines))\n    sys.exit(0 if ok else 1)\n",
  "cdc/silver.py": "\"\"\"Silver: the current state of every order, from the change events.\n\nA change event is applied only when its log position (lsn) is newer than the one of the row, so\na message that is delivered twice, or late, changes nothing. A delete does not remove the row: it\nmarks it, and keeps its lsn, so that an old event cannot bring the order back.\n\"\"\"\n\nimport os\n\nfrom delta.tables import DeltaTable\nfrom pyspark.sql import Window\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.types import BooleanType, LongType, StringType, StructField, StructType\n\nfrom . import config, envelope\n\nSCHEMA = StructType(\n    [\n        StructField('id', LongType()),\n        StructField('store_id', LongType()),\n        StructField('status', StringType()),\n        StructField('amount_cents', LongType()),\n        StructField('updated_at', StringType()),\n        StructField('lsn', LongType()),\n        StructField('is_deleted', BooleanType()),\n    ]\n)\n\n\ndef create_if_missing(spark):\n    if not DeltaTable.isDeltaTable(spark, config.SILVER):\n        os.makedirs(config.SILVER, exist_ok=True)\n        empty = spark.createDataFrame([], SCHEMA)\n        empty.write.format('delta').mode('overwrite').save(config.SILVER)\n\n\ndef apply_batch(spark, events):\n    \"\"\"Applies a batch of raw change events (columns `offset` and `value`) to silver.\n\n    Returns the number of events, and how many rows the merge inserted and updated.\n    \"\"\"\n    create_if_missing(spark)\n    changes = envelope.parse(events).where(F.col('id').isNotNull())\n    order = [F.col('lsn').desc(), F.col('offset').desc()]\n    latest = Window.partitionBy('id').orderBy(*order)\n    ranked = changes.withColumn('rn', F.row_number().over(latest))\n    batch = ranked.where('rn = 1').withColumn('is_deleted', F.col('op') == 'd')\n    # a delete event has no row, so the business columns keep the values that silver holds\n    keep = {c: F.coalesce('s.' + c, 't.' + c) for c in envelope.COLUMNS}\n    changed = dict(keep, lsn='s.lsn', is_deleted='s.is_deleted')\n    new_row = {c: 's.' + c for c in ['id'] + envelope.COLUMNS + ['lsn', 'is_deleted']}\n    target = DeltaTable.forPath(spark, config.SILVER)\n    (\n        target.alias('t')\n        .merge(batch.alias('s'), 't.id = s.id')\n        .whenMatchedUpdate(condition='s.lsn > t.lsn', set=changed)\n        .whenNotMatchedInsert(values=new_row)\n        .execute()\n    )\n    metrics = target.history(1).select('operationMetrics').collect()[0][0]\n    return {\n        'events': changes.count(),\n        'distinct': batch.count(),\n        'inserted': int(metrics['numTargetRowsInserted']),\n        'updated': int(metrics['numTargetRowsUpdated']),\n    }\n",
  "cdc/spark.py": "\"\"\"One Spark session with Delta Lake, the Kafka source and the Postgres driver.\"\"\"\n\nfrom delta import configure_spark_with_delta_pip\nfrom pyspark.sql import SparkSession\n\nfrom . import config\n\nDELTA_CATALOG = 'org.apache.spark.sql.delta.catalog.DeltaCatalog'\n\n\ndef session(name='brewline-cdc', packages=True):\n    builder = (\n        SparkSession.builder.master('local[2]')\n        .appName(name)\n        .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')\n        .config('spark.sql.catalog.spark_catalog', DELTA_CATALOG)\n        .config('spark.sql.shuffle.partitions', '4')\n        .config('spark.ui.enabled', 'false')\n        .config('spark.ui.showConsoleProgress', 'false')\n        .config('spark.sql.session.timeZone', 'UTC')\n    )\n    extra = config.PACKAGES if packages else []\n    spark = configure_spark_with_delta_pip(builder, extra_packages=extra).getOrCreate()\n    spark.sparkContext.setLogLevel('ERROR')\n    return spark\n",
  "cdc/stream.py": "\"\"\"The streaming job that fills silver from bronze.\n\nIt reads the new rows of bronze as a stream and applies each micro-batch to silver. With\n`availableNow` it processes what is there and stops, so that a run has an end.\n\nforeachBatch gives at-least-once: after a crash between the write and the commit of a batch, the\nsame batch runs again. The merge of silver is safe to repeat, and that is what makes it work.\n\"\"\"\n\nimport os\n\nfrom . import config, silver\n\n\ndef checkpoint():\n    return os.path.join(config.CHECKPOINTS, 'silver')\n\n\ndef forget_last_commit():\n    \"\"\"Removes the commit of the last batch, as a crash before the commit would leave it.\n\n    A checkpoint on a local disk keeps a checksum file next to each commit (`.1.crc` next to\n    `1`), and it must go too, or Spark cannot write the commit again.\n    \"\"\"\n    commits = os.path.join(checkpoint(), 'commits')\n    last = max(int(name) for name in os.listdir(commits) if name.isdigit())\n    for name in (str(last), '.%d.crc' % last):\n        path = os.path.join(commits, name)\n        if os.path.exists(path):\n            os.remove(path)\n    return last\n\n\ndef process(spark, replay_last=False):\n    \"\"\"Applies the new rows of bronze to silver. Returns what each micro-batch did.\"\"\"\n    silver.create_if_missing(spark)\n    if replay_last:\n        forget_last_commit()\n    done = []\n\n    def handle(batch, batch_id):\n        done.append(dict(silver.apply_batch(spark, batch), batch=batch_id))\n\n    query = (\n        spark.readStream.format('delta')\n        .load(config.BRONZE)\n        .writeStream.foreachBatch(handle)\n        .option('checkpointLocation', checkpoint())\n        .trigger(availableNow=True)\n        .start()\n    )\n    query.awaitTermination()\n    return done\n",
  "connect/orders-connector.json": "{\n  \"name\": \"brewline-orders\",\n  \"config\": {\n    \"connector.class\": \"io.debezium.connector.postgresql.PostgresConnector\",\n    \"tasks.max\": \"1\",\n    \"database.hostname\": \"localhost\",\n    \"database.port\": \"5432\",\n    \"database.user\": \"debezium\",\n    \"database.password\": \"not-a-real-password\",\n    \"database.dbname\": \"brewline\",\n    \"topic.prefix\": \"brewline\",\n    \"table.include.list\": \"public.orders\",\n    \"plugin.name\": \"pgoutput\",\n    \"slot.name\": \"brewline_slot\",\n    \"publication.name\": \"dbz_publication\",\n    \"publication.autocreate.mode\": \"disabled\",\n    \"snapshot.mode\": \"initial\",\n    \"tombstones.on.delete\": \"false\",\n    \"key.converter\": \"org.apache.kafka.connect.json.JsonConverter\",\n    \"key.converter.schemas.enable\": \"false\",\n    \"value.converter\": \"org.apache.kafka.connect.json.JsonConverter\",\n    \"value.converter.schemas.enable\": \"false\"\n  }\n}\n",
  "connect/register.py": "\"\"\"Registers the connector on a Kafka Connect worker, or updates it when it exists.\n\nRun:   python connect/register.py            (uses PGHOST, PGPORT and CONNECT_URL when they are set)\n\"\"\"\n\nimport json\nimport os\nimport pathlib\nimport urllib.request\n\nCONNECT_URL = os.environ.get('CONNECT_URL', 'http://localhost:8083')\n\n\ndef request(method, path, body=None):\n    data = json.dumps(body).encode() if body is not None else None\n    headers = {'Content-Type': 'application/json'}\n    req = urllib.request.Request(CONNECT_URL + path, data=data, method=method, headers=headers)\n    with urllib.request.urlopen(req, timeout=30) as response:\n        text = response.read().decode()\n        return response.status, json.loads(text) if text else None\n\n\ndef load_config():\n    path = pathlib.Path(__file__).with_name('orders-connector.json')\n    spec = json.loads(path.read_text())\n    settings = spec['config']\n    settings['database.hostname'] = os.environ.get('PGHOST', settings['database.hostname'])\n    settings['database.port'] = os.environ.get('PGPORT', settings['database.port'])\n    return spec\n\n\nif __name__ == '__main__':\n    spec = load_config()\n    status, body = request('PUT', '/connectors/%s/config' % spec['name'], spec['config'])\n    print('connector %s: HTTP %d' % (spec['name'], status))\n",
  "db/backlog.sql": "-- Work that happens while the connector is stopped: 100 orders are shipped.\nUPDATE orders\nSET status = 'SHIPPED', updated_at = timestamptz '2026-03-03 09:00:00+00' + id * interval '1 minute'\nWHERE id BETWEEN 101 AND 200;\n",
  "db/changes.sql": "-- The work of a second day in the shop. Every statement becomes change events.\n\n-- 50 new orders\nINSERT INTO orders\nSELECT i, 1 + (i * 7) % 12, 'PLACED', 1000 + (i * 37) % 9000,\n       timestamptz '2026-03-02 00:00:00+00' + (i % 1440) * interval '1 minute'\nFROM generate_series(201, 250) AS i;\n\n-- 30 orders are shipped\nUPDATE orders\nSET status = 'SHIPPED', updated_at = timestamptz '2026-03-02 10:00:00+00' + id * interval '1 minute'\nWHERE id BETWEEN 1 AND 30;\n\n-- 5 orders are deleted\nDELETE FROM orders WHERE id BETWEEN 31 AND 35;\n\n-- one order changes twice in one transaction: shipped, and then refunded\nBEGIN;\nUPDATE orders SET status = 'SHIPPED', updated_at = timestamptz '2026-03-02 11:00:00+00' WHERE id = 40;\nUPDATE orders SET status = 'REFUNDED', updated_at = timestamptz '2026-03-02 11:05:00+00' WHERE id = 40;\nCOMMIT;\n",
  "db/schema.sql": "-- The orders table of the shop's database, and what Debezium needs to read its changes.\nCREATE TABLE orders (\n    id           bigint PRIMARY KEY,\n    store_id     int         NOT NULL,\n    status       text        NOT NULL CHECK (status IN ('PLACED', 'SHIPPED', 'REFUNDED')),\n    amount_cents bigint      NOT NULL CHECK (amount_cents > 0),\n    updated_at   timestamptz NOT NULL\n);\n\n-- Debezium reads the changes of the tables of this publication, through the pgoutput plugin.\nCREATE PUBLICATION dbz_publication FOR TABLE orders;\n\n-- The role that the connector logs in with: it may read the table and open a replication slot.\nCREATE ROLE debezium WITH LOGIN REPLICATION PASSWORD 'not-a-real-password';\nGRANT SELECT ON orders TO debezium;\n",
  "db/seed.sql": "-- 200 orders, deterministic: the store and the amount come from the id.\nINSERT INTO orders\nSELECT i, 1 + (i * 7) % 12, 'PLACED', 1000 + (i * 37) % 9000,\n       timestamptz '2026-03-01 00:00:00+00' + (i % 1440) * interval '1 minute'\nFROM generate_series(1, 200) AS i;\n",
  "requirements.txt": "pyspark==4.0.1\ndelta-spark==4.0.1\npytest\n",
  "stack/__init__.py": "",
  "stack/local.py": "\"\"\"The services of the pipeline on one machine, without containers: PostgreSQL, Apache Kafka and\na Kafka Connect worker with the Debezium PostgreSQL connector.\n\nNeeds three things on the machine, found through environment variables:\n  PG_BIN            the folder of the PostgreSQL 16 server programs (default /usr/lib/postgresql/16/bin)\n  KAFKA_HOME        an unpacked Apache Kafka binary distribution (kafka_2.13-4.4.0)\n  DEBEZIUM_PLUGINS  the folder that holds debezium-connector-postgres/ (the plugin archive of\n                    Debezium 3.7.1.Final from Maven Central, unpacked)\nJava 17 or later must be installed. Everything lives in a temporary folder.\n\nRun:   python -m stack.local up      starts everything and prints the settings to export\n\"\"\"\n\nimport json\nimport os\nimport pathlib\nimport shutil\nimport signal\nimport subprocess\nimport sys\nimport tempfile\nimport time\nimport urllib.request\n\nPG_BIN = pathlib.Path(os.environ.get('PG_BIN', '/usr/lib/postgresql/16/bin'))\nKAFKA_HOME = pathlib.Path(os.environ.get('KAFKA_HOME', '.')).expanduser()\nPLUGINS = os.environ.get('DEBEZIUM_PLUGINS', '')\nPORTS = {'pg': 25432, 'kafka': 29092, 'controller': 29093, 'connect': 28083}\nPROJECT = pathlib.Path(__file__).resolve().parent.parent\n\n\ndef run(cmd, **kw):\n    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)\n\n\nclass Stack:\n    def __init__(self, work=None):\n        self.work = pathlib.Path(work or tempfile.mkdtemp(prefix='cdc-stack-'))\n        self.work.mkdir(parents=True, exist_ok=True)\n        os.chmod(self.work, 0o755)\n        self.procs = {}\n        self.pg_dir = self.work / 'pg'\n        self.pg_dir.mkdir(exist_ok=True)\n        if os.geteuid() == 0:\n            shutil.chown(self.pg_dir, 'postgres', 'postgres')\n\n    # ---- settings for the pipeline --------------------------------------------------------------\n    @property\n    def env(self):\n        return {\n            'PGHOST': 'localhost',\n            'PGPORT': str(PORTS['pg']),\n            'KAFKA_BOOTSTRAP': 'localhost:%d' % PORTS['kafka'],\n            'CONNECT_URL': 'http://localhost:%d' % PORTS['connect'],\n        }\n\n    # ---- PostgreSQL -----------------------------------------------------------------------------\n    def as_postgres(self, *cmd):\n        prefix = ['runuser', '-u', 'postgres', '--'] if os.geteuid() == 0 else []\n        return run(prefix + list(cmd))\n\n    def start_postgres(self):\n        data = self.pg_dir / 'data'\n        r = self.as_postgres(\n            PG_BIN / 'initdb',\n            '-D',\n            data,\n            '--auth=trust',\n            '-U',\n            'postgres',\n            '--encoding=UTF8',\n            '--locale=C.UTF-8',\n        )\n        assert r.returncode == 0, r.stdout + r.stderr\n        options = (\n            '-p %d -c listen_addresses=localhost -c unix_socket_directories=%s -c wal_level=logical '\n            '-c max_replication_slots=4 -c max_wal_senders=4 -c shared_buffers=64MB'\n            % (PORTS['pg'], self.pg_dir)\n        )\n        r = self.as_postgres(\n            PG_BIN / 'pg_ctl',\n            '-D',\n            data,\n            '-o',\n            options,\n            '-l',\n            self.pg_dir / 'pg.log',\n            '-w',\n            'start',\n        )\n        assert r.returncode == 0, r.stdout + r.stderr + (self.pg_dir / 'pg.log').read_text()\n        self.psql('CREATE DATABASE brewline;', db='postgres')\n\n    def psql(self, sql, db='brewline'):\n        cmd = [PG_BIN / 'psql', '-h', 'localhost', '-p', PORTS['pg'], '-U', 'postgres', '-d', db]\n        r = run(cmd + ['-v', 'ON_ERROR_STOP=1', '-At', '-F', '|', '-c', sql])\n        assert r.returncode == 0, 'psql failed: %s\\n%s' % (sql, r.stderr)\n        return r.stdout.strip()\n\n    def psql_file(self, path):\n        cmd = [\n            PG_BIN / 'psql',\n            '-h',\n            'localhost',\n            '-p',\n            PORTS['pg'],\n            '-U',\n            'postgres',\n            '-d',\n            'brewline',\n        ]\n        r = run(cmd + ['-v', 'ON_ERROR_STOP=1', '-q', '-f', path])\n        assert r.returncode == 0, 'psql failed: %s\\n%s' % (path, r.stderr)\n\n    # ---- Kafka ----------------------------------------------------------------------------------\n    def kafka_tool(self, name, *args, timeout=120):\n        env = dict(os.environ, KAFKA_HEAP_OPTS='-Xmx256m -Xms64m')\n        cmd = [KAFKA_HOME / 'bin' / (name + '.sh')] + [str(a) for a in args]\n        return run(cmd, env=env, timeout=timeout)\n\n    def start_kafka(self):\n        node = self.work / 'kafka'\n        node.mkdir(exist_ok=True)\n        props = {\n            'node.id': 1,\n            'process.roles': 'broker,controller',\n            'controller.quorum.bootstrap.servers': 'localhost:%d' % PORTS['controller'],\n            'controller.listener.names': 'CONTROLLER',\n            'listeners': 'PLAINTEXT://localhost:%d,CONTROLLER://localhost:%d'\n            % (PORTS['kafka'], PORTS['controller']),\n            'advertised.listeners': 'PLAINTEXT://localhost:%d' % PORTS['kafka'],\n            'inter.broker.listener.name': 'PLAINTEXT',\n            'listener.security.protocol.map': 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT',\n            'log.dirs': str(node / 'data'),\n            'offsets.topic.replication.factor': 1,\n            'transaction.state.log.replication.factor': 1,\n            'transaction.state.log.min.isr': 1,\n            'share.coordinator.state.topic.replication.factor': 1,\n            'share.coordinator.state.topic.min.isr': 1,\n            'group.initial.rebalance.delay.ms': 0,\n            'num.partitions': 1,\n        }\n        conf = node / 'server.properties'\n        conf.write_text(''.join('%s=%s\\n' % kv for kv in props.items()))\n        cluster_id = self.kafka_tool('kafka-storage', 'random-uuid').stdout.strip().splitlines()[-1]\n        r = self.kafka_tool(\n            'kafka-storage', 'format', '--cluster-id', cluster_id, '--config', conf, '--standalone'\n        )\n        assert r.returncode == 0, r.stdout + r.stderr\n        self.spawn('kafka', 'kafka-server-start', conf, node / 'server.out', heap='512m')\n        self.wait(\n            lambda: self.kafka_tool(\n                'kafka-broker-api-versions', '--bootstrap-server', self.env['KAFKA_BOOTSTRAP']\n            ).returncode\n            == 0,\n            'Kafka',\n        )\n\n    def spawn(self, name, tool, props, log, heap):\n        env = dict(\n            os.environ,\n            KAFKA_HEAP_OPTS='-Xmx%s -Xms%s' % (heap, heap),\n            LOG_DIR=str(self.work / (name + '-logs')),\n        )\n        cmd = [str(KAFKA_HOME / 'bin' / (tool + '.sh')), str(props)]\n        self.procs[name] = subprocess.Popen(\n            cmd, stdout=open(log, 'ab'), stderr=subprocess.STDOUT, env=env, start_new_session=True\n        )\n\n    # ---- Kafka Connect --------------------------------------------------------------------------\n    def start_connect(self, flush_ms=2000):\n        node = self.work / 'connect'\n        node.mkdir(exist_ok=True)\n        converter = 'org.apache.kafka.connect.json.JsonConverter'\n        props = {\n            'bootstrap.servers': self.env['KAFKA_BOOTSTRAP'],\n            'group.id': 'connect-brewline',\n            'key.converter': converter,\n            'value.converter': converter,\n            'key.converter.schemas.enable': 'false',\n            'value.converter.schemas.enable': 'false',\n            'offset.storage.topic': 'connect-offsets',\n            'offset.storage.replication.factor': 1,\n            'config.storage.topic': 'connect-configs',\n            'config.storage.replication.factor': 1,\n            'status.storage.topic': 'connect-status',\n            'status.storage.replication.factor': 1,\n            'offset.flush.interval.ms': flush_ms,\n            'listeners': 'http://localhost:%d' % PORTS['connect'],\n            'plugin.path': PLUGINS,\n        }\n        conf = node / 'worker.properties'\n        conf.write_text(''.join('%s=%s\\n' % kv for kv in props.items()))\n        self.spawn('connect', 'connect-distributed', conf, node / 'worker.out', heap='512m')\n        self.wait(lambda: self.connect('GET', '/connector-plugins')[0] == 200, 'Kafka Connect')\n\n    def connect(self, method, path, body=None):\n        data = json.dumps(body).encode() if body is not None else None\n        headers = {'Content-Type': 'application/json'}\n        req = urllib.request.Request(\n            self.env['CONNECT_URL'] + path, data=data, method=method, headers=headers\n        )\n        try:\n            with urllib.request.urlopen(req, timeout=30) as response:\n                text = response.read().decode()\n                return response.status, json.loads(text) if text else None\n        except Exception as error:  # noqa: BLE001\n            return getattr(error, 'code', 0), str(error)\n\n    def register_connector(self):\n        env = dict(os.environ, **self.env)\n        r = run([sys.executable, PROJECT / 'connect' / 'register.py'], env=env)\n        assert r.returncode == 0, r.stdout + r.stderr\n        return r.stdout.strip()\n\n    def wait_connector(self, state='RUNNING', timeout=90):\n        def ready():\n            code, status = self.connect('GET', '/connectors/brewline-orders/status')\n            if code != 200:\n                return False\n            states = [status['connector']['state']] + [t['state'] for t in status['tasks']]\n            return (\n                states[0] == state\n                and all(s == state for s in states[1:])\n                and (state != 'RUNNING' or len(states) > 1)\n            )\n\n        self.wait(ready, 'the connector', timeout)\n\n    # ---- the whole stack ------------------------------------------------------------------------\n    def wait(self, ready, what, timeout=120):\n        end = time.time() + timeout\n        while time.time() < end:\n            try:\n                if ready():\n                    return\n            except Exception:  # noqa: BLE001\n                pass\n            time.sleep(0.5)\n        raise TimeoutError('%s did not become ready' % what)\n\n    def start(self):\n        self.start_postgres()\n        self.start_kafka()\n        self.start_connect()\n        return self\n\n    def kill(self, name, sig=signal.SIGKILL):\n        proc = self.procs.get(name)\n        if proc and proc.poll() is None:\n            os.killpg(proc.pid, sig)\n            proc.wait(30)\n\n    def stop(self):\n        for name in ('connect', 'kafka'):\n            self.kill(name, signal.SIGTERM)\n        self.as_postgres(PG_BIN / 'pg_ctl', '-D', self.pg_dir / 'data', '-m', 'fast', '-w', 'stop')\n        shutil.rmtree(self.work, ignore_errors=True)\n\n    def __enter__(self):\n        return self.start()\n\n    def __exit__(self, *exc):\n        self.stop()\n\n\nif __name__ == '__main__':\n    stack = Stack().start()\n    print('\\n'.join('export %s=%s' % kv for kv in stack.env.items()))\n    print('# stop everything with Ctrl-C')\n    try:\n        signal.pause()\n    except KeyboardInterrupt:\n        stack.stop()\n",
  "tests/conftest.py": "import json\nimport pathlib\nimport sys\n\nimport pytest\n\nsys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))\n\nfrom cdc import config  # noqa: E402\nfrom cdc.spark import session  # noqa: E402\n\n\n@pytest.fixture(scope='session')\ndef spark():\n    # no Kafka or Postgres package: these tests need only Delta Lake\n    return session('brewline-cdc-tests', packages=False)\n\n\n@pytest.fixture()\ndef home(tmp_path):\n    \"\"\"A pipeline folder of its own for one test.\"\"\"\n    config.set_home(str(tmp_path))\n    return tmp_path\n\n\ndef event(op, order_id, lsn, **row):\n    \"\"\"The text of a Debezium change event for an order, as the JSON converter writes it.\"\"\"\n    fields = {'id': order_id, 'store_id': 3, 'status': 'PLACED', 'amount_cents': 1200}\n    fields.update(updated_at='2026-03-01T10:00:00.000000Z')\n    fields.update(row)\n    after = None if op == 'd' else fields\n    before = {'id': order_id} if op == 'd' else None\n    envelope = {'before': before, 'after': after, 'source': {'lsn': lsn, 'snapshot': 'false'}}\n    return json.dumps(dict(envelope, op=op))\n\n\ndef batch(spark, *events, first_offset=0):\n    \"\"\"A DataFrame like a micro-batch of bronze: the offset and the text of each message.\"\"\"\n    rows = [(first_offset + i, text) for i, text in enumerate(events)]\n    return spark.createDataFrame(rows, 'offset long, value string')\n",
  "tests/test_envelope.py": "\"\"\"Tests of the change event parser, on a handful of events in a small Spark session.\"\"\"\n\nfrom cdc import envelope\n\nfrom conftest import batch, event\n\n\ndef rows(spark, *events):\n    return [r.asDict() for r in envelope.parse(batch(spark, *events)).orderBy('offset').collect()]\n\n\ndef test_the_fields_of_a_create_an_update_and_a_snapshot_read(spark):\n    got = rows(\n        spark,\n        event('c', 7, 100),\n        event('u', 7, 200, status='SHIPPED'),\n        event('r', 8, 50, amount_cents=900),\n    )\n    assert [(r['op'], r['id'], r['lsn']) for r in got] == [\n        ('c', 7, 100),\n        ('u', 7, 200),\n        ('r', 8, 50),\n    ]\n    assert [r['status'] for r in got] == ['PLACED', 'SHIPPED', 'PLACED']\n    assert got[2]['amount_cents'] == 900\n\n\ndef test_a_delete_has_the_key_of_the_row_before_and_no_columns(spark):\n    got = rows(spark, event('d', 7, 300))\n    assert got[0]['id'] == 7 and got[0]['op'] == 'd' and got[0]['status'] is None\n\n\ndef test_a_message_that_is_not_an_event_has_no_key(spark):\n    got = rows(spark, 'this is not json', event('c', 7, 100))\n    assert [r['id'] for r in got] == [None, 7]\n",
  "tests/test_silver.py": "\"\"\"Tests of the merge into silver: order, repeats, deletes, and two events of one row in a batch.\"\"\"\n\nfrom cdc import config, silver\n\nfrom conftest import batch, event\n\n\ndef state(spark):\n    table = spark.read.format('delta').load(config.SILVER)\n    return {r['id']: r.asDict() for r in table.collect()}\n\n\ndef test_a_newer_event_is_applied_and_an_older_one_is_left_alone(spark, home):\n    silver.apply_batch(spark, batch(spark, event('c', 1, 100)))\n    done = silver.apply_batch(spark, batch(spark, event('u', 1, 200, status='SHIPPED')))\n    assert (done['inserted'], done['updated']) == (0, 1)\n    late = silver.apply_batch(spark, batch(spark, event('u', 1, 150, status='REFUNDED')))\n    assert (late['inserted'], late['updated']) == (0, 0)\n    assert state(spark)[1]['status'] == 'SHIPPED' and state(spark)[1]['lsn'] == 200\n\n\ndef test_a_batch_that_is_applied_twice_changes_nothing(spark, home):\n    events = [event('c', 1, 100), event('c', 2, 110), event('u', 1, 120, status='SHIPPED')]\n    silver.apply_batch(spark, batch(spark, *events))\n    before = state(spark)\n    again = silver.apply_batch(spark, batch(spark, *events))\n    assert (again['inserted'], again['updated']) == (0, 0) and state(spark) == before\n\n\ndef test_two_events_of_one_row_in_one_batch_keep_the_latest(spark, home):\n    silver.apply_batch(spark, batch(spark, event('c', 1, 100)))\n    done = silver.apply_batch(\n        spark,\n        batch(spark, event('u', 1, 200, status='SHIPPED'), event('u', 1, 300, status='REFUNDED')),\n    )\n    assert (done['events'], done['distinct'], done['updated']) == (2, 1, 1)\n    assert state(spark)[1]['status'] == 'REFUNDED'\n\n\ndef test_a_delete_marks_the_row_and_an_old_event_does_not_bring_it_back(spark, home):\n    silver.apply_batch(spark, batch(spark, event('c', 1, 100, status='SHIPPED')))\n    silver.apply_batch(spark, batch(spark, event('d', 1, 300)))\n    silver.apply_batch(spark, batch(spark, event('u', 1, 200, status='REFUNDED')))\n    row = state(spark)[1]\n    assert row['is_deleted'] is True and row['lsn'] == 300 and row['status'] == 'SHIPPED'\n\n\ndef test_the_events_of_a_snapshot_share_one_lsn(spark, home):\n    events = [event('r', i, 500, amount_cents=1000 + i) for i in range(1, 6)]\n    done = silver.apply_batch(spark, batch(spark, *events))\n    assert done['inserted'] == 5 and len(state(spark)) == 5\n"
 },
 "meta": {
  "debezium": "3.7.1.Final",
  "delta": "4.0.1",
  "java": "21.0.12.1",
  "kafka": "4.4.0",
  "note": "Recorded by project-cdc/verify/capture_cdc.py: the real project in a temporary copy, against PostgreSQL, Kafka, Kafka Connect with Debezium, and Spark with Delta Lake on one machine.",
  "postgres": "16.15",
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
     200,
     0
    ],
    [
     2,
     "MERGE",
     50,
     36
    ],
    [
     3,
     "MERGE",
     0,
     0
    ],
    [
     4,
     "MERGE",
     0,
     100
    ],
    [
     5,
     "MERGE",
     0,
     2
    ]
   ]
  }
 },
 "text": {
  "event.create": "{\n  \"before\": null,\n  \"after\": {\n    \"id\": 201,\n    \"store_id\": 4,\n    \"status\": \"PLACED\",\n    \"amount_cents\": 8437,\n    \"updated_at\": \"2026-03-02T03:21:00.000000Z\"\n  },\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"false\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": \"<origin_lsn>\"\n  },\n  \"transaction\": null,\n  \"op\": \"c\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "event.delete": "{\n  \"before\": {\n    \"id\": 31,\n    \"store_id\": 0,\n    \"status\": \"\",\n    \"amount_cents\": 0,\n    \"updated_at\": \"1970-01-01T00:00:00Z\"\n  },\n  \"after\": null,\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"false\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": \"<origin_lsn>\"\n  },\n  \"transaction\": null,\n  \"op\": \"d\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "event.read": "{\n  \"before\": null,\n  \"after\": {\n    \"id\": 1,\n    \"store_id\": 8,\n    \"status\": \"PLACED\",\n    \"amount_cents\": 1037,\n    \"updated_at\": \"2026-03-01T00:01:00.000000Z\"\n  },\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"first\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": \"<origin_lsn>\"\n  },\n  \"transaction\": null,\n  \"op\": \"r\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "event.update": "{\n  \"before\": null,\n  \"after\": {\n    \"id\": 201,\n    \"store_id\": 4,\n    \"status\": \"SHIPPED\",\n    \"amount_cents\": 8437,\n    \"updated_at\": \"2026-03-02T03:21:00.000000Z\"\n  },\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"false\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": \"<origin_lsn>\"\n  },\n  \"transaction\": null,\n  \"op\": \"u\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "event.update_full": "{\n  \"before\": {\n    \"id\": 202,\n    \"store_id\": 11,\n    \"status\": \"PLACED\",\n    \"amount_cents\": 8474,\n    \"updated_at\": \"2026-03-02T03:22:00.000000Z\"\n  },\n  \"after\": {\n    \"id\": 202,\n    \"store_id\": 11,\n    \"status\": \"SHIPPED\",\n    \"amount_cents\": 8474,\n    \"updated_at\": \"2026-03-02T03:22:00.000000Z\"\n  },\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"false\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": \"<origin_lsn>\"\n  },\n  \"transaction\": null,\n  \"op\": \"u\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "run.backlog": "python -m cdc.run\nbronze: 100 new messages\nsilver: 100 events in 1 batch(es); merge inserted 0, updated 100, left 0 alone\nPASS every message of the topic is in bronze: 387\nPASS silver has one row for each order: 250\nPASS the live orders of silver equal the orders of the source: 245\nPASS the revenue of silver equals the revenue of the source: 1336770\nPASS every live order of silver equals its row in the source: 0",
  "run.changes": "python -m cdc.run\nbronze: 87 new messages\nsilver: 87 events in 1 batch(es); merge inserted 50, updated 36, left 0 alone\nPASS every message of the topic is in bronze: 287\nPASS silver has one row for each order: 250\nPASS the live orders of silver equal the orders of the source: 245\nPASS the revenue of silver equals the revenue of the source: 1336770\nPASS every live order of silver equals its row in the source: 0",
  "run.identity": "python -m cdc.run\nbronze: 2 new messages\nsilver: 2 events in 1 batch(es); merge inserted 0, updated 2, left 0 alone\nPASS every message of the topic is in bronze: 389\nPASS silver has one row for each order: 250\nPASS the live orders of silver equal the orders of the source: 245\nPASS the revenue of silver equals the revenue of the source: 1336770\nPASS every live order of silver equals its row in the source: 0",
  "run.replay": "python -m cdc.run --replay-last-batch\nbronze: 0 new messages\nsilver: 87 events in 1 batch(es); merge inserted 0, updated 0, left 86 alone\nPASS every message of the topic is in bronze: 287\nPASS silver has one row for each order: 250\nPASS the live orders of silver equal the orders of the source: 245\nPASS the revenue of silver equals the revenue of the source: 1336770\nPASS every live order of silver equals its row in the source: 0",
  "run.snapshot": "python -m cdc.run\nbronze: 200 new messages\nsilver: 200 events in 1 batch(es); merge inserted 200, updated 0, left 0 alone\nPASS every message of the topic is in bronze: 200\nPASS silver has one row for each order: 200\nPASS the live orders of silver equal the orders of the source: 200\nPASS the revenue of silver equals the revenue of the source: 943700\nPASS every live order of silver equals its row in the source: 0",
  "tests.run": "pytest -q tests\n8 passed",
  "tool.versions": "Spark 4.0.1 with Delta Lake 4.0.1 on Java 21.0.12.1 and Python 3.13.18; PostgreSQL 16.15, Apache Kafka 4.4.0, Debezium 3.7.1.Final"
 }
};
