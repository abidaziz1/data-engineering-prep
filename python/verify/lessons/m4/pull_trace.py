"""Four orders through read, parse and keep. Lists do each stage for everyone first. Generators pass one order all the way."""
TOTALS = [150, 80, 220, 40]


def read():
    for i, cents in enumerate(TOTALS, start=1):
        print(f"  read  {i}")
        yield i, cents


def parse(rows):
    for i, cents in rows:
        print(f"  parse {i}")
        yield {"id": i, "cents": cents}


def keep(rows):
    for r in rows:
        if r["cents"] >= 100:
            print(f"  keep  {r['id']}")
            yield r
        else:
            print(f"  drop  {r['id']}")


print("with lists")
rows = list(read())
parsed = list(parse(rows))
kept = list(keep(parsed))
for r in kept:
    print(f"  write {r['id']}")

print("with generators")
for r in keep(parse(read())):
    print(f"  write {r['id']}")
