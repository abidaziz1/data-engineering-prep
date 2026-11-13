"""Money in a float, in a Decimal and in whole cents."""
import math
from decimal import ROUND_DOWN, ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal

print("0.1 + 0.2 =", 0.1 + 0.2)
print("0.1 + 0.2 == 0.3:", 0.1 + 0.2 == 0.3)
print("the float 0.1 is really:", Decimal(0.1))
print("the Decimal from text:   ", Decimal("0.1"))

n = 1_000_000
total = 0.0
for _ in range(n):
    total += 0.10
print(f"\nadding 0.10 {n:,} times:")
print("  float, a loop:      ", total)
print("  math.fsum:          ", math.fsum([0.10] * n))
print("  Decimal:            ", sum(Decimal("0.10") for _ in range(n)))
print("  whole cents (int):  ", sum(10 for _ in range(n)) / 100)

print("\nrounding a half to 2 places:")
print("  round(2.675, 2):", round(2.675, 2), "  (the float is a little below 2.675)")
for mode in (ROUND_HALF_EVEN, ROUND_HALF_UP, ROUND_DOWN):
    print(f"  Decimal('2.675'), {mode:<15}", Decimal("2.675").quantize(Decimal("0.01"), rounding=mode))
print("  round(2.5):", round(2.5), "  round(3.5):", round(3.5), "  (halves go to the even number)")
