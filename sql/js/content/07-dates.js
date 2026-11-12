/* Mission 7: dates, time zones, strings, JSON and arrays. Types, buckets, parts, arithmetic, half-open ranges, time zones and daylight saving, string functions, collation,
   JSON paths, flattening and arrays. The three engines often need three spellings, so most scenes show the spelling that ran and the recording says that the others returned the same rows. */
(function () {
  var B = LAB.b, G = LAB.get;
  function inFile(key, text) { return G.file(key).indexOf(text) >= 0; }
  function cells(t, col) { var i = t.cols.indexOf(col); return t.rows.map(function (r) { return r[i]; }).join(); }
  function eqRows(a, b, n) { return JSON.stringify(a.rows.map(function (r) { return r.map(function (c) { return String(c).slice(0, n || 99); }); })) === JSON.stringify(b.rows.map(function (r) { return r.map(function (c) { return String(c).slice(0, n || 99); }); })); }
  function num(t) { return JSON.stringify(t.rows.map(function (r) { return r.map(function (c) { return isNaN(parseFloat(c)) || /[-:]/.test(c) && !/^-?\d/.test(c) ? c : /^\d{4}-/.test(c) ? c : String(parseFloat(c)); }); })); }
  var TR = G.on('m7.trunc', 'duckdb'), TRP = G.on('m7.trunc', 'postgres'), TRS = G.table('m7.trunc_sqlite');
  var PA = G.on('m7.parts', 'duckdb'), PAP = G.on('m7.parts', 'postgres'), PAS = G.table('m7.parts_sqlite');
  var AD = G.table('m7.arith_duckdb'), AP = G.table('m7.arith_postgres'), AS = G.table('m7.arith_sqlite');
  var ME = G.on('m7.month_end', 'duckdb'), MEP = G.on('m7.month_end', 'postgres'), MES = G.table('m7.month_end_sqlite');
  var SH = G.on('m7.shift', 'duckdb'), SHP = G.on('m7.shift', 'postgres');
  var TL = G.on('m7.tz_local', 'duckdb'), TLP = G.on('m7.tz_local', 'postgres'), TD = G.on('m7.tz_day', 'duckdb'), TDP = G.on('m7.tz_day', 'postgres'), TS = G.table('m7.tz_sqlite'), TSE = G.text('m7.tz_sqlite_error.error');
  var DS = G.on('m7.dst_spring', 'duckdb'), DSP = G.on('m7.dst_spring', 'postgres'), DF = G.on('m7.dst_fall', 'duckdb'), DFP = G.on('m7.dst_fall', 'postgres');
  var FM = G.table('m7.fmt'), FMP = G.table('m7.fmt_postgres'), FMS = G.table('m7.fmt_sqlite');
  var ST = G.on('m7.strings', 'duckdb'), DO = G.on('m7.domain', 'duckdb'), DOP = G.on('m7.domain', 'postgres'), DOS = G.table('m7.domain_sqlite');
  var RX = G.on('m7.regex', 'duckdb'), RXP = G.on('m7.regex', 'postgres'), RXE = G.text('m7.regex.sqlite.error');
  var BY = G.table('m7.bytes_duckdb'), BYP = G.on('m7.bytes', 'postgres'), BYS = G.on('m7.bytes', 'sqlite');
  var CO = G.on('m7.collation', 'duckdb'), COP = G.on('m7.collation', 'postgres'), COS = G.on('m7.collation', 'sqlite'), COI = G.table('m7.collation_icu'), COE = G.table('m7.collation_en');
  var CN = G.on('m7.collation_nocase', 'duckdb'), CNS = G.on('m7.collation_nocase', 'sqlite');
  var JD = G.on('m7.json_data', 'duckdb'), JFD = G.table('m7.json_fields_duckdb'), JFP = G.table('m7.json_fields_postgres'), JFS = G.table('m7.json_fields_sqlite');
  var JLD = G.table('m7.json_flat_duckdb'), JLP = G.table('m7.json_flat_postgres'), JLS = G.table('m7.json_flat_sqlite');
  var JKD = G.table('m7.json_flat_left_duckdb'), JKP = G.table('m7.json_flat_left_postgres'), JKS = G.table('m7.json_flat_left_sqlite');
  var AAD = G.table('m7.arrays_duckdb'), AAP = G.table('m7.arrays_postgres'), AAS = G.table('m7.arrays_sqlite');
  var BJ = G.table('m7.bug_json').rows[0][0], BJF = G.table('m7.bug_json_fix').rows[0][0];
  var PGL = G.table('m7.pg_locale').rows[0][0];
  var SESS = G.counts('m7.session_tz'), BK = G.counts('m7.buckets'), PR = G.counts('m7.plan.rows');
  var P = { pg_func: G.text('m7.plan.pg_func'), pg_range: G.text('m7.plan.pg_range'), duck_func: G.text('m7.plan.duck_func'), duck_range: G.text('m7.plan.duck_range') };
  function cm(t) { return t.split('\n').map(function (l) { return '-- ' + l; }).join('\n'); }
  var PLAN_DAY = [cm(G.file('m7.plan.func')), '-- PostgreSQL ' + G.meta('postgres') + ' with an index on order_ts', P.pg_func, '', cm(G.file('m7.plan.range')), P.pg_range, '', '-- DuckDB ' + G.meta('duckdb') + ', the cast form', P.duck_func, '', '-- DuckDB, the range form', P.duck_range].join('\n');

  G.expect(TR.rows.length === 3 && TR.rows[0].join() === '2026-02-23 00:00:00,1,11.50' && TR.rows[1].slice(1).join() === '10,136.50' && eqRows(TR, TRP) && TRS.rows.map(function (r) { return r[0] + ',' + r[1]; }).join() === '2026-02-23,1,2026-03-02,10,2026-03-09,1', 'weekly orders: 1, 10 and 1, in the weeks of 23 February, 2 March and 9 March, on all three engines');
  G.expect(PA.rows[0].slice(2).join() === '7,0,9' && PA.rows[1].slice(2).join() === '2,2,10' && eqRows(PA, PAP) && PAS.rows[0].slice(2).join() === '7,0,9,8' && PAS.rows[1].slice(2).join() === '2,2,10,9', 'order 1001 is isodow 7, dow 0, ISO week 9, and SQLite %W says 8');
  G.expect(eqRows(AD, AP) && eqRows(AD, AS) && AD.rows.length === 10 && AD.rows[1].join() === '1002,1,2' && AD.rows[6].join() === '1008,1,280', 'payments came 1 minute after the order, 1002 had a second at 2 and 1008 a refund at 280, on all three engines');
  G.expect(ME.rows[0].join() === '2026-02-28,2026-02-28' && MEP.rows[0].join() === '2026-02-28,2026-02-28' && MES.rows[0].join() === '2026-03-03,2026-03-03', 'one month from the end of a month: 28 February on DuckDB and PostgreSQL, 3 March on SQLite');
  G.expect(SH.rows[0].slice(2).join() === '2026-03-08 02:15:00,2026-03-08' && eqRows(SH, SHP), 'adding 7 days');
  G.expect(TL.rows.length === 12 && eqRows(TL, TLP) && TL.rows[2].slice(3).join() === '2026-03-02 16:30:00,2026-03-03 00:30:00' && TL.rows[5].slice(3).join() === '2026-03-04 21:10:00,2026-03-05 08:10:00', 'order 1003 is 00:30 on 3 March in Kuala Lumpur and 1006 is 08:10 on 5 March in Sydney');
  G.expect(cells(TD, 'order_id') === '1003,1004,1006' && eqRows(TD, TDP), 'three orders change their calendar day in the store time zone');
  G.expect(TS.rows.length === 5 && TS.rows[2].join() === '1004,2026-03-02 23:50:00,2026-03-03 07:50:00' && /syntax error/.test(TSE), 'SQLite adds fixed hours and has no AT TIME ZONE');
  G.expect(DS.rows.map(function (r) { return r[1].slice(11, 16); }).join() === '00:00,01:00,03:00,04:00,05:00' && DF.rows.map(function (r) { return r[1].slice(11, 16); }).join() === '00:00,01:00,01:00,02:00,03:00' && eqRows(DS, DSP) && eqRows(DF, DFP), 'Los Angeles skips 02:00 in spring and repeats 01:00 in autumn');
  G.expect(FM.rows[0].join() === '2026-03-01 02:15,2026-03' && eqRows(FM, FMP) && eqRows(FM, FMS) && inFile('m7.fmt', "strftime(order_ts, '%Y-%m')") && inFile('m7.fmt_postgres', "to_char(order_ts, 'YYYY-MM')") && inFile('m7.fmt_sqlite', "strftime('%Y-%m', order_ts)"), 'the three spellings of a month text');
  G.expect(ST.rows.length === 8 && ST.rows[0].slice(2).join() === 'ANA LIM,7,Ana,ana.lim' && num(ST) === num(G.on('m7.strings', 'postgres')) && num(ST) === num(G.on('m7.strings', 'sqlite')), 'string functions agree on the three engines');
  G.expect(eqRows(DO, DOP) && eqRows(DO, DOS) && inFile('m7.domain', "split_part(email, '@', 2)") && inFile('m7.domain_sqlite', "substr(email, instr(email, '@') + 1)") && DO.rows[1][2] === 'NULL', 'the email domain, with NULL for a missing email, in two spellings');
  G.expect(RX.rows[2][1] === 'Ch*n W**' && eqRows(RX, RXP) && /no such function: regexp_replace/.test(RXE), 'regexp_replace works on DuckDB and PostgreSQL and SQLite has no such function');
  G.expect(BY.rows[0].join() === 'Zoë,3,4' && BYP.rows[0].join() === 'Zoë,3,4' && BYS.rows[0].join() === 'Zoë,3,4', 'Zoë is 3 characters and 4 bytes');
  G.expect(cells(CO, 'word') === 'Apple,Banana,apple,banana,cherry,Éclair' && cells(COP, 'word') === cells(CO, 'word') && cells(COS, 'word') === cells(CO, 'word') && cells(COI, 'word') === 'apple,Apple,banana,Banana,cherry,Éclair' && cells(COE, 'word') === cells(COI, 'word') && cells(CN, 'word') === 'Apple,apple,Banana,banana,cherry,Éclair' && cells(CNS, 'word') === cells(CN, 'word'), 'binary order on all three, linguistic order with ICU, and NOCASE');
  G.expect(JD.rows.length === 4 && JFD.rows[0].join() === '1,ios,NULL,2' && JFD.rows[2].join() === '3,web,NULL,0' && JFD.rows[3].join() === '4,ios,NULL,NULL' && eqRows(JFD, JFP) && eqRows(JFD, JFS) && inFile('m7.json_fields_duckdb', "payload ->> '$.device'") && inFile('m7.json_fields_postgres', "payload::jsonb ->> 'device'") && inFile('m7.json_fields_sqlite', "json_extract(payload, '$.device')"), 'JSON fields read the same on three engines: null and a missing key are both NULL');
  G.expect(JLD.rows.length === 3 && eqRows(JLD, JLP) && eqRows(JLD, JLS) && JKD.rows.length === 5 && eqRows(JKD, JKP) && eqRows(JKD, JKS) && JKD.rows[3].join() === '3,NULL,NULL', 'flattening gives 3 rows and 5 with a LEFT JOIN, on all three engines');
  G.expect(AAD.rows[0].join() === '1001,[Espresso, Latte],2,true' && eqRows(AAD, AAP) && AAS.rows[0][1] === '["Espresso","Latte"]' && BJ === '2' && BJF === '4', 'arrays collect the products of an order, and the CROSS JOIN LATERAL flatten counts 2 sessions where the LEFT JOIN counts 4');
  G.expect(PGL === 'C.UTF-8', 'the recorded PostgreSQL database has the C.UTF-8 collation');
  G.expect(SESS.duckdb['America/Los_Angeles'] === '2026-02-28 18:15:00-08' && SESS.postgres.UTC === '2026-03-01 02:15:00+00' && SESS.postgres['Asia/Singapore'] === '2026-03-01 10:15:00+08', 'the same instant in three session time zones');
  G.expect(BK.combos['America/Los_Angeles|month'].groups[0].join() === '2026-02-01,1,11.50' && BK.combos['Asia/Singapore|day'].engines.join() === 'duckdb,postgres,sqlite' && BK.combos['Australia/Sydney|day'].engines.join() === 'duckdb,postgres', 'in Los Angeles order 1001 belongs to February, and SQLite only ran UTC and Singapore');
  G.expect(/Seq Scan on big_orders/.test(P.pg_func) && /Rows Removed by Filter: 29669/.test(P.pg_func) && /Bitmap Index Scan on big_orders_ts/.test(P.pg_range) && /scanned 30000, rows 331/.test(P.duck_func) && /scanned 30000, rows 331/.test(P.duck_range) && PR.postgres.join() === '331,331' && PR.duckdb.join() === '331,331', 'a cast blocks the index on PostgreSQL, the range uses it, and DuckDB plans both the same');

  var TRUNC = G.file('m7.trunc'), PARTS = G.file('m7.parts'), ARITH = G.file('m7.arith_duckdb'), MONTH = G.file('m7.month_end'), SHIFT = G.file('m7.shift'), TZL = G.file('m7.tz_local'), TZD = G.file('m7.tz_day');
  var TZS = G.file('m7.tz_sqlite'), DSQ = G.file('m7.dst_spring'), DFQ = G.file('m7.dst_fall'), STR = G.file('m7.strings'), RXQ = G.file('m7.regex'), BYQ = G.file('m7.bytes_duckdb'), COQ = G.file('m7.collation');
  var JDQ = G.file('m7.json_data'), JFQ = G.file('m7.json_fields_duckdb'), JLQ = G.file('m7.json_flat_duckdb'), JKQ = G.file('m7.json_flat_left_duckdb'), AAQ = G.file('m7.arrays_duckdb');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Dates, strings and JSON', short: 'Dates', blurb: 'Time types, time zones and daylight saving, half-open ranges, string functions, collation, JSON paths and arrays', minutes: 55,
    focus: ['stg', 'int'],
    goals: [
      'Pick between **DATE, TIMESTAMP and TIMESTAMPTZ**, and say which time zone a report uses.',
      'Cut timestamps into **day, week and month buckets**, and filter a day with a **half-open range**.',
      'Convert UTC instants to **local days**, and know what daylight saving does to an hour.',
      'Use string functions and know what **collation** and **bytes** do.',
      'Read **JSON** and **arrays**, flatten them into rows, and keep the rows with no items.'
    ],
    say: 'Mission 7 is where engines stop agreeing. Dates, strings and JSON each have three spellings in our three engines. I ran the same task on each one, and the recording says where the answers match and where they do not. Pay most attention to time zones: a wrong day in a report is the bug that finance finds first.',
    scenes: [
      B.talk({
        id: 'm7-what', t: 1, src: 'docs', title: 'Where engines stop agreeing',
        say: 'Press Next for six ideas about dates, strings and JSON.',
        items: [
          ['Dates and times come in three types', '`DATE` is a calendar day. `TIMESTAMP` is a day and a clock time with no time zone. `TIMESTAMPTZ` is an instant: stored in UTC and shown in the time zone of the session.', 'Day, wall clock, instant.'],
          ['A day depends on the time zone', 'One order can fall on 2 March in UTC and on 3 March in Kuala Lumpur. A report has to choose its time zone on purpose.', 'Say which time zone.'],
          ['Buckets and ranges', '`date_trunc` cuts a timestamp down to its day, week or month. To filter a day, compare with a half-open range: at least the start, and below the start of the next day.', 'Half-open ranges.'],
          ['Strings are bytes with rules', 'Length in characters and in bytes can differ. Sorting follows a collation. Case rules and regular expressions depend on the engine.', 'Characters, bytes, order.'],
          ['JSON and arrays hold nested data', 'Engines read a JSON text with path expressions and flatten arrays into rows. Flattening works like a join: an empty array gives no rows, unless you keep them.', 'Paths, then rows.'],
          ['The spellings differ most here', 'DuckDB and PostgreSQL share `extract`, `date_trunc` and `AT TIME ZONE`. SQLite differs on almost everything. In this mission each task ran on each engine, and the recording says whether the rows matched.', 'Same task, three spellings.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm7-types', t: 1, src: 'docs', title: 'DATE, TIMESTAMP, TIMESTAMPTZ and text',
        say: 'Four ways to hold a time. Press Next for each one.',
        cols: ['Type', 'It holds', 'Time zone', 'Use it for'],
        hl: 2,
        rows: [
          ['DATE', 'A calendar day', 'None', 'Signup day, birthday, a daily partition'],
          ['TIMESTAMP', 'A day and a clock time', 'None. You must know which zone it is in', 'A wall clock time, or UTC times that you keep in UTC by rule'],
          ['TIMESTAMPTZ', 'An instant', 'Stored as UTC, shown in the session time zone', 'Events from several places'],
          ['Text', 'Characters such as 2026-03-01', 'None', 'Raw data that you have not parsed yet. SQLite stores dates this way']
        ],
        steps: [
          { upto: 1, say: 'DATE has no time of day, so it cannot be wrong by a time zone. It is the right type for a day.' },
          { upto: 2, say: 'TIMESTAMP is the dangerous one. Two columns of this type can hold different zones and nothing tells you.' },
          { upto: 3, say: 'TIMESTAMPTZ stores an instant. The session time zone only changes how it is displayed.' },
          { upto: 4, say: 'Text sorts as text and can hold anything, including 2026-02-31. Parse it early.' }
        ],
        pick: 'Store instants as UTC. Convert to a local day only when you report.'
      }),

      B.cmp({
        id: 'm7-tz-display', t: 2, src: 'rec', title: 'One instant, three session time zones',
        say: 'The recorder set the session time zone and printed the same TIMESTAMPTZ. Press Next for each zone.',
        cols: ['Session time zone', 'DuckDB ' + G.meta('duckdb'), 'PostgreSQL ' + G.meta('postgres')],
        hl: 1,
        rows: ['UTC', 'Asia/Singapore', 'America/Los_Angeles'].map(function (z) { return [z, SESS.duckdb[z], SESS.postgres[z]]; }),
        steps: [
          { upto: 1, say: 'The instant is 2026-03-01 02:15 UTC. In UTC it prints as it is, with +00.' },
          { upto: 2, say: 'In Singapore it prints as 10:15 with +08. It is the same instant.' },
          { upto: 3, say: 'In Los Angeles it prints as 18:15 on 28 February with -08. The calendar month changed, with no change to the stored value.' }
        ],
        pick: 'The stored instant never changes. The session time zone decides how it looks.'
      }),

      B.sql({
        id: 'm7-trunc', t: 1, src: 'rec', title: 'date_trunc: weekly buckets', file: 'weekly.sql', code: TRUNC, ctx: G.ctx('duckdb'),
        result: res('m7.trunc', 'duckdb'),
        steps: [
          { say: 'Weekly revenue. `date_trunc` cuts a timestamp down to the start of its day, week or month, and you group by the result.' },
          { say: '`date_trunc(\'week\', order_ts)` returns the Monday of the week, at midnight.', lines: G.span(TRUNC, /date_trunc\('week', order_ts\) AS week_start/) },
          { say: 'Run it. Three weeks. Order 1001 was placed on Sunday 1 March, so it belongs to the week that started on 23 February: 1 order, 11.50. The week of 2 March has 10 orders and 136.50. DuckDB and PostgreSQL gave the same rows. SQLite has no `date_trunc`. Its form `date(order_ts, \'weekday 0\', \'-6 days\')` gave the same three weeks.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-parts', t: 1, src: 'rec', title: 'extract: the parts of a timestamp', file: 'parts.sql', code: PARTS, ctx: G.ctx('duckdb'),
        result: res('m7.parts', 'duckdb'),
        steps: [
          { say: '`extract` pulls one part out of a timestamp. Weekday numbers are a trap: Sunday is 0 in `dow` and 7 in `isodow`.' },
          { say: 'Both weekday numbers and the ISO week number are asked for here.', lines: G.span(PARTS, /extract\(isodow/, /extract\(week/) },
          { say: 'Run it. Order 1001 was placed on a Sunday: isodow 7, dow 0, and ISO week 9. Order 1002 on Tuesday 3 March is in ISO week 10. SQLite has no `extract`. With `strftime`, `%V` gave ISO week 9 for order 1001, but `%W` (weeks counted from the first Monday of the year) gave 8 for the same day. Say which week number you mean.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-arith', t: 1, src: 'rec', title: 'Time between two timestamps', file: 'payment_delay.sql', code: ARITH, ctx: G.ctx('duckdb'),
        result: res('m7.arith_duckdb'),
        steps: [
          { say: 'How long did a payment take after the order? Time arithmetic has a different spelling on each engine.' },
          { say: 'On DuckDB `date_diff(\'minute\', start, end)` counts the minutes between two timestamps.', lines: G.span(ARITH, /date_diff\('minute', o.order_ts, min/) },
          { say: 'Run it. Every first payment came 1 minute after the order. Order 1002 had a second payment after 2 minutes, and order 1008 had a refund after 280 minutes. PostgreSQL subtracts the timestamps and uses `extract(epoch FROM ...) / 60`. SQLite uses `julianday`. All three returned the same ten rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-shift', t: 1, src: 'rec', title: 'Adding days: a timestamp and a date', file: 'refund_deadline.sql', code: SHIFT, ctx: G.ctx('duckdb'),
        result: res('m7.shift', 'duckdb'),
        steps: [
          { say: 'Refunds are allowed for 7 days. Adding an interval to a timestamp keeps the time of day. Adding a number to a date gives a date.' },
          { say: 'The first column adds an interval. The second casts to a date first and adds 7.', lines: G.span(SHIFT, /INTERVAL '7 days'/, /refund_deadline_day/) },
          { say: 'Run it. Order 1001 can be refunded until 2026-03-08 02:15:00, or simply until the day 2026-03-08. DuckDB and PostgreSQL returned the same rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-month-end', t: 2, src: 'rec', title: 'One month from the end of a month', file: 'month_end.sql', code: MONTH, ctx: G.ctx('duckdb'),
        result: res('m7.month_end', 'duckdb'),
        steps: [
          { say: 'Adding a month is not adding 30 days. What is 31 January plus one month, and 31 March minus one month?' },
          { say: 'DuckDB and PostgreSQL clamp to the last day of the shorter month: 28 February in both cases.', lines: G.span(MONTH, /INTERVAL '1 month'/, /minus_one_month/) },
          { say: 'Run it. SQLite gave 2026-03-03 for both. It counts 31 days into February and overflows into March. The same question gave a different date. Test month arithmetic at the end of a month.', run: true }
        ]
      }),

      B.cmp({
        id: 'm7-fmt', t: 1, src: 'rec', title: 'A timestamp as text: three spellings',
        say: 'The same text for order 1001, from three engines. Press Next for each.',
        cols: ['Engine', 'The call', 'Result'],
        hl: 1,
        rows: [
          ['DuckDB', "strftime(order_ts, '%Y-%m')", FM.rows[0][1]],
          ['PostgreSQL', "to_char(order_ts, 'YYYY-MM')", FMP.rows[0][1]],
          ['SQLite', "strftime('%Y-%m', order_ts)", FMS.rows[0][1]]
        ],
        steps: [
          { upto: 1, say: 'DuckDB takes the timestamp first and the format second, with codes such as `%Y`.' },
          { upto: 2, say: 'PostgreSQL uses `to_char` with its own patterns, such as `YYYY`.' },
          { upto: 3, say: 'SQLite also has `strftime`, with the arguments in the other order: format first. All three returned 2026-03.' }
        ],
        pick: 'The same function name can take its arguments in a different order. Read the manual of the engine.'
      }),

      B.code({
        id: 'm7-halfopen', t: 2, src: 'rec', title: 'One day: a cast or a half-open range', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres') + ' and DuckDB ' + G.meta('duckdb'), lang: 'text', code: PLAN_DAY,
        steps: [
          { say: 'Two ways to ask for the orders of one day, on 30,000 orders. Both return ' + PR.postgres[0] + '. The first wraps the column in a cast. The second compares the column with a half-open range: at least the start of the day, and below the start of the next day.' },
          { say: 'PostgreSQL has an index on `order_ts`, and it cannot use it for the cast. It scans all 30,000 rows and throws away 29,669.', lines: G.span(PLAN_DAY, /^Aggregate/, /Rows Removed by Filter: 29669/) },
          { say: 'With the range, PostgreSQL uses the index. A bitmap index scan finds the 331 rows without reading the rest.', lines: G.span(PLAN_DAY, /Bitmap Heap Scan/, /Index Cond/) },
          { say: 'DuckDB has no index here. Its optimizer rewrote the cast into the same range filter, so both forms show the same plan and the same scan.', lines: G.span(PLAN_DAY, /the cast form/, /scanned 30000, rows 331/) }
        ],
        note: 'One day, one data set, one version of each engine. A function on a column blocks an index on one engine and not on another. The range is exact and works on every engine. BETWEEN with an end of 23:59:59 would miss the last second.'
      }),

      B.sql({
        id: 'm7-tz-local', t: 2, src: 'rec', title: 'UTC to the local time of the store', file: 'local_time.sql', code: TZL, ctx: G.ctx('duckdb'),
        result: res('m7.tz_local', 'duckdb'),
        steps: [
          { say: 'Orders are stored in UTC, and each store works in its own time zone. A small VALUES table maps a store to a zone name.' },
          { say: 'Two steps. `AT TIME ZONE \'UTC\'` says that the stored timestamp is a UTC instant. The second `AT TIME ZONE` turns that instant into the wall clock of the store.', lines: G.span(TZL, /o.order_ts AT TIME ZONE/, /AT TIME ZONE z.tz/) },
          { say: 'Run it. Order 1003 was placed at 16:30 UTC, and it was 00:30 the next day in Kuala Lumpur. Order 1006 at 21:10 UTC was 08:10 the next morning in Sydney, which is UTC+11 in March. DuckDB and PostgreSQL returned identical rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-tz-day', t: 2, src: 'rec', title: 'Which orders change their day?', file: 'day_changes.sql', code: TZD, ctx: G.ctx('duckdb'),
        result: res('m7.tz_day', 'duckdb'),
        steps: [
          { say: 'Compare the UTC day with the local day of each order, and keep the orders where they differ.' },
          { say: 'Both days are cut with a cast to DATE, one before and one after the conversion.', lines: G.span(TZD, /CAST\(o.order_ts AS DATE\) AS utc_day/, /AS local_day/) },
          { say: 'Run it. Three of the 12 orders change their day: 1003, 1004 and 1006. A daily report by the UTC date puts each of them one day early. A store report should use the day of the store.', run: true }
        ]
      }),

      B.bug({
        id: 'm7-bug-day', t: 2, title: 'Bug hunt: the day the shop was closed',
        q: 'The Kuala Lumpur store says it took no order on 2 March. The daily report shows one. Click the line that puts the order on the wrong day.',
        file: 'daily_orders.sql', lang: 'sql',
        code: ['SELECT store_id, CAST(order_ts AS DATE) AS day, count(*) AS orders', 'FROM orders', 'WHERE store_id = 2', 'GROUP BY store_id, CAST(order_ts AS DATE)', 'ORDER BY day;'].join('\n'),
        bad: [1, 4], hint: 'In which time zone is order_ts, and where does the report cut the day?',
        why: 'The column holds UTC. Casting it to a date cuts the day at UTC midnight, so order 1003 (16:30 UTC) is on 2 March, and in Kuala Lumpur it was 00:30 on 3 March. Convert to the zone of the store first, then cut the day.',
        fix: ["SELECT store_id, CAST((order_ts AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur' AS DATE) AS day, count(*) AS orders", 'FROM orders', 'WHERE store_id = 2', "GROUP BY store_id, CAST((order_ts AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur' AS DATE)", 'ORDER BY day;'].join('\n'),
        cheer: 'A day always has a time zone, even when the query does not say it.'
      }),

      B.widget({ id: 'm7-lab-bucket', kind: 'bucket', t: 2, src: 'rec', title: 'Lab: where does each order land?' }),

      B.sql({
        id: 'm7-sqlite-tz', t: 2, src: 'rec', title: 'SQLite: fixed hours only', file: 'singapore_time.sql', code: TZS, ctx: G.ctx('sqlite'),
        result: res('m7.tz_sqlite'),
        steps: [
          { say: 'SQLite has no time zone names. It can add a fixed number of hours, which is enough for Singapore, because Singapore has no daylight saving time.' },
          { say: '`datetime(order_ts, \'+8 hours\')` shifts the timestamp by 8 hours.', lines: G.span(TZS, /datetime\(order_ts, '\+8 hours'\)/) },
          { say: 'Run it on SQLite. The local times of store 1 are the same as DuckDB and PostgreSQL returned. `AT TIME ZONE` is not SQLite syntax. It stops with: ' + TSE + '. For Sydney or Los Angeles a fixed offset is wrong whenever daylight saving changes.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-dst-spring', t: 3, src: 'rec', title: 'Daylight saving: the hour that does not exist', file: 'dst_spring.sql', code: DSQ, ctx: G.ctx('duckdb'),
        result: res('m7.dst_spring', 'duckdb'),
        steps: [
          { say: 'On 8 March 2026 the clocks in Los Angeles jump forward. A recursive CTE from mission 5 makes five UTC hours, and `AT TIME ZONE` converts them.' },
          { say: 'Run it. 09:00 UTC is 01:00 in Los Angeles and 10:00 UTC is 03:00. There is no 02:00 that day: a local day has 23 hours. DuckDB and PostgreSQL gave the same rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-dst-fall', t: 3, src: 'rec', title: 'Daylight saving: the hour that happens twice', file: 'dst_fall.sql', code: DFQ, ctx: G.ctx('duckdb'),
        result: res('m7.dst_fall', 'duckdb'),
        steps: [
          { say: 'On 1 November 2026 the clocks go back. The same query, for the five UTC hours around the change.' },
          { say: 'Run it. 08:00 UTC and 09:00 UTC are both 01:00 in Los Angeles. The local hour 01:00 happens twice, and a local day has 25 hours. Store instants in UTC and convert only for display, so that no hour is lost or doubled.', run: true }
        ]
      }),

      B.quiz({
        id: 'm7-q-week', t: 1, q: 'Order 1001 was placed on a Sunday. What do `extract(dow FROM order_ts)` and `extract(isodow FROM order_ts)` return?',
        opts: [
          { t: '0 and 7', fb: '' },
          { t: '7 and 0', fb: 'It is the other way round. Plain `dow` counts Sunday as 0.' },
          { t: '1 and 7', fb: 'Neither function numbers Sunday as 1 here. `dow` starts at 0 on Sunday.' },
          { t: '0 and 0', fb: '`isodow` counts Monday as 1 and Sunday as 7, so it is not 0.' }
        ],
        ok: 0, why: '`dow` runs from 0 (Sunday) to 6. `isodow` follows ISO 8601: Monday is 1 and Sunday is 7. The recording returned 0 and 7 for order 1001 on DuckDB and PostgreSQL.'
      }),

      B.quiz({
        id: 'm7-q-halfopen', t: 2, q: 'Which filter returns every order of 10 February, exactly, and lets an index on `order_ts` work?',
        opts: [
          { t: "order_ts BETWEEN '2026-02-10' AND '2026-02-10 23:59:59'", fb: 'It misses orders in the last second, such as 23:59:59.5.' },
          { t: "order_ts >= '2026-02-10' AND order_ts < '2026-02-11'", fb: '' },
          { t: "CAST(order_ts AS DATE) = '2026-02-10'", fb: 'It is correct, but in the recording PostgreSQL could not use the index for it and scanned all 30,000 rows.' },
          { t: "order_ts = '2026-02-10'", fb: 'It matches only the orders at exactly midnight.' }
        ],
        ok: 1, why: 'A half-open range takes everything from the start of the day up to, but not including, the start of the next day. It is exact for any precision, and it compares the bare column, so PostgreSQL used the index: a bitmap index scan found the 331 rows.'
      }),

      B.sql({
        id: 'm7-strings', t: 1, src: 'rec', title: 'String functions', file: 'strings.sql', code: STR, ctx: G.ctx('duckdb'),
        result: res('m7.strings', 'duckdb'),
        steps: [
          { say: 'Five string functions that every engine here has under the same name: `upper`, `length`, `substr`, `replace` and `lower`.' },
          { say: 'Run it. `substr(name, 1, 3)` starts at position 1, because SQL strings count from 1. `length` counts characters. The handle of Ana Lim is `ana.lim`. DuckDB, PostgreSQL and SQLite returned the same values.', run: true }
        ]
      }),

      B.cmp({
        id: 'm7-split', t: 1, src: 'rec', title: 'The domain of an email: two spellings',
        say: 'Cutting a string at a character has no common function. Press Next for each spelling.',
        cols: ['Engine', 'The call', 'Ana Lim', 'Ben Ortiz (no email)'],
        hl: 1,
        rows: [
          ['DuckDB and PostgreSQL', "split_part(email, '@', 2)", DO.rows[0][2], DO.rows[1][2]],
          ['SQLite', "substr(email, instr(email, '@') + 1)", DOS.rows[0][2], DOS.rows[1][2]]
        ],
        steps: [
          { upto: 1, say: '`split_part` cuts the text at each `@` and returns the 2nd piece. DuckDB and PostgreSQL both have it.' },
          { upto: 2, say: 'SQLite has no `split_part`. It finds the position of `@` with `instr` and takes the rest with `substr`. Both spellings returned NULL for a missing email.' }
        ],
        pick: 'A function on NULL returns NULL. Decide what a missing value should show, for example with coalesce.'
      }),

      B.sql({
        id: 'm7-regex', t: 2, src: 'rec', title: 'Regular expressions', file: 'mask_vowels.sql', code: RXQ, ctx: G.ctx('duckdb'),
        result: res('m7.regex', 'duckdb'),
        steps: [
          { say: '`regexp_replace` replaces what a pattern matches. The fourth argument `\'g\'` means all matches. Without it only the first match is replaced.' },
          { say: 'Run it. Every vowel became a star: Chen Wei is Ch*n W**. DuckDB and PostgreSQL returned the same rows. SQLite stopped with: ' + RXE + '.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-bytes', t: 2, src: 'rec', title: 'Characters and bytes', file: 'bytes.sql', code: BYQ, ctx: G.ctx('duckdb'),
        result: res('m7.bytes_duckdb'),
        steps: [
          { say: 'The text Zoë has 3 characters. In UTF-8 the letter ë takes 2 bytes. `length` counts characters. A byte count has another name on each engine.' },
          { say: 'Run it. 3 characters and 4 bytes. DuckDB calls the byte count `strlen`. PostgreSQL and SQLite call it `octet_length` and returned 3 and 4 as well. A column limit in bytes and a check in characters can disagree for names with accents.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-collation', t: 2, src: 'rec', title: 'Sort order: collation', file: 'sort_words.sql', code: COQ, ctx: G.ctx('duckdb'),
        result: res('m7.collation', 'duckdb'),
        steps: [
          { say: 'Six words with mixed case and one accent. The sort order of text is set by a collation: a rule for which character comes first.' },
          { say: 'Run it. All three engines gave the binary order: Apple, Banana, then apple, banana, cherry, and Éclair last. Capitals come before lowercase, and the accented letter comes after z. The PostgreSQL database of this recording has the collation ' + PGL + ', which sorts this way.', run: true }
        ],
        note: 'A linguistic collation gave apple, Apple, banana, Banana, cherry, Éclair: DuckDB with COLLATE en, and PostgreSQL with COLLATE "und-x-icu". COLLATE NOCASE with the word as a tie-breaker gave Apple, apple, Banana, banana, cherry, Éclair on DuckDB and on SQLite.'
      }),

      B.sql({
        id: 'm7-json-data', t: 2, src: 'rec', title: 'JSON in a text column', file: 'app_events.sql', code: JDQ, ctx: G.ctx('duckdb'),
        result: res('m7.json_data', 'duckdb'),
        steps: [
          { say: 'Raw events often arrive as JSON text. Four sessions of the Brewline app, each with a cart. A session can have items, no items, or no cart at all.' },
          { say: 'Run it. Event 1 has a coupon with the JSON value null. Event 3 has an empty list of items. Event 4 has no cart key at all. Three different "nothing" cases, and all of them will matter.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-json-fields', t: 2, src: 'rec', title: 'Read fields with a path', file: 'json_fields.sql', code: JFQ, ctx: G.ctx('duckdb'),
        result: res('m7.json_fields_duckdb'),
        steps: [
          { say: 'A path such as `$.cart.coupon` walks into the JSON. `->>` returns the value as text.', lines: G.span(JFQ, /payload ->> '\$.device'/, /payload ->> '\$.cart.coupon'/) },
          { say: '`json_array_length` counts the items of an array at a path.', lines: G.span(JFQ, /json_array_length/) },
          { say: 'Run it. A JSON null (event 1) and a missing key (events 3 and 4) both come back as SQL NULL. The empty cart of event 3 has length 0, and event 4, which has no cart, has NULL. PostgreSQL and SQLite use other spellings and returned the same four rows.', run: true }
        ]
      }),

      B.cmp({
        id: 'm7-json-spell', t: 2, src: 'rec', title: 'The same JSON read, three spellings',
        say: 'Each engine ran its own spelling and returned the same four rows. Press Next for each.',
        cols: ['Engine', 'A field', 'The length of an array'],
        hl: 1,
        rows: [
          ['DuckDB', "payload ->> '$.device'", "json_array_length(payload, '$.cart.items')"],
          ['PostgreSQL', "payload::jsonb ->> 'device'", "jsonb_array_length(payload::jsonb #> '{cart,items}')"],
          ['SQLite', "json_extract(payload, '$.device')", "json_array_length(payload, '$.cart.items')"]
        ],
        steps: [
          { upto: 1, say: 'DuckDB uses a path string with `$`, and `->>` for text.' },
          { upto: 2, say: 'PostgreSQL needs the text cast to `jsonb` first. It walks keys with `->>` for a field, and with `#>` and a list of keys for a nested value.' },
          { upto: 3, say: 'SQLite has `json_extract` with the same `$` paths as DuckDB.' }
        ],
        pick: 'Store JSON in a typed column when the engine has one, and cast once. Then every query reads the same way.'
      }),

      B.sql({
        id: 'm7-json-flat', t: 2, src: 'rec', title: 'Flatten an array into rows', file: 'json_flatten.sql', code: JLQ, ctx: G.ctx('duckdb'),
        result: res('m7.json_flat_duckdb'),
        steps: [
          { say: 'To count products you need one row for each item. `unnest` turns each element of the array into a row.' },
          { say: '`from_json` reads the items into a list of records, and `unnest` makes one row for each record.', lines: G.span(JLQ, /unnest\(from_json/) },
          { say: 'Run it. Three rows: two items of event 1 and one of event 2. Events 3 and 4 are gone. Flattening works like an inner join: no items, no rows. PostgreSQL (`jsonb_array_elements`) and SQLite (`json_each`) returned the same three rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm7-json-left', t: 2, src: 'rec', title: 'Keep the sessions with no items', file: 'json_flatten_left.sql', code: JKQ, ctx: G.ctx('duckdb'),
        result: res('m7.json_flat_left_duckdb'),
        steps: [
          { say: 'A LEFT JOIN LATERAL keeps the left row even when the flatten returns no rows. The ON condition is simply true.' },
          { say: 'Run it. Five rows. Events 3 and 4 are back, with NULL for the sku and the quantity. The three engines again returned the same rows, each in its own spelling.', run: true }
        ]
      }),

      B.bug({
        id: 'm7-bug-json', t: 2, title: 'Bug hunt: the sessions that vanished',
        q: 'A report should count all sessions in the sample: ' + BJF + '. After a change that flattens the cart items, it counts ' + BJ + '. Click the line that drops the sessions.',
        file: 'sessions.sql', lang: 'sql',
        code: G.file('m7.bug_json'), bad: [3], hint: 'What does a flatten return for an empty list or a missing cart?',
        why: 'The flatten works like an inner join. A session with an empty cart or with no cart returns no rows, so it is dropped before the count. A LEFT JOIN LATERAL with ON true keeps the session. The fixed query counted ' + BJF + '.',
        fix: G.file('m7.bug_json_fix'),
        cheer: 'Flatten with a LEFT JOIN when the parent rows must survive.'
      }),

      B.quiz({
        id: 'm7-q-json', t: 2, q: 'One event has `"coupon": null` and another has no `coupon` key. What do the three engines return when you read `coupon` from each one?',
        opts: [
          { t: 'SQL NULL for both', fb: '' },
          { t: 'The text null for the first and NULL for the second', fb: 'In this recording none of the engines returned the text null. They all returned SQL NULL.' },
          { t: 'An error for the missing key', fb: 'A path that does not exist returns NULL. It is not an error.' },
          { t: 'An empty string for the first one', fb: 'The JSON null became SQL NULL, not an empty string.' }
        ],
        ok: 0, why: 'DuckDB, PostgreSQL and SQLite all returned NULL for the JSON null and for the missing key. If the difference matters, check for the key explicitly, for example with a JSON exists function of the engine.'
      }),

      B.sql({
        id: 'm7-arrays', t: 2, src: 'rec', title: 'Collect rows into an array', file: 'arrays.sql', code: AAQ, ctx: G.ctx('duckdb'),
        result: res('m7.arrays_duckdb'),
        steps: [
          { say: 'The opposite of a flatten: gather the rows of a group into one array. `list` does it on DuckDB, and `array_agg` on PostgreSQL.' },
          { say: 'The ORDER BY inside the call sorts the items, and `list_contains` tests whether the array holds a value.', lines: G.span(AAQ, /list\(p.name ORDER BY/, /list_contains/) },
          { say: 'Run it. Order 1001 holds [Espresso, Latte]. PostgreSQL returned the same rows with `array_agg` and `= ANY(...)`. SQLite has no array type: `json_group_array` makes a JSON text such as ["Espresso","Latte"].', run: true }
        ],
        note: 'The recorder prints the arrays of DuckDB and PostgreSQL in one style, so the two tables look the same.'
      }),

      B.challenge({
        id: 'm7-ch-domain', t: 1, title: 'Coding round: customers by email domain', file: 'domains.sql', lang: 'sql',
        q: 'Count the **customers for each email domain**. A customer without an email counts under `unknown`. Return `domain` and `customers`, ordered by customers (most first) and then by domain. Use `split_part`.',
        data: [{ name: 'customers (3 columns)', cols: G.cols('data.customers', ['customer_id', 'name', 'email']).cols, rows: G.cols('data.customers', ['customer_id', 'name', 'email']).rows, types: ['INTEGER', 'VARCHAR', 'VARCHAR'] }],
        starter: '-- customers for each email domain\nSELECT ...',
        hints: ['`split_part(email, \'@\', 2)` returns the part after the @.', 'For a NULL email it returns NULL.', '`coalesce(x, \'unknown\')` replaces NULL.'],
        sol: G.file('m7.ch_domain'),
        res: res('m7.ch_domain', 'duckdb'),
        expl: ['`split_part(email, \'@\', 2)` is the domain, and NULL when the email is NULL.', '`coalesce(..., \'unknown\')` names the missing group, so the two customers without an email are counted and not lost.', 'Six customers use example.com and two are unknown. The GROUP BY repeats the expression, because the alias does not exist yet at that stage of the query.'],
        cx: 'One pass over the customers and a small hash group.'
      }),

      B.challenge({
        id: 'm7-ch-firstorder', t: 1, title: 'Coding round: days from signup to first order', file: 'first_order.sql', lang: 'sql',
        q: 'For each customer who has orders, return the **number of days between signup and the first order**: customer id, name and `days_to_first_order`, ordered by customer id. The first order is the earliest `order_ts`, and its day is the date part.',
        data: [
          { name: 'customers (3 columns)', cols: G.cols('data.customers', ['customer_id', 'name', 'signup_date']).cols, rows: G.cols('data.customers', ['customer_id', 'name', 'signup_date']).rows, types: ['INTEGER', 'VARCHAR', 'DATE'] },
          { name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'customer_id', 'order_ts']).cols, rows: G.cols('data.orders', ['order_id', 'customer_id', 'order_ts']).rows, types: ['INTEGER', 'INTEGER', 'TIMESTAMP'] }
        ],
        starter: '-- days between signup and the first order\nSELECT ...',
        hints: ['`min(o.order_ts)` is the first order of a customer.', '`CAST(ts AS DATE)` cuts the time off.', 'A date minus a date is a number of days on DuckDB and PostgreSQL.'],
        sol: G.file('m7.ch_firstorder'),
        res: res('m7.ch_firstorder', 'duckdb'),
        expl: ['The inner join keeps customers with orders, so customers 6 and 8 are not listed. The guest order has no customer and is ignored.', '`CAST(min(o.order_ts) AS DATE) - c.signup_date` subtracts two dates and returns whole days: Ana Lim signed up on 5 January and ordered on 1 March, 55 days later.', 'The signup date is in the GROUP BY because it is not aggregated.'],
        cx: 'One join and one group by customer.'
      }),

      B.challenge({
        id: 'm7-ch-localday', t: 2, title: 'Coding round: orders for each store and local day', file: 'local_days.sql', lang: 'sql',
        q: 'Count the **orders for each store and local day**. Order times are UTC. The zones are 1 Asia/Singapore, 2 Asia/Kuala_Lumpur, 3 Asia/Jakarta and 4 Australia/Sydney, and the starter gives them as a small table. Return `store_id`, `local_day` and `orders`, ordered by store and day.',
        data: [{ name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'store_id', 'order_ts']).cols, rows: G.cols('data.orders', ['order_id', 'store_id', 'order_ts']).rows, types: ['INTEGER', 'INTEGER', 'TIMESTAMP'] }],
        starter: "-- orders for each store and local day\nWITH store_tz(store_id, tz) AS (\n  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')\n)\nSELECT ...",
        hints: ["`order_ts AT TIME ZONE 'UTC'` says that the stored time is UTC.", '`AT TIME ZONE z.tz` on the result gives the clock of the store.', 'Cast the local timestamp to a date and group by it.'],
        sol: G.file('m7.ch_localday'),
        res: res('m7.ch_localday', 'duckdb'),
        expl: ['The first `AT TIME ZONE \'UTC\'` turns the stored timestamp into an instant. The second converts the instant to the wall clock of the store.', 'Casting the local timestamp to a date gives the local day. The store 2 order 1003 lands on 3 March, not on 2 March.', 'Grouping by the same cast expression keeps one row for each store and local day: 11 rows for the 12 orders, because store 1 has two orders on 3 March.'],
        cx: 'One join to a three row table and one group.'
      }),

      B.decide({
        id: 'm7-dec-tz', t: 2, title: 'Decision: how do you store the time of an order?',
        scenario: 'Orders come from stores in four time zones. Finance wants daily revenue for each store that matches the books of the store. The data team wants one hourly view of all stores together. How do you store and report the order time?',
        opts: [
          { t: 'Store the local time of the store', d: 'Each order keeps the clock of its store.', lose: 'You cannot compare or order events across stores, and a local hour repeats or vanishes when daylight saving changes, as the Los Angeles rows showed.' },
          { t: 'Store UTC and report everything by the UTC day', d: 'One zone, no conversion.', lose: 'The store books and the report disagree: three of the 12 sample orders land on another day.' },
          { t: 'Store UTC instants and convert to the store zone when you report by store', d: 'One stored truth, and a local day when it is needed.', lose: '' },
          { t: 'Store text dates such as 2026-03-03', d: 'Simple to read.', lose: 'You lose the time and the zone, you cannot do arithmetic, and bad strings get in.' }
        ],
        pick: 2,
        why: 'An instant in UTC has no daylight saving and no ambiguity, so events from every store sort and compare correctly. The report by store converts with AT TIME ZONE and the zone of the store, which gave the right local days in the recording.',
        when: 'If a system only ever works with one store in one zone and never compares across zones, local time is simpler. The moment a second zone arrives, UTC is cheaper than a migration.'
      }),

      B.incident({
        id: 'm7-inc-tz', t: 2, time: '09:25',
        alert: 'Finance says the dashboard shows 0.00 for the Sydney store on 5 March, but the books of the store show 14.00. The dashboard groups by `CAST(order_ts AS DATE)`. The orders table stores UTC.',
        clues: ['Order 1006, 14.00, paid, store 4, has order_ts 2026-03-04 21:10:00.', 'The dashboard shows 14.00 on 4 March for the same store.', 'Only some orders are off, the ones placed late in the UTC day.'],
        opts: [
          { t: 'Ask finance to add 11 hours to every date in the report', fb: 'It is a manual fix that breaks when daylight saving changes, and it breaks for the other stores.' },
          { t: 'Compare the UTC day and the local day of order 1006, then group by the local day of the store', fb: '' },
          { t: 'Delete the Sydney orders and load them again', fb: 'The data is correct. The report cuts the day in the wrong zone.' },
          { t: 'Change the time zone of the whole warehouse to Sydney', fb: 'It changes every other report, and the stores in other zones become wrong.' }
        ],
        best: 1,
        why: 'Order 1006 was placed at 21:10 UTC on 4 March, which is 08:10 on 5 March in Sydney. The dashboard cuts the day at UTC midnight. In the recording three of the 12 orders change their day when you convert to the zone of the store: 1003, 1004 and 1006.',
        checks: [['Show both days', 'Select the UTC day and the local day for order 1006 with `AT TIME ZONE`.'], ['Count the affected orders', 'Compare the two days for all orders. Three of 12 differ in the sample.'], ['Fix the report', 'Group by the day in the zone of the store.'], ['Add a test', 'A check that no order has a local day more than one day away from its UTC day.']],
        tell: 'Sydney showed zero revenue on 5 March while the store counted 14.00. The dashboard cut the day on the UTC value, and the order was placed at 21:10 UTC on 4 March, which was 08:10 on 5 March in Sydney. I converted the timestamp to the zone of the store before casting to a date, checked that three of the twelve sample orders change day, and added a test.',
        prevent: ['Name the time zone of every daily report.', 'Keep a table of store time zones, and use zone names, not fixed offsets.', 'Test the day change with orders near midnight.']
      }),

      B.qa({
        id: 'qa-ts-tstz', t: 1, tag: 'Dates', secs: 60,
        q: 'What is the difference between DATE, TIMESTAMP and TIMESTAMPTZ?',
        pts: ['DATE is a calendar day', 'TIMESTAMP has no time zone', 'TIMESTAMPTZ is an instant', 'Display zone vs stored value'],
        short: 'DATE holds a calendar day with no time. TIMESTAMP holds a day and a clock time with no time zone, so you must know which zone it is in. TIMESTAMPTZ holds an instant: it is stored as UTC and shown in the time zone of the session. In my test the same instant, 2026-03-01 02:15 UTC, printed as 10:15 in Singapore and as 18:15 on 28 February in Los Angeles, with the stored value unchanged. I store event times as UTC instants and convert only when I report. SQLite has no such types and keeps dates as text, so I parse them early.',
        fu: [['When is a plain TIMESTAMP acceptable?', 'When the whole company agrees that it holds UTC, and the column name says so, for example order_ts_utc.']],
        trap: 'Mixing columns that hold different time zones in one TIMESTAMP type.',
        real: 'Tell about a bug that came from a time zone.'
      }),

      B.qa({
        id: 'qa-halfopen', t: 1, tag: 'Dates', secs: 60,
        q: 'How do you filter one day or one month correctly?',
        pts: ['A half-open range', 'At least the start, below the next start', 'Compare the bare column', 'BETWEEN with 23:59:59 loses time'],
        short: 'I use a half-open range: the column is at least the start and below the start of the next period. It is exact for any precision, and it compares the bare column, so an index can work. BETWEEN with an end of 23:59:59 misses the last second. A cast of the column to a date gives the same rows, but it blocked the index in my plan on PostgreSQL: a sequential scan read 30,000 rows and removed 29,669, while the range used a bitmap index scan on 331 rows. DuckDB rewrote the cast into the range, so I cannot rely on that, and I write the range.',
        fu: [['How do you write the range for a month?', 'At least the first day of the month and below the first day of the next month. date_trunc gives the first day.']],
        trap: 'Wrapping the indexed column in a function.',
        real: 'Tell about a date filter that was slow, and the plan before and after.'
      }),

      B.qa({
        id: 'qa-tz-report', t: 2, tag: 'Dates', secs: 60,
        q: 'How do you handle time zones in a daily report?',
        pts: ['Store UTC instants', 'Choose the report time zone on purpose', 'Convert with AT TIME ZONE and a zone name', 'Zone names, not fixed offsets'],
        short: 'I store UTC instants, and I choose the time zone of the report on purpose. For a store report I convert with AT TIME ZONE to the zone of the store, and then cut the day. I use zone names such as Australia/Sydney, never a fixed offset, so that daylight saving is handled. In my sample, three of 12 orders landed on another day in the store zone than in UTC, so a report by the UTC date would have been wrong for them. In Los Angeles one order even moved to the previous month. SQLite has no zone names, so I do the conversion in another engine.',
        fu: [['What does daylight saving do to a local day?', 'It can have 23 or 25 hours. In my test 02:00 did not exist on 8 March in Los Angeles, and 01:00 happened twice on 1 November.']],
        trap: 'Cutting the day on a UTC timestamp for a local report.',
        real: 'Tell about a report that disagreed with a local team.'
      }),

      B.qa({
        id: 'qa-week-month', t: 2, tag: 'Dates', secs: 60,
        q: 'What traps do weeks, weekdays and month arithmetic have?',
        pts: ['Weekday numbers differ', 'The week can start on Sunday or Monday', 'ISO week vs other week numbers', 'Month ends'],
        short: 'Weekday numbers: Sunday is 0 in dow and 7 in isodow. date_trunc(\'week\') starts on Monday. Week numbers: for the same Sunday, ISO week was 9 and the strftime %W number was 8 on SQLite, so I say which one I mean. Month ends: DuckDB and PostgreSQL gave 28 February for 31 January plus one month, and SQLite gave 3 March. A Sunday also shows how week buckets can surprise people: order 1001 was on Sunday 1 March and landed in the week of 23 February. I write the definition in the metric, and I test the first and last day of a period.',
        fu: [['How do you make sure two teams use the same week?', 'One date dimension table with the week number and the week start, built once, and everybody joins to it.']],
        trap: 'Assuming that every engine numbers weeks and weekdays the same way.',
        real: 'Tell about a weekly number that two teams computed differently.'
      }),

      B.qa({
        id: 'qa-json', t: 2, tag: 'JSON', secs: 60,
        q: 'How do you query JSON in SQL, and what goes wrong?',
        pts: ['Path expressions read fields', 'Null and missing both give NULL', 'Flattening works like an inner join', 'Spellings differ by engine'],
        short: 'I read fields with a path: `->>` on DuckDB, `payload::jsonb ->> \'device\'` on PostgreSQL and json_extract on SQLite. A JSON null and a missing key both returned SQL NULL on all three engines, so I check for the key explicitly if the difference matters. To get one row for each array element I flatten with unnest, jsonb_array_elements or json_each. That works like an inner join: in my sample 4 sessions became 2 rows of sessions, because empty and missing carts returned no rows. A LEFT JOIN LATERAL with ON true kept all 4. For heavy use I parse JSON into typed columns once, early in the pipeline.',
        fu: [['Why parse JSON into columns?', 'Typed columns are faster, can be indexed and tested, and every query reads them the same way.']],
        trap: 'Counting parents after an inner flatten.',
        real: 'Tell about a pipeline that read JSON payloads.'
      }),

      B.qa({
        id: 'qa-strings', t: 3, tag: 'Strings', secs: 60,
        q: 'What do collation and encoding change in string queries?',
        pts: ['Collation decides the sort order', 'Characters vs bytes', 'Case-insensitive comparison', 'Cross-engine tests break'],
        short: 'Collation decides how text sorts and compares. In my test DuckDB, PostgreSQL and SQLite all returned binary order: Apple, Banana, apple, banana, cherry, Éclair. The PostgreSQL database had the C.UTF-8 collation. With a linguistic collation, such as COLLATE en on DuckDB or "und-x-icu" on PostgreSQL, the order was apple, Apple, banana, Banana, cherry, Éclair. Length differs by unit: Zoë was 3 characters and 4 bytes. This matters for limits and for tests that compare sorted output across engines: they break when the default collation differs. I state the collation in the query when order matters.',
        fu: [['How do you compare strings without case?', 'COLLATE NOCASE on DuckDB and SQLite, or lower() on both sides. In PostgreSQL I use lower() or the citext type.']],
        trap: 'Assuming that every database sorts text the same way.',
        real: 'Tell about a sort order that changed after a migration.'
      }),

      B.qa({
        id: 'qa-portable', t: 3, tag: 'Dialects', secs: 60,
        q: 'How do you write date and string code that works on several engines?',
        pts: ['A common subset', 'Wrap differences in views or macros', 'Test on every target engine', 'Do not assume argument order'],
        short: 'I keep to the common subset where I can: CAST, extract and date_trunc on DuckDB and PostgreSQL, substr and replace everywhere, and half-open ranges. Where the spelling differs I isolate it in one place, such as a view or a macro, so only one definition changes. I test on every target engine. In my recording the same task needed three spellings for time differences, three for JSON and two for splitting a string. Even strftime takes its arguments in a different order on DuckDB and SQLite. Mission 13 shows a translator for such differences. A translation is not a test, so I still run the result.',
        fu: [['What do you do when the engine lacks a function?', 'Write the logic with simpler functions, or do that step in a tool that has it, and document it.']],
        trap: 'Trusting a function name that exists on every engine to behave the same.',
        real: 'Tell about a migration where a function behaved differently.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Time Keeper', color: '#FDE68A',
        pts: [
          '**DATE** is a day, **TIMESTAMP** has no zone, **TIMESTAMPTZ** is an instant. Store UTC instants and convert only when you report.',
          'A day depends on the zone: in the sample **3 of 12 orders** changed their day in the store zone. Use `AT TIME ZONE` with a zone name, not a fixed offset.',
          'Daylight saving gives a local day 23 or 25 hours. In Los Angeles 02:00 did not exist on 8 March and 01:00 happened twice on 1 November.',
          'Filter a day with a **half-open range**: at least the start, below the next start. A cast on the column blocked the index on PostgreSQL.',
          'Weekday and week numbers differ: `dow` 0 and `isodow` 7 for Sunday. One month from 31 January is 28 February on DuckDB and PostgreSQL and 3 March on SQLite.',
          '**JSON** null and a missing key both give NULL. A **flatten** is an inner join, so keep the parents with a LEFT JOIN. Sort order is set by the **collation**.'
        ],
        lines: [
          'I name the time zone of every daily report.',
          'I write half-open ranges, and I test the first and last day of a period.',
          'I flatten JSON with a LEFT JOIN when the parent rows must survive.'
        ]
      })
    ]
  });
})();
