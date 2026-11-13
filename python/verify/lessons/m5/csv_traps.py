"""One supplier file, read two ways. The file has a quoted comma, a quoted line break and a byte order mark."""
import csv
import io

raw = (
    "﻿order_id,customer,note,total\n"
    'O-1,"Ng, Mei","extra shot",12.50\n'
    'O-2,Ravi,"leave at door\nring twice",4.75\n'
    "O-3,Zoë,,31.00\n"
)
print("bytes in the file:", len(raw.encode("utf-8")), "  lines:", raw.count("\n"))

print("\nwith line.split(','):")
for line in raw.splitlines():
    print("  ", len(line.split(",")), "fields:", line.split(",")[:4])

print("\nwith the csv module:")
for row in csv.DictReader(io.StringIO(raw)):
    print("  ", row)

print("\nwith the csv module, and the byte order mark removed:")
rows = list(csv.DictReader(io.StringIO(raw.lstrip("﻿"))))
print("  ", [r["order_id"] for r in rows], "total:", sum(float(r["total"]) for r in rows))
