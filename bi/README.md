# BI dashboards for data engineers: Power BI, Tableau and Looker

A guided, press-Next course on the part of business intelligence that a data engineer touches. Coach Bea follows **Brewline**, the coffee retailer, whose sales dashboard exists in three tools. You see a click turn into a query on your tables, a join double a shipping total with no error, a Tableau extract miss a refund, a refresh window skip a month, and a filter decide which region a manager sees. It is the basics, on purpose: nothing about chart design, and nothing that an analyst course would teach.

This course has nine missions, not fifteen. The three products are taught together, because the questions that reach a data engineer are the same in each of them.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Power BI, Tableau Desktop, Tableau Server and Cloud, and Looker did not run for this course.** None of them can run here: they need a licence, an account or a desktop application. Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `bi/verify/capture_bi.py` on one machine with made-up Brewline data: **DuckDB 2.0.0** with a star schema of 58,385 orders and 122,196 order lines, run for every query result and every lab; the **Tableau Hyper engine** (`tableauhyperapi` 0.0.26963, the engine behind a Tableau extract), which built, queried and appended to a `.hyper` file; the LookML parser **`lkml` 1.3.7**, which read a LookML project; the **Tableau Document API** 0.11, which read and changed a data source file; and the `requests` library, which built a Power BI refresh request that was printed and not sent |
| **From documentation** | What the three products do and how they are set up: the modes and their names, DAX, Tableau calculations and TMDL, refresh features and limits, security roles, deployment pipelines, Fabric and Direct Lake, Tableau Bridge and the Power BI gateway, and what a licence allows. Nothing was timed |

The stand-ins and limits, said again where they matter:

- **A number next to a formula is a SQL result.** When a screen shows DAX, a Tableau calculation or LookML next to a number, the number was computed by SQL that asks the same question in DuckDB. The formula was written from the documentation and was not run by its tool.
- **The LookML was read, not run.** `lkml` is a parser. It accepts or refuses the text and gives the structure. It is not Looker's validator and it did not talk to a warehouse. The checks of names and keys against the tables are mine.
- **The Tableau data source file was written by hand to the shape that Tableau saves.** Tableau Desktop never opened it. A library read it, changed its server and database, and saved it. The Document API is old, and it needs the package `setuptools` to import on Python 3.12 and later.
- **The TMDL file is from documentation.** No Power BI tool opened it. It is shown to illustrate the format of a model stored as text, and the screen says so.
- **The Power BI request was not sent.** It is printed so that you can see the path, the headers and the body. A refresh of named partitions is an enhanced refresh, and the documentation says it needs a model in Premium, Premium per user or Embedded capacity.
- **An imported model is modeled by a table of DuckDB.** The refresh lab and the partition numbers apply a rule of incremental refresh to the real rows of each month: they show what a window of two months reloads and misses. They do not show what the Power BI service does inside.
- **The size of the extract is one engine's size.** The 121,881 rows took 7.2 million bytes as CSV, 0.83 million as Parquet and 0.92 million as a `.hyper` file. The engines of Power BI and Tableau Server compress in their own way.
- **The data is made up.** Twelve stores in four regions, twenty products, about 2,000 customers, from 1 January 2025 to 31 March 2026. A fixed rule makes every run write the same rows. Store s01 sells about a fifth of the orders.
- **The documentation websites of the three vendors were read through search.** Pages of Microsoft Learn, Tableau Help and Google Cloud were read as search summaries and not opened one by one. The claims to check are listed below.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 286 | about 2.5 hours | Starting out, or interviewing for a junior data engineer role next to BI |
| **Senior** | 359 | about 3.5 hours | Everything in Junior, plus the refresh, performance, security and deployment decisions that seniors own |
| **Everything** | 382 | about 3.5 hours | Adds the finer points: DAX filter context, a Power BI table in TMDL, governance |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map: three tools, the same four parts | 13 min | 15 min | 15 min |
| 2 | The model: grain, keys and joins that multiply | 16 min | 21 min | 21 min |
| 3 | Where the query runs: a copy or a live query | 12 min | 17 min | 17 min |
| 4 | Measures and the semantic layer | 18 min | 22 min | 28 min |
| 5 | Refresh and freshness | 15 min | 22 min | 22 min |
| 6 | Performance: what a dashboard asks of your tables | 15 min | 21 min | 21 min |
| 7 | Security: who sees which rows | 10 min | 16 min | 18 min |
| 8 | The model as files: review, check, deploy | 15 min | 16 min | 18 min |
| 9 | Boss round | 31 min | 47 min | 52 min |
| | **Total** | **151 min** | **204 min** | **219 min** |

A short mission 0 sets up the course: the whole picture, what a junior and a senior are asked, how the screens work and what ran. Mission 9 has two incident drills that mix missions (two fresh dashboards with two different revenue numbers, and a quarter that changed after the books closed), a design decision, a coding round (a share of revenue by region), a mock interview of 19 questions, a scorecard and a one-page cheat sheet of recorded numbers.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through search: eight queries (data engineer postings that name Power BI, Tableau or Looker; London and the UK with Snowflake and dbt; analytics engineer roles with Looker and LookML; Bangalore; Singapore and Sydney with row-level security; and the Power BI semantic model). I read the search summaries and not every posting, many postings came from job boards and recruiter pages that repeat each other, so this shows **direction and not a count**. No posting asked for chart design from a data engineer. The mission numbers say where each topic is taught.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Power BI is the most named tool, with Tableau and Looker as alternatives or as a second tool. Several postings accept "Power BI or Tableau" | 1 | The three tools side by side in one vocabulary table. **From documentation** |
| Semantic model design: star schema, fact and dimension tables, hierarchies, governed metrics | 2, 4 | **Recorded**: a star schema in DuckDB, the grain of each table, a fan-out and a many-to-many total, checks of keys. Measures in DAX, Tableau and LookML are **from documentation**, with a recorded SQL result beside each |
| DAX measures next to dimensional modeling | 4 | Filter context, `CALCULATE` and `REMOVEFILTERS` explained through SQL windows. **From documentation**. DAX itself was not run |
| Building analytics-ready datasets for Power BI and Tableau | 2, 3, 6 | **Recorded**: wide tables and aggregate tables built from the star, and what each answers |
| Refresh, gateways, and "troubleshooting data refresh issues" | 5 | **Recorded**: a refresh policy of partitions and the change that it misses, and a Tableau extract that kept an old status. The gateway and Bridge are **from documentation** |
| Row-level security | 7 | **Recorded**: the filter of five people from one entitlement table. The three tools' own settings are **from documentation** |
| Incremental refresh. It rarely appeared by name in the summaries I read | 5 | **Recorded** as a rule applied to real partitions. The service itself is **from documentation** |
| Looker: LookML, explores, views, PDTs, user permissions, often with dbt and BigQuery | 4, 5, 8 | **Recorded**: a LookML project read by a parser and checked against the tables. Looker itself is **from documentation**. dbt has its own course in this library |
| Microsoft Fabric, lakehouse and Direct Lake with Power BI | 3 | Named and compared, **from documentation**. Fabric is **not covered** |
| CI/CD for Power BI, deployment pipelines, governance | 8 | **Recorded**: checks of a model stored as text, and a connection switched by a script. The deployment services are **from documentation** |
| SQL, Python and dbt as the supporting stack | all | The SQL and Python in this course ran. dbt, Snowflake and Airflow have courses of their own in this library |
| Tableau Server and Cloud administration, SSRS, report design | not here | Not covered |

The interview themes that came up most in the summaries are all missions here: what a star schema is and why, why a number is doubled, import against DirectQuery, how to keep a dashboard fast, how incremental refresh works and what it misses, and how row-level security is set up.

## What you work through

- **Follow Brewline.** One sales dashboard, three tools. A shipping total doubles, a revenue total is higher on one dashboard than on another, an extract keeps the status "completed" for a refunded order, and a manager sees every region after a change of role.
- **8 animated diagrams.** Orange blocks travel along numbered arrows: a click on a dashboard, three tools with the same four parts, the Brewline star schema, a copy against a live query, a refresh started by the pipeline, an aggregate table, a row-level filter, and a model going through review to production.
- **6 labs.** Four orders and three ways to add the shipping. A copy or a live query for 5, 40 or 200 viewers. One measure under 25 combinations of filters. A refresh policy and a late refund. Which table answers which tile. Five people and one dashboard.
- **12 SQL screens, 8 code walkthroughs and 1 terminal replay.** The queries behind each lesson with their real results, LookML, a Tableau data source, a Python extract builder and a connection switcher, and a refresh request.
- **18 quizzes, 4 bug hunts, 3 ordering games, 5 decisions with a recommended answer and 6 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **19 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 10 chapters, 161 screens: 121 for everyone, 33 for Senior, 7 extra |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 286 frames on the Junior path, 359 on the Senior path and 382 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. The script reports small text: the numbers of the shared interface and the diagram labels are 10.5 to 14.8 px |
| Interaction test (`node dev/e2e.js bi`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset | 582 checks passed, 0 failed |
| The 6 labs driven in the browser (`bi/verify/e2e_labs.js`): every chip, compared with the recording and with values worked out in the test (the sums of four orders, queries for each viewer, the 25 cells of the filter lab, every refresh window, the rows behind six tiles, five people). The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 234 checks passed |
| Recorded output (`bi/verify/capture_bi.py`) | 24 files, 2 texts, 31 tables and 15 sets of counts. The recorder takes about 2 seconds, and a second run writes a byte-identical file |
| Code in the lessons (`bi/verify/verify_bi.py`), 3 seconds without the browser and 32 seconds with it | 19 SQL texts parsed by DuckDB and 10 results compared with the screens. 7 bug hunts run: the broken query gives the wrong number that the lesson quotes, and the fix the right one. 5 runs of the row-level rule for five people. 5 LookML texts parsed and 6 references between LookML files resolved. 2 Python files compile, 1 XML file is well formed, 1 request has a JSON body. 22 code screens show a file that was recorded |
| Recapture (`verify_bi.py`, part of every run) | The whole recording is made again and compared with `js/real.js`: 83 items, 0 differ |
| Lab data (`bi/verify/check_widgets.js`) | 193 checks: the four orders by hand, the many-to-many total, the same tile from the warehouse, the extract and the aggregate, 25 cells of measures and their sums over regions and categories, the ratio of sums and the average of ratios, running totals, the extract and its append, every refresh window, the rows behind six tiles, the share of each column in the file, and the revenue that each of five people sees |
| Controls | 17 deliberately broken inputs, and each one is refused: SQL with a missing parenthesis and a misspelled keyword, a result table with one number changed, LookML with a missing brace, a reference to a field that no view defines, Python with a syntax error, XML with an unclosed tag, a recording with one number changed that the comparison must report, six changes to the recording that the widget checker must refuse (the inflated total, a cell of the filter lab, the rows of a partition, the revenue of one person, the rows of the aggregate, the status of the late order), and, with `--browser`, three changes to the widget code that the lab test must fail (five queries for each viewer instead of six, eleven months kept instead of twelve, no repeated rows marked) |

17 formulas in DAX, TMDL, Tableau calculations and row-level rules are shown on screens that carry the **From documentation** tag. No check can run them.

### What was not checked

- **No product ran.** Power BI Desktop and the Power BI service, Tableau Desktop, Server and Cloud, and Looker were not opened. A DAX measure, a Tableau calculation, a TMDL file or a LookML model may be refused by its product for a reason that no parser here knows.
- **What a refresh does inside a product was not observed.** The incremental refresh lab applies a rule to real rows. The service may differ in detail, for example in how it treats the boundaries of a partition.
- **No gateway, Bridge, Fabric or Direct Lake.** They are described from documentation.
- **Nothing was timed.** The lessons compare rows, bytes and counts of queries. A dashboard speed depends on the warehouse, the tool and the network.
- **Row-level security was run as SQL.** The roles of the three tools were not set up, and the lesson about workspace roles in Power BI comes from documentation.
- **The vendor documentation websites were read through search summaries.** Pages were not opened one by one.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not legal advice.** Ask your security and privacy teams which access rules apply to you.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| A refresh of named tables or partitions is an enhanced refresh. It needs a model in Premium, Premium per user or Embedded capacity. `notifyOption` does not apply to it | The REST API page "Datasets - Refresh Dataset In Group", read through search | [Refresh Dataset In Group](https://learn.microsoft.com/rest/api/power-bi/datasets/refresh-dataset-in-group) |
| Incremental refresh needs the parameters `RangeStart` and `RangeEnd`. "Detect data changes" needs a date and time column at the source, works only inside the refresh window, and does not find deleted rows | The page about configuring incremental refresh, read through search | [Configure incremental refresh](https://learn.microsoft.com/power-bi/connect-data/incremental-refresh-configure) |
| The storage modes of a semantic model: import, DirectQuery, Direct Lake, composite, and hybrid tables that need Premium | The pages about storage modes and Direct Lake, read through search | [Table storage mode](https://learn.microsoft.com/power-bi/transform-model/desktop-storage-mode) |
| Row-level security in the Power BI service applies to the viewers of a workspace. People with editing roles see all rows | Read in Microsoft documentation through search, and found again in practice. **Not opened and not run** | [Row-level security with Power BI](https://learn.microsoft.com/power-bi/enterprise/service-admin-rls) |
| Tableau incremental extract refresh adds the rows that are new. A change to the structure of the source needs a full refresh first | The Tableau Help page about refreshing extracts, read through search | [Refresh extracts](https://help.tableau.com/current/online/en-us/refresh_incremental.htm) |
| Tableau Bridge lets Tableau Cloud reach data inside a private network. Some sources do not support live connections through it | The Tableau Help page about Bridge, read through search | [Connectivity with Bridge](https://help.tableau.com/current/online/en-us/to_sync_local_data.htm) |
| `access_filter` takes a fully scoped field and a user attribute, and every user of the explore needs a value for the attribute. It is applied in the `WHERE` clause | The LookML reference page, read through search | [access_filter](https://docs.cloud.google.com/looker/docs/reference/param-explore-access-filter) |
| Aggregate awareness picks the smallest table that can answer a query. A datagroup runs a `sql_trigger` and has a `max_cache_age` | The Looker pages about aggregate awareness and datagroups. The datagroup parameters were **not** confirmed in my searches | [Aggregate awareness](https://docs.cloud.google.com/looker/docs/aggregate_awareness) |
| The job postings: direction only, from search summaries of eight queries | Pages of job boards, recruiters and company career sites. A small sample | [WeAreDevelopers: BI engineer](https://www.wearedevelopers.com/jobs/ext/1935260-bi-engineer) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900 unless stated:

- Four diagrams: the first one of the course (a click that becomes a query), the three tools side by side, the star schema and the aggregate table.
- All six labs, each after a choice was made in it. The refresh lab was also looked at on a phone (390 by 844).
- The Tableau data source on its code screen, and the welcome screen.

Looking found three faults that the tests had missed, and all three are fixed: the buttons of the labs had no style, the numbers in a table cell were drawn as dark circles because a class name was already used by the engine for step numbers, and two diagram labels were wider than their boxes.

## Files

```
bi/
  index.html, css/bi.css      the page and its colours
  js/config.js               the course settings: Coach Bea, the paths, the ten levels
  js/graphs.js               8 diagram specs
  js/widgets.js              the 6 labs
  js/content/                one file per mission, 00 to 09
  js/real.js                 the recording: files, tables, texts and counts written by capture_bi.py
  verify/world.py            the made-up Brewline star schema, built by a fixed rule
  verify/capture_bi.py       runs DuckDB, the Hyper engine, lkml and the Tableau Document API and writes js/real.js
  verify/verify_bi.py        checks every SQL text, LookML text and file, runs the bug hunts, makes the recording again and compares, runs the lab checks, the lint and, with --browser, the lab tests
  verify/check_widgets.js    recomputes the lab data with arithmetic that shares no code with the widgets
  verify/e2e_labs.js         drives the six labs in Chromium against values worked out by hand
  verify/dump_bi.js          lists the code and the strings of the course for verify_bi.py
  verify/sql/                the 13 SQL scripts of the lessons
  verify/lookml/             a LookML project: four views, a model and a broken view
  verify/tableau/            a data source file, and the script that switches its connection
  verify/powerbi/            a Power BI table in TMDL, written from documentation
  verify/build_extract.py    builds and appends to a Tableau extract with the Hyper API
  verify/requirements.txt    the environment
  verify/INTEGRATION.md      the text that the hub page, the root README and package.json need
```

## Run the checks

```bash
python3 -m venv bi-env && bi-env/bin/pip install -r bi/verify/requirements.txt
bi-env/bin/python bi/verify/verify_bi.py             # SQL, LookML, bug hunts, recapture, lab data, controls and lint (about 3 seconds)
bi-env/bin/python bi/verify/verify_bi.py --browser   # also drives the labs in Chromium and runs three changes that the lab test must fail
bi-env/bin/python bi/verify/capture_bi.py            # writes bi/js/real.js
node dev/lint-content.js bi
node dev/e2e.js bi && node bi/verify/e2e_labs.js
node dev/smoke.js bi --path all
```

The Hyper engine is a native program that comes inside the `tableauhyperapi` package for Linux, macOS and Windows. Without one of the packages, `verify_bi.py` says what it skipped and runs the rest.

Independent study material. Not affiliated with or endorsed by Microsoft, Tableau, Salesforce, Google or any other vendor or project named here.
