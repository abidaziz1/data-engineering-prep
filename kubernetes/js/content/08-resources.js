/* Mission 8: requests and limits, probes, and a clean shutdown. Each pod ran on a real cluster. */
(function () {
  var B = LAB.b, G = LAB.get;
  var QB = G.file('pod-qos-burstable.yaml'), QG = G.file('pod-qos-guaranteed.yaml'), RY = G.file('pod-ready.yaml'), LY = G.file('pod-live.yaml'), WY = G.file('pod-worker.yaml'), WN = G.file('pod-worker-nohandler.yaml'), WK = G.file('app/worker.py'), DY = G.file('deploy-web.yaml');
  var Q = G.counts('res.qos'), PR = G.counts('probe.ready'), PL = G.counts('probe.live'), SD = G.table('probe.shutdown').rows;
  var n = G.n;
  var BAD = DY.replace('              port: 8080', '              port: 8000');
  G.expect(Q.besteffort === 'BestEffort' && Q.burstable === 'Burstable' && Q.guaranteed === 'Guaranteed', 'the three pods got the three QoS classes');
  G.expect(PR.before.ready_column === '0/1' && PR.before.phase === 'Running' && PR.before.endpoint_addresses === 0 && PR.after.ready_column === '1/1' && PR.after.endpoint_addresses === 1, 'a pod that is Running but not ready has no endpoint, and gets one when it becomes ready');
  G.expect(PL.restarts_at_least_1 === true && PL.event_reasons.indexOf('Unhealthy') >= 0 && PL.event_reasons.indexOf('Killing') >= 0, 'a failing liveness probe makes the kubelet kill and restart the container');
  G.expect(SD[0][0] === 'worker' && SD[0][1] === 'no' && SD[0][2] === 'yes' && SD[1][0] === 'worker-nohandler' && SD[1][1] === 'yes' && SD[1][2] === 'no', 'the pod with a handler goes at once and the one without waits for the grace period');
  G.expect(BAD !== DY && /port: 8000/.test(BAD), 'the wrong probe port snippet differs from the right Deployment');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Limits, probes and shutdown', short: 'Runtime', blurb: 'How much a pod may use, when it is healthy, and how it ends', minutes: 19,
    focus: ['air', 'mon'],
    goals: [
      'Set **requests and limits**, and name the three **QoS classes**.',
      'Tell **readiness** from **liveness**, and see what each one does.',
      'Make a pod **shut down cleanly** on SIGTERM.',
      'Spot a probe that **hurts** more than it helps.'
    ],
    say: 'A pod that starts is not yet a pod you can trust. It has to say how much it needs, when it is ready, when it is stuck, and how it wants to end. This mission covers those four things on the real cluster, with a loader that either handles a stop signal or does not.',
    scenes: [
      B.cmp({
        id: 'm8-req', t: 1, src: 'docs', title: 'Request and limit, for CPU and for memory',
        say: 'Two numbers for each resource, with two different jobs. Press Next.',
        cols: ['', 'Request', 'Limit'],
        hl: 0,
        rows: [
          ['Who uses it', 'The scheduler, to choose a node with room.', 'The node, to cap the container while it runs.'],
          ['CPU over the number', 'Allowed when the node has spare CPU.', 'The container is **throttled**: it runs slower.'],
          ['Memory over the number', 'Allowed when the node has spare memory.', 'The container is **killed**: OOMKilled, exit code 137.'],
          ['Not set', 'The pod counts as needing nothing, and may land on a full node.', 'No cap, until the node itself runs out.']
        ],
        steps: [
          { upto: 1, say: 'The request is a promise for scheduling. Mission 2 showed it: a request for 64 CPUs left a pod Pending.' },
          { upto: 4, say: 'The limit is a wall, and CPU and memory behave differently at the wall. CPU slows down, and memory kills. Mission 2 recorded the kill. The throttling of CPU is from documentation: it was not run here.' }
        ]
      }),

      B.cmp({
        id: 'm8-qos', t: 1, src: 'rec', title: 'The three QoS classes, from three real pods',
        say: 'Kubernetes puts every pod in a **quality of service** class from what it asked for. I applied three pods and read the class from the status. Press Next.',
        cols: ['Pod', 'What it asks for', 'QoS class (recorded)'],
        hl: 2,
        rows: [
          ['qos-besteffort', 'No requests, no limits', Q.besteffort],
          ['qos-burstable', 'A memory request of 32Mi, no limit', Q.burstable],
          ['qos-guaranteed', 'CPU 100m and memory 32Mi, requests equal to limits', Q.guaranteed]
        ],
        steps: [
          { upto: 1, say: '**BestEffort** asked for nothing. It is the first to be evicted when the node runs short of memory.' },
          { upto: 2, say: '**Burstable** has a request, and may use more. A pod with only limits, or limits above requests, is Burstable too. The OOM pod of mission 2 was this class.' },
          { upto: 3, say: '**Guaranteed** has requests equal to limits for every container. It is the last to be evicted. Use it for the pods that you cannot lose, such as the database.' }
        ]
      }),

      B.code({
        id: 'm8-qosyaml', t: 1, src: 'rec', title: 'The pod that is Guaranteed', file: 'pod-qos-guaranteed.yaml', lang: 'yaml', code: QG,
        steps: [
          { say: 'Compare it with the Burstable pod, which has only a request. Press Next.', lines: null },
          { say: 'Requests and limits for CPU and memory are **equal**. `100m` is a tenth of a CPU, and `32Mi` is 32 mebibytes.', lines: G.span(QG, /resources:/, /memory: 32Mi$/m) },
          { say: 'The limits repeat the numbers. When every container has equal requests and limits, the class is Guaranteed.', lines: G.span(QG, /limits:/, /memory: 32Mi/) }
        ],
        note: 'The Burstable pod of the recording has only a request: `memory: 32Mi` under `requests`, and no `limits`.'
      }),

      B.flow({
        id: 'm8-shutdown', t: 1, src: 'docs', title: 'What happens when a pod is deleted', g: 'shutdown', legend: true,
        steps: [
          { say: 'Every deploy, every scale-down and every node drain deletes pods. How a pod ends matters. Press Next.', focus: ['del', 'api', 'kub', 'proc'], cap: 'A delete is a polite request first.' },
          { say: 'Step 1. `kubectl delete pod` tells the API server. The pod is marked as **terminating**, not removed yet.', on: ['e1'], focus: ['del', 'api'], cap: 'The pod is marked.' },
          { say: 'Step 2. The **endpoints** stop listing the pod, so the Service stops sending it new calls.', on: ['e2'], focus: ['api', 'eps'], cap: 'The Service stops using it.' },
          { say: 'Step 3. The **kubelet** on the node sees the mark and sends **SIGTERM** to process 1 of every container.', on: ['e3', 'e4'], focus: ['kub', 'proc'], tags: ['tg_term'], cap: 'SIGTERM goes to process 1.' },
          { say: 'Step 4a. A program with a **handler** finishes its batch and exits with 0. The pod is gone at once.', on: ['e5'], focus: ['proc', 'ok'], cap: 'A handler ends it cleanly.' },
          { say: 'Step 4b. A program with **no handler** ignores the signal. The kubelet waits for the whole **grace period**, 30 seconds by default, and then sends **SIGKILL**. A batch that was half written stays half written.', on: ['e6'], focus: ['kub', 'kill'], tags: ['tg_grace'], cap: 'No handler: wait, then kill.' }
        ]
      }),

      B.code({
        id: 'm8-worker', t: 1, src: 'rec', title: 'A worker that handles SIGTERM, or not', file: 'app/worker.py', lang: 'python', code: WK,
        steps: [
          { say: 'A small program that runs until it is stopped. It was copied into the loader image. Press Next.', lines: null },
          { say: 'The handler prints a line and exits with 0. In a real worker it would finish the batch and close its connections.', lines: G.span(WK, /def stop/, /sys.exit/) },
          { say: 'The handler is installed only when `HANDLE_TERM` is 1. The two pods of the next scene differ in this one variable.', lines: G.span(WK, /if os.environ/, /signal.signal/) },
          { say: 'The loop is the work. It never ends on its own.', lines: G.span(WK, /while True/, /sleep/) }
        ],
        note: 'The pods `worker` and `worker-nohandler` have `terminationGracePeriodSeconds: 5`, instead of the default 30, so that the recording is short.'
      }),

      B.widget({ id: 'm8-lab', kind: 'shutdown', t: 1, src: 'rec', title: 'Lab: delete a pod with and without a handler' }),

      B.term({
        id: 'm8-delete', t: 1, src: 'rec', title: 'Two pods are deleted',
        say: 'I timed `kubectl delete pod` for both, and read the log of each while it ended.',
        lines: function () {
          return G.term([
            ['kubectl delete pod worker   # HANDLE_TERM=1', 'pod "worker" deleted   (' + (SD[0][1] === 'yes' ? 'waited the grace period' : 'went at once') + ')'],
            ['kubectl logs -f worker   # at the same time', SD[0][2] === 'yes' ? 'got SIGTERM, finishing the batch' : '(no line)'],
            ['kubectl delete pod worker-nohandler   # HANDLE_TERM=0', 'pod "worker-nohandler" deleted   (' + (SD[1][1] === 'yes' ? 'waited the grace period of 5 s' : 'went at once') + ')'],
            ['kubectl logs -f worker-nohandler   # at the same time', SD[1][2] === 'yes' ? 'got SIGTERM, finishing the batch' : '(no line: the handler did not run)']
          ]);
        },
        after: 'The worker with a handler ended **at once** and ran its line. The worker without one made `kubectl delete` **wait the whole grace period** and was then killed: no line, no clean ending. Process 1 of a container ignores a signal that it has no handler for, so a program that does not install one never stops politely. Many images start a shell as process 1, which does not pass the signal on: use `exec` in the start script, or an init such as `tini`.',
        afterKind: 'warn',
        doneSay: 'No handler: the delete waits for the grace period and then kills.'
      }),

      B.code({
        id: 'm8-ready', t: 1, src: 'rec', title: 'A readiness probe', file: 'pod-ready.yaml', lang: 'yaml', code: RY,
        steps: [
          { say: 'A pod that becomes ready only when a file exists, and a Service in front of it. The file stands for "my cache is loaded". Press Next.', lines: null },
          { say: 'The probe runs `test -f /tmp/ready` every second. While it fails, the pod is **not ready**.', lines: G.span(RY, /readinessProbe:/, /periodSeconds/) },
          { say: 'The Service selects the pod by its label. It will list the pod only when the pod is ready.', lines: G.span(RY, /kind: Service/, /port: 80/) }
        ],
        note: 'A Deployment of mission 3 used an HTTP readiness probe in the same way. A rolling update waits for it.'
      }),

      B.term({
        id: 'm8-readycli', t: 1, src: 'rec', title: 'Running is not ready',
        say: 'I applied the file and read the pod and the endpoints of the Service. Then I created the file in the pod, and read both again.',
        lines: function () {
          return G.term([
            ['kubectl get pod ready   # before', 'ready ' + PR.before.ready_column + '   ' + PR.before.phase],
            ['kubectl get endpointslices ...   # addresses that are ready', String(PR.before.endpoint_addresses) + '   (listed but not ready: ' + PR.before.listed_but_not_ready + ')'],
            ['kubectl exec ready -- touch /tmp/ready', ''],
            ['kubectl get pod ready   # after', 'ready ' + PR.after.ready_column + '   ' + PR.after.phase],
            ['kubectl get endpointslices ...   # addresses that are ready', String(PR.after.endpoint_addresses)]
          ]);
        },
        after: 'Before the file, the pod was **' + PR.before.phase + '** and **' + PR.before.ready_column + '**: the container ran, and the pod was not ready. The Service had **' + PR.before.endpoint_addresses + '** ready addresses, so it sent no traffic, although the pod was listed with a not-ready flag. A second after the file appeared, the pod was **' + PR.after.ready_column + '** and the Service had **' + PR.after.endpoint_addresses + '** address. Readiness is what the **Service** and the **rolling update** look at.',
        afterKind: 'tip',
        doneSay: 'Not ready: no traffic. Ready: traffic.'
      }),

      B.code({
        id: 'm8-live', t: 1, src: 'rec', title: 'A liveness probe that fails', file: 'pod-live.yaml', lang: 'yaml', code: LY,
        steps: [
          { say: 'A program that makes a file, removes it after 8 seconds, and then sleeps. The file stands for "I am alive". Press Next.', lines: null },
          { say: 'The command: it writes the file, waits, removes it, and goes on sleeping.', lines: G.span(LY, /command:/) },
          { say: 'The **liveness probe** checks the file every 2 seconds, after a first delay of 2. Two failures in a row, and the kubelet acts.', lines: G.span(LY, /livenessProbe:/, /failureThreshold/) }
        ],
        note: 'This is a made-up hang. A real hang is a deadlock, or a thread pool that is used up, in a process that is still running.'
      }),

      B.term({
        id: 'm8-livecli', t: 1, src: 'rec', title: 'The kubelet restarts a stuck container',
        say: 'I waited for the first restart and read what the cluster said.',
        lines: function () {
          return G.term([
            ['kubectl apply -f pod-live.yaml', 'pod/live created'],
            ['kubectl get pod live -o jsonpath="{.status.containerStatuses[0].restartCount}"   # after about a minute', '1 or more'],
            ['kubectl describe pod live   # the reasons of the events', PL.event_reasons.join(', ')],
            ['kubectl describe pod live   # the Unhealthy event', 'Warning  Unhealthy  ' + G.text('probe.live_event').trim()],
            ['kubectl get pod live -o jsonpath="{.status.containerStatuses[0].lastState.terminated.exitCode}"', String(PL.last_exit_code)]
          ]);
        },
        after: 'The probe failed twice, the events **Unhealthy** and **Killing** followed, and the container was restarted. The previous run ended with exit code **' + PL.last_exit_code + '**, which is the code of a kill with SIGKILL (128 + 9). Process 1 was a shell with no SIGTERM handler, so the kubelet had to kill it. The event text after "Liveness probe failed:" is whatever the probe printed: this probe prints nothing, so the text is empty. A **liveness** failure **restarts** the container. A **readiness** failure only takes the pod **out of the Service**.',
        afterKind: 'tip',
        doneSay: 'Readiness gates traffic. Liveness restarts.'
      }),

      B.cmp({
        id: 'm8-probes', t: 2, src: 'docs', title: 'Three probes and what each is for',
        say: 'Kubernetes has three kinds of probe. Press Next.',
        cols: ['Probe', 'A failure means', 'The kubelet', 'Use it for'],
        hl: 1,
        rows: [
          ['startup', 'The app has not finished starting.', 'Keeps the other probes off, and restarts the container if it never starts in time.', 'Slow starts: a big model, a database that replays its log.'],
          ['readiness', 'The app cannot take work now.', 'Removes the pod from the Service endpoints. No restart.', 'A cache still loading, a dependency that is down, a pod that is busy.'],
          ['liveness', 'The app is stuck and will not recover.', 'Restarts the container.', 'Deadlocks and hangs that a restart cures.']
        ],
        steps: [
          { upto: 1, say: 'A **startup** probe protects a slow start from the liveness probe, which would kill it before it is up.' },
          { upto: 3, say: 'Readiness and liveness answer different questions. Readiness: "should it get traffic?" Liveness: "is a restart the cure?" The two scenes before this one recorded both. The startup probe was not run here.' }
        ]
      }),

      B.bug({
        id: 'm8-bug', t: 2, src: 'docs', q: 'Every pod of this Deployment runs, but none becomes ready, and the Service has no endpoints. Click the line that is the problem.',
        file: 'deploy-web-probe.yaml', lang: 'yaml', code: BAD, bad: [G.at(BAD, /port: 8000/)],
        hint: 'The container listens on one port. Which port does the readiness probe ask?',
        why: 'The probe asks port 8000 and the program listens on 8080, so the probe fails for ever. The pods stay Running and 0/1, and the Service lists no endpoint. The rolling update would also stop at the first new pod. Probes must test what the program really serves.',
        fix: DY,
        cheer: 'A probe on the wrong port is a quiet outage.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put in order what happens when you delete a pod whose program has a SIGTERM handler.',
        items: [
          '`kubectl delete pod` reaches the API server and the pod is marked as terminating',
          'The endpoints stop listing the pod',
          'The kubelet sends SIGTERM to process 1',
          'The handler finishes the batch and the program exits with 0',
          'The pod is removed'
        ],
        why: 'The Service stops sending calls first, then the program is told to stop. In the recording the pod with a handler ended at once, and the one without waited for the whole grace period of 5 seconds.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'A pod has memory requests of 32Mi and no limits. What QoS class does it get?',
        opts: [
          { t: 'Burstable', fb: '' },
          { t: 'Guaranteed', fb: 'That needs requests equal to limits.' },
          { t: 'BestEffort', fb: 'That is for pods with no requests or limits at all.' },
          { t: 'Premium', fb: 'There is no such class.' }
        ],
        ok: 0, why: 'The recorded pod `qos-burstable` was exactly this, and its class was ' + Q.burstable + '.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'A pod is Running, shows 0/1, and its Service sends it no calls. Which probe is failing?',
        opts: [
          { t: 'The readiness probe', fb: '' },
          { t: 'The liveness probe', fb: 'That one restarts the container, and the restart count would go up.' },
          { t: 'The startup probe', fb: 'That keeps the other probes off while it runs. It does not take a started pod out of the Service.' },
          { t: 'None: this is normal', fb: 'A pod that does not become ready is not normal.' }
        ],
        ok: 0, why: 'The recorded pod was ' + PR.before.phase + ' and ' + PR.before.ready_column + ' with ' + PR.before.endpoint_addresses + ' ready addresses until its file appeared.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'You delete a pod whose program ignores SIGTERM. The grace period is 30 seconds. What happens?',
        opts: [
          { t: 'The delete waits up to 30 seconds, and then the container gets SIGKILL', fb: '' },
          { t: 'The pod is removed at once', fb: 'It is removed at once only when the program exits at once.' },
          { t: 'The pod stays for ever', fb: 'SIGKILL ends it after the grace period.' },
          { t: 'The kubelet sends SIGINT instead', fb: 'It sends SIGTERM first and SIGKILL last.' }
        ],
        ok: 0, why: 'In the recording the pod without a handler held the delete for the whole grace period of 5 seconds, with no line of output.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: which probes for a Postgres pod that takes up to 90 seconds to start?',
        scenario: 'The database replays its log on start, which takes between 10 and 90 seconds. It never hangs. Clients must not be sent to it before it accepts connections. A rolling restart of the node pool happens every month.',
        opts: [
          { t: 'A readiness probe with `pg_isready`, and a startup probe that allows 120 seconds. No liveness probe', d: 'The Service sends calls only to a database that answers. A slow start is allowed. A restart is not forced on a process that does not hang.', lose: 'If it ever deadlocks, nothing restarts it by itself. An alert has to catch that.' },
          { t: 'A liveness probe with a 10-second timeout, and no readiness probe', d: 'The simplest YAML.', lose: 'The probe kills the pod on a slow start before it is up, again and again, and clients reach a database that is not ready.' },
          { t: 'No probes at all', d: 'Nothing can go wrong with a probe.', lose: 'The Service sends calls to a pod that does not accept connections yet, and nothing marks it as not ready.' }
        ],
        pick: 0,
        why: 'Readiness gates traffic, and the startup probe covers the long start. A liveness probe on a database is a risk: it can kill a pod that is slow or busy, and a restart of a database is expensive. Add one only for a failure mode that a restart cures.',
        when: 'A liveness probe is right for a stateless worker that can deadlock, and that restarts in a second.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: every node upgrade corrupts a batch', time: '04:05',
        alert: '**After each monthly node upgrade, the nightly aggregation job leaves half-written files.** The pods were deleted during the drain, and the job has no log line from the end.',
        clues: ['The job is started by `python run.py` inside `sh -c "python run.py"`', '`terminationGracePeriodSeconds` is the default, 30 seconds, and the batch needs about 2 minutes', 'There is no SIGTERM handler in `run.py`'],
        opts: [
          { t: 'Handle SIGTERM in the program, make the batch resumable, start it with `exec`, and set a grace period that covers the longest step', fb: '' },
          { t: 'Raise the number of replicas', fb: 'More pods get killed the same way.' },
          { t: 'Add a liveness probe', fb: 'A probe restarts a stuck container. It does not protect a normal shutdown.' },
          { t: 'Disable node upgrades', fb: 'That swaps one risk for others.' }
        ],
        best: 0,
        why: 'A drain deletes the pods, the program has no handler, and the shell in front of it hides the signal. The recording showed the effect: the pod without a handler held the delete for the full grace period and was then killed, with no line. The fix has four parts: a handler, a resumable batch, `exec`, and a grace period long enough.',
        checks: [
          ['Read the end of the log', 'No "got SIGTERM" line: the handler never ran.'],
          ['Look at process 1', 'Is it the program, or a shell that started it?'],
          ['Compare the times', '`terminationGracePeriodSeconds` against the longest step of the job.'],
          ['Prevent', 'Make the batch resumable or atomic: write to a temp name, rename at the end.']
        ],
        tell: 'The drain deleted the pods of the aggregation job, the program ignored SIGTERM and was killed after the grace period, which left half-written files. I added a handler, started the program with exec so that it receives the signal, made the write atomic with a rename, and raised the grace period above the longest step.',
        prevent: ['A **SIGTERM handler** and **exec** in the start command', '**Atomic writes**: temp name, then rename', 'A grace period **longer than the longest step**, and a PodDisruptionBudget for services']
      }),

      B.qa({
        id: 'qa-limits', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'Explain requests, limits and the QoS classes.',
        pts: ['Request: what the scheduler reserves', 'Limit: the cap that the node enforces', 'CPU over the limit is throttled, memory over the limit is killed', 'BestEffort, Burstable and Guaranteed decide the order of eviction'],
        short: 'A request is what the scheduler reserves when it places the pod. A limit is the cap that the node enforces. CPU over the limit is throttled, and memory over the limit gets the container killed with exit code 137, as in my recording of the OOM pod. From the two numbers Kubernetes derives the QoS class: BestEffort with nothing set, Guaranteed when requests equal limits for every container, and Burstable otherwise. I recorded one pod of each. When a node runs short of memory it evicts BestEffort first and Guaranteed last, so I make the pods that must not be lost, such as a database, Guaranteed. I set values from measured peaks, not from guesses.',
        fu: [['What if there are no requests?', 'The scheduler counts the pod as needing nothing, and it can land on a full node.'], ['Should you set CPU limits?', 'Many teams set requests and leave CPU limits off, to avoid throttling. Memory limits are kept. From documentation.']],
        trap: 'Setting only limits, or the same large numbers everywhere.',
        real: 'Say how you chose the memory of a job.'
      }),

      B.qa({
        id: 'qa-probes', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'What is the difference between a readiness and a liveness probe?',
        pts: ['Readiness: can it take traffic now? A failure removes it from the Service', 'Liveness: is it stuck? A failure restarts the container', 'A startup probe covers a slow start', 'A bad liveness probe causes outages'],
        short: 'Readiness asks whether the pod should get traffic. When it fails, the pod is taken out of the Service endpoints, and nothing is restarted. In my recording a pod was Running and 0/1, the Service had no ready address, and one second after the file appeared it was 1/1 with one address. Liveness asks whether the container is stuck. When it fails, the kubelet kills and restarts it: the recorded pod got Unhealthy and Killing events and a restart. A startup probe protects a slow start from the liveness probe. I am careful with liveness, because a probe that is too strict kills healthy pods, and on a database a restart is expensive.',
        fu: [['What does a rolling update wait for?', 'The readiness of the new pod. Mission 3 showed it stop on a bad pod.'], ['Which probe types exist?', 'HTTP, TCP, exec, and gRPC. From documentation.']],
        trap: 'Using one probe for both jobs, or a liveness probe that checks a dependency.',
        real: 'Describe a probe that you configured, and what it checks.'
      }),

      B.qa({
        id: 'qa-term', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'How should a data job shut down when its pod is deleted?',
        pts: ['The kubelet sends SIGTERM, then SIGKILL after the grace period', 'Install a handler: finish or checkpoint the batch, close connections', 'Make sure the signal reaches the program: exec, not a shell wrapper', 'Set terminationGracePeriodSeconds to cover the longest step'],
        short: 'On a delete the kubelet sends SIGTERM to process 1, and after the grace period, 30 seconds by default, it sends SIGKILL. So the program needs a handler that finishes or checkpoints the work and exits. The signal must reach the program, so I start it with exec and not behind a shell. The grace period must cover the longest step, and the work should be resumable or atomic, because a kill can still happen. I recorded both cases: the worker with a handler was gone at once and wrote its line, and the one without made the delete wait for the whole grace period and was then killed.',
        fu: [['What is a PodDisruptionBudget?', 'A limit on how many pods of a service may be down at once during a voluntary disruption such as a drain. From documentation.'], ['What is a preStop hook?', 'A command that runs before SIGTERM. It helps services that need a moment to stop taking calls. From documentation.']],
        trap: 'Assuming that the program always gets time to finish.',
        real: 'Say how your jobs behave when the node is drained.'
      }),

      B.qa({
        id: 'qa-pdb', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What is a PodDisruptionBudget, and what happens during a node drain?',
        pts: ['A drain evicts the pods of a node so that the node can be upgraded', 'A PodDisruptionBudget limits how many pods of a service may be down at once', 'Pods get SIGTERM and the grace period, as in mission 8', 'A topology spread keeps replicas on different nodes and zones'],
        short: 'A drain marks a node as unschedulable and evicts its pods, so that the node can be upgraded or replaced. The pods are stopped in the usual way: SIGTERM, then SIGKILL after the grace period. A PodDisruptionBudget says how many pods of a service must stay available, for example at least 2 of 3, and the drain waits rather than break it. For that to protect anything, the replicas must be on different nodes, which a topology spread constraint or anti-affinity makes sure of. And the pods must stop cleanly, which the recording showed: the worker with a handler was gone at once, and the one without made the delete wait for the whole grace period.',
        fu: [['Does a PDB protect against a node crash?', 'No. It covers voluntary disruptions such as a drain, not failures. From documentation.'], ['What about a single-replica database?', 'A budget of at least one blocks the drain. Plan a window, or run replicas.']],
        trap: 'Running three replicas that all sit on the same node.',
        real: 'Describe how you upgrade the nodes of a cluster without an outage.'
      }),

      B.qa({
        id: 'qa-hpa', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'How does autoscaling work on Kubernetes?',
        pts: ['HPA changes the replicas of a Deployment from a metric such as CPU', 'VPA changes requests and limits', 'A cluster autoscaler or Karpenter adds and removes nodes for Pending pods', 'KEDA scales on the length of a queue, for example Kafka lag'],
        short: 'There are three layers. The Horizontal Pod Autoscaler changes the number of replicas of a Deployment from a metric, by default CPU use against the request. The Vertical Pod Autoscaler suggests or sets requests and limits. A cluster autoscaler, or Karpenter on AWS, adds nodes when pods are Pending because nothing fits, and removes nodes that are empty. For data pipelines the interesting signal is the work waiting, such as the lag of a Kafka consumer group, and KEDA scales on that. All of this depends on honest requests, because the scheduler and the autoscaler count them. None of it ran on the single node of the recording, so this is from documentation.',
        fu: [['Why can HPA on CPU mislead a job?', 'A job that waits for a database uses no CPU while it falls behind. Scale on the backlog instead.'], ['What stops a scale-up?', 'Quotas, limits of the cloud account, or Pending pods that no node type can fit.']],
        trap: 'Autoscaling pods without requests, or without room for new nodes.',
        real: 'Say what signal your consumers should scale on.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Limit Setter', color: '#C7D2FE',
        pts: [
          'A **request** is for the scheduler. A **limit** is a cap: CPU is throttled, memory is **killed**.',
          'Three QoS classes: **' + Q.besteffort + '**, **' + Q.burstable + '**, **' + Q.guaranteed + '**, in the order of eviction.',
          '**Readiness** gates the traffic: a pod was ' + PR.before.ready_column + ' with ' + PR.before.endpoint_addresses + ' ready addresses until it was ready. **Liveness** restarts the container.',
          'A pod **without a handler** made the delete wait for the grace period. A pod with one was gone at once.',
          'Make batches **resumable or atomic**. A kill can still come.'
        ],
        lines: [
          'I set requests and limits from measurements.',
          'I use readiness for traffic and liveness only for hangs.',
          'My programs handle SIGTERM and receive it.'
        ]
      })
    ]
  });
})();
