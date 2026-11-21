/* Mission 4: defend it. The talk track and the questions that a reviewer asks about this lakehouse. Every number is from the recording of the real runs, or from a bug hunt that the verifier reruns. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, D2 = RUNS.day2, D3 = RUNS.day3, A1 = C('after_day1'), A2 = C('after_day2'), A3 = C('after_day3'), T = C('tests');
  G.expect(T.passed === 7 && D1.inserted === 300 && D2.left === 259 && A3.silver === 496 && A3.bronze === 850 && A3.quarantine === 10, 'the totals that the answers quote: 7 tests, 300 orders on day 1, 259 left alone on day 2, 496 orders, 850 bronze rows and 10 quarantined rows after day 3');
  var SOL = 'order = [F.col(\'event_time\').desc(), F.col(\'file\').desc(), F.col(\'line_no\').desc()]\nlatest = Window.partitionBy(\'order_id\').orderBy(*order)\nranked = good.withColumn(\'rn\', F.row_number().over(latest))\nbatch = ranked.where(\'rn = 1\').drop(\'rn\', \'file\', \'line_no\')\nprint(batch.count())\n';
  var SIL = G.file('lakehouse/silver.py');
  G.expect(SOL.split('\n').slice(0, 4).every(function (l) { return SIL.indexOf(l) >= 0; }), 'the solution of the coding round is the code of silver.py');

  var QA = [['qa-walk', 1], ['qa-layers', 1], ['qa-merge', 1], ['qa-repeat', 1], ['qa-quarantine', 1], ['qa-late', 2], ['qa-gate', 2], ['qa-scale', 2], ['qa-evolve', 2], ['qa-change', 2]];

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Defend it', short: 'Defend', blurb: 'The two-minute story, the questions of a review, a coding round, and what you would change', minutes: 30,
    focus: ['mon'],
    goals: [
      'Tell the project in **two minutes**, with numbers that you ran.',
      'Answer the **questions of a review**: layers, merge, repeats, bad data, scale.',
      'Solve a **coding round** on the code of silver.',
      'Say what you would **change**, and what the project does **not** cover.'
    ],
    say: 'A project is only worth what you can defend. This mission is the interview: the story in two minutes, the questions that a reviewer asks, a coding round, and the honest list of what the project does not do. Every number below came from a run.',
    scenes: [
      B.talk({
        id: 'm4-story', t: 1, src: 'rec', title: 'The project in two minutes',
        say: 'Five parts, one idea each. Say them out loud, and use the numbers.',
        items: [
          ['The problem', 'Brewline\'s shop drops a file of **order events** every day. They hold **duplicates, late events, a field that nobody announced and dirty lines**. The team needs tables that nobody has to doubt.', 'Say what the readers need.'],
          ['The design', '**Bronze** keeps every line as text, and a **ledger** reads each file once. **Silver** validates, sends bad rows to a **quarantine** with the reason, and **merges** only newer events. **Gold** is replaced by order date. A **gate** compares the layers. It is Spark and **Delta Lake**.', 'Three layers, a quarantine, a gate.'],
          ['The proof', 'I ran three days for real. Day 1 read **' + D1.bronze_rows + '** lines and made **' + D1.inserted + '** orders. On day 2 a file came twice, and the merge **left ' + D2.left + ' alone**. On day 3 a late event changed nothing, and a rerun **did nothing**. ' + T.passed + ' tests pass.', 'Numbers that you ran.'],
          ['The failures', 'I broke it on purpose: a merge **without the time condition** turned SHIPPED back into PLACED, no window gave **301** rows for **300** orders, and the wrong gold days left **300** orders for **299**. My first design also **moved revenue between days**, and I changed it.', 'Failures that you caused and fixed.'],
          ['The honest part', 'A local folder, one machine, nothing timed. **No scheduler, no alerts, no `OPTIMIZE` or `VACUUM`**, no contract with the source, and a Docker and a CI sketch that did not run. I would add the alert and the contract first.', 'What is missing, said first.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm4-covered', t: 1, src: 'rec', title: 'What the project covers, and what it does not',
        say: 'A reviewer will ask about the edges of the project. Press Next to see where they are.',
        cols: ['Topic', 'In the project', 'Status'],
        hl: 1,
        rows: [
          ['Repeats and replays', 'A ledger of files and a merge on time. A rerun and a replay changed nothing', 'Run'],
          ['Late, duplicate and dirty data', 'A late event, a duplicate order, five quarantine reasons', 'Run'],
          ['Refunds and restated days', 'Gold by order date: ' + n(A2.gold_orders) + ' orders in gold for ' + n(A2.silver) + ' in silver after the refund', 'Run'],
          ['Tests and a gate', T.passed + ' pytest tests, and a gate of 4 checks after every run', 'Run'],
          ['Scale, cloud storage, Databricks', 'One machine and a local folder. Nothing was timed', 'Stand-in'],
          ['Streaming, a scheduler, alerts, maintenance, access control', 'None of them is built', 'Not built']
        ],
        steps: [
          { upto: 4, say: 'The first four rows are what the project **proves**. Each one has a run behind it, and a bug hunt that breaks it.' },
          { upto: 6, say: 'The last two are what a production version adds. Say them **before** the reviewer does: a gap that you name is a plan, and a gap that is found is a flaw.' }
        ]
      }),

      B.qa({
        id: 'qa-walk', t: 1, tag: 'Project', secs: 90,
        q: 'Walk me through your pipeline, from the files to the report.',
        pts: ['Bronze keeps the text', 'Silver validates and merges', 'Gold by order date', 'A gate at the end'],
        short: 'Files of order events land in a folder. **Bronze** copies every line as raw text, with its file and line number, and a **ledger** remembers which files were read. **Silver** parses the text with Spark, sends rows that break a rule to a **quarantine** with the reason, keeps the latest event of each order, and **merges** into a Delta table only when the event is newer. **Gold** holds the revenue and the orders of each store and order date, and it is replaced one day at a time. A **gate** compares the layers after every run and exits with 1 when they disagree. I ran three days: day 1 read **' + D1.bronze_rows + '** lines and made **' + D1.inserted + '** orders, with **' + D1.quarantined + '** quarantined. After day 3 silver held **' + A3.silver + '** orders, bronze **' + A3.bronze + '** rows and the quarantine **' + A3.quarantine + '**.',
        fu: [['Where would you replay from?', 'From bronze: it holds the raw text of every line.'], ['What did you not build?', 'A scheduler, alerts, maintenance, and a contract with the source.']],
        trap: 'Describing tools instead of guarantees.',
        real: 'Walk through a pipeline that you own.'
      }),

      B.qa({
        id: 'qa-layers', t: 1, tag: 'Project', secs: 60,
        q: 'Why three layers, and not one table?',
        pts: ['Each layer a promise', 'Replay from bronze', 'A parse failure is a row', 'The cost'],
        short: 'Each layer makes one **promise**, and a single table would mix them. **Bronze** never loses a line, because it does not parse: a cut line and a text amount both reached it. That also makes bronze the place to **replay from**: on day 3 a field `coupon` arrived, and bronze held it before anyone decided what to do. **Silver** promises **one valid row for each order**, and a failure of the rules becomes a quarantined row with a reason and not a lost line. **Gold** promises numbers that a report can read without parsing anything. The cost is three copies of the data and three steps to keep in step, and the **gate** exists for that: it checks that the layers agree. For a source that is small and clean I would use fewer layers.',
        fu: [['Is bronze always append only?', 'Yes here. A delete for privacy needs a plan that I did not build.'], ['Where do you put business rules?', 'In silver and gold, in code that the tests cover.']],
        trap: 'Saying that it is the standard pattern, with no reason.',
        real: 'Explain a layer that you removed or added.'
      }),

      B.qa({
        id: 'qa-merge', t: 1, tag: 'Project', secs: 60,
        q: 'How does the merge make a repeat harmless?',
        pts: ['Match on the order id', 'Update only when newer', 'One event for each order first', 'The gap: a bad clock'],
        short: 'The merge matches on the order id and updates a row **only when the event is newer**: `s.event_time > t.event_time`. On day 2 it **inserted ' + D2.inserted + ', updated ' + D2.updated + ' and left ' + D2.left + ' alone**, and the replayed file changed nothing. Two details matter. Without the condition the **last arrival wins**: in my hunt an old event turned SHIPPED back into PLACED. And the batch must hold **one event for each order** first, with a window: without it, order 7 was inserted twice and silver held **301** rows for **300** orders, which the gate caught. The gap is the **event time**. A source with a wrong clock wins silently, so I would check the times in the gate, and I did not.',
        fu: [['What if two events have the same time?', 'The later file and the later line win, so the answer is the same on every run.'], ['Why not rebuild silver every run?', 'It is simpler at this size. A merge matters when a run must not rewrite everything.']],
        trap: 'Merging without a condition on time.',
        real: 'Describe a merge that you made idempotent.'
      }),

      B.qa({
        id: 'qa-repeat', t: 1, tag: 'Project', secs: 60,
        q: 'The same file is delivered twice, or someone runs a day twice. What happens?',
        pts: ['The ledger by file name', 'The merge by event time', 'Day 3 again did nothing', 'The gap: a repeat in quarantine'],
        short: 'Two guards for two kinds of repeat. The **ledger** knows files by name, so running **day 3 again** read zero files and did nothing: bronze **' + n(A3.bronze) + '**, silver **' + A3.silver + '**, all unchanged. A file with the **same lines under another name** passes the ledger: the replay of day 2 was read again, and bronze took its **' + D1.bronze_rows + '** lines. Then the **merge** left **' + D2.left + '** events alone and changed nothing in silver. Both guards are needed, because each stops what the other cannot. The gap: a replay also puts the **same dirty lines in the quarantine again**: day 2 added **4** rows that day 1 already had. I would deduplicate the quarantine on file content, or count distinct lines.',
        fu: [['Why not hash the content of files?', 'It would stop the replay at the ledger. It costs a read of each file, and I did not build it.'], ['What if a file is edited in place?', 'The ledger would skip it. Files should be immutable, and I would say so in a contract.']],
        trap: 'Trusting one guard for every kind of repeat.',
        real: 'Describe a duplicate that got through.'
      }),

      B.qa({
        id: 'qa-quarantine', t: 1, tag: 'Project', secs: 60,
        q: 'What do you do with bad data?',
        pts: ['Quarantine, do not drop', 'A reason on every row', 'Read the reasons', 'The gap: nobody is told'],
        short: 'I **quarantine** it: the row goes to its own table with the **reason**, its file, its line and its raw text, and the run goes on. I do not drop it, because nobody could say what was lost, and I do not fail the run, because four dirty lines should not stop **' + D1.valid + '** good ones. There are five reasons: `parse_error`, `bad_type`, `bad_amount`, `bad_status` and `unknown_store`. After three days the quarantine held **' + A3.quarantine + '** rows. **Read the reasons as well as the count:** in a hunt, a check on a null struct labelled the cut line `missing_order_id` and the text amount `bad_amount`, and the count still looked fine. The gap is that **nobody is told**: I would alert when a run quarantines more than a small share of its lines.',
        fu: [['Who fixes the quarantine?', 'The owner of the source, with the file and the line in hand.'], ['Can quarantined rows come back?', 'Yes: fix the rule or the source, and replay from bronze. I did not run that replay.']],
        trap: 'Dropping bad rows to keep the numbers clean.',
        real: 'Describe how you handled a bad feed.'
      }),

      B.qa({
        id: 'qa-late', t: 2, tag: 'Project', secs: 60,
        q: 'An old event arrives after a newer one. And what about a refund of an old order?',
        pts: ['The merge leaves it alone', 'Bronze keeps the line', 'Gold by order date', 'The gap: the first event'],
        short: 'The **late event** is not newer than the row, so the merge **leaves it alone**: on day 3 it reported **' + D3.left + ' left alone**, and order 5 stayed SHIPPED. Bronze still holds the line, so the history is complete. A **refund of an old order** is a newer event of an old order, so it is applied, and it must **restate the day of the order**. That is why silver keeps an **order date** that is set once, and gold recomputes the order dates of the orders in the batch. In a hunt, the dates of the events instead gave gold **300** orders for **299** in silver, and the gate failed. The gap: the order date is the date of the **first event that silver saw**. If the first one that arrives is late, the date is wrong.',
        fu: [['Why not partition silver by the date of the latest event?', 'My first design did, and a shipment moved revenue from one day to the next. I changed it.'], ['What about a restated day that was already reported?', 'Show the date of the last restatement, and keep versions to explain the difference.']],
        trap: 'Using the date of the event for a business day.',
        real: 'Describe how you handled a restatement.'
      }),

      B.qa({
        id: 'qa-gate', t: 2, tag: 'Project', secs: 60,
        q: 'Why a gate, what does it check, and what can it not see?',
        pts: ['Four checks', 'It stops the run', 'What the hunts showed', 'The gap: the source'],
        short: 'The gate has **4 checks** after every run: every bronze row of the run is valid or quarantined, silver has **one row for each order**, and gold equals silver in **revenue and in orders** without the refunded orders. A failed check makes the run **exit with 1**, so whatever follows can stop. It earned its place in the hunts: it caught the missing window (**301** against **300**) and the wrong gold days (**1,457,550** against **1,455,033** cents, and **300** against **299** orders). It cannot see what never arrived. It compares the layers with **each other**, and a file that was never delivered makes every layer agree. I would add a **manifest** from the source, with the files and the rows that it sent, and compare against it.',
        fu: [['Where does the gate run?', 'At the end of the run, on the finished tables. It could also run before gold is published.'], ['Could a check be wrong?', 'Yes. My checks have their own bug hunts, and a check that cries wolf is ignored.']],
        trap: 'Checking the layers only against each other.',
        real: 'Describe a check that caught a bug.'
      }),

      B.qa({
        id: 'qa-scale', t: 2, tag: 'Project', secs: 60,
        q: 'What changes with a thousand times the data, on a cloud and with Databricks?',
        pts: ['Paths and a catalog', 'Small files and maintenance', 'The ledger and streaming', 'Nothing was measured'],
        short: 'The design holds, and the details change. The **paths** become a bucket and a catalog, with roles. Every run appends files, so **small files** become real: `OPTIMIZE`, `VACUUM` and a retention that still lets me read a table as it was. The **ledger** is code that I wrote for a folder, and a managed file source or a stream would take its place. The **gate** counts whole tables, and at that size it should read table statistics. The partition by order date may need a coarser grain, because 365 days is fine and a million small partitions is not. **Cost** and the size of the cluster are the questions that I cannot answer: I ran **' + n(A3.bronze) + '** rows on one machine and timed nothing, so I would measure first.',
        fu: [['Would you keep Delta?', 'Yes, if the platform is Databricks or Spark. Iceberg if several engines read the tables.'], ['Where would it break first?', 'Probably the small files in bronze, and the collects of dates in silver.']],
        trap: 'Claiming a scale that you did not test.',
        real: 'Describe a pipeline that you moved to a bigger system.'
      }),

      B.qa({
        id: 'qa-evolve', t: 2, tag: 'Project', secs: 60,
        q: 'A source adds a field, or changes a type. What happens?',
        pts: ['A new field: a warning', 'A wrong type: quarantine', 'Bronze keeps the text', 'A contract is the real fix'],
        short: 'Both reach **bronze** as text, so nothing is lost. A **new field** is not in the schema of silver, so silver ignores it, and the run **warns** and goes on: on day 3 `' + D3.warning + '` was on **20** orders, and the gate passed. A **changed type** is a broken rule: two amounts arrived as text, and the two rows went to the quarantine as `bad_type`. I chose a warning for the new field, because a failure would stop the pipeline for a harmless addition, and an automatic change of the schema would let a typo change a table that people read. The real fix is a **contract** with the source team, checked before bronze, and I did not build one. If silver should keep the field, add it to the schema and replay silver from bronze, which I did not run.',
        fu: [['When would you fail the run?', 'When the field changes the meaning of money or of keys.'], ['What about a renamed field?', 'It looks like a missing field and a new one, so the contract is the only reliable check.']],
        trap: 'Changing the schema automatically.',
        real: 'Describe how you handled a change in a feed.'
      }),

      B.qa({
        id: 'qa-change', t: 2, tag: 'Project', secs: 60,
        q: 'What would you change if you built it again?',
        pts: ['Alerts and a scheduler', 'A contract and a manifest', 'Maintenance', 'Tests for restated days first'],
        short: 'Four things, in this order. **First the alert and a scheduler**: the exit code of the gate is the only signal, and a person starts the run. Project one of this library shows Airflow around a pipeline. **Second a contract and a manifest** from the source, checked before bronze and used by the gate, which would catch a file that never arrived and a renamed field. **Third maintenance**: `OPTIMIZE`, `VACUUM` and a retention that I choose on purpose. **Fourth**, tests for a **restated day** from the start: my first design partitioned silver by the date of the latest event, so a shipment moved revenue between days, and I found it only when I read gold by hand. I would also **measure** one run on a real cluster, and keep the replay from bronze as a tested command.',
        fu: [['What would you keep?', 'The ledger and the merge together, the quarantine with reasons, and the gate.'], ['What did the first design teach you?', 'Ask what a refund does to a day, before the first run.']],
        trap: 'Saying that nothing needs to change.',
        real: 'Describe a decision that you would take differently.'
      }),

      B.challenge({
        id: 'm4-ch', t: 1, title: 'Coding round: one event for each order', file: 'challenge.py', lang: 'python',
        q: 'The first file of day 1 has **' + D1.valid + '** valid events for **' + D1.inserted + '** orders, because order 7 appears twice. `good` is a Spark DataFrame with `order_id`, `event_time`, `file`, `line_no` and the other columns. Write the code that keeps **one event for each order**: the **latest** by `event_time`, and when two events have the same time, the one from the **later file** and then the **later line**. Print the number of rows.',
        starter: 'from pyspark.sql import Window, functions as F\n\nbatch = good  # your code here\nprint(batch.count())\n',
        hints: ['A **window** over each order: `Window.partitionBy(\'order_id\')`.', 'Order the window by `event_time`, then `file`, then `line_no`, all **descending**, so that the first row is the latest.', '`F.row_number().over(window)` numbers the rows of each order. Keep `rn = 1`.', 'Drop the helper columns at the end, so that the batch has the columns of silver.'],
        sol: SOL,
        res: { cols: ['Valid events', 'Rows after the window'], rows: [[n(D1.valid), n(D1.inserted)]] },
        expl: ['`partitionBy(\'order_id\')` makes a group for each order. Order 7 has two events in its group, and every other order has one.', '`row_number()` over the order **event time, file, line**, all descending, gives each event a number, with **1** for the latest. A tie has one answer, which is the same on every run.', '`where(\'rn = 1\')` keeps one event for each order: **' + n(D1.valid) + '** become **' + n(D1.inserted) + '**. Without it the merge inserted order 7 twice, and the gate failed.'],
        cx: 'The window shuffles by `order_id` and sorts inside each group. For a very large batch, `groupBy(\'order_id\').agg(F.max(F.struct(...)))` picks the latest without a full sort, and it only works when the struct starts with the sort fields in the same order.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm4-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the real runs with Spark ' + M('pyspark') + ' and Delta Lake ' + M('delta') + ', and from the bug hunts. Take a screenshot or print the page.',
        sections: [
          { h: 'The design', items: ['**Bronze**: every line as text, with the file and the line. A **ledger** of files, read once. **Silver**: parse, **quarantine** with a reason, one event for each order, **merge only when newer**', '**Gold**: revenue and orders for each store and **order date**, without the refunded orders, replaced by day with `replaceWhere`. The **order date** is set once', '**Gate**: 4 checks after every run, exit code 1 when they fail. **' + T.passed + '** pytest tests'] },
          { h: 'The runs', items: ['Day 1: **' + D1.bronze_rows + '** lines, **' + D1.valid + '** valid, **' + D1.inserted + '** orders, **' + D1.quarantined + '** quarantined. Day 2: **' + n(D2.bronze_rows) + '** lines in 2 files, inserted **' + D2.inserted + '**, updated **' + D2.updated + '**, left alone **' + D2.left + '**', 'Day 3: **' + D3.bronze_rows + '** lines, inserted **' + D3.inserted + '**, left alone **' + D3.left + '**, warning `' + D3.warning + '`, **' + D3.quarantined + '** `bad_type`. Day 3 again: **nothing to do**', 'After day 3: bronze **' + n(A3.bronze) + '**, silver **' + A3.silver + '** (' + A3.shipped + ' shipped, ' + A3.refunded + ' refunded), quarantine **' + A3.quarantine + '**, gold **' + A3.gold + '** rows, **4** versions of silver'] },
          { h: 'What the bug hunts showed', items: ['A merge **without the time condition**: an old event turned SHIPPED back into **PLACED**', 'No window on the batch: **301** silver rows for **300** orders, and the gate failed', 'Gold days taken from the events: gold **300** orders and **1,457,550** cents, silver **299** and **1,455,033**', 'A null-struct check in the rules: the cut line became `missing_order_id`, and a text amount `bad_amount`'] },
          { h: 'Not covered (say it first)', items: ['No cloud storage, cluster, streaming, scheduler, alerts or access control. A Docker and a CI sketch that did not run', 'No `OPTIMIZE` or `VACUUM`, no contract or manifest from the source. Nothing was timed', 'The order date is the first event that silver saw. A repeat puts the same dirty lines in the quarantine again'] }
        ]
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Defender', color: '#334155',
        pts: [
          'You tell the project in **two minutes**: the problem, the design, the proof, the failures and the honest part.',
          'You say what each choice **guarantees**: bronze loses nothing, the merge makes a repeat harmless, the gate stops a bad run.',
          'You back each claim with a **number that you ran**: ' + n(D1.valid) + ' valid lines for ' + D1.inserted + ' orders, ' + D2.left + ' events left alone, ' + A3.silver + ' orders after day 3.',
          'You name the **gaps** before the reviewer does: alerts, a contract, maintenance, scale, and the first design that you changed.',
          'You solve the **coding round** on the window, and you know the cost of the sort.'
        ],
        lines: [
          'I can defend every design choice with a run.',
          'I name the gaps before I am asked.',
          'I say what I changed my mind about.'
        ]
      })
    ])
  });
})();
