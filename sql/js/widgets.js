/* SQL lab widgets, part 1 (missions 1 to 7). Each one registers LAB.W.<kind> with steps, say, render.
   Every table, plan and number a lab shows comes from js/real.js, recorded by sql/verify/capture_sq.py: DuckDB, PostgreSQL and SQLite ran the queries.
   Labs that translate with sqlglot, or that do arithmetic on a recorded rule, say so on screen. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var SQ = (LAB.sq = LAB.sq || {});
  SQ.info = SQ.info || {};
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  var ENGINES = ['duckdb', 'postgres', 'sqlite'];
  var ENGINE_LABEL = { duckdb: 'DuckDB', postgres: 'PostgreSQL', sqlite: 'SQLite' };

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) {
        return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) {
          var cls = (String(c) === 'NULL' ? 'nul ' : '') + (cellCls ? cellCls(r, ri, ci) || '' : '');
          return '<td class="' + cls + '">' + md(String(c)) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }
  function pre(text) { return '<pre class="planbox">' + esc(text) + '</pre>'; }

  /* ====================== mission 1: the clause stepper ====================== */
  (function () {
    var STAGES = ['FROM and JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'];
    /* the keyword that the stage adds to the query, so the lab can light its lines */
    var ADDS = [/^FROM /, /^WHERE /, /^GROUP BY /, /^HAVING /, /^SELECT /, /^ORDER BY /, /^LIMIT /];
    function stageInfo(n) {
      var sql = G.file('m1.stage.' + n), t = G.table('m1.stage.' + n);
      var lines = sql.split('\n'), a = -1, b = -1;
      lines.forEach(function (l, i) { if (ADDS[n].test(l) && a < 0) a = i + 1; });
      b = a;
      if (n === 0) b = a + 1;                       /* FROM and the JOIN line under it */
      return { sql: sql, t: t, hl: [a, b] };
    }
    function note(n) {
      var t = G.table('m1.stage.' + n), c = t.rows.length;
      return [
        'The engine builds the rows that exist: every order matched with its customer. The guest order has no customer, so an inner join drops it. **' + c + ' rows** are left of 12 orders.',
        'Rows that fail the test are dropped, before anything is grouped. Cancelled, refunded and pending orders go. **' + c + ' rows** remain.',
        'The rows collapse to one row for each country, and the aggregates (count, sum, avg) are computed here. **' + c + ' groups** come out of 8 rows.',
        'A filter on groups. It may use aggregates, which WHERE may not. The country whose revenue is not above 10 is dropped. **' + c + ' groups** remain.',
        'Now the output columns exist, with their names and the rounding. The alias `revenue` is born at this moment, which is why WHERE could not use it. **' + c + ' rows**.',
        'Sorting comes late, so it can use the new names. The same **' + c + ' rows**, in a new order.',
        'LIMIT keeps the first rows of the sorted result. It asked for 3 and **' + c + '** exist, so nothing is cut here.'
      ][n];
    }
    W.clauses = {
      steps: function () { return 2; },
      hint: 'Pick a stage and read the table it makes.',
      say: function (s, i) {
        return [
          'This is one query, cut after each clause. Pick a stage to see the SQL that ran up to that clause and the table it made. The lit lines are what the clause added. DuckDB ran every stage.',
          'Here are the row counts side by side. The row count falls at WHERE and HAVING, and the shape changes at GROUP BY. The engine may run the query in another order, but the result must look like this.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cl || (A.local.cl = { n: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var info = stageInfo(st.n);
          h += '<div class="sel-chips">' + chips(STAGES.map(function (x, k) { return k; }), st.n, 'cl-n', function (k) { return (k + 1) + '. ' + STAGES[k]; }) + '</div>' +
            code('stage ' + (st.n + 1) + ': ' + STAGES[st.n], 'sql', info.sql, info.hl) +
            '<h3 class="lab-h">The table after ' + esc(STAGES[st.n]) + ' (' + info.t.rows.length + ' rows)</h3>' + table(info.t.cols, info.t.rows) +
            '<div class="callout tip">' + md(note(st.n)) + '</div>';
        } else {
          h += table(['Clause', 'Rows after it', 'Columns'], STAGES.map(function (x, k) { var t = G.table('m1.stage.' + k); return [x, String(t.rows.length), t.cols.join(', ')]; }), function (r, k) { return k === st.n ? 'cur' : ''; }) +
            '<div class="callout tip">Rows fall at <b>WHERE</b> and <b>HAVING</b>. The shape changes at <b>GROUP BY</b>, where many rows become one. Everything after SELECT only renames, sorts and cuts.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'cl-n') { st.n = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
    SQ.info.clauses = { stages: STAGES, stage: stageInfo };
  })();

  /* ====================== mission 2: three-valued logic ====================== */
  (function () {
    var VALS = ['TRUE', 'FALSE', 'NULL'];
    function truth() { return G.counts('m2.truth'); }
    function opNames() { return truth().ops.map(function (o) { return o.name; }); }
    function lookup(op, e, a, b) {
      var T = truth(), o = T.ops.filter(function (x) { return x.name === op; })[0];
      return o.grid[e][VALS.indexOf(a)][VALS.indexOf(b)];
    }
    function toBool(v) { return v === 'NULL' ? 'NULL' : (v === 'true' || v === '1') ? 'TRUE' : 'FALSE'; }
    var NOTIN = ['duckdb', 'postgres', 'sqlite'];
    W.nulls = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick an operator and two values.' : 'Switch the subquery and the engine.'; },
      say: function (s, i) {
        return [
          'SQL has three truth values: TRUE, FALSE and NULL, which means unknown. Pick an operator and two values and read the answer. A WHERE clause keeps a row only when the test is TRUE. NULL is not the same as FALSE.',
          'This is the NOT IN trap. One order has no customer, so the subquery returns a NULL. Then `customer_id NOT IN (...)` is never TRUE for a customer who is missing from the list. Switch the subquery and watch the count change.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var h = '<div class="lab">';
        if (i === 0) {
          var st = A.local.nu || (A.local.nu = { op: 'AND', a: 'TRUE', b: 'NULL', e: 'duckdb' });
          var o = truth().ops.filter(function (x) { return x.name === st.op; })[0];
          var res = lookup(st.op, st.e, st.a, st.b), b3 = toBool(res);
          var sql = 'SELECT ' + st.a + ' ' + (st.op === 'IS NOT DISTINCT FROM' || st.op === 'IS DISTINCT FROM' ? st.op : st.op) + ' ' + st.b;
          h += '<div class="lab-row"><span class="lab-l">Operator</span><div class="sel-chips">' + chips(opNames(), st.op, 'nu-op') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Left</span><div class="sel-chips">' + chips(VALS, st.a, 'nu-a') + '</div><span class="lab-l">Right</span><div class="sel-chips">' + chips(VALS, st.b, 'nu-b') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Engine</span><div class="sel-chips">' + chips(ENGINES, st.e, 'nu-e', function (k) { return G.engine(k); }) + '</div></div>' +
            code(G.engine(st.e), 'sql', sql) +
            '<div class="lab-out"><div class="big ' + (b3 === 'TRUE' ? 'good' : b3 === 'FALSE' ? 'bad' : 'warn') + '"><b>' + esc(res) + '</b><span>what ' + esc(ENGINE_LABEL[st.e]) + ' returned' + (st.e === 'sqlite' && res !== 'NULL' ? ' (SQLite has no boolean type, so it returns 1 and 0)' : '') + '</span></div>' +
            '<div class="big ' + (b3 === 'TRUE' ? 'good' : 'warn') + '"><b>' + (b3 === 'TRUE' ? 'kept' : 'dropped') + '</b><span>a WHERE clause with this test keeps the row only for TRUE</span></div></div>' +
            '<h3 class="lab-h">All nine answers for ' + esc(st.op) + '</h3>' +
            table(['left \\ right'].concat(VALS), VALS.map(function (a, ai) { return [a].concat(o.grid[st.e][ai]); }), null, function (r, ri, ci) { return ci > 0 && r[ci] === 'NULL' ? 'wwarn' : (ci === 0 ? '' : ''); });
        } else {
          var sn = A.local.ni || (A.local.ni = { fix: false, e: 'duckdb' });
          var asWritten = G.on('m2.not_in', sn.e), rowsN = {};
          asWritten.rows.forEach(function (r) { rowsN[r[0]] = r[1]; });
          var fixed = G.on('m2.not_in_fixed', sn.e);
          var count = sn.fix ? String(fixed.rows.length) : rowsN['NOT IN'];
          var subq = sn.fix ? 'SELECT customer_id FROM orders WHERE customer_id IS NOT NULL' : 'SELECT customer_id FROM orders';
          h += '<div class="lab-row"><span class="lab-l">Subquery</span><div class="sel-chips">' + chips(['as written', 'NULLs removed'], sn.fix ? 'NULLs removed' : 'as written', 'ni-fix') + '</div>' +
            '<span class="lab-l">Engine</span><div class="sel-chips">' + chips(NOTIN, sn.e, 'ni-e', function (k) { return G.engine(k); }) + '</div></div>' +
            code(G.engine(sn.e), 'sql', 'SELECT customer_id, name\nFROM customers\nWHERE customer_id NOT IN (' + subq + ');') +
            '<div class="lab-out"><div class="big ' + (sn.fix ? 'good' : 'bad') + '"><b>' + esc(count) + '</b><span>customers returned by NOT IN</span></div>' +
            '<div class="big good"><b>' + esc(rowsN['NOT EXISTS']) + '</b><span>NOT EXISTS</span></div><div class="big good"><b>' + esc(rowsN['LEFT JOIN']) + '</b><span>LEFT JOIN with IS NULL</span></div></div>' +
            '<h3 class="lab-h">The customers who never ordered</h3>' + table(fixed.cols, fixed.rows) +
            '<div class="callout ' + (sn.fix ? 'good' : 'bad') + '">' + (sn.fix ? 'With the NULLs filtered out of the list, `NOT IN` finds the same ' + fixed.rows.length + ' customers as `NOT EXISTS`.' : 'The guest order has `customer_id` NULL. `x NOT IN (1, 3, NULL)` is never TRUE, so **no customer is returned**. `NOT EXISTS` and `LEFT JOIN` do not have this problem.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          var st0 = A.local.nu, sn0 = A.local.ni;
          if (act === 'nu-op') st0.op = v; if (act === 'nu-a') st0.a = v; if (act === 'nu-b') st0.b = v; if (act === 'nu-e') st0.e = v;
          if (act === 'ni-fix') sn0.fix = v === 'NULLs removed'; if (act === 'ni-e') sn0.e = v;
          A.render(true);
        };
      }
    };
    SQ.info.nulls = { lookup: lookup, ops: opNames, vals: VALS };
  })();

  /* ====================== mission 3: join types and where the filter goes ====================== */
  (function () {
    var TYPES = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'];
    var KEEPS = {
      INNER: 'Only the pairs that match. A customer with no order and an order with no customer are both gone.',
      LEFT: 'Every customer, with the order columns filled with NULL when there is no match. Orders with no customer are gone.',
      RIGHT: 'Every order, with the customer columns filled with NULL when there is no match. Customers with no order are gone.',
      FULL: 'Everything: the matches, the customers with no order and the orders with no customer.',
      CROSS: 'Every customer paired with every order. No condition. Rows = customers times orders.'
    };
    function typeInfo(t) { return G.counts('m3.jointypes').types.filter(function (x) { return x.type === t; })[0]; }
    function leftOn() { return G.table('m3.left_on'); }
    function onwhere() { var o = {}; G.on('m3.onwhere_counts', 'duckdb').rows.forEach(function (r) { o[r[0]] = r[1]; }); return o; }
    W.jointypes = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick a join type.' : 'Move the filter between ON and WHERE.'; },
      say: function (s, i) {
        return [
          'Eight customers and twelve orders. Pick a join type and see which rows survive. The yellow rows are the ones where one side is missing and the engine filled the columns with NULL. DuckDB, PostgreSQL and SQLite returned the same row counts.',
          'A LEFT JOIN keeps every customer only while the test on the right table stays in the ON clause. If you move that test to WHERE, the NULL rows fail it and the LEFT JOIN turns into an inner join.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var h = '<div class="lab">';
        if (i === 0) {
          var st = A.local.jt || (A.local.jt = { t: 'INNER' }), ti = typeInfo(st.t), tb = G.table(ti.sql_key);
          var cut = st.t === 'CROSS' ? 14 : 99, rows = tb.rows.slice(0, cut), nulls = function (r) { return r[0] === 'NULL' || r[2] === 'NULL' ? 'dup' : ''; };
          h += '<div class="sel-chips">' + chips(TYPES, st.t, 'jt-t', function (k) { return k + ' JOIN'; }) + '</div>' +
            code('join', 'sql', G.file(ti.sql_key)) +
            '<div class="lab-out"><div class="big"><b>' + ti.rows.duckdb + '</b><span>rows on DuckDB</span></div><div class="big"><b>' + ti.rows.postgres + '</b><span>on PostgreSQL</span></div><div class="big"><b>' + ti.rows.sqlite + '</b><span>on SQLite</span></div></div>' +
            '<div class="callout tip"><b>Keeps.</b> ' + md(KEEPS[st.t]) + '</div>' +
            '<h3 class="lab-h">' + (st.t === 'CROSS' ? 'The first 14 of ' + tb.rows.length + ' rows' : 'The ' + tb.rows.length + ' rows') + '</h3>' + table(tb.cols, rows, function (r) { return nulls(r); });
        } else {
          var sv = A.local.jw || (A.local.jw = { v: 'filter in ON' }), oc = onwhere();
          var variants = ['no filter', 'filter in ON', 'filter in WHERE'];
          var sqlText = {
            'no filter': 'SELECT c.customer_id, c.name, o.order_id\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id',
            'filter in ON': "SELECT c.customer_id, c.name, o.order_id\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = 'paid'",
            'filter in WHERE': "SELECT c.customer_id, c.name, o.order_id\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nWHERE o.status = 'paid'"
          }[sv.v];
          var perCustomer = sv.v === 'filter in ON' ? leftOn() : sv.v === 'filter in WHERE' ? G.table('m3.left_where') : null;
          var kept = perCustomer ? perCustomer.rows.length : 8;
          h += '<div class="sel-chips">' + chips(variants, sv.v, 'jw-v') + '</div>' + code('left join', 'sql', sqlText) +
            '<div class="lab-out"><div class="big ' + (sv.v === 'filter in WHERE' ? 'bad' : 'good') + '"><b>' + esc(oc[sv.v]) + '</b><span>rows of the join</span></div>' +
            '<div class="big ' + (sv.v === 'filter in WHERE' ? 'bad' : 'good') + '"><b>' + (sv.v === 'no filter' ? 8 : kept) + '</b><span>customers that are still there</span></div></div>' +
            (perCustomer ? '<h3 class="lab-h">Paid orders for each customer</h3>' + table(perCustomer.cols, perCustomer.rows, function (r) { return r[2] === '0' ? 'dup' : ''; }) : '<h3 class="lab-h">Without a filter the left join has 13 rows: 8 customers, where 2 have no order at all.</h3>') +
            '<div class="callout ' + (sv.v === 'filter in WHERE' ? 'bad' : 'tip') + '">' + md(sv.v === 'filter in WHERE' ? 'The customers with no paid order have NULL in `o.status`. `NULL = \'paid\'` is unknown, so WHERE drops them. The LEFT JOIN now behaves like an INNER JOIN.' : sv.v === 'filter in ON' ? 'The test is part of the match. A customer with no paid order still has a row, with NULL order columns. `count(o.order_id)` gives 0 for them.' : 'The plain LEFT JOIN: every customer, and every order of each.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'jt-t') A.local.jt.t = v; if (act === 'jw-v') A.local.jw.v = v; A.render(true); };
      }
    };
    SQ.info.jointypes = { types: TYPES, typeInfo: typeInfo, onwhere: onwhere };
  })();

  /* ====================== mission 3: the fan-out lab ====================== */
  (function () {
    var METHODS = [['sum', 'sum(o.total)'], ['distinct', 'sum(DISTINCT o.total)'], ['preaggregate', 'pre-aggregate, then join']];
    function combos() { return G.counts('m3.fanout').combos; }
    function find(items, pay, m) { return combos().filter(function (c) { return c.items === items && c.payments === pay && c.method === m; })[0]; }
    function truth() { return G.counts('m3.fanout').truth; }
    function num(x) { return parseFloat(x); }
    W.fanout = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Switch the joins and the way you total.' : 'Read all twelve answers.'; },
      say: function (s, i) {
        return [
          'Nine paid orders are worth ' + truth() + '. Join them to their lines or to their payments, and the same query gives other numbers. Switch the joins and the way you total, and watch the rows and the revenue.',
          'Here are all twelve answers. Every plain sum over a join that multiplies rows is wrong. `sum(DISTINCT)` is right on these nine orders only by luck. Pre-aggregating to the grain of the order is right every time.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var h = '<div class="lab">';
        if (i === 0) {
          var st = A.local.fo || (A.local.fo = { items: false, pay: true, m: 'sum' }), c = find(st.items, st.pay, st.m), r = c.result.duckdb;
          var good = num(r[2]) === num(truth()), same = ['postgres', 'sqlite'].every(function (e) { return num(c.result[e][2]) === num(r[2]) && c.result[e][0] === r[0]; });
          h += '<div class="lab-row"><span class="lab-l">Join lines</span><div class="sel-chips">' + chips(['no', 'yes'], st.items ? 'yes' : 'no', 'fo-i') + '</div><span class="lab-l">Join payments</span><div class="sel-chips">' + chips(['no', 'yes'], st.pay ? 'yes' : 'no', 'fo-p') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Total with</span><div class="sel-chips">' + chips(METHODS.map(function (m) { return m[0]; }), st.m, 'fo-m', function (k) { return METHODS.filter(function (m) { return m[0] === k; })[0][1]; }) + '</div></div>' +
            code('revenue of paid orders', 'sql', c.sql) +
            '<div class="lab-out"><div class="big"><b>' + r[0] + '</b><span>rows after the joins</span></div><div class="big"><b>' + r[1] + '</b><span>different orders</span></div><div class="big ' + (good ? 'good' : 'bad') + '"><b>' + esc(r[2]) + '</b><span>' + (good ? 'revenue: correct, ' + truth() + ' is the true total' : 'revenue: wrong, the true total is ' + truth()) + '</span></div></div>' +
            '<div class="callout ' + (good ? 'good' : 'bad') + '">' + md(r[0] !== r[1] ? 'There are **' + r[0] + ' rows for ' + r[1] + ' orders**, so an order appears more than once and its total is added more than once.' : 'There is **one row for each order**, so the sum cannot count an order twice.') + (same ? ' PostgreSQL and SQLite gave the same numbers.' : '') + '</div>';
        } else {
          var rows = [];
          [[false, false], [false, true], [true, false], [true, true]].forEach(function (k) {
            METHODS.forEach(function (m) { var c2 = find(k[0], k[1], m[0]); rows.push([(k[0] ? 'lines' : '') + (k[0] && k[1] ? ' and ' : '') + (k[1] ? 'payments' : '') || 'orders only', m[1], c2.result.duckdb[0], c2.result.duckdb[2]]); });
          });
          var dt = G.table('m3.distinct_trap').rows[0];
          h += table(['Joined with', 'Total with', 'Rows', 'Revenue'], rows, function (r) { return num(r[3]) === num(truth()) ? '' : 'dup'; }) +
            '<div class="callout warn"><b>DISTINCT hides duplicates by value, not by row.</b> On the 30,000 big orders, ' + G.n(dt[0]) + ' paid orders have only ' + dt[3] + ' different totals. `sum(DISTINCT total)` returned **' + G.n(dt[2].split('.')[0]) + '**. `sum(total)` returned **' + G.n(dt[1].split('.')[0]) + '**.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); var f = A.local.fo; if (act === 'fo-i') f.items = v === 'yes'; if (act === 'fo-p') f.pay = v === 'yes'; if (act === 'fo-m') f.m = v; A.render(true); };
      }
    };
    SQ.info.fanout = { find: find, truth: truth, methods: METHODS };
  })();

  /* ====================== mission 4: grouping sets explorer ====================== */
  (function () {
    function variants() { return G.counts('m4.sets').variants; }
    function find(label) { return variants().filter(function (v) { return v.label === label; })[0]; }
    var NOTES = {
      'by store': 'A plain GROUP BY: one row for each store. No subtotals.',
      'by channel': 'A plain GROUP BY on another column: one row for each channel.',
      'by store and channel': 'One row for each pair of store and channel that exists. There is no row for a store in total.',
      'ROLLUP (store, channel)': 'ROLLUP adds a subtotal for each store, and a grand total. Order matters: it rolls up from the right, so the subtotals are by store.',
      'ROLLUP (channel, store)': 'The same columns in the other order give subtotals for each channel instead. ROLLUP is not symmetric.',
      'CUBE (store, channel)': 'CUBE gives every combination: the pairs, the subtotals by store, the subtotals by channel and the grand total.',
      'GROUPING SETS': 'You list the groupings you want. Here: by store, by channel and the grand total. There are no rows for the pairs.'
    };
    W.rollup = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick a way to group.' : 'Compare the row counts.'; },
      say: function (s, i) {
        return [
          'Nine paid orders, grouped in seven ways. The NULLs that you see in store_id and channel are not data: they mark a subtotal row. `GROUPING(col)` is 1 on those rows, so you can tell a subtotal from a real NULL. DuckDB and PostgreSQL returned the same rows.',
          'Count the rows. A subtotal row is an extra row, so the sums of a column that includes subtotals are not the total of the table. Filter on the GROUPING flags before you add a column up.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var h = '<div class="lab">', list = variants();
        if (i === 0) {
          var st = A.local.ro || (A.local.ro = { v: 'ROLLUP (store, channel)' }), v = find(st.v), tb = G.table(v.key);
          h += '<div class="sel-chips">' + chips(list.map(function (x) { return x.label; }), st.v, 'ro-v') + '</div>' +
            code('grouping', 'sql', G.file(v.key)) +
            '<div class="lab-out"><div class="big"><b>' + v.rows + '</b><span>rows</span></div><div class="big ' + (v.agree ? 'good' : 'bad') + '"><b>' + (v.agree ? 'same' : 'differs') + '</b><span>on ' + v.engines.map(function (e) { return ENGINE_LABEL[e]; }).join(', ') + '</span></div></div>' +
            table(tb.cols, tb.rows, function (r) { return r.some(function (c, k) { return /^g_/.test(tb.cols[k]) && c === '1'; }) ? 'inframe' : ''; }, function (r, ri, ci) { return r[ci] === 'NULL' && /^(store_id|channel)$/.test(tb.cols[ci]) ? 'wwarn' : ''; }) +
            '<div class="callout tip">' + md(NOTES[st.v]) + '</div>' +
            (/ROLLUP|CUBE|SETS/.test(st.v) ? '<div class="callout warn">SQLite has no ROLLUP, CUBE or GROUPING SETS. It answered: <b>' + esc(G.text('m4.rollup_sqlite.error')) + '</b>.</div>' : '');
        } else {
          h += table(['Grouping', 'Rows'], list.map(function (x) { return [x.label, String(x.rows)]; }), null, function (r, ri, ci) { return ''; }) +
            '<div class="callout tip">Rows: 3 stores, 3 channels and 7 pairs. ROLLUP over two columns adds 3 store subtotals and 1 grand total to the 7 pairs: 11 rows. CUBE adds 3 channel subtotals too: 14 rows.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'ro-v') A.local.ro.v = el.getAttribute('data-v'); A.render(true); };
      }
    };
    SQ.info.rollup = { variants: variants, find: find };
  })();

  /* ====================== mission 5: the recursive CTE stepper ====================== */
  (function () {
    function rows() { return G.on('m5.tree_iterations', 'duckdb'); }
    function iter(n) { return rows().rows.filter(function (r) { return +r[0] === n; }); }
    function maxIter() { return rows().rows.reduce(function (m, r) { return Math.max(m, +r[0]); }, 0); }
    function cumulative(n) { return rows().rows.filter(function (r) { return +r[0] <= n; }); }
    W.recursive = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Press the iterations one by one.' : 'See what a cycle does.'; },
      say: function (s, i) {
        return [
          'This recursive CTE walks the category tree. The anchor starts at the root. Each iteration adds the children of the rows added by the last one. Step through the iterations and watch the working table. The loop stops when an iteration adds no rows.',
          'A cycle in the data breaks that stop rule. Here category 1 was made a child of category 9, which is below it. `UNION` drops rows it has seen, so the walk ends. `UNION ALL` keeps going until a depth guard stops it.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var h = '<div class="lab">';
        if (i === 0) {
          var st = A.local.rc || (A.local.rc = { n: 0 }), last = maxIter() + 1, sql = G.file('m5.tree_iterations');
          var produced = iter(st.n), work = st.n === 0 ? [] : iter(st.n - 1), cum = cumulative(st.n);
          var hl = st.n === 0 ? G.span(sql, /SELECT category_id, name, 0 AS iteration/, /WHERE parent_id IS NULL/) : G.span(sql, /SELECT c\.category_id/, /JOIN tree/);
          var cols = ['iteration', 'category_id', 'name'];
          h += '<div class="sel-chips">' + chips(Array.apply(null, Array(last + 1)).map(function (_, k) { return k; }), st.n, 'rc-n', function (k) { return k === 0 ? 'anchor' : k === last ? 'iteration ' + k + ' (stop)' : 'iteration ' + k; }) + '</div>' +
            code('recursive CTE', 'sql', sql, hl) +
            '<div class="pair"><div><h3 class="lab-h">Working table: what the step reads</h3>' + (st.n === 0 ? '<p class="lab-note">Empty. The anchor does not read it.</p>' : table(cols, work)) + '</div>' +
            '<div><h3 class="lab-h">Rows this ' + (st.n === 0 ? 'anchor' : 'step') + ' produced</h3>' + (produced.length ? table(cols, produced, function () { return 'new'; }) : '<p class="lab-note">None. The step found no children, so the loop ends.</p>') + '</div></div>' +
            '<div class="lab-out"><div class="big"><b>' + produced.length + '</b><span>rows added</span></div><div class="big"><b>' + cum.length + '</b><span>rows in the result so far</span></div><div class="big ' + (produced.length ? 'warn' : 'good') + '"><b>' + (produced.length ? 'go on' : 'stop') + '</b><span>' + (produced.length ? 'the new rows become the working table' : 'the result is complete') + '</span></div></div>';
        } else {
          var u = G.on('m5.cycle_union', 'duckdb').rows[0][0], ua = G.on('m5.cycle_union_all', 'duckdb').rows[0];
          h += '<div class="pair"><div>' + code('UNION: drops rows it has seen', 'sql', G.file('m5.cycle_union')) + '<div class="lab-out"><div class="big good"><b>' + u + '</b><span>categories reached, then the walk ends</span></div></div></div>' +
            '<div>' + code('UNION ALL with a depth guard', 'sql', G.file('m5.cycle_union_all')) + '<div class="lab-out"><div class="big bad"><b>' + ua[0] + '</b><span>rows produced, until depth ' + ua[1] + '</span></div></div></div></div>' +
            '<div class="callout warn">`UNION ALL` is faster because it does not compare rows, and it is the right choice for a tree. With a cycle it never ends, so the engine needs a guard such as `depth < 20`, or the query runs until it uses all memory or disk. DuckDB, PostgreSQL and SQLite gave the same two numbers.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'rc-n') A.local.rc.n = +el.getAttribute('data-v'); A.render(true); };
      }
    };
    SQ.info.recursive = { iter: iter, maxIter: maxIter, cumulative: cumulative };
  })();

  /* the helpers are shared with part 2 (widgets2.js) */
  SQ.u = { chips: chips, table: table, code: code, bindCodes: bindCodes, pre: pre, ENGINES: ENGINES, ENGINE_LABEL: ENGINE_LABEL };
})();
