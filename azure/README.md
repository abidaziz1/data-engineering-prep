# Azure for data engineers: from the first storage account to production

A guided, press-Next course for data engineers. Coach Noor follows **Brewline**, an online coffee retailer, as it opens a European branch and builds its data platform on Azure. You see how a storage account lists and locks a blob, how a SAS token is signed and refused, how a managed identity asks for a token and how storage decides a request, how a Data Factory pipeline is built, checked and made safe to repeat, how Spark and Delta Lake build a lakehouse, how Synapse reads only the folders it needs, how 60 distributions spread a table, how Event Hubs splits work between readers and remembers where each one stopped, how a file starts a Function, how Key Vault and private endpoints close the network, what the bill is made of, and how a Bicep template and a GitHub pipeline build it all. The last mission is a boss round of interview questions.

Open **`index.html`** in a browser. No install, no account.

## What is recorded and what is not

Nothing in this course ran on Azure. Two kinds of screens carry a tag, so you always know which kind you are reading.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output of open-source tools and client libraries, run on one machine with the Brewline data: the **Azure SDK for Python** (the real client libraries: azure-storage-blob 12.31.1, azure-storage-queue 12.18.1, azure-identity 1.27.0, azure-eventhub 5.15.1 with its blob checkpoint store 1.2.0, azure-eventgrid 4.22.1, azure-functions 2.3.0, azure-keyvault-secrets 4.12.0 and azure-mgmt-datafactory 9.3.0) against **Azurite 3.37.0**, the open-source storage **emulator** of Microsoft, plus DuckDB 2.0.0 and pyarrow 26.0.1 for the file layouts and the watermark runs, a local **Apache Spark 4.0.1 with Delta Lake 4.0.1**, the Kusto language service 12.4.1 for KQL, the `cryptography` package for the envelope encryption demo, Checkov 3.4.3 and check-jsonschema 0.39.0 for the infrastructure files, and pytest 9.2.0. Azurite is not Azure. The lessons use it only for behavior that the Azure documentation describes the same way. |
| **From documentation** | Everything that belongs to the Azure services themselves: how Entra ID, Data Factory, Synapse, Event Hubs, Event Grid, Functions, Key Vault, Cost Management and Bicep behave, their limits, defaults, retirements and prices. The facts come from search summaries of the Microsoft pages and from the documentation strings that ship inside the Azure SDK, as found while this was built. |

Some labs are not measurements. The access lab, the role scope lab, the expression lab and the join step of the distribution lab **apply rules from the documentation** (they say so on screen), and the bill lab is **arithmetic** on example prices. Two recorded spreads use a **stand-in hash**, because neither Synapse nor Event Hubs publishes its own: the 60 distributions of the dedicated pool and the partitions of an event hub. They show the shape (a column with four values leaves 56 distributions empty), not the exact count of the service.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 886 | about 7.5 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 1,264 | about 12 hours | Everything in Junior, plus design, security, cost and delivery decisions |
| **Everything** | 1,300 | about 12 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The Azure map for data engineers | 24 min | 37 min | 37 min |
| 2 | Storage accounts and ADLS Gen2 | 33 min | 51 min | 52 min |
| 3 | Entra ID, RBAC and managed identities | 31 min | 45 min | 46 min |
| 4 | Data Factory: pipelines and the copy activity | 30 min | 46 min | 46 min |
| 5 | Data Factory in production | 29 min | 42 min | 44 min |
| 6 | Spark and the lakehouse on Azure | 36 min | 58 min | 60 min |
| 7 | Synapse serverless SQL | 28 min | 48 min | 48 min |
| 8 | The dedicated SQL pool | 30 min | 47 min | 49 min |
| 9 | Event Hubs | 33 min | 48 min | 51 min |
| 10 | Events, queues and Functions | 36 min | 49 min | 49 min |
| 11 | Security for the data platform | 23 min | 52 min | 52 min |
| 12 | Cost and operations | 24 min | 48 min | 49 min |
| 13 | Infrastructure as code and delivery | 35 min | 56 min | 57 min |
| 14 | Boss round and cheat sheet | 55 min | 93 min | 93 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

Mission 14 has a coding round, two incident drills that mix topics, a design decision, a mock interview of up to 38 questions drawn from the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet.

## What you work through

- **Follow the Brewline orders.** A file lands in a storage account under `raw/orders/dt=2026-03-14/`. You list it with a prefix and a delimiter, guard it with a conditional write, sign a SAS for it and watch five tokens get 25 answers, ask Entra for a token, and allow and deny it with roles, scopes and ACLs. You copy it with a Data Factory pipeline that reads a watermark, check the pipeline file against the SDK models, turn it into Delta tables with Spark, query it with Synapse serverless, load a dedicated pool with COPY INTO and CTAS, stream it through Event Hubs, start a Function from its Event Grid event, encrypt it with an envelope of keys, read the bill, and describe the whole stack as a Bicep template with a GitHub Actions pipeline.
- **14 animated diagrams.** Orange packets travel along numbered arrows through the whole platform, the hierarchy of a tenant, a storage account and its events, a managed identity asking for a token, the decision chain of a storage request, a Data Factory run, a metadata-driven loop, a lakehouse, a Synapse workspace, a dedicated pool, an event hub, an event-driven load, a closed network, and delivery from a pull request to production.
- **9 terminal replays of real output.** A pipeline file checked before it is published, a cast that works on one Spark runtime and fails on another, the folder of a Delta table, a write that Delta refuses, small files with OPTIMIZE and VACUUM, pytest on a Function handler, envelope encryption, Checkov on seven Bicep files, and check-jsonschema on a workflow.
- **12 labs.** List a container with prefixes and delimiters. Read a SAS token and predict allow or deny for 25 requests. Predict ten storage requests and then change the facts one by one. Pick a scope in a tree and see who inherits the role. Find which credential `DefaultAzureCredential` picks. Evaluate Data Factory expressions at the end of a month and a year. Replay three watermark strategies on six orders and see which one loses rows. See which files a wildcard opens and what a serverless query costs. Spread 600,000 orders over 60 distributions and see what a join moves. Fill Event Hubs batches, step through ownership and checkpoints, and replay after a crash. Step through the visibility timeout and the poison queue. Work out a monthly bill and five savings.
- **41 code walkthroughs.** Line-by-line explanations of Python with the Azure SDK, T-SQL for Synapse serverless and dedicated pools, KQL, JSON pipelines and policies, Bicep, YAML and Azure CLI commands, with the real output beside the code where there is one.
- **10 coding rounds.** Keep the newest copy of each order, build a gold table, count orders by month with a wildcard, find the busiest distribution, size Event Hubs batches, split an Event Grid subject, find the callers that are refused in KQL, rank the bill, read a Checkov report and exit with a code, and compute a running total. The verifier runs the solutions (six in DuckDB, two in Python, one KQL query in Python on the table shown, and one against the recorded result), and the results match what the lessons show.
- **67 quizzes, 25 bug hunts, 13 ordering games, 14 architecture decisions with a recommended answer, and 27 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **77 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 15 chapters, 493 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 886, 1,264 and 1,300 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Body text stays at 14 px or larger. Labels inside diagrams scale down to between 9 and 12.4 px. Long identifiers break across lines instead of widening the page |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All twelve labs are also driven in the browser against hand-worked values | 2,278 checks passed |
| Recorded output (`azure/verify/capture_az.py`) | 27 files, 17 texts, 8 result tables and 51 sets of counts: listings, SAS fields and answers, conditional writes, leases and tiers, the credential chain, managed identity requests, Event Hubs batches and checkpoints, queue timelines, an Event Grid event, handler tests, pipeline checks, watermark runs, Parquet layouts and row groups, the spread over 60 distributions, KQL checks, Spark and Delta Lake output, envelope encryption, Checkov results and a workflow check. The whole recording was made more than once from scratch. Every run agrees on every item except the ones that were changed on purpose between runs |
| Code in the lessons (`azure/verify/verify_az.py`) | 38 pieces of Python parse, and 59 calls of Azure SDK classes and methods are checked against the installed libraries (every keyword, the number of positional arguments, the required arguments, with the type of each variable followed through assignments and return annotations), and 20 imported names exist. Snippets run against Azurite (15 checks) and are compared with the recording or with what the lesson says: the two conditional writes, the delete-a-day bug and its fix, the queue worker that moves a failing message to a poison queue, the message that is lost when a worker deletes it first, the Function handler with its three tests, and the same handler with the bug and its one failing test. The envelope encryption runs and prints the recorded output. 26 T-SQL snippets parse with sqlglot, and 19 Synapse statements (OPENROWSET, external tables, CTAS with DISTRIBUTION, COPY INTO, DBCC) are read against the documented grammar, including that a `filepath(n)` has a wildcard to read. 6 SQL solutions run in DuckDB on the tables shown and give the tables shown, and the OPENROWSET and KQL solutions are checked against the recorded rows. 5 KQL queries parse with the Kusto language service. 12 JSON documents parse, the pipelines go through the models of azure-mgmt-datafactory (the broken ones give the recorded findings), the lifecycle rules are read by the azure-mgmt-storage model, and the Event Grid event is read by azure-eventgrid. 20 Bicep texts parse with pycep, the network bug is scanned with Checkov (the open copy fails the firewall check and the fixed copy passes), the Checkov challenge runs on a real report, the GitHub workflow goes through check-jsonschema, and the shell goes through `bash -n` and the help of the Azure CLI 2.92 (6 commands and 15 options) |
| Lab logic (`azure/verify/check_widgets.js`) | 5,504 checks. The listing rule is applied to the ten recorded blob names, the SAS answers follow the rules of the token fields, an independent model of the access order agrees with the lab on all 5,184 combinations of its facts, the role tree, the credential chain, the expression evaluator, three watermark replays, the wildcard matcher, the 60 buckets, the batch and checkpoint arithmetic, the queue timeline and the bill match values worked out by hand |
| Controls | 28 deliberately broken inputs (a misspelled keyword, a method that does not exist, a missing required argument, too many positional arguments, a misspelled import, Python and SQL that do not parse, an OPENROWSET with a wrong format or a relative path, a `filepath(3)` with two wildcards, a misspelled DISTRIBUTION, a hash column that is not in the table, a COPY option that does not exist, a wrong SQL solution, JSON, YAML, KQL and Bicep with syntax errors, a pipeline with an unknown activity, an `az` option and command that do not exist) are fed to the checkers, and the verifier fails if a checker accepts one. The lab checks were also run against 14 deliberately broken versions of the widgets (rounding that goes down, a rule that ignores a switch, a tree that stops at its root, a reversed credential order, a wrong date step, a wrong rate, a right answer marked wrong, and others), and each one made a check or a load-time guard fail |
| Recapture | `python3 azure/verify/verify_az.py --recapture` runs the whole recording again and compares it with `js/real.js` |

### What was not checked

- **Nothing ran on Azure.** There was no account. Data Factory, Synapse, Event Hubs, Event Grid under load, Functions hosting, Key Vault, Entra ID, role assignments, private endpoints, Cost Management and every price are described from documentation.
- **The emulator is not Azure.** Azurite recorded what the lessons use, and the lessons use only what the documentation describes the same way. It has no soft delete, no blob versioning, no hierarchical namespace and no user delegation SAS, and its error codes differ in places: for an expired or edited SAS it answers `AuthorizationFailure` where the service answers `AuthenticationFailed`. The lessons name these gaps on the screens where they matter. Azure RBAC, ACLs and the storage firewall are not enforced by Azurite, so the access lab applies the documented order of checks.
- **The Bicep program was not run.** The compiler could not be run in the build environment, so the Bicep files were parsed with pycep and scanned with Checkov, and never compiled or deployed. Checkov is static analysis: it reads properties, not intent. A file that was meant to be secure but had no explicit `networkAcls` failed its firewall check in the recording, and the lesson shows that. What-if, deployment modes and the behavior of a real deployment come from the documentation.
- **The pipeline checker is not Data Factory.** `adf_check.py` reads the classes of azure-mgmt-datafactory and adds three rules that Data Factory applies when you publish (unique activity names, a dependency on an activity that exists, no loop). A pipeline that passes can still fail at run time. The expression lab is a small model written from the documented functions, and a debug run in the service is the final word.
- **The Spark and Delta Lake output is from open-source engines on one machine.** Spark 4.0.1 and Delta Lake 4.0.1 ran locally. The runtimes of Synapse Spark, Fabric and Databricks differ in version and defaults. The abfss paths, catalogs, Unity Catalog and Fabric are described from documentation.
- **The 60-bucket and the partition spreads use a stand-in hash.** They show how few values or one heavy key skew a table or a stream. They are not the hash of the service.
- **The serverless wildcard lab applies the documented rule to real file names.** The file counts and sizes are real, from Parquet files written with DuckDB, and the billed bytes are computed from them (two columns of a Parquet file). Synapse did not read them, and its own accounting can differ a little.
- **The Microsoft documentation could not be opened** while this was built, because the build environment blocked the host. Every "From documentation" statement comes from search summaries of the Microsoft pages and from the documentation text inside the Azure SDK. Read the page before you rely on a detail. The table below lists what to read.
- **Prices are examples.** The lessons use rounded public rates for one region as they appeared in search results and third-party price guides, and each one says it is an example. Microsoft changes prices.
- **Code that needs Azure itself was parsed and checked against the libraries, not run**: the Event Hubs producer and consumer, the Key Vault client, the Data Factory management calls, and the T-SQL of Synapse. Their calls were checked against the installed SDK, and the parts that do not need a service (batching, the checkpoint store, the queue) were run.
- **Screenshots were reviewed for a handful of screens**: the platform diagram, a few labs at desktop width and phone width. The walk of every frame checks errors, overflow and text size by script. It does not judge how every frame looks.

## Re-check before you rely on these

These claims are the most likely to be out of date, or rest on search summaries or on the SDK text. Each one carries a "From documentation" tag in the lesson.

| Claim in the course | Where | What to read |
| --- | --- | --- |
| A serverless SQL pool bills the data processed (read from storage, moved between its nodes, written by CETAS), rounded up to the next MB, with a 10 MB minimum for each query. Statements that only touch metadata are free. Limits per day, week and month are set with `sp_set_data_processed_limit` and are checked when a query is submitted: a running query is not stopped. `sys.dm_external_data_processed` shows the use. About $5 for each TB is an example from third-party guides | Missions 7 and 12 | Microsoft's pages on cost management for serverless SQL pool in Azure Synapse Analytics, and the Azure Synapse pricing page |
| A serverless pool reading Parquet should use the UTF-8 collation `Latin1_General_100_BIN2_UTF8` and `varchar`. Files of 100 MB to 10 GB are the best size | Mission 7 | The best practices page for serverless SQL pool |
| A dedicated SQL pool always has 60 distributions. DW1000c is 2 compute nodes with 30 distributions each, DW30000c is 60 nodes with 1 each. A columnstore rowgroup holds up to 1,048,576 rows, and about 100,000 rows is the floor for good quality. Hash for large tables, replicated for small ones (the guidance is under 2 GB). Statistics are created automatically but not updated automatically. The 60 million figure is arithmetic (1,048,576 times 60), not a quote | Mission 8 | Microsoft's design guidance for distributed tables, the columnstore design guidance, and the statistics page for dedicated SQL pool |
| A reservation for a dedicated pool is one or three years, billed every hour whether or not the pool runs, and does not renew by itself | Mission 12 | Azure reservations for Synapse |
| Event Hubs: a maximum event size of 256 KB on Basic and 1 MB on Standard and above. Retention up to 7 days on Standard and 90 on Dedicated. Capture writes by a time window of 1 to 15 minutes (default 5) and a size window of 10 to 500 MB (default 300). The partition count is fixed after creation on the Basic and Standard tiers. A throughput unit is 1 MB a second or 1,000 events a second in. The limits of partitions and consumer groups for each tier are not quoted, because sources disagreed | Missions 9 and 12 | The Event Hubs quotas page and the Capture page |
| Event Grid retries delivery for up to 30 attempts over 24 hours by default, and can write failed events to a blob container. In an account with a hierarchical namespace a write raises BlobCreated for `CreateFile` and for `FlushWithClose`, so a handler filters on `FlushWithClose` | Missions 2 and 10 | The Event Grid delivery and retry page, and the Blob Storage event schema |
| An Azure Functions queue trigger moves a message to `<queue>-poison` after 5 dequeues by default. Linux Consumption has an announced retirement date, and Flex Consumption is the new serverless plan | Missions 1 and 10 | The Functions queue trigger page, and the hosting plans page |
| Key Vault soft delete keeps a deleted vault or secret for 7 to 90 days (default 90). Purge protection is optional and not on by default. Recovering a vault does not bring back its role assignments. The role-based model is recommended over access policies | Missions 11 and 13 | The Key Vault soft delete and RBAC pages |
| A private endpoint needs a private DNS zone such as `privatelink.dfs.core.windows.net` linked to the network. The trusted-services bypass lets some Microsoft services past the storage firewall | Mission 11 | The private endpoint DNS page and the storage network rules page |
| A user delegation SAS lives for at most seven days. Lifecycle rules move data to Cool, Cold and Archive by days since the last change, and the `prefixMatch` of a rule starts with the container name. Cool, Cold and Archive have minimum storage times and a retrieval fee | Mission 2 | The storage SAS, lifecycle management and access tier pages |
| Owner, Contributor and Reader hold no blob data actions, so an Entra token with only those roles reads no blob. The built-in role names and what each allows. `ba92f5b4-2d11-453d-a403-e96b0029c9fe` is the id of Storage Blob Data Contributor | Mission 3 | The Azure built-in roles page |
| A new role assignment can take a few minutes to take effect | Mission 3 | The Azure RBAC troubleshooting page |
| A Data Factory copy uses 2 to 256 DIUs (Auto by default). A ForEach runs at most 50 iterations in parallel. About $1 for 1,000 activity runs, $0.25 for each DIU-hour and $0.274 for each vCore-hour of a data flow are examples | Missions 4, 5 and 12 | The Data Factory copy performance page, the ForEach activity page and the pricing page |
| Azure Blueprints is being retired, with the end date moved to January 2027, and deployment stacks and template specs are the replacements. Synapse has not been retired, but the guidance for new work points to Fabric. Parts of Synapse and HDInsight have their own retirement notices | Missions 1, 6 and 13 | The retirement pages of each service |
| `az deployment group create` is incremental unless you pass `--mode Complete`, which deletes what is not in the template. What-if lists Create, Modify, Delete, Ignore and NoChange | Mission 13 | The Bicep deployment and what-if pages. The CLI options were checked against Azure CLI 2.92 |
| A GitHub Actions job signs in with `azure/login` and the three ids of a federated credential (client, tenant and subscription), and the job needs `id-token: write` | Missions 3 and 13 | The `azure/login` README and the Entra workload identity federation page |
| Every price: storage about $0.02 for each GB in Hot and $0.01 in Cool, a dedicated pool about $1.20 for each 100 DWU-hour, Event Hubs about $0.03 for each throughput unit and hour, Log Analytics about $2.30 for each GB, a private endpoint about $0.01 an hour, and data out about $0.087 for each GB after 100 GB | Missions 1, 2, 7, 8, 9 and 12 | The Azure pricing pages. These are examples, and Microsoft changes them |

## Run it yourself

The course never connects to Azure, but the code behind the recording runs on a laptop.

```bash
pip install -r dev/requirements.txt
npm install --prefix azure/verify
python3 azure/verify/capture_az.py
python3 azure/verify/verify_az.py
```

`capture_az.py` runs every scenario in the course against Azurite and the other tools and rewrites `azure/js/real.js`. The lakehouse section needs Java 17 or 21 and an interpreter that has `pyspark==4.0.1` and `delta-spark==4.0.1` (set `AZ_SPARK_PYTHON`), and the infrastructure section needs an interpreter with `checkov`, `check-jsonschema` and `pycep-parser` (set `AZ_IAC_PYTHON`). The recording takes about two minutes, most of it Spark. `verify_az.py` takes about 30 seconds. A check whose tool is missing says so and is skipped: `AZ_CLI` points at the Azure CLI, `--no-run` skips everything that starts a tool, and `--no-cli` skips the `az` commands. With `--recapture` it also records everything again and compares it with `js/real.js`. Add `--reuse` to compare the recording kept from the last `--recapture` without recording again.

`azure/verify/funcproj/` is the Function handler and its tests, `azure/verify/adfproj/` holds the pipeline files and `azure/verify/iacproj/` the Bicep project and the workflow.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration. The coach of this course is Noor, set by `coach` in the same file. The other tutorials keep Sam.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `LAB.get`, which reads `js/real.js`.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only. Every scene that shows a fact has a source `src`: `rec` or `docs`.
- **Replace the story.** The interview answers use general examples and the numbers of the Brewline data. Wherever a screen carries a "Real" prompt, swap in a real story with real numbers.
- **Update the recording.** After an upgrade of the Azure SDK or Azurite, run `python3 azure/verify/capture_az.py`, then the lint. A lesson that quotes a number that changed fails loudly.

## Files

```text
index.html               the page
css/azure.css            styles for the labs
js/config.js             title, coach, paths, welcome text, map chips
js/real.js               everything recorded: files, texts, tables, counts
js/helpers.js            LAB.get: reads real.js and fails when a key is missing
js/graphs.js             fourteen diagrams, plain data
js/widgets.js            the twelve labs
js/content/              00-start.js to 14-boss.js, one file per mission
verify/capture_az.py     records the SDK against Azurite, DuckDB, Spark, Checkov and more, and writes js/real.js
verify/spark_job.py      the local Spark and Delta Lake run that capture_az.py starts
verify/verify_az.py      checks snippets, SQL, KQL, JSON, Bicep, YAML, the shell, the az commands and, with --recapture, the recording
verify/check_widgets.js  checks the labs against the recording and against arithmetic
verify/adf_check.py      checks a Data Factory pipeline file against the SDK models
verify/kql_check.js      parses KQL with the Kusto language service
verify/funcproj/         the Function handler, its event and its tests
verify/adfproj/          the pipeline files, good and broken
verify/iacproj/          the Bicep project, the examples and the GitHub workflow
```
