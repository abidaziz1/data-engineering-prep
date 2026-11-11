"""What the BigQuery client library would send. Nothing here calls Google: to_api_repr() shows the request body that the library builds.

Run it to print the bodies. They are the same JSON that the REST API of BigQuery receives, so this is a safe way to see what each setting does.
"""
import json

from google.cloud import bigquery

S = bigquery.SchemaField


def orders_table():
    schema = [
        S('order_id', 'INT64', mode='REQUIRED'),
        S('store_id', 'STRING', mode='REQUIRED'),
        S('customer_id', 'STRING'),
        S('order_ts', 'TIMESTAMP', mode='REQUIRED'),
        S('status', 'STRING'),
        S('items', 'RECORD', mode='REPEATED', fields=[S('sku', 'STRING'), S('qty', 'INT64'), S('unit_cents', 'INT64')]),
    ]
    table = bigquery.Table('brewline-dev.curated.orders', schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(type_=bigquery.TimePartitioningType.DAY, field='order_ts', expiration_ms=400 * 24 * 3600 * 1000)
    table.clustering_fields = ['store_id', 'status']
    table.require_partition_filter = True
    table.labels = {'team': 'data', 'layer': 'curated'}
    return table


def raw_dataset():
    ds = bigquery.Dataset('brewline-dev.raw')
    ds.location = 'asia-southeast1'
    ds.default_table_expiration_ms = 30 * 24 * 3600 * 1000
    ds.max_time_travel_hours = 48
    ds.storage_billing_model = 'PHYSICAL'
    ds.labels = {'layer': 'raw'}
    ds.access_entries = [bigquery.AccessEntry('READER', 'groupByEmail', 'analysts@example.com'),
                         bigquery.AccessEntry('WRITER', 'userByEmail', 'etl@brewline-dev.iam.gserviceaccount.com')]
    return ds


def append_load():
    """A load job that appends Parquet files, may add columns, and never creates the table by itself."""
    return bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.PARQUET,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        create_disposition=bigquery.CreateDisposition.CREATE_NEVER,
        schema_update_options=[bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION],
    )


def guarded_query():
    """A query that cannot bill more than 10 GiB, runs as a batch job, and carries labels that show up in the billing export."""
    return bigquery.QueryJobConfig(
        maximum_bytes_billed=10 * 1024 ** 3,
        priority=bigquery.QueryPriority.BATCH,
        use_query_cache=False,
        labels={'pipeline': 'daily_orders', 'env': 'dev'},
        default_dataset='brewline-dev.curated',
        query_parameters=[bigquery.ScalarQueryParameter('day', 'DATE', '2026-11-10')],
    )


def dry_run_query():
    cfg = guarded_query()
    cfg.dry_run = True
    return cfg


def external_parquet():
    """A table that reads Parquet files in Cloud Storage in place, with Hive style folders (dt=2026-11-10/) treated as a partition column."""
    ext = bigquery.ExternalConfig('PARQUET')
    ext.source_uris = ['gs://brewline-landing-dev/orders/*']
    ext.autodetect = True
    hp = bigquery.HivePartitioningOptions()
    hp.mode = 'AUTO'
    hp.source_uri_prefix = 'gs://brewline-landing-dev/orders/'
    ext.hive_partitioning = hp
    table = bigquery.Table('brewline-dev.raw.orders_ext')
    table.external_data_configuration = ext
    return table


def tagged_field():
    """A column that carries a policy tag. Who may read it, or read it masked, is decided by roles on the tag (mission 12)."""
    tag = 'projects/brewline-dev/locations/asia-southeast1/taxonomies/1234567890/policyTags/9876543210'
    return S('email', 'STRING', mode='NULLABLE', policy_tags=bigquery.PolicyTagList(names=[tag]))


def bodies():
    return {
        'table': orders_table().to_api_repr(),
        'dataset': raw_dataset().to_api_repr(),
        'load': append_load().to_api_repr(),
        'query': guarded_query().to_api_repr(),
        'dry_run': dry_run_query().to_api_repr(),
        'external': external_parquet().to_api_repr(),
        'policy_tag_field': tagged_field().to_api_repr(),
    }


if __name__ == '__main__':
    print(json.dumps(bodies(), indent=1))
