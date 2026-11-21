/* Mission 0: pick a path, see the whole platform, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'The platform in one picture', g: 'platform', legend: true,
        steps: [
          { say: 'Brewline sells coffee. Its shop system has the orders, and the data team must put them in a warehouse every day, correct and repeatable. This picture is the whole project. Press Next.', focus: ['shop', 'dlt', 'raw', 'dbt', 'gate', 'pub', 'air'], cap: 'The shop reaches the readers.' },
          { say: 'Step 1. **dlt** reads the shop API, only what changed since the last run. It **merges** the orders on their id, with a lookback of one hour for late changes.', on: ['e1'], focus: ['shop', 'dlt'], tags: ['tg_merge'], cap: 'An incremental load.' },
          { say: 'Step 2. The rows land in the **raw** schema of DuckDB: orders, their lines in a child table, and the stores.', on: ['e2'], focus: ['dlt', 'raw'], cap: 'Raw tables.' },
          { say: 'Step 3. **dbt** builds staging views and marts from the raw tables and runs **14 tests**. A test that fails stops everything that depends on it.', on: ['e3'], focus: ['raw', 'dbt'], tags: ['tg_tests'], cap: 'Models and tests.' },
          { say: 'Step 4. A **quality gate** compares the warehouse with the shop itself, which dbt cannot see: the rows, the orders and the revenue.', on: ['e4'], focus: ['dbt', 'gate'], cap: 'A check against the source.' },
          { say: 'Step 5. Only when the gate passes are the marts **published** as Parquet. **Airflow** runs the four steps in order, once for each day. Every step ran for real on **' + M('dbt') + '** of dbt and **' + M('airflow') + '** of Airflow.', on: ['e5'], focus: ['gate', 'pub', 'air'], cap: 'Publish last.' }
        ]
      }),

      B.cmp({
        id: 'm0-jd', t: 1, src: 'docs', title: 'What senior postings ask for, and where it is in this project',
        say: 'I read two analyses of data engineer postings and a sample of senior ones. Press Next to see where each skill is in the project.',
        cols: ['What postings ask for', 'Where it is in the project', 'Status'],
        hl: 1,
        rows: [
          ['Python and SQL, the baseline', 'The loader and the gate are Python. The models and the tests are SQL', 'Run'],
          ['Airflow with dbt, often named together', 'One DAG that calls dlt, dbt, the gate and the publish step', 'Run'],
          ['Ingestion of an API, incremental and repeatable', 'A dlt resource with a cursor, a lookback and a merge', 'Run'],
          ['Data quality and testing', '14 dbt tests, a test written for this project, a gate against the source, pytest', 'Run'],
          ['A cloud warehouse (Snowflake is named most)', 'DuckDB stands in. The SQL is plain', 'Stand-in'],
          ['CI/CD with Git and automated tests', 'A sketch of a pull request workflow, which did not run', 'Not run'],
          ['Monitoring, alerting, ownership', 'The gate and the failed run are the signal. A paging channel is not built', 'Not covered']
        ],
        steps: [
          { upto: 4, say: 'The first four rows are the core of most senior postings, and the project runs them all. Python and SQL appear in about two thirds of the postings of one analysis of 120,000 posts.' },
          { upto: 7, say: 'The last three rows are what a real team adds around the core. The same analysis put Snowflake in about one posting of five, Spark in about one of five, and Airflow and Kafka in about one of eight each. Those figures come from search summaries: they are directional, and I did not check them against the sources.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this walkthrough works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something run (**SEE**), makes you explore or fix it (**TRY**), then asks the question that a reviewer would ask (**SAY**). Orange blocks in a diagram are data moving.', 'Watch first, practise second, say it third.'],
          ['A project, not a course', 'The other tutorials of this library teach a tool. This one **defends a pipeline**: every file is shown, every claim has a run behind it, and the last mission is the interview talk track.', 'One pipeline, defended.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it and wrote down what it printed. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['The repository', 'The project is a folder of this library, `projects/brewline-elt`, with a `README`, a `Makefile` and three requirements files. The screens show its files as they are on disk.', 'You can clone it and run it.'],
          ['What failed on purpose', 'Day 3 of the pretend shop holds two traps, and the first version of the gate had a flaw that a backfill found. Both are recorded, and both are drills in this walkthrough.', 'The failures are the lesson.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['Ingestion', 'dlt ' + M('dlt') + ' into DuckDB ' + M('duckdb'), 'Run'],
          ['Transformation', 'dbt ' + M('dbt') + ' with dbt-duckdb ' + M('dbt_duckdb'), 'Run'],
          ['Orchestration', 'Airflow ' + M('airflow') + ', one DAG run in a process with `airflow dags test`', 'Run'],
          ['A deployed Airflow', 'A scheduler, workers, the web interface, connections and alerts', 'Not run'],
          ['A cloud warehouse, CI, alert channels', 'They need accounts and servers', 'Not run']
        ],
        steps: [
          { upto: 3, say: 'The first three rows ran: the project went through Airflow three times for real, plus a retry of one day and a backfill. `airflow dags test` runs the tasks of a DAG in order in one process, and it is not a scheduler.' },
          { upto: 5, say: 'The last two rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
