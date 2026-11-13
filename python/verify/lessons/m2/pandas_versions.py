"""The same file, run in two environments: pandas 2.3.3 on Python 3.13, and pandas 3.1.1 on Python 3.14."""
import sys
import warnings

import pandas as pd

print(sys.version.split()[0], "with pandas", pd.__version__)

print("dtype of a column of strings:", pd.Series(["a", "b"]).dtype)

df = pd.DataFrame({"a": [1, 2, 3]})
column = df["a"]
column.iloc[0] = 99
print("df after changing the column object:", df["a"].tolist())

print("dtype of parsed timestamps:", pd.to_datetime(["2026-03-01 10:00:00"]).dtype)

df2 = pd.DataFrame({"a": [1, 2, 3]})
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    df2[df2["a"] > 1]["a"] = 0
print("chained assignment warned with:", [type(w.message).__name__ for w in caught], "and left", df2["a"].tolist())
