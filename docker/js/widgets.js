/* Docker course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: a real Docker Engine on one Linux machine, with the Brewline loader job and a real Postgres.
   Where a lab shows a combination that the recorder did not run, it says "Computed". Text in notes and callouts goes through the formatter:
   use `code` and **bold**, never HTML tags. Docker Desktop, other runtimes and cloud registries did not run. */
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
  function mb(x) { return (x / 1e6).toLocaleString('en-US', { maximumFractionDigits: x < 1e8 ? 1 : 0 }) + ' MB'; }


  /* ====================== 1. Which build steps run again ====================== */
  W.cache = (function () {
    var ORDERS = ['copy first', 'dependencies first'], CHANGES = ['nothing', 'one line of load_orders.py', 'requirements.txt'];
    function steps(order, change) {
      return G.table('cache.steps').rows.filter(function (r) { return r[0] === order && r[1] === change; }).map(function (r) { return { n: r[2], cmd: r[3], cached: r[4] === true }; });
    }
    W.cacheInfo = { steps: steps, orders: ORDERS, changes: CHANGES };
    return {
      steps: function () { return 1; },
      hint: 'Pick an order of instructions and a change.',
      say: function () { return 'The same loader, built with two orders of the same instructions. In one, the code is copied before the packages are installed. In the other, the packages come first. Change one thing and rebuild: which steps does Docker take from the cache, and which run again?'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ca || (A.local.ca = { order: 'dependencies first', change: 'one line of load_orders.py' });
        var list = steps(st.order, st.change), ran = list.filter(function (x) { return !x.cached; }), pip = ran.some(function (x) { return /^RUN pip/.test(x.cmd); });
        var h = '<div class="lab">' + row('Order of the instructions', chips(ORDERS, st.order, 'ca-o')) + row('What you changed', chips(CHANGES, st.change, 'ca-c'));
        h += table(['Step', 'Instruction', 'What the build did'], list.map(function (x) { return [x.n, x.cmd, x.cached ? 'taken from the cache' : 'ran again']; }), function (r) { return r[2] === 'ran again' ? 'dup' : 'new'; });
        h += big([[ran.length + ' of ' + list.length, 'steps ran again', ran.length === 0 ? 'good' : ran.length > 2 ? 'bad' : 'warn'], [pip ? 'yes' : 'no', 'the packages were installed again', pip ? 'bad' : 'good']]);
        h += st.change === 'nothing'
          ? callout('tip', 'Nothing changed, so every step comes from the cache and the build finishes at once.')
          : pip
            ? callout('bad', st.change === 'requirements.txt' && st.order === 'dependencies first'
              ? 'The packages changed, so the install has to run again. That is correct, and it is the only case in which this order installs packages again.'
              : 'A change to **one line of code** made `pip install` run again, because the code was copied before it. Every code change now costs a full install.')
            : callout('good', 'The packages come first, so a change to the code only copies the code again. The install is taken from the cache.');
        h += note(' Each case was built twice on a real Docker Engine: once with no cache, then again after the change. A "cached" step is one that BuildKit printed as CACHED.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ca-o') st.order = v; if (act === 'ca-c') st.change = v; A.render(true); };
      }
    };
  })();

  /* ====================== 2. What makes an image large ====================== */
  W.size = (function () {
    var TOPICS = [['base', 'Which base image'], ['pkgs', 'Slim or Alpine, with pandas'], ['rm', 'Delete a file in a later layer'], ['test', 'Test tools in the image']];
    function info() {
      var B = G.table('small.bases').rows, H = G.counts('small.heavy'), RM = G.counts('small.rm'), SG = G.counts('small.stages');
      return { bases: B, heavy: H, rm: RM, stages: SG };
    }
    W.sizeInfo = { info: info, topics: TOPICS };
    return {
      steps: function () { return 1; },
      hint: 'Pick an experiment.',
      say: function () { return 'Four experiments on the size of an image, each one built on a real Docker Engine. Pick one and read the bars. The numbers are the size that docker image inspect reports.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sz || (A.local.sz = { topic: 'base' }), d = info(), h = '<div class="lab">' + row('Experiment', chips(TOPICS.map(function (t) { return t[0]; }), st.topic, 'sz-t', function (k) { return TOPICS.filter(function (t) { return t[0] === k; })[0][1]; }));
        var mx, c;
        if (st.topic === 'base') {
          mx = d.bases[0][1];
          h += '<div class="lab-h">The base image alone</div>' + d.bases.map(function (r) { return bar(r[0], r[1], mx, mb(r[1]) + ', ' + r[2] + ' layers', r[0] === 'python:3.13-slim' ? 'good' : ''); }).join('');
          c = callout('tip', 'The full image is **' + (d.bases[0][1] / d.bases[1][1]).toFixed(1) + ' times** the size of slim. It carries compilers and headers that a job that installs wheels does not use. Alpine is **' + (d.bases[1][1] / d.bases[2][1]).toFixed(1) + ' times** smaller than slim, and the next experiment shows what that saves once real packages are on it.');
        } else if (st.topic === 'pkgs') {
          var hv = d.heavy; mx = Math.max(hv.slim.size, hv.alpine.size);
          h += '<div class="lab-h">The same pip install of pandas, pyarrow and psycopg on two bases</div>' + bar('python:3.13-slim', hv.slim.size, mx, mb(hv.slim.size), '') + bar('python:3.13-alpine', hv.alpine.size, mx, mb(hv.alpine.size), 'good');
          h += big([[((1 - hv.alpine.size / hv.slim.size) * 100).toFixed(0) + ' %', 'smaller on Alpine'], [mb(hv.slim.size - d.bases[1][1]), 'added by the packages on slim'], [hv.slim.pandas, 'pandas and pyarrow versions, the same on both']]);
          c = callout('tip', 'Both builds used ready-made wheels, so both worked. The packages add about **' + mb(hv.slim.size - d.bases[1][1]) + '**, which is far more than the base. Alpine saves less than a tenth here.');
        } else if (st.topic === 'rm') {
          var rm = d.rm; mx = rm.later_layer;
          h += '<div class="lab-h">A 50 MB file that is created and then deleted</div>' + bar('alpine:3.22 alone', rm.base, mx, mb(rm.base), '') + bar('created in one RUN, deleted in the next', rm.later_layer, mx, mb(rm.later_layer), 'bad') + bar('created and deleted in the same RUN', rm.same_layer, mx, mb(rm.same_layer), 'good');
          c = callout('bad', 'A later layer can hide a file and cannot give its bytes back. The image keeps the **' + mb(rm.file_bytes) + '** in the layer that created it. Delete in the same `RUN` that created the file.');
        } else {
          var sg = d.stages; mx = sg.test_image_size;
          h += '<div class="lab-h">One Dockerfile with a test stage and a runtime stage</div>' + bar('target test (pytest installed)', sg.test_image_size, mx, mb(sg.test_image_size), 'bad') + bar('target runtime', sg.runtime_image_size, mx, mb(sg.runtime_image_size), 'good');
          h += big([[String(sg.pytest_in_test), 'pytest importable in the test image'], [String(sg.pytest_in_runtime), 'pytest importable in the runtime image', sg.pytest_in_runtime === 'False' ? 'good' : 'bad'], [sg.default_build_ran_pytest ? 'yes' : 'no', 'a plain docker build ran the tests', sg.default_build_ran_pytest ? '' : 'warn']]);
          c = callout('tip', 'Test tools stay out of the image you ship. A plain `docker build` builds only the stages that the last stage needs, so **the tests did not run**. Build `--target test` in CI, or make the runtime stage copy something from the test stage.');
        }
        h += c + note(' These images were built with the commands in the lessons. Sizes differ by a few hundred bytes from one build to the next.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sz-t') st.topic = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. What survives ====================== */
  W.vol = (function () {
    var WAYS = ['no volume flag', 'named volume', 'bind mount of a host folder', 'tmpfs (memory)'], ACTS = [['after stop and start', 1], ['after rm and a new container', 2]];
    function cell(way, act) { var r = G.table('volumes.matrix').rows.filter(function (x) { return x[0] === way; })[0]; return r[act]; }
    W.volInfo = { cell: cell, ways: WAYS };
    return {
      steps: function () { return 1; },
      hint: 'Pick where the data lives, then what you do to the container.',
      say: function () { return 'A Postgres container with 5,000 orders in it. Pick how its data directory is stored, then stop and start it, or remove it and start a new one. Did the orders survive?'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.vo || (A.local.vo = { way: WAYS[0], act: 1 }), v = cell(st.way, st.act), kept = v !== 'no table', an = G.counts('volumes.anonymous'), bd = G.counts('volumes.bind');
        var h = '<div class="lab">' + row('Where the data lives', chips(WAYS, st.way, 'vo-w')) + row('What you do', chips(ACTS.map(function (a) { return a[1]; }), st.act, 'vo-a', function (k) { return ACTS.filter(function (a) { return String(a[1]) === String(k); })[0][0]; }));
        h += big([[kept ? n(v) : 'no table', 'orders in the table now', kept ? 'good' : 'bad'], ['5,000', 'orders before']]);
        var msg;
        if (st.way === 'no volume flag') {
          msg = st.act === 1 ? callout('good', 'The Postgres image declares a volume for its data directory, so Docker created an **anonymous volume** even though you gave no flag. A stop and a start keep it.')
            : callout('bad', 'The new container got a new, empty anonymous volume. The old one is still on the disk: `docker rm` left **' + an.dangling_volumes_left_by_rm + ' dangling volume** behind, with your orders in it and no name to find it by.');
        } else if (st.way === 'named volume') {
          msg = callout('good', 'The volume has a name, so the new container mounts the same data. A volume stays until you remove it with `docker volume rm`, or with `compose down -v`.');
        } else if (st.way === 'bind mount of a host folder') {
          msg = callout('good', 'The data is in a folder of your machine. The files belong to uid:gid **' + bd.owner_of_pg_version_on_host.split(' ')[0] + '**, the postgres user inside the image, and have mode ' + bd.owner_of_pg_version_on_host.split(' ')[1] + '. You need that user, or root, to read them.');
        } else {
          msg = callout('bad', 'tmpfs lives in memory. It is gone when the container stops, so the next start finds an empty data directory and initialises a new database.');
        }
        h += msg + note(' Every cell was run on a real Docker Engine with postgres:16-alpine and 5,000 rows.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v2 = el.getAttribute('data-v'); if (act === 'vo-w') st.way = v2; if (act === 'vo-a') st.act = +v2; A.render(true); };
      }
    };
  })();

  /* ====================== 4. Can it connect ====================== */
  W.net = (function () {
    function attempts() {
      var D = G.counts('net.default'), U = G.counts('net.user'), P = G.counts('net.ports'), M = G.counts('net.modes');
      return [
        { k: 'a1', t: 'Container on the default bridge, to another container by its name', cmd: 'docker run --rm alpine getent hosts dkc-a', out: D.resolve_by_name_rc === 0 ? 'resolved' : 'no answer, exit code ' + D.resolve_by_name_rc, ok: D.resolve_by_name_rc === 0, why: 'The default bridge has no name service. Containers on it can reach each other only by IP address.' },
        { k: 'a2', t: 'The same, by the IP address', cmd: 'docker run --rm alpine ping -c 1 172.17.0.2', out: D.ping_by_ip_rc === 0 ? '1 packet received' : 'failed', ok: D.ping_by_ip_rc === 0, why: 'The address works, until the container is recreated and gets another one.' },
        { k: 'a3', t: 'Container on a network you created, by name', cmd: 'DATABASE_URL=postgresql://postgres:...@dkc-db:5432/brewline', out: G.text('net.byname'), ok: true, why: 'On a network you create, Docker answers name lookups for its containers (the server is ' + (U.dns_server ? '127.0.0.11' : '?') + ' in every container).' },
        { k: 'a4', t: 'The same network, with localhost as the host name', cmd: 'DATABASE_URL=postgresql://postgres:...@localhost:5432/brewline', out: G.text('net.localhost'), ok: false, why: 'localhost is the container itself. Nothing listens on port 5432 there.' },
        { k: 'a5', t: 'The same network, with a name that is not a container', cmd: 'DATABASE_URL=postgresql://postgres:...@database:5432/brewline', out: G.text('net.wrongname'), ok: false, why: 'The name is not the name of a container or service on the network.' },
        { k: 'a6', t: 'From your machine, to a container started without -p', cmd: 'docker port dkc-p3', out: G.text('net.port3') + (P.host_reaches_p3_from_localhost_15434 ? '' : ' (a connection from the host gets no answer)'), ok: false, why: 'Nothing is published. The container is reachable from other containers on its network only.' },
        { k: 'a7', t: 'From your machine, with -p 127.0.0.1:15432:5432', cmd: 'docker port dkc-p1', out: G.text('net.port1') + (P.host_reaches_p1 ? ', and the host connects' : ''), ok: P.host_reaches_p1 === true, why: 'The port is published on the loopback address, so only your machine can connect.' },
        { k: 'a8', t: 'With -p 15433:5432 (no address)', cmd: 'docker port dkc-p2', out: G.text('net.port2'), ok: true, why: 'Without an address Docker binds every interface. Anybody who can reach your machine can reach the port.' },
        { k: 'a9', t: 'A second container on the same host port', cmd: 'docker run -p 127.0.0.1:15432:5432 ...', out: G.text('net.busy'), ok: false, why: 'A host port belongs to one container at a time.' }
      ];
    }
    W.netInfo = { attempts: attempts };
    return {
      steps: function () { return 1; },
      hint: 'Pick an attempt and read what happened.',
      say: function () { return 'Nine attempts to connect to Postgres, each one run on a real Docker Engine. Pick one, read the command and what came back, and say why before you read the explanation.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var list = attempts(), st = A.local.nt || (A.local.nt = { k: 'a4' }), cur = list.filter(function (x) { return x.k === st.k; })[0];
        var h = '<div class="lab">' + row('Attempt', chips(list.map(function (x) { return x.k; }), st.k, 'nt-k', function (k) { return list.filter(function (x) { return x.k === k; })[0].t; }));
        h += '<div class="lab-h">' + esc(cur.t) + '</div><pre class="lab-pre cmd">' + esc('$ ' + cur.cmd) + '</pre>';
        h += '<pre class="lab-pre">' + esc(cur.out) + '</pre>';
        h += big([[cur.ok ? 'it works' : 'it fails', 'the result', cur.ok ? 'good' : 'bad']]);
        h += callout(cur.ok ? 'good' : 'bad', cur.why) + note(' All nine results were produced by the recorder on a real Docker Engine.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'nt-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 5. Limits and what the job sees ====================== */
  W.limits = (function () {
    function cases() {
      var oom = G.table('jobs.oom').rows, cp = G.counts('jobs.cpus'), lim = G.counts('jobs.limit_seen').inside;
      var out = oom.map(function (r, k) { return { k: 'm' + k, t: 'docker run -m ' + r[0] + ', the job allocates ' + r[1], kind: 'mem', limit: r[0], alloc: r[1], exit: r[2], oom: r[3], printed: r[4] }; });
      out.push({ k: 'c0', t: 'No CPU option: what Python reports', kind: 'cpu', flag: '(none)', cpu: cp.no_limit.cpu_count, proc: cp.no_limit.process_cpu_count });
      out.push({ k: 'c1', t: 'docker run --cpus 0.5', kind: 'cpu', flag: '--cpus 0.5', cpu: cp.cpus_0_5.cpu_count, proc: cp.cpus_0_5.process_cpu_count });
      out.push({ k: 'c2', t: 'docker run --cpuset-cpus 0', kind: 'cpu', flag: '--cpuset-cpus 0', cpu: cp.cpuset_0.cpu_count, proc: cp.cpuset_0.process_cpu_count });
      W.limitsMemSeen = lim;
      return out;
    }
    W.limitsInfo = { cases: cases };
    return {
      steps: function () { return 1; },
      hint: 'Pick a limit and see what the job does.',
      say: function () { return 'Docker can limit the memory and the CPU of a container. Pick a case. For memory you see how the job ends. For the CPU you see what a Python program believes about the machine it runs on.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var list = cases(), st = A.local.lm || (A.local.lm = { k: 'm1' }), c = list.filter(function (x) { return x.k === st.k; })[0];
        var h = '<div class="lab">' + row('Case', chips(list.map(function (x) { return x.k; }), st.k, 'lm-k', function (k) { return list.filter(function (x) { return x.k === k; })[0].t; }));
        if (c.kind === 'mem') {
          h += big([[String(c.exit), 'exit code', c.exit === 0 ? 'good' : 'bad'], [c.oom ? 'true' : 'false', 'OOMKilled in docker inspect', c.oom ? 'bad' : 'good'], [c.printed || '(nothing printed)', 'what the job printed']]);
          h += c.oom
            ? callout('bad', 'The kernel killed the process when it went over **' + c.limit + '**. The job never printed a line, and Python had no chance to raise an error. Exit code **137** is 128 plus signal 9. In a log, look for `OOMKilled`, not for a traceback.')
            : callout('good', 'The job asked for ' + c.alloc + ' and the limit was ' + c.limit + ', so it fit and ended with exit code 0.');
          h += note(' Inside the container the memory limit reads ' + n(G.counts('jobs.limit_seen').inside) + ' bytes for -m 64m.');
        } else {
          h += big([[String(c.cpu), 'os.cpu_count()'], [String(c.proc), 'os.process_cpu_count()', c.proc === 1 ? 'good' : 'warn']]);
          h += c.flag === '--cpus 0.5'
            ? callout('bad', '`--cpus 0.5` is a **time quota**, not a number of CPUs. Python still sees **' + c.cpu + '** and a library that sizes its thread pool from that number starts ' + c.cpu + ' workers that share half a CPU.')
            : c.flag === '--cpuset-cpus 0'
              ? callout('good', '`--cpuset-cpus` pins the container to CPUs. `os.process_cpu_count()` sees the pinning (**' + c.proc + '**), while `os.cpu_count()` still reports the machine.')
              : callout('tip', 'With no limit a job sees every CPU of the host, here ' + c.cpu + '. Set the worker count from a setting, not from the machine.');
          h += note(' Recorded with python:3.13-slim on a machine with ' + G.meta('cpus') + ' CPUs.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'lm-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 6. docker stop ====================== */
  W.stop = (function () {
    function rows() { return G.table('jobs.signals').rows.map(function (r) { return { how: r[0], pid: r[1], waited: r[2] === 'yes', exit: r[3], handled: r[4] === 'yes' }; }); }
    W.stopInfo = { rows: rows };
    return {
      steps: function () { return 1; },
      hint: 'Pick how the job starts, then read what docker stop did.',
      say: function () { return 'A job that loops forever, stopped with docker stop and a grace period of 3 seconds. Pick how it was started. Did it get the signal, did it finish its work, and how did it end?'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var list = rows(), st = A.local.sp || (A.local.sp = { k: 0 }), c = list[st.k];
        var h = '<div class="lab">' + row('How the job starts', chips(list.map(function (x, k) { return k; }), st.k, 'sp-k', function (k) { return list[k].how; }));
        h += big([[String(c.pid), 'process id of the job inside the container', c.pid === 1 ? 'good' : 'warn'], [c.waited ? 'waited 3 s, then killed' : 'stopped at once', 'docker stop', c.waited ? 'bad' : 'good'], [String(c.exit), 'exit code', c.exit === 0 ? 'good' : c.exit === 143 ? 'warn' : 'bad'], [c.handled ? 'yes' : 'no', 'the handler ran and finished the batch', c.handled ? 'good' : 'bad']]);
        h += '<div class="lab-h">The 3 second grace period</div>' + bar('job exits', c.waited ? 3 : 0.2, 3, c.waited ? 'SIGKILL at 3 s' : 'exited at once', c.waited ? 'bad' : 'good');
        var msg;
        if (/no handler/.test(c.how) && /--init/.test(c.how)) msg = callout('tip', '`--init` puts a tiny init process at ID 1. It receives SIGTERM and passes it on, and Python, which has no handler, exits by default. The exit code **143** is 128 plus signal 15: the job was ended by the signal and did not finish its work.');
        else if (/shell form \(sh -c\)/.test(c.how)) msg = callout('bad', 'The shell is ID 1 and the job is its child, with ID ' + c.pid + '. The shell does not pass SIGTERM on. The handler never runs, and Docker has to use SIGKILL.');
        else if (/shell form with exec/.test(c.how)) msg = callout('good', '`exec` replaces the shell with the job, so the job is ID 1 again and gets the signal.');
        else if (/handles/.test(c.how)) msg = callout('good', 'The job is ID 1 and has a handler, so it finished its batch and exited with 0 before the grace period ended.');
        else msg = callout('bad', 'The job is ID 1 and has no handler. The kernel does not apply the default action for SIGTERM to ID 1 of a container, so nothing happened until the grace period ended and Docker sent SIGKILL.');
        h += msg + note(' Each case ran on a real Docker Engine with docker stop -t 3. The default grace period is 10 seconds.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sp-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 7. Which image do you run ====================== */
  W.tags = (function () {
    var STEPS = [[1, 'Build 1 is pushed as 1.0 and latest, and pulled here'], [2, 'A release moves latest to build 2']], ACTS = [['run', 'docker run IMAGE:latest'], ['pull', 'docker pull, then docker run IMAGE:latest'], ['tag', 'docker run IMAGE:1.0'], ['digest', 'docker run IMAGE@sha256:...(build 1)']];
    function outcome(step, act) {
      var S = G.table('registry.steps').rows, F = G.counts('registry.facts');
      if (act === 'tag' || act === 'digest') return { out: F.run_by_digest, how: 'rec' };
      if (step === 1) return { out: S[0][3], how: act === 'run' ? 'rec' : 'comp' };
      if (act === 'run') return { out: S[1][3], how: 'rec' };
      return { out: S[2][3], how: 'rec' };
    }
    W.tagsInfo = { outcome: outcome, steps: STEPS, acts: ACTS };
    return {
      steps: function () { return 1; },
      hint: 'Pick the state of the registry and a command.',
      say: function () { return 'An image in a registry, with the tags 1.0 and latest. Somebody then moves the tag latest to a new build. Pick the state and a command, and read which build runs on your machine.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.tg || (A.local.tg = { step: 2, act: 'run' }), o = outcome(st.step, st.act), S = G.table('registry.steps').rows, row0 = S[st.step - 1];
        var h = '<div class="lab">' + row('State', chips(STEPS.map(function (x) { return x[0]; }), st.step, 'tg-s', function (k) { return STEPS.filter(function (x) { return String(x[0]) === String(k); })[0][1]; })) + row('Command', chips(ACTS.map(function (x) { return x[0]; }), st.act, 'tg-a', function (k) { return ACTS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += big([[row0[1], 'latest in the registry (digest, first 12)'], [row0[2], 'latest on this machine (digest, first 12)', row0[1] === row0[2] ? 'good' : 'bad'], [o.out, 'what the container prints', /build 1/.test(o.out) && st.step === 2 && st.act !== 'tag' && st.act !== 'digest' ? 'warn' : '']]);
        h += st.step === 2 && st.act === 'run'
          ? callout('bad', '`docker run` uses the image that is on this machine, and it does not ask the registry whether the tag moved. You run **build 1**, while the registry says latest is build 2.')
          : st.step === 2 && st.act === 'pull'
            ? callout('good', '`docker pull` fetched the new digest, and then the run uses build 2. A scheduler that must run the newest image sets its pull policy to always.')
            : st.act === 'tag' || st.act === 'digest'
              ? callout('good', 'A version tag that nobody moves, and a digest that cannot move, both run **build 1** whatever happens to latest. A digest names the content itself.')
              : callout('tip', 'Nothing has moved yet, so the tag, the pulled image and the registry agree.');
        h += note(' The registry was the registry:2 image on this machine. The states were produced by pushing, pulling and moving a tag.', o.how === 'comp' ? ' The case that you picked was not run on its own. It follows from the digests, which are equal.' : '');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'tg-s') st.step = +v; if (act === 'tg-a') st.act = v; A.render(true); };
      }
    };
  })();
})();
