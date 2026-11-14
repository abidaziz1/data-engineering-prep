/* Mission 0: pick a path, see the whole platform, meet the Brewline orders, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CL = G.counts('world.cluster'), SQ = G.counts('sql.stream_summary');
  G.expect(CL.taskmanagers === 2 && CL.slots_total === 4 && CL.version === '2.2.1', 'a cluster of two TaskManagers with four slots, Flink 2.2.1');
  G.expect(SQ.input_orders === 12 && SQ.batch_rows === 7 && SQ.replay_equals_batch === true, 'twelve orders, seven stores, and a streaming result that ends as the batch result');
  var OR = G.table('sql.orders');
  var orderStores = {}, nullCustomers = 0, refunds = 0;
  OR.rows.forEach(function (r) { orderStores[r[1]] = (orderStores[r[1]] || 0) + 1; if (r[2] === 'null') nullCustomers++; if (r[4] === 'refunded') refunds++; });
  G.expect(Object.keys(orderStores).length === 7 && orderStores.s01 === 5 && nullCustomers === 3 && refunds === 3, 'seven stores in the twelve orders, five of them for s01, three without a customer and three refunds');
  var TOOLS = 'Apache Flink ' + G.meta('flink') + ' (a standalone cluster of one JobManager and two TaskManagers on Java ' + G.meta('java') + ') with its SQL client and its flink command, the Kafka connector ' + G.meta('kafka-connector') + ', Apache Kafka ' + G.meta('kafka') +
    ', the Flink CDC connector ' + G.meta('flink-cdc') + ' with PostgreSQL ' + G.meta('postgresql') + ', and a Java job that I compiled';

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 8,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline and Flink: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee in six countries. Its orders reach the warehouse in a nightly batch, so the shops learn what sold yesterday, tomorrow. The team wants to count orders as they happen. That is a job for a stream processor, and this course teaches the one that job descriptions name most: Apache Flink. Press Next to walk through the whole platform.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. The sources. Orders sit in Kafka topics. Changes to a customer table in PostgreSQL arrive from its log. Some data is in files. Flink reads all three with **connectors**.', on: ['m1'], focus: ['f_src', 'f_job'], cap: 'Kafka, a database log and files.' },
          { say: 'Step 2. The job. It is a program, written in SQL or in Java, that the cluster runs for as long as you leave it. It turns a stream into counts and joins, by the time at which things happened, and it keeps state for every key.', on: ['m2'], focus: ['f_job', 'f_snk'], cap: 'A job that never ends, with state.' },
          { say: 'Step 3. The sinks. The results go to Kafka topics, to lake tables, to files and to databases. A sink has a promise to keep: written once, or at least once.', on: ['m3'], focus: ['f_snk', 'f_use'], cap: 'Results go back out.' },
          { say: 'Step 4. Use. Dashboards, alerts and other services read what the sinks hold. A good data engineer asks what happens to them when the job restarts.', focus: ['f_use'], cap: 'Someone reads the result.' },
          { say: 'Around the flow sit five topics, and each one has a mission. The cluster that runs the job. Time, which decides what is late. State, which the job keeps for every key. Checkpoints, which let it recover. Metrics, which tell you it is slow.', focus: ['x_clu', 'x_time', 'x_state', 'x_ckpt', 'x_met'], keepGroups: true, cap: 'Five topics around the flow.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same topics, different expectations. Press Next to read the gap area by area. A senior is judged on what happens when a machine dies, a source is late or a query changes, not on knowing more setting names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['The cluster and a job', 'Say what a JobManager, a TaskManager and a slot are.', 'Read a job graph, size parallelism against slots, and explain chaining.'],
          ['Flink SQL', 'Write a query and say that a streaming result changes.', 'Read a changelog, choose between append and upsert sinks, and spot a query that retracts.'],
          ['Time and windows', 'Say what event time and a watermark are.', 'Choose the delay, the window and the late-data rule, and debug a window that never fires.'],
          ['State and checkpoints', 'Say that state is kept for each key and checkpoints save it.', 'Choose the state backend, tune checkpoints, and explain exactly-once with a transactional sink.'],
          ['Recovery and savepoints', 'Say the difference between a checkpoint and a savepoint.', 'Upgrade a job with a savepoint, keep operator ids stable, and change parallelism safely.'],
          ['Connectors', 'Read from and write to Kafka.', 'Use upsert sinks, startup modes and change data capture, and know what a sink commits on a checkpoint.'],
          ['Joins and state growth', 'Write a join.', 'Know which joins keep state forever, bound them in time, and set a time to live on purpose.'],
          ['The DataStream API', 'Say when to use it instead of SQL.', 'Write a keyed process function with state and a timer, and name every operator.'],
          ['Running it', 'Open the web UI and find a failed job.', 'Read backpressure and checkpoint metrics, scale a slow step, and choose a way to deploy.']
        ],
        steps: [
          { upto: 2, say: 'The core: the cluster, a job and SQL. A junior knows the words. A senior can look at a plan or a changelog and say what is wrong.' },
          { upto: 6, say: 'The parts that make Flink different from a batch tool: time, state, checkpoints and connectors. This is where most of the interview questions are.' },
          { upto: 9, say: 'Joins, Java and operations. They decide whether the job is still healthy, and cheap, in a year.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have run streaming jobs already: it includes every junior topic and adds the state, recovery and upgrade decisions. **Everything** adds the finer points and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'rec', title: 'Meet the Brewline orders',
        steps: [
          {
            say: 'These are the orders that the course uses. They are made up, and the same on every run. They are the first twelve orders of the Kafka course, so if you took it, you know them. Each is a small record: an order number, the store, the customer, the price in cents, the status and the channel. Press Next.',
            tabs: [{ layer: 'DATA', name: 'The first twelve orders', c: 'raw', cols: OR.cols, rows: OR.rows, trk: 0 }],
            notes: ['Made up from a fixed rule, so every number in the course can be checked. ' + Object.keys(orderStores).length + ' stores appear in these twelve orders; store s01 sells ' + orderStores.s01 + ' of them.']
          },
          {
            say: 'Three facts about the orders decide many lessons. One store is far bigger than the others. Some orders have no customer, so a value can be null. And some orders are refunds.',
            tabs: [{
              layer: 'FACTS', name: 'What is special about these orders', c: 'raw', cols: ['Fact', 'In the twelve orders', 'What it does to the lessons'],
              rows: [['Busiest store', 's01: ' + orderStores.s01 + ' of ' + OR.rows.length, 'one key gets a third of the records: a busy task'], ['Guests', nullCustomers + ' orders with a null customer', 'nulls in a join and in a schema'], ['Refunds', refunds + ' of ' + OR.rows.length, 'a status that a query filters on']],
              trk: 0
            }],
            notes: ['The same shape as in the Kafka course. In the larger runs of mission 4 and mission 7, store s01 again sells about a third of the orders.']
          },
          {
            say: 'People matter as much as tools. Application teams write the producers. Data engineers write the Flink jobs. An operator runs the cluster and watches the numbers. Each one needs something different from Flink: a result that is right, a job that recovers, a number that says why it is slow.',
            tabs: [{
              layer: 'PEOPLE', name: 'Who needs what', c: 'raw', cols: ['Who', 'Does', 'Needs from Flink'],
              rows: [['Application teams', 'send orders to Kafka', 'a topic that stays readable when a job restarts'], ['Data engineers', 'write the jobs in SQL or Java', 'correct results, state that does not grow forever'],
                ['The operator', 'runs the cluster', 'metrics that say where it is slow, and a safe way to upgrade'], ['Analysts', 'read the results', 'a number that is late, never wrong']],
              trk: 0
            }],
            notes: ['Mission 8 puts the operator to work: a slow step, then more parallel tasks.']
          }
        ]
      }),

      B.talk({
        id: 'm0-version', t: 1, src: 'docs', title: 'Which release this is, and what came after it',
        say: 'Flink ships new releases a few times a year, so a course owes you its version. Press Next.',
        items: [
          ['This course', 'Apache Flink **' + G.meta('flink') + '**, with the Kafka connector **' + G.meta('kafka-connector') + '** and the Flink CDC connector **' + G.meta('flink-cdc') + '**. A connector is built for one Flink release: the part after the dash in its name is the Flink version it was built against.', 'Connectors name their Flink version.'],
          ['The release after it', 'Flink 2.3.0 came out in June 2026, after this course was recorded. When I checked on 14 November 2026, the Kafka connector had no build for 2.3 on Maven Central, so the course stays on 2.2. The release notes of 2.3 list, among other things, two SQL functions for changelogs (`FROM_CHANGELOG` and `TO_CHANGELOG`), a native S3 file system, an application level in the web UI and the REST interface, and an opt-in partitioner that sends records to the least busy downstream task.', 'Look at the notes before you upgrade.'],
          ['Java', 'The documentation of 2.2 calls Java 17 the recommended version and the Java 21 support experimental. The cluster of this course ran on Java 21, with the JVM options that the distribution ships for it, and the Java job was compiled for release 17.', 'Java 17 is the recommended one.'],
          ['What a number here means', 'Every recorded number is a number from 2.2.1 on one machine. A default can change between releases, so look it up in the documentation of the release that you run. The README of the course lists what to check again.', 'Check the release you run.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + TOOLS + '. The tables, the changelogs, the plans, the errors and the numbers are what those programs really printed. A **From documentation** tag means the fact comes from the public documentation as I could read it.', 'Recorded, or from documentation. Never mixed up.'],
          ['What one machine can show', 'Everything ran on **one machine**: a JobManager and two TaskManagers, each its own process, with a Kafka broker next to them. The plans, the slots, the state, the checkpoints and the errors are real, and so is the TaskManager that I killed with signal 9. What one machine cannot show is a **network** between the processes, a real load and a long run. I say so where it matters.', 'Real processes, no real network.'],
          ['What was not run', 'No Kubernetes and no Flink Kubernetes Operator, no YARN, no high availability with ZooKeeper, no managed service such as Amazon Managed Service for Apache Flink, and no lake table format on object storage. Those parts are described from documentation, and tagged that way. **Times are never shown**: a laptop run says little about a cluster. Counts, sizes and rows are.', 'Counts and sizes are recorded. Times are not.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
