# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js bi`, the smoke walks and `bi-env/bin/python bi/verify/verify_bi.py --browser`.

## What was touched outside `bi/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after Airflow (junior about 2.5 hours, senior about 3.5 hours: 151 and 204 minutes), the plan chips Power BI, Tableau and Looker turned ready (Looker was not listed before), one sentence in the plan note saying that the three tools share one course, and the meta description |
| `README.md` | A table row, the planned row without Power BI and Tableau, the layout block, the check-tools line and a paragraph about the environment, a bullet in the honest notes, and the coach sentence ("Bea teaches BI dashboards") |
| `package.json` | `bi` added to the `lint` script, and the scripts `lint:bi`, `smoke:bi`, `e2e:bi` (the generic test and `bi/verify/e2e_labs.js`), `stats:bi` and `verify:bi` |
| `dev/analytics-test.js` | `bi` added to the list of tutorials |
| `dev/requirements.txt` | A comment block with the environment of `bi/verify/requirements.txt` and the versions of the recording |

## Choices worth knowing

- **One course, three products.** The hub does not get three cards. A data engineer meets the three tools through the same four parts (model, connection, refresh, access), and the questions that reach a data engineer are the same. Chart design is left out on purpose.
- **Coach Bea** is set in `bi/js/config.js` and drawn by `bi/js/coach-bea.js`.
- **The check environment is separate** (`bi-env`), because `tableauhyperapi` and `tableaudocumentapi` are pinned there. `tableaudocumentapi` 0.11 imports `distutils`, which Python 3.12 removed, so the requirements file lists `setuptools`.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:bi` runs it first and then `bi/verify/e2e_labs.js`.
