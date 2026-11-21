# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js scala`, the smoke walks and `scala-env/bin/python scala/verify/verify_scala.py --recapture --browser`.

## What was touched outside `scala/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the Java card (junior about 2 hours, senior about 3 hours: 123 and 177 minutes), the plan chip Scala turned ready, and the meta description |
| `README.md` | A table row, the planned row without Scala, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Skye teaches Scala") |
| `package.json` | `scala` added to the `lint` script, and the scripts `lint:scala`, `smoke:scala`, `e2e:scala` (the generic test and `scala/verify/e2e_labs.js`), `stats:scala` and `verify:scala` (which uses `scala-env`) |
| `dev/analytics-test.js` | `scala` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `scala/verify` needs |
| `shared/js/util.js` | One highlighter rule, `LANGS.scala`, added to the shared highlighter. No existing rule changed, and no other tutorial shows `scala` code, so the other tutorials draw the same colours as before |

## Choices worth knowing

- **Coach Skye** is set in `scala/js/config.js` and drawn by `scala/js/coach-skye.js`.
- **The Scala compiler comes from the pyspark package.** Spark 4.0.1 is built with Scala 2.13.16, so the recorder uses the compiler and library jars that ship in `pyspark/jars`. The `scalac` script was not installed: the recorder starts `scala.tools.nsc.Main`, the class that the script starts, and the screens write that command as `scalac`. Scala 2.12.20 is downloaded from Maven Central for the experiment with two Scala versions in one program.
- **Spark ran in local mode.** `spark-submit` starts one session with two threads on made-up data (1,000 orders built by a lambda), so no file or cluster is involved. The program prints only its own lines, so the log of Spark is not part of the recording.
- **Nothing is timed.** The recording holds exit codes, counts and error texts. The recapture compares the whole recording and allows one difference, the date.
- **The programs on the screens are the programs that ran.** Every code screen that shows a project file is compared with the file on disk, and the solution of the coding round is a piece of `Challenge.scala`.
- **A recorded text starts with its commands.** `G.plain` in `scala/js/helpers.js` draws a line that starts with `scalac`, `java`, `jar` or `spark-submit` as a command, and the rest as output.
- **The number format of the course** (`G.n` in `scala/js/helpers.js`) never forces two decimals, and the long numbers of a lab get a smaller type (`.big.long` in `scala/css/scala.css`).
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:scala` runs it first and then `scala/verify/e2e_labs.js`.
- **The check needs its own environment**, only for pyspark: `python3 -m venv scala-env && scala-env/bin/pip install pyspark==4.0.1`. It uses the standard library otherwise.
