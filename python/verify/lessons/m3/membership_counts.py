"""Count the work that `in` does on a list and on a set. No clock: the counts are the same on every machine."""


class Key:
    eq_calls = 0
    hash_calls = 0

    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        Key.eq_calls += 1
        return self.value == other.value

    def __hash__(self):
        Key.hash_calls += 1
        return hash(self.value)


def count(container, needle):
    Key.eq_calls = Key.hash_calls = 0
    found = needle in container
    return found, Key.eq_calls, Key.hash_calls


for n in (1_000, 10_000, 100_000):
    keys = [Key(i) for i in range(n)]
    as_set = set(keys)
    needle = Key(n - 1)  # the last id, the worst case for a list
    _, list_eq, _ = count(keys, needle)
    _, set_eq, set_hash = count(as_set, needle)
    print(f"{n:>7} ids  list: {list_eq:>7} comparisons   set: {set_eq} comparison, {set_hash} hash call")
