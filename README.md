# Data Engineering Prep

Guided, press-Next tutorials for data engineering tools, written for junior and senior roles. Each tutorial follows one small company through a real pipeline. Diagrams show the data moving, labs let you try the trade-offs, and interview questions make you say the answers out loud.

No install. No account. No server. Open `index.html` in a browser and press **Next**.

## What is here

| Tutorial | Status | Folder |
| --- | --- | --- |
| **Snowflake**: from first query to production | Ready. 13 missions, 3 paths | [`snowflake/`](snowflake/README.md) |
| **dbt**: from first model to production | Ready. 13 missions, 3 paths, every output recorded from a real run | [`dbt/`](dbt/README.md) |
| **Snowflake and dbt together**: one pipeline, end to end | Ready. 10 missions, 3 paths, every statement dbt sends was recorded | [`snowflake-dbt/`](snowflake-dbt/README.md) |
| **Python for data engineers**: from a script to a pipeline you can trust | Ready. 15 missions, 3 paths, every output recorded from real runs of Python 3.14, pandas, Polars, DuckDB, SQLite, pydantic, pytest and uv | [`python/`](python/README.md) |
| **SQL for data engineers**: from SELECT to a plan you can read | Ready. 14 missions, 3 paths, 41 coding rounds, query results, plans and two-session transcripts recorded on DuckDB, PostgreSQL 16 and SQLite. Seven other dialects are translated, not run, and the screens say so | [`sql/`](sql/README.md) |
| **Apache Airflow for data engineers**: from a first DAG to a pipeline you can operate | Ready. 14 missions, 3 paths, runs, states, schedules, logs and test results recorded from Apache Airflow 3.4.0 on one machine | [`airflow/`](airflow/README.md) |
| **Databricks and Azure Databricks**: from first notebook to production | Ready. 13 missions, 3 paths, Spark and Delta Lake output recorded from the open-source engines | [`databricks/`](databricks/README.md) |
| **AWS for data engineers**: from the first bucket to production | Ready. 13 missions, 3 paths, SDK output recorded against an open-source AWS emulator | [`aws/`](aws/README.md) |
| **Azure for data engineers**: from the first storage account to production | Ready. 14 missions, 3 paths, SDK output recorded against an open-source storage emulator, Spark and Delta Lake output recorded locally | [`azure/`](azure/README.md) |
| **AI data engineering and agentic AI**: from a PDF to a production agent | Ready. 15 missions, 3 paths, parsers, vector indexes, SDK retries, agent graphs, an MCP server and a SQL guard recorded from open-source tools. No language model was used, and the screens say what is a stand-in | [`ai/`](ai/README.md) |
| **Google Cloud for data engineers**: from a bucket to a model | Ready. 15 missions, 3 paths, client output, SQL results, Beam panes, Spark plans, DAG runs and Terraform scans recorded offline with open-source tools. Nothing ran on Google Cloud, and the screens say so | [`gcp/`](gcp/README.md) |
| **Apache Spark for data engineers**: from a query plan to production | Ready. 15 missions, 3 paths, plans, task counts, shuffle sizes, skew, spill, file layouts, streaming batches, Delta Lake and pytest runs read from the event log of a real Spark 4.0.1 in local mode. No cluster ran, and the screens say so | [`spark/`](spark/README.md) |
| **Apache Kafka for data engineers**: from a record on disk to production | Ready. 15 missions, 3 paths, partition files, offsets, elections, lost records, rebalances, transactions, compaction, Connect, Debezium events, Avro results, Streams state, ACL errors, JMX metrics and pytest runs read from a real Apache Kafka 4.4.0 with three brokers on one machine. No network, cloud or managed service ran, and the screens say so | [`kafka/`](kafka/README.md) |
| **Apache Flink for data engineers**: the basics | Ready. 9 missions, 3 paths, 8 labs, 2 coding rounds, plans, slots, changelogs, windows, checkpoints, a killed TaskManager, savepoints, join state, key groups and backpressure metrics read from a real Apache Flink 2.2.1 (one JobManager and two TaskManagers) on one machine. No network, Kubernetes, YARN or managed service ran, and the screens say so | [`flink/`](flink/README.md) |
| Planned, one tutorial each | Microsoft Fabric, Hadoop, Scala, Java, Docker, Kubernetes, Terraform, Git, PostgreSQL, Oracle, MongoDB, Power BI, Tableau | |

Combined stacks come after the single tools. Snowflake with dbt is the first of them and is ready.

The order follows what job postings ask for most often. A check of 2026 postings found dbt, Airflow, Dynamic Tables and Cortex mentioned most for Snowflake roles, but it was a small sample. Treat it as a direction, not a statistic.

## How each tutorial teaches

Every mission uses the same rhythm.

| Step | What you do |
| --- | --- |
| **SEE** | Watch animated diagrams. Orange blocks move along numbered arrows, so you always see where data goes next. Follow one record through the layers. |
| **TRY** | Labs you can click, quizzes, bug hunts, ordering games, architecture decisions with a recommended answer, and coding problems with hints and checked solutions. |
| **SAY** | Interview questions with a timer. Answer out loud first, then compare with a model answer, tick the points you hit, and open the likely follow-ups. |

An illustrated coach talks you through every step. Sam teaches Snowflake, dbt, Databricks, AWS and Snowflake with dbt. Noor teaches Azure, Ada teaches AI data engineering, Ravi teaches Google Cloud, Kai teaches Spark, Mara teaches Kafka, Ines teaches Flink, Lena teaches Python, Tomas teaches SQL and Juno teaches Airflow. Text is large and dark, and the **A-** and **A+** buttons change the size.

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
2. Double-click **`index.html`** and select a tutorial, or open a tutorial's own `index.html` directly.

It works from `file://` and from any web server, because every path is relative and there are no modules.

## Publish on GitHub Pages

1. Merge updates into `claude/snowflake-tutorial`, this repository's default branch.
2. Open **Settings, Pages**. Under **Build and deployment**, choose one of:
   - **Source: GitHub Actions.** The included `.github/workflows/pages.yml` publishes the site when the default branch changes. You can also run it from the **Actions** tab.
   - **Source: Deploy from a branch**, select `claude/snowflake-tutorial` and `/ (root)`. The `.nojekyll` file allows direct static publishing.
3. Open the [tutorial library](https://abidaziz1.github.io/data-engineering-prep/) to reach every course.

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
ai/                      one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 18 of them
  js/real.js               parsers, chunkers, indexes, pgvector plans, SDK retries, agent runs, MCP wire logs, SQL guard results, spans and tests, recorded with open-source tools
  verify/capture_ai.py     runs the real tools on generated Brewline documents and writes js/real.js (no language model is used)
  verify/verify_ai.py      checks every snippet, runs the lesson modules and the tests of the agent again, checks the lab logic and, with --recapture, the recording
gcp/                     one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 15 of them
  js/real.js               client output, SQL results, Beam panes, Spark plans, DAG runs, Dataform and Terraform scans, recorded offline with open-source tools
  verify/capture_gcp.py    runs the real tools (storage emulator, DuckDB, Beam, PySpark, Airflow, Checkov and more) and writes js/real.js
  verify/verify_gcp.py     checks every snippet, runs the SQL again, checks every flag against the help pages, checks the lab data and, with --recapture, the recording
spark/                   one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 12 of them
  js/real.js               plans, task and shuffle numbers from the event log, file layouts, SQL results, UDF plans, streaming batches, Delta Lake and pytest runs, recorded on a real Spark 4.0.1 in local mode
  verify/capture_spark.py  runs PySpark, Delta Lake, pytest and spark-submit on generated Brewline data and writes js/real.js (nothing is timed)
  verify/verify_spark.py   checks every snippet, runs the lesson SQL again in Spark, checks every spark-submit flag, checks the lab data and, with --recapture, the recording
kafka/                   one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 12 of them
  js/real.js               partition files and indexes, offsets, elections, lost records, rebalances, transactions, compaction, Connect, Debezium events, Avro results, Streams state, ACL errors, JMX metrics and pytest runs, recorded on a real Apache Kafka 4.4.0 with three brokers on one machine
  verify/capture_kafka.py  runs the brokers, Connect, Streams, PostgreSQL with Debezium and the clients on generated Brewline data and writes js/real.js (nothing is timed)
  verify/verify_kafka.py   checks every snippet and every client setting, compiles the Java, checks the shell flags and the Avro schemas, works out the results that need no cluster again, checks the lab data and, with --live or --recapture, runs more
snowflake-dbt/           the combined tutorial, same layout, plus
  js/real.js               every statement dbt-snowflake sent, in 43 scenarios
  verify/stand_in/         the stand-in for the Snowflake connection that recorded them
  verify/capture_sf.py     runs the Brewline project against it and writes js/real.js
python/                  one tutorial, same layout, plus
  js/real.js             output, sizes, timings and counts recorded from Python 3.14, pandas, Polars, DuckDB, SQLite, pydantic, pytest, mypy, ruff and uv
  verify/capture_py.py   runs the lesson programs, a fake partner API, benchmarks and a free-threaded build, and writes js/real.js
  verify/verify_py.py    runs every coding round again, checks the controls and the lab logic and, with --recapture, the recording
  verify/check_widgets.js, verify/e2e_labs.js   recompute the 17 labs independently, and drive them in the browser
sql/                     one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 15 of them
  js/real.js               query results, plans, transcripts of two PostgreSQL sessions and sqlglot translations, recorded on DuckDB, PostgreSQL and SQLite
  verify/capture_sq.py     starts a PostgreSQL server, runs the three engines on the Brewline data and writes js/real.js
  verify/verify_sq.py      checks every snippet, runs every query and coding round again, checks the lab data and, with --recapture, the recording
airflow/                 one tutorial, same layout, plus
  js/real.js               DAG runs, task states, schedules, logs, metadata tables, command output and test runs recorded from Apache Airflow 3.4.0
  verify/capture_af.py     runs Airflow 3.4.0 (scheduler, DAG processor, API server, triggerer, LocalExecutor, SQLite), DAGs, pytest and ruff, and writes js/real.js
  verify/verify_af.py      checks every snippet against the installed Airflow, runs DAGs and tests again, checks the lab logic and the labs in a browser and, with --recapture, the recording
flink/                   one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 8 of them
  js/real.js               plans, slots, changelogs, windows, checkpoints, savepoints, join state, key groups, backpressure metrics, Kafka and change data capture results, recorded on a real Apache Flink 2.2.1 on one machine
  verify/capture_flink.py  runs a Flink cluster (one JobManager and two TaskManagers), Kafka, PostgreSQL and the Java jobs on generated Brewline data and writes js/real.js (nothing is timed)
  verify/verify_fl.py      checks every snippet, command flag and configuration key, compiles the Java, runs the SQL, the bug hunts and the coding rounds on a real cluster, checks the lab data and, with --recapture, the recording
  verify/e2e_labs.js       drives the eight labs in a browser against values worked out by hand
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
node dev/smoke.js snowflake --path all    # walks every frame: errors, overflow, text size, stray undefined, markup shown as text
node dev/e2e.js snowflake                 # clicks every interactive element and asserts the result
node dev/stats.js snowflake               # minutes per mission and path, content counts
node dev/analytics-test.js                # the optional visit counting, against a stub
                                          # the same commands work for every tutorial folder
```

```bash
pip install -r dev/requirements.txt
python3 dev/verify_sql.py snowflake       # parses SQL, compiles Python, parses YAML and JSON, re-runs worksheets in DuckDB
python3 dbt/verify/verify_dbt.py          # dbt: syntax of hand-written snippets, lab logic; add --recapture to rerun dbt
python3 snowflake-dbt/verify/verify_sf.py # Snowflake and dbt: hand-written SQL, YAML and shell, dbt flags, lab logic; --recapture records again
python3 databricks/verify/verify_db.py    # Databricks: snippets, SDK and CLI schema checks, runs on local Spark and Delta Lake; --recapture records again
python3 aws/verify/verify_aws.py          # AWS: snippets checked against the SDK service model, runs against an emulator; --recapture records again
python3 python/verify/verify_py.py        # Python: every coding round runs again, controls, lab logic; needs the Python 3.14 environment of python/verify/requirements-py.txt (see python/README.md); --recapture records again
python3 sql/verify/verify_sq.py           # SQL: snippets read by sqlglot, queries and coding rounds run again on DuckDB, PostgreSQL and SQLite, lab logic; needs the PostgreSQL 16 server programs or SQ_PG_DSN (see sql/README.md); --recapture records again, --browser adds the lab tests
python3 airflow/verify/verify_af.py       # Airflow: snippets checked against the installed Airflow 3.4.0, DAGs and pytest projects run again, ruff AIR rules, every command and option checked against its help, labs driven in a browser; --recapture records again
python3 azure/verify/verify_az.py         # Azure: snippets checked against the SDK, runs against an emulator, SQL, KQL, Bicep and az checks; --recapture records again
python3 ai/verify/verify_ai.py            # AI: snippets checked against the SDKs, modules and agent tests run again, SQL guard, lab logic; --recapture records again
python3 gcp/verify/verify_gcp.py          # GCP: snippets checked against the client libraries, SQL run again in DuckDB, every flag checked against the help pages, lab data; --recapture records again
spark-env/bin/python spark/verify/verify_spark.py   # Spark: snippets, lesson SQL run again in Spark, spark-submit flags, lab data; --recapture records again. Needs its own environment: see spark/verify/requirements.txt
kafka-env/bin/python kafka/verify/verify_kafka.py   # Kafka: snippets, client settings, Java, tool flags, Avro, results worked out again, lab data; --live runs the bug hunts on a cluster, --recapture records again. Needs its own environment and KAFKA_HOME: see kafka/verify/requirements.txt
flink-env/bin/python flink/verify/verify_fl.py   # Flink: snippets, command flags and configuration keys checked against the real distribution and its documentation, Java compiled, SQL, bug hunts and coding rounds run on a real cluster, lab data; --browser drives the labs, --recapture records again. Needs Java 17 or 21, FLINK_HOME, FLINK_DOCS, FLINK_KAFKA_JAR, FLINK_CDC_JAR and KAFKA_HOME: see flink/verify/requirements.txt
```

The AWS check also needs `npm install --prefix aws/verify`, which installs the Step Functions validator. The Azure check needs `npm install --prefix azure/verify`, which installs the storage emulator and the KQL parser. Its Spark, Checkov and Azure CLI checks use interpreters and tools named in [`azure/README.md`](azure/README.md), and a check whose tool is missing says so and is skipped. The GCP check needs `npm install --prefix gcp/verify` for the Dataform compiler, and it reads the interpreters for Airflow, Spark and Checkov from `GCP_AIRFLOW_PYTHON`, `GCP_SPARK_PYTHON` and `GCP_IAC_PYTHON` (see [`gcp/README.md`](gcp/README.md)).

The Airflow check needs Apache Airflow 3.4.0 in its own environment, because the official constraints file pins several hundred packages: create it as the comment in `dev/requirements.txt` says and name its interpreter in `AF_PYTHON`. It needs no `npm install --prefix`. The lab tests need Playwright and Chromium, which the other checks already use; `--no-browser` skips them.

The Flink check needs an unpacked Apache Flink 2.2.1 binary distribution, the docs folder of its source release, the two connector jars (Maven Central), an unpacked Apache Kafka 4.4.0 and the PostgreSQL 16 server programs; name them in `FLINK_HOME`, `FLINK_DOCS`, `FLINK_KAFKA_JAR`, `FLINK_CDC_JAR` and `KAFKA_HOME` as `flink/verify/requirements.txt` says. It needs no `npm install --prefix`. The lab tests (`--browser`) need Playwright and Chromium, which the other checks already use. A check whose tool is missing says so and is skipped.

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
2. Edit `js/config.js`: a new `id` and `storageKey`, the welcome text, the three paths and the map chips. Set `coach` to give the tutorial its own coach (Azure sets Noor, AI sets Ada, and the others keep Sam). A tutorial with many labs can split them over `widgets.js` and `widgets2.js`.
3. Write diagrams in `js/graphs.js`, labs in `js/widgets.js`, and one file per mission in `js/content/`. Give every scene a tier `t` of 1, 2 or 3. The lint refuses a mission that has no Junior content.
4. List each content file in the folder's `index.html`. The lint checks that you did.
5. Run the check tools above, then add the folder to the front page.

## Honest notes

- **Nothing was run on a live Snowflake account.** The SQL that DuckDB understands (joins, windows, `QUALIFY`, JSON paths, merge counts) was executed, and its result tables are real output. Snowflake-only statements (warehouses, stages, pipes, Time Travel, policies, tasks and so on) were checked against the documented syntax from memory and, where a parser could read them, by `sqlglot`. Their result tables are examples, and the welcome screen says so.
- **The dbt tutorial is different: its outputs are real.** Every log, compiled query and result table was recorded from dbt Core 1.12.6 running a real project on DuckDB, and `dbt/verify/capture.py` records them again. It is adapter-neutral, and nothing in it ran on Snowflake, Databricks or the dbt platform. The dbt documentation was also unreachable, so facts about dbt v2, Fusion and 1.12 come from release summaries. See [`dbt/README.md`](dbt/README.md).
- **The Snowflake and dbt tutorial records statements, not results.** Every SQL statement that dbt sends in it was recorded from dbt-snowflake 1.12.5 (dbt Core 1.12.6) running the Brewline project against a stand-in for the Snowflake connection (`snowflake-dbt/verify/stand_in`). The stand-in writes each statement down and answers dbt's metadata questions from a small state file. Nothing ran on a Snowflake account, so results, timings and credit figures in the lessons are examples, and the screens say so. Facts about Snowflake itself come from its public documentation as known when the course was written. The ones to check are listed in [`snowflake-dbt/README.md`](snowflake-dbt/README.md).
- **The Databricks tutorial records the open-source engines, not Databricks.** The Spark and Delta Lake output (query plans, Delta log files, `DESCRIBE HISTORY`, error messages, file counts, a bronze, silver and gold run, a declarative pipeline run and pytest runs) was recorded from Apache Spark 4.2.0 and Delta Lake 4.4.1 on one machine, and `databricks/verify/capture_db.py` records it again. Unity Catalog, Auto Loader, expectations, AUTO CDC on Delta, jobs, Photon, serverless compute, bundles and the Azure integration did not run anywhere. Those screens carry a "From documentation" tag. The Databricks documentation could not be opened, so their facts come from search summaries of the Databricks and Microsoft pages. Job and cluster JSON was checked against the Databricks Python SDK and the bundle file against the schema of Databricks CLI v1.25.0. The claims to re-check are listed in [`databricks/README.md`](databricks/README.md).
- **The AWS tutorial records the AWS SDK against an emulator, not AWS.** The SDK output (request signing, S3 listings and versions, policy decisions, Glue catalog calls, shard mapping, queue timelines, event patterns, KMS and secret versions, pytest runs of a Lambda handler, cfn-lint and parliament findings, CLI output) was recorded from boto3 and botocore 1.43.126 against moto 5.2.5, an open-source emulator of AWS services, and `aws/verify/capture_aws.py` records it again. The Athena scan sizes are computed from real file sizes and Parquet footers written with DuckDB, not read by Athena. The Redshift key lab is a model with made-up numbers, and the retry and bill labs are arithmetic on documented rules and example prices. Glue and EMR jobs, the Athena and Redshift engines, Kinesis under load, Step Functions runs, Lake Formation, KMS key policies and every price did not run anywhere. Those screens carry a "From documentation" tag. The AWS documentation could not be opened, so their facts come from search summaries and from the documentation text inside the SDK service models. Calls were checked against those models, policies with parliament, templates with cfn-lint and state machines with asl-validator. The claims to re-check are listed in [`aws/README.md`](aws/README.md).
- **The Python tutorial records one shared machine.** Every output was run on Python 3.14.6 with the library versions in `python/js/real.js`. Timings are medians on a 4-core machine that other programs were using, so the lessons teach ratios and say "on this machine". The partner API is a small fake that runs in a thread, SQLite stands in for a database, a sleep stands in for a network wait in the concurrency lab, and the fifty-client retry lab is a simulation, and each says so on screen. The GitHub workflow file was shown and checked against the SchemaStore schema, and it was not run. Docker, Kubernetes, Great Expectations and the cloud services are not run.
- **The SQL tutorial records three engines, not ten.** Query results, plans and two-session transcripts come from DuckDB 2.0.0, PostgreSQL 16.15 (a real server that the recorder starts and stops) and SQLite 3.53.1, on made-up data. sqlglot translated nine queries for ten dialects. Snowflake, BigQuery, Redshift, MySQL, SQL Server, Oracle and Spark SQL did not run, and their screens say "translated, not run". No time is recorded, and the plans depend on settings chosen so that they repeat: no parallel workers, no JIT, a statistics target of 1,000. The isolation lessons show PostgreSQL only. The PostgreSQL 16.15 recording may be one minor version behind: a draft announcement of 12 November 2026 names 16.16.
- **The Airflow tutorial records Apache Airflow 3.4.0 on one machine, not a production deployment.** The DAG runs, task states, schedules, logs, metadata tables, command output and pytest and ruff runs were recorded from Apache Airflow 3.4.0 (Task SDK 1.4.0) with the API server, scheduler, DAG processor and triggerer running, the LocalExecutor and a SQLite metadata database, on Python 3.12, and `airflow/verify/capture_af.py` records it again. The dates in the recording are shifted to 14 March 2026 so that the retry jitter is reproducible. Celery and Kubernetes executors, PostgreSQL and MySQL, secrets backends, Git bundles, managed services (Amazon MWAA, Google Cloud Composer, Astronomer) and the move from Airflow 2 are described from documentation, and the screens carry that tag. Three labs are models that were checked against the recording: the retry delay, the capacity of pools and limits, and the parse pass. The Airflow documentation website could not be opened while this was built: the lessons use the documentation source files from the Apache Airflow repository, search summaries of the pages of managed services, and the release notes.
- **The Azure tutorial records the Azure SDK against an emulator and open-source engines, not Azure.** The SDK output (SAS signing and refusals, listings, conditional writes, leases, queue timelines, the credential chain, Event Hubs batches and checkpoints, Event Grid events, Function handler tests, pipeline checks), the file layouts, watermark runs and bucket spreads (DuckDB and pyarrow), the Spark and Delta Lake output (Spark 4.0.1 and Delta Lake 4.0.1 on one machine), the envelope encryption, the Checkov scans and the workflow check were recorded on one machine, and `azure/verify/capture_az.py` records them again. The SDK is the real client library and Azurite is the storage emulator of Microsoft, which is not Azure. Data Factory, Synapse, Event Hubs under load, Key Vault, Entra ID, role assignments, private endpoints and every price did not run anywhere, and those screens carry a "From documentation" tag. The Bicep program was not run, only parsed and scanned. The Microsoft documentation could not be opened, so their facts come from search summaries and from the text inside the SDK. The claims to re-check are listed in [`azure/README.md`](azure/README.md).
- **The AI tutorial used no language model and no embedding model.** None could be reached from where it was built. The embedding is a TF-IDF and SVD stand-in, the agent model is a script, and the model API is a local server that speaks the same protocol, and every screen says which parts are stand-ins. What ran for real: PDF, Word and HTML parsers, MinHash, FAISS and hnswlib, PostgreSQL with pgvector, BM25, the Anthropic and OpenAI client libraries (retries, streams, a tool call, checked answers), LangGraph (limits, checkpoints, a pause for a person, a resume), an MCP server and client with a tap on the wire in two protocol versions, a SQL guard on DuckDB, OpenTelemetry spans, pytest on the agent and on two copies that were broken on purpose, a workflow file checked against the GitHub Actions schema, and checks on a fine-tuning set. Nothing ran on a cloud or on a model provider, so what a real model would choose, obey or answer is not measured, the vector numbers come from made-up clusters, and prices and limits are examples. The job-description table in [`ai/README.md`](ai/README.md) is a small sample of search results. See that file for what was not checked and what to re-check.
- **The GCP tutorial records open-source tools, not Google Cloud.** The Cloud Storage client output (listings, generations, a V4 signed URL made offline with a throwaway key and checked with its public key) was recorded against the emulator gcp-storage-emulator, which accepts a write that the real service refuses and answers a wrong location. The BigQuery client was used offline, only to show the request bodies it builds. BigQuery SQL was translated by sqlglot and run in DuckDB, so the logic of the SQL is real, and the plans, timings, slots and bytes are not BigQuery's: bytes are an estimate from the documented size of each type, at an example price. Beam panes and sessions come from Apache Beam 2.77.0 on its local runners, the Pub/Sub delivery rules are a model written from the documentation, Spark is PySpark 4.0.1 in local mode, Airflow 3.4.0 parsed and ran the DAGs, the Dataform compiler compiled the project, Checkov scanned the Terraform, check-jsonschema checked the Cloud Build file and the workflow, and the help pages of gcloud and bq showed that every flag in the lessons exists. BigQuery itself, Dataflow, Pub/Sub, Composer, Dataproc, Datastream, Dataplex, Sensitive Data Protection and Vertex AI are described from documentation, and `gcp/verify/capture_gcp.py` records the rest again. See [`gcp/README.md`](gcp/README.md).
- **The Spark tutorial records a real Spark on one machine, not a cluster.** The plans, task counts, shuffle sizes, skew, spill, file layouts, SQL results, UDF plans and call counts, streaming batches, Delta Lake commits, pytest runs and the order of spark-submit settings were read from Apache Spark 4.0.1 in local mode on four cores, from its event log, on made-up data. Nothing was timed. The web UI, YARN, Kubernetes, EMR, Dataproc, Databricks, Kafka, Iceberg and Hudi were not run: those parts are from documentation, and each screen says so. The limits of the adaptive skew join were lowered for the recording, and the screens say that too. PySpark 4.0.1 needs pandas below 3 (see `spark/verify/requirements.txt`). Details and the Spark job description table are in [`spark/README.md`](spark/README.md).
- **The Kafka tutorial records a real Kafka on one machine, not a network.** The files of a partition and its indexes, offsets, the partition of every key, elections and lost records, rebalances, transactions, compaction, Connect states and dead letters, Debezium events and the log that a replication slot held back, Avro results, Streams state and restarts, ACL and TLS errors, JMX metrics, a rolling restart, a partition move, a quota and pytest runs were read from Apache Kafka 4.4.0 in KRaft mode with three brokers, Debezium 3.7.1 on PostgreSQL 16 and the confluent-kafka client, on made-up data. Nothing was timed, and the timers were shortened for the recording. The Confluent Schema Registry was not run: the registry of mission 11 is a stand-in, while the Avro rules are real. MirrorMaker 2, Kubernetes, the managed services, tiered storage, ksqlDB, Kerberos, OAuth and role based access control were not run: those parts are from documentation, and each screen says so. Details and the Kafka job description table are in [`kafka/README.md`](kafka/README.md).
- **The Flink tutorial records a real Apache Flink on one machine, not a cluster of machines.** The plans, slots, changelogs, windows, checkpoints and the files they write, the loss of a TaskManager that was killed with signal 9, savepoints, join state, key groups and backpressure metrics were read from Apache Flink 2.2.1 as a standalone cluster of one JobManager and two TaskManagers on Java 21, with its SQL client and `flink` command, the Kafka connector 5.0.0-2.2, the Flink CDC connector 3.7.0-2.2, Apache Kafka 4.4.0 (one broker), PostgreSQL 16 and Java jobs compiled for the recording, on made-up data. Nothing was timed, the heartbeat and checkpoint timers were shortened, and the documentation of Flink 2.2 recommends Java 17 and calls Java 21 experimental. Kubernetes and the Flink Kubernetes Operator, YARN, high availability, Amazon Managed Service for Apache Flink, Iceberg, Paimon, Delta Lake and Hudi were not run, and neither was Flink 2.3.0, which came out after the recording (the Kafka connector has no build for it yet): those parts are from documentation, and each screen says so. Three labs apply rules to recorded numbers and say so. The Flink documentation website could not be opened while this was built: the lessons use the documentation in the source release of 2.2.1, the release notes and the repositories of the connectors. Details and the Flink job description table are in [`flink/README.md`](flink/README.md).
- **The Snowflake documentation could not be opened** from the environment that built this, because its network policy blocked the host. Facts about recent features were checked through search summaries only, and the ones that need a second look are listed in [`snowflake/README.md`](snowflake/README.md).
- **The first site's SQL coloring did not color uppercase keywords.** This engine fixes that. The earlier Interview Quest repository still has the old behavior.
- The coach is an illustration. To use a photo, see the Snowflake README.
- No license file has been added yet. Choose one before you publish if you want others to reuse the work.
- This is independent study material. It is not affiliated with or endorsed by Snowflake Inc., dbt Labs or any other vendor named here.
