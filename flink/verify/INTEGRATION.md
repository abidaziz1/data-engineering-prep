# Integration notes for the parent session

Everything below is ready to paste. The Flink worker edited only `flink/`. It did not touch the hub page, the root README, `package.json`, `dev/`, `shared/` or any other tutorial.

Numbers come from `node dev/stats.js flink`: 215 minutes on the Junior path, 288 on Senior and 293 on Everything. The frame counts of the three paths are in `flink/README.md`.

## (a) Hub card for `index.html`

Put it after the Kafka card, or wherever the other new cards go. The markup is the same as the other cards.

```html
      <a class="card ready" href="flink/index.html">
        <span class="chip ready">Ready</span>
        <h3>Apache Flink for data engineers: the basics</h3>
        <p>The cluster and the job graph, Flink SQL and the changelog, event time, watermarks and windows, state, checkpoints and recovery, savepoints, Kafka and change data capture, joins and state that grows, the DataStream API, and backpressure and deployment. Nine missions with a boss round and two coding rounds. Every number was read from a real Apache Flink 2.2.1 (one JobManager and two TaskManagers on one machine) with its SQL client, the Kafka connector, the Flink CDC connector, Apache Kafka 4.4.0 and PostgreSQL 16. Kubernetes, YARN, managed services and lake table formats were not run, and each screen says what is recorded and what is from documentation.</p>
        <div class="paths"><span>Junior path about 3.5 hours</span><span>Senior path about 5 hours</span></div>
        <span class="go">Open the tutorial &rarr;</span>
      </a>
```

The plan chips near the bottom of the hub list Flink under Big data engines. Mark it as ready, as Spark and Kafka are:

```html
      <div><h3>Big data engines</h3><ul><li class="ready">Spark</li><li class="ready">Kafka</li><li>Hadoop</li><li class="ready">Flink</li></ul></div>
```

The `<meta name="description">` of the hub page lists the tools. Add Flink to the sentence, for example: "Guided tutorials for data engineers covering Snowflake, dbt, Databricks, AWS, Azure, Google Cloud, Apache Spark, Apache Kafka, Apache Flink, and AI data engineering." (The Python, SQL and Airflow tutorials add their own words to the same sentence.)

## (b) Root README table row

```markdown
| **Apache Flink for data engineers**: the basics | Ready. 9 missions, 3 paths, 8 labs, 2 coding rounds, plans, slots, changelogs, windows, checkpoints, a killed TaskManager, savepoints, join state, key groups and backpressure metrics read from a real Apache Flink 2.2.1 (one JobManager and two TaskManagers) on one machine. No network, Kubernetes, YARN or managed service ran, and the screens say so | [`flink/`](flink/README.md) |
```

In the "Planned, one tutorial each" row, remove `Flink, ` from the list.

## (c) Root README layout block

```text
flink/                   one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 8 of them
  js/real.js               plans, slots, changelogs, windows, checkpoints, savepoints, join state, key groups, backpressure metrics, Kafka and change data capture results, recorded on a real Apache Flink 2.2.1 on one machine
  verify/capture_flink.py  runs a Flink cluster (one JobManager and two TaskManagers), Kafka, PostgreSQL and the Java jobs on generated Brewline data and writes js/real.js (nothing is timed)
  verify/verify_fl.py      checks every snippet, command flag and configuration key, compiles the Java, runs the SQL, the bug hunts and the coding rounds on a real cluster, checks the lab data and, with --recapture, the recording
  verify/e2e_labs.js       drives the eight labs in a browser against values worked out by hand
```

## (d) Root README honest-notes bullet

```markdown
- **The Flink tutorial records a real Apache Flink on one machine, not a cluster of machines.** The plans, slots, changelogs, windows, checkpoints and the files they write, the loss of a TaskManager that was killed with signal 9, savepoints, join state, key groups and backpressure metrics were read from Apache Flink 2.2.1 as a standalone cluster of one JobManager and two TaskManagers on Java 21, with its SQL client and `flink` command, the Kafka connector 5.0.0-2.2, the Flink CDC connector 3.7.0-2.2, Apache Kafka 4.4.0 (one broker), PostgreSQL 16 and Java jobs compiled for the recording, on made-up data. Nothing was timed, the heartbeat and checkpoint timers were shortened, and the documentation of Flink 2.2 recommends Java 17 and calls Java 21 experimental. Kubernetes and the Flink Kubernetes Operator, YARN, high availability, Amazon Managed Service for Apache Flink, Iceberg, Paimon, Delta Lake and Hudi were not run, and neither was Flink 2.3.0, which came out after the recording (the Kafka connector has no build for it yet): those parts are from documentation, and each screen says so. Three labs apply rules to recorded numbers and say so. The Flink documentation website could not be opened while this was built: the lessons use the documentation in the source release of 2.2.1, the release notes and the repositories of the connectors. Details and the Flink job description table are in [`flink/README.md`](flink/README.md).
```

## (e) Check-tools line for the root README

Add this line to the block of verifier commands:

```text
flink-env/bin/python flink/verify/verify_fl.py   # Flink: snippets, command flags and configuration keys checked against the real distribution and its documentation, Java compiled, SQL, bug hunts and coding rounds run on a real cluster, lab data; --browser drives the labs, --recapture records again. Needs Java 17 or 21, FLINK_HOME, FLINK_DOCS, FLINK_KAFKA_JAR, FLINK_CDC_JAR and KAFKA_HOME: see flink/verify/requirements.txt
```

And this sentence after the block that names extra installs:

```markdown
The Flink check needs an unpacked Apache Flink 2.2.1 binary distribution, the docs folder of its source release, the two connector jars (Maven Central), an unpacked Apache Kafka 4.4.0 and the PostgreSQL 16 server programs; name them in `FLINK_HOME`, `FLINK_DOCS`, `FLINK_KAFKA_JAR`, `FLINK_CDC_JAR` and `KAFKA_HOME` as `flink/verify/requirements.txt` says. It needs no `npm install --prefix`. The lab tests (`--browser`) need Playwright and Chromium, which the other checks already use. A check whose tool is missing says so and is skipped.
```

## (f) `package.json` scripts

```json
    "lint:flink": "node dev/lint-content.js flink",
    "smoke:flink": "node dev/smoke.js flink --path all",
    "e2e:flink": "node dev/e2e.js flink && node flink/verify/e2e_labs.js",
    "stats:flink": "node dev/stats.js flink",
    "verify:flink": "python3 flink/verify/verify_fl.py",
```

Also append `&& node dev/lint-content.js flink` to the `lint` script that lints every tutorial.

## (g) `dev/requirements.txt`

The Flink check needs only the Kafka client that the Kafka course already uses, in the interpreter that runs `verify_fl.py`. Add comments only:

```text
# flink/verify (the recorder, verify_fl.py and its --recapture). Needs Java 17 or 21 with javac, Apache Flink 2.2.1, the docs folder of its source release, two connector jars,
# Apache Kafka 4.4.0 and the PostgreSQL 16 server programs (see flink/verify/requirements.txt). The only Python package is confluent-kafka, which the Kafka course lists too.
# Versions the recording was made with: Apache Flink 2.2.1, flink-sql-connector-kafka 5.0.0-2.2, flink-sql-connector-postgres-cdc 3.7.0-2.2, Apache Kafka 4.4.0, PostgreSQL 16.15,
# confluent-kafka 2.16.1 (librdkafka 2.16.0), Java 21.0.12, Python 3.13.
confluent-kafka==2.16.1
```

(`confluent-kafka` is not yet in `dev/requirements.txt`. If the Kafka check's own `kafka/verify/requirements.txt` is the only place that lists it, add the comment and the pin there.)

## (h) Coach sentence for the root README

Add to the sentence about the coaches: "Ines teaches Apache Flink." For example: "An illustrated coach talks you through every step: Sam teaches Snowflake, dbt, Databricks, AWS and Snowflake with dbt, Noor teaches Azure, Ravi teaches Google Cloud, Kai teaches Spark, Mara teaches Kafka, Juno teaches Apache Airflow, and Ines teaches Apache Flink."

Theo: `shared/js/coach.js` registers two coaches for the Flink work, Ines and Theo. The Flink course uses only **Ines**. **Theo** is registered and drawn (he has all five moods) but no course uses him yet: nothing in `flink/` or in any other tutorial refers to him, and the course content never asks for him. He is free for the next tutorial that wants a coach. Nothing needs to change in `shared/js/coach.js`.

## (i) Plan-list chip

Flink under "Big data engines" turns ready: see the line in part (a).

## Other notes

- The tutorial id and storage key are `flink` and `dep.flink.v1`. Nothing else in the repository refers to them.
- `flink/verify/verify_fl.py` takes about 9 minutes without `--recapture` (most of it the SQL client, which starts for every script, and a Kafka broker for the Java job). `--recapture` adds about 22 minutes for the recorder: it starts a Flink cluster, a Kafka broker and PostgreSQL for each section.
- The recorder and the verifier start their own clusters on ports 8081 (Flink), 19092 (Kafka, recorder) and 18181 and 19192 (the checks). Stop a Flink cluster that you run yourself on 8081 first.
- No engine feature was missing. The shared stylesheet clips the coach column on windows 800 px high or less (known); `flink/css/flink.css` carries the same workaround as `sql/css/sql.css`.
- The earlier session left a recording that the new recorder reproduced: see the recapture row of the table in `flink/README.md`.
