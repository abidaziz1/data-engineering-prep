"""A job that stops while it writes. Two ways to write the same file."""
import os
import pathlib
import tempfile

rows = [f"O-{i},{i * 2.5}\n" for i in range(1, 6)]
target = pathlib.Path("orders.csv")
target.write_text("order_id,total\nO-0,1.0\n")  # last night's complete file


def write_in_place(path, rows, fail_after):
    with open(path, "w") as f:
        f.write("order_id,total\n")
        for n, r in enumerate(rows):
            if n == fail_after:
                raise RuntimeError("the job was killed")
            f.write(r)


def write_atomically(path, rows, fail_after):
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write("order_id,total\n")
            for n, r in enumerate(rows):
                if n == fail_after:
                    raise RuntimeError("the job was killed")
                f.write(r)
        os.replace(tmp, path)  # one step: the new file replaces the old one
    except BaseException:
        os.unlink(tmp)
        raise


def lines(path):
    return len(path.read_text().splitlines()) - 1


try:
    write_in_place(target, rows, fail_after=3)
except RuntimeError as e:
    print("in place:   ", e, "-> the file now has", lines(target), "of 5 orders, and last night's file is gone")

target.write_text("order_id,total\nO-0,1.0\n")
try:
    write_atomically(target, rows, fail_after=3)
except RuntimeError as e:
    print("atomically: ", e, "-> the file still has", lines(target), "order from last night, nothing half written")

write_atomically(target, rows, fail_after=99)
print("atomically, no failure: the file has", lines(target), "orders;", sorted(p.name for p in pathlib.Path(".").iterdir() if p.suffix == ".tmp"), "temporary files are left")
