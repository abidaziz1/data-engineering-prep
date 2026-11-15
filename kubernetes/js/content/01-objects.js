/* Mission 1: the cluster and its objects. Every output on these screens came from a real Kubernetes cluster. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PH = G.counts('obj.phases'), POD = G.counts('obj.pod'), BARE = G.counts('obj.bare_pod'), API = G.counts('cluster.apiresources'), EV = G.table('obj.events'), SYS = G.table('obj.system_pods'), HELLO = G.file('pod-hello.yaml');
  var n = G.n;
  G.expect(PH.ends_running === true && PH.seen[PH.seen.length - 1] === 'Running', 'the pod ends as Running');
  G.expect(BARE.recreated === false, 'a bare pod is not recreated after it is deleted');
  G.expect(POD.qos === 'BestEffort' && POD.restart_policy === 'Always' && POD.service_account === 'default', 'the pod has no resources, restart policy Always and the default service account');
  G.expect(EV.rows.map(function (r) { return r[1]; }).join(',') === 'Scheduled,Pulled,Created,Started', 'the events of a pod: Scheduled, Pulled, Created, Started');
  G.expect(G.text('val.strict').indexOf('unknown field') > 0, 'strict validation names the unknown field');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The cluster and its objects', short: 'Pods', blurb: 'Apply a pod, read what the cluster says, and learn the words', minutes: 17,
    focus: ['src', 'stg'],
    goals: [
      'Say what the **API server, the scheduler and the kubelet** do.',
      'Apply a **manifest** and read `get`, `describe` and `logs`.',
      'Explain **labels** and why a bare pod is not enough.',
      'Tell a Docker command from its Kubernetes counterpart.'
    ],
    say: 'You know what a container is. Kubernetes adds a cluster around it: machines to run it on, and a loop that keeps it running. We start with one node and one pod, and read everything the cluster says about it.',
    scenes: [
      B.term({
        id: 'm1-nodes', t: 1, src: 'rec', title: 'The cluster that you talk to',
        say: 'Three commands that you run first on any cluster. This is the cluster of this course.',
        lines: function () {
          return G.term([
            ['kubectl get nodes', G.text('obj.nodes')],
            ['kubectl get namespaces', G.text('obj.namespaces')],
            ['kubectl get pods --all-namespaces', 'NAMESPACE     NAME                           READY   STATUS\n' + SYS.rows.map(function (r) { return (r[0] + '            ').slice(0, 14) + (r[1] + '                              ').slice(0, 31) + (r[2] + '      ').slice(0, 8) + r[3]; }).join('\n')]
          ]);
        },
        after: 'One **node**, which is a machine that runs pods, ready with the version of this cluster. **Namespaces** group objects: `kube-system` holds what the cluster itself runs, here the DNS server and a volume provisioner, and `default` is where objects go when you name no namespace. The recorder used its own, `brewline`. The cluster knows **' + API.kinds + '** kinds of object.',
        afterKind: 'tip',
        doneSay: 'A cluster is nodes, namespaces and the pods in them.'
      }),

      B.code({
        id: 'm1-pod', t: 1, src: 'rec', title: 'A pod, as a file', file: 'pod-hello.yaml', lang: 'yaml', code: HELLO,
        steps: [
          { say: 'This is a **manifest**: a description of one object. I applied this file to the cluster. Press Next to read it.', lines: null },
          { say: '`apiVersion` and `kind` say what sort of object this is. A Pod belongs to the core API, version `v1`.', lines: G.span(HELLO, /^apiVersion/, /^kind/) },
          { say: '`metadata` names the object. A **label** is a key and a value that you choose, here `app: hello`. Labels are how other objects find this one.', lines: G.span(HELLO, /^metadata:/, /app: hello/) },
          { say: '`spec` is what you want. A pod holds one or more **containers**. This one runs the image `alpine:3.22` and starts a command that prints a line and sleeps.', lines: G.span(HELLO, /^spec:/) }
        ],
        note: 'The same four parts, apiVersion, kind, metadata and spec, start every manifest in this course.'
      }),

      B.term({
        id: 'm1-apply', t: 1, src: 'rec', title: 'Apply it and watch',
        say: 'The file goes to the cluster. I read the phase of the pod every fifth of a second until it ran.',
        lines: function () {
          return G.term([
            ['kubectl apply -f pod-hello.yaml', G.text('obj.apply')],
            ['kubectl get pod hello -w   # the phases that the recorder saw', PH.seen.join('  ->  ')],
            ['kubectl get pod hello', G.text('obj.get')],
            ['kubectl logs hello', G.text('obj.logs')]
          ]);
        },
        after: '`apply` says **created**. The pod went through ' + PH.seen.join(', then ') + '. `ContainerCreating` is the time between "a node was chosen" and "the container runs": the image and the volumes are prepared there. `kubectl logs` shows what the container wrote to standard output, as `docker logs` does.',
        afterKind: 'tip',
        doneSay: 'apply sends the wish. get shows where it is. logs shows the output.'
      }),

      B.rows({
        id: 'm1-events', t: 1, src: 'rec', title: 'What the cluster did, step by step',
        steps: [
          {
            say: '`kubectl describe pod hello` ends with the **events** of the pod. Each event has a reason, and a component wrote it.',
            tabs: [{ layer: 'RECORDED', name: 'Events of the pod hello', c: 'raw', cols: ['type', 'reason', 'message'], rows: EV.rows, trk: 0 }],
            notes: ['**Scheduled** was written by the scheduler: the pod got a node. **Pulled**, **Created** and **Started** came from the kubelet. The image was **already on the machine**, so there was no pull. When a pod does not start, these events are the first place to look. Mission 2 shows what they say when it fails.']
          },
          {
            say: 'The pod object also holds the status that the kubelet wrote.',
            tabs: [{ layer: 'RECORDED', name: 'Fields of the pod', c: 'raw', cols: ['field', 'value'], rows: [['phase', POD.phase], ['node', POD.node], ['has a pod IP address', POD.has_ip ? 'yes' : 'no'], ['container restarts', POD.restart_count], ['ready', POD.ready ? 'yes' : 'no'], ['QoS class', POD.qos], ['restart policy', POD.restart_policy], ['service account', POD.service_account]], trk: 0 }],
            notes: ['The **restart policy** `Always` means that the kubelet starts the container again when it exits. The **QoS class** is `' + POD.qos + '` because the pod asked for no CPU or memory. Mission 8 shows the other two classes.']
          }
        ]
      }),

      B.term({
        id: 'm1-labels', t: 1, src: 'rec', title: 'Labels, and a pod that nobody replaces',
        say: 'A label selects objects. Then I deleted the pod, and looked for it again.',
        lines: function () {
          return G.term([
            ['kubectl get pods -l app=hello', G.text('obj.labels')],
            ['kubectl delete pod hello', 'pod "hello" deleted'],
            ['kubectl get pod hello', 'Error from server (NotFound): pods "hello" not found']
          ]);
        },
        after: '`-l app=hello` selects every pod with that label. The pod was deleted and **it did not come back**: ' + (BARE.recreated ? 'it was recreated' : 'nothing recreated it') + '. A pod on its own has no controller. The kubelet restarts a **container** of a pod, and nobody restarts a **pod** that is deleted, or that is lost with its node. That is why you run pods through a Deployment or a Job.',
        afterKind: 'warn',
        doneSay: 'A bare pod is a pod without an owner. Give it one.'
      }),

      B.cmp({
        id: 'm1-docker', t: 1, src: 'docs', title: 'Docker words and Kubernetes words',
        say: 'You know the left column. Press Next to see where each idea lives on a cluster.',
        cols: ['In Docker', 'In Kubernetes', 'What is different'],
        hl: 0,
        rows: [
          ['`docker run IMAGE`', 'A **pod**, written as a manifest', 'A pod can hold several containers that share a network and volumes. You rarely create one by hand.'],
          ['`--restart on-failure`', '`restartPolicy` of the pod, and a **Job** for batch work', 'The kubelet restarts containers. A controller replaces pods.'],
          ['A service of Compose', 'A **Deployment**, and a **Service** for the name', 'Compose starts containers on one machine. Kubernetes places pods on nodes.'],
          ['A named volume', 'A **PersistentVolumeClaim**', 'A claim is a request. The cluster finds or creates the storage.'],
          ['`-e` and `.env`', 'A **ConfigMap** and a **Secret**', 'Settings are objects in the cluster, and a pod refers to them.'],
          ['`docker stop`', '`kubectl delete pod`', 'SIGTERM, a grace period of 30 seconds by default, then SIGKILL.']
        ],
        steps: [
          { upto: 3, say: 'The first rows are about running and restarting. Kubernetes splits the job: the kubelet restarts containers, controllers replace pods.' },
          { upto: 6, say: 'The rest are about data, settings and stopping. The ideas are the same as in Docker, and each one is now an object that you can read with `kubectl get`.' }
        ]
      }),

      B.talk({
        id: 'm1-words', t: 1, src: 'docs', title: 'Eight words, used exactly',
        say: 'Interviewers listen for these. Press Next for each.',
        items: [
          ['Cluster', 'A set of machines, with a control plane that decides and nodes that run pods.', 'The whole thing.'],
          ['Node', 'A machine that runs pods. It runs a kubelet and a container runtime.', 'Where pods run.'],
          ['Pod', 'The smallest thing that Kubernetes runs: one or more containers that start and stop together and share an address.', 'The unit that runs.'],
          ['Manifest', 'A YAML file that describes an object: what you want.', 'A wish, written down.'],
          ['Controller', 'A loop that compares what you want with what exists, and acts on the difference.', 'The part that corrects.'],
          ['Namespace', 'A named group of objects. Names must be unique inside one.', 'A folder for objects.'],
          ['Label and selector', 'A label is a key and a value on an object. A selector finds objects by their labels.', 'How objects find each other.'],
          ['API server', 'The only part that everything else talks to. It stores objects in etcd.', 'The front door.']
        ],
        cols: 2
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'This manifest is refused by the cluster. Click the line that is the problem.',
        file: 'pod-typo.yaml', lang: 'yaml', code: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: typo\nspec:\n  containers:\n    - name: a\n      image: alpine\n      imagee: x\n',
        bad: [9],
        hint: 'Which field name is not part of a container?',
        why: 'The key `imagee` is not a field of a container. With strict validation the API server refuses the object and names the field: **' + G.text('val.strict') + '**. A typo in a key is a common mistake, and strict checking catches it before the object exists.',
        fix: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: typo\nspec:\n  containers:\n    - name: a\n      image: alpine\n',
        cheer: 'Check the keys as well as the values. `kubectl apply --dry-run=server` asks the real API server, and changes nothing.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put what happens after `kubectl apply -f pod-hello.yaml` in order.',
        items: [
          'kubectl sends the manifest to the API server',
          'The API server checks it and stores the pod in etcd',
          'The scheduler sees a pod with no node, and picks one',
          'The kubelet on that node sees a pod assigned to it',
          'The container runtime starts the container',
          'The kubelet writes the status back into the API'
        ],
        why: 'Every step goes through the API server: it is the only part that stores state. The events of the recording followed the same order: Scheduled by the scheduler, then Pulled, Created and Started by the kubelet.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'Which part of Kubernetes chooses the node for a new pod?',
        opts: [
          { t: 'The kubelet of the node that is least busy', fb: 'The kubelet runs pods that are already assigned to it.' },
          { t: 'The scheduler', fb: '' },
          { t: 'kubectl', fb: 'kubectl only sends requests to the API server.' },
          { t: 'etcd', fb: 'etcd only stores the state.' }
        ],
        ok: 1, why: 'The recording shows the event "Successfully assigned brewline/hello to ' + POD.node + '", written by the default scheduler.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'You delete a pod that you started with `kubectl apply` of a Pod manifest. What happens?',
        opts: [
          { t: 'Kubernetes starts a new one, because it keeps the state that you asked for', fb: 'Only a controller does that, and this pod has none.' },
          { t: 'It is gone, and nothing replaces it', fb: '' },
          { t: 'It is gone until the next restart of the node', fb: 'The object is deleted from the API.' },
          { t: 'It is kept, with the status Terminated', fb: 'The object is removed.' }
        ],
        ok: 1, why: 'The recording looked for the pod after the delete and got NotFound. Use a Deployment for a service and a Job for batch work.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Where do you look first when a pod is stuck and you do not know why?',
        opts: [
          { t: 'The events at the end of `kubectl describe pod`', fb: '' },
          { t: 'The logs of the scheduler', fb: 'You may not have access, and the events already hold what the scheduler wrote.' },
          { t: 'The node, with `ssh`', fb: 'The events are one command away and usually enough.' },
          { t: 'The Docker daemon', fb: 'A cluster may not use Docker at all. This one used containerd.' }
        ],
        ok: 0, why: 'Events are written by the scheduler and the kubelet, and they hold the reason in words, as the recording showed for a pod that started and for four pods that did not.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'rec', title: 'Decision: how should the loader run?',
        scenario: 'The loader must run once a night, load a file, and end. A colleague wrote a Pod manifest for it and applies it by hand each evening. The node was restarted for an update last week, and one night nothing ran.',
        opts: [
          { t: 'Keep the Pod manifest, and ask the colleague to apply it before the night', d: 'Nothing changes.', lose: 'A bare pod has no controller. In the recording a deleted pod was never replaced, and a pod lost with its node is lost in the same way.' },
          { t: 'Run it as a Job, started by a CronJob', d: 'A controller owns the pods. It creates one on schedule, retries it when it fails, and records whether it succeeded.' },
          { t: 'Run it as a Deployment with one replica', d: 'The pod is replaced when it dies.', lose: 'A Deployment keeps a pod running. A job that ends would be started again and again.' }
        ],
        pick: 1,
        why: 'Batch work has an end, and Kubernetes has an object for that. Missions 3 and 7 show the Deployment and the Job. The loader is a Job.',
        when: 'Use a Deployment for something that must stay up, such as a service that others call.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the pod is gone and nothing replaced it', time: '07:30',
        alert: '**The nightly check did not run.** The pod that runs it is not in `kubectl get pods`. The node was drained for a kernel update at 02:00.',
        clues: ['The check is a Pod manifest that somebody applied last week', '`kubectl get events` shows the node being drained', 'No Deployment, Job or CronJob mentions the check'],
        opts: [
          { t: 'Move the check into a CronJob, so that a controller creates its pods', fb: '' },
          { t: 'Apply the Pod manifest again and write a reminder', fb: 'The same thing will happen at the next drain.' },
          { t: 'Pin the pod to the node with a node selector', fb: 'A pod on one node is lost when that node is lost.' },
          { t: 'Increase the restart count of the container', fb: 'The container did not fail. The pod was removed.' }
        ],
        best: 0,
        why: 'A drain evicts pods, and only pods that have a controller come back on another node. A bare pod is just removed. In the recording a deleted pod did not return.',
        checks: [
          ['Read the owner', '`kubectl get pod POD -o jsonpath="{.metadata.ownerReferences}"` is empty for a bare pod.'],
          ['Read the events', 'The drain and the eviction are in `kubectl get events`.'],
          ['Move the work', 'A Job for work that ends, a Deployment for work that stays up.'],
          ['Check what else is bare', '`kubectl get pods` with no owner is a list of things that will not come back.']
        ],
        tell: 'The check did not run because it was a bare Pod. When the node was drained, the pod was evicted and nothing recreated it. I moved the check into a CronJob, so the cluster now creates its pods itself, and I listed the other pods that have no owner.',
        prevent: ['Run work through a **Deployment, a Job or a CronJob**', 'List pods with **no owner** now and then', 'Test a **node drain** before relying on a workload']
      }),

      B.qa({
        id: 'qa-k8s', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'What is Kubernetes, and what problem does it solve?',
        pts: ['Runs containers on a group of machines', 'You describe what you want, and controllers make it so', 'Places pods on nodes, restarts them, replaces them, rolls out new versions', 'Gives them names, storage, configuration and access rules'],
        short: 'Kubernetes runs containers on a group of machines and keeps them running the way you described. You write manifests that say what you want, send them to the API server, and controllers compare that with what exists and correct the difference. The scheduler places pods on nodes, the kubelet runs them, and the cluster restarts and replaces them, rolls out new versions, gives them stable names with Services, and attaches storage and configuration. For a data engineer it is where the jobs run: I ran a pod, a Deployment, a StatefulSet with Postgres, and Jobs on a real cluster in this course. It does not make the application itself reliable. It makes the running of it repeatable.',
        fu: [['What is the control plane?', 'The API server, etcd, the scheduler and the controllers. The nodes run the pods.'], ['Is a managed cluster different?', 'The cloud runs the control plane for you. Pods, Services and Jobs behave the same. From documentation.']],
        trap: 'Describing Kubernetes as "Docker for many machines". Docker runs a container. Kubernetes keeps a state that you describe.',
        real: 'Say what you ran on a cluster, and who ran the cluster.'
      }),

      B.qa({
        id: 'qa-pod', t: 1, tag: 'Kubernetes', secs: 60,
        q: 'What is a pod, and why not just run a container?',
        pts: ['One or more containers that share a network address and volumes', 'The unit that is scheduled onto a node', 'A pod has a status, events, and an IP address', 'A bare pod has no controller, so nothing replaces it'],
        short: 'A pod is the smallest thing that Kubernetes schedules: one or more containers that start and stop together and share a network address and volumes. Kubernetes places a pod on one node, gives it an address, and records its status and events. Most pods hold one container. I would not create a bare pod for real work, because it has no controller: in the recording I deleted one and nothing replaced it. A Deployment or a Job creates and replaces pods for me. The pod I applied went through ' + PH.seen.join(', ') + ' and ended as ' + POD.phase + '.',
        fu: [['When do you put two containers in one pod?', 'When they must share the same address or files, for example a main container and a helper that ships its logs. From documentation.'], ['What is the QoS class of the pod you ran?', POD.qos + ', because it asked for no CPU or memory.']],
        trap: 'Calling a pod a container, or running important work as a bare pod.',
        real: 'Say how you ran jobs on a cluster.'
      }),

      B.qa({
        id: 'qa-declarative', t: 1, tag: 'Kubernetes', secs: 60,
        q: 'What does "declarative" mean in Kubernetes, and what is a controller?',
        pts: ['You describe the state that you want, not the steps', 'The API server stores it', 'A controller compares wanted and actual state and acts', 'That is why a deleted pod of a Deployment comes back'],
        short: 'You describe the state that you want, in a manifest, and not the steps to get there. The API server stores it. A controller is a loop that watches the objects of one kind, compares what you want with what exists, and acts on the difference. For a Deployment that means: if there are fewer pods than the wish, create one. That is why a deleted pod of a Deployment comes back, and why the one pod I applied on its own did not: no controller owned it. The same idea covers rollouts, Jobs and scaling.',
        fu: [['What is the difference between `apply` and `create`?', '`create` fails when the object exists. `apply` creates it or updates it to match the file. From documentation.'], ['What does a scheduler do in this model?', 'It is a controller for one decision: which node a pod runs on.']],
        trap: 'Describing Kubernetes as running commands in order.',
        real: 'Say what you changed by editing a manifest, and what happened.'
      }),

      B.qa({
        id: 'qa-vsdocker', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'How is running a job on Kubernetes different from running it with docker run?',
        pts: ['A controller owns it and can retry or replace it', 'It runs on a node that the scheduler picked', 'Settings, secrets and storage are objects that it refers to', 'Stopping gives SIGTERM, a grace period, then SIGKILL, as in Docker'],
        short: 'With `docker run` I start a container on one machine and I am the one who restarts it. On Kubernetes I describe the job as a Job, and a controller creates the pod, retries it, and records the result. The scheduler picks the node, so my job must not depend on the machine. Settings come from ConfigMaps and Secrets, storage from claims, and the name of another service from a Service. The mechanics inside the pod are the same as in Docker: the same image, the same exit codes, and the same stop sequence, SIGTERM and then SIGKILL after a grace period of 30 seconds by default.',
        fu: [['Can you use the same image?', 'Yes. The recorder built the loader image with Docker and copied it into the cluster.'], ['What do you give up?', 'Simplicity. There are many more objects, and you debug through the API and not on the machine.']],
        trap: 'Assuming that the node is stable, or that a file on it will be there next time.',
        real: 'Say what you moved from Docker or Compose to a cluster.'
      }),

      B.cmp({
        id: 'm1-parts', t: 3, src: 'docs', title: 'The parts of a cluster, one line each',
        say: 'A fuller list than the picture at the start. Press Next.',
        cols: ['Part', 'Runs on', 'Its job'],
        hl: 0,
        rows: [
          ['kube-apiserver', 'Control plane', 'The only front door. It checks, stores and serves every object. Everything else talks to it.'],
          ['etcd', 'Control plane', 'A database of all objects. Lose it without a backup and the cluster forgets what it ran.'],
          ['kube-scheduler', 'Control plane', 'Picks a node for each pod that has none, from requests, taints, affinity and free room.'],
          ['kube-controller-manager', 'Control plane', 'Runs the controllers: Deployment, ReplicaSet, Job, endpoints, node health and more.'],
          ['kubelet', 'Every node', 'Makes the pods of its node real: calls the runtime, runs probes, reports status.'],
          ['kube-proxy', 'Every node', 'Programs the rules that turn a Service address into a pod address.'],
          ['container runtime', 'Every node', 'Pulls images and runs containers (containerd in this recording).'],
          ['CoreDNS', 'As pods', 'Answers the names of Services and pods inside the cluster.']
        ],
        steps: [
          { upto: 4, say: 'The first four make the control plane. On a managed cluster (EKS, GKE, AKS) the provider runs them, and you never see their machines.' },
          { upto: 8, say: 'The last four run on or next to your nodes. k3s, the cluster of the recording, packs the control plane into one process, so the layout differs. The roles are the same. This table is from documentation.' }
        ]
      }),

      B.qa({
        id: 'qa-etcd', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What is etcd, and what happens if you lose it?',
        pts: ['A consistent key-value store that holds every object of the cluster', 'Only the API server talks to it', 'Running pods keep running without it, but nothing can change', 'Back it up, or use a managed control plane that does'],
        short: 'etcd is the database of the cluster. Every object that you create, from a Deployment to a Secret, is stored in it, and only the API server reads and writes it. If it is gone and there is no backup, the cluster has forgotten what it should run: the containers that are already running continue on their nodes, but nothing can be changed, rescheduled or repaired through the API. That is why etcd is backed up and run in groups of three or five, and why a managed cluster, where the provider does this, saves you real work. It is also why a ConfigMap or Secret is limited to 1 MiB.',
        fu: [['Why three or five members?', 'It uses a majority vote, so it survives the loss of one or two members. From documentation.'], ['Does your pipeline data live in etcd?', 'No. Only the objects. Your data is on volumes and in your databases.']],
        trap: 'Saying that etcd stores the data of your applications.',
        real: 'Say how the cluster that you use is backed up, or who does it.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Cluster Reader', color: '#A5F3FC',
        pts: [
          '`kubectl apply` sends a **manifest** to the **API server**. The scheduler picks a node and the **kubelet** runs the pod.',
          'The pod went through **' + PH.seen.join(', then ') + '**. Its events are Scheduled, Pulled, Created and Started.',
          '`get`, `describe` and `logs` are the three commands that you use all day.',
          'A **label** is a key and a value. A **selector** finds objects with it.',
          'A **bare pod** was not replaced after a delete. Use a Deployment or a Job.'
        ],
        lines: [
          'I can apply a manifest and read what the cluster says.',
          'I know which part does which job.',
          'I never run important work as a bare pod.'
        ]
      })
    ]
  });
})();
