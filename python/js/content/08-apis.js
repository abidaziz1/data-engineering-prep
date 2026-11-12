/* Mission 8: APIs and databases. Real results from requests against a fake API on this machine, SQLite, SQLAlchemy. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ABF = G.file('m8/api_basics.py'), PGF = G.file('m8/paginate.py'), RLF = G.file('m8/rate_limit.py'), SPF = G.file('m8/sql_params.py'), TXF = G.file('m8/transactions.py');
  var SAF = G.file('m8/sqlalchemy_core.py'), FAF = G.file('m8/fetch_all.py'), UBF = G.file('m8/upsert_batches.py'), BIF = G.file('m8/batch_insert.py');
  var ABT = G.text('m8/api_basics.py'), PGT = G.text('m8/paginate.py'), RLT = G.text('m8/rate_limit.py'), SPT = G.text('m8/sql_params.py'), TXT = G.text('m8/transactions.py');
  var SAT = G.text('m8/sqlalchemy_core.py'), FAT = G.text('m8/fetch_all.py'), UBT = G.text('m8/upsert_batches.py'), BIT = G.text('m8/batch_insert.py');
  var PG = G.counts('m8.paging'), BT = G.counts('m8.batch');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }
  function pcase(style, sc) { return PG.cases.filter(function (c) { return c.style === style && c.scenario === sc; })[0]; }

  var OI = pcase('offset', 'insert'), OD = pcase('offset', 'delete'), CI = pcase('cursor', 'insert'), CD = pcase('cursor', 'delete'), ON = pcase('offset', 'none');
  G.expect(/^200 application\/json/.test(ABT) && /404 Not Found \{'error': 'no such order'\}/.test(ABT) && /raise_for_status: 404 Client Error: Not Found for url: http:\/\/127\.0\.0\.1:PORT\/orders\/O-999/.test(ABT) && /timeout: ReadTimeout/.test(ABT), 'the API basics: 200, 404, raise_for_status and a read timeout');
  G.expect(ON.rows === 23 && ON.unique === 23 && OI.rows === 26 && OI.unique === 23 && OI.repeated.join() === 'O-118,O-119,O-120' && OI.missed.length === 0, 'offset pages repeat three orders when three arrive');
  G.expect(OD.rows === 20 && OD.missed.join() === 'O-115,O-116,O-117' && OD.repeated.length === 0, 'offset pages skip three orders when three are cancelled');
  G.expect(CI.rows === 26 && CI.unique === 26 && CI['new'].join() === 'O-123,O-124,O-125' && CD.rows === 20 && CD.missed.length === 0 && CD.repeated.length === 0, 'cursor pages are right in both cases');
  G.expect(/429 Too Many Requests, Retry-After: 1, so wait 1 s/.test(RLT) && /call 4: ok in 1 s/.test(RLT) && /call 5: ok in 0 s/.test(RLT), 'the fourth call in a second was refused and waited one second');
  G.expect(/rows returned: 3 of 3/.test(SPT) && /error: near "Brien": syntax error/.test(SPT) && /Conan O'Brien -> \[\]/.test(SPT), 'the f-string query returned every row and broke on an apostrophe, and the parameter did neither');
  G.expect(/now: \{'London': 5, 'Singapore': 45\}\nmove 30 kg/.test(TXT) && /CHECK constraint failed: beans_kg >= 0\n  now: \{'London': 5, 'Singapore': 45\}/.test(TXT) && /now: \{'London': 5, 'Singapore': 75\} -> total 80 kg, and it was 50/.test(TXT), 'the transaction rolled back, and the separate commits created 30 kg from nothing');
  G.expect(/tests passed$/.test(FAT) && /tests passed$/.test(UBT) && /2,500 rows in batches of 1,000: 3 batches, 2500 rows/.test(UBT), 'both coding rounds pass');
  var M = BT.methods, EACH = M['commit for every row'], MANY = M['one transaction, executemany'], LOOP = M['one transaction, execute in a loop'], CH = M['executemany, commit every 1,000'];
  G.expect(EACH && MANY && LOOP && CH && EACH.seconds / MANY.seconds > 50 && EACH.seconds / LOOP.seconds > 50 && CH.seconds < EACH.seconds / 20, 'a commit for every row is more than 50 times slower than one transaction');
  var RATIO = Math.round(EACH.seconds / MANY.seconds / 10) * 10;
  G.expect(/sqlalchemy 2\./.test(SAT) && /rows: \[\{'store': 'London', 'cents': 1250\}, \{'store': 'Singapore', 'cents': 820\}\]/.test(SAT), 'SQLAlchemy returned the grouped rows');

  var BUG_TIMEOUT = ['def fetch_orders(page):', '    r = requests.get(f"{BASE}/orders", params={"page": page})', '    r.raise_for_status()', '    return r.json()'].join('\n');
  var BUG_TIMEOUT_FIX = ['def fetch_orders(page):', '    r = requests.get(f"{BASE}/orders", params={"page": page}, timeout=(3.05, 30))  # connect, read', '    r.raise_for_status()', '    return r.json()'].join('\n');
  var BUG_SQL = ['def find_customer(conn, name):', '    sql = f"SELECT * FROM customers WHERE name = \'{name}\'"', '    return conn.execute(sql).fetchall()'].join('\n');
  var BUG_SQL_FIX = ['def find_customer(conn, name):', '    return conn.execute("SELECT * FROM customers WHERE name = ?", (name,)).fetchall()'].join('\n');
  var BUG_COMMIT = ['def load(conn, rows):', '    for row in rows:', '        conn.execute("INSERT INTO orders VALUES (?, ?, ?)", row)', '        conn.commit()'].join('\n');
  var BUG_COMMIT_FIX = ['def load(conn, rows):', '    with conn:  # one transaction for all rows', '        conn.executemany("INSERT INTO orders VALUES (?, ?, ?)", rows)'].join('\n');
  var FAROWS = FAT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });
  var UBROWS = UBT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm8', n: 8, title: 'APIs and databases', short: 'APIs', blurb: 'Pages that shift, limits, parameters, transactions and batches', minutes: 34,
    focus: ['src', 'ing'],
    goals: [
      'Call an API with a **timeout**, check the status and read the JSON.',
      'Page through an API with a **cursor**, and say why **offset** pages repeat or skip rows.',
      'Obey **429** and `Retry-After`.',
      'Pass values to SQL as **parameters**, never inside the string.',
      'Use a **transaction** and **batches** to write fast and all-or-nothing.'
    ],
    say: 'Mission 8 is where most pipelines start: an API on one side and a database on the other. The API is a fake Brewline partner API that runs on this machine, so every page, every 429 and every timeout is a real answer. The database is SQLite, which has the same rules for transactions and parameters that you will meet in other databases.',
    scenes: [
      B.talk({
        id: 'm8-talk', t: 1, src: 'docs', title: 'An API is a slow, shared and changing database',
        say: 'Press Next for four things that an API does and a local table does not.',
        items: [
          ['It can hang', 'A call can wait for ever unless you set a timeout. Every call needs one.', 'Set a timeout.'],
          ['It answers in pages', 'You get 100 rows and a way to ask for the next 100. How you ask decides whether rows repeat or go missing.', 'Page with a cursor.'],
          ['It limits you', 'After too many calls it answers 429 and often says how long to wait. A good client waits that long.', 'Obey Retry-After.'],
          ['It changes while you read', 'Orders arrive and are cancelled during your extract. The extract must still be right.', 'Plan for change.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm8-basics', t: 1, src: 'rec', title: 'One call, one answer', file: 'api_basics.py', lang: 'python', code: ABF,
        steps: [
          { say: 'A GET, a 404 and a timeout, against the fake Brewline API. The output is real.', lines: null },
          { say: 'A `Session` reuses the connection. `params` builds the query string for you, and `timeout=5` limits the wait to 5 seconds.', lines: G.span(ABF, /^with requests\.Session/, /timeout=5\)/) },
          { say: 'The status code, a header and the JSON body. The body is a dict with `items` and `page`.', lines: G.span(ABF, /print\(r\.status_code, r\.headers/, /print\("keys:"/) },
          { say: 'A missing order is a 404. `requests` does **not** raise for it. You get a normal response with `status_code` 404.', lines: G.span(ABF, /orders\/O-999/, /print\(r\.status_code, r\.reason/) },
          { say: '`raise_for_status()` turns a 4xx or 5xx answer into an `HTTPError`. Call it on every response, or you will parse an error page as data.', lines: G.span(ABF, /^    try:/, /raise_for_status:/) },
          { say: 'A slow answer plus `timeout=0.5` raises `Timeout`, here `ReadTimeout`, after half a second.', lines: [G.at(ABF, /\/slow/) - 1, G.at(ABF, /print\("timeout:/)] }
        ]
      }),

      B.term({
        id: 'm8-basics-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `api_basics.py`. The port is replaced by PORT, because the server picks a free one each time.',
        lines: function () { return G.plain(ABT, { cmd: 'python api_basics.py' }); },
        after: 'The 404 printed a normal line: `requests` returned a response and did not raise. Only `raise_for_status()` raised, and the message has the status and the URL. The slow call raised `ReadTimeout`, because the timeout was shorter than the server\'s delay.',
        afterKind: 'tip',
        doneSay: 'A status code is data until you check it.'
      }),

      B.bug({
        id: 'm8-bug1', t: 1, src: 'docs', q: 'A nightly job calls a partner API. One night the partner\'s server stops answering, and the job runs for 9 hours until someone kills it. Click the line that allows this.',
        file: 'extract.py', lang: 'python', code: BUG_TIMEOUT, bad: [2],
        hint: 'How long does this call wait for an answer?',
        why: '`requests` has no default timeout, so a connection that never answers waits for ever. The documentation says that nearly all production code should set one. Pass `timeout=(connect, read)`, and let the retry code from mission 7 decide what to do when it fires.',
        fix: BUG_TIMEOUT_FIX,
        cheer: 'Every network call gets a timeout.'
      }),

      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'A paginated extract, step by step', g: 'api', legend: true,
        steps: [
          { say: 'The extract loop, the API, a page, a staging file and a checkpoint. Press Next to follow one page.', cap: 'Nothing has run yet.' },
          { say: 'Step 1. The loop asks for the page after the last cursor, with a timeout.', on: ['r1'], focus: ['loop', 'api'], cap: 'Ask for the next page.' },
          { say: 'Step 2. The API answers 200 with a page: the items and the next cursor.', on: ['r2'], focus: ['api', 'page'], cap: 'A page comes back.' },
          { say: 'Step 3. The loop writes the page to a staging file **first**.', on: ['r3'], focus: ['page', 'file'], tags: ['tg_safe'], cap: 'Write the page.' },
          { say: 'Step 4. Only then is the cursor saved in the checkpoint. If the job dies between the two steps, the next run asks for the same page again and writes it again, which a rerunnable write can take.', on: ['r4'], focus: ['file', 'ckpt'], cap: 'Save the cursor after the write.' },
          { say: 'Step 5. The saved cursor goes back to the loop for the next request. When it is empty the loop stops.', on: ['r5'], focus: ['ckpt', 'loop'], tags: ['tg_stop'], cap: 'Next cursor, or stop.' },
          { say: 'Step 6. If the API answers 429, the loop waits for `Retry-After` and asks for **the same page** again.', on: ['r6'], focus: ['api', 'loop'], cap: 'Wait, then ask again.' }
        ]
      }),

      B.code({
        id: 'm8-paging', t: 1, src: 'rec', title: 'Offset pages and cursor pages', file: 'paginate.py', lang: 'python', code: PGF,
        steps: [
          { say: 'The same 23 orders, read two ways, while the data changes after the first page. The output is real.', lines: null },
          { say: '**Offset** pages ask for "page 2". The server counts from the start of its newest-first list.', lines: blk(PGF, 'fetch_offset') },
          { say: '**Cursor** pages ask for "the 5 orders after O-104". The cursor is the id of the last order that was read.', lines: blk(PGF, 'fetch_cursor') },
          { say: 'For each case the program notes which orders exist before the run, reads everything, and then compares with the orders that are still there afterwards.', lines: G.span(PGF, /before = set\(ids\(sid\)\)/, /stayed = before/) },
          { say: 'The table counts the rows read, the unique ids, the ids read more than once, and the orders that existed the whole time but were never read.', lines: G.span(PGF, /^        print\(f"\{style/, /^        print\(f"\{style/) }
        ]
      }),

      B.term({
        id: 'm8-paging-run', t: 1, src: 'rec', title: 'Run it',
        say: 'Read the table row by row.',
        lines: function () { return G.plain(PGT, { cmd: 'python paginate.py' }); },
        after: 'With nothing changing, both styles read all 23 orders. When 3 new orders arrive, offset pages read **' + OI.rows + '** rows with only **' + OI.unique + '** different ones: **3 repeated**. When 3 orders are cancelled, offset pages read **' + OD.rows + '** rows and **missed 3**. Cursor pages were right in both cases.',
        afterKind: 'warn',
        doneSay: 'Offset pages are wrong in both directions. Cursor pages are not.'
      }),

      B.widget({ id: 'm8-lab-paging', kind: 'paging', t: 1, src: 'rec', title: 'Lab: paging through an API that changes' }),

      B.quiz({
        id: 'm8-q1', t: 1, src: 'rec',
        q: 'Three new orders arrived after page 1, and the extract used offset pages of 5. Which orders did it read twice, according to the recording?',
        opts: [
          { t: OI.repeated.join(', '), fb: '' },
          { t: 'The three new orders', fb: 'The three new orders went to the top, after page 1 was read, so the extract never reached them.' },
          { t: 'None: offset pages are safe for a list that grows', fb: 'The recording shows 26 rows read for 23 different orders.' },
          { t: 'The first three orders on page 1', fb: 'The repeats are the **last** three of page 1: new orders pushed them down onto page 2.' }
        ],
        ok: 0, why: 'The list is newest first, so three new orders at the top moved every order down three places. The last three orders of page 1 became the first three of page 2: ' + OI.repeated.join(', ') + '.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1, src: 'rec',
        q: 'Three orders were cancelled after page 1, and the extract used offset pages. What did it miss, and what did it say about it?',
        opts: [
          { t: OD.missed.join(', ') + ', and it raised no error', fb: '' },
          { t: 'The three cancelled orders, and it raised an error', fb: 'The cancelled orders were on page 1 and had been read. The extract missed three others.' },
          { t: 'Nothing: 20 rows were read, which is right', fb: '20 rows is 3 short of the orders that stayed.' },
          { t: 'The last three orders in the list', fb: 'The missed orders were in the middle, right after page 1.' }
        ],
        ok: 0, why: 'The orders moved up three places, so page 2 started three places too late and skipped ' + OD.missed.join(', ') + '. The API answered 200 every time, so nothing looked wrong.'
      }),

      B.cmp({
        id: 'm8-cmp', t: 1, src: 'docs', title: 'Ways to page through an API',
        say: 'Most APIs offer one or two of these. Press Next to compare them.',
        cols: ['Style', 'Request looks like', 'Rows change while you read', 'Use it when'],
        hl: 0,
        rows: [
          ['Offset', '`?page=2&per_page=100`', 'Repeats or skips rows, as the recording showed.', 'The data is a fixed snapshot, or the API gives nothing better.'],
          ['Cursor (token)', '`?cursor=abc123`', 'Safe. The server decides what the token means.', 'The API offers it. This is the first choice.'],
          ['Keyset', '`?after=O-104&limit=100`', 'Safe, if the key is unique and sorted. The recording used this.', 'You can sort on a unique, stable key.'],
          ['Time window', '`?updated_since=2026-03-14T00:00Z`', 'Late rows can be missed. Read with an overlap (mission 7).', 'You want only what changed.'],
          ['Bulk export', 'A file that the partner prepares', 'A snapshot at one moment. Nothing shifts.', 'Millions of rows, and the API has an export.']
        ],
        steps: [
          { upto: 3, say: 'Offset is the simplest and the least safe. Cursor and keyset pages follow the data and not a position.' },
          { upto: 5, say: 'A time window and a bulk export answer a different question: what changed, or a snapshot of everything.' }
        ],
        pick: 'Prefer **cursor or keyset** pages. Use offset only for data that does not change while you read.'
      }),

      B.code({
        id: 'm8-rate', t: 1, src: 'rec', title: 'Obeying 429 and Retry-After', file: 'rate_limit.py', lang: 'python', code: RLF,
        steps: [
          { say: 'The fake API lets a client make 3 requests in each second. The fourth gets a 429. The output is real.', lines: null },
          { say: 'A 429 is not an error to give up on. The server says `Retry-After`, the number of seconds to wait, so the client waits that long.', lines: G.span(RLF, /if r\.status_code == 429:/, /continue/) },
          { say: '`continue` asks again. After five tries it raises, so a server that never relents ends as a failed run.', lines: G.span(RLF, /^    for attempt in range/, /still limited after/) },
          { say: 'Six calls in a row. Calls 1 to 3 pass at once, call 4 is refused, and the client waits.', lines: [G.at(RLF, /^with requests\.Session/), last(RLF)] }
        ]
      }),

      B.term({
        id: 'm8-rate-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `rate_limit.py`. It really waited one second.',
        lines: function () { return G.plain(RLT, { cmd: 'python rate_limit.py' }); },
        after: 'Calls 1 to 3 took no time. Call 4 got a **429 with `Retry-After: 1`**, waited one second and then went through, and calls 5 and 6 passed because a new second had started. Reading the header is better than a guess: the server knows its own limit.',
        afterKind: 'tip',
        doneSay: 'Wait as long as the server says.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1, src: 'rec',
        q: 'In the recording the 4th call within one second got a 429. What did the client do, and how long did call 4 take?',
        opts: [
          { t: 'It read `Retry-After: 1`, waited one second and asked again. Call 4 took about 1 s.', fb: '' },
          { t: 'It gave up and raised an error', fb: 'The loop allows five tries, and the second one worked.' },
          { t: 'It asked again at once, three more times', fb: 'It would have used all its tries in one second. The recording shows a 1 s wait.' },
          { t: 'It slept for a fixed 10 seconds', fb: 'The wait came from the header: 1 second.' }
        ],
        ok: 0, why: 'The header said how long to wait, and the client used it. Call 4 took one second, and calls 5 and 6 passed at once because a new second had started.'
      }),

      B.cmp({
        id: 'm8-dbapi', t: 1, src: 'docs', title: 'Talking to a database from Python',
        say: 'Python databases follow the same small interface, the DB-API (PEP 249). Press Next for the parts and the one difference that matters.',
        cols: ['Piece', 'What it does', 'Note'],
        hl: 0,
        rows: [
          ['`connect(...)`', 'Opens a connection. SQLite, PostgreSQL and DuckDB each have their own `connect`.', 'Credentials come from the environment, never from the code (mission 13).'],
          ['`execute(sql, params)`', 'Runs one statement. The values go in `params`, never inside the `sql` text.', 'The placeholder style differs: SQLite uses `?` or `:name`, psycopg uses `%s`.'],
          ['`executemany(sql, rows)`', 'Runs one statement for many rows.', 'Much faster than a Python loop of `execute`.'],
          ['`commit()` and `rollback()`', 'Save or undo everything since the transaction began.', 'In `sqlite3`, `with conn:` commits on success and rolls back on an error.'],
          ['`fetchone()`, `fetchall()`', 'Read the result.', '`fetchall` loads every row into memory. Iterate for a large result.']
        ],
        steps: [
          { upto: 3, say: 'Open a connection, run statements with parameters, and run many rows with `executemany`.' },
          { upto: 5, say: 'Control the transaction yourself, and read results without loading everything.' }
        ],
        pick: 'Values go in **parameters**. The placeholder style depends on the driver, so read its page.'
      }),

      B.code({
        id: 'm8-sql', t: 1, src: 'rec', title: 'A value inside the SQL string', file: 'sql_params.py', lang: 'python', code: SPF,
        steps: [
          { say: 'Two ways to put a name into a query, tried with three names. SQLite, in memory. The output is real.', lines: null },
          { say: 'The unsafe way builds the SQL with an f-string. The database sees one text, and it cannot tell your SQL from the name.', lines: blk(SPF, 'find_unsafe') },
          { say: 'The safe way sends the SQL and the value separately. The `?` marks where the value goes, and the driver never reads the value as SQL.', lines: blk(SPF, 'find_safe') },
          { say: 'A normal name works in both. An apostrophe breaks the f-string. And a name that is itself SQL changes what the query does.', lines: G.span(SPF, /^print\("a normal name/, /rows returned/) },
          { say: 'The same names through the parameter: no error, and no match, because no customer has those names.', lines: G.span(SPF, /^print\("the same two names/, /x' OR/) }
        ]
      }),

      B.term({
        id: 'm8-sql-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `sql_params.py`.',
        lines: function () { return G.plain(SPT, { cmd: 'python sql_params.py' }); },
        after: 'The apostrophe in `Conan O\'Brien` ended the string early, so SQLite reported a **syntax error**. The name `x\' OR \'1\'=\'1` turned the condition into "always true", and the query returned **3 of 3** customers. That is SQL injection. With a parameter, both names were treated as plain text.',
        afterKind: 'warn',
        doneSay: 'Parameters are for correctness first and security second.'
      }),

      B.bug({
        id: 'm8-bug2', t: 1, src: 'rec', q: 'This function finds a customer by name. It works in tests, fails for a customer called O\'Brien, and a security review flags it. Click the line.',
        file: 'customers.py', lang: 'python', code: BUG_SQL, bad: [2],
        hint: 'Where does `name` end up?',
        why: 'The f-string puts the name inside the SQL text. An apostrophe ends the string early (a syntax error in the recording), and a crafted name changes the query (3 of 3 rows returned). Pass the value as a parameter: `execute("... WHERE name = ?", (name,))`.',
        fix: BUG_SQL_FIX,
        cheer: 'Values go in parameters.'
      }),

      B.quiz({
        id: 'm8-q4', t: 2, src: 'rec',
        q: 'The f-string query got the name `x\' OR \'1\'=\'1`. How many customers did it return, in the recording?',
        opts: [
          { t: '3 of 3, every customer', fb: '' },
          { t: '0, because no customer has that name', fb: 'That is what the parameter version returned.' },
          { t: '1', fb: 'The condition became always true, so no row was filtered out.' },
          { t: 'An error, as for the apostrophe', fb: 'This text happens to be valid SQL once it is pasted in, so there was no error.' }
        ],
        ok: 0, why: 'After the paste the condition was `name = \'x\' OR \'1\'=\'1\'`, which is true for every row. All 3 customers came back. The parameter version returned none.'
      }),

      B.code({
        id: 'm8-tx', t: 1, src: 'rec', title: 'A transaction: both updates, or neither', file: 'transactions.py', lang: 'python', code: TXF,
        steps: [
          { say: 'Move coffee beans between two stores: add to one, subtract from the other. A rule says that stock cannot go below 0. The output is real.', lines: null },
          { say: 'With a transaction, `with conn:` commits when the block ends and rolls back if it raises. Both updates are one unit.', lines: G.span(TXF, /^            with conn:/, /\(kg, src\)\)/) },
          { say: 'Without one, each update is saved on its own. The first is already saved when the second fails.', lines: G.span(TXF, /^            conn\.execute\("UPDATE stock SET beans_kg = beans_kg \+ \?/, /^            conn\.commit\(\)$/) },
          { say: 'Three moves: one that works, and the same too-big move twice, once with each method.', lines: G.span(TXF, /^print\("start:"/, /^print\("  now:", levels\(\), "->/) }
        ]
      }),

      B.term({
        id: 'm8-tx-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `transactions.py`. Watch the total number of kilos.',
        lines: function () { return G.plain(TXT, { cmd: 'python transactions.py' }); },
        after: 'With the transaction, the failed move changed nothing: **London 5, Singapore 45**. Without it, Singapore got the 30 kg and London\'s update failed, so the stock became **80 kg** from 50: the money equivalent of a duplicated order. A transaction keeps related changes together.',
        afterKind: 'warn',
        doneSay: 'Changes that belong together go in one transaction.'
      }),

      B.quiz({
        id: 'm8-q5', t: 1, src: 'rec',
        q: 'The 30 kg move failed on the CHECK rule. What was the total stock afterwards, with a transaction and with separate commits?',
        opts: [
          { t: '50 kg with the transaction, and 80 kg with separate commits', fb: '' },
          { t: '50 kg in both cases', fb: 'The separate commits saved the first update before the second failed.' },
          { t: '80 kg in both cases', fb: 'The transaction rolled the first update back.' },
          { t: '20 kg with the transaction', fb: 'A rollback restores the earlier numbers.' }
        ],
        ok: 0, why: 'The transaction undid the first update when the second raised, so the table stayed at 5 and 45. With separate commits the 30 kg was added to Singapore and never subtracted from London.'
      }),

      B.code({
        id: 'm8-batch', t: 1, src: 'rec', title: 'Many rows: how you commit decides the speed', file: 'batch_insert.py', lang: 'python', code: BIF,
        steps: [
          { say: 'Four ways to write 5,000 rows into a SQLite file. Each is timed three times, and the median is printed. The timings are from this machine.', lines: null },
          { say: '`commit_each`: a transaction for every row. Every commit asks the disk to make the row durable.', lines: blk(BIF, 'commit_each') },
          { say: 'One transaction around a Python loop of `execute`, and one `executemany` call. Both commit once.', lines: [blk(BIF, 'one_transaction')[0], blk(BIF, 'many')[1]] },
          { say: '`batches`: `executemany` with a commit for every 1,000 rows, so that a crash loses at most one batch.', lines: blk(BIF, 'batches') }
        ]
      }),

      B.term({
        id: 'm8-batch-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `batch_insert.py`, on this machine.',
        lines: function () { return G.plain(BIT, { cmd: 'python batch_insert.py' }); },
        after: 'A commit for every row made **' + EACH.rows_per_second.toLocaleString('en-US') + '** rows per second. One transaction made about **' + MANY.rows_per_second.toLocaleString('en-US') + '**, roughly **' + RATIO + ' times** more. Batches of 1,000 landed in between, with a safety net of 5 commits. The numbers depend on the disk. The order of the methods does not.',
        afterKind: 'tip',
        doneSay: 'Commit once for a batch, not once for a row.'
      }),

      B.bug({
        id: 'm8-bug3', t: 2, src: 'rec', q: 'This load takes 40 minutes for a million rows, and the database is nearly idle. Click the line that makes it slow.',
        file: 'load.py', lang: 'python', code: BUG_COMMIT, bad: [4],
        hint: 'How often does it ask the disk to save?',
        why: 'A commit for every row waits for the disk each time. In the recording that gave ' + EACH.rows_per_second.toLocaleString('en-US') + ' rows per second, against ' + MANY.rows_per_second.toLocaleString('en-US') + ' for one transaction with `executemany`. Write the rows in one transaction, or in batches.',
        fix: BUG_COMMIT_FIX,
        cheer: 'One transaction, one executemany.'
      }),

      B.quiz({
        id: 'm8-q6', t: 2, src: 'rec',
        q: 'Which method was the slowest in the recording, and about how much slower than one transaction with `executemany`?',
        opts: [
          { t: 'A commit for every row, more than 50 times slower', fb: '' },
          { t: 'The loop of `execute` in one transaction, about 2 times slower', fb: 'That method was almost as fast as `executemany` in the recording.' },
          { t: 'Batches of 1,000, about 10 times slower', fb: 'The batches were close to one transaction, and far faster than a commit for every row.' },
          { t: 'They were all about the same', fb: 'The slowest was hundreds of times slower than the fastest.' }
        ],
        ok: 0, why: 'A commit for every row took ' + EACH.seconds + ' s for 5,000 rows, against ' + MANY.seconds + ' s for one `executemany` in one transaction. The size of the gap depends on the disk, and its direction does not.'
      }),

      B.code({
        id: 'm8-sa', t: 2, src: 'rec', title: 'SQLAlchemy Core: the same ideas', file: 'sqlalchemy_core.py', lang: 'python', code: SAF,
        steps: [
          { say: 'SQLAlchemy (' + G.meta('sqlalchemy') + ') wraps the driver. The same rules apply: parameters, and a transaction block. The output is real.', lines: null },
          { say: '`engine.begin()` opens a transaction. It commits when the block ends and rolls back when it raises. `:id` and `:store` are bind parameters, and a list of dicts runs `executemany`.', lines: G.span(SAF, /^with engine\.begin/, /"cents": 820\}\]\)/) },
          { say: '`text()` wraps a SQL string with bind parameters. `.mappings()` gives rows as dict-like objects, so you read columns by name.', lines: G.span(SAF, /^with engine\.connect/, /list\(rows\[0\]\.keys/) }
        ]
      }),

      B.term({
        id: 'm8-sa-run', t: 2, src: 'rec', title: 'Run it',
        say: 'The real output, with SQLAlchemy ' + G.meta('sqlalchemy') + '.',
        lines: function () { return G.plain(SAT, { cmd: 'python sqlalchemy_core.py' }); },
        after: 'The query with `:min` returned the two stores, with the cents summed. An engine also keeps a **pool** of connections, so a long job reuses them instead of opening a new one for each query.',
        afterKind: 'tip',
        doneSay: 'An engine, bind parameters and a transaction block. That is most of it.'
      }),

      B.decide({
        id: 'm8-decide', t: 2, src: 'rec', title: 'Decision: how does the nightly extract read the partner API?',
        scenario: 'The partner has an orders API with 2 million orders. It offers offset pages (`page`), cursor pages (`after`) and a nightly export file. Orders arrive all day and a few are cancelled. In the recording, offset pages read **' + OI.rows + '** rows for **' + OI.unique + '** orders when 3 arrived, and missed **' + OD.missed.length + '** when 3 were cancelled.',
        opts: [
          { t: 'Offset pages of 100', d: 'The simplest request.', lose: 'Repeats and misses rows while orders change, and gives no error. At 20,000 pages the chance of it is high.' },
          { t: 'Cursor pages of 100, with the cursor saved after each write', d: 'Follows the data. A rerun resumes from the last saved cursor.', lose: '' },
          { t: 'Read the nightly export file once', d: 'A snapshot at one moment. Nothing shifts.', lose: 'Only as fresh as the export. Fine for a daily load, and too slow for hourly.' },
          { t: 'Offset pages, run twice and compared', d: 'Catches some differences.', lose: 'Doubles the calls and the rate-limit cost, and cannot tell which run was right.' }
        ],
        pick: 1,
        why: 'The cursor pages were right in both cases of the recording, and saving the cursor after each write makes a rerun resume instead of start over.',
        when: 'If the partner\'s export is complete and fresh enough for the business, it is the cheapest and simplest choice. Use cursor pages for fresher data, and offset only for a snapshot.'
      }),

      B.challenge({
        id: 'm8-ch1', t: 1, lang: 'python', file: 'fetch_all.py',
        q: '**Coding round: read every page.** Write `fetch_all(http, url, limit=5, sleep=time.sleep, **params)` for a cursor API. Send `limit` and `after` as query parameters. The answer is `{"items": [...], "next_cursor": ...}`, and a `next_cursor` of `None` is the last page. On a 429, wait for the `Retry-After` seconds and ask for the same page again. Any other error status must raise.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['a quiet API, 23 orders', 'all 23, once each, in order'], ['3 orders arrive while reading', '26 orders, no repeats'], ['one 429 with Retry-After: 2', 'waits 2.0 once, then reads all 23'], ['a 404', 'raises HTTPError']] }],
        starter: 'import time\n\ndef fetch_all(http, url, limit=5, sleep=time.sleep, **params):\n    ...',
        hints: ['Loop until `next_cursor` is `None`. Keep `after` between rounds, and send it only when it is set.', 'Check `r.status_code == 429` first: sleep for `float(r.headers.get("Retry-After", 1))` and `continue`, so the same page is asked for again.', 'Call `r.raise_for_status()` before `r.json()`, and pass `sleep` as an argument so that a test does not wait.'],
        sol: fn(FAF, 'fetch_all'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: FAROWS },
        expl: ['The cursor lives in a local variable and moves only after a page was read, so a 429 asks again for the same page.', '`sleep` is an argument, so the test passes `waits.append` and finishes at once. It saw `[2.0]`: exactly one wait, with the value from the header.', 'The 404 raises through `raise_for_status()`. A client that read the error body as data would carry on with nothing.'],
        cx: 'One request for each page, and memory for all the items. Yield the items if the result is large.'
      }),

      B.challenge({
        id: 'm8-ch2', t: 2, lang: 'python', file: 'upsert_batches.py',
        q: '**Coding round: write in batches.** Write `upsert_orders(conn, rows, batch_size=1000)` for SQLite. `rows` are `(order_id, store, total_cents)`. Insert new orders and update the ones that exist, one transaction for each batch, and return the number of batches. Running it twice must leave the same table, and a bad row must not leave half a batch.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['2,500 rows, batches of 1,000', '3 batches, 2,500 rows'], ['the same rows again', 'still 2,500 rows, the same total'], ['one row with a new total', 'updated in place'], ['a NULL store in the second batch of 2', 'IntegrityError, and the bad row is not saved']] }],
        starter: 'import sqlite3\nfrom itertools import batched\n\ndef upsert_orders(conn, rows, batch_size=1000):\n    ...',
        hints: ['`itertools.batched(rows, n)` yields tuples of up to n rows (Python 3.12 and later).', 'The statement is `INSERT ... ON CONFLICT (order_id) DO UPDATE SET ... = excluded....`.', 'Use `with conn:` around each `executemany`, so that a batch is committed or rolled back as a unit.'],
        sol: fn(UBF, 'upsert_orders'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: UBROWS },
        expl: ['The upsert makes the write idempotent, as in mission 7: a second run updates the same keys.', '`with conn:` gives each batch its own transaction. A crash loses at most the batch in flight, and a rerun picks it up again.', 'A bad row in a batch rolls back that batch only. Earlier batches stay, which is why the order of the rows should not matter to the result.'],
        cx: 'O(n) rows, one commit for each batch. A batch of about 1,000 to 10,000 rows is a common starting point.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: 3 orders missing, 3 doubled, and no errors', time: '08:20',
        alert: 'The nightly orders extract has 3 orders that the partner says exist and are missing, and 3 order ids that appear twice. The partner\'s API answered 200 on every page, and the job ended green. It happens on busy nights and not on quiet ones.',
        clues: ['The extract reads `/orders?page=N&per_page=100` until a page comes back short.', 'The listing is newest first, and orders arrive while the job runs.', 'The partner also offers `?after=<id>` pages.'],
        opts: [
          { t: 'Check whether the repeated ids sit at the end of one page and the start of the next, and switch to cursor pages', fb: '' },
          { t: 'Add retries, since the API is flaky', fb: 'Every answer was a 200. Nothing failed, so a retry changes nothing.' },
          { t: 'Make the page size bigger', fb: 'It makes the shift smaller in pages, and the shift in rows stays the same.' },
          { t: 'Drop the duplicates and ignore the missing orders', fb: 'The missing orders are the real loss, and nothing in the data says which ones.' }
        ],
        best: 0, why: 'The recording showed the same pattern: 3 orders arrived after page 1, and the last 3 ids of page 1 came back at the start of page 2. When 3 orders went away, 3 others were skipped, with a 200 on every page. Offset pages shift when the data does.',
        checks: [
          ['List the repeated ids with their page numbers', 'They are the last ids of one page and the first ids of the next: a shift by the number of new orders.'],
          ['Compare the count of unique ids with the partner\'s count', 'A few missing ids that sit just after a page boundary point to a shift, not to a lost call.'],
          ['Look at how the job pages', 'Offset pages on a newest-first list that changes.'],
          ['Switch to cursor or keyset pages, and save the cursor after each write', 'The next page starts after the last id that was read.'],
          ['Add a check on the number of unique ids against the total that the API reports', 'The job fails when a page repeats or skips an id.']
        ],
        tell: 'The extract used offset pages on a newest-first listing. When orders arrived during the run, everything shifted down, so the last ids of one page came back on the next page, and when orders were cancelled, everything shifted up and a few ids were skipped. Every answer was a 200, so nothing failed. I switched to cursor pages with the cursor saved after each write, and added a check that the number of unique ids matches the total that the API reports.',
        prevent: ['Page with a cursor or a key, and not with an offset, on data that changes.', 'Save the cursor after the page is written.', 'Check unique ids and totals after every extract.', 'Keep the raw pages for a day, so that a bad night can be compared with the next one.']
      }),

      B.qa({
        id: 'qa-paging', t: 1, tag: 'APIs', secs: 60,
        q: 'How do you page through a large API safely?',
        pts: ['Cursor or keyset pages, not offset', 'Offset repeats or skips rows when data changes', 'Save the cursor after writing the page', 'Check unique ids and totals at the end'],
        short: 'I use cursor or keyset pages: the request says "after this id" or "after this token", so the next page follows the data and not a position in a list. Offset pages shift when rows are added or removed. In a recording of 23 orders, three new orders made offset pages read 26 rows for 23 different orders, and three cancelled orders made them skip three others, with a 200 on every page. I save the cursor after the page is written, so that a rerun resumes. At the end I check the unique ids and the total against what the API reports.',
        fu: [['What if the API only has offset pages?', 'Read from a snapshot or an export if there is one, sort by a stable key, and compare counts. Offset is fine for data that does not change during the run.'], ['Why save the cursor after the write?', 'If the job dies in between, the rerun asks for the same page again, and the write is idempotent, so nothing doubles.']],
        trap: 'Saying that offset pages work, because they did in testing on quiet data.',
        real: 'Describe an extract that lost or repeated rows.'
      }),

      B.qa({
        id: 'qa-429', t: 1, tag: 'APIs', secs: 60,
        q: 'The API answers 429. What does your client do?',
        pts: ['Read Retry-After and wait that long', 'Ask for the same page again', 'A limit on tries, then fail loudly', 'Slow down on purpose: a client side limit'],
        short: 'A 429 means "slow down", so I wait and try again. I read the `Retry-After` header and wait that long, because the server knows its own limit. In a recording the fourth call within a second got `Retry-After: 1`, the client waited one second, and the next calls passed. I ask for the same page again, I limit the number of tries, and I raise after the last one. If I know the limit, I stay under it with a small delay or a rate limiter, so I do not trigger 429 at all.',
        fu: [['What if there is no Retry-After?', 'Use exponential backoff with jitter, as in mission 7.'], ['Does 429 count against a retry limit?', 'Yes. A server that never relents must end as a failed run.']],
        trap: 'Retrying at once in a tight loop.',
        real: 'Tell about an API limit that you hit.'
      }),

      B.qa({
        id: 'qa-sqli', t: 1, tag: 'Databases', secs: 60,
        q: 'Why do you pass values to SQL as parameters?',
        pts: ['The driver keeps SQL and values apart', 'f-strings break on an apostrophe', 'f-strings allow SQL injection', 'Parameters also let the database reuse plans'],
        short: 'The database gets the SQL and the values separately, so a value can never be read as SQL. In a recording, the f-string version broke on a name with an apostrophe, with a syntax error, and a name like `x\' OR \'1\'=\'1` returned all 3 customers. The parameter version returned nothing for both, which is right. So it is a correctness rule as much as a security rule. The placeholder style depends on the driver, `?` for SQLite and `%s` for psycopg. Table and column names cannot be parameters, so for those I use a fixed list of allowed names.',
        fu: [['How do you pass a dynamic column name?', 'Check it against a fixed list, then put it in the string. Never pass the raw input.'], ['And a list for IN?', 'Build the right number of placeholders, or use the driver\'s array support.']],
        trap: 'Saying "I escape the quotes". Use parameters.',
        real: 'Describe how your code builds SQL.'
      }),

      B.qa({
        id: 'qa-tx', t: 1, tag: 'Databases', secs: 60,
        q: 'What is a transaction, and when do you need one in a pipeline?',
        pts: ['All of the changes happen, or none do', 'Commit and rollback', 'Needed when changes belong together', 'Keep it short'],
        short: 'A transaction groups changes so that all of them happen or none of them. You commit to keep them and roll back to undo. I need one when changes belong together: a delete and an insert that replace a day, or two updates that move stock. In a recording, a move that failed halfway left the stock at 50 kg inside a transaction, and at 80 kg when each update was committed on its own. I keep transactions short, I do not hold one open while I call an API, and I commit a batch of rows once instead of once for each row.',
        fu: [['Why not one transaction for a whole 50 million row load?', 'It holds locks and log space for a long time. Use batches, and make each batch safe to rerun.'], ['What does ACID mean?', 'Atomic, consistent, isolated, durable. Atomic is the all-or-nothing part you use here.']],
        trap: 'Committing after every row "to be safe".',
        real: 'Describe a load that left a table half written.'
      }),

      B.qa({
        id: 'qa-bulk', t: 2, tag: 'Databases', secs: 60,
        q: 'You have to write 10 million rows to a database. How?',
        pts: ['One commit for a batch, not for a row', 'executemany or COPY or a bulk loader', 'Batches that can be rerun', 'Indexes and constraints during a load'],
        short: 'Not with a commit for every row. In a recording, a commit for every row ran at about 800 rows per second and one `executemany` in one transaction at hundreds of thousands. For 10 million rows I would use the database\'s bulk path, such as `COPY` for PostgreSQL or a staged file and a bulk load for a warehouse, and where that is not available `executemany` in batches of a few thousand rows, each batch one transaction, with an upsert so that a rerun is safe. I measure on the real database, because the gap depends on the disk, the network and the constraints.',
        fu: [['What about indexes?', 'Each index is extra work on every insert. For a very large first load, load the data, then build the indexes.'], ['How large is a batch?', 'Start around 1,000 to 10,000 rows and measure. Too small wastes round trips, and too large holds locks.']],
        trap: 'Quoting a speed-up as a fact for every database. It depends on the machine.',
        real: 'Tell what the fastest load that you built did differently.'
      }),

      B.qa({
        id: 'qa-timeout', t: 2, tag: 'APIs', secs: 60,
        q: 'What can go wrong with a call to an external service, and what do you set on it?',
        pts: ['Hangs: timeout on connect and read', 'Errors: check the status, then sort retryable from not', 'Limits: Retry-After', 'Duplicates: idempotency'],
        short: 'It can hang, so every call has a timeout, one for connecting and one for reading. It can answer with an error, so I call `raise_for_status` and sort the failure: timeouts, 429 and 5xx are worth a retry with backoff, and a 4xx is not. It can limit me, so I obey `Retry-After`. It can answer twice or not at all after a timeout, so any write needs an idempotency key. And it can change while I page through it, so I use cursors. In a recording a call with a 0.5 second timeout against a slow server raised `ReadTimeout` and the job could decide what to do.',
        fu: [['What timeout value?', 'A few seconds to connect, and as long as the slowest normal answer to read. Measure the real answer times.'], ['Where do the settings live?', 'In config, so that you can change them without a release (mission 13).']],
        trap: 'No timeout, because "the partner is reliable".',
        real: 'Describe a call that hung a job.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Pipe Layer', color: '#BAE6FD',
        pts: [
          'Every call has a **timeout**, and `raise_for_status()` turns 4xx and 5xx into errors. A 404 is a normal response until you check it.',
          '**Offset** pages read **' + OI.rows + '** rows for **' + OI.unique + '** orders when 3 arrived, and **missed 3** when 3 were cancelled, with a 200 every time. **Cursor** pages were right.',
          'A **429** with `Retry-After` means wait that long, and ask for the same page again. Save the cursor after the write.',
          'The f-string query broke on `O\'Brien` and returned **3 of 3** customers for an injected name. **Parameters** did neither.',
          'A **transaction** kept the stock at 50 kg when the second update failed, and separate commits made it 80. A commit for every row made **' + EACH.rows_per_second.toLocaleString('en-US') + '** rows per second, one transaction about **' + MANY.rows_per_second.toLocaleString('en-US') + '**.'
        ],
        lines: [
          'I page with a cursor, set timeouts and obey Retry-After.',
          'I pass values as parameters and group related changes in one transaction.',
          'I write rows in batches, and a rerun does not double anything.'
        ]
      })
    ]
  });
})();
