/* Mission 0: pick a path, see the whole pipeline, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), R1 = RUNS.snapshot, R2 = RUNS.changes, R3 = RUNS.replay, A2 = C('after_changes'), T = C('tests');
  G.expect(R1.new_messages === 200 && R1.inserted === 200 && R2.new_messages === 87 && R2.inserted === 50 && R2.updated === 36 && R3.left === 86 && A2.live === 245 && A2.deleted === 5 && A2.silver === 250 && T.passed === 8, 'the snapshot has 200 messages, the day of changes 87, silver holds 250 rows (245 live), the replay leaves 86 alone, and 8 tests pass');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole pipeline', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'The pipeline in one picture', g: 'pipeline', legend: true,
        steps: [
          { say: 'Brewline keeps its orders in a PostgreSQL database. The data team wants a table that follows every change of that database, deletes included, without asking it questions all day. This picture is the whole project. Press Next.', focus: ['pg', 'dbz', 'kfk', 'brz', 'slv', 'gate'], cap: 'The database, and the table that follows it.' },
          { say: 'Step 1. Postgres writes every committed change to its **log**. A **replication slot** marks how far the reader has got, and Postgres keeps the log that the slot has not confirmed.', on: ['e1'], focus: ['pg', 'dbz'], tags: ['tg_slot'], cap: 'The log is the source.' },
          { say: 'Step 2. **Debezium** reads the log and writes each change as **one message** to a Kafka topic: first a snapshot of the table, then the changes. Each message has a **log position**, the `lsn`.', on: ['e2'], focus: ['dbz', 'kfk'], cap: 'One message for each change.' },
          { say: 'Step 3. A Spark stream copies every message to **bronze**, as text, with its place in the topic. Nothing is parsed, so nothing is lost.', on: ['e3'], focus: ['kfk', 'brz'], cap: 'Bronze keeps every message.' },
          { say: 'Step 4. A second stream applies the messages to **silver**: the current state of each order. A message is applied only when its position is **newer** than the row, and a delete only **marks** the row.', on: ['e4'], focus: ['brz', 'slv'], tags: ['tg_lsn', 'tg_del'], cap: 'The current state.' },
          { say: 'Step 5. A **gate** compares silver with the layer before it.', on: ['e5'], focus: ['slv', 'gate'], cap: 'A check.' },
          { say: 'Step 6. The gate also reads **Postgres itself**, so a message that never arrived makes it fail. Everything ran for real, on Spark **' + M('pyspark') + '**, Kafka **' + M('kafka') + '** and Debezium **' + M('debezium') + '**.', on: ['e6'], focus: ['pg', 'gate'], cap: 'The gate asks the database.' }
        ]
      }),

      B.talk({
        id: 'm0-layers', t: 1, src: 'rec', title: 'What each part promises',
        say: 'Each part of the pipeline makes one promise to the part after it. Press Next to read them.',
        items: [
          ['The log', 'Every **committed** change, in order, each with a **position**. A change that was rolled back is not in it. After the day of changes, the topic held **' + n(C('topic').changes) + '** messages.', 'Every change, in order.'],
          ['Debezium and Kafka', 'Each change as **one message**, **at least once**: a restart can send a message again. They never promise exactly once, so the next part must cope.', 'At least once.'],
          ['Bronze', 'Every message as **text**, with its partition and offset. After the day of changes it held **' + n(A2.bronze) + '** rows.', 'Nothing is lost.'],
          ['Silver', '**One row for each order**: **' + A2.live + '** live and **' + A2.deleted + '** marked as deleted. A repeat or an old message changes nothing.', 'The current state.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm0-jd', t: 1, src: 'docs', title: 'What senior postings ask for, and where it is in this project',
        say: 'I read two analyses of data engineer postings and a sample of senior ones. Press Next to see where each skill is in the project.',
        cols: ['What postings ask for', 'Where it is in the project', 'Status'],
        hl: 1,
        rows: [
          ['Change data capture from a database', 'Debezium on PostgreSQL logical decoding: a snapshot, then inserts, updates and deletes', 'Run'],
          ['Kafka, or another streaming platform', 'Apache Kafka ' + M('kafka') + ' with one topic, fed by Kafka Connect', 'Run'],
          ['Spark streaming jobs', 'Structured Streaming with `foreachBatch`, one run at a time with `availableNow`', 'Run'],
          ['Delta Lake, or another table format', 'Delta ' + M('delta') + ': `MERGE`, soft deletes, a history of versions', 'Run'],
          ['At-least-once delivery, ordering, idempotency', 'A merge by log position, and a batch that ran twice and changed nothing', 'Run'],
          ['Reconciliation against the source', 'A gate that reads Postgres and compares every live row', 'Run'],
          ['A schema registry, Avro, schema changes', 'JSON without a schema. A new column is not handled', 'Not covered'],
          ['Managed services, a cluster, security, monitoring', 'One machine, no TLS, no login, no alerts', 'Not run']
        ],
        steps: [
          { upto: 6, say: 'The first six rows are the core of a change data capture posting, and the project runs all of them. In the analysis of about 120,000 posts that I used for the first project, Kafka appeared in about one posting in eight, and Spark in about one in five.' },
          { upto: 8, say: 'The last two rows are what a team adds around the core. The figures come from search summaries, so they are directional, and I did not check them against the sources. I did not count how many postings name Debezium.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this walkthrough works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something run (**SEE**), makes you explore or fix it (**TRY**), then asks the question that a reviewer would ask (**SAY**). Orange blocks in a diagram are data moving.', 'Watch first, practise second, say it third.'],
          ['A project, not a course', 'The other tutorials of this library teach a tool. This one **defends a pipeline**: every file is shown, every claim has a run behind it, and the last mission is the interview talk track.', 'One pipeline, defended.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it and wrote down what it printed. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['The repository', 'The project is a folder of this library, `projects/brewline-cdc`, with a `README`, a `Makefile`, a requirements file and ' + T.passed + ' tests. The screens show its files as they are on disk.', 'You can clone it and run it.'],
          ['What went wrong on purpose', 'Five deletes, an order that changes twice in one transaction, a **crash before a commit**, a **connector that is stopped** while the shop goes on, and three bug hunts that break the merge.', 'The failures are the lesson.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The source and the capture', 'PostgreSQL ' + M('postgres') + ' with logical decoding, Kafka Connect and Debezium ' + M('debezium') + ' (from Maven Central), on one machine', 'Run'],
          ['The streaming platform', 'Apache Kafka ' + M('kafka') + ' in KRaft mode, one broker, one partition', 'Run'],
          ['The pipeline', 'Spark ' + M('pyspark') + ' with Delta Lake ' + M('delta') + ' on Java ' + M('java') + ' and Python ' + M('python') + ', and ' + T.passed + ' pytest tests', 'Run'],
          ['A cluster, replication, several partitions', 'Brokers that can fail, and an order between partitions', 'Not run'],
          ['A schema registry, managed services, Docker, CI', 'They need accounts, servers or images that were not used', 'Not run']
        ],
        steps: [
          { upto: 3, say: 'The first three rows ran: a real database, a real log, a real connector, a real topic and a real stream. Nothing was timed, because one machine says nothing about throughput or lag.' },
          { upto: 5, say: 'The last two rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
