/* Mission 4: iterators and generators. A pipeline that holds one batch in memory, with real peaks of memory and the real pull order. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BASIC = G.file('m4/generator_basics.py'), PULL = G.file('m4/pull_trace.py'), PIPE = G.file('m4/pipeline.py'), TOOLS = G.file('m4/itertools_tools.py'), CLOSE = G.file('m4/generator_close.py'), FLAT = G.file('m4/flatten_json.py'), SESS = G.file('m4/sessionize.py');
  var BASICT = G.text('m4/generator_basics.py'), PULLT = G.text('m4/pull_trace.py'), PIPET = G.text('m4/pipeline.py'), TOOLST = G.text('m4/itertools_tools.py'), CLOSET = G.text('m4/generator_close.py'), FLATT = G.text('m4/flatten_json.py'), SESST = G.text('m4/sessionize.py');
  var GM = G.counts('m4.genmem'), L = GM.sizes.length - 1;

  function fmt(x, d) { return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  var PK = /peak memory held by Python: ([\d.]+) MB/.exec(PIPET)[1], PAID = /paid orders: ([\d,]+) in (\d+) batches/.exec(PIPET), REV = /paid revenue: ([\d,.]+)/.exec(PIPET)[1];
  G.expect(!!PAID && !!REV, 'the pipeline printed its orders, batches and revenue');
  var gens = GM.generator.map(function (x) { return x.peak_bytes; }), lists = GM.list.map(function (x) { return x.peak_bytes; });
  G.expect(Math.max.apply(null, gens) / Math.min.apply(null, gens) < 1.02, 'the generator way holds the same memory at every file size');
  G.expect(lists[L] / lists[0] > 12 && lists[L] / lists[0] < 20, 'the list way grows with the rows: 16 times the rows, about 16 times the memory');
  var LIST_PER_ROW = lists[L] / GM.sizes[L], FILE_PER_ROW = GM.file_bytes[L] / GM.sizes[L];
  var RATIO = lists[L] / gens[L], VS_FILE = lists[L] / GM.file_bytes[L];
  var ROWS_8G = 8e9 / FILE_PER_ROW, LIST_8G = ROWS_8G * LIST_PER_ROW / 1e9;
  G.expect(/sum, then sum again: 14 0/.test(BASICT), 'the second sum of a generator is 0');
  G.expect(/groupby, input not sorted: .*SG-01.*KL-01.*SG-01.*KL-01/.test(TOOLST) && /input sorted: .*KL-01.*SG-01/.test(TOOLST), 'unsorted groupby gives four groups, sorted gives two');
  var pulls = PULLT.split('with generators')[1].trim().split('\n').map(function (l) { return l.trim(); });
  G.expect(pulls[0] === 'read  1' && pulls[1] === 'parse 1' && pulls[3] === 'write 1' && pulls[4] === 'read  2', 'with generators order 1 is written before order 2 is read');
  G.expect(/open a\.csv\nclose a\.csv\nafter the loop/.test(CLOSET), 'CPython closes the generator right after the loop');

  function tableRows(text, re) { return text.split('\n').filter(function (l) { return re.test(l); }); }
  var FLATROWS = tableRows(FLATT, /^[a-z_.0-9]+\s+\S/).filter(function (l) { return !/^tests/.test(l); }).map(function (l) { var i = l.search(/\s/); return [l.slice(0, i), l.slice(i).trim()]; });
  var SESSROWS = tableRows(SESST, /^C-\d/).map(function (l) { var m = /^(C-\d)\s+minutes\s+(\d+) to\s+(\d+)\s+events: (\d+)/.exec(l); G.expect(!!m, 'a session line'); return [m[1], m[2], m[3], m[4]]; });
  function fn(file, name) { var a = G.at(file, new RegExp('^def ' + name)), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return G.lines(file, a, b); }
  var FLATFN = fn(FLAT, 'flatten'), SESSFN = fn(SESS, 'sessionize');

  var BUG_REUSE = ['totals = (r["cents"] for r in rows)', 'print("revenue:", sum(totals))', 'print("biggest:", max(totals))'].join('\n');
  var BUG_READ = ['with open("orders.csv") as f:', '    lines = f.read().split("\\n")', 'for line in lines:', '    process(line)'].join('\n');
  var BUG_READ_FIX = ['with open("orders.csv") as f:', '    for line in f:', '        process(line.rstrip("\\n"))'].join('\n');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Iterators and generators', short: 'Generators', blurb: 'Process a file of any size with flat memory', minutes: 24,
    focus: ['src', 'stg', 'ing'],
    goals: [
      'Explain how a **generator** makes values **one at a time**, and when it runs.',
      'Build a **pipeline of generators** that holds **one batch** in memory.',
      'Read the **real numbers**: the list way grew with the file, the generator way stayed flat.',
      'Avoid the **used-up generator** and the **unsorted groupby** bugs.',
      'Use `itertools` for batches, slices, chains and groups.'
    ],
    say: 'Mission 4 is how a script handles a file bigger than memory. Every number here is real: the peaks of memory come from tracemalloc on five file sizes, and the order of the pipeline is the order that Python printed. The same total came out of both ways, and the memory did not.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, src: 'docs', title: 'Why stream',
        say: 'A script that reads a whole file into memory works until the file grows. Press Next for what to do instead.',
        items: [
          ['A file is a sequence', 'Most jobs need each row once, in order: parse it, test it, add it, write it. They do not need all the rows at the same time.', 'One row at a time is enough.'],
          ['A list holds everything', '`list(csv.DictReader(f))` reads the file, and keeps every row alive until the list is deleted. Memory grows with the file.', 'Memory follows the file.'],
          ['A generator holds one item', 'A generator makes the next value only when something asks for it, and forgets it when you move on. Memory follows the batch, not the file.', 'Memory follows the batch.'],
          ['Stages compose', 'Each stage is a small function that takes an iterable and yields an iterable. A pipeline is the stages chained, and nothing runs until the last stage is asked for a value.', 'Small stages, one chain.'],
          ['Use a list on purpose', 'You need a list, or a table, when you must count, sort, look back or make several passes. Then you make it with `list()` and you know why.', 'Materialize deliberately.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'A pipeline is pulled from the end', g: 'gen', legend: true,
        steps: [
          { say: 'Six pieces: a file, four stages and the loop that uses the result. Press Next to see who asks whom.', cap: 'Nothing has run yet.' },
          { say: 'Step 1. The `for` loop at the end asks `batches` for the next batch. This is the first moment that anything runs.', on: ['p5'], focus: ['s5', 's4'], cap: 'The loop asks first.' },
          { say: 'Step 2. `batches` needs 10,000 rows, so it asks `paid` for rows one by one.', on: ['p4'], focus: ['s4', 's3'], cap: 'Asking, stage by stage.' },
          { say: 'Steps 3 to 5. `paid` asks `parse`, `parse` asks `read_rows`, and `read_rows` asks the file for one line.', on: ['p3', 'p2', 'p1'], focus: ['s3', 's2', 's1', 'f'], cap: 'One line is read.' },
          { say: 'The line travels back: read, parse, test for paid, and into the batch. This repeats 10,000 times for one batch.', on: ['d1', 'd2', 'd3', 'd4'], focus: ['f', 's1', 's2', 's3', 's4'], cap: 'One row at a time.' },
          { say: 'The full batch reaches the loop, which adds it up and drops it. Then the loop asks for the next one. Memory held at any moment: one batch.', on: ['d5'], focus: ['s4', 's5'], tags: ['tg_one', 'tg_file'], cap: 'One batch in memory.' }
        ]
      }),

      B.code({
        id: 'm4-basics', t: 1, src: 'rec', title: 'A generator function', file: 'generator_basics.py', lang: 'python', code: BASIC,
        steps: [
          { say: 'The smallest generator. It was run, and its output is on the next screen.', lines: null },
          { say: 'A function with `yield` is a generator function. Calling it does not run its body. It returns a generator object.', lines: G.span(BASIC, /^def evens/, /yield n/) },
          { say: '`next(gen)` runs the body until the next `yield`, hands out that value, and pauses there. The "making" lines show exactly when the body ran.', lines: G.span(BASIC, /^print\("first/, /^print\("second/) },
          { say: '`list(gen)` takes everything that is left. After the last value the generator raises `StopIteration`, which is how a `for` loop knows to stop.', lines: G.span(BASIC, /^print\("the rest/, /used up/) },
          { say: 'A generator expression, with round brackets, is the short form. And it can be used only once: the second `sum` sees nothing.', lines: G.span(BASIC, /^squares = /, /^print\("sum, then/) }
        ]
      }),

      B.term({
        id: 'm4-basics-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of the file you just read.',
        lines: function () { return G.plain(BASICT, { cmd: 'python generator_basics.py' }); },
        after: 'Three facts. **Nothing ran** when the generator was created: the first "making" line comes after the first `next`. Values are made **only when asked**, one at a time. And the generator expression gave **14** the first time and **0** the second time. A generator is a one-way stream, and it is used up.',
        afterKind: 'tip',
        doneSay: 'Lazy means nothing happens until somebody asks. That one idea explains every generator behavior.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1, src: 'rec',
        q: 'In the recording, `sum(squares)` printed 14 and the second `sum(squares)` printed 0, with no error. Why?',
        opts: [
          { t: 'The generator was used up by the first sum, so the second sum saw no values', fb: '' },
          { t: 'Python caches the result and returns 0 for a repeated call', fb: 'There is no cache. The second call really iterated, and found nothing.' },
          { t: 'The squares of 0 to 3 add up to 0 the second time', fb: 'The numbers do not change. The stream is empty.' },
          { t: 'sum() raises an error when it is called twice', fb: 'No error was raised. An empty stream sums to 0.' }
        ],
        ok: 0, why: 'A generator can be read once. After the first `sum` it is exhausted, and a loop over an exhausted generator quietly does nothing. That is why this bug does not crash: it just gives a wrong answer.'
      }),

      B.bug({
        id: 'm4-bug1', t: 1, src: 'rec', q: 'The report prints the revenue correctly and then prints the wrong biggest order, with no error. Click the line that gives a wrong answer.',
        file: 'report.py', lang: 'python', code: BUG_REUSE, bad: [3],
        hint: 'What is left in `totals` after the first line that reads it?',
        why: '`totals` is a generator, and `sum` used it up. `max(totals)` then sees an empty stream, which raises `ValueError` on an empty sequence in most versions, and gives a wrong answer when you add a default. Make a list when you need two passes: `totals = [r["cents"] for r in rows]`.',
        fix: ['totals = [r["cents"] for r in rows]  # two passes need a list', 'print("revenue:", sum(totals))', 'print("biggest:", max(totals))'].join('\n'),
        cheer: 'Two passes need a list, or two generators.'
      }),

      B.widget({ id: 'm4-lab-pull', kind: 'pull', t: 1, src: 'rec', title: 'Lab: who runs when' }),

      B.quiz({
        id: 'm4-q2', t: 1, src: 'rec',
        q: 'In the generator trace, order 1 is written before order 2 is read. With lists, all four orders are read first. What does that say about memory?',
        opts: [
          { t: 'With generators, at most one order is in flight, so memory does not grow with the number of orders', fb: '' },
          { t: 'Lists and generators use the same memory, because the same four orders are read', fb: 'The trace shows four orders in flight at once with lists, and one with generators.' },
          { t: 'Generators use more memory because they pause', fb: 'A paused generator keeps its local variables and nothing else.' },
          { t: 'Generators run the stages in parallel', fb: 'They run one at a time, on one thread. The trace is sequential.' }
        ],
        ok: 0, why: 'In the lab the list way had four orders in flight at its peak and the generator way one. With four million orders the list way holds four million, and the generator way still holds one.'
      }),

      B.code({
        id: 'm4-pipe', t: 1, src: 'rec', title: 'A pipeline of generators', file: 'pipeline.py', lang: 'python', code: PIPE,
        steps: [
          { say: 'Four small stages and a loop. The file has 200,000 orders. This is the real program that produced the next screen.', lines: null },
          { say: '`read_rows` opens the file in a `with` block, and `yield from` hands out the rows of the CSV reader one by one. The file closes when the generator ends.', lines: G.span(PIPE, /^def read_rows/, /yield from csv/) },
          { say: '`parse` turns each text row into a small dict with the money as integer cents, built from a `Decimal`. One row in, one row out.', lines: G.span(PIPE, /^def parse/, /yield \{/) },
          { say: '`paid` is a generator expression: it passes only the rows with the status "paid".', lines: G.span(PIPE, /^def paid/, /return \(r for r/) },
          { say: '`itertools.batched` groups the stream into tuples of 10,000. A batch is the unit of work and of memory.', lines: G.span(PIPE, /^def batches/, /return itertools\.batched/) },
          { say: 'The stages are chained in one line. Nothing has run yet. The loop is what pulls rows through: it adds up each batch and drops it.', lines: G.span(PIPE, /^rows_in_batches/, /batch_count \+= 1/) },
          { say: '`tracemalloc` recorded the highest amount of memory that Python had allocated at any moment. That is what the last line prints.', lines: G.span(PIPE, /^peak = /, /^print\(f"peak/) }
        ]
      }),

      B.term({
        id: 'm4-pipe-run', t: 1, src: 'rec', title: 'The pipeline on 200,000 orders',
        say: 'This is the real output of `pipeline.py` on a file of 200,000 made-up orders.',
        lines: function () { return G.plain(PIPET, { cmd: 'python pipeline.py orders.csv' }); },
        after: 'The job handled all the paid orders in **' + PAID[2] + ' batches** and held at most **' + PK + ' MB** of Python memory at any moment. That is about one batch of 10,000 parsed rows, and it would be the same for a file ten times larger. The next lab shows what the list way does.',
        afterKind: 'tip',
        doneSay: 'The memory of the job is set by the batch size you choose, not by the file.'
      }),

      B.widget({ id: 'm4-lab-mem', kind: 'genmem', t: 1, src: 'rec', title: 'Lab: a list of rows against a generator' }),

      B.quiz({
        id: 'm4-q3', t: 1, src: 'rec',
        q: 'At 800,000 rows (a file of ' + fmt(GM.file_bytes[L] / 1e6, 0) + ' MB) the list way peaked at about ' + fmt(lists[L] / 1e6, 0) + ' MB and the generator way at about ' + fmt(gens[L] / 1e6, 0) + ' MB. What happens to each when the file is ten times larger?',
        opts: [
          { t: 'The list way grows about ten times, and the generator way stays about the same', fb: '' },
          { t: 'Both grow about ten times', fb: 'The recording shows the generator peak flat from 50,000 to 800,000 rows.' },
          { t: 'The list way stays the same, because the rows are already in memory', fb: 'The rows of the new file are also loaded. The peak scales with the rows.' },
          { t: 'Both stay the same', fb: 'The list peak went from 29 MB at 50,000 rows to 461 MB at 800,000 rows.' }
        ],
        ok: 0, why: 'The list way needed about ' + fmt(LIST_PER_ROW, 0) + ' bytes for every row, about ' + fmt(VS_FILE, 1) + ' times the size of the file, so memory grows with the rows. The generator way keeps one batch, so it stays flat. For an 8 GB file the list way would need roughly ' + fmt(LIST_8G, 0) + ' GB (an estimate that multiplies the recorded bytes per row).'
      }),

      B.cmp({
        id: 'm4-terms', t: 1, src: 'docs', title: 'Iterable, iterator, generator: three words',
        say: 'These words are used loosely, so they are worth getting right. Press Next to read each one.',
        cols: ['Word', 'What it is', 'Example'],
        hl: 1,
        rows: [
          ['Iterable', 'Anything that a `for` loop can go over. It can give you a fresh iterator each time.', 'a list, a tuple, a dict, a string, a file'],
          ['Iterator', 'An object with `__next__`. It remembers where it is, and it is used up when it ends.', '`iter([1, 2, 3])`, a file object, a generator'],
          ['Generator', 'An iterator that Python makes from a function with `yield`, or from a generator expression.', '`def evens(): yield ...`, `(n * n for n in x)`'],
          ['Lazy', 'It makes a value only when asked, and it keeps nothing. `map`, `filter`, `zip` and `itertools` are lazy.', '`map(int, lines)`'],
          ['Eager', 'It makes everything at once and keeps it. A list, a list comprehension, `sorted`.', '`[int(x) for x in lines]`']
        ],
        steps: [
          { upto: 3, say: 'A list is an iterable and not an iterator: you can loop over it twice. A generator is an iterator: once.' },
          { upto: 5, say: 'Lazy tools compose without building lists. Eager tools are easy to inspect and cost memory.' }
        ],
        pick: 'Square brackets build a **list** now. Round brackets build a **generator** for later. When the data may be large, write round brackets and a `for` loop.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2, src: 'docs',
        q: 'Which of these does not build the whole result in memory at once?',
        opts: [
          { t: '`[int(x) for x in lines]`', fb: 'Square brackets make a list of everything.' },
          { t: '`map(int, lines)`', fb: '' },
          { t: '`sorted(lines)`', fb: 'Sorting must see everything, so it builds a list.' },
          { t: '`list(lines)`', fb: 'It makes the list now.' }
        ],
        ok: 1, why: '`map` returns a lazy iterator, as do `filter`, `zip` and the tools of `itertools`. Anything that must see all the data, like `sorted` or `list`, makes it.'
      }),

      B.code({
        id: 'm4-tools', t: 1, src: 'rec', title: 'itertools: batches, slices, chains and groups', file: 'itertools_tools.py', lang: 'python', code: TOOLS,
        steps: [
          { say: 'Five tools that a data engineer uses every week. All of them are lazy. The output is real.', lines: null },
          { say: '`batched(it, n)` cuts a stream into tuples of n. The last one can be shorter. Python 3.12 added it.', lines: G.span(TOOLS, /^print\("batched/, /^print\("batched/) },
          { say: '`islice` takes a slice of any iterator, even an endless one such as `count(1)`. It is how you peek at the first rows of a stream.', lines: G.span(TOOLS, /^print\("islice/, /^print\("islice/) },
          { say: '`chain` joins several iterables into one stream, and `pairwise` gives neighbouring pairs, which is handy for differences between rows.', lines: G.span(TOOLS, /^print\("chain/, /^print\("pairwise/) },
          { say: '`groupby` groups **neighbours** that share a key. On the unsorted rows it made four groups, SG-01 twice and KL-01 twice. On the sorted rows it made two.', lines: G.span(TOOLS, /^rows = /, /input sorted/) }
        ],
        note: 'Output of `itertools_tools.py`:\n\n' + TOOLST.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.quiz({
        id: 'm4-q5', t: 2, src: 'rec',
        q: 'You run `itertools.groupby(rows, key=store)` on rows that are not sorted by store. What do you get, according to the recording?',
        opts: [
          { t: 'A new group each time the store changes, so a store can appear several times', fb: '' },
          { t: 'One group for each store, as in SQL GROUP BY', fb: 'That is what you get after sorting. The recording shows four groups for two stores without it.' },
          { t: 'A ValueError, because the input is not sorted', fb: 'Python does not check. It quietly gives the wrong groups.' },
          { t: 'The groups sorted by store', fb: 'The groups come out in the order the keys appear.' }
        ],
        ok: 0, why: '`groupby` only compares each item with the previous one. For SQL-like grouping, sort first, or use a dict or `defaultdict`, or let the database group.'
      }),

      B.term({
        id: 'm4-close', t: 2, src: 'rec', title: 'A generator that holds a file',
        say: 'If a generator opens a resource and the caller stops early, who closes it? Watch two ways to stop.',
        lines: function () { return G.plain(CLOSET, { cmd: 'python generator_close.py' }); },
        after: 'The `finally` block ran, and CPython ran it when the last reference to the generator went away. In the first loop that was right after the `break`. That timing is a detail of CPython, so do not rely on it. `contextlib.closing` made it explicit in the second case: the file closed when the `with` block ended, before "done" was printed.',
        afterKind: 'tip',
        doneSay: 'If a generator owns a file or a connection, close it with `with closing(...)` or iterate it fully.'
      }),

      B.cmp({
        id: 'm4-when', t: 2, src: 'docs', title: 'When a generator is the wrong tool',
        say: 'Streaming is not always the answer. Press Next to read when to build a list or a table instead.',
        cols: ['You need', 'Why a generator does not fit', 'Use'],
        hl: 2,
        rows: [
          ['The length, or a count before you start', 'A generator has no length until it is used up.', 'Count while you stream, or `list()` if it fits.'],
          ['To go over the data twice', 'It is used up after the first pass.', '`list()`, a table, or run the source again.'],
          ['To sort or to rank', 'Sorting needs every item.', '`sorted()` on a list, or sort in the database.'],
          ['Random access, `rows[5000]`', 'A generator has no index.', 'A list, or a table.'],
          ['Many columns of numbers, fast', 'A Python loop touches one row at a time, which is slow for large numeric work.', 'A pandas, Polars or DuckDB table, read in chunks or lazily (mission 9).']
        ],
        steps: [
          { upto: 3, say: 'Counting, passing twice and sorting all need the data kept. Decide how much, and keep that much.' },
          { upto: 5, say: 'Indexing and heavy numeric work belong to lists and tables.' }
        ],
        pick: 'Stream when each row is used **once**. Keep a list or a table when you must **sort, count, look back or index**.'
      }),

      B.challenge({
        id: 'm4-ch1', t: 1, lang: 'python', file: 'flatten.py',
        q: '**Coding round: flatten nested JSON.** An order arrives as nested dicts and lists. Write a generator `flatten(obj)` that yields `(path, value)` pairs, where the path joins the keys and list indexes with dots, for example `customer.tier` and `lines.0.sku`. Do not build a list of the whole result.',
        starter: 'order = {\n    "order_id": "O-1",\n    "customer": {"id": "C-7", "tier": "gold"},\n    "lines": [{"sku": "LATTE", "qty": 2}, {"sku": "MUFFIN", "qty": 1}],\n    "note": None,\n}\n\ndef flatten(obj, prefix=""):\n    ...',
        hints: ['There are three cases: a dict, a list, and anything else.', 'For a dict or a list, call `flatten` again for each child, with a longer prefix. Use `yield from`.', 'A leaf has no children, so yield `(prefix, value)` and remove the trailing dot.'],
        sol: FLATFN,
        res: { msg: 'tests passed in the recording', cols: ['path', 'value'], rows: FLATROWS },
        expl: ['`yield from` hands over everything that the inner generator yields, so the recursion needs no list.', 'The same function handles any depth, because each level calls itself on its children.', 'Memory is proportional to the **depth** of the data, not its size: the recursion holds one path of calls.'],
        cx: 'O(n) time for n leaves, and O(depth) extra memory. Python\'s recursion limit (1,000 by default) bounds the depth.'
      }),

      B.challenge({
        id: 'm4-ch2', t: 2, lang: 'python', file: 'sessionize.py',
        q: '**Coding round: sessions.** Each event is `(user, minute)`, sorted by user and then by minute. A gap of more than 30 minutes starts a new session. Write a generator `sessionize(events, gap=30)` that yields `(user, first, last, count)` for each session, in one pass and with no list of all events.',
        data: [{ name: 'events', cols: ['user', 'minute'], rows: [['C-1', '5'], ['C-1', '20'], ['C-1', '90'], ['C-1', '100'], ['C-2', '15'], ['C-3', '0'], ['C-3', '30'], ['C-3', '61']] }],
        starter: 'def sessionize(events, gap=30):\n    ...',
        hints: ['Keep the session that you are building in one variable, `current`.', 'If the next event has the same user and is within the gap, extend the session. Otherwise yield the current one and start a new one.', 'Do not forget to yield the last session after the loop.'],
        sol: SESSFN,
        res: { msg: 'tests passed in the recording', cols: ['user', 'first minute', 'last minute', 'events'], rows: SESSROWS },
        expl: ['The rule uses `<= gap`, so a gap of exactly 30 minutes stays in the session. C-3 at minutes 0 and 30 is one session, and 61 starts another.', 'One pass and one small list in memory: O(n) time, O(1) extra memory. It needs the events in order, which the database can do with `ORDER BY user, minute`.', 'The last session is yielded after the loop. Forgetting it is the common bug.'],
        cx: 'O(n) time and O(1) extra memory, because only the current session is held.'
      }),

      B.bug({
        id: 'm4-bug2', t: 1, src: 'rec', q: 'This job reads an 8 GB log file and is killed by the operating system a few minutes in. Click the line that uses the memory.',
        file: 'read_log.py', lang: 'python', code: BUG_READ, bad: [2],
        hint: 'How much of the file is in memory after this line?',
        why: '`f.read()` reads the entire file into one string, and `split` makes a list of every line, so the job holds the file about twice. A file object is already an iterator over its lines. Loop over it directly, as the fix shows, and the job holds one line at a time.',
        fix: BUG_READ_FIX,
        cheer: 'Loop over the file. Do not read it.'
      }),

      B.decide({
        id: 'm4-decide', t: 2, src: 'rec', title: 'Decision: read an 8 GB CSV and add up one column',
        scenario: 'A supplier sends an 8 GB CSV every night, about ' + fmt(ROWS_8G / 1e6, 0) + ' million rows. You need the total of one column for the paid rows, and the job runs in a container with 4 GB of memory. The recording measured about **' + fmt(LIST_PER_ROW, 0) + ' bytes of Python memory for each row** when the rows are held in a list of dicts.',
        opts: [
          { t: 'Read it all with `list(csv.DictReader(f))`', d: 'Simple, and everything is available afterwards.', lose: 'About ' + fmt(LIST_8G, 0) + ' GB for the rows (an estimate from the recorded bytes per row). The kernel kills the job long before it ends.' },
          { t: 'Stream it with a generator pipeline in batches', d: 'Memory stays at one batch, about ' + fmt(gens[L] / 1e6, 0) + ' MB in the recording.', lose: '' },
          { t: 'A bigger container with 128 GB', d: 'The list way fits.', lose: 'It pays for memory every night, and the file will grow again.' },
          { t: 'Split the file with `split -l` and process the parts in parallel', d: 'Each part is small.', lose: 'It adds files, code and a merge step for a total that a stream computes in one pass.' }
        ],
        pick: 1,
        why: 'The job needs each row once, so streaming is enough and its memory does not depend on the file. If the same data had to be queried many times, loading it once into DuckDB or Parquet would be better still.',
        when: 'If you need to sort, join or group the whole file, use an engine that spills to disk, such as DuckDB or the warehouse. Python then starts the query and checks the result.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the nightly import is killed at 02:40', time: '02:40',
        alert: 'The nightly import of the supplier file dies after about 40 minutes with exit code 137. It worked for months. The file has grown from 3 GB to 8 GB since the supplier added a new store group.',
        clues: ['The job runs `rows = list(csv.DictReader(f))` and then loops over `rows`.', 'The container limit is 4 GB.', 'In the recording the list way needed about ' + fmt(VS_FILE, 0) + ' times the file size in Python memory.'],
        opts: [
          { t: 'Estimate the memory from the file size, then rewrite the read as a stream in batches', fb: '' },
          { t: 'Raise the retry count in the scheduler', fb: 'The job is killed at the same size every time. A retry cannot help.' },
          { t: 'Ask the supplier to send smaller files', fb: 'It moves the work to someone else, and the file will grow again.' },
          { t: 'Add swap space to the container', fb: 'Swap turns a kill into a very slow job. It does not fix the design.' }
        ],
        best: 0, why: 'The recorded list way used about ' + fmt(LIST_PER_ROW, 0) + ' bytes per row, so an 8 GB file with about ' + fmt(ROWS_8G / 1e6, 0) + ' million rows needs on the order of ' + fmt(LIST_8G, 0) + ' GB. The cause is the design, so the fix is a stream.',
        checks: [
          ['Read the exit code, the limit and the file size', 'Code 137 with a 4 GB limit and a file that grew points to memory.'],
          ['Find the line that holds the data', '`list(csv.DictReader(f))` keeps every row alive.'],
          ['Estimate: rows times bytes per row', 'About ' + fmt(ROWS_8G / 1e6, 0) + ' million rows at ' + fmt(LIST_PER_ROW, 0) + ' bytes is about ' + fmt(LIST_8G, 0) + ' GB.'],
          ['Rewrite as a generator pipeline in batches', 'One batch in memory, and the result of the job does not change.'],
          ['Test at ten times the size', 'The memory should stay flat. That is the test that matters.']
        ],
        tell: 'The nightly import was killed with exit code 137 after the supplier file grew from 3 GB to 8 GB. The job read the whole file into a list of dicts. From a measurement, the list way costs about ten times the file size in Python memory, so 8 GB needs far more than the 4 GB container. I rewrote it as a pipeline of generators in batches of 10,000 rows, which held about 12 MB in a test, and ran it at ten times the size to confirm that memory stayed flat.',
        prevent: ['Stream files by default. Use a list only when you need one.', 'Estimate memory from the input size before you choose a structure.', 'Run the job at ten times the size in a test.', 'Alert when the input grows by more than a set percentage.']
      }),

      B.order({
        id: 'm4-order', t: 1, src: 'docs', q: 'Put the steps of a streaming import in order.',
        items: ['Open the file in a `with` block and yield its rows one at a time', 'Parse each row into typed values and reject the bad ones', 'Keep the rows that you need', 'Group the stream into batches', 'Write each batch and drop it before the next one'],
        why: 'The stages go from the file to the target, and each one only passes rows on. Only the batch that is being written is in memory.',
        cheer: 'Say it as: read, parse, filter, batch, write.'
      }),

      B.qa({
        id: 'qa-generator', t: 1, tag: 'Python basics', secs: 60,
        q: 'What is a generator and why would you use one in a data pipeline?',
        pts: ['A function with yield that makes values one at a time', 'Lazy: nothing runs until you ask for the next value', 'Memory follows the batch, not the input', 'Used once; stages chain into a pipeline'],
        short: 'A generator is a function with `yield`. Calling it returns an object that makes the next value only when something asks for it, and pauses in between. In a pipeline that means I can chain stages, read, parse, filter, batch, and a row goes through all of them before the next one is read, so memory follows the batch size and not the file. In a recording I added up the paid orders of a file in two ways: the list way peaked at about 461 MB at 800,000 rows and the generator way at about 12 MB, flat at every size. The catch is that a generator is used once, so if I need two passes or a sort I make a list on purpose.',
        fu: [['What does yield from do?', 'It hands over every value of another iterable or generator, so a generator can delegate to a sub-generator without a loop.'], ['How is a generator different from a list comprehension?', 'The list comprehension builds everything now. The generator expression makes values as you loop.']],
        trap: 'Saying "generators are faster". They save memory, and a loop of Python code is not faster than a list. Say what you gain.',
        real: 'Name a job you changed from a list to a stream, and the memory before and after.'
      }),

      B.qa({
        id: 'qa-iterator', t: 1, tag: 'Python basics', secs: 60,
        q: 'What is the difference between an iterable, an iterator and a generator?',
        pts: ['Iterable: can be looped over, gives an iterator (list, file)', 'Iterator: has __next__, remembers its position, is used up', 'Generator: an iterator made by yield or a generator expression', 'Lists can be looped twice, iterators once'],
        short: 'An iterable is anything a `for` loop can go over: a list, a dict, a string, a file. Asking it for `iter()` gives an iterator, which has `__next__`, remembers where it is, and is used up at the end. A generator is an iterator that Python makes from a function with `yield` or from a generator expression. The practical difference is that I can loop over a list as often as I like, and an iterator only once. In a recording, `sum` of a generator gave 14 and the second `sum` gave 0 with no error, which is the bug that this difference causes.',
        fu: [['Is a file an iterable or an iterator?', 'An iterator. Looping over it moves the position, so a second loop starts where the first ended unless you seek.'], ['How do you loop twice over a stream?', 'Make a list, or create the generator again from its source.']],
        trap: 'Using "iterator" and "generator" as the same word. Every generator is an iterator, and not the other way round.',
        real: 'Describe a bug that came from using up an iterator.'
      }),

      B.qa({
        id: 'qa-bigfile', t: 1, tag: 'Practice', secs: 60,
        q: 'You have to process a file that is bigger than memory. How?',
        pts: ['Stream: read rows one at a time or in batches', 'Chain generator stages: parse, filter, batch, write', 'Estimate memory: bytes per row times rows', 'Use an engine such as DuckDB for sort, join and group'],
        short: 'I stream it. A file object is already an iterator over its lines, and `csv.DictReader` over a file is one over rows. I chain small generator stages, parse, filter and batch with `itertools.batched`, and write each batch before the next. I estimate the memory first: in a recording a list of rows cost about 576 bytes per row, so about ten times the file size. When the job needs a sort, a join or a group over the whole file, I do not hold it in Python. I load it into DuckDB, or the warehouse, which can spill to disk, and I use Python to start the query and check the result.',
        fu: [['Can pandas read a big file?', 'In chunks with `read_csv(chunksize=...)`, or lazily with Polars `scan_csv`. Both keep memory bounded if the work per chunk is small.'], ['What batch size do you use?', 'Large enough to amortize overhead, small enough to fit comfortably. 10,000 to 100,000 rows is a common start. I measure.']],
        trap: 'Reading the whole file and "hoping it fits". Say how you estimated it.',
        real: 'Describe the largest file you processed and how.'
      }),

      B.qa({
        id: 'qa-itertools', t: 2, tag: 'Practice', secs: 60,
        q: 'Which itertools tools do you use for data work, and what is the groupby catch?',
        pts: ['batched, islice, chain, pairwise', 'groupby groups neighbours, so sort first', 'All are lazy, so they compose without lists', 'tee and multiple passes cost memory'],
        short: 'I use `batched` to cut a stream into batches for loading, `islice` to peek at the first rows of a stream, `chain` to join files into one stream, and `pairwise` for differences between neighbouring rows. They are lazy, so they compose without building lists. The catch with `groupby` is that it groups neighbours that share a key, not all the rows with the key. In a recording, unsorted input gave four groups for two stores. I sort first, or use a dict, or let the database group. And `tee`, which copies a stream for two readers, has to buffer what one reader is ahead of the other by, so it can hold a lot of memory.',
        fu: [['When would you use zip?', 'To walk two streams together, for example the rows and a line number. `zip(strict=True)` raises if the lengths differ.'], ['What is the version note for batched?', 'It arrived in Python 3.12, and 3.13 added a `strict` argument. In older versions use `islice` in a loop.']],
        trap: 'Calling groupby "the same as SQL GROUP BY".',
        real: 'Show an itertools line that you use at work.'
      }),

      B.qa({
        id: 'qa-yieldfrom', t: 3, tag: 'Python', secs: 60,
        q: 'What does `yield from` do, and what else can a generator do besides yield values?',
        pts: ['Delegates to another iterable and hands over its values', 'Returns the sub-generator\'s return value', 'send() and throw() pass values and errors into a generator', 'close() runs the finally block'],
        short: '`yield from other` hands over every value of another iterable, so a generator can delegate without a loop, and the value of the expression is whatever the sub-generator returned. Generators can also receive: `send` passes a value in at the `yield`, `throw` raises an exception there, and `close` raises `GeneratorExit` so that a `finally` block can release a resource. In a recording, a generator that opened a file printed its close message when the loop ended and when I closed it with `contextlib.closing`. In data work I mostly use `yield from` for recursion, like flattening nested JSON, and I use `closing` when a generator owns a file or a connection.',
        fu: [['What are async generators?', 'Generators with `async def` and `yield`, read with `async for`. They are for streams that wait on the network.'], ['Why not rely on the garbage collector to close?', 'CPython closes at once when the last reference is gone, but other implementations may not. Be explicit.']],
        trap: 'Using send() to build coroutines in new code. Use async and await.',
        real: 'Say where `yield from` simplified a recursive walk for you.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Stream Builder', color: '#BAE6FD',
        pts: [
          'A **generator** makes values only when asked, and forgets them. Nothing runs when you call it.',
          'A pipeline of generators holds **one batch**: ' + PK + ' MB for 200,000 orders in the recording. The list way at 800,000 rows needed **' + fmt(lists[L] / 1e6, 0) + ' MB** against **' + fmt(gens[L] / 1e6, 0) + ' MB**.',
          'The list way cost about **' + fmt(LIST_PER_ROW, 0) + ' bytes per row**, ' + fmt(VS_FILE, 1) + ' times the file. Memory grew with the rows, and the generator way stayed flat.',
          'A generator is used **once**. Two passes, a sort or an index need a list. `groupby` groups neighbours, so sort first.',
          'Loop over the file, and use `itertools.batched`. Close what a generator owns with `contextlib.closing`.'
        ],
        lines: [
          'I stream by default and keep a list only when I need one.',
          'I estimate memory as bytes per row times rows before I choose a structure.',
          'I know a generator is used once, and I do not rely on it twice.'
        ]
      })
    ]
  });
})();
