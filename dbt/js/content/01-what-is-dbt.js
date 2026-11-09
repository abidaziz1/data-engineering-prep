/* Mission 1: what dbt is, what a project looks like, and what happens when you run it. */
(function () {
  var B = LAB.b, G = LAB.get;

  var TREE = G.text('tree');
  var TL = TREE.split('\n').length;
  var DP = G.file('dbt_project.yml');
  var PF = G.file('profiles.yml');

  var BUGP = [
    'name: brewline',
    "version: '1.0.0'",
    'profile: brewline',
    '',
    'models:',
    '  brewlin:',
    '    staging:',
    '      +materialized: view',
    '    marts:',
    '      +materialized: table'
  ].join('\n');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'What dbt is', short: 'What dbt is', blurb: 'The idea, the project folder, and what a run does', minutes: 22,
    focus: ['src', 'stg', 'int', 'mart'],
    goals: [
      'Say in one minute **what dbt does** and what it leaves to other tools.',
      'Find your way around a **dbt project**: models, tests, macros, seeds, snapshots and two YAML files.',
      'Describe **what happens** between typing `dbt build` and the tables appearing.',
      'Tell **dbt Core** from the **dbt platform** and from the newer engine, and choose between them.'
    ],
    say: 'Mission 1 is the idea. dbt is smaller than people think. It is a program that turns SQL files into tables, in the right order, and checks them. Once you see that, the rest of the course is detail.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, title: 'dbt in one minute',
        say: 'Five points. If you can say these out loud, you can pass the first five minutes of any dbt interview. Press Next for each.',
        items: [
          ['The T in ELT', 'Data is **extracted** and **loaded** into the warehouse by other tools. dbt does the **transform** step, inside the warehouse, on data that is already there.', 'dbt starts where the loaders stop.'],
          ['A model is a SELECT', 'You write a `SELECT` statement in a `.sql` file. dbt wraps it in `CREATE VIEW` or `CREATE TABLE AS`. You choose which with one line of config. You never write the `CREATE` yourself.', 'You write the query. dbt writes the DDL.'],
          ['It knows the order', 'When one model calls `ref(\'other_model\')`, dbt learns that dependency. All the calls together make a graph, and dbt runs the models in dependency order, several at once.', 'ref() is how dbt learns the order.'],
          ['It tests and explains', 'Tests, descriptions, lineage and a docs site come from the same files. A pull request can change a model, its tests and its description together.', 'Quality and explanation live next to the code.'],
          ['It does not run itself', 'dbt Core is a command-line program. Something else has to start it on a schedule and on every pull request: Airflow, GitHub Actions, cron, or the hosted dbt platform. Mission 11 covers this.', 'Core builds. A scheduler decides when.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm1-flow', t: 1, title: 'What happens when you run dbt build', g: 'lifecycle', legend: true,
        steps: [
          { say: 'You type one command. Five things happen before it ends. Press Next to follow them.', cap: 'The same five steps for `run`, `test`, `build` and `compile`.' },
          { say: 'First dbt reads the project: every model, every YAML file, every macro. Parsing needs no warehouse connection.', on: ['l1'], focus: ['files', 'parse'], cap: 'A mistake in a YAML key often fails here, before any SQL runs.' },
          { say: 'While parsing, dbt finds every `ref()` and `source()`. Those calls are the dependencies.', on: ['l2'], tags: ['tg_cheap'], focus: ['parse', 'graph'], cap: 'The result is the **manifest**: a description of the whole project.' },
          { say: 'Then dbt builds the graph and applies your `--select`. Only the chosen nodes continue.', on: ['l3'], focus: ['graph', 'compile'], cap: 'A cycle, where A needs B and B needs A, is an error at this point.' },
          { say: 'Compiling turns each chosen model into plain SQL. Jinja is evaluated, `ref()` becomes a real table name, and `{{ this }}` becomes the model\'s own table.', on: ['l4'], focus: ['compile', 'run'], cap: 'The SQL is saved in `target/compiled`. Read it when a model surprises you.' },
          { say: 'Running sends the statements to the warehouse, in dependency order, in parallel up to the thread count. The warehouse does the work.', on: ['l5'], tags: ['tg_wh'], focus: ['run', 'art'], cap: 'dbt waits for each statement. The data never passes through your machine.' },
          { say: 'At the end dbt writes artifacts: `manifest.json` describes the project and `run_results.json` says what happened to each node. CI jobs and other tools read them.', focus: ['art'], cap: 'Artifacts are how **slim CI** works. Mission 11.' }
        ]
      }),

      B.code({
        id: 'm1-tree', t: 1, title: 'A dbt project, folder by folder', file: 'brewline/', lang: 'text', code: TREE,
        steps: [
          { say: 'This is the real Brewline project that produced every output in this course. It is just folders and text files. Press Next to tour it.', lines: null },
          { say: 'models is where most of the work lives. Each `.sql` file is one model. YAML files next to them describe the models and their tests. The three subfolders are the three layers: staging, intermediate and marts.', lines: [G.at(TREE, /^├── models\//), G.at(TREE, /^├── seeds\//) - 1] },
          { say: 'macros holds reusable Jinja functions. Mission 5.', lines: [G.at(TREE, /^├── macros\//), G.at(TREE, /^├── models\//) - 1] },
          { say: 'seeds holds small CSV files that dbt loads as tables, for example a list of country names.', lines: [G.at(TREE, /^├── seeds\//), G.at(TREE, /^├── snapshots\//) - 1] },
          { say: 'snapshots records how a source row changes over time. Mission 8.', lines: [G.at(TREE, /^├── snapshots\//), G.at(TREE, /^├── tests\//) - 1] },
          { say: 'tests holds plain SQL tests and custom test definitions. Mission 6.', lines: [G.at(TREE, /^├── tests\//), G.at(TREE, /^├── \.gitignore/) - 1] },
          { say: 'Four files sit at the top. `dbt_project.yml` and `profiles.yml` are the two that every project has. `packages.yml` lists other people\'s dbt code that you install.', lines: [G.at(TREE, /^├── \.gitignore/), TL] }
        ]
      }),

      B.code({
        id: 'm1-project', t: 1, title: 'dbt_project.yml: what this project is', file: 'dbt_project.yml', lang: 'yaml', code: DP,
        steps: [
          { say: 'This file says what the project is and sets defaults for whole folders. Press Next.', lines: null },
          { say: 'The project name, and the name of the profile to use. The profile says where to connect. It is another file.', lines: G.span(DP, /^name:/, /^profile:/) },
          { say: 'Where dbt looks for each kind of file. These are the defaults, and most projects never change them.', lines: G.span(DP, /^model-paths:/, /^test-paths:/) },
          { say: 'What `dbt clean` deletes. Both folders are rebuilt on demand and stay out of Git.', lines: G.span(DP, /^clean-targets:/) },
          { say: 'The important block. It sets defaults per folder. Everything under staging becomes a view in a schema called staging. Marts become tables. A single model can override this in its own file.', lines: G.span(DP, /^models:/, /\+schema: marts/) },
          { say: 'Seeds have their own block. The key under models and seeds must match the project name exactly. A misspelling would silently apply to nothing.', lines: G.span(DP, /^seeds:/, /\+schema: reference/) }
        ],
        note: 'The plus sign marks a **config** such as `+materialized`. Without a plus sign, a key is a folder name.'
      }),

      B.code({
        id: 'm1-profile', t: 1, title: 'profiles.yml: where to connect', file: 'profiles.yml', lang: 'yaml', code: PF,
        steps: [
          { say: 'This file says which warehouse to talk to and as whom. Press Next.', lines: null },
          { say: 'The top key is the profile name that dbt_project.yml asked for. The default target is dev, so a plain `dbt run` builds the developer copy.', lines: G.span(PF, /^brewline:/, /target: dev/) },
          { say: 'A target called dev. The schema is dev_alice, Alice\'s private space, so her experiments never touch what the dashboards read. Threads is how many models may run at the same time.', lines: G.span(PF, /^    dev:/, /threads:/) },
          { say: 'A target called prod. Same warehouse, different schema, and the scheduler picks it with `--target prod`.', lines: G.span(PF, /^    prod:/, /threads:/) }
        ],
        note: 'This project uses DuckDB so the course runs anywhere. For Snowflake, `type` is `snowflake` and the keys are account, user, role, warehouse and database. In a real team the file lives in `~/.dbt/`, outside Git, and passwords come from `env_var`. Never commit credentials.'
      }),

      B.term({
        id: 'm1-term', t: 1, title: 'Your first dbt build', g: 'dag',
        say: 'Here is dbt build running the whole Brewline project for real. Watch the graph. Gray blocks wait, blue blocks run, green blocks finished. Several models run at once, because the thread count is four.',
        initial: G.wait('dag'),
        lines: function () { return G.term('build_day1'); },
        after: 'Forty-one nodes ran: views, tables, an incremental model, a seed, a snapshot, tests and an exposure. **PASS=39 WARN=1** means one test returned rows but is set to warn. That one is on purpose, and Mission 6 explains it. The `NO-OP` is the exposure, which has nothing to run.',
        afterKind: 'tip',
        doneSay: 'Done. Notice the order. The sources are read first. The staging views come before the models that need them, and the tests follow the model they check.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'You run `dbt build` against a warehouse. Where does the transformation work happen?',
        opts: [
          { t: 'On the machine that runs dbt, which reads the rows and writes them back', fb: 'dbt never pulls your data through the machine. It sends SQL.' },
          { t: 'Inside the warehouse, because dbt compiles SQL and sends it as statements', fb: '' },
          { t: 'On a dbt server that keeps its own copy of the data', fb: 'dbt Core has no server, and it keeps no copy of your data.' },
          { t: 'In the BI tool, when a dashboard opens', fb: 'The BI tool only reads the finished tables.' }
        ],
        ok: 1, why: 'dbt compiles each model to SQL and sends statements such as `CREATE TABLE AS SELECT`. The warehouse reads and writes the data. That is why dbt scales with your warehouse and needs no cluster of its own.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'You changed a model and want to read the SQL that dbt will send, without creating anything. Which command?',
        opts: [
          { t: '`dbt run`', fb: 'run compiles and then executes. It creates or replaces the object.' },
          { t: '`dbt compile`', fb: '' },
          { t: '`dbt seed`', fb: 'seed loads CSV files into tables.' },
          { t: '`dbt clean`', fb: 'clean deletes the target folder.' }
        ],
        ok: 1, why: '`dbt compile` renders the Jinja and writes plain SQL to `target/compiled`. It creates no tables or views. It may still read warehouse metadata, for example to see whether an incremental table exists.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the life of a dbt command in order.',
        items: [
          'dbt reads and parses every file in the project',
          'It finds every ref() and source() and builds the graph',
          'It applies --select to choose the nodes',
          'It compiles Jinja into plain SQL for each chosen node',
          'It runs the SQL in the warehouse in dependency order, in parallel',
          'It writes run_results.json and the compiled files to target/'
        ],
        why: 'Parse, graph, select, compile, run, write results. Only the fifth step touches the warehouse, so the first four are fast and safe to repeat.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'The team set `staging` models to views and `marts` to tables in `dbt_project.yml`. After a build, every model is a view. Click the line that causes it.',
        file: 'dbt_project.yml', lang: 'yaml', code: BUGP, bad: 6,
        hint: 'Compare the key under models with the project name at the top.',
        why: 'The key under `models:` has to be the project name, `brewline`. A misspelled key matches no model, so no config applies and every model falls back to the default, a view. dbt does warn about it (' + G.grep(G.log('cfg_typo'), /do not apply to any resources/).replace(/^\d\d:\d\d:\d\d\s+/, '').replace(/^\[WARNING\]:\s*/, '').trim() + '), but a warning scrolls past in CI logs.',
        fix: BUGP.replace('brewlin:', 'brewline:'),
        cheer: 'A typo that fails silently is the worst kind. Read warnings in CI output, or turn them into errors.'
      }),

      B.cmp({
        id: 'm1-flavors', t: 2, title: 'dbt Core, the dbt platform and the newer engine',
        say: 'Interviewers ask which dbt you used. There are three names to know. The facts in the last row move quickly, so treat them as a starting point and check the vendor pages.',
        cols: ['', 'dbt Core', 'dbt platform', 'dbt Fusion engine (dbt v2)'],
        rows: [
          ['What it is', 'The open source command-line program. This course used version ' + LAB.real.meta.dbt + '.', 'A hosted service from dbt Labs that runs dbt for you.', 'A newer engine, written in Rust, that dbt Labs now calls dbt v2.'],
          ['Who runs it', 'You do: a laptop, a CI runner, a container, Airflow.', 'The vendor hosts the IDE and the jobs.', 'You install it, or the platform uses it for you.'],
          ['Scheduling and CI', 'You build them with cron, Airflow or GitHub Actions.', 'Built-in scheduled jobs, CI jobs and alerts.', 'Same as the product it runs in.'],
          ['Speed', 'Parsing time grows with project size. Core 1.12 has an opt-in faster parser, `--use-v2-parser`.', 'Same engine, unless you choose the newer one.', 'Faster parsing, and it can check SQL before the warehouse runs it.'],
          ['Status to check', 'The 1.x line stays maintained.', 'Generally available.', 'The vendor pages said it is the default for new installs, but availability differs by warehouse. Check before you rely on it.']
        ],
        steps: [
          { upto: 2, say: 'What each one is and who runs it. The project files are the same for Core and the platform, so the choice is about operations, not code.' },
          { upto: 4, say: 'Scheduling and speed. This is where the platform saves effort and where the newer engine promises more.' },
          { upto: 5, say: 'Status. These recent facts came from search summaries, because the vendor documentation was not reachable when this course was built. Confirm them before you repeat them in an interview.' }
        ],
        pick: 'For a small team that already runs Airflow or GitHub Actions, **Core** is enough and costs no license. Choose the **platform** when you do not want to own scheduling, CI and the docs site. Test the **newer engine** on a branch, and read its current status page first.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, title: 'Decision: where should the transformation logic live?',
        scenario: 'Brewline has **40 SQL transformations** that run as stored procedures chained by a scheduler. Nobody knows which one depends on which, a failure in step 12 blocks steps 13 to 40, and nothing is tested. Two engineers have one quarter to fix it.',
        opts: [
          { t: 'Keep the procedures and add a wiki page that lists the dependencies', d: 'Cheapest this week.', lose: 'The page is wrong the day after you write it. Nothing tests the data, and one failure still blocks everything behind it.' },
          { t: 'Move to dbt', d: 'One model per procedure, ref() for dependencies, tests in YAML, everything reviewed in Git and run in CI.' },
          { t: 'Buy an ETL tool with a visual canvas', d: 'Analysts can drag boxes.', lose: 'The logic hides in a UI that is hard to review, diff and test, and you pay for a license on top of the warehouse.' }
        ],
        pick: 1,
        why: 'dbt solves the three actual problems. **Dependencies** come from `ref()`, so the graph is always right. **Failures** are contained, because only the children of a failed model are skipped. **Tests** run in the same command. Two engineers can port 40 SELECT statements in a quarter, because the SQL mostly carries over.',
        when: 'Stay with procedures if there are only three or four and they rarely change. Choose a visual tool when analysts without SQL skills own the pipelines and the license already exists.'
      }),

      B.qa({
        id: 'qa-dbt', t: 1, tag: 'dbt basics', secs: 60,
        q: 'What is dbt, and where does it fit in a data stack?',
        pts: ['It is the T in ELT: it transforms data that is already in the warehouse', 'Models are SELECT statements that dbt turns into views and tables', 'ref() gives it a dependency graph, so it runs things in the right order', 'Tests, documentation and lineage come from the same project', 'Core is a command-line tool, so a scheduler and CI are separate'],
        short: 'dbt is the transformation layer in an ELT stack. A loader such as Fivetran, Airbyte or a custom pipeline copies raw data into the warehouse, and dbt turns that raw data into clean, tested tables with SQL that lives in Git.\n\nEach model is a SELECT statement in a file. dbt wraps it in the right CREATE statement, so I pick a view, a table or an incremental table with one line of config. When a model calls ref() on another, dbt learns the dependency, builds a graph, and runs the models in order and in parallel. The same project holds tests, descriptions and lineage, so quality and explanation go through code review with the SQL.\n\ndbt does not extract or load data, and dbt Core does not schedule itself. In a typical setup, a scheduler runs dbt build every hour, CI runs only the changed models on every pull request, and analysts read the marts through a BI tool.',
        fu: [
          ['Is dbt an ETL tool?', 'No. It does the T. Extraction and loading happen elsewhere. dbt pushes SQL to the warehouse and the warehouse does the work, so dbt never holds your data.'],
          ['Why SQL in Git and not a visual tool?', 'Reviewable diffs, branches, tests in CI and easy rollbacks. A visual canvas hides logic in screenshots.'],
          ['What does dbt not do?', 'It does not load data, it does not schedule itself in Core, and it cannot repair bad source data. It can only tell you the data is bad.']
        ],
        trap: 'Calling dbt an ETL tool, or saying it "moves data". It sends SQL, and the data stays in the warehouse.',
        real: 'Say what your stack was: loader, warehouse, scheduler, BI tool, and how many models.'
      }),

      B.qa({
        id: 'qa-core-platform', t: 2, tag: 'dbt basics', secs: 75,
        q: 'Would you pick dbt Core or the dbt platform for a new team? How do you decide?',
        pts: ['Who owns scheduling, CI, secrets and the docs site in each option', 'Cost: no license for Core, a subscription plus less operations work for the platform', 'Team skills and size', 'Constraints such as data residency or running inside your own cloud', 'The code is the same, so the choice is reversible', 'Check the status of the newer engine before promising anything'],
        short: 'It depends on who owns the plumbing. dbt Core is open source and runs anywhere. It costs no license, but my team must build and run the scheduler, the CI jobs, the secret handling and the docs site. The dbt platform is a hosted service with an IDE, scheduled and CI jobs, hosted docs and governance features, for a subscription.\n\nI pick Core when the team already runs Airflow or GitHub Actions, wants everything in its own cloud account, or has strict residency rules. I pick the platform when the team is small and analytics-heavy, nobody wants to own orchestration, or we need hosted docs and lineage quickly.\n\nThe dbt project is the same either way, so the choice is reversible, and I would run both in parallel on a branch before switching. I would also read the vendor\'s current page on dbt v2 and the Fusion engine before promising anything, because that part is moving.',
        fu: [
          ['What do you lose by leaving Core?', 'Control over the runtime, the exact dbt version, where it runs and what each run costs. You trade it for less to maintain.'],
          ['How would you migrate between them?', 'The project files stay. You move connection settings and secrets, recreate the jobs, and compare row counts from a parallel run before you cut over.']
        ],
        trap: 'Answering with product names only. Say who owns scheduling, CI, secrets and docs in each option.',
        real: 'Say which one you used, where it ran, and one thing it made easy and one thing it made hard.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Project Starter', color: '#99F6E4',
        pts: [
          'dbt is the **T in ELT**. It sends SQL to the warehouse, and the data stays there.',
          'A model is a **SELECT in a file**. dbt writes the CREATE.',
          '`ref()` and `source()` give dbt a **graph**, so it knows the order.',
          'A run: **parse, graph, select, compile, run, write results**.',
          '`dbt_project.yml` says what the project is. `profiles.yml` says where it connects.'
        ],
        lines: [
          'dbt transforms data that is already in the warehouse. It does not load it.',
          'Every model is a SELECT, and dbt writes the CREATE.',
          'When a model surprises me, I read the compiled SQL in target/compiled.'
        ]
      })
    ]
  });
})();
