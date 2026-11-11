import os
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cluster as C

WORK = os.environ.get('KAFKA_DEV_WORK', '/tmp/kafka-dev')
if __name__ == '__main__':
    c = C.Cluster.attach(WORK)
    c.close()
    import shutil
    shutil.rmtree(WORK, ignore_errors=True)
    print('down')
