"""A generator that holds a resource: what happens when the caller stops early."""
from contextlib import closing


def read_lines(name):
    print("open", name)
    try:
        for i in range(1, 6):
            yield i
    finally:
        print("close", name)


for n in read_lines("a.csv"):
    if n == 3:
        break
print("after the loop")

with closing(read_lines("b.csv")) as lines:
    next(lines)
    print("leaving the with block")
print("done")
