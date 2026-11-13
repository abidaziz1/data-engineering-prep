"""Runs inside the Airflow environment, for verify_af.py. Prints one line, RESULT{json}.

  names   stdin: {id: code}. For each snippet: run its import statements, keep the deprecation warnings, and check every keyword argument of the Airflow
          calls against the signatures of the installed Airflow 3.4.0, and every string trigger_rule against the TriggerRule enum.
  files   stdin: {id: path}. Load each file with its own DagBag and report the DAGs and the import errors.
"""
import ast
import inspect
import io
import json
import os
import sys
import warnings

os.environ.setdefault("AIRFLOW__LOGGING__LOGGING_LEVEL", "CRITICAL")
warnings.simplefilter("ignore")


def emit(obj):
    sys.stdout.write("RESULT" + json.dumps(obj) + "\n")


def allowed_kwargs(obj):
    names, var_kw, targets = set(), False, []
    if inspect.isclass(obj):
        for klass in obj.__mro__:
            init = klass.__dict__.get("__init__")
            if init is not None:
                targets.append(init)
    else:
        targets.append(obj)
    for t in targets:
        try:
            sig = inspect.signature(t)
        except (TypeError, ValueError):
            continue
        for p in sig.parameters.values():
            if p.kind == p.VAR_KEYWORD:
                var_kw = True
            elif p.kind in (p.POSITIONAL_OR_KEYWORD, p.KEYWORD_ONLY):
                names.add(p.name)
    return names, var_kw


def cmd_names():
    from airflow.sdk import DAG, TriggerRule
    from airflow.sdk.bases.operator import BaseOperator

    rules = {r.value for r in TriggerRule}
    task_extra = {"multiple_outputs", "python_callable", "op_args", "op_kwargs", "templates_dict", "show_return_value_in_logs", "task_id", "map_index_template"}
    snippets = json.loads(sys.stdin.read())
    out = {}
    for sid, code in snippets.items():
        res = {"imports_failed": [], "warnings": [], "bad_kwargs": [], "bad_values": []}
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            out[sid] = {"syntax": str(e)}
            continue
        ns = {}
        for node in [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]:
            src = ast.unparse(node)
            if not (src.startswith("from airflow") or src.startswith("import airflow")):
                continue
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter("always")
                try:
                    exec(compile(ast.Module(body=[node], type_ignores=[]), "<snippet>", "exec"), ns)
                except Exception as e:
                    res["imports_failed"].append([src, type(e).__name__ + ": " + str(e).split(" (")[0]])
            for w in caught:
                res["warnings"].append([src, str(w.message)])
        for node in ast.walk(tree):
            decos = []
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                decos = [d for d in node.decorator_list if isinstance(d, ast.Call)]
            calls = decos + ([node] if isinstance(node, ast.Call) else [])
            for call in calls:
                f = call.func
                obj, label, kind = None, None, None
                if isinstance(f, ast.Name) and f.id in ns:
                    obj, label = ns[f.id], f.id
                elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == "task" and f.attr in ("branch", "sensor", "short_circuit", "virtualenv", "docker"):
                    label, kind = "task." + f.attr, "task"
                if obj is None and kind is None:
                    continue
                if label in ("dag",):
                    names, var_kw = allowed_kwargs(DAG)
                elif label == "task" or kind == "task":
                    names, var_kw = allowed_kwargs(BaseOperator)
                    names |= task_extra
                else:
                    try:
                        names, var_kw = allowed_kwargs(obj)
                    except Exception:
                        continue
                    if not names:
                        continue
                    if inspect.isclass(obj) and any(c.__name__ == "BaseOperator" for c in obj.__mro__):
                        names |= allowed_kwargs(BaseOperator)[0] | {"deferrable"}
                for kw in call.keywords:
                    if kw.arg is None:
                        continue
                    if kw.arg not in names and not (var_kw and label not in ("dag", "task") and not inspect.isclass(obj)):
                        res["bad_kwargs"].append([label, kw.arg])
                    if kw.arg == "trigger_rule" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str) and kw.value.value not in rules:
                        res["bad_values"].append(["trigger_rule", kw.value.value])
        out[sid] = res
    emit(out)


def cmd_files():
    from airflow.dag_processing.dagbag import DagBag

    spec = json.loads(sys.stdin.read())
    out = {}
    for sid, path in spec.items():
        # the DAG processor has the folder of the DAGs on sys.path, so a DAG file can import the modules next to it
        sys.path.insert(0, os.path.dirname(path))
        stdout, stderr = sys.stdout, sys.stderr
        sys.stdout, sys.stderr = io.StringIO(), io.StringIO()
        try:
            bag = DagBag(dag_folder=path)
        finally:
            sys.stdout, sys.stderr = stdout, stderr
        out[sid] = {"dags": sorted(bag.dags), "errors": {os.path.basename(k): v.strip().splitlines()[-1] for k, v in bag.import_errors.items()}}
    emit(out)


if __name__ == "__main__":
    globals()["cmd_" + sys.argv[1]]()
