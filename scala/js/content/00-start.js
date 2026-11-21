/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'A .scala file becomes a running job', g: 'compile', legend: true,
        steps: [
          { say: 'Brewline has small Scala programs: one reads orders and adds them up, one runs on Spark. This picture is the whole course: what turns your text into a running process, and where each thing that can go wrong happens. Press Next.', focus: ['src', 'scalac', 'cls', 'jvm', 'lib'], cap: 'Text becomes a running job.' },
          { say: 'Step 1. You write **source** in `.scala` files. The compiler reads them next. Mission 1 starts here.', on: ['e1'], focus: ['src', 'scalac'], tags: ['tg_err'], cap: 'You write text.' },
          { say: 'Step 2. **`scalac`** checks the types and writes **bytecode**. It refused a `String` where an `Int` belongs, and it made no class file. Mission 1 shows the message.', on: ['e2'], focus: ['scalac', 'cls'], cap: 'The compiler checks the types.' },
          { say: 'Step 3. The bytecode sits in `.class` files, usually in a **jar**. The JVM finds them on the **classpath**. A library of another Scala version breaks the job here, and the compiler does not warn you. Mission 1 shows it.', on: ['e3'], focus: ['cls', 'jvm'], tags: ['tg_cp'], cap: 'The classpath decides what loads.' },
          { say: 'Step 4. The JVM runs the program, and it needs the **Scala library** next to it. This course ran **Scala ' + M('scala') + '** on **Java ' + M('java_feature') + '**, the Scala that **Spark ' + M('spark') + '** is built with. Without the library the JVM fails with `NoClassDefFoundError`.', on: ['e4'], focus: ['jvm', 'lib'], tags: ['tg_lib'], cap: 'The library must be on the classpath.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'You are asked about Scala because Spark is written in it, and job posts for Spark roles name Scala next to Python. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Building', 'Compile and run a program, and read a compiler error.', 'Read a binary-version failure, choose the Scala version of a job, and ship a jar that runs alone.'],
          ['The language', 'Use case classes, immutable values and a match.', 'Say what the compiler guarantees for a sealed type, and design data so that illegal states cannot be written.'],
          ['Collections', 'Use map, filter and groupBy on a List.', 'Say what is strict and what is lazy, and choose between a List, a Vector and an Iterator.'],
          ['Errors', 'Use Option instead of null.', 'Return errors as values, collect them, and decide what a job does with a bad row.'],
          ['Spark', 'Write a typed Dataset with a case class.', 'Explain what is sent to the executors, why a closure fails, and when to leave the typed API.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about the language and the build. A junior does them. A senior can say why they go wrong.' },
          { upto: 5, say: 'Errors and Spark decide whether a night is calm. They carry most of the questions of a senior interview.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, say it third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it with the real compiler, the JVM or Spark and wrote down what it printed. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'Scala ' + M('scala') + ' (the compiler and library from the pyspark package), OpenJDK ' + M('java_version') + ' and a local Spark ' + M('spark') + ' session, with made-up Brewline data. Every program on the screens is a file that ran as it is. Nothing is timed.', 'The setup is on the next screen.'],
          ['What the screens call scalac', 'The `scalac` script was not installed. I started `scala.tools.nsc.Main`, the class that the script starts, and the replays write that command as `scalac`.', 'Same compiler, shorter command.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The compiler', 'Scala ' + M('scala') + ', the version of Spark ' + M('spark'), 'Run'],
          ['An older Scala', 'Scala ' + M('scala_212') + ', from Maven Central, for the binary-version failure', 'Run'],
          ['The JVM', M('vm') + ', Java ' + M('java_version') + ': java and jar', 'Run'],
          ['Spark', 'Spark ' + M('spark') + ' in local mode, started with spark-submit, with 1,000 made-up orders', 'Run'],
          ['Scala 3', 'The new syntax and the differences from Scala 2', 'Not run'],
          ['sbt, Maven plugins, a cluster, streaming', 'The usual build tools and a real cluster need more than this machine had', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran. They are everything you need to see a compiler, a version mismatch, a match, a closure and a Dataset behave.' },
          { upto: 6, say: 'The last two rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
