/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 6,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'A write travels through MongoDB', g: 'stream', legend: true,
        steps: [
          { say: 'Brewline keeps its orders in MongoDB, and a data engineer reads them out. This picture is the whole course: where a write goes, and where each thing that can go wrong happens. Press Next.', focus: ['app', 'log', 'str', 'job', 'lake'], cap: 'A write, and what reads it.' },
          { say: 'Step 1. Your app **writes**: an insert, an update or a delete. Mission 1 shows what a document may look like, and what the server accepts.', on: ['e1'], focus: ['app', 'log'], cap: 'Writes come in.' },
          { say: 'Step 2. Every write goes to the **oplog**, the log of the replica set. Missions 2 and 3 are about reading the data: a pipeline, and an index.', on: ['e2'], focus: ['log', 'str'], tags: ['tg_events'], cap: 'The oplog keeps every write.' },
          { say: 'Step 3. A **change stream** gives your job one event for each write. Mission 4 shows the events, and what an update event holds.', on: ['e3'], focus: ['str', 'job'], cap: 'A job reads the events.' },
          { say: 'Step 4. The job keeps a **resume token**. If it stops, it starts again from the token and misses nothing that the oplog still holds. This course ran on a real **mongod ' + M('mongod') + '**.', on: ['e4'], focus: ['job', 'tok'], tags: ['tg_resume'], cap: 'A token to resume from.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'A data engineer meets MongoDB as a source. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Documents', 'Read nested documents and arrays.', 'Say what the shapes of a collection hide: missing against null, a type that changed, a document that grew.'],
          ['Queries', 'Write a find and a simple aggregation.', 'Write a pipeline that filters early, and say what each stage does to the number of documents.'],
          ['Indexes', 'Say that an index makes a query faster.', 'Read `explain`, order the fields of a compound index, and say what an index costs.'],
          ['Loading', 'Insert and update documents.', 'Make a load safe to repeat, validate the shape, and use a transaction when it is needed.'],
          ['Change data', 'Know that changes can be streamed.', 'Resume a change stream, and say what an update event holds and does not hold.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about reading data well. A junior does them. A senior can say why a query is slow.' },
          { upto: 5, say: 'Loading and change data decide whether a lake stays in step with the source. They carry most of the senior questions.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving.', 'Watch first, practise second, say it third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it on a real server and wrote down what it printed. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'A real **mongod ' + M('mongod') + '** in a Docker container, as a replica set of one member, and the driver **pymongo ' + M('pymongo') + '**. The programs on the screens are Python files that ran as they are, on 20,000 made-up orders. Nothing is timed.', 'The setup is on the next screen.'],
          ['A short course', 'This is a brief course: four missions and a boss round. It teaches what a data engineer needs from MongoDB, and it is not a course for people who build applications on it.', 'Short on purpose.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The server', 'MongoDB ' + M('mongod') + ' from the image ' + M('image') + ', one replica set member', 'Run'],
          ['The driver', 'pymongo ' + M('pymongo') + ', in Python', 'Run'],
          ['The data', '20,000 orders and 12 stores, built from fixed rules (no random numbers)', 'Run'],
          ['A sharded cluster, Atlas, Atlas Search', 'They need more than one machine, or an account', 'Not run'],
          ['mongosh, other drivers, the Kafka connector', 'The ideas are the same, and they were not run', 'Not run']
        ],
        steps: [
          { upto: 3, say: 'The first three rows ran. They are everything you need to see a document, a pipeline, an index, a validation rule and a change stream behave.' },
          { upto: 5, say: 'The last two rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
