"""Start a three-node cluster that stays up after this script ends, for working on the recorder. Stop it with dev_down.py. Not used by the recorder itself."""
import os
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cluster as C

WORK = os.environ.get('KAFKA_DEV_WORK', '/tmp/kafka-dev')
if __name__ == '__main__':
    c = C.Cluster(work=WORK, keep=True)
    c.start()
    print('up:', c.bootstrap, 'work:', WORK)
