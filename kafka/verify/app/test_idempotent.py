import json

from idempotent import apply


class Msg:
    """A stand-in for a message: the function under test only calls partition(), offset() and value()."""

    def __init__(self, partition, offset, value):
        self._p, self._o, self._v = partition, offset, value

    def partition(self):
        return self._p

    def offset(self):
        return self._o

    def value(self):
        return self._v


def order(order_id, cents):
    return json.dumps({'order_id': order_id, 'store_id': 's01', 'total_cents': cents, 'status': 'paid'}).encode()


def batch(first, last, partition=0):
    return [Msg(partition, o, order(o, 100 + o)) for o in range(first, last + 1)]


def test_the_same_batch_twice_changes_nothing():
    state, applied = {}, {}
    apply(batch(0, 4), state, applied)
    once = dict(state)
    apply(batch(0, 4), state, applied)
    assert state == once
    assert len(state) == 5


def test_a_replay_that_overlaps_gives_the_same_answer_as_no_replay():
    state, applied = {}, {}
    apply(batch(0, 6), state, applied)
    apply(batch(4, 9), state, applied)                  # the consumer restarted and read offsets 4 to 6 again
    expected, expected_applied = {}, {}
    apply(batch(0, 9), expected, expected_applied)
    assert state == expected
    assert applied == expected_applied == {0: 9}


def test_a_message_that_is_not_an_order_is_returned_and_the_rest_goes_on():
    state, applied = {}, {}
    messages = [Msg(0, 0, order(1, 300)), Msg(0, 1, b'not json'), Msg(0, 2, order(2, 450))]
    bad = apply(messages, state, applied)
    assert state == {1: 300, 2: 450}
    assert [m.offset() for m in bad] == [1]
    assert applied == {0: 2}                            # the bad message is not read again


def test_each_partition_has_its_own_position():
    state, applied = {}, {}
    apply(batch(0, 2, partition=0) + batch(0, 2, partition=1), state, applied)
    assert applied == {0: 2, 1: 2}
