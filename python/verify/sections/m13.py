"""Mission 13: shipping: a command line, layered configuration, packaging with uv, and the checks that CI runs (run here by hand)."""
import contextlib
import importlib.util
import io
import itertools
import pathlib
import shutil

HERE = pathlib.Path(__file__).resolve().parent.parent
LESSONS = HERE / 'lessons' / 'm13'


def load_module():
    spec = importlib.util.spec_from_file_location('lesson_config', LESSONS / 'config_precedence.py')
    mod = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    return mod


def config_lab():
    mod = load_module()
    layers = ['config file', 'environment variable', 'command line flags']
    cells = {}
    for use in itertools.product((False, True), repeat=3):
        cfg = mod.load_config(mod.FILE if use[0] else None, mod.ENV if use[1] else None, mod.ARGS if use[2] else None)
        cells['|'.join('1' if u else '0' for u in use)] = {k: {'value': str(v), 'source': s} for k, (v, s) in cfg.items()}
    return {'layers': layers, 'defaults': {k: str(v) for k, v in mod.DEFAULTS.items()}, 'file': {'api_url': 'https://staging.brewline.example/orders', 'batch_size': '500'},
            'env': {'batch_size': '200'}, 'args': {'batch_size': '50', 'dry_run': 'True'}, 'cells': cells,
            'note': 'every case is a call of load_config() from lessons/m13/config_precedence.py with the layers that are switched on'}


def record(rec, work, cache):
    rec.lesson('m13/config_precedence.py')
    # the command line
    d = work / 'm13_cli'
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    for f in ('load_orders.py', 'orders.csv', 'empty.csv'):
        shutil.copy(LESSONS / f, d / f)
    rec.file('m13/load_orders.py', (LESSONS / 'load_orders.py').read_text())
    py = rec.py
    args = ['--help', 'orders.csv --day 2026-03-14 --dry-run', 'orders.csv --day 2026-03-14', 'orders.csv --day 14-03-2026', 'missing.csv --day 2026-03-14', 'empty.csv --day 2026-03-14']
    tail = lambda a: '' if a == '--help' else ' 2>&1; echo "exit code: $?"'
    cmds = ['%s load_orders.py %s%s' % (py, a, tail(a)) for a in args]
    rec.shell('m13/cli', cmds, d, show={c: 'python load_orders.py %s%s' % (a, tail(a)) for c, a in zip(cmds, args)})
    # the package
    p = work / 'm13_project'
    shutil.rmtree(p, ignore_errors=True)
    shutil.copytree(LESSONS / 'project', p, ignore=shutil.ignore_patterns('__pycache__', '.github_workflow_ci.yml', 'dist', '.venv*', '.mypy_cache', '.ruff_cache', '.pytest_cache'))
    rec.file('m13/pyproject.toml', (LESSONS / 'project' / 'pyproject.toml').read_text())
    rec.file('m13/test_cli.py', (LESSONS / 'project' / 'tests' / 'test_cli.py').read_text())
    rec.file('m13/ci.yml', (LESSONS / 'project' / '.github_workflow_ci.yml').read_text())
    pt = '%s -m pytest -q -p no:cacheprovider --no-header' % py
    checks = ['%s -m ruff check --no-cache .' % py, '%s -m mypy --no-incremental src' % py, pt]
    rec.shell('m13/checks', checks, p, show={checks[0]: 'ruff check .', checks[1]: 'mypy src', checks[2]: 'pytest -q'})
    uv = rec.uv
    build = ['%s build' % uv, '%s -m zipfile -l dist/brewline_loader-0.1.0-py3-none-any.whl' % py, '%s venv --quiet .demo' % uv,
             '%s pip install --quiet --python .demo/bin/python dist/brewline_loader-0.1.0-py3-none-any.whl' % uv, '.demo/bin/brewline-load --help']
    rec.shell('m13/build', build, p, show={build[0]: 'uv build', build[1]: 'python -m zipfile -l dist/brewline_loader-0.1.0-py3-none-any.whl', build[2]: 'uv venv --quiet .demo',
                                           build[3]: 'uv pip install --quiet --python .demo/bin/python dist/brewline_loader-0.1.0-py3-none-any.whl', build[4]: '.demo/bin/brewline-load --help'}, timeout=300)
    rec.counts('m13.config', config_lab())
