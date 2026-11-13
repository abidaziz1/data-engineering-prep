# Python for data engineers: from a script to a pipeline you can trust

A guided, press-Next course for data engineers. Coach Lena follows **Brewline**, an online coffee retailer, as its Python jobs grow from one script into a pipeline that someone else can run, test and trust. You pin an environment, count what a list, a set and a dict cost, stream a file that does not fit in memory, read CSV, JSON Lines and Parquet, convert times and money without losing a cent, retry a failing call, load a day so that a rerun changes nothing, page through an API that changes while you read it, join frames without multiplying rows, choose threads or processes, validate rows and set bad ones aside, test the rules, give the job a command line, settings and secrets, and split a tangled script into a core you can test and a shell that touches the world.

Open **`index.html`** in a browser. No install, no account.

## What is recorded and what is not

Two kinds of screens carry a tag, so you always know which kind you are reading.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output of **Python 3.14.6** (and its free-threaded build) and of pandas 3.1.1, Polars 2.1.0, DuckDB 2.0.0, pyarrow 26.0.1, SQLAlchemy 2.1.8, pydantic 2.14.3, mypy 2.4.1, ruff 0.17.4, pytest 9.2.0 with pytest-cov and Hypothesis, requests, httpx, tenacity, typer, psutil and **uv 0.11.32**, run on one Linux machine with made-up Brewline data. The partner API is a small fake server that runs in a thread on the same machine, and SQLite is the database. Every output you see in a terminal screen is a recording, and a check fails when a lesson quotes a number that the recording no longer has. |
| **From documentation** | Everything that was not run here: how GitHub runs a workflow, Docker, Kubernetes, Great Expectations, schedulers, the cloud, pip, Poetry and conda next to uv, the HTTP rules, the Python release cycle. The facts come from the documentation and from search summaries of it, as found while this was built. The table at the end of this file lists the claims to re-check. |

Some labs go beyond the recording, and each one says so on screen. The structures lab and the file-size lab multiply recorded sizes to estimate larger inputs. The retry lab is a **simulation** of fifty clients and a server that serves ten requests a second, with a fixed schedule, and it does not measure any real service. The concurrency lab uses a sleep of 0.25 seconds where a real job would wait for the network.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 868 | about 8.3 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 1,143 | about 11.9 hours | Everything in Junior, plus design, speed, validation and release decisions |
| **Everything** | 1,165 | about 12.2 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map: Python in a data platform | 28 min | 37 min | 37 min |
| 2 | Environments and packaging | 23 min | 33 min | 37 min |
| 3 | Data structures and what they cost | 30 min | 41 min | 41 min |
| 4 | Iterators and generators | 29 min | 39 min | 42 min |
| 5 | Files and formats | 34 min | 46 min | 49 min |
| 6 | Dates, time zones and money | 34 min | 45 min | 48 min |
| 7 | Errors, retries and idempotency | 41 min | 66 min | 66 min |
| 8 | APIs and databases | 38 min | 53 min | 53 min |
| 9 | pandas, Polars and DuckDB | 27 min | 41 min | 41 min |
| 10 | Speed and memory | 27 min | 40 min | 42 min |
| 11 | Types, validation and data contracts | 30 min | 44 min | 44 min |
| 12 | Tests and quality | 34 min | 45 min | 45 min |
| 13 | Shipping: CLIs, config, secrets and CI | 32 min | 43 min | 43 min |
| 14 | Design: pipelines as code | 28 min | 41 min | 41 min |
| 15 | Boss round and cheat sheet | 55 min | 93 min | 97 min |

A short mission 0 sets up the course: the map, the levels, the Brewline setup and how the screens work.

Mission 15 has a coding round that builds a whole small pipeline, three incident drills that mix topics, a design decision, a mock interview of up to 39 questions drawn from the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet.

## What you work through

- **Follow the Brewline orders.** A nightly export, a partner API and supplier files bring orders into the platform. Each mission takes one problem that breaks a real pipeline, shows it failing in a recording, and fixes it.
- **9 animated diagrams.** The whole platform, an environment and its lock file, a generator pipeline, a retry loop, a paged extract, threads and processes with the GIL, validation at the boundary, what CI runs on every change, and a pure core inside a thin shell.
- **62 terminal replays of real output.** Programs, `uv` commands, pytest passing and failing, mypy and ruff findings, and tracebacks, as they were printed.
- **17 labs.** Read which real releases a version specifier allows. Count what a lookup costs in a list, a set and a dict. See how much memory 200,000 records take in ten structures. Step through a list pipeline and a generator pipeline. Compare the memory of a whole file with a stream. Compare the size and the query time of seven file formats. Save text in one encoding and read it in another. Probe the clock-change cases of a time zone. Add up money with floats and with Decimal. Watch fifty clients retry under four policies. Run a load twice, or kill it half way, in five writing styles. Page through an API while its data changes. Join with and without duplicate keys. Run waiting and computing jobs with threads, processes and the free-threaded build. Validate rows with a lax model, a strict model and a model that forbids extra columns. Count the changes that a weak and a strong test suite catch. Switch the layers of a configuration on and off.
- **66 code walkthroughs.** Line-by-line explanations of Python, SQL, `pyproject.toml`, a workflow file and shell commands, with the real output beside the code where there is one.
- **22 coding rounds.** Keep the newest record for each order, find the biggest orders for each store, flatten nested JSON, group events into sessions, parse log lines, write partitioned files, convert timestamps to one UTC format, count orders per local day, load a day safely, write a retry that tests can run, read every page of an API, write in batches, join without multiplying rows, keep the latest row of a history table, run many slow calls at once, split good rows from bad ones, detect schema drift, read a money amount, layer settings, pull logic out of a script, write a step runner, and run one day end to end. Each has a starter, hints, a model answer and the recorded run of the tests.
- **73 quizzes, 27 bug hunts, 8 ordering games, 15 architecture decisions with a recommended answer, and 17 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **79 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## What job descriptions ask for, and where this course covers it

This table comes from **eight searches for public data engineer job postings** on 2026-11-12. It reads search summaries, not full postings, and it leans toward the listings that search engines return, with many from India, Singapore, the UK and Europe. It is a small sample and shows a direction. It does not count anything.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Python and SQL as a pair, in every search. Years of experience from 3 to 10 | Missions 1, 8 and 9 | Python is the subject. SQL appears where Python talks to a database and where DuckDB and SQLite run queries (missions 8 and 9). SQL depth (window functions, CTEs, tuning) belongs to the SQL tutorial |
| pandas and NumPy, named in most postings. Polars and DuckDB mostly as "nice to have" | Mission 9 | One question in pandas, Polars and DuckDB: missing values, grouping that drops a key, join fan-out, memory and the query plan |
| Python scripts that pull REST APIs, handle JSON, load a warehouse, with logging, monitoring and error handling (junior roles) | Missions 7, 8 and 12 | Timeouts, retries with backoff and jitter, `429` and `Retry-After`, pages and cursors, idempotent loads, logs and exit codes, all run against a fake partner API |
| Clean, testable code and code review | Missions 12 and 14 | A pure core with a thin shell, tests that need no fixtures, and a test suite that is checked by mutation |
| Testing: pytest, unit and integration tests. Great Expectations or dbt tests in one senior role | Missions 11 and 12 | pytest, coverage, mutation and property tests with Hypothesis, and validation at the boundary with pydantic. Great Expectations and dbt tests are named and not run |
| GitHub Actions as the most common CI. Docker and Git as common. Kubernetes as a bonus | Mission 13 | A package with a lock file and a workflow file that runs lint, types and tests. The workflow was checked against its schema and **not run**. Docker and Kubernetes are named and not run |
| Type hints, pydantic, mypy and ruff. Few postings name them | Missions 11, 12 and 13 | mypy found four errors in a small module, pydantic reported five for one bad row, and ruff runs in CI. They are in the course because they stop the failures that the other rows describe |
| Airflow, Dagster or another scheduler. PySpark and Databricks. Cloud storage and warehouses (S3, Glue, Lambda, Snowflake, BigQuery) | Missions 1, 13 and 14 | These sit outside a single-machine Python course. Missions 13 and 14 teach what any scheduler needs from a job: honest exit codes, settings from the environment and steps that can run again. The Airflow, Spark, Databricks, AWS and Snowflake tutorials teach the platforms themselves |
| Polars, DuckDB, uv, pandera and dlt in one posting | Missions 2, 5 and 9 | uv, Polars, DuckDB and Parquet are recorded. pandera and dlt are not covered |

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 16 chapters (mission 0 and 15 missions), 517 screens: 372 for everyone, 137 for Senior and 8 for Everything only |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors, no failed requests, no stray `undefined` or `NaN` text. Walked 868, 1,143 and 1,165 frames on the three paths |
| The same walk at phone width (390 px), Everything path | 1,165 frames, no horizontal overflow, no errors. Text outside diagrams stays at 14 px or larger. A diagram keeps a width of 620 px inside its card and scrolls sideways there, and its labels measure between 9 and 11.3 px |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset (`dev/e2e.js`) | 1,927 checks passed |
| All 17 labs driven in the browser (`verify/e2e_labs.js`) against values worked out by hand, or read from the recording where a timing changes with every recording | 206 checks passed |
| Recorded output (`verify/capture_py.py`) | 100 files, 104 outputs, 1 table and 26 sets of counts. The whole recording was made again from scratch, which took 3 min 43 s, and compared with `js/real.js`. All 100 files, 104 outputs and 26 sets of counts agree. Numbers must match within 2 %, except timings and a few sizes that vary from run to run. Those are compared within a factor of 1.1 to 5, depending on the measurement, and the timings that are printed inside output texts are masked |
| Code in the lessons (`verify/verify_py.py`) | 93 Python programs and 2 TOML files parse. The CI workflow is read as YAML, has the structure of a workflow, and matches the SchemaStore `github-workflow` schema. 21 programs that end in `tests passed` (21 of the 22 coding rounds) run again and print what was recorded. Two of them use a local server or real waiting, so only their last line is compared. The layered configuration round of mission 13 prints a table, and the config lab and the recapture check it |
| Lab logic (`verify/check_widgets.js`) | 510 checks in 17 groups. A second PEP 440 matcher agrees with the recorded matches, IEEE doubles and BigInt rounding agree with the money sums, the time zone cases agree with the browser's `Intl` database, the idempotency lab agrees with a model of five loading strategies on a SQLite table, the paging lab agrees with a model of the fake API, the mutation lab agrees with a port of the code under test and its seven changes, and the configuration merge agrees with a second implementation |
| Controls | 11 deliberately broken programs (a parser that accepts three decimals, a retry that retries every exception, a load that never rolls back, a limit that is checked after the write, a fetch that does not raise on a 404, a timestamp that is not converted to UTC, and five more) must fail their tests. 8 recordings changed on purpose must make the lab checker fail. The verifier fails if a control passes |
| Verifier | `verify_py.py` reports 68 checks passed in 11 to 27 seconds, depending on how busy the machine is. With `--recapture` it reports 273 checks passed |

### What was not checked

- **The GitHub workflow was not run.** It was parsed as YAML and compared with the SchemaStore workflow schema. The versions of `actions/checkout` and `astral-sh/setup-uv` come from release pages and search summaries.
- **The partner API is a fake.** It answers with real HTTP: pages, `429` with `Retry-After`, slow answers, data that changes between pages. It is not a real service, and real APIs differ in headers, limits and failure modes.
- **SQLite stands in for a database.** Its transaction and upsert rules are real. Other databases differ in locking, isolation and bulk loaders.
- **Timings are medians on a shared 4-core machine** that other programs were using. The lessons teach ratios and say "on this machine". In the first full recording, a process pool showed no speed-up because another program kept the cores busy. The speed mission was recorded again with heavier jobs, and it is still one machine on one day. Your numbers will differ.
- **The retry lab is a simulation**, and the concurrency lab uses sleeps for the network. Both say so on screen.
- **Everything ran on Linux.** macOS and Windows differ in default encodings, path names and the way processes start.
- **Time zone answers come from the operating system's database.** `zoneinfo` read the tz database of the machine (version 2026e). The `tzdata` package 2026.6 was installed too and gave the same answers for the cases in the lessons, and the recording says which database answered.
- **Versions move.** The course records Python 3.14.6, pandas 3.1.1 and uv 0.11.32. On the day of the last check PyPI listed ruff 0.17.5 and uv 0.13.8, and a search summary mentioned Python 3.14.7. Output that depends on a version, such as the pandas 2 and pandas 3 differences of mission 2 or the datetime error text of Python 3.13 and 3.14, can change.
- **The free-threaded build ran pure Python jobs.** The GIL lab says nothing about pandas, Polars or any library that has no wheel for it.
- **Docker, Kubernetes, Great Expectations, dbt, Airflow and the cloud services were not run.** They appear in comparisons and descriptions only.
- **Some documentation pages could not be opened** from the build machine (the pydevtools.com pages, for one). Claims that rest on them come from search summaries and are listed below.
- **The job description table is a small sample** of eight searches, read through search summaries.
- **Screenshots were reviewed for a handful of screens**: the welcome page, a coding round, the cheat sheet, the file formats lab and the encoding lab at desktop width, and the file formats lab and the platform diagram at phone width. The walks of all frames check errors, overflow and text size by script. They do not judge how every frame looks.

## Re-check before you rely on these

These claims are the most likely to be out of date, or rest on search summaries. Each one carries a "From documentation" tag in the lesson, or a note that says what was recorded.

| Claim in the course | Where | What to read |
| --- | --- | --- |
| pandas 3: the default string dtype is `str`, copy-on-write is always on, parsed timestamps get microsecond precision, and chained assignment gives a `ChainedAssignmentError` warning and changes nothing | Missions 2 and 9 | [pandas 3.0 release notes](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html). The differences were recorded by running one file on pandas 2.3.3 and on pandas 3.1.1. Search summaries of the release notes do not name `ChainedAssignmentError`, and the recording does |
| The free-threaded build is supported and optional, and many libraries ship separate wheels for it | Missions 2 and 10 | [PEP 779](https://peps.python.org/pep-0779/) and the [free-threading guide](https://docs.python.org/3/howto/free-threading-python.html). The numbers of the GIL lab were recorded |
| `compression.zstd` is in the standard library from Python 3.14 | Mission 5 | [PEP 784](https://peps.python.org/pep-0784/) and [compression.zstd](https://docs.python.org/3/library/compression.zstd.html). The documentation calls the module optional, because a build can lack the zstd library. It imported on the build used here |
| A new Python version ships every year and each one is supported for about five years | Mission 2 | [Status of Python versions](https://devguide.python.org/versions/) |
| `uv sync --locked` fails when the lock file is out of date, and `--frozen` does not check it. `uv lock`, `uv add` and `uv sync` messages | Missions 2 and 13 | [uv: locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/). The messages were recorded with uv 0.11.32, and PyPI lists 0.13.8 |
| The workflow uses `actions/checkout@v6` and `astral-sh/setup-uv@v8.1.0` | Mission 13 | [checkout releases](https://github.com/actions/checkout/releases) and [setup-uv releases](https://github.com/astral-sh/setup-uv/releases). A search summary lists setup-uv v8.2.0 as newer. The workflow was not run |
| Timeouts, `429` and `5xx` are worth a retry and other `4xx` are not. `Retry-After` is optional and holds seconds or an HTTP date. The lesson client reads the seconds form | Missions 7 and 8 | [RFC 9110, section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3) and [RFC 6585, section 4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) |
| A request without a timeout can wait forever | Missions 7 and 8 | [requests: timeouts](https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts). The timeouts against the slow answers of the fake API were recorded |
| tenacity: `wait_random_exponential` is full jitter. `wait_exponential_jitter(initial=...)` printed a deprecation warning with tenacity 9.2.1 | Mission 7 | [tenacity documentation](https://tenacity.readthedocs.io/en/latest/). The warning was seen while the lessons were written, and the lessons use `wait_random_exponential` |
| `INSERT ... ON CONFLICT DO UPDATE` is the SQLite upsert | Missions 1, 7 and 8 | [SQLite UPSERT](https://www.sqlite.org/lang_upsert.html). The statements were run in the SQLite of Python 3.14.6 |
| `zoneinfo` reads the operating system's database first and falls back to the `tzdata` package | Mission 6 | [zoneinfo](https://docs.python.org/3/library/zoneinfo.html) and [tzdata on PyPI](https://pypi.org/project/tzdata/). The recording shows which database answered |
| DuckDB 2.0 relations no longer have `fetchone()`, and the lessons use `fetchall()` | Missions 8, 9 and 15 | [DuckDB releases](https://github.com/duckdb/duckdb/releases). The error message was recorded as `m9.duckdb2` |
| What the common operations of a list, a set and a dict cost | Mission 3 | [Python time complexity](https://wiki.python.org/moin/TimeComplexity). The lookup lab counts comparisons and records timings |
| Snappy is fast and compresses less, zstd gives smaller files with a level, and a gzip file cannot be split for parallel reading | Mission 5 | The Apache Parquet and Python compression documentation. The sizes and query times of the seven formats were recorded |

## Run it yourself

The course never connects to a service, and the code behind the recording runs on a laptop with Python 3.14, uv and access to PyPI.

```bash
uv python install 3.14 3.14t 3.13
uv run --python 3.14 --with-requirements python/verify/requirements-py.txt python/verify/capture_py.py
uv run --python 3.14 --with-requirements python/verify/requirements-py.txt python/verify/verify_py.py
```

`capture_py.py` runs every lesson program, the fake partner API, the benchmarks and the free-threaded build, and rewrites `python/js/real.js`. It stops when it runs on any Python other than 3.14, because a few messages differ in 3.13. Add `--only m7` to record one mission and merge it into the existing file. `verify_py.py` runs the lint, parses every program, runs the coding rounds and the controls again, and runs the lab checker. With `--recapture` it also records everything again and compares the result with `js/real.js`, with a tolerance on timings and sizes. Add `--schema FILE` to check the workflow against a JSON schema, `--reuse` to compare with the last recapture without recording again, and `--keep` to keep the temporary folder.

The browser tests need Playwright, as for the other tutorials: `node dev/e2e.js python` and `node python/verify/e2e_labs.js`. `node dev/smoke.js python --path all` walks every frame, and `--width 390 --height 844` repeats the walk at phone width.

`python/verify/lessons/` holds the programs and projects of every mission, `python/verify/bench/` holds the benchmarks, and `python/verify/support/` holds the Brewline data and the fake partner API.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `LAB.get`, which reads `js/real.js`.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only. Every scene that shows a fact has a source `src`: `rec` or `docs`.
- **Replace the story.** The interview answers use general examples and the numbers of the Brewline data. Wherever a screen carries a "Real" prompt, swap in a real story with real numbers.
- **Update the recording.** After an upgrade of Python, pandas or uv, run `capture_py.py`, then the lint. A lesson that quotes a number that changed fails loudly. Timings change from run to run, so the lessons read them from the recording and say "on this machine".

## Files

```text
index.html                  the page
css/python.css              styles for the labs
js/config.js                title, paths, welcome text, map chips
js/real.js                  everything recorded: files, texts, tables, counts
js/helpers.js               LAB.get: reads real.js and fails when a key is missing
js/coach-lena.js            the coach
js/graphs.js                nine diagrams, plain data
js/widgets.js, widgets2.js  the seventeen labs
js/content/                 00-start.js to 15-boss.js, one file per mission
verify/capture_py.py        runs the lessons, the fake API and the benchmarks, and writes js/real.js
verify/verify_py.py         checks programs, the workflow, the coding rounds, controls and, with --recapture, the recording
verify/check_widgets.js     checks the labs against the recording and against arithmetic
verify/e2e_labs.js          drives the labs in the browser against values worked out by hand
verify/requirements-py.txt  the pinned environment of the recording
verify/INTEGRATION.md       what to paste into the hub, the root README and package.json
verify/lessons/             the programs and projects of the missions
verify/bench/               the benchmarks
verify/support/             the Brewline data and the fake partner API
verify/sections/            one recording section per mission
```
