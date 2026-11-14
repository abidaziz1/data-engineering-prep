"""Development helper: stop the one-node Kafka of dev_kafka_up.py and delete its folder."""
import shutil
import fx           # noqa: F401
import cluster as C

c = C.Cluster.attach('/tmp/kafka-flinkdev', nodes=1)
c.close()
shutil.rmtree('/tmp/kafka-flinkdev', ignore_errors=True)
print('down')
