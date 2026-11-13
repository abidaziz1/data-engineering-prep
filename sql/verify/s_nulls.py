"""Mission 2: the truth tables of three-valued logic, asked of each engine one pair of values at a time."""

VALS = ['TRUE', 'FALSE', 'NULL']
OPS = [
    ('AND', 'a AND b'),
    ('OR', 'a OR b'),
    ('=', 'a = b'),
    ('<>', 'a <> b'),
    ('IS NOT DISTINCT FROM', 'a IS NOT DISTINCT FROM b'),
    ('IS DISTINCT FROM', 'a IS DISTINCT FROM b'),
]


def run(rec):
    from engines import fmt
    ops = []
    for name, expr in OPS:
        grid = {}
        for e in ('duckdb', 'postgres', 'sqlite'):
            rows = []
            for a in VALS:
                row = []
                for b in VALS:
                    sql = 'SELECT ' + a + expr[1:].replace(' b', ' ' + b, 1)
                    row.append(fmt(rec.scalar(e, sql)))
                rows.append(row)
            grid[e] = rows
        ops.append({'name': name, 'expr': expr, 'grid': grid})
    nots = {}
    for e in ('duckdb', 'postgres', 'sqlite'):
        nots[e] = [fmt(rec.scalar(e, 'SELECT NOT ' + v)) for v in VALS]
    rec.counts('m2.truth', {'vals': VALS, 'ops': ops, 'not': nots,
                            'sample': 'SELECT TRUE AND NULL'})
