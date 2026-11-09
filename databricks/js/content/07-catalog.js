/* Mission 7: Unity Catalog. Names, grants, inheritance, masks, external locations, lineage.
   Unity Catalog is a Databricks service. Nothing here ran on Databricks: every screen follows the documentation. */
(function () {
  var B = LAB.b, G = LAB.get;

  var GRANTS = [
    'GRANT USE CATALOG ON CATALOG brewline_prod TO `analysts`;',
    'GRANT USE SCHEMA ON SCHEMA brewline_prod.gold TO `analysts`;',
    'GRANT SELECT ON TABLE brewline_prod.gold.daily_revenue TO `analysts`;'
  ].join('\n');
  var INHERIT = [
    'GRANT SELECT ON SCHEMA brewline_prod.gold TO `analysts`;',
    '',
    'GRANT MODIFY, SELECT ON SCHEMA brewline_prod.silver TO `svc_pipeline`;',
    '',
    'ALTER SCHEMA brewline_prod.gold SET OWNER TO `data_engineers`;',
    '',
    'SHOW GRANTS ON SCHEMA brewline_prod.gold;'
  ].join('\n');
  var MASKS = [
    'CREATE FUNCTION brewline_prod.governance.mask_email(email STRING)',
    '  RETURNS STRING',
    "  RETURN CASE WHEN is_account_group_member('pii_readers') THEN email",
    "              ELSE concat('***@', substring_index(email, '@', -1)) END;",
    '',
    'ALTER TABLE brewline_prod.gold.dim_customers',
    '  ALTER COLUMN email SET MASK brewline_prod.governance.mask_email;',
    '',
    'CREATE FUNCTION brewline_prod.governance.us_only(country STRING)',
    '  RETURNS BOOLEAN',
    "  RETURN is_account_group_member('global_ops') OR country = 'US';",
    '',
    'ALTER TABLE brewline_prod.gold.dim_customers',
    '  SET ROW FILTER brewline_prod.governance.us_only ON (country);'
  ].join('\n');
  var REPAIR = [
    'ALTER TABLE brewline_prod.gold.dim_customers',
    '  ALTER COLUMN email DROP MASK;',
    '',
    'ALTER TABLE brewline_prod.gold.dim_customers DROP ROW FILTER;'
  ].join('\n');
  var EXTLOC = [
    "CREATE EXTERNAL LOCATION brewline_landing",
    "  URL 'abfss://landing@brewlinelake.dfs.core.windows.net/orders'",
    "  WITH (STORAGE CREDENTIAL brewline_cred);",
    '',
    'GRANT READ FILES ON EXTERNAL LOCATION brewline_landing TO `svc_pipeline`;',
    '',
    'GRANT CREATE EXTERNAL TABLE ON EXTERNAL LOCATION brewline_landing TO `data_engineers`;'
  ].join('\n');
  var LINEAGE = [
    'SELECT source_table_full_name, target_table_full_name, event_time',
    'FROM system.access.table_lineage',
    "WHERE target_table_full_name = 'brewline_prod.gold.daily_revenue'",
    'ORDER BY event_time DESC',
    'LIMIT 20;'
  ].join('\n');
  var AUDIT = [
    'SELECT event_time, user_identity.email, action_name',
    'FROM system.access.audit',
    "WHERE service_name = 'unityCatalog'",
    '  AND event_date >= current_date() - 7',
    'ORDER BY event_time DESC;'
  ].join('\n');
  var BUG = [
    'GRANT ALL PRIVILEGES ON CATALOG brewline_prod TO `alice@brewline.example`;',
    'GRANT SELECT ON TABLE brewline_prod.silver.orders TO `bob@brewline.example`;'
  ].join('\n');
  var BUGFIX = [
    'GRANT USE CATALOG ON CATALOG brewline_prod TO `data_engineers`;',
    'GRANT USE SCHEMA, SELECT ON SCHEMA brewline_prod.silver TO `data_engineers`;'
  ].join('\n');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Unity Catalog: names, grants and lineage', short: 'Catalog', blurb: 'Three-part names, privileges and inheritance, masks, external locations, lineage', minutes: 40,
    focus: ['qual'],
    goals: [
      'Write a table name in the **three-level form** and say what each level holds.',
      'Grant a group read access, and name the **three privileges** a reader needs.',
      'Say how **inheritance** works and why you grant to groups.',
      'Hide a column with a **mask** and limit rows with a **row filter**.',
      'Explain **managed** and **external** tables, and what a drop does to each.',
      'Find who read a table with **lineage and audit** system tables.'
    ],
    say: 'Mission 7 is Unity Catalog, the part of Databricks that names your tables and decides who may read them. It is a Databricks service, and I could not run it. Everything in this mission follows the public documentation, and every screen carries the blue "From documentation" tag. The SQL is real syntax that I checked with a parser in the verification step, and the documentation can change, so read the current page before you rely on a detail.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, src: 'docs', title: 'Why a catalog',
        say: 'Without a catalog, access control sits on storage paths. Whoever holds the key to a folder reads every file in it. Press Next for what a catalog changes.',
        items: [
          ['Access by name, not by path', 'Unity Catalog grants privileges on tables, schemas and catalogs with SQL. An analyst gets `SELECT` on `brewline_prod.gold.daily_revenue`. They never see a storage key.', 'Grants on names.'],
          ['One place for all workspaces', 'A **metastore** holds the catalogs, and several workspaces in the same region attach to it. A grant applies in every workspace that uses the metastore. Documentation recommends one metastore for each region.', 'One set of rules.'],
          ['Principals live in the account', 'Users, groups and service principals are defined at the Databricks account level. For Azure, they come from Microsoft Entra ID. Groups should come from your identity provider.', 'The company identity.'],
          ['Lineage and audit come free', 'Unity Catalog records which jobs and queries read or write each table, and who did what. You query this through system tables.', 'Know who used what.']
        ],
        cols: 2
      }),

      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'Metastore, catalogs, schemas and storage', g: 'uc', legend: true,
        steps: [
          { say: 'Here are the pieces of Unity Catalog. The top row is the hierarchy of names. The bottom row is how it reaches your storage. Press Next to follow it.', cap: 'Names on top, storage below.' },
          { say: 'Step 1. A **metastore** is the top container, one for each region. It holds **catalogs**. A catalog holds **schemas**. A schema holds tables, views, volumes and functions. You write a table as `catalog.schema.table`.', on: ['u1', 'u2', 'u3'], focus: ['ms', 'cat', 'sch', 'obj'], cap: 'Three-level names.' },
          { say: 'Step 2. To reach your storage, Unity Catalog needs a way in. A **storage credential** holds an identity: on Azure a managed identity from an access connector, on AWS an IAM role.', on: ['u4'], focus: ['sc', 'el'], cap: 'The credential is the identity.' },
          { say: 'Step 3. An **external location** ties a path in your storage to a credential. You grant privileges on the external location to decide who may read or write files under that path.', on: ['u5'], focus: ['el', 'st'], cap: 'A path plus a credential.' },
          { say: 'Step 4. A table points at a path. A **managed** table lives in storage that Unity Catalog manages for its catalog or schema. An **external** table lives in a path under an external location.', on: ['u7'], focus: ['obj', 'st'], cap: 'Both end up as files in your storage.' },
          { say: 'Step 5. Every read and write of an object is recorded. You query lineage and the audit log through system tables.', on: ['u6'], focus: ['obj', 'lin'], cap: 'Lineage and audit.' }
        ]
      }),

      B.cmp({
        id: 'm7-managed', t: 1, src: 'docs', title: 'Managed and external tables',
        say: 'The difference is who owns the files, and what a drop does. Press Next to compare. This follows the Databricks documentation.',
        cols: ['Question', 'Managed table', 'External table'],
        hl: 1,
        rows: [
          ['Where are the files?', 'In storage that Unity Catalog manages for the catalog or schema.', 'In a path you choose, under a registered external location.'],
          ['Who manages the files?', 'Databricks: layout, compaction and cleanup can be automatic.', 'You: you schedule maintenance yourself.'],
          ['What does DROP TABLE do?', 'Removes the table and marks its files for deletion. You can `UNDROP` within the recovery period, 7 days by default.', 'Removes the table metadata only. The files stay in storage.'],
          ['Can other tools read the files?', 'Not directly. You go through Unity Catalog.', 'Yes, if they have access to the storage. Unity Catalog privileges do not apply to direct file access.'],
          ['Use it for', 'Tables that your pipelines own, such as bronze, silver and gold.', 'Data that other systems also read or write, or that must stay at a fixed path.']
        ],
        steps: [
          { upto: 2, say: 'Managed tables are the default choice for data that your pipelines own. Databricks can run the maintenance for you, which mission 4 covered.' },
          { upto: 3, say: 'A dropped managed table is not gone at once. The documentation gives a recovery period, 7 days by default, in which `UNDROP TABLE` brings it back. A dropped external table leaves its files alone.' },
          { upto: 5, say: 'External tables suit data that other systems share. You give up the automatic maintenance, and you must protect the storage path yourself.' }
        ],
        pick: 'Use **managed tables** for your own bronze, silver and gold. Use **external tables** only when another system must read or write the same files.'
      }),

      B.code({
        id: 'm7-grants', t: 1, src: 'docs', title: 'Grant an analyst group read access', file: 'sql editor', lang: 'sql', code: GRANTS,
        steps: [
          { say: 'An analyst group should read one table in gold, and nothing else. Reading a table needs **three** privileges. The first two let the user find the table.', lines: null },
          { say: '`USE CATALOG` lets the user see inside the catalog. Without it, a `SELECT` on a table below fails, even if the user holds it.', lines: [1, 1] },
          { say: '`USE SCHEMA` does the same for the schema. These two privileges do not give access to any data. They are the doors to the building.', lines: [2, 2] },
          { say: '`SELECT` on the table is the privilege that lets the user read rows. Grant it to a **group**, not to a person.', lines: [3, 3] }
        ],
        note: 'The statement form is `GRANT <privilege> ON <object type> <object name> TO <principal>`. Backticks around a name allow characters such as `@`. If you grant to a group name, a person who joins the group gets the access at once.'
      }),

      B.rows({
        id: 'm7-matrix', t: 1, src: 'docs', title: 'Who can read what',
        steps: [
          {
            say: 'With the three grants above, this is what the group `analysts` can do. The table also shows a table that nobody granted to them.',
            tabs: [{
              layer: 'EXAMPLE', name: 'what the group analysts can do', c: 'qual',
              cols: ['Object', 'USE CATALOG', 'USE SCHEMA', 'SELECT', 'Can read it?'],
              rows: [
                ['brewline_prod.gold.daily_revenue', 'granted', 'granted', 'granted', 'yes'],
                ['brewline_prod.gold.dim_customers', 'granted', 'granted', 'not granted', 'no'],
                ['brewline_prod.silver.orders', 'granted', 'not granted', 'not granted', 'no']
              ],
              trk: 0
            }],
            notes: ['This is the model from the documentation, applied to the Brewline names. It is an example, not output from a workspace.']
          },
          {
            say: 'Why the second row fails: the group has the doors open, but no privilege on that table. Why the third fails: it also has no `USE SCHEMA` on silver. All three privileges must be present together.',
            tabs: [{
              layer: 'EXAMPLE', name: 'the same table with the reason', c: 'qual',
              cols: ['Object', 'Missing', 'Error the user sees'],
              rows: [
                ['brewline_prod.gold.dim_customers', 'SELECT on the table', 'a permission error that names the table'],
                ['brewline_prod.silver.orders', 'USE SCHEMA on silver, and SELECT', 'a permission error that names the schema']
              ]
            }],
            notes: ['A user who cannot see an object may get an error that says it does not exist, or that they lack a privilege. Read the privilege named in the message.']
          }
        ]
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'Priya has `SELECT` on `brewline_prod.gold.daily_revenue`. Her query still fails with a permission error. What is the most likely missing grant?',
        opts: [
          { t: '`USE CATALOG` on `brewline_prod` and `USE SCHEMA` on `brewline_prod.gold`', fb: '' },
          { t: '`MODIFY` on the table', fb: 'MODIFY lets a user change rows. A read needs no change privilege.' },
          { t: '`ALL PRIVILEGES` on the metastore', fb: 'Far too broad, and metastore-level grants do not flow down to catalogs and schemas anyway.' },
          { t: '`CREATE TABLE` on the schema', fb: 'That lets a user create tables. It does not help reading one.' }
        ],
        ok: 0, why: 'Reading a table needs `USE CATALOG` on the catalog, `USE SCHEMA` on the schema and `SELECT` on the table. The documentation says `SELECT` alone is not enough.'
      }),

      B.code({
        id: 'm7-inherit', t: 2, src: 'docs', title: 'Inheritance, ownership and checking grants', file: 'sql editor', lang: 'sql', code: INHERIT,
        steps: [
          { say: 'You do not have to grant table by table. A grant on a **schema** is inherited by all its current **and future** tables, views and functions. New tables in gold become readable by analysts at once.', lines: [1, 1] },
          { say: 'The pipeline service principal needs to write silver. `MODIFY` plus `SELECT` on the schema covers every silver table. The documentation advises to keep direct `MODIFY` on production tables for service principals.', lines: [3, 3] },
          { say: 'Give the **ownership** of production schemas to a group, not a person. An owner can manage grants on the object. A person who leaves would leave the object without an owner.', lines: [5, 5] },
          { say: '`SHOW GRANTS` lists who holds what on an object. Run it in reviews, and when a user reports a permission error.', lines: [7, 7] }
        ],
        note: 'One exception to inheritance: privileges granted at the **metastore** level do not flow down to catalogs, schemas and tables. Grant at the catalog level or below.'
      }),

      B.code({
        id: 'm7-masks', t: 2, src: 'docs', title: 'Column masks and row filters', file: 'sql editor', lang: 'sql', code: MASKS,
        steps: [
          { say: 'The customer table holds email addresses. Most people must not read them. A **column mask** is a SQL function that Unity Catalog applies to the column.', lines: null },
          { say: 'The function takes the column value and returns the same type. Members of `pii_readers` see the real email. Everyone else sees `***@` and the domain. `is_account_group_member` checks the group of the person who runs the query.', lines: [1, 4] },
          { say: '`SET MASK` attaches it. From now on every query on `dim_customers` applies the function, whichever tool or workspace runs it. Nobody can forget to mask.', lines: [6, 7] },
          { say: 'A **row filter** is a function that returns true for the rows a user may see. Members of `global_ops` see all rows. Everyone else sees only US customers.', lines: [9, 11] },
          { say: '`SET ROW FILTER` attaches it to the table and names the column it reads. A table can hold one row filter.', lines: [13, 14] }
        ],
        note: 'To add or remove a filter or a mask you must own the table, or hold both `MANAGE` and `SELECT` on it. The documentation also describes attribute-based access control, which sets such policies at the catalog or schema level with tags, so you do not repeat them for every table.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'docs', title: 'Incident: every query on the customer table fails', time: '10:40',
        alert: '**Queries on `dim_customers` fail for everyone.** The error says that the function `brewline_prod.governance.mask_email` cannot be found. A teammate cleaned up the `governance` schema an hour ago.',
        clues: ['The table has a column mask and a row filter attached', 'The functions lived in the governance schema', 'Dashboards that read the table are red'],
        opts: [
          { t: 'As the table owner, drop the mask and the row filter from the table, then recreate the functions and attach them again', fb: '' },
          { t: 'Grant `SELECT` on the function to every user', fb: 'The function does not exist, so there is nothing to grant on.' },
          { t: 'Restart the SQL warehouse', fb: 'The table definition refers to a function that is gone. A restart changes nothing.' },
          { t: 'Drop the table and recreate it', fb: 'You would lose the data of a managed table after the recovery period, and the problem is a missing function.' }
        ],
        best: 0,
        why: 'The table still points at a function that no longer exists, so every query fails. The documentation describes the repair: drop the filter or mask from the table (`DROP ROW FILTER`, `DROP MASK`), which needs ownership or `MANAGE` and `SELECT`, and then recreate the function and attach it again.',
        checks: [
          ['Read the error', 'It names the missing function. That points at the mask or the filter.'],
          ['Check the table', '`DESCRIBE EXTENDED` shows the column mask and the row filter that are attached.'],
          ['Restore access first', 'Drop the mask and the filter, so people can read the table. Decide in the incident whether that exposes data, and limit access while it is open.'],
          ['Recreate and attach', 'Create the functions again and run `SET MASK` and `SET ROW FILTER`.'],
          ['Prevent a repeat', 'Never drop a function that a table uses. Drop the mask or filter from the table first.']
        ],
        tell: 'All queries on the customer dimension failed because someone dropped the governance functions that the table\'s column mask and row filter pointed at. As the table owner I dropped the mask and the filter so that the table could be read, recreated the functions, and attached them again. While the table was unmasked we limited access to the data engineers. To prevent a repeat, we put the functions in a protected schema, and our runbook says to detach a mask or a filter from the table before it is dropped.',
        prevent: ['Put governance functions in a **protected schema**', '**Detach** a mask or filter before dropping its function', 'Keep the SQL for masks and filters in **version control**', 'Test a mask with a user from **each group**']
      }),

      B.code({
        id: 'm7-extloc', t: 2, src: 'docs', title: 'An external location for the landing files', file: 'sql editor', lang: 'sql', code: EXTLOC,
        steps: [
          { say: 'The landing folder sits in your storage, outside any catalog. To let a job read it through Unity Catalog, you register an **external location**.', lines: null },
          { say: 'The external location names a path and a **storage credential**. The credential holds the identity that Unity Catalog uses to reach the storage. Mission 12 creates it on Azure.', lines: [1, 3] },
          { say: 'Then you grant privileges on the location. `READ FILES` lets the pipeline service principal read files under the path.', lines: [5, 5] },
          { say: '`CREATE EXTERNAL TABLE` lets the data engineers define external tables there. Check the privileges reference for the full list, including the one that lets someone write files.', lines: [7, 7] }
        ],
        note: 'The storage path is protected by Unity Catalog only when people go through it. Someone who has the storage keys can read the files directly. Keep keys out of reach and use the managed identity.'
      }),

      B.talk({
        id: 'm7-lineage', t: 2, src: 'docs', title: 'Lineage and audit with system tables',
        say: 'Unity Catalog records what happens to your data. You read it with SQL on system tables. These names come from the documentation. Press Next for each.',
        items: [
          ['Table lineage', 'The table `system.access.table_lineage` holds a record for each read or write of a Unity Catalog table or path, by jobs, notebooks and dashboards. Use it to find which jobs feed a gold table, or what breaks if you change a silver table.', 'Who reads and writes what.'],
          ['The audit log', 'The table `system.access.audit` holds audit events for the workspaces of your region, with a free retention of 365 days at the time of writing. Use it for questions such as who changed a grant, who queried a sensitive table.', 'Who did what, and when.'],
          ['Cost and jobs', 'Other system tables hold billing usage and job runs: `system.billing.usage`, and `system.lakeflow.job_run_timeline` with `system.lakeflow.jobs`. Mission 10 uses them to find the costly job.', 'The same SQL for the bill.'],
          ['Access to the tables', 'System tables are read-only and need privileges like any table. An admin grants them to the people who should look.', 'Granted, not open.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-lineage-sql', t: 2, src: 'docs', title: 'Find what feeds a gold table', file: 'sql editor', lang: 'sql', code: LINEAGE,
        steps: [
          { say: 'This query lists what was written into the gold revenue table, and from where. Each row is one read-and-write relation that Unity Catalog saw.', lines: [1, 3] },
          { say: 'Sort by the newest event first and keep the list short. If a source you did not expect appears, someone added a new input.', lines: [4, 5] }
        ],
        note: 'Column names follow the documentation of the lineage system tables when I wrote this. If a query fails, check the current column list.'
      }),

      B.code({
        id: 'm7-audit-sql', t: 3, src: 'docs', title: 'Who touched Unity Catalog this week', file: 'sql editor', lang: 'sql', code: AUDIT,
        steps: [
          { say: 'The audit table has one row for each event: when it happened, the user, the service and the action.', lines: [1, 2] },
          { say: 'Filter by service and by a date range. The date column lets Databricks skip old partitions, so the query stays cheap.', lines: [3, 4] },
          { say: 'Sort by time. Look for grant changes and unexpected readers. Save the query as a dashboard for the security team.', lines: [5, 5] }
        ]
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'A teammate sets up access for two people on the production catalog. Click a line that breaks the rules of good governance.',
        file: 'access.sql', lang: 'sql', code: BUG, bad: [1, 2],
        hint: 'Look at who receives the grants, and how much power the first one gives.',
        why: 'Both lines grant to **individual people**. When Alice or Bob changes team or leaves, someone must find and remove each grant. The first line also gives `ALL PRIVILEGES` on the whole production catalog to one person. Grant to a group, and give only the privileges the role needs.',
        fix: BUGFIX,
        cheer: 'Grants to groups are the first thing a reviewer checks.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: how do you lay out catalogs?',
        scenario: 'Brewline has development, test and production, and three data domains: orders, marketing and finance. Production data must not be readable from the development workspace. The team has **8 engineers** and wants a layout that is easy to explain.',
        opts: [
          { t: 'One catalog for everything, with schemas such as `dev_orders` and `prod_orders`', d: 'One place to look.', lose: 'The environments share one catalog, so a grant or a mistake at catalog level touches production and development together. You cannot bind the catalog to one workspace.' },
          { t: 'One catalog for each environment: `brewline_dev`, `brewline_test`, `brewline_prod`, each with schemas for the layers and domains', d: 'Environment is the top level.' },
          { t: 'One catalog for each person or team', d: 'Every team has its own.', lose: 'The number of catalogs grows with the number of people. Nobody can say where a table lives, and every new team repeats the setup.' }
        ],
        pick: 1,
        why: 'The documentation presents environment-based catalogs as a common default, with roughly 3 to 10 catalogs for each metastore. You can bind `brewline_prod` to the production workspace only, so the development workspace cannot reach it even for a user with a grant. Grants and ownership go to groups.',
        when: 'For a large organisation with independent data domains, a catalog for each domain suits a data mesh. Many teams combine both: a domain and an environment in the catalog name.'
      }),

      B.qa({
        id: 'qa-uc', t: 1, tag: 'Catalog', secs: 60,
        q: 'What is Unity Catalog, and what problem does it solve?',
        pts: ['A governance layer for data and AI assets on Databricks', 'Three-level names: catalog.schema.table', 'Grants with SQL on names instead of storage keys', 'One metastore for each region, shared by workspaces', 'Lineage and audit through system tables', 'Row filters, column masks and managed storage'],
        short: 'Unity Catalog is the governance layer of Databricks. It gives every table a three-part name, `catalog.schema.table`, and controls access with SQL grants on those names. Without it, access control sits on storage paths: whoever holds the key to a folder reads everything in it.\n\nA metastore holds the catalogs, one for each region, and all workspaces in that region share it, so a grant applies everywhere. Principals come from the account, which on Azure means Microsoft Entra ID.\n\nOn top it records lineage and audit events that I can query as system tables, and it supports column masks and row filters for personal data. For a reader I grant `USE CATALOG`, `USE SCHEMA` and `SELECT` to a group. Say which parts you know from the documentation and which parts you have used yourself.',
        fu: [
          ['What is the difference between a catalog and a schema?', 'A catalog is the top level, usually one for each environment. A schema groups tables inside it, for example one for each layer.'],
          ['What is a volume?', 'A governed folder for files that are not tables. You address it as `/Volumes/catalog/schema/volume/path`.']
        ],
        trap: 'Saying it is "a data catalog like a search page". It also enforces access and records lineage.',
        real: 'Say which catalogs and groups your team set up, and one grant you had to debug.'
      }),

      B.qa({
        id: 'qa-grants', t: 2, tag: 'Catalog', secs: 90,
        q: 'How do you give analysts, engineers and a pipeline job the right access in Unity Catalog?',
        pts: ['Define groups at the account level, from the identity provider', 'Analysts: USE CATALOG, USE SCHEMA, SELECT on gold', 'Engineers: write in dev, read in prod', 'A service principal runs the production job with MODIFY on the layers it writes', 'Grant at the schema level so new tables inherit', 'Give ownership of production objects to groups'],
        short: 'I start with groups from the identity provider, defined at the account level, and I never grant to individuals. Analysts get `USE CATALOG`, `USE SCHEMA` and `SELECT` on the gold schema, and nothing on bronze or silver. Engineers get write access in the development catalog and read access in production.\n\nThe production pipeline runs as a **service principal**, not as a person. It gets `MODIFY` and `SELECT` on the schemas it writes. I keep direct `MODIFY` on production for service principals only.\n\nI grant at the schema level so that new tables inherit the privilege. Metastore-level grants do not inherit, so I use the catalog level or below. Ownership of production catalogs and schemas goes to a group. I bind the production catalog to the production workspace, and I run `SHOW GRANTS` in reviews.',
        fu: [
          ['What is a service principal?', 'An identity for an application or job, not a person. On Azure it is an Entra ID service principal. It has no password in your code when you use a managed identity or OIDC.'],
          ['How do you stop the dev workspace from reading prod?', 'Bind the production catalog to the production workspace. Other workspaces are denied even when a user holds a grant.']
        ],
        trap: 'Listing privileges without saying groups, service principals and inheritance.',
        real: 'Describe the groups of your team and one access problem you solved.'
      }),

      B.qa({
        id: 'qa-mask', t: 2, tag: 'Catalog', secs: 90,
        q: 'How do you protect personal data, such as emails, in Unity Catalog?',
        pts: ['Restrict who can read the table with grants', 'Column mask: a function applied to the column', 'Row filter: a function that returns the rows a user may see', 'The function checks group membership', 'Applies in every tool and workspace', 'Owners or MANAGE plus SELECT attach them; detach before dropping the function'],
        short: 'I use layers. First I limit who can read the table at all, with grants to groups. Then I protect the sensitive column with a **column mask**: a SQL function that Unity Catalog applies whenever someone reads the column. For emails, members of a `pii_readers` group see the real value and everyone else sees `***@` and the domain. I attach it with `ALTER TABLE ... ALTER COLUMN ... SET MASK`.\n\nFor rows, I use a **row filter**, which is a function that returns true for the rows a user may see, for example only the US customers for most people. A table can have one.\n\nBecause the rule is attached to the table, it applies in every tool and every workspace, so nobody can forget it. I need ownership of the table, or `MANAGE` and `SELECT`, to attach one. I drop the mask or filter from the table before I drop its function, otherwise the table becomes unreadable. For many tables I would use the attribute-based policies that the documentation describes.',
        fu: [
          ['What if the mask function has a bug?', 'Every query on the table uses it, so a bug affects everyone. Test it with a user from each group before you attach it.'],
          ['Do masks protect the files in storage?', 'No. They apply to queries through Unity Catalog. Someone with direct storage access can read the files, so protect the storage too.']
        ],
        trap: 'Saying "we encrypt the column". A mask controls what a reader sees. It is not encryption at rest.',
        real: 'Describe a sensitive column you protected and how you tested each group.'
      }),

      B.qa({
        id: 'qa-managed', t: 2, tag: 'Catalog', secs: 60,
        q: 'What is the difference between a managed and an external table, and what does DROP do to each?',
        pts: ['Managed: Unity Catalog manages the files in its storage', 'External: files at your path under an external location', 'Managed DROP removes the table and marks the files for deletion', 'UNDROP within the recovery period, 7 days by default', 'External DROP removes metadata only', 'Choose managed for tables your pipelines own'],
        short: 'A managed table stores its files in storage that Unity Catalog manages for the catalog or schema. Databricks can run maintenance on it, such as compaction and cleanup. An external table keeps its files at a path I choose, under a registered external location, and I do the maintenance.\n\nA `DROP TABLE` on a managed table removes the table and marks its files for deletion. The documentation gives a recovery period, 7 days by default, in which `UNDROP TABLE` brings it back. A `DROP` on an external table removes only the metadata, and the files stay in storage.\n\nI use managed tables for the layers that my pipelines own, and external tables only when another system must read or write the same files. For external tables I protect the storage path myself, because Unity Catalog privileges do not apply to direct file access.',
        fu: [
          ['Can you change the recovery period?', 'The documentation says it can be set to 0 hours, which disables undrop, or to a number of days within a range. Check the current page for the limits.'],
          ['What happens to the files of a dropped managed table?', 'Databricks deletes them later, at some point after the recovery period. Do not rely on the exact moment.']
        ],
        trap: 'Saying that dropping an external table deletes the data. It does not.',
        real: 'Tell about a table you moved between managed and external, and why.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Catalog Steward', color: '#DDD6FE',
        pts: [
          'Names have **three levels**: catalog, schema, table. A metastore holds the catalogs, one for each region.',
          'A reader needs **USE CATALOG, USE SCHEMA and SELECT**. A grant at catalog or schema level is **inherited**.',
          'Grant to **groups**. Run production jobs as a **service principal**. Give ownership to groups.',
          'A **mask** and a **row filter** are functions attached to the table. Detach them before dropping the function.',
          '**Managed** tables: a drop can be undone within the recovery period. **External** tables: a drop leaves the files.',
          'A **storage credential** plus a path make an **external location**. Grant on the location.',
          '**System tables** hold lineage and audit.'
        ],
        lines: [
          'I grant to groups and I check with SHOW GRANTS.',
          'I attach masks to tables, so nobody can forget them.',
          'I read lineage before I change a table.'
        ]
      })
    ]
  });
})();
