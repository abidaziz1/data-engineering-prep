# Data Engineering Prep

Guided, press-Next tutorials for data engineering tools, written for junior and senior roles. Each tutorial follows one small company through a real pipeline. Diagrams show the data moving, labs let you try the trade-offs, and interview questions make you say the answers out loud.

No install. No account. No server. Open `index.html` in a browser and press **Next**.

## What is here

| Tutorial | Status | Folder |
| --- | --- | --- |
| **Snowflake**: from first query to production | Ready. 13 missions, 3 paths | [`snowflake/`](snowflake/README.md) |
| **dbt**: from first model to production | Ready. 13 missions, 3 paths, every output recorded from a real run | [`dbt/`](dbt/README.md) |
| **Snowflake and dbt together**: one pipeline, end to end | Ready. 10 missions, 3 paths, every statement dbt sends was recorded | [`snowflake-dbt/`](snowflake-dbt/README.md) |
| **Databricks and Azure Databricks**: from first notebook to production | Ready. 13 missions, 3 paths, Spark and Delta Lake output recorded from the open-source engines | [`databricks/`](databricks/README.md) |
| **AWS for data engineers**: from the first bucket to production | Ready. 13 missions, 3 paths, SDK output recorded against an open-source AWS emulator | [`aws/`](aws/README.md) |
| **Azure for data engineers**: from the first storage account to production | Ready. 14 missions, 3 paths, SDK output recorded against an open-source storage emulator, Spark and Delta Lake output recorded locally | [`azure/`](azure/README.md) |
| Planned, one tutorial each | GCP, Microsoft Fabric, Spark, Hadoop, Kafka, Flink, Airflow, Python, SQL, Scala, Java, Docker, Kubernetes, Terraform, Git, PostgreSQL, Oracle, MongoDB, Power BI, Tableau | |

Combined stacks come after the single tools. Snowflake with dbt is the first of them and is ready.

The order follows what job postings ask for most often. A check of 2026 postings found dbt, Airflow, Dynamic Tables and Cortex mentioned most for Snowflake roles, but it was a small sample. Treat it as a direction, not a statistic.

## How each tutorial teaches

Every mission uses the same rhythm.

| Step | What you do |
| --- | --- |
| **SEE** | Watch animated diagrams. Orange blocks move along numbered arrows, so you always see where data goes next. Follow one record through the layers. |
| **TRY** | Labs you can click, quizzes, bug hunts, ordering games, architecture decisions with a recommended answer, and coding problems with hints and checked solutions. |
| **SAY** | Interview questions with a timer. Answer out loud first, then compare with a model answer, tick the points you hit, and open the likely follow-ups. |

An illustrated coach talks you through every step: Sam teaches Snowflake, dbt, Databricks, AWS and Snowflake with dbt, and Noor teaches Azure. Text is large and dark, and the **A-** and **A+** buttons change the size.

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
2. Double-click **`index.html`**, or open **`snowflake/index.html`**, **`dbt/index.html`**, **`databricks/index.html`**, **`aws/index.html`**, **`azure/index.html`** or **`snowflake-dbt/index.html`** directly.

It works from `file://` and from any web server, because every path is relative and there are no modules.

## Publish on GitHub Pages

1. Push this repository to GitHub and merge to `main`.
2. Open **Settings, Pages**. Under **Build and deployment**, choose one of:
   - **Source: GitHub Actions.** The included `.github/workflows/pages.yml` publishes everything except the check tools. Run it once from the **Actions** tab if you want it right away.
   - **Source: Deploy from a branch**, branch `main`, folder `/ (root)`. This also works, because `.nojekyll` is present.
3. The library is at `https://<your-user>.github.io/<repository-name>/`, Snowflake is under `/snowflake/`, dbt is under `/dbt/`, Databricks is under `/databricks/`, AWS is under `/aws/`, Azure is under `/azure/` and Snowflake with dbt is under `/snowflake-dbt/`.

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
databricks/              one tutorial, same layout, plus
  js/real.js               query plans, Delta logs, tables and errors recorded from open-source Spark and Delta Lake
  verify/capture_db.py     runs Spark, Delta Lake and Spark Declarative Pipelines and writes js/real.js
  verify/verify_db.py      checks every snippet, the bundle schema, lab logic and, with --recapture, the recording
aws/                     one tutorial, same layout, plus
  js/real.js               SDK output, file sizes, catalog calls, templates and test runs recorded against an open-source AWS emulator
  verify/capture_aws.py    runs boto3 against moto, DuckDB, cfn-lint, parliament and pytest and writes js/real.js
  verify/verify_aws.py     checks every snippet, SQL statement, policy and template, the lab logic and, with --recapture, the recording
azure/                   one tutorial, same layout, plus
  js/real.js               SDK output, file layouts, handler tests, pipeline checks, Spark and Delta Lake output and infrastructure scans recorded with open-source tools
  verify/capture_az.py     runs the Azure SDK against Azurite, DuckDB, local Spark, Checkov and more and writes js/real.js
  verify/verify_az.py      checks every snippet, SQL statement, KQL query, template and az command, the lab logic and, with --recapture, the recording
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
node dev/analytics-test.js                # the optional visit counting, against a stub
                                          # the same commands work for dbt, databricks, aws, azure and snowflake-dbt
```

```bash
pip install -r dev/requirements.txt
python3 dev/verify_sql.py snowflake       # parses SQL, compiles Python, parses YAML and JSON, re-runs worksheets in DuckDB
python3 dbt/verify/verify_dbt.py          # dbt: syntax of hand-written snippets, lab logic; add --recapture to rerun dbt
python3 snowflake-dbt/verify/verify_sf.py # Snowflake and dbt: hand-written SQL, YAML and shell, dbt flags, lab logic; --recapture records again
python3 databricks/verify/verify_db.py    # Databricks: snippets, SDK and CLI schema checks, runs on local Spark and Delta Lake; --recapture records again
python3 aws/verify/verify_aws.py          # AWS: snippets checked against the SDK service model, runs against an emulator; --recapture records again
python3 azure/verify/verify_az.py         # Azure: snippets checked against the SDK, runs against an emulator, SQL, KQL, Bicep and az checks; --recapture records again
```

The AWS check also needs `npm install --prefix aws/verify`, which installs the Step Functions validator. The Azure check needs `npm install --prefix azure/verify`, which installs the storage emulator and the KQL parser. Its Spark, Checkov and Azure CLI checks use interpreters and tools named in [`azure/README.md`](azure/README.md), and a check whose tool is missing says so and is skipped.

`node dev/smoke.js snowflake --path all --width 390 --height 844` repeats the walk at phone width. `node dev/shot.js snowflake m2-lab:0 out.png --click "..."` saves a screenshot of one frame.

## Visit statistics (optional)

GitHub Pages shows no visitor numbers, and GitHub's repository traffic page counts only visits to the repository itself, for 14 days. This repository includes `shared/js/analytics.js`, which counts visits with [GoatCounter](https://www.goatcounter.com). It is off until you set a site code.

1. Create a free site at goatcounter.com. Choose a site code, for example `dep-prep`. Your dashboard is then `https://dep-prep.goatcounter.com`.
2. Open `shared/js/analytics.js`, set `var CODE = 'dep-prep';`, commit and publish. No other file changes.
3. Open the live site yourself once with `?notrack=1` added to the address on each of your own devices, so your visits are not counted. `?notrack=0` turns counting back on.

What it sends: a page view for the front page and for each tutorial, and three named events with no personal data: `<tutorial>/path-<id>` (the path a visitor chose), `<tutorial>/mission-<nn>` (the first time a visitor reaches a mission in a visit) and `<tutorial>/finished`. In the dashboard, the event list shows how many visits reached each mission, which is your drop-off curve. It never sends answers, scores, text or browser storage. It stays off on localhost and `file://` pages and when the browser sends Do Not Track. The front page tells visitors that visits are counted, and how to opt out.

`node dev/analytics-test.js` checks all of this against a stub of the GoatCounter script, so nothing leaves your machine. The test does not prove that GoatCounter accepts the hits. Open your dashboard after the first real visit to confirm.

## Add a tutorial

1. Copy `snowflake/` to a new folder and remove its `content/`, `verify/` and the diagram and widget bodies.
2. Edit `js/config.js`: a new `id` and `storageKey`, the welcome text, the three paths and the map chips. Set `coach` to give the tutorial its own coach (the Azure tutorial sets Noor, and the others keep Sam).
3. Write diagrams in `js/graphs.js`, labs in `js/widgets.js`, and one file per mission in `js/content/`. Give every scene a tier `t` of 1, 2 or 3. The lint refuses a mission that has no Junior content.
4. List each content file in the folder's `index.html`. The lint checks that you did.
5. Run the check tools above, then add the folder to the front page.

## Honest notes

- **Nothing was run on a live Snowflake account.** The SQL that DuckDB understands (joins, windows, `QUALIFY`, JSON paths, merge counts) was executed, and its result tables are real output. Snowflake-only statements (warehouses, stages, pipes, Time Travel, policies, tasks and so on) were checked against the documented syntax from memory and, where a parser could read them, by `sqlglot`. Their result tables are examples, and the welcome screen says so.
- **The dbt tutorial is different: its outputs are real.** Every log, compiled query and result table was recorded from dbt Core 1.12.6 running a real project on DuckDB, and `dbt/verify/capture.py` records them again. It is adapter-neutral, and nothing in it ran on Snowflake, Databricks or the dbt platform. The dbt documentation was also unreachable, so facts about dbt v2, Fusion and 1.12 come from release summaries. See [`dbt/README.md`](dbt/README.md).
- **The Snowflake and dbt tutorial records statements, not results.** Every SQL statement that dbt sends in it was recorded from dbt-snowflake 1.12.5 (dbt Core 1.12.6) running the Brewline project against a stand-in for the Snowflake connection (`snowflake-dbt/verify/stand_in`). The stand-in writes each statement down and answers dbt's metadata questions from a small state file. Nothing ran on a Snowflake account, so results, timings and credit figures in the lessons are examples, and the screens say so. Facts about Snowflake itself come from its public documentation as known when the course was written. The ones to check are listed in [`snowflake-dbt/README.md`](snowflake-dbt/README.md).
- **The Databricks tutorial records the open-source engines, not Databricks.** The Spark and Delta Lake output (query plans, Delta log files, `DESCRIBE HISTORY`, error messages, file counts, a bronze, silver and gold run, a declarative pipeline run and pytest runs) was recorded from Apache Spark 4.2.0 and Delta Lake 4.4.1 on one machine, and `databricks/verify/capture_db.py` records it again. Unity Catalog, Auto Loader, expectations, AUTO CDC on Delta, jobs, Photon, serverless compute, bundles and the Azure integration did not run anywhere. Those screens carry a "From documentation" tag. The Databricks documentation could not be opened, so their facts come from search summaries of the Databricks and Microsoft pages. Job and cluster JSON was checked against the Databricks Python SDK and the bundle file against the schema of Databricks CLI v1.25.0. The claims to re-check are listed in [`databricks/README.md`](databricks/README.md).
- **The AWS tutorial records the AWS SDK against an emulator, not AWS.** The SDK output (request signing, S3 listings and versions, policy decisions, Glue catalog calls, shard mapping, queue timelines, event patterns, KMS and secret versions, pytest runs of a Lambda handler, cfn-lint and parliament findings, CLI output) was recorded from boto3 and botocore 1.43.126 against moto 5.2.5, an open-source emulator of AWS services, and `aws/verify/capture_aws.py` records it again. The Athena scan sizes are computed from real file sizes and Parquet footers written with DuckDB, not read by Athena. The Redshift key lab is a model with made-up numbers, and the retry and bill labs are arithmetic on documented rules and example prices. Glue and EMR jobs, the Athena and Redshift engines, Kinesis under load, Step Functions runs, Lake Formation, KMS key policies and every price did not run anywhere. Those screens carry a "From documentation" tag. The AWS documentation could not be opened, so their facts come from search summaries and from the documentation text inside the SDK service models. Calls were checked against those models, policies with parliament, templates with cfn-lint and state machines with asl-validator. The claims to re-check are listed in [`aws/README.md`](aws/README.md).
- **The Azure tutorial records the Azure SDK against an emulator and open-source engines, not Azure.** The SDK output (SAS signing and refusals, listings, conditional writes, leases, queue timelines, the credential chain, Event Hubs batches and checkpoints, Event Grid events, Function handler tests, pipeline checks), the file layouts, watermark runs and bucket spreads (DuckDB and pyarrow), the Spark and Delta Lake output (Spark 4.0.1 and Delta Lake 4.0.1 on one machine), the envelope encryption, the Checkov scans and the workflow check were recorded on one machine, and `azure/verify/capture_az.py` records them again. The SDK is the real client library and Azurite is the storage emulator of Microsoft, which is not Azure. Data Factory, Synapse, Event Hubs under load, Key Vault, Entra ID, role assignments, private endpoints and every price did not run anywhere, and those screens carry a "From documentation" tag. The Bicep program was not run, only parsed and scanned. The Microsoft documentation could not be opened, so their facts come from search summaries and from the text inside the SDK. The claims to re-check are listed in [`azure/README.md`](azure/README.md).
- **The Snowflake documentation could not be opened** from the environment that built this, because its network policy blocked the host. Facts about recent features were checked through search summaries only, and the ones that need a second look are listed in [`snowflake/README.md`](snowflake/README.md).
- **The first site's SQL coloring did not color uppercase keywords.** This engine fixes that. The earlier Interview Quest repository still has the old behavior.
- The coach is an illustration. To use a photo, see the Snowflake README.
- No license file has been added yet. Choose one before you publish if you want others to reuse the work.
- This is independent study material. It is not affiliated with or endorsed by Snowflake Inc., dbt Labs or any other vendor named here.
