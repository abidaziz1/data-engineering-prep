# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js java`, the smoke walks and `python3 java/verify/verify_java.py --recapture --browser`.

## What was touched outside `java/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the Microsoft Fabric card (junior about 3 hours, senior about 4 hours: 170 and 238 minutes), the plan chip Java turned ready, and the meta description |
| `README.md` | A table row, the planned row without Java, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Hugo teaches Java") |
| `package.json` | `java` added to the `lint` script, and the scripts `lint:java`, `smoke:java`, `e2e:java` (the generic test and `java/verify/e2e_labs.js`), `stats:java` and `verify:java` |
| `dev/analytics-test.js` | `java` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `java/verify` needs |
| `shared/js/util.js` | Two highlighter rules, `LANGS.java` and `LANGS.xml`, added to the shared highlighter. No existing rule changed. The Flink, Kafka and BI tutorials also show Java or XML code, which the highlighter drew without colours before (an unknown language has no rules) and now draws with them. Their interaction tests pass after the change (Flink 805 checks, Kafka 2,067, BI 582) |

## Choices worth knowing

- **Coach Hugo** is set in `java/js/config.js` and drawn by `java/js/coach-hugo.js`.
- **The recorded part is the real toolchain.** `capture_java.py` copies `verify/project` to a temporary folder, runs `javac`, `java`, `javap`, `jar` and Maven there, and removes the folder at the end. Maven uses its normal local repository in `~/.m2`, and downloads what it is missing from Maven Central. No setting of the machine is read or changed.
- **The programs on the screens are the programs that ran.** Every code screen that shows a project file is compared with the file on disk, and the solution of the coding round is a piece of `Challenge.java`.
- **Nothing is timed.** The recording holds exit codes, rows, bytes and error texts. The recapture compares the whole recording and allows three differences: the date, the number of CPUs, and which of three runs of a race lost an update (at least one must).
- **A recorded text starts with its command.** `G.plain` in `java/js/helpers.js` draws a line that starts with `java`, `javac`, `javap`, `jar` or `mvn` as a command, and the rest as output.
- **The number format of the course** (`G.n` in `java/js/helpers.js`) never forces two decimals, so a file of 48.9 MB reads "48.9 MB". The long numbers of the money lab get a smaller type (`.big.long` in `java/css/java.css`) so that they stay on one line.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:java` runs it first and then `java/verify/e2e_labs.js`.
- **The check needs no extra environment.** It uses the standard library of Python, the JDK that is on the path, and Maven for `--recapture`.
