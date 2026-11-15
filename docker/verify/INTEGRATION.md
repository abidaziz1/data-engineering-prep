# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js docker`, the smoke walks and `python3 docker/verify/verify_dk.py --recapture --browser`.

## What was touched outside `docker/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the BI card (junior about 3 hours, senior about 5 hours: 191 and 296 minutes), the plan chip Docker turned ready, and the meta description |
| `README.md` | A table row, the planned row without Docker, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Otto teaches Docker") |
| `package.json` | `docker` added to the `lint` script, and the scripts `lint:docker`, `smoke:docker`, `e2e:docker` (the generic test and `docker/verify/e2e_labs.js`), `stats:docker` and `verify:docker` |
| `dev/analytics-test.js` | `docker` added to the list of tutorials |
| `dev/requirements.txt` | A comment block with what `docker/verify` needs and the versions of the recording |

## Choices worth knowing

- **Coach Otto** is set in `docker/js/config.js` and drawn by `docker/js/coach-otto.js`.
- **The check needs a running Docker Engine**, and no Python package. In the sandbox that built the course, builds reached PyPI only on the host network and through the proxy: `DK_BUILD_NETWORK=host DK_BUILD_PROXY=1`. Compose could not build that way, so the recorder builds the image first in that case. Elsewhere both variables stay unset.
- **The recorder removes what it starts.** Every container, network and volume carries the label `dk-course` or a name that starts with `dkc-`, and the recorder empties the build cache before each cache experiment. A cache that is not emptied remembers layers from an earlier run and hides the effect that the lesson shows.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:docker` runs it first and then `docker/verify/e2e_labs.js`.
- **The pull limits of Docker Hub are not quoted** anywhere in the course. The pages that I found disagree, and the README says so.
