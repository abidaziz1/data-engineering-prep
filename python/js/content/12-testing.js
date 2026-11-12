/* Mission 12: tests and quality. Real runs of pytest, coverage, a mutation experiment, Hypothesis, logging and ruff. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ORF = G.file('m12/orders.py'), TWF = G.file('m12/test_weak.py'), TSF = G.file('m12/test_strong.py'), RMF = G.file('m12/run_mutants.py'), HDF = G.file('m12/hypothesis_demo.py'), BSF = G.file('m12/bad_style.py'), LGF = G.file('m12/logging_basics.py'), PAF = G.file('m12/parse_amount.py');
  var PW = G.text('m12/pytest_weak'), PF = G.text('m12/pytest_failing'), PS = G.text('m12/pytest_strong'), CW = G.text('m12/coverage_weak'), CS = G.text('m12/coverage_strong'), HYT = G.text('m12/hypothesis'), RFT = G.text('m12/ruff');
  var RMT = G.text('m12/run_mutants.py'), LGT = G.text('m12/logging_basics.py'), PAT = G.text('m12/parse_amount.py');
  var MU = G.counts('m12.mutants');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }

  var WK = MU.suites['test_weak.py'], ST = MU.suites['test_strong.py'], CWK = MU.coverage.weak, CST = MU.coverage.strong;
  G.expect(/^4 passed in [\d.]+s$/m.test(PW) && /AssertionError: assert 1250 == 125/.test(PF) && /where 1250 = to_cents\('12\.50'\)/.test(PF) && /^1 failed in [\d.]+s$/m.test(PF) && /test_failing\.py:5: AssertionError/.test(PF), 'pytest passed four tests and showed what a failing assert returned');
  G.expect(CWK.percent === 100 && CWK.missed === 0 && CWK.tests === 4 && CST.percent === 100 && CST.tests === 18 && /^18 passed in [\d.]+s$/m.test(PS), 'both suites cover every line, with 4 and 18 test cases');
  G.expect(WK.caught === 4 && WK.total === 7 && WK.survived.length === 3 && ST.caught === 7 && ST.survived.length === 0 && WK.survived.indexOf('is_large: >= becomes >') >= 0 && WK.survived.indexOf('discount: qty >= 10 becomes > 10') >= 0 && WK.survived.indexOf('discount: the cap 5,000 becomes 50,000') >= 0, 'the weak suite lets three of seven changes through and the strong suite catches all seven');
  G.expect(/Failing test case: test_dedupe_keeps_the_first_seen_order\([\s\S]*?xs=\[0, -1\],/.test(HYT) && /assert \[-1, 0\] == \[0, -1\]/.test(HYT) && /1 failed, 1 passed in/.test(HYT), 'Hypothesis found the example [0, -1] and the second property passed');
  G.expect(/"message": "extract finished", "run_id": "2026-03-14", "rows": 1200, "seconds": 4/.test(LGT) && /"level": "ERROR".*"error": "ValueError: invalid literal for int\(\) with base 10: '12,50'"/.test(LGT) && !/not shown/.test(LGT), 'three log lines as JSON, and the debug line was not shown');
  G.expect(/bad_style\.py:1:8: F401 \[\*\] `os` imported but unused/.test(RFT) && /bad_style\.py:5:21: B006 Do not use mutable data structures for argument defaults/.test(RFT) && /bad_style\.py:7:17: E711 Comparison to `None` should be `cond is None`/.test(RFT) && /bad_style\.py:11:9: E722 Do not use bare `except`/.test(RFT) && /Found 7 errors\./.test(RFT), 'ruff found seven problems in the small file');
  G.expect(/tests passed$/.test(PAT) && /amounts refused: 7 of 7/.test(PAT), 'the coding round passes');

  var BUG_DEFAULT = ['def load(rows, seen=[]):', '    for r in rows:', '        seen.append(int(r))', '    return seen'].join('\n');
  var BUG_DEFAULT_FIX = ['def load(rows, seen=None):', '    if seen is None:', '        seen = []', '    for r in rows:', '        seen.append(int(r))', '    return seen'].join('\n');
  var BUG_PRINT = ['try:', '    load_day(day)', 'except Exception as err:', '    print("load failed", err)'].join('\n');
  var BUG_PRINT_FIX = ['try:', '    load_day(day)', 'except Exception:', '    log.exception("load failed", extra={"fields": {"day": day}})', '    raise'].join('\n');
  var PAROWS = PAT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Tests and quality', short: 'Tests', blurb: 'pytest, mutants, property tests, logs and lint', minutes: 36,
    focus: ['qual', 'mon'],
    goals: [
      'Write **pytest** tests with plain asserts, `parametrize` and `pytest.raises`, and read a failure.',
      'Explain why **100 percent coverage** does not mean the tests are good, with a **mutation** experiment.',
      'Write a **property test** with Hypothesis and read the example that it finds.',
      'Log with a **level, a name and fields**, and keep the traceback of an error.',
      'Run **ruff** and read its rule codes.'
    ],
    say: 'Mission 12 is about trust. A pipeline that nobody tests is a guess, and a pipeline with weak tests is a guess that feels safe. You will write pytest tests, run them under coverage, and then change the code on purpose, seven times, to see whether the tests notice. They run on real code with pytest ' + G.meta('pytest') + ', Hypothesis ' + G.meta('hypothesis') + ' and ruff ' + G.meta('ruff') + '.',
    scenes: [
      B.talk({
        id: 'm12-talk', t: 1, src: 'docs', title: 'What tests are for in a data pipeline',
        say: 'Press Next for four layers, from the smallest to the largest.',
        items: [
          ['Unit tests for the transforms', 'A function that cleans a store name or turns "12.50" into cents takes input and returns output. It is easy to test, with the edge cases that real data has.', 'Small, fast, many.'],
          ['A small end-to-end test', 'Run the whole job on a fixture of a dozen rows, in a temporary folder or an in-memory database, and compare the result with the expected table.', 'The pieces fit together.'],
          ['Checks in the run', 'Row counts, bad-row limits and contracts check the real data every night. A test cannot see tomorrow\'s file.', 'Tests check code. Checks check data.'],
          ['CI on every change', 'The tests, the linter and the type checker run on every pull request, so that a change that breaks them does not merge.', 'Every change, automatically.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm12-orders', t: 1, src: 'rec', title: 'The code under test', file: 'orders.py', lang: 'python', code: ORF,
        steps: [
          { say: 'Four small functions that a nightly job uses. The next screens test them. The tests and their output are real.', lines: null },
          { say: '`to_cents` turns text into whole cents with `Decimal`, and refuses text that is not an amount or has more than two decimals.', lines: blk(ORF, 'to_cents') },
          { say: '`is_large`: an order is large when it **reaches** the limit, so exactly 10,000 counts.', lines: blk(ORF, 'is_large') },
          { say: '`clean_store` trims and capitalises a name, and turns an empty name into `None`.', lines: blk(ORF, 'clean_store') },
          { say: '`discount_cents`: 10 percent off from 10 items, never more than 5,000 cents.', lines: blk(ORF, 'discount_cents') }
        ]
      }),

      B.code({
        id: 'm12-weak', t: 1, src: 'rec', title: 'A first set of tests', file: 'test_weak.py', lang: 'python', code: TWF,
        steps: [
          { say: 'Four tests, one for each function. A test is a function whose name starts with `test`, and whose job is to `assert`. The output is on the next screen.', lines: null },
          { say: 'A plain `assert` with `==`. `pytest.raises` says that an error is expected, and fails the test if there is none.', lines: blk(TWF, 'test_to_cents') },
          { say: 'One large order and one small order.', lines: blk(TWF, 'test_is_large') },
          { say: 'A normal name, and an empty one.', lines: blk(TWF, 'test_clean_store') },
          { say: 'An order with 12 items, and one with 2.', lines: blk(TWF, 'test_discount') }
        ]
      }),

      B.term({
        id: 'm12-weak-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of pytest ' + G.meta('pytest') + '. Each dot is one test that passed.',
        lines: function () { return G.plain(PW); },
        after: 'Four dots, **4 passed**. pytest found the files and functions by their names, ran each one and counted. The tests pass. The next screens ask how much that means.',
        afterKind: 'tip',
        doneSay: 'Green is where the questions start.'
      }),

      B.term({
        id: 'm12-fail-run', t: 1, src: 'rec', title: 'What a failing test looks like',
        say: 'A test with a wrong expectation: the price "12.50" should be 125 cents. This is the real output of pytest.',
        lines: function () { return G.plain(PF); },
        after: 'pytest rewrites the `assert` so that it can show the values: `assert 1250 == 125`, and **where** the left side came from: `1250 = to_cents(\'12.50\')`. The line `test_failing.py:5` says where. A failure message that names the values is half of a fix.',
        afterKind: 'tip',
        doneSay: 'A good test fails with the values in the message.'
      }),

      B.quiz({
        id: 'm12-q1', t: 1, src: 'rec',
        q: 'In the failing test, pytest printed `where 1250 = to_cents(\'12.50\')`. What does that line tell you?',
        opts: [
          { t: 'The function returned 1250, and the test expected 125', fb: '' },
          { t: 'The function returned 125, and the test expected 1250', fb: 'The assert is `to_cents("12.50") == 125`: the left side is the result, 1250.' },
          { t: 'The test is right and the function is wrong', fb: 'The output cannot say which side is wrong. Here, 12.50 is 1250 cents, so the test expectation was wrong.' },
          { t: 'The input was 1250', fb: 'The input was the text "12.50".' }
        ],
        ok: 0, why: 'The left side of the `==` was the function\'s result, 1250, and the right side was the expected 125. 12.50 is 1250 cents, so this time the test, not the function, is wrong. pytest shows the values, and a person decides.'
      }),

      B.term({
        id: 'm12-cov-run', t: 1, src: 'rec', title: 'Coverage of the first tests',
        say: 'The same four tests, run under pytest-cov ' + G.meta('pytest-cov') + '. The column "Miss" counts the lines of `orders.py` that no test ran.',
        lines: function () { return G.plain(CW); },
        after: '**100 percent coverage**: all ' + CWK.statements + ' lines of `orders.py` ran at least once, and none was missed. A coverage number of 100 sounds like "fully tested". The next experiment checks that.',
        afterKind: 'tip',
        doneSay: 'Coverage says which lines ran, not what was checked.'
      }),

      B.code({
        id: 'm12-mut', t: 1, src: 'rec', title: 'Do the tests notice a change?', file: 'run_mutants.py', lang: 'python', code: RMF,
        steps: [
          { say: 'A tiny version of **mutation testing**. It changes the code in seven small ways, runs the tests after each change, and counts how many changes the tests notice. The output is real.', lines: null },
          { say: 'Seven mutants. Each one is a name, the text to find in `orders.py`, and the text to put in its place: a `>=` that becomes `>`, a limit that grows, a scale that is wrong.', lines: G.span(RMF, /^MUTANTS = \[/, /^\]/) },
          { say: '`passes` writes the changed code to a temporary folder, runs pytest on one suite, and returns whether all tests passed. A mutant that passes **survived**.', lines: blk(RMF, 'passes') },
          { say: 'For each suite: first check that the tests pass on the real code. Then run the seven mutants and list the survivors.', lines: [G.at(RMF, /^here = /), last(RMF)] }
        ]
      }),

      B.term({
        id: 'm12-mut-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `run_mutants.py`, with the first set of tests and a stronger one that is shown next.',
        lines: function () { return G.plain(RMT, { cmd: 'python run_mutants.py' }); },
        after: 'The first tests caught **' + WK.caught + ' of ' + WK.total + '** changes. Three survived, and all three are boundaries: `>=` that became `>`, the 10th item that no longer gets the discount, and a cap that grew tenfold. The same **100 percent coverage** and the same green tests, with three bugs that nothing would notice.',
        afterKind: 'warn',
        doneSay: 'Coverage found no problem, because it cannot see boundaries.'
      }),

      B.widget({ id: 'm12-lab-mut', kind: 'mutants', t: 1, src: 'rec', title: 'Lab: do the tests notice a change?' }),

      B.code({
        id: 'm12-strong', t: 1, src: 'rec', title: 'The same tests, as tables of facts', file: 'test_strong.py', lang: 'python', code: TSF,
        steps: [
          { say: 'The stronger tests use `pytest.mark.parametrize`: one test function and a table of cases. Each row runs as its own test. The output is real.', lines: null },
          { say: 'A table of texts and the cents that they must give.', lines: G.span(TSF, /^@pytest\.mark\.parametrize\("text, cents"/, /assert to_cents\(text\) == cents/) },
          { say: 'A table of texts that must be refused, including "12,50" and the empty text.', lines: G.span(TSF, /^@pytest\.mark\.parametrize\("text", \[/, /^        to_cents\(text\)/) },
          { say: 'The **boundary** of `is_large`: exactly 10,000 is large, and 9,999 is not. This case kills the `>=` to `>` mutant.', lines: G.span(TSF, /^@pytest\.mark\.parametrize\("cents, large"/, /assert is_large\(cents\) is large/) },
          { say: 'The edges of the discount: exactly 10 items, 9 items, and a big order that reaches the cap.', lines: G.span(TSF, /total, qty, discount/, /assert discount_cents\(total, qty\) == discount/) }
        ]
      }),

      B.term({
        id: 'm12-strong-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of pytest on the stronger tests.',
        lines: function () { return G.plain(PS); },
        after: '**18 tests passed**, from five test functions. Their coverage is the same **100 percent**, and the mutation run caught **' + ST.caught + ' of ' + ST.total + '** changes. The difference is in the **cases** that were chosen: the boundaries.',
        afterKind: 'tip',
        doneSay: 'Same coverage. Better facts.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1, src: 'rec',
        q: 'The first four tests had 100 percent line coverage. How many of the seven changes to the code did they catch?',
        opts: [
          { t: '4 of 7. Coverage counts the lines that ran, not the facts that were checked.', fb: '' },
          { t: '7 of 7, because every line ran', fb: 'Three changes survived: the boundary of `is_large`, the 10th item and the cap.' },
          { t: '0 of 7, because coverage is meaningless', fb: 'Four changes were caught. Coverage is a useful floor and a poor ceiling.' },
          { t: '2 of 7', fb: 'The recording shows 4 of 7 caught.' }
        ],
        ok: 0, why: 'A line can run without its result being checked at the edge of its condition. Coverage finds code that no test runs, and it cannot find a test that is too gentle. The stronger tests added cases at the boundaries and caught all seven.'
      }),

      B.quiz({
        id: 'm12-q3', t: 2, src: 'rec',
        q: 'The mutant "qty >= 10 becomes > 10" survived the first tests, which used 12 items and 2 items. Which test case in the stronger suite catches it?',
        opts: [
          { t: '`(10_000, 10, 1000)`: exactly 10 items must get the discount', fb: '' },
          { t: '`(10_000, 9, 0)`: 9 items get no discount', fb: 'That passes with both `>= 10` and `> 10`.' },
          { t: '`(1, 10, 0)`: a tiny order with 10 items', fb: 'With a total of 1 the discount is 0 either way, so it cannot tell the two apart.' },
          { t: 'No case can catch it', fb: 'A case with exactly 10 items and a total that earns a discount does.' }
        ],
        ok: 0, why: 'The two versions differ only when `qty` is exactly 10. A test must have exactly that input, and a total big enough that the discount is not zero. 12 and 2 sit far from the edge, so they pass both versions.'
      }),

      B.code({
        id: 'm12-hyp', t: 2, src: 'rec', title: 'A property test finds its own example', file: 'hypothesis_demo.py', lang: 'python', code: HDF,
        steps: [
          { say: 'Instead of writing examples, a **property test** says what must always be true, and Hypothesis (' + G.meta('hypothesis') + ') looks for an input that breaks it. The output is real.', lines: null },
          { say: 'A function with a bug: it should remove duplicates and keep the first-seen order, and it sorts.', lines: blk(HDF, 'dedupe_keep_order') },
          { say: 'The property: for **any** list of small integers, the result equals the items in the order they first appeared. `@given` generates the lists. `derandomize=True` makes the run repeatable.', lines: G.span(HDF, /^@settings/, /assert dedupe_keep_order/) },
          { say: 'A second property for `to_cents`: for any whole number of cents, writing it as a two-decimal text and reading it back gives the same number.', lines: [G.at(HDF, /^@given\(st\.integers/) - 1, last(HDF)] }
        ]
      }),

      B.term({
        id: 'm12-hyp-run', t: 2, src: 'rec', title: 'Run it',
        say: 'The real output of pytest on the property tests.',
        lines: function () { return G.plain(HYT); },
        after: 'Hypothesis found a failing input and **shrank** it to the smallest one: `xs=[0, -1]`. The function returned `[-1, 0]` and the first-seen order is `[0, -1]`. The second property, with 200 generated amounts, **passed**. A property test finds the case that nobody thought to write.',
        afterKind: 'tip',
        doneSay: 'Say what is always true. Let a tool look for the exception.'
      }),

      B.quiz({
        id: 'm12-q4', t: 2, src: 'rec',
        q: 'Hypothesis reported `xs=[0, -1]` for the sorting bug. Why is the example so small?',
        opts: [
          { t: 'It shrinks a failing input to the smallest one that still fails, so that the bug is easy to read', fb: '' },
          { t: 'It only tries lists with two items', fb: 'It tries lists of many sizes. The first failure was probably bigger, and it was shrunk.' },
          { t: 'The function only fails on this list', fb: 'Any list where a later number is smaller than an earlier one fails.' },
          { t: 'It picks examples by hand', fb: 'The examples are generated, and then shrunk.' }
        ],
        ok: 0, why: 'A failing list may start with a dozen numbers. Hypothesis removes and simplifies items while the test still fails, and ends at a minimal example, here two numbers in the wrong order. That is the bug, stripped of noise.'
      }),

      B.code({
        id: 'm12-log', t: 1, src: 'rec', title: 'Logs that you can search', file: 'logging_basics.py', lang: 'python', code: LGF,
        steps: [
          { say: 'A logger with a name, levels, extra fields and a JSON format, so that a log system can filter by field. The output is real.', lines: null },
          { say: 'A formatter turns each record into one JSON line: the level, the logger name, the message and the fields. An exception adds the last line of its traceback.', lines: G.span(LGF, /^class JsonFormatter/, /return json\.dumps/) },
          { say: 'The logger is named for the part of the job. The level INFO hides `debug` lines.', lines: G.span(LGF, /^handler = /, /^log\.propagate/) },
          { say: 'The calls: a debug line that is hidden, an info line with row counts, a warning, and `log.exception` inside an `except`, which records the traceback.', lines: [G.at(LGF, /^run = /), last(LGF)] }
        ]
      }),

      B.term({
        id: 'm12-log-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `logging_basics.py`. A real system adds a timestamp from its handler.',
        lines: function () { return G.plain(LGT, { cmd: 'python logging_basics.py' }); },
        after: 'Three lines, and the `debug` line is **not** there. Each is JSON with the same `run_id`, so a search for one night finds every line. The error line has the last line of the traceback in `error`. Compare it with a `print`: it has no level, no name and no fields.',
        afterKind: 'tip',
        doneSay: 'Log fields, not sentences.'
      }),

      B.bug({
        id: 'm12-bug1', t: 1, src: 'rec', q: 'A job catches an error and prints it. Last night the load failed, and the log only says "load failed invalid literal for int()". Nobody can tell which line failed. Click the line that throws the detail away.',
        file: 'run.py', lang: 'python', code: BUG_PRINT, bad: [4],
        hint: 'What does the `print` keep, and what does it lose?',
        why: '`print` of the exception keeps only its message. The traceback, which says where it happened, is gone, and so are the level, the logger name and the run id. In the recording `log.exception` wrote the error with its fields. Log inside the `except`, then re-raise, so that the run still fails.',
        fix: BUG_PRINT_FIX,
        cheer: 'Log with the traceback, then raise.'
      }),

      B.code({
        id: 'm12-ruff', t: 1, src: 'rec', title: 'A linter reads the code for you', file: 'bad_style.py', lang: 'python', code: BSF,
        steps: [
          { say: 'A short file with the usual mistakes. ruff (' + G.meta('ruff') + ') reads it, never runs it, and prints a rule code for each problem. The output is real.', lines: null },
          { say: 'Two imports on one line, two of them unused, and a star import that hides where names come from.', lines: G.span(BSF, /^import os, sys/, /^from decimal import \*/) },
          { say: 'A **mutable default argument**: the list is made once, and every call shares it (mission 3).', lines: G.span(BSF, /^def load/, /^def load/) },
          { say: '`== None` should be `is None`.', lines: G.span(BSF, /if r == None/, /if r == None/) },
          { say: 'A bare `except:` catches everything, including a `KeyboardInterrupt`, and `pass` throws it away (mission 7).', lines: G.span(BSF, /^        try:/, /^            pass/) }
        ]
      }),

      B.term({
        id: 'm12-ruff-run', t: 1, src: 'rec', title: 'Run ruff',
        say: 'The real output of ruff ' + G.meta('ruff') + ', with the rule sets E (pycodestyle), F (pyflakes) and B (bugbear).',
        lines: function () { return G.plain(RFT); },
        after: 'Seven problems, each with the **line, the column and a rule code**. `F401` is an unused import, `B006` is the mutable default, `E711` the comparison to `None`, and `E722` the bare `except`. Three are marked `[*]`: ruff can fix them for you with `--fix`. Run it in CI, and a whole class of review comments goes away.',
        afterKind: 'tip',
        doneSay: 'Let a tool find the boring mistakes.'
      }),

      B.quiz({
        id: 'm12-q5', t: 2, src: 'rec',
        q: 'Which rule code did ruff report for `def load(rows, seen=[]):`, and what is the bug?',
        opts: [
          { t: 'B006: the default list is created once and shared by all calls', fb: '' },
          { t: 'E711: a comparison to None', fb: 'That is `== None`, on another line.' },
          { t: 'F401: an unused import', fb: 'That is for `os` and `sys`.' },
          { t: 'E722: a bare except', fb: 'That is the `except:` further down.' }
        ],
        ok: 0, why: 'A default value is evaluated once, when the function is defined. A list default is then shared by every call that does not pass its own, so one call\'s items show up in the next. Use `None` and make the list inside the function.'
      }),

      B.bug({
        id: 'm12-bug2', t: 2, src: 'rec', q: 'ruff flagged this function with B006. Run it twice with no second argument and the second result contains the first run\'s numbers. Click the line.',
        file: 'load.py', lang: 'python', code: BUG_DEFAULT, bad: [1],
        hint: 'When is the default value created?',
        why: 'The default `[]` is created once, when the `def` line runs. Both calls use that same list, so the second call appends to the first one\'s items. Default to `None` and create a new list inside the function.',
        fix: BUG_DEFAULT_FIX,
        cheer: 'A new list for each call.'
      }),

      B.cmp({
        id: 'm12-cmp', t: 1, src: 'docs', title: 'What each tool catches',
        say: 'No single tool finds everything. Press Next to see what each one is good at.',
        cols: ['Tool', 'What it checks', 'What it misses'],
        hl: 0,
        rows: [
          ['pytest', 'That the code gives the expected output for the cases that you wrote.', 'Cases that you did not write.'],
          ['Coverage', 'Which lines ran. It finds code that no test touches.', 'Whether the result was checked, and the edges of a condition.'],
          ['Mutation testing', 'Whether a change to the code makes a test fail. It finds tests that are too gentle.', 'It is slow: it runs the suite once for every change.'],
          ['Hypothesis', 'A rule that must hold for generated inputs, and the smallest input that breaks it.', 'A rule that you did not think to state.'],
          ['ruff and mypy', 'Style, unused names, risky patterns and type mismatches, without running the code.', 'What the data contains.'],
          ['Checks in the run', 'The real data: row counts, bad-row limits, contracts, freshness.', 'A bug in a code path that tonight\'s data does not reach.']
        ],
        steps: [
          { upto: 3, say: 'Tests, coverage and mutants check the code from three angles.' },
          { upto: 6, say: 'Property tests, linters and run-time checks cover what the first three cannot.' }
        ],
        pick: 'Use the **cheap ones everywhere** (pytest, ruff, mypy in CI) and the **expensive ones where a bug costs money** (mutation tests on the pricing code).'
      }),

      B.decide({
        id: 'm12-decide', t: 2, src: 'rec', title: 'Decision: how much testing does the orders pipeline need?',
        scenario: 'The nightly pipeline cleans orders, applies discounts and loads a revenue table. A bug in the discount costs money. In the recording, four tests with **100 percent coverage** caught **' + WK.caught + ' of ' + WK.total + '** changes, and tests with boundary cases caught all ' + ST.total + '.',
        opts: [
          { t: 'Aim for 100 percent line coverage and stop', d: 'A clear, measurable target.', lose: 'The first tests had 100 percent and let three boundary bugs through.' },
          { t: 'Unit tests with boundary cases for each transform, one small end-to-end test, checks in the run, and everything in CI', d: 'Each layer catches what the others miss, and the pricing code gets extra care.', lose: '' },
          { t: 'Only end-to-end runs on real data', d: 'Realistic.', lose: 'Slow, hard to debug, and a failure does not say which function is wrong.' },
          { t: 'No tests, because the run-time checks will tell us', d: 'No test code to maintain.', lose: 'The checks see bad data, not a wrong discount. A boundary bug produces plausible numbers.' }
        ],
        pick: 1,
        why: 'Coverage is a floor, and the tests have to check the edges. Unit tests find a wrong function fast, one end-to-end test finds a wrong wiring, and the run-time checks watch the data. CI makes all of it automatic.',
        when: 'For the pricing and money code, add a mutation run to the checks before a release. For a throw-away analysis, a few asserts are enough.'
      }),

      B.challenge({
        id: 'm12-ch1', t: 1, lang: 'python', file: 'parse_amount.py',
        q: '**Coding round: read a money amount.** Write `parse_amount(text)`. Return a `Decimal` with two places. Accept spaces around the text, a thousands comma in the right places (`"1,250.00"`), and 0 to 2 decimals. Raise `ValueError` for anything else: `"12,50"`, `"1.234"`, `"abc"`, `""`, `"1,25.0"`, `",100"` and `"1,2345"`.',
        data: [{ name: 'what the tests check', cols: ['text', 'result'], rows: [['12.50', 'Decimal 12.50'], [' 7 ', 'Decimal 7.00'], ['1,250.00', 'Decimal 1250.00'], ['999,999.99', 'Decimal 999999.99'], ['12,50', 'ValueError'], ['1.234', 'ValueError'], ['1,25.0', 'ValueError']] }],
        starter: 'from decimal import Decimal, InvalidOperation\n\ndef parse_amount(text):\n    ...',
        hints: ['Split at the dot first: the part after it may have at most two digits.', 'Split the whole part at commas. The first group has 1 to 3 digits and every other group has exactly 3.', 'Join the groups, build a `Decimal` from text, and `quantize(Decimal("0.01"))`. Turn `InvalidOperation` into `ValueError`.'],
        sol: fn(PAF, 'parse_amount'),
        res: { msg: 'tests passed in the recording', cols: ['check', 'result'], rows: PAROWS },
        expl: ['The comma rule is the point: "1,250.00" is a thousands separator and "12,50" is a decimal comma from another locale. Reading the second as 1250 would be a silent error of 100 times, so it is refused.', 'The result is a `Decimal` built from text, never from a float (mission 6).', 'A table of good and bad inputs is the natural test: each line is one fact, and a new bug report adds one line.'],
        cx: 'O(length of the text).'
      }),

      B.incident({
        id: 'm12-inc', t: 2, src: 'rec', title: 'Incident: green tests, and orders of exactly 10 items get no discount', time: '10:30',
        alert: 'Customers with exactly 10 items in an order complain that the discount did not apply, for the last six days. The tests are green and the coverage report says 100 percent. A refactor last week touched `discount_cents`.',
        clues: ['The tests for `discount_cents` use 12 items and 2 items.', 'The diff of the refactor changed one comparison in the function.', 'Orders with 9 or with 11 items are fine.'],
        opts: [
          { t: 'Look at the comparison on the quantity, and add a test for exactly 10 items', fb: '' },
          { t: 'Raise the coverage target above 100 percent', fb: 'There is no such target. The lines already ran.' },
          { t: 'Add more tests with random quantities', fb: 'Random quantities rarely hit exactly 10. A boundary needs a case on purpose, or a property test.' },
          { t: 'Remove the discount rule from the tests', fb: 'It hides the problem.' }
        ],
        best: 0, why: 'In the recording, the change "qty >= 10 becomes > 10" survived tests that used 12 and 2, with 100 percent coverage. Exactly 10 is the only input that tells the two apart. The cure is a test case at the edge, and a mutation run on code that costs money.',
        checks: [
          ['Read the diff of the refactor', 'One `>=` became `>` in the quantity check.'],
          ['Run the function with 9, 10 and 11 items', 'Only 10 gives 0, so the boundary is wrong.'],
          ['Fix the comparison, and add the cases 9, 10 and 11 to the parametrized test', 'The table of facts now includes the edge.'],
          ['Run the mutation check on `discount_cents`', 'The change must be caught now.'],
          ['Find the orders of the last six days that should have had a discount', 'Correct them through the normal, idempotent load, and tell the business.']
        ],
        tell: 'Orders with exactly 10 items got no discount for six days. A refactor changed `>=` to `>` in the quantity check, and the tests used 12 and 2 items, so they passed with 100 percent coverage. I fixed the comparison, added test cases for 9, 10 and 11 items, and ran a mutation check, which now catches the change. I recalculated the six days through the idempotent load and told the business which orders changed.',
        prevent: ['Test the boundary of every limit, with the value on each side.', 'Use a mutation run on money code, because coverage does not see boundaries.', 'A property test for rules that hold for all inputs.', 'A reviewer looks at every changed comparison in a refactor.']
      }),

      B.qa({
        id: 'qa-testing', t: 1, tag: 'Testing', secs: 60,
        q: 'How do you test a data pipeline?',
        pts: ['Unit tests for the transforms, with edge cases', 'A small end-to-end test on a fixture', 'Checks on the real data in the run', 'All of it in CI'],
        short: 'In layers. Unit tests for each transform, because a function that cleans a name or a price is easy to test, with the edge cases that real data has: empty values, boundaries, wrong formats. One small end-to-end test that runs the whole job on a fixture of a dozen rows and compares the table. Checks in the run itself, for row counts, bad-row limits and the schema, because a test cannot see tomorrow\'s file. And CI that runs the tests, the linter and the type checker on every change. In a recording, four tests with 100 percent coverage still let three of seven injected bugs through, so I choose the cases with care.',
        fu: [['What goes in a fixture?', 'A few rows for each case that has bitten you, small enough to read in the test file.'], ['Do you test against the real warehouse?', 'Rarely in unit tests. A small local database such as SQLite or DuckDB covers most logic. Do a smoke test on the real one separately.']],
        trap: 'Only testing the happy path.',
        real: 'Tell about a bug that a test caught, and one that it missed.'
      }),

      B.qa({
        id: 'qa-coverage', t: 1, tag: 'Testing', secs: 60,
        q: 'Is 100 percent test coverage a good goal?',
        pts: ['Coverage counts lines that ran', 'It does not check boundaries or results', 'A floor, not a goal', 'Mutation tests show weak tests'],
        short: 'It is a useful floor and a poor goal. Coverage tells me which lines ran, so it finds code that no test touches. It does not tell me that the results were checked, or that the edges of a condition were tried. In a recording, four tests had 100 percent coverage, and I changed the code in seven small ways: they caught 4. A stronger suite with the same 100 percent caught all 7, because it had cases exactly on the boundaries. So I use coverage to find untested code, and I judge the tests by their cases, and for money code I run a mutation check.',
        fu: [['What number would you set?', 'A floor that stops it falling, for example 80 percent on a new module. And a review of the cases.'], ['What is a mutation test?', 'Change the code a little, run the tests, and see whether one fails. A survivor means a missing test.']],
        trap: 'Writing tests with no asserts to raise the number.',
        real: 'Tell about a time when high coverage gave false comfort.'
      }),

      B.qa({
        id: 'qa-hypothesis', t: 2, tag: 'Testing', secs: 60,
        q: 'What is a property-based test, and when do you use one?',
        pts: ['A rule that holds for all inputs', 'The library generates inputs and shrinks failures', 'Good for parsers, round trips, idempotency', 'Not a replacement for examples'],
        short: 'A property test states a rule that must always hold, and a library such as Hypothesis generates many inputs and looks for one that breaks it. When it finds one, it shrinks it to the smallest failing input: in a recording a deduplicating function that sorted its output failed on `[0, -1]`. It suits parsers and round trips, such as writing a number as text and reading it back, which passed 200 generated amounts, and rules like "running the load twice gives the same table". I still write examples for the cases that I know matter, because they document intent.',
        fu: [['How do you keep it repeatable?', 'Use a derandomized setting or a fixed seed in CI, and let Hypothesis save failures in its database.'], ['Is it slow?', 'Each test runs a few hundred cases by default, which is usually fast for pure functions.']],
        trap: 'Properties that repeat the code under test.',
        real: 'Name a rule in your pipeline that holds for every input.'
      }),

      B.qa({
        id: 'qa-logging', t: 1, tag: 'Operations', secs: 60,
        q: 'How should a data job log?',
        pts: ['The logging module, with levels and names', 'Structured fields: run id, counts', 'log.exception keeps the traceback', 'Never log secrets'],
        short: 'With the `logging` module and not `print`. A level, so that I can hide debug lines in production. A logger name for the part of the job. Fields as data, not buried in a sentence: a run id, row counts and durations, as JSON, so that a log system can filter on them. Inside an `except`, `log.exception` records the traceback, and then I re-raise so the run still fails. In a recording the debug line was hidden, and three lines of JSON carried the same run id. I do not log secrets or whole personal records, and the platform adds the timestamp.',
        fu: [['What do you log at INFO?', 'The start and end of each step with the counts: rows read, rows written, rows rejected, seconds.'], ['Where do the logs go?', 'To standard output, and the platform collects them. The job does not manage files.']],
        trap: '`print("done")` and a log full of unreadable sentences.',
        real: 'Describe how you found a failure from the logs.'
      }),

      B.qa({
        id: 'qa-lint', t: 1, tag: 'Quality', secs: 60,
        q: 'What do a linter and a formatter do for a data team?',
        pts: ['A linter finds mistakes and risky patterns', 'A formatter ends style arguments', 'Run both in CI and pre-commit', 'Fixable rules are fixed automatically'],
        short: 'A linter such as ruff reads the code without running it and reports problems with a rule code: in a recording seven in a short file, among them an unused import, a mutable default argument, a comparison to `None` and a bare `except`. Some it can fix itself. A formatter makes the layout the same everywhere, so reviews are about logic and not about commas. I run both in pre-commit and in CI, so that a change that breaks the rules does not merge, and I add rules over time instead of turning on everything on day one.',
        fu: [['Do you follow every rule?', 'No. I pick a set, and I ignore a rule in one line with a comment and a reason when it does not fit.'], ['mypy as well?', 'Yes. The linter finds patterns, and the type checker finds mismatches between values and hints.']],
        trap: 'Turning off the linter because it is annoying.',
        real: 'Name the checks that run on every pull request in your team.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Test Pilot', color: '#BBF7D0',
        pts: [
          'A **pytest** test is a function with an `assert`. A failure shows the values: **`assert 1250 == 125`** and where `1250` came from. `parametrize` turns a test into a table of facts.',
          '**100 percent coverage** and **4 tests** caught **4 of 7** changes to the code. Tests with boundary cases and the same 100 percent caught **7 of 7**. Coverage counts lines that ran, not facts that were checked.',
          'A **property test** found the smallest failing input, `[0, -1]`, for a function that sorted when it should keep the order. State what is always true.',
          '**Log** with a level, a name and fields, and `log.exception` inside an `except`. **ruff** found **7** problems with rule codes, such as `B006` for a mutable default.',
          'Test **boundaries** on purpose, run cheap checks in CI, and spend the expensive ones on code that costs money.'
        ],
        lines: [
          'I test the edges of every limit, on both sides.',
          'I do not trust a coverage number on its own.',
          'I log fields and tracebacks, and I run ruff, mypy and the tests in CI.'
        ]
      })
    ]
  });
})();
