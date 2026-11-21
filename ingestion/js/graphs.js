/* Diagram specs for the ingestion course. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. A sync */
  S.sync = {
    w: 1000, h: 400,
    label: 'A sync reads the shop API page by page, writes the rows into tables of the destination, and saves its state (the cursor) outside the data. Transformations come after the load: that order is called ELT.',
    nodes: [
      { id: 'shop', x: 0, y: 150, w: 170, h: 90, t: 'Shop API', s: 'orders as JSON', c: 'src' },
      { id: 'con', x: 230, y: 150, w: 190, h: 90, t: 'Connector', s: 'reads and pages', c: 'stg' },
      { id: 'dst', x: 480, y: 150, w: 190, h: 90, t: 'Destination', s: 'raw tables', c: 'raw' },
      { id: 'mod', x: 730, y: 150, w: 190, h: 90, t: 'Models', s: 'SQL and dbt', c: 'mart' },
      { id: 'sta', x: 230, y: 300, w: 190, h: 80, t: 'State', s: 'the cursor', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'shop', b: 'con', d: 'M170 195 H230', n: 1, nb: true },
      { id: 'e2', a: 'con', b: 'dst', d: 'M420 195 H480', n: 2, nb: true },
      { id: 'e3', a: 'dst', b: 'mod', d: 'M670 195 H730', n: 3, nb: true },
      { id: 'e4', a: 'con', b: 'sta', d: 'M325 240 V300', n: 4, bx: 360, by: 270 }
    ],
    tags: [
      { id: 'tg_elt', x: 480, y: 70, t: 'ELT: load raw first, transform after', c: 'raw' },
      { id: 'tg_state', x: 480, y: 320, t: 'state lives outside the data', c: 'mon' }
    ]
  };

  /* 2. An incremental load with a cursor */
  S.cursor = {
    w: 1000, h: 400,
    label: 'An incremental load asks the API only for the orders changed since the cursor, merges them into the table by id, and moves the cursor. A deleted order never appears in the answer, and a change that did not move updated_at is not asked for.',
    nodes: [
      { id: 'shop', x: 0, y: 150, w: 170, h: 90, t: 'Shop API', s: 'has updated_at', c: 'src' },
      { id: 'rd', x: 215, y: 150, w: 210, h: 90, t: 'Read', s: 'updated_at >= cursor', c: 'stg' },
      { id: 'mrg', x: 450, y: 150, w: 170, h: 90, t: 'Merge', s: 'on the id', c: 'ing' },
      { id: 'tab', x: 665, y: 150, w: 170, h: 90, t: 'Table', s: 'orders', c: 'raw' },
      { id: 'cur', x: 430, y: 300, w: 210, h: 80, t: 'Cursor', s: 'the last updated_at', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'shop', b: 'rd', d: 'M170 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'rd', b: 'mrg', d: 'M425 195 H450', n: 2, nb: true },
      { id: 'e3', a: 'mrg', b: 'tab', d: 'M620 195 H665', n: 3, nb: true },
      { id: 'e4', a: 'mrg', b: 'cur', d: 'M535 240 V300', n: 4, bx: 570, by: 270 }
    ],
    tags: [
      { id: 'tg_del', x: 20, y: 300, t: 'a deleted order is never asked for', c: 'mon' },
      { id: 'tg_silent', x: 215, y: 70, t: 'no new updated_at: the change is missed', c: 'stg' },
      { id: 'tg_same', x: 590, y: 70, t: 'the same day twice changes nothing', c: 'raw' }
    ]
  };

  /* 3. Schema drift and a contract */
  S.drift = {
    w: 1000, h: 400,
    label: 'A row arrives with a field that the table does not have, or with a value of another type. The loader infers the type, and the schema contract decides: evolve the table, discard the value or the row, or fail the load.',
    nodes: [
      { id: 'row', x: 0, y: 150, w: 170, h: 90, t: 'Source row', s: 'a new field', c: 'src' },
      { id: 'inf', x: 215, y: 150, w: 180, h: 90, t: 'Infer', s: 'a type from values', c: 'stg' },
      { id: 'con', x: 430, y: 150, w: 230, h: 90, t: 'Contract', s: 'evolve, freeze, discard', c: 'mon' },
      { id: 'tab', x: 710, y: 50, w: 190, h: 90, t: 'Table', s: 'a new column', c: 'mart' },
      { id: 'err', x: 710, y: 250, w: 190, h: 90, t: 'Load fails', s: 'nothing is written', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'row', b: 'inf', d: 'M170 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'inf', b: 'con', d: 'M395 195 H430', n: 2, nb: true },
      { id: 'e3', a: 'con', b: 'tab', d: 'M660 175 C685 175 685 95 710 95', n: 3, bx: 685, by: 135 },
      { id: 'e4', a: 'con', b: 'err', d: 'M660 215 C685 215 685 295 710 295', n: 4, bx: 685, by: 255 }
    ],
    tags: [
      { id: 'tg_var', x: 20, y: 300, t: 'text in a number column: a variant column', c: 'stg' },
      { id: 'tg_evolve', x: 440, y: 70, t: 'evolve: the default', c: 'ing' }
    ]
  };

  /* 4. The Airbyte protocol */
  S.protocol = {
    w: 1000, h: 400,
    label: 'A connector is a program. The platform calls it with spec, check, discover or read, and the connector prints one JSON message for each line: RECORD for a row and STATE for a bookmark. The platform writes the rows and saves the state, and gives it back at the next read.',
    nodes: [
      { id: 'srcs', x: 0, y: 150, w: 170, h: 90, t: 'Source', s: 'API or database', c: 'src' },
      { id: 'con', x: 215, y: 150, w: 190, h: 90, t: 'Connector', s: 'a program', c: 'stg' },
      { id: 'plat', x: 455, y: 150, w: 210, h: 90, t: 'Platform', s: 'Airbyte or PyAirbyte', c: 'ing' },
      { id: 'dst', x: 720, y: 150, w: 190, h: 90, t: 'Destination', s: 'tables', c: 'raw' },
      { id: 'sta', x: 465, y: 300, w: 190, h: 80, t: 'Saved state', s: 'the last STATE', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'srcs', b: 'con', d: 'M170 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'con', b: 'plat', d: 'M405 195 H455', n: 2, nb: true },
      { id: 'e3', a: 'plat', b: 'dst', d: 'M665 195 H720', n: 3, nb: true },
      { id: 'e4', a: 'plat', b: 'sta', d: 'M555 240 V300', n: 4, bx: 590, by: 270 }
    ],
    tags: [
      { id: 'tg_cmds', x: 215, y: 70, t: 'spec, check, discover, read', c: 'stg' },
      { id: 'tg_msgs', x: 20, y: 300, t: 'RECORD for a row, STATE for a bookmark', c: 'ing' },
      { id: 'tg_back', x: 700, y: 300, t: 'the next read gets the state back', c: 'mon' }
    ]
  };
})();
