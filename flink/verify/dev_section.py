"""Development helper: run one section on the clusters of dev_up.py (Flink) and dev_kafka_up.py (Kafka), and print what it recorded.   python3 dev_section.py world"""
import importlib
import sys
import time

import fcluster as F
import recorder
import capture_flink

name = sys.argv[1]
_, kafka, mod, fn = [s for s in capture_flink.SECTIONS if s[0] == name][0]
f = F.Flink(work='/tmp/flink-dev', keep=True)
rec = recorder.Rec()
t0 = time.time()
if kafka:
    import cluster as C
    kc = C.Cluster.attach('/tmp/kafka-flinkdev', nodes=1)
    getattr(importlib.import_module(mod), fn)(f, kc, rec)
else:
    getattr(importlib.import_module(mod), fn)(f, rec)
recorder.show(rec)
print('took %.0fs' % (time.time() - t0))
import os
sys.stdout.flush()
os._exit(0)
