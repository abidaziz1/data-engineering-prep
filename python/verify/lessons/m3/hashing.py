"""What can be a dict key or a set member: only objects whose hash never changes while they are in it."""
from dataclasses import dataclass

order = {"order_id": "O-1", "total": 12.5}

for label, key in [("a tuple", ("O-1", "C-7")), ("a list", ["O-1", "C-7"]), ("a dict", order)]:
    try:
        {key: "row"}
        print(f"{label:<8} works as a dict key")
    except TypeError as e:
        print(f"{label:<8} {e}")


class Customer:
    def __init__(self, customer_id):
        self.customer_id = customer_id

    def __eq__(self, other):
        return self.customer_id == other.customer_id


try:
    {Customer("C-7")}
except TypeError as e:
    print("a class that defines __eq__ and no __hash__:", e)


@dataclass(frozen=True)
class Store:
    code: str


print("a frozen dataclass:", {Store("SG-01"), Store("SG-01")})
