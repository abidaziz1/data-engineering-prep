"""Check a Data Factory pipeline definition against the classes of the Azure SDK for Python.

Nothing here talks to Azure. The SDK (azure-mgmt-datafactory, the 9.x line with classic models) carries the shape of the
Data Factory REST API: which activity types exist, which properties each one requires, which sources and sinks exist, and which
dependency conditions are valid. This module reads those tables and adds three rules that Data Factory itself applies when
you publish: activity names are unique, a dependency names an activity that exists, and the dependencies have no loop.
It is a checker built on the SDK models, not Data Factory. A pipeline that passes can still fail at run time.

Usage:  python3 azure/verify/adf_check.py file.json [file2.json ...]      prints one JSON line for each file
"""
import json
import logging
import pathlib
import re
import sys

from azure.mgmt.datafactory import models as m

logging.getLogger("azure").setLevel(logging.ERROR)     # the SDK warns about an unknown subtype; this module reports it itself


def subtypes(cls):
    """Every type name below a base class. The SDK nests them: a source type can sit under TabularSource, for example."""
    names = set()
    own = cls.__dict__.get("_subtype_map") or {}      # a subclass inherits the map of its parent, so read only the class's own
    for name, cname in own.get("type", {}).items():
        names.add(name)
        sub = getattr(m, cname, None)
        if sub is not None and sub is not cls:
            names |= subtypes(sub)
    return names


ACTIVITY_TYPES = subtypes(m.Activity) - {"Execution", "Container"}
SOURCE_TYPES = subtypes(m.CopySource)
SINK_TYPES = subtypes(m.CopySink)
CONDITIONS = {c.value for c in m.DependencyCondition}


def _json_key(cls, attr):
    return cls._attribute_map[attr]["key"].replace("\\.", "\x00").replace(".", ".").replace("\x00", ".")


def _walk_models(obj, path, out):
    """Collect (path, model) for a model and every model inside it."""
    if isinstance(obj, m.Activity) or hasattr(obj, "_attribute_map"):
        out.append((path, obj))
        for attr in obj._attribute_map:
            _walk_models(getattr(obj, attr, None), path + "." + attr, out)
    elif isinstance(obj, (list, tuple)):
        for i, x in enumerate(obj):
            _walk_models(x, path + "[" + str(i) + "]", out)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            _walk_models(v, path + "." + str(k), out)


def _expressions(node, path=""):
    """Every string that Data Factory reads as an expression: an Expression object, or a string that starts with @ or holds @{...}."""
    if isinstance(node, dict):
        if node.get("type") == "Expression" and isinstance(node.get("value"), str):
            yield path, node["value"]
        for k, v in node.items():
            if k == "value" and node.get("type") == "Expression":
                continue
            yield from _expressions(v, path + "." + k)
    elif isinstance(node, list):
        for i, x in enumerate(node):
            yield from _expressions(x, path + "[" + str(i) + "]")
    elif isinstance(node, str) and (node.startswith("@") or "@{" in node):
        yield path, node


def _inner_ok(e):
    """The text of an expression: parentheses and square brackets must close, and a string literal must end. '' is an escaped quote."""
    depth_p = depth_s = 0
    in_q = False
    i = 0
    while i < len(e):
        ch = e[i]
        if in_q:
            if ch == "'":
                if e[i + 1:i + 2] == "'":
                    i += 1
                else:
                    in_q = False
        elif ch == "'":
            in_q = True
        elif ch == "(":
            depth_p += 1
        elif ch == ")":
            depth_p -= 1
        elif ch == "[":
            depth_s += 1
        elif ch == "]":
            depth_s -= 1
        if depth_p < 0 or depth_s < 0:
            return False
        i += 1
    return depth_p == 0 and depth_s == 0 and not in_q


def _interp_ok(s):
    """A string with @{ ... } holes: each hole must close, and the text outside the holes is free."""
    i = 0
    while True:
        j = s.find("@{", i)
        if j < 0:
            return True
        k, depth, in_q = j + 2, 1, False
        while k < len(s):
            ch = s[k]
            if in_q:
                if ch == "'":
                    if s[k + 1:k + 2] == "'":
                        k += 1
                    else:
                        in_q = False
            elif ch == "'":
                in_q = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        if depth != 0 or in_q or not _inner_ok(s[j + 2:k]):
            return False
        i = k + 1


def _balanced(expr):
    if expr.startswith("@@"):
        return True
    if expr.startswith("@") and not expr.startswith("@{"):
        return _inner_ok(expr[1:])
    return _interp_ok(expr)


def _activity_list(props):
    """All activities, including those nested in ForEach, IfCondition, Switch and Until."""
    found = []

    def visit(acts):
        for a in acts or []:
            found.append(a)
            tp = a.get("typeProperties", {})
            visit(tp.get("activities"))
            visit(tp.get("ifTrueActivities"))
            visit(tp.get("ifFalseActivities"))
            visit(tp.get("defaultActivities"))
            for c in tp.get("cases", []) or []:
                visit(c.get("activities"))
    visit(props.get("activities"))
    return found


def check(doc, datasets=None):
    """Return a list of findings. Each finding is {code, where, message}. An empty list means the checker found nothing."""
    props = doc.get("properties", doc)
    out = []

    def add(code, where, message):
        out.append({"code": code, "where": where, "message": message})

    acts = _activity_list(props)
    names = {}
    for a in acts:
        n = a.get("name")
        names[n] = names.get(n, 0) + 1
    for n, c in sorted(names.items(), key=lambda kv: str(kv[0])):
        if c > 1:
            add("DUPLICATE_ACTIVITY_NAME", n, "the name '" + str(n) + "' is used by " + str(c) + " activities")

    for a in acts:
        where = a.get("name", "?")
        t = a.get("type")
        if t not in ACTIVITY_TYPES:
            add("UNKNOWN_ACTIVITY_TYPE", where, "'" + str(t) + "' is not an activity type of the Data Factory API")
            continue
        tp = a.get("typeProperties", {})
        if t == "Copy":
            st = (tp.get("source") or {}).get("type")
            kt = (tp.get("sink") or {}).get("type")
            if st and st not in SOURCE_TYPES:
                add("UNKNOWN_SOURCE_TYPE", where, "'" + st + "' is not a copy source type")
            if kt and kt not in SINK_TYPES:
                add("UNKNOWN_SINK_TYPE", where, "'" + kt + "' is not a copy sink type")
        for dep in a.get("dependsOn", []) or []:
            if dep.get("activity") not in names:
                add("UNKNOWN_DEPENDENCY", where, "depends on '" + str(dep.get("activity")) + "', which is not an activity of this pipeline")
            for c in dep.get("dependencyConditions", []) or []:
                if c not in CONDITIONS:
                    add("INVALID_CONDITION", where, "'" + str(c) + "' is not a dependency condition. Use one of " + ", ".join(sorted(CONDITIONS)))
        if datasets is not None:
            for ref in (a.get("inputs") or []) + (a.get("outputs") or []):
                if ref.get("referenceName") not in datasets:
                    add("UNKNOWN_DATASET", where, "the dataset '" + str(ref.get("referenceName")) + "' does not exist")
        pol = a.get("policy") or {}
        if "timeout" in pol and not re.fullmatch(r"(\d+\.)?\d{1,2}:\d{2}:\d{2}", str(pol["timeout"])):
            add("INVALID_TIMEOUT", where, "the timeout '" + str(pol["timeout"]) + "' is not in the form d.hh:mm:ss")

    # required properties, from the SDK tables, for every activity the SDK can build
    try:
        res = m.PipelineResource.deserialize(doc if "properties" in doc else {"properties": doc})
    except Exception as e:  # a shape the SDK cannot read at all
        add("NOT_READABLE", "pipeline", str(e).splitlines()[0][:160])
        return out
    found = []
    _walk_models(res, "pipeline", found)
    seen = set()
    for path, obj in found:
        if not hasattr(obj, "_validation"):
            continue
        for attr, rule in obj._validation.items():
            if rule.get("required") and getattr(obj, attr, None) is None and attr != "type":
                key = _json_key(type(obj), attr)
                label = getattr(obj, "name", None) or type(obj).__name__
                if (label, key) not in seen:
                    seen.add((label, key))
                    add("MISSING_PROPERTY", str(label), "'" + key + "' is required for " + type(obj).__name__)

    # loops in the dependencies
    deps = {a.get("name"): [d.get("activity") for d in (a.get("dependsOn") or [])] for a in acts}
    state = {}

    def dfs(n, stack):
        state[n] = 1
        for d in deps.get(n, []):
            if d not in deps:
                continue
            if state.get(d) == 1:
                add("DEPENDENCY_LOOP", n, "the dependencies loop: " + " -> ".join(stack + [n, d]))
            elif d not in state:
                dfs(d, stack + [n])
        state[n] = 2
    for n in list(deps):
        if n not in state:
            dfs(n, [])

    for path, expr in _expressions(props):
        if not _balanced(expr):
            add("EXPRESSION_SYNTAX", path.lstrip("."), "the expression has braces, parentheses or quotes that do not close: " + expr[:70])
    return out


if __name__ == "__main__":
    for f in sys.argv[1:]:
        p = pathlib.Path(f)
        findings = check(json.loads(p.read_text()))
        print(json.dumps({"file": p.name, "valid": not findings, "findings": findings}))
