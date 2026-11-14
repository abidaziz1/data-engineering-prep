import json
import os
import importlib

import pytest

order_totals = importlib.import_module(os.environ.get('ORDER_TOTALS_MODULE', 'order_totals'))


class Msg:
    """A stand-in for a message: the function under test only calls value()."""

    def __init__(self, value):
        self._value = value

    def value(self):
        return self._value


def order(order_id, store, cents, status='paid'):
    return json.dumps({'order_id': order_id, 'store_id': store, 'total_cents': cents, 'status': status}).encode()


def test_paid_orders_are_added_up_by_store():
    totals, bad = order_totals.total_by_store([Msg(order(1, 's01', 300)), Msg(order(2, 's01', 450)), Msg(order(3, 's02', 200))])
    assert totals == {'s01': 750, 's02': 200}
    assert bad == []


def test_a_refunded_order_is_not_a_sale():
    totals, _ = order_totals.total_by_store([Msg(order(1, 's01', 300)), Msg(order(2, 's01', 450, 'refunded'))])
    assert totals == {'s01': 300}


def test_a_message_that_is_not_json_is_set_aside():
    totals, bad = order_totals.total_by_store([Msg(order(1, 's01', 300)), Msg(b'not json')])
    assert totals == {'s01': 300}
    assert len(bad) == 1


def test_totals_of_a_real_topic_match_the_totals_of_the_sent_orders(bootstrap, topic, send):
    sent = [(f's0{1 + i % 3}', order(i, f's0{1 + i % 3}', 100 + i, 'refunded' if i % 5 == 0 else 'paid')) for i in range(60)]
    send(topic, sent)
    got, bad = order_totals.total_by_store(order_totals.read_topic(bootstrap, topic, 'test-group-' + topic))
    expected = {}
    for key, value in sent:
        o = json.loads(value)
        if o['status'] == 'paid':
            expected[o['store_id']] = expected.get(o['store_id'], 0) + o['total_cents']
    assert got == expected
    assert bad == []
