/* Diagram specs for the CDC walkthrough. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. The pipeline */
  S.pipeline = {
    w: 1000, h: 400,
    label: 'Postgres writes every change to its log. Debezium reads the log through a replication slot and writes each change to a Kafka topic. Bronze keeps every message as text. Silver merges the changes by their log position, and keeps a delete as a mark. A gate compares silver with the rows of Postgres.',
    nodes: [
      { id: 'pg', x: 0, y: 150, w: 140, h: 90, t: 'Postgres', s: 'the orders', c: 'src' },
      { id: 'dbz', x: 172, y: 150, w: 140, h: 90, t: 'Debezium', s: 'reads the log', c: 'ing' },
      { id: 'kfk', x: 344, y: 150, w: 140, h: 90, t: 'Kafka', s: 'a topic', c: 'raw' },
      { id: 'brz', x: 516, y: 150, w: 140, h: 90, t: 'Bronze', s: 'raw messages', c: 'raw' },
      { id: 'slv', x: 688, y: 150, w: 140, h: 90, t: 'Silver', s: 'current state', c: 'stg' },
      { id: 'gate', x: 860, y: 150, w: 140, h: 90, t: 'Gate', s: 'vs Postgres', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'pg', b: 'dbz', d: 'M140 195 H172', n: 1, nb: true },
      { id: 'e2', a: 'dbz', b: 'kfk', d: 'M312 195 H344', n: 2, nb: true },
      { id: 'e3', a: 'kfk', b: 'brz', d: 'M484 195 H516', n: 3, nb: true },
      { id: 'e4', a: 'brz', b: 'slv', d: 'M656 195 H688', n: 4, nb: true },
      { id: 'e5', a: 'slv', b: 'gate', d: 'M828 195 H860', n: 5, nb: true },
      { id: 'e6', a: 'pg', b: 'gate', d: 'M70 240 C70 370 930 370 930 240', n: 6, bx: 500, by: 340 }
    ],
    tags: [
      { id: 'tg_slot', x: 40, y: 70, t: 'a slot keeps the log', c: 'src' },
      { id: 'tg_lsn', x: 560, y: 70, t: 'ordered by the log position', c: 'stg' },
      { id: 'tg_del', x: 700, y: 290, t: 'a delete is a mark', c: 'mon' }
    ]
  };

  /* 2. The merge by log position */
  S.merge = {
    w: 1000, h: 400,
    label: 'A batch of change events keeps the latest event of each row, by log position. Each one is compared with the row of silver. An event with a newer position is applied: an insert, an update, or a delete mark. An older one, or a repeat, is left alone.',
    nodes: [
      { id: 'bat', x: 0, y: 150, w: 150, h: 90, t: 'A batch', s: 'change events', c: 'src' },
      { id: 'pick', x: 185, y: 150, w: 150, h: 90, t: 'One per row', s: 'the latest lsn', c: 'raw' },
      { id: 'cmp', x: 370, y: 150, w: 150, h: 90, t: 'Is it newer?', s: 'lsn vs the row', c: 'ing' },
      { id: 'slv', x: 555, y: 150, w: 140, h: 90, t: 'Silver', s: 'one per order', c: 'stg' },
      { id: 'upd', x: 740, y: 50, w: 200, h: 90, t: 'Applied', s: 'insert, update, delete', c: 'mart' },
      { id: 'skp', x: 740, y: 250, w: 200, h: 90, t: 'Left alone', s: 'repeat or old event', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'bat', b: 'pick', d: 'M150 195 H185', n: 1, nb: true },
      { id: 'e2', a: 'pick', b: 'cmp', d: 'M335 195 H370', n: 2, nb: true },
      { id: 'e3', a: 'cmp', b: 'slv', d: 'M520 195 H555', n: 3, nb: true },
      { id: 'e4', a: 'slv', b: 'upd', d: 'M695 175 C720 175 720 95 740 95', n: 4, bx: 718, by: 135 },
      { id: 'e5', a: 'slv', b: 'skp', d: 'M695 215 C720 215 720 295 740 295', n: 5, bx: 718, by: 255 }
    ],
    tags: [
      { id: 'tg_replay', x: 20, y: 300, t: 'a batch that runs again', c: 'raw' },
      { id: 'tg_gone', x: 560, y: 300, t: 'a deleted row keeps its lsn', c: 'mon' }
    ]
  };
})();
