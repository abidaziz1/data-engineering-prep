"""Coding round: a left join that cannot multiply rows."""
import pandas as pd


def safe_join(orders, customers, key="customer_id"):
    """Left join orders to customers. Raise ValueError, naming the keys, when customers has more than one row for a key.
    The result has exactly one row for each order, in the order of `orders`."""
    repeated = customers.loc[customers[key].duplicated(keep=False), key].unique().tolist()
    if repeated:
        raise ValueError(f"customers has more than one row for {key} {repeated}")
    out = orders.merge(customers, on=key, how="left", validate="m:1")
    assert len(out) == len(orders)
    return out


orders = pd.DataFrame({"order_id": ["O-1", "O-2", "O-3", "O-4"], "customer_id": [1, 2, 3, 9], "total_cents": [1250, 475, 820, 1990]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "city": ["London", "London", "Singapore"]})

out = safe_join(orders, customers)
assert out["order_id"].tolist() == ["O-1", "O-2", "O-3", "O-4"] and out["total_cents"].sum() == orders["total_cents"].sum()
print("a clean join:", len(out), "rows, total", out["total_cents"].sum(), "cents")
assert bool(out["city"].isna().iloc[3]) and out["city"].iloc[0] == "London"
print("an order with no customer is kept:", out["order_id"].iloc[3], "with a missing city")
try:
    safe_join(orders, pd.concat([customers, customers.iloc[[2]]]))
    raise AssertionError("a repeated key must raise")
except ValueError as err:
    print("a repeated key raises:", err)
print("tests passed")
