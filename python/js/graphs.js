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
  /* 2. From project files to a run that you can repeat                  */
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

  /* @@END */
})();
