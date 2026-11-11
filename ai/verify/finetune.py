"""Turn the Brewline facts into training examples, and check the set before it is used. The lessons show this file, and the recorder runs it."""
import hashlib
import json
import random
import re

TEMPLATES = [
    'What is the rule about {topic}?', 'A new colleague asks: {q}', 'Explain the {topic} policy in one sentence.', 'Quick question about {topic}: what should I do?',
    'What does the {doc} document say about {topic}?', '{q}',
]


def examples(facts, questions, seed=5):
    """facts: {id: (doc, section, sentence, key)}. questions: [(id, text, fact id, kind)]. Returns a list of {fact, messages}."""
    rng = random.Random(seed)
    out = []
    qs = {}
    for qid, text, gold, kind in questions:
        qs.setdefault(gold, []).append(text)
    for fid, (doc, section, sentence, key) in facts.items():
        if fid.endswith('_v1') or fid.endswith('_old'):
            continue
        prompts = []
        for t in TEMPLATES:
            q = rng.choice(qs.get(fid, [section + '?']))
            prompts.append(t.format(topic=section.lower(), doc=doc, q=q))
        for p in dict.fromkeys(prompts):
            out.append({'fact': fid, 'messages': [{'role': 'user', 'content': p}, {'role': 'assistant', 'content': sentence}]})
    return out


def norm(text):
    return re.sub(r'\s+', ' ', text.lower()).strip()


def exact_key(ex):
    return hashlib.sha256((norm(ex['messages'][0]['content']) + '|' + norm(ex['messages'][1]['content'])).encode()).hexdigest()


def drop_exact(exs):
    seen, out = set(), []
    for e in exs:
        k = exact_key(e)
        if k not in seen:
            seen.add(k)
            out.append(e)
    return out


def split_random(exs, share=0.2, seed=1):
    rng = random.Random(seed)
    idx = list(range(len(exs)))
    rng.shuffle(idx)
    cut = int(len(exs) * share)
    return [exs[i] for i in idx[cut:]], [exs[i] for i in idx[:cut]]


def split_by_fact(exs, share=0.2, seed=1):
    """All the examples of one fact go to the same side, so that the validation set holds facts that training never saw."""
    rng = random.Random(seed)
    facts = sorted({e['fact'] for e in exs})
    rng.shuffle(facts)
    held = set(facts[:max(1, int(len(facts) * share))])
    return [e for e in exs if e['fact'] not in held], [e for e in exs if e['fact'] in held]


def leakage(train, valid):
    """How many validation answers also appear as a training answer."""
    answers = {norm(e['messages'][1]['content']) for e in train}
    return sum(1 for e in valid if norm(e['messages'][1]['content']) in answers)


def to_jsonl(exs):
    return '\n'.join(json.dumps({'messages': e['messages']}, ensure_ascii=False) for e in exs)
