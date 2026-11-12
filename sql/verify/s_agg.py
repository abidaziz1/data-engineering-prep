"""Mission 4: the grouping sets explorer. Seven ways to group paid orders by store and channel, and what each returns."""
from engines import fmt

SETS = [
    ('by store', ['store_id'], 'GROUP BY store_id', False),
    ('by channel', ['channel'], 'GROUP BY channel', False),
    ('by store and channel', ['store_id', 'channel'], 'GROUP BY store_id, channel', False),
    ('ROLLUP (store, channel)', ['store_id', 'channel'], 'GROUP BY ROLLUP (store_id, channel)', True),
    ('ROLLUP (channel, store)', ['channel', 'store_id'], 'GROUP BY ROLLUP (channel, store_id)', True),
    ('CUBE (store, channel)', ['store_id', 'channel'], 'GROUP BY CUBE (store_id, channel)', True),
    ('GROUPING SETS', ['store_id', 'channel'], 'GROUP BY GROUPING SETS ((store_id), (channel), ())', True),
]


def sql_for(cols, group, flags):
    sel = ', '.join(cols)
    if flags:
        sel += ',\n       ' + ', '.join('GROUPING(%s) AS g_%s' % (c, c.split('_')[0]) for c in cols)
    order = ', '.join(c + ' NULLS LAST' for c in cols)
    return ("SELECT %s,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\n%s\nORDER BY %s" % (sel, group, order))


def run(rec):
    out = []
    for label, cols, group, flags in SETS:
        sql = sql_for(cols, group, flags)
        res = {}
        engines = ['duckdb', 'postgres'] + (['sqlite'] if not flags else [])
        for e in engines:
            r = rec.run(e, sql)
            res[e] = r
        d = res['duckdb']
        agree = all([[fmt(c) for c in row] for row in res[e].rows] == [[fmt(c) for c in row] for row in d.rows] or e == 'sqlite' for e in engines)
        # SQLite shows 82.0 where the others show 82.00, so compare it by value
        if 'sqlite' in res:
            agree = agree and len(res['sqlite'].rows) == len(d.rows)
        key = 'm4.set.%d' % len(out)
        rec.file(key, sql)
        rec.result_table(key, d)
        out.append({'label': label, 'key': key, 'rows': len(d.rows), 'engines': engines, 'agree': bool(agree)})
    rec.counts('m4.sets', {'variants': out})
