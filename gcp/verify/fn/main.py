"""A Cloud Run function (2nd generation) that receives an order from Pub/Sub, wrapped in a CloudEvent, and stores it once.

Pub/Sub delivers at least once, so the same message can arrive twice. The function therefore keys the write on the order id: the second delivery changes nothing.
A message that cannot be read raises an error. The error makes the platform answer 500, and Pub/Sub delivers the message again (and, with a dead letter topic, gives up after N tries).
"""
import base64
import json

import functions_framework

ORDERS = {}                                  # stands in for a table keyed on order_id (BigQuery would use MERGE)


@functions_framework.cloud_event
def on_order(cloud_event):
    message = cloud_event.data["message"]
    order = json.loads(base64.b64decode(message["data"]).decode("utf-8"))
    if "order_id" not in order:
        raise ValueError("message %s has no order_id" % message["messageId"])
    ORDERS[order["order_id"]] = order        # same key, same row: running it twice is the same as running it once
