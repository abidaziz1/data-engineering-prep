/* Mission 1: capture it. The database side, the connector, the snapshot and the change events. Every file is the file of projects/brewline-cdc, and the snapshot ran for real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), R1 = RUNS.snapshot, R2 = RUNS.changes, A1 = C('after_snapshot'), OPS = C('ops'), TOPIC = C('topic');
  var SCH = G.file('db/schema.sql'), CONN = G.file('connect/orders-connector.json');
  G.expect(R1.new_messages === 200 && R1.events === 200 && R1.inserted === 200 && R1.batches === 1 && R1.gate.length === 5 && R1.gate.every(function (l) { return /^PASS/.test(l); }), 'the snapshot reads 200 messages in one batch, inserts 200 orders, and the 5 gate checks pass');
  G.expect(A1.bronze === 200 && A1.silver === 200 && A1.live === 200 && A1.deleted === 0 && A1.source === 200 && A1.revenue === A1.source_revenue, 'after the snapshot bronze, silver and Postgres hold 200 orders with the same revenue');
  G.expect(OPS.r === 200 && OPS.c === 50 && OPS.u === 134 && OPS.d === 5 && TOPIC.identity === 389, 'the topic holds 389 messages: 200 reads, 50 creates, 134 updates and 5 deletes');
  var json = function (key) { return function () { return X(key).split('\n').map(function (t) { return { c: 'out', t: t, d: 30 }; }); }; };

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Capture it: the log, the connector and the events', short: 'Capture', blurb: 'The database side, the Debezium connector, the snapshot, and what a change event holds', minutes: 22,
    focus: ['src'],
    goals: [
      'Read the **database side**: the table, the publication and the role.',
      'Read the **connector**, and say what each group of settings decides.',
      'Read a **change event**: the operation, the row and the log position.',
      'Say what the **snapshot** and the **slot** are for.'
    ],
    say: 'A change data capture pipeline starts in the database. I will show what Postgres must be told, what the connector asks for, and what one message looks like when it reaches Kafka. Read each file as you would in a review.',
    scenes: [
      B.code({
        id: 'm1-schema', t: 1, src: 'rec', title: 'schema.sql: the table, and what Debezium needs', file: 'schema.sql', lang: 'sql', code: SCH,
        steps: [
          { say: 'The database side is one small file. Press Next.', lines: null },
          { say: 'The **table**: a primary key, and the columns of an order. The key matters: it is what the merge matches on, and what a delete event keeps.', lines: G.span(SCH, /^CREATE TABLE orders/, /^\);/) },
          { say: 'A **publication** lists the tables whose changes are sent. The connector reads only the tables of this one, through the `pgoutput` plugin that ships with Postgres.', lines: G.span(SCH, /^-- Debezium reads the changes/, /^CREATE PUBLICATION/) },
          { say: 'A **role** for the connector. It needs `REPLICATION` to open a slot and read the log, and `SELECT` to read the table for the snapshot. It does not need more.', lines: G.span(SCH, /^-- The role that the connector/, /^GRANT SELECT/) }
        ]
      }),

      B.cmp({
        id: 'm1-need', t: 1, src: 'docs', title: 'What Postgres must be told, for a connector to read it',
        say: 'Four things, and none of them is a change of the table. Press Next to read them.',
        cols: ['Setting', 'What it does', 'Where it is in the project'],
        hl: 1,
        rows: [
          ['`wal_level = logical`', 'Makes Postgres write enough in its log to decode the changes of rows. The default level does not', 'Set when the server starts, in `stack/local.py`'],
          ['A publication', 'Names the tables whose changes are sent', '`schema.sql`'],
          ['A replication slot', 'Remembers how far the reader has got, so that Postgres keeps the log that is not confirmed yet', 'Created by the connector, named in its settings'],
          ['A role with `REPLICATION`', 'May open the slot and read the log', '`schema.sql`']
        ],
        steps: [
          { upto: 2, say: 'The first two decide **what** is written and **which tables** are sent. A change of `wal_level` needs a restart of the server, so it is a decision to take early.' },
          { upto: 4, say: 'The last two decide **who** reads and **how far**. The slot is the one that can hurt: the next missions show what Postgres does with the log of a reader that stopped. These are from my knowledge of the Postgres documentation, and the project shows them in use.' }
        ]
      }),

      B.code({
        id: 'm1-conn', t: 1, src: 'rec', title: 'orders-connector.json: the Debezium connector', file: 'orders-connector.json', lang: 'json', code: CONN,
        steps: [
          { say: 'One file of settings for Kafka Connect. Press Next.', lines: null },
          { say: 'The **connection**: where the database is, the role of the connector, and the database. The password is a made-up value of a throwaway server.', lines: G.span(CONN, /"database\.hostname"/, /"database\.dbname"/) },
          { say: 'What to **capture**: the table, the plugin, the **slot**, and the **publication** that already exists, so that the connector does not create it.', lines: G.span(CONN, /"topic\.prefix"/, /"publication\.autocreate\.mode"/) },
          { say: 'The **snapshot** and the deletes. `initial` reads the whole table once, before the changes, so that the rows that were there first are not missed. With `tombstones.on.delete` off, a delete is **one** message and not two.', lines: G.span(CONN, /"snapshot\.mode"/, /"tombstones\.on\.delete"/) },
          { say: 'The **converters**: JSON, with no schema inside each message. The message is smaller and easy to read. The cost is that nothing checks its shape: the pipeline must.', lines: G.span(CONN, /"key\.converter"/, /"value\.converter\.schemas\.enable"/) }
        ]
      }),

      B.term({
        id: 'm1-snapshot', t: 1, src: 'rec', title: 'The first run: the snapshot',
        say: 'The connector started on a table that already held 200 orders. This is the real first run of the pipeline.',
        lines: function () { return G.plain(X('run.snapshot')); },
        after: 'The connector read the whole table before any change: **' + R1.new_messages + '** messages, all with the operation `r`. Bronze took them, silver **inserted ' + R1.inserted + '** orders in **' + R1.batches + '** micro-batch, and the gate passed all **5** checks: the topic and bronze agree, silver has one row for each order, and silver matches Postgres on the number of orders, on the revenue (**' + n(A1.revenue) + '** cents) and on every row.',
        afterKind: 'tip',
        doneSay: 'The first run is clean.'
      }),

      B.cmp({
        id: 'm1-ops', t: 1, src: 'rec', title: 'The four operations, and how many of each the topic held',
        say: 'Every message has an `op`. Press Next to see what each one means, and what it says about the row.',
        cols: ['`op`', 'What happened in the database', '`before`', 'Messages in the recording'],
        hl: 3,
        rows: [
          ['`r`', 'A row that the snapshot read', 'null', String(OPS.r)],
          ['`c`', 'An insert', 'null', String(OPS.c)],
          ['`u`', 'An update', 'null, with the default replica identity', String(OPS.u)],
          ['`d`', 'A delete', 'the key, and placeholders', String(OPS.d)]
        ],
        steps: [
          { upto: 2, say: 'The snapshot and the inserts carry the **whole row** in `after`, and nothing in `before`. They are the two ways that a row enters.' },
          { upto: 4, say: 'An update carries the **new row**, and with the default identity nothing before it. A delete carries **no row after** it: its `before` holds the **key**. That is the message that a polling job can never see.' }
        ]
      }),

      B.term({
        id: 'm1-ev-update', t: 1, src: 'rec', title: 'An update, as the topic holds it',
        say: 'This is the message of the shipping of order 201, from the topic. The numbers that change from run to run are replaced by their names.',
        lines: json('event.update'),
        after: 'Read it from the top. `before` is **null**: Postgres did not log the old row, because the update did not change the key. `after` is the **new row**. `source.lsn` is the **position in the log**, and it is the number that orders the changes of a database. `source.snapshot` says `false`: this is a change and not a read of the snapshot. `op` is `u`.',
        afterKind: 'tip',
        doneSay: 'One message for one change.'
      }),

      B.term({
        id: 'm1-ev-delete', t: 1, src: 'rec', title: 'A delete, as the topic holds it',
        say: 'This is the message of the delete of order 31. Look at `before` and at `after`.',
        lines: json('event.delete'),
        after: '`after` is **null**: the row is gone. `before` has the **key**, `id` 31, and **placeholder values** for the other columns: `0`, an empty text and the date 1970. With the default identity Postgres logs only the key of a deleted row, and Debezium fills the other columns of a `NOT NULL` column with a default. **Only the key of a delete can be trusted.**',
        afterKind: 'warn',
        doneSay: 'A delete says which row, and nothing else.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'What does `op: "r"` mean?',
        opts: [
          { t: 'The snapshot read a row that was already in the table when the connector started', fb: '' },
          { t: 'A row was replaced by an update', fb: 'An update is `u`.' },
          { t: 'A row was rolled back', fb: 'A rolled-back change is never in the log, so it is never a message.' },
          { t: 'A message that was read twice', fb: 'A repeat has the same content and the same position, and its `op` is what it was.' }
        ],
        ok: 0, why: 'The snapshot sent **' + OPS.r + '** messages with `r`, one for each order of the table. Without it, those orders would never have an event, because they were inserted before the connector existed.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Which field says in what order the changes of the database happened?',
        opts: [
          { t: '`source.lsn`, the position in the Postgres log', fb: '' },
          { t: 'The offset of the message in Kafka', fb: 'The offset orders the messages of the topic. A message that is sent again gets a **new** offset, for the same change.' },
          { t: '`updated_at`, a column of the row', fb: 'Another system can write any value in it, and a delete has none.' },
          { t: 'The time when Spark read the message', fb: 'It says when Spark read it, and not when the change happened.' }
        ],
        ok: 0, why: 'The `lsn` belongs to the **change**: a duplicate has the same `lsn` and a new offset. That is why the merge of silver uses it, and the next mission shows what happens when it does not.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'The connector stops for a day, and Postgres keeps writing. What does Postgres do with its log?',
        opts: [
          { t: 'It keeps the part that the replication slot has not confirmed, so that the connector can continue', fb: '' },
          { t: 'It deletes the log as usual, and the connector loses the changes', fb: 'A slot exists to prevent that.' },
          { t: 'It stops accepting writes until the connector is back', fb: 'Writes go on. The log grows.' },
          { t: 'It sends the changes to Kafka by itself', fb: 'Postgres never talks to Kafka.' }
        ],
        ok: 0, why: 'This is what the stop of the connector showed in the recording: the slot was **released**, Postgres kept the log, and after the restart **' + RUNS.backlog.new_messages + '** changes came with nothing lost. The cost is the disk, and a mission of its own.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2,
        q: 'Why does the connector read a snapshot of the table first?',
        opts: [
          { t: 'The rows that were there before the connector started have no change event, so silver would miss them', fb: '' },
          { t: 'To check the password', fb: 'That is the login.' },
          { t: 'To make the topic faster', fb: 'It makes the topic bigger.' },
          { t: 'Because Kafka needs one message for each partition', fb: 'The snapshot is about the table, not about Kafka.' }
        ],
        ok: 0, why: 'The slot starts at the position where it was created. Everything before it needs the snapshot. In the recording the snapshot gave **' + R1.new_messages + '** messages, and the gate confirmed that silver matched the **' + R1.new_messages + '** rows of Postgres.'
      }),

      B.quiz({
        id: 'm1-q5', t: 3, src: 'rec',
        q: 'With the default replica identity, what can you trust in the `before` of a delete, and in the `before` of an update?',
        opts: [
          { t: 'Only the key of a delete, and nothing at all in an update, where `before` is null', fb: '' },
          { t: 'The whole old row, in both', fb: 'That needs `REPLICA IDENTITY FULL`, and it is shown in a later mission.' },
          { t: 'Only the status, in both', fb: 'Neither carries the status.' },
          { t: 'The time of the change', fb: 'The time is in `source`, not in `before`.' }
        ],
        ok: 0, why: 'Both recorded events show it: the update has `before: null`, and the delete has the key with **placeholders** (`store_id` 0, an empty `status`). A pipeline that copies `before` into a table writes those placeholders as data.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision (ADR 1): how to capture the changes of the database',
        scenario: 'The orders are in PostgreSQL, and the data team needs every change, deletes included, in a few seconds, without slowing the shop. The team of three can run a Kafka Connect worker.',
        opts: [
          { t: 'Log-based capture with Debezium, through a replication slot', d: 'It sees every committed change, the deletes and the order of the log, and it does not query the table again and again.', lose: 'A slot to watch (it holds the log), a Connect worker to run, and a setting (`wal_level`) that needs a restart.' },
          { t: 'A job that polls the table for rows with a newer `updated_at`', d: 'No change of the database, and easy to write.', lose: 'It never sees a delete, it misses a row that is updated without a new `updated_at`, and every poll is a query on the shop database.' },
          { t: 'Triggers that write each change to an audit table', d: 'Every change is in a table, deletes included, with no new service.', lose: 'Every write of the shop pays for a second write, and the audit table must be read, cleaned and kept in order by someone.' }
        ],
        pick: 0,
        why: 'The recording shows what the choice buys: **' + OPS.d + '** deletes arrived as events, two changes of one order in one transaction arrived as two messages, and a stop of the connector lost nothing. This is a design judgement, and the other two options were not built.',
        when: 'For a table that never changes its rows and never deletes, a polling job is a smaller thing to run. For a source that is not a database with a log, there may be no choice.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Capturer', color: '#CBD5E1',
        pts: [
          'The database side is small: `wal_level = logical`, a **publication**, a **replication slot** and a role with `REPLICATION`.',
          'The connector reads the **log**, not the table. A **snapshot** comes first (**' + R1.new_messages + '** messages with `r`), and then each change is **one message**.',
          'Every message has an **`op`**, a row in `after`, and `source.lsn`, the **position in the log**. The `lsn` identifies the change, and a duplicate has the same one.',
          'A **delete** has no `after`. Its `before` has the **key** and **placeholders**, so only the key can be trusted. An update has `before: null` with the default identity.',
          'The first run: **' + R1.inserted + '** orders in silver, and all **5** gate checks passed.'
        ],
        lines: [
          'I read the log, and I do not poll.',
          'I identify a change by its position, not by its arrival.',
          'I trust the key of a delete and nothing else.'
        ]
      })
    ]
  });
})();
