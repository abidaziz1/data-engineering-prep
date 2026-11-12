"""Mission 3: the join types side by side, and the fan-out lab: which joins break the total, and which fixes keep it."""

TYPES = [('INNER', 'INNER JOIN'), ('LEFT', 'LEFT JOIN'), ('RIGHT', 'RIGHT JOIN'), ('FULL', 'FULL JOIN'), ('CROSS', 'CROSS JOIN')]


def join_sql(kind):
    on = '' if kind == 'CROSS JOIN' else ' ON o.customer_id = c.customer_id'
    return ("SELECT c.customer_id, c.name, o.order_id, o.status\nFROM customers AS c\n%s orders AS o%s\nORDER BY c.customer_id NULLS LAST, o.order_id NULLS LAST" % (kind, on))


def run(rec):
    out = []
    for label, kind in TYPES:
        sql = join_sql(kind)
        rec.file('m3.jointype.' + label.lower(), sql)
        counts = {}
        for e in ('duckdb', 'postgres', 'sqlite'):
            r = rec.run(e, sql)
            counts[e] = len(r.rows)
            if e == 'duckdb':
                rec.result_table('m3.jointype.' + label.lower(), r)
        out.append({'type': label, 'sql_key': 'm3.jointype.' + label.lower(), 'rows': counts})
    rec.counts('m3.jointypes', {'types': out})

    # the fan-out lab: every mix of joins and three ways to total, on every engine
    def sql_for(items, pay, method):
        j = ''
        if method == 'preaggregate':
            ctes = []
            if items:
                ctes.append('items_by_order AS (SELECT order_id, count(*) AS lines FROM order_items GROUP BY order_id)')
            if pay:
                ctes.append('paid_by_order AS (SELECT order_id, sum(amount) AS net_paid FROM payments GROUP BY order_id)')
            head = ('WITH ' + ',\n     '.join(ctes) + '\n') if ctes else ''
            if items:
                j += 'LEFT JOIN items_by_order AS i ON i.order_id = o.order_id\n'
            if pay:
                j += 'LEFT JOIN paid_by_order AS p ON p.order_id = o.order_id\n'
            return head + 'SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\n' + j + "WHERE o.status = 'paid'"
        if items:
            j += 'JOIN order_items AS i ON i.order_id = o.order_id\n'
        if pay:
            j += 'JOIN payments AS p ON p.order_id = o.order_id\n'
        agg = 'sum(o.total)' if method == 'sum' else 'sum(DISTINCT o.total)'
        return 'SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, %s AS revenue\nFROM orders AS o\n%sWHERE o.status = \'paid\'' % (agg, j)

    combos = []
    for items in (False, True):
        for pay in (False, True):
            for method in ('sum', 'distinct', 'preaggregate'):
                sql = sql_for(items, pay, method)
                res = {}
                for e in ('duckdb', 'postgres', 'sqlite'):
                    r = rec.run(e, sql)
                    from engines import fmt
                    res[e] = [fmt(x) for x in r.rows[0]]
                combos.append({'items': items, 'payments': pay, 'method': method, 'sql': sql, 'result': res})
    rec.counts('m3.fanout', {'combos': combos, 'truth': rec.scalar('duckdb', "SELECT sum(total) FROM orders WHERE status = 'paid'").__str__()})
