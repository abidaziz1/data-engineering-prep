/* Mission 6: threads, a shared counter and what can travel. Race.java and Ser.java ran on the real JDK 21 (4 CPUs). Spark did not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var K = C('conc'), RACE = G.file('Race.java'), SER = G.file('Ser.java');
  var short3 = K.plain_short_in_runs.filter(Boolean).length, exact3 = K.atomic_exact_in_runs.filter(Boolean).length;
  var serT = X('conc.ser'), serFail = /failed: (java\.io\.NotSerializableException: \S+)/.exec(serT);
  G.expect(K.runs === 3 && K.pool_sum === 385 && K.virtual_finished === 1000 && K.is_virtual === true && K.cpus === 4 && exact3 === K.runs, 'an AtomicInteger is exact in all runs, a pool of 4 sums the squares of 1 to 10 to 385 and 1000 virtual threads finish');
  G.expect(K.plain_short_in_runs.length === K.runs && short3 > 0, 'the plain int lost updates in at least one run');
  G.expect(serFail && /transient field: serialized fine/.test(serT), 'a record with a Connection is not serializable and a transient field is');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Threads and serialization', short: 'Threads', blurb: 'A race on a shared counter, a pool, virtual threads, and what can be sent to another machine', minutes: 22,
    focus: ['th'],
    goals: [
      'See a **lost update** on a shared counter, and fix it with an **`AtomicInteger`**.',
      'Use an **`ExecutorService`** and read the results from **`Future`** objects.',
      'Say when a **virtual thread** fits.',
      'Read a **`NotSerializableException`**, and know what must be true of an object before it is sent to other machines.'
    ],
    say: 'Spark and Kafka clients run your Java code on many threads and many machines. Two ideas decide whether that code is right: a value that several threads change needs care, and an object that is sent away must be serializable. I ran both on this machine, which has ' + K.cpus + ' CPUs. Spark itself did not run.',
    scenes: [
      B.flow({
        id: 'm6-flow', t: 1, src: 'rec', title: 'Eight threads and one counter', g: 'threads', legend: true,
        steps: [
          { say: 'Eight threads each add one to a shared counter 100,000 times, so the answer must be **800,000**. Press Next.', focus: ['th', 'plain', 'atom'], cap: 'Eight threads, two counters.' },
          { say: 'Step 1. With a plain `int`, `plain++` is **three steps**: read, add, write. Two threads can read the same value, both add one, and both write the same result. **One update is lost.**', on: ['e1', 'e3'], focus: ['th', 'plain', 'lost'], tags: ['tg_race'], cap: 'Read, add, write can interleave.' },
          { say: 'Step 2. The plain counter ended **short in ' + short3 + ' of ' + K.runs + ' runs**. The total of a lost-update run is different every time, so the lab quotes none.', on: ['e3'], focus: ['plain', 'lost'], cap: 'A race gives a different wrong answer each run.' },
          { say: 'Step 3. An `AtomicInteger` does the read, the add and the write as **one atomic step**, with `incrementAndGet()`. It was exact in **' + exact3 + ' of ' + K.runs + '** runs: **800,000**.', on: ['e2', 'e4'], focus: ['th', 'atom', 'ok'], tags: ['tg_cas'], cap: 'One atomic step, no lost update.' }
        ]
      }),

      B.code({
        id: 'm6-code', t: 1, src: 'rec', title: 'Race.java: a counter, a pool and virtual threads', file: 'Race.java', lang: 'java', code: RACE,
        steps: [
          { say: 'One program with three parts. Press Next.', lines: null },
          { say: 'Two counters that **all threads share**: a plain `static int` and an `AtomicInteger`.', lines: G.span(RACE, /static int plain/, /static final AtomicInteger atomic/) },
          { say: 'Eight threads start. Each one adds one to **both** counters 100,000 times. `plain++` is not safe, and `incrementAndGet()` is.', lines: G.span(RACE, /int threads = 8/, /^        }$/) },
          { say: '`join()` waits for every thread to finish, and then the program prints what the counters hold.', lines: G.span(RACE, /for \(Thread th : all\)/, /expected "/) },
          { say: 'A **pool of 4 threads** runs ten tasks. Each task **returns** a value, and `Future.get()` waits for it. The sum of the squares of 1 to 10 is 385.', lines: G.span(RACE, /newFixedThreadPool\(4\)/, /sum of squares/) },
          { say: '**Virtual threads**: one is started for each of 1,000 tasks, and every task sleeps for 10 ms. The executor is closed by try-with-resources, which waits for all of them.', lines: G.span(RACE, /AtomicInteger done/, /virtual threads that finished/) }
        ],
        note: 'The run is `java Race.java`, three times in a row. A race gives a different result each time, so the verifier checks the **kind** of result and does not compare totals.'
      }),

      B.term({
        id: 'm6-out', t: 1, src: 'rec', title: 'What Race.java printed',
        say: 'The real output of one run.',
        lines: function () { return G.plain(X('conc.race')); },
        after: 'The plain `int` ended **short** and the `AtomicInteger` ended at **800,000**. The pool returned **' + K.pool_sum + '**, and **' + n(K.virtual_finished) + '** virtual threads finished. The last line asks the thread whether it is virtual: `' + K.is_virtual + '`. In this recording the plain counter was short in **' + short3 + ' of ' + K.runs + '** runs. That does not prove it fails every time, and it does not prove the code is safe on the run where it was exact: a race is a bug whether or not a run shows it.',
        afterKind: 'warn',
        doneSay: 'A race is a bug even on a lucky run.'
      }),

      B.widget({ id: 'm6-lab', kind: 'racelab', t: 1, src: 'rec', title: 'Lab: four ways to count' }),

      B.cmp({
        id: 'm6-fix', t: 1, src: 'rec', title: 'Ways to share a counter',
        say: 'Four ways come up in an interview. The recording covers the first two. Press Next.',
        cols: ['Way', 'What it does', 'In the recording'],
        hl: 1,
        rows: [
          ['A plain `int`', 'Read, add, write: threads overwrite each other', 'Short in ' + short3 + ' of ' + K.runs + ' runs'],
          ['`AtomicInteger`', 'One atomic step for each update', 'Exact in ' + exact3 + ' of ' + K.runs + ' runs'],
          ['`synchronized` or a `Lock`', 'One thread at a time runs the block', 'Not run here. From documentation'],
          ['No sharing: each thread counts its own, then you add them', 'Nothing to race on', 'Not run here. The pool of 4 returned values this way']
        ],
        steps: [
          { upto: 1, say: 'The plain `int` is the bug. It looks right on one thread and on a small test.' },
          { upto: 2, say: '`AtomicInteger` fits a **single value** that many threads change.' },
          { upto: 3, say: '`synchronized` or a lock fits a **block** of several steps that must run together. It is slower under pressure, and it can **deadlock** if two locks are taken in different orders.' },
          { upto: 4, say: 'The best fix is often to **not share**: each task returns a result, and one thread combines them. The pool of 4 did that: ten tasks returned squares and the main thread added them.' }
        ]
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'A job adds up a million numbers with a parallel stream, and the total is not always the same. Click the line that causes it.',
        file: 'Total.java', lang: 'java',
        code: 'long[] sum = {0};\nLongStream.range(0, 1_000_000).parallel().forEach(i -> sum[0] += i);\nSystem.out.println(sum[0]);\n',
        bad: [2],
        hint: 'Which line changes one variable from many threads?',
        why: '`sum[0] += i` is read, add, write on **a variable that all the threads share**, as `plain++` was in the recording (short in ' + short3 + ' of ' + K.runs + ' runs). A parallel stream runs the lambda on several threads. Let the stream **reduce** instead: `LongStream.range(0, 1_000_000).parallel().sum()` shares nothing. The race itself was recorded with plain threads, and `verify_java.py` runs this parallel stream next to its fix.',
        fix: 'long sum = LongStream.range(0, 1_000_000).parallel().sum();\nSystem.out.println(sum);\n',
        cheer: 'Reduce, do not mutate.'
      }),

      B.bug({
        id: 'm6-bug2', t: 1, q: 'A task that holds a database connection is sent to other machines and fails. Click the line that cannot be sent.',
        file: 'Task.java', lang: 'java',
        code: 'record Task(String name, Connection connection) implements Serializable {}\n',
        bad: [1],
        hint: 'A connection is open on one machine only.',
        why: 'A `Connection` is **not serializable**, so writing the task failed with `' + serFail[1] + '`. An open connection belongs to one machine and cannot travel. Make the field **`transient`** (use a class, because a record component cannot be transient), or better, send only the **settings** and open the connection **where the task runs**. Spark did not run here. The recorded error is the Java one that a task of this kind would raise.',
        fix: 'record Task(String name, String jdbcUrl) implements Serializable {\n    Connection open() throws SQLException {\n        return DriverManager.getConnection(jdbcUrl);\n    }\n}\n',
        cheer: 'Send the URL, not the connection.'
      }),

      B.bug({
        id: 'm6-bug3', t: 2, src: 'docs', q: 'A formatter is a static field that every worker thread uses to parse dates. Rows come out with the wrong dates now and then. Click the line that causes it.',
        file: 'Parse.java', lang: 'java',
        code: 'static final SimpleDateFormat FMT = new SimpleDateFormat("dd/MM/yyyy");\n\nstatic Date parse(String s) throws ParseException {\n    return FMT.parse(s);\n}\n',
        bad: [1],
        hint: 'Is a SimpleDateFormat safe to share between threads?',
        why: 'The documentation of `SimpleDateFormat` says that it is **not thread-safe**: it keeps state while it parses. Two threads that share one can corrupt each other. Use **`java.time.DateTimeFormatter`**, which is immutable and safe to share, as mission 3 did. This is from documentation. The check script of the course ran a shared `SimpleDateFormat` on 8 threads and saw wrong results on one machine, but a race is luck, so treat that as an illustration.',
        fix: 'static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");\n\nstatic LocalDate parse(String s) {\n    return LocalDate.parse(s, FMT);\n}\n',
        cheer: 'Share immutable things.'
      }),

      B.term({
        id: 'm6-ser', t: 1, src: 'rec', title: 'What can travel: Ser.java',
        say: 'Two small classes hold a name and a connection. One of them is a record, and one is a class with a `transient` field.',
        lines: function () { return G.plain(serT); },
        after: 'The record with a `Connection` failed: **`' + serFail[1] + '`**. The class whose connection field is `transient` was written without it, and the run printed `serialized fine`. When a framework such as Spark sends your function to the workers, it **serializes the function and everything that it uses**. One field that cannot be serialized is enough to stop the job.',
        afterKind: 'warn',
        doneSay: 'Everything a task uses must travel with it.'
      }),

      B.code({
        id: 'm6-sercode', t: 1, src: 'rec', title: 'Ser.java: transient and what it means', file: 'Ser.java', lang: 'java', code: SER,
        steps: [
          { say: 'The two classes and the test, in one file. Press Next.', lines: null },
          { say: '`Connection` here stands for anything that cannot be serialized: it does **not** implement `Serializable`.', lines: G.span(SER, /static class Connection/) },
          { say: 'The record `Task` says `implements Serializable`, but its component `connection` has a type that is not serializable. Writing it **fails**.', lines: G.span(SER, /record Task/) },
          { say: '`FixedTask` marks the field **`transient`**. It is skipped when the object is written, and it is `null` after the object is read back. A record component cannot be `transient`, so a class is used.', lines: G.span(SER, /static class FixedTask/, /^    }$/) },
          { say: 'The first `try` writes the record and prints the exception. The second writes `FixedTask` and checks that bytes were produced.', lines: G.span(SER, /ObjectOutputStream\(new ByteArrayOutputStream/, /transient field: serialized/) }
        ]
      }),

      B.talk({
        id: 'm6-talk', t: 2, src: 'docs', title: 'Threads in a data job: the rules of thumb',
        say: 'Five rules that come up in senior interviews. They are from documentation, and only the first two were recorded. Press Next for each.',
        items: [
          ['Share less', 'The safest shared state is none. Pass data **in** to a task and get a result **out**, as the pool of 4 did. Immutable objects (records, `String`, `LocalDate`) are safe to share.', 'Prefer immutable, and return results.'],
          ['Use the right tool', 'One value: **`AtomicInteger`** or `LongAdder`. A group of steps: **`synchronized`** or a `ReentrantLock`. A shared map or queue: **`ConcurrentHashMap`**, `BlockingQueue`. A plain `HashMap` or `ArrayList` is not safe to change from two threads.', 'Pick by what is shared.'],
          ['Size the pool', 'Work that **uses the CPU** (parsing, hashing) needs about one thread per core: this machine had ' + K.cpus + '. Work that **waits** (HTTP, a database) can use many more threads, because most of them sleep.', 'CPU-bound: cores. I/O-bound: more.'],
          ['Virtual threads (Java 21)', 'A virtual thread is cheap, so you start one **per task**, even for thousands: 1,000 tasks that each slept for 10 ms all finished in the recording. They fit **waiting** work. They do not make CPU work faster. A long block inside `synchronized` can **pin** one to a carrier thread, which is from documentation.', 'One per task, for waiting work.'],
          ['Deadlock', 'Two threads each hold a lock that the other wants, and both wait forever. Take locks in **one fixed order**, hold them briefly, and use `jstack` or a thread dump to see which thread waits for what.', 'Same order, short locks.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'Eight threads each run `plain++` 100,000 times on a shared `int`. What does the program print for the counter?',
        opts: [
          { t: 'Often less than 800,000, and a different number each run', fb: '' },
          { t: 'Always exactly 800,000', fb: 'That needs an atomic step or a lock.' },
          { t: 'More than 800,000', fb: 'A lost update loses counts. It never invents them.' },
          { t: 'An exception', fb: 'No error is raised. The program just gives a wrong number.' }
        ],
        ok: 0, why: 'The plain counter was short in ' + short3 + ' of ' + K.runs + ' recorded runs. A race gives no error message, which is why it is dangerous.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'A pool of 4 threads ran ten tasks that return `k * k` for k from 1 to 10. What did the main thread get from the `Future` objects?',
        opts: [
          { t: 'The sum of the squares, ' + K.pool_sum, fb: '' },
          { t: '4, the size of the pool', fb: 'The pool size is not a result.' },
          { t: '55, the sum of 1 to 10', fb: 'The tasks returned squares, not the numbers.' },
          { t: 'Nothing, a task cannot return a value', fb: 'A `Callable` returns a value, and `Future.get()` gives it.' }
        ],
        ok: 0, why: 'The output was `sum of squares from a pool of 4: ' + K.pool_sum + '`. A task that returns its result shares nothing, so it cannot race.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'You start one virtual thread for each of 1,000 tasks, and every task sleeps for 10 ms. What does this show?',
        opts: [
          { t: 'Many waiting tasks are cheap: all ' + n(K.virtual_finished) + ' finished', fb: '' },
          { t: 'Virtual threads make CPU work four times faster', fb: 'They help work that waits, not work that computes.' },
          { t: 'A virtual thread needs one CPU core each', fb: 'They share a small number of carrier threads.' },
          { t: 'The tasks ran one after another', fb: 'They ran together, and the sleeps overlapped.' }
        ],
        ok: 0, why: 'The recording printed `virtual threads that finished: ' + n(K.virtual_finished) + '`. I did not time it against a fixed pool, so no speed-up is claimed.'
      }),

      B.quiz({
        id: 'm6-q4', t: 1,
        q: 'Why did writing the record `Task("load", new Connection())` fail?',
        opts: [
          { t: '`Connection` is not serializable, so the object that holds it cannot be written', fb: '' },
          { t: 'A record cannot implement an interface', fb: 'It can. This one implements `Serializable`.' },
          { t: 'The name "load" is reserved', fb: 'A string is fine.' },
          { t: 'The stream was already closed', fb: 'It was open when the write failed.' }
        ],
        ok: 0, why: 'The error was `' + serFail[1] + '`. Every field of a serializable object must be serializable or `transient`.'
      }),

      B.quiz({
        id: 'm6-q5', t: 2, src: 'docs',
        q: 'A job calls an HTTP API 5,000 times and each call waits about 200 ms for the answer. What is the best way to run it?',
        opts: [
          { t: 'Virtual threads, or a pool with a few dozen threads, and a limit that the API allows', fb: '' },
          { t: 'A pool of one thread per CPU core', fb: 'Most threads would wait, and the cores would sit idle.' },
          { t: 'One thread for each call, platform threads, with no limit', fb: 'It can exhaust memory, and it can overload the API.' },
          { t: 'A parallel stream over the list of calls', fb: 'It uses the common pool, which is sized for CPU work.' }
        ],
        ok: 0, why: 'Work that waits can use many threads. Keep a cap that the API accepts, and watch for rate limits. This is from documentation, and I did not call an API in this course.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the steps in order to fix a counter that is wrong only under load.',
        items: ['Reproduce it with many threads and many iterations, and run it several times', 'Find the variable that more than one thread changes', 'Replace it with an atomic, a lock, a concurrent collection, or stop sharing it', 'Run the same test many times again', 'Keep the test, so that the bug cannot come back unseen'],
        why: 'A race hides on a small test, so reproduce it with a lot of load first. Fix the shared state, then run many times, because one green run proves little. In the recording the plain counter was exact in ' + (K.runs - short3) + ' of ' + K.runs + ' runs.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: how do you run 5,000 slow API calls?',
        scenario: 'An ingest job must call a partner API 5,000 times. Each call waits about 200 ms. The partner allows 50 calls at the same time. The job runs on Java 21.',
        opts: [
          { t: 'Virtual threads, with a `Semaphore` of 50', d: 'One cheap thread for each call, and the semaphore keeps the partner limit. Simple code that reads like a loop.', lose: 'The semaphore is easy to forget, and a library that uses `synchronized` can pin a thread.' },
          { t: 'A fixed pool of 50 platform threads', d: 'The pool size is the limit, so nothing else to remember. It works on any Java version.', lose: 'Fifty threads are heavier than virtual ones, and a slow call blocks one of the 50.' },
          { t: 'A parallel stream', d: 'Shortest to write.', lose: 'It shares the common pool, which is sized for CPU work, and it gives no control over the partner limit.' }
        ],
        pick: 1,
        why: 'A fixed pool of 50 is the most direct way to **say the limit in code**, and it works on every Java version. Virtual threads are as good on Java 21 if you add the limit yourself. Both options are from documentation, and I did not call an API here.',
        when: 'On Java 21 with a library that does not pin, virtual threads plus a semaphore read more simply, and scale to larger fan-outs.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the job fails with NotSerializableException', time: '15:20',
        alert: '**A new version of the batch job fails at the first task with `java.io.NotSerializableException`.** The change added a database connection to the object that holds the settings of the job. Nothing else changed, and the tests on the laptop passed.',
        clues: ['The error names a class that holds a connection', 'The tests run in one JVM, so nothing is serialized', 'The cluster sends the tasks to other machines'],
        opts: [
          { t: 'Do not send the connection: send the settings, and open the connection where the task runs', fb: '' },
          { t: 'Make the class implement `Serializable` and rerun', fb: 'The class already does. The connection field is what fails.' },
          { t: 'Catch the exception and continue', fb: 'The task would never run.' },
          { t: 'Run the job on one machine only', fb: 'It hides the problem and loses the cluster.' }
        ],
        best: 0,
        why: 'The recording reproduced the error in plain Java: a record that holds a `Connection` fails with `' + serFail[1] + '`, and a `transient` field is skipped. An open connection cannot travel, so each task opens its own. Spark did not run in this course, and the message of Spark for this case is from documentation.',
        checks: [
          ['Read the class named in the error', 'It holds a Connection.'],
          ['Ask why the laptop passed', 'No object was serialized in one JVM.'],
          ['Find where the object is sent', 'The cluster sends tasks to workers.'],
          ['Fix', 'Send the URL, and open the connection in the task.']
        ],
        tell: 'The job settings object held an open connection, and a connection cannot be serialized, so the first task failed when the cluster tried to send it. I removed the connection from the object, passed the URL, and open the connection inside the task. I will add a test that serializes the settings object.',
        prevent: ['A **test** that serializes what the job sends', 'Keep **connections and clients** out of task objects', 'Mark local-only fields **`transient`** on purpose']
      }),

      B.qa({
        id: 'qa-race', t: 1, tag: 'Java', secs: 60,
        q: 'What is a race condition, and how do you fix one?',
        pts: ['Shared mutable state', 'Read, add, write interleave', 'Atomic, lock, concurrent collection', 'Or share nothing'],
        short: 'A race condition is a bug where the result depends on the timing of threads that **change shared state**. My example: eight threads add one to a shared `int` 100,000 times each. `plain++` is read, add, write, so two threads can write the same result and lose an update. It ended short in ' + short3 + ' of ' + K.runs + ' of my runs, with a different total each time and no error. An `AtomicInteger` made each update one step and gave 800,000 every time. I fix a race by **sharing less**: return results from tasks, use immutable objects, or use an atomic, a lock or a concurrent collection for what must be shared. I run a test many times, because one green run proves little.',
        fu: [['What is volatile?', 'It makes a write visible to other threads. It does not make read, add, write atomic.'], ['How do you find a deadlock?', 'A thread dump from jstack shows which thread waits for which lock.']],
        trap: 'Saying that a green run proves the code is safe.',
        real: 'Describe a bug that appeared only under load.'
      }),

      B.qa({
        id: 'qa-pool', t: 1, tag: 'Java', secs: 60,
        q: 'How do you run work in parallel in Java, and how do you size the pool?',
        pts: ['ExecutorService, Future', 'CPU work: cores', 'Waiting work: more threads', 'Virtual threads in Java 21'],
        short: 'I use an **`ExecutorService`**. I submit tasks that return a value and collect the results from the `Future` objects, which keeps the tasks from sharing state: in my run a pool of 4 returned the squares of 1 to 10 and the main thread summed them to ' + K.pool_sum + '. For the size, **CPU-bound** work gets about one thread per core (' + K.cpus + ' on my machine), and work that **waits** on HTTP or a database can use many more. On Java 21 I use **virtual threads** for waiting work: I started ' + n(K.virtual_finished) + ' tasks that each slept for 10 ms, one virtual thread per task, and all of them finished. I keep a limit when the other side has one.',
        fu: [['What is the common pool?', 'A shared pool that parallel streams use. It is sized for CPU work.'], ['Do virtual threads speed up CPU work?', 'No. They make waiting work cheap.']],
        trap: 'A thread for each task with no limit.',
        real: 'Describe how you sized a pool.'
      }),

      B.qa({
        id: 'qa-serial', t: 2, tag: 'Java', secs: 60,
        q: 'What is serialization, and why does it matter in Spark or Flink code?',
        pts: ['Object to bytes', 'The framework sends your function to workers', 'Every field must be serializable or transient', 'Send settings, open connections in the task'],
        short: 'Serialization turns an object into bytes so that it can be stored or sent to another machine. A framework such as Spark or Flink **serializes the function and everything it uses** and sends it to the workers. In plain Java I reproduced the failure: a record that holds a `Connection` raised `' + serFail[1] + '`, because an open connection cannot leave its machine. A `transient` field is skipped on writing, and it is `null` after reading. So I keep connections and clients out of what is sent, pass settings such as the URL, and open the connection inside the task. A unit test on one JVM serializes nothing, so I add a test that serializes the object. Spark did not run in this course, so the failure of Spark itself is from documentation.',
        fu: [['What is Kryo?', 'A faster serialization library that some frameworks offer. It has its own rules.'], ['Why not serialize the connection?', 'It holds a socket that only exists on one machine.']],
        trap: 'Capturing a connection or a client in a closure.',
        real: 'Describe a "Task not serializable" error.'
      }),

      B.qa({
        id: 'qa-sync', t: 2, tag: 'Java', secs: 60,
        q: 'What is the difference between synchronized, volatile and atomic classes?',
        pts: ['synchronized: one thread in a block, and visibility', 'volatile: visibility only', 'atomic: one value, one step', 'Concurrent collections'],
        short: '`synchronized` (or a `Lock`) lets **one thread at a time** run a block, and it makes the changes visible to the next thread. `volatile` gives only **visibility**: other threads see the latest write, but `x++` on a volatile is still read, add, write, so it can lose updates. An **atomic class** such as `AtomicInteger` makes one value change in **one step**, which fixed the counter in my run (800,000 every time). For a shared map or queue I use `ConcurrentHashMap` or a `BlockingQueue`. I chose the smallest tool for what is shared, and I try to share nothing. This answer is from documentation. In my recording only the plain counter and the atomic counter ran.',
        fu: [['When do you use a lock?', 'When several steps must happen together, such as check, then update.'], ['What is the memory model?', 'The rules for when one thread sees the writes of another. I keep shared state behind a lock or an atomic.']],
        trap: 'Using volatile for a counter.',
        real: 'Say which tool you used for a shared value.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Thread Wrangler', color: '#FBCFE8',
        pts: [
          '`plain++` is read, add, write. Eight threads on a shared `int` ended **short in ' + short3 + ' of ' + K.runs + '** runs, with no error.',
          '`AtomicInteger` made each update one step and gave **800,000** in ' + exact3 + ' of ' + K.runs + ' runs. **Share less** is the best fix.',
          'A pool of 4 returned **' + K.pool_sum + '** from ten tasks, and **' + n(K.virtual_finished) + '** virtual threads finished. Size by CPU work or by waiting work.',
          'A record that holds a `Connection` failed with `NotSerializableException`. Send settings, and open connections in the task.',
          'Spark did not run here. The rules above are Java rules that Spark depends on.'
        ],
        lines: [
          'I share less between threads.',
          'I keep connections out of tasks that travel.',
          'I run a concurrency test many times.'
        ]
      })
    ]
  });
})();
