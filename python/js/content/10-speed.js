/* Mission 10: speed and memory. Real timings, profiles and memory sizes from this machine, on regular and free-threaded Python 3.14. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PFF = G.file('m10/profile_first.py'), VZF = G.file('m10/vectorize.py'), CCF = G.file('m10/concurrency.py'), PMF = G.file('m10/pandas_memory.py'), TFF = G.file('m10/threaded_fetch.py');
  var PFT = G.text('m10/profile_first.py'), VZT = G.text('m10/vectorize.py'), CCT = G.text('m10/concurrency.py'), CFT = G.text('m10/concurrency.py@free'), PMT = G.text('m10/pandas_memory.py'), TFT = G.text('m10/threaded_fetch.py');
  var PR = G.counts('m10.profile'), VC = G.counts('m10.vector'), ME = G.counts('m10.memory'), CO = G.counts('m10.concurrency');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }
  function f1(x) { return x.toFixed(1); }

  var RG = CO.builds['regular'], FR = CO.builds['free-threaded'];
  var LOOP = VC.ms['for loop'], NUMPY = VC.ms['numpy: (arr * 2).sum()'], PANDAS = VC.ms['pandas: (s * 2).sum()'];
  var MT = { before: 0, after: 0 };
  Object.keys(ME.columns).forEach(function (k) { if (k !== 'total') { MT.before += ME.columns[k].before_mb; MT.after += ME.columns[k].after_mb; } });
  var TOT = ME.columns['total'];
  G.expect(PR.hot_function === 'is_known' && PR.hot_calls === 20000 && PR.list_seconds > 20 * PR.set_seconds && /20000\s+0\.\d+\s+0\.000\s+0\.\d+\s+0\.000 profile_first\.py:11\(is_known\)/.test(PFT), 'the profile names is_known as the hot spot, and a set is more than 20 times faster than a list');
  G.expect(LOOP / NUMPY > 10 && LOOP / PANDAS > 10, 'numpy and pandas are more than 10 times faster than a Python loop');
  G.expect(TOT && TOT.after_mb < TOT.before_mb / 3 && /same sums and values after the change/.test(PMT), 'smaller types cut the memory to less than a third, with the same values');
  G.expect(RG.gil === true && FR.gil === false && RG.cores >= 2, 'one build has the GIL and the free-threaded one has not');
  var RW = RG.waiting, RC = RG.computing, FW = FR.waiting, FC = FR.computing;
  G.expect(RW['one after another'] >= 1.8 && RW['8 threads'] < 0.6 && RW['asyncio'] < 0.6 && RW['4 processes'] < RW['one after another'] && RW['4 processes'] > RW['8 threads'], 'waiting jobs overlap with threads and asyncio, and processes pay for starting');
  G.expect(RC['8 threads'] >= 0.85 * RC['one after another'] && RC['4 processes'] <= 0.75 * RC['one after another'], 'with a GIL, threads give no speed-up for computing and processes do');
  G.expect(FC['8 threads'] <= 0.8 * FC['one after another'], 'without a GIL, threads speed up computing work');
  G.expect(/GIL enabled: True/.test(CCT) && /GIL enabled: False/.test(CFT), 'the two recordings come from the two builds');
  G.expect(/tests passed$/.test(TFT) && /finished in under a second/.test(TFT), 'the coding round passes');

  var BUG_LIST = ['KNOWN = load_store_ids()  # a list of 5,000 ids', '', 'def keep_known(rows):', '    return [r for r in rows if r.store in KNOWN]'].join('\n');
  var BUG_LIST_FIX = ['KNOWN = set(load_store_ids())  # a set: one hash lookup for each row', '', 'def keep_known(rows):', '    return [r for r in rows if r.store in KNOWN]'].join('\n');
  var BUG_THREADS = ['from concurrent.futures import ThreadPoolExecutor', '', 'def parse_all(files):', '    with ThreadPoolExecutor(8) as pool:', '        return list(pool.map(parse_big_file, files))  # pure Python parsing'].join('\n');
  var BUG_THREADS_FIX = ['from concurrent.futures import ProcessPoolExecutor', '', 'def parse_all(files):', '    with ProcessPoolExecutor(4) as pool:', '        return list(pool.map(parse_big_file, files))  # one interpreter for each worker'].join('\n');
  var TFROWS = TFT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Speed and memory', short: 'Speed', blurb: 'Profile first, then threads, processes, asyncio and the GIL', minutes: 38,
    focus: ['stg', 'ing'],
    goals: [
      '**Measure** before you change anything: a profile names the hot spot.',
      'Replace a Python loop with a **column operation**, and a list lookup with a **set**.',
      'Tell **waiting** work from **computing** work, and pick threads, asyncio or processes for each.',
      'Explain the **GIL** and what the **free-threaded** Python 3.14t build changes.',
      'Cut the memory of a table with smaller **types**, and keep the values.'
    ],
    say: 'Mission 10 is about making a job faster without guessing. You will profile a slow report and find the one function that takes the time, then replace it. You will time eight jobs run one after another and at once, with threads, processes and asyncio, on the regular Python and on the free-threaded build that ships with Python 3.14. Every time is a real median from this machine, and the machine was shared, so read the ratios and not the decimals.',
    scenes: [
      B.talk({
        id: 'm10-talk', t: 1, src: 'docs', title: 'Measure before you change anything',
        say: 'Press Next for the four steps of every speed-up.',
        items: [
          ['1. Measure', 'Time the whole job on real data. Write the number down. A job that takes 40 seconds and has to take 10 is a goal. "Feels slow" is not.', 'Get a number.'],
          ['2. Find the hot spot', 'A profiler shows where the time goes. It is nearly always one or two functions, and rarely the one you suspected.', 'Profile it.'],
          ['3. Change one thing', 'Fix the hot spot and nothing else. If you change five things, you will not know which one helped, and which one broke something.', 'One change.'],
          ['4. Measure again', 'Run the same measurement. Keep the change if the number moved, and revert it if it did not. Run the tests too.', 'Same measurement.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm10-prof', t: 1, src: 'rec', title: 'A profile finds the hot spot', file: 'profile_first.py', lang: 'python', code: PFF,
        steps: [
          { say: 'A slow report over 20,000 orders. A profile will say where the time goes, and then one change fixes it. The output is real.', lines: null },
          { say: 'The data: 5,000 store ids and 20,000 orders.', lines: G.span(PFF, /^STORES = /, /^ROWS = /) },
          { say: '`report` adds up the orders of the stores that it knows. `is_known` asks whether a store is in the collection `known`.', lines: [blk(PFF, 'is_known')[0], blk(PFF, 'report')[1]] },
          { say: '`seconds` times `report` three times and returns the median.', lines: blk(PFF, 'seconds') },
          { say: '`cProfile` runs `report` once and records every function call. `pstats` prints the three functions with the most time inside themselves (`tottime`).', lines: G.span(PFF, /^profile = /, /print_stats/) },
          { say: 'Then the same report is timed with `known` as a list, and again as a set.', lines: G.span(PFF, /^print\(f"known is a list/, /known is a set/) }
        ]
      }),

      B.term({
        id: 'm10-prof-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `profile_first.py`. Read the `tottime` column.',
        lines: function () { return G.plain(PFT, { cmd: 'python profile_first.py' }); },
        after: 'Almost all of the time is inside **`is_known`**, called 20,000 times. It checks `store in known`, and for a **list** Python compares the store with the items one by one. Changing `known` to a **set** (a hash lookup) took the report from **' + PR.list_seconds.toFixed(3) + ' s** to **' + PR.set_seconds.toFixed(4) + ' s**, about **' + Math.round(PR.list_seconds / PR.set_seconds) + ' times** faster on this machine. One change, found by the profile.',
        afterKind: 'tip',
        doneSay: 'Profile first. The hot spot is usually one line.'
      }),

      B.quiz({
        id: 'm10-q1', t: 1, src: 'rec',
        q: 'In the profile, which function held nearly all of the time, and what was the one-line fix that the recording timed?',
        opts: [
          { t: 'is_known, called 20,000 times. Make `known` a set instead of a list.', fb: '' },
          { t: 'report. Rewrite the loop in C.', fb: '`report` itself took 0.011 s. The time was inside the function that it calls.' },
          { t: 'The `get` method of the dict', fb: 'It took 0.004 s for 20,000 calls.' },
          { t: 'The profile does not say. Try them one by one.', fb: 'The profile ranks the functions by time spent. That is its job.' }
        ],
        ok: 0, why: '`is_known` had a `tottime` of about 0.48 of the 0.495 seconds. Looking up a store in a list of 5,000 compares one by one, so the cost grows with the list. A set finds it with a hash.'
      }),

      B.bug({
        id: 'm10-bug1', t: 1, src: 'rec', q: 'This filter keeps the rows whose store is known. On 2 million rows it takes minutes. Click the line that makes it slow.',
        file: 'known.py', lang: 'python', code: BUG_LIST, bad: [1, 4],
        hint: 'What kind of collection is KNOWN, and what does `in` do on it?',
        why: '`x in list` compares x with the items one by one, so each row costs up to 5,000 comparisons. In the recording that was the hot spot of the profile. Make `KNOWN` a set, and the same line does one hash lookup for each row.',
        fix: BUG_LIST_FIX,
        cheer: 'Membership tests belong on a set.'
      }),

      B.code({
        id: 'm10-vec', t: 1, src: 'rec', title: 'A loop, and the same sum as one operation', file: 'vectorize.py', lang: 'python', code: VZF,
        steps: [
          { say: 'The same sum over one million numbers, four ways. Each time is the median of five runs. The output is real.', lines: null },
          { say: 'A Python `for` loop. Every step runs Python code.', lines: blk(VZF, 'loop') },
          { say: 'The same work as one column operation, in numpy and in pandas. The loop runs in compiled code.', lines: [blk(VZF, 'numpy_sum')[0], blk(VZF, 'pandas_sum')[1]] },
          { say: 'The timing function, and the table of the four methods. An `assert` first checks that all four give the same number.', lines: [blk(VZF, 'median_ms')[0], last(VZF)] }
        ]
      }),

      B.term({
        id: 'm10-vec-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output, in milliseconds, on this machine.',
        lines: function () { return G.plain(VZT, { cmd: 'python vectorize.py' }); },
        after: 'The Python loop took **' + f1(LOOP) + ' ms**. The numpy column operation took **' + f1(NUMPY) + ' ms**, about **' + Math.round(LOOP / NUMPY) + ' times** less, and pandas **' + f1(PANDAS) + ' ms**. All four gave the same number. The same rule holds for a DataFrame: write the logic as column expressions, and keep a row loop for the few cases that cannot be written that way.',
        afterKind: 'tip',
        doneSay: 'Columns, not rows.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1, src: 'rec',
        q: 'One million numbers were summed with a Python loop and with numpy. In the recording, roughly how much faster was numpy?',
        opts: [
          { t: 'More than 10 times: ' + f1(LOOP) + ' ms against ' + f1(NUMPY) + ' ms', fb: '' },
          { t: 'About the same', fb: 'The Python loop ran one step at a time in Python. numpy ran the whole column in compiled code.' },
          { t: 'About 2 times', fb: 'The gap was much larger than that.' },
          { t: 'The loop was faster', fb: 'The loop was the slowest of the three that sum the numbers by multiplying.' }
        ],
        ok: 0, why: 'A Python loop pays the interpreter\'s cost on every element, and a numpy operation pays it once for the whole array. The exact ratio changes with the machine and the operation. The direction does not.'
      }),

      B.cmp({
        id: 'm10-kind', t: 1, src: 'docs', title: 'Waiting work and computing work',
        say: 'The first question is not "threads or processes". It is "what is the job doing most of the time?". Press Next.',
        cols: ['Kind of work', 'What it looks like', 'What helps', 'What does not'],
        hl: 0,
        rows: [
          ['Waiting (I/O bound)', 'Calls to an API, queries, reading from a network disk. The CPU is idle most of the time.', 'Threads or asyncio: many waits overlap. Or a bulk API that takes many items at once.', 'More cores.'],
          ['Computing (CPU bound)', 'Parsing, hashing, compressing, a loop that crunches numbers. One core is at 100 percent.', 'Column operations, a better algorithm, processes, or the free-threaded build with threads.', 'Threads on a regular build: only one runs Python at a time.'],
          ['Memory bound', 'The table barely fits, or does not. The job swaps or is killed.', 'Smaller types, fewer columns, chunks or a streaming engine.', 'More workers: each one needs its own memory.']
        ],
        steps: [
          { upto: 1, say: 'Waiting work is the easy case: overlap the waits.' },
          { upto: 3, say: 'Computing work needs more cores or a better method. Memory is a separate limit.' }
        ],
        pick: 'Ask what the job waits on. **Waits** get threads or asyncio, **computing** gets processes or columns, and **memory** gets smaller data.'
      }),

      B.flow({
        id: 'm10-flow', t: 1, src: 'docs', title: 'Threads, processes and the GIL', g: 'conc', legend: true,
        steps: [
          { say: 'Eight chunks of work, two ways to run them: threads in one process, or several processes. Press Next.', cap: 'Nothing has run yet.' },
          { say: 'Step 1. Threads share one process and one memory. That is cheap to start, and easy to share data.', on: ['c1'], focus: ['job', 'thr'], cap: 'Threads share memory.' },
          { say: 'Step 2. In a regular Python build, one **GIL** (global interpreter lock) protects the interpreter. Only one thread runs Python code at a time.', on: ['c2'], focus: ['thr', 'gil'], cap: 'One lock for the interpreter.' },
          { say: 'Step 3. So computing work on threads uses one core. But a thread that **waits** lets go of the GIL, so waits overlap.', on: ['c3'], focus: ['gil', 'one'], tags: ['tg_wait'], cap: 'Waits overlap, computing does not.' },
          { say: 'Step 4. Processes each start their own interpreter, so each has its own GIL. Nothing blocks, and the work runs on several cores.', on: ['c4', 'c5', 'c6'], focus: ['prc', 'gils', 'many'], cap: 'A GIL in each process.' },
          { say: 'The free-threaded build, Python 3.14t, has no GIL. Threads run on several cores at once. It is a separate build, and some libraries are not ready for it yet.', on: ['c1', 'c2', 'c3'], focus: ['thr', 'gil', 'one'], tags: ['tg_free'], cap: 'A build without the GIL.' }
        ]
      }),

      B.code({
        id: 'm10-conc', t: 1, src: 'rec', title: 'Eight jobs, one after another and at once', file: 'concurrency.py', lang: 'python', code: CCF,
        steps: [
          { say: 'Two kinds of job, and four ways to run them. The waiting job sleeps 0.25 s, which stands in for a network call. The computing job adds up numbers. The output is real.', lines: null },
          { say: 'A job that waits, the same job for asyncio, and a job that computes.', lines: G.span(CCF, /^def wait_job/, /return total/) },
          { say: 'Four ways to run eight jobs: one after another, in a thread pool, in a process pool, and with asyncio.', lines: G.span(CCF, /^def one_after_another/, /asyncio\.run\(main\(\)\)/) },
          { say: 'Each way is timed three times and the median is printed.', lines: blk(CCF, 'seconds') },
          { say: 'The program also prints whether the GIL is on (`sys._is_gil_enabled()`). The `if __name__` guard matters, because a process pool starts new interpreters that import this file.', lines: [G.at(CCF, /^if __name__/), last(CCF)] }
        ]
      }),

      B.term({
        id: 'm10-conc-run', t: 1, src: 'rec', title: 'Run it on the regular build',
        say: 'The real output of `concurrency.py` with Python ' + G.meta('python') + ' and the GIL on. The machine has ' + RG.cores + ' cores, and other programs were using it.',
        lines: function () { return G.plain(CCT, { cmd: 'python concurrency.py' }); },
        after: 'The waiting jobs took **' + RW['one after another'].toFixed(2) + ' s** one after another, and about **' + RW['8 threads'].toFixed(2) + ' s** with 8 threads or asyncio, because the eight waits overlapped. Processes helped too, and paid for starting. The computing jobs took **' + RC['one after another'].toFixed(2) + ' s** one after another, **' + RC['8 threads'].toFixed(2) + ' s** with 8 threads (no gain), and **' + RC['4 processes'].toFixed(2) + ' s** with 4 processes.',
        afterKind: 'tip',
        doneSay: 'Threads for waiting. Processes for computing.'
      }),

      B.term({
        id: 'm10-conc-free', t: 2, src: 'rec', title: 'The same file on the free-threaded build',
        say: 'The same program with Python ' + G.meta('python_free_threaded') + ' in its free-threaded build. The first line says that the GIL is off.',
        lines: function () { return G.plain(CFT, { cmd: 'python3.14t concurrency.py' }); },
        after: 'The waiting jobs behave as before. The computing jobs now gain from **threads**: **' + FC['8 threads'].toFixed(2) + ' s** against **' + FC['one after another'].toFixed(2) + ' s** one after another. A thread no longer waits for a lock to run Python code. The gain is under the 4 cores of the machine, and the sequential run is a little slower than on the regular build, which is a known cost of this build.',
        afterKind: 'tip',
        doneSay: 'Without the GIL, threads can compute in parallel.'
      }),

      B.widget({ id: 'm10-lab-conc', kind: 'conc', t: 1, src: 'rec', title: 'Lab: threads, processes and asyncio' }),

      B.quiz({
        id: 'm10-q3', t: 1, src: 'rec',
        q: 'Eight jobs each waited 0.25 s. About how long did eight threads take on the regular build, according to the recording?',
        opts: [
          { t: 'About ' + RW['8 threads'].toFixed(2) + ' s, the time of one wait', fb: '' },
          { t: 'About 2 s, the sum of the waits', fb: 'That is the time of running them one after another.' },
          { t: 'About 0.06 s', fb: 'Eight jobs cannot finish faster than one wait of 0.25 s.' },
          { t: 'Slower than one after another, because of the GIL', fb: 'The GIL is released while a thread waits, so the waits overlap.' }
        ],
        ok: 0, why: 'A thread that sleeps or waits for the network lets go of the GIL, so the other threads run. Eight waits at the same time take about as long as one. Asyncio did the same without threads.'
      }),

      B.quiz({
        id: 'm10-q4', t: 1, src: 'rec',
        q: 'Eight computing jobs ran in 8 threads on the regular build. What happened to the time, compared with one after another?',
        opts: [
          { t: 'No gain: ' + RC['8 threads'].toFixed(2) + ' s against ' + RC['one after another'].toFixed(2) + ' s', fb: '' },
          { t: 'About 8 times faster', fb: 'Only one thread runs Python code at a time, because of the GIL.' },
          { t: 'About 4 times faster, one for each core', fb: 'That needs separate processes, or the free-threaded build.' },
          { t: 'It crashed', fb: 'It ran. It was just not faster.' }
        ],
        ok: 0, why: 'The GIL lets one thread run Python bytecode at a time, so eight threads took turns on one core, with a little extra for switching. Four processes took ' + RC['4 processes'].toFixed(2) + ' s because each had its own interpreter.'
      }),

      B.quiz({
        id: 'm10-q5', t: 2, src: 'rec',
        q: 'On the free-threaded build, `sys._is_gil_enabled()` printed False. What did 8 threads do to the computing jobs?',
        opts: [
          { t: 'They ran faster: ' + FC['8 threads'].toFixed(2) + ' s against ' + FC['one after another'].toFixed(2) + ' s one after another', fb: '' },
          { t: 'Nothing, as on the regular build', fb: 'Without the GIL, threads can run Python code on several cores at once.' },
          { t: 'They were exactly 4 times faster', fb: 'The machine has 4 cores that other programs were also using, so the gain was smaller.' },
          { t: 'The program refused to start threads', fb: 'It ran as normal.' }
        ],
        ok: 0, why: 'No GIL means that threads are no longer taking turns. The speed-up here was well under the number of cores, which is typical on a shared machine. The free-threaded build is a separate install, and a library that is not marked as supporting it can turn the GIL back on.'
      }),

      B.bug({
        id: 'm10-bug2', t: 1, src: 'rec', q: 'A team adds `ThreadPoolExecutor(8)` to speed up a parse step in pure Python. The step takes the same time as before, and CPU use stays at 100 percent of one core. Click the line that is the wrong tool.',
        file: 'parse_all.py', lang: 'python', code: BUG_THREADS, bad: [4],
        hint: 'Is the parse step waiting, or computing? What does the GIL allow?',
        why: 'Parsing in pure Python is computing work. On a regular build only one thread runs Python at a time, so eight threads were no faster in the recording: ' + RC['8 threads'].toFixed(2) + ' s against ' + RC['one after another'].toFixed(2) + ' s. Use processes, or vectorise the parsing. Processes finished in ' + RC['4 processes'].toFixed(2) + ' s.',
        fix: BUG_THREADS_FIX,
        cheer: 'Computing work needs processes, not threads.'
      }),

      B.code({
        id: 'm10-mem', t: 2, src: 'rec', title: 'Smaller types, smaller table', file: 'pandas_memory.py', lang: 'python', code: PMF,
        steps: [
          { say: 'One million made-up orders in a pandas table, with the default types and then with smaller ones. The output is real.', lines: null },
          { say: 'Five columns: ids, two columns of text, a small quantity and a total in cents.', lines: G.span(PMF, /^df = pd\.DataFrame/, /^\}\)/) },
          { say: '`astype` changes the types: 32-bit and 8-bit integers where the values are small, and `category` for text with few different values.', lines: G.span(PMF, /^small = /, /^small = /) },
          { say: '`memory_usage(deep=True)` counts the real bytes, including the text. The loop prints each column.', lines: G.span(PMF, /^before, after/, /^print\(f"\{'total'/) },
          { say: 'A final check: the sums and the values are the same after the change.', lines: G.span(PMF, /^assert df/, /^print\("same sums/) }
        ]
      }),

      B.term({
        id: 'm10-mem-run', t: 2, src: 'rec', title: 'Run it',
        say: 'The real output. The sizes are in megabytes.',
        lines: function () { return G.plain(PMT, { cmd: 'python pandas_memory.py' }); },
        after: 'The table went from **' + TOT.before_mb.toFixed(1) + ' MB** to **' + TOT.after_mb.toFixed(1) + ' MB**, about **' + (TOT.before_mb / TOT.after_mb).toFixed(1) + ' times** smaller, with the same values. Two text columns with eight and three different values became `category` and shrank to 1 MB each. Money stays in integer cents (`int32`), never in `float32`.',
        afterKind: 'tip',
        doneSay: 'Smaller types, same values.'
      }),

      B.quiz({
        id: 'm10-q6', t: 2, src: 'rec',
        q: 'In the recording, which change saved the most memory for one column, and which type is never right for money?',
        opts: [
          { t: 'The `status` text column became `category`: ' + ME.columns['status'].before_mb.toFixed(1) + ' MB to ' + ME.columns['status'].after_mb.toFixed(1) + ' MB. Never `float32` for money.', fb: '' },
          { t: 'order_id from int64 to int32 saved the most', fb: 'It saved 4 MB. The text columns saved about 13 MB each.' },
          { t: 'qty from int64 to int8 saved the most', fb: 'It saved 7 MB. A text column saved more.' },
          { t: 'Nothing saved much', fb: 'The table went to under a third of its size.' }
        ],
        ok: 0, why: 'A text column with few different values stores each value once in a `category`, and a small integer for each row. And a float cannot hold 0.10 exactly (mission 6), so money stays in integer cents or `Decimal`.'
      }),

      B.decide({
        id: 'm10-decide', t: 2, src: 'rec', title: 'Decision: 5,000 pages to download and parse',
        scenario: 'A job downloads 5,000 web pages from a partner and parses each one in pure Python. A download takes about 0.3 s of waiting, and a parse takes about 0.1 s of computing. One after another that is about 33 minutes. The recordings showed that eight waits overlapped with threads or asyncio, and that threads gave **no gain** for computing on the regular build, while four processes did.',
        opts: [
          { t: 'One ThreadPoolExecutor for the download and the parse', d: 'One pool, simple code.', lose: 'The downloads overlap, and the parsing does not: it still runs one thread at a time.' },
          { t: 'Threads (or asyncio) for the downloads, and a process pool for the parsing', d: 'Each step gets the tool that matches its work.', lose: '' },
          { t: 'A process pool with 200 processes for everything', d: 'Parallel everywhere.', lose: 'Each process needs memory, and the machine has a few cores. Most of the processes would only wait.' },
          { t: 'Keep it sequential and buy a faster CPU', d: 'No change to the code.', lose: 'It does not help the waiting at all, and the waits are most of the time.' }
        ],
        pick: 1,
        why: 'The download is waiting work, so threads or asyncio overlap it, and the parse is computing work, so processes use the cores. A bounded number of workers for each step keeps memory and the partner\'s rate limit in check.',
        when: 'If the parsing can be vectorised, do that first, and a single process may be enough. On the free-threaded build, one thread pool can serve both steps, if every library you use supports it.'
      }),

      B.challenge({
        id: 'm10-ch1', t: 1, lang: 'python', file: 'threaded_fetch.py',
        q: '**Coding round: many slow calls at once.** Write `fetch_all(fetch, urls, workers=10)`. It calls `fetch(url)` for every url in a thread pool, and returns a list in the order of `urls`. Each item is `("ok", result)` when the call worked, or `("error", "ExceptionName: message")` when it raised. One failure must not stop the others.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['20 calls of 0.1 s, 10 workers', 'done in under a second'], ['results', 'in the order of the urls'], ['one call raises TimeoutError', '("error", "TimeoutError: read timed out"), the other 19 are ok'], ['no urls', 'an empty list']] }],
        starter: 'from concurrent.futures import ThreadPoolExecutor\n\ndef fetch_all(fetch, urls, workers=10):\n    ...',
        hints: ['`pool.map(one, urls)` returns the results in the order of the input, even when the calls finish in another order.', 'Wrap one call in a function with `try` and `except Exception`, and return the tuple. A worker that raises would stop the `map` when you read its result.', 'Use `with ThreadPoolExecutor(workers) as pool:` so that the pool is closed, and `list(...)` to read all the results.'],
        sol: fn(TFF, 'fetch_all'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: TFROWS },
        expl: ['Twenty waits of 0.1 s would take 2 seconds one after another. With ten workers the test finished in well under a second, because waiting work overlaps in threads.', 'The error handling is inside `one`, so a failure becomes a value. `map` keeps the order of the input, so the result lines up with `urls`.', 'It is the right tool for waiting work. For computing work in pure Python, use a process pool on a regular build.'],
        cx: 'About n divided by the number of workers, times the time of one call.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, src: 'rec', title: 'Incident: eight threads, and the job is no faster', time: '11:15',
        alert: 'A teammate parallelised the nightly parse step with eight threads and a pull request says "should be 8 times faster". The job still takes 14 minutes, and on the server one core is at 100 percent while the other three are idle.',
        clues: ['The parse step is pure Python: splitting strings, converting numbers, building dicts.', 'The server runs the regular Python build.', 'The step reads local files, so it does not wait for a network.'],
        opts: [
          { t: 'Check whether the step waits or computes, and try a process pool or a column based parse', fb: '' },
          { t: 'Raise the number of threads to 64', fb: 'More threads share the same GIL. Nothing gets faster, and memory goes up.' },
          { t: 'Add asyncio around the parse', fb: 'Asyncio overlaps waits. Computing code in a coroutine still runs on one thread.' },
          { t: 'Move it to a bigger server', fb: 'One core is the limit. A bigger machine has the same single-core speed for this code.' }
        ],
        best: 0, why: 'In the recording, eight threads took ' + RC['8 threads'].toFixed(2) + ' s against ' + RC['one after another'].toFixed(2) + ' s one after another for computing jobs, and four processes took ' + RC['4 processes'].toFixed(2) + ' s. One core at 100 percent with the others idle is the sign of the GIL on computing work.',
        checks: [
          ['Look at the CPU use of the job', 'One core near 100 percent and the others idle: computing work on one thread at a time.'],
          ['Profile the step, as in this mission', 'The hot spot may be one function that a column operation or a set can replace.'],
          ['Try a process pool on a copy of the data, and measure', 'Each worker needs its own memory and the arguments are copied, so use batches that are large enough.'],
          ['Keep the number of processes at the number of cores', 'More processes than cores only add memory.'],
          ['Measure again, and add the number to the pull request', 'A speed-up claim needs a before and an after.']
        ],
        tell: 'The parse step is computing work in pure Python, and the server runs the regular Python build, so eight threads took turns on one core because of the GIL. In a test, eight threads were no faster than one, and four processes were about 2.7 times faster. I replaced the thread pool with a process pool of four, working on batches of files, and added the before and after timings to the pull request.',
        prevent: ['Ask what a step waits on before choosing threads or processes.', 'A speed-up needs a measurement before and after, on real data.', 'Profile before changing code.', 'Check CPU use per core while the job runs.']
      }),

      B.qa({
        id: 'qa-profile', t: 1, tag: 'Speed', secs: 60,
        q: 'A job is too slow. What do you do first?',
        pts: ['Measure the whole job on real data', 'Profile to find the hot spot', 'Change one thing, then measure again', 'Check the plan or the data size before the code'],
        short: 'I measure the whole job on realistic data first, so that I have a number and a goal. Then I profile it, with `cProfile` for Python code or the plan of the query for SQL, to find the hot spot. It is usually one or two functions. In a recording, one function that tested `store in known` on a list of 5,000 held nearly all the time, and making `known` a set took the report from about half a second to a few milliseconds. I change one thing, run the same measurement again, and keep the change only if the number moved and the tests still pass.',
        fu: [['What if the profile is flat?', 'Then the time is spread out, and the gain is in a different algorithm, a column operation or less data, not in one line.'], ['Do you optimise everything?', 'No. Only what the measurement says matters, and only until the goal is met.']],
        trap: 'Guessing the slow part and rewriting it.',
        real: 'Tell about a speed-up that you measured.'
      }),

      B.qa({
        id: 'qa-gil', t: 1, tag: 'Speed', secs: 60,
        q: 'What is the GIL, and what does it mean for threads?',
        pts: ['Global interpreter lock: one thread runs Python code at a time', 'Released while a thread waits', 'So threads help waiting work, not computing work', 'Processes have a GIL each'],
        short: 'The GIL is a lock that lets only one thread run Python bytecode at a time in the regular CPython build. It is released while a thread waits for the network or the disk, so threads overlap waiting work: in a recording eight 0.25 second waits finished in about 0.25 seconds. For computing work, threads take turns on one core: eight threads took 1.39 seconds against 1.22 seconds one after another. Processes each have their own interpreter and GIL, so four processes took 0.41 seconds. Python 3.14 also ships a free-threaded build, 3.14t, without the GIL, where threads did speed up the computing jobs.',
        fu: [['Does numpy release the GIL?', 'Many numpy and pandas operations release it while they run in compiled code, so threads can help there. Check by measuring.'], ['Why not always use processes?', 'They cost memory and start-up time, and arguments and results are copied between them.']],
        trap: 'Saying "Python cannot do parallel work". Processes, the free-threaded build and compiled libraries all can.',
        real: 'Tell about a job where you chose threads or processes, and what you measured.'
      }),

      B.qa({
        id: 'qa-threadsprocs', t: 1, tag: 'Speed', secs: 60,
        q: 'Threads, processes or asyncio: how do you choose?',
        pts: ['Waiting or computing?', 'Threads or asyncio for waits', 'Processes or columns for computing', 'Bound the workers, and watch memory and rate limits'],
        short: 'I ask what the work does most of the time. Waiting on a network or a database: threads or asyncio, because the waits overlap, and a bulk call if the API has one. Computing in pure Python: processes, or better a column operation, because threads share one GIL on the regular build. I bound the number of workers to what the partner\'s rate limit and my memory allow, I keep errors per item so that one failure does not stop the rest, and I measure. In a recording both threads and asyncio finished eight waits in the time of one, and only processes sped up the computing jobs.',
        fu: [['Threads or asyncio for waits?', 'Asyncio scales to thousands of waits with little memory, and it needs async libraries. Threads work with normal libraries, and a few dozen is fine.'], ['How many workers?', 'For waits, as many as the service allows. For computing, about the number of cores.']],
        trap: 'Adding workers without a measurement and without a limit.',
        real: 'Describe how you chose the number of workers.'
      }),

      B.qa({
        id: 'qa-async', t: 2, tag: 'Speed', secs: 60,
        q: 'When is asyncio the right choice?',
        pts: ['Many concurrent waits, with little CPU work', 'It needs async libraries end to end', 'One thread, cooperative switching at await', 'A blocking call blocks every task'],
        short: 'When there are many waits at the same time and little computing: thousands of API calls or sockets. Asyncio runs one thread and switches between tasks at each `await`, so it is cheap in memory. The cost is that every library in the path must be async, and a blocking call, such as a normal `requests.get` or a long loop, stops all the tasks. In a recording, eight 0.25 second waits with `asyncio.gather` finished in about 0.25 seconds, like eight threads. For a few dozen calls with a normal library, a thread pool is simpler.',
        fu: [['How do you run blocking code in asyncio?', 'Hand it to a thread with `asyncio.to_thread`, or to a process pool for computing.'], ['How do you limit the concurrency?', 'A semaphore, so that you do not open 5,000 connections at once.']],
        trap: 'Using `time.sleep` or a blocking client inside a coroutine.',
        real: 'Tell where you used asyncio, and what library it needed.'
      }),

      B.qa({
        id: 'qa-free', t: 3, tag: 'Speed', secs: 60,
        q: 'What is the free-threaded build of Python 3.14, and should you use it?',
        pts: ['A separate build with no GIL (3.14t)', 'Threads can use several cores', 'Slower single-thread work, and library support varies', 'Test it, and measure on your workload'],
        short: 'It is a separate build of CPython, installed as `python3.14t`, with the GIL removed, so threads can run Python code on several cores at once. In a recording `sys._is_gil_enabled()` returned False, and eight threads ran the computing jobs faster than one after another, which they did not on the regular build. The costs are a slower single-thread speed, and libraries that must be marked as safe for it: loading one that is not can switch the GIL back on. I would test it on a real workload, measure, and keep an eye on the libraries I depend on, before I used it in production.',
        fu: [['How do you check the build?', '`sys._is_gil_enabled()` tells you whether the GIL is on in the running interpreter.'], ['Will it replace processes?', 'For some workloads, yes. Processes still isolate memory and crashes.']],
        trap: 'Assuming that every package works on it.',
        real: 'Say whether you have tried it, and on what.'
      }),

      B.qa({
        id: 'qa-pandasmem', t: 2, tag: 'Speed', secs: 60,
        q: 'A pandas job runs out of memory. What do you try?',
        pts: ['Read only the columns you need', 'Smaller types and category', 'Process in chunks or use a streaming engine', 'Check what the table really holds'],
        short: 'I read only the columns I need, then I check the real memory with `memory_usage(deep=True)`. Smaller types help a lot: in a recording a table of one million rows went from 52.9 MB to 11.0 MB with 32-bit and 8-bit integers and `category` for text with few different values, and the values stayed the same. I keep money in integer cents, not in float32. If that is not enough I process the data in chunks, or use an engine that streams from a file, such as DuckDB or Polars lazy. A bigger machine is the last step, and not the first.',
        fu: [['What about a join that blows up the memory?', 'Check that the key is unique (mission 9). A multiplied join is a common reason.'], ['Why not float32 for money?', 'A float cannot hold most decimal fractions exactly (mission 6).']],
        trap: 'Adding memory before looking at the types and the columns.',
        real: 'Tell about the largest memory saving that you made.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Speed Tuner', color: '#FED7AA',
        pts: [
          '**Measure, profile, change one thing, measure again.** One function held nearly all the time, and a **set** instead of a list made it about **' + Math.round(PR.list_seconds / PR.set_seconds) + ' times** faster.',
          'A column operation took **' + f1(NUMPY) + ' ms** against **' + f1(LOOP) + ' ms** for a Python loop over a million numbers.',
          '**Waiting** work: threads and asyncio overlapped eight waits into about **' + RW['8 threads'].toFixed(2) + ' s**. **Computing** work: 8 threads gave no gain on the regular build, and **processes** did.',
          'The **GIL** lets one thread run Python at a time. The free-threaded **3.14t** build has none, and threads sped up the computing jobs there.',
          'Smaller types cut a table from **' + TOT.before_mb.toFixed(1) + ' MB** to **' + TOT.after_mb.toFixed(1) + ' MB**. Money stays in integer cents.'
        ],
        lines: [
          'I measure and profile before I change code, and I measure again.',
          'I can say whether a step waits or computes, and pick threads, asyncio or processes for it.',
          'I know what the GIL is, and what the free-threaded build changes.'
        ]
      })
    ]
  });
})();
