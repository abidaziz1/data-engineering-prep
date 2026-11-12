"""A default value is made once, when `def` runs. A mutable default is shared by every call."""


def add_order(order_id, batch=[]):
    batch.append(order_id)
    return batch


print(add_order("O-1"))
print(add_order("O-2"))
print(add_order("O-3", batch=[]))
print(add_order("O-4"))


def add_order_safe(order_id, batch=None):
    if batch is None:
        batch = []
    batch.append(order_id)
    return batch


print(add_order_safe("O-1"))
print(add_order_safe("O-2"))
print("the default that was made once:", add_order.__defaults__)
