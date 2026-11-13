"""Mission 5: how PostgreSQL and DuckDB plan a CTE. Rows are real, times are not recorded."""

Q_ONCE = "WITH o AS (SELECT * FROM big_orders) SELECT * FROM o WHERE order_id = 12345"
Q_MAT = "WITH o AS MATERIALIZED (SELECT * FROM big_orders) SELECT * FROM o WHERE order_id = 12345"
Q_TWICE = ("WITH s AS (SELECT store_id, sum(total) AS revenue FROM big_orders WHERE status = 'paid' GROUP BY store_id)\n"
           "SELECT a.store_id, a.revenue, round(100.0 * a.revenue / (SELECT sum(revenue) FROM s), 1) AS share FROM s AS a ORDER BY a.store_id")


Q_CORR = ("SELECT c.customer_id,\n"
          "       (SELECT max(o.total) FROM big_orders AS o WHERE o.customer_id = c.customer_id) AS biggest\n"
          "FROM big_customers AS c")
Q_EXISTS = ("SELECT c.customer_id\n"
            "FROM big_customers AS c\n"
            "WHERE EXISTS (SELECT 1 FROM big_orders AS o WHERE o.customer_id = c.customer_id AND o.status = 'refunded')")


def run(rec):
    plans = {}
    for idx in (False, True):
        with rec.tx('postgres'):
            if idx:
                rec.run('postgres', 'CREATE INDEX big_orders_cust ON big_orders (customer_id)')
                rec.run('postgres', 'ANALYZE big_orders')
            plans['pg_corr_' + ('index' if idx else 'noindex')] = rec.plan_text('postgres', Q_CORR, costs=False)
    with rec.tx('postgres'):
        plans['pg_exists'] = rec.plan_text('postgres', Q_EXISTS, costs=False)
    plans['duck_corr'] = rec.plan_text('duckdb', Q_CORR)
    plans['duck_exists'] = rec.plan_text('duckdb', Q_EXISTS)
    for idx in (False, True):
        with rec.tx('postgres'):
            if idx:
                rec.run('postgres', 'CREATE INDEX big_orders_id ON big_orders (order_id)')
                rec.run('postgres', 'ANALYZE big_orders')
            tag = 'index' if idx else 'noindex'
            plans['pg_inlined_' + tag] = rec.plan_text('postgres', Q_ONCE, costs=False)
            plans['pg_materialized_' + tag] = rec.plan_text('postgres', Q_MAT, costs=False)
    with rec.tx('postgres'):
        plans['pg_twice'] = rec.plan_text('postgres', Q_TWICE, costs=False)
    plans['duck_once'] = rec.plan_text('duckdb', Q_ONCE)
    plans['duck_twice'] = rec.plan_text('duckdb', Q_TWICE)
    for k, v in plans.items():
        rec.text('m5.plan.' + k, v)
    rec.file('m5.plan.once', Q_ONCE)
    rec.file('m5.plan.materialized', Q_MAT)
    rec.file('m5.plan.twice', Q_TWICE)
    rec.file('m5.plan.corr', Q_CORR)
    rec.file('m5.plan.exists', Q_EXISTS)
