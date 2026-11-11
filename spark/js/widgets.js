/* Lab widgets for the first half of the Apache Spark course: shuffles, tasks, joins, skew, memory and file layout. Each one registers LAB.W.<kind>.
   Every number a lab shows comes from js/real.js, which spark/verify/capture_spark.py wrote after running the real Apache Spark 4.0.1 in local mode on one machine
   and reading the event log back. Nothing here ran on a cluster. A lab that only does arithmetic, or applies a rule from the documentation, says so on screen. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) {
      return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>';
    }).join('');
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + inner + '</div></div>'; }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mb(n) { return n >= 1073741824 ? fmtN(n / 1073741824, 2) + ' GiB' : n >= 1048576 ? fmtN(n / 1048576, 1) + ' MiB' : n >= 1024 ? fmtN(n / 1024, 1) + ' KiB' : fmtN(n) + ' B'; }
  function big(b, span, cls) { return '<div class="big' + (cls ? ' ' + cls : '') + '"><b>' + b + '</b><span>' + span + '</span></div>'; }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n lane-wide">' + esc(label) + '</span><div class="lane-track"><div class="gbar' + (cls ? ' ' + cls : '') + '" style="left:0;width:' + pc + '%">&nbsp;</div></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  function callout(k, t) { return '<div class="callout ' + k + '">' + md(t) + '</div>'; }
  /* a row of small squares, one per task, coloured by the wave that runs it */
  function squares(n, cores) {
    var out = '', cap = Math.min(n, 220);
    for (var k = 0; k < cap; k++) out += '<i class="sq w' + (Math.floor(k / cores) % 4) + '"></i>';
    return '<div class="sqs" aria-hidden="true">' + out + (n > cap ? '<span class="sq-more">+' + (n - cap) + ' more</span>' : '') + '</div>';
  }
  W._h = { chips: chips, row: row, table: table, fmtN: fmtN, mb: mb, big: big, bar: bar, callout: callout, squares: squares };

  /* ====================== Count the shuffles ====================== */
  (function () {
    var WHY = {
      'filter and select': 'Each row is judged on its own, so every task works on its own partition and nothing moves. This is a **narrow** operation.',
      'groupBy and sum': 'The orders of one store sit in many partitions, and they must meet in one place. Spark hashes the key and shuffles. Each task adds up its own rows first, so the shuffle moves partial sums and not orders.',
      'distinct customers': '`distinct` is a group by on every column: the same shape as the group by, with one shuffle.',
      'orderBy': 'A global sort samples the data to cut it into ranges, shuffles each row to its range, and sorts inside each partition: one exchange and one sort.',
      'join to stores (no broadcast)': 'A sort-merge join shuffles **both** sides by the join key and sorts both: two exchanges and two sorts. The broadcast join of mission 4 removes all four.',
      'window by store': 'A window that partitions by store needs every row of a store together, so one exchange, then a sort inside each partition.'
    };
    W.exchange = {
      steps: function () { return 2; },
      hint: 'Pick an operation, guess the number of shuffles, then read the real plan.',
      say: function (s, i) {
        return [
          'A shuffle is the costly step: rows move between machines. Pick an operation, guess how many Exchange lines its plan will have, and then see the number from the real plan. Six operations, all recorded on the Brewline orders.',
          'Here is the whole table. A shuffle appears when a row has to meet rows that live in other partitions. Filters and selects never need it. Grouping, distinct, sorting, joining and windowing always do, unless something removes the need.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('parts.operations'), st = A.local.ex || (A.local.ex = { op: 0, g: {} });
        var h = '<div class="lab">';
        if (i === 0) {
          var r = T.rows[st.op], g = st.g[st.op];
          h += row('Operation', chips(T.rows.map(function (x, n) { return n; }), st.op, 'ex-op', function (n) { return T.rows[n][0]; }));
          h += row('Your guess: shuffles', chips([0, 1, 2, 3], g === undefined ? '' : g, 'ex-g'));
          if (g === undefined) h += '<p class="lab-note">Choose a number to see the plan.</p>';
          else {
            var right = Number(g) === Number(r[1]);
            h += '<div class="lab-out">' + big(r[1], 'Exchange lines in the plan', right ? 'good' : 'warn') + big(r[2], 'sorts in the plan') + big(right ? 'right' : 'not quite', right ? 'your guess matches' : 'you said ' + g, right ? 'good' : 'bad') + '</div>';
            h += callout(right ? 'tip' : 'warn', WHY[r[0]] || 'Read the plan: every Exchange line is a shuffle.');
          }
        } else {
          var good = 0, tried = 0;
          T.rows.forEach(function (x, n) { if (st.g[n] !== undefined) { tried++; if (Number(st.g[n]) === Number(x[1])) good++; } });
          h += table(['Operation', 'Shuffles (Exchange)', 'Sorts', 'Your guess'], T.rows.map(function (x, n) { return [x[0], x[1], x[2], st.g[n] === undefined ? '-' : Number(st.g[n]) === Number(x[1]) ? 'right' : 'said ' + st.g[n]]; }),
            function (x) { return Number(x[1]) === 0 ? 'new' : ''; }, function (x, ri, ci) { return ci === 3 && x[3] === 'right' ? 'wgood' : ci === 3 && /said/.test(x[3]) ? 'wbad' : ''; });
          h += '<div class="lab-out">' + big(good + ' of ' + tried, 'guesses right so far') + '</div>';
          h += callout('tip', 'The rule of thumb: ask "does this row need to meet rows from other partitions?". If yes, there is a shuffle. Count the `Exchange` lines in `explain()` before you run a big job.');
        }
        box.innerHTML = h + '<p class="lab-note">Recorded: Spark 4.0.1 in local mode, plans read with explain on the Brewline orders. The join was run with broadcasting turned off.</p></div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'ex-op') st.op = Number(v);
          else if (act === 'ex-g') st.g[st.op] = Number(v);
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Tasks, cores and waves ====================== */
  (function () {
    W.tasks = {
      steps: function () { return 2; },
      hint: 'Change the setting. Count the tasks, then count the waves on your cores.',
      say: function (s, i) {
        return [
          'The first stage of a query has one task for each input partition. The setting `maxPartitionBytes` and the size of the files decide how many. Pick a setting and a number of cores. The squares are tasks, and a new colour is a new wave. The partition counts are recorded. The waves are arithmetic.',
          'After a shuffle the number of tasks is not the number of files at all. It is `spark.sql.shuffle.partitions`, unless adaptive execution merges small partitions. Pick a setting and read what the tasks of the second stage really did.'
        ][i];
      },
      mood: function (s, i) { return i ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.tk || (A.local.tk = { r: 0, c: 4, sh: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table('parts.read'), p = Number(T.rows[st.r][1]), waves = Math.ceil(p / st.c);
          h += row('maxPartitionBytes', chips(T.rows.map(function (x, n) { return n; }), st.r, 'tk-r', function (n) { return T.rows[n][0]; }));
          h += row('Cores', chips([2, 4, 8, 16], st.c, 'tk-c'));
          h += '<div class="lab-out">' + big(p, 'input partitions = tasks in stage 1') + big(waves, 'waves on ' + st.c + ' cores', waves > 8 ? 'warn' : '') + '</div>' + squares(p, st.c);
          h += callout(p < st.c ? 'warn' : 'tip', p < st.c ? 'Fewer tasks than cores: **some cores sit idle**. More cores will not make this stage faster.' :
            waves === 1 ? 'Every task runs at the same time. This is the fastest the stage can be on these cores.' : 'A task is queued until a core is free. Many short waves are fine. A few long tasks are not.');
          h += '<p class="lab-note">The 14 daily files are small, so at the default Spark packs them into about one partition for each core. A smaller `maxPartitionBytes` cuts them up more. Partitions: recorded. Waves: arithmetic, tasks divided by cores, rounded up.</p>';
        } else {
          var S = G.table('parts.shuffle'), r = S.rows[st.sh], n = Number(r[1]), w2 = Math.ceil(n / st.c);
          h += row('Setting', chips(S.rows.map(function (x, k) { return k; }), st.sh, 'tk-s', function (k) { return S.rows[k][0]; }));
          h += row('Cores', chips([2, 4, 8, 16], st.c, 'tk-c'));
          h += '<div class="lab-out">' + big(n, 'tasks after the shuffle') + big(r[5], 'records in all', 'good') + big(r[3], 'median records per task') + big(r[4], 'most records in one task') + big(w2, 'waves on ' + st.c + ' cores', w2 > 8 ? 'bad' : '') + '</div>' + squares(n, st.c);
          h += callout(n > 100 ? 'warn' : 'tip', n > 100 ? '**' + n + ' tasks to move ' + r[5] + ' records.** Each task has a fixed cost to start, so most of this stage is overhead.' : n === 1 ? 'Adaptive execution looked at the real sizes after the map side and merged all the tiny partitions into **one** task.' : 'A setting that fits the data. Adaptive execution can find this on its own.');
          h += '<p class="lab-note">Recorded: the stage after the shuffle of a group by, read from the event log. 48 records is what is left after each task added up its own rows first.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'tk-r') st.r = v; else if (act === 'tk-c') st.c = v; else if (act === 'tk-s') st.sh = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Pick the join ====================== */
  (function () {
    var WHY = {
      'stores is small: the default': 'The stores table is far under the 10 MiB threshold, so Spark **broadcasts** it: a copy goes to every executor, and the orders never move.',
      'broadcast turned off': 'With the threshold off, both sides are shuffled by the key and sorted, then merged. Two exchanges. This is the safe default for two large tables.',
      'hint: broadcast(stores)': 'A hint forces the choice. It matches the default here, but on a bigger table it would still try to broadcast, and could run out of memory.',
      'hint: shuffle_hash on stores': 'A shuffled hash join shuffles both sides, but builds a hash table of the small side in each task and skips the sort.',
      'a range condition, not equality': 'There is no equality on a key, so there is nothing to hash or sort by. Spark falls back to a **nested loop**: every row against every row of the small side.',
      'a range condition, tiers is small': 'Same nested loop, with the other side broadcast, because the tiers table is tiny.'
    };
    W.joinpick = {
      steps: function () { return 2; },
      hint: 'Pick a situation and read the join that Spark chose.',
      say: function (s, i) {
        return [
          'Six situations, one query shape. I asked Spark for the plan of each and read which join it chose, and how many shuffles and broadcasts the plan has. The join is the same. Only the size of the table, a setting or a hint changed.',
          'Adaptive execution can change a join after the first stage has run. Here is the plan of the same join before, and after the map side finished and the real size was known.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('joins.strategies'), st = A.local.jp || (A.local.jp = { k: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var r = T.rows[st.k];
          h += row('Situation', chips(T.rows.map(function (x, n) { return n; }), st.k, 'jp-k', function (n) { return T.rows[n][0]; }));
          h += '<div class="lab-out">' + big(r[1], 'the join Spark chose', 'good') + big(r[2], 'shuffles (Exchange)') + big(r[3], 'broadcasts') + '</div>';
          h += callout('tip', WHY[r[0]] || 'Read the plan.');
          h += '<div class="compiled-h">Lines of the physical plan</div><div class="code-box">' + H.code({ file: 'explain', lang: 'text', code: G.text('joins.plan.' + r[0]) }) + '</div>';
        } else {
          h += '<div class="pair"><div><div class="compiled-h">Before the map side ran</div>' + H.code({ file: 'initial plan', lang: 'text', code: G.text('joins.aqe_before') }) + '</div>' +
            '<div><div class="compiled-h">After: the final plan</div>' + H.code({ file: 'final plan', lang: 'text', code: G.text('joins.aqe_after') }) + '</div></div>';
          h += callout('tip', 'The first plan had a sort-merge join. Once the stage had run, Spark knew that one side was small and changed the join to a **broadcast** join. The shuffle of the first stage had already happened, but the sort and the second shuffle did not.');
        }
        box.innerHTML = h + '<p class="lab-note">Recorded: the plans of Spark 4.0.1 in local mode, for the orders joined to the stores.</p></div>';
        A.bindWidget = function (act, el) { if (act === 'jp-k') st.k = Number(el.getAttribute('data-v')); A.render(true); };
      }
    };
  })();

  /* ====================== The hot store ====================== */
  (function () {
    W.skewlab = {
      steps: function () { return 2; },
      hint: 'Compare the busiest task with the typical one.',
      say: function (s, i) {
        return [
          'Store s01 sells about a third of all orders. Spark hashes the store id, so one task gets the whole of s01. Look at a plain count first, then at a window sum, and compare the most records in a task with the median.',
          'Three ways through the same join. The plain sort-merge join leaves one big task. Adaptive execution splits the big partition. Salting spreads the hot key by hand. Read the numbers.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var h = '<div class="lab">', T, mx;
        if (i === 0) {
          T = G.table('skew.aggregations');
          mx = Math.max.apply(null, T.rows.map(function (r) { return Number(r[4]); }));
          h += T.rows.map(function (r) {
            var ratio = Number(r[3]) > 0 ? Number(r[4]) / Number(r[3]) : 0;
            return '<div class="lab-h">' + esc(r[0]) + '</div>' + bar('median task', Number(r[3]), mx, fmtN(Number(r[3])) + ' records') + bar('busiest task', Number(r[4]), mx, fmtN(Number(r[4])) + ' records', ratio > 5 ? 'bad' : '');
          }).join('');
          h += callout('warn', 'The count looks even because each task **adds up its own rows first** (partial aggregation), so what is shuffled is a handful of partial counts. The window sum has to move every order of a store, and then one task holds s01. A skew you do not see in one query shows in the next.');
        } else {
          T = G.table('skew.joins');
          mx = Math.max.apply(null, T.rows.map(function (r) { return Number(r[4]); }));
          h += T.rows.map(function (r) {
            return '<div class="lab-h">' + esc(r[0]) + ' <span class="pill">' + r[1] + ' tasks</span></div>' + bar('median task', Number(r[3]), mx, fmtN(Number(r[3])) + ' records') + bar('busiest task', Number(r[4]), mx, fmtN(Number(r[4])) + ' records', Number(r[4]) > 100000 ? 'bad' : '');
          }).join('');
          h += callout('tip', 'The busiest task falls from **' + fmtN(Number(T.rows[0][4])) + '** records to **' + fmtN(Number(T.rows[1][4])) + '** with the adaptive skew join, which also ran more tasks because it cut the big partition in pieces. Salting got **' + fmtN(Number(T.rows[2][4])) + '**: it works, and it costs code that you must keep correct.');
        }
        box.innerHTML = h + '<p class="lab-note">Recorded: the task table of a stage, read from the event log of Spark 4.0.1 in local mode. Counts are records read by the tasks of the stage after the shuffle.</p></div>';
      }
    };
  })();

  /* ====================== Memory, the cache and spill ====================== */
  (function () {
    var GIB = 1073741824, MIB = 1048576;
    W.memlab = {
      steps: function () { return 3; },
      hint: 'Pick a heap size, a storage level, and read what spilled.',
      say: function (s, i) {
        return [
          'Spark does not use the whole heap for your data. It keeps 300 MiB for itself, and then 60 percent of the rest is the unified region that execution and storage share. I asked a real session for three heap sizes and checked the formula. The larger sizes are the same formula, calculated.',
          'Cache the same table three ways. In memory, in memory with a fall-back to disk, and on disk only. The bytes are real. The second count then reads from the cache and not from the files.',
          'When execution memory runs out, Spark writes data to disk and reads it back. That is a spill. I forced it on a sort of the 400,000 orders. The memory number is the size of the data in memory, and the disk number is what it became after serialising and compressing.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.ml || (A.local.ml = { h: 1, lv: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var F = G.table('mem.formula'), opts = F.rows.map(function (r) { return { k: r[0], heap: Number(r[1]), rec: Number(r[2]), calc: false }; });
          [4, 8, 16].forEach(function (g) { opts.push({ k: g + 'g', heap: g * GIB, rec: null, calc: true }); });
          var o = opts[st.h], unified = (o.heap - 300 * MIB) * 0.6, user = (o.heap - 300 * MIB) * 0.4;
          h += row('Heap', chips(opts.map(function (x, n) { return n; }), st.h, 'ml-h', function (n) { return opts[n].k + (opts[n].calc ? ' (calculated)' : ' (recorded)'); }));
          h += '<div class="lab-out">' + big(mb(o.heap), 'JVM heap') + big('300 MiB', 'reserved for Spark') + big(mb(unified), 'unified region (60%)', 'good') + big(mb(user), 'user memory (40%)') + '</div>';
          h += bar('reserved', 300 * MIB, o.heap, '300 MiB') + bar('unified: execution + storage', unified, o.heap, mb(unified), 'sel') + bar('user memory', user, o.heap, mb(user), 'off');
          h += o.calc ? callout('tip', 'Calculated with the same formula: **(heap - 300 MiB) x 0.6**.') : callout('good', 'Spark reported **' + fmtN(o.rec) + '** bytes of storage memory. The formula gives **' + fmtN(Math.round(unified)) + '**. They are equal.');
          h += '<p class="lab-note">Inside the unified region, half is protected for the cache (`spark.memory.storageFraction`, 0.5). Execution can borrow from storage, and storage can borrow from execution when it is idle.</p>';
        } else if (i === 1) {
          var L = G.table('mem.levels'), C = G.table('mem.cache_reads'), r = L.rows[st.lv];
          h += row('Storage level', chips(L.rows.map(function (x, n) { return n; }), st.lv, 'ml-l', function (n) { return L.rows[n][0]; }));
          h += '<div class="lab-out">' + big(mb(Number(r[1])), 'in memory') + big(mb(Number(r[2])), 'on disk') + '</div>';
          h += callout('tip', st.lv === 0 ? '`MEMORY_ONLY` keeps partitions in memory. A partition that does not fit is not cached, and is recomputed each time it is needed.' : st.lv === 1 ? '`MEMORY_AND_DISK` is what `cache()` uses for a DataFrame. A partition that does not fit goes to disk instead of being recomputed.' : '`DISK_ONLY` keeps nothing in memory. It is slower than memory and faster than recomputing a long chain.');
          h += '<div class="lab-h">Two counts of the same cached table</div>' + table(['Action', 'Bytes read as input'], C.rows.map(function (x) { return [x[0], fmtN(Number(x[1]))]; }));
          h += '<p class="lab-note">Recorded: sizes from the storage tab data of the session, and bytes from the event log. The first count builds the cache while it reads the files. The second reads the cache.</p>';
        } else {
          var P = G.counts('mem.spill'), ratio = P.memory_bytes_spilled / P.disk_bytes_spilled;
          h += '<div class="lab-out">' + big(fmtN(P.rows_sorted), 'rows sorted') + big(mb(P.memory_bytes_spilled), 'memory bytes spilled', 'warn') + big(mb(P.disk_bytes_spilled), 'disk bytes spilled', 'warn') + big(fmtN(ratio, 1) + ' x', 'smaller on disk') + '</div>';
          h += callout('warn', 'I forced Spark to spill after every ' + fmtN(P.forced_after_rows) + ' rows, so that it happens on a small machine. In production you meet spill when a task holds too much: a skewed key, too few partitions, or a very wide row. The query still finishes, but slower. The fix is **more partitions**, a better key, or more memory per core.');
          h += '<p class="lab-note">Recorded: the spill metrics of the tasks, read from the event log of Spark 4.0.1.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'ml-h') st.h = v; else if (act === 'ml-l') st.lv = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== How you write decides how you read ====================== */
  (function () {
    W.layoutlab = {
      steps: function () { return 2; },
      hint: 'Pick how the files were written, then how they are read.',
      say: function (s, i) {
        return [
          'Seven ways to write the same 400,000 orders. Count the files and their size. One file cannot be read in parallel. Thousands of tiny files make every read slow. Pick a way and watch the file count.',
          'Now the reading side. A filter on a partition column skips whole folders. A filter on a sorted column can skip row groups inside a file. On shuffled data it cannot. These are the bytes that Spark actually read.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.lo || (A.local.lo = { v: 0, g: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table('files.variants'), r = T.rows[st.v], files = Number(r[1]), per = Number(r[3]), mx = Math.max.apply(null, T.rows.map(function (x) { return Number(x[1]); }));
          h += row('Written as', chips(T.rows.map(function (x, n) { return n; }), st.v, 'lo-v', function (n) { return T.rows[n][0]; }));
          h += '<div class="lab-out">' + big(fmtN(files), 'files', files > 1000 || files === 1 ? 'bad' : '') + big(fmtN(Number(r[2])) + ' KB', 'in all') + big(fmtN(per, 1) + ' KB', 'for each file', per < 100 ? 'warn' : '') + '</div>';
          h += bar('files', Math.log(files + 1), Math.log(mx + 1), fmtN(files) + ' (log scale)', files > 1000 ? 'bad' : files === 1 ? 'bad' : 'sel');
          h += callout(files > 1000 ? 'warn' : files === 1 ? 'warn' : 'tip', files > 1000 ? '**' + fmtN(files) + ' files of ' + fmtN(per, 1) + ' KB.** Every file costs a listing, an open and a task. This is the small-files problem, and it started with a shuffle of 200 tasks into 14 folders: each task wrote a piece to every folder.' :
            files === 1 ? '**One file** means one task wrote it, and one task will read it. Fine for a tiny table. A wall for a big one.' : 'A sensible count: each file is big enough to be worth opening, and there are enough of them to read in parallel.');
          h += '<p class="lab-note">Recorded: the folders that Spark wrote on disk, counted. File sizes vary by a few KB between runs, so the totals are rounded to 10 KB.</p>';
        } else {
          var R = G.table('files.rowgroups'), r2 = R.rows[st.g], T2 = G.table('files.touched');
          h += row('The file is', chips(R.rows.map(function (x, n) { return n; }), st.g, 'lo-g', function (n) { return R.rows[n][0] + ', pushdown ' + R.rows[n][1]; }));
          h += '<div class="lab-out">' + big(mb(Number(r2[2])), 'bytes read', Number(r2[2]) < 1000000 ? 'good' : '') + big(fmtN(Number(r2[3])), 'records read') + '</div>';
          h += callout(Number(r2[2]) < 1000000 ? 'good' : 'tip', Number(r2[2]) < 1000000 ? 'The footer of each row group holds the minimum and maximum of every column. On data **sorted** by `order_id`, a filter on it skips almost every row group.' : r2[0] === 'shuffled by order_id' && r2[1] === 'on' ? 'On shuffled data every row group holds some of every value, so the minimum and maximum rule nothing out. Pushdown costs a little and saves nothing.' : 'Without pushdown Spark reads every row group and filters afterwards.');
          h += '<div class="lab-h">Folders skipped by a filter</div>' + table(['Filter', 'Files opened', 'Files in the dataset'], T2.rows);
          h += '<p class="lab-note">Recorded: bytes and records read, from the event log. The partition column filter opened one file of fourteen. A filter on a column that is not a partition column opened all fourteen.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'lo-v') st.v = v; else if (act === 'lo-g') st.g = v;
          A.render(true);
        };
      }
    };
  })();
})();
