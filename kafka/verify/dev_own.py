"""Run a section that starts clusters of its own, and print what it recorded. Usage: dev_own.py replication.record_replication"""
import importlib
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from recorder import Rec, show

if __name__ == '__main__':
    rec = Rec()
    for spec in sys.argv[1:]:
        mod, fn = spec.split('.')
        getattr(importlib.import_module(mod), fn)(rec)
    show(rec)
    sys.stdout.flush()
    import os
    os._exit(0)        # the Kafka client has threads that can keep a finished program alive
