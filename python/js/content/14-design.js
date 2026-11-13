/* Mission 14: design. Real runs of a tangled job, its refactoring into a pure core and a thin shell, injected dependencies and a step runner. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TGF = G.file('m14/tangled.py'), TTF = G.file('m14/test_tangled.py'), COF = G.file('m14/core.py'), SHF = G.file('m14/shell.py'), TCF = G.file('m14/test_core.py'), IJF = G.file('m14/inject.py'), STF = G.file('m14/steps.py'), PLF = G.file('m14/pull_logic_out.py');
  var PTT = G.text('m14/pytest_tangled'), PCT = G.text('m14/pytest_core'), SHT = G.text('m14/shell'), IJT = G.text('m14/inject.py'), STT = G.text('m14/steps.py'), PLT = G.text('m14/pull_logic_out.py');
  var TS = G.counts('m14.tests');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }

  G.expect(/^1 passed in [\d.]+s$/m.test(PTT) && /^3 passed in [\d.]+s$/m.test(PCT) && TS.tangled.tests === 1 && TS.tangled.fixtures === 2 && TS.tangled.lines === 14 && TS.core.tests === 3 && TS.core.fixtures === 0, 'the tangled job needs one long test with two fixtures, and the core needs three short tests with none');
  G.expect(/wrote 2 rows to out\.db/.test(SHT) && /\[\('London', '2026-03-14', 2070\), \('Singapore', '2026-03-15', 1990\)\]/.test(SHT), 'the shell wrote the two daily totals');
  G.expect(/with fakes: 2 rows, first one: \{'order_id': 'O-1', 'loaded_at': '2026-03-15T02:00:00\+00:00'\}/.test(IJT) && /with the real reader: 3 rows, ids \['O-1', 'O-2', 'O-3'\] , loaded_at is set: True/.test(IJT), 'the injected job ran with fakes and with the real reader');
  G.expect(/tests passed$/.test(STT) && /the third step never ran/.test(STT) && /tests passed$/.test(PLT) && /errors by job: \{'load_orders': 4, 'load_stores': 2\}/.test(PLT), 'both coding rounds pass');

  var BUG_CLOCK = ['def stamp_orders(orders):', '    now = datetime.now(timezone.utc)', '    return [dict(o, loaded_at=now.isoformat()) for o in orders]'].join('\n');
  var BUG_CLOCK_FIX = ['def stamp_orders(orders, now):', '    return [dict(o, loaded_at=now.isoformat()) for o in orders]', '', '# the shell passes the real time: stamp_orders(orders, datetime.now(timezone.utc))', '# a test passes a fixed time:     stamp_orders(orders, datetime(2026, 3, 15, 2, 0, tzinfo=timezone.utc))'].join('\n');
  var STROWS = STT.split('\n').filter(function (l) { return /^(all steps|the second step|the third step)/.test(l); }).map(function (l) { var i = l.indexOf(' - '); return i > 0 ? [l.slice(0, i), l.slice(i + 3)] : [l, '']; });
  var PLROWS = PLT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Design: pipelines as code', short: 'Design', blurb: 'A small core you can test, and a thin shell around it', minutes: 26,
    focus: ['stg', 'ing'],
    goals: [
      'Split a job into a **pure core** and a **thin shell**, and say what goes in each.',
      '**Inject** what changes: the reader, the writer, the connection and the clock.',
      'Show that the core needs **no fixtures** to test, with a real before and after.',
      'Write a **step runner** that names the failing step and stops.',
      'Refactor a legacy job in **small, safe steps**.'
    ],
    say: 'Mission 14 is about the shape of a job. The first version of nearly every job is one function that reads, cleans, adds up and writes, and it works. It is also hard to test, hard to change and easy to copy. You will take one of those, split it, and measure what the split buys: how many lines and fixtures a test needs before and after. Everything here ran on this machine.',
    scenes: [
      B.talk({
        id: 'm14-talk', t: 1, src: 'docs', title: 'A job you can change without fear',
        say: 'Press Next for four design ideas, in the order that you meet them.',
        items: [
          ['Functions, not one long script', 'Each function does one thing and has a name. A reader can see what the job does without reading how.', 'Name the steps.'],
          ['A pure core and a thin shell', 'The **core** takes values and returns values: no files, no network, no clock. The **shell** reads, calls the core, and writes. Almost all the logic is in the core.', 'Logic in the core.'],
          ['Pass in what changes', 'The reader, the writer, the connection and the clock are arguments. A test passes fakes, and production passes the real ones.', 'Inject it.'],
          ['Small steps that fail by name', 'A pipeline is a list of named steps. When one fails, the log says which, and the run stops.', 'Fail by name.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm14-tangled', t: 1, src: 'rec', title: 'One function that does everything', file: 'tangled.py', lang: 'python', code: TGF,
        steps: [
          { say: 'A job that reads a CSV file, cleans the rows, adds up the paid orders for each store and day, and writes them to SQLite. It works. The test of it is on the next screen.', lines: null },
          { say: 'It opens the database and creates the table. Already it depends on a file system and a database.', lines: G.span(TGF, /^    conn = sqlite3/, /CREATE TABLE/) },
          { say: 'It reads the file, skips the unpaid rows, cleans the store name and the day, and adds up the cents. The reading, the rules and the arithmetic are mixed in one loop.', lines: G.span(TGF, /^    with open/, /totals\[\(store, day\)\]/) },
          { say: 'It writes the results and prints a message.', lines: G.span(TGF, /^    for \(store, day\), cents/, /^    print/) }
        ]
      }),

      B.code({
        id: 'm14-tangled-test', t: 1, src: 'rec', title: 'What it takes to test it', file: 'test_tangled.py', lang: 'python', code: TTF,
        steps: [
          { say: 'To test `run`, the test has to build a real file, a real database, and read the database back. Two pytest fixtures are needed: `tmp_path` and `capsys`.', lines: null },
          { say: 'A CSV file with four rows, written to a temporary folder.', lines: G.span(TTF, /source = tmp_path/, /^    \)/) },
          { say: 'A path for the database, and the call.', lines: G.span(TTF, /db = tmp_path/, /^    run\(/) },
          { say: 'The test reads the table back with SQL, and checks what was printed.', lines: [G.at(TTF, /rows = sqlite3/), last(TTF)] }
        ]
      }),

      B.term({
        id: 'm14-tangled-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of pytest for the one test.',
        lines: function () { return G.plain(PTT); },
        after: 'It passes, so the job is correct. But look at the cost: **one** test, **' + TS.tangled.lines + ' lines** long, with **' + TS.tangled.fixtures + ' fixtures**, a CSV in a temporary folder and a database to read back. Testing the rule "only paid orders count" needs all of that, and so does every other rule. Most teams write one such test and stop.',
        afterKind: 'warn',
        doneSay: 'A test that is this expensive does not get written twice.'
      }),

      B.flow({
        id: 'm14-flow', t: 1, src: 'docs', title: 'A pure core and a thin shell', g: 'core', legend: true,
        steps: [
          { say: 'The shell on the left reads the world. The core in the middle holds the rules. The shell on the right writes the results. Press Next.', cap: 'Nothing has run yet.' },
          { say: 'Steps 1 to 3. The shell reads the file, calls the API and asks the clock. It hands **plain values** to the core.', on: ['i1', 'i2', 'i3'], focus: ['file', 'api', 'clock', 'core'], tags: ['tg_shell'], cap: 'The shell reads.' },
          { say: 'The core is made of pure functions: the same input always gives the same output, and nothing else happens. It cleans, validates and adds up.', focus: ['core'], tags: ['tg_pure'], cap: 'The core decides.' },
          { say: 'Steps 4 and 5. The shell takes what the core returned and writes it to the warehouse, and sends an alert.', on: ['o1', 'o2'], focus: ['core', 'db', 'alert'], cap: 'The shell writes.' }
        ]
      }),

      B.code({
        id: 'm14-core', t: 1, src: 'rec', title: 'The core: pure functions', file: 'core.py', lang: 'python', code: COF,
        steps: [
          { say: 'The same logic, moved out of the loop into two functions. They read no file, call no API and know no clock. The output is real.', lines: null },
          { say: '`parse_order` turns a row of text into a clean order, or raises `ValueError` for a row that cannot be used.', lines: blk(COF, 'parse_order') },
          { say: '`daily_totals` adds up the paid orders for each store and day, and returns a sorted list.', lines: blk(COF, 'daily_totals') }
        ]
      }),

      B.code({
        id: 'm14-shell', t: 1, src: 'rec', title: 'The shell: reading and writing', file: 'shell.py', lang: 'python', code: SHF,
        steps: [
          { say: 'What is left of the job is the shell. It decides nothing about the data. The output is real.', lines: null },
          { say: 'It reads the file, calls the core for each row, and calls the core for the totals.', lines: G.span(SHF, /^    with open/, /^    totals = /) },
          { say: 'It writes the totals to the database, and prints a message.', lines: G.span(SHF, /^    conn = /, /^    print/) }
        ]
      }),

      B.term({
        id: 'm14-shell-run', t: 1, src: 'rec', title: 'Run the shell',
        say: 'The real output: the shell on the same four rows, and then a query of the table that it wrote.',
        lines: function () { return G.plain(SHT); },
        after: 'The refactored job gave the **same two rows**: London on the 14th, 2,070 cents, and Singapore on the 15th, 1,990 cents. The behaviour did not change. What changed is that the rules now live in two small functions.',
        afterKind: 'tip',
        doneSay: 'Same result. Different shape.'
      }),

      B.code({
        id: 'm14-core-test', t: 1, src: 'rec', title: 'Testing the core', file: 'test_core.py', lang: 'python', code: TCF,
        steps: [
          { say: 'Three short tests, each with **no fixtures**: they pass plain values and compare plain values. The output is real.', lines: null },
          { say: 'A row of text with a stray space and a lower case name comes back clean.', lines: blk(TCF, 'test_parse_order_cleans_the_row') },
          { say: 'A row that cannot be used raises `ValueError`.', lines: blk(TCF, 'test_parse_order_rejects_a_bad_row') },
          { say: 'The totals count paid orders only: the refunded row is ignored.', lines: blk(TCF, 'test_daily_totals_counts_paid_orders_only') }
        ]
      }),

      B.term({
        id: 'm14-core-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of pytest for the core.',
        lines: function () { return G.plain(PCT); },
        after: '**3 tests, ' + TS.core.lines + ' lines in total, ' + TS.core.fixtures + ' fixtures**. Each rule has its own test: the cleaning, the rejection, and the "paid only" rule. Adding a fourth rule is three more lines, with no file and no database. That is what the split buys.',
        afterKind: 'tip',
        doneSay: 'Cheap tests get written.'
      }),

      B.quiz({
        id: 'm14-q1', t: 1, src: 'rec',
        q: 'The recording counted the tests of the tangled job and of the core. What did it find?',
        opts: [
          { t: 'Tangled: 1 test of ' + TS.tangled.lines + ' lines with ' + TS.tangled.fixtures + ' fixtures. Core: 3 tests of ' + TS.core.lines + ' lines in total with ' + TS.core.fixtures + ' fixtures.', fb: '' },
          { t: 'The core needs more fixtures, because it has more functions', fb: 'The core tests pass plain values, so they need none.' },
          { t: 'Both need the same: a file and a database', fb: 'Only the tangled job touches files and a database.' },
          { t: 'The core cannot be tested without the shell', fb: 'It can: it is made of pure functions.' }
        ],
        ok: 0, why: 'The tangled job can only be tested through a file and a database, so the one test is long and needs two fixtures. The core takes values and returns values, so each rule gets a three-line test with no setup.'
      }),

      B.cmp({
        id: 'm14-cmp', t: 1, src: 'docs', title: 'Core or shell?',
        say: 'A way to decide where a piece of code belongs. Press Next.',
        cols: ['The code', 'Where it goes', 'Why'],
        hl: 1,
        rows: [
          ['Clean a store name, parse a total into cents', 'Core', 'Values in, values out.'],
          ['Add up paid orders for each store and day', 'Core', 'Pure arithmetic over a list.'],
          ['Decide that a row is bad, and why', 'Core', 'It is a rule, and rules need tests.'],
          ['Open a file, read an API page, run a query', 'Shell', 'It touches the outside world.'],
          ['Ask what time it is', 'Shell, passed to the core as an argument', 'The clock changes on every call, so a pure function must be given the time.'],
          ['Retry a call, log a line, exit with a code', 'Shell', 'It is about running the job, not about the data.']
        ],
        steps: [
          { upto: 3, say: 'Rules and arithmetic are the core. They are the part that changes most, and the part that must be right.' },
          { upto: 6, say: 'Everything that touches the world, including the clock, is the shell. Pass the clock in.' }
        ],
        pick: 'Ask: "can I test this with a plain list and no setup?" If yes it is core. If no, it is shell, or it needs an argument.'
      }),

      B.code({
        id: 'm14-inject', t: 1, src: 'rec', title: 'Pass in what changes', file: 'inject.py', lang: 'python', code: IJF,
        steps: [
          { say: 'A job whose reader, writer and clock are arguments. It runs with fakes in a test and with real things in production, and the job does not know which. The output is real.', lines: null },
          { say: '`run_day` takes `read`, `write` and `now`. It stamps each row with the time of the run and writes the rows. It does not open a file or call the clock itself.', lines: blk(IJF, 'run_day') },
          { say: 'With fakes: a reader that returns two rows, a writer that collects them, and a clock that always says the same time. The result is the same every run.', lines: G.span(IJF, /^# 1\. with fakes/, /^print\("with fakes/) },
          { say: 'With the real things: a CSV reader and the real clock. The same `run_day` runs unchanged.', lines: [G.at(IJF, /^# 2\. with the real things/), last(IJF)] }
        ]
      }),

      B.term({
        id: 'm14-inject-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `inject.py`.',
        lines: function () { return G.plain(IJT, { cmd: 'python inject.py' }); },
        after: 'With the fake clock, the stamp was exactly `2026-03-15T02:00:00+00:00`, so a test can assert on it. With the real clock, the test cannot know the time, so it only checks that the stamp is set and in UTC. **The same function ran in both cases**, because everything that changes was passed in.',
        afterKind: 'tip',
        doneSay: 'If you can pass it in, you can fake it.'
      }),

      B.bug({
        id: 'm14-bug1', t: 1, src: 'rec', q: 'A test of this function passes on Monday and fails on Tuesday, with the message that the two timestamps differ. Click the line that makes it impossible to test.',
        file: 'stamp.py', lang: 'python', code: BUG_CLOCK, bad: [2],
        hint: 'Who decides what time the function sees?',
        why: 'The function reads the clock itself, so its result depends on when it runs, and a test cannot fix the value. Pass the time in as an argument, as `run_day` did: the shell gives the real time, and a test gives a fixed one such as `2026-03-15T02:00:00`.',
        fix: BUG_CLOCK_FIX,
        cheer: 'Pass the clock in.'
      }),

      B.order({
        id: 'm14-order', t: 1, src: 'docs', q: 'Put the steps of a safe refactoring in order.',
        items: ['Write a test that pins what the job does now, on a small file', 'Move one rule into a pure function, and call it from the old code', 'Test the new function with plain values, including the edge cases', 'Repeat for the next rule until the shell has no rules left', 'Run the old and the new job on a real day of data and compare the output'],
        why: 'The first test makes sure that nothing changes while you move code. One rule at a time keeps each step small enough to review. The last step compares the old and the new job on real data, which small fixtures cannot do.',
        cheer: 'Pin, extract, test, repeat, compare.'
      }),

      B.decide({
        id: 'm14-decide', t: 2, src: 'rec', title: 'Decision: 40 scripts that grew over three years',
        scenario: 'The team owns 40 scripts. Each one reads, cleans and writes. The cleaning code was copied from script to script, and a bug that is fixed in one copy stays in the others. The recording showed that the same rules, moved into a core, were tested with **' + TS.core.tests + ' tests of ' + TS.core.lines + ' lines and no fixtures**, where the tangled version needed **one test of ' + TS.tangled.lines + ' lines with ' + TS.tangled.fixtures + ' fixtures**.',
        opts: [
          { t: 'Rewrite all 40 in a new framework', d: 'A clean start.', lose: 'Months of work, no new features, and a high risk that the new version differs in ways nobody notices.' },
          { t: 'Leave them alone, and add a comment about the bug', d: 'No effort.', lose: 'The bug is fixed in one place and lives on in the rest. Every change gets more expensive.' },
          { t: 'Extract the shared cleaning rules into one tested core, script by script, starting with those that change most, and compare old and new output each time', d: 'Small steps, each safe. The shared code gets one fix for all.', lose: '' },
          { t: 'Write end-to-end tests for all 40 first', d: 'A safety net.', lose: 'Each test needs files and databases, so they are slow to write and slow to run, and they do not say which rule is wrong.' }
        ],
        pick: 2,
        why: 'The recording showed what the split buys: tests that are short and need no setup. Doing it for the most changed scripts first pays back soonest, and comparing old and new output on a real day catches differences.',
        when: 'If a script is stable and never changes, leave it. Spend the effort where the changes and the bugs are.'
      }),

      B.challenge({
        id: 'm14-ch1', t: 1, lang: 'python', file: 'pull_logic_out.py',
        q: '**Coding round: pull the logic out.** A job reads a log file, counts the `ERROR` lines for each job and sends an email when a job has too many. Write the two pure functions that hold its logic. `failures_by_job(lines)` returns `{job: errors}` for lines like `2026-03-14T02:00:05Z ERROR load_orders rows=0`, and skips short or non-error lines. `alert_text(counts, limit=3)` returns `None` when no job has more than `limit` errors, and otherwise one line such as `load_orders: 5 errors` for each job over the limit, the worst first.',
        data: [{ name: 'a log with 9 lines', cols: ['line'], rows: [['2026-03-14T02:00:01Z INFO load_orders rows=1200'], ['2026-03-14T02:00:05Z ERROR load_orders rows=0'], ['2026-03-14T02:00:07Z ERROR load_stores rows=0'], ['2026-03-14T02:00:10Z WARN load_orders slow'], ['short line']] }],
        starter: 'def failures_by_job(lines):\n    ...\n\ndef alert_text(counts, limit=3):\n    ...',
        hints: ['Split each line. A usable line has at least three parts and `parts[1] == "ERROR"`. The job is `parts[2]`.', 'Count with a dict and `get`. Return the dict.', 'For the text: keep the jobs with `n > limit`, sort by the count from the largest, and join the lines. Return `None` when the list is empty.'],
        sol: fn(PLF, 'failures_by_job') + '\n\n' + fn(PLF, 'alert_text'),
        res: { msg: 'tests passed in the recording', cols: ['check', 'result'], rows: PLROWS },
        expl: ['Neither function reads a file or sends an email, so the tests are lists and strings. The shell that remains is three lines: read the file, call the two functions, send the text if it is not `None`.', 'Returning `None` when there is nothing to say keeps the decision in the core, and the shell only has to ask "is there a text?".', 'The limit is a parameter, so the test can use 3, 1 and 10 without editing anything.'],
        cx: 'O(n) for the lines, and O(j log j) for the jobs that are over the limit.'
      }),

      B.challenge({
        id: 'm14-ch2', t: 2, lang: 'python', file: 'steps.py',
        q: '**Coding round: a step runner.** Write `run_pipeline(steps, ctx, log, clock)`. `steps` is a list of `(name, function)`. Each function takes the result of the step before it (the first takes `ctx`). Call `log(text)` once for each step: `"step NAME: ok in X.X s"`, or `"step NAME: FAILED after X.X s: ErrorName: message"` for the step that raised. Stop at the first failure. Return 0 when every step worked, and 1 when one failed. `clock()` returns seconds, and is passed in so that tests are exact.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['three steps that work', 'three "ok" lines with the times 0.4, 0.1 and 1.5 s, and return 0'], ['the second step raises ValueError', 'an "ok" line and a "FAILED" line, return 1'], ['after a failure', 'the third step never runs']] }],
        starter: 'def run_pipeline(steps, ctx, log, clock):\n    ...',
        hints: ['Loop over the steps. Take `start = clock()` before the call and `clock() - start` after it.', 'Wrap the call in `try`. On `Exception`, log the FAILED line with `type(err).__name__` and `return 1` at once.', 'Pass the result on: `ctx = fn(ctx)`. After the loop return 0.'],
        sol: fn(STF, 'run_pipeline'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: STROWS },
        expl: ['The failure is reported **by step name** and the run stops, so the log says where to look and nothing later runs on bad data.', '`clock` is an argument, so a test passes a fake that returns fixed times and checks the output exactly. Real code passes `time.perf_counter`.', 'The return value is an exit code (mission 13), so the shell can end with `sys.exit(run_pipeline(...))`. An orchestrator does the same job at a larger scale, with schedules and retries, and it is a different course.'],
        cx: 'O(steps), plus what the steps cost.'
      }),

      B.incident({
        id: 'm14-inc', t: 2, src: 'rec', title: 'Incident: two reports disagree on London', time: '10:50',
        alert: 'The weekly store report shows London revenue of 41,200 and the finance report shows 38,900, built from the same orders. Both pipelines are green. The difference is one order in eighteen.',
        clues: ['Both scripts have their own copy of a function that cleans the store name.', 'One copy does `name.strip().title()`. The other does `name.title()`.', 'A partner system started sending "London " with a trailing space last month.'],
        opts: [
          { t: 'Compare the distinct store values in both reports, then move the cleaning into one tested function that both scripts use', fb: '' },
          { t: 'Fix the second copy and leave the two copies', fb: 'It repairs today\'s case. The next fix will again land in one copy.' },
          { t: 'Pick the report with the higher number', fb: 'Neither number is known to be right.' },
          { t: 'Ask finance to use the weekly report', fb: 'It hides the difference, and finance may be the correct one.' }
        ],
        best: 0, why: 'In the recording, `parse_order` turned " london " into "London", and a test pinned that. With one core function used by both scripts, a fix lands everywhere, and the test says what the cleaning must do. The trailing space produced a second store, "London ", so one report counted it separately.',
        checks: [
          ['List the distinct store values in each report', 'One report has "London" and "London " as two rows.'],
          ['Diff the two copies of the cleaning function', 'One copy strips whitespace and the other does not.'],
          ['Move the cleaning into one function, with the test cases for spaces and case', 'Both scripts import it.'],
          ['Rerun both reports for the affected weeks through the idempotent load', 'The numbers must agree.'],
          ['Add a check that compares the two totals every week', 'A difference fails the run.']
        ],
        tell: 'The two reports disagreed because each script had its own copy of the store-name cleaning, and only one stripped trailing spaces, so a partner\'s "London " counted as a separate store in one of them. I moved the cleaning into one tested function that both scripts import, added test cases for spaces and case, and reran the affected weeks. A weekly check now compares the totals of the two reports.',
        prevent: ['One copy of each rule, in a tested core.', 'A test for every kind of dirty value that has been seen.', 'Reports built from the same table are reconciled automatically.', 'A fix goes to the shared function, never to one copy.']
      }),

      B.qa({
        id: 'qa-design', t: 1, tag: 'Design', secs: 60,
        q: 'How do you structure the code of a data pipeline?',
        pts: ['A pure core for the rules, a thin shell for I/O', 'Small named functions', 'Inject the clock, the reader and the writer', 'Tests for the core with plain values'],
        short: 'I put the rules in a core of pure functions that take values and return values, and keep a thin shell that reads, calls the core and writes. In a recording a job that did everything in one function needed one test of 14 lines with two fixtures and a database to read back. After the split, three tests of 10 lines in total needed no fixtures. I pass in what changes, such as the clock, the reader and the writer, so that a test can fake them. The functions are small and named, so the job reads like its own description, and a failing step is named in the log.',
        fu: [['Is this overkill for a small script?', 'For a ten-line script, yes. Once a job has rules that change or bugs that cost money, the split pays back at once.'], ['Where do the retries go?', 'In the shell, around the calls that touch the outside world (mission 7).']],
        trap: 'One 300-line function that nobody dares to touch.',
        real: 'Describe a job that you split, and what became easier.'
      }),

      B.qa({
        id: 'qa-coreshell', t: 1, tag: 'Design', secs: 60,
        q: 'What is a pure function, and why does it matter for pipelines?',
        pts: ['Same input, same output, no side effects', 'No files, network, clock or global state', 'Easy to test, rerun and reason about', 'The shell does the side effects'],
        short: 'A pure function returns the same output for the same input, and does nothing else: it reads no file, calls no API, does not ask the clock and does not change global state. That makes it easy to test with plain values, safe to rerun, and easy to read. Pipelines need side effects, so I keep them at the edges, in a thin shell. In a recording, the clock was passed in as an argument: with a fake clock the stamp was exactly 2026-03-15T02:00:00+00:00 and a test could assert on it, and with the real clock the same function ran unchanged.',
        fu: [['Is reading the clock a side effect?', 'It is an input that changes on every call, so a pure function receives it as an argument.'], ['Is logging a side effect?', 'Yes, but a harmless one. Keep it out of the core, or pass a logger in.']],
        trap: 'Calling something pure because it "just reads".',
        real: 'Name a function in your code that is hard to test, and why.'
      }),

      B.qa({
        id: 'qa-di', t: 2, tag: 'Design', secs: 60,
        q: 'What is dependency injection, and how do you use it without a framework?',
        pts: ['Pass what a function needs as arguments', 'Fakes in tests, real things in production', 'No framework is needed in Python', 'Do not inject everything'],
        short: 'Dependency injection means that a function receives what it depends on instead of creating it. In Python I do it with plain arguments or small callables: `run_day(day, read, write, now)` in the recording ran with fakes, a reader that returned two rows, a writer that collected them and a fixed clock, and then unchanged with a CSV reader and the real clock. A test needs no mocking library and no monkeypatching. I inject what changes or is expensive, such as the clock, the connection, the HTTP client and the sleep function of a retry, and I do not inject things that never change, like `len`.',
        fu: [['When do you use a mock library?', 'Rarely, for code that I cannot change. Passing a fake in is simpler and more readable.'], ['What about a class with a connection attribute?', 'The same idea: pass the connection to the constructor, and a test passes a fake.']],
        trap: 'A hidden global connection that every function uses.',
        real: 'Describe how you test code that calls an API.'
      }),

      B.qa({
        id: 'qa-share', t: 1, tag: 'Design', secs: 60,
        q: 'Two scripts need the same cleaning rule. Copy it or share it?',
        pts: ['Share rules that must stay the same', 'A fix lands everywhere', 'A small shared package with tests', 'Copy only when they should differ'],
        short: 'If the rule has to give the same answer in both places, I share it, in one function with tests, and both scripts import it. In a recording two reports differed by one order in eighteen because each script had its own copy of the cleaning, and only one stripped a trailing space. A fix then lands everywhere at once. I copy only when the two uses may really diverge. A shared function needs an owner and tests, and a version that the scripts agree on, so that a change to it is not a surprise.',
        fu: [['How do you share code between repositories?', 'A small package with a version, built as in mission 13, or a single repository for the pipelines.'], ['Is a little duplication ever fine?', 'Yes, for code that is simple and unlikely to change. Not for rules about money.']],
        trap: 'A bug that is fixed "in the script that failed".',
        real: 'Tell about a bug that you had to fix in several copies.'
      }),

      B.qa({
        id: 'qa-orch', t: 2, tag: 'Design', secs: 60,
        q: 'What should the orchestrator do, and what should your code do?',
        pts: ['The orchestrator schedules, retries and tracks runs', 'Your code does the work and exits with a code', 'Keep the jobs runnable on their own', 'A step runner names the failing step'],
        short: 'An orchestrator, such as Airflow, decides when each job runs and in what order, retries it, records each run and alerts people. My code does the work of one step, and says how it ended with an exit code. I keep each job runnable from the command line on its own, with a dry run, so that I can test and rerun it without the scheduler. Inside a job, a small step runner like the one in this mission names the failing step and stops: in the recording the second step failed, the log said so, and the third step never ran. The orchestrator sees the exit code, and the log says why.',
        fu: [['Why not put the business logic in the orchestrator?', 'It is hard to test and to run locally. Keep the logic in the code and the schedule in the orchestrator.'], ['Do you need an orchestrator?', 'Not for one nightly job. A cron entry and an alert can be enough until the dependencies grow.']],
        trap: 'A job that only works inside the scheduler.',
        real: 'Describe how you rerun a job without the scheduler.'
      }),

      B.qa({
        id: 'qa-refactor', t: 2, tag: 'Design', secs: 60,
        q: 'How do you refactor a legacy job safely?',
        pts: ['Pin the current behaviour with a test first', 'One rule at a time', 'Compare old and new on real data', 'Start where the changes and bugs are'],
        short: 'First a test that pins what the job does now, on a small file, so that I notice any change in behaviour. Then one rule at a time: move it into a pure function, call it from the old code, and test it with plain values, including the edge cases. In a recording the refactored job produced the same two daily totals as the tangled one, and the rules had three short tests with no fixtures. At the end I run the old and the new job on a real day of data and compare the output. I start with the jobs that change most and cause most bugs, and I leave stable ones alone.',
        fu: [['What if there are no tests at all?', 'Write the pinning test first. It does not have to be pretty. It has to fail when behaviour changes.'], ['How do you handle a big refactor in a team?', 'Small pull requests, each one safe to merge on its own.']],
        trap: 'A rewrite from scratch that changes behaviour in ways nobody checks.',
        real: 'Tell about a refactoring that went well or badly.'
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Job Architect', color: '#FDE68A',
        pts: [
          'Split a job into a **pure core** (rules, values in and out) and a **thin shell** (read, call, write). The rules are where the bugs are.',
          'The tangled job needed **1 test of ' + TS.tangled.lines + ' lines with ' + TS.tangled.fixtures + ' fixtures**. The core needed **3 tests of ' + TS.core.lines + ' lines with ' + TS.core.fixtures + '**.',
          '**Pass in what changes**: the reader, the writer and the clock. With a fake clock the stamp was exactly `2026-03-15T02:00:00+00:00`.',
          'A **step runner** logs each step, stops at the first failure and names it. The third step never ran.',
          'Refactor in **small steps**: pin, extract, test, repeat, and compare old and new on real data. Share a rule once, and fix it once.'
        ],
        lines: [
          'I keep the rules in pure functions and the side effects in a thin shell.',
          'I pass in the clock, the reader and the writer, so I can fake them.',
          'I refactor one rule at a time, and I compare the old and the new output.'
        ]
      })
    ]
  });
})();
