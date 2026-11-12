#!/usr/bin/env python3
"""Record what Python 3.14 and its libraries do, for the Python tutorial (python/js/real.js).

Everything the lessons show as output comes from here: the programs in verify/lessons/ are run as they are, their output is
written down, and so are the experiments in verify/bench/ (sizes, counts and medians of timings on this machine). Nothing
here needs an account or a cloud: the data is made up (support/brewline.py), the HTTP server is a local test server, and
the databases are SQLite and DuckDB in a temporary folder.

Usage:   python3 python/verify/capture_py.py [--out python/js/real.js] [--only m1,m2,...] [--json FILE] [--list]
Needs:   the packages in python/verify/requirements-py.txt (the versions are in the recording), uv, and network access to
         PyPI for the sections that build a second environment.
Timings: every timing is a median of several runs on one machine, and the recording says how many runs. They change from
         run to run and machine to machine. The lessons teach with counts, bytes and ratios, and say "on this machine".
"""
import argparse, contextlib, datetime, hashlib, importlib, importlib.metadata as md, json, os, pathlib, platform, re, shutil, statistics, subprocess, sys, tempfile, textwrap, time

if sys.version_info[:2] != (3, 14) and not os.environ.get('PY_CAPTURE_ANY_PYTHON'):
    # The lessons teach Python 3.14, and a few messages differ in 3.13 (for example the datetime errors).
    sys.exit('capture_py.py records Python 3.14 (this is %s). Run it with the interpreter of an environment that has the packages in '
             'requirements-py.txt, or set PY_CAPTURE_ANY_PYTHON=1 to record with this one.' % sys.version.split()[0])

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
LESSONS = HERE / 'lessons'
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / 'support'))

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(ROOT / 'js' / 'real.js'))
ap.add_argument('--only', default='')
ap.add_argument('--json')
ap.add_argument('--list', action='store_true')
ap.add_argument('--keep', action='store_true', help='keep the work folder')
args = ap.parse_args()

SECTIONS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15']
ONLY = [s for s in args.only.split(',') if s] or SECTIONS
if args.list:
    print(' '.join(SECTIONS)); sys.exit(0)

WORK = pathlib.Path(tempfile.mkdtemp(prefix='py-capture-'))
CACHE = pathlib.Path(tempfile.gettempdir()) / 'py-course-cache'
CACHE.mkdir(exist_ok=True)

LIBS = ['pandas', 'numpy', 'polars', 'pyarrow', 'duckdb', 'sqlalchemy', 'pydantic', 'pydantic_core', 'mypy', 'ruff', 'pytest', 'pytest-cov', 'hypothesis',
        'requests', 'httpx', 'tenacity', 'typer', 'psutil', 'tzdata', 'python-dateutil', 'packaging']


def version_of(name):
    try:
        return md.version(name)
    except md.PackageNotFoundError:
        return None


class Rec:
    def __init__(self):
        self.data = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
        self.notes = []
        self.py = sys.executable
        self._free = None
        self._old = None
        self.uv = shutil.which('uv') or str(pathlib.Path.home() / '.local' / 'bin' / 'uv')

    # ---- storing ------------------------------------------------------------------------------------------------
    def file(self, key, src):
        self.data['files'][key] = src.rstrip('\n') + '\n'

    def text(self, key, s):
        self.data['text'][key] = self.norm(s).rstrip('\n')

    def table(self, key, cols, rows):
        self.data['tables'][key] = {'cols': list(cols), 'rows': [list(r) for r in rows]}

    def counts(self, key, obj):
        self.data['counts'][key] = obj

    def note(self, msg):
        self.notes.append(msg)
        print('  note:', msg)

    # ---- running ------------------------------------------------------------------------------------------------
    def env(self, extra=None):
        e = dict(os.environ)
        for k in ('VIRTUAL_ENV', 'PYTHONPATH', 'PYTHONHOME'):
            e.pop(k, None)
        e.update({'PYTHONHASHSEED': '0', 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHON_COLORS': '0', 'NO_COLOR': '1', 'TZ': 'UTC', 'LANG': 'C.UTF-8',
                  'PYTHONIOENCODING': 'utf-8', 'COLUMNS': '100', 'PYTHONUTF8': '1'})
        if e.pop('UV_NATIVE_TLS', None):  # the machine sets it for its proxy; uv now asks for UV_SYSTEM_CERTS instead
            e['UV_SYSTEM_CERTS'] = '1'
        if extra:
            e.update({k: v for k, v in extra.items() if v != ''})
        return e

    def norm(self, s):
        s = s.replace('\r\n', '\n')
        s = s.replace(str(WORK), '/work')
        s = re.sub(r'/tmp/[A-Za-z0-9_./-]*py-capture-[A-Za-z0-9_]+', '/work', s)
        s = re.sub(r'/tmp/claude-0/[A-Za-z0-9_./-]*?/(?=site-packages|lib/)', '', s)
        s = re.sub(r'(?:/[\w.+-]+)+/site-packages/', 'site-packages/', s)
        s = re.sub(r'File "/work/[^"]*/([^"/]+)"', r'File "\1"', s)
        s = re.sub(r'0x[0-9a-f]{6,}', '0x...', s)
        s = re.sub(r'127\.0\.0\.1:\d{4,5}', '127.0.0.1:PORT', s)
        s = re.sub(r'\bport=\d{4,5}', 'port=PORT', s)
        s = re.sub(r'[ \t]+\n', '\n', s)
        s = re.sub(r'^warning: The `UV_NATIVE_TLS`.*\n', '', s, flags=re.M)
        return s

    def run(self, argv, cwd, timeout=180, env=None, input=None):
        t0 = time.time()
        p = subprocess.run(argv, cwd=str(cwd), env=self.env(env), capture_output=True, text=True, timeout=timeout, input=input)
        return p.returncode, (p.stdout + p.stderr), time.time() - t0

    def lesson(self, name, setup=None, runs=1, args=(), python=None, timeout=180, env=None, key=None, stdin=None, show_stderr=True):
        """Run verify/lessons/<name> as it is, in its own folder, and write down its source and its output."""
        src = (LESSONS / name).read_text(encoding='utf-8')
        cwd = WORK / (key or name).replace('.py', '').replace('/', '_')
        shutil.rmtree(cwd, ignore_errors=True)
        cwd.mkdir(parents=True)
        shutil.copy(LESSONS / name, cwd / pathlib.Path(name).name)
        if setup:
            setup(cwd)
        self.file(key or name, src)
        outs = []
        for i in range(runs):
            rc, out, dur = self.run([python or self.py, pathlib.Path(name).name, *args], cwd, timeout=timeout, env=env, input=stdin)
            outs.append(out)
            k = (key or name) + ('#%d' % (i + 1) if runs > 1 else '')
            self.text(k, out)
            self.data['counts'].setdefault('exit', {})[k] = rc
        return cwd

    def shell(self, key, cmds, cwd, env=None, timeout=300, show=None):
        """Run shell commands one after another and write down a terminal transcript: the command, then what it printed."""
        lines = []
        for c in cmds:
            shown = c if not show else show.get(c, c)
            lines.append('$ ' + shown)
            p = subprocess.run(c, cwd=str(cwd), env=self.env(env), shell=True, capture_output=True, text=True, timeout=timeout)
            out = (p.stdout + p.stderr).rstrip('\n')
            if out:
                lines.append(out)
            self.data['counts'].setdefault('exit', {})[key + '|' + c] = p.returncode
        self.text(key, '\n'.join(lines))

    def median_runs(self, fn, n=5):
        """Call fn n times, return {runs: [...], median: x}. fn returns a number (seconds)."""
        runs = [fn() for _ in range(n)]
        return {'runs': [round(r, 6) for r in runs], 'median': round(statistics.median(runs), 6)}

    # ---- other interpreters ---------------------------------------------------------------------------------------
    @property
    def py_free(self):
        if self._free is None:
            self._free = subprocess.run([self.uv, 'python', 'find', '3.14t'], capture_output=True, text=True, env=self.env()).stdout.strip() or None
        return self._free

    @property
    def py_old(self):
        """A second environment with pandas 2.3.3 on Python 3.13, for the 'works on my machine' lessons."""
        if self._old is None:
            d = CACHE / 'venv_old'
            py = d / 'bin' / 'python'
            if not py.exists():
                subprocess.run([self.uv, 'venv', '--python', '3.13', str(d)], check=True, capture_output=True, env=self.env())
                subprocess.run([self.uv, 'pip', 'install', '--python', str(py), 'pandas==2.3.3', 'numpy<2.4', 'pyarrow'], check=True, capture_output=True, env=self.env())
            self._old = str(py)
        return self._old


REC = Rec()


def meta():
    m = REC.data['meta']
    m['python'] = platform.python_version()
    m['python_build'] = sys.version.split('\n')[0]
    m['implementation'] = platform.python_implementation()
    m['platform'] = platform.platform()
    m['cpus'] = os.cpu_count()
    m['uv'] = subprocess.run([REC.uv, '--version'], capture_output=True, text=True).stdout.strip().replace('uv ', '').split(' ')[0]
    for lib in LIBS:
        v = version_of(lib)
        if v:
            m[lib] = v
    m['captured'] = datetime.date.today().isoformat()
    free = REC.py_free
    if free:
        m['python_free_threaded'] = subprocess.run([free, '-c', 'import platform; print(platform.python_version())'], capture_output=True, text=True).stdout.strip()


def load_existing(path):
    p = pathlib.Path(path)
    if not p.exists():
        return None
    t = p.read_text(encoding='utf-8')
    m = re.search(r'LAB\.real\s*=\s*(\{.*\})\s*;?\s*$', t, re.S)
    return json.loads(m.group(1)) if m else None


def write(path, data):
    body = json.dumps(data, ensure_ascii=False, indent=1)
    pathlib.Path(path).write_text(
        '/* Everything the Python tutorial quotes as output. Written by python/verify/capture_py.py: do not edit by hand.\n'
        '   Real runs of Python and its libraries on one machine with made-up Brewline data. Timings are medians from that machine. */\n'
        'window.LAB = window.LAB || {};\nLAB.real = ' + body + ';\n', encoding='utf-8')


def main():
    t0 = time.time()
    meta()
    for s in ONLY:
        print('section', s, '...', flush=True)
        t1 = time.time()
        try:
            mod = importlib.import_module('sections.' + s)
        except ModuleNotFoundError as e:
            if e.name == 'sections.' + s:
                print('  (no recorder for', s, 'yet)')
                continue
            raise
        mod.record(REC, WORK, CACHE)
        print('  done in %.1fs' % (time.time() - t1), flush=True)
    out = REC.data
    if args.only:
        old = load_existing(args.out) or {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
        for k in ('files', 'text', 'tables', 'counts'):
            if k == 'counts':
                ex_old = old['counts'].get('exit', {})
                ex_new = out['counts'].get('exit', {})
                old['counts'].update(out['counts'])
                old['counts']['exit'] = {**ex_old, **ex_new}
            else:
                old[k].update(out[k])
        old['meta'].update(out['meta'])
        out = old
    write(args.out, out)
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    n = {k: len(out[k]) for k in ('files', 'text', 'tables', 'counts')}
    print('wrote %s: %s in %.0fs' % (args.out, n, time.time() - t0))
    if not args.keep:
        shutil.rmtree(WORK, ignore_errors=True)


if __name__ == '__main__':
    main()
