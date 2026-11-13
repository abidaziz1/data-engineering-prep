"""What things weigh. sys.getsizeof counts one object, not the objects it points to."""
import sys

for label, obj in [
    ("int 0", 0), ("int 1", 1), ("int 2**30", 2**30), ("int 2**60", 2**60), ("float", 1.5),
    ("str ''", ""), ("str 'a'", "a"), ("str 'O-0000001'", "O-0000001"), ("str of 100 characters", "x" * 100),
    ("bytes b'abc'", b"abc"), ("tuple of 3 ints", (1, 2, 3)), ("empty list", []), ("list of 1000 ints", list(range(1000))),
    ("empty dict", {}), ("dict with 1000 keys", dict.fromkeys(range(1000))), ("empty set", set()), ("set of 1000 ints", set(range(1000))),
]:
    print(f"{label:<24}{sys.getsizeof(obj):>8} bytes")

ints = list(range(1000))
print()
print("the list of 1000 ints, the list object alone:", sys.getsizeof(ints), "bytes")
print("the list and the 1000 int objects it points to:", sys.getsizeof(ints) + sum(sys.getsizeof(i) for i in ints), "bytes")
