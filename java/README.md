# Java for data engineers

A guided, press-Next course on the part of Java that a data engineer meets: how a `.java` file becomes a running job, what Maven does and why a jar can fail on a server that worked on a laptop, how records and streams read, why money is never a `double`, what an `OutOfMemoryError` says and how to read a file bigger than the heap, how JDBC loads a database without opening the door to SQL injection, and what a race and a `NotSerializableException` look like. Every lesson follows one coffee retailer, **Brewline**, and one coach, **Hugo**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `java/verify/capture_java.py` on one Linux machine: **OpenJDK 21.0.12.1** (`javac`, `java`, `javap`, `jar`), **Maven 3.9.11** with JUnit 5.11.4 and the Shade plugin 3.6.0, the **H2 2.3.232** database through JDBC, and the libraries commons-csv 1.11.0, commons-io 2.16.1 and 2.4, and commons-lang3 3.14.0. The machine had 4 CPUs, and the default collector was G1 with a default heap of 3,420 MB. The code on the screens is the code that ran, with made-up Brewline data. Nothing is timed |
| **From documentation** | Everything that was not run: how a container counts memory, other garbage collectors, connection pools, the choice between a pool and virtual threads for a slow API, the rules of thumb for locks, and the decisions. These screens say so |

The stand-ins and limits, said again where they matter:

- **Spark, Kafka, Flink and Hadoop did not run.** They have courses of their own in this library, or will have. The lessons teach the Java rules that they depend on (a task is serialized and sent to workers, a connection cannot travel), and the recorded error is the plain Java one.
- **H2 stands in for a database server.** JDBC ran against an in-memory H2 database, so the batches, the injection and the transaction are real, and a network, a connection pool and a server such as PostgreSQL are not. No timing is quoted, because an in-process database says nothing about round trips.
- **One JDK and one collector.** JDK 21 is recorded. Java 25 is a newer long-term-support release, and the lessons were not re-run on it. Features that changed between the two can read differently there.
- **A container did not run.** The lesson on a container that is killed with a half-full heap is from documentation.
- **A race is luck.** The plain counter lost an update in all three recorded runs, and the verifier only requires that it loses one at least once. The lab quotes the number of runs, and never a total, because a lost-update total is different every time.
- **The data is made up.** A file of a million orders built from fixed rules with no random numbers (49 MB), a 50-order file, and a table of 1,000 orders.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Paths of the temporary folder are replaced by `~`, and the `JAVA_TOOL_OPTIONS` notice of this sandbox is removed.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 271 | about 3 hours | Starting out, or interviewing for a junior data engineer role where Java is part of the job |
| **Senior** | 361 | about 4 hours | Everything in Junior, plus dependency conflicts in depth, the shaded jar, memory and the container, pools and virtual threads, serialization and the decisions that seniors own |
| **Everything** | 362 | about 4 hours | Adds one finer point: what the bytecode of a method looks like (`javap`) |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **Build and dependencies.** `javac`, the classpath, Maven, a version conflict and a jar that runs alone | 20 min | 27 min | 28 min |
| 2 | **Records and streams.** The parts of modern Java that pipelines use every day | 24 min | 28 min | 28 min |
| 3 | **Numbers, text and time.** Money without lost cents, and time across a change of clocks | 16 min | 28 min | 28 min |
| 4 | **Files and memory.** Read a file that is bigger than the heap, and read an `OutOfMemoryError` | 16 min | 26 min | 26 min |
| 5 | **A database and a test.** JDBC with batches and a transaction, a value that is never glued into SQL, and a JUnit test | 25 min | 29 min | 29 min |
| 6 | **Threads and serialization.** A race on a shared counter, a pool, virtual threads, and what can be sent to another machine | 20 min | 31 min | 31 min |
| 7 | **Boss round.** Two drills, a decision, a coding round, a mock interview and a one-page review | 44 min | 63 min | 63 min |

Mission 0 is the start: pick a path and see the whole picture (7 minutes).

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through three searches: data engineer roles that name Java with Spark and Kafka, senior Java roles that name JVM tuning, concurrency, Maven and JUnit, and the current Java long-term-support release. I read the search summaries and not every posting, the results were job boards that repeat each other, and some were expired or truncated, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Java with Spark for batch and streaming pipelines, Kafka ingestion, and Flink as an alternative | 5, 6 | **Not run here.** Spark, Kafka and Flink have their own courses. This course covers what they rest on: the JVM, memory, threads and serialization. **Recorded**: a record that holds a connection fails with `NotSerializableException` |
| Core Java and SQL, and JDBC to databases | 2, 5 | **Recorded**: records and streams, JDBC batches, a bound parameter against an injected one, a transaction and a rollback on H2 |
| Maven or Gradle, Git and CI/CD tools | 1 | **Recorded**: Maven (a build with tests, a dependency tree, a version conflict, a shaded jar). **Gradle is not covered**. Git and CI have courses of their own |
| JUnit and test automation | 5 | **Recorded**: a JUnit 5 test in the Maven build, and a wrong expectation that stops the build. Mockito is **not covered** |
| JVM internals, garbage collection and memory management | 4 | **Recorded**: the heap limit, `OutOfMemoryError`, streaming a file in 32 MB. **From documentation**: how the collector works, other collectors, container memory. JVM performance profiling and tuning with JFR, async-profiler or JMH is **not covered** |
| Concurrency, asynchronous programming and backpressure | 6 | **Recorded**: a race, an atomic counter, a pool, a thousand virtual threads. **From documentation**: locks, deadlocks, sizing. Non-blocking I/O and backpressure are **not covered** |
| Cloud (AWS EMR, S3), Kubernetes, Docker | none | Courses of their own in this library |
| Six to twelve years of experience for senior to principal roles | all | The senior path is written for this. No course replaces the years |

The 24 interview questions are written from the topics that these postings share and from the usual interview themes on the JVM: the classpath and Maven, records and streams, money and time, the heap, the garbage collector and a killed container, JDBC and injection, transactions, testing, races, pools and serialization. I did not check them against a list of real interview questions.

## What you work through

- **Follow Brewline.** One loader. A library version that Maven picked, a jar that cannot start, a total that is a few cents off, a file that does not fit the heap, a search value that matched every row, a counter that lost updates, a task that cannot be sent.
- **5 animated diagrams.** From a source file to a running job, from a pom to a jar, a lazy stream, a Java object that becomes a row, and eight threads and one counter.
- **5 labs.** A conflict and a jar that runs alone, four ways to read a file against a small heap, `double` against `BigDecimal` with an `int` that wraps and a rounding rule, JDBC with a batch, an injection and a rollback, and four ways to count with threads.
- **22 terminal replays, 11 code walkthroughs and 6 comparison tables.** The commands with their real output, and the files `Orders`, `Streams`, `Numbers`, `Times`, `Memory`, `Jdbc`, `Race`, `Ser`, the loader and its test, and the `pom.xml`.
- **25 quizzes, 14 bug hunts, 6 ordering games, 7 decisions with a recommended answer and 8 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **24 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The boss round plays all of them in a mock interview, and one coding round (cents by store from a stream of lines).

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 8 chapters, 179 screens: 136 for everyone, 42 for Senior, 1 extra. 60 screens are tagged Recorded and 14 From documentation |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 271 frames on the Junior path, 361 on the Senior path and 362 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js java`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 632 checks passed, 0 failed |
| The 5 labs driven in the browser (`java/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the heap that each command asked for, the colour that follows from an exit code, bars in proportion, the error of a double sum, the runs of three that were short or exact) | 155 checks passed |
| Recorded output (`java/verify/capture_java.py`) | 18 files, 24 texts and 15 sets of counts, plus the 7 values of the recording itself. The recorder takes about 40 seconds with the Maven cache warm, needs Maven Central once, and removes everything it made |
| The files, parsed (`java/verify/verify_java.py`) | The 18 project files of the recording are the files on disk, and the 13 code screens that show one show it exactly. Every Java snippet of the lessons (53, with the bug hunts and their fixes, and the solution of the coding round) goes through the parser of `javac`, and every XML snippet through an XML parser. Parsing checks syntax and nothing else |
| The coding round, run (`verify_java.py`) | The solution shown on the screen is compiled and run against eleven inputs that Python worked out with exact decimals (including an amount with 19 digits), and against three amounts with a third decimal that it must refuse. A version that rounds and a version that parses through a `double` are both caught by those cases |
| Bug hunts run (`verify_java.py`) | 13 of the 14 hunts are compiled and run, each snippet next to its fix, in a small harness. Seen: `toMap` stops on a duplicate key and the merge function fixes it, `List.of` refuses `add`, a double total is `0.30000000000000004` and a `BigDecimal` total is `0.3`, `new BigDecimal(0.1)` has 55 digits, a local time in the gap moves from 02:30 to 03:30, `readAllLines` runs out of a 16 MB heap on a file of 300,000 lines and a `BufferedReader` sums it, `Files.lines` leaves 20 of 20 files open until the stream is closed (counted in `/proc/self/fd`), a glued value matches all 1,000 rows and a bound one none, a single-row load and a batch load the same rows, with autocommit on a failed second statement leaves the first one in place and with a transaction it is rolled back, a parallel stream that changes a shared variable gave a wrong total in 30 of 30 runs and the reduce gave the right one every time, a record that holds a connection is refused and a record with the URL travels and opens its own, and a `SimpleDateFormat` shared by 8 threads gave wrong results. The dependency hunt is the `pom.xml` of the conflict project that ran. The race hunts are luck, so the verifier reports one that does not show on a machine, and does not fail it |
| Recapture (`verify_java.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 64 items, 0 differ. Nothing is timed, so only three things are allowed to differ: the date, the number of CPUs, and which of the three race runs lost an update (at least one must) |
| Lab data (`java/verify/check_widgets.js`) | 66 checks written in code that shares nothing with the widgets: the cents of a 50-order file and of a file of a million orders, and the size of that file, worked out from the rules that made them. A million additions of 0.10 repeated in JavaScript. The rounding of two prices. The dates of the clock changes in New York. The rows that JDBC must have printed (store 1 is every twelfth order, so the delete leaves 917). The sum of the squares of 1 to 10. How the heap of each command must agree with what the JVM printed. The coding round in integer cents |
| Controls | 35 deliberately broken inputs, and each one is refused: Java and XML with a syntax error, solutions of the coding round that round or parse through a double, bug-hunt expectations, 17 changes to the recording that the widget checker must refuse (a total one cent off, a heap of 64 MB that ended with exit code 0, a rollback that leaves 916 rows, a bound parameter that matched a row, a pool that summed to 384, an atomic counter that was short, a clock gap that is not skipped, a replay whose command used another heap than the line that it printed), changes to the recording that the recapture comparison must refuse, and 7 changes to the widget code that the browser test must catch (a bar against the wrong maximum, a failed run coloured as good, a wrong exit code, an error against 100,001, swapped colours, a sum one too high, a count one too low) |

### What was not checked

- **Spark, Kafka, Flink, Hadoop and a database server did not run.** Anything that the lessons say about them comes from the Java rules that they use, and the screens say so.
- **One JDK, one collector.** JDK 21 with G1. A recording on Java 25 may print different numbers, and the lessons were not re-run on it.
- **No timings.** The recording counts rows, files, bytes and exit codes, and never seconds. Nothing here says how fast a batch is against a real server.
- **Memory limits were set on the command line**, and no container was used.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not security advice.** The lesson on SQL injection shows the one rule that prevents it. A real service needs more than that.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| Java 25 is the current long-term-support release (September 2025) and Java 21 is the previous one | Search summaries: Oracle and Microsoft pages and press | [Oracle Java SE support roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) |
| The end dates of support for Java 21 and Java 25 | **Not quoted.** The summaries disagree between vendors (Oracle lists premier and extended support, and Eclipse Temurin lists an availability date), and one summary says that updates of JDK 21 after September 2026 move to another license, which I could not confirm. Check the vendor that you use | [Oracle Java SE support roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html), [Adoptium support](https://adoptium.net/support) |
| A long block inside `synchronized` can pin a virtual thread to its carrier thread in Java 21, and a later release changed this | **From my memory, not looked up.** The lesson says "can pin", and nothing recorded depends on it | none |
| The documentation of `SimpleDateFormat` says that it is not thread-safe | **From my memory of the documentation, not looked up.** The verifier saw wrong results with 8 threads on one machine | none |
| `Files.lines` keeps the file open until the stream is closed, and the operating system limits the open files | **From my memory of the documentation.** The verifier counted 20 open files after 20 calls | none |
| A JVM in a container uses memory outside the heap (metaspace, thread stacks, direct buffers), and a container limit counts the whole process | **From my memory of the documentation, not looked up** | none |
| `HikariCP` as the usual connection pool, `COPY` as the bulk load of PostgreSQL, JFR, async-profiler and JMH as the usual profiling tools | **From my memory, or named in a posting summary, not looked up** | none |
| The job postings: direction only, from search summaries | Pages of job boards. A small sample, some of it expired or truncated | [example: Java Spark Engineer](https://www.dice.com/job-detail/f8467eb8-89c0-4412-9a5e-493597e6bec4), [example: Senior Big Data Engineer (Java focus)](https://platform-v2.wearedevelopers.com/en/jobs/ext/5675369/senior-big-data-engineer-java-focus) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Five diagrams: from a source file to a running job (the compiler step and the heap step), from a pom to a jar (the resolve step and the jar step), a lazy stream (the terminal step and the step that stops), a Java object that becomes a row (the batch step and the transaction step), and eight threads and one counter (the race step and the atomic step). The heap diagram of mission 4, at the step with its limit.
- Five labs in their first state: a conflict, four ways to read a file, double against `BigDecimal`, JDBC (on the glued value), and four ways to count.
- The welcome screen, the coding round before an answer, and the top of the one-page review.
- Coach Hugo, who is in every one of those screens.

Looking found faults that the tests could not see, and all of them are fixed: in the JDBC diagram the words "PreparedStatement" and "speaks to the database" ran out of their boxes and "a statement with ?" was cut off, the tag of the heap limit sat on top of the Heap node and covered its label, the tag of the shaded jar ran past the edge of the Maven diagram, the long numbers of the money lab ("0.30000000000000004", "100000.00000133288") broke across two lines in the middle of the number, and the file size showed as "48.90 MB". The welcome speech of Hugo was longer than the space for it, and was cut down.

## Files

```
java/
  index.html, css/java.css     the page and its colours
  js/config.js                 the course settings: Coach Hugo, the paths, the levels
  js/graphs.js                 5 diagram specs
  js/widgets.js                the 5 labs
  js/content/                  one file per mission, 00 to 07
  js/real.js                   the recording: files, texts and counts written by capture_java.py
  verify/project/              the Brewline programs that ran: Hello, BadTypes, Adder, UsesLib, Orders, Streams, Numbers, Times, Memory, Jdbc, Race, Ser, Challenge,
                               a Maven project with a loader and its test, and a Maven project with a version conflict
  verify/javalib.py            helpers of the recorder: running the tools in a temporary folder, masks and the writer of js/real.js
  verify/capture_java.py       runs the programs, Maven, and the experiments, and writes js/real.js
  verify/verify_java.py        parses and runs the code, runs the bug hunts, compares a new recording with js/real.js, runs the controls
  verify/ParseCheck.java       the parser of javac, used by verify_java.py
  verify/check_widgets.js      recomputes the numbers of the labs from the rules of the data
  verify/e2e_labs.js           drives the five labs in Chromium
  verify/dump_java.js          lists the code, the commands and the strings of the course for verify_java.py
  verify/requirements.txt      what the machine needs
  verify/INTEGRATION.md        what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 java/verify/verify_java.py                                  # parse and run the code, the bug hunts, lab data and controls (about 1 minute)
python3 java/verify/verify_java.py --recapture --browser            # also record everything again and compare, and drive the labs (needs Maven, the network once, and Playwright)
python3 java/verify/capture_java.py                                 # write a new java/js/real.js
node dev/lint-content.js java && node dev/e2e.js java               # lint and interaction test
node dev/smoke.js java --path all                                   # walk every frame
node java/verify/check_widgets.js && node java/verify/e2e_labs.js   # the lab data, and the labs in a browser
```
