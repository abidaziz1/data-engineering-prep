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

  /* the helpers are shared with part 2 (widgets2.js) */
  SQ.u = { chips: chips, table: table, code: code, bindCodes: bindCodes, pre: pre, ENGINES: ENGINES, ENGINE_LABEL: ENGINE_LABEL };
})();
