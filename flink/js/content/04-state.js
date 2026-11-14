/* Mission 4: state, checkpoints, recovery and savepoints. A job keeps a count for every store in Kafka orders; a TaskManager is killed with signal 9; the job is judged on what it wrote. The same job
   without checkpoints, with an at-least-once and an exactly-once sink, stopped with a savepoint and started again with another parallelism, and with the state in the heap and in RocksDB.
   Real Apache Flink 2.2.1 and a real Apache Kafka 4.4.0 with one broker. */
(function () {
  var B = LAB.b, G = LAB.get;
  var AB = G.counts('state.a_before'), AR = G.counts('state.a_result'), BR = G.counts('state.b_result'), EO = G.counts('state.copy_eo'), AL = G.counts('state.copy_alo');
  var SR = G.counts('state.savepoint_result'), NS = G.counts('state.no_savepoint_result'), CQ = G.counts('state.changed_query'), BS = G.counts('state.backends_summary'), RF = G.counts('state.rocksdb_files');
  var CF = G.table('state.checkpoint_files'), SF = G.table('state.savepoint_files'), BK = G.table('state.backends');
  var JL = G.text('state.a_jobmanager_log'), SC = G.text('state.savepoint_command');
  var cause = AR.first_failure_root_cause.replace(/^(\w+\.)+/, '');
  var SCA = G.file('sql/state_a.sql'), SCE = G.file('sql/copy_eo.sql');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(AR.totals_equal_the_truth === true && AR.orders_counted === AR.orders_sent && AR.stores === 12 && AR.job_state === 'RUNNING', 'a killed TaskManager does not change the totals');
  G.expect(/no longer reachable/.test(AR.first_failure_root_cause) && /Restoring job/.test(JL) && /RUNNING to RESTARTING/.test(JL), 'the job log shows the failure, the restart and the restore');
  G.expect(BR.final_state === 'FAILED' && BR.restart_strategy_message === true && BR.checkpoints_completed === 0, 'without checkpoints the job fails for good');
  G.expect(EO.duplicates === 0 && EO.missing === 0 && EO.records_of_aborted_transactions > 0 && AL.duplicates > 0 && AL.missing === 0 && AL.records_of_aborted_transactions === 0, 'exactly once has no duplicate and leaves aborted records, at least once duplicates');
  G.expect(SR.totals_equal_the_truth === true && SR.parallelism_before === 2 && SR.parallelism_after === 3 && NS.orders_counted_by_the_new_job < NS.orders_in_the_topic, 'a savepoint keeps the counts across a change of parallelism, and a new job loses them');
  G.expect(CQ.job_state === 'RESTARTING' && /StateMigrationException/.test(CQ.message), 'a changed query cannot restore the savepoint');
  G.expect(BS.incremental_writes_less_than_the_state === true && BS.rocksdb_incremental_written_6 < BS.heap_written_6, 'incremental RocksDB checkpoints write less than the state');
  var bk = function (k) { var r = BK.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'backend row ' + k); return r; };

  LAB.addChapter({
    id: 'm4', n: 4, title: 'State, checkpoints and recovery', short: 'State', blurb: 'Keyed state, a checkpoint, a killed TaskManager, exactly-once sinks, savepoints and RocksDB', minutes: 50,
    focus: ['mart', 'int'],
    goals: [
      'Say what **state** is, where it lives, and why a job needs it.',
      'Explain a **checkpoint**: barriers, snapshots, and the position in the source.',
      'Read what happens when a **TaskManager is lost**, and why checkpointing decides it.',
      'Compare an **at-least-once** and an **exactly-once** sink, and say how the second works.',
      'Use a **savepoint** to stop and restart a job, with another parallelism.',
      'Choose a **state backend**: heap or RocksDB, full or incremental.'
    ],
    say: 'Mission 4 is the one that interviewers love. A job that counts orders for each store has to remember the count of every store. If the machine dies, what happens to the counts, and to what the job already wrote? I ran a job on the real cluster, killed a TaskManager with signal 9 while the orders kept arriving, and read what was left. Then I stopped a job with a savepoint, started it again with another parallelism, and broke the restore on purpose. Press Next.',
    scenes: [
      B.talk({
        id: 'm4-state', t: 1, src: 'docs', title: 'State: what a job remembers',
        say: 'Five ideas make up state. Press Next.',
        items: [
          ['Why state', 'A count of orders for each store needs the count so far. A join needs the rows it has seen. Anything that depends on earlier records needs **state**: data that the job keeps between records.', 'Memory between records.'],
          ['Keyed state', 'After a `keyBy` or a GROUP BY, Flink gives each key its own state: the count of store s01, the count of store s02. The state of a key is only visible to the code that handles that key, in the task that holds it.', 'One value for each key.'],
          ['Where it lives', 'In the TaskManager, in one of two **state backends**. The **heap** backend keeps state as Java objects in memory. **RocksDB** keeps it in an embedded database on the local disk, so state can be bigger than memory.', 'Heap or RocksDB.'],
          ['What the types are', 'State comes as a single value (ValueState), a list, a map, or an aggregate. A SQL operator picks its own. A DataStream program chooses and names them. Mission 7 writes one.', 'Value, list, map.'],
          ['Why it is saved', 'Local state is lost with the process. Flink therefore saves it to durable storage in **checkpoints**, together with the position in the sources. That is the next screen.', 'State is saved, not just kept.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'State is the data a job keeps for each key between records. It lives in the TaskManager, in the heap or in RocksDB, and a checkpoint saves it to durable storage together with the source positions.' }
      }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'A checkpoint, step by step', g: 'checkpoint', legend: true,
        steps: [
          { say: 'A small job: a source, a count for each store, and a sink. Press Next to follow one checkpoint.', cap: 'A source, a counter, a sink.' },
          { say: 'Step 1. The **JobManager** decides that it is time. Every few seconds it asks each source to insert a **barrier**, numbered n, into its stream. The barrier is a marker that travels with the records.', on: ['k1'], focus: ['p_jm', 'p_src'], cap: 'The coordinator starts barrier n.' },
          { say: 'Step 2. The source writes down its position in Kafka and passes the barrier on. Records before the barrier belong to checkpoint n. Records after it belong to the next.', on: ['k2'], focus: ['p_src', 'p_op'], cap: 'The barrier moves with the data.' },
          { say: 'Step 3. The counter receives the barrier on all of its inputs, then saves its state and passes the barrier to the sink. No pause is needed: records keep flowing behind the barrier.', on: ['k3'], focus: ['p_op', 'p_snk'], cap: 'Each operator snapshots its state.' },
          { say: 'Step 4. State and positions are written to **checkpoint storage**, outside the process.', on: ['k4'], focus: ['p_op', 'p_st'], cap: 'Written to durable storage.', tags: ['tg_bar'] },
          { say: 'Step 5. When every task has acknowledged, the checkpoint is **complete**. The JobManager tells the tasks. After a failure Flink restores the **latest complete** checkpoint: the state as it was at the barrier, and the sources rewind to the positions saved with it.', on: ['k5'], focus: ['p_snk', 'p_jm'], cap: 'Complete, and ready for a restore.' }
        ]
      }),

      B.widget({ id: 'm4-lab', kind: 'checkpointlab', t: 1, src: 'rec', title: 'Lab: a checkpoint, a crash and a replay' }),

      B.sql({
        id: 'm4-sql', t: 1, src: 'rec', title: 'The job that I killed a TaskManager under', file: 'state_a.sql', code: SCA,
        steps: [
          { say: 'The script. Two thousand four hundred orders flow into a Kafka topic at about a hundred a second, with two partitions. The job counts and sums them for each store. Press Next.', lines: null },
          { say: 'Two settings. Parallelism two, and a **checkpoint every 3 seconds**. This second line is what turns recovery on.', lines: G.span(SCA, /parallelism\.default/, /checkpointing\.interval/) },
          { say: 'The source reads the topic from the earliest offset. The connector is the real Kafka connector of Flink, version ' + G.meta('kafka-connector') + '.', lines: G.span(SCA, /CREATE TEMPORARY TABLE orders/, /earliest-offset/) },
          { say: 'The sink is **upsert-kafka**: a topic with a key. A new count of a store replaces the old one, so the last record for a store is its answer.', lines: G.span(SCA, /CREATE TEMPORARY TABLE store_totals/, /value\.format/) },
          { say: 'And the query. When it runs, I wait for three checkpoints, find the TaskManager that holds the tasks, and kill it with signal 9.', lines: G.span(SCA, /INSERT INTO/), run: true }
        ],
        result: { cols: ['What was measured', 'Result'], rows: [['Orders sent to Kafka', n0(AR.orders_sent)], ['Orders counted by the job in the end', n0(AR.orders_counted)], ['Stores in the result', AR.stores], ['Totals equal the truth, store by store', AR.totals_equal_the_truth ? 'yes' : 'no'], ['State of the job at the end', AR.job_state]], msg: 'after a TaskManager was killed' },
        note: 'Recorded on Flink ' + G.meta('flink') + ' and Kafka ' + G.meta('kafka') + '. The truth is computed by the recorder from the orders it sent. The check stopped the recording if one store differed.'
      }),

      B.rows({
        id: 'm4-files', t: 1, src: 'rec', title: 'What a checkpoint looks like on disk',
        steps: [{
          say: 'Three seconds after the job started, a checkpoint was in a folder named after the job. One file, `_metadata`, of **' + n0(CF.rows[0][1]) + ' bytes**. Here the state is small, only twelve counts, so Flink wrote it **inside** the metadata file. Bigger state goes to files next to it.',
          tabs: [{ layer: 'RECORDED', name: 'Files of the checkpoint folder', c: 'raw', cols: CF.cols, rows: CF.rows, trk: 0 }],
          notes: ['Recorded. The documentation says that state chunks smaller than `execution.checkpointing.data-inline-threshold` (20 kb by default) are stored inline in the root metadata file. Only the latest checkpoint is kept by default (`execution.checkpointing.num-retained` is 1).']
        }]
      }),

      B.term({
        id: 'm4-log', t: 1, src: 'rec', title: 'What the JobManager logged',
        say: 'This is the JobManager log of the killed job, reduced to the lines about the job. First the restart strategy that Flink chose by itself. Then the job going from RUNNING to RESTARTING, and back to RUNNING. And the line that matters: **Restoring job from Checkpoint 3**.',
        lines: G.plain(JL, { cmd: 'grep the JobManager log for the job', d: 120 }),
        after: 'The failure was recorded once, with the cause `' + cause + '`. The counts of the REST interface show ' + AR.checkpoints_failed + ' failed checkpoints around the kill, and checkpoints went on after the restore.',
        afterKind: 'tip',
        doneSay: 'The job came back by itself: no human, no resubmit, and the counts were still right.'
      }),

      B.rows({
        id: 'm4-kill', t: 1, src: 'rec', title: 'The kill, and the result',
        steps: [
          {
            say: 'What I did. The job had parallelism ' + AB.parallelism + ' and checkpoints every ' + AB.checkpoint_interval_seconds + ' seconds, on a cluster of ' + AB.slots_total + ' slots. Flink had put all its tasks on the first TaskManager. I waited for checkpoint **' + AR.checkpoint_before_the_kill + '**, then sent it **signal 9**, which gives a process no chance to clean up.',
            tabs: [{ layer: 'RECORDED', name: 'The experiment', c: 'raw', cols: ['Step', 'What happened'], rows: [['Before', 'parallelism ' + AB.parallelism + ', a checkpoint every ' + AB.checkpoint_interval_seconds + ' s'], ['The kill', 'TaskManager ' + AB.tms_running_the_job[0] + ' (the one with the tasks) killed with signal 9'], ['The JobManager saw', cause], ['Restored from', 'checkpoint ' + AR.checkpoint_before_the_kill], ['In the end', n0(AR.orders_counted) + ' of ' + n0(AR.orders_sent) + ' orders counted, ' + AR.stores + ' stores, all totals right']], trk: 1 }],
            notes: ['Recorded. The other TaskManager had two free slots, and the job restarted on them. The killed TaskManager was started again afterwards.']
          },
          {
            say: 'The numbers from the REST interface. One failure recorded. The job is RUNNING. **' + AR.checkpoints_completed + '** checkpoints completed and **' + AR.checkpoints_failed + '** failed around the kill. The job restarted, and checkpoints went on after the restore.',
            tabs: [{ layer: 'RECORDED', name: 'GET /jobs/<id>/checkpoints', c: 'raw', cols: ['Counter', 'Value'], rows: [['Checkpoints completed', AR.checkpoints_completed], ['Checkpoints failed', AR.checkpoints_failed], ['Restored from a checkpoint', AR.restored_checkpoint_counted], ['Failures of the job recorded', AR.failures_recorded], ['State of the job', AR.job_state]], trk: 1 }],
            notes: ['Recorded. I did not break down why each of the failed checkpoints failed. The documentation lists `execution.checkpointing.tolerable-failed-checkpoints`, the number of failed checkpoints in a row that a job may live with, as 0 by default.']
          }
        ]
      }),

      B.rows({
        id: 'm4-nock', t: 1, src: 'rec', title: 'The same job without checkpoints',
        steps: [
          {
            say: 'Same query, same data, same kill, but **no checkpoint interval**. The job did not restart. Its state became **' + BR.final_state + '** and stayed there. The message says why: `Recovery is suppressed by NoRestartBackoffTimeStrategy`.',
            tabs: [{ layer: 'RECORDED', name: 'The failure of the job with no checkpoints', c: 'raw', cols: ['Line of the exception'], rows: BR.exception_chain.map(function (l) { return [l]; }), trk: 0 }],
            notes: ['Recorded. ' + BR.checkpoints_completed + ' checkpoints had completed, so there was nothing to restore.']
          },
          {
            say: 'The connection is in the documentation: if checkpointing is **disabled**, the default restart strategy is `disable`. If it is **enabled**, the default is `exponential-delay`, and that is the strategy the log of the first run named: it starts at one second and waits longer after each failure, up to a minute.',
            tabs: [{ layer: 'DOCS', name: 'restart-strategy.type', c: 'raw', cols: ['Checkpointing', 'Default restart strategy', 'What happens when a TaskManager is lost'], rows: [['off', 'disable', 'The job fails for good'], ['on', 'exponential-delay (1 s, up to 1 min, factor 1.5)', 'The job restarts from the last checkpoint']], trk: 1 }],
            notes: ['From the Flink documentation (the restart strategy options), and from the first line of the recorded log.']
          }
        ]
      }),

      B.rows({
        id: 'm4-sink', t: 1, src: 'rec', title: 'What a reader sees: at least once and exactly once',
        steps: [
          {
            say: 'A job that only **copies** orders from one Kafka topic to another, one task, checkpoints every six seconds. I killed its TaskManager three seconds after a checkpoint, then counted what a reader sees in the output topic. First with `sink.delivery-guarantee` set to **at-least-once**.',
            tabs: [{ layer: 'RECORDED', name: 'At least once', c: 'raw', cols: ['What', 'Count'], rows: [['Orders sent', n0(AL.orders_sent)], ['Records a reader sees', n0(AL.records_a_read_committed_reader_sees)], ['Distinct orders', n0(AL.distinct_orders)], ['Duplicates', n0(AL.duplicates)], ['Missing', AL.missing]], trk: 3 }],
            notes: ['Recorded. The job restored checkpoint ' + AL.checkpoint_before_the_kill + ' and read the last seconds of orders again, so it wrote them a second time.']
          },
          {
            say: 'Now **exactly-once**. The reader sees every order once. The orders written after the checkpoint were in an open Kafka transaction that was **aborted** when the job failed, and the replay wrote them again in a new one. The aborted records are still in the log, but a reader set to read committed never sees them.',
            tabs: [{ layer: 'RECORDED', name: 'Exactly once', c: 'raw', cols: ['What', 'Count'], rows: [['Orders sent', n0(EO.orders_sent)], ['Records a read-committed reader sees', n0(EO.records_a_read_committed_reader_sees)], ['Distinct orders', n0(EO.distinct_orders)], ['Duplicates', EO.duplicates], ['Missing', EO.missing], ['Records of aborted transactions in the log', n0(EO.records_of_aborted_transactions)]], trk: 3 }],
            notes: ['Recorded. The counts change from run to run because they depend on when the kill lands. The pattern does not: the first run has duplicates, the second none.']
          }
        ]
      }),

      B.flow({
        id: 'm4-2pc', t: 2, src: 'docs', title: 'Exactly once in a sink: two phases', g: 'twophase', legend: true,
        steps: [
          { say: 'How a Kafka sink gets exactly-once results from a job that can fail at any time. Press Next.', cap: 'A transaction around a checkpoint.' },
          { say: 'Step 1. Between two checkpoints, the sink writes records into an **open Kafka transaction**. Readers who use read-committed do not see them yet.', on: ['k1'], focus: ['t_open', 't_pre'], cap: 'Written, but not visible.' },
          { say: 'Step 2. The checkpoint barrier arrives. The sink flushes, **prepares** the transaction and starts a new one for the next records. This is the first phase.', on: ['k2'], focus: ['t_pre', 't_done'], cap: 'Prepared at the barrier.' },
          { say: 'Step 3. When all tasks have acknowledged, the checkpoint is **complete**.', on: ['k3'], focus: ['t_done', 't_com'], cap: 'The whole job agrees.' },
          { say: 'Step 4. Only now is the transaction **committed**, and its records become visible. This is the second phase. A restart after this point does not replay these records: the checkpoint says they were done.', on: ['k3'], focus: ['t_com'], cap: 'Committed after the checkpoint.', tags: ['tg_rc'] },
          { say: 'Step 5. If the job fails before the checkpoint completes, the open transaction is **aborted**.', on: ['k4'], focus: ['t_open', 't_fail'], cap: 'A failure aborts the transaction.' },
          { say: 'Step 6. The job replays from the last complete checkpoint and writes the records again in a new transaction. No reader ever saw the aborted copy.', on: ['k5'], focus: ['t_fail', 't_rep'], cap: 'Replay, and no duplicate.' }
        ]
      }),

      B.rows({
        id: 'm4-save', t: 1, src: 'rec', title: 'Stop a job with a savepoint',
        steps: [
          {
            say: 'A checkpoint is for crashes. For a planned stop, a deploy or an upgrade, you take a **savepoint**. `flink stop --savepointPath` makes the sources stop, waits for the records in flight, writes a savepoint and ends the job. The command printed the folder.',
            tabs: [{ layer: 'RECORDED', name: 'The command and its output', c: 'raw', cols: ['Output'], rows: SC.split('\n').map(function (l) { return [l]; }), trk: 3 }],
            notes: ['Recorded. The savepoint is a folder named after a short id.']
          },
          {
            say: 'In the folder, again one file, `_metadata`, of **' + n0(SF.rows[0][1]) + ' bytes**: the state of twelve counts and the positions in Kafka. A savepoint is owned by **you**: Flink does not delete it, after the job ends or after a restore.',
            tabs: [{ layer: 'RECORDED', name: 'Files of the savepoint folder', c: 'raw', cols: SF.cols, rows: SF.rows, trk: 0 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.rows({
        id: 'm4-restore', t: 1, src: 'rec', title: 'Restore it with a different parallelism',
        steps: [
          {
            say: 'I produced ' + n0(SR.second_batch) + ' more orders and started **the same query** from the savepoint with `SET \'execution.state-recovery.path\'`, this time with parallelism **' + SR.parallelism_after + '** instead of ' + SR.parallelism_before + '. Flink spread the counts of the twelve stores over three tasks. In the end the job had counted **' + n0(SR.orders_counted) + '** orders, and every total was right.',
            tabs: [{ layer: 'RECORDED', name: 'Restored from the savepoint', c: 'raw', cols: ['What', 'Result'], rows: [['Orders before the savepoint', n0(SR.first_batch)], ['Orders after it', n0(SR.second_batch)], ['Parallelism before and after', SR.parallelism_before + ' and ' + SR.parallelism_after], ['Orders counted', n0(SR.orders_counted)], ['Totals equal the truth', SR.totals_equal_the_truth ? 'yes' : 'no']], trk: 3 }],
            notes: ['Recorded. State is stored in key groups (128 for a small job, as mission 7 shows), so a different parallelism only changes which task holds which groups.']
          },
          {
            say: 'Without the savepoint it is a new job. I started the same query again, reading from the **end** of the topic. It knew nothing about the earlier orders: it counted **' + n0(NS.orders_counted_by_the_new_job) + '** of the **' + n0(NS.orders_in_the_topic) + '** orders in the topic.',
            tabs: [{ layer: 'RECORDED', name: 'The same query, with no state', c: 'raw', cols: ['What', 'Count'], rows: [['Orders in the topic', n0(NS.orders_in_the_topic)], ['Orders counted by the new job', n0(NS.orders_counted_by_the_new_job)]], trk: 1 }],
            notes: ['Recorded. State is what a savepoint carries from one job to the next.']
          }
        ]
      }),

      B.rows({
        id: 'm4-change', t: 2, src: 'rec', title: 'Change the query, and the state no longer fits',
        steps: [{
          say: 'Then I changed the query: one more aggregate, `MAX(total_cents)`, and restored the same savepoint. The job did not run. It stayed in state **' + CQ.job_state + '**, failing again and again, with a message about a state it cannot read.',
          tabs: [{ layer: 'RECORDED', name: 'The failure', c: 'raw', cols: ['Message'], rows: [[CQ.message.replace(/@[0-9a-f]+/g, '')]], trk: 0 }],
          notes: ['Recorded. The accumulator that SQL keeps for each store has another shape now, and the old one cannot be read as the new one. For SQL, the documentation describes compiled plans (`COMPILE PLAN`) as the way to keep a query restorable across versions.']
        }]
      }),

      B.cmp({
        id: 'm4-cmp', t: 1, src: 'docs', title: 'Checkpoint or savepoint',
        say: 'They are made in almost the same way, but they are for different jobs. The Flink documentation compares them to recovery logs and backups. Press Next.',
        cols: ['', 'Checkpoint', 'Savepoint'],
        hl: 1,
        rows: [
          ['Purpose', 'Recover from a crash', 'A planned stop: upgrade, change, move'],
          ['Triggered by', 'Flink, on a timer', 'You, by hand or by your tooling'],
          ['Owned and deleted by', 'Flink', 'You: Flink never deletes it'],
          ['Format', 'Backend specific, may be incremental', 'Canonical (portable) by default, or native'],
          ['Cost', 'As light and quick to restore as possible', 'A little more to make and to restore']
        ],
        steps: [
          { upto: 2, say: 'A checkpoint is automatic and meant to be thrown away. Flink keeps the latest one and removes the rest.' },
          { upto: 4, say: 'A savepoint is yours. Nobody cleans it up, so someone must.' },
          { upto: 5, say: 'The canonical format is what lets you change the state backend or the parallelism between jobs. The faster native format comes with limits.' }
        ],
        pick: 'From the Flink documentation, page "Checkpoints vs. Savepoints". The recorded savepoint above was the default canonical format.'
      }),

      B.rows({
        id: 'm4-backend', t: 2, src: 'rec', title: 'Where the state lives: heap, RocksDB, incremental',
        steps: [
          {
            say: 'A job that keeps the first row for each order id, a deduplication, so its state grows with every new id. I ran it three times with the state in the **heap**, in **RocksDB** with whole checkpoints, and in RocksDB with **incremental** checkpoints. The table has the size of the state and the bytes each checkpoint wrote, at the first and the sixth checkpoint.',
            tabs: [{ layer: 'RECORDED', name: 'The same job with three settings', c: 'raw', cols: BK.cols, rows: BK.rows, trk: 2 }],
            notes: ['Recorded. The state grew by about 2,000 new ids a second. The sizes are bytes as the REST interface reported them for the vertex that holds the state.']
          },
          {
            say: 'Look at the last column. The heap backend and RocksDB with whole checkpoints **write the whole state again** each time: ' + n0(bk('heap')[4]) + ' and ' + n0(bk('RocksDB, full')[4]) + ' bytes. The incremental one wrote only **' + n0(bk('RocksDB, incremental')[4]) + '**, a fraction of its state of ' + n0(bk('RocksDB, incremental')[2]) + '. It uploads only the new files that RocksDB made since the last checkpoint.',
            tabs: [{ layer: 'RECORDED', name: 'What each checkpoint wrote, the sixth one', c: 'raw', cols: ['Backend', 'State size', 'Written by checkpoint 6'], rows: BK.rows.map(function (r) { return [r[0], r[2], r[4]]; }), trk: 2 }],
            notes: ['Recorded. The incremental run left ' + RF.shared_folder_files + ' files in a `shared` folder, files that later checkpoints can point to again.']
          }
        ]
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A TaskManager is killed. Checkpointing is on. What does Flink do?',
        opts: [
          { t: 'Restarts the tasks from the last complete checkpoint on the slots that are left', fb: '' },
          { t: 'Starts again from the beginning of the topic', fb: 'The sources go back to the positions saved in the checkpoint, not to the beginning.' },
          { t: 'Waits for you to resubmit the job', fb: 'The default restart strategy restarts it by itself.' },
          { t: 'Continues from the exact record where the process died', fb: 'Flink goes back to the last checkpoint, which is earlier.' }
        ],
        ok: 0,
        why: 'The JobManager restores the state and the source positions of the latest complete checkpoint and runs the tasks again. In the recording the log said "Restoring job from Checkpoint 3".'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'Which sink setting gives a reader that uses read-committed each order exactly once, after a job failure?',
        opts: [
          { t: 'A transactional (two-phase commit) sink with checkpoints', fb: '' },
          { t: 'A sink that writes as fast as possible', fb: 'Speed does not remove the duplicates of a replay.' },
          { t: 'Checkpointing alone, with an at-least-once sink', fb: 'The recording had ' + AL.duplicates + ' duplicates with exactly that.' },
          { t: 'A bigger checkpoint interval', fb: 'The interval changes how many records are replayed, not whether they are duplicated.' }
        ],
        ok: 0,
        why: 'Checkpoints rewind the source, so records after the last checkpoint are processed again. Only a sink that commits on checkpoint completion, and aborts otherwise, hides the first copy.'
      }),

      B.quiz({
        id: 'm4-q3', t: 2,
        q: 'You need to change a job from parallelism 2 to 3 without losing its counts. What do you do?',
        opts: [
          { t: 'Stop it with a savepoint and start it again from the savepoint with parallelism 3', fb: '' },
          { t: 'Change the parallelism in the web UI while it runs', fb: 'A running job cannot be rescaled in place.' },
          { t: 'Cancel it and start a new job', fb: 'A new job has no state. The recording counted ' + n0(NS.orders_counted_by_the_new_job) + ' of ' + n0(NS.orders_in_the_topic) + ' orders.' },
          { t: 'Delete the checkpoint folder first', fb: 'That would remove what you need.' }
        ],
        ok: 0,
        why: 'State is stored in key groups, so a savepoint can be restored with another parallelism. The recorded restore at parallelism ' + SR.parallelism_after + ' counted all ' + n0(SR.orders_counted) + ' orders correctly.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This job must come back after a TaskManager failure, without anyone resubmitting it. Click the line that is missing, or wrong.',
        file: 'job.sql', lang: 'sql',
        code: ["SET 'parallelism.default' = '2';", "CREATE TEMPORARY TABLE orders (order_id INT, store_id STRING) WITH ('connector' = 'kafka', 'topic' = 'orders', 'properties.bootstrap.servers' = 'broker:9092', 'properties.group.id' = 'g', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');", "CREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'counts', 'properties.bootstrap.servers' = 'broker:9092', 'key.format' = 'json', 'value.format' = 'json');", 'INSERT INTO counts SELECT store_id, COUNT(*) FROM orders GROUP BY store_id;'].join('\n'),
        bad: [1],
        hint: 'What turns checkpoints on?',
        why: 'There is no `execution.checkpointing.interval`, so the job takes no checkpoints. With checkpointing off the default restart strategy is `disable`, and the job fails for good when a TaskManager is lost. Add the interval next to the parallelism.',
        fix: ["SET 'parallelism.default' = '2';", "SET 'execution.checkpointing.interval' = '30 s';", "CREATE TEMPORARY TABLE orders (order_id INT, store_id STRING) WITH ('connector' = 'kafka', 'topic' = 'orders', 'properties.bootstrap.servers' = 'broker:9092', 'properties.group.id' = 'g', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');", "CREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'counts', 'properties.bootstrap.servers' = 'broker:9092', 'key.format' = 'json', 'value.format' = 'json');", 'INSERT INTO counts SELECT store_id, COUNT(*) FROM orders GROUP BY store_id;'].join('\n'),
        cheer: 'No checkpoint, no recovery.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put in order what happens when a TaskManager is lost under a job with checkpoints and a transactional sink.',
        items: [
          'The JobManager notices that the TaskManager is no longer reachable',
          'The open transaction of the sink is aborted',
          'The job is restarted on the slots that are left, after a short delay',
          'The tasks restore their state and the sources go back to the positions of the last complete checkpoint',
          'The records after that checkpoint are read again and written in a new transaction'
        ],
        why: 'Detection, abort, restart, restore and rewind, replay. The abort is what keeps the first copy of the replayed records from being read.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: which state backend',
        scenario: 'A job deduplicates orders by id over the last seven days. The state will reach about 200 GB in total, spread over 40 tasks. Checkpoints are taken every minute. The cluster has 8 GB of task heap in each TaskManager. You choose the backend and the checkpoint type.',
        opts: [
          { t: 'RocksDB with incremental checkpoints', d: 'State lives on local disk, bigger than memory, and a checkpoint uploads only the new files.', lose: '' },
          { t: 'The heap backend with full checkpoints', d: 'The fastest access to state.', lose: 'State is Java objects in memory: it would not fit, and every checkpoint writes all of it.' },
          { t: 'RocksDB with full checkpoints', d: 'It fits on disk.', lose: 'Every minute, every checkpoint writes the whole of 200 GB again.' }
        ],
        pick: 0,
        why: 'Big state needs RocksDB, which keeps it on disk. Incremental checkpoints make the upload follow the change of the state, not its size. In the recording the sixth incremental checkpoint wrote ' + Math.round(BS.rocksdb_incremental_written_6 / BS.rocksdb_incremental_state_6 * 100) + ' percent of the state.',
        when: 'For a small state that fits easily in memory, the heap backend is simpler and faster. Mind the cost of reading from disk in RocksDB: it is slower for each access.'
      }),

      B.incident({
        id: 'm4-inc', t: 1, src: 'rec', title: 'Incident: the job did not come back after the restart of a machine', time: '03:10',
        alert: '**A TaskManager machine rebooted at night, and the order-counting job has been FAILED since.** Nobody was paged because the dashboard is read in the morning. The job writes counts to a topic. In the web UI, the exception says "Recovery is suppressed by NoRestartBackoffTimeStrategy". A colleague says "just resubmit it".',
        clues: ['The exception names NoRestartBackoffTimeStrategy', 'The job was submitted with no checkpoint interval', 'The counts in the topic stopped at 02:50'],
        opts: [
          { t: 'Turn on checkpointing, so that the default restart strategy restarts the job, and alert on the state of the job', fb: '' },
          { t: 'Resubmit the job every night', fb: 'A new job starts with no state, as the recording showed: ' + n0(NS.orders_counted_by_the_new_job) + ' orders counted instead of ' + n0(NS.orders_in_the_topic) + '.' },
          { t: 'Raise the heartbeat timeout', fb: 'The failure was detected correctly. The job had no way to recover.' },
          { t: 'Use a bigger machine', fb: 'The size did not cause the failure.' }
        ],
        best: 0,
        why: 'Without checkpoints the default restart strategy is disable, so the first failure ends the job. With a checkpoint interval it restarts by itself from the last checkpoint. Resubmitting without a savepoint also loses the state.',
        checks: [['Read the exception of the job', 'NoRestartBackoffTimeStrategy means no restart was allowed.'], ['Look for execution.checkpointing.interval', 'Is it set in the job?'], ['Check the state of the job in monitoring', 'Alert on FAILED and on restarts.']],
        tell: 'The job had no checkpoints, so no restart strategy and the first failure was final. I enable checkpointing with an interval, so that it restarts from the last checkpoint, and I alert on the state of the job.',
        prevent: ['Make a checkpoint interval part of every job template', 'Alert on job state and on the number of restarts', 'Test recovery by killing a TaskManager before go-live']
      }),

      B.qa({
        id: 'qa-ckpt', t: 1, tag: 'State', secs: 90,
        q: 'How do checkpoints work, and how do they give exactly-once?',
        pts: ['Barriers injected at the sources', 'Each operator snapshots its state at the barrier', 'Positions saved with the state', 'Complete when all tasks acknowledge', 'Restore and rewind; sink must be transactional'],
        short: 'The JobManager periodically asks the sources to insert a numbered **barrier** into their streams. The barrier travels with the records. An operator that has the barrier from all its inputs **snapshots its state** and passes it on; the source saves its position. When every task has acknowledged, the checkpoint is complete. After a failure Flink restores the last complete checkpoint and rewinds the sources, so the **state** reflects each record once. For the **output** to reflect each record once the sink must take part: a transactional sink commits on checkpoint completion and aborts on failure. In my recording a copy job had ' + EO.duplicates + ' duplicates with that, and ' + AL.duplicates + ' with an at-least-once sink.',
        fu: [['What is an aligned checkpoint?', 'The operator waits for the barrier on every input and holds the faster inputs back. Unaligned checkpoints skip the wait and store records in flight; they help under backpressure.'], ['What if a checkpoint fails?', 'By default one failed checkpoint fails the job, and the failure restarts it. tolerable-failed-checkpoints changes it.']],
        trap: 'Saying that Flink processes each record exactly once. It restores state so that the effect is as if it had, and the sink must support it.',
        real: 'Your checkpoints take longer every day. What do you look at?'
      }),

      B.qa({
        id: 'qa-save', t: 1, tag: 'State', secs: 75,
        q: 'What is the difference between a checkpoint and a savepoint, and how do you upgrade a job?',
        pts: ['Checkpoint for crashes, owned by Flink', 'Savepoint for planned operations, owned by you', 'Canonical format is portable', 'Stop with savepoint, then restart from it', 'Operator ids must match'],
        short: 'A **checkpoint** is automatic, light, owned and deleted by Flink, and meant for recovery from a crash. A **savepoint** is triggered by you, kept until you delete it, and meant for planned operations: a new version of the job, a different parallelism, a move to another cluster. To upgrade I stop the job with `flink stop --savepointPath`, deploy the new version and start it from the savepoint. In my recording this carried the counts of ' + n0(SR.first_batch) + ' orders across a change of parallelism from ' + SR.parallelism_before + ' to ' + SR.parallelism_after + '. It only works if the new job can read the old state: in SQL a changed query failed with a StateMigrationException, and in a DataStream job the operators need stable ids.',
        fu: [['What if the job changed?', 'DataStream: keep uids stable. SQL: the plan must stay compatible, or use a compiled plan.'], ['Can I change the state backend?', 'With a canonical savepoint, yes.']],
        trap: 'Using a checkpoint as an upgrade path. It is not guaranteed to be usable after a change of the job.',
        real: 'We want to add a column to a streaming aggregate without losing its state. What are the options?'
      }),

      B.qa({
        id: 'qa-backend', t: 2, tag: 'State', secs: 75,
        q: 'Heap or RocksDB for the state, and what is an incremental checkpoint?',
        pts: ['Heap: objects in memory, fast, limited by memory', 'RocksDB: on local disk, bigger than memory, slower access', 'Full checkpoints write everything', 'Incremental: only new files', 'Cost: compaction and recovery'],
        short: 'The **heap** backend keeps state as Java objects in the TaskManager memory: access is fast and the size is limited by the heap. **RocksDB** keeps it in an embedded database on local disk, so the state can be much bigger than memory, but every access is serialized and slower. A **full** checkpoint writes all the state each time. An **incremental** checkpoint, available with RocksDB, writes only the new files since the last checkpoint. In my recording, at the sixth checkpoint a heap job wrote ' + n0(BS.heap_written_6) + ' bytes and an incremental RocksDB job ' + n0(BS.rocksdb_incremental_written_6) + ', for a state of ' + n0(BS.rocksdb_incremental_state_6) + '. I would choose RocksDB with incremental checkpoints for state of gigabytes or more.',
        fu: [['What about recovery time?', 'An incremental checkpoint needs several files to restore, so a restore can be slower than from a full one.'], ['What did Flink 2 add?', 'The documentation lists an experimental ForSt backend that keeps state on remote storage. I did not run it.']],
        trap: 'Choosing RocksDB for tiny state: it adds serialization cost for nothing.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'State Keeper', color: '#C7D2FE',
        pts: [
          '**State** is what a job keeps for each key. It lives in the TaskManager (heap or RocksDB) and a **checkpoint** saves it to durable storage with the source positions.',
          'A **killed TaskManager**: with checkpoints the job restarted by itself from checkpoint ' + AR.checkpoint_before_the_kill + ' and all ' + n0(AR.orders_counted) + ' orders were counted. Without checkpoints it ended **FAILED**.',
          'At least once: **' + AL.duplicates + '** duplicates. Exactly once, with a transactional sink: **' + EO.duplicates + '**, and **' + EO.records_of_aborted_transactions + '** aborted records nobody sees.',
          'A **savepoint** is yours: stop with a savepoint, restart from it, even with a **new parallelism** (' + SR.parallelism_before + ' to ' + SR.parallelism_after + '). A new job with no savepoint counted ' + n0(NS.orders_counted_by_the_new_job) + ' of ' + n0(NS.orders_in_the_topic) + '.',
          'A changed query can fail to restore (**StateMigrationException**). RocksDB with **incremental** checkpoints wrote ' + n0(BS.rocksdb_incremental_written_6) + ' bytes against ' + n0(BS.heap_written_6) + ' for the heap.'
        ]
      })
    ]
  });
})();
