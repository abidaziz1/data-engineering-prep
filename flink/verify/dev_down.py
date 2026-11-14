"""Development helper: stop the cluster that dev_up.py started and delete its folder."""
import fcluster as F

f = F.Flink(work='/tmp/flink-dev', keep=False)
f.close()
print('down')
