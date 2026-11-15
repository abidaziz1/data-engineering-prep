/* BI course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: DuckDB on the made-up Brewline star schema. Where a lab applies a rule to a setting that
   was not run (a refresh window of six months, 200 viewers), it says "Computed", and verify/check_widgets.js checks the rule against the recording.
   Power BI, Tableau and Looker did not run. Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return '<div class="sel-chips">' + list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('') + '</div>';
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span>' + inner + '</div>'; }
  function table(cols, rows, rowCls, numFrom) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c, ci) { return '<th' + (numFrom != null && ci >= numFrom ? ' class="num"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td' + (numFrom != null && ci >= numFrom ? ' class="num"' : '') + '>' + esc(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function callout(kind, text) { return '<div class="callout ' + kind + '">' + md(text) + '</div>'; }
  function note(recorded, computed) {
    return '<p class="lab-note"><span class="pill real">Recorded</span>' + md(recorded) + (computed ? ' <span class="pill">Computed</span>' + md(computed) : '') + '</p>';
  }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(1, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n">' + esc(label) + '</span><div class="lane-track"><i class="' + (cls || '') + '" style="width:' + pc + '%"></i></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  var n = G.n;
  function money(x) { return '$' + n(x); }

  /* ====================== 1. A join that multiplies rows ====================== */
  W.fanout = (function () {
    var WAYS = [['orders', 'Sum from the orders table'], ['join', 'Join the lines, then sum'], ['pre', 'Sum the lines to the order first']];
    /* the rows that each way reads, for the four small orders */
    function rowsFor(way, orders, lines) {
      if (way === 'orders') return orders.map(function (o) { return { order: o[0], line: '', fee: o[1], amount: '' }; });
      if (way === 'join') return lines.map(function (l) { var o = orders.filter(function (x) { return x[0] === l[0]; })[0]; return { order: l[0], line: l[1], fee: o[1], amount: l[2] }; });
      return orders.map(function (o) { return { order: o[0], line: 'all', fee: o[1], amount: lines.filter(function (l) { return l[0] === o[0]; }).reduce(function (a, l) { return a + l[2]; }, 0) }; });
    }
    function total(rows) { return rows.reduce(function (a, r) { return a + r.fee; }, 0); }
    W.fanoutInfo = { rowsFor: rowsFor, total: total };
    return {
      steps: function () { return 1; },
      hint: 'Pick a way to add up the shipping fees.',
      say: function () { return 'Four Brewline orders. The shipping fee is stored once for each order, and the products are stored as lines. A tile wants the total shipping. Pick the way the query adds it up, and count the rows it reads.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.fo || (A.local.fo = { way: 'orders' });
        var orders = G.table('model.lab_orders').rows, lines = G.table('model.lab_lines').rows, F = G.counts('model.fanout');
        var rows = rowsFor(st.way, orders, lines), tot = total(rows), right = total(rowsFor('orders', orders, lines)), seen = {};
        var h = '<div class="lab">' + row('The query', chips(WAYS.map(function (w) { return w[0]; }), st.way, 'fo-w', function (k) { return WAYS.filter(function (w) { return w[0] === k; })[0][1]; }));
        h += table(['order_id', 'line', 'shipping_fee', 'line_amount'], rows.map(function (r) { return [r.order, r.line, r.fee.toFixed(2), r.amount === '' ? '' : Number(r.amount).toFixed(2)]; }),
          function (r) { var again = seen[r[0]]; seen[r[0]] = true; return again ? 'dup' : ''; }, 2);
        h += big([[rows.length, 'rows the sum reads'], [money(tot.toFixed(2)), 'shipping total of the four orders', tot === right ? 'good' : 'bad'], [money(right.toFixed(2)), 'the right answer']]);
        h += st.way === 'join'
          ? callout('bad', 'An order with two lines appears twice, and its fee is added twice. The red rows are the repeats. Nothing fails and no error is shown: the tile shows a number that is too high.')
          : st.way === 'pre'
            ? callout('good', 'The lines were summed to one row for each order before the join. One order meets one row, so the fee is added once, and the revenue is still there.')
            : callout('tip', 'The fee has the grain of the order, so the orders table is the place to add it up. The lines are not needed for this number.');
        h += note(' On all ' + n(F.orders) + ' orders: the orders table gives ' + money(F.shipping_right) + ', the join to the ' + n(F.lines) + ' lines gives ' + money(F.shipping_wrong) + ' (' + F.times_too_high + ' times too high), and the lines summed first give ' + money(F.shipping_fixed) + '.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'fo-w') st.way = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. Import or live ====================== */
  W.modes = (function () {
    var VIEWERS = [5, 40, 200], EVERY = [24, 4, 1];
    /* what one hour costs the warehouse, and how old the numbers can be */
    function plan(mode, viewers, everyHours, P, factRows) {
      if (mode === 'live') return { queries: viewers * P.tiles, rows: viewers * P.rows_read_all_from_fact, ageHours: 0 };
      return { queries: 1 / everyHours, rows: factRows / everyHours, ageHours: everyHours };
    }
    W.modesInfo = { plan: plan };
    return {
      steps: function () { return 1; },
      hint: 'Change the mode, the viewers and the refresh.',
      say: function () { return 'One dashboard page with six tiles. With a copy in the tool, the warehouse works only when the copy is refreshed. With a live connection, the warehouse answers every tile for every viewer. Change the numbers and compare the load with the age of the data.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.mo || (A.local.mo = { mode: 'copy', viewers: 40, every: 24 });
        var P = G.counts('perf.page'), fact = G.counts('perf.agg').fact_rows, p = plan(st.mode, st.viewers, st.every, P, fact), live = plan('live', st.viewers, st.every, P, fact), copy = plan('copy', st.viewers, st.every, P, fact);
        var h = '<div class="lab">' + row('Mode', chips(['copy', 'live'], st.mode, 'mo-m', function (k) { return k === 'copy' ? 'A copy in the tool (import, extract)' : 'Live (DirectQuery, live connection, Looker)'; }));
        h += row('Viewers who open the page in an hour', chips(VIEWERS, st.viewers, 'mo-v'));
        if (st.mode === 'copy') h += row('Refresh the copy every', chips(EVERY, st.every, 'mo-e', function (k) { return k === 1 ? 'hour' : k + ' hours'; }));
        h += big([[st.mode === 'live' ? n(p.queries) : (st.every === 1 ? '1 refresh' : '1 refresh in ' + st.every + ' h'), st.mode === 'live' ? 'queries to the warehouse in the hour' : 'load on the warehouse', st.mode === 'live' && p.queries > 500 ? 'warn' : ''],
          [n(Math.round(p.rows)), 'rows the warehouse reads in an average hour'], [p.ageHours === 0 ? 'the last load' : 'up to ' + p.ageHours + ' h', 'age of the numbers behind the warehouse', p.ageHours >= 24 ? 'warn' : 'good']]);
        var mx = Math.max(live.rows, copy.rows);
        h += '<div class="lab-h">Rows read from the fact table in an average hour</div>' + bar('A copy, refreshed', copy.rows, mx, n(Math.round(copy.rows)), st.mode === 'copy' ? 'good' : '') + bar('Live, every tile', live.rows, mx, n(Math.round(live.rows)), st.mode === 'live' ? 'bad' : '');
        h += st.mode === 'live'
          ? callout('tip', 'Live means that nobody waits for a refresh, and that the warehouse pays for every click. With ' + st.viewers + ' viewers the page sends **' + n(p.queries) + '** queries. A cache in the tool and an aggregate table (mission 6) are what make this affordable.')
          : callout('tip', 'A copy answers from memory, so viewers cost the warehouse nothing. The price is age: a number can be up to **' + st.every + ' hours** older than the warehouse, and a full refresh reads all ' + n(fact) + ' lines again. Mission 5 makes the refresh smaller.');
        h += note(' The page has ' + P.tiles + ' tiles and the fact table has ' + n(fact) + ' lines.', ' The rest is arithmetic: every viewer opens the page once, every tile sends one query, no query is cached, and a refresh reads the whole fact table once.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'mo-m') st.mode = v; if (act === 'mo-v') st.viewers = +v; if (act === 'mo-e') st.every = +v; A.render(true); };
      }
    };
  })();

  /* ====================== 3. A measure and the filters around it ====================== */
  W.context = (function () {
    var REGIONS = ['All', 'North', 'South', 'East', 'West'], CATS = ['All', 'Coffee', 'Tea', 'Equipment', 'Merch'];
    function cell(region, cat) {
      var r = G.table('measures.lab').rows.filter(function (x) { return x[0] === region && x[1] === cat; })[0];
      return { revenue: r[2], orders: r[3], customers: r[4] };
    }
    W.contextInfo = { cell: cell, regions: REGIONS, cats: CATS };
    return {
      steps: function () { return 1; },
      hint: 'Click a region and a category, as a viewer would.',
      say: function () { return 'A measure is a formula, not a stored number. The report puts filters around it, and the same formula gives another number in every cell. Click a region and a category for March 2026, and watch which measures follow the filter and which one ignores it.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cx || (A.local.cx = { region: 'All', cat: 'All' });
        var c = cell(st.region, st.cat), all = cell('All', st.cat), aov = c.revenue / c.orders, share = c.revenue / all.revenue * 100;
        var h = '<div class="lab">' + row('Region', chips(REGIONS, st.region, 'cx-r')) + row('Category', chips(CATS, st.cat, 'cx-c'));
        h += table(['Measure', 'Value in this cell', 'What the filter did'], [
          ['Revenue', money(c.revenue), 'followed both filters'],
          ['Orders', n(c.orders), 'followed both filters'],
          ['Average order value', money(aov.toFixed(2)), 'revenue divided by orders, both inside the filters'],
          ['Customers', n(c.customers), 'a distinct count inside the filters'],
          ['Revenue all regions', money(all.revenue), 'ignored the region, kept the category'],
          ['Share of revenue', share.toFixed(1) + ' %', 'this cell divided by the row above']
        ], function (r, k) { return k >= 4 ? 'new' : ''; }, 1);
        h += st.region === 'All'
          ? callout('tip', 'With no region picked, the cell is all regions, so the share is **100.0 %**. Pick a region.')
          : callout('tip', 'Region ' + st.region + ' has **' + share.toFixed(1) + ' %** of the revenue' + (st.cat === 'All' ? '' : ' of ' + st.cat) + '. The denominator is a measure that removes the region filter on purpose. In DAX that is `CALCULATE` with `REMOVEFILTERS`, in Tableau a `FIXED` level of detail expression, and in SQL a window over all rows.');
        h += note(' Every number in the first four rows and the fifth is a query result for March 2026: 25 combinations of region and category.', ' The average and the share are divisions of two recorded numbers.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'cx-r') st.region = v; if (act === 'cx-c') st.cat = v; A.render(true); };
      }
    };
  })();

  /* ====================== 4. A refresh policy ====================== */
  W.refresh = (function () {
    var WINDOWS = [1, 2, 6], KEEP = 12;
    /* months: [[month, rows, changedToday]]. Returns what a policy does with each month. */
    function plan(months, refreshMonths, alsoChanged) {
      var k = months.length;
      return months.map(function (m, idx) {
        var kept = idx >= k - KEEP, inWindow = idx >= k - refreshMonths, changed = m[2] > 0;
        var refreshed = kept && (inWindow || (alsoChanged && changed));
        return { month: m[0], rows: m[1], kept: kept, refreshed: refreshed, stale: kept && changed && !refreshed };
      });
    }
    W.refreshInfo = { plan: plan, keep: KEEP };
    return {
      steps: function () { return 1; },
      hint: 'Change the window, then switch on the second rule.',
      say: function () { return 'The imported table is cut into one partition for each month. A refresh policy keeps the last twelve months and reloads only the newest ones. Today a refund was booked on an order from November. Change the window and see whether the model still agrees with the warehouse.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.rf || (A.local.rf = { win: 2, also: 'off' });
        var T = G.table('refresh.partitions').rows.map(function (r) { return [r[0], r[1], r[4]]; }), R = G.counts('refresh.policy');
        var p = plan(T, st.win, st.also === 'on'), full = p.reduce(function (a, x) { return a + x.rows; }, 0), done = p.filter(function (x) { return x.refreshed; }).reduce(function (a, x) { return a + x.rows; }, 0);
        var stale = p.filter(function (x) { return x.stale; }), diff = stale.length ? R.late_order_amount : 0;
        var h = '<div class="lab">' + row('Refresh the newest', chips(WINDOWS, st.win, 'rf-w', function (k) { return k === 1 ? '1 month' : k + ' months'; }));
        h += row('Also refresh a month that has a change', chips(['off', 'on'], st.also, 'rf-a'));
        h += '<div class="parts">' + p.map(function (x) {
          var cls = !x.kept ? 'drop' : x.stale ? 'stale' : x.refreshed ? 'refresh' : '';
          return '<div class="part ' + cls + '">' + esc(x.month) + '<small>' + (!x.kept ? 'dropped' : x.stale ? 'out of date' : x.refreshed ? 'reloaded' : 'kept') + '</small></div>';
        }).join('') + '</div>';
        h += big([[n(done), 'rows reloaded'], [(done / full * 100).toFixed(1) + ' %', 'of a full refresh (' + n(full) + ' rows)'], [diff ? money(diff.toFixed(2)) : 'none', 'difference from the warehouse', diff ? 'bad' : 'good']]);
        h += stale.length
          ? callout('bad', 'The refund is in **' + stale[0].month + '**, outside the window. That partition was not reloaded, so the model still counts the order as completed and shows **' + money(diff.toFixed(2)) + '** too much. No refresh failed. The red month is simply old.')
          : callout('good', (st.also === 'on' && st.win < 5 ? 'The source says which months hold a change, and those partitions are reloaded by name. ' : 'The window is wide enough to reach November. ') + 'The model and the warehouse agree again.');
        h += note(' With a window of two months the refresh reloaded ' + n(R.rows_incremental_refresh) + ' rows (' + R.percent_of_full + ' % of a full refresh) and the model was ' + money(R.difference_after_incremental.toFixed(2)) + ' above the warehouse. Reloading the months with a change, ' + R.months_with_changes_today.join(' and ') + ', brought the difference to ' + R.difference_after_refreshing_changed_months + '.', ' The other settings apply the same rule to the recorded rows of each month.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'rf-w') st.win = +v; if (act === 'rf-a') st.also = v; A.render(true); };
      }
    };
  })();

  /* ====================== 5. Which table answers a tile ====================== */
  W.agg = (function () {
    function answer(tileRow, hasAgg, factRows) { return hasAgg ? { table: tileRow[1], rows: tileRow[2] } : { table: 'fact_order_lines', rows: factRows }; }
    W.aggInfo = { answer: answer };
    return {
      steps: function () { return 1; },
      hint: 'Click a tile, then take the aggregate table away.',
      say: function () { return 'Six tiles on one page. An aggregate table holds one row for each day, store and category. Click a tile and see which table can answer it, and how many rows that table has. Then switch the aggregate table off.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ag || (A.local.ag = { tile: 0, has: 'yes' });
        var T = G.table('perf.page').rows, C = G.counts('perf.agg'), fact = C.fact_rows, a = answer(T[st.tile], st.has === 'yes', fact);
        var total = T.reduce(function (acc, r) { return acc + answer(r, st.has === 'yes', fact).rows; }, 0), why = { 3: 'The aggregate has the category and not the product, so it cannot rank products.', 4: 'A distinct count of customers does not add up over days and stores.' };
        var h = '<div class="lab">' + row('Aggregate table', chips(['yes', 'no'], st.has, 'ag-h', function (k) { return k === 'yes' ? 'exists' : 'does not exist'; }));
        h += '<div class="lab-h">Tiles on the page</div>' + chips(T.map(function (r, k) { return k; }), st.tile, 'ag-t', function (k) { return T[k][0]; });
        h += big([[a.table, 'the table that answers this tile'], [n(a.rows), 'rows in that table', a.rows === fact ? 'warn' : 'good'], [n(total), 'rows behind all six tiles']]);
        h += '<div class="lab-h">Rows behind each tile</div>' + T.map(function (r, k) { var x = answer(r, st.has === 'yes', fact); return bar(r[0], x.rows, fact, n(x.rows), x.rows === fact ? 'bad' : 'good'); }).join('');
        h += st.has === 'no'
          ? callout('bad', 'Without the aggregate table every tile reads all **' + n(fact) + '** lines: ' + n(total) + ' rows for one opening of the page.')
          : a.rows === fact
            ? callout('warn', why[st.tile] + ' This tile goes to the fact table whatever you build.')
            : callout('good', 'The tile groups by columns that the aggregate has, and its measure adds up. **' + n(a.rows) + '** rows are enough: ' + C.times_fewer_rows + ' times fewer than the fact table.');
        h += note(' The aggregate table has ' + n(C.agg_rows) + ' rows and the fact table ' + n(fact) + '. The revenue tile gave the same twelve numbers from both. Adding the daily customer counts of the aggregate for March gives ' + n(C.customers_march_summed_from_agg) + ', and the true count is ' + n(C.customers_march_true) + '.', ' Which table a tile needs is a rule about its columns and its measure. Rows in a table are not the same as rows read: a warehouse can skip rows with a filter.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ag-h') st.has = v; if (act === 'ag-t') st.tile = +v; A.render(true); };
      }
    };
  })();

  /* ====================== 6. Who sees which rows ====================== */
  W.rls = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Sign in as each person.',
      say: function () { return 'One dashboard, five people. A table says which regions each person may see, and the tool turns that into a filter on every query. Sign in as each of them and read the same revenue tile for March 2026.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.rl || (A.local.rl = { user: 'ana' });
        var U = G.table('rls.users').rows, R = G.table('rls.by_region').rows, S = G.counts('rls.summary'), u = U.filter(function (x) { return x[0] === st.user; })[0];
        var regs = u[2] === 'all regions' ? R.map(function (r) { return r[0]; }) : u[2] === 'none' ? [] : u[2].split(', ');
        var h = '<div class="lab">' + row('Signed in as', chips(U.map(function (x) { return x[0]; }), st.user, 'rl-u'));
        h += big([[u[1], 'job'], [u[2], 'regions in the security table'], [money(u[4]), 'revenue on the tile', u[3] === 0 ? 'bad' : '']]);
        h += table(['region', 'revenue in March 2026', 'this person'], R.map(function (r) { return [r[0], money(r[1]), regs.indexOf(r[0]) >= 0 ? 'sees it' : 'filtered out']; }), function (r) { return r[2] === 'sees it' ? 'new' : 'old'; }, 1);
        h += u[3] === 0
          ? callout('warn', 'A person with no row in the security table sees **nothing**, not everything. That is the safe default, and it is also the support ticket you will get on the first day of a new colleague: "the dashboard is empty".')
          : u[2] === 'all regions'
            ? callout('tip', 'The head of sales has a flag that lifts the filter. The tile shows the whole **' + money(S.march_revenue_all) + '**.')
            : callout('tip', 'The tile is the same and the query has one more condition. ' + u[0] + ' sees **' + n(u[3]) + '** of the ' + n(S.march_lines_all) + ' order lines of March. The total on the tile is the total of the visible rows, so two people can read two different "totals" on the same dashboard.');
        h += note(' Each row is the result of the same query with another email as its parameter. An email that is not in the table at all returned ' + S.unknown_user_lines + ' rows.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'rl-u') st.user = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
