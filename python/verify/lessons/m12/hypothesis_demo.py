"""A property test: say what must always be true, and let Hypothesis look for an example that breaks it."""
from decimal import Decimal

from hypothesis import given, settings, strategies as st

from orders import to_cents


def dedupe_keep_order(items):
    return sorted(set(items))  # a bug: it sorts, and does not keep the first-seen order


@settings(derandomize=True, max_examples=200)
@given(st.lists(st.integers(-5, 5)))
def test_dedupe_keeps_the_first_seen_order(xs):
    first_seen = [x for i, x in enumerate(xs) if x not in xs[:i]]
    assert dedupe_keep_order(xs) == first_seen


@settings(derandomize=True, max_examples=200)
@given(st.integers(min_value=0, max_value=10**9))
def test_to_cents_reads_back_what_was_written(cents):
    assert to_cents(f"{Decimal(cents) / 100:.2f}") == cents
