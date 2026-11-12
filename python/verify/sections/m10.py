"""Mission 10: speed and memory: profile first, then threads, processes, asyncio and the GIL (regular and free-threaded builds)."""
import re


def table(text, pattern, cast):
    out = {}
    for line in text.split('\n'):
        m = re.match(pattern, line)
        if m:
            out[m.group(1).strip()] = cast(m)
    return out


def parse_concurrency(text):
    head = re.match(r'GIL enabled: (True|False), cores: (\d+)', text)
    out = {'gil': head.group(1) == 'True', 'cores': int(head.group(2)), 'waiting': {}, 'computing': {}}
    section = None
    for line in text.split('\n'):
        if line.startswith('eight jobs that wait'):
            section = 'waiting'
        elif line.startswith('eight jobs that compute'):
            section = 'computing'
        else:
            m = re.match(r'^\s+(.+?)\s+([\d.]+) s$', line)
            if m and section:
                out[section][m.group(1)] = float(m.group(2))
    return out


def record(rec, work, cache):
    for name in ('profile_first', 'vectorize', 'pandas_memory', 'threaded_fetch'):
        rec.lesson('m10/%s.py' % name)
    rec.lesson('m10/concurrency.py', timeout=300)
    free = rec.py_free
    if free:
        rec.lesson('m10/concurrency.py', python=free, key='m10/concurrency.py@free', timeout=300)
    t = rec.data['text']
    pf = t['m10/profile_first.py']
    hot = re.search(r'^\s+(\d+)\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+\S+\((\w+)\)', pf, re.M)
    rec.counts('m10.profile', {'hot_function': hot.group(2), 'hot_calls': int(hot.group(1)),
                               'list_seconds': float(re.search(r'known is a list: ([\d.]+) s', pf).group(1)), 'set_seconds': float(re.search(r'known is a set:\s+([\d.]+) s', pf).group(1)),
                               'note': 'cProfile on 20,000 rows and a list of 5,000 store ids, then the median of 3 runs with a list and with a set, on this machine'})
    rec.counts('m10.vector', {'ms': table(t['m10/vectorize.py'], r'^(.+?)\s{2,}([\d.]+)$', lambda m: float(m.group(2))), 'note': 'median of 5 runs, one million numbers, on this machine'})
    mem = table(t['m10/pandas_memory.py'], r'^(\w+)\s+(\w+)?\s+([\d.]+)\s+(\w+)?\s+([\d.]+)$', lambda m: {'before_mb': float(m.group(3)), 'after_mb': float(m.group(5)), 'before_type': m.group(2), 'after_type': m.group(4)})
    rec.counts('m10.memory', {'columns': mem, 'rows': 1000000})
    conc = {'regular': parse_concurrency(t['m10/concurrency.py'])}
    if free:
        conc['free-threaded'] = parse_concurrency(t['m10/concurrency.py@free'])
    rec.counts('m10.concurrency', {'builds': conc, 'note': 'the waiting jobs sleep 0.25 s (a stand-in for a network call), the computing jobs add up numbers. Each time is the median of 3 runs on a 4 core machine that other programs were also using.'})
