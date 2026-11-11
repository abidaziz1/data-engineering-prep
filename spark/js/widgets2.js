/* Lab widgets for the second half of the Apache Spark course: ANSI mode, UDFs, Structured Streaming, Delta Lake, spark-submit and sizing, and diagnosing a run.
   Every number comes from js/real.js (the real Spark 4.0.1 in local mode, read back from its event log). The sizing lab is arithmetic on documented defaults and says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;
  var X = W._h, chips = X.chips, row = X.row, table = X.table, fmtN = X.fmtN, mb = X.mb, big = X.big, bar = X.bar, callout = X.callout;

  /* ====================== ANSI mode ====================== */
  W.ansilab = {
    steps: function () { return 1; },
    hint: 'Pick an expression, then switch ANSI mode on and off.',
    say: function () { return 'Since Spark 4.0 the ANSI rules are on by default. A bad cast, a division by zero or an integer overflow is an error, and not a quiet NULL or a wrapped number. Pick an expression, switch the setting, and read what the real Spark 4.0.1 answered. The last two rows are the `try_` functions, which give NULL in both modes on purpose.'; },
    mood: function () { return 'think'; },
    render: function (box, s, i, A) {
      var T = G.table('sql.ansi'), st = A.local.an || (A.local.an = { e: 0, on: true }), r = T.rows[st.e], v = String(st.on ? r[1] : r[2]), isErr = /^error:/.test(v);
      var h = '<div class="lab">' + row('Expression', chips(T.rows.map(function (x, n) { return n; }), st.e, 'an-e', function (n) { return T.rows[n][0]; })) +
        row('spark.sql.ansi.enabled', chips(['true', 'false'], st.on ? 'true' : 'false', 'an-m'));
      h += '<div class="lab-out">' + big(isErr ? 'error' : esc(v), isErr ? 'the query stops' : 'the value', isErr ? 'bad' : (v === 'NULL' ? 'warn' : '')) + '</div>';
      if (isErr) h += '<div class="code-box">' + H.code({ file: 'message', lang: 'text', code: v.replace(/^error:\s*/, '') }) + '</div>';
      var errOn = /^error:/.test(String(r[1])), nullOff = String(r[2]) === 'NULL';
      h += callout(isErr ? 'tip' : errOn && !st.on ? 'warn' : 'tip', isErr ? 'With ANSI on, a bad value **stops the job** and the message names the fix: a `try_` function. This is the good failure: you find the bad row on the day it arrives.' :
        errOn && !st.on ? (nullOff ? 'With ANSI off the same expression gives **NULL** and the job carries on. A bad row turns into a missing value, and the report is quietly wrong.' : 'With ANSI off the number **wraps around** and the job carries on. No error, wrong answer.') : 'This one never fails: `try_cast`, `try_divide` and the other `try_` functions return NULL for a bad input, in either mode. Use them where a bad row is expected and you count it.');
      box.innerHTML = h + '<p class="lab-note">Recorded: each expression run in Spark 4.0.1 with the setting on and off. Messages are cut at their first line.</p></div>';
      A.bindWidget = function (act, el) {
        var v2 = el.getAttribute('data-v');
        if (act === 'an-e') st.e = Number(v2); else st.on = v2 === 'true';
        A.render(true);
      };
    }
  };

  /* ====================== UDFs ====================== */
  (function () {
    var KINDS = ['Python UDF', 'Python UDF with Arrow', 'pandas UDF', 'built-in functions'];
    var WHY = {
      'Python UDF': 'Each row is pickled, sent to a Python worker, run, and sent back. The plan shows **BatchEvalPython**. Spark cannot look inside, so it cannot optimise the code or push filters through it.',
      'Python UDF with Arrow': 'The same function, but the data travels in columnar Arrow batches, which is much cheaper than pickling rows. The plan shows **ArrowEvalPython**. The function is still Python, called once per row.',
      'pandas UDF': 'The function gets a whole batch as a pandas Series and returns one. Fastest of the Python options for numeric work. The plan shows **ArrowEvalPython** too.',
      'built-in functions': 'No Python at all: the logic is a `CASE WHEN` inside the plan. It runs inside the JVM, and Catalyst can optimise it. Use this whenever a built-in function can do the job.'
    };
    W.udflab = {
      steps: function () { return 2; },
      hint: 'Compare the plans, then count how many times the function runs.',
      say: function (s, i) {
        return [
          'Four ways to label the 400,000 orders by status: a Python UDF, the same with Arrow, a pandas UDF, and a built-in `CASE WHEN`. All four gave the same counts. Only the plan differs. Pick one and read the operator that Spark put in the plan.',
          'How many times does Spark call your function? You may think once for each row. I counted with a tally file, on 1,000 rows. The answer depends on whether the function is deterministic and how the result is used. Pick a case.'
        ][i];
      },
      mood: function (s, i) { return i ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.ud || (A.local.ud = { k: 0, c: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var kind = KINDS[st.k], plan = G.text('udf.plan.' + kind), op = (plan.match(/BatchEvalPython|ArrowEvalPython/) || ['none'])[0], same = G.counts('udf.same');
          h += row('How the label is made', chips(KINDS.map(function (x, n) { return n; }), st.k, 'ud-k', function (n) { return KINDS[n]; }));
          h += '<div class="lab-out">' + big(op === 'none' ? 'no Python' : op, 'the operator in the plan', op === 'none' ? 'good' : 'warn') + big(same.all_three_agree ? 'same result' : 'differs', 'all four versions agree on the counts', 'good') + '</div>';
          h += callout(op === 'none' ? 'good' : 'tip', WHY[kind]);
          h += '<div class="code-box">' + H.code({ file: 'explain', lang: 'text', code: plan }) + '</div>';
          h += '<p class="lab-note">Recorded: the physical plan of each version in Spark 4.0.1. The counts are ' + same.labels.map(function (l) { return esc(l[0]) + ' ' + fmtN(l[1]); }).join(', ') + '. Speed is not shown, because a laptop run says little about a cluster.</p>';
        } else {
          var C = G.counts('udf.calls'), keys = Object.keys(C).filter(function (k) { return k !== 'rows'; }), k = keys[st.c], n = C[k], rows = C.rows;
          h += row('Case', chips(keys.map(function (x, q) { return q; }), st.c, 'ud-c', function (q) { return keys[q]; }));
          h += '<div class="lab-out">' + big(fmtN(n), 'calls of the function', n > rows ? 'bad' : 'good') + big(fmtN(rows), 'rows') + big(fmtN(n / rows, 1) + ' x', 'calls for each row', n > rows ? 'bad' : '') + '</div>';
          h += callout(n > rows ? 'warn' : 'tip', n > rows ? 'The optimiser inlined the deterministic function into **each place that uses its result**: the filter and the two columns that follow. Four calls for every row. If the function is slow, or calls a service, this multiplies the cost.' :
            /non-deterministic/.test(k) ? 'A non-deterministic function (random, time, a counter) cannot be repeated or moved, so Spark calls it once for each row.' : 'Used once or used twice with no filter in between, Spark computed it once for each row here. The count can change with the plan, so never rely on it.');
          h += '<p class="lab-note">Recorded: each call appended a line to a tally file, and the lines were counted. An accumulator was not used, because it can be wrong when a task is retried.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'ud-k') st.k = v; else st.c = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Structured Streaming ====================== */
  (function () {
    var MODES = ['update', 'append', 'complete'];
    var MODE_NOTE = {
      update: '**Update** writes only the windows that changed in this batch. Late rows that arrive before the watermark passes still change a window, and the sink sees the new value.',
      append: '**Append** writes a window once, when the watermark says it is closed. Nothing comes out for a while, and then the finished windows arrive together. Rows never change after they are written.',
      complete: '**Complete** writes the whole result table every time. It keeps every window forever, so it only suits a small result. Notice batch 4: the late row **was** counted, because complete mode never drops state.'
    };
    W.streamlab = {
      steps: function () { return 3; },
      hint: 'Step through the batches, change the output mode, then read the restart.',
      say: function (s, i) {
        return [
          'Six small files arrive in a folder, one after another. The query counts orders in ten-minute windows by store, with a watermark of ten minutes. Pick a batch and read what Spark knew at that point. Watch the watermark move, and watch batch 4: a row arrives after its window has closed.',
          'The same six files, three output modes. What each batch writes to the sink is different, although the final counts are the same. Pick a mode.',
          'The checkpoint folder is what makes a restart possible. Then I made the sink fail after it wrote a batch and before the batch was committed. Read what the sink received when the query restarted.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.sm || (A.local.sm = { b: 0, m: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var P = G.table('stream.progress'), F = G.table('stream.files'), r = P.rows[st.b], file = F.rows[st.b];
          h += row('Batch', chips(P.rows.map(function (x, n) { return n; }), st.b, 'sm-b'));
          h += '<div class="lab-out">' + big(r[1], 'rows read') + big(r[2], 'watermark used', 'warn') + big(r[3], 'latest event time') + big(r[4], 'rows in state') + big(r[5], 'dropped as late', Number(r[5]) > 0 ? 'bad' : '') + '</div>';
          h += '<p class="lab-note">' + (file ? '<b>' + esc(file[0]) + '</b>: ' + esc(file[2]) : 'No new file in this batch. Spark ran it anyway, so that the watermark could advance and old windows could close.') + '</p>';
          h += callout(Number(r[5]) > 0 ? 'warn' : st.b === 0 ? 'tip' : 'tip', Number(r[5]) > 0 ? 'The event at ' + esc(r[3]) + ' belongs to a window that ended before the watermark (' + esc(r[2]) + '). That window is closed and its state is gone, so Spark **drops** the row and counts it as late. This is the price of a watermark: you choose how late is too late.' :
            st.b === 0 ? 'No watermark yet: Spark has seen no event time. The watermark is the latest event time seen so far, minus the allowed delay of ten minutes.' : 'The watermark used is the latest event time of the **previous** batches minus ten minutes. Windows that end before it are closed. It never moves back.');
          h += table(P.cols, P.rows, function (x, n) { return n === st.b ? 'new' : ''; });
        } else if (i === 1) {
          var M = MODES[st.m], T = G.table('stream.' + M);
          h += row('Output mode', chips(MODES.map(function (x, n) { return n; }), st.m, 'sm-m', function (n) { return MODES[n]; }));
          h += table(T.cols, T.rows, function (x) { return x[1] === '(nothing)' ? 'old' : ''; });
          h += callout('tip', MODE_NOTE[M]);
        } else {
          var C = G.counts('stream.checkpoint').tree, R = G.counts('stream.restart'), lines = Object.keys(C).map(function (k) { return C[k] === null ? k : k + '/   ' + C[k].join(' '); });
          h += '<div class="pair"><div><div class="compiled-h">The checkpoint folder</div>' + H.code({ file: 'checkpoint/', lang: 'text', code: lines.join('\n') }) + '</div><div><div class="compiled-h">The restart</div>' +
            table(['What happened', 'Batches'], [['first run', R.first_run_batches.join(', ')], ['second run (the sink failed)', R.second_run_failed ? 'failed in batch 4' : 'ok'], ['run after the restart', R.restart_batches.join(', ')], ['written to the sink twice', R.batch_written_twice.join(', ')]], null, function (x, ri, ci) { return ci === 1 && ri === 3 ? 'wbad' : ''; }) + '</div></div>';
          h += callout('warn', '`offsets/` says which files batch N reads. `commits/` says that batch N finished. `state/` holds the windows. After a crash Spark finds batch 4 in `offsets` and not in `commits`, so it **runs it again** on the same input. The sink got batch ' + R.batch_written_twice.join(', ') + ' twice. The engine is exactly-once for its own state and **at-least-once for the sink**: the sink must be idempotent, for example a MERGE on a key, or a Delta write with the batch id.');
        }
        box.innerHTML = h + '<p class="lab-note">Recorded: Structured Streaming in Spark 4.0.1, with files written one by one into a folder. The sink was a foreachBatch function that kept what it received.</p></div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'sm-b') st.b = v; else st.m = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Delta Lake ====================== */
  (function () {
    W.deltalab = {
      steps: function () { return 2; },
      hint: 'Step through the life of a table, then clean up a table of small files.',
      say: function (s, i) {
        return [
          'A Delta table is a folder of Parquet files plus a log of commits. Pick a step of the story. The numbers are from a real Delta Lake 4.0.1 table of the Brewline customers and orders.',
          'Twenty small appends leave twenty small files. OPTIMIZE rewrites them into one. VACUUM then deletes the files that no version needs any more. Press the buttons in order, and then try to read an old version.'
        ][i];
      },
      mood: function (s, i) { return i ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.dt || (A.local.dt = { e: 0, f: 0, old: false, zero: false }), h = '<div class="lab">';
        if (i === 0) {
          var B = G.counts('delta.build'), M = G.counts('delta.merge'), Lg = G.counts('delta.log_after'), TT = G.counts('delta.time_travel'), HI = G.table('delta.history'), EN = G.text('delta.schema_enforcement');
          var EV = ['1. First write', '2. MERGE', '3. Time travel', '4. A wrong type'];
          h += row('Step', chips(EV.map(function (x, n) { return n; }), st.e, 'dt-e', function (n) { return EV[n]; }));
          if (st.e === 0) {
            h += '<div class="lab-out">' + big(fmtN(B.rows), 'rows written') + big(B.parquet_files, 'Parquet files') + big(B.log_files.length, 'commit file in _delta_log', 'good') + '</div>';
            h += table(['Action in 00000000000000000000.json', 'How many'], Object.keys(B.first_commit_actions).map(function (k) { return [k, B.first_commit_actions[k]]; }));
            h += callout('tip', 'The commit lists six `add` actions (one for each Parquet file), the `metaData` (the schema) and the `protocol`. A reader that finds this commit sees six files and nothing else.');
          } else if (st.e === 1) {
            h += '<div class="lab-out">' + big(fmtN(M.numSourceRows), 'rows in the update batch') + big(fmtN(M.numTargetRowsUpdated), 'updated', 'good') + big(fmtN(M.numTargetRowsDeleted), 'deleted', 'warn') + big(fmtN(M.numTargetRowsInserted), 'inserted', 'good') + big(fmtN(M.numOutputRows), 'rows in the table now') + '</div>';
            h += table(HI.cols, HI.rows) + '<p class="lab-note">The log folder now holds: ' + esc(Lg.log_files.join(', ')) + '.</p>';
            h += callout('tip', 'One `MERGE` changed rows three ways in **one commit**. Readers saw the table before it, or after it, and never half of it. Old Parquet files are not edited: the commit marks some as removed and adds new ones.');
          } else if (st.e === 2) {
            h += '<div class="lab-out">' + big(fmtN(TT['version 0']), 'rows in version 0') + big(fmtN(TT.latest), 'rows in the latest version', 'good') + '</div>';
            h += H.code({ file: 'time_travel.py', lang: 'python', code: 'spark.read.format("delta").option("versionAsOf", 0).load(path).count()   # ' + fmtN(TT['version 0']) + '\nspark.read.format("delta").load(path).count()                          # ' + fmtN(TT.latest) });
            h += callout('tip', 'Both reads come from the same folder. Time travel is a read of the log up to an older commit, and it works as long as the old Parquet files still exist.');
          } else {
            h += '<div class="code-box">' + H.code({ file: 'error', lang: 'text', code: EN }) + '</div>';
            h += callout('warn', 'Delta checks the schema of every write. A column with a different type is **refused**, and nothing is written. Plain Parquet would have accepted the files, and the break would show up later in a reader.');
          }
        } else {
          var Z = G.counts('delta.small_files'), stage = st.f;
          var inVer = stage === 0 ? Z.files_in_the_version_before : Z.files_in_the_version_after_optimize, onDisk = stage === 0 ? Z.files_on_disk_before : stage === 1 ? Z.files_on_disk_after_optimize : Z.files_on_disk_after_vacuum;
          h += '<div class="lab-row"><span class="lab-l">Do</span><div class="sel-chips"><button type="button" class="sel-chip' + (stage >= 1 ? ' yes' : '') + '" data-act="dt-opt">OPTIMIZE</button><button type="button" class="sel-chip' + (stage >= 2 ? ' yes' : '') + '" data-act="dt-vac">VACUUM</button>' +
            '<button type="button" class="sel-chip" data-act="dt-old">Read version ' + Z.version_before_optimize + '</button><button type="button" class="sel-chip" data-act="dt-zero">VACUUM with 0 hours</button><button type="button" class="sel-chip" data-act="dt-reset">Start again</button></div></div>';
          h += '<div class="lab-out">' + big(inVer, 'files in the latest version', inVer === 1 ? 'good' : 'warn') + big(onDisk, 'files on disk', onDisk > inVer ? 'warn' : 'good') + big(fmtN(Z.rows_now), 'rows, the same all along') + '</div>';
          if (st.old) h += '<div class="code-box">' + H.code({ file: 'reading version ' + Z.version_before_optimize, lang: 'text', code: stage >= 2 ? Z.old_version_after_vacuum : 'Works: the 20 old files are still on disk, so version ' + Z.version_before_optimize + ' can be read.' }) + '</div>';
          if (st.zero) h += '<div class="code-box">' + H.code({ file: 'VACUUM RETAIN 0 HOURS', lang: 'text', code: Z.vacuum_zero_hours }) + '</div>';
          if (st.early && stage === 0) h += callout('tip', 'VACUUM now would delete **nothing**: every one of the ' + Z.files_in_the_version_before + ' files is still part of the latest version. Run OPTIMIZE first, so that some files become old.');
          h += callout(stage === 0 ? 'tip' : stage === 1 ? 'warn' : 'tip', stage === 0 ? '**' + Z.appends + ' appends, ' + Z.files_in_the_version_before + ' small files.** Every reader opens all of them. This is how a streaming job that commits every minute slowly makes a table slow.' :
            stage === 1 ? 'OPTIMIZE wrote **one** new file and a commit that removes the twenty. Disk now holds 21 files: the old ones stay, so time travel and running readers keep working.' : 'VACUUM deleted the files that no version within the retention period needs. Disk is down to 1 file, **and the old versions can no longer be read.** Never vacuum below the longest query or the time travel you promise.');
        }
        box.innerHTML = h + '<p class="lab-note">Recorded: delta-spark 4.0.1 on local Parquet files. Nothing here ran on Databricks or on a cloud store.</p></div>';
        A.bindWidget = function (act, el) {
          if (act === 'dt-e') st.e = Number(el.getAttribute('data-v'));
          else if (act === 'dt-opt') st.f = Math.max(st.f, 1);
          else if (act === 'dt-vac') { if (st.f >= 1) st.f = 2; else st.early = true; }
          else if (act === 'dt-old') st.old = true;
          else if (act === 'dt-zero') st.zero = true;
          else if (act === 'dt-reset') { st.f = 0; st.old = false; st.zero = false; st.early = false; }
          A.render(true);
        };
      }
    };
  })();

  /* ====================== spark-submit: precedence and sizing ====================== */
  (function () {
    var GIB = 1073741824, MIB = 1048576;
    W.submitlab = {
      steps: function () { return 2; },
      hint: 'Pick where a setting was written, then size an application.',
      say: function (s, i) {
        return [
          'The same setting can be written in three places: a properties file, a flag of spark-submit, and the program itself. I ran one small program five times and asked it which value of `spark.sql.shuffle.partitions` it saw. Pick a case.',
          'How big should the application be? This is arithmetic on defaults from the documentation, not a recording: data size, partitions, cores and waves, and the memory that each task gets. Change the numbers and see which ones move.'
        ][i];
      },
      mood: function (s, i) { return i ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.su || (A.local.su = { p: 0, d: 100, e: 8, c: 4, m: 16 }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table('submit.precedence'), r = T.rows[st.p];
          h += row('Where it was set', chips(T.rows.map(function (x, n) { return n; }), st.p, 'su-p', function (n) { return T.rows[n][0]; }));
          h += '<div class="lab-out">' + big(r[1], 'the value the program saw', 'good') + '</div>';
          h += table(['Order of strength', 'Where'], [['1 (strongest)', 'set in the program: `SparkConf` or `spark.conf.set`'], ['2', 'a flag of `spark-submit`: `--conf`, `--executor-memory`'], ['3', 'the file `conf/spark-defaults.conf`, or `--properties-file`'], ['4', 'the default in the code of Spark']],
            function (x, n) { return /Where/.test(x[0]) ? '' : (r[1] === '20' && n === 0) || (r[1] === '50' && n === 1) || (r[1] === '100' && n === 2) || (r[1] === '200' && n === 3) ? 'new' : ''; });
          h += callout('tip', 'The row that matches the case is highlighted. The rule from the documentation: properties set directly on the `SparkConf` win, then flags of `spark-submit`, then the file, then the default. A value that you "set on the command line" can still be overridden by the program, so log the settings at the start of a job.');
          h += '<p class="lab-note">Recorded: spark-submit of Spark 4.0.1 in local mode, with a tiny program that prints the value. Cluster managers add some settings of their own.</p>';
        } else {
          var ds = st.d * GIB, parts = Math.ceil(ds / (128 * MIB)), cores = st.e * st.c, waves = Math.ceil(parts / cores), mem = st.m * GIB, overhead = Math.max(384 * MIB, 0.1 * mem);
          var perCore = (mem - 300 * MIB) * 0.6 / st.c;
          h += row('Data to read', chips([10, 100, 1000], st.d, 'su-d', function (k) { return k >= 1000 ? '1 TiB' : k + ' GiB'; }));
          h += row('Executors', chips([2, 4, 8, 16, 32], st.e, 'su-e'));
          h += row('Cores each', chips([2, 4, 5], st.c, 'su-c'));
          h += row('Memory each', chips([8, 16, 32], st.m, 'su-m', function (k) { return k + ' GiB'; }));
          h += '<div class="lab-out">' + big(fmtN(parts), 'input partitions (128 MiB each)') + big(fmtN(cores), 'cores in all') + big(fmtN(waves), 'waves', waves > 20 ? 'warn' : 'good') + big(mb(perCore), 'unified memory for each core', perCore < 500 * MIB ? 'bad' : '') + big(mb(mem + overhead), 'container ask on YARN or Kubernetes') + '</div>';
          h += callout(perCore < 500 * MIB ? 'warn' : waves > 20 ? 'warn' : 'tip', perCore < 500 * MIB ? 'Each running task has only about ' + mb(perCore) + ' to work with. Wide rows, a sort or a skewed key will spill or fail with out-of-memory. Give each executor more memory, or fewer cores.' :
            waves > 20 ? 'Many waves is fine if the tasks are short, but this is a long queue. More executors shorten it, and so does reading less.' : 'A reasonable start. Run it, read the stage table, and change one number at a time.');
          h += '<p class="lab-note">Arithmetic, not a recording. Partitions = data / 128 MiB (the default `maxPartitionBytes`). Waves = partitions / cores, rounded up. Unified memory = (memory - 300 MiB) x 0.6, shared by the cores. Overhead = the larger of 384 MiB and 10 percent of the executor memory (documented default). Start from these and measure.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'su-p') st.p = v; else if (act === 'su-d') st.d = v; else if (act === 'su-e') st.e = v; else if (act === 'su-c') st.c = v; else if (act === 'su-m') st.m = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Diagnose a run from its numbers ====================== */
  (function () {
    var CAUSES = ['skew', 'too many tiny tasks', 'spill', 'small files', 'no pruning', 'the cache works'];
    function cases() {
      var K = G.table('skew.aggregations'), SH = G.table('parts.shuffle'), SP = G.counts('mem.spill'), VA = G.table('files.variants'), TO = G.table('files.touched'), CR = G.table('mem.cache_reads');
      var win = K.rows[1], tiny = SH.rows[0], small = VA.rows.filter(function (r) { return /200 tasks after a shuffle/.test(r[0]); })[0] || VA.rows[2], nop = TO.rows[2];
      return [
        { facts: [['tasks', win[1]], ['records per task, median', fmtN(Number(win[3]))], ['records in the busiest task', fmtN(Number(win[4]))]], ans: 0, fix: 'One key holds far more rows than the others, so one task is the whole stage. Let adaptive skew handling split it, or salt the key, or broadcast the small side.' },
        { facts: [['tasks after the shuffle', tiny[1]], ['records per task, median', tiny[3]], ['records in all', tiny[5]]], ans: 1, fix: 'Two hundred tasks for 48 records: the overhead is the stage. Lower `spark.sql.shuffle.partitions` or leave adaptive execution to merge the empty partitions.' },
        { facts: [['rows sorted', fmtN(SP.rows_sorted)], ['memory bytes spilled', fmtN(SP.memory_bytes_spilled)], ['disk bytes spilled', fmtN(SP.disk_bytes_spilled)]], ans: 2, fix: 'Tasks held more than they could keep in memory and wrote the rest to disk. More partitions make each task smaller. A smaller row or more memory per core also helps.' },
        { facts: [['files written', fmtN(Number(small[1]))], ['total KB', fmtN(Number(small[2]))], ['KB per file', small[3]]], ans: 3, fix: 'Each of 200 tasks wrote a piece into every one of 14 folders. Repartition by the folder column before the write, so each folder gets few, larger files, or compact afterwards.' },
        { facts: [['filter', nop[0]], ['files opened', nop[1]], ['files in the dataset', nop[2]]], ans: 4, fix: 'The filter is not on the partition column, so every file is opened. Filter on the partition column too, or sort the data inside the files so row groups can be skipped.' },
        { facts: [['first count, bytes read', fmtN(Number(CR.rows[0][1]))], ['second count, bytes read', fmtN(Number(CR.rows[1][1]))]], ans: 5, fix: 'This one is good news: the second count read the cache instead of the files, and read about half the bytes. Nothing to fix.' }
      ];
    }
    W.diagnose = {
      steps: function () { return 1; },
      hint: 'Read the numbers. Name the cause. Then read the fix.',
      say: function () { return 'This is the skill of the last mission. Here are six small tables of numbers, each one recorded from a run that you met in an earlier mission. Do not look for the cause in the code. Read the numbers and name it.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var C = cases(), st = A.local.dg || (A.local.dg = { c: 0, g: {} }), c = C[st.c], g = st.g[st.c], h = '<div class="lab">';
        h += row('Run', chips(C.map(function (x, n) { return n; }), st.c, 'dg-c', function (n) { return 'run ' + (n + 1) + (st.g[n] !== undefined ? (st.g[n] === C[n].ans ? ': right' : ': wrong') : ''); }));
        h += table(['What the run showed', 'Value'], c.facts);
        h += row('The cause is', chips(CAUSES.map(function (x, n) { return n; }), g === undefined ? '' : g, 'dg-g', function (n) { return CAUSES[n]; }));
        if (g !== undefined) h += callout(g === c.ans ? 'tip' : 'warn', (g === c.ans ? '**Right: ' + CAUSES[c.ans] + '.** ' : 'Not ' + CAUSES[g] + '. It is **' + CAUSES[c.ans] + '**. ') + c.fix);
        var done = 0; C.forEach(function (x, n) { if (st.g[n] === x.ans) done++; });
        h += '<div class="lab-out">' + big(done + ' of ' + C.length, 'named correctly') + '</div>';
        box.innerHTML = h + '<p class="lab-note">Recorded: every table comes from the event log of an earlier mission in Spark 4.0.1, local mode.</p></div>';
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'dg-c') st.c = v; else st.g[st.c] = v;
          A.render(true);
        };
      }
    };
  })();
})();
