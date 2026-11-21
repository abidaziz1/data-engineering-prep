/* Scala course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: the real Scala 2.13 compiler, the JDK and Spark 4.0.1.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. sbt, Scala 3 and a cluster did not run. */
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

  /* ====================== 1. Two Scala versions, a missing library and a jar ====================== */
  W.verlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a case and read what ran.',
      say: function () { return 'The same two small files, built and run five ways. Three of them fail at run time, and the compiler said nothing about two of those. Pick a case.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var B = G.counts('build.binary'), NL = G.counts('build.no_library'), BJ = G.counts('build.jar');
        var cases = [
          { name: 'all Scala 2.13.16', ver: '2.13.16', exit: 0, out: B.both213_output, kind: 'good', why: 'The library and the application were built by 2.13.16 and run on the 2.13.16 library. This is the setting of Spark 4.0.1, so it is the one to teach.' },
          { name: 'all Scala 2.12.20', ver: '2.12.20', exit: 0, out: B.both212_output, kind: 'good', why: 'The same two files with a 2.12.20 compiler and library also work. The map prints in another order, because the two versions build their maps differently: **the order of a map is not part of what it promises**.' },
          { name: 'a 2.12 library in a 2.13 app', ver: '2.12 and 2.13', exit: B.mixed_exit, out: B.mixed_error, kind: 'bad', why: 'The 2.13 compiler read the 2.12 library **without a word**: ' + (B.mixed_compiled ? 'the build was clean' : 'the build failed') + '. At run time `byStore` is not there, because it takes a `scala.collection.Seq` in 2.12 and an `immutable.Seq` in 2.13. The suffix in the name of an artifact (`_2.12`, `_2.13`) is how you avoid this.' },
          { name: 'no scala-library on the classpath', ver: 'none', exit: NL.exit, out: NL.error, kind: 'bad', why: 'A Scala program calls the Scala library all the time, even for `args.isEmpty`. Without `scala-library.jar` on the classpath the JVM cannot load it.' },
          { name: 'java -jar of your own jar', ver: 'not in the jar', exit: BJ.jar_run_exit, out: BJ.jar_run_error, kind: 'bad', why: 'The jar holds only your classes, and the library is not in it. With the library on the classpath it printed `' + BJ.with_library_output + '`. A job that ships alone needs an **assembly** jar that packs the library in (from documentation, and not run here).' }
        ];
        var st = A.local.vl || (A.local.vl = { k: 0 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Case', chips(cases.map(function (x, k) { return k; }), st.k, 'vl-k', function (k) { return cases[k].name; }));
        out += big([[c.ver, 'the Scala version of the library', c.kind], [c.exit, 'exit code', c.exit ? 'bad' : 'good']]);
        out += pre(c.out, c.exit ? 'err' : '');
        out += callout(c.kind, c.why);
        out += note(' Every line comes from a real compile and run on this machine.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'vl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. A case class and a match ====================== */
  W.matchlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a step and read the result.',
      say: function () { return 'A case class for an order, and a match on its status. I compared two orders, copied one, left a case out of a match, and ran it. Pick a step.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var O = G.text('lang.orders').split('\n').slice(2), L = G.counts('lang');
        var cases = [
          { name: 'equal, but not the same', kind: 'tip', nums: [[O[1], 'a == Order(same fields)'], [O[2], 'a eq Order(same fields)']], why: 'A case class writes `equals`, `hashCode`, `toString` and `copy` for you. `==` compares the **fields**, and `eq` asks whether it is the **same object**. Two orders with the same fields are equal and are two objects.' },
          { name: 'copy', kind: 'tip', nums: [[O[3], 'a.copy(status = Shipped)'], [O[0], 'a, unchanged']], why: '`copy` makes a **new** order with one field changed. The old one is untouched, which is why immutable data is safe to share between tasks.' },
          { name: 'a case left out: scalac', kind: 'warn', nums: [['a warning', 'from the compiler'], [L.missing_input, 'the input that would fail']], why: 'The status is a **sealed** trait, so the compiler knows every case. A match that leaves out `Refunded` compiles, with the warning **match may not be exhaustive**. Read the warnings of a build.' },
          { name: 'the same code, run', kind: 'bad', nums: [[L.match_error.split(' (')[0], 'scala.MatchError'], [String(L.exit), 'exit code']], why: 'Nothing stopped the build, and the first `Refunded` order stopped the job with `scala.MatchError`. A warning is a failure that has not happened yet.' }
        ];
        var st = A.local.ml || (A.local.ml = { k: 2 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Step', chips(cases.map(function (x, k) { return k; }), st.k, 'ml-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x, q) { return [x[0], x[1], q === 0 && c.kind === 'bad' ? 'bad' : '']; }));
        out += callout(c.kind, c.why);
        out += note(' Real output of `Orders.scala` and `Partial.scala`.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ml-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Errors as values ====================== */
  W.errlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a line of the file and read what parse returned.',
      say: function () { return 'Five lines of a file go through the same `parse`. It never throws: it returns a `Right` with an order or a `Left` with a reason. Pick a line.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var src = G.file('Errors.scala'), inputs = /val lines = List\((.*)\)/.exec(src)[1].replace(/"/g, '').split(', ');
        var res = G.text('err.errors').split('\n').slice(2, 7), E = G.counts('err');
        var st = A.local.el || (A.local.el = { k: 1 }), r = res[st.k], right = /^Right/.test(r);
        var out = '<div class="lab">' + row('Line', chips(inputs.map(function (x, k) { return k; }), st.k, 'el-k', function (k) { return inputs[k]; }));
        out += big([[inputs[st.k], 'the line'], [right ? 'Right' : 'Left', 'what parse returned', right ? 'good' : 'warn']]);
        out += pre(r, right ? '' : '');
        out += callout(right ? 'good' : 'warn', right ? 'The line is valid, so `parse` returned `Right` with an `Order`. The amount is in **cents**: `' + r.replace(/^.*,(\d+)\)\)?$/, '$1') + '`.' : 'The line is not valid, so `parse` returned `Left` with a **reason that names the value**. Nothing was thrown, so the job goes on and collects every reason.');
        out += note(' Real output of `Errors.scala`. All five lines: **' + E.summary + '**.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'el-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 4. Typed Spark: what is caught when, and what cannot be sent ====================== */
  W.sparklab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a case and read what happened.',
      say: function () { return 'A Dataset of a thousand orders on a local Spark 4.0.1. I made a typo in two ways, used an object that cannot be sent, copied the number instead, and left out an encoder. Pick a case.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var K = G.counts('spark'), E = G.counts('spark.errors');
        var cases = [
          { name: 'a typo in a typed lambda', kind: 'good', nums: [['compile time', 'when it is found'], [E.typed_message, 'scalac says']], text: G.text('spark.typed_error'), why: 'With a `Dataset[Order]`, `_.statu` is checked by the compiler, and it even suggests `status`. The job never starts.' },
          { name: 'a typo in a column name', kind: 'warn', nums: [['run time', 'when it is found'], [K.untyped_error, 'error condition']], text: 'AnalysisException: ' + K.untyped_error, why: 'A column name in a string, `col("statu")`, is checked **when the query is planned**, after the job has started. The error condition names the problem and Spark suggests the columns that exist.' },
          { name: 'a lambda that uses Settings', kind: 'bad', nums: [[K.closure_headline, 'what Spark said'], [K.cause.replace('java.io.', ''), 'the cause']], text: K.closure_headline + '\ncause: ' + K.cause, why: 'The lambda used `settings.minCents`, so Spark tried to send the whole `Settings` object to the executors, and its class is not `Serializable`.' },
          { name: 'copy the number first', kind: 'good', nums: [[n(K.fixed_count), 'orders with 600 cents or more'], [n(K.orders), 'orders in the Dataset']], text: 'copy the number first: ' + K.fixed_count, why: 'A `val minCents = settings.minCents` outside the lambda sends **one number**. The lambda no longer needs the object, and the count of orders with 600 cents or more is ' + n(K.fixed_count) + '.' },
          { name: 'a class that is not a case class', kind: 'warn', nums: [['compile time', 'when it is found'], [E.encoder_message, 'scalac says']], text: G.text('spark.encoder_error'), why: 'A `Dataset` needs an **encoder** for its element type, and `import spark.implicits._` provides one for case classes and basic types. For a plain class there is none, so the method does not exist on `Seq[Plain]` at all.' }
        ];
        var st = A.local.sk || (A.local.sk = { k: 2 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Case', chips(cases.map(function (x, k) { return k; }), st.k, 'sk-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x, q) { return [x[0], x[1], q === 0 && c.kind === 'bad' ? 'bad' : q === 0 && c.kind === 'good' ? 'good' : '']; }));
        out += pre(c.text, c.kind === 'bad' || c.kind === 'warn' ? 'err' : '');
        out += callout(c.kind, c.why);
        out += note(' A real run of `SparkApp.scala` on a local Spark ' + G.meta('spark') + ' session, and real compiler output.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sk-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
