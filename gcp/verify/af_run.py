"""Runs inside the Airflow environment (Airflow 3 with the Google provider) and prints what Airflow itself says about the DAG files in dags/.

Nothing here talks to Google. Airflow reads the files, builds the DAGs, renders the templates and runs the tasks that need no cloud (the flaky demo).
Run: python af_run.py   (needs apache-airflow and apache-airflow-providers-google; the recorder calls it with the interpreter named by GCP_AIRFLOW_PYTHON)
"""
import contextlib
import datetime
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
HOME = tempfile.mkdtemp(prefix='af-home-')
os.environ.update({'AIRFLOW_HOME': HOME, 'AIRFLOW__CORE__LOAD_EXAMPLES': 'False', 'AIRFLOW__CORE__DAGS_FOLDER': os.path.join(HERE, 'dags'),
                   'FLAKY_COUNT_FILE': os.path.join(HOME, 'flaky_count'), 'AIRFLOW__LOGGING__LOGGING_LEVEL': 'CRITICAL'})
warnings.filterwarnings('ignore')


def quiet(fn, *a, **kw):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        return fn(*a, **kw)


def main():
    exe = os.path.join(os.path.dirname(sys.executable), 'airflow')
    subprocess.run([exe, 'db', 'migrate'], capture_output=True, check=True)
    from airflow.dag_processing.dagbag import DagBag
    out = {}
    bag = quiet(DagBag, dag_folder=os.path.join(HERE, 'dags'))
    out['dags'] = sorted(bag.dags)
    out['import_errors'] = {os.path.basename(k): v.strip().splitlines()[-1] for k, v in bag.import_errors.items()}
    dag = bag.dags['brewline_daily']
    out['brewline_daily'] = {'schedule': str(dag.schedule), 'tasks': [t.task_id for t in dag.topological_sort()], 'catchup': dag.catchup,
                             'edges': [[t.task_id, sorted(t.downstream_task_ids)] for t in dag.topological_sort()],
                             'retries': {t.task_id: t.retries for t in dag.topological_sort()},
                             'bq_template_fields': list(dag.get_task('merge_orders').template_fields)}
    r = subprocess.run([exe, 'tasks', 'render', 'brewline_daily', 'merge_orders', '2026-11-10'], capture_output=True, text=True, env=dict(os.environ))
    block = r.stdout.split('# property: configuration')[1].split('# property:')[0]
    out['render'] = [l for l in block.splitlines() if l.strip() and not l.startswith('#')][0]
    flaky = bag.dags['flaky_demo']
    run = quiet(flaky.test)
    out['flaky'] = {'state': str(run.state), 'tasks': [{'task': ti.task_id, 'state': str(ti.state), 'tries': ti.try_number} for ti in sorted(run.get_task_instances(), key=lambda t: t.task_id)]}
    t0 = time.perf_counter()
    quiet(DagBag, dag_folder=os.path.join(HERE, 'dags', 'brewline_daily.py'))
    clean = time.perf_counter() - t0
    t0 = time.perf_counter()
    quiet(DagBag, dag_folder=os.path.join(HERE, 'dags', 'heavy_top_level.py'))
    heavy = time.perf_counter() - t0
    out['parse'] = {'sleep_at_top_seconds': 2, 'slower_by_seconds': round(heavy - clean, 1), 'slower_by_at_least_1_9': (heavy - clean) >= 1.9}
    out['airflow_version'] = __import__('airflow').__version__
    print('RESULT' + json.dumps(out))


main()
