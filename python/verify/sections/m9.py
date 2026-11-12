"""Mission 9: pandas, Polars and DuckDB."""
import json
import pathlib
import statistics

HERE = pathlib.Path(__file__).resolve().parent.parent
ENGINES = ['pandas', 'polars eager', 'polars lazy', 'duckdb']


def fanout():
    import duckdb
    import pandas as pd
    import polars as pl
    orders = pd.DataFrame({'order_id': ['O-1', 'O-2', 'O-3', 'O-4', 'O-5', 'O-6', 'O-7'], 'customer_id': [1, 2, 2, 3, 1, 3, 4], 'total_cents': [1250, 475, 820, 1990, 3100, 640, 560]})
    out = {'orders': {'rows': len(orders), 'cents': int(orders['total_cents'].sum())}, 'cases': []}
    for how in ('inner', 'left'):
        for dup in (0, 1, 2):
            customers = pd.DataFrame({'customer_id': [1, 2, 3] + [3] * dup, 'city': ['London', 'London', 'Singapore'] + ['Singapore'] * dup})
            m = orders.merge(customers, on='customer_id', how=how)
            j = pl.from_pandas(orders).join(pl.from_pandas(customers), on='customer_id', how=how)
            d = duckdb.sql(f'SELECT count(*), sum(total_cents) FROM orders {how.upper()} JOIN customers USING (customer_id)').fetchall()[0]
            assert (len(m), int(m['total_cents'].sum())) == (j.height, int(j['total_cents'].sum())) == (d[0], int(d[1])), 'the three engines must agree'
            case = {'how': how, 'dup': dup, 'rows': len(m), 'cents': int(m['total_cents'].sum())}
            try:
                orders.merge(customers, on='customer_id', how=how, validate='m:1')
                case['pandas_validate'] = None
            except Exception as err:
                case['pandas_validate'] = type(err).__name__ + ': ' + str(err).split('\n')[0]
            try:
                pl.from_pandas(orders).join(pl.from_pandas(customers), on='customer_id', how=how, validate='m:1')
                case['polars_validate'] = None
            except Exception as err:
                case['polars_validate'] = type(err).__name__ + ': ' + str(err)
            out['cases'].append(case)
    return out


def record(rec, work, cache):
    for name in ('nulls_and_types', 'merge_fanout', 'safe_join', 'latest_per_order'):
        rec.lesson('m9/%s.py' % name)
    cwd = rec.lesson('m9/three_engines.py')
    rec.lesson('m9/lazy_polars.py', setup=lambda c: (c / 'orders.parquet').write_bytes((cwd / 'orders.parquet').read_bytes()))
    parquet = cwd / 'orders.parquet'
    results = {}
    for engine in ENGINES:
        runs = []
        for _ in range(5):
            rc, out, _t = rec.run([rec.py, str(HERE / 'bench' / 'engines.py'), engine, str(parquet)], cwd, timeout=300)
            assert rc == 0, out
            runs.append(json.loads(out.strip().split('\n')[-1]))
        results[engine] = {'seconds': round(statistics.median(r['seconds'] for r in runs), 4), 'extra_mb': round(statistics.median(r['extra_mb'] for r in runs), 1),
                           'peak_mb': round(statistics.median(r['peak_mb'] for r in runs), 1), 'runs': [round(r['seconds'], 4) for r in runs]}
    rec.counts('m9.engines', {'rows': 2000000, 'file_mb': round(parquet.stat().st_size / 1e6, 1), 'engines': results,
                              'note': 'each number is the median of 5 runs, each run a new process, reading the same Parquet file and answering the same question, on this machine. extra_mb is the growth of the peak resident memory during the query.'})
    rec.counts('m9.fanout', fanout())
