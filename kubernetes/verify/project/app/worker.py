"""A job that runs until it is stopped. With HANDLE_TERM=1 it finishes its batch when it gets SIGTERM."""
import os
import signal
import sys
import time


def stop(signum, frame):
    print("got SIGTERM, finishing the batch", flush=True)
    sys.exit(0)


if os.environ.get("HANDLE_TERM") == "1":
    signal.signal(signal.SIGTERM, stop)

print("worker started as process", os.getpid(), flush=True)
while True:
    time.sleep(0.2)
