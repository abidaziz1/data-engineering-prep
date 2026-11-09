/* Mission 8: roles, grants, masking, row policies, authentication and audit. */
(function () {
  var B = LAB.b;

  var GRANTS = [
    'USE ROLE SECURITYADMIN;',
    '',
    '-- 1. Create roles for the job, not for the person',
    'CREATE ROLE IF NOT EXISTS ANALYST;',
    'CREATE ROLE IF NOT EXISTS PII_READER;',
    '',
    '-- 2. Give a role what it needs, from the top down',
    'GRANT USAGE ON DATABASE BREWLINE TO ROLE ANALYST;',
    'GRANT USAGE ON SCHEMA BREWLINE.MARTS TO ROLE ANALYST;',
    'GRANT SELECT ON ALL TABLES IN SCHEMA BREWLINE.MARTS TO ROLE ANALYST;',
    'GRANT SELECT ON FUTURE TABLES IN SCHEMA BREWLINE.MARTS TO ROLE ANALYST;',
    'GRANT USAGE ON WAREHOUSE WH_BI TO ROLE ANALYST;',
    '',
    '-- 3. Roles can inherit roles',
    'GRANT ROLE ANALYST TO ROLE PII_READER;',
    '',
    '-- 4. Then give the role to a person',
    'GRANT ROLE ANALYST TO USER MAYA;',
    '',
    '-- 5. Check what the role can do',
    'SHOW GRANTS TO ROLE ANALYST;'
  ].join('\n');

  var RAP = [
    '-- A mapping table says which country each role may see',
    'CREATE TABLE IF NOT EXISTS governance.role_country (role_name STRING, country STRING);',
    "INSERT INTO governance.role_country VALUES ('ANALYST_EU', 'FR'), ('ANALYST_US', 'US');",
    '',
    '-- The policy returns TRUE for the rows the current role may see',
    'CREATE OR REPLACE ROW ACCESS POLICY governance.rap_country AS (row_country STRING)',
    '  RETURNS BOOLEAN ->',
    "  IS_ROLE_IN_SESSION('ADMIN_ALL')",
    '  OR EXISTS (SELECT 1 FROM governance.role_country m',
    '             WHERE m.role_name = CURRENT_ROLE() AND m.country = row_country);',
    '',
    '-- Attach it to the table',
    'ALTER TABLE marts.fct_orders ADD ROW ACCESS POLICY governance.rap_country ON (country);'
  ].join('\n');

  var AUDIT = [
    '-- Who queried the customer table in the last 7 days?',
    'SELECT ah.user_name, ah.query_start_time, ah.query_id',
    'FROM snowflake.account_usage.access_history ah,',
    '     LATERAL FLATTEN(INPUT => ah.base_objects_accessed) f',
    "WHERE ah.query_start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())",
    "  AND f.value:objectName::STRING = 'BREWLINE.MARTS.DIM_CUSTOMER'",
    'ORDER BY ah.query_start_time DESC;'
  ].join('\n');

  var BUGGRANT = [
    'USE ROLE SECURITYADMIN;',
    'CREATE ROLE analyst;',
    'GRANT SELECT ON ALL TABLES IN SCHEMA brewline.marts TO ROLE analyst;',
    'GRANT ROLE analyst TO USER maya;'
  ].join('\n');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Security and governance', short: 'Security', blurb: 'Roles, masking, row policies, authentication, audit', minutes: 30,
    focus: ['qual'],
    goals: [
      'Design **roles and grants** with least privilege, and read a grant chain.',
      'Protect columns and rows with **masking and row access policies**.',
      'Describe **authentication** for people and for services, and the network controls around it.',
      'Answer **who saw this data** with tags and access history.'
    ],
    say: 'Mission 8 is security. In regulated industries this is where interviews get serious, because one wrong grant can become an audit finding. The good news is that Snowflake has one consistent model for all of it.',
    scenes: [
      B.flow({
        id: 'm8-rbac', t: 1, title: 'The role hierarchy', g: 'rbac', legend: false,
        steps: [
          { say: 'Snowflake security is role-based. People get roles, roles hold privileges, and roles can inherit other roles. Arrows here point to the role whose privileges are inherited. Press Next to read the tree.', cap: 'Privileges go to **roles**. Roles go to **users**.' },
          { say: 'Snowflake ships with system roles. ACCOUNTADMIN sits at the top and inherits SECURITYADMIN and SYSADMIN. It can do everything, so few people should use it and never for daily work.', focus: ['acct', 'sec', 'sys'], on: ['r1', 'r2'], cap: '**ACCOUNTADMIN**: billing, account settings, resource monitors. Use rarely, always with MFA.' },
          { say: 'SECURITYADMIN manages grants across the account, and USERADMIN, below it, creates users and roles. SYSADMIN creates and owns databases and warehouses.', focus: ['sec', 'usr', 'sys'], on: ['r3'], cap: 'Separation of duties: the people who **grant access** are not the people who **own data**.' },
          { say: 'Your own roles belong under SYSADMIN, so SYSADMIN can manage what they own. Brewline has a LOADER that writes RAW, a TRANSFORMER that builds CORE and MARTS, and an ANALYST that reads MARTS.', focus: ['sys', 'loader', 'transformer', 'analyst'], on: ['r4', 'r5', 'r6'], cap: 'One role per **job**, each with a small set of privileges.' },
          { say: 'Roles can inherit roles. PII_READER inherits everything ANALYST can do, and adds the right to see personal data in clear text. A senior role is a junior role plus one extra thing.', focus: ['pii', 'analyst'], on: ['r7'], cap: 'Build bigger roles from smaller ones, so each privilege lives in one place.' }
        ]
      }),

      B.talk({
        id: 'm8-concepts', t: 1, title: 'How access control works',
        say: 'Five ideas explain almost every Snowflake security question. Press Next for each one.',
        items: [
          ['Roles hold privileges', 'A **privilege** such as `SELECT` on a table is granted to a **role**. Roles are granted to **users**. A user acts through a role, so access is decided by roles and never by the person.', 'Grant privileges to roles. Grant roles to people.'],
          ['Roles inherit roles', 'A role can be granted to another role, which then inherits its privileges. This builds a hierarchy. Create custom roles under SYSADMIN, so SYSADMIN can manage the objects they own.', 'A hierarchy keeps each privilege in one place.'],
          ['Primary and secondary roles', 'A session has one **primary role**, and can also activate **secondary roles**, so a person can use the privileges of several roles at once. `USE ROLE` switches the primary role.', 'Know which role a query ran as.'],
          ['Ownership', 'Every object has an **owner role**. The owner can grant access to it and drop it. Decide on purpose which role owns what, because moving ownership later is painful.', 'The owner role controls the object.'],
          ['Future grants and managed access', '`GRANT ... ON FUTURE TABLES IN SCHEMA` covers tables created later, so new tables are not invisible to the role. A schema created `WITH MANAGED ACCESS` lets only the schema owner, or a role with the MANAGE GRANTS privilege, grant access to its objects.', 'Use future grants, and consider managed access schemas.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm8-grants', t: 1, title: 'Create roles and grant access', file: 'worksheet: grants.sql', code: GRANTS,
        ctx: { role: 'SECURITYADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE' },
        steps: [
          { say: 'The standard pattern in one worksheet. Press Next to go through it.', lines: null },
          { say: 'Role management is a job for SECURITYADMIN or USERADMIN, not for ACCOUNTADMIN.', lines: [1, 1] },
          { say: 'Create roles named after the job.', lines: [3, 5] },
          { say: 'Grant from the top down. USAGE on the database and the schema lets the role see inside. SELECT on the tables lets it read them. The FUTURE grant covers tables created later. USAGE on the warehouse lets it run queries.', lines: [7, 12] },
          { say: 'PII_READER inherits ANALYST. Everything ANALYST can do, PII_READER can do too.', lines: [14, 15] },
          { say: 'Only now do people get the role.', lines: [17, 18] },
          { say: 'SHOW GRANTS lists what the role can do. Use it to review and to debug. Press Run.', lines: [20, 21], run: true }
        ],
        result: { cols: ['privilege', 'granted_on', 'name', 'grantee_name'], rows: [['USAGE', 'DATABASE', 'BREWLINE', 'ANALYST'], ['USAGE', 'SCHEMA', 'BREWLINE.MARTS', 'ANALYST'], ['SELECT', 'TABLE', 'BREWLINE.MARTS.DAILY_REVENUE', 'ANALYST'], ['SELECT', 'TABLE', 'BREWLINE.MARTS.DIM_CUSTOMER', 'ANALYST'], ['USAGE', 'WAREHOUSE', 'WH_BI', 'ANALYST']], msg: '5 rows (some columns left out)' },
        note: 'A table is unreachable without `USAGE` on **both** its database and its schema. Forgetting one of them is the most common reason a granted role still gets "does not exist or not authorized".'
      }),

      B.widget({ id: 'm8-perm', t: 1, title: 'Lab: can this role do that?', kind: 'perm' }),

      B.widget({ id: 'm8-mask', t: 1, title: 'Lab: masking by role', kind: 'mask' }),

      B.sql({
        id: 'm8-rap', t: 2, title: 'Row access policy: who sees which rows', file: 'worksheet: row_access.sql', code: RAP,
        ctx: { role: 'SECURITYADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.GOVERNANCE' },
        steps: [
          { say: 'A masking policy hides values in a column. A row access policy hides whole rows. Press Next.', lines: null },
          { say: 'The control point is a small mapping table: which role may see which country. Changing who sees what is then a data change and not a code change.', lines: [1, 3] },
          { say: 'The policy is a function of the row. It returns TRUE when the current role may see that row. Admins see everything. Others see only the countries the mapping table gives them.', lines: [5, 10] },
          { say: 'Attach it to the table on the column it reads. From then on, every query on that table is filtered, whatever tool runs it.', lines: [12, 13] }
        ],
        note: 'Row access and masking policies need **Enterprise edition** or higher. The policy runs on every query, so keep its logic cheap, and test it as each role.'
      }),

      B.talk({
        id: 'm8-auth', t: 2, title: 'Authentication, networks and secrets',
        say: 'Access control decides what a role can do. Authentication decides who gets to be that role. Five rules, press Next for each.',
        items: [
          ['People: single sign-on and MFA', 'People should sign in through your identity provider with **single sign-on** (SAML or OIDC) and **multi-factor authentication**. Snowflake is rolling out mandatory MFA for password sign-ins, account by account. Check your account\'s notice for the enforcement date.', 'People use SSO and MFA.'],
          ['Services: keys or tokens, not passwords', 'Pipelines and tools should use a user with `TYPE = SERVICE` and **key-pair authentication**, **OAuth**, a **programmatic access token** or workload identity federation. Snowflake is moving to disallow passwords for service users. Rotate key pairs with the two public key slots.', 'Services never use passwords.'],
          ['Network policies', 'A **network policy** limits sign-ins to allowed IP ranges, for the account or for one user. Business Critical edition adds private connectivity, so traffic never crosses the public internet.', 'Allow only the networks that need access.'],
          ['Protect the top role', 'Few people hold ACCOUNTADMIN, all with MFA. Nobody uses it as a default role, and pipelines never run as ACCOUNTADMIN or SYSADMIN. Give each pipeline a dedicated role with only the grants it needs.', 'Daily work uses the least powerful role that fits.'],
          ['Secrets stay out of code', 'No keys or passwords in Git or in SQL. Keep them in a secrets manager, rotate them on a schedule, and use storage integrations, so cloud keys never appear in a Snowflake statement.', 'Secrets live in a secrets manager.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm8-tags', t: 2, title: 'Tags, classification and audit',
        say: 'Governance means knowing where sensitive data is and who touched it. Five tools, press Next for each.',
        items: [
          ['Tags describe data', 'A **tag** is a label such as `pii = email` attached to a column, table or schema. Tags make governance searchable: you can list every column tagged as PII with one query.', 'Tag sensitive columns so you can find them.'],
          ['Tag-based masking', 'Attach a masking policy to a **tag**, and every column carrying that tag is masked, now and in the future. That scales far better than attaching a policy to each column by hand.', 'Mask by tag, not column by column.'],
          ['Classification', 'Snowflake can **classify** columns automatically, suggesting categories such as email or phone number and applying tags. Treat the output as a starting point and review it.', 'Automatic classification suggests. People decide.'],
          ['Access history', '`ACCESS_HISTORY` records which users read which objects and columns, and how data flowed into other objects. It answers "who saw the SSN column last month?" for auditors. It needs Enterprise edition.', 'Access history is the audit trail.'],
          ['Secure views', 'A **secure view** hides its definition and blocks some optimizer behavior that could leak data. Use secure views when you expose data to other roles or to a data share.', 'Share through secure views, not plain ones.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm8-audit', t: 2, title: 'Who read the customer table?', file: 'worksheet: access_audit.sql', code: AUDIT,
        ctx: { role: 'SECURITYADMIN', wh: 'WH_BI', db: 'SNOWFLAKE.ACCOUNT_USAGE' },
        steps: [
          { say: 'An auditor asks who read the customer table last week. Access history has the answer. Press Next.', lines: null },
          { say: 'One row per query, with the user, the time and the query ID.', lines: [1, 2] },
          { say: 'The objects a query touched are stored as an array, so we flatten it to get one row per object.', lines: [3, 4] },
          { say: 'Filter to the last 7 days and to the one table, then sort. Press Run.', lines: [5, 7], run: true }
        ],
        result: { cols: ['USER_NAME', 'QUERY_START_TIME', 'QUERY_ID'], rows: [['MAYA', '2026-03-14 09:12:44.000 +0000', '01b2...c31'], ['SVC_DBT', '2026-03-14 05:10:02.000 +0000', '01b2...b77'], ['LEO', '2026-03-13 16:40:19.000 +0000', '01b2...a90']], msg: '3 rows, illustrative values' },
        note: 'Access history shows reads and writes at table and column level, with a lag of up to a few hours. Keep the results as evidence, because the view keeps one year of history.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'Maya has the analyst role and the grants ran without errors, but she gets "Schema BREWLINE.MARTS does not exist or not authorized". Click the incomplete line.',
        file: 'grant_analyst.sql', lang: 'sql', code: BUGGRANT, bad: 3,
        hint: 'What does a role need on the parents of a table before it can reach the table?',
        why: '`SELECT` on tables is not enough. The role also needs `USAGE` on the **database** and on the **schema**. Without them the schema is invisible, which is why the error says it does not exist. Add the two USAGE grants and a `FUTURE` grant, so new tables are covered.',
        fix: 'GRANT USAGE ON DATABASE brewline TO ROLE analyst;\nGRANT USAGE ON SCHEMA brewline.marts TO ROLE analyst;\nGRANT SELECT ON ALL TABLES IN SCHEMA brewline.marts TO ROLE analyst;\nGRANT SELECT ON FUTURE TABLES IN SCHEMA brewline.marts TO ROLE analyst;'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the steps for giving an analyst access in order.',
        items: [
          'Create the role',
          'Grant USAGE on the database and the schema',
          'Grant SELECT on the tables, and on future tables',
          'Grant USAGE on a warehouse',
          'Grant the role to the user',
          'The user activates the role with USE ROLE and queries'
        ],
        why: 'Privileges go onto the role first, then the role goes to the person. Giving the role to the user before the grants exist is not wrong, but it makes a confusing half-working state.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'Which system role should normally create databases and warehouses?',
        opts: [
          { t: 'SYSADMIN', fb: '' },
          { t: 'ACCOUNTADMIN', fb: 'It can, but it is the most powerful role and should be used rarely and never for daily work.' },
          { t: 'SECURITYADMIN', fb: 'SECURITYADMIN manages grants and users. It does not own data objects.' },
          { t: 'PUBLIC', fb: 'PUBLIC is granted to everyone automatically and holds almost no privileges.' }
        ],
        ok: 0, why: '**SYSADMIN** creates and owns databases, schemas and warehouses. Your own roles belong under it, so it can manage what they own.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'A masking policy is attached to the email column. Which statement is true?',
        opts: [
          { t: 'The stored data is unchanged. The policy is evaluated when each query runs, based on the role', fb: '' },
          { t: 'The email values are rewritten in storage', fb: 'Storage always holds the real value. Masking happens at query time.' },
          { t: 'It applies only to queries run from Snowsight', fb: 'It applies to every tool and every query that reads the column.' },
          { t: 'It copies the column into a hidden table', fb: 'No copy is made. The policy is an expression evaluated on read.' }
        ],
        ok: 0, why: 'The policy is a function attached to the column. The same table gives **different results to different roles**, with no copies and no separate views to maintain.'
      }),

      B.quiz({
        id: 'm8-q3', t: 2,
        q: 'What does `IS_ROLE_IN_SESSION(\'PII_READER\')` do that `CURRENT_ROLE() = \'PII_READER\'` does not?',
        opts: [
          { t: 'It is also true when PII_READER is inherited through the role hierarchy or active as a secondary role', fb: '' },
          { t: 'It checks the user name instead of the role', fb: 'Both functions look at roles. Neither looks at the user name.' },
          { t: 'It is faster because it skips the privilege check', fb: 'Speed is not the difference. The difference is which roles count.' },
          { t: 'It works only in row access policies', fb: 'It works in masking policies and anywhere else a SQL expression is allowed.' }
        ],
        ok: 0, why: '`CURRENT_ROLE()` returns only the primary role. A user who reaches PII_READER through a **higher role** or a **secondary role** would be wrongly denied. `IS_ROLE_IN_SESSION` follows the hierarchy.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, title: 'Decision: how to structure the roles',
        scenario: 'Brewline has **40 analysts in 5 teams** who need different schemas, **3 pipelines** that load and transform, and a compliance team that must see customer data in clear text. The company is growing and new schemas appear every month.',
        opts: [
          { t: 'Grant privileges directly to each user', d: 'Simple to start. One grant per person per table.', lose: 'With 40 people and every new schema it becomes thousands of grants nobody can review, and a leaver leaves privileges behind.' },
          { t: 'Access roles per schema, combined into functional roles per job', d: 'MARTS_READ and CORE_WRITE hold privileges. ANALYST and PII_READER are built from them.' },
          { t: 'One shared role with every privilege', d: 'Everyone uses ALL_ACCESS.', lose: 'There is no least privilege, no useful audit trail, and one leaked login exposes everything.' }
        ],
        pick: 1,
        why: '**Access roles** hold privileges on a schema (read or write). **Functional roles** describe jobs, and are built by granting access roles to them. A new schema means one new access role, and a new analyst means one grant. Audits read the role tree, not 40 separate user lists.',
        when: 'A very small team can start with **one role per job** and no access roles. Move to access roles when schemas multiply, or when different jobs overlap on the same data.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, title: 'Incident: analysts can see clear-text emails', time: '10:15',
        alert: 'An analyst reports seeing **real email addresses** in a dashboard this morning. Last night the pipeline rebuilt `marts.dim_customer`. The masking policy was set by hand six months ago.',
        clues: ['The table is rebuilt every night with CREATE OR REPLACE', 'The ANALYST role has SELECT on the table', 'The policy still exists in the governance schema'],
        opts: [
          { t: 'Contain first: revoke the analysts\' access to the table, then re-apply the policy and verify it as each role', fb: '' },
          { t: 'Re-apply the policy and say nothing, since the problem is fixed', fb: 'Personal data was exposed. Compliance needs to know how long and to whom, so report it.' },
          { t: 'Delete the dashboard', fb: 'The exposure is in the table, not in one dashboard. Other tools can read the column too.' },
          { t: 'Wait for the analyst to confirm what they saw', fb: 'Every minute of waiting is more exposure. Contain first, then investigate.' }
        ],
        best: 0,
        why: 'This is a **data exposure**, so stop it first. A rebuilt table is a new table, so the policy on the old one is gone, and the fastest safe step is to remove access until the policy is back.',
        checks: [
          ['Contain', 'Revoke SELECT from the analyst roles, or point the dashboards at a masked view, until the policy is restored.'],
          ['Scope', '`ACCESS_HISTORY`: who queried the column since the rebuild, and how many rows.'],
          ['Fix', 'Re-apply the masking policy. Run the same query as ANALYST and as PII_READER to prove it.'],
          ['Root cause', '`CREATE OR REPLACE TABLE` creates a new table with no policy. The policy was set by hand once, outside the deployment.'],
          ['Report', 'Tell security and compliance: the window, the affected users and the fix.']
        ],
        tell: 'A nightly rebuild with CREATE OR REPLACE dropped the masking policy from the customer table, and analysts saw real emails for about 9 hours. I revoked their access first, re-applied the policy and verified it as each role, then used access history to list who read the column. I reported the window and the users to compliance. The fix was to apply the policy inside the deployment, so it runs after every rebuild.',
        prevent: ['Apply masking policies in the **same deployment step** that creates the table', 'Use **tag-based masking** and a test that fails if a PII-tagged column has no policy', 'Run a nightly check on `POLICY_REFERENCES` for expected columns', 'Review ACCESS_HISTORY for PII tables on a schedule']
      }),

      B.qa({
        id: 'qa-rbac', t: 1, tag: 'Security', secs: 60,
        q: 'How does role-based access control work in Snowflake?',
        pts: ['Privileges are granted to roles, roles are granted to users', 'Roles can inherit roles, which builds a hierarchy', 'System roles: ACCOUNTADMIN, SECURITYADMIN, USERADMIN, SYSADMIN', 'Custom roles sit under SYSADMIN, one per job', 'Least privilege, future grants and USAGE on parents'],
        short: 'In Snowflake, privileges are granted to roles and roles are granted to users, so a person acts through a role. Roles can be granted to other roles, which builds a hierarchy where a higher role inherits the privileges of the lower ones.\n\nThere are system roles. ACCOUNTADMIN sits at the top, SECURITYADMIN manages grants, USERADMIN creates users and roles, and SYSADMIN owns databases and warehouses. I create my own roles under SYSADMIN, one per job, such as a loader, a transformer and an analyst, and I give each only the privileges it needs. To reach a table a role needs USAGE on the database and the schema as well as SELECT on the table, and I add future grants, so new tables are covered. Daily work never uses ACCOUNTADMIN.',
        fu: [
          ['What is the difference between a primary and a secondary role?', 'A session has one primary role, which owns the objects it creates. Secondary roles add their privileges to the session, so a user can use several roles at once without switching.'],
          ['What is a managed access schema?', 'A schema where only the schema owner, or a role with MANAGE GRANTS, can grant privileges on its objects, so object owners cannot hand out access on their own.']
        ],
        trap: 'Listing the system roles and nothing else. Add the design: custom roles under SYSADMIN, least privilege, and inheritance.'
      }),

      B.qa({
        id: 'qa-secure', t: 2, tag: 'Security', secs: 75,
        q: 'How do you secure sensitive data in Snowflake?',
        pts: ['Least-privilege roles and a clear role hierarchy', 'Masking policies and row access policies, ideally tag-based', 'Classify and tag PII, review the results', 'SSO and MFA for people, key pairs or tokens for services, network policies', 'Audit with access history and login history', 'Deploy policies as code, and test them as each role'],
        short: 'I work in layers. First, least-privilege roles: functional roles built from access roles, with nothing running as ACCOUNTADMIN. Second, protection on the data itself: masking policies for columns and row access policies for regional rules, attached by tag so new columns are covered. I classify and tag PII, and review the automatic suggestions.\n\nThird, who can get in: single sign-on and MFA for people, key pairs or tokens for services, and network policies. Fourth, evidence: access history and login history answer who saw what. Finally I deploy all of it as code and test it as each role, because a rebuilt table can quietly lose a policy. At Business Critical I would add private connectivity and customer-managed keys when regulation requires them.',
        fu: [
          ['How do you prove a policy works?', 'I run the same query as each role in a test and compare the output. A nightly check on policy references flags a column that should be protected and is not.'],
          ['What would you do about service accounts?', 'Use a service user with key-pair authentication or OAuth, a role with only the grants the pipeline needs, rotate the keys, and keep them in a secrets manager.']
        ],
        trap: 'Naming only masking policies. A complete answer covers roles, protection on the data, authentication, audit and deployment.',
        real: 'Describe a control you implemented. Say how many users or tables it covered and what an audit or test showed.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Security Steward', color: '#FECACA',
        pts: [
          'Privileges go to **roles**, roles go to **users**, roles **inherit** roles. Custom roles sit under **SYSADMIN**.',
          'A role needs **USAGE** on the database and the schema, plus **SELECT** on tables. Add **future grants**.',
          '**Masking** hides column values and **row access policies** hide rows, both at query time, by role. Use **IS_ROLE_IN_SESSION**.',
          'A table rebuilt with **CREATE OR REPLACE** loses its policy. Apply policies in the deployment.',
          'People: **SSO and MFA**. Services: **key pair, OAuth or token**, never passwords. Audit with **access history**.'
        ],
        lines: [
          'I give each job its own role, build bigger roles from smaller ones, and never run pipelines as ACCOUNTADMIN.',
          'I deploy masking policies with the table, and I test them as every role.',
          'When data is exposed, I contain first, then investigate with access history, then report.'
        ]
      })
    ]
  });
})();
