"""What a traceback looks like when one error causes another. Read it from the bottom."""


def to_cents(text):
    try:
        return round(float(text) * 100)
    except ValueError as err:
        raise ValueError(f"order total {text!r} is not a number") from err


print(to_cents("12.50"))
print(to_cents("12,50"))
