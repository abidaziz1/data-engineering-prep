"""A few tools from itertools, and the one rule of groupby."""
import itertools

print("batched:", list(itertools.batched(range(7), 3)))
print("islice of an endless count:", list(itertools.islice(itertools.count(1), 5)))
print("chain:", list(itertools.chain(["a", "b"], ["c"])))
print("pairwise:", list(itertools.pairwise([1, 4, 9, 16])))

rows = [("SG-01", 1250), ("KL-01", 3100), ("SG-01", 475), ("KL-01", 1990)]
print("groupby, input not sorted:", [(k, [c for _, c in g]) for k, g in itertools.groupby(rows, key=lambda r: r[0])])
print("groupby, input sorted:    ", [(k, [c for _, c in g]) for k, g in itertools.groupby(sorted(rows), key=lambda r: r[0])])
