/* Mission 10: boss round. Two drills that mix the missions, a design decision, a coding round, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var n = G.n;
  var PE = G.counts('fail.pending'), OM = G.counts('fail.oom'), CR = G.counts('fail.crash'), NV = G.counts('job.never'), OF = G.counts('job.onfailure'), PA = G.counts('job.parallel'), DL = G.counts('job.deadline'), TT = G.counts('job.ttl'), JC = G.counts('job.cron');
  var ST = G.counts('deploy.state'), HE = G.counts('deploy.heal'), RO = G.counts('deploy.rolling'), SK = G.counts('deploy.stuck'), UN = G.counts('deploy.undo');
  var EP = G.counts('svc.endpoints'), IC = G.counts('svc.ip_change'), PR = G.counts('probe.ready'), PL = G.counts('probe.live'), QS = G.counts('res.qos');
  var AF = G.counts('cfg.after'), SC = G.counts('cfg.secret'), OR = G.counts('cfg.orders'), RW = G.counts('sto.rows'), PV = G.counts('sto.pv'), AP = G.counts('sto.after_pvc_delete');
  var KF = G.counts('kz.facts'), RT = G.table('rbac.reader').rows, SD = G.table('probe.shutdown').rows;
  var CJ = G.file('cronjob-loader.yaml');
  var GAPS = CR.restart_times_s.map(function (t, i) { return t - (i ? CR.restart_times_s[i - 1] : 0); }).slice(1);
  var QA = [['qa-k8s', 1], ['qa-pod', 1], ['qa-declarative', 1], ['qa-vsdocker', 2], ['qa-crashloop', 1], ['qa-oomk8s', 1], ['qa-pending', 2], ['qa-debug', 1], ['qa-deploy', 1], ['qa-rollout', 1],
    ['qa-rs', 2], ['qa-svc', 1], ['qa-endpoints', 1], ['qa-dns', 2], ['qa-config', 1], ['qa-secrets', 2], ['qa-twelve', 2], ['qa-pvc', 1], ['qa-sts', 1], ['qa-dbk8s', 2],
    ['qa-job', 1], ['qa-cron', 1], ['qa-idem', 2], ['qa-limits', 1], ['qa-probes', 1], ['qa-term', 2], ['qa-rbac', 1], ['qa-kustomize', 2], ['qa-validate', 2],
    ['qa-etcd', 3], ['qa-evict', 3], ['qa-pullsecret', 3], ['qa-progress', 3], ['qa-kubeproxy', 3], ['qa-ingress', 3], ['qa-confighash', 3], ['qa-csi', 3], ['qa-indexed', 3], ['qa-pdb', 3], ['qa-hpa', 3], ['qa-irsa', 3], ['qa-netpol', 3], ['qa-admission', 3]];

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a design decision, a coding round, a mock interview and a one-page review', minutes: 32,
    focus: ['src', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'ci'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write a **CronJob manifest** from a list of requirements.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing is wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm10-inc1', t: 1, src: 'rec', title: 'Drill: two failures in one night', time: '02:50',
        alert: '**The nightly loader Job has not started: its pod is Pending. A colleague raised the CPU request to fix it. Now the pod starts and dies after a few seconds with exit code 137 and an empty log.**',
        clues: ['The first event says `FailedScheduling` and `Insufficient cpu`', 'The request that was raised is `cpu: "64"`, and the node has ' + PE.node_cpus + ' CPUs', 'The second failure shows `OOMKilled`, and the container has a memory limit of 64Mi'],
        opts: [
          { t: 'Two problems. The pod must ask for what the job needs, so the CPU request has to come down to the real need. The memory limit is too low for the input: measure the peak, set the limit above it, or read the input in chunks', fb: '' },
          { t: 'One problem: the node is too small. Add nodes', fb: 'Adding nodes would not shrink a request of 64 CPUs, and 137 is not a CPU error.' },
          { t: 'Remove both the request and the limit', fb: 'The scheduler then places the pod anywhere and nothing protects the node.' },
          { t: 'Raise `backoffLimit` so that the Job retries more', fb: 'The same kill would happen again each time.' }
        ],
        best: 0,
        why: 'Fixing the first message exposed the second, which is normal. In the recording a pod that asked for 64 CPUs stayed Pending on a node with ' + PE.node_cpus + ' (' + G.text('fail.pending_event').split('.')[0] + '), and a job that went over a limit of ' + OM.limit + ' ended as ' + OM.reason + ' with exit code ' + OM.exit_code + ' and an empty log.',
        checks: [
          ['Read the events', 'FailedScheduling names the resource that does not fit.'],
          ['Read the state of the container', 'OOMKilled and 137: the memory limit did it.'],
          ['Measure', 'Run once with a generous limit and read the peak.'],
          ['Set', 'Requests near the typical use, limits above the peak.']
        ],
        tell: 'There were two problems. The pod asked for 64 CPUs, which no node has, so it stayed Pending, and the new request was fixed by asking for what the job needs. Then it started and was killed with 137 because its memory limit was too small, which is why the log was empty. I measured the peak, set the limit above it, and added an alert for OOMKilled.',
        prevent: ['Size **requests from typical use** and **limits from the peak**', 'Alert on **OOMKilled** and on **Pending** that lasts', 'Read **events first**, then the container state']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'rec', title: 'Drill: the loader fails against a database that is "Running"', time: '03:25',
        alert: '**The nightly loader Job failed with `Connection refused` to `pg:5432` and ended with BackoffLimitExceeded, three pods in Error. A minute later the database accepts connections.** Last night the Postgres pod was moved by a node drain.',
        clues: ['`kubectl get pod pg-0` showed `Running` and `0/1` at 03:00, the start of the Job', 'The three loader pods ran within 40 seconds of each other', 'The Job has `backoffLimit: 2` and `restartPolicy: Never`'],
        opts: [
          { t: 'The database pod was Running but not ready, so the Service had no ready address, and the retries ran out inside that window. Make the loader wait or retry with a longer pause, and keep the readiness probe', fb: '' },
          { t: 'The Service is broken. Recreate it', fb: 'The Service worked when the pod became ready, one minute later.' },
          { t: 'Remove the readiness probe of the database so that the pod is ready at once', fb: 'It would be sent calls before it can answer them.' },
          { t: 'Set `backoffLimit: 0`', fb: 'That gives it fewer chances.' }
        ],
        best: 0,
        why: 'This is the picture of the recording. A pod that is Running and ' + PR.before.ready_column + ' has ' + PR.before.endpoint_addresses + ' ready addresses behind its Service, so calls are refused, and one second after it was ready it had ' + PR.after.endpoint_addresses + '. A Job with `Never` and a limit of 2 made ' + NV.pods + ' pods and gave up with ' + NV.condition[1] + '. The retries came too fast for the window.',
        checks: [
          ['Compare the times', 'When did the pod become ready, and when did the loader pods run?'],
          ['Read the endpoints', 'Empty while the pod is not ready.'],
          ['Make the loader patient', 'Retry the connection with growing pauses, inside the program or with an init container that waits for the port.'],
          ['Prevent', 'A startup probe for the slow start, and an alert on a Job that ends with BackoffLimitExceeded.']
        ],
        tell: 'The loader ran while the database pod was Running but not yet ready, so the Service had no ready address and the connections were refused. The three attempts used up the retries before the pod was ready. I made the loader retry the connection with growing pauses, kept the readiness probe on the database, and added an alert on failed Jobs.',
        prevent: ['A loader that **retries its connection** with growing pauses', 'A **startup probe** for slow databases', 'An **alert on failed Jobs**']
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: how to run twelve nightly pipeline steps',
        scenario: 'Brewline has twelve nightly steps in containers. Four of them depend on the output of earlier ones, and the business wants to re-run a past week after an error. The team of three already runs the cluster. Nobody wants to be paged for a late step that nobody saw.',
        opts: [
          { t: 'Twelve CronJobs, with start times spaced apart', d: 'Nothing new to install. Each one is a manifest.', lose: 'The dependencies are only guesses about duration. A slow step makes the next one read old data, and a re-run of a week is twelve commands for each day.' },
          { t: 'An orchestrator on the cluster that launches each step as a pod', d: 'Dependencies, retries for each step, backfills for a range of dates, and a view of what ran. The steps stay containers with their own limits.', lose: 'A system to install, secure and upgrade, and a new tool to learn for the team.' },
          { t: 'One Job that runs all twelve steps in a row in one container', d: 'One manifest, and a fixed order.', lose: 'One failure stops the rest, a re-run starts from the beginning, and the limits of the biggest step apply to all.' }
        ],
        pick: 1,
        why: 'Four dependent steps, backfills and a wish for visibility are the three things that a CronJob does not give. The orchestrator runs the steps as pods, so everything of this course still applies. With a single independent step, the CronJob of mission 7 would be the better answer.',
        when: 'Choose CronJobs when the steps are independent, few, and nobody needs backfills.'
      }),

      B.challenge({
        id: 'm10-ch', t: 1, title: 'Coding round: the CronJob of the loader', file: 'cronjob-loader.yaml', lang: 'yaml',
        q: 'Write the **CronJob** that runs the Brewline loader. Requirements: the name is `nightly`; the schedule is **every minute** (for the test); a run is **skipped while the last one is still going**; it keeps **2** finished Jobs and **2** failed Jobs; the Job allows **2 retries**, and a failed pod is **never restarted in place**; the image is `brewline/loader:1` and the command is `python load_orders.py /data/orders.csv`; `DATABASE_URL` is `postgresql://postgres:brewline-dev@pg:5432/brewline`; the ConfigMap `orders` is mounted **read-only** at `/data`.',
        starter: 'apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: nightly\nspec:\n  # ...',
        hints: ['The cron expression for every minute is five stars.', '`concurrencyPolicy: Forbid`, `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` sit directly under `spec`. `backoffLimit` is under `jobTemplate.spec`.', '`restartPolicy: Never` belongs to the pod spec of the template, with the containers and the volumes.'],
        sol: CJ,
        res: { cols: ['check', 'what the recording printed'], rows: [['Jobs made by the schedule after the first minute', String(JC.jobs_created)], ['concurrency policy of the CronJob', JC.concurrency], ['the log of the scheduled run', G.text('job.cron_logs')], ['a Job made by hand from the CronJob', G.text('job.manual')]], msg: 'from the recording' },
        expl: ['`schedule: "* * * * *"` fires every minute. A real nightly load would be `0 2 * * *`.', '`concurrencyPolicy: Forbid` skips a run while the last one is still going, and the two history limits keep the last two Jobs of each kind.', '`backoffLimit: 2` with `restartPolicy: Never` gives three pods at most, and every failed pod stays so that you can read its log.', 'The database is called by the name of its Service, `pg`, and the orders arrive as a read-only mount of a ConfigMap.'],
        cx: 'The Job template inside is the Job of mission 7. The CronJob only adds the clock, the overlap rule and the history.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm10-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from the recording on a real cluster (k3s ' + G.meta('kubernetes') + ', one node). Items marked (docs) come from documentation and were not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Objects and debugging', items: ['Everything is an object in the API. You declare the wish, and controllers work to make it true. A pod is one or more containers with one address', 'Debug in order: `get` (state), `describe` (events), `logs` (the program). Read the events before you restart anything', 'A tag that does not exist: ErrImagePull, then ImagePullBackOff, with `not found` in the event. A restart loop: waits of ' + GAPS.join(', ') + ' s, exit code ' + CR.last_exit_code + ', and a BackOff event. The status column of the recorded cluster said Error, and many clusters show CrashLoopBackOff', 'OOMKilled is exit ' + OM.exit_code + ' with an empty log. A request of 64 CPUs on ' + PE.node_cpus + ': Pending, Insufficient cpu'] },
          { h: 'Deployments', items: ['One Deployment made ' + ST.replicasets + ' ReplicaSet and ' + ST.pods + ' pods. A deleted pod came back with a new name (' + HE.new_names + ' new)', 'Rolling update with surge 1 and unavailable 0: at most ' + RO.max_pods_seen + ' pods and at least ' + RO.min_ready_seen + ' ready, and ' + RO.replicasets + ' ReplicaSets after', 'A bad image stalled the rollout: ' + SK.available_replicas + ' old pods stayed available. `rollout undo` brought back `' + UN.image + '` with ' + UN.ready + ' ready pods. Use a timeout on `rollout status`'] },
          { h: 'Services', items: ['A Service is a stable name and address in front of the ready pods that its selector matches. Call it by name: `web:8080`, or `web.brewline` from another namespace', 'No endpoints: the selector or the readiness. Endpoints and a refused call: the targetPort. Both are "Connection refused", so read the endpoints first', 'A replaced pod got a new address (old address gone: ' + IC.old_ip_gone + ') and the name still worked (' + IC.name_still_works + ')'] },
          { h: 'Config and secrets', items: ['A mounted ConfigMap file followed a change (' + AF.file + ') and an environment variable did not (' + AF.env + '). Restart the pods', 'A Secret is base64, and decodes with one command. Protect it with access rules, encryption at rest, or a secret manager (docs)', 'ConfigMap and Secret limit: ' + n(OR.limit_bytes) + ' bytes. The 5,000 orders were ' + n(OR.bytes) + ' bytes'] },
          { h: 'Storage', items: ['Claim, volume and storage class. Reclaim policy of the recorded volume: ' + PV.reclaim + '. Access mode: ' + PV.access_modes.join(', '), 'Delete the pod: ' + n(RW.after_pod_deleted) + ' orders stay. Delete the StatefulSet: the claim stays. Delete the claim: ' + AP.pv_count + ' volumes left and an empty database', '`emptyDir` dies with the pod. A managed database is the default for production (docs)'] },
          { h: 'Jobs', items: ['backoffLimit ' + NV.backoff_limit + ' with Never: ' + NV.pods + ' pods and ' + NV.condition[1] + '. With OnFailure: ' + OF.max_pods_seen + ' pod, ' + OF.max_restarts_seen + ' restarts, ' + OF.pods_left_after_failure + ' pods left to read', 'completions ' + PA.completions + ', parallelism ' + PA.parallelism + ': peak ' + PA.peak_running + '. A deadline ended a hang with ' + DL.condition[1] + '. A time to live removed a finished Job: ' + TT.deleted_by_the_cluster, 'CronJob: Forbid for overlap, suspend, `create job --from`. Loads must be idempotent: the scheduled run left the 5,000 orders at 5,000'] },
          { h: 'Runtime', items: ['QoS: ' + QS.besteffort + ' (nothing set), ' + QS.burstable + ' (a request), ' + QS.guaranteed + ' (requests equal limits)', 'Readiness gates traffic: Running and ' + PR.before.ready_column + ' meant ' + PR.before.endpoint_addresses + ' ready addresses. Liveness restarts: events ' + PL.event_reasons.join(' and '), 'On a delete: SIGTERM, then SIGKILL after the grace period. With a handler: gone at once. Without: the delete waited. Use exec, handle SIGTERM, write atomically'] },
          { h: 'Access and packaging', items: ['A Role is for one namespace and lists verbs on resources. Only allows. The reader said yes to ' + RT.filter(function (r) { return r[1] === 'yes'; }).length + ' of ' + RT.length + ' questions', 'A Forbidden message names the user, verb, resource and namespace. Test with `kubectl auth can-i --as`', 'Kustomize: `' + (KF.name_prefixed ? 'prod-' : '') + 'loader-api`, 3 replicas, tag 2, in `brewline-prod`. Helm is the usual way to install software that others ship (docs)', '`kubectl apply --dry-run=server --validate=strict` refuses unknown fields'] }
        ]
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Kubernetes Partner', color: '#BAE6FD',
        pts: [
          'You can **read a failing pod** in a fixed order: state, events, log.',
          'You can **deploy, update and roll back**, and **expose** a service by name.',
          'You can keep **config out of images**, and say what a Secret is and is not.',
          'You can run **a database and batch jobs** safely: volumes, retries, deadlines, idempotent loads.',
          'You can set **limits and probes**, make pods **stop cleanly**, and give a pipeline **only the access it needs**.'
        ],
        lines: [
          'I can run my pipelines on a cluster.',
          'I can find out why a pod does not run.',
          'I can talk to the people who run the cluster.'
        ]
      })
    ])
  });
})();
