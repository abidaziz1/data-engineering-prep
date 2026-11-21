# Project: the Brewline orders platform (dlt, DuckDB, dbt, Airflow)

A guided walkthrough of one complete ELT pipeline, built the way a senior data engineer would defend it in a review: an incremental and repeatable load, tested models, a gate between the load and the readers, an orchestrator that fails closed, and a drill for every way that it was seen to break. The pipeline is a real repository, [`projects/brewline-elt`](../projects/brewline-elt/README.md), and every file of it is shown on a screen. One coach, **Ari**, and one coffee retailer, **Brewline**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen that teaches a fact carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `project-elt/verify/capture_elt.py` on one Linux machine. The project was copied to a temporary folder and run with **dlt 1.32.0** into **DuckDB 1.5.6**, **dbt 1.12.7** with dbt-duckdb 1.11.1, and **Airflow 3.4.0**: the DAG ran five times through `airflow dags test` (three days of a pretend shop, a retry of day 3 after its fix, and a backfill of day 2), and pytest ran its 5 tests. The code on the screens is the code that ran |
| **From documentation** | Everything that was not run: a cloud warehouse, a deployed Airflow (a scheduler, workers, the web interface, secrets, alerts), a CI run, and the decisions that go with them. These screens say so |

The stand-ins and limits, said again where they matter:

- **DuckDB stands in for a warehouse.** The SQL is plain, and nothing here says what a query costs or how it behaves on Snowflake, BigQuery or Redshift.
- **The shop is a stand-in.** A Python function with fixed rules and no random numbers: 200 orders on day 1, then changes on days 2 and 3. Day 3 holds two traps on purpose (a product with no price, and a renamed store). The shop never deletes an order, and a cursor could not see one.
- **Airflow ran as a test command.** `airflow dags test` runs the tasks of one DAG run in order, in one process. No scheduler, no worker, no web interface and no alert ran.
- **The CI workflow is a sketch** (`.github/workflows/ci.yml` of the project) and did not run.
- **Three Python environments.** dlt, dbt and Airflow pin versions that do not agree, so the project uses one environment for each, and the DAG calls the other two as programs.
- **Nothing is timed and no cost was measured.** The recording holds counts, states and texts. It never holds a number of seconds.
- **A terminal replay is built from recorded values.** Every output line came from the recording. The dbt lines are summarised (the counts, the failing test, the skipped nodes) because dbt prints its steps in an order that changes from run to run.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Walkthrough** | 119 | about 70 minutes | Building and running the pipeline: every file, every run, and what each tool does |
| **Senior** | 156 | about 100 minutes | Everything in the Walkthrough, plus the trade-offs (three decisions), the failure drills, and the questions that a reviewer asks about a pipeline |
| **Everything** | 157 | about 100 minutes | Adds one finer point: why dbt skipped seven things and not twenty-two |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Walkthrough | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **Build it.** The shop and its traps, the dlt load (a cursor, a lookback and a merge), the dbt models, and the 14 tests | 12 min | 14 min | 14 min |
| 2 | **Orchestrate it and gate it.** The DAG, the quality gate, and a lab with five real runs | 14 min | 18 min | 18 min |
| 3 | **Operate it.** The failed day 3, what each layer held, the fix, the history of a renamed store, and a backfill | 11 min | 15 min | 15 min |
| 4 | **Defend it.** The project in two minutes, what it covers and what it does not, ten interview questions, a mock round, and a one-page review | 26 min | 46 min | 46 min |

Mission 0 is the start: see the whole platform, and where each skill of a senior posting sits in it (7 minutes).

## What job descriptions ask for, and where this project covers it

I read two analyses of data engineer postings (one of 120,044 posts, one of 6,877) and a sample of senior postings through four searches. I read the search summaries and not every posting, the analyses measure different things, and several results were vendor blogs, so this shows **direction and not a count**. The analysis of 120,044 posts put Python in about three posts of four and SQL in two of three, Snowflake in about one of five, Spark in about one of five, and Airflow and Kafka in about one of eight each. In the sample of senior postings, **Airflow and dbt appear together**, Snowflake is the warehouse that is named most, CI/CD is nearly universal, and Terraform, Docker, Kubernetes and Kafka appear in a subset of roles.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Python and SQL | all | **Run**: the loader and the gate are Python, the models and tests are SQL |
| Airflow with dbt | 2 | **Run**: one DAG that calls dlt, dbt, a gate and a publish step, five real runs |
| An incremental, repeatable load of an API | 1 | **Run**: a dlt resource with a cursor, a lookback and a merge. A repeat wrote 0 rows |
| Data quality and testing | 1, 2 | **Run**: 14 dbt tests, a singular test, a gate against the source, pytest |
| A cloud warehouse (Snowflake) | 1 | **Stand-in**: DuckDB. The project's README says what a port would change |
| CI/CD with Git and tests | 4 | **Not run**: a workflow sketch only |
| Monitoring, alerting, ownership | 3, 4 | **Not covered**: the failed run is the only signal. The walkthrough names the gap, and shows what to add first |
| Spark and Databricks, Kafka, Terraform | none | Other projects and courses of this library |

The 10 interview questions are written from the pipeline itself (design, tests, failure, backfill, scale, monitoring, what to change) and from the usual themes of a data engineering review. I did not check them against a list of real interview questions.

Sources of the figures: [Huntr, 120,044 data engineer posts](https://huntr.co/resume-skills/data-engineer), [DEV Community, 6,877 postings](https://dev.to/gnana_6392e836fd500a957dc/data-engineer-skills-companies-want-in-2026-6877-posting-analysis-44p9), and [Freehire, open postings by skill](https://freehire.me/insights/skills/data_engineering).

## What you work through

- **Follow Brewline.** One pretend shop, three days. A product with no price stops the run on day 3, a store is renamed, a backfill runs, and the first gate fails a good backfill.
- **2 animated diagrams.** The platform from the shop to the readers, and a failing test that fails closed.
- **1 lab.** Five runs of the same DAG: what each step did, and the raw table against the marts.
- **4 terminal replays, 5 code walkthroughs and 8 comparison tables.** The files `shop_api.py`, `load_orders.py`, `fct_orders.sql`, `brewline_daily.py` and `source_vs_warehouse.py`, and the real runs of Airflow.
- **11 quizzes, 4 bug hunts, 1 ordering game, 3 decisions with a recommended answer (ADRs) and 3 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **10 interview questions,** each with a timer, a 90 or 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The last mission plays all of them in a mock interview.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 5 chapters, 75 screens: 56 for everyone, 18 for Senior, 1 extra. 26 screens are tagged Recorded and 4 From documentation. Quizzes, games and interview questions carry no tag |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 119 frames on the Walkthrough path, 156 on the Senior path and 157 on the Everything path |
| The same walk at phone width (390 by 844), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js project-elt`): every quiz, bug hunt, ordering game, decision, incident, interview question and mock question, plus keys, text size, Map, paths, saving and reset | 268 checks passed, 0 failed |
| The lab driven in the browser (`project-elt/verify/e2e_labs.js`): every chip, compared with the recording and with values worked out by `model.js` | 52 checks passed |
| Recorded output (`project-elt/verify/capture_elt.py`) | 27 files, 8 texts, 3 tables, 8 sets of counts and 7 facts about the tools: 53 recorded items in all. The recorder runs the whole pipeline (five DAG runs, about 90 seconds) in temporary copies, and the repository is never touched |
| The files, parsed (`project-elt/verify/verify_elt.py`) | The 27 files of the recording are the files of the project on disk, and the 11 code screens show their files exactly. The 14 Python snippets of the lessons go through the Python parser, which checks syntax and nothing else. The 5 pytest tests of the project pass |
| Bug hunts run on the project | All 4 hunts run on a copy of the real project, each snippet next to its fix (the fix is the file as it ships): append with a lookback leaves 209 rows for 200 orders and merge 200, a join to the order lines gives 401 rows for 200 orders and fails two dbt tests with 134 and 335 rows, an incremental model with no key gives 12 rows for 6 after a rerun, and the first version of the gate fails 4 of 6 checks on a good backfill while the shipped one passes all 6 |
| Recapture (`verify_elt.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 53 items, 0 differ. Nothing is timed, so only one thing is allowed to differ: the date |
| Lab data (`project-elt/verify/check_widgets.js`) | 40 checks written in code that shares nothing with the lab or the project (`model.js`): the shop rebuilt from its rules, a simulation of the cursor with its lookback (200, 60, 35, 9 and 0 rows), what each layer holds after each run, the six lines of the gate, the daily mart, and the structure of the dbt run (22 nodes, 7 skipped) |
| Controls | 23 deliberately broken inputs, and each one is refused: Python with a syntax error (3), 14 changes to the recording that the widget checker must refuse (a load that wrote 61 rows, a failed run that passed 15 checks, a failed run where the gate ran, a snapshot with one version, a daily mart with one order too many, and nine more), and 6 changes to the lab code that the browser test must catch |

### What was not checked

- **A cloud warehouse, a deployed Airflow, an alert channel and a CI run did not run.** What the lessons say about them is tagged From documentation.
- **One version of each tool.** dlt 1.32.0, DuckDB 1.5.6, dbt 1.12.7, dbt-duckdb 1.11.1 and Airflow 3.4.0. Another version may print other texts or skip other nodes.
- **No timings and no costs.** The recording counts rows and checks. Nothing says how fast the pipeline is.
- **A pretend source.** It never failed, never limited the calls, never deleted an order and never asked for a secret.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| The shares of Python, SQL, Snowflake, Spark, Airflow and Kafka in postings | Search summaries of a posting analysis. The analyses measure different things and are directional | [Huntr](https://huntr.co/resume-skills/data-engineer) |
| `dbt build` skips the nodes downstream of a failed test | **Recorded** for this project: 7 nodes skipped. The general rule is from my memory of the dbt documentation, not looked up | none |
| A deployed Airflow adds a scheduler, workers, secrets backends, callbacks and a web interface | **From my memory of the Airflow documentation, not looked up** | none |
| `catchup=False` and `max_active_runs` behave as the lessons say | **From my memory, not looked up.** The runs used `airflow dags test`, which does not schedule | none |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Two diagrams: the platform (the step of the gate) and the failing test that fails closed (the step of the stale marts).
- The lab in its first state, on the failed run.
- The welcome screen, the code walkthrough of `shop_api.py` (the step of day 2), the replay of the failed run, the snapshot table, and the first card of the two-minute story.
- Coach Ari, who is in every one of those screens.

Looking found one fault that the tests could not see, and it is fixed: in the platform diagram the last two nodes (`Gate` and `Parquet`) sat against the right edge with almost no arrow between them. The nodes are narrower and spaced now. The tests found two more: the lab showed `NaN` for the backfill because the recorder had not stored the marts after it, and a title had backticks that showed as text. Every screen that is not listed here was checked by the tests above and was not looked at.

## Files

```
project-elt/
  index.html, css/project-elt.css  the page and its colours
  js/config.js                     the settings: Coach Ari, the paths, the levels
  js/graphs.js                     2 diagram specs
  js/widgets.js                    the run lab
  js/content/                      one file per mission, 00 to 04
  js/real.js                       the recording: files, texts, tables and counts written by capture_elt.py
  verify/eltlib.py                 helpers of the recorder: a temporary copy of the project, its three tools, and the parsers of the logs of Airflow, dlt and dbt
  verify/capture_elt.py            runs the project and writes js/real.js
  verify/verify_elt.py             parses the code, runs the pytest tests and the four bug hunts on the project, compares a new recording with js/real.js, runs the controls
  verify/model.js                  an independent model of the shop and of the load with a cursor and a lookback
  verify/check_widgets.js          recomputes the numbers of the recording with the model
  verify/e2e_labs.js               drives the run lab in Chromium
  verify/dump_elt.js               lists the code, the commands and the strings of the walkthrough for verify_elt.py
  verify/requirements.txt          what the machine needs
  verify/INTEGRATION.md            what the hub page, the root README and package.json needed
projects/brewline-elt/             the repository that the walkthrough describes (README, Makefile, ingestion, dbt, orchestration, quality, tests)
```

## Run the checks

```bash
python3 -m venv ing-env && ing-env/bin/pip install "dlt[duckdb]"
python3 -m venv dbt-env && dbt-env/bin/pip install dbt-duckdb pytest
python3 -m venv af-env && af-env/bin/pip install "apache-airflow==3.4.0"
export ELT_INGEST_PY=$PWD/ing-env/bin/python ELT_DBT=$PWD/dbt-env/bin/dbt ELT_AIRFLOW=$PWD/af-env/bin/airflow ELT_TEST_PY=$PWD/dbt-env/bin/python
python3 project-elt/verify/verify_elt.py                        # parse the code, run pytest and the bug hunts, lab data, controls
python3 project-elt/verify/verify_elt.py --recapture --browser  # also record everything again and compare, and drive the lab (needs Playwright)
python3 project-elt/verify/capture_elt.py                       # write a new project-elt/js/real.js
node dev/lint-content.js project-elt && node dev/e2e.js project-elt
node dev/smoke.js project-elt --path all
node project-elt/verify/check_widgets.js && node project-elt/verify/e2e_labs.js
```
