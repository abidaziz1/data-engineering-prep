"""The made-up Brewline data of the SQL tutorial.

Two data sets, both fully deterministic:

  mini  a few dozen hand-written rows. Lessons show these rows on screen, so every example can be followed by eye.
        One script (mini_script) creates and fills the tables, and it runs unchanged on DuckDB, PostgreSQL and SQLite.
  big   a few tens of thousands of rows made by SQL arithmetic (generate_series and modulo), so that plans and row counts
        mean something. Three scripts, one for each engine, because the way to write a series differs.

Nothing here is random. Nothing is real customer data.
"""

# (name, [(column, type)], [rows]) with the types DECIMAL(10,2), VARCHAR, TIMESTAMP, DATE, BOOLEAN and INTEGER.
# Every one of these type names works on DuckDB, PostgreSQL and SQLite.
T = {}


def table(name, cols, rows, pk=None):
    T[name] = {'cols': cols, 'rows': rows, 'pk': pk}


table('stores', [('store_id', 'INTEGER'), ('name', 'VARCHAR'), ('city', 'VARCHAR'), ('country', 'VARCHAR')], [
    (1, 'Orchard', 'Singapore', 'SG'),
    (2, 'Bukit Bintang', 'Kuala Lumpur', 'MY'),
    (3, 'Kemang', 'Jakarta', 'ID'),
    (4, 'Surry Hills', 'Sydney', 'AU'),
], pk='store_id')

table('customers', [('customer_id', 'INTEGER'), ('name', 'VARCHAR'), ('email', 'VARCHAR'), ('country', 'VARCHAR'), ('tier', 'VARCHAR'), ('signup_date', 'DATE')], [
    (1, 'Ana Lim', 'ana@example.com', 'SG', 'gold', '2026-01-05'),
    (2, 'Ben Ortiz', None, 'MY', 'silver', '2026-01-12'),
    (3, 'Chen Wei', 'chen@example.com', 'SG', None, '2026-01-20'),
    (4, 'Dara Putri', 'dara@example.com', 'ID', 'silver', '2026-02-02'),
    (5, 'Eli Cohen', 'eli@example.com', 'AU', 'gold', '2026-02-10'),
    (6, 'Fay Tan', None, None, None, '2026-02-14'),
    (7, 'Gus Hall', 'gus@example.com', 'AU', 'silver', '2026-02-20'),
    (8, 'Hana Ito', 'hana@example.com', 'SG', 'gold', '2026-03-01'),
], pk='customer_id')

table('products', [('product_id', 'INTEGER'), ('sku', 'VARCHAR'), ('name', 'VARCHAR'), ('category', 'VARCHAR'), ('unit_price', 'DECIMAL(10,2)')], [
    (1, 'ESP-01', 'Espresso', 'hot', '3.50'),
    (2, 'LAT-01', 'Latte', 'hot', '4.50'),
    (3, 'CLD-01', 'Cold brew', 'cold', '5.00'),
    (4, 'BEA-01', 'House beans 250g', 'beans', '14.00'),
    (5, 'MUG-01', 'Brewline mug', 'merch', '12.00'),
    (6, 'MAT-01', 'Matcha', 'hot', '5.50'),
], pk='product_id')

# order 1009 is a guest order (no customer). 1005 was cancelled, 1008 refunded, 1012 is still pending.
table('orders', [('order_id', 'INTEGER'), ('customer_id', 'INTEGER'), ('store_id', 'INTEGER'), ('order_ts', 'TIMESTAMP'), ('status', 'VARCHAR'), ('channel', 'VARCHAR'), ('total', 'DECIMAL(10,2)')], [
    (1001, 1, 1, '2026-03-01 02:15:00', 'paid', 'web', '11.50'),
    (1002, 1, 1, '2026-03-03 09:40:00', 'paid', 'store', '18.50'),
    (1003, 2, 2, '2026-03-02 16:30:00', 'paid', 'app', '5.00'),
    (1004, 3, 1, '2026-03-02 23:50:00', 'paid', 'web', '26.00'),
    (1005, 4, 3, '2026-03-04 03:05:00', 'cancelled', 'app', '9.00'),
    (1006, 5, 4, '2026-03-04 21:10:00', 'paid', 'web', '14.00'),
    (1007, 1, 1, '2026-03-05 08:00:00', 'paid', 'app', '7.00'),
    (1008, 7, 4, '2026-03-06 10:20:00', 'refunded', 'web', '12.00'),
    (1009, None, 2, '2026-03-06 11:00:00', 'paid', 'store', '9.50'),
    (1010, 3, 1, '2026-03-07 12:30:00', 'paid', 'web', '19.00'),
    (1011, 5, 4, '2026-03-08 04:45:00', 'paid', 'app', '16.50'),
    (1012, 2, 2, '2026-03-09 15:00:00', 'pending', 'app', '8.00'),
], pk='order_id')

table('order_items', [('order_id', 'INTEGER'), ('line_no', 'INTEGER'), ('product_id', 'INTEGER'), ('qty', 'INTEGER'), ('unit_price', 'DECIMAL(10,2)')], [
    (1001, 1, 1, 2, '3.50'), (1001, 2, 2, 1, '4.50'),
    (1002, 1, 4, 1, '14.00'), (1002, 2, 2, 1, '4.50'),
    (1003, 1, 3, 1, '5.00'),
    (1004, 1, 4, 1, '14.00'), (1004, 2, 5, 1, '12.00'),
    (1005, 1, 2, 2, '4.50'),
    (1006, 1, 4, 1, '14.00'),
    (1007, 1, 1, 2, '3.50'),
    (1008, 1, 5, 1, '12.00'),
    (1009, 1, 2, 1, '4.50'), (1009, 2, 3, 1, '5.00'),
    (1010, 1, 4, 1, '14.00'), (1010, 2, 3, 1, '5.00'),
    (1011, 1, 2, 1, '4.50'), (1011, 2, 5, 1, '12.00'),
    (1012, 1, 2, 1, '4.50'), (1012, 2, 1, 1, '3.50'),
], pk='order_id, line_no')

# order 1002 was paid in two parts. 1008 was paid and then refunded. 1005 and 1012 have no payment.
table('payments', [('payment_id', 'INTEGER'), ('order_id', 'INTEGER'), ('paid_ts', 'TIMESTAMP'), ('method', 'VARCHAR'), ('amount', 'DECIMAL(10,2)'), ('status', 'VARCHAR')], [
    (1, 1001, '2026-03-01 02:16:00', 'card', '11.50', 'ok'),
    (2, 1002, '2026-03-03 09:41:00', 'card', '10.00', 'ok'),
    (3, 1002, '2026-03-03 09:42:00', 'wallet', '8.50', 'ok'),
    (4, 1003, '2026-03-02 16:31:00', 'wallet', '5.00', 'ok'),
    (5, 1004, '2026-03-02 23:51:00', 'card', '26.00', 'ok'),
    (6, 1006, '2026-03-04 21:11:00', 'card', '14.00', 'ok'),
    (7, 1007, '2026-03-05 08:01:00', 'wallet', '7.00', 'ok'),
    (8, 1008, '2026-03-06 10:21:00', 'card', '12.00', 'ok'),
    (9, 1008, '2026-03-06 15:00:00', 'card', '-12.00', 'refund'),
    (10, 1009, '2026-03-06 11:01:00', 'cash', '9.50', 'ok'),
    (11, 1010, '2026-03-07 12:31:00', 'card', '19.00', 'ok'),
    (12, 1011, '2026-03-08 04:46:00', 'card', '16.50', 'ok'),
], pk='payment_id')

# web and app events on 2 March (UTC). customer_id NULL is a visitor who is not signed in.
table('events', [('event_id', 'INTEGER'), ('customer_id', 'INTEGER'), ('event_ts', 'TIMESTAMP'), ('event_type', 'VARCHAR'), ('page', 'VARCHAR')], [
    (1, 1, '2026-03-02 09:00:00', 'view', 'home'),
    (2, 1, '2026-03-02 09:04:00', 'view', 'product'),
    (3, 1, '2026-03-02 09:09:00', 'add_to_cart', 'product'),
    (4, 1, '2026-03-02 09:15:00', 'checkout', 'cart'),
    (5, 1, '2026-03-02 09:16:00', 'purchase', 'done'),
    (6, 1, '2026-03-02 14:02:00', 'view', 'home'),
    (7, 1, '2026-03-02 14:05:00', 'view', 'product'),
    (8, 2, '2026-03-02 10:00:00', 'view', 'home'),
    (9, 2, '2026-03-02 10:40:00', 'view', 'product'),
    (10, 2, '2026-03-02 10:46:00', 'add_to_cart', 'product'),
    (11, 2, '2026-03-02 16:20:00', 'view', 'product'),
    (12, 2, '2026-03-02 16:27:00', 'add_to_cart', 'product'),
    (13, 2, '2026-03-02 16:29:00', 'checkout', 'cart'),
    (14, 2, '2026-03-02 16:30:00', 'purchase', 'done'),
    (15, 3, '2026-03-02 11:00:00', 'view', 'home'),
    (16, 3, '2026-03-02 11:01:00', 'view', 'product'),
    (17, 3, '2026-03-02 11:02:00', 'add_to_cart', 'product'),
    (18, 3, '2026-03-02 11:03:00', 'checkout', 'cart'),
    (19, 3, '2026-03-02 23:42:00', 'view', 'product'),
    (20, 3, '2026-03-02 23:45:00', 'add_to_cart', 'product'),
    (21, 3, '2026-03-02 23:48:00', 'checkout', 'cart'),
    (22, 3, '2026-03-02 23:50:00', 'purchase', 'done'),
    (23, None, '2026-03-02 12:00:00', 'view', 'home'),
    (24, None, '2026-03-02 12:30:00', 'view', 'product'),
], pk='event_id')

table('daily_active', [('customer_id', 'INTEGER'), ('day', 'DATE')], [
    (1, '2026-03-01'), (1, '2026-03-02'), (1, '2026-03-03'), (1, '2026-03-05'), (1, '2026-03-06'), (1, '2026-03-09'),
    (2, '2026-03-02'), (2, '2026-03-03'), (2, '2026-03-04'), (2, '2026-03-05'), (2, '2026-03-07'),
    (3, '2026-03-01'), (3, '2026-03-02'), (3, '2026-03-04'),
])

table('categories', [('category_id', 'INTEGER'), ('name', 'VARCHAR'), ('parent_id', 'INTEGER')], [
    (1, 'Menu', None),
    (2, 'Drinks', 1),
    (3, 'Coffee', 2),
    (4, 'Espresso drinks', 3),
    (5, 'Cold coffee', 3),
    (6, 'Tea', 2),
    (7, 'Retail', 1),
    (8, 'Beans', 7),
    (9, 'Merch', 7),
], pk='category_id')

# prices change. valid_to is the last day the price holds, and 9999-12-31 means "until further notice".
table('price_history', [('product_id', 'INTEGER'), ('price', 'DECIMAL(10,2)'), ('valid_from', 'DATE'), ('valid_to', 'DATE')], [
    (1, '3.00', '2026-01-01', '2026-02-28'),
    (1, '3.50', '2026-03-01', '9999-12-31'),
    (2, '4.50', '2026-01-01', '9999-12-31'),
    (3, '4.50', '2026-01-01', '2026-03-04'),
    (3, '5.00', '2026-03-05', '9999-12-31'),
    (4, '14.00', '2026-01-01', '9999-12-31'),
    (5, '12.00', '2026-01-01', '9999-12-31'),
    (6, '5.50', '2026-01-01', '9999-12-31'),
])

# a raw landing table: retried loads wrote some orders twice, and one order changed status between loads
table('orders_raw', [('order_id', 'INTEGER'), ('ingested_at', 'TIMESTAMP'), ('status', 'VARCHAR'), ('total', 'DECIMAL(10,2)')], [
    (1001, '2026-03-01 02:20:00', 'pending', '11.50'),
    (1001, '2026-03-01 02:25:00', 'paid', '11.50'),
    (1002, '2026-03-03 09:45:00', 'paid', '18.50'),
    (1002, '2026-03-03 09:45:00', 'paid', '18.50'),
    (1003, '2026-03-02 16:35:00', 'paid', '5.00'),
    (1004, '2026-03-02 23:55:00', 'paid', '26.00'),
    (1004, '2026-03-03 00:10:00', 'paid', '26.00'),
    (1005, '2026-03-04 03:10:00', 'pending', '9.00'),
    (1005, '2026-03-04 03:30:00', 'cancelled', '9.00'),
])

# two stores a day, so that ordering by day gives peers (two rows with the same day)
table('daily_revenue', [('day', 'DATE'), ('store_id', 'INTEGER'), ('revenue', 'DECIMAL(10,2)')], [
    ('2026-03-01', 1, '40'), ('2026-03-01', 2, '25'),
    ('2026-03-02', 1, '55'), ('2026-03-02', 2, '30'),
    ('2026-03-03', 1, '35'), ('2026-03-03', 2, '45'),
    ('2026-03-04', 1, '60'), ('2026-03-04', 2, '20'),
    ('2026-03-05', 1, '50'), ('2026-03-05', 2, '50'),
])

# a slowly changing dimension: one row for each version of a customer's tier
table('customer_dim', [('customer_key', 'INTEGER'), ('customer_id', 'INTEGER'), ('tier', 'VARCHAR'), ('valid_from', 'DATE'), ('valid_to', 'DATE'), ('is_current', 'BOOLEAN')], [
    (1, 1, 'silver', '2026-01-05', '2026-02-14', 'FALSE'),
    (2, 1, 'gold', '2026-02-15', '9999-12-31', 'TRUE'),
    (3, 2, 'silver', '2026-01-12', '9999-12-31', 'TRUE'),
    (4, 4, 'silver', '2026-02-02', '9999-12-31', 'TRUE'),
    (5, 5, 'gold', '2026-02-10', '9999-12-31', 'TRUE'),
], pk='customer_key')

# the batch of changes that arrives on 10 March: customer 2 moves to gold, customer 9 is new, 1 and 4 are repeated unchanged
table('customer_changes', [('customer_id', 'INTEGER'), ('tier', 'VARCHAR'), ('changed_on', 'DATE')], [
    (2, 'gold', '2026-03-10'),
    (9, 'gold', '2026-03-10'),
    (1, 'gold', '2026-03-10'),
    (4, 'silver', '2026-03-10'),
])

ORDER = ['stores', 'customers', 'products', 'orders', 'order_items', 'payments', 'events', 'daily_active', 'categories', 'price_history',
         'orders_raw', 'daily_revenue', 'customer_dim', 'customer_changes']


def lit(v, typ):
    if v is None:
        return 'NULL'
    if typ.startswith('DECIMAL') or typ == 'INTEGER':
        return str(v)
    if typ == 'BOOLEAN':
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def mini_script():
    """One script that creates and fills every mini table. It runs unchanged on DuckDB, PostgreSQL and SQLite."""
    out = ['-- The Brewline mini data: a few dozen made-up rows. The same script runs on DuckDB, PostgreSQL and SQLite.']
    for name in ORDER:
        t = T[name]
        cols = ',\n  '.join('%s %s' % (c, ty) + (' PRIMARY KEY' if t['pk'] == c else '') for c, ty in t['cols'])
        pk = (',\n  PRIMARY KEY (%s)' % t['pk']) if t['pk'] and ',' in t['pk'] else ''
        out.append('CREATE TABLE %s (\n  %s%s\n);' % (name, cols, pk))
        rows = ',\n  '.join('(' + ', '.join(lit(v, ty) for v, (_, ty) in zip(r, t['cols'])) + ')' for r in t['rows'])
        out.append('INSERT INTO %s VALUES\n  %s;' % (name, rows))
    return '\n\n'.join(out) + '\n'


# ----------------------------------------------------------------------------------------------------------------------------------
# The big data: made by arithmetic, so that DuckDB, PostgreSQL and SQLite hold the same rows.
#   big_customers  3,000 rows        big_orders  30,000 rows        big_items  90,000 rows (three lines for every order)
# ----------------------------------------------------------------------------------------------------------------------------------
BIG_ORDERS = 30000
BIG_CUSTOMERS = 3000
BIG_PRICE = "CASE product_id WHEN 1 THEN 3.50 WHEN 2 THEN 4.50 WHEN 3 THEN 5.00 WHEN 4 THEN 14.00 WHEN 5 THEN 12.00 ELSE 5.50 END"
BIG_STATUS = "CASE WHEN i % 20 = 0 THEN 'cancelled' WHEN i % 25 = 0 THEN 'refunded' WHEN i % 97 = 0 THEN 'pending' ELSE 'paid' END"
BIG_COUNTRY = "CASE i % 4 WHEN 0 THEN 'SG' WHEN 1 THEN 'MY' WHEN 2 THEN 'ID' ELSE 'AU' END"
BIG_TIER = "CASE i % 3 WHEN 0 THEN 'gold' WHEN 1 THEN 'silver' ELSE 'bronze' END"


def big_script(engine):
    if engine in ('duckdb', 'postgres'):
        series = lambda n, a='i': 'generate_series(1, %d) AS g(%s)' % (n, a)
        day = lambda e: "DATE '2025-10-01' + (%s)::INTEGER" % e
        ts = lambda e: "TIMESTAMP '2026-01-01 00:00:00' + (%s) * INTERVAL '1 second'" % e
        cust = ("CREATE TABLE big_customers AS\nSELECT i AS customer_id, %s AS country, %s AS tier, %s AS signup_date\nFROM %s;"
                % (BIG_COUNTRY, BIG_TIER, day('(i * 37) % 150'), series(BIG_CUSTOMERS)))
        items = ("CREATE TABLE big_items AS\nSELECT order_id, line_no, product_id, qty, %s AS unit_price\nFROM (\n"
                 "  SELECT i AS order_id, l AS line_no, 1 + ((i * 3 + l) %% 6) AS product_id, 1 + ((i + l) %% 3) AS qty\n"
                 "  FROM generate_series(1, %d) AS g(i), generate_series(1, 3) AS h(l)\n) s;" % (BIG_PRICE, BIG_ORDERS))
        orders = ("CREATE TABLE big_orders AS\nSELECT i AS order_id, 1 + ((i * 7919) %% %d) AS customer_id, 1 + ((i * 13) %% 4) AS store_id,\n"
                  "       %s AS order_ts,\n       %s AS status,\n       t.total AS total\nFROM %s\nJOIN (SELECT order_id, sum(qty * unit_price) AS total FROM big_items GROUP BY order_id) t ON t.order_id = g.i;"
                  % (BIG_CUSTOMERS, ts('(i * 4177) % 7776000'), BIG_STATUS, series(BIG_ORDERS)))
        return '\n\n'.join(['-- Made by arithmetic: no random numbers, so every engine holds the same rows.', cust, items, orders]) + '\n'
    # SQLite has no generate_series, so a recursive CTE makes the numbers
    nums = lambda n: 'WITH RECURSIVE g(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM g WHERE i < %d)' % n
    cust = ("CREATE TABLE big_customers AS\n%s\nSELECT i AS customer_id, %s AS country, %s AS tier, date('2025-10-01', '+' || ((i * 37) %% 150) || ' days') AS signup_date\nFROM g;"
            % (nums(BIG_CUSTOMERS), BIG_COUNTRY, BIG_TIER))
    items = ("CREATE TABLE big_items AS\n%s\nSELECT order_id, line_no, product_id, qty, %s AS unit_price\nFROM (\n"
             "  SELECT g.i AS order_id, l.l AS line_no, 1 + ((g.i * 3 + l.l) %% 6) AS product_id, 1 + ((g.i + l.l) %% 3) AS qty\n"
             "  FROM g, (SELECT 1 AS l UNION ALL SELECT 2 UNION ALL SELECT 3) l\n) s;" % (nums(BIG_ORDERS), BIG_PRICE))
    orders = ("CREATE TABLE big_orders AS\n%s\nSELECT i AS order_id, 1 + ((i * 7919) %% %d) AS customer_id, 1 + ((i * 13) %% 4) AS store_id,\n"
              "       datetime('2026-01-01 00:00:00', '+' || ((i * 4177) %% 7776000) || ' seconds') AS order_ts,\n       %s AS status,\n       t.total AS total\n"
              "FROM g\nJOIN (SELECT order_id, sum(qty * unit_price) AS total FROM big_items GROUP BY order_id) t ON t.order_id = g.i;"
              % (nums(BIG_ORDERS), BIG_CUSTOMERS, BIG_STATUS))
    return '\n\n'.join(['-- Made by arithmetic: no random numbers, so every engine holds the same rows.', cust, items, orders]) + '\n'
