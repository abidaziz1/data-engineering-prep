"""An ingestion pipeline for a vector index that is safe to run again. The lessons show this file, and the recorder runs it.

Four ideas make a run safe to repeat:
  1. A chunk is named by what it says (a hash of the model and the text), so the same text gives the same id.
  2. Only chunks that are new are embedded. A chunk that is unchanged keeps its vector.
  3. A chunk that is gone from its document is deleted, and a deleted document leaves no chunks behind.
  4. A change of a label (who may read it, whether it is current) updates the row and costs no embedding.
The store is SQLite and the search is a scan with numpy, so that every step can be read. A real system uses a vector database
for the search, and keeps the same rules for what goes in.
"""
import hashlib
import sqlite3

import numpy as np

SCHEMA = """
create table if not exists documents (doc_id text primary key, content_hash text, audience text, current integer, deleted integer default 0);
create table if not exists chunks (chunk_id text primary key, doc_id text, text text, embedding blob, model_id text, audience text, current integer);
"""


def chunk_id(doc_id, model_id, text):
    return doc_id + ':' + hashlib.sha256((model_id + '|' + text).encode()).hexdigest()[:10]


class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.executescript(SCHEMA)

    def count(self, table='chunks'):
        return self.db.execute('select count(*) from ' + table).fetchone()[0]


def ingest(store, docs, chunker, embedder, model_id):
    """docs: list of {doc_id, text, audience, current}. Returns what the run did."""
    stats = {'documents': len(docs), 'chunks_added': 0, 'chunks_unchanged': 0, 'chunks_removed': 0, 'embedded': 0, 'label_updates': 0, 'documents_skipped': 0}
    for d in docs:
        row = store.db.execute('select content_hash, audience, current from documents where doc_id = ?', (d['doc_id'],)).fetchone()
        h = hashlib.sha256(d['text'].encode()).hexdigest()[:16]
        labels = (d['audience'], int(d['current']))
        if row and row[0] == h and (row[1], row[2]) == labels:
            stats['documents_skipped'] += 1
            have = store.db.execute('select count(*) from chunks where doc_id = ? and model_id = ?', (d['doc_id'], model_id)).fetchone()[0]
            stats['chunks_unchanged'] += have
            continue
        existing = {r[0] for r in store.db.execute('select chunk_id from chunks where doc_id = ? and model_id = ?', (d['doc_id'], model_id))}
        wanted = {}
        for t in chunker(d['text']):
            wanted[chunk_id(d['doc_id'], model_id, t)] = t
        new = [i for i in wanted if i not in existing]
        if new:
            vecs = embedder([wanted[i] for i in new])
            stats['embedded'] += len(new)
            for i, v in zip(new, vecs):
                store.db.execute('insert into chunks values (?,?,?,?,?,?,?)', (i, d['doc_id'], wanted[i], np.asarray(v, dtype='float32').tobytes(), model_id, d['audience'], int(d['current'])))
        for i in existing - set(wanted):
            store.db.execute('delete from chunks where chunk_id = ?', (i,))
            stats['chunks_removed'] += 1
        stats['chunks_added'] += len(new)
        stats['chunks_unchanged'] += len(set(wanted) & existing)
        if row and (row[1], row[2]) != labels and row[0] == h:
            stats['label_updates'] += 1
        store.db.execute('update chunks set audience = ?, current = ? where doc_id = ? and model_id = ?', (d['audience'], int(d['current']), d['doc_id'], model_id))
        store.db.execute('insert or replace into documents values (?,?,?,?,0)', (d['doc_id'], h, d['audience'], int(d['current'])))
    store.db.commit()
    return stats


def delete_document(store, doc_id):
    n = store.db.execute('delete from chunks where doc_id = ?', (doc_id,)).rowcount
    store.db.execute('update documents set deleted = 1 where doc_id = ?', (doc_id,))
    store.db.commit()
    return n


def search(store, embed_query, query, model_id, k=3, audiences=None, only_current=True):
    """The filter runs inside the search: a row that may not be read is never a candidate."""
    sql = 'select chunk_id, text, embedding, audience from chunks where model_id = ?' + (' and current = 1' if only_current else '')
    rows = [r for r in store.db.execute(sql, (model_id,)) if audiences is None or r[3] in audiences]
    if not rows:
        return []
    mat = np.vstack([np.frombuffer(r[2], dtype='float32') for r in rows])
    sims = mat @ embed_query(query)
    order = np.argsort(-sims, kind='stable')[:k]
    return [(rows[i][0], round(float(sims[i]), 3), rows[i][1]) for i in order]
