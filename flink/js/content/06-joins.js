/* Mission 6: joins, duplicates and state that grows. Two streams of the same speed are joined with no time bound, with an interval bound, and with a time to live; the size of the state in each
   checkpoint is read from the REST interface. A small file with repeated orders shows what removing duplicates does to a changelog. Real Apache Flink 2.2.1. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SS = G.counts('joins.state_summary'), DS = G.counts('joins.dedup_summary'), ST = G.table('joins.state_size'), DI = G.table('joins.dup_input'), DF = G.table('joins.dedup_first'), DL = G.table('joins.dedup_last');
  var PR = G.text('joins.plan_regular'), PI = G.text('joins.plan_interval');
  var SCR = G.file('sql/joins_regular.sql'), SCI = G.file('sql/joins_interval.sql'), SCD = G.file('sql/joins_dedup_last.sql');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mb = function (b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MiB' : (b / 1024).toFixed(0) + ' KiB'; };
  G.expect(SS.regular_grows_every_checkpoint === true && SS.interval_max < SS.regular_last && SS.ttl_flat_at_the_end === true && SS.ttl_max < SS.regular_last, 'the unbounded join grows at every checkpoint, the bounded ones stop');
  G.expect(/NoUniqueKey/.test(PR) && /IntervalJoin/.test(PI) && /leftLowerBound=-5000/.test(PI), 'the plans of the two joins');
  G.expect(DF.rows.length === DS.distinct_orders && DF.rows.every(function (r) { return r[0] === '+I'; }) && DL.rows.some(function (r) { return r[0] === '-U'; }), 'keep first only inserts, keep last updates');
  var slope = (ST.rows[ST.rows.length - 1][1] - ST.rows[0][1]) / ((ST.rows.length - 1) * 2);
  var plateauAt = function (col) { var m = Math.max.apply(null, ST.rows.map(function (r) { return r[col]; })); for (var i = 0; i < ST.rows.length; i++) if (ST.rows[i][col] >= m * 0.9) return i + 1; return ST.rows.length; };

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Joins, duplicates and state that grows', short: 'Joins', blurb: 'Which joins keep every row for ever, how to bound them, and deduplication', minutes: 30,
    focus: ['sf', 'int'],
    goals: [
      'Name the kinds of join: **regular**, **interval**, **temporal**, **lookup**.',
      'Explain why a join with no time bound keeps state **for ever**.',
      'Bound the state with an **interval join** or a **time to live**, and say what a TTL risks.',
      'Remove **duplicates** with `ROW_NUMBER`, and say how keep-first and keep-last differ in a changelog.',
      'Spot **state growth** in the checkpoint sizes before it becomes an incident.'
    ],
    say: 'Mission 6 is the mission where jobs die slowly. A join, a distinct, a group-by on a key that never repeats: they all keep state, and nothing says when to forget it. I ran the same join three ways, with two streams of 200 rows a second each, and read the size of the state in every checkpoint. Then I removed duplicates two ways and read what each one sends. Press Next.',
    scenes: [
      B.talk({
        id: 'm6-kinds', t: 1, src: 'docs', title: 'Four kinds of join',
        say: 'Four joins, four state stories. Press Next.',
        items: [
          ['Regular join', '`a JOIN b ON a.id = b.id`. Any row on one side can match any row on the other side, at any time. So Flink keeps **both sides in state for ever**. The Flink documentation says that the state might grow infinitely.', 'State without an end.'],
          ['Interval join', 'The same join with a **time bound**: a payment within five seconds of the order. Now a row can only match rows from a short period, so Flink can forget older ones.', 'State bounded by time.'],
          ['Temporal join', 'Join each order with the **version of a table at the time of the order**: the price list, the exchange rate. The table side is kept by version, and old versions are dropped as the watermark moves.', 'The table as it was.'],
          ['Lookup join', 'Join each order with a row that Flink **asks for** in an external database when the order arrives. No state for the other side, but a call for each record: the speed of that database becomes the speed of the job.', 'Ask the database.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'A regular join keeps both inputs in state for ever, so I bound it in time with an interval join or a TTL, or I use a temporal or lookup join when one side is a slowly changing table.' }
      }),

      B.sql({
        id: 'm6-sql', t: 1, src: 'rec', title: 'The join with no time bound', file: 'joins_regular.sql', code: SCR,
        steps: [
          { say: 'The script of the first run. Two generated streams, orders and payments, at 200 rows a second each, with the same order ids. Press Next.', lines: null },
          { say: 'A checkpoint every two seconds, so that the size of the state is reported often.', lines: G.span(SCR, /checkpointing\.interval/) },
          { say: 'The two sources. Each row has a note of 100 characters, so that the state is big enough to measure.', lines: G.span(SCR, /CREATE TEMPORARY TABLE orders/, /CREATE TEMPORARY TABLE payments/) },
          { say: 'The sink discards the result, so that nothing slows the join down.', lines: G.span(SCR, /CREATE TEMPORARY TABLE joined/) },
          { say: 'And the join, with no condition but the key. It runs for as long as I let it. The result here is not the rows, it is the **size of the state** after each checkpoint.', lines: G.span(SCR, /INSERT INTO joined/), run: true }
        ],
        result: { cols: ['Checkpoint', 'State of the join (bytes)'], rows: ST.rows.map(function (r) { return [r[0], n0(r[1])]; }), msg: 'the first nine checkpoints' },
        note: 'Recorded. The size is the state of the join vertex, as the REST interface reports it for each checkpoint. It grew by about ' + mb(slope * 2) + ' every checkpoint, and every checkpoint and every recovery has to carry it.'
      }),

      B.rows({
        id: 'm6-plans', t: 1, src: 'rec', title: 'How the plan shows the difference',
        steps: [
          {
            say: 'You can see it before you run it. `EXPLAIN` on the first query shows a plain **Join**, with `leftInputSpec=[NoUniqueKey]` and the same for the right: Flink knows no key that could make a row unique, so it keeps every row of each side.',
            tabs: [{ layer: 'RECORDED', name: 'The join of the regular query', c: 'raw', cols: ['Operator'], rows: [[PR]], trk: 0 }],
            notes: ['Recorded. The planner chose a plain Join operator.']
          },
          {
            say: 'Add `AND o.ot BETWEEN p.pt - INTERVAL \'5\' SECOND AND p.pt + INTERVAL \'5\' SECOND`. The operator becomes an **IntervalJoin**, with the bounds in milliseconds in the plan. Flink can now drop a row once the time has passed the bound.',
            tabs: [{ layer: 'RECORDED', name: 'The join of the interval query', c: 'raw', cols: ['Operator'], rows: [[PI]], trk: 0 }],
            notes: ['Recorded. This join uses processing time (<code>isRowTime=false</code>), so that the two generated streams could be compared without watermarks. With event time it works the same way.']
          }
        ]
      }),

      B.widget({ id: 'm6-lab', kind: 'statelab', t: 1, src: 'rec', title: 'Lab: the state of three joins' }),

      B.rows({
        id: 'm6-series', t: 1, src: 'rec', title: 'The state of the three joins, checkpoint by checkpoint',
        steps: [
          {
            say: 'The same two streams, the same speed. The first column is the join with **no bound**: its state grows by the same amount at every checkpoint, from ' + mb(SS.regular_first) + ' to ' + mb(SS.regular_last) + '. The **interval** join grows for about ' + plateauAt(2) + ' checkpoints and then stays near ' + mb(SS.interval_max) + '. The one with a **time to live** of ten seconds stops growing near ' + mb(SS.ttl_max) + '.',
            tabs: [{ layer: 'RECORDED', name: 'The size of the state of the join in each checkpoint', c: 'raw', cols: ST.cols, rows: ST.rows.map(function (r) { return [r[0]].concat(r.slice(1).map(n0)); }), trk: ST.rows.length - 1 }],
            notes: ['Recorded. The nine checkpoints cover eighteen seconds. At the speed of the first column the state would be about ' + mb(slope * 3600) + ' after an hour.']
          },
          {
            say: 'What does the time to live cost? `SET \'table.exec.state.ttl\' = \'10 s\'` makes Flink forget a row that has not been used for ten seconds. If a payment arrives eleven seconds after its order, the join finds no order, and the row is **missing**, with no error. The Flink documentation warns that it can affect the correctness of the result.',
            tabs: [{ layer: 'DOCS', name: 'The trade of a time to live', c: 'raw', cols: ['Setting', 'State', 'Risk'], rows: [['No bound', 'grows without end', 'the job slows, then fails or runs out of disk'], ['Interval join', 'bounded by the interval', 'rows farther apart than the interval never match, and that is the definition of the query'], ['Time to live', 'bounded by the ttl', 'a match that arrives after the ttl is missed, whatever the query says']], trk: 2 }],
            notes: ['From the Flink documentation (the page about joins), and from the three recorded runs.']
          }
        ]
      }),

      B.rows({
        id: 'm6-dedup', t: 1, src: 'rec', title: 'Removing duplicates: keep the first, or keep the last',
        steps: [
          {
            say: 'Orders are sometimes sent twice, and sometimes sent again with a correction. This file has eight rows for ' + DS.distinct_orders + ' orders. Order 1 appears three times, order 2 twice, order 3 twice.',
            tabs: [{ layer: 'RECORDED', name: 'The eight rows, in arrival order', c: 'raw', cols: DI.cols, rows: DI.rows, trk: 0 }],
            notes: ['Made up, in a file that Flink reads in order.']
          },
          {
            say: 'Deduplication is a `ROW_NUMBER()` over each key, ordered by a time attribute, and a filter on 1. Ordered **ascending**, it keeps the **first** row of each order. A row for an order that was already seen is ignored. The result is **append-only**: only inserts.',
            tabs: [{ layer: 'RECORDED', name: 'Keep first: ORDER BY time ASC', c: 'raw', cols: DF.cols, rows: DF.rows, trk: 0 }],
            notes: ['Recorded. ' + DF.rows.length + ' rows for ' + DS.distinct_orders + ' orders: nothing is ever taken back.']
          },
          {
            say: 'Ordered **descending**, it keeps the **last** row. Now a later copy of an order replaces the earlier one, so the result must **update**: a -U for the old row and a +U for the new. This is the right choice when the later row is a correction. The price is a changelog, and a sink that can take it.',
            tabs: [{ layer: 'RECORDED', name: 'Keep last: ORDER BY time DESC', c: 'raw', cols: DL.cols, rows: DL.rows, trk: 2, chg: DL.rows.map(function (r, n) { return r[0] !== '+I' ? [n, 0] : null; }).filter(Boolean) }],
            notes: ['Recorded. ' + DL.rows.length + ' changes for ' + DS.distinct_orders + ' orders. Both versions keep one row of state for every order id they have seen.']
          }
        ]
      }),

      B.sql({
        id: 'm6-dedupsql', t: 2, src: 'rec', title: 'The query of keep last', file: 'joins_dedup_last.sql', code: SCD,
        steps: [
          { say: 'The deduplication has three parts. Press Next.', lines: null },
          { say: 'The source has a processing-time column `pt`. The ordering of a deduplication must be a **time attribute**: the arrival order, or an event time.', lines: G.span(SCD, /CREATE TEMPORARY TABLE orders/, /pt AS PROCTIME/) },
          { say: '`ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt DESC)` numbers the rows of each order, newest first.', lines: G.span(SCD, /ROW_NUMBER/) },
          { say: 'And `WHERE rn = 1` keeps the first number: the newest row. Flink recognizes this exact shape and runs a deduplication operator with one row of state for each key.', lines: G.span(SCD, /WHERE rn = 1/), run: true }
        ],
        result: { cols: DL.cols, rows: DL.rows, msg: DL.rows.length + ' changes' },
        note: 'Recorded. The shape matters: a different filter, such as rn = 2, would run as a general Top-N and keep more rows.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'You join two Kafka topics on order_id with a plain JOIN. Why is it a risk in production?',
        opts: [
          { t: 'Both inputs are kept in state for ever, so the state grows without end', fb: '' },
          { t: 'A plain join can only run in batch mode', fb: 'It runs in streaming too, and that is the problem.' },
          { t: 'It sends no -U or -D, so the result is wrong', fb: 'The state is the issue, not the changelog.' },
          { t: 'It needs a primary key on both sides', fb: 'No key is needed for a regular join.' }
        ],
        ok: 0,
        why: 'A row of either side may match a row that arrives later, so nothing can be forgotten. In the recording the state grew at every checkpoint, from ' + mb(SS.regular_first) + ' to ' + mb(SS.regular_last) + ' in eighteen seconds.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You set table.exec.state.ttl to 10 s on a join. Which is the cost?',
        opts: [
          { t: 'A match that arrives more than 10 s after the first row can be missed, with no error', fb: '' },
          { t: 'The job restarts every 10 seconds', fb: 'The job keeps running.' },
          { t: 'Checkpoints stop working', fb: 'Checkpoints are not affected.' },
          { t: 'The watermark moves backwards', fb: 'The TTL has nothing to do with watermarks.' }
        ],
        ok: 0,
        why: 'The state of an idle key is dropped after the ttl. If its match arrives later, the join sees an empty side. The state stops growing (flat near ' + mb(SS.ttl_max) + ' in the recording), and the correctness is now yours to check.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'You keep the LAST row of each order with ROW_NUMBER ... ORDER BY time DESC. What does the result need from its sink?',
        opts: [
          { t: 'It must take updates: a retract or an upsert sink', fb: '' },
          { t: 'Nothing special: it only inserts', fb: 'That is keep-first. Keep-last replaces rows.' },
          { t: 'A sink with a time window', fb: 'There is no window in the query.' },
          { t: 'A bounded sink', fb: 'The stream has no end.' }
        ],
        ok: 0,
        why: 'A later copy of an order replaces the earlier one, so the query sends -U and +U. The recording had ' + DL.rows.filter(function (r) { return r[0] === '-U'; }).length + ' retractions for ' + DS.distinct_orders + ' orders. Keep-first only sends inserts.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'This job joins orders and payments, and after two weeks its checkpoints take twenty minutes. The query is right. Click the line that lets the state grow without end.',
        file: 'join.sql', lang: 'sql',
        code: ['INSERT INTO paid_orders', 'SELECT o.order_id, o.total_cents, p.method', 'FROM orders o', 'JOIN payments p', 'ON o.order_id = p.order_id;'].join('\n'),
        bad: [5],
        hint: 'What limits how far apart in time the two rows may be?',
        why: 'The join condition is only the key. Nothing bounds the time between an order and its payment, so Flink must keep every order and every payment. Add a time bound with an interval join, or set a time to live if the business allows it.',
        fix: ['INSERT INTO paid_orders', 'SELECT o.order_id, o.total_cents, p.method', 'FROM orders o', 'JOIN payments p', "ON o.order_id = p.order_id AND p.ts BETWEEN o.ts AND o.ts + INTERVAL '1' HOUR;"].join('\n'),
        cheer: 'Bound the join in time.'
      }),

      B.order({
        id: 'm6-ord', t: 2, q: 'Put in order what happens to the state of a regular join with a time to live of 10 seconds.',
        items: [
          'An order arrives and is stored in the state of the left side',
          'No payment comes, and ten seconds pass without the row being used',
          'Flink removes the row from the state',
          'A payment for that order arrives, and finds nothing to match'
        ],
        why: 'The state is cleaned by time since the last access, not by what the query means. The payment arrived too late, so the result misses the pair. Nothing says so.'
      }),

      B.incident({
        id: 'm6-inc', t: 1, src: 'rec', title: 'Incident: checkpoints are slower every day, and the job has restarted twice with out of memory', time: '16:20',
        alert: '**The job that joins orders with payments has run for three weeks. Its checkpoints take longer every day and now time out at ten minutes. Two TaskManagers were killed for running out of memory.** The query has not changed. Backpressure shows on the source.',
        clues: ['The state of the join vertex grows with every checkpoint', 'The join has no time condition', 'The key space is every order id of the company'],
        opts: [
          { t: 'Bound the join: an interval join if payments follow orders within a known time, or a state TTL, then restart from a savepoint or from scratch', fb: '' },
          { t: 'Double the memory of the TaskManagers', fb: 'The state grows without end. More memory only delays the next failure.' },
          { t: 'Raise the checkpoint timeout', fb: 'It hides the symptom. The state is still growing.' },
          { t: 'Add more parallelism', fb: 'Each task still keeps its rows for ever.' }
        ],
        best: 0,
        why: 'A join with no time bound keeps both inputs in state for ever. The recorded state grew by about ' + mb(slope * 2) + ' per checkpoint at 200 rows a second on each side, so three weeks is a lot. Only a bound in time stops the growth.',
        checks: [['Look at the state size per checkpoint over days', 'It rises steadily.'], ['Read the plan of the join', 'A plain Join with NoUniqueKey.'], ['Ask the business how long a payment can follow an order', 'That is the bound.']],
        tell: 'The join has no time bound, so its state grows every day. I bound it with an interval join or a TTL that the business accepts, and I alert on the checkpoint size growth.',
        prevent: ['Review every join for a time bound', 'Alert on the growth of the state as well as its size', 'Test with a day of production data before launch']
      }),

      B.qa({
        id: 'qa-joins', t: 1, tag: 'Joins', secs: 75,
        q: 'Which kinds of join does Flink SQL have, and which one is dangerous?',
        pts: ['Regular: state for ever', 'Interval: bounded by time', 'Temporal: versioned table', 'Lookup: ask a database', 'Bound the state: interval join or TTL'],
        short: 'A **regular join** matches any row of one side with any row of the other, so Flink keeps both sides in state **for ever**: that is the dangerous one. An **interval join** adds a time condition, so state is dropped when the time passes the bound. A **temporal join** looks up the version of a table at the time of the order, for prices or rates. A **lookup join** asks an external database for each record, which keeps no state but ties the speed of the job to the database. In my recording the same join kept growing at every checkpoint with no bound, from ' + mb(SS.regular_first) + ' to ' + mb(SS.regular_last) + ', and stayed near ' + mb(SS.interval_max) + ' as an interval join.',
        fu: [['What does a TTL do?', 'It forgets a row that is not used for a given time. The state is bounded; matches after that time are missed.'], ['How do you see it in the plan?', 'Join with NoUniqueKey for a regular join, IntervalJoin for a bounded one.']],
        trap: 'Believing that a join is bounded because the topic has a retention. Flink state does not follow the topic.',
        real: 'We join orders and payments and the state grows every day. What do you ask the business?'
      }),

      B.qa({
        id: 'qa-dedup', t: 1, tag: 'Joins', secs: 60,
        q: 'How do you remove duplicates in Flink SQL, and what does it cost?',
        pts: ['ROW_NUMBER over the key, ordered by a time attribute', 'rn = 1', 'Keep first: only inserts', 'Keep last: updates', 'One row of state per key'],
        short: 'With `ROW_NUMBER() OVER (PARTITION BY key ORDER BY time_attribute)` and a filter on `rn = 1`; Flink recognizes it and runs a deduplication operator. Ordered ascending it **keeps the first** row, and the result is append-only. Ordered descending it **keeps the last** row, and the result updates: in my recording the same eight rows for four orders gave ' + DF.rows.length + ' inserts with keep-first and ' + DL.rows.length + ' changes with keep-last. Both keep **one row of state for each key** they have seen, so a key that never repeats makes the state grow unless a TTL is set.',
        fu: [['Is the order by a normal column?', 'No, it must be a time attribute, processing time or event time.'], ['What if duplicates can arrive much later?', 'Then the state must be kept long enough, and a TTL is a decision about how late a duplicate can be.']],
        trap: 'Using SELECT DISTINCT on a high-cardinality key with no TTL and forgetting that it keeps every key.'
      }),

      B.qa({
        id: 'qa-growth', t: 2, tag: 'Joins', secs: 60,
        q: 'How do you find and stop state growth in a Flink job?',
        pts: ['Checkpoint size over time', 'State size per vertex', 'The plan: NoUniqueKey, unbounded group-by', 'Bound by time or TTL', 'Alert on growth'],
        short: 'I watch the **size of the state per vertex** in the checkpoint details of the REST interface and the web UI, over days: a straight upward line is the sign. Then I read the plan for the operators that keep everything: a join with `NoUniqueKey`, a GROUP BY or DISTINCT on a key that never repeats, a deduplication. The cure is a bound: an interval join, a window, or `table.exec.state.ttl`, which costs correctness for late matches. In my recording a join with no bound grew by about ' + mb(slope * 2) + ' every two seconds at 200 rows a second on each side, and the TTL and interval variants went flat.',
        fu: [['Why do checkpoints slow down?', 'More state to write and, for the heap backend, more to serialize. RocksDB incremental checkpoints help, but the state is still there.'], ['How do you roll out a TTL?', 'Restart from a savepoint with the setting, and check the result against the batch table.']],
        trap: 'Adding memory or raising the checkpoint timeout instead of bounding the state.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Join Planner', color: '#EAF2FF',
        pts: [
          'A **regular join** keeps both sides in state **for ever**. In the recording its state grew at every checkpoint, from ' + mb(SS.regular_first) + ' to ' + mb(SS.regular_last) + '.',
          'An **interval join** and a **time to live** stop the growth: near ' + mb(SS.interval_max) + ' and ' + mb(SS.ttl_max) + '. The TTL can miss a late match without an error.',
          'The plan shows it: **Join with NoUniqueKey** against **IntervalJoin**. A temporal join keeps versions, a lookup join keeps nothing and calls a database.',
          '**Keep first** only inserts (' + DF.rows.length + ' rows). **Keep last** updates (' + DL.rows.length + ' changes for ' + DS.distinct_orders + ' orders), so its sink must take updates.',
          'Watch the **state size per checkpoint** over days. A straight rising line is an incident that has not happened yet.'
        ]
      })
    ]
  });
})();
