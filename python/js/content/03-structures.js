/* Mission 3: data structures and what they cost, with counts, sizes and medians recorded from Python and its libraries. */
(function () {
  var B = LAB.b, G = LAB.get;
  var MEM = G.file('m3/membership_counts.py'), HASH = G.file('m3/hashing.py'), MUT = G.file('m3/mutable_default.py'), CPY = G.file('m3/copying.py'), GRP = G.file('m3/group_count.py'), LAT = G.file('m3/latest_per_key.py'), TOPK = G.file('m3/top_k_per_group.py');
  var MEMT = G.text('m3/membership_counts.py'), HASHT = G.text('m3/hashing.py'), MUTT = G.text('m3/mutable_default.py'), CPYT = G.text('m3/copying.py'), GRPT = G.text('m3/group_count.py'), SIZET = G.text('m3/sizes.py'), LATT = G.text('m3/latest_per_key.py'), TOPT = G.text('m3/top_k_per_group.py');
  var STR = G.table('m3.structs'), LK = G.counts('m3.lookup'), IDS = G.counts('m3.idset');

  function sz(label) { var m = SIZET.split('\n').filter(function (l) { return l.indexOf(label) === 0; })[0]; G.expect(!!m, 'a size line for ' + label); return +/(\d+) bytes/.exec(m)[1]; }
  var S_INT = sz('int 0'), S_LIST1000 = sz('list of 1000 ints'), S_STR = sz("str 'O-0000001'");
  var DEEP = +/and the 1000 int objects it points to: (\d+) bytes/.exec(SIZET)[1];
  function per(re) { var r = STR.rows.filter(function (x) { return re.test(x[0]); })[0]; G.expect(!!r, 'a structure row for ' + re); return r[2]; }
  var P_DICT = per(/list of dicts/), P_TUPLE = per(/list of tuples/), P_SLOTS = per(/with slots/), P_COLS = per(/dict of lists/), P_PD = per(/default types/), P_PDT = per(/category/), P_ARROW = per(/pyarrow/), P_POLARS = per(/Polars/);
  var N = G.counts('m3.structs.meta').records;
  function fmt(x, d) { return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function listCmp() { return MEMT.split('\n').map(function (l) { var m = /^\s*(\d+) ids\s+list:\s+(\d+) comparisons\s+set: (\d+) comparison, (\d+) hash call/.exec(l); G.expect(!!m, 'a comparison line'); return { n: +m[1], list: +m[2], set: +m[3] }; }); }
  var CMPS = listCmp(), LASTC = CMPS[CMPS.length - 1];
  G.expect(LASTC.n === 100000 && LASTC.list === 100000 && LASTC.set === 1, 'a list needs one comparison for each of 100,000 ids and a set needs one');
  var RATIO_1M = LK.list[3] / LK.set[3];
  G.expect(RATIO_1M > 1000, 'at a million ids a list lookup is more than 1,000 times slower than a set lookup');
  G.expect(P_DICT > P_TUPLE && P_TUPLE > P_COLS && P_COLS > P_PD && P_PD > P_PDT, 'dicts cost more than tuples, tuples more than columns, columns more than a DataFrame, a DataFrame more than one with small types');
  G.expect(/\['O-1', 'O-2', 'O-4'\]/.test(MUTT) && /\['O-3'\]/.test(MUTT), 'the shared default list holds O-1, O-2 and O-4');
  G.expect(/\[1, 2, 99\]/.test(CPYT.split('\n')[0]) && /True/.test(CPYT.split('\n')[1]) && /\[1, 2\] \[1, 2, 99\]/.test(CPYT), 'a shallow copy shares the inner list, a deep copy does not');
  var ID_SET = IDS.set_of_ids[1].per_id, ID_LIST = IDS.list_of_ids[1].per_id;
  var SET40 = ID_SET * 40e6 / 1e9, LIST40 = ID_LIST * 40e6 / 1e9;
  G.expect(Math.abs(IDS.set_of_ids[0].per_id - IDS.set_of_ids[1].per_id) < 5, 'bytes per id in a set stay about the same from 1 million to 4 million ids');

  function rowsOf(text) { return text.split('\n').filter(function (l) { return /^O-\d/.test(l); }).map(function (l) { return l.trim().split(/\s+/); }); }
  var LATROWS = rowsOf(LATT);
  function fn(file, name) { var a = G.at(file, new RegExp('^def ' + name)), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return G.lines(file, a, b); }
  var LATFN = fn(LAT, 'latest_per_key'), TOPFN = fn(TOPK, 'top_k_per_group');

  var DEDUP_BAD = ['unique, seen = [], []', 'for order in orders:', '    if order["order_id"] not in seen:', '        seen.append(order["order_id"])', '        unique.append(order)'].join('\n');
  var DEDUP_FIX = ['unique, seen = [], set()', 'for order in orders:', '    if order["order_id"] not in seen:', '        seen.add(order["order_id"])', '        unique.append(order)'].join('\n');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Data structures and what they cost', short: 'Structures', blurb: 'Lists, dicts, sets and records, and what each one costs in time and memory', minutes: 24,
    focus: ['ing', 'stg'],
    goals: [
      'Pick a **list, tuple, dict, set or heap** by the question you ask of the data.',
      'Explain why `in` on a list is **O(n)** and on a set **O(1)**, with counts and with a clock.',
      'Say what **hashable** means and why a list cannot be a dict key.',
      'Avoid the **mutable default argument** and the **shallow copy** bugs.',
      'Choose a **record type** for a million rows, and say what it costs in memory.'
    ],
    say: 'Mission 3 is about choosing the right container. The counts, sizes and timings on these screens come from real runs with Python ' + G.meta('python') + ': a class that counts its own comparisons, tracemalloc for memory, and medians of five runs for time. The timings are from one machine, so trust the ratios and not the digits.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, src: 'docs', title: 'Pick the structure by the question you ask',
        say: 'Every container answers one kind of question well. Press Next to match the question to the structure.',
        items: [
          ['In order, by position', 'A **list**. Add at the end, read by index, loop in order. Searching it for a value looks at every item.', '"What is the third order?"'],
          ['A fixed group of values', 'A **tuple**. It cannot change, it is cheap, and it can be a dict key. A record that does not change after you read it is often a tuple.', '"This order, as one value."'],
          ['Find by a key', 'A **dict**. Give a key, get the value in about one step, however many items there are.', '"What is the total of order O-17?"'],
          ['Is it there? Remove repeats', 'A **set**. Membership in about one step, and a value can appear only once.', '"Have I already loaded this id?"'],
          ['Both ends, or the smallest few', 'A **deque** for a queue, a **heap** (`heapq`) for the k largest or smallest without sorting everything.', '"Which five orders are biggest?"'],
          ['A million rows of one shape', 'Columns, not a list of objects: a pandas, Polars or Arrow table. They keep numbers in compact arrays. Mission 9 covers them.', '"Sum a column of ten million values."']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm3-cost', t: 1, src: 'docs', title: 'What the common operations cost',
        say: 'Python documents the average cost of each operation. Press Next to read it for lists, dicts, sets and the tools around them.',
        cols: ['Operation', 'Container', 'Cost on average'],
        hl: 2,
        rows: [
          ['Add at the end', 'list', 'O(1), amortized'],
          ['Read by index', 'list, tuple', 'O(1)'],
          ['Is a value in it?  `x in c`', 'list', 'O(n): it may look at every item'],
          ['Insert or delete at the front', 'list', 'O(n): every item moves'],
          ['Get, set, `in`', 'dict, set', 'O(1)'],
          ['Add or remove at either end', 'collections.deque', 'O(1)'],
          ['Push, pop the smallest', 'heapq', 'O(log n)'],
          ['Sort', 'list, sorted()', 'O(n log n)']
        ],
        steps: [
          { upto: 3, say: 'A list is cheap to append to and to index. It is expensive to search.' },
          { upto: 5, say: 'Dicts and sets exist to make "find it" cheap. Insert at the front of a list is the trap.' },
          { upto: 8, say: 'Use a deque when you need both ends, a heap for the top few, and sorted for the whole order.' }
        ],
        pick: 'If you test membership more than a few times, put the values in a **set** or **dict** first. Python\'s time complexity page lists these costs for CPython.'
      }),

      B.code({
        id: 'm3-count', t: 1, src: 'rec', title: 'Counting the work of a membership test', file: 'membership_counts.py', lang: 'python', code: MEM,
        steps: [
          { say: 'This program counts instead of timing. It wraps each id in a class that adds one to a counter every time Python compares two of them or hashes one. Counts do not depend on the machine.', lines: null },
          { say: 'The class counts every `__eq__` (comparison) and every `__hash__` call.', lines: G.span(MEM, /^class Key/, /return hash\(self\.value\)/) },
          { say: 'A helper resets the counters, runs `needle in container` once, and returns what it cost.', lines: G.span(MEM, /^def count/, /return found/) },
          { say: 'For 1,000, 10,000 and 100,000 ids it builds a list and a set, and looks for the last id, which is the worst case for a list.', lines: G.span(MEM, /^for n in/, /needle = Key/) },
          { say: 'The list needed as many comparisons as it has items: ' + fmt(LASTC.list) + ' for ' + fmt(LASTC.n) + ' ids. The set needed **' + LASTC.set + ' comparison and 1 hash call**, whatever the size.', lines: G.span(MEM, /_, list_eq, _ = /, /^    print\(/) }
        ],
        note: 'Output, recorded with Python ' + G.meta('python') + ':\n\n' + MEMT.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.widget({ id: 'm3-lab-lookup', kind: 'lookup', t: 1, src: 'rec', title: 'Lab: how long does a membership test take?' }),

      B.quiz({
        id: 'm3-q1', t: 1, src: 'rec',
        q: 'You must check five million incoming order ids against five million ids that are already loaded, one id at a time. Which container holds the loaded ids?',
        opts: [
          { t: 'A list: `if order_id in loaded_list`', fb: 'In the recording a list needed one comparison per item, ' + fmt(LASTC.list) + ' for ' + fmt(LASTC.n) + ' ids. Five million lookups into five million items can take up to 25 trillion comparisons.' },
          { t: 'A set: `if order_id in loaded_set`', fb: '' },
          { t: 'A tuple, because it is immutable and therefore faster', fb: 'A tuple is searched like a list, item by item.' },
          { t: 'A sorted list and a loop that scans from the start', fb: 'A scan still looks at many items. A binary search would help, and a set is simpler.' }
        ],
        ok: 1, why: 'A set finds a value with one hash and one comparison, as the counts showed. At a million ids the recorded median was about ' + fmt(RATIO_1M, 0) + ' times faster than the list on this machine. Build the set once, then test as often as you like.'
      }),

      B.term({
        id: 'm3-hash', t: 1, src: 'rec', title: 'What can be a key',
        say: 'A dict key or a set member must be hashable. Watch which objects Python accepts, and the exact error for the ones it refuses.',
        lines: function () { return G.plain(HASHT, { cmd: 'python hashing.py' }); },
        after: 'A **tuple** works. A **list** and a **dict** do not: their contents can change, so a hash computed once would stop matching. A class that defines `__eq__` and no `__hash__` is refused too, and a **frozen dataclass** works, because it cannot change. The rule: if two objects are equal, their hashes must be equal, and the hash must not change while the object is in a set.',
        afterKind: 'tip',
        doneSay: 'Hashable means the hash will never change. Immutable objects have that property. Mutable ones do not.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1, src: 'rec',
        q: 'You want to count orders by the pair (store, status). Which key works in a dict?',
        opts: [
          { t: '`("SG-01", "paid")`, a tuple', fb: '' },
          { t: '`["SG-01", "paid"]`, a list', fb: 'The recording shows `cannot use \'list\' as a dict key (unhashable type: \'list\')`.' },
          { t: '`{"store": "SG-01", "status": "paid"}`, a dict', fb: 'A dict is not hashable either. The recording shows the same error for it.' },
          { t: 'Any of them, because Python converts the key', fb: 'Python does not convert. It raises TypeError.' }
        ],
        ok: 0, why: 'A tuple of hashable values is hashable. For a bigger key, use a frozen dataclass or a named tuple.'
      }),

      B.bug({
        id: 'm3-bug1', t: 1, src: 'rec', q: 'This function collects order ids for a batch. Called twice without an argument, the second batch contains the first batch\'s ids. Click the line that causes it.',
        file: 'mutable_default.py', lang: 'python',
        code: ['def add_order(order_id, batch=[]):', '    batch.append(order_id)', '    return batch', '', 'print(add_order("O-1"))', 'print(add_order("O-2"))'].join('\n'),
        bad: [1],
        hint: 'When does Python make the default value: at each call, or once?',
        why: 'Python evaluates a default value **once**, when `def` runs, and every call that omits the argument shares that one list. In the recording the calls returned `[\'O-1\']`, then `[\'O-1\', \'O-2\']`, and `add_order("O-4")` still carried the earlier ids. Use `None` and make the list inside the function.',
        fix: ['def add_order(order_id, batch=None):', '    if batch is None:', '        batch = []', '    batch.append(order_id)', '    return batch'].join('\n'),
        cheer: 'A mutable default is shared by every call. Use None.'
      }),

      B.term({
        id: 'm3-mut', t: 1, src: 'rec', title: 'The shared default, run for real',
        say: 'This is the output of the file with the bug and its fix. Look at what the fourth call returns.',
        lines: function () { return G.plain(MUTT, { cmd: 'python mutable_default.py' }); },
        after: 'The third call passed its own list, so it was clean. The fourth call used the default again and got **O-1, O-2 and O-4**. The last line shows where they live: `add_order.__defaults__` holds the one list that every call shares. The `None` version made a new list each time.',
        afterKind: 'warn',
        doneSay: 'A bug that depends on how many times something ran before is the hardest kind to find. Learn the pattern and you will see it in a minute.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1, src: 'rec',
        q: 'In the recording, what does `add_order("O-4")` return?',
        opts: [
          { t: '[\'O-4\']', fb: 'That would be right with a `None` default. This function shares one list.' },
          { t: '[\'O-1\', \'O-2\', \'O-4\']', fb: '' },
          { t: '[\'O-3\', \'O-4\']', fb: 'The third call passed its own list, so it never touched the shared default.' },
          { t: 'An error, because the default list is full', fb: 'A list has no capacity limit that raises an error.' }
        ],
        ok: 1, why: 'The first two calls appended to the shared default, the third used its own list, and the fourth appended to the shared default again.'
      }),

      B.code({
        id: 'm3-copy', t: 1, src: 'rec', title: 'A copy of a list is not a copy of its contents', file: 'copying.py', lang: 'python', code: CPY,
        steps: [
          { say: 'A list of order dicts, each with a list of line numbers. This file makes three kinds of copy and changes something through each.', lines: null },
          { say: '`list(orders)` makes a new list that points at the **same** dicts. Appending to a line list through the copy changes the original: `[1, 2, 99]`. The two lists hold the same object, and the check prints `True`.', lines: G.span(CPY, /^shallow = list/, /^print\("same object/) },
          { say: '`copy.deepcopy` copies the dicts and the lists inside them. Changing the copy leaves the original at `[1, 2]`.', lines: G.span(CPY, /^deep = copy\.deepcopy/, /^print\("after changing a line through the deep/) },
          { say: 'An assignment is not a copy at all. `alias` is the same dict, so setting its total changes `row`.', lines: G.span(CPY, /^row = \{/, /^print\("an alias/) },
          { say: '`dict(row)` makes a new, separate dict. It is shallow too, so it is enough for flat values and not for nested ones.', lines: G.span(CPY, /^print\("the new dict/, /^print\("the new dict/) }
        ],
        note: 'Output of `copying.py`:\n\n' + CPYT.split('\n').map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.quiz({
        id: 'm3-q4', t: 1, src: 'rec',
        q: 'A job keeps `snapshot = list(orders)` before it changes the orders, so that it can compare later. It changes a nested list inside one order. What does the snapshot show?',
        opts: [
          { t: 'The old values, because it is a copy', fb: 'It is a shallow copy. The inner lists are shared, as the recording shows.' },
          { t: 'The new values for the nested list, because both lists point at the same inner objects', fb: '' },
          { t: 'A TypeError, because lists of dicts cannot be copied', fb: 'Python copies the outer list without complaint.' },
          { t: 'An empty list', fb: 'The snapshot has the same number of items as the original.' }
        ],
        ok: 1, why: 'In the recording the line list printed `[1, 2, 99]` after a change through the shallow copy. Use `copy.deepcopy` when you need to keep the old values of nested data, or better, do not change the original.'
      }),

      B.term({
        id: 'm3-sizes', t: 1, src: 'rec', title: 'What things weigh',
        say: 'Python objects carry overhead. Here is `sys.getsizeof` for common objects, from the real interpreter.',
        lines: function () { return G.plain(SIZET, { cmd: 'python sizes.py' }); },
        after: 'A small int is **' + S_INT + ' bytes**, and a string such as an order id **' + S_STR + ' bytes**. The list of 1,000 ints is **' + fmt(S_LIST1000) + ' bytes** for the list object alone, because it holds 8-byte pointers, and **' + fmt(DEEP) + ' bytes** with the ints it points to. That is about **' + fmt(DEEP / 1000, 0) + ' bytes for each number** that numpy would store in 8.',
        afterKind: 'tip',
        doneSay: '`getsizeof` counts one object and not what it points to. For the whole cost, add the pieces up, or measure with tracemalloc.'
      }),

      B.quiz({
        id: 'm3-q5', t: 1, src: 'rec',
        q: 'About how many bytes does each integer cost in a list of a million ints, counting the pointer in the list and the int object?',
        opts: [
          { t: 'About ' + fmt(S_INT) + ' bytes, because that is the size of an int', fb: 'That leaves out the 8-byte pointer in the list. The recording gives ' + fmt(DEEP / 1000, 0) + ' for the pair.' },
          { t: 'About ' + fmt(DEEP / 1000, 0) + ' bytes: a pointer plus an int object', fb: '' },
          { t: 'Exactly 8 bytes, as in C', fb: 'A C array stores 8 bytes. A Python list stores a pointer to a separate object.' },
          { t: 'About 100 bytes, because Python is slow', fb: 'Python objects are bigger than C values, but not that big.' }
        ],
        ok: 1, why: 'The list holds 8-byte pointers (8,056 bytes for 1,000 of them) and each int is its own object of ' + S_INT + ' bytes. A million ints in a list therefore take about ' + fmt(DEEP / 1000, 0) + ' MB. A numpy or Arrow column of 64-bit ints takes 8.'
      }),

      B.widget({ id: 'm3-lab-structs', kind: 'structs', t: 1, src: 'rec', title: 'Lab: ' + fmt(N) + ' records in ten structures' }),

      B.quiz({
        id: 'm3-q6', t: 1, src: 'rec',
        q: 'In the recording a list of dicts took ' + fmt(P_DICT, 1) + ' bytes per record and a list of tuples ' + fmt(P_TUPLE, 1) + '. Why do dicts cost more?',
        opts: [
          { t: 'Every dict carries its own hash table of the six keys, on top of the six values', fb: '' },
          { t: 'Dict values are stored as strings', fb: 'The values are the same objects in both structures.' },
          { t: 'tracemalloc counts dicts twice', fb: 'It counts each allocation once.' },
          { t: 'Dicts are copied when they are put in a list', fb: 'A list holds references. Nothing is copied.' }
        ],
        ok: 0, why: 'A tuple stores six pointers. A dict stores a small table of keys, hashes and values for every record, even though the keys are the same in all of them. That is the reason columns (' + fmt(P_COLS, 1) + ' bytes per record as a dict of lists) and tables (' + fmt(P_PD, 1) + ' as a pandas frame with default types) are so much smaller.'
      }),

      B.cmp({
        id: 'm3-records', t: 1, src: 'rec', title: 'Record types: which one for a row?',
        say: 'A row can be a dict, a tuple, a named tuple, a dataclass or a model. Press Next to compare. The sizes are the recorded bytes per record for six fields.',
        cols: ['Type', 'Bytes per record', 'Good for', 'Watch for'],
        hl: 2,
        rows: [
          ['dict', fmt(P_DICT, 1), 'Rows from JSON, where the keys vary.', 'The most memory, and a typo in a key is a runtime error.'],
          ['tuple', fmt(P_TUPLE, 1), 'Fixed rows that you unpack at once.', 'Reading `row[4]` tells nobody what field 4 is.'],
          ['namedtuple', fmt(per(/named tuples/), 1), 'The same, with names. Immutable.', 'Fields cannot change after creation.'],
          ['dataclass', fmt(per(/dataclass objects$/), 1), 'Named fields, types, defaults, easy to read and test.', 'Each object keeps a dict of its attributes unless you use slots.'],
          ['dataclass with slots', fmt(P_SLOTS, 1), 'A dataclass without the per-object dict.', 'Cannot add attributes later. Needs Python 3.10 or newer.'],
          ['pydantic model', 'not recorded here', 'Parsing and validating rows at the boundary (mission 11).', 'Costs more per row than a dataclass. Use it where you validate.']
        ],
        steps: [
          { upto: 2, say: 'Dicts and tuples: flexible, and fast to write. Tuples cost about a third less.' },
          { upto: 5, say: 'Named tuples and dataclasses keep the names. Slots remove the per-object dict, and the recording shows a smaller size.' },
          { upto: 6, say: 'A validating model belongs at the boundary, where you check data once, and not on every row of a million.' }
        ],
        pick: 'Use a **dataclass** (with `slots=True` when you hold many) for rows with names, a **tuple** for a row that you unpack and drop, and a **table** (mission 9) when the rows number in the millions.'
      }),

      B.code({
        id: 'm3-group', t: 1, src: 'rec', title: 'Counting, grouping and the top few', file: 'group_count.py', lang: 'python', code: GRP,
        steps: [
          { say: 'Four small tools from the standard library do most of the counting and grouping that a data engineer writes by hand. Eight sample orders, and real output for each.', lines: null },
          { say: '`Counter` counts how often each value appears. It prints in order of count.', lines: G.span(GRP, /^print\("orders per status/, /^print\("orders per status/) },
          { say: '`defaultdict(int)` starts every missing key at zero, so `revenue[store] += cents` needs no "is it there yet" check. Only paid orders count here.', lines: G.span(GRP, /^revenue = defaultdict/, /^print\("paid revenue/) },
          { say: '`heapq.nlargest(2, ...)` finds the two biggest orders without sorting all of them. For k much smaller than n, it does less work than `sorted`.', lines: G.span(GRP, /^print\("two biggest/, /^print\("two biggest/) },
          { say: '`sorted(..., key=...)` sorts by any function of the item. Python\'s sort is stable, so items with equal keys keep their order. A tuple key sorts by status first, then by amount.', lines: G.span(GRP, /^print\("stores by revenue/, /^    print\("  ", o\)/) }
        ],
        note: 'Output of `group_count.py`:\n\n' + GRPT.split('\n').slice(0, 4).map(function (l) { return '    ' + l; }).join('\n')
      }),

      B.bug({
        id: 'm3-bug2', t: 1, src: 'rec', q: 'This loop removes repeated orders from a list of one million rows. It works on the test data and takes hours on the real file. Click the line that makes it slow.',
        file: 'dedupe.py', lang: 'python', code: DEDUP_BAD, bad: [3],
        hint: 'What does `x not in seen` cost when `seen` is a list?',
        why: '`not in` on a list compares against every id seen so far: for n rows that is about n times n over two comparisons. The recording counted ' + fmt(LASTC.list) + ' comparisons for one lookup in ' + fmt(LASTC.n) + ' ids. With a set, each test costs one comparison.',
        fix: DEDUP_FIX,
        cheer: 'A set for "have I seen it" is the first fix to reach for.'
      }),

      B.challenge({
        id: 'm3-ch1', t: 1, lang: 'python', file: 'latest_per_key.py',
        q: '**Coding round: the newest record for each order.** The order service sends an event for every change, and a late event can arrive after a newer one. Write `latest_per_key(events)` that returns one event per `order_id`, the one with the greatest `updated_at`. The timestamps are ISO strings in UTC with the same format. Do not sort the whole list.',
        data: [{ name: 'events, in arrival order', cols: ['order_id', 'status', 'updated_at'], rows: [['O-1', 'created', '2026-03-01T08:00:00Z'], ['O-2', 'created', '2026-03-01T08:05:00Z'], ['O-1', 'paid', '2026-03-01T08:07:00Z'], ['O-3', 'created', '2026-03-01T09:00:00Z'], ['O-2', 'cancelled', '2026-03-01T08:06:00Z'], ['O-1', 'refunded', '2026-03-01T07:59:00Z']] }],
        starter: 'def latest_per_key(events, key="order_id", order_by="updated_at"):\n    ...',
        hints: ['Keep a dict from order id to the best event so far.', 'For each event, replace the stored one only if it is newer. Look up the stored one with a key you already have.', 'The last event in the list is the oldest. A solution that keeps the last one it sees is wrong.'],
        sol: LATFN,
        res: { msg: 'tests passed in the recording', cols: ['order_id', 'status', 'updated_at'], rows: LATROWS },
        expl: ['One pass over the events, one dict lookup per event: **O(n)** time and **O(k)** memory for k distinct orders.', 'The comparison `e[order_by] > latest[k][order_by]` works on ISO 8601 strings in one format and one time zone, because they sort the same way as the times. Different formats or offsets need parsing first (mission 6).', 'The late `refunded` event (07:59) is older than the stored `paid` event, so it is ignored. This is how out-of-order data is handled: compare by the time of the event, not the order of arrival.'],
        cx: 'O(n) time, O(k) extra memory. Sorting everything first would be O(n log n).'
      }),

      B.challenge({
        id: 'm3-ch2', t: 2, lang: 'python', file: 'top_k_per_group.py',
        q: '**Coding round: the two biggest orders for each store.** Write `top_k_per_group(rows, k)` where each row is `(order_id, store, cents)`. Return a dict from store to its k biggest orders, biggest first. Use memory proportional to the number of stores times k, not to the number of orders.',
        data: [{ name: 'orders', cols: ['order_id', 'store', 'cents'], rows: [['O-1', 'SG-01', '1250'], ['O-2', 'SG-01', '475'], ['O-3', 'KL-01', '3100'], ['O-4', 'SG-02', '820'], ['O-5', 'KL-01', '1990'], ['O-6', 'SG-01', '250'], ['O-7', 'KL-01', '5400'], ['O-8', 'SG-02', '610'], ['O-9', 'SG-01', '1250']] }],
        starter: 'def top_k_per_group(rows, k):\n    ...',
        hints: ['Keep one small heap for each store.', 'A min-heap of size k holds the k biggest seen so far. Its smallest item is at index 0.', 'When a new order is bigger than that smallest item, replace it with `heapq.heapreplace`.'],
        sol: TOPFN,
        res: { msg: 'tests passed in the recording', cols: ['store', 'biggest first'], rows: TOPT.split('\n').filter(function (l) { return /^[A-Z]{2}-\d\d /.test(l); }).map(function (l) { var i = l.indexOf(' '); return [l.slice(0, i), l.slice(i + 1)]; }) },
        expl: ['A min-heap of size k keeps the k largest values: the smallest of them sits at index 0, so one comparison decides whether a new value gets in.', 'Each order costs **O(log k)**, so the whole job is **O(n log k)** time and **O(s x k)** memory for s stores.', 'The tuple `(cents, order_id)` breaks ties by order id. The two 1,250 orders of SG-01 both appear, `O-9` first, because the larger id sorts higher.'],
        cx: 'O(n log k) time, O(s x k) memory. `heapq.nlargest` does the same for one group.'
      }),

      B.order({
        id: 'm3-order', t: 1, src: 'docs', q: 'Put the steps in order for removing repeated orders from a stream and keeping the newest of each.',
        items: ['Create an empty dict from order id to the best event so far', 'Read the next event from the stream', 'Look up its order id in the dict', 'Replace the stored event if the new one has a later updated_at', 'After the last event, return the dict values'],
        why: 'One pass and one dict. Each event costs one lookup, so the work is proportional to the number of events, and memory is proportional to the number of distinct orders.',
        cheer: 'Say it as: dict, read, look up, compare, return.'
      }),

      B.decide({
        id: 'm3-decide', t: 2, src: 'rec', title: 'Decision: remove repeated ids from forty million rows',
        scenario: 'A nightly job must drop rows whose order id appeared earlier in the same file, about 40 million ids. The recording measured **' + fmt(ID_SET, 1) + ' bytes per id in a set** and **' + fmt(ID_LIST, 1) + ' in a list**, for ids like `O-00000001`. That makes about **' + fmt(SET40, 1) + ' GB** for a set of 40 million ids (an estimate: it multiplies the bytes per id). The job runs in a container with 4 GB of memory.',
        opts: [
          { t: 'A Python set of ids, filtered row by row', d: 'About ' + fmt(SET40, 1) + ' GB for the ids alone, plus the rows you hold at the same time.', lose: 'It is close to the container limit before the rows are counted, so a slightly larger file gets the job killed.' },
          { t: 'A list of ids with `not in`', d: 'Smaller than a set, about ' + fmt(LIST40, 1) + ' GB.', lose: 'Each test scans the list. For 40 million ids that is hundreds of trillions of comparisons.' },
          { t: 'Let a database or DuckDB do it: `SELECT DISTINCT ON` or a unique key', d: 'The engine spills to disk, and the filter is a statement that other people can read.', lose: '' },
          { t: 'Buy a bigger container', d: 'A set fits in 16 GB with room to spare.', lose: 'It works until the file doubles, and it pays for memory every night to solve a problem that an engine solves for free.' }
        ],
        pick: 2,
        why: 'The set works in principle and has no room to grow in 4 GB. A database, DuckDB or Polars lazily keeps the data on disk when it must, and the unique key makes the job safe to run twice. Use Python for the glue and let an engine do the volume.',
        when: 'For a few million ids, or when the ids are small integers, a Python set is simpler and fine. For a stream that never ends, a keyed upsert in the target table does the job, as in mission 1.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the de-duplication job is killed at 3 AM', time: '03:14',
        alert: 'The nightly de-dup job exits with code 137 after about forty minutes, and the log has no Python error. The input file has doubled since last month, to about 40 million rows.',
        clues: ['Code 137 means the process was killed by the operating system, usually for running out of memory.', 'The job loads all ids into a Python set before it filters the rows.', 'The container limit is 4 GB.'],
        opts: [
          { t: 'Estimate the memory of the set from the row count, and move the de-duplication into an engine that can spill to disk', fb: '' },
          { t: 'Retry the job, because the kill was random', fb: 'A kill for memory is not random: it happens again at the same size.' },
          { t: 'Catch MemoryError in the job and continue', fb: 'The process is killed by the system before Python can raise MemoryError.' },
          { t: 'Convert the list of ids to a tuple to save memory', fb: 'A tuple holds the same pointers and the same id objects, so it saves almost nothing.' }
        ],
        best: 0, why: 'The recorded set of ids cost about ' + fmt(ID_SET, 0) + ' bytes each, so 40 million ids is about ' + fmt(SET40, 1) + ' GB: over a 4 GB container once the rows are held too. The cause is the size, so the fix is a different tool, not a retry.',
        checks: [
          ['Read the exit code and the container limit', '137 and a 4 GB limit point to the kernel killing the process for memory.'],
          ['Estimate the memory of the structure', 'Rows times bytes per id. With ' + fmt(ID_SET, 1) + ' bytes per id, 40 million ids is about ' + fmt(SET40, 1) + ' GB.'],
          ['Check what else is in memory', 'The rows being read, the output list, and temporary strings from parsing.'],
          ['Choose a bounded approach', 'A database unique key, DuckDB `DISTINCT`, or a sort-based pass that reads the file in chunks.'],
          ['Test at twice the size', 'Run the job on a file twice as large before the next night.']
        ],
        tell: 'The de-dup job was killed at 3 AM with exit code 137. The file had doubled to about 40 million rows, and the job held all ids in a Python set. From a measurement, a set of such ids costs about 85 bytes each, so about 3.4 GB, over the 4 GB container with the rows. I moved the de-duplication into DuckDB with a keyed query, which spills to disk, and tested the job at twice the size.',
        prevent: ['Estimate the memory of a structure before holding millions of items in it.', 'Alert when the input size grows by more than a set percentage.', 'Run a nightly test at twice the current size.', 'Prefer engines and keys for volume, and keep Python for the glue.']
      }),

      B.qa({
        id: 'qa-structs', t: 1, tag: 'Python basics', secs: 60,
        q: 'When do you use a list, a tuple, a dict and a set?',
        pts: ['List for ordered items you append to and loop over', 'Tuple for a fixed record, and as a dict key', 'Dict to find a value by key', 'Set for membership and to remove repeats'],
        short: 'A list when I have items in order that I append to and loop over. A tuple for a small fixed group of values, like a record that I unpack, and when I need a hashable key. A dict when I look things up by key, for example the total for an order id. A set when I ask "is it there" or need to remove repeats. The big difference is the search: `in` on a list looks at every item, and `in` on a set or a dict is about one step. In a recording, a list needed 100,000 comparisons to find the last of 100,000 ids, and a set needed one.',
        fu: [['What is the cost of appending to a list?', 'O(1) amortized. Inserting at the front is O(n), so I use a deque when I need both ends.'], ['What if I need order and fast membership?', 'A dict keeps insertion order and gives O(1) lookup, so `dict.fromkeys(items)` de-duplicates and keeps the order.']],
        trap: 'Searching a list inside a loop. It works on test data and falls over on production volume.',
        real: 'Give an example from your work where switching to a set or a dict made a job faster.'
      }),

      B.qa({
        id: 'qa-hash', t: 1, tag: 'Python basics', secs: 60,
        q: 'What does hashable mean, and why can a list not be a dict key?',
        pts: ['A hash is a number computed from the value, used to find the slot', 'Equal objects must have equal hashes', 'The hash must not change while the object is in the dict', 'Mutable containers can change, so they are not hashable'],
        short: 'A dict or a set finds an item by computing a number from it, its hash, and going to that slot. For that to work, equal objects must have equal hashes, and the hash must never change while the object is stored. A tuple of hashable values never changes, so it is hashable. A list or a dict can change, so Python refuses them as keys: in a recording it raised `TypeError: cannot use \'list\' as a dict key (unhashable type: \'list\')`. A class that defines `__eq__` without `__hash__` becomes unhashable too, and a frozen dataclass is hashable.',
        fu: [['How do you use a list-like value as a key?', 'Convert it to a tuple, or use a frozen dataclass or a frozenset.'], ['Are two equal strings always the same object?', 'No. Equality and identity are different, and hashing uses equality.']],
        trap: 'Saying that immutable means hashable. A tuple that contains a list is immutable and still unhashable.',
        real: 'Describe a time when you needed a composite key.'
      }),

      B.qa({
        id: 'qa-mutable', t: 1, tag: 'Python basics', secs: 60,
        q: 'What is wrong with `def add(order_id, batch=[])`?',
        pts: ['The default is created once, when def runs', 'Every call without the argument shares the same list', 'Fix: default None, create the list inside', 'Same for dicts, sets and objects that are changed'],
        short: 'Python evaluates a default value once, when the function is defined, so every call that leaves out the argument shares one list. The batch from an earlier call leaks into the next one. In a recording the fourth call returned `[\'O-1\', \'O-2\', \'O-4\']` although I asked for one order. The fix is to default to `None`, and create the list inside the function when the argument is `None`. The same holds for dicts, sets and any object that you change. It is a standard code review catch, and a linter rule, B006 in flake8-bugbear and in ruff, finds it.',
        fu: [['Is a default of 0 or a string a problem?', 'No. They are immutable, so sharing them is safe.'], ['How would you find this in an old codebase?', 'Turn on the linter rule for mutable defaults, and run it over the code.']],
        trap: 'Calling it a bug in Python. It is documented behavior, and the lesson is to know it.',
        real: 'If you have been bitten by this, say what it affected.'
      }),

      B.qa({
        id: 'qa-memory', t: 2, tag: 'Performance', secs: 60,
        q: 'You have to hold a few million rows in memory. How do you choose the structure?',
        pts: ['Estimate bytes per record and multiply', 'A list of dicts costs the most, a table of typed columns the least', 'Dataclass with slots or tuples when you need Python objects', 'Measure with tracemalloc, and test at twice the size'],
        short: 'I estimate first: bytes per record times the number of records. In a recording of 200,000 records with six fields, a list of dicts cost about 500 bytes per record, a list of tuples about 326, a dataclass with slots about 310, and typed columns in pandas or Arrow between 26 and 74. So for millions of rows I use a table with typed columns and not a list of Python objects, and I give low-cardinality text a category type. When I need Python objects, I choose tuples or slotted dataclasses. I confirm with tracemalloc on a sample, and test at twice the size to see how close I am to the limit.',
        fu: [['Why is a table so much smaller?', 'It stores numbers in compact arrays of one type and repeated strings once, not a separate Python object for every value.'], ['How would you read a file that does not fit?', 'In chunks or as a stream, and keep only what you need. Mission 4 covers it.']],
        trap: 'Guessing from the file size. A 100 MB CSV can need several gigabytes as Python dicts.',
        real: 'Describe a job whose memory use surprised you, and how you measured it.'
      }),

      B.qa({
        id: 'qa-complexity', t: 2, tag: 'Performance', secs: 60,
        q: 'What is the time complexity of the operations you use every day on lists, dicts and sets?',
        pts: ['List append O(1), index O(1), `in` O(n), insert at front O(n)', 'Dict and set get, set and `in` O(1) on average', 'Sort O(n log n), heap push and pop O(log n)', 'Average is not worst case: hash collisions'],
        short: 'For a list, append and indexing are constant time, a membership test is linear, and inserting or deleting at the front is linear because everything shifts. For a dict or a set, get, set and membership are constant time on average. Sorting is n log n, and a heap push or pop is log n, which is why `heapq.nlargest` is good for the top few. I say "on average", because a bad run of hash collisions makes a dict slower, though it is rare in practice. I back these claims with counts: a list needed one comparison per item in a recording, and a set needed one.',
        fu: [['Is `list.pop()` the same as `list.pop(0)`?', 'No. Popping the end is O(1). Popping the front is O(n), so I use a deque for a queue.'], ['What does amortized mean?', 'Occasional resizing costs more, but the average over many appends is constant.']],
        trap: 'Quoting complexity without saying which operation and which container.',
        real: 'Give an example where a better data structure turned an hours-long job into minutes.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Structure Chooser', color: '#BBF7D0',
        pts: [
          'Pick the container by the question: **list** for order, **tuple** for a fixed record, **dict** to find by key, **set** for "is it there", **heap** for the top few.',
          '`in` on a list is **O(n)**: ' + fmt(LASTC.list) + ' comparisons for ' + fmt(LASTC.n) + ' ids. On a set it is **one comparison**. At a million ids the recorded list lookup was about ' + fmt(RATIO_1M, 0) + ' times slower.',
          'Only **hashable** objects can be keys: tuples and frozen dataclasses yes, lists and dicts no.',
          'A **mutable default** is shared by every call. **A shallow copy** shares the objects inside. Use `None` and `copy.deepcopy`.',
          'A list of dicts cost **' + fmt(P_DICT, 0) + ' bytes per record**, a tuple ' + fmt(P_TUPLE, 0) + ', a typed table ' + fmt(P_PDT, 0) + '. Estimate, measure, and let an engine hold the volume.'
        ],
        lines: [
          'I choose the container by the question I ask of the data.',
          'I estimate memory as bytes per record times records, and I measure it.',
          'I never search a list inside a loop.'
        ]
      })
    ]
  });
})();
