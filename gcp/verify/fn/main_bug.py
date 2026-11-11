"""The same function with a bug: it appends on every delivery, so a second delivery of the same message stores the order twice."""
import base64
import json

import functions_framework

ORDERS = []


@functions_framework.cloud_event
def on_order(cloud_event):
    message = cloud_event.data["message"]
    order = json.loads(base64.b64decode(message["data"]).decode("utf-8"))
    if "order_id" not in order:
        raise ValueError("message %s has no order_id" % message["messageId"])
    ORDERS.append(order)
