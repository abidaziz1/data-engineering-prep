/* Mission 3: chunking. Five chunkers were run on the 59 Brewline documents and scored with 24 questions: how many chunks, how many cut a sentence,
   whether a fact survives whole, and how keyword, vector and hybrid search score on each. The size sweep and the cut inside a phrase are recorded.
   The vector part uses a stand-in embedding (TF-IDF and an SVD), so read small differences as a direction. Parent-child retrieval and semantic
   chunking come from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RK = G.file('code/ragkit.py');
  var CH = G.lines(RK, G.at(RK, /^def chunk_fixed/), G.span(RK, /^def chunk_by_heading/, /^    return out$/)[1]);
  var ST = G.table('chunk.strategies').rows, SW = G.table('chunk.sweep').rows, SP = G.counts('chunk.split_example'), SA = G.counts('chunk.sample'), REC = G.file('chunk/chunk_record.json');
  function by(name) { return ST.filter(function (r) { return r[0] === name; })[0]; }
  var F0 = by('fixed 500, no overlap'), F1 = by('fixed 500, overlap 100'), SE = by('whole sentences up to 500'), RE = by('recursive 500'), HD = by('by heading, up to 500');
  G.expect(F0[1] === 81 && F0[3] === 28 && F0[4] === '26 of 27' && F1[1] === 129 && SE[3] === 0 && RE[1] === 87 && RE[7] === 0.875 && HD[1] === 181 && HD[2] === 177, 'the strategy table');
  G.expect(SW.length === 5 && SW[2][0] === 500 && SW[2][4] === 0.875 && SW[4][5] === 0.917 && SW[0][6] === 540 && SW[4][6] === 2775, 'the size sweep');
  G.expect(SP.cut_inside_phrase === true && SP.offset === 496 && SP.key_phrase === 'assembly point by the bus stop', 'the cut inside a phrase');
  var SAMPLE = SA.chunks.join('\n\n--- next chunk ---\n\n');
  var BUG1 = [
    'def chunk(text, size=500, overlap=100):',
    '    chunks = []',
    '    start = 0',
    '    while start < len(text):',
    '        chunks.append(text[start:start + size])',
    '        start += size',
    '    return chunks'
  ].join('\n');
  var FIX1 = BUG1.replace('        start += size', '        start += max(1, size - overlap)');
  var BUG2 = [
    'def sentences(text):',
    '    return [s.strip() for s in text.split(".") if s.strip()]',
    '',
    '# "The surcharge is EUR 0.50. It starts on 1 May." gives three pieces'
  ].join('\n');
  var FIX2 = [
    'import re',
    '',
    'SENT = re.compile(r"(?<=[.!?])\\s+(?=[A-Z0-9\\"])")',
    '',
    'def sentences(text):',
    '    return [s.strip() for s in SENT.split(text) if s.strip()]'
  ].join('\n');
  var CUTLINE = SP.end_of_first_chunk + '|' + SP.start_of_next_chunk;

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Chunking', short: 'Chunking', blurb: 'Where the cut falls decides what the assistant can find', minutes: 40,
    focus: ['stg', 'int'],
    goals: [
      'Say **why chunks exist**, and what a chunk must carry with it.',
      'Compare **fixed, sentence, recursive and heading** chunkers by what they cut and what they keep.',
      'Read a **score by strategy and by size**, and say why none of them wins on everything.',
      'Explain **overlap**, and what it costs.',
      'Describe **parent-child retrieval** and **semantic chunking**, and when to try them.',
      'Choose a chunk setting **with a question set**, and freeze it in code review.'
    ],
    say: 'Mission 3 is about the cut. A search returns chunks, and a prompt holds only a few, so where you cut decides what the assistant can ever find. I ran five chunkers on the 59 Brewline documents and scored each with the same 24 questions, so the numbers are mine and real. One of the five cut a sentence in half and lost a fact. The vector scores come from a stand-in embedding, and I say so where it matters.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, src: 'docs', title: 'Why chunks exist',
        say: 'You could embed a whole document, and then a search would return whole documents. Press Next for why that fails, and what a chunk has to carry.',
        items: [
          ['A search returns pieces', 'A prompt has room for a few thousand tokens. A search that returns a forty-page handbook cannot put it in. A search that returns the paragraph about refunds can. The chunk is the unit that the search returns and the prompt carries.', 'The unit of search and of the prompt.'],
          ['One vector, one meaning', 'An embedding is one vector for a whole text. A long text about many things gets a vector that is a blur of all of them. A short chunk about one thing gets a vector that points at that thing. Too short, and a chunk loses the context that gives it meaning.', 'Too big blurs. Too small loses context.'],
          ['A chunk carries labels', 'Each chunk keeps the labels of its document: the audience, the version, the current flag, the source and the position. The permission filter and the citation both depend on them. A chunk without its labels is a leak waiting to happen.', 'Labels travel with every piece.'],
          ['A chunk is a design decision', 'The size, the borders and the overlap are settings that you choose and test. They are not a default of a library. A change of any of them changes every answer, so it goes through an evaluation run and a code review.', 'Test the setting, then freeze it.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm3-chunkers', t: 1, src: 'rec', title: 'Four ways to cut, in code', file: 'ragkit.py', lang: 'python', code: CH,
        steps: [
          { say: 'This is the code that cut the 59 documents. Each function takes text and returns a list of chunks. I wrote them small, so that you can read them. Libraries have the same ideas with more options.', lines: null },
          { say: 'The fixed chunker takes every 500 characters, whatever they say. With an overlap, each chunk starts earlier than the end of the last one, so that a sentence on a border is whole in one of the two. It is the baseline: simple and blind.', lines: G.span(CH, /^def chunk_fixed/, /return \[text\[i:i \+ size\]/) },
          { say: 'The sentence chunker first splits the text into sentences, and then packs whole sentences into a chunk until the next one would not fit. A sentence is never cut.', lines: G.span(CH, /^def split_sentences/, /^    return chunks$/) },
          { say: 'The recursive chunker tries the biggest separator first, a blank line, then a line break, then a full stop, then a space. It splits at the biggest one that makes the pieces fit, and merges small neighbours back up to the size. It follows the paragraphs of the author when they are short enough.', lines: G.span(CH, /^def chunk_recursive/, /^    return chunk_fixed\(text, size\)$/) },
          { say: 'The heading chunker is for text with structure: Markdown, Word or a web page turned into Markdown. One chunk for each section, with the heading kept in every piece, and a long section cut by sentences. The heading is context that costs a few characters and helps a lot.', lines: G.span(CH, /^def chunk_by_heading/, /^    return out$/) }
        ],
        note: 'The functions work on the cleaned text of mission 2. A PDF has no headings, so the heading chunker needs a different source for it, for example the Word version of the same file.'
      }),

      B.widget({ id: 'm3-lab', kind: 'chunker', t: 1, src: 'rec', title: 'Lab: where the cut falls, and what it costs' }),

      B.code({
        id: 'm3-cut', t: 1, src: 'rec', title: 'The cut that lost a fact', file: 'runbook (the border of chunks 1 and 2)', lang: 'text', code: CUTLINE,
        steps: [
          { say: 'This is the border where the fixed chunker, with 500 characters and no overlap, cut the runbook. The bar in the middle is the cut. Left of it is the end of one chunk. Right of it is the start of the next.', lines: null },
          { say: 'The cut falls at character ' + SP.offset + '. The phrase `' + SP.key_phrase + '` is in the document, and the cut goes through the middle of the word "assembly".', lines: [1, 1] },
          { say: 'A question such as "Where is the assembly point in a fire?" now has no chunk that holds the whole answer. The first chunk ends in `asse`. The second begins with `mbly point by the bus stop`. A keyword search for "assembly" matches neither chunk well.', lines: [1, 1] },
          { say: 'This was the only one of the five strategies that lost a fact: ' + F0[4] + ' facts were whole in one chunk, and the other four kept all 27. It is also a reminder that you cannot see this by looking at the score alone. You see it by reading the chunks.', lines: null }
        ],
        note: 'The cut is the result of one rule on one file. Another file would be cut elsewhere. That is the point: a blind rule loses facts at random, and you find them only if you look or test.'
      }),

      B.code({
        id: 'm3-sample', t: 1, src: 'rec', title: 'Two real chunks from the supplier file', file: 'supplier-terms.pdf (recursive 500)', lang: 'text', code: SAMPLE,
        steps: [
          { say: 'The supplier file is a PDF of ' + SA.count + ' chunks with the recursive chunker. Read the two chunks as the model would read them. They are real output, and they are untidy.', lines: null },
          { say: 'The first chunk is one whole section: the Andes Roasters terms, with the delivery days, the lead time of 3 days, the minimum order of 40 kg and the late penalty. It starts with the title of the section, which came from the text.', lines: G.span(SAMPLE, /^Supplier terms Andes/, /Photos of the display shelf/) },
          { say: 'The second chunk starts with the table of suppliers, flattened by the PDF parser into a row of words, and then continues with the Hillside Dairy section. The table and the next section share a chunk because both are short. This is the price of a size rule that knows nothing about meaning.', lines: G.span(SAMPLE, /^Supplier Delivers/, /^Supplier Delivers/) },
          { say: 'The same facts appear twice: once in the section and once in the table. That is not wrong, and it means that two chunks can answer the same question, which helps recall and doubles the weight of that topic in a prompt.', lines: null }
        ],
        note: 'A better PDF table extraction would turn the table into rows with column names. The chunker would then keep the table together. That is a parsing fix, not a chunking fix.'
      }),

      B.code({
        id: 'm3-record', t: 1, src: 'rec', title: 'What a chunk carries', file: 'chunk.json', lang: 'json', code: REC,
        steps: [
          { say: 'This is the record of one chunk, as it is stored. The text is shortened here to fit. Look at what travels with it.', lines: null },
          { say: '`id` is made of the document and the position. Mission 5 changes it into a hash of the text, so that the same text gets the same id on every run.', lines: G.span(REC, /"id"/, /"i"/) },
          { say: '`audience`, `current` and `version` are copied from the document record. This chunk is for finance, so a manager\'s search must never return it. The filter in mission 5 reads exactly these fields.', lines: G.span(REC, /"audience"/, /"version"/) },
          { say: '`content_hash` is the hash of the document text. If it changes at the next run, the chunks of this document are rebuilt. If it does not, nothing is touched.', lines: G.span(REC, /"content_hash"/) }
        ],
        note: 'Add a field when a decision needs it: the heading, the page number for a citation, the language. Each one makes a feature possible, and each one needs filling at ingestion.'
      }),

      B.cmp({
        id: 'm3-compare', t: 1, src: 'rec', title: 'The five strategies on the same documents',
        say: 'Five rules, the same 59 documents, the same 24 questions. Press Next to read the table one rule at a time. The hit at 3 columns say how often a right chunk was in the top three. Read the first two columns for the cost of the rule, and the last for what it bought.',
        cols: ['Strategy', 'Chunks', 'Cut mid-sentence', 'Facts whole', 'Hybrid hit@3'],
        hl: 4,
        rows: ST.map(function (r) { return [r[0], String(r[1]), r[3] + ' %', r[4], String(r[7])]; }),
        steps: [
          { upto: 1, say: 'Fixed 500 without overlap: ' + F0[1] + ' chunks, ' + F0[3] + ' percent of them cut mid-sentence, and one fact lost. The cheapest rule, and the only one that loses anything.' },
          { upto: 2, say: 'With an overlap of 100 the chunks grow to ' + F1[1] + ', because each one repeats the end of the last. No fact is lost, and ' + F1[3] + ' percent still end mid-sentence. You pay in storage and in near-copies in the results.' },
          { upto: 3, say: 'Whole sentences up to 500: ' + SE[1] + ' chunks and zero sentences cut. The same count as the plain fixed rule, and none of the damage.' },
          { upto: 4, say: 'Recursive 500 has ' + RE[1] + ' chunks and ' + RE[3] + ' percent cut, and the best keyword score of the five at hit at 3, ' + RE[5] + '. It follows the paragraphs where they fit.' },
          { upto: 5, say: 'By heading gives ' + HD[1] + ' small chunks, ' + HD[2] + ' characters on average, with the section name in each. Cheap to send and easy to lose context from. The scores here differ by one question out of 24, so read them as a direction.' }
        ],
        pick: 'Start with **recursive or sentence-based** chunking at a few hundred characters. Add the **heading** where the source has structure. Add **overlap** only if you see cut facts. Then test on your own questions, because these 24 are about 59 short documents.'
      }),

      B.talk({
        id: 'm3-beyond', t: 2, src: 'docs', title: 'Beyond a fixed rule',
        say: 'Three ideas that you will meet in job posts and papers. I did not run them for this course, so they come from documentation. Press Next for each, with the question to ask before you adopt it.',
        items: [
          ['Parent-child (small to big)', 'Search small chunks, because their vectors are precise, and return the larger parent section to the model, because it has the context. You store two levels and a pointer. The cost is a bigger prompt and a join in the pipeline.', 'Find with the small one, read the big one.'],
          ['Semantic chunking', 'Split where the meaning changes: embed each sentence, and cut where the similarity between neighbours drops. It costs an embedding for every sentence at ingestion, and the gain over a good recursive rule is not always visible. Measure it before you pay for it.', 'A cut by meaning, at a price.'],
          ['Context in each chunk', 'Add the title and the section name in front of each chunk, or a one-line summary of the document written by a model. A chunk that says "it is 14 days" gains a lot from knowing it is about returns. The heading chunker did a small version of this.', 'Give a chunk its surroundings.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The rule.', t: 'Adopt a technique when your evaluation set shows a failure that it fixes, not because a blog post praised it.' }
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Your chunks are 3,000 characters each. The vector search often returns a chunk that is only partly about the question. What is the likely reason?',
        opts: [
          { t: 'A long chunk covers several topics, so its one vector is a blur of them and matches loosely', fb: '' },
          { t: 'Long chunks are always more accurate', fb: 'They hold more context and are less precise. The trade is the point.' },
          { t: 'The index needs more links', fb: 'Index settings change recall of the index, not the focus of the text.' },
          { t: 'The chunks lack labels', fb: 'Labels do not change how a vector matches.' }
        ],
        ok: 0, why: 'One vector can stand for only one blurred meaning. A chunk about shifts, refunds and fire drills matches questions about any of them weakly. Smaller chunks, or a split at the section borders, give each vector one subject.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'The recording sent ' + SW[0][6] + ' characters to the model for the top five chunks at size 150, and ' + SW[4][6] + ' at size 1500. What do you pay for the larger setting?',
        opts: [
          { t: 'Input tokens on every call, because the chunks are most of the prompt', fb: '' },
          { t: 'Nothing, because chunks are stored once', fb: 'They are stored once and sent on every question.' },
          { t: 'A bigger index only', fb: 'The index is smaller with big chunks. The prompt is what grows.' },
          { t: 'Only a slower build', fb: 'The build is not the main cost. The per-question prompt is.' }
        ],
        ok: 0, why: 'The top five chunks go into the prompt on every question, so the size of a chunk multiplies into the bill and the delay. Size 1500 sent about ' + (Math.round(SW[4][6] / SW[0][6] * 10) / 10) + ' times the text of size 150, and it also had the best hit at 5.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'What does an overlap of 100 characters do?',
        opts: [
          { t: 'Each chunk repeats the last 100 characters of the previous one, so a fact on a border is whole in one of them', fb: '' },
          { t: 'It removes duplicate sentences', fb: 'Overlap creates repeated text. It does not remove any.' },
          { t: 'It makes chunks 100 characters shorter', fb: 'The step is shorter, so there are more chunks. The size is the same.' },
          { t: 'It encrypts the borders of chunks', fb: 'It has nothing to do with encryption.' }
        ],
        ok: 0, why: 'With size 500 and overlap 100 the next chunk starts 400 characters later. The recording shows ' + F1[1] + ' chunks against ' + F0[1] + ' without overlap, and all 27 facts whole. The cost is more vectors and some near-copies in the top results.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'The chunker splits text with `text.split(".")`. A sentence says "The surcharge is EUR 0.50." What happens to the price?',
        opts: [
          { t: 'It is cut into "EUR 0" and "50", two pieces that no longer say a price', fb: '' },
          { t: 'Nothing, a decimal point is never a full stop', fb: 'A plain split on the character does not know the difference.' },
          { t: 'The sentence is kept, and the next one is dropped', fb: 'Nothing is dropped. The text is cut at every full stop.' },
          { t: 'The split raises an error', fb: 'It runs without an error, and that is the danger.' }
        ],
        ok: 0, why: 'A splitter must know that a full stop followed by a lower-case letter or a digit inside a number is not an end of sentence. The recorded splitter cuts after `.`, `!` or `?` followed by space and a capital letter or digit.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps of choosing a chunk setting in order.',
        items: [
          'Write 20 to 30 real questions and mark the right passages',
          'Pick two or three candidate settings',
          'Chunk the documents with each one and build an index for each',
          'Score retrieval on the same questions',
          'Read the chunks around the failures',
          'Choose the cheapest setting that holds the score',
          'Put the setting in code, and re-run the score on every change'
        ],
        why: 'The questions come first, because without them every setting looks fine. Reading the failures is the step that teaches you why a setting is wrong. Freezing the setting in code means that a later change shows up in review and in a score.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This chunker is meant to overlap by 100 characters. The chunks never overlap. Click the line with the bug.',
        file: 'chunk.py', lang: 'python', code: BUG1, bad: [6],
        hint: 'How far does `start` move each time?',
        why: 'The loop moves `start` by the full `size`, so the next chunk begins exactly where the last one ended, and `overlap` is never used. The step must be `size - overlap`, with a floor of 1 so that an overlap as large as the size cannot make the loop stall.',
        fix: FIX1,
        cheer: 'Step by size minus overlap.'
      }),

      B.bug({
        id: 'm3-bug2', t: 1, q: 'This function splits text into sentences. Prices and numbers come out in pieces. Click the line that causes it.',
        file: 'sentences.py', lang: 'python', code: BUG2, bad: [2],
        hint: 'Is every full stop the end of a sentence?',
        why: 'Splitting on every `.` also cuts `EUR 0.50` into `EUR 0` and `50`, and `e.g.` and `Mr.` as well. A sentence ends at `.`, `!` or `?` followed by white space and the start of a new sentence. The recorded splitter uses a look-behind and a look-ahead for that.',
        fix: FIX2,
        cheer: 'A full stop is not always an end.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision: which chunk size for Brewline?',
        scenario: 'The Brewline documents are short rules of two to five sentences. Managers ask quick questions. The recorded sweep gives, for hybrid search: size 150 hit@3 ' + SW[0][4] + ' and hit@5 ' + SW[0][5] + ', size 500 hit@3 ' + SW[2][4] + ' and hit@5 ' + SW[2][5] + ', and size 1500 hit@3 ' + SW[4][4] + ' and hit@5 ' + SW[4][5] + ', sending ' + SW[0][6] + ', ' + SW[2][6] + ' and ' + SW[4][6] + ' characters for the top five.',
        opts: [
          { t: 'Size 150, because it sends the least text', d: 'The cheapest prompt.', lose: 'The score is the lowest: ' + SW[0][4] + ' at 3. A chunk of 150 characters rarely holds a whole rule, so the model gets pieces.' },
          { t: 'Size 500, with sentence or recursive splitting', d: 'The best hit at 3, and a prompt of about two thousand characters.' },
          { t: 'Size 1500, because it has the best hit at 5', d: 'The best recall at 5.', lose: 'It sends about ' + (Math.round(SW[4][6] / SW[2][6] * 100) / 100) + ' times as much text as size 500 for a gain of one question at 5, and the hit at 3 is lower.' }
        ],
        pick: 1,
        why: 'The system sends the top three to five chunks, and size 500 has the best hit at 3 while keeping the prompt small. The gain of 1500 at 5 is one question out of 24, which a different question set could reverse. The cost of 1500 is paid on every call.',
        when: 'For long, connected text such as contracts or manuals, larger chunks or parent-child retrieval usually win. For a list of short FAQ entries, one entry for each chunk is the natural size.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: "I cannot find the assembly point"', time: '16:20',
        alert: '**A manager asks "Where is the assembly point in a fire?" and the assistant answers that it cannot find it.** The runbook says: "assembly point by the bus stop." The same question worked last month. Last week, the chunker was replaced by a simple fixed 500-character rule with no overlap, "to make ingestion faster".',
        clues: ['The answer is in the runbook, word for word', 'The new chunker cuts every 500 characters', 'A cut falls inside the phrase at character ' + SP.offset, 'Nobody ran the evaluation set after the change'],
        opts: [
          { t: 'Go back to a sentence-aware chunker (or add overlap), re-chunk and re-index, and add this question to the evaluation set', fb: '' },
          { t: 'Raise the number of retrieved chunks from 5 to 20', fb: 'No chunk holds the whole phrase, so more chunks do not help, and the prompt gets bigger.' },
          { t: 'Add the answer to the system prompt', fb: 'It fixes one question and leaves every other cut fact lost.' },
          { t: 'Blame the embedding model and switch it', fb: 'The text was cut before any embedding saw it. A new model would embed the same broken pieces.' }
        ],
        best: 0,
        why: 'The fixed rule cut the phrase in two, so neither chunk holds it, and nothing downstream can repair a missing fact. A chunker that respects sentences, or an overlap, keeps the phrase whole. Re-index with it, and keep the question as a regression test.',
        checks: [
          ['Reproduce', 'Search the index for "assembly point" and read the chunks that come back. Are they broken?'],
          ['Find the border', 'Find the chunk that ends with `asse` and the one that begins with `mbly`.'],
          ['Fix the cut', 'Use a sentence-aware or recursive chunker, or an overlap, and re-chunk the documents.'],
          ['Re-index', 'Build a new index, score it on the questions, and switch the alias.'],
          ['Guard', 'Add the question to the evaluation set, and add a check on the share of chunks that end mid-sentence.']
        ],
        tell: 'After we replaced the chunker with a fixed 500-character rule, the assistant could not answer where the assembly point was. The rule cut the runbook in the middle of the phrase, so no chunk held it. I went back to a sentence-aware chunker, re-chunked and rebuilt the index beside the old one, and switched the alias after the scores were equal or better. I added the question to the evaluation set and a metric for the share of chunks that end mid-sentence.',
        prevent: ['Run the **evaluation set** before and after a chunker change', 'Track the **share of chunks that end mid-sentence**', 'Read **sample chunks** in review as well as scores', 'Rebuild the index **beside** the old one and switch an alias']
      }),

      B.qa({
        id: 'qa-chunk', t: 1, tag: 'Chunking', secs: 60,
        q: 'How do you choose a chunking strategy?',
        pts: ['Start from the questions and the shape of the documents', 'A chunk should hold one idea with enough context', 'Candidates: sentence, recursive, by heading, with or without overlap', 'Score retrieval on a question set for each', 'Read the chunks around failures', 'Freeze the setting and re-test on every change'],
        short: 'I start from the documents and the questions. Short rules suit a sentence-aware or recursive chunker at a few hundred characters. A manual with headings suits a chunker that follows the sections and keeps the heading in each chunk. I want each chunk to hold one idea with enough context to stand on its own.\n\nThen I do not guess. I build a question set with the right passages marked, run two or three candidate settings, and score retrieval for each. In my test, five rules on 59 documents differed by one or two questions out of 24, except that the plain fixed rule lost a fact by cutting a phrase in half. I also read the chunks around the failures, because that is where I see why.\n\nI choose the cheapest setting that holds the score, put it in code, and re-run the evaluation on every change, because a chunk setting changes every answer.',
        fu: [
          ['What would make you add overlap?', 'Seeing facts cut at borders in the sample, or a drop in recall that traces to a border. It costs more vectors, so I add it for a reason.'],
          ['How do you handle a table?', 'Keep it together as rows with its heading, and fix the parser first if the table was flattened.']
        ],
        trap: 'Using the default of a library without testing. The default is a guess about someone else\'s documents.',
        real: 'Describe a chunking change you scored, and what the scores said.'
      }),

      B.qa({
        id: 'qa-size', t: 1, tag: 'Chunking', secs: 60,
        q: 'What chunk size would you use, and why?',
        pts: ['There is no universal size', 'Small is precise and loses context, large is blurred and costs more', 'The top chunks go into the prompt on every call', 'Start around a few hundred tokens and measure', 'Hit at 3 and at 5, and the characters sent', 'Revisit when the documents or the model change'],
        short: 'There is no universal size, so I treat it as a trade-off that I measure. A small chunk is precise, and it loses the context that explains it. A large chunk holds more context, its single vector blurs several topics, and it multiplies into the prompt on every call.\n\nI start around a few hundred tokens for text of this kind and test a few sizes on the question set, looking at hit at 3 and at 5 and at the number of characters that go into the prompt. In my recording, 500 characters had the best hit at 3 of 0.875, 1500 had a slightly better hit at 5 and sent about forty percent more text, and 150 was cheap and missed the most.\n\nI choose the smallest size that holds the score, and revisit it when the documents, the embedding model or the prompt budget change.',
        fu: [
          ['Characters or tokens?', 'Tokens are what the model and the embedding model limit, so I count in tokens when I tune. Characters are a fine start, as long as I know the ratio.'],
          ['Does the embedding model change the answer?', 'Yes, models have a best input length and a maximum. Check the model card and test.']
        ],
        trap: 'Quoting a number such as "512 tokens is best" as a rule. It is a result on someone\'s data.',
        real: 'Describe how you picked a size and what you traded away.'
      }),

      B.qa({
        id: 'qa-struct', t: 2, tag: 'Chunking', secs: 60,
        q: 'How do you chunk structured content: headings, tables and code?',
        pts: ['Follow the structure where the source has it', 'Keep the heading with the text below it', 'Keep a small table whole, with its header', 'Split a long table by rows and repeat the header', 'Keep a function or a block of code together', 'Store the position for citations'],
        short: 'I follow the structure of the source. For Markdown, Word or HTML, I chunk by section and keep the heading in every chunk, because "14 days" means little without "Refunds and returns" above it. For a long section I cut by sentences inside it.\n\nFor tables, a small one stays whole in one chunk with its header. A long one is split by rows, and I repeat the header row in each chunk so that a cell never loses its column. For code, I keep a function or a class together and add the file name and the function name as context.\n\nI store the position, the page or the section, so that an answer can cite where it came from. And I test with questions whose answers sit in tables and code, because those are where simple rules fail first.',
        fu: [
          ['A PDF has no headings. What then?', 'Use the Word or HTML source if one exists. Otherwise infer headings from font sizes with a layout-aware parser, and check the result by eye on a sample.'],
          ['Why repeat the header row?', 'A row chunk without its header has numbers with no meaning, to a search and to a model.']
        ],
        trap: 'Cutting a table into fixed 500-character pieces. The header ends up in one chunk and the rows in others.',
        real: 'Describe a table or a block of code that you kept together, and how you tested it.'
      }),

      B.qa({
        id: 'qa-parent', t: 2, tag: 'Chunking', secs: 60,
        q: 'What is parent-child retrieval, and when would you try it?',
        pts: ['Search on small chunks, return the larger parent', 'Small chunks give precise matches', 'The parent gives the model the context', 'Needs two levels and a pointer from child to parent', 'Costs a bigger prompt and a join', 'Try it when answers need surrounding text'],
        short: 'In parent-child retrieval, also called small to big, I split each document twice: into small chunks for searching and into larger parent sections for reading. I embed and search the small chunks, because a short text gives a precise vector. When a small chunk matches, I send its parent to the model, so that the model has the surrounding text that explains it.\n\nIt needs two levels in the index and a pointer from each child to its parent, and it makes the prompt bigger and adds a lookup. I would try it when the evaluation shows that the right small chunk is found and the answer is still wrong or thin because it lacks context, for example in contracts or manuals where a clause depends on the paragraph around it.\n\nI would not adopt it first. For short rules, a good single level is simpler and was enough in my test.',
        fu: [
          ['How do you avoid sending the same parent twice?', 'De-duplicate by parent id after the search, and keep the best child score for each parent.'],
          ['What does it cost?', 'The prompt grows by the size of the parent, and the pipeline has one more table.']
        ],
        trap: 'Adopting it because it sounds advanced. Measure what it fixes first.',
        real: 'Describe a case where context around a match mattered, and what you changed.'
      }),

      B.qa({
        id: 'qa-evalchunk', t: 2, tag: 'Chunking', secs: 60,
        q: 'How do you evaluate a chunking change before it ships?',
        pts: ['A fixed question set with the right passages marked', 'Build a new index beside the old one', 'Compare hit at k, MRR and the characters sent', 'Compare by kind of question as well as the average', 'Read sample chunks and the failures', 'Gate the release on the scores'],
        short: 'I keep a fixed set of questions with the right passages marked, and I build a new index with the new chunker beside the old one, so that nothing live changes. Then I run both on the same questions and compare hit at 3 and 5, mean reciprocal rank, and the number of characters that would go into the prompt, because a better score that doubles the bill is not a clear win.\n\nI compare by kind of question as well as the average. In my recording the average hid that the stand-in vector search failed the one table question that the keyword search got right.\n\nI also read a sample of chunks and the failures, and I check a simple property such as the share of chunks that end mid-sentence. If the new index is not worse, I switch the alias. The release is gated on those scores, so that nobody can change the chunker "to be faster" without a number.',
        fu: [
          ['What if the set is too small to tell?', 'A difference of one question is noise. I report it as noise, add questions from real logs, and prefer the simpler setting.'],
          ['How do you mark the right passage when the chunks change?', 'By the key phrase of the answer, not by chunk id, so any chunk that contains it counts.']
        ],
        trap: 'Marking the right chunk by id. The id changes with the chunker, and the labels become wrong.',
        real: 'Describe how you compared two index builds and what decided it.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Chunk Cutter', color: '#BFDBFE',
        pts: [
          'A **chunk** is the unit of search and of the prompt. It must hold one idea with enough context, and carry its **labels**.',
          'A **fixed rule** is blind and lost a fact in the recording. **Sentence, recursive and heading** rules keep sentences and structure.',
          '**Overlap** keeps a border fact whole and costs more vectors. **Size** trades precision against context and against the bill.',
          'The scores of five rules differed by one or two questions of 24: **read the chunks and test your own questions**.',
          '**Parent-child** and **semantic** chunking are options to try when the evaluation shows a failure they fix.'
        ],
        lines: [
          'I read chunks as well as scores.',
          'I mark the right passage by its phrase, not by chunk id.',
          'I freeze a chunk setting in code and re-test on every change.'
        ]
      })
    ]
  });
})();
