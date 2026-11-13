"""Mission 11: indexes, plans and statistics, recorded with EXPLAIN (ANALYZE) on PostgreSQL, plus DuckDB and SQLite plans for contrast.
Plans are real. Times are not recorded, because they change from run to run: the lessons read row counts, scan types and estimates.
PostgreSQL's cost numbers are dropped from the text. Its estimated row count stays, written as "estimated rows"."""
import re

import engines as E

COST = re.compile(r'\(cost=[\d.]+\.\.[\d.]+ rows=(\d+) width=\d+\)')
SCAN = re.compile(r'^\s*(?:->\s+)?(Seq Scan|Index Scan|Index Only Scan|Bitmap Heap Scan|Index Scan Backward)\b')


def pg_plan(rec, sql, buffers=False):
    text = rec.plan_text('postgres', sql, costs=True, buffers=buffers)
    return COST.sub(lambda m: '(estimated rows=%s)' % m.group(1), text)


def read_and_returned(text):
    """Rows that the scan node touched (the rows it returned plus the rows it removed), and the rows that the top node returned."""
    lines = text.split('\n')
    returned = None
    m = re.search(r'actual rows=(\d+)', lines[0])
    if m:
        returned = int(m.group(1))
    read = 0
    for k, ln in enumerate(lines):
        if SCAN.match(ln):
            mm = re.search(r'actual rows=(\d+) loops=(\d+)', ln)
            read += int(mm.group(1)) * int(mm.group(2)) if mm else 0
            for nxt in lines[k + 1:k + 6]:
                r = re.search(r'Rows Removed by (?:Filter|Index Recheck): (\d+)', nxt)
                if r:
                    read += int(r.group(1))
                if SCAN.match(nxt):
                    break
    return read, returned


def matched_rows(text):
    for ln in text.split('\n'):
        if SCAN.match(ln):
            m = re.search(r'actual rows=(\d+) loops=(\d+)', ln)
            return int(m.group(1)) * int(m.group(2)) if m else None
    return None


def first_scan(text):
    for ln in text.split('\n'):
        m = SCAN.match(ln)
        if m:
            return m.group(1)
    return ''


DESIGNS = {
    'none': ('no index', None),
    'order_id': ('index on order_id', 'CREATE INDEX o_order_id ON big_orders (order_id)'),
    'status': ('index on status', 'CREATE INDEX o_status ON big_orders (status)'),
    'store': ('index on store_id', 'CREATE INDEX o_store ON big_orders (store_id)'),
    'ts': ('index on order_ts', 'CREATE INDEX o_ts ON big_orders (order_ts)'),
    'store_ts': ('index on (store_id, order_ts)', 'CREATE INDEX o_store_ts ON big_orders (store_id, order_ts)'),
    'ts_store': ('index on (order_ts, store_id)', 'CREATE INDEX o_ts_store ON big_orders (order_ts, store_id)'),
}
SCENARIOS = [
    ('point', 'One order by id', "SELECT * FROM big_orders WHERE order_id = 12345", ['none', 'order_id']),
    ('paid', 'Most rows: status = paid', "SELECT count(*) FROM big_orders WHERE status = 'paid'", ['none', 'status']),
    ('cancelled', 'Some rows: status = cancelled', "SELECT count(*) FROM big_orders WHERE status = 'cancelled'", ['none', 'status']),
    ('pending', 'Few rows: status = pending', "SELECT count(*) FROM big_orders WHERE status = 'pending'", ['none', 'status']),
    ('range', 'One store and one week', "SELECT count(*) FROM big_orders\nWHERE store_id = 2 AND order_ts >= TIMESTAMP '2026-02-10 00:00:00' AND order_ts < TIMESTAMP '2026-02-17 00:00:00'",
     ['none', 'store', 'ts', 'store_ts', 'ts_store']),
    ('latest', 'The 10 latest orders', "SELECT order_id, order_ts FROM big_orders ORDER BY order_ts DESC LIMIT 10", ['none', 'ts']),
]


def run(rec):
    # ---- the plan lab: every scenario with every design, on PostgreSQL
    lab = {}
    for key, title, sql, designs in SCENARIOS:
        runs = {}
        for d in designs:
            with rec.tx('postgres'):
                ddl = DESIGNS[d][1]
                if ddl:
                    rec.run('postgres', ddl)
                    rec.run('postgres', 'ANALYZE big_orders')
                text = pg_plan(rec, sql)
                if key == 'range' and d != 'none':
                    pg_plan(rec, sql, buffers=True)
                    buf = pg_plan(rec, sql, buffers=True)
                    if buf != pg_plan(rec, sql, buffers=True):
                        raise RuntimeError('buffer counts changed between two runs of the same plan')
            read, returned = read_and_returned(text)
            runs[d] = {'plan': text, 'rows_read': read, 'rows_returned': returned, 'rows_matched': matched_rows(text), 'scan': first_scan(text), 'ddl': DESIGNS[d][1] or '', 'label': DESIGNS[d][0]}
            if key == 'range' and d != 'none':
                runs[d]['buffers'] = buf
        lab[key] = {'title': title, 'sql': sql, 'designs': designs, 'runs': runs}
    rec.counts('m11.lab', {'table_rows': rec.scalar('postgres', 'SELECT count(*) FROM big_orders'), 'scenarios': [s[0] for s in SCENARIOS], 'lab': lab})
    shares = {v: rec.scalar('postgres', "SELECT count(*) FROM big_orders WHERE status = '%s'" % v) for v in ('paid', 'cancelled', 'refunded', 'pending')}
    rec.counts('m11.status_rows', shares)

    # ---- the same point lookup on DuckDB and SQLite, without and with an index
    q = "SELECT * FROM big_orders WHERE order_id = 12345"
    other = {}
    for e in ('duckdb', 'sqlite'):
        other[e] = {'none': rec.plan_text(e, q)}
        with rec.tx(e):
            rec.run(e, 'CREATE INDEX o_order_id ON big_orders (order_id)')
            other[e]['index'] = rec.plan_text(e, q)
    rec.counts('m11.other_point', other)

    # ---- an index that holds every column of the query: an index-only scan (needs a vacuum, so a private copy of the table)
    rec.run('postgres', 'DROP TABLE IF EXISTS bo_copy')
    rec.run('postgres', 'CREATE TABLE bo_copy AS SELECT * FROM big_orders')
    rec.run('postgres', 'CREATE INDEX bo_copy_cust ON bo_copy (customer_id) INCLUDE (order_id)')
    rec.run('postgres', 'CHECKPOINT')            # the log is flushed, so VACUUM can mark every page as visible to all
    rec.run('postgres', 'VACUUM (ANALYZE) bo_copy')
    qc = "SELECT order_id FROM bo_copy WHERE customer_id = 42"
    cov = pg_plan(rec, qc)
    rec.run('postgres', 'DROP INDEX bo_copy_cust')
    rec.run('postgres', 'CREATE INDEX bo_copy_cust ON bo_copy (customer_id)')
    rec.run('postgres', 'CHECKPOINT')
    rec.run('postgres', 'VACUUM (ANALYZE) bo_copy')
    plain = pg_plan(rec, "SELECT order_id, total FROM bo_copy WHERE customer_id = 42")
    rec.run('postgres', 'DROP TABLE bo_copy')
    rec.counts('m11.covering', {'query': qc, 'index_only': cov, 'other_query': "SELECT order_id, total FROM bo_copy WHERE customer_id = 42", 'index_scan': plain})

    # ---- estimates against actual rows: a condition on an expression, then statistics on the expression, then stale statistics
    qe = "SELECT count(*) FROM big_orders WHERE order_id % 7 = 0"
    with rec.tx('postgres'):
        before = pg_plan(rec, qe)
        rec.run('postgres', 'CREATE INDEX o_mod7 ON big_orders ((order_id % 7))')
        rec.run('postgres', 'ANALYZE big_orders')
        after = pg_plan(rec, qe)
    qs = "SELECT count(*) FROM big_orders WHERE status = 'pending'"
    rec.run('postgres', 'DROP TABLE IF EXISTS stale_orders')
    rec.run('postgres', 'CREATE TABLE stale_orders (LIKE big_orders) WITH (autovacuum_enabled = false)')
    rec.run('postgres', "INSERT INTO stale_orders SELECT * FROM big_orders WHERE order_id <= 300")
    rec.run('postgres', 'ANALYZE stale_orders')
    rec.run('postgres', "INSERT INTO stale_orders SELECT * FROM big_orders WHERE order_id > 300")
    stale_q = "SELECT count(*) FROM stale_orders WHERE status = 'paid'"
    stale = pg_plan(rec, stale_q)
    rec.run('postgres', 'ANALYZE stale_orders')
    fresh = pg_plan(rec, stale_q)
    rec.run('postgres', 'DROP TABLE stale_orders')
    rec.counts('m11.estimates', {'expr_query': qe, 'expr_before': before, 'expr_after': after, 'stale_query': stale_q, 'stale': stale, 'fresh': fresh})

    # ---- join algorithms: the plan the planner picked, and the others when the planner is told not to use it
    qj = ("SELECT count(*) FROM big_orders AS o JOIN big_customers AS c ON c.customer_id = o.customer_id WHERE c.country = 'SG'")
    joins = {}
    with rec.tx('postgres'):
        joins['default'] = pg_plan(rec, qj)
    with rec.tx('postgres'):
        rec.run('postgres', 'SET LOCAL enable_hashjoin = off')
        rec.run('postgres', 'SET LOCAL enable_nestloop = off')
        joins['merge'] = pg_plan(rec, qj)
    with rec.tx('postgres'):
        rec.run('postgres', 'CREATE INDEX o_cust ON big_orders (customer_id)')
        rec.run('postgres', 'ANALYZE big_orders')
        rec.run('postgres', 'SET LOCAL enable_hashjoin = off')
        rec.run('postgres', 'SET LOCAL enable_mergejoin = off')
        joins['nested'] = pg_plan(rec, qj)
    joins['duckdb'] = rec.plan_text('duckdb', qj)
    joins['sqlite'] = rec.plan_text('sqlite', qj)
    rec.counts('m11.joins', dict(joins, query=qj))

    # ---- pagination: skip 20,000 rows with OFFSET, or start after the last id with a keyset
    qo = "SELECT order_id FROM big_orders ORDER BY order_id LIMIT 20 OFFSET 20000"
    qk = "SELECT order_id FROM big_orders WHERE order_id > 20000 ORDER BY order_id LIMIT 20"
    with rec.tx('postgres'):
        rec.run('postgres', 'CREATE INDEX o_order_id ON big_orders (order_id)')
        rec.run('postgres', 'ANALYZE big_orders')
        pag = {'offset_query': qo, 'offset': pg_plan(rec, qo), 'keyset_query': qk, 'keyset': pg_plan(rec, qk)}
        a = [r[0] for r in rec.run('postgres', qo).rows]
        b = [r[0] for r in rec.run('postgres', qk).rows]
    pag['same_page'] = a == b
    rec.counts('m11.pagination', pag)

    # ---- what an index costs on disk
    sizes = {}
    with rec.tx('postgres'):
        sizes['table'] = rec.scalar('postgres', "SELECT pg_relation_size('big_orders')")
        for name, ddl in (('order_id', 'CREATE INDEX s1 ON big_orders (order_id)'), ('customer_id', 'CREATE INDEX s2 ON big_orders (customer_id)'),
                          ('status', 'CREATE INDEX s3 ON big_orders (status)'), ('order_ts', 'CREATE INDEX s4 ON big_orders (order_ts)'),
                          ('store_id, order_ts', 'CREATE INDEX s5 ON big_orders (store_id, order_ts)')):
            rec.run('postgres', ddl)
            sizes[name] = rec.scalar('postgres', "SELECT pg_relation_size('%s')" % ddl.split()[2])
    rec.counts('m11.sizes', sizes)
