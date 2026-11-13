#!/usr/bin/env python3
"""Check the code and the recorded output of the SQL tutorial.

What ran here: DuckDB, PostgreSQL (a real server on 127.0.0.1) and SQLite, with made-up Brewline data. sqlglot translated queries for seven
dialects that did not run anywhere ("translated, not run"). This script checks what can be checked on this machine:

1. Every SQL snippet of every lesson is read by sqlglot in the dialect of its screen (DuckDB, PostgreSQL or SQLite; SQL Server for the one
   query that is SQL Server syntax). Python snippets are read by ast. Statements that sqlglot keeps as a bare command are counted
   separately and run on an engine instead.
2. The whole recorder runs again in this process on fresh engines (every verify/q/*.sql block and every Python section). Every file, text,
   table and count it makes must equal js/real.js, and the recording must hold nothing that the run did not make. The query and the table
   that a lesson shows must equal a block and its table. A table that a lesson trims (fewer columns or rows) must be a projection of the
   fresh table. Plan texts must be made of lines of a recorded plan.
3. The broken and the fixed query of every bug scene run on an engine that holds only the Brewline tables, in a database that is thrown
   away. A bug and its fix must leave different results, unless the lesson says they give the same rows. A query that the lesson says
   fails must fail with the error that the lesson names. Three bug scenes need a state first (a cycle in the category tree, a sessions
   view, a copy of the dimension) and have their own claim check.
4. Every coding round runs again. The data on screen is loaded into empty tables, the solution runs there on DuckDB (and on PostgreSQL
   when the round uses PostgreSQL syntax), and the rows must equal the rows on screen. The same solution also runs on the other engines,
   and the verifier counts where the rows agree. The shown rows must be rows of the Brewline tables. The starter must not contain the
   solution.
5. The dialect lesson: every translation on screen must equal the recording, and must read back in its own dialect; the label "ran: same
   rows", "different rows" or "error" must equal the label of the recording, which the run in step 2 made again.
6. The widget checker (check_widgets.js) recomputes the labs, and the content lint runs. The lint also fails when a lesson quotes a number
   that the recording no longer shows.
7. Controls: broken inputs that the checkers above must reject, including a changed recording that the widget checker must reject.
8. With --recapture, capture_sq.py runs again as its own process and its output is compared with js/real.js, as data and as bytes.

What this cannot show: how a cloud warehouse behaves, that a translation to Snowflake, BigQuery, Redshift, MySQL, SQL Server, Oracle or
Spark runs, how an engine behaves under load, what anything costs, or that a feature, limit or version is current. Those screens carry the
"From documentation" tag and the README lists the pages they come from.

Run:    python3 sql/verify/verify_sq.py [--no-run] [--recapture] [--reuse] [--verbose]
Needs:  pip install -r dev/requirements.txt (duckdb, sqlglot, psycopg[binary]), Node 20 or later, and PostgreSQL 16 server programs
        (apt install postgresql-16) or SQ_PG_DSN pointing at a running server (a database called sq_course is created and dropped there).
"""
import argparse
import ast
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

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

import sqlglot  # noqa: E402
from sqlglot import errors, exp  # noqa: E402
import brewdata  # noqa: E402
import capture_sq  # noqa: E402
import engines as E  # noqa: E402
import rec as R  # noqa: E402
import world  # noqa: E402

logging.getLogger('sqlglot').setLevel(logging.ERROR)
CACHE = HERE / '.cache'

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='skip everything that needs the engines (the parse checks, the widget checker and the lint still run)')
ap.add_argument('--recapture', action='store_true', help='run capture_sq.py as its own process and compare its output with js/real.js')
ap.add_argument('--reuse', action='store_true', help='with --recapture: compare the recording kept in verify/.cache from the last --recapture')
ap.add_argument('--browser', action='store_true', help='also run e2e_labs.js in Chromium, and with two changed recordings that it must reject (needs Playwright)')
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
MINI = set(brewdata.ORDER)
DIALECTS = ('duckdb', 'postgres', 'sqlite')
WH = {'DuckDB': 'duckdb', 'PostgreSQL': 'postgres', 'SQLite': 'sqlite'}
BIG = {'big_customers', 'big_orders', 'big_items'}
# scenes that show several translations of one query, or a whole script, in one box: they have their own checks
COMPOSITE = {'m0-script', 'm13-trans-weekly', 'm13-trans-qualify', 'm13-trans-trycast', 'm13-pretty'}
# a snippet that is in another dialect than the screen it is on
PARSE_AS = {('m13-bug-top', 'code'): 'tsql'}


def engine_of(sc):
    wh = (sc.get('ctx') or {}).get('wh') or ''
    for name, e in WH.items():
        if wh.startswith(name):
            return e
    return sc.get('engine')


def statements(sql):
    """The statements of a script, without the ones that are only a comment."""
    out = []
    for st in E.split_statements(sql):
        if re.sub(r'--[^\n]*', '', st).strip():
            out.append(st)
    return out


# ======================================================================================================================
# 1. sqlglot reads every SQL snippet, ast reads every Python snippet
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
                tick('parse: statements that sqlglot keeps as a bare command (they run on an engine)', len(cmds))
                note('%s %s: bare command %s' % (sid, kind, ', '.join(str(c.this).split()[0] for c in cmds)))
            return d, trees
        last = err or 'there is nothing in it'
    bad('%s (%s): sqlglot cannot read it as %s: %s' % (sid, kind, ' or '.join(dialects), last))
    return None


PARSED = {}
for sc in SC:
    for kind in ('code', 'fix', 'sol'):
        if kind not in sc:
            continue
        if sc.get('lang') == 'python':
            try:
                ast.parse(sc[kind])
                tick('parse: Python snippets read by ast (they are not run: they call objects the lesson does not define)')
            except SyntaxError as ex:
                bad('%s (%s): Python does not parse: %s' % (sc['id'], kind, ex))
        elif sc.get('lang') == 'sql' and sc['id'] not in COMPOSITE:
            d = PARSE_AS.get((sc['id'], kind)) or engine_of(sc)
            got = check_parse(sc['id'], kind, sc[kind], [d] if d else list(DIALECTS))
            if got:
                PARSED[(sc['id'], kind)] = got
                tick('parse: SQL snippets (lesson code, bug and fix, coding round solutions)')


# ======================================================================================================================
# helpers for the checks that need engines
# ======================================================================================================================
def table_text(r):
    return None if r is None else (list(r.cols), [[E.fmt(c) for c in row] for row in r.rows])


def stmt_tables(trees):
    names, ctes, made = set(), set(), set()
    for t in trees:
        for c in t.find_all(exp.CTE):
            ctes.add(c.alias_or_name)
        for c in t.find_all(exp.Create):
            if str(c.args.get('kind')).upper() in ('TABLE', 'VIEW'):          # CREATE INDEX names a table that already exists
                tb = c.this.find(exp.Table) if c.this is not None else None
                if tb is not None:
                    made.add(tb.name)
        for tb in t.find_all(exp.Table):
            if tb.name:
                names.add(tb.name)
    return names - ctes - made


# helper tables that a recorded block creates for itself, and that a lesson uses without showing the line that makes them
EXTRA_SETUPS = {'dim': 'CREATE TABLE dim AS SELECT * FROM customer_dim;'}


def setup_tables():
    out = {}
    for name, script in list(R.SETUPS.items()) + list(EXTRA_SETUPS.items()):
        names = set()
        for st in statements(script):
            for t in sqlglot.parse(st, read='duckdb'):
                if isinstance(t, exp.Create) and t.this is not None:
                    tb = t.this.find(exp.Table)
                    if tb is not None:
                        names.add(tb.name)
        out[name] = names
    return out


SETUP_TABLES = setup_tables()


def setup_sql(name):
    return R.SETUPS.get(name) or EXTRA_SETUPS[name]


@contextlib.contextmanager
def scratch(fresh, e):
    """An engine that holds only the Brewline mini tables and is thrown away afterwards, so that a snippet may COMMIT."""
    dbname = None
    if e == 'duckdb':
        eng = E.DuckEngine()
    elif e == 'sqlite':
        eng = E.SqliteEngine()
    else:
        dbname = 'sq_scratch'
        fresh.eng['postgres'].run('DROP DATABASE IF EXISTS %s WITH (FORCE)' % dbname)
        fresh.eng['postgres'].run('CREATE DATABASE ' + dbname)
        eng = E.PgEngine(fresh.dsn.replace('dbname=sq_course', 'dbname=' + dbname))
    try:
        for st in statements(brewdata.mini_script()):
            eng.run(st)
        yield eng
    finally:
        eng.close()
        if dbname:
            fresh.eng['postgres'].run('DROP DATABASE IF EXISTS %s WITH (FORCE)' % dbname)


def run_script(eng, sql):
    """Run every statement. Returns (last result set as text, error text or None)."""
    last = None
    for st in statements(sql):
        try:
            r = eng.run(st)
        except Exception as ex:
            return last, E.error_text(ex)
        if r.cols is not None:
            last = table_text(r)
    return last, None


def needed_setups(trees, provides=()):
    refs = stmt_tables(trees) if trees else set()
    unknown = refs - MINI - BIG - set(provides) - set().union(*SETUP_TABLES.values())
    return refs, [s for s, names in SETUP_TABLES.items() if names & refs], unknown


def run_snippet(fresh, e, sql, trees, params=None, prelude=None, provides=None):
    """Run a snippet on an engine with only the Brewline tables, plus the helper tables it names. Returns (last result set, error text,
    the content of the tables the snippet names, read after it ran)."""
    for k, v in (params or {}).items():
        sql = sql.replace(k, v)
    refs, need, unknown = needed_setups(trees, provides or ())
    if unknown:
        return None, 'the snippet names tables that nothing creates: ' + ', '.join(sorted(unknown)), {}

    def go(eng):
        for s in need:
            for st in statements(setup_sql(s)):
                eng.run(st)
        for st in statements(prelude or ''):
            eng.run(st)
        last, err = run_script(eng, sql)
        state = {}
        if err is None:
            for t in sorted(refs - set(provides or ())):
                try:
                    r = eng.run('SELECT * FROM ' + t)
                    state[t] = sorted(tuple(E.fmt(c) for c in row) for row in r.rows)
                except Exception:
                    pass
        return last, err, state
    if refs & BIG:                       # the big tables exist only in the engines of the recording: a transaction that is rolled back
        with fresh.tx(e) as eng:
            return go(eng)
    with scratch(fresh, e) as eng:
        return go(eng)


# ======================================================================================================================
# 2. the recording, the tables on screen and the plan texts
# ======================================================================================================================
def is_trim(shown, fresh_t):
    """A trimmed table: some of the columns, and some of the rows in their order."""
    if any(c not in fresh_t['cols'] for c in shown['cols']):
        return False
    ix = [fresh_t['cols'].index(c) for c in shown['cols']]
    proj = [[r[i] for i in ix] for r in fresh_t['rows']]
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
        bad('%s: the table on screen differs from the fresh run of block %s on %s (%s ... against %s ...)' % (
            sc['id'], block, eng, json.dumps(shown['rows'][:2])[:80], json.dumps(t['rows'][:2])[:80]))


def text_groups(code):
    """The runs of lines of a plan or transcript box, without the comment lines that title them."""
    runs, cur = [], []
    for l in code.split('\n'):
        if not l.strip() or l.startswith('-- '):
            if cur:
                runs.append(cur)
                cur = []
        else:
            cur.append(l.rstrip())
    if cur:
        runs.append(cur)
    return runs


def strings_of(x, out):
    """Plans and transcripts that the recorder keeps inside the counts."""
    if isinstance(x, str):
        out.append(x)
    elif isinstance(x, dict):
        for v in x.values():
            strings_of(v, out)
    elif isinstance(x, list):
        for v in x:
            strings_of(v, out)


def lines_in(lines, body):
    k = 0
    for l in body.split('\n'):
        if k < len(lines) and l.rstrip() == lines[k]:
            k += 1
    return k == len(lines)


def check_text_scene(sc, recorded):
    ok = True
    for run in text_groups(sc['code']):
        if not any(lines_in(run, body) for body in recorded):
            ok = False
            bad('%s: these lines on screen are in no recorded plan or transcript: %s' % (sc['id'], ' / '.join(run[:2])[:100]))
    if ok:
        tick('scenes: every plan or transcript on screen is made of lines of a recorded text')


def diff_recordings(a, b, path=''):
    if isinstance(a, dict) and isinstance(b, dict):
        out = []
        for k in sorted(set(a) | set(b)):
            out += ['the fresh run does not make ' + path + '.' + k] if k not in b else ['the fresh run makes ' + path + '.' + k + ', which the recording lacks'] if k not in a else diff_recordings(a[k], b[k], path + '.' + k)
        return out
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return ['changed %s: %d items in the recording, %d now' % (path, len(a), len(b))]
        return [x for i, (u, v) in enumerate(zip(a, b)) for x in diff_recordings(u, v, '%s[%d]' % (path, i))]
    return [] if a == b else ['changed %s: %s in the recording, %s now' % (path, repr(a)[:60], repr(b)[:60])]


# ======================================================================================================================
# 3. bug scenes
# ======================================================================================================================
FUNNEL_VIEW = '''CREATE VIEW events_with_session AS
WITH flagged AS (
  SELECT event_id, customer_id, event_ts, event_type,
         CASE WHEN LAG(event_ts) OVER w IS NULL OR event_ts - LAG(event_ts) OVER w > INTERVAL '30 minutes' THEN 1 ELSE 0 END AS is_new
  FROM events WINDOW w AS (PARTITION BY customer_id ORDER BY event_ts, event_id)
), numbered AS (
  SELECT *, sum(is_new) OVER (PARTITION BY customer_id ORDER BY event_ts, event_id) AS session_no FROM flagged
)
SELECT event_id, customer_id, event_ts, event_type, coalesce(CAST(customer_id AS VARCHAR), 'guest') || '-' || CAST(session_no AS VARCHAR) AS session_id
FROM numbered'''


# What each bug scene must show. Default: both queries run, and they leave different results.
#   fails    {kind: [(text of the error, engines), ...]}  the query must fail on those engines with that text in the error (case ignored)
#   same     the lesson says the two queries return the same rows (the fix is faster or safer, not different)
#   params   placeholders of the lesson that are filled in before the query runs
#   prelude  statements that run first, and provides: the names they create
#   engines  where the pair runs (default: the engine of the screen, DuckDB when the screen names none)
BUG = {
    'm1-bug-having': {'fails': {'code': [('cannot contain aggregates', ['duckdb']), ('not allowed in WHERE', ['postgres'])]}},
    'm4-bug-bare': {'fails': {'code': [('must appear in the GROUP BY', ['duckdb', 'postgres'])]}},
    'm5-bug-scalar': {'fails': {'code': [('more than one row returned by a subquery', ['duckdb', 'postgres'])]}},
    'm5-bug-rec': {'same': 'on the tree as it is, the guard changes nothing; the check of the cycle is claim_rec', 'engines': ['postgres']},
    'm6-bug-where': {'fails': {'code': [('cannot contain window functions', ['duckdb']), ('not allowed in WHERE', ['postgres'])]}},
    'm7-bug-json': {'engines': ['postgres']},
    'm8-bug-funnel': {'prelude': FUNNEL_VIEW, 'provides': ['events_with_session']},
    'm11-bug-lowcard': {'same': 'the fix leaves out an index that never helped; the two queries count the same rows', 'engines': ['duckdb']},
    'm11-bug-offset': {'same': 'an offset page and a keyset page return the same 1,000 rows', 'engines': ['duckdb'], 'params': {':n': '20000', ':last_id': '20000'}},
    'm11-bug-func': {'same': 'the range and the cast select the same rows', 'engines': ['duckdb']},
    'm13-bug-top': {'fails': {'code': [('syntax error', ['duckdb', 'postgres', 'sqlite'])]}},
}


def scene_engines(sc):
    return BUG.get(sc['id'], {}).get('engines') or [engine_of(sc) or 'duckdb']


def check_bug(fresh, sc):
    rule = BUG.get(sc['id'], {})
    out = {}
    run = lambda e, kind: run_snippet(fresh, e, sc[kind], PARSED[(sc['id'], kind)][1], rule.get('params'), rule.get('prelude'), rule.get('provides'))  # noqa: E731
    for e in scene_engines(sc):
        for kind in ('code', 'fix'):
            if kind not in sc or (sc['id'], kind) not in PARSED or kind in rule.get('fails', {}):
                continue
            last, err, state = run(e, kind)
            if err:
                bad('%s (%s) fails on %s: %s' % (sc['id'], kind, e, err))
                continue
            tick('bug scenes: a broken or fixed query runs')
            out[(e, kind)] = (last, state)
    for kind, pairs in rule.get('fails', {}).items():
        for text, engs in pairs:
            for e in engs:
                last, err, state = run(e, kind)
                if err and text.lower() in err.lower():
                    tick('bug scenes: the broken query fails with the error the lesson names')
                else:
                    bad('%s (%s) on %s: expected an error with "%s", got %s' % (sc['id'], kind, e, text, err or 'no error'))
    for e in scene_engines(sc):
        a, b = out.get((e, 'code')), out.get((e, 'fix'))
        if a is None or b is None:
            continue
        if rule.get('same'):
            if a == b:
                tick('bug scenes: the lesson says the two queries return the same rows, and they do')
            else:
                bad('%s: the broken query and its fix give different results on %s, and the lesson says they give the same rows' % (sc['id'], e))
        elif a == b:
            bad('%s: the broken query and its fix leave the same result on %s' % (sc['id'], e))
        else:
            tick('bug scenes: the broken query and its fix leave different results')


def claim_rec(fresh, sc):
    """A data fix makes category 1 a child of category 9. The walk without a guard then never ends. Read through an outer LIMIT, it
    ends after 1,000 rows, from a table of 12. The walk with the guard ends."""
    with scratch(fresh, 'postgres') as eng:
        before = eng.run(sc['code']).rows[0][0]
        eng.run('UPDATE categories SET parent_id = 9 WHERE category_id = 1')
        bounded = sc['code'].rstrip().rstrip(';').replace('SELECT count(*) FROM walk', 'SELECT count(*) FROM (SELECT * FROM walk LIMIT 1000) AS first_rows')
        n_bug, n_fix = eng.run(bounded).rows[0][0], eng.run(sc['fix']).rows[0][0]
        n_cat = eng.run('SELECT count(*) FROM categories').rows[0][0]
    if before == n_cat and n_bug == 1000 and n_fix < 1000:
        tick('bug scenes: with a cycle in the tree the walk has no end (1,000 rows from a table of %d), and the guarded walk ends' % n_cat)
    else:
        bad('m5-bug-rec: before the data fix the walk gives %s of %s categories; with the cycle %s (bounded) and %s (guarded)' % (before, n_cat, n_bug, n_fix))





def claim_funnel(fresh, sc):
    """The fix reads a view that mission 8 builds with the sessions query. Built here from that query, it must count the sessions that the
    recorded funnel counts."""
    with scratch(fresh, 'duckdb') as eng:
        eng.run(FUNNEL_VIEW)
        got = eng.run(sc['fix']).rows[0][0]
    viewed = int(fresh.out['tables']['m8.funnel.duckdb']['rows'][0][1])
    if got == viewed:
        tick('bug scenes: the fixed funnel counts the %d sessions of the recorded funnel' % viewed)
    else:
        bad('m8-bug-funnel: the fix counts %s sessions, the recorded funnel %s' % (got, viewed))


def claim_scd(fresh, sc):
    """The insert without a close leaves the customers that the recorded table lists with two current rows. Close first and insert after,
    and no customer has two."""
    two = 'SELECT customer_id, count(*) AS current_rows FROM dim WHERE is_current GROUP BY customer_id HAVING count(*) > 1 ORDER BY 1'
    with scratch(fresh, 'duckdb') as eng:
        eng.run(EXTRA_SETUPS['dim'])
        eng.run(sc['code'])
        after_bug = table_text(eng.run(two))
    with scratch(fresh, 'duckdb') as eng:
        eng.run(EXTRA_SETUPS['dim'])
        for st in statements(sc['fix']):
            eng.run(st)
        eng.run(sc['code'])
        after_fix = table_text(eng.run(two))
    rec_t = fresh.out['tables']['m9.scd_bug.duckdb']
    if after_bug == (rec_t['cols'], rec_t['rows']) and after_fix[1] == []:
        tick('bug scenes: the insert alone leaves the customers of the recording with two current rows, close then insert leaves none')
    else:
        bad('m9-bug-scd: after the bug %s, after close and insert %s, recorded %s' % (after_bug[1], after_fix[1], rec_t['rows']))


CLAIMS = {'m5-bug-rec': claim_rec, 'm8-bug-funnel': claim_funnel, 'm9-bug-scd': claim_scd}


# ======================================================================================================================
# 4. coding rounds
# ======================================================================================================================
def lit_for(v, typ):
    if v == 'NULL':
        return 'NULL'
    if re.match(r'(?i)^(INTEGER|INT|BIGINT|SMALLINT|DOUBLE|REAL|FLOAT|DECIMAL|NUMERIC|BOOLEAN)', typ):
        return v
    return "'" + v.replace("'", "''") + "'"


@contextlib.contextmanager
def challenge_engine(fresh, e, data):
    """An engine that holds only the tables that the round shows on screen, with only the columns and rows shown."""
    if e == 'duckdb':
        eng = E.DuckEngine()
    elif e == 'sqlite':
        eng = E.SqliteEngine()
    else:
        eng = E.PgEngine(fresh.dsn)
        eng.run('DROP SCHEMA IF EXISTS ch CASCADE')
        eng.run('CREATE SCHEMA ch')
        eng.run('SET search_path = ch')                              # public is not on the path: a table that is not on screen does not exist
    try:
        for d in data:
            name = d['name'].split()[0]
            types = d.get('types') or ['VARCHAR'] * len(d['cols'])
            pk = (', PRIMARY KEY (%s)' % ', '.join(d['pk'])) if d.get('pk') else ''
            eng.run('CREATE TABLE %s (%s%s)' % (name, ', '.join('%s %s' % (c, t) for c, t in zip(d['cols'], types)), pk))
            for r in d['rows']:
                eng.run('INSERT INTO %s VALUES (%s)' % (name, ', '.join(lit_for(v, t) for v, t in zip(r, types))))
        yield eng
    finally:
        if e == 'postgres':
            try:
                eng.run('RESET search_path')
                eng.run('DROP SCHEMA ch CASCADE')
            except Exception:
                pass
        eng.close()


def has_top_order(trees):
    t = trees[-1] if trees else None
    return isinstance(t, (exp.Select, exp.Union, exp.Subquery)) and bool(t.args.get('order'))


def rows_match(shown, got, ordered):
    cols, rows = got
    if cols != shown['cols']:
        return False
    return rows == shown['rows'] if ordered else sorted(rows) == sorted(shown['rows'])


def cell_key(c):
    if c in ('true', 'false'):
        return ('n', 1.0 if c == 'true' else 0.0)
    try:
        return ('n', round(float(c), 6))
    except ValueError:
        return ('s', c)


def values_match(shown, got, ordered):
    """The same values: numbers are compared by value (82.0 and 82.00 are one value), other cells as text. For the engines that the round
    does not name."""
    cols, rows = got
    if [c.lower() for c in cols] != [c.lower() for c in shown['cols']]:
        return False
    a = [tuple(cell_key(c) for c in r) for r in rows]
    b = [tuple(cell_key(c) for c in r) for r in shown['rows']]
    return a == b if ordered else sorted(a) == sorted(b)


def check_challenge(fresh, sc, trees):
    required = [sc['engine']] if sc.get('engine') else ['duckdb']
    ordered = has_top_order(trees)
    for e in DIALECTS:
        try:
            with challenge_engine(fresh, e, sc['data']) as eng:
                last, err = run_script(eng, sc['sol'])
        except Exception as ex:
            last, err = None, E.error_text(ex)
        if e in required:
            if err is None and last is not None and rows_match(sc['res'], last, ordered):
                tick('coding rounds: the solution gives the rows on screen on %s' % e)
            else:
                bad('%s: the solution does not give the rows on screen on %s: %s' % (sc['id'], e, err or 'got %s' % json.dumps(last)[:160]))
        elif not sc.get('engine'):
            ok = err is None and last is not None and values_match(sc['res'], last, ordered)
            tick('coding rounds: the same solution also gives the values on screen on %s' % e if ok else 'coding rounds: the same solution gives other values or an error on %s (not required)' % e)
            if not ok:
                note('%s on %s: %s' % (sc['id'], e, err or 'other values'))


def helper_tables(fresh):
    """The tables that the @setup scripts create, as DuckDB holds them: {name: {cols, rows}}."""
    out = {}
    for name in list(R.SETUPS) + list(EXTRA_SETUPS):
        with scratch(fresh, 'duckdb') as eng:
            for st in statements(setup_sql(name)):
                eng.run(st)
            for t in SETUP_TABLES[name]:
                r = eng.run('SELECT * FROM ' + t)
                out[t] = {'cols': list(r.cols), 'rows': [[E.fmt(c) for c in row] for row in r.rows]}
    return out


def check_data_rows(sc, tables, helpers):
    for d in sc.get('data') or []:
        name = d['name'].split()[0]
        t = tables.get('data.' + name) or helpers.get(name)
        if t is None:
            tick('coding rounds: a table that the round defines itself (nothing to compare it with)')
            continue
        if any(c not in t['cols'] for c in d['cols']):
            bad('%s: table %s on screen has a column that the Brewline table lacks' % (sc['id'], name))
            continue
        ix = [t['cols'].index(c) for c in d['cols']]
        have = collections.Counter(tuple(r[i] for i in ix) for r in t['rows'])
        want = collections.Counter(tuple(r) for r in d['rows'])
        extra = want - have
        if extra:
            bad('%s: %d row(s) of %s on screen are not rows of the Brewline table, for example %s' % (sc['id'], sum(extra.values()), name, list(extra)[0]))
        else:
            tick('coding rounds: every row on screen is a row of the Brewline table or of its setup script')


def norm_sql(s):
    return re.sub(r'\s+', ' ', re.sub(r'--[^\n]*', '', s)).strip().lower().rstrip(';')


def check_starter(sc):
    if 'starter' not in sc:
        return
    if norm_sql(sc['sol']) in norm_sql(sc['starter']):
        bad('%s: the starter contains the solution' % sc['id'])
    else:
        tick('coding rounds: the starter does not contain the solution')


# ======================================================================================================================
# 5. translations
# ======================================================================================================================
LABEL = {'DuckDB': 'duckdb', 'PostgreSQL': 'postgres', 'SQLite': 'sqlite', 'Snowflake': 'snowflake', 'BigQuery': 'bigquery', 'Redshift': 'redshift',
         'MySQL': 'mysql', 'SQL Server': 'tsql', 'Oracle': 'oracle', 'Spark': 'spark'}


def squash(s):
    return re.sub(r'\s+', ' ', s).strip()


def check_translation_scene(sc, tr):
    parts = re.split(r'\n\n(?=-- )', sc['code'].strip())
    head, _, body0 = parts[0].partition('\n')
    q = next((k for k in tr['queries'] if squash(tr['results'][k]['source']) == squash(body0)), None)
    if q is None:
        bad('%s: the original query on screen is none of the recorded queries' % sc['id'])
        return
    for part in parts[1:]:
        head, _, body = part.partition('\n')
        m = re.match(r'^-- (.+?) \((ran: (same rows|different rows|error)|translated, not run)\)(?:, sqlglot: (.*))?$', head)
        if not m or m.group(1) not in LABEL:
            bad('%s: a title line on screen does not read as a dialect and a label: %s' % (sc['id'], head[:80]))
            continue
        target = LABEL[m.group(1)]
        item = tr['results'][q]['targets'][target]
        status = {'same rows': 'same', 'different rows': 'different', 'error': 'error'}.get(m.group(3))
        want_status = item.get('ran')
        if body.strip() != item['sql'].strip():
            bad('%s: the %s text on screen differs from the recording' % (sc['id'], m.group(1)))
        elif (status or None) != want_status:
            bad('%s: the label of %s says %s, the recording says %s' % (sc['id'], m.group(1), m.group(2), want_status or 'not run'))
        elif (m.group(4) or None) != (item.get('warning') or None):
            bad('%s: the warning of %s on screen is not the warning of the recording' % (sc['id'], m.group(1)))
        else:
            tick('translations: a translation on screen, with its label and warning, equals the recording')


def check_translation_recording(tr):
    for q in tr['queries']:
        for t in tr['targets']:
            item = tr['results'][q]['targets'][t]
            trees, err = parse_sql(item['sql'], t)
            if trees:
                tick('translations: a translated text reads back in its own dialect')
            else:
                bad('translation %s to %s does not read back in %s: %s' % (q, t, t, err))
            if (t in tr['run_on']) != ('ran' in item):
                bad('translation %s to %s: the label "ran" does not match the engines that ran' % (q, t))


# ======================================================================================================================
# run everything that needs the engines
# ======================================================================================================================
def run_checks(fresh):
    ver = {e: fresh.eng[e].version for e in DIALECTS}
    for e in DIALECTS:
        if real['meta'].get(e) != ver[e]:
            bad('the %s on this machine is %s, the recording was made with %s' % (e, ver[e], real['meta'].get(e)))
        else:
            tick('versions: an engine on this machine has the version of the recording')
    for k, v in (('sqlglot', sqlglot.__version__),):
        if real['meta'].get(k) != v:
            bad('%s on this machine is %s, the recording was made with %s' % (k, v, real['meta'].get(k)))
        else:
            tick('versions: an engine on this machine has the version of the recording')

    # ---- 2. the whole recorder runs again, in this process
    capture_sq.record_all(fresh)
    for sec in ('files', 'text', 'tables', 'counts'):
        for k in sorted(set(fresh.out[sec]) | set(real[sec])):
            if k not in real[sec]:
                bad('the fresh run made %s %s, which the recording does not have' % (sec, k))
            elif k not in fresh.out[sec]:
                bad('the recording has %s %s, which the fresh run does not make' % (sec, k))
            elif real[sec][k] != fresh.out[sec][k]:
                bad('%s %s of the fresh run differs from the recording' % (sec, k))
            else:
                tick('recording: %s that a fresh run makes again and finds equal' % sec)
    tick('recording: .sql blocks that ran again on fresh engines', fresh.blocks)

    shown_to_key = collections.defaultdict(list)
    for k, v in fresh.out['files'].items():
        if not k.startswith('data/'):
            shown_to_key[v.strip()].append(k)
    recorded_text = [v for v in fresh.out['text'].values() if isinstance(v, str)] + list(fresh.out['files'].values())
    strings_of(fresh.out['counts'], recorded_text)
    for sc in SC:
        if sc['type'] == 'sql' and 'code' in sc:
            keys = shown_to_key.get(sc['code'].strip())
            if not keys:
                bad('%s: the query on screen is not one of the recorded blocks' % sc['id'])
                continue
            tick('scenes: a query on screen is a recorded block that ran again')
            if sc.get('result'):
                check_scene_result(sc, fresh.out['tables'], keys[0])
        elif sc['type'] == 'code' and sc.get('lang') == 'text':
            check_text_scene(sc, recorded_text)
    # the composite scenes
    mini = fresh.out['files']['data/mini.sql'].strip()
    shown = SCENE_BY_ID['m0-script']['code'].strip()
    if mini.startswith(shown):
        tick('scenes: the setup script on screen is the first %d lines of the script that built the tables' % len(shown.split('\n')))
    else:
        bad('m0-script: the script on screen is not the start of the recorded setup script')
    tr = fresh.out['counts']['m13.translate']
    for sid in ('m13-trans-weekly', 'm13-trans-qualify', 'm13-trans-trycast'):
        check_translation_scene(SCENE_BY_ID[sid], tr)
    check_translation_recording(tr)
    pre = SCENE_BY_ID['m13-pretty']['code'].strip()
    before, after = [p.partition('\n')[2] for p in re.split(r'\n\n(?=-- after)', pre)]
    pretty = sqlglot.transpile(before, read='duckdb', write='duckdb', pretty=True)[0]
    if before == fresh.out['files']['m13.messy'].strip() and after == pretty and after == fresh.out['files']['m13.pretty'].strip():
        tick('scenes: the messy query and the formatted query on screen are the recorded text and what sqlglot writes')
    else:
        bad('m13-pretty: the text on screen is not the recorded text and what sqlglot writes')
    with scratch(fresh, 'duckdb') as eng:
        if table_text(eng.run(before)) == table_text(eng.run(after)):
            tick('scenes: the messy and the formatted query give the same rows')
        else:
            bad('m13-pretty: the messy and the formatted query give different rows')

    # ---- 3. bug scenes
    for sc in SC:
        if sc['type'] == 'bug' and sc.get('lang') == 'sql':
            if sc['id'] in CLAIMS:
                CLAIMS[sc['id']](fresh, sc)
            check_bug(fresh, sc)

    # ---- 4. coding rounds
    helpers = helper_tables(fresh)
    for sc in SC:
        if sc['type'] != 'challenge':
            continue
        got = PARSED.get((sc['id'], 'sol'))
        if not got:
            continue
        check_challenge(fresh, sc, got[1])
        check_data_rows(sc, fresh.out['tables'], helpers)
        check_starter(sc)

    # ---- 7. controls that need the engines
    run_engine_controls(fresh)


SCENE_BY_ID = {s['id']: s for s in SC}


# ======================================================================================================================
# 6. the widget checker and the lint
# ======================================================================================================================
def run_widgets(real_path=None):
    env = dict(os.environ)
    if real_path:
        env['SQ_REAL'] = str(real_path)
    r = subprocess.run(['node', str(HERE / 'check_widgets.js')], capture_output=True, text=True, env=env)
    m = re.search(r'check_widgets: (\d+) checks, (\d+) failures', r.stdout)
    return r.returncode, (int(m.group(1)), int(m.group(2))) if m else None, r.stdout


def check_widgets_and_lint():
    code, counts, out = run_widgets()
    if code != 0 or not counts or counts[1]:
        bad('the widget checker failed:\n' + out[-1200:])
    else:
        tick('widget checker: independent recomputations of the labs', counts[0])
    r = subprocess.run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'sql'], capture_output=True, text=True, cwd=str(ROOT))
    tail = (r.stdout + r.stderr).strip().split('\n')[-1]
    if r.returncode != 0:
        bad('the content lint failed:\n' + (r.stdout + r.stderr)[-1500:])
    else:
        tick('lint: the content lint is clean (%s)' % tail[:100])


# ======================================================================================================================
# 7. controls: broken inputs that the checkers must reject
# ======================================================================================================================
WIDGET_MUTATIONS = [
    ('a changed row count in the clause stepper', lambda r: r['tables']['m1.stage.2']['rows'][0].__setitem__(2, '999.99')),
    ('a changed cell of the truth table', lambda r: r['counts']['m2.truth']['ops'][0]['grid']['duckdb'][0].__setitem__(0, 'FALSE')),
    ('a changed join row count', lambda r: r['counts']['m3.jointypes']['types'][0]['rows'].__setitem__('duckdb', 12)),
    ('a changed fan-out sum', lambda r: r['counts']['m3.fanout']['combos'][0]['result']['duckdb'].__setitem__(2, '1.00')),
    ('a changed grouping set row count', lambda r: r['counts']['m4.sets'].__getitem__('variants')[0].__setitem__('rows', 99)),
    ('a changed row of the recursive tree', lambda r: r['tables']['m5.tree_iterations.duckdb']['rows'][0].__setitem__(2, 'x')),
    ('a changed window frame result', lambda r: r['counts']['m6.frames']['combos']['ROWS|UNBOUNDED PRECEDING|CURRENT ROW']['rows'][3].__setitem__(1, '1.00')),
    ('a changed time zone bucket', lambda r: r['counts']['m7.buckets']['combos'][r['counts']['m7.buckets']['tzs'][0] + '|' + r['counts']['m7.buckets']['units'][0]]['buckets'].__setitem__(0, '1999-01-01')),
    ('a changed funnel step', lambda r: r['counts']['m8.sessions_lab']['combos']['30']['funnel'].__setitem__(0, 99)),
    ('a changed dimension row', lambda r: r['tables']['m9.scd2_final.duckdb']['rows'][0].__setitem__(2, 'platinum')),
    ('a changed isolation outcome', lambda r: r['counts']['m10.lab']['runs']['lost|read committed'].__setitem__('final', '999')),
    ('a changed plan row count', lambda r: r['counts']['m11.lab'].__setitem__('table_rows', 29999)),
    ('a changed grain row count', lambda r: r['tables']['m12.grain_line.duckdb']['rows'][0].__setitem__(0, '1')),
]


def changed_tables(tables):
    t = copy.deepcopy(tables)
    first = next(iter(t.values()))
    first['rows'][0][0] = first['rows'][0][0] + '!'
    return t


def tampered_recording(mutate):
    r = copy.deepcopy(real)
    mutate(r)
    path = pathlib.Path(tempfile.mkdtemp(prefix='sq-ctl-')) / 'real.js'
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(r) + ';\n')
    return path


def run_engine_controls(fresh):
    ctl = R.Rec()
    ctl.eng = fresh.eng
    ctl.dsn = fresh.dsn
    sql_scene = next(s for s in SC if s['type'] == 'sql' and s.get('result') and len(s['result']['rows']) > 1)
    key = next(k for k, v in fresh.out['files'].items() if v.strip() == sql_scene['code'].strip())
    challenge = next(s for s in SC if s['type'] == 'challenge' and s.get('data') and not s.get('engine') and 'sum(' in s['sol'].lower())
    parsed = PARSED[(challenge['id'], 'sol')][1]

    def with_cell(sc):
        s = copy.deepcopy(sc)
        s['result']['rows'][0][-1] = 'x' + s['result']['rows'][0][-1]
        return s

    def with_swapped_columns(sc):
        s = copy.deepcopy(sc)
        s['result']['cols'] = list(reversed(s['result']['cols']))
        return s

    def wrong_solution(sc, old, new):
        s = copy.deepcopy(sc)
        s['sol'] = s['sol'].replace(old, new)
        return s

    def made_up_row(sc):
        s = copy.deepcopy(sc)
        d = next(d for d in s['data'] if d['name'].split()[0] in MINI)
        d['rows'][0][-1] = '123456.78' if d['types'][-1].startswith('DECIMAL') else 'zzz'
        return s

    def leaky_starter(sc):
        s = copy.deepcopy(sc)
        s['starter'] = '-- start here\n' + s['sol']
        return s

    tr = copy.deepcopy(fresh.out['counts']['m13.translate'])
    trscene = copy.deepcopy(SCENE_BY_ID['m13-trans-trycast'])
    trscene['code'] = trscene['code'].replace('(ran: error)', '(ran: same rows)', 1)

    def expect_runtime_error():
        blocks = R.parse_blocks('-- @name ctl.x\n-- @error\nSELECT 1;\n')
        try:
            R.run_block(ctl, blocks[0])
        except RuntimeError as ex:
            return [str(ex)]
        return []

    CONTROLS = [
        ('SQL that does not parse', lambda: check_parse('control', 'code', 'SELEC customer_id FORM customers', ['duckdb']), 'cannot read'),
        ('an unclosed parenthesis', lambda: check_parse('control', 'code', 'SELECT (1 + 2 FROM orders', list(DIALECTS)), 'cannot read'),
        ('a changed cell in a table on screen', lambda: check_scene_result(with_cell(sql_scene), fresh.out['tables'], key), 'differs from the fresh run'),
        ('swapped columns in a table on screen', lambda: check_scene_result(with_swapped_columns(sql_scene), fresh.out['tables'], key), 'differs from the fresh run'),
        ('a plan line that no recording has', lambda: check_text_scene({'id': 'control', 'code': 'Seq Scan on nothing (actual rows=1 loops=1)'}, [v for v in fresh.out['text'].values() if isinstance(v, str)]), 'in no recorded plan'),
        ('a solution that counts where it should sum', lambda: check_challenge(fresh, wrong_solution(challenge, 'sum(', 'count('), parsed), 'does not give the rows on screen'),
        ('a solution that reads a table that is not on screen', lambda: check_challenge(fresh, wrong_solution(challenge, 'orders', 'order_items'), parsed), 'does not give the rows on screen'),
        ('a made-up row in the data on screen', lambda: check_data_rows(made_up_row(challenge), fresh.out['tables'], {}), 'are not rows of the Brewline table'),
        ('a starter that contains the solution', lambda: check_starter(leaky_starter(challenge)), 'contains the solution'),
        ('a translation label that is wrong', lambda: check_translation_scene(trscene, tr), 'label of'),
        ('a recording that changed one cell', lambda: diff_recordings(real['tables'], changed_tables(real['tables'])), 'changed'),
        ('a recording that lost a table', lambda: diff_recordings(real['tables'], {k: v for k, v in list(real['tables'].items())[1:]}), 'does not make'),
        ('a block that must fail and does not', expect_runtime_error, 'expected to fail and did not'),
        ('a bug scene whose fix changes nothing', lambda: check_bug_same(fresh), 'leave the same result'),
    ]
    for label, fn, expect_text in CONTROLS:
        with collecting() as found:
            got = fn()
        found = list(found) + [str(x) for x in (got or [])]
        if not any(expect_text in m for m in found):
            bad('control "%s": the checker said %s' % (label, found or 'nothing'))
        else:
            tick('controls: a broken input is flagged by the checker')


def check_bug_same(fresh):
    sc = {'id': 'control-bug', 'type': 'bug', 'lang': 'sql', 'code': 'SELECT count(*) AS n FROM orders', 'fix': 'SELECT count(*) AS n FROM orders'}
    for kind in ('code', 'fix'):
        PARSED[(sc['id'], kind)] = check_parse(sc['id'], kind, sc[kind], ['duckdb'])
    check_bug(fresh, sc)


def widget_controls():
    for label, mutate in WIDGET_MUTATIONS:
        path = tampered_recording(mutate)
        code, counts, out = run_widgets(path)
        if code == 0 or not counts or counts[1] == 0:
            bad('control "%s": the widget checker accepted a changed recording' % label)
        else:
            tick('controls: a changed recording is rejected by the widget checker')
        shutil_rmtree(path.parent)


def shutil_rmtree(p):
    import shutil
    shutil.rmtree(p, ignore_errors=True)


def run_labs(real_path=None):
    env = dict(os.environ)
    if real_path:
        env['SQ_REAL'] = str(real_path)
    r = subprocess.run(['node', str(HERE / 'e2e_labs.js')], capture_output=True, text=True, env=env, cwd=str(ROOT))
    m = re.search(r'e2e labs: (\d+) passed, (\d+) failed', r.stdout)
    return r.returncode, (int(m.group(1)), int(m.group(2))) if m else None, r.stdout + r.stderr


BROWSER_MUTATIONS = [
    ('a changed funnel step', 'sessions lab', lambda r: r['counts']['m8.sessions_lab']['combos']['30']['funnel'].__setitem__(0, 99)),
    ('a changed dimension row', 'dimension lab', lambda r: r['tables']['m9.scd2_final.duckdb']['rows'][5].__setitem__(2, 'platinum')),
]


def browser_checks():
    code, counts, out = run_labs()
    if code != 0 or not counts or counts[1]:
        bad('the lab browser tests failed:\n' + out[-1500:])
    else:
        tick('browser: lab checks in Chromium against values worked out by hand', counts[0])
    for label, lab, mutate in BROWSER_MUTATIONS:
        path = tampered_recording(mutate)
        code, counts, out = run_labs(path)
        if code == 0 or ('FAIL: ' + lab) not in out:
            bad('control "%s": the lab browser tests did not reject a changed recording in the %s' % (label, lab))
        else:
            tick('controls: a changed recording is rejected by the lab browser tests')
        shutil_rmtree(path.parent)


# ======================================================================================================================
# main
# ======================================================================================================================
check_widgets_and_lint()
widget_controls()
if args.browser:
    browser_checks()
if not args.no_run:
    fresh = R.Rec()
    pgs = world.open_world(fresh)
    try:
        run_checks(fresh)
    finally:
        pgs.stop()

# ======================================================================================================================
# 8. --recapture: the recorder runs again as its own process
# ======================================================================================================================
if args.recapture:
    CACHE.mkdir(exist_ok=True)
    fresh_js, fresh_json = CACHE / 'real_fresh.js', CACHE / 'real_fresh.json'
    if args.reuse and fresh_json.exists():
        print('recapture: comparing the recording kept from the last run')
        rc = 0
    else:
        r = subprocess.run([sys.executable, str(HERE / 'capture_sq.py'), '--out', str(fresh_js), '--json', str(fresh_json)], capture_output=True, text=True)
        rc = r.returncode
        if rc != 0:
            bad('capture_sq.py failed:\n' + (r.stdout + r.stderr)[-1500:])
    if rc == 0:
        d = diff_recordings(real, json.loads(fresh_json.read_text()))
        if d:
            for x in d[:40]:
                bad('the recording differs: ' + x)
        else:
            n = {k: len(real[k]) for k in ('files', 'text', 'tables', 'counts')}
            tick('recapture: recordings that capture_sq.py made again in its own process and found equal to js/real.js', sum(n.values()))
            print('recapture: %s were recorded again and match js/real.js' % ', '.join('%d %s' % (v, k) for k, v in n.items()))
        if fresh_js.exists():
            if fresh_js.read_bytes() == (ROOT / 'sql' / 'js' / 'real.js').read_bytes():
                tick('recapture: js/real.js is byte for byte what capture_sq.py writes')
            else:
                bad('js/real.js is not byte for byte what capture_sq.py writes')

print()
for k in sorted(TALLY):
    print('  %4d  %s' % (TALLY[k], k))
print('verification clean' if not problems else '%d problem(s)' % problems)
sys.exit(1 if problems else 0)
