"""A datetime without a time zone is a clock reading. A datetime with one is a moment."""
import warnings
from datetime import datetime, timedelta, timezone

naive = datetime(2026, 3, 14, 8, 15)
aware = datetime(2026, 3, 14, 8, 15, tzinfo=timezone.utc)
print("naive:", naive.isoformat(), " tzinfo:", naive.tzinfo)
print("aware:", aware.isoformat(), " tzinfo:", aware.tzinfo)

try:
    naive < aware
except TypeError as e:
    print("comparing them:", e)
print("naive == aware:", naive == aware, "  (== never raises, < does)")

singapore = timezone(timedelta(hours=8))
local = datetime(2026, 3, 14, 16, 15, tzinfo=singapore)
print("16:15 in Singapore is the same moment as 08:15 UTC:", local == aware)
print("converted to UTC:", local.astimezone(timezone.utc).isoformat())

with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    value = datetime.utcnow()
print("utcnow() returns a naive value:", value.tzinfo is None)
print("and warns:", caught[0].category.__name__, "-", str(caught[0].message)[:78])
print("the replacement:", datetime.now(timezone.utc).tzinfo)
