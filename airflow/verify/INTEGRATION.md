# Integration notes for the parent session

Everything below is ready to paste. The Airflow worker edited only `airflow/`. It did not touch the hub page, the root README, `package.json`, `dev/` or `shared/`.

Numbers come from `node dev/stats.js airflow`: 279 minutes on the Junior path, 495 on Senior and 535 on Everything. The frame counts of the three paths are in `airflow/README.md`.

## (a) Hub card for `index.html`

Put it after the AWS card, or wherever the other new cards go. The markup is the same as the other cards.

```html
      <a class="card ready" href="airflow/index.html">
        <span class="chip ready">Ready</span>
        <h3>Apache Airflow for data engineers</h3>
        <p>What Airflow is and is not for, DAGs and tasks, schedules, logical dates and data intervals, idempotent and incremental loads, XCom, mapping and assets, retries and trigger rules, sensors and the triggerer, pools and executors, connections and secrets, tests and CI, operating Airflow and upgrading to 3, deploying, and patterns. Fourteen missions with a boss round. The output was recorded from Apache Airflow 3.4.0 running on one machine with the scheduler, DAG processor, API server, triggerer, LocalExecutor and SQLite. Other executors, managed services and production databases are from documentation, and every screen says which.</p>
        <div class="paths"><span>Junior path about 4.5 hours</span><span>Senior path about 8 hours</span></div>
        <span class="go">Open the tutorial &rarr;</span>
      </a>
```

The plan chips near the bottom of the hub list Airflow under Pipelines. Mark it as ready, as dbt is:

```html
      <div><h3>Pipelines</h3><ul><li class="ready">dbt</li><li class="ready">Airflow</li></ul></div>
```

## (b) Root README table row

```markdown
| **Apache Airflow for data engineers**: from a first DAG to a pipeline you can operate | Ready. 14 missions, 3 paths, runs, states, schedules, logs and test results recorded from Apache Airflow 3.4.0 on one machine | [`airflow/`](airflow/README.md) |
```

In the "Planned, one tutorial each" row, remove `Airflow, ` from the list.

## (c) Root README layout block

```text
airflow/                 one tutorial, same layout, plus
  js/real.js               DAG runs, task states, schedules, logs, metadata tables, command output and test runs recorded from Apache Airflow 3.4.0
  verify/capture_af.py     runs Airflow 3.4.0 (scheduler, DAG processor, API server, triggerer, LocalExecutor, SQLite), DAGs, pytest and ruff, and writes js/real.js
  verify/verify_af.py      checks every snippet against the installed Airflow, runs DAGs and tests again, checks the lab logic and the labs in a browser and, with --recapture, the recording
```

## (d) Root README honest-notes bullet

```markdown
- **The Airflow tutorial records Apache Airflow 3.4.0 on one machine, not a production deployment.** The DAG runs, task states, schedules, logs, metadata tables, command output and pytest and ruff runs were recorded from Apache Airflow 3.4.0 (Task SDK 1.4.0) with the API server, scheduler, DAG processor and triggerer running, the LocalExecutor and a SQLite metadata database, on Python 3.12, and `airflow/verify/capture_af.py` records it again. The dates in the recording are shifted to 14 March 2026 so that the retry jitter is reproducible. Celery and Kubernetes executors, PostgreSQL and MySQL, secrets backends, Git bundles, managed services (Amazon MWAA, Google Cloud Composer, Astronomer) and the move from Airflow 2 are described from documentation, and the screens carry that tag. Three labs are models that were checked against the recording: the retry delay, the capacity of pools and limits, and the parse pass. The Airflow documentation website could not be opened while this was built: the lessons use the documentation source files from the Apache Airflow repository, search summaries of the pages of managed services, and the release notes.
```

## (e) Check-tools line for the root README

Add this line to the block of verifier commands:

```text
python3 airflow/verify/verify_af.py       # Airflow: snippets checked against the installed Airflow 3.4.0, DAGs and pytest projects run again, ruff AIR rules, every command and option checked against its help, labs driven in a browser; --recapture records again
```

And this sentence after the block that names extra installs:

```markdown
The Airflow check needs Apache Airflow 3.4.0 in its own environment, because the official constraints file pins several hundred packages: create it as the comment in `dev/requirements.txt` says and name its interpreter in `AF_PYTHON`. It needs no `npm install --prefix`. The lab tests need Playwright and Chromium, which the other checks already use; `--no-browser` skips them.
```

## (f) `package.json` scripts

```json
    "lint:airflow": "node dev/lint-content.js airflow",
    "smoke:airflow": "node dev/smoke.js airflow --path all",
    "e2e:airflow": "node dev/e2e.js airflow && node airflow/verify/e2e_labs.js",
    "stats:airflow": "node dev/stats.js airflow",
    "verify:airflow": "python3 airflow/verify/verify_af.py",
```

Also append `&& node dev/lint-content.js airflow` to the `lint` script that lints every tutorial.

## (g) `dev/requirements.txt`

Airflow cannot share the environment of the other checks (its constraints file pins 724 packages). Add comments only:

```text
# airflow/verify (the recorder, verify_af.py and its --recapture). Apache Airflow 3.4.0 needs its own Python 3.12 environment, installed with the official constraints file.
# Name its interpreter in AF_PYTHON when you run the check. No npm install is needed.
#   python3.12 -m venv .venv-airflow
#   .venv-airflow/bin/pip install "apache-airflow==3.4.0" pytest==9.2.0 ruff==0.17.4 --constraint https://raw.githubusercontent.com/apache/airflow/constraints-3.4.0/constraints-3.12.txt
#   AF_PYTHON=$PWD/.venv-airflow/bin/python python3 airflow/verify/verify_af.py
# Versions the recording was made with: apache-airflow 3.4.0, apache-airflow-task-sdk 1.4.0, providers standard 1.21.0, sqlite 4.3.4, http 6.3.0, smtp 3.2.0,
# common-sql 2.4.0, common-io 1.11.0, common-compat 1.23.0 (these seven come with apache-airflow), pytest 9.2.0, ruff 0.17.4, pendulum 3.3.0, croniter 6.2.4.
```

## (h) Coach sentence for the root README

Add to the sentence about the coaches: "Juno teaches Apache Airflow." For example: "An illustrated coach talks you through every step: Sam teaches Snowflake, dbt, Databricks, AWS and Snowflake with dbt, Noor teaches Azure, and Juno teaches Apache Airflow."

## Other notes

- The tutorial id and storage key are `airflow` and `dep.airflow.v1`. Nothing else in the repository refers to them.
- `airflow/verify/verify_af.py --recapture` takes about 30 minutes, because the recorder starts the real scheduler, DAG processor, API server and triggerer and waits for runs, sensors and retries. The plain run takes about 8 minutes, most of it the lab tests in the browser and the DAG runs.
- `airflow/verify/.cache/` is created by `--recapture` and holds the new recording. A `.gitignore` inside `airflow/verify/` keeps it out of git. You can also add `airflow/verify/.cache/` to the root `.gitignore` next to the other tutorials.
