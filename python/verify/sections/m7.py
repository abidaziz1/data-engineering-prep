"""Mission 7: errors, retries and idempotency."""
import contextlib
import heapq
import importlib.util
import io
import pathlib
import random
import shutil
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent.parent
LESSONS = HERE / 'lessons' / 'm7'


def load_module(name):
    """Import a lesson file as a module (its `if __name__ == "__main__"` part does not run), so that the lab uses the same functions."""
    spec = importlib.util.spec_from_file_location('lesson_' + name, LESSONS / (name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()):  # the lessons print their demo at the top level
        spec.loader.exec_module(mod)
    return mod


def idempotency(rec):
    mod = load_module('load_strategies')
    cells = {}
    for strategy in mod.STRATEGIES:
        for scenario in mod.SCENARIOS:
            r = mod.play(strategy, scenario)
            cells.setdefault(strategy, {})[scenario] = {
                'runs': r['runs'], 'final': [[a, b] for a, b in r['final']], 'right': r['right'], 'want_rows': r['want_rows'], 'want_cents': r['want_cents']}
    rec.counts('m7.idem', {
        'strategies': list(mod.STRATEGIES), 'scenarios': list(mod.SCENARIOS), 'cells': cells,
        'truth': {k: [[a, b] for a, b in v] for k, v in mod.TRUTH.items()},
        'sql': {'append': mod.INSERT, 'insert with a key': mod.INSERT, 'upsert': mod.UPSERT},
        'note': 'every cell is a run of the functions in lessons/m7/load_strategies.py against SQLite (an in-memory database), with crash = an exception after 3 rows'})


def policy_delay(policy, attempt, rng, mod):
    if policy == 'at once':
        return 0.0
    if policy == 'fixed 1 s':
        return 1.0
    if policy == 'exponential':
        return min(8.0, 0.5 * 2 ** (attempt - 1))
    return mod.delay_for(attempt, rng=rng)  # exponential with full jitter: the function of the lesson, with its defaults (0.5 s, cap 8 s)


POLICIES = ['at once', 'fixed 1 s', 'exponential', 'exponential with full jitter']


def one_client(mod):
    """The waits of one client, for each policy, if the API fails n times before it works."""
    out = {}
    for policy in POLICIES:
        out[policy] = {}
        for failures in (1, 2, 3, 4):
            rng = random.Random(7)
            waits = []
            for attempt in range(1, failures + 1):
                if policy == 'exponential with full jitter':
                    waits.append(mod.delay_for(attempt, rng=rng))
                elif policy == 'exponential':
                    waits.append(min(8.0, 0.5 * 2 ** (attempt - 1)))
                elif policy == 'fixed 1 s':
                    waits.append(1.0)
                else:
                    waits.append(0.0)
            out[policy][str(failures)] = {'waits': [round(w, 3) for w in waits], 'total': round(sum(waits), 3)}
    return out


def storm(policy, mod, clients=50, capacity=10, attempts=8, seed=11):
    """50 clients start together. The service accepts `capacity` requests in each whole second and answers 429 to the rest."""
    rng = random.Random(seed)
    heap = [(0.0, c, 1) for c in range(clients)]
    heapq.heapify(heap)
    asked, accepted = Counter(), Counter()
    tenth_ok, tenth_all, tenth_retry = Counter(), Counter(), Counter()
    done, gave_up = {}, 0
    while heap:
        t, c, attempt = heapq.heappop(heap)
        sec, tenth = int(t), int(round(t * 10, 6))
        asked[sec] += 1
        tenth_all[tenth] += 1
        if attempt > 1:
            tenth_retry[tenth] += 1
        if accepted[sec] < capacity:
            accepted[sec] += 1
            tenth_ok[tenth] += 1
            done[c] = t
        elif attempt == attempts:
            gave_up += 1
        else:
            heapq.heappush(heap, (t + policy_delay(policy, attempt, rng, mod), c, attempt + 1))
    last = max(asked)
    per_second = [[accepted[s], asked[s] - accepted[s]] for s in range(last + 1)]
    per_tenth = [[tenth_ok[k], tenth_all[k] - tenth_ok[k]] for k in range(max(tenth_all) + 1)]
    return {'requests': sum(asked.values()), 'succeeded': len(done), 'gave_up': gave_up, 'rejected': sum(asked.values()) - sum(accepted.values()),
            'last_second': last, 'peak': max(asked.values()), 'retry_burst': max(tenth_retry.values()) if tenth_retry else 0, 'finished_at': round(max(done.values()), 2) if done else None,
            'per_second': per_second, 'per_tenth': per_tenth}


def retry_lab(rec):
    mod = load_module('retry_backoff')
    rec.counts('m7.retry', {
        'policies': POLICIES, 'one': one_client(mod),
        'storm': {p: storm(p, mod) for p in POLICIES},
        'setup': {'clients': 50, 'capacity': 10, 'attempts': 8, 'seed': 11},
        'note': 'a simulation: the delay function is the one in lessons/m7/retry_backoff.py, time is a number, and there is no network. Each whole second the service accepts 10 requests and answers 429 to the rest.'})


def record(rec, work, cache):
    for name in ('exceptions_tour', 'raise_from', 'swallowed', 'fail_loud', 'retry_backoff', 'tenacity_retry', 'load_strategies', 'watermark', 'idempotent_load', 'call_with_retry'):
        rec.lesson('m7/%s.py' % name)
    d = work / 'm7_exit_codes'
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    for name in ('swallowed', 'fail_loud'):
        shutil.copy(LESSONS / (name + '.py'), d / (name + '.py'))
    cmds = ['%s %s.py; echo "exit code: $?"' % (rec.py, n) for n in ('swallowed', 'fail_loud')]
    rec.shell('m7/exit_codes', cmds, d, show={c: 'python %s.py; echo "exit code: $?"' % n for c, n in zip(cmds, ('swallowed', 'fail_loud'))})
    idempotency(rec)
    retry_lab(rec)
