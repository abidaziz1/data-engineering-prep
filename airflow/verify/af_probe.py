"""Runs inside the Airflow environment and prints what Airflow itself says. The recorder (capture_af.py) calls it as a subprocess, one command at a time,
with AIRFLOW_HOME and the DAG folder set in the environment, and reads the line that starts with RESULT.

Nothing here talks to a cloud. Airflow reads DAG files, builds timetables, renders templates and runs tasks on the machine.

    python af_probe.py dagbag                      read the DAG folder: DAG ids, tasks, edges, schedules, import errors
    python af_probe.py test DAG_ID [LOGICAL_DATE]  run one DAG with dag.test() and print states, tries and XCom values
    python af_probe.py timetable SPEC_JSON         ask a timetable for its next runs (the same call the scheduler makes)
    python af_probe.py imports                     try old and new import paths and keep the warnings
"""
import contextlib
import datetime
import io
import json
import os
import sys
import time
import warnings

warnings.filterwarnings("ignore")
os.environ.setdefault("AIRFLOW__LOGGING__LOGGING_LEVEL", "CRITICAL")


def quiet(fn, *a, **kw):
    """Call fn and return (result, everything that it printed). Airflow prints a lot to stderr."""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        res = fn(*a, **kw)
    return res, buf.getvalue()


def emit(obj):
    print("RESULT" + json.dumps(obj, default=str))


def first_line_of_error(text):
    lines = [ln for ln in text.strip().splitlines() if ln.strip()]
    return lines[-1] if lines else ""


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_dagbag(folder=None):
    from airflow.dag_processing.dagbag import DagBag
    folder = folder or os.environ["AIRFLOW__CORE__DAGS_FOLDER"]
    bag, _ = quiet(DagBag, dag_folder=folder)
    out = {"dags": {}, "import_errors": {}}
    for dag_id, dag in sorted(bag.dags.items()):
        tasks = list(dag.topological_sort())
        out["dags"][dag_id] = {
            "file": os.path.basename(dag.fileloc),
            "schedule": str(dag.schedule) if not callable(dag.schedule) else "callable",
            "timetable": type(dag.timetable).__name__,
            "catchup": dag.catchup,
            "tasks": [t.task_id for t in tasks],
            "edges": [[t.task_id, sorted(t.downstream_task_ids)] for t in tasks],
            "retries": {t.task_id: t.retries for t in tasks},
            "trigger_rules": {t.task_id: str(getattr(t.trigger_rule, "value", t.trigger_rule)) for t in tasks},
            "operators": {t.task_id: type(t).__name__ for t in tasks},
            "tags": sorted(dag.tags),
            "owner": sorted({t.owner for t in tasks}),
            "max_active_runs": dag.max_active_runs,
            "max_active_tasks": dag.max_active_tasks,
        }
    for path, err in bag.import_errors.items():
        out["import_errors"][os.path.basename(path)] = first_line_of_error(err)
    emit(out)


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_test(dag_id, logical_date=None):
    import pendulum
    from airflow.dag_processing.dagbag import DagBag
    folder = os.environ["AIRFLOW__CORE__DAGS_FOLDER"]
    bag, _ = quiet(DagBag, dag_folder=folder)
    dag = bag.dags[dag_id]
    kw = {}
    if logical_date and logical_date != "none":
        kw["logical_date"] = pendulum.parse(logical_date)
    if os.environ.get("AF_PROBE_CONF"):
        kw["run_conf"] = json.loads(os.environ["AF_PROBE_CONF"])
    t0 = time.perf_counter()
    run, console = quiet(dag.test, **kw)
    seconds = time.perf_counter() - t0
    tis = []
    for ti in sorted(run.get_task_instances(), key=lambda t: (t.task_id, t.map_index)):
        tis.append({"task_id": ti.task_id, "map_index": ti.map_index, "state": str(getattr(ti.state, "value", ti.state)), "try_number": ti.try_number})
    if os.environ.get("AF_PROBE_NOCONSOLE"):
        console = ""
    emit({"dag_id": dag_id, "state": str(getattr(run.state, "value", run.state)), "run_id": run.run_id, "logical_date": str(run.logical_date),
          "run_type": str(getattr(run.run_type, "value", run.run_type)), "tis": tis, "seconds": round(seconds, 2), "console": console})


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_idem(dag_id, table, db, dates):
    """Run a load DAG for each date in turn, in one process, and count the rows of its table after every run."""
    import sqlite3
    import pendulum
    from airflow.dag_processing.dagbag import DagBag
    bag, _ = quiet(DagBag, dag_folder=os.environ["AIRFLOW__CORE__DAGS_FOLDER"])
    dag = bag.dags[dag_id]
    out = []
    for d in dates.split(","):
        quiet(dag.test, logical_date=pendulum.parse(d))
        con = sqlite3.connect(db)
        per_day = dict(con.execute("SELECT dt, count(*) FROM %s GROUP BY dt ORDER BY dt" % table).fetchall())
        con.close()
        out.append({"day": d, "rows": sum(per_day.values()), "per_day": per_day})
    emit(out)


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_incremental(db):
    """Two incremental loads of one source table. A row arrives late, and each load runs again for the same day."""
    import sqlite3
    import pendulum
    from airflow.dag_processing.dagbag import DagBag
    bag, _ = quiet(DagBag, dag_folder=os.environ["AIRFLOW__CORE__DAGS_FOLDER"])
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE IF NOT EXISTS source_orders (order_id TEXT PRIMARY KEY, updated_at TEXT, total REAL)")
    con.execute("DELETE FROM source_orders")
    con.executemany("INSERT INTO source_orders VALUES (?, ?, ?)", [("O-1", "2026-03-14 10:00:00", 12.5), ("O-2", "2026-03-14 11:00:00", 8.0)])
    for t in ("orders_window", "orders_lookback"):
        con.execute("DROP TABLE IF EXISTS " + t)
    con.commit()
    steps = []

    def run(dag_id, day):
        quiet(bag.dags[dag_id].test, logical_date=pendulum.parse(day))

    def snap(label, day, source_rows):
        out = {"step": label, "day": day, "source": source_rows}
        for dag_id, t in (("brewline_incr_window", "orders_window"), ("brewline_incr_lookback", "orders_lookback")):
            c = sqlite3.connect(db)
            try:
                out[dag_id] = [r[0] for r in c.execute("SELECT order_id FROM %s ORDER BY order_id" % t).fetchall()]
            except sqlite3.OperationalError:
                out[dag_id] = []
            c.close()
        steps.append(out)

    src = lambda: [r[0] for r in sqlite3.connect(db).execute("SELECT order_id FROM source_orders ORDER BY order_id").fetchall()]
    for d in ("brewline_incr_window", "brewline_incr_lookback"):
        run(d, "2026-03-14")
    snap("the run of 14 March", "2026-03-14", src())
    con.executemany("INSERT INTO source_orders VALUES (?, ?, ?)", [("O-3", "2026-03-15 09:00:00", 21.0), ("O-4", "2026-03-14 23:30:00", 5.5)])
    con.commit()
    for d in ("brewline_incr_window", "brewline_incr_lookback"):
        run(d, "2026-03-15")
    snap("the run of 15 March, after O-3 and a late O-4 arrived", "2026-03-15", src())
    for d in ("brewline_incr_window", "brewline_incr_lookback"):
        run(d, "2026-03-15")
    snap("the run of 15 March again", "2026-03-15", src())
    emit(steps)


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_rules():
    from airflow.task.trigger_rule import TriggerRule
    emit([r.value for r in TriggerRule])


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_parse_cost(path, repeats="5"):
    """Parse one DAG file again and again with a fresh DagBag, and return the wall time of each parse in seconds."""
    from airflow.dag_processing.dagbag import DagBag
    times = []
    for _ in range(int(repeats)):
        t0 = time.perf_counter()
        quiet(DagBag, dag_folder=path)
        times.append(round(time.perf_counter() - t0, 4))
    emit({"path": os.path.basename(path), "times": times})


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_timetable(spec_json):
    """spec: {kind, args, start, catchup, n, latest}. Walks the timetable like the scheduler does and returns the runs."""
    import pendulum
    from airflow.timetables.base import TimeRestriction
    spec = json.loads(spec_json)
    kind, args = spec["kind"], spec.get("args", {})
    if kind == "CronDataIntervalTimetable":
        from airflow.timetables.interval import CronDataIntervalTimetable as T
    elif kind == "CronTriggerTimetable":
        from airflow.timetables.trigger import CronTriggerTimetable as T
    elif kind == "DeltaDataIntervalTimetable":
        from airflow.timetables.interval import DeltaDataIntervalTimetable as T
        args = dict(args, delta=datetime.timedelta(**args["delta"]))
    elif kind == "DeltaTriggerTimetable":
        from airflow.timetables.trigger import DeltaTriggerTimetable as T
        args = dict(args, delta=datetime.timedelta(**args["delta"]))
    elif kind == "EventsTimetable":
        from airflow.timetables.events import EventsTimetable as T
        args = dict(args, event_dates=[pendulum.parse(x) for x in args["event_dates"]])
    elif kind == "MultipleCronTriggerTimetable":
        from airflow.timetables.trigger import MultipleCronTriggerTimetable as T
    else:
        raise SystemExit("unknown timetable " + kind)
    if "interval" in args and isinstance(args["interval"], dict):
        args = dict(args, interval=datetime.timedelta(**args["interval"]))
    args = dict(args)
    cron_or_delta = args.pop("expr", None)
    exprs = args.pop("exprs", None)
    if exprs:
        tt = T(*exprs, **args)
    else:
        tt = T(cron_or_delta, **args) if cron_or_delta is not None else T(**args)
    start = pendulum.parse(spec["start"])
    latest = pendulum.parse(spec["latest"]) if spec.get("latest") else None
    restriction = TimeRestriction(earliest=start, latest=latest, catchup=spec.get("catchup", True))
    runs, info, last = [], None, None
    for _ in range(spec.get("n", 3)):
        info = tt.next_dagrun_info_v2(last_dagrun_info=last, restriction=restriction)
        if info is None:
            break
        di = info.data_interval
        row = {"interval_start": str(di.start) if di else None, "interval_end": str(di.end) if di else None, "run_after": str(info.run_after),
               "logical_date": str(info.logical_date) if info.logical_date else None}
        if spec.get("show_tz"):
            row["run_after_local"] = info.run_after.in_timezone(spec["show_tz"]).format("YYYY-MM-DD HH:mm:ss zz")
        runs.append(row)
        last = info
    manual = []
    for when in spec.get("manual_at", []):
        try:
            di = tt.infer_manual_data_interval(run_after=pendulum.parse(when))
            manual.append({"run_after": when, "interval_start": str(di.start), "interval_end": str(di.end)})
        except Exception as e:
            manual.append({"run_after": when, "error": type(e).__name__})
    emit({"kind": kind, "summary": tt.summary, "description": getattr(tt, "description", None), "runs": runs, "manual": manual})


# ------------------------------------------------------------------------------------------------------------------------------------------
def cmd_imports():
    import importlib
    stmts = sys.stdin.read().strip().splitlines()
    results = []
    for stmt in stmts:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            try:
                exec(stmt, {})
                status, error = "works", ""
            except Exception as e:
                status, error = "fails", "%s: %s" % (type(e).__name__, str(e).split(" (")[0])
        msgs = []
        for w in caught:
            m = str(w.message)
            if m not in msgs:
                msgs.append(m)
        results.append({"stmt": stmt, "status": status, "error": error, "warnings": msgs})
    emit(results)


def cmd_retry_grid():
    """Airflow's own retry-delay function (TaskInstance._compute_retry_deadline) on a fake task instance, for every setting the retry lab offers."""
    import datetime
    import logging
    import types

    from airflow.models.taskinstance import TaskInstance

    base = datetime.datetime(2026, 3, 14, 0, 0, 0, tzinfo=datetime.timezone.utc)
    logical = datetime.datetime(2026, 3, 14, 0, 0, 0, tzinfo=datetime.timezone.utc)
    rows = []
    for delay in (1, 5, 30):
        for mult in (0, 2, 3):
            for cap in (None, 10, 60):
                waits = []
                for k in range(1, 6):
                    task = types.SimpleNamespace(
                        retry_delay=datetime.timedelta(seconds=delay),
                        retry_exponential_backoff=mult,
                        max_retry_delay=datetime.timedelta(seconds=cap) if cap else None,
                    )
                    fake = types.SimpleNamespace(retry_delay_override=None, task=task, dag_id="brewline_backoff", task_id="call_partner",
                                                 logical_date=logical, log=logging.getLogger("retry_grid"))
                    due = TaskInstance._compute_retry_deadline(fake, failed_try_number=k, failed_end_date=base)
                    waits.append((due - base).total_seconds())
                rows.append({"delay": delay, "mult": mult, "cap": cap, "waits": waits})
    emit({"dag_id": "brewline_backoff", "task_id": "call_partner", "logical_date": str(logical), "rows": rows})


if __name__ == "__main__":
    cmd, *rest = sys.argv[1:]
    globals()["cmd_" + cmd](*rest)
