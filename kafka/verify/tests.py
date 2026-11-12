"""Mission 14 (testing): pytest on code that reads from Kafka. The same tests run against the correct function and against a copy with one deleted check. Real pytest output."""
import os
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent


def pytest_run(c, module, extra=(), test_file='test_order_totals.py'):
    env = dict(os.environ, ORDER_TOTALS_MODULE=module, PYTHONPATH=str(HERE / 'app'), PYTHONDONTWRITEBYTECODE='1')
    if c is not None:
        env['KAFKA_BOOTSTRAP'] = c.bootstrap                       # the tests that need a broker run against it, and are skipped without one
    r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=short', str(HERE / 'app' / test_file), *extra], capture_output=True, text=True, env=env,
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
    record_idempotent(rec)
    rec.counts('tests.summary', {'clean': dict(counts(out_ok), exit_code=rc_ok), 'with_a_bug': dict(counts(out_bug), exit_code=rc_bug), 'unit_tests_only': dict(counts(out_unit), exit_code=rc_unit),
                                 'tests': 4, 'tests_that_need_a_broker': 1})


def record_idempotent(rec):
    """The coding round of mission 15: a consumer that is safe to run twice. The tests need no broker. The demo reads offsets 0 to 6 (one is not an order), then replays 4 to 9 after a restart."""
    rc, out = pytest_run(None, 'idempotent', test_file='test_idempotent.py')
    rec.text('tests.idempotent_pytest', out)
    sys.path.insert(0, str(HERE / 'app'))
    import idempotent
    from test_idempotent import Msg, order
    first = [Msg(0, o, order(o, 100 + o) if o != 3 else b'not json') for o in range(0, 7)]
    replay = [Msg(0, o, order(o, 100 + o)) for o in range(4, 10)]
    state, applied = {}, {}
    bad1 = idempotent.apply(first, state, applied)
    after_first = dict(state)
    bad2 = idempotent.apply(replay, state, applied)
    clean, clean_applied = {}, {}
    idempotent.apply(first + [m for m in replay if m.offset() > 6], clean, clean_applied)
    rec.counts('tests.idempotent_demo', {'first_pass_offsets': [0, 6], 'bad_offsets': [m.offset() for m in bad1], 'replay_offsets': [4, 9], 'bad_in_the_replay': len(bad2),
                                         'state_after_the_first_pass': {str(k): v for k, v in after_first.items()}, 'state_after_the_replay': {str(k): v for k, v in state.items()},
                                         'the_replay_changed_nothing_that_was_applied': all(state[k] == v for k, v in after_first.items()), 'same_as_a_run_without_a_replay': state == clean,
                                         'applied_position': {str(k): v for k, v in applied.items()}, 'tests': 4, 'tests_passed': int(out.split(' passed')[0].split()[-1]) if ' passed' in out else 0,
                                         'exit_code': rc})
