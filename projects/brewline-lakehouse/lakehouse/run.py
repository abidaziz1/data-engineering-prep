"""One run of the lakehouse for one day of the pretend source.

Land the files, ingest to bronze, build silver, refresh gold, and check.

Run:   python -m lakehouse.run --day 2
Prints what each step did, and exits with 1 when the quality gate fails.
"""

import argparse
import sys

from . import bronze, config, gold, landing, quality, silver
from .spark import session


def run(day):
    spark = session()
    landing.write_day(day, config.LANDING)
    run_id = 'day-%d' % day
    files, n = bronze.ingest(spark, run_id)
    out = ['day %d: %d new files, %d bronze rows' % (day, len(files), n)]
    if not files:
        out.append('nothing to do: every file is in the ledger')
        return out, True
    stats = silver.process(spark, run_id)
    left = stats['distinct'] - stats['inserted'] - stats['updated']
    out.append(
        'silver: %d valid, %d quarantined; merge inserted %d, updated %d, left %d alone'
        % (stats['valid'], stats['quarantined'], stats['inserted'], stats['updated'], left)
    )
    dates = stats['batch_dates']
    out.append('gold: %d rows for %d days' % (gold.refresh(spark, dates), len(dates)))
    extra = quality.unexpected_fields(spark, run_id)
    if extra:
        out.append('warning: unexpected fields in the files: ' + ', '.join(extra))
    checks = quality.gate(spark, run_id, stats)
    for name, ok, got, want in checks:
        text = '' if ok else ' (expected %s)' % want
        out.append('%s %s: %s%s' % ('PASS' if ok else 'FAIL', name, got, text))
    return out, all(ok for _, ok, _, _ in checks)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--day', type=int, required=True)
    lines, ok = run(ap.parse_args().day)
    print('\n'.join(lines))
    sys.exit(0 if ok else 1)
