"""Mission 7: the bucket lab (4 time zones, 3 bucket sizes, DuckDB and PostgreSQL, plus SQLite where it can add fixed hours),
the same instant in three session time zones, and the plans of two ways to filter one day. Rows are real, times are not recorded."""
import engines as E

TZS = ('UTC', 'Asia/Singapore', 'Australia/Sydney', 'America/Los_Angeles')
UNITS = ('day', 'week', 'month')
SQLITE_HOURS = {'UTC': 0, 'Asia/Singapore': 8}          # SQLite has no time zone names: it can only add a fixed number of hours

Q_FUNC = "SELECT count(*) FROM big_orders WHERE CAST(order_ts AS DATE) = DATE '2026-02-10'"
Q_RANGE = ("SELECT count(*) FROM big_orders\n"
           "WHERE order_ts >= TIMESTAMP '2026-02-10 00:00:00' AND order_ts < TIMESTAMP '2026-02-11 00:00:00'")


def sqlite_bucket(expr, unit):
    if unit == 'day':
        return "date(%s)" % expr
    if unit == 'week':
        return "date(%s, 'weekday 0', '-6 days')" % expr
    return "date(%s, 'start of month')" % expr


def run(rec):
    # ---- the bucket lab
    base = rec.run('duckdb', 'SELECT order_id, store_id, status, total, order_ts FROM orders ORDER BY order_id')
    orders = [[E.fmt(c) for c in r] for r in base.rows]
    local, combos = {}, {}
    for tz in TZS:
        q = "SELECT (order_ts AT TIME ZONE 'UTC') AT TIME ZONE '%s' FROM orders ORDER BY order_id" % tz
        a = [E.fmt(r[0]) for r in rec.run('duckdb', q).rows]
        b = [E.fmt(r[0]) for r in rec.run('postgres', q).rows]
        if a != b:
            raise RuntimeError('DuckDB and PostgreSQL disagree on the local time in ' + tz)
        if tz in SQLITE_HOURS:
            c = [E.fmt(r[0]) for r in rec.run('sqlite', "SELECT datetime(order_ts, '+%d hours') FROM orders ORDER BY order_id" % SQLITE_HOURS[tz]).rows]
            if c != a:
                raise RuntimeError('SQLite disagrees on the local time in ' + tz)
        local[tz] = a
        for unit in UNITS:
            per_order = ("SELECT order_id,\n"
                         "       CAST(date_trunc('%s',\n"
                         "                       (order_ts AT TIME ZONE 'UTC') AT TIME ZONE '%s') AS DATE) AS bucket\n"
                         "FROM orders\nORDER BY order_id" % (unit, tz))
            groups = ("SELECT CAST(date_trunc('%s', l) AS DATE) AS bucket, count(*) AS orders, sum(total) AS revenue\n"
                      "FROM (SELECT total, (order_ts AT TIME ZONE 'UTC') AT TIME ZONE '%s' AS l FROM orders) AS t\nGROUP BY CAST(date_trunc('%s', l) AS DATE)\nORDER BY bucket" % (unit, tz, unit))
            answers, engines = {}, ['duckdb', 'postgres']
            for e in engines:
                answers[e] = ([E.fmt(r[1]) for r in rec.run(e, per_order).rows], [[E.fmt(c) for c in r] for r in rec.run(e, groups).rows])
            if answers['duckdb'] != answers['postgres']:
                raise RuntimeError('DuckDB and PostgreSQL disagree on %s buckets in %s' % (unit, tz))
            if tz in SQLITE_HOURS:
                expr = "datetime(order_ts, '+%d hours')" % SQLITE_HOURS[tz]
                bk = [r[0] for r in rec.run('sqlite', "SELECT %s FROM orders ORDER BY order_id" % sqlite_bucket(expr, unit)).rows]
                gr = [[str(r[0]), str(r[1]), '%.2f' % r[2]] for r in rec.run('sqlite', "SELECT %s AS b, count(*), sum(total) FROM orders GROUP BY b ORDER BY b" % sqlite_bucket(expr, unit)).rows]
                if bk != answers['duckdb'][0] or gr != answers['duckdb'][1]:
                    raise RuntimeError('SQLite disagrees on %s buckets in %s' % (unit, tz))
                engines.append('sqlite')
            combos['%s|%s' % (tz, unit)] = {'engines': engines, 'buckets': answers['duckdb'][0], 'groups': answers['duckdb'][1], 'sql': per_order}
    rec.counts('m7.buckets', {'tzs': list(TZS), 'units': list(UNITS), 'orders': orders, 'local': local, 'combos': combos})

    # ---- the same instant in three session time zones (PostgreSQL TIMESTAMPTZ and DuckDB TIMESTAMPTZ)
    shown = {}
    for e, setter in (('duckdb', "SET TimeZone = '%s'"), ('postgres', "SET TIME ZONE '%s'")):
        shown[e] = {}
        for tz in ('UTC', 'Asia/Singapore', 'America/Los_Angeles'):
            rec.run(e, setter % tz)
            shown[e][tz] = rec.scalar(e, "SELECT CAST(TIMESTAMPTZ '2026-03-01 02:15:00+00' AS VARCHAR)")
        rec.run(e, setter % 'UTC')
    rec.counts('m7.session_tz', shown)

    # ---- two ways to ask for one day, on 30,000 orders with an index on order_ts
    plans, counts = {}, {}
    with rec.tx('postgres'):
        rec.run('postgres', 'CREATE INDEX big_orders_ts ON big_orders (order_ts)')
        rec.run('postgres', 'ANALYZE big_orders')
        plans['pg_func'] = rec.plan_text('postgres', Q_FUNC, costs=False)
        plans['pg_range'] = rec.plan_text('postgres', Q_RANGE, costs=False)
        counts['postgres'] = [rec.scalar('postgres', Q_FUNC), rec.scalar('postgres', Q_RANGE)]
    plans['duck_func'] = rec.plan_text('duckdb', Q_FUNC)
    plans['duck_range'] = rec.plan_text('duckdb', Q_RANGE)
    counts['duckdb'] = [rec.scalar('duckdb', Q_FUNC), rec.scalar('duckdb', Q_RANGE)]
    for k, v in plans.items():
        rec.text('m7.plan.' + k, v)
    rec.file('m7.plan.func', Q_FUNC)
    rec.file('m7.plan.range', Q_RANGE)
    rec.counts('m7.plan.rows', counts)
