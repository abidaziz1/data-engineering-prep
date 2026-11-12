"""Mission 11: types, validation and data contracts (mypy, pydantic, and a validate-or-quarantine lab)."""
import contextlib
import importlib.util
import io
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
LESSONS = HERE / 'lessons' / 'm11'
MODELS = ['lax', 'strict', 'forbid extra columns']
POLICIES = ['fail on the first bad row', 'quarantine, fail above 20 percent', 'quarantine, fail above 50 percent', 'drop bad rows silently']


def load_module():
    spec = importlib.util.spec_from_file_location('lesson_validate', LESSONS / 'validate_or_quarantine.py')
    mod = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    return mod


def lab():
    from pydantic import ConfigDict
    mod = load_module()
    base = mod.Order

    class Strict(base):
        model_config = ConfigDict(strict=True)

    class Forbid(base):
        model_config = ConfigDict(extra='forbid')

    variants = {'lax': base, 'strict': Strict, 'forbid extra columns': Forbid}
    out = {'rows': mod.ROWS, 'models': {}, 'policies': POLICIES, 'cells': {}}
    for name, model in variants.items():
        mod.Order = model
        good, quarantine = mod.validate(mod.ROWS)
        out['models'][name] = {'good': [o.order_id for o in good], 'quarantine': quarantine}
        n = len(mod.ROWS)
        cells = {}
        first = quarantine[0] if quarantine else None
        cells[POLICIES[0]] = ({'loaded': 0, 'quarantined': 1, 'dropped': 0, 'status': 'failed at line %d: %s' % (first['line'], first['why'])} if first else {'loaded': len(good), 'quarantined': 0, 'dropped': 0, 'status': 'loaded'})
        for policy, limit in ((POLICIES[1], 0.20), (POLICIES[2], 0.50)):
            share = len(quarantine) / n
            cells[policy] = ({'loaded': 0, 'quarantined': len(quarantine), 'dropped': 0, 'status': 'failed: %d%% of the rows are bad (limit %d%%)' % (round(share * 100), round(limit * 100))} if share > limit
                             else {'loaded': len(good), 'quarantined': len(quarantine), 'dropped': 0, 'status': 'loaded, %d%% in quarantine (limit %d%%)' % (round(share * 100), round(limit * 100))})
        cells[POLICIES[3]] = {'loaded': len(good), 'quarantined': 0, 'dropped': len(quarantine), 'status': 'success, and nobody is told that %d rows were dropped' % len(quarantine)}
        out['cells'][name] = cells
    out['note'] = 'every case is a run of validate() from lessons/m11/validate_or_quarantine.py with a changed pydantic model (lax is the default, strict rejects text for numbers, forbid rejects columns that are not in the model). The policies are computed from those results.'
    return out


def record(rec, work, cache):
    for name in ('type_hints', 'dataclass_vs_pydantic', 'validate_or_quarantine', 'split_valid', 'contract_check'):
        rec.lesson('m11/%s.py' % name)
    d = work / 'm11_mypy'
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    shutil.copy(LESSONS / 'bad_types.py', d / 'bad_types.py')
    rec.file('m11/bad_types.py', (LESSONS / 'bad_types.py').read_text())
    cmd = '%s -m mypy bad_types.py' % rec.py
    rec.shell('m11/mypy', [cmd], d, show={cmd: 'mypy bad_types.py'})
    rec.counts('m11.validate', lab())
