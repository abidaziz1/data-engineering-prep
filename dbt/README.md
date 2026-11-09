# dbt: from first model to production

A guided, press-Next dbt course for data engineers and analytics engineers. Coach Sam follows one small company, **Brewline**, an online coffee retailer, from its raw tables to a tested, documented, deployed dbt project. You watch dbt compile and build, try the trade-offs in labs, solve problems, and answer the interview questions out loud.

Open **`index.html`** in a browser. No install, no account.

Every command output, compiled query and result table in the course was **recorded from a real run** of dbt Core 1.12.6 on DuckDB. Nothing on a screen that looks like output was typed by hand. Section "Run it yourself" shows how to get the same results on your laptop.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 432 | about 4 hours | Starting out, or interviewing for a junior or analytics engineer role |
| **Senior** | 604 | about 6 hours | Everything in Junior, plus design choices, performance, governance and delivery |
| **Everything** | 626 | about 6 hours | Adds the newest features and the deepest follow-ups |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | What dbt is | 18 min | 22 min | 22 min |
| 2 | Models, ref() and the graph | 18 min | 21 min | 21 min |
| 3 | Sources and staging | 17 min | 21 min | 21 min |
| 4 | Intermediate models and marts | 19 min | 24 min | 24 min |
| 5 | Jinja and macros | 17 min | 22 min | 22 min |
| 6 | Tests and data quality | 21 min | 37 min | 37 min |
| 7 | Materializations and incremental models | 18 min | 30 min | 30 min |
| 8 | Snapshots and history | 14 min | 23 min | 23 min |
| 9 | Docs, contracts and governance | 11 min | 21 min | 22 min |
| 10 | Run time, cost and selectors | 11 min | 18 min | 18 min |
| 11 | Environments and CI/CD | 20 min | 33 min | 33 min |
| 12 | Beyond SQL models | 10 min | 18 min | 22 min |
| 13 | Boss round and cheat sheet | 29 min | 52 min | 65 min |

Mission 13 has two drills that mix topics, a design decision, a mock interview of up to 26 questions drawn from the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet.

## What you work through

- **Follow one order.** Order `O-5001` goes from two rows in `raw.orders` to a staging view, an intermediate model, the `fct_orders` fact table and a daily revenue mart that a dashboard reads. Day two of the data changes an order and adds another, so you watch incremental models and snapshots do their work.
- **6 animated diagrams.** The whole project, the life of a `dbt build`, the graph of 16 nodes, an incremental run, a snapshot, and slim CI. The graph also lights up while a terminal replay runs, so you see which node is running, finished, failed or skipped.
- **27 terminal replays of real dbt logs.** A full build, a build with four failing tests, a unit test diff, a contract error, an access error, a skipped cascade and the `dbt retry` that fixes it, source freshness warnings, slim CI with and without defer, and more.
- **8 labs.** Pick a selector and see what `dbt ls` returns. Compare Jinja with the SQL it compiles to. Run day two with five incremental strategies. Replay a snapshot. Match nine data problems to the check that catches them. See where `generate_schema_name` builds. Watch a join double revenue. Change the thread count against the longest chain.
- **39 code walkthroughs.** Line-by-line highlights of the real project files, with the compiled SQL beside them where it helps, and a Run button that shows the result.
- **5 coding problems.** Every solution was run by dbt, and the result table is real output.
- **28 quizzes, 9 bug hunts, 6 ordering games, 13 architecture decisions with a recommended answer, and 6 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **28 interview questions**, each with a timer, a 60-second model answer (some with a 2-minute version), a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, and the graph diagram against the manifest dbt wrote) | Clean. 14 chapters, 272 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 432, 604 and 626 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, worksheet, lab, terminal and boss question, plus keys, text size, Map, paths, saving and reset. Six labs are also replayed in the browser against recorded dbt output | 1,022 checks passed |
| Recorded output (`dbt/verify/capture.py`) | 74 command logs, 36 compiled or run SQL files, 64 result tables and 24 selector results from 48 scenarios, all produced by dbt on this project |
| Code in the lessons (`dbt/verify/verify_dbt.py`) | 61 snippets are copied from the real project or from dbt output. 8 are written by hand for bug hunts and fixes, and their syntax is checked. This check found a real YAML mistake in the CI workflow, which was fixed |
| Lab logic (`dbt/verify/check_widgets.js`) | 62 checks. The snapshot lab reproduces both real snapshot runs row by row, the schema rule matches the four real runs, and every piece of test evidence exists in a real log |
| Recapture | `python3 dbt/verify/verify_dbt.py --recapture` runs the project again and compares it with the recording. It ignores timings, run-time dates and hashes |

### What was not checked

- **Nothing ran on Snowflake, Databricks or the dbt platform.** The course is adapter-neutral and every run was on DuckDB. The Snowflake specifics are in the combined Snowflake and dbt course.
- **The dbt documentation could not be opened** while this was built, because the build environment blocked the host. Facts about dbt v2, the Fusion engine, dbt Core 1.12 and the company behind dbt come from release summaries and search results. The version banner that dbt Core printed is real and is quoted in the lesson.
- **The CI workflow and the grants example are illustrative.** The workflow file was parsed as YAML but never run, and DuckDB has no roles, so the grants example never ran. The dbt commands they contain were run in other scenarios.
- **The Python model ran on DuckDB with pandas.** On Snowflake or Databricks the same idea needs different code.
- **`dbt docs generate` ran, `dbt docs serve` did not.** The site itself was not opened.
- **Screenshots were reviewed for the key screens**, not for all 626 frames.

## Re-check before you rely on these

These claims are the most likely to be out of date, or rest on secondary sources. Each one carries a "check the documentation" note in the lesson.

| Claim in the course | Where | What to check |
| --- | --- | --- |
| dbt Core 1.12 added an opt-in faster parser (`--use-v2-parser`), an `on_error` model setting and semantic layer updates | Missions 1 and 12 | Read the 1.12 release notes. Only the version number is verified |
| dbt v2 and the Fusion engine are the default for new installs, with availability and licensing that differ by warehouse | Missions 1 and 12 | The banner text is real. The rest came from search summaries that disagreed on status and license |
| Fivetran and dbt Labs completed their merger in mid 2026, and dbt Core stays open source under Apache 2.0 | Mission 12 | Confirm with a primary source |
| Cross-project references (dbt Mesh) belong to the hosted platform | Mission 9 | Confirm which plan includes them |
| `dbt Projects on Snowflake`, Cosmos for Airflow and the Dagster integration | Mission 11 | Features and supported dbt versions change |
| Python models support only table and incremental materializations | Mission 12 | Check the adapter documentation |
| Environment variables with the `DBT_ENV_SECRET_` prefix stay out of logs | Mission 5 | Check the documentation for your version |
| The release in which unit tests, microbatch and YAML snapshots first appeared (1.8, 1.9, 1.9) | Missions 6, 7 and 8 | They ran on 1.12.6. The first release for each is from memory |
| Selecting sources by freshness status, and the `--favor-state` flag | Missions 3 and 11 | Described as "check the documentation" in the lessons |

## Run it yourself

The course never connects to a warehouse, but the project behind it is a real dbt project.

```bash
pip install -r dev/requirements.txt
cd dbt/verify/project
python3 ../setup_raw.py brewline.duckdb
dbt deps --profiles-dir .
dbt build --profiles-dir . --target prod
```

`setup_raw.py` loads the four raw tables from `dbt/verify/raw`. `day2.py` appends the second day of data, so you can run `dbt build` again and watch the incremental model and the snapshot. `capture.py` repeats every scenario in the course and rewrites `dbt/js/real.js`.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `LAB.get`, which reads `js/real.js`.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only.
- **Replace the story.** The interview answers use general examples. Wherever a screen carries a "Make it yours" note, swap in a real story with real numbers.
- **Update the recording.** After a dbt upgrade, run `python3 dbt/verify/capture.py`, then the lint. A lesson that quotes something that changed fails loudly.

## Files

```text
index.html             the page
css/dbt.css            styles for the labs
js/config.js           title, paths, welcome text, map chips
js/real.js             everything recorded from dbt: files, logs, compiled SQL, tables, selector results
js/helpers.js          LAB.get: reads real.js and fails when a key is missing
js/graphs.js           six diagrams, plain data
js/widgets.js          the eight labs
js/content/            00-start.js to 13-boss.js, one file per mission
verify/project/        the Brewline dbt project that every output came from
verify/raw/            the four raw tables as CSV
verify/capture.py      runs the project and writes js/real.js
verify/verify_dbt.py   checks snippets, lab logic and, with --recapture, the recording
verify/check_widgets.js  checks the labs against the recording
```
