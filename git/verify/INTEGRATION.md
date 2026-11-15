# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js git`, the smoke walks and `python3 git/verify/verify_git.py --recapture --browser`.

## What was touched outside `git/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the Kubernetes card (junior about 3 hours, senior about 4.5 hours: 189 and 276 minutes), the plan chip Git turned ready, and the meta description |
| `README.md` | A table row, the planned row without Git, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Finn teaches Git") |
| `package.json` | `git` added to the `lint` script, and the scripts `lint:git`, `smoke:git`, `e2e:git` (the generic test and `git/verify/e2e_labs.js`), `stats:git` and `verify:git` |
| `dev/analytics-test.js` | `git` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `git/verify` needs |

## Choices worth knowing

- **Coach Finn** is set in `git/js/config.js` and drawn by `git/js/coach-finn.js`.
- **Everything is recorded in throwaway repositories.** `gitlib.py` makes one temporary folder, sets the author, the committer and every date, points `GIT_CONFIG_GLOBAL` at a private file and turns the system config off, and removes the folder at the end. No setting of the machine is read or changed, and a hook or an alias of the machine cannot change an output.
- **The remote is a bare repository in a folder.** There is no network and no login. Platform rules (protected branches, required reviews) are from documentation, and the screens say so.
- **The ids repeat.** The recapture compares the whole recording and allows one difference, the date. A different Git version will change some outputs (hints, wording), and the comparison will report them, which is what it is for.
- **`verify_git.py` runs the lesson code and not only reads it.** The ignore file, the check script, the hook and four bug hunts (reset and force push, force after a colleague pushed, force after a rebase, `git add -A` with a key file) are run in clones of a bare repository, each next to its fix.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:git` runs it first and then `git/verify/e2e_labs.js`.
- **`conflict/resolved.sql` and `notebooks/explore_cell.json` are made by the recorder**, not kept in `git/verify/project/`. The code screens that show them are compared with the recording.
