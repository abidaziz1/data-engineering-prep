import datetime
import json

import azure.functions as func

ORDERS = [
    {"order_id": "O-5001", "status": "COMPLETED", "total_eur": 11.5},
    {"order_id": "O-5002", "status": "COMPLETED", "total_eur": 8.0},
    {"order_id": "O-5003", "status": "CANCELLED", "total_eur": 30.0},
]


def blob_created(container, name):
    """The part of an Event Grid BlobCreated event that the handler reads: the subject."""
    return func.EventGridEvent(
        id="831e1650-001e-001b-66ab-eeb76e069631",
        data={"api": "PutBlob", "contentType": "application/json", "blobType": "BlockBlob"},
        topic="/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-brewline-data-prod/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod",
        subject="/blobServices/default/containers/" + container + "/blobs/" + name,
        event_type="Microsoft.Storage.BlobCreated",
        event_time=datetime.datetime(2026, 3, 14, 9, 0, 5, tzinfo=datetime.timezone.utc),
        data_version="",
    )


def put_orders(lake, name):
    body = "\n".join(json.dumps(o) for o in ORDERS)
    lake.svc.get_blob_client(lake.RAW, name).upload_blob(body, overwrite=True)


def test_summary_skips_cancelled_orders(lake):
    put_orders(lake, "orders-0001.json")
    out = lake.process(blob_created(lake.RAW, "orders-0001.json"))
    assert out["orders"] == 3
    assert out["revenue_eur"] == 19.5


def test_a_repeated_event_writes_nothing_twice(lake):
    put_orders(lake, "orders-0001.json")
    event = blob_created(lake.RAW, "orders-0001.json")
    first = lake.process(event)["status"]
    second = lake.process(event)["status"]
    assert (first, second) == ("written", "already done")


def test_the_blob_name_keeps_its_folders(lake):
    put_orders(lake, "orders/dt=2026-03-14/orders-0002.json")
    out = lake.process(blob_created(lake.RAW, "orders/dt=2026-03-14/orders-0002.json"))
    assert out["blob"] == "orders/dt=2026-03-14/orders-0002.json"
