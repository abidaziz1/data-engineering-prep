"""Mission 14 (testing): pytest on code that reads from Kafka. The same tests run against the correct function and against a copy with one deleted check. Real pytest output."""
import os
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent


def pytest_run(c, module, extra=()):
    env = dict(os.environ, KAFKA_BOOTSTRAP=c.bootstrap, ORDER_TOTALS_MODULE=module, PYTHONPATH=str(HERE / 'app'), PYTHONDONTWRITEBYTECODE='1')
    r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=short', str(HERE / 'app' / 'test_order_totals.py'), *extra], capture_output=True, text=True, env=env,
                       cwd=str(HERE / 'app'), timeout=300)
    out = re.sub(r' in \d+\.\d+s', ' in <time>s', r.stdout)
    out = out.replace(str(HERE / 'app') + '/', '').replace(str(HERE / 'app'), 'app')
    return r.returncode, out.strip()


def record_tests(c, rec):
    rc_ok, out_ok = pytest_run(c, 'order_totals')
    rc_bug, out_bug = pytest_run(c, 'order_totals_bug')
    rc_unit, out_unit = pytest_run(c, 'order_totals', ('-k', 'not real_topic'))
    rec.text('tests.pytest_clean', out_ok)
    rec.text('tests.pytest_bug', out_bug)
    rec.text('tests.pytest_unit_only', out_unit)
    counts = lambda t: {k: int(v) for v, k in re.findall(r'(\d+) (passed|failed|skipped|deselected)', t)}
    rec.counts('tests.summary', {'clean': dict(counts(out_ok), exit_code=rc_ok), 'with_a_bug': dict(counts(out_bug), exit_code=rc_bug), 'unit_tests_only': dict(counts(out_unit), exit_code=rc_unit),
                                 'tests': 4, 'tests_that_need_a_broker': 1})
