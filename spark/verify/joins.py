"""Mission 4: how Spark joins two tables. The plans and the counts are real. The join that Spark picks depends on the size of the tables, the hints, and the settings."""
import re

from pyspark.sql import functions as F

import session as S

JOIN_LINES = re.compile(r'(BroadcastHashJoin|SortMergeJoin|ShuffledHashJoin|BroadcastNestedLoopJoin|CartesianProduct|BroadcastExchange|Exchange |Sort \[|AdaptiveSparkPlan)')


def join_lines(plan):
    """Only the lines of a plan that show how the join was done."""
    return '\n'.join(l.rstrip() for l in plan.splitlines() if JOIN_LINES.search(l))


def scenarios(spark, paths):
    """One join of the orders to a small table, planned five ways."""
    o, s = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores'])
    tiers = spark.createDataFrame([(0, 'small'), (1000, 'medium'), (2500, 'large')], 'min_cents int, size string')
    out = {}
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    out['stores is small: the default'] = S.plan_text(o.join(s, 'store_id'), 'simple')
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    out['broadcast turned off'] = S.plan_text(o.join(s, 'store_id'), 'simple')
    out['hint: broadcast(stores)'] = S.plan_text(o.join(F.broadcast(s), 'store_id'), 'simple')
    out['hint: shuffle_hash on stores'] = S.plan_text(o.join(s.hint('shuffle_hash'), 'store_id'), 'simple')
    out['a range condition, not equality'] = S.plan_text(o.join(F.broadcast(tiers), o.total_cents >= tiers.min_cents), 'simple')
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '10485760')
    out['a range condition, tiers is small'] = S.plan_text(o.join(tiers, o.total_cents >= tiers.min_cents), 'simple')
    spark.conf.unset('spark.sql.adaptive.enabled')
    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')
    return out


def adaptive_switch(spark, paths):
    """With broadcast turned off at planning time, adaptive execution can still broadcast at run time, once it knows the real size after a filter."""
    o, c = spark.read.parquet(paths['orders']), spark.read.parquet(paths['customers'])
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    spark.conf.set('spark.sql.adaptive.autoBroadcastJoinThreshold', '10485760')
    q = o.join(c.filter("loyalty_tier = 'gold'"), 'customer_id')
    before = S.plan_text(q, 'simple')
    q.collect()
    after = S.plan_text(q, 'simple')
    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')
    spark.conf.unset('spark.sql.adaptive.autoBroadcastJoinThreshold')
    return before, after


def counts(spark, paths):
    """What joins do to the number of rows: repeated keys, missing keys, null keys, and semi and anti joins."""
    o, s, c = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores']), spark.read.parquet(paths['customers'])
    stores_twice = s.union(s)
    one_null = spark.createDataFrame([(None, 'none', 1990)], 'customer_id string, loyalty_tier string, birth_year int')
    c_with_null = c.union(one_null)
    o.createOrReplaceTempView('orders_t')
    c.createOrReplaceTempView('customers_t')
    return {
        'orders': o.count(), 'orders_without_customer_id': o.filter(F.col('customer_id').isNull()).count(),
        'inner_to_stores': o.join(s, 'store_id').count(),
        'inner_to_stores_listed_twice': o.join(stores_twice, 'store_id').count(),
        'inner_to_customers': o.join(c, 'customer_id').count(),
        'left_to_customers': o.join(c, 'customer_id', 'left').count(),
        'null_safe_to_a_null_row': o.join(c_with_null, o.customer_id.eqNullSafe(c_with_null.customer_id)).count(),
        'customers': c.count(),
        'customers_with_orders_semi': c.join(o, 'customer_id', 'left_semi').count(),
        'customers_without_orders_anti': c.join(o, 'customer_id', 'left_anti').count(),
        'not_in_customers_without_orders': spark.sql('SELECT count(*) FROM customers_t WHERE customer_id NOT IN (SELECT customer_id FROM orders_t)').collect()[0][0],
        'not_exists_customers_without_orders': spark.sql('SELECT count(*) FROM customers_t c WHERE NOT EXISTS (SELECT 1 FROM orders_t o WHERE o.customer_id = c.customer_id)').collect()[0][0],
    }


def filter_goes_down(spark, paths):
    """A filter written after a join is moved below it by the optimizer, so the join sees fewer rows. Only the lines that show where the filter sits are kept."""
    o, s = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores'])
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    q = o.join(s, 'store_id').filter(F.col('country') == 'SG')
    optimized = S.plan_text(q, 'extended').split('== Optimized Logical Plan ==')[1].split('== Physical Plan ==')[0]
    spark.conf.unset('spark.sql.adaptive.enabled')
    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')
    return optimized.strip()
