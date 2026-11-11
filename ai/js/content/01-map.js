/* Mission 1: the words of the trade, one question through a RAG system, four ways to give a model knowledge, and where a data engineer owns quality.
   The token lab and the numbers about stale chunks and query expansion come from the recording. The explanations of models, windows and approaches
   come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ST = G.counts('search.stale')['hybrid (RRF)'], EX = G.table('search.expansion').rows[2], TM = G.counts('tokens.model');
  G.expect(ST.questions_with_a_v1_chunk_in_top5 === 12 && ST.with_current_only_filter === 0, 'stale chunks in the hybrid top 5');
  G.expect(EX[0] === 'hybrid (RRF)' && EX[1] === 0.875 && EX[2] === 0.75, 'query expansion lowered the hybrid score');
  var Q9 = G.table('search.questions').rows[8];
  G.expect(Q9[0] === 'q09' && Q9[3] === '-' && Q9[4] === 9, 'the reimbursement question: keyword search misses it, the vector search ranks the right chunk 9th');

  var BUG = [
    'def answer(question):',
    '    handbook = open("all_policies.txt").read()',
    '    prompt = "Policies:\\n" + handbook + "\\n\\nQuestion: " + question',
    '    reply = client.messages.create(model=MODEL, max_tokens=300,',
    '                                   messages=[{"role": "user", "content": prompt}])',
    '    return reply.content[0].text'
  ].join('\n');
  var FIX = [
    'def answer(question, role):',
    '    chunks = search(question, role=role, k=4)            # only what this person may read, only the current version',
    '    context = "\\n\\n".join(c.text for c in chunks)',
    '    prompt = "Policies:\\n" + context + "\\n\\nQuestion: " + question',
    '    reply = client.messages.create(model=MODEL, max_tokens=300,',
    '                                   messages=[{"role": "user", "content": prompt}])',
    '    return reply.content[0].text, [c.id for c in chunks]'
  ].join('\n');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map and the words', short: 'Map', blurb: 'Models, tokens, windows, embeddings, RAG, agents: what each one is and where the data work sits', minutes: 30,
    focus: ['src', 'con', 'air'],
    goals: [
      'Say what a **model, a token and a context window** are, and why a data engineer cares about each.',
      'Say what an **embedding** is, and what a vector search returns.',
      'Follow **one question** through retrieval, a prompt, a model and a check.',
      'Tell **a long prompt, retrieval, fine-tuning and tools** apart, and choose between them.',
      'Name the places where **a data engineer owns the quality** of an AI system.'
    ],
    say: 'Mission 1 is the map. Before any code, you need the words, because job posts and interviews use them loosely. I will keep each word tied to something you can count: a token is a cost, a window is a limit, and an embedding is a list of numbers that you store. The token lab and the numbers come from my recording. The explanations of how models work come from documentation, and I say where.',
    scenes: [
      B.talk({
        id: 'm1-words', t: 1, src: 'docs', title: 'The words of the trade',
        say: 'Eight words that every AI job post uses. Press Next for each one. I explain it the way a data engineer meets it: as an input, a size or a cost.',
        items: [
          ['Model', 'A language model is a program that takes text and returns text. You do not run it yourself. You call it through an API of a provider, or you host an open model on your own machines. To your pipeline it is a service with a price, a speed and a failure rate.', 'A service that turns text into text.'],
          ['Token', 'A model does not read characters. It reads tokens, which are pieces of words. Plain English is about four characters a token. Prices, limits and speed are all counted in tokens, so a token is the unit of your bill.', 'The unit of cost, limit and speed.'],
          ['Context window', 'The most tokens that a model can read and write in one call. The prompt, the retrieved text, the history and the answer share it. A bigger window does not mean that the model uses every part of it equally well, so you still choose what goes in.', 'A limit that you budget, not a bin.'],
          ['Prompt and completion', 'The prompt is everything you send: the rules, the retrieved text, the question. The completion is what the model returns. You pay for both. The rules and the retrieved text are the part that a data pipeline controls.', 'You pay for what goes in and what comes out.'],
          ['Embedding', 'An embedding is a list of numbers that stands for the meaning of a text. Texts with similar meaning get lists that point in similar directions, so a program can find similar texts by comparing numbers. A separate embedding model makes them, and you store them next to the text.', 'Text turned into numbers that you can compare.'],
          ['RAG', 'Retrieval-augmented generation. Before the model answers, a search finds the passages of your documents that are related to the question, and they go into the prompt. The model writes from them, so the answer can use data that the model never saw in training, and can name its sources.', 'Search first, then write from what the search found.'],
          ['Agent and tool', 'A tool is a function that a model may ask your code to call: a search, a database query, a refund. An agent is a loop in which the model chooses a tool, reads the result, and chooses again, until it answers. The loop is code that you write, and the choices are the model\'s.', 'A loop in which the model picks the next step.'],
          ['Evaluation', 'A set of questions with known good answers, and a score for how a system does on them. Without it, every change to a prompt, a chunk size or a model is a guess. Evaluation is the part of an AI project that most teams build late, and regret.', 'The test suite of an AI system.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit.', t: 'For every word, ask what it costs and what limits it. A token costs money, a window limits size, an embedding costs storage, a tool costs risk, and an evaluation costs the time to write good questions.' }
      }),

      B.widget({ id: 'm1-tokens', kind: 'tokens', parts: [0], t: 1, src: 'rec', title: 'Lab: count tokens' }),

      B.flow({
        id: 'm1-flow', t: 1, src: 'docs', title: 'One question, from words to answer', g: 'query', legend: true,
        steps: [
          { say: 'A store manager asks about a refund. This is the path of that one question through a retrieval system. Every box is a place where a data engineer can improve the answer or break it. Press Next to follow it.', cap: 'One question through the system.' },
          { say: 'Step 1. The question arrives together with who is asking. The role of the person matters as much as the words, because it decides what may be searched.', on: ['a1'], focus: ['q_q', 'q_rw'], cap: 'The question and the person.' },
          { say: 'Step 2. Some systems rewrite the question first, for example by adding the words that the company uses. Measure that before you keep it. In my test, adding glossary words took the hybrid hit at 3 from ' + EX[1] + ' down to ' + EX[2] + '.', on: ['a1'], focus: ['q_rw'], cap: 'A rewrite is a change. Test it.' },
          { say: 'Step 3. Two searches run side by side. A keyword search looks for the words. A vector search looks for the nearest meaning. Each one finds things that the other misses.', on: ['a2a', 'a2b'], focus: ['q_kw', 'q_vec'], cap: 'Words and meaning, side by side.' },
          { say: 'Step 4. A filter runs inside the search: only chunks that this person may read, and only the current version. Without the second part, ' + ST.questions_with_a_v1_chunk_in_top5 + ' of my 24 questions had a chunk of the old handbook in the top 5.', on: ['a4'], focus: ['q_filt', 'q_vec'], cap: 'Filter inside the search, not after it.' },
          { say: 'Step 5. The two rankings are fused into one, for example by reciprocal rank fusion, which uses only the ranks and not the scores.', on: ['a3a', 'a3b'], focus: ['q_fuse'], cap: 'One ranking from two.' },
          { say: 'Step 6. The best chunks go into the prompt with the rules and the question. How many chunks, and how long they are, decides the cost of every answer.', on: ['a5'], focus: ['q_fuse', 'q_prompt'], cap: 'The prompt is the bill.' },
          { say: 'Step 7. The model writes the answer from the chunks and names its sources. Step 8. A check looks at the answer: does it cite a chunk, and was the person allowed to see that chunk? Then the answer goes out.', on: ['a6', 'a7', 'a8'], focus: ['q_prompt', 'q_model', 'q_check', 'q_ans'], cap: 'Write, check, answer.' },
          { say: 'Step 9. Everything is logged: the question, the ids of the chunks, the answer, the tokens and the cost. Without that log, nobody can say why an answer was wrong, and nobody can build the next test from it.', on: ['a9'], focus: ['q_model', 'q_log'], cap: 'The log is the memory of the system.' }
        ]
      }),

      B.cmp({
        id: 'm1-choose', t: 1, src: 'docs', title: 'Four ways to give a model your knowledge',
        say: 'A model knows what it saw in training and nothing about your company. There are four ways to close that gap. Press Next to read them. Most real systems mix them, and each one puts the data work in a different place.',
        cols: ['Approach', 'What it does', 'Good for', 'Weak at'],
        hl: 1,
        rows: [
          ['A long prompt', 'Put the whole document in the prompt.', 'A few pages, a one-off question, a quick test.', 'Cost on every call, a size limit, and no control over who sees what.'],
          ['Retrieval (RAG)', 'Search your documents and put the best passages in the prompt.', 'Facts that change, many documents, sources that must be cited.', 'Questions that need the whole of a long text, and a search that misses.'],
          ['Fine-tuning', 'Train the model further on your examples.', 'A style, a format, a narrow task done the same way every time.', 'Facts that change, because new facts need new training.'],
          ['Tools and agents', 'Let the model call code: a query, an API, a calculation.', 'Live data, exact numbers, actions in other systems.', 'Cost and risk: each call can fail or do harm.']
        ],
        steps: [
          { upto: 1, say: 'A long prompt is the simplest thing that can work, and the first thing to try. It stops working when the documents no longer fit, or when the bill arrives, or when people must not all see the same text.' },
          { upto: 2, say: 'Retrieval moves the knowledge out of the model and into an index that you control. You can update it, delete from it and filter it per person. That is why it is the usual answer for company documents.' },
          { upto: 3, say: 'Fine-tuning changes how a model behaves, not what it knows today. It suits a tone, a format or a classification. Do not use it to teach a refund window that will change in March.' },
          { upto: 4, say: 'Tools give a model exact and live data, such as the number of orders completed yesterday, which no document holds. They are also the part that can do damage, so they get the most careful design.' }
        ],
        pick: 'A good habit: try the **long prompt** first to see what the model can do, move to **retrieval** when the documents grow or change, add **tools** when the answer needs live or exact data, and consider **fine-tuning** last, for behaviour.'
      }),

      B.talk({
        id: 'm1-where', t: 1, src: 'docs', title: 'Where the data engineer owns quality',
        say: 'A model is somebody else\'s product. These are the places in an AI system where the work and the blame fall on the data side. Press Next for each one.',
        items: [
          ['The text', 'Parsing and cleaning decide what the model can ever read. A table flattened into a row of words, a header copied onto every page and a scanned file with no text are all losses that no prompt can repair. Mission 2.', 'Garbage in, confident garbage out.'],
          ['The chunks', 'The cut decides what can be found. A fact split across two chunks is found by neither. Mission 3.', 'The border of a chunk is a design decision.'],
          ['The index', 'The index must be fresh, labelled and safe to rebuild. A deleted document must leave it, and a new embedding model needs a new index. Missions 4 and 5.', 'An index is a dataset with a release process.'],
          ['The access', 'The label of who may read a document must travel to every chunk, and the filter must run inside the search. Missions 5 and 12.', 'Retrieval does not know about permissions. You do.'],
          ['The questions', 'The evaluation set is data that a data engineer can own: the questions, the right chunks, the answers, and the checks that run on every change. Mission 6.', 'No score, no release.'],
          ['The bill and the speed', 'Tokens, calls, caches, retries and timeouts decide the cost and the delay. Missions 7 and 13.', 'Cost is a pipeline property.'],
          ['The record', 'Traces, logs and lineage let you explain an answer after the fact: which document, which version, which model, which prompt. Mission 11.', 'If you cannot trace it, you cannot fix it.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm1-dec', t: 1, src: 'docs', title: 'Decision: how does the assistant answer an order count?',
        scenario: 'A store manager asks: **"How many orders were completed yesterday in Utrecht?"** The orders live in a table in the warehouse and change every minute. You are choosing how the assistant gets the number.',
        opts: [
          { t: 'Put yesterday\'s order table in the prompt', d: 'Simple, and the model can count.', lose: 'The table is large and changes. Models are poor at exact counting over thousands of rows, the prompt costs a lot on every call, and every manager would see every row.' },
          { t: 'Turn the order rows into chunks and search them', d: 'One system for everything.', lose: 'A search returns a few similar rows, not all of them. A count over similar rows is a wrong number that looks right.' },
          { t: 'Give the model a read-only tool that runs a counting query, and return the number', d: 'The database does the counting. The model only asks and explains.' }
        ],
        pick: 2,
        why: 'A count is an exact question, and a database answers exact questions. The model chooses the tool and the arguments, a narrow read-only query runs, and a number comes back. Missions 8 and 9 build this tool and a guard in front of it.',
        when: 'If the question is about the meaning of a policy, retrieval is right. If it needs live numbers, use a tool. Many questions need both, and an agent can use both.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A prompt holds the rules, five retrieved chunks and the question. The answer is cut off in the middle of a sentence. What is the likely cause?',
        opts: [
          { t: 'The prompt and the answer together reached the context window, or the answer hit the `max_tokens` limit', fb: '' },
          { t: 'The model got tired', fb: 'Models do not tire. A limit was reached.' },
          { t: 'The chunks were in the wrong language', fb: 'A language does not cut an answer in the middle of a sentence.' },
          { t: 'The vector index is out of date', fb: 'An old index gives wrong chunks, not a cut-off answer.' }
        ],
        ok: 0, why: 'Every call has two limits: the window shared by prompt and answer, and the `max_tokens` that you set for the answer. A stop reason in the response tells you which one was hit. Budget the prompt so there is room for the answer.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Why can the same sentence cost far more tokens in one language or format than in another?',
        opts: [
          { t: 'A tokenizer splits text into pieces it learned from its training text, so text that looks unlike that text splits into many small pieces', fb: '' },
          { t: 'The provider charges extra for some languages', fb: 'The price per token is the same. The number of tokens is what changes.' },
          { t: 'Models cannot read some languages', fb: 'They can. The tokenizer just uses more pieces.' },
          { t: 'The characters are stored in a different file format', fb: 'Storage format is not the cause. The tokenizer is.' }
        ],
        ok: 0, why: 'A tokenizer learned its pieces from the text it was trained on. A product code, a long number, JSON or Thai script splits into many short pieces, while common English words are one piece. The lab above showed this with a tokenizer trained on the Brewline text.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'A vector search for "Can a shopper get reimbursed for beans they have not opened?" returns the five nearest chunks. What does that list promise?',
        opts: [
          { t: 'Nothing about being right: it lists the chunks whose vectors are nearest, and the right chunk may be missing', fb: '' },
          { t: 'That the first chunk contains the answer', fb: 'The nearest vector is the nearest by the embedding model, which may be wrong.' },
          { t: 'That all five chunks may be shown to any user', fb: 'Permission is a separate check. Retrieval does not know about it.' },
          { t: 'That the chunks come from the current version', fb: 'An old version is just as near. A label and a filter are needed.' }
        ],
        ok: 0, why: 'A vector search ranks by nearness, nothing more. In my recording the stand-in embedding put the right chunk at rank 9 for exactly this question, and the keyword search did not find it in the top 10 at all. You measure the search with questions, and you do not trust it.'
      }),

      B.quiz({
        id: 'm1-q4', t: 1,
        q: 'The refund window changes every few months. Which approach suits a question about it?',
        opts: [
          { t: 'Retrieval from the current handbook, with the version as a label', fb: '' },
          { t: 'Fine-tuning the model on the handbook every time', fb: 'It works and costs a training run for every change, and old facts can remain in the model.' },
          { t: 'Hard-coding the answer in the prompt rules', fb: 'It works until someone forgets to change it. The handbook should be the source.' },
          { t: 'Asking the model to guess from its general knowledge', fb: 'The model has never seen the Brewline handbook.' }
        ],
        ok: 0, why: 'A fact that changes belongs in a document that you can update, search and version. Retrieval reads the current one at question time, so the next answer is right the moment the index is updated.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the stages of a retrieval system in order.',
        items: [
          'Parse the documents into text, with labels',
          'Cut the text into chunks',
          'Turn each chunk into a vector and store it in the index',
          'Retrieve the best chunks for a question, with a filter for the person',
          'Build a prompt from the rules, the chunks and the question',
          'Call the model and read its answer',
          'Check the answer and log the run'
        ],
        why: 'The first three stages run when documents change. The last four run when a question arrives. A data engineer owns the first three almost completely, and shares the rest.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'This function answers questions from the company policies. It works in a demo and fails in production. Click the line that causes the trouble.',
        file: 'assistant.py', lang: 'python', code: BUG, bad: [2],
        hint: 'What happens when the file grows, and who is asking?',
        why: 'Line 2 puts the whole handbook in every prompt. It costs tokens on every call, it stops working when the file outgrows the window, it gives the same text to every user whatever they may read, and it sends old versions along with new ones. Retrieval sends only a few chunks that this person may read.',
        fix: FIX,
        cheer: 'Send what is needed, not everything.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'docs', title: 'Incident: the bill tripled after the launch', time: '09:40',
        alert: '**The daily token spend of the assistant is three times higher than last week, with the same number of questions.** The average prompt grew from about 900 tokens to about 2,700. Over the weekend someone raised the number of chunks per prompt from 3 to 10 and doubled the chunk size, hoping for better answers.',
        clues: ['Questions per day are unchanged', 'The prompt length grew threefold', 'Two settings changed on the same day', 'Nobody ran the evaluation set before the change'],
        opts: [
          { t: 'Run the evaluation set with the old and the new settings, compare score and cost, and keep the cheaper one that holds the score', fb: '' },
          { t: 'Switch to a cheaper model today and leave the settings', fb: 'It hides the cause and may lower the quality. The extra tokens are still sent.' },
          { t: 'Ask users to ask shorter questions', fb: 'The question is a tiny part of the prompt. The chunks are the bulk of it.' },
          { t: 'Remove the rules from the prompt to save tokens', fb: 'The rules are a small part, and they keep the answers safe.' }
        ],
        best: 0,
        why: 'Two settings changed at once and nothing measured them. The chunks are most of the prompt, so the number and the size of chunks drive the bill. An evaluation run on both settings shows whether the extra text bought any quality. If it did not, go back. If it did, choose the cheapest setting that keeps the score.',
        checks: [
          ['Read the prompt', 'Look at a logged prompt and count where the tokens are: rules, chunks, question.'],
          ['Find the change', 'List the settings that changed this week and when.'],
          ['Measure both', 'Run the same questions with the old and the new settings, and compare the score and the cost.'],
          ['Choose', 'Keep the cheapest setting that holds the score. Set it in code review, not in a dashboard.'],
          ['Guard', 'Add a daily token budget alert and put the evaluation run into the release steps.']
        ],
        tell: 'Our token spend tripled with the same traffic. The prompt had grown from about 900 to 2,700 tokens because the number of chunks went from 3 to 10 and the chunk size doubled, with no evaluation run first. I ran the evaluation set on both settings, compared the scores and the cost, and went back to the cheaper one that kept the score. I added a token budget alert, and made an evaluation run part of every change to retrieval settings.',
        prevent: ['Change **one setting at a time**, and run the **evaluation set** first', 'Alert on **tokens per request** and on the daily total', 'Log the **length of each part** of the prompt', 'Put retrieval settings in **code review**']
      }),

      B.qa({
        id: 'qa-ai-de', t: 1, tag: 'Basics', secs: 60,
        q: 'What does a data engineer do on an AI project?',
        pts: ['Gets documents and data in, parsed, cleaned and labelled', 'Chunks, embeds and indexes them, and keeps the index fresh', 'Controls who can read what, from the document to the chunk', 'Builds the evaluation data and the checks', 'Watches cost, speed and failures', 'Keeps lineage so an answer can be explained'],
        short: 'The model is a service that someone else built, and my work is the data that goes into it and the pipeline around it. I get the documents in and parse them into clean text with labels such as audience, version and whether it is current. I chunk the text, embed it, and keep the index fresh, with deletes and a safe way to change the embedding model.\n\nI make sure access control travels from the document to every chunk, and that the filter runs inside the search. I build the evaluation set, so that every change to a chunk size, a prompt or a model is scored before it ships. I watch cost and delay in tokens, calls and retries, and I keep traces and lineage so that I can say which document and which version produced an answer.\n\nIn short, I treat the index and the question set as datasets with owners, tests and releases.',
        fu: [
          ['What is the first thing you would build?', 'The evaluation set: twenty or thirty real questions with the right chunk and a good answer. Everything else is tuned against it.'],
          ['How is this different from a normal pipeline?', 'The output is judged by meaning, not by a schema, so I need scores instead of equality checks, and the consumer is a model that can be misled by the data.']
        ],
        trap: 'Describing only the model call. The interviewer wants the data side: parsing, labels, freshness, access and evaluation.',
        real: 'Describe an index or a dataset you kept fresh, and how you knew it was right.'
      }),

      B.qa({
        id: 'qa-rag', t: 1, tag: 'Basics', secs: 60,
        q: 'Explain retrieval-augmented generation to a colleague who has never heard of it.',
        pts: ['A model does not know your documents', 'Search finds the passages that relate to the question', 'The passages go into the prompt with the question', 'The model writes from them and can cite them', 'The index can change without retraining', 'Quality depends on the search as much as the model'],
        short: 'A language model knows what it saw in training and nothing about our company documents. Retrieval-augmented generation fixes that at question time. First a search finds the passages of our documents that relate to the question. Then those passages go into the prompt together with the question and some rules, and the model writes the answer from them and names its sources.\n\nThe benefit is that I update the knowledge by updating an index, not by retraining a model, so a changed refund window is live as soon as the document is re-indexed. I can also delete a document, filter by who may read it, and show the source.\n\nThe catch is that the answer is only as good as the search. If the right passage is not retrieved, the model either says it does not know or invents something, so I measure retrieval separately, with questions that have known right passages.',
        fu: [
          ['What are the two parts that can fail?', 'The retrieval, which may miss or return the wrong passage, and the generation, which may ignore or distort the passage. I score them separately.'],
          ['Why not put every document in the prompt?', 'It costs tokens on every call, it hits the window, and it ignores who is allowed to read what.']
        ],
        trap: 'Saying that the model "learns" the documents. It only reads the retrieved text for that one call.',
        real: 'Describe a question that retrieval answered well and one that it missed.'
      }),

      B.qa({
        id: 'qa-ragft', t: 1, tag: 'Basics', secs: 60,
        q: 'When would you choose retrieval, and when fine-tuning?',
        pts: ['Retrieval for facts that change or must be cited', 'Fine-tuning for behaviour: style, format, a narrow task', 'Fine-tuning does not update facts cheaply', 'Retrieval allows deletes and per-user filters', 'They combine: a tuned model reading retrieved text', 'Try the prompt first, then measure'],
        short: 'I use retrieval when the answer depends on facts that change, that must be cited, or that only some people may see. The knowledge lives in an index that I update, filter and delete from.\n\nI use fine-tuning when the problem is behaviour: a fixed output format, a house style, or a narrow classification that must be done the same way every time and where examples are easy to collect. Fine-tuning does not update facts cheaply, because a new fact needs new training, and a deleted document may still sit in the weights.\n\nThey combine: a fine-tuned model can read retrieved text. I start with a good prompt and retrieval, build the evaluation set, and only consider fine-tuning when the scores show a behaviour problem that prompts cannot fix.',
        fu: [
          ['What would convince you to fine-tune?', 'A stable task, hundreds of good examples, and an evaluation that shows the prompt cannot reach the quality or the cost that I need.'],
          ['Can fine-tuning teach the handbook?', 'Partly, and badly: it may recall the old version, and it cannot show a source or respect permissions.']
        ],
        trap: 'Fine-tuning to teach facts. It is the wrong tool for knowledge that changes.',
        real: 'Describe a case where you chose between the two and what the scores said.'
      }),

      B.qa({
        id: 'qa-embed', t: 1, tag: 'Basics', secs: 60,
        q: 'What is an embedding, and how does a vector search work?',
        pts: ['A list of numbers that stands for the meaning of a text', 'Made by an embedding model, with a fixed size', 'Similar texts get vectors that point the same way', 'A query is embedded with the same model', 'The search returns the nearest vectors by cosine or dot product', 'An index makes it fast by being approximate'],
        short: 'An embedding is a list of numbers, usually hundreds or a few thousand, that an embedding model produces for a text. The model is trained so that texts with similar meaning get vectors that point in similar directions.\n\nFor search, I embed every chunk once and store the vectors. At question time I embed the question with the same model, and look for the stored vectors that are nearest, usually by cosine similarity or the dot product. That finds chunks about the same thing even when the words differ, which a keyword search cannot do.\n\nComparing the question with every vector gets slow at scale, so an index such as HNSW or IVF searches only part of the data. That makes it approximate: it can miss a true neighbour. So I measure recall, and I keep the model name with the index, because vectors from different models cannot be compared.',
        fu: [
          ['Why must the same model embed the question and the chunks?', 'Each model has its own space. The numbers of one model mean nothing in the space of another, even when the size is the same.'],
          ['What does an embedding not capture?', 'Exact tokens such as codes, numbers and rare names. A keyword search is better at those, which is why I mix the two.']
        ],
        trap: 'Saying that the vector is the meaning. It is one model\'s numeric summary, and it is wrong in ways that a test finds.',
        real: 'Describe how you tested whether a search returned the right passages.'
      }),

      B.qa({
        id: 'qa-ctx', t: 1, tag: 'Basics', secs: 60,
        q: 'What is a context window, and how does it shape the design of a retrieval system?',
        pts: ['The most tokens in one call, prompt and answer together', 'It limits how much text can go in', 'Cost grows with every token that goes in', 'A long window is not equally well used in all places', 'So retrieve a few good chunks and budget the prompt', 'Leave room for the answer'],
        short: 'The context window is the most tokens that a model can handle in one call, and the prompt and the answer share it. It sets a hard limit on how much text can go in, so I cannot send the whole handbook, and it ties cost to size, because I pay for every token that goes in on every call.\n\nA longer window helps, and it is not a free pass: the model does not always use every part of a long prompt equally well, and a long prompt costs more and takes longer.\n\nSo I design for a budget. I retrieve a few good chunks instead of many, size the chunks so that the top few carry the answer, keep the rules short, and reserve room for the answer with a `max_tokens` setting. I log the length of each part of the prompt, so that a change in cost can be traced to a change in the prompt.',
        fu: [
          ['What happens when you exceed it?', 'The API returns an error, or your code must cut something. I decide in advance what to cut first, usually the lowest-ranked chunks, never the rules.'],
          ['Does a bigger window remove the need for retrieval?', 'No. It still costs on every call, ignores permissions, and does not scale to a whole document store.']
        ],
        trap: 'Treating the window as storage. It is a per-call budget.',
        real: 'Describe how you budgeted a prompt, and what you cut first.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Platform Mapper', color: '#DDD6FE',
        pts: [
          'A **token** is the unit of cost, limit and speed. A **context window** is a per-call budget that the prompt and the answer share.',
          'An **embedding** is a list of numbers from a model. A **vector search** returns the nearest ones, and nearest is not the same as right.',
          '**Retrieval** gives a model facts at question time. **Fine-tuning** changes behaviour. **Tools** give exact and live data. Most systems mix them.',
          'A question passes through **filter, two searches, fusion, a prompt, a model, a check and a log**. The data engineer owns the text, the chunks, the index, the access and the questions.',
          'Measure every change on a **question set** before it ships. Change one setting at a time.'
        ],
        lines: [
          'I ask what each word costs and what limits it.',
          'I give a model the smallest text that holds the answer.',
          'I treat the index and the question set as datasets with owners.'
        ]
      })
    ]
  });
})();
