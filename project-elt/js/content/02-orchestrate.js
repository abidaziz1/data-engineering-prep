/* Mission 2: orchestrate and gate. The DAG and the quality gate are the files of projects/brewline-elt, and the runs went through Airflow for real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D2 = RUNS.day2, BF = RUNS.backfill2, FG = C('first_gate'), A2 = C('after_day2'), AB = C('after_backfill');
  var DAG = G.file('orchestration/dags/brewline_daily.py'), GATE = G.file('quality/source_vs_warehouse.py');
  G.expect(FG.exit === 1 && FG.lines.filter(function (l) { return /^FAIL/.test(l); }).length === 4 && FG.lines.filter(function (l) { return /^PASS/.test(l); }).length === 2, 'the first version of the gate fails 4 of its 6 checks on a backfill of day 2, and the shipped one passes all');
  G.expect(BF.state === 'success' && /orders 0, order lines 0/.test(BF.load) && BF.gate.length === 6 && BF.gate.every(function (l) { return /^PASS/.test(l); }) && AB.raw_orders === 255 && AB.distinct === 255, 'the backfill of day 2 writes 0 rows and passes the six checks');
  var HEADER = G.lines(GATE, G.at(GATE, /^def run\(day, warehouse\)/), G.at(GATE, /shop = shop_api\.orders_on\(day\)/));
  var HEADER_BAD = HEADER.replace(/\n    day = max\(day, latest_day\(con\)\)/, '');
  G.expect(HEADER_BAD !== HEADER, 'the shipped gate has the line that the first version lacked');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Orchestrate it and gate it', short: 'Orchestrate', blurb: 'The Airflow DAG, the quality gate, and five real runs', minutes: 20,
    focus: ['ing'],
    goals: [
      'Read the **DAG**: four tasks in order, one run at a time, with retries.',
      'Explain why a **quality gate** compares the warehouse with the **source**.',
      'Read the **runs** of the pipeline and say what each step did.',
      'Say why the first version of the gate **failed a good backfill**.'
    ],
    say: 'The load and the models are not a pipeline until something runs them in order, stops when a step fails, and checks the result against the source. That is the DAG and the gate. I ran the DAG five times, and one of the runs found a flaw in my gate.',
    scenes: [
      B.code({
        id: 'm2-dag', t: 1, src: 'rec', title: 'brewline_daily.py: the DAG', file: 'brewline_daily.py', lang: 'python', code: DAG,
        steps: [
          { say: 'One file, one DAG. Press Next.', lines: null },
          { say: 'Where the tools live is read from **environment variables**, so that the same DAG runs on a laptop and in a container. A run handles **one day** of the pretend shop, computed from its logical date.', lines: G.span(DAG, /^HOME = /, /^def day_of/) },
          { say: 'The settings of the DAG: a **daily** schedule, `catchup=False`, **one run at a time** (the warehouse is one DuckDB file, so two runs would write to it together), and **retries** with a pause.', lines: G.span(DAG, /^@dag\(/, /^\)$/) },
          { say: 'Task 1 loads the day with dlt. Task 2 runs **`dbt build`**: models and tests together, in the order of their dependencies.', lines: G.span(DAG, /def extract_load/, /return '%s build' % DBT/) },
          { say: 'Task 3 is the **quality gate**. Task 4 **publishes** the marts as Parquet, and it only runs when everything before it succeeded.', lines: G.span(DAG, /def quality_gate/, /--out %s' % \(PYTHON, WAREHOUSE/) },
          { say: 'The last line is the whole pipeline: **load, build, gate, publish**. A failure of one task stops the tasks after it.', lines: G.span(DAG, /extract_load\(\) >> dbt_build\(\)/) }
        ]
      }),

      B.term({
        id: 'm2-day2', t: 1, src: 'rec', title: 'Day 2 through Airflow',
        say: 'The second real run. Read the load line, and compare it with day 1.',
        lines: function () { return G.plain(X('run.day2')); },
        after: 'The load wrote **60** rows: 20 shipped orders, the refund, 30 new orders, and the orders of the **lookback** hour before the cursor. The table now holds **' + n(A2.raw_orders) + '** orders. dbt again passed **' + D2.dbt.PASS + '** of **' + D2.dbt.TOTAL + '**, and the gate passed all **6** of its checks. `orders_daily` has **' + A2.orders_daily + '** rows: two days, three regions.',
        afterKind: 'tip',
        doneSay: 'A cursor wrote 60 rows, not 230.'
      }),

      B.widget({ id: 'm2-lab', kind: 'runlab', t: 1, src: 'rec', title: 'Lab: five runs of the same DAG' }),

      B.code({
        id: 'm2-gate', t: 1, src: 'rec', title: 'source_vs_warehouse.py: the gate', file: 'source_vs_warehouse.py', lang: 'python', code: GATE,
        steps: [
          { say: 'The gate is a short program that compares two things that dbt cannot compare: the warehouse and the **source**. Press Next.', lines: null },
          { say: 'It first finds the **newest day that the warehouse holds**. A run for an old day (a backfill) must compare with the shop as of that day, because the warehouse is already there.', lines: G.span(GATE, /^def latest_day/, /return \(newest/) },
          { say: 'Then it compares: **rows against distinct ids**, the **orders** and the **revenue** of the shop with the raw table, and the marts with the raw table.', lines: G.span(GATE, /raw_rows, raw_distinct = /, /orders_daily: revenue equals/) },
          { say: 'Each check prints `PASS` or `FAIL`, and the program **exits with 1** if any failed. That exit code is what makes Airflow stop before the publish step.', lines: G.span(GATE, /for name, ok, got, want in checks/, /return all\(/) }
        ]
      }),

      B.cmp({
        id: 'm2-airflow', t: 2, src: 'docs', title: 'What the test command is, and what a deployed Airflow adds',
        say: 'The runs of this walkthrough used a test command. Press Next to read what a real deployment adds.',
        cols: ['', 'What I ran', 'What a deployed Airflow adds'],
        hl: 2,
        rows: [
          ['Running tasks', 'The tasks of one DAG run, in order, in one process', 'A scheduler that decides what to run, and workers that run it in parallel'],
          ['Schedules and backfills', 'One logical date at a time, by hand', 'A calendar of runs, `catchup`, and backfills over a range of dates'],
          ['Secrets and connections', 'Paths in environment variables', 'A secrets backend and connections that are not in the code'],
          ['Alerts and SLAs', 'The exit code of the command', 'Callbacks, an email or a chat message, and a late-run alert'],
          ['The interface', 'A log in the terminal', 'A web interface with the history of every run and task']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about **doing the work**. The DAG file is the same in both, and that is why the test is a fair test of the logic.' },
          { upto: 5, say: 'The last two are about **watching it**. A pipeline that nobody sees fail is not finished. This screen is from documentation: no scheduler or web interface ran here.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A backfill of day 2 runs after day 3 was loaded. The load changed nothing, and the gate fails four checks. The warehouse is right. Click the line that compares with the wrong shop.',
        file: 'source_vs_warehouse.py', lang: 'python',
        code: HEADER_BAD,
        bad: [3],
        hint: 'Which day does the warehouse hold when the backfill runs?',
        why: 'The gate compared the warehouse with the shop **as of the day of the run**, day 2, but the warehouse was already at **day 3**: **255** orders against **230**. Four checks failed, and the data was right: **' + FG.lines.filter(function (l) { return /^FAIL/.test(l); }).length + '** failures for no reason. A gate that cries wolf gets ignored. Compare with the shop as of the **newest day** in the warehouse.',
        fix: HEADER,
        cheer: 'A gate must be right to be trusted.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'The gate exits with 1 when a check fails. What does Airflow do with the next task, the publish?',
        opts: [
          { t: 'It does not run it, because a task that follows a failed task is not started', fb: '' },
          { t: 'It runs it anyway', fb: 'A failed task stops what depends on it.' },
          { t: 'It runs it twice', fb: 'Retries are separate, and they run the failed task.' },
          { t: 'It deletes the Parquet files', fb: 'It does nothing to files.' }
        ],
        ok: 0, why: 'In the failed run of day 3, `quality_gate` and `publish` show **not run** in the lab: the failure of `dbt_build` stopped them. The same happens when the gate itself fails.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'Why does the DAG have `max_active_runs=1`?',
        opts: [
          { t: 'The warehouse is one DuckDB file, so two runs would write to it at the same time', fb: '' },
          { t: 'To make the DAG faster', fb: 'It limits the runs, so it does not speed them up.' },
          { t: 'Because Airflow cannot run two DAGs', fb: 'It can run many.' },
          { t: 'To save memory only', fb: 'The reason is a shared file.' }
        ],
        ok: 0, why: 'A DuckDB file accepts one writer at a time. In a cloud warehouse the limit would be different, and the setting would be too.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'The backfill of day 2 wrote 0 rows. What does that tell you?',
        opts: [
          { t: 'The cursor and the merge made the repeat harmless: nothing changed', fb: '' },
          { t: 'The load failed and nobody noticed', fb: 'The run succeeded and the gate passed.' },
          { t: 'Day 2 had no orders', fb: 'It had 230 orders.' },
          { t: 'The shop is empty', fb: 'The table held 255 orders.' }
        ],
        ok: 0, why: 'The recorded load line says **' + BF.load + '**, the table stayed at **' + n(AB.raw_orders) + '** orders (**' + n(AB.distinct) + '** distinct), and all **6** gate checks passed.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the four tasks of a daily run in the order that the DAG uses.',
        items: ['Load the day with dlt into the raw schema', 'Build the models and run the tests with dbt', 'Compare the warehouse with the shop in the quality gate', 'Publish the marts as Parquet'],
        why: 'The order is the order of the dependencies and of the risk: nothing is published before it is built, tested and compared with the source. The last line of the DAG is `extract_load() >> dbt_build() >> quality_gate() >> publish()`.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'rec', title: 'Decision (ADR 2): where do the quality checks live?',
        scenario: 'The models have 14 dbt tests. A reviewer asks whether the gate is needed, or whether dbt tests are enough. The shop is a system that dbt cannot query.',
        opts: [
          { t: 'dbt tests for the shape and the business rules, and a gate for the comparison with the source', d: 'dbt checks the data against itself, and the gate checks it against the shop. Each does what it can see.', lose: 'One more program to keep in step with the shop and with a backfill, as the first version showed.' },
          { t: 'dbt tests only', d: 'One tool and one place.', lose: 'A load that silently misses half of the orders passes every dbt test, because the rows that arrived are all valid.' },
          { t: 'The gate only', d: 'One program with every check.', lose: 'It rebuilds what dbt already does well: keys, values, relationships, with no lineage and no docs.' }
        ],
        pick: 0,
        why: 'Only a comparison with the **source** sees a missing order. The recorded gate checks rows against distinct ids, the orders, and the revenue. It cost one flaw, found by a backfill, and one line to fix.',
        when: 'If the source is a database that dbt can read, a dbt test can do the comparison, and the gate can disappear.'
      }),

      B.incident({
        id: 'm2-inc', t: 1, src: 'rec', title: 'Incident: the backfill failed the gate, and the data is right', time: '15:10',
        alert: '**A backfill of 2 March failed the quality gate with four FAIL lines, and the DAG run is red.** The load wrote 0 rows. dbt passed all 22 checks. Someone suggests that the data is corrupt and wants to reload the warehouse.',
        clues: ['The load wrote 0 rows and dbt passed', 'The failing checks say 255 against 230', 'The warehouse already holds day 3'],
        opts: [
          { t: 'Make the gate compare with the shop as of the newest day in the warehouse, and run the backfill again', fb: '' },
          { t: 'Reload the whole warehouse from day 1', fb: 'The data is right. A reload risks it.' },
          { t: 'Skip the gate for backfills', fb: 'A backfill is exactly when a check is needed.' },
          { t: 'Delete day 3 so that the numbers match', fb: 'It destroys correct data to satisfy a broken check.' }
        ],
        best: 0,
        why: 'The first version of the gate printed **' + FG.lines.filter(function (l) { return /^FAIL raw.orders: orders/.test(l); })[0].replace(/^FAIL /, '') + '**. The warehouse held day 3, and the gate looked for day 2. The shipped gate takes the **newest day** in the warehouse, and the backfill passed all **6** checks.',
        checks: [
          ['Read the failing lines', '255 against 230: the day of the shop is wrong.'],
          ['Read the load line', '0 rows written: nothing changed.'],
          ['Read the gate', 'It compares with the day of the run.'],
          ['Fix and prove', 'Compare with the newest day, and run the backfill again.']
        ],
        tell: 'The gate compared the warehouse with the shop as of the day of the run, and a backfill of day 2 ran when the warehouse was already at day 3, so four checks failed for a good reason that was wrong. I changed the gate to compare with the newest day in the warehouse, and the backfill passed all six checks.',
        prevent: ['**Test the gate** on a backfill, on a repeat and on a new day', 'A check that can **cry wolf** must be fixed fast: people stop reading it', 'Keep **what a check compares with** in its name']
      }),

      B.qa({
        id: 'qa-orch', t: 1, tag: 'Project', secs: 60,
        q: 'Why do you use Airflow here, and what does it give you that a script would not?',
        pts: ['Order and dependencies', 'Stop on failure', 'Retries and history', 'One run at a time'],
        short: 'Four small steps have to run in a fixed order, and **stop when one fails**: **load, build and test, gate, publish**. Airflow runs them in that order, once for each day, and a failed task stops the tasks after it: in my run `dbt_build` failed on day 3 and `quality_gate` and `publish` **did not run**. It also gives **retries** with a pause, a **history** of every run, and `max_active_runs=1` so that two runs never write the same DuckDB file. A cron job with a script could do the order, and would give me none of the history. I ran it with `airflow dags test`, in one process, and not with a scheduler.',
        fu: [['What would you change in a deployed Airflow?', 'Secrets in a backend, a failure callback to the team channel, and a freshness alert.'], ['Why not run dbt inside Airflow?', 'You can. I call it as a program, so that the DAG file does not depend on the versions of dbt.']],
        trap: 'Saying that Airflow transforms data.',
        real: 'Describe a DAG that you owned.'
      }),

      B.qa({
        id: 'qa-gate', t: 2, tag: 'Project', secs: 60,
        q: 'Why is there a quality gate outside dbt?',
        pts: ['dbt sees the warehouse only', 'The source is the truth', 'Rows, orders and revenue', 'Test the gate too'],
        short: 'dbt tests check the data **against itself**: keys, values, relationships, and the money adding up. They cannot see the **source**, so a load that missed half the orders passes every test, because the rows that arrived are valid. The **gate** compares the warehouse with the shop: **rows against distinct ids**, the **orders**, and the **revenue**, and then the marts with the raw table. It exits with 1, and Airflow stops before the publish. The gate had a flaw of its own: it compared with the shop as of the day of the run, so a **backfill** of day 2 failed four checks while the data was right. I fixed it to compare with the newest day in the warehouse, and I now test the gate on a backfill and a repeat.',
        fu: [['Can dbt do it?', 'If the source is a database that dbt can read, yes: a test can compare the two.'], ['What does a failing gate page?', 'The owner of the pipeline, with the failing lines in the message.']],
        trap: 'A gate that nobody tests.',
        real: 'Describe a check that you had to fix because it cried wolf.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Modeller', color: '#94A3B8',
        pts: [
          'The DAG is **load, build and test, gate, publish**, with retries, one run at a time, and tools set by environment variables.',
          'A failed task **stops** what follows it: the failed day 3 shows **not run** for the gate and the publish step.',
          'The **gate** compares the warehouse with the **shop**, which dbt cannot see: rows against distinct ids, orders, revenue.',
          'The first gate **failed a good backfill**: **' + FG.lines.filter(function (l) { return /^FAIL/.test(l); }).length + '** of **6** checks, because it compared with the wrong day. One line fixed it.',
          'A backfill wrote **0** rows and the table stayed at **' + n(AB.raw_orders) + '** orders: the pipeline is **safe to repeat**.'
        ],
        lines: [
          'I stop the pipeline before it publishes something wrong.',
          'I test my checks on a backfill.',
          'I check the warehouse against the source.'
        ]
      })
    ]
  });
})();
