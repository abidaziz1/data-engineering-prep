# Project: the Brewline CDC pipeline (PostgreSQL, Debezium, Kafka, Spark, Delta Lake)

A guided walkthrough of one change data capture pipeline, built the way a senior data engineer would defend it in a review: the changes of a database are read from its log, travel through Kafka, and become a table that always matches the database, with every message applied once in effect, a delete that an old message cannot undo, a gate that reads the database itself, and a drill for every way that it was seen to break. The pipeline is a real repository, [`projects/brewline-cdc`](../projects/brewline-cdc/README.md), and every file of it is shown on a screen. One coach, **Ari**, and one coffee retailer, **Brewline**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen that teaches a fact carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `project-cdc/verify/capture_cdc.py` on one Linux machine. The project was copied to a temporary folder and run against real services: **PostgreSQL 16.15** with logical decoding, **Apache Kafka 4.4.0** in KRaft mode, a **Kafka Connect** worker with **Debezium 3.7.1.Final** (from Maven Central), and **Spark 4.0.1** with **Delta Lake 4.0.1** on Java 21 and Python 3.13. pytest ran its 8 tests, and the pipeline ran five stages: a snapshot, a day of changes, a replay of the last silver batch, a connector that was stopped while the shop went on, and a change of the replica identity. The code on the screens is the code that ran |
| **From documentation** | Everything that was not run: a cluster of brokers, a schema registry, a schema change, an incremental snapshot, security, alerts and a limit on the log of a slot, a Docker build, a CI run, and the decisions that go with them. These screens say so |

The stand-ins and limits, said again where they matter:

- **One machine, one broker, one partition, one table.** The services talk over `localhost`. Counts, offsets, states and the shape of the messages are real. Latency, lag and throughput say nothing about a cluster, and none was measured.
- **The database is a stand-in.** `db/seed.sql` and `db/changes.sql` hold a small, deterministic shop: 200 orders, then a day of 50 inserts, 30 shipments, 5 deletes and one order that changes twice in one transaction.
- **The slot is recorded as yes or no.** The recording says whether the slot was active, and whether the log that it holds grew and dropped. It does not hold a number of bytes, because they depend on the machine.
- **Sample messages have their changing numbers replaced by their names** (`<lsn>`, `<ts_ms>`), so that a second recording repeats everything except the date.
- **No containers, and a CI sketch.** The services run directly on the machine, through `stack/local.py`. The CI workflow of the project is a sketch that did not run.
- **Nothing is timed and no cost was measured.** The recording holds counts, states and texts. It never holds a number of seconds.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Spark's own logs went to the error stream and are not part of it.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Walkthrough** | 133 | about 75 minutes | Building and running the pipeline: every file, every run, and what each message holds |
| **Senior** | 172 | about 105 minutes | Everything in the Walkthrough, plus the trade-offs (three decisions), the failure drills, and the questions that a reviewer asks about change data capture |
| **Everything** | 176 | about 110 minutes | Adds finer points: what an update says about the row before the change, and the checksum file of a checkpoint |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Walkthrough | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **Capture it.** The table, the publication and the role, the connector, the snapshot, and what a create, an update and a delete look like in the topic | 10 min | 12 min | 12 min |
| 2 | **Apply it.** The parser, bronze, and the silver merge by log position, a day of changes, a lab with the runs, and three bug hunts | 14 min | 17 min | 17 min |
| 3 | **Operate it.** The gate against Postgres, a batch that ran twice, the history of silver, a connector that was stopped, and the replica identity | 13 min | 17 min | 19 min |
| 4 | **Defend it.** The project in two minutes, what it covers and what it does not, ten interview questions, a coding round, a mock round, and a one-page review | 30 min | 53 min | 53 min |

Mission 0 is the start: see the whole pipeline, what each part promises, and where each skill of a senior posting sits in it (7 minutes).

## What job descriptions ask for, and where this project covers it

This is the same reading as the first project of this library: two analyses of data engineer postings (one of 120,044 posts, one of 6,877) and a sample of senior postings, read through search summaries and not post by post. The analyses measure different things and several results were vendor blogs, so this shows **direction and not a count**. The analysis of 120,044 posts put Python in about three posts of four and SQL in two of three, Snowflake in about one of five, Spark in about one of five, and Airflow and Kafka in about one of eight each. I did not run a new search for this project, and I did not count how many postings name Debezium or change data capture.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Change data capture from a database | 1, 2 | **Run**: Debezium on PostgreSQL logical decoding, a snapshot, then inserts, updates and deletes |
| Kafka, or another streaming platform | 1, 3 | **Run**: Apache Kafka 4.4.0, one topic, fed by Kafka Connect. A cluster is **not covered** |
| Spark streaming jobs | 2, 3 | **Run**: Structured Streaming with `foreachBatch` and `availableNow`. Flink is **not covered** here (see its own tutorial) |
| Delta Lake, or another table format | 2, 3 | **Run**: Delta 4.0.1 with `MERGE`, soft deletes and a history of versions |
| At-least-once delivery, ordering, idempotency | 2, 3 | **Run**: a merge by log position, and a batch that ran twice and left 86 rows alone |
| Reconciliation against the source | 3 | **Run**: a gate of 5 checks that reads Postgres, and 8 pytest tests |
| A schema registry, Avro, schema changes | 3, 4 | **Not covered**: JSON with no schema. A new column is ignored |
| Managed services, security, monitoring | 3, 4 | **Not run**: one machine, no TLS, no login, no alerts |

The 10 interview questions are written from the pipeline itself (why the log, order, deletes, repeats, the slot, the gate, a changed table, scale, what to change) and from the usual themes of a data engineering review. I did not check them against a list of real interview questions.

Sources of the figures: [Huntr, 120,044 data engineer posts](https://huntr.co/resume-skills/data-engineer), [DEV Community, 6,877 postings](https://dev.to/gnana_6392e836fd500a957dc/data-engineer-skills-companies-want-in-2026-6877-posting-analysis-44p9), and [Freehire, open postings by skill](https://freehire.me/insights/skills/data_engineering).

## What you work through

- **Follow Brewline.** One pretend shop database. A snapshot of 200 orders, a day of 87 changes with five deletes, a batch that runs twice, a connector that is stopped while 100 orders ship, and a change of the replica identity.
- **2 animated diagrams.** The pipeline from the database to the gate, and the merge by log position.
- **1 lab.** Five runs of the same pipeline: what bronze and silver did, and what Postgres held.
- **7 terminal replays, 7 code walkthroughs and 9 comparison tables.** The files `schema.sql`, `orders-connector.json`, `envelope.py`, `bronze.py`, `silver.py`, `stream.py` and `quality.py`, the real runs, and three real change messages with their numbers replaced by their names.
- **14 quizzes, 4 bug hunts, 1 ordering game, 3 decisions with a recommended answer (ADRs) and 2 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **10 interview questions and a coding round.** Each question has a timer, a 90 or 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The coding round rebuilds the current orders from a log of changes. The last mission plays all the questions in a mock interview.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 5 chapters, 85 screens: 61 for everyone, 20 for Senior, 4 extra. 34 screens are tagged Recorded and 7 From documentation. Quizzes, games and interview questions carry no tag |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 133 frames on the Walkthrough path, 172 on the Senior path and 176 on the Everything path |
| The same walk at phone width (390 by 844), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js project-cdc`): every quiz, bug hunt, ordering game, decision, incident, interview question and mock question, plus keys, text size, Map, paths, saving and reset | 302 checks passed, 0 failed |
| The lab driven in the browser (`project-cdc/verify/e2e_labs.js`): every chip, compared with the recording and with values worked out by `model.js` | 49 checks passed |
| Recorded output (`project-cdc/verify/capture_cdc.py`) | 25 files, 12 texts, 1 table, 11 sets of counts and 9 facts about the tools: 58 recorded items in all. The recorder starts the services and runs pytest and the five stages in temporary copies (about 10 minutes), and the repository is never touched |
| The files, parsed (`project-cdc/verify/verify_cdc.py`) | The 25 files of the recording are the files of the project on disk, and the 7 code screens show their files exactly. The 29 Python snippets of the lessons go through the Python parser, and the connector file and the 5 sample messages through a JSON parser; both check syntax and nothing else. The 8 pytest tests of the project pass |
| Bug hunts run on the project | All 4 hunts run on a copy of the real project, each snippet next to its fix (the fix is the code as it ships): a merge without the position condition lets a message that is delivered again turn `SHIPPED` into `PLACED`, no window on the batch stops the merge with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE` when an order changes twice, a hard delete lets an old update bring the order back as 1 live row while the mark keeps it deleted, and a replay that removes the commit but not its `.crc` file makes Spark stop with two queries on one checkpoint |
| The coding round, run | The solution runs on the log of the recorded day, rebuilt from the rules of the shop: 287 events become 245 live orders, with the recorded revenue and every status the one that the log gives. A window that keeps the earliest event, and a solution that keeps the deletes, are both refused |
| Recapture (`verify_cdc.py --recapture`) | The whole recording is made again on this machine, with the real services, and compared with `js/real.js`: 58 items, 0 differ. Nothing is timed, so only one thing is allowed to differ: the date |
| Lab data (`project-cdc/verify/check_widgets.js`) | 35 checks written in code that shares nothing with the lab or the project (`model.js`): the changes of the shop rebuilt from their rules, the messages that each stage adds to the topic, the numbers and the printed text of every run, the five lines of the gate, the history of silver, the offsets of the sample messages, and the structure of the sample messages |
| Controls | 34 deliberately broken inputs, and each one is refused: Python and JSON with a syntax error (4), 18 changes to the recording that the widget checker must refuse (a day of changes that inserted 51 orders, a replay that left 85 rows alone, a slot that stayed active while the connector was stopped, a delete message with the whole old row, and fourteen more), 2 wrong solutions of the coding round, 3 changes to the recording that the comparison of a recapture must see, and 7 changes to the lab code that the browser test must catch |

### What was not checked

- **A cluster, a schema registry, a schema change, an incremental snapshot, security, alerts, a limit on the log of a slot, a Docker build and a CI run did not run.** What the lessons say about them is tagged From documentation.
- **One version of each tool.** PostgreSQL 16.15, Kafka 4.4.0, Debezium 3.7.1.Final, Spark 4.0.1, Delta Lake 4.0.1, Java 21, Python 3.13. Another version may print other texts or change a default, and the fields of a Debezium message have changed between versions.
- **No timings and no costs.** The recording counts messages, rows and checks. Nothing says how fast the pipeline is, or how far behind it can get.
- **A pretend database.** It never failed over, never rolled back a large transaction, never changed its columns and never held a row with a null in a column that the parser reads.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.

### What changed while it was built

- **The replay command failed the first time**, and the lessons use the failure. Spark could not write the commit of a batch again, because a checkpoint on a local disk keeps a `.1.crc` checksum file next to each commit, and my first version removed only the commit. It is now a bug hunt of the Everything path.
- **A delete message is not what I expected.** Its `before` holds the key and placeholder values for every other column (`0`, an empty text and the year 1970), under the default replica identity. The parser reads only the key of a delete, and the lessons say that only the key can be trusted.
- **The tests of the merge needed no service**, so the bug hunts and the coding round run in minutes on any machine with Spark. Only a recapture starts PostgreSQL, Kafka and Connect.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| A delete message has the key and placeholders in `before`, and an update has `before: null`, under the default replica identity | **Recorded** for this project: the sample messages, and the lessons that read them | none |
| A merge that finds two source rows for one target row fails in Delta Lake | **Recorded** for this project: the bug hunt of the window | none |
| The shares of Python, SQL, Snowflake, Spark, Airflow and Kafka in postings | Search summaries of a posting analysis. The analyses measure different things and are directional | [Huntr](https://huntr.co/resume-skills/data-engineer) |
| Postgres has a limit on the log that a slot may hold, `max_slot_wal_keep_size` | **From my memory of the PostgreSQL documentation, not looked up.** It was not set or run | none |
| Debezium has an incremental snapshot for large tables, and handles a schema change by changing the shape of its messages | **From my memory of the Debezium documentation, not looked up.** Neither was run | none |
| After a dropped slot, a new snapshot brings inserts and updates but not the deletes of the gap | **My reasoning, not run.** The incident that uses it is tagged From documentation | none |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- The pipeline diagram (the step of the gate that reads Postgres) and the merge diagram (the step of the repeat).
- The welcome screen, and the lab on the day of changes.
- Coach Ari, who is in every one of those screens.

Looking found nothing to fix in these screens, and one note for the next project: the step numbers of two edges of a diagram sit under the moving blocks for a moment. Every screen that is not listed here was checked by the tests above and was not looked at.

## Files

```
project-cdc/
  index.html, css/project-cdc.css  the page and its colours
  js/config.js                     the settings: Coach Ari, the paths, the levels
  js/graphs.js                     2 diagram specs
  js/widgets.js                    the run lab
  js/content/                      one file per mission, 00 to 04
  js/real.js                       the recording: files, texts, tables and counts written by capture_cdc.py
  verify/cdclib.py                 helpers of the recorder: a temporary copy of the project, its services, the run of its modules, and the parser of a run
  verify/capture_cdc.py            starts the services, runs the project and writes js/real.js
  verify/counts.py, tour.py        count the tables of a pipeline folder, and read the history of silver
  verify/hunts_cdc.py              one small scenario for each bug hunt and for the coding round, run on Spark with a copy of the project
  verify/verify_cdc.py             parses the code, runs the pytest tests, the four bug hunts and the coding round, compares a new recording with js/real.js, runs the controls
  verify/model.js                  an independent model of the shop and of the pipeline
  verify/check_widgets.js          recomputes the numbers of the recording with the model
  verify/e2e_labs.js               drives the run lab in Chromium
  verify/dump_cdc.js               lists the code, the commands and the strings of the walkthrough for verify_cdc.py
  verify/requirements.txt          what the machine needs
  verify/INTEGRATION.md            what the hub page, the root README and package.json needed
projects/brewline-cdc/             the repository that the walkthrough describes (README, Makefile, db, connect, cdc, stack, tests)
```

## Run the checks

```bash
python3 -m venv spark-env && spark-env/bin/pip install "pyspark==4.0.1" "delta-spark==4.0.1" pytest
export CDC_PY=$PWD/spark-env/bin/python
python3 project-cdc/verify/verify_cdc.py                        # parse the code, run pytest and the bug hunts, lab data, controls (no service needed)
# a recording also needs the real services: the PostgreSQL 16 programs, Apache Kafka 4.4.0 and the Debezium plugin
export KAFKA_HOME=$PWD/kafka_2.13-4.4.0 DEBEZIUM_PLUGINS=$PWD/plugins
python3 project-cdc/verify/verify_cdc.py --recapture --browser  # also record everything again and compare, and drive the lab (needs Playwright)
python3 project-cdc/verify/capture_cdc.py                       # write a new project-cdc/js/real.js
node dev/lint-content.js project-cdc && node dev/e2e.js project-cdc
node dev/smoke.js project-cdc --path all
node project-cdc/verify/check_widgets.js && node project-cdc/verify/e2e_labs.js
```
