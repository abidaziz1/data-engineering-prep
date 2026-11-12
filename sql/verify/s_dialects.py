"""Mission 13: the same query in other dialects. sqlglot (a parser and translator) rewrites each DuckDB query for ten dialects.
The three dialects that this course can run (DuckDB, PostgreSQL, SQLite) are executed here, and their rows are compared with the original.
Every other translation is only text: it was NOT run on that engine, and the lessons say "translated, not run"."""
import decimal

import sqlglot
from sqlglot import ErrorLevel

import engines as E

TARGETS = ['snowflake', 'bigquery', 'redshift', 'mysql', 'tsql', 'oracle', 'spark', 'postgres', 'sqlite', 'duckdb']
RUN = {'postgres': 'postgres', 'sqlite': 'sqlite', 'duckdb': 'duckdb'}
QUERIES = [
    ('weekly', 'Orders for each week', "SELECT date_trunc('week', order_ts) AS week_start, count(*) AS orders FROM orders GROUP BY 1 ORDER BY 1"),
    ('top3', 'The three biggest paid orders', "SELECT order_id, total FROM orders WHERE status = 'paid' ORDER BY total DESC LIMIT 3"),
    ('label', 'Join strings, with a default', "SELECT name || ' <' || coalesce(email, 'none') || '>' AS label FROM customers ORDER BY customer_id"),
    ('ilike', 'Case-insensitive match', "SELECT order_id FROM orders WHERE channel ILIKE 'W%' ORDER BY order_id"),
    ('qualify', 'The biggest paid order of each store', "SELECT store_id, order_id, total FROM orders WHERE status = 'paid' QUALIFY row_number() OVER (PARTITION BY store_id ORDER BY total DESC) = 1 ORDER BY store_id"),
    ('collect', 'Collect the orders of a customer', "SELECT customer_id, list(order_id ORDER BY order_id) AS orders FROM orders WHERE customer_id IS NOT NULL GROUP BY customer_id ORDER BY customer_id"),
    ('interval', 'Add 7 days', "SELECT order_id, order_ts + INTERVAL 7 DAY AS refund_deadline FROM orders WHERE order_id IN (1001, 1004) ORDER BY order_id"),
    ('iff', 'A conditional value', "SELECT order_id, if(total >= 15, 'big', 'small') AS size FROM orders ORDER BY order_id"),
    ('trycast', 'A cast that may fail', "SELECT try_cast('12x' AS INTEGER) AS bad_number, try_cast('12' AS INTEGER) AS good_number"),
]


def cell(c):
    """One value in a comparable form: numbers by value, timestamps in one text form, the rest as text."""
    if c is None:
        return 'NULL'
    if isinstance(c, bool):
        return 'true' if c else 'false'
    if isinstance(c, (int, float, decimal.Decimal)):
        return '%g' % float(c)
    if hasattr(c, 'isoformat'):
        return c.isoformat(sep=' ')
    return str(c)


def norm(rows):
    return [[cell(c) for c in r] for r in rows]


def run(rec):
    originals = {}
    for key, title, sql in QUERIES:
        originals[key] = norm(rec.run('duckdb', sql).rows)
    out = {}
    for key, title, sql in QUERIES:
        per = {}
        for t in TARGETS:
            item = {}
            try:
                text = sqlglot.transpile(sql, read='duckdb', write=t, pretty=True, unsupported_level=ErrorLevel.RAISE)[0]
            except Exception as ex:                       # sqlglot says that it cannot express something exactly
                item['warning'] = str(ex).split('\n')[0][:240]
                text = sqlglot.transpile(sql, read='duckdb', write=t, pretty=True, unsupported_level=ErrorLevel.IGNORE)[0]
            item['sql'] = text
            if t in RUN:
                try:
                    with rec.tx(RUN[t]):
                        res = rec.run(RUN[t], text)
                    rows = norm(res.rows)
                    item['ran'] = 'same' if rows == originals[key] or sorted(rows) == sorted(originals[key]) else 'different'
                    if item['ran'] == 'different':
                        item['rows'] = rows[:4]
                except Exception as ex:
                    item['ran'] = 'error'
                    item['error'] = E.error_text(ex)[:200]
            per[t] = item
        out[key] = {'title': title, 'source': sql, 'original': originals[key][:4], 'targets': per}
    rec.counts('m13.translate', {'sqlglot': sqlglot.__version__, 'targets': TARGETS, 'queries': [q[0] for q in QUERIES], 'run_on': sorted(RUN), 'results': out})

    # a messy query, formatted by sqlglot
    messy = "select o.order_id,c.name,sum(i.qty*i.unit_price) as amt from orders o join customers c on c.customer_id=o.customer_id join order_items i on i.order_id=o.order_id where o.status='paid' group by o.order_id,c.name having sum(i.qty*i.unit_price)>10 order by amt desc"
    rec.file('m13.messy', messy)
    rec.file('m13.pretty', sqlglot.transpile(messy, read='duckdb', write='duckdb', pretty=True)[0])
    # a query with a mistake: the parser finds it without running anything
    bad = "SELECT order_id, total FROM orders WHERE status = 'paid' GROUP BY"
    try:
        sqlglot.parse_one(bad, read='duckdb')
        err = 'no error'
    except Exception as ex:
        err = str(ex).split('\n')[0]
    rec.counts('m13.parse_error', {'sql': bad, 'error': err})
    # the same mistake, run by the three engines
    errs = {}
    for e in ('duckdb', 'postgres', 'sqlite'):
        r, er = rec.try_run(e, bad)
        errs[e] = er or 'no error'
    rec.counts('m13.engine_errors', errs)
    # a query written for SQL Server (TOP) run on the three engines that this course can run
    tsql_top = out['top3']['targets']['tsql']['sql']
    tops = {}
    for e in ('duckdb', 'postgres', 'sqlite'):
        r, er = rec.try_run(e, tsql_top)
        tops[e] = er or 'no error'
    rec.counts('m13.top_error', {'sql': tsql_top, 'errors': tops})
