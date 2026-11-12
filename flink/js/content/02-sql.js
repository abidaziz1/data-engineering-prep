/* Mission 2: Flink SQL and the changelog. The same twelve orders go through the SQL client in batch mode and in streaming mode. A streaming result is a stream of changes: insert, retract, update and
   delete. Real Apache Flink 2.2.1, the SQL client in tableau mode, EXPLAIN CHANGELOG_MODE and the print sink. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SS = G.counts('sql.stream_summary'), TS = G.counts('sql.two_level_summary'), AS = G.counts('sql.append_only_summary'), MB = G.counts('sql.minibatch_summary'), PS = G.counts('sql.print_summary');
  var BG = G.table('sql.batch_group'), SG = G.table('sql.stream_group'), TL = G.table('sql.two_level'), AO = G.table('sql.append_only'), PO = G.text('sql.print_out');
  var EF = G.text('sql.explain_filter'), EG = G.text('sql.explain_group'), E2 = G.text('sql.explain_two'), SCR = G.file('sql/sql_stream.sql'), SCR2 = G.file('sql/sql_two.sql');
  G.expect(SS.changelog_rows === 17 && SS.ops['+I'] === 7 && SS.ops['-U'] === 5 && SS.ops['+U'] === 5 && SS.replay_equals_batch === true, 'seven inserts, five retractions and five updates, and the replay equals the batch result');
  G.expect(TS.changelog_rows === 25 && TS.ops['-D'] === 3 && JSON.stringify(TS.replay) === JSON.stringify(TS.batch), 'the count of counts deletes three rows, and ends as its batch result');
  G.expect(AS.rows === 3 && AS.ops.length === 1 && AS.ops[0] === '+I', 'a query without an aggregate sends only inserts');
  G.expect(MB.changelog_rows_without === 17 && MB.changelog_rows_with < 17 && MB.same_final_table === true, 'mini-batch sends fewer changes and the same final table');
  G.expect(/changelogMode=\[I\]/.test(EF) && /changelogMode=\[I,UA\]/.test(EG) && /changelogMode=\[I,UA,D\]/.test(E2) && /changelogMode=\[I,UB,UA\]/.test(E2), 'the changelog modes of the three plans');
  var firstD = TL.rows.map(function (r) { return r[0]; }).indexOf('-D');
  G.expect(firstD > 0, 'a delete in the count of counts');
  var chgRows = function (t) { return t.rows.map(function (r, n) { return n; }).filter(function (n) { return t.rows[n][0] !== '+I'; }); };

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Flink SQL and the changelog', short: 'SQL', blurb: 'A streaming query is a table that changes: insert, retract, update, delete', minutes: 35,
    focus: ['stg', 'int'],
    goals: [
      'Explain a **dynamic table** and a **continuous query**.',
      'Read a **changelog** with its four kinds of change: **+I**, **-U**, **+U**, **-D**.',
      'Say why a streaming result **ends as the batch result**.',
      'Tell an **append-only**, a **retract** and an **upsert** sink apart, and say which a query needs.',
      'Use **EXPLAIN CHANGELOG_MODE**, and know what **mini-batch** trades.'
    ],
    say: 'Mission 2 is Flink SQL. The surprise is the result. A SQL query in a database returns a table and is done. A streaming query never finishes, so its result is a table that keeps changing, and Flink shows it as a list of changes. I gave twelve orders to the real SQL client twice, in batch mode and in streaming mode, and read what it printed. Press Next.',
    scenes: [
      B.talk({
        id: 'm2-model', t: 1, src: 'docs', title: 'Streams and tables',
        say: 'Four ideas make up the model. Press Next.',
        items: [
          ['A stream is a table that grows', 'Imagine every new order as a row added to a table. Flink calls it a **dynamic table**: a table that changes over time. A Kafka topic, read as a table, is a dynamic table that only gets inserts.', 'A stream is a table over time.'],
          ['A continuous query', 'A SQL query over a dynamic table is a **continuous query**. It never finishes. When a row arrives, the query updates its result, and a result that changes is itself a dynamic table.', 'A query that stays on.'],
          ['The result is a changelog', 'To tell the world how its result changed, Flink sends **changes**: **+I** a new row, **-U** the old version of a row is withdrawn, **+U** the new version, **-D** a row is deleted. Together they are the **changelog**.', 'Four kinds of change.'],
          ['The batch answer is where it ends', 'Apply the changes one by one and you hold the current table. When the input stops, you hold what the same query would have returned in batch mode. That is why one SQL works for both.', 'Streaming ends where batch starts.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'A streaming query is a continuous query on a dynamic table. Its output is a changelog of inserts, retractions, updates and deletes, and applying the changelog gives the same table as the batch query.' }
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'docs', title: 'A stream, a query, a changelog, a table', g: 'dynamic', legend: true,
        steps: [
          { say: 'The path from orders to a result. Press Next.', cap: 'Orders in, a table out.' },
          { say: 'Step 1. Orders arrive, one row at a time. They are inserts into a dynamic table.', on: ['k1'], focus: ['d_str', 'd_q'], cap: 'New rows.' },
          { say: 'Step 2. The continuous query, a count for each store, reacts to each row. The first order of a store creates a result row. Later orders change it.', on: ['k2'], focus: ['d_q', 'd_log'], cap: 'The query reacts to every row.' },
          { say: 'Step 3. What leaves the query is a **changelog**: insert, retract the old row, send the new row, delete.', on: ['k3'], focus: ['d_log', 'd_tab'], cap: 'Changes, not rows.' },
          { say: 'Step 4. A sink applies the changes: it prints them, writes a topic, or updates a table.', on: ['k4'], focus: ['d_tab', 'd_snk'], cap: 'The sink applies the changes.' },
          { say: 'Step 5. Run the same SQL as a batch over all the rows and you get one answer. It is the table that the changelog ends with.', on: ['k5'], focus: ['d_bat', 'd_tab'], cap: 'The same final table.', tags: ['tg_chg'] }
        ]
      }),

      B.sql({
        id: 'm2-sql', t: 1, src: 'rec', title: 'The same query in streaming mode', file: 'sql_stream.sql', code: SCR,
        steps: [
          { say: 'The script that I gave to the real SQL client. Press Next.', lines: null },
          { say: 'Two settings. `streaming` is the mode of the query. `tableau` makes the client print the result as a table in the terminal, with an extra column **op** for the kind of change.', lines: G.span(SCR, /result-mode/, /runtime-mode/) },
          { say: 'The source: twelve orders in a file. The file connector reads a file as a stream that ends. The parallelism is one, so that the order of the changes is the same on every run.', lines: G.span(SCR, /CREATE TEMPORARY TABLE orders/, /WITH/) },
          { say: 'The query: orders and cents for each store.', lines: G.span(SCR, /SELECT store_id/), run: true }
        ],
        result: { cols: SG.cols, rows: SG.rows, msg: SG.rows.length + ' changes (' + G.text('sql.stream_footer') + ')' },
        note: 'Recorded on Flink ' + G.meta('flink') + '. Twelve orders and seven stores made ' + SG.rows.length + ' changes. Watch the rows of store s01.'
      }),

      B.rows({
        id: 'm2-batch', t: 1, src: 'rec', title: 'Batch: one answer. Streaming: every step',
        steps: [
          {
            say: 'First the answer of the **batch** run. The same query, the same twelve orders: seven rows, one for each store. It is final.',
            tabs: [{ layer: 'RECORDED', name: 'Batch mode: ' + G.text('sql.batch_footer'), c: 'raw', cols: BG.cols, rows: BG.rows, trk: 0 }],
            notes: ['Recorded. Store s01 sold five orders for 2,536 cents.']
          },
          {
            say: 'Now the **streaming** run. Store s01 appears first as an insert with one order, then every later order withdraws the row (**-U**) and sends the new one (**+U**). Find the last two rows of s01: they end with the batch answer, **5** orders and **2536** cents.',
            tabs: [{ layer: 'RECORDED', name: 'Streaming mode: ' + SG.rows.length + ' changes', c: 'raw', cols: SG.cols, rows: SG.rows, trk: SG.rows.length - 1, chg: chgRows(SG).map(function (n) { return [n, 0]; }) }],
            notes: ['Recorded. ' + SS.ops['+I'] + ' inserts, ' + SS.ops['-U'] + ' retractions, ' + SS.ops['+U'] + ' updates: ' + SS.changelog_rows + ' changes for ' + SS.batch_rows + ' final rows.']
          },
          {
            say: 'I replayed the changelog, row by row, in a small program: an insert or an update puts a row in a table, a retraction or a delete takes it out. The table that came out is the batch answer, exactly.',
            tabs: [{ layer: 'CHECKED', name: 'The replay against the batch result', c: 'raw', cols: ['Check', 'Result'], rows: [['Rows in the changelog', SS.changelog_rows], ['Rows in the batch result', SS.batch_rows], ['Replaying the changelog gives the batch result', SS.replay_equals_batch ? 'yes' : 'no']], trk: 2 }],
            notes: ['Computed: the replay is a few lines of Python in the recorder. It stopped the recording if the two tables differed.']
          }
        ]
      }),

      B.widget({ id: 'm2-lab', kind: 'changeloglab', t: 1, src: 'rec', title: 'Lab: feed the orders and read the changelog' }),

      B.sql({
        id: 'm2-two', t: 1, src: 'rec', title: 'An aggregate on an aggregate: a row is taken back', file: 'sql_two.sql', code: SCR2,
        steps: [
          { say: 'The first query counts orders for each store. This one counts **how many stores have each count**. It is a query on the result of a query that changes. Press Next.', lines: null },
          { say: 'The inner query is the count for each store, the same one as before.', lines: G.span(SCR2, /SELECT n, COUNT/, /GROUP BY store_id/) },
          { say: 'The outer query groups the counts. When store s01 moves from 2 orders to 3, one store leaves the group of 2 and joins the group of 3. If the group of 2 is now empty, the row must **disappear**.', lines: G.span(SCR2, /GROUP BY store_id\) GROUP BY n/), run: true }
        ],
        result: { cols: TL.cols, rows: TL.rows, msg: TL.rows.length + ' changes' },
        note: 'Recorded. There are ' + TS.ops['-D'] + ' deletes in it: a **-D** is sent when the last store with a given count moves on. The inner query sends -U and +U, the outer one has to react to both.'
      }),

      B.code({
        id: 'm2-explain', t: 2, src: 'rec', title: 'EXPLAIN CHANGELOG_MODE: ask the planner', file: 'explain.txt', lang: 'text', code: E2,
        steps: [
          { say: 'You do not have to run a query to know what it will send. `EXPLAIN CHANGELOG_MODE` prints the plan with the kinds of change that each operator produces. This is the plan of the count of counts. Read it from the bottom up.', lines: null },
          { say: 'The scan of the orders sends only **I**, inserts. Nothing is ever taken back.', lines: G.span(E2, /TableSourceScan/) },
          { say: 'The first aggregation sends **I, UB, UA**: an insert, the **before** image of an update (-U), and the **after** image (+U).', lines: G.span(E2, /GroupAggregate\(groupBy=\[store_id\]/) },
          { say: 'The second aggregation can also **D**elete: its output is **I, UA, D**. It has no UB, because it can describe an update by sending only the new row.', lines: G.span(E2, /GroupAggregate\(groupBy=\[n\]/) }
        ],
        note: 'Recorded. The plan of the filter query shows <code>changelogMode=[I]</code>, and the plan of the single count shows <code>[I,UA]</code> at its output: with one level, a sink that has a primary key can take an update as one message.'
      }),

      B.rows({
        id: 'm2-append', t: 1, src: 'rec', title: 'A query without an aggregate only inserts',
        steps: [{
          say: 'Not every streaming query retracts. Keep the refunds: `WHERE status = \'refunded\'`. Every row that passes is an insert, and no row is ever taken back. The client printed **' + AS.rows + '** rows, all **+I**. The result of such a query is called **append-only**.',
          tabs: [{ layer: 'RECORDED', name: 'The refunds, streaming mode', c: 'raw', cols: AO.cols, rows: AO.rows, trk: 0 }],
          notes: ['Recorded. The input had ' + AS.refunds_in_input + ' refunds.']
        }]
      }),

      B.term({
        id: 'm2-print', t: 2, src: 'rec', title: 'What a sink really receives', 
        say: 'A sink does not see a table. It sees the changes. This is what the `print` connector wrote for the count per store, one line for each change, with the kind of change in front.',
        lines: G.plain(PO, { cmd: 'INSERT INTO per_store SELECT store_id, COUNT(*), SUM(total_cents) FROM orders GROUP BY store_id', d: 70 }),
        after: PS.lines + ' lines: the same ' + SS.changelog_rows + ' changes as the client showed. The print sink accepts every kind of change. A sink that accepts fewer kinds needs a query that sends fewer kinds.',
        afterKind: 'tip',
        doneSay: 'The print sink shows exactly what a sink receives. Read it whenever you wonder what a query sends.'
      }),

      B.cmp({
        id: 'm2-sinks', t: 1, src: 'docs', title: 'Three kinds of sink for a changelog',
        say: 'A query that updates its result needs a sink that can handle updates. Press Next to read the three kinds.',
        cols: ['Kind of sink', 'It accepts', 'It needs', 'Examples'],
        hl: 1,
        rows: [
          ['Append-only', 'Only +I, new rows', 'A query that never retracts', 'A file, a Kafka topic without a key'],
          ['Retract', 'Every kind: +I, -U, +U, -D', 'A reader that applies the retractions', 'The print sink, a DataStream of changes'],
          ['Upsert', '+I and +U as one message, and -D', 'A primary key on the sink', 'A table with a key, a compacted Kafka topic (upsert-kafka)']
        ],
        steps: [
          { upto: 1, say: 'An **append-only** sink only knows how to add. If the query retracts, the planner refuses the job: the query and the sink do not fit.' },
          { upto: 2, say: 'A **retract** sink gets the full changelog, and its reader must apply the retractions.' },
          { upto: 3, say: 'An **upsert** sink needs a **primary key**. It overwrites the row of a key for an update and removes it for a delete, so it needs no -U. This is the usual choice for a result in a database or a compacted topic. Mission 5 writes one into Kafka.' }
        ],
        pick: 'Sinks are described in the Flink documentation as append-only, retract or upsert. The kinds of change that a query sends are in its plan (EXPLAIN CHANGELOG_MODE).'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'A streaming query counts orders for each store. Store s01 gets a second order. What does the query send for s01?',
        opts: [
          { t: '-U with the old count, then +U with the new count', fb: '' },
          { t: 'A second +I for s01', fb: 'An insert is only for a row that did not exist. The row for s01 already exists.' },
          { t: 'Only the new count, as +U, with no -U', fb: 'That is what an upsert sink receives. The full changelog sends the old row too.' },
          { t: 'Nothing: the count is only sent when the input ends', fb: 'A streaming query sends a change for every input row.' }
        ],
        ok: 0,
        why: 'The row was sent before, so the query takes it back (-U) and sends the replacement (+U). In the recording s01 went through five such pairs. A sink with a primary key can drop the -U.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'You apply every change of a streaming query to a table, and the input ends. How does the table compare with the same query in batch mode?',
        opts: [
          { t: 'They are the same table', fb: '' },
          { t: 'The streaming table has more rows, because of the retractions', fb: 'Retractions remove rows. After the last change nothing extra is left.' },
          { t: 'They are the same only for queries without GROUP BY', fb: 'The recording used a GROUP BY and they were the same.' },
          { t: 'They can only be compared in a Kafka sink', fb: 'The comparison does not depend on the sink.' }
        ],
        ok: 0,
        why: 'The changelog describes how the result became its final state, so replaying it gives the batch answer. The recorder checked this for the count per store and for the count of counts.'
      }),

      B.quiz({
        id: 'm2-q3', t: 2,
        q: 'Which query does NOT need a sink that can handle updates?',
        opts: [
          { t: 'SELECT order_id, total_cents FROM orders WHERE total_cents > 500', fb: '' },
          { t: 'SELECT store_id, COUNT(*) FROM orders GROUP BY store_id', fb: 'Each new order for a store updates its row.' },
          { t: 'SELECT n, COUNT(*) FROM (SELECT store_id, COUNT(*) n FROM orders GROUP BY store_id) GROUP BY n', fb: 'It updates, and it deletes.' },
          { t: 'SELECT store_id, MAX(total_cents) FROM orders GROUP BY store_id', fb: 'The maximum of a store changes when a bigger order arrives.' }
        ],
        ok: 0,
        why: 'A filter and a projection only pass rows through, so the plan shows changelogMode [I]. An aggregate over a key without a time bound updates a row for each input.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A colleague sends the count of orders for each store to an append-only sink (a plain file) and the job is refused at start. Click the line that makes the query update its result.',
        file: 'counts.sql', lang: 'sql',
        code: ["CREATE TEMPORARY TABLE counts_file (store_id STRING, n BIGINT) WITH ('connector' = 'filesystem', 'path' = 'file:///out/counts', 'format' = 'csv');", 'INSERT INTO counts_file', 'SELECT store_id, COUNT(*) AS n', 'FROM orders', 'GROUP BY store_id;'].join('\n'),
        bad: [5],
        hint: 'Which clause makes a row change when a new order arrives?',
        why: 'The `GROUP BY` without a time window makes the count of a store change with every order, so the query sends -U and +U. A file can only append. Write to a sink with a primary key (upsert), or group by a time window so that each result is final.',
        fix: ["CREATE TEMPORARY TABLE counts_file (store_id STRING, n BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'store_counts', 'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');", 'INSERT INTO counts_file', 'SELECT store_id, COUNT(*) AS n', 'FROM orders', 'GROUP BY store_id;'].join('\n'),
        cheer: 'An updating query needs an updating sink.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put in order what Flink sends when store s01 had two orders, and a third arrives (count 2, then 3).',
        items: [
          'The query receives the third order for s01',
          'It sends -U with the row (s01, 2, ...) to withdraw the old result',
          'It sends +U with the row (s01, 3, ...) as the new result',
          'A sink with a key now holds one row for s01, with count 3'
        ],
        why: 'The retraction comes first, then the replacement. Applied in that order, the sink never holds two rows for the same store.'
      }),

      B.incident({
        id: 'm2-inc', t: 1, src: 'rec', title: 'Incident: the dashboard shows the counts far too high', time: '14:05',
        alert: '**The dashboard of orders for each store shows numbers several times higher than the real ones.** It reads the topic where a streaming query writes its result, and it adds up every record that it finds. The query counts orders for each store.',
        clues: ['The numbers are roughly the sum of 1, 2, 3, ... for each store', 'The job writes -U and +U changes to the topic', 'The dashboard treats every record as a new count'],
        opts: [
          { t: 'Read the topic as a changelog: keep the last row for each store, or write it with an upsert sink and read it as a table', fb: '' },
          { t: 'Delete the topic every hour', fb: 'It hides the problem and loses the result.' },
          { t: 'Turn off checkpointing', fb: 'Checkpointing has nothing to do with it.' },
          { t: 'Add a second job that divides the counts', fb: 'The counts are not a fixed multiple.' }
        ],
        best: 0,
        why: 'A streaming aggregate sends a new row for a store each time it changes. In the recording s01 appeared five times, with counts 1 to 5, and only the last one is the answer. A reader has to keep the last row for each key, which an upsert-kafka topic and a compacted log are for.',
        checks: [['Look at the records of one key in the topic', 'You will see the counts rising.'], ['Run EXPLAIN CHANGELOG_MODE on the query', 'It shows UB and UA changes.'], ['Check the format of the sink', 'Is it append-only, retract or upsert?']],
        tell: 'The query updates its result, so the topic holds every version. The dashboard has to keep only the last row for each store. I write the result with an upsert sink and read it by key.',
        prevent: ['Name the kind of sink in the design', 'Read EXPLAIN CHANGELOG_MODE in a review', 'Test the dashboard with an updating query']
      }),

      B.qa({
        id: 'qa-changelog', t: 1, tag: 'SQL', secs: 75,
        q: 'What is a changelog in Flink SQL, and why does a streaming query need one?',
        pts: ['A streaming result changes over time', '+I, -U, +U, -D', 'A dynamic table', 'Replaying gives the batch result', 'Sinks may accept only some kinds'],
        short: 'A streaming query never ends, so its result is a **dynamic table** that changes as rows arrive. Flink describes the changes as a **changelog** with four kinds: **+I** insert, **-U** the old version of a row is withdrawn, **+U** the new version, **-D** delete. In my recording a count for each store over twelve orders sent seventeen changes for seven final rows, and replaying them gave exactly the batch answer. A query without an aggregate only inserts. The kinds of change matter because a sink must be able to take them: an append-only sink cannot, a retract sink takes all, and an upsert sink needs a primary key.',
        fu: [['How can I see what a query sends?', 'EXPLAIN CHANGELOG_MODE shows the kinds of change for each operator, and the print sink shows the records.'], ['Why is there a -U and a +U?', 'A retract stream withdraws the old row and sends the new one. An upsert stream sends only the new row, with a key.']],
        trap: 'Saying that a streaming query returns a table. It returns a stream of changes to a table.',
        real: 'A dashboard shows counts that are too high. The query is a group-by count. What do you check?'
      }),

      B.qa({
        id: 'qa-sinks', t: 2, tag: 'SQL', secs: 60,
        q: 'What is the difference between an append-only, a retract and an upsert sink?',
        pts: ['Append-only: only +I', 'Retract: all kinds', 'Upsert: key, +U and -D', 'Upsert needs a primary key', 'Choose by what the query sends'],
        short: 'An **append-only** sink only adds rows, so it fits a query that never updates, like a filter. A **retract** sink receives every kind of change, +I, -U, +U and -D, and the reader applies them. An **upsert** sink receives an insert or update as one message with a **primary key**, and a delete as -D, so it needs no -U: it is the usual choice for a keyed result, in a database or a compacted Kafka topic. In my recording an upsert-kafka topic received 17 records for a query that sent 25 changes, because the 8 retractions are not written.',
        fu: [['Which one would you pick for a Kafka topic with a result per store?', 'upsert-kafka with the store as the key, and a compacted topic.'], ['What if the query has no key?', 'Then it cannot go to an upsert sink: the planner refuses, or you add a key in the query.']],
        trap: 'Using an append-only sink for an aggregate and being surprised that the job is refused, or worse, a retract sink that nobody reads correctly.'
      }),

      B.qa({
        id: 'qa-minibatch', t: 3, tag: 'SQL', secs: 60,
        q: 'The result of your aggregate is very chatty. What can you do?',
        pts: ['Mini-batch', 'Size and latency', 'Fewer changes, a delay', 'Time windows', 'Local-global aggregation'],
        short: 'The cheapest change is **mini-batch**: Flink buffers input for a short time or a number of rows and applies it together, so several orders for one store become one change. In my recording a mini-batch of four orders cut seventeen changes to thirteen with the same final table. The price is **delay**: a result waits for the batch to fill or for its time limit. The other options are a **time window**, where a result is final and sent once, and local-global aggregation, which pre-aggregates before the shuffle when the keys are skewed.',
        fu: [['Which settings?', 'table.exec.mini-batch.enabled, allow-latency and size.'], ['When is a window better?', 'When you want one final result per period, and the late data rule is clear.']],
        trap: 'Turning mini-batch on without thinking of the delay it adds to every result.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Table Streamer', color: '#FBCFE8',
        pts: [
          'A streaming query is a **continuous query** on a **dynamic table**. Its output is a **changelog**: **+I**, **-U**, **+U**, **-D**.',
          'Twelve orders and seven stores made **' + SS.changelog_rows + '** changes. Replayed, they gave exactly the **batch** answer.',
          'A query on a query can **delete**: the count of counts sent ' + TS.ops['-D'] + ' deletes. A query without an aggregate only inserts.',
          '**EXPLAIN CHANGELOG_MODE** shows the kinds of change before you run a job: [I], [I,UA], [I,UA,D].',
          'A sink must fit the query: **append-only**, **retract** or **upsert** (needs a primary key). **Mini-batch** trades delay for fewer changes: ' + MB.changelog_rows_without + ' to ' + MB.changelog_rows_with + '.'
        ]
      })
    ]
  });
})();
