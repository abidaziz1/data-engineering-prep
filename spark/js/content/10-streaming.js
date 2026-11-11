/* Mission 10: Structured Streaming. A stream as a table that grows, micro-batches, event-time windows, the watermark and the row that arrives too late, the three output modes, the
   state that grows without a watermark, the checkpoint, and a restart that writes a batch twice. Six small files arrive one at a time and every batch is read from the progress
   reports of a real Spark 4.0.1. No Kafka ran: that part is from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FI = G.table('stream.files'), PR = G.table('stream.progress'), UP = G.table('stream.update'), AP = G.table('stream.append'), CM = G.table('stream.complete');
  var CK = G.counts('stream.checkpoint').tree, RS = G.counts('stream.restart'), GR = G.table('stream.state_growth'), NW = G.counts('stream.no_watermark');
  var DEF = G.table('conf.defaults');
  var PY = G.file('code/streaming.py');
  var WIN = G.lines(PY, G.at(PY, /^def windowed/), G.at(PY, /return events\.groupBy/));
  var RUN = G.lines(PY, G.at(PY, /^def run/), G.at(PY, /return out, prog, error/));
  var ONB = G.lines(PY, G.at(PY, /def on_batch/), G.at(PY, /out\.append\(\{'batch': batch_id/));
  var FILES = G.lines(PY, G.at(PY, /^FILES = \[/), G.at(PY, /^\]$/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var late = PR.rows.filter(function (r) { return Number(r[5]) > 0; })[0];
  var provider = DEF.rows.filter(function (r) { return /stateStore\.providerClass/.test(r[0]); })[0][1].split('.').pop();
  G.expect(late && late[3] < late[2] && PR.rows.length === 7, 'one row arrives after its window closed, in the seventh batch of the run');
  G.expect(NW.append_mode_error.indexOf('append') > 0 && NW.rows_dropped_as_late_without_watermark === 0 && NW.batch_4_rows_without_watermark[0] === '10:00 s01 3 17', 'without a watermark nothing is late and append is refused');
  G.expect(RS.second_run_failed === true && RS.batch_written_twice[0] === 4, 'the restart writes a batch twice');
  G.expect(Number(GR.rows[GR.rows.length - 1][2]) > Number(GR.rows[GR.rows.length - 1][1]), 'state grows without a watermark');
  var lastGrow = GR.rows[GR.rows.length - 1];
  var firstOut = AP.rows.filter(function (r) { return r[1] !== '(nothing)'; })[0];

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Structured Streaming', short: 'Stream', blurb: 'Micro-batches, windows, the watermark, output modes, state, the checkpoint and a restart', minutes: 58,
    focus: ['con', 'mon'],
    goals: [
      'Explain a **stream as a table that grows**, processed in **micro-batches**.',
      'Aggregate over **event-time windows**, and say what a **watermark** is.',
      'Predict what happens to a row that arrives **after its window closed**.',
      'Choose an **output mode**: update, append or complete.',
      'Say what is in the **checkpoint**, and what **at-least-once** means for a sink after a restart.',
      'Explain why **state grows** without a watermark.'
    ],
    say: 'Mission 10 is Structured Streaming. The idea is small: a stream is a table that never stops growing, and Spark runs your query on the new rows in small batches. The details are what interviews ask about: event time against processing time, the watermark, what happens to late data, and what a restart does. I did not need Kafka for that. Six small files arrive one after another in a folder, and every number comes from the progress reports that Spark writes for each batch. Kafka itself is described from documentation.',
    scenes: [
      B.talk({
        id: 'm10-model', t: 1, src: 'docs', title: 'A stream is a table that grows',
        say: 'Structured Streaming uses the same DataFrames and the same SQL. Press Next for the five ideas.',
        items: [
          ['An unbounded table', 'You write a query on a streaming DataFrame as if it were a table. New rows are **appended** to the table all the time. Spark runs your query again on the new rows, and updates the result.', 'The same query, on a table that grows.'],
          ['Micro-batches', 'By default Spark collects the new data every few moments and runs a small batch job on it. Each batch has a number. So a streaming query is a series of ordinary batch jobs, with state carried from one to the next.', 'A series of small batch jobs.'],
          ['Event time and processing time', '**Processing time** is when Spark sees a row. **Event time** is when it happened, a column of the data. Rows arrive late and out of order, so a count of "orders in the 10:00 window" must use event time.', 'When it happened, not when it arrived.'],
          ['State and the watermark', 'A count over windows needs **state**: the counts so far. Spark must decide when a window is final, so that it can write it and forget it. The **watermark** is that rule: "events older than the newest event minus 10 minutes are too late".', 'State needs a rule to be forgotten.'],
          ['The checkpoint', 'Spark writes to a **checkpoint folder** which batch it is reading, which batches finished, and the state. After a crash it restarts from there, so you do not lose your place.', 'Where to resume.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Structured Streaming runs micro-batches on a growing table, uses event time with a watermark for late data, and keeps its place in a checkpoint.' }
      }),

      B.flow({
        id: 'm10-flow', t: 1, src: 'docs', title: 'One micro-batch, and what it leaves behind', g: 'stream', legend: true,
        steps: [
          { say: 'This is one streaming query, from new files to a restart. Press Next to follow it.', cap: 'A streaming query.' },
          { say: 'Step 1. Files arrive in a folder. The source looks for **files it has not read** yet. With `maxFilesPerTrigger` set to 1, each batch reads one file.', on: ['s1'], focus: ['t_src', 't_off'], cap: 'New files arrive.' },
          { say: 'Step 2. Before it reads, Spark writes down **which files this batch will read**, in the checkpoint. That is the offset log. It is written first, so that a crash can repeat exactly the same batch.', on: ['s2'], focus: ['t_off', 't_batch'], cap: 'The plan of the batch is written first.' },
          { say: 'Step 3. The **micro-batch** runs an ordinary query on the new rows: parse, group by window and store, add up.', on: ['s3'], focus: ['t_batch', 't_state'], cap: 'An ordinary query on the new rows.' },
          { say: 'Step 4. The partial counts are merged into the **state store**: one entry for each window and store. This is the memory of the stream.', on: ['s3'], focus: ['t_state'], cap: 'The state store keeps the counts.' },
          { say: 'Step 5. The **watermark** looks at the newest event time and subtracts the delay. Windows that end before it are final: they can be written in append mode, and their state is deleted. Rows that belong to them from now on are dropped as late.', on: ['s4'], focus: ['t_state', 't_wm'], cap: 'The watermark closes old windows.' },
          { say: 'Step 6. The batch result goes to the **sink**: files, a table, or your own function with `foreachBatch`.', on: ['s5'], focus: ['t_wm', 't_sink'], tags: ['tg_twice'], cap: 'The result goes to the sink.' },
          { say: 'Step 7. Only after the sink, Spark writes the batch number into the **commit log**. A crash between the sink and the commit means that the batch is run again. This is the source of the duplicate that the red tag warns about.', on: ['s6'], focus: ['t_sink', 't_chk'], tags: ['tg_twice', 'tg_idem'], cap: 'The commit comes last.' },
          { say: 'Step 8. After a restart, Spark reads the checkpoint, finds the last committed batch, and carries on. The state is restored from the checkpoint too.', on: ['s7'], focus: ['t_chk', 't_rs'], cap: 'A restart resumes from the checkpoint.' }
        ]
      }),

      B.rows({
        id: 'm10-files', t: 1, src: 'rec', title: 'Six small files arrive one at a time',
        steps: [
          {
            say: 'This is the input of every experiment in this mission. Six JSON files with till events: the store, the time the order happened, and an amount. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The input files, in the order they arrive', c: 'raw', cols: FI.cols, rows: FI.rows, trk: 0 }],
            notes: ['Made up, and the same on every run. The files get distinct modification times, because the file source reads the oldest file first.']
          },
          {
            say: 'Look at the times. Files 0 to 3 move forward: 10:01 to 10:27. File 4 holds one event at **10:07**: an order that happened early and arrived late. By then the stream has seen events up to 10:27. File 5 jumps to 10:41.',
            tabs: [{ layer: 'RECORDED', name: 'The input files, in the order they arrive', c: 'raw', cols: FI.cols, rows: FI.rows, trk: 4, chg: [[4, 2]] }],
            notes: ['A till that was offline, a phone with a bad clock, a retry: late data is normal. The question is what the stream does with it.']
          }
        ]
      }),

      B.code({
        id: 'm10-code', t: 1, src: 'rec', title: 'The streaming query', file: 'streaming.py', lang: 'python', code: WIN,
        steps: [
          { say: 'The query is eight lines. Press Next.', lines: null },
          { say: '`readStream` instead of `read` makes a **streaming DataFrame**. The schema is given, because a stream cannot guess it. `maxFilesPerTrigger` of 1 makes each batch read one file, so every batch is known in advance.', lines: G.span(WIN, /events = spark\.readStream/) },
          { say: '`withWatermark("event_time", "10 minutes")` says: an event is too late when it is more than 10 minutes older than the newest event seen. The delay is a trade-off: longer keeps more state and accepts later data.', lines: G.span(WIN, /withWatermark/) },
          { say: '`groupBy(F.window("event_time", "10 minutes"), "store_id")` makes **ten-minute windows** of event time for each store. Then a count and a sum of the amount.', lines: G.span(WIN, /return events\.groupBy/) }
        ],
        note: 'Recorded: the function that every experiment in this mission calls. If `delay` is `None`, the watermark is left out, which a later screen uses.'
      }),

      B.code({
        id: 'm10-run', t: 2, src: 'rec', title: 'Starting the query and reading its progress', file: 'streaming.py', lang: 'python', code: RUN,
        steps: [
          { say: 'The function that runs the query. Press Next.', lines: null },
          { say: '`foreachBatch(on_batch)` hands every batch to my own function, with the batch DataFrame and its number. It is the general sink: write the batch anywhere, in any way you like.', lines: G.span(RUN, /def on_batch/, /out\.append/) },
          { say: 'The query starts with an **output mode**, the function, a **checkpoint location**, and `trigger(availableNow=True)`, which processes everything that is available, batch by batch, and then stops. That is what makes the run end by itself.', lines: G.span(RUN, /q = \(windowed/) },
          { say: '`awaitTermination` waits until the files are used up. Then the loop reads `recentProgress`: **the progress reports** that Spark writes for each batch, with the rows read, the watermark, the newest event time and the state.', lines: G.span(RUN, /q\.awaitTermination/, /for p in q\.recentProgress/) },
          { say: 'It keeps the fields that the lessons use: input rows, the watermark, the newest event time, the rows in state, and the rows dropped by the watermark.', lines: G.span(RUN, /so = \(p\.get/, /prog\.append/) }
        ],
        note: 'Recorded. This is the same information that the Structured Streaming tab of the Spark UI draws.'
      }),

      B.widget({ id: 'm10-lab', kind: 'streamlab', t: 1, src: 'rec', title: 'Lab: replay the stream' }),

      B.rows({
        id: 'm10-wm', t: 1, src: 'rec', title: 'The watermark, batch by batch',
        steps: [
          {
            say: 'These are the progress reports of the seven batches. Read one row at a time. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Progress of each batch', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 0 }],
            notes: ['Recorded: `recentProgress` of the query, in update mode, with a watermark of 10 minutes.']
          },
          {
            say: 'Batch 0 read 3 rows from file 0, and the newest event was at 10:06. There was **no watermark yet**, because the watermark of a batch comes from the batches before it. The state holds 2 entries: one for s01 and one for s02, both in the 10:00 window.',
            tabs: [{ layer: 'RECORDED', name: 'Progress of each batch', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 0, chg: [[0, 2], [0, 4]] }],
            notes: ['A window is a start time and ten minutes. Events at 10:01 to 10:06 belong to the window that starts at 10:00.']
          },
          {
            say: 'Batch 1 used a watermark of **' + PR.rows[1][2] + '**: the newest event so far, ' + PR.rows[0][3] + ', minus 10 minutes. Batch 2 used **' + PR.rows[2][2] + '**, and batch 3 used **' + PR.rows[3][2] + '**. The watermark follows the newest event, ten minutes behind, and **never moves back**.',
            tabs: [{ layer: 'RECORDED', name: 'Progress of each batch', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 3, chg: [[1, 2], [2, 2], [3, 2]] }],
            notes: ['The rows in state went 2, 4, 5, and then **fell** to ' + PR.rows[3][4] + ' in batch 3: the watermark reached ' + PR.rows[3][2] + ', the 10:00 window (it ends at 10:10) was final, and its two entries were forgotten.']
          },
          {
            say: 'Now batch 4. It read one row with the event time **' + late[3] + '**. The watermark was **' + late[2] + '**. The 10:00 window ended at 10:10, which is before the watermark: it is **closed and its state is gone**. Spark **dropped** the row. The last column says: dropped as late, ' + late[5] + '.',
            tabs: [{ layer: 'RECORDED', name: 'Progress of each batch', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 4, chg: [[4, 2], [4, 3], [4, 5]] }],
            notes: ['The order was worth 9. It is not in any result. This is the price of a watermark, and the reason it is a business decision: how late can an order be and still count?']
          },
          {
            say: 'Batch 5 read file 5, an event at 10:41. The watermark in batch 5 stayed at **' + PR.rows[5][2] + '**, because the late row of batch 4 did not move it. Batch 6 read **no rows** at all, and the watermark jumped to **' + PR.rows[6][2] + '**: Spark ran one more batch only to advance the watermark and close the windows, and the state fell to ' + PR.rows[6][4] + '.',
            tabs: [{ layer: 'RECORDED', name: 'Progress of each batch', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 6, chg: [[5, 2], [6, 1], [6, 2], [6, 4]] }],
            notes: ['That empty last batch is why append mode writes the last windows only at the end.']
          }
        ]
      }),

      B.rows({
        id: 'm10-modes', t: 1, src: 'rec', title: 'Three output modes, one stream',
        steps: [
          {
            say: 'The output mode decides what each batch **writes**. I ran the same six files three times. Each cell is what the sink received in that batch: window, store, orders, total. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Update mode: the windows that changed', c: 'raw', cols: UP.cols, rows: UP.rows, trk: 0 }],
            notes: ['Recorded: the rows that `foreachBatch` received in each batch.']
          },
          {
            say: '**Update** mode writes only the windows that **changed** in this batch. Batch 0 writes the two windows it created. Batch 4, the late row, writes **' + UP.rows[4][1] + '**, because the row was dropped and nothing changed.',
            tabs: [{ layer: 'RECORDED', name: 'Update mode: the windows that changed', c: 'raw', cols: UP.cols, rows: UP.rows, trk: 4, chg: [[4, 1]] }],
            notes: ['The sink must be able to take an updated value for a window it has seen: an upsert.']
          },
          {
            say: '**Append** mode writes a window **once**, when it is final. The first output is in batch **' + firstOut[0] + '**: the 10:00 windows, as soon as the watermark passed 10:10. The windows for 10:10 and 10:20 come in the last batch together. Until then, **nothing** was written.',
            tabs: [{ layer: 'RECORDED', name: 'Append mode: final windows only', c: 'raw', cols: AP.cols, rows: AP.rows, trk: Number(firstOut[0]) }],
            notes: ['Append is the simplest for a sink: rows never change. The price is a delay of at least the watermark.']
          },
          {
            say: '**Complete** mode writes the **whole result table** in every batch, all windows so far. It keeps every window forever. Look at batch 4: the late row is **counted**, and the 10:00 s01 window shows 3 orders and a total of 17 instead of 2 and 8.',
            tabs: [{ layer: 'RECORDED', name: 'Complete mode: everything, every time', c: 'raw', cols: CM.cols, rows: CM.rows, trk: 4, chg: [[4, 1]] }],
            notes: ['Complete mode does not use the watermark to forget state, so nothing is late. It is only for results that stay small.']
          }
        ]
      }),

      B.cmp({
        id: 'm10-choose', t: 1, src: 'docs', title: 'Which output mode',
        say: 'Three modes, three trade-offs. Press Next to read when to use each.',
        cols: ['Mode', 'What the sink gets', 'Needs a watermark', 'Use it when'],
        hl: 3,
        rows: [
          ['append', 'Each window once, when it is final', 'Yes, for an aggregation', 'The sink cannot change rows, and a delay of the watermark is fine'],
          ['update', 'Only the rows that changed in this batch', 'No. It is needed to forget state', 'The sink can upsert, and you want fresh numbers'],
          ['complete', 'The entire result, every batch', 'No', 'The result is small, such as 12 stores, and the sink is replaced each time']
        ],
        steps: [
          { upto: 2, say: 'Append and update are the two for real work. Choose by what your sink can do and how fresh the numbers must be.' },
          { upto: 3, say: 'Complete is for small results. It rewrites everything each time.' }
        ],
        pick: 'A dashboard that must be fresh wants **update mode with an upsert** (a MERGE keyed on window and store). A report that is read once a day can use **append** and accept the delay.'
      }),

      B.cmp({
        id: 'm10-triggers', t: 2, src: 'docs', title: 'Triggers: when does a batch start',
        say: 'The trigger decides how often the query looks for new data. Press Next to read the four.',
        cols: ['Trigger', 'What it does', 'Use it when'],
        hl: 2,
        rows: [
          ['default (no trigger)', 'Starts the next micro-batch as soon as the last one is done', 'You want the lowest latency that micro-batches give'],
          ['`processingTime="1 minute"`', 'Starts a batch every minute, if the last one has finished', 'You want to control the load and the number of small files'],
          ['`availableNow=True`', 'Processes everything that is available, in batches, and then stops', 'Incremental batch: run on a schedule, resume from the checkpoint. This is what the recording used'],
          ['`continuous`', 'Experimental low-latency mode, with fewer operations supported', 'You need millisecond latency, and accept the limits']
        ],
        steps: [
          { upto: 2, say: 'The first two keep the query running. The second one is the usual way to avoid a flood of tiny files.' },
          { upto: 4, say: '`availableNow` turns a stream into an incremental batch job: a good, cheap way to run "streaming" on a schedule with an orchestrator.' }
        ],
        pick: 'Many Brewline-style pipelines do not need a query that runs all day. A `availableNow` run every hour reads only the new files, keeps its place in the checkpoint, and costs cluster time only while it runs.'
      }),

      B.rows({
        id: 'm10-grow', t: 2, src: 'rec', title: 'Without a watermark the state never shrinks',
        steps: [
          {
            say: 'I ran the same six files twice in update mode: with the watermark, and without it. I read the rows in the state after each batch. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in the state store', c: 'raw', cols: GR.cols, rows: GR.rows, trk: 0 }],
            notes: ['Recorded: `numRowsTotal` of the state operator in the progress reports.']
          },
          {
            say: 'With a watermark, the state **went down** in batch 3, as the first windows closed. Without one it only **went up**: ' + GR.rows.map(function (r) { return r[2]; }).join(', ') + '. Spark has no way to know that a window is final, so it keeps every one for ever.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in the state store', c: 'raw', cols: GR.cols, rows: GR.rows, trk: GR.rows.length - 1, chg: GR.rows.map(function (r, i) { return [i, 2]; }) }],
            notes: ['Six files made 7 entries. A year of ten-minute windows for 12 stores is over 600,000. A key with millions of values, such as a customer id, makes a job that runs out of memory after a few weeks.']
          },
          {
            say: 'The late row was **counted** without a watermark: batch 4 wrote **' + NW.batch_4_rows_without_watermark[0] + '**, and ' + NW.rows_dropped_as_late_without_watermark + ' rows were dropped as late. That is better for correctness and worse for memory. The watermark trades one for the other.',
            tabs: [{ layer: 'RECORDED', name: 'The late row', c: 'raw', cols: ['with a watermark', 'without a watermark'], rows: [['dropped as late: 1', 'counted in the window: ' + NW.batch_4_rows_without_watermark[0]]], trk: 0 }],
            notes: ['Choose the delay from the data: how late does the 99th percentile of the late rows arrive?']
          },
          {
            say: 'And without a watermark, **append mode is refused**: Spark does not know when a window is final, so it cannot write it once. The message is: ' + NW.append_mode_error,
            tabs: [{ layer: 'RECORDED', name: 'Append mode without a watermark', c: 'raw', cols: ['what I asked', 'what Spark said'], rows: [['`outputMode("append")` on a windowed count, no watermark', 'refused when the query starts']], trk: 0 }],
            notes: ['Recorded: the error class and message of Spark 4.0.1.']
          }
        ]
      }),

      B.rows({
        id: 'm10-checkpoint', t: 1, src: 'rec', title: 'What is in the checkpoint',
        steps: [
          {
            say: 'After the run I listed the checkpoint folder. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The checkpoint folder', c: 'raw', cols: ['folder or file', 'what is inside'], rows: Object.keys(CK).map(function (k) { return [k, CK[k] === null ? 'a file' : CK[k].join(', ')]; }), trk: 0 }],
            notes: ['Recorded: `os.listdir` of the checkpoint location after the update-mode run. Hidden checksum files are left out.']
          },
          {
            say: '`offsets/` has one file for each batch: the **plan** of the batch, which files it will read. It is written before the batch runs. `commits/` has one file for each **finished** batch, written after the sink. `state/` holds the state store: the counts. `sources/` and `metadata` identify the query.',
            tabs: [{ layer: 'RECORDED', name: 'The checkpoint folder', c: 'raw', cols: ['folder or file', 'what is inside'], rows: Object.keys(CK).map(function (k) { return [k, CK[k] === null ? 'a file' : CK[k].join(', ')]; }), trk: 2 }],
            notes: ['If `offsets/` has a batch that `commits/` does not, that batch was started and not finished. On restart Spark runs it again.']
          },
          {
            say: 'Never delete or reuse a checkpoint by hand to "fix" a query. Deleting it starts the query from the beginning of the source, and changing the query in some ways (a new aggregation, a different state schema) makes the old checkpoint **incompatible**. A new version of the query gets a **new checkpoint location**.',
            tabs: [{ layer: 'RULE', name: 'Rules for the checkpoint', c: 'raw', cols: ['do', 'do not'], rows: [['keep it on durable storage, one for each query', 'delete it to clear an error'], ['use a new location when the logic of state changes', 'share one between two queries'], ['back it up with the sink', 'edit its files']], trk: 0 }],
            notes: ['From the documentation of Structured Streaming. Which changes are allowed is listed in the programming guide.']
          }
        ]
      }),

      B.code({
        id: 'm10-fail', t: 2, src: 'rec', title: 'A sink that fails after it wrote', file: 'streaming.py', lang: 'python', code: ONB,
        steps: [
          { say: 'The function that receives every batch. To test a restart, I made it fail on purpose. Press Next.', lines: null },
          { say: 'First it **writes** to the sink: here, a list that remembers every row, with the batch number.', lines: G.span(ONB, /rows = rows_of/, /sink\.append/) },
          { say: 'Then, if the parameter `fail_batch` matches this batch and it has not failed yet, it **raises an error**. The write has happened, and the batch has not been committed.', lines: G.span(ONB, /if fail_batch is not None/, /raise RuntimeError/) },
          { say: 'This is exactly the crash window that every streaming job has: after the sink, before the commit. Next, what the restart did.', lines: null }
        ],
        note: 'Recorded. The same situation happens for real when an executor, the driver or the network dies between the two steps.'
      }),

      B.rows({
        id: 'm10-restart', t: 1, src: 'rec', title: 'The restart wrote batch 4 twice',
        steps: [
          {
            say: 'The experiment, in three runs on one checkpoint. Run 1 processed three files. Then three more files arrived, run 2 started, and the sink failed in batch 4 after it wrote. Run 3 restarted. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The three runs', c: 'raw', cols: ['run', 'what happened', 'batches'], rows: [['1', 'normal', RS.first_run_batches.join(', ')], ['2', RS.second_run_failed ? 'the sink failed in batch 4, after it wrote' : 'ok', RS.second_run_batches_that_finished.length ? RS.second_run_batches_that_finished.join(', ') : 'none finished'], ['3', 'restart from the checkpoint', RS.restart_batches.join(', ')]], trk: 1 }],
            notes: ['Recorded: the batch ids that each run finished. Batch 4 reads the fourth file in this experiment.']
          },
          {
            say: 'Look at run 3. It starts at **batch 4**, and not at batch 8. The commit log had no entry for batch 4, so Spark ran it again, from the **same input**, and the sink received it a **second time**.',
            tabs: [{ layer: 'RECORDED', name: 'The three runs', c: 'raw', cols: ['run', 'what happened', 'batches'], rows: [['1', 'normal', RS.first_run_batches.join(', ')], ['2', RS.second_run_failed ? 'the sink failed in batch 4, after it wrote' : 'ok', RS.second_run_batches_that_finished.length ? RS.second_run_batches_that_finished.join(', ') : 'none finished'], ['3', 'restart from the checkpoint', RS.restart_batches.join(', ')]], trk: 2, chg: [[2, 2]] }],
            notes: ['Spark replays a batch from its offsets. It does not remember what the sink already got.']
          },
          {
            say: 'The sink counted the rows it got for each batch: ' + Object.keys(RS.rows_the_sink_got_for_each_batch).map(function (k) { return 'batch ' + k + ': ' + RS.rows_the_sink_got_for_each_batch[k]; }).join(', ') + '. Batch **' + RS.batch_written_twice.join(', ') + '** has twice as many rows as the others. It is the one that was written twice.',
            tabs: [{ layer: 'RECORDED', name: 'Rows the sink received', c: 'raw', cols: ['batch', 'rows received'], rows: Object.keys(RS.rows_the_sink_got_for_each_batch).map(function (k) { return [k, RS.rows_the_sink_got_for_each_batch[k]]; }), trk: Object.keys(RS.rows_the_sink_got_for_each_batch).indexOf('4') }],
            notes: ['A plain append to a table would now hold a duplicate. A dashboard would show that store\'s orders twice for that window.']
          },
          {
            say: 'This is **at-least-once for the sink**. Spark is exactly-once for its own state, because the state is restored from the checkpoint. For the sink, you must make the write **idempotent**: a MERGE keyed on window and store, an overwrite of the batch\'s own files named by the batch id, or a Delta write with a transaction id. Then the second write changes nothing.',
            tabs: [{ layer: 'RULE', name: 'Ways to make the sink safe to repeat', c: 'raw', cols: ['sink', 'how'], rows: [['a table with a key', 'MERGE on the key, inside foreachBatch'], ['files', 'write to a folder named by the batch id, and overwrite it'], ['Delta', 'the transaction options `txnAppId` and `txnVersion` (the batch id) skip a write that was already made'], ['a service', 'send an idempotency key with each call']], trk: 0 }],
            notes: ['From the documentation. The file and Delta sinks of Spark are already idempotent by batch.']
          }
        ]
      }),

      B.talk({
        id: 'm10-io', t: 1, src: 'docs', title: 'Sources and sinks',
        say: 'What can a stream read from, and write to? Press Next for each.',
        items: [
          ['Sources', '**Files** in a folder (the one in this mission), **Kafka**, a **rate** source for testing, and a socket for toys. Delta and Iceberg tables can be read as streams too. A good source is **replayable**: Spark can read the same offsets again after a crash. Kafka and files are; a socket is not.', 'Replayable sources are the safe ones.'],
          ['Sinks', 'A **file** sink (Parquet, JSON), the **Kafka** sink, the **Delta** sink, `console` and `memory` for tests, and **`foreachBatch`**, which hands each batch to your function as a normal DataFrame. With it you can write to several places, run a MERGE, or call a service.', 'foreachBatch is the general one.'],
          ['foreachBatch', 'Inside it you have a batch id and a batch DataFrame, and **all batch APIs**. It is at-least-once: use the batch id to make the write idempotent. It is also where you put a MERGE for an upsert.', 'Batch APIs, with the batch id.'],
          ['State store', 'The state lives in the executors\' memory, and is backed up to the checkpoint after each batch. The default provider in the recording is `' + provider + '`. For very large state the **RocksDB** provider keeps it off the heap on local disk.', 'Memory, backed by the checkpoint.'],
          ['What did not run here', 'No Kafka ran in this course. The file source stands in for it: offsets there are file names, and in Kafka they are partition offsets. The checkpoint, the watermark, the modes and the restart are the same.', 'The file source is a stand-in.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm10-kafka', t: 3, src: 'docs', title: 'Extra: Kafka as a source, from the documentation',
        say: 'I did not run Kafka. This is what the documentation says, so that the interview answer is complete. Press Next for each point.',
        items: [
          ['Offsets, not files', 'The Kafka source reads **topic partitions** and tracks an **offset** for each. The checkpoint stores the offsets of every batch, just like the file names here. `startingOffsets` chooses where a new query begins: earliest or latest.', 'Offsets replace file names.'],
          ['Limit the batch', '`maxOffsetsPerTrigger` caps how many records one batch reads. It is the Kafka form of `maxFilesPerTrigger`, and it protects a restart after a long stop from one giant batch.', 'Cap the batch size.'],
          ['End to end', 'With a replayable source (Kafka) and an idempotent sink, a Structured Streaming query can give **exactly-once results end to end**. Without an idempotent sink, it is at-least-once, as the recording showed.', 'Exactly-once needs both ends.'],
          ['The columns', 'A Kafka record arrives with `key`, `value` as binary, `topic`, `partition`, `offset` and `timestamp`. You cast the `value` and parse it, usually with `from_json`. The Kafka timestamp is not your event time.', 'Parse the value yourself.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Later in this repository:', t: 'Kafka gets its own tutorial, with real topics and offsets.' }
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: the live dashboard of orders per store',
        scenario: 'Brewline wants a dashboard of orders per store in 10-minute windows, fresh within a minute. The numbers for the latest windows may change as late orders arrive. The sink is a Delta table keyed on window and store. A colleague suggests append mode with a 10-minute watermark. You choose.',
        opts: [
          { t: 'Append mode with a 10-minute watermark', d: 'Rows never change, which is simple.', lose: 'A window appears only after the watermark passes it: at least 10 minutes late. The dashboard would never be fresh.' },
          { t: 'Update mode, and a MERGE keyed on window and store inside foreachBatch', d: 'Each batch upserts the windows that changed. The numbers are fresh, and a repeat of a batch changes nothing.', lose: '' },
          { t: 'Complete mode into the table', d: 'The whole result each time, nothing to merge.', lose: 'It rewrites every window each batch and keeps all of them in state for ever. Fine for 12 stores for one day, not for a year.' }
        ],
        pick: 1,
        why: 'Update mode gives freshness and the MERGE gives idempotence: if the batch runs twice after a restart, the second MERGE writes the same values. Keep a watermark so that the state is forgotten.',
        when: 'If the dashboard can be ten minutes behind, and you want immutable files, append mode is simpler and cheaper.'
      }),

      B.bug({
        id: 'm10-bug', t: 1, q: 'This windowed count is written in append mode. It refuses to start. In the recording the message said that append is not supported for aggregations without a watermark. Click the line that needs fixing.',
        file: 'orders_per_window.py', lang: 'python',
        code: ['events = spark.readStream.schema(SCHEMA).json("/in/events")', 'counts = events.groupBy(F.window("event_time", "10 minutes"), "store_id").count()', 'counts.writeStream.outputMode("append").format("delta").option("checkpointLocation", "/ck/orders").start("/out/orders")'].join('\n'),
        bad: [2],
        hint: 'How does Spark know when a window is final?',
        why: 'Append mode writes a window once, when it is final, and only a **watermark** tells Spark that. Without it the recording reported: ' + NW.append_mode_error.slice(0, 140) + '... Add `withWatermark("event_time", "10 minutes")` before the `groupBy`.',
        fix: ['events = spark.readStream.schema(SCHEMA).json("/in/events")', 'counts = events.withWatermark("event_time", "10 minutes").groupBy(F.window("event_time", "10 minutes"), "store_id").count()', 'counts.writeStream.outputMode("append").format("delta").option("checkpointLocation", "/ck/orders").start("/out/orders")'].join('\n'),
        cheer: 'A watermark closes windows. Append needs closed windows.'
      }),

      B.incident({
        id: 'm10-inc', t: 1, src: 'rec', title: 'Incident: one window shows double orders after a restart', time: '09:35',
        alert: '**The orders-per-window dashboard shows twice the orders for one 10-minute window for store s02.** The streaming job crashed during a cluster upgrade at 09:12 and restarted by itself. The sink is a plain append to a table.',
        clues: ['The duplicated rows have the same window, store and amounts', 'The job restarted from its checkpoint and reported no error', 'The sink appends the rows of each batch with no key'],
        opts: [
          { t: 'Deduplicate the table once, then change the sink to an idempotent write: a MERGE on window and store, or a write keyed by the batch id', fb: '' },
          { t: 'Delete the checkpoint and restart the job', fb: 'That reprocesses the source from the start and writes far more duplicates.' },
          { t: 'Run the job in complete mode', fb: 'It does not make an append idempotent.' },
          { t: 'Ignore it: it was a one-off', fb: 'It will happen at every crash between the sink and the commit.' }
        ],
        best: 0,
        why: 'The crash happened after the sink wrote and before the commit. On restart Spark replayed the batch, and the sink took it again. In the recording the sink got batch ' + RS.batch_written_twice.join(', ') + ' twice. Spark is exactly-once for its state, and at-least-once for the sink.',
        checks: [
          ['Find the batch', 'Compare `offsets/` and `commits/` in the checkpoint, and the batch ids in the sink.'],
          ['Repair the data', 'Remove the duplicate rows once, by window and store.'],
          ['Fix the sink', 'MERGE on the key inside foreachBatch, or write the batch to a path named by its id.'],
          ['Guard', 'A test that runs a batch twice and checks that the table is the same.']
        ],
        tell: 'A restart replayed a batch that the sink had already written, so one window showed double orders. Spark is exactly-once for its state but at-least-once for the sink. I removed the duplicates, changed the sink to a MERGE on window and store, and added a test that runs a batch twice.',
        prevent: ['Idempotent sinks, always', 'A test that repeats a batch', 'Never delete a checkpoint to clear an error']
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'What does a watermark of 10 minutes mean?',
        opts: [{ t: 'The query waits 10 minutes before it starts', fb: 'That is a trigger.' }, { t: 'Events more than 10 minutes older than the newest event are too late, and old state can be forgotten', fb: '' }, { t: 'Each batch lasts 10 minutes', fb: 'That is a trigger too.' }, { t: 'The checkpoint is kept for 10 minutes', fb: 'The checkpoint has nothing to do with it.' }],
        ok: 1,
        why: 'In the recording, batch 1 used ' + PR.rows[1][2] + ': the newest event ' + PR.rows[0][3] + ' minus 10 minutes.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'In the recording, the order at 10:07 in file 4 was not counted in update mode. Why?',
        opts: [{ t: 'The file was empty', fb: 'It had one row.' }, { t: 'The watermark was ' + late[2] + ' and its window ended at 10:10: the window was closed', fb: '' }, { t: 'The amount was zero', fb: 'It was 9.' }, { t: 'A bug in Spark', fb: 'This is the designed behaviour.' }],
        ok: 1,
        why: 'The progress report says ' + late[5] + ' row dropped as late. In complete mode, which keeps all state, the same row was counted.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1,
        q: 'Which output mode needs a watermark for an aggregation?',
        opts: [{ t: 'update', fb: 'Update works without one, but its state then grows.' }, { t: 'append', fb: '' }, { t: 'complete', fb: 'Complete keeps all state and needs none.' }, { t: 'all of them', fb: 'Only append is refused.' }],
        ok: 1,
        why: 'Without a watermark, Spark refused append with: ' + NW.append_mode_error.slice(0, 120) + '...'
      }),

      B.quiz({
        id: 'm10-q4', t: 1,
        q: 'The job crashes after the sink wrote batch 7 and before the commit. What happens at the restart?',
        opts: [{ t: 'Batch 7 is skipped', fb: 'It is not in the commit log.' }, { t: 'Batch 7 runs again from the same input, so the sink may get it twice', fb: '' }, { t: 'The job starts from the first batch', fb: 'The checkpoint remembers the place.' }, { t: 'The state is lost', fb: 'The state is restored from the checkpoint.' }],
        ok: 1,
        why: 'The recording: the sink got batch ' + RS.batch_written_twice.join(', ') + ' twice. Make the sink idempotent.'
      }),

      B.quiz({
        id: 'm10-q5', t: 2,
        q: 'Why does the state of a windowed count grow for ever without a watermark?',
        opts: [{ t: 'Spark cannot know that a window is final, so it keeps every window', fb: '' }, { t: 'The checkpoint is too small', fb: 'No.' }, { t: 'Because of the output mode', fb: 'The mode is not the cause.' }, { t: 'It does not grow', fb: 'The recording shows it rising.' }],
        ok: 0,
        why: 'The state went ' + GR.rows.map(function (r) { return r[2]; }).join(', ') + ' without a watermark and ' + GR.rows.map(function (r) { return r[1]; }).join(', ') + ' with one.'
      }),

      B.order({
        id: 'm10-ord', t: 2, q: 'Put one micro-batch in order.',
        items: [
          'Spark finds the new files and writes the batch plan to the offset log',
          'The query runs on the new rows',
          'The state store is updated, and the watermark moves',
          'The result goes to the sink',
          'The batch number is written to the commit log'
        ],
        why: 'Plan first, so that a crash can repeat the same batch. Commit last, so that a batch is only "done" after the sink took it. The gap between the last two steps is where the duplicate comes from.'
      }),

      B.qa({
        id: 'qa-streaming', t: 1, tag: 'Streaming', secs: 90,
        q: 'How does Structured Streaming work?',
        pts: ['A stream is a table that grows', 'Micro-batches: ordinary jobs with carried state', 'Event time and watermark for late data', 'State store, output modes', 'Checkpoint: offsets, commits, state', 'At-least-once for the sink: make it idempotent'],
        short: 'Structured Streaming treats a stream as a **table that grows**, and runs my query on the new rows in **micro-batches**, which are ordinary Spark jobs with state carried from one to the next. For time-based aggregations I use **event time** and a **watermark**, which says how late a row may be: windows older than the watermark are final, their state is dropped, and later rows for them are dropped as late. The **output mode** decides what each batch writes: append for final rows, update for changed rows, complete for everything. A **checkpoint** keeps the offsets of each batch, the commits, and the state, so that a restart resumes. The engine is exactly-once for its own state, but a restart can replay a batch, so the sink must be idempotent.',
        fu: [['What is a trigger?', 'It decides when a batch starts: as soon as possible, every N minutes, or availableNow, which processes what is there and stops.'], ['What is foreachBatch?', 'A sink that gives each batch to my function as a DataFrame with a batch id, for MERGE or multiple writes.']],
        trap: 'Saying that streaming is exactly-once without mentioning the sink.',
        real: 'Describe a streaming job you ran, and what happened when it restarted.'
      }),

      B.qa({
        id: 'qa-watermark', t: 1, tag: 'Streaming', secs: 90,
        q: 'What is a watermark, and what happens to late data?',
        pts: ['Newest event time minus the allowed delay', 'Windows that end before it are final', 'State of final windows is dropped', 'Later rows for them are dropped as late', 'Never moves back', 'Trade-off: more delay, more state, fewer drops'],
        short: 'The watermark is the **newest event time seen so far, minus an allowed delay** that I choose, say 10 minutes. Any window that ends before the watermark is considered final: in append mode it is written, and its state is deleted. If a row arrives later for such a window, it is **dropped as late**. In my test, a row with the event time 10:07 arrived when the watermark was 10:17, its window had closed, and the progress report counted one row dropped. The watermark never moves back. The delay is a trade-off: a longer delay accepts later data but keeps more state and delays append output. Without any watermark nothing is late, but the state grows for ever and append mode is refused.',
        fu: [['How do you pick the delay?', 'From the data: how late are the late rows at a high percentile, and how much delay can the business accept?'], ['Can you recover dropped rows?', 'Not in the stream. Keep the raw events, and correct with a batch job.']],
        trap: 'Saying that the watermark is processing time.',
        real: 'Your counts are lower than the batch job. Could the watermark be the reason?'
      }),

      B.qa({
        id: 'qa-restart', t: 2, tag: 'Streaming', secs: 75,
        q: 'What happens when a streaming job restarts, and how do you avoid duplicates?',
        pts: ['Reads the checkpoint: offsets, commits, state', 'A batch in offsets but not in commits runs again', 'Source replays the same offsets', 'Sink can receive a batch twice', 'Idempotent sink: MERGE on a key, batch-id keyed writes, Delta txn ids', 'Never delete the checkpoint to fix it'],
        short: 'On restart Spark reads the **checkpoint**: the offset log says which input each batch read, the commit log says which batches finished, and the state is restored. A batch that is in the offset log and not in the commit log was started and not finished, so Spark **runs it again** on the same input. If the sink had already written that batch, it gets it a second time. In my test the sink received batch 4 twice. So Spark is exactly-once for its state, and the sink must be **idempotent**: a MERGE on a key inside `foreachBatch`, a write to a folder named by the batch id, or Delta\'s transaction ids. And I never delete the checkpoint to clear an error, because that reprocesses the source from the start.',
        fu: [['Can you change the query after a restart?', 'Only in compatible ways. A change to the state schema or the aggregation needs a new checkpoint location.'], ['What if the source cannot be replayed?', 'Then there is no safe recovery. That is why Kafka and files are used.']],
        trap: 'Deleting the checkpoint as a fix.',
        real: 'A restart doubled the data in a table. What do you do?'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Stream Watcher', color: '#A5F3FC',
        pts: [
          'A stream is a **table that grows**, run in **micro-batches**. Use **event time**, and a **watermark** for late data.',
          'The watermark followed the newest event, 10 minutes behind: ' + PR.rows.slice(1, 4).map(function (r) { return r[2]; }).join(', ') + '. The row at ' + late[3] + ' arrived when it was ' + late[2] + ' and was **dropped as late**.',
          '**Update** wrote changed windows, **append** wrote final windows from batch ' + firstOut[0] + ' on, **complete** wrote everything every time and counted the late row.',
          'Without a watermark the state went **' + GR.rows.map(function (r) { return r[2]; }).join(', ') + '** and append was **refused**.',
          'The **checkpoint** has `offsets/`, `commits/`, `state/`. A restart replays a batch that has no commit.',
          'The sink got batch **' + RS.batch_written_twice.join(', ') + ' twice**. Spark is exactly-once for its state, **at-least-once for the sink**: make it idempotent.'
        ],
        lines: [
          'I choose the watermark from the data.',
          'I make the sink idempotent.',
          'I never delete a checkpoint to fix an error.'
        ]
      })
    ]
  });
})();
