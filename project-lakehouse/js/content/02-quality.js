/* Mission 2: silver and gold. The merge that applies only newer events, the replay of day 2, and the gold days that are replaced as a whole. The files are those of projects/brewline-lakehouse, and the runs are real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, D2 = RUNS.day2, A1 = C('after_day1'), A2 = C('after_day2');
  var SIL = G.file('lakehouse/silver.py'), GLD = G.file('lakehouse/gold.py');
  G.expect(D2.inserted === 116 && D2.updated === 41 && D2.left === 259 && D2.valid === 458 && D2.quarantined === 4 && D2.gold_rows === 24 && D2.gold_days === 2 && D2.gate.length === 4 && D2.gate.every(function (l) { return /^PASS/.test(l); }), 'day 2 inserts 116, updates 41 and leaves 259 alone, quarantines the same 4 lines, and passes the 4 gate checks');
  G.expect(A2.silver === 416 && A2.silver_distinct === 416 && A2.shipped === 40 && A2.refunded === 1 && A2.gold_orders === 415 && A2.order5 === 'SHIPPED' && A2.quarantine === 8, 'after day 2 silver holds 416 orders (40 shipped, 1 refunded), gold counts 415 orders, and order 5 is shipped');

  var MSPAN = G.span(SIL, /^    target = DeltaTable\.forPath/, /^    \)$/), MERGE_BLOCK = G.lines(SIL, MSPAN[0], MSPAN[1]);
  var MERGE_BAD = MERGE_BLOCK.replace(".whenMatchedUpdate(condition='s.event_time > t.event_time', set=changed)", ".whenMatchedUpdate(set=changed)");
  var DAYS_BLOCK = G.lines(SIL, G.at(SIL, /m = target\.history/), G.at(SIL, /batch_dates = sorted/));
  var DAYS_BAD = DAYS_BLOCK.replace("    days = silver.join(batch.select('order_id'), 'order_id').select('order_date').distinct()", "    days = batch.select('order_date').distinct()");
  var BATCH_BLOCK = G.lines(SIL, G.at(SIL, /^    good = parsed/), G.at(SIL, /valid, distinct = /));
  var BATCH_BAD = BATCH_BLOCK.replace("    batch = ranked.where('rn = 1').drop('rn', 'file', 'line_no')", "    batch = good.drop('file', 'line_no')");
  G.expect(MERGE_BAD !== MERGE_BLOCK && DAYS_BAD !== DAYS_BLOCK && BATCH_BAD !== BATCH_BLOCK, 'the three bug hunts replace a line that is in silver.py');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Silver and gold: a merge that is safe to repeat', short: 'Silver and gold', blurb: 'The merge that applies only newer events, a replayed file, and gold days that are replaced whole', minutes: 28,
    focus: ['stg'],
    goals: [
      'Read the **silver step**: parse, quarantine, keep the latest event, and merge.',
      'Say why the merge updates a row **only when the event is newer**.',
      'Read **day 2**: a file delivered twice, and what the merge did with it.',
      'Say how **gold** is rebuilt for the days that changed, and why that is safe to repeat.'
    ],
    say: 'Silver is where the pipeline earns its keep. The same order arrives many times: twice in one file, again in a replay, late after a newer event. The merge has one rule that settles all of them. I will show it, run it, and then break it three ways.',
    scenes: [
      B.code({
        id: 'm2-silver', t: 1, src: 'rec', title: 'silver.py: parse, quarantine and merge', file: 'silver.py', lang: 'python', code: SIL,
        steps: [
          { say: 'One function does the work of silver for one run. Press Next.', lines: null },
          { say: 'It reads only the **bronze rows of this run**, and parses them with the rules of the last mission. Each row now has a struct `o` and a `reason`.', lines: G.span(SIL, /^def parse\(/, /return parsed\.withColumn/) },
          { say: 'The rows with a reason go to the **quarantine**, with their file, line number and raw text. They are appended, and none is dropped.', lines: G.span(SIL, /^    bad = parsed/, /quarantined\.write/) },
          { say: 'The good rows get a real timestamp and a date. Then **one row for each order** is kept: the one with the **latest event time**, and the last file and line if two have the same time.', lines: G.span(SIL, /^    good = parsed/, /valid, distinct = /) },
          { say: 'The **merge**: match on the order id. A row that is there is updated **only if the event is newer**, and the update changes everything except the **order date**. A row that is not there is inserted, with its order date. One step, and Delta writes it as one version.', lines: G.span(SIL, /# an update changes everything/, /^    \)$/) },
          { say: 'After the merge the step reads how many rows were inserted and updated from the **history** of the table. It also asks silver for the **order dates of the orders of this batch**: those are the days whose numbers may have changed, and gold recomputes them.', lines: G.span(SIL, /m = target\.history/, /batch_dates = sorted/) }
        ]
      }),

      B.flow({
        id: 'm2-merge', t: 1, src: 'rec', title: 'One rule for repeats, replays and late events', g: 'merge', legend: true,
        steps: [
          { say: 'Every event of a batch meets the row of its order in silver. Press Next.', focus: ['bat', 'cmp', 'slv', 'upd', 'skp'], cap: 'One question for every event.' },
          { say: 'Step 1. The batch holds **one event for each order**: the latest one, picked before the merge.', on: ['e1'], focus: ['bat', 'cmp'], cap: 'The batch.' },
          { say: 'Step 2. The merge finds the row of the order in silver and asks: **is this event newer than the row?** An order that is not there yet is simply inserted.', on: ['e2'], focus: ['cmp', 'slv'], cap: 'Newer than the row?' },
          { say: 'Step 3. **Yes: the row is updated.** On day 2, **' + D2.updated + '** orders changed: 40 were shipped and one was refunded.', on: ['e3'], focus: ['slv', 'upd'], cap: 'A real change is applied.' },
          { say: 'Step 4. **No: the row is left alone.** The **replay** of day 2 brought **' + A1.silver + '** events that silver already had, and **' + D2.left + '** of them were left alone.', on: ['e4'], focus: ['slv', 'skp'], tags: ['tg_replay'], cap: 'A repeat changes nothing.' },
          { say: 'The same rule covers a **late event**: an old event for an order that has a newer row is not newer, so it is left alone. Day 3 does that to order 5.', focus: ['cmp', 'skp'], tags: ['tg_late'], cap: 'A late event is left alone.' }
        ]
      }),

      B.term({
        id: 'm2-day2', t: 1, src: 'rec', title: 'Day 2: a new file, and a file delivered twice',
        say: 'The real second run. Read the merge line: inserted, updated, left alone.',
        lines: function () { return G.plain(X('run.day2')); },
        after: 'Two files arrived: the new orders with the status changes (**' + (D2.bronze_rows - D1.bronze_rows) + '** lines), and the **replay** of the file of day 1 (**' + D1.bronze_rows + '** lines). The merge **inserted ' + D2.inserted + '**, **updated ' + D2.updated + '** and **left ' + D2.left + ' alone**: silver holds **' + A2.silver + '** orders, **' + A2.shipped + '** shipped and **' + A2.refunded + '** refunded. The replay also **quarantined the same ' + D2.quarantined + ' dirty lines again**, so the quarantine holds **' + A2.quarantine + '** rows. Gold has **' + D2.gold_rows + '** rows for **' + D2.gold_days + '** days, and **' + A2.gold_orders + '** orders: the refunded one is not in it.',
        afterKind: 'tip',
        doneSay: 'The replay changed nothing.'
      }),

      B.widget({ id: 'm2-lab', kind: 'runlab', t: 1, src: 'rec', title: 'Lab: the runs of the pipeline' }),

      B.bug({
        id: 'm2-bug', t: 1, src: 'rec', q: 'Order 5 was placed, then shipped, then an old event of the order arrived late. Silver now says `PLACED`. Click the line that lets an old event overwrite a newer row.',
        file: 'silver.py', lang: 'python',
        code: MERGE_BAD,
        bad: [G.at(MERGE_BAD, /whenMatchedUpdate\(set=changed\)/)],
        hint: 'What does `whenMatchedUpdate` do when it has no condition?',
        why: 'Without a condition, **every** matched row is overwritten by whatever arrives, so the **last event to be processed wins**, and not the latest one. In my hunt, order 5 was placed, shipped at minute 600, and then an event of minute 3 arrived in a later file: silver said **PLACED**. With `condition=\'s.event_time > t.event_time\'` it stays **SHIPPED**. Delivery order is not event order, and day 3 of the real run does exactly this.',
        fix: MERGE_BLOCK + '\n',
        cheer: 'Compare the times, not the arrival order.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, src: 'rec', q: 'The first file has 301 valid lines for 300 orders, because order 7 is there twice. Silver ends with 301 rows, and the gate stops the run. Click the line that forgets to keep one event for each order.',
        file: 'silver.py', lang: 'python',
        code: BATCH_BAD,
        bad: [G.at(BATCH_BAD, /batch = good\.drop/)],
        hint: 'How many rows does the batch have for an order that appears twice?',
        why: 'The batch had **two** rows for order 7, and a merge that does not find the order in the table **inserts both**. Silver held **301** rows for **300** orders, and the gate printed `FAIL silver has one row for each order: 301 (expected 300)` and the run exited with 1. A window with `row_number()` over the order id, ordered by event time, file and line, keeps the **latest** event of each order.',
        fix: BATCH_BLOCK + '\n',
        cheer: 'One event for each order, before the merge.'
      }),

      B.code({
        id: 'm2-gold', t: 1, src: 'rec', title: 'gold.py: replace the days that changed', file: 'gold.py', lang: 'python', code: GLD,
        steps: [
          { say: 'Gold is a small aggregate that is rebuilt for some days. Press Next.', lines: null },
          { say: 'It reads silver for the **order dates that the run touched**, and leaves out the **refunded** orders.', lines: G.span(GLD, /silver = spark\.read/, /live = silver\.where/) },
          { say: 'It counts the orders and adds up the revenue for each **order date and store**.', lines: G.span(GLD, /orders, revenue = /, /daily = live\.groupBy/) },
          { say: 'Then it **replaces those days as a whole** with `replaceWhere`: the old rows of the days go, and the new rows come, in one write. A repeat writes the same rows into the same days.', lines: G.span(GLD, /predicate = /, /writer\.option/) }
        ]
      }),

      B.bug({
        id: 'm2-bug3', t: 2, src: 'rec', q: 'A file holds only the refund of order 41, which was placed on 1 March. The gate fails: gold still counts the order. Click the line that picks the wrong days to recompute.',
        file: 'silver.py', lang: 'python',
        code: DAYS_BAD,
        bad: [G.at(DAYS_BAD, /days = batch\.select/)],
        hint: 'On which day was order 41 placed, and which day is in the batch?',
        why: 'A refund restates the day of the **order**, and the batch holds the day of the **event**. With the dates of the batch, gold recomputed **2 March**, which holds nothing of order 41, and left **1 March** as it was. In my hunt, day 1 and then a file with one refund: gold held **300** orders and **1,457,550** cents, and silver without the refunded order **299** and **1,455,033**. The gate failed 2 of its 4 checks. When silver is asked for the **order dates** of the orders of the batch, gold recomputes 1 March, and the gate passes.',
        fix: DAYS_BLOCK + '\n',
        cheer: 'Restate the day of the order.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'The merge of day 2 reports `inserted ' + D2.inserted + ', updated ' + D2.updated + ', left ' + D2.left + ' alone`. What are the ' + D2.left + '?',
        opts: [
          { t: 'Events of the replayed file whose order silver already held, with a time that is not newer', fb: '' },
          { t: 'Orders that failed a rule', fb: 'Those went to the quarantine, and they are counted apart.' },
          { t: 'Orders that were lost', fb: 'Nothing is lost: ' + D2.inserted + ' + ' + D2.updated + ' + ' + D2.left + ' = ' + A2.silver + ', the orders of silver.' },
          { t: 'Orders that are refunded', fb: 'Only one order is refunded, and it was updated.' }
        ],
        ok: 0, why: 'The replay brought the events of day 1 again. For **' + D2.updated + '** orders silver already had a newer row, and for the other **' + D2.left + '** the event was the same as the row: not newer, so nothing changed.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'Why does gold ask silver for the **order dates** of the orders of the batch, and not use the dates of the events?',
        opts: [
          { t: 'A refund is an event of a later day, and the numbers to restate are those of the day when the order was placed', fb: '' },
          { t: 'Delta requires it', fb: 'It is a rule of this pipeline, not of Delta.' },
          { t: 'The events have no date', fb: 'Every event has a time, and silver derives a date from it.' },
          { t: 'To use more Spark tasks', fb: 'It is about correctness.' }
        ],
        ok: 0, why: 'The order date is set once, when the order is first inserted, so a shipment never moves revenue between days and a refund changes the day of its order. The bug hunt shows the cost of the wrong days: **300** orders in gold for **299** in silver.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'What does a run of gold do when it is repeated with the same silver?',
        opts: [
          { t: 'It writes the same rows into the same days, so the table does not change', fb: '' },
          { t: 'It doubles the revenue', fb: '`replaceWhere` removes the old rows of the days first.' },
          { t: 'It fails because the days exist', fb: 'A replace of existing days is the normal case.' },
          { t: 'It appends a second copy', fb: 'The write mode is overwrite with a predicate.' }
        ],
        ok: 0, why: 'The write is `overwrite` with `replaceWhere` on the days: a **replace**, and not an append. The recorded run of day 3 again did not touch gold at all, and the totals stayed at **' + n(C('after_day3_again').gold) + '** rows.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'Two events of the same order have the same time, in two files. Which one does silver keep?',
        opts: [
          { t: 'The one from the later file name, and then the later line', fb: '' },
          { t: 'The first one that Spark reads', fb: 'The order of reading is not defined.' },
          { t: 'Both', fb: 'Silver has one row for each order.' },
          { t: 'Neither: it is quarantined', fb: 'A tie is not a broken rule.' }
        ],
        ok: 0, why: 'The window orders by `event_time` desc, then `file` desc, then `line_no` desc, so even a tie has **one answer** that is the same on every run. That is why bronze keeps the file and the line.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the steps of one run in the order that `run.py` uses.',
        items: ['Write the files of the day into the landing zone', 'Append the new lines to bronze, and the files to the ledger', 'Parse, quarantine the bad rows, and merge the good ones into silver', 'Replace the gold days that changed', 'Run the gate, and exit with 1 if a check fails'],
        why: 'Each step reads only what the one before wrote. The ledger is written **with** bronze, so a file is never read again, and the gate runs **last**, on the finished layers.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision (ADR 2): how silver is written',
        scenario: 'Events arrive late, twice, and out of order. Silver must hold one row for each order, with the latest event, and a repeat of a run must change nothing. The data is small today.',
        opts: [
          { t: 'Merge into silver, only when the event is newer', d: 'Each run touches only the orders of the batch. A repeat, a replay and a late event are all harmless.', lose: 'The merge needs a unique key and a trustworthy event time, and a wrong time wins silently.' },
          { t: 'Rebuild the whole of silver from bronze at every run', d: 'The simplest logic: there is no state to get wrong, and a bug fix is one run.', lose: 'The cost grows with all of history, and every run rewrites every row.' },
          { t: 'Append every event, and let a view pick the latest', d: 'The cheapest write, and the full history is in the table.', lose: 'Every reader pays for the window, and must know the rule. A reader who forgets it counts an order twice.' }
        ],
        pick: 0,
        why: 'The recording shows the merge doing its job: **' + D2.inserted + '** inserted, **' + D2.updated + '** updated and **' + D2.left + '** left alone in one write, and a replay that changed nothing. This is a design judgement, and the other two were not built.',
        when: 'If the volume is small and history is short, a full rebuild from bronze is the simplest thing that works. Keep the merge for the day when a run must not rewrite everything.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Merger', color: '#94A3B8',
        pts: [
          'Silver keeps **one row for each order**: the batch is reduced to the latest event of each order first, with the file and the line as tie-breakers.',
          'The merge updates a row **only when the event is newer**. Without that condition the last arrival wins, and an old event turned **SHIPPED** back into **PLACED**.',
          'Day 2: **' + D2.inserted + '** inserted, **' + D2.updated + '** updated, **' + D2.left + '** left alone. The replay changed nothing, and it **quarantined the same ' + D2.quarantined + ' lines again**.',
          'Gold is **replaced by order date**, and a refund restates the day of its order. The wrong days left **300** orders in gold for **299** in silver, and the gate failed.',
          'Without the window, order 7 was inserted twice: **301** rows for **300** orders, and the gate stopped the run.'
        ],
        lines: [
          'I compare the time of the event, not the time of the arrival.',
          'I keep one event for each key before I merge.',
          'I restate the day of the order, not the day of the event.'
        ]
      })
    ]
  });
})();
