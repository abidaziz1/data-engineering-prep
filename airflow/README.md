# Apache Airflow for data engineers: from a first DAG to a pipeline you can operate

A guided, press-Next course for data engineers. Coach Juno follows **Brewline**, an online coffee retailer, as it moves its nightly jobs from cron to Apache Airflow. You see how a DAG file becomes a run, why a run for 14 March starts on 15 March, what catchup does on the day you switch a DAG on, which loads make a duplicate when you run them twice, how a retry waits, which trigger rule starts a cleanup, what a sensor costs a pool, how to test a DAG in a pull request, and what changes when you move from Airflow 2 to Airflow 3.4.

Open **`index.html`** in a browser. No install, no account.

## What is recorded and what is not

Nothing in this course ran on a managed service or on a cluster. Two kinds of screens carry a tag, so you always know which kind you are reading.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output of **Apache Airflow 3.4.0** (Task SDK 1.4.0) on one machine with Python 3.12.3. The API server, the scheduler, the DAG processor and the triggerer ran together with the LocalExecutor and a SQLite metadata database. The recorder also ran `airflow dags test`, the command line, pytest 9.2.0 and ruff 0.17.4 on the Brewline DAGs. It saved 57 files, 23 command outputs and logs, 14 result tables and 46 sets of counts. The dates in the recording are fixed in March 2026, because Airflow adds a retry jitter that is a hash of the DAG id, the task id, the logical date and the try number: with a fixed date the recording can be made again and the retry lab can reproduce each delay. |
| **From documentation** | Everything that Airflow did not do here: the Celery and Kubernetes executors, more than one scheduler, PostgreSQL and MySQL, secrets backends, Git DAG bundles and deploys, managed services (Amazon MWAA, Google Cloud Composer, Astronomer), the upgrade from Airflow 2, DAGs in languages other than Python, and defaults and limits that no lesson shows from a run. The facts come from the Airflow documentation and release notes as they were found while this was built (see "What was not checked"). |

114 screens carry the first tag and 60 carry the second. The other screens are quizzes, bug hunts, ordering games, decisions, incident drills and interview questions, which ask about those facts.

Three labs are not measurements. The **retry lab** applies the formula of the 3.4.0 source (the SHA-1 jitter included) and was checked against Airflow's own function for 27 settings and five failed tries each. The **capacity lab** is a model of the pool, the DAG limit and the executor limit, checked against three recorded runs. The **parse lab** is arithmetic on the recorded import times. Each says so on screen.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 527 | about 4.5 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 832 | about 8 hours | Everything in Junior, plus design, capacity, security, operation and upgrade decisions |
| **Everything** | 908 | about 9 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step (279, 495 and 535 minutes by `node dev/stats.js airflow`), and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map: what Airflow is, and what it is not | 14 min | 25 min | 28 min |
| 2 | DAGs and tasks: your first pipeline | 25 min | 35 min | 36 min |
| 3 | Time: schedules, logical dates and data intervals | 24 min | 40 min | 40 min |
| 4 | Idempotent and incremental loads | 17 min | 31 min | 32 min |
| 5 | Passing data: XCom, mapping and assets | 24 min | 39 min | 44 min |
| 6 | When things fail: retries, trigger rules and deadlines | 25 min | 40 min | 44 min |
| 7 | Waiting: sensors, deferral and the triggerer | 15 min | 26 min | 30 min |
| 8 | Capacity: pools, limits and executors | 19 min | 30 min | 33 min |
| 9 | Connections, secrets and providers | 17 min | 29 min | 33 min |
| 10 | Testing DAGs and CI | 18 min | 32 min | 33 min |
| 11 | Operating Airflow, and upgrading to 3 | 12 min | 26 min | 30 min |
| 12 | Deploying: bundles, images and managed services | 18 min | 32 min | 33 min |
| 13 | Patterns and anti-patterns | 17 min | 30 min | 34 min |
| 14 | Boss round and cheat sheet | 27 min | 72 min | 77 min |

A short start screen comes before mission 1: the Brewline job as a DAG, the three levels, the setup you will see, and the versions.

## What you work through

- **Follow the Brewline nightly job.** A cron line runs a script at 02:00. You write it as a DAG of three tasks, read how Airflow turns the file into a run, work out which data interval a run reads, count the runs that catchup makes, run the same load again and watch which versions duplicate the orders, map one task over five stores, retry a failing call with a backoff, wait for a partner file with three kinds of sensor, share two slots between four sensors, find where a password lives, test the DAG with pytest, and move the DAG files from a folder to a Git bundle.
- **8 animated diagrams, shown in 9 walkthroughs.** The nightly DAG, the parts of Airflow 3 and how a DAG file becomes a run, data intervals, mapped tasks, assets, a deferred task, the checks of a pull request, and how a change reaches production.
- **23 terminal replays of real output.** The four processes starting, `airflow dags test`, rendered templates, four DAG files that do not import, what a task sees in a scheduled and in a manual run, a dry-run backfill and its refusal, three tries and their logs, a timeout, the pools of the recording, `airflow tasks failed-deps`, the log of a task that reads a connection, the connection list and the Airflow 3 error, pytest on a good project and on one with three mistakes, ruff with the Airflow rules, the health endpoint, the command line at a glance, `airflow db clean` as a dry run, the DAG processor announcing its bundle, and what the verifier saw in the three coding rounds.
- **13 labs.** Read a cron expression and its next five fires. Compare the logical date, data interval and run time of two timetables. Count the runs that catchup makes, then compare three backfill behaviors. See what happens on the days the clock changes. Run the same load three ways and watch the table. Map over lists of 0 to 1,100 items and store values of 1 KB to 10 MB. Land files and see which updates start which consumer. Compute a retry schedule with a backoff and a cap. Try 13 trigger rules on 10 mixes of three parents. Share two slots between four sensors in three modes. Change a pool and a DAG limit. Find the reason that a task does not run. See what slow code at the top of a file costs.
- **30 code walkthroughs.** Line-by-line explanations of the DAGs, the tests and the configuration of the course, with the recorded output beside the code where there is one.
- **3 coding rounds.** Write a DAG for the revenue of each store that is safe to rerun and has tests, fix a DAG that has six mistakes, and find why a task of a healthy DAG never starts. The verifier runs the model solution with its tests (5 pass) and runs the fixed DAG twice (the same table both times), and the recording keeps what `airflow tasks failed-deps` printed for round 3.
- **99 quizzes, 30 bug hunts, 13 ordering games, 14 architecture decisions with a recommended answer, and 15 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **68 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The boss round asks 22 of them in a row and scores you.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 15 chapters, 436 screens: 251 for everyone, 160 for Senior, 25 extra |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No console errors, no failed requests, no horizontal overflow, no stray `undefined` or `NaN`, and no text below 15 px. Walked 527, 832 and 908 frames on the three paths |
| The same walk at phone width (390 by 844 px), Everything path | No console errors, no failed requests, no horizontal overflow and no stray text in 908 frames. The script flags text under 15 px, and at this width that is the interface of the page (the step counter, the tags, table cells, state pills and the copy button, from 14.0 to 14.8 px) and the labels inside diagrams, which scale down to between 9.4 and 12.4 px. Nothing outside a diagram is under 14.0 px |
| Interaction test (`node dev/e2e.js airflow`): every quiz, bug hunt, ordering game, decision, incident, interview question, terminal and boss question, plus keys, text size, Map, paths, saving and reset | 1,581 checks passed |
| The 13 labs driven in the browser (`airflow/verify/e2e_labs.js`): every chip and button, compared with what Airflow recorded and with values worked out by hand (the next fires of 17 cron expressions found minute by minute, the runs of six timetables, 32 settings of the catchup lab, the table of three load strategies after four runs, 162 settings of the retry lab, 130 trigger-rule cells, the waves of 15 pool settings, 27 parse settings). The same file checks that no step shows raw markup, `undefined` or `NaN` | 2,235 checks passed |
| Recorded output (`airflow/verify/capture_af.py`) | 57 files, 23 texts, 14 tables and 46 sets of counts: stack start-up, DAG runs and states, schedules and timetables, catchup and backfill, loads and incremental windows, mapping and its edge cases, trigger rules, retries and backoff, sensors in three modes, pools, assets, task loops, the watcher pattern, parse timings, the health endpoint, metadata tables, configuration, imports, test runs and lint runs. The whole recording was made again from scratch six times while this was built, and the last one is compared with `js/real.js` by `--recapture`. The first comparison found 42 differences. Two were faults of the recorder (the run that tests secrets shared a database with the stack before it, and a backfill read its try numbers before they had changed), and `js/real.js` was recorded again with both fixed. The rest are differences between any two recordings, and the comparison states each one: the order of log lines and of tasks that start in the same second, clock values, timings and samples (with tolerances), the row counts of the metadata database (within 3), and two steps that the recorder repeats when Airflow refuses or when a poll misses a wait (the backoff DAG, run again on the next day, and a second backfill that waits for the first). For those two the comparison checks the claim of the lesson in the new recording (the waits equal the formula, and a `completed` backfill gives every task another try) and not the repeated numbers. The sensor section is an exception (see "What was not checked") |
| Code in the lessons (`airflow/verify/verify_af.py`) | 85 pieces of Python parse. 86 Airflow import statements run in Airflow 3.4.0, and the keyword arguments of 85 snippets are checked against the installed signatures (`schedule_interval` and `days_ago` fail where the lessons say they fail). 72 DAG files import, seven broken ones with the error that the lesson quotes, and 84 files pass ruff with the Airflow rules. 14 DAG runs repeat with the recorded states and outputs, 50 trigger-rule cells (5 rules on 10 mixes) and 27 retry settings are asked again, and three pytest projects give 6 passed, 3 failed with 3 passed, and 5 passed. The 10 fixes of bug hunts that were run do what the lesson says. 15 commands of the course and their options are found in the help, and the URL of the constraints file answers |
| Lab logic (`airflow/verify/check_widgets.js`) | 403 checks. The cron evaluator against 36 expressions that Airflow's own timetable returned, six timetables and 18 manual runs, three backfill behaviors, four runs of three load strategies, 130 trigger-rule cells, a SHA-1 against the system one, 27 retry settings against Airflow's own function, sensor facts against the samples, pool waves against the recorded start times, asset events against the recorded runs, and 45 daylight-saving times against the system time zone database |
| Controls | 19 deliberately broken inputs are fed to the checkers, and the verifier fails if one is accepted: Python with a syntax error, a removed argument, a removed import, a trigger rule that does not exist, an argument that `@dag` does not have, a DAG with a cycle, a duplicate task id, a missing module, an Airflow 2 DAG under ruff, five changes to the recording that the widget checker must fail (a trigger-rule cell, a timetable run, a catch-up count, a retry delay and a cell of the retry grid), four changes to the widget code that the lab test must fail (a date without its zero, a division that became a product, a key that does not exist, a backoff exponent that is off by one), and a changed recording that the recapture comparison must report. The last one runs only with `--recapture`, so a plain run prints 18 of the 19 and, with the one check that the widget checker passes on the unchanged recording, reports 19 controls. With `--recapture` it reports 20 |

### What was not checked

- **No managed service, no cluster.** The Celery and Kubernetes executors, more than one scheduler, PostgreSQL and MySQL, secrets backends, the Git DAG bundle, deploys, Amazon MWAA, Google Cloud Composer and Astronomer are described from documentation. Only the LocalExecutor ran.
- **The upgrade from Airflow 2 was not run.** It needs an Airflow 2 installation and its database. What was run is the check that finds the old code: ruff with the Airflow rules found 8 problems in a DAG written for Airflow 2, and Airflow 3.4.0 refused four DAG files for the reasons that the lessons quote.
- **The Airflow documentation website could not be opened** while this was built, because the build environment blocked the host. The documentation pages named in the lessons (34 of them) were read as source files from the Apache Airflow repository, and the newest version marker in them is 3.4.0. The release notes were read the same way. The pages of Amazon MWAA, Google Cloud Composer and Astronomer were read only as search summaries. Read the page before you rely on a detail. The table below lists what to read.
- **Timings belong to this machine.** The lessons teach with counts, states and orders, and where a time appears (a retry delay, a sensor that holds a slot for 28.5 seconds, a parse of about 1 millisecond) it is one recording on one machine and says so. The scheduler of a busy installation behaves differently. The slot seconds of the sensor lab are counted from samples taken twice a second, and they vary between recordings: in four recordings poke gave 28 to 28.5, reschedule 1 to 5 and deferrable 0 to 2. The sensor section of `js/real.js` is the first of those recordings, and the rest of the file comes from the last complete recording. `--recapture` accepts a wide tolerance on these samples and none on the states and counts.
- **Only Python 3.12 was used.** Airflow 3.4.0 runs on other versions, and the lessons quote the supported range from the documentation.
- **DAGs in other languages and the DAG importer framework were not run.** They are experimental in 3.4.0, and the course says so.
- **Not every fix of a bug hunt was run.** 26 of the 28 Python fixes are complete DAG files, and they all import and pass ruff with the Airflow rules (the other two are a test file and an excerpt). 10 fixes were run to confirm what the lesson says (a retry that stops, a join that is skipped, a missing alert, the same table after two runs). The others change code that has no visible effect by itself.
- **Three labs are models** (see above). The cron lab uses an evaluator written for the lab, and it agrees with Airflow on every one of 36 expressions.
- **Screens reviewed by eye were a handful.** See the next section. The walks check errors, overflow and text size by script. They do not judge how every frame looks.

### Screens reviewed by eye

These are the only screens that someone looked at and judged, at 1280 by 800 px unless stated: the parts of Airflow 3 diagram at step 3; all 13 labs (interval, cron, catchup, time zones, idempotency, mapping, assets, retry, trigger rules, sensors, capacity, why a task does not run, parse cost); the model DAG of coding round 1 and the bug hunt of coding round 2; the coach after a wrong answer (worried face and "Not quite") and after a right one (cheering face and sparkles); and, at 390 by 844 px, the retry lab and the model DAG of round 1. Looking found four faults that the scripts had not found: dates that broke in the middle of the date in the interval lab, mapped task names that broke inside a word, backticks that showed as text in the parse lab, and a callout in the parse lab that started a sentence with a lowercase word. All four are fixed. The third led to a check in the lab test that fails on raw markup, `undefined` or `NaN` in any step of any lab, and that check found the same fault in five other labs.

## Re-check before you rely on these

These claims are the most likely to be out of date, or rest on release notes, source files of the documentation or search summaries. Each one carries a "From documentation" tag in the lesson, except where it says otherwise.

| Claim in the course | Where | What to read |
| --- | --- | --- |
| Airflow 3.4.0 was released on 6 November 2026, with Task SDK 1.4.0. A search on 13 November found no 3.4.1 | Missions 0, 1 and 11 | [Release notes of 3.4.0](https://airflow.apache.org/docs/apache-airflow/3.4.0/release_notes.html) and [the 3.4.0 blog post](https://airflow.apache.org/blog/airflow-3.4.0/). The version table of the course was recorded from the installed packages |
| New in 3.4.0: task loops with `.loop()` and a required `max_iterations`, a draining state for DAGs, a pluggable DAG importer, DAGs written in TypeScript, Go, Java or YAML (experimental), a new XCom table (`xcom_v2`) that makes a downgrade harder, psycopg 3 as the PostgreSQL driver | Missions 1, 5, 11 and 12 | The release notes above, and the pages on [loops](https://airflow.apache.org/docs/apache-airflow/3.4.0/authoring-and-scheduling/loops.html) and [DAG importers](https://airflow.apache.org/docs/apache-airflow/3.4.0/administration-and-deployment/dag-importers.html). Task loops and the watcher pattern were also recorded |
| Python 3.11 or newer for 3.4, and Python 3.10 reaches its end of life in October 2026 | Mission 11 | The release notes of 3.4.0 (the entry on Python 3.10) and the [Python status page](https://devguide.python.org/versions/) |
| More than one scheduler: PostgreSQL 12 or later and MySQL 8.0 or later are listed as ready, and MariaDB is not | Mission 11 | The scheduler page, section [running more than one scheduler](https://airflow.apache.org/docs/apache-airflow/3.4.0/administration-and-deployment/scheduler.html) |
| Executors: Local is the default, the executor logic runs inside the scheduler process, and the Celery and Kubernetes executors behave as the lessons describe | Mission 8 | [Executor](https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/executor/index.html) and the pages of the Celery and Kubernetes provider packages. Neither executor was run |
| `all_done_min_one_success`: the documentation says that all non-skipped parents are done and one succeeded. The recorded run left a child skipped when two parents succeeded and one was skipped, and the lab shows the recorded state | Mission 6 | [Trigger rules](https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/dags.html). The mismatch is a finding of the recording, and a fix of the documentation or of the code may follow |
| Single-asset schedules and OR expressions create one run for each event in 3.4, and `batch_asset_events` brings batching back | Missions 5 and 11 | The release notes of 3.4.0 and the page on [asset scheduling](https://airflow.apache.org/docs/apache-airflow/3.4.0/authoring-and-scheduling/asset-scheduling.html). The first behavior was recorded for one consumer and for two assets |
| DAG bundles: the local bundle has no versioning and tasks run the latest files on disk, the Git bundle records the commit of each run, and one setting is required for a Git bundle | Mission 12 | [DAG bundles](https://airflow.apache.org/docs/apache-airflow/3.4.0/administration-and-deployment/dag-bundles.html) and the page of the Git provider package. The Git bundle was not run |
| The draining state stops new scheduled runs while the running ones finish, and gives a safe window for a deploy | Mission 12 | The release notes of 3.4.0 (the entry on draining). Not run |
| Upgrade from Airflow 2: imports move to `airflow.sdk`, `schedule_interval`, `days_ago` and `Dataset` are gone, back up the database first, and read the release notes | Missions 1 and 11 | [Upgrading to Airflow 3](https://airflow.apache.org/docs/apache-airflow/3.4.0/installation/upgrading_to_airflow3.html). The old-style code was recorded, and ruff found 8 problems in it |
| Amazon MWAA lists Airflow 3.3.1 (announced 1 September 2026), Astro Runtime 3.3-2 was the newest Runtime found, and the Google service that was Cloud Composer (renamed Managed Service for Apache Airflow in 2026) mentioned 3.2.2 for its generation 3. None listed 3.4.0 on 13 November 2026, a week after its release | Mission 12 | [MWAA announcement](https://aws.amazon.com/about-aws/whats-new/2026/09/amazon-mwaa-apache-airflow-3-3-1/), [Astro Runtime release notes](https://www.astronomer.io/docs/runtime/runtime-release-notes) and the [Google release notes](https://cloud.google.com/composer/docs/release-notes). These pages were read as search summaries only, and version lists change within weeks |
| An XCom object storage backend, the Fernet key, and secrets backends | Missions 5 and 9 | [XComs](https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/xcoms.html) and the [secrets pages](https://airflow.apache.org/docs/apache-airflow/3.4.0/security/secrets/index.html). Not run. The lookup order of connections (environment variable before the database) was recorded |
| Best practices: no slow code and no `Variable.get` at the top level of a file, three ways to keep dependencies apart, three ways to generate DAGs, and the watcher pattern for a cleanup task | Missions 12 and 13 | [Best practices](https://airflow.apache.org/docs/apache-airflow/3.4.0/best-practices.html). The cost of top-level code was recorded for one machine, and the watcher pattern was recorded |
| The constraints file for 3.4.0 and Python 3.12 pins 724 packages, and the installed provider versions are the ones in the constraints | Missions 0 and 10 | [Constraints files](https://raw.githubusercontent.com/apache/airflow/constraints-3.4.0/constraints-3.12.txt). `verify_af.py` checks that the URL answers |
| Job postings and interview-prep pages quoted in the table below | Mission 0 and the interview questions | The links in that table. They are search summaries and aggregator pages, a small sample, and they change weekly |

## What job descriptions ask for, and where this course covers it

I read a small sample of Airflow data engineer postings through search on 12 November 2026: eight queries covering the United States, the United Kingdom, Singapore and India, junior and senior roles, managed Airflow, Airflow 3 migration, and interview preparation. I read the search summaries and not every posting. It is a **small sample of search results, so treat it as a direction and not as a statistic.**

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Production Airflow experience, in nearly every posting. A few ask for Airflow 3.x or later, and an aggregator page says that most listings still want 2.x with 3.x preferred | 1, 3, 11 | **Recorded** with Airflow 3.4.0. A mission on what changed from Airflow 2 to Airflow 3 and how to upgrade is **from documentation** |
| DAG authoring: dynamic DAGs, dependencies, idempotent tasks, `@task` and dynamic task mapping | 2, 4, 5, 13 | **Recorded** DAG runs, mapped tasks with their edge cases (an empty list, a list over the limit), loads that repeat safely, incremental windows with a late row. The guide to generated DAGs is **from documentation** |
| Python and SQL for DAGs and ETL | all | Python throughout, and SQL in the SQLite loads, upserts and checks |
| Monitoring, alerting, retries, failure handling, troubleshooting | 6, 8, 11, 13 | **Recorded**: retries with a delay and a backoff, 13 trigger rules on 10 mixes of parents, callbacks, a timeout, a deadline alert, a dead worker, the reason a task does not start, and the watcher pattern |
| SLAs and late runs | 6 | A **recorded** deadline alert that calls a function when a run is late |
| CI/CD and Git for DAGs | 10, 12 | **Recorded**: pytest on a good project and on one with three mistakes, an import test, ruff with the Airflow rules. The Git bundle and a pipeline are **from documentation** |
| Managed Airflow (MWAA, Cloud Composer, Astronomer) | 12 | **From documentation**: a comparison, a decision and the versions that were listed on 13 November 2026 |
| Sensors, deferrable operators, pools and executors | 7, 8 | **Recorded**: four sensors in three modes sharing two slots, pools, a DAG limit, priority. The Celery and Kubernetes executors are **from documentation** |
| Connections, hooks, secrets and providers | 9 | **Recorded**: the lookup order of a connection, a hook in a task, what a log shows. Secrets backends are **from documentation** |
| Airflow 3 topics in interview-prep pages: assets, the Task SDK, DAG versioning, scheduler-managed backfills, deadline alerts | 1, 3, 5, 6, 11, 12 | **Recorded** assets, backfills and a deadline alert, and the version a DAG run records. The rest is **from documentation** |
| Kubernetes, Snowflake, dbt, BigQuery, Databricks, Spark and Kafka next to Airflow | not here | See the other tutorials in this repository. Custom operators written from scratch and the alternatives to Airflow are not covered either |

The searches returned these pages, among others: [a remote data engineer contract that asks for Airflow 3.x](https://www.dice.com/job-detail/73f33556-fc1f-4956-bf7b-822545f113c5), [a data engineer posting that lists idempotent tasks and SLA management](https://careers-codev.icims.com/jobs/2719/data-engineer/job), [a senior posting with `@task` and dynamic task mapping](https://join.agileengine.com/open-positions/senior-data-engineer-psycho-bunny-id82548/), [an aggregator page on Airflow job listings](https://datadriven.io/airflow-data-engineer-jobs), [a Singapore senior posting](https://groupcareers.singtel.com/job/Senior-Data-Engineer-Sing/1366609366/), [a Bangalore posting](https://builtinbengaluru.in/job/data-engineer/8173790), [a junior posting](https://aijobs.net/job/data-engineer-i-bengaluru-karnataka-india-11035), and interview-preparation pages [one](https://hyring.com/jobseeker-toolkit/interview-questions/technical/airflow), [two](https://www.cloudsoftsol.com/blog/airflow-interview-questions/) and [three](https://prachub.com/resources/airflow-interview-questions-for-data-engineers-dags-scheduling-backfills-and-failures). Several postings that say "junior" ask for two or more years of experience.

## Run it yourself

The course never connects to a service, but the code behind the recording runs on a laptop. Airflow 3.4.0 needs its own Python 3.12 environment, installed with the official constraints file.

```bash
python3.12 -m venv .venv-airflow
.venv-airflow/bin/pip install "apache-airflow==3.4.0" pytest==9.2.0 ruff==0.17.4 \
  --constraint https://raw.githubusercontent.com/apache/airflow/constraints-3.4.0/constraints-3.12.txt
AF_PYTHON=$PWD/.venv-airflow/bin/python python3 airflow/verify/capture_af.py
AF_PYTHON=$PWD/.venv-airflow/bin/python python3 airflow/verify/verify_af.py
node airflow/verify/check_widgets.js
node airflow/verify/e2e_labs.js
```

`capture_af.py` starts the real API server, scheduler, DAG processor and triggerer, runs every scenario of the course, and rewrites `airflow/js/real.js`. Run subsets with `--only name,name --out file`. `verify_af.py` took 8 minutes 12 seconds on the last run, most of it the lab tests in the browser and the DAG runs. With `--recapture` it also records everything again and compares the result with `js/real.js`, apart from ids, process numbers, clock values and timings, which are compared with the tolerances written in the script. The recording takes about 21 minutes (1,270 seconds on the last run) and the whole run about 30. Add `--reuse` to compare the recording kept from the last `--recapture`. `--offline` skips the check of the constraints URL, `--no-run` skips every run of Airflow, pytest and the command line, `--no-browser` skips the lab tests and their controls, and `--full` asks for all 36 cron expressions and all 13 trigger rules again.

`airflow/verify/dags/` holds the DAGs of the lessons, `dags_broken/` the files that must fail, `project/` and `project_broken/` the pytest projects of mission 10, `project_round/` the model solution of round 1, and `rounds/` the DAG of round 2 and its fix.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `LAB.get`, which reads `js/real.js` and fails when a key is missing.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only. Every scene that shows a fact has a source `src`: `rec` or `docs`.
- **Replace the story.** The interview answers use general examples and the numbers of the Brewline data. Wherever a screen carries a "Make it yours" prompt, swap in a real story with real numbers.
- **Update the recording.** After an upgrade of Airflow, run `capture_af.py`, then the lint. A lesson that quotes a number that changed fails loudly. A time that varies from run to run (a sensor, a parse) is compared with a tolerance by `--recapture`.

## Files

```text
index.html               the page
css/airflow.css          styles for the labs and the task grids
js/config.js             title, paths, welcome text, map chips
js/real.js               everything recorded: files, texts, tables, counts
js/helpers.js            LAB.get: reads real.js and fails when a key is missing
js/graphs.js             eight diagrams, plain data
js/widgets.js            labs: cron, interval, catchup, idem, fanout, trigger rules
js/widgets2.js           labs: retry, sensors, capacity, why idle, assets, parse, time zones
js/content/              00-start.js to 14-boss.js, one file per mission
verify/capture_af.py     starts Airflow, runs every scenario, runs pytest and ruff, and writes js/real.js
verify/af_probe.py       the small runs that verify_af.py repeats: dags test, loads, timetables, retry grid
verify/af_check.py       runs the import statements of the lessons and checks keyword arguments against the installed signatures
verify/verify_af.py      checks snippets, DAG files, runs, commands, controls and, with --recapture, the recording
verify/check_widgets.js  checks the labs against the recording and against arithmetic
verify/e2e_labs.js       drives the 13 labs in a browser against the recording and hand-worked values
verify/INTEGRATION.md    the pieces for the hub page, the root README and package.json
verify/dags/             the DAGs of the lessons, as recorded
verify/dags_broken/      DAG files that must fail, with the errors the lessons quote
verify/project/          the pytest project of mission 10, and project_broken/ with three mistakes
verify/project_round/    the model solution of coding round 1, with its tests
verify/rounds/           the DAG of coding round 2 and its fix
verify/gen/              the generator of the 13 trigger-rule DAGs
```
