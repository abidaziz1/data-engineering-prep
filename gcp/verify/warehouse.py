"""A small stand-in for BigQuery, for the lessons. BigQuery itself was not reachable where this ran.

What is real here: sqlglot reads the BigQuery SQL and writes DuckDB SQL, and DuckDB runs it. The SQL logic (QUALIFY, MERGE, UNNEST, windows) behaves the same.
What is not BigQuery: the engine, the time it takes, the plan, the slots, and the bytes. Bytes are an ESTIMATE made by estimate() below from the sizes
that the BigQuery documentation gives for each data type. Only a dry run in BigQuery gives the number that you will be billed.
"""
import datetime as dt
import hashlib

import duckdb
import pyarrow as pa
import sqlglot
from sqlglot import exp

PROJECT = 'brewline-dev'
FIXED_SIZES = {'INT64': 8, 'FLOAT64': 8, 'NUMERIC': 16, 'BOOL': 1, 'DATE': 8, 'DATETIME': 8, 'TIME': 8, 'TIMESTAMP': 8}   # logical bytes per value, from the pricing page
MIB = 1024 * 1024
TIB = 1024 ** 4
EXAMPLE_PRICE_PER_TIB = 6.25          # an example rate in US dollars, not a quote


def _fingerprint(s):
    """A STAND-IN for FARM_FINGERPRINT: stable per key, a signed 64 bit integer, but not the same numbers that BigQuery gives."""
    if s is None:
        return None
    h = int.from_bytes(hashlib.blake2b(s.encode('utf-8'), digest_size=8).digest(), 'big', signed=True)
    return h


class Warehouse:
    def __init__(self):
        self.con = duckdb.connect()
        self.con.execute("SET TimeZone = 'UTC'")
        self.con.execute('ATTACH \':memory:\' AS "%s"' % PROJECT)
        for ds in ('raw', 'staging', 'curated'):
            self.con.execute('CREATE SCHEMA "%s".%s' % (PROJECT, ds))
        self.con.execute('USE "%s".curated' % PROJECT)
        self.con.create_function('farm_fingerprint', _fingerprint, [duckdb.sqltypes.VARCHAR], duckdb.sqltypes.BIGINT, null_handling='special')

    def load(self, dataset, name, rows):
        """Create dataset.name from a list of dicts (datetimes are UTC timestamps, lists of dicts become ARRAY<STRUCT>)."""
        tbl = pa.Table.from_pylist(rows)
        fields = []
        for f in tbl.schema:
            if pa.types.is_timestamp(f.type):
                f = pa.field(f.name, pa.timestamp('us', tz='UTC'))
            fields.append(f)
        tbl = pa.Table.from_pylist(rows, schema=pa.schema(fields))
        self.con.register('_tmp_load', tbl)
        self.con.execute('CREATE OR REPLACE TABLE "%s".%s.%s AS SELECT * FROM _tmp_load' % (PROJECT, dataset, name))
        self.con.unregister('_tmp_load')

    @staticmethod
    def translate(sql):
        """BigQuery SQL in, DuckDB SQL out (one string per statement)."""
        return sqlglot.transpile(sql, read='bigquery', write='duckdb')

    def run(self, sql):
        """Run every statement; return (columns, rows) of the last one that gives rows, or (['rows_affected'], [[n]])."""
        last = (['rows_affected'], [[0]])
        for stmt in self.translate(sql):
            cur = self.con.execute(stmt)
            if cur.description:
                last = ([d[0] for d in cur.description], [list(r) for r in cur.fetchall()])
            else:
                last = (['rows_affected'], [[0]])
        return last

    def scalar(self, sql):
        return self.run(sql)[1][0][0]


# ---------------------------------------------------------------------------------------------------------------------------------------------------
# An estimate of the bytes that a query reads, with the sizes of the data types from the documentation
# ---------------------------------------------------------------------------------------------------------------------------------------------------
ORDERS_SCHEMA = [('order_id', 'INT64'), ('store_id', 'STRING'), ('customer_id', 'STRING'), ('order_ts', 'TIMESTAMP'), ('status', 'STRING'), ('channel', 'STRING'),
                 ('total_cents', 'INT64'), ('items.sku', 'STRING'), ('items.qty', 'INT64'), ('items.unit_cents', 'INT64')]


def leaf_size_sql(col, typ):
    """SQL that adds up the logical bytes of one column in DuckDB: a NULL is 0 bytes, a STRING is 2 bytes plus its UTF-8 length, the rest is fixed."""
    if col.startswith('items.'):
        leaf = col.split('.', 1)[1]
        if typ == 'STRING':
            return 'COALESCE(list_sum(list_transform(items, lambda x: 2 + strlen(x.%s))), 0)' % leaf
        return 'COALESCE(list_sum(list_transform(items, lambda x: %d)), 0)' % FIXED_SIZES[typ]
    if typ == 'STRING':
        return 'CASE WHEN %s IS NULL THEN 0 ELSE 2 + strlen(%s) END' % (col, col)
    return 'CASE WHEN %s IS NULL THEN 0 ELSE %d END' % (col, FIXED_SIZES[typ])


def column_sizes(wh, table, schema, part_col='order_ts'):
    """{day: {column: logical bytes}} for a table partitioned by DATE(part_col)."""
    sel = ', '.join('SUM(%s) AS "%s"' % (leaf_size_sql(c, t), c) for c, t in schema)
    res = wh.con.execute('SELECT CAST(%s AS DATE) AS d, %s FROM %s GROUP BY 1 ORDER BY 1' % (part_col, sel, table)).fetchall()
    return {r[0]: {c: int(r[i + 1]) for i, (c, _) in enumerate(schema)} for r in res}


def referenced_columns(sql, schema, alias_table='orders'):
    """Which leaf columns of the table does the query touch? SELECT * means all of them; SELECT * EXCEPT (...) means all but those."""
    tree = sqlglot.parse_one(sql, read='bigquery')
    names = [c for c, _ in schema]
    unnest_alias = {}
    for u in tree.find_all(exp.Unnest):
        alias = u.args.get('alias')
        arg = u.expressions[0] if u.expressions else None
        if alias is not None and isinstance(arg, exp.Column):
            unnest_alias[alias.name if hasattr(alias, 'name') else str(alias)] = arg.name
    used = set()
    star = [s for s in tree.find_all(exp.Star)]
    for s in star:
        except_cols = {c.name for c in (s.args.get('except_') or s.args.get('except') or [])}
        used.update(n for n in names if n.split('.')[0] not in except_cols and n not in except_cols)
    for col in tree.find_all(exp.Column):
        if isinstance(col.this, exp.Star):
            continue
        table = col.table
        if table in unnest_alias:
            leaf = unnest_alias[table] + '.' + col.name
            if leaf in names:
                used.add(leaf)
        elif col.name in names:
            used.add(col.name)
        elif table == '' and col.name in unnest_alias:
            pass
    for u in tree.find_all(exp.Unnest):                 # UNNEST(o.items) alone reads the whole array
        arg = u.expressions[0] if u.expressions else None
        if isinstance(arg, exp.Column) and not any(l.startswith(arg.name + '.') for l in used):
            used.update(n for n in names if n.startswith(arg.name + '.'))
    return sorted(used, key=names.index)


def partitions_read(wh, sql, table, part_col='order_ts'):
    """Which day partitions can the WHERE clause not rule out? Only the parts of the filter that talk about the partition column are used."""
    tree = sqlglot.parse_one(sql, read='bigquery')
    where = tree.args.get('where')
    all_days = [r[0] for r in wh.con.execute('SELECT DISTINCT CAST(%s AS DATE) FROM %s ORDER BY 1' % (part_col, table)).fetchall()]
    if where is None:
        return all_days
    conj = []

    def split(node):
        if isinstance(node, exp.And):
            split(node.left)
            split(node.right)
        else:
            conj.append(node)
    split(where.this)
    ok_sides = {part_col, 'DATE(%s)' % part_col}                 # the filter must name the partition column itself, or DATE() of it, and compare it with constants

    def bare(node):
        """The same expression without table names in front of the columns (o.order_ts becomes order_ts)."""
        node = node.copy()
        for col in node.find_all(exp.Column):
            col.set('table', None)
        return node

    def prunable(c):
        c = bare(c)
        if isinstance(c, (exp.EQ, exp.GT, exp.GTE, exp.LT, exp.LTE)):
            left, right = c.left, c.right
            return (left.sql('bigquery') in ok_sides and not list(right.find_all(exp.Column))) or (right.sql('bigquery') in ok_sides and not list(left.find_all(exp.Column)))
        if isinstance(c, exp.Between):
            return c.this.sql('bigquery') in ok_sides and not any(list(x.find_all(exp.Column)) for x in (c.args['low'], c.args['high']))
        return False
    usable = [bare(c) for c in conj if prunable(c)]
    if not usable:
        return all_days
    cond = ' AND '.join(sqlglot.transpile(c.sql(dialect='bigquery'), read='bigquery', write='duckdb')[0] for c in usable)
    return [r[0] for r in wh.con.execute('SELECT DISTINCT CAST(%s AS DATE) FROM %s WHERE %s ORDER BY 1' % (part_col, table, cond)).fetchall()]


def estimate(wh, sql, table, sizes, schema=ORDERS_SCHEMA, scale=1):
    """Logical bytes of the columns and partitions that the query reads. scale says how many times bigger the real table is than the sample (rows and bytes)."""
    cols = referenced_columns(sql, schema)
    days = partitions_read(wh, sql, table)
    logical = sum(sizes[d][c] for d in days for c in cols)
    at_scale = logical * scale
    billed = 0 if at_scale == 0 else max(10 * MIB, -(-at_scale // MIB) * MIB)          # rounded up to a whole MiB, at least 10 MiB
    return {'columns': cols, 'partitions_read': len(days), 'partitions_total': len(sizes), 'logical_bytes_sample': logical, 'scale': scale,
            'logical_bytes': at_scale, 'billed_bytes': billed, 'example_usd': round(billed / TIB * EXAMPLE_PRICE_PER_TIB, 4)}
