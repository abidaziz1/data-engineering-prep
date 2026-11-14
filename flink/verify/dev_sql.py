"""Development helper: run a SQL file against the cluster of dev_up.py and print the cleaned output."""
import sys
import fcluster as F

f = F.Flink(work='/tmp/flink-dev', keep=True)
rc, out, err = f.sql(open(sys.argv[1]).read(), name='dev')
print('rc', rc)
print(F.strip_ansi(out))
if err.strip():
    print('--- stderr'); print(F.strip_ansi(err)[-2000:])
