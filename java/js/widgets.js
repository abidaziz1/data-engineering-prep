/* Java course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: the real JDK 21, Maven and H2.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. Spark, Kafka and a database server did not run. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return '<div class="sel-chips">' + list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('') + '</div>';
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span>' + inner + '</div>'; }
  function table(cols, rows, rowCls, numFrom) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c, ci) { return '<th' + (numFrom != null && ci >= numFrom ? ' class="rnum"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td' + (numFrom != null && ci >= numFrom ? ' class="rnum"' : '') + '>' + esc(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (String(x[0]).length > 12 ? ' long' : '') + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function callout(kind, text) { return '<div class="callout ' + kind + '">' + md(text) + '</div>'; }
  function note(recorded, computed) {
    return '<p class="lab-note"><span class="pill real">Recorded</span>' + md(recorded) + (computed ? ' <span class="pill">Computed</span>' + md(computed) : '') + '</p>';
  }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(1, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n">' + esc(label) + '</span><div class="lane-track"><i class="' + (cls || '') + '" style="width:' + pc + '%"></i></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  var n = G.n;
  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }






  /* ====================== 1. A dependency conflict, and a jar that runs alone ====================== */
  W.deplab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a case and read what ran.',
      say: function () { return 'The same loader, four ways of running it. In two of them a library of a different version sat on the classpath, and in two of them the jar was packed differently. Pick a case and say why it worked or did not.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var CF = G.counts('maven.conflict'), FX = G.counts('maven.conflict_fixed'), RN = G.counts('maven.run');
        var cases = [
          { name: 'commons-io pinned to 2.4', ver: '2.4', exit: CF.exit, out: CF.error.replace('Exception in thread "main" ', ''), kind: 'bad',
            why: 'Maven keeps **one** version of a library on the classpath, and the **nearest declaration wins**: the pin at the top of the pom beat the version that commons-csv asked for (' + CF.wanted_io_version + '). The program compiled, and failed when `commons-csv` needed a class that 2.4 does not have.' },
          { name: 'commons-io pinned to 2.16.1', ver: '2.16.1', exit: FX.exit, out: FX.output, kind: 'good',
            why: 'The same program with a version that has the class. Nothing else changed, so the failure of the first case was the version and not the code.' },
          { name: 'java -jar, the shaded jar', ver: 'inside the jar', exit: RN.shaded_exit, out: RN.shaded_output, kind: 'good',
            why: 'The shade plugin packed the libraries **inside** the jar and wrote the main class into its manifest, so `java -jar` is all that it needs. The recorded total is the one that the file holds: ' + RN.cents_expected + ' cents.' },
          { name: 'java -jar, the thin jar', ver: 'not in the jar', exit: RN.thin_exit, out: RN.thin_error, kind: 'bad',
            why: 'The jar that Maven builds first holds only your classes and has no main class in its manifest. Put it on the classpath and the libraries are missing too: ' + RN.thin_cp_error.replace('Exception in thread "main" ', '') + '.' }
        ];
        var st = A.local.dl || (A.local.dl = { k: 0 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Case', chips(cases.map(function (x, k) { return k; }), st.k, 'dl-k', function (k) { return cases[k].name; }));
        out += big([[c.ver, 'the library that was used', c.kind], [c.exit, 'exit code', c.exit ? 'bad' : 'good']]);
        out += pre(c.out, c.exit ? 'err' : '');
        out += callout(c.kind, c.why);
        out += note(' Every line comes from a real `mvn` and `java` run of the loader of this course.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'dl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. A file of a million lines against a small heap ====================== */
  W.heaplab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a way to read the file and compare.',
      say: function () { return 'A file of a million orders, 49 megabytes on disk. I read it four ways with a heap of 64, 64, 32 and 2,048 megabytes. Pick one and say whether it should have fitted.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var M = G.counts('mem');
        var heap = function (t) { return +/(\d+) MB/.exec(t)[1]; };
        var cases = [
          { name: 'readAllLines, heap 64 MB', heap: heap(M.max_heap_64), exit: M.oom_exit, out: M.oom_message, kind: 'bad', why: '`Files.readAllLines` builds a **list of a million strings** in memory. Every string is an object with its own header and a copy of the characters, so the list needs several times the 49 MB of the file, and a 64 MB heap ran out: `' + M.oom_message + '`.' },
          { name: 'Files.lines, count, heap 64 MB', heap: heap(M.max_heap_64), exit: M.stream_exit, out: M.stream_output, kind: 'good', why: '`Files.lines` is a **stream**: it reads a line, hands it on and forgets it. The same file and the same heap worked, because only a few lines are in memory at a time.' },
          { name: 'BufferedReader and a sum, heap 32 MB', heap: heap(M.max_heap_32), exit: M.sum_exit, out: M.sum_output, kind: 'good', why: 'Half the heap, and a real job: every line is parsed and the amounts are added up in **cents**. The total equals the one that Python worked out from the same rule: ' + M.sum_expected.replace('1000000', '1,000,000') + '.' },
          { name: 'readAllLines, heap 2 GB', heap: heap(M.max_heap_64) * 32, exit: 0, out: M.all_2g_output, kind: 'warn', why: 'The same call that failed works with a bigger heap. It is not a fix: the next file is bigger, and a pipeline that reads everything into a list needs a heap that grows with the data.' }
        ];
        var st = A.local.hl || (A.local.hl = { k: 0 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Way to read it', chips(cases.map(function (x, k) { return k; }), st.k, 'hl-k', function (k) { return cases[k].name; }));
        out += big([[n(M.file_mb) + ' MB', 'the file on disk'], [n(c.heap) + ' MB', 'the heap limit (-Xmx)'], [c.exit, 'exit code', c.exit ? 'bad' : 'good']]);
        out += bar('heap against file', c.heap, 2048, n(c.heap) + ' MB', c.exit ? 'bad' : 'good');
        out += pre(c.out, c.exit ? 'err' : '');
        out += callout(c.kind, c.why);
        out += note(' Real runs of `java -Xmx...` on the program of this course.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'hl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Money: double against BigDecimal ====================== */
  W.moneylab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a type and read the result.',
      say: function () { return 'Adding ten cents a million times should give a hundred thousand dollars. I did it with a double and with a BigDecimal, and tried the two traps that come next: an int that wraps, and a division that does not end. Pick one.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var NS = G.counts('num.sums'), L = G.text('num.numbers').split('\n').slice(1);
        var err = (parseFloat(NS.double_sum) - 100000);
        var cases = [
          { name: 'double', kind: 'bad', nums: [[NS.first, '0.1 + 0.2'], [NS.double_sum, 'ten cents, a million times'], [err.toExponential(2), 'off from 100000']], why: 'A `double` stores a **binary fraction**, and 0.1 has no exact one. Each addition is a little off, and a million additions add up to **' + NS.double_sum + '**. For money, a total that is not exact is a bug that shows up in a reconciliation.' },
          { name: 'BigDecimal', kind: 'good', nums: [[NS.bigdecimal_sum, 'ten cents, a million times'], [L[3].slice(0, 18) + '...', 'new BigDecimal(0.1)'], [L[6], 'equals, then compareTo']], why: 'A `BigDecimal` from the **text** "0.10" is exact: the sum is **' + NS.bigdecimal_sum + '**. Beware `new BigDecimal(0.1)`: it keeps the error of the double, with fifty digits. `equals` also compares the scale, so 2.50 and 2.5 are not equal, and `compareTo` says that they are the same number.' },
          { name: 'int and long', kind: 'warn', nums: [[L[4], 'Integer.MAX_VALUE + 1'], [L[5].replace('addExact: ', ''), 'Math.addExact'], [L[10], '19.99 as cents, times 3']], why: 'An `int` **wraps around** without a word: the largest int plus one is the smallest. `Math.addExact` throws instead, which is what a pipeline wants. Counting money in **cents** as a `long` is another exact way, and the example read 19.99 with `longValueExact`, which refuses a value that has more decimals.' },
          { name: 'rounding', kind: 'tip', nums: [[L[8], '10 / 3, two decimals'], [L[9], '2.345 and 2.355 with HALF_EVEN'], [L[7].replace('divide: ', '').slice(0, 24) + '...', 'divide with no scale']], why: 'Dividing 10 by 3 with no scale **throws**, because the result never ends. Give a scale and a **rounding mode**. `HALF_EVEN`, the banker\'s rounding, sends a tie to the even digit, so 2.345 gives 2.34 and 2.355 gives 2.36. Choose the rule with the finance team, and write it in one place.' }
        ];
        var st = A.local.ml || (A.local.ml = { k: 0 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Type', chips(cases.map(function (x, k) { return k; }), st.k, 'ml-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x, q) { return [x[0], x[1], q === 0 && c.kind === 'bad' ? 'bad' : q === 0 && c.kind === 'good' ? 'good' : '']; }));
        out += callout(c.kind, c.why);
        out += note(' The numbers come from a real run of `Numbers.java`.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ml-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 4. JDBC: batches, injection and a transaction ====================== */
  W.sqllab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a step and read the rows.',
      say: function () { return 'A table of 1,000 orders in an H2 database, through JDBC. I loaded it in batches, searched it with a value that tries to break out of the SQL, and deleted some rows inside a transaction. Pick a step.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var X = G.text('jdbc.run');
        var batches = /rows after (\d+) batches: (\d+)/.exec(X), inj = /glued into the text: (\d+) rows, bound as a parameter: (\d+) rows/.exec(X), tx = /inside the transaction: (\d+)\nafter the rollback: (\d+)/.exec(X), dup = /SQLState (\d+)/.exec(X);
        var cases = [
          { name: 'a batch', kind: 'good', nums: [[batches[1], 'batches sent'], [n(+batches[2]), 'rows in the table']], why: '1,000 rows went out in **' + batches[1] + ' batches** of 250 with one `PreparedStatement`: one statement to parse and four round trips, and not a thousand of each.' },
          { name: 'a value glued into the text', kind: 'bad', nums: [[n(+inj[1]), 'rows found', 'bad'], [n(+inj[2]), 'rows found with a parameter', 'good']], why: 'The search value was `x\' OR \'1\'=\'1`. Glued into the SQL it **became SQL** (this is **SQL injection**), the condition was always true, and the query returned **' + n(+inj[1]) + '** rows. As a bound parameter it was only text that matches nothing: **' + n(+inj[2]) + '** rows. Never build SQL from a value.' },
          { name: 'a transaction', kind: 'tip', nums: [[n(+tx[1]), 'rows inside the transaction'], [n(+tx[2]), 'rows after the rollback', 'good']], why: 'With `setAutoCommit(false)` the delete of store 1 was visible inside the transaction (**' + n(+tx[1]) + '** rows left), and `rollback()` put every row back: **' + n(+tx[2]) + '**. A load that fails halfway should roll back, so that the table is never half loaded.' },
          { name: 'a duplicate key', kind: 'warn', nums: [[dup[1], 'SQLState of the error']], why: 'Inserting an order id that exists raised an `SQLException` whose SQL state is **' + dup[1] + '**, the standard code for a violated unique constraint. Read the state and the error code, and not the text of the message, when you decide what to do.' }
        ];
        var st = A.local.sq || (A.local.sq = { k: 1 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Step', chips(cases.map(function (x, k) { return k; }), st.k, 'sq-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x) { return [x[0], x[1], x[2] || '']; }));
        out += callout(c.kind, c.why);
        out += note(' Real output of `Jdbc.java` on an in-memory H2 database.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sq-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 5. Threads and a shared counter ====================== */
  W.racelab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a way to count and read the result.',
      say: function () { return 'Eight threads add one to a counter 100,000 times each, so the answer must be 800,000. I ran it three times with a plain int and an AtomicInteger, then tried a pool and virtual threads. Pick one.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var K = G.counts('conc');
        var short3 = K.plain_short_in_runs.filter(Boolean).length, exact3 = K.atomic_exact_in_runs.filter(Boolean).length;
        var cases = [
          { name: 'a plain int', kind: 'bad', nums: [[short3 + ' of ' + K.runs, 'runs that ended short', 'bad'], ['800,000', 'the answer it should give']], why: '`plain++` is three steps: read, add, write. Two threads can read the same value and write the same result, so one update is lost. In **' + short3 + ' of ' + K.runs + '** runs the total was short. The exact number changes from run to run, which is why this bug survives a test.' },
          { name: 'AtomicInteger', kind: 'good', nums: [[exact3 + ' of ' + K.runs, 'runs that were exact', 'good'], ['800,000', 'the total every time']], why: '`incrementAndGet()` does the read, the add and the write as **one atomic step**, so no update is lost: exact in **' + exact3 + ' of ' + K.runs + '** runs. For a counter, an atomic or a `LongAdder` is the answer. A lock also works and costs more.' },
          { name: 'a pool of 4 threads', kind: 'tip', nums: [[K.pool_sum, 'sum of the squares of 1 to 10']], why: 'An `ExecutorService` with four threads ran ten tasks that return a value, and `Future.get()` collected the results: **' + K.pool_sum + '**. Tasks hand back values, and the threads share nothing, so there is nothing to lose.' },
          { name: 'virtual threads', kind: 'tip', nums: [[n(K.virtual_finished), 'tasks that finished'], [K.is_virtual ? 'yes' : 'no', 'Thread.isVirtual()']], why: 'Java 21 can start a **virtual thread** for every task. A thousand tasks that each slept for 10 ms all finished, on a machine with ' + K.cpus + ' cores. Virtual threads are cheap, and they fit code that **waits** (for a database or a web call). They do not speed up code that computes.' }
        ];
        var st = A.local.rl || (A.local.rl = { k: 0 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Way to count', chips(cases.map(function (x, k) { return k; }), st.k, 'rl-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x) { return [x[0], x[1], x[2] || '']; }));
        out += callout(c.kind, c.why);
        out += note(' Real runs of `Race.java`. The total of a lost-update run is not quoted, because it is different every time.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'rl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
