/* Diagram specs for the Airflow tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them.
   Nodes of kind 'dag' show the state of a task (wait, run, ok, fail, skip, retry) when a step sets `status`. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The nightly job as a DAG                                          */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1000, h: 420,
    label: 'The Brewline nightly job as a DAG: wait for files, extract, load, transform and check, then publish. If a check fails an alert task runs. A cleanup task runs at the end whatever happened.',
    nodes: [
      { id: 'check', k: 'dag', x: 0, y: 60, w: 170, h: 66, t: 'wait_for_files', s: 'sensor', c: 'src' },
      { id: 'extract', k: 'dag', x: 205, y: 60, w: 170, h: 66, t: 'extract_orders', s: 'API to files', c: 'ing' },
      { id: 'load', k: 'dag', x: 410, y: 60, w: 170, h: 66, t: 'load_raw', s: 'files to a table', c: 'raw' },
      { id: 'xform', k: 'dag', x: 615, y: 60, w: 170, h: 66, t: 'transform', s: 'SQL models', c: 'stg' },
      { id: 'qual', k: 'dag', x: 820, y: 60, w: 170, h: 66, t: 'quality_checks', s: 'row counts', c: 'qual' },
      { id: 'pub', k: 'dag', x: 820, y: 250, w: 170, h: 66, t: 'publish', s: 'swap the table', c: 'mart' },
      { id: 'alert', k: 'dag', x: 615, y: 250, w: 170, h: 66, t: 'alert_team', s: 'only on failure', c: 'mon' },
      { id: 'clean', k: 'dag', x: 410, y: 250, w: 170, h: 66, t: 'cleanup', s: 'always runs', c: 'con' }
    ],
    edges: [
      { id: 'e1', a: 'check', b: 'extract', d: 'M170 93 H205', n: 1, nb: true },
      { id: 'e2', a: 'extract', b: 'load', d: 'M375 93 H410', n: 2, nb: true },
      { id: 'e3', a: 'load', b: 'xform', d: 'M580 93 H615', n: 3, nb: true },
      { id: 'e4', a: 'xform', b: 'qual', d: 'M785 93 H820', n: 4, nb: true },
      { id: 'e5', a: 'qual', b: 'pub', d: 'M905 126 V250', n: 5, bx: 905, by: 188 },
      { id: 'e6', a: 'qual', b: 'alert', d: V(850, 126, 735, 250), n: 6, bx: 800, by: 188 },
      { id: 'e7', a: 'pub', b: 'clean', d: 'M905 316 C905 392 495 392 495 316', n: 7, bx: 700, by: 389 },
      { id: 'e8', a: 'alert', b: 'clean', d: 'M615 283 H580', n: 8, nb: true }
    ],
    tags: [
      { id: 'tg_rule6', x: 470, y: 150, t: 'trigger_rule one_failed', c: 'mon' },
      { id: 'tg_rule8', x: 140, y: 266, t: 'trigger_rule all_done', c: 'con' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. The parts of an Airflow 3 deployment                              */
  /* ------------------------------------------------------------------ */
  S.arch = {
    w: 1000, h: 560,
    label: 'The parts of Airflow 3. The DAG processor reads DAG files from a bundle and stores serialized DAGs in the metadata database. The scheduler creates runs and hands ready tasks to its executor, which starts workers. Workers talk to the API server, not to the database. The API server serves the UI, the REST API and the execution API. The triggerer runs deferred waits.',
    nodes: [
      { id: 'bundle', x: 10, y: 60, w: 230, h: 70, t: 'DAG bundle', s: 'your DAG files: folder or git', c: 'src', k: 'chip' },
      { id: 'proc', x: 10, y: 190, w: 230, h: 90, t: 'DAG processor', s: 'parses files, stores DAGs', c: 'ing', k: 'chip' },
      { id: 'db', x: 390, y: 60, w: 220, h: 450, t: 'Metadata database', s: 'DAGs, runs, states, XCom', c: 'sf', k: 'layer' },
      { id: 'user', x: 720, y: 20, w: 240, h: 52, t: 'You', s: 'UI, CLI, REST calls, CI', c: 'qual', k: 'pill' },
      { id: 'api', x: 720, y: 118, w: 240, h: 84, t: 'API server', s: 'UI, REST, execution API', c: 'con', k: 'chip' },
      { id: 'sched', x: 720, y: 232, w: 240, h: 84, t: 'Scheduler + executor', s: 'makes runs, picks ready tasks', c: 'air', k: 'chip' },
      { id: 'work', x: 720, y: 346, w: 240, h: 84, t: 'Workers', s: 'run your task code', c: 'stg', k: 'chip' },
      { id: 'trig', x: 720, y: 446, w: 240, h: 70, t: 'Triggerer', s: 'async waits, deferred tasks', c: 'mon', k: 'chip' }
    ],
    edges: [
      { id: 'e1', a: 'bundle', b: 'proc', d: 'M125 130 V190', n: 1, bx: 125, by: 160 },
      { id: 'e2', a: 'proc', b: 'db', d: 'M240 235 H390', n: 2, bx: 315, by: 207 },
      { id: 'e3', a: 'sched', b: 'db', d: 'M720 274 H610', n: 3, bx: 665, by: 246 },
      { id: 'e4', a: 'sched', b: 'work', d: 'M840 316 V346', n: 4, nb: true },
      { id: 'e5', a: 'work', b: 'api', d: 'M960 388 H982 V160 H960', n: 5, bx: 982, by: 274 },
      { id: 'e6', a: 'api', b: 'db', d: 'M720 160 H610', n: 6, bx: 665, by: 132 },
      { id: 'e7', a: 'user', b: 'api', d: 'M840 72 V118', n: 7, nb: true },
      { id: 'e8', a: 'trig', b: 'db', d: 'M720 481 H610', n: 8, bx: 665, by: 453 }
    ],
    tags: [
      { id: 'tg_nodb', x: 392, y: 520, t: 'workers never open the database', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. Data intervals and runs                                           */
  /* ------------------------------------------------------------------ */
  S.intervals = {
    w: 1060, h: 360,
    label: 'A daily schedule at 02:00 cuts time into data intervals. The run for an interval starts when the interval ends. The logical date of a run with a data interval is the start of its interval.',
    nodes: [
      { id: 'iv1', x: 20, y: 60, w: 330, h: 68, t: 'Interval 1', s: '1 March 02:00 to 2 March 02:00', c: 'raw', k: 'chip' },
      { id: 'iv2', x: 360, y: 60, w: 330, h: 68, t: 'Interval 2', s: '2 March 02:00 to 3 March 02:00', c: 'stg', k: 'chip' },
      { id: 'iv3', x: 700, y: 60, w: 330, h: 68, t: 'Interval 3', s: '3 March 02:00 to 4 March 02:00', c: 'int', k: 'chip' },
      { id: 'r1', x: 245, y: 230, w: 210, h: 76, t: 'Run 1 starts', s: '2 March 02:00', c: 'air', k: 'chip' },
      { id: 'r2', x: 585, y: 230, w: 210, h: 76, t: 'Run 2 starts', s: '3 March 02:00', c: 'air', k: 'chip' },
      { id: 'r3', x: 825, y: 230, w: 210, h: 76, t: 'Run 3 starts', s: '4 March 02:00', c: 'air', k: 'chip' }
    ],
    edges: [
      { id: 'e1', a: 'iv1', b: 'r1', d: 'M350 128 C350 180 350 180 350 230', n: 1, bx: 350, by: 182 },
      { id: 'e2', a: 'iv2', b: 'r2', d: 'M690 128 C690 180 690 180 690 230', n: 2, bx: 690, by: 182 },
      { id: 'e3', a: 'iv3', b: 'r3', d: 'M1030 128 C1030 180 1000 180 960 230', n: 3, bx: 1010, by: 182 }
    ],
    tags: [
      { id: 'tg_ld', x: 20, y: 150, t: 'logical_date = 1 March 02:00', c: 'raw' },
      { id: 'tg_read', x: 245, y: 322, t: 'run 1 reads interval 1: the day that is over', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. Dynamic task mapping                                              */
  /* ------------------------------------------------------------------ */
  S.mapping = {
    w: 1000, h: 485,
    label: 'Dynamic task mapping. One task returns a list of five store ids. Airflow makes five copies of the load task, one for each id, and a summarize task gets the five results.',
    nodes: [
      { id: 'list', k: 'dag', x: 10, y: 190, w: 230, h: 72, t: 'list_stores', s: 'returns 5 store ids', c: 'ing' },
      { id: 'm0', k: 'dag', x: 390, y: 20, w: 230, h: 58, t: 'load_store[0]', s: 'store S-1', c: 'stg' },
      { id: 'm1', k: 'dag', x: 390, y: 110, w: 230, h: 58, t: 'load_store[1]', s: 'store S-2', c: 'stg' },
      { id: 'm2', k: 'dag', x: 390, y: 200, w: 230, h: 58, t: 'load_store[2]', s: 'store S-3', c: 'stg' },
      { id: 'm3', k: 'dag', x: 390, y: 290, w: 230, h: 58, t: 'load_store[3]', s: 'store S-4', c: 'stg' },
      { id: 'm4', k: 'dag', x: 390, y: 380, w: 230, h: 58, t: 'load_store[4]', s: 'store S-5', c: 'stg' },
      { id: 'sum', k: 'dag', x: 760, y: 190, w: 230, h: 72, t: 'summarize', s: 'gets the 5 results', c: 'mart' }
    ],
    edges: [
      { id: 'a0', a: 'list', b: 'm0', d: H(240, 226, 390, 49), n: 1, nb: true },
      { id: 'a1', a: 'list', b: 'm1', d: H(240, 226, 390, 139), n: 1, nb: true },
      { id: 'a2', a: 'list', b: 'm2', d: H(240, 226, 390, 229), n: 1, nb: true },
      { id: 'a3', a: 'list', b: 'm3', d: H(240, 226, 390, 319), n: 1, nb: true },
      { id: 'a4', a: 'list', b: 'm4', d: H(240, 226, 390, 409), n: 1, bx: 315, by: 318 },
      { id: 'b0', a: 'm0', b: 'sum', d: H(620, 49, 760, 226), n: 2, nb: true },
      { id: 'b1', a: 'm1', b: 'sum', d: H(620, 139, 760, 226), n: 2, nb: true },
      { id: 'b2', a: 'm2', b: 'sum', d: H(620, 229, 760, 226), n: 2, nb: true },
      { id: 'b3', a: 'm3', b: 'sum', d: H(620, 319, 760, 226), n: 2, nb: true },
      { id: 'b4', a: 'm4', b: 'sum', d: H(620, 409, 760, 226), n: 2, bx: 690, by: 318 }
    ],
    tags: [
      { id: 'tg_expand', x: 250, y: 440, t: 'the copies are made when the run is going', c: 'ing' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Assets                                                            */
  /* ------------------------------------------------------------------ */
  S.assets = {
    w: 1000, h: 440,
    label: 'Assets. Two producer DAGs each update an asset. A consumer DAG that schedules on orders_raw runs once for each update. A second consumer needs both assets and runs when each has an update.',
    nodes: [
      { id: 'p_orders', x: 0, y: 50, w: 270, h: 74, t: 'land_orders', s: 'task outlets=[orders_raw]', c: 'ing', k: 'chip' },
      { id: 'p_cust', x: 0, y: 280, w: 270, h: 74, t: 'land_customers', s: 'task outlets=[customers_raw]', c: 'ing', k: 'chip' },
      { id: 'a_orders', x: 385, y: 50, w: 250, h: 74, t: 'orders_raw', s: 'brewline://lake/raw/orders', c: 'raw', k: 'chip' },
      { id: 'a_cust', x: 385, y: 280, w: 250, h: 74, t: 'customers_raw', s: 'brewline://lake/raw/customers', c: 'raw', k: 'chip' },
      { id: 'c_daily', x: 750, y: 50, w: 250, h: 74, t: 'orders_daily', s: 'schedule=[orders_raw]', c: 'air', k: 'chip' },
      { id: 'c_both', x: 750, y: 280, w: 250, h: 74, t: 'customer_orders', s: 'both assets must update', c: 'air', k: 'chip' }
    ],
    edges: [
      { id: 'e1', a: 'p_orders', b: 'a_orders', d: 'M270 87 H385', n: 1, bx: 327, by: 59 },
      { id: 'e2', a: 'p_cust', b: 'a_cust', d: 'M270 317 H385', n: 1, bx: 327, by: 289 },
      { id: 'e3', a: 'a_orders', b: 'c_daily', d: 'M635 87 H750', n: 2, bx: 692, by: 59 },
      { id: 'e4', a: 'a_orders', b: 'c_both', d: V(580, 124, 840, 280), n: 3, bx: 660, by: 202 },
      { id: 'e5', a: 'a_cust', b: 'c_both', d: 'M635 317 H750', n: 3, bx: 692, by: 289 }
    ],
    tags: [
      { id: 'tg_each', x: 750, y: 140, t: 'one run for each update', c: 'air' },
      { id: 'tg_both', x: 600, y: 380, t: 'waits until both have an update', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Deferral and the triggerer                                        */
  /* ------------------------------------------------------------------ */
  S.deferral = {
    w: 1040, h: 330,
    label: 'A deferrable task. The task starts on a worker and calls defer. The worker slot is free. The triggerer waits for the event with async code. When the event fires, the scheduler schedules the task again and a worker finishes it.',
    nodes: [
      { id: 'start', x: 0, y: 40, w: 190, h: 78, t: 'Task starts', s: 'on a worker slot', c: 'stg', k: 'chip' },
      { id: 'defer', x: 215, y: 40, w: 190, h: 78, t: 'defer()', s: 'the slot is freed', c: 'air', k: 'chip' },
      { id: 'trig', x: 320, y: 220, w: 220, h: 86, t: 'Triggerer', s: 'one async loop, many waits', c: 'mon', k: 'chip' },
      { id: 'fire', x: 640, y: 220, w: 190, h: 86, t: 'Event fires', s: 'the file arrived', c: 'ing', k: 'chip' },
      { id: 'sched', x: 640, y: 40, w: 190, h: 78, t: 'Scheduler', s: 'schedules it again', c: 'air', k: 'chip' },
      { id: 'resume', x: 850, y: 40, w: 190, h: 78, t: 'Worker again', s: 'runs the rest', c: 'stg', k: 'chip' }
    ],
    edges: [
      { id: 'e1', a: 'start', b: 'defer', d: 'M190 79 H215', n: 1, nb: true },
      { id: 'e2', a: 'defer', b: 'trig', d: V(330, 118, 400, 220), n: 2, bx: 350, by: 168 },
      { id: 'e3', a: 'trig', b: 'fire', d: 'M540 263 H640', n: 3, bx: 590, by: 235 },
      { id: 'e4', a: 'fire', b: 'sched', d: 'M735 220 V118', n: 4, bx: 735, by: 168 },
      { id: 'e5', a: 'sched', b: 'resume', d: 'M830 79 H850', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_slot', x: 0, y: 250, t: 'no slot held while waiting', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. From a laptop to production                                       */
  /* ------------------------------------------------------------------ */
  S.deploy = {
    w: 1000, h: 400,
    label: 'A DAG change travels from a laptop to production. You change DAG files, push to git, CI runs checks, a release becomes a DAG bundle or an image, and an Airflow deployment picks it up. The deployment can be self-managed or a managed service.',
    nodes: [
      { id: 'dev', x: 0, y: 40, w: 210, h: 76, t: 'Your laptop', s: 'edit DAGs, run tests', c: 'src', k: 'chip' },
      { id: 'git', x: 250, y: 40, w: 210, h: 76, t: 'Git', s: 'pull request, review', c: 'ci', k: 'chip' },
      { id: 'ci', x: 500, y: 40, w: 210, h: 76, t: 'CI', s: 'ruff, import test, pytest', c: 'qual', k: 'chip' },
      { id: 'rel', x: 750, y: 40, w: 240, h: 76, t: 'Release', s: 'DAG bundle or image', c: 'raw', k: 'chip' },
      { id: 'self', x: 20, y: 250, w: 290, h: 84, t: 'Self-managed', s: 'Helm chart on Kubernetes', c: 'int', k: 'chip' },
      { id: 'mgd', x: 355, y: 250, w: 290, h: 84, t: 'Cloud managed', s: 'Amazon MWAA, Cloud Composer', c: 'sf', k: 'chip' },
      { id: 'astro', x: 690, y: 250, w: 290, h: 84, t: 'Vendor managed', s: 'for example Astronomer', c: 'con', k: 'chip' }
    ],
    edges: [
      { id: 'e1', a: 'dev', b: 'git', d: 'M210 78 H250', n: 1, nb: true },
      { id: 'e2', a: 'git', b: 'ci', d: 'M460 78 H500', n: 2, nb: true },
      { id: 'e3', a: 'ci', b: 'rel', d: 'M710 78 H750', n: 3, nb: true },
      { id: 'e4a', a: 'rel', b: 'self', d: V(870, 116, 165, 250), n: 4, nb: true },
      { id: 'e4b', a: 'rel', b: 'mgd', d: V(870, 116, 500, 250), n: 4, bx: 690, by: 180 },
      { id: 'e4c', a: 'rel', b: 'astro', d: V(870, 116, 835, 250), n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_pick', x: 300, y: 350, t: 'the same DAG files run on any of the three', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. The checks in CI                                                  */
  /* ------------------------------------------------------------------ */
  S.ci = {
    w: 1000, h: 250,
    label: 'The checks that run for a pull request: ruff with the Airflow rules, an import test with the DagBag, unit tests of the task logic, a dag test of a sample run, then review and merge, then the bundle is synced.',
    nodes: [
      { id: 'lint', k: 'dag', x: 0, y: 50, w: 150, h: 78, t: 'ruff', s: 'AIR rules', c: 'qual' },
      { id: 'imp', k: 'dag', x: 170, y: 50, w: 150, h: 78, t: 'import test', s: 'DagBag errors', c: 'ci' },
      { id: 'unit', k: 'dag', x: 340, y: 50, w: 150, h: 78, t: 'pytest', s: 'task logic', c: 'stg' },
      { id: 'dtest', k: 'dag', x: 510, y: 50, w: 150, h: 78, t: 'dag.test()', s: 'one sample run', c: 'air' },
      { id: 'gate', k: 'dag', x: 680, y: 50, w: 150, h: 78, t: 'review', s: 'merge', c: 'con' },
      { id: 'sync', k: 'dag', x: 850, y: 50, w: 150, h: 78, t: 'sync', s: 'bundle updates', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'lint', b: 'imp', d: 'M150 89 H170', n: 1, nb: true },
      { id: 'e2', a: 'imp', b: 'unit', d: 'M320 89 H340', n: 2, nb: true },
      { id: 'e3', a: 'unit', b: 'dtest', d: 'M490 89 H510', n: 3, nb: true },
      { id: 'e4', a: 'dtest', b: 'gate', d: 'M660 89 H680', n: 4, nb: true },
      { id: 'e5', a: 'gate', b: 'sync', d: 'M830 89 H850', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_fast', x: 0, y: 190, t: 'seconds, no Airflow server needed', c: 'qual' },
      { id: 'tg_slow', x: 510, y: 190, t: 'a real run of your tasks, on test data', c: 'air' }
    ]
  };
})();
