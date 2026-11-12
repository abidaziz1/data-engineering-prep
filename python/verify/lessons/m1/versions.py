"""What this course ran on."""
import platform
import sys
from importlib.metadata import version

print(sys.version.split(" (")[0], platform.python_implementation(), platform.machine())
for name in ["pandas", "polars", "pyarrow", "duckdb", "sqlalchemy", "pydantic", "pytest", "mypy", "ruff"]:
    print(f"{name:<11}{version(name)}")
