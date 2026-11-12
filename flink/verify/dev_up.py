"""Development helper: start a Flink cluster that stays up after this program ends (folder /tmp/flink-dev). Stop it with dev_down.py."""
import sys
import fcluster as F

f = F.Flink(work='/tmp/flink-dev', keep=True, jars=[F.KAFKA_JAR] if F.KAFKA_JAR else [])
f.start()
print('up:', f.rest('/overview'))
