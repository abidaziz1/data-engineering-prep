import pytest

from orders import clean_store, discount_cents, is_large, to_cents


def test_to_cents():
    assert to_cents("12.50") == 1250
    with pytest.raises(ValueError):
        to_cents("abc")
    with pytest.raises(ValueError):
        to_cents("1.234")


def test_is_large():
    assert is_large(20_000)
    assert not is_large(100)


def test_clean_store():
    assert clean_store(" london ") == "London"
    assert clean_store("") is None


def test_discount():
    assert discount_cents(10_000, 12) == 1000
    assert discount_cents(10_000, 2) == 0
