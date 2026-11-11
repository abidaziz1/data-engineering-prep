#!/usr/bin/env python3
"""Record what real tools do, for the Google Cloud data engineering course. Nothing here talks to Google Cloud.

No Google Cloud project, account or service could be reached where this ran, so every number below comes from software that ran on one machine, and every stand-in
is named as a stand-in:
  google-cloud-storage + gcp-storage-emulator   the real client library, talking to a small emulator that runs here (it is NOT Cloud Storage)
  google-cloud-storage, offline                 a V4 signed URL made and checked without any network
  google-cloud-bigquery, offline                the request bodies that the client would send (to_api_repr), never sent
  sqlglot + DuckDB                              BigQuery SQL translated and run in DuckDB: the SQL logic is real, the engine and the bytes are not BigQuery's
  apache-beam                                   Beam's own local runners (windows, triggers, watermarks, panes); not the Dataflow service
  google-cloud-pubsub, offline + a MODEL        library settings and defaults are real; the delivery rules are a small model written from the documentation
  functions-framework + pytest                  the wrapper that Cloud Run functions use, tested with real CloudEvents
  apache-airflow 3 + the Google provider        real DAG parsing, template rendering and local task runs (Composer runs Airflow)
  @dataform/cli                                 real compilation of a Dataform project
  checkov, check-jsonschema                     Terraform for Google Cloud scanned; Cloud Build and GitHub Actions files checked against schemas
  pyspark (local mode)                          the plan, the shuffle, small files, skew and joins (Dataproc runs Spark; no cluster here)
  gcloud and bq help pages                      flag names checked against the installed command line tools (offline)
The course says on each screen what was real and what was a stand-in.

Usage:   python3 gcp/verify/capture_gcp.py [--out gcp/js/real.js] [--only gcs,bqapi,sql,idem,beam,pubsub,fn,airflow,dataform,tf,ci,spark,cli,formats] [--json FILE]
Needs:   pip install -r dev/requirements.txt (the GCP block). Other interpreters: GCP_AIRFLOW_PYTHON (Airflow), GCP_SPARK_PYTHON (PySpark and Java 17 or 21),
         GCP_IAC_PYTHON (Checkov). npm install --prefix gcp/verify gives the Dataform compiler. A section whose tool is missing says so and is skipped.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import importlib.metadata as md
import io
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--only', default='gcs,formats,bqapi,sql,idem,beam,pubsub,fn,airflow,dataform,tf,ci,spark,cli')
ap.add_argument('--json')
args = ap.parse_args()
ONLY = set(args.only.split(','))

for k in list(os.environ):
    if k.startswith(('GOOGLE_', 'CLOUDSDK_AUTH', 'GCLOUD_')):
        del os.environ[k]                                   # the recording never touches a real credential

import brewdata                                             # noqa: E402
import warehouse as W                                       # noqa: E402

WORK = pathlib.Path(tempfile.mkdtemp(prefix='gcp-capture-'))
import atexit                                               # noqa: E402
atexit.register(lambda: shutil.rmtree(WORK, ignore_errors=True))
OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def text(key, s):
    OUT['text'][key] = s


def file(key, s):
    OUT['files'][key] = s


def counts(key, d):
    OUT['counts'][key] = d


def table(key, cols, rows):
    OUT['tables'][key] = {'cols': cols, 'rows': rows}


def version(pkg):
    try:
        return md.version(pkg)
    except md.PackageNotFoundError:
        return None


def other_python(env, label):
    """The interpreter that holds a tool which lives in its own environment, or None."""
    py = os.environ.get(env)
    if py and os.path.exists(py):
        return py
    print('  (%s: set %s to run this part)' % (label, env))
    return None


OUT['meta'].update({p: version(p) for p in ('apache-beam', 'google-cloud-storage', 'google-cloud-bigquery', 'google-cloud-pubsub', 'gcp-storage-emulator', 'functions-framework',
                                             'duckdb', 'sqlglot', 'pyarrow', 'fastavro', 'pytest', 'check-jsonschema', 'python-hcl2', 'cryptography')})
OUT['meta'].update({'python': sys.version.split()[0], 'company': 'Brewline',
                    'note': 'Recorded by gcp/verify/capture_gcp.py with real open-source tools on one machine. Nothing ran on Google Cloud: Cloud Storage is an emulator, BigQuery SQL runs '
                            'in DuckDB, Beam runs on its local runners, and the Pub/Sub delivery rules are a model.'})

SOURCE_FILES = {
    'code/warehouse.py': 'warehouse.py', 'code/loads.py': 'loads.py', 'code/bq_jobs.py': 'bq_jobs.py', 'code/gcs_demo.py': 'gcs_demo.py', 'code/beam_jobs.py': 'beam_jobs.py',
    'code/pubsub_demo.py': 'pubsub_demo.py', 'code/spark_job.py': 'spark_job.py', 'fn/main.py': 'fn/main.py', 'fn/main_bug.py': 'fn/main_bug.py', 'fn/test_main.py': 'fn/test_main.py',
    'dags/brewline_daily.py': 'dags/brewline_daily.py', 'dags/flaky_demo.py': 'dags/flaky_demo.py', 'dags/heavy_top_level.py': 'dags/heavy_top_level.py', 'dags/broken_import.py': 'dags/broken_import.py',
    'dataform/workflow_settings.yaml': 'dataform/workflow_settings.yaml', 'dataform/orders_raw.sqlx': 'dataform/definitions/sources/orders_raw.sqlx',
    'dataform/stg_orders.sqlx': 'dataform/definitions/staging/stg_orders.sqlx', 'dataform/orders.sqlx': 'dataform/definitions/curated/orders.sqlx',
    'dataform/daily_sales.sqlx': 'dataform/definitions/curated/daily_sales.sqlx', 'dataform/constants.js': 'dataform/includes/constants.js',
    'iac/main.tf': 'iac/main.tf', 'iac/main_fixed.tf': 'iac/main_fixed.tf', 'ci/cloudbuild.yaml': 'ci/cloudbuild.yaml', 'ci/deploy.yml': 'ci/deploy.yml',
}
for _key, _rel in SOURCE_FILES.items():
    if (HERE / _rel).exists():
        OUT['files'][_key] = (HERE / _rel).read_text().rstrip('\n')


def run(cmd, **kw):
    kw.setdefault('capture_output', True)
    kw.setdefault('text', True)
    return subprocess.run(cmd, **kw)


# =======================================================================================================================================
# Cloud Storage: the real client library on an emulator, and a signed URL
# =======================================================================================================================================
def sec_gcs():
    import datetime
    import gcs_demo as G
    import google.cloud.storage._signing as signing
    os.environ.pop('STORAGE_EMULATOR_HOST', None)
    # --- a signed URL: no network at all
    signing._NOW = lambda tz=None: datetime.datetime(2026, 11, 10, 2, 0, 0).replace(tzinfo=tz)
    creds, public = G.throwaway_credentials()
    url = G.signed_url(creds, 'brewline-landing-dev', 'exports/week 45/report.csv', minutes=15)
    parts = urllib.parse.urlsplit(url)
    q = {k: v[0] for k, v in urllib.parse.parse_qs(parts.query).items()}
    ok, canonical, to_sign = G.check_signature(url, public)
    bad_name, _, _ = G.check_signature(url, public, object_name='exports/week 45/other.csv')
    longer = url.replace('X-Goog-Expires=900', 'X-Goog-Expires=9000')
    bad_expiry, _, _ = G.check_signature(longer, public)
    why = {'X-Goog-Algorithm': 'how it was signed', 'X-Goog-Credential': 'who signed it, the day, and the scope', 'X-Goog-Date': 'when the URL was made (UTC)',
           'X-Goog-Expires': 'seconds the URL works after that date', 'X-Goog-SignedHeaders': 'headers the caller must send as signed', 'X-Goog-Signature': 'the signature itself'}
    rows = [[k, (q[k] if k != 'X-Goog-Signature' else '(%d hex characters)' % len(q[k])), why[k]] for k in ('X-Goog-Algorithm', 'X-Goog-Credential', 'X-Goog-Date', 'X-Goog-Expires', 'X-Goog-SignedHeaders', 'X-Goog-Signature')]
    table('gcs.signed_params', ['Query parameter', 'Value', 'What it says'], rows)
    text('gcs.signed_host_path', parts.netloc + parts.path)
    text('gcs.signed_canonical', canonical.replace('X-Goog-Credential=reader%40brewline-dev.iam.gserviceaccount.com%2F', 'X-Goog-Credential=reader%40...%2F'))
    text('gcs.signed_to_sign', to_sign)
    counts('gcs.signed', {'algorithm': q['X-Goog-Algorithm'], 'expires_seconds': int(q['X-Goog-Expires']), 'signature_hex_chars': len(q['X-Goog-Signature']), 'verified_with_public_key': ok,
                          'other_object_name_verifies': bad_name, 'longer_expiry_verifies': bad_expiry, 'signed_headers': q['X-Goog-SignedHeaders'], 'network_used': False,
                          'date': q['X-Goog-Date']})
    # --- the emulator
    from gcp_storage_emulator.server import create_server
    with socket.socket() as s:
        s.bind(('localhost', 0))
        port = s.getsockname()[1]
    server = create_server('localhost', port, in_memory=True)
    server.start()
    os.environ['STORAGE_EMULATOR_HOST'] = 'http://localhost:%d' % port
    try:
        from google.api_core.exceptions import NotFound
        client = G.anonymous_client()
        bucket = G.land_files(client, 'brewline-landing-dev')
        calls = [('', '/'), ('orders/', '/'), ('orders/dt=2026-11-10/', '/'), ('orders/', None)]
        rows = []
        for prefix, delim in calls:
            r = G.list_like_folders(client, 'brewline-landing-dev', prefix, delim)
            rows.append([prefix or '(empty)', delim or '(none)', len(r['objects']), ', '.join(r['objects']) or '-', ', '.join(r['prefixes']) or '-'])
        table('gcs.listing', ['prefix', 'delimiter', 'objects', 'object names', 'prefixes ("folders")'], rows)
        # --- what the client sends for a create-only write, and what the emulator does with it
        sent = []
        original = client._http.request

        def tap(method, url, *a, **kw):
            sent.append((method, url))
            return original(method, url, *a, **kw)
        client._http.request = tap
        again = bucket.blob('orders/dt=2026-11-10/part-0000.json')
        refused = False
        try:
            again.upload_from_string(b'{"order_id": 99}\n', if_generation_match=0)
        except Exception as err:                            # real Cloud Storage refuses with 412 Precondition Failed
            refused = type(err).__name__
        client._http.request = original
        upload_urls = [u for m, u in sent if 'upload/storage' in u]
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(upload_urls[0]).query) if upload_urls else {}
        counts('gcs.precondition', {'sent_parameter': 'ifGenerationMatch=%s' % query.get('ifGenerationMatch', ['?'])[0], 'emulator_refused': bool(refused), 'emulator_error': refused or None,
                                    'emulator_location_asked': 'asia-southeast1', 'emulator_location_answered': bucket.location,
                                    'real_service_answer': 'documentation: HTTP 412 Precondition Failed'})
        # --- generations, hashes, compose, copy, delete
        blob = bucket.blob('exports/week-45/report.csv')
        blob.reload()
        first_gen = blob.generation
        blob.upload_from_string(b'store_id,total\ns01,460\n', content_type='text/csv')
        blob.reload()
        counts('gcs.generations', {'overwrite_makes_a_new_generation': blob.generation != first_gen, 'generation_digits': len(str(blob.generation)), 'size_after': blob.size})
        payload = b'order_id,total_cents\n1,450\n2,520\n'
        probe = bucket.blob('probe/payload.csv')
        probe.upload_from_string(payload, content_type='text/csv')
        probe.reload()
        import base64
        import google_crc32c
        own_crc = base64.b64encode(google_crc32c.Checksum(payload).digest()).decode()
        own_md5 = base64.b64encode(hashlib.md5(payload).digest()).decode()
        counts('gcs.hashes', {'bytes': len(payload), 'crc32c': probe.crc32c, 'md5': probe.md5_hash, 'crc32c_matches_own': probe.crc32c == own_crc, 'md5_matches_own': probe.md5_hash == own_md5})
        a, b = bucket.get_blob('orders/dt=2026-11-10/part-0001.json'), bucket.get_blob('orders/dt=2026-11-10/part-0002.json')
        whole = bucket.blob('orders/dt=2026-11-10/combined.json')
        whole.compose([a, b])
        whole.reload()
        copy = bucket.copy_blob(a, bucket, 'archive/part-0001.json')
        bucket.delete_blob('archive/part-0001.json')
        gone = bucket.get_blob('archive/part-0001.json')
        counts('gcs.operations', {'compose_size_equals_sum': whole.size == a.size + b.size, 'copy_name': copy.name, 'deleted_then_missing': gone is None})
        text('gcs.lifecycle', json.dumps(G.lifecycle_rules(), indent=1))
    finally:
        server.stop()
        os.environ.pop('STORAGE_EMULATOR_HOST', None)


# =======================================================================================================================================
# File formats: the same orders written six ways
# =======================================================================================================================================
def sec_formats():
    import fastavro
    import pyarrow as pa
    import pyarrow.csv as pacsv
    import pyarrow.orc as paorc
    import pyarrow.parquet as pq
    rows = brewdata.flat_orders(n=100000)
    tbl = pa.Table.from_pylist(rows)
    d = WORK / 'formats'
    d.mkdir(exist_ok=True)
    sizes = []

    def add(name, nbytes, note):
        sizes.append([name, nbytes, note])
    buf = io.BytesIO()
    pacsv.write_csv(tbl, buf)
    csv_bytes = buf.getvalue()
    add('CSV', len(csv_bytes), 'text, no types, no schema')
    add('CSV, gzip', len(gzip.compress(csv_bytes, compresslevel=6, mtime=0)), 'gzip cannot be split: one reader per file')
    lines = ('\n'.join(json.dumps({k: (v.isoformat() if isinstance(v, dt.datetime) else v) for k, v in r.items()}) for r in rows) + '\n').encode()
    add('JSON lines', len(lines), 'text, names repeated on every row')
    add('JSON lines, gzip', len(gzip.compress(lines, compresslevel=6, mtime=0)), 'gzip cannot be split')
    schema = fastavro.parse_schema({'type': 'record', 'name': 'order', 'fields': [
        {'name': 'order_id', 'type': 'long'}, {'name': 'store_id', 'type': 'string'}, {'name': 'customer_id', 'type': ['null', 'string']},
        {'name': 'order_ts', 'type': {'type': 'long', 'logicalType': 'timestamp-micros'}}, {'name': 'status', 'type': 'string'}, {'name': 'channel', 'type': 'string'},
        {'name': 'total_cents', 'type': 'long'}]})
    for codec in ('null', 'deflate'):
        fo = io.BytesIO()
        fastavro.writer(fo, schema, rows, codec=codec)
        add('Avro (%s)' % ('no compression' if codec == 'null' else 'deflate'), len(fo.getvalue()), 'rows, with the schema inside')
    for codec in ('none', 'snappy', 'zstd'):
        p = d / ('orders_%s.parquet' % codec)
        pq.write_table(tbl, p, compression=codec, row_group_size=50000)
        add('Parquet (%s)' % ('no compression' if codec == 'none' else codec), p.stat().st_size, 'columns, with the schema and statistics inside')
    p = d / 'orders.orc'
    paorc.write_table(tbl, str(p), compression='zstd')
    add('ORC (zstd)', p.stat().st_size, 'columns, with the schema inside')
    csv_size = sizes[0][1]
    for r in sizes:
        r.insert(2, round(r[1] / csv_size, 3))
    table('formats.sizes', ['format', 'bytes', 'share of the CSV', 'what it is'], sizes)
    meta = pq.ParquetFile(d / 'orders_snappy.parquet').metadata
    colbytes = {meta.schema.names[i]: sum(meta.row_group(g).column(i).total_compressed_size for g in range(meta.num_row_groups)) for i in range(meta.num_columns)}
    total = sum(colbytes.values())
    want = ('store_id', 'total_cents')
    counts('formats.column_read', {'rows': meta.num_rows, 'row_groups': meta.num_row_groups, 'columns': meta.num_columns, 'file_bytes': (d / 'orders_snappy.parquet').stat().st_size,
                                   'column_chunk_bytes': colbytes, 'two_columns': list(want), 'two_columns_bytes': sum(colbytes[c] for c in want), 'two_columns_share': round(sum(colbytes[c] for c in want) / total, 3)})
    counts('formats.stats', {'order_id_min': meta.row_group(0).column(0).statistics.min, 'order_id_max': meta.row_group(0).column(0).statistics.max, 'rows_in_first_group': meta.row_group(0).num_rows})


# =======================================================================================================================================
# What the BigQuery client library would send
# =======================================================================================================================================
def sec_bqapi():
    import bq_jobs
    b = bq_jobs.bodies()
    for name, body in b.items():
        file('bq/%s.json' % name, json.dumps(body, indent=1))
    counts('bq.summary', {
        'partitioning': b['table']['timePartitioning'], 'clustering': b['table']['clustering']['fields'], 'require_partition_filter': b['table']['requirePartitionFilter'],
        'dataset_location': b['dataset']['location'], 'dataset_time_travel_hours': b['dataset']['maxTimeTravelHours'], 'dataset_billing_model': b['dataset']['storageBillingModel'],
        'load': b['load']['load'], 'query_max_bytes_billed': b['query']['query']['maximumBytesBilled'], 'query_priority': b['query']['query']['priority'], 'query_labels': b['query']['labels'],
        'dry_run_flag': b['dry_run']['dryRun'], 'external_hive': b['external']['externalDataConfiguration']['hivePartitioningOptions'], 'policy_tag_names': b['policy_tag_field']['policyTags']['names']})
    # a table's column order and the schema, as the library holds them
    from google.cloud import bigquery
    modes = [(f.name, f.field_type, f.mode) for f in bq_jobs.orders_table().schema]
    table('bq.schema', ['column', 'type', 'mode'], [list(m) for m in modes])
    counts('bq.dispositions', {'write': [x for x in dir(bigquery.WriteDisposition) if x.isupper()], 'create': [x for x in dir(bigquery.CreateDisposition) if x.isupper()],
                               'schema_update': [x for x in dir(bigquery.SchemaUpdateOption) if x.isupper()], 'source_formats': ['AVRO', 'PARQUET', 'ORC', 'CSV', 'NEWLINE_DELIMITED_JSON'],
                               'source_format_names_exist': all(hasattr(bigquery.SourceFormat, n) for n in ('AVRO', 'PARQUET', 'ORC', 'CSV', 'NEWLINE_DELIMITED_JSON'))})


# =======================================================================================================================================
# BigQuery SQL, run in DuckDB after sqlglot translates it
# =======================================================================================================================================
SCALE = 20000                                      # the lessons picture the sample table 20,000 times bigger: 400 million orders


def sec_sql():
    wh = W.Warehouse()
    rows = brewdata.orders()
    raw = brewdata.raw_orders(rows)
    wh.load('curated', 'orders', rows)
    wh.load('raw', 'orders_raw', raw)
    wh.load('curated', 'customers', brewdata.customers())
    wh.load('curated', 'stores', brewdata.stores())
    T = '"brewline-dev".curated.orders'
    cnt = lambda sql: wh.scalar(sql)
    counts('sql.world', {'orders': len(rows), 'raw_deliveries': len(raw), 'duplicate_deliveries': len(raw) - len(rows), 'days': 14, 'stores': len(brewdata.STORES),
                         'customers': brewdata.N_CUSTOMERS, 'guest_share': round(cnt("SELECT COUNTIF(customer_id IS NULL) / COUNT(*) FROM `brewline-dev.curated.orders`"), 3),
                         's01_share': round(cnt("SELECT COUNTIF(store_id = 's01') / COUNT(*) FROM `brewline-dev.curated.orders`"), 3), 'scale': SCALE, 'scaled_orders': len(rows) * SCALE})

    # --- QUALIFY: keep the latest delivery of each order
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.orders_dedup` AS SELECT * EXCEPT (ingest_ts) FROM `brewline-dev.raw.orders_raw` "
           "QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1")
    twice = wh.run("SELECT order_id, COUNT(*) AS deliveries, ARRAY_AGG(status ORDER BY ingest_ts) AS statuses FROM `brewline-dev.raw.orders_raw` GROUP BY order_id HAVING COUNT(*) > 1 ORDER BY order_id LIMIT 5")
    table('sql.redelivered', ['order_id', 'deliveries', 'statuses in order of arrival'], [[r[0], r[1], ' then '.join(r[2])] for r in twice[1]])
    counts('sql.dedup', {'raw_rows': len(raw), 'after_qualify': cnt("SELECT COUNT(*) FROM `brewline-dev.staging.orders_dedup`"), 'distinct_ids': cnt("SELECT COUNT(DISTINCT order_id) FROM `brewline-dev.raw.orders_raw`"),
                         'ids_delivered_twice': cnt("SELECT COUNT(*) FROM (SELECT order_id FROM `brewline-dev.raw.orders_raw` GROUP BY order_id HAVING COUNT(*) > 1)"),
                         'new_became_paid_on_second_delivery': cnt("SELECT COUNT(*) FROM (SELECT order_id FROM `brewline-dev.raw.orders_raw` GROUP BY order_id HAVING COUNT(*) > 1 AND ARRAY_AGG(status ORDER BY ingest_ts)[OFFSET(0)] = 'NEW' AND ARRAY_AGG(status ORDER BY ingest_ts DESC)[OFFSET(0)] = 'PAID')")})

    # --- time zones: the UTC day against the Singapore day
    d = wh.run("SELECT DATE(order_ts) AS utc_day, DATE(order_ts, 'Asia/Singapore') AS sg_day, COUNT(*) AS orders FROM `brewline-dev.curated.orders` GROUP BY 1, 2 HAVING DATE(order_ts) = DATE '2026-11-05' OR DATE(order_ts, 'Asia/Singapore') = DATE '2026-11-05' ORDER BY 1, 2")
    table('sql.days', ['UTC day', 'Singapore day', 'orders'], [[str(r[0]), str(r[1]), r[2]] for r in d[1]])

    # --- UNNEST and windows
    u = wh.run("SELECT i.sku, SUM(i.qty) AS units, SUM(i.qty * i.unit_cents) AS revenue_cents FROM `brewline-dev.curated.orders` AS o, UNNEST(o.items) AS i WHERE o.status = 'PAID' GROUP BY i.sku ORDER BY revenue_cents DESC LIMIT 5")
    table('sql.unnest', ['sku', 'units', 'revenue_cents'], u[1])
    w = wh.run("SELECT country, store_id, revenue_cents, rnk FROM (SELECT s.country, o.store_id, SUM(o.total_cents) AS revenue_cents, RANK() OVER (PARTITION BY s.country ORDER BY SUM(o.total_cents) DESC) AS rnk "
               "FROM `brewline-dev.curated.orders` AS o JOIN `brewline-dev.curated.stores` AS s USING (store_id) WHERE o.status = 'PAID' GROUP BY s.country, o.store_id) WHERE rnk = 1 ORDER BY revenue_cents DESC")
    table('sql.top_store', ['country', 'store_id', 'revenue_cents', 'rank'], w[1])
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.s12_orders` AS SELECT * FROM `brewline-dev.curated.orders` WHERE store_id = 's12' AND DATE(order_ts) != DATE '2026-11-06'")
    g = wh.run("WITH calendar AS (SELECT d FROM UNNEST(GENERATE_DATE_ARRAY(DATE '2026-10-28', DATE '2026-11-10')) AS d), daily AS (SELECT DATE(order_ts) AS d, COUNT(*) AS orders "
               "FROM `brewline-dev.staging.s12_orders` GROUP BY d) SELECT calendar.d, IFNULL(daily.orders, 0) AS orders FROM calendar LEFT JOIN daily USING (d) WHERE IFNULL(daily.orders, 0) = 0 ORDER BY 1")
    table('sql.gaps', ['day with no orders from store s12', 'orders'], [[str(r[0]), r[1]] for r in g[1]])

    # --- SCD type 2 with MERGE, run twice
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.curated.dim_customer` (customer_id STRING, loyalty_tier STRING, valid_from DATE, valid_to DATE, is_current BOOL)")
    wh.run("INSERT INTO `brewline-dev.curated.dim_customer` VALUES ('c0001','none',DATE '2026-01-01',DATE '9999-12-31',TRUE),('c0002','silver',DATE '2026-01-01',DATE '9999-12-31',TRUE),('c0003','gold',DATE '2026-01-01',DATE '9999-12-31',TRUE)")
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.customer_feed` AS SELECT * FROM (VALUES ('c0001','silver'),('c0002','silver'),('c0003','gold'),('c0004','none')) AS t(customer_id, loyalty_tier)")
    scd2 = """
MERGE `brewline-dev.curated.dim_customer` AS t
USING (
  SELECT f.customer_id AS merge_key, f.customer_id, f.loyalty_tier FROM `brewline-dev.staging.customer_feed` AS f
  UNION ALL
  SELECT NULL AS merge_key, f.customer_id, f.loyalty_tier FROM `brewline-dev.staging.customer_feed` AS f
    JOIN `brewline-dev.curated.dim_customer` AS d ON d.customer_id = f.customer_id AND d.is_current AND d.loyalty_tier != f.loyalty_tier
) AS s
ON t.customer_id = s.merge_key AND t.is_current
WHEN MATCHED AND t.loyalty_tier != s.loyalty_tier THEN UPDATE SET is_current = FALSE, valid_to = DATE '2026-11-10'
WHEN NOT MATCHED THEN INSERT (customer_id, loyalty_tier, valid_from, valid_to, is_current) VALUES (s.customer_id, s.loyalty_tier, DATE '2026-11-10', DATE '9999-12-31', TRUE)
"""
    snaps = []
    for label in ('after the first run', 'after the second run'):
        wh.run(scd2)
        snaps.append((label, wh.run("SELECT customer_id, loyalty_tier, CAST(valid_from AS STRING), CAST(valid_to AS STRING), is_current FROM `brewline-dev.curated.dim_customer` ORDER BY customer_id, valid_from")[1]))
    file('sql/scd2.sql', scd2.strip())
    table('sql.scd2_first', ['customer_id', 'loyalty_tier', 'valid_from', 'valid_to', 'is_current'], snaps[0][1])
    counts('sql.scd2', {'rows_after_first': len(snaps[0][1]), 'rows_after_second': len(snaps[1][1]), 'second_run_changes_nothing': snaps[0][1] == snaps[1][1]})

    # --- checks written as queries that return rows when something is wrong (the idea behind Dataform assertions)
    checks = [
        ('no duplicate order ids', "SELECT order_id FROM `brewline-dev.curated.orders` GROUP BY order_id HAVING COUNT(*) > 1", False),
        ('no null keys', "SELECT * FROM `brewline-dev.curated.orders` WHERE order_id IS NULL OR order_ts IS NULL OR store_id IS NULL", False),
        ('every store exists', "SELECT DISTINCT o.store_id FROM `brewline-dev.curated.orders` AS o LEFT JOIN `brewline-dev.curated.stores` AS s USING (store_id) WHERE s.store_id IS NULL", False),
        ('totals are not negative', "SELECT order_id FROM `brewline-dev.curated.orders` WHERE total_cents < 0", False),
        ('the raw layer holds repeats (that is why we dedupe)', "SELECT order_id FROM `brewline-dev.raw.orders_raw` GROUP BY order_id HAVING COUNT(*) > 1", True),
    ]
    verdict = lambda n, expect: ('as expected' if n else 'FAIL: nothing found') if expect else ('pass' if not n else 'FAIL')
    table('sql.checks', ['check', 'rows returned', 'verdict'], [[n, len(wh.run(q)[1]), verdict(len(wh.run(q)[1]), e)] for n, q, e in checks])

    # --- the NULL trap: NOT IN against a list that holds a NULL (guest orders have no customer id)
    not_in = cnt("SELECT COUNT(*) FROM `brewline-dev.curated.customers` WHERE customer_id NOT IN (SELECT customer_id FROM `brewline-dev.curated.orders` WHERE status = 'REFUNDED')")
    not_exists = cnt("SELECT COUNT(*) FROM `brewline-dev.curated.customers` AS c WHERE NOT EXISTS (SELECT 1 FROM `brewline-dev.curated.orders` AS o WHERE o.customer_id = c.customer_id AND o.status = 'REFUNDED')")
    refunded_null = cnt("SELECT COUNTIF(customer_id IS NULL) FROM `brewline-dev.curated.orders` WHERE status = 'REFUNDED'")
    counts('sql.null_trap', {'customers': brewdata.N_CUSTOMERS, 'not_in_rows': not_in, 'not_exists_rows': not_exists, 'refunded_orders_without_customer': refunded_null})

    # --- what the translator changes: the BigQuery SQL and the DuckDB SQL that actually ran
    samples = ["SELECT * EXCEPT (ingest_ts) FROM `brewline-dev.raw.orders_raw` QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1",
               "SELECT COUNTIF(status = 'PAID') AS paid, SAFE_DIVIDE(COUNTIF(status = 'PAID'), COUNT(*)) AS share FROM `brewline-dev.curated.orders`",
               "SELECT d FROM UNNEST(GENERATE_DATE_ARRAY(DATE '2026-11-08', DATE '2026-11-11')) AS d",
               "SELECT order_id FROM `brewline-dev.curated.orders` ORDER BY order_id LIMIT 3"]
    table('sql.translations', ['BigQuery SQL', 'DuckDB SQL that ran'], [[q, W.Warehouse.translate(q)[0]] for q in samples])

    # --- governance: a row policy is a filter on rows; a scan for personal data is a stand-in made of regular expressions; lineage is read from the SQL text
    visible = cnt("SELECT COUNT(*) FROM `brewline-dev.curated.orders` WHERE store_id = 's01'")
    counts('sql.row_policy', {'orders': len(rows), 'store': 's01', 'orders_visible_to_a_manager_of_s01': visible, 'stores_in_the_table': len(brewdata.STORES)})
    scan = []
    email_pattern, phone_pattern = r'^[^@ ]+@[^@ ]+\.[a-z]+$', r'^\+[0-9]{2} [0-9]{4} [0-9]{4}$'
    for tbl, cols in (('customers', ['customer_id', 'email', 'phone', 'loyalty_tier']), ('orders', ['store_id', 'customer_id', 'status', 'channel'])):
        for c in cols:
            q = ('SELECT COUNT(%(c)s), SUM(CASE WHEN regexp_matches(%(c)s, ?) THEN 1 ELSE 0 END), SUM(CASE WHEN regexp_matches(%(c)s, ?) THEN 1 ELSE 0 END) '
                 'FROM "brewline-dev".curated.%(t)s' % {'c': c, 't': tbl})
            r = wh.con.execute(q, [email_pattern, phone_pattern]).fetchone()
            n = r[0] or 1
            scan.append(['%s.%s' % (tbl, c), r[0], round((r[1] or 0) / n, 3), round((r[2] or 0) / n, 3)])
    table('sql.pii_scan', ['column', 'values checked', 'share that look like an e-mail address', 'share that look like a phone number'], scan)
    from sqlglot.lineage import lineage
    lin_sql = ('SELECT DATE(order_ts, "Asia/Singapore") AS sale_date, store_id, COUNT(*) AS orders, SUM(total_cents) AS revenue_cents '
               'FROM `brewline-dev.curated.orders` WHERE status IN (\'PAID\', \'REFUNDED\') GROUP BY sale_date, store_id')
    lin_schema = {'brewline-dev': {'curated': {'orders': {'order_id': 'INT64', 'store_id': 'STRING', 'customer_id': 'STRING', 'order_ts': 'TIMESTAMP', 'status': 'STRING', 'total_cents': 'INT64'}}}}
    lin_rows = []
    for col in ('sale_date', 'store_id', 'orders', 'revenue_cents'):
        node = lineage(col, lin_sql, schema=lin_schema, dialect='bigquery')
        leaves = []

        def walk(nd):
            if not nd.downstream:
                leaves.append(nd.name)
            for dn in nd.downstream:
                walk(dn)
        walk(node)
        src = [x for x in leaves if x != col]
        lin_rows.append([col, ', '.join(src) if src else '(a count of rows: no source column)'])
    table('sql.lineage', ['column of the daily table', 'comes from'], lin_rows)

    # --- leakage in a feature: a feature that includes the label window looks much better than a feature built only from the past
    leak_sql = """
SELECT COUNT(*) AS customers, AVG(label) AS label_rate, CORR(n_before, label) AS corr_clean, CORR(n_through_the_label_window, label) AS corr_leaky
FROM (
  SELECT c.customer_id, IFNULL(b.n, 0) AS n_before, IFNULL(a.n, 0) AS n_through_the_label_window, IF(IFNULL(f.n, 0) > 0, 1, 0) AS label
  FROM `brewline-dev.curated.customers` AS c
  LEFT JOIN (SELECT customer_id, COUNT(*) AS n FROM `brewline-dev.curated.orders` WHERE order_ts < TIMESTAMP '2026-11-06 00:00:00+00' GROUP BY customer_id) AS b USING (customer_id)
  LEFT JOIN (SELECT customer_id, COUNT(*) AS n FROM `brewline-dev.curated.orders` WHERE order_ts >= TIMESTAMP '2026-11-06 00:00:00+00' AND order_ts < TIMESTAMP '2026-11-10 00:00:00+00' GROUP BY customer_id) AS f USING (customer_id)
  LEFT JOIN (SELECT customer_id, COUNT(*) AS n FROM `brewline-dev.curated.orders` WHERE order_ts < TIMESTAMP '2026-11-10 00:00:00+00' GROUP BY customer_id) AS a USING (customer_id)
)
"""
    lr = wh.run(leak_sql)[1][0]
    counts('sql.leak', {'cutoff': '2026-11-06', 'label_window': '2026-11-06 to 2026-11-09', 'customers': lr[0], 'label_rate': round(lr[1], 3), 'corr_clean_feature': round(lr[2], 3), 'corr_leaky_feature': round(lr[3], 3)})
    file('sql/leak.sql', leak_sql.strip())

    # --- a stable split by key, with a stand-in for FARM_FINGERPRINT
    split = lambda key: wh.run("SELECT CASE WHEN MOD(ABS(farm_fingerprint(%s)), 10) < 8 THEN 'train' ELSE 'test' END AS part, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers "
                               "FROM `brewline-dev.curated.orders` WHERE customer_id IS NOT NULL GROUP BY part ORDER BY part" % key)[1]
    by_order, by_customer = split('CAST(order_id AS STRING)'), split('customer_id')
    both = lambda key: wh.scalar("SELECT COUNT(*) FROM (SELECT customer_id FROM `brewline-dev.curated.orders` WHERE customer_id IS NOT NULL GROUP BY customer_id "
                                 "HAVING COUNTIF(MOD(ABS(farm_fingerprint(%s)), 10) < 8) > 0 AND COUNTIF(MOD(ABS(farm_fingerprint(%s)), 10) >= 8) > 0)" % (key, key))
    counts('sql.split', {'by_order': {r[0]: {'orders': r[1], 'customers': r[2]} for r in by_order}, 'by_customer': {r[0]: {'orders': r[1], 'customers': r[2]} for r in by_customer},
                         'customers_in_both_when_split_by_order': both('CAST(order_id AS STRING)'), 'customers_in_both_when_split_by_customer': both('customer_id'),
                         'note': 'farm_fingerprint here is a stand-in hash: stable per key, but not the numbers BigQuery gives'})

    # --- the bytes a query reads: an estimate from the documented size of each data type
    sizes = W.column_sizes(wh, T, W.ORDERS_SCHEMA)
    per_col = {c: sum(sizes[day][c] for day in sizes) for c, _ in W.ORDERS_SCHEMA}
    total = sum(per_col.values())
    table('sql.column_sizes', ['column', 'type', 'bytes in the sample', 'share'], [[c, t, per_col[c], round(per_col[c] / total, 3)] for c, t in W.ORDERS_SCHEMA])
    counts('sql.storage', {'sample_logical_bytes': total, 'days': len(sizes), 'scale': SCALE, 'scaled_logical_bytes': total * SCALE, 'scaled_gib': round(total * SCALE / 1024 ** 3, 1),
                           'null_rule': 'a NULL is 0 bytes', 'string_rule': '2 bytes plus the UTF-8 length', 'fixed_rules': W.FIXED_SIZES})
    FQ = '`brewline-dev.curated.orders`'
    cases = [
        ('SELECT *', "SELECT * FROM %s" % FQ),
        ('three columns', "SELECT order_id, store_id, total_cents FROM %s" % FQ),
        ('three columns and a filter, one UTC day', "SELECT order_id, store_id, total_cents FROM %s WHERE DATE(order_ts) = DATE '2026-11-03'" % FQ),
        ('three columns and a filter, seven UTC days', "SELECT order_id, store_id, total_cents FROM %s WHERE order_ts >= TIMESTAMP '2026-11-03' AND order_ts < TIMESTAMP '2026-11-10'" % FQ),
        ('one Singapore day, filtered with DATE(ts, zone)', "SELECT order_id, store_id, total_cents FROM %s WHERE DATE(order_ts, 'Asia/Singapore') = DATE '2026-11-05'" % FQ),
        ('one Singapore day, filtered with two bounds', "SELECT order_id, store_id, total_cents FROM %s WHERE order_ts >= TIMESTAMP '2026-11-04 16:00:00+00' AND order_ts < TIMESTAMP '2026-11-05 16:00:00+00'" % FQ),
        ('LIMIT 10', "SELECT * FROM %s LIMIT 10" % FQ),
        ('filter on store only', "SELECT order_id, total_cents FROM %s WHERE store_id = 's01'" % FQ),
        ('bound from a subquery', "SELECT order_id FROM %s WHERE order_ts > (SELECT MAX(order_ts) FROM %s)" % (FQ, FQ)),
        ('item lines, one day', "SELECT o.order_id, i.sku, i.qty FROM %s AS o, UNNEST(o.items) AS i WHERE DATE(o.order_ts) = DATE '2026-11-03'" % FQ),
        ('SELECT * EXCEPT (items), one day', "SELECT * EXCEPT (items) FROM %s WHERE DATE(order_ts) = DATE '2026-11-03'" % FQ),
    ]
    est_rows, est_detail = [], {}
    for label, sql in cases:
        e = W.estimate(wh, sql, T, sizes, scale=SCALE)
        est_rows.append([label, ', '.join(e['columns']) if len(e['columns']) < 6 else '%d of %d columns' % (len(e['columns']), len(W.ORDERS_SCHEMA)), '%d of %d' % (e['partitions_read'], e['partitions_total']),
                         e['logical_bytes'], e['billed_bytes'], e['example_usd']])
        est_detail[label] = dict(e, sql=sql)
    table('sql.estimates', ['query', 'columns read', 'partitions read', 'logical bytes (x scale)', 'billed bytes (x scale)', 'example USD'], est_rows)
    counts('sql.estimate_detail', est_detail)
    counts('sql.estimate_rules', {'billing_rounding': 'rounded up to a whole MiB, at least 10 MiB per table (documentation)', 'example_price_per_tib_usd': W.EXAMPLE_PRICE_PER_TIB, 'scale': SCALE,
                                  'clustering_not_modelled': True})

    # --- the job history: a MADE-UP job log with the columns that INFORMATION_SCHEMA.JOBS has, priced with the estimates above. Nothing here came from BigQuery.
    dash_b, adhoc_b, daily_b = (est_detail[k]['billed_bytes'] for k in ('three columns', 'SELECT *', 'three columns and a filter, one UTC day'))
    day0 = dt.datetime(2026, 11, 4, tzinfo=dt.timezone.utc)
    SA = '@brewline-dev.iam.gserviceaccount.com'
    log = []
    for d in range(7):
        base = day0 + dt.timedelta(days=d)
        log.append({'creation_time': base + dt.timedelta(hours=2), 'user_email': 'sa-pipeline' + SA, 'job_type': 'QUERY', 'statement_type': 'MERGE', 'priority': 'BATCH', 'state': 'DONE',
                    'total_bytes_billed': daily_b, 'labels': [{'key': 'pipeline', 'value': 'daily_orders'}, {'key': 'env', 'value': 'prod'}]})
        for k in range(96):                                  # a dashboard that refreshes every 15 minutes and reads three columns of the whole table
            log.append({'creation_time': base + dt.timedelta(minutes=15 * k), 'user_email': 'sa-dashboard' + SA, 'job_type': 'QUERY', 'statement_type': 'SELECT', 'priority': 'INTERACTIVE',
                        'state': 'DONE', 'total_bytes_billed': dash_b, 'labels': [{'key': 'pipeline', 'value': 'dashboard_refresh'}, {'key': 'env', 'value': 'prod'}]})
        for k in range(12):                                  # analysts running SELECT *, with no labels
            log.append({'creation_time': base + dt.timedelta(hours=9, minutes=40 * k), 'user_email': 'analyst%d@example.com' % (k % 4 + 1), 'job_type': 'QUERY', 'statement_type': 'SELECT',
                        'priority': 'INTERACTIVE', 'state': 'DONE', 'total_bytes_billed': adhoc_b, 'labels': []})
    wh.load('curated', 'jobs_log', log)
    cost_sql = """
WITH jobs AS (
  SELECT
    total_bytes_billed,
    IFNULL((SELECT l.value FROM UNNEST(labels) AS l WHERE l.key = 'pipeline'), '(no label)') AS pipeline
  FROM `region-asia-southeast1`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
  WHERE creation_time >= TIMESTAMP '2026-11-04 00:00:00+00'
    AND job_type = 'QUERY'
    AND state = 'DONE'
)
SELECT
  pipeline,
  COUNT(*) AS jobs,
  ROUND(SUM(total_bytes_billed) / POW(1024, 4), 2) AS tib_billed,
  ROUND(SUM(total_bytes_billed) / POW(1024, 4) * 6.25, 2) AS example_usd
FROM jobs
GROUP BY pipeline
ORDER BY example_usd DESC
"""
    ran = cost_sql.replace('`region-asia-southeast1`.INFORMATION_SCHEMA.JOBS_BY_PROJECT', '`brewline-dev.curated.jobs_log`')
    cr = wh.run(ran)
    table('sql.cost_by_label', ['pipeline label', 'jobs', 'TiB billed', 'example USD'], [[r[0], r[1], r[2], r[3]] for r in cr[1]])
    file('sql/cost_by_label.sql', cost_sql.strip())
    counts('sql.cost_world', {'jobs': len(log), 'days': 7, 'window': '2026-11-04 to 2026-11-10', 'billed_bytes_per_job': {'dashboard_refresh': dash_b, 'analysts, SELECT *': adhoc_b, 'daily_orders': daily_b},
                              'runs_per_day': {'dashboard_refresh': 96, 'analysts, SELECT *': 12, 'daily_orders': 1}, 'example_price_per_tib_usd': 6.25,
                              'ran_on': 'a made-up table named jobs_log with the columns that the query reads: INFORMATION_SCHEMA itself does not exist outside BigQuery'})
    # --- the DDL of a partitioned, clustered table, read by sqlglot's BigQuery parser (a syntax check, not BigQuery)
    import sqlglot
    ddl = ("CREATE OR REPLACE TABLE `brewline-dev.curated.orders` (order_id INT64 NOT NULL, store_id STRING NOT NULL, customer_id STRING, order_ts TIMESTAMP NOT NULL, status STRING, "
           "total_cents INT64, items ARRAY<STRUCT<sku STRING, qty INT64, unit_cents INT64>>) PARTITION BY DATE(order_ts) CLUSTER BY store_id, status "
           "OPTIONS (partition_expiration_days = 400, require_partition_filter = TRUE)")
    tree = sqlglot.parse_one(ddl, read='bigquery')
    props = [[type(p).__name__, p.sql('bigquery')] for p in tree.args['properties'].expressions]
    file('sql/orders_ddl.sql', sqlglot.parse_one(ddl, read='bigquery').sql('bigquery', pretty=True))
    counts('sql.ddl_parse', {'parsed_as': type(tree).__name__, 'properties': props, 'columns': [c.name for c in tree.this.expressions]})


# =======================================================================================================================================
# Five ways to load a batch, run twice
# =======================================================================================================================================
def sec_idem():
    import loads
    world, out = loads.run_methods()
    counts('idem.world', world)
    rows = []
    for m in out:
        for s in m['steps']:
            rows.append([m['method'], s['step'], s['rows'], s['expected'], s['wrong']])
    table('idem.runs', ['method', 'step', 'rows in table', 'rows expected', 'rows wrong'], rows)
    for name, sql in loads.METHODS:
        text('idem.sql.' + name, sql.strip())


# =======================================================================================================================================
# Beam on its local runners
# =======================================================================================================================================
def sec_beam():
    import logging
    import beam_jobs as B
    from apache_beam.options.pipeline_options import PipelineOptions
    from apache_beam.transforms.trigger import AccumulationMode, AfterCount
    D, A = AccumulationMode.DISCARDING, AccumulationMode.ACCUMULATING
    configs = [('no_lateness', 'allowed lateness 0, discarding', 0, None, D, False), ('late_discarding', 'lateness 120 s, late firing, discarding', 120, AfterCount(1), D, False),
               ('late_accumulating', 'lateness 120 s, late firing, accumulating', 120, AfterCount(1), A, False), ('early_late_accumulating', 'early + on time + late, accumulating', 120, AfterCount(1), A, True)]
    summary = {}
    for key, label, lateness, late, mode, early in configs:
        panes = B.late_data(lateness, late, mode, early)
        table('beam.panes.' + key, ['store', 'window (s)', 'pane', 'timing', 'value'], [[p['key'], '%d to %d' % tuple(p['window']), p['index'], p['timing'], p['value']] for p in panes])
        counted = 0
        for k in sorted({p['key'] for p in panes}):
            ps = [p for p in panes if p['key'] == k]
            counted += sum(p['value'] for p in ps) if mode == D else ps[-1]['value']
        summary[key] = {'label': label, 'panes': len(panes), 'events_sent': 6, 'events_in_the_output': counted, 'dropped': 6 - counted, 'timings': sorted({p['timing'] for p in panes})}
    counts('beam.late', summary)
    for gap in (60, 10):
        table('beam.sessions_%d' % gap, ['customer', 'session window (s)', 'events'], [[p['key'], '%d to %d' % tuple(p['window']), p['value']] for p in B.sessions(gap)])
    lines = ['{"order_id": 1, "store_id": "s01"}', '{"order_id": 2}', 'not json', '{"store_id": "s02"}', '[1, 2]', '{"order_id": 6, "store_id": "s03"}']
    ok, dead = B.dead_letter(lines)
    counts('beam.dead_letter', {'lines_in': len(lines), 'ok': len(ok), 'dead': len(dead), 'dead_records': dead})
    ev = brewdata.stream_events()
    dup = ev + [dict(ev[3], event_ts=ev[3]['event_ts'] + 5), dict(ev[10], event_ts=ev[10]['event_ts'] + 100)]
    counts('beam.dedupe', {'unique_events': len(ev), 'delivered': len(dup), 'kept_with_60s_windows': len(B.dedupe(dup, 60)), 'kept_with_300s_windows': len(B.dedupe(dup, 300)),
                           'second_duplicate_gap_seconds': 100})
    opts = PipelineOptions(B.DATAFLOW_FLAGS).get_all_options(drop_default=True)
    counts('beam.options', {k: v for k, v in opts.items()})
    logger = logging.getLogger()
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    logger.addHandler(handler)
    previous = logger.level
    logger.setLevel(logging.WARNING)
    typo = PipelineOptions(['--runner=DataflowRunner', '--max_num_worker=10', '--project=brewline-dev']).get_all_options(drop_default=True)
    logger.removeHandler(handler)
    logger.setLevel(previous)
    import apache_beam as beam
    counts('beam.typo', {'flag_given': '--max_num_worker=10', 'options_kept': sorted(typo), 'worker_limit_kept': 'max_num_workers' in typo, 'warning': stream.getvalue().strip().splitlines()[0] if stream.getvalue().strip() else None})
    counts('beam.bigquery_write_methods', {'methods': [m for m in dir(beam.io.WriteToBigQuery.Method) if m.isupper()]})


# =======================================================================================================================================
# Pub/Sub: library settings (real) and delivery rules (a model)
# =======================================================================================================================================
def sec_pubsub():
    import pubsub_demo as P
    counts('pubsub.subscription', P.client_objects())
    counts('pubsub.defaults', P.library_defaults())
    counts('pubsub.message', dict(P.one_message(), **P.publisher_with_ordering_options()))
    rows = []
    sc = P.scenarios()
    for s in sc:
        for r in s['result']:
            rows.append([s['name'], r['id'], r['key'] or '-', r['deliveries'], r['side_effects'], r['state']])
    table('pubsub.model', ['situation', 'message', 'key', 'deliveries', 'handler ran to the end', 'final state'], rows)
    counts('pubsub.model_settings', {s['name']: dict(s['settings'], story=s['story']) for s in sc})


# =======================================================================================================================================
# A Cloud Run function, tested with CloudEvents
# =======================================================================================================================================
def sec_fn():
    res = {}
    for label, target in (('clean', 'main'), ('bug', 'main_bug')):
        env = dict(os.environ, FN_TARGET=target, PYTHONDONTWRITEBYTECODE='1')
        r = run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=line', '-rf', 'test_main.py'], cwd=str(HERE / 'fn'), env=env)
        txt = re.sub(r' in [0-9.]+s', '', r.stdout.strip())
        txt = txt.replace(str(HERE / 'fn') + '/', '')
        txt = re.sub(r'/[^ ]*/site-packages/', '.../', txt)
        txt = '\n'.join(l for l in txt.splitlines() if not l.startswith('    For troubleshooting'))
        last = txt.splitlines()[-1]
        res[label] = {'passed': int((re.search(r'(\d+) passed', last) or [0, 0])[1]), 'failed': int((re.search(r'(\d+) failed', last) or [0, 0])[1]), 'target': target}
        file('fn/pytest_%s.txt' % label, txt)
    counts('fn.summary', res)


# =======================================================================================================================================
# Airflow (Composer runs Airflow): DAG files read, templates rendered, a flaky task retried
# =======================================================================================================================================
def sec_airflow():
    py = other_python('GCP_AIRFLOW_PYTHON', 'airflow')
    if not py:
        return
    r = run([py, str(HERE / 'af_run.py')], cwd=str(HERE))
    line = [l for l in r.stdout.splitlines() if l.startswith('RESULT')]
    if not line:
        print(r.stdout[-800:], r.stderr[-800:])
        raise SystemExit('af_run.py gave no result')
    d = json.loads(line[0][len('RESULT'):])
    OUT['meta']['apache-airflow'] = d['airflow_version']
    counts('af.dags', {'dags': d['dags'], 'import_errors': d['import_errors'], 'brewline_daily': d['brewline_daily']})
    text('af.render', d['render'])
    counts('af.flaky', d['flaky'])
    counts('af.parse', d['parse'])


# =======================================================================================================================================
# Dataform: compile a project
# =======================================================================================================================================
def sec_dataform():
    exe = HERE / 'node_modules' / '.bin' / 'dataform'
    if not exe.exists():
        print('  (dataform: run npm install --prefix gcp/verify to run this part)')
        return
    OUT['meta']['dataform-cli'] = json.loads((HERE / 'node_modules' / '@dataform' / 'cli' / 'package.json').read_text())['version']

    def compile_project(folder):
        r = run([str(exe), 'compile', str(folder), '--json'], cwd=str(WORK))
        try:
            return json.loads(r.stdout), r
        except ValueError:
            return None, r
    good = WORK / 'dataform_good'
    shutil.copytree(HERE / 'dataform', good, ignore=shutil.ignore_patterns('node_modules'))
    g, r = compile_project(good)
    if g is None or g.get('graphErrors', {}).get('compilationErrors'):
        print(r.stdout[-500:], r.stderr[-800:])
        raise SystemExit('dataform compile failed')
    short = lambda t: '%s.%s' % (t['target']['schema'], t['target']['name'])
    rows = []
    for t in g['tables']:
        rows.append([short(t), t['type'], ', '.join(sorted('%s.%s' % (x['schema'], x['name']) for x in t.get('dependencyTargets', []))) or '-'])
    table('df.actions', ['action', 'type', 'depends on'], sorted(rows))
    counts('df.compile', {'tables': len(g['tables']), 'assertions': len(g.get('assertions', [])), 'declarations': len(g.get('declarations', [])), 'errors': g.get('graphErrors', {}).get('compilationErrors', []) or 0,
                          'assertion_names': sorted(a['target']['name'] for a in g.get('assertions', []))})
    inc = [t for t in g['tables'] if t['type'] == 'incremental'][0]
    text('df.incremental_first', inc['query'].strip())
    text('df.incremental_next', inc['incrementalQuery'].strip())
    ds = [t for t in g['tables'] if t['target']['name'] == 'daily_sales'][0]
    text('df.daily_sales', ds['query'].strip())
    counts('df.bigquery_options', {'incremental': inc.get('bigquery'), 'unique_key': inc.get('uniqueKey')})
    bad = WORK / 'dataform_bad'
    shutil.copytree(good, bad)
    p = bad / 'definitions' / 'curated' / 'orders.sqlx'
    p.write_text(p.read_text().replace('ref("stg_orders")', 'ref("stg_ordrs")'))
    b, r2 = compile_project(bad)
    errs = (b or {}).get('graphErrors', {}).get('compilationErrors', []) if b else []
    msgs = list(dict.fromkeys(e.get('message', '').strip().splitlines()[0] for e in errs))
    counts('df.compile_error', {'typo': 'ref("stg_ordrs")', 'errors': len(msgs), 'messages': msgs, 'file': sorted({e.get('fileName') for e in errs})})


# =======================================================================================================================================
# Terraform for Google Cloud, scanned with Checkov (terraform itself was not run)
# =======================================================================================================================================
def block_of(src, header):
    """The text of one resource block, found by its header line and the closing brace at the start of a line."""
    i = src.index(header)
    j = src.index('\n}\n', i) + 3
    return i, j


def sec_tf():
    py = other_python('GCP_IAC_PYTHON', 'checkov')
    if not py:
        return
    checkov = str(pathlib.Path(py).parent / 'checkov')
    base = (HERE / 'iac' / 'main.tf').read_text()
    fixed = (HERE / 'iac' / 'main_fixed.tf').read_text()
    OUT['meta']['checkov'] = run([checkov, '--version']).stdout.strip()
    heads = {'bucket': 'resource "google_storage_bucket" "landing"', 'dataset': 'resource "google_bigquery_dataset" "raw"', 'table': 'resource "google_bigquery_table" "orders"',
             'iam': 'resource "google_project_iam_member" "pipeline_role"', 'topic': 'resource "google_pubsub_topic" "orders"'}

    def scan(label, src):
        d = WORK / ('tf_' + label)
        d.mkdir()
        (d / 'main.tf').write_text(src)
        r = run([checkov, '-d', str(d), '--framework', 'terraform', '-o', 'json', '--quiet'], env=dict(os.environ, BC_SKIP_MAPPING='TRUE'))
        data = json.loads(r.stdout)
        data = data[0] if isinstance(data, list) else data
        failed = sorted({(c['check_id'], c['check_name'], c['resource']) for c in data['results']['failed_checks']})
        return failed, data['summary']
    variants = {'baseline': base}
    for k, h in heads.items():
        a, b = block_of(base, h)
        fa, fb = block_of(fixed, h)
        variants['fix_' + k] = base[:a] + fixed[fa:fb] + base[b:]
    variants['all_fixed'] = fixed
    results, names = {}, {}
    for label, src in variants.items():
        failed, summary = scan(label, src)
        results[label] = {'failed': [f[0] + ' ' + f[2] for f in failed], 'passed': summary['passed'], 'failed_count': summary['failed']}
        for cid, cname, _ in failed:
            names[cid] = cname
    counts('tf.checkov', results)
    table('tf.checks', ['check', 'what it asks'], [[k, names[k]] for k in sorted(names)])
    import hcl2
    parsed = hcl2.loads(base)
    counts('tf.parse', {'resources': sorted('%s.%s' % (t.strip('"'), n.strip('"')) for r in parsed['resource'] for t, v in r.items() for n in v), 'variables': sorted(k.strip('"') for k in parsed.get('variable', [{}])[0]) if parsed.get('variable') else []})


# =======================================================================================================================================
# Cloud Build and GitHub Actions files against their schemas (neither was run)
# =======================================================================================================================================
def sec_ci():
    d = WORK / 'ci'
    d.mkdir(exist_ok=True)
    res = {}

    def check(schema, name, src, label):
        p = d / label
        p.mkdir(exist_ok=True)
        (p / name).write_text(src)
        r = run([sys.executable, '-m', 'check_jsonschema', '--builtin-schema', schema, name], cwd=str(p))
        lines = []
        for ln in (r.stdout + r.stderr).splitlines():
            if len(ln) > 150 and '{' in ln:
                ln = ln[:ln.index('{')] + '{...} is not valid under any of the given schemas'
            lines.append(ln.rstrip())
        txt = '\n'.join(l for l in lines if l.strip()) + '\nexit code: %d' % r.returncode
        file('ci/validate_%s.txt' % label, txt)
        res[label] = {'exit_code': r.returncode}
    cb = (HERE / 'ci' / 'cloudbuild.yaml').read_text()
    check('vendor.cloudbuild', 'cloudbuild.yaml', cb, 'cloudbuild_ok')
    check('vendor.cloudbuild', 'cloudbuild.yaml', cb.replace('\nsteps:', '\nstep:', 1), 'cloudbuild_bad')
    gh = (HERE / 'ci' / 'deploy.yml').read_text()
    check('vendor.github-workflows', 'deploy.yml', gh, 'deploy_ok')
    check('vendor.github-workflows', 'deploy.yml', gh.replace('runs-on:', 'run-on:'), 'deploy_bad')
    import yaml
    doc = yaml.safe_load(gh)
    res['deploy'] = {'permissions': doc['permissions'], 'steps': [s.get('uses', 'run') for s in doc['jobs']['deploy']['steps']], 'uses_a_key_file': 'credentials_json' in gh}
    cbdoc = yaml.safe_load(cb)
    res['cloudbuild'] = {'step_ids': [s['id'] for s in cbdoc['steps']], 'timeout': cbdoc['timeout']}
    counts('ci.summary', res)


# =======================================================================================================================================
# Spark in local mode
# =======================================================================================================================================
def sec_spark():
    py = other_python('GCP_SPARK_PYTHON', 'spark')
    if not py:
        return
    r = run([py, str(HERE / 'spark_job.py')], cwd=str(WORK))
    line = [l for l in r.stdout.splitlines() if l.startswith('RESULT')]
    if not line:
        print(r.stdout[-800:], r.stderr[-800:])
        raise SystemExit('spark_job.py gave no result')
    d = json.loads(line[0][len('RESULT'):])
    OUT['meta']['pyspark'] = d['spark_version']
    counts('spark.pruning', d['pruning'])
    counts('spark.shuffle', d['shuffle'])
    table('spark.small_files', ['write', 'files', 'total KB', 'KB per file'], [[x['write'], x['files'], round(x['bytes'] / 1024), round(x['bytes_per_file'] / 1024, 1)] for x in d['small_files']])
    counts('spark.skew', d['skew'])
    counts('spark.join', d['join'])
    counts('spark.written', {'files': d['files_written'], 'partitions': d['partitions_written']})


# =======================================================================================================================================
# The command line tools: do the flags that the lessons name exist?
# =======================================================================================================================================
GCLOUD_FLAGS = [
    ('pubsub subscriptions create', ['--ack-deadline', '--dead-letter-topic', '--max-delivery-attempts', '--enable-exactly-once-delivery', '--enable-message-ordering', '--message-retention-duration',
                                     '--min-retry-delay', '--max-retry-delay', '--bigquery-table', '--use-table-schema', '--cloud-storage-bucket', '--push-endpoint', '--expiration-period', '--message-filter']),
    ('pubsub topics create', ['--message-retention-duration', '--schema', '--message-encoding', '--topic-encryption-key']),
    ('storage buckets create', ['--location', '--uniform-bucket-level-access', '--public-access-prevention', '--soft-delete-duration', '--enable-hierarchical-namespace', '--default-storage-class', '--retention-period']),
    ('storage rsync', ['--recursive', '--delete-unmatched-destination-objects']),
    ('dataflow flex-template run', ['--template-file-gcs-location', '--region', '--parameters', '--service-account-email', '--max-workers', '--num-workers', '--subnetwork', '--disable-public-ips', '--staging-location', '--additional-experiments']),
    ('composer environments create', ['--image-version', '--environment-size', '--service-account', '--airflow-configs', '--env-variables']),
    ('dataproc clusters create', ['--region', '--num-workers', '--num-secondary-workers', '--autoscaling-policy', '--delete-max-idle', '--image-version', '--properties', '--initialization-actions']),
    ('dataproc batches submit pyspark', ['--region', '--deps-bucket', '--service-account', '--subnet', '--properties', '--version']),
    ('datastream streams create', ['--source', '--destination', '--display-name', '--backfill-all', '--backfill-none', '--location', '--postgresql-source-config', '--mysql-source-config', '--oracle-source-config',
                                   '--bigquery-destination-config', '--gcs-destination-config']),
    ('transfer jobs create', ['--source-agent-pool', '--include-prefixes', '--overwrite-when', '--delete-from', '--schedule-repeats-every']),
    ('dataplex datascans create data-quality', ['--data-quality-spec-file', '--data-source-resource', '--location']),
    ('iam workload-identity-pools providers create-oidc', ['--issuer-uri', '--attribute-mapping', '--attribute-condition', '--workload-identity-pool', '--location']),
    ('iam service-accounts add-iam-policy-binding', ['--member', '--role']),
    ('projects add-iam-policy-binding', ['--member', '--role', '--condition']),
    ('scheduler jobs create http', ['--schedule', '--time-zone', '--uri', '--oidc-service-account-email']),
    ('workflows deploy', ['--source', '--service-account', '--location']),
    ('functions deploy', ['--gen2', '--runtime', '--trigger-topic', '--entry-point', '--region', '--service-account']),
    ('eventarc triggers create', ['--event-filters', '--destination-run-service', '--location', '--service-account']),
    ('logging metrics create', ['--log-filter', '--description']),
    ('billing budgets create', ['--billing-account', '--display-name', '--budget-amount', '--threshold-rule', '--filter-projects', '--notifications-rule-pubsub-topic']),
    ('monitoring policies create', ['--policy-from-file', '--notification-channels']),
]
BQ_FLAGS = [
    ('mk', ['--time_partitioning_field', '--time_partitioning_type', '--time_partitioning_expiration', '--clustering_fields', '--require_partition_filter', '--range_partitioning', '--dataset', '--table',
            '--location', '--default_table_expiration', '--description', '--label', '--external_table_definition', '--view', '--materialized_view']),
    ('load', ['--source_format', '--autodetect', '--schema_update_option', '--replace', '--time_partitioning_field', '--hive_partitioning_mode', '--hive_partitioning_source_uri_prefix',
              '--max_bad_records', '--ignore_unknown_values', '--parquet_enable_list_inference']),
    ('query', ['--dry_run', '--use_legacy_sql', '--maximum_bytes_billed', '--parameter', '--batch', '--destination_table', '--label', '--use_cache']),
]


def sec_cli():
    env = dict(os.environ, CLOUDSDK_CORE_DISABLE_PROMPTS='1', CLOUDSDK_COMPONENT_MANAGER_DISABLE_UPDATE_CHECK='1', CLOUDSDK_CORE_DISABLE_USAGE_REPORTING='true')
    ver = run(['gcloud', '--version'], env=env)
    if ver.returncode != 0:
        print('  (cli: gcloud not found)')
        return
    OUT['meta']['gcloud'] = ver.stdout.splitlines()[0].replace('Google Cloud SDK ', '')
    OUT['meta']['bq'] = run(['bq', 'version'], env=env).stdout.strip().replace('This is BigQuery CLI ', '')
    rows, missing = [], []
    for cmd, flags in GCLOUD_FLAGS:
        h = run(['gcloud'] + cmd.split() + ['--help'], env=env)
        body = h.stdout + h.stderr
        found = {f: bool(re.search(r'(^|[\s,\[])' + re.escape(f) + r'([=\s,\]]|$)', body, re.M)) for f in flags}
        rows.append(['gcloud ' + cmd, ' '.join(f for f in flags if found[f]), ' '.join(f for f in flags if not found[f]) or '-'])
        missing += ['gcloud %s %s' % (cmd, f) for f in flags if not found[f]]
    for cmd, flags in BQ_FLAGS:
        h = run(['bq', 'help', cmd], env=env)
        body = h.stdout + h.stderr
        found = {f: bool(re.search(r'--(?:\[no\])?' + re.escape(f[2:]) + r'\b', body)) for f in flags}
        rows.append(['bq ' + cmd, ' '.join(f for f in flags if found[f]), ' '.join(f for f in flags if not found[f]) or '-'])
        missing += ['bq %s %s' % (cmd, f) for f in flags if not found[f]]
    table('cli.flags', ['command', 'flags found', 'flags not found'], rows)
    counts('cli.summary', {'commands_checked': len(rows), 'flags_not_found': missing})


def finish():
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(OUT, indent=1, sort_keys=True, ensure_ascii=False)
    out.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + body + ';\n')
    if args.json:
        pathlib.Path(args.json).write_text(body)
    print('wrote', out, len(body), 'bytes:', {k: len(v) for k, v in OUT.items()})


SECTIONS = [('gcs', sec_gcs), ('formats', sec_formats), ('bqapi', sec_bqapi), ('sql', sec_sql), ('idem', sec_idem), ('beam', sec_beam), ('pubsub', sec_pubsub), ('fn', sec_fn),
            ('airflow', sec_airflow), ('dataform', sec_dataform), ('tf', sec_tf), ('ci', sec_ci), ('spark', sec_spark), ('cli', sec_cli)]

if __name__ == '__main__':
    for name, fn in SECTIONS:
        if name in ONLY:
            t = time.time()
            fn()
            print('  %-10s %.1fs' % (name, time.time() - t))
    finish()
