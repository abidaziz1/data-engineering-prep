/* Mission 5: Data Factory in production. Triggers, incremental loads, safe repeats, failure handling, reruns, orchestration choices and monitoring.
   The three watermark strategies were run in DuckDB on six orders, and the KQL was checked with the Kusto language service of Microsoft. How the
   service behaves (triggers, retries, reruns, monitoring) comes from documentation, and nothing here ran in a factory. */
(function () {
  var B = LAB.b, G = LAB.get;
  var WM = G.counts('adf.watermark'), S = WM.strategies, KQ = G.counts('kql.parse');
  G.expect(S.A.missing.join() === 'O5' && S.B.missing.join() === 'O3,O5' && S.C.missing.length === 0 && S.C.rows_read_in_total === 9 && S.A.rows_read_in_total === 5 && S.B.rows_read_in_total === 4, 'the watermark strategies lose O5, O3 and O5, and nothing');
  G.expect(WM.source.length === 6 && WM.runs.length === 3 && S.C.runs[1].reads.join() === 'O2,O3,O4', 'six orders and three runs');
  G.expect(KQ.good.valid === true && KQ.broken.valid === false && KQ.broken.errors[0] === 'Expected: )', 'the KQL check');

  var WM_SQL = [
    'CREATE TABLE etl.watermark (',
    '    table_name varchar(100) NOT NULL PRIMARY KEY,',
    '    last_value datetime2    NOT NULL',
    ');',
    '',
    'MERGE dbo.orders_raw AS t',
    'USING stg.orders AS s ON t.order_id = s.order_id',
    'WHEN MATCHED THEN',
    '    UPDATE SET t.status = s.status, t.total_eur = s.total_eur, t.modified_at = s.modified_at',
    'WHEN NOT MATCHED THEN',
    '    INSERT (order_id, status, total_eur, modified_at)',
    '    VALUES (s.order_id, s.status, s.total_eur, s.modified_at);'
  ].join('\n');

  var KQL = [
    'ADFActivityRun',
    '| where TimeGenerated > ago(1d)',
    '| summarize runs = count() by Status',
    '| order by runs desc',
    '',
    '// the failed runs of each pipeline, newest first',
    'ADFPipelineRun',
    "| where TimeGenerated > ago(1d) and Status == 'Failed'",
    '| project TimeGenerated, PipelineName, RunId, FailureType',
    '| order by TimeGenerated desc'
  ].join('\n');

  var SP_BUG = [
    'CREATE PROCEDURE etl.set_watermark @table_name varchar(100), @new_value datetime2 AS',
    'BEGIN',
    '    UPDATE etl.watermark SET last_value = SYSUTCDATETIME() WHERE table_name = @table_name;',
    'END;'
  ].join('\n');
  var SP_FIX = SP_BUG.replace('SYSUTCDATETIME()', '@new_value');

  var RUN_BUG = [
    'run = client.pipelines.create_run(RG, FACTORY, "pl_orders_daily", parameters={"run_date": "2026-03-14"})',
    'print("started", run.run_id)'
  ].join('\n');
  var RUN_FIX = [
    'import time',
    '',
    'run = client.pipelines.create_run(RG, FACTORY, "pl_orders_daily", parameters={"run_date": "2026-03-14"})',
    'while True:',
    '    status = client.pipeline_runs.get(RG, FACTORY, run.run_id).status',
    '    if status not in ("Queued", "InProgress", "Canceling"):',
    '        break',
    '    time.sleep(30)',
    'if status != "Succeeded":',
    '    raise RuntimeError("pipeline run " + run.run_id + " ended as " + status)'
  ].join('\n');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Data Factory in production', short: 'ADF in production', blurb: 'Triggers, incremental loads, loads that survive a retry, failure handling, reruns and monitoring', minutes: 46,
    focus: ['snap', 'air'],
    goals: [
      'Choose between a **schedule, a tumbling window, a storage event and a custom event** trigger.',
      'Build an **incremental load** with a watermark, and say how each strategy can lose rows.',
      'Make a load **safe to repeat** with staging, a merge, or a dated folder.',
      'Handle a failure on purpose with **retries, dependency conditions and a Fail activity**.',
      'Rerun a failed run or a window, and **backfill** a month safely.',
      'Watch a factory with **metrics, alerts and KQL**.'
    ],
    say: 'Mission 5 is what makes a pipeline fit for production: how it starts, how it picks up only what changed, how it survives a retry, what happens when it fails, and how you hear about it. I ran the three incremental strategies in DuckDB on the same six orders, so what you see is real output. The service behavior, triggers, retries, reruns and monitoring, comes from documentation, and the screens say so.',
    scenes: [
      B.cmp({
        id: 'm5-triggers', t: 1, src: 'docs', title: 'Four kinds of trigger',
        say: 'A trigger decides when a pipeline runs, and each kind keeps a different kind of memory. Press Next to compare them.',
        cols: ['Trigger', 'Starts when', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Schedule', 'A clock says so, once or on a pattern', 'regular loads that need no history, one trigger for many pipelines', 'It keeps no state. A missed time is missed, and it cannot start runs for the past.'],
          ['Tumbling window', 'A fixed-size window of time has ended, one window after another, with no gaps or overlaps', 'incremental loads by time slice, backfill, dependencies between pipelines', 'One trigger runs one pipeline. A stuck window holds back the windows after it, if they depend on it.'],
          ['Storage event', 'A blob is created or deleted in a storage account', 'loads that should start when a file arrives', 'On ADLS Gen2 a write can raise an empty event first. Turn on the option to ignore empty blobs.'],
          ['Custom event', 'An event arrives on an Event Grid topic that you own', 'a reaction to something your own systems announce', 'You must publish the events and filter them.']
        ],
        steps: [
          { upto: 2, say: 'Time triggers. The schedule is the simple one. The tumbling window keeps state, which is why it can backfill and wait for another window.' },
          { upto: 4, say: 'Event triggers. They start work when something happens. Both depend on Event Grid, and events can arrive twice, so a load must be safe to repeat.' }
        ],
        pick: 'Use a **tumbling window** for loads by time slice that need backfill or dependencies, a **schedule** for simple jobs, and a **storage event** when the file decides when to start. Make every pipeline **safe to repeat**, because any trigger can start it twice.'
      }),

      B.talk({
        id: 'm5-window', t: 1, src: 'docs', title: 'Tumbling windows in practice',
        say: 'A tumbling window trigger gives you most of what a production load needs. Press Next for the five settings that matter.',
        items: [
          ['Windows and parameters', 'You set a start time, a size such as one day, and an optional delay. Each window passes its start and end to the pipeline as `@trigger().outputs.windowStartTime` and `windowEndTime`. A load that uses those two values reads the same slice every time it runs, which makes it repeatable.', 'The slice comes from the window, not from the clock.'],
          ['Backfill', 'Set the start time in the past, and the trigger creates a window for every slice since then and runs them. A maximum concurrency limits how many run at once. A schedule trigger cannot do this.', 'The past becomes a list of windows.'],
          ['Dependencies', 'A window can wait for another trigger\'s window, or for the previous window of itself. A self dependency makes the windows run in order, one after another, which an incremental load needs.', 'Order, when order matters.'],
          ['Retry and timeout', 'A tumbling window has its own retry policy, apart from the retries of an activity. If the pipeline fails, the window retries, and if it still fails, the window is marked failed and the next ones may be held back.', 'A failed window can block the ones after it.'],
          ['Rerun', 'You can rerun a single window from Monitor, or rerun a range. The rerun uses the same window start and end, so the same data is read again. That is why the load must be safe to repeat.', 'Same slice, run again.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm5-wm-talk', t: 1, src: 'rec', title: 'Three ways to load only what changed',
        say: 'Loading only what changed needs a watermark: a stored value that says how far the last run got. I ran three strategies in DuckDB on the same six orders and three runs. Press Next for each.',
        items: [
          ['The setup', 'Six orders, each with a `modified_at` and a `committed_at`. O3 was stamped at 08:58 but committed at 09:03, after the first run had started. O4 and O5 share one timestamp, and were committed a fraction of a second apart. The runs happened at 09:00, at 09:10 and a moment later, and at 10:00.', 'Two real-life accidents: a slow commit and a tie.'],
          ['Strategy A: the largest value that was loaded', 'The watermark is the largest `modified_at` among the rows loaded, and the next run reads `modified_at > watermark`. It read ' + S.A.rows_read_in_total + ' rows and **lost ' + S.A.missing.join(', ') + '**: run 2 saw only one of the two rows with the tie, moved the watermark to their time, and the other row was no longer after it.', 'A tie in the timestamp.'],
          ['Strategy B: the time the run started', 'The watermark is the start time of the run, and the next run reads `modified_at > watermark and <= its own start`. It read ' + S.B.rows_read_in_total + ' rows and **lost ' + S.B.missing.join(' and ') + '**. O3 was stamped before the first run ended its window but committed after, so no window ever contained it. This is the pipeline most teams write first.', 'A slow commit and a tie.'],
          ['Strategy C: overlap and upsert', 'Each run starts 15 minutes before the previous watermark, and writes with an upsert by key. It read ' + S.C.rows_read_in_total + ' rows for six orders, repeated some of them, and **lost none**. The repeats do no harm because the upsert gives the same result for a row that it has seen.', 'A little extra reading buys safety.'],
          ['What it costs', 'Overlap reads more, here ' + S.C.rows_read_in_total + ' reads against 6 rows, a cost of 50 percent on this toy table. In a real table the overlap is minutes of changes, a small share of the day. The upsert needs a key, and a place where an update is cheap. Deletes in the source are invisible to all three strategies.', 'Overlap is cheap, and deletes are still missing.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'No strategy sees a delete.', t: 'A row deleted in the source leaves no row to read. Use a soft delete flag, change tracking, or change data capture when deletes matter.' }
      }),

      B.widget({ id: 'm5-wm-lab', kind: 'watermark', t: 1, src: 'rec', title: 'Lab: three watermark strategies, run in DuckDB' }),

      B.sql({
        id: 'm5-wm-sql', t: 1, src: 'docs', title: 'The watermark table and the merge', lang: 'tsql',
        code: WM_SQL,
        ctx: { role: 'Entra ID: id-brewline-adf', wh: 'Azure SQL database', db: 'brewline_meta' },
        steps: [
          { say: 'Two statements carry the whole pattern. A small table keeps one watermark for each table, and a merge writes rows so that a repeat changes nothing.', lines: null },
          { say: 'One row for each table, with the last value that was loaded. The stored procedure of the pipeline moves it after a successful copy.', lines: G.span(WM_SQL, /^CREATE TABLE/, /^\);/) },
          { say: 'The merge reads the rows that the copy wrote into a staging table. A row whose key exists is updated, and a row that is new is inserted. Running it twice on the same rows gives the same table.', lines: G.span(WM_SQL, /^MERGE/, /VALUES/) }
        ],
        note: 'These statements are standard T-SQL for Azure SQL Database or a Synapse dedicated pool, and they parse with sqlglot. They were not run on Azure. In a dedicated pool, MERGE has limits, so many teams use delete and insert in one transaction instead.'
      }),

      B.cmp({
        id: 'm5-sink', t: 1, src: 'docs', title: 'Patterns that are safe to repeat',
        say: 'A load is safe to repeat when running it twice leaves the same result as running it once. Press Next to compare the patterns, from the weakest to the strongest.',
        cols: ['Pattern', 'Safe to repeat?', 'How it works', 'Watch for'],
        hl: 1,
        rows: [
          ['Plain insert', 'no', 'Every run adds rows.', 'A retry after a partial load duplicates rows.'],
          ['Overwrite a dated folder', 'yes', 'Write the files of a run into a folder named by the date, replacing what is there.', 'Readers must not read the folder while it is being replaced. Write to a temporary name and rename on a hierarchical namespace.'],
          ['Upsert on keys', 'yes', 'A row that exists is updated and a new row is inserted.', 'It needs a key, and an update is more expensive than an insert.'],
          ['Stage, then merge', 'yes', 'Copy into a staging table, then merge or delete-and-insert into the target in one transaction.', 'The staging table must be emptied at the start of each run.'],
          ['Delta merge or overwrite by partition', 'yes', 'In Spark, merge into a Delta table, or replace a partition.', 'Needs Delta and an engine that writes it.']
        ],
        steps: [
          { upto: 2, say: 'The weak one and the simple fix. A dated folder makes a file load repeatable with no key at all.' },
          { upto: 5, say: 'Rows with keys. Upsert, stage and merge, and Delta give the same table however many times they run.' }
        ],
        pick: 'For files, **overwrite a dated folder**. For tables, **stage and merge on the key**, or **delete and insert by partition in one transaction**. Never rely on a plain insert, and add a **row-count gate** against the source.'
      }),

      B.talk({
        id: 'm5-fail', t: 1, src: 'docs', title: 'Failing on purpose',
        say: 'Every pipeline fails sometimes, and the question is what happens next. Press Next for the tools that Data Factory gives you.',
        items: [
          ['Retry and timeout', 'Each activity has a retry count, a wait between tries and a timeout. Retries cure the failures that pass: a throttled source, a dropped connection. They do nothing for a failure that repeats, and each retry bills. The default timeout of an activity is long, so set one that fits the job.', 'Retries for passing failures only.'],
          ['Dependency conditions', 'An arrow between activities carries a condition: Succeeded, Failed, Skipped or Completed. Succeeded is the normal path. Failed starts a handler. Completed runs the next step either way, for clean-up.', 'The arrow decides who runs next.'],
          ['The green run that failed', 'If a failed activity has a handler on its Failed path, and the handler succeeds, the pipeline run can finish as a success, because its last activities succeeded. A handled failure then looks healthy in Monitor. To end the run as failed, finish the handler with a **Fail** activity and a clear message.', 'Handle it, then fail on purpose.'],
          ['Fail with a message', 'The Fail activity stops the run with an error message and a code that you write. Put the table, the run id and the cause in the message, because that text goes into the alert that wakes someone.', 'A message a person can act on.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm5-rerun', t: 1, src: 'docs', title: 'Rerun and backfill',
        say: 'After a failure you rerun, and after a change in logic you backfill. Press Next for four rules.',
        items: [
          ['Rerun from the failed activity', 'In Monitor you can rerun a pipeline from the activity that failed. The steps before it do not run again. Use it when the earlier steps were fine and expensive, and only when the pipeline is written so that the failed step can start mid-way.', 'Skip what already worked.'],
          ['Rerun a window', 'A tumbling window rerun uses the same start and end, so the load reads the same slice. If the load is safe to repeat, the rerun is safe too. If it is not, the rerun doubles the data.', 'Same slice, so safe only if repeatable.'],
          ['Backfill in order', 'To reload a month, create a tumbling window trigger that starts at the first day, with a maximum concurrency and a self dependency if order matters. Watch the first windows before you walk away. A backfill is a production load of many days at once.', 'Order and concurrency first.'],
          ['Stop the trigger afterwards', 'A backfill trigger keeps going. When the old days are loaded, stop it or end it with an end time, and let the normal trigger carry on. Two triggers on one pipeline write the same slice twice.', 'Two triggers, one pipeline: a duplicate.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm5-orch', t: 1, src: 'docs', title: 'Data Factory or another orchestrator',
        say: 'Data Factory is not the only way to order work on Azure. Press Next to compare the common choices. Services change, so read the current page of any managed Airflow offering before you plan on it.',
        cols: ['Tool', 'Best for', 'Built with', 'Watch for'],
        hl: 1,
        rows: [
          ['Data Factory pipelines', 'copy, order and schedule data work across Azure and other stores', 'a visual editor that stores JSON', 'Complex logic gets awkward, and expressions are a small language of their own.'],
          ['Synapse pipelines, Fabric pipelines', 'the same ideas, inside the Synapse or Fabric workspace', 'the same editor', 'The feature sets differ. Check the list for each.'],
          ['Logic Apps', 'workflows that connect business systems, with hundreds of connectors', 'a visual designer or code', 'Priced by actions, and not built for bulk data movement.'],
          ['Durable Functions', 'long-running workflows written as code, with retries and waits', 'Python, C# or JavaScript', 'You write and test the code, and you own the operations.'],
          ['Apache Airflow', 'code-defined dependencies across many systems, with a large community', 'Python files', 'You run it, or buy a managed Airflow. Either way someone owns the platform.'],
          ['GitHub Actions or Azure Pipelines schedules', 'simple scheduled scripts, and deployments', 'YAML', 'Not an orchestrator for data dependencies, and runs are limited in length.']
        ],
        steps: [
          { upto: 3, say: 'Inside Azure. Data Factory is the default for data work. Logic Apps suits business integration.' },
          { upto: 6, say: 'Code-first and general. Durable Functions and Airflow when logic is complex. A scheduled workflow for a small job.' }
        ],
        pick: 'Use **Data Factory** for copy and ordering. Add **Airflow or Durable Functions** only when dependencies are too complex for a visual editor and a team will own the platform.'
      }),

      B.talk({
        id: 'm5-ci', t: 3, src: 'docs', title: 'Publish from a pipeline, not from a button',
        say: 'In the studio, a person presses Publish. A build can do the same job with no person. Press Next for how.',
        items: [
          ['The publish button', 'In the Data Factory studio, Publish writes the ARM templates of the factory to a branch, usually called `adf_publish`. Someone has to press it, so a release is not fully automatic.', 'A manual step.'],
          ['The npm package', 'Microsoft ships an npm package, `@microsoft/azure-data-factory-utilities`, with two commands: validate the factory files, and export the ARM template. A build pipeline runs them in place of the button.', 'Validate and export in a build.'],
          ['The artifact', 'The export becomes a build artifact. The release pipeline deploys that artifact to each factory, with the parameters of its environment, instead of reading the publish branch.', 'Deploy the artifact.'],
          ['What to check', 'The package needs a small configuration file in the repository and a current Node version, and the commands have changed over time. Read the current page for the form your version expects.', 'Read the current page.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm5-monitor', t: 1, src: 'docs', title: 'Monitoring a factory',
        say: 'You cannot fix what you do not see. Press Next for four places to look and one to look after.',
        items: [
          ['The Monitor hub', 'Each pipeline run, activity run and trigger run, with inputs, outputs, errors and durations. Data Factory keeps this history for 45 days, so anything you need longer must be exported.', 'Look here first. It forgets after 45 days.'],
          ['Metrics and alerts', 'Azure Monitor exposes metrics such as failed pipeline runs, failed activity runs and failed trigger runs. An alert rule on a metric sends an email, a message or a ticket through an action group.', 'Alert on failures, and on time.'],
          ['Diagnostic logs in Log Analytics', 'A diagnostic setting sends run logs to a Log Analytics workspace. In the resource-specific mode they land in tables such as `ADFPipelineRun`, `ADFActivityRun` and `ADFTriggerRun`, where KQL answers questions across months.', 'Keep history, and query it.'],
          ['What to alert on', 'A failed run, a run that takes far longer than usual, a run that did not start, and data that is late. The last two matter most: a pipeline that never ran sends no error.', 'Silence is the dangerous one.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-kql', t: 1, src: 'rec', title: 'Ask the logs with KQL', file: 'adf-logs.kql', lang: 'kql', code: KQL,
        steps: [
          { say: 'KQL reads from left to right. A table name, then a chain of steps joined by the pipe character. This query counts the activity runs of the last day by their status, and sorts the biggest group first.', lines: null },
          { say: '`where` keeps the rows of the last day. `ago(1d)` is a time one day before now.', lines: G.span(KQL, /^\| where TimeGenerated > ago\(1d\)$/) },
          { say: '`summarize` groups and counts. `runs = count() by Status` makes one row for each status with the number of runs. `order by` sorts.', lines: G.span(KQL, /^\| summarize/, /^\| order by runs desc$/) },
          { say: 'The second query lists the failed pipeline runs of the day with the pipeline name and the run id, newest first. This is the query behind the alert that says which pipeline failed.', lines: G.span(KQL, /^ADFPipelineRun/, /^\| order by TimeGenerated desc$/) }
        ],
        note: 'The Kusto language service of Microsoft parsed the first query without errors. A copy of it with a missing bracket gave "' + KQ.broken.errors[0] + '". That check is of syntax only: it has no table schemas, so it cannot tell that a table or a column does not exist. The table and column names come from the documentation.'
      }),

      B.challenge({
        id: 'm5-ch', t: 2, title: 'Coding round: the newest row for each order', file: 'newest_order.sql', lang: 'tsql',
        q: 'Strategy C reads some rows twice, so the raw table can hold several versions of an order. **Write a query that returns the newest version of each order** and nothing else, in T-SQL. A version is newer when its `modified_at` is later.',
        data: [{ name: 'orders_raw', cols: ['order_id', 'status', 'total_eur', 'modified_at'], rows: [['O1', 'PENDING', '10.0', '2026-03-14 08:30'], ['O1', 'COMPLETED', '10.0', '2026-03-14 09:05'], ['O2', 'COMPLETED', '12.5', '2026-03-14 08:45'], ['O2', 'COMPLETED', '12.5', '2026-03-14 08:45'], ['O3', 'PENDING', '8.0', '2026-03-14 08:58'], ['O3', 'CANCELLED', '8.0', '2026-03-14 09:40']] }],
        starter: '-- keep one row for each order_id: the one with the latest modified_at\nSELECT ...\nFROM orders_raw',
        hints: ['A window function can number the versions of each order. Partition by the order and sort by `modified_at` descending.', 'Number the rows in a subquery, then keep the rows numbered 1.', 'An exact duplicate, as with O2, has the same time. The numbering still gives one row the number 1.'],
        sol: 'SELECT order_id, status, total_eur, modified_at\nFROM (\n    SELECT *,\n           ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY modified_at DESC) AS rn\n    FROM orders_raw\n) AS x\nWHERE rn = 1\nORDER BY order_id;',
        res: { msg: '3 orders, one row each', cols: ['order_id', 'status', 'total_eur', 'modified_at'], rows: [['O1', 'COMPLETED', '10.0', '2026-03-14 09:05'], ['O2', 'COMPLETED', '12.5', '2026-03-14 08:45'], ['O3', 'CANCELLED', '8.0', '2026-03-14 09:40']] },
        expl: ['`ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY modified_at DESC)` numbers the versions of each order from the newest, so the newest gets 1.', 'The subquery is needed because T-SQL cannot filter on a window function in the same SELECT. Some other engines have a QUALIFY clause for this, and T-SQL does not.', 'For the exact duplicate O2, two rows have the same time. Either one is a correct answer, since they are equal. To make the choice stable, add a second sort column.', 'In production you would write this view once, and read the view, or merge on the key so that the table never holds old versions.'],
        cx: 'One sort of the rows of each order, so the time is roughly linear in the number of rows times the log of the versions of one order. In a distributed pool the rows of one key should sit on one distribution, to avoid a shuffle.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'You must reload every day of January, in order, with a limit on how many days run at once. Which trigger fits?',
        opts: [
          { t: 'A schedule trigger, started once for each day by hand', fb: 'It keeps no windows and cannot start runs for past times.' },
          { t: 'A tumbling window trigger with a start date of 1 January, a maximum concurrency and a self dependency', fb: '' },
          { t: 'A storage event trigger on the container', fb: 'It starts when a file appears, not for a range of past days.' },
          { t: 'A custom event trigger', fb: 'It needs events that someone publishes.' }
        ],
        ok: 1, why: 'A tumbling window creates a window for each slice since its start time, and runs them. The maximum concurrency limits how many run together, and a dependency on its own previous window makes them run in order.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'A copy fails. Its Failed path sends an email, and the email step succeeds. The pipeline run is green in Monitor. Why?',
        opts: [
          { t: 'The email step ended the pipeline, and it succeeded, so the run is a success', fb: '' },
          { t: 'Monitor hides failed copies', fb: 'Monitor shows the failed activity. The run status is the overall result.' },
          { t: 'Emails always turn a failure into a success', fb: 'There is no such rule.' },
          { t: 'The copy succeeded on a hidden retry', fb: 'A retry would show as attempts on the copy activity.' }
        ],
        ok: 0, why: 'A handled failure can leave a successful last step. To keep the run red, end the handler with a Fail activity and a message. Otherwise the alert on failed runs never fires.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'In the recorded runs, strategy B lost order O3. What was special about O3?',
        opts: [
          { t: 'It shared a timestamp with another order', fb: 'That was O4 and O5, which broke strategy A.' },
          { t: 'It was stamped at 08:58 but committed at 09:03, after the first run had read the window', fb: '' },
          { t: 'It was cancelled', fb: 'The status does not matter to the watermark.' },
          { t: 'It had the largest total', fb: 'The amount is not used by any strategy.' }
        ],
        ok: 1, why: 'The row got its `modified_at` when the transaction began and became visible only when it committed. Run 1 had already read the window by then, and run 2 started its window after 08:58, so no window ever held it. The overlap in strategy C reads that window again.'
      }),

      B.quiz({
        id: 'm5-q4', t: 1,
        q: 'Which trigger hands the pipeline the start and the end of the slice of time that it should process?',
        opts: [
          { t: 'A schedule trigger', fb: 'It passes the time that it fired, not a window.' },
          { t: 'A tumbling window trigger', fb: '' },
          { t: 'A storage event trigger', fb: 'It passes the file that arrived.' },
          { t: 'Every trigger passes a window', fb: 'Only the tumbling window defines windows.' }
        ],
        ok: 1, why: 'The tumbling window exposes `windowStartTime` and `windowEndTime`. A load that reads between them reads the same slice on every run and rerun.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the backfill of January in order.',
        items: [
          'Make the pipeline read its slice from the window start and end',
          'Check that the load is safe to repeat, with an upsert or a dated folder',
          'Create a tumbling window trigger that starts on 1 January, with a maximum concurrency and a self dependency',
          'Start it and watch the first windows finish and the row counts match',
          'Compare the counts per day with the source',
          'Stop or end the backfill trigger, and let the normal trigger carry on'
        ],
        why: 'The pipeline must be repeatable before a backfill touches it. Watch the first windows before you walk away, check the result against the source, and end the trigger, so that two triggers do not write one slice.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'The load copies the changed rows, then calls this procedure. Rows that change during the copy are missed for ever. Click the line that causes it.',
        file: 'set_watermark.sql', lang: 'tsql', code: SP_BUG, bad: [3],
        hint: 'The procedure gets the value to store as a parameter, and does not use it.',
        why: 'Line 3 sets the watermark to the time at which the procedure runs. The copy took minutes, and rows that changed in that time were not part of its window, yet the watermark now jumps past them. The pipeline passes the value that its window ended at, in `@new_value`, and the procedure must store that.',
        fix: SP_FIX,
        cheer: 'Store the end of the window that you read, never the time you finished.'
      }),

      B.bug({
        id: 'm5-bug2', t: 2, src: 'docs', q: 'A script starts the pipeline and reports success. The run failed an hour later and nobody knew. Click the line that is the problem.',
        file: 'start_run.py', lang: 'python', code: RUN_BUG, bad: [2],
        hint: 'Starting a run is not the same as finishing it.',
        why: '`create_run` only queues the run and returns its id. The script prints and exits, so it reports success whatever happens next. A script that must know the result polls `pipeline_runs.get` until the status is final and raises on anything but Succeeded. The status names Queued, InProgress, Succeeded, Failed, Canceling and Cancelled come from the SDK documentation.',
        fix: RUN_FIX,
        cheer: 'Starting is not finishing.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: how should the partner file load start?',
        scenario: 'A partner uploads an orders file between **03:00 and 09:00**, and sometimes later. Finance wants the data **as soon as it lands**, and wants to re-run **any day of the last 90 days** when a number looks wrong.',
        opts: [
          { t: 'A schedule trigger at 09:30 that checks for the file', d: 'Simple and predictable.', lose: 'The data waits until 09:30 even when the file landed at 03:10, and a file that is late needs a second schedule or a manual run.' },
          { t: 'A storage event trigger on the partner container, with a pipeline that takes the date as a parameter and is safe to repeat', d: 'The load starts when the file lands. Any day can be re-run from Monitor with its date.' },
          { t: 'A tumbling window every hour that looks for new files', d: 'Windows, retries and backfill.', lose: 'Most windows find nothing and still run and bill, and the slice of time says nothing about when the partner uploaded.' }
        ],
        pick: 1,
        why: 'The file decides when the load can start, so an event trigger starts it at once. The date is a parameter, and the load overwrites a dated folder, so any day can be re-run from Monitor without a second copy of the pipeline. Turn on the option to ignore empty blobs, so an empty event from a Data Lake write does not start it.',
        when: 'If the data came from a database at a fixed cadence, a tumbling window would be better: it has state, backfill and dependencies. Choose by what decides readiness: a file, or the clock.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: orders missing from the warehouse', time: '08:10',
        alert: '**Finance reports that the count of orders in the warehouse is 2 lower than the source for 14 March.** The pipeline ran successfully every night. It reads `modified_at > watermark and <= trigger time`, and moves the watermark to the trigger time. The two missing orders were committed minutes after they were stamped, by a long transaction in the order system.',
        clues: ['The copy uses the time the run started as the new watermark', 'The missing rows have a `modified_at` earlier than the run that skipped them', 'Every run reports success'],
        opts: [
          { t: 'Reload the missing window, then change the load to start each run a few minutes before the last watermark and to upsert by key', fb: '' },
          { t: 'Turn on more retries for the copy', fb: 'The copy did not fail. It read exactly the window it was told to read.' },
          { t: 'Move the watermark back by a year and reload everything', fb: 'A full reload works once and leaves the same flaw in place.' },
          { t: 'Ask the order system to stop long transactions', fb: 'It may help later, but you cannot rely on it. The load should tolerate late commits.' }
        ],
        best: 0,
        why: 'The recorded runs show it: with the start time as the watermark, a row stamped before the window and committed after it is never read, and every run is green. Overlap by a few minutes with an upsert, strategy C, reads the row on the next run and makes the repeat harmless. A count check against the source finds the gap the next morning.',
        checks: [
          ['Measure the gap', 'Compare counts and keys per day with the source. Which orders are missing, and when were they modified?'],
          ['Find the pattern', 'Missing rows were stamped before a window ended and committed after it.'],
          ['Repair the data', 'Reload the affected days, with an upsert so that the repeat is harmless.'],
          ['Change the load', 'Start each run before the previous watermark, and upsert by key.'],
          ['Add a check', 'A daily count and key comparison with the source, as a gate.']
        ],
        tell: 'Two orders were missing for one day because our load read modified_at up to the trigger time and moved the watermark there, and the order system committed those two rows minutes after it stamped them, so no window ever held them. I reloaded the day, changed the load to start each run fifteen minutes before the previous watermark and to upsert by order id, which reads the late rows on the next run without duplicating anything, and added a daily gate that compares counts with the source.',
        prevent: ['Use an **overlap window** and an **upsert**', 'Add a **count and key check** against the source', 'Know that **deletes are invisible** to a watermark', 'Store the **end of the window**, never the finish time']
      }),

      B.incident({
        id: 'm5-inc2', t: 2, src: 'docs', title: 'Incident: the windows are stuck', time: '07:45',
        alert: '**The tumbling window trigger for the orders load shows 11 windows queued and none running.** The first of them, for 3 March, is marked Failed after its retries. Every later window depends on the previous one. The cause of the first failure was a source database that was down for an hour.',
        clues: ['Each window waits for the previous window of the same trigger', 'The failed window is the oldest', 'The source is healthy again'],
        opts: [
          { t: 'Rerun the failed window. The queued windows then run in order, and the counts are checked', fb: '' },
          { t: 'Delete the trigger and create it again with a new start date', fb: 'It can skip or repeat days. The windows are state, and deleting them loses that state.' },
          { t: 'Raise the maximum concurrency to 50', fb: 'The windows are waiting on a dependency, not on a limit. More concurrency changes nothing.' },
          { t: 'Remove the dependency from every window and run them all at once', fb: 'It can run later days before earlier ones, and an incremental load needs the order.' }
        ],
        best: 0,
        why: 'A window that depends on its predecessor cannot start until the predecessor has succeeded, so one failed window holds back the rest. The source is back, so a rerun of the failed window releases the queue in order. The loads are safe to repeat, so rerunning is harmless. Then confirm the row counts for the days that waited.',
        checks: [
          ['Read the trigger runs', 'Which window is the oldest not to have succeeded, and why did it fail?'],
          ['Confirm the cause is fixed', 'Is the source reachable? Does a small manual run work?'],
          ['Rerun the failed window', 'Rerun that one window and watch the queue move.'],
          ['Check the data', 'Compare counts for the days that waited with the source.'],
          ['Alert earlier', 'An alert on a failed trigger run, and on a window that has waited too long.']
        ],
        tell: 'Eleven windows were queued because the window for 3 March had failed after its retries, when the source database was down for an hour, and each later window depends on the previous one. I confirmed that the source was reachable, reran the failed window, and watched the queue clear in order, then compared the row counts for the days that had waited. I added an alert on failed trigger runs and on windows that wait longer than an hour.',
        prevent: ['Alert on **failed trigger runs** and on **windows that wait too long**', 'Keep loads **safe to repeat**, so a rerun is harmless', 'Set a sensible **retry policy** on the trigger as well as the activity', 'Check **counts after a catch-up**']
      }),

      B.qa({
        id: 'qa-triggers', t: 1, tag: 'Data Factory', secs: 60,
        q: 'What are the trigger types in Data Factory, and how do you choose?',
        pts: ['Schedule: a clock, no state, no past runs', 'Tumbling window: fixed windows, state, backfill, dependencies, retries', 'Storage event: starts when a blob is created or deleted', 'Custom event: events on an Event Grid topic', 'Choose by what decides readiness: the clock, a window, or a file', 'Any trigger can fire twice, so the load must be safe to repeat'],
        short: 'There are four. A schedule trigger fires on a clock pattern, keeps no state, and cannot start runs for the past, but one trigger can start many pipelines. A tumbling window trigger creates fixed, contiguous, non-overlapping windows. It keeps state, so it can backfill from a start time in the past, depend on other windows, retry, limit concurrency, and hand the pipeline the start and end of its slice. A storage event trigger starts a pipeline when a blob is created or deleted, and a custom event trigger reacts to events on an Event Grid topic.\n\nI choose by what decides readiness. If the data arrives as a file, I use the event trigger and ignore empty blobs. If it is a time slice of a database, I use a tumbling window. For a simple regular job, a schedule is enough.\n\nWhichever I choose, I make the pipeline safe to repeat, because any trigger can fire twice, and I give it the date as a parameter so that I can rerun any day.',
        fu: [
          ['Why ignore empty blobs on an event trigger?', 'On an ADLS Gen2 account a write can raise an event for the file creation with no data before the write completes. Without the option, the pipeline can start on an empty file.'],
          ['How do you backfill?', 'A tumbling window trigger with a start time in the past, a maximum concurrency, and a self dependency if order matters. Then end it when the past is loaded.']
        ],
        trap: 'Using a schedule trigger for a load that needs backfill and then writing a manual loop to fake windows.',
        real: 'Describe a load and the trigger you chose, and why.'
      }),

      B.qa({
        id: 'qa-incr', t: 2, tag: 'Data Factory', secs: 90,
        q: 'How do you load only the rows that changed, and how can a watermark lose data?',
        pts: ['A watermark stores how far the last run got, per table', 'Largest loaded value: a tie in the timestamp loses a row', 'Run start time: a row committed after its window is lost', 'Overlap and upsert reads again and loses nothing', 'Deletes are invisible, so use soft deletes, change tracking or CDC', 'Add a count check against the source'],
        short: 'I keep a watermark for each table, a value that says how far the last run got, and the next run reads only the rows after it. The strategy matters, because each simple one can lose rows. If the watermark is the largest value loaded and the next run reads strictly after it, two rows that share a timestamp can be split by a run, and one is lost. If the watermark is the time the run started, a row that was stamped before the window ended but committed after it is never read.\n\nI use an overlap: each run starts a few minutes before the previous watermark, and writes with an upsert by key, so a row that is read twice changes nothing. I ran the three strategies on the same six rows in DuckDB and only the overlap lost nothing.\n\nNone of them sees a delete, so when deletes matter I use a soft delete flag, change tracking or change data capture. And I add a daily count and key check against the source, because a silent gap is the worst kind.',
        fu: [
          ['What does the overlap cost?', 'Extra reading, a few minutes of changes for each run, and an upsert needs a key. It is small next to a missing order.'],
          ['What is CDC for?', 'Reading every insert, update and delete from the log of the database, so that deletes and timestamp ties are not a problem.']
        ],
        trap: 'Trusting the watermark because the pipeline is green. Compare counts with the source.',
        real: 'Describe a gap you found in an incremental load and how you closed it.'
      }),

      B.qa({
        id: 'qa-idem', t: 1, tag: 'Data Factory', secs: 60,
        q: 'How do you make a Data Factory load safe to repeat?',
        pts: ['A retry or a rerun repeats the work, so the result must not change', 'Files: overwrite a folder named by the run date', 'Tables: stage, then merge on the key, or delete and insert by partition in a transaction', 'Never rely on a plain insert', 'Take the slice from parameters, not from the clock', 'A row-count gate against the source'],
        short: 'Retries, reruns and double triggers all repeat the work, so the load has to give the same result whether it runs once or twice.\n\nFor files, I write to a folder named by the run date and overwrite it, so a repeat replaces the files. For tables, I copy into a staging table and then merge on the key, or delete the partition and insert it in one transaction. I never rely on a plain insert, because a retry after a partial load duplicates rows.\n\nI also take the slice of data from a parameter, such as the window start and end of a tumbling window trigger, and not from the clock, so a rerun reads the same slice.\n\nFinally I add a row-count gate that compares the target with the source and fails the run on a difference. That is what turns a silent duplicate into an alert.',
        fu: [
          ['Why not a primary key to reject duplicates?', 'In a warehouse a key may not be enforced, and a rejected row fails the whole copy. A merge handles the repeat without an error.'],
          ['How do you test it?', 'Run the pipeline twice on the same slice and compare the tables, and kill a run half-way and run it again.']
        ],
        trap: 'Assuming that retries fix everything. A retry of a plain insert is a duplicate.',
        real: 'Describe a duplicate you found and the change that fixed it.'
      }),

      B.qa({
        id: 'qa-fail', t: 1, tag: 'Data Factory', secs: 60,
        q: 'How do you handle failures in a Data Factory pipeline?',
        pts: ['Retries and timeouts on activities, for failures that pass', 'Dependency conditions: Succeeded, Failed, Skipped, Completed', 'A Failed path sends a notification', 'End the run with a Fail activity, or the run can look green', 'A message with the table, the run id and the cause', 'Alerts on failed runs and on runs that never started'],
        short: 'I start with retries and timeouts on the activities that can meet a passing failure, such as a throttled source, and I know that a retry bills and does not help a failure that repeats.\n\nThe arrows between activities carry conditions: Succeeded, Failed, Skipped and Completed. A Failed path can start a handler that sends a notification. A handled failure can leave the pipeline run green, because the last step succeeded, so I finish the handler with a Fail activity and a message that names the table, the run id and the cause. Then the run is red, and the alert on failed runs fires.\n\nI also alert on what does not happen: a run that never started and a run that takes far longer than usual, because a pipeline that never ran sends no error. And I keep the loads safe to repeat, so that rerunning from the failed activity or the failed window is harmless.',
        fu: [
          ['What is the Completed condition for?', 'Clean-up steps that must run whether the previous step succeeded or failed.'],
          ['How long does Monitor keep history?', 'Forty-five days. Send diagnostic logs to Log Analytics for longer.']
        ],
        trap: 'Sending an email on failure and leaving the run green.',
        real: 'Describe a failure that nobody saw, and the alert you added.'
      }),

      B.qa({
        id: 'qa-orch', t: 2, tag: 'Data Factory', secs: 60,
        q: 'When would you use something other than Data Factory to orchestrate a pipeline?',
        pts: ['Data Factory is the default for copying and ordering data work', 'Logic Apps for business system workflows with connectors', 'Durable Functions for long-running workflows written as code', 'Airflow for complex dependencies, with someone who owns the platform', 'Scheduled workflows for small scripts and deployments', 'Decide on the team, the complexity and who operates it'],
        short: 'Data Factory is my default for copying and ordering data work in Azure. It is visual, it integrates with the stores and engines, and it has triggers and monitoring built in.\n\nI would reach for something else when its limits hurt. Logic Apps fits a workflow that connects business systems with many connectors, and it is priced by actions, so it is not for bulk data. Durable Functions fits a long-running workflow that is easier to write and test as code. Apache Airflow fits complex dependencies across many systems when a team is happy to own the platform, either by running it or by buying a managed one. A scheduled GitHub or Azure Pipelines workflow is fine for a small script or a deployment.\n\nI decide on three things: how complex the dependencies are, whether the team prefers code or a visual tool, and who will operate the platform at three in the morning.',
        fu: [
          ['What is the cost of Airflow?', 'The platform: someone must run, upgrade and monitor it, or pay for a managed service and still own the DAGs.'],
          ['Can pipelines call code?', 'Yes. A pipeline can call a notebook, a function or a web endpoint, so Data Factory can order work that runs elsewhere.']
        ],
        trap: 'Adding a second orchestrator without a reason. It doubles the things to monitor.',
        real: 'Describe a workflow you moved between orchestrators, and why.'
      }),

      B.qa({
        id: 'qa-monitor', t: 1, tag: 'Data Factory', secs: 60,
        q: 'How do you monitor Data Factory and get told when something goes wrong?',
        pts: ['The Monitor hub for pipeline, activity and trigger runs, kept for 45 days', 'Metrics and alert rules for failed runs, with an action group', 'Diagnostic settings to Log Analytics, queried with KQL', 'Alert on failures, long durations and runs that never started', 'Late data matters most, and a pipeline that never ran sends no error', 'Keep the volume of logs under control'],
        short: 'The Monitor hub shows every pipeline run, activity run and trigger run with inputs, outputs, errors and durations, and keeps them for 45 days. For alerts I use Azure Monitor metrics such as failed pipeline runs and failed trigger runs, with an alert rule and an action group that sends an email or a message.\n\nFor history and for questions across months I turn on a diagnostic setting that sends the run logs to a Log Analytics workspace, in the resource-specific mode, where tables such as the pipeline run and activity run tables can be queried with KQL. For example, I count activity runs by status for the last day, or list the failed runs of each pipeline.\n\nI alert on three things: failed runs, runs that take much longer than usual, and runs that did not start, because a pipeline that never ran sends no error. I also check freshness of the data itself. And I choose which logs to send, because a workspace bills for every GB it ingests.',
        fu: [
          ['What is the resource-specific mode?', 'Logs land in dedicated tables for each type of run, instead of one shared table, which makes queries simpler and cheaper.'],
          ['What is an action group?', 'A reusable set of notification targets, such as emails, a chat message or a webhook, that alerts can call.']
        ],
        trap: 'Alerting only on failures. A load that never ran sends none.',
        real: 'Describe an alert you set that caught a problem early.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Pipeline Operator', color: '#BBF7D0',
        pts: [
          'A **tumbling window** keeps state: it can **backfill, depend on another window and retry**. A schedule keeps none, and an event trigger starts on a file.',
          'A **watermark** can lose rows: ties break the largest value, slow commits break the run time. **Overlap and upsert** loses none.',
          'Make a load **safe to repeat**: overwrite a **dated folder**, or **stage and merge** on the key. Never rely on a plain insert.',
          'A handled failure can leave a run **green**. End with a **Fail activity** and a message a person can act on.',
          '**Monitor** keeps 45 days. Send logs to **Log Analytics**, query with **KQL**, and alert on **runs that never started**.'
        ],
        lines: [
          'I read the slice from the window, not from the clock.',
          'I compare counts with the source after every catch-up.',
          'I make failures loud and silence impossible.'
        ]
      })
    ]
  });
})();
