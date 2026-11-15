#!/usr/bin/env python3
"""Record what the BI course shows, with tools that run on a laptop. Writes bi/js/real.js.

What is real:   the Brewline star schema in DuckDB and every query result, the Tableau Hyper engine (tableauhyperapi: it is the engine behind a Tableau
                extract) building, querying and appending to a .hyper file, file sizes of the same rows as CSV, Parquet and Hyper, the LookML parser
                `lkml` reading a LookML project, the Tableau Document API reading and changing a .tds data source file, and an HTTP request for a
                Power BI refresh that is built and not sent.
What is not:    Power BI, Tableau Desktop, Tableau Server or Cloud, and Looker. None of them ran. DAX, Tableau calculations and LookML are shown as
                text, and the numbers next to them come from SQL that asks the same question. The course says so on those screens.
Nothing is timed. The data is made up by a fixed rule, so every run writes the same rows.

Usage:  python3 bi/verify/capture_bi.py [--out bi/js/real.js]
Needs:  pip install -r bi/verify/requirements.txt  (duckdb, pyarrow, tableauhyperapi, lkml, tableaudocumentapi, requests)
"""
import argparse
import csv
import datetime as dt
import importlib.metadata as md
import json
import os
import pathlib
import platform
import shutil
import sys
import tempfile

import duckdb

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from world import CATS, END, REGIONS, START, build_world   # noqa: E402
ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def table(key, cols, rows):
    OUT['tables'][key] = {'cols': list(cols), 'rows': json.loads(json.dumps([list(r) for r in rows], default=str))}


def counts(key, d):
    OUT['counts'][key] = json.loads(json.dumps(d, default=str))


def text(key, s):
    OUT['text'][key] = s


def keep_file(rel):
    OUT['files'][rel] = (HERE / rel).read_text()
    return OUT['files'][rel]


def num(x):
    """Money and ratios as plain numbers with two decimals, counts as integers."""
    if isinstance(x, float):
        return round(x, 2)
    if hasattr(x, 'quantize'):                      # Decimal
        return float(round(x, 2))
    return x


def q(con, sql, params=None):
    cur = con.execute(sql, params or {})
    cols = [d[0] for d in cur.description]
    return cols, [[num(v) for v in r] for r in cur.fetchall()]


con = duckdb.connect()
build_world(con)
one = lambda sql, p=None: con.execute(sql, p or {}).fetchone()[0]          # noqa: E731

OUT['meta'] = {
    'company': 'Brewline', 'today': str(END), 'first_day': str(START), 'python': platform.python_version(),
    'duckdb': md.version('duckdb'), 'pyarrow': md.version('pyarrow'), 'tableauhyperapi': md.version('tableauhyperapi'), 'lkml': md.version('lkml'),
    'tableaudocumentapi': md.version('tableaudocumentapi'), 'requests': md.version('requests'),
    'note': 'Recorded by bi/verify/capture_bi.py with DuckDB, the Tableau Hyper engine, the lkml parser and the Tableau Document API on made-up data. '
            'Power BI, Tableau Desktop, Tableau Server and Looker did not run.',
}

# ----------------------------------------------------------------------------------------------------------------------
# 2. The model: tables, grain, a join that multiplies rows
# ----------------------------------------------------------------------------------------------------------------------
grain = {'fact_orders': 'one row for each order', 'fact_order_lines': 'one row for each product on an order', 'dim_store': 'one row for each store',
         'dim_product': 'one row for each product', 'dim_date': 'one row for each day', 'bridge_order_promos': 'one row for each promotion code on an order'}
kind = {'fact_orders': 'fact', 'fact_order_lines': 'fact', 'dim_store': 'dimension', 'dim_product': 'dimension', 'dim_date': 'dimension', 'bridge_order_promos': 'bridge'}
table('model.tables', ['table', 'kind', 'rows', 'grain'], [[t, kind[t], one('SELECT count(*) FROM ' + t), grain[t]] for t in grain])
table('model.orders_sample', *q(con, 'SELECT order_id, order_date, store_id, customer_id, shipping_fee, status FROM fact_orders WHERE order_id BETWEEN 1 AND 4 ORDER BY order_id'))
table('model.lines_sample', *q(con, 'SELECT order_id, line_no, product_id, quantity, unit_price, line_amount FROM fact_order_lines WHERE order_id BETWEEN 1 AND 4 ORDER BY order_id, line_no'))
table('model.stores', *q(con, 'SELECT store_id, city, region FROM dim_store ORDER BY store_id'))
table('model.products', *q(con, 'SELECT product_id, product_name, category, list_price FROM dim_product ORDER BY product_id'))

fan = {}
for name in ('fanout_right', 'fanout_wrong', 'fanout_fixed'):
    cols, rows = q(con, keep_file('sql/%s.sql' % name))
    fan[name] = dict(zip(cols, rows[0]))
table('model.fanout', ['query', 'rows read', 'shipping total', 'what happened'], [
    ['Sum from the orders table', fan['fanout_right']['rows_read'], fan['fanout_right']['shipping_total'], 'right: one row for each order'],
    ['Sum after a join to the lines', fan['fanout_wrong']['rows_read'], fan['fanout_wrong']['shipping_total'], 'wrong: every order is counted once for each line'],
    ['Lines summed to the order first', fan['fanout_fixed']['rows_read'], fan['fanout_fixed']['shipping_total'], 'right: the join is one row to one row'],
])
counts('model.fanout', {
    'orders': fan['fanout_right']['rows_read'], 'lines': fan['fanout_wrong']['rows_read'], 'shipping_right': fan['fanout_right']['shipping_total'],
    'shipping_wrong': fan['fanout_wrong']['shipping_total'], 'shipping_fixed': fan['fanout_fixed']['shipping_total'],
    'times_too_high': round(fan['fanout_wrong']['shipping_total'] / fan['fanout_right']['shipping_total'], 2),
    'lines_per_order': round(fan['fanout_wrong']['rows_read'] / fan['fanout_right']['rows_read'], 2),
    'revenue_total': fan['fanout_fixed']['revenue_total'],
    'max_lines_on_an_order': one('SELECT max(n) FROM (SELECT count(*) n FROM fact_order_lines GROUP BY order_id)'),
})
# the lab: four small orders that a person can check by hand
table('model.lab_orders', *q(con, 'SELECT order_id, shipping_fee FROM fact_orders WHERE order_id BETWEEN 1 AND 4 ORDER BY order_id'))
table('model.lab_lines', *q(con, 'SELECT order_id, line_no, line_amount FROM fact_order_lines WHERE order_id BETWEEN 1 AND 4 ORDER BY order_id, line_no'))

cols, rows = q(con, keep_file('sql/m2m.sql'))
table('model.m2m', cols, rows)
counts('model.m2m', {
    'revenue_summed_over_codes': round(sum(r[2] for r in rows), 2),
    'revenue_of_orders_with_a_code': num(one('SELECT sum(line_amount) FROM fact_order_lines WHERE order_id IN (SELECT order_id FROM bridge_order_promos)')),
    'orders_with_a_code': one('SELECT count(DISTINCT order_id) FROM bridge_order_promos'),
    'orders_with_two_codes': one('SELECT count(*) FROM (SELECT order_id FROM bridge_order_promos GROUP BY order_id HAVING count(*) = 2)'),
    'orders_summed_over_codes': sum(r[1] for r in rows),
})
# keys: is the "one" side of each relationship really unique?
rel = []
for child, col, parent in (('fact_order_lines', 'order_id', 'fact_orders'), ('fact_orders', 'store_id', 'dim_store'), ('fact_order_lines', 'product_id', 'dim_product'),
                           ('fact_orders', 'order_date', 'dim_date')):
    pcol = 'date' if parent == 'dim_date' else col
    dup = one('SELECT count(*) FROM (SELECT %s FROM %s GROUP BY 1 HAVING count(*) > 1)' % (pcol, parent))
    orphan = one('SELECT count(*) FROM %s c WHERE NOT EXISTS (SELECT 1 FROM %s p WHERE p.%s = c.%s)' % (child, parent, pcol, col))
    rel.append([child + '.' + col, parent + '.' + pcol, 'many to one', dup, orphan])
table('model.relationships', ['from (many)', 'to (one)', 'cardinality', 'duplicate keys on the one side', 'rows with no match'], rel)

# ----------------------------------------------------------------------------------------------------------------------
# 3. A tile, and the measures behind it
# ----------------------------------------------------------------------------------------------------------------------
TILE = keep_file('sql/tile.sql')
tile_cols, tile_rows = q(con, TILE)
table('tile.region_month', tile_cols, tile_rows)

BASE = ("FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id JOIN dim_store s ON s.store_id = o.store_id "
        "JOIN dim_product p ON p.product_id = l.product_id WHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'")
ctx = []
for label, where in (('March 2026, no other filter', ''), ('Region = North', " AND s.region = 'North'"), ('Region = North, category = Coffee', " AND s.region = 'North' AND p.category = 'Coffee'"),
                     ('Category = Equipment', " AND p.category = 'Equipment'"), ('Store = s01', " AND o.store_id = 's01'")):
    r = con.execute('SELECT sum(l.line_amount), count(DISTINCT o.order_id), count(DISTINCT o.customer_id) ' + BASE + where).fetchone()
    ctx.append([label, num(r[0]), r[1], round(float(r[0]) / r[1], 2), r[2]])
table('measures.context', ['filters on the report', 'Revenue', 'Orders', 'Average order value', 'Customers'], ctx)
# every combination that the lab offers: region x category for March 2026
lab = []
for region in ['All'] + REGIONS:
    for cat in ['All'] + CATS:
        w = ('' if region == 'All' else " AND s.region = '%s'" % region) + ('' if cat == 'All' else " AND p.category = '%s'" % cat)
        r = con.execute('SELECT sum(l.line_amount), count(DISTINCT o.order_id), count(DISTINCT o.customer_id) ' + BASE + w).fetchone()
        lab.append([region, cat, num(r[0]), r[1], r[2]])
table('measures.lab', ['region', 'category', 'revenue', 'orders', 'customers'], lab)

table('measures.share', *q(con, keep_file('sql/share.sql')))
cols, rows = q(con, keep_file('sql/aov.sql'))
counts('measures.aov', dict(zip(cols, rows[0])))
table('measures.aov_by_store', *q(con, "SELECT o.store_id, sum(l.line_amount) AS revenue, count(DISTINCT o.order_id) AS orders, round(sum(l.line_amount) / count(DISTINCT o.order_id), 2) AS average_order_value "
                                       "FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id WHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01' GROUP BY o.store_id ORDER BY o.store_id"))
cols, rows = q(con, keep_file('sql/distinct.sql'))
table('measures.distinct', cols, rows)
counts('measures.distinct', {
    'sum_of_the_months': sum(r[1] for r in rows),
    'quarter': one("SELECT count(DISTINCT customer_id) FROM fact_orders WHERE order_date >= DATE '2026-01-01' AND order_date < DATE '2026-04-01'"),
})
table('measures.ytd', *q(con, keep_file('sql/ytd.sql')))
table('measures.cohort', *q(con, keep_file('sql/cohort.sql')))
counts('measures.cohort', {'customers_who_ordered': one('SELECT count(DISTINCT customer_id) FROM fact_orders')})

# ----------------------------------------------------------------------------------------------------------------------
# 4. An extract: the same rows as CSV, Parquet and a Tableau .hyper file, and what an append misses
# ----------------------------------------------------------------------------------------------------------------------
from tableauhyperapi import Connection, CreateMode   # noqa: E402

sys.path.insert(0, str(HERE / 'tableau'))
import build_extract   # noqa: E402
import switch_connection   # noqa: E402

work = pathlib.Path(tempfile.mkdtemp(prefix='bi-capture-'))
WIDE = ("SELECT l.order_id, l.line_no, o.order_date, o.store_id, s.region, o.customer_id, l.product_id, p.category, l.quantity, l.line_amount, o.status "
        "FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id JOIN dim_store s ON s.store_id = o.store_id JOIN dim_product p ON p.product_id = l.product_id")
CUT = dt.date(2026, 3, 30)                                        # the first extract holds everything up to this day; the last day arrives later
con.execute("COPY (%s WHERE o.order_date <= DATE '%s' ORDER BY 1, 2) TO '%s' (FORMAT csv, HEADER)" % (WIDE, CUT, work / 'sales.csv'))
con.execute("COPY (%s WHERE o.order_date <= DATE '%s' ORDER BY 1, 2) TO '%s' (FORMAT parquet)" % (WIDE, CUT, work / 'sales.parquet'))
con.execute("COPY (%s WHERE o.order_date > DATE '%s' ORDER BY 1, 2) TO '%s' (FORMAT csv, HEADER)" % (WIDE, CUT, work / 'new_day.csv'))
rows_first = one("SELECT count(*) FROM read_parquet('%s')" % (work / 'sales.parquet'))
rows_new = one("SELECT count(*) FROM read_csv('%s')" % (work / 'new_day.csv'))

keep_file('build_extract.py')
HYPER_TILE = ("SELECT region, to_char(order_date, 'YYYY-MM') AS month, CAST(round(CAST(sum(line_amount) AS numeric(18, 2)), 2) AS double precision) AS revenue FROM sales "
              "WHERE order_date >= DATE '2026-01-01' AND order_date < DATE '2026-04-01' GROUP BY 1, 2 ORDER BY 1, 2")
hyper_path = work / 'sales.hyper'
with build_extract.start(str(work)) as hp:
    loaded = build_extract.build(hp, str(work / 'sales.csv'), str(hyper_path))
    with Connection(hp.endpoint, str(hyper_path), CreateMode.NONE) as hc:
        hyper_rows = hc.execute_scalar_query('SELECT count(*) FROM sales')
        before_tile = [[r[0], r[1], round(r[2], 2)] for r in hc.execute_list_query(HYPER_TILE)]
        max_before = hc.execute_scalar_query('SELECT max(order_date) FROM sales')
    size_first = hyper_path.stat().st_size
    # the last day arrives. In the source, one old order is also refunded on that day: its status changes and its updated_at moves.
    LATE_ID = one("SELECT min(order_id) FROM fact_orders WHERE order_date = DATE '2025-11-17' AND status = 'completed'")
    late_amount = num(one('SELECT sum(line_amount) FROM fact_order_lines WHERE order_id = %d' % LATE_ID))
    con.execute("UPDATE fact_orders SET status = 'refunded', updated_at = TIMESTAMP '2026-03-31 09:15:00' WHERE order_id = %d" % LATE_ID)
    appended = build_extract.append(hp, str(work / 'new_day.csv'), str(hyper_path))
    with Connection(hp.endpoint, str(hyper_path), CreateMode.NONE) as hc:
        after_rows = hc.execute_scalar_query('SELECT count(*) FROM sales')
        after_tile = [[r[0], r[1], round(r[2], 2)] for r in hc.execute_list_query(HYPER_TILE)]
        completed_extract = hc.execute_scalar_query("SELECT CAST(round(CAST(sum(line_amount) AS numeric(18, 2)), 2) AS double precision) FROM sales WHERE status = 'completed'")
        late_status_in_extract = hc.execute_scalar_query('SELECT min(status) FROM sales WHERE order_id = %d' % LATE_ID)
    size_after = hyper_path.stat().st_size

tile_now_cols, tile_now = q(con, TILE)
completed_source = num(one("SELECT sum(l.line_amount) FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id WHERE o.status = 'completed'"))
table('hyper.sizes', ['file', 'format', 'rows', 'bytes'], [
    ['sales.csv', 'CSV, text', rows_first, (work / 'sales.csv').stat().st_size],
    ['sales.parquet', 'Parquet, columns, compressed', rows_first, (work / 'sales.parquet').stat().st_size],
    ['sales.hyper', 'Tableau extract, columns', hyper_rows, size_first],
])
counts('hyper.build', {'rows_loaded': loaded, 'rows_in_extract': hyper_rows, 'newest_day_in_extract': str(max_before), 'columns': 11,
                       'tile_matches_duckdb_before_the_last_day': before_tile == [[r[0], r[1], r[2]] for r in q(con, TILE.replace("DATE '2026-04-01'", "DATE '2026-03-31'"))[1]]})
table('hyper.tile', ['region', 'month', 'revenue'], after_tile)
counts('hyper.append', {
    'rows_before': hyper_rows, 'rows_appended': appended, 'rows_after': after_rows, 'rows_in_source': one('SELECT count(*) FROM fact_order_lines'),
    'tile_matches_duckdb_after_append': after_tile == tile_now, 'bytes_before': size_first, 'bytes_after': size_after,
    'late_order_id': LATE_ID, 'late_order_date': '2025-11-17', 'late_order_amount': late_amount, 'late_order_status_in_source': 'refunded', 'late_order_status_in_extract': late_status_in_extract,
    'completed_revenue_in_source': completed_source, 'completed_revenue_in_extract': completed_extract, 'difference': round(completed_extract - completed_source, 2),
})
OUT['files']['hyper/tile.sql'] = HYPER_TILE

# ----------------------------------------------------------------------------------------------------------------------
# 5. Refresh: partitions by month, a policy, and the change that the policy does not see
# ----------------------------------------------------------------------------------------------------------------------
# An imported model is a copy. Rebuild the copy as it was before today's refresh: the source without the late refund and without the last day.
con.execute("CREATE OR REPLACE TABLE imported AS SELECT l.*, o.status FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id WHERE l.order_date <= DATE '%s'" % CUT)
con.execute("UPDATE imported SET status = 'completed' WHERE order_id = %d" % LATE_ID)
months = [r[0] for r in con.execute("SELECT DISTINCT strftime(order_date, '%Y-%m') FROM fact_order_lines ORDER BY 1").fetchall()]
POLICY = {'keep_months': 12, 'refresh_months': 2}
refresh_set = months[-POLICY['refresh_months']:]
keep_set = months[-POLICY['keep_months']:]
src = "SELECT l.*, o.status FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id"
part = []
for m in months:
    n_src = one("SELECT count(*) FROM fact_order_lines WHERE strftime(order_date, '%Y-%m') = '" + m + "'")
    changed = one("SELECT count(*) FROM fact_orders WHERE strftime(order_date, '%Y-%m') = '" + m + "' AND updated_at >= TIMESTAMP '2026-03-31 00:00:00'")
    part.append([m, n_src, 'kept' if m in keep_set else 'dropped', 'refreshed' if m in refresh_set else 'not touched', changed])
table('refresh.partitions', ['month', 'rows in the source', 'in the model', 'by the policy', 'orders changed today'], part)
full_rows = one('SELECT count(*) FROM fact_order_lines')
inc_rows = sum(p[1] for p in part if p[0] in refresh_set)
# run the incremental refresh for real: replace the two newest months of the copy with what the source has now
for m in refresh_set:
    con.execute("DELETE FROM imported WHERE strftime(order_date, '%Y-%m') = '" + m + "'")
    con.execute("INSERT INTO imported " + src + " WHERE strftime(l.order_date, '%Y-%m') = '" + m + "'")
model_completed = num(one("SELECT sum(line_amount) FROM imported WHERE status = 'completed'"))
# ask the source which months hold a change made today, and refresh those partitions by name. That finds the month of the late refund too.
detect = [p[0] for p in part if p[4] > 0]
for m in detect:
    con.execute("DELETE FROM imported WHERE strftime(order_date, '%Y-%m') = '" + m + "'")
    con.execute("INSERT INTO imported " + src + " WHERE strftime(l.order_date, '%Y-%m') = '" + m + "'")
model_completed_detect = num(one("SELECT sum(line_amount) FROM imported WHERE status = 'completed'"))
counts('refresh.policy', {
    'keep_months': POLICY['keep_months'], 'refresh_months': POLICY['refresh_months'], 'months_in_source': len(months), 'months_refreshed': refresh_set,
    'rows_full_refresh': full_rows, 'rows_incremental_refresh': inc_rows, 'percent_of_full': round(100.0 * inc_rows / full_rows, 1),
    'completed_revenue_source': completed_source, 'completed_revenue_model_after_incremental': model_completed,
    'difference_after_incremental': round(model_completed - completed_source, 2), 'late_order_month': '2025-11', 'late_order_amount': late_amount,
    'months_with_changes_today': detect, 'completed_revenue_model_after_refreshing_changed_months': model_completed_detect,
    'difference_after_refreshing_changed_months': round(model_completed_detect - completed_source, 2),
    'rows_refreshing_changed_months': sum(p[1] for p in part if p[0] in detect),
})

# ----------------------------------------------------------------------------------------------------------------------
# 6. Performance: an aggregate table, what it cannot answer, and which columns cost space
# ----------------------------------------------------------------------------------------------------------------------
con.execute(keep_file('sql/agg_build.sql'))
agg_cols, agg_tile = q(con, keep_file('sql/tile_from_agg.sql'))
agg_rows = one('SELECT count(*) FROM agg_day_store_category')
sum_daily = one("SELECT sum(c) FROM (SELECT order_date, sum(customers_that_day) c FROM agg_day_store_category WHERE order_date >= DATE '2026-03-01' GROUP BY 1)")
true_month = one("SELECT count(DISTINCT customer_id) FROM fact_orders WHERE order_date >= DATE '2026-03-01'")
table('perf.tables', ['table', 'rows', 'grain'], [
    ['fact_order_lines', full_rows, 'one row for each product on an order'],
    ['agg_day_store_category', agg_rows, 'one row for each day, store and category'],
])
counts('perf.agg', {
    'fact_rows': full_rows, 'agg_rows': agg_rows, 'times_fewer_rows': round(full_rows / agg_rows, 1), 'tile_same_numbers': agg_tile == tile_now,
    'days': one('SELECT count(*) FROM dim_date'), 'stores': 12, 'categories': 4, 'most_rows_possible': one('SELECT count(*) FROM dim_date') * 12 * 4,
    'customers_march_true': true_month, 'customers_march_summed_from_agg': sum_daily,
})
table('perf.can_answer', ['question on the dashboard', 'aggregate table', 'why'], [
    ['Revenue by region and month', 'yes', 'region comes from the store, month from the day, and revenue adds up'],
    ['Units by category and week', 'yes', 'both columns are in the grain, and units add up'],
    ['Revenue by product', 'no', 'the product was summed away: only the category is left'],
    ['Customers who ordered in March', 'no', 'a distinct count does not add up over days and stores'],
    ['Average order value by store', 'yes', 'revenue and orders both add up over days when an order belongs to one day and one store. Divide after you sum'],
])
con.execute("COPY (%s ORDER BY 1, 2) TO '%s' (FORMAT parquet)" % (WIDE, work / 'wide.parquet'))
colsz = con.execute("SELECT path_in_schema, sum(total_compressed_size) AS bytes FROM parquet_metadata('%s') GROUP BY 1 ORDER BY 2 DESC" % (work / 'wide.parquet')).fetchall()
card = {c: one('SELECT count(DISTINCT %s) FROM (%s)' % (c, WIDE)) for c, _ in colsz}
tot = sum(b for _, b in colsz)
table('perf.columns', ['column', 'different values', 'bytes in the Parquet file', 'share of the file'], [[c, card[c], b, '%.1f %%' % (100.0 * b / tot)] for c, b in colsz])
counts('perf.columns', {'total_bytes': tot, 'top_two': [colsz[0][0], colsz[1][0]], 'top_two_share_pct': round(100.0 * (colsz[0][1] + colsz[1][1]) / tot, 1), 'rows': full_rows})

# what six tiles of one page ask for: one query each when the model is live
TILES = [
    ('Revenue by region and month', 'agg'), ('Units by category', 'agg'), ('Revenue today against yesterday', 'agg'), ('Top 10 products', 'fact'),
    ('Customers this month', 'fact'), ('Average order value by store', 'agg'),
]
table('perf.page', ['tile', 'smallest table that can answer it', 'rows in that table'], [[t, 'agg_day_store_category' if k == 'agg' else 'fact_order_lines', agg_rows if k == 'agg' else full_rows] for t, k in TILES])
counts('perf.page', {'tiles': len(TILES), 'queries_live': len(TILES), 'rows_read_all_from_fact': len(TILES) * full_rows,
                     'rows_read_with_aggregate': sum(agg_rows if k == 'agg' else full_rows for _, k in TILES), 'viewers_in_the_example': 40})

# ----------------------------------------------------------------------------------------------------------------------
# 7. Row-level security
# ----------------------------------------------------------------------------------------------------------------------
RLS = keep_file('sql/rls.sql')
users = con.execute('SELECT email, job, sees_all FROM bi_users ORDER BY email').fetchall()
rls = []
for email, job, sees_all in users:
    regions = [r[0] for r in con.execute('SELECT region FROM bi_user_regions WHERE email = $email ORDER BY 1', {'email': email}).fetchall()]
    r = con.execute(RLS, {'email': email}).fetchone()
    rls.append([email.split('@')[0], job, 'all regions' if sees_all else (', '.join(regions) or 'none'), r[0], num(r[1]) if r[1] is not None else 0])
table('rls.users', ['user', 'job', 'regions', 'order lines visible', 'revenue visible'], rls)
by_region = dict((r[0], r[1]) for r in q(con, "SELECT s.region, sum(l.line_amount) " + BASE + " GROUP BY 1 ORDER BY 1")[1])
table('rls.by_region', ['region', 'revenue in March 2026'], [[k, v] for k, v in by_region.items()])
counts('rls.summary', {'users': len(users), 'march_revenue_all': ctx[0][1], 'march_lines_all': one("SELECT count(*) FROM fact_order_lines WHERE order_date >= DATE '2026-03-01'"),
                       'unknown_user_lines': con.execute(RLS, {'email': 'nobody@brewline.example'}).fetchone()[0]})

# ----------------------------------------------------------------------------------------------------------------------
# 8. The model as files: LookML read by a parser, a Tableau data source changed by a script, a refresh request that is not sent
# ----------------------------------------------------------------------------------------------------------------------
import lkml   # noqa: E402

views, fields = {}, []
for f in sorted((HERE / 'lookml' / 'views').glob('*.view.lkml')):
    parsed = lkml.load(keep_file('lookml/views/' + f.name))
    for v in parsed['views']:
        views[v['name']] = v
        for kind_, key in (('dimension', 'dimensions'), ('dimension group', 'dimension_groups'), ('measure', 'measures')):
            for d in v.get(key, []):
                fields.append([v['name'], kind_, d['name'], d.get('type', ''), 'yes' if d.get('primary_key') == 'yes' else '', 'yes' if d.get('hidden') == 'yes' else ''])
table('lookml.fields', ['view', 'kind', 'name', 'type', 'primary key', 'hidden'], fields)
model = lkml.load(keep_file('lookml/brewline.model.lkml'))
ex = model['explores'][0]
import re   # noqa: E402

TABLE_OF = {'order_lines': 'fact_order_lines', 'orders': 'fact_orders', 'stores': 'dim_store', 'products': 'dim_product'}
joins = []
for j in ex['joins']:
    m = re.match(r'\$\{(\w+)\.(\w+)\} = \$\{(\w+)\.(\w+)\}', j['sql_on'].strip())
    left_view, left_col, right_view, right_col = m.groups()
    dup = one('SELECT count(*) FROM (SELECT %s FROM %s GROUP BY 1 HAVING count(*) > 1)' % (right_col, TABLE_OF[right_view]))
    joins.append([j['name'], j['type'], j['relationship'], '%s.%s = %s.%s' % (left_view, left_col, right_view, right_col), 'yes' if dup == 0 else 'no: %d keys repeat' % dup])
table('lookml.joins', ['join', 'type', 'relationship in the file', 'on', 'the joined view has one row for each key'], joins)
# every ${TABLE}.column in the views must be a column of the table in the warehouse
missing = []
for vn, v in views.items():
    have = {r[0] for r in con.execute("SELECT column_name FROM information_schema.columns WHERE table_name = '%s'" % TABLE_OF[vn]).fetchall()}
    for key in ('dimensions', 'dimension_groups', 'measures'):
        for d in v.get(key, []):
            for c in re.findall(r'\$\{TABLE\}\.(\w+)', d.get('sql', '')):
                if c not in have:
                    missing.append('%s.%s uses %s' % (vn, d['name'], c))
counts('lookml.summary', {
    'views': len(views), 'dimensions': sum(1 for f in fields if f[1] == 'dimension'), 'dimension_groups': sum(1 for f in fields if f[1] == 'dimension group'),
    'measures': sum(1 for f in fields if f[1] == 'measure'), 'explores': len(model['explores']), 'joins': len(joins), 'connection': model['connection'],
    'datagroup': model['datagroups'][0]['name'], 'datagroup_max_cache_age': model['datagroups'][0]['max_cache_age'], 'columns_not_in_the_warehouse': missing,
    'access_filter_field': ex['access_filters'][0]['field'], 'access_filter_user_attribute': ex['access_filters'][0]['user_attribute'], 'primary_keys': sum(1 for f in fields if f[4] == 'yes'),
})
try:
    lkml.load(keep_file('lookml/broken.view.lkml'))
    text('lookml.broken_error', 'no error')
except Exception as e:      # noqa: BLE001
    text('lookml.broken_error', '%s: %s' % (type(e).__name__, str(e).strip()))

from tableaudocumentapi import Datasource   # noqa: E402

TDS = keep_file('tableau/brewline_sales.tds')
keep_file('tableau/switch_connection.py')
shutil.copy(HERE / 'tableau' / 'brewline_sales.tds', work / 'dev.tds')
ds = Datasource.from_file(str(work / 'dev.tds'))
before = [[c.dbclass, c.server, c.dbname, c.username] for c in ds.connections]
flds = sorted([[f.caption or f.name, f.datatype, f.role, f.calculation or ''] for f in ds.fields.values()], key=lambda r: (r[2], r[0]))
switch_connection.switch(str(work / 'dev.tds'), str(work / 'prod.tds'), 'warehouse.brewline.example', 'analytics')
ds2 = Datasource.from_file(str(work / 'prod.tds'))
after = [[c.dbclass, c.server, c.dbname, c.username] for c in ds2.connections]
table('tableau.connections', ['file', 'class', 'server', 'database', 'user'], [['dev.tds'] + before[0], ['prod.tds'] + after[0]])
table('tableau.fields', ['field', 'data type', 'role', 'calculation'], flds)
import xml.etree.ElementTree as ET   # noqa: E402


def attrs(path):
    out = {}
    for i, el in enumerate(ET.parse(path).getroot().iter()):
        for k, v in el.attrib.items():
            out['%d:%s@%s' % (i, el.tag, k)] = v
    return out


a0, a1 = attrs(work / 'dev.tds'), attrs(work / 'prod.tds')
changed = sorted(k.split(':', 1)[1] for k in a0 if a0[k] != a1.get(k))
caption_after = [el.attrib.get('caption') for el in ET.parse(work / 'prod.tds').getroot().iter('named-connection')][0]
counts('tableau.change', {'attributes_changed': changed, 'attributes_in_the_file': len(a0), 'caption_of_the_connection_after': caption_after, 'fields': len(flds), 'calculated_fields': sum(1 for f in flds if f[3]), 'has_password': 'password' in TDS.lower().replace('username-password', '')})

keep_file('powerbi/fact_order_lines.tmdl')
import requests   # noqa: E402

req = requests.Request('POST', 'https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/refreshes',
                       headers={'Authorization': 'Bearer <token from Microsoft Entra ID>', 'Content-Type': 'application/json'},
                       json={'type': 'full', 'commitMode': 'transactional', 'objects': [{'table': 'fact_order_lines', 'partition': '2025-11'}], 'retryCount': 2}).prepare()
text('powerbi.refresh_request', '%s %s\n%s\n\n%s' % (req.method, requests.utils.unquote(req.url), '\n'.join('%s: %s' % (k, v) for k, v in req.headers.items() if k != 'Content-Length'),
                                                    json.dumps(json.loads(req.body), indent=2)))
counts('powerbi.refresh_request', {'method': req.method, 'sent': False, 'body_keys': sorted(json.loads(req.body).keys())})
for f in sorted((HERE / 'sql').glob('*.sql')):
    keep_file('sql/' + f.name)

shutil.rmtree(work, ignore_errors=True)
pathlib.Path(args.out).write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(OUT, indent=1, sort_keys=True) + ';\n')
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(OUT['files']), len(OUT['text']), len(OUT['tables']), len(OUT['counts'])))
