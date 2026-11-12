"""Mission 1: the stages of one query, the plans that three engines make for it, and a real psql session."""
import re
import subprocess

STAGES = [
    ('FROM and JOIN', "SELECT o.order_id, o.status, o.total, c.country\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nORDER BY o.order_id"),
    ('WHERE', "SELECT o.order_id, o.status, o.total, c.country\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nORDER BY o.order_id"),
    ('GROUP BY', "SELECT c.country, count(*) AS n_rows, sum(o.total) AS sum_total, avg(o.total) AS avg_total\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nORDER BY c.country"),
    ('HAVING', "SELECT c.country, count(*) AS n_rows, sum(o.total) AS sum_total, avg(o.total) AS avg_total\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY c.country"),
    ('SELECT', "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue, round(avg(o.total), 2) AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY c.country"),
    ('ORDER BY', "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue, round(avg(o.total), 2) AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY revenue DESC"),
    ('LIMIT', "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue, round(avg(o.total), 2) AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY revenue DESC\nLIMIT 3"),
]


def run(rec):
    stages = []
    for i, (clause, sql) in enumerate(STAGES):
        r = rec.run('duckdb', sql)
        rec.result_table('m1.stage.%d' % i, r)
        rec.file('m1.stage.%d' % i, sql)
        stages.append({'clause': clause, 'table': 'm1.stage.%d' % i, 'rows': len(r.rows)})
    rec.counts('m1.stages', {'stages': stages, 'engine': 'duckdb'})

    # the plan that each engine makes for the headline query, without running it (estimates) and with running it (real rows)
    q = rec.out['files']['m1.revenue'].strip().rstrip(';')
    for e in ('duckdb', 'postgres', 'sqlite'):
        rec.text('m1.plan.%s' % e, rec.plan_text(e, q, analyze=(e != 'sqlite')))

    # a real psql session against the PostgreSQL server of this run
    m = re.search(r'host=(\S+) port=(\d+) user=(\S+) dbname=(\S+)', rec.dsn)
    host, port, user, db = m.groups()
    sql = "SELECT country, count(*) AS customers FROM customers GROUP BY country ORDER BY country NULLS LAST;"
    p = subprocess.run(['psql', '-X', '-h', host, '-p', port, '-U', user, '-d', db, '-c', sql], capture_output=True, text=True, check=True)
    rec.text('m1.psql', p.stdout)
    rec.text('m1.psql.command', 'psql brewline -c "%s"' % sql)
