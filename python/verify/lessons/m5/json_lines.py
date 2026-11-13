"""One JSON document, or one JSON object per line, and a file that was cut off in the middle."""
import json

orders = [{"order_id": f"O-{i}", "total": i * 1.5} for i in range(1, 6)]

whole = json.dumps(orders)
lines = "\n".join(json.dumps(o) for o in orders) + "\n"
print("JSON array:", len(whole), "bytes.  JSON Lines:", len(lines), "bytes, one object per line")

cut = 118  # the upload stopped here
print("\nthe array, cut at byte", cut, ":")
try:
    json.loads(whole[:cut])
except json.JSONDecodeError as e:
    print("  JSONDecodeError:", e.msg, f"(line {e.lineno}, column {e.colno})  ->  0 orders readable")

print("\nthe JSON Lines file, cut at byte", cut, ":")
good = bad = 0
for line in lines[:cut].split("\n"):
    if not line:
        continue
    try:
        json.loads(line)
        good += 1
    except json.JSONDecodeError:
        bad += 1
print("  readable lines:", good, "  broken lines:", bad, "(the last one, cut in the middle)")
print("  the last bytes of the cut file:", repr(lines[:cut][-14:]))
