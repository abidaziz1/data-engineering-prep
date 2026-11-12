"""Coding round: walk nested JSON and yield (path, value) pairs, without building one big list."""


def flatten(obj, prefix=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from flatten(value, f"{prefix}{key}.")
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from flatten(value, f"{prefix}{i}.")
    else:
        yield prefix.rstrip("."), obj


order = {
    "order_id": "O-1",
    "customer": {"id": "C-7", "tier": "gold"},
    "lines": [{"sku": "LATTE", "qty": 2}, {"sku": "MUFFIN", "qty": 1}],
    "note": None,
}
for path, value in flatten(order):
    print(f"{path:<16} {value!r}")

assert dict(flatten({})) == {}
assert dict(flatten({"a": [1, [2, 3]]})) == {"a.0": 1, "a.1.0": 2, "a.1.1": 3}
print("tests passed")
