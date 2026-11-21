# Data ingestion for data engineers

A guided, press-Next course on getting data into a warehouse: what a connector does and what it leaves behind, append, replace and merge, an incremental load with a cursor and the two things that a cursor cannot see (a delete and a silent update), schema drift and the contracts that decide what happens to a new field, the protocol of an Airbyte connector and its sync modes, what Fivetran adds to your tables and how a usage-based bill is counted, and how to run it for real (state, backfills, monitoring, limits of real APIs, change capture). Every lesson follows one coffee retailer, **Brewline**, and one coach, **Remy**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen that teaches a fact carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `ingestion/verify/capture_ingestion.py` on one Linux machine: **dlt 1.32.0** (an open-source Python library) loading a pretend shop API into **DuckDB 1.5.6** on Python 3.13, and the **Faker connector of Airbyte** (`airbyte-source-faker`) called by hand and through **PyAirbyte 0.71.3** on Python 3.11. The code on the screens is the code that ran, with made-up Brewline data |
| **From documentation** | Everything that was not run: Fivetran, the Airbyte platform and its screens, Meltano and Singer, log-based capture, a real API with limits and secrets, and the decisions. These screens say so |

The stand-ins and limits, said again where they matter:

- **Fivetran did not run.** It is a service that needs an account and a paid plan. Everything about it (its system columns, its soft deletes, the way that monthly active rows are counted) is **from documentation**, read through search summaries of its pages, and tagged so. The count of active rows on one screen is **computed** from the definition on the recorded loads, and it is not an invoice.
- **The shop is a stand-in.** A Python function with fixed rules and no random numbers: 100 orders on day 1, then changes on day 2 (10 shipped, 10 new, one deleted, one shipped without a new `updated_at`) and on day 3 (new fields, a number sent as text, an amount sent as text). A real API adds rate limits, retries, pages of other kinds and secrets, which the lessons cover from documentation.
- **One destination.** Everything ran into DuckDB. Another warehouse may type a column or name a variant column in another way.
- **The Airbyte connector registry was not reached.** The sandbox blocked its host, so PyAirbyte ran in offline mode with `pip_url='airbyte-source-faker'`, and the connector came from PyPI. The Airbyte **platform** (its connections, its normalization, its Cloud) did not run: PyAirbyte played its part with a local cache.
- **The Faker connector moves its cursor on every sync by default** (`always_updated`). The course uses that on purpose in one lab, and sets it off for the honest cursor.
- **dlt filters by the cursor itself.** A resource that asks the API for everything and keeps the cursor wrote the same 20 rows on day 2 (the coding round has a control for the opposite mistake). Passing `since` saves reading at the API, and no API reads were measured.
- **Nothing is timed.** The recording holds row counts, tables, columns, error texts and messages. It never holds a number of seconds, so nothing here says how fast a tool loads.
- **A terminal replay is built from recorded values.** Every output line came from the recording. A command is written as `python name.py`, and nothing in the output depends on the date or on a path.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 171 | about 105 minutes | Starting out, or interviewing for a junior data engineer role where you load data with a tool |
| **Senior** | 251 | about 3 hours | Everything in Junior, plus deletes and silent updates, contracts, state and backfills, pricing, and the decisions that seniors own |
| **Everything** | 252 | about 3 hours | Adds one finer point: why one load catches a change that another one misses |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **What an ingestion tool does.** A first load and everything it leaves behind, ELT, five families of tools, and a join that multiplies rows | 14 min | 21 min | 21 min |
| 2 | **Incremental loading.** Append, replace, merge and a cursor, and what each one gets wrong | 16 min | 25 min | 26 min |
| 3 | **Schema drift and nested data.** New fields, text where a number was, and five contracts | 13 min | 21 min | 21 min |
| 4 | **Airbyte and Fivetran.** What a connector prints, sync modes, Fivetran from its documentation, and how the bill is counted | 18 min | 27 min | 27 min |
| 5 | **Running it in production.** State, backfills, monitoring, the limits of real APIs, and change capture | 14 min | 24 min | 24 min |
| 6 | **Boss round.** Two drills, a decision, a coding round, a mock interview and a one-page review | 25 min | 43 min | 43 min |

Mission 0 is the start: pick a path and see the whole picture (6 minutes).

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through two searches: senior data engineer roles that name Fivetran, Airbyte or Debezium, and data engineer roles that ask for ingestion tools next to dbt and Snowflake. I read the search summaries and not every posting, many results were job boards that repeat each other or postings of vendors, so this shows **direction and not a count**. Most postings ask for ELT or ETL pipelines in general terms (Python, SQL, an orchestrator, a warehouse, dbt) and **do not name an ingestion tool**. Where one is named, **Fivetran** is the most common, then **Airbyte**, often in the phrase "Fivetran, Airbyte, or custom frameworks". Change data capture appears as a skill, with Debezium or a managed service as examples. **Stitch did not appear** in the results.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| ELT and ETL pipelines in Python, with dbt and a warehouse | 1, 2, 3 | **Recorded**: dlt loading into DuckDB, with raw tables that dbt would clean. dbt and a real warehouse did not run here (they have courses of their own) |
| Fivetran, Airbyte, or custom frameworks | 1, 4 | **Recorded** for Airbyte (its connector and the protocol) and for a custom framework (dlt). **From documentation** for Fivetran |
| Configure, manage and monitor connectors and pipelines | 4, 5 | **Recorded**: sync modes, a state that is given back, checks on rows against keys. Monitoring and alerts are **from documentation** |
| Incremental loads, idempotent loads, backfills | 2, 5 | **Recorded**: append, replace, merge, a cursor, a lookback, a window of old data loaded twice |
| Schema evolution and data quality | 3 | **Recorded**: new columns, a variant column, five contracts, and the error texts |
| Change data capture, for example Debezium | 2, 5 | A cursor that misses a delete is **recorded**. Log-based capture is **from documentation**, and the Kafka course in this library records Debezium |
| Custom connectors, APIs, rate limits | 4, 5 | A connector as a program is **recorded**. Rate limits, retries and secrets are **from documentation** and did not run |
| Cost control of ingestion | 4 | The rule for monthly active rows is **from documentation**, and a count on the recorded loads is **computed**. No bill was seen |
| Five or more years of experience for senior roles | all | The senior path is written for this. No course replaces the years |

The 17 interview questions are written from the topics that these postings share and from the usual ingestion interview themes: ETL and ELT, full and incremental loads, idempotency, deletes, cursors, schema drift, contracts, Airbyte, Fivetran pricing, backfills, monitoring, state and change capture. I did not check them against a list of real interview questions.

Examples in the sample: [a Data Engineer posting that asks for ELT and ETL tools "Fivetran, Airbyte, or custom frameworks"](https://www.iitjobs.com/job/data-engineer-miami-fl-usa-346933), and [the Senior Data Engineer posting of Fivetran itself](https://jobs.generalcatalyst.com/companies/fivetran/jobs/51295279-senior-data-engineer) (Snowflake, BigQuery, dbt, SQLMesh, Looker; no Airbyte and no Debezium).

## What you work through

- **Follow Brewline.** One pretend shop, loaded again and again. A table that doubles after a retry, a deleted order that stays, an order shipped without a new `updated_at`, a new field at 2 a.m., an amount sent as text, a bill that doubles after a changed sync mode, and a backfill that was started twice.
- **4 animated diagrams.** A sync from the shop to the models, a cursor and what it cannot see, a new field and the contract that decides, and a connector that prints messages.
- **3 labs.** Seven ways to load the same shop, day 3 under five schema contracts, and five sync modes synced twice.
- **6 terminal replays, 6 code walkthroughs and 11 comparison tables.** The commands with their real output, and the files `shop_pipeline.py`, `strategies.py`, `drift.py`, `protocol.py`, `sync_modes.py` and `state.py`. The tables compare ETL with ELT, five families of tools, Fivetran, Airbyte, dlt and custom code, and how each bill is counted (documentation).
- **21 quizzes, 10 bug hunts, 5 ordering games, 6 decisions with a recommended answer and 9 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **17 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The boss round plays 15 of them in a mock interview, and one coding round (a dlt resource that reads only what changed and is safe to run twice).

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 7 chapters, 130 screens: 87 for everyone, 42 for Senior, 1 extra. 32 screens are tagged Recorded and 20 From documentation. Quizzes, games and interview questions carry no tag |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 171 frames on the Junior path, 251 on the Senior path and 252 on the Everything path |
| The same walk at phone width (390 by 844), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js ingestion`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 454 checks passed, 0 failed |
| The 3 labs driven in the browser (`ingestion/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out by `model.js` (what each way of loading must write and hold, what day 3 does under each contract, what each sync mode must read) | 143 checks passed |
| Recorded output (`ingestion/verify/capture_ingestion.py`) | 10 files, 9 texts, 5 tables, 6 sets of counts and 8 facts about the tools: 38 recorded items in all. The recorder takes about 2 minutes, mostly for installing the connector from PyPI, and it keeps everything in temporary folders |
| The files, parsed (`ingestion/verify/verify_ingestion.py`) | The 10 programs of the recording are the files on disk, and the 8 code screens that show one show it exactly. Every Python snippet of the lessons (33, with the bug hunts, their fixes and the solution of the coding round) goes through the Python parser. Parsing checks syntax and nothing else |
| The coding round, run | The solution on the screen is run with dlt on the pretend shop. It wrote 100, 20, 7 and 0 rows on four loads and ended with 117 rows for 117 orders, as the rules of the data say. Four wrong solutions are all caught: one that appends, one with no cursor, one that reads only the first page, and one that looks back a day |
| Bug hunts run | All 10 hunts are run, each snippet next to its fix: eight with dlt and DuckDB (two of them in SQL), and two with the Airbyte connector. Seen: a join to the lines counts 200 orders for 100, reading one page loads 50 of 100, append twice holds 200 rows and merge 100, a cursor leaves order 12 PLACED and a lag of one day makes it SHIPPED, the sum of the number column is 1,116 and with the variant column 2,233, `discard_row` leaves 112 orders and evolve 117, a window loaded twice holds 140 rows with append and 110 with merge, a cursor that starts on day 2 loads 20 orders and one that starts early 109, a full refresh with append leaves 40 rows for 20 users and a merge 20, and a read without `--state` gives 20 records and with it 0 |
| Recapture (`verify_ingestion.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 38 items, 0 differ. Nothing is timed, so only one thing is allowed to differ: the date |
| Lab data (`ingestion/verify/check_widgets.js`) | 47 checks written in code that shares nothing with the widgets or the programs (`model.js`): the shop rebuilt from its rules, a simulation of each way of loading (what each run writes, what is at the cursor and dropped, what a lag does), day 3 under each contract, state, a window of old data, the sync modes, the messages of the connector, and the active rows of the recorded loads |
| Controls | 33 deliberately broken inputs, and each one is refused: Python with a syntax error (3), wrong solutions of the coding round (4), 17 changes to the recording that the widget checker must refuse (an append with 101 distinct orders, a deleted order that left the destination, a lookback that did not catch order 12, a discard that kept 113 orders, a repeated day that wrote a row, an honest cursor that read 5 records, and eleven more), 3 changes to the recording that the recapture comparison must refuse, and 6 changes to the widget code that the browser test must catch |

One control that I wrote first was not caught, and the reason is worth knowing: a solution that removes `since=updated.last_value` still wrote the same rows, because dlt also filters by the cursor. It was an equivalent change, so I replaced it with a solution that has no cursor at all.

### What was not checked

- **Fivetran, the Airbyte platform, Airbyte Cloud, Meltano, Singer taps and Debezium did not run.** Anything that the lessons say about them is tagged From documentation.
- **One destination and one version of each tool.** dlt 1.32.0, DuckDB 1.5.6, PyAirbyte 0.71.3. Another version may print other error texts or name a variant column in another way.
- **No timings and no costs.** The recording counts rows, columns and messages, and never seconds or money. The count of active rows is computed from a definition, and the prices of vendors are not shown on purpose.
- **A pretend API.** It never failed, never limited the calls, and never asked for a secret.
- **The rule of de-duplication at the cursor** (by key when there is one, by the whole row when there is none) is the explanation that fits four recorded runs and the documentation of dlt as I remember it. I did not read the source of dlt.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| Fivetran counts monthly active rows as the distinct primary keys that were added, updated or deleted in a calendar month, and the count resets each month | Search summaries of the pricing pages of Fivetran | [Usage-Based Pricing](https://fivetran.com/docs/getting-started/consumption-based-pricing) |
| From 1 January 2026 deletes count for pay-as-you-go accounts (and for annual contracts at renewal), and monthly pay-as-you-go connections have a minimum charge | Search summaries of the 2026 pricing updates and of third-party guides. The first part came from a third-party guide, so read the page | [2026 Pricing Updates](https://fivetran.com/docs/core-concepts/usage-based-pricing/pricing-updates/2026-pricing-updates) |
| Each connection is counted on its own | A third-party guide and a search summary | [Usage-Based Pricing](https://fivetran.com/docs/getting-started/consumption-based-pricing) |
| `_fivetran_synced` is a UTC timestamp, `_fivetran_deleted` marks a deleted row in soft delete mode, not every connector reports deletes, and the flags can be wrong during a re-sync | Search summaries of the Fivetran documentation | [System columns and tables](https://fivetran.com/docs/core-concepts/system-columns-and-tables), [Does Fivetran remove deleted source data?](https://fivetran.com/docs/destinations/troubleshooting/deleted-source-data) |
| Airbyte Cloud bills credits for volume on some plans and capacity (Data Workers) on others | Search summaries. **The sources disagreed on the prices**, so the course shows none | [Airbyte pricing](https://airbyte.com/pricing) |
| Airbyte Core is under the Elastic License 2.0, the protocol and the connector kit are MIT, and the license of the connectors is described in two ways on two pages | Search summaries of the license pages. This is not legal advice | [License FAQ](https://airbyte.com/license-faq), [Licenses](https://docs.airbyte.com/community/licenses/) |
| Log-based capture reads the database log, so deletes arrive in order; a replication slot holds the log until it is read | **From my memory of the documentation, not looked up** | none |
| Rate limits answer HTTP 429 with a retry header, and loaders back off | **From my memory, not looked up and not run** | none |
| The job postings: direction only, from search summaries | Pages of job boards and of vendors. A small sample | [example: Data Engineer, Miami](https://www.iitjobs.com/job/data-engineer-miami-fl-usa-346933) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900 (and one at phone width):

- Four diagrams: the sync (the step of the models), the cursor (the merge step), the schema drift (the contract step) and the connector (the step of the messages).
- The three labs in their first state: seven ways to load, five contracts, and five sync modes. The drift lab was also looked at on a phone.
- The welcome screen, the table of five families of tools, the table that compares four ways to ingest, the count of active rows, and the first screen of the coding round.
- Coach Remy, who is in every one of those screens.

Looking found faults that the tests could not see, and all of them are fixed: the stylesheet of the course was cut short at first, so the chips, tiles and bars of the labs had no style and the drift lab ran out of the screen on a phone. Four diagram subtitles touched the edges of their boxes (`tables and metadata`, `SQL, for example dbt`, `Airbyte or PyAirbyte` and `evolve, freeze, discard`), and the tag "the same day twice changes nothing" ran out of the diagram of the cursor. The lessons also said that the shop holds 117 orders after day 3, and the shop holds 116: order 11 was deleted there, and the destination keeps it. Every screen that is not listed here was checked by the tests above and was not looked at.

## Files

```
ingestion/
  index.html, css/ingestion.css  the page and its colours
  js/config.js                   the course settings: Coach Remy, the paths, the levels
  js/graphs.js                   4 diagram specs
  js/widgets.js                  the 3 labs
  js/content/                    one file per mission, 00 to 06
  js/real.js                     the recording: files, texts, tables and counts written by capture_ingestion.py
  verify/project/                the Brewline programs that ran: source, shop_pipeline, first_load, strategies, boundary, drift, state, challenge, protocol, sync_modes
  verify/inglib.py               helpers of the recorder: running programs with the two interpreters, and the writer of js/real.js
  verify/capture_ingestion.py    runs the programs and writes js/real.js
  verify/verify_ingestion.py     parses the code, runs the bug hunts and the coding round, compares a new recording with js/real.js, runs the controls
  verify/hunts_dlt.py            runs the bug hunts that use dlt and DuckDB
  verify/hunts_airbyte.py        runs the bug hunts that use the Airbyte connector
  verify/model.js                an independent model of the shop and of the ways of loading
  verify/check_widgets.js        recomputes the numbers of the labs with the model
  verify/e2e_labs.js             drives the three labs in Chromium
  verify/dump_ingestion.js       lists the code, the commands and the strings of the course for verify_ingestion.py
  verify/requirements.txt        what the machine needs
  verify/INTEGRATION.md          what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 -m venv ing-env && ing-env/bin/pip install "dlt[duckdb]"
python3.11 -m venv airbyte-env && airbyte-env/bin/pip install airbyte        # PyAirbyte needs Python 3.11 or 3.12
export DLT_PY=$PWD/ing-env/bin/python AIRBYTE_PY=$PWD/airbyte-env/bin/python
ing-env/bin/python ingestion/verify/verify_ingestion.py                        # parse the code, run the bug hunts and the coding round, lab data, controls
ing-env/bin/python ingestion/verify/verify_ingestion.py --recapture --browser  # also record everything again and compare, and drive the labs (needs Playwright)
ing-env/bin/python ingestion/verify/capture_ingestion.py                       # write a new ingestion/js/real.js
node dev/lint-content.js ingestion && node dev/e2e.js ingestion                # lint and interaction test
node dev/smoke.js ingestion --path all                                         # walk every frame
node ingestion/verify/check_widgets.js && node ingestion/verify/e2e_labs.js    # the lab data, and the labs in a browser
```
