/* Diagram specs for the Microsoft Fabric course. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. The platform: a capacity, a workspace, items, and one copy of the data in OneLake */
  S.platform = {
    w: 1000, h: 400,
    label: 'A capacity is the compute that the organization buys. A workspace is assigned to a capacity and holds items: a lakehouse, a warehouse, a pipeline, a notebook and more. The items store their tables as Delta files in OneLake, so there is one copy of the data that every engine reads.',
    nodes: [
      { id: 'cap', x: 0, y: 150, w: 190, h: 90, t: 'Capacity', s: 'compute you buy', c: 'mon' },
      { id: 'ws', x: 270, y: 150, w: 190, h: 90, t: 'Workspace', s: 'items and people', c: 'stg' },
      { id: 'lh', x: 560, y: 20, w: 200, h: 80, t: 'Lakehouse', s: 'Spark, files, tables', c: 'ing' },
      { id: 'wh', x: 560, y: 160, w: 200, h: 80, t: 'Warehouse', s: 'T-SQL tables', c: 'mart' },
      { id: 'pl', x: 560, y: 300, w: 200, h: 80, t: 'Pipeline', s: 'orchestration', c: 'air' },
      { id: 'ol', x: 830, y: 150, w: 170, h: 90, t: 'OneLake', s: 'one copy', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'cap', b: 'ws', d: 'M190 195 H270', n: 1, nb: true },
      { id: 'e2', a: 'ws', b: 'lh', d: 'M460 175 C510 175 510 60 560 60', n: 2, bx: 512, by: 118 },
      { id: 'e3', a: 'ws', b: 'wh', d: 'M460 200 H560', n: 3, nb: true },
      { id: 'e4', a: 'ws', b: 'pl', d: 'M460 225 C510 225 510 340 560 340', n: 4, bx: 512, by: 282 },
      { id: 'e5', a: 'lh', b: 'ol', d: 'M760 60 C810 60 810 170 830 170', n: 5, bx: 800, by: 112 },
      { id: 'e6', a: 'wh', b: 'ol', d: 'M760 200 H830', n: 6, nb: true }
    ],
    tags: [
      { id: 'tg_share', x: 10, y: 262, t: 'every item shares this compute', c: 'mon' },
      { id: 'tg_one', x: 690, y: 262, t: 'one copy of every table', c: 'raw' }
    ]
  };

  /* 2. A Delta table: Parquet files that are never edited, and a log that says which of them are the table */
  S.delta = {
    w: 1000, h: 400,
    label: 'A write adds new Parquet files to the table folder and then adds one JSON file to the _delta_log folder. The commit is that JSON file. A reader reads the log first, then only the files that the log lists for the version it wants.',
    nodes: [
      { id: 'w', x: 0, y: 150, w: 180, h: 90, t: 'A job writes', s: 'append or merge', c: 'src' },
      { id: 'pq', x: 330, y: 30, w: 210, h: 90, t: 'Parquet files', s: 'never edited', c: 'raw' },
      { id: 'log', x: 330, y: 270, w: 210, h: 90, t: '_delta_log', s: 'one JSON per commit', c: 'air' },
      { id: 'r', x: 710, y: 150, w: 190, h: 90, t: 'A reader', s: 'Spark, SQL, Power BI', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'w', b: 'pq', d: 'M180 175 C255 175 255 75 330 75', n: 1, bx: 256, by: 125 },
      { id: 'e2', a: 'w', b: 'log', d: 'M180 215 C255 215 255 315 330 315', n: 2, bx: 256, by: 265 },
      { id: 'e3', a: 'log', b: 'r', d: 'M540 315 C625 315 625 215 710 215', n: 3, bx: 626, by: 265 },
      { id: 'e4', a: 'pq', b: 'r', d: 'M540 75 C625 75 625 175 710 175', n: 4, bx: 626, by: 125 }
    ],
    tags: [
      { id: 'tg_add', x: 60, y: 36, t: 'files are added, not changed', c: 'raw' },
      { id: 'tg_commit', x: 60, y: 356, t: 'the log file is the commit', c: 'air' },
      { id: 'tg_snap', x: 700, y: 262, t: 'a reader sees one version', c: 'mart' }
    ]
  };

  /* 3. The medallion path of the Brewline orders */
  S.medallion = {
    w: 1000, h: 400,
    label: 'A daily file lands in Files/landing. A notebook appends it to the bronze table as it came, with every column as text. The silver step types the columns, sends the bad rows to a rejects table and merges the good rows by key. The gold step builds the table that the report reads.',
    nodes: [
      { id: 'file', x: 0, y: 150, w: 165, h: 90, t: 'Landing file', s: 'CSV as it came', c: 'src' },
      { id: 'br', x: 205, y: 150, w: 165, h: 90, t: 'Bronze', s: 'text, append only', c: 'raw' },
      { id: 'sv', x: 410, y: 150, w: 165, h: 90, t: 'Silver', s: 'typed, merged', c: 'stg' },
      { id: 'go', x: 615, y: 150, w: 165, h: 90, t: 'Gold', s: 'store and day', c: 'mart' },
      { id: 'rep', x: 820, y: 150, w: 170, h: 90, t: 'Report', s: 'reads gold', c: 'air' },
      { id: 'rej', x: 410, y: 300, w: 165, h: 80, t: 'Rejects', s: 'bad lines, kept', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'file', b: 'br', d: 'M165 195 H205', n: 1, nb: true },
      { id: 'e2', a: 'br', b: 'sv', d: 'M370 195 H410', n: 2, nb: true },
      { id: 'e3', a: 'sv', b: 'go', d: 'M575 195 H615', n: 3, nb: true },
      { id: 'e4', a: 'go', b: 'rep', d: 'M780 195 H820', n: 4, nb: true },
      { id: 'e5', a: 'sv', b: 'rej', d: 'M492 240 V300', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_app', x: 150, y: 70, t: 'append, never change', c: 'raw' },
      { id: 'tg_merge', x: 380, y: 70, t: 'MERGE: safe to repeat', c: 'stg' },
      { id: 'tg_gold', x: 620, y: 70, t: 'the table the report reads', c: 'mart' },
      { id: 'tg_rej', x: 600, y: 330, t: 'nothing is dropped silently', c: 'mon' }
    ]
  };

  /* 4. One copy of the data, several engines */
  S.engines = {
    w: 1000, h: 400,
    label: 'Spark and the Warehouse write Delta tables into OneLake. The SQL analytics endpoint of a lakehouse reads those tables with T-SQL and cannot change them. A Power BI model in Direct Lake mode reads the same files. Other engines can read Delta in OneLake as well.',
    nodes: [
      { id: 'sp', x: 0, y: 20, w: 205, h: 80, t: 'Spark notebook', s: 'reads and writes', c: 'ing' },
      { id: 'wh', x: 0, y: 160, w: 205, h: 80, t: 'Warehouse', s: 'T-SQL writes', c: 'mart' },
      { id: 'ol', x: 400, y: 150, w: 200, h: 100, t: 'OneLake', s: 'Delta tables, one copy', c: 'raw' },
      { id: 'sql', x: 770, y: 20, w: 230, h: 80, t: 'SQL endpoint', s: 'read-only T-SQL', c: 'stg' },
      { id: 'dl', x: 770, y: 160, w: 230, h: 80, t: 'Direct Lake model', s: 'Power BI', c: 'air' },
      { id: 'ext', x: 770, y: 300, w: 230, h: 80, t: 'Other engines', s: 'read Delta', c: 'src' }
    ],
    edges: [
      { id: 'e1', a: 'sp', b: 'ol', d: 'M205 60 C300 60 300 180 400 180', n: 1, bx: 296, by: 120 },
      { id: 'e2', a: 'wh', b: 'ol', d: 'M205 200 H400', n: 2, nb: true },
      { id: 'e3', a: 'ol', b: 'sql', d: 'M600 180 C690 180 690 60 770 60', n: 3, bx: 696, by: 120 },
      { id: 'e4', a: 'ol', b: 'dl', d: 'M600 200 H770', n: 4, nb: true },
      { id: 'e5', a: 'ol', b: 'ext', d: 'M600 220 C690 220 690 340 770 340', n: 5, bx: 696, by: 280 }
    ],
    tags: [
      { id: 'tg_nocopy', x: 380, y: 290, t: 'no copy between the engines', c: 'raw' },
      { id: 'tg_ro', x: 590, y: 20, t: 'it cannot write', c: 'stg' }
    ]
  };

  /* 5. A nightly pipeline that runs three notebooks */
  S.pipeline = {
    w: 1000, h: 400,
    label: 'A schedule starts a pipeline with a parameter, the day to load. The pipeline runs the bronze notebook, then the silver notebook, then the gold notebook, each one only when the one before it succeeded. A failure sends an alert.',
    nodes: [
      { id: 'trg', x: 0, y: 150, w: 170, h: 90, t: 'Schedule', s: 'every night 02:00', c: 'src' },
      { id: 'p', x: 250, y: 150, w: 190, h: 90, t: 'Pipeline', s: 'parameter: day', c: 'stg' },
      { id: 'n1', x: 540, y: 15, w: 190, h: 80, t: 'Notebook 1', s: 'land in bronze', c: 'raw' },
      { id: 'n2', x: 540, y: 160, w: 190, h: 80, t: 'Notebook 2', s: 'merge into silver', c: 'ing' },
      { id: 'n3', x: 540, y: 305, w: 190, h: 80, t: 'Notebook 3', s: 'build gold', c: 'mart' },
      { id: 'al', x: 820, y: 160, w: 175, h: 80, t: 'Alert', s: 'on failure', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'trg', b: 'p', d: 'M170 195 H250', n: 1, nb: true },
      { id: 'e2', a: 'p', b: 'n1', d: 'M440 175 C490 175 490 55 540 55', n: 2, bx: 492, by: 112 },
      { id: 'e3', a: 'n1', b: 'n2', d: 'M635 95 V160', n: 3, nb: true },
      { id: 'e4', a: 'n2', b: 'n3', d: 'M635 240 V305', n: 4, nb: true },
      { id: 'e5', a: 'n2', b: 'al', d: 'M730 200 H820', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_dep', x: 10, y: 60, t: 'the next step runs on success', c: 'stg' },
      { id: 'tg_retry', x: 10, y: 330, t: 'retry a step before you fail', c: 'ing' },
      { id: 'tg_idem', x: 715, y: 290, t: 'a rerun changes nothing', c: 'mon' }
    ]
  };

  /* 6. Capacity: smoothing and throttling */
  S.capacity = {
    w: 1000, h: 400,
    label: 'Jobs from every item of every workspace on the capacity use capacity units. Background work is smoothed over 24 hours, so a spike is paid back later. When the capacity has used up its future capacity, throttling starts: first nothing, then interactive jobs are delayed, then rejected, and after 24 hours of overuse background jobs are rejected too.',
    nodes: [
      { id: 'jobs', x: 0, y: 150, w: 185, h: 90, t: 'Your jobs', s: 'notebooks, queries', c: 'src' },
      { id: 'sm', x: 270, y: 150, w: 185, h: 90, t: 'Smoothing', s: 'spreads the peak', c: 'stg' },
      { id: 'cap', x: 540, y: 150, w: 185, h: 90, t: 'Capacity', s: 'units you bought', c: 'mon' },
      { id: 'thr', x: 810, y: 150, w: 185, h: 90, t: 'Throttling', s: 'delay, then reject', c: 'air' }
    ],
    edges: [
      { id: 'e1', a: 'jobs', b: 'sm', d: 'M185 195 H270', n: 1, nb: true },
      { id: 'e2', a: 'sm', b: 'cap', d: 'M455 195 H540', n: 2, nb: true },
      { id: 'e3', a: 'cap', b: 'thr', d: 'M725 195 H810', n: 3, nb: true }
    ],
    tags: [
      { id: 'tg_bg', x: 250, y: 70, t: 'background work: 24 hours', c: 'stg' },
      { id: 'tg_free', x: 520, y: 290, t: '10 minutes of future use is free', c: 'mon' },
      { id: 'tg_rej', x: 740, y: 70, t: 'then delay, then reject', c: 'air' }
    ]
  };

  /* 7. Direct Lake: a model that reads Delta files, framed on a version */
  S.directlake = {
    w: 1000, h: 400,
    label: 'A Direct Lake semantic model points at Delta tables in OneLake. Framing pins the model to a Delta version. When a query needs a column, the model loads it from the Parquet files into memory. A refresh frames the model again on the newest version. Some situations send a query back to DirectQuery.',
    nodes: [
      { id: 'dl', x: 0, y: 150, w: 175, h: 90, t: 'Delta table', s: 'in OneLake', c: 'raw' },
      { id: 'fr', x: 250, y: 150, w: 175, h: 90, t: 'Framing', s: 'pins a version', c: 'stg' },
      { id: 'mem', x: 490, y: 150, w: 210, h: 90, t: 'Semantic model', s: 'loads on demand', c: 'air' },
      { id: 'rep', x: 790, y: 150, w: 200, h: 90, t: 'Report', s: 'DAX queries', c: 'mart' },
      { id: 'dq', x: 500, y: 300, w: 190, h: 80, t: 'DirectQuery', s: 'the fallback', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'dl', b: 'fr', d: 'M175 195 H250', n: 1, nb: true },
      { id: 'e2', a: 'fr', b: 'mem', d: 'M425 195 H490', n: 2, nb: true },
      { id: 'e3', a: 'mem', b: 'rep', d: 'M700 195 H790', n: 3, nb: true },
      { id: 'e4', a: 'mem', b: 'dq', d: 'M595 240 V300', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_nocopy', x: 20, y: 70, t: 'no copy step', c: 'raw' },
      { id: 'tg_reframe', x: 240, y: 70, t: 'a refresh frames again', c: 'stg' },
      { id: 'tg_fb', x: 720, y: 330, t: 'views can force it', c: 'mon' }
    ]
  };
})();
