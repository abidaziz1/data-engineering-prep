/* Mission 7: boss round. Two drills that mix the missions, a design decision, a coding round that ran on the real JDK 21, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var NS = C('num.sums'), MEMC = C('mem'), GC = C('tool.gc'), K = C('conc'), CH = C('challenge');
  var CP = C('build.classpath'), MP = C('maven.package'), MT = C('maven.tree'), MR = C('maven.run'), MC = C('maven.conflict'), MF = C('maven.failing_test');
  var T = X('jdbc.run'), rb = /rows after (\d+) batches: (\d+)/.exec(T), inj = /glued into the text: (\d+) rows, bound as a parameter: (\d+) rows/.exec(T), tx = /inside the transaction: (\d+)\nafter the rollback: (\d+)/.exec(T), dup = /SQLState (\d+)/.exec(T);
  var serFail = /failed: (java\.io\.NotSerializableException: \S+)/.exec(X('conc.ser'));
  var short3 = K.plain_short_in_runs.filter(Boolean).length;
  var SOLF = G.file('Challenge.java'), SOL = G.lines(SOLF, G.at(SOLF, /static long parseCents/), G.span(SOLF, /static Map<Integer, Long> centsByStore/, /^    }$/)[1]);
  G.expect(CH.output === CH.expected && /^refused: /.test(CH.refused) && CH.stores === 3, 'the coding round solution prints the cents by store that Python worked out, and refuses a third decimal');
  G.expect(NS.double_sum !== NS.bigdecimal_sum && NS.bigdecimal_sum === '100000.00', 'a million additions of 0.10 differ between double and BigDecimal');

  var QA = [['qa-javac', 1], ['qa-classpath', 1], ['qa-maven', 1], ['qa-shade', 2],
    ['qa-records', 1], ['qa-lazy', 1], ['qa-immutable', 1], ['qa-optional', 1],
    ['qa-money', 1], ['qa-bigdecimal', 2], ['qa-javatime', 1], ['qa-dst', 2],
    ['qa-heap', 1], ['qa-bigfile', 1], ['qa-gc', 2], ['qa-container', 2],
    ['qa-jdbc', 1], ['qa-inject', 1], ['qa-tx', 1], ['qa-junit', 1],
    ['qa-race', 1], ['qa-pool', 1], ['qa-serial', 2], ['qa-sync', 2]];

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a decision, a coding round, a mock interview and a one-page review', minutes: 36,
    focus: ['src', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'th'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write **cents by store** from a stream of lines, in the way that an interviewer expects.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm7-drill1', t: 1, src: 'rec', title: 'Drill 1: the total is a few cents off, and Mondays kill the job', time: '07:05',
        alert: '**Finance says that the total of the Java loader differs from the stores\' figure by a few cents, and on Mondays the loader stops with `java.lang.OutOfMemoryError: Java heap space`.** The loader adds the amounts as `double` and reads the file with `Files.readAllLines`. It runs with `-Xmx64m`, and Monday\'s file is twenty times bigger than a weekday\'s.',
        clues: ['The amounts are added as `double`', 'All the lines are in a list at the same time', 'The heap limit is 64 MB and the file is large'],
        opts: [
          { t: 'Read the file line by line, parse each amount to cents with `BigDecimal` from text, and add the cents in a `long`', fb: '' },
          { t: 'Raise `-Xmx` and round the total to two decimals', fb: 'The heap fails again on a bigger file, and rounding hides an error that has a cause.' },
          { t: 'Use `float` instead of `double`', fb: '`float` is less exact than `double`.' },
          { t: 'Catch `OutOfMemoryError` and retry the job', fb: 'The retry fails the same way, and a JVM that ran out of memory is not in a state to trust.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 3**: a million additions of `0.10` gave `' + NS.double_sum + '` as a `double` and `' + NS.bigdecimal_sum + '` as a `BigDecimal`. Money is a number of **cents in a `long`**, parsed from text. **Mission 4**: a list of the lines of a file of ' + n(MEMC.file_mb) + ' MB did not fit 64 MB (`' + MEMC.oom_message + '`), and a `BufferedReader` summed the same file in 32 MB and printed `' + MEMC.sum_output + '`.',
        checks: [
          ['Compare the total with the stores', 'A difference of cents, not of orders.'],
          ['Read the type of the amount', 'A `double`.'],
          ['Read the error of Monday', 'Heap space, with a list of all the lines.'],
          ['Fix both', 'Parse cents from text, read in a loop, keep a running total.']
        ],
        tell: 'The loader added amounts as double, which is not exact for decimals, and it held every line of the file in memory, which fails when the file is large. I changed it to read line by line, parse each amount to cents from text and add the cents in a long, and I tested it with a file of a million lines in a small heap. I will compare the total with the stores every day.',
        prevent: ['Money is **cents in a `long`**, parsed from **text**', '**Stream** inputs of unknown size', 'Compare the **total** with the source every day']
      }),

      B.incident({
        id: 'm7-drill2', t: 2, src: 'rec', title: 'Drill 2: it runs on the laptop and fails on the cluster, twice', time: '14:40',
        alert: '**A new version of the job ran fine on a laptop and failed on the cluster with `NoClassDefFoundError: org/apache/commons/csv/CSVFormat`. You fixed that, and now the first task fails with `java.io.NotSerializableException`.** The job is built with Maven, and the cluster runs `java -jar` on the file in `target`. The change of this week put a database connection into the object that holds the settings.',
        clues: ['The build made a thin jar and a shaded one, and the cluster got the thin one', 'The second error names a class that holds a connection', 'On the laptop everything runs in one JVM'],
        opts: [
          { t: 'Ship the shaded jar, remove the connection from the settings object, pass the URL, and open the connection inside the task', fb: '' },
          { t: 'Copy the libraries to the cluster by hand and mark the connection `Serializable`', fb: 'A connection cannot be serialized, and a copy by hand drifts away from the build.' },
          { t: 'Run the job on the laptop from now on', fb: 'It avoids the cluster and the problem stays.' },
          { t: 'Catch the exception and continue without the connection', fb: 'The task would fail later, with a worse message.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 1**: the thin jar failed with `' + MR.thin_error + '` and a classpath without the library gave `NoClassDefFoundError`, while the shaded jar ran alone and printed `' + MR.shaded_output + '`. **Mission 6**: a record that holds a `Connection` failed with `' + serFail[1] + '`, and a connection cannot travel, so each task opens its own. Spark and a cluster did not run here. Only the Java errors were recorded.',
        checks: [
          ['Read the first error', 'A library is missing from the classpath at run time.'],
          ['Check which jar was shipped', 'The thin one, without its libraries.'],
          ['Read the second error', 'A class that holds a connection was serialized.'],
          ['Fix both', 'Ship the shaded jar, and send settings, not connections.']
        ],
        tell: 'The cluster got the thin jar, so the libraries were missing, and after that the job tried to send an open connection with the task, which cannot be serialized. I shipped the shaded jar and moved the connection out of the settings: the task gets the URL and opens its own connection. I added a test that serializes the settings object and a smoke run of the shaded jar in the build.',
        prevent: ['Run the **shaded jar** (`java -jar`) in the build', 'A test that **serializes** what the job sends', 'Keep **connections** out of task objects']
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: write the new loader in Java or in Python?',
        scenario: 'Brewline needs a loader that reads files from many stores, validates them, and writes to a database. The team has strong Python skills and two people who know Java. The job runs nightly, and the files can reach tens of millions of lines.',
        opts: [
          { t: 'Python, with a streaming reader and a test suite, and Java only if a limit appears', d: 'The team writes it faster and reads it faster. Streaming keeps the memory flat in Python as in Java (mission 4 showed it in Java).', lose: 'A tight loop in plain Python is slower than in Java, and a very large load needs a bulk path either way.' },
          { t: 'Java 21, because the job is a long-running service with strict types', d: 'The compiler catches many errors, and the JVM gives threads and memory control. A jar runs with `java -jar` after a shaded build.', lose: 'More code and a build to maintain, and only two people can review it.' },
          { t: 'A Spark job in either language', d: 'It spreads the work over a cluster.', lose: 'A cluster to run for a file that one machine can read, and the Spark courses of this library are separate.' }
        ],
        pick: 0,
        why: 'The deciding fact is the **team**, and nothing in the data forces Java. Memory is not a reason, because both can stream. Choose Java when the surrounding system is on the JVM (Kafka clients, Flink, Spark jobs in Scala or Java), when the loop is hot, or when you need its tooling. This is a judgement from documentation and experience, and I did not time a Python loader against a Java one.',
        when: 'If the job grows into a service with many threads and strict latency, or must share code with Spark or Kafka applications that are already in Java, Java becomes the better pick.'
      }),

      B.challenge({
        id: 'm7-ch', t: 1, title: 'Coding round: cents by store', file: 'Challenge.java', lang: 'java',
        q: 'Lines arrive as `order_id,store_id,status,amount`, **header first**. Write `static Map<Integer, Long> centsByStore(Stream<String> lines)` that returns the **total in cents for each store**, sorted by store id. Parse the amount from text with **`BigDecimal`**, and **refuse** an amount with more than two decimals (`ArithmeticException`) rather than rounding it. Memory must stay flat: a `Stream` is given, so do not collect the lines into a list.',
        starter: 'static long parseCents(String amount) {\n    ...\n}\n\nstatic Map<Integer, Long> centsByStore(Stream<String> lines) {\n    ...\n}\n',
        hints: ['`new BigDecimal("12.50")` is exact. `movePointRight(2)` gives 1250.', '`setScale(0, RoundingMode.UNNECESSARY)` throws `ArithmeticException` if a digit would be lost, and `longValueExact()` gives a `long`.', '`lines.skip(1)` drops the header, and `map(line -> line.split(","))` gives the fields.', '`Collectors.groupingBy(key, TreeMap::new, Collectors.summingLong(...))` groups by store and sorts the keys.'],
        sol: SOL,
        res: { cols: ['input of the program', 'output'], rows: [['6 orders in 3 stores', CH.output], ['an amount of 12.505', CH.refused]] },
        expl: ['`parseCents` turns **text** into cents with `BigDecimal`, so `0.99` is exactly 99. `UNNECESSARY` refuses `12.505`: the run printed `' + CH.refused + '`.', '`skip(1)` removes the header, and the stream is read **one line at a time**, so the memory does not depend on the file. The caller closes the stream: `try (Stream<String> s = Files.lines(path))`.', '`groupingBy` with a `TreeMap` and `summingLong` adds the cents of each store and sorts by id. The result was `' + CH.output + '`, the same as the numbers that Python worked out from the same rows.'],
        cx: 'Add a `status` check if refunds count as negative, handle a line that is short or empty with a clear error that names the line, and for a file with millions of stores group in a database, because the map holds one entry for each store.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm7-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the recording on the real JDK ' + M('java_version') + ', Maven ' + M('maven') + ' and H2. Sections marked (docs) come from documentation and did not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Build', items: ['`java File.java` compiles in memory and runs. A real project is built with **Maven**: `mvn package` ran **' + MP.tests_run + '** tests and made a jar', 'A library missing at run time is `NoClassDefFoundError`. A `-cp` with the library printed `' + CP.with_output + '`', 'A dependency tree of **' + MT.lines + '** lines held ' + MT.direct + ' direct libraries. **Nearest wins**: a pinned `commons-io` of ' + MC.chosen_io_version + ' broke a library that wanted ' + MC.wanted_io_version, 'A thin jar fails alone (`' + MR.thin_error + '`). The **shaded jar** printed `' + MR.shaded_output + '`'] },
          { h: 'Language', items: ['A **record** is an immutable value with equals, hashCode and toString. `List.of` is immutable: `add` raised `UnsupportedOperationException`', 'A stream is **lazy**: nothing runs until the terminal step, and `limit` stops reading', '`Optional` for "may be missing". Do not call `get()` without a check'] },
          { h: 'Numbers and time', items: ['`0.1 + 0.2` is `' + X('num.numbers').split('\n')[1] + '`. A million additions of 0.10: `' + NS.double_sum + '` as a `double`, `' + NS.bigdecimal_sum + '` as a `BigDecimal`', '`BigDecimal` from **text**, never from a double. `divide` without a scale threw `Non-terminating decimal expansion`. `addExact` threw `integer overflow`', 'Money is **cents in a `long`**. `java.time` for dates: `LocalDate`, and a **zone** for an instant. `LocalDate.parse("2026-02-30")` is refused'] },
          { h: 'Memory', items: ['**Heap** holds objects, `-Xmx` is its limit. The default here was **' + n(GC.max_heap_mb) + ' MB** with ' + (GC.g1_is_default ? 'G1' : 'another collector'), '`readAllLines` of ' + n(MEMC.file_mb) + ' MB failed at 64 MB (`' + MEMC.oom_message + '`). `Files.lines` counted **' + n(MEMC.lines) + '** lines at 64 MB. A `BufferedReader` summed the file at 32 MB', 'A container can die with the heap half full: the process uses more than the heap (docs)'] },
          { h: 'JDBC and tests', items: ['`PreparedStatement`, **bind** every value. Glued: **' + n(+inj[1]) + '** rows matched. Bound: **' + inj[2] + '**', 'A batch: **' + n(+rb[2]) + '** rows in **' + rb[1] + '** batches. A transaction: **' + tx[1] + '** rows inside, **' + n(+tx[2]) + '** after `rollback()`. Duplicate key: SQLState `' + dup[1] + '`', 'JUnit 5 runs in the build. A wrong expectation (`1251` against `1250`) ended in `BUILD FAILURE` and no jar'] },
          { h: 'Threads and serialization', items: ['`plain++` is read, add, write. A plain `int` was short in **' + short3 + ' of ' + K.runs + '** runs. `AtomicInteger`: **800,000**', 'A pool of 4 returned **' + K.pool_sum + '**. **' + n(K.virtual_finished) + '** virtual threads finished. CPU work: cores (' + K.cpus + ' here). Waiting work: more threads', 'A record with a `Connection`: `' + serFail[1] + '`. `transient` skips a field. Send the URL and open the connection in the task'] }
        ]
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Java Partner', color: '#C7D2FE',
        pts: [
          'You can **build and run** a program, read `NoClassDefFoundError`, a **dependency tree** and a **version conflict**, and ship a **shaded jar**.',
          'You write **records and streams**, and you keep money in **cents** and time in **`java.time`**.',
          'You read an **`OutOfMemoryError`** and **stream** big inputs instead of holding them.',
          'You load a database with **bound parameters, batches and a transaction**, and you test it.',
          'You can explain a **race**, size a **pool**, and say why a **connection cannot be serialized**.'
        ],
        lines: [
          'I can explain what the program did, and why.',
          'I can recover from my own mistakes.',
          'I can talk to the people who run the platform.'
        ]
      })
    ])
  });
})();
