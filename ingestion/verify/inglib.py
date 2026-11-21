"""Helpers of the recorder for the ingestion course: run the programs of verify/project with the interpreter that has dlt and with the interpreter that has PyAirbyte, clean what they print,
and write js/real.js. Everything runs in temporary folders that the programs make themselves, so nothing of the machine is read or changed.

Two interpreters, because the two libraries do not install together on one Python:
  DLT_PY       an interpreter with dlt[duckdb] (the recording used dlt 1.32.0 and DuckDB 1.5.6 on Python 3.13)
  AIRBYTE_PY   an interpreter with PyAirbyte (the recording used airbyte 0.71.3 on Python 3.11). PyAirbyte installs the connector airbyte-source-faker from PyPI.
               The connector registry of Airbyte is not reached: AIRBYTE_OFFLINE_MODE=1 and an explicit pip_url do the same job without it."""
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PROJECT = HERE / 'project'
DLT_PY = os.environ.get('DLT_PY', sys.executable)
AIRBYTE_PY = os.environ.get('AIRBYTE_PY', '')
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def sh(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


def mask(s):
    """The only things that change from one recording to the next are dates and temporary paths. Programs never print them, so this only trims the lines."""
    return '\n'.join(line.rstrip() for line in s.split('\n'))


def program(name, py=None, cwd=None, timeout=900):
    """Run one program of verify/project. Returns (exit code, what it printed on stdout). Warnings and logs go to stderr and are not part of the recording."""
    py = py or DLT_PY
    env = dict(os.environ, PYTHONPATH=str(PROJECT), PYTHONDONTWRITEBYTECODE='1', PYTHONWARNINGS='ignore', AIRBYTE_OFFLINE_MODE='1', DO_NOT_TRACK='1', RUNTIME__DLTHUB_TELEMETRY='false')
    r = sh([py, '-X', 'utf8', '-B', PROJECT / name], cwd=cwd or tempfile.mkdtemp(prefix='ing-'), env=env, timeout=timeout)
    if r.returncode:
        return r.returncode, r.stdout + '\n' + r.stderr[-1500:]
    return 0, mask(r.stdout.rstrip('\n'))


def T(key, s):
    R['text'][key] = mask(s).strip('\n')
    return R['text'][key]


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
    return path
