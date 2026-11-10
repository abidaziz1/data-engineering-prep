# Databricks and Azure Databricks: from first notebook to production

A guided, press-Next course for data engineers. Coach Sam follows **Brewline**, an online coffee retailer, as its orders move onto Databricks. You watch Spark plan and run a query, read the Delta Lake transaction log, build a bronze, silver and gold pipeline, stream with a watermark, grant access in Unity Catalog, write a declarative pipeline, schedule a job, work out what it costs, ship it with a bundle and CI, and set up identity, storage and network on Azure. You try the trade-offs in labs, solve problems, and answer the interview questions out loud.

Open **`index.html`** in a browser. No install, no account.

## What is recorded and what is not

Nothing in this course ran on Databricks or on Azure. Two kinds of screens carry a tag, so you always know which kind you are reading.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output from **Apache Spark 4.2.0** and **Delta Lake 4.4.1**, run on one machine with the Brewline data: query plans, Delta transaction log files, `DESCRIBE HISTORY` rows, error messages, file counts, a bronze, silver and gold run, a declarative pipeline run and pytest runs. Databricks Runtime is built on these engines, but it is a different product, and its defaults and plans differ. |
| **From documentation** | Everything that belongs to the Databricks platform: Unity Catalog, Auto Loader, expectations, AUTO CDC, event logs, Jobs, Photon, serverless compute, bundles, billing and the Azure integration. The facts come from the public Databricks and Microsoft documentation as it was found while this was built. |

The cost lab is arithmetic on example prices. It is not a price list.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 468 | about 4 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 810 | about 7.5 hours | Everything in Junior, plus design, tuning, governance, cost and release decisions |
| **Everything** | 832 | about 8 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The Databricks platform | 15 min | 23 min | 23 min |
| 2 | Spark: how a query runs | 21 min | 39 min | 43 min |
| 3 | Delta Lake: tables you can trust | 27 min | 42 min | 43 min |
| 4 | Layout: small files, skipping and cleanup | 15 min | 29 min | 30 min |
| 5 | Pipelines: bronze, silver, gold | 20 min | 36 min | 36 min |
| 6 | Streaming: triggers, state and late data | 12 min | 24 min | 24 min |
| 7 | Unity Catalog: names, grants and lineage | 12 min | 30 min | 31 min |
| 8 | Declarative pipelines | 18 min | 38 min | 38 min |
| 9 | Jobs: tasks, triggers and retries | 15 min | 27 min | 29 min |
| 10 | Performance and cost | 11 min | 30 min | 30 min |
| 11 | Delivery: tests, bundles and releases | 19 min | 33 min | 33 min |
| 12 | Azure: identity, storage and network | 9 min | 25 min | 25 min |
| 13 | Boss round and cheat sheet | 33 min | 71 min | 73 min |

Mission 13 has a coding round, two incident drills that mix topics, a design decision, a mock interview of up to 29 questions drawn from the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet.

## What you work through

- **Follow the Brewline orders.** The orders table goes through six Delta commits: two writes, an update of order `O-5002`, a delete of the cancelled order `O-5005`, a merge and an optimize. You read the log file of each one. The same orders then flow through a bronze, silver and gold run, a streaming run with a late event, and a declarative pipeline.
- **7 animated diagrams.** The whole platform, the control plane and compute planes, how Spark turns a query into stages and tasks, a job with tasks and conditions, a declarative pipeline, the objects of Unity Catalog, and the network and identity of an Azure workspace.
- **3 terminal replays of real output.** The first run of `spark-pipelines`, and two `pytest` runs, one green and one with a failing test.
- **7 labs.** Replay the Delta log version by version. Run two writers at once and see which one fails. Move the watermark and watch a late event get dropped. Compare five plans for one join. Look at skew in the partitions. Count the files a filter reads before and after a Z-order. Work out what a job costs a month.
- **58 code walkthroughs.** Line-by-line explanations of Spark, Delta Lake, Python, SQL, JSON, YAML and shell, with the real output beside the code where there is one.
- **3 coding rounds.** The newest row for each order, a cost round that brings a $1,154 monthly bill down to $414, and the top customer for each day. The verifier runs the first and the last on Spark, and the results match what the lessons show.
- **21 quizzes, 13 bug hunts, 3 ordering games, 13 architecture decisions with a recommended answer, and 14 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **42 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 14 chapters, 308 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 468, 810 and 832 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Body text stays at 14 px or larger. Labels inside diagrams scale down to between 9 and 12 px |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, lab, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All seven labs are also driven in the browser against the recording and against arithmetic done by hand | 1,311 checks passed. The test found two bug hunts in which every line of the snippet was wrong, so there was nothing to hunt. Both were rewritten with correct lines mixed in |
| Recorded output (`databricks/verify/capture_db.py`) | 16 query plans, 16 project and result files, 13 error messages, 21 result tables, 5 Delta log replays, 10 `DESCRIBE HISTORY` listings and 49 sets of counts, all produced by Spark and Delta Lake on this project. The whole recording was made twice from scratch. The two runs agree on every item except byte counts and the exact boundaries of the three Z-order files, which Spark picks by sampling |
| Code in the lessons (`databricks/verify/verify_db.py`) | 111 snippets. 16 are copied from the recording and 21 are program output or plans. 21 were run on local Spark and Delta Lake in 30 comparisons with the recording (plans, versions, rows, file counts, error classes), and all 30 matched. 53 are written by hand: 24 Python (syntax, plus every call of the SDK example checked against the Databricks SDK), 15 SQL with 38 statements (19 parsed by sqlglot in the Databricks dialect, 19 matched against the documented form), 8 JSON documents (all survive a round trip through SDK 0.163.0, so every field name and enum value exists), 3 shell scripts with 7 command lines (`bash -n`, and matched against the documented form) and 3 YAML files (the two bundle files against the schema of Databricks CLI v1.25.0, the workflow against the GitHub workflow schema) |
| Lab logic (`databricks/verify/check_widgets.js`) | 63 checks. The Delta log replay agrees with the recorded tables at all six versions, the watermark replay agrees with what Spark reported, the data skipping counts agree with the file scans Spark reported, and the cost arithmetic matches sums done by hand |
| Recapture | `python3 databricks/verify/verify_db.py --recapture` runs the whole recording again and compares it with `js/real.js`. It ignores byte counts, ids, clock values and the order of parallel output. It compares the three Z-order files by count, total rows, order and overlap, because Spark picks their boundaries by sampling and the exact ranges change from run to run |

The verifier also feeds each checker one deliberately broken input (a misspelled job setting, an unknown enum value, a bad SDK call, an open parenthesis, a shell syntax error), and fails if the checker accepts it.

### What was not checked

- **Nothing ran on Databricks or Azure.** There was no workspace. Unity Catalog, Auto Loader, expectations, AUTO CDC on Delta, the event log, Jobs, Photon, serverless compute, predictive optimization, bundle deployment and every Azure command are described from documentation.
- **The declarative pipeline run used open-source Spark Declarative Pipelines**, not the Databricks product. It has no expectations and no Auto Loader, so the recording reads JSON files with the plain file source. Open-source Spark 4.2.0 **refused AUTO CDC on a Delta target** (`AUTOCDC_TARGET_DOES_NOT_SUPPORT_MERGE`), so the AUTO CDC syntax in mission 8 comes from documentation, and the refusal is recorded and shown. The recording uses Delta as the default format and a local Hive metastore, which Databricks does not need.
- **The recorded plans are open-source Spark plans.** Photon, the Databricks optimizer and serverless compute produce different plans and different timings.
- **The Databricks documentation could not be opened** while this was built, because the build environment blocked the host. Every "From documentation" statement comes from search summaries of the Databricks and Microsoft pages, plus the Spark and Delta Lake documentation. Read the page before you rely on a detail. The table below lists what to read.
- **Job and cluster JSON was checked against the Databricks Python SDK 0.163.0** (every field name and enum value), and the bundle files against the JSON schema of **Databricks CLI v1.25.0**. The CLI itself was not run, and nothing was deployed. The schema types `mode` as plain text, so a misspelled `mode` would pass the check.
- **The Azure CLI and Databricks CLI lines were matched against the documented form of each command**, not run.
- **The Python that uses Databricks-only names** (`dbutils`, `cloudFiles`, expectation decorators) was parsed for syntax, not run.
- **The GitHub workflow** was checked against the GitHub workflow schema and never ran.
- **Screenshots were reviewed for the key screens**, not for all 832 frames.

## Re-check before you rely on these

These claims are the most likely to be out of date, or rest on search summaries. Each one carries a "check the documentation" note in the lesson.

| Claim in the course | Where | What to read |
| --- | --- | --- |
| Serverless compute is the recommended default for notebooks and for supported job tasks, classic jobs compute suits JAR and spark-submit tasks, and all-purpose compute is not recommended for production jobs | Missions 1 and 10 | [Choose compute](https://docs.databricks.com/aws/en/compute/choose-compute) and [the Azure version](https://learn.microsoft.com/en-us/azure/databricks/compute/choose-compute) |
| SQL warehouse types: serverless, pro and classic | Mission 1 | [Warehouse types](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-types) |
| Control plane in the Databricks account, classic compute plane in yours, serverless compute plane in the Databricks account in the same region | Mission 1 | [High-level architecture](https://docs.databricks.com/aws/en/getting-started/high-level-architecture) |
| Free Edition limits: serverless only, no R or Scala, one 2X-Small SQL warehouse, 5 concurrent job tasks, not for commercial use | Mission 1 | [Free Edition limitations](https://docs.databricks.com/aws/en/getting-started/free-edition-limitations) |
| Prices in the cost lab: $0.30 jobs, $0.55 all-purpose and $0.70 serverless SQL per DBU | Missions 1 and 10 | Example rates taken from public pricing pages in search results. Your contract and cloud set the real ones |
| Liquid clustering is recommended over Z-order for new tables, keys can change without a rewrite, `CLUSTER BY AUTO` needs a managed table | Mission 4 | [Liquid clustering](https://docs.databricks.com/aws/en/tables/clustering) |
| Do not partition tables under 1 TB, prefer liquid clustering from 1 TB to 100 TB, keep each partition at 1 GB or more | Mission 4 | [When to partition](https://docs.databricks.com/aws/en/tables/partitions) |
| Predictive optimization runs OPTIMIZE, VACUUM and ANALYZE on Unity Catalog managed tables, and is on by default for accounts created on or after 2024-11-11 | Mission 4 | [Predictive optimization](https://docs.databricks.com/aws/en/optimizations/predictive-optimization) |
| Deletion vectors: the course does not claim a default | Missions 3 and 4 | The default depends on the runtime and a workspace setting |
| Reading a table needs `USE CATALOG`, `USE SCHEMA` and `SELECT`, and grants on a catalog or schema reach current and future children | Mission 7 | [Permissions concepts](https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/access-control/permissions-concepts) |
| Row filter and column mask syntax, one row filter for each table, attribute-based policies as the newer option | Mission 7 | [Filters and masks](https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks/manually-apply) |
| A dropped managed table can be restored with `UNDROP` for 7 days by default | Mission 7 | [Managed versus external](https://docs.databricks.com/aws/en/data-governance/unity-catalog/managed-versus-external) |
| System table names for audit, lineage, billing and jobs, and 365 days of free audit retention | Missions 7 and 10 | [System tables](https://docs.databricks.com/aws/en/admin/system-tables/jobs-cost). The column names in the cost SQL are from memory, and the lesson says so |
| Python names `from pyspark import pipelines as dp`, `@dp.materialized_view`, `@dp.table`, and expectations `expect`, `expect_or_drop`, `expect_or_fail` | Mission 8 | [Python development](https://docs.databricks.com/aws/en/ldp/developer/python-dev) and [expectations](https://docs.databricks.com/aws/en/ldp/expectations) |
| AUTO CDC syntax, SCD type 1 and 2, and the `__START_AT` and `__END_AT` columns | Mission 8 | [AUTO CDC](https://docs.databricks.com/aws/en/ldp/cdc) |
| A triggered pipeline retries 5 times for each update, a continuous pipeline retries without a limit | Mission 8 | [Pipeline mode](https://docs.databricks.com/aws/en/ldp/pipeline-mode) |
| Six run-if conditions, and repair re-runs the failed tasks and their dependents | Mission 9 | [Run if](https://docs.databricks.com/aws/en/jobs/run-if) and [repair](https://docs.databricks.com/aws/en/jobs/repair-job-failures). The names match SDK 0.163.0 |
| Job triggers: schedule, file arrival, table update, job completion (beta) and continuous | Mission 9 | [Triggers](https://docs.databricks.com/aws/en/jobs/triggers). Beta status changes |
| Photon is on by default for serverless compute and SQL warehouses, and bills at its own DBU rate | Mission 10 | [Photon](https://docs.databricks.com/aws/en/compute/photon) |
| Development mode prefixes names and pauses schedules, and production mode checks the branch and prefers a service principal | Mission 11 | [Deployment modes](https://docs.databricks.com/aws/en/dev-tools/bundles/deployment-modes) |
| GitHub Actions signs in with workload identity federation: `id-token: write`, `DATABRICKS_AUTH_TYPE`, `DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID` | Mission 11 | [GitHub provider](https://docs.databricks.com/aws/en/dev-tools/auth/provider-github) |
| VNet injection needs two delegated subnets, back-end Private Link needs secure cluster connectivity, and the managed resource group holds the VMs | Mission 12 | [VNet injection](https://learn.microsoft.com/en-us/azure/databricks/security/network/classic/vnet-inject) and [network security](https://learn.microsoft.com/en-us/azure/databricks/security/network/) |
| A Key Vault-backed secret scope needs a role on the vault. The pages and community answers disagree on RBAC versus access policies | Mission 12 | [Secrets](https://learn.microsoft.com/en-us/azure/databricks/security/secrets/). Check your own vault |
| Automatic identity management is on by default for accounts created after 2025-08-01, and should not be mixed with SCIM | Mission 12 | [Automatic identity management](https://learn.microsoft.com/en-us/azure/databricks/admin/users-groups/automatic-identity-management/) |
| The access connector, storage credential and external location chain, and the storage role it needs | Mission 12 | [Cloud storage access](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/). Read the current page for the role name |

## Run it yourself

The course never connects to a cluster, but the code behind the recording runs on a laptop with Java 17 or 21.

```bash
pip install -r dev/requirements.txt
python3 databricks/verify/capture_db.py
python3 databricks/verify/verify_db.py
```

`capture_db.py` runs every scenario in the course on local Spark and Delta Lake and rewrites `databricks/js/real.js`. It takes about 13 minutes on 4 cores, and the first run downloads the Delta Lake jar from Maven Central. `verify_db.py` takes about 4 minutes. Add `--recapture` to record everything again and compare it with `js/real.js` (13 minutes more), and add `--reuse` to compare the recording kept from the last `--recapture` instead. `--no-run` skips the Spark runs, and `--offline` skips the two JSON schemas, which the verifier downloads once into `databricks/verify/.cache/`.

`databricks/verify/sdpproj/` is the declarative pipeline that `spark-pipelines run` executed. `databricks/verify/testproj/` holds the code and the pytest tests of mission 11.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `LAB.get`, which reads `js/real.js`.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only. Every scene that shows a fact has a source `src`: `rec` or `docs`.
- **Replace the story.** The interview answers use general examples. Wherever a screen carries a "Make it yours" note, swap in a real story with real numbers.
- **Update the recording.** After a Spark or Delta Lake upgrade, run `python3 databricks/verify/capture_db.py`, then the lint. A lesson that quotes a number that changed fails loudly.

## Files

```text
index.html               the page
css/databricks.css       styles for the labs
js/config.js             title, paths, welcome text, map chips
js/real.js               everything recorded from Spark and Delta Lake: files, plans, logs, tables, counts
js/helpers.js            LAB.get: reads real.js and fails when a key is missing
js/graphs.js             seven diagrams, plain data
js/widgets.js            the seven labs
js/content/              00-start.js to 13-boss.js, one file per mission
verify/capture_db.py     runs Spark, Delta Lake and Spark Declarative Pipelines and writes js/real.js
verify/merge_real.py     copies chosen keys of a partial recording into js/real.js
verify/verify_db.py      checks snippets, schemas, lab logic and, with --recapture, the recording
verify/check_widgets.js  checks the labs against the recording
verify/sdpproj/          the declarative pipeline that was run
verify/testproj/         the code and tests of the pytest runs
```
