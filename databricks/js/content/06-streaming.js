/* Mission 6: streaming. Triggers, the micro-batch cycle, state, watermarks and late data.
   The watermark runs and the error message are recorded from open-source Spark. Trigger cost and output modes come from documentation and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var WM = G.file('stream/watermark.py');
  var RUNS = G.counts('stream.watermark_runs'), BATCH = G.table('stream.watermark_batch_counts');
  var BRZH = G.history('stream.bronze_history');
  var ERR_NOWM = G.text('stream.err_append_no_watermark');
  var BADWM = [
    'windows = (events',
    '    .groupBy(F.window("event_time", "10 minutes"))',
    '    .agg(F.count("*").alias("orders")))',
    '',
    '(windows.writeStream',
    '    .outputMode("append")',
    '    .option("checkpointLocation", ckpt)',
    '    .start(out))'
  ].join('\n');
  var FIXWM = [
    'windows = (events',
    '    .withWatermark("event_time", "10 minutes")',
    '    .groupBy(F.window("event_time", "10 minutes"))',
    '    .agg(F.count("*").alias("orders")))',
    '',
    '(windows.writeStream',
    '    .outputMode("append")',
    '    .option("checkpointLocation", ckpt)',
    '    .start(out))'
  ].join('\n');
  var win = function (r) { return r.window_start.slice(11, 16) + ' to ' + r.window_end.slice(11, 16); };
  var FIRST = BATCH.rows[0];
  G.expect(RUNS.length === 3 && RUNS[0].emitted.length === 0 && RUNS[1].emitted[0].orders === 3 && RUNS[2].dropped_by_watermark === 1, 'the three runs: nothing emitted, 3 emitted, 1 dropped');
  G.expect(FIRST[2] === '4' && BRZH.length === 3, 'the batch recount finds 4 events in the first window, and bronze has three streaming commits');
  G.expect(/without watermark/.test(ERR_NOWM), 'append mode without a watermark is refused');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Streaming: triggers, state and late data', short: 'Streaming', blurb: 'The micro-batch cycle, triggers, watermarks and what happens to late events', minutes: 34,
    focus: ['air'],
    goals: [
      'Describe a **micro-batch** and what the **checkpoint** records in it.',
      'Choose a **trigger**, and say what each one costs on Databricks.',
      'Explain a **watermark** and say which events it drops.',
      'Pick an **output mode** for an aggregation.',
      'Find and fix a stream that **loses late events**.'
    ],
    say: 'Mission 6 is streaming. You already ran a stream in mission 5. Here you look at what happens inside: how a micro-batch works, when a stream stops, and what Spark does with an event that arrives late. The watermark runs are real. I gave Spark three files of events, one of them late, and kept every output.',
    scenes: [
      B.talk({
        id: 'm6-talk', t: 1, src: 'rec', title: 'Structured Streaming in five ideas',
        say: 'Spark Structured Streaming lets you write the same DataFrame code for data that keeps arriving. Press Next for the five ideas.',
        items: [
          ['A stream is a table that grows', 'You write a query against a source, such as a folder of files or a Delta table. Spark treats new rows as new rows of an unbounded table, and runs your query on them.', 'Same code, new rows each time.'],
          ['Micro-batches', 'Spark does not process one row at a time. It reads a range of new data, runs the plan on that range, writes the result, and repeats. Each repeat is a **micro-batch**.', 'Small batches, one after another.'],
          ['The trigger decides when', 'A **trigger** sets when the next batch starts: as fast as possible, every minute, or once for all data that is available. The next screen compares them.', 'When a batch begins.'],
          ['The checkpoint remembers', 'The checkpoint stores which data each batch read, and the state of aggregations. After a restart the stream continues where it stopped.', 'Progress and state survive a restart.'],
          ['State has a cost', 'A running count or a join keeps **state**: values that wait for more data. State takes memory and storage. A **watermark** tells Spark when old state can go.', 'Bound the state.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm6-triggers', t: 1, src: 'docs', title: 'Triggers and what they cost',
        say: 'The trigger is also a cost decision on Databricks, because compute bills while it runs. Press Next to compare. Only `availableNow` ran in my recordings. The rest follows the Spark documentation.',
        cols: ['Trigger', 'What it does', 'Compute while idle', 'Use it for'],
        hl: 3,
        rows: [
          ['No trigger set', 'Starts the next micro-batch as soon as the last one ends.', 'Stays up all day and night.', 'Results within seconds.'],
          ['`processingTime="1 minute"`', 'Starts a batch every minute.', 'Stays up all day and night.', 'Results within minutes, with steady load.'],
          ['`availableNow=True`', 'Processes all the data that is available now, in one or more batches, then stops.', 'Can stop between runs. You schedule the job.', 'Hourly or daily ingestion. This is the pattern in missions 5 and 6.'],
          ['`once=True`', 'Processes one batch, then stops. Deprecated in favor of `availableNow`.', 'Can stop between runs.', 'Old code. Move to `availableNow`.']
        ],
        steps: [
          { upto: 2, say: 'The first two keep the stream alive. That is the right choice when a person or a system needs the result within seconds or a minute. A cluster that runs 24 hours bills 24 hours.' },
          { upto: 3, say: '`availableNow` is the cost-saving pattern. A job starts, reads what is new, writes it and stops. In mission 5, run 3 read 0 rows and finished. An empty run costs only the start-up time.' },
          { upto: 4, say: '`once` is the older version of the same idea and is deprecated. Use `availableNow`, which can split a large backlog into several batches.' }
        ],
        pick: 'Use **availableNow on a schedule** unless someone needs results within seconds. Most dashboards that refresh every hour do not need a stream that runs all day.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put one micro-batch in order.',
        items: [
          'The trigger fires and Spark asks the source what is new',
          'Spark writes the range it will read to the offsets folder of the checkpoint',
          'Spark runs the query on that range',
          'Spark writes the result to the sink, here a Delta commit',
          'Spark writes a marker to the commits folder of the checkpoint'
        ],
        why: 'Offsets first, commit last. If the job dies between the second and the last step, the restart finds an offset without a commit and runs the batch again. In mission 5 you saw both folders after the first run. The Delta sink recognises a repeated batch from its id, so the retry does not write the rows twice.'
      }),

      B.rows({
        id: 'm6-sink', t: 2, src: 'rec', title: 'Delta as the sink: one commit for each batch',
        steps: [
          {
            say: 'The bronze stream wrote to a Delta table. Every batch that carried data became one commit with the operation `STREAMING UPDATE`. The commit records the epoch, which is the batch number, and the query id.',
            tabs: [{ layer: 'DELTA', name: 'DESCRIBE HISTORY of bronze', c: 'stg', cols: ['version', 'operation', 'epochId', 'rows written', 'files added'], rows: BRZH.map(function (r) { return [String(r.version), r.operation, r.operationParameters.epochId, r.operationMetrics.numOutputRows, r.operationMetrics.numAddedFiles]; }), trk: 2 }],
            notes: ['The empty trigger in mission 5 left no row here: a batch with no data writes no commit.']
          },
          {
            say: 'The epoch and the query id are what make the sink safe to retry. When Spark runs a batch again after a failure, Delta sees that it already holds that epoch for that query and skips the write. This gives **exactly-once** results into a Delta table, as long as the source can be replayed.',
            tabs: [{ layer: 'DELTA', name: 'one commit per batch', c: 'stg', cols: ['version', 'operation', 'epochId', 'rows written', 'files added'], rows: BRZH.map(function (r) { return [String(r.version), r.operation, r.operationParameters.epochId, r.operationMetrics.numOutputRows, r.operationMetrics.numAddedFiles]; }), chg: [[0, 2], [1, 2], [2, 2]] }],
            notes: ['The skip rule comes from the Delta documentation. I did not force a failed batch in this recording.']
          }
        ]
      }),

      B.talk({
        id: 'm6-state', t: 2, src: 'docs', title: 'State: what a stream keeps in memory',
        say: 'A stateless query, like a filter, needs nothing from earlier batches. A stateful one does. Press Next for the cases. These points come from the Spark and Databricks documentation.',
        items: [
          ['Stateful operations', 'A running count by window, a deduplication, and a join between two streams all keep state between batches. The state grows with the number of keys and windows that are still open.', 'Counts, dedup and stream joins.'],
          ['Where state lives', 'In the executors, and in the checkpoint. Spark writes state to the checkpoint after each batch so a restart can load it. Databricks recommends the RocksDB state store for large state, because the default keeps all state in memory.', 'Memory first, checkpoint for safety.'],
          ['State must be bounded', 'Without a rule for when to forget, a windowed count would keep every window forever, and the job would run out of memory some weeks later. The **watermark** is that rule.', 'Unbounded state is a slow failure.'],
          ['A changed query can break a checkpoint', 'The state in the checkpoint matches the query that wrote it. If you change the grouping or the aggregation, the old state no longer fits and Spark may refuse to start. Plan a new checkpoint and a replay for such changes.', 'Change the query, change the checkpoint.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm6-lab', kind: 'watermark', t: 1, src: 'rec', title: 'Lab: the watermark and the late event' }),

      B.code({
        id: 'm6-code', t: 1, src: 'rec', title: 'The code that made the lab', file: 'watermark.py', lang: 'python', code: WM,
        steps: [
          { say: 'This is the code behind the lab. It reads events from a folder: each has an event time and an order id.', lines: G.span(WM, /events = /, /events = /) },
          { say: '`withWatermark("event_time", "10 minutes")` tells Spark how late an event may be. The watermark is the largest event time Spark has seen, minus 10 minutes. A window whose end is before the watermark is closed.', lines: G.span(WM, /withWatermark/, /withWatermark/) },
          { say: 'Group into 10-minute windows by event time, and count. Event time is the time the order happened, not the time the file arrived.', lines: G.span(WM, /groupBy/, /agg/) },
          { say: '`outputMode("append")` means: write a window once, when it is final. With a watermark, Spark knows when a window is final.', lines: G.span(WM, /outputMode/, /outputMode/) },
          { say: 'In this test I collected the output in a list with `foreachBatch`. In your pipeline you would write the rows to a Delta table.', lines: G.span(WM, /def collect_batch/, /emitted\.append/) },
          { say: 'The checkpoint stores the state and the watermark. `availableNow` processes the file and stops. I ran the code three times, once for each file.', lines: G.span(WM, /checkpointLocation/, /awaitTermination/) }
        ],
        note: 'One more detail from the recording: Spark ran one extra batch after the data batch, with no new data, to close the windows that the new watermark had passed. That is why the emitted windows carry batch numbers 3 and 5.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'The watermark is 09:15. An event arrives with event time 09:04, in the window 09:00 to 09:10, which Spark already emitted. What happens to it?',
        opts: [
          { t: 'Spark drops it from the windowed count and reports it in the query progress', fb: '' },
          { t: 'Spark emits the window 09:00 to 09:10 a second time with the new count', fb: 'In append mode a window is written once. The recording shows the first window emitted once with 3.' },
          { t: 'Spark fails the query with an error', fb: 'Dropping late data is normal behaviour. In the recording the run finished, and Spark counted 1 row dropped by the watermark.' },
          { t: 'Spark moves the event into the next window', fb: 'An event belongs to the window of its own time. Spark does not move it.' }
        ],
        ok: 0, why: 'The window ended at 09:10, which is before the watermark 09:15, so Spark has closed it and discarded its state. The event is too late. In the recording `numRowsDroppedByWatermark` was 1, and the batch recount found 4 events in that window while the stream said 3.'
      }),

      B.cmp({
        id: 'm6-modes', t: 2, src: 'docs', title: 'Output modes for an aggregation',
        say: 'The output mode says which rows of the result table a stream writes in each batch. Press Next to compare. This follows the Spark documentation.',
        cols: ['Mode', 'What it writes in each batch', 'Needs a watermark', 'State'],
        hl: 3,
        rows: [
          ['Append', 'Only rows that are final and will never change.', 'Yes, for a windowed aggregation', 'Dropped once a window closes.'],
          ['Update', 'Only the rows that changed since the last batch.', 'No, but a watermark limits state', 'Kept until the watermark passes.'],
          ['Complete', 'The whole result table, every batch.', 'No', 'All state is kept for ever. Use only for small results.']
        ],
        steps: [
          { upto: 1, say: 'Append is the cleanest for a table that others read, because every row is final. It waits until a window closes, so results arrive after the watermark passes.' },
          { upto: 2, say: 'Update shows a window early and rewrites it as more events arrive. The sink must support updates, for example a Delta table written with a merge in `foreachBatch`.' },
          { upto: 3, say: 'Complete rewrites everything each time. Use it only when the result is tiny.' }
        ],
        pick: 'Choose **append with a watermark** for a final table. Choose **update** when a dashboard must show the current value of an open window.'
      }),

      B.bug({
        id: 'm6-bug', t: 2, q: 'This windowed count fails when you start it. Click the line you must change.',
        file: 'orders_per_window.py', lang: 'python', code: BADWM, bad: [G.at(BADWM, /groupBy/), G.at(BADWM, /outputMode/)],
        hint: 'Append mode only works when Spark knows when a window is final. Look at what the stream is missing.',
        why: 'The recorded error is: "' + ERR_NOWM.replace(/^\[[A-Z_.]+\] /, '').replace(/ SQLSTATE.*$/, '') + '" Append writes a window once, when it is final, and without a watermark Spark never knows that. Add `.withWatermark("event_time", "10 minutes")` before the `groupBy`, or switch to update mode.',
        fix: FIXWM,
        cheer: 'The error tells you the fix, if you read the whole sentence.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'rec', title: 'Decision: how long should the watermark wait?',
        scenario: 'Orders from the mobile app can arrive up to **2 hours** late when a phone is offline. The operations dashboard needs counts for each 10 minutes within **15 minutes**. Finance needs **exact** counts.',
        opts: [
          { t: 'A watermark of 10 minutes', d: 'Small state, results soon after each window.', lose: 'Orders that arrive more than 10 minutes late are dropped. In the recording, one event of four was lost from a window.' },
          { t: 'A watermark of 2 hours', d: 'Counts every order that arrives within 2 hours.', lose: 'In append mode a window is written only after the watermark passes its end, so every result is 2 hours late and Spark keeps 12 times as many windows in state. The dashboard misses its 15 minute goal.' },
          { t: 'A short watermark for the dashboard, and a batch recount from bronze for finance', d: 'Two readers, two answers.' }
        ],
        pick: 2,
        why: 'The dashboard gets fast counts that may be slightly low. A batch job that reads bronze has no watermark, so it counts every event. In the recording the recount said 4 where the stream said 3. Finance reads the recount. This costs one extra daily job and avoids a 2-hour delay.',
        when: 'If late events are rare and a small error is fine, the short watermark alone is enough. If the dashboard must also be exact, use update mode with a long watermark, and accept that values change as late events arrive.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the stream counts do not match the nightly recount', time: '09:30',
        alert: '**The live dashboard shows ' + RUNS[1].emitted[0].orders + ' orders for ' + win({ window_start: FIRST[0], window_end: FIRST[1] }) + '. The nightly batch recount shows ' + FIRST[2] + '.** Finance noticed one order missing. The job did not fail.',
        clues: ['The stream uses a 10 minute watermark', 'The missing order has an event time of 09:04', 'It reached the pipeline after 09:15'],
        opts: [
          { t: 'Compare the stream and the recount for each window, then check the dropped rows in the query progress', fb: '' },
          { t: 'Restart the stream from the beginning', fb: 'A replay with the same watermark drops the same event again, or a different one.' },
          { t: 'Increase the number of shuffle partitions', fb: 'Partition counts do not decide which events are late.' },
          { t: 'Delete the checkpoint to reset the state', fb: 'You would read every file again and double the bronze rows, and the late event would still be late.' }
        ],
        best: 0,
        why: 'The job ran without errors, so the difference is by design. A late event was dropped. The query progress reports `numRowsDroppedByWatermark`, and it was ' + RUNS[2].dropped_by_watermark + ' in the third run. The batch recount has no watermark, so it counts every event.',
        checks: [
          ['Compare the windows', 'The stream and the recount differ in one window, by one order.'],
          ['Read the query progress', '`numRowsDroppedByWatermark` is 1 for the run that carried the late event.'],
          ['Check the lateness', 'The event time was 09:04 and the event arrived when the watermark was 09:15.'],
          ['Decide what the dashboard needs', 'If one order in four matters, lengthen the watermark. If not, keep it and document the gap.'],
          ['Keep the recount', 'Finance reads the batch recount from bronze.']
        ],
        tell: 'The streaming dashboard counted one order fewer than the nightly recount for one window, and no job failed. I compared the two for each window and read the query progress, which reported one row dropped by the watermark. A late event with an event time of 09:04 had arrived after the watermark passed its window, so Spark discarded it. The recount reads bronze without a watermark, so it kept the event. We kept the 10 minute watermark for the dashboard, and finance now reads the recount. We also alert when dropped rows exceed one percent.',
        prevent: ['Alert on **numRowsDroppedByWatermark** and on the share of late events', 'Choose the watermark from the **measured lateness** of the source', 'Keep a **batch recount** from bronze for exact numbers', 'Document that the dashboard is approximate']
      }),

      B.qa({
        id: 'qa-stream', t: 1, tag: 'Streaming', secs: 60,
        q: 'What is Structured Streaming? What do the trigger and the checkpoint do?',
        pts: ['Same DataFrame code on data that keeps arriving', 'Micro-batches: read new data, run the plan, write, repeat', 'Trigger: when the next batch starts', 'Checkpoint: offsets of each batch and the state', 'A restart continues from the checkpoint', 'Delta sink commits each batch once'],
        short: 'Structured Streaming lets me write the same DataFrame code for data that keeps arriving. Spark treats new rows as the next rows of a table that grows, and runs the query in micro-batches: it reads a range of new data, runs the plan, writes the result and repeats.\n\nThe trigger decides when a batch starts: as fast as possible, every minute, or once for all available data with `availableNow`. On Databricks I schedule `availableNow` jobs for hourly ingestion, because the compute stops between runs.\n\nThe checkpoint holds the offsets of each batch and the state of aggregations. Spark writes the offsets before a batch and a commit marker after it, so after a failure it runs the unfinished batch again. A Delta sink recognises the repeated batch, so the rows are not written twice. In my test, a run with no new files read 0 rows and wrote no commit.',
        fu: [
          ['What happens if you delete the checkpoint?', 'The stream starts from the beginning and reads every file again, so bronze would get duplicates. Treat the checkpoint as part of the table.'],
          ['Continuous or availableNow?', 'Continuous or a fixed interval for results within seconds or minutes. `availableNow` on a schedule when a delay of an hour is fine and you want the compute to stop.']
        ],
        trap: 'Describing streaming as processing one row at a time. Spark processes micro-batches.',
        real: 'Say which triggers your streams used and what the schedule cost.'
      }),

      B.qa({
        id: 'qa-watermark', t: 2, tag: 'Streaming', secs: 90,
        q: 'What is a watermark, and what happens to late data?',
        pts: ['Watermark = largest event time seen minus the allowed delay', 'A window that ends before the watermark is closed and its state is dropped', 'Events for a closed window are dropped', 'Append mode needs it to know when a window is final', 'Trade-off: longer delay means more state and later results', 'Monitor dropped rows; keep a batch recount for exact numbers'],
        short: 'A watermark tells Spark how late an event may be. Spark tracks the largest event time it has seen. The watermark is that time minus the delay I set, for example 10 minutes. A window that ends before the watermark is closed: Spark emits it in append mode and frees its state. An event for a closed window is dropped.\n\nIn my test with a 10 minute watermark, an event for 09:04 arrived when the watermark was 09:15. The window 09:00 to 09:10 was already emitted with 3 orders, so the event was dropped. Spark reported one row dropped by the watermark. A batch recount, which has no watermark, found 4.\n\nThe delay is a trade. A longer one catches more late events but delays the results and keeps more state. I choose it from the measured lateness of the source, alert on the dropped rows, and keep a batch recount from bronze for numbers that must be exact.',
        fu: [
          ['Is the watermark the current time?', 'No. It is based on the largest event time in the data, not the clock. If no new events arrive, the watermark does not move.'],
          ['Why does append mode need one?', 'Without a watermark Spark never knows that a window is final, so it cannot decide to write it once. The recorded error says exactly that.']
        ],
        trap: 'Saying the watermark is a time limit on the job. It is a rule about event time and state.',
        real: 'Give the lateness you measured on a source and the watermark you chose.'
      }),

      B.qa({
        id: 'qa-replay', t: 2, tag: 'Streaming', secs: 90,
        q: 'A bug in the silver logic was live for three days. How do you repair silver?',
        pts: ['Bronze is raw, so rebuild from it', 'Fix and test the code first', 'Build into a new table or restore, never edit silver by hand', 'Reset the silver checkpoint to read bronze from the start, or from a version', 'The merge is idempotent, so the replay is safe', 'Swap the new table in, and compare counts first'],
        short: 'Because bronze keeps every arrival raw, I can rebuild silver from it. First I fix the code and add a test that fails on the bug.\n\nThen I rebuild. For a table that others read, I write the corrected rows into a new table: a fresh checkpoint, `availableNow`, and bronze as the source from the start of the bad period. A Delta source can start from a version or a timestamp, so I do not have to replay everything. I compare row counts and a few key totals against the old table, and then I swap the new one in or restore the old table to a version before the bug and replay on top of it.\n\nThe merge is idempotent, so a replay does not double count. I never edit silver by hand, because nobody could tell afterwards which rows were repaired. I write the incident and the fix into the runbook.',
        fu: [
          ['What if bronze is gone?', 'Then you depend on the source system or on backups. This is why bronze keeps data longer than the delay of any downstream job.'],
          ['How do you read a Delta table as a stream from a version?', 'With the `startingVersion` or `startingTimestamp` option on the Delta source (documentation).']
        ],
        trap: 'Patching the bad rows with an UPDATE. It fixes today and hides the cause.',
        real: 'Describe a replay you ran and how you checked the result.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Stream Watcher', color: '#BAE6FD',
        pts: [
          'A stream is a **table that grows**. Spark runs it as **micro-batches**.',
          'The **checkpoint** holds offsets and state. Offsets first, commit last.',
          '**availableNow** on a schedule stops the compute between runs. An empty run reads 0 rows.',
          'A **watermark** is the largest event time minus a delay. A window that ends before it is closed.',
          'A late event is **dropped**: ' + RUNS[2].dropped_by_watermark + ' row in the recording, ' + RUNS[1].emitted[0].orders + ' against ' + FIRST[2] + ' in the first window.',
          'Append mode needs a watermark. Keep a **batch recount** from bronze when numbers must be exact.'
        ],
        lines: [
          'I choose the watermark from the measured lateness of the source.',
          'I alert on rows dropped by the watermark.',
          'I keep bronze raw so I can replay.'
        ]
      })
    ]
  });
})();
