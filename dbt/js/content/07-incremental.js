/* Mission 7: materializations and incremental models. */
(function () {
  var B = LAB.b, G = LAB.get;

  var FCT = G.file('models/marts/core/fct_orders.sql');
  var FCT_2 = G.sql('compiled/second/fct_orders');
  var BUGSQL = G.file('scenario/fct_orders_bug_ordered_at.sql');
  var LOOKBACK = G.file('scenario/fct_orders_lookback.sql');
  var EPH = G.sql('compiled/ephemeral/fct_orders');
  var LB = G.table('lookback_counts').rows[0];
  var pick = function (k, ids) { var t = G.where(k, 'order_id', ids); return t.rows; };

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Materializations and incremental models', short: 'Incremental', blurb: 'View, table, incremental, and the day rows change', minutes: 34,
    focus: ['air'],
    goals: [
      'Choose between **view**, **table**, **incremental** and **ephemeral**, and give a reason.',
      'Read an **incremental model** and say what it does on the first run and on later runs.',
      'Pick an **incremental strategy**: append, delete+insert, merge or microbatch.',
      'Avoid the classic bug: an incremental filter that **misses changed rows**.'
    ],
    say: 'Mission 7 is about time and cost. The same SELECT can be a view, a table or an incremental table, and the choice decides how fast your queries are, how long your build takes, and what it costs. Incremental models also hide the most common silent bug in dbt.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, title: 'Four ways to build the same SELECT',
        say: 'A materialization is how dbt turns your SELECT into something in the warehouse. Press Next for each one.',
        items: [
          ['View', 'dbt creates a view. Nothing is stored, and the query runs every time someone reads it. It is always fresh and cheap to build, and slow to read if the query is heavy.', 'Default for staging.'],
          ['Table', 'dbt rebuilds a table on every run. Reads are fast. Building costs the whole query every time, which is fine until the table gets big.', 'Default for marts.'],
          ['Incremental', 'The first run builds the whole table. Later runs process only the rows that are new or changed, and add them to the table. Builds stay fast as data grows, but you now own the rules for what counts as new.', 'For big tables that grow.'],
          ['Ephemeral', 'dbt creates nothing in the warehouse. The model becomes a CTE inside the models that read it. Good for tiny helpers, but it cannot be queried, tested on its own or inspected.', 'Small shared snippets only.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm7-cmp', t: 1, title: 'View, table, incremental or ephemeral?',
        say: 'Press Next to compare them on the things you will be asked about.',
        cols: ['', 'View', 'Table', 'Incremental', 'Ephemeral'],
        hl: 3,
        rows: [
          ['What is created', 'A view', 'A table, replaced each run', 'A table that grows', 'Nothing, a CTE'],
          ['Build time', 'Almost none', 'The full query every run', 'Only new rows, after the first run', 'None'],
          ['Read time', 'The query runs on every read', 'Fast', 'Fast', 'Part of the reading model\'s query'],
          ['Storage', 'None', 'Full copy', 'Full copy', 'None'],
          ['Freshness', 'Always current', 'As of the last run', 'As of the last run', 'Always current'],
          ['Risk', 'A slow dashboard', 'A build that grows with the data', 'Missing or duplicated rows if the rules are wrong', 'Hard to debug, repeats work in every model that uses it']
        ],
        steps: [
          { upto: 3, say: 'What each one is, and what it costs to build and to read.' },
          { upto: 5, say: 'Storage and freshness. A view is always current. A table or an incremental table is as old as its last run.' },
          { upto: 6, say: 'The risk of each. Incremental has the highest, because correctness depends on a filter you write.' }
        ],
        pick: 'Start with **views** for staging and **tables** for marts. Move a model to **incremental** only when the full build gets too slow or too costly, and write down why. Use **ephemeral** rarely.'
      }),

      B.code({
        id: 'm7-code', t: 1, title: 'An incremental model, line by line', file: 'models/marts/core/fct_orders.sql', lang: 'jinja', code: FCT,
        compiled: { label: 'What dbt sends on the second run, when the table exists', file: 'target/compiled/brewline/.../fct_orders.sql', code: FCT_2 },
        steps: [
          { say: 'This is the real fct_orders model. It builds the orders fact table. Press Next to read it.', lines: null },
          { say: 'The config says the model is incremental, that order_id identifies a row, and what to do when the model gets a new column. We come back to the last one.', lines: G.span(FCT, /^\{\{$/, /^\}\}$/) },
          { say: 'The query itself is an ordinary SELECT over the intermediate model. On the first run, this is all that runs, and it builds the whole table.', lines: G.span(FCT, /^select$/, /^from \{\{ ref/) },
          { say: 'The if block is the heart of it. is_incremental() is true only when the table already exists, and the run is not a full refresh.', lines: G.span(FCT, /is_incremental/, /endif/) },
          { say: 'So on later runs, the WHERE clause keeps only rows whose load time is newer than the newest load time already in the table. The special word this means this model\'s own table.', lines: G.span(FCT, /where loaded_at/) },
          { say: 'In the compiled version, this became the real table name. The warehouse only sees an ordinary query with a subquery on the existing table.', compiled: true, lines: G.span(FCT, /where loaded_at/), clines: G.span(FCT_2, /^where loaded_at/) }
        ],
        note: 'Filter on the column that moves **when a row changes**. Here that is the load time. The business date, `ordered_at`, does not change when an order is shipped.'
      }),

      B.flow({
        id: 'm7-flow', t: 1, title: 'What an incremental run does', g: 'incr', legend: true,
        steps: [
          { say: 'Here is a later run of fct_orders, step by step. Press Next to follow the data.', tags: ['tg_first'], cap: 'The very first run skips all of this: it just creates the table.' },
          { say: 'The model reads the intermediate model. It holds every version of every order, loaded since the beginning.', on: ['i1'], focus: ['up', 'filt'], cap: 'The input is large and mostly old.' },
          { say: 'The filter keeps only rows loaded after the newest row already in the table. Unchanged orders are never read again.', on: ['i2'], tags: ['tg_skip'], focus: ['filt', 'tmp'], cap: 'This is where the savings come from.' },
          { say: 'The new rows go into a temporary table, so the rest of the run does not depend on a slow query.', on: ['i3'], focus: ['tmp', 'del'], cap: 'The temp table lives only during the run.' },
          { say: 'With delete+insert, dbt deletes the rows in the target whose order_id is in the temp table. That removes the old version of every changed order.', on: ['i4'], focus: ['del', 'ins'], cap: 'This is what unique_key is for.' },
          { say: 'Then it inserts the rows from the temp table. The old version is gone, and the new one is in.', on: ['i5'], focus: ['ins', 'tgt'], cap: 'One row per order again.' }
        ]
      }),

      B.rows({
        id: 'm7-rows', t: 1, title: 'Day two: one order changes, one is new',
        steps: [
          {
            say: 'On day two the loader appends two rows to RAW: order O-5010 moved from PLACED to SHIPPED, and O-5011 is brand new. Their load time is 18 March at 09:00.',
            tabs: [{ layer: 'RAW', name: 'raw.orders, day two', c: 'raw', cols: G.table('raw_orders').cols, rows: G.where('raw_orders', 'order_id', ['O-5010', 'O-5011']).rows, trk: 1 }],
            notes: ['O-5010 has two rows now. O-5011 has one.']
          },
          {
            say: 'Before the run, fct_orders has O-5010 as PLACED, and no O-5011.',
            tabs: [{ layer: 'MART', name: 'fct_orders, before day two', c: 'mart', cols: G.table('fct_orders_day1').cols, rows: pick('fct_orders_day1', ['O-5010']), trk: 0 }]
          },
          {
            say: 'This is the SQL dbt ran for the update. It deletes the keys that arrive again and inserts the new versions. The temporary table has only the two new rows.',
            tabs: [],
            code: { file: 'target/run/brewline/.../fct_orders.sql', lang: 'sql', code: G.sql('run/day2/fct_orders') },
            notes: ['dbt used `delete+insert`, the default strategy of this adapter. Other adapters choose differently.']
          },
          {
            say: 'After the run: O-5010 is SHIPPED, with the new load time, and O-5011 is there. Eleven orders, each once.',
            tabs: [{ layer: 'MART', name: 'fct_orders, after day two', c: 'mart', cols: G.table('fct_orders_day2').cols, rows: pick('fct_orders_day2', ['O-5010', 'O-5011']), trk: 0, chg: [[0, 3], [0, 7]] }],
            notes: ['The yellow cells changed. All the older orders were left alone and never read.']
          }
        ]
      }),

      B.widget({ id: 'm7-lab', t: 1, kind: 'inc', title: 'Lab: five ways to run day two' }),

      B.term({
        id: 'm7-full', t: 1, title: 'Starting over with --full-refresh',
        say: 'Sometimes you want to rebuild an incremental table from scratch, for example after a logic change. The full refresh flag does that.',
        lines: function () { return G.term('full_refresh'); },
        after: 'The log looks like any other run, but this time `is_incremental()` was false, so the WHERE block disappeared and dbt created the table from the full query. The run SQL says `create table ... as`.',
        afterKind: 'tip',
        doneSay: 'Use full refresh after a change in the model logic. Expect it to take as long as the first build.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'This version of fct_orders runs without any error, and every test passes. Support says shipped orders still show PLACED. Click the line that causes it.',
        file: 'models/marts/core/fct_orders.sql', lang: 'jinja', code: BUGSQL, bad: G.at(BUGSQL, /where ordered_at >/),
        hint: 'When an order is shipped, which of its timestamps changes?',
        why: 'The filter looks at `ordered_at`, the time the customer placed the order. That never changes. When O-5010 ships, its new version has the **same** `ordered_at` as the old one, so the filter never picks it up and the table keeps the stale row. The new order O-5011 gets in, because it is newer. No test fails, because every key is still unique. Filter on a column that moves when the row changes, such as the load time.',
        fix: FCT,
        cheer: 'The quiet bugs are the expensive ones. Check an incremental filter by changing a row and watching it arrive.'
      }),

      B.rows({
        id: 'm7-bugrows', t: 1, title: 'What the bug left behind',
        steps: [
          {
            say: 'This is the real result of that run. The table has O-5010 as PLACED, loaded on March 17. The truth, in the intermediate model, says SHIPPED, loaded on March 18.',
            tabs: [
              { layer: 'MART', name: 'fct_orders (with the bug)', c: 'mart', cols: G.table('inc_bug_rows').cols, rows: G.table('inc_bug_rows').rows, trk: 0 },
              { layer: 'INTERMEDIATE', name: 'int_orders__with_items (truth)', c: 'int', cols: G.table('inc_bug_expected').cols, rows: G.table('inc_bug_expected').rows, trk: 0, chg: [[0, 1], [0, 3]] }
            ],
            ops: ['The two tables should agree. Compare them.'],
            notes: ['The model ran **successfully**. A green build does not prove a correct table.']
          }
        ]
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'What does an incremental model do on its **first** run, when the table does not exist yet?',
        opts: [
          { t: 'It fails, because there is nothing to compare with', fb: 'It does not fail. dbt checks whether the table exists.' },
          { t: 'It builds the whole table, because is_incremental() is false', fb: '' },
          { t: 'It builds an empty table', fb: 'Only the empty flag does that.' },
          { t: 'It builds only the last day of data', fb: 'There is no built-in notion of "last day". Your filter decides.' }
        ],
        ok: 1, why: 'On the first run `is_incremental()` is false, so the `if` block is skipped and dbt runs the full query inside `create table as`. You can see it in the compiled file for the first run, which has no WHERE clause.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'What does `unique_key` do in an incremental model?',
        opts: [
          { t: 'It tells dbt which column identifies a row, so a changed row replaces its older version', fb: '' },
          { t: 'It adds a unique test automatically', fb: 'It does not add any test. Write the unique test yourself.' },
          { t: 'It makes the column the primary key of the table', fb: 'dbt does not create a primary key.' },
          { t: 'It chooses which rows to read from the source', fb: 'The WHERE block does that.' }
        ],
        ok: 0, why: 'With delete+insert or merge, dbt uses `unique_key` to find the old version of a row and replace it. Without it, dbt can only append, which duplicates changed rows.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put an incremental run in order.',
        items: [
          'dbt checks that the table exists and that this is not a full refresh',
          'The model runs with the WHERE block, and only new or changed rows are selected',
          'They are written into a temporary table',
          'The old versions are removed, by delete or by merge',
          'The new rows are inserted into the target table',
          'The tests on the model run, and then its children build'
        ],
        why: 'Check, select, stage, replace, insert, test. The temporary table is why a failure in the middle leaves the real table in a known state.'
      }),

      B.cmp({
        id: 'm7-osc', t: 2, title: 'When the model gets a new column',
        say: 'You add a column to an incremental model. The table already has data. What should dbt do? The on_schema_change setting decides. I ran three of the four settings.',
        cols: ['Setting', 'What it does', 'What happened in the real run'],
        hl: 2,
        rows: [
          ['`ignore`', 'The default. The new column is dropped and the run goes on.', 'The run succeeded and the table still had eight columns. The new column is **missing**, quietly.'],
          ['`fail`', 'Stops the run with an error and asks you to decide.', 'The run failed with "The source and target schemas on this incremental model are out of sync".'],
          ['`append_new_columns`', 'Adds the new column to the table. Old rows get NULL.', 'The table gained `is_cancelled`. Old rows are NULL, the new order has false.'],
          ['`sync_all_columns`', 'Adds new columns and removes columns that are gone.', 'Not run here. It can drop data, so use it with care.']
        ],
        steps: [
          { upto: 2, say: 'Ignore and fail. One hides the problem and the other blocks the run until you decide.' },
          { upto: 4, say: 'Append adds the column, and sync also removes columns. Neither fills in the old rows. To backfill, run a full refresh.' }
        ],
        pick: 'Use **append_new_columns** when columns only get added, and **fail** when you want a person to decide. Avoid **ignore**, because it hides changes, and use **sync_all_columns** only when you accept losing columns.'
      }),

      B.term({
        id: 'm7-oscfail', t: 2, title: 'on_schema_change: fail',
        say: 'I added a boolean column to fct_orders and kept the setting at fail. Here is the real error.',
        lines: function () { return G.term('osc_fail'); },
        after: 'The error lists the **columns that exist in the source and not in the target**. It offers three ways out: set on_schema_change to append or sync, rebuild with a full refresh, or change the table by hand.',
        afterKind: 'warn',
        doneSay: 'A loud failure here is a feature. Somebody must decide what to do about the history.'
      }),

      B.rows({
        id: 'm7-oscrows', t: 2, title: 'append_new_columns: old rows stay NULL',
        steps: [
          {
            say: 'With append_new_columns the run succeeded and the table gained the new column. Look at what the old rows contain.',
            tabs: [{ layer: 'MART', name: 'fct_orders with is_cancelled', c: 'mart', cols: G.table('osc_rows').cols, rows: G.table('osc_rows').rows, trk: 2 }],
            notes: ['O-5001 and O-5005 were not loaded again, so `is_cancelled` is NULL for them, even for the cancelled order. Only the new order O-5012 has a value.', 'To fill in the old rows, run a **full refresh**.']
          }
        ]
      }),

      B.code({
        id: 'm7-look', t: 2, title: 'A lookback window for late rows', file: 'models/marts/core/fct_orders.sql', lang: 'jinja', code: LOOKBACK,
        steps: [
          { say: 'Rows sometimes arrive late, after a newer row has already been loaded. A strict "newer than the max" filter would miss them. A lookback window re-reads a little history every run. Press Next.', lines: null },
          { say: 'The only change is in the filter: instead of the newest load time, it uses the newest load time minus one day. So every run re-reads the last 24 hours of rows.', lines: G.span(LOOKBACK, /where loaded_at/) },
          { say: 'Re-reading is safe because of the unique key. A row that is read again deletes its own older copy and inserts itself, so it replaces itself instead of duplicating.', lines: G.span(LOOKBACK, /unique_key/) }
        ],
        note: 'I ran this version. After day two the table had ' + LB[0] + ' rows for ' + LB[1] + ' distinct orders, so re-reading did not create duplicates. The window size is a trade-off: a bigger one catches later rows and costs more on every run.'
      }),

      B.code({
        id: 'm7-eph', t: 2, title: 'Ephemeral: a model that becomes a CTE', file: 'target/compiled/brewline/.../fct_orders.sql', lang: 'sql', code: EPH,
        steps: [
          { say: 'I changed the intermediate layer to ephemeral and compiled fct_orders. Press Next to see what dbt did with it.', lines: null },
          { say: 'The intermediate model did not become a view. dbt pasted its whole query into fct_orders as a CTE called __dbt__cte__int_orders__with_items.', lines: G.span(EPH, /^with __dbt__cte__int_orders__with_items as/, /^\) select/) },
          { say: 'The final query reads from that CTE as if it were a table. Every model that refs an ephemeral model repeats its query, so a heavy ephemeral model gets run several times.', lines: G.span(EPH, /^\) select/, /^from __dbt__cte/) }
        ],
        note: 'Ephemeral models cannot be tested on their own or selected for inspection, because nothing exists in the warehouse. Prefer a view.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, title: 'Incident: shipped orders still show as placed', time: '10:20',
        alert: 'Support says orders that shipped yesterday still show **PLACED** in the orders dashboard. **The dbt build is green** and all tests pass.',
        clues: ['The dashboard reads fct_orders, an incremental model', 'New orders appear correctly. Only orders that changed are wrong', 'The incremental filter was edited two weeks ago'],
        opts: [
          { t: 'Compare one changed order in fct_orders with the source, and read the compiled incremental filter', fb: '' },
          { t: 'Add a unique test on order_id', fb: 'The keys are already unique. The rows are stale, not duplicated.' },
          { t: 'Scale up the warehouse', fb: 'Nothing is slow. The data is wrong.' },
          { t: 'Rebuild with --full-refresh and close the ticket', fb: 'It fixes the symptom today. Without the cause, the bug returns and nobody knows what else was stale.' }
        ],
        best: 0,
        why: 'Green tests and stale rows point at the **filter**. Comparing one changed order shows how it differs. The compiled SQL shows which column the filter uses, and the history shows what changed two weeks ago.',
        checks: [
          ['Pick a changed order', 'Take O-5010. The source says SHIPPED and the mart says PLACED.'],
          ['Read the compiled filter', 'Open `target/compiled/.../fct_orders.sql`. The filter uses `ordered_at`, not the load time.'],
          ['Find the change', '`git blame` on the filter: a pull request two weeks ago replaced the load time with the order time.'],
          ['Measure the damage', 'Count the rows where the mart and the source disagree. Every changed order since the edit is stale.'],
          ['Fix and rebuild', 'Restore the load-time filter, run a full refresh, then compare again.']
        ],
        tell: 'Support reported shipped orders as placed, while the build was green. I compared one order in the mart with the source, then read the compiled filter of the incremental model. A change two weeks earlier had switched the filter from the load time to the order time, so updated orders were never picked up. I restored the filter, did a full refresh, and counted zero differences against the source.',
        prevent: ['Add a **reconciliation test** that compares the mart with the source on a sample of changed rows', 'Run CI with an **updated row** in the test data, as well as new rows', 'Require a **review note** whenever an incremental filter changes', 'Alert on **stale updates**: the age of the newest change in the mart against the source']
      }),

      B.decide({
        id: 'm7-dec', t: 2, title: 'Decision: how to load a huge events table',
        scenario: 'Brewline\'s web events table receives **500 million rows a day**. Events never change after they are written, but some arrive **up to three days late**. The warehouse is Snowflake. The full rebuild takes **9 hours**.',
        opts: [
          { t: 'Table, rebuilt every night', d: 'The simplest model.', lose: 'Nine hours a day, growing, and it may not finish before people need the data.' },
          { t: 'Incremental with merge on the event id', d: 'Handles late rows by key.', lose: 'A merge must look up every incoming key in a table of billions of rows. It is correct, and it is slow and costly for immutable events.' },
          { t: 'Incremental by time window: microbatch, or delete+insert by date, with a 3-day lookback', d: 'Each run replaces the last four days, one day at a time.' }
        ],
        pick: 2,
        why: 'Events do not change, so there is nothing to merge by key. Late rows land in recent days, so replacing the **last few days as whole windows** fixes them. Each window is independent, so you can rerun one day, run days in parallel, and backfill without touching the rest.',
        when: 'If rows change by key and the table is moderate, merge is simpler and exact. If rows only get added and never arrive late, plain append is cheapest.'
      }),

      B.qa({
        id: 'qa-incr', t: 1, tag: 'Incremental', secs: 60,
        q: 'Explain incremental models. How do they work, and what can go wrong?',
        pts: ['First run builds the whole table, later runs process only new or changed rows', 'is_incremental() and {{ this }} in a WHERE clause select the new rows', 'unique_key lets a changed row replace its older version', 'The filter must use a column that moves when a row changes', 'Risks: missed updates, duplicates, new columns, late data', 'Full refresh rebuilds from scratch'],
        short: 'An incremental model is a table that dbt updates instead of rebuilding. The first run builds the whole table. After that, is_incremental() is true, and a WHERE clause selects only rows that are new or changed, usually those loaded after the newest row already in the table. dbt puts them in a temp table, removes the older versions of any rows with the same unique key, and inserts the new ones.\n\nIt keeps builds fast as data grows, but correctness now depends on my filter. If it filters on a column that does not change when a row changes, such as the order date instead of the load time, updated rows are silently missed, and no test fails. If I forget the unique key, changed rows are duplicated. If the model gets a new column, on_schema_change decides what happens. And late rows need a lookback window.\n\nSo I test the filter by changing a row and watching it arrive, I keep a unique test on the key, and I know that a full refresh rebuilds everything when the logic changes.',
        fu: [
          ['Which strategies exist?', 'Append, delete+insert, merge and microbatch, plus insert_overwrite on some warehouses. The available ones depend on the adapter.'],
          ['How do you test an incremental model in CI?', 'Run it twice: once to build, once after changing or adding a source row, and compare the table with the truth. Add a unit test with the is_incremental override.']
        ],
        trap: 'Describing only the speed benefit. The expected answer includes how a changed row replaces its old version, and what silently fails.',
        real: 'Give a table you made incremental, its size, the build time before and after, and one problem you hit.'
      }),

      B.qa({
        id: 'qa-late', t: 2, tag: 'Incremental', secs: 90,
        q: 'How do you handle late-arriving or changed records in an incremental model?',
        pts: ['Filter on the load time, the column that moves when a row changes', 'Use a unique key with merge or delete+insert, so a changed row replaces itself', 'Add a lookback window to re-read recent rows', 'Or use microbatch to reprocess whole time windows', 'Schedule a periodic full refresh as a safety net, or compare with the source', 'Test it with an updated row in CI'],
        short: 'First I choose what "new" means. I filter on the load time, not the business date, because the load time is what changes when a row is added or updated. With a unique key and a delete+insert or merge strategy, a changed row replaces its older version, so changes are safe.\n\nFor late rows I add a lookback window: instead of loading rows newer than the newest one, I re-read, say, the last two days. The unique key makes the re-read harmless. For very large append-only tables I prefer microbatch or delete+insert by date, which replaces the last few days as whole windows and lets me re-run one day or backfill without touching the rest.\n\nAs a safety net I schedule a full refresh once a week or a reconciliation test against the source, because an incremental table can drift unnoticed. In CI, I test with an updated row and a late row, as well as a new one, since new rows are the case that always works.',
        fu: [
          ['What is the cost of a bigger lookback?', 'Every run re-reads and rewrites more rows, so cost and time grow. Set it to the lateness you actually see, with some margin.'],
          ['What about deleted rows in the source?', 'An incremental filter never sees them. Use a full refresh, a soft-delete flag in the source, or a periodic comparison.']
        ],
        trap: 'Saying "just use merge". Merge handles changed rows by key, but not rows that your filter never selects.',
        real: 'Describe how late your data really arrives, and what lookback you picked.'
      }),

      B.qa({
        id: 'qa-notincr', t: 2, tag: 'Incremental', secs: 60,
        q: 'When would you decide not to make a model incremental?',
        pts: ['The full build is fast and cheap enough', 'The table is small', 'Rows are changed or deleted in many places and are hard to track', 'The logic needs the whole history, such as a rank or a running total', 'The team cannot test it well yet', 'Complexity and silent bugs cost more than the time saved'],
        short: 'I keep a model as a table or a view until the full build is truly a problem. A full table build is simple, always correct, and easy to reason about. An incremental model adds a filter that I must keep right, a strategy, schema-change rules, and a risk of silent drift, so it needs to earn its place.\n\nI also avoid it when the logic needs the whole history, like a global rank, a running total or a percentile, because processing only new rows gives the wrong answer unless I redesign the model. And I avoid it when rows can change or disappear in ways I cannot track from a timestamp.\n\nMy rule is: measure the build first. If a table builds in a few minutes and the cost is small, stay with the table. When it grows to the point where it hurts, I switch, I test it with updated and late rows, and I schedule a periodic full refresh as a safety net.',
        fu: [
          ['What is your threshold?', 'There is no fixed number. I look at the build time against the freshness the business needs, and the credits it costs per month. Minutes and a few cents rarely justify the complexity.']
        ],
        trap: 'Saying "always make big tables incremental". Size alone is not the reason; cost and speed relative to need is.',
        real: 'Describe a model you left as a table on purpose, and why.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Incremental Thinker', color: '#FED7AA',
        pts: [
          'Views are always fresh. **Tables** are fast to read. **Incremental** models are fast to build. **Ephemeral** models are CTEs.',
          'Incremental: the first run builds all, later runs process **new or changed rows**.',
          '`unique_key` plus **delete+insert** or **merge** lets a changed row replace its old version. Append duplicates it.',
          'Filter on the column that **moves when a row changes**. A bad filter fails silently.',
          '**Lookback** catches late rows. **Full refresh** rebuilds. `on_schema_change` handles new columns.'
        ],
        lines: [
          'I test an incremental model with an updated row as well as a new one.',
          'A green build does not prove a correct table.',
          'I stay with a table until the full build really hurts.'
        ]
      })
    ]
  });
})();
