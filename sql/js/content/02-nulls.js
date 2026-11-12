/* Mission 2: SELECT, filters and NULL. Three-valued logic, the NOT IN trap, how NULL counts, groups and sorts, COALESCE and NULLIF, and AND before OR.
   Every table below was returned by DuckDB, PostgreSQL or SQLite when the recorder ran the query. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ENG = ['duckdb', 'postgres', 'sqlite'];
  var NE = G.on('m2.null_eq', 'duckdb').rows[0], NG = G.on('m2.not_gold', 'duckdb').rows.map(function (r) { return r[1]; });
  var NI = {}; ENG.forEach(function (e) { var o = {}; G.on('m2.not_in', e).rows.forEach(function (r) { o[r[0]] = r[1]; }); NI[e] = o; });
  var NO = {}; ENG.forEach(function (e) { NO[e] = G.on('m2.null_order', e).rows; });
  function nullPos(rows) { return rows[0][1] === 'NULL' ? 'first' : rows[rows.length - 1][1] === 'NULL' ? 'last' : 'in the middle'; }
  var DZ = { duckdb: G.on('m2.div_zero', 'duckdb').rows[0][0], postgres: G.text('m2.div_zero.postgres.error'), sqlite: G.on('m2.div_zero', 'sqlite').rows[0][0] };
  var LC = {}; ENG.forEach(function (e) { LC[e] = G.on('m2.like_case', e).rows.length; });
  var CN = {}; ENG.forEach(function (e) { CN[e] = G.on('m2.concat_null', e).rows[1]; });
  var TRUTH = G.counts('m2.truth');
  var EQ = TRUTH.ops.filter(function (o) { return o.name === '='; })[0].grid;
  var CF = G.table('m2.count_forms').rows[0], AV = G.table('m2.avg_null').rows[0], GO = G.table('m2.guest_orders').rows[0];
  var AOR = G.table('m2.where_and_or'), AORF = G.table('m2.where_and_or_fixed');
  var CH = G.table('m2.ch_never.duckdb'), CHG = G.table('m2.ch_changed.duckdb');
  G.expect(NE[0] === '8' && NE[1] === '6' && NE[2] === '0' && NE[3] === '2' && NE[4] === '5', 'customers: 8, 6 with an email, 0 equal to NULL, 2 IS NULL, 5 differ from ana');
  G.expect(NG.join() === '3,5,3,5', '`tier <> gold` finds 3 customers, IS DISTINCT FROM finds 5');
  G.expect(NI.duckdb['NOT IN'] === '0' && NI.postgres['NOT EXISTS'] === '2' && NI.sqlite['LEFT JOIN'] === '2', 'NOT IN finds 0 customers who never ordered, NOT EXISTS and LEFT JOIN find 2, on all three engines');
  G.expect(nullPos(NO.duckdb) === 'last' && nullPos(NO.postgres) === 'last' && nullPos(NO.sqlite) === 'first', 'ORDER BY puts NULL last on DuckDB and PostgreSQL and first on SQLite');
  G.expect(DZ.duckdb === 'inf' && /division by zero/.test(DZ.postgres) && DZ.sqlite === 'NULL', '10 / 0 is inf on DuckDB, an error on PostgreSQL, NULL on SQLite');
  G.expect(LC.duckdb === 0 && LC.postgres === 0 && LC.sqlite === 1, 'LIKE matches ana case blind only on SQLite');
  G.expect(CN.duckdb[1] === 'NULL' && CN.duckdb[2] === 'Hi Ben Ortiz <>' && CN.sqlite[2] === 'Hi Ben Ortiz <>', '|| with a NULL gives NULL and concat skips it, on all three engines');
  G.expect(EQ.duckdb[0][0] === 'true' && EQ.sqlite[0][0] === '1' && EQ.duckdb[0][2] === 'NULL', 'TRUE = TRUE shows true, true and 1');
  G.expect(CF.join() === '8,6,2,4' && AV.join() === '3.091,2.833,1' && GO.join() === '12,11,1', 'count forms, the average with and without NULL, and one guest order');
  G.expect(AOR.rows.length === 8 && AORF.rows.length === 7, 'the AND before OR mistake returns 8 orders instead of 7');
  G.expect(CH.rows.length === 2 && CHG.rows.length === 2 && G.table('m2.ch_changed_wrong.duckdb').rows.length === 0, 'the challenges: 2 customers never ordered, IS DISTINCT FROM finds 2 and <> finds 0');

  var EQ_SQL = G.file('m2.null_eq'), GOLD_SQL = G.file('m2.not_gold'), NOTIN_SQL = G.file('m2.not_in'), ORDER_SQL = G.file('m2.null_order'), EXPL_SQL = G.file('m2.null_order_explicit');
  var GROUPS_SQL = G.file('m2.null_groups'), COAL_SQL = G.file('m2.coalesce'), NULLIF_SQL = G.file('m2.nullif'), CASE_SQL = G.file('m2.case_null'), ANDOR_SQL = G.file('m2.where_and_or');
  var COUNT_SQL = G.file('m2.count_forms'), AVG_SQL = G.file('m2.avg_null');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm2', n: 2, title: 'SELECT, filters and NULL', short: 'NULL', blurb: 'Three-valued logic, the NOT IN trap, how NULL counts, sorts and groups, COALESCE, NULLIF and AND before OR', minutes: 45,
    focus: ['src'],
    goals: [
      'Say that **NULL means unknown**, and test for it with `IS NULL`.',
      'Predict what **WHERE** does with a comparison that is unknown.',
      'Avoid the **NOT IN** trap and choose `NOT EXISTS`.',
      'Count with `count(*)`, `count(col)` and `count(DISTINCT col)` and know what each skips.',
      'Use **COALESCE**, **NULLIF**, `IS DISTINCT FROM` and parentheses around OR.'
    ],
    say: 'Mission 2 is about the value that is not a value. NULL causes more wrong dashboards than any other thing in SQL, because the query runs, returns rows, and quietly leaves some out. We will meet it in filters, counts, sorting and joins, and see what three engines do with it.',
    scenes: [
      B.talk({
        id: 'm2-what', t: 1, src: 'docs', title: 'NULL means unknown',
        say: 'NULL is not zero and it is not an empty string. It means that the value is not known. Press Next for six rules that explain nearly every NULL bug.',
        items: [
          ['Not a value', 'NULL is the absence of a value. A customer with no email has a NULL email. A customer who has an empty email has the text `\'\'`. They are different, and they behave differently.', 'NULL is not 0 and not empty text.'],
          ['Comparisons give unknown', 'Any comparison with NULL is unknown, even `NULL = NULL`. SQL has three truth values: TRUE, FALSE and NULL (unknown). To test for it use `IS NULL` and `IS NOT NULL`.', 'Use IS NULL, never `= NULL`.'],
          ['WHERE keeps only TRUE', 'A row passes WHERE only when the test is TRUE. FALSE drops the row, and so does unknown. That is why `tier <> \'gold\'` silently drops the customers whose tier is NULL.', 'Unknown is dropped.'],
          ['Aggregates skip NULL', '`count(col)`, `sum(col)` and `avg(col)` ignore NULL values. `count(*)` counts rows. If every value is NULL, `sum` returns NULL, not 0.', 'count(*) is not count(col).'],
          ['Groups and sorts treat NULL as one thing', 'GROUP BY puts all NULLs in one group, and DISTINCT keeps one NULL. Yet `=` says that two NULLs are not equal. Where NULLs sort is a choice that differs by engine.', 'Same for grouping, different for equality.'],
          ['Functions to handle it', '`coalesce(a, b)` returns the first value that is not NULL. `nullif(a, b)` returns NULL when the two are equal. `IS DISTINCT FROM` is an equality test that treats two NULLs as the same.', 'coalesce, nullif, IS DISTINCT FROM.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm2-lab', kind: 'nulls', t: 1, src: 'rec', title: 'Lab: three truth values and the NOT IN trap' }),

      B.sql({
        id: 'm2-eq', t: 1, src: 'rec', title: 'Equal to NULL finds nothing', file: 'null_eq.sql', code: EQ_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.null_eq', 'duckdb'),
        steps: [
          { say: 'Eight customers, and two of them have no email. One query asks five questions about them.' },
          { say: '`count(*)` counts rows. `count(email)` counts only the rows where email is not NULL. The difference is the number of missing emails.', lines: G.span(EQ_SQL, /count\(\*\)\s+AS customers/, /count\(email\)/) },
          { say: '`email = NULL` is never TRUE, so the filter counts nothing. This is the classic bug. `email IS NULL` finds the two.', lines: G.span(EQ_SQL, /equals_null/, /is_null/) },
          { say: '`email <> \'ana@example.com\'` counts the customers with another email, and the NULL ones are not in it. Unknown is not TRUE.', lines: G.span(EQ_SQL, /not_ana/) },
          { say: 'Run it. DuckDB, PostgreSQL and SQLite all gave ' + NE.join(', ') + ' for the five numbers.', run: true }
        ]
      }),

      B.bug({
        id: 'm2-bug-eqnull', t: 1, title: 'Bug hunt: the missing emails',
        q: 'Marketing wants the customers without an email. The report always says 0 customers. Click the line that causes it.',
        file: 'missing_email.sql', lang: 'sql',
        code: ['SELECT customer_id, name', 'FROM customers', 'WHERE email = NULL', 'ORDER BY customer_id;'].join('\n'),
        bad: [3], hint: 'What does `= NULL` return for a row where email is NULL?',
        why: 'A comparison with NULL is unknown, never TRUE, so WHERE keeps no row. The recorded count of `email = NULL` is ' + NE[2] + ' and of `email IS NULL` is ' + NE[3] + '.',
        fix: ['SELECT customer_id, name', 'FROM customers', 'WHERE email IS NULL', 'ORDER BY customer_id;'].join('\n'),
        cheer: 'IS NULL is the only test for NULL.'
      }),

      B.sql({
        id: 'm2-notgold', t: 1, src: 'rec', title: 'The rows that a filter drops quietly', file: 'not_gold.sql', code: GOLD_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.not_gold', 'duckdb'),
        steps: [
          { say: 'Eight customers: three gold, three silver, two with no tier. How many are "not gold"? Four ways to ask, and two answers.' },
          { say: '`tier <> \'gold\'` returns 3. The two customers with a NULL tier are not in the answer, because NULL <> gold is unknown.', lines: G.span(GOLD_SQL, /tier <> gold'\s+AS filter/) },
          { say: '`IS DISTINCT FROM` treats NULL as a value that differs from gold. It returns 5, because the two NULL tiers differ from gold.', lines: G.span(GOLD_SQL, /IS DISTINCT FROM gold/) },
          { say: '`NOT (tier = \'gold\')` is the same as `<>`. Negating an unknown gives unknown, so the two NULL rows are still dropped.', lines: G.span(GOLD_SQL, /NOT \(tier = gold\)/) },
          { say: 'Adding `OR tier IS NULL` to the plain comparison gives the same 5 as IS DISTINCT FROM. It is the long way to write it.', lines: G.span(GOLD_SQL, /tier <> gold OR tier IS NULL/) },
          { say: 'Run it. The counts are ' + NG.join(', ') + '. Always ask yourself what the filter does with NULL.', run: true }
        ]
      }),

      B.quiz({
        id: 'm2-q-notgold', t: 1, q: 'There are 8 customers, 3 with tier gold. `WHERE tier <> \'gold\'` returns 3 customers. Where are the other 2?',
        opts: [
          { t: 'They have the tier gold in lower case', fb: 'The data has no such rows. Equality is exact on all three engines.' },
          { t: 'Their tier is NULL, so the comparison is unknown and WHERE drops them', fb: '' },
          { t: 'The engine returns at most 3 rows', fb: 'There is no such limit. The result is complete.' },
          { t: 'They were deleted by the query', fb: 'A SELECT never changes data.' }
        ],
        ok: 1, why: '8 customers: 3 gold, 3 silver, 2 NULL. The filter keeps rows where the test is TRUE. For NULL the test is unknown, so those 2 customers are dropped.'
      }),

      B.sql({
        id: 'm2-notin', t: 1, src: 'rec', title: 'The NOT IN trap', file: 'never_ordered.sql', code: NOTIN_SQL, ctx: G.ctx('postgres'),
        result: res('m2.not_in', 'postgres'),
        steps: [
          { say: 'Which customers never ordered? Three common ways to write it. One order is a guest order, so `orders.customer_id` contains a NULL.' },
          { say: '`NOT IN` asks: is the id different from every value in the list? The list holds 1, 2, 3, 4, 5, 7 and a NULL. For an id that is not in the list, one comparison is unknown, so the whole test is never TRUE.', lines: G.span(NOTIN_SQL, /'NOT IN'/, /NOT IN \(SELECT/) },
          { say: '`NOT EXISTS` asks whether any matching order exists. A NULL in the orders never matches, and it does no harm.', lines: G.span(NOTIN_SQL, /'NOT EXISTS'/, /WHERE NOT EXISTS/) },
          { say: '`LEFT JOIN` keeps every customer and fills the order columns with NULL when there is no match. `WHERE o.order_id IS NULL` keeps the unmatched customers.', lines: G.span(NOTIN_SQL, /'LEFT JOIN'/, /o\.order_id IS NULL/) },
          { say: 'Run it on PostgreSQL. NOT IN found ' + NI.postgres['NOT IN'] + ' customers. The other two ways found ' + NI.postgres['NOT EXISTS'] + '. DuckDB and SQLite gave the same three numbers.', run: true }
        ]
      }),

      B.quiz({
        id: 'm2-q-notin', t: 1, q: 'One row in `orders` has a NULL `customer_id`. What does `WHERE customer_id NOT IN (SELECT customer_id FROM orders)` return for customers?',
        opts: [
          { t: 'Every customer who never ordered', fb: 'That is what you wanted. It is not what happens.' },
          { t: 'No rows at all', fb: '' },
          { t: 'An error about NULL', fb: 'No error. The query runs and returns an empty result, which is worse.' },
          { t: 'Only the customer with a NULL id', fb: 'Customers have no NULL id. The subquery has it.' }
        ],
        ok: 1, why: 'For a customer that is not in the list, `id <> NULL` is unknown, and a NOT IN list is true only if every comparison is true. One NULL in the list makes every answer unknown. The recorded result on all three engines is ' + NI.duckdb['NOT IN'] + ' rows.'
      }),

      B.cmp({
        id: 'm2-engines', t: 1, src: 'rec', title: 'NULL and friends on three engines',
        say: 'NULL is standard SQL, and the engines agree on the rules. They disagree on the edges around it. Press Next for each row. Every cell was returned by the engine.',
        cols: ['Question', 'DuckDB', 'PostgreSQL', 'SQLite'],
        hl: 0,
        rows: [
          ['Where do NULLs sort with `ORDER BY tier`?', nullPos(NO.duckdb), nullPos(NO.postgres), nullPos(NO.sqlite)],
          ['What does `SELECT 10 / 0` return?', DZ.duckdb, 'error: ' + DZ.postgres, DZ.sqlite],
          ['What does `TRUE = TRUE` return?', EQ.duckdb[0][0], EQ.postgres[0][0], EQ.sqlite[0][0]],
          ['`name LIKE \'ana%\'` for the name Ana Lim', LC.duckdb + ' rows', LC.postgres + ' rows', LC.sqlite + ' row'],
          ['`\'Hi \' || name || \' <\' || email || \'>\'` for a NULL email', CN.duckdb[1], CN.postgres[1], CN.sqlite[1]],
          ['`concat(\'Hi \', name, \' <\', email, \'>\')` for a NULL email', CN.duckdb[2], CN.postgres[2], CN.sqlite[2]]
        ],
        steps: [
          { upto: 1, say: 'Sorting. DuckDB and PostgreSQL sort NULLs after every value in an ascending sort. SQLite sorts them first. A report that takes "the first row" changes with the engine.' },
          { upto: 2, say: 'Division by zero. DuckDB returns infinity, PostgreSQL stops with an error, SQLite returns NULL. The same query is a failed job, a silent NULL or an infinite number.' },
          { upto: 3, say: 'SQLite has no boolean type. It returns 1 and 0 where the other two return true and false. Mind this when you compare results.' },
          { upto: 4, say: 'LIKE is case blind in SQLite for plain letters and case sensitive in the other two. PostgreSQL has ILIKE for a case blind match.' },
          { upto: 5, say: 'The `||` operator gives NULL when any part is NULL, on all three engines. A missing email wipes out the whole text.' },
          { upto: 6, say: '`concat` treats NULL as empty text, so you get a text with an empty email. Check which one your report needs.' }
        ],
        pick: 'Make the choice visible: write `NULLS LAST` in ORDER BY, guard divisions with `NULLIF`, and test text functions with a NULL.'
      }),

      B.sql({
        id: 'm2-order', t: 1, src: 'rec', title: 'Where NULLs sort', file: 'null_order.sql', code: ORDER_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.null_order', 'duckdb'),
        steps: [
          { say: 'Sort the customers by tier. Two have no tier. Where do they land?' },
          { say: 'DuckDB put the NULL rows last. PostgreSQL did the same. SQLite put them first. The standard leaves it open.', lines: G.span(ORDER_SQL, /ORDER BY/) },
          { say: 'Run it on DuckDB. Customers 3 and 6 are at the end.', run: true }
        ],
        note: 'In PostgreSQL and DuckDB, `ORDER BY tier DESC` puts NULLs first in a descending sort. NULL behaves as if it were larger than every value.'
      }),

      B.sql({
        id: 'm2-order-explicit', t: 1, src: 'rec', title: 'Say where NULLs go', file: 'null_order_explicit.sql', code: EXPL_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.null_order_explicit', 'duckdb'),
        steps: [
          { say: 'You can say it in the query. `NULLS FIRST` and `NULLS LAST` work on all three engines of this course, so the result no longer depends on the default.', lines: G.span(EXPL_SQL, /ORDER BY/) },
          { say: 'Run it. The two customers with no tier come first.', run: true }
        ]
      }),

      B.sql({
        id: 'm2-groups', t: 1, src: 'rec', title: 'GROUP BY puts NULLs together', file: 'null_groups.sql', code: GROUPS_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.null_groups', 'duckdb'),
        steps: [
          { say: 'Equality says that two NULLs are not equal. Grouping does not agree: it treats NULLs as one group.' },
          { say: 'The two customers without a tier land in one group with the name NULL. DISTINCT does the same and keeps one NULL.', lines: G.span(GROUPS_SQL, /GROUP BY tier/) },
          { say: 'Run it. Three groups: gold, silver and NULL. The NULL group has 2 customers.', run: true }
        ]
      }),

      B.sql({
        id: 'm2-count', t: 1, src: 'rec', title: 'Three ways to count', file: 'count_forms.sql', code: COUNT_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.count_forms'),
        steps: [
          { say: 'Counting has three common forms. They answer three different questions.' },
          { say: '`count(*)` counts rows. `count(tier)` counts rows where tier is not NULL.', lines: G.span(COUNT_SQL, /count\(\*\)/, /count\(tier\)/) },
          { say: '`count(DISTINCT tier)` counts different values. NULL is not a value here, so it is not counted. `count(DISTINCT country)` is 4 for the same reason.', lines: G.span(COUNT_SQL, /count\(DISTINCT tier\)/, /count\(DISTINCT country\)/) },
          { say: 'Run it. 8 rows, 6 with a tier, 2 different tiers, 4 different countries.', run: true }
        ]
      }),

      B.sql({
        id: 'm2-avg', t: 2, src: 'rec', title: 'The average that ignores NULL', file: 'avg_null.sql', code: AVG_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.avg_null'),
        steps: [
          { say: 'Aggregates skip NULL. That is often right and sometimes a trap. This query averages `customer_id` over the orders, as a stand-in for any column with gaps.' },
          { say: '`avg(customer_id)` divides by the 11 orders that have a customer. `avg(coalesce(customer_id, 0))` counts the guest order as 0 and divides by 12.', lines: G.span(AVG_SQL, /avg\(customer_id\)/, /avg\(coalesce/) },
          { say: 'Run it. The two averages are ' + AV[0] + ' and ' + AV[1] + '. If a missing value really means zero, say so with coalesce. If it means unknown, let the average skip it.', run: true }
        ]
      }),

      B.sql({
        id: 'm2-coalesce', t: 1, src: 'rec', title: 'COALESCE: the first value that is not NULL', file: 'coalesce.sql', code: COAL_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.coalesce'),
        steps: [
          { say: '`coalesce` takes a list and returns the first value that is not NULL. It is the usual way to show a default.' },
          { say: 'Each call gives a column a default for display: no email, unranked, and a question mark for a missing country.', lines: G.span(COAL_SQL, /coalesce\(email/, /coalesce\(country/) },
          { say: 'Run it. Customer 6 shows all three defaults. The data did not change: only the output did.', run: true }
        ],
        note: 'Use a default for display, not to hide a data problem. A report that shows "unranked" for a missing tier is honest. A sum that treats a missing amount as 0 may not be.'
      }),

      B.sql({
        id: 'm2-nullif', t: 2, src: 'rec', title: 'NULLIF and division by zero', file: 'nullif.sql', code: NULLIF_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.nullif', 'duckdb'),
        steps: [
          { say: '`nullif(a, b)` returns NULL when a equals b, and a otherwise. With a zero it turns a bad divisor into NULL.', lines: G.span(NULLIF_SQL, /NULLIF/) },
          { say: 'Plain `10 / 0` gave `' + DZ.duckdb + '` on DuckDB, an error on PostgreSQL and NULL on SQLite. With `NULLIF(0, 0)` all three give NULL, and `coalesce` then supplies a default.', lines: G.span(NULLIF_SQL, /coalesce/) },
          { say: 'Run it on DuckDB.', run: true }
        ]
      }),

      B.sql({
        id: 'm2-case', t: 1, src: 'rec', title: 'CASE and NULL', file: 'case_null.sql', code: CASE_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.case_null'),
        steps: [
          { say: '`CASE` picks the first branch whose test is TRUE. A NULL tier is not equal to anything, so it falls to ELSE.' },
          { say: 'The first CASE compares `tier` to \'gold\' and \'silver\'. The NULL rows become \'other\', which hides the difference between no tier and another tier.', lines: G.span(CASE_SQL, /CASE tier/) },
          { say: 'The second CASE tests `tier IS NULL` first, so it can name the case. Put the NULL test first.', lines: G.span(CASE_SQL, /CASE WHEN tier IS NULL/) },
          { say: 'Run it. Customers 3 and 6 are \'other\' in one column and \'unknown\' in the other.', run: true }
        ]
      }),

      B.sql({
        id: 'm2-andor', t: 1, src: 'rec', title: 'AND is stronger than OR', file: 'and_or.sql', code: ANDOR_SQL, ctx: G.ctx('duckdb'),
        result: res('m2.where_and_or'),
        steps: [
          { say: 'You want the paid orders that came from the web or the app. This query looks right. It is not.' },
          { say: 'AND binds tighter than OR. The engine reads it as `channel = \'web\' OR (channel = \'app\' AND status = \'paid\')`. Every web order passes, paid or not.', lines: G.span(ANDOR_SQL, /^WHERE/) },
          { say: 'Run it. It returned ' + AOR.rows.length + ' orders. Order 1008 is in the list, and it was refunded. With parentheses the answer is ' + AORF.rows.length + ' orders.', run: true }
        ]
      }),

      B.bug({
        id: 'm2-bug-andor', t: 1, title: 'Bug hunt: web or app, and paid',
        q: 'The finance report should list paid orders from the web or the app. It also lists the refunded order 1008. Click the line that causes it.',
        file: 'paid_web_app.sql', lang: 'sql',
        code: ['SELECT order_id, status, channel, total', 'FROM orders', "WHERE channel = 'web' OR channel = 'app' AND status = 'paid'", 'ORDER BY order_id;'].join('\n'),
        bad: [3], hint: 'Which of AND and OR is evaluated first?',
        why: 'AND is evaluated before OR, so the status test applies only to the app branch. Order 1008 came from the web and was refunded, and it passes the first branch.',
        fix: ['SELECT order_id, status, channel, total', 'FROM orders', "WHERE status = 'paid' AND (channel = 'web' OR channel = 'app')", 'ORDER BY order_id;'].join('\n'),
        cheer: 'Parentheses cost nothing. Use them whenever AND and OR meet.'
      }),

      B.bug({
        id: 'm2-bug-notin', t: 1, title: 'Bug hunt: the empty campaign list',
        q: 'The "come back" campaign should email customers who never ordered. Since a guest checked out on Tuesday, the list is empty. Click the line that causes it.',
        file: 'campaign.sql', lang: 'sql',
        code: ['SELECT customer_id, email', 'FROM customers', 'WHERE customer_id NOT IN (SELECT customer_id FROM orders)', '  AND email IS NOT NULL;'].join('\n'),
        bad: [3], hint: 'What does the subquery return for a guest order?',
        why: 'The guest order has a NULL customer_id, so the NOT IN list holds a NULL and no customer can pass the test.',
        fix: ['SELECT c.customer_id, c.email', 'FROM customers AS c', 'WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id)', '  AND c.email IS NOT NULL;'].join('\n'),
        cheer: 'NOT EXISTS ignores the NULL and finds the same customers as the first week.'
      }),

      B.challenge({
        id: 'm2-ch-never', t: 1, title: 'Coding round: customers who never ordered', file: 'never_ordered.sql', lang: 'sql',
        q: 'Return the **id and name of every customer who has never placed an order**, in id order. One order has no customer. Your query must give the right answer anyway.',
        data: [
          { name: 'customers (id and name)', cols: G.cols('data.customers', ['customer_id', 'name']).cols, rows: G.cols('data.customers', ['customer_id', 'name']).rows, types: ['INTEGER', 'VARCHAR'] },
          { name: 'orders (order and customer)', cols: G.cols('data.orders', ['order_id', 'customer_id']).cols, rows: G.cols('data.orders', ['order_id', 'customer_id']).rows, types: ['INTEGER', 'INTEGER'] }
        ],
        starter: '-- customers with no order, safe when an order has no customer\nSELECT ...',
        hints: ['What does a NULL in a NOT IN list do?', 'Ask whether a matching order exists for each customer.', 'A LEFT JOIN with an IS NULL test is the third way.'],
        sol: G.file('m2.ch_never'),
        res: res('m2.ch_never', 'duckdb'),
        expl: ['`NOT EXISTS` checks, for each customer, whether an order with that customer id exists. The guest order never matches anyone.', 'It returned the same two rows on DuckDB, PostgreSQL and SQLite.', 'The `NOT IN` version returns no rows here because of the guest order.'],
        cx: 'The engine can run NOT EXISTS as an anti join: one pass over customers and a hash lookup in orders. It is linear in the number of rows, plus the cost of building the hash.'
      }),

      B.challenge({
        id: 'm2-ch-changed', t: 2, title: 'Coding round: a tier that differs, NULL included', file: 'tier_differs.sql', lang: 'sql',
        q: 'The warehouse keeps the current tier of each customer in `customer_dim`. Find the customers whose tier in `customers` **differs** from the dimension, where a missing value counts as a value. A customer with no dimension row has a NULL dimension tier. Return the id and both tiers.',
        data: [
          { name: 'customers (id and tier)', cols: G.cols('data.customers', ['customer_id', 'tier']).cols, rows: G.cols('data.customers', ['customer_id', 'tier']).rows, types: ['INTEGER', 'VARCHAR'] },
          { name: 'customer_dim (current rows have is_current true)', cols: G.table('data.customer_dim').cols, rows: G.table('data.customer_dim').rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DATE', 'DATE', 'BOOLEAN'] }
        ],
        starter: '-- customers whose tier differs from the current dimension row\nSELECT ...',
        hints: ['A LEFT JOIN keeps customers that have no dimension row. Join only the current rows.', '`<>` is unknown when one side is NULL. Which operator treats two NULLs as equal?'],
        sol: G.file('m2.ch_changed'),
        res: res('m2.ch_changed', 'duckdb'),
        expl: ['The LEFT JOIN with `d.is_current` in the ON clause keeps customers without a dimension row.', '`IS DISTINCT FROM` is TRUE when one side is NULL and the other is not, and FALSE when both are NULL. So customers 7 and 8 appear, and customers 3 and 6 (both NULL) do not.', 'With `<>` the same query returns **0 rows** on all three engines, because every comparison with NULL is unknown.'],
        cx: 'One pass over customers with a hash lookup in the dimension. It is linear in the number of customers.'
      }),

      B.decide({
        id: 'm2-dec-guest', t: 2, title: 'Decision: how do you store a guest order?',
        scenario: 'Brewline lets people check out without an account. In the orders table such an order has no customer. The analysts will join orders to customers in a star schema. How do you represent a guest?',
        opts: [
          { t: 'NULL in the source, an "Unknown customer" row in the warehouse', d: 'Keep the honest NULL in the application table, and give the dimension a row with a key such as -1 for unknown.', lose: '' },
          { t: 'NULL everywhere, and always use LEFT JOIN', d: 'No special rows. Every analyst must remember to use outer joins.', lose: 'One inner join in one dashboard drops every guest order. The error is silent and easy to repeat.' },
          { t: 'A fake customer with id 0 in the application table', d: 'Every order has a customer, so the foreign key and the joins always work.', lose: 'The fake customer shows up in counts of customers, in emails and in tests, and nobody remembers that it is fake.' },
          { t: 'Delete guest orders from the analytics tables', d: 'Analysts only see real customers.', lose: 'Revenue is understated and does not match finance.' }
        ],
        pick: 0,
        why: 'The source table should say what is true: there is no customer, so the value is NULL, and a foreign key may allow it. In the warehouse the star schema needs every fact to join to a dimension row, so you give the unknown case a real row that says so. Facts keep their revenue, inner joins stay safe, and the unknown row is visible in every report.',
        when: 'If the table is only used by the application and never joined for analysis, NULL alone is enough. If the business forbids guests, a NOT NULL constraint is the best answer.'
      }),

      B.incident({
        id: 'm2-inc-notin', t: 1, time: '09:05',
        alert: 'The "come back" email campaign sent 0 emails this morning. The campaign query selects customers who have never ordered, and last week it returned 2,400 customers.',
        clues: ['The campaign query uses `customer_id NOT IN (SELECT customer_id FROM orders)`.', 'The job did not fail. It finished in 2 seconds.', 'A guest checkout feature was released on Tuesday.'],
        opts: [
          { t: 'Re-run the job in case it was a glitch', fb: 'It will give the same answer. The cause is in the data and the query.' },
          { t: 'Check how many orders have a NULL customer_id', fb: '' },
          { t: 'Ask marketing to send the list from last week', fb: 'It is stale, and it hides the cause. The next run fails the same way.' },
          { t: 'Add a larger warehouse to speed up the job', fb: 'The job was fast. It returned the wrong answer, not a late one.' }
        ],
        best: 1,
        why: 'A NOT IN subquery that suddenly returns nothing, after a release that creates rows without a key, points at a NULL in the list. The check is one query: count the orders whose customer_id is NULL. In the mini data it returned ' + GO[2] + ' guest order among ' + GO[0] + '.',
        checks: [['Count the NULL keys', 'The mini data: ' + GO[2] + ' order of ' + GO[0] + ' has no customer.'], ['Run the three forms', 'NOT IN returned ' + NI.duckdb['NOT IN'] + ', NOT EXISTS returned ' + NI.duckdb['NOT EXISTS'] + ', LEFT JOIN returned ' + NI.duckdb['LEFT JOIN'] + '.'], ['Fix the query', 'Use NOT EXISTS, or filter the NULLs out of the subquery.'], ['Re-run the campaign', 'Check that the count is back to the level of last week.']],
        tell: 'The campaign list was empty after a release that allowed guest checkout. Guest orders have a NULL customer id, and our NOT IN subquery then matched nobody. I confirmed it by counting the NULL keys, rewrote the query with NOT EXISTS, re-ran the campaign, and added a test that fails if a NOT IN subquery can return NULL.',
        prevent: ['Prefer NOT EXISTS to NOT IN for anti joins.', 'Add a check that counts NULLs in key columns that joins use, and alert on a change.', 'Compare the size of a campaign list with the previous run before sending.']
      }),

      B.qa({
        id: 'qa-null', t: 1, tag: 'NULL', secs: 60,
        q: 'What does NULL mean in SQL, and how do you test for it?',
        pts: ['NULL means unknown or missing, not zero or empty', 'Comparisons with NULL are unknown', 'Use IS NULL and IS NOT NULL', 'WHERE keeps only TRUE rows'],
        short: 'NULL means that a value is missing or unknown. It is not zero and it is not an empty string. Any comparison with NULL, including `NULL = NULL`, gives unknown, which is the third truth value after TRUE and FALSE. A WHERE clause keeps only rows where the test is TRUE, so unknown rows are dropped. That is why I test with `IS NULL` and `IS NOT NULL`, never with `= NULL`. And it is why `tier <> \'gold\'` drops the customers whose tier is NULL, which surprises people. When NULL should count as a value I use `IS DISTINCT FROM`, or I write `OR tier IS NULL`.',
        fu: [['What does `count(col)` do with NULL?', 'It skips NULL values. `count(*)` counts rows.'], ['Do GROUP BY and DISTINCT treat NULLs as equal?', 'Yes, they group all NULLs together, even though `NULL = NULL` is unknown.']],
        trap: 'Writing `WHERE col = NULL` and wondering why it returns nothing.',
        real: 'Tell about a report that was wrong because of NULL, and how you found it.'
      }),

      B.qa({
        id: 'qa-notin', t: 1, tag: 'NULL', secs: 60,
        q: 'What is wrong with NOT IN, and what do you use instead?',
        pts: ['A NULL in the list makes NOT IN return nothing', 'Because the comparison with NULL is unknown', 'Use NOT EXISTS or a LEFT JOIN with IS NULL', 'Or filter NULLs out of the subquery'],
        short: '`x NOT IN (list)` means that x differs from every value in the list. If the list contains a NULL, then for any x that is not in the list, one of the comparisons is unknown, so the whole test is never TRUE and the query returns no rows. It works until the day a NULL appears, for example a guest order without a customer. I use `NOT EXISTS`, which asks whether a matching row exists and ignores NULLs, or a LEFT JOIN with `IS NULL` on the other side. If I must use NOT IN, I filter the NULLs out of the subquery. In the course data NOT IN returned 0 customers and NOT EXISTS returned 2, on three engines.',
        fu: [['Does NOT EXISTS have a similar problem?', 'No. It tests whether any row matches, and a NULL never matches.'], ['Does IN have the same problem?', 'No. `x IN (1, NULL)` is true when x is 1 and unknown otherwise, and WHERE treats unknown like false, which is what you want.']],
        trap: 'Saying that NOT IN and NOT EXISTS are the same thing.',
        real: 'Tell about a query you changed from NOT IN to NOT EXISTS.'
      }),

      B.qa({
        id: 'qa-countstar', t: 1, tag: 'NULL', secs: 60,
        q: 'What is the difference between count(*), count(column) and count(DISTINCT column)?',
        pts: ['count(*) counts rows', 'count(column) skips NULL', 'count(DISTINCT column) counts different non-NULL values', 'Check with a column that has NULLs'],
        short: '`count(*)` counts rows, whatever their values. `count(column)` counts the rows where that column is not NULL. `count(DISTINCT column)` counts the different values of the column, and NULL is not a value here, so it is not counted. For example, on 8 customers with 2 missing tiers, `count(*)` is 8, `count(tier)` is 6 and `count(DISTINCT tier)` is 2. `count(*) - count(col)` gives the number of NULLs, which is a quick data quality check.',
        fu: [['What does sum() return when all values are NULL?', 'NULL, not 0. Wrap it in coalesce if you need 0.']],
        trap: 'Using count(column) to count rows.',
        real: 'Tell how you used count(*) - count(col) in a check.'
      }),

      B.qa({
        id: 'qa-coalesce', t: 1, tag: 'NULL', secs: 60,
        q: 'How do you handle NULL in reports and in joins?',
        pts: ['COALESCE for defaults', 'NULLIF to avoid division by zero', 'LEFT JOIN and IS NULL for missing matches', 'Be careful that a default changes meaning'],
        short: 'In reports I use `coalesce` to show a default, such as "unranked" for a missing tier. I use `nullif(x, 0)` to turn a zero divisor into NULL so the division does not fail. In joins, a NULL key never matches, so I use LEFT JOIN when I must keep rows without a match, and I test `IS NULL` on the other side to find them. And I am careful that a default has a meaning: replacing a missing amount with 0 changes an average, while leaving it NULL lets the average skip it. I decide which one the business wants and write it down.',
        fu: [['How do you check for NULLs in a key before a join?', '`count(*) - count(key)` on the table, or a test that the key is NOT NULL, and an alert when the number changes.']],
        trap: 'Replacing NULL by 0 everywhere to make a report look complete.',
        real: 'Tell about a default that changed a business number.'
      }),

      B.qa({
        id: 'qa-nullsort', t: 2, tag: 'NULL', secs: 60,
        q: 'Where do NULLs go in an ORDER BY, and does it matter?',
        pts: ['It depends on the engine', 'PostgreSQL and DuckDB: last when ascending', 'SQLite: first when ascending', 'Write NULLS FIRST or NULLS LAST'],
        short: 'The standard does not fix it, so engines differ. In my test PostgreSQL and DuckDB put NULLs last in an ascending sort, and SQLite put them first. Some other engines do the opposite. It matters when a report takes the first row, when you page through results, and when you move a query between engines. So I write `NULLS FIRST` or `NULLS LAST` whenever the column can be NULL, which makes the result the same on every engine that supports the syntax.',
        fu: [['Do NULLs sort first or last in a descending sort on PostgreSQL?', 'First. NULL behaves as if it were larger than every value.']],
        trap: 'Relying on the default order of NULLs.',
        real: 'Tell about a migration where NULL order changed a report.'
      }),

      B.qa({
        id: 'qa-isdistinct', t: 2, tag: 'NULL', secs: 60,
        q: 'What is IS DISTINCT FROM and when do you use it?',
        pts: ['A null-safe inequality', 'NULL IS DISTINCT FROM NULL is false', 'NULL IS DISTINCT FROM 1 is true', 'Use it to detect changes between two tables'],
        short: '`a IS DISTINCT FROM b` is a comparison that treats NULL as an ordinary value. It is TRUE when a and b differ, FALSE when they are equal, and two NULLs count as equal, so the result is never unknown. `IS NOT DISTINCT FROM` is the null-safe equality. I use it to detect changes between two versions of a row, for example a tier that changed, where a plain `<>` would miss a change from NULL to a value. On the course data the plain version returned 0 rows and `IS DISTINCT FROM` returned the 2 customers that really differed.',
        fu: [['Does every engine support it?', 'PostgreSQL, DuckDB and SQLite do. Some engines use a different spelling, such as `<=>` in MySQL, or need a CASE expression.']],
        trap: 'Using `<>` for change detection on columns that can be NULL.',
        real: 'Tell about a change detection query that missed rows.'
      }),

      B.qa({
        id: 'qa-3vl', t: 3, tag: 'NULL', secs: 60,
        q: 'Explain three-valued logic with an example.',
        pts: ['TRUE, FALSE and unknown', 'AND and OR with unknown', 'NOT unknown is unknown', 'WHERE keeps TRUE only'],
        short: 'SQL has three truth values: TRUE, FALSE and unknown, which a NULL comparison produces. For AND: `TRUE AND unknown` is unknown, but `FALSE AND unknown` is FALSE, because one false is enough. For OR: `TRUE OR unknown` is TRUE and `FALSE OR unknown` is unknown. `NOT unknown` is unknown. A WHERE clause keeps a row only if the test is TRUE. So `WHERE tier <> \'gold\'` drops a row whose tier is NULL: the test is unknown. And `WHERE NOT (tier = \'gold\')` drops it too, because NOT unknown is unknown. That is why the intuition "not gold means everything else" is wrong when NULLs exist.',
        fu: [['Is `NULL = NULL` true?', 'No, it is unknown. `IS NOT DISTINCT FROM` is the equality that treats NULLs as equal.']],
        trap: 'Thinking that unknown behaves like false in every operator.',
        real: 'Walk the interviewer through a truth table from memory.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Null Spotter', color: '#FBCFE8',
        pts: [
          '**NULL means unknown.** Comparisons with it are unknown. Test with `IS NULL`, never with `= NULL`.',
          '**WHERE keeps TRUE only.** `tier <> \'gold\'` drops customers whose tier is NULL. Use `IS DISTINCT FROM` or add `OR tier IS NULL`.',
          '**NOT IN with a NULL in the list returns nothing.** Use `NOT EXISTS`, or a LEFT JOIN with `IS NULL`.',
          '**count(*)** counts rows, **count(col)** skips NULL, **count(DISTINCT col)** counts different non-NULL values.',
          '**GROUP BY** puts NULLs together. **ORDER BY** puts them first or last, depending on the engine: say `NULLS LAST`.',
          '**coalesce** gives a default, **nullif** avoids a zero divisor. **AND** binds tighter than **OR**, so use parentheses.'
        ],
        lines: [
          'A comparison with NULL is unknown, and WHERE drops unknown rows.',
          'NOT IN with a NULL in the list returns nothing, so I use NOT EXISTS.',
          'I never rely on where NULLs sort. I write NULLS FIRST or LAST.'
        ]
      })
    ]
  });
})();
