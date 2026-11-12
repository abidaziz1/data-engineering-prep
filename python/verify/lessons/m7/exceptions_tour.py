"""try, except, else and finally: which block runs when, and what `raise ... from` keeps."""


def parse_total(text):
    print(f"  parsing {text!r}")
    try:
        value = float(text)
    except ValueError as err:
        raise ValueError(f"order total {text!r} is not a number") from err
    else:
        print("  else: no error, so this runs")
        return value
    finally:
        print("  finally: this runs either way")


print("a good value:")
print("  result:", parse_total("12.50"))

print("a bad value:")
try:
    parse_total("12,50")
except ValueError as err:
    print("  caught:", err)
    print("  the cause:", repr(err.__cause__))

print("a value of the wrong type:")
try:
    parse_total(None)
except TypeError as err:
    print("  the ValueError handler did not catch it, the caller did:", type(err).__name__)
