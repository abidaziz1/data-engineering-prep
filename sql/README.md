# SQL for data engineers: from SELECT to a plan you can read

A guided, press-Next course for data engineers. Coach Tomas follows **Brewline**, the coffee retailer, as its data team writes the SQL that pipelines and dashboards depend on. You see in which order a query really runs, why NULL breaks a comparison, how a join doubles a total, what a window frame includes, how two sessions disturb each other, why an index is ignored, and what changes when the same query meets another engine. Each screen asks you to SEE, TRY or SAY: watch a query run clause by clause, try a lab or a coding round, and answer an interview question out loud.

Open **`index.html`** in a browser. No install, no account, no database.

## What is recorded, and what is a stand-in

**Every result in this course ran.** Nothing ran on Snowflake, BigQuery, Redshift, SQL Server, MySQL or Oracle, and the screens say so. Every screen that states a fact carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output, written by `sql/verify/capture_sq.py` on one machine with made-up Brewline data: **DuckDB 2.0.0**, **PostgreSQL 16.15** (a real server on 127.0.0.1, with two client sessions for the transaction lessons) and **SQLite 3.53.1** (the version inside Python's `sqlite3` module). Result tables, row counts, plans without times, error messages and session transcripts. 188 screens |
| **From documentation** | Explanations that did not run: what SQL is, how an engine plans a query, what the SQL standard says, how other engines behave. 39 screens |

The stand-ins and limits, said again where they matter:

- **Three engines ran. Seven dialects did not.** sqlglot 30.31.0 rewrote nine queries for ten dialects. DuckDB, PostgreSQL and SQLite ran their translations and the screen says what happened: the same rows, other rows or an error. Snowflake, BigQuery, Redshift, MySQL, SQL Server, Oracle and Spark SQL got text only. Those screens say "translated, not run", every time. The text may be right and may not be.
- **PostgreSQL is a real server.** The recorder starts PostgreSQL 16.15 on 127.0.0.1 in a temporary directory and stops it afterwards. The transaction lessons open two client sessions on it, A and B, so each transcript, error code (`40001`, `40P01`, `55P03`) and lock wait is real. What PostgreSQL does is not what every engine does: its Repeatable Read is snapshot isolation and also stops phantom reads, and the lessons give the other engines as documentation.
- **Times are not recorded.** They change from run to run. The course shows rows read, rows removed by a filter, loops and the shape of the plan instead.
- **The plans depend on settings that I chose so that they repeat.** PostgreSQL ran with parallel workers and JIT off, autovacuum off on the three big tables, a statistics target of 1,000 and an explicit `ANALYZE`. DuckDB ran with one thread and UTC. The plan lessons use 30,000 orders, 3,000 customers and 90,000 order lines made by arithmetic, so the three engines hold the same rows. Your server has other settings and other data, so read the plan on yours.
- **The plan texts are shortened.** The recorder reduces a DuckDB plan tree to the operators that do work. SQLite shows `EXPLAIN QUERY PLAN`. PostgreSQL shows `EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF)` with the cost numbers replaced by the estimated row count.
- **The 15 labs show what ran.** They read recorded tables, plans and transcripts and let you choose which one to look at. No lab is a model that I wrote. A second program recomputes each lab from the raw rows (see "How it was checked").
- **The data are made up.** Twelve orders, eight customers, one guest order with no customer and one customer with no email, so that NULL has something to do. The same script creates them on all three engines.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 735 | about 7.5 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 1,312 | about 14 hours | Everything in Junior, plus plans, transactions, modelling and the design decisions that seniors own |
| **Everything** | 1,420 | about 15.5 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map: how a query runs | 27 min | 42 min | 43 min |
| 2 | SELECT, filters and NULL | 41 min | 51 min | 54 min |
| 3 | Joins, fan-out and grain | 39 min | 54 min | 56 min |
| 4 | Aggregation | 25 min | 47 min | 51 min |
| 5 | Subqueries, CTEs and recursion | 29 min | 55 min | 64 min |
| 6 | Window functions | 31 min | 60 min | 64 min |
| 7 | Dates, strings and JSON | 23 min | 56 min | 63 min |
| 8 | Patterns | 24 min | 57 min | 62 min |
| 9 | Changing data | 21 min | 51 min | 56 min |
| 10 | Transactions and locks | 18 min | 46 min | 52 min |
| 11 | Indexes and plans | 22 min | 53 min | 55 min |
| 12 | Modelling for analytics | 24 min | 47 min | 52 min |
| 13 | Dialects and data quality | 32 min | 55 min | 58 min |
| 14 | Boss round and cheat sheet | 90 min | 154 min | 178 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

## What job descriptions ask for, and where this course covers it

I read a small sample of data engineer postings through search: eight queries, each returning fifteen to twenty pages, with postings from Singapore, Australia, the United Kingdom, Germany, South Africa and the United States. I read the search summaries and not every posting. Many results were aggregator copies, templates or interview guides and not postings, and the query for Bangalore returned guides only, so India is not represented by postings. It was a **small sample of search results, so treat it as a direction and not a statistic**. Interview-preparation sites in the results claim that SQL is required explicitly in three of four data engineer postings and that window functions appear in about 80 percent of technical screens. I could not check how they counted, and the course does not quote either figure.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| SQL, in nearly every posting, usually next to Python and a cloud tool | all | The whole course. Python is not here, because the Python tutorial is planned |
| Joins, aggregation and filtering written correctly, complex queries and debugging (junior postings) | 2, 3, 4 | **Recorded** on three engines: NULL logic, five join types, a join that doubles a total, grouping sets, bug hunts with the error text of each engine |
| Window functions and CTEs, sometimes recursive | 5, 6, 8 | **Recorded**: 27 frame settings give the same answers on three engines, a recursive walk step by step, top N for each group, gaps and islands, sessions, funnels |
| Query optimization: execution plans, indexes, statistics (senior postings) | 11 | **Recorded** plans of PostgreSQL 16.15, DuckDB and SQLite: an index that is used and one that is not, a composite index in both orders, index-only scans, an estimate of 150 rows against 4,285 after stale statistics, a page by offset against a page by key. Partitioning a table is **named in one answer and not demonstrated** |
| Data modelling: star and snowflake schemas, fact and dimension tables, grain | 3, 12 | **Recorded**: a star built from the Brewline tables that reconciles to 156.00, and a lab that shows what each grain does to `count(*)` and to an average |
| Slowly changing dimensions, surrogate keys, effective dates, a current flag | 9 | **Recorded**: a Type 2 load that closes one row and inserts two, and a second run that changes nothing |
| Data quality: tests on the right grain, reconciliation, monitoring | 13 | **Recorded**: eleven checks written as queries, with seven passing and four failing on purpose, and the `count(col)` against `count(*)` mistake |
| dbt, Airflow or Dagster, and CI on every pull request | not here | See the dbt tutorial. Airflow has its own tutorial in the plan |
| Snowflake, BigQuery, Redshift, SQL Server, Azure SQL, Oracle, MySQL | 13 | A dialect lab: nine queries for ten dialects, three of them run. The seven others are **translated, not run**. Stored procedures, T-SQL, SSIS and Azure Data Factory are **not covered** |
| PostgreSQL as the source database | 9, 10, 11 | **Recorded** on a real server |
| Transactions, locks, isolation levels | 10 | **Recorded** with two sessions: an isolation matrix of four anomalies at three levels, a deadlock, `SKIP LOCKED` for a job queue. Postings rarely name transactions, and guides list them for interviews |
| Interview rounds with live SQL: dedupe, top N for each group, gaps and islands, running totals | 6, 8, 14 | 41 coding rounds with the data on screen, and a boss round that mixes them |

The search summaries also described skills that this course does not teach: stored procedures and functions, triggers, vendor features such as Snowflake clones or BigQuery slots, orchestration, and Python. Mission 13 names the first difference you meet when you move a query between vendors, and it stops there.

## What you work through

- **Follow the Brewline orders.** You run a query clause by clause in the order the engine runs it, find the guest order that a join drops, double a total on purpose and repair it, group with ROLLUP and CUBE, walk a category tree with a recursive CTE, slide a window frame over ten daily revenues, bucket the same orders in four time zones, cut event streams into sessions, close and insert the rows of a Type 2 dimension, run two sessions into a deadlock, read the plan of a point lookup with and without an index, build a star schema and check that it reconciles, translate a query for ten dialects, and write data quality checks as SQL.
- **13 animated diagrams.** The map of where SQL runs, the life of a query, the logical order of a SELECT, a join that multiplies rows, grouping, a recursive CTE, a window function, sessions, a safe reload, MVCC, a planner, a star schema and a data quality gate.
- **15 labs, on 25 screens.** The clause stepper, three-valued logic and `NOT IN` with a NULL, join types and a filter in ON against WHERE, fan-out with 12 combinations, grouping sets, the recursive CTE, window frames, time zone buckets, sessions and a funnel, a slowly changing dimension, eleven transcripts of two sessions with an isolation matrix, a plan lab with 15 index choices, grain, and a translator for nine queries and ten dialects.
- **118 query screens** with the code, the line that is lit at each step and the result table of the engine that gave it, and **22 code screens** with plans, transcripts and the setup script.
- **41 coding rounds**, 22 for everyone and 19 for seniors. Each one shows its tables, a starter, hints and a solution with its result. The verifier loads the tables on screen into empty tables, runs every solution, and compares the rows.
- **38 quizzes, 24 bug hunts, 14 architecture decisions with a recommended answer, 14 incident drills and 3 ordering games.**
- **97 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often, and a boss round that asks 76 of them as a mock interview and scores you.
- **A cheat sheet** with the numbers of the Brewline data that you can say out loud.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 15 chapters, 565 screens: 288 for everyone, 236 for seniors, 41 extra |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 735, 1,312 and 1,420 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No console errors, no failed requests, no horizontal overflow, no stray `undefined` or `NaN`. Body text stays at 14 px or larger: table cells are 14.8 px, and chips and buttons are 14.0 px. Labels inside diagrams scale down to between 9 and 11.3 px, as in the other tutorials. The walk lists every text under 15 px at this width and exits with 1 because of that list, and it reported nothing else |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, SQL screen and boss question, plus keys, text size, Map, paths, saving and reset | 2,071 checks passed |
| Lab browser tests (`sql/verify/e2e_labs.js`): every lab is driven through its controls in Chromium and compared with values worked out by hand, shown in comments next to the numbers | 622 checks passed. They cover 54 truth-table cells on DuckDB and 36 on the others, 12 fan-out answers, 108 window frames, 12 time zone buckets, 5 session limits, 15 plan choices and 12 isolation outcomes |
| Recorded output (`sql/verify/capture_sq.py`) | 277 files, 54 texts, 564 result tables and 37 sets of counts from 244 query blocks and 1,721 statements, run on three engines |
| Recapture (`verify_sq.py --recapture`) | The recorder runs again as its own process. All 932 recorded items equal `js/real.js`, and the file is byte for byte what the recorder writes. A second run inside the verifier, on fresh engines, agrees too |
| SQL in the lessons (`sql/verify/verify_sq.py`) | 205 SQL snippets are read by sqlglot in the dialect of their screen (269 statements). 2 Python snippets are read by `ast`. All 118 query screens show a query and a table that equal a block and its table in a fresh run. 17 plan and transcript screens are made of lines of a recorded text |
| Bug hunts | The broken and the fixed query of all 24 run, 41 runs in all. 11 broken queries fail with the error that the lesson names, on the engines that the lesson names. 14 pairs leave different results and 4 pairs give the same rows because the lesson says the fix is only faster. Three need a state first and have their own check: with a cycle in the category tree the walk reaches 1,000 rows from a table of 9, the funnel fix counts the 8 sessions of the recorded funnel, and an insert without a close leaves two current rows where close then insert leaves none |
| Coding rounds | The data on screen is loaded into empty tables. 40 solutions give the rows on screen on DuckDB, and the one that uses `FOR UPDATE SKIP LOCKED` does on PostgreSQL. The same 40 solutions give the same values on PostgreSQL, and 33 of them on SQLite (numbers compared by value). 54 tables on screen are checked against the Brewline rows or the setup script they come from, and none of the 41 starters contains its solution |
| Dialect lesson | 13 translations on screen, with their labels and warnings, equal the recording. All 90 translated texts read back in their own dialect |
| Lab logic (`sql/verify/check_widgets.js`) | 261 checks. The row counts of every clause stage, the truth tables of three-valued logic, the join counts, the twelve fan-out answers, the grouping sets, the recursive iterations, all 27 frame settings, the time zone buckets with the rules of the JavaScript time zone database, the sessions and the funnel for five gap limits, the dimension stages, the isolation outcomes of a small model, the rows read in each plan and the grain tables are recomputed from the raw rows and compared with the recording |
| Controls | 29 deliberately broken inputs: SQL that does not parse, a changed cell, swapped columns, a plan line that no recording has, a solution that counts where it should sum, a solution that reads a table that is not on screen, a made-up row on screen, a starter that contains its solution, a wrong translation label, a recording that changed or lost a table, a block that must fail and does not, and a bug hunt whose fix changes nothing. 13 changed recordings must fail the widget checker, and 2 must fail the lab browser tests. The verifier fails if a checker accepts any of them |

**What the checks found.** The verifier found the first two columns swapped in the data of the upsert coding round: the dates sat under the header `store_id`. The lab review found a dimension lab that said "one for each customer" at the stage where customer 2 has no current row, and a transcript tile that said "3 pending" for one pending job. A MySQL claim was too broad: MySQL has refused a bare column in a grouped query by default since 5.7.5. All four are fixed.

### What was not checked

- **Nothing ran on Snowflake, BigQuery, Redshift, SQL Server, MySQL, Oracle or Spark SQL.** Their translations were read back by sqlglot in their own dialect, and that proves the text is well formed and not that the engine accepts it or gives the same rows.
- **No time was measured.** The course makes no claim about how fast a query is, only about the rows, loops and plans that the engines reported.
- **The plans are the plans of one PostgreSQL 16.15, one DuckDB 2.0.0 and one SQLite 3.53.1** on made-up data with the settings above. A newer minor version, another statistics target or your own data can change a choice.
- **The isolation matrix is PostgreSQL only.** MySQL InnoDB, SQL Server, Oracle and the cloud warehouses do not give the same answers at the same level. The lessons say that as documentation.
- **One Python snippet, the read-modify-write of mission 10, is parsed and not run,** because it calls a database object that the lesson does not define.
- **The "From documentation" screens come from search summaries.** The documentation hosts of PostgreSQL, SQLite, MySQL and Microsoft could not be opened from the build machine, so each claim in the table below rests on a search summary of the official page.
- **Chromium only.** The walks and the tests ran in Chromium. Firefox and Safari were not tried.
- **Screens reviewed by eye** are the ones listed under "Screens that I looked at". The walks check errors, overflow and text size by script, and they do not judge how every frame reads.
- **The interview answers were not compared with real interviews.** They follow the recurring topics of the job description sample.

## Re-check before you rely on these

These claims are the most likely to change or rest on search summaries. Each one carries a "From documentation" tag in a lesson, or names a version.

| Claim in the course | Where | What to read |
| --- | --- | --- |
| Recorded with DuckDB 2.0.0, released 21 October 2026. DuckDB 2.0 is a long-term support release, and it makes the PEG parser the default and changes the storage format | All | [Announcing DuckDB 2.0.0](https://duckdb.org/2026/10/21/announcing-duckdb-200) |
| Recorded with PostgreSQL 16.15, released 13 August 2026. A draft announcement dated 12 November 2026 names 16.16 as the next minor release. I could not confirm it on an official page, so the recording may be one minor version behind | All, mostly 10 and 11 | [Release notes 16.15](https://www.postgresql.org/docs/release/16.15) and [the draft announcement](https://www.postgresql.org/message-id/attachment/208544/20261112updaterelease.md) |
| Recorded with SQLite 3.53.1, the version inside Python's `sqlite3`. SQLite 3.53.4 was released on 24 July 2026 and fixes problems of 3.53.0 to 3.53.3 | 2 to 13 | [SQLite 3.53.4 release log](https://sqlite.org/releaselog/3_53_4.html) |
| sqlglot 30.31.0 (10 November 2026) wrote every translation. A newer version can write other text, and the lint fails when a quoted number changes but not when a translation does | 13 | [sqlglot on PyPI](https://pypi.org/project/sqlglot/) |
| psycopg 3.3.8 talked to PostgreSQL. Version 3.3.9 came out on 12 November 2026 | 10 | [psycopg on PyPI](https://pypi.org/project/psycopg/) |
| `GROUPS` frames exist in PostgreSQL 11 and later, and in SQLite 3.28 and later | 6 | [PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/) and [SQLite release 3.28.0](https://sqlite.org/releaselog/3_28_0.html) |
| `FILTER (WHERE ...)` on aggregates and `NULLS FIRST` or `NULLS LAST` exist in SQLite 3.30 and later | 4, 6 | [SQLite release 3.30.0](https://sqlite.org/releaselog/3_30_0.html) |
| `QUALIFY` exists in Snowflake and BigQuery. The BigQuery part rests on a description of its documentation, because the BigQuery SQL reference was not in the search results | 6, 13 | [Snowflake QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify) and [a description of the BigQuery clause](https://medium.com/google-cloud/bigquery-qualify-clause-towards-cleaner-sql-queries-bd0bb17b3947) |
| MySQL writes null-safe equality as `<=>`, which is `IS NOT DISTINCT FROM` | 2 | [MySQL comparison operators](https://dev.mysql.com/doc/refman/8.4/en/comparison-operators.html) |
| MySQL has rejected a bare column in a grouped query since 5.7.5, unless `ONLY_FULL_GROUP_BY` is switched off | 4 | [MySQL handling of GROUP BY](https://dev.mysql.com/doc/refman/5.7/en/group-by-handling.html) |
| `WITH RECURSIVE` needs the word in PostgreSQL, DuckDB, SQLite and MySQL, and SQL Server writes a recursive CTE with a plain `WITH` | 5 | [WITH common_table_expression (Transact-SQL), an archived SQL Server 2012 copy](https://msdn.microsoft.com/library/ms175972%28v=sql.110%29) |
| The default isolation level is read committed on PostgreSQL. That one was **recorded** on the server of the build | 10 | [PostgreSQL transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html) |

## Screens that I looked at

@@SHOTS@@

## Run it yourself

The course never needs a database, but the code behind the recording runs on a laptop.

```bash
pip install -r dev/requirements.txt
python3 sql/verify/capture_sq.py
python3 sql/verify/verify_sq.py
```

`capture_sq.py` starts a PostgreSQL server of its own, runs every block of `sql/verify/q/` and every Python section on DuckDB, PostgreSQL and SQLite, and rewrites `sql/js/real.js`. It took about 10 seconds on the machine that built it. It needs the PostgreSQL 16 server programs (`apt install postgresql-16`), which it finds under `/usr/lib/postgresql/*/bin`. PostgreSQL refuses to run as root, so a script that runs as root starts the server as the `postgres` user in `/var/tmp`. To use a server that already runs, set `SQ_PG_DSN` to its connection string, for example `host=127.0.0.1 port=5432 user=postgres dbname=postgres`. The recorder then creates a database called `sq_course` there and drops it afterwards.

`verify_sq.py` takes about 20 seconds. It runs the whole recorder again, checks every snippet and coding round, runs the widget checker and the lint, and feeds the broken inputs to the checkers. Add `--recapture` to run `capture_sq.py` again as its own process and compare its output with `js/real.js`, and `--browser` to run the lab tests in Chromium, with two changed recordings that they must reject. `--no-run` skips everything that needs the engines. `node sql/verify/e2e_labs.js` runs the lab tests alone, and `node dev/e2e.js sql` runs the generic ones. Wrap a browser walk in `flock` when other browsers run on the same machine.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `G.file`, `G.table` or `G.counts`, which read `js/real.js` and fail when a key is missing.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only. Every scene that shows a fact has a source `src`: `rec` or `docs`.
- **Replace the story.** The interview answers use general examples and the numbers of the Brewline data. Wherever a screen carries a "Real" prompt, swap in a real story with real numbers.
- **Add a query.** Write a block in `sql/verify/q/` with `-- @name`, `-- @engines` and the SQL, run `capture_sq.py`, and show it with `G.file('your.name')` and `G.table('your.name')`. A lesson that quotes a number that changed fails the lint.

## Files

```text
index.html               the page
css/sql.css              styles for the labs
js/config.js             title, paths, welcome text, map chips
js/real.js               everything recorded: files, texts, tables, counts
js/helpers.js            G.file, G.table, G.counts and G.expect: read real.js and fail when a key is missing or a quoted number changed
js/graphs.js             thirteen diagrams, plain data
js/widgets.js            the labs of missions 1 to 7
js/widgets2.js           the labs of missions 8 to 13
js/content/              00-start.js to 14-boss.js, one file per mission
verify/capture_sq.py     starts PostgreSQL, runs DuckDB, PostgreSQL and SQLite on the Brewline data and writes js/real.js
verify/world.py          the three engines with the data loaded, shared by the recorder and the verifier
verify/rec.py            the recording, the block parser and the helper tables of the lessons
verify/engines.py        the engine adapters, the statement splitter and the PostgreSQL server
verify/brewdata.py       the mini data and the big data, made by arithmetic
verify/q/                the SQL blocks of the missions, one file for each
verify/s_*.py            the parts that need Python: sessions, plans, translations and more
verify/verify_sq.py      checks snippets, runs queries and coding rounds again, runs the controls and, with --recapture, the recording
verify/check_widgets.js  recomputes the labs from the raw rows
verify/e2e_labs.js       drives every lab in Chromium against values worked out by hand
verify/dump_sql.js       lists every snippet, table and coding round of the lessons for the verifier
verify/INTEGRATION.md    the lines for the hub, the root README and package.json
```
