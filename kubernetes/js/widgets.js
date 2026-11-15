/* Kubernetes course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: a real Kubernetes cluster (k3s, one node) that the recorder started and used.
   Where a lab shows a combination that the recorder did not run (a rolling update with other settings), it says "Computed". Text in notes and
   callouts goes through the formatter: use `code` and **bold**, never HTML tags. Managed clusters, Helm and operators did not run. */
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



  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }

  /* ====================== 1. Pods that fail ====================== */
  W.fail = (function () {
    var KINDS = [['badimage', 'An image that cannot be pulled'], ['crash', 'A container that exits at once'], ['oom', 'A container over its memory limit'], ['pending', 'A pod that asks for more CPU than the node has']];
    function info(k) {
      var C = G.counts, X = G.text;
      if (k === 'badimage') return { file: 'pod-badimage.yaml', shows: C('fail.badimage').seen.join(', then '), why: 'The tag does not exist: `' + X('fail.badimage_message') + '`. The kubelet tries again with a growing wait, which is the back-off.', fix: 'Read the image name and the tag in `kubectl describe pod`. Check that the tag exists, that the registry is reachable from the node, and that a private registry has an image pull secret.', code: '(the container never started)', kind: 'bad' };
      if (k === 'crash') return { file: 'pod-crash.yaml', shows: C('fail.crash').seen.join(', then '), why: 'The container printed `' + X('fail.crash_logs') + '` and exited with code ' + C('fail.crash').last_exit_code + '. With `restartPolicy: Always` the kubelet starts it again, and waits longer each time: the restart counter went up at ' + C('fail.crash').restart_times_s.join(', ') + ' seconds. The status column said `Error` on the recorded cluster, and many clusters show `CrashLoopBackOff` for the wait.', fix: 'Read `kubectl logs POD` for the last run, and the exit code in `kubectl describe pod`. The cause is in the program, not in the cluster.', code: 'exit code ' + C('fail.crash').last_exit_code, kind: 'bad' };
      if (k === 'oom') return { file: 'pod-oom.yaml', shows: 'OOMKilled', why: 'The job asked for 200 MB under a limit of ' + C('fail.oom').limit + '. The kernel ended it: reason **' + C('fail.oom').reason + '**, exit code **' + C('fail.oom').exit_code + '**. It printed nothing, and with `restartPolicy: Never` the pod ends as Failed.', fix: 'Measure the peak memory, then raise the limit above it or process the data in chunks. A request is what the scheduler counts, and a limit is what kills.', code: 'exit code ' + C('fail.oom').exit_code, kind: 'bad' };
      return { file: 'pod-pending.yaml', shows: C('fail.pending').status, why: 'The pod asks for 64 CPUs and the node has ' + C('fail.pending').node_cpus + '. The scheduler wrote the event: `' + X('fail.pending_event') + '`. No node is assigned, and the pod waits.', fix: 'Compare the requests with `kubectl describe node`. Ask for what the job needs, or add nodes.', code: '(no node was assigned)', kind: 'bad' };
    }
    W.failInfo = { info: info, kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick a pod and read what the cluster says.',
      say: function () { return 'Four pods that do not start or do not stay up. Each one was applied to a real cluster. Pick one, read what kubectl showed, and say what you would do before you read the advice.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.fl || (A.local.fl = { k: 'crash' }), d = info(st.k);
        var h = '<div class="lab">' + row('Pod', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'fl-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += pre(G.file(d.file));
        h += big([[d.shows, 'what kubectl get pod shows', 'bad'], [d.code, 'the last thing the container did']]);
        h += callout('bad', d.why) + callout('tip', d.fix) + note(' The pod ran on a real Kubernetes cluster with one node.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'fl-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. A rolling update ====================== */
  W.roll = (function () {
    var SETS = [['1/0', 1, 0], ['0/1', 0, 1], ['1/1', 1, 1]], N = 3;
    /* Pods that started in an earlier tick become ready. Old pods stop while enough stay available. New pods start while the total is within the surge. */
    function simulate(n, surge, unavail) {
      var old = n, ready = 0, starting = 0, rows = [[0, old, 0, 0, old, old]], tick = 0;
      while (!(old === 0 && ready === n) && tick < 40) {
        tick++;
        ready += starting; starting = 0;
        while (old > 0 && old + ready - 1 >= n - unavail) old--;
        while (old + ready + starting < n + surge && ready + starting < n) starting++;
        rows.push([tick, old, ready, starting, old + ready + starting, old + ready]);
      }
      return rows;
    }
    function summary(rows) { return { peak: Math.max.apply(null, rows.map(function (r) { return r[4]; })), lowest: Math.min.apply(null, rows.map(function (r) { return r[5]; })), ticks: rows[rows.length - 1][0] }; }
    W.rollInfo = { simulate: simulate, summary: summary, sets: SETS };
    return {
      steps: function () { return 1; },
      hint: 'Pick maxSurge and maxUnavailable.',
      say: function () { return 'A Deployment with 3 replicas is updated to a new image. maxSurge says how many extra pods may exist at one time, and maxUnavailable how many may be missing. Pick a pair and read each step of the update.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ro || (A.local.ro = { k: '1/0' }), set = SETS.filter(function (x) { return x[0] === st.k; })[0], rows = simulate(N, set[1], set[2]), sm = summary(rows), R = G.counts('deploy.rolling');
        var recorded = set[1] === R.surge && set[2] === R.max_unavailable;
        var h = '<div class="lab">' + row('maxSurge / maxUnavailable', chips(SETS.map(function (x) { return x[0]; }), st.k, 'ro-k'));
        h += table(['Step', 'Old pods', 'New pods ready', 'New pods starting', 'Pods in all', 'Pods ready'], rows, function (r) { return r[5] < N - set[2] ? 'dup' : ''; }, 1);
        h += big([[String(sm.peak), 'most pods at one time', sm.peak > N ? 'warn' : 'good'], [String(sm.lowest), 'fewest pods ready', sm.lowest < N ? 'warn' : 'good'], [String(sm.ticks), 'steps to finish']]);
        h += set[1] === 0
          ? callout('tip', 'With no surge the update must stop an old pod before it can start a new one. Capacity drops to ' + sm.lowest + ' ready pods for a while, and no extra pod is ever needed.')
          : set[2] === 0
            ? callout('good', 'With no unavailable pods the update starts an extra pod first, and stops an old one only when a new one is ready. The Service never has fewer than ' + N + ' ready pods, at the price of one pod of room.')
            : callout('tip', 'Both settings allow a faster update, and the Service may have ' + sm.lowest + ' ready pods and up to ' + sm.peak + ' pods in all.');
        h += note(recorded ? ' The rollout of the Deployment web with these settings, observed every half second: at most ' + R.max_pods_seen + ' pods and never fewer than ' + R.min_ready_seen + ' ready.' : '', recorded ? '' : ' This pair was not run. The steps follow from the rules of the rolling update, and the recorded case (1/0) gives the same peak and lowest numbers when worked out the same way.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ro-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Can the client reach the Service ====================== */
  W.svc = (function () {
    var KINDS = [['web', 'Service web: the selector and the port are right'], ['web-wrong', 'Service web-wrong: the selector matches no pod'], ['web-port', 'Service web-port: targetPort is 8000, the pod listens on 8080']];
    function info(k) {
      var C = G.counts, X = G.text;
      if (k === 'web') return { file: 'svc-web.yaml', endpoints: String(C('svc.endpoints').addresses) + ' addresses', result: X('svc.short'), ok: true, why: 'The selector `app: web` matches the three pods, and `targetPort: 8080` is the port that the pods listen on. The name `web` resolves, and the request reaches one of the pods.' };
      if (k === 'web-wrong') return { file: 'svc-web-wrong.yaml', endpoints: 'none', result: X('svc.wrong_wget'), ok: false, why: 'The selector `app: webb` has a typo, so it matches no pod. The Service still exists and has an address, and its endpoints are empty. Nothing is listening behind it.' };
      return { file: 'svc-web-port.yaml', endpoints: 'the pods, on port ' + X('svc.port_endpoint'), result: X('svc.port_wget'), ok: false, why: 'The selector is right, so the endpoints list the pods, but the Service forwards to port ' + X('svc.port_endpoint') + ' and the pods listen on 8080. The connection is refused.' };
    }
    W.svcInfo = { info: info, kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick a Service and read what the client got.',
      say: function () { return 'A client pod calls three Services by name. One is right and two are wrong in different ways. Pick one, look at its endpoints and at what the call returned, and say what is wrong before you read the explanation.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sv || (A.local.sv = { k: 'web-wrong' }), d = info(st.k);
        var h = '<div class="lab">' + row('Service', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'sv-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += pre(G.file(d.file));
        h += big([[d.endpoints, 'the endpoints of the Service', d.ok ? 'good' : 'bad'], [d.ok ? 'it works' : 'it fails', 'wget from the client pod', d.ok ? 'good' : 'bad']]);
        h += pre('$ wget -qO- -T 3 http://' + st.k + ':8080\n' + d.result, 'cmd');
        h += callout(d.ok ? 'good' : 'bad', d.why) + note(' All three calls ran from a pod on a real cluster.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sv-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 4. Jobs ====================== */
  W.jobs = (function () {
    var KINDS = [['never', 'restartPolicy Never, the program fails'], ['onfailure', 'restartPolicy OnFailure, the program fails'], ['parallel', 'completions 4, parallelism 2'], ['deadline', 'activeDeadlineSeconds 5, the program takes 60'], ['ttl', 'ttlSecondsAfterFinished 5']];
    var FILES = { never: 'job-fail-never.yaml', onfailure: 'job-fail-onfailure.yaml', parallel: 'job-parallel.yaml', deadline: 'job-deadline.yaml', ttl: 'job-ttl.yaml' };
    function info(k) {
      var C = G.counts;
      if (k === 'never') { var a = C('job.never'); return { big: [[String(a.pods), 'pods created'], [a.pod_status.join(', '), 'status of those pods', 'bad'], [a.condition[1], 'why the Job failed', 'bad']], why: 'Each failure ends the pod, and the Job starts a new one. With `backoffLimit: ' + a.backoff_limit + '` the Job made ' + a.pods + ' pods, which is the first run and ' + a.backoff_limit + ' retries, and then gave up. Every failed pod stays, so you can read its log.' }; }
      if (k === 'onfailure') { var b = C('job.onfailure'); return { big: [[String(b.max_pods_seen), 'pod at one time'], [String(b.max_restarts_seen), 'restarts of its container', 'warn'], [b.condition[1], 'why the Job failed', 'bad'], [String(b.pods_left_after_failure), 'pods left to read', 'bad']], why: 'The same pod restarts its container, so there is one pod and a restart count of ' + b.max_restarts_seen + '. When the limit is reached the Job fails and **removes the pod**, and its log goes with it. Use Never when you want to read the log of every failure.' }; }
      if (k === 'parallel') { var c = C('job.parallel'); return { big: [[String(c.completions), 'completions needed'], [String(c.peak_running), 'pods running at the same time', 'good'], [String(c.succeeded), 'pods that succeeded', 'good']], why: 'The Job keeps ' + c.parallelism + ' pods running until ' + c.completions + ' have succeeded. It never ran more than ' + c.peak_running + ' at once.' }; }
      if (k === 'deadline') { var d = C('job.deadline'); return { big: [[d.condition[0], 'condition', 'bad'], [d.condition[1], 'reason', 'bad']], why: 'The deadline counts from the start of the Job and ends it whatever the pods are doing, even when the backoff limit is not reached. The program needed 60 seconds and had 5.' }; }
      var e = C('job.ttl'); return { big: [[e.deleted_by_the_cluster ? 'yes' : 'no', 'the cluster removed the finished Job', 'good'], [String(e.ttl_seconds) + ' s', 'ttlSecondsAfterFinished']], why: 'Without a time to live, finished Jobs and their pods stay for ever. With it the cluster removes them, and their logs, after the time that you set. Ship the logs somewhere before that.' };
    }
    W.jobsInfo = { info: info, kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick a Job and read what the cluster did.',
      say: function () { return 'Five Jobs on a real cluster. Each one has a small manifest and a clear result. Pick one, read the manifest, and say what the cluster will do before you read the numbers.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.jb || (A.local.jb = { k: 'never' }), d = info(st.k);
        var h = '<div class="lab">' + row('Job', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'jb-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += pre(G.file(FILES[st.k])) + big(d.big) + callout('tip', d.why) + note(' Every number was read from the cluster while the Job ran.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'jb-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 5. What survives ====================== */
  W.store = (function () {
    var KINDS = [['pod', 'Delete the pod pg-0'], ['sts', 'Delete the StatefulSet'], ['pvc', 'Delete the claim data-pg-0']];
    function info(k) {
      var R = G.counts('sto.rows'), A = G.counts('sto.after_delete'), P = G.counts('sto.after_pvc_delete');
      if (k === 'pod') return { rows: R.after_pod_deleted, state: 'a new pg-0 is running on the same claim', ok: R.after_pod_deleted === R.after_load, why: 'The StatefulSet makes a new pod with the same name and attaches the claim that it already has. Postgres finds its files and starts from them.' };
      if (k === 'sts') return { rows: R.after_statefulset_recreated, state: A.pvc_still_there ? 'the claim is still there' : 'the claim is gone', ok: A.pvc_still_there, why: 'Deleting a StatefulSet does not delete the claims that it created. A StatefulSet created again finds `data-pg-0` and uses it. This is a safety feature, and it is also why unused claims pile up.' };
      return { rows: P.rows_in_the_new_database, state: 'volumes left: ' + P.pv_count, ok: false, why: 'The storage class has the reclaim policy Delete, so deleting the claim deletes the volume and the files in it. A new StatefulSet starts with an empty database. Back up before you delete a claim.' };
    }
    W.storeInfo = { info: info, kinds: KINDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick what you delete.',
      say: function () { return 'A Postgres pod with 5,000 orders on a volume claim. Pick what you delete, and see whether the orders are still there when the database comes back.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.so || (A.local.so = { k: 'pod' }), d = info(st.k), R = G.counts('sto.rows');
        var h = '<div class="lab">' + row('What you delete', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'so-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += big([[n(d.rows), 'orders in the table afterwards', d.rows === R.after_load ? 'good' : 'bad'], [n(R.after_load), 'orders before'], [d.state, 'what the cluster kept']]);
        h += callout(d.ok ? 'good' : 'bad', d.why) + note(' Each case was run on a real cluster with postgres:16-alpine and a claim of 1 GiB on the local-path storage class.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'so-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 6. Deleting a pod ====================== */
  W.shutdown = (function () {
    function rows() { return G.table('probe.shutdown').rows.map(function (r) { return { name: r[0], waited: r[1] === 'yes', handled: r[2] === 'yes', grace: r[3] }; }); }
    W.shutdownInfo = { rows: rows };
    return {
      steps: function () { return 1; },
      hint: 'Pick a pod and read what the delete did.',
      say: function () { return 'Two pods run the same job and are deleted with a grace period of 5 seconds. One handles SIGTERM and one does not. Pick one and see how long the delete took and what the job did with the signal.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var list = rows(), st = A.local.sd || (A.local.sd = { k: 0 }), c = list[st.k];
        var h = '<div class="lab">' + row('Pod', chips(list.map(function (x, k) { return k; }), st.k, 'sd-k', function (k) { return list[k].name; }));
        h += pre(G.file(st.k === 0 ? 'pod-worker.yaml' : 'pod-worker-nohandler.yaml'));
        h += big([[c.waited ? 'waited ' + c.grace + ' s, then killed' : 'went at once', 'kubectl delete pod', c.waited ? 'bad' : 'good'], [c.handled ? 'yes' : 'no', 'the handler ran and finished the batch', c.handled ? 'good' : 'bad']]);
        h += '<div class="lab-h">The grace period</div>' + bar('the pod goes', c.waited ? c.grace : 0.3, c.grace, c.waited ? 'SIGKILL at ' + c.grace + ' s' : 'gone at once', c.waited ? 'bad' : 'good');
        h += c.handled
          ? callout('good', 'The kubelet sent SIGTERM to process 1, the handler printed its line and exited with 0, and the pod was gone before the grace period ended.')
          : callout('bad', 'The program has no handler, and as process 1 it ignores SIGTERM. The kubelet waited for the whole grace period and then sent SIGKILL. A batch that was half written stays half written.');
        h += note(' Both pods were deleted on a real cluster with terminationGracePeriodSeconds: 5. The default is 30 seconds.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sd-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
