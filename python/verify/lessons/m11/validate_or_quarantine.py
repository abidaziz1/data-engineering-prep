"""Validate every row at the boundary. Good rows go on, bad rows go to quarantine with the reason, and too many bad rows fail the run."""
import sys
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")  # "forbid" would reject a column that is not in the model

    order_id: str = Field(pattern=r"^O-\d+$")
    store: Literal["London", "Singapore"]
    qty: int = Field(ge=1)
    total_cents: int = Field(ge=0)
    ordered_at: datetime


ROWS = [  # one dict for each line of a CSV file, so every value is text
    {"order_id": "O-1", "store": "London", "qty": "2", "total_cents": "1250", "ordered_at": "2026-03-14T08:15:00"},
    {"order_id": "O-2", "store": "Singapore", "qty": "1", "total_cents": "475", "ordered_at": "2026-03-14T09:02:00"},
    {"order_id": "O-3", "store": "Paris", "qty": "1", "total_cents": "820", "ordered_at": "2026-03-14T09:30:00"},
    {"order_id": "O-4", "store": "London", "qty": "3", "total_cents": "1990", "ordered_at": "2026-03-14T10:11:00"},
    {"order_id": "O-5", "store": "London", "qty": "1", "total_cents": "12,50", "ordered_at": "2026-03-14T10:40:00"},
    {"order_id": "O-6", "store": "Singapore", "qty": "2", "total_cents": "3100", "ordered_at": "2026-03-14T11:05:00", "coupon": "SPRING"},
    {"order_id": "O-7", "store": "Singapore", "qty": "0", "total_cents": "640", "ordered_at": "2026-03-14T11:30:00"},
    {"order_id": "O-8", "store": "London", "qty": "1", "total_cents": "900", "ordered_at": "2026-03-14T12:00:00"},
    {"order_id": "O-8", "store": "London", "qty": "1", "total_cents": "900", "ordered_at": "2026-03-14T12:00:00"},
    {"order_id": "O-10", "store": "Singapore", "qty": "4", "total_cents": "2200", "ordered_at": "2026-03-14T12:45:00"},
]
MAX_BAD_SHARE = 0.50  # 50 percent suits this small demo. A real file gets a limit of a few percent.


def validate(rows):
    good, quarantine, seen = [], [], set()
    for line, row in enumerate(rows, start=2):  # line 1 of the file is the header
        try:
            order = Order.model_validate(row)
        except ValidationError as err:
            why = "; ".join(f"{e['loc'][0]}: {e['msg']}" for e in err.errors())
            quarantine.append({"line": line, "order_id": row["order_id"], "why": why})
            continue
        if order.order_id in seen:
            quarantine.append({"line": line, "order_id": row["order_id"], "why": "order_id: already seen in this file"})
            continue
        seen.add(order.order_id)
        good.append(order)
    return good, quarantine


good, quarantine = validate(ROWS)
print(f"read {len(ROWS)} rows: {len(good)} good, {len(quarantine)} in quarantine")
for q in quarantine:
    print(f"  line {q['line']:>2} {q['order_id']:<5} {q['why']}")
share = len(quarantine) / len(ROWS)
if share > MAX_BAD_SHARE:
    print(f"status: failed, {share:.0%} of the rows are bad (limit {MAX_BAD_SHARE:.0%})")
    sys.exit(1)
print(f"status: loaded {len(good)} rows, {share:.0%} in quarantine (limit {MAX_BAD_SHARE:.0%})")
