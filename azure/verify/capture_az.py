#!/usr/bin/env python3
"""Record what the Azure SDK, a storage emulator and open-source tools do, for the Azure tutorial.

Nothing here runs on Azure. The recording comes from:
  azure-storage-blob, azure-storage-queue   the real Azure SDK for Storage: request building, SAS signing, error classes, paging
  Azurite                                   the open-source storage emulator of Microsoft (blobs and queues). It is not Azure.
  azure-identity                            the real credential classes: the DefaultAzureCredential chain and the managed identity request
  azure-eventhub, ...checkpointstoreblob    the real Event Hubs client: batch sizing, and the checkpoint store kept in blobs (on Azurite)
  azure-eventgrid                           the real parser for Event Grid events
  azure-mgmt-datafactory (9.x)              the SDK models of the Data Factory API, used by adf_check.py to check pipeline files
  DuckDB and pyarrow                        real query and file engines, used for the watermark runs and the Parquet file sizes
  Apache Spark 4 and Delta Lake (local)     the lakehouse steps of mission 6, run by spark_job.py in an environment that has pyspark and delta-spark
  pytest                                    runs the tests of an Event Grid triggered function against Azurite
  cryptography                              AES-GCM and AES key wrap, for the envelope encryption demo of the security mission
The lessons use Azurite only for behavior that the Azure documentation describes the same way. The README lists what was not checked.

Usage:   python3 azure/verify/capture_az.py [--out azure/js/real.js] [--only blob,sas,queue,identity,eventhubs,eventgrid,functions,adf,synapse,dedicated,kql,lakehouse,crypto]
                                             [--json FILE] [--spark-python PATH]
Needs:   pip install -r dev/requirements.txt  and  npm install --prefix azure/verify   (Azurite and the Kusto language service)
         for the lakehouse section: Java 17 or 21, and an environment with  pip install pyspark==4.0.1 delta-spark==4.0.1
         (point --spark-python or AZ_SPARK_PYTHON at its python; if you leave it out, this interpreter is tried)
"""
import argparse
import atexit
import base64
import contextlib
import datetime
import hashlib
import http.server
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--only', default='blob,sas,queue,identity,eventhubs,eventgrid,functions,adf,synapse,dedicated,kql,lakehouse,crypto')
ap.add_argument('--json')
ap.add_argument('--spark-python', default=os.environ.get('AZ_SPARK_PYTHON'))
args = ap.parse_args()
ONLY = set(args.only.split(','))

# No real credentials, no real network. These are the well-known development account and key that Microsoft publishes for the
# emulator, so they are not secrets. Every Azure variable of the machine is removed so that the recording never depends on a login.
for k in list(os.environ):
    if k.startswith('AZURE_') or k in ('IDENTITY_ENDPOINT', 'IDENTITY_HEADER', 'MSI_ENDPOINT', 'MSI_SECRET'):
        del os.environ[k]
ACCOUNT = 'devstoreaccount1'
DEV_KEY = 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='

import importlib.metadata as md
from azure.core import MatchConditions
from azure.core.exceptions import HttpResponseError, ResourceExistsError, ResourceNotFoundError
from azure.storage.blob import (AccountSasPermissions, BlobBlock, BlobPrefix, BlobSasPermissions, BlobServiceClient, ContainerSasPermissions,
                                ResourceTypes, StandardBlobTier, generate_account_sas, generate_blob_sas, generate_container_sas)
from azure.storage.queue import QueueServiceClient

WORK = pathlib.Path(tempfile.mkdtemp(prefix='azure-capture-'))
atexit.register(lambda: shutil.rmtree(WORK, ignore_errors=True))
OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def put(section, key, value):
    OUT[section][key] = value


def text(key, s):
    put('text', key, s)


def file(key, s):
    put('files', key, s)


def counts(key, d):
    put('counts', key, d)


def table(key, cols, rows):
    put('tables', key, {'cols': cols, 'rows': rows})


def jdump(o, indent=2):
    return json.dumps(o, indent=indent, ensure_ascii=False, sort_keys=False)


def version(pkg):
    try:
        return md.version(pkg)
    except md.PackageNotFoundError:
        return None


def node_pkg_version(name):
    p = HERE / 'node_modules' / name / 'package.json'
    return json.loads(p.read_text())['version'] if p.exists() else None


OUT['meta'].update({p: version(p) for p in ('azure-storage-blob', 'azure-storage-queue', 'azure-identity', 'azure-core', 'azure-eventhub',
                                             'azure-eventhub-checkpointstoreblob', 'azure-eventgrid', 'azure-functions', 'azure-mgmt-datafactory',
                                             'duckdb', 'pyarrow', 'pytest', 'sqlglot', 'azure-keyvault-secrets', 'cryptography')})
OUT['meta'].update({'azurite': node_pkg_version('azurite'), 'kusto_language_service': node_pkg_version('@kusto/language-service-next'),
                    'python': sys.version.split()[0], 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip().lstrip('v'),
                    'account': 'stbrewlinelakeprod', 'region': 'westeurope',
                    'note': 'Recorded by azure/verify/capture_az.py with the Azure SDK for Python against Azurite (a storage emulator), azure-identity, DuckDB, '
                            'pyarrow, pytest and a local Apache Spark with Delta Lake on one machine. Nothing ran on Azure.'})


def code_of(e):
    c = getattr(e, 'error_code', None)
    return str(getattr(c, 'value', c))


def first_line(msg):
    return str(msg).strip().splitlines()[0].strip()


def failure(fn):
    """Run fn, which should fail with an HTTP error, and describe the failure."""
    try:
        fn()
    except HttpResponseError as e:
        return {'code': code_of(e), 'status': e.status_code, 'message': first_line(e.message)}
    raise AssertionError('the call did not fail')


# ---------------------------------------------------------------------------------------------------------------------------
# Azurite: start it on free ports, in a work folder, and stop it at exit
# ---------------------------------------------------------------------------------------------------------------------------
def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


AZ = {}


def start_azurite():
    if AZ:
        return AZ
    exe = HERE / 'node_modules' / '.bin' / 'azurite'
    exe = str(exe) if exe.exists() else shutil.which('azurite')
    if not exe:
        sys.exit('Azurite is missing. Run: npm install --prefix azure/verify')
    bp, qp, tp = free_port(), free_port(), free_port()
    log = open(WORK / 'azurite.log', 'w')
    # --skipApiVersionCheck: the SDK asks for a service version that is newer than the emulator knows. The requests are otherwise unchanged.
    proc = subprocess.Popen([exe, '--silent', '--location', str(WORK / 'azurite-data'), '--blobPort', str(bp), '--queuePort', str(qp),
                             '--tablePort', str(tp), '--skipApiVersionCheck'], stdout=log, stderr=log)
    atexit.register(lambda: (proc.terminate(), proc.wait(timeout=10)))
    for _ in range(100):
        try:
            for p in (bp, qp):
                socket.create_connection(('127.0.0.1', p), timeout=0.5).close()
            break
        except OSError:
            time.sleep(0.2)
    else:
        sys.exit('Azurite did not start: ' + (WORK / 'azurite.log').read_text())
    AZ.update({'blob_port': bp, 'queue_port': qp,
               'conn': 'DefaultEndpointsProtocol=http;AccountName=%s;AccountKey=%s;BlobEndpoint=http://127.0.0.1:%d/%s;QueueEndpoint=http://127.0.0.1:%d/%s;'
                       % (ACCOUNT, DEV_KEY, bp, ACCOUNT, qp, ACCOUNT)})
    os.environ['LAKE_CONNECTION'] = AZ['conn']
    return AZ


def blob_url(container, name, sas=None):
    u = 'http://127.0.0.1:%d/%s/%s/%s' % (AZ['blob_port'], ACCOUNT, container, urllib.parse.quote(name))
    return u + ('?' + sas if sas else '')


def http_call(method, url, body=None, headers=None):
    """A plain HTTP call, the way a script with only a URL would make it. Returns the status and the error code of the answer, if any."""
    req = urllib.request.Request(url, method=method, data=body, headers=headers or {})
    try:
        r = urllib.request.urlopen(req, timeout=15)
        return r.status, None
    except urllib.error.HTTPError as e:
        m = re.search(rb'<Code>([^<]+)</Code>', e.read())
        return e.code, m.group(1).decode() if m else None


def pythonic_call(s):
    return s


# ---------------------------------------------------------------------------------------------------------------------------
# Blob Storage: listing, errors, conditions, blocks, leases, tiers, tags, snapshots
# ---------------------------------------------------------------------------------------------------------------------------
LAKE_KEYS = [
    'README.txt',
    '_manifests/2026-03-14.json',
    'events/dt=2026-03-14/part-0000.json',
    'events/dt=2026-03-15/part-0000.json',
    'orders/dt=2026-03-14/_SUCCESS',
    'orders/dt=2026-03-14/orders-0001.json',
    'orders/dt=2026-03-14/orders-0002.json',
    'orders/dt=2026-03-15/orders-0001.json',
    'orders/dt=2026-03-15/orders-0002.json',
    'orders/dt=2026-03-16/orders-0001.json',
]


def sec_blob():
    az = start_azurite()
    svc = BlobServiceClient.from_connection_string(az['conn'])
    c = svc.create_container('raw')
    for k in LAKE_KEYS:
        c.upload_blob(k, (k + '\n').encode() * 20, overwrite=True)
    counts('blob.keys', {'container': 'raw', 'keys': [{'name': b.name, 'size': b.size} for b in c.list_blobs()]})

    # listing with a prefix and a delimiter. In a flat namespace the "folders" are only the text up to the next delimiter.
    out = []
    for prefix in ['', 'orders/', 'orders/dt=2026-03-14/', 'ord', 'events/', 'orders/dt=2026-03-1']:
        for delim in ['', '/']:
            keys, cps = [], []
            it = c.walk_blobs(name_starts_with=prefix or None, delimiter=delim) if delim else c.list_blobs(name_starts_with=prefix or None)
            for item in it:
                (cps if isinstance(item, BlobPrefix) else keys).append(item.name)
            out.append({'prefix': prefix, 'delimiter': delim, 'keys': keys, 'common_prefixes': cps, 'key_count': len(keys) + len(cps)})
    counts('blob.listing', out)

    pages = []
    pager = c.list_blobs(results_per_page=4).by_page()
    for page in pager:
        names = [b.name for b in page]
        pages.append({'keys': names, 'has_continuation_token': bool(pager.continuation_token)})
    counts('blob.pages', {'results_per_page': 4, 'pages': pages})

    # errors
    bad_key = BlobServiceClient.from_connection_string(az['conn'].replace(DEV_KEY, DEV_KEY[:-6] + 'AAAA=='))
    errs = {
        'get_missing_blob': failure(lambda: c.get_blob_client('nope.txt').download_blob().readall()),
        'get_missing_container': failure(lambda: svc.get_container_client('nocontainer').get_blob_client('a').download_blob()),
        'create_existing_container': failure(lambda: svc.create_container('raw')),
        'create_bad_name': failure(lambda: svc.create_container('Bad_Name')),
        'overwrite_false': failure(lambda: c.upload_blob('README.txt', b'again', overwrite=False)),
        'wrong_account_key': failure(lambda: bad_key.get_container_client('raw').get_blob_client('README.txt').get_blob_properties()),
    }
    counts('blob.errors', errs)

    # conditions: an ETag is a version token, not a hash, and overwrite=False sends If-None-Match: *
    b = c.get_blob_client('cond/marker.txt')
    first = b.upload_blob(b'same', overwrite=True)
    second = b.upload_blob(b'same', overwrite=True)
    sent = {}

    def hook(req):
        for k, v in req.http_request.headers.items():
            if k.lower() in ('if-none-match', 'if-match'):
                sent[k] = v
    err = failure(lambda: b.upload_blob(b'again', overwrite=False, raw_request_hook=hook))
    stale = first['etag']
    stale_err = failure(lambda: b.set_blob_metadata({'a': '2'}, etag=stale, match_condition=MatchConditions.IfNotModified))
    counts('blob.conditional', {
        'same_bytes_twice_same_etag': first['etag'] == second['etag'],
        'header_sent_by_overwrite_false': sent,
        'overwrite_false': err,
        'stale_etag': stale_err,
        'sdk_default_service_version': generate_blob_sas(account_name='a', container_name='c', blob_name='b', account_key=DEV_KEY,
                                                           permission=BlobSasPermissions(read=True), expiry=datetime.datetime(2030, 1, 1, tzinfo=datetime.timezone.utc)).split('sv=')[1].split('&')[0],
    })

    # blocks: nothing is visible until the block list is committed, and a block can be any size (S3 parts must be 5 MiB)
    bb = c.get_blob_client('big/file.bin')
    bodies = [b'a' * 5, b'b' * 5, b'c' * 3]
    ids = []
    for i, body in enumerate(bodies):
        bid = base64.b64encode(('%06d' % i).encode()).decode()
        bb.stage_block(bid, body)
        ids.append(bid)
    before = failure(lambda: bb.get_blob_properties())
    committed, uncommitted = bb.get_block_list('all')
    commit = bb.commit_block_list([BlobBlock(block_id=i) for i in ids])
    committed2, uncommitted2 = bb.get_block_list('all')
    counts('blob.blocks', {
        'blocks': [{'id': i, 'decoded': base64.b64decode(i).decode(), 'size': len(x)} for i, x in zip(ids, bodies)],
        'blob_exists_before_commit': False, 'get_before_commit': before,
        'uncommitted_before': [x.id for x in uncommitted], 'committed_before': [x.id for x in committed],
        'committed_after': [x.id for x in committed2], 'uncommitted_after': [x.id for x in uncommitted2],
        'size_after': bb.get_blob_properties().size, 'smallest_block_bytes': min(len(x) for x in bodies),
        'commit_returns_etag': bool(commit.get('etag')),
    })

    # leases
    lb = c.get_blob_client('lease/lock.txt')
    lb.upload_blob(b'hello', overwrite=True)
    state0 = lb.get_blob_properties().lease
    lease = lb.acquire_lease(15)
    state1 = lb.get_blob_properties().lease
    steps = [{'step': 'before', 'state': state0.state, 'status': state0.status, 'duration': state0.duration},
             {'step': 'acquire 15 s', 'state': state1.state, 'status': state1.status, 'duration': state1.duration}]
    w1 = failure(lambda: lb.upload_blob(b'x', overwrite=True))
    d1 = failure(lambda: lb.delete_blob())
    a2 = failure(lambda: lb.acquire_lease(15))
    lb.upload_blob(b'ok', overwrite=True, lease=lease)
    lease.release()
    state2 = lb.get_blob_properties().lease
    steps.append({'step': 'release', 'state': state2.state, 'status': state2.status, 'duration': state2.duration})
    counts('blob.lease', {'steps': steps, 'write_without_id': w1, 'delete_without_id': d1, 'second_acquire': a2, 'write_with_id_worked': True})

    # tiers: Hot is the default. Archive blocks reads
    tb = c.get_blob_client('tier/old.json')
    tb.upload_blob(b'x' * 100, overwrite=True)
    p0 = tb.get_blob_properties()
    tb.set_standard_blob_tier(StandardBlobTier.COOL)
    p1 = tb.get_blob_properties()
    tb.set_standard_blob_tier(StandardBlobTier.ARCHIVE)
    p2 = tb.get_blob_properties()
    read = failure(lambda: tb.download_blob().readall())
    counts('blob.tier', {'default': {'tier': str(p0.blob_tier), 'inferred': p0.blob_tier_inferred},
                         'cool': {'tier': str(p1.blob_tier), 'inferred': p1.blob_tier_inferred},
                         'archive': {'tier': str(p2.blob_tier), 'inferred': p2.blob_tier_inferred}, 'read_archived': read})

    # tags and snapshots
    gb = c.get_blob_client('tags/orders.json')
    gb.upload_blob(b'x', overwrite=True)
    gb.set_blob_tags({'zone': 'raw', 'pii': 'no'})
    found = [x.name for x in svc.find_blobs_by_tags("\"zone\"='raw' AND \"pii\"='no'")]
    snap = gb.create_snapshot()
    listed = [(x.name, bool(x.snapshot)) for x in c.list_blobs(name_starts_with='tags/', include=['snapshots'])]
    snap_err = failure(lambda: gb.delete_blob())
    counts('blob.tags_snapshots', {'tags': gb.get_blob_tags(), 'find_blobs_by_tags': found, 'snapshot_listed': listed, 'snapshot_taken': bool(snap.get('snapshot')),
                                   'delete_with_snapshot': snap_err})

    # blob types: an append blob takes only appends, and a server-side copy needs no download
    ab = c.get_blob_client('logs/app.log')
    ab.create_append_blob()
    for line in (b'start\n', b'order 7001 loaded\n', b'done\n'):
        ab.append_block(line)
    pp = ab.get_blob_properties()
    src = c.get_blob_client('orders/dt=2026-03-14/orders-0001.json')
    dst = c.get_blob_client('copy/orders-0001.json')
    cp = dst.start_copy_from_url(src.url)
    cprops = dst.get_blob_properties()
    counts('blob.types', {'append_blob_type': str(pp.blob_type), 'append_blob_size': pp.size, 'append_blocks': pp.append_blob_committed_block_count,
                          'copy_status': cp['copy_status'], 'copy_status_after': cprops.copy.status, 'copy_has_id': bool(cp.get('copy_id')),
                          'copied_size_equals_source': cprops.size == src.get_blob_properties().size, 'block_blob_type': str(src.get_blob_properties().blob_type)})

    # what the emulator cannot do: recorded, so that the lessons do not pretend
    from azure.storage.blob import RetentionPolicy
    gaps = []
    svc.set_service_properties(delete_retention_policy=RetentionPolicy(enabled=True, days=7))
    sd = c.get_blob_client('softdelete/x.txt')
    sd.upload_blob(b'x', overwrite=True)
    sd.delete_blob()
    kept = [x.name for x in c.list_blobs(name_starts_with='softdelete/', include=['deleted'])]
    undel = failure(lambda: sd.undelete_blob())
    gaps.append({'feature': 'soft delete', 'kept_after_delete': kept, 'undelete': undel})
    counts('emulator.gaps', {'probes': gaps, 'not_probed': ['versioning', 'lifecycle management rules', 'ADLS Gen2 hierarchical namespace and the dfs endpoint',
                                                         'user delegation SAS (needs Microsoft Entra ID)', 'object replication', 'change feed']})


# ---------------------------------------------------------------------------------------------------------------------------
# SAS: what the token holds, and what the emulator does with it
# ---------------------------------------------------------------------------------------------------------------------------
def sas_fields(token):
    q = urllib.parse.parse_qs(token, keep_blank_values=True)
    return {k: v[0] for k, v in q.items()}


def sec_sas():
    az = start_azurite()
    svc = BlobServiceClient.from_connection_string(az['conn'])
    try:
        c = svc.create_container('raw')
    except ResourceExistsError:
        c = svc.get_container_client('raw')
    names = ['orders/dt=2026-03-14/orders-0001.json', 'orders/dt=2026-03-14/orders-0002.json']
    for n in names:
        c.upload_blob(n, b'{"order_id": 1}\n', overwrite=True)
    FAR = datetime.datetime(2099, 1, 1, tzinfo=datetime.timezone.utc)
    PAST = datetime.datetime(2020, 1, 1, tzinfo=datetime.timezone.utc)

    def blob_sas(name, perm, exp=FAR, **kw):
        return generate_blob_sas(account_name=ACCOUNT, container_name='raw', blob_name=name, account_key=DEV_KEY, permission=perm, expiry=exp, **kw)

    tokens = {
        'read this blob': blob_sas(names[0], BlobSasPermissions(read=True)),
        'read and write this blob': blob_sas(names[0], BlobSasPermissions(read=True, write=True)),
        'read the container': generate_container_sas(account_name=ACCOUNT, container_name='raw', account_key=DEV_KEY,
                                                     permission=ContainerSasPermissions(read=True, list=True), expiry=FAR),
        'read, but expired': blob_sas(names[0], BlobSasPermissions(read=True), PAST),
    }
    tokens['read, edited to write'] = tokens['read this blob'].replace('sp=r', 'sp=rw')
    ops = [('GET the blob', 'GET', names[0], None), ('PUT the blob', 'PUT', names[0], b'x'), ('DELETE the blob', 'DELETE', names[0], None),
           ('GET the other blob', 'GET', names[1], None), ('LIST the container', 'GET', None, None)]
    cases = []
    for label, tok in tokens.items():
        row = {'sas': label, 'fields': {k: v for k, v in sas_fields(tok).items() if k != 'sig'}, 'results': []}
        for opname, method, name, body in ops:
            if name is None:
                url = 'http://127.0.0.1:%d/%s/raw?restype=container&comp=list&%s' % (az['blob_port'], ACCOUNT, tok)
                status, code = http_call(method, url)
            else:
                status, code = http_call(method, blob_url('raw', name, tok), body=body, headers={'x-ms-blob-type': 'BlockBlob'} if method == 'PUT' else {})
            row['results'].append({'op': opname, 'status': status, 'code': code})
            if method == 'DELETE' and status == 202:        # put the blob back so that the next token starts from the same state
                c.upload_blob(name, b'{"order_id": 1}\n', overwrite=True)
        cases.append(row)
    counts('sas.matrix', {'ops': [o[0] for o in ops], 'cases': cases})

    # a SAS made offline, with the story's names and dates. The key is the published development key, so the signature is not secret.
    story = generate_blob_sas(account_name='stbrewlinelakeprod', container_name='raw', blob_name='orders/dt=2026-03-14/orders-0001.json', account_key=DEV_KEY,
                              permission=BlobSasPermissions(read=True), start=datetime.datetime(2026, 3, 14, 7, 55, tzinfo=datetime.timezone.utc),
                              expiry=datetime.datetime(2026, 3, 14, 8, 55, tzinfo=datetime.timezone.utc), protocol='https')
    f = sas_fields(story)
    text('sas.url', 'https://stbrewlinelakeprod.blob.core.windows.net/raw/orders/dt=2026-03-14/orders-0001.json?' + story)
    counts('sas.fields', {'fields': {k: v for k, v in f.items()}, 'order': list(f.keys()),
                          'signature_covers': 'the permissions, the start and expiry times, the resource, the protocol and the version, all as signed text'})
    acct = generate_account_sas(account_name='stbrewlinelakeprod', account_key=DEV_KEY, resource_types=ResourceTypes(service=True, container=True, object=True),
                                permission=AccountSasPermissions(read=True, list=True), expiry=datetime.datetime(2026, 3, 14, 8, 55, tzinfo=datetime.timezone.utc))
    counts('sas.account_fields', {'fields': {k: v for k, v in sas_fields(acct).items() if k != 'sig'}})


# ---------------------------------------------------------------------------------------------------------------------------
# Queue Storage: visibility timeout, dequeue count, pop receipts, a poison queue made by the client
# ---------------------------------------------------------------------------------------------------------------------------
def sec_queue():
    az = start_azurite()
    qs = QueueServiceClient.from_connection_string(az['conn'])
    q = qs.create_queue('orders')
    poison = qs.create_queue('orders-poison')
    q.send_message('order-7001')
    MAX = 3
    VIS = 1
    timeline = []
    for attempt in range(1, 5):
        got = list(q.receive_messages(visibility_timeout=VIS, max_messages=1))
        again = list(q.receive_messages(visibility_timeout=VIS, max_messages=1)) if got else []
        entry = {'t': round((attempt - 1) * (VIS + 0.25), 2), 'received': bool(got), 'dequeue_count': got[0].dequeue_count if got else None,
                 'second_reader_got_it': bool(again)}
        if got and got[0].dequeue_count > MAX:
            poison.send_message(got[0].content)
            q.delete_message(got[0])
            entry['action'] = 'moved to the poison queue and deleted'
        elif got:
            entry['action'] = 'crashed before delete_message'
        timeline.append(entry)
        time.sleep(VIS + 0.25)
    counts('queue.redrive', {'visibility_timeout_seconds': VIS, 'max_dequeue_count': MAX, 'timeline': timeline,
                             'main_queue_after': q.get_queue_properties().approximate_message_count,
                             'poison_queue_after': poison.get_queue_properties().approximate_message_count,
                             'poison_body': [m.content for m in poison.peek_messages()][0]})
    # a message that is deleted stays deleted
    q.send_message('order-7002')
    m = list(q.receive_messages(visibility_timeout=VIS))[0]
    q.delete_message(m)
    time.sleep(VIS + 0.25)
    counts('queue.delete', {'received_again_after_timeout': bool(list(q.receive_messages(visibility_timeout=VIS)))})
    # pop receipt
    q.send_message('order-7003')
    m1 = list(q.receive_messages(visibility_timeout=VIS))[0]
    time.sleep(VIS + 0.25)
    m2 = list(q.receive_messages(visibility_timeout=30))[0]
    stale = failure(lambda: q.delete_message(m1.id, m1.pop_receipt))
    q.delete_message(m2.id, m2.pop_receipt)
    counts('queue.errors', {'stale_pop_receipt': stale, 'too_large': failure(lambda: q.send_message('x' * 70000)),
                            'missing_queue': failure(lambda: qs.get_queue_client('nosuchqueue').send_message('x')),
                            'message_limit_chars_sent': 70000, 'same_id_on_redelivery': m1.id == m2.id, 'dequeue_counts_seen': [m1.dequeue_count, m2.dequeue_count]})


# ---------------------------------------------------------------------------------------------------------------------------
# Identity: the DefaultAzureCredential chain, and what a managed identity credential sends
# ---------------------------------------------------------------------------------------------------------------------------
def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def fake_token(claims):
    """A token in the real shape: header.payload.signature. The signature is empty, so no service would accept it."""
    return b64url(json.dumps({'typ': 'JWT', 'alg': 'none'}).encode()) + '.' + b64url(json.dumps(claims).encode()) + '.'


def sec_identity():
    # 1. the chain, in a clean process: no Azure variable, no az on the path, no cached sign-in
    code = (
        "import json\n"
        "from azure.identity import DefaultAzureCredential\n"
        "from azure.core.exceptions import ClientAuthenticationError\n"
        "c = DefaultAzureCredential()\n"
        "order = [type(x).__name__ for x in c.credentials]\n"
        "try:\n"
        "    c.get_token('https://storage.azure.com/.default'); msg = ''\n"
        "except ClientAuthenticationError as e:\n"
        "    msg = str(e)\n"
        "print(json.dumps({'order': order, 'message': msg}))\n")
    env = {'PATH': '/nonexistent', 'HOME': str(WORK), 'PYTHONPATH': os.pathsep.join(sys.path)}
    res = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, env=env, timeout=120)
    rec = json.loads(res.stdout.strip().splitlines()[-1])
    text('identity.chain', rec['message'].replace(str(WORK), '~'))
    per = {}
    for line in rec['message'].splitlines():
        m = re.match(r'^\t(\w+): (.*)$', line)
        if m:
            per[m.group(1)] = m.group(2)
    order = [m.group(1) for m in (re.match(r'^\t(\w+): ', ln) for ln in rec['message'].splitlines()) if m]
    counts('identity.chain', {'order': order, 'each_failure_first_words': {k: v[:90] for k, v in per.items()}, 'all_failed_without_a_login': bool(rec['message'])})

    # 2. what ManagedIdentityCredential sends. A small local server plays the part of the endpoint, so the requests are the real ones of the SDK.
    log = []
    tenant, oid = '11111111-2222-3333-4444-555555555555', '99999999-8888-7777-6666-555555555555'
    claims = {'aud': 'https://storage.azure.com', 'iss': 'https://sts.windows.net/' + tenant + '/', 'iat': 1773475200, 'nbf': 1773475200, 'exp': 1773561600,
              'idtyp': 'app', 'oid': oid, 'sub': oid, 'tid': tenant, 'ver': '1.0',
              'xms_mirid': '/subscriptions/00000000-0000-0000-0000-000000000000/resourcegroups/rg-brewline-data-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-brewline-adf'}
    token = fake_token(claims)

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            u = urllib.parse.urlparse(self.path)
            log.append({'method': 'GET', 'path': u.path, 'query': {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()},
                        'headers': {h: ('<secret>' if h.lower() in ('x-identity-header', 'secret') else self.headers[h]) for h in self.headers.keys() if h.lower() in ('metadata', 'x-identity-header', 'secret')}})
            body = json.dumps({'access_token': token, 'expires_in': '3600', 'expires_on': str(int(time.time()) + 3600), 'resource': 'https://storage.azure.com', 'token_type': 'Bearer'}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    from azure.identity import ManagedIdentityCredential
    cases = []
    sub = ('import json,sys,os\nfrom azure.identity import ManagedIdentityCredential\n'
           'kw = json.loads(sys.argv[1])\nc = ManagedIdentityCredential(**kw)\n'
           't = c.get_token("https://storage.azure.com/.default")\nprint(json.dumps({"token_type": "str", "has_token": bool(t.token)}))\n')

    def run(label, env_extra, kw):
        before = len(log)
        e = {'PATH': '/nonexistent', 'HOME': str(WORK), 'PYTHONPATH': os.pathsep.join(sys.path)}
        e.update(env_extra)
        r = subprocess.run([sys.executable, '-c', sub, json.dumps(kw)], capture_output=True, text=True, env=e, timeout=60)
        reqs = log[before:]
        cases.append({'case': label, 'ok': r.returncode == 0, 'requests': [x for x in reqs if x['path'].endswith('/token') or 'token' in x['path']][:1]})
    run('a function app or an App Service app (system-assigned)', {'IDENTITY_ENDPOINT': 'http://127.0.0.1:%d/msi/token' % port, 'IDENTITY_HEADER': 'the-secret-of-this-host'}, {})
    run('a function app with a user-assigned identity', {'IDENTITY_ENDPOINT': 'http://127.0.0.1:%d/msi/token' % port, 'IDENTITY_HEADER': 'the-secret-of-this-host'},
        {'client_id': '22222222-3333-4444-5555-666666666666'})
    run('a virtual machine (the instance metadata service)', {'AZURE_POD_IDENTITY_AUTHORITY_HOST': 'http://127.0.0.1:%d' % port}, {})
    srv.shutdown()
    counts('identity.managed_identity_requests', {'cases': cases})
    counts('identity.token_claims', {'claims': claims, 'made_up': True, 'order': list(claims.keys())})


# ---------------------------------------------------------------------------------------------------------------------------
# Event Hubs: how many events fit in a batch, and the checkpoint store kept in blobs
# ---------------------------------------------------------------------------------------------------------------------------
def sec_eventhubs():
    from azure.eventhub import EventData, EventDataBatch
    from azure.eventhub.extensions.checkpointstoreblob import BlobCheckpointStore

    def fill(limit, payload, key=None):
        b = EventDataBatch(max_size_in_bytes=limit, partition_key=key)
        n, first = 0, None
        try:
            while True:
                b.add(EventData(b'x' * payload))
                n += 1
                if n == 1:
                    first = b.size_in_bytes
        except ValueError as e:
            return {'events': n, 'size_in_bytes': b.size_in_bytes, 'first_event_total': first, 'error': str(e)}
    rows = []
    for limit in (256 * 1024, 1024 * 1024):
        for payload in (100, 1000, 10000, 100000, 240000, 300000):
            r = fill(limit, payload)
            rk = fill(limit, payload, 'C-0001')
            n = r['events']
            over_first = (r['first_event_total'] - payload) if n else None
            over_next = round((r['size_in_bytes'] - r['first_event_total']) / (n - 1) - payload, 1) if n > 1 else None
            rows.append({'limit_bytes': limit, 'payload_bytes': payload, 'events_in_batch': n, 'events_with_key': rk['events'], 'batch_bytes': r['size_in_bytes'],
                         'overhead_first_event_bytes': over_first, 'overhead_each_later_event_bytes': over_next, 'error': r['error']})
    with_key = fill(1024 * 1024, 100, 'C-0001')
    without = fill(1024 * 1024, 100)
    b = EventDataBatch(max_size_in_bytes=1024 * 1024, partition_key='C-0001')
    b.add(EventData(b'x'))
    ann = {k.decode() if isinstance(k, bytes) else k: v for k, v in (b._message.message_annotations or {}).items()}
    counts('eventhubs.batch', {'rows': rows, 'limits': [256 * 1024, 1024 * 1024], 'with_partition_key_events': with_key['events'], 'without_partition_key_events': without['events'],
                               'partition_key_travels_as': ann, 'class': 'azure.eventhub.EventDataBatch', 'no_connection_needed': True})

    # the checkpoint store: one blob for each partition says who owns it, and one says where it was read up to
    az = start_azurite()
    svc = BlobServiceClient.from_connection_string(az['conn'])
    svc.create_container('checkpoints')
    store = BlobCheckpointStore.from_connection_string(az['conn'], 'checkpoints')
    fq = 'evhns-brewline-prod.servicebus.windows.net'
    base = {'fully_qualified_namespace': fq, 'eventhub_name': 'orders', 'consumer_group': '$Default'}
    own = store.claim_ownership([dict(base, partition_id=str(p), owner_id='worker-A') for p in (0, 1, 2, 3)])
    claimed_a = [o['partition_id'] for o in own]
    etags = {o['partition_id']: o['etag'] for o in own}
    stale = store.claim_ownership([dict(base, partition_id='1', owner_id='worker-B', etag='"0xDEAD"')])
    stolen = store.claim_ownership([dict(base, partition_id='1', owner_id='worker-B', etag=etags['1'])])
    store.update_checkpoint(dict(base, partition_id='0', offset='4096', sequence_number=41))
    store.update_checkpoint(dict(base, partition_id='0', offset='8192', sequence_number=83))
    cps = store.list_checkpoints(fq, 'orders', '$Default')
    blobs = [{'name': x.name.replace(fq, '<namespace>'), 'metadata': x.metadata} for x in svc.get_container_client('checkpoints').list_blobs(include=['metadata'])]
    counts('eventhubs.checkpoints', {'claimed_by_worker_a': claimed_a, 'stale_etag_claim_returned': [o['partition_id'] for o in stale], 'right_etag_claim_returned': [(o['partition_id'], o['owner_id']) for o in stolen],
                                     'checkpoints': [{'partition_id': c['partition_id'], 'offset': c['offset'], 'sequence_number': c['sequence_number']} for c in cps],
                                     'blobs': blobs, 'store': 'BlobCheckpointStore', 'container': 'checkpoints', 'etag_is_opaque': True})

    # how the 600,000 order events would spread over 4 partitions, for different partition keys. Event Hubs does not publish how it hashes a key,
    # so MD5 of the key as text, modulo 4, stands in for it. The point is the shape: few values, or one dominant value, make one hot partition.
    con = build_orders()['con']
    parts = 4
    spread = {}
    for col in ('order_id', 'customer_id', 'store_id', 'channel', 'status'):
        vals = con.execute("SELECT CAST(%s AS VARCHAR), count(*) FROM orders GROUP BY 1" % col).fetchall()
        buckets = [0] * parts
        for v, n in vals:
            buckets[int(hashlib.md5(v.encode()).hexdigest(), 16) % parts] += n
        spread[col] = {'distinct': len(vals), 'partitions': buckets, 'busiest_share': round(max(buckets) / ORDERS_N, 4), 'skew': round(max(buckets) / (ORDERS_N / parts), 2),
                       'empty': sum(1 for b in buckets if b == 0)}
    counts('eventhubs.keyspread', {'partitions': parts, 'events': ORDERS_N, 'by_key': spread,
                                   'stand_in_hash': 'MD5 of the key as text, as an integer, modulo 4. Event Hubs does not publish how it hashes a partition key.'})


# ---------------------------------------------------------------------------------------------------------------------------
# Event Grid: the events that Storage can raise, and a parsed BlobCreated event
# ---------------------------------------------------------------------------------------------------------------------------
def sec_eventgrid():
    import azure.eventgrid as eg
    from azure.eventgrid import EventGridEvent
    from azure.core.messaging import CloudEvent
    ev = json.loads((HERE / 'funcproj' / 'event.json').read_text())[0]
    e = EventGridEvent.from_dict(ev)
    ce = CloudEvent.from_dict({'specversion': '1.0', 'id': ev['id'], 'source': ev['topic'], 'type': ev['eventType'], 'subject': ev['subject'], 'time': ev['eventTime'], 'data': ev['data']})
    names = {n: getattr(eg.SystemEventNames, n).value for n in dir(eg.SystemEventNames) if n.startswith('Storage') and n.endswith('EventName')}
    file('eventgrid/blob_created.json', jdump(ev))
    counts('eventgrid.parse', {
        'event_type': e.event_type, 'subject': e.subject, 'topic_ends_with': e.topic.split('/')[-1], 'data_keys': list(e.data.keys()), 'content_length': e.data['contentLength'],
        'api': e.data['api'], 'data_version': e.data_version, 'metadata_version': e.metadata_version,
        'cloud_event': {'type': ce.type, 'source_ends_with': ce.source.split('/')[-1], 'has_subject': bool(ce.subject)},
        'storage_event_types': sorted(names.values()),
        'subject_has_container_and_blob': e.subject.startswith('/blobServices/default/containers/') and '/blobs/' in e.subject})


# ---------------------------------------------------------------------------------------------------------------------------
# Functions: pytest on an Event Grid triggered handler, against Azurite
# ---------------------------------------------------------------------------------------------------------------------------
def run_pytest(handler_source):
    proj = WORK / ('funcproj-' + hashlib.md5(handler_source.encode()).hexdigest()[:6])
    shutil.copytree(HERE / 'funcproj', proj, ignore=shutil.ignore_patterns('__pycache__', 'handler_bug.py', '.pytest_cache'))
    (proj / 'handler.py').write_text(handler_source)
    r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--no-header', '-p', 'no:cacheprovider', '-rA', 'tests'], cwd=proj, capture_output=True, text=True,
                       env=dict(os.environ, PYTHONPATH=os.pathsep.join(sys.path)), timeout=300)
    out = r.stdout.replace(str(proj), 'funcproj')
    out = re.sub(r' in \d+\.\d+s', '', out)
    out = re.sub(r'RequestId:[0-9a-f-]{36}', 'RequestId:<id>', out)
    out = re.sub(r'Time:\d{4}-\d\d-\d\dT[\d:.]+Z', 'Time:<time>', out)
    out = re.sub(r'\n={3,} (.*?) ={3,}', r'\n== \1 ==', out)
    lines = [ln for ln in out.splitlines() if not ln.startswith('/') and 'warnings summary' not in ln]
    return r.returncode, '\n'.join(lines).strip()


def sec_functions():
    az = start_azurite()
    for name in ('handler.py', 'handler_bug.py', 'conftest.py', 'event.json'):
        file('func/' + name, (HERE / 'funcproj' / name).read_text())
    file('func/test_handler.py', (HERE / 'funcproj' / 'tests' / 'test_handler.py').read_text())
    rc_ok, out_ok = run_pytest((HERE / 'funcproj' / 'handler.py').read_text())
    rc_bad, out_bad = run_pytest((HERE / 'funcproj' / 'handler_bug.py').read_text())
    text('test.pass', out_ok)
    text('test.fail', out_bad)
    summ = lambda s: dict(zip(('passed', 'failed'), [int(re.search(r'(\d+) ' + w, s).group(1)) if re.search(r'(\d+) ' + w, s) else 0 for w in ('passed', 'failed')]))
    counts('test.summary', {'good': dict(summ(out_ok), rc=rc_ok), 'bug': dict(summ(out_bad), rc=rc_bad), 'failing': sorted(set(re.findall(r'FAILED \S+::(\w+)', out_bad)))})
    # one run of the handler, twice with the same event
    sys.path.insert(0, str(HERE / 'funcproj'))
    import importlib
    import azure.functions as func
    svc = BlobServiceClient.from_connection_string(az['conn'])
    svc.create_container('rawrun')
    svc.create_container('curatedrun')
    os.environ['SUMMARY_CONTAINER'] = 'curatedrun'
    import handler
    importlib.reload(handler)
    name = 'orders/dt=2026-03-14/orders-0001.json'
    svc.get_blob_client('rawrun', name).upload_blob('\n'.join(json.dumps(o) for o in [{'order_id': 'O-5001', 'status': 'COMPLETED', 'total_eur': 11.5}, {'order_id': 'O-5002', 'status': 'COMPLETED', 'total_eur': 8.0},
                                                                                   {'order_id': 'O-5003', 'status': 'CANCELLED', 'total_eur': 30.0}]), overwrite=True)
    ev = func.EventGridEvent(id='1', data={'api': 'PutBlob'}, topic='/subscriptions/x/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod',
                             subject='/blobServices/default/containers/rawrun/blobs/' + name, event_type='Microsoft.Storage.BlobCreated',
                             event_time=datetime.datetime(2026, 3, 14, 9, 0, 5, tzinfo=datetime.timezone.utc), data_version='')
    first, second = handler.process(ev), handler.process(ev)
    counts('functions.run', {'first': first, 'second': second, 'summary_blob': 'order_summaries/' + name.replace('/', '_') + '.json',
                             'split_subject': dict(zip(('container', 'blob'), handler.split_subject(ev.subject)))})


# ---------------------------------------------------------------------------------------------------------------------------
# Data Factory: pipeline files checked against the SDK models, and incremental loads with a watermark
# ---------------------------------------------------------------------------------------------------------------------------
def sec_adf():
    import adf_check
    import duckdb
    results = {}
    for p in sorted((HERE / 'adfproj').glob('*.json')):
        file('adf/' + p.name, p.read_text().rstrip('\n'))
        findings = adf_check.check(json.loads(p.read_text()))
        results[p.name] = {'valid': not findings, 'findings': [{'code': f['code'], 'where': f['where'], 'message': f['message']} for f in findings]}
    counts('adf.check', {'files': results, 'activity_types': len(adf_check.ACTIVITY_TYPES), 'source_types': len(adf_check.SOURCE_TYPES), 'sink_types': len(adf_check.SINK_TYPES),
                         'dependency_conditions': sorted(adf_check.CONDITIONS), 'checker': 'adf_check.py on the classes of azure-mgmt-datafactory ' + (version('azure-mgmt-datafactory') or '')})

    con = duckdb.connect()
    con.execute("CREATE TABLE src(order_id VARCHAR, total_eur DOUBLE, modified_at TIMESTAMP, committed_at TIMESTAMP)")
    rows = [('O1', 10.0, '2026-03-14 08:30:00', '2026-03-14 08:30:00'), ('O2', 12.5, '2026-03-14 08:45:00', '2026-03-14 08:45:00'),
            ('O3', 8.0, '2026-03-14 08:58:00', '2026-03-14 09:03:00'), ('O4', 20.0, '2026-03-14 09:10:00.000', '2026-03-14 09:10:00.100'),
            ('O5', 9.5, '2026-03-14 09:10:00.000', '2026-03-14 09:10:00.200'), ('O6', 15.0, '2026-03-14 09:30:00', '2026-03-14 09:30:00')]
    con.executemany("INSERT INTO src VALUES (?, ?, CAST(? AS TIMESTAMP), CAST(? AS TIMESTAMP))", rows)
    runs = ['2026-03-14 09:00:00', '2026-03-14 09:10:00.150', '2026-03-14 10:00:00']
    strategies = [
        ('A', 'The watermark is the largest modified_at that was loaded. The next run reads modified_at > watermark.'),
        ('B', 'The watermark is the time the run started. The next run reads modified_at > watermark and <= its own start. Most first pipelines do this.'),
        ('C', 'The watermark is the time the run started, but the next run starts 15 minutes earlier and upserts by order_id.'),
    ]
    out = {}
    for key, rule in strategies:
        con.execute("DROP TABLE IF EXISTS tgt")
        con.execute("CREATE TABLE tgt(order_id VARCHAR PRIMARY KEY, total_eur DOUBLE, modified_at TIMESTAMP)")
        wm, prev, steps, loaded_total = '1970-01-01 00:00:00', None, [], 0
        for run in runs:
            if key == 'A':
                where = "modified_at > CAST(? AS TIMESTAMP) AND committed_at <= CAST(? AS TIMESTAMP)"
                params = [wm, run]
            elif key == 'B':
                where = "modified_at > CAST(? AS TIMESTAMP) AND modified_at <= CAST(? AS TIMESTAMP) AND committed_at <= CAST(? AS TIMESTAMP)"
                params = [wm, run, run]
            else:
                where = "modified_at >= CAST(? AS TIMESTAMP) - INTERVAL 15 MINUTE AND committed_at <= CAST(? AS TIMESTAMP)"
                params = [wm, run]
            got = con.execute("SELECT order_id, modified_at FROM src WHERE " + where + " ORDER BY order_id", params).fetchall()
            con.execute("INSERT OR REPLACE INTO tgt SELECT order_id, total_eur, modified_at FROM src WHERE " + where, params)
            loaded_total += len(got)
            if key == 'A':
                if got:
                    wm = max(g[1] for g in got).strftime('%Y-%m-%d %H:%M:%S.%f')
            else:
                wm = run
            steps.append({'run_at': run, 'reads': [g[0] for g in got], 'watermark_after': wm})
        final = [r[0] for r in con.execute("SELECT order_id FROM tgt ORDER BY order_id").fetchall()]
        out[key] = {'rule': rule, 'runs': steps, 'final': final, 'missing': [r[0] for r in rows if r[0] not in final], 'rows_read_in_total': loaded_total}
    counts('adf.watermark', {'source': [{'order_id': r[0], 'modified_at': r[2], 'committed_at': r[3]} for r in rows], 'runs': runs, 'strategies': out})


# ---------------------------------------------------------------------------------------------------------------------------
# The Brewline orders, written as Parquet in three layouts, for Synapse serverless and for the dedicated pool
# ---------------------------------------------------------------------------------------------------------------------------
ORDERS_N = 600000
FIRST_DAY = datetime.date(2026, 1, 14)
DAYS = 60
LAYOUT = {}


def build_orders():
    import duckdb
    import pyarrow.parquet as pq
    if LAYOUT:
        return LAYOUT
    con = duckdb.connect()
    con.execute("""
        CREATE TABLE orders AS
        SELECT i AS order_id,
               DATE '2026-01-14' + CAST(hash(i * 13) % 60 AS INTEGER) AS order_date,
               'C-' || lpad(CAST(1 + CAST(floor(pow((hash(i * 17) % 1000000) / 1000000.0, 2.2) * 12000) AS INTEGER) AS VARCHAR), 5, '0') AS customer_id,
               'S-' || lpad(CAST(1 + hash(i * 19) % 12 AS VARCHAR), 2, '0') AS store_id,
               'P-' || lpad(CAST(1 + hash(i * 23) % 40 AS VARCHAR), 3, '0') AS product_id,
               CAST(1 + hash(i * 29) % 4 AS INTEGER) AS qty,
               round(2.5 + (hash(i * 31) % 45) / 10.0, 2) AS unit_price_eur,
               CASE WHEN hash(i * 37) % 100 < 88 THEN 'COMPLETED' WHEN hash(i * 37) % 100 < 94 THEN 'CANCELLED' WHEN hash(i * 37) % 100 < 98 THEN 'REFUNDED' ELSE 'PENDING' END AS status,
               CASE WHEN hash(i * 41) % 100 < 45 THEN 'web' WHEN hash(i * 41) % 100 < 85 THEN 'app' ELSE 'store' END AS channel
        FROM range(1, {N}) t(i)""".replace("{N}", str(ORDERS_N + 1)))
    con.execute("ALTER TABLE orders ADD COLUMN total_eur DOUBLE")
    con.execute("UPDATE orders SET total_eur = round(qty * unit_price_eur, 2)")
    con.execute("ALTER TABLE orders ADD COLUMN order_ts TIMESTAMP")
    con.execute("UPDATE orders SET order_ts = CAST(order_date AS TIMESTAMP) + to_seconds(hash(order_id * 43) % 86400)")
    cols = 'order_id, customer_id, store_id, product_id, qty, unit_price_eur, total_eur, status, channel, order_ts, order_date'
    root = WORK / 'lake'
    hive, flat, one = [], [], root / 'orders_one' / 'orders.parquet'
    for d in range(DAYS):
        day = FIRST_DAY + datetime.timedelta(days=d)
        h = root / 'orders_hive' / ('year=%04d' % day.year) / ('month=%02d' % day.month) / ('day=%02d' % day.day) / 'part-0.parquet'
        f = root / 'orders_flat' / ('orders_%s.parquet' % day.isoformat())
        h.parent.mkdir(parents=True, exist_ok=True)
        f.parent.mkdir(parents=True, exist_ok=True)
        con.execute("COPY (SELECT %s FROM orders WHERE order_date = DATE '%s' ORDER BY order_id) TO '%s' (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE 100000)" % (cols, day, h))
        shutil.copy(h, f)
        hive.append(h)
        flat.append(f)
    one.parent.mkdir(parents=True, exist_ok=True)
    con.execute("COPY (SELECT %s FROM orders ORDER BY order_date, order_id) TO '%s' (FORMAT PARQUET, COMPRESSION SNAPPY, ROW_GROUP_SIZE 100000)" % (cols, one))
    LAYOUT.update({'con': con, 'root': root, 'hive': hive, 'flat': flat, 'one': one, 'pq': pq})
    return LAYOUT


def chunk_bytes(path, columns=None):
    md_ = LAYOUT['pq'].ParquetFile(path).metadata
    tot, by = 0, {}
    for g in range(md_.num_row_groups):
        for c in range(md_.num_columns):
            col = md_.row_group(g).column(c)
            by[col.path_in_schema] = by.get(col.path_in_schema, 0) + col.total_compressed_size
    for k, v in by.items():
        if columns is None or k in columns:
            tot += v
    return tot, by, md_.num_rows, md_.num_row_groups


def wildcard_regex(pattern):
    """A * stands for any text inside one path segment. The text that each * matched is what filepath(n) returns."""
    return re.compile('^' + re.escape(pattern).replace(r'\*', '([^/]*)') + '$')


def sec_synapse():
    lay = build_orders()
    root = lay['root']
    rel = lambda p: p.relative_to(root).as_posix()
    allfiles = [rel(p) for p in lay['hive'] + lay['flat'] + [lay['one']]]
    size = {rel(p): p.stat().st_size for p in lay['hive'] + lay['flat'] + [lay['one']]}
    two = {rel(p): chunk_bytes(p, ('order_date', 'total_eur'))[0] for p in lay['hive'] + lay['flat'] + [lay['one']]}
    nrows = {rel(p): chunk_bytes(p)[2] for p in lay['hive'] + lay['flat'] + [lay['one']]}
    tot_one, by_col, rows_one, groups_one = chunk_bytes(lay['one'])
    counts('synapse.layouts', {
        'rows': ORDERS_N, 'days': DAYS, 'first_day': FIRST_DAY.isoformat(), 'last_day': (FIRST_DAY + datetime.timedelta(days=DAYS - 1)).isoformat(),
        'hive': {'files': len(lay['hive']), 'bytes': sum(size[rel(p)] for p in lay['hive']), 'example': rel(lay['hive'][59])},
        'flat': {'files': len(lay['flat']), 'bytes': sum(size[rel(p)] for p in lay['flat']), 'example': rel(lay['flat'][59])},
        'one': {'files': 1, 'bytes': size[rel(lay['one'])], 'row_groups': groups_one, 'example': rel(lay['one'])},
        'avg_day_file_bytes': round(sum(size[rel(p)] for p in lay['hive']) / len(lay['hive'])),
        'rows_in_busiest_day': max(nrows[rel(p)] for p in lay['hive']), 'rows_in_quietest_day': min(nrows[rel(p)] for p in lay['hive'])})
    counts('synapse.columns', {'bytes_by_column': by_col, 'file': rel(lay['one']), 'row_groups': groups_one})
    # inside the one sorted file: the statistics of each row group, which let an engine skip a group without reading it
    md1 = lay['pq'].ParquetFile(lay['one']).metadata
    di = [i for i in range(md1.num_columns) if md1.schema.column(i).path == 'order_date'][0]
    rg = []
    for g in range(md1.num_row_groups):
        st = md1.row_group(g).column(di).statistics
        rg.append({'rows': md1.row_group(g).num_rows, 'min': str(st.min), 'max': str(st.max)})
    one_day = '2026-03-14'
    hold = [g for g in rg if g['min'] <= one_day <= g['max']]
    counts('synapse.rowgroups', {'file': rel(lay['one']), 'column': 'order_date', 'sorted_by': 'order_date, order_id', 'groups': rg, 'day': one_day,
                                 'groups_that_can_hold_the_day': len(hold), 'rows_in_those_groups': sum(g['rows'] for g in hold)})
    tree = []
    for p in sorted(lay['hive'])[:3] + sorted(lay['hive'])[-1:]:
        tree.append(rel(p))
    text('synapse.layout_tree', '\n'.join(tree[:3] + ['...'] + tree[3:]))

    cases = [
        ('p1', 'orders_hive/year=*/month=*/day=*/*.parquet', None, 'all the day folders, no filter'),
        ('p2', 'orders_hive/year=*/month=*/day=*/*.parquet', ('filepath', 2, '03'), 'all the day folders, WHERE r.filepath(2) = \'03\''),
        ('p3', 'orders_hive/year=2026/month=03/day=*/*.parquet', None, 'the folder of March, in the path'),
        ('p4', 'orders_hive/year=*/month=*/day=14/*.parquet', None, 'the 14th of every month'),
        ('p5', 'orders_hive/year=2026/month=03/day=14/*.parquet', None, 'one day, in the path'),
        ('p6', 'orders_flat/orders_2026-03-*.parquet', None, 'one folder of daily files, March in the name'),
        ('p7', 'orders_flat/*.parquet', ('filename', None, 'orders_2026-03-'), 'one folder of daily files, WHERE r.filename() LIKE \'orders_2026-03-%\''),
        ('p8', 'orders_one/orders.parquet', None, 'one sorted file with every day'),
    ]
    out = []
    for cid, pat, flt, label in cases:
        rx = wildcard_regex(pat)
        hit = []
        for f in sorted(allfiles):
            m = rx.match(f)
            if not m:
                continue
            if flt and flt[0] == 'filepath' and m.group(flt[1]) != flt[2]:
                continue
            if flt and flt[0] == 'filename' and not f.split('/')[-1].startswith(flt[2]):
                continue
            hit.append((f, m.groups()))
        fp = {}
        for _, groups in hit:
            for i, g in enumerate(groups, 1):
                fp.setdefault(str(i), set()).add(g)
        out.append({'id': cid, 'pattern': pat, 'filter': None if not flt else {'function': flt[0], 'n': flt[1], 'value': flt[2]}, 'label': label,
                    'wildcards': pat.count('*'), 'files': len(hit), 'bytes_of_files': sum(size[f] for f, _ in hit), 'bytes_of_two_columns': sum(two[f] for f, _ in hit),
                    'rows': sum(nrows[f] for f, _ in hit), 'first_files': [f for f, _ in hit[:2]], 'filepath_values': {k: sorted(v) for k, v in fp.items()}})
    counts('synapse.prune', {'cases': out})
    # a small result the lesson can show: rows and revenue by month, from the same data
    con = lay['con']
    r = con.execute("SELECT strftime(order_date, '%Y-%m') AS month, count(*) AS orders, round(sum(total_eur) FILTER (WHERE status <> 'CANCELLED'), 2) AS revenue_eur FROM orders GROUP BY 1 ORDER BY 1").fetchall()
    table('synapse.by_month', ['month', 'orders', 'revenue_eur'], [[a, b, c] for a, b, c in r])


# ---------------------------------------------------------------------------------------------------------------------------
# Dedicated SQL pool: 60 distributions. The real hash function is not published, so MD5 mod 60 stands in for it.
# ---------------------------------------------------------------------------------------------------------------------------
def sec_dedicated():
    lay = build_orders()
    con = lay['con']
    D = 60
    res = {}
    for col in ('order_id', 'customer_id', 'store_id', 'order_date', 'status', 'channel', 'product_id'):
        vals = con.execute("SELECT CAST(%s AS VARCHAR), count(*) FROM orders GROUP BY 1" % col).fetchall()
        buckets = [0] * D
        for v, n in vals:
            buckets[int(hashlib.md5(v.encode()).hexdigest(), 16) % D] += n
        avg = ORDERS_N / D
        res[col] = {'distinct': len(vals), 'buckets': buckets, 'max': max(buckets), 'min': min(buckets), 'empty': sum(1 for b in buckets if b == 0), 'skew': round(max(buckets) / avg, 2),
                    'avg': round(avg, 1), 'busiest_value_rows': max(n for _, n in vals)}
    cust = con.execute("SELECT count(DISTINCT customer_id) FROM orders").fetchone()[0]
    top = con.execute("SELECT customer_id, count(*) n FROM orders GROUP BY 1 ORDER BY n DESC LIMIT 3").fetchall()
    # a join of the orders to their customers on customer_id: how many order rows sit on a different distribution than the one that holds
    # their customer, so that they would have to move if the orders table had to be re-hashed on customer_id. Same stand-in hash.
    import functools
    hh = functools.lru_cache(maxsize=None)(lambda v: int(hashlib.md5(v.encode()).hexdigest(), 16) % D)
    rows_ = con.execute("SELECT CAST(order_id AS VARCHAR), customer_id, store_id FROM orders ORDER BY order_id").fetchall()
    place = {'HASH(customer_id)': lambda i, o, c, s_: hh(c), 'HASH(order_id)': lambda i, o, c, s_: hh(o), 'HASH(store_id)': lambda i, o, c, s_: hh(s_),
             'ROUND_ROBIN': lambda i, o, c, s_: i % D}
    mv = []
    for how, fn in place.items():
        moved = sum(1 for i, (o, c, s_) in enumerate(rows_) if fn(i, o, c, s_) != hh(c))
        mv.append({'how': how, 'moved': moved, 'of': len(rows_), 'share': round(moved / len(rows_), 4)})
    counts('dedicated.movement', {'join_column': 'customer_id', 'cases': mv, 'customers': cust,
                                  'note': 'Rows of the orders table that are not on the distribution of their customer. ROUND_ROBIN is dealt out in turn by order number. Same stand-in hash as the distributions.'})
    counts('dedicated.distribution', {'distributions': D, 'rows': ORDERS_N, 'by_column': res, 'customers': cust, 'top_customers': [{'id': a, 'orders': b} for a, b in top],
                                      'stand_in_hash': 'MD5 of the value as text, as an integer, modulo 60. Synapse does not publish its hash function.'})


# ---------------------------------------------------------------------------------------------------------------------------
# KQL: syntax checked by the Kusto language service of Microsoft
# ---------------------------------------------------------------------------------------------------------------------------
def sec_kql():
    qs = ["ADFActivityRun\n| where TimeGenerated > ago(1d)\n| summarize runs = count() by Status\n| order by runs desc",
          "ADFActivityRun\n| where TimeGenerated > ago(1d\n| summarize runs = count() by Status",
          "StorageBlobLogs\n| where TimeGenerated > ago(1d) and StatusCode == 403\n| summarize attempts = count() by CallerIpAddress, AuthenticationType\n| top 10 by attempts desc",
          "StorageBlobLogs\n| where StatusCode == 403\n| summarize attempts = count() by CallerIpAddress\n| top 3 by attempts desc"]
    f = WORK / 'kql.json'
    f.write_text(json.dumps(qs))
    r = subprocess.run(['node', str(HERE / 'kql_check.js'), str(f)], capture_output=True, text=True, timeout=120, cwd=str(HERE))
    if r.returncode:
        sys.exit('kql_check.js failed: ' + r.stderr)
    res = [json.loads(l) for l in r.stdout.strip().splitlines()]
    counts('kql.parse', {'good': {'valid': res[0]['valid'], 'errors': res[0]['errors']}, 'broken': {'valid': res[1]['valid'], 'errors': res[1]['errors']},
                         'checks': 'syntax only, with the Kusto language service of Microsoft (no table schemas)'})
    counts('kql.security', {'storage_403': {'valid': res[2]['valid'], 'errors': res[2]['errors']}, 'challenge': {'valid': res[3]['valid'], 'errors': res[3]['errors']},
                            'checks': 'syntax only, with the Kusto language service of Microsoft (no table schemas)'})


# ---------------------------------------------------------------------------------------------------------------------------
# The lakehouse steps of mission 6, in a local Apache Spark 4 session with Delta Lake (not Databricks, Synapse or Fabric)
# ---------------------------------------------------------------------------------------------------------------------------
def sec_lakehouse():
    py = args.spark_python or sys.executable
    probe = subprocess.run([py, '-c', 'import pyspark, delta'], capture_output=True, text=True)
    if probe.returncode:
        sys.exit('the lakehouse section needs an interpreter with pyspark and delta-spark (and Java 17 or 21).\n'
                 'Try:  python3 -m venv /tmp/spark-venv && /tmp/spark-venv/bin/pip install pyspark==4.0.1 delta-spark==4.0.1\n'
                 'then: python3 azure/verify/capture_az.py --spark-python /tmp/spark-venv/bin/python\n' + probe.stderr[-400:])
    work = WORK / 'spark'
    r = subprocess.run([py, str(HERE / 'spark_job.py'), str(work)], capture_output=True, text=True, timeout=900)
    lines = [l for l in r.stdout.splitlines() if l.startswith('{')]
    if r.returncode or not lines:
        sys.exit('spark_job.py failed:\n' + r.stderr[-2000:])
    res = json.loads(lines[-1])
    for sec in ('files', 'text', 'tables', 'counts'):
        for k, v in res[sec].items():
            put(sec, k, v)
    OUT['meta'].update({k: v for k, v in res['meta'].items()})


# ---------------------------------------------------------------------------------------------------------------------------
# Envelope encryption: what a customer-managed key does, with the cryptography library (AES-GCM, and the AES key wrap of RFC 3394)
# ---------------------------------------------------------------------------------------------------------------------------
ENVELOPE = """import hashlib

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.keywrap import InvalidUnwrap, aes_key_unwrap, aes_key_wrap

# fixed values, so that the run is repeatable. Never reuse a nonce with a real key.
data_key = bytes(range(32))                  # encrypts the data
kek_2025 = bytes([1]) * 32                   # key encryption keys: in Azure they live in Key Vault
kek_2026 = bytes([2]) * 32
nonce = bytes(12)
plaintext = b"order_id,total_eur\\n" * 55_000

ciphertext = AESGCM(data_key).encrypt(nonce, plaintext, None)
wrapped = aes_key_wrap(kek_2025, data_key)
print("data:", len(plaintext), "bytes, encrypted:", len(ciphertext), "bytes, wrapped data key:", len(wrapped), "bytes")
print("fingerprint of the encrypted data, before rotation:", hashlib.sha256(ciphertext).hexdigest()[:16])

# rotate the key encryption key: unwrap with the old one, wrap with the new one. The data is not touched.
rotated = aes_key_wrap(kek_2026, aes_key_unwrap(kek_2025, wrapped))
print("wrapped data key changed:", rotated != wrapped)
print("fingerprint of the encrypted data, after rotation: ", hashlib.sha256(ciphertext).hexdigest()[:16])
print("decrypts with the new key:", AESGCM(aes_key_unwrap(kek_2026, rotated)).decrypt(nonce, ciphertext, None) == plaintext)

# the old key no longer opens the new wrapper, and a destroyed key opens nothing
for name, key in (("old key", kek_2025), ("destroyed key", bytes([9]) * 32)):
    try:
        aes_key_unwrap(key, rotated)
        print(name, "unwraps the data key")
    except InvalidUnwrap:
        print(name, "cannot unwrap the data key")
"""


def sec_crypto():
    import io as _io
    buf = _io.StringIO()
    ns = {}
    with contextlib.redirect_stdout(buf):
        exec(ENVELOPE, ns)
    out = buf.getvalue()
    file('security/envelope.py', ENVELOPE)
    text('security.envelope_output', out.rstrip('\n'))
    counts('security.envelope', {'plaintext_bytes': len(ns['plaintext']), 'ciphertext_bytes': len(ns['ciphertext']), 'tag_bytes': len(ns['ciphertext']) - len(ns['plaintext']),
                                 'data_key_bytes': len(ns['data_key']), 'wrapped_key_bytes': len(ns['wrapped']), 'wrapped_key_changed': ns['wrapped'] != ns['rotated'],
                                 'old_key_cannot_unwrap': 'old key cannot unwrap the data key' in out, 'destroyed_key_cannot_unwrap': 'destroyed key cannot unwrap the data key' in out,
                                 'decrypts_after_rotation': 'decrypts with the new key: True' in out,
                                 'note': 'AES-256-GCM for the data and the AES key wrap of RFC 3394 for the data key, with fixed keys so that the run is repeatable.'})


# ---------------------------------------------------------------------------------------------------------------------------
def finish():
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(OUT, indent=1, sort_keys=True, ensure_ascii=False)
    out.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + body + ';\n')
    if args.json:
        pathlib.Path(args.json).write_text(body)
    print('wrote', out, len(body), 'bytes:', {k: len(v) for k, v in OUT.items()})


SECTIONS = [('blob', sec_blob), ('sas', sec_sas), ('queue', sec_queue), ('identity', sec_identity), ('eventhubs', sec_eventhubs), ('eventgrid', sec_eventgrid),
            ('functions', sec_functions), ('adf', sec_adf), ('synapse', sec_synapse), ('dedicated', sec_dedicated), ('kql', sec_kql), ('lakehouse', sec_lakehouse), ('crypto', sec_crypto)]

if __name__ == '__main__':
    for name, fn in SECTIONS:
        if name in ONLY:
            t = time.time()
            fn()
            print('  %-10s %.1fs' % (name, time.time() - t))
    finish()
