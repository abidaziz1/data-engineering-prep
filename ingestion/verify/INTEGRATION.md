# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js ingestion`, the smoke walks and `ing-env/bin/python ingestion/verify/verify_ingestion.py --recapture --browser`.

## What was touched outside `ingestion/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the MongoDB card (junior about 2 hours, senior about 3 hours: 105 and 167 minutes), the plan chip "Data ingestion" in the Pipelines group, and the meta description |
| `README.md` | A table row, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Remy teaches data ingestion") |
| `package.json` | `ingestion` added to the `lint` script, and the scripts `lint:ingestion`, `smoke:ingestion`, `e2e:ingestion` (the generic test and `ingestion/verify/e2e_labs.js`), `stats:ingestion` and `verify:ingestion` (which uses `ing-env`) |
| `dev/analytics-test.js` | `ingestion` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `ingestion/verify` needs |

`shared/js/util.js` was not touched: the code on the screens is Python and SQL, and the highlighter already has rules for both.

## Choices worth knowing

- **Coach Remy** is set in `ingestion/js/config.js` and drawn by `ingestion/js/coach-remy.js`.
- **Two interpreters.** dlt runs on Python 3.13 here, and PyAirbyte needs 3.11 or 3.12. `DLT_PY` and `AIRBYTE_PY` point at them, and the recorder and the verifier start each program with the right one. Without `AIRBYTE_PY`, the checks that need Airbyte say so and are skipped.
- **The Airbyte connector comes from PyPI.** `airbyte-source-faker` is installed by PyAirbyte into a temporary folder, with `AIRBYTE_OFFLINE_MODE=1` and a `pip_url`, because the registry of Airbyte was not reachable. `protocol.py` calls the installed connector the way the platform does.
- **Nothing is timed.** The recording holds counts, tables, columns, error texts and messages. The recapture compares the whole recording and allows one difference, the date. The Faker connector sets `updated_at` to the time of the sync by default, so the programs use `always_updated: false` wherever a recorded number depends on it, and mask the time in the STATE message.
- **The programs on the screens are the programs that ran.** Every code screen that shows a project file is compared with the file on disk, and the solution of the coding round is a piece of `challenge.py`.
- **A recorded text starts with its command.** `G.plain` in `ingestion/js/helpers.js` draws a line that starts with `python` as a command, and the rest as output.
- **The number format of the course** (`G.n` in `ingestion/js/helpers.js`) never forces two decimals, and the long numbers of a lab get a smaller type (`.big.long` in `ingestion/css/ingestion.css`).
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:ingestion` runs it first and then `ingestion/verify/e2e_labs.js`.
- **The stylesheet is a full copy of the one of another course**, with its own colours. A short one leaves the chips, tiles and bars of the labs without a style, which the tests do not see.
