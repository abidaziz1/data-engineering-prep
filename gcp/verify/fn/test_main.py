"""Tests for the order function.
The HTTP tests send real CloudEvents through the Functions Framework, the same wrapper that Cloud Run runs. The idempotency test calls the function itself, twice,
with the same message. Set FN_TARGET=main_bug to run the same tests against the copy with the bug."""
import base64
import importlib
import json
import os

import functions_framework
import pytest
from cloudevents.http import CloudEvent

target = importlib.import_module(os.environ.get("FN_TARGET", "main"))


def event_parts(order, message_id="m-1"):
    data = {"message": {"data": base64.b64encode(json.dumps(order).encode()).decode(), "messageId": message_id, "attributes": {}, "publishTime": "2026-11-10T02:00:00Z"},
            "subscription": "projects/brewline-dev/subscriptions/orders-to-fn"}
    attrs = {"specversion": "1.0", "type": "google.cloud.pubsub.topic.v1.messagePublished", "source": "//pubsub.googleapis.com/projects/brewline-dev/topics/pos-orders", "id": message_id}
    return attrs, data


def as_body(order, message_id="m-1"):
    attrs, data = event_parts(order, message_id)
    return json.dumps(dict(attrs, datacontenttype="application/json", data=data))


@pytest.fixture()
def client():
    target.ORDERS.clear()
    app = functions_framework.create_app(target="on_order", source=target.__file__, signature_type="cloudevent")
    return app.test_client()


def post(client, payload):
    return client.post("/", headers={"Content-Type": "application/cloudevents+json"}, data=payload)


def test_a_pubsub_message_is_accepted(client):
    assert post(client, as_body({"order_id": 7, "store_id": "s01"})).status_code == 200


def test_the_same_message_twice_stores_one_order():
    target.ORDERS.clear()
    event = CloudEvent(*event_parts({"order_id": 7, "store_id": "s01"}))
    target.on_order(event)
    target.on_order(event)
    assert len(target.ORDERS) == 1


def test_a_message_without_an_order_id_is_an_error_so_that_it_is_retried(client):
    response = post(client, as_body({"store_id": "s01"}, "m-2"))
    assert response.status_code == 500


def test_a_plain_json_post_is_refused(client):
    assert client.post("/", headers={"Content-Type": "application/json"}, data=json.dumps({"order_id": 1})).status_code == 400
