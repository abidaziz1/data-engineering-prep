"""The small RAG toolkit of the course: parse, clean, chunk, embed, search, fuse and score.

The lessons show this file, and the recorder runs it, so the code on the screen is the code that produced the numbers.
The embedding is a stand-in: TF-IDF followed by a truncated SVD (latent semantic analysis), trained on the Brewline documents.
A real embedding model is a neural network that was trained on a very large amount of text. This one cannot do that. It is here because no
model could be downloaded where the course was recorded, and because the mechanics (vectors, distance, indexes, filters, fusion, scores) are
the same for any embedding.
"""
import hashlib
import math
import re

import numpy as np

SENT = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9"])')


# ---------------------------------------------------------------------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------------------------------------------------------------------
def drop_repeated_lines(pages, share=0.6):
    """Remove the lines that appear on most pages (a running header or a footer), and the page counters."""
    seen = {}
    for p in pages:
        for line in set(l.strip() for l in p.splitlines() if l.strip()):
            seen[line] = seen.get(line, 0) + 1
    repeated = {l for l, n in seen.items() if n >= max(2, share * len(pages))}
    out = []
    for p in pages:
        keep = [l for l in p.splitlines() if l.strip() not in repeated and not re.fullmatch(r'Page \d+ of \d+', l.strip())]
        out.append('\n'.join(keep))
    return out, sorted(repeated)


def normalize(text):
    """Join lines that were wrapped inside a paragraph, fix spaces, keep paragraph breaks."""
    text = text.replace(' ', ' ')
    paras = re.split(r'\n\s*\n', text)
    paras = [re.sub(r'\s*\n\s*', ' ', p).strip() for p in paras]
    return '\n\n'.join(p for p in paras if p)


def content_hash(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]


# ---------------------------------------------------------------------------------------------------------------------------------------
# Personal data, and near-copies
# ---------------------------------------------------------------------------------------------------------------------------------------
PII = {'email': r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', 'phone': r'\+\d{2}(?: ?\d){8,10}', 'iban': r'\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b'}


def mask_pii(text):
    """Replace what a pattern recognises with a label. A pattern finds the shape of a thing. It does not find a name."""
    found = {}
    for kind, pattern in PII.items():
        found[kind] = len(re.findall(pattern, text))
        text = re.sub(pattern, '[' + kind.upper() + ']', text)
    return text, found


def shingles(text, n=5):
    """Every run of n words, in lower case. Two texts that share most runs are near-copies."""
    w = re.findall(r'\w+', text.lower())
    return {' '.join(w[i:i + n]) for i in range(max(1, len(w) - n + 1))}


def jaccard(a, b):
    """The share of the runs that two texts have in common."""
    return len(a & b) / len(a | b)


def minhash(shingle_set, num_perm=128):
    """A small signature of a set of shingles. The share of equal positions in two signatures estimates their Jaccard similarity."""
    from datasketch import MinHash
    m = MinHash(num_perm=num_perm, seed=1)
    for sh in sorted(shingle_set):
        m.update(sh.encode())
    return m


# ---------------------------------------------------------------------------------------------------------------------------------------
# Chunk. Every function returns a list of strings.
# ---------------------------------------------------------------------------------------------------------------------------------------
def chunk_fixed(text, size=500, overlap=0):
    step = max(1, size - overlap)
    return [text[i:i + size] for i in range(0, len(text), step) if text[i:i + size].strip()]


def split_sentences(text):
    out = []
    for para in re.split(r'\n\s*\n', text):
        out += [s.strip() for s in SENT.split(para) if s.strip()]
    return out


def chunk_sentences(text, size=500):
    """Pack whole sentences until the next one would not fit."""
    chunks, cur = [], ''
    for s in split_sentences(text):
        if cur and len(cur) + 1 + len(s) > size:
            chunks.append(cur)
            cur = s
        else:
            cur = (cur + ' ' + s).strip()
    if cur:
        chunks.append(cur)
    return chunks


def chunk_recursive(text, size=500, seps=('\n\n', '\n', '. ', ' ')):
    """Split at the biggest separator that makes the pieces fit, then merge neighbours back up to the size."""
    if len(text) <= size:
        return [text] if text.strip() else []
    for sep in seps:
        if sep in text:
            parts = [p for p in text.split(sep) if p.strip()]
            pieces = []
            for p in parts:
                pieces += chunk_recursive(p, size, seps[seps.index(sep) + 1:] or (' ',)) if len(p) > size else [p]
            merged, cur = [], ''
            for p in pieces:
                if cur and len(cur) + len(sep) + len(p) > size:
                    merged.append(cur)
                    cur = p
                else:
                    cur = (cur + sep + p) if cur else p
            if cur:
                merged.append(cur)
            return merged
    return chunk_fixed(text, size)


def chunk_by_heading(text, size=500):
    """For Markdown, HTML turned into Markdown, or Word: one chunk for each section, and a long section is cut by sentences. The heading stays in every chunk."""
    parts, head, body = [], '', []
    for line in text.splitlines():
        if line.startswith('#'):
            if body:
                parts.append((head, '\n'.join(body).strip()))
            head, body = line.lstrip('# ').strip(), []
        else:
            body.append(line)
    if body:
        parts.append((head, '\n'.join(body).strip()))
    out = []
    for head, body in parts:
        for c in chunk_sentences(body, size):
            out.append((head + '\n' + c) if head else c)
    return out


# ---------------------------------------------------------------------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------------------------------------------------------------------
STOP = set('a an the of to is are was were be been in on at for and or by with from that this it as do does did can what which who when where how'.split())


def tokens(text):
    return [t for t in re.findall(r'[a-z0-9]+', text.lower()) if t not in STOP]


class LsaEmbedder:
    """TF-IDF and a truncated SVD. fit() learns the vocabulary and the axes, embed() turns texts into unit-length vectors."""

    def __init__(self, dim=64, seed=7):
        from sklearn.decomposition import TruncatedSVD
        from sklearn.feature_extraction.text import TfidfVectorizer
        self.vec = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, stop_words=sorted(STOP))
        self.svd = TruncatedSVD(n_components=dim, random_state=seed)
        self.dim = dim

    def fit(self, texts):
        self.svd.fit(self.vec.fit_transform(texts))
        return self

    def embed(self, texts):
        m = self.svd.transform(self.vec.transform(texts))
        n = np.linalg.norm(m, axis=1, keepdims=True)
        return (m / np.where(n == 0, 1, n)).astype('float32')


def rrf(rankings, k=60):
    """Reciprocal rank fusion. rankings is a list of lists of ids, best first. Returns ids, best first, and the scores."""
    score = {}
    for ranking in rankings:
        for r, i in enumerate(ranking, 1):
            score[i] = score.get(i, 0.0) + 1.0 / (k + r)
    order = sorted(score, key=lambda i: (-score[i], i))
    return order, score


class Searcher:
    """BM25, the stand-in vectors, and the two fused, over one list of chunks (dicts with an id and a text).
    A mask is a function of a chunk. A chunk that the mask rejects is never a candidate: the filter runs inside the search."""

    def __init__(self, chunks, dim=64, seed=7):
        from rank_bm25 import BM25Okapi
        self.chunks = chunks
        self.ids = [c['id'] for c in chunks]
        self.bm25 = BM25Okapi([tokens(c['text']) for c in chunks])
        self.emb = LsaEmbedder(dim, seed).fit([c['text'] for c in chunks])
        self.vecs = self.emb.embed([c['text'] for c in chunks])

    def bm25_rank(self, q, mask=None):
        s = self.bm25.get_scores(tokens(q))
        return self._order(s, mask)

    def vec_rank(self, q, mask=None):
        s = self.vecs @ self.emb.embed([q])[0]
        return self._order(s, mask)

    def hybrid_rank(self, q, mask=None, k=60):
        order, _ = rrf([self.bm25_rank(q, mask)[:50], self.vec_rank(q, mask)[:50]], k)
        return order

    def _order(self, scores, mask):
        idx = sorted(range(len(self.ids)), key=lambda i: (-scores[i], i))
        return [self.ids[i] for i in idx if mask is None or mask(self.chunks[i])]


# ---------------------------------------------------------------------------------------------------------------------------------------
# Score. relevant is a set of ids. ranked is a list of ids, best first.
# ---------------------------------------------------------------------------------------------------------------------------------------
def hit_at_k(ranked, relevant, k):
    return 1.0 if any(i in relevant for i in ranked[:k]) else 0.0


def mrr_at_k(ranked, relevant, k=10):
    for r, i in enumerate(ranked[:k], 1):
        if i in relevant:
            return 1.0 / r
    return 0.0


def ndcg_at_k(ranked, relevant, k=10):
    dcg = sum(1.0 / math.log2(r + 1) for r, i in enumerate(ranked[:k], 1) if i in relevant)
    ideal = sum(1.0 / math.log2(r + 1) for r in range(1, min(len(relevant), k) + 1))
    return dcg / ideal if ideal else 0.0
