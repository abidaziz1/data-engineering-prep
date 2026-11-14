# Apache Spark for data engineers: from a query plan to production

A guided, press-Next course for data engineers. Coach Kai follows **Brewline**, the coffee retailer, as its data team learns to run Apache Spark properly. You read the plan that Spark builds for a query, count the tasks of a shuffle, watch a hot store slow one task down, see what a cache really holds, find out why a folder of small files hurts, replay a stream with a watermark and a restart, and diagnose a slow night from the numbers. Every number comes from a real Apache Spark 4.0.1 that ran on one machine and was read back from its event log, the file that the Spark UI is drawn from.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Nothing in this course ran on a cluster.** Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `spark/verify/capture_spark.py` on one machine with made-up Brewline data: **Apache Spark 4.0.1** (PySpark) in local mode on four cores with Java 21, **Delta Lake 4.0.1**, **pytest 9.2.0**, **pandas 2.3.3**, and the `spark-submit` of the same release. Plans, task and shuffle counts, spill, skew, file layouts, bytes read, SQL results and errors, UDF plans and call counts, Structured Streaming batches and progress, Delta commits, pytest runs and the order of settings were read from the event log, from the folders on disk, or from what the program printed. **Nothing is timed**, because a laptop run says little about a cluster. Counts and bytes are shown, and times are not |
| **From documentation** | Everything about a cluster: YARN, Kubernetes, standalone mode on real machines, Amazon EMR, Google Dataproc, Databricks and the other managed services, dynamic allocation and shuffle services, the Spark web UI, Kafka, Apache Iceberg, Apache Hudi, Spark Connect, and what the Spark 4.0 release notes list. These parts are described from documentation as I could read it, and each screen says so |

The stand-ins and limits, said again where they matter:

- **Local mode is not a cluster.** The driver and one executor are one program on one machine with four cores. The plans, the shuffles, the spill, the skew and the retries are real, and the numbers are the ones that Spark counted. There is **no network** between executors, so the recording shows no remote fetch, no executor lost and no network timeout.
- **The Spark web UI was off.** The lessons describe its tabs from documentation. The numbers behind those tabs were read from the event log, with a short Python function that rebuilds a stage table.
- **The recording sets `spark.sql.shuffle.partitions` to 8** so that small runs stay small. The table of defaults unsets it and shows what Spark ships with, **200**, and every plan that shows an exchange of 8 partitions says why.
- **The skew limits were lowered for one recording.** The adaptive skew join looks for a partition that is 5 times the median and over 256 MiB. A table of 6 MB can never reach that, so the recording used 3 times and 200 KB, so that 400,000 rows behave the way 400 million would. The screens say so, and quote the real defaults.
- **The spill was forced.** `spark.shuffle.spill.numElementsForceSpillThreshold` makes a sort spill after 20,000 rows, because a machine with 15 GB does not run out of memory by accident. The screen says "forced".
- **The stream reads files, not Kafka.** Six small JSON files arrive one at a time. Offsets are file names there and partition offsets in Kafka. The checkpoint, the watermark, the output modes and the restart work the same way. Kafka is **from documentation**, and it gets its own tutorial later.
- **Delta Lake ran for real on local files.** Iceberg and Hudi were not run. The comparison table says which parts are from documentation.
- **The data is made up.** 400,000 orders over 14 days in 12 stores, 14 Parquet files of about 475 KB. Store s01 sells about a third of the orders, and about a quarter of the orders have no customer. The data comes from a fixed rule, so every run writes the same files.
- **Some labs are arithmetic, not measurements.** The sizing lab applies documented defaults (128 MiB partitions, 300 MiB reserved, 60 percent unified memory, 10 percent overhead). The heap sizes above 2 GiB in the memory lab are calculated with the formula that the recording checked on three real sessions. They say so on screen.
- **File sizes vary by a few hundred bytes between runs**, so the recording rounds totals to 10 KB. Times, bytes read and similar fields of the event log are shown as "varies" in the sample line of the log. Counts and zeros are exact.
- **PySpark 4.0.1 needs pandas 2.** The testing helper that the tests use did not import with pandas 3.1.1, so the recorder pins pandas below 3 (see `spark/verify/requirements.txt`).
- **The Spark website could not be opened** from where this was built, because the network policy blocked the host. The features of Spark 4.0 that the Extra screens mention (the VARIANT type, SQL pipe syntax, string collation, session variables, the thin Python client) were checked through search summaries of the release notes, and the ones that I could not confirm are not in the course.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 828 | about 7 hours | Starting out, or interviewing for a junior data engineer role that uses Spark |
| **Senior** | 1,131 | about 10 hours | Everything in Junior, plus the tuning, design, streaming and operations decisions that seniors own |
| **Everything** | 1,149 | about 10 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map of Spark | 20 min | 26 min | 26 min |
| 2 | Lazy evaluation and the plan | 33 min | 38 min | 38 min |
| 3 | Partitions, tasks and shuffles | 26 min | 33 min | 33 min |
| 4 | Joins | 22 min | 35 min | 35 min |
| 5 | Skew and adaptive execution | 23 min | 36 min | 36 min |
| 6 | Memory, caching and spill | 26 min | 36 min | 37 min |
| 7 | Files and layout | 24 min | 41 min | 41 min |
| 8 | Spark SQL for pipelines | 23 min | 31 min | 33 min |
| 9 | Python and UDFs | 26 min | 36 min | 36 min |
| 10 | Structured Streaming | 29 min | 40 min | 41 min |
| 11 | Table formats and Delta Lake | 23 min | 38 min | 38 min |
| 12 | Testing Spark code | 25 min | 34 min | 35 min |
| 13 | Running it for real | 26 min | 35 min | 35 min |
| 14 | Debugging and operations | 27 min | 39 min | 39 min |
| 15 | Boss round | 61 min | 102 min | 102 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

Mission 15 has two incident drills that mix missions (a slow night with tiny files, and a report that is wrong in two ways), a design decision, a coding round in SQL on the recorded store numbers, a mock interview of up to 42 questions from the earlier missions, a scorecard, and a one-page cheat sheet of recorded numbers.

## What job descriptions ask for, and where this course covers it

I read a small sample of data engineer job descriptions and the writing about them through search: four queries about Spark roles. I read the search summaries and not every posting, so this shows **direction and not a count**. The mission numbers say where each topic is taught.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Spark core, PySpark and Spark SQL. In nearly every big-data posting | 1, 2, 8, 9 | **Recorded** with Spark 4.0.1: the four plans of one query, the jobs that each line starts, ANSI results, windows, rollups, arrays, UDF plans and call counts |
| Tuning: shuffles, partitions, broadcast joins, caching, memory, executor sizing. The most emphasised area | 3, 4, 6, 13 | **Recorded**: partitions and tasks from the event log, join strategies, the memory formula checked on three real sessions, cache bytes, a forced spill. The sizing lab is **arithmetic** on documented defaults |
| Skew and adaptive query execution | 5 | **Recorded**: the maximum against the median of the tasks, the adaptive skew join with `skew=true` in the plan, a salt. The limits were lowered, and the screens say so |
| Reading plans, logs and metrics to debug. The Spark UI | 2, 14 | **Recorded**: the event log read into a stage table, four real error messages, a task that fails once and is retried. The UI itself is **from documentation** |
| Small files, partitioning, file formats, pruning and pushdown | 7 | **Recorded**: file counts on disk (2,800 files against 14), bytes read with and without pushdown, codecs, a schema that changes, bucketing, and the overwrite that empties a table |
| Delta Lake, Iceberg or Hudi. "One or more of" | 11 | **Recorded** with Delta Lake 4.0.1: a commit read from the log, MERGE, time travel, a schema check, OPTIMIZE and VACUUM. Iceberg and Hudi are **from documentation** |
| Structured Streaming, often with Kafka. Common in senior postings | 10 | **Recorded** with a file source: watermark, late data, state, three output modes, the checkpoint, a restart that writes a batch twice. Kafka is **from documentation** |
| Testing and CI for data code | 12 | **Recorded**: pytest on a local Spark, and a one-word bug that one test of four catches |
| spark-submit, cluster managers, EMR, Dataproc, Databricks | 13 | **Recorded**: every flag checked against `spark-submit --help`, where the help says each flag works, and the order of settings in five runs. YARN, Kubernetes and the managed services are **from documentation** |
| Airflow or another orchestrator. Frequent | not here | Planned as a tutorial of its own |
| The Hadoop stack: HDFS, Hive, HBase, Sqoop. In some, mostly older platforms | 1 | Named in the map, **from documentation**. Planned as a tutorial of its own |
| Flink as an alternative or a plus | 1, 10 | Named, **from documentation**. Planned as a tutorial of its own |
| Dimensional modelling, data quality, reconciliation | 4, 12, 15 | **Recorded**: join row counts, a dimension listed twice, data checks and a reconciliation drill |

The interview themes that came up most in the summaries are all missions here: what a shuffle is, how to size partitions (100 to 200 MB, and the default of 200 shuffle partitions), how to find skew (the maximum against the median task), what adaptive execution can and cannot do, the broadcast threshold, a partition filter that a function hides, and small files.

## What you work through

- **Follow Brewline.** 400,000 made-up orders become a plan, a shuffle and a join. One store turns out to be a third of the data. The orders are cached, spilled, written as files that are too small, queried with ANSI mode on, labelled by a UDF, streamed with a watermark, merged into a Delta table, tested with pytest, submitted with the right settings, and finally diagnosed from the event log.
- **15 animated diagrams.** Orange packets travel along numbered arrows: the whole platform, driver and executors, from code to tasks, job and stages, a shuffle, three ways to join, one hot task, adaptive execution, executor memory, a table on disk, a streaming query, a Delta table, a submitted application, a diagnosis and a test path.
- **2 terminal replays of real output.** pytest on the clean code of the lessons, and on a copy with a one-word bug.
- **12 labs.** Count the shuffles of six operations. Tasks, cores and waves. Which join did Spark pick. The hot store. Memory, the cache and spill. Write it, then read it. ANSI mode on and off. Four plans for one UDF and how often it runs. Replay the stream. The life of a Delta table. spark-submit precedence and the size of an application. Name the cause from the numbers.
- **53 code walkthroughs and SQL runs.** Line-by-line explanations of the code that ran: the session, the plans, the partitions, the joins, the skew experiment, the memory and cache demo, the file layouts, the SQL, the UDFs, the streaming query, Delta Lake, the tests, the event log reader and the failures.
- **70 quizzes, 13 bug hunts, 14 ordering games, 14 decisions with a recommended answer, and 15 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **42 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 16 chapters, 435 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 828 frames on the Junior path and 1,149 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Body text and code stay at 14 px or larger. Labels inside diagrams scale down to between 9 and 11 px |
| Interaction test (`dev/e2e.js spark`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All 12 labs are also driven in the browser against values worked out in the test: the exchanges of six operations with every guess, the waves of every setting, the plan of every join situation, the memory formula for six heap sizes, the file counts of seven writes, all eight ANSI expressions in both modes, the operator of every UDF and its call counts, every batch of the stream in three modes, every step of the Delta story, 36 sizes of an application, and six diagnoses | 1,900 checks, all passed |
| Recorded output (`spark/verify/capture_spark.py`) | 16 files, 34 texts, 37 result tables and 30 sets of counts: the plans, the jobs of each line, partitions and tasks, join strategies and row counts, skew tables, memory and cache sizes, file layouts, SQL results, UDF plans and call counts, streaming batches, Delta commits, pytest runs, spark-submit flags and their scope, errors, and a sample of the event log |
| Code in the lessons (`spark/verify/verify_spark.py`) | 57 Python snippets parsed, with their 181 imports resolved against the installed PySpark and 68 names (`F.name`, `Window.name`, types) looked up; 12 SQL snippets parsed with sqlglot and 16 SQL runs repeated in Spark and compared with the result on screen; 1 shell snippet through `bash -n`, with 12 `spark-submit` flags looked up in the recorded help. All passed |
| Lab data (`spark/verify/check_widgets.js`) | 292 checks. The stores add up to the orders, the shuffle moves the same records in all three runs, the memory formula holds for three heap sizes, the file counts are tasks times folders, the window sums, ranks and frames are worked out again, the stream is **simulated again from the six files** (the watermark of each batch, the rows dropped as late, the state with and without a watermark, the totals of complete mode), and the Delta merge adds up |
| Controls | 14 deliberately broken inputs (a function that `pyspark.sql.functions` does not have, a keyword that a function does not take, an import that does not exist, Python, SQL and shell that do not parse, a result with one number changed, a flag that `spark-submit` does not have, and five changed recordings: a join that no longer doubles, a memory formula that is off, a wrong watermark, a batch that was written once, a wrong running total), which the checkers must all refuse |
| Recapture | `spark-env/bin/python spark/verify/verify_spark.py --recapture` runs the whole recording again and compares it with `js/real.js`: 273 items compared, 0 differ. The whole recording was also made twice in full while the course was written, and the two runs were identical apart from the keys that had been added in between. A check on 14 November 2026 found the one text that did not repeat: the event log line of a map task (`eventlog.task_end`). The recorder had taken the first map task to end, and which of the two tasks of that stage ends first is a race, so the text came out as task 0 (114,892 records read) or task 1 (114,353 records read). The recorder now takes the task with the lowest index of the earliest stage, the recording was made again, and the other 1,142 items were identical to the earlier recording. A full `--recapture` after the change compared 273 items and 0 differ |

### What was not checked

- **Nothing ran on a cluster.** What a real cluster does under load, how shuffles behave over a network, what YARN, Kubernetes or a managed service accepts, and what a cloud bill looks like were not measured. Cluster behaviour is described from documentation.
- **The Spark UI was not opened.** Its tabs are described from documentation. The numbers that they show were read from the event log.
- **Kafka, Iceberg and Hudi were not run.** They are described from documentation, and the screens say so.
- **Times were not measured.** The lessons compare counts, bytes and plans. A claim that something "is faster" is a claim about the plan, and not a stopwatch.
- **Defaults are those of Spark 4.0.1.** Another release may differ. The table of defaults in mission 0 and the checks of mission 5 name the ones that matter.
- **The sizing and the memory formula above 2 GiB are arithmetic.** The formula was checked on three real sessions (512 MiB, 1 GiB, 2 GiB).
- **The Spark documentation site could not be opened.** Statements about features of Spark 4.0 come from search summaries of the release notes. The status of a preview feature may have changed.
- **This is engineering practice and not legal advice.** Ask your legal and privacy teams which rules apply to you.

### Re-check before you rely on it

- **Defaults and limits** of Spark change between releases: the number of shuffle partitions, the broadcast threshold, the skew thresholds, ANSI mode (on since Spark 4), the partition overwrite mode and the number of task retries. Check the configuration page of the release that you run.
- **Names of managed services and their defaults.** EMR, Dataproc, Databricks, Synapse and Fabric change their names, their autoscaling and their prices. The lessons never state a price.
- **Table formats.** Delta Lake, Iceberg and Hudi gain features (deletion vectors, clustering, new catalogs) every release. The comparison table is a map and not a feature list.
- **Java versions.** The recording used Java 21. Check which Java versions your Spark release supports.
- **pandas.** PySpark 4.0.1 was run with pandas 2.3.3. Newer pandas releases may need a newer PySpark.

## Files

```
spark/
  index.html, css/spark.css  the page and its colours (a teal accent)
  js/config.js             the course settings: Coach Kai, the paths, the sixteen levels
  js/graphs.js             15 diagram specs
  js/widgets.js            labs for shuffles, tasks, joins, skew, memory and file layout
  js/widgets2.js           labs for ANSI mode, UDFs, streaming, Delta Lake, spark-submit and diagnosis
  js/content/              one file per mission, 00 to 15
  js/real.js               the recording: files, tables and counts written by capture_spark.py
  verify/capture_spark.py  runs PySpark, Delta Lake, pytest and spark-submit, each section in its own JVM, and writes js/real.js
  verify/verify_spark.py   checks every snippet, runs the lesson SQL again in Spark, checks every spark-submit flag, runs the lab checks and, with --recapture, records again
  verify/check_widgets.js  checks the data that the labs read, with arithmetic that shares no code with them
  verify/*.py              the code that the lessons show: session, plans, partitions, joins, skew, memory, layout, sqlfun, udfs, streaming, tables, errors
  verify/app/              the transformations, a copy with a one-word bug, their pytest file and the program that prints its own settings
  verify/requirements.txt  the environment: PySpark 4.0.1, Delta Lake 4.0.1, pandas below 3, pytest, sqlglot
```

## Run the checks

```bash
python3 -m venv spark-env && spark-env/bin/pip install -r spark/verify/requirements.txt   # Java 17 or 21 must be installed
spark-env/bin/python spark/verify/verify_spark.py             # snippets, SQL runs, flags, lab data and a partial recapture (about four minutes)
spark-env/bin/python spark/verify/verify_spark.py --recapture # records everything again and compares it with js/real.js (about ten minutes)
spark-env/bin/python spark/verify/capture_spark.py            # writes spark/js/real.js; --only world,plans,... records a few sections
node dev/lint-content.js spark
node dev/e2e.js spark
node dev/smoke.js spark --path all
```

Delta Lake loads its jar with Ivy the first time that a session starts, so the first run needs the network. Each section of the recorder runs in its own process, because some settings (the driver memory, the Delta jars) are read when the JVM starts.

Independent study material. Not affiliated with or endorsed by the Apache Software Foundation, the Delta Lake project, or any other vendor or project named here.
