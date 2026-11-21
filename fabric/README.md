# Microsoft Fabric for data engineers

A guided, press-Next course on the part of Microsoft Fabric that a data engineer works with: how a capacity, a workspace and OneLake fit together, why a lakehouse table is a folder of Parquet files with a log, how a notebook lands a daily file and merges it so that a rerun changes nothing, what a schema rule, a constraint, `OPTIMIZE` and `VACUUM` do to a table, where the SQL analytics endpoint, the Warehouse and Direct Lake fit, what a pipeline adds, and how capacity throttling decides whether your night job runs. Coach Faye follows **Brewline**, the coffee retailer, and a small project of five notebook cells and a T-SQL file. You open real Delta tables and read their logs, run a silver merge eight times (new days, the same file again, and two files in the wrong order), compare three versions of that merge, forty small writes against one compacted file, four ways to partition, a retry that doubles a table, and a reader that stays on an old version of a gold table.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Microsoft Fabric did not run for this course.** It needs a Microsoft account and a capacity. What ran is the open-source engine that Fabric builds on: the tables of a Fabric lakehouse are Delta tables, and Fabric Spark is Apache Spark. Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `fabric/verify/capture_fabric.py` on one Linux machine: **Apache Spark 4.0.1** and **Delta Lake 4.0.1** (PySpark 4.0.1, Java 21.0.12), two local cores, in a folder that is laid out like a lakehouse (a `Files` folder and a `Tables` folder), with made-up Brewline data. The notebook code on the screens is the code that ran. Nothing is timed, so a second recording repeats exactly |
| **From documentation** | Everything about Fabric itself: the capacity, smoothing and throttling, OneLake, shortcuts and mirroring, the Warehouse and the SQL analytics endpoint, pipelines and Dataflows Gen2, Real-Time Intelligence and KQL, Direct Lake, workspace roles and security, Git integration and deployment pipelines, V-Order, runtimes. These were not run |

The stand-ins and limits, said again where they matter:

- **The documentation could not be opened.** The sandbox that built this course blocks `learn.microsoft.com`: five attempts to read Microsoft Learn pages failed to resolve the host. Every Fabric claim comes from **search summaries** of those pages, and from my memory where the summaries were silent. Where the summaries disagreed (for example the default of V-Order, the Direct Lake performance claims, the queue limits of small capacities), the screen says so or leaves the number out. The table below lists every claim to check against the live page.
- **Spark 4.0.1 and Delta 4.0.1 are not the Fabric runtime.** The documentation that I read lists Runtime 1.3 and Runtime 2.0, and gives Runtime 2.0 as Spark 4.1 with Delta 4.2, generally available and not the default, with other locale versions of the page showing older numbers. Features that arrived after Delta 4.0, and features that Fabric adds, can differ.
- **The lakehouse is a folder.** The recorder runs from inside it, so `Files/landing/...` is a relative path and managed tables are folders under `Tables`, as in a notebook with a default lakehouse. It also sets `spark.sql.sources.default` to `delta`, because Fabric creates Delta tables by default and open-source Spark creates Parquet tables. That default is from my memory of the documentation.
- **No OneLake, no capacity.** There was no network storage, no authentication and no throttling. The capacity lab is arithmetic of documented rules, and says so.
- **The T-SQL was parsed and not run.** `gold_daily.tsql` and the Warehouse bug hunt are parsed by the T-SQL dialect of `sqlglot`, which checks syntax only. The same logic ran as Spark SQL and gave the recorded gold table. The KQL sketch was not parsed, because no KQL engine was available.
- **The `.platform` file is an example.** It is written from what the documentation says about its fields. It is not an export from Fabric, and the screen says so.
- **A model of Power BI did not run.** The lab on framing shows the table side: the same gold table read as of two Delta versions.
- **The data is made up.** Five daily files of about 2,000 orders each (10,157 lines), built from fixed rules with no random numbers, and a sixth day for the framing lab. They carry the problems of a real feed: 12 lines without an order id, 5 amounts that read "n/a", 100 orders sent again and 40 orders that changed.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Paths of the temporary folder are replaced by `~`, and identifiers are replaced by placeholders.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 320 | about 3.5 hours | Starting out, or interviewing for a junior data engineer role on Fabric |
| **Senior** | 450 | about 5 hours | Everything in Junior, plus table care, the Warehouse and Direct Lake decisions, orchestration, capacity and delivery |
| **Everything** | 470 | about 5 hours | Adds the finer points: checkpoints, protocol versions, partition costs, change data feed, V-Order and Git item files |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map of Fabric | 16 min | 20 min | 20 min |
| 2 | OneLake and Delta tables | 17 min | 23 min | 24 min |
| 3 | Notebooks and Spark | 18 min | 22 min | 25 min |
| 4 | Bronze to gold | 25 min | 31 min | 34 min |
| 5 | Table care | 20 min | 31 min | 31 min |
| 6 | SQL, the Warehouse and Direct Lake | 15 min | 28 min | 28 min |
| 7 | Pipelines and real-time data | 16 min | 28 min | 28 min |
| 8 | Capacity, security and delivery | 14 min | 24 min | 27 min |
| 9 | Boss round | 59 min | 78 min | 82 min |
| | **Total** | **205 min** | **291 min** | **305 min** |

A short mission 0 sets up the course: the path of a daily file, what a junior and a senior are asked, how the screens work and what ran. Mission 9 has two drills that mix missions (revenue that is double with a growing folder, and analysts rejected at 09:00 while history cannot be read), a decision (how to lay out Fabric for a team), a coding round (write the silver merge), a mock interview of 33 questions, a scorecard and a one-page cheat sheet.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through search: one query for data engineer roles that name Microsoft Fabric. I read the search summaries and not every posting, the results were job boards and recruiters that repeat each other, and several were truncated, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Building ingestion and transformation pipelines, medallion (bronze, silver, gold) lakehouses on OneLake | 2, 3, 4 | **Recorded**: five daily files through bronze, silver and gold on real Delta, with a merge, a rejects table and a gold table that adds up to silver. OneLake itself is **from documentation** |
| Strong PySpark and SQL, and T-SQL | 3, 4, 6 | **Recorded**: the notebook cells and Spark SQL. The T-SQL is **parsed, not run** |
| Fabric Data Pipelines and Notebooks for ETL and ELT, and Dataflows Gen2 | 7 | **From documentation**: activities, retries, dependencies, the choice between a notebook, a Dataflow and a Copy activity. **Recorded**: what a retry does to a landing step, and a step that is safe to repeat |
| Lakehouse, Warehouse, Direct Lake, and OneLake shortcuts or mirroring (senior listings) | 1, 2, 6 | **From documentation**: the choice between a lakehouse and a warehouse, the read-only endpoint, shortcuts and mirroring, framing and the fallback. **Recorded**: a reader pinned to a Delta version |
| Governance and lineage (Microsoft Purview named next to notebooks in one posting) | 8 | **From documentation**, in short: roles, item permissions, where a row rule lives |
| The certifications DP-700 (Fabric Data Engineer Associate) and DP-600 (Fabric Analytics Engineer Associate), usually as desirable | all | The missions follow the areas of the engineer exam in spirit. I did not read the exam outline, so this course is **not** an exam guide |
| Three to seven years of experience, from lead to principal roles | all | The senior path is written for this |

The 33 interview questions are written from the topics that interview guides agree on, in search summaries: the hierarchy of tenant, capacity, workspace and item, what OneLake is, lakehouse against warehouse, shortcuts against copying, Direct Lake and its fallback, and capacity throttling. I did not check those guides against the official documentation. The questions on Delta (the log, time travel, schema rules, `OPTIMIZE`, `VACUUM`, partitions, `RESTORE`) and on loading (merge, duplicates, bad rows, retries) are written from what a data engineer is asked about tables, and the answers use the recorded numbers.

## What you work through

- **Follow Brewline.** One lakehouse, one daily file, three layers. A write that Delta refuses, a retry that doubled a table, a merge that rewrote 2,040 rows and 4,080 change records for nothing, 40 orders that went back to an old status, forty small files, and a reader that still showed yesterday.
- **7 animated diagrams.** The path of a daily file, the platform, a Delta table, one copy and several engines, a nightly pipeline, a capacity and its throttling, and Direct Lake.
- **6 labs.** The log of a table, version by version. Eight runs of a merge. Small files, `OPTIMIZE` and `VACUUM`. Partition by what. Two readers of the same gold table. Size, cores and throttling of a capacity (this one is from documentation).
- **25 terminal replays, 9 code walkthroughs and 20 comparison tables.** The commands with their real output, the five notebook cells, the T-SQL file, a KQL sketch and an example `.platform` file.
- **26 quizzes, 7 bug hunts, 8 ordering games, 9 decisions with a recommended answer and 10 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **33 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 10 chapters, 229 screens: 163 for everyone, 57 for Senior, 9 extra. 57 screens are tagged Recorded and 59 From documentation |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 320 frames on the Junior path, 450 on the Senior path and 470 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js fabric`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 797 checks passed, 0 failed |
| The 6 labs driven in the browser (`fabric/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the files of a table after each commit, the colour that follows from a number, the bars in proportion, Spark cores for each size, the stage of every size and amount of future capacity). The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 262 checks passed |
| Recorded output (`fabric/verify/capture_fabric.py`) | 9 files, 14 texts, 14 tables and 30 sets of counts, plus the 7 values of the recording itself. The recorder takes about 3 minutes and removes everything it made |
| The notebook code, run (`fabric/verify/verify_fabric.py`) | The 9 project files of the recording are the files on disk, and the 8 code screens that show one show it exactly. The notebook cells are run on a local Spark session in a new lakehouse folder: five days land with 10,157 lines in 5 commits, the eight merge runs insert, update and count what the recording says, gold has the recorded 60 rows and revenue, a merge of the changed lines only makes no commit when nothing changed, three runs of the landing step that is safe to repeat leave one copy, and the maintenance notebook compacts every table to one file |
| SQL (`verify_fabric.py`) | Every SQL statement of the project and 31 statements of the terminal replays go through the SQL parser of Apache Spark with the Delta extension, which includes `OPTIMIZE`, `VACUUM`, `RESTORE` and `DESCRIBE HISTORY`. 4 T-SQL texts are parsed by `sqlglot`, which checks syntax only |
| Bug hunts run (`verify_fabric.py`) | Schema inference fails on the day with "n/a" and the fix loads both days. A merge with no condition updates all 2,040 matched rows of a file that holds nothing new, and the one with the condition updates none. A typo with `mergeSchema` becomes a new column, the same write without it is refused, and the fix adds no column. Files removed by hand make a copy of a table unreadable, and the fix, a plain `VACUUM`, leaves the tables readable. The day taken from the clock is today, and the fix takes it from a parameter. The `.platform` copy keeps the logical id of the original. The Warehouse trigger can only be shown as a bug in the text |
| Recapture (`verify_fabric.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`. Nothing is timed, so two things are allowed to differ: the date, and the size of the file that `OPTIMIZE` writes, by up to 10 percent, because it depends on the order of the rows inside it. 74 items, 0 differ in the last run. The first full recapture found exactly that size difference, and the lessons now say "about 18 kB" and not an exact number of bytes. |
| Lab data (`fabric/verify/check_widgets.js`) | 76 checks written in code that shares nothing with the widgets: the orders, stores, customers and refunds counted from the rules of the data, the revenue summed in cents, the versions and rows of the log against the files, the inserts and updates of each merge run, the rewrite of files by a merge, the files of each layout and each partition, and the arithmetic of the capacity lab |
| Controls | 25 deliberately broken inputs, and each one is refused: T-SQL, SQL, Python and JSON with a syntax error, ten changes to the recording that the widget checker must refuse (a day 5 merge that updated 41 rows, a table that is not the sum of what was inserted, cancelled orders that did not fall back after a replay, a repeat that wrote files it did not remove, a revenue one dollar off, more files than partitions, an `OPTIMIZE` that removed 39 files, a retry that did not double the lines, a missing checkpoint, a merge with the condition that updated rows on a repeat), four recordings that the comparison must report (one number, one word, one table cell and a compacted file twice as large), and, with `--browser`, six changes to the widget code that the lab test must fail. A recording with another date and a compacted file 5 percent larger must be accepted |

### What was not checked

- **Fabric was not run.** The capacity and throttling, OneLake, shortcuts and mirroring, the Warehouse, the SQL analytics endpoint, pipelines, Dataflows Gen2, Real-Time Intelligence, Direct Lake, Git integration, deployment pipelines and security come from documentation, which I read through search summaries.
- **One engine version.** Spark 4.0.1 and Delta Lake 4.0.1. The Fabric runtimes differ, and newer features such as deletion vectors in a merge may change which files a merge rewrites.
- **No timings.** The recording counts files, rows, versions and bytes, and never seconds. Nothing here says how fast a Fabric capacity runs a job.
- **T-SQL and KQL did not run.** The T-SQL is parsed for syntax. The KQL is a sketch.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not security advice.** Roles and sharing in the lessons are a starting point. Ask your security team which rules apply to you.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| Throttling: up to 10 minutes of future capacity is free (overage protection), 10 to 60 minutes delays interactive requests by 20 seconds, up to 24 hours rejects them, and beyond that background jobs are rejected. Background work is smoothed over 24 hours. Surge protection rejects background work at an admin limit | Search summaries of the throttling and smoothing pages. **Not opened** | [throttling policy](https://learn.microsoft.com/en-us/fabric/enterprise/throttling), [smoothing and throttling in the Warehouse](https://learn.microsoft.com/en-us/fabric/data-warehouse/compute-capacity-smoothing-throttling) |
| One capacity unit is two Spark cores, and bursting allows three times as many (F64: 128 and 384). A switch can stop one job from using all of the burst. The queue limits of small capacities are **not quoted**, because the summaries disagree | Search summary of the concurrency page, plus community posts that disagree about a single job | [Spark concurrency and queueing](https://learn.microsoft.com/fabric/data-engineering/spark-job-concurrency-and-queueing) |
| Fabric Runtime 2.0 is Spark 4.1 and Delta 4.2, generally available and not the default. Other locale versions of the page list older numbers | Search summary. The pages disagree | [Runtime 2.0](https://learn.microsoft.com/en-us/fabric/data-engineering/runtime-2-0) |
| V-Order is off by default for Spark in new workspaces (the write-heavy profile), is set per session or with `delta.parquet.vorder.enabled`, and one older page says it is on | Search summary. The pages disagree | [Delta optimization and V-Order](https://learn.microsoft.com/fabric/data-engineering/delta-optimization-and-v-order) |
| Git integration: the `.platform` file holds the type, display name, description and `logicalId`. A workspace cannot hold two items with the same logical id. A folder name never changes after creation. Which item types are supported is a list that I could not confirm for lakehouses and pipelines | Search summary of the source code format page. **The example file is mine, not an export** | [source code format](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/source-code-format) |
| The Warehouse does not support triggers. One version of the page also listed hints, materialized views, recursive queries and `FOR XML`. ALTER TABLE is limited. Support for `MERGE` depended on the version of the page. Items must be in the same region | Search summary of the T-SQL surface area page, with pages that disagree | [T-SQL surface area](https://learn.microsoft.com/fabric/data-warehouse/tsql-surface-area) |
| Direct Lake reads Delta files in OneLake with no copy. A model on the SQL endpoint can fall back to DirectQuery for a view or SQL-based row-level security. A model on OneLake does not fall back through the endpoint. Whether it beats Import is disputed | Search summaries, and one analysis from SQLBI that says Import can be faster | [Direct Lake overview](https://learn.microsoft.com/fabric/get-started/direct-lake-overview), [SQLBI: Direct Lake or Import](https://www.sqlbi.com/blog/marco/2024/04/06/direct-lake-vs-import-mode-in-power-bi/) |
| A shortcut is a link to data in another workspace or in external storage, with no copy. Mirroring replicates an operational database into OneLake in near real time. The Warehouse and the lakehouse store Delta in OneLake | Search summaries | [OneLake overview](https://learn.microsoft.com/en-us/fabric/onelake/onelake-overview), [store data in Fabric](https://learn.microsoft.com/fabric/fundamentals/store-data) |
| Spark SQL creates Delta tables by default in Fabric, and tables under `Tables` of a lakehouse are managed | **From my memory of the documentation, not looked up** | none |
| The four workspace roles (Admin, Member, Contributor, Viewer) and what each may do | **From my memory of the documentation, not looked up.** The summary of the rights is mine | none |
| Pipeline activities (Copy data, Notebook, Dataflow, Stored procedure, ForEach, If, Web), the retry, retry interval and timeout of an activity, the four dependency conditions, and parameters | **From my memory of the documentation, not looked up** | none |
| Starter pools start faster than custom pools. Real-Time Intelligence has an Eventstream, an Eventhouse queried with KQL, and an Activator. The lakehouse has a table maintenance feature. F capacities are Azure resources that can be paused | **From my memory, or mentioned in a summary, not looked up** | none |
| The delay of the metadata sync between a lakehouse and its SQL analytics endpoint | **Not found.** The course says that it is not quantified | none |
| The job postings and the interview topics: direction only, from search summaries | Pages of job boards, recruiters and interview guides. A small sample, some of it truncated | [example posting: lead, Microsoft Fabric](https://wearedevelopers.com/jobs/ext/2717784-data-engineer-lead-microsoft-fabric), [example: Provoke Solutions](https://careers-page.com/provoke-solutions/job/4R84VWY5), [example: Hirist](https://www.hirist.tech/j/microsoft-fabric-engineer-1683210), [example: Softobiz](https://softobiz.keka.com/careers/jobdetails/130891), [interview guide: DEV Community](https://dev.to/sankalp_fabric_data_architect/ms-fabric-architect-interview-questions-50mm) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Seven diagrams, at the last step of each: the path of a daily file, the platform, a Delta table, one copy and several engines, Direct Lake, the nightly pipeline and the capacity.
- Six labs in their first state: the log of a table, the merge, small files, partitions, the two readers of gold, and the capacity.
- Coach Faye, who is in every one of those screens.

Looking found faults that the tests could not see, and all of them are fixed: in six of the seven diagrams a subtitle ran out of its box ("one row per store-day", "bad rows, with a reason", "Delta files, one copy", "T-SQL reads and writes", "loads columns on demand", "notebooks, queries, refresh"), a box title was too long for its box ("SQL analytics endpoint", now "SQL endpoint"), and three tags were cut off at the right edge of the picture. The merge lab showed a table with ten columns that wrapped the name of a run into three lines, so it now shows seven. The tests found faults that looking did not, and the controls found weak tests: two of the six changes to the widget code were first accepted, one because the lab test never checked the colour of the revenue bar and one because the change did not alter any output (the partitions equal the files in every layout), so the test now checks the bar and the control changes a threshold instead. The tests also found that the capacity lab printed 1536 and not 1,536 for the cores of an F256 with bursting, and the framing lab labelled a sentence about documentation with the pill "Computed". The recorder was also changed after the recording showed that a merge with a condition still rewrites the files that hold matching rows: the lessons first said that it wrote none.

## Files

```
fabric/
  index.html, css/fabric.css   the page and its colours
  js/config.js                 the course settings: Coach Faye, the paths, the levels
  js/graphs.js                 7 diagram specs
  js/widgets.js                the 6 labs
  js/content/                  one file per mission, 00 to 09
  js/real.js                   the recording: files, tables, texts and counts written by capture_fabric.py
  verify/project/              the Brewline project: tables, bronze, silver, a merge of changed lines, the gold table in Spark SQL and T-SQL, a landing step that is safe to repeat, maintenance and an example .platform file
  verify/fablib.py             helpers of the recorder: a Spark session with Delta, a lakehouse-shaped folder, the data rules, masks and the writer of js/real.js
  verify/capture_fabric.py     runs the notebook code and the experiments, and writes js/real.js
  verify/verify_fabric.py      runs the notebook code and the bug hunts, parses every SQL text, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js      recomputes the rules of the labs from the rules of the data
  verify/e2e_labs.js           drives the six labs in Chromium
  verify/dump_fabric.js        lists the code, the commands and the strings of the course for verify_fabric.py
  verify/requirements.txt      what the machine needs
  verify/INTEGRATION.md        what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 -m venv fabric-env && fabric-env/bin/pip install -r fabric/verify/requirements.txt
fabric-env/bin/python fabric/verify/verify_fabric.py                        # the notebook code, the bug hunts, every SQL text, lab data and controls (about 2 minutes)
fabric-env/bin/python fabric/verify/verify_fabric.py --recapture --browser  # also record again (about 3 minutes) and drive the labs in Chromium
fabric-env/bin/python fabric/verify/capture_fabric.py                       # writes fabric/js/real.js
node dev/lint-content.js fabric
node dev/e2e.js fabric && node fabric/verify/e2e_labs.js
node dev/smoke.js fabric --path all
```

A check whose tool is missing says so and is skipped.

Independent study material. Not affiliated with or endorsed by Microsoft, the Apache Software Foundation, the Delta Lake project or any other vendor or project named here.
