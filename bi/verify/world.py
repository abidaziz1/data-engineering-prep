"""The made-up Brewline data: a star schema built by a fixed rule, so that every run on every machine writes the same rows.
Used by capture_bi.py (the recorder) and verify_bi.py (the checks)."""
import datetime as dt

import pyarrow as pa


class Lcg:
    """A tiny generator of numbers, so that the data is the same on every machine and in every version of Python."""
    def __init__(self, seed):
        self.s = seed

    def next(self, n):
        self.s = (self.s * 1103515245 + 12345) % 2147483648
        return (self.s >> 8) % n


START, END = dt.date(2025, 1, 1), dt.date(2026, 3, 31)          # the last day of the data is "today" in the course
REGIONS = ['North', 'South', 'East', 'West']
CITIES = ['Leeds', 'York', 'Hull', 'Bath', 'Exeter', 'Dover', 'Ely', 'Luton', 'Derby', 'Stoke', 'Ludlow', 'Truro']
STORES = [('s%02d' % (i + 1), CITIES[i], REGIONS[i // 3]) for i in range(12)]
CATS = ['Coffee', 'Tea', 'Equipment', 'Merch']
PRODUCTS = [(i + 1, '%s %d' % (CATS[i % 4], i // 4 + 1), CATS[i % 4], [9.5, 6.0, 42.0, 15.0][i % 4] + (i // 4) * [1.5, 1.0, 12.0, 2.5][i % 4]) for i in range(20)]
PROMOS = ['SPRING', 'LOYAL', 'FIRST', 'BUNDLE', 'STAFF']
N_CUSTOMERS = 2000


def build_world(con):
    g = Lcg(20260331)
    orders, lines, promos = [], [], []
    oid = 0
    day = START
    k = 0
    while day <= END:
        n = 100 + (18 if day.weekday() >= 5 else 0) + (k % 7) * 3 + (k // 30) * 2
        for _ in range(n):
            oid += 1
            r = g.next(100)
            store = STORES[0][0] if r < 22 else STORES[1 + g.next(11)][0]          # s01 sells about a fifth of the orders
            cust = 1 + g.next(min(N_CUSTOMERS, 500 + k * 4))                       # new customers keep arriving: the pool grows by four a day
            fee = [0.0, 2.5, 4.0][g.next(3)]
            status = 'refunded' if g.next(100) < 3 else 'completed'
            orders.append((oid, day, store, cust, fee, status, dt.datetime.combine(day, dt.time(12, 0))))
            for ln in range(1, 2 + g.next(3) + (1 if g.next(10) == 0 else 0)):
                p = PRODUCTS[g.next(20)]
                qty = 1 + g.next(3)
                lines.append((oid, ln, day, p[0], qty, p[3], round(qty * p[3], 2)))
            pr = g.next(100)
            if pr < 20:
                promos.append((oid, PROMOS[g.next(5)]))
            elif pr < 25:
                a = g.next(5)
                promos.append((oid, PROMOS[a]))
                promos.append((oid, PROMOS[(a + 1 + g.next(4)) % 5]))
        day += dt.timedelta(days=1)
        k += 1

    def reg(name, cols, rows, types):
        con.register('t_' + name, pa.table({c: pa.array([r[i] for r in rows], type=types[i]) for i, c in enumerate(cols)}))
        con.execute('CREATE OR REPLACE TABLE %s AS SELECT * FROM t_%s' % (name, name))
        con.unregister('t_' + name)

    reg('dim_store', ['store_id', 'city', 'region'], STORES, [pa.string(), pa.string(), pa.string()])
    reg('dim_product', ['product_id', 'product_name', 'category', 'list_price'], PRODUCTS, [pa.int32(), pa.string(), pa.string(), pa.float64()])
    reg('fact_orders', ['order_id', 'order_date', 'store_id', 'customer_id', 'shipping_fee', 'status', 'updated_at'], orders,
        [pa.int32(), pa.date32(), pa.string(), pa.int32(), pa.float64(), pa.string(), pa.timestamp('s')])
    reg('fact_order_lines', ['order_id', 'line_no', 'order_date', 'product_id', 'quantity', 'unit_price', 'line_amount'], lines,
        [pa.int32(), pa.int32(), pa.date32(), pa.int32(), pa.int32(), pa.float64(), pa.float64()])
    reg('bridge_order_promos', ['order_id', 'promo_code'], promos, [pa.int32(), pa.string()])
    con.execute("CREATE OR REPLACE TABLE dim_date AS SELECT d::DATE AS date, year(d) AS year, strftime(d, '%Y-%m') AS month, quarter(d) AS quarter "
                "FROM generate_series(DATE '2025-01-01', DATE '2026-03-31', INTERVAL 1 DAY) t(d)")
    # who may see what: the table behind row-level security
    con.execute("CREATE OR REPLACE TABLE bi_users AS SELECT * FROM (VALUES ('ana@brewline.example', 'Regional manager', false), ('ben@brewline.example', 'Regional manager', false), "
                "('cho@brewline.example', 'Area lead', false), ('dee@brewline.example', 'Head of sales', true), ('eli@brewline.example', 'New analyst', false)) t(email, job, sees_all)")
    con.execute("CREATE OR REPLACE TABLE bi_user_regions AS SELECT * FROM (VALUES ('ana@brewline.example', 'North'), ('ben@brewline.example', 'South'), "
                "('cho@brewline.example', 'East'), ('cho@brewline.example', 'West')) t(email, region)")
