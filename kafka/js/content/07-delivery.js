/* Mission 7: delivery guarantees. A lost acknowledgement and a retry (made with a small proxy, which is a stand-in for a flaky network), the order of "process" and "commit" with a crash in
   between, and a transaction that is cut in half. Real Apache Kafka 4.4.0 and the confluent-kafka client. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LA = G.table('delivery.lost_ack'), LB = G.table('delivery.lost_ack_batches'), CR = G.table('delivery.crash');
  var T1 = G.counts('delivery.tx_after_crash'), T2 = G.counts('delivery.tx_after_restart'), TM = G.counts('delivery.tx_markers');
  var TLO = G.text('delivery.tx_list_open'), TDO = G.text('delivery.tx_describe_open'), TDD = G.text('delivery.tx_describe_done'), TLD = G.text('delivery.tx_list_done'), TML = G.text('delivery.tx_marker_lines');
  var PY = G.file('code/delivery.py'), PX = G.file('code/lossy_proxy.py'), PL = G.file('code/app/pipeline.py');
  var WORKER = G.lines(PY, G.at(PY, /^def worker/), G.at(PY, /^    return read$/));
  var RETRY = G.lines(PY, G.at(PY, /^            proxy\.arm\(1\)/), G.at(PY, /^            p\.flush\(60\)/));
  var DROP = G.lines(PX, G.at(PX, /^        def to_client/), G.at(PX, /threading\.Thread\(target=to_broker/) - 1);
  var PIPE = G.lines(PL, G.at(PL, /^def run_pipeline/), G.at(PL, /^    consumer\.close\(\)/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var off = LA.rows.filter(function (r) { return /false/.test(r[0]); })[0], on = LA.rows.filter(function (r) { return /true/.test(r[0]); })[0];
  G.expect(Number(off[4]) === 10 && Number(off[5]) === 5 && Number(on[4]) === 5 && Number(on[5]) === 0 && Number(on[2]) === 2 && Number(on[3]) === 1, 'a lost acknowledgement makes five duplicates without idempotence and none with it');
  var cf = CR.rows[0], pf = CR.rows[1], idem = CR.rows[2];
  G.expect(Number(cf[5]) === 1 && Number(cf[6]) === 0 && Number(pf[5]) === 0 && Number(pf[6]) === 5 && Number(idem[7]) === 100, 'commit first loses one, process first repeats five, an idempotent sink ends with 100 rows');
  G.expect(T1.records_seen_by_a_read_committed_consumer === 60 && T1.records_seen_by_a_read_uncommitted_consumer === 70 && T2.read_committed_records === 100 && T2.read_uncommitted_records === 110, 'a transaction cut in half');
  G.expect(TM.commit === 10 && TM.abort === 1, 'ten commit markers and one abort marker');
  G.expect(T2.read_committed_has_duplicates === false && T2.read_committed_in_order === true && T2.orders_seen_twice_by_read_uncommitted.length === 10, 'no duplicates for a read_committed consumer');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Delivery guarantees and transactions', short: 'Delivery', blurb: 'At most once, at least once, exactly once: a lost answer, a crash between two lines, a transaction cut in half', minutes: 55,
    focus: ['qual', 'air', 'ci'],
    goals: [
      'Name the three **delivery guarantees**, and where each one comes from.',
      'Show what a **lost acknowledgement** does to a producer with and without idempotence.',
      'Compare **commit first** and **process first**, with the records lost or repeated.',
      'Explain a Kafka **transaction**: the id, the fence, the markers and `read_committed`.',
      'Say where **exactly-once** holds, and where it stops.',
      'Design a **consumer that is safe to repeat**.'
    ],
    say: 'Mission 7 is the one that interviewers love, and it is usually answered with slogans. I will not give you slogans. I will make an acknowledgement disappear, kill a program between two lines, and cut a transaction in half, and you will see in the log what each guarantee does. Press Next.',
    scenes: [
      B.talk({
        id: 'm7-three', t: 1, src: 'docs', title: 'Three guarantees',
        say: 'There are three, and they are about two different places: the producer side and the consumer side. Press Next.',
        items: [
          ['At most once', 'A record is delivered zero or one times. It can be **lost**, never repeated. A producer with `acks=0`, or a consumer that commits **before** it processes, gives at most once.', 'Never twice. Maybe never.'],
          ['At least once', 'A record is delivered one or more times. It is never lost, and it can be **repeated**. A producer that retries, and a consumer that commits **after** it processes, give at least once. This is the usual default.', 'Never lost. Maybe twice.'],
          ['Exactly once', 'The effect of a record happens once. It is not a property of a message: it is a property of a pipeline. Inside Kafka it is built from an **idempotent producer** and **transactions**. With an outside system it needs an **idempotent write** there.', 'The effect happens once, inside Kafka.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'A careful answer:', t: 'Exactly once does not mean that a record crosses the network once. It means that the result, the records and the offsets, shows up as if it happened once.' }
      }),

      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'Process and commit: where a crash hurts', g: 'delivery', legend: true,
        steps: [
          { say: 'A consumer reads a record, does some work and commits its position. The order of the last two steps decides the guarantee. Press Next.', cap: 'Read, work, commit.' },
          { say: 'Step 1. The consumer reads a record from the input topic with `poll`.', on: ['k1'], focus: ['d_in', 'd_poll'], cap: 'poll() returns a record.' },
          { say: 'Step 2. It processes the record.', on: ['k2'], focus: ['d_poll', 'd_proc'], cap: 'Do the work.' },
          { say: 'Step 3. The result is written to a sink: a database row or an output topic.', on: ['k3'], focus: ['d_proc', 'd_sink'], cap: 'Write the result.' },
          { say: 'Step 4. The consumer **commits** the offset of the next record. This is a separate request from the write in step 3. A crash can fall between them.', on: ['k4'], focus: ['d_proc', 'd_com'], cap: 'Commit the position.' },
          { say: 'Step 5. A crash here is the whole problem. **If the commit came first**, the record is marked as done but the work never happened: lost. **If the commit comes last**, the work happened but the record is read again: repeated.', on: ['k5'], focus: ['d_com', 'd_crash'], tags: ['tg_most', 'tg_least'], cap: 'Where a crash falls decides the guarantee.' },
          { say: 'Step 6. A **transaction** makes the write and the commit **one atomic step**. Both happen, or neither.', on: ['k6'], focus: ['d_tx', 'd_com'], cap: 'A transaction joins the two.' },
          { say: 'Step 7. Or make the sink **idempotent**: a write that has no further effect when repeated, for instance an upsert by order id. Then at-least-once is as good as exactly once.', on: ['k7'], focus: ['d_idem', 'd_sink'], cap: 'An idempotent sink makes repeats harmless.' }
        ]
      }),

      B.code({
        id: 'm7-proxy', t: 2, src: 'rec', title: 'How I made an acknowledgement disappear', file: 'lossy_proxy.py', lang: 'python', code: DROP,
        steps: [
          { say: 'A real network does not lose a packet when you ask it to, so I put a tiny proxy between the producer and the broker. It forwards everything, and throws away **one answer**. Press Next.', lines: null },
          { say: 'The proxy reads the Kafka protocol only as far as it must. Every response starts with the **correlation id** of the request that it answers. The proxy remembers the ids of the **Produce** requests that it has forwarded.', lines: G.span(DROP, /def to_client/, /corr = /) },
          { say: 'When the answer to a Produce request comes back, and the proxy is armed, it **does not forward it**. The broker has already written the records. The producer never hears about it.', lines: G.span(DROP, /if corr in produce_ids/, /continue/) },
          { say: 'Everything else, including the answers to metadata requests, goes through untouched.', lines: G.span(DROP, /client\.sendall/) }
        ],
        note: 'This is a stand-in for a flaky network, written for this course. The brokers, the producer, the batches and the log are real. Only the lost packet is made by hand, and the screen says so.'
      }),

      B.rows({
        id: 'm7-lostack', t: 1, src: 'rec', title: 'A lost acknowledgement, with and without idempotence',
        steps: [
          {
            say: 'Both producers send five orders in one batch. The broker writes the batch. The answer is thrown away. The producer waits, times out, and **sends the batch again**. Look at the log. Without idempotence there are **' + off[4] + ' records**: the five orders **twice**. With idempotence there are **' + on[4] + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Five orders, one lost answer', c: 'raw', cols: LA.cols, rows: LA.rows, trk: 0 }],
            notes: ['Recorded. Both producers made two Produce requests, and one answer was thrown away. Every delivery report said "delivered", in both cases: the producer was told the truth about its own retry, and not about the copy.']
          },
          {
            say: 'The batches in the log show why. The non-idempotent producer wrote two batches, offsets 0 to 4 and 5 to 9, **with no producer id**: the broker had nothing to compare. The idempotent producer sent the second request with the **same producer id and the same sequence number, 0**. The broker saw the sequence again and acknowledged without writing it.',
            tabs: [{ layer: 'RECORDED', name: 'The batches in the log', c: 'raw', cols: LB.cols, rows: LB.rows, trk: 1 }],
            notes: ['Recorded with kafka-dump-log. This is the mechanism of mission 4, shown at work.']
          }
        ]
      }),

      B.code({
        id: 'm7-retry-code', t: 2, src: 'rec', title: 'The experiment, in a few lines', file: 'delivery.py', lang: 'python', code: RETRY,
        steps: [
          { say: 'This is the part of the experiment that matters. Press Next.', lines: null },
          { say: '`proxy.arm(1)` tells the proxy to throw away the response to the next Produce request.', lines: G.span(RETRY, /proxy\.arm\(1\)/) },
          { say: 'Five orders are sent. The producer batches them, and the callback counts the answers.', lines: G.span(RETRY, /delivered = \[\]/, /p\.produce/) },
          { say: '`flush` waits. The first request is answered, but the answer is gone, so the producer waits for its socket timeout (three seconds in the recording) and retries on a new connection.', lines: G.span(RETRY, /p\.flush\(60\)/) }
        ],
        note: 'Recorded: `socket.timeout.ms` was three seconds, so that the retry comes quickly.'
      }),

      B.code({
        id: 'm7-worker', t: 1, src: 'rec', title: 'A worker that can crash on demand', file: 'delivery.py', lang: 'python', code: WORKER,
        steps: [
          { say: 'This worker reads orders from a topic, "processes" each one by writing its id into a sink, and can crash at the moment that I choose. Press Next.', lines: null },
          { say: 'With the strategy `commit-first`, the worker **commits the offset of a record before it processes it**. If it dies right after the commit, the record is skipped.', lines: G.span(WORKER, /if strategy == 'commit-first'/, /cons\.commit/) },
          { say: 'The crash is an exception raised at the chosen order. The `except` stops the loop, as if the process had died. The next worker starts in the same group, from what was committed.', lines: G.span(WORKER, /if oid == crash_after/, /raise Crash/) },
          { say: 'With `process-first`, the worker **writes the result first** and commits every ten records. A crash after the work and before the next commit means that the last records are read again.', lines: G.span(WORKER, /else:/, /since_commit = 0/) }
        ],
        note: 'Recorded: this code ran on the real cluster. The "sink" is a dictionary that counts how many times each order was written.'
      }),

      B.rows({
        id: 'm7-crash', t: 1, src: 'rec', title: 'A crash between two lines',
        steps: [
          {
            say: 'Three workers read the same hundred orders and crash once. **Commit first**, crashing after order 61: one order, **' + cf[8] + '**, was committed and never processed. It is **lost**. **Process first**, crashing after order 65, with commits every ten: orders **' + pf[9] + '** were processed twice. They are **repeated**.',
            tabs: [{ layer: 'RECORDED', name: 'One crash, three strategies', c: 'raw', cols: CR.cols, rows: CR.rows, trk: 0 }],
            notes: ['Recorded: a first worker that dies, then a second that starts from the committed offset. The orders are counted in a sink that remembers how often each one was written.']
          },
          {
            say: 'The third row is the same as the second, but the sink **overwrites by order id** instead of adding a row. The sink was written **' + idem[4] + '** times, and it ends with **' + idem[7] + ' rows**: the repeats did no harm. At-least-once with an idempotent sink gives the effect of exactly-once, without a transaction.',
            tabs: [{ layer: 'RECORDED', name: 'What the sink holds at the end', c: 'raw', cols: ['Strategy', 'Times written', 'Rows in the sink', 'Lost', 'Repeated'],
              rows: CR.rows.map(function (r) { return [r[0], r[4], r[7], r[5], r[6]]; }), trk: 1 }],
            notes: ['Recorded. An idempotent sink is the cheapest exactly-once. It needs a natural key, such as the order id.']
          }
        ]
      }),

      B.widget({ id: 'm7-lab', kind: 'crashlab', t: 1, src: 'rec', title: 'Lab: crash a worker' }),

      B.talk({
        id: 'm7-sink', t: 2, src: 'docs', title: 'Making the sink safe to repeat',
        say: 'Most real pipelines end in an outside system, and a Kafka transaction cannot reach into a database. Four tools do the job. Press Next.',
        items: [
          ['An upsert by key', 'Write with `INSERT ... ON CONFLICT DO UPDATE`, or `MERGE`, using the order id. A repeat writes the same row again.', 'The same key, the same row.'],
          ['A unique constraint', 'Let the database refuse the second copy, and treat "already exists" as success.', 'The database is the judge.'],
          ['A deduplication key', 'Store the topic, partition and offset of every record that you have applied, in the same transaction as the effect. Skip a record that you have seen.', 'Remember what you did.'],
          ['The outbox pattern', 'Write the change and an event row in one database transaction, and let a connector publish the events to Kafka, so that the database and Kafka cannot disagree.', 'One transaction, then publish.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'I make consumers idempotent, by keying the write, so that a repeat is harmless. Then at-least-once delivery is enough.' }
      }),

      B.flow({
        id: 'm7-txn', t: 1, src: 'docs', title: 'A transaction', g: 'txn', legend: true,
        steps: [
          { say: 'A consume-transform-produce loop where the output and the input position are committed together. Press Next.', cap: 'Read, transform, write, atomically.' },
          { say: 'Step 1. The producer is created with a **transactional id** and calls `init_transactions`. The **transaction coordinator** gives it a producer id and an **epoch**. If an older producer with the same id exists, it is **fenced**: its epoch is too old, and its open transaction is aborted.', on: ['k1'], focus: ['t_init', 't_begin'], cap: 'init_transactions fences the old producer.' },
          { say: 'Step 2. `begin_transaction` starts a transaction. Nothing is visible to other readers yet.', on: ['k2'], focus: ['t_begin', 't_out'], cap: 'A transaction starts.' },
          { say: 'Step 3. The producer writes the **output records**, possibly to several partitions. They are in the log, but marked as part of an open transaction.', on: ['k3'], focus: ['t_out', 't_off'], cap: 'The outputs are written, not yet visible.' },
          { say: 'Step 4. `send_offsets_to_transaction` adds the **consumer\'s input positions** to the same transaction. The commit of the position and of the outputs are now one.', on: ['k4'], focus: ['t_off', 't_com'], cap: 'The input position joins the transaction.' },
          { say: 'Step 5. `commit_transaction`. The coordinator writes a **commit marker** into every partition that the transaction touched. Only now does a consumer see the records.', on: ['k5'], focus: ['t_com', 't_coord'], cap: 'A commit marker in each partition.' },
          { say: 'Step 6. A consumer with `isolation.level=read_committed` reads only records of committed transactions, and **not past the first open one**. That position is the **last stable offset**.', on: ['k6'], focus: ['t_coord', 't_rc'], cap: 'read_committed stops at the first open transaction.' },
          { say: 'Step 7. If the producer fails, or aborts, an **abort marker** is written and the records are **skipped** by read_committed consumers. They stay in the log until retention removes them.', on: ['k7'], focus: ['t_abort', 't_rc'], cap: 'An aborted transaction is skipped.' }
        ]
      }),

      B.code({
        id: 'm7-pipe', t: 1, src: 'rec', title: 'The transactional pipeline', file: 'app/pipeline.py', lang: 'python', code: PIPE,
        steps: [
          { say: 'This is the pipeline that I ran. Press Next.', lines: null },
          { say: 'The consumer reads with `read_committed`, and does not commit by itself. The producer has a **transactional id**. `init_transactions` fences any older instance and aborts what it left open.', lines: G.span(PIPE, /consumer = Consumer/, /init_transactions/) },
          { say: 'Each batch of ten orders is one transaction. `begin_transaction`, then every output is produced. If the program is told to crash in this batch, it does so here: the outputs are sent, and the transaction is **not finished**.', lines: G.span(PIPE, /batch_no \+= 1/, /os\._exit/) },
          { say: 'Then the **positions of the consumer go into the transaction**, and the transaction is committed. The outputs and the input position are now one atomic step.', lines: G.span(PIPE, /send_offsets_to_transaction/, /commit_transaction/) }
        ],
        note: 'Recorded: this code ran in two processes. The first was told to die in batch 7, and was killed with exit code 137.'
      }),

      B.rows({
        id: 'm7-tx-crash', t: 1, src: 'rec', title: 'The process dies in the middle of batch 7',
        steps: [
          {
            say: 'The first process committed six batches, sixty orders, and died in batch 7 after sending ten outputs. Two consumers look at the output topic. The one with `read_committed` sees **' + T1.records_seen_by_a_read_committed_consumer + '** records. The one with `read_uncommitted` sees **' + T1.records_seen_by_a_read_uncommitted_consumer + '**: the ten of the open transaction as well.',
            tabs: [{ layer: 'RECORDED', name: 'Two consumers, one open transaction', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['Exit code of the first process', T1.exit_code_of_the_first_run + ' (killed)'], ['Batches committed before the crash', T1.batches_committed_before_the_crash], ['Records seen by read_committed', T1.records_seen_by_a_read_committed_consumer], ['Records seen by read_uncommitted', T1.records_seen_by_a_read_uncommitted_consumer], ['Records of the open transaction', T1.records_of_the_open_transaction]], trk: 0 }],
            notes: ['Recorded. The committed consumer cannot read past the **last stable offset**, which is where the open transaction starts.']
          },
          {
            say: 'The transaction coordinator knows it. `kafka-transactions.sh list` shows the state of every transactional id. Ours is **Ongoing**. `describe` adds the partitions that it touched, and its timeout: **20 seconds**. If nobody finishes it, the coordinator aborts it after the timeout.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-transactions.sh list', c: 'raw', cols: ['Output'], rows: TLO.split('\n').map(function (l) { return [l]; }), trk: 1 }, { layer: 'RECORDED', name: 'kafka-transactions.sh describe --transactional-id tx-pipeline-1', c: 'raw', cols: ['Output'], rows: TDO.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The coordinator, the producer id and the times are replaced by markers.']
          }
        ]
      }),

      B.rows({
        id: 'm7-tx-restart', t: 1, src: 'rec', title: 'The restart: exactly once',
        steps: [
          {
            say: 'I started the pipeline again with the same transactional id. `init_transactions` **fenced** the dead producer and **aborted** its open transaction. The group\'s position had not moved past order 60, so batch 7 was read again and done properly, and the pipeline finished. **' + T2.read_committed_records + '** committed outputs, **' + T2.read_committed_distinct_orders + '** different orders: **no duplicates**, in order.',
            tabs: [{ layer: 'RECORDED', name: 'The output topic after the restart', c: 'raw', cols: ['Measure', 'read_committed', 'read_uncommitted'],
              rows: [['Records', T2.read_committed_records, T2.read_uncommitted_records], ['Different orders', T2.read_committed_distinct_orders, T2.read_uncommitted_distinct_orders], ['Duplicates seen', T2.read_committed_has_duplicates ? 'yes' : 'none', T2.read_uncommitted_records - T2.read_uncommitted_distinct_orders]], trk: 0 }],
            notes: ['Recorded. The consumer that reads uncommitted records sees the ten records of the aborted attempt as well: orders ' + T2.orders_seen_twice_by_read_uncommitted[0] + ' to ' + T2.orders_seen_twice_by_read_uncommitted[T2.orders_seen_twice_by_read_uncommitted.length - 1] + ' twice.']
          },
          {
            say: 'The log holds the proof. Besides data batches there are **control batches**: markers written by the coordinator. I counted **' + TM.commit + ' COMMIT** markers for the ten batches that finished, and **' + TM.abort + ' ABORT** marker, for the batch that was cut. The aborted records are still in the log, and read_committed skips them.',
            tabs: [{ layer: 'RECORDED', name: 'Markers in the log of the output partition', c: 'raw', cols: ['kafka-dump-log line'], rows: TML.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded with kafka-dump-log. `endTxnMarker` is the marker. Transactions that wrote records: ' + TM.transactions_that_wrote_records + '.']
          },
          {
            say: 'And the coordinator\'s view after the end: the transactional id is no longer Ongoing. The producer **epoch** went up each time the id was reused, which is how an old producer is recognised as stale.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-transactions.sh list, at the end', c: 'raw', cols: ['Output'], rows: TLD.split('\n').map(function (l) { return [l]; }), trk: 2 }, { layer: 'RECORDED', name: 'describe, at the end', c: 'raw', cols: ['Output'], rows: TDD.split('\n').map(function (l) { return [l]; }), trk: 2 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.cmp({
        id: 'm7-limits', t: 2, src: 'docs', title: 'Where exactly-once holds, and where it stops',
        say: 'Transactions are powerful and narrow. Press Next to read where the guarantee ends.',
        cols: ['Pipeline', 'Exactly once?', 'How', 'Condition'],
        hl: 1,
        rows: [
          ['Kafka topic to Kafka topic, with a transactional producer', 'Yes', 'Outputs and input offsets in one transaction', 'Consumers of the output use read_committed'],
          ['Kafka Streams with exactly_once_v2', 'Yes', 'The same mechanism, built in', 'Output readers use read_committed'],
          ['Kafka to a database, by a consumer', 'Not by Kafka alone', 'An idempotent write, or a dedupe key stored with the effect', 'A natural key'],
          ['A database to Kafka, by a custom producer', 'Not by Kafka alone', 'The outbox pattern, or CDC from the log', 'A single database transaction'],
          ['Any pipeline with a side effect: email, payment', 'No', 'An idempotency key at the receiver', 'The receiver must support it']
        ],
        pick: 'Say where the boundary is. Exactly once is a property of a pipeline whose input and output are both Kafka, or whose sink is idempotent.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A consumer commits the offset first, then processes the record, and crashes during the processing. What is the guarantee?',
        opts: [
          { t: 'At most once: the record is lost', fb: '' },
          { t: 'At least once: the record is repeated', fb: 'It would be repeated if the commit came last.' },
          { t: 'Exactly once', fb: 'There is no atomic step between the commit and the work.' },
          { t: 'None of these: Kafka retries it', fb: 'The offset says the record is done, so it is never read again.' }
        ],
        ok: 0,
        why: 'After the restart the group resumes after the committed offset, so the record that was being processed is never read again. In the recording one order was lost this way.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'What does an idempotent producer prevent?',
        opts: [
          { t: 'A duplicate that comes from the producer retrying a batch whose acknowledgement was lost', fb: '' },
          { t: 'A duplicate that comes from the application sending the event twice', fb: 'The broker cannot know that two sends are the same event.' },
          { t: 'A consumer reading a record twice', fb: 'That is the consumer side.' },
          { t: 'The loss of a record when a broker fails', fb: 'That is replication.' }
        ],
        ok: 0,
        why: 'The producer id and sequence number let the broker recognise a retried batch. The recording sent a batch twice, and the log held five records, not ten.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'A transaction is left open when its producer dies. What does a consumer with read_committed see?',
        opts: [
          { t: 'The records of the open transaction as soon as they are written', fb: 'That is read_uncommitted.' },
          { t: 'Only the records before the open transaction: it cannot read past it', fb: '' },
          { t: 'Nothing, until the topic is deleted', fb: 'It reads everything before the open transaction.' },
          { t: 'An error', fb: 'It sees a normal stream that stops.' }
        ],
        ok: 1,
        why: 'The last stable offset is where the first open transaction begins. A read_committed consumer stops there until the transaction is committed or aborted, which happens when the timeout expires or a new producer fences the old one.'
      }),

      B.quiz({
        id: 'm7-q4', t: 2,
        q: 'A pipeline reads from Kafka and writes rows to a database. How do you make the effect happen once?',
        opts: [
          { t: 'Turn on exactly_once in the consumer', fb: 'A Kafka transaction does not reach into a database.' },
          { t: 'Make the write idempotent, for instance an upsert by the order id', fb: '' },
          { t: 'Use acks=all in the producer of the source', fb: 'It concerns the source topic, not your database write.' },
          { t: 'Commit after every record', fb: 'It narrows the window and does not close it.' }
        ],
        ok: 1,
        why: 'With a side effect outside Kafka, at-least-once delivery plus an idempotent write is the dependable answer. A repeat then changes nothing.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'This loop must not lose any order if the process crashes in the middle of a record. Click the line that can lose one.',
        file: 'loader.py', lang: 'python',
        code: ['while True:', '    msg = consumer.poll(1.0)', '    if msg is None:', '        continue', '    consumer.commit(msg)', '    load_into_warehouse(msg.value())'].join('\n'),
        bad: [5],
        hint: 'What does the position say after the commit, if the next line never runs?',
        why: '`commit(msg)` marks the record as done **before** it is loaded. A crash between the two lines loses the record: after a restart the group starts after it. Load first, commit after, and make the load safe to repeat.',
        fix: ['while True:', '    msg = consumer.poll(1.0)', '    if msg is None:', '        continue', '    load_into_warehouse(msg.value())   # safe to repeat: an upsert by order id', '    consumer.commit(msg)'].join('\n'),
        cheer: 'Do the work, then commit.'
      }),

      B.order({
        id: 'm7-ord', t: 2, q: 'Put the life of one transaction in order.',
        items: [
          'init_transactions: the coordinator gives an id and an epoch and fences older producers',
          'begin_transaction',
          'Produce the output records, which are written but marked as open',
          'send_offsets_to_transaction: the input positions join the transaction',
          'commit_transaction: the coordinator writes a commit marker in every partition',
          'A read_committed consumer can now read the records'
        ],
        why: 'The records are written first, and are made visible by the commit marker. The input offsets go in the same transaction, so the position and the output are committed together.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: how should the loader avoid duplicates',
        scenario: 'The loader reads orders from Kafka and writes them to the warehouse, which has a primary key on the order id. After a rebalance, a few hundred orders were loaded twice. The warehouse is not a Kafka system. You choose the fix.',
        opts: [
          { t: 'Use Kafka transactions between the loader and the warehouse', d: 'It is the exactly-once feature.', lose: 'A Kafka transaction cannot include a write to the warehouse, so the duplicates would remain.' },
          { t: 'Make the load an upsert by order id, commit after the load, and accept repeats', d: 'A repeat writes the same row again.', lose: '' },
          { t: 'Commit before loading, so that nothing is repeated', d: 'No repeats at all.', lose: 'A crash would lose orders instead. A lost order is worse than a repeated one.' }
        ],
        pick: 1,
        why: 'The warehouse already has the key. An upsert makes the repeat harmless, and committing after the load means nothing is lost. It is the cheapest way to an exact result.',
        when: 'If the output is another Kafka topic, a transaction is the right tool. Say where the pipeline ends.'
      }),

      B.incident({
        id: 'm7-inc', t: 1, src: 'rec', title: 'Incident: the warehouse has duplicate orders after a deploy', time: '10:05',
        alert: '**About 300 orders appear twice in the warehouse table after this morning\'s deploy.** The loader reads with a consumer group and writes with plain inserts. There was a rebalance during the deploy.',
        clues: ['The duplicates are the last records before the deploy, per partition', 'The loader commits every 500 records', 'The table has no unique key'],
        opts: [
          { t: 'Expect at-least-once: add a unique key and make the load an upsert, and remove the duplicates', fb: '' },
          { t: 'Set acks=all on the producers', fb: 'The duplicates come from the consumer\'s commits, not the producer.' },
          { t: 'Commit after every record', fb: 'It shrinks the window and does not close it.' },
          { t: 'Delete the consumer group', fb: 'The records would be read again from the start.' }
        ],
        best: 0,
        why: 'Between two commits, the loader writes up to 500 records. A rebalance or a crash makes the next owner start from the last commit, so those records are written again. The recording shows the same: five orders repeated after a crash with commits every ten. The loader must be idempotent.',
        checks: [
          ['Compare the duplicates with the commit interval', 'The repeated records are the last ones before the commit.'],
          ['Check the table for a key', 'No key means no protection.'],
          ['Read the group\'s history', 'A rebalance in the deploy window explains it.']
        ],
        tell: 'The loader gives at-least-once, so a rebalance repeated up to 500 records, and the table could not refuse them. We removed the duplicates, added a key on the order id and made the load an upsert.',
        prevent: ['A natural key and an upsert on every sink', 'Keep at-least-once and make writes idempotent', 'Test the loader with a forced crash between the work and the commit']
      }),

      B.incident({
        id: 'm7-inc2', t: 2, src: 'rec', title: 'Incident: a read_committed consumer is stuck at one offset', time: '15:20',
        alert: '**The reporting job that reads `payments-out` has not moved for twenty minutes, but the topic keeps growing.** A transactional service was killed by an out-of-memory error in the same window.',
        clues: ['The job reads with isolation.level read_committed', '`kafka-transactions.sh list` shows one id in the state Ongoing', 'The transaction timeout of that service is 15 minutes'],
        opts: [
          { t: 'Wait for the transaction timeout, or restart the service so that init_transactions fences and aborts it, and shorten the timeout in future', fb: '' },
          { t: 'Switch the job to read_uncommitted to get past it', fb: 'It would read the records of an unfinished transaction, which may later be aborted.' },
          { t: 'Delete the topic', fb: 'You would lose every record.' },
          { t: 'Add consumers to the job', fb: 'Every consumer stops at the same last stable offset.' }
        ],
        best: 0,
        why: 'An open transaction holds the last stable offset back, and every read_committed consumer waits behind it. It ends when the coordinator times it out, or when a new producer with the same transactional id fences it. The recording shows an Ongoing transaction and a consumer that sees 60 records while 70 exist.',
        checks: [
          ['List the transactions', 'Find the id in the state Ongoing and its start time.'],
          ['Compare the end offset with the last stable offset', 'A gap that does not close is the sign.'],
          ['Check transaction.timeout.ms', 'It is how long you wait.']
        ],
        tell: 'A transactional producer died in the middle of a transaction, and until that transaction times out, read_committed consumers cannot read beyond it. We restarted the service so that its id is fenced, and will lower the transaction timeout.',
        prevent: ['Keep transaction.timeout.ms short', 'Alert on transactions that stay Ongoing for a long time', 'Restart transactional services with the same transactional id']
      }),

      B.qa({
        id: 'qa-eos', t: 1, tag: 'Delivery', secs: 75,
        q: 'What do at-most-once, at-least-once and exactly-once mean in Kafka?',
        pts: ['At most once: can lose', 'At least once: can repeat', 'Exactly once: the effect once', 'Producer: acks and retries, idempotence', 'Consumer: commit order'],
        short: '**At most once** means a record can be lost but never repeated: acks=0, or a consumer that commits before it processes. **At least once** means never lost and sometimes repeated: a producer that retries, and a consumer that commits after it processes. **Exactly once** means that the effect happens once. Inside Kafka it comes from an **idempotent producer**, which drops retried batches by producer id and sequence, and **transactions**, which commit the output records and the input offsets together. With an outside sink it needs an **idempotent write**. In the recording, a crash between a commit and the work lost one order, a crash between the work and the commit repeated five, and a sink that overwrites by key ended with exactly one row for each order.',
        fu: [['Does Kafka give exactly-once?', 'For a pipeline from Kafka to Kafka, yes, with transactions and read_committed. For a database, the sink must be idempotent.'], ['What is the usual default?', 'At least once: retries on the producer and a commit after processing on the consumer.']],
        trap: 'Saying that exactly-once means a message travels once. It means the effect happens once.',
        real: 'We read from Kafka and write to Postgres. Where could we get duplicates?'
      }),

      B.qa({
        id: 'qa-txn', t: 2, tag: 'Delivery', secs: 75,
        q: 'How does a Kafka transaction work?',
        pts: ['transactional.id and the coordinator', 'Epoch and fencing', 'Outputs and offsets in one transaction', 'Commit or abort markers', 'read_committed and the last stable offset'],
        short: 'A producer has a **transactional id**. At start, `init_transactions` registers it with the **transaction coordinator**, which gives it a producer id and an **epoch** and **fences** any older producer with the same id, aborting its open transaction. The producer writes the output records to any partitions, and sends the consumer\'s **input offsets** to the transaction, so that both are committed together. On commit, the coordinator writes a **commit marker** into every partition involved, and on abort an abort marker. Consumers with `isolation.level=read_committed` read only committed records and never beyond the **last stable offset**, which is the first open transaction. In my recording a process was killed in the middle of a batch, and after the restart there were 100 committed outputs and no duplicates, while a read_uncommitted consumer saw 110.',
        fu: [['What if the producer dies?', 'The transaction stays open until its timeout, or until a new producer with the same id fences it.'], ['What does it cost?', 'A bit of latency per commit, and more partitions with markers. Keep transactions short.']],
        trap: 'Forgetting that consumers must use read_committed, or they see aborted records.',
        real: 'Design a pipeline that reads orders, enriches them and writes to another topic, with no duplicates.'
      }),

      B.qa({
        id: 'qa-idemconsumer', t: 1, tag: 'Delivery', secs: 75,
        q: 'How do you make a consumer safe to repeat?',
        pts: ['Commit after processing', 'An idempotent write: upsert by key', 'A dedupe key: topic, partition, offset', 'A transaction when the sink is Kafka', 'Test with a crash'],
        short: 'I commit **after** the work, so that nothing is lost, and then I make the work **safe to repeat**. The best way is a natural key: an upsert by the order id, or a unique constraint that I treat as success. When there is no natural key, I store the **topic, partition and offset** of each record that I applied, in the same transaction as the effect, and skip any record I have seen. If the output is another Kafka topic, I use a **transaction** and read_committed. And I test it: I kill the process between the work and the commit and look at the result. In my recording, an append-only sink ended with five repeated orders, and a sink that overwrote by order id ended with exactly 100 rows.',
        fu: [['What if the effect is an email?', 'Send it with an idempotency key, or record that it was sent in the same transaction as the offset, and accept that a failure between sending and recording can still send twice.'], ['How often can a repeat happen?', 'On every rebalance, every restart and every crash, by up to the commit interval.']],
        trap: 'Committing before processing to avoid repeats. It trades repeats for losses.',
        real: 'The warehouse has duplicates. How do you find out why, and fix it?'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Delivery Checker', color: '#FECACA',
        pts: [
          '**At most once** can lose, **at least once** can repeat, **exactly once** means the effect happens once. It is a property of a pipeline, not of a message.',
          'A **lost acknowledgement** makes the producer retry. Without idempotence, the log held **10** records for 5 orders. With it, **5**.',
          '**Commit first** lost an order. **Process first** repeated five. A sink that **overwrites by key** ended with the right 100 rows.',
          'A **transaction** writes outputs and input offsets together, with **commit or abort markers**. read_committed reads only committed records, and stops at the **last stable offset**.',
          'The recorded transaction crash: 60 visible to read_committed while 70 existed, and **100** with no duplicates after the restart.',
          'For an outside sink, make the write **idempotent**. A Kafka transaction does not reach into a database.'
        ]
      })
    ]
  });
})();
