/* Diagram specs for the Kubernetes course. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. From kubectl apply to a running container */
  S.master = {
    w: 1000, h: 400,
    label: 'kubectl sends a manifest to the API server, which stores it in etcd. The controllers create the pods, the scheduler picks a node for each one, and the kubelet on that node starts the containers through containerd.',
    nodes: [
      { id: 'you', x: 0, y: 150, w: 150, h: 80, t: 'kubectl', s: 'your command', c: 'src' },
      { id: 'api', x: 190, y: 150, w: 170, h: 80, t: 'API server', s: 'the front door', c: 'stg' },
      { id: 'etcd', x: 190, y: 300, w: 170, h: 70, t: 'etcd', s: 'the stored state', c: 'raw' },
      { id: 'ctrl', x: 410, y: 20, w: 170, h: 80, t: 'Controllers', s: 'make it so', c: 'mart' },
      { id: 'sch', x: 410, y: 150, w: 170, h: 80, t: 'Scheduler', s: 'picks a node', c: 'ing' },
      { id: 'kub', x: 620, y: 150, w: 160, h: 80, t: 'kubelet', s: 'on the node', c: 'air' },
      { id: 'pod', x: 820, y: 150, w: 180, h: 80, t: 'Pod', s: 'containers run', c: 'con' }
    ],
    edges: [
      { id: 'e1', a: 'you', b: 'api', d: 'M150 190 H190', n: 1, nb: true },
      { id: 'e2', a: 'api', b: 'etcd', d: 'M275 230 V300', n: 2, bx: 275, by: 265 },
      { id: 'e3', a: 'ctrl', b: 'api', d: 'M410 60 C330 60 290 100 280 150', n: 3, bx: 340, by: 85 },
      { id: 'e4', a: 'api', b: 'sch', d: 'M360 190 H410', n: 4, nb: true },
      { id: 'e5', a: 'sch', b: 'kub', d: 'M580 190 H620', n: 5, nb: true },
      { id: 'e6', a: 'kub', b: 'pod', d: 'M780 190 H820', n: 6, nb: true }
    ],
    tags: [
      { id: 'tg_state', x: 20, y: 300, t: 'everything is an object in the API', c: 'sf' },
      { id: 'tg_loop', x: 600, y: 60, t: 'a controller watches and corrects', c: 'air' },
      { id: 'tg_node', x: 590, y: 250, t: 'the kubelet runs what is assigned to its node', c: 'raw' }
    ]
  };

  /* 2. Deployment, ReplicaSet, pods and a Service */
  S.objects = {
    w: 1000, h: 400,
    label: 'A Deployment owns a ReplicaSet, and the ReplicaSet owns the pods. A Service finds the same pods by their labels, and sends traffic to the ones that are ready.',
    nodes: [
      { id: 'dep', x: 0, y: 150, w: 180, h: 90, t: 'Deployment', s: 'web, 3 replicas', c: 'mart' },
      { id: 'rs', x: 240, y: 150, w: 180, h: 90, t: 'ReplicaSet', s: 'keeps 3 pods', c: 'ing' },
      { id: 'p1', x: 490, y: 30, w: 170, h: 70, t: 'Pod', s: 'app=web', c: 'con' },
      { id: 'p2', x: 490, y: 160, w: 170, h: 70, t: 'Pod', s: 'app=web', c: 'con' },
      { id: 'p3', x: 490, y: 290, w: 170, h: 70, t: 'Pod', s: 'app=web', c: 'con' },
      { id: 'svc', x: 800, y: 150, w: 200, h: 90, t: 'Service', s: 'selects app=web', c: 'sf' }
    ],
    edges: [
      { id: 'e1', a: 'dep', b: 'rs', d: 'M180 195 H240', n: 1, nb: true },
      { id: 'e2', a: 'rs', b: 'p1', d: 'M420 180 C455 180 455 65 490 65', n: 2, bx: 455, by: 120 },
      { id: 'e3', a: 'rs', b: 'p2', d: 'M420 195 H490', n: 2, nb: true },
      { id: 'e4', a: 'rs', b: 'p3', d: 'M420 210 C455 210 455 325 490 325', n: 2, nb: true },
      { id: 'e5', a: 'svc', b: 'p1', d: 'M800 180 C730 180 730 65 660 65', n: 3, bx: 735, by: 120 },
      { id: 'e6', a: 'svc', b: 'p2', d: 'M800 195 H660', n: 3, nb: true },
      { id: 'e7', a: 'svc', b: 'p3', d: 'M800 210 C730 210 730 325 660 325', n: 3, nb: true }
    ],
    tags: [
      { id: 'tg_own', x: 190, y: 270, t: 'owner: the Deployment makes the ReplicaSet', c: 'raw' },
      { id: 'tg_label', x: 640, y: 365, t: 'a label ties pods to a Service', c: 'air' }
    ]
  };

  /* 3. The life of a pod, and the ways it fails */
  S.podlife = {
    w: 1000, h: 400,
    label: 'A pod is Pending until a node is chosen, then ContainerCreating while the image and the volumes are prepared, then Running. A pod can end as Succeeded or Failed. It can also stall: Pending for ever when no node fits, ImagePullBackOff when the image cannot be pulled, CrashLoopBackOff when the container keeps exiting, or be killed for memory.',
    nodes: [
      { id: 'pend', x: 0, y: 40, w: 190, h: 80, t: 'Pending', s: 'no node yet', c: 'src' },
      { id: 'cre', x: 270, y: 40, w: 190, h: 80, t: 'Creating', s: 'image and volumes', c: 'ing' },
      { id: 'run', x: 540, y: 40, w: 190, h: 80, t: 'Running', s: 'the process runs', c: 'mart' },
      { id: 'done', x: 810, y: 40, w: 190, h: 80, t: 'Succeeded', s: 'or Failed', c: 'qual' },
      { id: 'nofit', x: 0, y: 250, w: 190, h: 80, t: 'Pending', s: 'for ever: no node fits', c: 'mon' },
      { id: 'pull', x: 250, y: 250, w: 230, h: 80, t: 'ImagePullBackOff', s: 'wrong name or tag', c: 'mon' },
      { id: 'loop', x: 520, y: 250, w: 230, h: 80, t: 'CrashLoopBackOff', s: 'exits, waits, retries', c: 'mon' },
      { id: 'oom', x: 810, y: 250, w: 190, h: 80, t: 'OOMKilled', s: 'over its memory limit', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'pend', b: 'cre', d: 'M190 80 H270', n: 1, nb: true },
      { id: 'e2', a: 'cre', b: 'run', d: 'M460 80 H540', n: 2, nb: true },
      { id: 'e3', a: 'run', b: 'done', d: 'M730 80 H810', n: 3, nb: true },
      { id: 'e4', a: 'pend', b: 'nofit', d: 'M95 120 V250', n: 4, bx: 95, by: 185 },
      { id: 'e5', a: 'cre', b: 'pull', d: 'M365 120 V250', n: 5, bx: 365, by: 185 },
      { id: 'e6', a: 'run', b: 'loop', d: 'M635 120 V250', n: 6, bx: 635, by: 185 },
      { id: 'e7', a: 'run', b: 'oom', d: 'M730 110 C790 150 850 190 905 250', n: 7, bx: 820, by: 180 }
    ],
    tags: [
      { id: 'tg_k', x: 20, y: 360, t: 'kubectl describe pod shows the events that explain it', c: 'sf' }
    ]
  };

  /* 4. A rolling update */
  S.rollout = {
    w: 1000, h: 400,
    label: 'A rolling update starts pods of the new ReplicaSet and stops pods of the old one, a few at a time. The Service sends traffic to the pods that are ready, so a new pod that never becomes ready stops the update, while the old pods keep serving.',
    nodes: [
      { id: 'rs1', x: 60, y: 40, w: 300, h: 100, t: 'ReplicaSet, old version', s: 'version 1 of the image', c: 'raw' },
      { id: 'rs2', x: 60, y: 250, w: 300, h: 100, t: 'ReplicaSet, new version', s: 'version 2 of the image', c: 'mart' },
      { id: 'svc', x: 640, y: 145, w: 300, h: 100, t: 'Service web', s: 'ready pods only', c: 'sf' }
    ],
    edges: [
      { id: 'e1', a: 'rs1', b: 'svc', d: 'M360 90 C500 90 500 170 640 170', n: 1, bx: 500, by: 130 },
      { id: 'e2', a: 'rs2', b: 'svc', d: 'M360 300 C500 300 500 220 640 220', n: 2, bx: 500, by: 260 }
    ],
    tags: [
      { id: 't0', x: 400, y: 20, t: 'old: 3 pods, new: 0 pods', c: 'raw' },
      { id: 't1', x: 400, y: 20, t: 'old: 3, new: 1 (one extra, not yet ready)', c: 'air' },
      { id: 't2', x: 400, y: 20, t: 'old: 2, new: 1 (the new pod is ready)', c: 'air' },
      { id: 't3', x: 400, y: 20, t: 'old: 0, new: 3, done', c: 'qual' },
      { id: 't4', x: 400, y: 20, t: 'new pod stuck: old pods keep serving', c: 'mon' }
    ]
  };

  /* 5. A Service and its names */
  S.svc = {
    w: 1000, h: 400,
    label: 'A pod asks the cluster DNS for the name of a Service and gets the stable address of the Service. The Service forwards the traffic to the pods that its selector matches and that are ready, which are listed in its endpoints.',
    nodes: [
      { id: 'cli', x: 0, y: 150, w: 170, h: 80, t: 'Client pod', s: 'wants "web"', c: 'src' },
      { id: 'dns', x: 250, y: 20, w: 190, h: 80, t: 'Cluster DNS', s: 'CoreDNS', c: 'sf' },
      { id: 'svc', x: 250, y: 150, w: 190, h: 80, t: 'Service web', s: 'a stable address', c: 'mart' },
      { id: 'eps', x: 520, y: 150, w: 170, h: 80, t: 'Endpoints', s: 'ready pods', c: 'ing' },
      { id: 'p1', x: 790, y: 40, w: 190, h: 70, t: 'Pod', s: 'port 8080', c: 'con' },
      { id: 'p2', x: 790, y: 165, w: 190, h: 70, t: 'Pod', s: 'port 8080', c: 'con' },
      { id: 'p3', x: 790, y: 290, w: 190, h: 70, t: 'Pod', s: 'port 8080', c: 'con' }
    ],
    edges: [
      { id: 'e1', a: 'cli', b: 'dns', d: 'M100 150 C100 70 180 60 250 60', n: 1, bx: 150, by: 90 },
      { id: 'e2', a: 'cli', b: 'svc', d: 'M170 190 H250', n: 2, nb: true },
      { id: 'e3', a: 'svc', b: 'eps', d: 'M440 190 H520', n: 3, nb: true },
      { id: 'e4', a: 'eps', b: 'p1', d: 'M690 170 C740 170 740 75 790 75', n: 4, bx: 740, by: 120 },
      { id: 'e5', a: 'eps', b: 'p2', d: 'M690 190 H790', n: 4, nb: true },
      { id: 'e6', a: 'eps', b: 'p3', d: 'M690 210 C740 210 740 325 790 325', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_none', x: 480, y: 255, t: 'no ready pod: the list is empty', c: 'qual' },
      { id: 'tg_port', x: 640, y: 365, t: 'targetPort must be the port the pod listens on', c: 'air' }
    ]
  };

  /* 6. A database with its own volume */
  S.storage = {
    w: 1000, h: 400,
    label: 'A StatefulSet creates the pod pg-0 and a PersistentVolumeClaim for it. The claim is bound to a PersistentVolume, which is a folder on a disk of the node. When the pod is deleted, the StatefulSet makes a new pg-0 and attaches the same claim.',
    nodes: [
      { id: 'sts', x: 0, y: 150, w: 170, h: 90, t: 'StatefulSet', s: 'pg, 1 replica', c: 'mart' },
      { id: 'pod', x: 210, y: 150, w: 170, h: 90, t: 'Pod pg-0', s: 'Postgres', c: 'con' },
      { id: 'pvc', x: 420, y: 150, w: 180, h: 90, t: 'PVC', s: 'data-pg-0', c: 'ing' },
      { id: 'pv', x: 640, y: 150, w: 160, h: 90, t: 'PV', s: 'the volume', c: 'stg' },
      { id: 'disk', x: 840, y: 150, w: 160, h: 90, t: 'Node disk', s: 'a folder', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'sts', b: 'pod', d: 'M170 195 H210', n: 1, nb: true },
      { id: 'e2', a: 'pod', b: 'pvc', d: 'M380 195 H420', n: 2, nb: true },
      { id: 'e3', a: 'pvc', b: 'pv', d: 'M600 195 H640', n: 3, nb: true },
      { id: 'e4', a: 'pv', b: 'disk', d: 'M800 195 H840', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_pod', x: 150, y: 80, t: 'delete the pod: a new pg-0 gets the same claim', c: 'air' },
      { id: 'tg_pvc', x: 330, y: 290, t: 'delete the StatefulSet: the claim stays', c: 'raw' },
      { id: 'tg_rec', x: 420, y: 340, t: 'delete the claim: the volume goes with it', c: 'qual' }
    ]
  };

  /* 7. A CronJob, a Job and a pod */
  S.jobs = {
    w: 1000, h: 400,
    label: 'A CronJob creates a Job on a schedule. The Job creates a pod and counts how many pods have finished. If a pod fails, the Job starts another until the backoff limit is reached. A finished Job can be removed by the cluster after a time.',
    nodes: [
      { id: 'cron', x: 0, y: 150, w: 180, h: 90, t: 'CronJob', s: 'on a schedule', c: 'mon' },
      { id: 'job', x: 250, y: 150, w: 180, h: 90, t: 'Job', s: 'counts successes', c: 'mart' },
      { id: 'pod', x: 500, y: 150, w: 180, h: 90, t: 'Pod', s: 'runs the loader', c: 'con' },
      { id: 'pg', x: 780, y: 150, w: 200, h: 90, t: 'Postgres pg-0', s: 'the data', c: 'stg' }
    ],
    edges: [
      { id: 'e1', a: 'cron', b: 'job', d: 'M180 195 H250', n: 1, bx: 215, by: 195 },
      { id: 'e2', a: 'job', b: 'pod', d: 'M430 195 H500', n: 2, nb: true },
      { id: 'e3', a: 'pod', b: 'pg', d: 'M680 195 H780', n: 3, bx: 730, by: 195 },
      { id: 'e4', a: 'pod', b: 'job', d: 'M590 150 C590 70 340 70 340 150', n: 4, bx: 465, by: 85, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_retry', x: 330, y: 20, t: 'failed: the Job starts another pod, up to backoffLimit', c: 'qual' },
      { id: 'tg_ttl', x: 520, y: 290, t: 'ttlSecondsAfterFinished removes the Job', c: 'raw' }
    ]
  };

  /* 8. Probes and shutdown */
  S.shutdown = {
    w: 1000, h: 400,
    label: 'When a pod is deleted, the API server marks it, the endpoints stop listing it, and the kubelet sends SIGTERM to process 1 of each container. If the process has not exited when the grace period ends, the kubelet sends SIGKILL.',
    nodes: [
      { id: 'del', x: 0, y: 150, w: 170, h: 80, t: 'kubectl', s: 'delete a pod', c: 'src' },
      { id: 'api', x: 210, y: 150, w: 170, h: 80, t: 'API server', s: 'marks the pod', c: 'stg' },
      { id: 'eps', x: 210, y: 300, w: 170, h: 70, t: 'Endpoints', s: 'pod removed', c: 'ing' },
      { id: 'kub', x: 430, y: 150, w: 170, h: 80, t: 'kubelet', s: 'on the node', c: 'air' },
      { id: 'proc', x: 650, y: 150, w: 160, h: 80, t: 'PID 1', s: 'your process', c: 'mart' },
      { id: 'ok', x: 850, y: 40, w: 150, h: 80, t: 'Exit 0', s: 'handler ran', c: 'qual' },
      { id: 'kill', x: 850, y: 270, w: 150, h: 80, t: 'SIGKILL', s: 'exit 137', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'del', b: 'api', d: 'M170 190 H210', n: 1, nb: true },
      { id: 'e2', a: 'api', b: 'eps', d: 'M295 230 V300', n: 2, bx: 295, by: 265 },
      { id: 'e3', a: 'api', b: 'kub', d: 'M380 190 H430', n: 3, nb: true },
      { id: 'e4', a: 'kub', b: 'proc', d: 'M600 190 H650', n: 4, nb: true },
      { id: 'e5', a: 'proc', b: 'ok', d: 'M810 170 C830 170 830 80 850 80', n: 5, bx: 830, by: 125 },
      { id: 'e6', a: 'kub', b: 'kill', d: 'M515 230 V310 H850', n: 6, bx: 700, by: 310, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_term', x: 590, y: 112, t: 'SIGTERM', c: 'air' },
      { id: 'tg_grace', x: 420, y: 345, t: 'after terminationGracePeriodSeconds', c: 'qual' }
    ]
  };
})();
