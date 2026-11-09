/* Mission 6: pipelines inside Snowflake with streams, tasks and dynamic tables. */
(function () {
  var B = LAB.b;

  var STREAMS = [
    '-- 1. Track new rows on the RAW table',
    'CREATE OR REPLACE STREAM raw.strm_orders ON TABLE raw.orders APPEND_ONLY = TRUE;',
    '',
    '-- 2. Is there anything new?',
    "SELECT SYSTEM$STREAM_HAS_DATA('RAW.STRM_ORDERS');",
    '',
    '-- 3. Look at the changes. A plain SELECT does not consume them.',
    'SELECT order_id, status, METADATA$ACTION, METADATA$ISUPDATE',
    'FROM raw.strm_orders;'
  ].join('\n');

  var TASKS = [
    '-- 1. A task runs SQL on a schedule. The WHEN clause skips empty runs.',
    'CREATE OR REPLACE TASK core.tsk_merge_orders',
    '  WAREHOUSE = WH_TRANSFORM',
    "  SCHEDULE  = '5 MINUTE'",
    "  WHEN SYSTEM$STREAM_HAS_DATA('RAW.STRM_ORDERS')",
    'AS',
    '  MERGE INTO core.orders t',
    '  USING (SELECT order_id, customer_id, order_ts, status, total_usd',
    '         FROM raw.strm_orders',
    '         QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY _loaded_at DESC) = 1) s',
    '  ON t.order_id = s.order_id',
    '  WHEN MATCHED THEN UPDATE SET t.status = s.status',
    '  WHEN NOT MATCHED THEN INSERT (order_id, customer_id, order_ts, status, total_usd)',
    '       VALUES (s.order_id, s.customer_id, s.order_ts, s.status, s.total_usd);',
    '',
    '-- 2. Tasks are created suspended. Start it.',
    'ALTER TASK core.tsk_merge_orders RESUME;',
    '',
    '-- 3. Did it run?',
    'SELECT name, state, scheduled_time, error_message',
    "FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY(TASK_NAME => 'TSK_MERGE_ORDERS'))",
    'ORDER BY scheduled_time DESC LIMIT 3;'
  ].join('\n');

  var DT = [
    '-- 1. Declare the mart as a query. Snowflake keeps it fresh.',
    'CREATE OR REPLACE DYNAMIC TABLE marts.daily_revenue',
    "  TARGET_LAG   = '10 minutes'",
    '  WAREHOUSE    = WH_TRANSFORM',
    '  REFRESH_MODE = INCREMENTAL',
    'AS',
    "  SELECT DATE_TRUNC('day', order_ts) AS order_day,",
    '         COUNT(*)                    AS orders,',
    '         SUM(total_usd)              AS revenue_usd',
    '  FROM core.orders',
    "  WHERE status <> 'CANCELLED'",
    '  GROUP BY 1;',
    '',
    '-- 2. How is it doing?',
    "SHOW DYNAMIC TABLES LIKE 'DAILY_REVENUE' IN SCHEMA marts;",
    '',
    '-- 3. The refresh history',
    'SELECT name, refresh_action, state, data_timestamp',
    "FROM TABLE(INFORMATION_SCHEMA.DYNAMIC_TABLE_REFRESH_HISTORY(NAME => 'MARTS.DAILY_REVENUE'))",
    'ORDER BY data_timestamp DESC LIMIT 3;'
  ].join('\n');

  var BUGTASK = [
    'CREATE OR REPLACE TASK core.tsk_merge_orders',
    '  WAREHOUSE = WH_TRANSFORM',
    "  SCHEDULE = '5 MINUTE'",
    'AS',
    '  CALL core.merge_orders();',
    '-- deployed by the CI job. Nothing else to do.'
  ].join('\n');

  function L(t, c, node, st, d) { return { c: c || 'out', t: t, node: node, st: st, d: d == null ? 260 : d }; }
  function taskRun() {
    return [
      { c: 'cmd', t: '10:35:00  graph tsk_load scheduled. WHEN condition: stream has data = TRUE', d: 500 },
      L('10:35:01  tsk_load    EXECUTING  (load check)', 'dim', 'tsk_load', 'run', 650),
      L('10:35:08  tsk_load    SUCCEEDED  (7 s)', 'ok', 'tsk_load', 'ok', 350),
      L('10:35:09  tsk_merge   EXECUTING  (MERGE into core.orders)', 'dim', 'tsk_merge', 'run', 750),
      L('10:35:41  tsk_merge   SUCCEEDED  (1 row inserted, 1 row updated)', 'ok', 'tsk_merge', 'ok', 350),
      L('10:35:42  tsk_check   EXECUTING  (row count test)', 'dim', 'tsk_check', 'run', 550),
      L('10:35:44  tsk_check   FAILED     (core.orders has 1 row fewer than raw)', 'err', 'tsk_check', 'fail', 450),
      L('10:35:44  tsk_mart    SKIPPED    (a predecessor failed)', 'warn', 'tsk_mart', 'skip', 350),
      L('10:35:45  tsk_final   EXECUTING  (finalizer, runs after every graph run)', 'dim', 'tsk_final', 'run', 650),
      L('10:35:47  tsk_final   SUCCEEDED  (alert sent, run logged)', 'ok', 'tsk_final', 'ok', 300),
      { c: 'hl', t: '10:35:47  graph run FAILED at tsk_check. The mart was not refreshed.', d: 100 }
    ];
  }

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Pipelines inside Snowflake', short: 'Pipelines', blurb: 'Streams, tasks, dynamic tables and when to pick each', minutes: 30,
    focus: ['int'],
    goals: [
      'Explain **streams, tasks and dynamic tables** and how they fit together.',
      'Build a change-driven pipeline with a **stream, a task and a MERGE**.',
      'Keep a mart fresh with a **dynamic table** and choose its target lag.',
      'Choose between **streams and tasks, dynamic tables and dbt**, and defend the choice.'
    ],
    say: 'Mission 6 is the pipeline itself. Current Snowflake job postings ask for streams, tasks and dynamic tables more than almost any other feature, so expect questions on all three and on how to choose between them.',
    scenes: [
      B.flow({
        id: 'm6-overview', t: 1, title: 'A pipeline that runs inside Snowflake', g: 'pipe', legend: true,
        steps: [
          { say: 'Files arrive, a stream notes what changed, a task applies the changes to CORE, and a dynamic table keeps a mart fresh. Everything runs inside Snowflake, with no outside scheduler. Press Next to walk it.', cap: 'Six hops. Four Snowflake features: **Snowpipe, stream, task, dynamic table**.' },
          { say: 'Snowpipe appends the rows of each new file to RAW. RAW only grows. It never changes existing rows.', on: ['e1'], focus: ['pipe', 'raw'], cap: 'RAW is **append-only**. Every version of an order is kept.' },
          { say: 'A stream sits on RAW and records every change since you last read it. It stores no data of its own, only a position in the table\'s history.', on: ['e2'], focus: ['raw', 'strm'], cap: 'A stream stores a **position**, not a copy of the data.' },
          { say: 'A task wakes up on a schedule, checks whether the stream has data, and if so runs a MERGE. Reading the stream inside that statement moves its position forward, so each change is processed once.', on: ['e3'], focus: ['strm', 'task'], cap: 'The **WHEN** condition makes an empty run free: the warehouse never starts.' },
          { say: 'The MERGE writes the latest version of each order into CORE.', on: ['e4'], focus: ['task', 'core'], cap: 'CORE holds **one row per order**.' },
          { say: 'A dynamic table defines the mart as a query over CORE. Snowflake refreshes it to meet a target lag, and does only the changed work when it can.', on: ['e5'], focus: ['core', 'dt'], cap: 'You declare **what** the mart is. Snowflake works out **when** to refresh it.' },
          { say: 'Dashboards read the mart. Nothing in this pipeline needed an outside orchestrator.', on: ['e6'], focus: ['dt', 'bi'], cap: 'Whether you **should** skip an orchestrator is a design decision. That comes later in this mission.' }
        ]
      }),

      B.rows({
        id: 'm6-stream-rows', t: 1, title: 'What a stream records',
        steps: [
          { say: 'A stream is created on core.orders. Right now it has recorded nothing. The table holds two orders, and O-5001 is the marked row.', tabs: [
            { layer: 'TABLE', name: 'core.orders', c: 'stg', cols: ['order_id', 'status'], rows: [['O-5001', 'PLACED'], ['O-5002', 'PLACED']], trk: 0 }
          ] },
          { say: 'Two things happen. O-5001 changes status, and a new order, O-5003, arrives.', tabs: [
            { layer: 'TABLE', name: 'core.orders', c: 'stg', cols: ['order_id', 'status'], rows: [['O-5001', 'SHIPPED'], ['O-5002', 'PLACED'], ['O-5003', 'PLACED']], chg: [[0, 1], [2, 0], [2, 1]], trk: 0 }
          ] },
          { say: 'This is what the stream shows. The update appears as two rows: a DELETE of the old version and an INSERT of the new one. The new order is a plain INSERT.', tabs: [
            { layer: 'STREAM', name: 'core.strm_orders', c: 'int', cols: ['order_id', 'status', 'METADATA$ACTION', 'METADATA$ISUPDATE'], rows: [['O-5001', 'PLACED', 'DELETE', 'TRUE'], ['O-5001', 'SHIPPED', 'INSERT', 'TRUE'], ['O-5003', 'PLACED', 'INSERT', 'FALSE']], chg: [[0, 2], [1, 2], [0, 3], [1, 3]], trk: 1 }
          ], notes: ['An update is a **DELETE plus an INSERT**, and both rows carry `METADATA$ISUPDATE = TRUE`.', 'Reading the stream inside a DML statement **moves its position forward**. A plain `SELECT` does not.', 'An **append-only** stream records only inserts. It is cheaper, and right for RAW tables that never update.'] }
        ]
      }),

      B.sql({
        id: 'm6-streams-sql', t: 1, title: 'Create and read a stream', file: 'worksheet: streams.sql', code: STREAMS,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'A stream is one statement to create and one to read. Press Next.', lines: null },
          { say: 'The stream is attached to RAW.ORDERS. APPEND_ONLY means it records only new rows, which is right for a table that is only ever appended to.', lines: [1, 2] },
          { say: 'This function returns TRUE when the stream has unread changes. Tasks use it so that empty runs cost nothing.', lines: [4, 5] },
          { say: 'You can read the stream like a table, with extra METADATA columns. A plain SELECT does not move the position forward. Press Run.', lines: [7, 9], run: true }
        ],
        result: { cols: ['ORDER_ID', 'STATUS', 'METADATA$ACTION', 'METADATA$ISUPDATE'], rows: [['O-5001', 'SHIPPED', 'INSERT', 'FALSE'], ['O-5003', 'PLACED', 'INSERT', 'FALSE']], msg: '2 rows' },
        note: 'A stream becomes **stale** if it is not consumed before its position falls out of the table\'s retention window. Snowflake extends retention for you, up to 14 days by default (`MAX_DATA_EXTENSION_TIME_IN_DAYS`). After that the stream is unusable and must be recreated.'
      }),

      B.sql({
        id: 'm6-tasks-sql', t: 1, title: 'A task that merges the changes', file: 'worksheet: tasks.sql', code: TASKS,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'A task is SQL plus a schedule. Press Next to read this one in three parts.', lines: null },
          { say: 'The definition. It uses WH_TRANSFORM, wakes every 5 minutes, and runs only when the stream has data. If the stream is empty, the run is skipped and no credits are used.', lines: [1, 6] },
          { say: 'The body is a normal statement. This MERGE reads the stream, keeps the latest version of each order, and writes it to CORE. Reading the stream here consumes it, so the next run sees only newer changes.', lines: [7, 14] },
          { say: 'New tasks are created suspended. Nothing runs until you resume it. Forgetting this is the classic mistake.', lines: [16, 17] },
          { say: 'Check the history to see whether it ran. SKIPPED means the WHEN condition was false. Press Run.', lines: [19, 22], run: true }
        ],
        result: { cols: ['NAME', 'STATE', 'SCHEDULED_TIME', 'ERROR_MESSAGE'], rows: [['TSK_MERGE_ORDERS', 'SUCCEEDED', '2026-03-14 10:35:00.000 +0000', 'NULL'], ['TSK_MERGE_ORDERS', 'SKIPPED', '2026-03-14 10:30:00.000 +0000', 'NULL'], ['TSK_MERGE_ORDERS', 'SUCCEEDED', '2026-03-14 10:25:00.000 +0000', 'NULL']], msg: '3 rows' }
      }),

      B.talk({
        id: 'm6-graphs', t: 2, title: 'Task graphs, retries and serverless tasks',
        say: 'Real pipelines have more than one task. Here is what to know about graphs of tasks. Press Next for each point.',
        items: [
          ['A task graph is a tree of tasks', 'A **root task** has the schedule. **Child tasks** name their parents with `AFTER`. A child runs only when all of its parents succeeded, so a failure stops everything below it.', 'The root has the schedule. Children run after their parents.'],
          ['Start the graph in the right order', 'Resume the children first and the root last, or call `SYSTEM$TASK_DEPENDENTS_ENABLE` on the root, which resumes the whole graph in the right order.', 'Resume the root last.'],
          ['Retries and automatic suspension', '`TASK_AUTO_RETRY_ATTEMPTS` retries a failed graph a set number of times. `SUSPEND_TASK_AFTER_NUM_FAILURES` suspends a task after that many failures in a row, which is why tasks can be **suspended** after a bad night. Alert on suspended tasks.', 'A task can suspend itself after repeated failures.'],
          ['The finalizer task', 'A **finalizer** task is attached to the root with `FINALIZE`. It runs when the graph run ends, whether it succeeded or failed, so it is the place for cleanup and alerts.', 'Put alerts in the finalizer.'],
          ['Serverless or your warehouse', 'A task can run on your warehouse, or on **serverless** compute that Snowflake manages and bills by use. Serverless suits short, frequent tasks. A warehouse suits long ones that you want to size and watch.', 'Serverless for small and frequent. Warehouse for long and heavy.']
        ],
        cols: 1
      }),

      B.term({
        id: 'm6-task-run', t: 2, title: 'A task graph run that fails a check', g: 'tgraph', initial: {}, lines: taskRun, afterKind: 'warn',
        say: 'Here is a graph run on a bad day. Watch the colors: yellow is running, green is done, red failed, grey skipped.',
        doneSay: 'The row count test failed, so the mart task was skipped and dashboards kept yesterday\'s good numbers. The finalizer still ran and sent the alert.',
        after: '**Key point:** a failed task protects the layers below it, and the **finalizer** guarantees someone is told. Without the finalizer, a failed graph can go unnoticed until a dashboard looks wrong.'
      }),

      B.sql({
        id: 'm6-dt-sql', t: 1, title: 'A dynamic table', file: 'worksheet: dynamic_table.sql', code: DT,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.MARTS' },
        steps: [
          { say: 'A dynamic table replaces a stream, a task and a MERGE with one definition. Press Next.', lines: null },
          { say: 'TARGET_LAG says how far behind the sources the table may be. WAREHOUSE is the compute used for each refresh. REFRESH_MODE says whether to process only changes or recompute everything.', lines: [1, 5] },
          { say: 'The body is an ordinary query. Snowflake works out which source changes affect which output rows, and refreshes only those when it can.', lines: [6, 12] },
          { say: 'SHOW DYNAMIC TABLES tells you the lag, the refresh mode and whether it is running.', lines: [14, 15] },
          { say: 'The refresh history shows what each refresh did. NO_DATA means nothing had changed, and INCREMENTAL means it processed only the changes. Press Run.', lines: [17, 20], run: true }
        ],
        result: { cols: ['NAME', 'REFRESH_ACTION', 'STATE', 'DATA_TIMESTAMP'], rows: [['DAILY_REVENUE', 'INCREMENTAL', 'SUCCEEDED', '2026-03-14 10:40:00.000 +0000'], ['DAILY_REVENUE', 'NO_DATA', 'SUCCEEDED', '2026-03-14 10:30:00.000 +0000'], ['DAILY_REVENUE', 'INCREMENTAL', 'SUCCEEDED', '2026-03-14 10:20:00.000 +0000']], msg: '3 rows' },
        note: 'Setting `REFRESH_MODE` explicitly makes a table that cannot refresh incrementally **fail at creation**, instead of quietly falling back to a full refresh that costs far more.'
      }),

      B.talk({
        id: 'm6-dt-facts', t: 2, title: 'Dynamic tables: what to know',
        say: 'Dynamic tables are easy to create and easy to get wrong in production. Five facts, press Next for each.',
        items: [
          ['Declare the result, not the steps', 'You write the query that defines the table. Snowflake builds the refresh logic, tracks dependencies between dynamic tables, and refreshes them in the right order.', 'Declare what you want. Snowflake handles when and how.'],
          ['Target lag is a goal', '`TARGET_LAG = \'10 minutes\'` means Snowflake tries to keep the table no more than 10 minutes behind its sources. It can fall behind if refreshes run long. `DOWNSTREAM` lets a table refresh only when something that reads it needs fresh data.', 'Lag is a target, not a guarantee.'],
          ['Refresh modes', '`INCREMENTAL` processes only the changes. `FULL` recomputes everything. `AUTO` is the default and picks one when the table is created, and that choice can change with Snowflake releases, so set the mode on purpose in production. A newer `ADAPTIVE` mode exists, so check its current status in the documentation.', 'Set the refresh mode explicitly.'],
          ['Cost follows the lag', 'Every refresh runs on the table\'s warehouse. A shorter lag means more refreshes, so cost rises as lag falls. Choose the lag the business needs, not the smallest one allowed.', 'Pick the lag the business needs.'],
          ['Some queries cannot refresh incrementally', 'Certain functions and constructs force a full refresh. Check the refresh mode and the reason in `SHOW DYNAMIC TABLES`, and read the list of supported operations before you design around incremental refresh.', 'Check the supported operations first.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm6-compare', t: 2, title: 'Streams and tasks, dynamic tables, dbt, or an orchestrator',
        say: 'Four ways to build the same pipeline. Interviewers want to hear that you can choose, and that you know what each one costs. Press Next to see each row.',
        cols: ['', 'Streams and tasks', 'Dynamic tables', 'dbt incremental models', 'Orchestrator (Airflow)'],
        rows: [
          ['You write', 'A stream, a task, the MERGE and the schedule', 'One SELECT and a target lag', 'A SELECT with incremental logic, tests and docs', 'DAGs that call SQL, dbt or Snowflake'],
          ['Best for', 'Custom change handling, deletes, procedural steps', 'Declarative transformations with a freshness target', 'Tested, documented, reviewed transformations', 'Workflows across several systems'],
          ['Watch out for', 'Stale streams, a forgotten RESUME, merge bugs', 'Some constructs force a full refresh. Cost follows the lag', 'Needs a scheduler. Freshness is as often as you run it', 'Another system to run and monitor'],
          ['Freshness comes from', 'The task schedule', 'The target lag you set', 'Each dbt run', 'Each DAG run']
        ],
        steps: [
          { upto: 2, say: 'What you write and what each is best for.' },
          { upto: 3, say: 'What to watch out for. Every option has a failure mode that looks different.' },
          { upto: 4, say: 'And where freshness comes from. It is the clearest way to compare them.' }
        ],
        pick: 'Default to **dbt** for logic you want tested, documented and reviewed. Use **dynamic tables** for marts that need a freshness target. Use **streams and tasks** when you need custom change handling, such as deletes or procedural steps. Use an **orchestrator** when the workflow spans systems. Many teams combine two of these.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, title: 'Decision: keep the marts 10 minutes fresh',
        scenario: 'The marts must be **at most 10 minutes behind** CORE. They are simple aggregations over `core.orders`. The team has **four engineers**, writes only SQL, and already runs **dbt in CI** for tests, docs and code review.',
        opts: [
          { t: 'Streams and tasks with MERGE statements', d: 'A stream and a task for each mart.', lose: 'It works, but you write and maintain the change handling for every mart, and you lose the tests, lineage and docs the team already gets from dbt.' },
          { t: 'dbt models materialized as dynamic tables, with a 10 minute target lag', d: 'Keep the SQL in dbt and let Snowflake refresh it.' },
          { t: 'dbt incremental models run by Airflow every 10 minutes', d: 'A scheduler triggers dbt on a fixed rhythm.', lose: 'Freshness then depends on the scheduler, a warehouse wakes up every run even when nothing changed, and one slow run misses the target.' }
        ],
        pick: 1,
        why: 'The marts are simple aggregations with a freshness target, which is exactly what dynamic tables do. Defining them **through dbt** keeps tests, docs, lineage and review in the process the team already trusts, and Snowflake handles the refresh timing.',
        when: 'Choose **dbt incremental models on a schedule** when the logic is complex, needs custom incremental handling, or cannot refresh incrementally as a dynamic table. Choose **streams and tasks** when you must process deletes or run procedural steps for each change.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'The CI job deployed this task. An hour later, nothing has run and the mart is stale. Click the line that is wrong.',
        file: 'deploy_task.sql', lang: 'sql', code: BUGTASK, bad: 6,
        hint: 'What state is a new task created in?',
        why: 'A new task is created **suspended**. Nothing runs until someone executes `ALTER TASK ... RESUME`. The comment claims nothing else is needed, and that is the bug. Add the RESUME to the deploy script, and check task state after each deploy.',
        fix: 'CREATE OR REPLACE TASK core.tsk_merge_orders\n  WAREHOUSE = WH_TRANSFORM\n  SCHEDULE = \'5 MINUTE\'\nAS\n  CALL core.merge_orders();\n\nALTER TASK core.tsk_merge_orders RESUME;'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'A stream is attached to a table, and one row is UPDATED. How does the stream show it?',
        opts: [
          { t: 'Two rows: a DELETE of the old version and an INSERT of the new one, both with METADATA$ISUPDATE = TRUE', fb: '' },
          { t: 'One row with METADATA$ACTION = UPDATE', fb: 'Streams have only INSERT and DELETE actions. An update is a pair of them.' },
          { t: 'Nothing. Streams record inserts only', fb: 'An append-only stream records only inserts. A standard stream also records updates and deletes.' },
          { t: 'One row holding both the old and the new values', fb: 'The old and new versions appear as two separate rows.' }
        ],
        ok: 0, why: 'A standard stream models an update as a **DELETE plus an INSERT**, flagged with `METADATA$ISUPDATE = TRUE`. Your MERGE should treat that pair as one change.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'What does `WHEN SYSTEM$STREAM_HAS_DATA(\'RAW.STRM_ORDERS\')` do in a task definition?',
        opts: [
          { t: 'The task runs only when the stream has unread changes, so empty runs use no warehouse', fb: '' },
          { t: 'It fills the stream with data before each run', fb: 'The function only reads whether data exists. It changes nothing.' },
          { t: 'It makes the task run in a loop until the stream is empty', fb: 'The condition is checked once for each scheduled run.' },
          { t: 'It lets the task read the stream more than once', fb: 'It has no effect on how the stream is read.' }
        ],
        ok: 0, why: 'The `WHEN` condition is checked before the warehouse starts. If it is false the run is **skipped** and costs nothing, which makes frequent schedules cheap.'
      }),

      B.quiz({
        id: 'm6-q3', t: 2,
        q: 'You set `TARGET_LAG = \'1 minute\'` on a dynamic table. Which statement is true?',
        opts: [
          { t: 'Snowflake aims for 1 minute, it can fall behind if refreshes run long, and cost rises as the lag falls', fb: '' },
          { t: 'Snowflake guarantees the data is never more than 1 minute old', fb: 'Target lag is a goal. A long refresh or a busy warehouse can exceed it.' },
          { t: 'The table refreshes only when someone queries it', fb: 'That describes lazy refresh. A time target refreshes on its own schedule.' },
          { t: 'A 1 minute lag costs the same as a 1 hour lag', fb: 'Sixty times more refreshes means far more warehouse time, unless there is nothing to refresh.' }
        ],
        ok: 0, why: '**Target lag is a goal, not a guarantee.** Monitor the actual lag in the refresh history, and set the lag from what the business needs, because every extra refresh uses warehouse time.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put one cycle of a stream-and-task pipeline in order.',
        items: [
          'Snowpipe inserts new rows into the RAW table',
          'The stream records the new rows',
          'The task wakes on its schedule and checks the WHEN condition',
          'The MERGE reads the stream and writes the latest rows to CORE, which moves the stream forward',
          'The next run finds no new data and is skipped'
        ],
        why: 'Capture, check, apply, advance, repeat. Reading the stream inside the MERGE is what moves its position forward, so each change is applied once.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, title: 'Incident: the merge task fails with a stale stream', time: '08:20',
        alert: 'It is Monday. **TSK_MERGE_ORDERS** has failed on every run since Friday with: "Stream RAW.STRM_ORDERS is stale". Marts are three days behind.',
        clues: ['A failed deploy suspended the task **16 days ago**', 'Someone resumed it on Friday', 'The default `MAX_DATA_EXTENSION_TIME_IN_DAYS` of 14 applies'],
        opts: [
          { t: 'Recreate the stream, then backfill CORE by merging the latest version of every order from RAW', fb: '' },
          { t: 'Resume the task and wait, it will catch up', fb: 'A stale stream cannot be read. It will keep failing until you recreate it.' },
          { t: 'Raise the retention on RAW.ORDERS to recover the stream', fb: 'Retention cannot bring back history that is already gone. The stream position is no longer valid.' },
          { t: 'Drop the task and rebuild all of CORE from scratch', fb: 'It would work, but it is far more than you need. RAW already holds every version, so a targeted backfill is enough.' }
        ],
        best: 0,
        why: 'A stream goes stale when its position falls outside the table\'s history. The position **cannot be repaired**, so you create a new stream, which starts from now, and **backfill the gap** from RAW, which keeps every version.',
        checks: [
          ['Read the error', 'Confirm the failure is "stream is stale" and not a permissions or warehouse problem.'],
          ['Check the stream', '`SHOW STREAMS` shows `stale` and `stale_after`. Note when it went stale.'],
          ['Find the gap', 'The gap runs from the last successful merge to the moment you create the new stream.'],
          ['Recreate and backfill', 'Create the stream again, then run one MERGE from RAW using the latest version of every order that changed since the gap began.'],
          ['Verify', 'Compare row counts and the latest status per order between RAW and CORE, then refresh the marts.']
        ],
        tell: 'The merge task had been suspended for 16 days after a failed deploy, so its stream went stale. I recreated the stream and ran a one-off MERGE from RAW, using the latest version of each order, to cover the gap. Then I verified row counts against RAW and refreshed the marts. Dashboards were correct about 40 minutes after the alert.',
        prevent: ['Alert when a **task is suspended** or fails twice in a row', 'Add a post-deploy check that every task is `started`', 'Monitor **stream staleness** with `SHOW STREAMS`', 'Keep a documented, tested **backfill statement** for every stream-driven table']
      }),

      B.qa({
        id: 'qa-stream', t: 1, tag: 'Pipelines', secs: 60,
        q: 'What is a stream, and what is a task? How do they work together?',
        pts: ['A stream records changes to a table since it was last read', 'It stores a position, not a copy of the data', 'A task is SQL on a schedule, with an optional WHEN condition', 'Reading the stream in a DML statement advances it', 'Tasks are created suspended and must be resumed'],
        short: 'A stream records the changes made to a table: inserts, and for a standard stream also updates and deletes. It does not store a copy of the data, only a position in the table\'s history. When I read the stream inside a DML statement such as a MERGE, the position moves forward, so each change is processed once.\n\nA task is SQL on a schedule, and it can run on a warehouse or on serverless compute. A WHEN clause with SYSTEM$STREAM_HAS_DATA skips the run when nothing changed, so empty runs cost nothing. Together they give a change-driven pipeline: the stream captures changes, and the task merges them into the target. I remember that tasks are created suspended and need a RESUME, and that a stream left unread for too long goes stale.',
        fu: [
          ['What is a stale stream?', 'A stream whose position has fallen outside the table\'s history, usually because it was not consumed for longer than the retention plus its extension. It cannot be read again. I recreate it and backfill the gap.'],
          ['What do you do with updates in a standard stream?', 'An update appears as a DELETE and an INSERT with METADATA$ISUPDATE set to TRUE. I filter to the INSERT side, or use the pair deliberately, and MERGE on the key.']
        ],
        trap: 'Saying a stream "stores the changes". It stores a position. The change data comes from the table\'s own history, which is why the retention window matters.'
      }),

      B.qa({
        id: 'qa-st-dt', t: 2, tag: 'Pipelines', secs: 75,
        q: 'Streams and tasks, dynamic tables, or dbt: how do you choose?',
        pts: ['Start from the freshness target and the team\'s workflow', 'dbt for logic that needs tests, docs and review', 'Dynamic tables for declarative marts with a lag target', 'Streams and tasks for custom change handling and deletes', 'Cost: refresh frequency, warehouse wake-ups, constructs that force full refresh', 'They can be combined'],
        short: 'I start from the freshness target and from how the team works. If the logic needs tests, documentation and code review, I use dbt, and I run it on a schedule that matches the freshness the business needs. If a mart needs to stay within a lag target and the query refreshes incrementally, I use a dynamic table, often defined through dbt so the tests and lineage stay. If I need custom change handling, such as processing deletes or running procedural steps, I use streams and tasks.\n\nI also think about cost. Dynamic table cost follows the lag, scheduled dbt runs wake the warehouse each time, and some constructs force full refreshes. I set the refresh mode explicitly and watch the refresh history. The options combine well, for example streams and tasks into CORE and dynamic tables for the marts.',
        fu: [
          ['When would a dynamic table be a poor choice?', 'When the query uses constructs that force a full refresh, when the logic needs procedural steps or custom delete handling, or when a very short lag would keep a large warehouse busy all day.'],
          ['How do you monitor them?', 'Dynamic table refresh history and actual lag, task history for failures and skips, SHOW STREAMS for staleness, and alerts on suspended tasks.']
        ],
        trap: 'Declaring one tool the winner for everything. Seniors compare them by freshness target, cost, failure modes and team workflow.',
        real: 'Describe a pipeline you built. Say which tool you chose, what the freshness target was, and one thing you would change now.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Pipeline Builder', color: '#DDD6FE',
        pts: [
          'A **stream** records changes as a position, not a copy. An update is a **DELETE plus an INSERT**. Unread streams go **stale**.',
          'A **task** is SQL on a schedule. **WHEN SYSTEM$STREAM_HAS_DATA** skips empty runs. New tasks start **suspended**.',
          'Task graphs: root has the schedule, children use **AFTER**, a **finalizer** always runs, tasks can **auto-suspend** after repeated failures.',
          'A **dynamic table** declares a query and a **target lag**. Lag is a goal. Set the **refresh mode** explicitly. Cost follows the lag.',
          'Choose by freshness target, team workflow and cost: **dbt**, **dynamic tables**, **streams and tasks**, or an **orchestrator**, often in combination.'
        ],
        lines: [
          'I pick the tool from the freshness target, the failure modes and how the team works, not from habit.',
          'I alert on suspended tasks and stale streams, because a pipeline that stops quietly is worse than one that fails loudly.',
          'I set the dynamic table refresh mode on purpose, so a table that cannot refresh incrementally fails at creation.'
        ]
      })
    ]
  });
})();
