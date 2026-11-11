"""Mission 8: Spark SQL, window functions and ANSI mode. Every result and every error message is real output of Spark 4.0.1."""
from pyspark.sql import functions as F

ANSI_CASES = [
    ("CAST('abc' AS INT)", "SELECT CAST('abc' AS INT) AS v"),
    ('1 / 0', 'SELECT 1 / 0 AS v'),
    ('2147483647 + 1 (an INT)', 'SELECT 2147483647 + 1 AS v'),
    ('CAST(300 AS TINYINT)', 'SELECT CAST(300 AS TINYINT) AS v'),
    ("to_date('2026-13-45')", "SELECT to_date('2026-13-45') AS v"),
    ('element_at(array(1, 2), 5)', 'SELECT element_at(array(1, 2), 5) AS v'),
    ("try_cast('abc' AS INT)", "SELECT try_cast('abc' AS INT) AS v"),
    ('try_divide(1, 0)', 'SELECT try_divide(1, 0) AS v'),
]


def first_line(e):
    """The first line of an error: the error class and the message, without the long stack."""
    return str(e).strip().split('\n')[0][:200]


def ansi_table(spark):
    """Each expression, with ANSI mode on (the default in Spark 4) and off: the value, or the error."""
    out = []
    for label, sql in ANSI_CASES:
        row = [label]
        for mode in ('true', 'false'):
            spark.conf.set('spark.sql.ansi.enabled', mode)
            try:
                v = spark.sql(sql).collect()[0]['v']
                row.append('NULL' if v is None else str(v))
            except Exception as e:  # noqa: BLE001
                row.append('error: ' + first_line(e))
        out.append(row)
    spark.conf.set('spark.sql.ansi.enabled', 'true')
    return out


def qualify(spark):
    """QUALIFY is not in Spark 4.0.1: the way to filter on a window is a subquery."""
    try:
        spark.sql('SELECT store_id, row_number() OVER (PARTITION BY store_id ORDER BY total_cents DESC) AS r FROM orders QUALIFY r = 1').collect()
        return 'accepted'
    except Exception as e:  # noqa: BLE001
        return first_line(e)


def windows(spark):
    """Running totals, rank and lag on a table small enough to read, and the difference between ROWS and RANGE when two rows tie."""
    spark.createDataFrame([('s01', 1, 100), ('s01', 2, 150), ('s01', 3, 150), ('s01', 4, 90), ('s02', 1, 70), ('s02', 2, 80)], 'store string, day int, cents int').createOrReplaceTempView('daily')
    tbl = [list(r) for r in spark.sql("""
        SELECT store, day, cents,
               SUM(cents) OVER (PARTITION BY store ORDER BY day) AS running,
               RANK() OVER (PARTITION BY store ORDER BY cents DESC) AS rnk,
               LAG(cents) OVER (PARTITION BY store ORDER BY day) AS prev
        FROM daily ORDER BY store, day""").collect()]
    ties = [list(r) for r in spark.sql("""
        SELECT day, cents,
               SUM(cents) OVER (ORDER BY cents ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame,
               SUM(cents) OVER (ORDER BY cents RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_frame
        FROM daily WHERE store = 's01' ORDER BY cents, day""").collect()]
    return tbl, ties


def groupings(spark):
    spark.createDataFrame([('SG', 'app', 3), ('SG', 'pos', 2), ('MY', 'app', 4), ('MY', 'pos', 1), ('MY', 'pos', 5)], 'country string, channel string, n int').createOrReplaceTempView('sales')
    rollup = [list(r) for r in spark.sql('SELECT country, channel, SUM(n) AS n, GROUPING(country) AS g_country, GROUPING(channel) AS g_channel FROM sales GROUP BY ROLLUP (country, channel) ORDER BY g_country, country, g_channel, channel').collect()]
    pivot = [list(r) for r in spark.sql("SELECT * FROM sales PIVOT (SUM(n) FOR channel IN ('app', 'pos')) ORDER BY country").collect()]
    return rollup, pivot


def arrays(spark):
    spark.createDataFrame([(1, [3, 1, 2]), (2, [5, 5]), (3, [])], 'id int, xs array<int>').createOrReplaceTempView('t')
    cols = spark.sql("""
        SELECT id, xs, transform(xs, x -> x * 10) AS times10, filter(xs, x -> x > 1) AS over1, aggregate(xs, 0, (acc, x) -> acc + x) AS total, sort_array(xs) AS sorted
        FROM t ORDER BY id""").collect()
    exploded = [list(r) for r in spark.sql('SELECT id, x FROM t LATERAL VIEW explode(xs) e AS x ORDER BY id, x').collect()]
    outer = [list(r) for r in spark.sql('SELECT id, x FROM t LATERAL VIEW OUTER explode(xs) e AS x ORDER BY id, x').collect()]
    return [[str(c) for c in r] for r in cols], exploded, outer


def time_zone_days(spark, path):
    """The same orders counted by day in UTC and in Singapore (8 hours ahead): the orders of the first and last days move."""
    o = spark.read.parquet(path)
    res = {}
    for tz in ('UTC', 'Asia/Singapore'):
        spark.conf.set('spark.sql.session.timeZone', tz)
        rows = o.groupBy(F.date_format('order_ts', 'yyyy-MM-dd').alias('day')).count().orderBy('day').collect()
        res[tz] = [(r['day'], r['count']) for r in rows]
    spark.conf.set('spark.sql.session.timeZone', 'UTC')
    return res
