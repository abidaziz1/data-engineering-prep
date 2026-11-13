"""Small cleaning functions that a nightly job uses."""
from decimal import Decimal, InvalidOperation


def to_cents(text):
    """'12.50' becomes 1250. Raise ValueError for anything that is not an amount with at most two decimals."""
    try:
        amount = Decimal(text.strip())
    except InvalidOperation:
        raise ValueError(f"not an amount: {text!r}") from None
    if amount != amount.quantize(Decimal("0.01")):
        raise ValueError(f"more than two decimals: {text!r}")
    return int(amount * 100)


def is_large(total_cents, limit_cents=10_000):
    """An order is large when it reaches the limit."""
    return total_cents >= limit_cents


def clean_store(name):
    """' london ' becomes 'London'. An empty name becomes None."""
    name = name.strip().title()
    return name or None


def discount_cents(total_cents, qty):
    """10 percent off from 10 items, and never more than 5,000 cents."""
    if qty >= 10:
        return min(total_cents // 10, 5_000)
    return 0
