/* Mission 11: delivery. Unit tests with local Spark, bundles, environments, and pull request checks.
   The tests ran for real with pytest and PySpark. The bundle files and the workflow are documentation: the verification step checks the bundle against the
   JSON schema of the Databricks CLI and the workflow against the GitHub workflow schema. Nothing was deployed to Databricks. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TR = G.file('test/transforms.py'), CF = G.file('test/conftest.py'), TT = G.file('test/tests/test_transforms.py'), TB = G.file('test/transforms_bug.py');
  var PASS = G.text('test.pytest_pass').replace(/ in N s\s*$/m, ''), FAIL = G.text('test.pytest_fail').replace(/ in N s\s*$/m, '');
  var CLONE = G.counts('delta.shallow_clone');
  G.expect(G.counts('test.pass').returncode === 0 && G.counts('test.fail').returncode === 1 && /3 passed/.test(PASS) && /1 failed, 2 passed/.test(FAIL), 'three tests pass, and with the typo one fails');
  G.expect(CLONE.num_copied_files === '0' && CLONE.parquet_files_in_clone_folder === 0, 'a shallow clone copies no data files');
  G.expect(/CANCELED/.test(TB) && !/CANCELED/.test(TR) && /CANCELLED/.test(TR), 'the buggy variant misspells CANCELLED');

  var BUNDLE = [
    'bundle:',
    '  name: brewline',
    '',
    'include:',
    '  - resources/*.yml',
    '',
    'variables:',
    '  catalog:',
    '    description: The Unity Catalog catalog that the pipeline writes to',
    '    default: brewline_dev',
    '',
    'targets:',
    '  dev:',
    '    mode: development',
    '    default: true',
    '    workspace:',
    '      host: https://adb-1111111111111111.1.azuredatabricks.net',
    '',
    '  prod:',
    '    mode: production',
    '    variables:',
    '      catalog: brewline_prod',
    '    workspace:',
    '      host: https://adb-2222222222222222.2.azuredatabricks.net',
    '      root_path: /Workspace/Production/.bundle/${bundle.name}/${bundle.target}',
    '    run_as:',
    '      service_principal_name: 11111111-2222-3333-4444-555555555555'
  ].join('\n');

  var RESOURCE = [
    'resources:',
    '  jobs:',
    '    brewline_nightly:',
    '      name: brewline_nightly',
    '      max_concurrent_runs: 1',
    '      parameters:',
    '        - name: catalog',
    '          default: ${var.catalog}',
    '      trigger:',
    '        file_arrival:',
    '          url: abfss://landing@brewlinelake.dfs.core.windows.net/orders/',
    '          wait_after_last_change_seconds: 300',
    '      email_notifications:',
    '        on_failure:',
    '          - data-eng@brewline.example',
    '      environments:',
    '        - environment_key: default',
    '          spec:',
    '            environment_version: "4"',
    '      tasks:',
    '        - task_key: ingest_bronze',
    '          environment_key: default',
    '          spark_python_task:',
    '            python_file: ../src/ingest_bronze.py',
    '            parameters: ["--catalog", "${var.catalog}"]',
    '          max_retries: 2',
    '          min_retry_interval_millis: 60000',
    '        - task_key: upsert_silver',
    '          depends_on:',
    '            - task_key: ingest_bronze',
    '          environment_key: default',
    '          spark_python_task:',
    '            python_file: ../src/upsert_silver.py',
    '            parameters: ["--catalog", "${var.catalog}"]'
  ].join('\n');

  var CLI = [
    '# check the files, without touching the workspace',
    'databricks bundle validate -t dev',
    '',
    '# create or update the job in the dev workspace',
    'databricks bundle deploy -t dev',
    '',
    '# start the job once and wait for it',
    'databricks bundle run brewline_nightly -t dev',
    '',
    '# remove everything this bundle created in dev',
    'databricks bundle destroy -t dev'
  ].join('\n');

  var CI = [
    'name: brewline-ci',
    '',
    'on:',
    '  pull_request:',
    '  push:',
    '    branches: [main]',
    '',
    'permissions:',
    '  id-token: write',
    '  contents: read',
    '',
    'jobs:',
    '  test:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-python@v5',
    '        with:',
    '          python-version: "3.12"',
    '      - run: pip install -r requirements-dev.txt',
    '      - run: pytest -q',
    '',
    '  validate:',
    '    needs: test',
    '    runs-on: ubuntu-latest',
    '    env:',
    '      DATABRICKS_AUTH_TYPE: github-oidc',
    '      DATABRICKS_HOST: ${{ vars.DATABRICKS_HOST_DEV }}',
    '      DATABRICKS_CLIENT_ID: ${{ vars.DATABRICKS_CLIENT_ID_DEV }}',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: databricks/setup-cli@main',
    '      - run: databricks bundle validate -t dev',
    '',
    '  deploy:',
    '    if: github.ref == \'refs/heads/main\'',
    '    needs: validate',
    '    runs-on: ubuntu-latest',
    '    environment: production',
    '    env:',
    '      DATABRICKS_AUTH_TYPE: github-oidc',
    '      DATABRICKS_HOST: ${{ vars.DATABRICKS_HOST_PROD }}',
    '      DATABRICKS_CLIENT_ID: ${{ vars.DATABRICKS_CLIENT_ID_PROD }}',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: databricks/setup-cli@main',
    '      - run: databricks bundle deploy -t prod'
  ].join('\n');

  var BUG = [
    'def test_daily_revenue(spark):',
    '    df = spark.read.table("brewline_prod.silver.orders")',
    '    result = daily_revenue(df).collect()',
    '    assert len(result) > 0'
  ].join('\n');
  var BUGFIX = [
    'def test_daily_revenue_ignores_cancelled_orders(spark):',
    '    df = orders(spark, [',
    '        ("O-1", "SHIPPED", datetime.datetime(2026, 3, 14, 9), Decimal("10.00"), datetime.datetime(2026, 3, 14, 10)),',
    '        ("O-2", "CANCELLED", datetime.datetime(2026, 3, 14, 11), Decimal("99.00"), datetime.datetime(2026, 3, 14, 12)),',
    '    ])',
    '    result = daily_revenue(df).collect()',
    '    assert [(r.orders, r.revenue_usd) for r in result] == [(1, Decimal("10.00"))]'
  ].join('\n');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Delivery: tests, bundles and releases', short: 'Delivery', blurb: 'Test the code, package it as a bundle and release through a pull request', minutes: 40,
    focus: ['ci'],
    goals: [
      'Write a **unit test** for a PySpark function and run it on a laptop.',
      'Read a **failing test** and find the cause.',
      'Describe a **bundle**: targets, variables, resources and the two **modes**.',
      'Design a **pull request check** and a release to production with a service principal.',
      'Choose how CI proves its identity without a long-lived secret.'
    ],
    say: 'Mission 11 is about getting code to production safely. The tests in this mission ran for real: pytest and PySpark on one machine, with the three tests passing and one failing on purpose. The bundle files and the workflow are documentation. I checked the bundle against the JSON schema that the Databricks CLI publishes, and the workflow against the GitHub workflow schema, and I did not deploy anything.',
    scenes: [
      B.talk({
        id: 'm11-talk', t: 1, src: 'docs', title: 'How code reaches production',
        say: 'Press Next for the path that code takes after you write it.',
        items: [
          ['Code lives in Git', 'Notebooks that someone edits in production leave no review and no history. Keep the code in a repository, in files, and let Databricks run it from there.', 'Review and history.'],
          ['Tests run first', 'A unit test runs a function on a few rows, in seconds, on a laptop or a CI runner. It needs no cluster. The next screens run three of them.', 'Fast feedback.'],
          ['A bundle packages the project', 'A **bundle** is a folder of files that describes jobs, pipelines and their settings, with a separate target for each environment. You validate it, deploy it and run it with the Databricks CLI.', 'The project as code.'],
          ['Pull requests are the gate', 'Every change goes through a pull request. A check runs the tests and validates the bundle. Only a merge to the main branch can deploy to production.', 'Nobody pushes to production by hand.'],
          ['A service principal deploys', 'The deployment runs as a service principal, not as a person, and it proves its identity without a long-lived secret where it can. The last decision in this mission is about that.', 'A machine identity ships the code.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-transforms', t: 1, src: 'rec', title: 'Write transformations as functions', file: 'transforms.py', lang: 'python', code: TR,
        steps: [
          { say: 'The first rule of testable Spark code: put the logic in functions that take a DataFrame and return a DataFrame. They read nothing and write nothing. These are the two functions that the tests exercise.', lines: null },
          { say: '`latest_per_key` keeps the newest row for each key. It is the rule from mission 2 and mission 5, as a function with a name.', lines: G.span(TR, /def latest_per_key/, /return df\.withColumn/) },
          { say: '`daily_revenue` drops cancelled orders, groups by day, and counts and sums. It is the gold rule of mission 5.', lines: G.span(TR, /def daily_revenue/, /\.agg\(/) }
        ],
        note: 'The functions know nothing about tables or paths. The job passes in the data and writes the result, so a test can pass in three rows instead.'
      }),

      B.code({
        id: 'm11-conftest', t: 1, src: 'rec', title: 'A Spark session for the tests', file: 'conftest.py', lang: 'python', code: CF,
        steps: [
          { say: 'Tests need a Spark session. A pytest **fixture** creates one and hands it to every test that asks for it.', lines: null },
          { say: '`scope="session"` creates the session once for the whole run. Starting Spark takes seconds, and you do not want it for every test.', lines: G.span(CF, /@pytest\.fixture/, /def spark/) },
          { say: '`local[2]` runs Spark inside the test process with two threads. No cluster. The shuffle partitions are 2, because a test has a few rows, and the UI is off.', lines: G.span(CF, /session = /, /ui\.enabled/) },
          { say: '`yield` gives the session to the tests. After the last test, the code after it stops the session.', lines: G.span(CF, /yield session/, /session\.stop/) }
        ]
      }),

      B.code({
        id: 'm11-tests', t: 1, src: 'rec', title: 'Three tests', file: 'tests/test_transforms.py', lang: 'python', code: TT,
        steps: [
          { say: 'Each test builds a small DataFrame, calls the function, and checks the result. These three ran in the recording.', lines: null },
          { say: 'A helper builds a DataFrame from rows with the schema of orders, so every test reads the same way.', lines: G.span(TT, /^SCHEMA/, /def orders/) },
          { say: 'Test 1: two versions of one order. The function must keep the newest, `SHIPPED`.', lines: G.span(TT, /def test_latest_per_key/, /assert \[\(r\.order_id, r\.status\)/) },
          { say: 'Test 2: a cancelled order of $99 and a shipped order of $10 on the same day. Revenue must count only the shipped one.', lines: G.span(TT, /def test_daily_revenue_ignores_cancelled_orders/, /assert \[\(r\.orders, r\.revenue_usd\)/) },
          { say: 'Test 3: two orders on two days. The result must have one row for each day, with the right sums.', lines: G.span(TT, /def test_daily_revenue_groups_by_date/, /assert result ==/) }
        ],
        note: 'The tests build their own data. They never read a production table, so they give the same answer on every machine, every day. PySpark also ships `pyspark.testing.assertDataFrameEqual` to compare two DataFrames (documentation).'
      }),

      B.term({
        id: 'm11-pass', t: 1, src: 'rec', title: 'pytest: three tests pass',
        say: 'This is the real output of the run. Each dot is a passed test.',
        lines: function () { return G.plain(PASS, { cmd: 'pytest -q', d: 120 }); },
        after: 'Three dots, three passed tests, and the command ended with exit code 0. A CI runner reads that exit code. Zero lets the pull request continue. Anything else stops it.',
        afterKind: 'tip',
        doneSay: 'The whole run took a few seconds, on one machine, with no cluster. Run it before every commit.'
      }),

      B.term({
        id: 'm11-fail', t: 1, src: 'rec', title: 'pytest: one test fails',
        say: 'Now a bug. In a second copy of `daily_revenue`, someone wrote the status as `CANCELED` with one L. The tests catch it.',
        lines: function () { return G.plain(FAIL, { cmd: 'pytest -q', d: 110 }); },
        after: 'The failing test is `test_daily_revenue_ignores_cancelled_orders`. The assertion shows what the code returned, `(2, Decimal(\'109.00\'))`, and what the test expected, `(1, Decimal(\'10.00\'))`. The cancelled order of $99 was counted, because the filter compared with the wrong spelling. Without this test, the revenue would have been wrong in production, with no error.',
        afterKind: 'warn',
        doneSay: 'Read the diff, not just the red. The numbers point straight at the line.'
      }),

      B.bug({
        id: 'm11-bugline', t: 1, q: 'Find the line in the buggy copy of `daily_revenue` that made the test fail.',
        file: 'transforms_bug.py', lang: 'python', code: TB, bad: [G.at(TB, /CANCELED/)],
        hint: 'The test is about cancelled orders. Look at the status in the filter.',
        why: 'The filter compares the status with `"CANCELED"`, one L, but the data says `"CANCELLED"`, two. No row matches, so nothing is removed. The cancelled order of $99 was counted. A test with a cancelled order caught it, which is why every business rule needs a test with a row that breaks the rule.',
        fix: G.lines(TR, G.at(TR, /def daily_revenue/), G.at(TR, /\.agg\(/)),
        cheer: 'The test pays for itself the first time it catches a typo like this.'
      }),

      B.bug({
        id: 'm11-bug', t: 1, q: 'This test runs in CI and always passes. It is worth almost nothing. Click a line that is wrong.',
        file: 'test_bad.py', lang: 'python', code: BUG, bad: [G.at(BUG, /read\.table/), G.at(BUG, /assert len/)],
        hint: 'One line reads data that the test does not control. Another one cannot fail for most bugs.',
        why: 'The test reads a **production table**, so its result depends on today\'s data and it needs access to production. And `len(result) > 0` passes for almost any output, including a wrong one. Build a small DataFrame in the test and assert the exact values, as the recorded tests do.',
        fix: BUGFIX,
        cheer: 'A test that cannot fail is a comment.'
      }),

      B.cmp({
        id: 'm11-layers', t: 2, src: 'docs', title: 'Layers of checks',
        say: 'No single check catches everything. Press Next to read the layers. The first one is what you just ran.',
        cols: ['Check', 'What it catches', 'Where it runs', 'Cost'],
        hl: 1,
        rows: [
          ['Unit tests with local Spark', 'Logic errors in a function, such as the misspelled status.', 'A laptop or a CI runner, no cluster.', 'Seconds, free.'],
          ['Pipeline dry run', 'A broken reference, as in mission 8.', 'CI, no data moves.', 'Seconds.'],
          ['Bundle validation', 'A wrong setting or a typo in the project files.', 'CI, no workspace changes.', 'Seconds.'],
          ['Integration run in a dev schema', 'A job that works on real tables, permissions and compute.', 'A dev workspace, on a copy of the data.', 'Minutes of compute.'],
          ['Data quality rules', 'Bad rows in production data, such as a negative total.', 'In the pipeline, on every run.', 'Part of the run.'],
          ['Reconciliation', 'A total that differs from the source system.', 'A scheduled job.', 'A small query.']
        ],
        steps: [
          { upto: 3, say: 'The first three are cheap and catch mistakes before anything is deployed. They belong in every pull request.' },
          { upto: 4, say: 'An integration run proves that the job works on real tables with real permissions. It costs compute, so run it on a small copy.' },
          { upto: 6, say: 'The last two watch production data. Code can be right and the data can still be wrong.' }
        ],
        pick: 'Put the **three cheap checks in every pull request**. Run the **integration check** in a dev schema, on a copy of the data. Keep **quality rules and reconciliation** running in production.'
      }),

      B.rows({
        id: 'm11-clone', t: 2, src: 'rec', title: 'A cheap copy of production for tests',
        steps: [
          {
            say: 'An integration run needs realistic data. Copying a large table costs time and storage. In mission 3 you ran a **shallow clone**: it creates a new table that points at the files of the source.',
            tabs: [{ layer: 'CLONE', name: 'what the shallow clone copied', c: 'snap', cols: ['metric', 'value'], rows: [['data files in the source', CLONE.source_num_of_files], ['data files copied', CLONE.num_copied_files], ['Parquet files in the clone folder', String(CLONE.parquet_files_in_clone_folder)]], trk: 1 }],
            notes: ['Zero data files were copied. A test can write to the clone without touching production, because new files go to the clone and the source stays as it is.']
          },
          {
            say: 'A pull request check can clone the production tables it needs into a schema of its own, run the job against that schema, and drop the schema afterwards. A shallow clone depends on the source files, so do not run `VACUUM` on the source in the middle of the check.',
            code: { file: 'a schema for one pull request', lang: 'sql', code: 'CREATE SCHEMA brewline_ci.pr_123;\n\nCREATE TABLE brewline_ci.pr_123.orders SHALLOW CLONE brewline_prod.silver.orders;' }
          }
        ]
      }),

      B.code({
        id: 'm11-bundle', t: 1, src: 'docs', title: 'A bundle: one project, two targets', file: 'databricks.yml', lang: 'yaml', code: BUNDLE,
        steps: [
          { say: 'A bundle starts with `databricks.yml`. It names the project, says where the resource files are, defines variables, and lists the **targets**: the places the project deploys to. The YAML is checked against the CLI schema in the verification step.', lines: null },
          { say: 'The bundle has a name, and it includes every YAML file in the `resources` folder. The jobs and pipelines live there, so this file stays short.', lines: G.span(BUNDLE, /^bundle:/, /resources\/\*\.yml/) },
          { say: 'A **variable** holds a value that changes between targets. Here, the catalog. The default is the dev catalog.', lines: G.span(BUNDLE, /^variables:/, /default: brewline_dev/) },
          { say: 'The **dev** target uses `mode: development` and is the default. It points at the dev workspace.', lines: G.span(BUNDLE, /^  dev:/, /host: https:\/\/adb-1111/) },
          { say: 'The **prod** target uses `mode: production`. It overrides the catalog, points at the production workspace, and deploys to a folder that only the pipeline can write.', lines: G.span(BUNDLE, /^  prod:/, /root_path/) },
          { say: '`run_as` makes the deployed jobs run as a **service principal**. The documentation recommends this for production, so the jobs do not depend on one person.', lines: G.span(BUNDLE, /run_as:/, /service_principal_name/) }
        ],
        note: 'The documentation advises against a path under `/Shared` as the production root, because every workspace user can write there. Use a folder with restricted write access.'
      }),

      B.cmp({
        id: 'm11-modes', t: 1, src: 'docs', title: 'Development mode and production mode',
        say: 'The `mode` of a target changes how a deployment behaves. Press Next to compare. This follows the documentation of deployment modes.',
        cols: ['Behaviour', '`mode: development`', '`mode: production`'],
        hl: 2,
        rows: [
          ['Resource names', 'Most names get a `[dev <your name>]` prefix, and jobs and pipelines are tagged.', 'Names stay as you wrote them.'],
          ['Schedules and triggers', 'All paused on the deployed resources.', 'Run as defined.'],
          ['Concurrent runs', 'Enabled on deployed jobs, for faster iteration.', 'Your setting stands.'],
          ['Checks', 'Few. A cluster override is allowed.', 'Pipelines must be marked as not in development. The Git branch must match the target. Cluster overrides are not allowed.'],
          ['Who it is for', 'One developer testing a change.', 'The release.']
        ],
        steps: [
          { upto: 3, say: 'Development mode makes it safe to deploy often. Your copy has your name on it, and it does not fire its trigger on its own.' },
          { upto: 5, say: 'Production mode adds checks instead of conveniences. It refuses a deployment from the wrong branch.' }
        ],
        pick: 'Every engineer deploys to **dev** in **development mode**, as often as they like. Only the pipeline deploys to **prod**, from the main branch.'
      }),

      B.code({
        id: 'm11-resource', t: 2, src: 'docs', title: 'A job as a resource file', file: 'resources/nightly.yml', lang: 'yaml', code: RESOURCE,
        steps: [
          { say: 'The job from mission 9 is a resource in its own file. The field names follow the Jobs API, and the CLI schema check in the verification step confirms them.', lines: null },
          { say: 'The settings of the job: one run at a time, a parameter that takes its default from the variable, and the trigger and the alert.', lines: G.span(RESOURCE, /max_concurrent_runs/, /- data-eng@/) },
          { say: 'The tasks use a serverless **environment**, named here. It sets the version of the serverless environment, and it is where you add libraries.', lines: G.span(RESOURCE, /environments:/, /environment_version/) },
          { say: '`${var.catalog}` is replaced by the value of the target. The same file deploys to dev with `brewline_dev` and to prod with `brewline_prod`.', lines: G.span(RESOURCE, /python_file: \.\.\/src\/ingest_bronze/, /--catalog/) },
          { say: 'Dependencies work as before. Silver depends on bronze.', lines: G.span(RESOURCE, /task_key: upsert_silver/, /depends_on:/) }
        ],
        note: 'The paths are relative to the resource file, so `../src` points at the `src` folder of the bundle. The job on a classic cluster would add a `job_clusters` section. Mission 9 showed it.'
      }),

      B.code({
        id: 'm11-cli', t: 1, src: 'docs', title: 'Four commands', file: 'terminal', lang: 'bash', code: CLI,
        steps: [
          { say: 'You work with a bundle through four CLI commands. These come from the documentation. I did not run them against a workspace.', lines: null },
          { say: '`validate` checks the files against the bundle schema and resolves variables. It does not change anything. Run it in every pull request.', lines: [1, 2] },
          { say: '`deploy` creates or updates the resources in the workspace of the target. In dev mode the names carry your prefix.', lines: [4, 5] },
          { say: '`run` starts a job or pipeline from the bundle and waits for the result. This is how you test a change on real tables.', lines: [7, 8] },
          { say: '`destroy` removes what the bundle created in that target. Use it to clean up a dev copy.', lines: [10, 11] }
        ]
      }),

      B.code({
        id: 'm11-ci', t: 2, src: 'docs', title: 'The release workflow', file: '.github/workflows/ci.yml', lang: 'yaml', code: CI,
        steps: [
          { say: 'This workflow runs the checks on every pull request, and the release on every push to the main branch. It uses GitHub Actions. I checked it against the GitHub workflow schema, and I did not run it.', lines: null },
          { say: '`pull_request` runs the workflow for every change. `push` to `main` runs it after the merge. `id-token: write` lets the job ask GitHub for an identity token, which the next jobs use to sign in.', lines: G.span(CI, /^on:/, /contents: read/) },
          { say: 'The **test** job installs the dependencies and runs pytest. If a test fails, the exit code stops everything after it.', lines: G.span(CI, /^  test:/, /pytest -q/) },
          { say: 'The **validate** job signs in to the dev workspace with the OIDC settings, installs the CLI, and validates the bundle. It changes nothing.', lines: G.span(CI, /^  validate:/, /bundle validate/) },
          { say: 'The **deploy** job runs only on `main`, after validation. `environment: production` lets you require an approval in GitHub. It signs in to the production workspace and deploys the bundle.', lines: G.span(CI, /^  deploy:/, /bundle deploy/) }
        ],
        note: 'The action is shown with `@main` as in the documentation examples. In a real repository, pin it to a release tag. The documentation gives the exact values to set for the OIDC sign-in, so read that page before you copy this.'
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: how does CI sign in to Databricks?',
        scenario: 'The release workflow must deploy to **production**. The security team does not want a secret that lives for months, or anything tied to one engineer. Your company uses **GitHub Actions**.',
        opts: [
          { t: 'A personal access token of a senior engineer, stored as a GitHub secret', d: 'Fast to set up.', lose: 'The token belongs to a person. When they leave, deployments stop, and the token carries all their privileges. It is a long-lived secret in a repository setting.' },
          { t: 'A service principal with a client secret stored in GitHub', d: 'A machine identity, with a secret to rotate.', lose: 'Better than a person. The secret still lives for months, and it must be rotated and kept out of logs. Choose it only where federation is not available.' },
          { t: 'A service principal with workload identity federation (OIDC)', d: 'GitHub proves who the workflow is, and Databricks exchanges that proof for a short-lived token.' }
        ],
        pick: 2,
        why: 'The documentation describes federation for GitHub Actions: you create a federation policy on a service principal that names your repository, and the CLI exchanges the GitHub token for a Databricks token on each run. No secret is stored, so nothing leaks and nothing needs to be rotated. The service principal holds only the privileges the deployment needs.',
        when: 'Use a service principal secret when your CI system cannot issue identity tokens. Store it in the CI secret store, rotate it on a calendar, and give it the smallest privileges.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'docs', title: 'Incident: a deployment undid a hotfix', time: '11:05',
        alert: '**The alert for failed quality checks stopped working after this morning\'s deployment.** Yesterday an engineer fixed the alert recipient in the production job through the workspace UI. Today\'s release redeployed the bundle.',
        clues: ['The production job is defined in a bundle', 'Several people have edit rights on the production job', 'The hotfix was never committed to the repository'],
        opts: [
          { t: 'Put the fix in the bundle file and release it, then remove edit rights so that production changes only through the pipeline', fb: '' },
          { t: 'Make the same edit in the UI again', fb: 'The next deployment undoes it again. The bundle is the source of truth.' },
          { t: 'Stop deploying to production', fb: 'You would lose the benefit of the pipeline because of one process gap.' },
          { t: 'Ask people to announce UI edits in chat', fb: 'It is a habit that breaks the first busy week. A permission cannot be forgotten.' }
        ],
        best: 0,
        why: 'A deployment writes the job from the bundle, so any change made only in the workspace is overwritten. The fix belongs in the repository, where it is reviewed and versioned. To stop it happening again, production objects should be editable only by the service principal that deploys them.',
        checks: [
          ['Compare the job with the bundle', 'The recipient in the file is the old one. The UI had the new one, until the deploy.'],
          ['Check who changed it', 'The audit log shows the UI edit yesterday. Mission 7 covered the audit table.'],
          ['Fix in code', 'Change the recipient in the resource file and open a pull request.'],
          ['Release through the pipeline', 'The check runs, the merge deploys, and the fix is live and versioned.'],
          ['Close the gap', 'Give people view rights on production. Only the deploying service principal may edit.']
        ],
        tell: 'A release overwrote a fix that an engineer had made by hand in the production job, so the quality alert stopped working. The job is defined in a bundle, and a deployment writes it from the files. I put the correct recipient in the resource file and released it through a pull request. To stop it happening again, we gave people view-only access to production objects, so that only the deploying service principal can change them, and every change goes through review.',
        prevent: ['Production changes **only through the pipeline**', '**View-only** rights for people, edit rights for the service principal', 'A rule that a hotfix is a **pull request**, with a fast review', 'A weekly **diff** of deployed settings against the repository']
      }),

      B.qa({
        id: 'qa-test', t: 1, tag: 'Delivery', secs: 60,
        q: 'How do you test PySpark code?',
        pts: ['Put the logic in functions: DataFrame in, DataFrame out', 'pytest with a session-scoped local Spark fixture', 'Small hand-built DataFrames, exact assertions', 'A row that breaks each business rule', 'No reads of production tables in unit tests', 'Run in CI on every pull request'],
        short: 'I keep the transformation logic in functions that take a DataFrame and return one, with no reads or writes inside. Then I test them with pytest and a Spark session that runs locally, with `local[2]` and two shuffle partitions. The fixture has session scope, so Spark starts once.\n\nEach test builds a few rows with the real schema, calls the function, and asserts the exact result. For every business rule I include a row that breaks it. In my example, a test with a cancelled order of $99 caught a misspelled status: the code returned 2 orders and $109 where the test expected 1 and $10.\n\nUnit tests never read production tables, so they are fast and the same everywhere. CI runs them on every pull request, and the exit code stops the merge. On top I add a dry run of the pipeline, an integration run on a copy of the data, and quality rules in production.',
        fu: [
          ['How do you compare two DataFrames?', 'Collect the small result and compare rows, or use `pyspark.testing.assertDataFrameEqual`. Never compare without an order if the result has no order.'],
          ['What about integration tests?', 'Run the job against a dev schema with a shallow clone of the tables it needs, then drop the schema.']
        ],
        trap: 'Testing only that "the job runs". A test must check values, with a row that can fail.',
        real: 'Describe a bug that a test caught and what the failing output looked like.'
      }),

      B.qa({
        id: 'qa-deploy', t: 2, tag: 'Delivery', secs: 90,
        q: 'How do you deploy Databricks code across dev, test and production?',
        pts: ['Code in Git, one pull request for each change', 'A bundle with a target for each environment', 'Variables for catalogs and paths', 'Development mode for personal copies, production mode for the release', 'The pipeline deploys as a service principal, from the main branch', 'Production is changed only by the pipeline'],
        short: 'I keep everything in Git and package the project as a bundle: a `databricks.yml` with one target for each environment, and jobs and pipelines as resource files. Variables carry what differs between environments, such as the catalog.\n\nEvery engineer deploys to dev in development mode, which prefixes names with their user name and pauses triggers, so copies are safe. A pull request runs the unit tests, a bundle validation, and a pipeline dry run. A merge to main deploys to production in production mode, which the documentation says adds checks, for example that the branch matches the target.\n\nThe release runs as a service principal and signs in with workload identity federation, so no long-lived secret is stored. The jobs themselves run as a service principal too. I make production editable only by that identity, so a hand edit cannot undo a release. I know the bundle features from the documentation, and I validated the files against the CLI schema.',
        fu: [
          ['How do you promote between test and prod?', 'The same bundle deploys to each target in turn. A change reaches production only after it passed the checks and a run in the earlier target.'],
          ['Where do secrets go?', 'In a secret scope or the CI secret store, never in the repository. Prefer federation to stored secrets.']
        ],
        trap: 'Describing deployment as "copy the notebooks to the prod workspace". It has no review, no checks and no rollback.',
        real: 'Describe the pipeline of a team you worked in and where a bad change was stopped.'
      }),

      B.qa({
        id: 'qa-ci', t: 2, tag: 'Delivery', secs: 60,
        q: 'What should the CI check of a data pipeline run before a merge?',
        pts: ['Lint and unit tests with local Spark', 'Bundle validation', 'Pipeline dry run', 'Integration run on a cloned dev schema', 'Fast: minutes, not hours', 'Required before merge, with an approval for production'],
        short: 'The check has to be fast and decisive. It runs linting and the unit tests with a local Spark session. It validates the bundle against the CLI schema, which catches typos in settings. It runs a dry run of the pipeline, which resolves every reference without moving data. In my example, a dry run found a misspelled table name in seconds.\n\nFor risky changes I add an integration run in a dev schema that holds shallow clones of the tables, so it uses real data without copying it. The check must be required before a merge, and the deploy to production sits behind an approval in the CI system.\n\nI keep the whole thing under about ten minutes. A slow check gets skipped, and then it protects nobody.',
        fu: [
          ['What do you do about flaky tests?', 'Fix or remove them. A test that fails at random teaches people to ignore failures.'],
          ['Where does data quality go?', 'In the pipeline itself, as expectations or tests on the output, so it runs on every production run.']
        ],
        trap: 'A CI that only runs linting. Code that looks tidy can still return the wrong revenue.',
        real: 'Describe the checks that your team requires before a merge, and one thing they caught.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Release Engineer', color: '#BBF7D0',
        pts: [
          'Put logic in **functions**: DataFrame in, DataFrame out. Test them with **pytest and local Spark**.',
          'The recorded run: **3 passed**. With one typo: **1 failed, 2 passed**, and the diff showed `(2, $109.00)` against `(1, $10.00)`.',
          'A test builds **its own rows**, asserts **exact values** and includes a row that **breaks the rule**.',
          'A **bundle** has resources and **targets**. **Development mode** prefixes names and pauses triggers. **Production mode** adds checks.',
          'A pull request runs **tests, bundle validation and a dry run**. A merge to main deploys.',
          'Deploy as a **service principal** with **OIDC federation**. Change production **only through the pipeline**.'
        ],
        lines: [
          'I test the transformations with a row that breaks each rule.',
          'I validate the bundle and dry-run the pipeline in every pull request.',
          'I let only a service principal change production.'
        ]
      })
    ]
  });
})();
