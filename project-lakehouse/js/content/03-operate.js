/* Mission 3: operate it. The gate, day 3 (a new field, text amounts, a late event), a rerun that does nothing, and what Delta Lake kept. All runs are real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, D2 = RUNS.day2, D3 = RUNS.day3, D3A = RUNS.day3_again, A2 = C('after_day2'), A3 = C('after_day3'), A3A = C('after_day3_again');
  var H = G.table('history').rows, V = G.table('versions').rows, QG = G.file('lakehouse/quality.py');
  G.expect(D3.files === 1 && D3.bronze_rows === 83 && D3.valid === 81 && D3.quarantined === 2 && D3.inserted === 80 && D3.updated === 0 && D3.left === 1 && D3.warning === 'coupon' && D3.gate.length === 4 && D3.gate.every(function (l) { return /^PASS/.test(l); }), 'day 3 reads 83 lines, 81 valid, 2 quarantined, inserts 80, leaves the late event alone, warns about coupon, and the gate passes');
  G.expect(A3.silver === 496 && A3.silver_distinct === 496 && A3.bronze === 850 && A3.quarantine === 10 && A3.order5 === 'SHIPPED' && A3.ledger === 4, 'after day 3: bronze 850, silver 496, quarantine 10, ledger 4 files, order 5 shipped');
  G.expect(D3A.nothing_to_do === true && D3A.files === 0 && JSON.stringify(A3A) === JSON.stringify(A3), 'day 3 again does nothing and every total stays the same');
  G.expect(H.length === 4 && H[0][1] === 'WRITE' && H[1][2] === D1.inserted && H[2][2] === D2.inserted && H[2][3] === D2.updated && H[3][2] === D3.inserted && V.length === 4 && V[0][2] === 'not there yet' && V[1][2] === 'PLACED' && V[2][2] === 'SHIPPED' && V[3][2] === 'SHIPPED' && V[3][1] === A3.silver, 'silver has four versions, and order 5 is placed at version 1 and shipped from version 2');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Operate it: the gate, a new field and the history', short: 'Operate', blurb: 'The quality gate, a field that nobody announced, a late event, a rerun, and what Delta Lake kept', minutes: 26,
    focus: ['ing'],
    goals: [
      'Read the **gate**: what it compares, and what a failed check does.',
      'Say what the pipeline does with a **new field**, a **text amount** and a **late event**.',
      'Say what a **rerun** of a finished day does, and why.',
      'Read the **history** of a Delta table, and read a table as it was.'
    ],
    say: 'Day 3 is the day that a real pipeline meets: a field that nobody announced, a wrong type, and an old event that arrives after a newer one. Watch what each layer did, and then what Delta Lake kept about it.',
    scenes: [
      B.code({
        id: 'm3-gate', t: 1, src: 'rec', title: 'quality.py: a gate that compares the layers', file: 'quality.py', lang: 'python', code: QG,
        steps: [
          { say: 'Two small functions: a warning, and the gate. Press Next.', lines: null },
          { say: 'The **warning**: it reads the raw text of this run, lists every field that is not in the contract, and returns them. It is a warning, because bronze keeps the text, so nothing is lost.', lines: G.span(QG, /^def unexpected_fields/, /return sorted/) },
          { say: 'The gate collects **checks**: a name, whether it passed, what it got, and what it wanted.', lines: G.span(QG, /    def check\(name, got, want\)/, /checks\.append/) },
          { say: 'First, nothing vanished: every bronze row of the run is **valid or quarantined**. And silver has **one row for each order**, which is the check that stopped the bug hunt of the window.', lines: G.span(QG, /check\('every bronze row/, /check\('silver has one row/) },
          { say: 'Then gold must **agree with silver**, in revenue and in orders, once the refunded orders are left out. A stale day, as in the last hunt, fails exactly here.', lines: G.span(QG, /gold = spark\.read/, /check\('gold orders/) },
          { say: 'It returns the checks. `run.py` prints each as `PASS` or `FAIL`, and **exits with 1** if one failed, so whatever runs next, an orchestrator for example, can stop.', lines: G.span(QG, /return checks/) }
        ]
      }),

      B.term({
        id: 'm3-day3', t: 1, src: 'rec', title: 'Day 3: a new field, two text amounts and an old event',
        say: 'The real third run. Look for the warning, the quarantine, and the merge line.',
        lines: function () { return G.plain(X('run.day3')); },
        after: 'The file had **' + D3.bronze_rows + '** lines: 80 new orders, two orders whose amount is text, and the old event of order 5. Silver accepted **' + D3.valid + '** of them, and **' + D3.quarantined + '** went to the quarantine as `bad_type`. The merge **inserted ' + D3.inserted + '**, **updated ' + D3.updated + '** and **left ' + D3.left + ' alone**: the old event of order 5, which is not newer than its row. The run **warned** about the field `' + D3.warning + '`, and went on. The gate passed all **4** checks, and silver holds **' + A3.silver + '** orders.',
        afterKind: 'tip',
        doneSay: 'A warning, a quarantine, and no loss.'
      }),

      B.cmp({
        id: 'm3-three', t: 1, src: 'rec', title: 'The three surprises of day 3, and what each layer did',
        say: 'Day 3 sent three things that nobody warned the pipeline about. Press Next to compare what happened to each.',
        cols: ['What arrived', 'Bronze', 'Silver', 'The run'],
        hl: 1,
        rows: [
          ['A field `coupon` on 20 orders', 'Kept the text, with the field', 'Ignored it: it is not in the schema', 'A **warning**, the gate passed'],
          ['Two amounts as text, `"12.50"`', 'Kept the text', 'Quarantined as `bad_type`, 2 rows', 'The gate passed'],
          ['An old event of order 5', 'Kept the line', 'Left alone: not newer, order 5 stays `SHIPPED`', 'Merge: left ' + D3.left + ' alone']
        ],
        steps: [
          { upto: 2, say: 'The first two are about the **shape** of the data. Bronze took both without a problem, because it never parses. Silver decided: it ignored what it does not know, and it quarantined what it cannot trust.' },
          { upto: 3, say: 'The third is about **time**. The line is in bronze, so the history is complete, and the merge did not let it undo the shipping of day 2.' }
        ]
      }),

      B.cmp({
        id: 'm3-versions', t: 1, src: 'rec', title: 'Delta kept every version of silver',
        say: 'Each merge wrote one version of the table, and Delta keeps them. Press Next to read them.',
        cols: ['Version', 'What wrote it', 'Orders at that version', 'Order 5'],
        hl: 2,
        rows: H.map(function (h, k) { return [String(h[0]), h[1] === 'MERGE' ? 'MERGE: inserted ' + h[2] + ', updated ' + h[3] : h[1], n(V[k][1]), V[k][2]]; }),
        steps: [
          { upto: 1, say: 'Version **0** is the empty table that the first run created.' },
          { upto: 3, say: 'Versions **1** and **2** are the first two merges. Order 5 is `PLACED` after day 1, and `SHIPPED` after day 2. A reader who asks for version 1 sees the table as it was on the evening of day 1.' },
          { upto: 4, say: 'Version **3** is day 3: **' + D3.inserted + '** orders inserted, and no update. The old event of order 5 changed nothing, so it did not even leave a trace in the history. That is the proof that it was left alone.' }
        ]
      }),

      B.term({
        id: 'm3-tour', t: 1, src: 'rec', title: 'The tour: history, versions and quarantine',
        say: 'A small program reads the history of silver, the table at each version, and the quarantine by reason.',
        lines: function () { return G.plain(X('tour.run')); },
        after: 'Four versions, one for each write. `versionAsOf` gives the table **as it was**: **' + V[1][1] + '** orders at version 1, **' + V[3][1] + '** at version 3. The quarantine shows its five reasons, **2** rows each, and gold has **36** rows: 3 days and 12 stores.',
        afterKind: 'tip',
        doneSay: 'Nothing was overwritten in silence.'
      }),

      B.term({
        id: 'm3-again', t: 1, src: 'rec', title: 'Day 3 again: the run that does nothing',
        say: 'Someone runs day 3 a second time, perhaps by mistake. Every file is already in the ledger.',
        lines: function () { return G.plain(X('run.day3_again')); },
        after: 'The run read **' + D3A.files + '** new files and said **nothing to do**. The totals did not move: bronze **' + n(A3A.bronze) + '**, silver **' + A3A.silver + '**, gold **' + A3A.gold + '** rows. A rerun is **safe** because the ledger stops the files, and the merge stops the events: two guards, for two different repeats.',
        afterKind: 'tip',
        doneSay: 'A repeat is harmless.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Day 3 warned about the field `coupon`, and the gate passed. Is the coupon data lost?',
        opts: [
          { t: 'No: bronze holds the raw text with the field. Adding it to the schema and replaying silver from bronze brings it in', fb: '' },
          { t: 'Yes: silver ignored the field', fb: 'Silver ignores it, and bronze keeps the text of every line.' },
          { t: 'Yes: the run should have failed', fb: 'A new field is not a reason to stop. A decision about it is.' },
          { t: 'No: Delta adds the column by itself', fb: 'Delta does not change the schema unless it is told to.' }
        ],
        ok: 0, why: 'That is the reason why bronze keeps **text**. The recorded warning says `unexpected fields in the files: ' + D3.warning + '`, and the **20** orders that carried it are in silver without it.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'Day 3 reports `inserted ' + D3.inserted + ', updated ' + D3.updated + ', left ' + D3.left + ' alone`. What is the one that was left alone?',
        opts: [
          { t: 'The old event of order 5, which is not newer than the row that silver holds', fb: '' },
          { t: 'A row that failed a rule', fb: 'The two bad rows went to the quarantine and are not in the merge.' },
          { t: 'An order with the new field', fb: 'Those 20 orders were inserted.' },
          { t: 'The warning', fb: 'A warning is not a row.' }
        ],
        ok: 0, why: '**' + D3.valid + '** valid events: **' + D3.inserted + '** new orders and the late event of order 5. Order 5 stayed `' + A3.order5 + '`, and silver did not write a new version for it.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'Which guard stops a **file** that is read twice, and which stops an **event** that is applied twice?',
        opts: [
          { t: 'The ledger stops the file, and the merge condition stops the event', fb: '' },
          { t: 'The merge stops both', fb: 'The merge cannot stop a file that is read twice into bronze: bronze would grow.' },
          { t: 'The gate stops both', fb: 'The gate only reports.' },
          { t: 'The quarantine stops both', fb: 'The quarantine holds bad rows.' }
        ],
        ok: 0, why: 'Day 3 again did nothing at all because of the **ledger**. The replay of day 2 got through the ledger, with a new name, and the **merge** left **' + D2.left + '** events alone.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'What does `spark.read.format("delta").option("versionAsOf", 1).load(path)` return for silver?',
        opts: [
          { t: 'The table as it was after the first merge: ' + V[1][1] + ' orders, with order 5 `' + V[1][2] + '`', fb: '' },
          { t: 'Only the rows that version 1 inserted', fb: 'It returns the whole table at that version.' },
          { t: 'The latest table, with a column for the version', fb: 'It is the table as it was, and not the latest.' },
          { t: 'An error, because old versions are deleted', fb: 'Delta keeps them until a vacuum removes the old files.' }
        ],
        ok: 0, why: 'The tour printed it: **version 1: ' + V[1][1] + ' orders, order 5 is ' + V[1][2] + '**. Delta keeps the files of old versions until a `VACUUM`, which this project did not run, and the retention is a setting.'
      }),

      B.quiz({
        id: 'm3-q5', t: 3, src: 'rec',
        q: 'The late event of order 5 changed nothing, and silver wrote no version for it. How can the **history** still prove that it was left alone?',
        opts: [
          { t: 'Version 3 shows ' + D3.inserted + ' inserted and ' + D3.updated + ' updated, and order 5 is `SHIPPED` at versions 2 and 3', fb: '' },
          { t: 'It cannot: the history only shows writes', fb: 'A merge that updates no row shows that in its counts.' },
          { t: 'The quarantine holds the event', fb: 'The event was valid, so it is not in the quarantine.' },
          { t: 'The ledger holds the event', fb: 'The ledger holds file names.' }
        ],
        ok: 0, why: 'The counts of the merge are in the history: **inserted ' + D3.inserted + ', updated ' + D3.updated + '**. With the bronze line (it is there, with its file and line number) and the times, the claim can be checked end to end.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision (ADR 3): what to do when a new field arrives',
        scenario: 'A source team adds a field to its files and does not tell anyone. The files keep coming every day. The business may want the field later.',
        opts: [
          { t: 'Warn, keep the text in bronze, ignore the field in silver, and decide later', d: 'Nothing stops, nothing is lost, and the warning gives someone the date when the field started.', lose: 'The field is not in silver until someone adds it and replays, and a warning that nobody reads changes nothing.' },
          { t: 'Fail the run', d: 'Nothing unexpected passes silently.', lose: 'Every harmless addition stops the pipeline at night, and the readers see stale data for a field that they never asked for.' },
          { t: 'Evolve the table schema automatically', d: 'The new column appears by itself.', lose: 'A typo or a bad field changes the schema of a table that people read, and the change cannot be undone with a rerun.' }
        ],
        pick: 0,
        why: 'The recorded run **warned** about `' + D3.warning + '`, and went on: the gate passed, and nothing was lost. This is the project\'s choice, and the other two were not built. A contract with the source team is the real fix, and I did not build one.',
        when: 'If the field changes the meaning of money or of keys, fail the run. If a schema registry or a data contract exists, check the files against it before bronze.'
      }),

      B.incident({
        id: 'm3-inc', t: 1, src: 'rec', title: 'Incident: the gate failed on gold, and the layers before it are fine', time: '06:40',
        alert: '**The run for 2 March failed at the gate.** `FAIL gold revenue equals silver revenue without the refunded orders: 1457550 (expected 1455033)` and `FAIL gold orders equal silver orders without the refunded ones: 300 (expected 299)`. The two checks on bronze and silver passed. The only file of the day holds one refund, for an order of 1 March.',
        clues: ['Bronze and silver are right', 'Gold is higher than silver by one order', 'The refund is an event of 2 March for an order of 1 March'],
        opts: [
          { t: 'Make gold recompute the order dates of the orders in the file, replace 1 March, and run the gate again', fb: '' },
          { t: 'Skip the gate for this run so that the pipeline is green', fb: 'The gate has found a real stale day.' },
          { t: 'Delete gold and rebuild only 2 March', fb: 'The wrong day is 1 March, and gold would still be incomplete.' },
          { t: 'Rebuild silver from bronze', fb: 'Silver is right. It is the one layer that the gate confirms.' }
        ],
        best: 0,
        why: 'The recorded hunt shows the cause and the proof: gold recomputed **2 March**, the day of the event, instead of **1 March**, the day of the order. After the fix gold held **299** orders and **1,455,033** cents, the same as silver, and all **4** checks passed.',
        checks: [
          ['Find the failing checks', 'Only the two on gold: the layers before it agree.'],
          ['Compare gold with silver', 'One order too many: 300 against 299.'],
          ['Find the order', 'The refund of order 41, placed on 1 March.'],
          ['Fix and prove', 'Use the order dates from silver, replace 1 March, and run the gate.']
        ],
        tell: 'A refund of an old order arrived on the day after, and gold recomputed the wrong day, so it still counted the order. The gate compared gold with silver and stopped the run before anyone read the number. I changed the code to ask silver for the order dates of the orders in the file, replaced the day, and the gate passed.',
        prevent: ['Keep the gate **between gold and silver**, on revenue and on orders', 'A **test** with a refund of an order of an earlier day', 'Always select the days from the **order**, not from the **event**']
      }),

      B.incident({
        id: 'm3-inc2', t: 2, src: 'docs', title: 'Incident: finance says that the revenue of 1 March changed overnight', time: '09:15',
        alert: '**A finance analyst writes: "the revenue of 1 March was higher yesterday, and I do not trust the report."** Nothing failed, and the gate passed.',
        clues: ['The gate passed', 'A refund of an order of 1 March arrived on 2 March', 'Silver keeps its versions'],
        opts: [
          { t: 'Explain that a refund restates the day of its order, and show the older number from the earlier version of silver', fb: '' },
          { t: 'Freeze gold for closed days so that it never changes', fb: 'A refund is real money, and a frozen day would be wrong.' },
          { t: 'Apologise and rebuild the table', fb: 'A rebuild gives the same number again.' },
          { t: 'Tell the analyst to ignore the difference', fb: 'A number that moves without an explanation breaks trust.' }
        ],
        best: 0,
        why: 'This is the design: an order stays on its day, and a refund **restates** that day. Delta makes it explainable, because `versionAsOf` returns silver as it was, so yesterday\'s number can be reproduced. The recorded tour shows the table at each version. A restatement report was not built, and this scenario is from documentation.',
        checks: [
          ['Find the cause', 'A refund of an order of 1 March arrived on 2 March.'],
          ['Reproduce yesterday', 'Read silver at the version before the refund, and add up the revenue.'],
          ['Explain the difference', 'The refunded amount, for that order.'],
          ['Prevent the surprise', 'Publish the rule, and show when a day was last restated.']
        ],
        tell: 'The number changed because an order of 1 March was refunded on 2 March, and gold restates the day of the order. I read silver as it was before the refund, and the difference was exactly the refunded amount. I added the rule to the documentation of the table, and the date of the last restatement to the report.',
        prevent: ['A **documented rule**: revenue is by order date, and refunds restate it', 'A column or a note with the **last restated** time', 'Keep enough **versions** to explain a number (check the retention)']
      }),

      B.cmp({
        id: 'm3-notbuilt', t: 2, src: 'docs', title: 'What a production lakehouse adds, and this one does not have',
        say: 'A reviewer will ask about the edges of the project. Press Next to read what is missing, and why it did not matter here.',
        cols: ['Topic', 'In the project', 'Status'],
        hl: 1,
        rows: [
          ['Table maintenance: `OPTIMIZE`, `VACUUM`', 'Each run appends small files. With ' + n(A3.bronze) + ' rows it did not matter, and no retention was set', 'Not built'],
          ['A contract with the source', 'A warning for a new field. The schema is fixed in code', 'Not built'],
          ['Cloud storage, a catalog, access control', 'A local folder. Nobody has roles, and nothing is encrypted', 'Stand-in'],
          ['Streaming ingestion', 'Batch files and a ledger. A stream would take the place of the ledger', 'Not built'],
          ['Alerts and a scheduler', 'The exit code of the gate is the only signal, and a person starts the run', 'Not built']
        ],
        steps: [
          { upto: 2, say: 'The first two are about **keeping the tables healthy** and the **agreement** with the source. Both grow with time and with the number of sources.' },
          { upto: 5, say: 'The last three are the **platform**: where the files live, who may read them, and who is told. I did not run any of them, and what I say about them comes from documentation.' }
        ]
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Operator', color: '#64748B',
        pts: [
          'The **gate** compares the layers: bronze rows against valid plus quarantined, one silver row for each order, and gold against silver in revenue and orders. A failed check makes the run **exit with 1**.',
          'Day 3 sent a **new field**, **two text amounts** and a **late event**: a warning, **' + D3.quarantined + '** quarantined rows, and **' + D3.left + '** event left alone. Nothing was lost, and the gate passed.',
          'A rerun of a finished day **did nothing**. The **ledger** guards the files, and the **merge** guards the events: two guards for two kinds of repeat.',
          'Delta kept **four versions** of silver. `versionAsOf` returns the table as it was: **' + V[1][1] + '** orders at version 1, **' + V[3][1] + '** at version 3.',
          'A **refund restates the day of its order**, and the gate caught the stale day: **300** orders in gold for **299** in silver.'
        ],
        lines: [
          'I stop the run when the layers disagree.',
          'I keep the raw text, so a new field is a decision and not a loss.',
          'I can read a table as it was.'
        ]
      })
    ]
  });
})();
