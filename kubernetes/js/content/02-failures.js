/* Mission 2: pods that fail. Each failure was produced on a real Kubernetes cluster and read with kubectl. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BI = G.counts('fail.badimage'), CR = G.counts('fail.crash'), OM = G.counts('fail.oom'), PE = G.counts('fail.pending'), OOMY = G.file('pod-oom.yaml'), PENY = G.file('pod-pending.yaml');
  var n = G.n;
  G.expect(BI.seen.indexOf('ImagePullBackOff') >= 0 && BI.seen.indexOf('ErrImagePull') >= 0, 'a bad image goes through ErrImagePull to ImagePullBackOff');
  var GAPS = CR.restart_times_s.map(function (t, i) { return t - (i ? CR.restart_times_s[i - 1] : 0); }).slice(1);
  G.expect(CR.last_exit_code === 3 && CR.restarts_at_least_3 === true && CR.backoff_event === true && CR.seen.indexOf('Error') >= 0, 'the crash pod restarts at least three times with exit code 3 and a BackOff event');
  var SAMP = Object.keys(CR.status_samples).sort(function (a, b) { return CR.status_samples[b] - CR.status_samples[a]; }).map(function (k) { return '`' + k + '` ' + n(CR.status_samples[k]) + ' times'; }).join(', '), TOTAL = Object.keys(CR.status_samples).reduce(function (t, k) { return t + CR.status_samples[k]; }, 0);
  G.expect(CR.status_samples.Error > 0 && TOTAL >= 20, 'the recorder looked at the status column of the crash pod many times and saw Error'); 
  G.expect(GAPS.length >= 2 && GAPS.every(function (g, i) { return i === 0 || g > GAPS[i - 1]; }), 'the waits between restarts grow');
  G.expect(/not found/.test(G.text('fail.badimage_message')), 'the pull of a tag that does not exist ends with not found');
  G.expect(OM.reason === 'OOMKilled' && OM.exit_code === 137 && OM.qos === 'Burstable', 'the memory pod is OOMKilled with 137 and is Burstable');
  G.expect(PE.status === 'Pending' && PE.node_assigned === false && /Insufficient cpu/.test(G.text('fail.pending_event')), 'the pending pod has no node and an Insufficient cpu event');
  G.expect(G.text('fail.crash_logs') === 'starting the load', 'the log of the crashed container holds its one line');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Pods that fail', short: 'Failures', blurb: 'Four pods that do not stay up, and how to read each one', minutes: 17,
    focus: ['stg', 'ing'],
    goals: [
      'Read **ImagePullBackOff, CrashLoopBackOff, OOMKilled and Pending**.',
      'Know which command shows the cause of each.',
      'Say what a **request** is and what a **limit** is.',
      'Debug a pod in a fixed order.'
    ],
    say: 'Most of what you will do on a cluster is find out why a pod is not running. This mission breaks four pods on purpose, and reads what Kubernetes says about each. The words are strange and the causes are ordinary.',
    scenes: [
      B.flow({
        id: 'm2-life', t: 1, src: 'rec', title: 'The life of a pod, and how it stalls', g: 'podlife', legend: true,
        steps: [
          { say: 'A pod starts as **Pending** and, if all goes well, ends as **Running**, then **Succeeded** or **Failed**. This picture also shows four ways that it stalls. Press Next.', focus: ['pend', 'cre', 'run', 'done'], cap: 'The normal path, and four ways off it.' },
          { say: 'Step 1. **Pending**: the pod exists, and no node is assigned yet. It waits for the scheduler.', on: ['e1'], focus: ['pend', 'cre'], cap: 'Waiting for a node.' },
          { say: 'Step 2. **ContainerCreating**: the node is chosen, and the kubelet prepares the image and the volumes.', on: ['e2'], focus: ['cre', 'run'], cap: 'The kubelet prepares the container.' },
          { say: 'Step 3. **Running**, then **Succeeded** when the process exits with 0, or **Failed** when it does not and will not be restarted.', on: ['e3'], focus: ['run', 'done'], cap: 'The process runs, and ends.' },
          { say: 'Stall 1. **Pending for ever**: no node can take the pod. Often it asks for more than any node has.', on: ['e4'], focus: ['pend', 'nofit'], cap: 'No node fits.' },
          { say: 'Stall 2. **ImagePullBackOff**: the image cannot be pulled, for example because the tag does not exist, so the container never starts.', on: ['e5'], focus: ['cre', 'pull'], cap: 'The image is the problem.' },
          { say: 'Stall 3. **CrashLoopBackOff**: the container starts, exits, and the kubelet restarts it with a growing wait. Most clusters show `CrashLoopBackOff` in the status for the wait. The cluster of the recording mostly said `Error`, so the restart count and the **BackOff** event are the signs to trust.', on: ['e6'], focus: ['run', 'loop'], cap: 'The program is the problem.' },
          { say: 'Stall 4. **OOMKilled**: the container went over its memory limit, and the kernel ended it. You will read it in the status of the container.', on: ['e7'], focus: ['run', 'oom'], tags: ['tg_k'], cap: 'The limit is the problem.' }
        ]
      }),

      B.term({
        id: 'm2-image', t: 1, src: 'rec', title: 'An image that cannot be pulled',
        say: 'The pod names `alpine:3.22-nope`, a tag that does not exist. This is the typo of mission 3, in a pod of its own. I read the status of the pod while the kubelet tried.',
        lines: function () {
          return G.term([
            ['kubectl apply -f pod-badimage.yaml', 'pod/badimage created'],
            ['kubectl get pod badimage   # statuses that the recorder saw, in order', BI.seen.join('  ->  ')],
            ['kubectl describe pod badimage   # the reasons of the events', BI.event_reasons.join(', ') + '\nFailed to pull image \"alpine:3.22-nope\" ... ' + G.text('fail.badimage_message')]
          ]);
        },
        after: 'The status moved from ContainerCreating to **ErrImagePull**, the error, and then to **ImagePullBackOff**, the wait before the next try. The event says why: **' + G.text('fail.badimage_message') + '**. The registry answered, and it has no such tag. Other common causes are a typo in the image name, a registry that the node cannot reach, and a private registry with no **image pull secret**. Each gives a different tail on the same event, so read it to the end.',
        afterKind: 'tip',
        doneSay: 'ErrImagePull is the error. ImagePullBackOff is the wait. The cause is in the events.'
      }),

      B.term({
        id: 'm2-crash', t: 1, src: 'rec', title: 'A container that exits at once',
        say: 'The command prints one line and exits with code 3. The restart policy of the pod is the default, Always. I watched the pod for about two minutes and wrote down when the restart counter went up.',
        lines: function () {
          return G.term([
            ['kubectl apply -f pod-crash.yaml', 'pod/crash created'],
            ['kubectl get pod crash', G.text('fail.crash_get')],
            ['kubectl logs crash', G.text('fail.crash_logs')],
            ['kubectl describe pod crash   # the state of the container', G.text('fail.crash_describe')],
            ['kubectl describe pod crash   # the event of the loop', 'Warning  BackOff  ' + G.text('fail.crash_event')]
          ]);
        },
        after: 'The status went ' + CR.seen.join(' -> ') + ' and the restart counter went up about **' + CR.restart_times_s.join(', ') + '** seconds after the apply: the waits between restarts were **' + GAPS.join(', ') + '** seconds, and they grow. The kubelet starts the container again after every exit, because the restart policy is Always, and waits longer each time: that is the **back-off**. Documentation, and most clusters, show the status **CrashLoopBackOff** for the wait. On this cluster (' + G.meta('kubernetes') + ') the recorder looked at the status column ' + n(TOTAL) + ' times while the pod looped, and saw: ' + SAMP + '. So here the word that gives the loop its name was not on screen, and the signs to trust were the **restart count** and the **BackOff event**. Read those on any cluster. The cause is in the container: one line in the log, and exit code **' + CR.last_exit_code + '**. In this cluster `kubectl logs --previous` could not read the log of an earlier run, so the screen shows the log of the last one.',
        afterKind: 'warn',
        doneSay: 'A growing restart count and a BackOff event mean that the program exits. Read its log and its exit code.'
      }),

      B.code({
        id: 'm2-oomyaml', t: 1, src: 'rec', title: 'A memory limit in a manifest', file: 'pod-oom.yaml', lang: 'yaml', code: OOMY,
        steps: [
          { say: 'A pod with a limit of 64 MiB that runs a Python program which allocates 200 MB.', lines: null },
          { say: '`restartPolicy: Never` keeps the kubelet from restarting the container, so that the pod ends and keeps its status.', lines: G.span(OOMY, /restartPolicy/) },
          { say: 'The program allocates 200 MB at once.', lines: G.span(OOMY, /command:/) },
          { say: 'A **limit** is a ceiling that the kernel enforces. Over it, the container is killed. A **request** is what the scheduler counts when it chooses a node. This pod has no request.', lines: G.span(OOMY, /resources:/, /memory: 64Mi/) }
        ],
        note: 'The Docker course showed the same kill with `docker run -m 64m`. A pod limit becomes a limit of the container.'
      }),

      B.term({
        id: 'm2-oom', t: 1, src: 'rec', title: 'Killed for its memory',
        say: 'I applied the pod and read how it ended.',
        lines: function () {
          return G.term([
            ['kubectl apply -f pod-oom.yaml', 'pod/oom created'],
            ['kubectl get pod oom -o jsonpath="{.status.containerStatuses[0].state.terminated.reason}"', OM.reason],
            ['kubectl get pod oom -o jsonpath="{.status.containerStatuses[0].state.terminated.exitCode}"', String(OM.exit_code)],
            ['kubectl get pod oom -o jsonpath="{.status.phase}"', OM.phase],
            ['kubectl logs oom', G.text('fail.oom_logs') || '(nothing)']
          ]);
        },
        after: 'The reason is **' + OM.reason + '** and the exit code is **' + OM.exit_code + '**, the same pair as in Docker. The log is empty, because the program never got to print. The pod ended as **' + OM.phase + '**. The pod has the QoS class **' + OM.qos + '**: it has a limit and no request. Raise the limit above the peak that you measured, or change the program to work in chunks.',
        afterKind: 'warn',
        doneSay: 'OOMKilled and 137, with an empty log: the limit was too low.'
      }),

      B.term({
        id: 'm2-pending', t: 1, src: 'rec', title: 'A pod that no node can take',
        say: 'The pod asks for 64 CPUs. The node of this cluster has ' + PE.node_cpus + '.',
        lines: function () {
          return G.term([
            ['kubectl apply -f pod-pending.yaml', 'pod/pending created'],
            ['kubectl get pod pending', 'NAME      READY   STATUS    RESTARTS   AGE\npending   0/1     ' + PE.status + '   0          <age>'],
            ['kubectl get pod pending -o jsonpath="{.spec.nodeName}"', '(empty: no node was assigned)'],
            ['kubectl describe pod pending   # the last event', 'Warning  FailedScheduling  ' + G.text('fail.pending_event')]
          ]);
        },
        after: 'The scheduler wrote **FailedScheduling** with the reason: **Insufficient cpu**. The pod stays Pending, with no node, and the scheduler tries again when something changes. The number that matters is the **request**. A pod is placed when a node has room for its requests, whatever the program really uses.',
        afterKind: 'tip',
        doneSay: 'Pending with FailedScheduling: the requests do not fit on any node.'
      }),

      B.widget({ id: 'm2-lab', kind: 'fail', t: 1, src: 'rec', title: 'Lab: four pods that fail' }),

      B.cmp({
        id: 'm2-flow', t: 1, src: 'docs', title: 'A fixed order for debugging',
        say: 'Three commands, in this order, answer most questions. Press Next.',
        cols: ['Command', 'Answers', 'Typical finding'],
        hl: 0,
        rows: [
          ['`kubectl get pod POD`', 'What state is it in?', 'ImagePullBackOff, Pending, Error or CrashLoopBackOff for a restart loop (CrashLoopBackOff on most clusters, Error on the recorded one), OOMKilled in the container state'],
          ['`kubectl describe pod POD`', 'What did the cluster try, and what did it say?', 'The events: FailedScheduling, Failed to pull image, Back-off, Unhealthy'],
          ['`kubectl logs POD`', 'What did the program say?', 'A traceback, a refused connection, or nothing, which is typical for a memory kill'],
          ['`kubectl get events --sort-by=.lastTimestamp`', 'What happened in the namespace, in time order?', 'A node problem, an eviction, or the sequence across several pods']
        ],
        steps: [
          { upto: 2, say: 'State first, then the events. The events are written by the cluster, so they tell you whether the problem is the cluster or your program.' },
          { upto: 4, say: 'Logs next, for the program. An empty log together with exit code 137 is a limit, not a program error.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This pod stays Pending for ever. `kubectl describe` says "Insufficient cpu". Click the line that is the problem.',
        file: 'pod-pending.yaml', lang: 'yaml', code: PENY, bad: [G.at(PENY, /cpu: "64"/)],
        hint: 'Which line says how much CPU the pod needs from a node?',
        why: 'The request is `cpu: "64"`, which is 64 whole CPUs. A pod is scheduled where the requests fit, and the node of the recording had ' + PE.node_cpus + '. A request is a reservation: it is what the scheduler counts, even if the program would use much less.',
        fix: PENY.replace('cpu: "64"', 'cpu: 100m'),
        cheer: 'Request what the job needs. `100m` is a tenth of a CPU.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put these steps of debugging a pod that does not run in a sensible order.',
        items: [
          'Look at the status with kubectl get pod',
          'Read the events at the end of kubectl describe pod',
          'Read the log with kubectl logs',
          'Decide whether the cause is the image, the program, the limits or the cluster',
          'Fix the manifest and apply it again'
        ],
        why: 'The status is the cheapest check. The events say what the cluster tried. The log says what the program did. Only then do you know which part to change.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'A pod shows `ImagePullBackOff`. What does that mean?',
        opts: [
          { t: 'The image could not be pulled and the kubelet is waiting before it tries again', fb: '' },
          { t: 'The program inside the container crashed', fb: 'The container never started.' },
          { t: 'The node ran out of memory', fb: 'That would show other events.' },
          { t: 'The image is too large for the node', fb: 'The events name a different cause.' }
        ],
        ok: 0, why: 'The recording: ' + BI.seen.join(', then ') + '. The event said: ' + G.text('fail.badimage_message') + '.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'A container is `OOMKilled` and its log is empty. Which statement is right?',
        opts: [
          { t: 'The program has a bug that prints nothing', fb: 'The kernel ended it before it could print.' },
          { t: 'It went over its memory limit and the kernel ended it', fb: '' },
          { t: 'The node is out of disk space', fb: 'That is a different event.' },
          { t: 'The image has no shell', fb: 'The image started fine.' }
        ],
        ok: 1, why: 'The reason was ' + OM.reason + ', the exit code ' + OM.exit_code + ', and the log was empty.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'A pod is `Pending` and `kubectl get pod -o wide` shows no node. What do you read next?',
        opts: [
          { t: 'The events: FailedScheduling says why no node was chosen', fb: '' },
          { t: 'The log of the container', fb: 'No container has started, so there is no log.' },
          { t: 'The restart count', fb: 'It is zero, because nothing ran.' },
          { t: 'The Docker version', fb: 'Not relevant.' }
        ],
        ok: 0, why: 'The scheduler wrote: ' + G.text('fail.pending_event')
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'rec', title: 'Decision: how to set the memory of the loader',
        scenario: 'The loader needs about 150 MB at its peak. The team writes a limit of 128 MiB, because "that is what we saw on average". The first night, the pod ends with OOMKilled. The cluster is shared with other teams.',
        opts: [
          { t: 'Raise the limit a little, to 160 MiB, and set no request', d: 'It fits the peak.', lose: 'With no request the pod is scheduled as if it needed nothing, and it is among the first to be removed when a node is short of memory.' },
          { t: 'Set the request to the peak that you measured and the limit above it, for example a request of 192 MiB and a limit of 256 MiB', d: 'The scheduler reserves room, the job has headroom, and the kill only happens when something is really wrong.' },
          { t: 'Remove the limit, so it can never be killed', d: 'No more OOMKilled.', lose: 'A job with a leak or a large input can then take the memory of the node, and the kernel chooses something else to kill.' }
        ],
        pick: 1,
        why: 'The recording showed that a limit kills and a request reserves. The peak, not the average, sets both. Measure a real run, add room, and alert on OOMKilled.',
        when: 'Use a limit equal to the request when you want the pod to be Guaranteed, which mission 8 explains.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: the nightly Job fails with no log', time: '03:10',
        alert: '**The nightly Job pod ends with status Error, and `kubectl logs` is empty.** The Job retries, and fails the same way, three times.',
        clues: ['`kubectl get pod POD -o jsonpath` shows reason OOMKilled and exit code 137', 'The limit is `memory: 128Mi`', 'The input file is larger this month'],
        opts: [
          { t: 'Measure the peak, then raise the request and the limit above it, or change the loader to read in chunks', fb: '' },
          { t: 'Raise the Job backoff limit so that it retries more times', fb: 'Each retry hits the same limit.' },
          { t: 'Delete the pod and let the Job create it again', fb: 'It is the same pod with the same limit.' },
          { t: 'Remove the limit', fb: 'That hides the problem and risks the node.' }
        ],
        best: 0,
        why: 'The recording read the same pair from a pod: reason ' + OM.reason + ' and exit code ' + OM.exit_code + ', with an empty log. Retrying cannot help when the cause is the size of the job.',
        checks: [
          ['Read the reason', '`kubectl get pod POD -o jsonpath="{.status.containerStatuses[0].state.terminated.reason}"`.'],
          ['Read the limit', '`kubectl get pod POD -o jsonpath="{.spec.containers[0].resources}"`.'],
          ['Measure', 'Run the job with a larger limit once, and watch its peak.'],
          ['Alert', 'Alert on OOMKilled, and on input that grows past what the limit allows.']
        ],
        tell: 'The Job pods were killed by the kernel because they went over their memory limit, which is why the log was empty and the exit code was 137. Retrying could not help. I measured the peak, set the request and the limit above it, and added an alert for OOMKilled.',
        prevent: ['Alert on **OOMKilled**', 'Set **requests and limits** from measurements', 'Watch the **size of the input**']
      }),

      B.qa({
        id: 'qa-crashloop', t: 1, tag: 'Kubernetes', secs: 60,
        q: 'What is CrashLoopBackOff, and how do you debug it?',
        pts: ['The container starts, exits, and the kubelet restarts it with a growing wait', 'Read the log of the container and its exit code', 'describe shows the last state and the events', 'The cause is in the program, the command or the config, not in the cluster'],
        short: 'CrashLoopBackOff means that a container starts, exits, and the kubelet keeps restarting it, with a wait that grows between tries. The status name is the wait, and the cause is that the program exits. I read `kubectl logs` for what it said and the exit code in `kubectl describe pod` or in the status. In the recording a container that printed one line and exited with code ' + CR.last_exit_code + ' restarted with waits of ' + GAPS.join(', ') + ' seconds. On that cluster the status column mostly said Error and not CrashLoopBackOff, so I also read the restart count and the BackOff event. Common causes are a wrong command, a missing setting or file, a refused database connection, and a probe that kills a slow start.',
        fu: [['Can you read the log of the previous run?', '`kubectl logs --previous` normally does. In this cluster it could not, so the recording used the log of the last run.'], ['What is the wait?', 'It starts at ten seconds and doubles up to five minutes. From documentation.']],
        trap: 'Restarting the pod by hand again and again.',
        real: 'Describe a crash loop that you debugged.'
      }),

      B.qa({
        id: 'qa-oomk8s', t: 1, tag: 'Kubernetes', secs: 60,
        q: 'What is the difference between a resource request and a limit, and what is OOMKilled?',
        pts: ['A request is what the scheduler reserves when it chooses a node', 'A limit is a ceiling that the node enforces', 'Over the memory limit the container is killed: reason OOMKilled, exit 137', 'Set both from measurements'],
        short: 'A request is the amount that the scheduler reserves on a node when it places the pod. A limit is the ceiling that the node enforces. For memory, a container that goes over its limit is killed by the kernel, and the status shows the reason OOMKilled and exit code 137, usually with an empty log, as in the recording where a job that allocated 200 MB under a limit of ' + OM.limit + ' ended that way. For CPU a limit throttles and does not kill. I set both from a measured peak, with room above it, and I alert on OOMKilled.',
        fu: [['What if the request is larger than any node?', 'The pod stays Pending with FailedScheduling, as in the recording: 64 CPUs asked, ' + PE.node_cpus + ' available.'], ['What QoS class does a pod with a limit and no request get?', OM.qos + ', as in the recording.']],
        trap: 'Setting only a limit, or only a request, and expecting both effects.',
        real: 'Say how you sized the memory of a job.'
      }),

      B.qa({
        id: 'qa-pending', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'A pod stays Pending. What are the usual causes, and where do you look?',
        pts: ['The scheduler found no node: not enough CPU or memory', 'A taint that the pod does not tolerate, or a node selector that matches nothing', 'A volume claim that cannot be bound', 'Read the events of kubectl describe pod'],
        short: 'Pending means that the pod exists and has no node, or that it has a node and is waiting for something like a volume. I read the events at the end of `kubectl describe pod`. The scheduler writes FailedScheduling with the reason, for example Insufficient cpu, as in the recording where a pod asked for 64 CPUs on a node with ' + PE.node_cpus + '. Other reasons are a taint that the pod does not tolerate, a node selector or affinity that matches no node, and a PersistentVolumeClaim that is not bound. The fix follows the reason: smaller requests, more nodes, a toleration, or a storage class.',
        fu: [['How do you see what a node has?', '`kubectl describe node` shows its capacity and what is already requested.'], ['Does a cluster add nodes by itself?', 'A cluster autoscaler can, on a managed cluster. It did not run here. From documentation.']],
        trap: 'Waiting for a Pending pod instead of reading the event.',
        real: 'Say why a pod of yours stayed Pending.'
      }),

      B.qa({
        id: 'qa-debug', t: 1, tag: 'Kubernetes', secs: 60,
        q: 'How do you debug a pod that does not work?',
        pts: ['kubectl get pod: the state', 'kubectl describe pod: the events', 'kubectl logs: what the program said', 'Then decide: image, program, limits or cluster'],
        short: 'I go in a fixed order. `kubectl get pod` for the state: ImagePullBackOff, CrashLoopBackOff, Pending or Error. `kubectl describe pod` for the events, which the scheduler and the kubelet write: FailedScheduling, a failed pull, a back-off, a failed probe. Then `kubectl logs` for what the program said, and the exit code from the status. The four failures of the recording each had a different signature: a bad image gave ImagePullBackOff, a crash gave a restart loop (CrashLoopBackOff, or Error with a BackOff event) with exit code ' + CR.last_exit_code + ', a memory kill gave OOMKilled and ' + OM.exit_code + ', and a request that does not fit gave Pending with FailedScheduling. Once I know which part is at fault, I change the manifest and apply it again.',
        fu: [['What if the container has no shell to exec into?', 'Use `kubectl debug` with an ephemeral container. From documentation.'], ['What do you check for a pod that is Running but wrong?', 'Its logs, its readiness, the Service endpoints and the configuration it received.']],
        trap: 'Deleting the pod first and reading nothing.',
        real: 'Walk through the last pod that you debugged.'
      }),

      B.qa({
        id: 'qa-evict', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What is eviction, and how does it differ from OOMKilled?',
        pts: ['OOMKilled: one container went over its own memory limit', 'Eviction: the kubelet removes a pod because the node runs short of memory, disk or processes', 'QoS decides the order: BestEffort, then Burstable, then Guaranteed', 'An evicted pod shows the reason Evicted, and a controller makes a new one elsewhere'],
        short: 'OOMKilled is about one container and its own limit: the kernel ends it, as in the recording of the 64 MiB pod. Eviction is about the node. When a node runs short of memory, disk or process ids, the kubelet removes pods to protect the node, and it picks by QoS class: BestEffort first, then Burstable pods that use more than they asked for, and Guaranteed pods last. An evicted pod ends with the reason Evicted, and the Deployment or Job above it makes a new pod, often on another node. So requests that are too low cause evictions, and limits that are too low cause OOMKills. Both are fixed from measured peaks.',
        fu: [['Where do you see the reason?', '`kubectl describe pod` shows Evicted with a message about the pressure. From documentation.'], ['What is a node condition?', 'MemoryPressure, DiskPressure and PIDPressure. In the sandbox of this course a DiskPressure taint stopped pods until the thresholds were set lower.']],
        trap: 'Treating every kill as an OOMKilled and raising a limit.',
        real: 'Describe a pod that was evicted, and why.'
      }),

      B.qa({
        id: 'qa-pullsecret', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'A pod cannot pull its image from a private registry. What do you need?',
        pts: ['A Secret of type docker-registry with the login', 'imagePullSecrets on the pod, or on its service account', 'On a cloud, the node role or workload identity can replace the secret', 'The event says unauthorized or not found, and not the same thing'],
        short: 'The kubelet must authenticate to the registry. The usual way is a Secret of type `kubernetes.io/dockerconfigjson`, referenced under `imagePullSecrets` of the pod, or of the service account that the pod uses so that every pod gets it. On a cloud I prefer to give the node role, or the identity of the pod, the right to pull, so that no password is stored. The events help to tell the causes apart: in the recording a tag that did not exist ended with `not found`, and a login problem ends with `unauthorized` or `denied`. A private registry with no secret looks like a missing image to a beginner.',
        fu: [['Where is the secret stored?', 'In the namespace of the pod. A secret is not shared between namespaces.'], ['What about rate limits of a public registry?', 'Pulls of anonymous users are limited. Many teams mirror images into their own registry. From documentation.']],
        trap: 'Putting the registry password in the image or in a plain ConfigMap.',
        real: 'Say which registry your clusters pull from, and how they log in.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Pod Debugger', color: '#A5F3FC',
        pts: [
          '**ImagePullBackOff**: the image cannot be pulled. **CrashLoopBackOff** (a restart loop): the program exits (exit code ' + CR.last_exit_code + ' here, and the waits grew: ' + GAPS.join(', ') + ' s). **OOMKilled**: over the memory limit (exit ' + OM.exit_code + '). **Pending**: no node fits.',
          'The order: `get`, then `describe` for the events, then `logs`.',
          'A **request** reserves room for the scheduler. A **limit** is a ceiling that kills.',
          'An empty log with 137 is a memory limit.',
          'The scheduler wrote **' + G.text('fail.pending_event').split('.')[0] + '**.'
        ],
        lines: [
          'I can read a failing pod in a fixed order.',
          'I know what a request and a limit do.',
          'I do not restart pods before I read the events.'
        ]
      })
    ]
  });
})();
