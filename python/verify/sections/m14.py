"""Mission 14: design: a pure core, a thin shell, injected dependencies, and a pipeline as a list of steps."""
import ast
import pathlib
import shutil

HERE = pathlib.Path(__file__).resolve().parent.parent
LESSONS = HERE / 'lessons' / 'm14'
FILES = ['tangled.py', 'test_tangled.py', 'core.py', 'shell.py', 'test_core.py', 'orders.csv']


def test_shape(path):
    tree = ast.parse(path.read_text())
    tests = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name.startswith('test_')]
    return {'tests': len(tests), 'lines': sum(n.end_lineno - n.lineno + 1 for n in tests), 'fixtures': sum(len(n.args.args) for n in tests)}


def record(rec, work, cache):
    d = work / 'm14_work'
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    for f in FILES:
        shutil.copy(LESSONS / f, d / f)
        if f.endswith('.py'):
            rec.file('m14/' + f, (LESSONS / f).read_text())
    py = rec.py
    pt = '%s -m pytest -q -p no:cacheprovider --no-header' % py
    jobs = [('m14/pytest_tangled', [pt + ' test_tangled.py'], {pt + ' test_tangled.py': 'pytest -q test_tangled.py'}),
            ('m14/pytest_core', [pt + ' test_core.py'], {pt + ' test_core.py': 'pytest -q test_core.py'})]
    for key, cmds, show in jobs:
        rec.shell(key, cmds, d, show=show)
    run = ['%s shell.py orders.csv out.db' % py, '''%s -c "import sqlite3; print(sqlite3.connect('out.db').execute('SELECT * FROM daily ORDER BY store, day').fetchall())"''' % py]
    rec.shell('m14/shell', run, d, show={run[0]: 'python shell.py orders.csv out.db', run[1]: '''python -c "import sqlite3; print(sqlite3.connect('out.db').execute('SELECT * FROM daily ORDER BY store, day').fetchall())"'''})
    rec.lesson('m14/inject.py', setup=lambda c: shutil.copy(LESSONS / 'orders.csv', c / 'orders.csv'))
    rec.lesson('m14/steps.py')
    rec.lesson('m14/pull_logic_out.py')
    rec.counts('m14.tests', {'tangled': test_shape(LESSONS / 'test_tangled.py'), 'core': test_shape(LESSONS / 'test_core.py'),
                             'note': 'counted with the ast module: the number of test functions, their total lines, and their parameters (pytest fixtures such as tmp_path and capsys)'})
