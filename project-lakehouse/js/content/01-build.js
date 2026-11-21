/* Mission 1: build it. The pretend source, bronze with its ledger, and the rules of silver. Every file is the file of projects/brewline-lakehouse, and day 1 ran for real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, D2 = RUNS.day2, A1 = C('after_day1'), A2 = C('after_day2'), Q = G.table('quarantine').rows;
  var LAND = G.file('lakehouse/landing.py'), BRZ = G.file('lakehouse/bronze.py'), RUL = G.file('lakehouse/rules.py');
  G.expect(D1.files === 1 && D1.bronze_rows === 305 && D1.valid === 301 && D1.quarantined === 4 && D1.inserted === 300 && D1.gate.length === 4 && D1.gate.every(function (l) { return /^PASS/.test(l); }), 'day 1 reads 305 lines, 301 are valid and 4 quarantined, 300 orders are inserted, and the 4 gate checks pass');
  G.expect(A1.bronze === 305 && A1.ledger === 1 && A1.silver === 300 && A1.silver_distinct === 300 && A1.quarantine === 4 && A1.gold === 12, 'after day 1: bronze 305, ledger 1, silver 300, quarantine 4, gold 12');
  G.expect(D2.files === 2 && D2.bronze_rows === 462 && A2.bronze === 767 && D2.quarantined === 4, 'day 2 reads 2 files and 462 lines, and the replay is read again: bronze holds 767 rows');
  G.expect(Q.length === 5 && Q.every(function (r) { return r[1] === 2; }), 'the quarantine holds five reasons, two rows each');

  var RSPAN = G.span(RUL, /^    return \($/, /^    \)$/), REASON_REAL = G.lines(RUL, RSPAN[0], RSPAN[1]);
  var REASON_BAD = REASON_REAL.replace("        F.when(o['_corrupt'].isNotNull() & o['order_id'].isNull(), F.lit('parse_error'))\n        .when(o['_corrupt'].isNotNull(), F.lit('bad_type'))\n", "        F.when(o.isNull(), F.lit('parse_error'))\n");
  G.expect(REASON_BAD !== REASON_REAL, 'the rules have the two lines that the bug hunt replaces');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Build it: the source, bronze and the rules', short: 'Build', blurb: 'The pretend source, a bronze layer that loses nothing, and the rules of silver', minutes: 22,
    focus: ['src'],
    goals: [
      'Read the **pretend source** and the traps that it holds for three days.',
      'Say why **bronze** keeps raw text, and what the **ledger** makes safe.',
      'Read the **rules** that decide what is valid, and the **reason** of each rejection.',
      'Say what day 1 did to each layer, with numbers.'
    ],
    say: 'A lakehouse is a few small files that agree with each other. I will show the source that drops the files, the bronze step that copies them without judging them, and the rules that silver uses to decide what is valid. Read each file as you would in a review.',
    scenes: [
      B.code({
        id: 'm1-land', t: 1, src: 'rec', title: 'landing.py: the pretend source, and its traps', file: 'landing.py', lang: 'python', code: LAND,
        steps: [
          { say: 'The source is a Python file with fixed rules and no random numbers, so that every run gives the same totals. It writes JSON lines, as a source system would drop them. Press Next.', lines: null },
          { say: 'An **event** is an order at a moment: the id, the store, the status, the amount in cents, the time of the event, and the lines. Order `i` always gets the same store and amount.', lines: G.span(LAND, /^def event/, /return e$/) },
          { say: '**Day 1**: 300 good orders, and four dirty lines on purpose: a **negative amount**, an **unknown status**, an **unknown store**, and a line that is **cut in the middle**. One more line repeats order 7.', lines: G.span(LAND, /^def day1/, /return lines\(ev\) \+ \[cut\]/) },
          { say: '**Day 2**: a file with 116 new orders and the status changes of 41 old ones, one of them a **refund**. And the **first file of day 1 is delivered again**, under another name.', lines: G.span(LAND, /^def day2/, /return \{'part-0002/) },
          { say: '**Day 3**: 20 orders carry a **field that nobody announced** (`coupon`), two amounts are **text**, and an **old event of order 5** arrives late, after the update that it must not undo.', lines: G.span(LAND, /^def day3/, /return lines\(ev\)/) }
        ]
      }),

      B.code({
        id: 'm1-bronze', t: 1, src: 'rec', title: 'bronze.py: every line, as text', file: 'bronze.py', lang: 'python', code: BRZ,
        steps: [
          { say: 'Bronze copies and does not judge. Press Next.', lines: null },
          { say: 'First it finds the **new files**: the files of the landing zone that the **ledger** does not know. The ledger is a small Delta table with one row for each file that was read.', lines: G.span(BRZ, /^def new_files/, /return \[f for f in found/) },
          { say: 'Spark reads every line as **plain text**. Each line gets its **file**, its **line number** and the id of the run. It is not parsed, so a cut line or a wrong type cannot fail here.', lines: G.span(BRZ, /by_file = /, /rows = raw\.select/) },
          { say: 'The rows are **appended** to the bronze table, and the files are appended to the ledger. If nothing is new, the step returns at once, and the run says so.', lines: G.span(BRZ, /rows\.write\.format/, /return files, n/) }
        ]
      }),

      B.code({
        id: 'm1-rules', t: 1, src: 'rec', title: 'rules.py: what is valid, and why a row is not', file: 'rules.py', lang: 'python', code: RUL,
        steps: [
          { say: 'The rules live in one place, as Spark expressions, so that the pipeline and the tests use the same ones. Press Next.', lines: null },
          { say: 'The **schema** says what an order should look like. The last field, `_corrupt`, is a place for Spark to put the raw text of a record that it could not read.', lines: G.span(RUL, /^ORDER_SCHEMA = /, /^\)$/) },
          { say: '`parse_json` reads the text with that schema in **permissive** mode: it does not fail, it marks the record. The same function is used by the pipeline and by the tests.', lines: G.span(RUL, /^PARSE_OPTIONS = /, /return F\.from_json/) },
          { say: '`reason` returns **why** a record is not valid, or null when it is. The order of the rules matters: the first one that matches names the reason. The cut line and the wrong type are caught first, because the rest cannot be trusted.', lines: G.span(RUL, /^def reason/, /^    \)$/) }
        ]
      }),

      B.term({
        id: 'm1-day1', t: 1, src: 'rec', title: 'Day 1, from the files to the gate',
        say: 'This is the real first run, in the order of its steps. Silver and gold come in the next mission, and the gate comes in the one after.',
        lines: function () { return G.plain(X('run.day1')); },
        after: 'The run read **' + D1.files + '** file with **' + D1.bronze_rows + '** lines. Silver accepted **' + D1.valid + '** of them, and the merge **inserted ' + D1.inserted + '** orders: order 7 was there twice, so **301** valid lines made **300** orders. **' + D1.quarantined + '** lines went to the quarantine. Gold has **' + D1.gold_rows + '** rows: 1 day, 12 stores. The gate passed all **4** checks.',
        afterKind: 'tip',
        doneSay: 'The first day is clean.'
      }),

      B.cmp({
        id: 'm1-reasons', t: 1, src: 'rec', title: 'The five reasons of the quarantine',
        say: 'Every row that breaks a rule is kept with a reason. Press Next to see what each reason caught.',
        cols: ['Reason and rule', 'What the pretend source sent', 'Rows at the end'],
        hl: 2,
        rows: [
          ['`parse_error`: the text is not JSON, or it is cut', 'Order 304, cut in the middle', String(G.row('quarantine', 'parse_error').rows)],
          ['`bad_amount`: the amount is missing, or not above zero', 'Order 301, minus 500 cents', String(G.row('quarantine', 'bad_amount').rows)],
          ['`bad_status`: the status is not PLACED, SHIPPED or REFUNDED', 'Order 302, status LOST', String(G.row('quarantine', 'bad_status').rows)],
          ['`unknown_store`: the store is not one of the 12', 'Order 303, store 99', String(G.row('quarantine', 'unknown_store').rows)],
          ['`bad_type`: a field has the wrong type', 'Day 3: the amounts of orders 501 and 502 are text', String(G.row('quarantine', 'bad_type').rows)]
        ],
        steps: [
          { upto: 4, say: 'The first four are the dirty lines of **day 1**. Each shows **2 rows** at the end, because the replay of day 2 brought the same four lines again, and they were quarantined again.' },
          { upto: 5, say: 'The fifth came on **day 3**: two amounts were text, so two rows were quarantined as `bad_type`. Nothing was lost: bronze still holds the text of all ' + n(C('after_day3').bronze) + ' lines.' }
        ]
      }),

      B.bug({
        id: 'm1-bug', t: 3, src: 'rec', q: 'The quarantine takes every bad row, but the reasons are wrong: the cut line is called `missing_order_id`, and a text amount is called `bad_amount`. Click the line that never fires.',
        file: 'rules.py', lang: 'python',
        code: REASON_BAD,
        bad: [G.at(REASON_BAD, /F\.when\(o\.isNull\(\)/)],
        hint: 'What does `from_json` return for a line that it cannot read: a null, or something else?',
        why: 'In permissive mode Spark does **not** return a null struct for a bad line: it returns a **struct whose fields are all null**, with the raw text in `_corrupt`. So `o.isNull()` is never true. On the six kinds of record of the test, the wrong rule gave `bad_amount` for the text amount and `missing_order_id` for the cut line. No row was lost, and the quarantine looked fine until someone read the reasons. The test that names every reason **fails** on this code.',
        fix: REASON_REAL + '\n',
        cheer: 'Read the reasons as well as the count.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'What does bronze hold for the line that is cut in the middle, `{"order_id": 304, "store_id": 3, "status": "PLAC`?',
        opts: [
          { t: 'Its text, with the file and the line number, like every other line', fb: '' },
          { t: 'Nothing: a line that is not JSON is dropped', fb: 'Bronze does not judge. Dropping a line is the one thing that it never does.' },
          { t: 'A row of nulls', fb: 'Nothing is parsed in bronze, so there is nothing to be null.' },
          { t: 'An error, and the run stops', fb: 'The run read all 305 lines and went on.' }
        ],
        ok: 0, why: 'Bronze read **' + D1.bronze_rows + '** lines for the **' + D1.bronze_rows + '** lines of the file, the cut one included. Silver is where it became a quarantined row with the reason `parse_error`.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Why does bronze keep the **file** and the **line number** of every row?',
        opts: [
          { t: 'To trace any row of silver or of the quarantine back to the exact line that it came from', fb: '' },
          { t: 'To make the table larger', fb: 'It costs space, and it buys the trace.' },
          { t: 'Because Spark requires them', fb: 'The pipeline adds them on purpose.' },
          { t: 'To sort the table', fb: 'Silver uses them to break a tie, but the reason to keep them is the trace.' }
        ],
        ok: 0, why: 'A quarantined row carries its `file` and `line_no`, so that someone can open the file and see the line. Silver also uses them as the last tie-breaker when two events of an order have the same time.'
      }),

      B.quiz({
        id: 'm1-q3', t: 2,
        q: 'The replay file of day 2 has the same lines as the file of day 1, under another name. Did the **ledger** skip it?',
        opts: [
          { t: 'No: the ledger knows files by name, so bronze took all 305 lines again, and the merge made it harmless', fb: '' },
          { t: 'Yes: the ledger compares the content', fb: 'It stores the path of the file.' },
          { t: 'Yes: the files are in the same folder', fb: 'The folder does not matter.' },
          { t: 'No, and the merge duplicated the orders', fb: 'The merge left them alone.' }
        ],
        ok: 0, why: 'Day 2 read **' + D2.files + '** files and **' + D2.bronze_rows + '** lines (' + (D2.bronze_rows - D1.bronze_rows) + ' and ' + D1.bronze_rows + '). Bronze grew from **' + A1.bronze + '** to **' + A2.bronze + '** rows. The ledger protects against reading the **same file** twice (day 3 again did nothing). A file with the same content under a new name is the merge\'s problem, and the next mission shows how it solved it.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2,
        q: 'Why is the text parsed in **silver**, and not already in bronze?',
        opts: [
          { t: 'A parse that fails in bronze would lose or stop a line. In silver the failure becomes a row with a reason', fb: '' },
          { t: 'Spark cannot parse JSON in bronze', fb: 'It can. The choice is a design choice.' },
          { t: 'Silver is faster', fb: 'Nothing here was timed, and speed is not the reason.' },
          { t: 'To save space', fb: 'Raw text takes more space than parsed columns.' }
        ],
        ok: 0, why: 'Bronze is the layer that you can **replay from**. If the rules change, or a bug is found in them, silver can be rebuilt from bronze. Day 3 shows it: a new field arrived, and bronze held it before anyone knew.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision (ADR 1): which table format for the layers',
        scenario: 'Brewline needs tables that can be merged, that keep a history, and that a Spark job can read and write. The files will live in a bucket later. The team of three knows Spark.',
        opts: [
          { t: 'Delta Lake tables for every layer', d: 'MERGE, `replaceWhere`, a history of versions and time travel are built in. One format for all the layers.', lose: 'Delta has its own log to keep healthy (small files, retention), and the other engines read it through connectors.' },
          { t: 'Plain Parquet files, rewritten by each job', d: 'No format to learn, and every engine reads them.', lose: 'No merge and no history: a repeat means rewriting folders by hand, and a crash in the middle leaves a half-written table.' },
          { t: 'A warehouse table loaded by a copy command', d: 'A managed service, and SQL for the analysts.', lose: 'The raw files and the replay are not in the warehouse, and the rules move out of the code that the team tests.' }
        ],
        pick: 0,
        why: 'The recording shows what the choice bought: a MERGE that inserted and updated in one step, `replaceWhere` for gold, and a history of four versions for silver. This is a design judgement, and the other two options were not built. Iceberg and Hudi are alternatives that I did not run.',
        when: 'If several engines must read and write the same tables, or the platform already standardised on Iceberg, use that format and keep the same layers.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Builder', color: '#CBD5E1',
        pts: [
          'The source is a stand-in with fixed rules and **traps on purpose**: dirty lines, a file delivered twice, a new field, text amounts and a late event.',
          '**Bronze** appends every line as **text**, with its file and line number. Nothing is parsed, so nothing is lost: day 1 read **' + D1.bronze_rows + '** lines and bronze held **' + A1.bronze + '**.',
          'The **ledger** remembers files **by name**. A file with the same lines under another name is read again: bronze grew to **' + A2.bronze + '** rows on day 2.',
          'The **rules** are expressions in one place. A rejected row is **quarantined with a reason**: five reasons, and **' + A1.quarantine + '** rows after day 1.',
          'From the first run: **' + D1.valid + '** valid lines made **' + D1.inserted + '** orders, and all **4** gate checks passed.'
        ],
        lines: [
          'I keep the raw text before I judge it.',
          'I know what my ledger protects against, and what it does not.',
          'I read the reason of a rejection as well as the count.'
        ]
      })
    ]
  });
})();
