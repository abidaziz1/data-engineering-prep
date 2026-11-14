# Apache Flink for data engineers: the basics

A guided, press-Next course on the basics of Apache Flink. Coach Ines follows **Brewline**, the coffee retailer, as its data team learns to count orders while they happen. You start a real cluster and read its job graph, watch a query turn into a stream of changes, see a watermark decide which orders are late, kill a TaskManager in the middle of a job and check what it wrote, stop a job with a savepoint and start it again with one more parallel task, follow a PostgreSQL table with change data capture, join two streams until the state grows, write a Java job with keyed state and a timer, and push a slow step until the source backs up. Every number on the screens was read from a real Apache Flink 2.2.1 on one machine.

This is the short course on purpose: the basics, in the order that job descriptions and interviews ask for them. It has nine missions, not fifteen.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Nothing in this course ran on a network, on Kubernetes, on a managed service, or under real load.** Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `flink/verify/capture_flink.py` on one machine with made-up Brewline data: the unmodified **Apache Flink 2.2.1** binary distribution as a standalone cluster of **one JobManager and two TaskManagers** (with its SQL client, its `flink` command and its REST interface), the **Kafka connector 5.0.0-2.2**, the **Flink CDC PostgreSQL connector 3.7.0-2.2**, **Apache Kafka 4.4.0** with one broker, **PostgreSQL 16.15**, the **confluent-kafka 2.16.1** client, Java 21 and Python 3.13, and a few Java jobs that are compiled here. The processes and the memory of a TaskManager, the plan of a job, slots and chaining, the changelog of a streaming query, watermarks and windows, checkpoints and the files they write, the loss of a TaskManager, exactly-once and at-least-once sinks, savepoints and a changed parallelism, a restore that is refused, state backends, a keyed Kafka topic with deletes, files that wait for a checkpoint, change data capture and the replica identity of PostgreSQL, the size of the state of three joins, deduplication, key groups, a DataStream job with keyed state and a timer, and the metrics of a slow step |
| **From documentation** | Kubernetes and the Flink Kubernetes Operator, YARN, high availability, Amazon Managed Service for Apache Flink, Iceberg, Paimon, Delta Lake and Hudi, the ForSt state backend, the adaptive scheduler and autoscaling, unaligned checkpoints, watermark alignment, the defaults that the lessons quote, and what the release notes of 2.3 list. Nothing was timed |

The stand-ins and limits, said again where they matter:

- **One machine is not a cluster.** The JobManager and the two TaskManagers are three Java processes with their own folders and ports. The plans, the slots, the state, the checkpoints, the exceptions and the metrics are the ones that Flink reported. There is **no network** between them, so there is no latency, no slow link and no shuffle across machines. Nothing is timed: the lessons teach counts, bytes and plans.
- **A TaskManager was killed with `kill -9`.** That is what a crashed machine looks like to the JobManager. It is not what a network partition looks like.
- **Timers were shortened.** The heartbeat timeout is 10 seconds (the default is 50), checkpoints are taken every 2 to 8 seconds (there is no default interval), and the idle timeout of a source is 3 seconds. The screens say so, and quote the documented defaults.
- **The cluster ran on Java 21.** The documentation of Flink 2.2 calls Java 17 the recommended version and the support for Java 21 experimental. The Java jobs were compiled for release 17. Java 17 was not run.
- **Kafka had one broker.** The exactly-once runs use real Kafka transactions on that broker. Replication, a broker that fails and a network that drops a packet are not part of this course: the Kafka course has them.
- **Flink CDC ran against a local PostgreSQL 16** with `scan.incremental.snapshot.enabled` set to false. The documentation says that the snapshot of a large table then takes no checkpoint until it ends. Debezium was not run for this course.
- **Some labs are arithmetic on the recording.** The parallelism lab applies the rule of slot sharing, the changelog lab and the watermark lab apply the rules of a streaming aggregate and of a watermark to the recorded orders, the window lab assigns the recorded orders to windows, the checkpoint lab applies the rules of a checkpoint to twelve records, the state lab scales the recorded growth by the rate and extrapolates in a straight line, the key group lab re-implements Flink's two hashes, and the backpressure lab does the arithmetic of a slow step. Each one says so on screen, and each one is checked against what Flink printed.
- **A rate is a rate on this machine.** The slow step sleeps ten milliseconds for each record, so its ceiling is a hundred records a second for each task. The lessons use the measured 99 and 396 records a second only to show that four tasks give about four times the speed.
- **The data is made up.** Orders of 12 Brewline stores. Store s01 sells about a third of them, so a key with a hot store makes a busy task. The data comes from a fixed rule, so every run writes the same records.
- **The Flink documentation website could not be opened** from where this was built (`nightlies.apache.org` and `flink.apache.org` did not resolve). The lessons use the documentation that ships in the source release of 2.2.1 (its `docs` folder, with the generated pages of every configuration option), the release notes of 2.2 and 2.3 and the documentation sources of the Kafka connector, the CDC connector and the Kubernetes operator from their repositories. Job postings were read through search summaries.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 395 | about 3.5 hours | Starting out, or interviewing for a junior data engineer role that uses Flink |
| **Senior** | 509 | about 5 hours | Everything in Junior, plus the state, recovery, upgrade and operations decisions that seniors own |
| **Everything** | 514 | about 5 hours | Adds the finer points and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map: a cluster and a job | 23 min | 28 min | 28 min |
| 2 | Flink SQL and the changelog | 19 min | 24 min | 27 min |
| 3 | Time, watermarks and windows | 22 min | 30 min | 30 min |
| 4 | State, checkpoints and recovery | 24 min | 31 min | 31 min |
| 5 | Connectors and change data capture | 20 min | 28 min | 28 min |
| 6 | Joins, duplicates and state that grows | 18 min | 23 min | 23 min |
| 7 | The DataStream API | 18 min | 24 min | 24 min |
| 8 | Running Flink: backpressure and deployment | 24 min | 28 min | 28 min |
| 9 | Boss round | 38 min | 63 min | 65 min |
| | **Total** | **215 min** | **288 min** | **293 min** |

A short mission 0 sets up the course: the whole picture, the levels, the orders, which release this is and what came after it, and how the screens work.

Mission 9 has two incident drills that mix missions (a deploy that cancels a job and starts a new one with no state, and a job that falls behind while its CPU is quiet), a design decision, two coding rounds (a tumbling window query with a watermark, and a DataStream job with keyed state, both with their real output), a mock interview of up to 24 questions from the earlier missions, a scorecard and a one-page cheat sheet of recorded numbers.

## What job descriptions ask for, and where this course covers it

I read a small sample of data engineer and Flink postings through search: eight queries (Flink data engineer requirements, London and the UK, Berlin and Germany, Bangalore, Singapore, Sydney and Melbourne, the United States with Iceberg, Flink platform roles on Kubernetes, and Toronto, Amsterdam and Dublin with change data capture). I read the search summaries and not every posting, many postings came from job boards and recruiter pages that repeat each other, and some were expired, so this shows **direction and not a count**. The mission numbers say where each topic is taught.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Flink stream processing in production, with Java, Scala or Python. A language is nearly always named | 1, 7 | Java is the language of this course. **Recorded**: a DataStream job that is compiled, run and restored. Scala and PyFlink are **not covered** |
| Flink SQL and the Table API next to the DataStream API | 2, 3, 6, 7 | **Recorded**: the same query in batch and in streaming mode, the changelog, three kinds of sink, windows, joins and deduplication, run in the real SQL client |
| Event time, watermarks and windows. Stated in several postings as "event-time semantics, watermarks, stateful stream processing" | 3 | **Recorded**: fourteen orders through five watermark delays and four kinds of window, a Kafka source that is read in one burst against one that is fed a second at a time, and a window that never fires because of an empty partition |
| Checkpointing, savepoints, state management and recovery. The most repeated line in the summaries | 4 | **Recorded**: a TaskManager killed with signal 9, a job with no checkpoints that stays FAILED, duplicates with at-least-once and none with exactly-once, a savepoint restored at another parallelism, a restore that is refused, heap against RocksDB and incremental checkpoints |
| Exactly-once and correctness, with Kafka | 4, 5 | **Recorded** on a real broker with transactions. The Kafka course covers the broker side |
| Kafka as the source and the sink, sometimes Kafka Connect and a schema registry | 5 | **Recorded**: four startup modes, the metadata of a record, an upsert-kafka topic with tombstones. Kafka Connect and a registry are **not covered** here: see the Kafka course |
| Change data capture, mostly Debezium and Flink CDC | 5 | **Recorded**: Flink CDC against PostgreSQL 16, the snapshot, insert, update and delete as a changelog, the replica identity that fails the job, and the upsert mode that fixes it. Debezium is **from documentation** and from the Kafka course |
| Backpressure, performance tuning and fault tolerance as one topic | 8 | **Recorded**: busy, idle and backpressured time of each vertex, the backpressure report, and the speed of a slow step with one and with four tasks |
| Kubernetes and Docker, often with the Flink Kubernetes Operator, or Amazon Managed Service for Apache Flink | 8 | Compared, **from documentation**. Nothing ran on Kubernetes or on a managed service |
| Iceberg, Paimon, Delta Lake or Hudi as the place where results land | 5 | Compared, **from documentation** |
| Infrastructure as code and observability tools (CloudFormation, Argo CD, Grafana, OpenTelemetry) | 8 | The metrics that Flink reports are **recorded**. The tools are **not covered** |
| Spark Structured Streaming or Kafka Streams accepted as an alternative to Flink, and Flink named as a bonus. Both appeared in a few summaries | 7 | The Spark and Kafka courses cover them. Mission 7 says when to use the DataStream API and when SQL |
| Experience: about three years for mid-level postings, five or more for senior ones, and some ask for two or three years of Flink and Kafka | all | Two paths: the Junior path teaches the model and the failures, the Senior path adds the decisions |

The interview themes that came up most in the summaries are all missions here: what a watermark is and how to choose its delay, how checkpoints give exactly-once, the difference between a checkpoint and a savepoint, what state is and where it lives, how to find the bottleneck behind backpressure, how to avoid state that grows without end, and how to upgrade a job without losing its state.

## What you work through

- **Follow Brewline.** Twelve made-up orders become a changelog. Fourteen orders arrive out of order and a watermark drops some of them. A TaskManager is killed, a savepoint is taken and restored with one more task, a join keeps every row it has seen, a database change becomes a row of the stream, and a slow step makes the source wait.
- **10 animated diagrams.** Orange packets travel along numbered arrows: the whole platform, a cluster, a query that becomes tasks in slots, a stream and a table, event time and a watermark, a checkpoint, the two phases of an exactly-once sink, change data capture, backpressure and the ways to run Flink.
- **4 terminal replays of real output.** `flink list` and the REST paths, what a sink receives, the JobManager log of a killed job, and the Java job that is built, run and read.
- **8 labs.** Parallelism, chaining and slots. Feed the orders and read the changelog. Choose the watermark delay. The kinds of window. A checkpoint, a crash and a replay. The state of three joins. Which task holds a key. A slow step, more tasks and the lag.
- **6 code walkthroughs and 11 SQL screens.** Line-by-line explanations of the scripts and the Java that ran: the job that was submitted, the same query in streaming mode, a tumbling window, a session window, the idle partition, the job that a TaskManager was killed under, the metadata of a Kafka record, an upsert topic, a file sink, Flink CDC, a join, deduplication, the plan of a job as JSON, the DataStream job and the slow pipeline.
- **23 quizzes, 8 bug hunts, 8 ordering games, 4 decisions with a recommended answer, and 10 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **24 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 10 chapters, 216 screens: 166 for everyone, 48 for Senior, 2 extra |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 395 frames on the Junior path, 509 on the Senior path and 514 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. The script still reports small text: labels of the shared interface and of the labs are 14.0 to 14.8 px, and diagram labels are 9.0 to 10.7 px |
| Interaction test (`node dev/e2e.js flink`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset | 805 checks passed, 0 failed |
| The 8 labs driven in the browser (`flink/verify/e2e_labs.js`): every chip and button, compared with the recording and with values worked out in the test. The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 1,581 checks passed |
| Recorded output (`flink/verify/capture_flink.py`) | 66 files, 33 texts, 41 tables and 44 sets of counts, from 8 sections that each run on their own cluster: the cluster, SQL, time, state, connectors, joins, the DataStream API and running |
| Code in the lessons (`flink/verify/verify_fl.py`), 8 minutes 34 seconds on the last run | 35 SQL scripts planned by the real planner and 21 results compared with the recording, on a cluster that the script starts. 17 bug hunts run: the planner refuses the broken script for the reason that the lesson gives and accepts the fix. 6 runs of the two coding rounds, compared with the recording and with a plain Python computation. 5 Java files and 4 Java fragments compile, and 2 Java jobs run (one on 600 orders through a Kafka broker, compared with the truth). 16 shell commands pass `bash -n`, 17 flags are looked up in the help of the tool that they belong to, 19 configuration keys are looked up in the documentation of the release and 38 table options in the connector jars and their documentation |
| Lab data (`flink/verify/check_widgets.js`) | 352 checks: slot sharing and chaining, the changelog of an aggregate, the watermark and the late orders, the four kinds of window, a checkpoint with a crash and a replay, the state of three joins, the two hashes behind a key group, deduplication, an upsert topic and the arithmetic of backpressure |
| Controls | 22 deliberately broken inputs, and each one is refused: JSON and SQL that do not parse, Java that uses two things that Flink 2 removed, a shell command that does not parse, a flag that does not exist and one that belongs to another action, a configuration key that does not exist and one with the wrong prefix, a table option that does not exist, a reserved word as a column name, a window on a column that is not a time attribute, a result table and a changelog with one number changed, and six changes to the recording that the lab checks must refuse |
| Recapture (`verify_fl.py --recapture`, about 30 minutes) | The whole recording was made again on 14 November 2026 and compared with `js/real.js`: 184 items, 18 differ for a reason that the script states, 0 differ without one. The 18 are sizes and counts that depend on when a checkpoint or a kill landed, rates and sampled ratios, random folder names, and the class that reports a lost TaskManager. The first comparison of that run showed 3 differences without a stated reason (the bytes of the heap backend at the sixth checkpoint, the class in the second line of an exception, and an idle ratio of 0.01 against 0.0). Each got an allowance for that one field and an independent check in `check_widgets.js`, and the lesson now says that the class varies |

### What was not checked

- **Nothing ran on a network or under load.** What a real cluster does with a slow link, a full disk, a million records a second or a state of many gigabytes was not measured. Those parts are described from documentation.
- **Kubernetes, the Flink Kubernetes Operator, YARN, high availability, Amazon Managed Service for Apache Flink, Iceberg, Paimon, Delta Lake and Hudi were not run.** They are described from documentation, and the screens say so.
- **Flink 2.3.0 was not run.** The course is recorded on 2.2.1. The Kafka connector has no build for 2.3 on Maven Central yet, so the course stays on 2.2.
- **Java 17 was not run.** The documentation recommends it. The cluster ran on Java 21.
- **The ForSt state backend, unaligned checkpoints, watermark alignment, the adaptive scheduler and the SQL gateway were not run.** They are named from documentation.
- **Debezium was not run for this course.** The Kafka course ran it.
- **Times were not measured.** The lessons compare counts, bytes and plans. A rate is a rate on this machine.
- **Defaults are those of Apache Flink 2.2.1.** Another release may differ. The lessons name the ones that matter and the table below links the pages.
- **The Flink documentation website could not be opened.** The source release of 2.2.1 and the repositories of the connectors were read instead.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not legal advice.**

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| The release the course ran on is 2.2.1. Flink 2.3.0 is newer (June 2026) and there is no 2.2.2 | The download directory of the Apache Flink releases, read on 14 November 2026 | [downloads.apache.org/flink](https://downloads.apache.org/flink/) |
| The Kafka connector 5.0.0-2.2 is the newest build for Flink 2.2, and no build for 2.3 exists | The metadata of the connector on Maven Central (last updated 2 June 2026), read on 14 November 2026 | [flink-connector-kafka on Maven Central](https://repo1.maven.org/maven2/org/apache/flink/flink-connector-kafka/maven-metadata.xml) |
| Flink CDC 3.7.0 works with Flink 1.20.x or 2.2.x, and the PostgreSQL connector has the `changelog-mode` option and the limit on checkpoints while the snapshot is read | The documentation sources of Flink CDC 3.7 | [flink-cdc release-3.7](https://github.com/apache/flink-cdc/blob/release-3.7/docs/content/docs/connectors/flink-sources/postgres-cdc.md) |
| Java 17 is the recommended Java version, and the support for Java 21 is experimental | The Java compatibility page in the documentation of Flink 2.2 | [java_compatibility.md](https://github.com/apache/flink/blob/release-2.2/docs/content/docs/deployment/java_compatibility.md) |
| Defaults: heartbeat 10 s and 50 s, managed memory 0.4 and network memory 0.1 of the Flink memory, `execution.checkpointing.data-inline-threshold` 20 kb, `num-retained` 1, `tolerable-failed-checkpoints` 0, `table.exec.state.ttl` never cleans up, the 5 minute `slot.request.timeout` of a cluster that can start TaskManagers | The generated configuration pages in the documentation of Flink 2.2 (read from the source release) | [configuration of Flink 2.2](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/deployment/config/) |
| The restart strategy is `disable` without checkpointing and `exponential-delay` (1 s, up to 1 min, factor 1.5) with it | The option `restart-strategy.type` in the same pages, and the first line of the recorded JobManager log | [restart strategies](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/ops/state/task_failure_recovery/) |
| There are two deployment modes, application and session. Per-job mode is not in the 2.2 documentation | The deployment overview of Flink 2.2 | [deployment overview](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/deployment/overview/) |
| The default maximum parallelism is the parallelism times 1.5 rounded up to a power of two, between 128 and 32,768 | The class `KeyGroupRangeAssignment` of 2.2.1, asked in mission 7 (recorded). The documentation names only the upper bound | [pipeline.max-parallelism](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/deployment/config/#pipeline-max-parallelism) |
| The ForSt state backend is experimental, and a savepoint is canonical by default | The pages about disaggregated state and savepoints in the documentation of 2.2 | [disaggregated state](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/ops/state/disaggregated_state/) |
| A time to live can change the result of a join, and the `STATE_TTL` hint sets one for each input of one join | The joins and hints pages of Flink 2.2 | [joins](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/dev/table/sql/queries/joins/) |
| The per-table watermark options (`scan.watermark.idle-timeout` and the emit strategy) work only for connectors that take the watermark into the source, such as Kafka | The page about time attributes in the documentation of 2.2 | [time attributes](https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/dev/table/concepts/time_attributes/) |
| `sink.delivery-guarantee` has the values none, at-least-once and exactly-once, and an exactly-once topic must be read with `isolation.level` read_committed | The documentation of the Kafka connector | [Kafka SQL connector](https://github.com/apache/flink-connector-kafka/blob/v5.0/docs/content/docs/connectors/table/kafka.md) |
| The Flink Kubernetes Operator manages application and session clusters from a FlinkDeployment. The lessons name no operator version. Version 1.16.1 (September 2026) lists Flink 1.19 to 2.4 as supported | The compatibility page of the operator (read, not run) | [operator compatibility](https://github.com/apache/flink-kubernetes-operator/blob/release-1.16/docs/content/docs/deployment/compatibility.md) |
| Amazon Managed Service for Apache Flink runs Flink for you. The lessons name no version and no limit | A search summary of the AWS documentation, not opened and not run | [AWS: Flink 2.3 support](https://docs.aws.amazon.com/managed-flink/latest/java/flink-2-3.html) |
| Iceberg, Paimon, Delta Lake and Hudi commit on a checkpoint, and support for a Flink version differs | The documentation pages of Flink about connectors and time travel, and the pages of each project. Not run | [Apache Iceberg and Flink](https://iceberg.apache.org/docs/latest/flink/) |
| What Flink 2.3 changes (changelog functions, a native S3 file system, applications, an opt-in adaptive partitioner, a changed default for conflicting upsert keys) | The release notes of 2.3 | [release notes of 2.3](https://github.com/apache/flink/blob/release-2.3/docs/content/release-notes/flink-2.3.md) |
| The job postings: direction only, from search summaries of eight queries | Pages of Dice, ITJobsWatch, Built In, WeAreDevelopers, foundit and company career pages. A small sample | [ITJobsWatch: Flink jobs](https://www.itjobswatch.co.uk/find/Flink-jobs) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900 unless stated:

- The diagram of the cluster at step 3 (mission 1).
- Seven labs on the desktop: parallelism with 5 slots asked of 4, the changelog with all twelve orders fed, the watermark with a delay of 10 seconds, the hopping window, the checkpoint lab after its example run, the key groups at parallelism 3 and 4, and backpressure. The state lab was looked at on a phone (390 by 844).
- The SQL coding round with its solution open.
- Coach Ines thinking, happy and cheering.

Looking found two faults that the tests had missed, and both are fixed. The notes and callouts of all eight labs, and the notes of 14 lesson screens, showed HTML tags as text. The value of a bar in the key group lab ran out of its card at parallelism 3 and 4. The lab test now fails on a tag that is shown as text.

## Files

```
flink/
  index.html, css/flink.css   the page and its colours
  js/config.js               the course settings: Coach Ines, the paths, the ten levels
  js/graphs.js               10 diagram specs
  js/widgets.js              labs for the changelog, the watermark and the kinds of window
  js/widgets2.js             labs for a checkpoint, the state of joins, parallelism and slots, key groups and backpressure
  js/content/                one file per mission, 00 to 09
  js/real.js                 the recording: files, tables, texts and counts written by capture_flink.py
  verify/capture_flink.py    runs a real Flink cluster (and a Kafka broker, and PostgreSQL), writes js/real.js; each section runs in a process and on a cluster of its own (--parts keeps the sections, so an interrupted run can be finished)
  verify/verify_fl.py        checks every snippet, every command flag, every configuration key and the Java, runs the SQL, the bug hunts and the coding rounds on a real cluster, runs the lab checks and the lint and, with --recapture, records everything again and compares
  verify/check_widgets.js    recomputes the eight labs and the recorded tables with arithmetic that shares no code with them
  verify/e2e_labs.js         drives the eight labs in Chromium against values worked out by hand
  verify/fcluster.py, fx.py, recorder.py   the cluster, the helpers and the place where the sections write
  verify/s_*.py              the eight sections: world, sql, time, state, connect, joins, datastream, running
  verify/app/                the Java of the course: StoreWatch, KeyGroups, Pipe, MaxParallelism and the coding round PassThousand
  verify/dump_fl.js          lists the strings and the terminal lines of the course for verify_fl.py
  verify/requirements.txt    the environment, and where to get Flink, the connectors, Kafka and the documentation
  verify/INTEGRATION.md      the text that the hub page, the root README and package.json need
```

## Run the checks

```bash
python3 -m venv flink-env && flink-env/bin/pip install -r flink/verify/requirements.txt    # Java 17 or 21 with javac must be installed
export FLINK_HOME=/path/to/flink-2.2.1 FLINK_DOCS=/path/to/flink-2.2.1/docs                # the binary distribution, and the docs folder of the source release
export FLINK_KAFKA_JAR=/path/to/flink-sql-connector-kafka-5.0.0-2.2.jar FLINK_CDC_JAR=/path/to/flink-sql-connector-postgres-cdc-3.7.0-2.2.jar
export KAFKA_HOME=/path/to/kafka_2.13-4.4.0
flink-env/bin/python flink/verify/verify_fl.py             # snippets, flags, keys, Java, SQL on a real cluster, bug hunts, coding rounds, lab data and lint (about nine minutes)
flink-env/bin/python flink/verify/verify_fl.py --browser   # also drives the labs in Chromium
flink-env/bin/python flink/verify/verify_fl.py --recapture # records everything again and compares it with js/real.js (about 30 minutes in all); it prints where the new recording is kept, and --reuse FILE compares that file again
flink-env/bin/python flink/verify/capture_flink.py         # writes flink/js/real.js; --only world,sql,... records a few sections; --parts DIR keeps and reuses them
node dev/lint-content.js flink
node dev/e2e.js flink && node flink/verify/e2e_labs.js
node dev/smoke.js flink --path all
```

Each section of the recorder runs in its own process on its own cluster, because a section may kill a TaskManager or start a client that does not stop. The change data capture section also needs the PostgreSQL 16 server binaries (`/usr/lib/postgresql/16/bin`). Without the distribution, the documentation or Kafka, `verify_fl.py` says what it skipped and runs the rest.

Independent study material. Not affiliated with or endorsed by the Apache Software Foundation, Confluent or any other vendor or project named here.
