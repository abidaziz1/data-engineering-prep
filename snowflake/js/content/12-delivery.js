/* Mission 12: environments, infrastructure as code, and safe releases. */
(function () {
  var B = LAB.b;

  var TF = [
    'terraform {',
    '  required_providers {',
    '    snowflake = { source = "snowflakedb/snowflake" }',
    '  }',
    '}',
    '',
    'resource "snowflake_warehouse" "bi" {',
    '  name           = "WH_BI"',
    '  warehouse_size = "MEDIUM"',
    '  auto_suspend   = 300',
    '}',
    '',
    'resource "snowflake_account_role" "analyst" {',
    '  name = "ANALYST"',
    '}',
    '',
    'resource "snowflake_grant_privileges_to_account_role" "analyst_wh" {',
    '  account_role_name = snowflake_account_role.analyst.name',
    '  privileges        = ["USAGE"]',
    '  on_account_object {',
    '    object_type = "WAREHOUSE"',
    '    object_name = snowflake_warehouse.bi.name',
    '  }',
    '}'
  ].join('\n');

  var SCHEMACHANGE = [
    '# Versioned scripts run once, in order. Repeatable scripts run when their content changes.',
    '#   migrations/V1.0.1__create_orders_table.sql',
    '#   migrations/V1.1.0__add_order_status_column.sql',
    '#   migrations/R__grants.sql',
    '',
    '# Deploy from CI with a service user and a key pair. No password.',
    'schemachange deploy \\',
    '  --root-folder migrations \\',
    '  --snowflake-account "$SNOWFLAKE_ACCOUNT" \\',
    '  --snowflake-user SVC_DEPLOY \\',
    '  --snowflake-role DEPLOYER \\',
    '  --snowflake-warehouse WH_DEPLOY \\',
    '  --snowflake-database BREWLINE \\',
    '  --change-history-table BREWLINE.META.CHANGE_HISTORY'
  ].join('\n');

  var GHA = [
    'name: snowflake-ci',
    'on:',
    '  pull_request:',
    '    branches: [main]',
    '',
    'jobs:',
    '  test-on-a-clone:',
    '    runs-on: ubuntu-latest',
    '    env:',
    '      SNOWFLAKE_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}',
    '      SNOWFLAKE_USER: SVC_CI',
    '      SNOWFLAKE_ROLE: CI_DEPLOYER',
    '      SNOWFLAKE_PRIVATE_KEY_RAW: ${{ secrets.SNOWFLAKE_CI_KEY }}',
    '      CLONE_DB: BREWLINE_PR_${{ github.event.number }}',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - run: pip install snowflake-cli schemachange sqlfluff',
    '      - run: sqlfluff lint migrations --dialect snowflake',
    '      - run: snow sql -q "CREATE OR REPLACE DATABASE ${CLONE_DB} CLONE BREWLINE"',
    '      - run: schemachange deploy --root-folder migrations --snowflake-database ${CLONE_DB}',
    '      - run: python tests/check_row_counts.py ${CLONE_DB}',
    '      - if: always()',
    '        run: snow sql -q "DROP DATABASE IF EXISTS ${CLONE_DB}"'
  ].join('\n');

  var BUGCI = [
    '- name: Create a test clone',
    '  run: snow sql -q "CREATE OR REPLACE DATABASE BREWLINE_PR CLONE BREWLINE"',
    '  env:',
    '    SNOWFLAKE_USER: admin',
    '    SNOWFLAKE_PASSWORD: Passw0rd-example',
    '    SNOWFLAKE_ROLE: ACCOUNTADMIN'
  ].join('\n');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Environments and safe releases', short: 'CI/CD', blurb: 'Branches, clones, Terraform, migrations, secrets', minutes: 26,
    focus: ['ci'],
    goals: [
      'Describe a **delivery pipeline** for Snowflake changes, from branch to production.',
      'Choose an **environment strategy**: account, database or clone per branch.',
      'Say what **Terraform, versioned migrations and dbt** each manage.',
      'Keep **secrets out of code** and give CI a least-privilege identity.'
    ],
    say: 'Mission 12 is delivery. Anyone can run SQL in a worksheet. Seniors are the people who make sure that every change reaches production the same way: reviewed, tested and repeatable.',
    scenes: [
      B.flow({
        id: 'm12-flow', t: 1, title: 'A change from branch to production', g: 'cicd', legend: true,
        steps: [
          { say: 'Delivery means every change reaches production the same way: reviewed, tested and repeatable. Press Next to follow one change.', cap: 'Seven steps. The same path for a one-line fix and for a big release.' },
          { say: 'A developer changes SQL or code on a feature branch and tries it on a clone. Nobody experiments on production.', on: ['c1'], focus: ['dev', 'pr'], cap: 'A clone gives **production-shaped data** for almost no extra storage.' },
          { say: 'A pull request shows the exact diff. Reviewers read it with the ticket linked, so the reason for the change is on record.', on: ['c2'], focus: ['pr', 'ci'], cap: 'The pull request is the **audit trail** of why the change was made.' },
          { say: 'CI runs by itself. It lints the SQL, clones production into a temporary database, deploys the change there and runs the tests.', on: ['c3'], focus: ['ci', 'rev'], cap: 'Testing on a **clone** means a bad change never touches production.' },
          { say: 'A reviewer approves, or asks for changes. Nothing merges while a check is failing.', on: ['c4'], focus: ['rev', 'mrg'], cap: 'Two gates: **automated checks** and **human review**.' },
          { say: 'Merging to main starts the release. The temporary clone is dropped, so tests leave nothing behind.', on: ['c5'], focus: ['mrg', 'cd'], cap: 'Clean up after CI, so storage does not creep up.' },
          { say: 'The deploy job applies the change to production with the same scripts that passed on the clone.', on: ['c6'], focus: ['cd', 'prod'], cap: 'The **same scripts** that passed in CI run in production.' },
          { say: 'Monitoring watches the result: failures, freshness, row counts and cost. A bad release is fixed forward, or recovered with Time Travel and a clone.', on: ['c7'], focus: ['prod', 'mon'], cap: 'A release is **done** when monitoring says it is healthy, not when the deploy ends.' }
        ]
      }),

      B.bug({
        id: 'm12-bug', t: 1, q: 'This CI step creates a test clone. A security reviewer rejects it. Click a line that is a problem.',
        file: '.github/workflows/ci.yml', lang: 'yaml', code: BUGCI, bad: [5, 6],
        hint: 'Look at how the step signs in, and which role it uses.',
        why: 'There are two problems. A **password in the workflow file** ends up in Git history, where anyone with read access can copy it. And **ACCOUNTADMIN** gives a CI job the power to change anything in the account. Use a service user with **key-pair authentication**, keep the key in the CI secret store, and give it a role that can only clone and deploy where it needs to.',
        fix: '- name: Create a test clone\n  run: snow sql -q "CREATE OR REPLACE DATABASE BREWLINE_PR CLONE BREWLINE"\n  env:\n    SNOWFLAKE_USER: SVC_CI\n    SNOWFLAKE_PRIVATE_KEY_RAW: ${{ secrets.SNOWFLAKE_CI_KEY }}\n    SNOWFLAKE_ROLE: CI_DEPLOYER'
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'Why does CI run its tests on a clone of production?',
        opts: [
          { t: 'The clone has production-shaped data and structure, costs almost nothing extra, and a bad change never touches production', fb: '' },
          { t: 'A clone is faster than the real database because it skips the cache', fb: 'A clone has no speed advantage. The benefit is safety and realism.' },
          { t: 'Cloning is required before every deployment by Snowflake', fb: 'Snowflake does not require it. It is a practice you choose.' },
          { t: 'It lets CI see the production passwords', fb: 'A clone has no passwords. It also should not be used to expose real personal data.' }
        ],
        ok: 0, why: 'A zero-copy clone gives tests **real shapes and volumes** without risk to production and with almost no extra storage. Drop it afterwards. For sensitive data, mask it or use a sampled copy.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put a safe release in order.',
        items: [
          'Change the code on a feature branch and try it on a clone',
          'Open a pull request with the ticket linked',
          'CI lints, clones production, deploys and runs tests',
          'A reviewer approves and the change merges to main',
          'The deploy job applies the same scripts to production',
          'Monitoring confirms freshness, row counts and cost are healthy'
        ],
        why: 'Try it, review it, prove it on a clone, release it with the same scripts, and watch it. Skipping the last step is how a bad release runs unnoticed for a week.'
      }),

      B.cmp({
        id: 'm12-envs', t: 2, title: 'Three ways to separate environments',
        say: 'Interviewers ask how you separate dev, test and production. There are three common answers, and each has a cost. Press Next to see each row.',
        cols: ['', 'Account per environment', 'Database per environment', 'A clone per branch'],
        rows: [
          ['How it works', 'DEV, TEST and PROD are separate Snowflake accounts', 'BREWLINE_DEV and BREWLINE_PROD live in one account', 'CI clones production into a short-lived database for every pull request'],
          ['Isolation', 'Strongest: separate users, roles and networks', 'Good, if roles and grants are strict', 'Good for tests. The data is a copy of production'],
          ['Cost and effort', 'Highest: more accounts to manage and keep in sync', 'Lowest to run. Warehouses can be shared or split', 'Low: clones share storage, and CI drops them'],
          ['Watch out for', 'Keeping account-level settings the same everywhere', 'A mistaken USE DATABASE can touch production', 'Production data in a test copy needs masking']
        ],
        steps: [
          { upto: 2, say: 'How each one works and how isolated it is.' },
          { upto: 4, say: 'What each costs and what can go wrong. There is no free option.' }
        ],
        pick: 'Most teams use **one database per environment in one account**, plus a **clone per pull request** for CI. Choose **separate accounts** when regulation or a strict blast-radius rule demands it, and accept the cost of keeping them in sync.'
      }),

      B.code({
        id: 'm12-tf', t: 2, title: 'Terraform: warehouses, roles and grants', file: 'main.tf', lang: 'hcl', code: TF,
        steps: [
          { say: 'Terraform describes infrastructure in files, and a plan shows what will change before it changes. Press Next to read this one.', lines: null },
          { say: 'First the provider. It tells Terraform how to talk to Snowflake. Pin its version in a real project.', lines: [1, 5] },
          { say: 'A warehouse as code. If someone resizes it in the UI, the next plan shows the difference, so manual changes cannot hide.', lines: [7, 11] },
          { say: 'A role.', lines: [13, 15] },
          { say: 'And a grant that connects them. A reviewer can read exactly who may use which warehouse, in one pull request.', lines: [17, 24] }
        ],
        note: 'Terraform suits **account-level objects**: warehouses, roles, grants, network policies and integrations. Resource names and options change between provider versions, so check the provider documentation for the version you use.'
      }),

      B.code({
        id: 'm12-schemachange', t: 2, title: 'Versioned migrations with schemachange', file: 'deploy.sh', lang: 'bash', code: SCHEMACHANGE,
        steps: [
          { say: 'For database objects such as tables and views, many teams use numbered migration scripts. Press Next.', lines: null },
          { say: 'Script names carry the order. A script that starts with V runs once, in version order, and is never edited afterwards. A script that starts with R runs again whenever its content changes. A history table remembers what has run.', lines: [1, 4] },
          { say: 'CI runs one command to apply whatever has not run yet. It signs in as a service user with a key pair, so no password is stored anywhere.', lines: [6, 14] }
        ],
        note: 'Flag names and defaults differ between schemachange versions, so confirm them with `schemachange deploy --help`. The idea stays the same: **ordered, recorded, repeatable** changes.'
      }),

      B.code({
        id: 'm12-gha', t: 2, title: 'A CI workflow that tests on a clone', file: '.github/workflows/snowflake-ci.yml', lang: 'yaml', code: GHA,
        steps: [
          { say: 'This workflow runs on every pull request to main. Press Next to follow it.', lines: null },
          { say: 'The trigger. Every pull request starts a run.', lines: [1, 4] },
          { say: 'The job environment. The account and the key come from the CI secret store. There is no password, and the role is a limited CI role. The clone name includes the pull request number, so runs never collide.', lines: [6, 14] },
          { say: 'First the cheap checks: install the tools and lint the SQL. A style failure should stop here, before any Snowflake credits are used.', lines: [15, 18] },
          { say: 'Then the real test: clone production, deploy the change into the clone, and run checks on it.', lines: [19, 21] },
          { say: 'The last step uses `if: always()`, so the clone is dropped even when a test fails.', lines: [22, 23] }
        ],
        note: 'Variable names for the Snowflake CLI and schemachange change between versions, so check their documentation. The structure is what matters: **lint, clone, deploy, test, always clean up**.'
      }),

      B.talk({
        id: 'm12-dcm', t: 3, title: 'Declarative deployment: DCM Projects',
        say: 'A newer option is for Snowflake to manage deployments of database objects itself. This is still moving, so confirm the status before you rely on it.',
        items: [
          ['The idea', 'Instead of writing migration steps, you **declare** the objects you want in project files. A **plan** shows the exact `CREATE`, `ALTER` and `DROP` changes that a **deploy** would make, and only the deploy changes anything.', 'Declare the end state. Review the plan. Then deploy.'],
          ['Commands', 'The Snowflake CLI offers commands such as `snow dcm plan` and `snow dcm deploy`, and SQL commands exist to execute a project. A project can have different targets, for example dev and prod.', 'Plan first, deploy second.'],
          ['Drift', 'If someone changes an object outside the project, the project reports **drift**, and the next plan can fail until you resolve it. That pushes teams toward one controlled path for changes.', 'Drift means somebody bypassed the pipeline.'],
          ['Status', 'In July 2026 Snowflake still listed new DCM Projects capabilities as Preview. Treat it as a direction to watch, and compare it with Terraform and migration scripts before you adopt it.', 'Watch it, and check its status.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm12-dec', t: 2, title: 'Decision: how to manage Snowflake objects',
        scenario: 'Brewline wants every Snowflake change in Git. There are **account-level objects** (warehouses, roles, grants), **database objects** (tables, views, tasks) that change weekly, and **transformation models** built with SQL.',
        opts: [
          { t: 'Keep making changes in the Snowsight UI and write them down afterwards', d: 'Fast, and everybody already knows how.', lose: 'The notes drift from reality, nobody can review a change before it happens, and you cannot rebuild an environment from them.' },
          { t: 'Split by kind of object', d: 'Terraform for account-level objects, versioned migrations for database objects, dbt for transformation models, all through CI.' },
          { t: 'Terraform for every object, including every table and view', d: 'One tool for everything.', lose: 'Tables and views change constantly, and every change becomes a state operation. Tools built for ordered database changes fit them better.' }
        ],
        pick: 1,
        why: 'Each kind of object changes at its own pace and wants its own tool. **Terraform** fits stable, account-level objects. **Versioned migrations** fit tables and views that change often. **dbt** fits transformation logic with tests and lineage. One CI pipeline runs all three, so every change is reviewed and repeatable.',
        when: 'A very small team can use **migrations for everything** at first. A team that adopts **declarative deployment** may replace migrations for database objects once the tool is generally available and proven in your environment.'
      }),

      B.quiz({
        id: 'm12-q2', t: 2,
        q: 'What is the safest way for a CI job to authenticate to Snowflake?',
        opts: [
          { t: 'A service user with key-pair authentication, a least-privilege role, and the key in the CI secret store', fb: '' },
          { t: 'A shared admin user with a strong password in the workflow file', fb: 'A password in a file ends up in Git history, and an admin role is far more power than CI needs.' },
          { t: 'The ACCOUNTADMIN role, so deployments never fail for lack of rights', fb: 'It removes the safety net. A bug in CI could then change anything in the account.' },
          { t: 'A personal login from the engineer who owns the pipeline', fb: 'When that person leaves, the pipeline breaks, and the audit trail blames a person for a robot\'s actions.' }
        ],
        ok: 0, why: 'A **service identity** with a **key pair**, a **least-privilege role**, and the key held in a **secret store** is the standard. It is traceable, rotatable, and limited in what a mistake can do.'
      }),

      B.qa({
        id: 'qa-deploy', t: 2, tag: 'Delivery', secs: 75,
        q: 'How do you deploy changes to Snowflake safely?',
        pts: ['Everything as code in Git, reviewed through pull requests', 'CI deploys to a clone of production and runs tests', 'Terraform for account objects, migrations for database objects, dbt for models', 'A service identity with a key pair and a least-privilege role, no secrets in code', 'A recovery plan: Time Travel, clone snapshots, forward fixes', 'Monitoring after the release'],
        short: 'Everything is code in Git and reaches production through a pull request. CI lints the SQL, clones production into a temporary database, deploys the change there and runs tests, then drops the clone. After review and merge, a deploy job applies the same scripts to production.\n\nI split tools by kind of object. Terraform manages account-level objects such as warehouses, roles and grants. Versioned migrations manage tables and views that change often. dbt manages the transformation models, with tests. CI signs in with a service user, a key pair and a least-privilege role, and no secret lives in the repository. For recovery I rely on Time Travel and snapshot clones, and I usually fix forward. After a release I watch freshness, row counts and cost.',
        fu: [
          ['How do you roll back a bad release?', 'For data, Time Travel or a clone taken before the release. For code, I revert the commit and redeploy, or I fix forward with a new migration, because migrations are never edited after they run.'],
          ['How do you stop people changing production by hand?', 'Remove write privileges from humans, give only the deploy role those privileges, and let the pipeline be the single way to change production. Alert on changes made outside it.']
        ],
        trap: 'Describing tools without describing the path. The answer is a pipeline: branch, review, test on a clone, deploy with the same scripts, monitor.',
        real: 'Describe your pipeline: which tools, how long a release takes, and one release that failed safely in CI.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Release Captain', color: '#C7D2FE',
        pts: [
          'Every change takes the **same path**: branch, pull request, CI on a **clone**, review, merge, deploy, monitor.',
          'Environments: **database per environment** plus a **clone per branch** for most teams. Separate **accounts** when rules demand it.',
          '**Terraform** for account objects, **versioned migrations** for database objects, **dbt** for models.',
          'CI uses a **service user**, a **key pair** and a **least-privilege role**. No password and no ACCOUNTADMIN.',
          '**Always clean up** the clone, and monitor after the release.'
        ],
        lines: [
          'I test every change on a clone of production, and I drop the clone afterwards.',
          'I split tools by kind of object, and one pipeline runs all of them.',
          'No secret lives in Git, and no pipeline runs as ACCOUNTADMIN.'
        ]
      })
    ]
  });
})();
