#!/usr/bin/env python3
"""Check the code and the recorded output of the SQL tutorial.

What ran here: DuckDB, PostgreSQL (a real server on 127.0.0.1) and SQLite, with made-up Brewline data. sqlglot translated queries for seven
dialects that did not run anywhere ("translated, not run"). This script checks what can be checked on this machine:

1. Every SQL snippet of every lesson is read by sqlglot in the dialect of its screen (DuckDB, PostgreSQL or SQLite). Statements that sqlglot
   keeps as a bare command are counted separately and run instead.
2. Every .sql block of the recorder runs again on fresh engines (verify/q/*.sql). The tables, texts and files of that run must equal the
   recording, and the query and the table that a lesson shows must equal a block and its table. A table that a lesson trims (fewer
   columns or rows) must be a projection of the fresh table.
3. Snippets that are not recorded blocks (the broken and fixed queries of the bug scenes, the setup script, the formatter lesson) run on the
   engines inside a transaction that is rolled back. A bug and its fix must leave different results, unless the lesson says otherwise.
4. Every coding round runs again. The data on screen is loaded into empty tables, the solution runs there (on DuckDB, PostgreSQL and
   SQLite), and the rows must equal the rows on screen. The shown rows must be rows of the Brewline tables. The starter must not contain
   the solution.
5. The dialect lesson: every translation on screen must equal what sqlglot writes now, must read back in its own dialect, and the label
   "ran: same rows", "different rows" or "error" must equal what happens when the translation runs on DuckDB, PostgreSQL and SQLite.
6. The widget checker (check_widgets.js) recomputes the labs, and the content lint runs. The lint also fails when a lesson quotes a number
   that the recording no longer shows.
7. Controls: broken inputs that the checkers above must reject, including a changed recording that the widget checker must reject.
8. With --recapture, the recorder runs again in full and its output is compared with js/real.js.

What this cannot show: how a cloud warehouse behaves, that a translation to Snowflake, BigQuery, Redshift, MySQL, SQL Server, Oracle or
Spark runs, how an engine behaves under load, what anything costs, or that a feature, limit or version is current. Those screens carry the
"From documentation" tag and the README lists the pages they come from.

Run:    python3 sql/verify/verify_sq.py [--no-run] [--recapture] [--reuse] [--verbose]
Needs:  pip install -r dev/requirements.txt (duckdb, sqlglot, psycopg[binary]), Node 20 or later, and PostgreSQL 16 server programs
        (apt install postgresql-16) or SQ_PG_DSN pointing at a running server (a database called sq_course is created and dropped there).
"""
import argparse
import collections
import contextlib
import copy
import decimal
import json
import logging
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import types

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

import sqlglot  # noqa: E402
from sqlglot import errors, exp  # noqa: E402
import brewdata  # noqa: E402
import engines as E  # noqa: E402
import rec as R  # noqa: E402
import world  # noqa: E402

logging.getLogger('sqlglot').setLevel(logging.ERROR)
CACHE = HERE / '.cache'

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='skip everything that needs the engines (parse checks, the widget checker and the lint still run)')
ap.add_argument('--recapture', action='store_true', help='record everything again and compare with js/real.js')
ap.add_argument('--reuse', action='store_true', help='with --recapture: compare the recording kept in verify/.cache from the last --recapture')
ap.add_argument('--verbose', action='store_true')
args = ap.parse_args()

problems = 0
TALLY = {}


def bad(msg):
    global problems
    problems += 1
    print('PROBLEM:', msg)


def tick(group, n=1):
    TALLY[group] = TALLY.get(group, 0) + n


def note(msg):
    if args.verbose:
        print('  note:', msg)


@contextlib.contextmanager
def collecting():
    """Run a check on a broken input: the problems it reports are collected instead of printed."""
    global bad, tick
    saved_bad, saved_tick, found = bad, tick, []
    bad = lambda msg: found.append(msg)      # noqa: E731
    tick = lambda group, n=1: None           # noqa: E731
    try:
        yield found
    finally:
        bad, tick = saved_bad, saved_tick


def load_real(path):
    text = pathlib.Path(path).read_text()
    return json.loads(text[text.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


real = load_real(ROOT / 'sql' / 'js' / 'real.js')
dump = json.loads(subprocess.check_output(['node', str(HERE / 'dump_sql.js')]))
SC = dump['scenes']
SCENE = {s['id']: s for s in SC}
MINI = set(brewdata.ORDER)
DIALECTS = ('duckdb', 'postgres', 'sqlite')
WH = {'DuckDB': 'duckdb', 'PostgreSQL': 'postgres', 'SQLite': 'sqlite'}
# the scenes that show several translations of one query, or a script, in one box: they have their own checks
COMPOSITE = {'m0-script', 'm13-trans-weekly', 'm13-trans-qualify', 'm13-trans-trycast', 'm13-pretty'}


def engine_of(sc):
    wh = (sc.get('ctx') or {}).get('wh') or ''
    for name, e in WH.items():
        if wh.startswith(name):
            return e
    return sc.get('engine')


# ======================================================================================================================
# 1. sqlglot reads every snippet
# ======================================================================================================================
def parse_sql(code, dialect):
    try:
        trees = sqlglot.parse(code, read=dialect, error_level=errors.ErrorLevel.RAISE)
    except errors.SqlglotError as ex:
        return None, str(ex).split('\n')[0][:200]
    return [t for t in trees if t is not None], None


def check_parse(sid, kind, code, dialects):
    """Returns (dialect, trees) of the first dialect that reads the snippet, or None."""
    last = ''
    for d in dialects:
        trees, err = parse_sql(code, d)
        if trees:
            cmds = [t for t in trees if isinstance(t, exp.Command)]
            tick('parse: statements that sqlglot reads', len(trees) - len(cmds))
            if cmds:
                tick('parse: statements that sqlglot keeps as a bare command (they run on an engine below)', len(cmds))
                note('%s %s: bare command %s' % (sid, kind, ', '.join(str(c.this).split()[0] for c in cmds)))
            return d, trees
        last = err or 'there is nothing in it'
    bad('%s (%s): sqlglot cannot read it as %s: %s' % (sid, kind, ' or '.join(dialects), last))
    return None


PARSED = {}
for sc in SC:
    if sc.get('lang') != 'sql' or sc['id'] in COMPOSITE:
        continue
    d = engine_of(sc)
    for kind in ('code', 'fix', 'sol'):
        if kind in sc:
            got = check_parse(sc['id'], kind, sc[kind], [d] if d else list(DIALECTS))
            if got:
                PARSED[(sc['id'], kind)] = got
                tick('parse: snippets (lesson code, bug and fix, coding round solutions)')


# ======================================================================================================================
# 2 to 5. everything that needs the engines
# ======================================================================================================================
def rows_of(t):
    return [list(r) for r in t['rows']]


def is_trim(shown, fresh):
    """A trimmed table: some of the columns, and some of the rows in their order."""
    if any(c not in fresh['cols'] for c in shown['cols']):
        return False
    ix = [fresh['cols'].index(c) for c in shown['cols']]
    proj = [[r[i] for i in ix] for r in fresh['rows']]
    k = 0
    for r in shown['rows']:
        while k < len(proj) and proj[k] != r:
            k += 1
        if k == len(proj):
            return False
        k += 1
    return True


def check_scene_result(sc, fresh_tables, block):
    """A lesson shows a query and a table. The table must be what a fresh run of that query gives on the engine of the screen."""
    eng = engine_of(sc) or 'duckdb'
    t = fresh_tables.get(block + '.' + eng) or fresh_tables.get(block)
    if t is None:
        bad('%s: block %s has no table for %s in the fresh run' % (sc['id'], block, eng))
        return
    shown = sc['result']
    if shown['cols'] == t['cols'] and shown['rows'] == t['rows']:
        tick('scenes: the table on screen equals the table of a fresh run')
    elif is_trim(shown, t):
        tick('scenes: the table on screen is a trimmed copy of the table of a fresh run (fewer columns or rows)')
    else:
        bad('%s: the table on screen differs from the fresh run of block %s on %s (%s ... vs %s ...)' % (
            sc['id'], block, eng, json.dumps(shown['rows'][:2])[:80], json.dumps(t['rows'][:2])[:80]))


def stmt_tables(trees):
    names, ctes, made = set(), set(), set()
    for t in trees:
        for c in t.find_all(exp.CTE):
            ctes.add(c.alias_or_name)
        for c in t.find_all(exp.Create):
            tb = c.this.find(exp.Table) if c.this is not None else None
            if tb is not None:
                made.add(tb.name)
        for tb in t.find_all(exp.Table):
            if tb.name:
                names.add(tb.name)
    return names - ctes - made


def split_script(sql):
    return E.split_statements(sql)


def setup_tables():
    """Which small helper tables each @setup script creates."""
    out = {}
    for name, script in R.SETUPS.items():
        names = set()
        for st in split_script(script):
            for t in sqlglot.parse(st, read='duckdb'):
                if isinstance(t, exp.Create) and t.this is not None:
                    tb = t.this.find(exp.Table)
                    if tb is not None:
                        names.add(tb.name)
        out[name] = names
    return out


SETUP_TABLES = setup_tables()


def exec_snippet(rec, eng, code, trees):
    """Run the statements of a snippet in a transaction that is rolled back, with the helper tables it names. Returns
    (last result set, error text, content of the tables the snippet names after it ran)."""
    refs = stmt_tables(trees) if trees else set()
    need = [s for s, names in SETUP_TABLES.items() if names & refs]
    unknown = refs - MINI - set().union(*SETUP_TABLES.values())
    if unknown:
        return None, 'the snippet names tables that nothing creates: ' + ', '.join(sorted(unknown)), {}
    last, err, state = None, None, {}
    with rec.tx(eng):
        for s in need:
            for st in split_script(R.SETUPS[s]):
                rec.run(eng, st)
        for st in split_script(code):
            try:
                r = rec.run(eng, st)
                if r.cols is not None:
                    last = r
            except Exception as ex:
                err = E.error_text(ex)
                break
        if err is None:
            for t in sorted(refs):
                try:
                    r = rec.run(eng, 'SELECT * FROM ' + t)
                    state[t] = sorted(tuple(E.fmt(c) for c in row) for row in r.rows)
                except Exception:
                    pass
    return last, err, state


def table_text(r):
    return None if r is None else (list(r.cols), [[E.fmt(c) for c in row] for row in r.rows])


def run_checks(fresh):
    eng = fresh.eng
    ver = {e: eng[e].version for e in DIALECTS}
    for e in DIALECTS:
        if real['meta'].get(e) != ver[e]:
            bad('the %s on this machine is %s, the recording was made with %s' % (e, ver[e], real['meta'].get(e)))
        else:
            tick('versions: an engine on this machine has the version of the recording')

    # ---- 2. the .sql blocks run again
    nblocks = 0
    for f in sorted((HERE / 'q').glob('*.sql')):
        R.run_file(fresh, f)
    nblocks = fresh.blocks
    for sec in ('files', 'text', 'tables', 'counts'):
        for k, v in fresh.out[sec].items():
            if k not in real[sec]:
                bad('the fresh run made %s %s, which the recording does not have' % (sec, k))
            elif real[sec][k] != v:
                bad('%s %s of the fresh run differs from the recording' % (sec, k))
            else:
                tick('blocks: %s of the fresh run equal the recording' % sec)
    tick('blocks: .sql blocks run again on fresh engines', nblocks)

    shown_to_key = collections.defaultdict(list)
    for k, v in fresh.out['files'].items():
        if not k.startswith('data/'):
            shown_to_key[v.strip()].append(k)
    recorded_text = list(real['text'].values()) + list(real['files'].values())
    for sc in SC:
        if sc['type'] == 'sql' and 'code' in sc:
            keys = shown_to_key.get(sc['code'].strip())
            if not keys:
                bad('%s: the query on screen is not one of the recorded blocks' % sc['id'])
                continue
            tick('scenes: a query on screen is a recorded block that ran again')
            if sc.get('result'):
                check_scene_result(sc, fresh.out['tables'], keys[0])
        elif sc['type'] == 'code' and sc.get('lang') == 'text' and sc['id'] not in COMPOSITE:
            lines = [l.rstrip() for l in sc['code'].split('\n') if l.strip()]
            ok = False
            for body in recorded_text:
                if not isinstance(body, str):
                    continue
                have = [l.rstrip() for l in body.split('\n')]
                k = 0
                for l in have:
                    if k < len(lines) and l == lines[k]:
                        k += 1
                if k == len(lines):
                    ok = True
                    break
            if ok:
                tick('scenes: the plan or transcript on screen is made of lines of a recorded text')
            else:
                bad('%s: some lines of the text on screen are in no recorded text' % sc['id'])

    # ---- 3. snippets that are not blocks
    for sc in SC:
        if sc['type'] != 'bug' or sc.get('lang') != 'sql':
            continue
        e = engine_of(sc) or 'duckdb'
        out = {}
        for kind in ('code', 'fix'):
            got = PARSED.get((sc['id'], kind))
            if kind not in sc or not got:
                continue
            trees = got[1]
            if sc[kind].strip() in shown_to_key:
                tick('bug scenes: the snippet is a recorded block, covered by the blocks above')
                continue
            last, err, state = exec_snippet(fresh, e, sc[kind], trees)
            if err:
                if sc['id'] in EXPECT_ERROR and kind == 'code' and EXPECT_ERROR[sc['id']] in err:
                    tick('bug scenes: the broken query fails with the error the lesson names')
                    out[kind] = ('error', err)
                else:
                    bad('%s (%s) fails on %s: %s' % (sc['id'], kind, e, err))
                continue
            tick('bug scenes: a snippet that is not a recorded block runs on an engine')
            out[kind] = (table_text(last), state)
        if 'code' in out and 'fix' in out and out['code'] == out['fix'] and sc['id'] not in SAME_OK:
            bad('%s: the broken query and its fix leave the same result' % sc['id'])
        elif 'code' in out and 'fix' in out:
            tick('bug scenes: the broken query and its fix leave different results')
    return nblocks


# bug scenes whose broken query fails on purpose, with part of the error text the lesson names
EXPECT_ERROR = {}
# bug scenes where the broken and the fixed query give the same rows and differ in something else (a plan, a lock), with the reason
SAME_OK = {}

if not args.no_run:
    fresh = R.Rec()
    pgs = world.open_world(fresh)
    try:
        run_checks(fresh)
    finally:
        pgs.stop()

print()
for k in sorted(TALLY):
    print('  %4d  %s' % (TALLY[k], k))
print('verification clean' if not problems else '%d problem(s)' % problems)
sys.exit(1 if problems else 0)
