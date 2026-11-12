"""Mission 1: the map. The fragile script, what it does when it runs twice, and what a notebook hides."""
import pathlib


def sample_incoming(cwd):
    d = pathlib.Path(cwd) / 'incoming'
    d.mkdir(exist_ok=True)
    (d / 'orders_a.csv').write_text(
        'order_id,customer_id,total,ordered_at\n'
        'O-1001,C-17,12.50,2026-03-01 08:15:00\n'
        'O-1002,C-22,4.75,2026-03-01 09:02:00\n'
        'O-1003,C-17,31.00,2026-03-01 23:58:00\n', encoding='utf-8')
    (d / 'orders_b.csv').write_text(
        'order_id,customer_id,total,ordered_at\n'
        'O-1004,C-31,8.20,2026-03-02 00:03:00\n'
        'O-1005,C-22,19.90,2026-03-02 10:41:00\n'
        'O-1006,C-40,2.50,2026-03-02 12:30:00\n', encoding='utf-8')
    (pathlib.Path(cwd) / 'later').mkdir(exist_ok=True)
    (pathlib.Path(cwd) / 'later' / 'orders_c.csv').write_text(
        'order_id,customer_id,total,ordered_at\n'
        'O-1007,C-12,5.10,2026-03-03 07:50:00\n'
        'O-1008,C-17,9.00,2026-03-03 08:20:00\n'
        'O-1009,C-55,n/a,2026-03-03 09:45:00\n'
        'O-1010,C-31,14.25,2026-03-03 11:05:00\n', encoding='utf-8')


def record(rec, work, cache):
    rec.lesson('m1/load_orders_v7.py', setup=sample_incoming, runs=2)
    rec.lesson('m1/partial_failure.py', setup=sample_incoming, runs=2)
    rec.lesson('m1/notebook_cells.py')
    rec.lesson('m1/load_orders_v8.py', setup=sample_incoming, runs=2)
    rec.lesson('m1/versions.py')
