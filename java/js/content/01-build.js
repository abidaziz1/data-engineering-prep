/* Mission 1: build and dependencies. javac, the classpath, a Maven build, a dependency conflict and a jar that runs alone. All of it ran on the real JDK 21 and Maven. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var CE = C('build.compile_error'), JP = C('build.javap'), CP = C('build.classpath'), MP = C('maven.package'), MT = C('maven.tree'), MR = C('maven.run'), MF = C('maven.failing_test'), MC = C('maven.conflict'), MX = C('maven.conflict_fixed');
  var POM = G.file('maven/pom.xml'), HELLO = G.file('Hello.java');
  G.expect(CE.exit_code === 1 && CE.class_file_made === false, 'javac refuses a String where an int belongs and writes no class file');
  G.expect(JP.has_iadd && JP.has_ireturn, 'the bytecode of add holds iadd and ireturn');
  G.expect(CP.without_exit === 1 && CP.with_exit === 0 && CP.error_names_the_class && CP.with_output === '000042', 'a program without its library fails with NoClassDefFoundError and with it prints 000042');
  G.expect(MP.build_success && MP.tests_run === 2 && MP.shaded && MP.original_jar_kept && MP.jar_made, 'the build runs 2 tests, shades the jar and keeps the original');
  G.expect(MR.shaded_exit === 0 && MR.shaded_output === MR.expected_output && MR.thin_exit === 1 && MR.thin_cp_exit === 1 && MR.shaded_bigger_than_thin, 'the shaded jar runs alone and the thin one does not');
  G.expect(MF.build_failure && MF.message_has_expected, 'a failing test fails the build and says what it expected');
  G.expect(MC.exit === 1 && MC.omitted_for_conflict_lines === 1 && MC.chosen_io_version === '2.4' && MC.wanted_io_version === '2.16.1' && MX.exit === 0, 'a pinned old library breaks commons-csv and a newer pin fixes it');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Build and dependencies', short: 'Build', blurb: 'javac, the classpath, Maven, a version conflict and a jar that runs alone', minutes: 24,
    focus: ['src', 'stg'],
    goals: [
      'Compile and run a program, and read what **javac** and **javap** tell you.',
      'Say what the **classpath** is and what `NoClassDefFoundError` means.',
      'Read a **Maven** build and a **dependency tree**, and fix a **version conflict**.',
      'Ship a **shaded jar** that runs with `java -jar`.'
    ],
    say: 'Most Java problems of a data engineer are not in the language. They are in the build: a library that is missing at run time, a version that Maven picked and you did not, a jar that cannot start on the cluster. We run the real tools and read what they print. Everything on these screens ran on OpenJDK ' + M('java_version') + ' and Maven ' + M('maven') + '.',
    scenes: [
      B.term({
        id: 'm1-run', t: 1, src: 'rec', title: 'Run a single file',
        say: 'The smallest Java program of the course. Since Java 11 you can run one source file without a separate compile step.',
        lines: function () { return G.plain(X('build.source_launcher')); },
        after: 'The `java` launcher compiled `Hello.java` in memory and ran it. `Runtime.version().feature()` printed the version of the JVM that ran it: **' + M('java_feature') + '**. This is fine for a script. A real project is built with Maven, which the rest of the mission shows.',
        afterKind: 'tip',
        doneSay: 'java File.java compiles in memory and runs.'
      }),

      B.term({
        id: 'm1-javac', t: 1, src: 'rec', title: 'Compile, then run: two steps',
        say: 'The same program in the two steps that a build does. `javac` makes bytecode, and `java` runs it.',
        lines: function () { return G.plain(X('build.javac_run')); },
        after: '`javac` wrote one `.class` file for each class. A `.class` file is **bytecode**, not machine code: the JVM turns it into machine code while the program runs. Anything that can read bytecode can run it, on any operating system that has a JVM, which is why a jar from your laptop runs on the cluster.',
        afterKind: 'tip',
        doneSay: 'javac makes bytecode. The JVM runs it.'
      }),

      B.term({
        id: 'm1-error', t: 1, src: 'rec', title: 'The compiler checks the types',
        say: 'I wrote a program that puts the text "12" in an `int`. This is what `javac` did.',
        lines: function () { return G.plain(X('build.compile_error')); },
        after: 'The error names the **file and the line**, says what is wrong (`String cannot be converted to int`) and points at it with a caret. Exit code **' + CE.exit_code + '**, and **no class file was made**, so nothing can run a half-compiled program. A type error is found here, before the night job, and in Python it is found when that line runs.',
        afterKind: 'tip',
        doneSay: 'The compiler finds type errors before anything runs.'
      }),

      B.term({
        id: 'm1-javap', t: 3, src: 'rec', title: 'What bytecode looks like',
        say: '`javap -c` prints the bytecode of a class. This is a class with one method that adds two numbers.',
        lines: function () { return G.plain(X('build.javap')); },
        after: 'The method `add` is four instructions: `iload_0` and `iload_1` push the two ints, **`iadd`** adds them, and **`ireturn`** returns the result. The `i` means int. You will not write bytecode, but reading `javap` output settles a question such as "did the compiler inline this" or "which overload was chosen".',
        afterKind: 'tip',
        doneSay: 'Bytecode is a small stack machine.'
      }),

      B.term({
        id: 'm1-jar', t: 2, src: 'rec', title: 'A jar is a zip of classes',
        say: 'A jar packs classes, and a manifest can name the class that starts. I made one and ran it with `java -jar`.',
        lines: function () { return G.plain(X('build.jar')); },
        after: 'The jar holds the class and a `META-INF/MANIFEST.MF` file. With `--main-class Hello` the manifest says which class to start, so `java -jar app.jar` needs nothing else. This works because `Hello` uses only the JDK. A program that uses a library needs the library at run time, which is the next screen.',
        afterKind: 'tip',
        doneSay: 'A jar is a zip with a manifest.'
      }),

      B.term({
        id: 'm1-classpath', t: 1, src: 'rec', title: 'The classpath, and a library that is missing',
        say: 'A program that uses `StringUtils` from commons-lang3. It compiled with the library on the classpath. Then I ran it without it, and with it.',
        lines: function () { return G.plain(X('build.classpath')); },
        after: 'Without the jar the JVM stopped with **`NoClassDefFoundError`** and the name of the class that it could not find (exit code ' + CP.without_exit + '). With the jar on the **classpath** it printed `' + CP.with_output + '`. The classpath is the list of folders and jars where the JVM looks for classes. **A program that compiles can still fail at run time**, because the compiler used one classpath and the JVM used another.',
        afterKind: 'warn',
        doneSay: 'NoClassDefFoundError means a class was on the compile classpath and not on the run classpath.'
      }),

      B.flow({
        id: 'm1-flow', t: 1, src: 'rec', title: 'From pom.xml to a jar', g: 'maven', legend: true,
        steps: [
          { say: 'A Maven build has four stops: the pom, the repositories, the build and the jar. Press Next.', focus: ['pom', 'repo', 'res', 'build', 'jar'], cap: 'A pom, a repository, a build, a jar.' },
          { say: 'Step 1. `pom.xml` lists what the project needs. This one names **' + MT.direct + '** libraries, and one of them is for tests only.', on: ['e1'], focus: ['pom', 'res'], cap: 'The pom says what you need.' },
          { say: 'Step 2. Maven **resolves** each library from Maven Central, or from its local copy in `~/.m2`, and keeps **one version** of each. The tree of this project has **' + MT.lines + '** lines. **The nearest declaration wins**: a pin of commons-io ' + MC.chosen_io_version + ' beat the ' + MC.wanted_io_version + ' that commons-csv asked for.', on: ['e2', 'e3'], focus: ['repo', 'res', 'build'], tags: ['tg_near'], cap: 'One version of each library.' },
          { say: 'Step 3. The build **compiles** and then **runs the tests**: **' + MP.tests_run + '** ran and passed. A wrong expectation ended in `BUILD FAILURE`, and no jar was made.', on: ['e3'], focus: ['res', 'build'], tags: ['tg_test'], cap: 'A red test stops the build.' },
          { say: 'Step 4. The jar. The shade plugin packed the libraries **inside** it, so `java -jar` printed `' + MR.shaded_output + '`. The thin jar failed with `' + MR.thin_error + '`.', on: ['e4'], focus: ['build', 'jar'], tags: ['tg_shade'], cap: 'A shaded jar runs alone.' }
        ]
      }),

      B.code({
        id: 'm1-pom', t: 1, src: 'rec', title: 'The pom.xml of the Brewline loader', file: 'pom.xml', lang: 'xml', code: POM,
        steps: [
          { say: 'This is the Maven project that built the jar of this mission. It loads a CSV file of orders into a database. Press Next.', lines: null },
          { say: 'The **coordinates** of the project: a group, an artifact and a version. Every library of the Java world has the same three.', lines: G.span(POM, /<groupId>brewline/, /<version>1\.0/) },
          { say: 'Two **properties**: compile for Java 21, and read the source as UTF-8, so that a build on another machine cannot differ.', lines: G.span(POM, /<properties>/, /<\/properties>/) },
          { say: 'The **dependencies**: `commons-csv` to read the file and the `h2` database to load it. Maven downloads each one, and the libraries that **they** need, from Maven Central.', lines: G.span(POM, /<artifactId>commons-csv/, /<version>2\.3\.232/) },
          { say: 'JUnit has **`<scope>test</scope>`**: it is on the classpath of the tests and not in the jar of the program.', lines: G.span(POM, /<artifactId>junit-jupiter/, /<scope>test/) },
          { say: 'The **shade plugin** runs at the `package` step. It copies the libraries into the jar and writes the main class into the manifest, so that the jar runs alone.', lines: G.span(POM, /<artifactId>maven-shade-plugin/, /<mainClass>/) }
        ],
        note: 'The pom of a real project has more in it. This one is as short as it can be and still build a jar that runs.'
      }),

      B.term({
        id: 'm1-build', t: 1, src: 'rec', title: 'mvn package',
        say: 'One command builds the jar. These are the steps that it ran, with the long lines cut.',
        lines: function () { return G.plain(X('maven.package')); },
        after: 'Maven ran its **lifecycle** in order: resources, compile, test resources, test compile, **test**, jar, shade. The tests ran (**' + MP.tests_run + '** of them, none failed), and only then was the jar made. If a test fails the build stops before the jar. The shade step **replaced the jar** with one that holds the libraries and kept the first one as `original-loader-1.0.jar`.',
        afterKind: 'tip',
        doneSay: 'Compile, test, package, in that order.'
      }),

      B.term({
        id: 'm1-tree', t: 1, src: 'rec', title: 'mvn dependency:tree',
        say: 'You wrote three dependencies. This is what Maven put on the classpath.',
        lines: function () { return G.plain(X('maven.tree')); },
        after: 'Three dependencies in the pom became **' + MT.lines + '** lines. `commons-csv` brought `commons-io` and `commons-codec` with it: a **transitive** dependency is a library that your library needs. JUnit and its parts are marked `test`, so they stay out of the jar. When a job fails with a missing class or a missing method, read this tree first.',
        afterKind: 'tip',
        doneSay: 'The tree shows what you got, and why.'
      }),

      B.term({
        id: 'm1-conflict-tree', t: 1, src: 'rec', title: 'Two versions of one library',
        say: 'A colleague pinned an old `commons-io` years ago. This is the tree of a project that asks for `commons-csv` and for `commons-io` 2.4.',
        lines: function () { return G.plain(X('maven.conflict_tree')); },
        after: '`commons-csv` wants `commons-io` **' + MC.wanted_io_version + '**, and the pom asks for **' + MC.chosen_io_version + '**. Maven can put only **one** version on the classpath. It uses the rule **"nearest declaration wins"**: the version in your own pom is nearest, so it won, and the other one shows as `omitted for conflict`. Maven did not warn you. The build is green.',
        afterKind: 'warn',
        doneSay: 'One version wins, and the nearest declaration decides.'
      }),

      B.term({
        id: 'm1-conflict-run', t: 1, src: 'rec', title: 'The conflict at run time',
        say: 'The project compiled. I ran it with the classpath that Maven built.',
        lines: function () { return G.plain(X('maven.conflict_run')); },
        after: 'The JVM stopped with `NoClassDefFoundError` for a class of `commons-io` that **exists in 2.16.1 and not in 2.4**. The code of the loader was right. The version was wrong. The same program with the pin changed to 2.16.1 printed `' + MX.output + '`. This is the most common way that a Java job breaks after a harmless-looking change of a library.',
        afterKind: 'warn',
        doneSay: 'A green build can still hold a wrong version.'
      }),

      B.widget({ id: 'm1-lab', kind: 'deplab', t: 1, src: 'rec', title: 'Lab: a conflict, and a jar that runs alone' }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'A project asks for commons-csv 1.11.0. The build is green, and the job fails with NoClassDefFoundError for a class of commons-io. Click the line that causes it.',
        file: 'pom.xml', lang: 'xml',
        code: '<dependencies>\n  <dependency>\n    <groupId>org.apache.commons</groupId>\n    <artifactId>commons-csv</artifactId>\n    <version>1.11.0</version>\n  </dependency>\n  <dependency>\n    <groupId>commons-io</groupId>\n    <artifactId>commons-io</artifactId>\n    <version>2.4</version>\n  </dependency>\n</dependencies>\n',
        bad: [10],
        hint: 'Which version of commons-io did commons-csv ask for?',
        why: 'The pom pins `commons-io` to **2.4**, which is nearer than the **' + MC.wanted_io_version + '** that `commons-csv` needs, so Maven kept 2.4 and `omitted` the other. In the recording the program then failed with `' + MC.error.replace('Exception in thread "main" ', '') + '`. Remove the pin so that the library brings its own version, or pin the version that it needs. Run `mvn dependency:tree` and look for `omitted for conflict`.',
        fix: '<dependencies>\n  <dependency>\n    <groupId>org.apache.commons</groupId>\n    <artifactId>commons-csv</artifactId>\n    <version>1.11.0</version>\n  </dependency>\n</dependencies>\n',
        cheer: 'Let a library bring its own dependencies.'
      }),

      B.term({
        id: 'm1-shaded', t: 1, src: 'rec', title: 'The shaded jar and the thin jar',
        say: 'Maven made two jars. I ran the one that the shade plugin made, and then the original one.',
        lines: function () { return G.plain(X('maven.run_shaded')); },
        after: 'The **shaded** jar printed `' + MR.shaded_output + '`: the total of the 50 orders, in cents, which equals the sum that Python worked out from the same rule. The **thin** jar stopped at once, because its manifest has **no main class**. And as the next screen shows, even with the main class on the classpath it lacks the libraries.',
        afterKind: 'tip',
        doneSay: 'A shaded jar carries its libraries.'
      }),

      B.term({
        id: 'm1-thin', t: 2, src: 'rec', title: 'The thin jar on the classpath',
        say: 'I gave the thin jar a main class on the command line. This is what the JVM said.',
        lines: function () { return G.plain(X('maven.run_thin')); },
        after: 'The class of the loader was found, and the first library that it needed was not: `' + MR.thin_cp_error.replace('Exception in thread "main" ', '') + '`. A **thin jar** is right when something else provides the libraries, such as a cluster that has them on its classpath. When you run `java -jar` on a machine that has nothing, you need a **fat** or shaded jar. Spark jobs are usually thin for the Spark libraries and shaded for the rest.',
        afterKind: 'tip',
        doneSay: 'Thin when the platform supplies the libraries, shaded when it does not.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A program compiles, and fails when it starts with `NoClassDefFoundError`. What does it mean?',
        opts: [
          { t: 'A class was available when the program was compiled and is not on the classpath at run time', fb: '' },
          { t: 'The source file has a syntax error', fb: 'A syntax error is found by javac, and no class file is made.' },
          { t: 'The heap is too small', fb: 'That is an OutOfMemoryError.' },
          { t: 'The JVM is too old', fb: 'That gives an UnsupportedClassVersionError.' }
        ],
        ok: 0, why: 'In the recording the class `StringUtils` was on the classpath for `javac` and missing for `java`: exit code ' + CP.without_exit + '. With the jar on the classpath the program printed `' + CP.with_output + '`.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Your pom pins a library to a version that is older than the one that another library asks for. Which one does Maven put on the classpath?',
        opts: [
          { t: 'The one in your pom, because the nearest declaration wins', fb: '' },
          { t: 'The newest version, always', fb: 'Maven does not pick the newest. It picks the nearest.' },
          { t: 'Both, in two class loaders', fb: 'The classpath holds one version of a library.' },
          { t: 'It stops the build with an error', fb: 'It did not: the build in the recording was green.' }
        ],
        ok: 0, why: 'The recorded tree says `omitted for conflict with ' + MC.chosen_io_version + '`. The build passed, and the program failed when it ran.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'A test fails in `mvn package`. What happens to the jar?',
        opts: [
          { t: 'The build stops at the test step and no jar is made', fb: '' },
          { t: 'The jar is made, and the failure is a warning', fb: 'Not unless you ask Maven to ignore failures.' },
          { t: 'The test is skipped', fb: 'It ran, and failed.' },
          { t: 'Maven fixes the test', fb: 'It does not.' }
        ],
        ok: 0, why: 'In the recording a test that expected 1251 cents got 1250: `Tests run: 2, Failures: 1`, and the build ended with `BUILD FAILURE`. Mission 5 shows the message.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the steps of a Maven build in order.',
        items: ['Read the pom and resolve the dependencies', 'Compile the sources', 'Compile and run the tests', 'Package the jar', 'Shade the libraries into the jar'],
        why: 'Resolve, compile, test, package, shade. A failure in any step stops the ones after it, which is why a failing test means no jar.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'rec', title: 'Decision: how should the loader be shipped to a server?',
        scenario: 'The loader runs every night on a small server that has Java 21 and nothing else. A colleague proposes a folder of jars and a script. Another proposes one shaded jar. A third proposes a container image.',
        opts: [
          { t: 'One shaded jar, started with `java -jar`', d: 'The server needs Java and one file. The recording: `java -jar` printed the total of the file with nothing else on the machine.', lose: 'A bigger jar, and two libraries that carry a file with the same name can overwrite each other, which the shade plugin has transformers for.' },
          { t: 'A folder of jars and a start script', d: 'Small updates: replace one jar.', lose: 'The classpath is a list in a script. A missing or wrong jar is the failure of mission 1, and the folder drifts from the build.' },
          { t: 'A container image with Java and the jar', d: 'The same everywhere, including the Java version.', lose: 'More to build and to store, and the Docker course is where it belongs.' }
        ],
        pick: 0,
        why: 'The server has Java and nothing else, so a jar that carries its libraries is the least that can go wrong, and it is what the recording ran. An image is a good next step when the team already runs containers.',
        when: 'On a platform that provides the libraries, such as a Spark cluster, ship a thin jar.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the nightly loader fails after a harmless upgrade', time: '03:10',
        alert: '**The loader started failing at 02:30 with `NoClassDefFoundError: org/apache/commons/io/output/AppendableOutputStream`.** Yesterday the team upgraded `commons-csv` to 1.11.0. The build was green and the unit tests passed.',
        clues: ['The error names a class of `commons-io`, a library that nobody upgraded', 'The pom has a `commons-io` dependency at version 2.4', 'The unit tests do not read a CSV file'],
        opts: [
          { t: 'Run `mvn dependency:tree`, find the conflict, and remove the old pin of commons-io', fb: '' },
          { t: 'Roll back commons-csv and say nothing', fb: 'It works tonight. The old pin is still there for the next upgrade.' },
          { t: 'Add a catch for the error in the code', fb: 'A NoClassDefFoundError is not a case that code can handle.' },
          { t: 'Increase the heap', fb: 'It is not a memory error.' }
        ],
        best: 0,
        why: 'The recording of this exact case: the tree said `commons-io:2.16.1 omitted for conflict with 2.4`, and the program failed with this error. With the pin at 2.16.1 it printed `' + MX.output + '`. The tree shows the conflict in one command.',
        checks: [
          ['Read the error', 'A class of a library that nobody changed.'],
          ['Read the tree', '`mvn dependency:tree -Dverbose` shows `omitted for conflict`.'],
          ['Find the pin', 'An old version in the pom of the project.'],
          ['Test the path', 'Add a test that reads a CSV file, so that it breaks in the build next time.']
        ],
        tell: 'An old pin of commons-io in our pom was nearer than the version that the new commons-csv needs, so Maven kept the old one, and the loader failed when it read a file. I removed the pin, ran the loader on a sample file, and added a test that parses a small CSV, so that this fails in the build.',
        prevent: ['Run **`mvn dependency:tree`** after every upgrade and read `omitted`', 'Add a test that **uses** each library', 'Prefer a **bill of materials** or a managed version, and avoid pins']
      }),

      B.qa({
        id: 'qa-classpath', t: 1, tag: 'Java', secs: 60,
        q: 'What is the classpath, and what does NoClassDefFoundError mean?',
        pts: ['The folders and jars where the JVM looks for classes', 'Compile classpath and run classpath can differ', 'The error: a class that was there at compile time is missing at run time', 'Fix: the dependency tree'],
        short: 'The **classpath** is the list of folders and jars where the JVM looks for classes when it needs one. `NoClassDefFoundError` means that a class was available when the code was compiled and the JVM cannot find it now, so the two classpaths differ. In my recording a program that used `StringUtils` compiled with the commons-lang3 jar, and failed with this error when I ran it without the jar, and printed 000042 with it. In a Maven project the usual cause is a dependency with the wrong scope, a jar that was not shaded, or a version conflict, and I start with `mvn dependency:tree`.',
        fu: [['What is ClassNotFoundException?', 'The same problem when a class is loaded by name, for example by a driver. The Error is thrown when a class that was linked at compile time is missing.'], ['What about the module path?', 'Java also has modules. Most data tools still use the classpath.']],
        trap: 'Adding jars by hand until the error goes away.',
        real: 'Describe a missing class that you fixed.'
      }),

      B.qa({
        id: 'qa-maven', t: 1, tag: 'Java', secs: 75,
        q: 'How does Maven resolve dependencies, and how do you fix a version conflict?',
        pts: ['The pom lists direct dependencies', 'Maven adds the transitive ones', 'One version of each library: nearest wins', 'dependency:tree, then remove the pin or manage the version'],
        short: 'The pom lists the **direct** dependencies. Maven downloads each one from Maven Central or its local repository, and also the libraries that they need, the **transitive** ones. The classpath can hold only one version of a library, and when two are asked for, Maven uses the one that is **nearest** to your pom, so a version that you declare beats the one that a library wants. In my recording an old pin of commons-io beat the version that commons-csv needed, the build was green and the program failed with a missing class. I find it with `mvn dependency:tree -Dverbose`, which marks the lost version `omitted for conflict`, and I fix it by removing the pin or by managing the version in `dependencyManagement`.',
        fu: [['What is a scope?', 'compile, test, provided and runtime say where a dependency is on the classpath.'], ['Does Gradle do the same?', 'Gradle picks the newest version by default. Check the rule of the tool.']],
        trap: 'Saying that Maven picks the newest version.',
        real: 'Describe a conflict that you found with the tree.'
      }),

      B.qa({
        id: 'qa-shade', t: 2, tag: 'Java', secs: 60,
        q: 'What is a shaded jar, and when do you use one?',
        pts: ['A jar that contains the libraries too', 'The shade plugin, with a main class in the manifest', 'Thin jar when the platform supplies the libraries', 'Watch for clashes of files and versions'],
        short: 'A **shaded** jar, also called fat or uber, holds your classes and the classes of your libraries in one file, so that `java -jar` runs it on a machine that has only Java. The Maven shade plugin makes it at the `package` step, replaces the jar with the shaded one, and writes the main class into the manifest. In my recording the shaded jar printed the total of the 50 orders, and the thin jar failed because it had no main class, and failed again with a missing class when I gave it one. A **thin** jar is right when the platform supplies the libraries, which is usual for Spark jobs. The risks of shading are two libraries that carry a file with the same name, and two versions of one library in the jar.',
        fu: [['What is relocation?', 'The shade plugin can rename the packages of a library inside the jar to avoid a clash.'], ['Does Spark use it?', 'Often: shade what the cluster does not have and mark the Spark libraries provided.']],
        trap: 'Shading the libraries that the platform already has.',
        real: 'Describe how your last job was packaged.'
      }),

      B.qa({
        id: 'qa-javac', t: 1, tag: 'Java', secs: 45,
        q: 'What is the difference between the JDK and the JVM, and between compile time and run time?',
        pts: ['JDK: the tools to build (javac, jar, javap) and a runtime', 'JVM: runs bytecode', 'Compile time: types are checked, class files are made', 'Run time: classes are loaded from the classpath'],
        short: 'The **JVM** runs bytecode. The **JDK** is the kit for developers: it holds the JVM and the tools that build, such as `javac`, `jar` and `javap`. At **compile time** `javac` checks the types and writes class files, and in my recording it refused a String where an int belongs and wrote no class file. At **run time** the JVM loads classes from the classpath and turns the bytecode into machine code as the program runs. That is why a type error stops the build, while a missing library or a wrong version of one shows up only when the code runs, and why I test the real path with a sample file.',
        fu: [['What is the JRE?', 'The runtime without the build tools. Modern distributions ship the JDK.'], ['What is the JIT?', 'The part of the JVM that compiles hot bytecode to machine code while it runs.']],
        trap: 'Saying that Java compiles to machine code.',
        real: 'Say which JDK your team uses and why.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Builder', color: '#FDE68A',
        pts: [
          '`javac` checks the types and makes **bytecode**: a `String` for an `int` stopped with exit code **' + CE.exit_code + '** and no class file.',
          '`NoClassDefFoundError`: the class was on the compile classpath and not on the **run** classpath.',
          'Maven ran resolve, compile, **' + MP.tests_run + ' tests**, package, shade. A failing test means **no jar**.',
          '**One version** of a library reaches the classpath, and the **nearest declaration wins**. A pin of 2.4 beat the 2.16.1 that commons-csv needed.',
          'A **shaded** jar printed `' + MR.shaded_output + '` on its own. A thin jar needs the platform to supply its libraries.'
        ],
        lines: [
          'I can read a Maven build and its dependency tree.',
          'I can find a version conflict.',
          'I know which jar to ship.'
        ]
      })
    ]
  });
})();
