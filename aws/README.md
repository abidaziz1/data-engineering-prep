# AWS for data engineers: from the first bucket to production

A guided, press-Next course for data engineers. Coach Sam follows **Brewline**, an online coffee retailer, as it builds a data platform on AWS. You see how a request is signed, how S3 lists and versions objects, how a policy allows or denies a call, how the Glue catalog and Athena find data, what a scan costs, how a stream spreads over shards, what a queue does with a message that keeps failing, how Step Functions retries, how KMS and endpoints protect the data, what the bill is made of, and how a template builds it all. The last mission is a boss round of interview questions.

Open **`index.html`** in a browser. No install, no account.

## What is recorded and what is not

Nothing in this course ran on AWS. Two kinds of screens carry a tag, so you always know which kind you are reading.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output of open-source tools, run on one machine with the Brewline data: the **AWS SDK** (boto3 and botocore 1.43.126, the real client library) against **moto 5.2.5**, an open-source **emulator** of AWS services, plus DuckDB and pyarrow for file sizes, cfn-lint, parliament, asl-validator, the Powertools S3 event class and pytest. Moto is not AWS. The lessons use it only for behavior that the AWS documentation describes the same way. |
| **From documentation** | Everything that belongs to the AWS services themselves: how Glue, Athena, Redshift, Kinesis, Firehose, EventBridge, Lambda, Step Functions, KMS and the cost tools behave, their limits, defaults and prices. The facts come from the AWS documentation as it was found while this was built, and from the documentation strings that ship inside the AWS SDK service models. |

Three labs are not measurements. The Redshift key lab is a **model with made-up numbers** (it says so on screen), and the retry lab and the bill lab are **arithmetic** on documented rules and example prices. The bill lab is not a price list.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 692 | about 6 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 1,206 | about 11 hours | Everything in Junior, plus design, security, cost and delivery decisions |
| **Everything** | 1,254 | about 11.5 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. You can switch paths at any time from the **Map** button, and you can jump to any mission from the same screen.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The AWS map for data engineers | 19 min | 28 min | 28 min |
| 2 | S3: the storage of the lake | 25 min | 45 min | 45 min |
| 3 | IAM: identities, policies and roles | 20 min | 44 min | 44 min |
| 4 | Glue, EMR and the Data Catalog | 22 min | 42 min | 44 min |
| 5 | Athena: SQL on the lake and what a scan costs | 35 min | 57 min | 65 min |
| 6 | Redshift: the warehouse for repeated queries | 26 min | 50 min | 54 min |
| 7 | Streaming and change data: Kinesis, Firehose, MSK, DMS | 26 min | 56 min | 56 min |
| 8 | Events, queues and Lambda | 28 min | 53 min | 55 min |
| 9 | Orchestration: Step Functions, schedules and Airflow | 23 min | 45 min | 48 min |
| 10 | Security and networking: KMS, secrets, endpoints and PII | 23 min | 51 min | 53 min |
| 11 | Cost and operations: bills, tags, alarms and freshness | 21 min | 46 min | 48 min |
| 12 | Infrastructure as code and delivery | 30 min | 53 min | 55 min |
| 13 | Boss round and cheat sheet | 53 min | 93 min | 97 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

Mission 13 has a coding round, two incident drills that mix topics, a design decision, a mock interview of up to 40 questions drawn from the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet.

## What you work through

- **Follow the Brewline orders.** A file lands in S3 under `raw/orders/dt=2026-03-14/`. You list it with a prefix and a delimiter, version it, sign a request for it, allow and deny it with IAM, register its partition in the Glue catalog, turn it into Parquet with a CTAS, query it with Athena, load it into Redshift, stream it through Kinesis, start a load from its S3 event, order the nightly run with Step Functions, encrypt it with KMS, read the bill, and describe the whole stack as a CloudFormation template.
- **11 animated diagrams.** The whole platform, a bucket and its events, the decision chain of IAM, the Glue catalog, an Athena query, Redshift, a Kinesis stream, an event-driven load, the nightly state machine, a VPC for data jobs, and delivery from a pull request to two accounts.
- **3 terminal replays of real output.** The AWS CLI against S3, pytest passing and failing on a Lambda handler, and cfn-lint on a good and a broken template.
- **11 labs.** List a bucket with prefixes and delimiters. Step through versions and delete markers. Follow a signature from the canonical request. Predict allow or deny for ten requests, then toggle the layers. See which bytes an Athena query reads in five file layouts. Pick a partition key and watch the shard, the skew and a split. Step through the visibility timeout and the dead-letter queue. Test six EventBridge patterns on six events. Try distribution and sort keys on a model cluster. Compute a retry schedule. Work out a monthly bill and five savings.
- **55 code walkthroughs.** Line-by-line explanations of Python with boto3, SQL for Athena and Redshift, JSON policies and state machines, YAML templates and a workflow, and AWS CLI commands, with the real output beside the code where there is one.
- **3 coding rounds.** Keep the newest copy of each order, apply a change log of inserts, updates and deletes, and find the partitions that are missing from the catalog. The verifier runs all three, two in DuckDB and one against the emulator, and the results match what the lessons show.
- **52 quizzes, 16 bug hunts, 12 ordering games, 13 architecture decisions with a recommended answer, and 25 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **73 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 14 chapters, 453 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 692, 1,206 and 1,254 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Body text stays at 14 px or larger. Labels inside diagrams scale down to between 9 and 12.4 px. Long identifiers such as `ProvisionedThroughputExceededException` break across lines instead of widening the page |
| Interaction test: every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All eleven labs are also driven in the browser against the recording and against arithmetic done by hand | 2,022 checks passed |
| Recorded output (`aws/verify/capture_aws.py`) | 26 files, 10 texts, 7 result tables and 43 sets of counts: listings, signatures, policy decisions, catalog calls, file layouts and scan sizes, shard mappings, queue timelines, event patterns, envelope encryption, secret versions, template findings, handler tests and CLI output. The whole recording was made twice from scratch. The two runs agree on every item except the size of the 90 daily Parquet files, which varies by about 0.02 % between runs because DuckDB writes them with several threads, and the order of the lines that `aws s3 sync` prints for parallel uploads |
| Code in the lessons (`aws/verify/verify_aws.py`) | 49 pieces of Python parse, and 60 boto3 calls and 6 paginators are checked against the botocore service model (the client, the method, every keyword, the required members, and the type, enum and range of every literal value). 37 snippets run against moto and are compared with the recording or with what the lesson says, among them the S3 conditional write and the paginated count, an assumed role, a KMS round trip, secret versions, parameters, alarms, budgets, Firehose, EventBridge, a schedule, a Step Functions start with a name, Kinesis with a producer that resends only the failures, SQS and the Athena polling loop. Other runs sit beside them: the missing-partitions coding round against moto S3 and Glue, both Lambda handlers for batch failures, the Data API polling loop against a stub client (moto never finishes a statement), and the recorded handler tests, run again with pytest. 34 SQL statements parse with sqlglot in the Athena or Redshift dialect, and 3 bare commands match their documented form. 14 JSON documents parse, 5 IAM policies go through parliament, and the Step Functions definitions go through asl-validator, which gives the recorded errors for the three broken copies. The S3 event is read by the Powertools S3Event class, the table definitions and the lifecycle rule go through the botocore models and moto, the CloudFormation templates go through cfn-lint (the broken one gives the five recorded findings), the GitHub workflow goes through the SchemaStore schema, and the shell commands go through `bash -n`, the CLI option table and the service model |
| Lab logic (`aws/verify/check_widgets.js`) | 267 checks. The listing rule is applied to the ten recorded keys, a second SigV4 chain agrees with botocore, the hash of every Kinesis key is recomputed, a second EventBridge matcher agrees with all 36 recorded answers, the distribution model is recomputed with a different hash code, and the bill and the retry arithmetic match sums done by hand |
| Controls | 12 deliberately broken inputs (a misspelled keyword, a wrong type, a missing parameter, a method and a paginator that do not exist, Python and SQL that do not parse, an unknown command form, a CLI option that does not exist, a misspelled IAM action) are fed to the checkers, and the verifier fails if a checker accepts one |
| Recapture | `python3 aws/verify/verify_aws.py --recapture` runs the whole recording again and compares it with `js/real.js`, apart from ids, work folders and the two differences above |

### What was not checked

- **Nothing ran on AWS.** There was no account. Glue and EMR jobs, the Athena engine, Redshift, Kinesis under load, Firehose delivery, MSK, DMS, EventBridge delivery and retries, Lambda runtime and concurrency, Step Functions runs, MWAA, Lake Formation, KMS key policies, CloudTrail, Config, GuardDuty, Macie, Cost Explorer, Budgets and every price are described from documentation.
- **The emulator is not AWS.** Moto recorded what the lessons use, and the lessons use only what the documentation describes the same way. IAM allow and deny was recorded in moto's special enforcement mode, which needs an exact count of the setup calls made before the first enforced call, and the layers it cannot show (service control policies, boundaries, cross-account) come from the documented evaluation logic. The first probes showed emulator behavior that differs from AWS, and the lessons do not present it as fact: Kinesis sequence numbers are 1, 2, 3 in moto, KMS blob sizes are not those of AWS, Firehose delivers at once, Lambda invocation needs Docker, Athena returns no real results, Redshift answers metadata only, there is no EventBridge pattern test call, moto does not run state machines the way AWS does, and the text of an S3 `AccessDenied` is just "Access Denied". The verifier found three more. Moto accepts a second Step Functions start with the same execution name, where the documentation says Standard workflow names are unique. It does not run `start_message_move_task`. It never finishes a Redshift Data API statement, so that polling loop runs against a stub client. The lessons take these from the documentation and the SDK service model, and say so.
- **The Athena scan sizes are a calculation.** The five layouts of the same 2 million orders were written with DuckDB, and the bytes a query reads were computed from the real file sizes, the Parquet footers and the column chunks: the least a columnar reader has to fetch. Athena did not read them, and its billed bytes can differ a little. The lab says so.
- **The Redshift key lab is a model.** The cluster, the hash function and the 7,994 orders are made up. The join labels, the rules that choose a move and the idea of zone maps come from the Redshift documentation.
- **The AWS documentation could not be opened** while this was built, because the build environment blocked the host. Every "From documentation" statement comes from search summaries of AWS pages, and from the documentation text inside the AWS SDK service models (boto3 and botocore 1.43.126), which mirror the API reference. Read the page before you rely on a detail. The table below lists what to read.
- **Prices are examples.** The lessons use public US East rates as they appeared in search results and third-party price guides, and each one says it is an example. AWS changes prices.
- **The recorded terminal uses AWS CLI version 1** (1.46.3, installed with pip). Version 2 prints some things differently.
- **Code that needs AWS-only libraries was parsed, not run**: the Glue job script (`awsglue`) and anything that talks to a real service. Calls were checked against the service model, and many were run against the emulator.
- **The Airflow, CDK and Terraform parts are descriptions.** They are comparisons with no code. Airflow and Terraform are planned as tutorials of their own.
- **Screenshots were reviewed for a handful of screens**: the platform diagram, the Athena scan lab, the Redshift key lab and the Kinesis lab at desktop width, and the Athena lab and a Kinesis incident at phone width. The walk of all 1,254 frames checks errors, overflow and text size by script. It does not judge how every frame looks.

## Re-check before you rely on these

These claims are the most likely to be out of date, or rest on search summaries or on the SDK model text. Each one carries a "From documentation" tag in the lesson.

| Claim in the course | Where | What to read |
| --- | --- | --- |
| A DPU is 4 vCPUs and 16 GB. G.1X is 1 DPU, G.2X is 2, G.025X is a quarter DPU for light streaming jobs. The default job timeout is 2,880 minutes up to Glue 4.0 and 480 minutes from Glue 5.0. The default maximum concurrent runs is 1 | Missions 4 and 9 | [Glue job properties](https://docs.aws.amazon.com/glue/latest/dg/add-job.html) and the text of `CreateJob` and `ExecutionProperty` in the Glue SDK model |
| Glue prices: about $0.44 for each DPU-hour, Flex about $0.29, billed by the second with a one minute minimum | Missions 4 and 11 | [Glue Flex jobs](https://aws.amazon.com/blogs/big-data/introducing-aws-glue-flex-jobs-cost-savings-on-etl-workloads/) and the Glue pricing page. The rates in the course come from third-party price guides |
| Athena: $5 for each TB scanned, rounded up to the next MB, 10 MB minimum for each query. DDL and failed queries are not billed. Provisioned capacity about $0.30 for each DPU-hour, with minimums that sources disagree on | Mission 5 | [Athena pricing](https://aws.amazon.com/athena/pricing/) |
| CTAS and INSERT INTO write at most 100 partitions in one statement (`HIVE_TOO_MANY_OPEN_PARTITIONS`) | Missions 5 and 13 | [CTAS and INSERT INTO](https://docs.aws.amazon.com/athena/latest/ug/ctas-insert-into.html) |
| CTAS: partition columns last in the SELECT list, and an empty `external_location` (`HIVE_PATH_ALREADY_EXISTS`). A workgroup that enforces a result location refuses `external_location` | Mission 5 | [CREATE TABLE AS](https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html) and [the error](https://repost.aws/knowledge-center/athena-hive-path-already-exists) |
| Result reuse: default maximum age 60 minutes, up to 10,080, same workgroup, identical query text. A per-query scan limit cannot be below 10 MB. Workgroup-wide limits raise an alarm | Mission 5 | [Reuse query results](https://docs.aws.amazon.com/athena/latest/ug/reusing-query-results.html) and the Athena SDK model |
| Athena engine version 3 is built on Trino. Iceberg syntax: `PARTITIONED BY (day(col))`, `MERGE INTO`, `OPTIMIZE ... REWRITE DATA USING BIN_PACK`, `VACUUM` | Mission 5 | The Athena documentation pages for Iceberg tables. The statements were parsed, not run |
| RA3 nodes: ra3.xlplus has 4 vCPUs, 32 GiB and 2 slices | Mission 6 | [Introducing RA3 xlplus](https://aws.amazon.com/blogs/big-data/introducing-amazon-redshift-ra3-xlplus-nodes-with-managed-storage/). The slice counts of the larger nodes are not stated in the course |
| Redshift prices: about $3.26 an hour for one ra3.4xlarge and about $0.375 for each RPU-hour | Missions 6 and 9 | The Redshift pricing page. The rates come from third-party price guides |
| COPY: many files of equal size, a multiple of the slice count, 1 MB to 1 GB after compression, one COPY for a table | Mission 6 | [Loading data files](https://docs.aws.amazon.com/redshift/latest/dg/t_splitting-data-files.html) and [use multiple files](https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-use-multiple-files) |
| COPY from Parquet maps columns by position according to the documentation, and by name according to a community answer. The lesson tells you to give an explicit column list | Mission 6 | [Column mapping options](https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-column-mapping.html) |
| EXPLAIN join labels: DS_DIST_NONE and DS_DIST_ALL_NONE are good, DS_BCAST_INNER and DS_DIST_BOTH are costly. One documentation page lists DS_DIST_NONE wrongly, and the course follows the others | Mission 6 | [Evaluating the query plan](https://docs.aws.amazon.com/redshift/latest/dg/c_data_redistribution.html) and [EXPLAIN data redistribution](https://docs.aws.amazon.com/prescriptive-guidance/latest/query-lifecycle-redshift/explain-redistribution.html) |
| Redshift does not enforce primary key, foreign key and unique constraints, and TRUNCATE commits the transaction it runs in | Mission 6 | The Redshift documentation on table constraints and on TRUNCATE. Both come from memory, and the lessons say so |
| A shard takes 1,000 records and 1 MB a second, as the `PutRecords` text of the Kinesis SDK model says. The `PutRecord` text of the same model says 10 MiB a second, so the lesson names its source and the limit needs a look at the current quotas. Retention is 24 hours up to 365 days | Mission 7 | The Kinesis quotas page. These limits change |
| Firehose buffer: 1 to 128 MiB (default 5) and 0 to 900 seconds (default 300) | Mission 7 | The `BufferingHints` text in the Firehose SDK model |
| Lambda event source settings for Kinesis: batch size up to 10,000, parallelization factor 1 to 10, retry attempts and record age default to infinite. For SQS, `MaximumConcurrency` caps the readers | Missions 7 and 8 | The `CreateEventSourceMapping` text in the Lambda SDK model |
| DMS S3 target: the first field is I, U or D, an update holds the values after the change, a delete the values before. CDC files are written at 32 MB or 60 seconds by default | Mission 7 | [DMS S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html) and the `S3Settings` text in the DMS SDK model |
| SQS: maximum message size 1 MiB, retention 4 days by default and up to 14, visibility timeout 30 seconds by default and up to 12 hours, maxReceiveCount default 10. The visibility timeout should be at least six times the function timeout | Mission 8 | The `CreateQueue` text in the SQS SDK model. The six-times rule is from the Lambda documentation and was not re-read |
| EventBridge target retry: 0 to 185 attempts and 60 seconds to 24 hours. Pattern semantics: a list is an OR, fields are an AND | Mission 8 | The `RetryPolicy` text in the EventBridge SDK model. The six recorded patterns agree with a second matcher |
| Lambda asynchronous retries: 0 to 2, event age 60 seconds to 6 hours | Mission 8 | The `PutFunctionEventInvokeConfig` text in the Lambda SDK model |
| Standard workflows run for up to a year and Express workflows for 5 minutes. About $0.025 for 1,000 state transitions. Standard execution names are unique, and reusable 90 days after they close | Mission 9 | The Step Functions documentation (limits and pricing). The name rule is from the SDK model, the rest from memory |
| MWAA: about $0.49 an hour for the small environment class, classes from mw1.micro to mw1.2xlarge | Mission 9 | [MWAA pricing](https://www.aws.amazon.com/managed-workflows-for-apache-airflow/pricing/) and the MWAA SDK model |
| EventBridge Scheduler: a Step Functions state machine can be the target by its ARN, and `<aws.scheduler.scheduled-time>` is a context attribute | Mission 9 | The EventBridge Scheduler documentation. The call was run on the emulator, which does not check the placeholder |
| KMS: customer managed key rotation is off by default. About $1 a month for each key and $0.03 for 10,000 requests. S3 Bucket Keys cut request traffic by up to 99 % | Mission 10 | The KMS and S3 documentation and pricing pages. These come from memory |
| Interface endpoints about $0.01 an hour for each zone and $0.01 for each GB. NAT about $0.045 an hour and $0.045 for each GB. Secrets Manager about $0.40 for each secret | Missions 10 and 11 | The pricing pages of VPC, Secrets Manager and Systems Manager |
| Cost Explorer API about $0.01 for each request. Data transfer: about $0.01 for each GB between zones, $0.02 between regions, $0.09 out to the internet | Mission 11 | The pricing pages of Cost Management and of data transfer |
| `aws cloudformation deploy` options, and `CAPABILITY_NAMED_IAM` for named roles. Change sets show Replacement. `continue-update-rollback` recovers `UPDATE_ROLLBACK_FAILED` | Mission 12 | The CloudFormation documentation. The deploy options were read from AWS CLI 1.46.3, the rest from memory |
| GitHub OIDC: `id-token: write` and the role trust policy | Missions 3 and 12 | The GitHub and AWS documentation on OpenID Connect |

## Run it yourself

The course never connects to AWS, but the code behind the recording runs on a laptop.

```bash
pip install -r dev/requirements.txt
npm install --prefix aws/verify
python3 aws/verify/capture_aws.py
python3 aws/verify/verify_aws.py
```

`capture_aws.py` runs every scenario in the course against moto and rewrites `aws/js/real.js`. It writes 2 million orders in five layouts with DuckDB, which needed a peak of about 400 MB of temporary disk on the machine that built this. `verify_aws.py` took about 12 seconds there. With `--recapture` it also records everything again and compares it with `js/real.js`, and the whole run took 52 seconds. Add `--reuse` to compare the recording kept from the last `--recapture` without recording again. `--offline` skips the download of the GitHub workflow schema, and `--no-run` skips the runs against moto, DuckDB and pytest.

`aws/verify/lambdaproj/` is the Lambda handler and the tests of mission 8 and mission 12, and `aws/verify/cfnproj/` holds the CloudFormation templates.

## Make it yours

- **Coach photo.** Put a picture in this folder, for example `coach.jpg`, and set `coachPhoto: 'coach.jpg'` in `js/config.js`. Leave it empty to keep the illustration.
- **Edit a lesson.** Each mission is one file in `js/content/`. Questions, answers, code and diagrams are plain data. Anything that is output comes from `LAB.get`, which reads `js/real.js`.
- **Change who sees what.** Every scene has a tier `t`: 1 for everyone, 2 for Senior and Everything, 3 for Everything only. Every scene that shows a fact has a source `src`: `rec` or `docs`.
- **Replace the story.** The interview answers use general examples and the numbers of the Brewline data. Wherever a screen carries a "Real" prompt, swap in a real story with real numbers.
- **Update the recording.** After an upgrade of boto3 or moto, run `python3 aws/verify/capture_aws.py`, then the lint. A lesson that quotes a number that changed fails loudly. The 90 daily Parquet files change in size by about 0.02 % from run to run, so a lesson that quotes their total needs the new value after every recording.

## Files

```text
index.html               the page
css/aws.css              styles for the labs
js/config.js             title, paths, welcome text, map chips
js/real.js               everything recorded: files, texts, tables, counts
js/helpers.js            LAB.get: reads real.js and fails when a key is missing
js/graphs.js             eleven diagrams, plain data
js/widgets.js            the eleven labs
js/content/              00-start.js to 13-boss.js, one file per mission
verify/capture_aws.py    runs boto3 against moto, DuckDB, cfn-lint, parliament and pytest and writes js/real.js
verify/verify_aws.py     checks snippets, SQL, policies, templates, the workflow, the shell and, with --recapture, the recording
verify/check_widgets.js  checks the labs against the recording and against arithmetic
verify/asl_check.js      asl-validator for Step Functions definitions
verify/lambdaproj/       the handler, its event and its tests
verify/cfnproj/          the CloudFormation templates
```
