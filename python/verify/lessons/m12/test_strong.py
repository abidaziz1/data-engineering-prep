import pytest

from orders import clean_store, discount_cents, is_large, to_cents


@pytest.mark.parametrize("text, cents", [("12.50", 1250), (" 7 ", 700), ("0.01", 1), ("1000", 100_000)])
def test_to_cents(text, cents):
    assert to_cents(text) == cents


@pytest.mark.parametrize("text", ["abc", "1.234", "", "12,50"])
def test_to_cents_rejects(text):
    with pytest.raises(ValueError):
        to_cents(text)


@pytest.mark.parametrize("cents, large", [(20_000, True), (10_000, True), (9_999, False), (100, False)])
def test_is_large(cents, large):
    assert is_large(cents) is large


def test_clean_store():
    assert clean_store(" london ") == "London"
    assert clean_store("SINGAPORE") == "Singapore"
    assert clean_store("   ") is None


@pytest.mark.parametrize("total, qty, discount", [(10_000, 12, 1000), (10_000, 10, 1000), (10_000, 9, 0), (100_000, 10, 5_000), (1, 10, 0)])
def test_discount(total, qty, discount):
    assert discount_cents(total, qty) == discount
