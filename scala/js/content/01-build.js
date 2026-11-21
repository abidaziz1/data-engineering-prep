/* Mission 1: build and versions. scalac, the classpath, the Scala library, a jar, and two Scala versions in one program. All of it ran on the real Scala 2.13.16 and 2.12.20 compilers and the JDK. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var HE = C('build.hello'), CE = C('build.compile_error'), NL = C('build.no_library'), BJ = C('build.jar'), BN = C('build.binary');
  var TOT = G.file('Totals.scala');
  G.expect(HE.compile_exit === 0 && HE.run_exit === 0 && HE.prints_scala_version, 'a Scala 2.13 program compiles clean and prints its version');
  G.expect(CE.exit_code === 1 && CE.class_file_made === false && CE.says_type_mismatch, 'scalac refuses a String where an Int belongs and writes no class file');
  G.expect(NL.exit === 1 && /NoClassDefFoundError: scala\//.test(NL.error), 'a program without scala-library fails with NoClassDefFoundError');
  G.expect(BJ.jar_run_exit === 1 && BJ.with_library_exit === 0, 'java -jar of a jar without the library fails and the same jar works with the library on the classpath');
  G.expect(BN.all_compiles_clean && BN.mixed_compiled && BN.mixed_exit === 1 && /NoSuchMethodError/.test(BN.mixed_error) && BN.both212_output !== BN.both213_output, 'a 2.12 library in a 2.13 app compiles clean and fails at run time with NoSuchMethodError');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Build and versions', short: 'Build', blurb: 'scalac, the classpath, the Scala library, a jar, and a library of another Scala version', minutes: 22,
    focus: ['src', 'stg'],
    goals: [
      'Compile and run a program, and read what **scalac** says about a type error.',
      'Say what **`NoClassDefFoundError: scala/...`** means, and where the Scala library goes.',
      'Say why a **`_2.12` and a `_2.13`** artifact do not mix, and read a **`NoSuchMethodError`**.',
      'Choose the Scala version of a Spark job.'
    ],
    say: 'The first Scala failure of most data engineers is not in the code. It is a library that was built for another Scala version, and the compiler says nothing. I ran the real compilers on this machine, version 2.13 and 2.12, and wrote down what each one printed.',
    scenes: [
      B.term({
        id: 'm1-run', t: 1, src: 'rec', title: 'Compile and run a program',
        say: 'The smallest Scala program of the course. I compiled it, then ran it with the JVM. The replay calls the compiler `scalac`: I started `scala.tools.nsc.Main`, the class that the script starts.',
        lines: function () { return G.plain(X('build.hello')); },
        after: 'The compiler wrote the class files, and the JVM ran `Hello` with `scala-library.jar` on the classpath. The program printed the version of the library that it ran on: **Scala ' + M('scala') + '** on **Java ' + M('java_feature') + '**. A Scala program is an ordinary JVM program that needs the Scala library next to it.',
        afterKind: 'tip',
        doneSay: 'Scala compiles to JVM bytecode.'
      }),

      B.term({
        id: 'm1-error', t: 1, src: 'rec', title: 'The compiler checks the types',
        say: 'Now a program with a mistake: a `String` where an `Int` belongs. I compiled it.',
        lines: function () { return G.plain(X('build.compile_error')); },
        after: 'The compiler stopped with **`type mismatch`**, showed what it **found** (`String("12")`) and what it **required** (`Int`), and pointed at the place. It made **no class file**: `' + (CE.class_file_made ? 'a class file exists' : 'no class file') + '`. A type error is found before anything runs, which is why Scala code in a pipeline fails early and not at 3 am.',
        afterKind: 'tip',
        doneSay: 'A type error stops the build.'
      }),

      B.term({
        id: 'm1-library', t: 1, src: 'rec', title: 'A program without the Scala library',
        say: 'The same program, run with `java -cp out Hello`: the classes, and no `scala-library.jar`.',
        lines: function () { return G.plain(X('build.no_library')); },
        after: 'The JVM failed with **`' + NL.error + '`**. Even `args.isEmpty` calls the Scala library, so a Scala program cannot start without it. The rule: **the library is on the classpath at run time**, in a `-cp`, in a jar, or in the cluster that runs the job. Spark brings its own copy, and that copy is the one your code meets.',
        afterKind: 'warn',
        doneSay: 'The library must be on the classpath.'
      }),

      B.term({
        id: 'm1-jar', t: 2, src: 'rec', title: 'A jar of your own classes',
        say: 'I packed the classes in a jar with a main class and ran it with `java -jar`. Then I ran it again with the library on the classpath.',
        lines: function () { return G.plain(X('build.jar')); },
        after: 'A jar holds **your classes only**, so `java -jar` failed with `' + BJ.jar_run_error + '`. With the library next to it (`-cp hello.jar:scala-library.jar`) it printed `' + BJ.with_library_output + '`. A job that ships by itself needs an **assembly** jar that packs the library in, and a Spark job leaves Spark and Scala out on purpose, because the cluster has them. Both are from documentation here, and sbt did not run.',
        afterKind: 'tip',
        doneSay: 'A jar does not carry the library.'
      }),

      B.flow({
        id: 'm1-flow', t: 1, src: 'rec', title: 'Two Scala versions in one program', g: 'versions', legend: true,
        steps: [
          { say: 'A library and an application, built by two compilers. Press Next.', focus: ['lib', 'app', 'run'], cap: 'A library, an application, a JVM.' },
          { say: 'Step 1. The **library** was compiled with Scala **' + M('scala_212') + '**. It has one method, `byStore`, that adds sales by store.', on: ['e1'], focus: ['lib', 'app'], tags: ['tg_suffix'], cap: 'A library built with 2.12.' },
          { say: 'Step 2. The **application** was compiled with Scala **' + M('scala') + '** against that library. The compiler read it and said **nothing**: the build was ' + (BN.mixed_compiled ? 'clean' : 'not clean') + '.', on: ['e2'], focus: ['app', 'run'], tags: ['tg_same'], cap: 'The 2.13 compiler accepts it.' },
          { say: 'Step 3. When both were built with the same version, the program printed its map: `' + BN.both213_output + '` with 2.13 and `' + BN.both212_output + '` with 2.12.', on: ['e3'], focus: ['run', 'ok'], cap: 'The same version works.' },
          { say: 'Step 4. With the **mixed** build the JVM failed with **`NoSuchMethodError`** on `Totals.byStore`. The method exists, and its signature does not: a `Seq` means something else in 2.12 and 2.13.', on: ['e4'], focus: ['run', 'bad'], cap: 'The signature is different.' }
        ]
      }),

      B.term({
        id: 'm1-binary', t: 1, src: 'rec', title: 'The three builds, side by side',
        say: 'The real output of the three builds: all 2.13, all 2.12, and a 2.12 library under a 2.13 application.',
        lines: function () { return G.plain(X('build.binary')); },
        after: 'Same source, same machine, three results. The mixed build is the one that matters: **the compiler accepted it and the JVM refused it**. This is **binary compatibility**. Scala 2.12 and 2.13 are not binary compatible, so a library carries its Scala version in its name (`_2.12`, `_2.13`), and everything on the classpath must have the same one. The two versions also print the same map in another order, so **never rely on the order of a map**.',
        afterKind: 'warn',
        doneSay: 'Same Scala version, everywhere.'
      }),

      B.widget({ id: 'm1-lab', kind: 'verlab', t: 1, src: 'rec', title: 'Lab: five builds, and what ran' }),

      B.code({
        id: 'm1-code', t: 1, src: 'rec', title: 'Totals.scala: the library that was built twice', file: 'Totals.scala', lang: 'scala', code: TOT,
        steps: [
          { say: 'The whole library is one method. It compiles with Scala 2.12 and with 2.13 without a change. Press Next.', lines: null },
          { say: 'The **signature** is the part that changed between the versions. `Seq` is `scala.collection.Seq` in 2.12 and `scala.collection.immutable.Seq` in 2.13, so the compiled method has **two different descriptors**.', lines: G.span(TOT, /def byStore/) },
          { say: 'The body groups the sales by store and adds them up. It works the same in both versions, which is why the failure is not about the logic.', lines: G.span(TOT, /sales\.groupBy/) }
        ],
        note: 'The application is a six-line `UseTotals.scala` that calls `Totals.byStore` on three sales.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, src: 'docs', q: 'A project builds with Scala 2.13.16 and asks for Spark. The build is green, and the job fails with NoSuchMethodError. Click the line that causes it.',
        file: 'build.sbt', lang: 'scala',
        code: 'scalaVersion := "2.13.16"\nlibraryDependencies += "org.apache.spark" % "spark-sql_2.12" % "3.5.1"\n',
        bad: [2],
        hint: 'Which Scala version does the artifact name?',
        why: 'The dependency names **`_2.12`** by hand, while the project is built with 2.13. This is the mix of the recording, where a 2.12 library in a 2.13 app compiled clean and failed with `' + BN.mixed_error.replace('java.lang.', '') + '`. Use **`%%`**, which adds the suffix of `scalaVersion`, and a Spark that is built for 2.13. This is from documentation: sbt did not run here.',
        fix: 'scalaVersion := "2.13.16"\nlibraryDependencies += "org.apache.spark" %% "spark-sql" % "4.0.1" % Provided\n',
        cheer: 'One Scala version, everywhere.'
      }),

      B.bug({
        id: 'm1-bug2', t: 1, q: 'The build stops with a type mismatch. Click the line that the compiler refuses.',
        file: 'BadTypes.scala', lang: 'scala',
        code: 'object BadTypes {\n  def main(args: Array[String]): Unit = {\n    val quantity: Int = "12"\n    println(quantity)\n  }\n}\n',
        bad: [3],
        hint: 'What does the type on the left say, and what is on the right?',
        why: 'The value is declared as an `Int` and given a `String`. In the recording the compiler said `type mismatch; found: String("12") required: Int` and made no class file. Convert on purpose: `"12".toInt`, or `"12".toIntOption` when the text may not be a number.',
        fix: 'object BadTypes {\n  def main(args: Array[String]): Unit = {\n    val quantity: Int = "12".toInt\n    println(quantity)\n  }\n}\n',
        cheer: 'Say the conversion.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A Scala program fails at start with `NoClassDefFoundError: scala/collection/ArrayOps$`. What is missing?',
        opts: [
          { t: 'The Scala library on the classpath', fb: '' },
          { t: 'A semicolon in the source', fb: 'That is a compile error, not a run-time one.' },
          { t: 'A newer JDK', fb: 'The JDK ran the program and printed its version in the other case.' },
          { t: 'The compiler', fb: 'The program was already compiled.' }
        ],
        ok: 0, why: 'The recording ran `Hello` with and without `scala-library.jar`. Without it: `' + NL.error + '`.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'The 2.13 compiler built an application against a library that was compiled with 2.12, and printed nothing. What happens when it runs?',
        opts: [
          { t: 'It can fail with NoSuchMethodError: the signature of a method differs between the versions', fb: '' },
          { t: 'It always works, because the compiler accepted it', fb: 'The recording shows the opposite.' },
          { t: 'It prints a warning and continues', fb: 'The JVM does not warn about a missing method.' },
          { t: 'It recompiles the library', fb: 'The JVM never compiles anything.' }
        ],
        ok: 0, why: 'The build was clean and the run ended with `' + BN.mixed_error + '`.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'What does the `_2.13` in the name of a library tell you?',
        opts: [
          { t: 'The Scala version that the library was built with', fb: '' },
          { t: 'The version of the library itself', fb: 'That is the number after the name.' },
          { t: 'The Java version', fb: 'The Java version is not in the name.' },
          { t: 'The number of classes in the jar', fb: 'It has nothing to do with the contents.' }
        ],
        ok: 0, why: 'Scala versions are not binary compatible, so the suffix is how you match a library to your compiler. `%%` in sbt adds it for you.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2, src: 'docs',
        q: 'A Spark 4 job is built with Scala 2.13.16 and runs on a cluster that has Spark 4. Which Scala library should be in your jar?',
        opts: [
          { t: 'None: the cluster brings its own, and the job uses it', fb: '' },
          { t: 'Scala 2.12, because it is older and safer', fb: 'Spark 4 is built for 2.13.' },
          { t: 'Both 2.12 and 2.13', fb: 'Two copies of the library on one classpath is the failure of this mission.' },
          { t: 'Scala 3, because it is newest', fb: 'Spark 4 jobs are built with Scala 2.13.' }
        ],
        ok: 0, why: 'In the recording the Spark of the course was built with Scala ' + M('scala') + '. Mark Spark and Scala as `Provided` so that your jar does not carry a second copy. This is from documentation, and no cluster ran here.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the steps in order to find out why a Scala job fails with NoSuchMethodError.',
        items: ['Read the error: which class and which method', 'List the Scala versions on the classpath (the suffix of every artifact)', 'Find the library that was built for another version', 'Replace it with the build for your Scala version', 'Run the job again, and keep one Scala version in the build'],
        why: 'The message names a method that is missing, which points to a version mismatch more often than to a typo. Find the odd library out by its suffix, replace it, and run again.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: which Scala version for a new Spark job?',
        scenario: 'Brewline starts a new batch job on a cluster that runs Spark 4. The team knows Scala 2 well, and someone has read that Scala 3 is better.',
        opts: [
          { t: 'Scala 2.13, the version that Spark 4 is built with', d: 'Every Spark library has a `_2.13` build, and the Scala that your code meets in Spark is the same one.', lose: 'The older syntax, and a plan is needed for the day that Spark moves on.' },
          { t: 'Scala 3, compiled against the 2.13 libraries of Spark', d: 'Scala 3 can use `_2.13` libraries, and its syntax is cleaner.', lose: 'Spark does not target it, and some Spark features (such as the derivation of encoders) need extra work. I did not run it.' },
          { t: 'Python, and skip the question', d: 'Fewer build problems for a team that already writes Python.', lose: 'Not an option if the team owns Scala code, and typed Datasets need Scala or Java.' }
        ],
        pick: 0,
        why: 'The deciding fact is the **Scala version of Spark**, which was ' + M('scala') + ' in the recording. Use the same one and the version problems of this mission cannot happen. The options are from documentation and Scala 3 did not run here.',
        when: 'If the job is a library that other teams use on several Spark versions, cross-building for more than one Scala version is worth the extra work.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the job fails after a harmless library upgrade', time: '04:15',
        alert: '**The nightly job stopped at 03:50 with `java.lang.NoSuchMethodError`.** Yesterday someone added a small internal library to the build. The build was green and the tests passed on a laptop.',
        clues: ['The error names a method of the new library', 'The new library is `reports_2.12`', 'The job is built with Scala 2.13'],
        opts: [
          { t: 'Use the `reports_2.13` build of the library, and check every suffix in the build', fb: '' },
          { t: 'Pin the library to the version of last week', fb: 'The old version may have the same suffix problem, or none, and you would not know why.' },
          { t: 'Add the Scala 2.12 library to the classpath as well', fb: 'Two Scala libraries on one classpath make it worse.' },
          { t: 'Skip the report step tonight', fb: 'It hides the problem until tomorrow.' }
        ],
        best: 0,
        why: 'The recording of this exact case: a library compiled with Scala ' + M('scala_212') + ' was accepted by the ' + M('scala') + ' compiler, and the run ended with `' + BN.mixed_error + '`. The suffix of the artifact was the clue, and the fix is the build for the version of the job.',
        checks: [
          ['Read the error', 'NoSuchMethodError, and the class that it names.'],
          ['Read the suffixes', 'One library says _2.12 in a 2.13 build.'],
          ['Find the right artifact', 'The same library with _2.13.'],
          ['Prevent it', 'Use %% so that the suffix follows scalaVersion.']
        ],
        tell: 'The new library was built for Scala 2.12 and the job runs on 2.13, so the compiler accepted it and the JVM failed on a method with another signature. I changed the build to the 2.13 artifact, and I will use the operator that picks the suffix from the Scala version, so it cannot be written by hand again.',
        prevent: ['Use **`%%`** so that the suffix follows `scalaVersion`', 'List the **suffixes** of the dependency tree in review', 'Run the job once on real data before release']
      }),

      B.qa({
        id: 'qa-versions', t: 1, tag: 'Scala', secs: 60,
        q: 'What is binary compatibility, and why does the Scala version matter for a Spark job?',
        pts: ['Compiled code expects exact signatures', '2.12 and 2.13 are not compatible', 'The suffix in the artifact name', 'One Scala version on the classpath'],
        short: 'Scala code is compiled to bytecode, and a library calls another library by exact method signatures. Between Scala **2.12 and 2.13** some signatures changed, for example `Seq` became `immutable.Seq`, so code built with one version can fail on the other. I saw it: a library built with 2.12 compiled **clean** under a 2.13 application, and the JVM then failed with `NoSuchMethodError`. That is why artifacts carry `_2.12` or `_2.13` in the name, and why a Spark job must use the Scala version that its Spark was built with: ' + M('scala') + ' for Spark ' + M('spark') + '. In sbt I use `%%` so that the suffix follows `scalaVersion`.',
        fu: [['Why did the compiler accept it?', 'The 2.13 compiler can read 2.12 class files. The signature check is done by the JVM when the method is called.'], ['What about Scala 3?', 'It can use the 2.13 libraries, but I did not run it, and Spark does not target it.']],
        trap: 'Writing the suffix by hand.',
        real: 'Describe a NoSuchMethodError that you traced to a version.'
      }),

      B.qa({
        id: 'qa-classpath', t: 1, tag: 'Scala', secs: 45,
        q: 'A Scala program fails with NoClassDefFoundError for a scala class. What do you check?',
        pts: ['The Scala library is on the classpath', 'java -cp or the manifest', 'A jar holds only your classes', 'On Spark the cluster provides it'],
        short: 'The JVM cannot find the **Scala library**, so I check the classpath. In my run, `java -cp out Hello` failed with `NoClassDefFoundError: scala/collection/ArrayOps$` and worked with `scala-library.jar` added. A jar built from my classes does not carry the library either, so `java -jar` failed the same way. For a standalone job I build an **assembly** jar that packs the library in. For a Spark job I do the opposite: the cluster provides Scala and Spark, so I mark them `Provided`, and I make sure the Scala of my build is the Scala of the cluster. The assembly step is from documentation, and sbt did not run here.',
        fu: [['What is the classpath?', 'The list of jars and folders that the JVM searches for classes.'], ['Why is a missing class an Error and not an Exception?', 'It is a linkage problem of the program, not a condition that your code can handle.']],
        trap: 'Adding a second Scala library to fix it.',
        real: 'Describe a jar that did not start.'
      }),

      B.qa({
        id: 'qa-scala3', t: 2, tag: 'Scala', secs: 60,
        q: 'Scala 2 or Scala 3 for data engineering work today?',
        pts: ['Spark is built with 2.13', 'Libraries are published for 2.13', 'Scala 3 can read 2.13 libraries', 'Choose what the platform supports'],
        short: 'For Spark work I use **Scala 2.13**, because Spark ' + M('spark') + ' is built with it (' + M('scala') + ' in my recording), every Spark library has a `_2.13` build, and the code in blog posts and in Spark itself is Scala 2. Scala 3 has cleaner syntax (`enum`, `given`, indentation) and can use `_2.13` libraries, but Spark does not target it and features such as encoders for case classes need extra work. I did not run Scala 3 here, so I say that from documentation. My rule is to choose what the platform supports, keep one Scala version in the build, and move when the platform moves.',
        fu: [['Can you mix 2.13 and Scala 3 jars?', 'A Scala 3 project can depend on `_2.13` artifacts, but not the other way round.'], ['What changes for a Python team?', 'Nothing for PySpark: Scala only matters for code that runs on the JVM.']],
        trap: 'Choosing the newest version without checking the platform.',
        real: 'Say which Scala version your last job used and why.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Builder', color: '#FECACA',
        pts: [
          'Scala compiles to **JVM bytecode**. The compiler stopped a `String` where an `Int` belongs and made **no class file**.',
          'The program needs the **Scala library** at run time: without it the JVM failed with `' + NL.error + '`.',
          'A jar holds your classes only: `java -jar` failed, and a classpath with the library printed the greeting.',
          'A **2.12 library in a 2.13 app** compiled clean and failed with `NoSuchMethodError`. Keep **one Scala version**, and use `%%`.',
          'Spark ' + M('spark') + ' is built with Scala **' + M('scala') + '**: that is the version to use.'
        ],
        lines: [
          'I read the suffix of every artifact.',
          'I keep one Scala version in the build.',
          'I leave Scala and Spark out of my jar on a cluster.'
        ]
      })
    ]
  });
})();
