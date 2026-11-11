"""A guard between a model that writes SQL and a database. The lessons show this file, and the recorder runs it.

The rule is simple: the model proposes, the guard decides, and the database enforces what the guard cannot see.
  1. Parse the text. One statement, and it must be a SELECT.
  2. Only the tables on the allow list. No table functions (they read files and URLs).
  3. No column on the deny list (personal data).
  4. A LIMIT that cannot be larger than the cap.
  5. Run on a read-only connection, with no access to files or the network, a memory cap and a timeout.
Parsing is not enough on its own, because a parser reads text and the database does the work. Rules 5 is the part that still holds when the parser is wrong.
"""
import threading

import duckdb
import sqlglot
from sqlglot import exp

ALLOWED_TABLES = {'orders', 'stores', 'products'}
DENIED_COLUMNS = {'email', 'phone', 'card_number'}
MAX_LIMIT = 100


class Refused(Exception):
    pass


def check(sql, dialect='duckdb'):
    """Return the SQL to run, and the notes about what was changed. Raise Refused with the reason."""
    try:
        statements = sqlglot.parse(sql, read=dialect)
    except sqlglot.errors.ParseError as e:
        raise Refused('the text is not valid SQL: ' + str(e).splitlines()[0])
    statements = [s for s in statements if s is not None]
    if len(statements) != 1:
        raise Refused('exactly one statement is allowed, found %d' % len(statements))
    stmt = statements[0]
    if not isinstance(stmt, exp.Select):
        raise Refused('only SELECT is allowed, found ' + type(stmt).__name__.upper())
    ctes = {c.alias.lower() for c in stmt.find_all(exp.CTE)}
    for t in stmt.find_all(exp.Table):
        if not isinstance(t.this, exp.Identifier):
            raise Refused('table functions are not allowed (they read files and URLs)')
        if t.name.lower() not in ALLOWED_TABLES | ctes:
            raise Refused('the table %s is not on the allow list' % t.name)
    for c in stmt.find_all(exp.Column):
        if c.name.lower() in DENIED_COLUMNS:
            raise Refused('the column %s holds personal data' % c.name)
    notes = []
    limit = stmt.args.get('limit')
    if limit is None:
        stmt = stmt.limit(MAX_LIMIT)
        notes.append('LIMIT %d added' % MAX_LIMIT)
    else:
        n = limit.expression
        if isinstance(n, exp.Literal) and n.is_int and int(n.name) > MAX_LIMIT:
            stmt = stmt.limit(MAX_LIMIT)
            notes.append('LIMIT lowered from %s to %d' % (n.name, MAX_LIMIT))
    return stmt.sql(dialect=dialect), notes


def run_readonly(db_path, sql, timeout=1.0):
    """Run on a read-only connection with no external access. A query that runs longer than the timeout is interrupted."""
    con = duckdb.connect(db_path, read_only=True)
    con.execute("SET enable_external_access = false")
    con.execute("SET memory_limit = '256MB'")
    timer = threading.Timer(timeout, con.interrupt)
    timer.start()
    try:
        return con.execute(sql).fetchall()
    finally:
        timer.cancel()
        con.close()
