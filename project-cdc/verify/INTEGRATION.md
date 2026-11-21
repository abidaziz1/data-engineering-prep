# Integration notes

These changes were applied to the live line in the same push as the walkthrough and the project, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js project-cdc`, the smoke walks and `python3 project-cdc/verify/verify_cdc.py --recapture --browser`.

## What was touched outside `project-cdc/` and `projects/brewline-cdc/`

| File | Change |
| --- | --- |
| `index.html` | A ready card for this walkthrough in the section "Projects", and the meta description |
| `README.md` | A table row, the layout block, the check-tools line, the paragraph about what the check needs, a bullet in the honest notes |
| `package.json` | `project-cdc` added to the `lint` script, and the scripts `lint:project-cdc`, `smoke:project-cdc`, `e2e:project-cdc` (the generic test and `project-cdc/verify/e2e_labs.js`), `stats:project-cdc` and `verify:project-cdc` |
| `dev/analytics-test.js` | `project-cdc` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `project-cdc/verify` needs |

## Choices worth knowing

- **Coach Ari** is set in `project-cdc/js/config.js` and drawn by `project-cdc/js/coach-ari.js`. The projects of the library share this coach.
- **A project is a repository and a walkthrough.** The repository is `projects/brewline-cdc` (a README, a Makefile, a requirements file, SQL, the connector, the code and eight tests), and it can be cloned and run without the walkthrough. The walkthrough shows each file as it is on disk and compares it with the recording.
- **The services are real and run without containers.** `stack/local.py` of the project starts PostgreSQL, Apache Kafka in KRaft mode and a Kafka Connect worker with the Debezium plugin. The recorder imports it from its temporary copy, so the code that is recorded is the code that is shown.
- **The recorder never touches the repository.** It copies the project to a temporary folder, runs pytest and five stages of the pipeline there, and parses what they printed. Spark's own logs go to the error stream and are not part of the recording.
- **The bug hunts need no service.** The merge of silver is the real one, and the change events are written in the hunt. Only a recapture starts the services. The coding round runs on a log that is rebuilt from the rules of the shop, and its answer must equal the recorded one.
- **Sample messages are recorded with their changing numbers replaced by their names** (`<lsn>`, `<ts_ms>`, and so on), so that a second recording repeats everything except the date.
- **Nothing is timed.** One machine says nothing about the lag or the throughput of a cluster. The recording holds counts, states and texts, and yes or no for what the slot did. The bytes that the slot held are not recorded, because they depend on the machine.
- **The stylesheet is a full copy of the one of another course**, with its own colours. A short one leaves the chips, tiles and bars of the lab without a style, which the tests do not see.
