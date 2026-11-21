import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from lakehouse import config  # noqa: E402
from lakehouse.spark import session  # noqa: E402


@pytest.fixture(scope='session')
def spark():
    return session('brewline-tests')


@pytest.fixture()
def home(tmp_path):
    """A lakehouse folder of its own for one test."""
    config.set_home(str(tmp_path))
    return tmp_path
