"""A pydantic model checks what it is given, converts what it can, and says what is wrong."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ValidationError


class Order(BaseModel):
    order_id: str = Field(pattern=r"^O-\d+$")
    store: Literal["London", "Singapore"]
    qty: int = Field(ge=1)
    total_cents: int = Field(ge=0)
    ordered_at: datetime


good = {"order_id": "O-17", "store": "London", "qty": "2", "total_cents": "1250", "ordered_at": "2026-03-14T08:15:00"}
order = Order.model_validate(good)
print("a row of text, converted:", repr(order.qty), repr(order.total_cents), order.ordered_at.isoformat())

bad = {"order_id": "17", "store": "Paris", "qty": 0, "total_cents": "12.50", "ordered_at": "yesterday"}
try:
    Order.model_validate(bad)
except ValidationError as err:
    print(err.error_count(), "errors:")
    for e in err.errors():
        print(f"  {e['loc'][0]:<13}{e['type']:<32}{e['msg']}")

try:
    Order.model_validate(good, strict=True)
except ValidationError as err:
    first = err.errors()[0]
    print("strict mode on text from a CSV:", err.error_count(), "errors, the first is", first["loc"][0], "->", first["msg"])
