/* Mission 4: embeddings, vector indexes and search. The embedding is a stand-in (TF-IDF and an SVD), because no embedding model could be reached.
   Everything about indexes is real: FAISS and hnswlib on 30,000 made-up vectors, PostgreSQL with pgvector on the same vectors, BM25 with rank-bm25,
   and reciprocal rank fusion, all scored on 24 Brewline questions. Which vector store to choose comes from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RK = G.file('code/ragkit.py'), PGS = G.file('pg/statements.sql');
  var EMB = G.lines(RK, G.at(RK, /^def tokens/), G.span(RK, /^class LsaEmbedder/, /return \(m \/ np\.where/)[1]);
  var SRCH = G.lines(RK, G.at(RK, /^def rrf/), G.span(RK, /^class Searcher/, /return \[self\.ids\[i\] for i in idx/)[1]);
  var M = G.counts('embed.model'), HN = G.table('ann.hnsw').rows, IV = G.table('ann.ivf').rows, PQ = G.table('ann.pq').rows, SZ = G.table('ann.sizes').rows, AD = G.counts('ann.data');
  var ME = G.table('search.methods').rows, BK = G.counts('search.by_kind'), EX = G.table('search.expansion').rows, PF = G.table('pg.filter').rows, PL = G.counts('pg.limit'), PT = G.counts('pg.plan_hnsw'), PX = G.counts('pg.plan_exact');
  function hn(m, ef) { return HN.filter(function (r) { return r[0] === m && r[1] === ef; })[0]; }
  function iv(np) { return IV.filter(function (r) { return r[0] === np; })[0]; }
  var H16 = hn(16, 64), H8 = hn(8, 8), I8 = iv(8), I1 = iv(1);
  G.expect(M.dim === 64 && M.chunks === 87 && M.unit_length === true && M.vocabulary === 2201, 'the stand-in embedding');
  G.expect(H16[2] === 0.995 && H8[2] === 0.589 && I8[1] === 0.988 && I1[1] === 0.35 && AD.vectors === 30000, 'the ANN recalls');
  G.expect(PQ.length === 3 && PQ[0][2] === 0.129 && PQ[2][2] === 0.719 && SZ[0][1] === 256 && SZ[3][1] === 8, 'the compression numbers');
  G.expect(ME[0][2] === 0.875 && ME[1][2] === 0.792 && ME[2][2] === 0.875, 'the method scores');
  G.expect(BK['hit@3_by_kind'].table['vector (stand-in)'] === 0 && BK['hit@3_by_kind'].table['BM25 (keywords)'] === 1, 'the vector search fails the table question');
  G.expect(PF[0][2] < 1 && PF[0][3] === 10 && PL.rows_with_ef_search_40 === 40 && PL.rows_with_ef_search_200 === 100, 'the filter and limit results');
  G.expect(EX[0][1] === 0.875 && EX[0][2] === 0.792, 'query expansion hurt every method');
  var BUG1 = [
    'create index chunks_hnsw on chunks',
    '    using hnsw (embedding vector_cosine_ops);',
    '',
    'select id from chunks',
    '  order by embedding <-> $1::vector',
    '  limit 10;'
  ].join('\n');
  var FIX1 = BUG1.replace('<->', '<=>');
  var BUG2 = [
    'INDEX_MODEL = "embed-v1"                 # the model that made every vector in the index',
    '',
    'def search(question, k=5):',
    '    q = embed(question, model="embed-v2")  # the team upgraded the model last week',
    '    return index.query(q, k)'
  ].join('\n');
  var FIX2 = [
    'def search(question, k=5):',
    '    if index.model_id != EMBED_MODEL:',
    '        raise RuntimeError("the index was built with " + index.model_id + ", the query uses " + EMBED_MODEL)',
    '    q = embed(question, model=EMBED_MODEL)',
    '    return index.query(q, k)'
  ].join('\n');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Embeddings, vector indexes and search', short: 'Vectors', blurb: 'Vectors, distance, HNSW and IVF, pgvector, filters, and mixing keyword and vector search', minutes: 56,
    focus: ['int', 'mart'],
    goals: [
      'Explain an **embedding** and the three ways to compare vectors, and when they agree.',
      'Explain **HNSW and IVF**, their settings, and the **recall against work** trade.',
      'Run a vector search in **pgvector**, and say what goes wrong with **filters and limits**.',
      'Choose between **a library, pgvector, a vector database and a search engine**.',
      'Combine **keyword and vector search** with reciprocal rank fusion, and read what each is good at.',
      'Say why **a model change means a new index**.'
    ],
    say: 'Mission 4 is the vector part. One honest thing first: I could not reach an embedding model, so the vectors in the early labs come from a stand-in that works from the words of the Brewline files. Everything about indexes is real, though. I ran FAISS, hnswlib and PostgreSQL with pgvector on 30,000 vectors and measured recall and work, and I scored three kinds of search on 24 questions. Distance, graphs, lists and filters work the same for any embedding.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, src: 'docs', title: 'Words become numbers',
        say: 'A vector search needs three things: an embedding model, a way to compare vectors, and an index that makes the comparison fast. Press Next for each.',
        items: [
          ['The embedding model', 'A neural network that takes a text and returns a list of numbers of a fixed length, such as 384, 768, 1536 or 3072. Texts with similar meaning give vectors that point in similar directions. Models differ in language, domain, maximum input length, size and price, and you choose with a test on your own questions.', 'Text in, a fixed-length vector out.'],
          ['Comparing two vectors', 'Cosine similarity looks at the angle. The dot product also grows with length. Euclidean distance looks at the gap. Many models give their vectors unit length, and then all three give the same ranking. The model card says which measure the model was trained for.', 'Read the model card for the measure.'],
          ['Exact search', 'Compare the query with every stored vector. It is always right, and its cost grows with the number of vectors. For tens of thousands of rows it is often fast enough, and you should measure before you add an index.', 'Right, and slow at scale.'],
          ['Approximate search', 'An index such as HNSW or IVF looks at a small part of the data and returns the best it found. It is much faster, and it can miss a true neighbour. The share of true neighbours that it returns is the recall, and you set the settings against a recall that you choose.', 'Fast, and sometimes wrong. Measure the recall.'],
          ['One model, one index', 'Vectors from two models cannot be compared, even when they have the same length. The index must record the model that made it, and a query must use the same one. A new model means a new index.', 'Never mix vectors of two models.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm4-lsa', t: 1, src: 'rec', title: 'The stand-in embedder, in code', file: 'ragkit.py', lang: 'python', code: EMB,
        steps: [
          { say: 'This is the stand-in that made the vectors for the next labs. It is not a neural model. It exists because I could not reach one. The mechanics are real: text goes in, a matrix of vectors comes out, and the vectors have unit length.', lines: null },
          { say: '`tokens` lower-cases a text, keeps the words and numbers, and drops very common words such as "the" and "of". A keyword search will use the same function.', lines: G.span(EMB, /^STOP|^def tokens/, /return \[t for t in re\.findall/) },
          { say: 'TF-IDF turns each chunk into a long vector with one slot for each word or word pair of the whole set, here ' + fmtN(M.vocabulary) + ' of them, weighted by how special the word is. Then a truncated SVD squeezes that into **' + M.dim + '** numbers that keep the main directions of difference. That keeps ' + M.explained_variance + ' of the variance.', lines: G.span(EMB, /^class LsaEmbedder/, /self\.dim = dim/) },
          { say: '`fit` learns the vocabulary and the axes from the chunks. `embed` turns any text into a vector, and divides it by its length, so every vector has length 1. That is why the dot product and the cosine are the same number in the labs.', lines: G.span(EMB, /def fit/, /return \(m \/ np\.where/) },
          { say: 'The index of all ' + M.chunks + ' chunks takes ' + fmtN(M.bytes_float32) + ' bytes as 32-bit numbers: ' + M.chunks + ' times ' + M.dim + ' times 4. A neural model would give 6 to 48 times as many numbers for each chunk, and the same rules for storage apply.', lines: null }
        ],
        note: 'The stand-in knows only the words of the Brewline files. It cannot link "tips" and "gratuities", which a neural model usually can. Where a result depends on that, I say so.'
      }),

      B.widget({ id: 'm4-vectors-lab', kind: 'vectors', t: 1, src: 'rec', title: 'Lab: close or far, three measures, and the memory bill' }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'Three ways to find neighbours', g: 'vectors', legend: false,
        steps: [
          { say: 'Three ways to answer "which stored vectors are nearest to this query?". Each column is one method. Press Next to follow the work that each does for one query.', cap: 'Exact, IVF and HNSW side by side.' },
          { say: 'Exact search compares the query with every vector. For ' + fmtN(AD.vectors) + ' vectors that is ' + fmtN(AD.vectors) + ' comparisons for every query. It is always right and has no settings.', on: ['k1', 'k2'], focus: ['x_q', 'x_all', 'x_top'], cap: 'Compare with all of them.' },
          { say: 'IVF cuts the data into lists around centres that it learned from a sample. A query finds the nearest centres, and compares only inside those lists. `nprobe` is how many lists it reads. With ' + I8[0] + ' lists read, the recall was ' + I8[1] + ' and about ' + I8[3] + ' percent of the data was compared.', on: ['k3', 'k4', 'k5'], focus: ['v_q', 'v_cent', 'v_in', 'v_top'], cap: 'Read only the nearest lists.' },
          { say: 'HNSW builds a graph in layers. The top layer has a few nodes and long links. A query enters there, walks to the nearest node, drops a layer and repeats. `efSearch` is how many candidates it keeps while it walks. With M of 16 and efSearch of 64 the recall was ' + H16[2] + ', at about ' + H16[4] + ' percent of the work.', on: ['k6', 'k7', 'k8'], focus: ['h_q', 'h_top', 'h_walk', 'h_res'], cap: 'Walk a graph, layer by layer.' }
        ]
      }),

      B.widget({ id: 'm4-ann-lab', kind: 'ann', t: 1, src: 'rec', title: 'Lab: recall against work for HNSW, IVF and compression' }),

      B.code({
        id: 'm4-pg', t: 1, src: 'rec', title: 'The same search in PostgreSQL with pgvector', file: 'statements.sql', lang: 'sql', code: PGS,
        steps: [
          { say: 'These are the statements that I ran against PostgreSQL with pgvector ' + G.counts('pg.versions').pgvector + ', on this machine, with the same 30,000 vectors. Many teams already run Postgres, so a vector column in a table they know is a natural first step.', lines: null },
          { say: 'The extension adds a `vector` type, and a column declares its size. Build the index **after** the rows are loaded. An HNSW index takes `m`, the links of a node, and `ef_construction`, the candidates kept while building.', lines: G.span(PGS, /^create extension/, /^create index chunks_hnsw/) },
          { say: 'The query orders by distance. `<=>` is the cosine distance, and it must match the operator class of the index, here `vector_cosine_ops`, or the planner will not use the index. Without an index the plan is `' + PX.plan[3].trim().replace('->  ', '') + '` under a sort. With it the plan is `' + PT.plan[1].trim().replace('->  ', '') + '`.', lines: G.span(PGS, /^select id from chunks order by embedding/) },
          { say: '`hnsw.ef_search` is the size of the candidate list for a session. The default is 40. A `limit` larger than it returns fewer rows: with `limit ' + PL.limit + '` and the default the recording got **' + PL.rows_with_ef_search_40 + '** rows, and with 200 it got ' + PL.rows_with_ef_search_200 + '.', lines: G.span(PGS, /^set hnsw\.ef_search/) },
          { say: 'A filter with `where` is applied after the index returns its candidates. A tenant that owns 1 percent of the rows gets almost nothing back. Version 0.8 can keep scanning with `hnsw.iterative_scan`, and a partial index for a small tenant is the other repair.', lines: G.span(PGS, /^select id from chunks where tenant/, /^create index chunks_t1/) }
        ],
        note: 'A statement of a real service uses bound parameters, as the placeholders here show. The recording filled in the values from the program.'
      }),

      B.widget({ id: 'm4-pg-lab', kind: 'pgv', t: 1, src: 'rec', title: 'Lab: filters, settings and the size of an index in pgvector' }),

      B.cmp({
        id: 'm4-stores', t: 1, src: 'docs', title: 'Where vectors live',
        say: 'Job posts name many vector stores. Press Next to read them in four groups. They differ less in the idea than in what surrounds it: filters, hybrid search, scale, who runs it. I did not run these, so this is from their documentation, in broad strokes.',
        cols: ['Kind', 'Examples', 'Good for', 'Watch for'],
        hl: 2,
        rows: [
          ['A library', 'FAISS, hnswlib', 'Learning, offline jobs, a fixed index on one machine.', 'No server, no filters or updates of its own. You build those.'],
          ['A database extension', 'pgvector in PostgreSQL', 'Vectors next to the rows they describe, SQL filters, one system to run.', 'Index memory and build time at large sizes. Tune filters and settings.'],
          ['A vector database', 'Pinecone, Weaviate, Milvus, Qdrant, Chroma', 'Large collections, filters and updates built in, managed or self-hosted options.', 'Another system to run and secure, its own query language, and cost at scale.'],
          ['A search engine', 'OpenSearch, Elasticsearch', 'Keyword search and vectors in one place, mature operations.', 'Vector features and settings differ by version. Test recall and speed.']
        ],
        steps: [
          { upto: 1, say: 'A library is the way to learn and to test. This course used FAISS and hnswlib to measure recall. A library does not store, filter by role or update a single row for you.' },
          { upto: 2, say: 'pgvector keeps the vector in the row of the chunk. The filter on audience and current is a plain `where`, and a backup is a backup. Most teams should try it first if they already run Postgres.' },
          { upto: 3, say: 'A vector database adds what a library lacks: storage, filters on metadata, updates, replicas. Some offer hybrid search and managed hosting. You pay in another system and in its limits.' },
          { upto: 4, say: 'A search engine already does keyword search well, and it has vector fields. If your organisation runs one, it is a serious option, especially for hybrid search.' }
        ],
        pick: 'Choose by **filters, hybrid search, scale, the team that runs it, and cost**. Start with what you already operate, measure recall and speed on your data, and keep the embedding and the chunk labels portable so that a move is a rebuild, not a rewrite.'
      }),

      B.code({
        id: 'm4-search', t: 1, src: 'rec', title: 'Keyword, vector and hybrid search in one class', file: 'ragkit.py', lang: 'python', code: SRCH,
        steps: [
          { say: 'This class is the whole search of the course: BM25 for the words, the stand-in vectors for the meaning, and reciprocal rank fusion to combine them. It is small on purpose, so that you can see every part.', lines: null },
          { say: 'Reciprocal rank fusion gives each chunk `1 / (k + rank)` from each ranking and adds the scores. It uses only ranks, so the two rankings need no common scale. A chunk that is high in both lists wins.', lines: G.span(SRCH, /^def rrf/, /return order, score/) },
          { say: 'Building the search tokenises every chunk for BM25, and embeds every chunk for the vector side. BM25 is the classic keyword score: it likes words that are rare in the collection and frequent in the chunk.', lines: G.span(SRCH, /^class Searcher/, /self\.vecs = self\.emb\.embed/) },
          { say: 'A keyword ranking and a vector ranking. The vector score is a dot product, because the vectors have unit length. Each returns chunk ids, best first.', lines: G.span(SRCH, /def bm25_rank/, /return self\._order\(s, mask\)$/) },
          { say: 'The hybrid ranking fuses the top 50 of each. And look at `mask`: a function of a chunk that rejects it. A rejected chunk is never in the ranking at all. That is how a permission filter runs inside the search, which mission 5 measures.', lines: G.span(SRCH, /def hybrid_rank/, /return \[self\.ids\[i\] for i in idx/) }
        ],
        note: 'A real system would use the keyword search of the store, not rank-bm25 in memory. The shape is the same: two rankings, one fusion, one filter that runs before ranking.'
      }),

      B.cmp({
        id: 'm4-methods', t: 1, src: 'rec', title: 'Three searches, 24 questions',
        say: 'Here is the score of the three searches on the same 24 questions, with the recursive 500 chunks. Press Next to read the table. Hit at k means a right chunk is in the top k. MRR rewards a right chunk near the top. The vector side is the stand-in, so a neural model would move it.',
        cols: ['Method', 'hit@1', 'hit@3', 'hit@5', 'MRR@10', 'nDCG@10'],
        hl: 2,
        rows: ME.map(function (r) { return r.map(String); }),
        steps: [
          { upto: 1, say: 'Keyword search: a right chunk first for ' + ME[0][1] + ' of the questions, and in the top three for ' + ME[0][2] + '. Strong, because most Brewline questions repeat the words of the document.' },
          { upto: 2, say: 'The stand-in vector search: ' + ME[1][1] + ' at 1 and ' + ME[1][2] + ' at 3. It is weaker here, and a neural model would do better on questions that use other words than the document.' },
          { upto: 3, say: 'The hybrid, by reciprocal rank fusion: ' + ME[2][2] + ' at 3, the same as the keyword search, and a little below it at 1. It did not beat the best single method on this set. Hybrid search is a hedge: it protects you from the method that fails on a kind of question.' }
        ],
        pick: 'Do not choose a search from an average. Read the **kinds of question** next, and keep the questions where each method fails.'
      }),

      B.cmp({
        id: 'm4-kinds', t: 1, src: 'rec', title: 'The average hides the kind of question',
        say: 'The same 24 questions, split by kind, with hit at 3. Press Next to read the table. Eleven questions repeat the words of the document, and eight ask in other words.',
        cols: ['Kind', 'Questions', 'Keyword', 'Vector (stand-in)', 'Hybrid'],
        hl: 4,
        rows: ['words', 'meaning', 'number', 'code', 'table', 'stale'].map(function (k) { var h = BK['hit@3_by_kind'][k]; return [k, String(BK.questions_by_kind[k]), String(h['BM25 (keywords)']), String(h['vector (stand-in)']), String(h['hybrid (RRF)'])]; }),
        steps: [
          { upto: 1, say: 'Words: ' + BK.questions_by_kind.words + ' questions that use the words of the document. All three methods get every one, as you would expect.' },
          { upto: 2, say: 'Meaning: ' + BK.questions_by_kind.meaning + ' questions in other words, such as "reimbursed" for "refund". Here every method struggles: keyword ' + BK['hit@3_by_kind'].meaning['BM25 (keywords)'] + ', vector ' + BK['hit@3_by_kind'].meaning['vector (stand-in)'] + '. A neural model would help the vector side most.' },
          { upto: 5, say: 'Numbers, codes and one table. The vector search of the stand-in found the numbers and the code, and **missed the table question completely** (' + BK['hit@3_by_kind'].table['vector (stand-in)'] + '), where the keyword search got it. That is the flattened table of mission 2, felt in the search.' },
          { upto: 6, say: 'The stale question has a right answer in the new handbook and a wrong one in the old. All three found a right chunk, and in mission 5 you will see that the old chunk was there too.' }
        ],
        pick: 'Keep a **question set with kinds**, so that you can see which search fails which kind. A change that raises the average and breaks the table questions is not an improvement.'
      }),

      B.cmp({
        id: 'm4-expand', t: 2, src: 'rec', title: 'Adding words made every search worse',
        say: 'A common idea: expand the question with synonyms from a glossary before searching. I tried it, with the glossary of the Brewline files. Press Next for the result. It is a real measurement, and it surprised me.',
        cols: ['Method', 'hit@3 as asked', 'with glossary words', 'MRR@10 as asked', 'with glossary words'],
        hl: 2,
        rows: EX.map(function (r) { return r.map(String); }),
        steps: [
          { upto: 1, say: 'Keyword search fell from ' + EX[0][1] + ' to ' + EX[0][2] + ' at 3, and its MRR from ' + EX[0][3] + ' to ' + EX[0][4] + '. Extra words add matches in the wrong chunks.' },
          { upto: 3, say: 'The vector side and the hybrid fell too. The extra words pull each query toward the glossary and the till-money chunks, which share those words, and away from the answer.' }
        ],
        pick: 'Query rewriting is a **change that needs a score**, like any other. It can help a vague question and hurt a clear one. Measure it on your question set, by kind, before it ships.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'Your embedding model returns vectors of length 1, and your index uses the dot product. Which statement is true?',
        opts: [
          { t: 'The dot product gives the same ranking as the cosine similarity, because the lengths are 1', fb: '' },
          { t: 'The dot product ranks longer vectors higher in this case', fb: 'All the vectors have the same length here, so length cannot decide the order.' },
          { t: 'You must switch to Euclidean distance', fb: 'For unit vectors it gives the same ranking, so no switch is needed.' },
          { t: 'The index cannot be used with unit vectors', fb: 'Unit vectors are the common case.' }
        ],
        ok: 0, why: 'For vectors of length 1, cosine similarity equals the dot product, and Euclidean distance is a function of it, so the three rank the same way. In the recording, all 24 questions got the same top 10 from cosine, dot product and distance.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'In an HNSW index you raise `efSearch` from 8 to 64 with M of 16. What happens?',
        opts: [
          { t: 'Recall rises (' + hn(16, 8)[2] + ' to ' + H16[2] + ' in the recording), and each query computes more distances', fb: '' },
          { t: 'Recall falls, and queries get faster', fb: 'More candidates means more work and a better chance of finding true neighbours.' },
          { t: 'Nothing changes until you rebuild the index', fb: 'efSearch is a query-time setting. No rebuild is needed.' },
          { t: 'The index gets smaller', fb: 'The size of the index depends on M and the data, not on efSearch.' }
        ],
        ok: 0, why: 'efSearch is the size of the candidate list while the search walks. A bigger list explores more of the graph. In the recording, the work grew from ' + hn(16, 8)[3] + ' to ' + H16[3] + ' distance computations a query, and the recall from ' + hn(16, 8)[2] + ' to ' + H16[2] + '.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'A query asks pgvector for `limit 100` with the default `hnsw.ef_search` of 40. How many rows come back?',
        opts: [
          { t: PL.rows_with_ef_search_40 + ', because the index cannot return more candidates than its list holds', fb: '' },
          { t: '100, because that is the limit', fb: 'The limit is an upper bound. The candidate list caps the result.' },
          { t: 'None, because the query is invalid', fb: 'It is valid, and it returns a short result silently.' },
          { t: '4, one for each tenth of the limit', fb: 'There is no such rule.' }
        ],
        ok: 0, why: 'The index returns at most `ef_search` candidates. A larger limit gives a short answer, with no error. The recording got ' + PL.rows_with_ef_search_40 + ' rows with 40 and ' + PL.rows_with_ef_search_200 + ' with 200. Set `hnsw.ef_search` to at least the limit.'
      }),

      B.quiz({
        id: 'm4-q4', t: 1,
        q: 'A new store tenant owns 1 percent of the rows, and its users see almost no results from the assistant. Larger tenants are fine. The query has `where tenant = 1`. What is the cause?',
        opts: [
          { t: 'The index returns its nearest candidates first and the filter then removes the rows of other tenants, leaving about ' + PF[0][2] + ' of 10', fb: '' },
          { t: 'The small tenant has no embeddings', fb: 'It has rows. They are just rarely among the nearest candidates.' },
          { t: 'Postgres is slow for small tenants', fb: 'The problem is the number of rows returned, not speed.' },
          { t: 'The vectors of small tenants are shorter', fb: 'All vectors have the same length.' }
        ],
        ok: 0, why: 'A filter after the index scan throws away most of a small tenant\'s candidates. In the recording tenant 1 got ' + PF[0][2] + ' rows on average. Iterative scan returned ' + PF[0][3] + ' and a recall of ' + PF[0][4] + '. A partial index or a separate index for a small tenant are the other repairs.'
      }),

      B.quiz({
        id: 'm4-q5', t: 2,
        q: 'Compressing an IVF index with product quantisation to 8 bytes for each vector saved the most memory. What did the recording show?',
        opts: [
          { t: 'The recall at 10 fell to ' + PQ[0][2] + ', and a version with 32 bytes reached ' + PQ[2][2], fb: '' },
          { t: 'The recall stayed at 1.0 because compression is lossless', fb: 'Product quantisation is lossy by design.' },
          { t: 'The index became larger', fb: 'It became much smaller: 8 bytes of vector data instead of ' + SZ[0][1] + '.' },
          { t: 'The recall rose, because noise is removed', fb: 'The recall fell.' }
        ],
        ok: 0, why: 'Compression trades recall for memory. At 8 bytes the recall at 10 was ' + PQ[0][2] + ', at 16 bytes ' + PQ[1][2] + ', and at 32 bytes ' + PQ[2][2] + ', on made-up clusters. Measure on your data, and rerank the survivors with the exact vectors if you compress.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps of setting up a vector search in order.',
        items: [
          'Choose the embedding model with a test on your own questions',
          'Embed the chunks and store the vectors with their ids, labels and the model name',
          'Load all the rows, then build the index',
          'Run an exact search as the truth for a sample of queries',
          'Set `efSearch` or `nprobe` so that the recall meets your target',
          'Decide how filters run: inside the search, with a check on small groups',
          'Record the settings and re-test when the data or the model changes'
        ],
        why: 'The model decides what the vectors mean, so it comes first. The exact search is the only way to know the recall, so keep it as the test. Filters need their own check, because the average recall hides the small groups.'
      }),

      B.bug({
        id: 'm4-bug', t: 2, src: 'docs', q: 'This index and query are meant to use the same cosine distance. The query is slow and the plan shows a full table scan. Click the line that is wrong.',
        file: 'search.sql', lang: 'sql', code: BUG1, bad: [5],
        hint: 'An index serves one distance operator.',
        why: 'The index was built with `vector_cosine_ops`, which serves the cosine distance operator `<=>`. The query orders by `<->`, the Euclidean distance, so the planner cannot use the index and reads every row. The operator in the query must match the operator class of the index.',
        fix: FIX1,
        cheer: 'Match the operator to the index.'
      }),

      B.bug({
        id: 'm4-bug2', t: 1, q: 'This search ran well for months. After a model upgrade, answers got worse and nothing failed. Click the line that causes it.',
        file: 'search.py', lang: 'python', code: BUG2, bad: [4],
        hint: 'Which model made the vectors in the index?',
        why: 'The index holds vectors from `embed-v1`. Line 4 embeds the question with `embed-v2`. If the two models give vectors of different lengths, the search raises an error, which is the lucky case. If they give the same length, it runs and returns neighbours that mean nothing. Record the model name with the index and refuse a query from another model.',
        fix: FIX2,
        cheer: 'One model per index, checked in code.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: where do the Brewline vectors live?',
        scenario: 'Brewline has 87 chunks in this course, and about 60,000 once all documents are in. It may reach 2 million within two years. The team runs PostgreSQL for orders and knows it well. Every query needs a filter on audience and on the current version, and the team wants keyword and vector search together.',
        opts: [
          { t: 'A dedicated vector database from day one', d: 'Built for the job and ready for scale.', lose: 'Another system to run, secure and pay for, before the data needs it. The filters and the labels still have to be copied and kept in sync with the source.' },
          { t: 'pgvector in the existing PostgreSQL, with an exit plan', d: 'The vector sits in the row of the chunk. The filters are `where` clauses. Keyword search is available in Postgres too. One backup, one set of access rules.' },
          { t: 'A library in the application, saving the index to a file', d: 'The cheapest to start.', lose: 'No filters, no updates of single rows and no access control of its own. Every restart reloads the file, and a second server needs its own copy.' }
        ],
        pick: 1,
        why: 'At 60,000 chunks, pgvector with an HNSW index is comfortable, and the filters are the strongest argument: audience and current are columns in the same row. The exit plan is that the vectors, the model name and the labels are plain data, so a move to a dedicated store is a rebuild.',
        when: 'Move to a dedicated store, or a search engine, when index size and build time outgrow the database, when you need features that Postgres lacks, or when another team must own the search.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the new store gets "nothing relevant"', time: '10:15',
        alert: '**Users of the new Haarlem store, a small tenant, keep getting "I found nothing relevant" from the assistant.** The big stores are fine. The tenant owns about 1 percent of the rows. The query is `where tenant = 1 order by embedding <=> $1 limit 10`, with the default `hnsw.ef_search` of 40 and no iterative scan.',
        clues: ['Only the small tenant is affected', 'In the recording, tenant 1 got ' + PF[0][2] + ' rows of 10 on average', 'The index returns 40 candidates, and the filter removes most of them', 'Recall is measured on the whole table, not for each tenant'],
        opts: [
          { t: 'Enable iterative scan, or give the small tenant a partial index, and add a test that checks the result count for each tenant size', fb: '' },
          { t: 'Raise `limit` to 1000', fb: 'A larger limit does not give more rows than the candidate list holds, and it makes the prompt bigger.' },
          { t: 'Lower the similarity threshold of the assistant', fb: 'There is nothing to threshold: too few rows come back at all.' },
          { t: 'Move every tenant to exact search', fb: 'It works and costs speed for every query. A partial index or iterative scan fixes the small tenant without that.' }
        ],
        best: 0,
        why: 'The approximate index looks at a short list of nearest rows across the whole table, and the filter then removes the rows of other tenants. A small tenant owns few of them. Iterative scan keeps scanning until it has enough rows, and a partial index builds a small graph for that tenant alone. A test that counts results for each tenant size catches this class of failure.',
        checks: [
          ['Count the rows', 'Run the query for the small tenant and count the rows. Fewer than the limit is the sign.'],
          ['Check the plan', 'Run EXPLAIN. Is the index used, and where does the filter apply?'],
          ['Fix it', 'Set `hnsw.iterative_scan` to relaxed order, or create a partial index for the tenant.'],
          ['Measure', 'Compute recall for each tenant against an exact search, as well as for the whole table.'],
          ['Guard', 'Add a test that fails when a tenant gets fewer rows than the limit.']
        ],
        tell: 'A small tenant kept getting "nothing relevant". Its filter removed most of the candidates of the HNSW index, so it got about four rows of ten, and in the smallest case almost none. I turned on iterative scan, which brought it to ten rows with a recall near 0.98, and I weighed a partial index for tenants of that size. I added a test that fails when any tenant gets fewer results than the limit, and I measure recall for each tenant as well as overall.',
        prevent: ['Measure **recall for each tenant or group** as well as overall', 'Test the **number of rows** returned for the smallest group', 'Know where the **filter runs** in your store', 'Use **partial indexes** or iterative scan for small groups']
      }),

      B.qa({
        id: 'qa-embmodel', t: 1, tag: 'Vectors', secs: 60,
        q: 'How do you choose an embedding model?',
        pts: ['Languages and domain of your documents', 'Maximum input length and the chunk size', 'Dimensions: storage, speed and quality', 'Public benchmarks as a shortlist only', 'Your own questions decide', 'Cost, hosting, and a plan for changing the model'],
        short: 'I start with what the documents need: the languages, the domain, and the length of a chunk, because every model has a maximum input. Then I look at the dimensions, since a longer vector costs more to store and search, and at the cost and the hosting: an API of a provider or a model I run myself.\n\nFor a shortlist I can use public benchmarks, and I treat them as a hint, because they use other data. The decision comes from a test on my own questions: I embed my chunks with each candidate, run the retrieval, and compare hit at 3 and MRR, by kind of question.\n\nI also plan for change. The index records the model name, a query is refused if it uses another model, and a new model means a new index built beside the old one. That makes the choice reversible and cheap to revisit.',
        fu: [
          ['Is a bigger vector always better?', 'No. It costs more memory and time, and the gain can be small. I test a smaller size and compare the scores.'],
          ['What about a model for each language?', 'A multilingual model is simpler if its scores hold. Otherwise I may route by language, with one index for each.']
        ],
        trap: 'Choosing the top model of a leaderboard without a test on your own data.',
        real: 'Describe how you compared two embedding models and what decided it.'
      }),

      B.qa({
        id: 'qa-hnsw', t: 1, tag: 'Vectors', secs: 60,
        q: 'Explain HNSW and its main settings.',
        pts: ['A graph in layers, each node linked to near neighbours', 'The top layer is sparse with long links', 'A query enters at the top and walks down', 'M: links for each node. efConstruction: candidates while building', 'efSearch: candidates while searching, the recall knob', 'More recall costs more work, and memory for the links'],
        short: 'HNSW is a graph index. Every vector is a node with links to near neighbours, arranged in layers: the top layer has few nodes and long links, the lower layers have more and shorter ones. A query enters at the top, moves to the nearest node it can find, drops a layer, and repeats until the bottom, keeping a list of the best candidates as it goes.\n\nThree settings matter. M is how many links each node keeps, which raises recall and memory. efConstruction is how many candidates the build keeps, which makes a better graph and a slower build. efSearch is how many candidates a query keeps, and it is the knob I turn at query time to trade recall against work.\n\nIn my recording, with M of 16, an efSearch of 8 gave a recall of 0.72 and 64 gave 0.995, at about two percent of the work of an exact search. The graph also costs memory: the index was larger than the table.',
        fu: [
          ['How do deletes work?', 'Often a delete only hides the point, and the graph keeps it until a rebuild. In my test the element was gone from results and still counted in the index.'],
          ['When would you not use it?', 'When memory is tight, then IVF with compression, or when the data is small enough for an exact search.']
        ],
        trap: 'Saying that HNSW is exact. It is approximate, and recall must be measured.',
        real: 'Describe how you tuned efSearch against a recall target.'
      }),

      B.qa({
        id: 'qa-ivf', t: 1, tag: 'Vectors', secs: 60,
        q: 'IVF or HNSW: how do you choose?',
        pts: ['IVF: lists around learned centres, read the nearest nprobe', 'HNSW: a graph, usually better recall for the work', 'IVF trains on a sample, so build it after loading', 'IVF combines well with compression to save memory', 'HNSW costs more memory and build time', 'Decide with recall, latency and memory measured on your data'],
        short: 'IVF cuts the data into lists around centres that it learns from a sample. A query finds the nearest centres and compares only inside those lists, and nprobe is how many lists it reads. HNSW walks a graph.\n\nIn my recording, HNSW reached a recall of 0.995 at about two percent of the work, and IVF reached 0.988 at eight lists and about three and a half percent. The graph is usually a little better for recall against work, and it costs more memory for the links and more build time. IVF needs training on a sample, so I build it after the data is loaded, and it combines well with product quantisation, which cut the bytes for each vector sharply and, in my test, the recall too.\n\nSo I choose with three measurements on my own data: recall, latency and memory. With plenty of memory I start with HNSW. When memory is the limit, I try IVF with compression and rerank with the exact vectors.',
        fu: [
          ['What is the risk of building IVF too early?', 'The centres come from the rows that exist. The documentation advises building after loading. My test did not show a loss on easy clusters, so I would measure on real data.'],
          ['What is product quantisation?', 'A way to store each vector as a few bytes by coding parts of it. It saves memory and loses recall, so I rerank with exact vectors.']
        ],
        trap: 'Picking one by reputation. The numbers depend on your vectors and your memory.',
        real: 'Describe a recall, latency and memory trade-off you measured.'
      }),

      B.qa({
        id: 'qa-hybrid', t: 1, tag: 'Vectors', secs: 60,
        q: 'Why do you combine keyword and vector search, and how do you fuse them?',
        pts: ['Keywords are exact on codes, names and numbers', 'Vectors catch other words with the same meaning', 'Each fails where the other works', 'Fuse the ranks with reciprocal rank fusion', 'No score scaling is needed', 'Weights and k are tuned on your questions'],
        short: 'Each search fails where the other works. Keyword search is exact on product codes, names, numbers and the words of the document, and it fails when the question uses other words. Vector search finds text with the same meaning in other words, and it can lose a code or a flattened table. In my recording the stand-in vector search missed the table question that the keyword search got, and the keyword search missed the "reimbursed" question that the vector search ranked ninth.\n\nTo fuse them I use reciprocal rank fusion: each chunk gets one over a constant plus its rank from each list, and the scores add up. It uses only ranks, so I do not need to scale two different score types. A chunk high in both lists wins.\n\nFusion is a hedge, not a promise. On my set it did not beat the best single method. I tune the constant, and maybe weights, by kind of question on my evaluation set.',
        fu: [
          ['Does hybrid always win?', 'No. On my 24 questions it matched the best single method. It protects against the one that fails on a kind of question.'],
          ['What is the constant k for?', 'It softens the top ranks. A small k makes first place count much more than second.']
        ],
        trap: 'Adding a vector search to a keyword search without a score. You may make it worse.',
        real: 'Describe a kind of question where one search failed and the other worked.'
      }),

      B.qa({
        id: 'qa-vecdb', t: 1, tag: 'Vectors', secs: 60,
        q: 'pgvector or a dedicated vector database?',
        pts: ['pgvector: vectors in the row, SQL filters, one system', 'Dedicated: scale, built-in filters and updates, managed options', 'Decide by size, filters, hybrid search and who runs it', 'Measure recall and speed on your data', 'Keep vectors, labels and model name portable', 'Start with what you operate'],
        short: 'It depends on size, filters, hybrid search and who will run it, and I decide with a measurement. pgvector keeps the vector in the row of the chunk, so the filters on audience and version are plain SQL, there is one backup and one set of access rules, and a team that knows Postgres can run it. It is a strong first choice up to a few million vectors if the index memory fits.\n\nA dedicated vector database makes sense when the collection is large, when I need built-in filtering and updates at scale, when another team owns the search, or when a managed service saves me operating work. The cost is another system to secure and pay for.\n\nEither way I keep the vectors, the labels and the model name as plain data, so that moving is a rebuild. I test recall and speed with my own vectors and filters before I commit.',
        fu: [
          ['What would make you leave pgvector?', 'Index build time and memory beyond what the database can hold, or a feature that I need and Postgres lacks.'],
          ['What about a search engine?', 'If the company already runs one and I need strong keyword search with vectors, it is a good option, and I test its vector settings.']
        ],
        trap: 'Choosing a tool by popularity. Each choice carries an operating cost.',
        real: 'Describe a store you chose and the measurements behind it.'
      }),

      B.qa({
        id: 'qa-filter', t: 2, tag: 'Vectors', secs: 60,
        q: 'How do you do filtered vector search, for example by permission, without losing results?',
        pts: ['The filter must run inside the search', 'A filter after the index scan can empty a small group', 'Options: iterative scan, partial or separate indexes, pre-filtering', 'Exact search is fine for a small group', 'Measure recall and result count for each group', 'Test the smallest group'],
        short: 'The filter must be part of the search, so that a chunk that may not be read is never a candidate, and it must not empty a small group. In an approximate index, the nearest candidates are found first, and a filter that runs after that throws most of a small group\'s candidates away.\n\nIn my pgvector test, a tenant with one percent of the rows got about four of ten rows back, and the smallest case almost none. I have three repairs. Iterative scan keeps scanning until enough rows survive, and it gave ten rows with a recall near 0.98. A partial or separate index builds a small graph for the small group. For a very small group, an exact search over its rows is fast and perfect.\n\nI measure the number of rows and the recall for each group as well as the average, and I add a test for the smallest group.',
        fu: [
          ['What about filtering after the search?', 'It is safe and lossy: the restricted chunks use up places, and the answer gets fewer chunks. In the recording that left 18 of 120 places empty for a manager.'],
          ['How do you handle thousands of tenants?', 'A partition or a filter column with an index, not an index for each tenant, and a test on the smallest ones.']
        ],
        trap: 'Filtering the top ten after the search and calling it secure. It is secure and it loses answers.',
        real: 'Describe how you found and fixed a filter that returned too few rows.'
      }),

      B.qa({
        id: 'qa-quant', t: 3, tag: 'Vectors', secs: 60,
        q: 'What is quantisation of embeddings, and when would you use it?',
        pts: ['Store each number in fewer bits: 8-bit integers, or one bit', 'Memory and speed gain, recall loss', 'Search the compact vectors, then rerank the best with full precision', 'Some models allow cutting the number of dimensions', 'Measure recall on your own questions', 'Recorded stand-in: recall held on 24 questions, which proves little'],
        short: 'Quantisation stores each number of a vector in fewer bits: 32-bit floats become 8-bit integers, or a single bit. The memory and the speed improve a lot, and the recall can fall, so I measure it on my own questions before I accept it. In my recording, with the stand-in vectors, the hit at 5 stayed the same at 8, 16 and 32 bits, and I treat that as weak evidence, since 24 questions and a stand-in prove little.\n\nThe usual pattern is two stages: search the compact vectors to get a larger set of candidates, for example fifty, and rerank those with the full-precision vectors, which restores most of the recall. Some embedding models are trained so that their vectors can be cut to fewer dimensions with a small loss, which is documented for those models and must be tested.\n\nI use it when memory or cost is the limit, as with tens of millions of vectors, and I keep the full vectors in cheaper storage for the rerank.',
        fu: [
          ['What is product quantisation?', 'A different method that codes parts of a vector with a small codebook. In my recording it cut the bytes sharply and the recall at 8 bytes fell to 0.129.'],
          ['How do you pick the number of candidates?', 'Raise it until the recall after the rerank meets the target, and look at the latency that it costs.']
        ],
        trap: 'Quantising to save memory without measuring recall.',
        real: 'Describe a memory saving that you measured against recall.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Vector Navigator', color: '#A7F3D0',
        pts: [
          'An **embedding** is a fixed-length vector from a model. With **unit length**, cosine, dot product and distance rank the same.',
          '**Exact search** is right and slow at scale. **HNSW and IVF** trade a little recall for much less work, and **efSearch and nprobe** are the knobs.',
          '**pgvector** keeps vectors in a row. A **limit above ef_search** returns fewer rows, and a **filter after the scan** can empty a small group.',
          '**Keyword and vector search** fail on different questions. **Reciprocal rank fusion** combines the ranks and is a hedge, not a promise.',
          '**One model, one index.** Record the model name, refuse a query from another model, and build a new index for a new model.'
        ],
        lines: [
          'I measure recall against an exact search before I tune.',
          'I test the smallest group as well as the average.',
          'I score a search by kind of question.'
        ]
      })
    ]
  });
  function fmtN(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
})();
