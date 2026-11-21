"""Tests of the pretend source. No Spark is needed."""

import json

from lakehouse import landing


def test_day_one_has_the_orders_and_the_dirty_lines_on_purpose():
    lines = landing.files_for_day(1)['part-0001.json']
    assert len(lines) == 305
    # the line that is cut in the middle
    assert sum(1 for line in lines if line.startswith('{"order_id": 304')) == 1
    # the duplicate of order 7
    parsed = [json.loads(line) for line in lines[:-1]]
    assert sorted(e['order_id'] for e in parsed).count(7) == 2


def test_day_two_delivers_the_first_file_of_day_one_again():
    files = landing.files_for_day(2)
    assert files['replay-part-0001.json'] == landing.files_for_day(1)['part-0001.json']
    assert len(files['part-0002.json']) == 116 + 41


def test_day_three_has_a_new_field_two_text_amounts_and_a_late_event():
    events = [json.loads(line) for line in landing.files_for_day(3)['part-0001.json']]
    assert len(events) == 80 + 2 + 1
    # an old event of order 5
    assert events[-1]['order_id'] == 5 and events[-1]['event_time'] < '2026-03-02'
    assert sum(1 for e in events if 'coupon' in e) == 20
    text_amounts = [e['amount_cents'] for e in events if isinstance(e['amount_cents'], str)]
    assert text_amounts == ['12.50', '9.99']


def test_the_source_is_deterministic():
    assert landing.files_for_day(2) == landing.files_for_day(2)
