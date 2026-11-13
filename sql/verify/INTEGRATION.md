# Integration notes for the parent session

Everything below is ready to paste. The SQL tutorial touches nothing outside `sql/`. Numbers come from `node dev/stats.js sql`, the smoke walks and `python3 sql/verify/verify_sq.py --recapture --browser`.

## (a) Hub card, `index.html`

Paste after the card of the last ready tutorial, inside `<div class="cards">`. The hours are the minutes of `dev/stats.js` (junior 457, senior 839), rounded to the nearest half hour like the other cards.

```html
      <a class="card ready" href="sql/index.html">
        <span class="chip ready">Ready</span>
        <h3>SQL for data engineers</h3>
        <p>How a query runs, NULL and three-valued logic, joins and fan-out, aggregation, subqueries and recursive CTEs, window functions and frames, dates, time zones and JSON, patterns such as dedupe, gaps, sessions and funnels, safe loads and slowly changing dimensions, transactions and locks on a real server, indexes and plans, modelling for analytics, dialects and data quality checks. Fourteen missions with 41 coding rounds, fifteen labs and a boss round. Every result ran on DuckDB, PostgreSQL or SQLite, and the seven dialects that were only translated say so.</p>
        <div class="paths"><span>Junior path about 7.5 hours</span><span>Senior path about 14 hours</span></div>
        <span class="go">Open the tutorial &rarr;</span>
      </a>
```

## (b) Root README table row

```markdown
| **SQL for data engineers**: from SELECT to a plan you can read | Ready. 14 missions, 3 paths, 41 coding rounds, query results, plans and two-session transcripts recorded on DuckDB, PostgreSQL 16 and SQLite. Seven other dialects are translated, not run, and the screens say so | [`sql/`](sql/README.md) |
```

## (c) Root README layout block

```text
sql/                     one tutorial, same layout, plus
  js/widgets2.js           a second file of labs, because this tutorial has 15 of them
  js/real.js               query results, plans, transcripts of two PostgreSQL sessions and sqlglot translations, recorded on DuckDB, PostgreSQL and SQLite
  verify/capture_sq.py     starts a PostgreSQL server, runs the three engines on the Brewline data and writes js/real.js
  verify/verify_sq.py      checks every snippet, runs every query and coding round again, checks the lab data and, with --recapture, the recording
```

## (d) Root README honest-notes bullet

```markdown
- **The SQL tutorial records three engines, not ten.** Query results, plans and two-session transcripts come from DuckDB 2.0.0, PostgreSQL 16.15 (a real server that the recorder starts and stops) and SQLite 3.53.1, on made-up data. sqlglot translated nine queries for ten dialects. Snowflake, BigQuery, Redshift, MySQL, SQL Server, Oracle and Spark SQL did not run, and their screens say "translated, not run". No time is recorded, and the plans depend on settings chosen so that they repeat: no parallel workers, no JIT, a statistics target of 1,000. The isolation lessons show PostgreSQL only. The PostgreSQL 16.15 recording may be one minor version behind: a draft announcement of 12 November 2026 names 16.16.
```

## (e) Check-tools line

Add to the second code block of the root README, with the other verifiers:

```bash
python3 sql/verify/verify_sq.py           # SQL: snippets read by sqlglot, queries and coding rounds run again on DuckDB, PostgreSQL and SQLite, lab logic; --recapture records again, --browser adds the lab tests
```

And one sentence after the block: "The SQL check needs the PostgreSQL 16 server programs (`apt install postgresql-16`), or `SQ_PG_DSN` pointing at a server that runs. It starts and stops its own server otherwise, as the `postgres` user when it runs as root. It needs no `npm install --prefix`."

Also add `sql` to the list "the same commands work for dbt, databricks, aws, azure, ai, gcp and snowflake-dbt". `node dev/e2e.js sql` is the generic part; `node sql/verify/e2e_labs.js` runs the lab tests.

## (f) `package.json` script lines

Add `&& node dev/lint-content.js sql` to the `lint` script, and these lines to `scripts`:

```json
    "lint:sql": "node dev/lint-content.js sql",
    "smoke:sql": "node dev/smoke.js sql --path all",
    "e2e:sql": "node dev/e2e.js sql && node sql/verify/e2e_labs.js",
    "stats:sql": "node dev/stats.js sql",
    "verify:sql": "python3 sql/verify/verify_sq.py",
```

## (g) pip packages for `dev/requirements.txt`

Used for the recording and the checks (the first two are probably listed already, without versions):

```text
# sql/verify (the recorder, verify_sq.py and its --recapture). Needs the PostgreSQL 16 server programs and Node 20 or later:
duckdb==2.0.0
sqlglot==30.31.0
psycopg[binary]==3.3.8
```

`psycopg[binary]` is the only new package. `psycopg` 3.3.9 came out on 12 November 2026, after the recording. The recorder and the verifier also use `sqlite3` and `decimal` from the standard library of Python 3.13. `apt install postgresql-16` is not a pip package, and a CI job that runs `verify:sql` needs it.

## (h) Coach sentence

In the root README line "An illustrated coach talks you through every step: Sam teaches ..., and Noor teaches Azure", add: "Tomas teaches SQL." Where the README says which coach each tutorial sets in `js/config.js`, add "SQL sets Tomas".

## (i) Plan-list chip

In the plan list of `index.html`, under Languages, change `<li>SQL</li>` to:

```html
<li class="ready">SQL</li>
```

## Things that could not be done inside `sql/`

- `dev/requirements.txt` needs the line for `psycopg[binary]` (g).
- The hub card, the root README rows, the script lines and the chip (a to f, h, i) are yours to apply.
- `sql/verify/.cache/` (written by `--recapture`) and `__pycache__/` are ignored by `sql/verify/.gitignore`, which already existed.
- `node dev/stats.js sql` prints the minutes of each mission and the totals but not the frame counts. The frame counts (735, 1,312 and 1,420) are from `node dev/smoke.js sql --path junior|senior|all`.
