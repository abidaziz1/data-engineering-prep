"""Mission 8: the sessions lab. The same 24 events are cut into sessions with five different gap limits, on DuckDB, PostgreSQL and SQLite,
which must agree. Each setting records the sessions, the session of every event and the funnel. Rows are real."""
import engines as E

LIMITS = (5, 10, 30, 45, 120)           # a new session starts when the gap to the previous event is longer than this many minutes
FUNNEL = ('view', 'add_to_cart', 'checkout', 'purchase')


def sql_for(engine, n):
    gap = ("event_ts - LAG(event_ts) OVER w > INTERVAL '%d minutes'" % n) if engine != 'sqlite' else \
          ("round((julianday(event_ts) - julianday(LAG(event_ts) OVER w)) * 1440) > %d" % n)
    return ("WITH flagged AS (\n"
            "  SELECT event_id, customer_id, event_ts, event_type,\n"
            "         CASE WHEN LAG(event_ts) OVER w IS NULL OR %s THEN 1 ELSE 0 END AS is_new\n"
            "  FROM events\n"
            "  WINDOW w AS (PARTITION BY customer_id ORDER BY event_ts, event_id)\n"
            "),\n"
            "numbered AS (\n"
            "  SELECT *, sum(is_new) OVER (PARTITION BY customer_id ORDER BY event_ts, event_id) AS session_no\n"
            "  FROM flagged\n"
            ")" % gap)


def run(rec):
    events = rec.run('duckdb', 'SELECT event_id, customer_id, event_ts, event_type FROM events ORDER BY event_id')
    ev = [[E.fmt(c) for c in r] for r in events.rows]
    combos = {}
    for n in LIMITS:
        answers = {}
        for e in ('duckdb', 'postgres', 'sqlite'):
            head = sql_for(e, n)
            per_event = rec.run(e, head + '\nSELECT event_id, session_no FROM numbered ORDER BY event_id')
            sessions = rec.run(e, head + ("\nSELECT customer_id, session_no, min(event_ts) AS started, max(event_ts) AS ended, count(*) AS events\n"
                                          "FROM numbered GROUP BY customer_id, session_no ORDER BY customer_id NULLS LAST, session_no"))
            funnel = rec.run(e, head + (",\nper_session AS (\n  SELECT customer_id, session_no,\n" +
                                        ",\n".join("         max(CASE WHEN event_type = '%s' THEN 1 ELSE 0 END) AS s%d" % (f, i) for i, f in enumerate(FUNNEL)) +
                                        "\n  FROM numbered GROUP BY customer_id, session_no\n)\nSELECT " + ", ".join("sum(s%d)" % i for i in range(len(FUNNEL))) + " FROM per_session"))
            answers[e] = ([int(r[1]) for r in per_event.rows],
                          [[E.fmt(c) for c in r] for r in sessions.rows],
                          [int(x) for x in funnel.rows[0]])
        if not (answers['duckdb'] == answers['postgres'] == answers['sqlite']):
            raise RuntimeError('the engines disagree on sessions with a limit of %d minutes: %r' % (n, answers))
        per_event, sessions, funnel = answers['duckdb']
        combos[str(n)] = {'session_of_event': per_event, 'sessions': sessions, 'funnel': funnel}
    rec.counts('m8.sessions_lab', {'limits': list(LIMITS), 'steps': list(FUNNEL), 'events': ev, 'combos': combos,
                                   'engines': ['duckdb', 'postgres', 'sqlite'], 'query': sql_for('duckdb', 30) + '\nSELECT customer_id, session_no, min(event_ts) AS started, max(event_ts) AS ended, count(*) AS events\nFROM numbered\nGROUP BY customer_id, session_no\nORDER BY customer_id NULLS LAST, session_no'})
