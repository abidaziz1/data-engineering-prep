# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js postgresql`, the smoke walks and `python3 postgresql/verify/verify_pg.py --recapture --browser`.

## What was touched outside `postgresql/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the Git card (junior about 4 hours, senior about 7 hours: 243 and 414 minutes), the plan chip PostgreSQL turned ready, and the meta description |
| `README.md` | A table row, the planned row without PostgreSQL, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Ellie teaches PostgreSQL") |
| `package.json` | `postgresql` added to the `lint` script, and the scripts `lint:postgresql`, `smoke:postgresql`, `e2e:postgresql` (the generic test and `postgresql/verify/e2e_labs.js`), `stats:postgresql` and `verify:postgresql` |
| `dev/analytics-test.js` | `postgresql` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `postgresql/verify` needs |

## Choices worth knowing

- **Coach Ellie** is set in `postgresql/js/config.js` and drawn by `postgresql/js/coach-ellie.js`.
- **Everything is recorded on throwaway servers.** `pglib.py` makes one temporary folder under `/var/tmp`, starts each server on its own port on 127.0.0.1 as the `postgres` user, and removes the folder at the end. Process ids, ports, paths, times, log positions and transaction ids are replaced before anything is written. The big servers set `default_statistics_target = 10000`, so that `ANALYZE` reads every row of a 200,000 row table and the estimates repeat.
- **Only durations and a few background flushes of the log differ between two recordings.** The recapture compares the whole recording and allows three things: the date, a duration that is within a factor of 3 of the stored one, and a count of 20 or fewer background flushes of the log. Everything else must repeat: counts, sizes in bytes, plans and printed texts. The recorder waits for the promotion of the restored server before it reads its timeline, its log and its history file, which an earlier version did not do.
- **`verify_pg.py` runs the lesson code and checks it against real servers.** The project files are loaded by real servers (the schema, the loader in four runs, the indexes, the roles, the migration, the partitions, the configuration files and the `pg_hba.conf`), every SQL text goes through `pglast`, which is the parser of PostgreSQL, and twelve bug hunts run next to their fixes.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:postgresql` runs it first and then `postgresql/verify/e2e_labs.js`.
- **The server is PostgreSQL 16.15.** PostgreSQL 17 and 18 features (`COPY ... ON_ERROR`, incremental `pg_basebackup`, `pg_combinebackup`) are named in a few answers as from documentation, and none of them ran.
