"""Loads one day of the shop into DuckDB with dlt: the orders (incremental, merged on the id, with a lookback of one hour), their lines, and the stores (replaced every run).

Run:   python ingestion/load_orders.py --day 2 --warehouse warehouse/brewline.duckdb
Prints one line with what the run wrote, so that the orchestrator can check it.
"""
import argparse
import os
import pathlib
import sys

import dlt

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import shop_api  # noqa: E402

START = '2026-01-01T00:00:00+00:00'


def build(day, warehouse):
    pipeline = dlt.pipeline(pipeline_name='brewline', destination=dlt.destinations.duckdb(warehouse), dataset_name='raw', pipelines_dir=os.path.join(os.path.dirname(warehouse), '.dlt'))

    @dlt.resource(name='orders', write_disposition='merge', primary_key='id')
    def orders(updated=dlt.sources.incremental('updated_at', initial_value=START, lag=3600)):
        for page in shop_api.get_orders(day, since=updated.last_value):
            yield page

    @dlt.resource(name='stores', write_disposition='replace')
    def stores():
        for page in shop_api.get_stores(day):
            yield page

    return pipeline, [orders, stores]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--day', type=int, required=True)
    ap.add_argument('--warehouse', default='warehouse/brewline.duckdb')
    args = ap.parse_args()
    os.makedirs(os.path.dirname(os.path.abspath(args.warehouse)), exist_ok=True)
    pipeline, resources = build(args.day, os.path.abspath(args.warehouse))
    pipeline.run(resources)
    counts = pipeline.last_trace.last_normalize_info.row_counts
    print('loaded day %d: orders %d, order lines %d, stores %d' % (args.day, counts.get('orders', 0), counts.get('orders__lines', 0), counts.get('stores', 0)))


if __name__ == '__main__':
    main()
