/* Mission 2: documents in. Parsing PDF, Word and HTML, cleaning what the parsers leave behind, masking personal data, finding near-copies with
   MinHash, and keeping versions. The parsers (pypdf, python-docx, BeautifulSoup), the cleaning code, the MinHash numbers and the masking were
   run on generated Brewline documents and recorded. What each format stores, and how an OCR step behaves, come from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PK = G.file('code/parsekit.py'), RK = G.file('code/ragkit.py');
  function ex(text, a, b) { var r = G.span(text, a, b); return G.lines(text, r[0], r[1]); }
  var CLEAN = ex(RK, /^def drop_repeated_lines/, /return hashlib\.sha256/);
  var COPY = ex(RK, /^PII = /, /^    return m$/);
  var PDF = G.counts('docs.pdf'), HT = G.counts('docs.html'), PII = G.counts('docs.pii'), VER = G.counts('docs.versions'), SC = G.counts('docs.scanned'), DUP = G.table('docs.dups').rows[0], FM = G.table('docs.formats');
  var REC = G.file('docs/record.json'), MASKED = G.file('corpus/meeting-notes-masked.txt'), RAWNOTES = G.file('corpus/meeting-notes-2026-03.txt');
  G.expect(PDF.pages === 9 && PDF.header_copies_if_kept === 9 && PDF.repeated_lines.length === 1 && PDF.table_page === 4 && PDF.has_heading_marks === false, 'the PDF numbers');
  G.expect(HT.boilerplate_in_naive.length >= 2 && HT.boilerplate_in_markdown.length === 0, 'the web page boilerplate');
  G.expect(SC.chars_extracted === 0 && SC.images_on_page === 1, 'the scanned file has no text');
  G.expect(PII.found.email === 2 && PII.found.phone === 2 && PII.found.iban === 1 && PII.names_in_text.length === 2 && PII.names_left_after_masking.length === 2 && PII.order_refs_untouched === true, 'what the masking found and missed');
  G.expect(DUP[0] === 'handbook-v2' && DUP[1] === 'handbook-v1' && DUP[2] > 0.8, 'the two handbook versions are near-copies');
  G.expect(VER.shared_sentences === 8 && VER.only_in_v1.length === 2 && VER.only_in_v2.length === 2, 'the two versions differ in two sentences');
  var TABLE_TXT = PDF.table_as_extracted.join('\n');
  var BUG1 = [
    'import re',
    '',
    'def clean(text):',
    '    text = re.sub(r"\\s+", " ", text)',
    '    text = re.sub(r"[\\d\\-\\s+]{9,}", "[PHONE]", text)       # mask phone numbers',
    '    return text'
  ].join('\n');
  var FIX1 = BUG1.replace('r"[\\d\\-\\s+]{9,}"', 'r"\\+\\d{2}(?: ?\\d){8,10}"');
  var BUG2 = [
    'def keep_newest(docs):',
    '    newest = {}',
    '    for d in docs:',
    '        old = newest.get(d["title"])',
    '        if old is None or d["version"] > old["version"]:       # versions are strings like "v9" and "v10"',
    '            newest[d["title"]] = d',
    '    return list(newest.values())'
  ].join('\n');
  var FIX2 = BUG2.replace('d["version"] > old["version"]:       # versions are strings like "v9" and "v10"', 'int(d["version"].lstrip("v")) > int(old["version"].lstrip("v")):')
    .replace('        if old is None or int', '        if old is None or int');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Documents in', short: 'Documents', blurb: 'PDF, Word and HTML into clean, labelled text, without personal data and without near-copies', minutes: 42,
    focus: ['src', 'stg'],
    goals: [
      'Say what **a PDF, a Word file and a web page** really contain, and what each parser loses.',
      'Remove **repeated headers, wrapped lines and page numbers**, and keep **tables** as rows.',
      'Spot a **scanned file** that has no text, and decide what happens to it.',
      'Mask **personal data** with patterns, and say what patterns cannot find.',
      'Find **near-copies** with MinHash, and keep **versions** instead of deleting them.',
      'Write the **record** that travels with every document: hash, version, audience, current.'
    ],
    say: 'Mission 2 is where a retrieval system is won or lost, because nothing downstream can repair text that the parser got wrong. I generated real PDF, Word and web files for Brewline, ran real parsers on them, and wrote down what came out: a header copied onto nine pages, a table flattened into a row of words, a scanned page with no text, a phone number in a meeting note. The parsing and the numbers are recorded. What each format stores comes from documentation.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, src: 'docs', title: 'What is inside each format',
        say: 'A document is not text. It is a format that can be turned into text, with losses. Press Next for the five that you will meet.',
        items: [
          ['PDF', 'A PDF stores glyphs at positions on a page. There are no paragraphs, no headings and no table cells inside it, only text placed here and there. An extractor guesses the reading order from the positions. It returns one string for each page.', 'Positioned text. The structure is a guess.'],
          ['Word', 'A Word file is a zip of XML. Paragraphs have styles, and a style named Heading 1 is a real heading. Tables are real tables with rows and cells. A parser can keep all of that.', 'The structure is in the file. Keep it.'],
          ['Web page', 'HTML has headings and tables, and it also has a menu, a footer, scripts and cookie banners. A naive text extraction returns all of it, so the footer becomes part of every answer.', 'Content and noise in one file.'],
          ['Markdown and text', 'Already text. Markdown marks its headings with `#`, which a chunker can use. A text file has nothing but what a person typed, including private details.', 'Easy to read, easy to leak.'],
          ['Scanned PDF', 'A scan is a picture of a page inside a PDF. It has no text at all, so a text extractor returns an empty string. An OCR step turns pixels into text and makes mistakes, so its output needs a lower trust.', 'An image. Zero characters until OCR.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit.', t: 'Open the parsed text next to the original, for one file of each format, before you build anything else. Most retrieval bugs are visible there.' }
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'docs', title: 'The first half of the ingestion pipeline', g: 'ingest', legend: true,
        steps: [
          { say: 'This is the pipeline that gets documents into the index. In this mission you build the first half: from the raw file to clean, labelled text. The second half, chunking and the index, comes next. Press Next to follow one file.', cap: 'Raw files in, clean text out.' },
          { say: 'Step 1. The raw files sit in the lake exactly as they arrived. Never edit them. If a parser improves next year, you re-run it on the same bytes.', on: ['i1'], focus: ['n_files', 'n_parse'], cap: 'Keep the originals untouched.' },
          { say: 'Step 2. A parser for each format turns a file into text. It must keep headings and write tables as rows, because a cell is useless without its column.', on: ['i1'], focus: ['n_parse'], cap: 'One parser for each format.' },
          { say: 'Step 3. Cleaning removes what the parser leaves behind: headers and footers, wrapped lines, boilerplate and personal data. Labelling adds who may read the file, which version it is and whether it is current.', on: ['i2'], focus: ['n_parse', 'n_clean'], cap: 'Clean it, then label it.' },
          { say: 'Step 4. The result goes on to chunking. Each chunk inherits the labels of its document, so a permission set here reaches every piece later.', on: ['i3'], focus: ['n_clean', 'n_chunk'], cap: 'The labels travel with the text.' }
        ]
      }),

      B.code({
        id: 'm2-parse', t: 1, src: 'rec', title: 'Four parsers, run for real', file: 'parsekit.py', lang: 'python', code: PK,
        steps: [
          { say: 'This is the file that parsed the Brewline documents. It uses pypdf ' + G.meta('pypdf') + ', python-docx and BeautifulSoup ' + G.meta('beautifulsoup4') + ', all real. Four functions, one for each case.', lines: null },
          { say: 'A PDF gives one string for each page. The comment says it plainly: there are no headings and no cells in a PDF, only placed text. For the handbook, the recording found ' + PDF.pages + ' pages and no heading marks at all.', lines: G.span(PK, /^def pdf_pages/, /return \[p\.extract_text/) },
          { say: 'For Word the function walks the body in order. A paragraph whose style is Heading 1 gets a `#`, and a table becomes rows with pipes. The order of the document is kept, so a table stays under its heading.', lines: G.span(PK, /^def docx_markdown/, /return '\\n\\n'\.join\(out\)/) },
          { say: '`get_text()` is the naive way to read a web page. It keeps the menu, the script and the footer, and it writes a table as a row of words. This function exists to show what that costs.', lines: G.span(PK, /^def html_naive/, /get_text\(' '\)/) },
          { say: 'The careful version drops script, style, nav, footer and head, keeps the headings, and writes each table row with pipes, so that a cell stays next to its column.', lines: G.span(PK, /^def html_markdown/, /return '\\n\\n'\.join\(out\)$/) }
        ],
        note: 'I generated the documents with a PDF library and a Word library, so these files are cleaner than a scan of a real office. Real files will surprise you more. The parsers are real, and the lesson holds.'
      }),

      B.code({
        id: 'm2-table', t: 1, src: 'rec', title: 'A table, as a PDF parser returns it', file: 'handbook-page-4.txt', lang: 'text', code: TABLE_TXT,
        steps: [
          { say: 'Page ' + PDF.table_page + ' of the handbook has a small table of opening hours. This is exactly what pypdf returned for it: four lines, with the cells joined by single spaces. A human sees a table. The text has lost the borders.', lines: null },
          { say: 'The header line names the columns: Store, Mon to Fri, Sat, Sun. The row for Rotterdam says `closed` for Sunday.', lines: [1, 1] },
          { say: 'In the Amsterdam row, three time ranges follow the name, each with the words `to` inside. A person can see where one cell ends. A chunker and a search cannot. A question like "When is Utrecht open on Sunday?" now depends on counting words.', lines: [2, 2] },
          { say: 'Two repairs exist. Extract tables with a tool that reads the lines and cells of the page, and write rows with column names. Or, when the source file is a Word or HTML file, parse the table from there. Never leave a table as a row of words.', lines: [3, 4] }
        ],
        note: 'The Word and HTML parsers above keep tables as rows. A PDF needs a table-aware extractor, and none is used here. In the vector test of mission 4, the one question about a table failed for the stand-in embedding.'
      }),

      B.code({
        id: 'm2-clean', t: 1, src: 'rec', title: 'Cleaning: repeated lines, wrapped lines, a hash', file: 'ragkit.py', lang: 'python', code: CLEAN,
        steps: [
          { say: 'Three small functions. The first removes the lines that repeat on most pages. The handbook has a running header, `' + PDF.repeated_lines[0] + '`, and it appeared on all ' + PDF.header_copies_if_kept + ' pages.', lines: G.span(CLEAN, /^def drop_repeated_lines/, /return out, sorted/) },
          { say: 'A line counts as repeated when it is on at least 60 percent of the pages. That rule needs no list of headers, so it works on a file nobody has seen. The footer `Page 2 of 9` is a counter, so a pattern removes it.', lines: G.span(CLEAN, /repeated = /, /Page \\d\+ of/) },
          { say: 'Why remove them? A header on every page becomes text in every chunk, so a search for the word "Handbook" matches everything. After cleaning, the file went from ' + fmtN(PDF.chars_before_clean) + ' to ' + fmtN(PDF.chars_after_clean) + ' characters.', lines: null },
          { say: 'A PDF breaks lines inside a paragraph. `normalize` joins them back, keeps blank lines as paragraph breaks and fixes a non-breaking space. A chunker that respects paragraphs needs this.', lines: G.span(CLEAN, /^def normalize/, /return '\\n\\n'\.join\(p for p/) },
          { say: 'The last function is a hash of the text. A pipeline that hashes the cleaned text knows whether a file changed. Mission 5 uses it to skip work.', lines: G.span(CLEAN, /^def content_hash/, /return hashlib/) }
        ],
        note: 'The 60 percent rule fails on a one-page file and can remove a real line that repeats, such as a legal notice. Look at what it removed, as the recording does: one line.'
      }),

      B.code({
        id: 'm2-html', t: 1, src: 'rec', title: 'A web page, read two ways', file: 'menu-and-allergens.html (naive vs careful)', lang: 'text',
        code: '# naive get_text(), first 330 characters\n' + HT.naive_excerpt + '\n\n# careful, as markdown\n' + HT.markdown,
        steps: [
          { say: 'The menu page of Brewline has a navigation bar, a footer, a tracking script and a table of allergens. The first block is what `get_text()` returned, cut to 330 characters. The second is the careful version.', lines: null },
          { say: 'In the naive text, `Home | Menu | Stores | Careers` is right after the title. It is in every web page of the company, so it would sit in every chunk, and a search would match it for every question.', lines: [2, 2] },
          { say: 'Count the words: the naive text has ' + HT.naive_words + ', and the careful one has ' + HT.markdown_words + ', because the careful one adds the pipes of the table. More words, and none of them noise. Boilerplate found in the naive text: ' + HT.boilerplate_in_naive.length + ' pieces. In the careful text: ' + HT.boilerplate_in_markdown.length + '.', lines: null },
          { say: 'The allergen table is the content that matters. The careful version keeps it as rows: a drink, what it contains, what it may contain. That is how "Is the pistachio drink safe with a nut allergy?" gets an answer that a person can trust.', lines: G.span('# naive get_text(), first 330 characters\n' + HT.naive_excerpt + '\n\n# careful, as markdown\n' + HT.markdown, /^\| Drink/, /^\| Matcha/) }
        ],
        note: 'The page is generated, and so is its boilerplate. Real pages have more of it, and a library that finds the main content automatically may do better than a list of tags. Check its output on your own pages.'
      }),

      B.rows({
        id: 'm2-formats', t: 1, src: 'rec', title: 'Twelve files, read and cleaned',
        steps: [
          {
            say: 'This is the table that the recording wrote after parsing the twelve core files. For each file: its format, the labels it received, the characters that the parser read, and the characters that were kept after cleaning. A cleaning step that removes nothing, or half of a file, deserves a look.',
            tabs: [{ layer: 'FILES', name: 'What the parsers read and what was kept', c: 'raw', cols: FM.cols, rows: FM.rows.map(function (r) { return r.slice(); }), trk: 0 }],
            notes: ['The PDF files lost about 12 percent in cleaning: a header on every page. The Word and Markdown files lost nothing. A scanned file is not in this table, because it has no characters to count.']
          }
        ]
      }),

      B.talk({
        id: 'm2-scan', t: 2, src: 'rec', title: 'The file with no text',
        say: 'One file in the set is a scanned delivery note. I ran the same PDF parser on it. Press Next for what happened and what to do.',
        items: [
          ['What the parser returned', 'The file `' + SC.file + '` has ' + SC.pages + ' page and ' + SC.images_on_page + ' image on it. The text extractor returned **' + SC.chars_extracted + ' characters**. It raised no error. A pipeline that indexes whatever the parser returns will index an empty string and report success.', 'Success with nothing inside.'],
          ['Detect it', 'Count characters after parsing. A page with fewer than a small number of characters, and an image on it, is a scan. Send it to an OCR step or to a person, and write the decision in the document record. Never index an empty text.', 'An empty parse is a result to check.'],
          ['OCR, from documentation', 'An OCR step reads the pixels and returns text with a confidence for each part. It makes mistakes with small print, tables and handwriting. Keep the confidence next to the text and treat low-confidence pages as less reliable. A table in a scan is still a table to rebuild.', 'OCR text is text with errors.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm2-dedup-lab', kind: 'dedup', t: 1, src: 'rec', title: 'Lab: near-copies with MinHash' }),

      B.code({
        id: 'm2-copy', t: 2, src: 'rec', title: 'Masking, shingles and MinHash in code', file: 'ragkit.py', lang: 'python', code: COPY,
        steps: [
          { say: 'This is the part of the toolkit that handles personal data and near-copies. The patterns are on top. Each one finds the shape of a thing: an e-mail, a phone number with a country code, an IBAN.', lines: G.span(COPY, /^PII = /, /^PII = /) },
          { say: '`mask_pii` replaces each match with a label and counts them. A count that is zero for a file that should have some is a signal. A pattern finds a shape. It does not find a name, and a name can identify a person just as well.', lines: G.span(COPY, /^def mask_pii/, /return text, found/) },
          { say: 'A shingle is a run of five words. A document becomes a set of them, and the Jaccard similarity of two sets is the share they have in common. Two copies of a handbook share most of their shingles.', lines: G.span(COPY, /^def shingles/, /return len\(a & b\)/) },
          { say: 'Comparing every pair of sets does not scale. A MinHash is a short signature of a set, 128 numbers here, and the share of equal numbers in two signatures estimates the Jaccard similarity. A locality-sensitive hash then puts similar signatures in the same bucket, so you compare only those.', lines: G.span(COPY, /^def minhash/, /^    return m$/) }
        ],
        note: 'The patterns are examples for the Brewline formats. A real list for your country and your data needs review, and a pattern list is never complete. Dedicated tools find more kinds, such as names and addresses, and they also make mistakes.'
      }),

      B.code({
        id: 'm2-pii', t: 1, src: 'rec', title: 'Masking the meeting notes', file: 'meeting-notes-2026-03.txt (masked)', lang: 'text', code: MASKED,
        steps: [
          { say: 'The meeting notes of March contain two e-mail addresses, two phone numbers and an IBAN. This is the text after `mask_pii`. The recording counted ' + PII.found.email + ' e-mails, ' + PII.found.phone + ' phone numbers and ' + PII.found.iban + ' IBAN.', lines: null },
          { say: 'The contact lines now say `[EMAIL]` and `[PHONE]`. The labels keep the sentence readable, so a question about who to contact still finds the line without exposing the number.', lines: G.span(MASKED, /^Maria Santos can be reached/) },
          { say: 'The payroll line holds the IBAN, now `[IBAN]`. Note what stayed: the order reference `ORD-2026-0412` and the product code `SKU-4471`. They are not personal data, and a good pattern leaves them alone.', lines: G.span(MASKED, /^3\. Payroll/) },
          { say: 'And look at the second line: `' + PII.names_in_text.join(' and ') + '` are still there. The patterns cannot find a name. The recording checked, and both names remain. Names need a different tool or a rule, and a decision about whether they are personal data in your context.', lines: G.span(MASKED, /^Present:/) },
          { say: 'A loose pattern would do harm. A pattern for "nine or more digits, dashes or spaces" matched ' + PII.loose_pattern_hits.length + ' places in this note: both phone numbers, the digits of the IBAN, and the end of the order reference `' + PII.loose_pattern_hits[3] + '`. The bug hunt below uses it.', lines: null }
        ],
        note: 'Mask before chunking and embedding. An embedding of a phone number is also personal data, and you cannot take it out by editing a text file later. The original stays in the raw zone with tight access.'
      }),

      B.code({
        id: 'm2-record', t: 1, src: 'rec', title: 'The record that travels with a document', file: 'record.json', lang: 'json', code: REC,
        steps: [
          { say: 'Every document leaves the parsing stage with a small record. This is the one for the second version of the handbook. It is data about the data, and the rest of the pipeline depends on it.', lines: null },
          { say: '`audience` says who may read the document, and `current` says whether it is the version to use. Both labels will be copied to every chunk. They are the filter that mission 5 runs inside the search.', lines: G.span(REC, /"audience"/, /"current"/) },
          { say: '`hash` is the content hash of the cleaned text. When the next night\'s run computes the same hash, nothing changed, and nothing is re-embedded.', lines: G.span(REC, /"hash"/) },
          { say: '`source` points at the untouched original in the lake, and `parsed_with` names the parser and its version. When an answer is wrong, these two fields let you find the file, and show that the parser could be the cause.', lines: G.span(REC, /"source"/, /"parsed_with"/) }
        ],
        note: 'A real record has more: an owner, a retention date, a language, a confidentiality class. Add a field when a decision needs it, and write down who sets it.'
      }),

      B.cmp({
        id: 'm2-versions', t: 1, src: 'rec', title: 'Two versions of one handbook',
        say: 'The handbook exists in two versions, and the rules changed between them. Press Next to read what differs. The two documents share ' + VER.shared_sentences + ' sentences, and the differences are exactly the sentences that an assistant must not mix up.',
        cols: ['', 'Version 1 (old)', 'Version 2 (current)'],
        hl: 2,
        rows: [
          ['Return window', VER.only_in_v1[0], VER.only_in_v2[0]],
          ['Second manager', VER.only_in_v1[1], VER.only_in_v2[1]],
          ['Similarity', 'Jaccard ' + DUP[2] + ' with version 2', 'MinHash estimate ' + DUP[3]]
        ],
        steps: [
          { upto: 1, say: 'The refund window: 30 days in the old handbook, 14 in the new one. A customer who waits 20 days gets a different answer, depending on which chunk the search picks.' },
          { upto: 2, say: 'The refund amount that needs a second manager: EUR 100 before, EUR 50 now. The two sentences differ in one number, so a vector search finds both with almost the same score.' },
          { upto: 3, say: 'The two files are ' + DUP[2] + ' alike. A near-copy check will flag them. The right reaction is not to delete one. It is to label the old one as not current.' }
        ],
        pick: 'Keep both, **label the old one** `current = false`, and let the search filter on `current`. The old text answers a question like "what was the rule last year?", and an audit may ask for it.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'After parsing, the line `' + PDF.repeated_lines[0] + '` sits at the top of every page of the handbook. What goes wrong if you keep it?',
        opts: [
          { t: 'It lands in every chunk, so a search matches the header for many questions and the chunks carry noise', fb: '' },
          { t: 'The file becomes too large to store', fb: 'The lines add a few hundred characters. Storage is not the problem.' },
          { t: 'The PDF stops opening', fb: 'Parsing does not change the PDF file.' },
          { t: 'Nothing, because a model ignores headers', fb: 'A model reads what it is given, and a search matches words in it.' }
        ],
        ok: 0, why: 'A running header repeats on every page, so it ends up in every chunk. A keyword search matches it, a vector shifts toward it, and the prompt pays tokens for it. Remove the lines that repeat on most pages.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'A PDF parser returned `Rotterdam Station 06:30 to 20:00 08:00 to 19:00 closed` for a table row. Which question is the most likely to get a wrong answer?',
        opts: [
          { t: 'When is the Rotterdam store open on Sunday?', fb: '' },
          { t: 'What is the name of the Rotterdam store?', fb: 'The name is at the start of the line and is not ambiguous.' },
          { t: 'Does Brewline have a store in Rotterdam?', fb: 'The line answers that, whatever the table structure.' },
          { t: 'Is the handbook for managers?', fb: 'This is a label of the document, not of the table.' }
        ],
        ok: 0, why: 'The cells have lost their column. To know which time is Sunday you must know the header and count cells, and `closed` is a single word. Extract tables as rows with column names, so that each cell stays next to its header.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'The parser returns an empty string for a delivery note and raises no error. What should the pipeline do?',
        opts: [
          { t: 'Detect the empty text, route the file to OCR or to a person, and record that decision', fb: '' },
          { t: 'Index the empty text, since the parser succeeded', fb: 'An empty chunk answers nothing and hides a missing document.' },
          { t: 'Delete the file', fb: 'The file may hold something that matters. Do not destroy the original.' },
          { t: 'Retry the same parser until it returns text', fb: 'It will return the same empty string every time.' }
        ],
        ok: 0, why: 'A scan is an image, so a text extractor finds nothing. The check is cheap: count characters after parsing. The file then goes to OCR, with its confidence kept, or to a person, and the record says what was done.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'You set the MinHash threshold to 0.9, and the two handbook versions are not flagged. Their exact Jaccard similarity is ' + DUP[2] + '. What is the right conclusion?',
        opts: [
          { t: 'The threshold is above their similarity. Choose it on pairs that people labelled', fb: '' },
          { t: 'The MinHash is broken', fb: 'The estimate is close to the exact value. The threshold decides what is flagged.' },
          { t: 'The two files are different documents', fb: 'They share most of their sentences. They are versions of one document.' },
          { t: 'Use 1.0 for the safest result', fb: 'Only identical sets reach 1.0, so it would flag almost nothing.' }
        ],
        ok: 0, why: 'A threshold is a decision about how alike two texts must be. Too high misses versions, and too low groups unrelated files that share a footer. Label a sample of pairs by hand and pick the value that separates them, as the lab did.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the intake of one document in order.',
        items: [
          'Store the original file untouched in the lake',
          'Detect the format and parse it into text',
          'Check that the text is not empty',
          'Remove headers, footers and wrapped lines',
          'Mask personal data',
          'Hash the cleaned text and write the record with audience, version and current',
          'Hand the text and its labels to the chunker'
        ],
        why: 'Keep the original first, so that every later step can be redone. Check for an empty parse before you spend work on it. Mask before chunking and embedding, because a copy of private data in the index is hard to remove. The record and the hash come last, because they describe the final text.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This cleaning function should mask phone numbers. A reviewer finds that it also changes order references and prices. Click the line that causes it.',
        file: 'clean.py', lang: 'python', code: BUG1, bad: [5],
        hint: 'What does the pattern accept besides digits?',
        why: 'The pattern `[\\d\\-\\s+]{9,}` accepts any run of nine or more digits, dashes, spaces and plus signs. It matched the tail of `ORD-2026-0412` and the digits of an IBAN in the recording. A phone pattern should state the shape: a plus sign, a country code, then the right number of digits.',
        fix: FIX1,
        cheer: 'Mask the shape, not the characters.'
      }),

      B.bug({
        id: 'm2-bug2', t: 2, src: 'docs', q: 'This function should keep the newest version of each document. It keeps version 9 and drops version 10. Click the line with the bug.',
        file: 'newest.py', lang: 'python', code: BUG2, bad: [5],
        hint: 'Compare "v9" and "v10" as text.',
        why: 'Versions are strings, and strings compare letter by letter: `"v9" > "v10"` is true, because `9` comes after `1`. The older version wins. Compare numbers, not text, and better still store the version as an integer in the record.',
        fix: FIX2,
        cheer: 'Compare versions as numbers.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'rec', title: 'Decision: what happens to the old handbook?',
        scenario: 'Version 2 of the handbook is published. A near-copy check flags version 1 as ' + DUP[2] + ' similar. The old file holds a refund window that is no longer true. Two managers still ask "what was the rule last year?".',
        opts: [
          { t: 'Delete version 1 from the lake and the index', d: 'No chance of a wrong answer from it.', lose: 'The history is gone. A dispute about a refund from last year cannot be settled, and an audit finds a hole.' },
          { t: 'Keep it, label it `current = false`, and filter search on `current` by default', d: 'The old rule stays available for history, and normal questions never see it.' },
          { t: 'Keep both as equals and let the model decide which is newer', d: 'Nothing is lost, and nothing is done.', lose: 'A model cannot know which one is current unless the label says so. The vector scores of the two are almost the same, and 12 of 24 questions had an old chunk in the top 5 in the recording.' }
        ],
        pick: 1,
        why: 'A label costs nothing and keeps the history. The filter makes the default safe, and a question about the past can ask for old versions explicitly. Deleting is a one-way door, and a model cannot repair a missing label.',
        when: 'Delete when a rule of retention or privacy says so, for example a document that must be erased. Then delete the chunks and the vectors as well, and keep a note that says when and why.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'docs', title: 'Incident: the assistant read out a phone number', time: '14:05',
        alert: '**A store manager asked what was decided at the March meeting, and the assistant answered with a colleague\'s private phone number and an IBAN.** The meeting notes were ingested as raw text. The ingestion has no masking step. The notes are readable by all managers.',
        clues: ['The notes file is plain text with contact details inside', 'The pipeline chunks the raw text', 'The chunks and their vectors are already in the index', 'The system prompt already says "do not share personal data"'],
        opts: [
          { t: 'Add masking to the parsing step, re-ingest the notes, delete the old chunks and vectors, and add a test question for it', fb: '' },
          { t: 'Tell the model in the prompt, in capital letters, never to repeat numbers', fb: 'The number is still in the prompt that the model reads. An instruction is not a control.' },
          { t: 'Delete the answer from the chat log and carry on', fb: 'The data is still in the index and will come out again.' },
          { t: 'Mask the number in the answer after the model has written it', fb: 'It helps as a last line, and the private data is still in the chunks, the vectors and the logs.' }
        ],
        best: 0,
        why: 'The private data is in the index, so every route to it must be closed at the source. Masking in the parsing step keeps it out of chunks, vectors and logs. The old chunks and vectors must go too. A test question that asks for the contact details closes the loop.',
        checks: [
          ['Find the source', 'Which file and which chunks held the numbers? Search the index for the masked patterns.'],
          ['Contain it', 'Remove the file from the index, or restrict its audience now, so that no new answer shows it.'],
          ['Fix the step', 'Add masking at parse time, with tests on a file that has e-mails, phone numbers and an IBAN.'],
          ['Clean up', 'Re-ingest the file, delete the old chunks and vectors, and check the logs and caches that held the answer.'],
          ['Guard', 'Add an evaluation question that must be refused or masked, and run a pattern scan over the index in CI.']
        ],
        tell: 'An assistant answered with a colleague\'s phone number and an IBAN from meeting notes that had been ingested raw. I took the file out of the index at once, added a masking step to parsing with tests on e-mails, phone numbers and an IBAN, re-ingested the notes and deleted the old chunks and vectors, and checked the logs and the cache. I added an evaluation question that must not return a number, and a scan of the index for those patterns in the release checks.',
        prevent: ['Mask personal data at **parse time**, before chunking and embedding', 'Treat **an instruction in a prompt** as a hint, never as a control', 'Scan the **index** for patterns of personal data in CI', 'Keep an **evaluation question** that must not leak']
      }),

      B.qa({
        id: 'qa-parse', t: 1, tag: 'Documents', secs: 60,
        q: 'How do you get PDF, Word and HTML files into a retrieval pipeline?',
        pts: ['Keep the original file untouched', 'One parser for each format, keeping headings and tables', 'Clean headers, footers, wrapped lines and boilerplate', 'Check for an empty parse and send scans to OCR', 'Label audience, version and current, and hash the text', 'Look at the parsed text next to the original'],
        short: 'I keep the original file untouched in the raw zone, so that I can re-run the parser on the same bytes later. Then I pick a parser for each format. For Word I walk the document in order and keep the heading styles and tables. For a web page I drop the menu, the scripts and the footer, and keep the headings and the table rows. For a PDF I extract text for each page and remove the lines that repeat on most pages, such as a running header.\n\nAfter parsing I check that the text is not empty, because a scanned file returns nothing and raises no error, and I send those to OCR or a person. I mask personal data, hash the cleaned text, and write a record with the audience, the version and whether it is current, which travels with every chunk.\n\nAnd I always open the parsed text next to the original for one file of each format, because most retrieval bugs are visible there.',
        fu: [
          ['What would you change for a very large scanned archive?', 'A layout-aware parser or an OCR service, with a confidence for each page, a review queue for low scores, and a record that says the text came from OCR.'],
          ['How do you know the parser is good enough?', 'A sample of questions whose answers are in tables and headings, scored on retrieval. If the right chunk is missing, I read the parsed text first.']
        ],
        trap: 'Using `get_text()` for everything. It keeps the menu and the footer and flattens the tables.',
        real: 'Describe a file type that surprised you and what you changed in the parser.'
      }),

      B.qa({
        id: 'qa-tables', t: 1, tag: 'Documents', secs: 60,
        q: 'A table in a PDF comes out of the parser as a row of words. What do you do?',
        pts: ['A cell without its column is ambiguous', 'Use a table-aware extractor, or parse the source format', 'Write rows with column names, for example as markdown', 'Keep the table in one chunk, with its heading', 'Test with questions whose answers sit in tables', 'Fall back to a person for hard layouts'],
        short: 'A cell without its column is ambiguous, so I do not leave a table as running text. If the table comes from a Word or HTML source, I parse it from there, where the rows and cells are real. For a PDF I use a table-aware extractor that reads the lines and the cell borders of the page, and I write each table as rows with the column names, for example as markdown or as one sentence for each row.\n\nThen I make the chunker keep a small table in one chunk with its heading, so that a row never loses its header. And I add questions whose answers sit in tables to the evaluation set. In my recording, the one question about a table was the one that the vector search failed on, while the keyword search found it, so I know that the evaluation will catch a regression.\n\nFor layouts that no tool handles, I accept a manual step, and I record that the table was entered by hand.',
        fu: [
          ['Would you ask a model to rebuild the table?', 'Maybe as a last step, with a check that the numbers sum or match. A model can also invent a cell, so I verify it.'],
          ['What if the table is very long?', 'Split by rows, and repeat the header in every chunk.']
        ],
        trap: 'Trusting the vector search with a flattened table. The numbers and the headers lose their link.',
        real: 'Describe a table that broke a retrieval step and how you repaired it.'
      }),

      B.qa({
        id: 'qa-dedup', t: 2, tag: 'Documents', secs: 60,
        q: 'How do you find near-duplicate documents, and what do you do with them?',
        pts: ['Exact copies: hash the cleaned text', 'Near-copies: shingles and Jaccard similarity', 'MinHash makes the comparison cheap, LSH finds candidates', 'The threshold is a decision, tested on labelled pairs', 'Versions are not duplicates: label, do not delete', 'Log what was merged and why'],
        short: 'Exact copies are easy: I hash the cleaned text and compare the hashes. For near-copies I turn each document into a set of shingles, which are runs of five words, and compare the sets with Jaccard similarity. Doing that for every pair is too slow, so I use MinHash to make a short signature of each set, and a locality-sensitive hash to find the candidate pairs.\n\nThe threshold is a decision, so I choose it on pairs that people labelled. In my test, two versions of a handbook were 0.81 alike. A threshold of 0.9 missed them, and a threshold of 0.3 grouped unrelated files that shared a footer.\n\nWhat I do with a near-copy depends on what it is. A re-upload I drop. A newer version of a document I keep, and I label the older one as not current, because people ask about the past and auditors ask for it. I log what was merged and why.',
        fu: [
          ['Why not compare embeddings?', 'You can, and it finds copies in other words too. It is also slower and fuzzier, and for exact wording and versions, shingles are the more predictable tool.'],
          ['What does a high threshold risk?', 'Missing versions. What a low one risks is merging unrelated documents.']
        ],
        trap: 'Deleting one of two near-copies automatically. One of them may be the current version.',
        real: 'Describe a duplicate problem you found and how you decided what to keep.'
      }),

      B.qa({
        id: 'qa-pii', t: 1, tag: 'Documents', secs: 60,
        q: 'How do you deal with personal data in documents that you index?',
        pts: ['Decide what counts as personal data, with the privacy team', 'Mask at parse time, before chunking and embedding', 'Patterns find shapes: e-mail, phone, IBAN, not names', 'Test the patterns on both sides: misses and false hits', 'Keep the original in the raw zone with tight access', 'Scan the index and the logs'],
        short: 'First I agree with the privacy team on what counts as personal data for this use, because the answer depends on the law and on the purpose. Then I mask it at parse time, before chunking and embedding, because a vector made from a phone number is also personal data and I cannot edit it out later.\n\nFor the common shapes I use patterns: an e-mail, a phone number with a country code, an IBAN. I test them both ways. In my recording they found two e-mails, two phone numbers and an IBAN, and left an order reference alone, while a looser pattern also changed the end of an order id. They did not find the two names, which need another tool or a rule.\n\nThe original stays in the raw zone with tight access, I scan the index and the logs for the patterns in CI, and I keep an evaluation question that must not return a private number.',
        fu: [
          ['Why not instruct the model not to repeat it?', 'The data would still be in the prompt and the logs. An instruction is not a control. Remove the data first.'],
          ['What about names?', 'A named-entity tool helps, and it makes mistakes both ways. For some data a rule or a person decides, and the decision is recorded.']
        ],
        trap: 'Relying on a prompt that says "do not share private data". The data is already in the index.',
        real: 'Describe a pipeline where you masked or removed personal data, and how you tested it.'
      }),

      B.qa({
        id: 'qa-version', t: 1, tag: 'Documents', secs: 60,
        q: 'The company changes a policy. How do you stop the assistant from quoting the old version?',
        pts: ['Keep the old version, label it not current', 'Copy the label to every chunk', 'Filter on current inside the search', 'Re-index when the label changes, without re-embedding', 'Test with a question that has two answers', 'Keep history for questions about the past'],
        short: 'I do not delete the old version. I keep it with a label that says it is not current, and I copy that label to every chunk, so that each chunk knows whether it is current. At question time the search filters on `current` inside the search, so an old chunk is never a candidate. In my test, twelve of twenty-four questions had a chunk of the old handbook in the top five without the filter, and none with it.\n\nWhen the label changes, only the labels need updating, and nothing is re-embedded, because the text did not change. I keep the old version because people ask about the past and an audit may need it.\n\nAnd I add a question to the evaluation set that has two answers, an old one and a new one, such as the refund window, so that a release fails if the old answer comes back.',
        fu: [
          ['What if two documents are both current and disagree?', 'That is a content problem. The assistant should say that sources disagree and show both, and someone should own fixing the documents.'],
          ['How do you find which questions are affected?', 'The evaluation set, and the logs of real questions that retrieved the old chunk.']
        ],
        trap: 'Relying on "newer is better" in the prompt. The model cannot tell which chunk is newer.',
        real: 'Describe a policy change that reached production and how the index handled it.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Document Wrangler', color: '#FDE68A',
        pts: [
          'A **PDF** is placed text, **Word** has real structure, a **web page** has noise, a **scan** has no text. Parse each as it is.',
          '**Clean** the repeated header, the wrapped lines and the boilerplate, and write **tables as rows** with their column names.',
          'An **empty parse** is a result to check, not a success.',
          '**Mask personal data** at parse time with patterns that state the shape. Patterns do not find names.',
          'Find near-copies with **shingles and MinHash**, and **keep versions** with a label instead of deleting them.',
          'Every document carries a **record**: hash, version, audience, current, source.'
        ],
        lines: [
          'I read the parsed text next to the original, for every format.',
          'I mask before I chunk, and I label before I index.',
          'I keep the old version and filter it out.'
        ]
      })
    ]
  });
  function fmtN(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
})();
