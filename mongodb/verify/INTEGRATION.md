# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js mongodb`, the smoke walks and `mongo-env/bin/python mongodb/verify/verify_mongodb.py --recapture --browser`.

## What was touched outside `mongodb/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the Scala card (junior about 2 hours, senior about 2.5 hours: 107 and 140 minutes), the plan chip MongoDB turned ready, and the meta description |
| `README.md` | A table row, the planned row without MongoDB, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Mika teaches MongoDB") |
| `package.json` | `mongodb` added to the `lint` script, and the scripts `lint:mongodb`, `smoke:mongodb`, `e2e:mongodb` (the generic test and `mongodb/verify/e2e_labs.js`), `stats:mongodb` and `verify:mongodb` (which uses `mongo-env`) |
| `dev/analytics-test.js` | `mongodb` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `mongodb/verify` needs |

`shared/js/util.js` was not touched: the code on the screens is Python, and the highlighter already has a Python rule.

## Choices worth knowing

- **Coach Mika** is set in `mongodb/js/config.js` and drawn by `mongodb/js/coach-mika.js`.
- **The server is the real one.** The recorder starts `mongo:8.0` in a Docker container on the host network and turns it into a replica set of one member. It needs the Docker daemon, and nothing else on the machine is read or changed. The MongoDB binaries are not downloaded.
- **Nothing is timed.** The recording holds counts, plans, keys and documents examined, error codes and printed events. The recapture compares the whole recording and allows one difference, the date.
- **The programs on the screens are the programs that ran.** Every code screen that shows a project file is compared with the file on disk, and the solution of the coding round is a piece of `challenge.py`.
- **A recorded text starts with its command.** `G.plain` in `mongodb/js/helpers.js` draws a line that starts with `python`, `docker` or `mongosh` as a command, and the rest as output. Only `python` appears in the recording.
- **The number format of the course** (`G.n` in `mongodb/js/helpers.js`) never forces two decimals, and the long numbers of a lab get a smaller type (`.big.long` in `mongodb/css/mongodb.css`).
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:mongodb` runs it first and then `mongodb/verify/e2e_labs.js`.
- **The check needs its own environment**, only for pymongo: `python3 -m venv mongo-env && mongo-env/bin/pip install pymongo`. It also needs the image `mongo:8.0` in the local Docker. A check whose tool is missing says so and is skipped.
