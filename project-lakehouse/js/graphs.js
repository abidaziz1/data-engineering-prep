/* Diagram specs for the lakehouse walkthrough. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. The medallion */
  S.medallion = {
    w: 1000, h: 400,
    label: 'Files land in a folder. Bronze keeps every line as raw text, with the file and the line. Silver parses and validates: good rows are merged, and bad rows go to a quarantine with the reason. Gold is rebuilt for the days that changed. A gate compares the layers after every run.',
    nodes: [
      { id: 'files', x: 0, y: 150, w: 150, h: 90, t: 'Files', s: 'JSON lines', c: 'src' },
      { id: 'brz', x: 190, y: 150, w: 150, h: 90, t: 'Bronze', s: 'raw text', c: 'raw' },
      { id: 'slv', x: 380, y: 150, w: 150, h: 90, t: 'Silver', s: 'valid, merged', c: 'stg' },
      { id: 'gld', x: 570, y: 150, w: 150, h: 90, t: 'Gold', s: 'daily revenue', c: 'mart' },
      { id: 'gate', x: 770, y: 150, w: 130, h: 90, t: 'Gate', s: 'layers agree', c: 'ing' },
      { id: 'qua', x: 380, y: 300, w: 150, h: 80, t: 'Quarantine', s: 'bad rows, why', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'files', b: 'brz', d: 'M150 195 H190', n: 1, nb: true },
      { id: 'e2', a: 'brz', b: 'slv', d: 'M340 195 H380', n: 2, nb: true },
      { id: 'e3', a: 'slv', b: 'gld', d: 'M530 195 H570', n: 3, nb: true },
      { id: 'e4', a: 'slv', b: 'qua', d: 'M455 240 V300', n: 4, bx: 490, by: 270 },
      { id: 'e5', a: 'gld', b: 'gate', d: 'M720 195 H770', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_ledger', x: 130, y: 70, t: 'a ledger: a file is read once', c: 'raw' },
      { id: 'tg_merge', x: 420, y: 70, t: 'merge only when newer', c: 'stg' },
      { id: 'tg_days', x: 620, y: 300, t: 'replace whole days', c: 'mart' }
    ]
  };

  /* 2. The merge condition */
  S.merge = {
    w: 1000, h: 400,
    label: 'Each event of a batch is compared with the row of its order in silver. An event is applied only when it is newer. A file delivered twice and an old event that arrives late are both left alone, and a real update is applied.',
    nodes: [
      { id: 'bat', x: 0, y: 150, w: 160, h: 90, t: 'A batch', s: 'events of orders', c: 'src' },
      { id: 'cmp', x: 215, y: 150, w: 210, h: 90, t: 'Is it newer?', s: 'event_time vs row', c: 'ing' },
      { id: 'slv', x: 480, y: 150, w: 160, h: 90, t: 'Silver', s: 'one per order', c: 'stg' },
      { id: 'upd', x: 740, y: 50, w: 200, h: 90, t: 'Updated', s: 'a real change', c: 'mart' },
      { id: 'skp', x: 740, y: 250, w: 200, h: 90, t: 'Left alone', s: 'repeat or old event', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'bat', b: 'cmp', d: 'M160 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'cmp', b: 'slv', d: 'M425 195 H480', n: 2, nb: true },
      { id: 'e3', a: 'slv', b: 'upd', d: 'M640 175 C690 175 690 95 740 95', n: 3, bx: 690, by: 135 },
      { id: 'e4', a: 'slv', b: 'skp', d: 'M640 215 C690 215 690 295 740 295', n: 4, bx: 690, by: 255 }
    ],
    tags: [
      { id: 'tg_replay', x: 20, y: 300, t: 'a replay: same events again', c: 'raw' },
      { id: 'tg_late', x: 215, y: 70, t: 'a late event: an older time', c: 'ing' }
    ]
  };
})();
