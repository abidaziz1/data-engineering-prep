/* Mission 5: Time Travel, Fail-safe, zero-copy clones and recovery. */
(function () {
  var B = LAB.b;

  var TT = [
    '-- 1. Read the table as it was 10 minutes ago',
    'SELECT COUNT(*) FROM core.orders AT(OFFSET => -60*10);',
    '',
    '-- 2. Read it just before a statement ran',
    'SELECT COUNT(*) FROM core.orders',
    "  BEFORE(STATEMENT => '01b2c3d4-0000-1234-0000-000000000001');",
    '',
    '-- 3. Restore: clone the old state, then swap it in',
    'CREATE TABLE core.orders_restore CLONE core.orders',
    "  BEFORE(STATEMENT => '01b2c3d4-0000-1234-0000-000000000001');",
    'ALTER TABLE core.orders SWAP WITH core.orders_restore;',
    '',
    '-- 4. A dropped table can be brought back',
    'UNDROP TABLE core.orders;'
  ].join('\n');

  var CLONE = [
    '-- 1. A full dev copy of production in seconds, with no extra storage at first',
    'CREATE DATABASE BREWLINE_DEV CLONE BREWLINE;',
    '',
    '-- 2. Clone one schema as it was yesterday at 9 AM',
    'CREATE SCHEMA BREWLINE_DEV.CORE_YESTERDAY CLONE BREWLINE.CORE',
    "  AT(TIMESTAMP => '2026-03-13 09:00:00'::TIMESTAMP_LTZ);",
    '',
    '-- 3. A snapshot before a risky change',
    'CREATE TABLE core.orders_before_fix CLONE core.orders;',
    '',
    '-- 4. Clean up when you are done',
    'DROP DATABASE BREWLINE_DEV;'
  ].join('\n');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Time Travel, clones and recovery', short: 'Recovery', blurb: 'Undo mistakes, copy without copying, plan for outages', minutes: 24,
    focus: ['raw'],
    goals: [
      'Query or restore data **as it was** with Time Travel, and bring back dropped objects.',
      'Explain **Time Travel, Fail-safe, clones and replication**, and which one fixes which problem.',
      'Make a **zero-copy clone** for dev or for a snapshot, and say what it costs.',
      'Recover from an **accidental DELETE** in a calm, ordered way.'
    ],
    say: 'Mission 5 is about mistakes. Somebody will delete the wrong rows one day, and how you respond decides whether it is a five minute fix or a bad week. The tools here are a Snowflake strength.',
    scenes: [
      B.flow({
        id: 'm5-layers', t: 1, title: 'Layers of data protection', g: 'protect', legend: true,
        steps: [
          { say: 'Snowflake protects your data in layers. Three of them form a timeline for mistakes, and two are separate tools. Press Next to walk the timeline first.', cap: 'Some layers you use yourself. One only Snowflake can use.' },
          { say: 'You change or drop data. Snowflake never edits a micro-partition, so the old partitions are kept, and they move into Time Travel.', on: ['p1'], focus: ['cur', 'tt'], tags: ['tg_tt'], cap: 'For the retention period you can query the old state with **AT** or **BEFORE**, and bring dropped objects back with **UNDROP**.' },
          { say: 'When the retention period ends, a permanent table\'s old data moves into Fail-safe for 7 more days. You cannot query it. Only Snowflake Support can try to recover it.', on: ['p2'], focus: ['tt', 'fs'], tags: ['tg_fs'], cap: 'Fail-safe is a **last resort**, not a backup you can plan on. Transient and temporary tables have none.' },
          { say: 'After Fail-safe the old partitions are purged and the storage is released.', on: ['p3'], focus: ['fs', 'gone'], cap: 'From here on, the only copy is one you made yourself.' },
          { say: 'A clone is a different tool. It creates a new table, schema or database in seconds by pointing at the same partitions. No data is copied until one side changes.', on: ['p4'], focus: ['cur', 'clone'], cap: 'Clones are for **dev copies and snapshots** before risky changes.' },
          { say: 'Replication keeps a copy of databases, or a whole account, in another region or cloud. It protects against an outage, not against a mistake, because a DELETE replicates too.', on: ['p5'], focus: ['cur', 'repl'], cap: '**Time Travel is for mistakes. Replication is for outages.**' }
        ]
      }),

      B.widget({ id: 'm5-tt-lab', t: 1, title: 'Lab: rescue the deleted rows', kind: 'tt' }),

      B.sql({
        id: 'm5-tt-sql', t: 1, title: 'Time Travel in SQL', file: 'worksheet: recovery.sql', code: TT,
        ctx: { role: 'SYSADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'Time Travel adds two small clauses to a query, plus UNDROP. Press Next.', lines: null },
          { say: 'AT with an offset reads the table as it was that many seconds ago. Minus 600 seconds is ten minutes. Press Run.', lines: [1, 2], run: true },
          { say: 'BEFORE with a statement ID reads the table just before a specific statement ran. You find the ID in Query History, so this is exact. No guessing a time.', lines: [4, 6] },
          { say: 'To restore, clone the table as it was and swap the clone in. A clone is zero-copy, so this is fast even for a huge table. Check grants and dependent objects after a swap.', lines: [8, 11] },
          { say: 'A dropped table, schema or database comes back with UNDROP, as long as it is inside the retention period.', lines: [13, 14] }
        ],
        result: { cols: ['COUNT(*)'], rows: [['10000']], msg: '1 row' },
        note: '**Retention:** 1 day by default. Up to 90 days for permanent tables on Enterprise edition or higher. Transient and temporary tables get at most 1 day. Set it with `DATA_RETENTION_TIME_IN_DAYS` on an account, database, schema or table. dbt builds **transient** tables by default.'
      }),

      B.cmp({
        id: 'm5-compare', t: 1, title: 'Which protection fixes which problem',
        say: 'Four features, four jobs. Interviewers like to ask which one you would use for a given problem. Press Next to see each row.',
        cols: ['', 'Time Travel', 'Fail-safe', 'Zero-copy clone', 'Replication and failover'],
        rows: [
          ['What it does', 'Queries or restores a past state, and undrops objects', 'Last-resort recovery of permanent tables', 'An instant copy of a table, schema or database that shares storage', 'Keeps a copy in another region or cloud'],
          ['Who uses it', 'You, with SQL', 'Snowflake Support only', 'You, with SQL', 'You set it up. Failover is an admin action'],
          ['How long', '1 day by default, up to 90 on Enterprise', '7 days after Time Travel, permanent tables only', 'Until you drop it', 'Continuous, on a refresh schedule you set'],
          ['What it costs', 'Storage for the old partitions', 'Storage for 7 more days of changes', 'Nothing at first, then storage for changed partitions', 'Storage in the target, plus transfer and refresh compute']
        ],
        steps: [
          { upto: 2, say: 'What each one does and who can use it. Only Fail-safe is out of your hands.' },
          { upto: 3, say: 'How long each one lasts. Time Travel is the one you tune.' },
          { upto: 4, say: 'And what each costs. Retention is storage. More days of Time Travel on a high-churn table is expensive.' }
        ],
        pick: '**Time Travel** for mistakes. **Clones** for dev copies and snapshots before risky changes. **Replication** for outages and disaster recovery. Never plan around Fail-safe: it is a safety net you cannot test.'
      }),

      B.widget({ id: 'm5-clone-lab', t: 1, title: 'Lab: zero-copy clone', kind: 'clone' }),

      B.sql({
        id: 'm5-clone-sql', t: 1, title: 'Clone for dev and for snapshots', file: 'worksheet: clone.sql', code: CLONE,
        ctx: { role: 'SYSADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'The CLONE keyword works on tables, schemas and databases. Press Next to see four uses.', lines: null },
          { say: 'A whole database cloned in seconds. Developers get production-shaped data and pay for storage only as they change it.', lines: [1, 2] },
          { say: 'A clone can combine with Time Travel. This one captures a schema as it stood yesterday at 9 AM, which is handy for comparing before and after a bug.', lines: [4, 6] },
          { say: 'A snapshot before a risky change. If the fix goes wrong, the original data is one rename away.', lines: [8, 9] },
          { say: 'Drop clones when you are done. Every partition that changed after the clone keeps costing storage until you do.', lines: [11, 12] }
        ],
        note: 'A clone does **not** copy the privileges granted on the source object itself, so grant access on the clone again. Plan for sensitive data too: a dev clone of production contains production data.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the life of deleted data in order.',
        items: [
          'A DELETE runs and Snowflake writes new micro-partitions without those rows',
          'The old partitions move into Time Travel',
          'You can query or restore them yourself until the retention period ends',
          'Permanent tables move into Fail-safe for 7 days, and only Snowflake Support can recover them',
          'The old partitions are purged'
        ],
        why: 'Immutable micro-partitions make the whole chain possible. Nothing is edited. Old versions are kept for a while, first for you and then for Snowflake only.'
      }),

      B.incident({
        id: 'm5-inc', t: 1, title: 'Incident: someone deleted the orders', time: '14:25',
        alert: 'Dashboards show **zero orders**. At 14:05 an analyst ran `DELETE FROM core.orders` in the wrong browser tab. The table is empty and a task is about to rebuild the marts from it.',
        clues: ['The table keeps 7 days of Time Travel', 'Marts rebuild from `core.orders` every 15 minutes', 'Nobody has run anything else on the table since 14:05'],
        opts: [
          { t: 'Pause the task that rebuilds the marts, find the DELETE in Query History, then restore from just before that statement', fb: '' },
          { t: 'Reload everything from the files in S3', fb: 'Slow, and it will not match data that came from other paths or later updates. It is the fallback, not the first move.' },
          { t: 'Open a Snowflake Support ticket for Fail-safe recovery', fb: 'Fail-safe is for data past Time Travel. This data is minutes old and you can restore it yourself.' },
          { t: 'Run INSERT statements for the orders you remember', fb: 'Guessing from memory loses data and takes hours.' }
        ],
        best: 0,
        why: 'First **stop the damage spreading**: the task would copy the empty table into the marts. Then use Time Travel, which gives an exact restore point and needs no guessing.',
        checks: [
          ['Stop the spread', 'Suspend the task or pipeline that reads `core.orders`, so empty data does not flow into the marts.'],
          ['Find the statement', '`QUERY_HISTORY` for the DELETE: copy its query ID and start time.'],
          ['Prove the old state exists', '`SELECT COUNT(*) FROM core.orders BEFORE(STATEMENT => <id>)` should match the expected row count.'],
          ['Restore safely', '`CREATE TABLE ... CLONE ... BEFORE(STATEMENT => <id>)` into a new table, validate it, then swap it in or insert the missing rows.'],
          ['Resume and verify', 'Resume the task, rebuild the marts, compare row counts with the source, and tell stakeholders when numbers are right again.']
        ],
        tell: 'An analyst deleted all rows from the orders table at 14:05. I suspended the task that feeds the marts so the empty table would not spread, found the statement in query history, and cloned the table from just before it ran. I validated the row count, swapped the restored table in, resumed the pipeline and confirmed the dashboards. The data gap was 20 minutes and nothing was lost.',
        prevent: ['Limit **DELETE and TRUNCATE** to pipeline roles, not to analysts', 'Clone a table before any manual repair', 'Keep **7 days or more** of Time Travel on important tables', 'Alert when a table\'s row count drops sharply', 'Make manual production changes go through a reviewed pull request']
      }),

      B.decide({
        id: 'm5-dec', t: 2, title: 'Decision: how much Time Travel?',
        scenario: 'Brewline has **RAW** tables (append-only, all files are kept in S3), **CORE** tables (rebuilt by SQL from RAW), and **MARTS** that dashboards read. One RAW table, `web_events`, holds **12 TB** and gets a lot of daily inserts. The account is on Enterprise edition.',
        opts: [
          { t: '90 days of Time Travel everywhere', d: 'The longest setting, so you are always covered.', lose: 'Retention is storage you pay for. On a high-churn, 12 TB table it costs a lot, and most of the data can be rebuilt from files in S3 anyway.' },
          { t: 'Retention by how hard the data is to rebuild', d: 'Short on tables you can rebuild, longer on tables that are expensive to reproduce.' },
          { t: '0 days everywhere, to save storage', d: 'Make every table transient with no history.', lose: 'The first accidental DELETE becomes a rebuild from scratch, and you lose UNDROP. The saving is small compared with one bad incident.' }
        ],
        pick: 1,
        why: 'Set retention from **how hard the data is to rebuild and how fast it changes**. `web_events` can be reloaded from S3, so a short retention or a transient table is enough. CORE and MARTS are rebuilt by SQL, so a few days is plenty. Keep longer retention, 7 to 30 days, on small tables that cannot be rebuilt, such as reference data edited by hand.',
        when: 'Choose **90 days** on small, critical, hand-edited tables or when an audit requires it. Choose **shorter** retention for high-churn tables where the storage cost grows with every change.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A permanent table with 1 day of Time Travel is dropped by mistake 3 hours ago. What is the fastest fix?',
        opts: [
          { t: 'UNDROP TABLE', fb: '' },
          { t: 'Restore from the last nightly backup', fb: 'Snowflake does not take nightly backups for you. Time Travel is the built-in tool.' },
          { t: 'Open a Fail-safe request with Snowflake Support', fb: 'Fail-safe starts only after Time Travel ends. The table is still inside its 1 day window.' },
          { t: 'Recreate the table and reload from files', fb: 'It works, but it is slower, and it loses any data that did not come from those files.' }
        ],
        ok: 0, why: '`UNDROP TABLE` restores a dropped table, with its data, while it is inside the Time Travel period. It takes a moment and needs no support ticket.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'Why can Snowflake clone a 20 TB database in seconds?',
        opts: [
          { t: 'A clone copies only metadata. It points at the same immutable micro-partitions', fb: '' },
          { t: 'It copies the data in the background with a very fast network', fb: 'No data is copied at clone time. Copying 20 TB would take far longer than seconds.' },
          { t: 'It compresses the data first so there is less to copy', fb: 'Compression does not explain it. Nothing is copied.' },
          { t: 'It clones only the table definitions, not the data', fb: 'The clone contains the data. It reaches it by pointing at the same partitions.' }
        ],
        ok: 0, why: 'Micro-partitions are **immutable**, so two tables can share them safely. Storage grows only when one side changes data and new partitions are written.'
      }),

      B.quiz({
        id: 'm5-q3', t: 2,
        q: 'dbt builds your staging tables as transient tables by default. What does that mean for recovery?',
        opts: [
          { t: 'At most 1 day of Time Travel and no Fail-safe', fb: '' },
          { t: 'They cannot be queried with AT or BEFORE at all', fb: 'Transient tables support Time Travel, up to 1 day.' },
          { t: 'They have the same protection as permanent tables', fb: 'Transient tables trade protection for lower storage cost.' },
          { t: 'They are deleted when the session ends', fb: 'That describes temporary tables, not transient ones.' }
        ],
        ok: 0, why: 'A **transient** table keeps Time Travel for at most 1 day and has **no Fail-safe**. That is the right trade for tables that you can rebuild. Use permanent tables for data you cannot reproduce.'
      }),

      B.talk({
        id: 'm5-repl', t: 3, title: 'Replication and failover',
        say: 'Time Travel does not help if a whole region goes down. This is the tool for that.',
        items: [
          ['Replication groups', 'A **replication group** copies selected objects, such as databases, shares, users, roles and warehouses, to another account on a schedule. The copy is read-only until you promote it.', 'Replication keeps a second copy, refreshed on a schedule.'],
          ['Failover groups', 'A **failover group** adds the ability to **promote** the secondary account to primary during an outage, and to fail back later. Failover of account objects needs Business Critical edition or higher.', 'Failover turns the copy into the primary.'],
          ['Clients and connections', 'A **connection** object gives applications a stable URL, so after a failover they reconnect to the new primary without a code change.', 'Use a connection URL so clients follow the failover.'],
          ['What it does not do', 'Replication copies your mistakes too. A DELETE on the primary replicates. Time Travel and clones stay the tools for human error. Test a failover at least once a year, so the first time is not during a real outage.', 'Replication is for outages. Test the failover.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-tt', t: 1, tag: 'Recovery', secs: 60,
        q: 'Explain Time Travel, Fail-safe and zero-copy cloning.',
        pts: ['Time Travel: query or restore past states, undrop, 1 to 90 days', 'Fail-safe: 7 more days for permanent tables, Snowflake Support only', 'Clone: metadata-only copy that shares immutable partitions', 'Retention depends on edition and table type', 'Costs: old partitions and changed data take storage'],
        short: 'All three rely on immutable micro-partitions. Snowflake never edits a partition, so old versions can be kept. Time Travel lets me query a table as of a time or before a statement, and restore it or undrop an object. The default is 1 day, up to 90 days on Enterprise, and at most 1 day for transient and temporary tables.\n\nFail-safe is 7 more days after Time Travel for permanent tables. Only Snowflake Support can recover from it, so I treat it as a last resort. A zero-copy clone creates a new table, schema or database by pointing at the same partitions, in seconds, with no extra storage until data changes. I use clones for dev copies and for snapshots before risky changes. The cost of all of this is storage for old and changed partitions.',
        fu: [
          ['How would you restore a table after a bad DELETE?', 'Pause what reads it, find the statement in Query History, clone the table from BEFORE that statement into a new table, validate the row count, then swap it in or insert the missing rows.'],
          ['Can you query a table in Fail-safe?', 'No. Fail-safe data is not accessible to users. Only Snowflake Support can attempt recovery, with no guarantee about time or outcome.']
        ],
        trap: 'Calling Fail-safe a backup. It is not one you can use or test, so a plan that depends on it is not a plan.'
      }),

      B.qa({
        id: 'qa-devcopy', t: 2, tag: 'Recovery', secs: 60,
        q: 'How would you give developers a safe copy of production data?',
        pts: ['Zero-copy clone of the database or schemas', 'Protect sensitive columns: masking or a sampled, masked copy', 'Own roles for developers, and a small dev warehouse with a resource monitor', 'Refresh on a schedule or per branch, and drop old clones', 'Grants are not copied, so set them on the clone'],
        short: 'I clone production into a dev database. It takes seconds and uses almost no extra storage, because the clone shares micro-partitions with production until someone changes data. Before developers see it I deal with sensitive columns: masking policies, or a sampled and masked copy, so PII does not leak into dev.\n\nA clone does not carry the grants made on the source object, so I give developers their own roles, and a small dev warehouse with a resource monitor so experiments cannot run up a bill. I refresh the clone on a schedule, or per feature branch in CI where each run clones, builds, tests and drops. Dropping old clones matters because every changed partition keeps costing storage.',
        fu: [
          ['Does the clone change production?', 'No. A clone is independent. Changes to either side create new partitions for that side only.'],
          ['What if production data is too sensitive even for a masked clone?', 'Use synthetic or sampled data, or run development in a separate account with an anonymized dataset, and keep real data in production only.']
        ],
        trap: 'Cloning production and handing it over unchanged. A clone contains real customer data, so it carries the same compliance duties as production.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Time Traveler', color: '#FDE68A',
        pts: [
          'Immutable micro-partitions let Snowflake keep old versions: that gives **Time Travel**, **Fail-safe** and **clones**.',
          '**Time Travel**: `AT` and `BEFORE` to read the past, `UNDROP` to restore objects. 1 day by default, up to 90 on Enterprise, at most 1 for transient.',
          '**Fail-safe**: 7 more days, permanent tables only, Snowflake Support only. A last resort.',
          '**Zero-copy clone**: instant, shares partitions, costs storage only for changes. Grants are not copied.',
          '**Time Travel is for mistakes, replication is for outages.**'
        ],
        lines: [
          'I restore from just before the bad statement by cloning, then validate before I swap.',
          'I set retention by how hard the data is to rebuild, not one value for everything.',
          'I never plan around Fail-safe, because I cannot test it.'
        ]
      })
    ]
  });
})();
