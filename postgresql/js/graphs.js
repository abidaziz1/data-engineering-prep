/* Diagram specs for the PostgreSQL course. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. A server: the postmaster, a backend for each client, memory, the log and the data files */
  S.server = {
    w: 1000, h: 400,
    label: 'A client connects to the postmaster, which starts one backend process for it. The backend reads and changes 8 kilobyte pages in shared buffers, writes a log record for every change, and flushes the log at commit. Background processes write the dirty pages to the data files later, and autovacuum cleans up dead rows.',
    nodes: [
      { id: 'cl', x: 0, y: 150, w: 170, h: 90, t: 'Client', s: 'your pipeline', c: 'src' },
      { id: 'pm', x: 240, y: 20, w: 200, h: 80, t: 'postmaster', s: 'listens, forks', c: 'stg' },
      { id: 'be', x: 240, y: 190, w: 200, h: 90, t: 'Backend', s: 'one per client', c: 'ing' },
      { id: 'sb', x: 530, y: 40, w: 200, h: 90, t: 'Shared buffers', s: 'pages in memory', c: 'mart' },
      { id: 'wal', x: 530, y: 250, w: 200, h: 90, t: 'WAL', s: 'the log on disk', c: 'air' },
      { id: 'df', x: 800, y: 40, w: 200, h: 90, t: 'Data files', s: 'pages on disk', c: 'raw' },
      { id: 'bg', x: 800, y: 250, w: 200, h: 90, t: 'Background', s: 'checkpoint, vacuum', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'cl', b: 'pm', d: 'M170 175 C205 175 205 60 240 60', n: 1, bx: 207, by: 118 },
      { id: 'e2', a: 'pm', b: 'be', d: 'M340 100 V190', n: 2, bx: 340, by: 146 },
      { id: 'e3', a: 'be', b: 'sb', d: 'M440 215 C490 215 490 85 530 85', n: 3, bx: 488, by: 150 },
      { id: 'e4', a: 'be', b: 'wal', d: 'M440 255 C490 255 490 295 530 295', n: 4, bx: 488, by: 276 },
      { id: 'e5', a: 'sb', b: 'df', d: 'M730 85 H800', n: 5, nb: true },
      { id: 'e6', a: 'bg', b: 'df', d: 'M900 250 V130', n: 6, bx: 900, by: 190 }
    ],
    tags: [
      { id: 'tg_proc', x: 20, y: 270, t: 'one process for each connection', c: 'ing' },
      { id: 'tg_log', x: 610, y: 208, t: 'log first, pages later', c: 'air' },
      { id: 'tg_vac', x: 640, y: 352, t: 'autovacuum removes dead rows', c: 'mon' }
    ]
  };

  /* 2. Row versions: an update writes a new version, vacuum removes the old one later */
  S.mvcc = {
    w: 1000, h: 400,
    label: 'An update does not change a row in place. It writes a new version of the row and marks the old version as ended by the updating transaction. A reader that started before the update still sees the old version. Vacuum removes versions that no reader can see and makes their space reusable.',
    nodes: [
      { id: 'a', x: 0, y: 50, w: 200, h: 90, t: 'Reader A', s: 'started before', c: 'src' },
      { id: 'v1', x: 290, y: 50, w: 210, h: 90, t: 'Old version', s: 'ended by tx 1', c: 'raw' },
      { id: 'v2', x: 570, y: 50, w: 210, h: 90, t: 'New version', s: 'created by tx 1', c: 'mart' },
      { id: 'b', x: 840, y: 50, w: 160, h: 90, t: 'Reader B', s: 'started after', c: 'stg' },
      { id: 'vac', x: 400, y: 260, w: 210, h: 90, t: 'VACUUM', s: 'frees old versions', c: 'mon' },
      { id: 'free', x: 740, y: 260, w: 220, h: 90, t: 'Free space', s: 'reused by new rows', c: 'qual' }
    ],
    edges: [
      { id: 'e1', a: 'v1', b: 'v2', d: 'M500 95 H570', n: 1, nb: true },
      { id: 'e2', a: 'a', b: 'v1', d: 'M200 95 H290', n: 2, nb: true },
      { id: 'e3', a: 'b', b: 'v2', d: 'M840 95 H780', n: 3, nb: true },
      { id: 'e4', a: 'vac', b: 'v1', d: 'M470 260 C470 200 400 190 395 140', n: 4, bx: 448, by: 205 },
      { id: 'e5', a: 'vac', b: 'free', d: 'M610 305 H740', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_dead', x: 250, y: 168, t: 'dead: no reader can see it', c: 'mon' },
      { id: 'tg_old', x: 20, y: 160, t: 'sees the old version', c: 'src' },
      { id: 'tg_hold', x: 20, y: 300, t: 'an open snapshot blocks vacuum', c: 'ing' }
    ]
  };

  /* 3. The log first, the pages later, and recovery */
  S.wal = {
    w: 1000, h: 400,
    label: 'A change is made to a page in memory and written to the write-ahead log. The commit waits until the log is flushed to disk. A checkpoint writes the dirty pages to the data files later. After a crash, recovery replays the log from the last checkpoint.',
    nodes: [
      { id: 'st', x: 0, y: 150, w: 170, h: 90, t: 'Statement', s: 'UPDATE ... ', c: 'src' },
      { id: 'buf', x: 260, y: 40, w: 200, h: 90, t: 'Shared buffers', s: 'the page is dirty', c: 'mart' },
      { id: 'wal', x: 260, y: 250, w: 200, h: 90, t: 'WAL', s: 'flushed at commit', c: 'air' },
      { id: 'chk', x: 550, y: 40, w: 200, h: 90, t: 'Checkpoint', s: 'writes dirty pages', c: 'stg' },
      { id: 'df', x: 810, y: 40, w: 190, h: 90, t: 'Data files', s: 'pages on disk', c: 'raw' },
      { id: 'rec', x: 550, y: 250, w: 200, h: 90, t: 'Recovery', s: 'replays the WAL', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'st', b: 'buf', d: 'M170 175 C215 175 215 85 260 85', n: 1, bx: 216, by: 130 },
      { id: 'e2', a: 'st', b: 'wal', d: 'M170 215 C215 215 215 295 260 295', n: 2, bx: 216, by: 255 },
      { id: 'e3', a: 'buf', b: 'chk', d: 'M460 85 H550', n: 3, nb: true },
      { id: 'e4', a: 'chk', b: 'df', d: 'M750 85 H810', n: 3, nb: true },
      { id: 'e5', a: 'wal', b: 'rec', d: 'M460 295 H550', n: 4, nb: true },
      { id: 'e6', a: 'rec', b: 'df', d: 'M750 295 C830 295 905 220 905 130', n: 5, bx: 860, by: 240 }
    ],
    tags: [
      { id: 'tg_commit', x: 292, y: 208, t: 'commit waits for the flush', c: 'air' },
      { id: 'tg_later', x: 560, y: 150, t: 'pages are written later', c: 'stg' },
      { id: 'tg_crash', x: 560, y: 352, t: 'after a crash, from the last checkpoint', c: 'mon' }
    ]
  };

  /* 4. A nightly load: COPY into a staging table, one upsert */
  S.load = {
    w: 1000, h: 400,
    label: 'The file is copied into a temporary staging table with COPY, in one round trip. One INSERT with ON CONFLICT then moves the rows into the orders table. A WHERE clause skips rows that did not change, so a second run of the same file writes nothing.',
    nodes: [
      { id: 'file', x: 0, y: 150, w: 160, h: 90, t: 'CSV file', s: 'one night', c: 'src' },
      { id: 'stg', x: 240, y: 150, w: 200, h: 90, t: 'Staging table', s: 'temporary, no key', c: 'stg' },
      { id: 'up', x: 520, y: 150, w: 210, h: 90, t: 'Upsert', s: 'ON CONFLICT', c: 'ing' },
      { id: 'ord', x: 800, y: 150, w: 200, h: 90, t: 'orders', s: 'one row each', c: 'mart' },
      { id: 'chk', x: 520, y: 20, w: 210, h: 80, t: 'Row differs?', s: 'IS DISTINCT FROM', c: 'qual' }
    ],
    edges: [
      { id: 'e1', a: 'file', b: 'stg', d: 'M160 195 H240', n: 1, nb: true },
      { id: 'e2', a: 'stg', b: 'up', d: 'M440 195 H520', n: 2, nb: true },
      { id: 'e3', a: 'chk', b: 'up', d: 'M625 100 V150', n: 3, bx: 625, by: 126 },
      { id: 'e4', a: 'up', b: 'ord', d: 'M730 195 H800', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_copy', x: 20, y: 262, t: 'COPY: one statement', c: 'src' },
      { id: 'tg_dup', x: 250, y: 262, t: 'DISTINCT ON drops duplicates', c: 'stg' },
      { id: 'tg_skip', x: 500, y: 270, t: 'unchanged rows are not written', c: 'qual' },
      { id: 'tg_cost', x: 760, y: 262, t: 'a write is a new version', c: 'mon' }
    ]
  };

  /* 5. Partition pruning and retention */
  S.partition = {
    w: 1000, h: 400,
    label: 'A query with a time range on the partition key reads only the partitions whose bounds overlap the range. The others are pruned. Dropping a whole partition removes a month of data without writing a single dead row.',
    nodes: [
      { id: 'q', x: 0, y: 150, w: 170, h: 90, t: 'Query', s: 'one day of March', c: 'src' },
      { id: 'par', x: 250, y: 150, w: 200, h: 90, t: 'ev', s: 'the parent: no rows', c: 'stg' },
      { id: 'feb', x: 560, y: 10, w: 220, h: 70, t: 'ev_2026_02', s: 'February', c: 'raw' },
      { id: 'mar', x: 560, y: 105, w: 220, h: 70, t: 'ev_2026_03', s: 'March', c: 'mart' },
      { id: 'apr', x: 560, y: 200, w: 220, h: 70, t: 'ev_2026_04', s: 'April', c: 'raw' },
      { id: 'def', x: 560, y: 295, w: 220, h: 70, t: 'ev_default', s: 'everything else', c: 'raw' },
      { id: 'drop', x: 850, y: 200, w: 150, h: 70, t: 'DROP', s: 'no dead rows', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'q', b: 'par', d: 'M170 195 H250', n: 1, nb: true },
      { id: 'e2', a: 'par', b: 'feb', d: 'M450 175 C510 175 500 45 560 45', n: 2, bx: 506, by: 105 },
      { id: 'e3', a: 'par', b: 'mar', d: 'M450 185 C510 185 510 140 560 140', n: 3, nb: true },
      { id: 'e4', a: 'par', b: 'apr', d: 'M450 205 C510 205 510 235 560 235', n: 2, nb: true },
      { id: 'e5', a: 'par', b: 'def', d: 'M450 215 C510 215 500 330 560 330', n: 2, bx: 506, by: 270 },
      { id: 'e6', a: 'apr', b: 'drop', d: 'M780 235 H850', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_pruned', x: 260, y: 20, t: 'February, April and default: pruned', c: 'mon' },
      { id: 'tg_read', x: 260, y: 300, t: 'only March is read', c: 'mart' },
      { id: 'tg_func', x: 20, y: 300, t: 'a function on the key hides it', c: 'ing' }
    ]
  };

  /* 6. A primary, a standby, a subscriber and a slot */
  S.replication = {
    w: 1000, h: 400,
    label: 'The primary writes every change to the log. A standby receives the log and replays it, so it is a byte-for-byte copy that can only be read. A subscriber receives the decoded changes of chosen tables into tables of its own. A replication slot keeps the log until its reader has taken it.',
    nodes: [
      { id: 'pri', x: 0, y: 150, w: 180, h: 90, t: 'Primary', s: 'takes the writes', c: 'src' },
      { id: 'wal', x: 270, y: 150, w: 180, h: 90, t: 'WAL', s: 'the change log', c: 'air' },
      { id: 'stb', x: 580, y: 20, w: 210, h: 90, t: 'Standby', s: 'read-only copy', c: 'mart' },
      { id: 'sub', x: 580, y: 280, w: 210, h: 90, t: 'Subscriber', s: 'tables of its own', c: 'stg' },
      { id: 'slot', x: 270, y: 300, w: 180, h: 80, t: 'Slot', s: 'keeps WAL', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'pri', b: 'wal', d: 'M180 195 H270', n: 1, nb: true },
      { id: 'e2', a: 'wal', b: 'stb', d: 'M450 175 C520 175 510 65 580 65', n: 2, bx: 514, by: 118 },
      { id: 'e3', a: 'wal', b: 'sub', d: 'M450 215 C520 215 510 325 580 325', n: 3, bx: 514, by: 270 },
      { id: 'e4', a: 'wal', b: 'slot', d: 'M360 240 V300', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_phys', x: 810, y: 48, t: 'physical: the same pages', c: 'mart' },
      { id: 'tg_logical', x: 810, y: 308, t: 'logical: rows of chosen tables', c: 'stg' },
      { id: 'tg_fb', x: 600, y: 130, t: 'a long read here can stop vacuum there', c: 'ing' },
      { id: 'tg_full', x: 30, y: 340, t: 'a slot that nobody reads fills the disk', c: 'mon' }
    ]
  };

  /* 7. A base backup, the archived log, and a restore to a named point */
  S.backup = {
    w: 1000, h: 400,
    label: 'A base backup is a copy of the data directory. The archive holds every log segment after it. To recover, you start a new server from the base backup and let it replay the archive up to a restore point. The recovered server continues on a new timeline.',
    nodes: [
      { id: 'base', x: 0, y: 50, w: 190, h: 90, t: 'Base backup', s: 'pg_basebackup', c: 'src' },
      { id: 'arch', x: 260, y: 50, w: 190, h: 90, t: 'WAL archive', s: 'archive_command', c: 'air' },
      { id: 'rp', x: 520, y: 50, w: 200, h: 90, t: 'Restore point', s: 'before_mistake', c: 'qual' },
      { id: 'bad', x: 790, y: 50, w: 210, h: 90, t: 'DROP TABLE', s: 'the mistake', c: 'mon' },
      { id: 'new', x: 520, y: 270, w: 200, h: 90, t: 'New server', s: 'base plus the log', c: 'mart' },
      { id: 'tl', x: 790, y: 270, w: 210, h: 90, t: 'Timeline 2', s: 'the table is back', c: 'stg' }
    ],
    edges: [
      { id: 'e1', a: 'base', b: 'arch', d: 'M190 95 H260', n: 1, nb: true },
      { id: 'e2', a: 'arch', b: 'rp', d: 'M450 95 H520', n: 2, nb: true },
      { id: 'e3', a: 'rp', b: 'bad', d: 'M720 95 H790', n: 3, nb: true },
      { id: 'e4', a: 'base', b: 'new', d: 'M95 140 C95 320 380 320 520 320', n: 4, bx: 300, by: 325 },
      { id: 'e5', a: 'arch', b: 'new', d: 'M355 140 C355 230 450 290 520 290', n: 5, bx: 420, by: 230 },
      { id: 'e6', a: 'new', b: 'tl', d: 'M720 315 H790', n: 6, nb: true }
    ],
    tags: [
      { id: 'tg_stop', x: 560, y: 168, t: 'recovery stops here', c: 'qual' },
      { id: 'tg_after', x: 790, y: 168, t: 'lost with the recovery', c: 'mon' }
    ]
  };

  /* 8. The lock queue behind a migration */
  S.queue = {
    w: 1000, h: 400,
    label: 'Session A has read the table and is still open. Session B wants to change the table and has to wait for A. Session C only wants to read, but it waits behind B, because a waiting ALTER TABLE blocks every new reader. A lock timeout lets B give up so that C is not stuck.',
    nodes: [
      { id: 'a', x: 0, y: 30, w: 220, h: 90, t: 'Session A', s: 'reads, still open', c: 'src' },
      { id: 'b', x: 0, y: 160, w: 220, h: 90, t: 'Session B', s: 'ALTER TABLE', c: 'mon' },
      { id: 'c', x: 0, y: 290, w: 220, h: 90, t: 'Session C', s: 'SELECT', c: 'stg' },
      { id: 'tbl', x: 440, y: 150, w: 210, h: 110, t: 'orders', s: 'the table', c: 'mart' },
      { id: 'fix', x: 760, y: 150, w: 240, h: 110, t: 'lock_timeout', s: 'B gives up in time', c: 'qual' }
    ],
    edges: [
      { id: 'e1', a: 'a', b: 'tbl', d: 'M220 75 C340 75 340 180 440 180', n: 1, bx: 336, by: 120 },
      { id: 'e2', a: 'b', b: 'tbl', d: 'M220 205 H440', n: 2, nb: true },
      { id: 'e3', a: 'c', b: 'tbl', d: 'M220 335 C340 335 340 240 440 240', n: 3, bx: 336, by: 296 },
      { id: 'e4', a: 'b', b: 'a', d: 'M110 160 V120', n: 4, k: 'ctl', nb: true },
      { id: 'e5', a: 'c', b: 'b', d: 'M110 290 V250', n: 5, k: 'ctl', nb: true },
      { id: 'e6', a: 'fix', b: 'b', d: 'M760 205 H650', n: 6, k: 'ctl', bx: 706, by: 190 }
    ],
    tags: [
      { id: 'tg_hold', x: 260, y: 28, t: 'holds a share lock', c: 'src' },
      { id: 'tg_wait', x: 270, y: 345, t: 'waits behind B, not behind A', c: 'stg' },
      { id: 'tg_exclusive', x: 450, y: 108, t: 'needs an exclusive lock', c: 'mon' }
    ]
  };
})();
