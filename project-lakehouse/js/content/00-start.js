/* Mission 0: pick a path, see the whole lakehouse, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), D1 = RUNS.day1, D2 = RUNS.day2, D3 = RUNS.day3, A3 = C('after_day3'), T = C('tests');
  G.expect(D1.bronze_rows === 305 && D1.valid === 301 && D1.quarantined === 4 && D1.inserted === 300 && T.passed === 7, 'day 1 has 305 lines, 301 valid, 4 quarantined, 300 inserted, and 7 tests pass');
  G.expect(D3.warning === 'coupon' && A3.silver === 496 && A3.quarantine === 10, 'day 3 warns about coupon, silver holds 496 orders and the quarantine 10 rows');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole lakehouse', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'The lakehouse in one picture', g: 'medallion', legend: true,
        steps: [
          { say: 'Brewline sells coffee. Its shop system drops a file of order events every day, and the data team must turn those files into tables that nobody has to doubt. This picture is the whole project. Press Next.', focus: ['files', 'brz', 'slv', 'gld', 'gate', 'qua'], cap: 'Files become tables.' },
          { say: 'Step 1. Every line of every new file is copied to **bronze** as raw text, with its file and line number. A **ledger** remembers which files were read, so a file is never read twice.', on: ['e1'], focus: ['files', 'brz'], tags: ['tg_ledger'], cap: 'Bronze keeps everything.' },
          { say: 'Step 2. **Silver** parses the text and checks the rules. Each order is **merged** into the table, and only when the event is **newer** than the row that is there.', on: ['e2'], focus: ['brz', 'slv'], tags: ['tg_merge'], cap: 'Parse, validate, merge.' },
          { say: 'Step 3. **Gold** holds the revenue and the orders of each store and day. It is rebuilt for the days that a run touched, and each day is **replaced as a whole**.', on: ['e3'], focus: ['slv', 'gld'], tags: ['tg_days'], cap: 'Gold is replaced by day.' },
          { say: 'Step 4. A row that breaks a rule goes to the **quarantine**, with the reason. It is never dropped.', on: ['e4'], focus: ['slv', 'qua'], cap: 'Bad rows are kept, with a reason.' },
          { say: 'Step 5. A **gate** compares the layers with each other after every run, and fails the run when they disagree. Everything ran for real on Spark **' + M('pyspark') + '** with Delta Lake **' + M('delta') + '**.', on: ['e5'], focus: ['gld', 'gate'], cap: 'The layers must agree.' }
        ]
      }),

      B.talk({
        id: 'm0-layers', t: 1, src: 'rec', title: 'What each layer promises',
        say: 'A layer is a promise to whoever reads it. Press Next to read the four.',
        items: [
          ['Bronze', 'Every line that ever arrived, **as text**, with the file and the line. Nothing is parsed, so nothing can fail here and nothing can be lost. After three days it held **' + n(A3.bronze) + '** rows.', 'Bronze never loses a line.'],
          ['Silver', '**One row for each order**, valid, with the latest event. After three days: **' + n(A3.silver) + '** orders, and the gate checks that the count of rows equals the count of distinct ids.', 'One row for each order.'],
          ['Quarantine', 'The rows that broke a rule, with the **reason**. **' + A3.quarantine + '** rows after three days, in five reasons. Someone can read them and fix the source.', 'Rejected, and explained.'],
          ['Gold', 'Revenue and orders for each store and day, **without the refunded orders**. A report reads gold and does not parse anything.', 'Ready to read.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm0-jd', t: 1, src: 'docs', title: 'What senior postings ask for, and where it is in this project',
        say: 'I read two analyses of data engineer postings and a sample of senior ones. Press Next to see where each skill is in the project.',
        cols: ['What postings ask for', 'Where it is in the project', 'Status'],
        hl: 1,
        rows: [
          ['Python and SQL, the baseline', 'All of the pipeline is Python, with Spark expressions that read like SQL', 'Run'],
          ['Spark for batch pipelines', 'PySpark ' + M('pyspark') + ': parsing, windows, a merge, a replace of days', 'Run'],
          ['Delta Lake, or another table format', 'Delta ' + M('delta') + ': MERGE, `replaceWhere`, the history and time travel. Iceberg and Hudi are not covered', 'Run'],
          ['Medallion layers, bronze to gold', 'Three layers and a quarantine', 'Run'],
          ['Idempotent loads, late and duplicate data', 'A ledger of files, a merge that applies only newer events, whole days replaced', 'Run'],
          ['Data quality and tests', 'A quarantine with reasons, a gate after every run, ' + T.passed + ' pytest tests', 'Run'],
          ['Cloud storage and Databricks', 'A local folder stands in. The code does not change when the path is a bucket', 'Stand-in'],
          ['CI/CD, Docker, access control, streaming', 'A CI and a Dockerfile sketch that did not run. The rest is not built', 'Not run']
        ],
        steps: [
          { upto: 6, say: 'The first six rows are the core of a lakehouse posting, and the project runs all of them. In the analysis of about 120,000 posts that I used for the first project, Python and SQL appeared in about two thirds, and Spark in about one in five.' },
          { upto: 8, say: 'The last two rows are what a team adds around the core. The figures come from search summaries, so they are directional, and I did not check them against the sources.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this walkthrough works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something run (**SEE**), makes you explore or fix it (**TRY**), then asks the question that a reviewer would ask (**SAY**). Orange blocks in a diagram are data moving.', 'Watch first, practise second, say it third.'],
          ['A project, not a course', 'The other tutorials of this library teach a tool. This one **defends a pipeline**: every file is shown, every claim has a run behind it, and the last mission is the interview talk track.', 'One pipeline, defended.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it and wrote down what it printed. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['The repository', 'The project is a folder of this library, `projects/brewline-lakehouse`, with a `README`, a `Makefile`, a requirements file and ' + T.passed + ' tests. The screens show its files as they are on disk.', 'You can clone it and run it.'],
          ['What went wrong on purpose', 'Day 2 delivers a file **twice**, day 3 brings an old event, a **new field** and two **text amounts**, and day 1 has four dirty lines. Three bug hunts break the code and show what the gate says.', 'The traps are the lesson.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The pipeline', 'Spark ' + M('pyspark') + ' with Delta Lake ' + M('delta') + ' on Java ' + M('java') + ' and Python ' + M('python') + ', on one machine, for three days of a pretend source', 'Run'],
          ['The tests', T.passed + ' pytest tests: the source, the rules, and the three days end to end', 'Run'],
          ['A cluster, cloud storage', 'A bucket, a Databricks workspace, a catalog and permissions', 'Not run'],
          ['Streaming, `OPTIMIZE`, `VACUUM`', 'Small files and retention were never a problem at this size', 'Not run'],
          ['A Docker build, a CI run', 'Both are sketches in the repository', 'Not run']
        ],
        steps: [
          { upto: 2, say: 'The first two rows ran: three days through the real pipeline, the tests, and a rerun of the last day. Nothing was timed, because one machine says nothing about a cluster.' },
          { upto: 5, say: 'The last three rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
