# Snowflake and dbt together: one pipeline, built end to end

A press-Next course for people who run dbt on Snowflake. It follows the Brewline project from the [dbt course](../dbt/README.md) onto Snowflake and shows what changes: how dbt signs in, which statement it sends for each model, what a run costs, how development, CI and production stay apart, who may read what, and how you recover from a bad release.

Open `index.html`. No install, no account, no server.

**Every SQL statement that dbt sends in this course was recorded.** dbt-snowflake 1.12.5 (dbt Core 1.12.6) ran the Brewline project against a stand-in for the Snowflake connection, and the stand-in wrote down each statement. **Nothing ran on a Snowflake account.** Results, timings and credit figures on screen are examples, and each screen says so. Read [What was not checked](#what-was-not-checked) before you rely on anything here.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 272 | about 2.5 hours | Starting out, or interviewing for a junior or analytics engineer role that uses dbt on Snowflake |
| **Senior** | 425 | about 4 hours | Everything in Junior, plus the cost, environment, security and recovery decisions |
| **Everything** | 446 | about 4.5 hours | Adds the newest features and the deepest follow-ups |

Switch any time with the **Map** button. Progress saves in your browser.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 0 | Start here | 8 min | 8 min | 8 min |
| 1 | Connecting dbt to Snowflake | 15 min | 23 min | 23 min |
| 2 | What dbt builds in Snowflake | 17 min | 31 min | 31 min |
| 3 | Incremental models on Snowflake | 18 min | 32 min | 32 min |
| 4 | Warehouses and cost | 15 min | 26 min | 28 min |
| 5 | Environments, clones and CI | 18 min | 26 min | 26 min |
| 6 | Roles, grants and personal data | 11 min | 23 min | 23 min |
| 7 | Recovery: Time Travel and clones | 9 min | 18 min | 19 min |
| 8 | Running it in production | 9 min | 18 min | 18 min |
| 9 | Boss round and cheat sheet | 22 min | 43 min | 58 min |

The minutes come from `node dev/stats.js snowflake-dbt`. They count reading, trying and speaking time per screen, so your own pace will differ.

## What you work through

- **Recorded statements.** Terminal scenes replay the statements of a real dbt run, and code screens show them line by line: the staging view, a mart table, a merge, a snapshot, a test, a contract, a clone, a Python model and the connection arguments.
- **Four labs.** A settings lab (ten dbt settings and the statements each one sends), a strategies lab (merge, delete+insert, append, microbatch and two merge variants), a credit calculator (size, run time, auto-suspend, scaling) and an environment lab (where a model lands in dev, CI and production, and what defer changes).
- **Bug hunts, quizzes, ordering games, decisions and incidents.** Each incident has clues, a best first action, a diagnosis checklist, a spoken answer and a list of preventions.
- **Interview questions.** 23 questions with talking points, a model answer and follow-ups, then a timed mock round and a scorecard.
- **A one-page review** of the statements, settings and decision rules.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules) | Clean. 10 chapters, 174 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 272, 425 and 446 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors |
| Interaction test (`dev/e2e.js`): every quiz, bug hunt, ordering game, decision, incident, interview question, terminal, lab and boss question, plus keys, text size, Map, paths, saving and reset | 701 checks passed. The labs are checked against the recording and against hand arithmetic |
| Recording (`verify/capture_sf.py`) | 305 statements in 43 scenarios (167 metadata calls, 80 DDL, 15 DML, 23 queries, 20 begin or commit), 34 project files and 48 text items, all produced by dbt-snowflake 1.12.5 |
| Code in the lessons (`verify/verify_sf.py`) | 26 snippets are taken from the recording. 21 are written by hand: 33 SQL statements parse as real syntax trees with sqlglot in the Snowflake dialect, 19 more only matched a documented pattern because sqlglot has no tree for them, 5 YAML files parse, 3 shell scripts pass `bash -n`, and the 24 dbt flags in them exist in `dbt <command> --help` |
| Facts the lessons quote from the recording | 22 statements checked, for example that a merge without a key becomes a plain insert, that dbt revokes a role missing from the config, and that `dbt parse` opens no connection |
| Lab logic (`verify/check_widgets.js`) | 58 checks. Credit arithmetic, auto-suspend simulation, transaction detection and the settings diff are checked against the recording and against numbers worked out by hand |
| Recapture | `python3 snowflake-dbt/verify/verify_sf.py --recapture` records everything again. 0 of the recorded items differ from a fresh run. It ignores timings, key sizes, the order of statements from parallel threads and the exact number of connections |

## What was not checked

- **Nothing ran on Snowflake.** The statements are exactly what dbt-snowflake generated. Nobody saw Snowflake accept or reject them. The hand-written SQL (setup scripts, restore commands, policies, resource monitors, history queries) was parsed or matched against the documented form, and never executed. Try it in a scratch schema of a trial account before you rely on it.
- **The stand-in answers from a state file I wrote.** It told dbt which schemas, tables and columns existed, per scenario. For example, the grants scenario assumes the table already had a grant to a role named OLD_ANALYST, and the incremental scenarios assume an existing `fct_orders` table with eight columns. Different answers would give different statements. `verify/capture_sf.py` lists every assumption.
- **Results and timings are placeholders.** The stand-in returns one row for an ordinary query, so every test passes and every duration is meaningless. The lessons use recorded **statements** only. Rows on a few screens are labeled as example rows.
- **`dbt debug` says "connection ok" because dbt reached the stand-in.** Against a real account it also proves the key, the account name and the network.
- **The number of connections depends on thread timing.** The recorded dev run opened the number the lesson quotes. A rerun can differ, and the check accepts that.
- **Snowflake behavior that dbt does not send** (Time Travel and UNDROP, the duplicate row error of a merge, clustering cost, dynamic table refreshes, masking at query time, resource monitors, secure view speed) comes from Snowflake's documentation as known when the course was written. The lessons say so, and the table below lists what to check.
- **The Python model** was recorded as the statement dbt sends. The Snowpark code in it never ran.
- **No `EXECUTE DBT PROJECT` syntax is shown.** The lesson names the feature and its documented status, and leaves the statement to the documentation.
- **The models were not run on Snowflake.** They are the DuckDB-tested models of the dbt course. dbt compiled them for Snowflake without error. If one fails on a real account, the compiled SQL in `target/compiled` is the place to look.

## Re-check before you rely on these

| Claim in the course | Where | What to check |
| --- | --- | --- |
| Credits an hour by warehouse size (XS 1, doubling each size), per second billing, 60 second minimum on every resume | Mission 4 | Snowflake documentation on warehouse credit usage. The price of $3 a credit is an example. Your contract sets the real price |
| A warehouse runs 8 statements at once by default (MAX_CONCURRENCY_LEVEL) | Mission 4 | Confirmed in Snowflake's documentation through a search summary. Check it for your warehouse type |
| Transient tables have no Fail-safe and 0 or 1 day of Time Travel. Permanent tables have 1 day by default, up to 90 on higher editions, plus 7 days of Fail-safe | Missions 2 and 7 | Documentation for your edition |
| UNDROP brings back the old version of a table that `create or replace` replaced, after you rename the new one | Missions 5 and 7 | Try it in a scratch schema. It is from the documentation and from practice, and it was not run here |
| A plain timestamp string in `at(timestamp => ...)` is read in the session time zone | Mission 7 | Documentation for Time Travel |
| A merge rejects two new rows that match one existing row, by default, with "Duplicate row detected during DML action" | Mission 3 | The documentation of the ERROR_ON_NONDETERMINISTIC_MERGE parameter |
| Secure views are required for secure data sharing and can run slower | Mission 6 | Documentation on secure views |
| Snowflake has announced limits on password-only sign-in | Mission 1 | The authentication policies of your own account |
| Snowflake enforces NOT NULL on standard tables and does not enforce primary key, unique or foreign key | Mission 2 | Documentation on constraints |
| The account usage query history lags by up to about 45 minutes, and has the columns the history query uses | Mission 4 | Documentation for QUERY_HISTORY |
| Resource monitor triggers: notify, suspend and suspend immediately | Mission 4 | The CREATE RESOURCE MONITOR page, found through search. Only the form of the statement was checked here |
| The default statement timeout is two days, and a queue timeout exists | Mission 8 | Documentation for the warehouse parameters |
| dbt Projects on Snowflake became generally available in November 2025, runs on a virtual warehouse at the usual compute price, and tasks can start a project | Mission 8 | Snowflake's release note and the supported commands page, found through search |
| Hosted dbt scheduler, Airflow and CI cron compared | Mission 8 | Product documentation. The comparison is general knowledge |
| A clone adds almost no storage until data changes, and a cloned table does not carry the original's grants unless asked | Mission 5 | Documentation on cloning |
| A dynamic table refreshes on the warehouse in its definition, even when dbt is idle | Mission 2 | Documentation on dynamic tables |
| Python models run as a Snowpark procedure with the packages your account offers | Mission 2 | Documentation for Python models on Snowflake |

Documentation pages that the research for this course reached through search summaries:

- [dbt Projects on Snowflake, general availability, 6 November 2025](https://docs.snowflake.com/en/release-notes/2025/other/2025-11-06-dbt-projects-on-snowflake-ga)
- [Working with resource monitors](https://docs.snowflake.com/en/user-guide/resource-monitors)
- [Limiting concurrently running queries](https://docs.snowflake.com/en/user-guide/performance-query-warehouse-max-concurrency)

## Run it yourself

1. Create a Snowflake trial or personal account. Run the setup scripts from missions 4 and 6, and the `create database` and `create schema` statements for BREWLINE, BREWLINE_DEV and BREWLINE_CI, in a worksheet.
```sql
create database if not exists BREWLINE;
create schema if not exists BREWLINE.RAW;
create database if not exists BREWLINE_DEV;
create database if not exists BREWLINE_CI;
```

2. Load the Brewline RAW tables. The files are in `dbt/verify/raw/*.csv`. Snowsight can load a file into a table, or you can use a stage and `copy into`.
3. Make a key pair for the service user and register the public key:

```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
```

   Then run `alter user DBT_SERVICE set rsa_public_key = '<the key without its header lines>';`.
4. Copy `dbt/verify/project` to a new folder. Put the profile from mission 1 in `~/.dbt/profiles.yml`, add `macros/generate_schema_name.sql` from mission 5, and add `database: BREWLINE` under the source in `models/staging/brewline/_brewline__sources.yml`. Set `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER` and `SNOWFLAKE_PRIVATE_KEY_PATH`.

```bash
pip install dbt-snowflake==1.12.5
dbt deps
dbt debug
dbt build
```

5. Suspend the warehouses and drop what you created when you finish.

## Record it again

```bash
pip install -r dev/requirements.txt
python3 snowflake-dbt/verify/capture_sf.py --dbt $(which dbt)       # about 4 minutes, writes js/real.js
python3 snowflake-dbt/verify/verify_sf.py --recapture                # checks the lessons and compares with a fresh recording
```

The recorder needs no account and no network. It replaces `snowflake.connector.connect` with a function that writes each statement to a file (`verify/stand_in/sitecustomize.py`), then runs dbt on a copy of the Brewline project in a temporary folder.

## Make it yours

- **Coach photo:** put a picture next to `js/config.js` and set `coachPhoto`. Leave it empty to keep the illustrated Coach Sam.
- **Titles, paths and the welcome text** are in `js/config.js`.
- **Lessons** are one file per mission in `js/content/`. Statements come from `LAB.get` helpers (`js/helpers.js`), which fail the lint when a key is missing, so a lesson cannot show a statement that was not recorded.

## Files

```
index.html                 the page
css/snowflake-dbt.css      styles for the labs
js/config.js               title, paths, welcome text, map chips
js/real.js                 everything recorded (generated, do not edit)
js/helpers.js              look-ups into js/real.js
js/graphs.js               diagram definitions
js/widgets.js              the four labs
js/content/                the lessons, one file per mission
verify/capture_sf.py       runs the project against the stand-in and writes js/real.js
verify/stand_in/           the recording stand-in for the Snowflake connection
verify/verify_sf.py        checks hand-written code, dbt flags, recorded facts and lab logic; --recapture
verify/check_widgets.js    lab logic against the recording and hand arithmetic
```

This is independent study material. It is not affiliated with or endorsed by Snowflake Inc. or dbt Labs.
