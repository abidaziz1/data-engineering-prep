"""A generator function makes values one at a time, when something asks for the next one."""


def evens(limit):
    for n in range(0, limit, 2):
        print("  making", n)
        yield n


gen = evens(6)
print(type(gen).__name__, "- nothing has run yet")
print("first:", next(gen))
print("second:", next(gen))
print("the rest:", list(gen))
try:
    next(gen)
except StopIteration:
    print("StopIteration: the generator is used up")

squares = (n * n for n in range(4))  # a generator expression
print("sum, then sum again:", sum(squares), sum(squares))
