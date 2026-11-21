"""One run of the pipeline: read the new messages into bronze, apply them to silver, check.

Run:   python -m cdc.run [--replay-last-batch]
Prints what each step did, and exits with 1 when the quality gate fails.
--replay-last-batch removes the commit of the last silver batch first, as a crash would.
"""

import argparse
import sys

from . import bronze, quality, stream
from .spark import session


def run(replay_last=False):
    spark = session()
    added = bronze.ingest(spark)
    out = ['bronze: %d new messages' % added]
    batches = stream.process(spark, replay_last)
    if not batches:
        out.append('silver: nothing new')
    else:
        events = sum(b['events'] for b in batches)
        inserted = sum(b['inserted'] for b in batches)
        updated = sum(b['updated'] for b in batches)
        left = sum(b['distinct'] for b in batches) - inserted - updated
        out.append(
            'silver: %d events in %d batch(es); merge inserted %d, updated %d, left %d alone'
            % (events, len(batches), inserted, updated, left)
        )
    checks = quality.gate(spark)
    for name, ok, got, want in checks:
        text = '' if ok else ' (expected %s)' % want
        out.append('%s %s: %s%s' % ('PASS' if ok else 'FAIL', name, got, text))
    return out, all(ok for _, ok, _, _ in checks)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--replay-last-batch', action='store_true')
    lines, ok = run(ap.parse_args().replay_last_batch)
    print('\n'.join(lines))
    sys.exit(0 if ok else 1)
