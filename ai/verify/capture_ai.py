#!/usr/bin/env python3
"""Record what real tools do, for the AI data engineering and agentic AI course. Nothing here calls a language model.

No model could be downloaded and no model API was reachable where this ran. So every number below comes from software that ran for real,
and every stand-in is named as a stand-in:
  corpus.py, parsekit.py, ragkit.py   the Brewline documents, the parsers and the RAG toolkit that the lessons show
  pypdf, python-docx, beautifulsoup4  real document parsers, run on PDF, Word and HTML files that corpus.py writes
  datasketch                          MinHash and locality sensitive hashing, for near duplicates
  scikit-learn                        TF-IDF and a truncated SVD: the STAND-IN for an embedding model (it is not a neural model)
  rank-bm25                           BM25 keyword search
  faiss, hnswlib                      approximate nearest neighbour indexes, on made-up vectors
  PostgreSQL 16 with pgvector         a real database with a real vector extension, started from a wheel (pixeltable-pgserver)
  anthropic and openai SDKs           the real client libraries, talking to a local STAND-IN server, to show retries, errors and streaming
  LangGraph                           a real agent runtime, driven by a SCRIPTED model, to show state, checkpoints and interrupts
  mcp (Model Context Protocol SDK)    a real server and client over stdio, with a tap on the wire
  sqlglot and DuckDB                  a SQL guard in front of a read-only database
  OpenTelemetry SDK                   spans, exported in memory
  tokenizers                          a small BPE trained on the Brewline text: the STAND-IN for a model tokenizer
The course says on each screen what was real and what was a stand-in.

Usage:   python3 ai/verify/capture_ai.py [--out ai/js/real.js] [--only docs,chunk,embed,search,ann,pgvector,pipeline,llm,agent,mcp,sqlguard,otel,inject,finetune,tokens] [--json FILE]
Needs:   pip install -r dev/requirements.txt  (the AI block). Postgres comes from the pixeltable-pgserver wheel.
"""
import argparse
import collections
import hashlib
import json
import math
import os
import pathlib
import re
import shutil
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--only', default='docs,chunk,embed,search,eval,ann,pgvector,pipeline,llm,agent,mcp,sqlguard,otel,tests,inject,finetune,tokens')
ap.add_argument('--json')
args = ap.parse_args()
ONLY = set(args.only.split(','))

for k in list(os.environ):
    if k.startswith(('ANTHROPIC_', 'OPENAI_')):
        del os.environ[k]                                   # the recording never touches a real key

import importlib.metadata as md
import numpy as np

import corpus
import parsekit
import ragkit

WORK = pathlib.Path(tempfile.mkdtemp(prefix='ai-capture-'))
import atexit
atexit.register(lambda: shutil.rmtree(WORK, ignore_errors=True))
OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def put(section, key, value):
    OUT[section][key] = value


def text(key, s):
    put('text', key, s)


def file(key, s):
    put('files', key, s)


def counts(key, d):
    put('counts', key, d)


def table(key, cols, rows):
    put('tables', key, {'cols': cols, 'rows': rows})


def version(pkg):
    try:
        return md.version(pkg)
    except md.PackageNotFoundError:
        return None


def r2(x, n=3):
    return round(float(x), n)


OUT['meta'].update({p: version(p) for p in ('numpy', 'scikit-learn', 'rank-bm25', 'faiss-cpu', 'hnswlib', 'datasketch', 'pypdf', 'fpdf2', 'python-docx', 'beautifulsoup4', 'pydantic',
                                             'langgraph', 'langchain-core', 'mcp', 'anthropic', 'openai', 'opentelemetry-sdk', 'sqlglot', 'duckdb', 'tokenizers', 'psycopg',
                                             'pixeltable-pgserver', 'pgvector', 'pytest')})
OUT['meta'].update({'python': sys.version.split()[0], 'company': 'Brewline',
                    'note': 'Recorded by ai/verify/capture_ai.py with real open-source tools on one machine. No language model and no embedding model was used: the embedding is a '
                            'TF-IDF and SVD stand-in, the agent model is scripted, and the LLM API is a local stand-in server. Nothing ran in a cloud.'})


# The source of the modules that the lessons show, kept in the recording so that a lesson shows exactly the code that ran.
for _name in ('parsekit', 'ragkit', 'evalkit', 'ingest', 'sqlguard', 'finetune', 'llm_calls', 'agent_runs', 'tracing', 'defences'):
    OUT['files']['code/%s.py' % _name] = (HERE / ('%s.py' % _name)).read_text().rstrip('\n')


# =======================================================================================================================================
# The corpus, parsed, cleaned and chunked. Other sections reuse it.
# =======================================================================================================================================
P = {}


def load():
    if P:
        return P
    folder = corpus.build(WORK / 'corpus')
    docs = []
    for doc_id, name, fmt, aud, ver, cur, title in corpus.DOCS:
        path = folder / name
        d = {'doc_id': doc_id, 'file': name, 'format': fmt, 'audience': aud, 'version': ver, 'current': cur, 'title': title, 'bytes': path.stat().st_size}
        if fmt == 'pdf':
            pages = parsekit.pdf_pages(path)
            clean_pages, repeated = ragkit.drop_repeated_lines(pages)
            d.update(pages=pages, repeated=repeated, raw=chr(12).join(pages), text=ragkit.normalize('\n\n'.join(clean_pages)))
        elif fmt == 'docx':
            d['raw'] = parsekit.docx_markdown(path)
            d['text'] = d['raw']
        elif fmt == 'html':
            html = path.read_text()
            d.update(html=html, raw=parsekit.html_naive(html), text=parsekit.html_markdown(html))
        else:
            d['raw'] = d['text'] = path.read_text()
        d['hash'] = ragkit.content_hash(d['text'])
        docs.append(d)
    for doc_id, fname, aud, title, secs in corpus.extra_docs():           # documents that hold no answer, written to be confusing
        txt = (folder / fname).read_text()
        docs.append({'doc_id': doc_id, 'file': fname, 'format': 'md', 'audience': aud, 'version': 1, 'current': True, 'title': title, 'bytes': len(txt.encode()), 'raw': txt, 'text': txt,
                     'hash': ragkit.content_hash(txt), 'extra': True})
    P.update(docs=docs, folder=folder, by_id={d['doc_id']: d for d in docs})
    return P


def make_chunks(strategy, size=500, overlap=0, docs=None):
    """chunk records for the documents: {id, doc_id, text, audience, current, i}"""
    out = []
    for d in docs if docs is not None else load()['docs']:
        t = d['text']
        if strategy == 'fixed':
            parts = ragkit.chunk_fixed(t, size, overlap)
        elif strategy == 'sentences':
            parts = ragkit.chunk_sentences(t, size)
        elif strategy == 'recursive':
            parts = ragkit.chunk_recursive(t, size)
        elif strategy == 'heading':
            parts = ragkit.chunk_by_heading(t, size) if d['format'] in ('md', 'docx', 'html') else ragkit.chunk_recursive(t, size)
        else:
            raise ValueError(strategy)
        for i, c in enumerate(parts):
            out.append({'id': '%s:%d' % (d['doc_id'], i), 'doc_id': d['doc_id'], 'text': c, 'audience': d['audience'], 'current': d['current'], 'i': i})
    return out


def relevant_ids(chunks, fact_id):
    doc, sec, sentence, key = corpus.FACTS[fact_id]
    return {c['id'] for c in chunks if c['doc_id'] == doc and key in c['text']}


def evaluate(chunks, rank_fn, ks=(1, 3, 5)):
    """rank_fn(question) -> chunk ids, best first. Returns metric means and the per question detail."""
    detail, rows = {}, []
    for qid, q, gold, kind in corpus.QUESTIONS:
        rel = relevant_ids(chunks, gold)
        ranked = rank_fn(q)
        first = next((r for r, i in enumerate(ranked[:10], 1) if i in rel), None)
        detail[qid] = {'kind': kind, 'first_relevant_rank': first, 'relevant_chunks': len(rel)}
        rows.append((qid, kind, rel, ranked))
    m = {'hit@%d' % k: r2(np.mean([ragkit.hit_at_k(rk, rel, k) for _, _, rel, rk in rows])) for k in ks}
    m['mrr@10'] = r2(np.mean([ragkit.mrr_at_k(rk, rel, 10) for _, _, rel, rk in rows]))
    m['ndcg@10'] = r2(np.mean([ragkit.ndcg_at_k(rk, rel, 10) for _, _, rel, rk in rows]))
    m['answerable'] = sum(1 for _, _, rel, _ in rows if rel)
    return m, detail, rows


Searcher = ragkit.Searcher


COURSE = {'strategy': 'recursive', 'size': 500}                # the chunking that the later missions use


def course_searcher():
    if 'searcher' not in P:
        load()
        P['chunks'] = make_chunks(**COURSE)
        P['searcher'] = Searcher(P['chunks'])
    return P['searcher']


# =======================================================================================================================================
# Documents in: parse, clean, find duplicates, find personal data
# =======================================================================================================================================
def sec_docs():
    p = load()
    D = p['by_id']
    corpus_rows = []
    for d in [x for x in p['docs'] if not x.get('extra')]:
        corpus_rows.append([d['file'], d['format'], d['audience'], 'v%d' % d['version'], 'yes' if d['current'] else 'no (superseded)', len(d['raw']), len(d['text'])])
    table('docs.formats', ['file', 'format', 'audience', 'version', 'current', 'chars read', 'chars kept'], corpus_rows)
    counts('docs.set', {'documents': len(p['docs']) + 1, 'core': len(corpus.DOCS) + 1, 'extra': sum(1 for x in p['docs'] if x.get('extra')), 'formats': ['pdf', 'docx', 'html', 'md', 'txt'],
                        'audiences': sorted({x['audience'] for x in p['docs']}), 'questions': len(corpus.QUESTIONS), 'facts': len([f for f in corpus.FACTS if not f.endswith('_v1')])})
    for name in ('customer-faq.md', 'glossary.md', 'meeting-notes-2026-03.txt', 'menu-and-allergens.html'):
        file('corpus/' + name, (p['folder'] / name).read_text().rstrip('\n'))

    # a PDF: pages, a running header and a footer, and a table that became lines of words
    h = D['handbook-v2']
    pages = h['pages']
    hours_page = next(i for i, t in enumerate(pages) if 'Mon to Fri' in t)
    lines = pages[hours_page].splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith('Store Mon'))
    counts('docs.pdf', {'file': h['file'], 'pages': len(pages), 'chars_per_page': [len(t) for t in pages], 'repeated_lines': h['repeated'],
                        'header_copies_if_kept': sum(t.count('Brewline Store Handbook v2 - Internal') for t in pages), 'chars_before_clean': len(h['raw']), 'chars_after_clean': len(h['text']),
                        'table_page': hours_page + 1, 'table_as_extracted': lines[start:start + 4], 'has_heading_marks': False,
                        'page_footer_example': pages[1].splitlines()[-1]})
    # a scanned page
    import pypdf
    scan = pypdf.PdfReader(str(p['folder'] / 'delivery-note-scan.pdf'))
    counts('docs.scanned', {'file': 'delivery-note-scan.pdf', 'pages': len(scan.pages), 'chars_extracted': sum(len(pg.extract_text() or '') for pg in scan.pages),
                            'images_on_page': len(scan.pages[0].images)})
    # HTML: the naive text and the table-aware text
    m = D['menu']
    counts('docs.html', {'naive_excerpt': re.sub(r'\s+', ' ', m['raw']).strip()[:330], 'markdown': m['text'], 'naive_words': len(m['raw'].split()), 'markdown_words': len(m['text'].split()),
                         'boilerplate_in_naive': [w for w in ('Home | Menu | Stores | Careers', 'var tracking = true;', 'All rights reserved') if w in m['raw']],
                         'boilerplate_in_markdown': [w for w in ('Home | Menu | Stores | Careers', 'var tracking = true;', 'All rights reserved') if w in m['text']]})
    # Word
    lv = D['leave']
    counts('docs.docx', {'markdown_excerpt': lv['text'][:420], 'headings': len([l for l in lv['text'].splitlines() if l.startswith('#')]), 'table_rows': len([l for l in lv['text'].splitlines() if l.startswith('|')])})

    # personal data in the meeting notes: patterns, and what they get wrong
    notes = D['notes']['text']
    masked, found_n = ragkit.mask_pii(notes)
    loose = re.findall(r'[\d\-\s+]{9,}', notes)               # a pattern that is too loose
    counts('docs.pii', {'found': found_n, 'masked': masked, 'loose_pattern_hits': [x.strip() for x in loose],
                        'names_in_text': [n for n, _, _ in corpus.PEOPLE if n in notes], 'names_left_after_masking': [n for n, _, _ in corpus.PEOPLE if n in masked],
                        'order_refs_untouched': all(x in masked for x in ('ORD-2026-0412', 'SKU-4471'))})
    file('corpus/meeting-notes-masked.txt', masked.rstrip('\n'))

    # near duplicates: exact Jaccard on 5-word shingles, then MinHash and LSH
    from datasketch import MinHash, MinHashLSH

    sh = {d['doc_id']: ragkit.shingles(d['text']) for d in p['docs']}

    def jac(a, b):
        return ragkit.jaccard(sh[a], sh[b])

    def mh(doc_id, perm=128):
        return ragkit.minhash(sh[doc_id], perm)

    ids = [d['doc_id'] for d in p['docs'] if not d.get('extra')]
    pairs = sorted(((jac(a, b), a, b) for i, a in enumerate(ids) for b in ids[i + 1:]), reverse=True)
    mins = {i: mh(i) for i in ids}
    top = []
    for j, a, b in pairs[:5]:
        top.append([a, b, r2(j), r2(mins[a].jaccard(mins[b]))])
    table('docs.dups', ['document A', 'document B', 'exact Jaccard', 'MinHash estimate'], top)
    sweep = []
    for thr in (0.3, 0.5, 0.7, 0.9):
        lsh = MinHashLSH(threshold=thr, num_perm=128)
        for i in ids:
            lsh.insert(i, mins[i])
        hit = sorted({tuple(sorted((i, o))) for i in ids for o in lsh.query(mins[i]) if o != i})
        sweep.append({'threshold': thr, 'pairs': [list(x) for x in hit]})
    counts('docs.lsh', {'sweep': sweep, 'num_perm': 128, 'shingle_words': 5, 'v1_v2_differ_in': ['within 14 days of purchase / within 30 days of purchase', 'above EUR 50 / above EUR 100']})
    # what a wrong answer from the old version looks like: the sentences that exist in v1 only
    v1s, v2s = set(corpus.FACTS[f][2] for f in corpus.FACTS if corpus.FACTS[f][0] == 'handbook-v1'), set(corpus.FACTS[f][2] for f in corpus.FACTS if corpus.FACTS[f][0] == 'handbook-v2')
    counts('docs.versions', {'only_in_v1': sorted(v1s - v2s), 'only_in_v2': sorted(v2s - v1s), 'shared_sentences': len(v1s & v2s)})
    # the metadata record of one document
    rec = {k: D['handbook-v2'][k] for k in ('doc_id', 'file', 'format', 'audience', 'version', 'current', 'hash')}
    rec.update({'source': 'lake://raw/docs/' + D['handbook-v2']['file'], 'parsed_with': 'pypdf ' + (version('pypdf') or '')})
    file('docs/record.json', json.dumps(rec, indent=2))


# =======================================================================================================================================
# Chunking: what each strategy does to the facts, and to retrieval
# =======================================================================================================================================
def strategy_stats(name, chunks, searcher):
    lens = [len(c['text']) for c in chunks]
    ends = [c['text'].rstrip()[-1:] in '.!?|' for c in chunks]
    facts = [f for f in corpus.FACTS if corpus.FACTS[f][0] in ('handbook-v2', 'suppliers', 'equipment', 'leave', 'menu', 'faq', 'loyalty', 'runbook', 'prices', 'notes')]
    intact = sum(1 for f in facts if relevant_ids(chunks, f))
    mb, _, _ = evaluate(chunks, searcher.bm25_rank)
    mv, _, _ = evaluate(chunks, searcher.vec_rank)
    mh, _, _ = evaluate(chunks, searcher.hybrid_rank)
    return {'chunks': len(chunks), 'mean_chars': round(float(np.mean(lens))), 'p95_chars': int(np.percentile(lens, 95)), 'ends_mid_sentence_pct': round(100 * (1 - sum(ends) / len(ends))),
            'facts_intact': intact, 'facts_total': len(facts), 'bm25_hit@3': mb['hit@3'], 'vec_hit@3': mv['hit@3'], 'hybrid_hit@3': mh['hit@3'], 'hybrid_hit@5': mh['hit@5']}


def sec_chunk():
    p = load()
    rows, stats = [], {}
    specs = [('fixed 500, no overlap', 'fixed', 500, 0), ('fixed 500, overlap 100', 'fixed', 500, 100), ('whole sentences up to 500', 'sentences', 500, 0), ('recursive 500', 'recursive', 500, 0),
             ('by heading, up to 500', 'heading', 500, 0)]
    for label, strat, size, ov in specs:
        chunks = make_chunks(strat, size, ov)
        s = strategy_stats(label, chunks, Searcher(chunks))
        stats[label] = s
        rows.append([label, s['chunks'], s['mean_chars'], s['ends_mid_sentence_pct'], '%d of %d' % (s['facts_intact'], s['facts_total']), s['bm25_hit@3'], s['vec_hit@3'], s['hybrid_hit@3']])
    table('chunk.strategies', ['strategy', 'chunks', 'mean chars', 'cut mid-sentence %', 'facts whole in one chunk', 'BM25 hit@3', 'vector hit@3', 'hybrid hit@3'], rows)
    counts('chunk.stats', stats)
    # the sweep of sizes
    srows = []
    for size in (150, 300, 500, 800, 1500):
        chunks = make_chunks('recursive', size)
        s = strategy_stats('r%d' % size, chunks, Searcher(chunks))
        prompt_chars = 5 * s['mean_chars']
        srows.append([size, s['chunks'], s['mean_chars'], '%d of %d' % (s['facts_intact'], s['facts_total']), s['hybrid_hit@3'], s['hybrid_hit@5'], prompt_chars])
    table('chunk.sweep', ['target size (chars)', 'chunks', 'mean chars', 'facts whole', 'hybrid hit@3', 'hybrid hit@5', 'chars sent to the model for top 5'], srows)
    # one fact cut in two by a fixed size, shown
    fixed = make_chunks('fixed', 500, 0)
    ex = None
    for fid, (doc, sec, sent, key) in corpus.FACTS.items():
        owner = [c for c in fixed if c['doc_id'] == doc]
        for a, b in zip(owner, owner[1:]):
            joined = a['text'] + b['text']
            if key in joined and key not in a['text'] and key not in b['text']:
                cut = joined.index(key)
                ex = {'fact': fid, 'key_phrase': key, 'document': doc, 'end_of_first_chunk': a['text'][-60:], 'start_of_next_chunk': b['text'][:60], 'cut_inside_phrase': True, 'offset': cut}
                break
        if ex:
            break
    counts('chunk.split_example', ex or {})
    # the best strategy's output for one document, for display
    sample = [c for c in make_chunks('recursive', 500) if c['doc_id'] == 'suppliers']
    counts('chunk.sample', {'doc': 'supplier-terms.pdf', 'count': len(sample), 'chunks': [c['text'] for c in sample]})
    file('chunk/chunk_record.json', json.dumps({'id': sample[0]['id'], 'doc_id': 'suppliers', 'i': 0, 'text': sample[0]['text'][:120] + ' ...', 'audience': 'finance', 'current': True, 'version': 3,
                                                  'content_hash': ragkit.content_hash(sample[0]['text'])}, indent=2))


# =======================================================================================================================================
# Embeddings: what the stand-in vectors do
# =======================================================================================================================================
def sec_embed():
    s = course_searcher()
    chunks = P['chunks']
    emb = s.emb
    counts('embed.model', {'kind': 'TF-IDF followed by a truncated SVD (a stand-in, not a neural model)', 'dim': emb.dim, 'vocabulary': len(emb.vec.vocabulary_), 'chunks': len(chunks),
                           'explained_variance': r2(emb.svd.explained_variance_ratio_.sum()), 'bytes_float32': int(s.vecs.nbytes), 'unit_length': bool(np.allclose(np.linalg.norm(s.vecs, axis=1), 1, atol=1e-5))})

    def cos(a, b):
        va, vb = emb.embed([a, b])
        return r2(float(va @ vb))
    pairs = [('refund', 'money back'), ('refund', 'espresso machine'), ('power cut', 'electricity is cut'), ('tips', 'gratuities'), ('loyalty points', 'reward points'), ('loyalty points', 'milk fridge'),
             ('Can a shopper get reimbursed for beans they have not opened?', corpus.FACTS['f01'][2]), ('Can a shopper get reimbursed for beans they have not opened?', corpus.FACTS['f06'][2])]
    table('embed.pairs', ['text A', 'text B', 'cosine similarity'], [[a, b, cos(a, b)] for a, b in pairs])
    # nearest terms: the SVD gives a vector for each word
    vocab = np.array(emb.vec.get_feature_names_out())
    one = np.array([' ' not in v for v in vocab])
    terms = emb.svd.components_.T
    terms = terms / np.maximum(np.linalg.norm(terms, axis=1, keepdims=True), 1e-9)
    near = {}
    for w in ('refund', 'electricity', 'tips', 'roaster'):
        i = int(np.where(vocab == w)[0][0])
        sims = np.where(one, terms @ terms[i], -2.0)
        sims[i] = -2.0
        order = np.argsort(-sims, kind='stable')[:5]
        near[w] = [[str(vocab[j]), r2(sims[j])] for j in order]
    counts('embed.neighbors', near)
    # three questions and their nearest chunks
    show = []
    for qid, q, gold, kind in corpus.QUESTIONS:
        if qid in ('q09', 'q10', 'q17'):
            rank = s.vec_rank(q)[:3]
            show.append({'qid': qid, 'question': q, 'kind': kind, 'top3': [[i, r2(float(s.vecs[s.ids.index(i)] @ emb.embed([q])[0])), 'relevant' if i in relevant_ids(chunks, gold) else 'no'] for i in rank]})
    counts('embed.nearest', {'items': show})
    # the same ranking from cosine, dot product and distance, because the vectors have unit length
    same = 0
    for qid, q, gold, kind in corpus.QUESTIONS:
        v = emb.embed([q])[0]
        a = list(np.argsort(-(s.vecs @ v), kind='stable')[:10])
        b = list(np.argsort(np.linalg.norm(s.vecs - v, axis=1), kind='stable')[:10])
        same += int(a == b)
    counts('embed.metrics', {'questions': len(corpus.QUESTIONS), 'same_top10_for_cosine_dot_and_l2': same})
    # a new model version: the vectors no longer line up with the index
    def hit(vecs_fn, qvecs_fn):
        res = []
        for qid, q, gold, kind in corpus.QUESTIONS:
            rel = relevant_ids(chunks, gold)
            sc = vecs_fn @ qvecs_fn(q)
            ranked = [s.ids[i] for i in np.argsort(-sc, kind='stable')[:10]]
            res.append(ragkit.hit_at_k(ranked, rel, 5))
        return r2(np.mean(res))
    new = ragkit.LsaEmbedder(48, 11).fit([c['text'] for c in chunks])               # a different model: other dimension, other seed
    old_old = hit(s.vecs, lambda q: emb.embed([q])[0])
    new_new = hit(new.embed([c['text'] for c in chunks]), lambda q: new.embed([q])[0])
    try:
        mixed = hit(s.vecs, lambda q: new.embed([q])[0])
    except ValueError as e:
        mixed = str(e).split('\n')[0]
    # same dimension, another seed: it runs. With TF-IDF and an SVD the axes are almost the same, so it still works (a stand-in effect, not a rule)
    new64 = ragkit.LsaEmbedder(64, 99).fit([c['text'] for c in chunks])
    mixed64 = hit(s.vecs, lambda q: new64.embed([q])[0])
    counts('embed.versions', {'old_model_old_index_hit@5': old_old, 'new_model_new_index_hit@5': new_new, 'new_query_old_index_other_dimension': mixed, 'new_query_old_index_same_dimension_hit@5': mixed64})
    # smaller vectors: float16 and int8, and what they do to the ranking
    def quant(v, bits):
        if bits == 16:
            return v.astype('float16').astype('float32')
        scale = 127.0 / np.abs(v).max()
        return (np.round(v * scale).astype('int8').astype('float32')) / scale
    qres = {}
    for bits in (32, 16, 8):
        vq = s.vecs if bits == 32 else quant(s.vecs, bits)
        qres[str(bits)] = {'bytes_per_vector': emb.dim * bits // 8, 'hit@5': hit(vq, lambda q: emb.embed([q])[0])}
    counts('embed.quantize', qres)


# =======================================================================================================================================
# Search: keyword, vector and the two fused, scored on the 24 questions
# =======================================================================================================================================
def glossary_expander():
    """Rewrite a question by adding the words of the glossary sections that share a word with it (a stand-in for a model that rewrites the question)."""
    gl = [sec for sec in corpus.GLOSSARY.split('## ')[1:]]
    gl_tokens = [set(ragkit.tokens(sec)) for sec in gl]
    gl_order = [ragkit.tokens(sec) for sec in gl]

    def expand(q):
        qt = set(ragkit.tokens(q))
        extra = []
        for toks, order in zip(gl_tokens, gl_order):
            if qt & toks:
                extra += [t for t in dict.fromkeys(order) if t not in qt and t not in extra]
        return q + ' ' + ' '.join(extra[:12])
    return expand


def sec_search():
    s = course_searcher()
    chunks = P['chunks']
    methods = {'BM25 (keywords)': s.bm25_rank, 'vector (stand-in)': s.vec_rank, 'hybrid (RRF)': s.hybrid_rank}
    rows, detail, bykind = [], {}, {}
    for name, fn in methods.items():
        m, det, rs = evaluate(chunks, fn)
        detail[name] = det
        rows.append([name, m['hit@1'], m['hit@3'], m['hit@5'], m['mrr@10'], m['ndcg@10']])
        for kind in sorted({k for _, _, _, k in corpus.QUESTIONS}):
            sel = [(rel, rk) for (qid, kd, rel, rk) in rs if kd == kind]
            bykind.setdefault(kind, {})[name] = r2(np.mean([ragkit.hit_at_k(rk, rel, 3) for rel, rk in sel]))
    table('search.methods', ['method', 'hit@1', 'hit@3', 'hit@5', 'MRR@10', 'nDCG@10'], rows)
    counts('search.by_kind', {'hit@3_by_kind': bykind, 'questions_by_kind': dict(collections.Counter(k for _, _, _, k in corpus.QUESTIONS))})
    qrows = []
    for qid, q, gold, kind in corpus.QUESTIONS:
        qrows.append([qid, kind, q] + [detail[n][qid]['first_relevant_rank'] or '-' for n in methods])
    table('search.questions', ['id', 'kind', 'question', 'BM25 rank', 'vector rank', 'hybrid rank'], qrows)
    # rewriting the query: add the words of the glossary sections that share a word with it (a stand-in for a model that rewrites the question)
    expand = glossary_expander()

    exp_rows = []
    for name, fn in methods.items():
        m0, _, _ = evaluate(chunks, fn)
        m1, _, _ = evaluate(chunks, lambda q, fn=fn: fn(expand(q)))
        exp_rows.append([name, m0['hit@3'], m1['hit@3'], m0['mrr@10'], m1['mrr@10']])
    table('search.expansion', ['method', 'hit@3 as asked', 'hit@3 with glossary words added', 'MRR@10 as asked', 'MRR@10 with glossary words added'], exp_rows)
    counts('search.expansion_example', {'question': 'Are gratuities from card payments paid in cash?', 'expanded': expand('Are gratuities from card payments paid in cash?'), 'note': 'the glossary words come from the document set, not from the answers'})
    # the stale version: how often does the superseded handbook answer
    stale = {}
    for name, fn in methods.items():
        top5 = [fn(q)[:5] for _, q, _, _ in corpus.QUESTIONS]
        stale[name] = {'questions_with_a_v1_chunk_in_top5': sum(1 for t in top5 if any(i.startswith('handbook-v1') for i in t)),
                       'with_current_only_filter': sum(1 for _, q, _, _ in corpus.QUESTIONS if any(i.startswith('handbook-v1') for i in fn(q, mask=lambda c: c['current'])[:5]))}
    counts('search.stale', stale)
    # who may read what: a manager may read the handbook and the runbook, but not the finance and HR documents
    allowed = set(corpus.ROLES['manager'])
    by_id = {c['id']: c for c in chunks}
    none_leaks = post_short = pre_leaks = answers_lost = 0
    per_question = []
    for qid, q, gold, kind in corpus.QUESTIONS:
        plain = s.hybrid_rank(q)[:5]
        leaked = [i for i in plain if by_id[i]['audience'] not in allowed]
        none_leaks += len(leaked)
        post_short += len(leaked)
        inside = s.hybrid_rank(q, mask=lambda c: c['audience'] in allowed)[:5]
        pre_leaks += sum(1 for i in inside if by_id[i]['audience'] not in allowed)
        rel = relevant_ids(chunks, gold)
        lost = bool(rel) and not any(by_id[i]['audience'] in allowed for i in rel)
        answers_lost += int(lost)
        if leaked or lost:
            per_question.append([qid, len(leaked), 'yes' if lost else 'no'])
    counts('search.acl', {'role': 'manager', 'allowed_audiences': sorted(allowed), 'questions': len(corpus.QUESTIONS), 'restricted_chunks_in_top5_no_filter': none_leaks,
                          'slots_lost_when_filtering_after_search': post_short, 'restricted_chunks_in_top5_filter_inside_search': pre_leaks,
                          'questions_whose_answer_is_in_a_restricted_document': answers_lost, 'questions_with_a_leak': sum(1 for r in per_question if r[1])})
    table('search.acl_questions', ['question', 'restricted chunks in the top 5', 'answer lives in a restricted document'], per_question)
    # the metric code, checked against scikit-learn
    from sklearn.metrics import ndcg_score
    check = []
    for qid, q, gold, kind in corpus.QUESTIONS[:12]:
        rel = relevant_ids(chunks, gold)
        ranked = s.hybrid_rank(q)[:10]
        y_true = np.array([[1.0 if i in rel else 0.0 for i in ranked]])
        if y_true.sum() == 0:
            continue
        # scikit-learn needs the ideal ordering over the same list, so compare on the ranked list itself
        ours = ragkit.ndcg_at_k(ranked, rel, 10)
        ideal_hits = min(len(rel), 10)
        sk = ndcg_score(y_true, np.array([[10 - r for r in range(len(ranked))]]), k=10)
        # both use the same gain and discount; ideal differs only when more relevant chunks exist than were retrieved, so compare when all were retrieved
        if int(y_true.sum()) == ideal_hits:
            check.append(abs(ours - sk) < 1e-9)
    counts('search.metric_check', {'compared': len(check), 'all_equal': bool(all(check)) if check else None})


# =======================================================================================================================================
# Evaluation: how sure a score is, cheap checks of an answer, and a gate between two builds
# =======================================================================================================================================
def sec_eval():
    import evalkit
    s = course_searcher()
    chunks = P['chunks']
    by_id = {c_['id']: c_ for c_ in chunks}

    def per_question(chunks_, rank_fn):
        _, det, _ = evaluate(chunks_, rank_fn)
        return {qid: {'kind': d['kind'], 'hit': int(d['first_relevant_rank'] is not None and d['first_relevant_rank'] <= 3)} for qid, d in det.items()}

    base = per_question(chunks, s.hybrid_rank)
    cands = {}
    ch = make_chunks('fixed', 500, 0)
    cands['fixed 500 characters, no overlap'] = per_question(ch, Searcher(ch).hybrid_rank)
    ch = make_chunks('recursive', 150, 0)
    cands['recursive 150 characters'] = per_question(ch, Searcher(ch).hybrid_rank)
    expand = glossary_expander()
    cands['glossary words added to each question'] = per_question(chunks, lambda q: s.hybrid_rank(expand(q)))
    cands['vector search only (stand-in)'] = per_question(chunks, s.vec_rank)
    cands['keyword search only'] = per_question(chunks, s.bm25_rank)
    rows, detail = [], {}
    for name, cand in cands.items():
        g = evalkit.gate(base, cand)
        detail[name] = g
        rows.append([name, g['cand'], g['verdict'], ', '.join(g['worse']) or '-', ', '.join(g['better']) or '-', g['reasons'][0] if g['reasons'] else 'no drop beyond the limits'])
    table('eval.gate', ['candidate build', 'hit@3', 'gate', 'questions that got worse', 'questions that got better', 'first reason'], rows)
    counts('eval.gate_detail', {'baseline': 'recursive 500 characters, hybrid search', 'baseline_hit@3': round(sum(v['hit'] for v in base.values()) / len(base), 3), 'tolerance': 0.0, 'kind_tolerance': 0.2, 'candidates': detail})

    # how sure is a score on 24 questions
    noise = {}
    for name, fn in (('BM25 (keywords)', s.bm25_rank), ('vector (stand-in)', s.vec_rank), ('hybrid (RRF)', s.hybrid_rank)):
        pq = per_question(chunks, fn)
        k = sum(v['hit'] for v in pq.values())
        lo, hi = evalkit.wilson(k, len(pq))
        noise[name] = {'hits': k, 'n': len(pq), 'share': round(k / len(pq), 3), 'low': lo, 'high': hi}
    counts('eval.noise', {'methods': noise, 'one_question_is': round(1 / len(corpus.QUESTIONS), 3), 'interval': '95 percent Wilson interval'})

    # cheap checks of an answer. The answers are written by hand, because no model was used. The checks are real.
    manager = set(corpus.ROLES['manager'])
    q1 = corpus.QUESTIONS[0]
    top = s.hybrid_rank(q1[1], mask=lambda c_: c_['audience'] in manager)[:3]
    right = sorted(relevant_ids(chunks, q1[2]) & set(top))[0]
    got = {i: by_id[i]['text'] for i in top}
    ok_ids = set(top)
    q4 = corpus.QUESTIONS[3]
    open_top = s.hybrid_rank(q4[1])[:3]
    sup = sorted(relevant_ids(chunks, q4[2]) & set(open_top))[0]
    open_got = {i: by_id[i]['text'] for i in open_top}
    readable_open = {i for i in open_top if by_id[i]['audience'] in manager}
    cases = [
        ('a good answer', 'A customer may return a sealed bag of beans within 14 days of purchase with a receipt.', [right], got, ok_ids),
        ('a wrong number', 'A customer may return a sealed bag of beans within 30 days of purchase with a receipt.', [right], got, ok_ids),
        ('a source that was not retrieved', 'A customer may return a sealed bag of beans within 14 days of purchase with a receipt.', ['handbook-v2:99'], got, ok_ids),
        ('a source this person may not read', 'The minimum order for Andes Roasters is 40 kg.', [sup], open_got, readable_open),
        ('no source at all', 'A customer may return a sealed bag of beans within 14 days of purchase with a receipt.', [], got, ok_ids),
        ('a refusal, for a question the person may not read', 'I cannot find that in the documents you may read.', [], got, ok_ids),
    ]
    arows = []
    for name, answer, cited, retrieved, readable in cases:
        r = evalkit.check_answer(answer, cited, retrieved, readable)
        arows.append([name, answer, ', '.join(cited) or '-', 'yes' if r['ok'] else 'no', '; '.join(r['problems']) or '-'])
    table('eval.answer_checks', ['case', 'the answer (written by hand)', 'cited', 'checks pass', 'problems found'], arows)

    # the golden set is a file with one question for each line
    def golden_line(qid, q, gold, kind):
        doc, sec_, sentence, key = corpus.FACTS[gold]
        audience = next(d['audience'] for d in load()['docs'] if d['doc_id'] == doc)
        return {'id': qid, 'kind': kind, 'question': q, 'doc': doc, 'key_phrase': key, 'expected': sentence, 'audience': audience, 'refuse_for': sorted(r for r, a in corpus.ROLES.items() if audience not in a)}
    pick = {'q01', 'q04', 'q09'}
    file('eval/golden.jsonl', '\n'.join(json.dumps(golden_line(*x_)) for x_ in corpus.QUESTIONS if x_[0] in pick))


# =======================================================================================================================================
# Vectors at scale: approximate nearest neighbour indexes on 30,000 made-up vectors
# =======================================================================================================================================
def synth(n=30000, d=64, clusters=40, seed=7, nq=200):
    """Made-up vectors in 40 clusters, unit length. The last nq are the queries."""
    rng = np.random.default_rng(seed)
    centers = rng.normal(size=(clusters, d)).astype('float32') * 3
    labels = rng.integers(0, clusters, n + nq)
    x = centers[labels] + rng.normal(size=(n + nq, d)).astype('float32')
    x /= np.linalg.norm(x, axis=1, keepdims=True)
    return x[:n].copy(), x[n:].copy(), labels[:n]


def exact_top(base, queries, k=100):
    sims = queries @ base.T
    return np.argsort(-sims, axis=1, kind='stable')[:, :k]


def recall(found, truth, k=10):
    return float(np.mean([len(set(f[:k]) & set(t[:k])) / k for f, t in zip(found, truth)]))


def sec_ann():
    import faiss
    import hnswlib
    faiss.omp_set_num_threads(1)
    base, queries, labels = synth()
    n, d = base.shape
    truth = exact_top(base, queries)
    counts('ann.data', {'vectors': n, 'dimensions': d, 'queries': len(queries), 'clusters': 40, 'bytes_float32': int(base.nbytes), 'note': 'made-up Gaussian clusters, unit length, so cosine is the dot product'})
    # exact search is the baseline
    flat = faiss.IndexFlatIP(d)
    flat.add(base)
    _, I = flat.search(queries, 10)
    flat_ok = recall(I, truth)
    # HNSW: M is the number of links, efSearch is how many candidates a query keeps
    rows, sizes = [], {}
    for M in (8, 16, 32):
        idx = faiss.IndexHNSWFlat(d, M, faiss.METRIC_INNER_PRODUCT)
        idx.hnsw.efConstruction = 100
        t = time.time()
        idx.add(base)
        build = time.time() - t
        sizes['HNSW M=%d' % M] = len(faiss.serialize_index(idx))
        for ef in (8, 16, 32, 64, 128, 256):
            idx.hnsw.efSearch = ef
            faiss.cvar.hnsw_stats.reset()
            _, I = idx.search(queries, 10)
            nd = faiss.cvar.hnsw_stats.ndis / len(queries)
            rows.append([M, ef, r2(recall(I, truth)), int(round(nd)), r2(100 * nd / n, 1)])
    table('ann.hnsw', ['M (links)', 'efSearch', 'recall@10', 'distance computations per query', '% of the data compared'], rows)
    # IVF: the data is cut into lists, and a query reads only nprobe of them
    q = faiss.IndexFlatIP(d)
    ivf = faiss.IndexIVFFlat(q, d, 256, faiss.METRIC_INNER_PRODUCT)
    ivf.cp.seed = 1234
    ivf.train(base)
    ivf.add(base)
    sizes['IVF 256 lists'] = len(faiss.serialize_index(ivf))
    irows = []
    for npb in (1, 2, 4, 8, 16, 32, 64):
        ivf.nprobe = npb
        faiss.cvar.indexIVF_stats.reset()
        _, I = ivf.search(queries, 10)
        scanned = faiss.cvar.indexIVF_stats.ndis / len(queries)
        irows.append([npb, r2(recall(I, truth)), int(round(scanned)), r2(100 * scanned / n, 1)])
    table('ann.ivf', ['nprobe (lists read)', 'recall@10', 'vectors compared per query', '% of the data compared'], irows)
    # product quantization: the vector is stored as 8 bytes
    q2 = faiss.IndexFlatIP(d)
    pq = faiss.IndexIVFPQ(q2, d, 256, 8, 8, faiss.METRIC_INNER_PRODUCT)
    pq.cp.seed = 1234
    pq.train(base)
    pq.add(base)
    pq.nprobe = 16
    _, I = pq.search(queries, 10)
    sizes['IVF 256 lists + PQ 8 bytes'] = len(faiss.serialize_index(pq))
    pq_recall = recall(I, truth)
    pq_sweep = []
    for m_ in (8, 16, 32):
        q3 = faiss.IndexFlatIP(d)
        pq3 = faiss.IndexIVFPQ(q3, d, 256, m_, 8, faiss.METRIC_INNER_PRODUCT)
        pq3.cp.seed = 1234
        pq3.train(base)
        pq3.add(base)
        pq3.nprobe = 16
        _, I3 = pq3.search(queries, 10)
        pq_sweep.append([m_, 'IVF + PQ, %d bytes for each vector' % m_, r2(recall(I3, truth))])
    table('ann.pq', ['sub-vectors (m)', 'index', 'recall@10 at nprobe 16'], pq_sweep)
    srows = [['exact (Flat)', 4 * d, r2(flat_ok), int(round(len(faiss.serialize_index(flat)) / n))]]
    h = faiss.IndexHNSWFlat(d, 16, faiss.METRIC_INNER_PRODUCT)
    h.hnsw.efConstruction = 100
    h.add(base)
    h.hnsw.efSearch = 64
    _, I = h.search(queries, 10)
    srows.append(['HNSW M=16, efSearch 64', 4 * d, r2(recall(I, truth)), int(round(sizes['HNSW M=16'] / n))])
    ivf.nprobe = 16
    _, I = ivf.search(queries, 10)
    srows.append(['IVF 256 lists, nprobe 16', 4 * d, r2(recall(I, truth)), int(round(sizes['IVF 256 lists'] / n))])
    srows.append(['IVF + PQ (8 bytes), nprobe 16', 8, r2(pq_recall), int(round(sizes['IVF 256 lists + PQ 8 bytes'] / n))])
    table('ann.sizes', ['index', 'bytes of vector data per vector', 'recall@10', 'bytes per vector in the whole index'], srows)
    # hnswlib: a delete does not give the memory back
    p_ = hnswlib.Index(space='ip', dim=d)
    p_.init_index(max_elements=n, ef_construction=100, M=16, random_seed=100)
    p_.set_num_threads(1)
    p_.add_items(base, np.arange(n))
    p_.set_ef(64)
    lab, _ = p_.knn_query(queries[:1], k=5)
    victim = int(lab[0][0])
    before = p_.get_current_count()
    p_.mark_deleted(victim)
    lab2, _ = p_.knn_query(queries[:1], k=5)
    counts('ann.delete', {'library': 'hnswlib ' + (version('hnswlib') or ''), 'elements_before': before, 'elements_after_mark_deleted': p_.get_current_count(), 'deleted_label': victim,
                          'still_in_results_after_delete': victim in [int(x) for x in lab2[0]], 'results_before': [int(x) for x in lab[0]], 'results_after': [int(x) for x in lab2[0]],
                          'note': 'the element is hidden from results, but it stays in the graph and in memory until the index is rebuilt'})
    hn_rows = []
    for ef in (10, 50, 200):
        p_.set_ef(ef)
        lab, _ = p_.knn_query(queries, k=10)
        hn_rows.append([ef, r2(recall(lab, truth))])
    table('ann.hnswlib', ['ef', 'recall@10 (hnswlib, M=16)'], hn_rows)
    counts('ann.build', {'seconds_hnsw_m16': r2(build, 2), 'note': 'time depends on the machine and is not compared between recordings'})


# =======================================================================================================================================
# PostgreSQL with pgvector: a real database
# =======================================================================================================================================
def vec_literal(v):
    return '[' + ','.join('%.6f' % x for x in v) + ']'


PG_SQL = """create extension if not exists vector;

create table chunks (id int primary key, tenant int not null, embedding vector(64));

-- build the index after the rows are loaded
create index chunks_hnsw on chunks using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);

-- the ten nearest neighbours of a query vector, by cosine distance
select id from chunks order by embedding <=> $1::vector limit 10;

-- how many candidates the index keeps while it searches (default 40)
set hnsw.ef_search = 200;

-- a filter: the index finds its candidates first, and the where clause removes rows afterwards
select id from chunks where tenant = $1 order by embedding <=> $2::vector limit 10;

-- keep scanning the index until enough rows survive the filter
set hnsw.iterative_scan = relaxed_order;

-- a partial index for a small tenant
create index chunks_t1 on chunks using hnsw (embedding vector_cosine_ops) where tenant = 1;"""


def sec_pgvector():
    import pixeltable_pgserver as pgs
    import psycopg
    base, queries, labels = synth()
    n, d = base.shape
    truth = exact_top(base, queries)
    srv = pgs.get_server(WORK / 'pg', cleanup_mode='stop')
    conn = psycopg.connect(srv.get_uri(), autocommit=True)
    q = lambda sql, *a: conn.execute(sql, a).fetchall()
    ver = q('select version()')[0][0].split(',')[0]
    conn.execute('create extension if not exists vector')
    ext = q("select extversion from pg_extension where extname = 'vector'")[0][0]
    counts('pg.versions', {'postgres': ver, 'pgvector': ext})
    file('pg/statements.sql', PG_SQL)
    conn.execute('set max_parallel_maintenance_workers = 0')
    conn.execute('drop table if exists chunks')
    conn.execute('create table chunks (id int primary key, tenant int not null, embedding vector(%d))' % d)
    # tenant 1 holds 1 percent of the rows, tenant 2 holds 10 percent, tenant 3 the rest
    rng = np.random.default_rng(3)
    tenant = np.where(rng.random(n) < 0.01, 1, np.where(rng.random(n) < 0.10, 2, 3))
    with conn.cursor().copy('copy chunks (id, tenant, embedding) from stdin') as cp:
        for i in range(n):
            cp.write_row((i, int(tenant[i]), vec_literal(base[i])))
    conn.execute('analyze chunks')
    sizes = q("select pg_relation_size('chunks'), pg_total_relation_size('chunks')")[0]
    def plan(sql, *a):
        return [r[0] for r in conn.execute('explain (costs off) ' + sql, a).fetchall()]
    qv = vec_literal(queries[0])
    top = 'select id from chunks order by embedding <=> %s::vector limit 10'
    counts('pg.table', {'rows': n, 'dimensions': d, 'table_bytes': int(sizes[0]), 'tenant_rows': {str(t): int((tenant == t).sum()) for t in (1, 2, 3)}, 'column_bytes_vector64': q('select pg_column_size(embedding) from chunks limit 1')[0][0],
                        'column_bytes_halfvec64': q('select pg_column_size(embedding::halfvec(%d)) from chunks limit 1' % d)[0][0]})
    counts('pg.plan_exact', {'plan': plan(top, qv)})
    # exact search is the truth that the index is judged by
    def run(sql, *params):
        return [r[0] for r in conn.execute(sql, params).fetchall()]
    t0 = time.time()
    conn.execute('create index chunks_hnsw on chunks using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64)')
    build = time.time() - t0
    idx_bytes = q("select pg_relation_size('chunks_hnsw')")[0][0]
    counts('pg.plan_hnsw', {'plan': plan(top, qv), 'index_bytes': int(idx_bytes), 'index_bytes_per_row': round(idx_bytes / n, 1), 'build_seconds': r2(build, 2)})
    rows = []
    for ef in (10, 20, 40, 100, 200, 400):
        conn.execute('set hnsw.ef_search = %d' % ef)
        found = [run(top, vec_literal(qq)) for qq in queries[:100]]
        rows.append([ef, r2(recall(found, truth[:100]))])
    table('pg.hnsw_recall', ['hnsw.ef_search', 'recall@10 of the index against exact search'], rows)
    # LIMIT bigger than ef_search
    conn.execute('set hnsw.ef_search = 40')
    got40 = len(run('select id from chunks order by embedding <=> %s::vector limit 100', qv))
    conn.execute('set hnsw.ef_search = 200')
    got200 = len(run('select id from chunks order by embedding <=> %s::vector limit 100', qv))
    counts('pg.limit', {'limit': 100, 'rows_with_ef_search_40': got40, 'rows_with_ef_search_200': got200})
    conn.execute('set hnsw.ef_search = 40')
    # a filter: the index finds 40 candidates, and then the filter throws most of them away
    frows = []
    for t in (1, 2, 3):
        sel = 'select id from chunks where tenant = %s order by embedding <=> %s::vector limit 10'
        ftruth = []
        for qq in queries[:60]:
            sims = base[tenant == t] @ qq
            ids = np.where(tenant == t)[0]
            ftruth.append(list(ids[np.argsort(-sims, kind='stable')[:10]]))
        conn.execute("set hnsw.iterative_scan = off")
        a = [run(sel, t, vec_literal(qq)) for qq in queries[:60]]
        conn.execute("set hnsw.iterative_scan = relaxed_order")
        b = [run(sel, t, vec_literal(qq)) for qq in queries[:60]]
        conn.execute("set hnsw.iterative_scan = off")
        frows.append([t, '%.0f %%' % (100 * (tenant == t).mean()), r2(np.mean([len(x) for x in a]), 1), r2(np.mean([len(x) for x in b]), 1), r2(recall(b, ftruth))])
    table('pg.filter', ['tenant', 'share of the rows', 'rows returned for LIMIT 10 (default)', 'rows returned with iterative scan', 'recall@10 with iterative scan'], frows)
    counts('pg.iterative', {'setting': 'hnsw.iterative_scan = relaxed_order', 'max_scan_tuples_default': q('show hnsw.max_scan_tuples')[0][0], 'ef_search_default': '40'})
    # a partial index for the small tenant
    conn.execute('create index chunks_t1 on chunks using hnsw (embedding vector_cosine_ops) where tenant = 1')
    sel1 = 'select id from chunks where tenant = 1 order by embedding <=> %s::vector limit 10'
    conn.execute('set hnsw.iterative_scan = off')
    pa = [run(sel1, vec_literal(qq)) for qq in queries[:60]]
    counts('pg.partial', {'plan': plan(sel1, qv), 'rows_returned_mean': r2(np.mean([len(x) for x in pa]), 1), 'index_bytes': int(q("select pg_relation_size('chunks_t1')")[0][0])})
    conn.execute('drop index chunks_t1')
    # IVFFlat: the lists are learned from the rows that exist when the index is built
    conn.execute('drop index chunks_hnsw')
    ivrows = []
    conn.execute('create index chunks_ivf on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100)')
    for probes in (1, 5, 10, 30):
        conn.execute('set ivfflat.probes = %d' % probes)
        found = [run(top, vec_literal(qq)) for qq in queries[:100]]
        ivrows.append([probes, r2(recall(found, truth[:100]))])
    table('pg.ivfflat', ['ivfflat.probes', 'recall@10 (100 lists, built after loading)'], ivrows)
    conn.execute('drop index chunks_ivf')
    conn.execute('drop table if exists early')
    conn.execute('create table early (id int primary key, embedding vector(%d))' % d)
    with conn.cursor().copy('copy early (id, embedding) from stdin') as cp:
        for i in range(500):
            cp.write_row((i, vec_literal(base[i])))
    conn.execute('create index early_ivf on early using ivfflat (embedding vector_cosine_ops) with (lists = 100)')
    with conn.cursor().copy('copy early (id, embedding) from stdin') as cp:
        for i in range(500, n):
            cp.write_row((i, vec_literal(base[i])))
    conn.execute('set ivfflat.probes = 5')
    found = [run('select id from early order by embedding <=> %s::vector limit 10', vec_literal(qq)) for qq in queries[:100]]
    counts('pg.ivfflat_early', {'rows_when_built': 500, 'rows_loaded_after': n - 500, 'probes': 5, 'recall@10': r2(recall(found, truth[:100])), 'recall_when_built_after_loading_probes_5': ivrows[1][1]})
    conn.close()


# =======================================================================================================================================
# Tokens: how text is cut into pieces, with a small BPE trained on the Brewline text
# =======================================================================================================================================
def sec_tokens():
    from tokenizers import Tokenizer, models, pre_tokenizers, trainers, decoders
    p = load()
    texts = [d['text'] for d in p['docs']]
    tok = Tokenizer(models.BPE())
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()
    tok.train_from_iterator(texts, trainers.BpeTrainer(vocab_size=1500, special_tokens=['<unk>'], initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False))
    samples = [('plain English', 'A customer may return a sealed bag of beans within 14 days of purchase with a receipt.'), ('a product code', 'SKU-4471-BD220-EU'), ('a price', 'EUR 4.90'),
               ('a long number', '2026031412345678901234'), ('a place name', 'Spijkenisse Port'), ('JSON', '{"order_id": "ORD-2026-0412", "status": "COMPLETED", "total_eur": 19.5}'),
               ('Dutch', 'Een klant mag een gesloten zak bonen binnen veertien dagen terugbrengen.'), ('Thai', 'ลูกค้าสามารถคืนถุงเมล็ดกาแฟได้ภายใน 14 วัน'), ('an emoji', 'Great coffee ☕☕☕')]
    rows = []
    for label, t in samples:
        n_tok = len(tok.encode(t).ids)
        rows.append([label, len(t), len(t.encode('utf-8')), n_tok, r2(len(t) / n_tok, 2)])
    table('tokens.samples', ['text', 'characters', 'bytes', 'tokens (stand-in BPE)', 'characters per token'], rows)
    chunks = make_chunks(**COURSE)
    per = [len(tok.encode(c['text']).ids) for c in chunks]
    counts('tokens.model', {'kind': 'byte-level BPE trained on the Brewline documents (a stand-in, not the tokenizer of any model)', 'vocab': tok.get_vocab_size(), 'training_chars': sum(len(t) for t in texts),
                            'chunks': len(chunks), 'tokens_per_chunk_mean': round(float(np.mean(per)), 1), 'tokens_per_chunk_max': int(max(per)), 'chars_per_token_overall': r2(sum(len(c['text']) for c in chunks) / sum(per), 2),
                            'example_pieces': [tok.decode([i]) for i in tok.encode('Spijkenisse Port').ids]})


# =======================================================================================================================================
# An ingestion pipeline that is safe to run again
# =======================================================================================================================================
def sec_pipeline():
    import ingest
    p = load()
    docs = [{'doc_id': d['doc_id'], 'text': d['text'], 'audience': d['audience'], 'current': d['current']} for d in p['docs']]
    chunker = lambda t: ragkit.chunk_recursive(t, 500)
    model1 = ragkit.LsaEmbedder(64, 7).fit([c for d in docs for c in chunker(d['text'])])
    calls = {'n': 0}

    def embedder_for(model):
        def f(texts):
            calls['n'] += len(texts)
            return model.embed(texts)
        return f
    store = ingest.Store(str(WORK / 'index-v1.db'))
    rows, notes = [], {}

    def step(label, docs_, **kw):
        st = ingest.ingest(kw.get('store', store), docs_, chunker, kw.get('emb') or embedder_for(model1), kw.get('mid', 'lsa-64-v1'))
        rows.append([label, st['documents'], st['chunks_added'], st['chunks_unchanged'], st['chunks_removed'], st['embedded'], st['label_updates']])
        return st
    q = 'return an unused drink voucher or a sealed bag of beans with a receipt'
    qe = lambda t: model1.embed([t])[0]
    notes['first_run'] = step('1. first run, every document is new', docs)
    notes['chunks_in_store'] = store.count()
    notes['second_run'] = step('2. the same files again', docs)
    edited = [dict(d, text=d['text'].replace('within 14 days of purchase', 'within 21 days of purchase')) if d['doc_id'] == 'handbook-v2' else d for d in docs]
    before = ingest.search(store, qe, q, 'lsa-64-v1', 1)[0][2]
    notes['third_run'] = step('3. one sentence of the handbook changed', edited)
    after = ingest.search(store, qe, q, 'lsa-64-v1', 1)[0][2]
    notes['answer_before_edit'] = before[:230]
    notes['answer_after_edit'] = after[:230]
    without = [d for d in edited if d['doc_id'] != 'glossary']
    removed = ingest.delete_document(store, 'glossary')
    step('4. the glossary is deleted (a delete is a run)', without)
    notes['glossary_chunks_deleted'] = removed
    notes['glossary_hits_after_delete'] = sum(1 for cid, sc, tx in ingest.search(store, qe, 'A refund is the same as a return', 'lsa-64-v1', 5) if cid.startswith('glossary'))
    labelled = [dict(d, audience='managers') if d['doc_id'] == 'faq' else d for d in without]
    notes['fifth_run'] = step('5. the FAQ may now be read by managers only', labelled)
    notes['faq_chunks_visible_to_staff_after'] = sum(1 for cid, sc, tx in ingest.search(store, qe, 'loyalty points expire', 'lsa-64-v1', 5, audiences={'all-staff'}) if cid.startswith('faq'))
    notes['faq_chunks_visible_to_managers_after'] = sum(1 for cid, sc, tx in ingest.search(store, qe, 'loyalty points expire', 'lsa-64-v1', 5, audiences={'all-staff', 'managers'}) if cid.startswith('faq'))
    unmarked = [dict(d, current=False) if d['doc_id'] == 'handbook-v2' else d for d in labelled]
    step('6. the handbook is marked as not current', unmarked)
    notes['current_only_hits_from_handbook_v2'] = sum(1 for cid, sc, tx in ingest.search(store, qe, 'refund within days', 'lsa-64-v1', 5) if cid.startswith('handbook-v2'))
    table('pipeline.runs', ['run', 'documents', 'chunks added', 'chunks unchanged', 'chunks removed', 'embeddings computed', 'label updates'], rows)
    # a new embedding model: build a second index next to the first, compare, then switch the alias
    model2 = ragkit.LsaEmbedder(48, 11).fit([c for d in labelled for c in chunker(d['text'])])
    store2 = ingest.Store(str(WORK / 'index-v2.db'))
    n_before = calls['n']
    st2 = ingest.ingest(store2, [dict(d, current=True) if d['doc_id'] == 'handbook-v2' else d for d in labelled], chunker, embedder_for(model2), 'lsa-48-v2')
    notes['rebuild'] = {'chunks_embedded': st2['embedded'], 'documents': st2['documents']}
    chunks_for_eval = make_chunks(**COURSE)

    def score(st_, model, mid):
        hits = []
        for qid, qt, gold, kind in corpus.QUESTIONS:
            doc, sec, sent, key = corpus.FACTS[gold]
            got = ingest.search(st_, lambda t: model.embed([t])[0], qt, mid, 3, only_current=False)
            hits.append(1.0 if any(cid.startswith(doc) and key in tx for cid, sc, tx in got) else 0.0)
        return r2(np.mean(hits))
    s_old = ingest.Store(str(WORK / 'index-v1.db'))
    s_old.db.execute("update chunks set current = 1 where doc_id = 'handbook-v2'")
    s_old.db.commit()
    notes['alias_steps'] = ['live -> index-v1.db: every query is served by the old index', 'build index-v2.db with the new model while the old index keeps serving', 'run the 24 questions on both indexes',
                            'if the new index is not worse, write live -> index-v2.db (one small write)', 'keep index-v1.db for a day, so that going back is one write too']
    notes['hit@3_old_model_index'] = score(s_old, model1, 'lsa-64-v1')
    notes['hit@3_new_model_index'] = score(store2, model2, 'lsa-48-v2')
    notes['mixing'] = 'a query vector from the new model has 48 numbers and the old index holds 64, so the comparison fails. With the same size and another seed the stand-in kept working (see embed.versions), because TF-IDF and an SVD of the same size land on almost the same axes. Two different neural models do not share axes, so for them a same-size mix gives no error and the scores mean nothing (from documentation, not measured here)'
    counts('pipeline.notes', notes)
    file('pipeline/alias.json', json.dumps({'live': 'index-v2.db', 'previous': 'index-v1.db', 'model_id': 'lsa-48-v2', 'switched_after': 'hit@3 %s against %s' % (notes['hit@3_new_model_index'], notes['hit@3_old_model_index'])}, indent=2))


# =======================================================================================================================================
# A guard in front of a model that writes SQL
# =======================================================================================================================================
def sec_sqlguard():
    import duckdb
    import sqlguard
    db = WORK / 'brewline.duckdb'
    con = duckdb.connect(str(db))
    con.execute("create table orders as select i as order_id, 1 + i % 6 as store_id, ['COMPLETED','COMPLETED','COMPLETED','CANCELLED','PENDING'][1 + i % 5] as status, round(3 + (i * 37 % 4000) / 100.0, 2) as total_eur, "
                "date '2026-03-01' + CAST(i % 30 AS INTEGER) as placed_at from range(1, 201) t(i)")
    con.execute("create table stores as select i as store_id, 'Store ' || i as name, ['Amsterdam','Rotterdam','Utrecht','Haarlem','Leiden','Delft'][i] as city from range(1, 7) t(i)")
    con.execute("create table products as select i as product_id, 'Drink ' || i as name, 2.5 + i * 0.4 as price_eur from range(1, 9) t(i)")
    con.execute("create table customers as select i as customer_id, 'Customer ' || i as name, 'customer' || i || '@example.com' as email from range(1, 11) t(i)")
    con.close()
    secret = WORK / 'secret.csv'
    secret.write_text('api_key\nsk-NOT-A-REAL-KEY-1234\n')
    queries = [
        ('count orders by status', "SELECT status, COUNT(*) AS n FROM orders GROUP BY status"),
        ('everything, no limit', "SELECT * FROM orders"),
        ('a join with a limit', "SELECT o.order_id, s.name FROM orders o JOIN stores s ON s.store_id = o.store_id WHERE o.status = 'COMPLETED' LIMIT 5"),
        ('a CTE', "WITH t AS (SELECT * FROM orders) SELECT COUNT(*) FROM t"),
        ('a comment hides a second command', "SELECT order_id FROM orders LIMIT 2 -- ; DROP TABLE orders"),
        ('a limit of a million', "SELECT order_id, total_eur FROM orders ORDER BY total_eur DESC LIMIT 1000000"),
        ('personal data, in a table', "SELECT email FROM customers"),
        ('a drop', "DROP TABLE orders"),
        ('two statements', "SELECT 1; DROP TABLE orders"),
        ('read a file', "SELECT * FROM read_csv('%s')" % secret),
        ('write a file', "COPY orders TO '%s/out.csv'" % WORK),
        ('attach another database', "ATTACH '%s/other.db' AS x" % WORK),
        ('a cross join that never ends', "SELECT COUNT(*) FROM orders o1, orders o2, orders o3, orders o4, orders o5"),
        ('not SQL', "show me the orders please"),
    ]
    rows, detail = [], []
    for label, sql in queries:
        verdict, reason = 'allowed', ''
        safe = sql
        try:
            safe, notes = sqlguard.check(sql)
            reason = '; '.join(notes)
        except sqlguard.Refused as e:
            verdict, reason = 'refused', str(e)
        # what the database does on a read-only connection, with no external access, even if the guard were missing
        try:
            t0 = time.time()
            out = sqlguard.run_readonly(str(db), sql, timeout=1.0)
            ro = '%d row(s)' % len(out)
        except Exception as e:
            msg = str(e).splitlines()[0]
            ro = ('timeout after 1 s (interrupted)' if 'INTERRUPT' in msg.upper() else msg)[:90]
        # what happens with no protection at all, on a copy
        copy = WORK / ('copy-%d.duckdb' % len(detail))
        shutil.copy(db, copy)
        c2 = duckdb.connect(str(copy))
        if 'o5' in sql:
            rows.append([label, sql[:77] + '...', verdict, reason, ro, 'not run: it would keep the server busy for about a minute'])
            detail.append({'label': label, 'verdict': verdict})
            c2.close()
            continue
        try:
            r = c2.execute(sql).fetchall()
            tables = [x[0] for x in c2.execute('show tables').fetchall()]
            bare = 'ran: %d row(s)' % len(r) if r else 'ran'
            if 'orders' not in tables:
                bare = 'ran: the table orders is gone'
            if 'secret.csv' in sql:
                bare = 'ran: ' + str(r[0])
        except Exception as e:
            bare = 'failed: ' + str(e).splitlines()[0][:70]
        c2.close()
        rows.append([label, sql if len(sql) < 80 else sql[:77] + '...', verdict, reason, ro, bare])
        detail.append({'label': label, 'verdict': verdict})
    rows = [[r[0], r[1].replace(str(WORK), '/work'), r[2], r[3].replace(str(WORK), '/work'), r[4].replace(str(WORK), '/work'), r[5].replace(str(WORK), '/work')] for r in rows]
    table('sqlguard.decisions', ['what the model wrote', 'SQL', 'the guard says', 'why, or what it changed', 'read-only connection alone', 'no protection at all (on a copy)'], rows)
    counts('sqlguard.summary', {'queries': len(queries), 'allowed': sum(1 for d in detail if d['verdict'] == 'allowed'), 'refused': sum(1 for d in detail if d['verdict'] == 'refused'),
                                'refused_that_the_database_alone_would_have_run': sum(1 for r in rows if r[2] == 'refused' and r[4].endswith('row(s)')),
                                'max_limit': sqlguard.MAX_LIMIT, 'allowed_tables': sorted(sqlguard.ALLOWED_TABLES), 'denied_columns': sorted(sqlguard.DENIED_COLUMNS)})


# =======================================================================================================================================
# Data for models: a fine-tuning set, and the checks that matter before training
# =======================================================================================================================================
def sec_finetune():
    import finetune
    from datasketch import MinHash, MinHashLSH
    exs = finetune.examples(corpus.FACTS, corpus.QUESTIONS)
    n0 = len(exs)
    # a scraped set always has repeats: copy some, and change the case and the spaces of others
    rng = np.random.default_rng(2)
    dup = [exs[i] for i in rng.choice(len(exs), 14, replace=False)]
    messy = []
    for e in [exs[i] for i in rng.choice(len(exs), 10, replace=False)]:
        m = json.loads(json.dumps(e))
        m['messages'][0]['content'] = '  ' + m['messages'][0]['content'].upper().replace(' ', '  ', 3)
        messy.append(m)
    raw = exs + dup + messy
    clean = finetune.drop_exact(raw)

    def mh(ex):
        m = MinHash(num_perm=64, seed=1)
        for w in finetune.norm(ex['messages'][0]['content'] + ' ' + ex['messages'][1]['content']).split():
            m.update(w.encode())
        return m
    lsh = MinHashLSH(threshold=0.9, num_perm=64)
    kept = []
    for i, e in enumerate(clean):
        m = mh(e)
        if not lsh.query(m):
            lsh.insert(str(i), m)
            kept.append(e)
    words = [len(e['messages'][0]['content'].split()) + len(e['messages'][1]['content'].split()) for e in kept]
    counts('finetune.dataset', {'generated': n0, 'after_adding_repeats': len(raw), 'repeats_added': len(dup), 'spacing_variants_added': len(messy), 'after_exact_dedup': len(clean), 'after_near_dedup': len(kept),
                                'facts': len({e['fact'] for e in kept}), 'words_per_example_mean': round(float(np.mean(words)), 1), 'words_per_example_max': int(max(words))})
    tr, va = finetune.split_random(kept)
    tr2, va2 = finetune.split_by_fact(kept)
    table('finetune.split', ['split', 'training examples', 'validation examples', 'validation answers that also appear in training'],
          [['random 80 / 20', len(tr), len(va), finetune.leakage(tr, va)], ['grouped by fact', len(tr2), len(va2), finetune.leakage(tr2, va2)]])
    file('finetune/train_example.jsonl', finetune.to_jsonl(kept[:2]))
    file('finetune/preference_example.jsonl', json.dumps({'prompt': [{'role': 'user', 'content': 'How many days do customers have to return a bag of beans?'}],
                                                          'chosen': [{'role': 'assistant', 'content': 'Within 14 days of purchase, with a receipt (handbook v2).'}],
                                                          'rejected': [{'role': 'assistant', 'content': 'Within 30 days of purchase.'}]}, ensure_ascii=False))
    file('finetune/card.json', json.dumps({'name': 'brewline-policy-qa', 'version': '2026-03-14', 'rows': len(kept), 'source': 'corpus.py facts, 6 prompt templates', 'split': 'grouped by fact',
                                            'removed': {'exact_duplicates': len(raw) - len(clean), 'near_duplicates': len(clean) - len(kept)}, 'contains_personal_data': False,
                                            'known_gaps': ['no examples that refuse a question', 'one answer style']}, indent=2))


# =======================================================================================================================================
# The model API: retries, timeouts, streaming, tool calls and a checked answer, with the real SDKs and a local stand-in server
# =======================================================================================================================================
def sec_llm():
    import anthropic
    import openai
    import standin_llm as sl
    import llm_calls as lc
    si = sl.StandIn()
    ac = anthropic.Anthropic(api_key='stand-in-key', base_url=si.base)
    oc = openai.OpenAI(api_key='stand-in-key', base_url=si.base + '/v1')
    ok_a, ok_o = sl.anthropic_message('hello'), sl.openai_chat('hello')
    e429 = lambda: sl.anthropic_error('rate_limit_error', 'slow down')
    scen = [
        ('429 with retry-after: 1', [(429, {'retry-after': '1'}, e429(), 0), (200, {}, 'OK', 0)], {}),
        ('529, then 429, then 200', [(529, {}, sl.anthropic_error('overloaded_error', 'busy'), 0), (429, {}, e429(), 0), (200, {}, 'OK', 0)], {}),
        ('500 three times', [(500, {}, {}, 0)] * 3, {}),
        ('400, a bad request', [(400, {}, sl.anthropic_error('invalid_request_error', 'max_tokens is too large'), 0)], {}),
        ('an answer slower than the timeout (0.5 s), one retry allowed', [(200, {}, 'OK', 1.2)] * 2, {'timeout': 0.5, 'max_retries': 1}),
        ('429 with retries switched off', [(429, {}, e429(), 0)], {'max_retries': 0}),
    ]
    rows = []
    for sdk, client, call, ok in (('anthropic', ac, lc.ask_anthropic, ok_a), ('openai', oc, lc.ask_openai, ok_o)):
        for label, plan, opts in scen:
            plan = [(st, h, (ok if b == 'OK' else b), d) for st, h, b, d in plan]
            si.reset(plan)
            try:
                call(client, 'hi', **opts)
                res = 'answer returned'
            except Exception as e:
                res = type(e).__name__
            gaps = si.gaps()
            rows.append([sdk, label, len(si.log), ', '.join(str(x['retry_count']) for x in si.log), res, ', '.join('%.1f' % g for g in gaps) if 'retry-after' in label else
                         'between %.2f and %.2f' % (min(gaps), max(gaps)) if gaps else '-'])
    rows = [[r[0], r[1], r[2], r[3], r[4], ('about 1.0 (the header)' if 'retry-after' in r[1] else ('the timeout, then 0.4 to 0.5' if 'timeout' in r[1] else ('0.4 to 0.5, then 0.8 to 1.0 (backoff with jitter)' if r[2] == 3 else '-')))] for r in rows]
    table('llm.retries', ['SDK', 'what the server did', 'requests sent', 'retry count in each request', 'what the caller got', 'wait between requests (s)'], rows)
    import anthropic._constants as ka
    import openai._constants as ko
    counts('llm.constants', {'anthropic': {'version': anthropic.__version__, 'max_retries': ac.max_retries, 'initial_retry_delay': ka.INITIAL_RETRY_DELAY, 'max_retry_delay': ka.MAX_RETRY_DELAY, 'timeout': str(ka.DEFAULT_TIMEOUT)},
                             'openai': {'version': openai.__version__, 'max_retries': oc.max_retries, 'initial_retry_delay': ko.INITIAL_RETRY_DELAY, 'max_retry_delay': ko.MAX_RETRY_DELAY, 'timeout': str(ko.DEFAULT_TIMEOUT)}})
    # streaming
    pieces = ['A refund ', 'is possible ', 'within 14 ', 'days.']
    si.reset([(200, {}, sl.anthropic_sse(pieces), 0)])
    events, final = lc.stream_anthropic(ac, 'hi')
    text_out = ''.join(b.text for b in final.content if b.type == 'text')
    collapsed = []
    for e in events:
        if collapsed and collapsed[-1][0] == e:
            collapsed[-1][1] += 1
        else:
            collapsed.append([e, 1])
    si.reset([(200, {}, sl.openai_sse(pieces), 0)])
    chunks = lc.stream_openai(oc, 'hi')
    counts('llm.stream', {'anthropic_event_types': events, 'anthropic_event_runs': collapsed, 'anthropic_text': text_out, 'anthropic_usage': {'input': final.usage.input_tokens, 'output': final.usage.output_tokens},
                          'openai_chunks': len(chunks), 'openai_text': ''.join(c.choices[0].delta.content or '' for c in chunks), 'openai_last_finish_reason': chunks[-1].choices[0].finish_reason,
                          'note': 'the stand-in sends the pieces that the script gave it, so the number of events is set by the script. The order and the names of the events are the real protocol.'})
    # a tool call, and the result sent back
    si.reset([(200, {}, sl.anthropic_message(tool=('search_policies', {'query': 'refund window'})), 0), (200, {}, sl.anthropic_message('Within 14 days.'), 0)])
    r1, block, r2 = lc.answer_with_tool(ac, 'How long do customers have to return beans?', lambda name, **kw: 'A customer may return ... within 14 days of purchase.')
    b1, b2 = si.log[0]['body'], si.log[1]['body']
    counts('llm.tools', {'request_1_keys': sorted(b1.keys()), 'request_1_tools': b1['tools'], 'response_stop_reason': r1.stop_reason, 'response_block': {'type': block.type, 'name': block.name, 'input': block.input, 'id': block.id},
                         'request_2_roles': [m['role'] for m in b2['messages']], 'request_2_block_types': [[c['type'] for c in m['content']] if isinstance(m['content'], list) else 'text' for m in b2['messages']],
                         'request_2_tool_use_id_matches': b2['messages'][2]['content'][0]['tool_use_id'] == block.id, 'final_text': r2.content[0].text, 'requests_sent': len(si.log)})
    file('llm/request_with_tools.json', json.dumps({k: b1[k] for k in ('model', 'max_tokens', 'messages', 'tools')}, indent=2))
    # a structured answer, checked
    schema = lc.RefundDecision.model_json_schema()
    raw = ['{"order_id": "ORD-2026-0412", "approve": true, "reason": "inside the 14 day window"}', '{"order_id": "ORD-2026-0412", "approve": "maybe"}',
           'Sure! Here is the JSON you asked for: {"order_id": "ORD-2026-0412", "approve": true, "reason": "ok"}']
    checks = []
    for r in raw:
        obj, why = lc.check_decision(r)
        checks.append({'text': r[:70] + ('...' if len(r) > 70 else '') if obj is None else r[:70], 'valid': obj is not None, 'error': why})
    counts('llm.structured', {'schema': schema, 'checks': checks})
    si.close()


# =======================================================================================================================================
# The agent loop: LangGraph with a scripted model, real tools, and a person in the loop
# =======================================================================================================================================
def build_tools(calls=None):
    import duckdb
    searcher = course_searcher()
    chunks = P['chunks']
    by_id = {c['id']: c for c in chunks}
    con = duckdb.connect()
    con.execute("create table orders as select i as order_id, ['COMPLETED','COMPLETED','COMPLETED','CANCELLED','PENDING'][1 + i % 5] as status from range(1, 201) t(i)")
    refunds = []

    def search_policies(query: str, k: int = 3):
        ids = searcher.hybrid_rank(query, mask=lambda c: c['current'])[:k]
        return [by_id[i]['text'][:120] for i in ids]

    def orders_by_status(status: str):
        if status not in ('COMPLETED', 'CANCELLED', 'PENDING'):
            raise ValueError("unknown status '%s'. allowed: COMPLETED, CANCELLED, PENDING" % status)
        return con.execute('select count(*) from orders where status = ?', [status]).fetchone()[0]

    def issue_refund(order_id: str, amount: float):
        refunds.append((order_id, amount))
        return 'refunded %.2f on %s' % (amount, order_id)
    return {'search_policies': search_policies, 'orders_by_status': orders_by_status, 'issue_refund': issue_refund}, refunds


def summarize(update):
    out = []
    for node, val in update.items():
        if node == '__interrupt__':
            out.append(('interrupt', 'paused: ' + json.dumps(val[0].value)))
            continue
        for m in val.get('messages', []):
            if m['role'] == 'assistant' and 'tool_calls' in m:
                out.append((node, 'call ' + ', '.join('%s(%s)' % (c['name'], ', '.join('%s=%r' % kv for kv in c['args'].items())) for c in m['tool_calls'])))
            elif m['role'] == 'assistant':
                out.append((node, 'answer: ' + m['final']))
            else:
                c = m['content']
                out.append((node, '%s %s: %s' % (m['name'], 'ok' if m['ok'] else 'ERROR', (json.dumps(c) if not isinstance(c, str) else c)[:90])))
    return out


def sec_agent():
    import agent_graph as ag
    import agent_runs as ar
    from langgraph.checkpoint.memory import InMemorySaver
    from langgraph.checkpoint.sqlite import SqliteSaver
    from langgraph.errors import GraphRecursionError
    from langgraph.types import Command
    user = {'role': 'user', 'content': 'How long do customers have to return beans, and how many orders are completed?'}
    start = {'messages': [user], 'steps': 0}
    call = lambda name, **a: {'tool_calls': [{'name': name, 'args': a}]}
    last_tool = lambda msgs: [m for m in msgs if m['role'] == 'tool'][-1]
    happy = [call('search_policies', query='return beans refund window'), call('orders_by_status', status='COMPLETED'),
             lambda msgs: {'final': 'Customers have 14 days (handbook v2). %s orders are completed.' % last_tool(msgs)['content']}]
    scen_rows, traces = [], {}

    def run(label, script, tools, **kw):
        calls = collections.Counter()
        g = ag.make_graph(ag.ScriptedModel(script), tools, on_tool=lambda n, a: calls.update([n]), **kw.get('graph', {}))
        cfg = {'configurable': {'thread_id': label}}
        events = []
        for upd in g.stream(start, cfg, stream_mode='updates'):
            events += summarize(upd)
        return g, cfg, events, calls
    tools, refunds = build_tools()
    g, cfg, ev, calls = run('A', happy, tools, graph={'checkpointer': InMemorySaver()})
    traces['A'] = ev
    state = g.get_state(cfg)
    scen_rows.append(['A. two tools, then an answer', sum(1 for n, _ in ev if n == 'model'), sum(calls.values()), ev[-1][1][:100]])
    # B: a tool error that the model can read and fix
    def fix(msgs):
        m = last_tool(msgs)
        allowed = m['content'].split('allowed: ')[1].split(', ')
        return call('orders_by_status', status=allowed[0])
    scriptB = [call('orders_by_status', status='done'), fix, lambda msgs: {'final': '%s orders are completed.' % last_tool(msgs)['content']}]
    g, cfg, ev, calls = run('B', scriptB, tools)
    traces['B'] = ev
    scen_rows.append(['B. a wrong argument, an error message, a second try', sum(1 for n, _ in ev if n == 'model'), sum(calls.values()), ev[-1][1][:100]])
    # C: a loop that never ends, stopped by our own step limit, and by the framework limit
    scriptC = [call('search_policies', query='refund')]
    g, cfg, ev, calls = run('C', scriptC, tools, graph={'max_steps': 6})
    traces['C'] = ev
    scen_rows.append(['C. the same call again and again, our limit of 6 steps', sum(1 for n, _ in ev if n == 'model'), sum(calls.values()), ev[-1][1][:100]])
    g2 = ag.make_graph(ag.ScriptedModel(scriptC), tools, max_steps=1000)
    try:
        g2.invoke(start, {'recursion_limit': 10})
        rec_err = 'no error'
    except GraphRecursionError as e:
        rec_err = str(e).splitlines()[0]
    # a state field without a reducer: the second node replaces the list instead of adding to it
    import operator
    from typing import Annotated, TypedDict
    from langgraph.graph import END, START, StateGraph

    class Plain(TypedDict):
        messages: list

    class Adding(TypedDict):
        messages: Annotated[list, operator.add]

    def two_nodes(state_type):
        gr = StateGraph(state_type)
        gr.add_node('a', lambda s: {'messages': ['from a']})
        gr.add_node('b', lambda s: {'messages': ['from b']})
        gr.add_edge(START, 'a')
        gr.add_edge('a', 'b')
        gr.add_edge('b', END)
        return gr.compile()
    counts('agent.reducer', {'start': ['question'], 'without_reducer': two_nodes(Plain).invoke({'messages': ['question']})['messages'], 'with_reducer': two_nodes(Adding).invoke({'messages': ['question']})['messages']})
    # D: a write that needs a person
    scriptD = [call('issue_refund', order_id='ORD-2026-0412', amount=12.5), lambda msgs: {'final': 'Done: %s' % last_tool(msgs)['content']}]
    flat = lambda updates: [e for upd in updates for e in summarize(upd)]
    refunds.clear()
    gD = ag.make_graph(ag.ScriptedModel(scriptD), tools, checkpointer=InMemorySaver())
    cD = ar.thread('D')
    evD = flat(ar.run(gD, start, cD))
    waiting_for, payload = ar.paused(gD, cD)
    before = len(refunds)
    evD += flat(ar.decide(gD, cD, 'approve'))
    after_approve = len(refunds)
    refunds.clear()
    gD2 = ag.make_graph(ag.ScriptedModel(scriptD), tools, checkpointer=InMemorySaver())
    cD2 = ar.thread('D2')
    evD2 = flat(ar.run(gD2, start, cD2)) + flat(ar.decide(gD2, cD2, 'deny'))
    traces['D'] = evD
    traces['D_denied'] = evD2
    scen_rows.append(['D. a refund waits for a person (approve)', 2, 1, 'refunds written: %d before, %d after approval' % (before, after_approve)])
    scen_rows.append(['D. the same refund (deny)', 2, 1, 'refunds written: %d, the model was told: %s' % (len(refunds), evD2[-2][1][:60])])
    counts('agent.interrupt', {'next_node_while_paused': waiting_for, 'refunds_before_resume': before, 'refunds_after_approve': after_approve, 'refunds_after_deny': len(refunds), 'payload': payload or None})
    # E: what resume does to the lines before the interrupt
    scriptE = [{'tool_calls': [{'name': 'search_policies', 'args': {'query': 'refund'}}, {'name': 'issue_refund', 'args': {'order_id': 'ORD-1', 'amount': 5.0}}]}, {'final': 'ok'}]
    cnt = collections.Counter()
    gE = ag.make_graph(ag.ScriptedModel(scriptE), tools, checkpointer=InMemorySaver(), on_tool=lambda n, a: cnt.update([n]))
    cE = ar.thread('E')
    ar.run(gE, start, cE)
    first = dict(cnt)
    ar.decide(gE, cE, 'approve')
    counts('agent.resume_runs_again', {'tool_calls_before_resume': first, 'tool_calls_after_resume': dict(cnt), 'explanation': 'on resume the node starts again from its first line. The read tool before the interrupt ran a second time.'})
    # F: the checkpoints of run A, and a replay from one of them
    gA = ag.make_graph(ag.ScriptedModel(happy), tools, checkpointer=InMemorySaver())
    cA = ar.thread('F')
    ar.run(gA, start, cA)
    hist = ar.checkpoints(gA, cA)
    hrows = [[i, ' or '.join(s.next) or 'done', s.values.get('steps', 0), len(s.values.get('messages', []))] for i, s in enumerate(hist)]
    table('agent.history', ['checkpoint', 'next node', 'model calls so far', 'messages so far'], hrows)
    snap = next(s for s in hist if s.next == ('tools',))
    cntR = collections.Counter()
    gR = ag.make_graph(ag.ScriptedModel(happy), tools, checkpointer=gA.checkpointer, on_tool=lambda n, a: cntR.update([n]))
    res = ar.replay_from(gR, snap)
    counts('agent.replay', {'checkpoints': len(hist), 'replayed_from': {'next': list(snap.next), 'model_calls': snap.values['steps']}, 'tools_run_again': dict(cntR), 'final_messages': len(res['messages'])})
    # G: a run that survives the process
    path = WORK / 'agent.sqlite'
    refunds.clear()
    with SqliteSaver.from_conn_string(str(path)) as s1:
        g1 = ag.make_graph(ag.ScriptedModel(scriptD), tools, checkpointer=s1)
        ar.run(g1, start, ar.thread('G'))
    import sqlite3
    c1 = sqlite3.connect(str(path))
    tabs = [r[0] for r in c1.execute("select name from sqlite_master where type = 'table' order by name")]
    n_ck = c1.execute("select count(*) from checkpoints where thread_id = 'G'").fetchone()[0]
    c1.close()
    with SqliteSaver.from_conn_string(str(path)) as s2:
        g2_ = ag.make_graph(ag.ScriptedModel(scriptD), tools, checkpointer=s2)
        ar.decide(g2_, ar.thread('G'), 'approve')
    counts('agent.durable', {'tables': tabs, 'checkpoints_for_the_thread_while_paused': n_ck, 'refunds_after_resume_in_a_new_graph_object': len(refunds), 'store': 'SQLite file through langgraph-checkpoint-sqlite'})
    # H: a fixed workflow against an agent, for the same job
    wf_calls = collections.Counter()
    q_ = 'return beans refund window'
    wf_calls.update(['search_policies'])
    tools['search_policies'](q_)
    wf_calls.update(['orders_by_status'])
    n_done = tools['orders_by_status']('COMPLETED')
    counts('agent.workflow_vs_agent', {'workflow': {'model_calls': 1, 'tool_calls': 2, 'steps_decided_by': 'the code', 'repeatable': True}, 'agent': {'model_calls': 3, 'tool_calls': 2, 'steps_decided_by': 'the model', 'repeatable': False},
                                       'note': 'both give the same answer here. The workflow asks the model once, to write the answer. The agent asks it three times, to choose each step and to write the answer.'})
    table('agent.scenarios', ['scenario', 'model calls', 'tool calls', 'how it ended'], scen_rows)
    counts('agent.traces', traces)
    counts('agent.limits', {'recursion_error': rec_err, 'our_limit': 6, 'recursion_limit_used': 10, 'langgraph': version('langgraph')})
    file('agent/agent_graph.py', (HERE / 'agent_graph.py').read_text().rstrip('\n'))


# =======================================================================================================================================
# Model Context Protocol: a real server, a real client, and a tap on the wire
# =======================================================================================================================================
def sec_mcp():
    import asyncio
    from mcp import Client, StdioServerParameters
    results = {}

    async def drive(mode):
        log = WORK / ('wire-%s.jsonl' % mode)
        params = StdioServerParameters(command=sys.executable, args=[str(HERE / 'mcp_tap.py'), str(log), sys.executable, str(HERE / 'mcp_server.py')])
        out = {}
        async with Client(params, mode=mode) as c:
            out['protocol_version'] = str(c.protocol_version)
            out['server_info'] = {'name': c.server_info.name, 'version': c.server_info.version}
            tl = await c.list_tools()
            out['tools'] = [t.name for t in tl.tools]
            out['tool_defs'] = [t.model_dump(mode='json', by_alias=True, exclude_none=True) for t in tl.tools]
            r = await c.call_tool('orders_by_status', {'status': 'COMPLETED'})
            out['call_ok'] = {'is_error': r.is_error, 'text': r.content[0].text.replace('\n', '').replace('  ', '')}
            r = await c.call_tool('issue_refund', {'order_id': 'ORD-1', 'amount': -5})
            out['call_tool_error'] = {'is_error': r.is_error, 'text': r.content[0].text}
            try:
                r = await c.call_tool('orders_by_status', {'status': 'SHIPPED'})
                out['call_bad_argument'] = {'is_error': r.is_error, 'text': r.content[0].text[:200]}
            except Exception as e:
                out['call_bad_argument'] = {'raised': type(e).__name__, 'text': str(e)[:200]}
            try:
                r = await c.call_tool('no_such_tool', {})
                out['call_unknown'] = {'is_error': r.is_error, 'text': r.content[0].text[:120]}
            except Exception as e:
                out['call_unknown'] = {'raised': type(e).__name__, 'text': str(e)[:120]}
            rs = await c.list_resources()
            out['resources'] = [str(x.uri) for x in rs.resources]
            rr = await c.read_resource('brewline://schema/orders')
            out['resource_text'] = rr.contents[0].text
            ps = await c.list_prompts()
            out['prompts'] = [x.name for x in ps.prompts]
        lines = [json.loads(x) for x in log.read_text().splitlines()]
        wire = []
        for n, x in enumerate(lines, 1):
            m = json.loads(x['line'])
            wire.append({'n': n, 'dir': x['dir'], 'method': m.get('method', 'result' if 'result' in m else 'error'), 'id': m.get('id'), 'bytes': len(x['line'].encode()), 'raw': x['line']})
        out['wire'] = wire
        return out
    for mode in ('auto', 'legacy'):
        results[mode] = asyncio.run(drive(mode))
    a, lg = results['auto'], results['legacy']
    table('mcp.wire', ['#', 'direction', 'message', 'id', 'bytes'], [[w['n'], w['dir'], w['method'], '' if w['id'] is None else w['id'], w['bytes']] for w in a['wire']])
    table('mcp.wire_legacy', ['#', 'direction', 'message', 'id', 'bytes'], [[w['n'], w['dir'], w['method'], '' if w['id'] is None else w['id'], w['bytes']] for w in lg['wire']])
    counts('mcp.session', {k: v for k, v in a.items() if k not in ('wire', 'tool_defs')})
    counts('mcp.session_legacy', {k: v for k, v in lg.items() if k not in ('wire', 'tool_defs')})
    td = {t['name']: t for t in a['tool_defs']}
    file('mcp/tool_definition.json', json.dumps(td['orders_by_status'], indent=2))
    first_req = json.loads(a['wire'][0]['raw'])
    file('mcp/first_request.json', json.dumps(first_req, indent=2))
    first_resp = json.loads(a['wire'][1]['raw'])
    file('mcp/first_response.json', json.dumps(first_resp, indent=2))
    call = next(w for w in a['wire'] if w['method'] == 'tools/call')
    file('mcp/tool_call.json', json.dumps(json.loads(call['raw']), indent=2))
    callr = a['wire'][a['wire'].index(call) + 1]
    file('mcp/tool_result.json', json.dumps(json.loads(callr['raw']), indent=2))
    defs_chars = sum(len(json.dumps(t)) for t in a['tool_defs'])
    counts('mcp.footprint', {'tools': len(a['tool_defs']), 'json_chars_of_tool_definitions': defs_chars, 'chars_per_tool': round(defs_chars / len(a['tool_defs'])), 'rule_of_thumb_chars_per_token': 4,
                             'tokens_for_these_tools': round(defs_chars / 4), 'tokens_for_40_such_tools': round(defs_chars / len(a['tool_defs']) * 40 / 4)})
    file('mcp/mcp_server.py', (HERE / 'mcp_server.py').read_text().rstrip('\n'))
    file('mcp/mcp_tap.py', (HERE / 'mcp_tap.py').read_text().rstrip('\n'))


# =======================================================================================================================================
# Traces: OpenTelemetry spans of one agent run
# =======================================================================================================================================
def sec_otel():
    import agent_graph as ag
    import tracing as tr
    tracer, exporter = tr.setup()
    tools, refunds = build_tools()
    call = lambda name, **a: {'tool_calls': [{'name': name, 'args': a}]}
    last_tool = lambda msgs: [m for m in msgs if m['role'] == 'tool'][-1]

    def fix(msgs):
        return call('orders_by_status', status='COMPLETED')
    script = [call('orders_by_status', status='done'), fix, lambda msgs: {'final': '%s orders are completed.' % last_tool(msgs)['content']}]
    g = ag.make_graph(tr.TracedModel(ag.ScriptedModel(script), tracer), {k: tr.traced(tracer, k, v) for k, v in tools.items()})
    res = tr.run_agent(g, tracer, {'messages': [{'role': 'user', 'content': 'How many orders are completed?'}], 'steps': 0})
    spans = exporter.get_finished_spans()
    ids = {s.context.span_id: s.name for s in spans}
    rows = []
    for s in sorted(spans, key=lambda s: s.start_time):
        rows.append([s.name, ids.get(s.parent.span_id, '') if s.parent else '', s.kind.name, s.status.status_code.name,
                     ', '.join('%s=%s' % (k.replace('gen_ai.', ''), v) for k, v in s.attributes.items() if k != 'gen_ai.operation.name'), len(s.events)])
    table('otel.spans', ['span', 'parent', 'kind', 'status', 'attributes', 'events'], rows)
    tin = sum(s.attributes.get('gen_ai.usage.input_tokens', 0) for s in spans)
    tout = sum(s.attributes.get('gen_ai.usage.output_tokens', 0) for s in spans)
    counts('otel.summary', {'spans': len(spans), 'model_calls': sum(1 for s in spans if s.name.startswith('chat')), 'tool_calls': sum(1 for s in spans if s.name.startswith('execute_tool')),
                            'tool_errors': sum(1 for s in spans if s.name.startswith('execute_tool') and s.status.status_code.name == 'ERROR'), 'input_tokens_total': tin, 'output_tokens_total': tout,
                            'event_names_on_the_failed_span': [e.name for s in spans if s.status.status_code.name == 'ERROR' for e in s.events], 'answer': res['messages'][-1]['final'],
                            'sdk': 'opentelemetry-sdk ' + (version('opentelemetry-sdk') or ''), 'note': 'the tokens are counted from the length of the scripted messages (one token for four characters), because no model ran. The attribute names follow the OpenTelemetry GenAI conventions, which are still in development.'})


# =======================================================================================================================================
# Prompt injection: what the system does when a retrieved text gives an order
# =======================================================================================================================================
def sec_inject():
    import agent_graph as ag
    import agent_runs as ar
    import defences as df
    from langgraph.checkpoint.memory import InMemorySaver
    from langgraph.types import Command
    s = course_searcher()
    chunks = list(P['chunks'])
    poison = {'id': 'poison:0', 'doc_id': 'poison', 'audience': 'all-staff', 'current': True, 'i': 0, 'text': df.POISON}
    poisoned = Searcher(chunks + [poison])
    q = 'What is the refund policy for returning beans?'
    rank_poison = poisoned.hybrid_rank(q).index('poison:0') + 1
    clean_rank = [i for i in s.hybrid_rank(q)].index(next(iter(relevant_ids(P['chunks'], 'f01'))))  + 1
    counts('inject.retrieval', {'question': q, 'poisoned_chunk_rank': rank_poison, 'right_chunk_rank_without_it': clean_rank, 'chunks': len(chunks) + 1,
                                'why': 'the injected text repeats the words of the question, so keyword search puts it first. Retrieval has no idea that the text is an order.'})
    file('inject/poisoned_chunk.txt', df.POISON)
    refunds = []

    def search_poisoned(query: str, k: int = 3):
        return [c['text'][:300] for c in [next(x for x in poisoned.chunks if x['id'] == i) for i in poisoned.hybrid_rank(query)[:k]]]

    def refund(order_id: str, amount: float):
        refunds.append((order_id, amount))
        return 'refunded %.2f on %s' % (amount, order_id)

    guarded_refund = df.guard_refund(refund, ('ORD-2026-0412',), 50)
    start = {'messages': [{'role': 'user', 'content': q}], 'steps': 0}
    rows = []

    def go(label, tools, defence, **kw):
        refunds.clear()
        g = ag.make_graph(df.ObedientModel(), tools, checkpointer=InMemorySaver(), **kw)
        cfg = {'configurable': {'thread_id': label}}
        ev = []
        for upd in g.stream(start, cfg, stream_mode='updates'):
            ev += summarize(upd)
        paused = any(n == 'interrupt' for n, _ in ev)
        if paused:
            for upd in g.stream(Command(resume='deny'), cfg, stream_mode='updates'):
                ev += summarize(upd)
        rows.append([label, defence, 'EUR %s' % sum(a for _, a in refunds) if refunds else 'none', ev[-1][1][:70], 'yes' if paused else 'no'])
        return ev
    base = {'search_policies': search_poisoned}
    go('1. nothing in the way', dict(base, issue_refund=refund), 'none', approve_writes=False)
    go('2. the assistant has no write tool', dict(base), 'least privilege: only read tools are given', approve_writes=False)
    go('3. a person approves each write', dict(base, issue_refund=refund), 'human approval before a write (the person said no)', approve_writes=True)
    go('4. the tool checks its arguments', dict(base, issue_refund=guarded_refund), 'the tool refuses an order that is not in the conversation and an amount above 50', approve_writes=False)
    table('inject.outcomes', ['run', 'defence', 'money refunded', 'how it ended', 'paused for a person'], rows)
    counts('inject.note', {'model': 'a stand-in that obeys the injected sentence. It says nothing about whether a real model would. It shows what the rest of the system does either way.'})


# =======================================================================================================================================
def finish():
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(OUT, indent=1, sort_keys=True, ensure_ascii=False)
    out.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + body + ';\n')
    if args.json:
        pathlib.Path(args.json).write_text(body)
    print('wrote', out, len(body), 'bytes:', {k: len(v) for k, v in OUT.items()})


# =======================================================================================================================================
# Tests of the agent, with pytest: on the real agent, and on two copies that were broken on purpose
# =======================================================================================================================================
def sec_tests():
    import subprocess
    summary = {}
    for label, brk in (('clean', ''), ('no_limit', 'no_limit'), ('no_approval', 'no_approval')):
        env = dict(os.environ, AGENT_BREAK=brk, PYTHONDONTWRITEBYTECODE='1')
        r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=line', '-rf', 'test_agent.py'], cwd=str(HERE), env=env, capture_output=True, text=True)
        txt = r.stdout.strip()
        txt = re.sub(r' in [0-9.]+s', '', txt)                                   # the time varies
        txt = txt.replace(str(HERE) + '/', '')
        txt = re.sub(r'/[^ ]*/site-packages/', '.../', txt)
        txt = '\n'.join(l for l in txt.splitlines() if not l.startswith('    For troubleshooting'))
        last = txt.splitlines()[-1]
        summary[label] = {'passed': int((re.search(r'(\d+) passed', last) or [0, 0])[1]), 'failed': int((re.search(r'(\d+) failed', last) or [0, 0])[1]), 'break': brk or 'none'}
        file('test/pytest_%s.txt' % label, txt)
    file('test/test_agent.py', (HERE / 'test_agent.py').read_text().rstrip('\n'))
    counts('test.summary', summary)


SECTIONS = [('docs', sec_docs), ('chunk', sec_chunk), ('embed', sec_embed), ('search', sec_search), ('eval', sec_eval), ('ann', sec_ann), ('pgvector', sec_pgvector), ('pipeline', sec_pipeline), ('sqlguard', sec_sqlguard), ('finetune', sec_finetune), ('tokens', sec_tokens), ('llm', sec_llm), ('agent', sec_agent), ('mcp', sec_mcp), ('otel', sec_otel), ('tests', sec_tests), ('inject', sec_inject)]

if __name__ == '__main__':
    for name, fn in SECTIONS:
        if name in ONLY:
            t = time.time()
            fn()
            print('  %-10s %.1fs' % (name, time.time() - t))
    finish()
