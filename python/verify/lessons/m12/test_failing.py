from orders import to_cents


def test_to_cents_of_a_price():
    assert to_cents("12.50") == 125
