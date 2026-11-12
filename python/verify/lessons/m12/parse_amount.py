"""Coding round: read a money amount from text, exactly, and refuse anything that is not one."""
from decimal import Decimal, InvalidOperation


def parse_amount(text):
    """Return the amount as a Decimal with two places. Accept spaces around the text, a thousands comma in the right places
    ("1,250.00"), and 0 to 2 decimals. Raise ValueError for anything else: "12,50", "1.234", "abc", "" and "1,25.0"."""
    clean = text.strip()
    whole, _, decimals = clean.partition(".")
    if len(decimals) > 2:
        raise ValueError(f"more than two decimals: {text!r}")
    groups = whole.split(",")
    if len(groups) > 1 and (not 1 <= len(groups[0]) <= 3 or any(len(g) != 3 for g in groups[1:])):
        raise ValueError(f"misplaced comma: {text!r}")
    try:
        return Decimal("".join(groups) + ("." + decimals if decimals else "")).quantize(Decimal("0.01"))
    except InvalidOperation:
        raise ValueError(f"not an amount: {text!r}") from None


GOOD = [("12.50", "12.50"), (" 7 ", "7.00"), ("1,250.00", "1250.00"), ("0.5", "0.50"), ("1,000", "1000.00"), ("999,999.99", "999999.99")]
BAD = ["12,50", "1.234", "abc", "", "1,25.0", ",100", "1,2345"]
for text, want in GOOD:
    assert parse_amount(text) == Decimal(want), (text, parse_amount(text))
print("amounts read:", len(GOOD), "of", len(GOOD), "-", [str(parse_amount(t)) for t, _ in GOOD[:3]], "...")
for text in BAD:
    try:
        parse_amount(text)
    except ValueError:
        continue
    raise AssertionError(f"{text!r} must be refused")
print("amounts refused:", len(BAD), "of", len(BAD), "-", BAD[:4], "...")
assert isinstance(parse_amount("12.5"), Decimal) and str(parse_amount("12.5")) == "12.50"
print("the type is Decimal, never float:", repr(parse_amount("12.5")))
print("tests passed")
