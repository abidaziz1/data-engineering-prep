"""The recording kit of the SQL tutorial: it holds the three engines, runs .sql files made of named blocks, and keeps what they said.

A block in a .sql file looks like this:

    -- @name m2.null_compare            the key of the recording (required)
    -- @engines duckdb postgres sqlite  which engines run it (default: duckdb)
    -- @error                           the last statement must fail, and the error text is recorded
    -- @as text                         record the rows as text (plans), not as a table
    -- @setup app_events                run the named setup script (SETUPS below) first, not shown, so that several blocks can share a small table
    SELECT ...;

The text after the header is the SQL that the lesson shows (files[name]). Every statement runs inside a transaction that is rolled
back at the end, so a block never changes the data of the next one. A line  -- @snap key: SELECT ...  records the result of that
query at that point (a table before and after an UPDATE) and is not shown.
"""
import contextlib
import json
import re

import engines as E
import sqlglot

KEYS = ('meta', 'files', 'text', 'tables', 'counts')

# small tables that some lessons create for themselves: one script for every block that names it with  -- @setup <name>
SETUPS = {
    'app_events': '''
CREATE TABLE app_events (event_id INTEGER, payload VARCHAR);
INSERT INTO app_events VALUES
  (1, '{"device":"ios","country":"SG","cart":{"items":[{"sku":"ESP-01","qty":2},{"sku":"LAT-01","qty":1}],"coupon":null}}'),
  (2, '{"device":"android","country":"MY","cart":{"items":[{"sku":"BEA-01","qty":1}],"coupon":"WELCOME"}}'),
  (3, '{"device":"web","country":"SG","cart":{"items":[]}}'),
  (4, '{"device":"ios","country":"ID"}');
''',
    'store_day': '''
CREATE TABLE store_day (store_id INTEGER, day DATE, revenue DECIMAL(10,2), PRIMARY KEY (store_id, day));
INSERT INTO store_day SELECT store_id, day, revenue FROM daily_revenue;
CREATE TABLE incoming (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO incoming VALUES (1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00);
''',
    'stock': '''
CREATE TABLE stock (sku VARCHAR PRIMARY KEY, name VARCHAR, qty INTEGER);
INSERT INTO stock VALUES ('ESP-01', 'Espresso beans', 40), ('LAT-01', 'Oat milk', 25), ('MUG-01', 'Mug', 8);
''',
}


class Rec:
    def __init__(self):
        self.out = {k: {} for k in KEYS}
        self.eng = {}
        self.blocks = 0
        self.statements = 0

    # ------------------------------------------------------------------------------------------------ the recording
    def put(self, section, key, value):
        if key in self.out[section]:
            raise RuntimeError('recording key used twice: %s %s' % (section, key))
        self.out[section][key] = value
        return value

    def text(self, key, s): return self.put('text', key, s.strip('\n') if isinstance(s, str) else s)
    def file(self, key, s): return self.put('files', key, s if s.endswith('\n') else s + '\n')
    def counts(self, key, d): return self.put('counts', key, d)
    def table(self, key, cols, rows): return self.put('tables', key, {'cols': list(cols), 'rows': [[E.fmt(c) for c in r] for r in rows]})
    def result_table(self, key, res): return self.table(key, res.cols, res.rows)

    # ------------------------------------------------------------------------------------------------ running SQL
    def run(self, engine, sql):
        self.statements += 1
        return self.eng[engine].run(sql)

    @contextlib.contextmanager
    def tx(self, engine):
        e = self.eng[engine]
        e.begin()
        try:
            yield e
        finally:
            try:
                e.rollback()
            except Exception:
                pass

    def try_run(self, engine, sql):
        """Run a statement that may fail. Returns (result, None) or (None, first line of the error)."""
        try:
            return self.run(engine, sql), None
        except Exception as ex:
            return None, E.error_text(ex)

    def scalar(self, engine, sql):
        r = self.run(engine, sql)
        return r.rows[0][0]

    # ------------------------------------------------------------------------------------------------ plans
    def plan_text(self, engine, sql, analyze=True, buffers=False, costs=True):
        """A plan as text that does not change from run to run: no times. Rows are real (analyze) or estimated."""
        if engine == 'postgres':
            opts = ['ANALYZE', 'TIMING OFF', 'SUMMARY OFF'] if analyze else []
            if analyze and buffers:
                opts.append('BUFFERS')
            if not costs:
                opts.append('COSTS OFF')
            res = self.run('postgres', 'EXPLAIN (%s) %s' % (', '.join(opts), sql) if opts else 'EXPLAIN ' + sql)
            return '\n'.join(r[0] for r in res.rows)
        if engine == 'sqlite':
            res = self.run('sqlite', 'EXPLAIN QUERY PLAN ' + sql)
            return sqlite_plan(res.rows)
        res = self.run('duckdb', 'EXPLAIN (%sFORMAT JSON) %s' % ('ANALYZE, ' if analyze else '', sql))
        return duck_plan(json.loads(res.rows[0][1]), analyze)


# ------------------------------------------------------------------------------------------------ plan renderers
def sqlite_plan(rows):
    depth = {0: 0}
    lines = ['QUERY PLAN']
    kids = {}
    for (i, parent, _, detail) in rows:
        kids.setdefault(parent, []).append((i, detail))

    def walk(parent, d):
        items = kids.get(parent, [])
        for k, (i, detail) in enumerate(items):
            last = k == len(items) - 1
            lines.append('    ' * d + ('`--' if last else '|--') + detail)
            walk(i, d + 1)
    walk(0, 0)
    return '\n'.join(lines)


SKIP = {'RESULT_COLLECTOR', 'EXPLAIN_ANALYZE', 'PROJECTION', 'COLUMN_DATA_SCAN'}


def duck_plan(j, analyze):
    """DuckDB's JSON plan as a short tree: the operators that do work, their key facts and their rows."""
    root = j['operator'][0] if analyze else j[0]

    def info(n):
        x = n.get('extra_info') or {}
        t = n.get('type') or n.get('name')
        bits = []
        if t in ('SEQ_SCAN', 'TABLE_SCAN'):
            name = (x.get('Table') or '').split('.')[-1] or x.get('Function') or ''
            head = 'SCAN ' + name
            if x.get('Filters'):
                bits.append('filter: ' + re.sub(r'\s+', ' ', str(x['Filters'])).strip())
        elif t == 'HASH_JOIN':
            head = 'HASH_JOIN ' + str(x.get('Join Type', ''))
            bits.append(str(x.get('Conditions', '')).replace('\n', ' AND '))
        elif t == 'HASH_GROUP_BY' or t == 'PERFECT_HASH_GROUP_BY':
            head = t
            bits.append('groups: ' + str(x.get('Groups', '')))
            ag = x.get('Aggregates')
            if ag:
                bits.append('aggregates: ' + (', '.join(ag) if isinstance(ag, list) else str(ag)))
        elif t == 'ORDER_BY':
            head = 'ORDER_BY ' + str(x.get('Order By', '')).replace('\n', ', ')
        elif t == 'TOP_N':
            head = 'TOP_N'
            bits.append(' '.join(str(v) for k, v in x.items() if k not in ('Estimated Cardinality',)).replace('\n', ' '))
        elif t == 'FILTER':
            head = 'FILTER ' + str(x.get('Expression', '')).replace('\n', ' AND ')
        elif t == 'WINDOW':
            head = 'WINDOW ' + ' | '.join(str(v) for k, v in x.items() if k != 'Estimated Cardinality').replace('\n', ' ')
        else:
            head = t
            for k, v in x.items():
                if k != 'Estimated Cardinality':
                    bits.append('%s: %s' % (k.lower(), re.sub(r'\s+', ' ', str(v)).strip()))
        if analyze:
            rows = n.get('intermediate_rows')
            if n.get('rows_scanned') is not None:
                bits.append('scanned %d' % n['rows_scanned'])
            bits.append('rows %d' % rows)
        else:
            est = x.get('Estimated Cardinality')
            if est is not None:
                bits.append('~%s rows' % est)
        return head + (('   (' + ', '.join(b for b in bits if b) + ')') if bits else '')

    lines = []

    def walk(n, d):
        t = n.get('type') or n.get('name')
        if t in SKIP:
            for c in n.get('children', []):
                walk(c, d)
            return
        lines.append('  ' * d + info(n))
        for c in n.get('children', []):
            walk(c, d + 1)
    walk(root, 0)
    return '\n'.join(lines)


# ------------------------------------------------------------------------------------------------ .sql files
def parse_blocks(text, fname=''):
    blocks, cur = [], None
    for line in text.split('\n'):
        m = re.match(r'^-- @name\s+(\S+)\s*$', line)
        if m:
            cur = {'name': m.group(1), 'opts': {}, 'lines': [], 'file': fname, 'head': True}
            blocks.append(cur)
            continue
        if cur is None:
            continue
        m = re.match(r'^-- @(\w+)(?:\s+(.*))?$', line)
        if m and cur['head']:
            cur['opts'][m.group(1)] = (m.group(2) or '').strip()
            continue
        if line.strip() == '' and cur['head'] and not cur['lines']:
            continue
        cur['head'] = False
        cur['lines'].append(line)
    for b in blocks:
        items, acc = [], []
        shown = []
        for line in b['lines']:
            m = re.match(r'^-- @snap\s+(\S+):\s*(.+)$', line)
            if m:
                if acc:
                    items += [('sql', s) for s in E.split_statements('\n'.join(acc))]
                    acc = []
                items.append(('snap', m.group(1), m.group(2).rstrip(';')))
                continue
            acc.append(line)
            shown.append(line)
        if acc:
            items += [('sql', s) for s in E.split_statements('\n'.join(acc))]
        b['items'] = items
        b['shown'] = '\n'.join(shown).strip('\n')
        del b['lines']
    return blocks


def run_block(rec, b):
    """Run one block on its engines and record it. Returns nothing: the recording holds the answer."""
    name = b['name']
    engs = b['opts'].get('engines', 'duckdb').split()
    for e in engs:
        if e not in E.ENGINES:
            raise RuntimeError('block %s names an unknown engine %s' % (name, e))
    many = len(engs) > 1
    rec.file(name, b['shown'])
    expect_error = 'error' in b['opts']
    each = 'each' in b['opts']          # the engines may differ: record a table or an error for each one
    as_text = b['opts'].get('as') == 'text'
    for e in engs:
        key = name + '.' + e if many else name
        last, err = None, None
        with rec.tx(e):
            if 'setup' in b['opts']:
                for st in E.split_statements(SETUPS[b['opts']['setup']]):
                    rec.run(e, st)
            for it in b['items']:
                if it[0] == 'snap':
                    r = rec.run(e, it[2])
                    rec.result_table(it[1] + ('.' + e if many else ''), r)
                    continue
                try:
                    r = rec.run(e, it[1])
                except Exception as ex:
                    if (expect_error or each) and it is b['items'][-1]:
                        err = E.error_text(ex)
                        continue
                    raise RuntimeError('block %s on %s failed: %s\n%s' % (name, e, E.error_text(ex), it[1]))
                if r.cols is not None:
                    last = r
        if err is not None and (expect_error or each):
            rec.text(key + '.error', err)
        elif expect_error:
            raise RuntimeError('block %s on %s was expected to fail and did not' % (name, e))
        elif last is not None:
            if as_text:
                rec.text(key, '\n'.join(str(r[-1]) if len(r) > 1 else str(r[0]) for r in last.rows))
            else:
                rec.result_table(key, last)
    rec.blocks += 1


def run_file(rec, path):
    import pathlib
    for b in parse_blocks(pathlib.Path(path).read_text(), str(path)):
        run_block(rec, b)
