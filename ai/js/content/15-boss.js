/* Mission 15: drills that mix missions, a design decision, a coding round, the boss round of interview questions, and a one-page review.
   Every number on the cheat sheet comes from a recording in an earlier mission (parsers, MinHash, FAISS, hnswlib, pgvector, BM25, the Anthropic and
   OpenAI client libraries against a local stand-in server, LangGraph with a scripted model, an MCP server and client, sqlglot with DuckDB,
   OpenTelemetry, pytest). The embedding is a stand-in and no language model was used. Facts about hosted models and services come from documentation,
   and nothing here ran on a cloud or on a model provider. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions. */
  var BOSS = [
    ['qa-ai-de', 1], ['qa-rag', 1], ['qa-ragft', 1],
    ['qa-parse', 1], ['qa-pii', 1], ['qa-dedup', 2],
    ['qa-chunk', 1], ['qa-size', 1], ['qa-struct', 2],
    ['qa-embed', 1], ['qa-hnsw', 1], ['qa-hybrid', 1], ['qa-filter', 2],
    ['qa-pipe', 1], ['qa-idem', 1], ['qa-acl', 1], ['qa-reindex', 2],
    ['qa-eval', 1], ['qa-golden', 1], ['qa-judge', 2],
    ['qa-api', 1], ['qa-retry', 1], ['qa-schema', 1],
    ['qa-agent', 1], ['qa-loop', 1], ['qa-limits', 1], ['qa-when', 2],
    ['qa-mcp', 1], ['qa-t2sql', 1], ['qa-readonly', 1], ['qa-mcpsec', 2],
    ['qa-state', 1], ['qa-hitl', 1], ['qa-resume', 2], ['qa-multi', 2],
    ['qa-obs', 1], ['qa-agenteval', 2],
    ['qa-injection', 1], ['qa-privacy', 1], ['qa-agency', 1], ['qa-poison', 2],
    ['qa-ship', 1], ['qa-cicd', 1], ['qa-llmops', 1], ['qa-canary', 2],
    ['qa-ft', 1], ['qa-leak', 1], ['qa-batch', 1], ['qa-mlops', 2]
  ];

  var SM = G.table('search.methods').rows, ST = G.counts('search.stale'), AC = G.counts('search.acl'), HN = G.table('ann.hnsw').rows, IV = G.table('ann.ivf').rows, PQ = G.table('ann.pq').rows;
  var PR = G.table('pipeline.runs').rows, PL = G.counts('pg.limit'), PF = G.table('pg.filter').rows, PD = G.counts('docs.pdf'), SC = G.counts('docs.scanned'), DU = G.table('docs.dups').rows[0];
  var CS = G.table('chunk.strategies').rows, GD = G.counts('eval.gate_detail'), NZ = G.counts('eval.noise'), K = G.counts('llm.constants'), LM = G.counts('agent.limits'), WA = G.counts('agent.workflow_vs_agent');
  var RD = G.counts('agent.reducer'), RP = G.counts('agent.replay'), RR = G.counts('agent.resume_runs_again'), IN = G.counts('agent.interrupt'), SU = G.counts('sqlguard.summary'), FP = G.counts('mcp.footprint');
  var IO = G.table('inject.outcomes').rows, IR = G.counts('inject.retrieval'), TS = G.counts('test.summary'), OT = G.counts('otel.summary'), FD = G.counts('finetune.dataset'), FS = G.table('finetune.split').rows;
  function hn(m, ef) { return HN.filter(function (r) { return r[0] === m && r[1] === ef; })[0]; }
  function iv(n) { return IV.filter(function (r) { return r[0] === n; })[0]; }
  function cs(name) { return CS.filter(function (r) { return r[0] === name; })[0]; }
  G.expect(PR[0][5] === 87 && PR[1][5] === 0 && PR[2][5] === 1 && PL.rows_with_ef_search_40 === 40 && ST['hybrid (RRF)'].questions_with_a_v1_chunk_in_top5 === 12 && AC.restricted_chunks_in_top5_no_filter === 18, 'the pipeline and search numbers of the cheat sheet');
  G.expect(hn(16, 64)[2] === 0.995 && iv(8)[1] === 0.988 && PQ[0][2] === 0.129 && SM[0][2] === 0.875 && SM[1][2] === 0.792 && SM[2][2] === 0.875, 'the index and search numbers');
  G.expect(FS[0][3] === 32 && FS[1][3] === 0 && FD.after_exact_dedup === 162 && IO[0][2] === 'EUR 500.0' && IR.poisoned_chunk_rank === 1 && SU.queries === 14 && TS.clean.passed === 4, 'the later numbers');

  /* The coding round: hit at 3 and MRR for each method and kind, in SQL, from the ranks of the 24 questions. */
  var Q = G.table('search.questions'), RANKS = [], RES = {};
  Q.rows.forEach(function (r) { ['BM25', 'vector', 'hybrid'].forEach(function (m, i) { var v = r[3 + i]; RANKS.push([r[0], r[1], m, v === '-' ? null : v]); }); });
  RANKS.forEach(function (r) { var k = r[2] + '|' + r[1]; (RES[k] = RES[k] || []).push(r[3]); });
  var RESROWS = Object.keys(RES).sort().map(function (k) {
    var p = k.split('|'), a = RES[k], n = a.length;
    var h = a.filter(function (x) { return x !== null && x <= 3; }).length / n, m = a.reduce(function (s, x) { return s + (x !== null && x <= 10 ? 1 / x : 0); }, 0) / n;
    return [p[0], p[1], n, Math.round(h * 1000) / 1000, Math.round(m * 1000) / 1000];
  });
  var CH_SQL = [
    'SELECT method,',
    '       kind,',
    '       COUNT(*) AS questions,',
    '       ROUND(AVG(CASE WHEN rank IS NOT NULL AND rank <= 3 THEN 1.0 ELSE 0.0 END), 3) AS hit_at_3,',
    '       ROUND(AVG(CASE WHEN rank IS NOT NULL AND rank <= 10 THEN 1.0 / rank ELSE 0.0 END), 3) AS mrr_at_10',
    'FROM ranks',
    'GROUP BY method, kind',
    'ORDER BY method, kind'
  ].join('\n');
  var VEC_TABLE = RESROWS.filter(function (r) { return r[0] === 'vector' && r[1] === 'table'; })[0];
  G.expect(RESROWS.length === 18 && VEC_TABLE[3] === 0 && VEC_TABLE[4] === 0.25, 'the coding round result');

  LAB.addChapter({
    id: 'm15', n: 15, title: 'Boss round', short: 'Boss round', blurb: 'Drills that mix the missions, a design decision, a coding round, and a mock interview', minutes: 70,
    focus: ['src', 'air', 'ci'],
    goals: [
      'Handle **two incidents** that cross missions: stale and expensive, and a leak after a refactor.',
      'Decide **what to build first** for the Brewline assistant, and defend it with numbers.',
      'Score retrieval with **one SQL query**.',
      'Answer **the interview questions** of every mission in the time of a real interview.',
      'Take away **one page** of numbers and rules.'
    ],
    say: 'Mission 15 is the boss round. First two drills that mix what you learned: nobody has an incident in only one mission. Then a design decision, a coding round in SQL on the real ranks of the 24 questions, and the mock interview with questions from every mission, in the order of the course. At the end there is one page of numbers and rules, all from my recordings. Nothing here ran on a cloud or on a model provider, and the embedding and the model were stand-ins, which I said every time it mattered.',
    scenes: [
      B.incident({
        id: 'm15-inc1', t: 2, src: 'rec', title: 'Drill: a wrong refund window, and a bill that grew', time: '08:55',
        alert: '**A customer was told 30 days to return beans. The rule is 14. The same week, the cost per answer rose by half.** The old handbook is in the index and marked current. Last Thursday someone raised the number of chunks per prompt from 3 to 10, and the chunk size from 500 to 1500, in one change. Nobody ran the evaluation set.',
        clues: ['In the recording ' + ST['hybrid (RRF)'].questions_with_a_v1_chunk_in_top5 + ' of 24 questions had an old chunk in the top 5 without the filter, and 0 with it', 'A larger prompt is more tokens in every call', 'Two settings changed together, with no evaluation', 'The previous index is still there'],
        opts: [
          { t: 'Mark the old handbook as not current and filter on current inside the search. Move the alias back to the previous index. Then run the evaluation set on each setting, one at a time, and keep the cheapest that holds the score', fb: '' },
          { t: 'Add "prefer the newest document" to the prompt and keep the new settings', fb: 'The model cannot see which chunk is newer, and the larger prompt keeps costing more.' },
          { t: 'Delete the old handbook and switch to a cheaper model', fb: 'You lose the history, and a cheaper model is a third change with no evaluation.' },
          { t: 'Wait for the next monthly review', fb: 'Customers are being told the wrong refund window now.' }
        ],
        best: 0,
        why: 'Fix correctness first, and it costs nothing: the label and the filter inside the search remove the old chunk, as the recording shows. Then undo the change that nobody measured, with the alias, and re-introduce the two settings one at a time through the evaluation gate. Both problems came from changes with no score.',
        checks: [
          ['Stop the wrong answer', 'Set current = false on the old handbook, with no re-embedding, and filter on current inside the search.'],
          ['Undo the unmeasured change', 'Move the alias to the previous index and the previous settings.'],
          ['Measure each setting', 'Run the golden set for the number of chunks and for the chunk size separately, with cost per answer.'],
          ['Guard', 'Add a question whose answer changed to the golden set, and a token alert per request.'],
          ['Process', 'Mark the previous version as not current when a new one is published, and gate every retrieval setting.']
        ],
        tell: 'A customer got the old refund window and the cost per answer rose, because the old handbook was still current in the index and two retrieval settings had changed together with no evaluation. I marked the old version as not current, filtered on current inside the search, and moved the alias back. Then I ran the golden set on each setting separately with the cost per answer, kept the cheapest that held the score, added the changed-answer question to the set, and added a token alert.',
        prevent: ['**Label** the previous version as not current at publish time', 'Filter on **current inside the search**', 'Change **one setting at a time** and score it', 'Alert on **tokens per request**']
      }),

      B.incident({
        id: 'm15-inc2', t: 2, src: 'rec', title: 'Drill: a manager sees finance data after a refactor', time: '10:20',
        alert: '**After a refactor of the search service, a store manager received an answer built from a finance document, the supplier terms.** The refactor "simplified" the search: it now takes the top five from the index and then removes what the role may not read. A new answer cache was added in the same release, keyed on the question only.',
        clues: ['In the recording, with no filter ' + AC.restricted_chunks_in_top5_no_filter + ' restricted chunks reached the top 5 of the manager role', 'A filter after the search leaks nothing and loses places, and a cache with no role in its key can serve one role\'s answer to another', 'The cache was filled by a finance user', 'There was no test for it'],
        opts: [
          { t: 'Roll back, put the filter inside the search again, put the role into the cache key, purge the cache, add tests for both, and tell the privacy team', fb: '' },
          { t: 'Tell the assistant not to quote finance documents', fb: 'A prompt rule is a hint, and the data is already in the prompt or the cache.' },
          { t: 'Remove the cache, and leave the search as it is', fb: 'The post-filter loses answers for everybody, and the leak of the cache is not the only one.' },
          { t: 'Delete the manager\'s chat and move on', fb: 'It hides the evidence and fixes nothing.' }
        ],
        best: 0,
        why: 'There are two bugs in one release, and each one is a mission you did. The filter must be inside the search, which gave 0 restricted chunks in the recording, and the role belongs in the key of any cache. Roll back first, purge what the cache holds, add tests with a manager and a finance user, and tell the privacy team, because restricted data was shown.',
        checks: [
          ['Contain it', 'Roll back the release, and purge the cache.'],
          ['Find the exposure', 'Which answers and which users? The traces and the audit log show the sources of each answer.'],
          ['Fix the design', 'The filter inside the search, and the role and the data version in the cache key.'],
          ['Test it', 'A test that asks the finance question as a manager and expects a refusal, and one that fills the cache as finance first.'],
          ['Tell the right people', 'Privacy, and the owner of the supplier terms.']
        ],
        tell: 'A refactor moved the permission filter after the search and added an answer cache keyed on the question only, so a manager received an answer from a finance document. I rolled back and purged the cache, found the affected answers from the traces, put the filter inside the search again and the role and the data version into the cache key, and added tests where a finance user fills the cache and a manager asks the same question. I told the privacy team about the exposure.',
        prevent: ['The **filter inside the search**, always', 'The **role in every cache key**', 'A **test** with two roles and a shared cache', 'Traces that show **sources for each answer**']
      }),

      B.decide({
        id: 'm15-dec', t: 2, src: 'rec', title: 'Decision: what do the three of you build first?',
        scenario: 'Brewline has three engineers and six weeks. The assistant must answer policy questions from documents, count orders from the warehouse, and later issue refunds. The golden set does not exist yet. Managers are impatient, and a demo is planned for week two.',
        opts: [
          { t: 'The full agent with all three tools and an MCP server for the data, then evaluate when it works', d: 'The most impressive demo, and every feature is there at once.', lose: 'There is no score, so no change can be judged. The refund tool is live before the approval is tested, and an injected sentence could use it. In the recording, with no defence EUR 500 left.' },
          { t: 'A read-only assistant on retrieval first: labelled, filtered, idempotent ingestion, a golden set and a gate. Then the read-only order tool with the SQL guard. Then the refund tool, behind an approval, with the attack set in CI', d: 'Each step is measured, and the power grows only after the controls exist. The week-two demo is a real retrieval answer with sources.' },
          { t: 'Fine-tune a model on the handbook, so that it needs no retrieval', d: 'A single model that "knows" the policy.', lose: 'The policy changes twice a year, the model shows no source, it cannot hide a document from a role, and it cannot forget one. Retrieval solves what this tries to solve.' }
        ],
        pick: 1,
        why: 'Order the work by risk and by what you can measure. A golden set and a gate come first, because every other choice depends on them: in the recording the same 24 questions separated five candidate changes. The assistant that reads has no power to act, and the refund arrives last, behind an approval and an attack set. A demo of retrieval with sources is honest, and it is good enough for week two.',
        when: 'If a regulator or a customer needs the refund in week three, build the approval and the attack set earlier, and keep the same order inside them: the controls before the power.'
      }),

      B.challenge({
        id: 'm15-ch', t: 2, title: 'Coding round: score the searches in SQL', file: 'score.sql', lang: 'sql',
        q: 'The table `ranks` holds, for each of the 24 questions and each of the three searches, the rank of the first right chunk (NULL when it was not in the top 10). **Write one query that returns, for each method and each kind of question, the number of questions, the hit at 3, and the mean reciprocal rank at 10**, rounded to 3 decimals, ordered by method and kind.',
        data: [{ name: 'ranks (from the recording of mission 6)', cols: ['id', 'kind', 'method', 'rank'], rows: RANKS.map(function (r) { return [r[0], r[1], r[2], r[3] === null ? 'NULL' : r[3]]; }) }],
        starter: '-- one row for each method and kind\nSELECT method, kind, ...\nFROM ranks',
        hints: ['Group by method and kind.', 'A hit at 3 is 1 when the rank is not NULL and at most 3, else 0. The average of those is the hit rate.', 'The reciprocal rank is 1 divided by the rank, and it is 0 for a NULL or a rank above 10.'],
        sol: CH_SQL,
        res: { msg: RESROWS.length + ' rows', cols: ['method', 'kind', 'questions', 'hit_at_3', 'mrr_at_10'], rows: RESROWS },
        expl: ['`GROUP BY method, kind` gives one row for each of the 18 combinations.', '`CASE WHEN rank IS NOT NULL AND rank <= 3 THEN 1.0 ELSE 0.0 END` turns each question into a hit or a miss, and `AVG` of that is the hit rate. A NULL rank has to be a miss, so the test for NULL comes first.', '`1.0 / rank` is the reciprocal rank, kept for ranks up to 10. A miss counts as 0.', 'Look at the row for `vector`, `table`: hit at 3 of 0 and MRR of 0.25. It is the one table question that the stand-in vector search lost, and the average of the whole set hid it.'],
        cx: 'One pass over 72 rows with a hash aggregate. The same query works on millions of logged questions, which is how you would score production traffic by kind.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm15-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from a recording in an earlier mission, which used a stand-in for the embedding and for the model. Take a screenshot or print the page.',
        sections: [
          { h: 'Documents and chunks', items: ['A PDF is placed text: the running header sat on ' + PD.header_copies_if_kept + ' of ' + PD.pages + ' pages, and the table came out as a row of words. A scan returned ' + SC.chars_extracted + ' characters and no error', 'Near-copies: the two handbook versions have a Jaccard of ' + DU[2] + '. Keep both, label the old one as not current', 'Mask personal data at parse time. Patterns find e-mail, phone and IBAN, and not names', 'Fixed 500 characters with no overlap cut a phrase and lost a fact: ' + cs('fixed 500, no overlap')[4] + ' facts whole. The other four kept all 27', 'Size: 500 characters gave hit@3 ' + SM[2][2] + ' and sent ' + G.table('chunk.sweep').rows[2][6] + ' characters for the top 5. 1500 sent ' + G.table('chunk.sweep').rows[4][6]] },
          { h: 'Vectors and search', items: ['HNSW M 16, efSearch 64: recall ' + hn(16, 64)[2] + ' at ' + hn(16, 64)[4] + ' percent of the work. IVF nprobe 8: ' + iv(8)[1] + ' at ' + iv(8)[3] + ' percent', 'Product quantisation to 8 bytes: recall ' + PQ[0][2] + '. A delete in an HNSW graph hides the point and keeps it in memory', 'pgvector: LIMIT 100 with ef_search 40 returned ' + PL.rows_with_ef_search_40 + ' rows. Tenant 1 got ' + PF[0][2] + ' rows of 10. Iterative scan gave ' + PF[0][3], 'Keyword hit@3 ' + SM[0][2] + ', stand-in vector ' + SM[1][2] + ', hybrid ' + SM[2][2] + '. The vector search lost the table question', 'One model for one index. A new model needs a new index and an alias'] },
          { h: 'Pipelines and access', items: ['Chunk id = hash of model and text. Run 1 embedded ' + PR[0][5] + ', run 2 embedded ' + PR[1][5] + ', one changed sentence embedded ' + PR[2][5], 'A label change updates rows and costs 0 embeddings. A delete is a run too', 'Old handbook in the top 5 for ' + ST['hybrid (RRF)'].questions_with_a_v1_chunk_in_top5 + ' of 24 questions without the filter, 0 with it', 'Filter inside the search: 0 restricted chunks in the top 5. No filter: ' + AC.restricted_chunks_in_top5_no_filter + '. After the search: safe, and ' + AC.slots_lost_when_filtering_after_search + ' places empty'] },
          { h: 'Evaluation', items: ['Golden set: question, kind, key phrase, expected answer. Never a chunk id', '24 questions: hit@3 ' + NZ.methods['BM25 (keywords)'].share + ' has a 95 percent interval of ' + NZ.methods['BM25 (keywords)'].low + ' to ' + NZ.methods['BM25 (keywords)'].high + '. Two questions are noise', 'The gate failed ' + Object.keys(GD.candidates).filter(function (k) { return GD.candidates[k].verdict === 'fail'; }).length + ' of ' + Object.keys(GD.candidates).length + ' candidate changes. Read the worse list before the verdict', 'Cheap answer checks: a source that exists and may be read, and every number found in the source'] },
          { h: 'Model APIs', items: ['SDK defaults: ' + K.anthropic.max_retries + ' retries, waits from ' + K.anthropic.initial_retry_delay + ' s to ' + K.anthropic.max_retry_delay + ' s, read timeout 600 s: a hung call can hold a worker for 30 minutes', 'Retry 429 (honour retry-after) and 5xx. Never retry a 400', 'A tool call is two requests: tool_use, then tool_result with the same id', 'Validate every answer against a schema. Retry once with the error, then park it'] },
          { h: 'Agents, tools and MCP', items: ['The model asks, your code runs. A router in code ends the loop. A limit of ' + LM.our_limit + ' steps ended a repeating run. The framework limit raises an error', 'Workflow: ' + WA.workflow.model_calls + ' model call. Agent: ' + WA.agent.model_calls + '. A list without a reducer ended as ' + JSON.stringify(RD.without_reducer), 'Checkpoints: ' + RP.checkpoints + ' for a run of three model calls. Resume starts the node again: a read ran ' + RR.tool_calls_after_resume.search_policies + ' times. A write waited: ' + IN.refunds_before_resume + ' refunds before the approval', 'SQL guard: ' + SU.allowed + ' of ' + SU.queries + ' allowed. A read-only connection alone ran the e-mail query. Parse, do not search', 'MCP: host, one client for each server. 40 tools of this size cost about ' + FP.tokens_for_40_such_tools + ' tokens in every request'] },
          { h: 'Traces, safety and shipping', items: ['A run of ' + OT.model_calls + ' model calls and ' + OT.tool_calls + ' tool calls made ' + OT.spans + ' spans, and one error that the user never saw', 'A planted chunk ranked ' + IR.poisoned_chunk_rank + ' and EUR 500 left. No write tool, an approval, and a check in the tool each stopped it', 'Tests of the loop: ' + TS.clean.passed + ' pass. Without the step limit one fails. Without the approval another fails', 'Pin the model. Move an alias after a passing evaluation. A gate must be able to fail'] },
          { h: 'Data for models', items: ['Exact de-duplication removed ' + (FD.after_adding_repeats - FD.after_exact_dedup) + ' rows, and near-duplicate removal 1 more', 'Random split: ' + FS[0][3] + ' of ' + FS[0][2] + ' validation answers also in training. Split by fact: ' + FS[1][3], 'Fine-tune for behaviour, retrieve for facts. A dataset card says what the data is not'] },
          { h: 'Say it in one line', items: ['Measure before you change, and change one thing at a time.', 'Make every write and every run safe to repeat.', 'The filter goes inside the search, and the rule goes in the tool.', 'Give a model the fewest tools, and a person the last word on a write.', 'Say what you ran, say what was a stand-in, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm15-recap', n: 15, badge: 'Agent Architect', color: '#C4B5FD',
        pts: [
          'You can follow Brewline from a **raw document** through **parsing, chunks, vectors and a pipeline you can run twice**, to **retrieval, evaluation, model APIs, agents, tools, approvals, traces, safety, releases and data for models**.',
          'You can **read a score, a trace, a gate and a test**, and say what each one tells you and what it hides.',
          'You make **ingestion and actions safe to repeat**, you put **the filter inside the search and the rule in the tool**, and you give a model **the fewest tools**.',
          'You **change one thing at a time**, you **score it**, and you ship it behind a **gate, a canary and a way back**.',
          'You say what you **ran**, what was a **stand-in**, and when you would **check the documentation**.'
        ],
        lines: [
          'I measure before I change, and I change one thing at a time.',
          'I make everything safe to run twice.',
          'I say what I ran, and what I did not.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
