# Apache Kafka for data engineers: from a record on disk to production

A guided, press-Next course for data engineers. Coach Mara follows **Brewline**, the coffee retailer, as its data team learns to run Apache Kafka properly. You open the log of a partition and read its files, see which partition a key goes to, kill a broker and watch a leader being elected, lose an acknowledgement and see a duplicate, crash a consumer between processing and committing, compact a topic, break a connector on purpose, read a change event from a database, rename a field in a schema, count orders in a stream, get denied by an ACL, and restart a cluster under load. Every number on the screens was read from a real Apache Kafka 4.4.0 on one machine.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Nothing in this course ran on a network, on Kubernetes, on a managed service, or under real load.** Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `kafka/verify/capture_kafka.py` on one machine with made-up Brewline data: the unmodified **Apache Kafka 4.4.0** binary distribution in KRaft mode with **three brokers** (and its command line tools, Kafka Connect and Kafka Streams), **PostgreSQL 16.15** with **Debezium 3.7.1.Final**, the **confluent-kafka 2.16.1** client (librdkafka 2.16.0), **fastavro 1.13.1**, **pytest 9.2.0**, Java 21 and Python 3.13. The files of a partition and its indexes, the offsets, the partitions of keys, acknowledgements, elections and lost records, group rebalances, transactions and their markers, retention and compaction, connector states and dead letters, change events and the log that a replication slot holds back, Avro results, Streams topologies, state and restarts, ACL errors, JMX metrics, a rolling restart, a partition move, a quota and pytest runs |
| **From documentation** | MirrorMaker 2, Kubernetes and Strimzi, Amazon MSK, Confluent Cloud and the Event Hubs Kafka endpoint, tiered storage, ksqlDB, Kerberos, OAuth and role based access control, Protobuf and JSON Schema in a registry, the JDBC and S3 connectors, Flink, and what the release notes of Kafka list. Nothing was timed |

The stand-ins and limits, said again where they matter:

- **One machine is not a cluster of machines.** The three brokers are three processes with their own folders and ports. The replication, the elections, the lost records and the metrics are real and are the ones that the brokers reported. There is **no network** between the brokers, so there is no latency, no partition of the network and no slow link. Nothing is timed: counts and bytes are recorded, rates are not.
- **Timers were shortened.** The retention check runs every second, a follower leaves the in-sync set after 6 seconds, a new group does not wait before its first rebalance, the cleaner and the tombstone timer run in seconds, and a consumer is removed after 6 seconds without a poll. The screens say so, and quote the real defaults.
- **A dropped acknowledgement was made with a small proxy.** A TCP proxy between the producer and one broker throws away the response to the first Produce request. The broker wrote the records, the producer never hears. It is what a network that drops a packet looks like to a client, and it is the clean way to show what idempotence does.
- **The schema registry is a stand-in.** The Confluent Schema Registry was not run. Mission 11 uses a short registry of its own, written for the lesson, that keeps versions of a schema under a subject, gives each an id, and refuses a version that breaks the mode. **What is real** is Avro: fastavro wrote real bytes with one schema and read them with another, in both directions, for nine changes. The decision of each mode applies those results.
- **Security used the simplest listeners.** The login recording uses `SASL_PLAINTEXT` with SCRAM-SHA-256, because it is easy to read. Production uses `SASL_SSL`. The plaintext controller listener of the one-node security recording lets `ANONYMOUS` in as a super user, so that the brokers could be set up, and the screen says so. The certificates were made for the recording with openssl and keytool, from a private authority that exists for 30 days.
- **The ACL lab applies a rule to recorded cases.** Seven combinations of rules were run on the real broker and are marked "recorded". Every other combination follows the same rule (a deny wins, no rule means no, a consumer needs its group) and says that it was not run.
- **The quota was lowered for the test.** The broker measures the rate over a window of 11 samples of 1 second, so a client can burst up to the quota times 11 before it is slowed down. A first test with a quota of 1,000,000 bytes per second and 6.4 MB showed nothing, because the burst allowed 11 MB. The recording uses 200,000 bytes per second, and the lesson tells the story.
- **The Streams internal topics had one copy** because the application did not set `replication.factor` and the broker default of this cluster is 1. The lesson says to set it to 3.
- **Some labs are arithmetic.** The sizing lab multiplies the write rate, the days, the copies and the recorded compression shares. The disk of a broker and the headroom are assumptions, and the screen says so.
- **The data is made up.** Orders of 12 Brewline stores. Store s01 sells a third of them, so a key with a hot store makes a hot partition. The data comes from a fixed rule, so every run writes the same records.
- **Ages are measured on the day of the recording.** The backfill that retention deletes at once used records from January that were 315 days old on the day of the recording.
- **The Apache Kafka website could not be opened** from where this was built. The documentation that ships with the release (`kafka_2.13-4.4.0-site-docs.tgz`) and the release notes of 4.4.0 were read instead, for the defaults of Kafka Streams and the names of the Connect and Streams settings. Statements about the tools that were not run come from search summaries of job postings and of the documentation, and are tagged **From documentation**.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 697 | about 6 hours | Starting out, or interviewing for a junior data engineer role that uses Kafka |
| **Senior** | 1,056 | about 10 hours | Everything in Junior, plus the replication, delivery, schema, security and operations decisions that seniors own |
| **Everything** | 1,065 | about 10 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map of Kafka | 25 min | 28 min | 28 min |
| 2 | The log on disk | 23 min | 31 min | 31 min |
| 3 | Topics, partitions and keys | 14 min | 32 min | 32 min |
| 4 | Producers | 17 min | 27 min | 27 min |
| 5 | Replication and failure | 24 min | 33 min | 33 min |
| 6 | Consumers and consumer groups | 26 min | 34 min | 36 min |
| 7 | Delivery guarantees and transactions | 25 min | 37 min | 37 min |
| 8 | Retention and compaction | 20 min | 31 min | 33 min |
| 9 | Kafka Connect | 22 min | 36 min | 36 min |
| 10 | Change data capture with Debezium | 18 min | 34 min | 34 min |
| 11 | Schemas and the registry | 21 min | 37 min | 37 min |
| 12 | Stream processing with Kafka Streams | 22 min | 36 min | 36 min |
| 13 | Security: who are you, and what may you do | 21 min | 35 min | 35 min |
| 14 | Running Kafka, and testing what uses it | 25 min | 40 min | 40 min |
| 15 | Boss round | 44 min | 104 min | 104 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

Mission 15 has two incident drills that mix missions (a deploy that doubles some orders through a rebalance, and a pipeline that stops quietly while Connect says RUNNING), a design decision, a coding round in Python (a consumer that is safe to run twice, with its real pytest run), a mock interview of up to 43 questions from the earlier missions, a scorecard, and a one-page cheat sheet of recorded numbers.

## What job descriptions ask for, and where this course covers it

I read a small sample of data engineer and Kafka job descriptions and the writing about them through search: four queries about Kafka roles, streaming data engineers, interview questions and Kafka Connect with a schema registry. I read the search summaries and not every posting, so this shows **direction and not a count**. The mission numbers say where each topic is taught.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Kafka fundamentals: partitions, offsets, consumer groups, replication and in-sync replicas. The common core of every posting | 1, 2, 3, 5, 6 | **Recorded** on a real three broker cluster: the files of a partition and the sparse index, the partition of every key, an election after a killed broker, `NOT_ENOUGH_REPLICAS`, the records that an unclean election lost, a consumer group, lag and four kinds of rebalance |
| Production experience: topic design, retention, replay, monitoring consumer lag and throughput | 3, 6, 8, 14 | **Recorded**: skew of a hot key, a reset of offsets, retention that deletes whole segments and a backfill that vanished, a compacted topic and its tombstones, the metrics of a healthy and a sick cluster, lag |
| Exactly-once, idempotent producers, commit timing. Often the senior-level question | 4, 7, 12 | **Recorded**: a lost acknowledgement with and without idempotence, commit first against process first, a transaction killed mid-way and what `read_committed` shows, and `exactly_once_v2` in Kafka Streams across a restart |
| Kafka Connect: Debezium, JDBC, custom connectors and transformations | 9, 10 | **Recorded**: a distributed worker, three converters, a source that keeps its position by name, transformations, a failed task under a running connector, a dead letter topic with headers, and Debezium on PostgreSQL. The JDBC and S3 connectors are **from documentation** |
| Change data capture, mostly Debezium. Snapshots, schema changes, downstream idempotency | 10 | **Recorded**: the snapshot, insert, update and delete as events, replica identity, a new column, the unwrap transform, a replication slot that held back the log, and events delivered twice after a crash |
| Schema Registry, Avro or Protobuf, compatibility and schema governance | 11 | **Recorded** with real Avro: nine changes in both directions, the five byte wire format, the size against JSON, and a renamed field in a JSON topic. The registry is a **stand-in**. Protobuf and JSON Schema are **from documentation** |
| Kafka Streams, and ksqlDB. State stores, windows, late records | 12 | **Recorded**: a real Streams application with its topology, internal topics, state on disk, a late record that was dropped, and a restore from the changelog. ksqlDB is **from documentation** |
| Security: SASL, mTLS, ACLs, RBAC | 13 | **Recorded**: SCRAM users, three ways a login fails, ACLs (allow, deny, prefixed, the group), TLS with client certificates and the principal that a certificate gets. Kerberos, OAuth and RBAC are **from documentation** |
| Operations: rolling restarts, upgrades, HA and DR, Kubernetes, Terraform | 14 | **Recorded**: JMX metrics, a rolling restart under load with nothing lost, a partition moved to a new broker with a throttle, a quota. MirrorMaker 2, Kubernetes, Terraform and the managed services are **from documentation** |
| Flink or Spark Structured Streaming as an alternative to Kafka Streams. Flink appears often | 1, 12 | Compared, **from documentation**. Spark has its own tutorial. Flink is planned as a tutorial of its own |
| Python and SQL, Airflow or dbt, Terraform, observability. The usual neighbours | 14 | Named, and the testing of Kafka code with pytest is **recorded**. Python, SQL and Airflow are planned as tutorials of their own |
| Experience: three years for most Kafka postings, five for senior ones | all | Two paths: the Junior path teaches the model and the failures, the Senior path adds the decisions |

The interview themes that came up most in the summaries are all missions here: why related messages share a key (order inside a partition), what an offset is and how replay works, committing too early or too late, consumer lag, eager against cooperative rebalancing, what `enable.idempotence` does, what exactly-once covers and does not, how to evolve a schema without breaking readers, and how to restart a cluster without downtime.

## What you work through

- **Follow Brewline.** 12,000 made-up orders become the files of a log. A hot store makes a hot partition. A killed broker, a lost acknowledgement and a crashed consumer each show what the settings buy. A topic is compacted, a connector fails and keeps a dead letter, a database change becomes an event, a field is renamed, a window drops a late record, an ACL denies a request, and a cluster is restarted under load.
- **17 animated diagrams.** Orange packets travel along numbered arrows: the whole platform, a cluster, a log, partitions, a producer, replication, groups, a rebalance, delivery, a transaction, retention, Connect, change data capture, Streams, security, operations and schemas.
- **4 terminal replays of real output.** `kafka-dump-log` on a partition, the next offset, the topology that Kafka Streams printed, and pytest on a copy with one check deleted.
- **12 labs.** Find an offset in the log. Place the stores on partitions. Which writes survive. Share the partitions. Crash a worker. Compact a topic. Build a pipeline. What an event says. Will the registry accept it. Windows, grace and late records. Will the request be allowed. Read the dashboard, then size the cluster.
- **33 code walkthroughs and replays.** Line-by-line explanations of the code that ran: the cluster, the hash of a key, the producers, the lossy proxy, the pipeline with its commit strategies, Connect, Debezium, Avro, the Streams application, the security setup and the tests.
- **56 quizzes, 14 bug hunts, 14 ordering games, 15 decisions with a recommended answer, and 26 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **43 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 16 chapters, 439 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 697 frames on the Junior path, 1,056 on the Senior path and 1,065 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Labels of the engine and of the diagrams are between 9 and 14.8 px |
| Interaction test (`dev/e2e.js kafka`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All 12 labs are also driven in the browser against values worked out in the test: every offset and index interval, every partition count and client, every combination of brokers, acks and minimum in-sync replicas, every member count and rebalance, 48 crash cases, the compaction guesses, 108 cases of the schema lab, 108 of the grace lab, all 128 combinations of ACLs and requests, and the sizing arithmetic | 2,067 checks passed, 0 failed |
| Recorded output (`kafka/verify/capture_kafka.py`) | 26 files, 59 texts, 54 result tables and 68 sets of counts, from 17 sections that each run on their own cluster: the log, keys, producers, replication, consumers, delivery, a lost acknowledgement, retention, Connect, change data capture, schemas, Streams, security, operations, a quota and tests |
| Code in the lessons (`kafka/verify/verify_kafka.py`) | 40 Python snippets parsed, and the 144 imports of the 25 recorded Python files resolved against the installed packages (44 more are the course's own modules). Every client setting that the course shows (44 of them) was given to the real client library, which refuses a name or a value that it does not know. The Java of the Streams application and two Java snippets compile against the libraries of the distribution. 10 shell snippets pass `bash -n`, and 48 flags were looked up in the help of the Kafka tool that they belong to. 4 JSON snippets parse and the Avro schemas are accepted by fastavro. The partition of every key, the nine schema changes, the registry decisions, the wire format and the pytest output are worked out again and compared with the recording. With `--live`, the commands of the bug hunts are run on a real cluster |
| Lab data (`kafka/verify/check_widgets.js`) | 408 checks. The index rule gives the recorded entries, murmur2 and CRC32 give the recorded partitions, the stores add up to the partitions, the range rule gives the recorded assignments, the two commit strategies give the recorded rows, compaction keeps the last record of each closed segment, the Avro rules give the recorded results, the grace rule gives the two recorded outcomes, the authorizer gives the recorded errors, the quota arithmetic holds, and the sizing sums are right |
| Controls | 12 deliberately broken inputs, and each one is refused: Python, JSON, shell and an Avro schema that do not parse, a client setting that does not exist, a client setting of the wrong kind, a flag that a tool does not have, a Streams constant that does not exist, a table of schema results with one cell changed, and three recordings with one number changed that the lab checks must refuse |
| Recapture | `kafka-env/bin/python kafka/verify/verify_kafka.py --recapture` runs the whole recording again (about 45 minutes) and compares it with `js/real.js`. The first full run compared 181 items. Ten differed for reasons that the script states: a random partitioner, a coordinator or a proposal chosen at random, the order in which two members' callbacks arrive, a producer that sends more orders when the restarts take longer, and a few milliseconds of a wait. Five differed without a reason, and were fixed: a table that was read before every partition had shrunk its in-sync set (the recorder now waits for all of them), and four texts that held a clock time or a random id (the recorder now replaces them with markers). The four sections that changed were then recorded again and compared with the first recording of the fix: 64 items, 8 differ for a stated reason (where the batches began and ended, and member ids), none without one |

### What was not checked

- **Nothing ran on a network or under load.** What a real cluster does with a slow link, a full disk or a million messages a second was not measured. Those parts are described from documentation.
- **MirrorMaker 2, Kubernetes, the managed services, tiered storage, ksqlDB, Kerberos, OAuth and role based access control were not run.** They are described from documentation, and the screens say so.
- **The Confluent Schema Registry was not run.** The registry of mission 11 is a stand-in. The Avro results are real.
- **Times were not measured.** The lessons compare counts, bytes and the settings that decide. A claim that something "is faster" is a claim about the mechanism, and not a stopwatch.
- **Defaults are those of Apache Kafka 4.4.0.** Another release may differ. The table of defaults in mission 1 and the lessons name the ones that matter.
- **The sizing is arithmetic.** The disk of a broker, the headroom and the traffic are assumptions.
- **The Apache Kafka website could not be opened.** The documentation that ships with the release was read instead.
- **This is engineering practice and not legal advice.** Ask your legal and privacy teams which rules apply to you.

### Re-check before you rely on it

- **Defaults and limits** of Kafka change between releases: the replication factor of the internal topics of Streams, the group protocol, the retention, the quota window, the transaction settings and the log of the controllers. Check the configuration pages of the release that you run.
- **ZooKeeper is gone.** Kafka 4.0 removed it. Anything that mentions it was written for an older release.
- **Debezium option names** change: the unwrap transform has a delete setting whose name changed in a recent release, and an old name had no effect when it was tried.
- **Names of managed services and their defaults.** MSK, Confluent Cloud and Event Hubs change their names, their limits and their prices. The lessons never state a price.
- **Java and Python versions.** The recording used Java 21 and Python 3.13. Check which versions your Kafka release and your client support.

## Files

```
kafka/
  index.html, css/kafka.css  the page and its colours (an indigo accent)
  js/config.js             the course settings: Coach Mara, the paths, the sixteen levels
  js/graphs.js             17 diagram specs
  js/widgets.js            labs for the offset index, keys and partitions, in-sync replicas, groups, a crash and compaction
  js/widgets2.js           labs for Connect, change events, schemas, windows, ACLs and operations
  js/content/              one file per mission, 00 to 15
  js/real.js               the recording: files, tables and counts written by capture_kafka.py
  verify/capture_kafka.py  runs a three broker cluster, Connect, Streams, PostgreSQL with Debezium and the clients, each section on a cluster of its own, and writes js/real.js (--parts keeps the sections, so an interrupted run can be finished)
  verify/verify_kafka.py   checks every snippet, every client setting, the Java, the shell flags and the Avro schemas, works out the results that need no cluster again, runs the lab checks and, with --live or --recapture, runs more
  verify/check_widgets.js  checks the data that the labs read, with arithmetic that shares no code with them
  verify/*.py              the code that the lessons show: cluster, kx (the helpers and the hash), world, keys, producers, replication, consumers, delivery, lossy_proxy, retention, connect, postgres, cdc, schemas, streams, security, ops, tests
  verify/app/              the pipeline with its commit strategies, the Streams application in Java, the totals function with a copy that has a deleted check and their pytest file, and the consumer that is safe to run twice
  verify/requirements.txt  the environment: confluent-kafka, fastavro and pytest, and how to get Kafka, Debezium and PostgreSQL
```

## Run the checks

```bash
python3 -m venv kafka-env && kafka-env/bin/pip install -r kafka/verify/requirements.txt   # Java 17 or 21 must be installed
export KAFKA_HOME=/path/to/kafka_2.13-4.4.0 DEBEZIUM_PLUGINS=/path/to/plugins              # unpacked distribution, and the folder that holds debezium-connector-postgres/
kafka-env/bin/python kafka/verify/verify_kafka.py             # snippets, client settings, Java, flags, Avro, recomputed results and lab data (about 15 seconds on a warm machine)
kafka-env/bin/python kafka/verify/verify_kafka.py --live      # also runs the commands of the bug hunts on a real three broker cluster
kafka-env/bin/python kafka/verify/verify_kafka.py --recapture # records everything again and compares it with js/real.js (about forty minutes)
kafka-env/bin/python kafka/verify/capture_kafka.py            # writes kafka/js/real.js; --only world,log,... records a few sections; --parts DIR keeps and reuses them
node dev/lint-content.js kafka
node dev/e2e.js kafka
node dev/smoke.js kafka --path all
```

The change data capture section also needs the PostgreSQL 16 server binaries (`/usr/lib/postgresql/16/bin`) and the Debezium plugin (`debezium-connector-postgres-3.7.1.Final-plugin.tar.gz` from Maven Central, unpacked). The security section needs `openssl` and `keytool`. Each section of the recorder runs in its own process on its own cluster, because a section may kill a broker or start a client that does not stop.

Independent study material. Not affiliated with or endorsed by the Apache Software Foundation, Debezium, Confluent or any other vendor or project named here.
