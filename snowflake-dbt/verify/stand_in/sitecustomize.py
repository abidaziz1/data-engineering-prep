"""A recording stand-in for snowflake.connector.connect.

dbt-snowflake imports snowflake.connector and calls connect() when it needs a session. This module replaces connect()
with a fake that (1) writes every statement dbt sends to a JSON-lines file and (2) answers dbt's metadata questions
from a small state file, so dbt believes it is talking to a warehouse. It never opens a network connection and it
runs nothing. Results of ordinary queries are placeholders, so only the statements are meaningful, never the results.

It switches on only when FAKE_SF_LOG is set. Python loads this file automatically when its folder is on PYTHONPATH.
"""
import datetime, json, os, re

LOG = os.environ.get('FAKE_SF_LOG')
STATE = os.environ.get('FAKE_SF_STATE')

if LOG:
    import snowflake.connector as sfc
    import snowflake.connector.errors as sfe

    def load():
        try:
            return json.load(open(STATE))
        except Exception:
            return {'schemas': [], 'relations': {}, 'columns': {}}

    def save(s):
        json.dump(s, open(STATE, 'w'), indent=1)

    def record(sql):
        with open(LOG, 'a') as f:
            f.write(json.dumps({'sql': sql}) + '\n')

    def norm(name):
        return name.replace('"', '').upper()

    TEXT, FIXED, BOOL, TS = 2, 0, 13, 8

    def desc(*names, types=None):
        return [(n, (types or {}).get(n, TEXT), None, None, None, None, True) for n in names]

    class FakeCursor:
        def __init__(self, kw=None):
            self.kw = kw or {}
            self.description = desc('status')
            self._rows = [('Statement executed successfully.',)]
            self.rowcount = 1
            self.sfqid = '01b2c3d4-0000-0000-0000-000000000000'
            self.sqlstate = None
            self.stats = None

        def execute(self, sql, params=None, **kw):
            record(sql)
            self._answer(sql)
            return self

        def _answer(self, sql):
            s = load()
            q = re.sub(r'/\*.*?\*/', '', sql, flags=re.S).strip().rstrip(';').strip()
            low = q.lower()
            self.description, self._rows = desc('status'), [('Statement executed successfully.',)]

            m = re.match(r'show objects in (?:schema )?(.+?)(?:\s+limit.*)?$', low, re.S)
            if m:
                target = norm(m.group(1)).split()[0]
                if target not in s['schemas']:
                    raise sfe.ProgrammingError(msg="SQL compilation error:\nSchema '%s' does not exist or not authorized." % target, errno=2043, sqlstate='02000')
                rows = []
                for name, o in s['relations'].get(target, {}).items():
                    db, sch = target.split('.')
                    rows.append((datetime.datetime(2026, 3, 18, 9, 0, 0), name, sch, o['kind'], db, 'Y' if o.get('dynamic') else 'N', 'N'))
                self.description = desc('created_on', 'name', 'schema_name', 'kind', 'database_name', 'is_dynamic', 'is_iceberg')
                self._rows = rows
                return
            m = re.match(r'show terse schemas in database (\S+)', low)
            if m:
                db = norm(m.group(1))
                self.description = desc('created_on', 'name', 'kind', 'database_name', 'schema_name')
                self._rows = [(datetime.datetime(2026, 3, 18), x.split('.')[1], None, db, None) for x in s['schemas'] if x.startswith(db + '.')]
                return
            if low.startswith('show user functions'):
                self.description, self._rows = desc('catalog_name', 'schema_name', 'name', 'is_builtin'), []
                return
            m = re.match(r'show grants on (?:\w+ )?(\S+)', low)
            if m:
                self.description = desc('created_on', 'privilege', 'granted_on', 'name', 'granted_to', 'grantee_name', 'grant_option', 'granted_by')
                rel = norm(m.group(1))
                self._rows = [(datetime.datetime(2026, 3, 1), g[0], 'TABLE', rel, g[1], g[2], 'false', 'TRANSFORMER') for g in s.get('grants', {}).get(rel, [])]
                return
            m = re.match(r'create (?:or replace )?schema (?:if not exists )?(\S+)', low)
            if m:
                n = norm(m.group(1))
                if n not in s['schemas']:
                    s['schemas'].append(n)
                save(s)
                return
            m = re.match(r'create (?:or replace )?(?:(?:local |global )?(?:temp|temporary|transient|volatile) )?(?:secure )?(table|view|dynamic table) (?:if not exists )?(\S+)', low)
            if m:
                kind = 'VIEW' if m.group(1) == 'view' else 'TABLE'
                parts = norm(m.group(2)).split('(')[0].split('.')
                head = low.split(m.group(2))[0]
                if len(parts) == 3 and '__DBT_TMP' not in parts[2] and 'temporary' not in head and 'temp ' not in head:
                    s['schemas'] = s['schemas'] if parts[0] + '.' + parts[1] in s['schemas'] else s['schemas'] + [parts[0] + '.' + parts[1]]
                    s['relations'].setdefault('%s.%s' % (parts[0], parts[1]), {})[parts[2]] = {'kind': kind, 'dynamic': m.group(1) == 'dynamic table'}
                    save(s)
                return
            m = re.match(r'drop (table|view|dynamic table) (?:if exists )?(\S+)', low)
            if m:
                parts = norm(m.group(2)).split('.')
                if len(parts) == 3:
                    s['relations'].get('%s.%s' % (parts[0], parts[1]), {}).pop(parts[2], None)
                    save(s)
                return
            m = re.match(r'describe table (\S+)', low)
            if m:
                cols = s.get('columns', {}).get(norm(m.group(1)), [])
                self.description = desc('name', 'type', 'kind', 'null?', 'default', 'primary key', 'unique key', 'check', 'expression', 'comment', 'policy name', 'privacy domain')
                self._rows = [(c[0], c[1], 'COLUMN', 'Y', None, 'N', 'N', None, None, None, None, None) for c in cols]
                return
            if 'current_warehouse()' in low:
                self.description = [('warehouse', TEXT, None, None, None, None, True)]
                self._rows = [(self.kw.get('warehouse'),)]
                return
            if 'should_warn' in low:
                self.description = [('failures', FIXED, None, None, None, None, True), ('should_warn', BOOL, None, None, None, None, True), ('should_error', BOOL, None, None, None, None, True)]
                self._rows = [(0, False, False)]
                return
            if 'max_loaded_at' in low:
                self.description = [('max_loaded_at', TS, None, None, None, None, True), ('snapshotted_at', TS, None, None, None, None, True)]
                self._rows = [(datetime.datetime(2026, 3, 18, 9, 0, 0), datetime.datetime(2026, 3, 18, 21, 0, 0))]
                return
            if low.startswith('select') or low.startswith('with'):
                self.description, self._rows = [('result', FIXED, None, None, None, None, True)], [(1,)]
                return

        def fetchall(self):
            return list(self._rows)

        def fetchone(self):
            return self._rows[0] if self._rows else None

        def fetchmany(self, n=1):
            return self._rows[:n]

        def close(self):
            pass

        def __iter__(self):
            return iter(self._rows)

    class FakeConnection:
        def __init__(self, **kw):
            self.kw = kw

        def cursor(self, *a, **k):
            return FakeCursor(self.kw)

        def commit(self):
            pass

        def rollback(self):
            pass

        def close(self):
            pass

        def is_closed(self):
            return False

        @property
        def session_id(self):
            return 1

    SECRET = ('password', 'token', 'private_key', 'private_key_file_pwd', 'passcode', 'oauth')

    def shown(k, v):
        if v is None or isinstance(v, (bool, int, float)):
            return v
        if any(w in k for w in SECRET):
            return '<hidden>' if k != 'private_key' else '<private key, %d bytes>' % len(v)
        if isinstance(v, (bytes, bytearray)):
            return '<%d bytes>' % len(v)
        return v

    def connect(*a, **kw):
        record('-- connect ' + json.dumps({k: shown(k, v) for k, v in sorted(kw.items())}, default=str))
        return FakeConnection(**kw)

    sfc.connect = connect
