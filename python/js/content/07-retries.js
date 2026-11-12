/* Mission 7: errors, retries and idempotency. Real results from Python 3.14, SQLite, tenacity and a retry simulation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var EXF = G.file('m7/exceptions_tour.py'), SWF = G.file('m7/swallowed.py'), FLF = G.file('m7/fail_loud.py'), RBF = G.file('m7/retry_backoff.py'), TNF = G.file('m7/tenacity_retry.py');
  var LSF = G.file('m7/load_strategies.py'), WMF = G.file('m7/watermark.py'), ILF = G.file('m7/idempotent_load.py'), CRF = G.file('m7/call_with_retry.py');
  var EXT = G.text('m7/exceptions_tour.py'), RFT = G.text('m7/raise_from.py'), SWT = G.text('m7/swallowed.py'), FLT = G.text('m7/fail_loud.py'), EXC = G.text('m7/exit_codes');
  var RBT = G.text('m7/retry_backoff.py'), TNT = G.text('m7/tenacity_retry.py'), LST = G.text('m7/load_strategies.py'), WMT = G.text('m7/watermark.py'), ILT = G.text('m7/idempotent_load.py'), CRT = G.text('m7/call_with_retry.py');
  var RT = G.counts('m7.retry'), ID = G.counts('m7.idem'), EXIT = G.counts('exit');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }
  function count(text, re) { return (text.match(re) || []).length; }
  function cell(s, sc) { return ID.cells[s][sc]; }
  function money(c) { return (c / 100).toFixed(2); }

  /* what the recording says, checked before any of it is quoted */
  G.expect(count(EXT, /finally: this runs either way/g) === 3 && count(EXT, /else: no error/g) === 1 && /the cause: ValueError\("could not convert string to float: '12,50'"\)/.test(EXT) && /did not catch it, the caller did: TypeError/.test(EXT), 'finally ran three times, else once, the cause is kept, and a TypeError passed through the ValueError handler');
  G.expect(/The above exception was the direct cause of the following exception:/.test(RFT) && /ValueError: order total '12,50' is not a number\s*$/.test(RFT), 'the traceback has two blocks and ends with the new error');
  G.expect(/loaded 4 of 6 rows\nstatus: success/.test(SWT) && /status: success\nexit code: 0/.test(EXC) && /status: failed, 2 of 6 rows rejected \(limit 5%\)\nexit code: 1/.test(EXC), 'the swallowing loader exits 0 and the honest one exits 1');
  G.expect(/waiting 0\.16 s/.test(RBT) && /waiting 0\.15 s/.test(RBT) && /waiting 1\.30 s/.test(RBT) && /result: orders page 1 after 4 calls/.test(RBT) && /total wait: 1\.61 s/.test(RBT) && /gave up after 5 calls/.test(RBT) && /\[0\.5, 1\.0, 2\.0, 4\.0, 8\.0\]/.test(RBT), 'the retry lesson: three waits, four calls, 1.61 s, five calls when it never works');
  G.expect(count(TNT, /Retrying __main__\.fetch_page in/g) === 2 && /result: page 1 after 3 calls/.test(TNT) && /stopped after 1 call: 400 Bad Request/.test(TNT), 'tenacity retried twice and a ValueError was not retried');
  var APP2 = cell('append', 'run twice'), APC = cell('append', 'crash, then run again'), IKC = cell('insert with a key', 'crash, then run again'), UPD = cell('upsert', 'the source drops O-6'), DIC = cell('delete, then insert', 'crash, then run again'), TXC = cell('delete, then insert, in a transaction', 'crash, then run again');
  G.expect(APP2.final.length === 12 && !APP2.right && APP2.runs[1].cents === 16550, 'appending twice gives 12 rows and 165.50');
  G.expect(APC.final.length === 9 && IKC.final.length === 3 && IKC.runs[1].outcome === 'failed: UNIQUE constraint failed: orders.order_id', 'after a crash, append has 9 rows and a primary key stops the rerun');
  G.expect(UPD.final.length === 6 && !UPD.right && cell('upsert', 'the source corrects O-3').right, 'upsert follows a correction and keeps a dropped row');
  G.expect(DIC.runs[0].rows === 3 && DIC.right && TXC.runs[0].rows === 0 && TXC.right, 'delete then insert leaves 3 rows after a crash and a transaction leaves 0');
  var allRight = ID.strategies.filter(function (s) { return ID.scenarios.every(function (c) { return cell(s, c).right; }); });
  G.expect(allRight.length === 2 && allRight.indexOf('delete, then insert') >= 0 && allRight.indexOf('delete, then insert, in a transaction') >= 0, 'only the two delete strategies are right in every column');
  var ST = RT.storm, AT = ST['at once'], FX = ST['fixed 1 s'], EX = ST['exponential'], JT = ST['exponential with full jitter'];
  G.expect(AT.requests === 330 && AT.succeeded === 10 && AT.gave_up === 40 && FX.requests === 150 && FX.finished_at === 4 && FX.retry_burst === 40 && EX.requests === 190 && EX.finished_at === 15.5 && JT.requests === 196 && JT.finished_at === 7.45 && JT.retry_burst === 14, 'the fifty-client simulation');
  G.expect(/overlap  0 min: run 2 reads 1 row; the target has 3 of 4/.test(WMT) && /overlap 15 min: run 2 reads 4 rows; the target has 4 of 4/.test(WMT) && /run 2 reads 0 rows; the target has 0 of 3/.test(WMT), 'the watermark lesson loses rows when it is saved first and when a row is late');
  G.expect(/tests passed$/.test(ILT) && /tests passed$/.test(CRT) && /\[0\.5, 1\.0, 2\.0, 4\.0, 8\.0, 8\.0, 8\.0\]/.test(CRT), 'both coding rounds pass');
  G.expect(EXIT['m7/swallowed.py'] === 0 || EXIT['m7/swallowed.py'] === undefined, 'the swallowing loader finished normally');

  var BUG_SWALLOW = ['def load(rows):', '    loaded = []', '    for order_id, total in rows:', '        try:', '            loaded.append((order_id, float(total)))', '        except Exception:', '            pass', '    return loaded'].join('\n');
  var BUG_SWALLOW_FIX = ['def load(rows):', '    loaded, bad = [], []', '    for order_id, total in rows:', '        try:', '            loaded.append((order_id, float(total)))', '        except ValueError as err:', '            bad.append((order_id, total, str(err)))', '    return loaded, bad'].join('\n');
  var BUG_RETRY = ['def fetch(url):', '    for attempt in range(5):', '        try:', '            return requests.get(url, timeout=10).json()', '        except Exception:', '            time.sleep(1)'].join('\n');
  var BUG_RETRY_FIX = ['RETRYABLE = (requests.Timeout, requests.ConnectionError)', '', 'def fetch(url):', '    for attempt in range(1, 6):', '        try:', '            resp = requests.get(url, timeout=10)', '            resp.raise_for_status()', '            return resp.json()', '        except RETRYABLE:', '            if attempt == 5:', '                raise', '            time.sleep(random.uniform(0, min(8, 0.5 * 2 ** (attempt - 1))))'].join('\n');
  var BUG_POST = ['def create_order(session, payload):', '    for attempt in range(3):', '        try:', '            return session.post(URL, json=payload, timeout=5)', '        except requests.Timeout:', '            continue'].join('\n');
  var BUG_POST_FIX = ['import uuid', '', 'def create_order(session, payload):', '    key = str(uuid.uuid4())  # made once, sent with every try', '    for attempt in range(3):', '        try:', '            return session.post(URL, json=payload, timeout=5, headers={"Idempotency-Key": key})', '        except requests.Timeout:', '            continue'].join('\n');
  var BUG_APPEND = ['def load(db, rows):', '    db.executemany("INSERT INTO orders VALUES (?, ?, ?)", rows)', '    db.commit()'].join('\n');
  var BUG_APPEND_FIX = ['def load(db, day, rows):', '    with db:  # one transaction: all of it, or none of it', '        db.execute("DELETE FROM orders WHERE day = ?", (day,))', '        db.executemany("INSERT INTO orders VALUES (?, ?, ?)", rows)'].join('\n');

  var ILROWS = ILT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });
  var CRROWS = CRT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Errors, retries and idempotency', short: 'Retries', blurb: 'Run it twice and get the same table', minutes: 40,
    focus: ['src', 'ing'],
    goals: [
      'Catch the exceptions you can **handle**, and let the others stop the run **loudly**.',
      'Retry only what is worth retrying, with **backoff and jitter**, and know what a retry costs.',
      'Say why a plain `INSERT` is not safe to **run twice**, and pick a load that is.',
      'Use a **transaction**, a **key** and an **upsert** or a partition swap so that a rerun gives the same table.',
      'Explain a **watermark** and the two ways it loses rows.'
    ],
    say: 'Mission 7 is about the night the job fails halfway. A network blip, a 429 or a crash is normal. What decides whether you sleep is what happens next: does the job retry in a sensible way, does it say that it failed, and can you run it again without doubling the revenue? All the results are from real runs of small programs, apart from the fifty-client lab, which is a simulation and says so.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, src: 'docs', title: 'Three questions for every failure',
        say: 'A pipeline will fail. Press Next for the three questions that decide how bad it is.',
        items: [
          ['Can you try again?', 'Some failures go away if you wait: a timeout, a 503, a 429. Others never will: a 400 or a 404. Retry the first kind, with a limit. Stop on the second.', 'Retry what can change.'],
          ['Can you run it again?', 'A job is idempotent when running it twice leaves the same result as running it once. That is what makes retries, reruns and backfills safe.', 'Run it twice, get one answer.'],
          ['Will anyone know?', 'A job that catches every error reports success and loads a wrong table. The exit code, the logs and the row counts are how the scheduler and your team find out.', 'Fail loudly.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-exc', t: 1, src: 'rec', title: 'try, except, else and finally', file: 'exceptions_tour.py', lang: 'python', code: EXF,
        steps: [
          { say: 'One function and three calls: a good value, a bad value and a value of the wrong type. It was run, and the output is on the next screen.', lines: null },
          { say: '`try` holds the code that can fail. `except ValueError as err` handles **one named** error. `raise ... from err` raises a clearer error and keeps the original as its cause.', lines: G.span(EXF, /^    try:/, /from err/) },
          { say: '`else` runs only when the `try` block raised nothing. Put the code that depends on success there.', lines: G.span(EXF, /^    else:/, /return value/) },
          { say: '`finally` runs every time: after success, after a handled error, and while an unhandled error leaves the function. Use it for cleanup such as closing a file.', lines: G.span(EXF, /^    finally:/, /finally: this runs/) },
          { say: 'A good value goes through `try`, then `else`, then `finally`.', lines: G.span(EXF, /^print\("a good value/, /parse_total\("12\.50"\)/) },
          { say: 'A bad value is handled by `except`. The caller can read the original error in `__cause__`.', lines: G.span(EXF, /^print\("a bad value/, /the cause/) },
          { say: 'A value of the wrong type raises `TypeError`, which the `ValueError` handler does not name. It goes up to the caller, and `finally` still runs.', lines: G.span(EXF, /^print\("a value of the wrong type/, /type\(err\)/) }
        ]
      }),

      B.term({
        id: 'm7-exc-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `exceptions_tour.py`. Count how many times "finally" appears.',
        lines: function () { return G.plain(EXT, { cmd: 'python exceptions_tour.py' }); },
        after: '"finally" ran three times, once for each call, and "else" ran once. The third call raised `TypeError`: the `except ValueError` did not match it, so it left the function, and the caller caught it. A handler that names the error it can deal with lets everything else go up.',
        afterKind: 'tip',
        doneSay: 'Name the error you can handle. Let the rest stop the run.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1, src: 'rec',
        q: 'In the recording, `parse_total(None)` raised `TypeError`. What did the function print before the caller\'s message appeared?',
        opts: [
          { t: 'parsing None, then finally: this runs either way', fb: '' },
          { t: 'parsing None, then else: no error, so this runs', fb: '`else` runs only when the `try` block finished without an error. `float(None)` raised one.' },
          { t: 'Nothing, because the ValueError handler caught it', fb: 'The handler names `ValueError`. A `TypeError` does not match it.' },
          { t: 'Only parsing None', fb: '`finally` runs even when an error leaves the function, and the recording shows it did.' }
        ],
        ok: 0, why: 'The `try` block failed with `TypeError`. No `except` matched, so the error left the function, and `finally` ran on the way out. The `else` block was skipped.'
      }),

      B.term({
        id: 'm7-chain', t: 1, src: 'rec', title: 'A traceback with a cause',
        say: 'What a traceback looks like when `raise ... from` is used. This one is real, from `raise_from.py`. Read it from the bottom.',
        lines: function () { return G.plain(RFT, { cmd: 'python raise_from.py' }); },
        after: 'The **last line** is the error that stopped the program: the order total is not a number, and the message names the value. The block above it, joined by "the direct cause", is the original error from `float`. With `raise ... from err` the log holds both: what failed in your terms, and why in Python\'s terms.',
        afterKind: 'tip',
        doneSay: 'Read from the bottom. The last line says what stopped the run.'
      }),

      B.code({
        id: 'm7-swallow', t: 1, src: 'rec', title: 'A loader that catches everything', file: 'swallowed.py', lang: 'python', code: SWF,
        steps: [
          { say: 'A loader for six rows, two of which are bad (`8,20` and an empty string). The output is real.', lines: null },
          { say: 'This is the line that causes the trouble: `except Exception` followed by `pass`. Every failure is caught and thrown away.', lines: G.span(SWF, /^        try:/, /^            pass/) },
          { say: 'The report counts the rows that did load, and says "success". Nothing records that two rows were dropped.', lines: G.span(SWF, /^loaded = load/, /status: success/) }
        ]
      }),

      B.bug({
        id: 'm7-bug1', t: 1, src: 'rec', q: 'This loader reports "success" on a file with two bad rows, and finance finds the gap a week later. Click the line that hides the failure.',
        file: 'loader.py', lang: 'python', code: BUG_SWALLOW, bad: [6, 7],
        hint: 'What happens to an error that this handler catches?',
        why: '`except Exception: pass` catches every error and drops it. The two bad rows vanished, and the run still said success. Catch the error you expect (`ValueError`), keep the bad rows and their reasons, and make the run fail when too many are bad.',
        fix: BUG_SWALLOW_FIX,
        cheer: 'Count what you drop, and say it.'
      }),

      B.code({
        id: 'm7-failloud', t: 1, src: 'rec', title: 'The same loader, with an honest exit code', file: 'fail_loud.py', lang: 'python', code: FLF,
        steps: [
          { say: 'The same six rows. This version keeps the bad rows and the reason for each, and it fails the run when more than 5 percent are bad.', lines: null },
          { say: 'It names the one error it expects, `ValueError`, and collects the row, the value and the message.', lines: G.span(FLF, /^        try:/, /bad\.append/) },
          { say: 'The limit is a number in the file, `MAX_BAD`. A policy that lives in code can be reviewed and tested.', lines: G.span(FLF, /^MAX_BAD/, /^MAX_BAD/) },
          { say: 'When the share of bad rows is over the limit, the program prints why and exits with code 1. That is what a scheduler reads.', lines: G.span(FLF, /^if len\(bad\)/, /sys\.exit\(1\)/) }
        ]
      }),

      B.term({
        id: 'm7-exit', t: 1, src: 'rec', title: 'Two loaders, two exit codes',
        say: 'Both programs on the same file, with the exit code printed after each. The recording is real.',
        lines: function () { return G.plain(EXC, { cmd: null }); },
        after: 'The loader that swallowed the errors printed "success" and exited with **0**, so cron, Airflow or a CI job would show it green. The honest loader listed the two rejected rows and exited with **1**. A scheduler only reads the exit code.',
        afterKind: 'warn',
        doneSay: 'Exit 0 means success. Make that true.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1, src: 'rec',
        q: 'The loader that caught every exception ran on a file with two bad rows. What exit code did the recording show?',
        opts: [
          { t: '0, with the message "status: success"', fb: '' },
          { t: '1, because two rows failed', fb: 'That is the honest loader. The one with `except Exception: pass` never told anyone.' },
          { t: '2, because there were two bad rows', fb: 'The count of bad rows is not an exit code.' },
          { t: 'No exit code, because the program crashed', fb: 'It did not crash. It finished and said success.' }
        ],
        ok: 0, why: 'Exit code 0 and "status: success" with only 4 of 6 rows loaded. A job that hides a failure is worse than one that crashes, because nobody looks for the problem.'
      }),

      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'A retry loop, step by step', g: 'retry', legend: true,
        steps: [
          { say: 'The job, the API, a step that sorts the answer, a wait, and two exits. Press Next to follow one failure.', cap: 'Nothing has run yet.' },
          { say: 'Step 1. The job sends a request with a **timeout**. Without one, a hung connection waits forever.', on: ['e1'], focus: ['job', 'api'], cap: 'Always set a timeout.' },
          { say: 'Step 2. The API answers. This time it says 503, "try again later".', on: ['e2'], focus: ['api', 'chk'], cap: 'The answer comes back.' },
          { say: 'Step 3. The job **sorts** the answer. A 429, a 503 or a timeout can change if you wait, so it goes to the wait step.', on: ['e4'], focus: ['chk', 'wait'], tags: ['tg_jitter'], cap: 'Worth another try.' },
          { say: 'Step 4. The wait grows with every try, and it is random, so that many clients do not come back at the same moment. Then the job calls again.', on: ['e5'], focus: ['wait', 'job'], cap: 'Wait, then call again.' },
          { say: 'Step 5. When an answer is 200, the job uses the data and the loop ends.', on: ['e3'], focus: ['chk', 'ok'], cap: 'Success ends the loop.' },
          { say: 'Step 6. A 400 or a 404 will fail again, and so will the tenth try. The job stops and raises, and the number of tries is limited so that a long outage ends in a failed run.', on: ['e6'], focus: ['chk', 'stop'], tags: ['tg_budget'], cap: 'Stop and raise.' }
        ]
      }),

      B.cmp({
        id: 'm7-classify', t: 1, src: 'docs', title: 'Which failures are worth another try',
        say: 'Sorting the answer is the most important line of a retry loop. Press Next to read each kind of failure.',
        cols: ['Failure', 'Retry?', 'Why'],
        hl: 1,
        rows: [
          ['Timeout, connection reset', 'Yes, a few times', 'The network blinked, or the server was busy. A new connection often works.'],
          ['429 Too Many Requests', 'Yes, after the wait the server asks for', 'The server asked you to slow down. Read the `Retry-After` header when there is one.'],
          ['500, 502, 503, 504', 'Yes, a few times, with backoff', 'A server problem, often short. A 500 can also be a bug that never goes away, so the limit matters.'],
          ['400, 422', 'No', 'Your request is wrong. It will be just as wrong the next time.'],
          ['401, 403', 'No, or once after refreshing the credentials', 'The same key gets the same answer.'],
          ['404', 'Usually no', 'The thing does not exist. A resource that you created a second ago can be the exception.'],
          ['A row that fails validation', 'No', 'The data is bad, not the network. Set it aside for a person (mission 11).']
        ],
        steps: [
          { upto: 3, say: 'Network and server failures can change with time, so they get a few more tries.' },
          { upto: 7, say: 'Wrong requests, wrong credentials, missing things and bad data stay wrong. Stop and say so.' }
        ],
        pick: 'Retry **what can change** if you wait. Everything else stops the run, with the reason in the message.'
      }),

      B.code({
        id: 'm7-retry', t: 1, src: 'rec', title: 'A retry with backoff and full jitter', file: 'retry_backoff.py', lang: 'python', code: RBF,
        steps: [
          { say: 'A small retry loop, written out. Time and randomness are passed in, so the file runs in a fraction of a second and a test never waits. The output is real.', lines: null },
          { say: 'One exception class marks the failures that are worth another try. Everything else is a different class, and is not caught here.', lines: G.span(RBF, /^class Transient/, /A failure that/) },
          { say: '`delay_for` is **exponential backoff with full jitter**: a random wait between 0 and a limit that doubles with each failure (0.5, 1, 2, 4 seconds) and stops at a cap of 8.', lines: G.span(RBF, /^def delay_for/, /return rng\.uniform/) },
          { say: 'The loop calls the function. On a `Transient` failure it waits and tries again.', lines: G.span(RBF, /^def retry/, /sleep\(wait\)/) },
          { say: 'On the last allowed try the error is **raised**, not swallowed, so a long outage ends in a failed run.', lines: G.span(RBF, /if attempt == attempts:/, /^                raise/) },
          { say: '`Flaky` fails a set number of times and then works. It stands in for an API.', lines: G.span(RBF, /^class Flaky/, /return "orders page 1"/) },
          { say: 'The first demo: an API that fails 3 times, then works.', lines: G.span(RBF, /^slept = /, /total wait/) },
          { say: 'The second demo: an API that never works. The program gives up and raises.', lines: G.span(RBF, /^print\("an API that fails every time/, /gave up after/) }
        ]
      }),

      B.term({
        id: 'm7-retry-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `retry_backoff.py`, with Python ' + G.meta('python') + '.',
        lines: function () { return G.plain(RBT, { cmd: 'python retry_backoff.py' }); },
        after: 'The waits were 0.16, 0.15 and 1.30 seconds. Each one is a random number below its own limit (0.5, 1.0 and 2.0 seconds), so a wait can be shorter than the one before it. The client made **4 calls** for 3 failures, and it waited 1.61 seconds in total on a fake clock, so the run took no time.',
        afterKind: 'tip',
        doneSay: 'The waits are random on purpose. The limits are what grow.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1, src: 'rec',
        q: 'The API failed 3 times and then worked. How many calls did the client make, according to the recording?',
        opts: [
          { t: '4', fb: '' },
          { t: '3', fb: 'Three calls failed, and a fourth call worked.' },
          { t: '5', fb: 'Five calls is the limit. The client gave up after five calls only when the API never worked.' },
          { t: '1', fb: 'The first call failed.' }
        ],
        ok: 0, why: 'Three failures and one success make four calls. When the API failed every time, the same loop stopped after 5 calls (`attempts=5`) and raised the last error.'
      }),

      B.quiz({
        id: 'm7-q4', t: 1, src: 'rec',
        q: 'With a base of 0.5 seconds and a cap of 8, the recording lists the most a wait can last: 0.5, 1.0, 2.0, 4.0, 8.0. After the fourth failure, what is the longest possible wait?',
        opts: [
          { t: '4.0 seconds', fb: '' },
          { t: '8.0 seconds', fb: 'That is the limit after the fifth failure, and the fifth try is the last one: nothing waits after it.' },
          { t: '2.0 seconds', fb: '2.0 is the limit after the third failure.' },
          { t: '0.5 seconds', fb: '0.5 is the limit after the first failure.' }
        ],
        ok: 0, why: 'The limit doubles with each failure: 0.5 after the first, 1.0, 2.0, and 4.0 after the fourth. With full jitter the actual wait is a random number from 0 up to that limit.'
      }),

      B.widget({ id: 'm7-lab-retry', kind: 'retry', t: 1, src: 'rec', title: 'Lab: fifty clients, four ways to wait' }),

      B.quiz({
        id: 'm7-q5', t: 1, src: 'rec',
        q: 'In the simulation, fifty clients retried at once against a service that accepts ten requests per second. How many requests did the service receive, and how many clients gave up?',
        opts: [
          { t: AT.requests + ' requests, and ' + AT.gave_up + ' clients gave up', fb: '' },
          { t: '50 requests, and none gave up', fb: 'Every rejected client asked again, up to eight times, inside the same second.' },
          { t: '150 requests, and none gave up', fb: 'That is the result of the fixed one-second wait.' },
          { t: '500 requests, and ten clients gave up', fb: 'The simulation counted ' + AT.requests + ' requests and ' + AT.gave_up + ' clients that gave up.' }
        ],
        ok: 0, why: 'Ten clients got in. The other forty were rejected and retried at once, eight tries each, and all of those calls landed in the same second. The service received ' + AT.requests + ' requests for ' + AT.succeeded + ' successes, and ' + AT.gave_up + ' clients gave up. This is what a retry storm looks like.'
      }),

      B.quiz({
        id: 'm7-q6', t: 2, src: 'rec',
        q: 'Full jitter had the smallest burst of retries in 100 ms. What did it cost, compared with a fixed one-second wait?',
        opts: [
          { t: JT.requests + ' requests instead of ' + FX.requests + ', and ' + JT.finished_at + ' s to finish instead of ' + FX.finished_at, fb: '' },
          { t: 'Nothing: it was better in every column', fb: 'In this simulation it sent more requests and took longer than the fixed wait.' },
          { t: 'Fewer requests but a longer wait', fb: 'It sent more requests (' + JT.requests + ' against ' + FX.requests + ').' },
          { t: 'More failed clients', fb: 'Every client was served with every policy except retrying at once.' }
        ],
        ok: 0, why: 'The jittered clients came back at random times, so the biggest burst fell from ' + FX.retry_burst + ' retries in 100 ms to ' + JT.retry_burst + '. It also cost ' + (JT.requests - FX.requests) + ' more requests and ' + (JT.finished_at - FX.finished_at).toFixed(2) + ' more seconds here. Backoff and jitter protect a service that is down or recovering. They do not make a rate-limited service faster. A client that knows the limit does better with a rate limiter.'
      }),

      B.bug({
        id: 'm7-bug2', t: 1, src: 'docs', q: 'This function retries five times, one second apart. In production it sometimes returns `None`, and on a 404 it still waits five seconds. Click the line that causes both.',
        file: 'fetch.py', lang: 'python', code: BUG_RETRY, bad: [5],
        hint: 'Which errors does this handler catch, and what happens after the fifth failure?',
        why: '`except Exception` catches every error, so a bad URL or a bug is retried like a timeout. After the fifth failure the loop ends and the function returns `None`, which looks like data that is missing. Catch only the failures that can change, wait with backoff and jitter, and raise on the last try.',
        fix: BUG_RETRY_FIX,
        cheer: 'Retry what can change. Raise at the end.'
      }),

      B.bug({
        id: 'm7-bug3', t: 1, src: 'docs', q: 'This code creates an order with a POST and retries on a timeout. Customers report two orders for one click. Click the line that makes duplicates possible.',
        file: 'create_order.py', lang: 'python', code: BUG_POST, bad: [4],
        hint: 'A timeout means that you did not get an answer. Does it mean that the server did nothing?',
        why: 'On a timeout the server may already have created the order and only the reply was lost. A second `POST` creates a second order. A POST is not idempotent by itself. Make one **idempotency key** before the loop and send it with every try, so the server can recognise the repeat and return the first result.',
        fix: BUG_POST_FIX,
        cheer: 'A retry of a write needs an idempotency key.'
      }),

      B.code({
        id: 'm7-tenacity', t: 2, src: 'rec', title: 'The same idea with tenacity', file: 'tenacity_retry.py', lang: 'python', code: TNF,
        steps: [
          { say: 'tenacity (' + G.meta('tenacity') + ') is a library for retries. The same loop becomes a decorator. The output is real.', lines: null },
          { say: '`retry_if_exception_type` says which errors to retry, and `stop_after_attempt(5)` limits the tries.', lines: G.span(TNF, /^    retry=retry_if/, /^    stop=/) },
          { say: '`wait_random_exponential` is full jitter, the same rule as `delay_for`. These waits are tiny so that the file runs fast. In production use something like `multiplier=0.5, max=30`.', lines: G.span(TNF, /^    wait=wait_random_exponential/, /^    wait=wait_random_exponential/) },
          { say: '`before_sleep_log` writes a log line before each wait, and `reraise=True` raises the **original** error after the last try, not a `RetryError`.', lines: G.span(TNF, /^    before_sleep=/, /^    reraise=True/) },
          { say: 'The function fails twice with a 429 and then returns. A `ValueError`, which is not in the retry list, stops at once.', lines: G.span(TNF, /^def fetch_page/, /return "page 1"/) },
          { say: 'The two calls, and what they printed.', lines: G.span(TNF, /^print\("result:"/, /^    print\("a ValueError/) }
        ]
      }),

      B.term({
        id: 'm7-tenacity-run', t: 2, src: 'rec', title: 'Run it',
        say: 'The real output, with Python ' + G.meta('python') + ' and tenacity ' + G.meta('tenacity') + '.',
        lines: function () { return G.plain(TNT, { cmd: 'python tenacity_retry.py' }); },
        after: 'Two WARNING lines, one before each wait, then the result after **3 calls**. The waits are random numbers from a seed set in the file. The `ValueError` was not in the retry list, so the function ran **once** and the error reached the caller.',
        afterKind: 'tip',
        doneSay: 'A library does the loop. You still decide what is worth retrying.'
      }),

      B.cmp({
        id: 'm7-wait', t: 2, src: 'docs', title: 'tenacity wait strategies',
        say: 'Four wait strategies from the tenacity documentation, and what each one is for. Press Next.',
        cols: ['Strategy', 'The wait', 'Use it when'],
        hl: 0,
        rows: [
          ['`wait_fixed(2)`', 'Always 2 seconds.', 'You poll something that takes a known time.'],
          ['`wait_exponential(multiplier=0.5, max=30)`', '0.5, 1, 2, 4 ... up to 30 seconds.', 'One client, a service that needs time to recover.'],
          ['`wait_random_exponential(multiplier=0.5, max=30)`', 'A random time between 0 and the exponential limit. This is full jitter.', 'Many clients hit the same service.'],
          ['`wait_exponential_jitter(multiplier=0.5, max=30, jitter=1)`', 'The exponential value plus a random 0 to 1 second.', 'You want growing waits with a small random spread.']
        ],
        steps: [
          { upto: 2, say: 'A fixed wait or a growing one, for a single caller.' },
          { upto: 4, say: 'Two ways to add randomness, for many callers. The installed version of tenacity says that `initial` is deprecated in favour of `multiplier` in `wait_exponential_jitter`.' }
        ],
        pick: 'For many clients on one service, use **full jitter**: `wait_random_exponential`.'
      }),

      B.order({
        id: 'm7-order', t: 1, src: 'docs', q: 'Put the steps of a safe retry in order.',
        items: ['Call the API with a timeout', 'Sort the answer: is it worth another try?', 'If not, raise the error at once', 'If yes, wait a random time that grows with each try', 'Call again, and after the last allowed try raise the last error'],
        why: 'The timeout comes first, because a hung call never fails. Sorting comes before waiting, because waiting for an error that cannot change only delays the failure. The last step makes sure that a long outage ends as a failed run.',
        cheer: 'Say it as: timeout, sort, stop or wait, try again, raise at the end.'
      }),

      B.talk({
        id: 'm7-idem-talk', t: 1, src: 'docs', title: 'Idempotent: the second run changes nothing',
        say: 'Retries only help if running the job again is safe. Press Next for four ideas that make it safe.',
        items: [
          ['The definition', 'An operation is **idempotent** when doing it twice leaves the same result as doing it once. Setting a value is idempotent. Adding to a total is not.', 'Twice equals once.'],
          ['Why you need it', 'The scheduler retries after a timeout. A person reruns the day. A backfill runs 90 days again. A crash leaves a half-written day. Every one of these runs the job again.', 'Reruns are normal.'],
          ['How', 'Give each row a **key**, then write by key (an upsert), or replace a whole **partition** (a day) in one **transaction**. Do not append blindly.', 'Key, upsert or replace.'],
          ['The test', 'Run the job twice on the same input and compare the two tables. Then kill it halfway and run it again. If the tables differ, the job is not idempotent.', 'Twice, and after a crash.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm7-load', t: 1, src: 'rec', title: 'Five ways to load one day', file: 'load_strategies.py', lang: 'python', code: LSF,
        steps: [
          { say: 'One day of six orders, loaded five different ways into SQLite, and each way is tested against five things that go wrong. Every result in the next screens is a real run of this file.', lines: null },
          { say: 'The data: the day\'s file, a corrected file where O-3 changed from 8.20 to 9.20, and a file with O-6 cancelled. Money is in whole cents.', lines: G.span(LSF, /^DAY = /, /^CANCELLED = /) },
          { say: 'A `Crash` exception, and a helper that writes rows. When `crash` is true it raises after **three** rows, the way a killed job would.', lines: G.span(LSF, /^class Crash/, /^        db\.execute\(sql/) },
          { say: '**append**: a table with no key, and a plain INSERT. **insert with a key**: the same INSERT, into a table with a primary key.', lines: [blk(LSF, 'append')[0], blk(LSF, 'insert_key')[1]] },
          { say: '**delete, then insert**: remove the day, then write it. Every statement commits on its own. **In a transaction**: `BEGIN`, delete, insert, `COMMIT`, and `ROLLBACK` on any error.', lines: [blk(LSF, 'delete_insert')[0], blk(LSF, 'delete_insert_tx')[1]] },
          { say: '**upsert**: `INSERT ... ON CONFLICT DO UPDATE`. A row whose key exists is updated, and a new row is inserted.', lines: G.span(LSF, /^UPSERT = /, /^UPSERT = /) },
          { say: 'The five things that go wrong: a normal run, a rerun, a crash and a rerun, a corrected row, and a row that the source dropped.', lines: G.span(LSF, /^SCENARIOS = \{/, /^\}/) }
        ]
      }),

      B.term({
        id: 'm7-load-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `load_strategies.py`: the final table of each way to load, after each thing that goes wrong. "Right" means that the table equals what the file says.',
        lines: function () { return G.plain(LST, { cmd: 'python load_strategies.py' }); },
        after: 'Read one row at a time. **Append** is wrong in four of five columns. A **primary key** stops the doubling, and it also stops the rerun. **Upsert** misses the dropped row. The two **delete, then insert** variants are right in every column, and the next lab shows how they differ.',
        afterKind: 'tip',
        doneSay: 'Five ways to load. Two of them survive every column.'
      }),

      B.widget({ id: 'm7-lab-idem', kind: 'idem', t: 1, src: 'rec', title: 'Lab: load the same day twice' }),

      B.quiz({
        id: 'm7-q7', t: 1, src: 'rec',
        q: 'The scheduler retried the job, so the plain append ran twice on the same file. What did the table hold, according to the recording?',
        opts: [
          { t: '12 rows and a total of 165.50', fb: '' },
          { t: '6 rows and a total of 82.75', fb: 'That is the result of a single run. The table has no key, so the second run added six more rows.' },
          { t: '12 rows and a total of 82.75', fb: 'The total doubles with the rows.' },
          { t: 'An error on the first duplicate row', fb: 'That happens when the table has a primary key. This table has none.' }
        ],
        ok: 0, why: 'Nothing in a table without a key can tell a second copy from the first, so the second run added six rows and the revenue doubled: 165.50 instead of 82.75.'
      }),

      B.quiz({
        id: 'm7-q8', t: 1, src: 'rec',
        q: 'The job died after 3 rows and was run again. Which way to load ended with 9 rows, and which one ended with only 3?',
        opts: [
          { t: 'Append ended with 9 rows. Insert with a key ended with 3 rows, because the rerun failed on the first duplicate.', fb: '' },
          { t: 'Insert with a key ended with 9 rows. Append ended with 3 rows.', fb: 'It is the other way around.' },
          { t: 'Upsert ended with 9 rows, and delete then insert with 3.', fb: 'Both of those ended with the right 6 rows.' },
          { t: 'All five ended with 6 rows.', fb: 'Append and insert with a key did not.' }
        ],
        ok: 0, why: 'Append kept the 3 rows from the crash and added 6 more. Insert with a key kept the 3 rows, and the rerun stopped on the first row that was already there, so the table stayed at 3 of 6 rows.'
      }),

      B.quiz({
        id: 'm7-q9', t: 2, src: 'rec',
        q: 'The source file dropped O-6, which was cancelled, and the day was loaded again with an upsert. What did the table hold?',
        opts: [
          { t: '6 rows, with the cancelled O-6 still in it', fb: '' },
          { t: '5 rows, which is what the file says', fb: 'An upsert updates and inserts by key. Nothing in it deletes a row that is missing from the file.' },
          { t: '11 rows', fb: 'The key stops duplicates.' },
          { t: 'An error', fb: 'The statement has no reason to fail: every key in the file is valid.' }
        ],
        ok: 0, why: 'An upsert only adds and updates. O-6 was in the first run, and the second file does not mention it, so it stays: 6 rows and 82.75 instead of 5 rows and 76.35. To remove it, delete the day first, or mark rows as deleted.'
      }),

      B.quiz({
        id: 'm7-q10', t: 2, src: 'rec',
        q: 'Both delete variants ended right after the crash and the rerun. What differs while the table waits for the rerun?',
        opts: [
          { t: 'Without a transaction the table holds 3 rows, a partial day. In a transaction it holds 0 rows, the state before the run.', fb: '' },
          { t: 'Nothing differs. Both hold 3 rows.', fb: 'A rollback undoes the delete and the three inserts.' },
          { t: 'Both hold 0 rows.', fb: 'Without a transaction, each insert committed on its own.' },
          { t: 'Without a transaction the table holds 6 rows.', fb: 'The job died after the third row.' }
        ],
        ok: 0, why: 'Every statement commits on its own without a transaction, so the crash left 3 of 6 rows that a dashboard could read. The transaction rolled everything back, so a reader sees the old day or the new day and never half of one.'
      }),

      B.bug({
        id: 'm7-bug4', t: 1, src: 'rec', q: 'The nightly load appends the day\'s orders. The scheduler retried it after a timeout, and revenue for the day doubled. Click the line that is not safe to run twice.',
        file: 'load.py', lang: 'python', code: BUG_APPEND, bad: [2],
        hint: 'What does this statement do when the same rows are already in the table?',
        why: 'A plain `INSERT` into a table with no key adds the rows again every time it runs. In the recording that gave 12 rows and 165.50 instead of 6 rows and 82.75. Delete the day and insert it again in **one transaction**, or upsert by key. Both gave the right table when run twice.',
        fix: BUG_APPEND_FIX,
        cheer: 'Replace the day in one transaction, or upsert by key.'
      }),

      B.code({
        id: 'm7-wm', t: 2, src: 'rec', title: 'A watermark, and how it loses rows', file: 'watermark.py', lang: 'python', code: WMF,
        steps: [
          { say: 'An **incremental** load reads only the rows that changed since the last run. It remembers a **watermark**, the largest `updated_at` that it has seen. The file shows two ways that this goes wrong. The output is real.', lines: null },
          { say: '`load` reads the rows with `updated_at` above the watermark, writes them with an upsert, and moves the watermark. The `overlap` argument reads a little further back.', lines: blk(WMF, 'load') },
          { say: 'Mistake 1: **save the watermark first**. If the job dies before it writes, the watermark has already moved past rows that were never loaded.', lines: G.span(WMF, /^    if rows and save_first:/, /saved before the rows are written/) },
          { say: 'The safe order: write the rows, then move the watermark. A crash leaves the old watermark, and the rerun reads the same rows again.', lines: G.span(WMF, /^    if rows and not save_first:/, /saved after the rows are written/) },
          { say: 'Mistake 2: a **late** row. A slow writer commits a row with an old `updated_at` after the load has passed that time. The run with no overlap never sees it. A 15-minute overlap and an upsert catch it.', lines: [G.at(WMF, /^print\("3\. /), last(WMF)] }
        ]
      }),

      B.term({
        id: 'm7-wm-run', t: 2, src: 'rec', title: 'Run it',
        say: 'The real output of `watermark.py`.',
        lines: function () { return G.plain(WMT, { cmd: 'python watermark.py' }); },
        after: 'Case 1: the watermark moved to 08:10 before the write, the job died, and the rerun read **0** rows. The target held 0 of 3. Case 2: the watermark moved after the write, and the rerun read all 3. Case 3: with no overlap the late row was never read (3 of 4), and with a 15-minute overlap and an upsert all 4 arrived.',
        afterKind: 'warn',
        doneSay: 'Move the watermark after the write, and read a little further back than you need.'
      }),

      B.quiz({
        id: 'm7-q11', t: 2, src: 'rec',
        q: 'In the recording the watermark was saved before the rows were written, and the job died. How many rows did the rerun read?',
        opts: [
          { t: '0, so the target stayed empty', fb: '' },
          { t: '3, because the rerun starts from the beginning', fb: 'The rerun used the watermark that was already moved to 08:10.' },
          { t: '1, the newest row', fb: 'The three rows were at or below the new watermark.' },
          { t: 'It raised an error', fb: 'The query was valid. It matched no rows.' }
        ],
        ok: 0, why: 'The watermark was 08:10, the newest `updated_at`. The rerun asked for rows above it and got none. The rows were lost without an error, which is why the order matters: write first, then move the watermark.'
      }),

      B.decide({
        id: 'm7-decide', t: 2, src: 'rec', title: 'Decision: how does the daily orders load write?',
        scenario: 'Brewline loads one file of orders per day. The scheduler retries on failure and people rerun days. Files are sometimes corrected, and an order can be cancelled after it was first loaded. The recording showed these final tables: an **append** that gave **' + APP2.final.length + ' rows** when run twice, an **upsert** that kept the cancelled order, and two delete-then-insert variants that were right every time.',
        opts: [
          { t: 'Append the file', d: 'The simplest code.', lose: 'Wrong on a rerun, a crash and a correction. The revenue doubles.' },
          { t: 'Upsert by order_id', d: 'Reruns and corrections work.', lose: 'A cancelled order stays in the table, because nothing deletes it.' },
          { t: 'Replace the day in one transaction: delete the day, insert the file', d: 'Right after a rerun, a crash, a correction and a cancellation. A reader never sees half a day.', lose: '' },
          { t: 'Delete the day, then insert, with each statement committed on its own', d: 'Also right at the end.', lose: 'After a crash the table holds a partial day, and a dashboard can show it.' }
        ],
        pick: 2,
        why: 'Replacing the day in one transaction gave the right table in all five columns, and it never left a partial day. It fits a daily file well, because the day is the natural unit.',
        when: 'For a large table that is updated row by row from a stream, with no day to replace, use an upsert on a key and a way to mark deletes. For a very large day, write the new day to a staging table and swap it in with one statement.'
      }),

      B.challenge({
        id: 'm7-ch1', t: 1, lang: 'python', file: 'idempotent_load.py',
        q: '**Coding round: load a day, safely.** Write `load_day(db, day, rows)` for SQLite that replaces the orders of one `day` with `rows`, a list of `(order_id, total_cents)`. Running it twice must leave the same table. A failure in the middle must leave the table as it was. Other days must not change. Return the number of rows written.',
        data: [{ name: 'orders (the table)', cols: ['order_id', 'day', 'total_cents'], rows: [['O-1', '2026-03-09', '1250'], ['O-2', '2026-03-09', '475'], ['O-3', '2026-03-10', '820'], ['O-4', '2026-03-10', '1990'], ['O-5', '2026-03-10', '3100']] }],
        starter: 'import sqlite3\n\ndef load_day(db, day, rows):\n    ...',
        hints: ['Delete the day, then insert the new rows. The day is the unit that you replace.', 'Do both in one transaction: `BEGIN` first, `COMMIT` at the end, and `ROLLBACK` in an `except` that re-raises.', 'Use `executemany` for the insert, and return `len(rows)`.'],
        sol: fn(ILF, 'load_day'),
        res: { msg: 'tests passed in the recording', cols: ['step', 'result'], rows: ILROWS },
        expl: ['The delete and the inserts are one transaction, so a failure rolls both back. The table after the failed run was the same as before it, as the recording shows.', 'Running it twice deletes the day and inserts the same rows again, so the table is the same. A corrected file replaces the day, and a row that the file dropped disappears.', 'The `WHERE day = ?` keeps Monday untouched when Tuesday is loaded.'],
        cx: 'O(n) in the rows of the day, one transaction.'
      }),

      B.challenge({
        id: 'm7-ch2', t: 1, lang: 'python', file: 'call_with_retry.py',
        q: '**Coding round: a retry that tests can run.** Write `call_with_retry(fn, *, retry_on, attempts, base, cap, sleep, rng)`. It calls `fn()`. On an exception in `retry_on` it calls `sleep(rng.uniform(0, min(cap, base * 2 ** (n - 1))))` for the n-th failure and tries again. After `attempts` calls it raises the last error. Any other exception is raised at once.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['fails twice with Transient, then works', 'returns "ok" after 3 calls, 2 waits'], ['raises ValueError', 'raised at once, 1 call, no waits'], ['always raises Transient, attempts=4', 'raises the 4th error, 4 calls, 3 waits'], ['rng always picks the top, attempts=8', 'waits 0.5, 1, 2, 4, 8, 8, 8']] }],
        starter: 'def call_with_retry(fn, *, retry_on=(Exception,), attempts=4, base=0.5, cap=8.0, sleep, rng):\n    ...',
        hints: ['Loop over `range(1, attempts + 1)`. `return fn()` inside a `try`.', '`except retry_on:` catches only what is worth retrying. Anything else is not caught here, so it propagates.', 'On the last attempt re-raise with a bare `raise`. Otherwise sleep and go round again.'],
        sol: fn(CRF, 'call_with_retry'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: CRROWS },
        expl: ['`except retry_on` is what separates a retry from a swallow. A `ValueError` is not in the tuple, so it left the function on the first call.', '`sleep` and `rng` are arguments, so a test passes a list\'s `append` and a stub, and the test finishes at once. The stub that always picks the top of the range shows the cap at work: 8, 8, 8.', 'The bare `raise` on the last attempt keeps the original traceback. `raise` is how an outage ends as a failed run.'],
        cx: 'At most `attempts` calls and `attempts - 1` sleeps.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: Tuesday revenue is exactly doubled', time: '09:40',
        alert: 'The Tuesday revenue on the dashboard is twice the till total, to the cent. The Monday and Wednesday numbers are right. The load job shows one failed attempt and one successful attempt for Tuesday.',
        clues: ['The job appends the day\'s file to `orders`, a table with no key.', 'The first attempt timed out while it was writing, and the scheduler retried it.', 'The log of the first attempt says that it wrote rows before the timeout.'],
        opts: [
          { t: 'Count the rows for Tuesday by order_id, and compare them with the file', fb: '' },
          { t: 'Divide Tuesday\'s revenue by two in the dashboard', fb: 'It hides the problem for one day and leaves the table wrong. The next retry doubles another day.' },
          { t: 'Turn off the retries', fb: 'The retry did its job. The load is the part that cannot run twice.' },
          { t: 'Delete the whole table and reload it', fb: 'It may work once, and it does not say why the table doubled. It also risks the days that are right.' }
        ],
        best: 0, why: 'A count by `order_id` shows each Tuesday order twice in a minute. In the recording, an append run twice gave 12 rows and 165.50 instead of 6 rows and 82.75, and a crash then a rerun gave 9 rows.',
        checks: [
          ['Group Tuesday by order_id and count', 'Each id appears twice or three times, which means that the same rows were written again.'],
          ['Read the first attempt\'s log', 'It wrote part of the file before the timeout, and the retry wrote all of it again.'],
          ['Look at the load statement', 'A plain `INSERT` into a table with no key.'],
          ['Fix the day and the code', 'Delete the duplicates, and change the load to replace the day in one transaction.'],
          ['Add a test that loads the same file twice, and one that kills the load halfway', 'The table must be the same in both cases.']
        ],
        tell: 'Tuesday revenue was doubled. The first load attempt timed out after writing part of the file, the scheduler retried, and the load is an append into a table with no key, so the retry wrote the rows again. I removed the duplicates by order_id and changed the load to delete the day and insert it again in one transaction. A test now loads the same file twice and kills the load halfway, and the table has to be the same each time.',
        prevent: ['Every load is idempotent: replace a partition in a transaction, or upsert by key.', 'The target table has a key on the business id, so a duplicate is an error and not a silent copy.', 'A test runs the load twice and after a crash.', 'A check compares the row count in the table with the row count in the file after every load.']
      }),

      B.qa({
        id: 'qa-retry', t: 1, tag: 'Retries', secs: 60,
        q: 'How do you retry a call to a flaky API?',
        pts: ['Only retry failures that can change: timeouts, 429, 5xx', 'Exponential backoff with jitter, and a cap', 'A limited number of tries, then raise', 'A timeout on every call'],
        short: 'I retry only the failures that can change: timeouts, connection resets, 429 and 5xx answers. A 400 or a 404 will fail again, so I stop and raise. I wait with exponential backoff and full jitter: a random time between 0 and a limit that doubles, with a cap, so that many clients do not come back together. I limit the number of tries and raise the last error, so a long outage ends as a failed run. Every call has a timeout. In a recording of fifty clients against a service that took ten requests per second, retrying at once sent 330 requests for 10 successes. A write needs an idempotency key, or it cannot be retried safely.',
        fu: [['Why jitter?', 'Without it, clients that failed together retry together. Jitter spreads them. In the recording the biggest burst of retries fell from 40 to 14 in 100 ms.'], ['Does backoff make it faster?', 'No. In the recording a fixed wait finished in 4 seconds and jitter in 7.45. Backoff protects the service, and a client that knows the limit does better with a rate limiter.']],
        trap: 'Retrying every exception, with no limit, and no timeout.',
        real: 'Tell about a retry that caused trouble, or one that saved a night.'
      }),

      B.qa({
        id: 'qa-idempotent', t: 1, tag: 'Idempotency', secs: 60,
        q: 'What does idempotent mean, and how do you make a load idempotent?',
        pts: ['Running it twice leaves the same result as once', 'Append is not idempotent', 'Replace the partition in one transaction, or upsert by key', 'Test it: run twice, and kill it halfway'],
        short: 'Idempotent means that running the operation twice leaves the same result as running it once. A load that appends is not, because a retry adds the rows again: in a recording the table had 12 rows and double the revenue after two runs. I make a load idempotent by writing by key, with an upsert, or by replacing a whole partition, such as a day, with a delete and an insert in one transaction. The transaction matters: without it a crash leaves a partial day. I test by running the load twice on the same file and by killing it halfway, and the table has to be the same.',
        fu: [['Upsert or replace the partition?', 'For a daily file I replace the day, since it also removes rows that the source dropped. In the recording an upsert kept a cancelled order. For row-level changes from a stream I use an upsert on a key.'], ['What if the table is huge?', 'Write the new day to a staging table, check it, then swap it in. The reader sees the old day or the new day.']],
        trap: 'Saying "I make sure the job only runs once". Schedulers retry, and people rerun days.',
        real: 'Describe how you would prove that a load is idempotent.'
      }),

      B.qa({
        id: 'qa-errors', t: 1, tag: 'Errors', secs: 60,
        q: 'How do you handle errors in a pipeline: catch, log, or fail?',
        pts: ['Catch the specific error you can handle', 'Never `except Exception: pass`', 'Count and keep what you drop', 'A non-zero exit code when the run is wrong'],
        short: 'I catch the specific error I know how to handle, such as `ValueError` for a bad number, and I let everything else stop the run. I never write `except Exception: pass`. In a recording that loader dropped two of six rows, printed "success" and exited with 0. I keep the rejected rows with the reason for each, I set a limit, and when the share of bad rows is over it the program exits with code 1, which is what the scheduler reads. I use `raise ... from` to add context and keep the cause, and I log enough to find the row.',
        fu: [['Fail the whole run for one bad row?', 'Not always. Set aside bad rows up to a limit, say 5 percent, and fail above it. The limit is a number in the code, with a test.'], ['What does finally do?', 'It runs every time, so it holds the cleanup: close the file, release the lock.']],
        trap: 'Catching everything "so the job does not crash". A crash that someone sees is better than a wrong table that nobody sees.',
        real: 'Tell about a failure that went unnoticed, and what fixed it.'
      }),

      B.qa({
        id: 'qa-delivery', t: 2, tag: 'Idempotency', secs: 60,
        q: 'Explain at-most-once, at-least-once and exactly-once, and what you build on.',
        pts: ['At-most-once: no retries, data can be lost', 'At-least-once: retries, duplicates are possible', 'Exactly-once effect = at-least-once + idempotent writes', 'A key to deduplicate on'],
        short: 'At-most-once never retries, so a failure loses data. At-least-once retries until it succeeds, so a failure can deliver the same record twice. Exactly-once delivery is hard to promise end to end, so I build the **effect**: at-least-once delivery, plus a write that ignores or overwrites a repeat. That means a key on every record, and an upsert or a replace by partition. In a recording, an upsert and a delete-then-insert in a transaction gave the right table after a rerun, and a plain insert gave double.',
        fu: [['Where does the key come from?', 'A business id, such as the order id, or an event id from the source. If there is none, a hash of the fields that identify the record.'], ['How do queues fit in?', 'Most queues deliver at least once, so the consumer must tolerate repeats.']],
        trap: 'Promising "exactly once" with no key and no idempotent write.',
        real: 'Say where your pipelines get the key from.'
      }),

      B.qa({
        id: 'qa-poison', t: 2, tag: 'Errors', secs: 60,
        q: 'What do you do with a record that fails every time?',
        pts: ['Do not retry it forever', 'Set it aside with the reason (quarantine or dead-letter)', 'Alert when the count passes a limit', 'Fix and replay later'],
        short: 'I do not retry a record that will fail the same way, because the data is bad and not the network. I set it aside in a quarantine table or file with the row, the error and the time, and the run goes on. A limit decides when too many bad records fail the run. Someone looks at the quarantine, fixes the data or the code, and replays the records through the same idempotent load. A retry limit stops one poison record from blocking a queue.',
        fu: [['How do you know it is poison?', 'The error class: a validation error will not change, a timeout may. After the maximum number of tries it goes to the quarantine anyway.'], ['How do you replay?', 'Through the normal load, which is idempotent, so a replay cannot double anything.']],
        trap: 'A retry loop with no limit on a bad record, which blocks everything behind it.',
        real: 'Describe where bad records go in your pipelines.'
      }),

      B.qa({
        id: 'qa-watermark', t: 2, tag: 'Idempotency', secs: 60,
        q: 'You load incrementally with a watermark. What can go wrong?',
        pts: ['Saving the watermark before the write loses rows', 'Late rows with an old timestamp are missed', 'Overlap window plus an upsert', 'Clock differences between systems'],
        short: 'Two things. If the watermark is saved before the rows are written and the job dies, the rerun starts past rows that were never loaded: in a recording it read 0 rows and the target held 0 of 3. And a late row, committed after the load passed its `updated_at`, is never read: with no overlap the target held 3 of 4 rows. I write first and move the watermark after. I read a window that overlaps the last run, say 15 minutes, and I write with an upsert, so that reading a row twice is harmless. Clocks on different machines can disagree, so I prefer a source-side sequence or a change log when there is one.',
        fu: [['Why not read everything every time?', 'For small tables I do exactly that. The watermark is for tables that are too big to reload.'], ['Deleted rows?', 'A watermark never sees them. Use a soft delete flag, a change log, or compare keys.']],
        trap: 'Saving "the time the job started" as the watermark and ignoring late commits.',
        real: 'Tell what your incremental loads use as a watermark.'
      }),

      B.qa({
        id: 'qa-post', t: 2, tag: 'Retries', secs: 60,
        q: 'Can you retry a POST request?',
        pts: ['A timeout does not mean that the server did nothing', 'POST is not idempotent by itself', 'An idempotency key, sent with every try', 'GET, PUT and DELETE are idempotent by definition'],
        short: 'Only with care. After a timeout I do not know whether the server did the work and the reply was lost, so a second POST can create a second order. GET, PUT and DELETE are defined as idempotent, and a POST is not. For a POST I make an idempotency key once, send it with every try, and the server stores the first result and returns it again for a repeat. Where the API has no such key, I check whether the thing exists before I retry, or I make the write an upsert on a key that I choose.',
        fu: [['Which APIs have idempotency keys?', 'Many payment APIs do. Check the documentation of the one that you use.'], ['What if there is no key and no lookup?', 'Do not retry automatically. Raise, and let a person decide.']],
        trap: 'A retry loop around every request, whatever the method.',
        real: 'Describe how you would make a payment call safe to retry.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Safe Rerun', color: '#BBF7D0',
        pts: [
          'Catch the **specific** error you can handle. `except Exception: pass` loaded 4 of 6 rows, printed success and exited with **0**.',
          'Retry only what can change: **timeouts, 429 and 5xx**. Use **backoff with jitter**, a cap and a limit on the tries, and raise at the end.',
          'In the simulation, retrying at once sent **' + AT.requests + '** requests for **' + AT.succeeded + '** successes. Jitter cut the biggest burst of retries from **' + FX.retry_burst + '** to **' + JT.retry_burst + '**, at the cost of more requests and time.',
          'A plain append run twice gave **12 rows and 165.50**. Replace the day in **one transaction**, or **upsert** by key. An upsert keeps a row that the source dropped.',
          'Save a **watermark after the write**, read with an **overlap**, and write with an upsert.'
        ],
        lines: [
          'My loads can run twice, and after a crash, and give the same table.',
          'I retry with a timeout, a limit, backoff and jitter, and only for failures that can change.',
          'A failing run exits with a non-zero code and says why.'
        ]
      })
    ]
  });
})();
