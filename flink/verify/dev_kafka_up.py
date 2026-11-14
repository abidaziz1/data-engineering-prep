"""Development helper: start a one-node Kafka that stays up after this program ends (folder /tmp/kafka-flinkdev, port 9092). Stop it with dev_kafka_down.py."""
import fx           # noqa: F401  (puts the Kafka course's verify folder on the path)
import cluster as C

c = C.Cluster(nodes=1, work='/tmp/kafka-flinkdev', keep=True, heap='512m')
c.start()
print('up:', c.bootstrap)
