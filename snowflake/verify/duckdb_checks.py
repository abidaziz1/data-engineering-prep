"""Re-run the Brewline worksheet queries in DuckDB so the result tables in the lessons are real output.

Only SQL that DuckDB understands is checked here (joins, windows, QUALIFY, JSON paths, MERGE logic).
Snowflake-only statements (warehouses, stages, pipes, Time Travel, policies) cannot run in DuckDB
and are reviewed by hand. The Snowflake text shown in the lesson and the DuckDB text below differ only
in JSON path syntax and a few function names, which are noted next to each check.
"""
import duckdb


def build():
    con = duckdb.connect()
    con.execute("""
    CREATE TABLE customers AS SELECT * FROM (VALUES
      ('C-12','Omar Haddad','US'),('C-42','Ava Martin','US'),('C-77','Noah Singh','UK'),('C-91','Lea Dubois','FR')
    ) t(customer_id, full_name, country);
    CREATE TABLE products AS SELECT * FROM (VALUES
      ('P-10','Ethiopia 250 g','coffee',14.00),('P-11','Colombia 250 g','coffee',12.50),('P-12','Kenya 250 g','coffee',16.00),
      ('P-22','Hand grinder','gear',39.00),('P-30','Kettle','gear',55.00),('P-31','Scale','gear',29.00)
    ) t(product_id, name, category, price);
    CREATE TABLE orders AS SELECT order_id, customer_id, CAST(order_ts AS TIMESTAMP) AS order_ts, status, CAST(total_usd AS DECIMAL(10,2)) AS total_usd FROM (VALUES
      ('O-5001','C-42','2026-03-14 09:12:00','SHIPPED',67.00),
      ('O-5002','C-77','2026-03-14 09:15:00','PLACED',12.50),
      ('O-5003','C-42','2026-03-14 10:02:00','SHIPPED',28.00),
      ('O-5004','C-91','2026-03-15 11:20:00','SHIPPED',55.00),
      ('O-5005','C-12','2026-03-15 14:05:00','CANCELLED',29.00),
      ('O-5006','C-77','2026-03-16 08:40:00','SHIPPED',44.50),
      ('O-5007','C-42','2026-03-16 17:55:00','PLACED',16.00),
      ('O-5008','C-91','2026-03-17 12:30:00','SHIPPED',39.00),
      ('O-5009','C-12','2026-03-17 15:00:00','SHIPPED',30.00),
      ('O-5010','C-77','2026-03-17 16:20:00','PLACED',20.00)
    ) t(order_id, customer_id, order_ts, status, total_usd);
    CREATE TABLE order_items AS SELECT * FROM (VALUES
      ('O-5001',1,'P-10',2,14.00),('O-5001',2,'P-22',1,39.00),('O-5002',1,'P-11',1,12.50),('O-5003',1,'P-10',2,14.00),
      ('O-5004',1,'P-30',1,55.00),('O-5005',1,'P-31',1,29.00),('O-5006',1,'P-12',2,16.00),('O-5006',2,'P-11',1,12.50),
      ('O-5007',1,'P-12',1,16.00),('O-5008',1,'P-22',1,39.00),('O-5009',1,'P-31',1,29.00)
    ) t(order_id, line_no, product_id, qty, unit_price);
    -- RAW.ORDERS as Mission 3 loaded it: append-only, with audit columns
    CREATE TABLE raw_orders AS SELECT order_id, customer_id, CAST(order_ts AS TIMESTAMP) AS order_ts, status, CAST(total_usd AS DECIMAL(10,2)) AS total_usd, _file, CAST(_loaded_at AS TIMESTAMP) AS _loaded_at FROM (VALUES
      ('O-5001','C-42','2026-03-14 09:12:00','PLACED',67.00,'part-0001.csv.gz','2026-03-14 09:31:07'),
      ('O-5002','C-77','2026-03-14 09:15:00','PLACED',12.50,'part-0001.csv.gz','2026-03-14 09:31:07'),
      ('O-5001','C-42','2026-03-14 09:12:00','SHIPPED',67.00,'part-0002.csv.gz','2026-03-14 10:31:44'),
      ('O-5003','C-42','2026-03-14 10:02:00','PLACED',28.00,'part-0002.csv.gz','2026-03-14 10:31:44'),
      ('O-5003','C-42','2026-03-14 10:02:00','SHIPPED',28.00,'part-0003.csv.gz','2026-03-14 11:31:20')
    ) t(order_id, customer_id, order_ts, status, total_usd, _file, _loaded_at);
    -- CORE.ORDERS as it stood before the MERGE
    CREATE TABLE core_before AS SELECT * FROM (VALUES
      ('O-5001','C-42','PLACED'),('O-5002','C-77','PLACED')
    ) t(order_id, customer_id, status);
    CREATE TABLE web_events AS SELECT CAST(p AS JSON) AS payload FROM (VALUES
      ('{"event_id":"E-9001","ts":"2026-03-14T09:10:41Z","user":{"id":"C-42","device":"ios"},"event":"add_to_cart","items":[{"sku":"P-10","qty":2},{"sku":"P-22","qty":1}]}'),
      ('{"event_id":"E-9002","ts":"2026-03-14T09:14:02Z","user":{"id":"C-77","device":"web"},"event":"add_to_cart","items":[{"sku":"P-11","qty":1}]}'),
      ('{"event_id":"E-9003","ts":"2026-03-14T09:20:55Z","user":{"id":"C-42","device":"ios"},"event":"page_view","items":[]}')
    ) t(p);
    CREATE TABLE session_events AS SELECT user_id, CAST(event_ts AS TIMESTAMP) AS event_ts FROM (VALUES
      ('C-42','2026-03-14 09:00:00'),('C-42','2026-03-14 09:10:00'),('C-42','2026-03-14 09:25:00'),('C-42','2026-03-14 10:15:00'),('C-42','2026-03-14 10:20:00'),
      ('C-77','2026-03-14 11:00:00'),('C-77','2026-03-14 11:40:00'),('C-77','2026-03-14 11:55:00')
    ) t(user_id, event_ts);
    """)
    return con


def q(con, sql):
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    return cols, [list(r) for r in cur.fetchall()]


def run():
    con = build()
    out = {}

    # m4-sql-core: revenue by country (same text as Snowflake)
    out['m4-sql-core'] = q(con, """
        SELECT c.country, COUNT(*) AS orders, SUM(o.total_usd) AS revenue_usd
        FROM orders o JOIN customers c ON c.customer_id = o.customer_id
        WHERE o.status <> 'CANCELLED'
        GROUP BY c.country ORDER BY revenue_usd DESC""")

    # m4-qualify: latest row per order (same text as Snowflake)
    out['m4-qualify'] = q(con, """
        SELECT order_id, status, total_usd, _file
        FROM raw_orders
        QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY _loaded_at DESC) = 1
        ORDER BY order_id""")

    # m4-variant-sql: Snowflake  payload:user.id::STRING  ==  DuckDB  payload->>'$.user.id'
    out['m4-variant-sql'] = q(con, """
        SELECT payload->>'$.user.id' AS customer_id, payload->>'$.event' AS event,
               CAST(payload->>'$.ts' AS TIMESTAMPTZ) AT TIME ZONE 'UTC' AS event_ts,
               payload->>'$.items[0].sku' AS first_sku
        FROM web_events ORDER BY event_ts""")

    # m4-flatten: Snowflake LATERAL FLATTEN(INPUT => payload:items)  ==  DuckDB UNNEST of the JSON array
    out['m4-flatten'] = q(con, """
        SELECT e.payload->>'$.user.id' AS customer_id, i->>'$.sku' AS sku, CAST(i->>'$.qty' AS INTEGER) AS qty
        FROM web_events e, UNNEST(CAST(e.payload->'$.items' AS JSON[])) AS t(i)
        WHERE e.payload->>'$.event' = 'add_to_cart'
        ORDER BY customer_id, sku""")

    # m4-merge: counts the MERGE would report. Source = latest RAW row per order.
    out['m4-merge'] = q(con, """
        WITH s AS (SELECT order_id, status FROM raw_orders
                   QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY _loaded_at DESC) = 1)
        SELECT (SELECT COUNT(*) FROM s WHERE order_id NOT IN (SELECT order_id FROM core_before)) AS "number of rows inserted",
               (SELECT COUNT(*) FROM s JOIN core_before t USING (order_id) WHERE t.status <> s.status) AS "number of rows updated" """)

    # m4-ch-topn: top 2 products by revenue in each category
    out['m4-ch-topn'] = q(con, """
        SELECT p.category, p.product_id, SUM(i.qty * i.unit_price) AS revenue_usd,
               RANK() OVER (PARTITION BY p.category ORDER BY SUM(i.qty * i.unit_price) DESC) AS rnk
        FROM order_items i
        JOIN orders o ON o.order_id = i.order_id AND o.status <> 'CANCELLED'
        JOIN products p ON p.product_id = i.product_id
        GROUP BY p.category, p.product_id
        QUALIFY rnk <= 2
        ORDER BY p.category, rnk""")

    # m4-ch-session: sessions with a 30 minute gap
    out['m4-ch-session'] = q(con, """
        WITH flagged AS (
          SELECT user_id, event_ts,
                 CASE WHEN LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts) IS NULL
                        OR DATEDIFF('minute', LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts), event_ts) > 30
                      THEN 1 ELSE 0 END AS new_session
          FROM session_events),
        numbered AS (
          SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_ts) AS session_no FROM flagged)
        SELECT user_id, session_no, MIN(event_ts) AS started_at, MAX(event_ts) AS ended_at, COUNT(*) AS events
        FROM numbered GROUP BY user_id, session_no ORDER BY user_id, session_no""")

    # m4-ch-recon: orders whose line items do not add up to the order total
    out['m4-ch-recon'] = q(con, """
        SELECT o.order_id, o.total_usd, COALESCE(SUM(i.qty * i.unit_price), 0) AS items_usd,
               o.total_usd - COALESCE(SUM(i.qty * i.unit_price), 0) AS diff_usd
        FROM orders o LEFT JOIN order_items i ON i.order_id = o.order_id
        GROUP BY o.order_id, o.total_usd
        HAVING o.total_usd <> COALESCE(SUM(i.qty * i.unit_price), 0)
        ORDER BY o.order_id""")

    # m4-bug2: NOT IN with a NULL in the subquery returns no rows. Both forms below.
    con.execute("CREATE TABLE guest_orders AS SELECT * FROM (VALUES ('C-42'),('C-77'),(NULL)) t(customer_id)")
    out['_notin'] = q(con, "SELECT customer_id FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM guest_orders)")
    out['_notexists'] = q(con, "SELECT customer_id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM guest_orders g WHERE g.customer_id = c.customer_id) ORDER BY 1")
    return out


if __name__ == '__main__':
    for k, (cols, rows) in run().items():
        print(k, cols)
        for r in rows:
            print('   ', r)
