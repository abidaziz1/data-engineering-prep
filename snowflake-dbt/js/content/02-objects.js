/* Mission 2: what dbt builds in Snowflake, statement by statement. */
(function () {
  var B = LAB.b, G = LAB.get;

  function hd(k, re, w) { return '`' + G.head(G.stmt(k, re), w || 86) + '`'; }
  var STG = G.stmt('run_all_dev', /^create or replace view \S*stg_brewline__customers\s/);
  var TEST = G.stmt('tests_generic', /where order_id is null/);
  var MERGE = G.stmt('snapshot_second', /^merge into/);
  var PY = G.stmt('python_model', /^WITH /);
  var CONTRACT = G.stmt('run_all_dev', /^create or replace transient table \S*fct_daily_revenue\s/);
  G.expect(G.wrapped('snapshot_second', /^merge into/), 'the snapshot merge is wrapped in begin and commit');
  G.expect(/^create or replace transient table/.test(G.stmt('snapshot_first', /^create or replace/)), 'snapshots are transient by default');
  G.expect(/^create or replace table/.test(G.stmt('snapshot_permanent', /^create or replace/)), 'transient: false makes the snapshot permanent');
  var SNAPCFG = G.file('scenario/project_snapshots_permanent.yml');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'What dbt builds in Snowflake', short: 'Objects', blurb: 'Views, tables, settings and the SQL behind them', minutes: 36,
    focus: ['stg', 'int', 'mart'],
    goals: [
      'Say which **statement** dbt sends for a view, a table, a seed, a snapshot and a test.',
      'Explain **transient** tables, and when you turn the default off.',
      'Choose settings such as **copy grants**, **cluster by**, **secure views** and **dynamic tables**, and name what each costs.',
      'Read the statement of a **contract**, a **snapshot** and a **Python model**.'
    ],
    say: 'Mission 2 opens the box. A dbt model is a SELECT in a file. What reaches Snowflake is a statement around it. Once you can read that statement, you can predict what a model costs, who can see it and how it fails.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, title: 'One model, one statement',
        say: 'dbt does not copy data. For each model it sends a statement that wraps your SELECT. Press Next for the four you meet most.',
        items: [
          ['A view', 'Staging and intermediate models are views here. dbt sends ' + hd('run_all_dev', /^create or replace view \S*stg_brewline__customers\s/, 70) + '. Snowflake stores only the query.', 'No data stored, always current.'],
          ['A table', 'Marts are tables. dbt sends ' + hd('run_all_dev', /^create or replace transient table \S*dim_customers\s/, 70) + ' followed by `as (` and your SELECT. The word **transient** is the adapter\'s default, and it matters for cost and recovery.', 'Data stored, rebuilt on every run.'],
          ['A merge', 'An incremental model sends the same table statement on its first run. After that it sends a ' + hd('incr_merge', /^merge into/, 60) + ' statement that touches only new rows. Mission 3 covers it.', 'The first run builds. Later runs update.'],
          ['A count', 'A test is a query. dbt wraps it in `select count(*) as failures ...` and reads one row back. Nothing is created, and the warehouse still runs it.', 'Tests cost compute too.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm2-code', t: 1, title: 'A staging model, as Snowflake receives it', file: 'sent to Snowflake', lang: 'sql', code: STG,
        steps: [
          { say: 'This is the real statement for the customers staging model, recorded from a run in a developer schema. Press Next to read it.', lines: null },
          { say: 'The wrapper is dbt\'s. It creates or replaces a view. The name has three parts: the database BREWLINE_DEV, the developer schema DEV_ALICE and the model name.', lines: G.span(STG, /^create or replace view/, /^  as \(/) },
          { say: 'This is your model. It lowers the email and upper-cases the country code. dbt added nothing to it.', lines: G.span(STG, /^    select/, /^    tier/) },
          { say: 'The FROM clause names BREWLINE.raw.customers. In the model it was a `source()` call. dbt replaced it with the real table, in the production database, because RAW has only one copy.', lines: G.span(STG, /^from /, /^from /) }
        ],
        note: 'A view takes no storage and no compute to create. The query runs each time someone reads the view, on the reader\'s warehouse.'
      }),

      B.cmp({
        id: 'm2-cmp', t: 1, title: 'Which statement does each object send?',
        say: 'Here is every kind of object in the Brewline project, with the first line of the statement dbt really sent. Press Next to read them in groups.',
        cols: ['Object', 'First line of the statement', 'Result in Snowflake', 'Sent when'],
        hl: 1,
        rows: [
          ['Staging model', hd('run_all_dev', /^create or replace view \S*stg_brewline__customers\s/), 'A view', 'Every run'],
          ['Mart model', hd('run_all_dev', /^create or replace transient table \S*dim_customers\s/), 'A transient table', 'Every run'],
          ['Incremental model, first run', hd('incr_first_run', /^create or replace transient table/), 'A transient table', 'The first run, or `--full-refresh`'],
          ['Incremental model, later runs', hd('incr_merge', /^merge into/), 'Rows merged into the table', 'Every run after the first'],
          ['Seed', hd('seed_dev', /^create transient table/) + ', then `insert overwrite into ... values (%s,%s),...`', 'A transient table, filled by bound values', '`dbt seed`'],
          ['Snapshot, first run', hd('snapshot_first', /^create or replace transient table/), 'A transient table', 'The first `dbt snapshot`'],
          ['Snapshot, later runs', hd('snapshot_second', /^merge into/), 'Old rows closed, new rows added', 'Every `dbt snapshot`'],
          ['Test', '`select count(*) as failures, ...` over the test SQL', 'Nothing is created', '`dbt test`, `dbt build`'],
          ['Python model', hd('python_model', /^WITH /), 'A transient table, written by a procedure', 'Every run']
        ],
        steps: [
          { upto: 3, say: 'Views, tables and the first run of an incremental model. All of them say `create or replace`, so a run replaces the object in one step.' },
          { upto: 7, say: 'Merges, seeds and snapshots. A seed is filled with bound values, so it suits small reference files and nothing big.' },
          { upto: 9, say: 'Tests and Python models. A test reads data and creates nothing. A Python model runs inside Snowflake as a stored procedure.' }
        ],
        pick: 'Read the statement before you tune a model. The word at the front tells you what kind of object you get, and the words after it tell you what it costs.'
      }),

      B.talk({
        id: 'm2-transient', t: 1, title: 'Transient or permanent?',
        say: 'Look again at the table statements. They all say transient. The adapter chose that, not you. Press Next to see what it means.',
        items: [
          ['What transient means', 'A transient table has **no Fail-safe** and at most **1 day of Time Travel**. A permanent table has Fail-safe, which is 7 more days in which only Snowflake support can recover data, and Time Travel of 1 day or more, up to 90 days on higher editions. This comes from Snowflake\'s documentation.', 'Less protection, less storage.'],
          ['Why dbt picks it', 'Most dbt tables can be rebuilt from RAW in minutes. Paying for 7 days of Fail-safe copies of a table that you replace every night buys nothing. Transient tables keep that storage cost down.', 'Rebuildable data does not need Fail-safe.'],
          ['When to turn it off', 'Turn it off for tables you **cannot** rebuild. The clearest case is a snapshot: it holds history that RAW has already overwritten. The recording below shows the setting.', 'History needs protection.'],
          ['The setting', 'One line in `dbt_project.yml` changes it for a folder or a resource type. For snapshots it is `+transient: false`. The next screen shows the statement before and after.', 'Set it where the data lives.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm2-snaptr', t: 1, title: 'A snapshot, transient and permanent',
        say: 'I ran the same snapshot twice. The only difference is one line in dbt_project.yml. Press Next to compare the first line of each statement.',
        cols: ['Setting', 'First line of the statement', 'Protection'],
        hl: 1,
        rows: [
          ['Default', hd('snapshot_first', /^create or replace/), 'No Fail-safe. Time Travel of 1 day at most.'],
          ['`+transient: false`', hd('snapshot_permanent', /^create or replace/), 'Fail-safe and the Time Travel period of your account.']
        ],
        steps: [
          { upto: 1, say: 'The default. History that took months to collect has less protection than a mart that you rebuild in 20 minutes.' },
          { upto: 2, say: 'With the setting, the word transient disappears. Put this in the project file, not in each snapshot, so a new snapshot cannot forget it.' }
        ],
        pick: 'Snapshot tables are the one place where **permanent** is the right default. Everything you can rebuild from RAW can stay transient.'
      }),

      B.widget({ id: 'm2-lab', t: 1, kind: 'cfg', title: 'Lab: ten settings, ten sets of statements' }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'You write a model with `materialized=\'table\'` and no other setting. Which statement does dbt-snowflake send?',
        opts: [
          { t: '`create or replace table ... as (select ...)`', fb: 'That is a permanent table. The adapter adds the word transient unless you set transient=false.' },
          { t: '`create or replace transient table ... as (select ...)`', fb: '' },
          { t: '`create table if not exists ...`, then `insert into ...`', fb: 'dbt replaces a table in one statement. It does not create and fill it in two.' },
          { t: '`create or replace view ... as (select ...)`', fb: 'A view is what `materialized=\'view\'` gives you.' }
        ],
        ok: 1, why: 'The recorded statement for every table in this course starts with `create or replace transient table`. One statement replaces the old table, so readers see either the old table or the new one.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'Brewline wants **BI roles to keep read access** after every nightly rebuild of a mart. Which setting in the model makes dbt grant it again after each build?',
        opts: [
          { t: '`grants={\'select\': [\'REPORTER\']}`', fb: '' },
          { t: '`transient=false`', fb: 'That changes the protection of the table. It does not grant anything.' },
          { t: '`cluster_by=[\'tier\']`', fb: 'That changes how the data is sorted.' },
          { t: '`secure=true`', fb: 'That hides a view\'s definition. It does not grant access.' }
        ],
        ok: 0, why: 'A table that dbt replaces is a new object, and a new object has no privileges. The `grants` setting makes dbt send one `grant select ... to REPORTER` after every create. The lab showed the statements.'
      }),

      B.code({
        id: 'm2-contract', t: 2, title: 'A contract changes the create statement', file: 'sent to Snowflake', lang: 'sql', code: CONTRACT,
        steps: [
          { say: 'fct_daily_revenue has an enforced contract in the model file. Here is what that did to the statement. Press Next.', lines: null },
          { say: 'The create statement now lists the columns and their types before the SELECT. Without a contract, Snowflake would infer them from the query.', lines: G.span(CONTRACT, /^  \(/, /^    \)/) },
          { say: 'The column `order_date` says `not null`. Snowflake enforces NOT NULL. If the query returned a null date, the statement would fail and the old table would stay.', lines: G.span(CONTRACT, /order_date date not null/, /order_date date not null/) },
          { say: 'The SELECT is wrapped so that dbt can check the names and types of its columns before the table is created.', lines: G.span(CONTRACT, /^    select order_date/, /model_subq/) }
        ],
        note: 'Snowflake enforces `not null`. It accepts `primary key`, `unique` and `foreign key` constraints but does not enforce them on standard tables. A contract protects the shape of the table. A `unique` test protects the values.'
      }),

      B.code({
        id: 'm2-snap', t: 1, title: 'A snapshot closes old rows with a merge', file: 'sent to Snowflake on the second dbt snapshot', lang: 'sql', code: MERGE,
        steps: [
          { say: 'On the second run, dbt first builds a temporary table with the rows that changed. Then it sends this merge. Press Next.', lines: null },
          { say: 'The merge compares the snapshot with the changed rows on `dbt_scd_id`, a hash of the key and the update time.', lines: G.span(MERGE, /^merge into/, /^    on DBT/) },
          { say: 'A matched row that is still open, and that the staging table marks as an update or a delete, gets its `dbt_valid_to` filled in. That closes the old version.', lines: G.span(MERGE, /^    when matched/, /set dbt_valid_to/) },
          { say: 'A new version is inserted with an empty `dbt_valid_to`. It is the current row.', lines: G.span(MERGE, /^    when not matched/, /^        values/) }
        ],
        note: 'In the recording dbt wrapped this merge in `begin` and `commit`, so closing the old row and inserting the new one happen together.'
      }),

      B.code({
        id: 'm2-test', t: 1, title: 'A test is a counting query', file: 'sent to Snowflake by dbt test', lang: 'sql', code: TEST,
        steps: [
          { say: 'This is the not_null test on order_id, as dbt sent it. Press Next.', lines: null },
          { say: 'The inner query is the test: it returns the rows that break the rule.', lines: G.span(TEST, /^select order_id/, /where order_id is null/) },
          { say: 'The wrapper counts those rows. A count of zero means the test passes.', lines: [1, 4] },
          { say: 'dbt reads one row back and compares the count with the warn and error thresholds. Snowflake never sees the words pass or fail.', lines: G.span(TEST, /dbt_internal_test/, /dbt_internal_test/) }
        ],
        note: 'Every test is one statement on the warehouse. A project with 400 tests sends 400 small queries each build. That is rarely the biggest cost, but it is worth a look when a build is slow.'
      }),

      B.code({
        id: 'm2-py', t: 2, title: 'A Python model becomes a stored procedure', file: 'sent to Snowflake', lang: 'sql', code: PY,
        steps: [
          { say: 'This is one statement. dbt wrapped the Python of a model in a Snowpark procedure and called it. Press Next to read the parts.', lines: null },
          { say: 'The definition says which Python version and which package to use. The procedure runs as the caller, so it has the role of the dbt session.', lines: G.span(PY, /^WITH /, /^AS$/) },
          { say: 'This is the model from the file. It reads a staged table, drops cancelled orders and counts orders per customer.', lines: G.span(PY, /^import snowflake/, /^# This part is user provided/) },
          { say: 'dbt supplies the plumbing. Here it turns `dbt.ref("stg_brewline__orders")` into the full table name.', lines: G.span(PY, /^def ref/, /return dbt_load_df_function/) },
          { say: 'At the end dbt writes the result with `save_as_table`. The table is transient again, in line with the default.', lines: G.span(PY, /^def materialize/, /save_as_table/) },
          { say: 'The last line calls the procedure. The Python runs on the warehouse of the session, so it uses credits like any other statement.', lines: [G.at(PY, /^CALL /), G.at(PY, /^CALL /)] }
        ],
        note: 'Python models suit work that SQL does badly. For plain joins and aggregates, SQL is simpler to review and test. The packages you can import come from what Snowflake offers in your account.'
      }),

      B.cmp({
        id: 'm2-dyn', t: 2, title: 'Dynamic tables next to the other options',
        say: 'dbt can also create dynamic tables, which Snowflake refreshes on its own. Press Next to compare them with the options you already know.',
        cols: ['', 'View', 'Table', 'Incremental model', 'Dynamic table'],
        hl: 4,
        rows: [
          ['Who refreshes it', 'Nobody. It is a query.', 'dbt, on every run', 'dbt, on every run', 'Snowflake, to meet a target lag'],
          ['Compute used', 'When someone reads it', 'During a dbt run', 'During a dbt run', 'At every refresh, on the warehouse in its definition, even when dbt is idle'],
          ['Freshness', 'Always current', 'As of the last run', 'As of the last run', 'Within the target lag, as a goal'],
          ['You control', 'The query', 'The query and the schedule', 'The query, the filter and the strategy', 'The query and the lag'],
          ['Main risk', 'A slow dashboard', 'A build that grows with the data', 'Missing or duplicate rows', 'Credits nobody planned for']
        ],
        steps: [
          { upto: 2, say: 'Who refreshes it, and which warehouse pays. A dynamic table is the only option that keeps spending after dbt stops.' },
          { upto: 4, say: 'Freshness and control. You trade the exact moment of a refresh for not writing the filter yourself.' },
          { upto: 5, say: 'The risk. A dynamic table is easy to create and easy to forget. Review the lag and the warehouse like a scheduled job.' }
        ],
        pick: 'Use a **dynamic table** when you can state the freshness you need and the query is allowed to refresh incrementally. Keep **incremental models** when you need control over the filter and the strategy.'
      }),

      B.quiz({
        id: 'm2-q3', t: 2,
        q: 'Brewline turns `fct_orders` into a dynamic table with a target lag of 1 hour, then pauses the nightly dbt job for a week. What happens to the table?',
        opts: [
          { t: 'Nothing. It stays as it was until dbt runs again', fb: 'That describes a table model. A dynamic table is refreshed by Snowflake.' },
          { t: 'Snowflake keeps refreshing it on the warehouse in its definition, and the credits keep being used', fb: '' },
          { t: 'Snowflake drops it, because dbt no longer manages it', fb: 'Snowflake does not drop objects when a tool stops running.' },
          { t: 'It turns into a view', fb: 'The object type does not change.' }
        ],
        ok: 1, why: 'A dynamic table refreshes on its own to meet the lag. dbt only creates or changes its definition. So the cost continues while dbt is paused, and you stop it by suspending or dropping the table.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the statements for one mart table in order, when the model has a `grants` setting.',
        items: [
          'dbt asks which objects exist in the schema',
          'dbt sends `create or replace transient table ... as (select ...)`',
          'dbt sends `grant select on ... to REPORTER`',
          'dbt sends `grant select on ... to ANALYST`',
          'The models that read this table start building'
        ],
        why: 'Look around, create, grant, then the children. The grants come after the create because the replaced table is a new object with no privileges.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, title: 'Decision: transient or permanent marts?',
        scenario: 'Brewline\'s marts are rebuilt every night from RAW in **20 minutes**. RAW is permanent, loaded by a pipeline that keeps its own copies for 90 days. The finance lead asks for **"7 days of recovery on the marts"**.',
        opts: [
          { t: 'Make every mart permanent with a longer Time Travel period', d: 'Keeps old versions of each table.', lose: 'Each nightly replace leaves a full old copy that you pay to store for the whole Time Travel period plus Fail-safe. You buy recovery of data you can rebuild in 20 minutes.' },
          { t: 'Keep the marts transient, and protect RAW and the snapshots', d: 'A bad release is fixed by deploying the fix and rebuilding in 20 minutes.' },
          { t: 'Copy every mart to a backup schema each night', d: 'A second copy of each table.', lose: 'It doubles storage and adds a job that can fail, and it recovers a state that dbt can rebuild.' }
        ],
        pick: 1,
        why: 'Recovery should follow what you **cannot** recreate. The marts come from RAW and code, so transient is enough. RAW and the snapshots hold the irreplaceable data, so they get the permanent tables and the longer retention.',
        when: 'If a mart holds data that no code produces, such as manual corrections, or if a rebuild takes a day, make it permanent.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, title: 'Incident: the dashboard breaks every morning', time: '08:50',
        alert: 'Every morning the finance dashboard fails with **insufficient privileges** on `dim_customers`, until someone runs a grant script at 09:00. The nightly dbt job succeeds.',
        clues: ['The error starts right after the nightly run', 'The grants were issued by hand months ago', 'The mart is built with `create or replace transient table`'],
        opts: [
          { t: 'Declare the grants in the dbt config so every run grants them again', fb: '' },
          { t: 'Move the grant script to 03:00', fb: 'It hides the problem. When the script fails, the dashboard breaks again, and nobody sees why.' },
          { t: 'Give the REPORTER role ownership of the mart', fb: 'Ownership lets the dashboard role drop the table, and it blocks dbt\'s own role from replacing it.' },
          { t: 'Stop replacing the table and append rows instead', fb: 'It changes the model to work around a missing grant, and it adds duplicates.' }
        ],
        best: 0,
        why: 'The recorded statement is `create or replace`. A replaced table is a new object, so the privileges of the old one are gone. The `grants` config makes dbt grant again after each build. A grant on future tables in the schema is a good second layer.',
        checks: [
          ['Read the model statement', 'dbt sent `create or replace transient table`. The object is replaced.'],
          ['Show the grants', 'Run `show grants on table` before and after the nightly run. The privilege exists before and is gone after.'],
          ['Pick the fix', 'Put `grants` in the model or in `dbt_project.yml`. Add `copy grants` only if you need the privileges kept without dbt\'s help.'],
          ['Add a second layer', 'Grant select on future tables in the schema to the BI role, so any new object starts with access.'],
          ['Verify', 'Run the model, check `show grants`, and open the dashboard.']
        ],
        tell: 'The dashboard failed every morning right after the nightly run. dbt replaces the mart with create or replace, and a replaced table is a new object with no privileges. I declared the grants in the dbt config so every run grants them again, added a future grant on the schema as a second layer, and removed the manual script. I verified with show grants after a run.',
        prevent: ['Declare **grants in the dbt project**, not by hand', 'Use **future grants** on the schema for new objects', 'Add a **check** that the BI role can read each mart after a build', 'Review any **manual** grant script in code review']
      }),

      B.qa({
        id: 'qa-obj', t: 1, tag: 'Objects', secs: 60,
        q: 'What does dbt actually send to Snowflake for a table model, and why does it matter?',
        pts: ['One create statement wraps the SELECT: create or replace transient table ... as (select ...)', 'A view sends create or replace view and stores only the query', 'The adapter makes tables transient by default', 'A replaced table is a new object: grants do not carry over', 'Reading the statement predicts cost, access and failure'],
        short: 'For a table model dbt sends one statement: `create or replace transient table <database>.<schema>.<model> as (<my select>)`. For a view it sends `create or replace view`. I can see them in the logs or the query history.\n\nTwo details matter. First, dbt-snowflake makes tables transient by default, which means no Fail-safe and at most one day of Time Travel. That is right for tables I can rebuild from RAW, and wrong for snapshots, so I set `+transient: false` for those. Second, `create or replace` makes a new object, so the privileges of the old one are gone. I declare grants in dbt, or copy grants, so the dashboard keeps access after every build.\n\nBecause the statement is a single replace, readers see the old table or the new one, never half of one. When a model is slow, expensive or inaccessible, I read the statement first.',
        fu: [
          ['What is Fail-safe?', 'A 7-day period after Time Travel, for permanent tables only, in which only Snowflake support can recover data. Transient tables do not have it.'],
          ['What changes for a view?', 'Nothing is stored and no compute is used to create it. The query runs each time somebody reads it.']
        ],
        trap: 'Saying dbt "copies the data". It sends SQL, and Snowflake does the work.',
        real: 'Tell about a model whose statement you read to find a cost or access problem.'
      }),

      B.qa({
        id: 'qa-transient', t: 2, tag: 'Objects', secs: 75,
        q: 'Transient or permanent tables in a dbt project? When do you change the default?',
        pts: ['Transient: no Fail-safe, Time Travel up to 1 day', 'Default for rebuildable layers: staging, marts', 'Permanent for what you cannot rebuild: snapshots, manual data', 'Set it in dbt_project.yml by folder or resource type', 'Recovery follows what cannot be recreated'],
        short: 'I keep the adapter default for anything that I can rebuild from RAW and code. Transient tables have no Fail-safe and at most one day of Time Travel, so I do not pay to store seven extra days of copies of a mart that I replace every night.\n\nI change the default for data I cannot recreate. The clearest case is snapshots, because they hold history that the source has already overwritten. I set `+transient: false` for the snapshot folder in `dbt_project.yml`, so a new snapshot cannot forget it, and I raise Time Travel there if the edition allows. The same goes for tables that hold manual corrections.\n\nThe rule I use is that recovery follows what cannot be recreated. RAW and snapshots get the protection. Marts get a good deployment process instead.',
        fu: [
          ['Where do you set it?', 'In `dbt_project.yml` with `+transient: false` for a folder or a resource type, or in one model\'s config.'],
          ['What does permanent cost?', 'Storage for the Time Travel period and the 7 days of Fail-safe, for every version a replace leaves behind.']
        ],
        trap: 'Making everything permanent "to be safe". It raises storage cost for tables you can rebuild.',
        real: 'Name a table you made permanent on purpose, and why.'
      }),

      B.qa({
        id: 'qa-dyn', t: 2, tag: 'Objects', secs: 75,
        q: 'When would you use a dynamic table instead of an incremental dbt model?',
        pts: ['Dynamic table: Snowflake refreshes to meet a target lag', 'It uses its own warehouse at every refresh, even when dbt is idle', 'Good when you can state the freshness and the query can refresh incrementally', 'Incremental model: you control the filter, strategy and schedule', 'dbt creates the definition; it does not run the refresh'],
        short: 'I use a dynamic table when I can state the freshness the business needs, such as "within one hour", and the query is simple enough for Snowflake to refresh incrementally. Then Snowflake decides when to refresh, and I do not maintain a filter or a schedule.\n\nI keep an incremental model when I need control: a specific filter on the load time, a lookback window for late rows, a merge strategy, or a backfill of one day. I also keep it when I want the refresh inside a dbt run, with tests before the children build.\n\nTwo cautions with dynamic tables. They refresh on the warehouse named in their definition, so they use credits even when dbt is idle, and I review the lag and the size like a scheduled job. And dbt only creates or alters the definition, so tests do not sit between a refresh and its readers the way they do in `dbt build`.',
        fu: [
          ['What is the target lag?', 'The maximum staleness that Snowflake tries to keep. A shorter lag means more refreshes and more credits.'],
          ['What can stop an incremental refresh?', 'Some query shapes cannot refresh incrementally, and Snowflake then refreshes fully. Check the refresh mode in Snowflake.']
        ],
        trap: 'Calling a dynamic table "a better incremental model". It moves the control and the bill to Snowflake.',
        real: 'Describe a table where you chose one over the other and what you measured.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Object Builder', color: '#BBF7D0',
        pts: [
          'A model becomes **one statement**: create or replace view, create or replace transient table, merge, or a count for a test.',
          'dbt-snowflake makes tables **transient** by default. Make **snapshots** permanent.',
          'A replaced table is a **new object**: grants do not carry over. Declare `grants` in dbt.',
          '**Contracts** put columns and types in the create statement. Snowflake enforces `not null` only.',
          'A **dynamic table** keeps refreshing and spending after dbt stops.'
        ],
        lines: [
          'I read the statement before I tune the model.',
          'Recovery follows what I cannot rebuild.',
          'A replaced table has no grants until dbt grants them.'
        ]
      })
    ]
  });
})();
