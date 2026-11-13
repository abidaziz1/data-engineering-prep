"""Mission 2: environments and packaging, recorded with venv, uv, packaging and two pandas versions."""
import json
import pathlib
import re
import subprocess
import urllib.request

from packaging.specifiers import SpecifierSet
from packaging.version import Version

PANDAS = ['2.0.3', '2.1.4', '2.2.3', '2.3.3', '3.0.0', '3.0.6', '3.1.0', '3.1.1']
PANDAS_SPECS = ['==3.1.1', '>=3', '>=2.2,<3', '~=3.0', '~=3.0.2', '!=3.0.0', '<3.1', '==3.*', '>3.1']
REQUESTS = ['2.28.2', '2.31.0', '2.32.3', '2.32.5', '2.33.1', '2.34.0', '2.34.2']
REQUESTS_SPECS = ['==2.32.3', '>=2.31', '~=2.32.0', '~=2.32', '<2.33', '>=2.32,<2.34', '!=2.34.0', '==2.33.*', '>2.34.0']


def pypi_has(name, versions, rec):
    """Check that every sample version is a real release (the list is a sample, the releases are real)."""
    try:
        with urllib.request.urlopen('https://pypi.org/pypi/%s/json' % name, timeout=20) as r:
            have = set(json.load(r)['releases'])
    except Exception as e:  # offline: say so and go on
        rec.note('could not reach PyPI to check the %s release list (%s)' % (name, type(e).__name__))
        return None
    missing = [v for v in versions if v not in have]
    if missing:
        raise SystemExit('%s: versions %s are not on PyPI' % (name, missing))
    return True


def record(rec, work, cache):
    d = work / 'm2'
    d.mkdir(exist_ok=True)
    env = {'UV_NO_PROGRESS': '1', 'UV_NATIVE_TLS': '', 'UV_SYSTEM_CERTS': '1'}

    # ---- a virtual environment, made by the standard library -----------------------------------------------------------
    demo = d / 'demo'
    demo.mkdir()
    py = rec.py
    rec.shell('m2/venv_session', [
        '%s -m venv .venv' % py,
        'ls .venv',
        'grep -E "^(include-system-site-packages|version) " .venv/pyvenv.cfg',
        '.venv/bin/python -c "import sys; print(sys.prefix.endswith(\'.venv\'), sys.prefix != sys.base_prefix)"',
        '.venv/bin/python -c "import pandas"',
        'uv pip install --python .venv/bin/python "pandas>=3,<4"',
        '.venv/bin/python -c "import pandas; print(pandas.__version__)"',
    ], demo, env=env, show={'%s -m venv .venv' % py: 'python -m venv .venv'})

    # ---- a project with uv -------------------------------------------------------------------------------------------------------
    proj_cmds = [
        'uv init --package brewline-etl --python 3.14 --author-from none',
        'cd brewline-etl && ls -A',
        'cd brewline-etl && uv add requests "pandas>=3,<4"',
        'cd brewline-etl && uv tree --depth 1',
        'cd brewline-etl && uv run python -c "import requests, pandas; print(requests.__version__, pandas.__version__)"',
        'cd brewline-etl && uv add --dev pytest',
    ]
    pd_ = d / 'uvproj'
    pd_.mkdir()
    rec.shell('m2/uv_session', proj_cmds, pd_, env=env)
    proj = pd_ / 'brewline-etl'
    rec.file('m2/pyproject.toml', (proj / 'pyproject.toml').read_text())
    lock = (proj / 'uv.lock').read_text().split('\n')
    head = lock[:14]
    i = next(k for k, l in enumerate(lock) if l.strip() == 'name = "requests"') - 1
    j = next(k for k in range(i + 1, len(lock)) if lock[k].startswith('[[package]]') or lock[k].startswith('[package.')) if False else None
    block = []
    for l in lock[i:]:
        if block and l.startswith('[[package]]'):
            break
        block.append(l)
    rec.file('m2/uv.lock.excerpt', '\n'.join(head + ['...'] + [x for x in block if not x.startswith('    { url = ') or 'py3-none-any.whl' in x or '.tar.gz' in x][:26]))
    rec.text('m2/python-version', (proj / '.python-version').read_text())

    # ---- the lock file refuses a pyproject that moved on -----------------------------------------------------------------------
    pp = proj / 'pyproject.toml'
    pp.write_text(pp.read_text().replace('"requests>=2.34.2",', '"requests>=2.34.2",\n    "tenacity>=9",'))
    rec.shell('m2/lock_check', [
        'uv lock --check',
        'uv sync --locked',
        'uv lock',
        'uv sync --locked',
    ], proj, env=env)

    # ---- the same file in two environments --------------------------------------------------------------------------------------
    rec.lesson('m2/pandas_versions.py', python=rec.py_old, key='m2/pandas_versions.py@old')
    rec.lesson('m2/pandas_versions.py', python=rec.py, key='m2/pandas_versions.py@new')

    # ---- version specifiers, applied to real release lists ----------------------------------------------------------------------
    for name, versions, specs in (('pandas', PANDAS, PANDAS_SPECS), ('requests', REQUESTS, REQUESTS_SPECS)):
        pypi_has(name, versions, rec)
        out = []
        for s in specs:
            ss = SpecifierSet(s)
            out.append({'spec': s, 'matches': [v for v in versions if Version(v) in ss]})
        rec.counts('m2.specifiers.' + name, {'versions': versions, 'specs': out, 'checked': 'release list sampled from PyPI; matching by packaging.specifiers.SpecifierSet'})
