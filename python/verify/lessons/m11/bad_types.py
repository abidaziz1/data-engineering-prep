"""Three mistakes that mypy finds without running the code."""


def total_in_cents(price_cents: int, qty: int) -> int:
    return price_cents * qty / 100


def find_store(stores: dict[str, str], key: str) -> str:
    return stores.get(key)


def load(order_id: str, total_cents: int) -> None:
    print(order_id, total_cents)


load(17, "12.50")
