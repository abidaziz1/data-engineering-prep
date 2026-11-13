"""Coding round: a data contract as code, and a report of how today's file differs from it."""
CONTRACT = {"order_id": "str", "store": "str", "qty": "int", "total_cents": "int"}


def kind(value):
    for name, cast in (("int", int), ("float", float)):
        try:
            cast(value)
            return name
        except ValueError:
            pass
    return "str"


def check_schema(contract, rows):
    """Compare the columns of `rows` (a list of dicts of text) with `contract` ({column: "int" | "float" | "str"}).
    Return findings as tuples, sorted: ("missing", column), ("new", column), ("type", column, expected, got).
    The type of a column is the widest kind seen in its values: str beats float, and float beats int."""
    order = {"int": 0, "float": 1, "str": 2}
    columns = {c for row in rows for c in row}
    findings = [("missing", c) for c in contract if c not in columns] + [("new", c) for c in columns if c not in contract]
    for c in contract:
        if c in columns:
            seen = max((kind(row[c]) for row in rows if row.get(c) not in (None, "")), key=order.get, default="int")
            if seen != contract[c] and not (contract[c] == "float" and seen == "int"):
                findings.append(("type", c, contract[c], seen))
    return sorted(findings)


ok = [{"order_id": "O-1", "store": "London", "qty": "2", "total_cents": "1250"}, {"order_id": "O-2", "store": "Singapore", "qty": "1", "total_cents": "475"}]
assert check_schema(CONTRACT, ok) == []
print("the contract and a clean file:", check_schema(CONTRACT, ok))

renamed = [{"order_id": "O-1", "store": "London", "qty": "2", "total": "1250"}]
assert check_schema(CONTRACT, renamed) == [("missing", "total_cents"), ("new", "total")]
print("a renamed column:", check_schema(CONTRACT, renamed))

changed = [{"order_id": "O-1", "store": "London", "qty": "2", "total_cents": "12.50"}, {"order_id": "O-2", "store": "London", "qty": "two", "total_cents": "475"}]
assert check_schema(CONTRACT, changed) == [("type", "qty", "int", "str"), ("type", "total_cents", "int", "float")]
print("values of another type:", check_schema(CONTRACT, changed))

extra = [dict(ok[0], coupon="SPRING")]
assert check_schema(CONTRACT, extra) == [("new", "coupon")]
print("a new column:", check_schema(CONTRACT, extra))
print("tests passed")
