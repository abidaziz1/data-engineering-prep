import json

import boto3

from conftest import BUCKET

ORDERS = [
    {"order_id": "O-5001", "status": "COMPLETED", "total_usd": 11.5},
    {"order_id": "O-5002", "status": "COMPLETED", "total_usd": 8.0},
    {"order_id": "O-5003", "status": "CANCELLED", "total_usd": 30.0},
]


def s3_event(key):
    """The part of an S3 notification that the handler reads. Note the URL-encoded key."""
    return {"Records": [{"eventSource": "aws:s3", "eventName": "ObjectCreated:Put",
                         "s3": {"bucket": {"name": BUCKET}, "object": {"key": key}}}]}


def put_orders(key):
    body = "\n".join(json.dumps(o) for o in ORDERS).encode()
    boto3.client("s3").put_object(Bucket=BUCKET, Key=key, Body=body)


def test_summary_skips_cancelled_orders(lake):
    put_orders("raw/orders/dt=2026-03-14/orders-0001.json")
    out = lake.lambda_handler(s3_event("raw/orders/dt%3D2026-03-14/orders-0001.json"), None)
    assert out["results"][0]["orders"] == 3
    assert out["results"][0]["revenue_usd"] == 19.5


def test_a_repeated_event_writes_nothing_twice(lake):
    put_orders("raw/orders/dt=2026-03-14/orders-0001.json")
    event = s3_event("raw/orders/dt%3D2026-03-14/orders-0001.json")
    first = lake.lambda_handler(event, None)["results"][0]["status"]
    second = lake.lambda_handler(event, None)["results"][0]["status"]
    assert (first, second) == ("written", "already done")


def test_a_key_with_a_space_arrives_with_a_plus(lake):
    put_orders("raw/orders/dt=2026-03-14/orders 0002.json")
    out = lake.lambda_handler(s3_event("raw/orders/dt%3D2026-03-14/orders+0002.json"), None)
    assert out["results"][0]["key"] == "raw/orders/dt=2026-03-14/orders 0002.json"
