# Integration notes

These changes were applied to the live line in the same push as the walkthrough and the project, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js project-lakehouse`, the smoke walks and `python3 project-lakehouse/verify/verify_lakehouse.py --recapture --browser`.

## What was touched outside `project-lakehouse/` and `projects/brewline-lakehouse/`

| File | Change |
| --- | --- |
| `index.html` | A ready card for this walkthrough in the section "Projects", a plan chip, and the meta description |
| `README.md` | A table row, the layout block, the check-tools line, a bullet in the honest notes |
| `package.json` | `project-lakehouse` added to the `lint` script, and the scripts `lint:project-lakehouse`, `smoke:project-lakehouse`, `e2e:project-lakehouse` (the generic test and `project-lakehouse/verify/e2e_labs.js`), `stats:project-lakehouse` and `verify:project-lakehouse` |
| `dev/analytics-test.js` | `project-lakehouse` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `project-lakehouse/verify` needs |

## Choices worth knowing

- **Coach Ari** is set in `project-lakehouse/js/config.js` and drawn by `project-lakehouse/js/coach-ari.js`. The projects of the library share this coach.
- **A project is a repository and a walkthrough.** The repository is `projects/brewline-lakehouse` (a README, a Makefile, a requirements file, the code and seven tests), and it can be cloned and run without the walkthrough. The walkthrough shows each file as it is on disk and compares it with the recording.
- **The recorder never touches the repository.** It copies the project to a temporary folder, runs pytest and the three days of the pipeline there, and parses what they printed. Spark's own logs go to the error stream and are not part of the recording.
- **The bug hunts run on a copy of the real project.** The bad snippet replaces its lines in a file of the copy, a small scenario runs on Spark and Delta Lake, and the result must be what the lesson says. The fix of each hunt is the code as it ships. The coding round is run on real events, and two wrong solutions must be refused.
- **One interpreter.** `LAKE_PY` points at it. Without it the checks that need it say so and are skipped.
- **Nothing is timed.** One machine says nothing about a cluster. The recording holds counts, states and texts.
- **The order date is set once.** An earlier version of the project partitioned silver by the date of the latest event, so a shipment moved revenue from one day to the next. It was changed before the walkthrough was written, and the walkthrough says so in its last mission.
- **The stylesheet is a full copy of the one of another course**, with its own colours. A short one leaves the chips, tiles and bars of the lab without a style, which the tests do not see.
