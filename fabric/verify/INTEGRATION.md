# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js fabric`, the smoke walks and `fabric-env/bin/python fabric/verify/verify_fabric.py --recapture --browser`.

## What was touched outside `fabric/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the PostgreSQL card (junior about 3.5 hours, senior about 5 hours: 205 and 291 minutes), the plan chip Microsoft Fabric turned ready, and the meta description |
| `README.md` | A table row, the planned row without Microsoft Fabric, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Faye teaches Microsoft Fabric") |
| `package.json` | `fabric` added to the `lint` script, and the scripts `lint:fabric`, `smoke:fabric`, `e2e:fabric` (the generic test and `fabric/verify/e2e_labs.js`), `stats:fabric` and `verify:fabric` (which uses `fabric-env`) |
| `dev/analytics-test.js` | `fabric` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `fabric/verify` needs |

## Choices worth knowing

- **Coach Faye** is set in `fabric/js/config.js` and drawn by `fabric/js/coach-faye.js`.
- **The recorded part is the open-source engine under Fabric.** `fablib.py` starts a local Spark session with the Delta extension in a temporary folder that has a `Files` and a `Tables` folder, runs from inside it so that `Files/landing/...` is a relative path as in a notebook with a default lakehouse, and removes the folder at the end. It sets `spark.sql.sources.default` to `delta`, because Fabric creates Delta tables by default. No setting of the machine is read or changed.
- **Nothing is timed.** The recording holds files, rows, versions, bytes and error texts, so the recapture compares the whole recording and allows one difference, the date.
- **The notebook files are the code that ran.** `capture_fabric.py` and `verify_fabric.py` execute the files of `verify/project` as they are. The variants of the merge (no condition, changed lines only) are made from the same file by replacing one line, and the recorder asserts that the line was there.
- **The data rules live in `fablib.py`.** The recorder and the verifier share them, and `check_widgets.js` works the same numbers out again in JavaScript.
- **The documentation could not be opened.** The sandbox blocked `learn.microsoft.com`. The README lists every claim about Fabric with its source and the ones that come from memory.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:fabric` runs it first and then `fabric/verify/e2e_labs.js`.
- **The check needs its own environment.** PySpark 4.0.1 does not work with pandas 3, so `fabric/verify/requirements.txt` pins pandas below 3, as the Spark and Databricks courses do.
