"""Mission 6: the frame lab (all 27 frame settings on the three engines) and the plan of a window function. Rows are real, times are not recorded."""

MODES = ('ROWS', 'RANGE', 'GROUPS')
STARTS = ('UNBOUNDED PRECEDING', 'N PRECEDING', 'CURRENT ROW')
ENDS = ('CURRENT ROW', 'N FOLLOWING', 'UNBOUNDED FOLLOWING')
RANGE_N = 10          # RANGE counts values: 10 means "revenue within 10 of the current row"
ROW_N = 1             # ROWS and GROUPS count rows and groups

Q_WIN = ("SELECT order_id, customer_id,\n"
         "       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_ts) AS n\n"
         "FROM big_orders")


def frame_sql(mode, start, end):
    n = RANGE_N if mode == 'RANGE' else ROW_N
    frame = '%s BETWEEN %s AND %s' % (mode, start.replace('N PRECEDING', '%d PRECEDING' % n), end.replace('N FOLLOWING', '%d FOLLOWING' % n))
    return ("SELECT revenue,\n"
            "       sum(revenue) OVER (ORDER BY revenue %s) AS s,\n"
            "       count(*) OVER (ORDER BY revenue %s) AS n\n"
            "FROM daily_revenue" % (frame, frame)), frame


def run(rec):
    # ---- the lab: the same ten revenues, 27 frames, three engines. Rows with the same revenue are interchangeable, so each result is
    #      a list of (revenue, sum, count) in a fixed order and the three engines must give the same list.
    base = rec.run('duckdb', 'SELECT revenue FROM daily_revenue ORDER BY revenue, store_id')
    revenues = [str(r[0]) for r in base.rows]
    combos = {}
    for mode in MODES:
        for start in STARTS:
            for end in ENDS:
                sql, frame = frame_sql(mode, start, end)
                answers = {}
                for e in ('duckdb', 'postgres', 'sqlite'):
                    with rec.tx(e):
                        res = rec.run(e, sql)
                    rows = sorted((float(r[0]), float(r[1]), int(r[2])) for r in res.rows)
                    answers[e] = rows
                if not (answers['duckdb'] == answers['postgres'] == answers['sqlite']):
                    raise RuntimeError('the engines disagree on ' + frame + ': ' + repr(answers))
                combos['%s|%s|%s' % (mode, start, end)] = {'frame': frame, 'rows': [[('%g' % a) if a != int(a) else str(int(a)), '%g' % b if b != int(b) else str(int(b)), c] for a, b, c in answers['duckdb']]}
    rec.counts('m6.frames', {'revenues': revenues, 'range_n': RANGE_N, 'row_n': ROW_N, 'engines': ['duckdb', 'postgres', 'sqlite'], 'combos': combos,
                             'query': frame_sql('ROWS', 'UNBOUNDED PRECEDING', 'CURRENT ROW')[0].replace('ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', '<frame>')})
    # ---- the plan of a window function
    plans = {}
    with rec.tx('postgres'):
        plans['pg_noindex'] = rec.plan_text('postgres', Q_WIN, costs=False)
    with rec.tx('postgres'):
        rec.run('postgres', 'CREATE INDEX big_orders_cust_ts ON big_orders (customer_id, order_ts)')
        rec.run('postgres', 'ANALYZE big_orders')
        plans['pg_index'] = rec.plan_text('postgres', Q_WIN, costs=False)
    plans['duck'] = rec.plan_text('duckdb', Q_WIN)
    for k, v in plans.items():
        rec.text('m6.plan.' + k, v)
    rec.file('m6.plan.query', Q_WIN)
