# Project: the Brewline lakehouse (Spark, Delta Lake)

A guided walkthrough of one medallion lakehouse, built the way a senior data engineer would defend it in a review: raw files that are never lost, a silver layer that validates and merges only newer events, a quarantine that keeps every rejected row with its reason, gold days that are replaced whole, a gate between the layers, and a drill for every way that it was seen to break. The pipeline is a real repository, [`projects/brewline-lakehouse`](../projects/brewline-lakehouse/README.md), and every file of it is shown on a screen. One coach, **Ari**, and one coffee retailer, **Brewline**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen that teaches a fact carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `project-lakehouse/verify/capture_lakehouse.py` on one Linux machine. The project was copied to a temporary folder and run with **Spark 4.0.1** and **Delta Lake 4.0.1** on Java 21 and Python 3.13: pytest ran its 7 tests, the pipeline ran for three days of a pretend source, the last day ran again, and a small program read the history of the silver table. The code on the screens is the code that ran |
| **From documentation** | Everything that was not run: cloud storage, a cluster, a catalog and access control, streaming, table maintenance, a scheduler and alerts, a Docker build, a CI run, and the decisions that go with them. These screens say so |

The stand-ins and limits, said again where they matter:

- **A local folder stands in for cloud storage.** The paths are one setting. Nothing here says what a bucket, a catalog or a cluster would change.
- **The source is a stand-in.** A Python file with fixed rules and no random numbers: 305 lines on day 1, two files on day 2 (one of them a replay of day 1), and 83 lines on day 3. It holds traps on purpose: four dirty lines, a duplicate, a refund, a field that nobody announced, two amounts that are text, and an old event that arrives late. It never deletes an order and never sends a file in the middle of a write.
- **One machine, one Spark session.** Nothing was run on a cluster, and no table has enough rows for small files or skew to matter.
- **The Dockerfile and the CI workflow are sketches** and did not run.
- **Nothing is timed and no cost was measured.** The recording holds counts, states and texts. It never holds a number of seconds.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Spark's own logs went to the error stream and are not part of it.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Walkthrough** | 123 | about 70 minutes | Building and running the pipeline: every file, every run, and what each layer holds |
| **Senior** | 163 | about 100 minutes | Everything in the Walkthrough, plus the trade-offs (three decisions), the failure drills, and the questions that a reviewer asks about a lakehouse |
| **Everything** | 165 | about 105 minutes | Adds one finer point: what Spark returns for a line that it cannot read |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Walkthrough | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **Build it.** The pretend source and its traps, bronze with its ledger, and the rules that decide what is valid and why a row is not | 9 min | 11 min | 12 min |
| 2 | **Silver and gold.** The merge that applies only newer events, the replay of day 2, the gold days that are replaced whole, and a lab with the runs | 12 min | 15 min | 15 min |
| 3 | **Operate it.** The gate, a field that nobody announced, a late event, a rerun that does nothing, and what Delta Lake kept | 12 min | 16 min | 17 min |
| 4 | **Defend it.** The project in two minutes, what it covers and what it does not, ten interview questions, a coding round, a mock round, and a one-page review | 30 min | 53 min | 53 min |

Mission 0 is the start: see the whole lakehouse, what each layer promises, and where each skill of a senior posting sits in it (7 minutes).

## What job descriptions ask for, and where this project covers it

This is the same reading as the first project of this library: two analyses of data engineer postings (one of 120,044 posts, one of 6,877) and a sample of senior postings, read through search summaries and not post by post. The analyses measure different things and several results were vendor blogs, so this shows **direction and not a count**. The analysis of 120,044 posts put Python in about three posts of four and SQL in two of three, Snowflake in about one of five, Spark in about one of five, and Airflow and Kafka in about one of eight each. I did not run a new search for this project, and I did not count how many postings name Delta Lake, Databricks or a medallion design.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Python and SQL | all | **Run**: all of the pipeline is Python, with Spark expressions that read like SQL |
| Spark for batch pipelines | 1, 2, 3 | **Run**: parsing, a window, a merge, a replace of days |
| Delta Lake, or another table format | 2, 3 | **Run**: Delta 4.0.1 with `MERGE`, `replaceWhere`, the history and time travel. Iceberg and Hudi are **not covered** |
| Medallion layers, bronze to gold | 0, 1, 2 | **Run**: three layers and a quarantine |
| Idempotent loads, late and duplicate data | 1, 2, 3 | **Run**: a ledger of files, a merge that applies only newer events, whole days replaced, a rerun that does nothing |
| Data quality and tests | 1, 3 | **Run**: a quarantine with reasons, a gate after every run, 7 pytest tests |
| Cloud storage and Databricks | 3, 4 | **Stand-in**: a local folder. The code does not change when the path is a bucket, which is a claim from documentation and was not run |
| CI/CD, Docker, access control, streaming, a scheduler | 3, 4 | **Not run**: a CI and a Dockerfile sketch. The rest is not built, and the walkthrough names each gap |

The 10 interview questions are written from the pipeline itself (layers, merge, repeats, bad data, late data, the gate, scale, a changed feed, what to change) and from the usual themes of a data engineering review. I did not check them against a list of real interview questions.

Sources of the figures: [Huntr, 120,044 data engineer posts](https://huntr.co/resume-skills/data-engineer), [DEV Community, 6,877 postings](https://dev.to/gnana_6392e836fd500a957dc/data-engineer-skills-companies-want-in-2026-6877-posting-analysis-44p9), and [Freehire, open postings by skill](https://freehire.me/insights/skills/data_engineering).

## What you work through

- **Follow Brewline.** One pretend source, three days. A file arrives twice, an old event arrives after a newer one, a field appears that nobody announced, two amounts are text, and a refund restates the day of an old order.
- **2 animated diagrams.** The medallion from the files to the gate, and the merge that applies only newer events.
- **1 lab.** Four runs of the same pipeline: what each layer did, and what each table holds after it.
- **5 terminal replays, 6 code walkthroughs and 7 comparison tables.** The files `landing.py`, `bronze.py`, `rules.py`, `silver.py`, `gold.py` and `quality.py`, and the real runs, with the tour of the Delta history.
- **13 quizzes, 4 bug hunts, 1 ordering game, 3 decisions with a recommended answer (ADRs) and 2 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **10 interview questions and a coding round.** Each question has a timer, a 90 or 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The coding round is the window that keeps one event for each order, with hints and a solution. The last mission plays all the questions in a mock interview.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 5 chapters, 79 screens: 56 for everyone, 21 for Senior, 2 extra. 30 screens are tagged Recorded and 5 From documentation. Quizzes, games and interview questions carry no tag |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 123 frames on the Walkthrough path, 163 on the Senior path and 165 on the Everything path |
| The same walk at phone width (390 by 844), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js project-lakehouse`): every quiz, bug hunt, ordering game, decision, incident, interview question and mock question, plus keys, text size, Map, paths, saving and reset | 283 checks passed, 0 failed |
| The lab driven in the browser (`project-lakehouse/verify/e2e_labs.js`): every chip, compared with the recording and with values worked out by `model.js` | 54 checks passed |
| Recorded output (`project-lakehouse/verify/capture_lakehouse.py`) | 21 files, 7 texts, 3 tables, 7 sets of counts and 6 facts about the tools: 44 recorded items in all. The recorder runs pytest and the three days in temporary copies (about 8 minutes), and the repository is never touched |
| The files, parsed (`project-lakehouse/verify/verify_lakehouse.py`) | The 21 files of the recording are the files of the project on disk, and the 6 code screens show their files exactly. The 30 Python snippets of the lessons go through the Python parser, which checks syntax and nothing else. The 7 pytest tests of the project pass |
| Bug hunts run on the project | All 4 hunts run on a copy of the real project, each snippet next to its fix (the fix is the code as it ships): a merge without the time condition lets an old event turn `SHIPPED` back into `PLACED`, no window on the batch gives 301 silver rows for 300 orders and the gate fails, the dates of the events instead of the order dates leave gold at 300 orders and 1,457,550 cents against 299 and 1,455,033 in silver, and a null-struct check names the cut line `missing_order_id` and the text amount `bad_amount` while the test of the rules fails on it |
| The coding round, run | The solution runs on real events of days 1 and 2: 301 valid events become 300 rows, and the kept event of every order is the latest by time, file and line. A window that keeps the earliest event, and no window at all, are both refused |
| Recapture (`verify_lakehouse.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 44 items, 0 differ. Nothing is timed, so only one thing is allowed to differ: the date |
| Lab data (`project-lakehouse/verify/check_widgets.js`) | 35 checks written in code that shares nothing with the lab or the project (`model.js`): the three days of the source rebuilt from their rules, a simulation of the ledger, the window, the merge and the gold days, the numbers and the printed text of every run, the four lines of the gate, the history and the versions of silver, and the quarantine by reason |
| Controls | 31 deliberately broken inputs, and each one is refused: Python with a syntax error (3), 16 changes to the recording that the widget checker must refuse (a merge that inserted 117 orders, a late event that was not left alone, a silver with a duplicate, gold that counts the refunded order, a gate that is off by one cent, and eleven more), 2 wrong solutions of the coding round, 3 changes to the recording that the comparison of a recapture must see, and 7 changes to the lab code that the browser test must catch |

### What was not checked

- **Cloud storage, a cluster, streaming, table maintenance, a scheduler, alerts, a Docker build and a CI run did not run.** What the lessons say about them is tagged From documentation.
- **One version of each tool.** Spark 4.0.1, Delta Lake 4.0.1, Java 21, Python 3.13. Another version may print other texts or change a default.
- **No timings and no costs.** The recording counts rows and checks. Nothing says how fast the pipeline is.
- **A pretend source.** It never failed, never sent a file in the middle of a write, never deleted an order and never asked for a secret.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.

### What changed while it was built

Four things came from the work and are worth knowing, because the first two changed the design:

- **The first design moved revenue between days.** Silver was partitioned by the date of the latest event, so a shipment moved an order from one day to the next, and the revenue of 1 March changed overnight. I found it by reading how gold counted a refund. Silver now keeps an **order date** that is set once, and gold recomputes the order dates of the orders in the batch. The last mission says so.
- **The pretend source had no refund**, so the filter that leaves refunded orders out of gold had no run behind it. Day 2 now refunds order 41, and the test of the pipeline checks that gold counts 415 orders for 416 in silver.
- **A first control of the checks was an equivalent mutation.** Changing the colour of the silver tile to "always good" cannot fail a test, because no recorded run holds a duplicate. The control now makes the tile bad, which the test sees.
- **A rule that never ran was added to the test.** `missing_order_id` is in the rules, and no data of the three days triggers it, so the test of the rules now has a record without an id.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| In permissive mode `from_json` returns a struct of nulls with the text in the corrupt-record column, and not a null struct | **Recorded** for this project: the bug hunt of the rules, and the test of the rules | none |
| The shares of Python, SQL, Snowflake, Spark, Airflow and Kafka in postings | Search summaries of a posting analysis. The analyses measure different things and are directional | [Huntr](https://huntr.co/resume-skills/data-engineer) |
| Delta keeps the files of old versions until a `VACUUM`, and the retention is a setting | **From my memory of the Delta Lake documentation, not looked up.** No `VACUUM` ran, and the recorded tour reads versions that were all still there | none |
| `OPTIMIZE`, a managed file source or a stream, a catalog with roles, and Iceberg or Hudi as other table formats | **From my memory, not looked up** | none |
| The code does not change when the path is a bucket | **From my memory, not run.** Credentials, a connector and the behaviour of the listing of files are what a bucket changes | none |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Two diagrams: the medallion (the step of the gold days) and the merge (the step of the replay), before and after their labels were shortened.
- The lab on day 2, which is the state it opens in.
- The welcome screen, before and after, the code walkthroughs of `rules.py` (the step of the reasons) and of `silver.py` (the step of the merge and the dates), the table of the five quarantine reasons, before and after, the replay of day 3, the table of the versions of silver, the bug hunt of the gold days, the incident of the failed gate, and the coding round.
- Coach Ari, who is in every one of those screens.

Looking found four faults that the tests could not see, and all are fixed: three labels of the diagrams were wider than their boxes (`validated, merged`, `Newer than the row?` and `a repeat or an old event`), the welcome text was cut at the bottom of the coach bubble, the first column of the table of reasons broke `parse_error` and `unknown_store` in the middle of the word, and a long comment line of `silver.py` was cut at the edge of the code view, which led to a rewrite of every file of the project in lines of at most 100 characters. Every screen that is not listed here was checked by the tests above and was not looked at.

## Files

```
project-lakehouse/
  index.html, css/project-lakehouse.css  the page and its colours
  js/config.js                     the settings: Coach Ari, the paths, the levels
  js/graphs.js                     2 diagram specs
  js/widgets.js                    the run lab
  js/content/                      one file per mission, 00 to 04
  js/real.js                       the recording: files, texts, tables and counts written by capture_lakehouse.py
  verify/lakelib.py                helpers of the recorder: a temporary copy of the project, the run of its modules, and the parser of a run
  verify/capture_lakehouse.py      runs the project and writes js/real.js
  verify/counts.py                 counts the rows of every table of a lakehouse folder
  verify/hunts_lake.py             one small scenario for each bug hunt, run on Spark with a copy of the project
  verify/verify_lakehouse.py       parses the code, runs the pytest tests, the four bug hunts and the coding round, compares a new recording with js/real.js, runs the controls
  verify/model.js                  an independent model of the source and of the layers
  verify/check_widgets.js          recomputes the numbers of the recording with the model
  verify/e2e_labs.js               drives the run lab in Chromium
  verify/dump_lakehouse.js         lists the code, the commands and the strings of the walkthrough for verify_lakehouse.py
  verify/requirements.txt          what the machine needs
  verify/INTEGRATION.md            what the hub page, the root README and package.json needed
projects/brewline-lakehouse/       the repository that the walkthrough describes (README, Makefile, lakehouse, tests)
```

## Run the checks

```bash
python3 -m venv spark-env && spark-env/bin/pip install "pyspark==4.0.1" "delta-spark==4.0.1" pytest
export LAKE_PY=$PWD/spark-env/bin/python
python3 project-lakehouse/verify/verify_lakehouse.py                        # parse the code, run pytest and the bug hunts, lab data, controls
python3 project-lakehouse/verify/verify_lakehouse.py --recapture --browser  # also record everything again and compare, and drive the lab (needs Playwright)
python3 project-lakehouse/verify/capture_lakehouse.py                       # write a new project-lakehouse/js/real.js
node dev/lint-content.js project-lakehouse && node dev/e2e.js project-lakehouse
node dev/smoke.js project-lakehouse --path all
node project-lakehouse/verify/check_widgets.js && node project-lakehouse/verify/e2e_labs.js
```
