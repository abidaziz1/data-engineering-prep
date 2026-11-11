/* Mission 6: evaluation. The golden set, the scores (hit at k, MRR, nDCG), how sure a score on 24 questions is, a release gate that compares two
   builds question by question, and cheap checks of an answer were run on the real chunks and real per-question results of the Brewline course.
   The answers that the checks look at are written by hand, because no language model was used. Scoring answers with a model (LLM as judge),
   and online signals, come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var EK = G.file('code/evalkit.py'), GOLD = G.file('eval/golden.jsonl');
  var GT = G.table('eval.gate').rows, GD = G.counts('eval.gate_detail'), NZ = G.counts('eval.noise'), AC = G.table('eval.answer_checks').rows, ME = G.table('search.methods').rows;
  function cand(name) { return GD.candidates[name]; }
  var FIX = cand('fixed 500 characters, no overlap'), GLO = cand('glossary words added to each question'), VEC = cand('vector search only (stand-in)'), KEY = cand('keyword search only'), S150 = cand('recursive 150 characters');
  G.expect(GD['baseline_hit@3'] === 0.875 && FIX.verdict === 'fail' && FIX.cand === 0.75 && FIX.worse.length === 3 && FIX.better.length === 0, 'the fixed 500 candidate fails the gate');
  G.expect(GLO.verdict === 'fail' && GLO.kinds.meaning[1] > GLO.kinds.meaning[0] && GLO.kinds.words[1] < GLO.kinds.words[0] && GLO.worse.length === 5 && GLO.better.length === 2, 'glossary words help meaning questions and hurt word questions');
  G.expect(VEC.verdict === 'fail' && VEC.worse.join() === 'q12,q18' && VEC.kinds.table[1] === 0 && VEC.kinds.table[2] === 1, 'the vector-only candidate loses the table question, which a kind rule with a minimum of 3 cannot see');
  G.expect(KEY.verdict === 'pass' && KEY.worse.length === 0 && KEY.better.length === 0 && S150.verdict === 'fail', 'keyword only passes with the same questions');
  G.expect(NZ.methods['BM25 (keywords)'].hits === 21 && NZ.methods['vector (stand-in)'].hits === 19 && NZ.methods['vector (stand-in)'].high > NZ.methods['BM25 (keywords)'].low, 'the intervals of keyword and vector search overlap');
  G.expect(AC.length === 6 && AC[0][3] === 'yes' && AC[1][3] === 'no' && AC[5][3] === 'yes', 'the answer checks');
  var BUG1 = [
    'GOLDEN = [',
    '    {"q": "How many days do customers have to return a bag of beans?", "right_chunk": "handbook-v2:3"},',
    '    {"q": "Where is the assembly point in a fire?", "right_chunk": "runbook:2"},',
    ']',
    '',
    'def hit_at_3(item):',
    '    return item["right_chunk"] in [c.id for c in search(item["q"])[:3]]'
  ].join('\n');
  var FIX1 = [
    'GOLDEN = [',
    '    {"q": "How many days do customers have to return a bag of beans?", "key_phrase": "within 14 days of purchase"},',
    '    {"q": "Where is the assembly point in a fire?", "key_phrase": "assembly point by the bus stop"},',
    ']',
    '',
    'def hit_at_3(item):',
    '    return any(item["key_phrase"] in c.text for c in search(item["q"])[:3])'
  ].join('\n');
  var BUG2 = [
    'questions = load_questions()                      # the 24 questions',
    'best = max(SETTINGS, key=lambda s: score(s, questions))',
    'print("hit@3 of the chosen setting:", score(best, questions))'
  ].join('\n');
  var FIX2 = [
    'dev, test = split_by_topic(load_questions(), seed=1)    # keep some questions out of the tuning',
    'best = max(SETTINGS, key=lambda s: score(s, dev))',
    'print("hit@3 on questions never used for tuning:", score(best, test))'
  ].join('\n');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Evaluation', short: 'Evaluation', blurb: 'A golden set, scores, noise, a gate for every change, and cheap checks of an answer', minutes: 50,
    focus: ['mon', 'qual'],
    goals: [
      'Build a **golden set** that marks the right passage by its words, not by an id.',
      'Compute and explain **hit at k, MRR and nDCG**, and choose the one that fits the question.',
      'Say what a score on **24 questions** can and cannot tell you.',
      'Run a **release gate** that compares two builds question by question and by kind.',
      'Add **cheap answer checks**: citations, permissions and numbers that must come from the source.',
      'Explain **LLM-as-judge**, and its risks, before you rely on one.'
    ],
    say: 'Mission 6 is evaluation, which most teams build late and then wish they had built first. Everything changes an answer: a chunk size, a prompt, a model, a filter. Without a score, each change is an opinion. I scored the Brewline assistant on 24 questions, ran a gate on five candidate changes, and checked six hand-written answers with code. I could not run a model to judge answers, so that part is documentation, and I say so.',
    scenes: [
      B.talk({
        id: 'm6-talk', t: 1, src: 'docs', title: 'Why evaluation comes first',
        say: 'An assistant can be wrong in a way that sounds right. Evaluation is how you find out before a customer does. Press Next for the layers.',
        items: [
          ['Retrieval', 'Did the search return a chunk that holds the answer? This is a plain lookup with a right answer, and you can score it with no model at all: hit at k, MRR, nDCG. Most wrong answers of a RAG system start here.', 'Score the search without a model.'],
          ['Generation', 'Given the right chunks, did the model write a correct, grounded answer? This is harder to score. Cheap checks catch some cases: a missing citation, a number that is not in the source. A model that judges, or a person, catches the rest.', 'Cheap checks first, then a judge.'],
          ['End to end', 'The whole system on a real question: answer, sources, speed and cost. This is what the user feels, and it is the sum of the two layers above. Score the layers separately so you know which one to fix.', 'Know which layer failed.'],
          ['Offline and online', 'Offline: a fixed set of questions that you run before every release. Online: signals from real use, such as thumbs, edits, escalations, no-answer rates, latency and cost. Offline gates a release. Online finds the questions you did not think of.', 'Offline gates, online discovers.'],
          ['The loop', 'A bad answer in production becomes a new question in the golden set, with its right passage. The set grows from real failures, and the same failure cannot return unseen.', 'Every failure becomes a test.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm6-golden', t: 1, src: 'rec', title: 'A golden set is a file, one question to a line', file: 'golden.jsonl', lang: 'json', code: GOLD,
        steps: [
          { say: 'This is the format of the golden set, with three of the 24 lines. One question to a line, so that a diff in code review shows exactly which question was added or changed. A set that lives only in a spreadsheet gets edited without review.', lines: null },
          { say: '`question` and `kind` say what is asked and what sort of question it is. The kind is what lets you score by kind later: words, meaning, number, code, table, stale.', lines: G.span(GOLD, /"id": "q01"/, /"id": "q01"/) },
          { say: '`key_phrase` marks the right passage by its words: any chunk that contains `within 14 days of purchase` counts as right. Never mark it by a chunk id. The ids change whenever the chunker changes, and the whole set would become wrong.', lines: G.span(GOLD, /"id": "q01"/, /"id": "q01"/) },
          { say: '`expected` is the answer that a person would accept. It is what a reviewer or a judge compares with. And `audience` and `refuse_for` say who may read the source. For q04 the source is a finance document, so a manager must get a refusal, not a guess.', lines: G.span(GOLD, /"id": "q04"/, /"id": "q04"/) },
          { say: 'Note q09: "reimbursed" for "refund". It has the same key phrase as q01. Two questions can point at one passage. A set needs questions in other words, because real users do not copy the handbook.', lines: G.span(GOLD, /"id": "q09"/, /"id": "q09"/) }
        ],
        note: 'The Brewline questions are written by me for the story. A real golden set starts from real questions from the logs or from the people who will use the assistant, and an expert marks the right passage.'
      }),

      B.widget({ id: 'm6-rank-lab', kind: 'rank', t: 1, src: 'rec', title: 'Lab: score the searches, compute a metric by hand, fuse two rankings' }),

      B.cmp({
        id: 'm6-metrics', t: 1, src: 'docs', title: 'Which metric for which question',
        say: 'Four metrics, four questions. Press Next to read them. You computed all of them in the lab, so the formulas are not new.',
        cols: ['Metric', 'It asks', 'Use it when', 'Blind to'],
        hl: 2,
        rows: [
          ['hit at k', 'Is a right chunk in the top k?', 'You send k chunks to the model, and one right chunk is enough.', 'How high the chunk is, and how many right chunks there are.'],
          ['recall at k', 'What share of all right chunks is in the top k?', 'An answer needs several chunks, for example an answer that spans two sections.', 'The order inside the top k.'],
          ['MRR', 'How high is the first right chunk?', 'Only the first right result matters, as with a single fact.', 'Everything after the first right chunk.'],
          ['nDCG', 'Are the right chunks near the top, with credit for each?', 'Several right chunks, and order matters, as when long prompts lose the middle.', 'Needs graded or complete labels, and is harder to explain.']
        ],
        steps: [
          { upto: 1, say: 'Hit at k is the easiest to explain to a manager: in how many questions did the right chunk make the top k? It matches the way the prompt is built, with the top k chunks.' },
          { upto: 2, say: 'Recall at k asks about all right chunks. If an answer needs two chunks, a hit at 3 can be 1 with only one of them found, and recall tells you.' },
          { upto: 3, say: 'MRR rewards the first right chunk by one over its rank. A rank of 2 is 0.5, a rank of 10 is 0.1. It is a good single number for fact questions.' },
          { upto: 4, say: 'nDCG gives credit for every right chunk, discounted by position. In the recording it was 0.809, 0.731 and 0.804 for the three searches, close to the MRR because most questions have one or two right chunks.' }
        ],
        pick: 'Report **hit at k for the k you send**, add **MRR** for a feel of the order, and keep **nDCG** for sets with several right chunks. Whatever you choose, **report it by kind**.'
      }),

      B.code({
        id: 'm6-noise', t: 1, src: 'rec', title: 'How sure is a score on 24 questions?', file: 'evalkit.py (wilson)', lang: 'python', code: G.lines(EK, G.at(EK, /^def wilson/), G.span(EK, /^def wilson/, /return \(round\(centre - half/)[1]),
        steps: [
          { say: 'The Brewline set has 24 questions, so one question is worth ' + NZ.one_question_is + ' of a score. This function gives a 95 percent interval for a share that was measured on n questions. It is the Wilson interval, a standard choice for small samples.', lines: null },
          { say: 'It takes the number of hits and the number of questions. With 21 hits of 24, the share is 0.875.', lines: G.span(G.lines(EK, G.at(EK, /^def wilson/), G.span(EK, /^def wilson/, /return \(round\(centre - half/)[1]), /^def wilson/, /p = hits \/ n/) },
          { say: 'The interval for the keyword search is **' + NZ.methods['BM25 (keywords)'].low + ' to ' + NZ.methods['BM25 (keywords)'].high + '**, for 21 of 24. The interval of the stand-in vector search is **' + NZ.methods['vector (stand-in)'].low + ' to ' + NZ.methods['vector (stand-in)'].high + '**, for 19 of 24. They overlap by a lot.', lines: null },
          { say: 'So the data cannot say that the keyword search is better than the vector search, although 0.875 looks bigger than 0.792. The difference is two questions. To separate two methods that differ by this much, you need many more questions, or a paired comparison on the same questions, which the gate does next.', lines: null }
        ],
        note: 'This is a statement about the sample, not about the methods. A bigger, more varied question set narrows the interval. It does not make the stand-in embedding as good as a neural one.'
      }),

      B.code({
        id: 'm6-gate', t: 1, src: 'rec', title: 'A release gate that compares builds question by question', file: 'evalkit.py (gate)', lang: 'python', code: G.lines(EK, G.at(EK, /^def gate/), EK.split('\n').length),
        steps: [
          { say: 'A gate compares a candidate build with the current one on the same questions, and says pass or fail. It is plain code, run in CI before a release. It looks at the average, and at each kind of question, and it lists the questions that changed.', lines: null },
          { say: 'The inputs map each question id to its kind and to a hit or a miss. The two builds are compared on the same ids, so the comparison is paired: a question is either better, worse or the same.', lines: G.span(G.lines(EK, G.at(EK, /^def gate/), EK.split('\n').length), /^def gate/, /cand\[i\]\['hit'\] for i in ids\) \/ len\(ids\)/) },
          { say: '`worse` and `better` are the questions that flipped. This is the most useful output. Two builds can have the same average and fail on different questions, and only the list shows it.', lines: G.span(G.lines(EK, G.at(EK, /^def gate/), EK.split('\n').length), /worse = /, /better = /) },
          { say: 'The change by kind. A kind with at least `min_kind` questions may not fall by more than `kind_tolerance`. This catches a build that raises the average and breaks one kind of question.', lines: G.span(G.lines(EK, G.at(EK, /^def gate/), EK.split('\n').length), /kinds = \{\}/, /kinds\[k\] = /) },
          { say: 'The verdict: fail when the average fell by more than the tolerance, or a big enough kind fell too far. The reasons are written as text, so that a person reading the CI log knows what to fix.', lines: G.span(G.lines(EK, G.at(EK, /^def gate/), EK.split('\n').length), /reasons = \[\]/, /^    return \{/) }
        ],
        note: 'The tolerances are a policy of the team. Zero for the average and 0.2 for a kind were my choice for the course. Start strict, and loosen only with a reason that you write down.'
      }),

      B.cmp({
        id: 'm6-gate-run', t: 1, src: 'rec', title: 'Five candidate changes through the gate',
        say: 'The current build is the recursive 500-character chunker with hybrid search: hit at 3 of ' + GD['baseline_hit@3'] + '. Here are five changes that a team might try, run through the gate on the real per-question results. Press Next to read what the gate said.',
        cols: ['Candidate build', 'hit@3', 'Gate', 'Worse', 'Better'],
        hl: 2,
        rows: GT.map(function (r) { return [r[0], String(r[1]), r[2], r[3], r[4]]; }),
        steps: [
          { upto: 1, say: 'Fixed 500 characters with no overlap: fail. Three questions got worse, none better. This is the chunker that cut the assembly-point phrase in half.' },
          { upto: 2, say: 'Recursive chunks of 150 characters: fail. Five questions got worse and one better. In the kind table, `meaning` fell from ' + S150.kinds.meaning[0] + ' to ' + S150.kinds.meaning[1] + ', and the table question was lost.' },
          { upto: 3, say: 'Glossary words added to each question: fail, and the most interesting row. The questions in the kind `meaning` **improved** from ' + GLO.kinds.meaning[0] + ' to ' + GLO.kinds.meaning[1] + ', and the kind `words` fell from 1.0 to ' + GLO.kinds.words[1] + '. Five questions got worse and two better. A rewrite that helps vague questions and hurts clear ones needs a router, not a switch.' },
          { upto: 4, say: 'Vector search only: fail on the average, and look at the kind table: the one question about a table went from 1 to 0. The kind rule did not even say so, because a kind needs at least three questions to count.' },
          { upto: 5, say: 'Keyword search only: **pass**, with no question better or worse. The same hit at 3, on the same questions, as the hybrid. On this set the vector side added nothing, and a neural model might change that.' }
        ],
        pick: 'Read the **worse list** before the verdict. A pass with an empty list is clear. A fail with a good reason is useful. And **a kind with one question is invisible to a kind rule**, so safety-critical kinds need more than a few questions.'
      }),

      B.code({
        id: 'm6-check', t: 1, src: 'rec', title: 'Checking an answer without a model', file: 'evalkit.py (check_answer)', lang: 'python', code: G.lines(EK, G.at(EK, /^NUM = /), G.span(EK, /^def check_answer/, /return \{'ok': not problems, 'refused': False/)[1]),
        steps: [
          { say: 'Some wrong answers are visible without any model. This function takes the answer, the chunk ids that it cites, the chunks that were retrieved, and the ids that this person may read. It returns what is wrong. It is cheap, fast and deterministic, so it can run on every answer in production.', lines: null },
          { say: 'First, a refusal. If the assistant says it cannot find an answer, the check passes when it cites nothing. A refusal that cites a source is odd, and it is reported.', lines: G.span(G.lines(EK, G.at(EK, /^NUM = /), G.span(EK, /^def check_answer/, /return \{'ok': not problems, 'refused': False/)[1]), /startswith\('i cannot find'\)/, /return \{'ok': not cited, 'refused': True/) },
          { say: 'Then the citations. An answer must cite something. Each cited chunk must be one that was retrieved, so the model cannot invent a source. And each must be readable by this person, so a restricted chunk cannot leak through a citation.', lines: G.span(G.lines(EK, G.at(EK, /^NUM = /), G.span(EK, /^def check_answer/, /return \{'ok': not problems, 'refused': False/)[1]), /problems = \[\]/, /which this person may not read/) },
          { say: 'Last, the numbers. Every number in the answer must appear in a cited chunk. This is a crude groundedness check for facts such as days, amounts and codes, where a wrong digit is a wrong answer.', lines: G.span(G.lines(EK, G.at(EK, /^NUM = /), G.span(EK, /^def check_answer/, /return \{'ok': not problems, 'refused': False/)[1]), /support = /, /return \{'ok': not problems/) }
        ],
        note: 'It does not know whether the sentence around a number is true, or whether the answer is complete. It catches a class of errors that cost nothing to catch.'
      }),

      B.cmp({
        id: 'm6-checks-run', t: 1, src: 'rec', title: 'Six answers, written by hand, through the checks',
        say: 'I wrote six answers myself, because no model was used. Each one has a flaw, except two. Press Next to see which checks found what. The answers are made up, and the checks are real.',
        cols: ['Case', 'Cited', 'Pass', 'Problem found'],
        hl: 3,
        rows: AC.map(function (r) { return [r[0], r[2], r[3], r[4]]; }),
        steps: [
          { upto: 1, say: 'The good answer cites the right chunk of the current handbook, and the number 14 is in it. It passes.' },
          { upto: 2, say: 'The wrong number says 30 days. It cites the right chunk, which says 14. The number check catches it: `' + AC[1][4] + '`. This is exactly the error that the old handbook would cause.' },
          { upto: 3, say: 'An invented source: the answer cites `handbook-v2:99`, a chunk that was never retrieved. The check says so, and adds that the number is not in any cited source.' },
          { upto: 4, say: 'A source that this person may not read. The text is true and comes from the supplier terms, a finance document, and the person is a manager. `' + AC[3][4] + '`. The number 40 is in the source, so only the permission check fails.' },
          { upto: 5, say: 'No source at all. A true-sounding answer with no citation cannot be checked by anyone, so it fails.' },
          { upto: 6, say: 'The refusal passes. For a question whose source this person may not read, "I cannot find that in the documents you may read" is the right answer, and the check treats it as one.' }
        ],
        pick: 'Put **cheap checks** on every answer in production, and count the failures as a metric. They catch invented sources, leaks and wrong numbers, and they leave the harder judgement to a model or a person.'
      }),

      B.talk({
        id: 'm6-judge', t: 2, src: 'docs', title: 'Scoring answers with a model',
        say: 'Many teams use a language model to judge answers, called LLM as judge. I did not run one, so this is documentation-level advice. Press Next for how it is used, and what goes wrong.',
        items: [
          ['What is judged', 'Groundedness or faithfulness: is every claim supported by the retrieved text? Answer relevance: does it address the question? Correctness against the expected answer. Context precision and recall: did retrieval return what was needed and little else? Frameworks such as RAGAS, TruLens and DeepEval package these.', 'Claims against the context.'],
          ['How it is run', 'A prompt gives the judge the question, the context, the answer and a rubric, and asks for a score or a verdict with a reason. A pairwise version asks which of two answers is better. Run it at low randomness, and keep the reasons, because they explain a score.', 'A rubric, a reason, and a score.'],
          ['What goes wrong', 'A judge can prefer longer answers, prefer the first one in a pair, prefer its own style, and miss subtle errors. Its scores drift when the judge model changes. It costs tokens on every run, and it can be wrong in the same direction as the model it judges.', 'A judge is a model with biases.'],
          ['How to trust it', 'Label a sample by hand, with two people and a rule for disagreement. Measure how often the judge agrees with them, per kind of question. Swap the order in pairs. Pin the judge model and version, and re-check the agreement when you change it. Use deterministic checks wherever they work.', 'Calibrate it against people.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'A rule.', t: 'A judge score without a measured agreement with humans is an opinion with a number on it.' }
      }),

      B.talk({
        id: 'm6-online', t: 2, src: 'docs', title: 'Signals from production',
        say: 'An offline set has the questions you thought of. Production has the others. Press Next for the signals worth collecting, and what to do with them.',
        items: [
          ['Explicit feedback', 'A thumb up or down, a short reason, an edit of the answer by a manager. Few people click, so treat a thumb as a sample, and read the thumbs down one by one.', 'Rare, and worth reading.'],
          ['Behaviour', 'A user who asks the same question again in other words, a conversation that ends right after an answer, a handover to a person, a copy of the answer. Each is a weak sign that an answer failed or worked.', 'Silent signs of success and failure.'],
          ['System signals', 'The share of questions with no answer or a refusal, the number of chunks cited, latency, tokens and cost per answer, and the failure rate of the cheap checks. A sudden change in any of them is an alarm.', 'Rates, not single events.'],
          ['Back to the set', 'Sample real failures every week, have an expert mark the right passage, and add them to the golden set with a kind. The set then grows toward what users really ask, and each fixed failure stays fixed.', 'Production feeds the golden set.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'The assistant sends the top 3 chunks to the model. Which metric fits the question "did the model get a right chunk?"',
        opts: [
          { t: 'Hit at 3', fb: '' },
          { t: 'MRR at 10', fb: 'It rewards position inside the top ten, which the prompt does not use.' },
          { t: 'nDCG at 10', fb: 'It looks at ten places, and the prompt holds three.' },
          { t: 'Latency', fb: 'Latency is speed. It says nothing about the content.' }
        ],
        ok: 0, why: 'Match the metric to how the result is used. If the prompt holds three chunks, then hit at 3 is the share of questions where the model could answer. MRR and nDCG describe order, and they matter when position matters.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'Keyword search scored 21 of 24 on hit at 3, and the stand-in vector search scored 19 of 24. A colleague says keyword search is clearly better. What do you say?',
        opts: [
          { t: 'The intervals overlap a lot (' + NZ.methods['BM25 (keywords)'].low + ' to ' + NZ.methods['BM25 (keywords)'].high + ' and ' + NZ.methods['vector (stand-in)'].low + ' to ' + NZ.methods['vector (stand-in)'].high + '), so 24 questions cannot say it', fb: '' },
          { t: 'Yes, 0.875 is higher than 0.792', fb: 'A higher number from a small sample is not a proven difference.' },
          { t: 'No, vector search is always better', fb: 'There is no such rule, and the data does not show it either.' },
          { t: 'Run it again, the result will change', fb: 'The scores are deterministic. The uncertainty is from the small sample.' }
        ],
        ok: 0, why: 'Two questions of difference is within the noise of a sample of 24. More questions would narrow the intervals, and a paired comparison question by question, as in the gate, uses the data better than two averages.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'The gate passed the keyword-only build with hit at 3 of 0.875 and empty lists of better and worse questions. The same average with other questions flipped is also possible. Why does the list matter?',
        opts: [
          { t: 'The same average can hide questions that got better and questions that got worse, and only the list shows them', fb: '' },
          { t: 'The list makes the gate faster', fb: 'Speed is not the point.' },
          { t: 'The list replaces the average', fb: 'It adds to it. You need both.' },
          { t: 'It is only needed for failing builds', fb: 'A pass with several flips also needs a look.' }
        ],
        ok: 0, why: 'The glossary-words candidate raised the questions of the kind meaning and lowered the kind words. An average alone would call it a small loss. The list says which questions moved, so a person can decide whether the trade is acceptable.'
      }),

      B.quiz({
        id: 'm6-q4', t: 1,
        q: 'An answer says "within 30 days" and cites a chunk that says "within 14 days". Which cheap check catches it?',
        opts: [
          { t: 'The number check: 30 does not appear in the cited chunk', fb: '' },
          { t: 'The citation check: the chunk was retrieved', fb: 'It was retrieved, so that check passes.' },
          { t: 'The permission check', fb: 'The person may read the chunk. The problem is the number.' },
          { t: 'None. Only a human can catch it', fb: 'A simple check catches this class of error.' }
        ],
        ok: 0, why: 'The check reads the numbers in the answer and looks for each of them in the cited text. It finds nothing for 30. It cannot judge the meaning of a sentence, and it catches a wrong digit for free.'
      }),

      B.quiz({
        id: 'm6-q5', t: 2,
        q: 'A kind of question has one question in the golden set, the allergen table, and the kind rule of the gate needs at least 3 questions in a kind. A change breaks that question. What does the gate say about the kind?',
        opts: [
          { t: 'Nothing. A kind below the minimum is not checked, so the break shows only in the worse list and maybe in the average', fb: '' },
          { t: 'It fails the build, because every kind is checked', fb: 'Only kinds with at least the minimum number of questions are checked.' },
          { t: 'It passes the build and lists the kind as improved', fb: 'The question got worse, not better.' },
          { t: 'It raises an error', fb: 'No error. It is a silent gap in the rule.' }
        ],
        ok: 0, why: 'In the recording the vector-only build lost the one table question, and the reasons list had only the average. A kind with one question cannot carry a percentage rule. Add more questions to kinds that matter for safety, such as allergens, or add a rule that no question of a critical kind may get worse.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the building of an evaluation loop in order.',
        items: [
          'Collect real questions, and write more in other words',
          'Have an expert mark the right passage by its key phrase, and give each question a kind',
          'Run retrieval and score hit at k and MRR, by kind',
          'Add cheap checks of citations, permissions and numbers',
          'Set a gate, and run it in CI on every change',
          'Add failures from production to the set every week'
        ],
        why: 'The questions and the labels come first. The scores give a baseline. The gate makes the baseline a rule, and the weekly additions keep the set honest as the system and the users change.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'This evaluation passed yesterday and fails today for every question, after the chunker was changed. Click the line that makes the set fragile.',
        file: 'golden.py', lang: 'python', code: BUG1, bad: [2],
        hint: 'What changes when the chunker changes?',
        why: 'The right passage is marked by a chunk id. A chunk id is made from the document and the position, and a new chunker moves every border, so every id points at something else or at nothing. Mark the passage by a key phrase that any chunk can contain, as the Brewline golden set does.',
        fix: FIX1,
        cheer: 'Mark the passage by its words.'
      }),

      B.bug({
        id: 'm6-bug2', t: 2, q: 'A team picks the best chunk setting and reports its score. In production the score is lower. Click the line that explains it.',
        file: 'tune.py', lang: 'python', code: BUG2, bad: [3],
        hint: 'Which questions chose the setting, and which ones report it?',
        why: 'The same questions chose the best setting and measured it, so the number is the best of several tries on its own data. It is too optimistic. Keep some questions out of the tuning, and report on those. With only 24 questions this is hard, which is one more reason to grow the set from real logs.',
        fix: FIX2,
        cheer: 'Report on questions you did not tune on.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'rec', title: 'Decision: the glossary rewrite helps one kind and hurts another',
        scenario: 'A teammate proposes to add glossary words to every question. The gate says: hit at 3 from ' + GD['baseline_hit@3'] + ' to ' + GLO.cand + ', kind `meaning` up from ' + GLO.kinds.meaning[0] + ' to ' + GLO.kinds.meaning[1] + ', kind `words` down from 1.0 to ' + GLO.kinds.words[1] + '. Five questions got worse and two better. The release is tomorrow.',
        opts: [
          { t: 'Ship it. Two questions are better, and the loss is within noise', d: 'The meaning questions are the hard ones, and they improved.', lose: 'Five clear questions broke. Those are the questions that managers ask most. "Within noise" is not a reason to accept a visible regression.' },
          { t: 'Reject it for now, and try a router that rewrites only vague questions, measured by kind', d: 'Keeps the gain on the hard kind and protects the clear one.' },
          { t: 'Lower the gate tolerance so that it passes', d: 'The release goes ahead.', lose: 'The gate exists to stop exactly this. Changing it to pass defeats it, and the next change will be judged by a looser rule.' }
        ],
        pick: 1,
        why: 'The gate found a trade, and the right response is to make the change smaller. A router that rewrites only questions that look vague, or only when the first search is weak, can keep the two gains. The same gate then decides.',
        when: 'If the clear questions are rare and the vague ones dominate your real traffic, shipping a rewrite may be right. Check the mix in the logs, not in the golden set, and write the decision down.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the allergen answers stopped', time: '12:10',
        alert: '**Managers report that the assistant no longer answers allergen questions such as "Which drinks contain tree nuts?".** Yesterday a change replaced the hybrid search with vector search only, "to simplify". The team looked at the average, which fell from ' + GD['baseline_hit@3'] + ' to ' + VEC.cand + ', judged it to be within noise, and shipped.',
        clues: ['The average fell by two questions out of 24', 'The gate lists `' + VEC.worse.join('` and `') + '` as worse', 'The one allergen table question went from found to missed', 'The kind rule needs three questions in a kind, and the allergen kind has one'],
        opts: [
          { t: 'Roll back to hybrid search, add allergen questions to the set, and add a rule that no question of a critical kind may get worse', fb: '' },
          { t: 'Tell managers to phrase allergen questions differently', fb: 'It moves the work to users, and an allergen answer is a safety matter.' },
          { t: 'Ask the model to answer allergen questions from its general knowledge', fb: 'The model does not know the Brewline menu. It would guess, which is worse.' },
          { t: 'Accept it: it was within noise', fb: 'Noise applies to averages. A table question that fails every time is a real regression for a kind of question.' }
        ],
        best: 0,
        why: 'The average hid it. The stand-in vector search cannot read the flattened table, and the keyword search can. Roll back first, because it is about allergens. Then add several allergen questions, make the allergen kind a critical kind with a zero-regression rule, and keep the worse list in the release review.',
        checks: [
          ['Reproduce', 'Ask the allergen question with both searches. Does the right chunk appear?'],
          ['Roll back', 'Move the alias or the flag back to hybrid search, and confirm with the question.'],
          ['Read the gate output', 'The worse list had the questions. The average alone did not.'],
          ['Strengthen the set', 'Add allergen questions, at least five, with the key phrases of the menu.'],
          ['Change the rule', 'Critical kinds may not lose a question, whatever the average says.']
        ],
        tell: 'A change to vector-only search lost our allergen answers. The team had read only the average, which fell by two questions and looked like noise, but the table question had gone from found to missed, because the stand-in vector search could not read a flattened table. I rolled back to hybrid search, added allergen questions to the set, and changed the gate so that no question of a critical kind may get worse. The worse list is now part of every release review.',
        prevent: ['Read the **worse list** as well as the average', 'Give **safety-critical kinds** enough questions and a **zero-regression rule**', 'Treat a **table or number question** as its own kind', 'Roll back first, then analyse']
      }),

      B.qa({
        id: 'qa-eval', t: 1, tag: 'Evaluation', secs: 90,
        q: 'How do you evaluate a RAG system?',
        pts: ['Score retrieval and generation separately', 'A golden set with questions, kinds and key phrases', 'Retrieval: hit at k, MRR, nDCG, by kind', 'Generation: cheap checks, then a judge or people', 'A gate in CI that compares builds question by question', 'Online signals feed new questions into the set'],
        short: 'I score the layers separately, so that I know what to fix. For retrieval I keep a golden set of real questions, each with a kind and the key phrase of the right passage, and I compute hit at k for the k that I send, MRR, and sometimes nDCG, and I report them by kind because averages hide failures.\n\nFor generation I start with cheap deterministic checks on every answer: is a source cited, was it retrieved, may this person read it, and does every number in the answer appear in the cited text. For the rest I use a model as a judge with a rubric, calibrated against a sample that people labelled, or a person.\n\nA gate in CI compares a candidate build with the current one, question by question, and by kind, and lists what got worse. Online, I watch thumbs, refusals, latency and cost, and I add sampled failures to the golden set every week.',
        fu: [
          ['What would you build first?', 'Twenty or thirty real questions with the right passages marked, and the retrieval score. It takes a day and pays for itself on the first change.'],
          ['How do you know the set is good?', 'It has questions in other words, every kind that matters, questions that must be refused, and it grows from real failures.']
        ],
        trap: 'Reporting one accuracy number for the whole system. It hides which layer and which kind failed.',
        real: 'Describe an evaluation you built and a change that it stopped.'
      }),

      B.qa({
        id: 'qa-golden', t: 1, tag: 'Evaluation', secs: 60,
        q: 'How do you build a golden set?',
        pts: ['Start from real questions, logs or interviews', 'Add questions in other words, and ones that must be refused', 'Mark the right passage by its key phrase, not by an id', 'Give each question a kind', 'Review changes to it like code', 'Grow it from production failures'],
        short: 'I start from real questions: from logs if there are any, otherwise from interviews with the people who will use the assistant. I add questions in other words than the documents use, because users do not copy the handbook, and questions that must be refused, for example when the answer sits in a document that a role may not read.\n\nA subject expert marks the right passage. I mark it by its key phrase, not by a chunk id, because ids change when the chunker changes and every label would break. Each question gets a kind, so that I can score by kind, and an expected answer for judging.\n\nI keep the set in a file with one question to a line and review changes like code. And I grow it: every week I sample failures from production and add them with their right passage, so that the set drifts toward what users really ask.',
        fu: [
          ['How many questions?', 'Start with twenty to thirty. With 24 questions, one question is four points, so I treat small differences as noise, and I grow the set.'],
          ['Can a model write the questions?', 'It can propose them, and a person must check the questions and the right passage. A model that writes the question from the passage tends to repeat its words.']
        ],
        trap: 'Marking the right chunk by id. The labels die with the next chunker.',
        real: 'Describe how you assembled a question set and who marked it.'
      }),

      B.qa({
        id: 'qa-metrics', t: 1, tag: 'Evaluation', secs: 60,
        q: 'Explain hit rate, MRR and nDCG, and when you use each.',
        pts: ['Hit at k: a right chunk in the top k', 'MRR: one over the rank of the first right chunk', 'nDCG: credit for every right chunk, discounted by position', 'Choose by how the result is used', 'Report by kind of question', 'Small sets make small differences noise'],
        short: 'Hit at k is the share of questions where at least one right chunk is in the top k. It fits when I send k chunks to the model and one right chunk is enough. MRR, mean reciprocal rank, averages one over the rank of the first right chunk, so a right chunk at rank 2 counts 0.5. It suits fact questions where only the first right result matters. nDCG gives credit for every right chunk, discounted by its position, and divides by the best possible order, so it fits when an answer needs several chunks and the order matters.\n\nI choose by how the result is used, and I report by kind of question. In my test the three searches had nearly the same hit at 3 and different behaviour by kind: the vector search failed the table question that the keyword search got.\n\nAnd I remember the sample size: with 24 questions, one question moves a score by about four points.',
        fu: [
          ['Why is nDCG discounted?', 'A right chunk at the top is worth more than one at rank 8, because models and people read the top first.'],
          ['Is precision at k useful?', 'Sometimes, to see how much of the prompt is noise. A prompt with five chunks and one right one has a precision of 0.2.']
        ],
        trap: 'Quoting a metric without k or without the sample size.',
        real: 'Describe how you chose a metric for a retrieval step.'
      }),

      B.qa({
        id: 'qa-judge', t: 2, tag: 'Evaluation', secs: 90,
        q: 'How do you use a model as a judge, and what are the risks?',
        pts: ['A rubric, the context, the answer, a score and a reason', 'Faithfulness, relevance and correctness are separate scores', 'Biases: length, position, own style', 'Calibrate against human labels, by kind', 'Pin the judge model and re-check on change', 'Use deterministic checks where they work'],
        short: 'I give the judge the question, the retrieved context, the answer and a rubric, and ask for a score and a reason. I score faithfulness, which is whether every claim is supported by the context, answer relevance, and correctness against the expected answer, as separate scores, because they fail separately.\n\nThe risks are real. A judge can prefer longer answers, prefer the first answer in a pair, prefer the style of its own model, and miss subtle errors. Its scores drift when the judge model changes, and it costs tokens on every run.\n\nSo I do not trust a judge by default. I label a sample by hand, with two people and a rule for disagreement, and I measure how often the judge agrees with them, by kind of question. I swap the order in pairwise tests, I pin the judge model and version and re-check agreement when I change it, and I use deterministic checks wherever they work.',
        fu: [
          ['What would make you distrust the judge?', 'Low agreement with humans on a kind of question, a score that tracks the length of the answer, or a jump when the judge model changed.'],
          ['Can the judge be the same model as the assistant?', 'It can, and it may favour its own style. A different model, or a person for a sample, is safer.']
        ],
        trap: 'Treating a judge score as ground truth without checking its agreement with people.',
        real: 'Describe how you validated an automated judge.'
      }),

      B.qa({
        id: 'qa-halluc', t: 1, tag: 'Evaluation', secs: 60,
        q: 'How do you measure and reduce hallucination in a RAG assistant?',
        pts: ['Define it: a claim not supported by the retrieved text', 'Require citations, and check that they exist and are readable', 'Check numbers against the cited text', 'Let the assistant refuse when nothing supports an answer', 'Score faithfulness with a calibrated judge', 'Track the rates in production'],
        short: 'I define it narrowly for a RAG system: a claim in the answer that the retrieved text does not support. Then I measure it in layers. Every answer must cite sources. A cheap check confirms that each cited chunk was retrieved and that this person may read it, and that every number in the answer appears in a cited chunk. In my recording, such checks caught a wrong number, an invented source and a restricted source in hand-written answers.\n\nFor the rest I score faithfulness with a calibrated model judge and with people on a sample.\n\nTo reduce it, I improve retrieval first, because a missing chunk invites a guess. I let the assistant refuse when nothing supports an answer, I keep the prompt short and clear about using only the context, and I test refusals in the golden set. In production I track the rate of failed checks, refusals and thumbs down.',
        fu: [
          ['Does a citation prove the answer is right?', 'No. It says where the answer claims to come from. The checks and the judge say whether the source supports it.'],
          ['What about the model\'s own knowledge?', 'It can leak into an answer. The faithfulness score and a refusal test show when it does.']
        ],
        trap: 'Saying that RAG removes hallucination. It reduces it, and you must measure what is left.',
        real: 'Describe a hallucination you found and the check that now catches it.'
      }),

      B.qa({
        id: 'qa-regress', t: 2, tag: 'Evaluation', secs: 60,
        q: 'How do you stop a change from making the assistant worse?',
        pts: ['A gate in CI on a fixed golden set', 'Compare builds on the same questions, paired', 'Look at the worse list and at each kind', 'Critical kinds may not regress', 'Roll back with an alias, then analyse', 'Grow the set from every incident'],
        short: 'I run a gate in CI. A candidate build is compared with the current one on the same golden questions, so the comparison is paired: each question is better, worse or the same. The gate checks the average and each kind, and it prints the list of questions that got worse, because two builds can have the same average and fail on different questions.\n\nI read that list before the verdict. In my test a glossary rewrite raised the questions of one kind and broke five clear ones, and a vector-only build lost the one allergen table question while the average looked like noise. For kinds that matter for safety, I add more questions and a rule that none may get worse.\n\nIf something still slips through, I roll back by moving an alias, then analyse, and I add the failure to the golden set so that the same failure cannot return unseen.',
        fu: [
          ['What tolerance do you use?', 'Zero for the average at first, and a rule for each kind. I loosen it only with a written reason, never to make a build pass.'],
          ['What if the set is small?', 'Say so, treat one-question changes as noise, and grow the set. The paired list is still useful.']
        ],
        trap: 'Judging a change by the average alone.',
        real: 'Describe a regression that your gate caught, or one that it missed.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Retrieval Judge', color: '#FECACA',
        pts: [
          'A **golden set** is a file of questions with a kind, a **key phrase** and an expected answer. Never mark the right passage by a chunk id.',
          '**Hit at k** fits the k you send. **MRR** rewards the first right chunk. **nDCG** credits every right chunk by position. **Report by kind.**',
          'A score on **24 questions** has a wide interval: **two questions are within the noise**. Compare builds **question by question**.',
          'A **gate** compares two builds, lists what got **worse**, and checks each kind. A kind with one question is invisible to a percentage rule.',
          '**Cheap checks** catch an invented source, a restricted source and a wrong number with no model. A **judge** needs calibration against people.',
          'Production failures go **back into the set**.'
        ],
        lines: [
          'I read the worse list as well as the average.',
          'I mark right passages by their words.',
          'I add every failure to the golden set.'
        ]
      })
    ]
  });
})();
