/* Mission 5: files and formats. CSV traps, encodings, JSON Lines, atomic writes, Parquet, paths, with real output and real sizes. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TRAPS = G.file('m5/csv_traps.py'), ENC = G.file('m5/encodings.py'), JL = G.file('m5/json_lines.py'), ATOM = G.file('m5/atomic_write.py'), PATHS = G.file('m5/paths.py'), PQ = G.file('m5/parquet_tour.py'), LOG = G.file('m5/parse_log.py'), PART = G.file('m5/write_partitions.py'), SAFE = G.file('m5/read_csv_safely.py');
  var TRAPST = G.text('m5/csv_traps.py'), ENCT = G.text('m5/encodings.py'), JLT = G.text('m5/json_lines.py'), ATOMT = G.text('m5/atomic_write.py'), PATHST = G.text('m5/paths.py'), PQT = G.text('m5/parquet_tour.py'), LOGT = G.text('m5/parse_log.py'), PARTT = G.text('m5/write_partitions.py'), SAFET = G.text('m5/read_csv_safely.py');
  var FM = G.counts('m5.formats'), EN = G.counts('m5.encoding');

  function fmt(x, d) { return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mb(x) { return fmt(x / 1e6, 1) + ' MB'; }
  function f(name) { var r = FM.formats.filter(function (x) { return x.format === name; })[0]; G.expect(!!r, 'a recorded format ' + name); return r; }
  var CSV = f('CSV'), CSVGZ = f('CSV, gzip'), CSVZ = f('CSV, zstd'), JSONL = f('JSON Lines'), JSONLGZ = f('JSON Lines, gzip'), PSN = f('Parquet, snappy'), PZS = f('Parquet, zstd');
  G.expect(JSONL.bytes > 2 * CSV.bytes && PZS.bytes < CSV.bytes / 3 && CSVGZ.bytes < CSV.bytes / 3, 'JSON Lines is more than twice the CSV, and Parquet with zstd and gzip are under a third of it');
  G.expect(CSV.query_ms / PZS.query_ms > 10 && CSV.query_ms / PSN.query_ms > 10, 'the query over Parquet is more than ten times faster than over CSV');
  G.expect(FM.formats.every(function (x) { return Math.abs(x.total - CSV.total) < 0.5; }), 'every format gave the same total');
  var SPEED = CSV.query_ms / PZS.query_ms;
  function cell(t, fe, ra) { var c = EN.cells[t + '|' + fe + '|' + ra]; G.expect(!!c, 'an encoding cell ' + t + ' ' + fe + ' ' + ra); return c; }
  G.expect(cell('café', 'utf-8', 'latin-1').text === 'cafÃ©' && /unexpected end of data/.test(cell('café', 'latin-1', 'utf-8').error) && cell('東京', 'latin-1', 'utf-8').bytes === null, 'café read with the wrong codec, and 東京 cannot be saved as latin-1');
  G.expect(/with the csv module:/.test(TRAPST) && /5 fields/.test(TRAPST) && /3 fields/.test(TRAPST), 'a line split sees 5 and 3 fields in two of the lines');
  G.expect(/0 orders readable/.test(JLT) && /readable lines: 3/.test(JLT), 'a cut array loses everything, a cut JSON Lines file loses one line');
  G.expect(/3 of 5 orders, and last night's file is gone/.test(ATOMT) && /still has 1 order from last night/.test(ATOMT), 'an in-place write leaves 3 of 5 rows, an atomic write leaves the old file');
  G.expect(/\['part-1\.csv', 'part-10\.csv', 'part-2\.csv'\]/.test(PATHST), 'part-10 sorts before part-2 as text');
  G.expect(/1 of 4 row groups/.test(PQT), 'the statistics pick 1 of 4 row groups');

  function rows(text, re) { return text.split('\n').filter(function (l) { return re.test(l); }); }
  var LOGROWS = rows(LOGT, /^2026-/).map(function (l) { var p = l.split(/\s+/); return [p[0], p[1], p[2], p[3], p[4]]; });
  var PARTROWS = rows(PARTT, /^dt=/).map(function (l) { var m = /^(dt=[\d-]+)\/(\S+)\s+(\d+) rows/.exec(l); return [m[1] + '/' + m[2], m[3]]; });
  function fn(file, name) { var a = G.at(file, new RegExp('^def ' + name)), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return G.lines(file, a, b); }
  var LOGFN = G.lines(LOG, G.at(LOG, /^PATTERN/), G.span(LOG, /^def parse_log/, /return good, bad/)[1]), PARTFN = fn(PART, 'write_partitions');
  var SPLIT = /with line\.split\(','\):\n([\s\S]*?)\n\nwith the csv module:/.exec(TRAPST);

  var BUG_SPLIT = ['for line in open("orders.csv"):', '    fields = line.rstrip("\\n").split(",")', '    save(fields)'].join('\n');
  var BUG_SPLIT_FIX = ['import csv', 'with open("orders.csv", newline="", encoding="utf-8-sig") as f:', '    for fields in csv.reader(f):', '        save(fields)'].join('\n');
  var BUG_ENC = ['rows = []', 'with open("supplier.csv") as f:', '    for line in f:', '        rows.append(line)'].join('\n');
  var BUG_ENC_FIX = ['rows = []', 'with open("supplier.csv", encoding="utf-8-sig") as f:', '    for line in f:', '        rows.append(line)'].join('\n');
  var BUG_SORT = ['files = sorted(folder.glob("part-*.csv"))', 'for path in files:', '    load(path)  # the files must load in order'].join('\n');
  var BUG_SORT_FIX = ['files = sorted(folder.glob("part-*.csv"), key=lambda p: int(p.stem.split("-")[1]))', 'for path in files:', '    load(path)'].join('\n');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Files and formats', short: 'Files', blurb: 'CSV, JSON lines, compression, Parquet, encodings and safe writes', minutes: 24,
    focus: ['src', 'ing', 'mart'],
    goals: [
      'Read a **CSV** that has quotes, line breaks and a byte order mark, and say why `split(",")` fails.',
      'Say what an **encoding** is, and read the three outcomes: right text, garbled text, an error.',
      'Choose between **CSV, JSON Lines and Parquet** from real sizes and real query times.',
      'Write a file so that a stopped job leaves the **old file or the new one**, never half.',
      'Lay out files in **folders by date** and sort file names without surprises.'
    ],
    say: 'Mission 5 is about the files that every pipeline starts and ends with. The same 200,000 orders were written in seven formats and queried, so the sizes are exact and the times are medians from one machine. The encoding results and the broken files come from real Python runs.',
    scenes: [
      B.talk({
        id: 'm5-talk', t: 1, src: 'docs', title: 'A file is bytes',
        say: 'Before a script can use a file it has to turn bytes into values. Press Next for the five places where that goes wrong.',
        items: [
          ['Bytes to text: the encoding', 'A text file holds bytes. An encoding is the rule that turns bytes into characters, and the wrong rule gives wrong characters or an error.', 'Say the encoding.'],
          ['Text to rows: the format', 'CSV, JSON Lines and Parquet are three rules for turning characters or bytes into rows and columns. Each has traps.', 'Parse with a parser.'],
          ['Rows to bytes: compression', 'Compression makes files smaller and reading a little slower. Some formats compress per column, which changes what a query has to read.', 'Size and speed together.'],
          ['Whole or half', 'A file written by a job that stopped is half a file. A reader cannot tell unless the writer was careful.', 'Write atomically.'],
          ['Where it lives: paths', 'Folders by date let a job read one day. File names sort as text, and `part-10` sorts before `part-2`.', 'Name for the sort.']
        ],
        cols: 1
      }),

      B.term({
        id: 'm5-traps', t: 1, src: 'rec', title: 'A CSV file with three traps',
        say: 'One small supplier file with three orders. It has a quoted comma, a quoted line break and a byte order mark. Here it is read with `split(",")` and with the csv module.',
        lines: function () { return G.plain(TRAPST, { cmd: 'python csv_traps.py' }); },
        after: 'The file has **3 orders and 5 lines**. `split` saw five records with 4, 5, 3, 2 and 4 fields: it cut "Ng, Mei" in two and broke the note at its line break. The csv module read **3 rows**, with the comma and the line break kept inside their values. One trap is left: the first column is called `\\ufefforder_id`, because the byte order mark was read as part of the name.',
        afterKind: 'warn',
        doneSay: 'Use the csv module, always. Splitting on commas works until the first quoted comma.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1, src: 'rec',
        q: 'In the recording the supplier file holds 3 orders. How many lines does it have, and how many rows does `csv.DictReader` read?',
        opts: [
          { t: '5 lines and 3 rows', fb: '' },
          { t: '3 lines and 3 rows', fb: 'A quoted field can contain a line break, so the file has more lines than rows. The recording shows 5 lines.' },
          { t: '5 lines and 5 rows', fb: 'The csv module reads a quoted line break as part of the value, so it keeps 3 rows.' },
          { t: '4 lines and 3 rows', fb: 'The header counts as a line, and the note adds another. The recording counted 5.' }
        ],
        ok: 0, why: 'A line is a line break in the bytes. A row is a record of the format. Quoting lets one row span two lines, and only a CSV parser knows the difference.'
      }),

      B.bug({
        id: 'm5-bug1', t: 1, src: 'rec', q: 'This loop saves the fields of a supplier CSV. On the real file it saves rows with the wrong number of fields. Click the line that causes it.',
        file: 'load.py', lang: 'python', code: BUG_SPLIT, bad: [2],
        hint: 'What does a comma inside quotes look like to `split`?',
        why: '`split(",")` knows nothing about quotes. In the recording it cut a quoted name in two and a quoted note at its line break, giving rows of 5, 3 and 2 fields. The csv module follows the rules of the format. Open the file with `newline=""` so that it can see the line breaks itself.',
        fix: BUG_SPLIT_FIX,
        cheer: 'A parser for a format, never a split.'
      }),

      B.code({
        id: 'm5-safe', t: 1, src: 'rec', title: 'The safe way to read a CSV', file: 'read_csv_safely.py', lang: 'python', code: SAFE,
        steps: [
          { say: 'Four settings that remove the three traps. It was run on the same supplier file, and the output is below.', lines: null },
          { say: '`encoding="utf-8-sig"` reads UTF-8 and drops a byte order mark if there is one. Without a mark it behaves like plain UTF-8.', lines: G.span(SAFE, /^with open/, /^with open/) },
          { say: '`newline=""` hands the line breaks to the csv module, which needs them to handle quoted breaks.', lines: G.span(SAFE, /^with open/, /^with open/) },
          { say: '`csv.DictReader` turns each row into a dict by the header names. The first column is now `order_id`.', lines: G.span(SAFE, /rows = list/, /rows = list/) },
          { say: 'The quoted comma stays in the name, the quoted break stays in the note, and the money adds up.', lines: G.span(SAFE, /^print\("rows/, /^print\("total/) }
        ],
        note: 'Output:\n\n' + SAFET.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.code({
        id: 'm5-enc', t: 1, src: 'rec', title: 'Text, bytes and encodings', file: 'encodings.py', lang: 'python', code: ENC,
        steps: [
          { say: 'Four texts, three encodings, and what happens when the reader and the writer disagree. Everything on the next screens is real output.', lines: null },
          { say: 'For each text and each encoding the program encodes it, prints the bytes in hex, and says when an encoding cannot represent the text.', lines: G.span(ENC, /^for text in/, /cannot encode/) },
          { say: 'UTF-8 uses one byte for plain English letters and more for the rest: `é` takes two bytes. Latin-1 uses one byte for each of 256 characters. UTF-16 uses two or more, and adds a byte order mark.', lines: null },
          { say: 'Bytes written as UTF-8 and read as Latin-1 give `cafÃ©`. There is no error: every byte is a valid Latin-1 character. This is called mojibake.', lines: G.span(ENC, /^data = "café"/, /^print\("the bytes of 'café' in UTF-8/) },
          { say: 'The other way round, Latin-1 bytes read as UTF-8, fails: `é` alone is not a valid UTF-8 sequence. Python raises `UnicodeDecodeError` and says which byte. `errors="replace"` hides it with a placeholder.', lines: G.span(ENC, /^print\("the bytes of 'café' in latin-1/, /^print\("the same bytes/) },
          { say: 'A byte order mark at the start of a UTF-8 file is the three bytes `ef bb bf`. Plain `utf-8` keeps it as a character `\\ufeff`. `utf-8-sig` removes it.', lines: G.span(ENC, /^print\("a file saved with/, /^print\("a file saved with/) }
        ]
      }),

      B.widget({ id: 'm5-lab-enc', kind: 'encoding', t: 1, src: 'rec', title: 'Lab: saved as one encoding, read as another' }),

      B.quiz({
        id: 'm5-q2', t: 1, src: 'rec',
        q: 'A file with the text `café` is saved as UTF-8 and read with `latin-1`. What does the recording show?',
        opts: [
          { t: '`cafÃ©`, with no error', fb: '' },
          { t: 'A UnicodeDecodeError', fb: 'That happens in the other direction, Latin-1 bytes read as UTF-8. Every byte is a valid Latin-1 character, so reading it never fails.' },
          { t: '`café`, because Python detects the encoding', fb: 'Python does not detect it. It uses the one you name, or the default of the machine.' },
          { t: 'An empty string', fb: 'The bytes are all read. They are just read with the wrong rule.' }
        ],
        ok: 0, why: 'UTF-8 stores `é` as two bytes, `c3 a9`. Latin-1 reads each byte as its own character, `Ã` and `©`. The result is wrong, and nothing complains. A loud failure would have been easier to find.'
      }),

      B.cmp({
        id: 'm5-encs', t: 1, src: 'docs', title: 'The encodings you will meet',
        say: 'Five names cover most files. Press Next to read what each one is for.',
        cols: ['Encoding', 'What it is', 'You meet it when'],
        hl: 1,
        rows: [
          ['UTF-8', 'Every character, one to four bytes. The same as ASCII for English text. The default of the web and of most tools.', 'Almost always. Write it, and ask suppliers for it.'],
          ['UTF-8 with a byte order mark (`utf-8-sig`)', 'UTF-8 with three marker bytes at the start.', 'Files saved by Excel and by some Windows tools.'],
          ['Latin-1 (ISO 8859-1)', 'One byte, 256 characters, Western European. Every byte is valid, so reading never fails.', 'Old systems and old exports.'],
          ['cp1252 (Windows-1252)', 'Like Latin-1, with curly quotes and the euro sign in place of some control codes.', 'Files from Windows programs in Western Europe and the US.'],
          ['UTF-16', 'Two or four bytes for each character, with a byte order mark.', '"Unicode text" files from Windows tools, and some database exports.']
        ],
        steps: [
          { upto: 2, say: 'UTF-8 is the one to write. Read the mark-prefixed variant with `utf-8-sig`.' },
          { upto: 5, say: 'The others tell you where a file came from. If a UTF-8 read fails, try the encoding of the source system, and say which one in the code.' }
        ],
        pick: 'Always pass `encoding=` to `open`. Write **UTF-8**. If you must read an unknown file, guess from where it came from and **fail loudly** on a mismatch.'
      }),

      B.bug({
        id: 'm5-bug2', t: 1, src: 'rec', q: 'This code reads the supplier file and works on the Linux server. A colleague on Windows gets `Zoë` as `ZoÃ«` and a first column named `ï»¿order_id`. Click the line that depends on the machine.',
        file: 'read.py', lang: 'python', code: BUG_ENC, bad: [2],
        hint: 'Which encoding does `open` use when you do not say?',
        why: 'Without `encoding=`, `open` uses the default of the machine: UTF-8 on most Linux systems, and the code page of the locale, often cp1252, on Windows. The same file and the same code then give different text. Name the encoding. A file that came from Excel may also start with a byte order mark, which `utf-8-sig` removes. (Python 3.15 is planned to make UTF-8 the default in PEP 686. Code that names the encoding does not depend on that.)',
        fix: BUG_ENC_FIX,
        cheer: 'Never let the machine choose the encoding.'
      }),

      B.code({
        id: 'm5-jl', t: 1, src: 'rec', title: 'JSON, JSON Lines and a file cut in the middle', file: 'json_lines.py', lang: 'python', code: JL,
        steps: [
          { say: 'Five orders as one JSON array and as JSON Lines, one object per line. Then an upload that stopped at byte 118.', lines: null },
          { say: 'Two ways to write the same data. The array is one document. The lines file is five small documents, one on each line.', lines: G.span(JL, /^whole = /, /^lines = /) },
          { say: 'The array cut in the middle is not valid JSON, so the whole file fails to parse. In the recording, **0 orders** were readable.', lines: G.span(JL, /^try:/, /0 orders readable/) },
          { say: 'The lines file loses only what was cut. Three lines were readable and one was broken, the last. You can read the good lines and report the bad one.', lines: G.span(JL, /^good = bad = 0/, /^print\("  the last bytes/) }
        ],
        note: 'Output:\n\n' + JLT.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.quiz({
        id: 'm5-q3', t: 1, src: 'rec',
        q: 'An upload of 5 orders is cut off in the middle. Per the recording, how many orders can a reader recover from the JSON array and from the JSON Lines file?',
        opts: [
          { t: 'None from the array, and three from the JSON Lines file', fb: '' },
          { t: 'Three from both, because both hold the same data', fb: 'The array is one document, so a cut anywhere makes the whole document invalid.' },
          { t: 'None from either, because the file is corrupt', fb: 'Each line of a JSON Lines file is a document of its own, so the complete lines can still be read.' },
          { t: 'Four from the array, because it stops at an order', fb: 'The cut fell in the middle of an order, and a parser needs the closing bracket.' }
        ],
        ok: 0, why: 'JSON Lines is made for streams and for appending, and a stopped write damages only the last line. The reader can also tell: the last line fails to parse, so the file is incomplete.'
      }),

      B.cmp({
        id: 'm5-formats', t: 1, src: 'docs', title: 'CSV, JSON Lines and Parquet',
        say: 'Three formats cover most landing zones. Press Next to compare them. The sizes and times in the lab that follows are real.',
        cols: ['Format', 'Shape', 'Strong at', 'Weak at'],
        hl: 2,
        rows: [
          ['CSV', 'Text rows, a header, no types.', 'Every tool opens it. People can read it.', 'No types, no nesting, quoting rules, encodings, and every query reads every column.'],
          ['JSON Lines', 'One JSON object per line. Nested values are allowed.', 'Events and API payloads, appended as they arrive. A cut damages one line.', 'Keys repeat in every line, so it is big. Types are loose.'],
          ['Parquet', 'Columns in compressed binary blocks, with a schema and statistics.', 'Analytics: read one column, skip blocks by statistics, small files, real types.', 'Not human readable. Written in blocks, so it is not for appending a row at a time.']
        ],
        steps: [
          { upto: 1, say: 'CSV: the lowest common format. Use it to receive data from people and old systems.' },
          { upto: 2, say: 'JSON Lines: the format of events and of API payloads that are kept as they came.' },
          { upto: 3, say: 'Parquet: the format of the analytical layer. Typed, compressed, and readable by column.' }
        ],
        pick: '**Keep what arrives** as it arrived, then write the clean layer as **Parquet**. The lab shows why: the same orders took ' + mb(PZS.bytes) + ' as Parquet and ' + mb(CSV.bytes) + ' as CSV.'
      }),

      B.code({
        id: 'm5-pq', t: 1, src: 'rec', title: 'Inside a Parquet file', file: 'parquet_tour.py', lang: 'python', code: PQ,
        steps: [
          { say: 'A Parquet file of 200,000 made-up orders, written with four row groups, and then opened to look at its metadata. The output is real.', lines: null },
          { say: 'The table has typed columns: strings, a decimal for the money, and a timestamp. The types go into the file, so a reader does not guess them from text.', lines: G.span(PQ, /^table = pa\.table/, /^\}\)/) },
          { say: 'The file is written in **row groups** of 50,000 rows, compressed with zstd. Each row group holds every column for its rows.', lines: G.span(PQ, /^pq\.write_table/, /^pq\.write_table/) },
          { say: 'The footer holds a **minimum and a maximum** for each column of each row group. The orders were sorted by time, so each group covers a range of days.', lines: G.span(PQ, /^print\("row group/, /print\(f"\{g:>9\}/) },
          { say: 'A query for rows from 30 March on can use those statistics. Only **1 of 4 row groups** can contain them, so the other three need not be read.', lines: G.span(PQ, /^dataset = /, /^print\(f"\\nrows from/) },
          { say: 'And a query that needs one column reads only that column. The other four are never touched.', lines: G.span(PQ, /^print\("one column only/, /^print\("one column only/) }
        ],
        note: 'Output:\n\n' + PQT.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.widget({ id: 'm5-lab-formats', kind: 'formats', t: 1, src: 'rec', title: 'Lab: seven formats for the same orders' }),

      B.quiz({
        id: 'm5-q4', t: 1, src: 'rec',
        q: 'In the lab, one DuckDB query summed the totals over each file. Roughly how did the Parquet file compare with the CSV file?',
        opts: [
          { t: 'About ' + fmt(CSV.bytes / PZS.bytes, 0) + ' times smaller, and more than ten times faster for this query', fb: '' },
          { t: 'The same size and the same speed, because both hold the same orders', fb: 'The recording shows ' + mb(PZS.bytes) + ' against ' + mb(CSV.bytes) + '.' },
          { t: 'Smaller, but slower, because it is compressed', fb: 'The query read one column of a columnar file, and finished in about ' + fmt(PZS.query_ms, 1) + ' ms on this machine against ' + fmt(CSV.query_ms, 0) + ' ms for the CSV.' },
          { t: 'Larger, because it stores types and statistics', fb: 'The metadata is small. The Parquet file was the smallest of the seven.' }
        ],
        ok: 0, why: 'Parquet stores each column together, with its type, so it compresses well and a query for one column reads only that column. The text formats read and parse every value in every row. The ratios are what to trust: the times came from one machine.'
      }),

      B.cmp({
        id: 'm5-codecs', t: 2, src: 'docs', title: 'Compression codecs: gzip, zstd, snappy',
        say: 'Compression is a trade between size, speed and what a reader can skip. Press Next to read the codecs that you meet. The sizes in the lab are real, for default settings.',
        cols: ['Codec', 'Typical use', 'Trade-off'],
        hl: 2,
        rows: [
          ['gzip', 'Whole text files, `.csv.gz`, `.jsonl.gz`.', 'Everywhere. It is not splittable: a reader must start at the beginning. ' + mb(CSVGZ.bytes) + ' for the CSV in the lab.'],
          ['zstd', 'Text files and Parquet. In the standard library since Python 3.14 as `compression.zstd`.', 'Fast, with levels from small and slow to large and fast. ' + mb(CSVZ.bytes) + ' for the CSV and ' + mb(PZS.bytes) + ' for the Parquet at default settings.'],
          ['snappy', 'The usual default inside Parquet files.', 'Very fast, and a lower ratio: ' + mb(PSN.bytes) + ' for Parquet in the lab, against ' + mb(PZS.bytes) + ' with zstd.']
        ],
        steps: [
          { upto: 1, say: 'gzip is universal and it is the one that every tool can open.' },
          { upto: 3, say: 'Zstd and snappy are the choices inside columnar files. Zstd trades speed for size, snappy the other way.' }
        ],
        pick: 'Use **zstd** for Parquet when storage matters, **snappy** when the speed of reading matters most, and **gzip** when a tool or a supplier needs it. Measure on your own data, as the ratios depend on it.'
      }),

      B.code({
        id: 'm5-atomic', t: 1, src: 'rec', title: 'A job that stops while it writes', file: 'atomic_write.py', lang: 'python', code: ATOM,
        steps: [
          { say: 'Last night\'s file is complete. Tonight\'s job writes the new one, and is killed after three of five rows. Two ways to write, and what each leaves behind. The output is real.', lines: null },
          { say: 'Writing in place opens the target and writes into it. The open already emptied the old file, so a stop leaves a short file.', lines: G.span(ATOM, /^def write_in_place/, /f\.write\(r\)/) },
          { say: 'Writing atomically writes to a temporary file in the same folder first.', lines: G.span(ATOM, /^def write_atomically/, /f\.write\(r\)/) },
          { say: '`os.replace` then swaps the new file in with one operation on the file system. A reader sees the old file or the new file and never a mixture.', lines: G.span(ATOM, /os\.replace/, /os\.replace/) },
          { say: 'If the job fails first, the `except` block removes the temporary file and re-raises. The old file is untouched.', lines: G.span(ATOM, /^    except BaseException/, /^        raise/) }
        ],
        note: 'Output:\n\n' + ATOMT.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.quiz({
        id: 'm5-q5', t: 1, src: 'rec',
        q: 'In the recording the in-place write was killed after three of five rows. What did the target file contain afterwards?',
        opts: [
          { t: 'The header and 3 rows, and last night\'s complete file was gone', fb: '' },
          { t: 'Last night\'s complete file, because Python restores it when a job fails', fb: 'Python does not restore anything. Opening for write emptied the file.' },
          { t: 'The header and 5 rows, because the buffers were flushed', fb: 'The job stopped after three rows. The other two were never written.' },
          { t: 'An empty file', fb: 'The three rows that were written reached the file before the exception.' }
        ],
        ok: 0, why: 'A reader that opens the file now sees a valid-looking CSV with three rows and no error. The atomic version left the old file. Write to a temporary name in the same folder, then `os.replace`. The same-folder rule matters: a replace across two file systems is not one step.'
      }),

      B.code({
        id: 'm5-paths', t: 1, src: 'rec', title: 'Paths with pathlib', file: 'paths.py', lang: 'python', code: PATHS,
        steps: [
          { say: 'A date-partitioned folder with four files, and the pathlib calls that you need every day. Real output follows.', lines: null },
          { say: 'The `/` operator joins paths, and `mkdir(parents=True, exist_ok=True)` makes a folder tree and does not complain if it exists.', lines: G.span(PATHS, /^for name in/, /write_text/) },
          { say: 'A path knows its parts: `name`, `stem`, `suffix`, `parent`, and `with_suffix` makes a sibling with another extension.', lines: G.span(PATHS, /^p = root/, /^print\("another extension/) },
          { say: '`glob` finds files by pattern, in no promised order. File names sort as text, so `part-10.csv` comes **before** `part-2.csv`.', lines: G.span(PATHS, /^files = /, /^print\("\\nsorted as text/) },
          { say: 'Sort by the number in the name, or write zero-padded names (`part-0002.csv`) and the text sort is right.', lines: G.span(PATHS, /^print\("sorted by number/, /^print\("zero-padded/) }
        ],
        note: 'Output:\n\n' + PATHST.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.bug({
        id: 'm5-bug3', t: 1, src: 'rec', q: 'The loader must apply the files of one day in order, part-1, part-2, up to part-10. With ten parts the result is wrong, and with nine it is right. Click the line that breaks at ten.',
        file: 'load_day.py', lang: 'python', code: BUG_SORT, bad: [1],
        hint: 'How does Python sort the text "part-10.csv" against "part-2.csv"?',
        why: 'Names sort character by character, and `1` comes before `2`, so `part-10.csv` sorts before `part-2.csv`. The recording printed `part-1, part-10, part-2`. Sort by the number, or pad the numbers with zeros when you write them.',
        fix: BUG_SORT_FIX,
        cheer: 'Text sorts by character. Numbers need a numeric key, or zero padding.'
      }),

      B.challenge({
        id: 'm5-ch1', t: 1, lang: 'python', file: 'parse_log.py',
        q: '**Coding round: parse log lines.** Each job writes a line such as `2026-03-14T02:00:01Z INFO load_orders rows=1200 ms=340`. Write `parse_log(lines)` that returns `(good, bad)`: a list of dicts with the fields `ts`, `level`, `job`, `rows` and `ms` (the last two as integers), and the number of lines that do not match. It must not stop at a bad line.',
        data: [{ name: 'lines', cols: ['line'], rows: [['2026-03-14T02:00:01Z INFO load_orders rows=1200 ms=340'], ['2026-03-14T02:00:05Z WARN load_orders rows=0 ms=12'], ['2026-03-14T02:01:00Z INFO load_stores rows=40 ms=8'], ['this line is not a log line'], ['2026-03-14T02:02:00Z INFO load_orders rows=abc ms=9']] }],
        starter: 'import re\n\ndef parse_log(lines):\n    ...',
        hints: ['Write one regular expression with a named group for each field.', 'A line that does not match returns `None` from `match`. Count it and go on.', 'Convert `rows` and `ms` with `int`. The pattern should only match digits, so a value such as `abc` counts as a bad line, and `int` never raises.'],
        sol: LOGFN,
        res: { msg: 'tests passed in the recording; 2 lines did not parse', cols: ['timestamp', 'level', 'job', 'rows', 'ms'], rows: LOGROWS },
        expl: ['The pattern checks the whole line with `^` and `$`. Because `rows` and `ms` are `\\d+`, `rows=abc` fails the match instead of crashing `int()` later.', 'Counting bad lines instead of raising keeps one broken line from stopping the file. A real job also keeps the bad lines, in a quarantine file (mission 11).', 'Compile the pattern once, outside the function, so the loop does not rebuild it.'],
        cx: 'O(n) over the lines, and O(n) memory for the good ones. Use a generator if the log is large.'
      }),

      B.challenge({
        id: 'm5-ch2', t: 2, lang: 'python', file: 'write_partitions.py',
        q: '**Coding round: partitioned files.** Write `write_partitions(rows, root)` that writes the orders into one folder for each day, `dt=YYYY-MM-DD/part-0000.csv`, and returns how many rows went into each day. Writing must be atomic, and running it twice must give the same files.',
        data: [{ name: 'orders', cols: ['order_id', 'ordered_at', 'total'], rows: [['O-1', '2026-03-14 08:15:00', '12.5'], ['O-2', '2026-03-14 09:02:00', '4.75'], ['O-3', '2026-03-15 00:03:00', '8.2'], ['O-4', '2026-03-15 10:41:00', '19.9'], ['O-5', '2026-03-14 23:58:00', '31.0']] }],
        starter: 'def write_partitions(rows, root):\n    ...',
        hints: ['Group the rows by the first ten characters of the timestamp, the date.', 'Write each day to a temporary file in its own folder, then `os.replace` it to `part-0000.csv`.', 'Sort the rows of a day before you write, so that two runs write the same bytes.'],
        sol: PARTFN,
        res: { msg: 'tests passed in the recording', cols: ['file', 'rows'], rows: PARTROWS },
        expl: ['A `defaultdict(list)` groups the rows in one pass. The day is the first ten characters of an ISO timestamp.', 'The temporary file and `os.replace` make each file atomic. A second run replaces each file with identical content, so the job is idempotent.', 'Folders named `dt=...` are the layout that query engines understand as a partition. Reading one day means reading one folder.'],
        cx: 'O(n log n) because of the sort inside each day, O(n) memory for the grouped rows. For very large inputs, stream by day.'
      }),

      B.order({
        id: 'm5-order', t: 1, src: 'docs', q: 'Put the steps of receiving a supplier file in order.',
        items: ['Download the file to a temporary name in the landing folder', 'Check that it is complete: the size or the checksum from the supplier, and the row count', 'Rename it to its final name in one step', 'Write a small manifest that says what arrived and when', 'Start the load, which reads only files that have a manifest'],
        why: 'A reader must never see a file that is still arriving. The temporary name and the rename keep it hidden, and the manifest is the signal that says the file is whole.',
        cheer: 'Say it as: download, check, rename, manifest, load.'
      }),

      B.decide({
        id: 'm5-decide', t: 2, src: 'rec', title: 'Decision: which format does the daily landing zone use?',
        scenario: 'Brewline receives order data every day from a partner: about 200,000 rows. Analysts query it by column and by day. The recording measured the same 200,000 orders as **' + mb(CSV.bytes) + ' of CSV**, **' + mb(JSONL.bytes) + ' of JSON Lines** and **' + mb(PZS.bytes) + ' of Parquet (zstd)**. The partner can send CSV or JSON Lines. You choose what to keep.',
        opts: [
          { t: 'Keep only the CSV the partner sends', d: 'Simplest. Nothing to convert.', lose: 'Every analyst query parses all columns as text, and the types are guessed again by every reader.' },
          { t: 'Keep the file as it arrived, and write a clean Parquet copy by day for queries', d: 'The raw copy is the evidence. The Parquet layer is typed, small and fast to read by column.', lose: '' },
          { t: 'Convert at once and delete the original', d: 'Saves space and keeps one copy.', lose: 'A mistake in the conversion cannot be fixed, because the source is gone.' },
          { t: 'Keep everything as JSON Lines', d: 'Flexible, and each line stands alone.', lose: 'About ' + fmt(JSONL.bytes / PZS.bytes, 0) + ' times the size of the Parquet file in the recording, and every query parses every key of every line.' }
        ],
        pick: 1,
        why: 'Raw data is kept as received so that you can rebuild the later layers. The clean layer is Parquet because the recording shows it is the smallest and, for a one-column query, over ten times faster. The conversion is a job that you can run twice.',
        when: 'If volumes are tiny and nobody queries by column, the extra layer may not pay for its code. For an event stream that must be appended all day, JSON Lines in the landing zone is the right shape.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: the supplier file was cut in half, and the load said success', time: '07:30',
        alert: 'The morning report shows half of yesterday\'s orders. The nightly load finished with exit code 0 and logged "loaded 1,540 rows". The supplier says the file holds about 3,000 orders.',
        clues: ['The supplier uploads over SFTP, and the upload was interrupted at 01:58. The load started at 02:00.', 'The loader reads every `*.jsonl` file in the landing folder.', 'In the recording, a JSON Lines file cut in the middle lost one line and the reader still succeeded.'],
        opts: [
          { t: 'Compare the file with the supplier\'s count or checksum, then reload after the complete file arrives', fb: '' },
          { t: 'Re-run the loader to see if the count changes', fb: 'It reads the same cut file again and reports the same 1,540 rows.' },
          { t: 'Remove the last line of every file, in case it is broken', fb: 'It hides the symptom and drops a good order every time.' },
          { t: 'Make the loader read the file twice', fb: 'A second read of an incomplete file is still incomplete.' }
        ],
        best: 0, why: 'A cut JSON Lines file still parses: three of four lines were readable in the recording. Nothing in the loader knows how many rows to expect, so only an external count can say that the file is incomplete.',
        checks: [
          ['Compare the row count with what the supplier says', 'About 3,000 expected against 1,540 loaded points at a cut file.'],
          ['Look at the end of the file', 'A last line that is not valid JSON, or a file that does not end with a newline.'],
          ['Check when the upload finished against when the load started', 'A load at 02:00 on a file that was still arriving at 01:58 explains it.'],
          ['Reload after the full file arrives', 'Use the supplier\'s manifest, or a checksum, or a done file.'],
          ['Make the loader refuse a file without a manifest', 'The loader should read only files that are marked complete.']
        ],
        tell: 'The morning report showed half of yesterday\'s orders although the load had succeeded. The supplier\'s upload had been interrupted two minutes before the load started, so the file was cut, and a JSON Lines file still parses up to the cut. I compared the count with the supplier\'s count, reloaded the complete file, and changed the loader to read only files that have a manifest with the expected row count.',
        prevent: ['The supplier sends a manifest or a done file with the row count and a checksum.', 'The loader reads a file only when its manifest exists and matches.', 'The job fails when the last line of a JSON Lines file does not parse.', 'An alert fires when the row count falls well below the usual.']
      }),

      B.qa({
        id: 'qa-csv', t: 1, tag: 'Files', secs: 60,
        q: 'What goes wrong when you read a CSV file by splitting each line on commas?',
        pts: ['Quoted fields contain commas and line breaks', 'Use the csv module (or a real reader), with newline=""', 'The header can carry a byte order mark', 'CSV has no types, so you convert and validate'],
        short: 'A quoted field can contain a comma or a line break, and `split(",")` knows nothing about quotes. In a recording a three-order file split into five records with 4, 5, 3, 2 and 4 fields, while the csv module read three rows. So I always use the csv module, or a reader from pandas, Polars or DuckDB, and I open the file with `newline=""` and an explicit encoding. Files from Excel can start with a byte order mark, which makes the first column name wrong, so I read with `utf-8-sig`. And since CSV has no types, I convert and validate each value, for example the money as a `Decimal`.',
        fu: [['What about a different delimiter?', 'Pass `delimiter=` to the reader, or let `csv.Sniffer` guess on a sample. For a known supplier I name it.'], ['How do you handle a huge CSV?', 'Stream it with the csv module or read it in chunks. Mission 4 shows the memory difference.']],
        trap: 'Saying "I split on commas and strip the quotes". A quoted comma already broke the line.',
        real: 'Mention a CSV problem you debugged, and the fix.'
      }),

      B.qa({
        id: 'qa-encoding', t: 1, tag: 'Files', secs: 60,
        q: 'What is an encoding, and what happens if you read a file with the wrong one?',
        pts: ['The rule that turns bytes into characters', 'UTF-8 is the default to write', 'Wrong rule: garbled text with no error, or a UnicodeDecodeError', 'Always pass encoding= explicitly'],
        short: 'An encoding is the rule that turns the bytes in a file into characters. UTF-8 is the one I write, and I ask suppliers for it. If I read with the wrong one, there are two outcomes. UTF-8 bytes read as Latin-1 give garbage like `cafÃ©` with no error, because every byte is a valid Latin-1 character. Latin-1 bytes read as UTF-8 raise `UnicodeDecodeError`, which is better because it is loud. So I always pass `encoding=` to `open`, because the default depends on the machine. I use `utf-8-sig` for files from Excel, and I fail on a decode error rather than replace bad bytes.',
        fu: [['What does errors="replace" do?', 'It swaps bad bytes for a placeholder character. It hides the problem, so I use it only for text that does not matter, and I log how many were replaced.'], ['Can Python detect the encoding?', 'Not by itself. Libraries can guess from statistics, and they can be wrong. I prefer to know the source and name it.']],
        trap: 'Using `errors="ignore"` to make the error go away. It silently deletes characters.',
        real: 'Describe an encoding problem you met and how you found the real encoding.'
      }),

      B.qa({
        id: 'qa-parquet', t: 1, tag: 'Formats', secs: 60,
        q: 'Why do analytics pipelines use Parquet instead of CSV?',
        pts: ['Columns are stored together, with types', 'A query reads only the columns it needs', 'Statistics let it skip blocks', 'Smaller files through compression'],
        short: 'Parquet stores the data by column, with a schema, in compressed blocks, with a minimum and a maximum for each column in each block. A query reads only the columns it needs and can skip blocks by those statistics, and the types are in the file so nobody guesses them. In a recording of 200,000 orders the Parquet file with zstd was 2.9 MB against 11.7 MB of CSV and 30.7 MB of JSON Lines, and a sum of one column took about 2 ms against about 70 ms for the CSV in DuckDB. CSV is still how data arrives from people and old systems, so I keep what arrives and write the clean layer as Parquet.',
        fu: [['Is Parquet good for appending single rows?', 'No. It is written in blocks. For a stream I append to JSON Lines or to a table format, and compact into Parquet later.'], ['What are row groups?', 'The blocks of rows inside a file. Each holds all columns for a range of rows, and its statistics let a reader skip it.']],
        trap: 'Saying "it is faster" without saying why: reading one column, skipping blocks and compression.',
        real: 'Give a size and a speed from a conversion you did.'
      }),

      B.qa({
        id: 'qa-atomic', t: 2, tag: 'Reliability', secs: 60,
        q: 'How do you write a file so that a failed job never leaves a half-written file?',
        pts: ['Write to a temporary file in the same folder', 'Rename it to the final name in one step with os.replace', 'Readers see the old file or the new one', 'Same file system, remove the temporary file on failure'],
        short: 'I write to a temporary file in the same folder, and when it is complete I rename it over the target with `os.replace`, which is one operation on the file system. A reader then sees the old file or the new file and never a mixture. In a recording the in-place version stopped after three of five rows and left a short, valid-looking file and no old one, while the atomic version left last night\'s file. The temporary file must be on the same file system, because a replace across two is a copy. On failure I remove the temporary file and re-raise. For object stores like S3 a single put is atomic already.',
        fu: [['How do consumers know a file is ready?', 'A manifest or a done file, written last, that lists the files and their row counts.'], ['What about a database?', 'A transaction gives the same all-or-nothing effect, which mission 8 covers.']],
        trap: 'Writing directly to the final name and "retrying if it fails". A reader may read the half file in between.',
        real: 'Say how your team marks a landing file as complete.'
      }),

      B.qa({
        id: 'qa-layout', t: 2, tag: 'Formats', secs: 60,
        q: 'How do you lay out files in a data lake, and what goes wrong with many small files?',
        pts: ['Folders by a column that queries filter on, usually the date', 'Aim for files of hundreds of megabytes or a few of tens, not thousands of tiny ones', 'Small files cost in listing and in opening each one', 'Compact small files into bigger ones'],
        short: 'I partition by the column that queries filter on most, usually the date, as `dt=2026-03-14/` folders, so a job reads only the days that it needs. Within a day I aim for a few reasonably large files and not thousands of tiny ones, because every file costs a listing call and an open, and many small files slow a query down even when the data is small. A streaming writer makes small files, so a compaction job merges them into bigger ones. And I name files so that they sort correctly, with zero padding, since text sorts `part-10` before `part-2`. I do not partition by a column with thousands of values, like the customer id.',
        fu: [['What file size do you aim for?', 'It depends on the engine. A common range is 128 MB to 1 GB for Parquet. I check the documentation of the engine and measure on my data.'], ['What is partitioning by too many columns?', 'It multiplies the folders and gives tiny files. Two or three low-cardinality columns at most.']],
        trap: 'Partitioning by customer id "to make lookups fast". It creates thousands of tiny files.',
        real: 'Describe a table whose layout you changed, and the effect on a query.'
      }),

      B.qa({
        id: 'qa-codec', t: 3, tag: 'Formats', secs: 60,
        q: 'How do you choose a compression codec for Parquet or for text files?',
        pts: ['Size against speed against what readers can do', 'Snappy: fast, lower ratio; zstd: smaller, tunable', 'gzip for universal text files, not splittable', 'Measure on your own data'],
        short: 'It is a trade between size, speed and compatibility. Snappy is very fast and compresses less, zstd gives smaller files with a tunable level, and gzip is the universal choice for text files, although a gzip file cannot be split for parallel reading. In my recording the same orders took 4.2 MB as Parquet with snappy and 2.9 MB with zstd, and the CSV took 3.1 MB with gzip. I pick zstd for data that is stored long and read rarely, snappy when read speed matters most, and I measure on my own data because the ratios depend on it. Python 3.14 added zstd to the standard library.',
        fu: [['Does compression change what a query reads?', 'Columnar formats compress each column, so a query still reads only the columns it needs. A compressed text file must be unpacked from the start.'], ['What about the CPU cost?', 'Stronger levels use more CPU to write, and zstd reads fast at most levels. I test the write time as well as the size.']],
        trap: 'Saying that the strongest codec is always best. It can cost write time you need.',
        real: 'If you tuned a codec, give the before and after.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'File Handler', color: '#FED7AA',
        pts: [
          'Read CSV with the **csv module**, `newline=""` and an explicit encoding. `split(",")` broke a three-order file into five records.',
          'An **encoding** turns bytes into text. UTF-8 read as Latin-1 gave `cafÃ©` with no error. Always pass `encoding=`, and use `utf-8-sig` for a byte order mark.',
          '**JSON Lines** loses one line when a file is cut. A JSON array loses everything. The same orders were **' + mb(CSV.bytes) + '** as CSV, **' + mb(JSONL.bytes) + '** as JSON Lines and **' + mb(PZS.bytes) + '** as Parquet.',
          'A query over one column ran about **' + fmt(SPEED, 0) + ' times faster** on Parquet in this recording. Keep what arrives, and write the clean layer as Parquet in folders by date.',
          'Write **atomically**: a temporary file in the same folder and `os.replace`. Sort file names with a numeric key or zero padding.'
        ],
        lines: [
          'I name the encoding and I use a parser for every format.',
          'I keep the raw file and write a typed Parquet layer.',
          'I never write straight to the final file name.'
        ]
      })
    ]
  });
})();
