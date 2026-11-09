# Data Engineering Prep

Guided, press-Next tutorials for data engineering tools, written for junior and senior roles. Each tutorial follows one small company through a real pipeline. Diagrams show the data moving, labs let you try the trade-offs, and interview questions make you say the answers out loud.

No install. No account. No server. Open `index.html` in a browser and press **Next**.

## What is here

| Tutorial | Status | Folder |
| --- | --- | --- |
| **Snowflake**: from first query to production | Ready. 13 missions, 3 paths | [`snowflake/`](snowflake/README.md) |
| **dbt**: from first model to production | Ready. 13 missions, 3 paths, every output recorded from a real run | [`dbt/`](dbt/README.md) |
| **Snowflake and dbt together**: one pipeline, end to end | Ready. 10 missions, 3 paths, every statement dbt sends was recorded | [`snowflake-dbt/`](snowflake-dbt/README.md) |
| Databricks and Azure Databricks | **Next** | |
| AWS for data engineers | **Next** | |
| Planned, one tutorial each | Azure, GCP, Microsoft Fabric, Spark, Hadoop, Kafka, Flink, Airflow, Python, SQL, Scala, Java, Docker, Kubernetes, Terraform, Git, PostgreSQL, Oracle, MongoDB, Power BI, Tableau | |

Combined stacks come after the single tools. Snowflake with dbt is the first of them and is ready.

The order follows what job postings ask for most often. A check of 2026 postings found dbt, Airflow, Dynamic Tables and Cortex mentioned most for Snowflake roles, but it was a small sample. Treat it as a direction, not a statistic.

## How each tutorial teaches

Every mission uses the same rhythm.

| Step | What you do |
| --- | --- |
| **SEE** | Watch animated diagrams. Orange blocks move along numbered arrows, so you always see where data goes next. Follow one record through the layers. |
| **TRY** | Labs you can click, quizzes, bug hunts, ordering games, architecture decisions with a recommended answer, and coding problems with hints and checked solutions. |
| **SAY** | Interview questions with a timer. Answer out loud first, then compare with a model answer, tick the points you hit, and open the likely follow-ups. |

Coach Sam, an illustrated teacher, talks you through every step. Text is large and dark, and the **A-** and **A+** buttons change the size.

### Three paths

Choose a path on the first screen. You can switch at any time from the **Map** button.

| Path | For | Contains |
| --- | --- | --- |
| **Junior** | Starting out, or interviewing for a junior role | What a junior is asked about and expected to do |
| **Senior** | Interviewing for a senior role | Everything in Junior, plus design choices, tuning, security, cost and operations |
| **Everything** | The full tour | Adds the newest features and the deepest follow-up questions |

A small tag on a screen shows whether it belongs only to Senior or Extra. Times are estimates from reading and speaking each step.

## Open it

1. Download or clone this repository.
2. Double-click **`index.html`**, or open **`snowflake/index.html`**, **`dbt/index.html`** or **`snowflake-dbt/index.html`** directly.

It works from `file://` and from any web server, because every path is relative and there are no modules.

## Publish on GitHub Pages

1. Push this repository to GitHub and merge to `main`.
2. Open **Settings, Pages**. Under **Build and deployment**, choose one of:
   - **Source: GitHub Actions.** The included `.github/workflows/pages.yml` publishes everything except the check tools. Run it once from the **Actions** tab if you want it right away.
   - **Source: Deploy from a branch**, branch `main`, folder `/ (root)`. This also works, because `.nojekyll` is present.
3. The library is at `https://<your-user>.github.io/<repository-name>/`, Snowflake is under `/snowflake/`, dbt is under `/dbt/` and Snowflake with dbt is under `/snowflake-dbt/`.

Progress, XP and answers are stored in each visitor's own browser (`localStorage`), one key per tutorial.

## Layout

```text
index.html               the library front page
shared/                  the teaching engine, used by every tutorial
  css/app.css              all styling for tutorials
  css/hub.css              styling for the front page
  js/                      engine: scenes, diagrams, terminal, progress, map
  assets/                  fonts (SIL Open Font License) and favicon
snowflake/               one tutorial
  index.html               the page
  js/config.js             title, paths, welcome text, map chips
  js/graphs.js             diagram definitions (plain data)
  js/widgets.js            the interactive labs
  js/content/              the lessons, one file per mission
  verify/                  DuckDB checks for the worksheet results
dbt/                     one tutorial, same layout, plus
  js/real.js               everything recorded from a real dbt run
  verify/project/          the Brewline dbt project that produced it
  verify/capture.py        runs the project and writes js/real.js
snowflake-dbt/           the combined tutorial, same layout, plus
  js/real.js               every statement dbt-snowflake sent, in 43 scenarios
  verify/stand_in/         the stand-in for the Snowflake connection that recorded them
  verify/capture_sf.py     runs the Brewline project against it and writes js/real.js
dev/                     check tools (not published)
```

The engine is configuration driven. A new tutorial is a new folder with its own `config.js`, `graphs.js`, `widgets.js` and `content/` files.

## Check tools

The site has no build step. These scripts only check it. They need Node 20 or later, and Python for the SQL check.

```bash
npm install
npx playwright install chromium
```

```bash
node dev/lint-content.js snowflake        # ids, tiers, code line ranges, diagram references, writing rules
node dev/smoke.js snowflake --path all    # walks every frame: errors, overflow, text size, stray undefined
node dev/e2e.js snowflake                 # clicks every interactive element and asserts the result
node dev/stats.js snowflake               # minutes per mission and path, content counts
                                          # the same commands work for dbt and snowflake-dbt
```

```bash
pip install -r dev/requirements.txt
python3 dev/verify_sql.py snowflake       # parses SQL, compiles Python, parses YAML and JSON, re-runs worksheets in DuckDB
python3 dbt/verify/verify_dbt.py          # dbt: syntax of hand-written snippets, lab logic; add --recapture to rerun dbt
python3 snowflake-dbt/verify/verify_sf.py # Snowflake and dbt: hand-written SQL, YAML and shell, dbt flags, lab logic; --recapture records again
```

`node dev/smoke.js snowflake --path all --width 390 --height 844` repeats the walk at phone width. `node dev/shot.js snowflake m2-lab:0 out.png --click "..."` saves a screenshot of one frame.

## Add a tutorial

1. Copy `snowflake/` to a new folder and remove its `content/`, `verify/` and the diagram and widget bodies.
2. Edit `js/config.js`: a new `id` and `storageKey`, the welcome text, the three paths and the map chips.
3. Write diagrams in `js/graphs.js`, labs in `js/widgets.js`, and one file per mission in `js/content/`. Give every scene a tier `t` of 1, 2 or 3. The lint refuses a mission that has no Junior content.
4. List each content file in the folder's `index.html`. The lint checks that you did.
5. Run the check tools above, then add the folder to the front page.

## Honest notes

- **Nothing was run on a live Snowflake account.** The SQL that DuckDB understands (joins, windows, `QUALIFY`, JSON paths, merge counts) was executed, and its result tables are real output. Snowflake-only statements (warehouses, stages, pipes, Time Travel, policies, tasks and so on) were checked against the documented syntax from memory and, where a parser could read them, by `sqlglot`. Their result tables are examples, and the welcome screen says so.
- **The dbt tutorial is different: its outputs are real.** Every log, compiled query and result table was recorded from dbt Core 1.12.6 running a real project on DuckDB, and `dbt/verify/capture.py` records them again. It is adapter-neutral, and nothing in it ran on Snowflake, Databricks or the dbt platform. The dbt documentation was also unreachable, so facts about dbt v2, Fusion and 1.12 come from release summaries. See [`dbt/README.md`](dbt/README.md).
- **The Snowflake and dbt tutorial records statements, not results.** Every SQL statement that dbt sends in it was recorded from dbt-snowflake 1.12.5 (dbt Core 1.12.6) running the Brewline project against a stand-in for the Snowflake connection (`snowflake-dbt/verify/stand_in`). The stand-in writes each statement down and answers dbt's metadata questions from a small state file. Nothing ran on a Snowflake account, so results, timings and credit figures in the lessons are examples, and the screens say so. Facts about Snowflake itself come from its public documentation as known when the course was written. The ones to check are listed in [`snowflake-dbt/README.md`](snowflake-dbt/README.md).
- **The Snowflake documentation could not be opened** from the environment that built this, because its network policy blocked the host. Facts about recent features were checked through search summaries only, and the ones that need a second look are listed in [`snowflake/README.md`](snowflake/README.md).
- **The first site's SQL highlighter did not color uppercase keywords.** This engine fixes that. The earlier Interview Quest repository still has the old behavior.
- The coach is an illustration. To use a photo, see the Snowflake README.
- No license file has been added yet. Choose one before you publish if you want others to reuse the work.
- This is independent study material. It is not affiliated with or endorsed by Snowflake Inc., dbt Labs or any other vendor named here.
