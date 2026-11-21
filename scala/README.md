# Scala for data engineers

A guided, press-Next course on the part of Scala that a data engineer meets: how a `.scala` file becomes a running job and why a library of another Scala version fails at run time while the compiler stays quiet, case classes and the match that the compiler checks, collections that are strict or lazy and the three traps that corrupt a total, errors as values so that a job can collect every bad row, and typed Spark with a closure that cannot be sent to the executors. Every lesson follows one coffee retailer, **Brewline**, and one coach, **Skye**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `scala/verify/capture_scala.py` on one Linux machine: the **Scala 2.13.16** compiler and library (the version that Spark 4.0.1 is built with, taken from the pyspark package), a **Scala 2.12.20** compiler from Maven Central (for the two-versions experiment), **OpenJDK 21.0.12.1**, and a local **Spark 4.0.1** session started with `spark-submit`. The code on the screens is the code that ran, with made-up Brewline data. Nothing is timed |
| **From documentation** | Everything that was not run: sbt and assembly jars, Scala 3, the choice of language for a team, how Spark's optimizer treats a lambda, the memory of a driver, and the decisions. These screens say so |

The stand-ins and limits, said again where they matter:

- **The `scalac` script was not installed.** The recorder starts `scala.tools.nsc.Main`, the class that the script starts, with the compiler jars on the classpath. The terminal replays write that command as `scalac`, and the course says so on its first screens.
- **Spark ran in local mode, with two threads and 1,000 orders built by a lambda.** No cluster, no files and no executors on other machines ran. The failure of a lambda that cannot be serialized is the real one, and Spark serializes the lambda in local mode too, but the screens never claim that a cluster ran.
- **Scala 3 and sbt did not run.** What the lessons say about them is from documentation or from memory, and is tagged so. The build lesson shows a `build.sbt` bug that is checked as text only.
- **Two Scala versions, one experiment.** The 2.12 library, the 2.13 application and the failure are recorded. Which other versions break in which way is not claimed.
- **The order of a map is not a promise.** The two Scala versions printed the same map in another order, and the lesson says to never rely on it.
- **The data is made up.** Four sales lines, five lines of a file with three bad ones, and a Dataset of 1,000 orders built from fixed rules with no random numbers.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Paths of the temporary folder are replaced by `~`, and the `JAVA_TOOL_OPTIONS` notice of this sandbox is removed.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 192 | about 2 hours | Starting out, or interviewing for a junior data engineer role where Scala or Spark is part of the job |
| **Senior** | 258 | about 3 hours | Everything in Junior, plus binary versions in depth, laziness, errors that add up, how Spark sends your code, and the decisions that seniors own |
| **Everything** | 259 | about 3 hours | Adds one finer point: what the compiler says about a class that has no encoder |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **Build and versions.** `scalac`, the classpath, the Scala library, a jar, and a library of another Scala version | 16 min | 22 min | 22 min |
| 2 | **Case classes and pattern matching.** The parts of Scala that pipelines use every day | 19 min | 26 min | 26 min |
| 3 | **Collections and functions.** `map`, `groupMapReduce` and `foldLeft`, and what is strict and what is lazy | 18 min | 25 min | 25 min |
| 4 | **Errors as values.** `Option`, `Either` and `Try`: a bad row is a value that a job can collect | 15 min | 22 min | 22 min |
| 5 | **Scala on Spark.** A typed Dataset, a typo, a closure that cannot be sent, and a missing encoder | 17 min | 26 min | 27 min |
| 6 | **Boss round.** Two drills, a decision, a coding round, a mock interview and a one-page review | 33 min | 50 min | 50 min |

Mission 0 is the start: pick a path and see the whole picture (7 minutes).

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through two searches: data engineer roles that ask for Scala and Spark, and the state of Scala versions in Spark 4. I read the search summaries and not every posting, the results were job boards that repeat each other, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Strong Scala, and production-grade Scala applications | 1 to 4 | **Recorded**: compile, run, case classes, a sealed trait and a match, collections, errors as values |
| Functional programming: immutability, higher-order functions, monads | 2, 3, 4 | **Recorded**: immutable case classes and `copy`, `map`/`flatMap`/`foldLeft`, `Option` and `Either` in a `for`. **Monads** are used (a `for` over `Option` and `Either`) and the word is not taught as theory |
| Spark with Spark SQL, DataFrames and Datasets, and performance tuning (partitions, caching, shuffle, broadcast joins) | 5 | **Recorded**: a typed `Dataset`, a typo found early or late, a closure, an encoder. **Tuning is not covered**: nothing about partitions, caching, shuffles or joins was run |
| Kafka, Hive, Delta Lake, Snowflake, SQL and Airflow around Spark | none | Courses of their own in this library |
| Cloud (AWS), Terraform, CI/CD | none | Courses of their own in this library, or planned |
| Case classes, complex data structures and algorithms, clean and testable code | 2, 3 | **Recorded**: case classes and collections. **Testing in Scala (ScalaTest, MUnit) is not covered** |
| Five to ten years of experience for mid to senior roles | all | The senior path is written for this. No course replaces the years |

The 18 interview questions are written from the topics that these postings share and from the usual Scala interview themes: binary versions, the classpath, case classes, sealed types, `val` and `var`, collections and laziness, `Option`, `Either` and `Try`, bad rows, closures, Datasets, encoders and `collect`. I did not check them against a list of real interview questions.

## What you work through

- **Follow Brewline.** One loader and one Spark job. A library built for another Scala version, a refund that stops a job, a SKU that lost a line, a total that is a few cents short because a bad row vanished, and a filter that cannot be sent to the executors.
- **4 animated diagrams.** From a source file to a running job, two Scala versions in one program, a strict list against a view, and a lambda sent to the executors.
- **4 labs.** Five builds and what ran, a case class and a match (equal, copy, a case left out, the `MatchError`), five lines through a parser, and five cases on Spark (a typo caught early and late, a lambda that cannot travel, the fix, and a missing encoder).
- **12 terminal replays, 6 code walkthroughs and 6 comparison tables.** The commands with their real output, and the files `Totals`, `Orders`, `Partial`, `Collections`, `Errors` and `SparkApp`.
- **20 quizzes, 14 bug hunts, 5 ordering games, 6 decisions with a recommended answer and 7 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **18 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The boss round plays all of them in a mock interview, and one coding round (cents by store from an iterator of lines, collecting every bad line with its number).

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 7 chapters, 137 screens: 101 for everyone, 35 for Senior, 1 extra. 46 screens are tagged Recorded and the rest From documentation |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 192 frames on the Junior path, 258 on the Senior path and 259 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js scala`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 473 checks passed, 0 failed |
| The 4 labs driven in the browser (`scala/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the colour that follows from an exit code, the `Right` or `Left` that the rules of the parser give for each of the five lines, the counts of the 1,000 orders worked out from the rule that made them) | 144 checks passed |
| Recorded output (`scala/verify/capture_scala.py`) | 12 files, 14 texts and 11 sets of counts, plus the 7 values of the recording itself. The recorder takes about 45 seconds, needs Maven Central once (for the Scala 2.12 jars), and removes everything it made |
| The files, parsed (`scala/verify/verify_scala.py`) | The 12 project files of the recording are the files on disk, and the 8 code screens that show one show it exactly. Every Scala snippet of the lessons (47, with the bug hunts and their fixes, and the solution of the coding round) goes through the parser of the Scala compiler, which stops after parsing. Parsing checks syntax and nothing else |
| The coding round, run (`verify_scala.py`) | The solution shown on the screen is compiled and run against eleven inputs that Python worked out with exact decimals (including an amount with 19 digits), five bad amounts, a line with three fields, and 100,000 additions of 0.10. A version that rounds and a version that parses through a `double` are both caught by those cases |
| Bug hunts run (`verify_scala.py`) | 13 of the 14 hunts are compiled and run, each snippet next to its fix: ten in small Scala programs and three on a local Spark 4.0.1 session. Seen: a type mismatch stops the compiler, a match without `Refunded` warns and then fails with a `MatchError`, `eq` is false for equal fields and `==` is true, a `var` in a case class changes its hash so a set loses it, `toMap` gives 5 where the lines add up to 7, a missing key throws, an iterator used twice prints nothing the second time, `Option.get` throws `None.get`, `flatMap` over `Try(...).toOption` hides a bad line, a `for` over `Either` stops at the first error, a lambda that uses `Settings` fails with `Task not serializable` and the copied number counts 901, a column typo is `UNRESOLVED_COLUMN` at run time, and `collect()` and `reduce` give the same total on 1,000 orders. The 14th (a `build.sbt` with `_2.12` written by hand) is checked as text, because sbt did not run |
| Recapture (`verify_scala.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 0 items differ. Nothing is timed, so only one thing is allowed to differ: the date |
| Lab data (`scala/verify/check_widgets.js`) | 41 checks written in code that shares nothing with the widgets: the five lines of the parser worked out again from its rules, the sales lines added up by SKU, how many steps a strict list and a view must take (simulated), the orders of the Spark session counted from the rule that made them, the cents by store of the coding round, and the Scala versions of the builds |
| Controls | 32 deliberately broken inputs, and each one is refused: Scala with a syntax error (4), solutions of the coding round that round or parse through a double (2), the fix of a bug hunt run through the check of its bad snippet (1), 16 changes to the recording that the widget checker must refuse (a parser that accepts a third decimal, a strict list that took 7 steps, a `toMap` that added the duplicates, a Dataset with 901 placed orders, a mixed build that exits with 0, a coding round that numbers the bad lines from 0, and ten more), changes to the recording that the recapture comparison must refuse, and 6 changes to the widget code that the browser test must catch |

### What was not checked

- **Scala 3, sbt, assembly jars, a cluster and Spark Structured Streaming did not run.** Anything that the lessons say about them is tagged From documentation.
- **One Scala version, one Spark.** Scala 2.13.16 and Spark 4.0.1, plus Scala 2.12.20 for one experiment. A recording on other versions may print other texts.
- **No timings.** The recording counts steps, rows and exit codes, and never seconds. Nothing here says how fast a Spark job runs.
- **Spark ran locally.** The lessons about executors describe what Spark does with a lambda and say so, and no executor on another machine ran.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| Spark 4.0 dropped Scala 2.12 and made Scala 2.13 the default, and third-party connectors need builds for Spark 4 and Scala 2.13 | Search summaries: the Spark 4.0.0 release notes and the Spark downloads page, and migration guides | [Spark Release 4.0.0](https://spark.apache.org/releases/spark-release-4-0-0.html) |
| Spark does not target Scala 3 | **Not found.** No source in the results says it, and one blog remark implies it. The lessons say "does not target it" from my memory. Check the Spark documentation of your version | none |
| `%%` in sbt appends the Scala suffix of `scalaVersion` to the name of a dependency, and `Provided` keeps a library out of the assembly | **From my memory of the sbt documentation, not looked up** | none |
| The options of the compiler that turn warnings into errors (`-Xfatal-warnings`) and the name of the flag in your version | **From my memory, not looked up** | none |
| A Spark lambda is opaque to the optimizer, `collect()` brings every row to the driver, and Kryo and `@transient` behave as described | **From my memory of the Spark documentation, not looked up** | none |
| The job postings: direction only, from search summaries | Pages of job boards. A small sample | [example: Data Engineer with Scala and Spark](https://www.dice.com/job-detail/3ced05ef-0362-4b54-9b9c-3ae0503c5798), [example: Spark / Scala Senior Engineer](https://www.wearedevelopers.com/jobs/ext/7280868/spark-scala-senior-engineer) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Four diagrams: a source file becoming a running job (the library step), two Scala versions in one program (the step with the mixed build), a strict list against a view (the step of the view), and a lambda sent to the executors (the step where serialization fails).
- The four labs in their first state: five builds, a case class and a match, five lines through a parser, and five cases on Spark.
- The welcome screen.
- Coach Skye, who is in every one of those screens.

Looking found faults that the tests could not see, and all of them are fixed: in the two-versions diagram the word "NoSuchMethodError" ran out of its box and a long error text broke the coach bubble, in the Spark diagram the subtitles "uses settings.minCents" and "function and what it uses" ran out of their boxes, and in the first diagram the tag "without it: NoClassDefFoundError" sat on top of the library box. The Spark lab title was cut down so that it fits on one line. Every screen that is not listed here was checked by the tests above and was not looked at.

## Files

```
scala/
  index.html, css/scala.css    the page and its colours
  js/config.js                 the course settings: Coach Skye, the paths, the levels
  js/graphs.js                 4 diagram specs
  js/widgets.js                the 4 labs
  js/content/                  one file per mission, 00 to 06
  js/real.js                   the recording: files, texts and counts written by capture_scala.py
  verify/project/              the Brewline programs that ran: Hello, BadTypes, Totals and UseTotals, Orders, Partial, Collections, Errors, Challenge, SparkApp, BadTyped, BadEncoder
  verify/scalalib.py           helpers of the recorder: the Scala compiler from the pyspark jars, running the tools in a temporary folder, masks and the writer of js/real.js
  verify/capture_scala.py      runs the programs, the 2.12 compiler and Spark, and writes js/real.js
  verify/verify_scala.py       parses and runs the code, runs the bug hunts, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js      recomputes the numbers of the labs from the rules of the data
  verify/e2e_labs.js           drives the four labs in Chromium
  verify/dump_scala.js         lists the code, the commands and the strings of the course for verify_scala.py
  verify/requirements.txt      what the machine needs
  verify/INTEGRATION.md        what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 -m venv scala-env && scala-env/bin/pip install pyspark==4.0.1
scala-env/bin/python scala/verify/verify_scala.py                       # parse and run the code, the bug hunts, lab data and controls (about 2 minutes)
scala-env/bin/python scala/verify/verify_scala.py --recapture --browser # also record everything again and compare, and drive the labs (needs Maven, the network once, and Playwright)
scala-env/bin/python scala/verify/capture_scala.py                      # write a new scala/js/real.js
node dev/lint-content.js scala && node dev/e2e.js scala                 # lint and interaction test
node dev/smoke.js scala --path all                                      # walk every frame
node scala/verify/check_widgets.js && node scala/verify/e2e_labs.js     # the lab data, and the labs in a browser
```
