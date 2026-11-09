/* Mission 5: dev, CI and production in one account, clones and deferral. */
(function () {
  var B = LAB.b, G = LAB.get;

  var GSN = G.file('macros/generate_schema_name.sql');
  var PROJECT = G.file('dbt_project.yml');
  var CLONE = G.script('clone_to_ci', /^(create schema|create or replace\s+transient)/);
  var DROP_MACRO = G.file('scenario/drop_pr_schema.sql');
  var DROP_STMT = G.stmt('ci_cleanup', /^drop schema/);
  var GUARD = G.text('ci_cleanup_guard');
  G.expect(/clone BREWLINE\.marts\.fct_orders/.test(CLONE.replace(/\s+/g, ' ')), 'the clone statement names the production table');
  G.expect(/BREWLINE\.staging\.stg_brewline__customers/.test(G.stmt('ci_defer', /^create or replace transient table \S*dim_customers\s/)), 'a deferred run reads its parents from production');

  var CI = [
    'name: dbt pull request check',
    'on:',
    '  pull_request:',
    'concurrency:',
    '  group: dbt-pr-${{ github.event.number }}',
    '  cancel-in-progress: true',
    'env:',
    '  SNOWFLAKE_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}',
    '  SNOWFLAKE_USER: ${{ secrets.SNOWFLAKE_CI_USER }}',
    '  SNOWFLAKE_PRIVATE_KEY_PATH: /tmp/ci_key.p8',
    '  PR_NUMBER: ${{ github.event.number }}',
    'jobs:',
    '  check:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-python@v5',
    '        with:',
    "          python-version: '3.12'",
    '      - run: pip install dbt-snowflake==' + G.meta('dbt-snowflake'),
    '      - name: Write the CI key to a file',
    '        env:',
    '          CI_KEY: ${{ secrets.SNOWFLAKE_CI_PRIVATE_KEY }}',
    '        run: |',
    '          printf \'%s\\n\' "$CI_KEY" > "$SNOWFLAKE_PRIVATE_KEY_PATH"',
    '          chmod 600 "$SNOWFLAKE_PRIVATE_KEY_PATH"',
    '      - run: dbt deps',
    '      - run: dbt parse --target ci',
    '      - name: Get the production manifest',
    '        run: ./ci/fetch_prod_manifest.sh state',
    '      - name: Build what changed, and read the rest from production',
    '        run: dbt build --target ci --select state:modified+ --defer --state state',
    '      - name: Drop the pull request schema',
    '        if: always()',
    '        run: dbt run-operation drop_pr_schema --target ci'
  ].join('\n');
  var CIBUG = CI.replace('dbt build --target ci --select', 'dbt build --select');
  var CIPROFILE_NOTE = 'The profile on the runner has `target: prod` as its default.';

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Environments, clones and CI', short: 'Environments', blurb: 'Dev, CI and production in one account', minutes: 36,
    focus: ['ci'],
    goals: [
      'Explain how one project lands in **three places**, and what `generate_schema_name` does.',
      'Use a **zero-copy clone** and **defer** to make a pull request check fast and cheap.',
      'Write a CI workflow that **cleans up** after itself, and a guard that stops it from touching production.',
      'Say which **role** and **warehouse** each environment uses, and why they differ.'
    ],
    say: 'Mission 5 is about keeping three copies of the pipeline apart. A developer must be free to break things. A pull request must be checked without touching production. Production must only change through the scheduler. Snowflake gives you the tools: databases, roles and clones. dbt gives you targets.',
    scenes: [
      B.flow({
        id: 'm5-flow', t: 1, title: 'Three environments in one account', g: 'envs', legend: true,
        steps: [
          { say: 'One Snowflake account holds all three environments. Each has its own database, role and warehouse. Press Next to see how they connect.', cap: 'Same project, three targets.' },
          { say: 'All three read the same RAW tables. RAW is loaded once by the pipeline, and no environment writes to it.', on: ['v1', 'v2', 'v3'], focus: ['raw', 'dev', 'ci', 'prod'], cap: 'One copy of the raw data.' },
          { say: 'A developer builds into a private schema in BREWLINE_DEV. They use their own schema, so two developers never overwrite each other.', focus: ['dev'], tags: ['tg_own'], cap: 'A schema per developer.' },
          { say: 'Production lives in BREWLINE. Only the scheduler writes there, with the TRANSFORMER role and the production warehouse.', focus: ['prod'], cap: 'Only the scheduler writes here.' },
          { say: 'A pull request check builds into BREWLINE_CI, in a schema named after the pull request. To test against realistic tables, it clones some production tables into that schema.', on: ['v4'], focus: ['prod', 'ci'], tags: ['tg_clone'], cap: 'A clone shares storage with the original until something changes.' }
        ]
      }),

      B.widget({ id: 'm5-lab', t: 1, kind: 'targets', title: 'Lab: where does it land?' }),

      B.code({
        id: 'm5-gsn', t: 1, title: 'The macro that decides the schema', file: 'macros/generate_schema_name.sql', lang: 'jinja', code: GSN,
        steps: [
          { say: 'Every model has a schema setting, such as `staging` or `marts`. This macro decides the real schema name. dbt calls it once per model. Press Next.', lines: null },
          { say: 'By default dbt adds the custom name to the target schema, which gives names like DEV_ALICE_STAGING. This version replaces that rule.', lines: G.span(GSN, /default_schema/, /default_schema/) },
          { say: 'On the prod target, a custom schema name is used as it is: `staging`, `intermediate`, `marts`. That is what the recorded production run shows.', lines: G.span(GSN, /target.name == 'prod'/, /custom_schema_name \| trim/) },
          { say: 'On every other target, all models land in the one schema of the target: DEV_ALICE for a developer, PR_123 for a pull request.', lines: G.span(GSN, /else/, /default_schema \}\}/) }
        ],
        note: 'Because non-production targets ignore the custom names, a developer or a pull request can never write into `BREWLINE.MARTS` by accident. The role is a second guard. Keep both.'
      }),

      B.code({
        id: 'm5-proj', t: 1, title: 'Where the custom names come from', file: 'dbt_project.yml', lang: 'yaml', code: PROJECT,
        steps: [
          { say: 'The custom schema names are set by layer in the project file. Press Next.', lines: null },
          { say: 'Staging models are views in a schema called staging. Intermediate models are views in intermediate. Marts are tables in marts.', lines: G.span(PROJECT, /^    staging:/, /\+schema: marts/) },
          { say: 'Seeds go to a schema called reference.', lines: G.span(PROJECT, /^seeds:/, /\+schema: reference/) }
        ],
        note: 'In production these became BREWLINE.STAGING, BREWLINE.INTERMEDIATE, BREWLINE.MARTS and BREWLINE.REFERENCE. In dev and CI they all collapse into one schema.'
      }),

      B.code({
        id: 'm5-clone', t: 1, title: 'A clone gives CI a realistic table', file: 'dbt clone --select fct_orders dim_customers --state state --target ci', lang: 'sql', code: CLONE,
        steps: [
          { say: 'These are the statements that dbt clone sent for a pull request, as recorded. The state folder held the production manifest. Press Next.', lines: null },
          { say: 'First the schema of the pull request. If a check runs twice, the second run finds it.', lines: G.span(CLONE, /^create schema/, /^create schema/) },
          { say: 'Then one statement for each table. The table in the pull request schema is a clone of the production table: `clone BREWLINE.marts.fct_orders`.', lines: G.span(CLONE, /^create or replace/, /clone BREWLINE\.marts\.fct_orders/) },
          { say: 'A clone is a metadata operation. It points at the same stored data as the original, so it is created in seconds and adds almost no storage. Storage grows only where the clone or the original changes.', lines: null }
        ],
        note: 'A clone needs a warehouse only for the statement itself, which is tiny. That makes a clone the cheapest way to give an incremental model a realistic table to merge into. The behavior of clones comes from Snowflake\'s documentation. dbt\'s statements are recorded.'
      }),

      B.code({
        id: 'm5-clean', t: 1, title: 'Cleaning up, with a guard', file: 'macros/drop_pr_schema.sql', lang: 'jinja', code: DROP_MACRO,
        compiled: { label: 'What dbt sends on the ci target', file: 'sent to Snowflake', code: DROP_STMT },
        steps: [
          { say: 'Every pull request schema must disappear when the check ends. This macro does it. Press Next.', lines: null },
          { say: 'The first lines are the guard. If the target is not ci, the macro stops with an error and drops nothing.', lines: G.span(DROP_MACRO, /target.name != 'ci'/, /endif/) },
          { say: 'The drop statement uses the database and schema of the target. For pull request 123, that is BREWLINE_CI.PR_123.', lines: G.span(DROP_MACRO, /run_query/, /run_query/) },
          { say: 'This is what dbt sent on the ci target. One statement, and `cascade` removes everything in the schema.', compiled: true, lines: G.span(DROP_MACRO, /run_query/, /run_query/), clines: [1, 1] }
        ],
        note: 'I also ran it on the prod target. dbt stopped with: "' + GUARD + '". No statement reached Snowflake. A guard in the macro is cheap, and a role without drop rights on production is the real protection.'
      }),

      B.code({
        id: 'm5-ci', t: 1, title: 'A pull request check, step by step', file: '.github/workflows/dbt-pr.yml (written by hand, not recorded)', lang: 'yaml', code: CI,
        steps: [
          { say: 'This workflow checks one pull request. Press Next to read it from the top.', lines: null },
          { say: 'Only one check per pull request runs at a time. A new push cancels the old run, so credits do not pile up.', lines: G.span(CI, /^concurrency:/, /cancel-in-progress/) },
          { say: 'The connection comes from repository secrets and the pull request number. The profile reads them with `env_var()`.', lines: G.span(CI, /^env:/, /PR_NUMBER/) },
          { say: 'The CI key becomes a file for the duration of the job. The step never prints it.', lines: G.span(CI, /Write the CI key/, /chmod 600/) },
          { say: '`dbt parse` runs first. It opens no connection, so a broken project fails in seconds, before any credit is used.', lines: G.span(CI, /dbt parse/, /dbt parse/) },
          { say: 'Then the production manifest comes in as the state. Selecting `state:modified+` builds the changed models and their children. `--defer` reads everything else from production.', lines: G.span(CI, /Get the production manifest/, /--defer/) },
          { say: 'The last step runs even when the build fails. It drops the pull request schema, using the guarded macro.', lines: G.span(CI, /Drop the pull request schema/, /drop_pr_schema/) }
        ],
        note: 'How the production manifest reaches the runner is your choice: an artifact store, a bucket, or the last successful run. Keep it fresh, because a stale manifest selects the wrong models.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: CIPROFILE_NOTE + ' Production tables change every time this workflow runs. Click the line that causes it.',
        file: '.github/workflows/dbt-pr.yml', lang: 'yaml', code: CIBUG, bad: G.at(CIBUG, /dbt build --select/),
        hint: 'Look at which target each dbt command uses.',
        why: 'The build line has no `--target ci`. dbt then uses the default target of the profile, and on this runner that is **prod**. The check built the pull request against production, and with the default schema rules it replaced real tables. `dbt parse` has the flag, which hides the mistake, because parsing never touches the warehouse.',
        fix: CI,
        cheer: 'Check the flag on every command, including the ones after the first.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put a pull request check in order.',
        items: [
          'Parse the project, with no connection',
          'Fetch the production manifest as the state',
          'Build the changed models and their children into the pull request schema, deferring the rest to production',
          'Run the tests on what was built',
          'Drop the pull request schema, even if a step failed'
        ],
        why: 'Parse first because it is free. Then build only what changed. Clean up last, and always. A cleanup step that runs only on success leaves a schema behind after every failure.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'The pull request check uses the role CI_DEPLOYER, not TRANSFORMER. Why?',
        opts: [
          { t: 'CI_DEPLOYER can create objects in BREWLINE_CI and has no privileges on BREWLINE, so a mistake cannot reach production', fb: '' },
          { t: 'TRANSFORMER is slower than CI_DEPLOYER', fb: 'Roles do not change speed. They change what a session may do.' },
          { t: 'CI_DEPLOYER is the only role that can use a warehouse', fb: 'Any role with usage on a warehouse can use it.' },
          { t: 'Snowflake requires a separate role per environment', fb: 'It is a design choice. Snowflake does not require it.' }
        ],
        ok: 0, why: 'The role is the real guard. Even if someone points CI at production by mistake, the statements fail because the role has no write privileges there. Names in a macro are a convenience. Privileges are the control.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, title: 'Decision: how should CI test an incremental model?',
        scenario: 'A pull request changes the merge logic of `fct_orders`, a **2 TB** incremental model. CI must show that the **incremental path** works, as well as the first-run path. Each check should finish in minutes and stay cheap.',
        opts: [
          { t: 'Build fct_orders from scratch in the pull request schema', d: 'Simple, and it needs nothing from production.', lose: 'It rebuilds 2 TB for every push, and it tests only the first-run path, because there is no existing table to merge into.' },
          { t: 'Use defer only', d: 'dbt reads the parents from production.', lose: 'The model itself does not exist in the pull request schema, so dbt builds it from scratch there. The incremental path is still untested.' },
          { t: 'Clone the production fct_orders into the pull request schema, then run the model incrementally', d: 'An existing table appears in seconds.' }
        ],
        pick: 2,
        why: 'The incremental path needs an existing table. A clone gives CI a copy of production in seconds, with no extra storage until the merge changes rows. The run then takes the real incremental path, against real-sized data, and production stays untouched.',
        when: 'For views and small tables, defer alone is enough. For incremental models whose logic changed, clone first.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, title: 'Incident: a pull request check emptied a production table', time: '14:20',
        alert: 'The finance dashboard shows no data. `fct_orders` in **BREWLINE.MARTS** has no rows since 14:05. A CI run started at 14:04.',
        clues: ['The CI workflow was edited at 13:50', 'The CI service user can use the TRANSFORMER role', 'Nothing else wrote to the table'],
        opts: [
          { t: 'Restore the table as it was before 14:04, then fix the CI target and role', fb: '' },
          { t: 'Wait for the nightly job to rebuild it', fb: 'The dashboard stays empty until then, and the nightly build may not repeat the damage but will not explain it.' },
          { t: 'Delete the pull request and move on', fb: 'It leaves the table empty and the cause in place.' },
          { t: 'Give finance a copy of last week\'s export', fb: 'It hides the problem for one report. Every other consumer still reads an empty table.' }
        ],
        best: 0,
        why: 'Restore first, because people are working with empty data. Then find the cause. Mission 7 shows how to restore a table with Time Travel. The cause here was a CI step that ran without `--target ci` using a role that could write to production.',
        checks: [
          ['Stop more damage', 'Cancel running CI jobs and disable the workflow.'],
          ['Find the statement', 'In the query history, filter by the CI user around 14:04: a `create or replace` on BREWLINE.MARTS.FCT_ORDERS.'],
          ['Restore', 'The replaced table is now a dropped table with the same name. Rename the empty table out of the way, then run `undrop table` on the original name. Mission 7 shows it. Transient tables keep 1 day at most, so act today.'],
          ['Fix the cause', 'Add `--target ci` to the build step, and give the CI user only the CI_DEPLOYER role, with no privileges on BREWLINE.'],
          ['Add a guard', 'Make `dbt debug --target ci` part of the check and fail if the database is not BREWLINE_CI.']
        ],
        tell: 'A pull request check replaced fct_orders in production at 14:04. I stopped the CI jobs, found the statement in the query history under the CI service user, and brought the old table back by renaming the empty one and running undrop. The cause was a workflow edit that dropped --target ci, so dbt used the default prod target, and the CI user could use the TRANSFORMER role. I restored the flag, limited the CI user to the CI_DEPLOYER role with no rights on BREWLINE, and added a debug step that fails if the database is not the CI one.',
        prevent: ['Give CI a **role with no write privileges** on production', 'Put **--target** on every dbt command in CI', 'Fail the check if **dbt debug** shows the wrong database', 'Keep production **Time Travel** long enough to react']
      }),

      B.qa({
        id: 'qa-env', t: 1, tag: 'Environments', secs: 60,
        q: 'How do you set up development, CI and production for dbt on Snowflake?',
        pts: ['Three targets in the profile: dev, ci, prod', 'Own database or schema, role and warehouse for each', 'generate_schema_name: one schema per developer or pull request, real names in prod', 'Only the scheduler writes to production', 'CI role has no write privileges on production', 'RAW is read by all, written by none of them'],
        short: 'I use three targets in the profile: dev, ci and prod. Each has its own database or schema, its own role and its own warehouse. A developer builds into a schema of their own in a development database, a pull request gets a schema named after the pull request in a CI database, and production lives in the production database.\n\nI override `generate_schema_name`, so on non-production targets every model lands in the one schema of the target, and only the prod target uses the real layer names. RAW is read by all three and written by none of them.\n\nThe roles are the real protection. Only the scheduler signs in with the production role. The CI user has a role that can create objects in the CI database and has no privileges on production, so a wrong target fails instead of changing real tables. The CI warehouse is small, with a short auto-suspend.',
        fu: [
          ['Why one schema per developer?', 'Developers then never overwrite each other, and cleanup is one drop.'],
          ['Why not just prefix table names?', 'Prefixes mix environments in one schema and make grants and cleanup harder.']
        ],
        trap: 'Naming the three targets without saying how production is protected from the other two.',
        real: 'Describe how your team separates environments, and one time that separation failed.'
      }),

      B.qa({
        id: 'qa-ci', t: 2, tag: 'Environments', secs: 90,
        q: 'Design a CI check for dbt pull requests on Snowflake. How do you keep it fast and cheap?',
        pts: ['Parse first: no connection, fails fast', 'Production manifest as state; build state:modified+ only', 'Defer reads unchanged parents from production', 'Clone production tables for incremental models whose logic changed', 'Own small warehouse and a role with no production rights', 'Concurrency: cancel old runs; always drop the PR schema'],
        short: 'The check runs on every pull request. First `dbt parse`, which opens no connection, so a broken project fails in seconds. Then I fetch the production manifest as the state and build `state:modified+`, which is the changed models and their children, into a schema named after the pull request, with `--defer` so unchanged parents are read from production instead of being rebuilt.\n\nFor an incremental model whose logic changed, I clone the production table into the pull request schema first. Then the run takes the real incremental path against a realistic table, and a clone adds almost no storage.\n\nTo keep it cheap, CI has its own small warehouse with a 60 second auto-suspend, a new push cancels the old run, and a final step always drops the pull request schema. The CI role has no write privileges on production, so a mistake in the target cannot do harm. I also run `--empty` first on big projects to check that the SQL compiles on Snowflake without reading data.',
        fu: [
          ['What if the manifest is stale?', 'The selection can miss models that changed after it was saved. Save a new manifest after every production run.'],
          ['What would you not test in CI?', 'A full-volume run of everything. A nightly build of main covers that.']
        ],
        trap: 'Describing "run dbt build on the PR". It misses selection, deferral, cleanup and the role.',
        real: 'Give the run time and credits of your CI before and after you made it slim.'
      }),

      B.qa({
        id: 'qa-clone', t: 2, tag: 'Environments', secs: 60,
        q: 'What is a zero-copy clone, and how does it help a dbt project?',
        pts: ['A clone points at the same stored data as the original', 'Created in seconds, no extra storage at first', 'Storage grows only where either side changes', 'dbt clone creates clones of production tables in the CI schema', 'Gives incremental models a realistic table to merge into', 'Clones of tables are independent: a change in one does not change the other'],
        short: 'A zero-copy clone is a new table, schema or database that points at the same stored data as the original. Snowflake creates it as a metadata operation, in seconds, and it adds almost no storage at first. Storage grows only for the data that changes afterwards in either one, and the two objects are independent.\n\nFor dbt it solves a CI problem. An incremental model needs an existing table to test its merge path. With `dbt clone` and the production manifest as state, dbt creates `create or replace transient table ... clone ...` statements for the tables I choose, in the pull request schema. The run then merges into a realistic copy, with no rebuild of terabytes and no risk to production.\n\nI also use clones for development copies and for recovery, where I clone a table as of an earlier time. Clones of tables do not carry the original\'s grants unless I ask for it, so I check privileges after cloning.',
        fu: [
          ['Does a clone cost compute?', 'Only a tiny amount for the statement. Reading it later costs what any query costs.'],
          ['Can you clone any object?', 'Databases, schemas and tables, among others. Check Snowflake\'s documentation for the full list.']
        ],
        trap: 'Saying a clone "copies the data". It shares it until something changes.',
        real: 'Describe a use of clones in your team, and what it saved.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Environment Keeper', color: '#C7D2FE',
        pts: [
          'Three targets: **dev** in a schema per developer, **ci** in a schema per pull request, **prod** in the real layer schemas.',
          '`generate_schema_name` sends all models to one schema outside production.',
          'The **role** is the guard: CI cannot write to production even if the target is wrong.',
          'A **clone** shares data with the original. `dbt clone` and `--defer` make CI fast and cheap.',
          'Always **drop** the pull request schema, with a guard in the macro.'
        ],
        lines: [
          'Every command in CI names its target.',
          'The role protects production, not the macro.',
          'I clone before I test an incremental model.'
        ]
      })
    ]
  });
})();
