"""Brewline: when a raw order file lands in Blob Storage, write a small summary next to the curated data.

Runs as an Event Grid triggered Azure Function. Two details matter in production:
  1. The event names the blob in its subject, for example
     /blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json
     The blob name is everything after /blobs/, and it contains slashes.
  2. Event Grid delivers each event at least once, so the write must be safe to repeat.
"""
import json
import os

import azure.functions as func
from azure.core.exceptions import ResourceExistsError
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

OUT_CONTAINER = os.environ.get("SUMMARY_CONTAINER", "curated")


def lake():
    """One client for the lake. In Azure it signs in as the managed identity of the function app.
    The tests set LAKE_CONNECTION and talk to the storage emulator instead."""
    conn = os.environ.get("LAKE_CONNECTION")
    if conn:
        return BlobServiceClient.from_connection_string(conn)
    return BlobServiceClient(os.environ["LAKE_URL"], credential=DefaultAzureCredential())


def summarize(lines):
    orders = [json.loads(line) for line in lines if line.strip()]
    kept = [o for o in orders if o["status"] != "CANCELLED"]
    return {"orders": len(orders), "revenue_eur": round(sum(o["total_eur"] for o in kept), 2)}


def split_subject(subject):
    parts = subject.split("/")
    return parts[4], parts[-1]


def process(event):
    container, name = split_subject(event.subject)
    svc = lake()
    body = svc.get_blob_client(container, name).download_blob().readall().decode()
    summary = summarize(body.splitlines())
    out = svc.get_blob_client(OUT_CONTAINER, "order_summaries/" + name.replace("/", "_") + ".json")
    try:
        out.upload_blob(json.dumps(summary), overwrite=False)
        status = "written"
    except ResourceExistsError:
        status = "already done"
    return {"blob": name, "status": status, **summary}


app = func.FunctionApp()


@app.event_grid_trigger(arg_name="event")
def on_raw_order_file(event: func.EventGridEvent):
    process(event)
