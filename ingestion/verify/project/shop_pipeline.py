"""The dlt side of the Brewline ingestion: one pipeline for each experiment, and one resource for each way of loading."""
import os

import dlt
import duckdb

import source

START = '2026-01-01T00:00:00+00:00'


def make_pipeline(name, workdir, state_dir='dlt'):
    return dlt.pipeline(pipeline_name=name, destination=dlt.destinations.duckdb(os.path.join(workdir, name + '.duckdb')),
                        dataset_name='shop', pipelines_dir=os.path.join(workdir, state_dir))


def orders_resource(strategy, day, cursor=False, **hints):
    """A resource that reads the orders of one day. `day` is a list of one item, so that a run can move to the next day."""
    kw = {'name': 'orders', 'write_disposition': strategy}
    if strategy == 'merge':
        kw['primary_key'] = 'id'
    kw.update(hints)
    if cursor:
        @dlt.resource(**kw)
        def orders(updated=dlt.sources.incremental('updated_at', initial_value=START)):
            for page in source.get_orders(day[0], since=updated.last_value):
                yield page
    else:
        @dlt.resource(**kw)
        def orders():
            for page in source.get_orders(day[0]):
                yield page
    return orders


def run(pipeline, resource, **kw):
    """Runs the pipeline once and returns the number of order rows that this run wrote."""
    pipeline.run(resource(), **kw)
    return pipeline.last_trace.last_normalize_info.row_counts.get('orders', 0)


def query(workdir, name, sql):
    con = duckdb.connect(os.path.join(workdir, name + '.duckdb'), read_only=True)
    try:
        return con.sql(sql).fetchall()
    finally:
        con.close()


def totals(workdir, name):
    """(rows, distinct orders) in the destination."""
    return query(workdir, name, 'select count(*), count(distinct id) from shop.orders')[0]
