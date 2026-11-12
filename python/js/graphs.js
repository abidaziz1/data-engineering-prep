/* Diagram specs for the Python tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. Brewline's Python jobs in the platform                           */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 520, label: 'Brewline Python jobs: three sources feed an extract step, a transform step and a load step that write to the warehouse, with the environment, configuration, tests, logs and a scheduler around them',
    groups: [
      { id: 'g_src', x: 10, y: 52, w: 250, h: 270, t: 'SOURCES', c: 'src' },
      { id: 'g_py', x: 290, y: 52, w: 540, h: 270, t: 'PYTHON JOBS', c: 'stg' }
    ],
    nodes: [
      { id: 's_db', x: 22, y: 100, w: 226, h: 58, t: 'Orders database', s: 'nightly export', c: 'src', k: 'chip' },
      { id: 's_api', x: 22, y: 178, w: 226, h: 58, t: 'Partner API', s: 'FX rates, store list', c: 'src', k: 'chip' },
      { id: 's_file', x: 22, y: 256, w: 226, h: 58, t: 'Supplier files', s: 'CSV by SFTP', c: 'src', k: 'chip' },
      { id: 'j_ext', x: 306, y: 112, w: 150, h: 170, t: 'Extract', s: 'read, retry', c: 'ing', k: 'layer' },
      { id: 'j_tr', x: 476, y: 112, w: 150, h: 170, t: 'Transform', s: 'clean, join', c: 'stg', k: 'layer' },
      { id: 'j_ld', x: 646, y: 112, w: 164, h: 170, t: 'Load', s: 'write safely', c: 'mart', k: 'layer' },
      { id: 'wh', x: 880, y: 122, w: 200, h: 150, t: 'Warehouse', s: 'tables for reports', c: 'con', k: 'layer' },
      { id: 'c_env', x: 0, y: 410, w: 208, h: 52, t: 'Environment', s: 'uv, lock file', c: 'sf', k: 'pill' },
      { id: 'c_cfg', x: 223, y: 410, w: 208, h: 52, t: 'Config', s: 'env vars, secrets', c: 'ci', k: 'pill' },
      { id: 'c_test', x: 446, y: 410, w: 208, h: 52, t: 'Tests', s: 'pytest, CI', c: 'qual', k: 'pill' },
      { id: 'c_log', x: 669, y: 410, w: 208, h: 52, t: 'Logs', s: 'what ran, what failed', c: 'mon', k: 'pill' },
      { id: 'c_sch', x: 892, y: 410, w: 208, h: 52, t: 'Scheduler', s: 'cron or Airflow', c: 'snap', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 's_db', b: 'j_ext', d: H(248, 129, 306, 170), n: 1, nb: true },
      { id: 'e1b', a: 's_api', b: 'j_ext', d: H(248, 207, 306, 200), n: 1, bx: 276, by: 205 },
      { id: 'e1c', a: 's_file', b: 'j_ext', d: H(248, 285, 306, 236), n: 1, nb: true },
      { id: 'e2', a: 'j_ext', b: 'j_tr', d: 'M456 197 H476', n: 2, bx: 466, by: 160 },
      { id: 'e3', a: 'j_tr', b: 'j_ld', d: 'M626 197 H646', n: 3, bx: 636, by: 160 },
      { id: 'e4', a: 'j_ld', b: 'wh', d: 'M810 197 H880', n: 4, bx: 845, by: 160 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. Project files, then a run you can repeat                */
  /* ------------------------------------------------------------------ */
  S.env = {
    w: 1100, h: 440, label: 'A repeatable run: pyproject.toml says what you ask for, uv lock asks PyPI and writes uv.lock with exact versions and hashes, uv sync installs exactly those into .venv on every machine, and uv run starts the job in that environment',
    groups: [
      { id: 'g_git', x: 10, y: 52, w: 520, h: 210, t: 'COMMITTED TO GIT', c: 'src' },
      { id: 'g_box', x: 560, y: 52, w: 530, h: 210, t: 'ON EVERY MACHINE', c: 'sf' }
    ],
    nodes: [
      { id: 'pp', x: 30, y: 104, w: 210, h: 130, t: 'pyproject.toml', s: 'what you ask for', c: 'src', k: 'layer' },
      { id: 'lk', x: 290, y: 104, w: 220, h: 130, t: 'uv.lock', s: 'what was chosen', c: 'stg', k: 'layer' },
      { id: 'vn', x: 580, y: 104, w: 210, h: 130, t: '.venv', s: 'what is installed', c: 'ing', k: 'layer' },
      { id: 'rn', x: 830, y: 104, w: 240, h: 130, t: 'uv run', s: 'your job, in that environment', c: 'mart', k: 'layer' },
      { id: 'pi', x: 290, y: 340, w: 220, h: 70, t: 'PyPI', s: 'the package index', c: 'con', k: 'chip' },
      { id: 'm1', x: 580, y: 340, w: 150, h: 70, t: 'Laptop', c: 'sf', k: 'chip' },
      { id: 'm2', x: 750, y: 340, w: 150, h: 70, t: 'CI runner', c: 'sf', k: 'chip' },
      { id: 'm3', x: 920, y: 340, w: 150, h: 70, t: 'Server', c: 'sf', k: 'chip' }
    ],
    edges: [
      { id: 'a1', a: 'pp', b: 'lk', d: 'M240 169 H290', n: 1, bx: 265, by: 128, label: 'uv lock', lx: 265, ly: 82 },
      { id: 'a2', a: 'pi', b: 'lk', d: V(400, 340, 400, 234), n: 2, bx: 400, by: 290 },
      { id: 'a3', a: 'lk', b: 'vn', d: 'M510 169 H580', n: 3, bx: 545, by: 128, label: 'uv sync', lx: 545, ly: 82 },
      { id: 'a4', a: 'vn', b: 'rn', d: 'M790 169 H830', n: 4, bx: 810, by: 128 },
      { id: 'a5', a: 'm1', b: 'vn', d: V(655, 340, 655, 234), nb: true },
      { id: 'a6', a: 'm2', b: 'vn', d: V(825, 340, 700, 234), nb: true },
      { id: 'a7', a: 'm3', b: 'vn', d: V(995, 340, 740, 234), nb: true }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. A generator pipeline is pulled from the end                      */
  /* ------------------------------------------------------------------ */
  function pull(fromX, toX) { return 'M' + fromX + ' 150 C' + fromX + ' 84 ' + toX + ' 84 ' + toX + ' 150'; }
  S.gen = {
    w: 1100, h: 340, label: 'A generator pipeline: the for loop at the end asks for the next batch, each stage asks the stage before it, and the file is read one line at a time, so only one batch is in memory',
    nodes: [
      { id: 'f', x: 10, y: 150, w: 150, h: 90, t: 'orders.csv', s: 'on disk', c: 'src', k: 'chip' },
      { id: 's1', x: 200, y: 150, w: 150, h: 90, t: 'read_rows', s: 'one dict', c: 'ing', k: 'chip' },
      { id: 's2', x: 390, y: 150, w: 150, h: 90, t: 'parse', s: 'types, cents', c: 'stg', k: 'chip' },
      { id: 's3', x: 580, y: 150, w: 150, h: 90, t: 'paid', s: 'keep paid', c: 'mart', k: 'chip' },
      { id: 's4', x: 770, y: 150, w: 150, h: 90, t: 'batches', s: '10,000 rows', c: 'con', k: 'chip' },
      { id: 's5', x: 960, y: 150, w: 130, h: 90, t: 'for loop', s: 'add up', c: 'snap', k: 'chip' }
    ],
    edges: [
      { id: 'd1', a: 'f', b: 's1', d: 'M160 195 H200' },
      { id: 'd2', a: 's1', b: 's2', d: 'M350 195 H390' },
      { id: 'd3', a: 's2', b: 's3', d: 'M540 195 H580' },
      { id: 'd4', a: 's3', b: 's4', d: 'M730 195 H770' },
      { id: 'd5', a: 's4', b: 's5', d: 'M920 195 H960' },
      { id: 'p5', a: 's5', b: 's4', d: pull(1025, 845), k: 'ctl', n: 1, bx: 935, by: 100 },
      { id: 'p4', a: 's4', b: 's3', d: pull(845, 655), k: 'ctl', n: 2, bx: 750, by: 100 },
      { id: 'p3', a: 's3', b: 's2', d: pull(655, 465), k: 'ctl', n: 3, bx: 560, by: 100 },
      { id: 'p2', a: 's2', b: 's1', d: pull(465, 275), k: 'ctl', n: 4, bx: 370, by: 100 },
      { id: 'p1', a: 's1', b: 'f', d: pull(275, 85), k: 'ctl', n: 5, bx: 180, by: 100 }
    ],
    tags: [
      { id: 'tg_one', x: 760, y: 280, t: 'one batch in memory', c: 'mon' },
      { id: 'tg_file', x: 10, y: 280, t: 'the file is read line by line', c: 'src' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. A retry loop                                                     */
  /* ------------------------------------------------------------------ */
  S.retry = {
    w: 1100, h: 340, label: 'A retry loop: the job calls the API, the answer is sorted into worth retrying, success or stop, a retryable failure waits a random, growing time and calls again, and a failure that will not change stops the job',
    nodes: [
      { id: 'job', x: 10, y: 60, w: 170, h: 90, t: 'Your job', s: 'calls the API', c: 'ing', k: 'chip' },
      { id: 'api', x: 300, y: 60, w: 170, h: 90, t: 'The API', s: '200, 429, 503, 400', c: 'src', k: 'chip' },
      { id: 'chk', x: 590, y: 60, w: 170, h: 90, t: 'Sort the answer', s: 'retry, use or stop', c: 'stg', k: 'chip' },
      { id: 'ok', x: 880, y: 60, w: 200, h: 90, t: 'Use the data', s: 'the page, the rows', c: 'mart', k: 'chip' },
      { id: 'wait', x: 590, y: 210, w: 170, h: 84, t: 'Wait', s: 'random, growing', c: 'con', k: 'chip' },
      { id: 'stop', x: 880, y: 210, w: 200, h: 84, t: 'Stop and raise', s: 'the run fails, loudly', c: 'mon', k: 'chip' }
    ],
    edges: [
      { id: 'e1', a: 'job', b: 'api', d: 'M180 105 H300', n: 1, bx: 240, by: 80, label: 'request', lx: 240, ly: 62 },
      { id: 'e2', a: 'api', b: 'chk', d: 'M470 105 H590', n: 2, bx: 530, by: 80, label: 'answer', lx: 530, ly: 62 },
      { id: 'e3', a: 'chk', b: 'ok', d: 'M760 105 H880', n: 5, bx: 820, by: 80, label: '200', lx: 820, ly: 62 },
      { id: 'e4', a: 'chk', b: 'wait', d: 'M675 150 V210', n: 3, bx: 675, by: 180, label: '429, 503, timeout', lx: 545, ly: 182 },
      { id: 'e5', a: 'wait', b: 'job', d: 'M590 252 H95 V150', n: 4, bx: 345, by: 252, label: 'call again', lx: 345, ly: 278 },
      { id: 'e6', a: 'chk', b: 'stop', d: 'M730 150 V182 H980 V210', n: 6, bx: 855, by: 182, label: '400, 404', lx: 855, ly: 164 }
    ],
    tags: [
      { id: 'tg_jitter', x: 590, y: 304, t: 'random, so clients do not retry together', c: 'mon' },
      { id: 'tg_budget', x: 880, y: 304, t: 'give up after a few tries', c: 'snap' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. A paginated extract with a cursor                                */
  /* ------------------------------------------------------------------ */
  S.api = {
    w: 1100, h: 340, label: 'A paginated extract: the loop asks the API for a page after a cursor, the page comes back with the next cursor, the loop writes the page to a staging file, saves the cursor, and asks again, and a 429 answer makes it wait and ask for the same page',
    nodes: [
      { id: 'loop', x: 10, y: 130, w: 170, h: 90, t: 'Extract loop', s: 'page after page', c: 'ing', k: 'chip' },
      { id: 'api', x: 290, y: 130, w: 170, h: 90, t: 'Partner API', s: '100 orders a page', c: 'src', k: 'chip' },
      { id: 'page', x: 570, y: 130, w: 170, h: 90, t: 'One page', s: 'items and next cursor', c: 'stg', k: 'chip' },
      { id: 'file', x: 850, y: 40, w: 220, h: 80, t: 'Staging file', s: 'one file for each page', c: 'mart', k: 'chip' },
      { id: 'ckpt', x: 850, y: 230, w: 220, h: 80, t: 'Checkpoint', s: 'the last cursor saved', c: 'snap', k: 'chip' }
    ],
    edges: [
      { id: 'r1', a: 'loop', b: 'api', d: 'M180 175 H290', n: 1, bx: 235, by: 150, label: 'GET after=C', lx: 235, ly: 238 },
      { id: 'r2', a: 'api', b: 'page', d: 'M460 175 H570', n: 2, bx: 515, by: 150, label: '200 JSON', lx: 515, ly: 238 },
      { id: 'r3', a: 'page', b: 'file', d: 'M740 160 C795 160 795 80 850 80', n: 3, bx: 795, by: 120, label: 'write', lx: 760, ly: 70 },
      { id: 'r4', a: 'file', b: 'ckpt', d: 'M960 120 V230', n: 4, bx: 960, by: 175, label: 'then save', lx: 1030, ly: 178 },
      { id: 'r5', a: 'ckpt', b: 'loop', d: 'M850 270 H95 V220', n: 5, bx: 470, by: 270, label: 'next cursor', lx: 470, ly: 296 },
      { id: 'r6', a: 'api', b: 'loop', d: 'M375 130 V82 H95 V130', k: 'ctl', n: 6, bx: 235, by: 82, label: '429: wait, ask again', lx: 235, ly: 62 }
    ],
    tags: [
      { id: 'tg_safe', x: 850, y: 304, t: 'write first, then save the cursor', c: 'mon' },
      { id: 'tg_stop', x: 570, y: 232, t: 'stop when next cursor is empty', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Threads and processes, and the GIL                               */
  /* ------------------------------------------------------------------ */
  S.conc = {
    w: 1100, h: 340, label: 'Threads and processes: threads share one process and one GIL, so only one runs Python code at a time, while processes each have their own interpreter and GIL and can use several cores; a free-threaded build has no GIL',
    nodes: [
      { id: 'job', x: 10, y: 125, w: 170, h: 90, t: 'Your job', s: 'eight chunks of work', c: 'ing', k: 'chip' },
      { id: 'thr', x: 260, y: 40, w: 200, h: 80, t: 'Threads', s: 'one process, shared memory', c: 'stg', k: 'chip' },
      { id: 'prc', x: 260, y: 220, w: 200, h: 80, t: 'Processes', s: 'a separate interpreter each', c: 'con', k: 'chip' },
      { id: 'gil', x: 560, y: 40, w: 230, h: 80, t: 'One GIL', s: 'one thread runs Python at a time', c: 'mon', k: 'chip' },
      { id: 'gils', x: 560, y: 220, w: 230, h: 80, t: 'A GIL in each process', s: 'they do not block each other', c: 'mon', k: 'chip' },
      { id: 'one', x: 870, y: 40, w: 210, h: 80, t: 'One core busy', s: 'for computing work', c: 'snap', k: 'chip' },
      { id: 'many', x: 870, y: 220, w: 210, h: 80, t: 'Several cores busy', s: 'for computing work', c: 'mart', k: 'chip' }
    ],
    edges: [
      { id: 'c1', a: 'job', b: 'thr', d: 'M180 150 C220 150 220 80 260 80', n: 1, bx: 220, by: 118 },
      { id: 'c2', a: 'thr', b: 'gil', d: 'M460 80 H560', n: 2, bx: 510, by: 58 },
      { id: 'c3', a: 'gil', b: 'one', d: 'M790 80 H870', n: 3, bx: 830, by: 58 },
      { id: 'c4', a: 'job', b: 'prc', d: 'M180 190 C220 190 220 260 260 260', n: 4, bx: 220, by: 232 },
      { id: 'c5', a: 'prc', b: 'gils', d: 'M460 260 H560', n: 5, bx: 510, by: 238 },
      { id: 'c6', a: 'gils', b: 'many', d: 'M790 260 H870', n: 6, bx: 830, by: 238 }
    ],
    tags: [
      { id: 'tg_wait', x: 560, y: 150, t: 'a thread that waits lets go of the GIL', c: 'qual' },
      { id: 'tg_free', x: 560, y: 186, t: 'free-threaded build 3.14t: no GIL', c: 'ci' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. Validate at the boundary, quarantine what fails                  */
  /* ------------------------------------------------------------------ */
  S.validate = {
    w: 1100, h: 340, label: 'Validating at the boundary: every row of the raw file is checked, valid rows go on to the clean table, invalid rows go to a quarantine table with the reason, the count of bad rows is compared with a limit, and over the limit the run fails',
    nodes: [
      { id: 'raw', x: 10, y: 125, w: 170, h: 90, t: 'Raw file', s: 'every value is text', c: 'src', k: 'chip' },
      { id: 'val', x: 260, y: 125, w: 190, h: 90, t: 'Validate each row', s: 'types, ranges, keys', c: 'stg', k: 'chip' },
      { id: 'good', x: 560, y: 40, w: 200, h: 80, t: 'Clean table', s: 'typed rows only', c: 'mart', k: 'chip' },
      { id: 'q', x: 560, y: 210, w: 200, h: 80, t: 'Quarantine', s: 'the row and the reason', c: 'mon', k: 'chip' },
      { id: 'chk', x: 860, y: 210, w: 210, h: 80, t: 'Limit check', s: 'share of bad rows', c: 'snap', k: 'chip' }
    ],
    edges: [
      { id: 'v1', a: 'raw', b: 'val', d: 'M180 170 H260', n: 1, bx: 220, by: 148 },
      { id: 'v2', a: 'val', b: 'good', d: 'M450 150 C500 150 510 80 560 80', n: 2, bx: 505, by: 110, label: 'valid', lx: 470, ly: 78 },
      { id: 'v3', a: 'val', b: 'q', d: 'M450 190 C500 190 510 250 560 250', n: 3, bx: 505, by: 220, label: 'invalid', lx: 470, ly: 262 },
      { id: 'v4', a: 'q', b: 'chk', d: 'M760 250 H860', n: 4, bx: 810, by: 228, label: 'count', lx: 810, ly: 278 },
      { id: 'v5', a: 'chk', b: 'good', d: 'M965 210 V80 H760', n: 5, bx: 965, by: 140, label: 'under the limit: load', lx: 862, ly: 62 }
    ],
    tags: [
      { id: 'tg_fail', x: 860, y: 304, t: 'over the limit: the run fails', c: 'qual' },
      { id: 'tg_fix', x: 560, y: 304, t: 'a person fixes it, and replays it', c: 'ci' }
    ]
  };

  /* @@END */
})();
