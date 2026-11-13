"""Paths with pathlib, a partitioned layout, and the sort that surprises people."""
import pathlib
import tempfile

root = pathlib.Path(tempfile.mkdtemp())
for name in ["part-1.csv", "part-2.csv", "part-10.csv", "notes.txt"]:
    (root / "dt=2026-03-14").mkdir(parents=True, exist_ok=True)
    (root / "dt=2026-03-14" / name).write_text("x")

p = root / "dt=2026-03-14" / "part-1.csv"
print("name:", p.name, " stem:", p.stem, " suffix:", p.suffix, " parent folder:", p.parent.name)
print("another extension:", p.with_suffix(".parquet").name)
print("is a file:", p.is_file(), " exists:", (root / "nothing").exists())

files = [f.name for f in (root / "dt=2026-03-14").glob("part-*.csv")]
print("\nsorted as text:   ", sorted(files))
print("sorted by number: ", sorted(files, key=lambda n: int(n.split("-")[1].split(".")[0])))
print("zero-padded names sort correctly as text:", sorted(["part-0001.csv", "part-0002.csv", "part-0010.csv"]))
