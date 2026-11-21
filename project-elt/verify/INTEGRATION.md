# Integration notes

These changes were applied to the live line in the same push as the walkthrough and the project, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js project-elt`, the smoke walks and `python3 project-elt/verify/verify_elt.py --recapture --browser`.

## What was touched outside `project-elt/` and `projects/brewline-elt/`

| File | Change |
| --- | --- |
| `index.html` | A new section "Projects" before the plan, with a ready card for this walkthrough (walkthrough about 70 minutes, senior about 100: 68 and 99 minutes), and the meta description |
| `README.md` | A table row, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Ari teaches the projects") |
| `package.json` | `project-elt` added to the `lint` script, and the scripts `lint:project-elt`, `smoke:project-elt`, `e2e:project-elt` (the generic test and `project-elt/verify/e2e_labs.js`), `stats:project-elt` and `verify:project-elt` |
| `dev/analytics-test.js` | `project-elt` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `project-elt/verify` needs |

## Choices worth knowing

- **Coach Ari** is set in `project-elt/js/config.js` and drawn by `project-elt/js/coach-ari.js`. The projects of the library share this coach.
- **A project is a repository and a walkthrough.** The repository is `projects/brewline-elt` (a README, a Makefile, three requirements files, the code), and it can be cloned and run without the walkthrough. The walkthrough shows each file as it is on disk and compares it with the recording.
- **The recorder never touches the repository.** It copies the project to a temporary folder, runs the pipeline there with `airflow dags test`, and parses the logs of Airflow, dlt and dbt.
- **The bug hunts run on a copy of the real project.** The bad snippet replaces a file of the copy, the pipeline runs, and the result must be what the lesson says. The fix of each hunt is the file as it ships.
- **Three interpreters.** `ELT_INGEST_PY`, `ELT_DBT`, `ELT_AIRFLOW` and `ELT_TEST_PY` point at them. Without them the checks that need them say so and are skipped.
- **Nothing is timed.** The recording holds counts, states and texts. dbt prints its steps in an order that changes from run to run, so the replays show a summary: the counts, the failing test and the skipped nodes.
- **The stylesheet is a full copy of the one of another course**, with its own colours. A short one leaves the chips, tiles and bars of the lab without a style, which the tests do not see.
