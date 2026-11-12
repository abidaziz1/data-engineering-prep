"""Text is characters. A file is bytes. An encoding is the rule between them."""
for text in ["Zoe", "Zoë", "café", "東京"]:
    print(f"{text!r}")
    for enc in ["utf-8", "latin-1", "utf-16"]:
        try:
            data = text.encode(enc)
            print(f"   {enc:<8} {len(data)} bytes  {data.hex(' ')}")
        except UnicodeEncodeError as e:
            print(f"   {enc:<8} cannot encode: {e.reason}")

data = "café".encode("utf-8")
print()
print("the bytes of 'café' in UTF-8, read as latin-1:", data.decode("latin-1"))
print("the bytes of 'café' in latin-1, read as UTF-8:", end=" ")
try:
    "café".encode("latin-1").decode("utf-8")
except UnicodeDecodeError as e:
    print("UnicodeDecodeError:", e.reason, "at byte", e.start)
print("the same bytes, errors='replace':", "café".encode("latin-1").decode("utf-8", errors="replace"))
print("a file saved with a byte order mark:", repr(b"\xef\xbb\xbforder_id".decode("utf-8")), "against", repr(b"\xef\xbb\xbforder_id".decode("utf-8-sig")))
