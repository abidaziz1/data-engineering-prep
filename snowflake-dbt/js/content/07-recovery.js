/* Mission 7: Time Travel, clones, undrop, and protecting what dbt cannot rebuild. */
(function () {
  var B = LAB.b, G = LAB.get;

  var RESTORE = [
    '-- Case 1: rows were changed or deleted in place. The table still exists.',
    "select count(*) from BREWLINE.MARTS.FCT_ORDERS at(timestamp => '2026-03-18 02:00:00 +00:00'::timestamp_ltz);",
    '',
    'create table BREWLINE.MARTS.FCT_ORDERS_RESTORED',
    "    clone BREWLINE.MARTS.FCT_ORDERS at(timestamp => '2026-03-18 02:00:00 +00:00'::timestamp_ltz);",
    '',
    'alter table BREWLINE.MARTS.FCT_ORDERS swap with BREWLINE.MARTS.FCT_ORDERS_RESTORED;',
    '',
    '-- Case 2: the table was replaced or dropped. The old version is a dropped table.',
    'alter table BREWLINE.MARTS.FCT_ORDERS rename to FCT_ORDERS_BAD;',
    'undrop table BREWLINE.MARTS.FCT_ORDERS;'
  ].join('\n');
  var BUGRESTORE = [
    'create table BREWLINE.MARTS.FCT_ORDERS_RESTORED',
    "    clone BREWLINE.MARTS.FCT_ORDERS at(timestamp => '2026-03-18 02:00:00');",
    '',
    'alter table BREWLINE.MARTS.FCT_ORDERS swap with BREWLINE.MARTS.FCT_ORDERS_RESTORED;'
  ].join('\n');
  var BUGRESTOREFIX = [
    'create table BREWLINE.MARTS.FCT_ORDERS_RESTORED',
    "    clone BREWLINE.MARTS.FCT_ORDERS at(timestamp => '2026-03-18 02:00:00 +00:00'::timestamp_ltz);",
    '',
    'alter table BREWLINE.MARTS.FCT_ORDERS swap with BREWLINE.MARTS.FCT_ORDERS_RESTORED;'
  ].join('\n');
  var SWAP = [
    'create schema BREWLINE.MARTS_NEXT clone BREWLINE.MARTS;',
    '-- dbt builds and tests into MARTS_NEXT here',
    'alter schema BREWLINE.MARTS swap with BREWLINE.MARTS_NEXT;'
  ].join('\n');
  var SNAP_CFG = G.file('scenario/project_snapshots_permanent.yml');
  G.expect(/^create or replace transient table/.test(G.stmt('snapshot_first', /^create or replace/)), 'a snapshot is transient by default');
  G.expect(/^create or replace table/.test(G.stmt('snapshot_permanent', /^create or replace/)), 'transient: false makes the snapshot permanent');
  G.expect(/^create or replace/.test(G.stmt('run_all_dev', /fct_orders\s/)), 'dbt replaces tables');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Recovery: Time Travel and clones', short: 'Recovery', blurb: 'Undo a bad release and protect history', minutes: 32,
    focus: ['snap'],
    goals: [
      'Explain **Time Travel**, **UNDROP** and **Fail-safe**, and which retention a dbt-built table gets.',
      '**Restore** a table, in the two cases: changed in place, and replaced or dropped.',
      'Respond to a **bad release**: stop, scope, compare, fix, rebuild.',
      'Protect the data **dbt cannot rebuild**: snapshots, RAW and manual data.'
    ],
    say: 'Mission 7 is about the bad day. A wrong calculation reaches production, a table is replaced with an empty one, or somebody drops a schema. Snowflake keeps old versions of your data for a while. Whether you can use them depends on settings you made weeks before the incident.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, title: 'Four safety nets',
        say: 'Snowflake gives you four ways to get data back. Press Next for each. The details come from Snowflake\'s documentation. dbt does not recover data, so none of this was recorded.',
        items: [
          ['Time Travel', 'Lets you query, clone or restore a table as it was at an earlier moment, inside the retention period. The default is **1 day**. Permanent tables on higher editions can have up to 90 days. Transient tables have 0 or 1 day.', 'Look at the past, inside the window.'],
          ['UNDROP', 'Brings back a dropped table, schema or database, inside the same period. A table that dbt replaced with `create or replace` counts as dropped, so UNDROP can bring back the old version.', 'Undo a drop or a replace.'],
          ['Clone', 'A copy of a table, schema or database as of now or of an earlier time, made in seconds. It is how you check a restore before you put it in place.', 'A cheap copy to inspect.'],
          ['Fail-safe', 'For permanent tables only: 7 days after Time Travel ends, in which only Snowflake support can recover data. It is for disasters, and you cannot use it yourself.', 'The last resort.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm7-sql', t: 1, title: 'Two cases, two restores', file: 'restore.sql (written by hand, not recorded)', lang: 'sql', code: RESTORE,
        steps: [
          { say: 'There are two situations, and they need different commands. Press Next. This is the SQL you practise in a scratch schema before you need it.', lines: null },
          { say: 'Case 1. Rows were changed or deleted in place, and the table still exists. First look at the table as it was at an earlier time, to find the last good moment.', lines: G.span(RESTORE, /^select count/, /^select count/) },
          { say: 'Then clone the table as of that moment under a new name. It takes seconds, and you can compare it with the live table before you do anything else.', lines: G.span(RESTORE, /^create table/, /clone BREWLINE/) },
          { say: 'When it is right, swap the two names. The table that had the problem becomes FCT_ORDERS_RESTORED, and you keep it for the investigation.', lines: G.span(RESTORE, /swap with/, /swap with/) },
          { say: 'Case 2. The table was replaced or dropped. This is what dbt does every night. The old version is a dropped table, and the new empty one has no history before its creation.', lines: G.span(RESTORE, /^-- Case 2/, /^-- Case 2/) },
          { say: 'Rename the new table out of the way, because UNDROP needs the name to be free. Then bring the old one back.', lines: G.span(RESTORE, /rename to FCT_ORDERS_BAD/, /^undrop/) }
        ],
        note: 'Write the timestamp with a time zone, as here. A plain string is read in the time zone of your session, and a scheduler and a laptop can mean different moments.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'dbt replaced `fct_orders` with an empty table at 14:04 using `create or replace`. It is 14:20. Which step brings back the data?',
        opts: [
          { t: 'Query the new table with `at(timestamp => ...)` for 14:03', fb: 'The new table was created at 14:04. It has no history before that.' },
          { t: 'Rename the empty table, then `undrop table` on the original name', fb: '' },
          { t: 'Ask Snowflake support to use Fail-safe', fb: 'Transient tables have no Fail-safe, and support is not a first step.' },
          { t: 'Run `dbt run` again', fb: 'dbt would rebuild from RAW. It works if you have time, and it does not restore the old table.' }
        ],
        ok: 1, why: 'A replaced table is a new object. The old one is a dropped table, still inside its retention period. UNDROP needs the name to be free, so you rename the empty table first. Practise this once in a scratch schema, so you know it works in your account.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put these in order, from the hardest to rebuild to the easiest.',
        items: [
          'snap_customers: history that the source has already overwritten',
          'RAW orders: the only copy in Snowflake of what the loaders brought',
          'fct_orders: rebuilt from RAW in about 20 minutes',
          'stg_brewline__orders: a view, with nothing stored'
        ],
        why: 'Protect what cannot be recreated. The snapshot has no other source. RAW has the loader as a source, which may keep copies for a limited time. The mart is a rebuild. The view stores nothing.'
      }),

      B.cmp({
        id: 'm7-ret', t: 1, title: 'Which tables get which protection',
        say: 'Retention is a setting per object. Press Next to see what the Brewline design gives each kind of table.',
        cols: ['Table', 'Kind', 'Time Travel', 'Fail-safe', 'Why'],
        hl: 4,
        rows: [
          ['RAW tables', 'Permanent', 'As long as the edition allows, for example 7 days', 'Yes', 'The only copy in Snowflake of loaded data'],
          ['Snapshots', 'Permanent (`+transient: false`)', 'As long as the edition allows, for example 7 days', 'Yes', 'History that nothing else holds'],
          ['Marts', 'Transient (the default)', '1 day', 'No', 'Rebuilt from RAW and code in minutes'],
          ['Staging views', 'View', 'None', 'None', 'Nothing is stored']
        ],
        steps: [
          { upto: 2, say: 'The two kinds of data you cannot recreate get the longest protection. The snapshot setting is one line in the project file: `' + SNAP_CFG.split('\n').filter(function (l) { return /transient/.test(l); })[0].trim() + '`.' },
          { upto: 4, say: 'Everything that dbt can rebuild stays cheap. Recovery there is a deployment, not a restore.' }
        ],
        pick: 'Spend protection where the data is **irreplaceable**. For the rest, a tested way to **rebuild** is the safety net.'
      }),

      B.bug({
        id: 'm7-bug', t: 2, q: 'The engineer restores `fct_orders` to 02:00 in the morning and swaps it in. The numbers are wrong by a few hours. Click the line that explains it.',
        file: 'restore.sql', lang: 'sql', code: BUGRESTORE, bad: G.at(BUGRESTORE, /clone BREWLINE\.MARTS\.FCT_ORDERS at/),
        hint: 'Which time zone does a plain timestamp string use?',
        why: 'A plain string is read in the time zone of the session. The engineer meant 02:00 UTC. Their session ran in another zone, so Snowflake restored a different moment. Write the zone in the literal, cast it to `timestamp_ltz`, or use `before(statement => ...)` with the query id of the bad statement, which names the exact moment.',
        fix: BUGRESTOREFIX,
        cheer: 'The query id of the bad statement is the most exact restore point.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, title: 'Decision: how long should Time Travel last?',
        scenario: 'Brewline has RAW tables, snapshot tables and marts. The finance lead asks for **"90 days of Time Travel on everything"**. The marts are fully replaced every night. Storage is billed per day for every retained version.',
        opts: [
          { t: '90 days on everything', d: 'The simplest answer.', lose: 'A table that is replaced every night keeps one full old copy per night for 90 days. You pay to store 90 copies of tables you can rebuild in 20 minutes.' },
          { t: '1 day on everything', d: 'The cheapest answer.', lose: 'The snapshots and RAW would have a single day of protection. A mistake found after a long weekend would be permanent.' },
          { t: 'A long period on RAW and snapshots, the default on marts, and a tested rebuild for the marts', d: 'Protection follows what cannot be recreated.' }
        ],
        pick: 2,
        why: 'Retention costs storage for every version that changes. Spend it where the data is irreplaceable. For the marts, the safety net is a tested rebuild from RAW, and a Time Travel clone is useful as a reference to compare against, not as the plan.',
        when: 'If a rebuild takes a day, or the mart holds manual data, treat it like RAW. The test is: how long would a rebuild take, and what would you lose?'
      }),

      B.incident({
        id: 'm7-inc', t: 2, title: 'Incident: revenue is 18% too high', time: '09:35',
        alert: 'Revenue on the finance dashboard is **18% higher** than yesterday for the same days. The nightly job passed every test. A release went out yesterday evening.',
        clues: ['The release changed how discounts are applied in `fct_orders`', 'The job rebuilt the marts at 03:00', 'Finance sends the numbers to a partner at 11:00'],
        opts: [
          { t: 'Pause the schedule, revert the release, and rebuild the affected models from RAW', fb: '' },
          { t: 'Restore every mart from Time Travel as of yesterday', fb: 'It brings back yesterday\'s numbers, and it forgets today\'s rows. It can be a quick patch, and the code is still wrong.' },
          { t: 'Change the dashboard to divide by 1.18', fb: 'It hides one number and leaves every other consumer wrong.' },
          { t: 'Leave it. The tests passed, so the numbers must be right', fb: 'Tests check what you wrote tests for. They did not check this calculation.' }
        ],
        best: 0,
        why: 'The marts are rebuilt from RAW, so the fix is code, followed by a rebuild. Pause first so the wrong numbers are not rebuilt again. A Time Travel clone from before the run is a useful reference to prove the rebuild is right.',
        checks: [
          ['Stop the schedule', 'Pause the job, so the next run does not repeat the damage.'],
          ['Scope the change', 'List the models in the release with `state:modified+`. Revenue flows from fct_orders to the daily revenue table and the dashboard.'],
          ['Make a reference', 'Clone `fct_orders` as of before the 03:00 run. Compare revenue by day with the live table. The difference starts at the release.'],
          ['Fix and rebuild', 'Revert the change, then build the affected models and their children. Incremental models need a full refresh, because old rows were written with the wrong rule.'],
          ['Verify and prevent', 'Compare with the reference clone. Add a reconciliation test of revenue against RAW.']
        ],
        tell: 'Revenue was 18 percent too high after a release that changed how discounts apply. I paused the schedule, listed the changed models, and cloned fct_orders from before the 03:00 run to use as a reference. The difference started with the release. I reverted the change, rebuilt the affected models and their children, with a full refresh for the incremental one, and compared the result with the reference. Then I added a test that reconciles revenue against RAW, so a wrong rule is caught before the numbers are published.',
        prevent: ['Add **reconciliation tests** against RAW for revenue and counts', 'Run a **full CI build** of a sample before large releases', 'Keep a **tested rebuild** of every mart', 'Hold the **partner send** until the morning check passes']
      }),

      B.talk({
        id: 'm7-swap', t: 3, title: 'Blue and green with a schema swap',
        say: 'Some teams never build into the schema that people read. Press Next for the idea and the care it needs.',
        items: [
          ['The idea', 'Clone the production schema, let dbt build and test into the clone, and swap the two names when the tests pass: `' + SWAP.split('\n')[2].replace(';', '') + '`. Readers see the old schema until the swap and the new one right after.', 'Build next to production, then swap.'],
          ['What it gives you', 'Readers never see half a build, and the previous version stays under the other name for a rollback.', 'Atomic release and an easy rollback.'],
          ['What it costs', 'Space for two versions, a clone at the start, and care with grants, policies and the objects that other tools point at. Practise it in a scratch schema and check what moves with the swap in your account.', 'More moving parts.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-tt', t: 1, tag: 'Recovery', secs: 60,
        q: 'What is Time Travel, and how does it fit with dbt?',
        pts: ['Query, clone or restore data as it was, inside the retention period', 'Default 1 day; up to 90 days for permanent tables on higher editions; transient 0 or 1 day', 'UNDROP brings back dropped objects, including a table that create or replace replaced', 'dbt-built tables are transient by default, so keep long retention for RAW and snapshots', 'Clone at a past time to compare before you restore'],
        short: 'Time Travel lets me look at a table, clone it or restore it as it was at an earlier moment, inside a retention period. The default is one day, permanent tables on higher editions can have up to ninety, and transient tables have zero or one. UNDROP brings back a dropped object, and that includes the old version of a table that dbt replaced with `create or replace`, because a replaced table is a new object and the old one counts as dropped.\n\nWith dbt, I think about what I can rebuild. The marts are transient by default, because I can rebuild them from RAW and code. RAW and the snapshots are permanent with a longer retention, because nothing else holds that data.\n\nWhen something goes wrong, I clone the table as of a moment before the problem, compare it with the live one, and then swap or undrop. I practise the commands in a scratch schema, because I do not want to learn the syntax during an incident.',
        fu: [
          ['What is the difference with Fail-safe?', 'Fail-safe starts when Time Travel ends, lasts 7 days, applies to permanent tables, and only Snowflake support can use it.'],
          ['What does retention cost?', 'Storage for every version that changes inside the period. A table replaced every night keeps one old copy per night.']
        ],
        trap: 'Describing Time Travel as a backup. It is a window of recent history, and it ends.',
        real: 'Describe a restore you did, with the commands and the time it took.'
      }),

      B.qa({
        id: 'qa-rollback', t: 2, tag: 'Recovery', secs: 90,
        q: 'A bad release changed numbers in the production marts. Walk me through your response.',
        pts: ['Pause the schedule to stop more damage', 'Scope: which models changed, since when, who reads them', 'Reference: clone the affected tables as of before the run', 'Fix forward: revert the code, rebuild affected models, full refresh for incremental', 'Compare with the reference; tell consumers', 'Prevent: reconciliation tests, release checks'],
        short: 'First I stop the damage: I pause the schedule so the next run does not rebuild the wrong numbers. Then I scope it. The release shows which models changed, and the graph shows which models and dashboards read them. I tell the owners of those dashboards what is wrong and since when.\n\nBefore I fix anything, I clone the affected tables as of a moment before the bad run. That gives me a reference to compare against.\n\nThen I fix forward. Because the marts come from RAW and code, I revert the change and rebuild the affected models and their children. Incremental models need a full refresh, because their old rows were written under the wrong rule. If a rebuild would take too long, I restore from the clone or with undrop, but that returns stale data and I treat it as a patch.\n\nAfter the rebuild I compare with the reference, confirm with the owners, and add a test that would have caught it.',
        fu: [
          ['When do you restore instead of rebuild?', 'When the rebuild is too slow for the deadline, or the data cannot be rebuilt. The restore is a patch, and the rebuild follows.'],
          ['How do you stop it happening again?', 'Reconciliation tests against RAW, a sample build in CI, and a morning check before numbers leave the company.']
        ],
        trap: 'Starting with the fix. First stop the damage, then scope, then fix.',
        real: 'Describe an incident where wrong numbers reached users, and what you changed afterwards.'
      }),

      B.qa({
        id: 'qa-protect', t: 2, tag: 'Recovery', secs: 60,
        q: 'How do you protect data that dbt cannot rebuild?',
        pts: ['Name it: snapshots, RAW, manual data', 'Permanent tables, not transient: +transient: false', 'Longer Time Travel on those tables only', 'Restrict who can drop or replace them', 'Clone to a separate backup schema or database on a schedule', 'Practise the restore'],
        short: 'First I name it. In the Brewline project that is the snapshots, because they hold history the source has overwritten, and the RAW tables. Anything people edit by hand is on that list too.\n\nFor those tables I choose permanent over transient, with `+transient: false` for snapshots in the project file, so a new snapshot cannot forget it. I give them a longer Time Travel period than the default, but only on those tables, because retention costs storage.\n\nI limit who can drop or replace them. The dbt role should not own the RAW tables. For snapshots I also take a scheduled clone into a backup schema, because Time Travel is a window and a clone is a copy that stays.\n\nAnd I practise the restore in a scratch schema, so that the commands are tested before an incident, not during one.',
        fu: [
          ['Why not make everything permanent?', 'You pay for Fail-safe and long retention on tables you can rebuild.'],
          ['Why a clone as well as Time Travel?', 'A clone is a copy that stays. Time Travel ends when the period ends.']
        ],
        trap: 'Answering with "backups" in general. The answer is what, where, how long, and who may delete it.',
        real: 'Name the table you protected and the setting you used.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Rewind Pilot', color: '#E9D5FF',
        pts: [
          '**Time Travel** looks back inside a retention window. Marts are transient with 1 day. Give **RAW and snapshots** more.',
          'A table changed **in place**: clone it at a past time, compare, swap.',
          'A table **replaced or dropped**: rename the new one, then `undrop`.',
          'A bad release: **pause, scope, reference, fix forward, verify**.',
          'Protect what you **cannot rebuild**. Practise the restore before you need it.'
        ],
        lines: [
          'Protection follows what I cannot recreate.',
          'I write the time zone in every restore time.',
          'I practise the restore in a scratch schema.'
        ]
      })
    ]
  });
})();
