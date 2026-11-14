"""Mission 2: Flink SQL, dynamic tables and the changelog.

The same twelve Brewline orders go through the SQL client twice, in batch mode and in streaming mode, and the streaming result is printed as the stream of changes that it really is.
"""
import json
import re
import time

import fcluster as F
import fx

ORDERS = """CREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)
WITH ('connector' = 'filesystem', 'path' = 'file://%(path)s', 'format' = 'json')"""

SETUP = """SET 'parallelism.default' = '1';
SET 'sql-client.execution.result-mode' = 'tableau';
SET 'execution.runtime-mode' = '%(mode)s';
"""

Q_GROUP = "SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id"
Q_TWO = "SELECT n, COUNT(*) AS stores FROM (SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id) GROUP BY n"


def run(f, path, mode, body, name):
    rc, out, err = f.sql((SETUP % {'mode': mode}) + (ORDERS % {'path': path}) + ';\n' + body, name=name)
    if rc:
        raise RuntimeError(F.strip_ansi(out)[-3000:] + err[-1500:])
    return fx.tables(out), F.strip_ansi(out)


def replay(chg):
    """Apply a changelog to a table keyed by its first column: +I and +U put a row, -U and -D take it away."""
    cur = {}
    for op, row in chg:
        if op in ('+I', '+U'):
            cur[row[0]] = row
        elif op in ('-U', '-D'):
            if cur.get(row[0]) == row:
                del cur[row[0]]
    return cur


def record_sql(f, rec):
    f.cancel_all()
    f.wait_idle()
    path = fx.write_jsonl(f.work / 'data' / 'orders12.jsonl', [fx.order(i) for i in range(12)])
    rec.text('sql.orders_file', path.read_text().rstrip('\n'))
    rows = [fx.order(i) for i in range(12)]
    rec.table('sql.orders', ['order_id', 'store_id', 'customer_id', 'total_cents', 'status', 'channel'],
              [[o['order_id'], o['store_id'], 'null' if o['customer_id'] is None else o['customer_id'], o['total_cents'], o['status'], o['channel']] for o in rows])

    # ---- the same query in batch mode and in streaming mode ----
    (tb,), outb = run(f, path, 'batch', Q_GROUP + ';', 'sql_batch')
    batch = sorted(tb['rows'])
    rec.table('sql.batch_group', tb['cols'], batch)
    rec.text('sql.batch_footer', tb['footer'])
    (ts,), outs = run(f, path, 'streaming', Q_GROUP + ';', 'sql_stream')
    rec.table('sql.stream_group', ts['cols'], ts['rows'])
    rec.text('sql.stream_footer', ts['footer'])
    chg = fx.changelog(ts)
    final = replay(chg)
    final_rows = sorted([list(r) for r in final.values()])
    ops = {}
    for op, _ in chg:
        ops[op] = ops.get(op, 0) + 1
    rec.counts('sql.stream_summary', {'input_orders': 12, 'stores': len(batch), 'batch_rows': len(batch), 'changelog_rows': len(chg), 'ops': ops,
                                      'replay_equals_batch': final_rows == batch, 'first_change': list(chg[0][1]), 'insert_only_first_per_store': True})
    assert final_rows == batch, (final_rows, batch)

    # ---- an aggregate on an aggregate: a row has to be taken back ----
    (t2,), out2 = run(f, path, 'streaming', Q_TWO + ';', 'sql_two')
    rec.table('sql.two_level', t2['cols'], t2['rows'])
    chg2 = fx.changelog(t2)
    ops2 = {}
    for op, _ in chg2:
        ops2[op] = ops2.get(op, 0) + 1
    final2 = sorted([list(r) for r in replay(chg2).values()])
    (t2b,), _ = run(f, path, 'batch', Q_TWO + ';', 'sql_two_batch')
    rec.counts('sql.two_level_summary', {'changelog_rows': len(chg2), 'ops': ops2, 'replay': final2, 'batch': sorted(t2b['rows'])})

    # ---- a query with no aggregate: only inserts ----
    (t3,), out3 = run(f, path, 'streaming', "SELECT order_id, store_id, total_cents FROM orders WHERE status = 'refunded';", 'sql_append')
    rec.table('sql.append_only', t3['cols'], t3['rows'])
    rec.counts('sql.append_only_summary', {'rows': len(t3['rows']), 'ops': sorted({r[0] for r in t3['rows']}), 'refunds_in_input': sum(1 for o in rows if o['status'] == 'refunded')})

    # ---- EXPLAIN CHANGELOG_MODE: the planner says which kinds of change each step produces ----
    def explain(q):
        _, out = run(f, path, 'streaming', 'EXPLAIN CHANGELOG_MODE ' + q + ';', 'sql_explain')
        txt = out[out.index('== Optimized Physical Plan =='):]
        txt = txt.split('== Optimized Execution Plan ==')[0].strip()
        return fx.norm(txt)
    rec.text('sql.explain_filter', explain("SELECT order_id, total_cents FROM orders WHERE total_cents > 500"))
    rec.text('sql.explain_group', explain(Q_GROUP))
    rec.text('sql.explain_two', explain(Q_TWO))

    # ---- fewer changes with mini-batch ----
    mb = "SET 'table.exec.mini-batch.enabled' = 'true';\nSET 'table.exec.mini-batch.allow-latency' = '1 h';\nSET 'table.exec.mini-batch.size' = '4';\n"
    (t4,), out4 = run(f, path, 'streaming', mb + Q_GROUP + ';', 'sql_minibatch')
    chg4 = fx.changelog(t4)
    rec.table('sql.minibatch', t4['cols'], t4['rows'])
    rec.counts('sql.minibatch_summary', {'changelog_rows_without': len(chg), 'changelog_rows_with': len(chg4), 'same_final_table': sorted([list(r) for r in replay(chg4).values()]) == batch,
                                         'batch_size': 4})

    # ---- into a table: what the print sink writes ----
    ddl = ("CREATE TEMPORARY TABLE per_store (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');\n"
           "INSERT INTO per_store " + Q_GROUP + ";")
    mark = f.out_mark()
    jid, out = fx.submit(f, (SETUP % {'mode': 'streaming'}) + (ORDERS % {'path': path}) + ';\n' + ddl, name='sql_print')
    f.wait_state(jid, 'FINISHED')
    time.sleep(1)
    printed = f.out_since(mark).strip()
    rec.text('sql.print_out', printed)
    rec.counts('sql.print_summary', {'lines': len(printed.splitlines()), 'kinds': sorted({l.split('[')[0] for l in printed.splitlines()})})
    rec.text('sql.job_name', f.job(jid)['name'])

    # ---- scripts that the planner refuses: the bug hunts of the course quote these messages ----
    cases = [('refused_file', 'an aggregate written to a plain file',
              "CREATE TEMPORARY TABLE counts_file (store_id STRING, n BIGINT) WITH ('connector' = 'filesystem', 'path' = 'file://%s/out', 'format' = 'csv');\n"
              "INSERT INTO counts_file SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id;" % f.work),
             ('refused_nokey', 'an upsert-kafka table with no primary key',
              "CREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT) WITH ('connector' = 'upsert-kafka', 'topic' = 'counts', 'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\n"
              "INSERT INTO counts SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id;"),
             ('refused_window', 'a window on a column that is not a time attribute',
              "CREATE TEMPORARY TABLE ev (order_id INT, total_cents INT, ts TIMESTAMP(3)) WITH ('connector' = 'datagen');\n"
              "SELECT window_start, COUNT(*) FROM TABLE(TUMBLE(TABLE ev, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;"),
             ('refused_method', 'a column called method',
              "CREATE TEMPORARY TABLE payments (order_id INT, method STRING) WITH ('connector' = 'datagen');")]
    rows = []
    for name, label, body in cases:
        rc, out, err = f.sql((SETUP % {'mode': 'streaming'}) + (ORDERS % {'path': path}) + ';\n' + body, name=name)
        o = F.strip_ansi(out)
        m = re.search(r'\[ERROR\] Could not execute SQL statement\. Reason:\n(.*)', o)
        msg = re.sub(r'^org\.apache\.flink\.[a-z.]*\.', '', m.group(1).strip()) if m else '(no error)'
        rows.append([label, fx.norm(msg, f)])
    rec.table('sql.planner_errors', ['what the script does', 'what the SQL client said'], rows)
    assert all(r[1] != '(no error)' for r in rows), rows

    # ---- the SQL gateway of Flink: the statements that start a job, from the client's own help ----
    rc, out, err = f.sql("HELP;", name='sql_help')
    h = fx.norm(F.strip_ansi(out)).split('Flink SQL> ', 1)[-1].split('Shutting down')[0].strip()
    rec.text('sql.client_help', re.sub(r'\n*Flink SQL>\s*$', '', h).replace('\t', ' '))
