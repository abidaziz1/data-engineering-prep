/* Mission 11: environments, CI/CD, slim CI, retry, and orchestration. */
(function () {
  var B = LAB.b, G = LAB.get;

  var DEVSQL = G.sql('compiled/slim/dim_customers_dev');

  var GHA = [
    'name: dbt-ci',
    'on:',
    '  pull_request:',
    '    branches: [main]',
    '',
    'env:',
    '  PR_SCHEMA: pr_${{ github.event.number }}',
    '',
    'jobs:',
    '  slim-ci:',
    '    runs-on: ubuntu-latest',
    '    env:',
    '      SNOWFLAKE_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}',
    '      SNOWFLAKE_USER: ${{ secrets.DBT_CI_USER }}',
    '      SNOWFLAKE_PRIVATE_KEY: ${{ secrets.DBT_CI_KEY }}',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-python@v5',
    '        with:',
    "          python-version: '3.12'",
    '      - run: pip install dbt-core dbt-snowflake',
    '      - run: dbt deps',
    '      - name: Fetch the production manifest',
    '        run: aws s3 cp s3://brewline-dbt-artifacts/prod/manifest.json state/manifest.json',
    '      - name: Build what changed, in the PR schema',
    '        run: dbt build --select state:modified+ --defer --state state --target ci',
    '      - name: Drop the PR schema',
    '        if: always()',
    '        run: dbt run-operation drop_schema --args "{name: $PR_SCHEMA}" --target ci'
  ].join('\n');

  var BADCI = [
    '      - run: dbt deps',
    '      - name: Check the change',
    '        run: dbt build --target prod',
    '        env:',
    '          SNOWFLAKE_USER: ${{ secrets.DBT_PROD_USER }}'
  ].join('\n');

  var GSN = G.file('scenario/generate_schema_name.sql');
  var DROP = G.file('scenario/drop_schema.sql');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Environments and CI/CD', short: 'CI/CD', blurb: 'Dev, CI and prod, slim CI with defer, retry and schedulers', minutes: 34,
    focus: ['ci'],
    goals: [
      'Explain **targets** and the schema each one writes to, and override `generate_schema_name`.',
      'Run **slim CI**: build only what changed, **defer** the rest to production.',
      'Read a failed build, fix it and **retry** only what failed.',
      'Choose how to **orchestrate** dbt, and what a pull request pipeline should do.'
    ],
    say: 'Mission 11 is the road from your laptop to production. Anyone can run dbt build on their laptop. Seniors are the people who make sure that every change is built, tested and released the same way, in a place where a mistake costs nothing.',
    scenes: [
      B.talk({
        id: 'm11-talk', t: 1, title: 'Dev, CI and production are three targets',
        say: 'Four points. Press Next for each.',
        items: [
          ['A target is a place to build', 'The profile lists targets. Each one has its own schema, and often its own warehouse and user. The same code builds in different places, and a flag, `--target`, chooses.', 'Same code, different schema.'],
          ['Developers get their own schema', 'Alice builds into `dev_alice`. Bob builds into `dev_bob`. They can break things without touching anyone else or the dashboards.', 'Private space to experiment.'],
          ['CI builds into a temporary schema', 'Every pull request gets a schema that exists for the length of the check and is dropped afterwards.', 'A scratch space per pull request.'],
          ['Only the scheduler builds production', 'Humans do not run production builds by hand. A job with a service identity does it, from the main branch, the same way every time.', 'One path to production.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm11-schema', t: 1, kind: 'schema', title: 'Lab: where does dbt build?' }),

      B.code({
        id: 'm11-gsn', t: 2, title: 'Overriding generate_schema_name', file: 'macros/generate_schema_name.sql', lang: 'jinja', code: GSN,
        steps: [
          { say: 'This macro decides the schema for every model. dbt calls it once per model. If you write a macro with this name, yours wins. Press Next.', lines: null },
          { say: 'It receives the custom schema from your config, such as staging, and the node. Its default is the schema from the profile.', lines: G.span(GSN, /macro generate_schema_name/, /default_schema/) },
          { say: 'In production, use the custom name exactly as written. The marts live in a schema called marts, which BI tools and grants can rely on.', lines: G.span(GSN, /target\.name == 'prod'/, /custom_schema_name \| trim/) },
          { say: 'Anywhere else, ignore the custom name and use the developer\'s schema. Alice\'s whole project lands in one schema, dev_alice, which she can drop in one command.', lines: G.span(GSN, /\{%- else -%\}/, /\{\{ default_schema \}\}/) }
        ],
        note: 'The built-in macro joins the two names, which gave `dev_alice_staging` and `dev_alice_marts`: one schema per layer for every developer. That works, and it clutters the warehouse.'
      }),

      B.flow({
        id: 'm11-flow', t: 1, title: 'Slim CI: build only what changed', g: 'ci', legend: true,
        steps: [
          { say: 'A pull request changes one or two models, but the project has hundreds. Building everything for every pull request wastes time and credits. Slim CI builds only what the change touches. Press Next to follow it.', cap: 'Seven blocks, one idea: compare with production, build the difference.' },
          { say: 'A pull request opens. The CI job starts and checks out the code.', on: ['k1'], focus: ['pr', 'state'], cap: 'The pull request is the unit of review and of testing.' },
          { say: 'The last production run saved its manifest, a description of exactly what production looks like. CI fetches that file.', on: ['k1'], focus: ['pr', 'state'], cap: 'The manifest is a **picture of production**.' },
          { say: 'dbt compares the code in the pull request with that manifest. The selector state:modified+ picks every model that changed, plus everything downstream of it.', on: ['k2'], focus: ['state', 'sel'], cap: 'Changed models **and their children**, because children can break.' },
          { say: 'Only those nodes are built, into a schema created for this pull request, such as pr_123.', on: ['k3'], focus: ['sel', 'bld'], cap: 'Production is **never written**.' },
          { say: 'But the changed models read other models that were not selected. With defer, those references point at the production tables instead of at missing dev tables.', on: ['k4'], tags: ['tg_defer'], focus: ['prod', 'bld'], cap: 'Defer is how a **partial build** works.' },
          { say: 'The tests on the built nodes run. Their result becomes the status check on the pull request.', on: ['k5'], focus: ['bld', 'chk'], cap: 'A red check blocks the merge.' },
          { say: 'After the merge, the production job runs, saves a new manifest, and the pull request schema is dropped.', on: ['k6'], focus: ['chk', 'mrg'], cap: 'The cycle repeats with a fresh picture of production.' }
        ]
      }),

      B.term({
        id: 'm11-ls', t: 1, title: 'What did my change touch?',
        say: 'I added a first_name column to the customers staging model. Then I asked dbt which models it counts as changed, with the production manifest in the state folder.',
        lines: function () { return G.term('slim_ls'); },
        after: 'Two models: the one I edited and its child `dim_customers`. The other eight models are untouched, so a pull request build does not need them.',
        afterKind: 'tip',
        doneSay: 'This command costs nothing and tells you what CI will build. Run it before you push.'
      }),

      B.term({
        id: 'm11-nodefer', t: 1, title: 'Building the changed models, without defer', g: 'dag',
        say: 'Now I build exactly those models in my empty developer schema, without the defer flag. Watch what happens.',
        initial: G.wait('dag'),
        lines: function () { return G.term('slim_nodefer'); },
        after: 'The view for customers was built. Then a **test failed with an error** that has nothing to do with my change: it needs `stg_brewline__orders`, which exists in production and not in my empty schema. Everything after it was skipped.',
        afterKind: 'warn',
        doneSay: 'A partial build needs a place to find the rest. Defer is that place.'
      }),

      B.term({
        id: 'm11-defer', t: 1, title: 'The same build, with defer', g: 'dag',
        say: 'Same selection, same empty developer schema, with the defer flag and the production manifest. Watch the graph.',
        initial: G.wait('dag'),
        lines: function () { return G.term('slim_defer'); },
        after: 'Only **two models** were built. Ten nodes passed, including eight tests, and nothing failed. Everything else was read from production.',
        afterKind: 'tip',
        doneSay: 'Two models, eight tests, a few seconds. On a real project this is the difference between a 40-minute check and a 2-minute one.'
      }),

      B.code({
        id: 'm11-defersql', t: 1, title: 'What defer really does to the SQL', file: 'target/compiled/brewline/.../dim_customers.sql', lang: 'sql', code: DEVSQL,
        steps: [
          { say: 'This is the compiled dim_customers from that run. It mixes two places. Press Next.', lines: null },
          { say: 'The customers come from my developer schema. This is the model I changed, so I built it here.', lines: G.span(DEVSQL, /dev_alice_staging/) },
          { say: 'The country names come from production. I did not build the seed, so defer sent the reference to the production schema.', lines: G.span(DEVSQL, /analytics_reference\.country_names|"analytics_reference"/) },
          { say: 'And the orders also come from production, for the same reason.', lines: G.span(DEVSQL, /"analytics_staging"\."stg_brewline__orders"/) }
        ],
        note: 'This is why CI should defer only to a **stable** production state. If production is half-built, your check reads half-built data. Run the production job on a schedule that keeps the manifest fresh.'
      }),

      B.term({
        id: 'm11-none', t: 2, title: 'When nothing changed',
        say: 'What does the CI job say when a pull request touches only a README? Here is the real output of the same command with no model changes.',
        lines: function () { return G.term('slim_none'); },
        after: 'dbt says **nothing to do** and warns that the selection matched nothing. The job should treat this as success. A warning at the start of a pipeline is a normal day for docs-only changes.',
        afterKind: 'tip',
        doneSay: 'No change, no cost, no red check.'
      }),

      B.code({
        id: 'm11-gha', t: 1, title: 'A pull request pipeline', file: '.github/workflows/dbt-ci.yml', lang: 'yaml', code: GHA,
        steps: [
          { say: 'This workflow runs slim CI on every pull request. It is written for Snowflake and GitHub Actions. The dbt commands are the ones that ran in this course. The cloud pieces are illustrative. Press Next.', lines: null },
          { say: 'The trigger: every pull request into main. And a schema name built from the pull request number, so two checks never collide.', lines: G.span(GHA, /^on:/, /PR_SCHEMA/) },
          { say: 'The credentials come from the secret store, never from the repository. CI has its own user, key and role with rights only on its own schemas.', lines: G.span(GHA, /SNOWFLAKE_ACCOUNT/, /SNOWFLAKE_PRIVATE_KEY/) },
          { say: 'Install dbt and its packages. Pin the versions in a real project, so a new release cannot turn a pull request red by itself.', lines: G.span(GHA, /pip install dbt-core/, /run: dbt deps/) },
          { say: 'Download the production manifest from where the production job stores it, and put it in the state folder.', lines: G.span(GHA, /Fetch the production manifest/, /aws s3 cp/) },
          { say: 'The heart of it: build the modified models and their children, deferring everything else to production, into the CI target.', lines: G.span(GHA, /Build what changed/, /--target ci/) },
          { say: 'Always drop the pull request schema, even when the build failed. The macro for it is the one from this course, shown on a later screen.', lines: G.span(GHA, /Drop the PR schema/, /--target ci/) }
        ],
        note: 'Pin `dbt-core` and the adapter, store the production manifest in a place the CI user can read, and give CI its own warehouse so it cannot slow production.'
      }),

      B.bug({
        id: 'm11-bug', t: 1, q: 'This is the build step of a pull request pipeline. Reviewers say it is dangerous. Click the line that is the problem.',
        file: '.github/workflows/dbt-ci.yml', lang: 'yaml', code: BADCI, bad: [G.at(BADCI, /--target prod/), G.at(BADCI, /DBT_PROD_USER/)],
        hint: 'Which environment does a pull request build into?',
        why: 'A pull request is **unreviewed code**. This step builds it with the production target and the production user, so before anyone approves the change, it replaces production tables. Pull request builds belong in a CI target and a CI schema, with a user that has no rights on production.',
        fix: '      - run: dbt deps\n      - name: Check the change\n        run: dbt build --select state:modified+ --defer --state state --target ci\n        env:\n          SNOWFLAKE_USER: ${{ secrets.DBT_CI_USER }}',
        cheer: 'The credentials in a pipeline define the blast radius of a bad change.'
      }),

      B.term({
        id: 'm11-fail', t: 1, title: 'A production build fails', g: 'dag',
        say: 'Now a real failure. I introduced a typo in a column name of dim_customers and ran the production build. Watch which blocks turn red, and which turn gray.',
        initial: G.wait('dag'),
        lines: function () { return G.term('build_fail', { cmd: 'dbt build --target prod' }); },
        after: 'One model **errored**: dim_customers. Its four tests were **skipped**, and so was the relationship test on `fct_orders` that depends on it. Everything else in the project built normally. The error message names the model, the problem (`Values list "n" does not have a column named "country_title"`) and the compiled file.',
        afterKind: 'warn',
        doneSay: 'A failure spreads only along the arrows. The rest of the project keeps going.'
      }),

      B.term({
        id: 'm11-retry', t: 1, title: 'dbt retry: run only what failed', g: 'dag',
        say: 'I fixed the typo. Now I do not rebuild the whole project. The retry command reads the results of the last run and runs only what failed or was skipped.',
        initial: G.wait('dag'),
        lines: function () { return G.term('retry'); },
        after: 'Six nodes ran: the repaired model and its **five** tests. The thirty-five healthy nodes were left alone. In a large project this turns an hour into a minute.',
        afterKind: 'tip',
        doneSay: 'Retry works because the last run left its results behind. Do not clean the target folder between a failure and a retry.'
      }),

      B.code({
        id: 'm11-drop', t: 2, title: 'Cleaning up the pull request schema', file: 'macros/drop_schema.sql', lang: 'jinja', code: DROP,
        steps: [
          { say: 'CI needs to drop its schema when it finishes. A macro can do it, and run-operation can call a macro from the command line. Press Next.', lines: null },
          { say: 'The query: drop the schema if it exists, with everything in it. The schema name is quoted by the adapter, so odd characters cannot break the statement.', lines: G.span(DROP, /run_query/) },
          { say: 'And a log line, so the pipeline output says what happened.', lines: G.span(DROP, /log\(/) }
        ],
        note: 'Be careful: this deletes things. Restrict it with the CI user\'s rights, so it can only drop schemas whose name starts with `pr_`. I ran it in dev: the real log said `' + G.log('drop_schema').split('\n').filter(function (l) { return /dropped/.test(l); })[0].replace(/^\d\d:\d\d:\d\d\s+/, '') + '`.'
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'Why does a pull request build into its **own schema**?',
        opts: [
          { t: 'So an unreviewed change cannot overwrite production tables or another developer\'s work', fb: '' },
          { t: 'Because dbt cannot build into the production schema from CI', fb: 'It can, and that is exactly the danger.' },
          { t: 'Because schemas are free and tables are not', fb: 'Cost is not the reason. Safety is.' },
          { t: 'To make the build run faster', fb: 'Speed does not depend on the schema name.' }
        ],
        ok: 0, why: 'Code that has not been reviewed must not write to anything the business reads. A temporary schema per pull request gives the check a safe place to build and test, and it is dropped afterwards.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'What does the `--defer` flag (with `--state`) do?',
        opts: [
          { t: 'For models that are not built in your target, it points references at the version in the state manifest, usually production', fb: '' },
          { t: 'It postpones the whole run until the warehouse is idle', fb: 'It has nothing to do with time.' },
          { t: 'It skips the tests', fb: 'Tests still run on the nodes that are built.' },
          { t: 'It copies production tables into your schema', fb: 'It copies nothing. It only changes which relation a reference points to.' }
        ],
        ok: 0, why: 'Defer lets you build one model without building its parents. Their references resolve to the production tables found in the state manifest. No data is copied, and nothing in production is written.'
      }),

      B.quiz({
        id: 'm11-q3', t: 2,
        q: 'What does `state:modified+` select?',
        opts: [
          { t: 'Nodes whose code or config differs from the state manifest, plus all their descendants', fb: '' },
          { t: 'Only the files you edited in the last commit', fb: 'It compares with the manifest, not with git history.' },
          { t: 'Everything that failed in the last run', fb: 'That is the result:error selector.' },
          { t: 'All models that have tests', fb: 'It has no link to tests.' }
        ],
        ok: 0, why: 'dbt compares each node with the same node in the state manifest. A node counts as modified when its SQL, its config or similar properties differ. The plus adds the descendants, because a change can break a child even when the child itself did not change.'
      }),

      B.order({
        id: 'm11-ord', t: 1, q: 'Put a pull request pipeline in order.',
        items: [
          'The pull request opens and the pipeline checks out the code',
          'dbt packages are installed with dbt deps',
          'The production manifest is fetched into the state folder',
          'dbt build runs the changed models and their children in a pull request schema, deferring the rest',
          'The result becomes a status check on the pull request',
          'The pull request schema is dropped, even if the build failed'
        ],
        why: 'Check out, install, fetch the picture of production, build the difference, report, clean up. The cleanup runs in a step that always executes, so failed builds do not leave schemas behind.'
      }),

      B.cmp({
        id: 'm11-orch', t: 2, title: 'Where to run dbt: schedulers compared',
        say: 'Interviewers ask what you ran dbt with. Press Next to compare the common choices.',
        cols: ['Option', 'What it is', 'Good for', 'Watch out for'],
        hl: 2,
        rows: [
          ['dbt platform jobs', 'The hosted service from dbt Labs, with scheduled and CI jobs', 'Teams that want one product for IDE, jobs, docs and alerts', 'Subscription cost, and orchestration beyond dbt lives elsewhere'],
          ['GitHub Actions or cron', 'A workflow or cron line that calls dbt', 'Small teams and simple schedules', 'You build retries, alerting and dependencies between jobs yourself'],
          ['Airflow', 'A general scheduler. Packages such as Cosmos can show each dbt model as a task', 'Companies that already orchestrate many tools and need dbt after a load', 'Running dbt as one big task hides the graph; one task per model is heavy'],
          ['Dagster', 'An orchestrator that reads a dbt project and shows models as assets', 'Teams that think in data assets and want lineage across tools', 'A new framework to learn and operate'],
          ['The warehouse itself', 'The warehouse runs dbt, for example Snowflake with dbt Projects on Snowflake', 'Teams that want no external runner', 'Newer; check the supported dbt versions and features first']
        ],
        steps: [
          { upto: 2, say: 'The hosted platform and the plain scheduler. One is a product, the other is a build-it-yourself.' },
          { upto: 4, say: 'The orchestrators. They matter when dbt is one step in a larger flow, such as load, then transform, then publish.' },
          { upto: 5, say: 'And the warehouse itself. The last row was moving at the time of writing, so confirm the status before you pick it.' }
        ],
        pick: 'Pick what the team already runs and can operate. **Airflow or Dagster** if dbt follows loads from other systems, **GitHub Actions or cron** for a small project, **the hosted platform** if you want to give up the plumbing.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, title: 'Incident: the 03:00 production build failed', time: '03:14',
        alert: 'The 03:00 production job ended with **ERROR=1 SKIP=6**. The finance dashboard refreshes at 06:00. The error is in `dim_customers`: `Binder Error: Values list "n" does not have a column named "country_title"`.',
        clues: ['A pull request merged yesterday at 22:10 touched dim_customers', 'Its check was green, but on an earlier commit', 'fct_orders and fct_daily_revenue built fine'],
        opts: [
          { t: 'Read the first error and the compiled file, fix or revert the change, then run dbt retry', fb: '' },
          { t: 'Run the full production build again', fb: 'It will fail the same way and cost another full run.' },
          { t: 'Delete the failing model so the job passes', fb: 'Its children and the dashboard would break for good.' },
          { t: 'Wake everyone and rebuild all tables by hand', fb: 'Too wide and too slow. The problem is one model.' }
        ],
        best: 0,
        why: 'The log has the cause in one line and the path of the compiled SQL. Because dbt skips only what depends on the failed model, the damage is small, and `dbt retry` rebuilds just the failed and skipped nodes after the fix.',
        checks: [
          ['Read the first red line', 'The error names the model, the column and the compiled file. Ignore the long list of skips below it.'],
          ['Find the change', 'git log on dim_customers: the merge at 22:10 changed the column read from the country seed to one that does not exist.'],
          ['Why was CI green?', 'The check ran on the second-to-last commit. A final cleanup commit was pushed after it, and the merge button stayed enabled because branch protection did not require a fresh check.'],
          ['Fix and retry', 'Revert or correct the column name, then run `dbt retry`. Only dim_customers and its tests run.'],
          ['Confirm before 06:00', 'Check that the children built, and that the dashboard\'s source table is current.']
        ],
        tell: 'The 03:00 production build failed in one model, dim_customers, and skipped its tests and one relationship test. I read the first error, which named a column that does not exist, from a merge the evening before. The pull request check had been green, but on the commit before the last one, and branch protection had not asked for a fresh check. I corrected the column, ran dbt retry, and only the failed model and its tests ran. The dashboard was current by 03:40.',
        prevent: ['Require the check to pass on the **latest commit**, with the branch **up to date** with main, or use a merge queue', 'Run a **full build on main** after merge and **alert** on failure', 'Keep the **production manifest fresh**, so deferral compares against the real state', 'Page the **owner of the failing model**, from the group and owner settings']
      }),

      B.decide({
        id: 'm11-dec', t: 2, title: 'Decision: how should pull requests be checked?',
        scenario: 'The project has **400 models**. A full `dbt build` takes **40 minutes** and costs about **12 credits**. The team merges **25 pull requests a day**.',
        opts: [
          { t: 'Full build on every pull request', d: 'The safest check. Everything is rebuilt and tested.', lose: '25 times 12 credits is 300 credits a day, and developers wait 40 minutes for every push. They stop pushing small changes.' },
          { t: 'Slim CI: build changed models and their children, defer the rest', d: 'Minutes per check, and a few credits.' },
          { t: 'No CI. Test in production after the merge', d: 'No waiting.', lose: 'Every mistake lands on the dashboards first. The cost of one bad morning is higher than the CI bill.' }
        ],
        pick: 1,
        why: 'Slim CI checks the part of the project the change can affect, and trusts production for the rest. Developers get an answer in minutes, and the bill stays small. Add a **full build of main** every night, so any gap in slim CI shows up the next morning.',
        when: 'If production is often broken or the manifest is old, deferral reads bad data and slim CI misleads. Fix that first, or use a full build for risky changes such as a macro or a package upgrade.'
      }),

      B.qa({
        id: 'qa-cicd', t: 1, tag: 'CI/CD', secs: 75,
        q: 'Describe how a dbt change gets from a developer\'s laptop to production.',
        pts: ['Developer works in a personal schema on a branch', 'Pull request triggers CI: build the changed models and their children in a temporary schema', 'Tests must pass and a reviewer approves', 'Merge to main triggers the production job with dbt build', 'Production job saves the manifest for the next CI run', 'Monitoring and alerts on failures and freshness'],
        short: 'A developer works on a branch and builds into a personal schema, for example dev_alice, so nothing they try touches the dashboards. When they open a pull request, CI runs. It fetches the manifest of the last production run, selects the changed models and everything downstream with state:modified+, and builds and tests them in a temporary schema for that pull request, deferring all other references to production. The pull request cannot merge while that check is red, and a reviewer reads the diff.\n\nAfter merge, the scheduler runs the production job with dbt build from main. The same command, a service identity, and the production target. The job stores the new manifest, so the next pull request compares against the real state of production. Source freshness runs as its own job, and failed runs alert the owner of the failing model.\n\nThe pull request schema is dropped at the end of the CI job, even when it failed.',
        fu: [
          ['How do you handle secrets?', 'In the CI secret store or a vault, read through environment variables in the profile. Nothing sensitive lives in the repository, and CI has its own user with narrow rights.'],
          ['What if the production manifest is stale?', 'Slim CI would compare against an old picture, so I refresh it on every production run, and I run a full build of main nightly to catch drift.']
        ],
        trap: 'Describing only "we have GitHub Actions". The answer needs the path: branch, schema, check, review, merge, production job, monitoring.',
        real: 'Describe your own pipeline: tools, how long CI takes, and one change it stopped.'
      }),

      B.qa({
        id: 'qa-slimci', t: 2, tag: 'CI/CD', secs: 90,
        q: 'How do you run only what changed in CI, and what can go wrong?',
        pts: ['Save the production manifest after each production run', 'dbt build --select state:modified+ --defer --state <folder>', 'Children are included because they can break', 'Defer points unbuilt references at production', 'Risks: stale or half-built production, changes that state does not detect', 'Backstops: nightly full build, rebuild seeds and macros changes fully'],
        short: 'The production job saves its manifest.json to a shared location after every run. In CI I download it to a state folder and run dbt build with --select state:modified+, --defer and --state pointing at that folder, into a schema for the pull request. dbt compares each node with the manifest, so it selects models whose code or config changed, plus everything downstream, because a child can break even when its own file did not change. Defer makes references to unbuilt models resolve to production, so I do not need to build the whole project.\n\nWhat can go wrong: the manifest can be stale, so I refresh it on every production run. Production can be half built, so CI reads bad data. Some changes are not caught by state comparison alone, for example a change to a macro or a package version, so for those I run a full build. And a seed that CI did not build is read from production, which hid a missing column in one of my incidents.\n\nTo cover the gaps I run a full build of main every night and alert on failure.',
        fu: [
          ['What does --favor-state do?', 'It makes dbt prefer the relation in the state manifest over one in your target when both exist. Useful when your dev schema has old copies of models. Check the documentation for the exact behavior.'],
          ['How do you know CI built the right nodes?', 'Run dbt ls with the same selector first. The list is the set CI will build.']
        ],
        trap: 'Saying slim CI is "free". It trades coverage for speed, and you must plan the backstop.',
        real: 'Give a case where slim CI missed something, what caught it, and what you changed.'
      }),

      B.qa({
        id: 'qa-orch', t: 2, tag: 'CI/CD', secs: 75,
        q: 'How would you orchestrate dbt, and what would you consider when choosing the tool?',
        pts: ['What already runs: Airflow, Dagster, GitHub Actions, the hosted platform', 'Dependencies on loads: dbt should start after the data arrives', 'Granularity: one task for the whole project or one per model', 'Retries and alerts, including dbt retry', 'Cost and who operates it', 'Separate jobs for freshness, models and docs'],
        short: 'I start from what the team already operates, because a scheduler nobody knows how to run is a liability. If loads and other tools already run in Airflow or Dagster, dbt should run there too, started when the data lands, so I do not poll a clock. For a small team with only dbt, a scheduled GitHub Actions workflow or the hosted platform is enough.\n\nThen granularity. One task that runs dbt build for the project is simple, but a retry reruns everything unless I use dbt retry. One task per model gives fine control, but it is heavy and slow to start. A middle path is a task per job or per tag.\n\nI separate jobs: source freshness runs on its own and alerts even when nothing builds, the main build uses dbt build so tests sit between models, and the docs refresh on merge. Every job has retries, a timeout, an owner for the alert, and a service identity with narrow rights.',
        fu: [
          ['Why not run dbt on a fixed time every night?', 'If the load is late, dbt builds on old data and everything passes. Starting from the load completing, or checking freshness first, avoids that.'],
          ['How do you test the orchestration itself?', 'Run the job against a CI target, check that failure alerts arrive, and rehearse a retry after a forced failure.']
        ],
        trap: 'Naming a tool with no reason. Say what you would check about the team and the data before you choose.',
        real: 'Describe your scheduler, how dbt is triggered, and what happens when a load is late.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Release Captain', color: '#C7D2FE',
        pts: [
          'A **target** is a place to build. Developers, CI and production each get their own **schema**.',
          '`generate_schema_name` decides the schema. Override it so dev lands in one schema.',
          '**Slim CI**: `state:modified+`, `--defer`, `--state`. Build the change, read the rest from production.',
          'After a failure, fix the first error and use **`dbt retry`**. Only failed and skipped nodes run.',
          'Choose the **scheduler** the team already runs. Separate jobs for freshness, models and docs.'
        ],
        lines: [
          'Pull requests never build with the production target.',
          'I keep the production manifest fresh, because slim CI depends on it.',
          'After a failure I read the first error, not the last.'
        ]
      })
    ]
  });
})();
