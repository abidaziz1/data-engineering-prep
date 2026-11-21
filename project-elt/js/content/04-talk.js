/* Mission 4: defend it. The talk track and the questions that a reviewer asks about this pipeline. Every number is from the recording of the real runs. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, F3 = RUNS.day3_fail, X3 = RUNS.day3_fix, BF = RUNS.backfill2, A1 = C('after_day1'), A2 = C('after_day2'), AF = C('after_failed_day3'), A3 = C('after_day3'), FG = C('first_gate'), T = C('tests');
  G.expect(T.passed === 5, 'the five tests of the shop pass');

  var QA = [['qa-walk', 1], ['qa-merge', 1], ['qa-tests', 1], ['qa-orch', 1], ['qa-backfill', 1], ['qa-failclosed', 2], ['qa-gate', 2], ['qa-scale', 2], ['qa-monitor', 2], ['qa-change', 2]];

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Defend it', short: 'Defend', blurb: 'The two-minute story, the questions of a review, and what you would change', minutes: 28,
    focus: ['mon'],
    goals: [
      'Tell the project in **two minutes**, with numbers that you ran.',
      'Answer the **questions of a review**: design, failure, backfill, scale.',
      'Say what you would **change**, and what the project does **not** cover.',
      'Keep a **one-page review** of the pipeline.'
    ],
    say: 'A project is only worth what you can defend. This mission is the interview: the story in two minutes, the questions that a reviewer asks, and the honest list of what the project does not do. Every number below came from a run.',
    scenes: [
      B.talk({
        id: 'm4-story', t: 1, src: 'rec', title: 'The project in two minutes',
        say: 'Five parts, one idea each. Say them out loud, and use the numbers.',
        items: [
          ['The problem', 'Brewline\'s orders live in a shop system. The data team needs them in a warehouse every day, **without duplicates, with the history of changes, and with a way to know that the numbers are right**.', 'Say what the readers need.'],
          ['The design', '**dlt** loads the shop incrementally, with a **cursor, a lookback of one hour and a merge** on the id. **dbt** builds the models and runs **14 tests**. A **gate** compares the warehouse with the shop. **Airflow** runs the four steps in order, and **publishes only after the gate**.', 'Four steps, one idea each.'],
          ['The proof', 'I ran it for real through Airflow: day 1 loaded **' + n(A1.raw_orders) + '** orders and passed **' + D1.dbt.PASS + '** of **' + D1.dbt.TOTAL + '** checks. A repeat of a day wrote **0** rows. A backfill passed the gate.', 'Numbers that you ran.'],
          ['The failure', 'On day 3 a product had **no price**. A dbt test failed, **' + F3.dbt.SKIP + '** nodes were skipped, the readers kept day 2, and **one line in the seed plus a rerun** fixed it. The marts then held **' + n(A3.fct_orders) + '** orders, equal to the shop.', 'A failure that you caused and fixed.'],
          ['The honest part', 'My first gate **failed a good backfill**, because it compared with the wrong day. It runs on DuckDB and not on a cloud warehouse, **no alert is built**, and Airflow ran as a test command. I would add the alert first.', 'What is missing, said first.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm4-covered', t: 1, src: 'rec', title: 'What the project covers, and what it does not',
        say: 'A reviewer will ask about the edges of the project. Press Next to see where they are.',
        cols: ['Topic', 'In the project', 'Status'],
        hl: 1,
        rows: [
          ['Incremental, repeatable load', 'A cursor, a lookback and a merge. A repeat wrote 0 rows', 'Run'],
          ['Tests and a gate', '14 dbt tests, a singular test, a gate against the source, 5 pytest tests', 'Run'],
          ['A failure and a backfill', 'Day 3 failed closed and was fixed. Day 2 was backfilled', 'Run'],
          ['Deletes in the source', 'The shop never deletes. A cursor cannot see a delete', 'Not covered'],
          ['A cloud warehouse', 'DuckDB stands in. Costs, clustering and roles do not exist here', 'Stand-in'],
          ['Alerts, secrets, CI', 'No alert channel, no secrets backend, a CI sketch that did not run', 'Not covered']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are what the project **proves**. Each one has a run behind it.' },
          { upto: 6, say: 'The last three are what a production version adds. Say them **before** the reviewer does: a gap that you name is a plan, and a gap that is found is a flaw.' }
        ]
      }),

      B.qa({
        id: 'qa-walk', t: 1, tag: 'Project', secs: 90,
        q: 'Walk me through your pipeline, from the source to the reader.',
        pts: ['Four steps in order', 'Incremental and repeatable load', 'Tests and a gate', 'Publish last'],
        short: 'It runs once a day for one day of data, in **four steps** under Airflow. **dlt** reads the shop API with a **cursor**, a lookback of one hour and a **merge** on the order id, so a repeat changes nothing: day 1 wrote **' + n(A1.raw_orders) + '** orders and a repeat of a day wrote **0** rows. **dbt** builds staging views and marts and runs **14 tests**: keys, values, relationships, a price for every product, and the totals adding up. A **gate** compares the warehouse with the shop: rows against distinct ids, orders, revenue. Only then are the marts **published** as Parquet. If a step fails, the steps after it do not run, and the readers keep the previous day.',
        fu: [['Where is the history of a changed store?', 'A dbt snapshot: store 4 has two rows after the rename.'], ['What would you add first?', 'A failure alert and a freshness check.']],
        trap: 'Describing tools instead of guarantees.',
        real: 'Walk through a pipeline that you own.'
      }),

      B.qa({
        id: 'qa-merge', t: 1, tag: 'Project', secs: 60,
        q: 'Why a cursor, a lookback and a merge together?',
        pts: ['Cursor: read less', 'Lookback: late changes', 'Merge: a repeat is harmless', 'The gaps: deletes'],
        short: 'Each one covers a hole in the others. The **cursor** on `updated_at` reads only what changed: day 2 wrote **60** rows and not 230. The **lookback** of one hour reads a little before the cursor, so a change that arrives late is still seen. The lookback means rows are read **twice**, so the **merge** on the id is what makes that harmless: with append the bug hunt left **209** rows for **200** orders. A repeat of a whole day wrote **0** rows. The hole that remains is **deletes**: a cursor never sees one, and the shop never deletes. For a source that deletes I would use a soft-delete flag or change capture.',
        fu: [['What if updated_at is not reliable?', 'A lookback helps, and a nightly comparison of counts and ids catches the rest.'], ['Why one hour?', 'It is a choice that balances late changes against reading more. I did not tune it.']],
        trap: 'Using a cursor with append.',
        real: 'Describe an incremental load that you made repeatable.'
      }),

      B.qa({
        id: 'qa-tests', t: 1, tag: 'Project', secs: 60,
        q: 'How do you test this pipeline?',
        pts: ['dbt tests on the data', 'A singular test for the money', 'A gate against the source', 'pytest for the rules'],
        short: 'Four layers. **dbt tests** check the shape: unique and not-null keys, accepted statuses, and relationships from orders to stores and from lines to priced products. A **singular test** checks the money: the total of an order equals the total of its lines. A **gate** outside dbt compares the warehouse with the **source**, which dbt cannot see. And **pytest** tests the rules of the shop and its contract with the price seed: **' + T.passed + '** tests. The tests earn their place by failing: the price test stopped day 3, the unique and singular tests failed with **134** and **335** rows when a join multiplied the orders, and the gate once failed a backfill for a bad reason, which I fixed.',
        fu: [['What would you add?', 'A test on freshness, and a contract on the columns of the marts.'], ['Do tests run in CI?', 'A workflow is sketched, and it did not run.']],
        trap: 'Saying "we have tests" without saying what they caught.',
        real: 'Describe a test that stopped a bad release.'
      }),

      B.qa({
        id: 'qa-backfill', t: 1, tag: 'Project', secs: 60,
        q: 'How do you backfill, and how do you know it is safe?',
        pts: ['Run the day again', 'The load is idempotent', 'The gate compares with the right day', 'Prove it'],
        short: 'I run the DAG again for the old date. It is **safe** because the load is **idempotent**: a merge on the id and a cursor, so a backfill of day 2 after day 3 wrote **0** rows and the table stayed at **' + n(C('after_backfill').raw_orders) + '** orders. dbt rebuilt the models and passed **' + BF.dbt.PASS + '** of **' + BF.dbt.TOTAL + '**. I know it is safe because the **gate** passed all **6** checks. My first gate failed this backfill, because it compared with the shop of the day of the run, and the warehouse was already at day 3: I changed it to compare with the **newest day** in the warehouse. A backfill that must **re-read** old data would need a window, which I did not build.',
        fu: [['What if the source fixed old data?', 'A window with an end value and a merge, as in the ingestion course.'], ['Can two backfills run at once?', 'No: `max_active_runs` is 1 for one DuckDB file.']],
        trap: 'Saying it works without a repeat to prove it.',
        real: 'Describe a backfill that went wrong.'
      }),

      B.qa({
        id: 'qa-failclosed', t: 2, tag: 'Project', secs: 60,
        q: 'A test fails at 3 a.m. What happens, and why do you not publish anyway?',
        pts: ['dbt skips the dependents', 'The gate and publish do not run', 'Stale beats wrong', 'Someone must be told'],
        short: 'The run **fails closed**. On day 3 the test that every line has a priced product failed: dbt **skipped ' + F3.dbt.SKIP + '** nodes (the order marts and their tests), the gate and the publish step showed **not run**, and the readers kept day 2 while the raw table held **' + n(AF.raw_orders) + '** orders and the marts **' + n(AF.fct_orders) + '**. I do not publish anyway because a **stale** mart is a known problem and a **wrong** mart is a decision that someone makes for the readers without telling them. The fix was one line in the seed and a rerun, and then the marts caught up. The gap is **telling people**: I built no alert, and I would add a failure callback and a freshness check first.',
        fu: [['What if the stale data hurts more?', 'Agree a rule in advance with the owner of the dashboard: publish with a marked warning for that one case.'], ['Why were dim_store and the snapshot still updated?', 'They do not depend on the failing test. That partial update is a trade-off of `dbt build`.']],
        trap: 'Disabling the test to make the run green.',
        real: 'Describe a failure that you let stop the line.'
      }),

      B.qa({
        id: 'qa-scale', t: 2, tag: 'Project', secs: 60,
        q: 'What changes at a hundred times the data and a real warehouse?',
        pts: ['The load and the lookback', 'Incremental models', 'Warehouse costs', 'Orchestration'],
        short: 'The design holds and the details change. The **load** stays incremental, with a merge: at that size the lookback window and the page size matter, and I would measure them, since I measured nothing here. The big model, `orders_daily`, is already **incremental** with a key. On a **cloud warehouse** the SQL is plain and ports, and the new questions are **cost** (what each run scans), **clustering**, roles and a service account for the load. The **gate** must compare counts and sums without scanning the whole table. And Airflow becomes a **deployed** service with workers, secrets and alerts. I did not run any of this: DuckDB on one file was the stand-in, and the DAG ran as a test command.',
        fu: [['Where would it break first?', 'The single DuckDB file writer: it allows one run at a time.'], ['Would you keep dlt?', 'Yes, for sources without a connector. For common sources I would consider a managed service.']],
        trap: 'Claiming a scale that you did not test.',
        real: 'Describe a pipeline that you moved to a bigger system.'
      }),

      B.qa({
        id: 'qa-monitor', t: 2, tag: 'Project', secs: 60,
        q: 'How would you monitor it, and who gets paged?',
        pts: ['A failed run', 'Freshness', 'Gate failures', 'The owner and the channel'],
        short: 'Three signals. A **failed run**: a failure callback sends the failing step and the failing lines to the team channel. **Freshness**: one query on the newest date in the marts, alerting when it is more than a day old, which would have caught the silence after day 3. And the **gate**, whose FAIL lines say exactly what disagrees: rows against ids, orders, revenue. The **owner of the pipeline** gets the message, and the dashboard shows the **age of its data**. I built none of this: the failed run is the only signal in the project, and the README says so. A gate that cries wolf is as bad as no gate, which my first version showed.',
        fu: [['Page or message?', 'A message in working hours for a stale mart, a page only when a deadline is at risk.'], ['What is a good SLA?', 'The one that the readers asked for, and measured.']],
        trap: 'Alerting on everything.',
        real: 'Describe an alert that you tuned.'
      }),

      B.qa({
        id: 'qa-change', t: 2, tag: 'Project', secs: 60,
        q: 'What would you change if you built it again?',
        pts: ['An alert first', 'Deletes', 'A window for backfills', 'CI that runs'],
        short: 'Four things, in this order. **First the alert**: a failure callback and a freshness check, because a pipeline that fails closed in silence is half finished. **Second, deletes**: the shop never deletes, and a real one will, and a cursor cannot see it, so I would add a soft-delete flag or change capture. **Third, a real backfill**: a window with an end value, so that old data can be **re-read** and not just re-run. **Fourth, CI that runs**: the workflow is only a sketch, and the tests should block a pull request. I would also **measure** the lookback and the cost on a real warehouse, because I measured neither. And I would write the gate\'s test on a backfill **before** the first backfill, not after.',
        fu: [['What would you keep?', 'The merge, the tests that fail closed, and the gate against the source.'], ['What did you learn from the first gate?', 'A check needs its own tests, on the awkward cases: a backfill and a repeat.']],
        trap: 'Saying that nothing needs to change.',
        real: 'Describe a decision that you would take differently.'
      }),

    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm4-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the real runs with dlt ' + M('dlt') + ', dbt ' + M('dbt') + ' and Airflow ' + M('airflow') + '. Take a screenshot or print the page.',
        sections: [
          { h: 'The design', items: ['**dlt**: cursor on `updated_at`, lookback of one hour, **merge** on the id. A repeat of a day wrote **0** rows', '**dbt**: staging views, marts, **14 tests**, a singular test for the money, an incremental mart with a key, a snapshot for the history of a store', '**Gate** against the shop, then **publish**. **Airflow**: load, build, gate, publish, one run at a time'] },
          { h: 'The runs', items: ['Day 1: **' + n(A1.raw_orders) + '** orders, **' + D1.dbt.PASS + '** of **' + D1.dbt.TOTAL + '** checks. Day 2: **60** rows written, **' + n(A2.raw_orders) + '** orders', 'Day 3 failed: **' + F3.dbt.PASS + '** pass, **' + F3.dbt.ERROR + '** error, **' + F3.dbt.SKIP + '** skipped. Raw **' + n(AF.raw_orders) + '**, marts **' + n(AF.fct_orders) + '**', 'After the fix: **9** rows written, marts **' + n(A3.fct_orders) + '**. Backfill of day 2: **0** rows, all **6** gate checks passed'] },
          { h: 'What the bug hunts showed', items: ['Append with a lookback: **209** rows for **200** orders', 'A join to the lines: **401** rows for **200** orders, **134** duplicated ids, **335** wrong totals', 'An incremental model with no key: **12** rows for **6** after a rerun', 'The first gate failed **' + FG.lines.filter(function (l) { return /^FAIL/.test(l); }).length + '** of **6** checks on a good backfill'] },
          { h: 'Not covered (say it first)', items: ['No alert channel, no secrets backend, no CI that ran, Airflow as a test command only', 'DuckDB for a warehouse. Deletes never happen in the pretend shop', 'Nothing was timed, and no cost was measured'] }
        ]
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Defender', color: '#334155',
        pts: [
          'You tell the project in **two minutes**: the problem, the design, the proof, the failure and the honest part.',
          'You say what each choice **guarantees**: the merge makes a repeat harmless, the tests fail closed, the gate compares with the source.',
          'You back each claim with a **number that you ran**: ' + n(A3.fct_orders) + ' orders, 22 checks, 0 rows on a repeat, 7 skipped nodes.',
          'You name the **gaps** before the reviewer does: alerts, deletes, a real backfill window, CI, a real warehouse.',
          'You treat **your own checks** as code that needs tests: the first gate failed a good backfill.'
        ],
        lines: [
          'I can defend every design choice with a run.',
          'I name the gaps before I am asked.',
          'I test my checks.'
        ]
      })
    ])
  });
})();
