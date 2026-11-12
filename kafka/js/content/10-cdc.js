/* Mission 10: change data capture. PostgreSQL 16 with logical decoding and the Debezium PostgreSQL connector 3.7.1 on the Kafka Connect worker of Apache Kafka 4.4.0: a snapshot, inserts, updates and
   deletes as events, replica identity, a new column, a flat view, a replication slot that holds back the log, and a crash that repeats events. Everything here ran. */
(function () {
  var B = LAB.b, G = LAB.get;
  var DB = G.counts('cdc.database'), PB = G.text('cdc.publication'), SN = G.counts('cdc.snapshot'), ES = G.text('cdc.event_snapshot'), SL = G.table('cdc.slots'), CH = G.table('cdc.changes');
  var EU = G.text('cdc.event_update'), DT = G.counts('cdc.delete_tombstone'), RF = G.counts('cdc.replica_identity_full'), NC = G.counts('cdc.new_column'), FE = G.text('cdc.flat_events'), FL = G.counts('cdc.flat');
  var S2 = G.table('cdc.slots_two'), WH = G.counts('cdc.wal_held_back'), AL = G.counts('cdc.at_least_once');
  var PY = G.file('code/cdc.py');
  var SETUP = G.lines(PY, G.at(PY, /^    pg\.psql\("""/), G.at(PY, /CREATE PUBLICATION dbz_publication/));
  var CONF = G.lines(PY, G.at(PY, /^def connector_config/), G.at(PY, /^    return cfg/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mib = function (x) { return Math.round(x / 1048576 * 10) / 10 + ' MiB'; };
  G.expect(DB.wal_level === 'logical' && SN.order_events === 5 && SN.ops.join() === 'r' && SN.topics.length === 2, 'a snapshot of five orders and three customers');
  var chg = function (k) { var r = CH.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'change ' + k); return r; };
  G.expect(chg('INSERT')[2] === 'c' && chg('UPDATE')[2] === 'u' && chg('DELETE')[2] === 'd' && chg('(after')[2].indexOf('none') === 0, 'c, u, d and a tombstone');
  G.expect(chg('UPDATE')[3] === 'null' && RF.op === 'u' && RF.before !== null && NC.new_column_in_after === true, 'an update has no old row until the replica identity is full, and a new column appears in the events');
  G.expect(DT.second_record_has_the_same_key === true && DT.second_record_value === null, 'a delete is followed by a tombstone');
  G.expect(WH.slot_active_while_stopped === 'f' && WH.more_than_1_mb_held === true && WH.backlog_is_small_after_catching_up === true, 'a stopped connector makes the database keep the log');
  G.expect(AL.events_delivered_twice >= 1 && AL.extra_records >= 1, 'a crash repeats events');
  var bytesPer = Math.round(WH.backlog_bytes_while_stopped / WH.rows_changed_while_stopped);
  var HELD = mib(WH.bytes_the_slot_forces_postgres_to_keep), CHG = n0(WH.rows_changed_while_stopped);
  var DELB = JSON.parse(chg('DELETE')[3]);
  G.expect(DELB.order_id === 3 && (DELB.store_id === '' || DELB.total_cents === 0), 'the delete event has the key and empty values for the other columns');

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Change data capture with Debezium', short: 'CDC', blurb: 'A database change log as a stream: snapshots, inserts, updates, deletes, schema changes and the replication slot', minutes: 55,
    focus: ['src', 'ing', 'qual'],
    goals: [
      'Say why **log-based CDC** beats polling a table.',
      'Read a **Debezium change event**: `before`, `after`, `op`, `source`.',
      'Explain the **snapshot**, and the events for **insert, update and delete**, with the tombstone.',
      'Explain **replica identity**, and what happens when a **column is added**.',
      'Use the **unwrap** transform to flatten events.',
      'Explain the **replication slot**, the **WAL that it holds back**, and **at-least-once** delivery.'
    ],
    say: 'Mission 10 is the topic that most job descriptions mention by name: Debezium. Change data capture turns the log of a database into a stream of events, so that a warehouse, a cache and a search index can follow the database without querying it. I ran a real PostgreSQL 16 and a real Debezium on the Connect worker, changed rows, deleted rows, added a column, stopped the connector and watched the database keep its log, and killed the worker to see events repeat. Press Next.',
    scenes: [
      B.talk({
        id: 'm10-what', t: 1, src: 'docs', title: 'Why read the log, not the table',
        say: 'There are two ways to copy a table into another system. Press Next to compare them.',
        items: [
          ['Polling the table', 'Run `SELECT ... WHERE updated_at > last` every minute. It is simple. It misses **deletes**, it misses a row that changes twice between two polls, it needs a reliable `updated_at`, and it puts load on the database.', 'Easy, and it loses things.'],
          ['Reading the log', 'Every database writes every change to a **log** first, for its own recovery: the write-ahead log in PostgreSQL. A CDC tool reads that log and turns each change into an event. It sees **every** insert, update and delete, in order, with almost no load on the tables.', 'Every change, in order.'],
          ['In Kafka', 'The events go to a topic for each table. Any number of readers use them: a warehouse loader, a cache, a search index. The database is read once.', 'One reader of the database, many of the stream.'],
          ['What it costs', 'You must configure the database (logical replication), run a connector, and handle the shape of the events. And the database must **keep its log** until the connector has read it.', 'Setup, and a duty to the log.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Log-based CDC reads the database\'s own change log, so it sees every insert, update and delete in order, including deletes that polling misses, with little load on the database.' }
      }),

      B.flow({
        id: 'm10-flow', t: 1, src: 'rec', title: 'A row change on its way to a Kafka topic', g: 'cdc', legend: true,
        steps: [
          { say: 'This is the path that I ran: PostgreSQL, a replication slot, the Debezium connector, and topics. Press Next.', cap: 'A database change becomes a record.' },
          { say: 'Step 1. An application changes a row in `orders`. The database does it, and **writes the change to the write-ahead log** first.', on: ['k1'], focus: ['q_pg', 'q_wal'], cap: 'The change goes to the log first.' },
          { say: 'Step 2. A **logical replication slot** is a named reader of that log. It remembers how far its reader has confirmed, and the database will not discard log that the slot still needs.', on: ['k2'], focus: ['q_wal', 'q_slot'], cap: 'A slot remembers the reader\'s place.' },
          { say: 'Step 3. The **Debezium connector** connects to the slot and receives the decoded changes, in order.', on: ['k3'], focus: ['q_slot', 'q_dbz'], cap: 'Debezium reads the slot.' },
          { say: 'Step 4. For each row change it writes an **event** to a topic named `server.schema.table`, with the primary key as the record key.', on: ['k4'], focus: ['q_dbz', 'q_top'], cap: 'One topic for each table.' },
          { say: 'Step 5. Many readers want a **flat row**, not an event with before and after. The **unwrap** transform makes one.', on: ['k5'], focus: ['q_top', 'q_flat'], cap: 'Unwrap makes flat rows.' },
          { say: 'Step 6. Consumers use the topics: a warehouse, a search index, a cache.', on: ['k6'], focus: ['q_flat', 'q_con'], cap: 'Many readers, one stream.' },
          { say: 'Step 7. If the connector **stops**, the slot stays, and the database **keeps the log** for it. This protects you from losing changes. It can also fill the disk of the database.', on: ['k7'], focus: ['q_slot', 'q_hold'], cap: 'A stopped reader makes the log pile up.' }
        ]
      }),

      B.code({
        id: 'm10-setup', t: 2, src: 'rec', title: 'The database, and the connector', file: 'cdc.py', lang: 'python', code: SETUP,
        steps: [
          { say: 'This is the database that I made, and the settings of the connector. Press Next.', lines: null },
          { say: 'A role that may **replicate**, two tables, and a few rows. `orders` has a primary key, and its `customer_id` can be null for a guest.', lines: G.span(SETUP, /CREATE ROLE debezium/, /INSERT INTO orders/) },
          { say: 'A **publication** says which tables are published. Debezium uses PostgreSQL\'s built-in `pgoutput` decoding, with this publication.', lines: G.span(SETUP, /CREATE PUBLICATION/) }
        ],
        note: 'Recorded: PostgreSQL ' + DB.version + ' with wal_level set to ' + DB.wal_level + '. The plugin was Debezium ' + G.meta('debezium') + ', from Maven Central, on the plugin path of the Connect worker of mission 9.'
      }),

      B.code({
        id: 'm10-config', t: 2, src: 'rec', title: 'The connector configuration', file: 'cdc.py', lang: 'python', code: CONF,
        steps: [
          { say: 'One document sets everything. Press Next.', lines: null },
          { say: 'The connector class, the database address and the **role**. The password is a made-up value, for a database that existed for minutes.', lines: G.span(CONF, /connector\.class/, /database\.dbname/) },
          { say: '`topic.prefix` starts the name of every topic. `table.include.list` picks the tables. `plugin.name` is the decoder. `slot.name` and `publication.name` are the two things that exist in the database because of this connector.', lines: G.span(CONF, /topic\.prefix/, /publication\.name/) },
          { say: '`snapshot.mode=initial` takes a snapshot of the tables on the first start. The converters write JSON without schemas, so that the events are readable.', lines: G.span(CONF, /snapshot\.mode/, /value\.converter\.schemas/) }
        ],
        note: 'Recorded: the real configuration of the recording.'
      }),

      B.rows({
        id: 'm10-snapshot', t: 1, src: 'rec', title: 'The snapshot: what was already there',
        steps: [
          {
            say: 'When the connector started, the tables already held **' + DB.orders + ' orders** and **' + DB.customers + ' customers**. It took a **snapshot**: one event for each row, with the operation **`r`**, for "read". Two topics appeared, one for each table.',
            tabs: [{ layer: 'RECORDED', name: 'What the snapshot produced', c: 'raw', cols: ['What', 'Value'], rows: [['Topics', SN.topics.join(', ')], ['Events for orders', SN.order_events], ['Events for customers', SN.customer_events], ['Operations', SN.ops.join(', ')], ['The `snapshot` flag values', SN.snapshot_flags.join(', ')], ['Record keys', JSON.stringify(SN.keys[0]) + ', ' + JSON.stringify(SN.keys[1])]] }],
            notes: ['Recorded. The key of an event is the **primary key** of the row: that is what puts all the changes of one order in one partition, in order.']
          },
          {
            say: 'This is the first event, in full. Four parts matter. **`before`** is null, because a read has no earlier version. **`after`** holds the row. **`source`** says where it came from: the database, the table, the log position. **`op`** says what happened.',
            tabs: [{ layer: 'RECORDED', name: 'One snapshot event', c: 'raw', cols: ['JSON'], rows: ES.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The log position, the transaction id and the times are replaced by markers, because they differ on every run.']
          }
        ]
      }),

      B.rows({
        id: 'm10-changes', t: 1, src: 'rec', title: 'Insert, update, delete',
        steps: [
          {
            say: 'Then I changed the database with three statements. Each became an event. An **insert** is `c` for create, with an `after`. An **update** is `u`. A **delete** is `d`, with a `before` and no `after`. Look at the last row: after the delete there is a **second** record with the same key and **no value**.',
            tabs: [{ layer: 'RECORDED', name: 'Three statements, four records', c: 'raw', cols: CH.cols, rows: CH.rows, trk: 3 }],
            notes: ['Recorded. The last record is a **tombstone**, as in mission 8: it lets a compacted topic drop the key. ' + (DT.second_record_has_the_same_key ? 'It has the same key as the delete event.' : '')]
          },
          {
            say: 'Look at the update. The row was changed from paid to refunded, and the event says `op: u`, `after` with the new status. And **`before` is null**. This is a surprise to many people. By default PostgreSQL logs only the **primary key** of the old row for an update, so Debezium has nothing to put in `before`.',
            tabs: [{ layer: 'RECORDED', name: 'The update event, in full', c: 'raw', cols: ['JSON'], rows: EU.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. Look at the `before` of the delete: **only `order_id` (' + DELB.order_id + ') is real**. `store_id` is `"' + DELB.store_id + '"` and `total_cents` is `' + DELB.total_cents + '`, because with the default identity the log carries only the key, and the connector fills in empty values for the columns that cannot be null. **Do not trust those values.**']
          }
        ]
      }),

      B.rows({
        id: 'm10-identity', t: 1, src: 'rec', title: 'Replica identity: how much of the old row',
        steps: [
          {
            say: 'The setting that decides it is the table\'s **replica identity**. The default is the primary key only. I changed it to **FULL**, which makes PostgreSQL log the whole old row, and updated an order again.',
            tabs: [{ layer: 'RECORDED', name: 'ALTER TABLE orders REPLICA IDENTITY FULL', c: 'raw', cols: ['Field', 'Value'], rows: [['op', RF.op], ['before', JSON.stringify(RF.before)], ['after', JSON.stringify(RF.after)]], trk: 1 }],
            notes: ['Recorded. Now `before` holds every column, and the change is visible: `total_cents` went from ' + RF.before.total_cents + ' to ' + RF.after.total_cents + '.']
          },
          {
            say: 'The trade: FULL makes every update and delete write more to the log, but gives the old row. Use it for tables whose consumers need to know **what changed**, or to delete a row in a target that has no primary key.',
            tabs: [{ layer: 'RECORDED', name: 'The choice', c: 'raw', cols: ['Replica identity', 'Old row in the event', 'Cost'], rows: [['DEFAULT (primary key)', 'only the key columns: `before` is null for most updates', 'least WAL'], ['FULL', 'the whole row', 'more WAL for each update and delete']], trk: 1 }],
            notes: ['The first row is the recording above. The cost column is the reason that FULL is not the default.']
          }
        ]
      }),

      B.rows({
        id: 'm10-schema', t: 1, src: 'rec', title: 'A column is added',
        steps: [
          {
            say: 'Then I ran `ALTER TABLE orders ADD COLUMN channel text DEFAULT \'app\'` and updated an order. The next event **has the new column**: the connector noticed the change of shape from the log, and did not need a restart.',
            tabs: [{ layer: 'RECORDED', name: 'The columns of the event after the change', c: 'raw', cols: ['What', 'Value'], rows: [['Columns in before', NC.columns_before.join(', ')], ['Columns in after', NC.columns_after.join(', ')], ['The new column is in the event', NC.new_column_in_after ? 'yes' : 'no']], trk: 2 }],
            notes: ['Recorded. ' + (NC.columns_before.indexOf('channel') >= 0 ? 'Both lists have `channel`: the old row is complete in `before` because the table has REPLICA IDENTITY FULL from the step before. ' : '') + 'A new column is the easy case. Dropping or renaming a column, or changing a type, can break readers. Mission 11 is about that.']
          }
        ]
      }),

      B.rows({
        id: 'm10-flat', t: 2, src: 'rec', title: 'Flat rows, with the unwrap transform',
        steps: [
          {
            say: 'Most sinks want a row, not an envelope. A second connector with the **unwrap** transform, `ExtractNewRecordState`, writes flat records. An update becomes the new row, with `__op` and `__table` added. A delete, with the delete mode set to `rewrite`, becomes a row with **`__deleted` true**.',
            tabs: [{ layer: 'RECORDED', name: 'Flat records of the second connector', c: 'raw', cols: ['Record'], rows: FE.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded: ' + FL.records + ' records, ' + FL.snapshot_records + ' from the snapshot and ' + FL.live_records + ' live, and ' + FL.tombstones + ' tombstones: with `rewrite` the delete becomes a row, and no tombstone follows. In Debezium ' + G.meta('debezium') + ' the option is `delete.tombstone.handling.mode`. An older name for this option, from earlier versions, had no effect when I tried it, so check the names of the version that you run.']
          },
          {
            say: 'Two connectors read the same table through two **slots**. Each slot is a separate reader with its own position, and each keeps the database\'s log until it has read it.',
            tabs: [{ layer: 'RECORDED', name: 'pg_replication_slots with two connectors', c: 'raw', cols: S2.cols, rows: S2.rows }],
            notes: ['Recorded. The first connector has its own slot, and the first table of this mission showed it alone: ' + SL.rows[0][0] + ', ' + SL.rows[0][1] + ', active ' + SL.rows[0][2] + '.']
          }
        ]
      }),

      B.widget({ id: 'm10-lab', kind: 'cdclab', t: 1, src: 'rec', title: 'Lab: what an event says' }),

      B.rows({
        id: 'm10-slot', t: 1, src: 'rec', title: 'The slot that fills the disk',
        steps: [
          {
            say: 'Now the danger. I **stopped the connector**. The slot stayed, **inactive**: active is `' + WH.slot_active_while_stopped + '`. While it was stopped, I changed **' + n0(WH.rows_changed_while_stopped) + ' rows** in the database: twenty thousand inserts and twenty thousand updates. Then I asked how much of the log the slot was holding back.',
            tabs: [{ layer: 'RECORDED', name: 'The log that the database kept for the stopped connector', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['Backlog before the stop', n0(WH.backlog_bytes_before_the_stop) + ' bytes'], ['Backlog while stopped, after ' + n0(WH.rows_changed_while_stopped) + ' row changes', n0(WH.backlog_bytes_while_stopped) + ' bytes (' + mib(WH.backlog_bytes_while_stopped) + ')'], ['Log that the slot forces PostgreSQL to keep (from restart_lsn)', n0(WH.bytes_the_slot_forces_postgres_to_keep) + ' bytes (' + HELD + ')']], trk: 1 }],
            notes: ['Recorded. That is about ' + bytesPer + ' bytes of log for each row change. Multiply by your change rate and the time that a connector can be down.']
          },
          {
            say: 'When I **started the connector again**, it read the backlog and caught up: all ' + n0(WH.rows_changed_while_stopped) + ' events arrived. The backlog fell to **' + n0(WH.backlog_bytes_after_the_connector_caught_up) + ' bytes**, and the log that was kept shrank to **' + n0(WH.bytes_kept_after_catching_up) + '**. Nothing was lost. The price was disk on the database for as long as the connector was away.',
            tabs: [{ layer: 'RECORDED', name: 'After the connector caught up', c: 'raw', cols: ['Measure', 'Value'], rows: [['Backlog after catching up', n0(WH.backlog_bytes_after_the_connector_caught_up) + ' bytes'], ['Log kept after catching up', n0(WH.bytes_kept_after_catching_up) + ' bytes'], ['A WAL segment is', mib(WH.wal_segment_bytes)]], trk: 0 }],
            notes: ['Recorded. In production a connector that is down for a day on a busy database can hold back gigabytes, and a dead one can fill the disk and stop the database.']
          },
          {
            say: 'So a CDC pipeline has a **duty of care**. Monitor the lag of the slot in bytes. Alert when a slot is inactive. Drop a slot that you no longer use. And set a limit on how much log a slot may hold, `max_slot_wal_keep_size` in PostgreSQL, so that a dead connector cannot take the database down: the slot is lost instead, and the connector must take a new snapshot.',
            tabs: [{ layer: 'RECORDED', name: 'What to watch', c: 'raw', cols: ['What', 'Where', 'Why'], rows: [['Slot active or not', 'pg_replication_slots.active', 'an inactive slot holds the log'], ['Bytes held back', 'pg_current_wal_lsn() minus restart_lsn', 'the number that fills the disk'], ['A cap on the log a slot may hold', 'max_slot_wal_keep_size', 'protects the database, at the price of the slot']], trk: 2 }],
            notes: ['The first two queries are the ones that the recording used. The last is a PostgreSQL setting from its documentation.']
          }
        ]
      }),

      B.rows({
        id: 'm10-alo', t: 2, src: 'rec', title: 'A crash repeats events',
        steps: [
          {
            say: 'Debezium commits the **position** of what it has delivered every `offset.flush.interval.ms`, one minute by default, and I set it to ten minutes in this run. I changed four rows, and let the events reach the topic. Then I killed the Connect worker with kill -9, before it had written its position, and started it again.',
            tabs: [{ layer: 'RECORDED', name: 'The topic before and after the crash', c: 'raw', cols: ['Measure', 'Value'], rows: [['Records before the crash', n0(AL.records_before_the_crash)], ['Events of the last four updates', AL.events_of_the_last_four_updates], ['Records after the restart', n0(AL.records_after_the_restart)], ['Events delivered twice', AL.events_delivered_twice], ['Extra records', AL.extra_records]], trk: 3 }],
            notes: ['Recorded. The same four events, with the same log positions, are in the topic twice.']
          },
          {
            say: 'This is **at-least-once**. The connector writes the events first, and the position after. A crash between the two repeats the events since the last position. A reader of CDC topics must be **idempotent**: an upsert by the primary key does it, and the log position in the `source` field tells which version is newer.',
            tabs: [{ layer: 'RECORDED', name: 'How a reader copes', c: 'raw', cols: ['Reader', 'How it copes with a repeat'], rows: [['A warehouse merge', 'upsert by primary key: the same row again'], ['A search index', 'index by id: the same document again'], ['A counter', 'not safe: use the log position to skip events that it has seen']] }],
            notes: ['The mechanism is the recording above. The table of readers is advice.']
          }
        ]
      }),

      B.cmp({
        id: 'm10-poll', t: 1, src: 'docs', title: 'Polling or the log',
        say: 'Compare the two ways on the questions that decide it. Press Next.',
        cols: ['Question', 'Polling a table (a JDBC source)', 'Reading the log (Debezium)'],
        hl: 2,
        rows: [
          ['Does it see deletes?', 'No: a deleted row is simply not there', 'Yes: a delete event and a tombstone'],
          ['Does it see every update?', 'Only the state at each poll', 'Every change, in order'],
          ['Does it need a column such as updated_at?', 'Yes, and it must be reliable', 'No'],
          ['Load on the database', 'A query on every poll', 'Reads the log it already writes'],
          ['Setup', 'A connection and a query', 'Logical replication, a role, a slot, a connector'],
          ['Risk to the database', 'Slow queries', 'A slot that holds back the log'],
          ['Delay', 'The poll interval', 'Seconds']
        ],
        pick: 'Use polling for a small table that only grows and never deletes. Use the log for anything that changes, anything that deletes, and anything that must be complete.'
      }),

      B.talk({
        id: 'm10-ops', t: 2, src: 'docs', title: 'What to decide before you run Debezium',
        say: 'Six decisions, each one visible in the recording. Press Next.',
        items: [
          ['The snapshot mode', 'The first start takes a **snapshot** of the tables, `r` events, so that a new reader has the whole table. A big table makes a long snapshot. Other modes skip it, for tables that you only want to follow from now on.', 'A snapshot first, then the changes.'],
          ['The replica identity', 'Default means no old row in an update. FULL gives it, at a cost in the log. Decide per table.', 'Do your readers need the old row?'],
          ['The topic and the key', 'One topic per table, keyed by the primary key. A table without a primary key makes events that are hard to use.', 'Tables need a primary key.'],
          ['The delete handling', 'A delete is two records, an event and a tombstone. The unwrap transform can keep one, or turn it into a row with a deleted flag.', 'Say how deletes reach the sink.'],
          ['Schema changes', 'A new column flows through. A removed or retyped column can break readers, so use a schema registry and compatibility rules.', 'Plan the schema of events.'],
          ['The slot', 'Monitor it, cap it, and drop it when the connector is retired.', 'It is a duty of care.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'Why can polling a table miss data that log-based CDC sees?',
        opts: [
          { t: 'Polling is always slower', fb: 'Speed is not the issue.' },
          { t: 'A poll sees only the state at that moment: deleted rows, and rows changed twice between polls, are lost', fb: '' },
          { t: 'The log is encrypted', fb: 'That is not the reason.' },
          { t: 'Kafka cannot read tables', fb: 'The JDBC connector reads tables.' }
        ],
        ok: 1,
        why: 'A query returns what is in the table now. A delete leaves nothing to return, and two updates between polls show only the last. The log has every change.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'A Debezium update event has `before: null`. What is the most likely reason?',
        opts: [
          { t: 'The row was new', fb: 'A new row is an insert.' },
          { t: 'The table has the default replica identity, so the old row is not logged', fb: '' },
          { t: 'The connector is broken', fb: 'It works as designed.' },
          { t: 'The topic is compacted', fb: 'Compaction does not change the event.' }
        ],
        ok: 1,
        why: 'PostgreSQL logs only the primary key of the old row by default. With REPLICA IDENTITY FULL, the whole old row is logged, and `before` is filled, as in the recording.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1,
        q: 'The connector is stopped for a day on a busy database. What happens to the replication slot?',
        opts: [
          { t: 'It is deleted at once', fb: 'A slot stays until it is dropped.' },
          { t: 'It stays, and the database keeps all the log that the slot has not read', fb: '' },
          { t: 'It reads the changes by itself', fb: 'Only the connector reads from a slot.' },
          { t: 'It stores the changes in Kafka', fb: 'Kafka is not involved until the connector runs.' }
        ],
        ok: 1,
        why: 'The slot protects the reader\'s place. In the recording, ' + CHG + ' row changes held back ' + HELD + ' of log while the connector was stopped. A day of a busy database can fill its disk.'
      }),

      B.quiz({
        id: 'm10-q4', t: 2,
        q: 'The Connect worker is killed before it commits its offsets. What happens to the events that it had already written?',
        opts: [
          { t: 'They are lost', fb: 'They are in the topic.' },
          { t: 'After a restart the connector resends events from the last committed position, so some appear twice', fb: '' },
          { t: 'The topic is cleared', fb: 'Nothing deletes the topic.' },
          { t: 'Debezium guarantees exactly once', fb: 'The recording shows duplicates.' }
        ],
        ok: 1,
        why: 'The position is written after the events. The recording killed the worker and found four events twice. Readers must be idempotent.'
      }),

      B.bug({
        id: 'm10-bug', t: 1, q: 'This consumer reads Debezium update events and reports what changed. It crashes on most updates. Click the line that crashes.',
        file: 'audit.py', lang: 'python',
        code: ['event = json.loads(msg.value())', 'if event["op"] == "u":', '    old = event["before"]["status"]', '    new = event["after"]["status"]', '    print("order", event["after"]["order_id"], old, "->", new)'].join('\n'),
        bad: [3],
        hint: 'What is in `before` when the table has the default replica identity?',
        why: 'With the default replica identity `before` is **null** for most updates, so `event["before"]["status"]` raises a TypeError. Set `REPLICA IDENTITY FULL` on the table if you need the old row, or keep your own copy of the previous state.',
        fix: ['event = json.loads(msg.value())', 'if event["op"] == "u":', '    old = (event["before"] or {}).get("status")   # None unless the table has REPLICA IDENTITY FULL', '    new = event["after"]["status"]', '    print("order", event["after"]["order_id"], old, "->", new)'].join('\n'),
        cheer: 'Check what the database logs before you rely on before.'
      }),

      B.order({
        id: 'm10-ord', t: 1, q: 'Put the life of one row change in order.',
        items: [
          'An application updates a row in PostgreSQL',
          'The database writes the change to the write-ahead log',
          'The replication slot decodes the change and offers it to its reader',
          'The Debezium connector turns it into an event and writes it to the table\'s topic',
          'The connector commits its position in connect-offsets',
          'A consumer reads the event and updates the warehouse'
        ],
        why: 'The log comes first, and the event after. The position is committed last, so a crash before it repeats the event. Everything downstream must be safe to repeat.'
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: how should the orders table reach the warehouse',
        scenario: 'The `orders` table is updated and deleted all day. The warehouse must match it within a minute, deletes included. The database has a small disk, and the team has never run a CDC connector. You choose.',
        opts: [
          { t: 'A JDBC source connector that polls `updated_at` every minute', d: 'Simple, and no database changes.', lose: 'Deletes never arrive, and rows that change twice between polls lose a version. The warehouse drifts from the table.' },
          { t: 'Debezium on the log, with a slot that is monitored and capped, unwrap with a delete flag, and an upsert sink', d: 'Every change, deletes included, with a plan for the log.', lose: '' },
          { t: 'A nightly full copy', d: 'No new parts.', lose: 'A day late, and the copy grows with the table.' }
        ],
        pick: 1,
        why: 'Only the log shows deletes and every update. The small disk means the slot must be watched and capped, so that a stopped connector cannot fill the database. An upsert sink makes the repeats harmless.',
        when: 'If the table never changes or deletes, such as an append-only table of events, polling is fine. Say that you would check for deletes first.'
      }),

      B.incident({
        id: 'm10-inc', t: 1, src: 'rec', title: 'Incident: the database disk is full', time: '03:50',
        alert: '**The orders database stopped accepting writes at 03:41: the disk of the WAL volume is full.** The Debezium connector was stopped by a deploy on Friday evening. It is Monday.',
        clues: ['`pg_replication_slots` shows the slot of the connector as inactive', 'The slot holds back hundreds of gigabytes of log', 'Nobody had set max_slot_wal_keep_size'],
        opts: [
          { t: 'Restart the connector so that it reads the backlog, or drop the slot and take a new snapshot if the backlog is too large, then cap the slot and alert on it', fb: '' },
          { t: 'Delete files from the WAL folder by hand', fb: 'It can corrupt the database. Let the database release the log.' },
          { t: 'Increase the disk and do nothing else', fb: 'The next stopped connector will fill it again.' },
          { t: 'Restart the database', fb: 'The slot still holds the log.' }
        ],
        best: 0,
        why: 'A slot makes the database keep every change that it has not read. The recording held ' + HELD + ' back for ' + CHG + ' changes while the connector was stopped. Over a weekend of a busy database, it is the disk. Free the log by letting the connector read it, or by dropping the slot, and accept a new snapshot.',
        checks: [
          ['Look at pg_replication_slots', 'An inactive slot with a large lag is the cause.'],
          ['Check the connector', 'Why did it stop? A deploy, an error?'],
          ['Check max_slot_wal_keep_size', 'Unset means no limit.']
        ],
        tell: 'The connector was stopped for the weekend, its replication slot made the database keep all the log, and the disk filled. We restarted the connector so that the log could be released, and we now cap the slot and alert on its lag.',
        prevent: ['Alert on inactive slots and on the bytes that a slot holds back', 'Set max_slot_wal_keep_size', 'Make the connector part of every deploy checklist']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'rec', title: 'Incident: deleted orders are still in the warehouse', time: '10:20',
        alert: '**Orders that were deleted in the application are still in the warehouse.** The pipeline is Debezium, the unwrap transform, and a sink that upserts by order id. Inserts and updates arrive correctly.',
        clues: ['The unwrap transform runs with its default delete handling', 'The topic shows a delete event and a record with no value', 'The sink ignores records that have no value'],
        opts: [
          { t: 'Make deletes visible to the sink: use the rewrite mode so that a delete is a row with a deleted flag, and make the sink delete or mark the row', fb: '' },
          { t: 'Turn on REPLICA IDENTITY FULL', fb: 'It adds the old row. The sink still has to act on a delete.' },
          { t: 'Poll the table instead', fb: 'Polling cannot see deletes at all.' },
          { t: 'Restart the connector', fb: 'It does not change how deletes are written.' }
        ],
        best: 0,
        why: 'A delete is a delete event and a tombstone, and the unwrap transform has modes for them. In the recording, the default left only a tombstone, and `rewrite` produced a row with `__deleted` true. The sink must know what to do with each.',
        checks: [
          ['Look at the topic around a deleted order', 'There is a record with the key and no value, or a row with the flag.'],
          ['Check the unwrap mode', 'delete.tombstone.handling.mode decides what the sink sees.'],
          ['Check what the sink does with a flag or a tombstone', 'It must delete, or mark.']
        ],
        tell: 'The sink did not know what to do with a tombstone, so deleted orders stayed. We use the rewrite mode to put a deleted flag on the row, and the sink now deletes by that flag.',
        prevent: ['Test deletes end to end, as well as inserts and updates', 'Write down how deletes travel through the pipeline', 'Use a sink mode that supports deletes']
      }),

      B.qa({
        id: 'qa-cdc', t: 1, tag: 'CDC', secs: 75,
        q: 'What is change data capture, and how does Debezium work?',
        pts: ['Read the database\'s change log', 'Every insert, update and delete, in order', 'A connector on Kafka Connect', 'One topic per table, keyed by primary key', 'Events: before, after, op, source'],
        short: 'Change data capture turns the **change log of a database** into a stream of events. Debezium is a set of Kafka Connect source connectors that read the log: the write-ahead log of PostgreSQL through a logical replication slot, the binlog of MySQL, and so on. It writes one **event** for each row change into a topic for each table, keyed by the **primary key**, so the changes of a row stay in order. An event has `before`, `after`, `op` (`c`, `u`, `d` or `r` for a snapshot read) and a `source` with the log position. On first start it takes a **snapshot** of the tables. Compared with polling, it sees deletes and every update, and puts little load on the database.',
        fu: [['What is a tombstone?', 'After a delete event, Debezium writes a record with the same key and no value, so that a compacted topic can drop the key.'], ['What does the unwrap transform do?', 'It flattens an event into the new row, with optional metadata and a deleted flag, for sinks that want rows.']],
        trap: 'Saying that CDC is the same as polling with a timestamp.',
        real: 'Walk me through syncing a Postgres table to a warehouse.'
      }),

      B.qa({
        id: 'qa-cdcops', t: 2, tag: 'CDC', secs: 75,
        q: 'What are the risks of running CDC against a production database?',
        pts: ['The replication slot holds back the log', 'Monitor and cap the slot', 'At-least-once delivery', 'Schema changes', 'Snapshots of big tables'],
        short: 'The main risk is the **replication slot**. It makes the database keep all log that the connector has not read, so a stopped or slow connector fills the disk. In my recording, ' + CHG + ' row changes held back ' + HELD + ' while the connector was stopped. I monitor the lag of every slot in bytes, alert on inactive slots, set `max_slot_wal_keep_size` as a safety limit, and drop slots of retired connectors. Next, delivery is **at least once**: I killed the worker and four events appeared twice, so every reader must be idempotent. Then **schema changes**: a new column flows through, but a dropped or retyped column can break readers, so I use a schema registry with compatibility rules. And **snapshots** of big tables take time and load, so I plan them. For old rows in updates I set REPLICA IDENTITY FULL where it is needed.',
        fu: [['What if the slot is lost?', 'The connector cannot resume, and must take a new snapshot. Readers must cope with a full reload.'], ['How do you test it?', 'Insert, update and delete, add a column, stop the connector, kill the worker, and check the sink each time.']],
        trap: 'Forgetting that a stopped connector is a cost to the database as well as to the pipeline.',
        real: 'The database team does not trust the connector. What do you show them?'
      }),

      B.qa({
        id: 'qa-cdcdel', t: 2, tag: 'CDC', secs: 75,
        q: 'How do deletes and updates reach the sink?',
        pts: ['A delete is an event with op d, and a tombstone', 'Unwrap: drop, tombstone or rewrite', 'The sink must act on it', 'Updates: after, and before with replica identity full', 'Upsert by key'],
        short: 'A delete in the database becomes a **delete event**, `op: d`, with the old row in `before`, followed by a **tombstone**: a record with the same key and no value. An update is `op: u`, with `after` holding the new row, and `before` holding the old row only when the table has `REPLICA IDENTITY FULL`. A sink that wants flat rows uses the unwrap transform, and its delete mode decides what the sink sees: drop the delete, keep only a tombstone, or rewrite it as a row with a deleted flag. In my recording, `rewrite` gave `__deleted: true` and `__op: d`. The sink must then **delete or mark** the row, and writes updates as an **upsert by the primary key**, so that repeats from at-least-once delivery are harmless.',
        fu: [['Why a tombstone as well?', 'So that a compacted topic can remove the key, and a reader that rebuilds the table from the topic does not resurrect it.'], ['What if the sink ignores records with no value?', 'Deleted rows stay in the target. Test deletes end to end.']],
        trap: 'Testing only inserts and updates.',
        real: 'Our dashboard shows orders that were deleted last week. Why?'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Change Catcher', color: '#BAE6FD',
        pts: [
          '**Log-based CDC** reads the database\'s change log, so it sees every insert, update and delete, **deletes included**, in order.',
          'A Debezium **event** has `before`, `after`, `op` (`r` snapshot, `c`, `u`, `d`) and `source`. The **key** is the primary key. A delete is followed by a **tombstone**.',
          'With the default **replica identity**, `before` is **null** for an update. `REPLICA IDENTITY FULL` logs the old row, at a cost.',
          'A **new column** flowed through without a restart. The **unwrap** transform flattens events, and its delete mode decides what the sink sees.',
          'A **replication slot** makes the database keep the log for a stopped connector: ' + HELD + ' for ' + CHG + ' changes in the recording. Monitor it and cap it.',
          'Delivery is **at least once**: a killed worker repeated four events. Readers must be idempotent.'
        ]
      })
    ]
  });
})();
