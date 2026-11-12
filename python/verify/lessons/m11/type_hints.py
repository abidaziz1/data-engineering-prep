"""Type hints are notes for readers and tools. Python does not check them when the program runs."""
from dataclasses import dataclass


def total_in_cents(price: str, qty: int) -> int:
    return price * qty  # "12.50" * 3 is legal Python: it repeats the text


print("the hint says int, and we got:", repr(total_in_cents("12.50", 3)))


@dataclass
class Order:
    order_id: str
    total_cents: int


order = Order(order_id=17, total_cents="12.50")
print("a dataclass accepts anything:", order)
print("the types of the fields:", type(order.order_id).__name__, type(order.total_cents).__name__)
