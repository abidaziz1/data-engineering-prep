"""Mission 6: dates, time zones and money."""
import math
from datetime import datetime, timedelta, timezone
from decimal import ROUND_DOWN, ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

ZONES = ['Europe/London', 'America/New_York', 'Asia/Singapore', 'Asia/Kolkata', 'Australia/Sydney', 'Australia/Lord_Howe']


def transitions(zone, year=2026):
    tz = ZoneInfo(zone)
    t = datetime(year, 1, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    prev = t.astimezone(tz).utcoffset()
    out = []
    while t < end:
        t2 = t + timedelta(minutes=15)
        off = t2.astimezone(tz).utcoffset()
        if off != prev:
            out.append((t2, prev, off))
            prev = off
        t = t2
    return out


def offset_text(td):
    s = int(td.total_seconds())
    sign = '+' if s >= 0 else '-'
    s = abs(s)
    return '%s%02d:%02d' % (sign, s // 3600, s % 3600 // 60)


def dst_case(zone, naive, kind_hint, label):
    tz = ZoneInfo(zone)
    out = {'zone': zone, 'local': naive.strftime('%Y-%m-%d %H:%M'), 'label': label, 'hint': kind_hint}
    for fold in (0, 1):
        d = naive.replace(tzinfo=tz, fold=fold)
        u = d.astimezone(timezone.utc)
        out['fold%d' % fold] = {'offset': offset_text(d.utcoffset()), 'utc': u.strftime('%Y-%m-%d %H:%M'), 'back': u.astimezone(tz).strftime('%Y-%m-%d %H:%M')}
    a, b = naive.replace(tzinfo=tz, fold=0), naive.replace(tzinfo=tz, fold=1)
    back = a.astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None)
    if a.utcoffset() == b.utcoffset():
        out['kind'] = 'exists once'
    else:
        out['kind'] = 'ambiguous' if back == naive else 'does not exist'
    return out


def dst_cases():
    cases = []
    for zone in ZONES:
        cases.append(dst_case(zone, datetime(2026, 6, 15, 12, 0), 'regular', 'an ordinary noon'))
        for t, prev, off in transitions(zone):
            if off > prev:  # clocks go forward: the wall clock skips from t+prev to t+off
                start = (t + prev).replace(tzinfo=None)
                cases.append(dst_case(zone, start + (off - prev) / 2, 'gap', 'clocks go forward'))
            else:           # clocks go back: the wall clock repeats from t+off to t+prev
                start = (t + off).replace(tzinfo=None)
                cases.append(dst_case(zone, start + (prev - off) / 2, 'ambiguous', 'clocks go back'))
    return cases


def money():
    sums = []
    for n in (10, 100, 1_000, 100_000, 1_000_000):
        f = 0.0
        for _ in range(n):
            f += 0.10
        sums.append({'n': n, 'float': repr(f), 'fsum': repr(math.fsum([0.10] * n)), 'decimal': str(sum(Decimal('0.10') for _ in range(n))), 'cents': str(sum(10 for _ in range(n))),
                     'float_error': repr(f - n / 10)})
    rows = []
    for text, places in (('0.5', 0), ('1.5', 0), ('2.5', 0), ('-2.5', 0), ('2.675', 2), ('1.005', 2), ('0.125', 2)):
        q = Decimal(1).scaleb(-places)
        rows.append({'value': text, 'places': places, 'round': str(round(float(text), places)),
                     'half_even': str(Decimal(text).quantize(q, rounding=ROUND_HALF_EVEN)), 'half_up': str(Decimal(text).quantize(q, rounding=ROUND_HALF_UP)), 'down': str(Decimal(text).quantize(q, rounding=ROUND_DOWN))})
    return {'sums': sums, 'rounding': rows}


def record(rec, work, cache):
    for name in ('naive_aware', 'iso_parse', 'zoneinfo_dst', 'day_buckets', 'money', 'normalize_timestamps', 'local_days'):
        rec.lesson('m6/%s.py' % name)
    rec.counts('m6.dst', {'tzdata': rec.data['meta'].get('tzdata'), 'cases': dst_cases(), 'note': 'computed with zoneinfo; kind is found with the check from PEP 495: a local time that does not survive a trip through UTC does not exist'})
    rec.counts('m6.money', money())
