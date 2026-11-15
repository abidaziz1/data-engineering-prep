/* Git course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: real Git 2.43 in throwaway repositories with a fixed author and fixed dates.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. Hosted platforms did not run. */
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
  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }
  function mb(x) { return (x / 1e6).toLocaleString('en-US', { maximumFractionDigits: x < 1e8 ? 1 : 0 }) + ' MB'; }




  /* ====================== 1. Where a file is after each step ====================== */
  W.areas = (function () {
    var CODES = {
      '(clean)': ['good', 'Nothing differs: the file is the same in the working tree, the index and the last commit.'],
      ' M': ['warn', 'The file changed in the working tree and is **not staged**. A commit now would leave it out.'],
      'M ': ['good', 'The change is **staged**. The next commit will contain exactly this version.'],
      'MM': ['bad', 'There is a staged version **and** a newer edit that is not staged. A commit takes the staged one and leaves the edit behind.']
    };
    function code(st) { return st.slice(0, 2) === ' M' ? ' M' : st.slice(0, 2) === 'M ' ? 'M ' : st.slice(0, 2) === 'MM' ? 'MM' : '(clean)'; }
    W.areasInfo = { codes: CODES, code: code };
    return {
      steps: function () { return 1; },
      hint: 'Pick a step and read the three ids.',
      say: function () { return 'One file, six steps. After each step I asked Git for the id of the file in three places: the working tree, the index and the last commit. When two ids are the same, the text is the same. Pick a step and say where the newest text is.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('areas.steps'), st = A.local.ar || (A.local.ar = { k: 0 }), r = t.rows[st.k];
        var h = '<div class="lab">' + row('Step', chips(t.rows.map(function (x, k) { return k; }), st.k, 'ar-k', function (k) { return (k + 1) + '. ' + t.rows[k][0]; }));
        var c = code(r[5]);
        h += big([[r[2], 'working tree', r[2] !== r[3] ? 'warn' : ''], [r[3], 'index (staged)', r[3] !== r[4] ? 'warn' : ''], [r[4], 'last commit', '']]);
        h += pre('$ git status --short models/orders_daily.sql\n' + r[5], 'cmd');
        h += callout(CODES[c][0], CODES[c][1] + (r[1] ? ' The step was `' + r[1] + '`.' : ''));
        h += note(' Ids are the first 7 characters of the hash of the file. The file is `models/orders_daily.sql` and the steps ran in a real repository.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ar-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. Merge, rebase or squash ====================== */
  W.mr = (function () {
    var KINDS = [['merge', 'git merge feature'], ['rebase', 'git rebase main, then merge'], ['squash', 'git merge --squash feature']];
    function info(k) {
      var C = G.counts, X = G.text, ids = C('mr.ids');
      if (k === 'merge') return { graph: X('mg.graph'), out: X('mg.merge'), commits: C('mg').commits, merges: C('mg').parents === 2 ? 1 : 0, ids: 'F1 ' + ids.F1 + ' and F2 ' + ids.F2 + ' keep their ids', kept: true, why: 'The merge adds **one commit with two parents** (`' + ids.M + '`) and changes nothing that exists. F1 and F2 keep their ids, and the history shows that the work ran in parallel.' };
      if (k === 'rebase') return { graph: X('rb.graph'), out: X('rb.rebase') + '\n' + X('rb.ff_merge'), commits: C('rb').commits, merges: C('rb').merge_commits, ids: 'F1 ' + ids.F1 + ' is now ' + ids.F1r + ', F2 ' + ids.F2 + ' is now ' + ids.F2r, kept: false, why: 'The rebase **copies** F1 and F2 on top of the newest commit of main. The copies have the same author, the same changes and **new ids**, because a commit id includes the id of its parent. The history is one line, and anybody who had the old ids has commits that no longer belong to the branch.' };
      return { graph: X('sq.graph'), out: X('sq.merge'), commits: C('sq').commits, merges: C('sq').merge_commits, ids: 'F1 and F2 are not in main: one new commit holds both changes', kept: false, why: 'A squash merge puts the **changes** of the branch into one new commit on main. The history is one line and short, but the branch is not recorded as merged, so `git branch -d feature` refuses and the individual commits are only on the branch.' };
    }
    W.mrInfo = { info: info, kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick how the branch is joined.',
      say: function () { return 'The same two branches of the same repository, joined three ways. Each case started from an exact copy of the repository. Pick one, read the history that it left, and say whether the commit ids of the feature branch survived.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.mr || (A.local.mr = { k: 'merge' }), d = info(st.k);
        var h = '<div class="lab">' + row('Join with', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'mr-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += pre('$ git log --oneline --graph\n' + d.graph, 'cmd');
        h += big([[String(d.commits), 'commits in the history'], [String(d.merges), 'merge commits', d.merges ? 'warn' : 'good'], [d.kept ? 'kept' : 'new or gone', 'the ids F1 and F2', d.kept ? 'good' : 'warn']]);
        h += callout('tip', d.why) + note(' ' + d.ids + '.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'mr-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. How far an undo goes ====================== */
  W.undo = (function () {
    function info(row_) {
      var label = row_[0], inCommit = row_[2] === '0.09', inIndex = row_[3] === '0.09', inFile = row_[4] === '0.09';
      var kept = inFile ? 'in the file' : inIndex ? 'staged' : inCommit ? 'only in the old commit' : 'gone from this branch';
      var why = {
        'start': 'Nothing was undone. The change `0.09` is in the commit, in the index and in the file.',
        'git reset --soft HEAD~1': 'Only the **branch** moved. The change is still **staged**, and the file still has it. You can commit again with a different message.',
        'git reset --mixed HEAD~1': 'The branch moved and the **index** was reset. The change is **not staged**, but it is **still in the file**. This is the default of `git reset`.',
        'git reset --hard HEAD~1': 'Branch, index and **file** were reset. The change is **gone from the file**. The old commit is still in the repository, and `git reflog` can find it.',
        'git revert HEAD': 'Nothing moved backwards. Git added **a new commit** that undoes the change, so the history has four commits and the old one stays. This is the way to undo something that was already pushed.'
      }[label];
      return { kept: kept, why: why };
    }
    W.undoInfo = { info: info };
    return {
      steps: function () { return 1; },
      hint: 'Pick a command and see where the change went.',
      say: function () { return 'The last commit changed the tax rate from 0.08 to 0.09. Five repositories, each started in the same state, got a different undo. After each one I read the rate in the last commit, in the index and in the file. Pick one and say where 0.09 is.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('un.reset'), st = A.local.un || (A.local.un = { k: 1 }), r = t.rows[st.k], d = info(r);
        var h = '<div class="lab">' + row('Command', chips(t.rows.map(function (x, k) { return k; }), st.k, 'un-k', function (k) { return t.rows[k][0]; }));
        h += big([[r[2], 'rate in the last commit', r[2] === '0.09' ? 'warn' : ''], [r[3], 'rate in the index', r[3] === '0.09' ? 'warn' : ''], [r[4], 'rate in the file', r[4] === '0.09' ? 'warn' : ''], [String(r[5]), 'commits in the history']]);
        h += callout(/hard/.test(r[0]) ? 'bad' : 'good', d.why) + note(' The change `0.09` is: ' + d.kept + '. Each case ran in a repository of its own, from the same three commits.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'un-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 4. Six pushes ====================== */
  W.push = (function () {
    var KINDS = [['first', 'The first push of a new repository'], ['rejected', 'The remote has newer work'], ['pull', 'git pull, with nothing configured'], ['rebase', 'git pull --rebase, then push'], ['lease', 'git push --force-with-lease, after the remote moved'], ['force', 'git push --force']];
    function info(k) {
      var X = G.text, C = G.counts;
      if (k === 'first') return { cmd: 'git push -u origin main', out: X('rm.push_first'), ok: true, why: 'The remote was empty, so the push **adds** to it and is accepted. `-u` also remembers that `main` follows `origin/main`.' };
      if (k === 'rejected') return { cmd: 'git push origin main', out: X('rm.push_rejected'), ok: false, why: 'Omar had pushed first. The remote has a commit that Maya does not have, so her push would **throw it away**. Git refuses (exit code ' + C('rm.push_rejected').rc + '). Nothing changed on either side.' };
      if (k === 'pull') return { cmd: 'git pull', out: X('rm.pull_plain'), ok: false, why: 'Both sides have new commits, and Git will not choose between a merge and a rebase for you. It stops with exit code ' + C('rm.pull_plain').rc + '. Choose with `--rebase`, `--no-rebase` or `pull.rebase`.' };
      if (k === 'rebase') return { cmd: 'git pull --rebase && git push origin main', out: X('rm.pull_rebase') + '\n' + X('rm.push_ok'), ok: true, why: 'Maya\'s commit was **replayed on top of** Omar\'s, so the history is one line (' + C('rm.pull_rebase').commits + ' commits, ' + C('rm.pull_rebase').merge_commits + ' merge commits) and the push adds to the remote.' };
      if (k === 'lease') return { cmd: 'git push --force-with-lease origin main', out: X('rm.force_with_lease'), ok: false, why: 'Omar pushed a commit after Maya\'s last fetch. `--force-with-lease` overwrites only if the remote is **where you last saw it**, so it refused (**stale info**). It saved Omar\'s commit.' };
      return { cmd: 'git push --force origin main', out: X('rm.force'), ok: true, danger: true, why: 'A plain `--force` overwrites **whatever is there**. The push was accepted (the report says `forced update`) and the newest commit of Omar is no longer on the branch. In the recording that commit still existed in the remote repository (' + C('rm.force').omar_commit_still_on_remote + '), but no branch pointed to it.' };
    }
    W.pushInfo = { info: info, kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick a push and read what Git said.',
      say: function () { return 'Maya and Omar share one remote. Six pushes, each with the exact words that Git printed. Pick one, say whether the remote changed, and say what would have been lost.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.pu || (A.local.pu = { k: 'rejected' }), d = info(st.k);
        var h = '<div class="lab">' + row('Push', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'pu-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += pre('$ ' + d.cmd + '\n' + d.out, 'cmd');
        h += big([[d.ok ? 'yes' : 'no', 'the remote changed', d.ok ? (d.danger ? 'bad' : 'good') : 'warn']]);
        h += callout(d.danger ? 'bad' : d.ok ? 'good' : 'tip', d.why) + note(' All six ran against a real shared repository on this machine, with two clones. Hosted platforms add their own rules on top.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'pu-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 5. How a data file grows a repository ====================== */
  W.size = (function () {
    var KINDS = [['append', 'The file grows by 500 rows each night'], ['rewrite', 'The whole file comes back in another order']];
    W.sizeInfo = { kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick how the file changes.',
      say: function () { return 'A CSV of 20,000 orders is committed seven times. In one case rows are appended. In the other the same rows come back in a different order, as a re-sorted export does. After a gc I measured the .git folder. Pick one and say why the sizes differ.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sz || (A.local.sz = { k: 'append' }), D = G.counts('data.sizes')[st.k], one = D.file_bytes / 1024;
        var h = '<div class="lab">' + row('The file', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'sz-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += bar('one version of the file', one, Math.max(D.loose_kib, D.after_gc_kib), n(Math.round(one)) + ' KiB', '');
        h += bar('.git of 7 versions, loose', D.loose_kib, Math.max(D.loose_kib, D.after_gc_kib), n(D.loose_kib) + ' KiB', 'bad');
        h += bar('.git after git gc', D.after_gc_kib, Math.max(D.loose_kib, D.after_gc_kib), n(D.after_gc_kib) + ' KiB', st.k === 'append' ? 'good' : 'bad');
        h += big([[D.times_the_file.toFixed(2) + ' x', 'size after gc, in versions of the file', st.k === 'append' ? 'good' : 'bad'], [String(D.loose_objects), 'objects before gc']]);
        h += callout(st.k === 'append' ? 'good' : 'bad', st.k === 'append'
          ? 'After `git gc` the seven versions take **less than one copy** of the file: the pack stores the first version and, for each later one, only the **difference**. Rows that are appended are a small difference.'
          : 'The seven versions take about **' + D.times_the_file.toFixed(1) + ' copies** of the file. When every line moves, the versions share no long runs of text, so Git has no small difference to store. A file that is **rewritten** is stored almost in full each time.');
        var cl = G.table('data.clones');
        h += '<div class="lab-h">Cloning the repository where the file is re-sorted</div>' + table(cl.cols, cl.rows, null, 1);
        h += note(' Sizes are the bytes of the .git folder in KiB, counted by walking its files. A shallow clone keeps one commit, and a blobless clone keeps all commits and fetches file contents when they are needed.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sz-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 6. Bisect, test by test ====================== */
  W.bisect = (function () {
    function ranges() {
      var B = G.counts('hist.bisect_tests'), lo = B.start.filter(function (x) { return x[0] === 'good'; })[0][1], hi = B.start.filter(function (x) { return x[0] === 'bad'; })[0][1], out = [{ lo: lo, hi: hi, tested: null, verdict: null }];
      B.tests.forEach(function (t) { if (t[0] === 'good') lo = t[1]; else hi = t[1]; out.push({ lo: lo, hi: hi, tested: t[1], verdict: t[0] }); });
      return out;
    }
    W.bisectInfo = { ranges: ranges };
    return {
      steps: function () { return 1; },
      hint: 'Pick a test to see what is left.',
      say: function () { return 'Sixteen commits. The check passes on the first and fails on the last. `git bisect run` tested four commits and named the first bad one. Pick each test in turn and see how many commits are still suspects.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var R = ranges(), st = A.local.bi || (A.local.bi = { k: 0 }), r = R[st.k], H = G.counts('hist'), B = G.counts('hist.bisect_tests');
        var h = '<div class="lab">' + row('After test', chips(R.map(function (x, k) { return k; }), st.k, 'bi-k', function (k) { return k === 0 ? 'none' : String(k); }));
        var cells = '';
        for (var c = 1; c <= B.commits; c++) {
          var cls = c <= r.lo ? 'fixed' : c >= r.hi ? 'stale' : '';
          if (c === r.tested) cls = r.verdict === 'good' ? 'fixed' : 'stale';
          cells += '<div class="part ' + cls + '">' + c + '<small>' + (c === r.lo ? 'good' : c === r.hi ? 'bad' : c === r.tested ? r.verdict : 'suspect') + '</small></div>';
        }
        h += '<div class="parts">' + cells + '</div>';
        var suspects = Math.max(0, r.hi - r.lo - 1);
        h += big([[r.tested ? '#' + r.tested + ' ' + r.verdict : 'start', 'the commit that was tested'], [String(suspects), 'commits between good and bad'], [String(st.k), 'tests so far']]);
        h += callout(st.k === R.length - 1 ? 'good' : 'tip', st.k === R.length - 1
          ? 'The last good commit is #' + r.lo + ' and the first bad one is **#' + r.hi + '**: `' + H.bad_commit + '`, the commit that changed the tax rate to 0.8. Fifteen commits needed **' + (R.length - 1) + '** tests. Each test removes about half, so n commits need about log2 of n tests.'
          : 'Git picks a commit in the middle of what is left, runs `checks/check.sh`, and a pass or a failure removes about half of the suspects.');
        h += note(' The tests and their order are the ones that `git bisect run sh checks/check.sh` made in a real repository, read from `git bisect log`.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'bi-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
