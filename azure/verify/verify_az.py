#!/usr/bin/env python3
"""Check the code and the recorded output of the Azure tutorial.

Nothing in this tutorial ran on Azure. The recording (capture_az.py) comes from the Azure SDK for Python (the real client libraries), Azurite
(an open-source storage emulator from Microsoft), DuckDB, pyarrow, a local Apache Spark with Delta Lake, cryptography, Checkov and the Kusto
language service. This script checks what can be checked without an Azure account:

1. Every Python snippet in the lessons is parsed with ast. Every call of an Azure SDK class or method is checked against the installed
   library: the keyword names (the signature and the documented keywords), the number of positional arguments, and the required arguments.
   The type of a variable is followed through assignments and return annotations, so `container.list_blobs(name_starts_with=...)` is checked
   against ContainerClient. Names that are imported must exist.
2. Snippets that can run are run: the conditional writes against Azurite (the codes 409 and 412 of the recording), the delete-a-day bug and its
   fix, the queue worker that moves a message to a poison queue, the lost message of the bug hunt, the envelope encryption (its output must equal
   the recorded output), the Event Grid handler with its three tests (and the bug variant with its failing test), and the solutions of the
   Python challenges.
3. SQL: the T-SQL of the lessons is parsed with sqlglot. The Synapse-specific forms (OPENROWSET, external tables, CTAS with DISTRIBUTION, COPY INTO,
   DBCC) are read against the documented grammar with regular expressions, and the SELECT inside them is parsed. The solutions of the SQL
   challenges run in DuckDB on the tables shown on screen and must give the table shown on screen. KQL is parsed with the Kusto language service.
4. JSON: syntax of every document; the Data Factory pipelines through the models of azure-mgmt-datafactory (the broken ones must give the
   recorded findings); the lifecycle rule through the models of azure-mgmt-storage; the Event Grid event through azure-eventgrid; the Delta
   log against the recorded one.
5. Bicep: every snippet is parsed with pycep (the parser Checkov uses). The pair of the network bug is scanned with Checkov. The GitHub
   workflow goes through check-jsonschema. The Bicep program itself was not run.
6. Shell: `bash -n`, and every `az` command and option against the help of the installed Azure CLI.
7. The logic of the lab widgets (check_widgets.js) and the content lint run.
8. Controls: deliberately broken inputs are fed to the checkers, which must refuse them.
9. With --recapture, the whole recording is made again and compared with js/real.js.

What this cannot show: that Azure accepts a call, a template or a statement, what Azure RBAC or the firewall really decides, how Data Factory,
Synapse, Event Hubs, Event Grid or Functions behave under load, what anything costs, or that a feature, limit or price is current. Those
screens carry the "From documentation" tag, and the README lists the pages they come from.

Run:  python3 azure/verify/verify_az.py [--no-run] [--no-cli] [--recapture] [--reuse] [--verbose]
Needs: pip install -r dev/requirements.txt  and  npm install --prefix azure/verify  (Azurite and the Kusto language service), Node 20 or later, bash.
       Optional: an environment with checkov, check-jsonschema and pycep-parser (--iac-python or AZ_IAC_PYTHON), the Azure CLI (AZ_CLI or `az` on the PATH),
       and for --recapture an environment with pyspark and delta-spark (AZ_SPARK_PYTHON) and Java 17 or 21. A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import atexit
import contextlib
import importlib
import inspect
import io
import json
import logging
import os
import pathlib
import re
import shlex
import shutil
import socket
import subprocess
import sys
import tempfile
import textwrap
import time
import typing
import warnings

warnings.filterwarnings('ignore')
for _k in list(os.environ):
    if _k.startswith('AZURE_') or _k in ('IDENTITY_ENDPOINT', 'IDENTITY_HEADER', 'MSI_ENDPOINT', 'MSI_SECRET'):
        del os.environ[_k]

import duckdb
import sqlglot
import yaml
from sqlglot import errors

logging.getLogger('sqlglot').setLevel(logging.ERROR)
logging.getLogger('azure').setLevel(logging.ERROR)
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE / '.cache'
ACCOUNT = 'devstoreaccount1'
DEV_KEY = 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='    # the published key of the emulator, not a secret

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='skip everything that starts Azurite, DuckDB, pytest, Checkov or the CLI')
ap.add_argument('--no-cli', action='store_true', help='skip the check of the az commands')
ap.add_argument('--recapture', action='store_true', help='record everything again and compare with js/real.js')
ap.add_argument('--reuse', action='store_true', help='with --recapture: compare the recording kept in verify/.cache from the last --recapture')
ap.add_argument('--iac-python', default=os.environ.get('AZ_IAC_PYTHON'), help='python with checkov, check-jsonschema and pycep-parser')
ap.add_argument('--verbose', action='store_true')
args = ap.parse_args()

problems = 0
TALLY = {}
SKIPPED = []
CAPTURE = None


def bad(msg):
    global problems
    if CAPTURE is not None:                          # a control is running: it wants to see that the checker refuses the input
        CAPTURE.append(msg)
        return
    problems += 1
    print('PROBLEM:', msg)


def control(label, fn):
    """Feed a deliberately broken input to a checker. The checker must refuse it, or this verifier fails."""
    global CAPTURE
    CAPTURE = []
    saved = dict(TALLY)
    try:
        fn()
    except Exception as e:                           # an exception is a refusal too: a parser that raises has refused the input
        CAPTURE.append(str(e))
    finally:
        found, CAPTURE = CAPTURE, None
        TALLY.clear()
        TALLY.update(saved)
    if found:
        tick('controls: broken inputs refused')
    else:
        bad('control: a checker accepted a broken input (' + label + ')')


def tick(group, n=1):
    TALLY[group] = TALLY.get(group, 0) + n


def note(msg):
    if args.verbose:
        print('  note:', msg)


def skipped(what, why):
    SKIPPED.append(what + ': ' + why)
    print('  skipped:', what, '(' + why + ')')


def expect(cond, msg, group=None):
    if cond:
        if group:
            tick(group)
    else:
        bad(msg)
    return cond


try:
    from azure.core import MatchConditions
    from azure.core.credentials import AccessToken
    from azure.core.exceptions import HttpResponseError, ResourceExistsError, ResourceNotFoundError
    from azure.storage.blob import BlobServiceClient, ContainerClient
    from azure.storage.queue import QueueClient, QueueServiceClient
    import azure.functions as func
    from azure.mgmt.datafactory import DataFactoryManagementClient
    from azure.keyvault.secrets import SecretClient
except ImportError as e:
    sys.exit('The Azure SDK packages are missing (' + str(e) + '). Run: pip install -r dev/requirements.txt')


def load_real(path):
    text = pathlib.Path(path).read_text()
    return json.loads(text[text.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


real = load_real(ROOT / 'azure' / 'js' / 'real.js')
C = real['counts']
dump = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'azure']))
SN = {}
for s in dump['snippets']:
    SN[(s['id'], s['kind'])] = s
RES = {}
for r in dump['results']:
    RES.setdefault(r['id'], {}).setdefault(r['kind'], []).append(r)


def code_of(sid, kind='code'):
    return SN[(sid, kind)]['code']


WORK = pathlib.Path(tempfile.mkdtemp(prefix='azure-verify-'))
atexit.register(lambda: shutil.rmtree(WORK, ignore_errors=True))

# ======================================================================================================================
# Azurite, started on free ports in a work folder (blobs and queues). It is an emulator, not Azure.
# ======================================================================================================================
AZ = {}


def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


def start_azurite():
    if AZ:
        return AZ
    exe = HERE / 'node_modules' / '.bin' / 'azurite'
    exe = str(exe) if exe.exists() else shutil.which('azurite')
    if not exe:
        return None
    bp, qp, tp = free_port(), free_port(), free_port()
    log = open(WORK / 'azurite.log', 'w')
    proc = subprocess.Popen([exe, '--silent', '--location', str(WORK / 'azurite-data'), '--blobPort', str(bp), '--queuePort', str(qp), '--tablePort', str(tp),
                             '--skipApiVersionCheck'], stdout=log, stderr=log)
    atexit.register(lambda: (proc.terminate(), proc.wait(timeout=10)))
    for _ in range(100):
        try:
            for p in (bp, qp):
                socket.create_connection(('127.0.0.1', p), timeout=0.5).close()
            break
        except OSError:
            time.sleep(0.2)
    else:
        bad('Azurite did not start: ' + (WORK / 'azurite.log').read_text())
        return None
    AZ.update({'conn': 'DefaultEndpointsProtocol=http;AccountName=%s;AccountKey=%s;BlobEndpoint=http://127.0.0.1:%d/%s;QueueEndpoint=http://127.0.0.1:%d/%s;'
                       % (ACCOUNT, DEV_KEY, bp, ACCOUNT, qp, ACCOUNT)})
    return AZ


def azurite():
    if args.no_run:
        return None
    a = start_azurite()
    if not a:
        skipped('the runs against Azurite', 'Azurite is missing: npm install --prefix azure/verify')
    return a


def fresh_container(name, blobs=None):
    svc = BlobServiceClient.from_connection_string(AZ['conn'])
    try:
        svc.delete_container(name)
        time.sleep(0.2)
    except ResourceNotFoundError:
        pass
    c = svc.create_container(name)
    for b in (blobs or []):
        c.upload_blob(b, b'x', overwrite=True)
    return c


def fresh_queue(name):
    svc = QueueServiceClient.from_connection_string(AZ['conn'])
    try:
        svc.delete_queue(name)
        time.sleep(0.3)
    except ResourceNotFoundError:
        pass
    for _ in range(10):
        try:
            return svc.create_queue(name)
        except HttpResponseError:                       # the emulator may need a moment after a delete
            time.sleep(0.5)
    return svc.create_queue(name)


def run_code(code, ns):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(code, '<snippet>', 'exec'), ns)
    return buf.getvalue()


# ======================================================================================================================
# 1. Python: syntax, and every Azure SDK call against the installed library
# ======================================================================================================================
CHECK_PREFIXES = ('azure', 'cryptography')


class Inst:
    """A value that is known only by its class (or by a real object that was built without any network call)."""
    def __init__(self, cls, obj=None, args=()):
        self.cls, self.obj, self.args = cls, obj, args


class Meth:
    def __init__(self, owner, fn, skip_first):
        self.owner, self.fn, self.skip_first = owner, fn, skip_first


def checkable(fn):
    base = inspect.unwrap(fn) if callable(fn) else fn
    mod = getattr(base, '__module__', '') or ''
    return mod.startswith(CHECK_PREFIXES)


def doc_keywords(fn):
    names = set()
    docs = []
    try:
        docs.append(inspect.getdoc(inspect.unwrap(fn)) or '')
    except Exception:
        pass
    if inspect.isclass(fn):
        docs.append(inspect.getdoc(fn.__init__) or '')
        for base in fn.__mro__[1:]:
            docs.append(inspect.getdoc(base) or '')
    for d in docs:
        names |= set(re.findall(r':(?:keyword|param)\s+(?:[^:\n]*?\s)?(\w+):', d))
    return names


def wrap_type(t, owner):
    if t is None:
        return None
    if t is getattr(typing, 'Self', object()) or str(t).endswith('Self'):
        return Inst(owner) if owner else None
    origin = typing.get_origin(t)
    if origin is typing.Union or str(origin) == "<class 'types.UnionType'>":
        rest = [a for a in typing.get_args(t) if a is not type(None)]
        return wrap_type(rest[0], owner) if len(rest) == 1 else None
    if origin is not None and isinstance(origin, type):
        return Inst(origin, args=typing.get_args(t))
    if isinstance(t, type):
        return Inst(t)
    return None


def ret_type(fn, owner=None):
    base = inspect.unwrap(fn)
    t = getattr(base, '__annotations__', {}).get('return')
    if isinstance(t, str):
        scope = dict(getattr(sys.modules.get(base.__module__), '__dict__', {}))
        scope.update(getattr(base, '__globals__', {}))
        try:
            t = eval(t, scope)
        except Exception:
            return None
    return wrap_type(t, owner)


class DummyCredential:
    def get_token(self, *scopes, **kwargs):
        return AccessToken('x', int(time.time()) + 3600)


def seeds_for(sid):
    """Names that the lesson text defines in an earlier screen. Real objects, built without any network call."""
    conn = 'DefaultEndpointsProtocol=http;AccountName=%s;AccountKey=%s;BlobEndpoint=http://127.0.0.1:1/%s;QueueEndpoint=http://127.0.0.1:2/%s;' % (ACCOUNT, DEV_KEY, ACCOUNT, ACCOUNT)
    out = {}
    if sid.startswith(('m2-bug', 'm2-cond')):
        out['container'] = Inst(ContainerClient, ContainerClient.from_connection_string(conn, 'raw'))
    if sid.startswith('m5-bug2'):
        out['client'] = Inst(DataFactoryManagementClient, DataFactoryManagementClient(DummyCredential(), '00000000-0000-0000-0000-000000000000'))
    if sid.startswith('m11-bug'):
        out['client'] = Inst(SecretClient, SecretClient('https://kv-brewline-prod.vault.azure.net', DummyCredential()))
    if sid.startswith('m10-bug2'):
        out['queue'] = Inst(QueueClient, QueueClient.from_connection_string(conn, 'orders'))
    return out


DEFAULT_NAMES = {'MatchConditions': MatchConditions, 'ResourceExistsError': ResourceExistsError, 'HttpResponseError': HttpResponseError,
                 'ResourceNotFoundError': ResourceNotFoundError}


class Analyzer(ast.NodeVisitor):
    def __init__(self, sid, kind, code):
        self.sid, self.kind, self.code = sid, kind, code
        self.where = sid + ' ' + kind
        self.env = dict(DEFAULT_NAMES)
        self.scope = seeds_for(sid)
        self.func_ret = {}
        self.calls = 0

    # ---- imports: every name must exist
    def collect_imports(self, tree):
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module and node.module.split('.')[0] in ('azure', 'cryptography', 'json', 'os', 'sys', 'time', 'hashlib'):
                try:
                    mod = importlib.import_module(node.module)
                except Exception as e:
                    bad(self.where + ': cannot import ' + node.module + ' (' + str(e) + ')')
                    continue
                for a in node.names:
                    obj = getattr(mod, a.name, None)
                    if obj is None:
                        try:
                            obj = importlib.import_module(node.module + '.' + a.name)
                        except Exception:
                            bad(self.where + ': ' + node.module + ' has no name ' + a.name)
                            continue
                    self.env[a.asname or a.name] = obj
                    tick('python names imported')
            elif isinstance(node, ast.Import):
                for a in node.names:
                    top = a.name.split('.')[0]
                    if top in ('azure', 'cryptography', 'json', 'os', 'sys', 'time', 'hashlib', 'uuid', 're'):
                        try:
                            self.env[a.asname or top] = importlib.import_module(a.name if a.asname else top)
                            if a.name.startswith('azure'):
                                tick('python names imported')
                        except Exception as e:
                            bad(self.where + ': cannot import ' + a.name + ' (' + str(e) + ')')

    # ---- what is this expression?
    def typeof(self, node):
        if isinstance(node, ast.Name):
            return self.scope.get(node.id, self.env.get(node.id))
        if isinstance(node, ast.Attribute):
            base = self.typeof(node.value)
            if base is None:
                return None
            name = node.attr
            if inspect.ismodule(base):
                if hasattr(base, name):
                    return getattr(base, name)
                try:
                    return importlib.import_module(base.__name__ + '.' + name)
                except Exception:
                    if base.__name__.startswith('azure'):
                        bad(self.where + ': ' + base.__name__ + ' has no attribute ' + name)
                    return None
            if isinstance(base, type):
                member = inspect.getattr_static(base, name, None)
                if isinstance(member, classmethod):
                    return Meth(base, member.__func__, True)
                if isinstance(member, staticmethod):
                    return Meth(base, member.__func__, False)
                if inspect.isfunction(member):
                    return Meth(base, member, False)
                return member if isinstance(member, type) else None
            if isinstance(base, Inst):
                if base.obj is not None and hasattr(base.obj, name):
                    value = getattr(base.obj, name)
                    if inspect.ismethod(value):
                        return Meth(type(base.obj), value.__func__, True)
                    if inspect.isroutine(value):
                        return None
                    return Inst(type(value), value) if not isinstance(value, (str, int, float, bool, list, dict, tuple, type(None))) else None
                member = inspect.getattr_static(base.cls, name, None)
                if isinstance(member, classmethod):
                    return Meth(base.cls, member.__func__, True)
                if inspect.isfunction(member):
                    return Meth(base.cls, member, True)
                if isinstance(member, property) and member.fget is not None:
                    return ret_type(member.fget, base.cls)
            return None
        if isinstance(node, ast.Call):
            callee = self.typeof(node.func)
            if isinstance(node.func, ast.Name) and node.func.id in self.func_ret and callee is None:
                return self.func_ret[node.func.id]
            if isinstance(callee, type):
                return Inst(callee)
            if isinstance(callee, Meth):
                return ret_type(callee.fn, callee.owner)
            if inspect.isroutine(callee):
                return ret_type(callee)
            return None
        return None

    # ---- the checks
    def check_call(self, node):
        callee = self.typeof(node.func)
        if callee is None:
            if isinstance(node.func, ast.Attribute):
                base = self.typeof(node.func.value)
                mod = getattr(getattr(base, 'cls', None), '__module__', '') or ''
                if isinstance(base, Inst) and base.cls.__name__.endswith('Client') and mod.startswith('azure') and '.mgmt' not in mod:
                    name = node.func.attr
                    if not hasattr(base.cls, name) and not (base.obj is not None and hasattr(base.obj, name)):
                        bad(self.where + ': ' + base.cls.__name__ + ' has no method ' + name)
            return
        skip_first = False
        if isinstance(callee, type):
            fn, label = callee, callee.__name__
        elif isinstance(callee, Meth):
            fn, label, skip_first = callee.fn, callee.owner.__name__ + '.' + callee.fn.__name__, callee.skip_first
        elif inspect.isroutine(callee):
            fn, label = callee, getattr(callee, '__name__', str(callee))
        else:
            return
        if not checkable(fn):
            return
        kws = [k.arg for k in node.keywords if k.arg]
        starred = any(isinstance(a, ast.Starred) for a in node.args) or any(k.arg is None for k in node.keywords)
        try:
            sig = inspect.signature(fn)
        except (TypeError, ValueError):
            return
        params = list(sig.parameters.values())
        if skip_first and params:
            params = params[1:]
        named = {p.name for p in params if p.kind in (p.KEYWORD_ONLY, p.POSITIONAL_OR_KEYWORD)}
        varkw = any(p.kind is p.VAR_KEYWORD for p in params)
        varpos = any(p.kind is p.VAR_POSITIONAL for p in params)
        documented = doc_keywords(fn) if varkw else set()
        for k in kws:
            if k not in named and k not in documented:
                bad(self.where + ': ' + label + '() has no keyword ' + k)
        pos = [p for p in params if p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)]
        if not varpos and len(node.args) > len(pos):
            bad(self.where + ': ' + label + '() takes at most ' + str(len(pos)) + ' positional arguments, the snippet passes ' + str(len(node.args)))
        if not starred:
            for i, p in enumerate(pos):
                if p.default is p.empty and i >= len(node.args) and p.name not in kws:
                    bad(self.where + ': ' + label + '() needs the argument ' + p.name)
            for p in params:
                if p.kind is p.KEYWORD_ONLY and p.default is p.empty and p.name not in kws:
                    bad(self.where + ': ' + label + '() needs the keyword ' + p.name)
        self.calls += 1
        tick('python SDK calls checked')

    def visit_Call(self, node):
        self.generic_visit(node)
        self.check_call(node)

    def visit_Assign(self, node):
        self.generic_visit(node)
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            t = self.typeof(node.value)
            if t is not None:
                self.scope[node.targets[0].id] = t

    def visit_With(self, node):
        self.generic_visit(node)
        for item in node.items:
            if isinstance(item.optional_vars, ast.Name):
                t = self.typeof(item.context_expr)
                if t is not None:
                    self.scope[item.optional_vars.id] = t

    def visit_FunctionDef(self, node):
        for a in node.args.args:
            if a.annotation is not None:
                t = self.typeof(a.annotation)
                if isinstance(t, type):
                    self.scope[a.arg] = Inst(t)
        self.generic_visit(node)
        kinds = []
        for r in ast.walk(node):
            if isinstance(r, ast.Return) and r.value is not None:
                t = self.typeof(r.value)
                kinds.append(t.cls if isinstance(t, Inst) else None)
        if kinds and all(k is not None and k is kinds[0] for k in kinds):
            self.func_ret[node.name] = Inst(kinds[0])

    def run(self):
        try:
            tree = ast.parse(self.code)
        except SyntaxError as e:
            bad(self.where + ': Python syntax error: ' + str(e))
            return
        tick('python snippets parsed')
        self.collect_imports(tree)
        self.visit(tree)


print('1. Python snippets')
PY = [s for s in dump['snippets'] if s['lang'] == 'python']
for s in PY:
    a = Analyzer(s['id'], s['kind'], s['code'])
    if s['kind'] == 'starter':
        try:
            ast.parse(s['code'])
            tick('python snippets parsed')
        except SyntaxError as e:
            bad(s['id'] + ' starter: ' + str(e))
        continue
    a.run()

# ---- the snippets that come from a recorded file must be the file
FILES = real['files']
SAME_AS_FILE = [('m6-code', 'spark/medallion.py'), ('m6-merge', 'spark/merge.py'), ('m10-handler', 'func/handler.py'), ('m11-envelope-code', 'security/envelope.py'),
                ('m13-lake', 'iac/modules/lake.bicep'), ('m13-factory', 'iac/modules/factory.bicep'), ('m13-main', 'iac/main.bicep'), ('m12-budget-code', 'iac/modules/budget.bicep'),
                ('m13-workflow', 'iac/.github/workflows/deploy.yml'), ('m4-json', 'adf/pl_orders_daily.json'), ('m11-bicep', 'iac/examples/lake_secure.bicep')]
for sid, fname in SAME_AS_FILE:
    got, want = SN[(sid, 'code')]['code'].strip(), FILES[fname].strip()
    expect(got == want, sid + ': the code on the screen is not the recorded file ' + fname, 'snippets equal to their recorded file')

# ======================================================================================================================
# 2. Python snippets that run
# ======================================================================================================================
print('2. Runs against Azurite, and the pure Python snippets')
if azurite():
    # the two conditional writes: overwrite=False sends If-None-Match, a stale ETag gives 412
    c = fresh_container('verify-cond')
    ns = {'container': c, 'ResourceExistsError': ResourceExistsError, 'HttpResponseError': HttpResponseError, 'MatchConditions': MatchConditions}
    out = run_code(code_of('m2-cond'), ns).split('\n')
    rc = C['blob.conditional']
    expect(out[:2] == ['%s %d' % (rc['overwrite_false']['code'], rc['overwrite_false']['status']), '%s %d' % (rc['stale_etag']['code'], rc['stale_etag']['status'])],
           'm2-cond printed ' + repr(out[:2]) + ', the recording has ' + repr(rc), 'snippets run against Azurite')

    # the delete-a-day bug: the prefix without a slash also matches a renamed day
    names = ['orders/dt=2026-03-14/orders-0001.json', 'orders/dt=2026-03-14_late/orders-0001.json', 'orders/dt=2026-03-15/orders-0001.json']
    for kind, want in (('code', ['orders/dt=2026-03-15/orders-0001.json']), ('fix', ['orders/dt=2026-03-14_late/orders-0001.json', 'orders/dt=2026-03-15/orders-0001.json'])):
        c = fresh_container('verify-delete-' + kind, names)
        ns = {}
        run_code(code_of('m2-bug', kind), ns)
        ns['delete_day'](c, '2026-03-14')
        left = sorted(b.name for b in c.list_blobs())
        expect(left == want, 'm2-bug ' + kind + ': after delete_day the container holds ' + repr(left) + ', expected ' + repr(want), 'snippets run against Azurite')

    # the worker: a message that was received three times goes to the poison queue and is not handled
    worker = code_of('m10-worker')
    patched = worker.replace('QueueServiceClient(account_url=QUEUE_URL, credential=DefaultAzureCredential())', 'QueueServiceClient.from_connection_string(CONN)')
    expect(patched != worker, 'm10-worker: the line that builds the service changed, so this check cannot patch it', 'snippets run against Azurite')
    q = fresh_queue('orders')
    fresh_queue('orders-poison')
    q.send_message('order-7001')
    for _ in range(3):                                                 # three receives, each one raises the dequeue count of the only message
        got = [m for m in q.receive_messages(visibility_timeout=1)]
        expect(len(got) == 1 and got[0].content == 'order-7001', 'm10-worker: the set-up did not receive order-7001', 'snippets run against Azurite')
        time.sleep(1.3)
    q.send_message('order-7002')
    handled = []
    ns = {'CONN': AZ['conn'], 'handle': handled.append, 'DefaultAzureCredential': None}
    run_code(patched, ns)
    svc = QueueServiceClient.from_connection_string(AZ['conn'])
    main_left = [m.content for m in svc.get_queue_client('orders').peek_messages(max_messages=10)]
    poison = [m.content for m in svc.get_queue_client('orders-poison').peek_messages(max_messages=10)]
    expect(handled == ['order-7002'] and poison == ['order-7001'] and not main_left,
           'm10-worker: handled %r, poison queue %r, main queue %r' % (handled, poison, main_left), 'snippets run against Azurite')

    # the lost message: deleting before the work loses the message when the work fails; deleting after keeps it
    for kind, want_left in (('code', 0), ('fix', 1)):
        q = fresh_queue('verify-crash-' + kind)
        q.send_message('order-7003')
        loop = code_of('m10-bug2', kind).replace('visibility_timeout=300', 'visibility_timeout=1')

        def crash(content):
            raise RuntimeError('the worker dies here')
        try:
            run_code(loop, {'queue': q, 'handle': crash})
        except RuntimeError:
            pass
        time.sleep(1.5)
        left = len(q.peek_messages(max_messages=10))
        expect(left == want_left, 'm10-bug2 ' + kind + ': ' + str(left) + ' message(s) are left after the crash, expected ' + str(want_left), 'snippets run against Azurite')

    # the Event Grid handler: the scene shows the recorded file, and its tests run again (3 pass; the buggy split fails one)
    def run_pytest(handler_source):
        proj = WORK / ('funcproj-' + str(abs(hash(handler_source)) % 10**6))
        shutil.copytree(HERE / 'funcproj', proj, ignore=shutil.ignore_patterns('__pycache__', 'handler_bug.py', '.pytest_cache'))
        (proj / 'handler.py').write_text(handler_source)
        r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--no-header', '-p', 'no:cacheprovider', 'tests'], cwd=proj, capture_output=True, text=True,
                           env=dict(os.environ, LAKE_CONNECTION=AZ['conn'], PYTHONPATH=os.pathsep.join(sys.path)), timeout=300)
        return r.returncode, r.stdout
    good = code_of('m10-handler')
    rc_ok, out_ok = run_pytest(good + '\n')
    expect(rc_ok == 0 and re.search(r'\b3 passed\b', out_ok) is not None, 'm10-handler: the three tests do not pass: ' + out_ok[-300:], 'snippets run against Azurite')
    bug_split = code_of('m10-bug', 'code')
    good_split = code_of('m10-bug', 'fix')
    expect(good_split.strip() in good, 'm10-bug fix: the fixed split_subject is not in the handler on screen', 'snippets run against Azurite')
    expect(good.replace(good_split.strip(), bug_split.strip()).strip() == FILES['func/handler_bug.py'].strip(),
           'm10-bug: the buggy snippet and the handler do not give the recorded handler_bug.py', 'snippets run against Azurite')
    rc_bad, out_bad = run_pytest(FILES['func/handler_bug.py'])
    expect(rc_bad == 1 and re.search(r'\b1 failed, 2 passed\b', out_bad) is not None and 'test_the_blob_name_keeps_its_folders' in out_bad,
           'm10-bug: the buggy handler does not fail the one test: ' + out_bad[-300:], 'snippets run against Azurite')
    expect(C['test.summary']['good'] == {'failed': 0, 'passed': 3, 'rc': 0} and C['test.summary']['bug'] == {'failed': 1, 'passed': 2, 'rc': 1}, 'the recorded test summary changed', 'snippets run against Azurite')

# the bug and the fix of split_subject, and the solution of the Python challenge
EVENT_SUBJECT = '/blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json'
ns = {}
exec(code_of('m10-bug', 'code'), ns)
expect(ns['split_subject'](EVENT_SUBJECT) == ('raw', 'orders-0001.json'), 'm10-bug: the buggy split_subject does not lose the folders', 'pure Python snippets run')
ns = {}
exec(code_of('m10-bug', 'fix'), ns)
expect(ns['split_subject'](EVENT_SUBJECT) == ('raw', 'orders/dt=2026-03-14/orders-0001.json'), 'm10-bug: the fixed split_subject is wrong', 'pure Python snippets run')
ns = {}
exec(code_of('m10-ch', 'sol'), ns)
shown = [r[0] for r in RES['m10-ch']['data'][0]['rows']]
want = [list(r) for r in RES['m10-ch']['res'][0]['rows']]
expect([list(ns['split_subject'](x)) for x in shown] == want, 'm10-ch: the solution does not give the table on screen', 'pure Python snippets run')

# the envelope encryption: the output is the recorded output
t0 = time.time()
env_out = run_code(code_of('m11-envelope-code'), {'__name__': '__main__'})
expect(env_out.strip() == real['text']['security.envelope_output'].strip(), 'm11-envelope-code: the output is not the recorded output:\n' + env_out, 'pure Python snippets run')
expect(len(env_out.strip().splitlines()) == 7, 'm11-envelope-code: expected seven output lines', 'pure Python snippets run')

# ======================================================================================================================
# 3. SQL, KQL
# ======================================================================================================================
print('3. SQL and KQL')
SQL_LANGS = ('sql', 'tsql')
OPENROWSET_OPTS = r"(?:\s*,\s*(?:DATA_SOURCE\s*=\s*'[^']+'|FORMAT\s*=\s*'(?:PARQUET|CSV|DELTA)'|PARSER_VERSION\s*=\s*'[0-9.]+'|HEADER_ROW\s*=\s*(?:TRUE|FALSE)|FIELDTERMINATOR\s*=\s*'.'|ROWTERMINATOR\s*=\s*'[^']+'|FIRSTROW\s*=\s*\d+))*"
COPY_OPTS = {'FILE_TYPE', 'CREDENTIAL', 'ERRORFILE', 'ERRORFILE_CREDENTIAL', 'MAXERRORS', 'COMPRESSION', 'FIELDQUOTE', 'FIELDTERMINATOR', 'ROWTERMINATOR', 'FIRSTROW',
             'DATEFORMAT', 'ENCODING', 'IDENTITY_INSERT', 'AUTO_CREATE_TABLE'}


def split_top(text, sep=','):
    parts, depth, cur, quote = [], 0, '', False
    for ch in text:
        if ch == "'":
            quote = not quote
        if not quote:
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
            elif ch == sep and depth == 0:
                parts.append(cur.strip())
                cur = ''
                continue
        cur += ch
    if cur.strip():
        parts.append(cur.strip())
    return parts


def match_paren(text, start):
    """The index of the bracket that closes the one at text[start], ignoring quoted text."""
    depth, quote = 0, False
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "'":
            quote = not quote
        if quote:
            continue
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if not depth:
                return i
    raise ValueError('a bracket is not closed')


def shim_openrowset(sql, where):
    """Read OPENROWSET(BULK ..., FORMAT = ...) [WITH (columns)] against the documented form and replace it with a stand-in table."""
    wildcards = None
    while True:
        m = re.search(r'OPENROWSET\s*\(', sql, re.I)
        if not m:
            break
        a = m.end() - 1
        b = match_paren(sql, a)
        inner = sql[a + 1:b]
        mm = re.match(r"\s*BULK\s+'([^']+)'" + OPENROWSET_OPTS + r'\s*$', inner, re.I)
        if not mm:
            raise ValueError('OPENROWSET does not match the documented form: ' + inner.strip()[:80])
        path = mm.group(1)
        has_ds = re.search(r'DATA_SOURCE\s*=', inner, re.I) is not None
        if not re.search(r"FORMAT\s*=", inner, re.I):
            raise ValueError('OPENROWSET has no FORMAT')
        if has_ds and re.match(r'[a-z]+://', path):
            raise ValueError('OPENROWSET with a DATA_SOURCE takes a relative path')
        if not has_ds and not re.match(r'https://[a-z0-9]{3,24}\.(?:dfs|blob)\.core\.windows\.net/[a-z0-9-]+/', path):
            raise ValueError('OPENROWSET without a DATA_SOURCE takes the full https URL of the storage account: ' + path)
        wildcards = path.count('*')
        end = b + 1
        w = re.match(r'\s*WITH\s*\(', sql[end:], re.I)
        if w:
            wa = end + w.end() - 1
            wb = match_paren(sql, wa)
            for col in split_top(sql[wa + 1:wb]):
                if not re.match(r'^[\w\[\]]+\s+[A-Za-z]+(\(\s*(\d+|MAX)(\s*,\s*\d+)?\s*\))?(\s+COLLATE\s+\w+)?(\s+\'[^\']+\'|\s+\d+)?$', col):
                    raise ValueError('a column of the WITH clause does not match name type: ' + col)
            end = wb + 1
        sql = sql[:m.start()] + '__rowset' + sql[end:]
    if wildcards is not None:
        for n in re.findall(r'filepath\(\s*(\d+)\s*\)', sql):
            if int(n) < 1 or int(n) > wildcards:
                raise ValueError('filepath(' + n + ') but the path has only ' + str(wildcards) + ' wildcard(s)')
    return sql


def shim_synapse(sql, where):
    """Statements that sqlglot cannot read are checked against the documented grammar, then taken out (or reduced to their SELECT)."""
    sql = re.sub(r'^\s*GO\s*$', ';', sql, flags=re.M | re.I)
    sql = re.sub(r'--[^\n]*', '', sql)
    sql = shim_openrowset(sql, where)
    out = []
    for stmt in [x.strip() for x in sql.split(';')]:
        if not stmt:
            continue
        u = stmt.upper()
        if u.startswith('CREATE EXTERNAL FILE FORMAT'):
            if not re.match(r"CREATE EXTERNAL FILE FORMAT\s+\w+\s+WITH\s*\(\s*FORMAT_TYPE\s*=\s*(PARQUET|DELTA|DELIMITEDTEXT)(\s*,\s*DATA_COMPRESSION\s*=\s*'[\w.]+')?\s*\)\s*$", stmt, re.I):
                raise ValueError('CREATE EXTERNAL FILE FORMAT does not match the documented form')
            tick('Synapse statements read against the grammar')
        elif u.startswith('CREATE EXTERNAL DATA SOURCE'):
            if not re.match(r"CREATE EXTERNAL DATA SOURCE\s+\w+\s+WITH\s*\(\s*LOCATION\s*=\s*'https://[^']+'(\s*,\s*CREDENTIAL\s*=\s*\w+)?\s*\)\s*$", stmt, re.I):
                raise ValueError('CREATE EXTERNAL DATA SOURCE does not match the documented form')
            tick('Synapse statements read against the grammar')
        elif u.startswith('CREATE EXTERNAL TABLE'):
            m = re.match(r"CREATE EXTERNAL TABLE\s+[\w.]+\s+WITH\s*\(\s*LOCATION\s*=\s*'[^']+'\s*,\s*DATA_SOURCE\s*=\s*\w+\s*,\s*FILE_FORMAT\s*=\s*\w+\s*\)\s*AS\s+(SELECT.*)$", stmt, re.I | re.S)
            if not m:
                raise ValueError('CREATE EXTERNAL TABLE ... AS SELECT does not match the documented form')
            tick('Synapse statements read against the grammar')
            out.append(m.group(1))
        elif u.startswith('CREATE MASTER KEY'):
            if not re.match(r"CREATE MASTER KEY ENCRYPTION BY PASSWORD\s*=\s*'[^']+'\s*$", stmt, re.I):
                raise ValueError('CREATE MASTER KEY does not match the documented form')
            tick('Synapse statements read against the grammar')
        elif u.startswith('CREATE DATABASE SCOPED CREDENTIAL'):
            if not re.match(r"CREATE DATABASE SCOPED CREDENTIAL\s+\w+\s+WITH\s+IDENTITY\s*=\s*'(Managed Identity|SHARED ACCESS SIGNATURE)'\s*(,\s*SECRET\s*=\s*'[^']*')?\s*$", stmt, re.I):
                raise ValueError('CREATE DATABASE SCOPED CREDENTIAL does not match the documented form')
            tick('Synapse statements read against the grammar')
        elif u.startswith('COPY INTO'):
            m = re.match(r"COPY INTO\s+[\w.]+\s*(\([^)]*\))?\s*FROM\s+'(https://[^']+)'\s*(?:WITH\s*\((.*)\))?\s*$", stmt, re.I | re.S)
            if not m:
                raise ValueError('COPY INTO does not match the documented form')
            for opt in split_top(m.group(3) or ''):
                name = opt.split('=')[0].strip().upper()
                if name not in COPY_OPTS:
                    raise ValueError('COPY INTO has no option ' + name)
            tick('Synapse statements read against the grammar')
        elif re.match(r'RENAME OBJECT\s+[\w.]+\s+TO\s+\w+$', stmt, re.I) or re.match(r'UPDATE STATISTICS\s+[\w.]+$', stmt, re.I) or re.match(r"DBCC PDW_SHOWSPACEUSED\('[\w.]+'\)$", stmt, re.I):
            tick('Synapse statements read against the grammar')
        elif re.match(r"EXEC\s+sp_set_data_processed_limit\s+@type\s*=\s*N'(daily|weekly|monthly)'\s*,\s*@limit_tb\s*=\s*\d+$", stmt, re.I):
            tick('Synapse statements read against the grammar')
        elif u.startswith('CREATE TABLE') and re.search(r'\bWITH\s*\(', stmt, re.I) and not re.search(r'\bWITH\s*\(\s*(LOCATION|FORMAT)', stmt, re.I):
            m = re.search(r'\bWITH\s*\(', stmt, re.I)
            a = m.end() - 1
            b = match_paren(stmt, a)
            opts = split_top(stmt[a + 1:b])
            dist = [o for o in opts if re.match(r'DISTRIBUTION\s*=', o, re.I)]
            idx = [o for o in opts if not re.match(r'DISTRIBUTION\s*=', o, re.I)]
            if len(dist) != 1 or not re.match(r'DISTRIBUTION\s*=\s*(HASH\(\s*\w+(\s*,\s*\w+)*\s*\)|ROUND_ROBIN|REPLICATED)$', dist[0], re.I):
                raise ValueError('DISTRIBUTION option does not match the documented form: ' + str(dist))
            if len(idx) > 1 or (idx and not re.match(r'(CLUSTERED COLUMNSTORE INDEX|HEAP|CLUSTERED INDEX\s*\(\s*\w+(\s+(ASC|DESC))?(\s*,\s*\w+(\s+(ASC|DESC))?)*\s*\))$', idx[0], re.I)):
                raise ValueError('the index option does not match the documented form: ' + str(idx))
            rest = stmt[:m.start()] + stmt[b + 1:]
            hashed = re.search(r'HASH\(\s*(\w+)', dist[0], re.I)
            if hashed and not re.search(r'SELECT\s+\*', rest, re.I) and not re.search(r'\b' + hashed.group(1) + r'\b', rest):
                raise ValueError('the hash column ' + hashed.group(1) + ' is not in the table')
            tick('Synapse statements read against the grammar')
            ctas = re.search(r'\bAS\s+(SELECT\b.*)$', rest, re.I | re.S)
            out.append(ctas.group(1) if ctas else rest)
        else:
            out.append(stmt)
    return ';\n'.join(out)


for s in dump['snippets']:
    if s['lang'] not in SQL_LANGS or s['kind'] == 'starter':
        continue
    where = s['id'] + ' ' + s['kind']
    try:
        plain = shim_synapse(s['code'], where)
    except ValueError as e:
        bad(where + ': ' + str(e))
        continue
    try:
        sqlglot.parse(plain, read='tsql', error_level=errors.ErrorLevel.RAISE)
        tick('T-SQL snippets parsed')
    except Exception as e:
        bad(where + ': sqlglot cannot parse the T-SQL: ' + str(e).split('\n')[0][:160])

# ---- the solutions of the SQL challenges run in DuckDB on the tables shown on screen
def as_cell(v):
    if v is None:
        return 'NULL'
    return str(v)


def same_cell(a, b):
    a, b = as_cell(a).replace(',', '').strip(), as_cell(b).replace(',', '').strip()
    a, b = re.sub(r'(\d\d:\d\d):00$', r'\1', a), re.sub(r'(\d\d:\d\d):00$', r'\1', b)
    try:
        return abs(float(a) - float(b)) < 1e-6
    except ValueError:
        return a == b


def load_table(con, name, cols, rows):
    typed = []
    for i, col in enumerate(cols):
        vals = [r[i].replace(',', '') if isinstance(r[i], str) else r[i] for r in rows]
        vals = [None if v in ('NULL', None) else v for v in vals]
        live = [v for v in vals if v is not None]
        if all(re.match(r'^-?\d+$', str(v)) for v in live):
            typed.append(('BIGINT', [None if v is None else int(v) for v in vals]))
        elif all(re.match(r'^-?\d+(\.\d+)?$', str(v)) for v in live):
            typed.append(('DOUBLE', [None if v is None else float(v) for v in vals]))
        elif all(re.match(r'^\d{4}-\d\d-\d\d$', str(v)) for v in live):
            typed.append(('DATE', vals))
        elif all(re.match(r'^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(:\d\d)?$', str(v)) for v in live):
            typed.append(('TIMESTAMP', vals))
        else:
            typed.append(('VARCHAR', vals))
    con.execute('CREATE TABLE %s (%s)' % (name, ', '.join('"%s" %s' % (c, t[0]) for c, t in zip(cols, typed))))
    for r in range(len(rows)):
        con.execute('INSERT INTO %s VALUES (%s)' % (name, ', '.join('?' for _ in cols)), [t[1][r] for t in typed])


SQL_CHALLENGES = ['m5-ch', 'm6-ch', 'm8-ch', 'm9-ch', 'm12-ch', 'm14-ch']


def sql_challenge(sid, sol):
    con = duckdb.connect()
    for d in RES[sid]['data']:
        name = re.split(r'[ (]', d['name'])[0]
        rows = d['rows']
        if sid == 'm8-ch':                                           # the screen shows 8 of 60 rows. The table is the recorded one.
            rows = [[str(i + 1), str(n)] for i, n in enumerate(C['dedicated.distribution']['by_column']['customer_id']['buckets'])]
            shown = [[r[0], r[1].replace(',', '')] for r in d['rows'][:8]]
            expect([[x[0], x[1]] for x in rows[:8]] == shown, 'm8-ch: the first eight rows on screen are not the first eight recorded buckets', 'SQL solutions run in DuckDB')
        load_table(con, name, d['cols'], rows)
    duck = sqlglot.transpile(sol, read='tsql', write='duckdb')[0]
    got = con.execute(duck).fetchall()
    want = RES[sid]['res'][0]['rows']
    ok_rows = len(got) == len(want) and all(len(g) == len(w) and all(same_cell(x, y) for x, y in zip(g, w)) for g, w in zip(got, want))
    expect(ok_rows, sid + ': the solution gives ' + repr(got) + ' and the screen shows ' + repr(want), 'SQL solutions run in DuckDB')


for sid in SQL_CHALLENGES:
    sql_challenge(sid, code_of(sid, 'sol'))

# m7: the OPENROWSET statements cannot run in DuckDB as written. Their results are the recorded month totals of the real Parquet files (DuckDB over pyarrow files).
rec = real['tables']['synapse.by_month']['rows']
money = lambda v: '%.2f' % v
expect(RES['m7-openrowset']['result'][0]['rows'] == [[r[0], format(r[1], ','), money(r[2])] for r in rec], 'm7-openrowset: the months on screen are not the recorded totals', 'SQL solutions run in DuckDB')
expect(RES['m7-ch']['res'][0]['rows'] == [[r[0][-2:], format(r[1], ','), money(r[2])] for r in rec], 'm7-ch: the months on screen are not the recorded totals', 'SQL solutions run in DuckDB')
march = [r for r in rec if r[0] == '2026-03'][0]
expect(RES['m7-filepath']['result'][0]['rows'] == [[format(march[1], ','), money(march[2])]], 'm7-filepath: the March totals on screen are not the recorded ones', 'SQL solutions run in DuckDB')

# m11-ch: KQL, computed again in Python from the rows shown
rows = RES['m11-ch']['data'][0]['rows']
counts = {}
for r in rows:
    if r[2] == '403':
        counts[r[3]] = counts.get(r[3], 0) + 1
top = sorted(counts.items(), key=lambda kv: -kv[1])[:3]
shown = [(r[0], int(r[1])) for r in RES['m11-ch']['res'][0]['rows']]
expect(top == shown, 'm11-ch: the KQL solution gives ' + repr(top) + ' and the screen shows ' + repr(shown), 'SQL solutions run in DuckDB')

# ---- KQL: syntax, with the Kusto language service of Microsoft (no table schemas)
KQL = [s for s in dump['snippets'] if s['lang'] == 'kql' and s['kind'] != 'starter']
if args.no_run or not (HERE / 'node_modules' / '@kusto').exists():
    skipped('KQL syntax', 'the Kusto language service is missing: npm install --prefix azure/verify' if not args.no_run else '--no-run')
else:
    queries = []                                                    # a blank line ends a query in the Log Analytics editor, so a box may hold several
    for s in KQL:
        for part in re.split(r'\n\s*\n', s['code'].strip()):
            queries.append((s['id'] + ' ' + s['kind'], part))
    qf = WORK / 'kql.json'
    qf.write_text(json.dumps([q for _, q in queries]))
    r = subprocess.run(['node', str(HERE / 'kql_check.js'), str(qf)], capture_output=True, text=True, timeout=120, cwd=str(HERE))
    results = [json.loads(x) for x in r.stdout.splitlines() if x.strip()]
    expect(len(results) == len(queries), 'the KQL checker did not answer for every query: ' + r.stderr[-200:])
    for (name, _), res in zip(queries, results):
        expect(res['valid'], name + ': KQL syntax errors: ' + '; '.join(res['errors']), 'KQL queries parsed')
    expect(C['kql.parse']['good']['valid'] and not C['kql.parse']['broken']['valid'], 'the recorded KQL check changed')

# ======================================================================================================================
# 4. JSON
# ======================================================================================================================
print('4. JSON')
dec = json.JSONDecoder()


def json_docs(text):
    out, i, text = [], 0, text.strip()
    while i < len(text):
        doc, j = dec.raw_decode(text, i)
        out.append(doc)
        i = j
        while i < len(text) and text[i].isspace():
            i += 1
    return out


JS = [s for s in dump['snippets'] if s['lang'] == 'json']
parsed = {}
for s in JS:
    where = s['id'] + ' ' + s['kind']
    try:
        parsed[(s['id'], s['kind'])] = json_docs(s['code'])
    except json.JSONDecodeError:
        try:
            parsed[(s['id'], s['kind'])] = json_docs('{' + s['code'] + '}')           # a fragment: a member of an object
        except json.JSONDecodeError as e:
            bad(where + ': not JSON: ' + str(e))
            continue
    tick('JSON snippets parsed')

# Data Factory: the pipeline on screen is clean, the broken activity gives the recorded finding
sys.path.insert(0, str(HERE))
import adf_check                                               # noqa: E402
good_pl = parsed[('m4-json', 'code')][0]
expect(adf_check.check(good_pl) == [], 'm4-json: the pipeline on screen has findings: ' + repr(adf_check.check(good_pl)), 'Data Factory pipelines checked')
stub = [a for a in good_pl['properties']['activities'] if a['name'] != 'AdvanceWatermark']
for kind, want in (('code', ['INVALID_CONDITION']), ('fix', [])):
    act = parsed[('m4-bug2', kind)][0] if kind == 'code' else None
    if kind == 'fix':
        act = json.loads(code_of('m4-bug2', 'fix'))
    pl = {'name': 'pl_test', 'properties': {'activities': stub + [act]}}
    got = sorted(f['code'] for f in adf_check.check(pl))
    expect(got == want, 'm4-bug2 ' + kind + ': the checker gives ' + repr(got) + ', expected ' + repr(want), 'Data Factory pipelines checked')
rec_codes = sorted(f['code'] for f in C['adf.check']['files']['pl_dependency_typo.json']['findings'])
expect('INVALID_CONDITION' in rec_codes, 'the recorded check of pl_dependency_typo.json no longer reports the invalid condition', 'Data Factory pipelines checked')
q = parsed[('m4-bug', 'code')][0]['source']['sqlReaderQuery']
expect(q['type'] == 'Expression' and '@{' in q['value'] and not q['value'].startswith('@'), 'm4-bug: the snippet is not the mixed @{ } text inside an Expression value', 'Data Factory pipelines checked')
for f, r in C['adf.check']['files'].items():
    now = sorted(x['code'] for x in adf_check.check(json.loads(FILES['adf/' + f])))
    expect(now == sorted(x['code'] for x in r['findings']) and r['valid'] == (not now), 'adf/' + f + ': a new check gives ' + repr(now) + ', the recording has ' + repr(r['findings']), 'Data Factory pipelines checked')

# the lifecycle rule on screen, through the models of azure-mgmt-storage: every name on screen must be a name that the model reads
try:
    from azure.mgmt.storage import models as sm
    for sid, kind in (('m2-life', 'code'), ('m2-bug2', 'code'), ('m2-bug2', 'fix')):
        doc = parsed[(sid, kind)][0]
        rule = sm.ManagementPolicySchema(doc).rules[0]
        src = doc['rules'][0]
        d, f, act = rule.definition, rule.definition.filters, rule.definition.actions
        pairs = [(rule.name, src['name']), (rule.type, src['type']), (rule.enabled, src['enabled']), (f.blob_types, src['definition']['filters']['blobTypes']),
                 (f.prefix_match, src['definition']['filters']['prefixMatch'])]
        base = src['definition']['actions']['baseBlob']
        for rest_name, attr in (('tierToCool', 'tier_to_cool'), ('tierToCold', 'tier_to_cold'), ('tierToArchive', 'tier_to_archive'), ('delete', 'delete')):
            if rest_name in base:
                pairs.append((getattr(getattr(act.base_blob, attr), 'days_after_modification_greater_than'), base[rest_name]['daysAfterModificationGreaterThan']))
        if 'snapshot' in src['definition']['actions']:
            pairs.append((act.snapshot.delete.days_after_creation_greater_than, src['definition']['actions']['snapshot']['delete']['daysAfterCreationGreaterThan']))
        expect(all(a == b for a, b in pairs), sid + ' ' + kind + ': the lifecycle rule on screen is not read by the azure-mgmt-storage model as written: ' + repr(pairs), 'lifecycle rules read by the SDK model')
except ImportError:
    skipped('the lifecycle rule check', 'azure-mgmt-storage is missing')

# the Event Grid event on screen is a storage event that azure-eventgrid reads
try:
    from azure.eventgrid import EventGridEvent
    ev = parsed[('m10-event', 'code')][0]
    ev = ev[0] if isinstance(ev, list) else ev
    e = EventGridEvent.from_dict(ev) if hasattr(EventGridEvent, 'from_dict') else None
    expect(e is None or (e.event_type == 'Microsoft.Storage.BlobCreated' and e.subject.startswith('/blobServices/default/containers/')), 'm10-event: azure-eventgrid does not read the event as a BlobCreated event', 'Event Grid event read by the SDK')
    expect(list(ev['data'].keys()) == C['eventgrid.parse']['data_keys'], 'm10-event: the data fields on screen are not the recorded ones', 'Event Grid event read by the SDK')
except ImportError:
    skipped('the Event Grid event check', 'azure-eventgrid is missing')

# the token claims on screen are the recorded claims
claims = parsed[('m3-token', 'code')][0]
expect(claims == C['identity.token_claims']['claims'] and list(claims) == C['identity.token_claims']['order'], 'm3-token: the claims on screen are not the recorded ones', 'recorded values shown')

# the Delta log on screen is the recorded commit (the same actions, in the same order, with the same values)
for sid, fname in (('m6-log', 'delta/00000000000000000000.json'), ('m6-merge-log', 'delta/00000000000000000001.json')):
    shown, recorded = json_docs(code_of(sid)), json_docs(FILES[fname])
    expect(shown == recorded[:len(shown)] and len(shown) >= 3, sid + ': the log on screen is not the start of the recorded commit ' + fname, 'Delta log shown')

# ======================================================================================================================
# 5. Bicep, YAML, Checkov
# ======================================================================================================================
print('5. Bicep, YAML and Checkov')
IAC = args.iac_python
BICEP = [s for s in dump['snippets'] if s['lang'] == 'bicep']
if args.no_run:
    skipped('Bicep parsing, Checkov and the workflow schema', '--no-run')
elif not IAC or subprocess.run([IAC, '-c', 'import pycep, checkov, check_jsonschema'], capture_output=True).returncode != 0:
    skipped('Bicep parsing, Checkov and the workflow schema', 'no python with pycep-parser, checkov and check-jsonschema: pass --iac-python or set AZ_IAC_PYTHON')
else:
    probe = WORK / 'bicep.json'
    items = []
    for s in BICEP:
        text = s['code']
        if not re.match(r'\s*(resource|module|param|var|targetScope|output|type|metadata)\b', text):
            text = 'var fragment = {\n' + text + '\n}\n'                      # a member of an object, as the lesson shows it
        items.append(text)
    for fname in sorted(k for k in FILES if k.endswith('.bicep')):
        items.append(FILES[fname])
    probe.write_text(json.dumps(items))
    code = ("import json,sys\nfrom pycep import BicepParser\nfor t in json.load(open(sys.argv[1])):\n"
            "    try:\n        BicepParser().parse(text=t)\n        print('ok')\n    except Exception as e:\n        print('error: ' + str(e).split(chr(10))[0][:150])\n")
    r = subprocess.run([IAC, '-c', code, str(probe)], capture_output=True, text=True, timeout=300)
    lines = r.stdout.strip().splitlines()
    expect(len(lines) == len(items), 'pycep did not answer for every Bicep text: ' + r.stderr[-300:])
    names = [s['id'] + ' ' + s['kind'] for s in BICEP] + sorted(k for k in FILES if k.endswith('.bicep'))
    for name, line in zip(names, lines):
        expect(line == 'ok', name + ': pycep cannot parse the Bicep: ' + line, 'Bicep texts parsed')

    # the network bug and its fix, scanned with Checkov
    proj = WORK / 'netbug'
    (proj / 'bug').mkdir(parents=True)
    (proj / 'fix').mkdir()
    (proj / 'bug' / 'main.bicep').write_text(code_of('m11-bug2', 'code') + '\n')
    (proj / 'fix' / 'main.bicep').write_text(code_of('m11-bug2', 'fix') + '\n')
    r = subprocess.run([IAC, '-m', 'checkov.main', '-d', str(proj), '--framework', 'bicep', '--output', 'json', '--skip-download', '--soft-fail'], capture_output=True, text=True, timeout=300,
                       env=dict(os.environ, LOG_LEVEL='ERROR', CKV_IGNORE_HIDDEN_DIRECTORIES='false'))
    try:
        scan = json.loads(r.stdout)
        scan = scan if isinstance(scan, dict) else scan[0]
        failed = {(c['file_path'], c['check_id']) for c in scan['results']['failed_checks']}
        passed = {(c['file_path'], c['check_id']) for c in scan['results']['passed_checks']}
        expect(('/bug/main.bicep', 'CKV_AZURE_35') in failed, 'm11-bug2: Checkov does not fail the open firewall (CKV_AZURE_35) in the buggy copy', 'Checkov scans')
        expect(('/fix/main.bicep', 'CKV_AZURE_35') in passed and not [f for f in failed if f[0] == '/fix/main.bicep'], 'm11-bug2: Checkov still fails the fixed copy', 'Checkov scans')
    except (ValueError, KeyError) as e:
        bad('Checkov gave no JSON for the network bug: ' + str(e) + ' ' + r.stderr[-300:])

    # the challenge of mission 13: the solution reads checkov.json of a real scan and prints the failed checks
    scan_dir = WORK / 'iacscan'
    shutil.copytree(HERE / 'iacproj', scan_dir)
    r = subprocess.run([IAC, '-m', 'checkov.main', '-d', str(scan_dir), '--framework', 'bicep', '--output', 'json', '--skip-download', '--soft-fail'], capture_output=True, text=True, timeout=300,
                       env=dict(os.environ, LOG_LEVEL='ERROR'))
    work = WORK / 'challenge13'
    work.mkdir()
    (work / 'solution.py').write_text(code_of('m13-ch', 'sol'))
    want = [' '.join(row) for row in RES['m13-ch']['res'][0]['rows']]

    def solve(doc):
        (work / 'checkov.json').write_text(json.dumps(doc) if not isinstance(doc, str) else doc)
        r = subprocess.run([sys.executable, 'solution.py'], cwd=work, capture_output=True, text=True, timeout=60)
        return r.returncode, [re.sub(r'^(CKV_\w+) \S*?(/examples/)', r'\1 \2', ln) for ln in r.stdout.strip().splitlines()]
    # (a) the table on screen, as a checkov.json: the same lines in the same order, exit code 1
    rows = RES['m13-ch']['data'][0]['rows']
    rc, got = solve({'results': {'failed_checks': [{'check_id': r[0], 'file_path': r[1], 'check_name': r[2]} for r in rows], 'passed_checks': []}})
    expect(rc == 1 and got == want, 'm13-ch: the solution prints ' + repr(got) + ' (exit ' + str(rc) + '), the screen shows ' + repr(want), 'Checkov scans')
    # (b) the real output of Checkov on the project: the keys that the solution reads are there, and the same checks fail (Checkov does not promise an order)
    rc, got = solve(r.stdout)
    expect(rc == 1 and sorted(got) == sorted(want), 'm13-ch: on a new scan the solution prints ' + repr(got) + ' (exit ' + str(rc) + '), the screen shows ' + repr(want), 'Checkov scans')
    # (c) nothing failed: no output, exit code 0
    rc, got = solve({'results': {'failed_checks': [], 'passed_checks': []}})
    expect(rc == 0 and not got, 'm13-ch: the solution does not exit with 0 when nothing failed', 'Checkov scans')

    # the workflow on screen is valid, and the broken copy fails the schema
    wf = WORK / 'deploy.yml'
    wf.write_text(FILES['iac/.github/workflows/deploy.yml'])
    cj = "import sys\nfrom check_jsonschema import main\nmain()\n"
    r = subprocess.run([IAC, '-c', cj, '--builtin-schema', 'vendor.github-workflows', str(wf)], capture_output=True, text=True, timeout=120)
    expect(r.returncode == 0, 'm13-workflow: check-jsonschema refuses the workflow: ' + r.stdout[-300:], 'workflow checked against its schema')
    broken = FILES['iac/.github/workflows/deploy.yml'].replace('runs-on:', 'run-on:', 1)
    wf.write_text(broken)
    r = subprocess.run([IAC, '-c', cj, '--builtin-schema', 'vendor.github-workflows', str(wf)], capture_output=True, text=True, timeout=120)
    expect(r.returncode == 1, 'the workflow with run-on instead of runs-on is accepted by check-jsonschema', 'workflow checked against its schema')

# ---- YAML (no extra tool needed)
for s in dump['snippets']:
    if s['lang'] != 'yaml':
        continue
    text = s['code']
    if s['id'] != 'm13-workflow':                                                # a fragment: some steps of a job
        text = 'steps:\n' + text
    try:
        doc = yaml.safe_load(text)
        tick('YAML snippets parsed')
    except yaml.YAMLError as e:
        bad(s['id'] + ' ' + s['kind'] + ': not YAML: ' + str(e).split('\n')[0])
        continue
    if s['id'] == 'm13-bug':
        steps = doc['steps']
        login = [x for x in steps if str(x.get('uses', '')).startswith('azure/login')][0]
        expect(('creds' in login['with']) == (s['kind'] == 'code') and ({'client-id', 'tenant-id', 'subscription-id'} <= set(login['with'])) == (s['kind'] == 'fix'),
               'm13-bug ' + s['kind'] + ': the azure/login inputs are not the stored credentials (bug) or the three ids of an OIDC sign-in (fix)', 'YAML snippets parsed')
wfdoc = yaml.safe_load(FILES['iac/.github/workflows/deploy.yml'])
expect(wfdoc['permissions']['id-token'] == 'write' or any(j.get('permissions', {}).get('id-token') == 'write' for j in wfdoc['jobs'].values()), 'the workflow has no id-token: write, which the OIDC sign-in needs', 'YAML snippets parsed')
expect(wfdoc['jobs']['deploy-prod'].get('environment') == 'prod', 'the production job does not use the prod environment', 'YAML snippets parsed')

# ======================================================================================================================
# 6. Shell and the Azure CLI
# ======================================================================================================================
print('6. Shell and az commands')
for s in dump['snippets']:
    if s['lang'] == 'bash':
        r = subprocess.run(['bash', '-n'], input=s['code'], capture_output=True, text=True)
        expect(r.returncode == 0, s['id'] + ' ' + s['kind'] + ': bash -n: ' + r.stderr.strip(), 'shell snippets parsed')

AZ_CLI = os.environ.get('AZ_CLI') or shutil.which('az')
if args.no_run or args.no_cli:
    skipped('az commands', '--no-run or --no-cli')
elif not AZ_CLI:
    skipped('az commands', 'the Azure CLI is not installed: set AZ_CLI or put az on the PATH')
else:
    texts = [s['code'] for s in dump['snippets']] + [FILES['iac/.github/workflows/deploy.yml']]
    for f in sorted((ROOT / 'azure' / 'js' / 'content').glob('*.js')):
        texts += re.findall(r'`(az [^`]+)`', f.read_text())
    cmds = {}
    for t in texts:
        t = re.sub(r'\\\n\s*', ' ', t)
        for line in t.splitlines():
            m = re.search(r'(?:^|[\s`:])az\s+([a-z][^|&;`]*)$', line.strip())
            if not m or line.strip().startswith('#'):
                continue
            try:
                toks = shlex.split(m.group(1))
            except ValueError:
                toks = m.group(1).split()
            words = []
            for tk in toks:
                if tk.startswith('-') or not re.match(r'^[a-z][a-z0-9-]*$', tk):
                    break
                words.append(tk)
            opts = [tk.split('=')[0] for tk in toks if tk.startswith('--')]
            cmds.setdefault(tuple(words), set()).update(opts)
    cfg = WORK / 'azcfg'
    AZ_ENV = dict(os.environ, AZURE_CONFIG_DIR=str(cfg), AZURE_CORE_COLLECT_TELEMETRY='false', AZURE_CORE_NO_COLOR='true')

    def check_az(words, opts):
        r = subprocess.run([AZ_CLI] + list(words) + ['--help'], capture_output=True, text=True, timeout=180, env=AZ_ENV)
        out = r.stdout + r.stderr
        if r.returncode != 0 or 'not recognized' in out or 'misspelled' in out:
            bad('az ' + ' '.join(words) + ': the Azure CLI does not know this command')
            return
        tick('az commands checked')
        helped = set(re.findall(r'(--[a-z0-9][a-z0-9-]*)', out))
        for o in sorted(opts):
            if o not in helped:
                bad('az ' + ' '.join(words) + ': the Azure CLI has no option ' + o)
            else:
                tick('az options checked')

    for words, opts in sorted(cmds.items()):
        check_az(words, opts)

# ======================================================================================================================
# 7. Widgets and lint
# ======================================================================================================================
print('7. Widget logic and content lint')
if args.no_run:
    skipped('widget logic and lint', '--no-run')
else:
    r = subprocess.run(['node', str(HERE / 'check_widgets.js')], capture_output=True, text=True, timeout=300)
    expect(r.returncode == 0, 'check_widgets.js failed:\n' + r.stdout[-800:])
    note(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else '')
    r = subprocess.run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'azure'], capture_output=True, text=True, timeout=300)
    expect(r.returncode == 0, 'the content lint failed:\n' + r.stdout[-800:])

# ======================================================================================================================
# 8. Controls: deliberately broken inputs that the checkers must refuse
# ======================================================================================================================
print('8. Controls')
analyze = lambda sid, code: Analyzer(sid, 'code', code).run()
control('a misspelled keyword of list_blobs', lambda: analyze('m2-bug-control', "for b in container.list_blobs(name_start_with='orders/'):\n    pass"))
control('a method that does not exist on ContainerClient', lambda: analyze('m2-bug-control', "container.list_blob()"))
control('a misspelled keyword of receive_messages', lambda: analyze('m10-bug2-control', "queue.receive_messages(visibilty_timeout=5)"))
control('a keyword that no client documents', lambda: analyze('c1', "from azure.storage.queue import QueueServiceClient\nQueueServiceClient(account_url='x', credential=None, bogus=1)"))
control('a missing required argument', lambda: analyze('c2', "from azure.storage.blob import BlobServiceClient\nBlobServiceClient.from_connection_string()"))
control('too many positional arguments', lambda: analyze('c3', "from azure.storage.blob import BlobServiceClient\nBlobServiceClient('a', 'b', 'c')"))
control('a misspelled import', lambda: analyze('c4', "from azure.storage.blob import BlobServiceClent"))
control('a module that does not exist', lambda: analyze('c5', "from azure.storage.blobs import BlobServiceClient"))
control('Python that does not parse', lambda: analyze('c6', "def f(:\n    pass"))
control('a wrong keyword of EventHubProducerClient.create_batch', lambda: analyze('c7', "from azure.eventhub import EventHubProducerClient\nproducer = EventHubProducerClient('ns', 'hub', credential=None)\nproducer.create_batch(partition_keys='C-1')"))
OPENROWSET_URL = "https://stbrewlinelakeprod.dfs.core.windows.net/curated/"
control('OPENROWSET with a format that does not exist', lambda: shim_synapse("SELECT * FROM OPENROWSET(BULK '" + OPENROWSET_URL + "x/*.parquet', FORMAT = 'PARQUETT') AS r", 'c8'))
control('OPENROWSET with a relative path and no data source', lambda: shim_synapse("SELECT * FROM OPENROWSET(BULK 'x/*.parquet', FORMAT = 'PARQUET') AS r", 'c9'))
control('filepath(3) with only two wildcards', lambda: shim_synapse("SELECT r.filepath(3) FROM OPENROWSET(BULK '" + OPENROWSET_URL + "year=*/*.parquet', FORMAT = 'PARQUET') AS r", 'c10'))
control('DISTRIBUTION spelled wrong', lambda: shim_synapse("CREATE TABLE t WITH (DISTRUBUTION = HASH(a), HEAP) AS SELECT a FROM s", 'c11'))
control('a hash column that is not in the table', lambda: shim_synapse("CREATE TABLE t WITH (DISTRIBUTION = HASH(zzz), HEAP) AS SELECT a, b FROM s", 'c12'))
control('a COPY INTO option that does not exist', lambda: shim_synapse("COPY INTO stg.orders FROM '" + OPENROWSET_URL + "*.parquet' WITH (FILE_TYP = 'PARQUET')", 'c13'))
control('SQL that does not parse', lambda: sqlglot.parse("SELECT FROM WHERE", read='tsql', error_level=errors.ErrorLevel.RAISE))
control('a SQL solution that gives another table (FLOOR for CEILING)', lambda: sql_challenge('m9-ch', code_of('m9-ch', 'sol').replace('CEILING', 'FLOOR')))
control('a table cell that differs', lambda: expect(same_cell('1,984,087.5', '1984087.6'), 'cells differ'))
control('JSON that does not parse', lambda: json.loads('{"rules": [ {"a": 1}, ]}'))
control('YAML that does not parse', lambda: yaml.safe_load('steps:\n  - run: a\n bad: indent'))
control('a pipeline with an unknown activity type', lambda: expect(not adf_check.check({'name': 'p', 'properties': {'activities': [{'name': 'a', 'type': 'NoSuchActivity'}]}}), 'the pipeline has findings'))
control('a pipeline with a dependency on an activity that does not exist', lambda: expect(not adf_check.check({'name': 'p', 'properties': {'activities': [{'name': 'a', 'type': 'Wait', 'typeProperties': {'waitTimeInSeconds': 1}, 'dependsOn': [{'activity': 'zzz', 'dependencyConditions': ['Succeeded']}]}]}}), 'the pipeline has findings'))
control('a lifecycle rule with a misspelled key', lambda: expect(__import__('azure.mgmt.storage.models', fromlist=['x']).ManagementPolicySchema({'rules': [{'name': 'r', 'enabled': True, 'type': 'Lifecycle', 'definition': {'filters': {'blobTypes': ['blockBlob']}, 'actions': {'baseBlob': {'tierToCool': {'daysAfterModificationGreaterThn': 30}}}}}]}).rules[0].definition.actions.base_blob.tier_to_cool.days_after_modification_greater_than == 30, 'the rule is read as written'))
if not args.no_run and (HERE / 'node_modules' / '@kusto').exists():
    bf = WORK / 'kql_control.json'
    bf.write_text(json.dumps(['StorageBlobLogs | summarize attempts = count( by CallerIpAddress']))
    out = subprocess.run(['node', str(HERE / 'kql_check.js'), str(bf)], capture_output=True, text=True, timeout=120, cwd=str(HERE)).stdout
    control('KQL with a missing bracket', lambda: expect(json.loads(out.splitlines()[0])['valid'], 'the query has errors'))
if IAC and not args.no_run and subprocess.run([IAC, '-c', 'import pycep'], capture_output=True).returncode == 0:
    broken = "resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' = {\n  name: 'a'\n"
    out = subprocess.run([IAC, '-c', "from pycep import BicepParser\nimport sys\ntry:\n    BicepParser().parse(text=sys.argv[1])\n    print('ok')\nexcept Exception:\n    print('error')\n", broken], capture_output=True, text=True).stdout.strip()
    control('Bicep with a brace that is not closed', lambda: expect(out == 'ok', 'pycep read it'))
if AZ_CLI and not args.no_run and not args.no_cli:
    control('an az option that does not exist', lambda: check_az(('deployment', 'group', 'create'), {'--tempate-file'}))
    control('an az command that does not exist', lambda: check_az(('synapse', 'sql', 'pool', 'pasue'), set()))

# ======================================================================================================================
# 8. Record everything again and compare
# ======================================================================================================================
def flatten(x, path=''):
    if isinstance(x, dict):
        for k in sorted(x):
            yield from flatten(x[k], path + '.' + str(k))
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from flatten(v, path + '[' + str(i) + ']')
    else:
        yield path, x


if args.recapture:
    print('9. Recapture')
    CACHE.mkdir(exist_ok=True)
    out = CACHE / 'real_recapture.js'
    if not args.reuse or not out.exists():
        env = dict(os.environ)
        env['PATH'] = str(HERE / 'node_modules' / '.bin') + os.pathsep + env.get('PATH', '')
        cmd = [sys.executable, str(HERE / 'capture_az.py'), '--out', str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=1800, env=env)
        if r.returncode != 0:
            bad('capture_az.py failed:\n' + (r.stdout + r.stderr)[-1500:])
    if out.exists():
        new = load_real(out)
        a, b = dict(flatten(real)), dict(flatten(new))
        diff = [k for k in sorted(set(a) | set(b)) if a.get(k) != b.get(k) and not k.startswith('.meta.')]
        expect(not diff, 'the new recording differs from js/real.js in %d place(s), for example: %s' % (len(diff), ', '.join(diff[:8])), 'values compared in the recapture')
        tick('values compared in the recapture', len(a))

print()
for k, v in TALLY.items():
    print('  %5d  %s' % (v, k))
for s in SKIPPED:
    print('  skipped:', s)
print('%d problem(s)' % problems)
sys.exit(1 if problems else 0)
