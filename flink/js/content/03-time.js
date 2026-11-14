/* Mission 3: time, watermarks and windows. Fourteen made-up orders in the order in which they arrive, some of them late, go through tumbling, hopping, cumulating and session windows, with a
   watermark that waits for 0, 10, 30, 75 and 200 seconds. Real Apache Flink 2.2.1 and its SQL client; a Kafka topic with an empty partition shows a window that never fires. */
(function () {
  var B = LAB.b, G = LAB.get;
  var EV = G.table('time.events'), DS = G.table('time.delay_summary'), DF = G.counts('time.delay_facts'), WM = G.counts('time.window_models'), IT = G.counts('time.idle_topic'), IS = G.counts('time.idle_summary');
  var T0 = G.table('time.tumble_0'), T10 = G.table('time.tumble_10'), T200 = G.table('time.tumble_200'), HOP = G.table('time.hop'), CUM = G.table('time.cumulate'), SES = G.table('time.session');
  var IW = G.text('time.idle_without'), II = G.text('time.idle_with');
  var SCR = G.file('sql/time_tumble_10.sql'), SCRI = G.file('sql/time_idle_without.sql'), SCRH = G.file('sql/time_hop.sql'), SCRS = G.file('sql/time_session.sql');
  var dsRow = function (d) { var r = DS.rows.filter(function (x) { return x[0] === d; })[0]; G.expect(!!r, 'delay summary row for ' + d); return r; };
  G.expect(DF.model_equals_flink === true && DF.events === 14 && DF.window_seconds === 60, 'the model of the rules equals what Flink printed for every delay');
  G.expect(dsRow(0)[3] === 4 && dsRow(10)[3] === 3 && dsRow(30)[3] === 3 && dsRow(75)[3] === 1 && dsRow(200)[3] === 0, 'dropped orders for the five delays');
  G.expect(WM.hop_equals_model === true && WM.cumulate_equals_model === true && HOP.rows.length === 10 && CUM.rows.length === 15, 'hopping and cumulating windows equal the rule');
  G.expect(IT.records_in_partition_1 === 0 && IS.windows_without_idle_timeout === 0 && IS.windows_with_idle_timeout >= 3, 'an empty partition holds the windows back until the source is told it is idle');
  var lateRow = EV.rows.filter(function (r) { return r[5] > 60; });
  G.expect(lateRow.length === 3, 'three orders more than a minute behind');
  var sess = function (st) { return SES.rows.filter(function (r) { return r[1] === st; }); };
  G.expect(SES.rows.length === 6 && sess('s01').length === 3 && sess('s02').length === 3, 'three sessions for each store');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Time, watermarks and windows', short: 'Time', blurb: 'Event time, the watermark, late orders, four kinds of window, and a window that never fires', minutes: 45,
    focus: ['ing', 'stg'],
    goals: [
      'Tell **event time** from **processing time**, and say why a job uses event time.',
      'Explain a **watermark** and how its **delay** decides which orders are **late**.',
      'Write a **tumbling window** query, and know the **hopping**, **cumulating** and **session** windows.',
      'Say what Flink does with a late order in SQL, and what the DataStream API offers.',
      'Debug a window that **never fires** because of an **idle source**.'
    ],
    say: 'Mission 3 is time. Orders do not arrive in the order in which they happened: a till loses its connection, a phone is offline, a message waits in a queue. Flink handles this with event time and watermarks. I made a small file of fourteen orders, in arrival order, with some that came late, and ran the real SQL client over it with five different watermarks. The windows it printed are what you will see. Press Next.',
    scenes: [
      B.talk({
        id: 'm3-time', t: 1, src: 'docs', title: 'Three kinds of time',
        say: 'Time is the hard part of streaming. Press Next for each idea.',
        items: [
          ['Processing time', 'The time on the clock of the machine that runs the job. It is easy and fast, and the answer depends on how quick the machine was. Run the job twice on the same data and the windows differ.', 'The clock of the cluster.'],
          ['Event time', 'The time at which the order **happened**, written in the order itself. A window of event time holds the orders of that minute, whenever they arrive, and a rerun gives the same windows.', 'The time in the data.'],
          ['The problem', 'With event time you never know whether the orders of a minute have all arrived. An order can come three minutes late. The job has to decide when to stop waiting.', 'Late and out of order.'],
          ['The watermark', 'A **watermark** is a promise that travels with the stream: no more orders older than this time are expected. Flink makes it from the largest time seen, **minus a delay** that you choose. When the watermark passes the end of a window, the window is complete and sends its result.', 'A promise about time.'],
          ['Late orders', 'An order whose window has already been sent is **late**. The delay is the knob: a long one drops fewer orders and makes every result wait. A short one answers sooner and drops more.', 'The delay is a trade.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Event time uses the time in the data. A watermark, the largest time seen minus a delay, tells the job when a window is complete, and an order that arrives after that is late.' }
      }),

      B.rows({
        id: 'm3-events', t: 1, src: 'rec', title: 'Fourteen orders, in the order they arrive',
        steps: [
          {
            say: 'This is the file. The first column is the order in which the orders **arrive**. The fifth is when each **happened**. Look at arrival 5: it happened at 00:00:50, but order 4, at 00:01:05, arrived before it. The last column says how far behind the largest time seen so far each order is.',
            tabs: [{ layer: 'RECORDED', name: 'The made-up orders, in arrival order', c: 'raw', cols: EV.cols, rows: EV.rows, trk: 4 }],
            notes: ['Made up from a fixed list, in a file that Flink reads in order. Five windows of one minute are touched, from 00:00 to 00:05.']
          },
          {
            say: 'Three orders are far behind. Order 8 arrives at the position after a 00:02:05 order but happened at 00:00:55. Order 11 is 72 seconds behind, and order 14 is **' + lateRow[2][5] + ' seconds** behind. Whether they are counted depends only on the delay of the watermark.',
            tabs: [{ layer: 'FACTS', name: 'The orders that are more than a minute behind', c: 'raw', cols: ['Arrives as', 'Order', 'Happened at', 'Seconds behind'], rows: lateRow.map(function (r) { return [r[0], r[1], r[4], r[5]]; }), trk: 0 }],
            notes: ['Recorded in the file. In a real system the reason would be a till that was offline, a retry, or a slow partition.']
          }
        ]
      }),

      B.flow({
        id: 'm3-flow', t: 1, src: 'docs', title: 'A watermark closes a window', g: 'watermark', legend: true,
        steps: [
          { say: 'How a window decides that it is complete. Press Next.', cap: 'Orders, a watermark, a window.' },
          { say: 'Step 1. Orders arrive out of order. Each carries the time at which it happened.', on: ['k1'], focus: ['w_ev', 'w_wm'], cap: 'Orders with their own times.' },
          { say: 'Step 2. The source keeps the largest time it has seen and subtracts the **delay**. That is the **watermark**.', on: ['k2'], focus: ['w_wm', 'w_win'], cap: 'The watermark moves forward.' },
          { say: 'Step 3. A window of one minute stays open and collects its orders. When the watermark passes the **end** of the window, it is closed, and one row is sent on.', on: ['k3'], focus: ['w_win', 'w_out'], cap: 'The watermark closes the window.' },
          { say: 'Step 4. An order arrives for a window that is already closed.', on: ['k4'], focus: ['w_ev', 'w_late'], cap: 'A late order.' },
          { say: 'Step 5. A SQL window drops it. The DataStream API can allow some lateness and can send late orders to a **side output**, to be counted or stored.', on: ['k5'], focus: ['w_late', 'w_drop'], cap: 'Dropped, or a side output.', tags: ['tg_delay'] }
        ]
      }),

      B.sql({
        id: 'm3-sql', t: 1, src: 'rec', title: 'A tumbling window in SQL', file: 'time_tumble_10.sql', code: SCR,
        steps: [
          { say: 'The script that I gave to the real SQL client, with a watermark that waits ten seconds. Press Next.', lines: null },
          { say: 'Here the table says which column is the **event time**, `ts`, and how the **watermark** is made: the time of the order minus ten seconds. This one line is the whole definition of lateness.', lines: G.span(SCR, /WATERMARK FOR/) },
          { say: 'The source is the file of fourteen orders. The parallelism is one, so the order of arrival is the order of the file.', lines: G.span(SCR, /WITH \('connector'/) },
          { say: 'The query uses a **window table function**: `TUMBLE` cuts the table into pieces of one minute by the event time. Then a plain GROUP BY on the window columns counts the orders of each piece.', lines: G.span(SCR, /FROM TABLE\(TUMBLE/, /GROUP BY window_start/), run: true }
        ],
        result: { cols: T10.cols, rows: T10.rows, msg: T10.rows.length + ' windows' },
        note: 'Recorded. With a delay of 10 seconds the first window holds 4 of its 5 orders, and 3 orders were dropped as late in all.'
      }),

      B.widget({ id: 'm3-lab', kind: 'watermarklab', t: 1, src: 'rec', title: 'Lab: choose the watermark delay' }),

      B.rows({
        id: 'm3-delays', t: 1, src: 'rec', title: 'Five delays, five results',
        steps: [
          {
            say: 'I ran the same file with watermarks that wait for 0, 10, 30, 75 and 200 seconds. With **no wait**, **' + dsRow(0)[3] + '** orders are dropped and the first window has only ' + dsRow(0)[1].split(',')[0] + '. With **200 seconds**, **none** is dropped, and the first window has all five. In between, the numbers move in steps.',
            tabs: [{ layer: 'RECORDED', name: 'What the SQL client printed for each delay', c: 'raw', cols: DS.cols, rows: DS.rows, trk: 0 }],
            notes: ['Recorded. The second column lists the orders in the five windows, in time order. Each row is one run of the same query.']
          },
          {
            say: 'Compare the first window under the two ends of the table. Same query, same orders. Only the delay changed.',
            tabs: [{ layer: 'RECORDED', name: 'Delay 0 s, 1 window shown', c: 'raw', cols: T0.cols, rows: T0.rows.slice(0, 3), trk: 0 }, { layer: 'RECORDED', name: 'Delay 10 s, 1 window shown', c: 'raw', cols: T10.cols, rows: T10.rows.slice(0, 3), trk: 0 },
              { layer: 'RECORDED', name: 'Delay 200 s, 1 window shown', c: 'raw', cols: T200.cols, rows: T200.rows.slice(0, 3), trk: 0 }],
            notes: ['Recorded. The first window grows from ' + T0.rows[0][3] + ' orders to ' + T10.rows[0][3] + ' and to ' + T200.rows[0][3] + '.']
          },
          {
            say: 'I also wrote the rule down as a small program, a few lines: an order is late if the watermark before it has already passed the end of its window. It gave **exactly** the same counts and the same dropped orders as Flink, for all five delays.',
            tabs: [{ layer: 'CHECKED', name: 'The rule against Flink', c: 'raw', cols: ['Check', 'Result'], rows: [['Runs compared', DF.delays.length], ['Windows and counts equal for every run', DF.model_equals_flink ? 'yes' : 'no'], ['Orders dropped, by delay (s)', DF.delays.map(function (d) { return d + ': ' + DF.dropped[d]; }).join(', ')]], trk: 1 }],
            notes: ['Computed: the program is in the recorder. It stopped the recording if the two differed.']
          }
        ]
      }),

      B.widget({ id: 'm3-win', kind: 'windowlab', t: 1, src: 'rec', title: 'Lab: the kinds of window' }),

      B.rows({
        id: 'm3-kinds', t: 2, src: 'rec', title: 'Hopping, cumulating and session windows, as Flink printed them',
        steps: [
          {
            say: 'A **hopping** window of one minute that moves every 30 seconds. The windows overlap, so every order is in two of them. There are ' + HOP.rows.length + ' windows, and the first starts before the first order.',
            tabs: [{ layer: 'RECORDED', name: 'HOP: size 1 minute, slide 30 seconds', c: 'raw', cols: HOP.cols, rows: HOP.rows, trk: 1 }],
            notes: ['Recorded, with a watermark long enough that no order is late. The tumbling windows of the same orders held 5, 4, 2, 2 and 1.']
          },
          {
            say: 'A **cumulating** window grows inside each minute, with a result every 20 seconds. It is a running count for a period: 20 seconds, 40, then the whole minute.',
            tabs: [{ layer: 'RECORDED', name: 'CUMULATE: step 20 seconds, up to 1 minute', c: 'raw', cols: CUM.cols, rows: CUM.rows, trk: 2 }],
            notes: ['Recorded. ' + CUM.rows.length + ' windows. The last one of each minute equals the tumbling window of that minute.']
          },
          {
            say: 'A **session** window has no fixed size. It is open while orders of the same store keep coming, and closes after a quiet gap of 30 seconds. Store s01 has three sessions, store s02 has three.',
            tabs: [{ layer: 'RECORDED', name: 'SESSION: gap of 30 seconds, for each store', c: 'raw', cols: SES.cols, rows: SES.rows, trk: 1 }],
            notes: ['Recorded. A session ends 30 seconds after its last order, so the first session of s01, with orders at 5 and 20 seconds, ends at 50 seconds.']
          }
        ]
      }),

      B.code({
        id: 'm3-kindsql', t: 2, src: 'rec', title: 'The same orders in a session window', file: 'time_session.sql', lang: 'sql', code: SCRS,
        steps: [
          { say: 'The four window functions have the same shape: the table, the time column, and the sizes. A session window also needs the key to group by. Press Next.', lines: null },
          { say: 'The `SESSION` function takes the table **partitioned by** the store, the event time column, and the gap.', lines: G.span(SCRS, /FROM TABLE\(SESSION/) },
          { say: 'The result has the columns of the window, so a normal GROUP BY on them gives one row for each session of a store.', lines: G.span(SCRS, /GROUP BY store_id/) }
        ],
        note: 'Recorded. HOP takes two intervals (slide, then size), and CUMULATE takes the step and the maximum size.'
      }),

      B.rows({
        id: 'm3-idle', t: 1, src: 'rec', title: 'A window that never fires',
        steps: [
          {
            say: 'Now a Kafka topic with **two partitions**, and all ' + IT.records + ' orders in the first one. The second is empty. The query is the same tumbling window with a delay of ten seconds. I let the job run for ' + IS.seconds_waited + ' seconds. The result: ' + (IW.indexOf('nothing') >= 0 ? '**nothing** was printed.' : IW),
            tabs: [{ layer: 'RECORDED', name: 'What the sink printed, no idle timeout', c: 'raw', cols: ['Output'], rows: [[IW]], trk: 0 }],
            notes: ['Recorded. The orders were all read. The job is healthy. There is just no window result.']
          },
          {
            say: 'The cause: the watermark of a source with several partitions is the **minimum** of the watermarks of its partitions. The empty partition never sends a record, so it never sends a watermark, so the minimum never moves. Tell the source to treat a quiet partition as **idle**, here after 3 seconds, and the windows appear.',
            tabs: [{ layer: 'RECORDED', name: 'With table.exec.source.idle-timeout = 3 s', c: 'raw', cols: ['Output'], rows: II.split('\n').map(function (l) { return [l]; }), trk: 0 }],
            notes: ['Recorded. ' + IS.windows_with_idle_timeout + ' windows closed. The last window, from 00:04 to 00:05, stays open: no later order moves the watermark past its end.']
          },
          {
            say: 'One more thing in this recording. The counts are 5, 4, 2 and 2, not 4, 2, 2, 2 as in the file run with the same delay. A Kafka source makes watermarks on a **timer** (every 200 milliseconds by default), and the whole burst of fourteen orders was read before the first one. So here no order was late. With a file, the watermark follows the data, and the result does not depend on speed.',
            tabs: [{ layer: 'RECORDED', name: 'Same delay, a file against a Kafka topic', c: 'raw', cols: ['Source', 'Orders in the first window', 'Orders dropped as late'], rows: [['File (the watermark follows the data)', T10.rows[0][3], dsRow(10)[3]], ['Kafka, read in one burst', II.split('\n')[0].split(', ').pop().replace(']', ''), 0]], trk: 1 }],
            notes: ['Recorded. The Kafka numbers can differ from run to run, because they depend on timing. The default interval comes from the documentation: <code>pipeline.auto-watermark-interval</code> is 200 ms.']
          }
        ]
      }),

      B.code({
        id: 'm3-idlesql', t: 2, src: 'rec', title: 'The query of the idle partition', file: 'time_idle_without.sql', lang: 'sql', code: SCRI,
        steps: [
          { say: 'The script of the run that printed nothing. Press Next.', lines: null },
          { say: 'The Kafka table with its watermark. The topic has two partitions.', lines: G.span(SCRI, /CREATE TEMPORARY TABLE events/, /json\.timestamp/) },
          { say: 'The fix is one line before it: `SET \'table.exec.source.idle-timeout\' = \'3 s\'`. You can also set it for one table with `scan.watermark.idle-timeout`. Without either, a quiet partition holds every window back.', lines: G.span(SCRI, /CREATE TEMPORARY TABLE shown/) }
        ],
        note: 'Recorded. This is the script of the first run. The second run had the extra SET line at the top.'
      }),

      B.talk({
        id: 'm3-late', t: 2, src: 'docs', title: 'What can you do with late orders?',
        say: 'You have four options. Press Next for each.',
        items: [
          ['Wait longer', 'A longer watermark delay lets late orders in, and every result waits as long. In the recording, 75 seconds saved all but one order.', 'The delay is the first knob.'],
          ['Drop them', 'A SQL window aggregate does not include an order whose window was already sent. In the recording they were simply missing from the counts.', 'The default in SQL windows.'],
          ['Allow lateness (DataStream)', 'The DataStream API can keep a window around after it fired, for an **allowed lateness**, and fire it again for each late order. The result is then updated, so the sink must take updates.', 'A window that fires twice.'],
          ['A side output (DataStream)', 'Late orders can be sent to a **side output** instead, and counted, stored or corrected later. Many teams count them as a quality metric.', 'Do not lose them silently.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Choose the watermark delay for the latency you can accept, and decide on purpose what happens to what is still late: drop and count it, allow lateness, or send it to a side output.' }
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'The watermark is the largest time seen minus 10 seconds. The largest time seen is 00:01:10. What is the watermark?',
        opts: [
          { t: '00:01:00', fb: '' },
          { t: '00:01:10', fb: 'That would be a delay of zero.' },
          { t: '00:01:20', fb: 'A watermark is behind the largest time, never ahead of it.' },
          { t: '00:00:10', fb: 'Subtract 10 seconds, not 10 minutes.' }
        ],
        ok: 0,
        why: 'The watermark is the largest time seen minus the delay: 00:01:10 minus 10 seconds is 00:01:00. A window that ends at 00:01:00 is complete from then on.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'In the recording, the watermark delay went from 10 seconds to 30 seconds. Which result changed?',
        opts: [
          { t: 'None of the counts: the late orders were later than 30 seconds', fb: '' },
          { t: 'Fewer orders were dropped', fb: 'Both delays dropped the same three orders.' },
          { t: 'More orders were dropped', fb: 'A longer delay can only drop fewer.' },
          { t: 'The windows moved by 20 seconds', fb: 'Windows are fixed by the event time, not by the delay.' }
        ],
        ok: 0,
        why: 'Orders 8, 11 and 14 were behind by 70, 72 and 189 seconds. A delay of 30 seconds is still too short for all three. 75 seconds saved two of them, and 200 saved all.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'A job reads a Kafka topic with six partitions, but only two of them get orders. Windows never close. What do you set?',
        opts: [
          { t: 'An idle timeout for the source, so that quiet partitions are ignored', fb: '' },
          { t: 'A shorter checkpoint interval', fb: 'Checkpoints do not move watermarks.' },
          { t: 'A bigger parallelism', fb: 'More tasks do not make quiet partitions send watermarks.' },
          { t: 'Processing time instead of event time, always', fb: 'It would work, but it gives up the replayable windows. Fix the cause.' }
        ],
        ok: 0,
        why: 'The watermark of the source is the minimum over its partitions, and a partition that never sends a record never sends a watermark. table.exec.source.idle-timeout marks it idle, as the recording showed.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This table should use the time at which the order happened, with a watermark that waits 10 seconds. The windows are all wrong, because no watermark is defined. Click the line that is missing the watermark.',
        file: 'orders.sql', lang: 'sql',
        code: ['CREATE TABLE orders (', '  order_id INT,', '  total_cents INT,', '  ts TIMESTAMP(3)', ") WITH ('connector' = 'kafka', 'topic' = 'orders', 'format' = 'json');"].join('\n'),
        bad: [4],
        hint: 'Where does the table say which column is the event time?',
        why: 'The `ts` column is only a column. A table needs a `WATERMARK FOR ts AS ts - INTERVAL \'10\' SECOND` clause to make `ts` an event-time attribute. Without it a window function on `ts` is rejected, or runs on processing time.',
        fix: ['CREATE TABLE orders (', '  order_id INT,', '  total_cents INT,', '  ts TIMESTAMP(3),', "  WATERMARK FOR ts AS ts - INTERVAL '10' SECOND", ") WITH ('connector' = 'kafka', 'topic' = 'orders', 'format' = 'json');"].join('\n'),
        cheer: 'No watermark, no event time.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put in order what happens to an order that happened at 00:00:55 and arrives after an order from 00:02:05 (delay 30 seconds).',
        items: [
          'The order from 00:02:05 arrives and moves the watermark to 00:01:35',
          'The watermark has passed 00:01:00, the end of the first window, so that window is complete and sends its row',
          'The order from 00:00:55 arrives, for the window that has already been sent',
          'The window aggregate drops it, because its window is closed'
        ],
        why: 'The late order is judged against the watermark at the moment it arrives. The watermark was already past the end of its window, so it is late. In the recording, order 8 was dropped for exactly this reason with delays of 0, 10 and 30 seconds.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: how long should the watermark wait',
        scenario: 'The dashboard of orders for each minute must be right enough for finance, and fresh enough for the shop managers. Most orders arrive within 5 seconds. Tills that lose connection send their orders up to 2 minutes later, about one order in a thousand. You choose the delay.',
        opts: [
          { t: '5 seconds, and send the late orders to a side output to correct the totals later', d: 'Results arrive quickly. The late orders are kept.', lose: '' },
          { t: '2 minutes, so that nothing is ever late', d: 'Every number is complete.', lose: 'Every minute of the dashboard is two minutes old, to catch one order in a thousand.' },
          { t: '0 seconds, because most orders are on time', d: 'The freshest results.', lose: 'Every small reordering drops orders. One order in many would be missing.' }
        ],
        pick: 0,
        why: 'A short delay with a side output for the rare late order serves both: fresh numbers for managers, and a way to correct the totals for finance. A long delay delays everything for the sake of the few.',
        when: 'If finance needs the numbers only once a day, a long delay costs nothing. Ask who reads the result and how soon.'
      }),

      B.incident({
        id: 'm3-inc', t: 1, src: 'rec', title: 'Incident: no window result has appeared for two hours', time: '10:15',
        alert: '**The job that counts orders by minute is RUNNING and its checkpoints succeed, but its sink has received no row since the morning.** Kafka lag is zero. The source topic has twelve partitions, and since the new shop opened only three of them get orders.',
        clues: ['The watermark of the window operator is not moving', 'Nine of the twelve partitions are empty', 'The job reads all the orders'],
        opts: [
          { t: 'Set an idle timeout on the source, so that empty partitions stop holding the watermark back', fb: '' },
          { t: 'Restart the job from the earliest offset', fb: 'The orders were read. A restart would not make the empty partitions send watermarks.' },
          { t: 'Increase the heap of the TaskManagers', fb: 'The job is not short of memory.' },
          { t: 'Add allowed lateness to the window', fb: 'Lateness is for late data. Here the windows never close in the first place.' }
        ],
        best: 0,
        why: 'The watermark is the minimum over the partitions. Nine partitions never send a record, so the minimum stays at its start and no window is ever complete. In the recording, with one empty partition out of two, the job printed nothing for 18 seconds, and four windows as soon as the idle timeout was set.',
        checks: [['Look at the watermark of the window operator in the web UI', 'It does not move.'], ['Count the partitions that receive records', 'Some are empty.'], ['Look for the idle timeout setting', 'table.exec.source.idle-timeout or scan.watermark.idle-timeout.']],
        tell: 'The watermark is the minimum of all partitions, and the empty ones never advance it. I set an idle timeout on the source so that quiet partitions are ignored, and I watch the watermark in the web UI.',
        prevent: ['Set an idle timeout on every event-time source from the start', 'Alert when the watermark of a window operator stops moving', 'Test with a topic that has an empty partition']
      }),

      B.qa({
        id: 'qa-wm', t: 1, tag: 'Time', secs: 75,
        q: 'What is a watermark and how do you choose its delay?',
        pts: ['A promise about event time', 'Largest time seen minus a delay', 'Closes windows when it passes their end', 'A delay trades latency for completeness', 'Late orders are dropped or handled on purpose'],
        short: 'A **watermark** is a marker in the stream that says no more events older than this time are expected. Flink makes it from the **largest event time seen minus a delay**. A window is complete when the watermark passes its end, and then it sends its result. The delay is a trade: in my recording a delay of 0 seconds dropped 4 of 14 orders, 10 and 30 seconds dropped 3, 75 seconds dropped 1, and 200 seconds dropped none, but every result was later. I choose it from how late the data really is, usually from a high percentile of the lateness, and I handle what is still late on purpose with a side output.',
        fu: [['What happens to a late order in SQL?', 'A window aggregate leaves it out. In the DataStream API you can allow lateness or use a side output.'], ['Is the watermark per partition?', 'The source makes one per partition, and the job uses the minimum.']],
        trap: 'Saying that the watermark is the current time, or that it makes a window wait for a fixed time. It follows the data.',
        real: 'The dashboard is five minutes behind but complete. Finance is happy and the shops are not. What do you look at?'
      }),

      B.qa({
        id: 'qa-win', t: 1, tag: 'Time', secs: 75,
        q: 'Which kinds of window does Flink have, and when do you use each?',
        pts: ['Tumbling: fixed, no overlap', 'Hopping: fixed, overlapping', 'Cumulating: growing inside a period', 'Session: closes after a gap', 'Window table functions in SQL'],
        short: 'Flink SQL has four window table functions. **Tumbling** windows cut time into equal pieces that do not overlap: orders for each minute. **Hopping** windows have a size and a slide, so they overlap: a count of the last hour every five minutes. **Cumulating** windows grow in steps inside a larger period: a running total for the day, updated every 20 seconds. **Session** windows have no fixed size; they close after a gap with no event, per key: a customer visit. In my recording the same fourteen orders gave 5 tumbling windows, 10 hopping ones with every order in two, 15 cumulating ones and 6 sessions.',
        fu: [['How is a window result sent?', 'Once, when the watermark passes its end, as an insert.'], ['Which one needs a key?', 'A session window is computed per key, so you partition by it.']],
        trap: 'Using a hopping window when you want a running total. A cumulating window is the one that grows.'
      }),

      B.qa({
        id: 'qa-idle', t: 2, tag: 'Time', secs: 60,
        q: 'Your windows never close although the data arrives. What do you check?',
        pts: ['The watermark is the minimum over partitions', 'An empty or quiet partition holds it back', 'Idle timeout', 'Watermark defined on the right column', 'A timer in the Kafka source'],
        short: 'First I look at the **watermark** of the window operator in the web UI: if it does not move, no window closes. The usual cause is an **idle partition**. The source takes the minimum of the watermarks of its partitions, and a partition that gets no records sends no watermark. The fix is an idle timeout: `table.exec.source.idle-timeout` for all sources, or `scan.watermark.idle-timeout` for one table. In my recording, with one of two partitions empty, nothing was printed in 18 seconds, and four windows appeared with a timeout of 3 seconds. I also check that the watermark is defined on the right column and that event times are not in the far future.',
        fu: [['Does it happen with a file source?', 'No: a bounded file ends with a final watermark that closes everything.'], ['What is a risk of the timeout?', 'A partition that is only slow can be ignored, and its orders may be judged late.']],
        trap: 'Restarting the job. The orders were read; the watermark is what is stuck.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Clock Keeper', color: '#FEF08A',
        pts: [
          '**Event time** is in the data; **processing time** is the clock. Windows on event time give the same result on a rerun.',
          'A **watermark** is the largest time seen minus a **delay**. A window closes when it passes the end. An order that arrives after is **late**.',
          'The same 14 orders dropped **' + dsRow(0)[3] + '**, **' + dsRow(10)[3] + '**, **' + dsRow(30)[3] + '**, **' + dsRow(75)[3] + '** and **' + dsRow(200)[3] + '** orders with delays of 0, 10, 30, 75 and 200 seconds.',
          'The windows: **tumbling**, **hopping** (' + HOP.rows.length + ' windows), **cumulating** (' + CUM.rows.length + ') and **session** (' + SES.rows.length + ' for two stores).',
          'An **idle** partition holds the watermark back: nothing was printed until the idle timeout was set. SQL drops late orders; the DataStream API can allow lateness or use a side output.'
        ]
      })
    ]
  });
})();
