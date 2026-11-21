/* Mission 5: Scala on Spark. SparkApp.scala ran on a local Spark 4.0.1 session started by spark-submit, and the two compile errors came from the real Scala 2.13.16 compiler. No cluster ran. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var K = C('spark'), E = C('spark.errors'), SP = G.file('SparkApp.scala');
  G.expect(K.exit === 0 && K.orders === 1000 && K.placed === 900 && K.fixed_count === 901 && K.banner === 'Spark ' + M('spark') + ' on Scala ' + M('scala'), 'a local Spark session counts 1000 orders, 900 placed and 901 with 600 cents or more');
  G.expect(K.closure_headline === 'Task not serializable' && /NotSerializableException: Settings/.test(K.cause) && /UNRESOLVED_COLUMN/.test(K.untyped_error), 'a lambda that uses Settings fails with Task not serializable, and a column typo is an UNRESOLVED_COLUMN error at run time');
  G.expect(E.typed_exit === 1 && /statu is not a member of Order/.test(E.typed_message) && E.typed_hint && E.encoder_exit === 1 && /toDS is not a member of Seq\[Plain\]/.test(E.encoder_message), 'the typed typo and the missing encoder are compile errors');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Scala on Spark', short: 'Spark', blurb: 'A typed Dataset, a typo, a closure that cannot be sent, and a missing encoder', minutes: 24,
    focus: ['air', 'mon'],
    goals: [
      'Write a **typed `Dataset`** with a case class, and say what the compiler checks.',
      'Say why a lambda that uses a **non-serializable object** fails with **Task not serializable**, and fix it.',
      'Tell an error found **at compile time** from one found **at run time**.',
      'Say what an **encoder** is, and read the error for a missing one.'
    ],
    say: 'Spark is written in Scala, and the code that you give it is sent to other machines. That is where the Scala and the Java rules meet. I ran a local Spark ' + M('spark') + ' session with 1,000 orders, made two kinds of typo, sent a lambda that cannot travel, and left out an encoder. No cluster ran, and the screens say so.',
    scenes: [
      B.code({
        id: 'm5-code', t: 1, src: 'rec', title: 'SparkApp.scala: a typed Dataset of orders', file: 'SparkApp.scala', lang: 'scala', code: SP,
        steps: [
          { say: 'One Spark program, started with `spark-submit` in local mode. Press Next.', lines: null },
          { say: 'The **case class** is the type of a row, and **`Settings`** is a plain class that is **not** `Serializable`. Both come back later.', lines: G.span(SP, /case class Order/, /class Settings/) },
          { say: 'A **local session** with two threads. `import spark.implicits._` brings the **encoders** that a `Dataset` needs for case classes and basic types.', lines: G.span(SP, /val spark = SparkSession/, /import spark\.implicits/) },
          { say: 'A **`Dataset[Order]`** of 1,000 orders: a lambda builds each one. Everything after this is typed: the compiler knows what an `Order` has.', lines: G.span(SP, /val orders: Dataset\[Order\]/, /^    }$/) },
          { say: 'Typed operations: `filter` with a lambda, `groupByKey`, and `map`. These are **plain Scala functions** that run on the executors.', lines: G.span(SP, /println\(s"orders:/, /map\(_\.orderId\)/) },
          { say: 'A column **in a string**, `col("statu")`. The compiler cannot check it, so the mistake shows up when the query is **planned**.', lines: G.span(SP, /try orders\.filter\(col/, /AnalysisException/) },
          { say: 'A lambda that uses `settings.minCents`. To send the lambda, Spark must send `settings`, and it **cannot**.', lines: G.span(SP, /val settings = new Settings/, /^    }$/) },
          { say: 'The fix: **copy the number** into a local `val` first. The lambda then uses only a `Long`.', lines: G.span(SP, /val minCents = settings/, /copy the number first/) }
        ],
        note: 'The program catches each error and prints one line, so that the output is the same on every run.'
      }),

      B.term({
        id: 'm5-out', t: 1, src: 'rec', title: 'What SparkApp printed',
        say: 'The output of `spark-submit`, line by line. Only the lines of the program are shown: the log of Spark is left out.',
        lines: function () { return G.plain(X('spark.run')); },
        after: 'Spark **' + M('spark') + '** ran on Scala **' + M('scala') + '**. The Dataset held **' + n(K.orders) + '** orders, **' + n(K.placed) + '** of them placed. The typo in a column name came back as **`' + K.untyped_error + '`** at run time. The lambda that used `Settings` failed with **`' + K.closure_headline + '`**, and the cause was **`' + K.cause + '`**. With the number copied first, the same count worked: **' + n(K.fixed_count) + '** orders with 600 cents or more.',
        afterKind: 'warn',
        doneSay: 'The whole object goes with the lambda.'
      }),

      B.flow({
        id: 'm5-flow', t: 1, src: 'rec', title: 'A lambda is sent to the executors', g: 'spark', legend: true,
        steps: [
          { say: 'A lambda in a Spark job runs on the executors, not in your `main`. Press Next.', focus: ['code', 'ser', 'send', 'exec'], cap: 'Your code runs elsewhere.' },
          { say: 'Step 1. Your lambda uses `settings.minCents`, so it **captures `settings`**.', on: ['e1'], focus: ['code', 'ser'], tags: ['tg_whole'], cap: 'The lambda captures what it uses.' },
          { say: 'Step 2. Spark **serializes** the lambda: it writes the function and **everything that it holds** to bytes. A `Settings` is not `Serializable`, so this step stops, with **`' + K.closure_headline + '`**.', on: ['e4'], focus: ['ser', 'fail'], cap: 'Serialization fails.' },
          { say: 'Step 3. With **a number copied into a local `val`**, the lambda holds a `Long`. It serializes, is sent, and runs: **' + n(K.fixed_count) + '** orders counted.', on: ['e2', 'e3'], focus: ['ser', 'send', 'exec'], tags: ['tg_copy'], cap: 'Send the number, not the object.' }
        ]
      }),

      B.widget({ id: 'm5-lab', kind: 'sparklab', t: 1, src: 'rec', title: 'Lab: what Spark and scalac caught' }),

      B.term({
        id: 'm5-typed', t: 1, src: 'rec', title: 'A typo in a typed lambda',
        say: 'The same typo as `col("statu")`, in a typed lambda: `_.statu`. I compiled it against the Spark jars.',
        lines: function () { return G.plain(X('spark.typed_error')); },
        after: 'The compiler stopped with **`' + E.typed_message + '`** and suggested **`status`**. The job never started. This is what the **typed API** buys: a typo in a field is found when you compile, and a typo in a string column name is found when the job runs.',
        afterKind: 'tip',
        doneSay: 'Typed means checked early.'
      }),

      B.term({
        id: 'm5-encoder', t: 3, src: 'rec', title: 'A class that is not a case class',
        say: 'A plain class `Plain`, turned into a Dataset with `toDS()`.',
        lines: function () { return G.plain(X('spark.encoder_error')); },
        after: 'The compiler said **`' + E.encoder_message + '`**. The method exists for a `Seq` of a type that has an **encoder**, and there is none for `Plain`, so the method is not found at all. Case classes and basic types get their encoders from `spark.implicits._`. Use a case class for rows.',
        afterKind: 'warn',
        doneSay: 'No encoder, no Dataset.'
      }),

      B.cmp({
        id: 'm5-api', t: 1, src: 'docs', title: 'DataFrame, Dataset and RDD',
        say: 'Three ways to hold data in Spark. Press Next to read what each one gives you and costs.',
        cols: ['API', 'You write', 'The compiler checks', 'Watch out for'],
        hl: 1,
        rows: [
          ['`DataFrame`', 'Columns by name, SQL-like functions', 'Almost nothing about the columns', 'A typo in a name fails at run time (the recording)'],
          ['`Dataset[T]`', 'Case classes and Scala lambdas', 'The fields and types of `T`', 'A lambda is opaque to the optimizer, and it must be serializable'],
          ['`RDD`', 'Plain Scala functions over objects', 'Types of the objects', 'No optimizer, so it is rarely the right choice for new work']
        ],
        steps: [
          { upto: 2, say: 'A `DataFrame` is the common choice and the optimizer knows what you mean. A `Dataset` adds types, and the price is a lambda that Spark cannot look inside.' },
          { upto: 3, say: 'An `RDD` is the low-level layer. Use it only when you must.' }
        ]
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'A Spark job filters orders with a minimum from a settings object, and fails with Task not serializable. Click the line that captures the object.',
        file: 'Filter.scala', lang: 'scala',
        code: 'val settings = new Settings(600)\nval big = orders.filter(o => o.cents >= settings.minCents)\nprintln(big.count())\n',
        bad: [2],
        hint: 'What does the lambda hold on to?',
        why: 'The lambda uses `settings.minCents`, so Spark must send **the whole `Settings` object**, and its class is not `Serializable`. The recording failed with `' + K.closure_headline + '` and the cause `' + K.cause + '`. Copy the **number** into a local `val` first.',
        fix: 'val settings = new Settings(600)\nval minCents = settings.minCents\nval big = orders.filter(o => o.cents >= minCents)\nprintln(big.count())\n',
        cheer: 'Send the number, not the object.'
      }),

      B.bug({
        id: 'm5-bug2', t: 1, q: 'A job filters orders by a column name and fails after it has started. Click the line with the mistake that the compiler cannot see.',
        file: 'Typo.scala', lang: 'scala',
        code: 'val placed = orders.filter(col("statu") === "PLACED")\nprintln(placed.count())\n',
        bad: [1],
        hint: 'Which line has a name inside a string?',
        why: 'A column name in a string, `col("statu")`, is not checked by the compiler. Spark finds it when it **plans the query**, and the recording printed `' + K.untyped_error + '`. A typed lambda `_.status == "PLACED"` would have been a compile error with a suggestion.',
        fix: 'val placed = orders.filter(_.status == "PLACED")\nprintln(placed.count())\n',
        cheer: 'Let the compiler check the name.'
      }),

      B.bug({
        id: 'm5-bug3', t: 2, src: 'docs', q: 'A job adds up the cents of 500 million orders and the driver runs out of memory. Click the line that brings the data to the driver.',
        file: 'Total.scala', lang: 'scala',
        code: 'val rows = orders.collect()\nval total = rows.map(_.cents).sum\nprintln(total)\n',
        bad: [1],
        hint: 'Where do the rows go after collect?',
        why: '`collect()` brings **every row to the driver**, one machine. With a big Dataset that is the failure of the memory mission of the Java course. Do the sum on the executors with `map` and `reduce`, so that only one number comes back. This is from documentation: no big data ran, and the check script of the course confirmed that both versions give the same total on 1,000 orders.',
        fix: 'val total = orders.map(_.cents).reduce(_ + _)\nprintln(total)\n',
        cheer: 'Bring back a number, not the rows.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A lambda in a Spark job uses `settings.minCents`, and `Settings` is not Serializable. What does Spark do?',
        opts: [
          { t: 'Fails with `' + K.closure_headline + '`', fb: '' },
          { t: 'Sends a copy of the whole object anyway', fb: 'It cannot send what it cannot serialize.' },
          { t: 'Uses the field and ignores the object', fb: 'The lambda holds the object.' },
          { t: 'Runs it on the driver only', fb: 'It does not change where the lambda runs.' }
        ],
        ok: 0, why: 'The recording printed `closure over Settings: ' + K.closure_headline + '` and `cause: ' + K.cause + '`.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'Where is a typo in `_.statu` found, and where is a typo in `col("statu")` found?',
        opts: [
          { t: 'The first when you compile, the second when the query is planned', fb: '' },
          { t: 'Both when you compile', fb: 'A column name in a string is not checked by the compiler.' },
          { t: 'Both at run time', fb: 'A typed lambda is checked by the compiler.' },
          { t: 'The first at run time, the second when you compile', fb: 'It is the other way round.' }
        ],
        ok: 0, why: 'The compiler said `' + E.typed_message + '`, and the run printed `' + K.untyped_error + '` for the column.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'What does `spark.range(1, 1001).map { i => Order(...) }` need to build a `Dataset[Order]`?',
        opts: [
          { t: 'An encoder for `Order`, which `spark.implicits._` provides for a case class', fb: '' },
          { t: 'Nothing: any class works', fb: 'A plain class has no encoder and the method was not found in the recording.' },
          { t: 'A SQL schema written by hand', fb: 'The encoder is derived from the case class.' },
          { t: 'A cluster', fb: 'The recording used a local session.' }
        ],
        ok: 0, why: 'For a plain class the compiler said `' + E.encoder_message + '`.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2, src: 'docs',
        q: 'A job uses typed lambdas for every step and is slow. Why might that be?',
        opts: [
          { t: 'The optimizer cannot look inside a lambda, so it cannot push filters down or prune columns', fb: '' },
          { t: 'Lambdas are always slower than SQL on the JVM', fb: 'The reason is what the optimizer can see.' },
          { t: 'Scala is slower than Python on Spark', fb: 'The reverse is usually true for typed code, and the cause here is different.' },
          { t: 'The compiler turns them into RDDs', fb: 'It does not.' }
        ],
        ok: 0, why: 'A column expression such as `col("cents") > 1400` is a plan that the optimizer can rewrite. A Scala lambda is a black box. This is from documentation, and nothing was timed here.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps in order to fix a Spark job that fails with Task not serializable.',
        items: ['Read the cause: the class that is not serializable', 'Find the lambda that uses an object of that class', 'Copy the values that the lambda needs into local `val`s', 'Run the job again', 'Keep the objects with connections or settings out of lambdas'],
        why: 'The cause names the class, the class points to the lambda, and the fix is to send the value and not the object. The same rule as the Java course: a connection cannot travel.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: Dataset or DataFrame for a new pipeline?',
        scenario: 'A new Brewline pipeline reads orders, cleans them, joins them with stores and writes totals. The team writes Scala. Some steps are plain business rules.',
        opts: [
          { t: 'DataFrame and column expressions for the heavy work, and a typed Dataset for the business rules', d: 'The optimizer sees the joins and filters, and the rules are checked by the compiler.', lose: 'Two styles in one job, and a conversion between them.' },
          { t: 'Typed Dataset everywhere', d: 'The compiler checks every field, and the code reads like normal Scala.', lose: 'Every lambda is opaque to the optimizer, and every lambda must serialize.' },
          { t: 'DataFrame everywhere, with column names in strings', d: 'The optimizer sees everything.', lose: 'A typo is found at run time, as in the recording.' }
        ],
        pick: 0,
        why: 'The recording showed both costs: a typo in a string is found late, and a lambda that holds an object fails to serialize. Use the typed API where the compiler helps and column expressions where the optimizer helps. The options are from documentation.',
        when: 'A small job that runs once a day on small data can be typed everywhere: the optimizer does not matter at that size.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: the job fails with Task not serializable after a refactor', time: '11:05',
        alert: '**The Spark job fails at its first action with `org.apache.spark.SparkException: Task not serializable`.** Yesterday a colleague moved the thresholds into a `Settings` class and used `settings.minCents` inside a filter. The tests passed on a laptop because the unit tests do not serialize lambdas.',
        clues: ['The cause names `Settings`', 'The lambda uses a field of `settings`', 'The unit tests never send a lambda anywhere'],
        opts: [
          { t: 'Copy the values into local `val`s before the lambda, and add a test that runs a real Dataset', fb: '' },
          { t: 'Make `Settings` extend `Serializable` and ship it every time', fb: 'It may work for a number, and it breaks the day that `Settings` holds a connection.' },
          { t: 'Catch the exception and retry', fb: 'It fails the same way every time.' },
          { t: 'Run the filter on the driver with `collect()`', fb: 'It fails for big data, and it hides the cause.' }
        ],
        best: 0,
        why: 'The recording reproduced it: `' + K.closure_headline + '` with the cause `' + K.cause + '`, fixed by copying the number first (**' + n(K.fixed_count) + '** orders). Spark ran locally here, and no cluster ran, but the failure comes from the same step.',
        checks: [
          ['Read the cause', 'NotSerializableException: Settings.'],
          ['Find the lambda', 'It uses settings.minCents.'],
          ['Ask why the tests passed', 'They never serialize a lambda.'],
          ['Fix and test', 'Copy the value first, and test with a real Dataset.']
        ],
        tell: 'A filter used a field of a settings object, so Spark tried to send the whole object, and its class is not serializable. I copied the number into a local value before the lambda, and added a test that runs a small Dataset through the real session, so that the next capture is found before release.',
        prevent: ['A test that runs a **small Dataset** through a real session, and does more than call plain functions', 'Keep **settings and connections** out of lambdas', 'Copy what a lambda needs into **local vals**']
      }),

      B.qa({
        id: 'qa-closure', t: 1, tag: 'Scala', secs: 60,
        q: 'What does "Task not serializable" mean in Spark, and how do you fix it?',
        pts: ['The function is serialized and sent', 'It captured an object that is not serializable', 'Read the cause', 'Copy the value into a local val'],
        short: 'Spark runs your lambda on the executors, so it **serializes the lambda and everything that it holds** and sends it. If the lambda holds an object whose class is not `Serializable`, the job stops with `Task not serializable`. In my run a filter used `settings.minCents`, so Spark tried to send the whole `Settings`, and the cause was `java.io.NotSerializableException: Settings`. I read the cause, find the lambda that uses that object, and **copy the value into a local `val`** first: then only a number is sent, and the count worked (901 orders). I keep connections and clients out of lambdas, and I test with a small real Dataset, because unit tests that call functions directly never serialize anything. My run was a local session, not a cluster.',
        fu: [['Why not make the class Serializable?', 'It can work for a number, and it breaks when the object holds a connection or a thread.'], ['What about `@transient`?', 'It skips a field when serializing, so the field is null on the executor. I prefer to send only what is needed.']],
        trap: 'Making everything Serializable.',
        real: 'Describe a closure that failed for you.'
      }),

      B.qa({
        id: 'qa-dataset', t: 1, tag: 'Scala', secs: 60,
        q: 'What is the difference between a DataFrame and a Dataset, and which do you use?',
        pts: ['Dataset[T] is typed', 'The compiler checks fields', 'The optimizer cannot see into lambdas', 'Use both on purpose'],
        short: 'A **`Dataset[T]`** is typed with a case class, so the compiler checks the fields: in my run `_.statu` was a **compile error** with the hint `did you mean status?`, and `col("statu")` on the untyped side failed only at run time with `' + K.untyped_error + '`. The price is that a Scala lambda is a **black box** to the optimizer, so it cannot push a filter down or prune columns the way it can with a column expression. I use column expressions for the heavy relational work (joins, filters, aggregates), and a typed Dataset for business rules that benefit from the compiler. A DataFrame is a `Dataset[Row]`.',
        fu: [['What is an encoder?', 'The object that converts between your case class and Spark\'s internal format. `spark.implicits._` provides it for case classes.'], ['What about RDD?', 'The low-level layer with no optimizer. Rarely for new work.']],
        trap: 'Typed lambdas for everything.',
        real: 'Describe where you used a typed Dataset.'
      }),

      B.qa({
        id: 'qa-encoder', t: 2, tag: 'Scala', secs: 45,
        q: 'What is an Encoder, and what does the error for a missing one look like?',
        pts: ['Case class to Spark internal format', 'Provided by spark.implicits', 'Basic types and case classes', 'A plain class has none'],
        short: 'An **Encoder** converts between a Scala type and the internal format that Spark stores and ships. `import spark.implicits._` provides encoders for basic types and **case classes**, which is why a case class is the shape of a row. For a plain class there is none, and the compiler error is easy to misread: in my run `Seq(new Plain("a")).toDS()` gave **`value toDS is not a member of Seq[Plain]`**, because the conversion that adds `toDS` needs the encoder, so the method seems not to exist. I fix it by making the class a case class, or by providing an encoder, and I check that `import spark.implicits._` is in scope.',
        fu: [['Does Scala 3 change this?', 'Deriving encoders for Scala 3 types needs more work. I did not run Scala 3.'], ['Kryo?', 'A generic encoder that stores objects as bytes. It works for anything and loses the columns.']],
        trap: 'Using a plain class as a row.',
        real: 'Describe the error that you got.'
      }),

      B.qa({
        id: 'qa-collect', t: 2, tag: 'Scala', secs: 45,
        q: 'Why is collect() dangerous, and what do you do instead?',
        pts: ['Every row goes to the driver', 'One machine, limited memory', 'Aggregate on the executors', 'Bring back a number or a small sample'],
        short: '`collect()` brings **every row to the driver**, a single machine, so a big Dataset runs it out of memory: the same failure as reading a whole file into a list in the Java course. I aggregate on the executors instead (`map` then `reduce`, or a `groupBy` and `agg`) so that **a number or a small table** comes back, and I use `take(n)` or `limit` to look at a sample. In my run `collect().map(_.cents).sum` and `map(_.cents).reduce(_ + _)` gave the same total on 1,000 orders, and the second never moves the rows. I did not run a big Dataset, so the memory claim is from documentation.',
        fu: [['What about `toLocalIterator`?', 'It brings rows one partition at a time, which keeps the driver\'s memory lower.'], ['How big is too big?', 'Bigger than the memory of the driver, with room for the rest of the program.']],
        trap: 'collect() to look at the data.',
        real: 'Describe a driver that ran out of memory.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Spark Typist', color: '#DC2626',
        pts: [
          'A **`Dataset[Order]`** is typed: `_.statu` was a compile error (`' + E.typed_message + '`), and `col("statu")` was **' + K.untyped_error + '** at run time.',
          'A lambda that uses `Settings` failed with **' + K.closure_headline + '**: the cause was **' + K.cause + '**.',
          '**Copy the number** into a local `val`: the same count gave **' + n(K.fixed_count) + '**.',
          'A class that is not a case class has no **encoder**: `' + E.encoder_message + '`.',
          'A lambda is a black box to the optimizer. Use column expressions for the heavy work, and never `collect()` a big Dataset.'
        ],
        lines: [
          'I send values, not objects.',
          'I let the compiler check names where it can.',
          'I bring back a number, not the rows.'
        ]
      })
    ]
  });
})();
