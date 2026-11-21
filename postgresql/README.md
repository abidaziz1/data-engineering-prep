# PostgreSQL for data engineers

A guided, press-Next course on the part of PostgreSQL that a data engineer meets: why a table grows when you update it, what the write-ahead log does when the power goes, how to load millions of rows and run the same load twice without doubling anything, which index fits which question, how to remove a month of data without a long delete, how replication and change data capture read the log, how to restore to a minute before a mistake, and how roles, settings and a pooler keep a server healthy. Coach Ellie follows **Brewline**, the coffee retailer, and a small project of a schema, a loader, an upsert, indexes, roles, a migration, monthly partitions and a backup script. You open three clients and count the processes, update a table three times and watch the file grow to four times its size, pull the plug on a server and watch it replay the log, load 20,000 rows four ways, read plans until you can say which index fits, drop a partition and compare the log with a delete, leave a replication slot unread until the disk is at risk, and restore to a named restore point. Every terminal in the course is real output from PostgreSQL 16.15.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Amazon RDS and Aurora, Google Cloud SQL, Azure Database for PostgreSQL, PgBouncer and Debezium did not run for this course.** Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `postgresql/verify/capture_pg.py` on one Linux machine: **PostgreSQL 16.15** (the Ubuntu 24.04 package), x86_64, on throwaway servers on 127.0.0.1. The project is a schema, a loader, an upsert, indexes, roles, a migration, partitions, a backup script and two configuration files, all made up. Only durations and a few background flushes of the log differ from one recording to the next |
| **From documentation** | What PostgreSQL does elsewhere or what I did not run: managed services and their limits, a pooler and its pool modes, wraparound (nothing was run near the limit), losing power for real, `MERGE` when two sessions race, a standby that conflicts with a query, PostgreSQL 17 and 18 features, and the defaults of versions other than 16. Nothing here is a benchmark |

The stand-ins and limits, said again where they matter:

- **One version.** PostgreSQL 16.15. The text of an error, the columns of a system view and some defaults change between releases. The lessons name the changes that I know about (`MERGE` in 15, the `public` schema permission in 15, `COPY ... ON_ERROR` and incremental `pg_basebackup` in 17) and say that they are from documentation, because none of them ran.
- **The data is made up, and the servers are small.** The big table has a million events (112 MB), the order table 200,000 rows, a partitioned table 600,000 rows. The lessons teach the ratios (a BRIN index is 915 times smaller than a btree on the same ordered column, a drop of a partition writes about 466 times less log than the delete of the same rows) and not the megabytes of your server.
- **The statistics were made repeatable.** The big servers set `default_statistics_target = 10000`, so that `ANALYZE` reads every row of the 200,000 row table and a plan estimate is the same on every run. The default is 100, and a server that keeps it estimates from a sample. The first server of the course keeps the default and records it.
- **The times are those of one machine and its disk.** The recorder logs the number of statements, commits, log flushes and bytes of log, which do not depend on the machine, and the seconds, which do. The lessons teach the counts and say what the seconds are. In the verifier the comparison allows a duration to differ by a factor of 3, and a handful of background flushes.
- **A crash is a killed process, and not a power cut.** The recorder sends `SIGKILL` to the postmaster and its children and starts the server again. A real power cut can also lose what the disk had not written, and the lesson on `fsync` is from documentation.
- **The replica is a second server of the same machine.** Streaming replication and logical replication ran between two servers on 127.0.0.1. There was no network delay, no failover tool and no cloud storage.
- **Change data capture was shown with the slot and the decoder of PostgreSQL**, not with Debezium or Kafka. A tool such as Debezium reads the same slot, and its settings and its failure modes are from documentation.
- **The pooler was not run.** Mission 1 records what a connection costs (a process each) and the refusal when the slots run out. Mission 9 explains what a pooler in transaction mode changes, from documentation.
- **Wraparound was not run.** The numbers (a 32-bit transaction id, `autovacuum_freeze_max_age` of 200 million) are from the settings that the server printed and from documentation. Nothing came near the limit.
- **A terminal replay is built from recorded values.** Every output line came from the recording. The paths of the temporary folder are replaced by `~`, and process ids, ports, times and log positions are replaced by placeholders.
- **Names and keys are made up.** Brewline, its stores, its customers and the roles are made up.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 379 | about 4 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 593 | about 7 hours | Everything in Junior, plus replication, recovery, partitioning and the operational decisions that seniors own |
| **Everything** | 628 | about 7.3 hours | Adds the finer points: page layout, wraparound, slots, checksums, rewrites and the lock queue |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The server and its files | 15 min | 25 min | 25 min |
| 2 | Row versions, vacuum and bloat | 16 min | 28 min | 33 min |
| 3 | The write-ahead log and crash recovery | 17 min | 29 min | 32 min |
| 4 | Loading data | 23 min | 35 min | 35 min |
| 5 | Indexes, statistics and plans | 16 min | 35 min | 35 min |
| 6 | Partitions and retention | 19 min | 29 min | 29 min |
| 7 | Replication and change data capture | 18 min | 36 min | 36 min |
| 8 | Backups, recovery and checksums | 20 min | 27 min | 32 min |
| 9 | Roles, settings and a healthy server | 26 min | 41 min | 43 min |
| 10 | Boss round | 68 min | 123 min | 132 min |
| | **Total** | **243 min** | **414 min** | **438 min** |

A short mission 0 sets up the course: what a junior and a senior are asked, how the screens work and what ran. Mission 10 has two drills that mix missions (slow dashboards with a disk at 85 %, and cancelled reports followed by a full disk on the primary), a decision (how to split the jobs of one server), a coding round (write the idempotent upsert), a mock interview of 56 questions, a scorecard and a one-page cheat sheet.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through search: one general query for data engineer roles that name PostgreSQL. I read the search summaries and not every posting, many results were job boards and recruiters that repeat each other, and several were truncated or behind a login, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Strong SQL and hands-on PostgreSQL, with database design, query optimization and performance tuning | 4, 5, 6 | **Recorded**: plans before and after an index, the estimate against the actual rows, a BRIN, a GIN, a partial, an index-only and an expression index, and what every extra index costs on a write. The SQL course covers the language itself |
| PostgreSQL as a source for data pipelines on AWS ("has worked with Postgres SQL as source of data and built data pipelines using AWS services") | 4, 7 | **Recorded**: a loader that is safe to run twice, `COPY`, and a logical replication slot read by a subscriber. AWS services and RDS are **from documentation**, and the AWS course covers the rest |
| Python for data processing and scripting, next to PostgreSQL | 4 | **Recorded**: a loader in Python with psycopg that uploads a file, loads it with `COPY` into a staging table and upserts it, run four times |
| Airflow or Dagster, Snowflake and dbt in the same posting | none | Not covered here. They have their own courses |
| Two to four years of PostgreSQL on RDS | 1, 9 | **From documentation**: what a managed service hides, which settings you can change and what you cannot see. The recording is of a plain server |
| Administration: backups and recovery, role-based access control, encryption (the heavier postings, which read like database administrator roles) | 8, 9 | **Recorded**: `pg_dump`, `pg_basebackup`, `pg_verifybackup`, point-in-time recovery, checksums, roles, grants, default privileges, row-level security, `pg_hba.conf`. Encryption at rest and in transit are **from documentation** |
| Replication and change data capture (the data engineering guides link a logical slot to Debezium, Kafka and a warehouse) | 7 | **Recorded**: physical and logical replication, a slot that holds back the log, what a column added on one side does to the other. Debezium and Kafka are **from documentation**, and the Kafka course covers Kafka |

I also read search summaries of question banks for PostgreSQL. They agree on the same topics: MVCC and vacuum, partitioning, and logical against physical replication. The data engineering guide that I found says the answer that stands out connects four things: MVCC, replication slots, autovacuum and the reliability of the pipeline downstream, because a slot that nobody reads holds back the log and a long transaction holds back vacuum. Missions 2 and 7 follow that line. I did not open the question banks themselves, and I did not check their claims against the official documentation.

The 56 interview questions are written from those topics and from what PostgreSQL commonly asks of someone who feeds a warehouse from it: what MVCC is, why a table is bigger after an update, what autovacuum does and when it starts, `VACUUM` against `VACUUM FULL`, what the write-ahead log is for, `COPY` against `INSERT`, an idempotent upsert, which index for which question, partitioning against deleting, a slot that fills the disk, logical against physical replication, a restore to a point in time, and what you check on a healthy server.

## What you work through

- **Follow Brewline.** One project, one server and a second one beside it. A table that was four times its size after three updates, a load of 20,000 rows that took 5 seconds one way and 0.04 seconds another, an upsert that rewrote every row, an estimate of 83 rows for 333, a month removed by detach and drop, a column added on only one side of a replication, a restore that lost a day, a grant that did not cover tomorrow, and a migration that queued every reader behind it.
- **8 animated diagrams.** A server and its processes, row versions, the write-ahead log, loading, a partitioned table, replication, a backup, and a queue behind a lock.
- **6 labs.** A table that is updated again and again. Four ways to load 20,000 rows. Six runs of an upsert. Which index for which question. A slot that nobody reads. The queue behind a migration.
- **44 terminal replays, 9 code walkthroughs and 31 comparison tables.** The statements with their real output, the schema, the loader, the upsert, the indexes, the roles, the migration, the partitions, the configuration files and the backup script.
- **37 quizzes, 14 bug hunts, 9 ordering games, 10 decisions with a recommended answer and 11 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **56 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 11 chapters, 316 screens: 195 for everyone, 106 for Senior, 15 extra |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 379 frames on the Junior path, 593 on the Senior path and 628 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. The script reports small text: the numbers of the shared interface, the tier chips and the diagram labels are 10.5 to 14.5 px |
| Interaction test (`node dev/e2e.js postgresql`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 1,083 checks passed, 0 failed |
| The 6 labs driven in the browser (`postgresql/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the megabytes of a file, the commits and flushes of a load, the rows an upsert wrote, the plan of each index case, the sessions in the lock queue, the state of a slot from its distance to the limit). The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 237 checks passed |
| Recorded output (`postgresql/verify/capture_pg.py`) | 10 files, 56 texts, 26 tables and 62 sets of counts, 159 items with the 5 of the recording itself. The recorder takes about 2 minutes and removes everything it made |
| The code of the lessons, run (`postgresql/verify/verify_pg.py`) | The 10 project files of the recording are the files on disk, and the 10 code screens that show one show it exactly. The schema, the loader (four runs write 3,000, 0, 1 and 0 rows), the indexes, the roles with a row-level policy, the migration and the partitions run on a real server. The `postgresql.conf` and the `pg_hba.conf` of the project are loaded by a server, which reads all four `pg_hba.conf` lines without an error and returns every setting of the file as the lesson says. The shell and Python snippets are parsed |
| SQL (`verify_pg.py`, with `pglast`) | 28 SQL code screens and 89 statements of the terminal replays go through `pglast`, which is the parser of PostgreSQL itself, and all parse. A statement with a placeholder, an ellipsis or a shell escape is left out |
| Twelve bug hunts run against real servers (`verify_pg.py`) | Each one is run next to its fix. A plain upsert writes 2,000 rows on the second run and the guarded one writes none. `->>` scans the table although a GIN index exists, and `@>` uses it. A BRIN index on a column in random order is ignored, and a btree is used. A function on the partition key reads six partitions and a range reads one. A delete writes more than 50 times the log of a detach and drop. `VACUUM FULL` makes a new file and `VACUUM` does not. A change of type makes a new file and a new column does not. A table made after a grant is refused to the analyst, and allowed after `ALTER DEFAULT PRIVILEGES`. Without a lock timeout the reader waits behind the migration while a first reader is open, and with one the migration is refused. A column added on the publisher only stalls the subscriber at 100 of 101 rows, and adding it on the subscriber brings it to 101. An update of a published table without a key is refused, and works with one. A restore over production loses the day, and a restore beside it keeps it |
| Commands (`verify_pg.py`) | 22 commands of the PostgreSQL tools (`pg_restore`, `pg_dump`, `pg_basebackup`, `pg_verifybackup`, `pg_checksums`, `pg_ctl`, `psql`) in the replays and in the backup script are checked against the `--help` of the installed tools: every long option exists, and the first two letters of a short option cluster (`-Fc`) name an option |
| Recapture (`verify_pg.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 159 items, 0 differ in the last run. The comparison allows three things: the date, a duration within a factor of 3 of the stored one, and a count of 20 or fewer background flushes of the log. Counts, sizes in bytes, plans and printed texts must repeat. An earlier recording did not: the first recapture found 32 items that differed, which led to a recorder that waits for the promotion of the restored server and masks a process id in a log line, to a recording made again, and to three numbers in the lessons that now come from the recording (the estimate of 83 rows, the 12 kB of a drop and the 466 times) |
| Lab data (`postgresql/verify/check_widgets.js`) | 173 checks written in code that shares nothing with the widgets: the bytes of a file against its megabytes, the dead rows against the updates, the commits and flushes of a load, the rows an upsert wrote against the rule, the bytes of an index against its ratio, the estimate against the actual rows, the log of a delete against the log of a drop, and where a slot stands against the limit |
| Controls | 28 deliberately broken inputs, and each one is refused: SQL with a misspelt keyword, an upsert without a target, a shell script with an unclosed `if`, Python with a syntax error, a `pg_hba.conf` line with a method that does not exist (the server reports an error for it), three tool commands with an option that does not exist, three recordings with one number, one word and one table cell changed, a COPY that took 100 times longer, ten changes to the recording that the widget checker must refuse (a table that is not four times its start after three updates, a vacuum that shrank the file, a HOT share that is not the share of HOT updates, an autovacuum that ran below its threshold, a first update that wrote as little log as the second, a rerun of an upsert that did not double the table, a policy that returned the wrong count, a function that read five partitions, a slot reserved after the limit, a migration blocked by the wrong session), and, with `--browser`, six changes to the widget code that the lab test must fail |

### What was not checked

- **Managed services were not run.** Amazon RDS and Aurora, Google Cloud SQL and Azure Database for PostgreSQL come from documentation, as do their limits, their parameter groups and what they do not let you change.
- **One version.** PostgreSQL 16.15. Other versions differ in defaults and in the text of messages.
- **One machine, small data.** The times show the order of magnitude of a method on this machine. They are not a benchmark, and the plans of a server with more rows, other hardware or the default statistics target will differ.
- **A pooler, wraparound, a power cut, `MERGE` races and Debezium were not run.**
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not security advice.** Roles, `pg_hba.conf` and row-level security in the lessons are a starting point for a small team. Ask your security team which rules apply to you.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| PostgreSQL 17 adds `COPY ... ON_ERROR ignore`, which lets a load continue after a bad row | The release notes of PostgreSQL 17, read through a search summary. The server of the recording is 16, so it did not run. One search summary also mentioned a fix in a 17.x minor release for the reporting of this option, which I did **not** check | [PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html) |
| PostgreSQL 17 adds incremental backups to `pg_basebackup`, restored with `pg_combinebackup`, and they need `summarize_wal` | The release notes and two vendor articles, read through a search summary. Did not run | [PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html) |
| The order and the flags of `pg_basebackup`, `pg_verifybackup` and point-in-time recovery (`restore_command`, `recovery_target_name`, `recovery.signal`) | The recording ran them on 16.15 and the verifier checks the flags against `--help`. The pages of the manual were **not read in this session** | [Continuous archiving and PITR](https://www.postgresql.org/docs/16/continuous-archiving.html) |
| `max_slot_wal_keep_size` limits the log that a slot may keep, and a slot that exceeds it becomes `lost` | The recording on 16.15. The page of the setting was **not read in this session** | [Replication configuration](https://www.postgresql.org/docs/16/runtime-config-replication.html) |
| `MERGE` (15) behaves differently from `INSERT ... ON CONFLICT` when two sessions race for the same new key | Documentation, from memory. Not run, not looked up in this session | [MERGE](https://www.postgresql.org/docs/16/sql-merge.html) |
| A pooler in transaction mode breaks session features (temporary tables, session settings, advisory locks, some prepared statements) | Documentation of PgBouncer, from memory. Not run, not looked up in this session | [PgBouncer features](https://www.pgbouncer.org/features.html) |
| Wraparound: a 32-bit transaction id, about two billion ids in the past, `autovacuum_freeze_max_age` of 200 million, and the server refuses writes near the limit | The default came from the settings table of the recording, the rest from documentation, from memory | [Routine vacuuming](https://www.postgresql.org/docs/16/routine-vacuuming.html) |
| What a managed service allows: which extensions, which settings, the access to the log | From memory of the documentation of the three clouds. **Not looked up in this session.** Names and limits differ and change | none |
| The job postings and the interview topics: direction only, from search summaries | Pages of job boards, recruiters and question banks. A small sample, some of it truncated or behind a login | [example posting: Dice](https://www.dice.com/job-detail/0424e65a-3731-4f7f-ae23-58511c5d5935), [example: Symplr, senior data engineer](https://indiacareers-symplr.icims.com/jobs/2139/senior-data-engineer/job), [question bank: DataDriven](https://datadriven.io/tools/postgres-interview-questions), [question bank: MentorCruise](https://mentorcruise.com/questions/postgresql/) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Eight diagrams, at the step that shows the most: a server and its processes, row versions, the write-ahead log, loading, a partitioned table, replication, a backup, and the queue behind a lock.
- Six labs in their first state, and two of them again (the load lab and the index lab) after the recording was made again.
- Coach Ellie, who is in every one of those screens.

Looking at the diagrams found tags that sat on arrows or ran out of their boxes in several of them (the server, row versions, the partitioned table and replication), which no test can see, and the tags were moved and two were shortened. The tests found faults that looking did not: the first recapture showed that the recording was older than the recorder, and the verifier's tool check rejected `-Fc` until it learned that a short option can carry its argument.

## Files

```
postgresql/
  index.html, css/postgresql.css   the page and its colours
  js/config.js                     the course settings: Coach Ellie, the paths, the levels
  js/graphs.js                     8 diagram specs
  js/widgets.js                    the 6 labs
  js/content/                      one file per mission, 00 to 10
  js/real.js                       the recording: files, tables, texts and counts written by capture_pg.py
  verify/project/                  the Brewline project: schema, loader, upsert, indexes, roles, migration, partitions, backup script, postgresql.conf and pg_hba.conf
  verify/pglib.py                  helpers of the recorder: throwaway servers, masks for paths, ports, ids and times
  verify/capture_pg.py             starts the servers, runs the SQL and the tools, breaks things on purpose, and writes js/real.js
  verify/verify_pg.py              runs the code of the lessons, parses every SQL text, runs the bug hunts, checks every tool command, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js          recomputes the rules of the labs from the recording
  verify/e2e_labs.js               drives the six labs in Chromium
  verify/dump_pg.js                lists the code, the commands and the strings of the course for verify_pg.py
  verify/requirements.txt          what the machine needs
  verify/INTEGRATION.md            what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 postgresql/verify/verify_pg.py                       # the code of the lessons, the bug hunts, every tool command, lab data and controls (about 40 seconds)
python3 postgresql/verify/verify_pg.py --recapture --browser # also record again (about 2 minutes) and drive the labs in Chromium
python3 postgresql/verify/capture_pg.py                      # writes postgresql/js/real.js
node dev/lint-content.js postgresql
node dev/e2e.js postgresql && node postgresql/verify/e2e_labs.js
node dev/smoke.js postgresql --path all
```

A check whose tool is missing says so and is skipped.

Independent study material. Not affiliated with or endorsed by the PostgreSQL Global Development Group, Amazon, Google, Microsoft, the PgBouncer project or any other vendor or project named here.
