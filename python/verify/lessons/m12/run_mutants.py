"""Mutation testing by hand: change one thing in orders.py, run the tests, and see whether they notice."""
import pathlib
import shutil
import subprocess
import sys
import tempfile

MUTANTS = [
    ("is_large: >= becomes >", "total_cents >= limit_cents", "total_cents > limit_cents"),
    ("discount: qty >= 10 becomes > 10", "qty >= 10", "qty > 10"),
    ("discount: the cap 5,000 becomes 50,000", "5_000)", "50_000)"),
    ("clean_store: title() becomes upper()", ".title()", ".upper()"),
    ("clean_store: an empty name is no longer None", "return name or None", "return name"),
    ("to_cents: the scale 100 becomes 10", "amount * 100", "amount * 10"),
    ("to_cents: the decimals check is inverted", "amount != amount.quantize", "amount == amount.quantize"),
]


def passes(source, suite):
    with tempfile.TemporaryDirectory() as folder:
        folder = pathlib.Path(folder)
        (folder / "orders.py").write_text(source)
        shutil.copy(suite, folder / suite.name)
        run = subprocess.run([sys.executable, "-m", "pytest", "-q", "-x", "-p", "no:cacheprovider", suite.name], cwd=folder, capture_output=True, text=True)
        return run.returncode == 0


here = pathlib.Path(__file__).parent
original = (here / "orders.py").read_text()
for suite in ("test_weak.py", "test_strong.py"):
    suite = here / suite
    assert passes(original, suite), "the tests must pass on the real code"
    survived = [name for name, old, new in MUTANTS if passes(original.replace(old, new, 1), suite)]
    print(f"{suite.name}: {len(MUTANTS) - len(survived)} of {len(MUTANTS)} mutants caught")
    for name in survived:
        print(f"  survived: {name}")
