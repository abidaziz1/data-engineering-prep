# Snowflake: from first query to production

A guided, press-Next Snowflake course for data engineers. Coach Sam follows one small company, **Brewline**, an online coffee retailer, from its first table to a governed, tuned and delivered platform. You watch the data move, try the trade-offs in labs, solve problems, and answer the interview questions out loud.

Open **`index.html`** in a browser. No install, no account.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 320 | about 2.5 hours | Starting out, or interviewing for a junior role |
| **Senior** | 570 | about 5 hours | Everything in Junior, plus design choices, tuning, security, cost and operations |
| **Everything** | 599 | about 5.5 hours | Adds the newest features and the deepest follow-ups |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | How Snowflake works | 14 min | 20 min | 20 min |
| 2 | Warehouses and credits | 12 min | 23 min | 24 min |
| 3 | Getting data in | 15 min | 24 min | 25 min |
| 4 | Querying and JSON | 19 min | 30 min | 30 min |
| 5 | Time Travel, clones and recovery | 17 min | 21 min | 23 min |
| 6 | Pipelines inside Snowflake | 15 min | 27 min | 27 min |
| 7 | Why is it slow? | 9 min | 27 min | 27 min |
| 8 | Security and governance | 16 min | 29 min | 29 min |
| 9 | Sharing data | 3 min | 12 min | 13 min |
| 10 | Code, Iceberg and AI in Snowflake | 2 min | 15 min | 18 min |
| 11 | Where the money goes | 3 min | 16 min | 16 min |
| 12 | Environments and safe releases | 5 min | 16 min | 18 min |
| 13 | Boss round and cheat sheet | 22 min | 39 min | 49 min |

Missions 9 to 12 are mostly Senior material, so the Junior path only touches them. Mission 13 is a mock interview round drawn from the questions in the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet.

## What you work through

- **Follow one order.** Order `O-5001` goes from a source file into `RAW`, becomes the latest row in `CORE`, and ends in a mart that a dashboard and a partner both read.
- **11 animated diagrams and 1 terminal simulation.** Orange blocks move along numbered arrows: the whole platform on one page, the three layers, the life of a query, three ways to load, protection layers, a pipeline with a stream, a task graph, a query profile, role inheritance, sharing, the bill, and a delivery pipeline.
- **8 labs.** Size a warehouse and watch credits against runtime. Replay a 9 AM rush on a multi-cluster warehouse. Compare auto-suspend settings. Rescue deleted rows with Time Travel. Watch a zero-copy clone share partitions. Prune partitions. Test what each role may do. Switch roles to see masking.
- **23 SQL worksheets and 5 code walkthroughs.** A line-by-line explanation and a Run button that shows the result.
- **3 coding problems** (top-N per group, sessions from clicks, a reconciliation), **33 quizzes, 9 bug hunts, 7 ordering games, 11 architecture decisions with a recommended answer, and 8 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **22 interview questions**, each with a timer, a 60-second model answer (some with a 2-minute version), a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules) | Clean |
| Every frame on all three paths walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 320, 570 and 599 frames |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, worksheet, widget, terminal and boss question, plus keys, text size, Map, paths, saving and reset | 926 checks passed |
| SQL syntax | 113 statements. 75 parsed by `sqlglot` in the Snowflake dialect. The other 38 are Snowflake-only statements that `sqlglot` can only treat as opaque commands, so they were reviewed by hand |
| Worksheet results | 9 result tables were re-run in DuckDB and match |
| Python, YAML, JSON | 1 Python snippet compiles, 3 YAML snippets parse, 1 JSON snippet parses |

### What was not checked

- **No statement ran on Snowflake.** Results for Snowflake-only commands (`SHOW WAREHOUSES`, `COPY INTO`, `SYSTEM$PIPE_STATUS`, task and dynamic table history, grants, usage views and so on) are examples, and the welcome screen says so. The nine results that DuckDB can reproduce are real output.
- **The Snowflake documentation could not be opened** while this was built, because the build environment blocked the host. The long-standing facts (credit rates, retention periods, load history, caches, the role model) are written from stable documented behavior. Recent facts were checked only through search summaries.
- **Screenshots were reviewed for the key screens**, not for all 599 frames.

## Re-check before you rely on these

These are the claims most likely to be out of date, or that rest on secondary sources. Each one carries a "check the documentation" note in the lesson.

| Claim in the course | Where | What to check |
| --- | --- | --- |
| Gen2 standard warehouses became generally available in May 2025, and use roughly 1.25 to 1.35 times the credits of Gen1 | Mission 2 | The multipliers came from third-party sources. Confirm in Snowflake's Service Consumption Table |
| A newer `ADAPTIVE` dynamic table refresh mode exists | Mission 6 | The documentation lists it, but Snowflake's release notes called it a preview in May 2026. Confirm its status |
| DCM Projects were still listed as Preview in July 2026 | Mission 12 | Confirm whether it has reached general availability |
| Mandatory MFA for password sign-ins, and passwords disallowed for service users | Mission 8 | The final phase is listed for August to October 2026, enforced per account. Check your account's notice |
| `AI_CLASSIFY`, `AI_EXTRACT` and `AI_COMPLETE`, with several AI functions generally available in late 2025 | Mission 10 | Per-function status and regional availability were not confirmed |
| dbt Projects on Snowflake generally available since November 2025 | Mission 10 | Supported dbt versions change. It ran dbt Core 1.9.4 at launch |
| Second-generation Openflow deployments generally available on AWS and Azure on 8 September 2026 | Mission 3 | Confirm your cloud and region |
| Terraform resource names and schemachange flags | Mission 12 | Both change between versions. Read the documentation for the version you use |

## Practise on a real account

The course runs in your browser and never connects to Snowflake. The SQL is written to be typed into your own account, and typing it is what makes it stick. Snowflake offers a free trial. Start with Mission 1's first worksheet, then recreate the Brewline tables as you go.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only.
- **Replace the story.** The interview answers use general examples. Wherever a screen carries a "Make it yours" note, swap in a real story with real numbers.

## Files

```text
index.html             the page
css/snowflake.css      styles for the labs
js/config.js           title, paths, welcome text, map chips
js/graphs.js           diagram definitions
js/widgets.js          the eight labs
js/content/            00-start.js to 13-boss.js, one file per mission
verify/                DuckDB checks for the worksheet results
```
