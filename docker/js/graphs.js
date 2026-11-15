/* Diagram specs for the Docker course. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. From a Dockerfile to a running container                          */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1000, h: 400,
    label: 'A Dockerfile and a build context are turned into an image, one layer for each instruction. An image can be pushed to a registry and pulled from it. Running an image starts a container, which can use a volume for data and a network for names and ports.',
    nodes: [
      { id: 'df', x: 0, y: 150, w: 190, h: 80, t: 'Dockerfile', s: 'and the build context', c: 'src' },
      { id: 'build', x: 270, y: 150, w: 190, h: 80, t: 'Build', s: 'a layer for each step', c: 'ing' },
      { id: 'image', x: 540, y: 150, w: 190, h: 80, t: 'Image', s: 'read-only layers', c: 'stg' },
      { id: 'reg', x: 540, y: 10, w: 190, h: 80, t: 'Registry', s: 'tags and digests', c: 'sf' },
      { id: 'run', x: 810, y: 150, w: 190, h: 80, t: 'Container', s: 'one isolated process', c: 'mart' },
      { id: 'vol', x: 810, y: 300, w: 190, h: 80, t: 'Volume', s: 'data that stays', c: 'raw' },
      { id: 'net', x: 540, y: 300, w: 190, h: 80, t: 'Network', s: 'names and ports', c: 'con' }
    ],
    edges: [
      { id: 'e1', a: 'df', b: 'build', d: 'M190 190 H270', n: 1, nb: true },
      { id: 'e2', a: 'build', b: 'image', d: 'M460 190 H540', n: 2, nb: true },
      { id: 'e3', a: 'image', b: 'reg', d: 'M635 150 V90', n: 3, bx: 635, by: 120 },
      { id: 'e4', a: 'image', b: 'run', d: 'M730 190 H810', n: 4, nb: true },
      { id: 'e5', a: 'run', b: 'vol', d: 'M905 230 V300', n: 5, bx: 905, by: 265 },
      { id: 'e6', a: 'run', b: 'net', d: 'M840 230 C840 330 790 340 730 340', n: 6, bx: 815, by: 318 }
    ],
    tags: [
      { id: 'tg_push', x: 690, y: 44, t: 'push and pull', c: 'air' },
      { id: 'tg_layer', x: 280, y: 250, t: 'unchanged steps come from the cache', c: 'raw' },
      { id: 'tg_gone', x: 560, y: 246, t: 'rm keeps the image', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. What a container is: a process on the host kernel                 */
  /* ------------------------------------------------------------------ */
  S.engine = {
    w: 1000, h: 400,
    label: 'The docker command talks to the Docker Engine. The engine asks containerd, which asks runc, which starts your process with its own process list, file system and network. Every container uses the one kernel of the host.',
    nodes: [
      { id: 'cli', x: 0, y: 40, w: 170, h: 80, t: 'docker', s: 'the command', c: 'src' },
      { id: 'dmn', x: 205, y: 40, w: 180, h: 80, t: 'Docker Engine', s: 'the daemon', c: 'stg' },
      { id: 'ctd', x: 420, y: 40, w: 180, h: 80, t: 'containerd', s: 'images, lifecycle', c: 'ing' },
      { id: 'runc', x: 635, y: 40, w: 160, h: 80, t: 'runc', s: 'sets it up', c: 'mart' },
      { id: 'proc', x: 830, y: 40, w: 170, h: 80, t: 'Your process', s: 'PID 1 inside', c: 'air' },
      { id: 'kern', x: 0, y: 250, w: 1000, h: 100, t: 'The Linux kernel of the host', s: 'namespaces give each container its own view, cgroups limit memory and CPU, and every container shares this kernel', c: 'sf' }
    ],
    edges: [
      { id: 'e1', a: 'cli', b: 'dmn', d: 'M170 80 H205', n: 1, nb: true },
      { id: 'e2', a: 'dmn', b: 'ctd', d: 'M385 80 H420', n: 2, nb: true },
      { id: 'e3', a: 'ctd', b: 'runc', d: 'M600 80 H635', n: 3, nb: true },
      { id: 'e4', a: 'runc', b: 'proc', d: 'M795 80 H830', n: 4, nb: true },
      { id: 'e5', a: 'proc', b: 'kern', d: 'M915 120 V250', n: 5, bx: 915, by: 185 }
    ],
    tags: [
      { id: 'tg_same', x: 380, y: 190, t: 'no second kernel, no guest operating system', c: 'raw' },
      { id: 'tg_vm', x: 40, y: 190, t: 'a virtual machine would have one', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. Layers and the build cache                                        */
  /* ------------------------------------------------------------------ */
  S.layers = {
    w: 1000, h: 400,
    label: 'The Dockerfile of the loader builds five layers. A step that did not change is taken from the cache. A step that changed runs again, and so does every step after it. A container adds a writable layer on top.',
    nodes: [
      { id: 'l1', x: 0, y: 130, w: 150, h: 90, t: 'FROM', s: 'slim base', c: 'src' },
      { id: 'l2', x: 170, y: 130, w: 150, h: 90, t: 'WORKDIR', s: '/app', c: 'stg' },
      { id: 'l3', x: 340, y: 130, w: 150, h: 90, t: 'COPY', s: 'package list', c: 'ing' },
      { id: 'l4', x: 510, y: 130, w: 150, h: 90, t: 'RUN', s: 'pip install', c: 'mart' },
      { id: 'l5', x: 680, y: 130, w: 150, h: 90, t: 'COPY', s: 'the code', c: 'ing' },
      { id: 'cl', x: 850, y: 130, w: 150, h: 90, t: 'Container', s: 'writable layer', c: 'air' }
    ],
    edges: [
      { id: 'e1', a: 'l1', b: 'l2', d: 'M150 175 H170', n: 1, nb: true },
      { id: 'e2', a: 'l2', b: 'l3', d: 'M320 175 H340', n: 2, nb: true },
      { id: 'e3', a: 'l3', b: 'l4', d: 'M490 175 H510', n: 3, nb: true },
      { id: 'e4', a: 'l4', b: 'l5', d: 'M660 175 H680', n: 4, nb: true },
      { id: 'e5', a: 'l5', b: 'cl', d: 'M830 175 H850', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_cache', x: 20, y: 270, t: 'unchanged: taken from the cache', c: 'raw' },
      { id: 'tg_again', x: 420, y: 270, t: 'changed: runs again, and so does everything below', c: 'air' },
      { id: 'tg_ro', x: 60, y: 60, t: 'image layers are read-only and shared', c: 'sf' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. Where a container writes                                          */
  /* ------------------------------------------------------------------ */
  S.data = {
    w: 1000, h: 400,
    label: 'A container writes into its own writable layer, into a named volume managed by Docker, into a folder of the host that was bind mounted, or into memory with tmpfs. Only the writable layer and tmpfs disappear with the container.',
    nodes: [
      { id: 'cont', x: 0, y: 150, w: 200, h: 100, t: 'Container', s: 'Postgres writes here', c: 'mart' },
      { id: 'wl', x: 380, y: 10, w: 230, h: 66, t: 'Writable layer', s: 'part of the container', c: 'raw' },
      { id: 'vol', x: 380, y: 100, w: 230, h: 66, t: 'Named volume', s: 'managed by Docker', c: 'stg' },
      { id: 'bind', x: 380, y: 190, w: 230, h: 66, t: 'Bind mount', s: 'a folder of the host', c: 'ing' },
      { id: 'tmp', x: 380, y: 280, w: 230, h: 66, t: 'tmpfs', s: 'memory only', c: 'sf' }
    ],
    edges: [
      { id: 'e1', a: 'cont', b: 'wl', d: 'M200 190 C290 190 290 43 380 43', n: 1, nb: true },
      { id: 'e2', a: 'cont', b: 'vol', d: 'M200 205 C290 205 290 133 380 133', n: 2, nb: true },
      { id: 'e3', a: 'cont', b: 'bind', d: 'M200 220 C290 220 290 223 380 223', n: 3, nb: true },
      { id: 'e4', a: 'cont', b: 'tmp', d: 'M200 235 C290 235 290 313 380 313', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_wl', x: 640, y: 28, t: 'gone with docker rm', c: 'qual' },
      { id: 'tg_vol', x: 640, y: 118, t: 'stays until docker volume rm', c: 'raw' },
      { id: 'tg_bind', x: 640, y: 208, t: 'stays, owned by the container user', c: 'raw' },
      { id: 'tg_tmp', x: 640, y: 298, t: 'gone when the container stops', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Names and ports                                                   */
  /* ------------------------------------------------------------------ */
  S.net = {
    w: 1000, h: 400,
    label: 'On a network that you create, a container asks the embedded DNS server of Docker for the address of another container by its name, and connects to it. localhost inside a container means that container. A published port makes a container reachable from the host.',
    nodes: [
      { id: 'loader', x: 0, y: 40, w: 190, h: 80, t: 'loader', s: 'a container', c: 'mart' },
      { id: 'dns', x: 270, y: 270, w: 200, h: 80, t: 'Docker DNS', s: '127.0.0.11', c: 'sf' },
      { id: 'db', x: 540, y: 40, w: 190, h: 80, t: 'db', s: 'Postgres, port 5432', c: 'stg' },
      { id: 'host', x: 810, y: 160, w: 190, h: 80, t: 'Your machine', s: 'psql, a BI tool', c: 'src' }
    ],
    edges: [
      { id: 'e1', a: 'loader', b: 'dns', d: 'M60 120 C60 250 130 305 270 305', n: 1, bx: 105, by: 235 },
      { id: 'e2', a: 'dns', b: 'loader', d: 'M270 325 C150 335 135 250 135 120', n: 2, bx: 190, by: 300, k: 'ctl' },
      { id: 'e3', a: 'loader', b: 'db', d: 'M190 80 H540', n: 3, bx: 365, by: 80 },
      { id: 'e4', a: 'host', b: 'db', d: 'M810 200 C770 200 770 100 730 100', n: 4, bx: 770, by: 150 }
    ],
    tags: [
      { id: 'tg_name', x: 280, y: 340, t: 'only on a network you created', c: 'raw' },
      { id: 'tg_local', x: 10, y: 140, t: 'localhost is this container', c: 'qual' },
      { id: 'tg_port', x: 700, y: 262, t: 'reachable only with -p', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. A Compose project                                                 */
  /* ------------------------------------------------------------------ */
  S.compose = {
    w: 1000, h: 400,
    label: 'One compose.yaml describes a project. Compose creates a network and a volume, starts the db service, waits until its healthcheck passes, and only then starts the loader.',
    groups: [{ id: 'proj', x: 290, y: 30, w: 700, h: 350, c: 'src', t: 'One Compose project, one network' }],
    nodes: [
      { id: 'file', x: 0, y: 150, w: 190, h: 90, t: 'compose.yaml', s: 'services, volumes', c: 'ing' },
      { id: 'db', x: 340, y: 70, w: 200, h: 90, t: 'db', s: 'postgres:16-alpine', c: 'stg' },
      { id: 'vol', x: 760, y: 70, w: 190, h: 90, t: 'Volume pgdata', s: 'survives down', c: 'raw' },
      { id: 'loader', x: 340, y: 260, w: 200, h: 90, t: 'loader', s: 'build: ./app', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'file', b: 'db', d: 'M190 180 C265 180 265 115 340 115', n: 1, nb: true },
      { id: 'e2', a: 'db', b: 'vol', d: 'M540 115 H760', n: 2, bx: 650, by: 115 },
      { id: 'e3', a: 'db', b: 'loader', d: 'M440 160 V260', n: 3, bx: 440, by: 210, k: 'ctl' },
      { id: 'e4', a: 'file', b: 'loader', d: 'M190 210 C265 210 265 305 340 305', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_health', x: 470, y: 192, t: 'starts when db is healthy', c: 'air' },
      { id: 'tg_dns', x: 600, y: 300, t: 'the loader finds db by its name', c: 'raw' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. docker stop                                                       */
  /* ------------------------------------------------------------------ */
  S.stop = {
    w: 1000, h: 400,
    label: 'docker stop sends SIGTERM to the process with ID 1 in the container. A process that handles it can finish its work and exit. When the grace period ends, the engine sends SIGKILL.',
    nodes: [
      { id: 'you', x: 0, y: 150, w: 170, h: 80, t: 'docker stop', s: 'or a scheduler', c: 'src' },
      { id: 'eng', x: 220, y: 150, w: 190, h: 80, t: 'Docker Engine', s: 'sends the signal', c: 'stg' },
      { id: 'pid1', x: 470, y: 150, w: 200, h: 80, t: 'PID 1', s: 'your job, or a shell', c: 'mart' },
      { id: 'ok', x: 760, y: 40, w: 240, h: 80, t: 'Handler runs', s: 'flush, close, exit 0', c: 'qual' },
      { id: 'kill', x: 760, y: 270, w: 240, h: 80, t: 'SIGKILL', s: 'exit code 137', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'you', b: 'eng', d: 'M170 190 H220', n: 1, nb: true },
      { id: 'e2', a: 'eng', b: 'pid1', d: 'M410 190 H470', n: 2, bx: 440, by: 190, k: 'ctl' },
      { id: 'e3', a: 'pid1', b: 'ok', d: 'M670 170 C715 170 715 80 760 80', n: 3, bx: 715, by: 125 },
      { id: 'e4', a: 'eng', b: 'kill', d: 'M315 230 V310 H760', n: 4, bx: 560, by: 310, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_term', x: 395, y: 112, t: 'SIGTERM', c: 'air' },
      { id: 'tg_grace', x: 300, y: 335, t: 'grace period: 10 s by default', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. From a laptop to where the job runs                               */
  /* ------------------------------------------------------------------ */
  S.ship = {
    w: 1000, h: 400,
    label: 'An image is built on a laptop or in CI and pushed to a registry. The place that runs the job, such as a scheduler task, a managed container service or Kubernetes, pulls the image by its tag or digest and starts a container.',
    nodes: [
      { id: 'dev', x: 0, y: 160, w: 160, h: 80, t: 'Laptop', s: 'docker build', c: 'src' },
      { id: 'ci', x: 200, y: 160, w: 160, h: 80, t: 'CI', s: 'build and test', c: 'ci' },
      { id: 'reg', x: 410, y: 160, w: 190, h: 80, t: 'Registry', s: 'one name, many tags', c: 'sf' },
      { id: 'sch', x: 760, y: 30, w: 240, h: 80, t: 'Scheduler task', s: 'for example Airflow', c: 'air' },
      { id: 'svc', x: 760, y: 160, w: 240, h: 80, t: 'Managed service', s: 'ECS, Cloud Run, ACI', c: 'mart' },
      { id: 'k8s', x: 760, y: 290, w: 240, h: 80, t: 'Kubernetes', s: 'the next course', c: 'stg' }
    ],
    edges: [
      { id: 'e1', a: 'dev', b: 'ci', d: 'M160 200 H200', n: 1, nb: true },
      { id: 'e2', a: 'ci', b: 'reg', d: 'M360 200 H410', n: 2, bx: 385, by: 200 },
      { id: 'e3', a: 'reg', b: 'sch', d: 'M600 180 C690 180 690 70 760 70', n: 3, bx: 690, by: 125 },
      { id: 'e4', a: 'reg', b: 'svc', d: 'M600 200 H760', n: 4, nb: true },
      { id: 'e5', a: 'reg', b: 'k8s', d: 'M600 220 C690 220 690 330 760 330', n: 5, bx: 690, by: 275 }
    ],
    tags: [
      { id: 'tg_pull', x: 620, y: 112, t: 'pull by tag or by digest', c: 'air' }
    ]
  };
})();
