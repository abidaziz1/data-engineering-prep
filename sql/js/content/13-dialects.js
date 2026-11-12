/* Mission 13: dialects and data quality. One DuckDB query rewritten for ten dialects by sqlglot. DuckDB, PostgreSQL and SQLite were run and their rows compared with the original.
   Snowflake, BigQuery, Redshift, MySQL, SQL Server, Oracle and Spark SQL are translated text only: translated, not run. The second half writes data quality checks as SQL. */
(function () {
  var B = LAB.b, G = LAB.get;
  var T = G.counts('m13.translate'), TE = G.counts('m13.top_error'), PE = G.counts('m13.parse_error'), EE = G.counts('m13.engine_errors'), R = T.results;
  var DQ = G.on('m13.dq', 'duckdb'), UF = G.on('m13.dq_unique_fail', 'duckdb'), AJ = G.on('m13.dq_anti_join', 'duckdb'), CB = G.on('m13.dq_count_bug', 'duckdb').rows[0][0], CRT = G.on('m13.dq_count_right', 'duckdb').rows[0][0];
  var CN = G.on('m13.ch_not_null', 'duckdb').rows[0][0], CAC = G.on('m13.ch_accepted', 'duckdb');
  var LABEL = { snowflake: 'Snowflake', bigquery: 'BigQuery', redshift: 'Redshift', mysql: 'MySQL', tsql: 'SQL Server', oracle: 'Oracle', spark: 'Spark SQL', postgres: 'PostgreSQL', sqlite: 'SQLite', duckdb: 'DuckDB' };
  function flat(t) { return t.rows.map(function (r) { return r.join('|'); }).join(';'); }
  function status(q, t) {
    var it = R[q].targets[t];
    if (T.run_on.indexOf(t) < 0) return 'translated, not run';
    return it.ran === 'same' ? 'ran: same rows' : it.ran === 'different' ? 'ran: different rows' : 'ran: error';
  }
  function trText(q, targets) {
    var out = ['-- DuckDB, the original', R[q].source.replace(/ (FROM|WHERE|GROUP BY|ORDER BY|QUALIFY) /g, '\n$1 ')];
    targets.forEach(function (t) { out.push('', '-- ' + LABEL[t] + ' (' + status(q, t) + ')' + (R[q].targets[t].warning ? ', sqlglot: ' + R[q].targets[t].warning : ''), R[q].targets[t].sql); });
    return out.join('\n');
  }
  var DIV = { duckdb: G.on('m2.div_zero', 'duckdb').rows[0][0], postgres: G.text('m2.div_zero.postgres.error'), sqlite: G.on('m2.div_zero', 'sqlite').rows[0][0] };
  var NO = { duckdb: G.on('m2.null_order', 'duckdb').rows, postgres: G.on('m2.null_order', 'postgres').rows, sqlite: G.on('m2.null_order', 'sqlite').rows };
  var ME = { duckdb: G.on('m7.month_end', 'duckdb').rows[0][0], postgres: G.on('m7.month_end', 'postgres').rows[0][0], sqlite: G.table('m7.month_end_sqlite').rows[0][0] };
  var SM = { duckdb: G.text('m5.scalar_many.duckdb.error'), postgres: G.text('m5.scalar_many.postgres.error'), sqlite: G.on('m5.scalar_many', 'sqlite').rows[0][1] };
  var UP = { postgres: G.text('m9.upsert_dup.postgres.error'), duckdb: G.on('m9.upsert_dup_value', 'duckdb').rows[0][2], sqlite: G.on('m9.upsert_dup_value', 'sqlite').rows[0][2] };

  G.expect(T.sqlglot && T.targets.length === 10 && T.queries.length === 9 && T.run_on.join() === 'duckdb,postgres,sqlite', 'ten dialects, nine queries, and three engines that ran');
  G.expect(R.weekly.targets.postgres.ran === 'same' && R.weekly.targets.sqlite.ran === 'error' && /no such column: WEEK/.test(R.weekly.targets.sqlite.error) && /not supported/.test(R.weekly.targets.mysql.warning) && /DATETRUNC/.test(R.weekly.targets.tsql.sql), 'date_trunc: same on PostgreSQL, an error on SQLite, a warning for MySQL, DATETRUNC for SQL Server');
  G.expect(['top3', 'label', 'ilike', 'qualify', 'iff'].every(function (q) { return R[q].targets.postgres.ran === 'same' && R[q].targets.sqlite.ran === 'same'; }), 'five queries gave the same rows on PostgreSQL and SQLite after translation');
  G.expect(/_w = 1/.test(R.qualify.targets.postgres.sql) && /QUALIFY/.test(R.qualify.targets.snowflake.sql) && R.qualify.targets.postgres.ran === 'same', 'QUALIFY stays for Snowflake and becomes a subquery for PostgreSQL');
  G.expect(R.collect.targets.sqlite.ran === 'error' && /ARRAY_AGG/.test(R.collect.targets.sqlite.error) && R.collect.targets.postgres.ran === 'same' && /not supported/.test(R.collect.targets.bigquery.warning), 'collecting a list: SQLite has no ARRAY_AGG and sqlglot warns for BigQuery');
  G.expect(R.interval.targets.sqlite.ran === 'error' && R.interval.targets.postgres.ran === 'same', 'adding an interval fails on SQLite');
  G.expect(R.trycast.original.join() === 'NULL,12' && R.trycast.targets.postgres.ran === 'error' && /invalid input syntax for type integer/.test(R.trycast.targets.postgres.error) && R.trycast.targets.sqlite.ran === 'different' && R.trycast.targets.sqlite.rows[0].join() === '12,12' && /TRY_CAST/.test(R.trycast.targets.snowflake.sql), 'try_cast: PostgreSQL stops, SQLite returns 12 instead of NULL, and Snowflake keeps TRY_CAST');
  G.expect(/TOP 3/.test(TE.sql) && Object.keys(TE.errors).every(function (e) { return /syntax error/.test(TE.errors[e]); }), 'the SQL Server form with TOP is a syntax error on all three engines');
  G.expect(/^SELECT\n  o.order_id/.test(G.file('m13.pretty')) && G.file('m13.messy').indexOf('\n') < 0, 'sqlglot formatted a one-line query');
  G.expect(PE.error === 'no error' && /syntax error/.test(EE.postgres) && /syntax error/.test(EE.duckdb) && /incomplete input/.test(EE.sqlite), 'a broken GROUP BY: sqlglot accepted it and the three engines each refused it with their own words');
  G.expect(DQ.rows.length === 11 && DQ.rows.filter(function (r) { return r[1] !== '0'; }).map(function (r) { return r[0].split(':')[0] + '=' + r[1]; }).join() === 'customers=2,order_items=1,orders=1,orders_raw=4' && flat(DQ) === flat(G.on('m13.dq', 'postgres')) && flat(DQ) === flat(G.on('m13.dq', 'sqlite')), 'four checks fail: 2 customers without email, 1 price mismatch, 1 order without customer, 4 duplicate raw orders');
  G.expect(UF.rows.length === 4 && AJ.rows.join() === '1009,NULL' && CB === '0' && CRT === '1' && CN === '2' && CAC.rows[0].join() === 'pending,1', 'the failing check details and the coding rounds');
  G.expect(DIV.duckdb === 'inf' && /division by zero/.test(DIV.postgres) && DIV.sqlite === 'NULL' && NO.duckdb[7][1] === 'NULL' && NO.sqlite[0][1] === 'NULL' && ME.duckdb === '2026-02-28' && ME.sqlite === '2026-03-03' && /More than one row/.test(SM.duckdb), 'the differences of earlier missions');

  var PRETTY = G.file('m13.pretty'), MESSY = G.file('m13.messy'), DQQ = G.file('m13.dq'), UFQ = G.file('m13.dq_unique_fail'), AJQ = G.file('m13.dq_anti_join');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }
  var CUS = G.cols('data.customers', ['customer_id', 'email', 'country']), ORD = G.cols('data.orders', ['order_id', 'customer_id']), ORDS = G.cols('data.orders', ['order_id', 'status']);
  var RAW = G.cols('data.orders_raw', ['order_id', 'ingested_at', 'status']), CUS2 = G.cols('data.customers', ['customer_id', 'name']);

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Dialects and data quality', short: 'Dialects', blurb: 'The same query in ten dialects, what a translator can and cannot promise, and data quality checks written as SQL', minutes: 55,
    focus: ['qual', 'mon', 'ci'],
    goals: [
      'Say where **DuckDB, PostgreSQL and SQLite disagree**, with the recorded evidence.',
      'Use a **translator** (sqlglot) and read what it warns about, and know that **translated is not tested**.',
      'Write **data quality checks** as SQL that return the number of bad rows.',
      'Place checks at each layer, and make a failed check **loud**.',
      'Avoid checks that pass for the wrong reason, such as `count(column)` on NULLs.'
    ],
    say: 'Mission 13 has two halves. First, what changes when the same query meets another engine. I ran one query on three engines and translated it for seven more. The seven are labelled "translated, not run", every time. Second, data quality: checks written as SQL, placed where a problem enters, and tested so that they cannot pass by accident.',
    scenes: [
      B.talk({
        id: 'm13-what', t: 1, src: 'docs', title: 'Two halves: dialects and data quality',
        say: 'Press Next for six ideas.',
        items: [
          ['Every engine speaks its own SQL', 'The core is shared: SELECT, JOIN, GROUP BY. The edges differ: date functions, string functions, limits, arrays, JSON, QUALIFY, MERGE. A query that runs on one engine may fail on another, or worse, run and return something else.', 'A shared core, different edges.'],
          ['A translator rewrites text', 'sqlglot parses SQL and writes it in another dialect. It knows many differences. It does not run anything, and it cannot promise that the meaning is the same.', 'Translated is not tested.'],
          ['Run it where it will run', 'The only proof that a query works on an engine is to run it there on data, and to compare the rows. In this course three engines ran, and seven translations did not.', 'Test on the target.'],
          ['Quality is a set of questions', 'Is the key unique? Is a required column filled? Do the totals match the source? Is the data fresh? Each question is a query that returns the number of bad rows.', 'A check is a query.'],
          ['Checks belong at every layer', 'A problem is cheapest to fix where it enters. Check sources, staging, joins, marts and dashboards, and stop or alert on a failure.', 'Check where it can enter.'],
          ['A check can lie', 'A check that cannot fail is worse than no check. `count(customer_id)` skips NULLs, so a check for missing ids can report 0 forever. Test the check against bad data.', 'Make the check fail on purpose once.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm13-diffs', t: 1, src: 'rec', title: 'Where the three engines disagreed in this course',
        say: 'Five differences that were recorded in earlier missions. Press Next for each.',
        cols: ['Question', 'DuckDB', 'PostgreSQL', 'SQLite'],
        hl: 0,
        rows: [
          ['10 / 0', DIV.duckdb, 'error: ' + DIV.postgres, DIV.sqlite],
          ['Where are NULLs in ORDER BY tier ASC?', 'last', 'last', 'first'],
          ['31 January plus one month', ME.duckdb, ME.postgres, ME.sqlite],
          ['A scalar subquery that returns many rows', 'error', 'error', 'returns the first row: ' + SM.sqlite],
          ['Two source rows with the same key in an upsert', 'keeps the first: ' + UP.duckdb, 'error', 'keeps the last: ' + UP.sqlite]
        ],
        steps: [
          { upto: 1, say: 'Division by zero: DuckDB returned infinity, PostgreSQL raised an error and SQLite returned NULL. One query, three behaviors.' },
          { upto: 2, say: 'NULLs sort last on DuckDB and PostgreSQL and first on SQLite. Write NULLS LAST or NULLS FIRST when it matters.' },
          { upto: 3, say: 'Month arithmetic clamps to the end of February on DuckDB and PostgreSQL, and overflows into March on SQLite.' },
          { upto: 4, say: 'A scalar subquery with several rows is an error on two engines. SQLite quietly takes the first row.' },
          { upto: 5, say: 'An upsert with a duplicated source key: an error, the first value, or the last value. The three engines gave three answers.' }
        ],
        pick: 'Do not assume that a query that runs is a query that means the same thing.'
      }),

      B.widget({ id: 'm13-lab-translate', kind: 'translator', t: 1, src: 'rec', title: 'Lab: one query, ten dialects' }),

      B.cmp({
        id: 'm13-matrix', t: 1, src: 'rec', title: 'Translated and run: what happened',
        say: 'Nine queries, translated from DuckDB and run on the three engines that this course has. Press Next for each group.',
        cols: ['Query', 'DuckDB', 'PostgreSQL', 'SQLite'],
        hl: 0,
        rows: T.queries.map(function (q) { return [R[q].title, status(q, 'duckdb'), status(q, 'postgres'), status(q, 'sqlite')]; }),
        steps: [
          { upto: 3, say: 'The first three queries are plain: a week bucket, a top 3 and a string join. PostgreSQL ran all of them with the same rows. SQLite failed the week bucket, because it has no `date_trunc`.' },
          { upto: 6, say: 'Case-insensitive match and QUALIFY both worked on PostgreSQL and SQLite after translation. sqlglot turned QUALIFY into a subquery for engines that lack it.' },
          { upto: 9, say: 'Collecting a list, adding an interval and a cast that may fail are where the engines part: SQLite has no array aggregate and no INTERVAL, PostgreSQL has no TRY_CAST, and SQLite returned 12 for the text 12x where DuckDB returned NULL.' }
        ],
        pick: 'A translation that parses is not a translation that works. Run it on the target and compare the rows.'
      }),

      B.code({
        id: 'm13-trans-weekly', t: 2, src: 'rec', title: 'date_trunc in six dialects', file: 'sqlglot ' + T.sqlglot + ': translated for six dialects', lang: 'sql', code: trText('weekly', ['postgres', 'sqlite', 'snowflake', 'tsql', 'mysql', 'oracle']),
        steps: [
          { say: 'One week bucket, written for six engines. Only PostgreSQL and SQLite were run. The rest is text from sqlglot.' },
          { say: 'PostgreSQL keeps `DATE_TRUNC`, and the rows were the same as the original.', lines: G.span(trText('weekly', ['postgres', 'sqlite', 'snowflake', 'tsql', 'mysql', 'oracle']), /-- PostgreSQL/, /DATE_TRUNC/) },
          { say: 'SQLite got the same text, and it failed with `no such column: WEEK`. It has no date_trunc. The translator wrote a call that SQLite cannot run, and nothing in the text warned about it.', lines: G.span(trText('weekly', ['postgres', 'sqlite', 'snowflake', 'tsql', 'mysql', 'oracle']), /-- SQLite/, /DATE_TRUNC/) },
          { say: 'SQL Server has `DATETRUNC`, and MySQL and Oracle use other forms. For MySQL and SQL Server, sqlglot added a warning: it cannot translate NULLS LAST with a positional ORDER BY exactly. Those two translations are not exact. None of them was run.', lines: G.span(trText('weekly', ['postgres', 'sqlite', 'snowflake', 'tsql', 'mysql', 'oracle']), /-- Snowflake/, /DATETRUNC/) }
        ],
        note: 'Seven of these dialects were translated, not run. The text may be right, and it may not. Run it where it will live.'
      }),

      B.code({
        id: 'm13-trans-qualify', t: 2, src: 'rec', title: 'QUALIFY: kept or rewritten', file: 'sqlglot ' + T.sqlglot + ': translated for three dialects', lang: 'sql', code: trText('qualify', ['snowflake', 'postgres', 'sqlite']),
        steps: [
          { say: 'The biggest paid order of each store, with QUALIFY: a clause that filters on a window function.' },
          { say: 'Snowflake has QUALIFY, so sqlglot kept it. This text was translated, not run.', lines: G.span(trText('qualify', ['snowflake', 'postgres', 'sqlite']), /-- Snowflake/, /^QUALIFY/) },
          { say: 'PostgreSQL has no QUALIFY. sqlglot rewrote it as a subquery with the window function in the inner SELECT and a filter outside, the CTE form of mission 6. It ran on PostgreSQL and SQLite, and the rows were the same as the original.', lines: G.span(trText('qualify', ['snowflake', 'postgres', 'sqlite']), /-- PostgreSQL/, /_w = 1/) }
        ]
      }),

      B.code({
        id: 'm13-trans-trycast', t: 2, src: 'rec', title: 'A cast that may fail: three answers', file: 'sqlglot ' + T.sqlglot + ': translated for four dialects', lang: 'sql', code: trText('trycast', ['snowflake', 'postgres', 'sqlite', 'bigquery']),
        steps: [
          { say: '`try_cast` returns NULL when a text cannot be converted. The query casts the text 12x, which is not a number, and the text 12, which is.' },
          { say: 'On DuckDB, the original returned NULL for 12x and 12 for 12. Snowflake keeps `TRY_CAST`. That text was translated, not run.', lines: G.span(trText('trycast', ['snowflake', 'postgres', 'sqlite', 'bigquery']), /-- Snowflake/, /TRY_CAST\('12' /) },
          { say: 'PostgreSQL has no TRY_CAST. sqlglot wrote a plain CAST, and PostgreSQL stopped with: ' + R.trycast.targets.postgres.error + '. The translation changed the behavior: a NULL became an error.', lines: G.span(trText('trycast', ['snowflake', 'postgres', 'sqlite', 'bigquery']), /-- PostgreSQL/, /CAST\('12' /) },
          { say: 'SQLite ran the CAST and returned 12 for the text 12x. It reads the number at the start of the text and ignores the rest. A quiet wrong answer, from a query that parsed and ran.', lines: G.span(trText('trycast', ['snowflake', 'postgres', 'sqlite', 'bigquery']), /-- SQLite/, /CAST\('12' /) }
        ],
        note: 'This is the case to remember: a translation can run without an error and return other rows. Only a comparison of the rows shows it.'
      }),

      B.code({
        id: 'm13-pretty', t: 1, src: 'rec', title: 'A formatter: one line into a readable query', file: 'sqlglot ' + T.sqlglot + ' (formatting, not an engine)', lang: 'sql', code: ['-- before', MESSY, '', '-- after', PRETTY].join('\n'),
        steps: [
          { say: 'The same tool can format SQL. Here is a query on one line, with no spaces after the commas.' },
          { say: 'After formatting each clause starts a line, each column and join condition has its own line, and the keywords are in capitals. The meaning did not change, and the query is easy to read and to compare in a review.', lines: G.span(['-- before', MESSY, '', '-- after', PRETTY].join('\n'), /^SELECT$/, /amt DESC/) }
        ],
        note: 'The formatter parses and prints. It does not run the query, and it does not check that the tables exist.'
      }),

      B.cmp({
        id: 'm13-parse', t: 2, src: 'rec', title: 'A broken query: who notices, and when',
        say: 'A query that ends in `GROUP BY` with nothing after it. Press Next for each tool.',
        cols: ['Tool', 'What it said'],
        hl: 0,
        rows: [
          ['sqlglot parse_one (DuckDB dialect)', PE.error === 'no error' ? 'no error: it parsed the incomplete GROUP BY' : PE.error],
          ['DuckDB', EE.duckdb],
          ['PostgreSQL', EE.postgres],
          ['SQLite', EE.sqlite]
        ],
        steps: [
          { upto: 1, say: 'The parser of sqlglot accepted the incomplete statement. A parser can be more forgiving than an engine, so a clean parse proves little.' },
          { upto: 2, say: 'DuckDB named the place: at or near BY.' },
          { upto: 3, say: 'PostgreSQL said: syntax error at end of input.' },
          { upto: 4, say: 'SQLite said: incomplete input. Three engines, three sentences, one mistake.' }
        ],
        pick: 'Use a parser to catch the cheap mistakes, and an engine to catch the rest.'
      }),

      B.bug({
        id: 'm13-bug-top', t: 1, title: 'Bug hunt: a query ported from SQL Server',
        q: 'A query from a SQL Server project was copied into PostgreSQL. All three engines of this course refuse it: PostgreSQL says "' + TE.errors.postgres + '". Click the line that SQL Server accepts and the others do not.',
        file: 'top_orders.sql', lang: 'sql',
        code: TE.sql, bad: [1], hint: 'How does PostgreSQL limit the number of rows?',
        why: 'SQL Server puts the limit in the SELECT list with `TOP 3`. PostgreSQL, DuckDB and SQLite put it at the end with `LIMIT 3`. sqlglot translates between the two, and the recording shows the three engines all raising a syntax error for the SQL Server form.',
        fix: ['SELECT order_id, total', 'FROM orders', "WHERE status = 'paid'", 'ORDER BY total DESC', 'LIMIT 3;'].join('\n'),
        cheer: 'A port needs a test run on the new engine. Reading it is not enough.'
      }),

      B.quiz({
        id: 'm13-q-translate', t: 1, q: 'A translator turns your query into PostgreSQL. It parses without an error. What do you know?',
        opts: [
          { t: 'The query returns the same rows as before', fb: 'Not necessarily. In the recording a translated try_cast became a CAST and PostgreSQL stopped with an error, and SQLite returned 12 where DuckDB returned NULL.' },
          { t: 'The text is valid for the dialect. You must still run it and compare the rows', fb: '' },
          { t: 'The query is as fast as before', fb: 'Speed depends on the engine, the plan and the indexes. A translator does not look at it.' },
          { t: 'Nothing: translators are not accurate', fb: 'They are accurate for many constructs, as five queries showed. They are not a proof.' }
        ],
        ok: 1, why: 'A translator produces text for a dialect and warns about what it cannot express. Whether the text works, and whether it means the same, shows only when you run it on the target and compare the rows, as the matrix of nine queries did.'
      }),

      B.cmp({
        id: 'm13-dq-kinds', t: 1, src: 'docs', title: 'Seven kinds of check',
        say: 'A check is a query that returns the number of bad rows. Press Next for each kind.',
        cols: ['Check', 'The question', 'The SQL idea'],
        hl: 0,
        rows: [
          ['Not null', 'Is a required column filled?', '`WHERE column IS NULL`, counted with count(*)'],
          ['Unique', 'Is the key unique?', '`count(*) - count(DISTINCT key)`'],
          ['Accepted values', 'Is the value in the allowed list?', '`WHERE status NOT IN (...)`'],
          ['Referential integrity', 'Does each key have a parent?', 'An anti-join: LEFT JOIN, then `WHERE parent IS NULL`'],
          ['Reconciliation', 'Do the totals match the source?', 'Compare `sum` and `count` of two tables'],
          ['Freshness', 'Is the newest row recent enough?', '`max(timestamp)` against a limit'],
          ['Volume', 'Is the row count in the normal range?', '`count(*)` between a low and a high bound']
        ],
        steps: [
          { upto: 2, say: 'Not null and unique are the two cheapest checks, and they catch most problems at the source.' },
          { upto: 4, say: 'Accepted values and referential integrity catch bad codes and orphans.' },
          { upto: 7, say: 'Reconciliation, freshness and volume watch the pipeline itself: did the load run, and did it bring the usual amount?' }
        ],
        pick: 'Start with not null, unique and a row count. Add the others where a problem has already hurt.'
      }),

      B.flow({
        id: 'm13-dq-flow', t: 1, src: 'docs', title: 'Where checks sit', g: 'dq', legend: true,
        steps: [
          { say: 'A problem is cheapest to fix where it enters. Press Next to see which check belongs at which layer.', tags: ['tg_d1'] },
          { say: 'Step 1. On the source tables: required columns are filled and codes are in the accepted list.', on: ['c1'], focus: ['d_src', 'd_stg'], cap: 'Source.' },
          { say: 'Step 2. In staging: keys are unique and duplicates are removed or flagged.', on: ['c2'], focus: ['d_stg', 'd_int'], cap: 'Staging.' },
          { say: 'Step 3. After joins: foreign keys have parents, and a join did not multiply rows.', on: ['c3'], focus: ['d_int', 'd_mart'], cap: 'Joins.' },
          { say: 'Step 4. On the marts: totals reconcile to the source, as mission 12 did with 156.00 on both sides.', on: ['c4'], focus: ['d_mart', 'd_dash'], tags: ['tg_d2'], cap: 'Marts.' },
          { say: 'Step 5. A failed check does not just print. It stops the load or sends an alert, before the problem reaches a dashboard.', on: ['c5'], focus: ['d_int', 'd_alert'], cap: 'Alert or stop.' }
        ]
      }),

      B.sql({
        id: 'm13-dq-score', t: 1, src: 'rec', title: 'A scorecard of eleven checks', file: 'dq_scorecard.sql', code: DQQ, ctx: G.ctx('duckdb'),
        result: res('m13.dq', 'duckdb'),
        steps: [
          { say: 'Eleven checks in one query, joined with UNION ALL. Each one returns its name and the number of bad rows. 0 means it passed.' },
          { say: 'A not-null check and a unique check are the simplest forms.', lines: G.span(DQQ, /order_id is unique/, /customer_id is not null/) },
          { say: 'A reconciliation: an order total must equal the sum of its lines. A foreign key check uses an anti-join. A freshness check compares the newest order with a limit.', lines: G.span(DQQ, /total equals the sum of its lines/, /GROUP BY o.order_id, o.total HAVING/) },
          { say: 'Run it. Seven checks passed. Four failed: 4 duplicate rows in `orders_raw`, 2 customers without an email, 1 order without a customer and 1 order line charged a price that differs from the list price that day. DuckDB, PostgreSQL and SQLite returned the same eleven rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm13-dq-unique', t: 1, src: 'rec', title: 'A failed unique check: look at the rows', file: 'duplicates.sql', code: UFQ, ctx: G.ctx('duckdb'),
        result: res('m13.dq_unique_fail', 'duckdb'),
        steps: [
          { say: 'A scorecard says 4. The detail query says which rows. Group by the key and keep the groups with more than one row.' },
          { say: 'Run it. Orders 1001, 1002, 1004 and 1005 each have two versions in the raw table, which is the dedupe problem of mission 8. The check found the same facts as the scorecard, with names.', run: true }
        ]
      }),

      B.sql({
        id: 'm13-dq-anti', t: 2, src: 'rec', title: 'Referential integrity with an anti-join', file: 'orphans.sql', code: AJQ, ctx: G.ctx('duckdb'),
        result: res('m13.dq_anti_join', 'duckdb'),
        steps: [
          { say: 'Does every order point to a customer that exists? The anti-join keeps the orders with no matching customer.' },
          { say: 'Run it. One row: order 1009, whose customer is NULL. It is the guest order. It is not an orphan with a wrong key, it has no key at all. The scorecard counted it under "customer_id is not null" and did not count it under "the customer exists", which skips NULL keys on purpose. Decide which of the two you mean, and write that check.', run: true }
        ]
      }),

      B.sql({
        id: 'm13-dq-count-bug', t: 1, src: 'rec', title: 'A check that cannot fail', file: 'wrong_check.sql', code: G.file('m13.dq_count_bug'), ctx: G.ctx('duckdb'),
        result: res('m13.dq_count_bug', 'duckdb'),
        steps: [
          { say: 'This check wants to count the orders with no customer. The data has one. What does it say?' },
          { say: '`count(customer_id)` counts the values that are not NULL. The WHERE keeps only NULL ids, so there is nothing to count.', lines: G.span(G.file('m13.dq_count_bug'), /count\(customer_id\)/) },
          { say: 'Run it. The check reports ' + CB + ' bad rows and passes, while the table has ' + CRT + ' order without a customer. `count(*)` counts rows and gave ' + CRT + '. A check like this stays green forever. Test every check on data that you know is bad.', run: true }
        ]
      }),

      B.bug({
        id: 'm13-bug-dq', t: 1, title: 'Bug hunt: the check that is always green',
        q: 'A job runs this check every night and has reported 0 bad rows for months. A new analyst finds orders with no customer. Click the line that makes the check blind.',
        file: 'check_customer.sql', lang: 'sql',
        code: G.file('m13.dq_count_bug'), bad: [1], hint: 'What does count(column) do with NULL?',
        why: '`count(customer_id)` skips NULL, and the WHERE keeps only rows where `customer_id` is NULL, so the count is always 0. `count(*)` counts the rows themselves: ' + CRT + ' in the recording. Prove a check with a row that must fail.',
        fix: G.file('m13.dq_count_right'),
        cheer: 'A check that has never failed has not been tested.'
      }),

      B.cmp({
        id: 'm13-severity', t: 2, src: 'docs', title: 'What a failed check should do',
        say: 'A check has a severity. Press Next for each level.',
        cols: ['Severity', 'Example from the scorecard', 'Action'],
        hl: 0,
        rows: [
          ['Error: stop', 'A key that must be unique has duplicates', 'Stop the load. Nothing downstream should read the bad data.'],
          ['Warning: alert', 'The email of 2 customers is missing', 'Load and tell the owner. Track the count over time.'],
          ['Info: record', 'The row count is lower than yesterday', 'Record the number and look at the trend.']
        ],
        steps: [
          { upto: 1, say: 'Some failures make every number downstream wrong. Stop for those.' },
          { upto: 2, say: 'Some are known and tolerated, such as optional emails. Alert, load and keep the count.' },
          { upto: 3, say: 'Some are information. A trend is more useful than a single failure.' }
        ],
        pick: 'Decide the severity when you write the check, so that a failure at night has a known answer.'
      }),

      B.quiz({
        id: 'm13-q-dq', t: 1, q: 'A check should find customers with no email. Which query returns the right count for the 8 customers of the course data?',
        opts: [
          { t: 'SELECT count(email) FROM customers WHERE email IS NULL', fb: 'count(email) skips NULL, so it always returns 0 here.' },
          { t: 'SELECT count(*) FROM customers WHERE email IS NULL', fb: '' },
          { t: 'SELECT count(*) FROM customers WHERE email = NULL', fb: 'A comparison with NULL is never true, so it returns 0.' },
          { t: 'SELECT count(*) FROM customers WHERE email <> \'\'', fb: 'It counts the customers that have an email, and NULL is not counted either way.' }
        ],
        ok: 1, why: '`IS NULL` finds the missing values, and `count(*)` counts the rows that remain: 2 customers have no email. Mission 2 showed the same traps with `= NULL` and with `count(column)`.'
      }),

      B.quiz({
        id: 'm13-q-sev', t: 2, q: 'The check "email is present" fails for 2 of 8 customers. The email is optional. What should the job do?',
        opts: [
          { t: 'Stop the whole load', fb: 'The email is optional. Stopping blocks every report for a known and harmless gap.' },
          { t: 'Load the data, raise a warning, and track the count', fb: '' },
          { t: 'Delete the 2 customers', fb: 'The customers are real, and deleting them loses their orders.' },
          { t: 'Turn the check off', fb: 'Then a jump from 2 to 2,000 missing emails would pass unseen.' }
        ],
        ok: 1, why: 'A tolerated gap is a warning with a number to watch. The check stays on, so that a change in the count is visible. Only a failure that corrupts every number downstream should stop the load.'
      }),

      B.challenge({
        id: 'm13-ch-not-null', t: 1, title: 'Coding round: customers with missing data', file: 'missing_data.sql', lang: 'sql',
        q: 'Write a check that returns the **number of customers with a missing email or a missing country**, as one column `bad_rows`. 0 would pass.',
        data: [{ name: 'customers (3 columns)', cols: CUS.cols, rows: CUS.rows, types: ['INTEGER', 'VARCHAR', 'VARCHAR'] }],
        starter: '-- number of customers with no email or no country\nSELECT ...',
        hints: ['Use `IS NULL`, not `= NULL`.', 'Combine the two conditions with OR.', 'Use `count(*)`, not `count(email)`.'],
        sol: G.file('m13.ch_not_null'),
        res: res('m13.ch_not_null', 'duckdb'),
        expl: ['`email IS NULL OR country IS NULL` finds the rows with either gap: Ben Ortiz has no email, and Fay Tan has no email and no country.', '`count(*)` counts the rows that pass the WHERE. Each customer counts once, even if two columns are missing.', 'The result is 2. A job would report a warning with that number.'],
        cx: 'One pass over the customers table.'
      }),

      B.challenge({
        id: 'm13-ch-accepted', t: 1, title: 'Coding round: accepted values', file: 'accepted_values.sql', lang: 'sql',
        q: 'The accepted statuses of an order are `paid`, `cancelled` and `refunded`. Return the **statuses in `orders` that are not accepted**, with the number of rows for each: `status` and `rows_with_status`.',
        data: [{ name: 'orders (2 columns)', cols: ORDS.cols, rows: ORDS.rows, types: ['INTEGER', 'VARCHAR'] }],
        starter: '-- unaccepted statuses and their counts\nSELECT ...',
        hints: ['`NOT IN` with the list of accepted values.', 'Group by the status to count the rows.', 'Order by the status.'],
        sol: G.file('m13.ch_accepted'),
        res: res('m13.ch_accepted', 'duckdb'),
        expl: ['`status NOT IN (\'paid\', \'cancelled\', \'refunded\')` keeps the rows with any other value.', 'Group by status and count: one row has the status `pending`.', 'The status column here has no NULLs. If it had, `NOT IN` would skip them, and a separate NOT NULL check would be needed.'],
        cx: 'One pass over the orders table.'
      }),

      B.challenge({
        id: 'm13-ch-fk', t: 2, title: 'Coding round: orders with no customer row', file: 'orphans.sql', lang: 'sql',
        q: 'Return the **orders whose `customer_id` has no row in `customers`**, including orders where the id is NULL: `order_id` and `customer_id`, ordered by order id. Use an anti-join.',
        data: [{ name: 'orders (2 columns)', cols: ORD.cols, rows: ORD.rows, types: ['INTEGER', 'INTEGER'] }, { name: 'customers (2 columns)', cols: CUS2.cols, rows: CUS2.rows, types: ['INTEGER', 'VARCHAR'] }],
        starter: '-- orders with no matching customer\nSELECT ...',
        hints: ['LEFT JOIN customers to orders.', 'A missing match shows as NULL in the customer columns.', 'Filter on `c.customer_id IS NULL`.'],
        sol: AJQ,
        res: res('m13.dq_anti_join', 'duckdb'),
        expl: ['The LEFT JOIN keeps every order. Where no customer matches, the customer columns are NULL.', '`WHERE c.customer_id IS NULL` keeps those orders. Order 1009 comes back, because its `customer_id` is NULL and a NULL matches nothing.', 'If you wanted only real orphans, with an id that does not exist, add `AND o.customer_id IS NOT NULL`. Decide which case you mean.'],
        cx: 'One join on the customer key, with an index lookup for each order or one hash join.'
      }),

      B.challenge({
        id: 'm13-ch-dups', t: 1, title: 'Coding round: duplicate keys in the raw table', file: 'duplicate_keys.sql', lang: 'sql',
        q: 'Return the **order ids that appear more than once** in `orders_raw`, with the number of versions: `order_id` and `versions`, ordered by order id.',
        data: [{ name: 'orders_raw (3 columns)', cols: RAW.cols, rows: RAW.rows, types: ['INTEGER', 'TIMESTAMP', 'VARCHAR'] }],
        starter: '-- order ids with more than one row\nSELECT ...',
        hints: ['Group by the key.', '`HAVING count(*) > 1` keeps the repeated keys.', 'Order by the id.'],
        sol: UFQ,
        res: res('m13.dq_unique_fail', 'duckdb'),
        expl: ['Grouping by `order_id` gives one group for each order, and `count(*)` is the number of its versions.', '`HAVING` filters the groups after counting. A WHERE could not, because the count does not exist yet.', 'Four orders have two versions: 1001, 1002, 1004 and 1005.'],
        cx: 'One pass over the table, with a hash group by order id.'
      }),

      B.decide({
        id: 'm13-dec-checks', t: 2, title: 'Decision: where do the checks run, and what do they do?',
        scenario: 'A nightly pipeline loads six tables and builds a mart that twelve dashboards read. Last month a duplicate load doubled the revenue for a day and nobody noticed for two days. You can add checks now. Where do they run, and what happens when one fails?',
        opts: [
          { t: 'One check on the dashboard, with an email when it fails', d: 'Cheap, and it covers the number that people read.', lose: 'By then the bad data has gone through every layer. The cause is hard to find, and the dashboard is already wrong.' },
          { t: 'Checks at each layer: keys and nulls in staging, reconciliation on the mart, with an error that stops the load', d: 'A problem is caught where it enters.', lose: '' },
          { t: 'Checks that only write to a log table', d: 'No risk of blocking the load.', lose: 'Nobody reads the log at 3 AM. The bad data is still published.' },
          { t: 'Manual checks by an analyst every Monday', d: 'No code to write.', lose: 'A bad day stays in the numbers for up to a week, and the checks depend on one person.' }
        ],
        pick: 1,
        why: 'The doubled revenue came from duplicate rows in staging. A unique key check there, and a reconciliation of the mart to the source, would have failed the load before any dashboard changed. In the scorecard, such checks found 4 duplicate raw orders at once.',
        when: 'For a known, tolerated problem, such as an optional email, use a warning that records the count. Stop the load only for errors that make downstream numbers wrong.'
      }),

      B.incident({
        id: 'm13-inc-silent', t: 2, time: '16:10',
        alert: 'Finance finds 40 orders with no customer id in the warehouse. The "customer id is not null" check has been green for months. The check is `SELECT count(customer_id) FROM orders WHERE customer_id IS NULL`. The job fails only when the result is above 0.',
        clues: ['count(column) counts values that are not NULL.', 'The WHERE keeps only the rows where the column is NULL.', 'The check has never been run against a row that must fail.'],
        opts: [
          { t: 'Lower the alert threshold of the check', fb: 'The result is 0 whatever the data holds, so no threshold can help.' },
          { t: 'Change it to count(*), and run the new check on the 40 known bad rows to prove that it fails', fb: '' },
          { t: 'Delete the 40 orders', fb: 'The orders are real. Deleting them hides the problem and loses revenue.' },
          { t: 'Replace the check by a daily manual look', fb: 'It brings back the dependence on a person and still leaves the broken check in the pipeline.' }
        ],
        best: 1,
        why: 'The check could not fail. `count(customer_id)` skips the NULLs that the WHERE selects, so it returned 0 for any data. In the recording it reported 0 for the one order with no customer, and `count(*)` reported 1. A check is only proven when it has failed on data that you know is bad.',
        checks: [['Read the check', 'Which rows does the WHERE keep, and what does the aggregate count?'], ['Fix the aggregate', 'Use count(*) so that rows are counted, not values.'], ['Prove it', 'Run the check on a table with known bad rows, and see it fail.'], ['Look for the same mistake', 'Search the other checks for count(column) with a NULL filter.']],
        tell: 'A not-null check was green for months while 40 orders had no customer. It used count(customer_id) with a WHERE on IS NULL, which can only return 0. I changed it to count(*), ran it against the 40 known bad rows to see it fail, searched the other checks for the same pattern, and added a rule that a new check must be shown to fail on bad data before it goes live.',
        prevent: ['Test every new check on data that must fail.', 'Prefer count(*) for counting rows.', 'Review checks like code, and list what each check cannot see.']
      }),

      B.qa({
        id: 'qa-dialect-diffs', t: 1, tag: 'Dialects', secs: 60,
        q: 'Where do SQL dialects differ, and how do you protect against it?',
        pts: ['Dates, strings, limits, arrays, JSON', 'The same query can return other rows', 'Test on the target engine', 'Compare the rows'],
        short: 'The core of SQL is shared, and the edges differ: date functions, string functions, limits, arrays, JSON, QUALIFY and MERGE. Some differences are loud. A query written for SQL Server with TOP 3 was a syntax error on PostgreSQL, DuckDB and SQLite. Others are quiet. Division by zero gave infinity on DuckDB, an error on PostgreSQL and NULL on SQLite. SQLite returned 12 for a cast of the text 12x where DuckDB returned NULL. Adding a month to 31 January gave 28 February on two engines and 3 March on SQLite. I protect against it by running the query on the target engine, on data, and comparing the rows with the original, not by reading it.',
        fu: [['What do you do when you must support several engines?', 'Keep to the common subset, isolate the differences in views or macros, and run the test suite on every engine.']],
        trap: 'Assuming that a query that runs on the new engine means the same thing.',
        real: 'Tell about a migration and what behaved differently.'
      }),

      B.qa({
        id: 'qa-sqlglot', t: 2, tag: 'Dialects', secs: 60,
        q: 'What does a SQL translator such as sqlglot give you, and what does it not?',
        pts: ['Parses SQL and writes another dialect', 'Handles many differences, even QUALIFY', 'Warns when it cannot express something', 'It does not run or prove the meaning'],
        short: 'sqlglot parses SQL into a tree and writes it in another dialect. It handles many differences: it rewrote QUALIFY as a subquery for PostgreSQL, turned LIMIT into TOP for SQL Server and kept TRY_CAST for Snowflake. It warns when it cannot be exact, for example about NULLS LAST with a positional ORDER BY for MySQL and SQL Server. It does not run anything and cannot prove that the meaning is the same. In my test, a translated try_cast became a CAST that stopped PostgreSQL with an error, and SQLite ran it and returned 12 where DuckDB returned NULL. So I treat a translation as a draft: run it on the target, compare the rows, and mark anything that I did not run as translated, not run.',
        fu: [['Where is a translator most useful?', 'To start a migration, to format and lint SQL, and to find the constructs that need manual work.']],
        trap: 'Shipping a translated query without running it.',
        real: 'Tell about a translation that you had to fix by hand.'
      }),

      B.qa({
        id: 'qa-dq-what', t: 1, tag: 'Data quality', secs: 60,
        q: 'What are data quality checks, and which ones do you start with?',
        pts: ['A query that returns the number of bad rows', 'Not null, unique, accepted values, referential integrity', 'Reconciliation, freshness, volume', 'Start small'],
        short: 'A data quality check is a query that returns the number of rows that break a rule, so that 0 means pass. I start with the cheap ones: required columns are not NULL, keys are unique, values are in the accepted list, and the row count is in the normal range. Then foreign keys with an anti-join, reconciliation of totals between layers, and freshness of the newest row. My scorecard had eleven checks in one query. Seven passed, and four failed: 4 duplicate raw orders, 2 customers without an email, 1 order without a customer and 1 order line with a price that differs from the list price that day. All three engines returned the same eleven results.',
        fu: [['How do you keep the number of checks manageable?', 'Check the keys and the totals of every table, and add more only where a problem has already hurt.']],
        trap: 'Writing many checks and no owner for the failures.',
        real: 'Tell about a check that caught a real problem.'
      }),

      B.qa({
        id: 'qa-dq-where', t: 2, tag: 'Data quality', secs: 60,
        q: 'Where in the pipeline do you put the checks?',
        pts: ['At each layer where a problem can enter', 'Source and staging: nulls, keys, duplicates', 'Joins and marts: integrity and reconciliation', 'Dashboards: freshness and volume'],
        short: 'At each layer where a problem can enter, because it is cheapest to fix there. On the sources I check required columns and accepted values. In staging I check that keys are unique and that duplicates are removed. After joins I check foreign keys and that a join did not multiply rows. On the marts I reconcile totals to the source, as I did in the star schema: 156.00 on both sides and 0 orders that differ. For dashboards I check freshness and volume. A failed error-level check stops the load or raises an alert, so the problem does not move on. In my example, the duplicates of the raw orders were found in staging, before they could double a dashboard.',
        fu: [['What is the cost of a check?', 'A scan of the table. For large tables I check the new partition or a sample, and run the full check less often.']],
        trap: 'Checking only at the end, where the cause is hard to find.',
        real: 'Tell about a problem that a check caught early.'
      }),

      B.qa({
        id: 'qa-dq-test', t: 2, tag: 'Data quality', secs: 60,
        q: 'How do you know that a check works?',
        pts: ['Run it on data that must fail', 'count(column) skips NULL', 'Review checks like code', 'Track results over time'],
        short: 'I make it fail on purpose. A check that has never failed may be unable to. In my test, a check for orders with no customer used count(customer_id) with a WHERE on NULL. It reported 0 bad rows and passed, while the table had 1 such order. count(*) reported 1. The reason is that count(column) skips NULLs, and the WHERE had kept only NULLs. So every new check runs once against rows that I know are bad, and I review checks in the same way as code. I store the results of each run with the date, so that I can see the trend and see a check that is always at exactly the same number.',
        fu: [['What other checks can pass for the wrong reason?', 'A comparison with NULL such as = NULL, a NOT IN on a list that holds NULL, and a join that drops the rows it should test.']],
        trap: 'Trusting a green check that has never been proven.',
        real: 'Tell about a check that was wrong and how you found it.'
      }),

      B.qa({
        id: 'qa-dq-severity', t: 2, tag: 'Data quality', secs: 60,
        q: 'What should happen when a check fails?',
        pts: ['Decide severity in advance', 'Error: stop the load', 'Warning: load, alert and track', 'An owner and a runbook'],
        short: 'It depends on the severity, which I decide when I write the check. An error is a rule whose failure makes downstream numbers wrong, such as a duplicate key. It stops the load and pages someone. A warning is a known gap that is tolerated, such as 2 customers without an optional email. The data loads, the owner is told and the count is tracked. An info check records a number for the trend, such as a lower row count. Every check has an owner and a short note of what to do. If every failure stops the pipeline, people turn checks off. If none does, nobody reads them.',
        fu: [['How do you avoid alert fatigue?', 'Fewer, clearer checks, severities that match the impact, and a fix for a check that fails every day.']],
        trap: 'Making every check an error, or none.',
        real: 'Tell about an alert that you tuned.'
      }),

      B.qa({
        id: 'qa-dq-count-null', t: 1, tag: 'Data quality', secs: 60,
        q: 'Why can count(column) hide missing values?',
        pts: ['count(column) skips NULL', 'count(*) counts rows', 'IS NULL, not = NULL', 'Mission 2'],
        short: 'count(column) counts the values that are not NULL, so it skips exactly the rows that a not-null check wants to see. A check written as count(customer_id) with WHERE customer_id IS NULL can only return 0. In my test it returned 0 while count(*) returned 1 for the guest order. The fix is count(*), which counts rows. I also write IS NULL and never = NULL, because a comparison with NULL is never true. And with NOT IN, a NULL in the list makes the whole condition unknown and returns no rows. On the course data, count(*) minus count(email) is 2 missing emails.',
        fu: [['What is count(DISTINCT column) for?', 'The number of different non-NULL values. count(*) minus count(DISTINCT key) is the number of duplicate rows.']],
        trap: 'Using count(column) in a check about missing values.',
        real: 'Tell about a count that was lower than it should be.'
      }),

      B.qa({
        id: 'qa-migration', t: 3, tag: 'Dialects', secs: 60,
        q: 'How do you migrate SQL from one engine to another safely?',
        pts: ['Inventory the constructs', 'Translate, then run on the target', 'Compare rows on real data', 'Check types, NULL and ordering', 'Parallel run'],
        short: 'I inventory the constructs in use: date and string functions, arrays, JSON, limits, MERGE and window frames. I translate with a tool such as sqlglot for the first draft and read its warnings. Then I run every query on the target and compare the rows with the source, as I did with nine queries on three engines: five matched on all, and the rest showed an error on one engine or a different result. I look at types, NULL handling, ordering and rounding, because the differences are quiet. I keep a test suite with fixed data. For the cutover I run both systems in parallel and compare the outputs of real jobs before I switch. The queries that I could not run on the target stay marked as translated, not run.',
        fu: [['What is the first thing to check after a translation?', 'The row counts and the totals against the source, and then the edge cases: NULLs, empty groups and the month ends.']],
        trap: 'Trusting that a clean translation is a correct one.',
        real: 'Tell about a migration and its parallel run.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Dialect Doctor', color: '#DDD6FE',
        pts: [
          'Engines **disagree**: 10 / 0 is infinity, an error or NULL. A quiet difference is worse than a loud one.',
          'A **translator** rewrites text. 10 dialects, 3 engines ran, and 7 were translated, not run. A parsed translation is not a tested one.',
          'In the matrix a translated try_cast **stopped PostgreSQL** and made SQLite return **12 for 12x**. Run it on the target and compare the rows.',
          'A **data quality check** is a query that returns the number of bad rows. The scorecard had 11 checks: 7 passed and 4 failed.',
          'Put checks at **each layer**: source, staging, joins, marts, dashboards. Decide the **severity** when you write the check.',
          '`count(column)` **skips NULL** and reported 0 for a missing id while `count(*)` reported 1. Prove every check on bad data.'
        ],
        lines: [
          'I run a translated query on the target and compare the rows.',
          'I say "translated, not run" when I did not run it.',
          'I make every new check fail once, on purpose.'
        ]
      })
    ]
  });
})();
