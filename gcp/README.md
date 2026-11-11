# Google Cloud for data engineers: from a bucket to a model

A guided, press-Next course for data engineers. Coach Ravi follows **Brewline**, the coffee retailer, as its Asia-Pacific team builds a data platform on Google Cloud in the Singapore region. You see who may do what, how a file becomes a table, what a query reads and costs, how messages arrive more than once, how a stream treats late data, how Spark and Airflow run, how changes are copied out of a database, how columns are masked, how data reaches a model, and how it all is kept in Terraform, shipped by a pipeline and watched by alerts. Orange packets travel along numbered arrows, and every mission ends with the interview questions to say out loud.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Nothing in this course ran on Google Cloud.** No project or account could be reached from where it was built. Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output of open-source tools run offline on one machine with made-up Brewline data, written by `gcp/verify/capture_gcp.py`: **google-cloud-storage 3.17.1** against the emulator **gcp-storage-emulator 2026.7.19**, with a V4 signed URL made offline with a throwaway key and checked with its public key; **google-cloud-bigquery 3.47.0**, offline, to show the request bodies that it builds; **sqlglot 30.31.0** and **DuckDB 2.0.0**, which translate and run BigQuery SQL; **pyarrow 25.0.1** and **fastavro 1.13.1** for file formats; **Apache Beam 2.77.0** on its local runners; **google-cloud-pubsub 2.43.0** for client settings; **functions-framework 3.10.2** with **pytest 9.2.0**; **Apache Airflow 3.4.0** with the Google provider; **@dataform/cli 3.1.5**; **PySpark 4.0.1** in local mode; **Checkov 3.4.3**; **check-jsonschema 0.39.0**; and the help pages of **gcloud 570.0.0** and **bq 2.1.32**. |
| **From documentation** | Everything about the services themselves: BigQuery slots, editions, storage billing and policy tags, Dataflow, Pub/Sub, Composer, Dataproc, Datastream, Dataplex, Sensitive Data Protection, Vertex AI and Gemini, what they keep, limit and charge, and their names, which change often. |

The stand-ins, said again where they matter:

- **BigQuery is DuckDB.** sqlglot translates BigQuery SQL and DuckDB runs it, so the logic (`QUALIFY`, `MERGE`, `UNNEST`, windows, joins) is real. The plans, the timings, the slots and the bytes are not BigQuery's. The bytes are an **estimate** from the documented size of each data type, pictured at 20,000 times the sample and priced at an example rate. Only a dry run in BigQuery gives the number that you will be billed.
- **The Cloud Storage emulator is not Cloud Storage.** It accepted a create-only write (`ifGenerationMatch=0`) that the real service answers with HTTP 412, and it answered the location `US` for a bucket asked for in `asia-southeast1`. The lessons say so.
- **The Pub/Sub delivery rules are a model** that I wrote from the documentation: ack deadline, redelivery, a dead-letter topic after N attempts and order by key. It has no back-off, no batching and no flow control. Read it for the rules and not for the timings.
- **The scan for personal data is two regular expressions**, and the lineage was read from SQL text by sqlglot. Neither is Sensitive Data Protection or Dataplex.
- **The hash of the split is a stand-in** for `FARM_FINGERPRINT`: stable for a key, but not the numbers that BigQuery gives. The cost lesson runs on a **made-up job log** with the columns that `INFORMATION_SCHEMA.JOBS` has.
- **No model was trained and no embedding model was called.** BigQuery ML, Vertex AI and vector search are described from documentation. The leak and the split in mission 13 were run on made-up orders.

Some labs are not measurements: the on-demand against capacity lab does **arithmetic** with two example rates, the bytes lab applies documented type sizes to an estimate, and the CDC lab applies a rule from the documentation. They say so on screen. Prices, limits and sizes are examples.

Beam's default local runner may download and start a native binary the first time that it runs. That happened once while exploring, so the recorder names its two pure-Python runners (`BundleBasedDirectRunner` and `FnApiRunner`) and nothing is downloaded and run.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 834 | about 7 hours | Starting out, or interviewing for a junior data engineer role on Google Cloud |
| **Senior** | 1,235 | about 11.5 hours | Everything in Junior, plus the design, cost, security and operations decisions that seniors own |
| **Everything** | 1,253 | about 11.5 hours | Adds the extra questions and the newest features |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map of Google Cloud for data | 19 min | 26 min | 26 min |
| 2 | Who can do what: IAM and security | 25 min | 33 min | 33 min |
| 3 | Cloud Storage | 27 min | 38 min | 38 min |
| 4 | BigQuery: tables, loads and what is inside | 35 min | 42 min | 42 min |
| 5 | BigQuery: read less, pay less | 28 min | 39 min | 39 min |
| 6 | BigQuery SQL for pipelines | 26 min | 44 min | 44 min |
| 7 | Pub/Sub: messages that arrive more than once | 25 min | 41 min | 41 min |
| 8 | Dataflow and Apache Beam | 23 min | 40 min | 40 min |
| 9 | Spark on Google Cloud: Dataproc and serverless | 28 min | 39 min | 39 min |
| 10 | Orchestration: Composer, Airflow and Dataform | 36 min | 45 min | 45 min |
| 11 | Moving data in: CDC, transfers and migrations | 18 min | 36 min | 36 min |
| 12 | Governance: catalog, quality, tags and masking | 25 min | 39 min | 39 min |
| 13 | ML and AI data work on Google Cloud | 21 min | 38 min | 38 min |
| 14 | Run it as code: Terraform, delivery, alerts and cost | 31 min | 47 min | 54 min |
| 15 | Boss round | 57 min | 132 min | 136 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

Mission 15 has two incident drills that mix missions (a day counted twice, and a key in a public repository), a design decision, a coding round in SQL on the recorded estimates, a mock interview of up to 58 questions from the earlier missions, a scorecard, and a one-page review whose every number comes from a recording.

## What job descriptions ask for, and where this course covers it

I read a small sample of Google Cloud data engineer postings through search: eight queries, each returning fifteen to twenty postings, including postings for Singapore, Malaysia and Indonesia. I read the search summaries and not every posting, and I also read the public page of the Professional Data Engineer certificate. It was a **small sample of search results, so treat it as a direction and not a statistic**. The same themes came back again and again, and the missions follow them.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| BigQuery with advanced SQL, partitioning, clustering and cost control. In nearly every posting | 4, 5, 6, 14 | **Recorded** SQL run in DuckDB, estimates of bytes read, and labs for the bytes and for on demand against capacity. BigQuery itself is **from documentation** |
| Python and SQL | all | Python and BigQuery SQL throughout |
| Cloud Composer and Airflow. Most postings | 10 | **Recorded** with Airflow 3.4.0: DAG files read, templates rendered, a flaky task retried, a slow import measured. Composer itself is **from documentation** |
| Dataflow and Apache Beam, Pub/Sub, sometimes Kafka | 7, 8, 11 | **Recorded** with Beam on its local runners (windows, late data, sessions, a dead-letter output, repeats) and a model of Pub/Sub delivery. Dataflow, Pub/Sub and Kafka are **from documentation** |
| Cloud Storage as the landing zone, file formats | 3 | **Recorded** against an emulator, with real files in CSV, JSON lines, Avro, Parquet and ORC |
| Dataproc, Spark and PySpark | 9 | **Recorded** with PySpark in local mode: partition pruning, a shuffle, small files, skew, a join. Dataproc is **from documentation** |
| Dataform or dbt for SQL transformations | 10 | **Recorded** with the Dataform compiler: three tables, two assertions, and the error of a misspelt reference |
| Terraform, Git and CI/CD with Cloud Build, GitHub Actions or Jenkins | 2, 14 | **Recorded**: Checkov found 11 gaps in a small file and 0 in the fixed one. A Cloud Build file and a GitHub workflow passed their schemas, and copies with a typo were refused |
| IAM, service accounts, federated identity, masking, Dataplex, lineage, quality, policy tags | 2, 12 | A signed URL, an IAM lab, a row policy and a masking lab. The policy tag on a column was built with the client, offline. The services are **from documentation** |
| Datastream, change data capture, migrations from legacy warehouses | 11 | A lab that applies changes in sequence and the reconciliation SQL, run in DuckDB. The services are **from documentation** |
| Cloud SQL, Spanner, Bigtable, AlloyDB | 1, 11 | **From documentation**: a decision table |
| Vertex AI, BigQuery ML, feature pipelines, MLOps, generative AI | 13 | A leaky feature and a split that leaks, **recorded** on made-up data. The services, embeddings and vector search are **from documentation** |
| Cloud Run functions and Eventarc for event-driven pipelines | 11 | **Recorded** with functions-framework and pytest, including a broken copy. The services are **from documentation** |
| Monitoring, alerts and cost | 5, 14 | A cost query on a made-up job log, **recorded**. Alert policies and budgets are **from documentation**, and their commands were checked against the help pages |
| Professional Data Engineer certificate. Often a plus, sometimes required | 1, 15 | A map from the five areas of the exam to the missions. The sub-sections of the exam guide could not be opened, so no weights are quoted |
| Dimensional modelling, data quality, reconciliation, testing | 6, 10, 11, 12 | **Recorded** SQL: a slowly changing dimension, checks as queries, counts and sums |
| Microsoft Fabric, Kafka and Flink in depth, Airflow in depth, Terraform in depth | not here | See the Azure and AWS tutorials. Each of the others is planned as a tutorial of its own |

The Professional Data Engineer page that I could read says that the exam lasts two hours, has 40 to 50 multiple choice and multiple select questions, and covers five areas: design data processing systems, ingest and process the data, store the data, prepare and use data for analysis, and maintain and automate data workloads. Cloud Functions is now called Cloud Run functions. Names and limits in this area change often, which is why the screens say where something comes from.

## What you work through

- **Follow Brewline.** Made-up orders land in a bucket in text, row and column formats, become a partitioned and clustered table, arrive twice from the point-of-sale system, are cleaned with `QUALIFY`, loaded five ways and run twice, streamed through Pub/Sub and Beam, joined with Spark, scheduled by Airflow and compiled by Dataform, masked, scored by a model, and kept in Terraform.
- **15 animated diagrams.** Orange packets travel along numbered arrows: the whole platform, the project hierarchy, a request through IAM, the storage classes, how a query runs, the paths into BigQuery, Pub/Sub delivery, a Dataflow pipeline, Dataproc, Composer, change data capture, governance, a model and its scores, delivery and the watch.
- **4 terminal replays of real output.** A schema check of a workflow file, pytest on a Cloud Run function and on a copy with a bug, an Airflow template rendered without running the task, and a schema check of a build file.
- **15 labs.** Who can read a table (a role on the dataset is not a permission to run a query). Prefixes and delimiters in a bucket listing. A signed URL that you try to bend. Six file formats and the share of a Parquet file that two columns need. The bytes of eleven queries and what a month of them costs. On demand against capacity. Five ways to load a batch, run twice. What Pub/Sub does with a slow handler, a poison message and an ordering key. Panes, late data and sessions. What Spark reads, shuffles, writes and skews. Retries in Airflow. Changes that arrive out of order. What each reader sees of a masked column. A split that leaks and one that does not. Which Terraform fix clears which check.
- **58 code walkthroughs and SQL runs.** Line-by-line explanations of the code that ran: the Cloud Storage client, the BigQuery request bodies, the loads, the Beam pipelines, the Pub/Sub client, the Spark job, the DAGs, the Dataform project, the function and its tests, the Terraform, the build file, and the SQL.
- **65 quizzes, 23 bug hunts, 14 ordering games, 15 decisions with a recommended answer, and 16 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **58 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 16 chapters, 510 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 834 frames on the Junior path and 1,253 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Body text and code stay at 14 px or larger. Labels inside diagrams scale down to between 9 and 11.3 px |
| Interaction test (`dev/e2e.js gcp`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All 15 labs are also driven in the browser against values worked out in the test: what a role reaches, the sessions that merge, how a retry ends, every one of the 32 sets of Terraform fixes, all 36 settings of the capacity lab | 2,172 checks pass |
| Recorded output (`gcp/verify/capture_gcp.py`) | 41 files, 29 result tables and 48 sets of counts: listings, generations and a signed URL, six file formats, BigQuery request bodies, SQL results and byte estimates, the load methods, Beam panes and sessions, a Pub/Sub model, Spark plans, DAG runs, a Dataform compile, function tests, Terraform scans, schema checks and 28 commands whose flags were looked up in the help pages |
| Code in the lessons (`gcp/verify/verify_gcp.py`) | 31 pieces of Python parse, 113 imports are resolved, and 125 keyword arguments of 84 calls are checked against the installed libraries (Airflow and PySpark in their own interpreters). 8 JSON, 8 YAML and 5 Terraform snippets parse, and the Cloud Build file and the workflow pass their schemas. 42 SQL statements parse, 11 queries and counts are run again in DuckDB and must give the table that the lesson shows, and the solution of the SQL coding round runs on the table that is shown. 17 shell snippets pass `bash -n`, and 82 flags are checked against the flags that the recording found in the help pages. The 24 recorded files are the files on disk, and the 7 request bodies of the BigQuery client are built again |
| Lab data (`gcp/verify/check_widgets.js`) | 272 checks. The estimates keep their arithmetic (billed bytes are the logical bytes rounded up, dollars are the bytes at the example rate), the file sizes and the Parquet column chunks add up, the listings count their names, the load methods give the wrong rows that their SQL implies, the Beam panes add up to the events counted, sessions are merged again with a second implementation, the split and the Terraform scans keep their identities, and the cost of the job log follows from its jobs |
| Controls | 12 deliberately broken inputs (a keyword that a function does not take, the same on a method call, Python, YAML, Terraform, SQL and shell that do not parse, a build file with `step` for `steps`, a workflow with `run-on` for `runs-on`, a result with one number changed, a flag that no help page has, and a command that was never checked), which the checkers must all refuse |
| Recapture | `python3 gcp/verify/verify_gcp.py --recapture` runs the whole recording again and compares it with `js/real.js`: 574 items compared, none differs. Names that say seconds would be allowed to vary a little, and none needed it. File sizes that Spark writes vary by about a kilobyte between runs, so the recording rounds them to 10 KB |

### What was not checked

- **Nothing ran on Google Cloud.** What BigQuery bills, how Dataflow, Pub/Sub, Composer or Dataproc behave under load, and what a service accepts or refuses were not measured. Service behaviour is described from documentation or from a labelled model.
- **The Cloud Storage emulator is lenient.** It accepted a write that the real service refuses. The lessons say so, and the real answer is quoted from the documentation.
- **The SQL numbers are DuckDB's.** The logic of the SQL is real. The time, the plan, the slots and the bytes are not BigQuery's, and the byte numbers are an estimate. The job log of the cost lesson is made up.
- **Terraform was not run.** Checkov scanned the files. Cloud Build and GitHub Actions did not run the files that the lessons show. They passed the published schemas, which check the shape of a file and not what its steps do.
- **Alert policies, budgets, organization policies and snapshots were not created.** Their flags were looked up in the help pages. Two statements (`CREATE ROW ACCESS POLICY` and `CREATE VECTOR INDEX`) are not understood by the SQL parser that the checks use, so their syntax is from documentation.
- **No model was trained and no embedding model was called.** BigQuery ML, Vertex AI, vector search and generative AI are described from documentation.
- **The exam guide was not read.** The sub-sections and weights of the Professional Data Engineer guide could not be opened, so the course maps only the five areas that the certificate page names.
- **This is engineering practice and not legal advice.** Ask your legal and privacy teams which rules apply to you.

### Re-check before you rely on it

- **Product names and limits.** Cloud Functions is now Cloud Run functions, and BigQuery editions sit beside the older on-demand model. Check the current names and limits before you quote them.
- **Prices.** Every price in the course is an example, and none is a quote. The lessons never state a price as a fact.
- **Datastream sources and destinations, masking rule names and Dataplex features** change between releases. Check the reference of the version you use.
- **GitHub Actions versions.** The workflow uses `actions/checkout@v4` and `google-github-actions/auth@v3`. Pin the versions that are current when you use them.
- **Airflow and Composer versions.** The recording used Airflow 3.4.0 and its Google provider. A Composer environment may run another version, and the import paths of operators differ between them.
- **Library defaults and signatures** were recorded from the versions named above. Defaults of the Pub/Sub client, the Beam options and the Spark settings change between releases.

## Files

```
gcp/
  index.html, css/gcp.css  the page and its colours (a Google blue accent)
  js/config.js             the course settings: Coach Ravi, the paths, the sixteen levels
  js/graphs.js             15 diagram specs
  js/widgets.js            labs for access, listings, signed URLs, file formats, bytes, capacity and loads
  js/widgets2.js           labs for Pub/Sub, windows, Spark, retries, CDC, masking, the split and Terraform
  js/content/              one file per mission, 00 to 15
  js/real.js               the recording: files, tables and counts written by capture_gcp.py
  verify/capture_gcp.py    runs the real tools and writes js/real.js
  verify/verify_gcp.py     checks every snippet, runs the SQL and the checks again, and with --recapture records again
  verify/check_widgets.js  checks the data that the labs read, with arithmetic that shares no code with them
  verify/*.py              the code that the lessons show: brewdata, warehouse, loads, bq_jobs, gcs_demo, beam_jobs, pubsub_demo, spark_job, af_run
  verify/fn/               the Cloud Run function, a broken copy and their tests
  verify/dags/             the Airflow DAGs, a flaky one, a slow one and a broken one
  verify/dataform/         the Dataform project
  verify/iac/              the Terraform file with its gaps, and the fixed file
  verify/ci/               the Cloud Build file and the GitHub workflow, validated and never run
```

## Run the checks

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r dev/requirements.txt          # the GCP block at the end
npm install --prefix gcp/verify              # the Dataform compiler
python3 gcp/verify/verify_gcp.py             # snippets, SQL runs, flags, lab data and a partial recapture (about three minutes)
python3 gcp/verify/verify_gcp.py --recapture # records everything again, Airflow and Spark too, and compares it with js/real.js
node dev/lint-content.js gcp
node dev/e2e.js gcp
node dev/smoke.js gcp --path all
```

Airflow, PySpark and Checkov live in their own environments. Point `GCP_AIRFLOW_PYTHON` at an interpreter that has `apache-airflow==3.4.0` with `apache-airflow-providers-google` (and the constraints file of that release), `GCP_SPARK_PYTHON` at one that has `pyspark==4.0.1` (Java 17 or 21 is needed), and `GCP_IAC_PYTHON` at one that has `checkov` and `check-jsonschema`. A check whose tool is missing says so and is skipped. The recording needs Python 3.10 or later (it was made with 3.12). `gcloud` and `bq` are used only for their offline help pages.

Independent study material. Not affiliated with or endorsed by Google or by the open-source projects named here.
