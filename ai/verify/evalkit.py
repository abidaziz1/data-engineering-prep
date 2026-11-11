"""Small tools for scoring a retrieval assistant: how sure a score is, cheap checks of an answer, and a gate that compares two builds.

The lessons show this file, and the recorder runs it on the real chunks and the real per-question results of the Brewline course.
The answers that the checks look at are written by hand, because no language model was used. The checks are real.
"""
import math
import re


def wilson(hits, n, z=1.96):
    """A 95 percent interval for a share that was measured on n questions."""
    if n == 0:
        return (0.0, 1.0)
    p = hits / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (round(centre - half, 3), round(centre + half, 3))


NUM = re.compile(r'\d+(?:[.,]\d+)?')


def check_answer(answer, cited, retrieved, readable):
    """Checks that need no model. retrieved maps a chunk id to its text. readable is the set of chunk ids that this person may read."""
    if answer.lower().startswith('i cannot find'):
        return {'ok': not cited, 'refused': True, 'problems': ['a refusal that cites a source'] if cited else []}
    problems = []
    if not cited:
        problems.append('no source is cited')
    for c in cited:
        if c not in retrieved:
            problems.append('cites %s, which was not retrieved' % c)
        elif c not in readable:
            problems.append('cites %s, which this person may not read' % c)
    support = NUM.findall(' '.join(retrieved[c] for c in cited if c in retrieved))
    for n in NUM.findall(answer):
        if n not in support:
            problems.append('the number %s is not in any cited source' % n)
    return {'ok': not problems, 'refused': False, 'problems': problems}


def gate(base, cand, tolerance=0.0, kind_tolerance=0.2, min_kind=3):
    """base and cand map a question id to {'kind': ..., 'hit': 0 or 1}. Returns a verdict, the questions that got worse and better, and the change by kind."""
    ids = sorted(base)
    b = sum(base[i]['hit'] for i in ids) / len(ids)
    c = sum(cand[i]['hit'] for i in ids) / len(ids)
    worse = [i for i in ids if base[i]['hit'] > cand[i]['hit']]
    better = [i for i in ids if base[i]['hit'] < cand[i]['hit']]
    kinds = {}
    for k in sorted({base[i]['kind'] for i in ids}):
        ks = [i for i in ids if base[i]['kind'] == k]
        kinds[k] = [round(sum(base[i]['hit'] for i in ks) / len(ks), 3), round(sum(cand[i]['hit'] for i in ks) / len(ks), 3), len(ks)]
    reasons = []
    if c < b - tolerance:
        reasons.append('hit@3 fell from %.3f to %.3f' % (b, c))
    for k, (kb, kc, n) in kinds.items():
        if n >= min_kind and kc < kb - kind_tolerance:
            reasons.append('kind "%s" fell from %.3f to %.3f' % (k, kb, kc))
    return {'verdict': 'fail' if reasons else 'pass', 'reasons': reasons, 'base': round(b, 3), 'cand': round(c, 3), 'worse': worse, 'better': better, 'kinds': kinds}
