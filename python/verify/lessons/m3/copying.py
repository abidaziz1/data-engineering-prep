"""A copy of a list is a new list. The things inside it are still the same objects."""
import copy

orders = [{"order_id": "O-1", "lines": [1, 2]}, {"order_id": "O-2", "lines": [3]}]

shallow = list(orders)
shallow[0]["lines"].append(99)
print("after changing a line through the shallow copy:", orders[0]["lines"])
print("same object inside both lists:", shallow[0] is orders[0])

orders = [{"order_id": "O-1", "lines": [1, 2]}, {"order_id": "O-2", "lines": [3]}]
deep = copy.deepcopy(orders)
deep[0]["lines"].append(99)
print("after changing a line through the deep copy:", orders[0]["lines"], deep[0]["lines"])

row = {"order_id": "O-1", "total": 12.5}
alias = row
alias["total"] = 0
print("an alias is the same dict:", row)
print("the new dict from dict(row) is separate:", dict(row) is not row)
