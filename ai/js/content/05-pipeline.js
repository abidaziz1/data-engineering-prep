/* Mission 5: the RAG ingestion pipeline. The ingestion code (ids from a hash, only new chunks embedded, deletes, label updates, a filter inside the
   search) was run six times on the 59 Brewline documents, and the counts, the stale chunks in the top five and the leak of restricted chunks were
   recorded. The embedder is a stand-in. How to schedule and orchestrate the run comes from documentation and common practice. */
(function () {
  var B = LAB.b, G = LAB.get;
  var IN = G.file('code/ingest.py'), AL = G.file('pipeline/alias.json');
  var PR = G.table('pipeline.runs').rows, PN = G.counts('pipeline.notes'), ST = G.counts('search.stale'), AC = G.counts('search.acl'), EV = G.counts('embed.versions');
  G.expect(PR.length === 6 && PR[0][5] === 87 && PR[1][5] === 0 && PR[1][3] === 87 && PR[2][5] === 1 && PR[4][6] === 1 && PR[5][6] === 1, 'the six ingestion runs');
  G.expect(PN.glossary_chunks_deleted === 3 && PN.glossary_hits_after_delete === 0 && PN.faq_chunks_visible_to_staff_after === 0 && PN.faq_chunks_visible_to_managers_after === 2 && PN.current_only_hits_from_handbook_v2 === 0, 'deletes and labels');
  G.expect(ST['hybrid (RRF)'].questions_with_a_v1_chunk_in_top5 === 12 && ST['BM25 (keywords)'].questions_with_a_v1_chunk_in_top5 === 9 && ST['vector (stand-in)'].questions_with_a_v1_chunk_in_top5 === 16, 'stale chunks in the top five');
  G.expect(AC.restricted_chunks_in_top5_no_filter === 18 && AC.restricted_chunks_in_top5_filter_inside_search === 0 && AC.questions_with_a_leak === 10 && AC.questions === 24, 'the permission leak');
  G.expect(PN['hit@3_old_model_index'] === 0.75 && PN['hit@3_new_model_index'] === 0.833, 'the two indexes of the alias switch');
  var BUG1 = [
    'import uuid',
    '',
    'def add_chunks(doc_id, chunks):',
    '    for text in chunks:',
    '        chunk_id = str(uuid.uuid4())',
    '        store.insert(chunk_id, doc_id, text, embed(text))'
  ].join('\n');
  var FIX1 = [
    'import hashlib',
    '',
    'def add_chunks(doc_id, chunks, model_id):',
    '    for text in chunks:',
    '        chunk_id = doc_id + ":" + hashlib.sha256((model_id + "|" + text).encode()).hexdigest()[:10]',
    '        if not store.has(chunk_id):',
    '            store.insert(chunk_id, doc_id, text, embed(text))'
  ].join('\n');
  var BUG2 = [
    'def search(question, role, k=5):',
    '    hits = index.query(embed(question), top_k=k)',
    '    return [h for h in hits if h.audience in ROLES[role]]'
  ].join('\n');
  var FIX2 = [
    'def search(question, role, k=5):',
    '    return index.query(embed(question), top_k=k,',
    '                       filter={"audience": {"$in": ROLES[role]}, "current": True})'
  ].join('\n');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'RAG pipelines you can run twice', short: 'Pipeline', blurb: 'Ids from hashes, incremental runs, deletes, labels, access, and a safe switch to a new index', minutes: 52,
    focus: ['snap', 'int', 'qual'],
    goals: [
      'Say what makes an ingestion run **safe to repeat**, and what it costs when it is not.',
      'Give every chunk **an id from its text**, embed **only the new ones**, and **delete** what is gone.',
      'Update **labels** without paying for embeddings.',
      'Run the **permission filter inside the search**, and show what leaks when it runs after.',
      'Switch to a **new index** by moving an alias, and go back with one write.',
      'Say what to **watch** in a pipeline that feeds an assistant.'
    ],
    say: 'Mission 5 is the data engineering core of a retrieval system. The question is not whether the pipeline runs once. It is whether it runs again tomorrow without doing the work twice, without leaving old text behind, and without showing a manager the finance files. I ran the same ingestion code six times on the 59 Brewline documents and counted the embeddings, the deletes and the leaks. The embedder is a stand-in, so a computed embedding here stands for a billed call there.',
    scenes: [
      B.talk({
        id: 'm5-talk', t: 1, src: 'docs', title: 'What an ingestion pipeline must do',
        say: 'A pipeline that works once is a script. Press Next for the six properties that make it a pipeline, and the symptom when each one is missing.',
        items: [
          ['Idempotent', 'Running it twice leaves the index as it was after the first run. Without it, every retry and every nightly run makes duplicates, and the same chunk appears five times in a prompt.', 'Run it twice, get the same index.'],
          ['Incremental', 'It does work in proportion to the change. A file that did not change costs a hash and nothing else. Without it, the embedding bill is the size of the whole collection, every night.', 'Pay for the change, not the collection.'],
          ['Deleting', 'A document that is removed or that loses a section must leave the index, with its vectors. Without it, an old policy keeps answering questions after the file is gone.', 'A delete is a run too.'],
          ['Label-aware', 'A change of audience or of the current flag updates the rows and costs no embedding, because the text did not change. Without it, a permission change waits for a full rebuild, or never reaches the index.', 'A label is not a reason to embed.'],
          ['Safe to change', 'A new embedding model, a new chunker or a new prompt template builds a second index beside the first. A switch moves one pointer. Without it, a change is a risky edit of the live index.', 'Build beside, then switch.'],
          ['Observable', 'It reports what it did: documents, chunks added, unchanged and removed, embeddings computed, failures by reason, and how old the newest data is. Without it, nobody knows the index is stale until a user does.', 'You cannot fix what you cannot count.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm5-flow', t: 1, src: 'docs', title: 'The whole ingestion pipeline', g: 'ingest', legend: true,
        steps: [
          { say: 'This is the complete pipeline of the assistant. You saw the first half in mission 2. Now follow a changed file through all of it. Press Next.', cap: 'A raw file becomes a live index.' },
          { say: 'Steps 1 to 3. The file is parsed, cleaned and labelled, and it leaves with a record that holds its hash, its audience and its version.', on: ['i1', 'i2'], focus: ['n_files', 'n_parse', 'n_clean'], cap: 'Parse, clean, label.' },
          { say: 'Step 3 and 4. The text is chunked. Each chunk gets an id that is a hash of the model name and the text. The same text gives the same id on every run, and that single choice makes everything after it cheap.', on: ['i3', 'i4'], focus: ['n_chunk', 'n_hash'], cap: 'The id comes from the text.' },
          { say: 'Step 5. The pipeline reads the state table: which chunk ids does this document already have in the index? Only the ids that are not there are new. A chunk that is unchanged keeps its vector.', on: ['i5', 'i8', 'i10'], focus: ['n_hash', 'n_state', 'n_new'], cap: 'Only the new chunks go on.' },
          { say: 'Steps 6 and 7. The new chunks are embedded, and written to the index with their labels. A chunk that the document no longer has is deleted from the index. One sentence changed in the recording, and exactly one chunk was embedded.', on: ['i6', 'i7'], focus: ['n_new', 'n_embed', 'n_index'], cap: 'Embed the new, write the index.' },
          { say: 'Step 8. A deleted document is a run of its own: its chunks leave the index and the state table. In the recording, a glossary was removed, and **' + PN.glossary_chunks_deleted + '** chunks left with it.', on: ['i9'], focus: ['n_del', 'n_state'], cap: 'A delete leaves nothing behind.' },
          { say: 'Step 9. When the whole index is rebuilt, for a new model or a new chunker, it is built beside the live one. An alias says which index is live. Moving the alias is the release.', on: ['i11'], focus: ['n_index', 'n_alias'], cap: 'The alias is the release.' }
        ]
      }),

      B.code({
        id: 'm5-ingest', t: 1, src: 'rec', title: 'The ingestion code', file: 'ingest.py', lang: 'python', code: IN,
        steps: [
          { say: 'This is the code that ran six times. It stores chunks in SQLite, and searches with numpy, so that every step can be read. A real system uses a vector store for the search, and keeps the same four rules for what goes in. They are in the docstring.', lines: null },
          { say: 'A chunk is named by what it says: the document, then a hash of the model id and the text. Change one character, and it is another chunk. Change the model, and every chunk is another chunk, which is what a new index needs.', lines: G.span(IN, /^def chunk_id/, /return doc_id \+ ':'/) },
          { say: 'Two tables. `documents` holds the hash of the text and the labels of each document. `chunks` holds each chunk with its vector, the model id, and a copy of the labels, so a filter never needs a join.', lines: G.span(IN, /^SCHEMA = /, /^"""$/) },
          { say: 'First check: has this document changed? If its hash and its labels are the same as the stored ones, the run counts its chunks as unchanged and moves on. This is the line that makes the second run cost nothing.', lines: G.span(IN, /row = store\.db\.execute\('select content_hash/, /continue/) },
          { say: 'Otherwise the pipeline works out which chunk ids it wants, which ones it has, and which are new. Only the new ones are embedded. In the recording, one changed sentence meant one new chunk and one embedding.', lines: G.span(IN, /existing = \{r\[0\]/, /stats\['embedded'\] \+= len\(new\)/) },
          { say: 'The new chunks are inserted with their vectors and labels. A chunk that the document no longer contains is deleted. That is how an edit and a removed paragraph both reach the index.', lines: G.span(IN, /for i, v in zip\(new, vecs\)/, /stats\['chunks_removed'\] \+= 1/) },
          { say: 'Labels are updated for all chunks of the document with one statement, and no embedding. The last line stores the new hash. A delete of a whole document is its own function, and it removes the chunks.', lines: G.span(IN, /store\.db\.execute\('update chunks set audience/, /^def delete_document/) },
          { say: 'The search is where the labels pay off. The `where` clause keeps only chunks of the current version and of the audiences that this person may read, **before** any ranking. A chunk that may not be read is never a candidate.', lines: G.span(IN, /^def search/, /return \[\(rows\[i\]\[0\]/) }
        ],
        note: 'SQLite and a numpy scan are enough for tens of thousands of rows. The ideas move to any store: an id from a hash, a state table, deletes, labels on every row, and a filter inside the query.'
      }),

      B.widget({ id: 'm5-pipeline-lab', kind: 'pipeline', t: 1, src: 'rec', title: 'Lab: six runs, an alias switch, and mixing models' }),

      B.rows({
        id: 'm5-runs', t: 1, src: 'rec', title: 'The six runs, as a table',
        steps: [
          {
            say: 'The same six runs in one table, as the pipeline reported them. This is the report that a nightly job should write: it is also what an alert reads. Look for the shape: one big run, then almost nothing.',
            tabs: [{ layer: 'RUNS', name: 'What each run did', c: 'stg', cols: G.table('pipeline.runs').cols, rows: PR.map(function (r) { return r.map(String); }), trk: 5 }],
            notes: ['Run 4 deletes a document through its own function, so the chunks of the glossary left the index with a separate call. Its report line shows no chunk removed because the call removed them before the run counted. A real pipeline logs both calls.']
          }
        ]
      }),

      B.widget({ id: 'm5-acl-lab', kind: 'acl', t: 1, src: 'rec', title: 'Lab: where the permission filter runs' }),

      B.cmp({
        id: 'm5-stale', t: 1, src: 'rec', title: 'Old chunks in the top five',
        say: 'The handbook has an old and a new version, and I asked 24 questions with no filter on the version. Press Next to count how many questions had a chunk of the old handbook among their top five. Then switch the filter on.',
        cols: ['Method', 'Questions with an old-version chunk in the top 5', 'With the current-only filter'],
        hl: 1,
        rows: ['BM25 (keywords)', 'vector (stand-in)', 'hybrid (RRF)'].map(function (m) { return [m, ST[m].questions_with_a_v1_chunk_in_top5 + ' of 24', ST[m].with_current_only_filter + ' of 24']; }),
        steps: [
          { upto: 1, say: 'Keyword search: ' + ST['BM25 (keywords)'].questions_with_a_v1_chunk_in_top5 + ' of 24. The old handbook shares most of its words with the new one, so it scores almost the same.' },
          { upto: 2, say: 'The stand-in vector search: ' + ST['vector (stand-in)'].questions_with_a_v1_chunk_in_top5 + ' of 24. Vectors cannot see a number that changed from 30 to 14. The two texts are nearly the same point.' },
          { upto: 3, say: 'The hybrid: ' + ST['hybrid (RRF)'].questions_with_a_v1_chunk_in_top5 + ' of 24. With the filter `current = true` inside the search, the count is **0** for all three. A model cannot tell which chunk is newer. A label can.' }
        ],
        pick: 'Put `current` on **every chunk**, filter on it **inside the search**, and add an evaluation question that has an old and a new answer.'
      }),

      B.code({
        id: 'm5-alias', t: 1, src: 'rec', title: 'A release is a pointer', file: 'alias.json', lang: 'json', code: AL,
        steps: [
          { say: 'This small file is the release of an index. `live` names the index that serves every query. Changing it is one small write, and it is the only thing that changes when you ship a new index.', lines: G.span(AL, /"live"/, /"live"/) },
          { say: '`previous` keeps the old index in place. Going back is the same write in the other direction, so a bad release is a minute of work, not a rebuild.', lines: G.span(AL, /"previous"/) },
          { say: '`model_id` records the embedding model of the live index. A query must use the same model, so the service reads this field and refuses anything else.', lines: G.span(AL, /"model_id"/) },
          { say: '`switched_after` is the evidence: the hit at 3 of the new index, ' + PN['hit@3_new_model_index'] + ', against ' + PN['hit@3_old_model_index'] + ' for the old one on the same 24 questions. A switch needs a number, and the number belongs in the record.', lines: G.span(AL, /"switched_after"/) }
        ],
        note: 'The two indexes differ in embedding model here: 64 dimensions against 48. A rebuild embedded ' + PN.rebuild.chunks_embedded + ' chunks for ' + PN.rebuild.documents + ' documents. Keep the old index for a day or so, and delete it when you are sure.'
      }),

      B.talk({
        id: 'm5-orch', t: 1, src: 'docs', title: 'Running it for real: schedule, events and failures',
        say: 'The code above is one function. In production it runs inside an orchestrator, on a trigger, with a plan for failure. This is documentation-level advice, and it holds for Airflow, Dagster, Prefect, a cloud workflow or a cron job. Press Next for each point.',
        items: [
          ['Trigger', 'Run on a schedule, or when a file lands, or both: an event starts the run for that one file, and a nightly sweep catches what an event missed. Because the run is idempotent, both can overlap safely.', 'Events for speed, a sweep for safety.'],
          ['One task for each document', 'Split the work by document, so that one broken PDF fails one task, and the rest of the run goes on. A single task for the whole folder fails everything when one file is bad.', 'A bad file should cost one file.'],
          ['Retries and a quarantine', 'Retry transient errors, such as a rate limit from the embedding API, with a delay that grows. Send a file that fails the same way three times to a quarantine folder with the reason, and alert a person. Never retry forever.', 'Retry the transient, quarantine the rest.'],
          ['Batch the embeddings', 'Send many chunks in one request to the embedding service, within its limits, and cap the number of requests in flight. The recorded SDK defaults retry twice, which is not enough for a bulk job and too much for a live one.', 'Batch, cap, back off.'],
          ['Report', 'Every run writes documents, chunks added, unchanged and removed, embeddings computed, failures by reason, and the age of the newest data. Alert on a run that did far more or far less than usual, and on a freshness lag beyond what the business accepts.', 'A run that does nothing is also news.'],
          ['Backfill', 'A re-run over old data uses the same code path with a date range. Idempotency makes it safe, and rate limits make it slow, so plan the budget and run it outside peak hours.', 'The same code, a wider window.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'Why does the pipeline name a chunk with a hash of the model id and the text, and not with a random id?',
        opts: [
          { t: 'The same text then gets the same id on every run, so unchanged chunks are recognised and not embedded again', fb: '' },
          { t: 'A random id is slower to generate', fb: 'Speed is not the reason. Stability is.' },
          { t: 'Hashes are shorter to store', fb: 'They are about as long as a random id.' },
          { t: 'The vector store requires hashes', fb: 'It does not. The choice is yours, and it decides whether re-runs are cheap.' }
        ],
        ok: 0, why: 'With a random id, every run creates new chunks and the old ones stay, so you get duplicates and a full embedding bill. With an id from the text, run 2 of the recording found all ' + PR[1][3] + ' chunks unchanged and computed ' + PR[1][5] + ' embeddings. The model id is in the hash because a new model must give new ids.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'The FAQ is changed so that only managers may read it. No text changed. What should the pipeline do?',
        opts: [
          { t: 'Update the audience label on its chunks, and compute no embeddings', fb: '' },
          { t: 'Re-embed the whole FAQ, because it changed', fb: 'The text did not change, so the vectors are the same. You would pay for nothing.' },
          { t: 'Delete the FAQ and add it again', fb: 'That also re-embeds, and leaves a gap in which the FAQ is missing.' },
          { t: 'Do nothing until the next full rebuild', fb: 'The old label stays in the index, and staff keep reading a document that they may no longer read.' }
        ],
        ok: 0, why: 'A label is not part of the text. In run 5 of the recording, one document row was updated and 0 embeddings were computed. Afterwards staff saw ' + PN.faq_chunks_visible_to_staff_after + ' of its chunks and managers ' + PN.faq_chunks_visible_to_managers_after + '.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'A document is deleted from the shared drive. A week later the assistant still quotes it. What did the pipeline miss?',
        opts: [
          { t: 'A delete step: the chunks and vectors of the document were never removed from the index', fb: '' },
          { t: 'The embedding model forgot it', fb: 'Models do not forget a vector that is stored in an index.' },
          { t: 'The cache of the browser', fb: 'The text comes from the index, not from the browser.' },
          { t: 'A longer prompt', fb: 'The prompt only carries what retrieval returns.' }
        ],
        ok: 0, why: 'An ingestion that only adds and updates never learns that a file is gone. The recording deleted the glossary: ' + PN.glossary_chunks_deleted + ' chunks left the index and its words found ' + PN.glossary_hits_after_delete + ' hits afterwards. Compare the list of sources with the index on every run, or listen for delete events.'
      }),

      B.quiz({
        id: 'm5-q4', t: 1,
        q: 'You filter the top five results by audience after the search. A manager asks a question, and three of the five best chunks are finance documents. What does the manager get?',
        opts: [
          { t: 'Two chunks, because the restricted ones used up places and were then removed', fb: '' },
          { t: 'Five chunks, because the filter refills the list', fb: 'A filter after the search cannot add chunks. It only removes.' },
          { t: 'The finance chunks, because retrieval ignores labels', fb: 'The filter removes them. The problem is what it leaves.' },
          { t: 'An error', fb: 'No error. The answer is just worse.' }
        ],
        ok: 0, why: 'A filter after the search is safe and lossy. In the recording the manager lost ' + AC.slots_lost_when_filtering_after_search + ' places across 24 questions that way. With the filter inside the search, the five places were filled with chunks the role may read.'
      }),

      B.quiz({
        id: 'm5-q5', t: 2,
        q: 'The team switches to a new embedding model and re-embeds the live index in place, chunk by chunk, over three hours. What is the risk?',
        opts: [
          { t: 'For three hours the index holds vectors of two models, and queries get meaningless neighbours or errors', fb: '' },
          { t: 'The new model is always worse', fb: 'It may be better. The problem is the way it was rolled out.' },
          { t: 'The index grows too big', fb: 'Size is not the main risk.' },
          { t: 'There is no risk, because both models are similar', fb: 'Two models have unrelated spaces, even at the same size.' }
        ],
        ok: 0, why: 'A live index must hold vectors from one model. Build the new one beside it, compare the scores, and switch an alias. In the recording the query of a new model against an old index of another size raised an error, and at the same size it ran silently (hit at 5 ' + EV['new_query_old_index_same_dimension_hit@5'] + ' with the stand-in, which is not a promise for neural models).'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the safe change to a new embedding model in order.',
        items: [
          'Build a second index with the new model, beside the live one',
          'Run the question set on both indexes',
          'Compare the scores, the cost and the speed',
          'Move the alias to the new index in one write',
          'Watch the live metrics for a day',
          'Delete the old index when nothing needs it'
        ],
        why: 'The old index keeps serving while the new one is built, so no user notices. The scores decide the switch, and the alias makes it one write that can be undone. The old index stays until you are sure, because going back is one write while it exists.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'This ingestion function is run nightly. After a week the same text appears many times in the search results and the embedding bill has grown. Click the line that causes it.',
        file: 'ingest.py', lang: 'python', code: BUG1, bad: [5],
        hint: 'What does the id of a chunk depend on?',
        why: 'A random id is new on every run, so a chunk that already exists is inserted again with a new id, and embedded again. Make the id a hash of the model id and the text, check whether it exists, and embed only when it does not.',
        fix: FIX1,
        cheer: 'The same text gets the same id.'
      }),

      B.bug({
        id: 'm5-bug2', t: 2, q: 'This function is meant to return only what the role may read. Managers sometimes get one or two results instead of five. Click the line that causes it.',
        file: 'search.py', lang: 'python', code: BUG2, bad: [3],
        hint: 'When does the filter run?',
        why: 'The index returns its five best chunks first, and line 3 removes the ones the role may not read. The removed chunks used up places, so fewer than five remain. Pass the filter to the query, so that the search only considers chunks that may be read, and filter on `current` there too.',
        fix: FIX2,
        cheer: 'Filter inside the search.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'rec', title: 'Decision: how to ship a new embedding model',
        scenario: 'A new embedding model scores better on the vendor\'s benchmark. Brewline has ' + PN.chunks_in_store + ' chunks in this course and about 60,000 in production. You must decide how it reaches users. In the recording, the new index scored ' + PN['hit@3_new_model_index'] + ' at 3 and the old one ' + PN['hit@3_old_model_index'] + '.',
        opts: [
          { t: 'Re-embed the live index in place, one document at a time', d: 'No second copy, no extra storage.', lose: 'For hours the index mixes two models. Queries need one model, and the quality is unpredictable. A mistake halfway cannot be undone cheaply.' },
          { t: 'Build the new index beside the live one, score both, and move an alias', d: 'No user sees a half-built index. The scores decide, and the way back is one write.' },
          { t: 'Keep both indexes live and merge their results at query time', d: 'Gradual, with no switch.', lose: 'Scores from two models cannot be merged without care, and each query now pays two searches, two embeddings and twice the storage.' }
        ],
        pick: 1,
        why: 'The extra storage is temporary and small next to the risk. The switch is one write, and a score is the condition. The old index is your rollback.',
        when: 'For a very large index with no room for a second copy, plan a staged migration by collection with a router, and test the router as carefully as the model.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: the assistant quotes the old refund window', time: '11:35',
        alert: '**A customer was told they could return beans within 30 days. The rule changed to 14 days in the new handbook.** The assistant cited the handbook, and a manager checked: the old version was in the index and was still marked current. The new version was ingested last week.',
        clues: ['Both handbooks are in the index', 'Both are labelled current = true', 'The two texts differ in one number', 'In the recording, ' + ST['hybrid (RRF)'].questions_with_a_v1_chunk_in_top5 + ' of 24 questions had an old chunk in the top 5'],
        opts: [
          { t: 'Mark the old handbook as not current, filter on current inside the search, and add a refund-window question to the evaluation set', fb: '' },
          { t: 'Add "prefer the newest document" to the prompt', fb: 'The model cannot see which chunk is newer, and the two chunks look almost the same.' },
          { t: 'Delete the old handbook from the index and say nothing', fb: 'It stops the wrong answer and loses the history, and the next policy change has the same hole.' },
          { t: 'Ask the model to double-check its answer', fb: 'It has the same two chunks. A second look finds the same two chunks.' }
        ],
        best: 0,
        why: 'The index cannot tell old from new unless a label says so. The label goes on every chunk, the filter runs inside the search, and a test question with an old and a new answer makes sure it stays fixed. Keep the old text, because people ask about the past.',
        checks: [
          ['Find both versions', 'Search the index for the sentence about returns. Which chunks come back, and what are their labels?'],
          ['Fix the label', 'Set current = false for the old handbook. It costs no embeddings.'],
          ['Filter', 'Make the search filter on current inside the query.'],
          ['Test', 'Add a question whose answer differs between versions. The release fails if the old answer returns.'],
          ['Process', 'Make "mark the previous version as not current" a step of publishing a new version.']
        ],
        tell: 'A customer was given the old 30-day return window because both handbook versions were in the index and both were marked current. I set the old version to not current, which needs no embeddings, made the search filter on current inside the query, and added an evaluation question with an old and a new answer. I also made marking the previous version a step of the publishing process, so the next policy change cannot repeat this.',
        prevent: ['Mark the **previous version** as not current when a new one is published', 'Filter on **current inside the search**', 'Keep an **evaluation question** whose answer changed', 'Do not rely on **a prompt** to choose the newer text']
      }),

      B.incident({
        id: 'm5-inc2', t: 2, src: 'docs', title: 'Incident: the embedding bill doubled overnight', time: '07:50',
        alert: '**The embedding spend for last night is more than twice the usual amount, and no documents were added.** The nightly job was changed on Monday to add a timestamp to every chunk id, "for debugging". The job now reports ' + PR[0][5] + ' embeddings computed every night, and the index has grown by the same number of chunks.',
        clues: ['The chunk id now contains the time of the run', 'Run 2 of the recording computed ' + PR[1][5] + ' embeddings when the id came from the text', 'The index grows every night by the size of the collection', 'Searches now return several copies of the same text'],
        opts: [
          { t: 'Remove the timestamp from the id, delete the duplicate chunks, and add an alert on embeddings computed per run', fb: '' },
          { t: 'Ask the provider for a discount', fb: 'It does not stop the duplicates, and the bill grows again tomorrow.' },
          { t: 'Run the job weekly instead of nightly', fb: 'It cuts the bill by a factor of seven and leaves the duplicates and the bug.' },
          { t: 'Remove duplicates in the prompt before the model reads them', fb: 'The index is still full of copies, and every search pays for them.' }
        ],
        best: 0,
        why: 'An id with the time in it is new on every run, so every chunk looks new, is embedded again and inserted again. The fix is an id from the text, a clean-up of the duplicates, and an alert on the number of embeddings computed, which would have caught this on the first night.',
        checks: [
          ['Read the report', 'Embeddings computed per run, and chunks unchanged. Unchanged should be near the size of the collection.'],
          ['Find the change', 'Look at the diff of Monday: the id now has a timestamp.'],
          ['Fix and clean', 'Revert the id, then delete the chunks that have the same text and a time in the id.'],
          ['Re-run twice', 'Run the job twice and check that the second run computes zero embeddings.'],
          ['Guard', 'Alert when embeddings computed is far above the number of changed documents, and test that a second run is a no-op.']
        ],
        tell: 'Our nightly embedding spend doubled because someone put a timestamp in the chunk id, so every chunk looked new every night and was embedded and inserted again. I reverted the id to a hash of the model and the text, deleted the duplicates, and ran the job twice to confirm that the second run computed zero embeddings. I added an alert on embeddings computed per run and a test that a second run does nothing.',
        prevent: ['Test that **a second run is a no-op**', 'Alert on **embeddings computed** per run', 'Keep **ids stable**: no times, no random values', 'Review **changes to ids** like changes to a schema']
      }),

      B.qa({
        id: 'qa-pipe', t: 1, tag: 'Pipelines', secs: 90,
        q: 'Design the ingestion pipeline for a retrieval system.',
        pts: ['Raw files kept untouched', 'Parse, clean, mask, label', 'Chunk with ids from the text', 'Embed only new chunks, batch the calls', 'Write to the index with labels', 'Delete, relabel, and switch indexes safely', 'Report and alert'],
        short: 'I keep the raw files untouched. For each document I parse, clean, mask personal data and label it with audience, version and current. I cut it into chunks and name each chunk with a hash of the embedding model and the text.\n\nThen I look at what the index already has. A document whose hash and labels did not change is skipped. For a changed one I find the new chunk ids, embed only those, in batches, and write them with their labels. Chunks that are gone from the document are deleted. A label change updates rows and embeds nothing, and a deleted document removes its chunks.\n\nA new embedding model or a new chunker builds a second index beside the live one, I score both on the question set, and an alias move is the release.\n\nIt runs in an orchestrator with one task for each document, retries for transient errors and a quarantine for bad files. Every run reports documents, chunks added, unchanged and removed, embeddings computed, failures and freshness, and I alert on surprises in either direction.',
        fu: [
          ['What do you test?', 'That a second run is a no-op, that an edit changes only its chunks, that a delete leaves nothing, and that a label change costs no embeddings.'],
          ['How do you scale it?', 'Parallel tasks for each document, batching and a cap on requests to the embedding service, and a bulk path for backfills.']
        ],
        trap: 'Describing only the happy path of one run. The interviewer wants updates, deletes, labels and a second run.',
        real: 'Describe a pipeline you built that you could run twice, and how you proved it.'
      }),

      B.qa({
        id: 'qa-idem', t: 1, tag: 'Pipelines', secs: 60,
        q: 'How do you make an ingestion run idempotent and incremental?',
        pts: ['Ids come from the content, not from time or randomness', 'A hash of the document skips unchanged files', 'Compare wanted chunk ids with existing ones', 'Embed only the difference', 'Test that a second run does nothing', 'Alert on embeddings computed'],
        short: 'The key is the chunk id. I make it a hash of the embedding model id and the chunk text, so the same text always gets the same id, and a new model gets new ids. Never a timestamp or a random value.\n\nWith that, the run can compare. For each document I compare its content hash and labels with the stored ones, and skip it when nothing changed. For a changed document I compute the ids that I want, compare them with the ids that exist, embed only the ones that are new, insert them, and delete the ones that are no longer wanted.\n\nIn my recording, the first run embedded all 87 chunks, the second run embedded none, and one changed sentence embedded exactly one chunk. I keep that as a test: a second run must be a no-op, and an edit must touch only its own chunks. I also alert on the number of embeddings computed in each run.',
        fu: [
          ['Why is the model id in the hash?', 'A new model must produce new ids, so that its vectors never mix with the old ones.'],
          ['What breaks idempotency most often?', 'Ids with a time or a random value in them, and writes without a check for existing rows.']
        ],
        trap: 'Using `uuid4()` for the chunk id. Every retry then adds a duplicate.',
        real: 'Describe how you tested that a second run was a no-op.'
      }),

      B.qa({
        id: 'qa-update', t: 1, tag: 'Pipelines', secs: 60,
        q: 'How do you handle updates and deletes in the index?',
        pts: ['An edit changes the text, so only the changed chunks are new', 'Chunks no longer in the document are deleted', 'A removed document is a delete run', 'Compare the source list with the index', 'Label changes update rows without embeddings', 'Vector stores may hide deletes until a rebuild'],
        short: 'An edit changes the text, so only the chunks that changed get new ids. I embed those, insert them, and delete the chunks of that document that are no longer wanted. In my recording one sentence changed, one chunk was added, one removed, and one embedding computed.\n\nA removed document is a delete: I compare the list of source documents with the index, or react to a delete event, and remove the chunks and their vectors. In my test a glossary was deleted, three chunks left, and its words found nothing afterwards.\n\nA change of a label, such as the audience or the current flag, updates the rows and costs no embedding. One thing to know: many vector indexes only hide a deleted point until a rebuild, so if a document must be erased for privacy, I plan a rebuild or a compaction too, and I keep a record of when it happened.',
        fu: [
          ['How do you notice a delete?', 'A delete event from the source, or a periodic comparison of the source list with the index. I use both.'],
          ['What about the logs and the cache?', 'They may hold the text too. A real erase covers the index, the vectors, the logs and the caches.']
        ],
        trap: 'Handling only additions. Old documents then keep answering.',
        real: 'Describe a delete you handled, and where else the data lived.'
      }),

      B.qa({
        id: 'qa-acl', t: 1, tag: 'Pipelines', secs: 90,
        q: 'How do you enforce document permissions in a retrieval system?',
        pts: ['Copy the audience label from the document to every chunk', 'Filter inside the search, before ranking', 'A filter after the search leaks nothing and loses answers', 'Resolve the role of the user on the server, not in the prompt', 'Apply the same filter to caches and logs', 'Test with a question whose answer a role may not read'],
        short: 'Retrieval does not know about permissions, so I give it the information. At ingestion I copy the audience of each document onto every chunk. At question time the server works out the role of the person from their sign-in, not from the prompt, and passes a filter to the search, so that a chunk the person may not read is never a candidate.\n\nThe placement matters. In my test with the manager role and 24 questions, no filter put 18 restricted chunks into the top five places, and ten questions had a leak. A filter after the search leaked nothing and left 18 places empty, so the answers got worse. A filter inside the search leaked nothing and filled the places with chunks the role may read.\n\nThe same rule applies to caches, so the role is part of a cache key, and to logs. And I add evaluation questions whose answer sits in a document that a role may not read, where the right behaviour is to say that it cannot find an answer.',
        fu: [
          ['What if permissions change often?', 'Labels are rows, so a change updates them without embeddings. For per-user lists, filter by a group id and keep memberships in a service the search can ask.'],
          ['Is a prompt instruction enough?', 'No. A model can be talked out of an instruction. The data must not be in the prompt at all.']
        ],
        trap: 'Telling the model "only answer from documents the user may see". The documents are already in the prompt.',
        real: 'Describe how you enforced access in a search, and how you tested it.'
      }),

      B.qa({
        id: 'qa-reindex', t: 1, tag: 'Pipelines', secs: 60,
        q: 'How do you change the embedding model or the chunker without downtime?',
        pts: ['Never edit the live index', 'Build a second index beside it', 'Score both on the same questions', 'Switch an alias in one write', 'Keep the old index to roll back', 'Record the model id with the index and check it on every query'],
        short: 'I never edit the live index in place, because for a while it would hold two models or two chunkings. I build a second index beside it with the new model or chunker, while the old one keeps serving. Then I run the same question set on both and compare hit at k, the cost and the speed.\n\nIf the new index is not worse, I move an alias from the old index to the new one, which is one small write, and every query is served by the new one. I keep the old index for a day, so that going back is one write too.\n\nThe index records the id of its model, and the query service refuses to embed a question with any other model, because vectors from two models cannot be compared. Even at the same length they mean nothing together.',
        fu: [
          ['What does it cost?', 'Storage for a second index while both exist, and one full embedding run. Both are small next to a bad release.'],
          ['What do you watch after the switch?', 'Online metrics: errors, latency, tokens, thumbs, and the share of questions with no answer.']
        ],
        trap: 'Re-embedding in place to save storage. It is the risky option.',
        real: 'Describe a model or chunker change that you shipped, and how you decided.'
      }),

      B.qa({
        id: 'qa-fresh', t: 2, tag: 'Pipelines', secs: 60,
        q: 'How do you keep the index fresh, and know that it is?',
        pts: ['Events for new and changed files, a sweep for misses', 'Idempotent runs make overlap safe', 'Measure freshness lag: source change to index', 'Alert on lag and on runs that did nothing', 'Count chunks and documents against the source', 'Show the version of a source in answers'],
        short: 'I use events for speed and a sweep for safety. When a file changes, an event starts the run for that file. A nightly sweep compares the source with the index and catches what an event missed. Because the run is idempotent, the two can overlap without harm.\n\nTo know that it works I measure freshness: the time from a change in the source to the same change in the index, per document and as a percentile. I alert when the lag passes what the business accepts, and I also alert on a run that did nothing for too long, because a silent pipeline looks like a healthy one.\n\nI compare counts, the documents and the chunks in the source against the index, and I show the version and date of the source in the answer, so that a user can see how old it is. Last, a canary document that I change on purpose each day proves the whole path.',
        fu: [
          ['What is a canary document?', 'A test file that the job edits every day with a known sentence. A check asks the assistant about it and fails if the answer is old.'],
          ['What lag is acceptable?', 'It depends on the use. Policies are fine with hours, prices may need minutes. The business decides, and the alert enforces it.']
        ],
        trap: 'Watching the job status only. A green job can index nothing.',
        real: 'Describe how you measured freshness, and what lag you promised.'
      }),

      B.qa({
        id: 'qa-cdc', t: 3, tag: 'Pipelines', secs: 60,
        q: 'How do you keep the index in sync with a database table, not with files?',
        pts: ['Turn a row into a document: choose the fields, write the text', 'Hash the text, so that unchanged rows cost nothing', 'Capture changes: a change feed, a timestamp or a log', 'Deletes arrive as tombstones, and need a run too', 'Idempotent upserts keyed by the row id and the hash', 'Backfill with the same code path'],
        short: 'I treat a row as a small document. I decide which fields make the text and which become labels, such as the owner and the audience, and I write a stable template for the text, so that the same row always gives the same text. Then the ideas of my file pipeline apply: a hash of the text, and an id from the row key and the hash, so that an unchanged row costs nothing.\n\nTo find what changed, I use a change feed from the database or a log of changes if there is one, otherwise a modified timestamp with a safety margin, plus a periodic full comparison, because a timestamp can miss a row. A delete shows up as a tombstone, or as a row that is gone from a comparison, and it removes the chunks and the vectors.\n\nWrites are idempotent upserts, and ordering is handled by comparing the version of the row, not the arrival time. A backfill uses the same code with a wider window.',
        fu: [
          ['What about rows that change every minute?', 'Batch the changes, embed on a delay, and decide how fresh the index must be. Most use cases accept minutes.'],
          ['What about a row with personal data?', 'Mask or leave it out of the text, and keep labels for access, exactly as with files.']
        ],
        trap: 'Re-embedding the whole table every night.',
        real: 'Describe how you synced an index with a table that changed often.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Pipeline Keeper', color: '#FED7AA',
        pts: [
          'A chunk **id is a hash of the model and the text**. Then a second run embeds **nothing**, and an edit embeds **only what changed**.',
          'A **delete** is a run: remove the chunks and the vectors. A **label change** updates rows and costs **no embeddings**.',
          'Run the **permission filter inside the search**. After the search it is safe and loses answers. With no filter it leaks.',
          'Filter on **current** too, because a model cannot tell which chunk is newer.',
          'A **new model means a new index**, built beside the live one, scored, and shipped by moving an **alias**.',
          'Report **embeddings computed, chunks added, unchanged and removed, failures and freshness** on every run.'
        ],
        lines: [
          'I test that a second run does nothing.',
          'I never put a time or a random value in an id.',
          'I switch indexes by moving a pointer, with a score as the reason.'
        ]
      })
    ]
  });
})();
