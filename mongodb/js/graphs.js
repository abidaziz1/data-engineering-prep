/* Diagram specs for the MongoDB course. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. One order, one document */
  S.model = {
    w: 1000, h: 400,
    label: 'An order is one document in the orders collection. The customer and the lines of the order sit inside it, so one read gets everything. The stores are a separate collection, because many orders share a store and a store changes on its own. A join with $lookup reads them together only when you ask.',
    nodes: [
      { id: 'app', x: 0, y: 150, w: 170, h: 90, t: 'Your app', s: 'writes an order', c: 'src' },
      { id: 'ord', x: 230, y: 130, w: 250, h: 130, t: 'orders', s: 'one document per order', c: 'stg' },
      { id: 'cus', x: 540, y: 30, w: 230, h: 80, t: 'customer', s: 'embedded object', c: 'ing' },
      { id: 'lin', x: 540, y: 150, w: 230, h: 90, t: 'lines', s: 'embedded array', c: 'ing' },
      { id: 'sto', x: 540, y: 290, w: 230, h: 80, t: 'stores', s: 'a collection of its own', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'app', b: 'ord', d: 'M170 195 H230', n: 1, nb: true },
      { id: 'e2', a: 'ord', b: 'cus', d: 'M480 160 C510 160 510 70 540 70', n: 2, bx: 510, by: 115 },
      { id: 'e3', a: 'ord', b: 'lin', d: 'M480 195 H540', n: 3, nb: true },
      { id: 'e4', a: 'ord', b: 'sto', d: 'M480 230 C510 230 510 330 540 330', n: 4, bx: 510, by: 280 }
    ],
    tags: [
      { id: 'tg_embed', x: 790, y: 90, t: 'read together, written together', c: 'ing' },
      { id: 'tg_ref', x: 790, y: 300, t: 'shared: a reference and $lookup', c: 'mart' },
      { id: 'tg_limit', x: 20, y: 300, t: 'a document is at most 16 MB', c: 'stg' }
    ]
  };

  /* 2. An aggregation pipeline */
  S.pipeline = {
    w: 1000, h: 400,
    label: 'A pipeline is a list of stages. Each stage takes the documents of the one before and hands on new ones. $match keeps some, $unwind makes one document for each line of an array, $group adds them up, and $sort puts the groups in order.',
    nodes: [
      { id: 'src', x: 0, y: 150, w: 160, h: 90, t: 'orders', s: 'the collection', c: 'src' },
      { id: 'mat', x: 205, y: 150, w: 170, h: 90, t: '$match', s: 'keep some', c: 'stg' },
      { id: 'unw', x: 420, y: 150, w: 170, h: 90, t: '$unwind', s: 'one per line', c: 'ing' },
      { id: 'grp', x: 635, y: 150, w: 170, h: 90, t: '$group', s: 'add them up', c: 'raw' },
      { id: 'srt', x: 850, y: 150, w: 140, h: 90, t: '$sort', s: 'in order', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'src', b: 'mat', d: 'M160 195 H205', n: 1, nb: true },
      { id: 'e2', a: 'mat', b: 'unw', d: 'M375 195 H420', n: 2, nb: true },
      { id: 'e3', a: 'unw', b: 'grp', d: 'M590 195 H635', n: 3, nb: true },
      { id: 'e4', a: 'grp', b: 'srt', d: 'M805 195 H850', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_early', x: 120, y: 70, t: 'filter early: fewer documents', c: 'stg' },
      { id: 'tg_grow', x: 380, y: 270, t: 'unwind makes more documents', c: 'ing' },
      { id: 'tg_small', x: 640, y: 70, t: 'group makes few', c: 'raw' }
    ]
  };

  /* 3. A change stream */
  S.stream = {
    w: 1000, h: 400,
    label: 'Every write goes to the oplog of the replica set. A change stream reads it and gives your job one event for each insert, update or delete, with a resume token. A job that stops can start again from its last token and miss nothing that the oplog still holds.',
    nodes: [
      { id: 'app', x: 0, y: 150, w: 170, h: 90, t: 'Writes', s: 'any change', c: 'src' },
      { id: 'log', x: 220, y: 150, w: 180, h: 90, t: 'Oplog', s: 'the replica set log', c: 'raw' },
      { id: 'str', x: 450, y: 150, w: 190, h: 90, t: 'Change stream', s: 'one event per write', c: 'stg' },
      { id: 'job', x: 690, y: 150, w: 150, h: 90, t: 'Your job', s: 'reads events', c: 'ing' },
      { id: 'lake', x: 860, y: 150, w: 130, h: 90, t: 'Lake', s: 'files', c: 'mart' },
      { id: 'tok', x: 450, y: 300, w: 250, h: 80, t: 'Resume token', s: 'where you stopped', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'app', b: 'log', d: 'M170 195 H220', n: 1, nb: true },
      { id: 'e2', a: 'log', b: 'str', d: 'M400 195 H450', n: 2, nb: true },
      { id: 'e3', a: 'str', b: 'job', d: 'M640 195 H690', n: 3, nb: true },
      { id: 'e4', a: 'job', b: 'tok', d: 'M740 240 C740 300 700 330 700 340', n: 4, bx: 735, by: 300 }
    ],
    tags: [
      { id: 'tg_events', x: 220, y: 70, t: 'an update event holds the changed fields', c: 'stg' },
      { id: 'tg_resume', x: 20, y: 320, t: 'resume after a stop, from the token', c: 'mon' }
    ]
  };
})();
