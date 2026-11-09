/* Mission 6: roles, grants, masking and secure views. */
(function () {
  var B = LAB.b, G = LAB.get;

  var GRANT_MODEL = G.file('scenario/grants_revoke.sql');
  var GRANT_RUN = G.script('grants_revoke', /^(show grants|revoke|grant)/i);
  var HOOK = G.file('scenario/project_on_run_end.yml');
  var HOOK_STMT = G.stmt('hook_grants', /^grant usage on schema/);
  var MASK_STMT = G.stmt('cfg_post_hook', /^alter table/);
  var SECURE_STMT = G.stmt('cfg_secure_view', /^create or replace secure/);
  G.expect(/^revoke\s+SELECT on \S+ from "OLD_ANALYST"/i.test(G.stmt('grants_revoke', /^revoke/i)), 'dbt revokes a role that is not in the config');
  G.expect(/^grant select on \S+ to ANALYST/i.test(G.stmt('grants_revoke', /^grant/i)), 'dbt grants a role that is in the config but missing');
  G.expect(/modify column email set masking policy/.test(MASK_STMT), 'a post-hook attaches a masking policy');
  G.expect(!G.stmts('cfg_grants').some(function (s) { return /^show grants/i.test(s.sql); }), 'a new table needs no look at existing grants');

  var SETUP = [
    'use role SECURITYADMIN;',
    '',
    'create role if not exists TRANSFORMER;',
    'create role if not exists CI_DEPLOYER;',
    'create role if not exists REPORTER;',
    'create role if not exists ANALYST;',
    'create role if not exists PII_READER;',
    '',
    'grant role TRANSFORMER to user DBT_SERVICE;',
    'grant role REPORTER to user BI_SERVICE;',
    'grant role ANALYST to user ALICE;',
    'grant role REPORTER to role ANALYST;',
    '',
    'use role SYSADMIN;',
    '',
    'grant usage on database BREWLINE to role TRANSFORMER;',
    'grant create schema on database BREWLINE to role TRANSFORMER;',
    'grant usage on schema BREWLINE.RAW to role TRANSFORMER;',
    'grant select on all tables in schema BREWLINE.RAW to role TRANSFORMER;',
    'grant select on future tables in schema BREWLINE.RAW to role TRANSFORMER;',
    'grant usage on warehouse WH_TRANSFORM to role TRANSFORMER;',
    '',
    'grant usage on database BREWLINE to role REPORTER;',
    'grant usage on warehouse WH_BI to role REPORTER;',
    '',
    'grant usage on database BREWLINE_CI to role CI_DEPLOYER;',
    'grant create schema on database BREWLINE_CI to role CI_DEPLOYER;',
    'grant usage on warehouse WH_CI to role CI_DEPLOYER;'
  ].join('\n');
  var BUGGRANT = [
    'grant usage on database BREWLINE to role REPORTER;',
    'grant usage on schema BREWLINE.MARTS to role REPORTER;',
    'grant select on all tables in schema BREWLINE.MARTS to role REPORTER;',
    'grant usage on warehouse WH_BI to role REPORTER;'
  ].join('\n');
  var BUGGRANTFIX = BUGGRANT.replace('grant select on all tables in schema BREWLINE.MARTS to role REPORTER;', 'grant select on all tables in schema BREWLINE.MARTS to role REPORTER;\ngrant select on future tables in schema BREWLINE.MARTS to role REPORTER;');
  var POLICY = [
    'create masking policy if not exists BREWLINE.GOVERNANCE.EMAIL_MASK',
    '    as (val string) returns string ->',
    '    case',
    "        when is_role_in_session('PII_READER') then val",
    "        else regexp_replace(val, '.+@', '*****@')",
    '    end;'
  ].join('\n');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Roles, grants and personal data', short: 'Security', blurb: 'Who may read what, and how to keep personal data safe', minutes: 36,
    focus: ['qual'],
    goals: [
      'Design **roles** for dbt, CI, dashboards and analysts, and write the grants.',
      'Use the dbt **grants** setting and say what dbt sends, including **revokes**.',
      'Protect personal data with **masking policies** and **secure views**.',
      'Explain why a replaced table needs its **policies and grants applied again**.'
    ],
    say: 'Mission 6 answers one question: who can read what. In Snowflake the answer lives in roles and grants, and in dbt the answer must survive every rebuild. A table that dbt replaces each night is a new object each night, so access has to be written down in code and applied again each time.',
    scenes: [
      B.flow({
        id: 'm6-flow', t: 1, title: 'Roles for the Brewline pipeline', g: 'roles', legend: true,
        steps: [
          { say: 'Snowflake checks every statement against the privileges of the current role. Users do not hold privileges. Roles do. Press Next to see the Brewline design.', cap: 'Three users, three roles, three kinds of object.' },
          { say: 'Each user signs in and holds one role for its job. The service user for dbt holds TRANSFORMER. The dashboard tool holds REPORTER. Alice, an analyst, holds ANALYST.', on: ['q1', 'q2', 'q3'], focus: ['u_dbt', 'u_bi', 'u_ana', 'r_tr', 'r_rep', 'r_ana'], cap: 'One role per job.' },
          { say: 'TRANSFORMER reads RAW and builds in the marts. It owns the schemas dbt creates, so it can replace the tables in them.', on: ['q4', 'q5'], focus: ['r_tr', 'o_raw', 'o_mart'], cap: 'Build rights stop at the schemas dbt owns.' },
          { say: 'REPORTER and ANALYST can select from the marts. They cannot change a table, and REPORTER cannot see RAW at all.', on: ['q6', 'q7'], focus: ['r_rep', 'r_ana', 'o_mart'], cap: 'Readers read.' },
          { say: 'A masking policy sits on the email column. ANALYST sees a masked value. Only a session that holds PII_READER sees the real address.', on: ['q8'], focus: ['r_ana', 'o_pii'], cap: 'The policy decides by role, at query time.' }
        ]
      }),

      B.code({
        id: 'm6-setup', t: 1, title: 'The roles, in SQL', file: 'setup.sql (written by hand, not recorded)', lang: 'sql', code: SETUP,
        steps: [
          { say: 'This is what an administrator runs once. It creates the roles and gives the pipeline its start. dbt does the rest. Press Next.', lines: null },
          { say: 'Roles are created by SECURITYADMIN. The five roles match the design on the last screen.', lines: G.span(SETUP, /use role SECURITYADMIN/, /create role if not exists PII_READER/) },
          { say: 'Each user gets the role for its job. `grant role REPORTER to role ANALYST` is a hierarchy: ANALYST holds everything REPORTER can do.', lines: G.span(SETUP, /grant role TRANSFORMER to user/, /grant role REPORTER to role ANALYST/) },
          { say: 'TRANSFORMER can use the database, create schemas in it and read RAW, including tables loaded later. Because dbt creates its schemas with this role, TRANSFORMER owns them.', lines: G.span(SETUP, /grant usage on database BREWLINE to role TRANSFORMER/, /grant usage on warehouse WH_TRANSFORM/) },
          { say: 'REPORTER gets the database and a warehouse. The schema and the tables come later, from dbt, because they do not exist yet.', lines: G.span(SETUP, /to role REPORTER;/, /WH_BI/) },
          { say: 'CI_DEPLOYER can create schemas in the CI database only. It has nothing on production writes.', lines: G.span(SETUP, /BREWLINE_CI to role CI_DEPLOYER/, /WH_CI/) }
        ],
        note: 'Create schemas with the role that should own them. Ownership lets that role replace and drop what it builds. Give everything else usage and select, never ownership.'
      }),

      B.code({
        id: 'm6-grants', t: 1, title: 'Grants in the model, and what dbt sends', file: 'models/scratch/cfg_demo.sql', lang: 'jinja', code: GRANT_MODEL,
        compiled: { label: 'What dbt sent to Snowflake when the table already existed', file: 'sent to Snowflake, in order', code: GRANT_RUN },
        steps: [
          { say: 'The `grants` setting lists, for each privilege, the roles that must have it. This is a small incremental model. The table already existed, and it carried two roles that nobody wants any more. Press Next.', lines: null },
          { say: 'The model asks for select for REPORTER and ANALYST.', lines: G.span(GRANT_MODEL, /grants=/, /grants=/) },
          { say: 'Because the table exists, dbt first asks Snowflake which grants it has.', compiled: true, lines: null, clines: [1, 1] },
          { say: 'The answer in my setup: REPORTER had select, and so did a role called OLD_ANALYST. dbt revoked the role that is not in the config.', compiled: true, lines: null, clines: G.span(GRANT_RUN, /^revoke/i, /^revoke/i) },
          { say: 'Then it granted select to ANALYST, which was missing.', compiled: true, lines: null, clines: G.span(GRANT_RUN, /^grant/i, /^grant/i) }
        ],
        note: 'The config is the full list, not a list of additions. Anything granted by hand to the table is removed at the next run. That keeps access in code, and it surprises people who add a grant in the console.'
      }),

      B.code({
        id: 'm6-hook', t: 2, title: 'Usage on the schema, with a hook', file: 'dbt_project.yml', lang: 'yaml', code: HOOK,
        compiled: { label: 'What dbt sent after the run', file: 'sent to Snowflake', code: HOOK_STMT },
        steps: [
          { say: 'Table grants are not enough. A role also needs usage on the schema to see the table. A schema belongs to the role that created it, so dbt grants usage itself, in a hook that runs at the end. Press Next.', lines: null },
          { say: 'The hook loops over the schemas the run touched and grants usage on each one to REPORTER.', lines: G.span(HOOK, /on-run-end/, /endfor/) },
          { say: 'This is the statement dbt sent in my recording.', compiled: true, lines: null, clines: [1, 1] }
        ],
        note: 'Usage on a schema that already has it is harmless, so the hook is safe to run every time. In production, the schemas are STAGING, INTERMEDIATE, MARTS and REFERENCE, and the hook grants usage on each.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'The dashboard role REPORTER must read `BREWLINE.MARTS.DIM_CUSTOMERS` and run its query. Which set of privileges does it need?',
        opts: [
          { t: 'Select on the table only', fb: 'Without usage on the database and the schema, the table is invisible to the role.' },
          { t: 'Usage on the database, usage on the schema, select on the table, and usage on a warehouse', fb: '' },
          { t: 'Ownership of the schema', fb: 'Ownership lets the role change and drop the tables, which a reader must never do.' },
          { t: 'Usage on a warehouse only', fb: 'A warehouse runs the query. It does not give access to any data.' }
        ],
        ok: 1, why: 'A role needs a path to the data: usage on each container, database and schema, then select on the table. And it needs a warehouse to run the query. Missing any one of the four gives an error that can mislead, such as "object does not exist or not authorized".'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'The grants work today. Next week dbt creates a **new table** in the marts, and the dashboard cannot read it. Click the line that explains it.',
        file: 'setup.sql', lang: 'sql', code: BUGGRANT, bad: G.at(BUGGRANT, /all tables in schema/),
        hint: 'Which tables does "all tables" cover?',
        why: '`all tables` covers the tables that exist at the moment of the grant. A table created later has no grant for REPORTER. Add `future tables`, so new objects start with access, or declare the grant in the dbt model. Use both for a second layer.',
        fix: BUGGRANTFIX,
        cheer: 'Existing and future are two different sets.'
      }),

      B.code({
        id: 'm6-mask', t: 2, title: 'A masking policy and the hook that applies it', file: 'setup.sql (written by hand) and the dbt post-hook (recorded)', lang: 'sql', code: POLICY + '\n\n' + MASK_STMT + ';',
        steps: [
          { say: 'A masking policy is a function that Snowflake runs on a column every time somebody reads it. Press Next.', lines: null },
          { say: 'The policy takes the value and returns a value. It checks the roles of the session.', lines: G.span(POLICY, /^create masking policy/, /returns string/) },
          { say: 'A session that holds PII_READER gets the real value. Everybody else gets the part after the at sign, with the name replaced by stars.', lines: G.span(POLICY, /case/, /end;/) },
          { say: 'The policy does nothing until it is attached to a column. This is the statement dbt sent as a post-hook in my recording.', lines: [G.at(POLICY + '\n\n' + MASK_STMT, /^alter table/), G.at(POLICY + '\n\n' + MASK_STMT, /^alter table/)] }
        ],
        note: 'A table that dbt replaces is a new object, and it starts without the policy. So the attach statement belongs in a post-hook, and it runs after every build. If the hook is missing, the column is readable by everybody who can read the table.'
      }),

      B.talk({
        id: 'm6-secure', t: 2, title: 'Secure views and sharing',
        say: 'A secure view is a view that hides its definition. Press Next for what that gives you, and what it costs.',
        items: [
          ['What dbt sends', 'With `secure=true`, dbt sends ' + '`' + G.head(SECURE_STMT, 40) + '`. The rest of the statement is the same as for a normal view.', 'One word changes.'],
          ['What it hides', 'Roles that do not own the view cannot read its query text. Without that, a reader could learn which tables, columns and filters sit behind the view.', 'The definition stays private.'],
          ['When you need it', 'Snowflake requires secure views when you share a view through secure data sharing with another account. Use one when a view applies a row filter that must not leak.', 'Sharing and row filters.'],
          ['What it costs', 'The optimizer skips some shortcuts for secure views, so they can run slower than normal views. Measure before you change a busy view.', 'Safety against speed.']
        ],
        cols: 2
      }),

      B.decide({
        id: 'm6-dec', t: 2, title: 'Decision: how do analysts see customer emails?',
        scenario: 'Marketing needs customer emails for campaigns. Analysts must **not** see them. Both groups read the same `dim_customers` mart. A copy of the mart would double the storage and drift out of date.',
        opts: [
          { t: 'Build a second mart without emails for the analysts', d: 'Simple to explain.', lose: 'It doubles a table, adds a model to maintain, and the two tables drift apart. Every new sensitive column repeats the work.' },
          { t: 'Keep one mart, with a masking policy on the email column that checks the role', d: 'The policy decides at query time.' },
          { t: 'Tell analysts not to select the email column', d: 'No change in the account.', lose: 'A rule written in a wiki protects nothing. Any query, tool or notebook can read the column.' }
        ],
        pick: 1,
        why: 'One table, one place to enforce the rule. The policy runs for every query from every tool, and the role decides what comes back. You attach it in a post-hook, so each rebuild keeps it.',
        when: 'If nobody needs the column in the mart, remove it from the mart. The safest personal data is the data that is not there.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, title: 'Incident: an analyst saw real email addresses', time: '10:15',
        alert: 'An analyst reports seeing **full customer email addresses** in a dashboard. The masking policy exists, and it worked for months.',
        clues: ['The policy was attached to `dim_customers.email` in the spring', '`dim_customers` is rebuilt every night with `create or replace`', 'A refactor last week removed the post-hook from the model file'],
        opts: [
          { t: 'Attach the policy again now, restore the post-hook, and check every column that should be masked', fb: '' },
          { t: 'Ask analysts not to open the dashboard', fb: 'The table still shows the emails to every other query.' },
          { t: 'Remove the email column from the dashboard only', fb: 'The table is unchanged. Anyone can query the column.' },
          { t: 'Wait for the next nightly run', fb: 'The next run replaces the table again, still without the hook.' }
        ],
        best: 0,
        why: 'The replaced table is a new object, and the only thing that attached the policy was the post-hook that the refactor removed. Fix the exposure first, then the code.',
        checks: [
          ['Stop the exposure', 'Run the `alter table ... set masking policy` statement by hand on dim_customers now.'],
          ['Check the scope', 'List the columns that have the policy attached, with the policy references of the account, and compare with the list of personal data columns.'],
          ['Find the cause', 'Look at the diff of last week\'s refactor: the post-hook line is gone.'],
          ['Restore and protect', 'Put the hook back. Add a CI test that the policy is attached to each column on a list.'],
          ['Tell the owner', 'Report what was exposed, to whom and for how long, to the data owner.']
        ],
        tell: 'An analyst saw real emails because the masking policy was no longer attached after the nightly rebuild. A refactor removed the post-hook, and dbt replaces the table each night, which drops the policy. I attached the policy by hand to close the exposure, checked the policy references against our list of personal columns, restored the hook, and added a test that fails if a listed column lacks the policy. I reported the exposure window to the data owner.',
        prevent: ['Keep the **post-hook** in code review as a protected line', 'Add a **test** that each personal data column has its policy', 'Use **tag-based masking** so new columns inherit the policy', 'Give the **data owner** a report on every exposure']
      }),

      B.qa({
        id: 'qa-rbac', t: 1, tag: 'Security', secs: 60,
        q: 'How do you design roles for a dbt project on Snowflake?',
        pts: ['Privileges belong to roles; users hold roles', 'One role per job: dbt, CI, dashboards, people', 'The dbt role creates and owns the schemas it builds in', 'Readers get usage and select, never ownership', 'CI role cannot write to production', 'Role hierarchy; no ACCOUNTADMIN for jobs'],
        short: 'In Snowflake users hold roles, and roles hold privileges, so I design the roles first. I use one role per job. The dbt service user holds a TRANSFORMER role that can read RAW and create schemas in the database. Because that role creates the schemas, it owns them and can replace the tables in them. Dashboards hold a REPORTER role, and people hold an ANALYST role that sits on top of REPORTER in a hierarchy.\n\nReaders get usage on the database and schema and select on the tables, and never ownership. The CI role can create objects in the CI database only, so a mistake in a target cannot change production.\n\nI avoid ACCOUNTADMIN for any job. And I put the grants that depend on dbt-built objects in dbt itself, with the grants setting and a hook for schema usage, so access is rebuilt together with the tables.',
        fu: [
          ['Why a role hierarchy?', 'It avoids repeating grants. ANALYST holds REPORTER, so any grant to REPORTER reaches analysts too.'],
          ['Who creates the roles?', 'SECURITYADMIN, by convention. Object owners, such as SYSADMIN, grant privileges on their objects.']
        ],
        trap: 'Granting privileges to users. In Snowflake privileges go to roles.',
        real: 'Describe the roles of a platform you ran, and one that was too broad.'
      }),

      B.qa({
        id: 'qa-grants', t: 2, tag: 'Security', secs: 75,
        q: 'How do you manage grants on tables that dbt rebuilds? What breaks them?',
        pts: ['create or replace makes a new object: grants of the old one are gone', 'grants config re-applies them after the create', 'When the table exists, dbt reads the current grants and revokes roles not in the config', 'copy grants keeps privileges across a replace', 'Future grants on the schema as a second layer', 'Schema usage with a hook'],
        short: 'Most dbt tables are built with `create or replace`, and a replaced table is a new object, so the grants of the old one are gone. I handle that in three layers. First, the `grants` setting in the project or the model lists the roles for each privilege, and dbt sends the grant statements after the create. When the table already exists, as with an incremental model, dbt first reads the current grants, revokes roles that are not in the config and grants the missing ones, so the config is the full list.\n\nSecond, a hook at the end of the run grants usage on every schema the run touched.\n\nThird, a future grant on the schema gives new tables access from the start. I can also set `copy_grants` so a replace carries the old privileges across.\n\nThe rule for the team is that grants live in code. A grant added by hand in the console is removed at the next run.',
        fu: [
          ['What does copy grants do?', 'It makes the new table start with the privileges of the one it replaces. It helps when you cannot list every role in dbt.'],
          ['Why revoke at all?', 'So that access matches the code. A role that left the config should lose access.']
        ],
        trap: 'Saying "I grant select once". The next create or replace removes it.',
        real: 'Describe an access problem that appeared after a rebuild, and how you made it permanent.'
      }),

      B.qa({
        id: 'qa-pii', t: 2, tag: 'Security', secs: 90,
        q: 'How do you protect personal data in a dbt pipeline on Snowflake?',
        pts: ['Minimise: leave personal columns out of marts where nobody needs them', 'Classify: tag models and columns, keep a list', 'Masking policies by role on the columns that remain', 'Policies attached by post-hook after every replace, with a test', 'Secure views for sharing and row filters', 'Roles, key-pair sign-in, query history and an exposure report'],
        short: 'I start by minimising. If nobody needs a personal column in a mart, I leave it out, because data that is not there cannot leak. I keep a list of the personal columns and tag models that hold them, for example with a pii tag in dbt.\n\nFor columns that must stay, I use masking policies. A policy returns the real value only to sessions that hold an approved role such as PII_READER, and a masked value to everyone else. Because dbt replaces tables, I attach the policy in a post-hook after every build, and I add a test that fails if a listed column has no policy.\n\nFor sharing, I use secure views, which hide their definition and are required for secure data sharing. Under all of it sit narrow roles, key-pair sign-in for services, and the query history for audit.\n\nIf something is exposed, I close it first, then find the cause, then report the window to the data owner.',
        fu: [
          ['What is tag-based masking?', 'You attach a policy to a tag, and every column that carries the tag is masked. New columns inherit protection when they are tagged.'],
          ['How do you prove who read what?', 'The query history and the access history of the account show queries and the columns they touched.']
        ],
        trap: 'Naming only "encryption". Snowflake encrypts data at rest by default, and the question is about who may read it.',
        real: 'Describe how you found, closed and reported an exposure of personal data.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Access Steward', color: '#FECACA',
        pts: [
          'Privileges belong to **roles**. One role per job, and **no ACCOUNTADMIN** for jobs.',
          'The dbt role **creates and owns** the schemas it builds in. Readers get usage and select.',
          'A replaced table is **new**: apply grants and policies **again** after each build.',
          'The **grants** setting is the full list. dbt revokes roles that are not in it.',
          '**Masking policies** hide columns by role. **Secure views** hide definitions and allow sharing.'
        ],
        lines: [
          'Access is written in code and applied again with every build.',
          'The role is the guard, not the macro.',
          'The safest personal data is data that is not there.'
        ]
      })
    ]
  });
})();
