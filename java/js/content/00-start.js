/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };
  var GC = G.counts('tool.gc');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'From a .java file to a running job', g: 'jvm', legend: true,
        steps: [
          { say: 'Brewline has a small Java program that loads a file of orders into a database. This picture is the whole course: what turns your text into a running process, and where each thing that can go wrong happens. Press Next.', focus: ['src', 'javac', 'cls', 'jvm', 'heap'], cap: 'Source on the left, the running program on the right.' },
          { say: 'Step 1. You write **source** in `.java` files. A type error is found at the next step, before anything runs. Mission 1 starts here.', on: ['e1'], focus: ['src', 'javac'], tags: ['tg_err'], cap: 'You write text.' },
          { say: 'Step 2. **`javac`** compiles the source into **bytecode**. It refused a `String` where an `int` belongs, and it made no class file. Mission 1 shows the message.', on: ['e2'], focus: ['javac', 'cls'], cap: 'The compiler checks the types.' },
          { say: 'Step 3. The bytecode sits in `.class` files, usually packed in a **`.jar`**. Libraries are jars too, and **Maven** is what fetches them and puts them where the JVM looks. A version that Maven picks wrongly breaks the job here.', on: ['e3'], focus: ['cls', 'jvm'], tags: ['tg_cp'], cap: 'The JVM loads what is on the classpath.' },
          { say: 'Step 4. The **JVM** runs the bytecode. Objects live on the **heap**, and the garbage collector frees what nothing refers to. On this machine the collector is **' + (GC.g1_is_default ? 'G1' : 'not G1') + '** and the heap may grow to **' + G.n(GC.max_heap_mb) + ' MB** by default. Missions 4 and 6.', on: ['e4'], focus: ['jvm', 'heap'], tags: ['tg_xmx'], cap: 'Objects live on the heap.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'You are asked about Java because the tools of data engineering run on the JVM, and job posts for Spark and Kafka roles name Java next to them. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Building', 'Compile and run a program, and read a Maven build.', 'Read a dependency tree, fix a version conflict, and ship a jar that runs alone.'],
          ['The language', 'Use records, enums, collections and streams.', 'Say what is lazy, what is immutable, and which choices make a pipeline safe.'],
          ['Numbers and time', 'Know that money is not a double.', 'Choose rounding, count in cents, and handle a day with 23 hours.'],
          ['Memory', 'Read an OutOfMemoryError.', 'Stream a file that is bigger than the heap, and tell a heap error from a container that was killed.'],
          ['Databases', 'Run a query with JDBC and a PreparedStatement.', 'Batch, use transactions, and keep a load from being half done.'],
          ['Threads', 'Use an ExecutorService.', 'Explain a race, choose between a pool and virtual threads, and read a thread dump.'],
          ['Tests', 'Run the unit tests of a build.', 'Write a test that fails for the right reason and keep the build honest.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are what your own code does: build it, write it, and count with it. A junior does them. A senior can say why they go wrong.' },
          { upto: 7, say: 'The last four rows decide whether a night is calm. They carry most of the questions of a senior interview.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it with the real JDK or Maven and wrote down what it printed and did. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'OpenJDK ' + M('java_version') + ' and Maven ' + M('maven') + ' on one machine, with made-up Brewline data. Every program on the screens is a file that ran as it is, and its output is the output that it printed. Nothing is timed.', 'The programs are the files that ran.'],
          ['Where Java ends', 'Spark, Kafka, Flink and Hadoop have their own courses, so they did not run here. The database of the JDBC lessons is H2, which runs inside the program. Other JDKs and other garbage collectors did not run either.', 'The big tools and a database server did not run.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The JDK', M('vm') + ', Java ' + M('java_version') + ': javac, java, javap and jar', 'Run'],
          ['Maven', 'Maven ' + M('maven') + ', with the compiler, surefire, jar, dependency and shade plugins and JUnit 5', 'Run'],
          ['Libraries', 'commons-csv, commons-io, commons-lang3 and the H2 database, from Maven Central', 'Run'],
          ['Data', 'Orders from fixed rules (no random numbers): 50 rows for the loader and a file of a million lines for the memory lessons', 'Run'],
          ['Other JDKs', 'Java 25, the newer long-term release, and Java 17, and the differences between them', 'Not run'],
          ['Spark, Kafka, Flink, a database server, a connection pool, Gradle', 'They have courses or sections of their own, or need more than this machine had', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran. They are everything you need to see a compiler, a build, a conflict, a heap and a race behave.' },
          { upto: 6, say: 'The last two rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
