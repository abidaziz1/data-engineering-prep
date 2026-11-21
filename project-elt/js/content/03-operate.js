/* Mission 3: operate it. The failure of day 3, its fix, a snapshot, and what the readers see in between. All runs went through Airflow for real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var RUNS = C('runs'), F3 = RUNS.day3_fail, X3 = RUNS.day3_fix, AF = C('after_failed_day3'), A3 = C('after_day3'), A2 = C('after_day2');
  var SNAP = G.table('snapshot.store4').rows, OD = G.table('orders_daily').rows, ODF = G.file('dbt/models/marts/orders_daily.sql');
  G.expect(F3.state === 'failed' && F3.tasks.extract_load === 'success' && F3.tasks.dbt_build === 'failed' && F3.tasks.quality_gate === 'not run' && F3.tasks.publish === 'not run' && F3.dbt.PASS === 14 && F3.dbt.ERROR === 1 && F3.dbt.SKIP === 7 && F3.dbt_fail.join() === 'relationships_stg_order_lines_sku__sku__ref_product_prices_', 'day 3 fails at dbt_build: 14 pass, 1 error, 7 skipped, and the gate and the publish step do not run');
  G.expect(F3.dbt_skip.length === 7 && F3.dbt_skip.indexOf('main.fct_orders') >= 0 && F3.dbt_skip.indexOf('main.orders_daily') >= 0 && F3.dbt_skip.indexOf('main.dim_store') < 0, 'dbt skipped fct_orders, its tests and orders_daily, and not dim_store');
  G.expect(AF.raw_orders === 255 && AF.fct_orders === 230 && AF.orders_daily === 6 && AF.unpriced_lines === 1 && AF.unpriced_sku === 'CAPSULE-10', 'after the failed day 3 the raw table has 255 orders and the marts 230, and one line has an unpriced SKU');
  G.expect(X3.state === 'success' && /orders 9, order lines 18/.test(X3.load) && A3.fct_orders === 255 && A3.orders_daily === 9 && SNAP.length === 2 && SNAP[1][2] === true && SNAP[1][1] === 'Store 4 (Riverside)' && SNAP[0][2] === false, 'the rerun of day 3 succeeds, the marts hold 255 orders, and store 4 has two versions');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Operate it: a failure, a fix and a backfill', short: 'Operate', blurb: 'The failed day 3, what the readers saw, the fix, and the history of a renamed store', minutes: 22,
    focus: ['mart'],
    goals: [
      'Read a **failed run**: which step stopped, and what it left behind.',
      'Say what the readers see while the pipeline is **failed**.',
      'Fix a failure at its **cause**, and prove it with a rerun.',
      'Say what a **snapshot** keeps that a plain table does not.'
    ],
    say: 'Day 3 holds two traps, and the pipeline met both for real. One stopped the run on purpose, and the other changed a name. Watch what failed, what stayed safe, and how a one-line fix and a rerun brought it back.',
    scenes: [
      B.flow({
        id: 'm3-flow', t: 1, src: 'rec', title: 'A failing test fails closed', g: 'failclosed', legend: true,
        steps: [
          { say: 'Day 3 has an order with a product that nobody priced. Press Next.', focus: ['raw', 'test', 'marts', 'pub', 'fix'], cap: 'A product with no price.' },
          { say: 'Step 1. The load worked. The raw table holds **' + n(AF.raw_orders) + '** orders, the new ones included.', on: ['e1'], focus: ['raw', 'test'], cap: 'The raw table has day 3.' },
          { say: 'Step 2. The **dbt test** "every line has a priced product" fails: **' + AF.unpriced_lines + '** line, the SKU `' + AF.unpriced_sku + '`.', on: ['e2'], focus: ['test', 'marts'], tags: ['tg_fail'], cap: 'The test fails.' },
          { say: 'Step 3. dbt **skips the ' + F3.dbt.SKIP + ' things that depend on the test**. The marts keep **' + n(AF.fct_orders) + '** orders, and the published files still show day 2. Better stale than wrong.', on: ['e3'], focus: ['marts', 'pub'], tags: ['tg_stale'], cap: 'The readers keep day 2.' },
          { say: 'Step 4. The fix is at the cause: **one line in the seed**, the price of the new product. Then the same run again.', on: ['e4'], focus: ['test', 'fix'], cap: 'Fix the cause.' }
        ]
      }),

      B.term({
        id: 'm3-fail', t: 1, src: 'rec', title: 'The failed run of day 3',
        say: 'The real run of 3 March, as Airflow reported it. Read which step failed and which did not run.',
        lines: function () { return G.plain(X('run.day3_fail')); },
        after: 'The load **succeeded** (**35** rows). dbt **failed**: **' + F3.dbt.PASS + '** passed, **' + F3.dbt.ERROR + '** error and **' + F3.dbt.SKIP + '** skipped, and the failing test was `' + F3.dbt_fail[0] + '`. The gate and the publish step show **not run**, and the DAG run is **failed**. The raw table holds **' + n(AF.raw_orders) + '** orders and the marts **' + n(AF.fct_orders) + '**.',
        afterKind: 'warn',
        doneSay: 'It stopped before it published.'
      }),

      B.cmp({
        id: 'm3-stale', t: 1, src: 'rec', title: 'What each layer held after the failed run',
        say: 'The failure left the layers in different states. Press Next to compare them.',
        cols: ['Layer', 'What it held', 'Meaning'],
        hl: 1,
        rows: [
          ['`raw.orders`', n(AF.raw_orders) + ' orders', 'Day 3 is loaded: the load does not wait for the tests'],
          ['`fct_orders`', n(AF.fct_orders) + ' orders', 'Skipped: still day 2'],
          ['`orders_daily`', A2.orders_daily + ' rows', 'Skipped: two days of three regions'],
          ['The Parquet files', 'Day 2', 'The publish step did not run']
        ],
        steps: [
          { upto: 2, say: 'The **raw** layer is ahead, and the **marts** are behind. That is on purpose: the raw table is a copy, and the marts are a promise.' },
          { upto: 4, say: 'The readers of the Parquet files saw **no change at all**. A report on day 2 is old, and it is not wrong.' }
        ]
      }),

      B.term({
        id: 'm3-fix', t: 1, src: 'rec', title: 'The same day again, after the fix',
        say: 'One line was added to the seed: the price of `CAPSULE-10`. Then the same DAG ran again for 3 March.',
        lines: function () { return G.plain(X('run.day3_fix')); },
        after: 'The run **succeeded**. The load wrote **9** rows, not 35: the cursor remembered day 3, and only the lookback hour came again. dbt passed **' + X3.dbt.PASS + '** of **' + X3.dbt.TOTAL + '**, the gate passed **6** checks, and the marts now hold **' + n(A3.fct_orders) + '** orders, the same as the shop. The load did not need a fix, because it was never wrong.',
        afterKind: 'tip',
        doneSay: 'The rerun proves the fix.'
      }),

      B.cmp({
        id: 'm3-snap', t: 1, src: 'rec', title: 'The snapshot kept both names of store 4',
        say: 'On day 3 store 4 was renamed. The snapshot is a table that remembers. Press Next to read its rows.',
        cols: ['Store', 'Name', 'Current'],
        hl: 1,
        rows: SNAP.map(function (r) { return [String(r[0]), r[1], r[2] ? 'yes' : 'no']; }),
        steps: [
          { upto: 1, say: 'The old name is still there, marked **not current**. An order from store 4 on 1 March can still show the name that it had on that day.' },
          { upto: 2, say: 'The new name is the **current** row. A table that is overwritten every run (the stores are `replace`d) would have lost the old one. The snapshot is the history.' }
        ]
      }),

      B.cmp({
        id: 'm3-daily', t: 1, src: 'rec', title: 'orders_daily after day 3',
        say: 'The incremental mart, as the last run left it: one row for each day and region, without the refunded orders.',
        cols: ['Date', 'Region', 'Orders', 'Revenue (cents)'],
        hl: 3,
        rows: OD.map(function (r) { return [r[0], r[1], String(r[2]), n(r[3])]; }),
        steps: [
          { upto: 3, say: 'The first day: **58** orders in each region, **' + n(OD[0][3] + OD[1][3] + OD[2][3]) + '** cents in all.' },
          { upto: 6, say: 'The second day has fewer orders, because only 30 were new, and the refunded one is left out.' },
          { upto: 9, say: 'The third day has **' + OD[6][2] + '** orders in each region. Nine rows in all: three days, three regions.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 2, q: 'After a rerun of the dbt build, the daily mart has twice the rows, and the same day and region appear twice. Click the line that adds rows without a key.',
        file: 'orders_daily.sql', lang: 'sql',
        code: ODF.replace("{{ config(materialized='incremental', unique_key=['updated_date', 'region'], incremental_strategy='delete+insert') }}", "{{ config(materialized='incremental') }}") + '\n',
        bad: [2],
        hint: 'How does dbt know which rows to replace in an incremental model?',
        why: 'An incremental model with **no `unique_key`** only **appends** the rows that it selects. The model re-reads the last two days on every run, so a second build gave **12** rows with **6** day and region pairs appearing twice. With a `unique_key` and the `delete+insert` strategy dbt deletes the pairs that it is about to write, and a rerun leaves **6** rows.',
        fix: ODF + '\n',
        cheer: 'An incremental model needs a key.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'The raw table holds 255 orders and the marts hold 230, after the failed run. Is something wrong?',
        opts: [
          { t: 'No: the marts were skipped on purpose, so the readers still see day 2', fb: '' },
          { t: 'Yes: the load lost 25 orders', fb: 'The raw table has all 255.' },
          { t: 'Yes: dbt deleted 25 orders', fb: 'dbt skipped the models, it deleted nothing.' },
          { t: 'It cannot be known', fb: 'The recording shows what each layer held.' }
        ],
        ok: 0, why: 'The recording: **' + n(AF.raw_orders) + '** in `raw.orders`, **' + n(AF.fct_orders) + '** in `fct_orders`, and **' + AF.orders_daily + '** rows in `orders_daily`. The marts are a promise, so they wait for the tests.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'What is the right fix for the failed test on day 3?',
        opts: [
          { t: 'Add the missing price to the seed, and run the same day again', fb: '' },
          { t: 'Delete the test', fb: 'The test found a real problem.' },
          { t: 'Set the test to warn and keep going', fb: 'The totals of that order would be wrong in the marts.' },
          { t: 'Delete the order with the new product', fb: 'It is a real order.' }
        ],
        ok: 0, why: 'The test said that one line had a SKU with no price: `' + AF.unpriced_sku + '`. After one line in the seed the rerun passed **' + X3.dbt.PASS + '** of **' + X3.dbt.TOTAL + '** and the marts caught up.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'Why did the rerun of day 3 write only 9 rows?',
        opts: [
          { t: 'The cursor remembered day 3, and only the lookback hour was read again', fb: '' },
          { t: 'The shop had only 9 orders', fb: 'It had 255 orders.' },
          { t: 'dbt wrote the rest', fb: 'dbt does not load.' },
          { t: 'The load failed', fb: 'The run succeeded.' }
        ],
        ok: 0, why: 'The first load of day 3 wrote **35** rows. The second wrote **9**, the orders of the lookback hour, and the merge changed none of them. A failed run does not need a special reload.'
      }),

      B.quiz({
        id: 'm3-q4', t: 3, src: 'rec',
        q: 'dbt skipped 7 of 22 things on day 3. Why not all 22?',
        opts: [
          { t: 'Only the nodes downstream of the failed test were skipped: `fct_orders`, its four tests, `orders_daily` and its test', fb: '' },
          { t: 'dbt picks seven nodes at random', fb: 'The skipped nodes are the dependents of the failure.' },
          { t: 'Seven tests are optional', fb: 'None of the tests is marked optional.' },
          { t: 'dbt skips a third of the nodes', fb: 'It follows the dependency graph.' }
        ],
        ok: 0, why: 'The recorded skipped nodes: **' + F3.dbt_skip.join('**, **') + '**. The seed, the staging views, `dim_store` and the snapshot do not depend on the failing test, so they ran: store 4 got its new name while the order marts waited. That partial update is a trade-off of `dbt build`.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision (ADR 3): fail closed, or publish with a warning?',
        scenario: 'A new product has no price, and one order is affected out of 255. The marketing team wants the daily numbers on time. Finance wants them right.',
        opts: [
          { t: 'Fail closed: stop the run, keep yesterday\'s marts, and page the owner', d: 'Nothing wrong is ever published. The cause is fixed at the source, with a rerun to prove it.', lose: 'The readers see a stale day until someone acts, and they must be told.' },
          { t: 'Publish with a warning', d: 'The numbers are on time.', lose: 'The total of one order is wrong, and a warning in a log is read by nobody. The wrong number reaches a report.' },
          { t: 'Drop the unpriced line and publish', d: 'The pipeline continues with clean data.', lose: 'The revenue is silently short, and the next unpriced product is dropped the same way.' }
        ],
        pick: 0,
        why: 'The recorded run is the proof that it works: the readers saw **day 2** until the fix, and then the marts caught up with **' + n(A3.fct_orders) + '** orders that equal the shop. This is a design judgement, and the other two options were not built.',
        when: 'For a dashboard that is useful even when it is a little off, a warning can be right, if the owner of the dashboard has agreed and the number is marked.'
      }),

      B.incident({
        id: 'm3-inc', t: 1, src: 'rec', title: 'Incident: the daily run is red, and the marts are a day old', time: '06:40',
        alert: '**The brewline_daily run for 3 March failed at dbt_build, and the published marts still show 2 March.** The log says that one test failed: every line must have a priced product. The load succeeded.',
        clues: ['The failing step is dbt, not the load', 'The test names a SKU with no price', 'The raw table is ahead of the marts'],
        opts: [
          { t: 'Add the missing price to the seed, run the day again, and check that the gate and the publish step pass', fb: '' },
          { t: 'Disable the test so that the run turns green', fb: 'A green run with wrong totals is the worst result.' },
          { t: 'Reload the whole warehouse', fb: 'The load was right.' },
          { t: 'Wait for the next day', fb: 'The next run fails the same way, and the delay grows.' }
        ],
        best: 0,
        why: 'The recording shows both halves of the answer. The failed run skipped **' + F3.dbt.SKIP + '** nodes and left the marts at **' + n(AF.fct_orders) + '** orders. After one line in the seed the rerun succeeded, the gate passed, and the marts held **' + n(A3.fct_orders) + '**.',
        checks: [
          ['Find the failing step', 'dbt_build, not extract_load.'],
          ['Read the failing test', 'One line has the SKU CAPSULE-10 with no price.'],
          ['Check what the readers see', 'The marts and the files show day 2.'],
          ['Fix and prove', 'Add the price, rerun the day, and read the gate.']
        ],
        tell: 'A new product was launched without a price, so the test that every line has a priced product failed, and dbt stopped the models that depend on it. The readers kept seeing the previous day, which was the point. I added the price to the seed, ran the same day again, and the run passed all checks and the gate, and published the marts.',
        prevent: ['Ask the owner of the shop to **tell the data team** before a product launches', 'Keep the **price list** where the data team can see its history', 'Alert when a mart is **older than a day**']
      }),

      B.incident({
        id: 'm3-inc2', t: 2, src: 'docs', title: 'Incident: nobody noticed that the marts were stale for two days', time: '11:00',
        alert: '**A finance analyst asks why the revenue dashboard shows 2 March, three days later.** The DAG run of 3 March failed and nobody looked at it. Airflow has no alert, and the failed run is only in its history.',
        clues: ['The failure was real and correct', 'Nobody was told', 'The dashboard does not say how old its data is'],
        opts: [
          { t: 'Add a failure callback to the team channel, and a freshness check that alerts when the marts are older than a day', fb: '' },
          { t: 'Make the pipeline publish even when a test fails', fb: 'It removes the safety to avoid the silence.' },
          { t: 'Ask the analysts to look at Airflow every morning', fb: 'A process that depends on people looking is a process that fails.' },
          { t: 'Retry the failed task ten times', fb: 'A deterministic failure fails ten times.' }
        ],
        best: 0,
        why: 'Failing closed only works if **someone is told**. The project has no channel: the failed run is the only signal, and that is a gap that I name in the README. This is from documentation: no alert was built, and a freshness check is one query on `max(updated_date)`.',
        checks: [
          ['Find when the data stopped', 'The run of 3 March failed.'],
          ['Find who knew', 'Nobody: no alert.'],
          ['Check the dashboard', 'It does not show the age of its data.'],
          ['Fix and prevent', 'A callback, a freshness alert, and the age on the dashboard.']
        ],
        tell: 'The pipeline failed closed as designed, but nothing told anyone, so the dashboard was stale for two days. I added a failure callback to the team channel and a freshness check on the marts, and I put the date of the data on the dashboard.',
        prevent: ['A **failure callback** on the DAG', 'A **freshness check** that alerts on old data', 'Show the **age of the data** on every dashboard']
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Operator', color: '#64748B',
        pts: [
          'A failing test **fails closed**: dbt skipped **' + F3.dbt.SKIP + '** nodes, the gate and the publish step did not run, and the readers kept **day 2**.',
          'The raw table held **' + n(AF.raw_orders) + '** orders and the marts **' + n(AF.fct_orders) + '**: the raw layer is a copy, and the marts are a promise.',
          'The fix was **one line in the seed**, and a rerun proved it: the load wrote **9** rows and the marts caught up to **' + n(A3.fct_orders) + '**.',
          'A **snapshot** kept both names of store 4. An incremental model needs a **`unique_key`**: without it a rerun gave **12** rows for **6**.',
          'Failing closed needs **an alert**, or the silence lasts for days.'
        ],
        lines: [
          'I fix the cause, and I prove it with a rerun.',
          'I let the readers see yesterday, not a wrong today.',
          'I make sure someone is told.'
        ]
      })
    ]
  });
})();
