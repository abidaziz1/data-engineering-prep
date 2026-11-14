"""Mission 6: joins, duplicates and state that grows.

Two streams of the same speed are joined three ways: with no bound, with a time bound, and with a time to live. The size of the state in the checkpoints of each job is what the lesson shows.
A small file with repeated orders shows what removing duplicates does to a changelog.
"""
import re
import time

import fcluster as F
import fx

SRC = """SET 'parallelism.default' = '1';
SET 'execution.checkpointing.interval' = '2 s';
%(extra)sCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT, note STRING, ot AS PROCTIME())
WITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000',
      'fields.store_id.length' = '3', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800', 'fields.note.length' = '100');
CREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt AS PROCTIME())
WITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');
CREATE TEMPORARY TABLE joined (order_id BIGINT, note STRING, how_paid STRING) WITH ('connector' = 'blackhole');
"""
REGULAR = "INSERT INTO joined SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id;"
INTERVAL = ("INSERT INTO joined SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id "
            "AND o.ot BETWEEN p.pt - INTERVAL '5' SECOND AND p.pt + INTERVAL '5' SECOND;")


def explain_head(f, query_sql, name):
    """The first operator of the optimized physical plan of a join query."""
    script = SRC % {'extra': ''} + 'EXPLAIN ' + query_sql.replace('INSERT INTO joined ', '')
    rc, out, err = f.sql(script, name=name)
    o = F.strip_ansi(out)
    plan = o[o.index('== Optimized Physical Plan =='):].split('== Optimized Execution Plan ==')[0]
    line = next(l for l in plan.splitlines() if re.match(r'(Interval)?Join\(', l.strip()) or 'Join(' in l)
    return re.sub(r'\s+', ' ', line.strip())


PLAIN = """CREATE TEMPORARY TABLE orders (order_id BIGINT, note STRING, ot TIMESTAMP(3))
WITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.note.length' = '100');
CREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt TIMESTAMP(3))
WITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');
EXPLAIN SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id AND o.ot BETWEEN p.pt - INTERVAL '5' SECOND AND p.pt + INTERVAL '5' SECOND;"""


def explain_plain_timestamp(f, name):
    """The same time condition on two plain TIMESTAMP columns, which are not time attributes: the first operator of the plan. The planner cannot bound the state, so it runs a plain Join."""
    rc, out, err = f.sql(PLAIN, name=name)
    o = F.strip_ansi(out)
    plan = o[o.index('== Optimized Physical Plan =='):].split('== Optimized Execution Plan ==')[0]
    line = next(l for l in plan.splitlines() if 'Join(' in l)
    return re.sub(r'\s+', ' ', line.strip())


def series(f, jid, n=9, timeout=90):
    """The size of the state of the join, in bytes, in the first n completed checkpoints of a job: the 'state_size' that the REST interface gives for the vertex that holds the join."""
    vid = next(v['id'] for v in f.job(jid)['vertices'] if 'Join' in v['name'])
    t0 = time.time()
    while True:
        h = f.checkpoints(jid)['history']
        done = sorted([c for c in h if c['status'] == 'COMPLETED'], key=lambda c: c['id'])
        if len(done) >= n or time.time() - t0 > timeout:
            out = []
            for c in done[:n]:
                d = f.rest('/jobs/%s/checkpoints/details/%d' % (jid, c['id']))
                out.append((c['id'], d['tasks'][vid]['state_size']))
            return out
        time.sleep(1)


def run_join(f, label, extra, stmt):
    jid, out = fx.submit(f, SRC % {'extra': extra} + stmt, name='joins_' + label)
    f.wait_state(jid, 'RUNNING')
    s = series(f, jid)
    f.cancel(jid)
    f.wait_idle()
    return s


def record_joins(f, rec):
    f.cancel_all()
    f.wait_idle()
    runs = [('regular', 'a join with no time bound', '', REGULAR), ('interval', 'an interval join, five seconds each way', '', INTERVAL),
            ('ttl', 'the same join as the first, with a time to live of 10 seconds', "SET 'table.exec.state.ttl' = '10 s';\n", REGULAR)]
    res = {}
    for key, label, extra, stmt in runs:
        res[key] = run_join(f, key, extra, stmt)
    n = min(len(v) for v in res.values())
    rec.table('joins.state_size', ['checkpoint (one every 2 seconds)', 'no time bound (bytes)', 'interval join (bytes)', 'time to live 10 s (bytes)'],
              [[i + 1, res['regular'][i][1], res['interval'][i][1], res['ttl'][i][1]] for i in range(n)])
    reg, itv, ttl = [[x[1] for x in res[k][:n]] for k in ('regular', 'interval', 'ttl')]
    rec.counts('joins.state_summary', {'checkpoints': n, 'regular_first': reg[0], 'regular_last': reg[-1], 'interval_first': itv[0], 'interval_last': itv[-1], 'ttl_first': ttl[0], 'ttl_last': ttl[-1],
                                       'regular_grows_every_checkpoint': all(b > a for a, b in zip(reg, reg[1:])), 'interval_max': max(itv), 'ttl_max': max(ttl),
                                       'ttl_flat_at_the_end': max(ttl[-3:]) <= min(ttl[-3:]) * 1.35, 'ratio_regular_to_interval_last': round(reg[-1] / max(1, itv[-1]), 1)})
    rec.text('joins.plan_regular', explain_head(f, REGULAR, 'joins_ex1'))
    rec.text('joins.plan_interval', explain_head(f, INTERVAL, 'joins_ex2'))
    rec.text('joins.plan_plain_timestamp', explain_plain_timestamp(f, 'joins_ex3'))

    # ---- removing duplicates: keep the first row of a key, or the last ----
    import json
    dup = [fx.order(i) for i in range(6)]
    rows = [dup[0], dup[1], dict(dup[0], total_cents=350), dup[2], dict(dup[1], total_cents=390, status='refunded'), dict(dup[0], total_cents=300, status='paid'), dup[3], dup[2]]
    path = fx.write_jsonl(f.work / 'data' / 'dup8.jsonl', rows)
    rec.table('joins.dup_input', ['arrives', 'order_id', 'store_id', 'total_cents', 'status'], [[i + 1, r['order_id'], r['store_id'], r['total_cents'], r['status']] for i, r in enumerate(rows)])
    base = ("SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\n"
            "CREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING, pt AS PROCTIME()) WITH "
            "('connector' = 'filesystem', 'path' = 'file://%s', 'format' = 'json');\n" % path)
    for key, order in (('first', 'ASC'), ('last', 'DESC')):
        q = ("SELECT order_id, store_id, total_cents, status FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt %s) AS rn FROM orders) WHERE rn = 1;" % order)
        rc, out, err = f.sql(base + q, name='joins_dedup_' + key)
        t = fx.tables(out)[-1]
        rec.table('joins.dedup_' + key, t['cols'], t['rows'])
    rec.counts('joins.dedup_summary', {'input_rows': len(rows), 'distinct_orders': len({r['order_id'] for r in rows})})
