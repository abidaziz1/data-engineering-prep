/* Diagram specs for the Apache Kafka for data engineers tutorial. Plain data: nodes, edges, tags. shared/js/graph.js draws them.
   The small builder below turns a grid position (column, row) into pixels and draws a straight or curved arrow between two nodes, so a diagram is a list
   of nodes and a list of arrows. Titles stay under about 20 characters and subtitles under about 28, so that the text fits in a chip.
   The diagrams show how Kafka works. The numbers that belong to the Brewline runs are not in the diagrams; the lessons read them from js/real.js. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  function build(o) {
    var cw = o.cw || 235, ch = o.ch || 66, dx = o.dx || 275, dy = o.dy || 140, x0 = o.x0 || 20, y0 = o.y0 || 60;
    var byId = {}, nodes = [], edges = [];
    o.nodes.forEach(function (t) {
      var opt = t[7] || {};
      var n = { id: t[0], x: Math.round(x0 + t[1] * dx), y: Math.round(y0 + t[2] * dy), w: opt.w || cw, h: opt.h || ch, t: t[3], c: t[5] || 'raw', k: t[6] || 'chip' };
      if (t[4] !== null && t[4] !== undefined) { if (Array.isArray(t[4])) n.ss = t[4]; else n.s = t[4]; }
      byId[n.id] = n;
      nodes.push(n);
    });
    o.edges.forEach(function (t) {
      var a = byId[t[1]], b = byId[t[2]], opt = t[4] || {}, ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2, d, mx, my;
      if (opt.d) { d = opt.d; mx = opt.bx; my = opt.by; }
      else if (Math.abs(ay - by) < 3) {                          /* same row: a straight arrow */
        if (b.x > a.x) { d = 'M' + (a.x + a.w) + ' ' + ay + ' H' + b.x; mx = (a.x + a.w + b.x) / 2; }
        else { d = 'M' + a.x + ' ' + ay + ' H' + (b.x + b.w); mx = (a.x + b.x + b.w) / 2; }
        my = ay - 27;
      } else if (Math.abs(ax - bx) < 3) {                        /* same column: a straight arrow */
        if (b.y > a.y) { d = 'M' + ax + ' ' + (a.y + a.h) + ' V' + b.y; my = (a.y + a.h + b.y) / 2; }
        else { d = 'M' + ax + ' ' + a.y + ' V' + (b.y + b.h); my = (a.y + b.y + b.h) / 2; }
        mx = ax + 28;
      } else if (b.x >= a.x + a.w - 3 || b.x + b.w <= a.x + 3) { /* another column and another row: a horizontal S curve */
        var x1 = b.x > a.x ? a.x + a.w : a.x, x2 = b.x > a.x ? b.x : b.x + b.w;
        d = H(x1, ay, x2, by); mx = (x1 + x2) / 2; my = (ay + by) / 2 - 2;
      } else {                                                   /* overlapping columns: a vertical S curve */
        var y1 = b.y > a.y ? a.y + a.h : a.y, y2 = b.y > a.y ? b.y : b.y + b.h;
        d = V(ax, y1, bx, y2); mx = (ax + bx) / 2 + 28; my = (y1 + y2) / 2;
      }
      var e = { id: t[0], a: t[1], b: t[2], d: d, n: t[3] };
      if (opt.nb) e.nb = true; else { e.bx = Math.round(opt.bx !== undefined ? opt.bx : mx); e.by = Math.round(opt.by !== undefined ? opt.by : my); }
      if (opt.k) e.k = opt.k;
      if (opt.label) e.label = opt.label;
      edges.push(e);
    });
    var spec = { w: o.w || 1100, h: o.h, label: o.label, nodes: nodes, edges: edges };
    if (o.groups) spec.groups = o.groups;
    if (o.tags) spec.tags = o.tags;
    if (o.pk) spec.pk = o.pk;
    return spec;
  }


  /* ------------------------------------------------------------------ */
  /* 1. The Brewline Kafka platform on one page                          */
  /* ------------------------------------------------------------------ */
  S.master = build({
    h: 400, cw: 190, dx: 216,
    label: 'The Brewline Kafka platform on one page. Sources are the tills, the app and the web shop. Producers send records to topics. The brokers store each partition as a log and keep copies. Consumers, Kafka Connect and Kafka Streams read the logs. The results go to the warehouse, dashboards and other services.',
    nodes: [
      ['k_src', 0, 0, 'SOURCES', ['Tills', 'Mobile app', 'Web shop'], 'src', 'layer', { h: 170 }],
      ['k_prod', 1, 0, 'PRODUCERS', ['Batches', 'Keys', 'Retries'], 'stg', 'layer', { h: 170 }],
      ['k_brk', 2, 0, 'BROKERS', ['Topics', 'Partitions', 'Replicas'], 'int', 'layer', { h: 170 }],
      ['k_con', 3, 0, 'READERS', ['Consumer groups', 'Kafka Connect', 'Kafka Streams'], 'mart', 'layer', { h: 170 }],
      ['k_use', 4, 0, 'USE', ['Warehouse', 'Dashboards', 'Services'], 'con', 'layer', { h: 170 }],
      ['x_sch', 0, 1.8, 'Schemas', 'what a record means', 'air', 'pill', { w: 165, h: 56 }],
      ['x_sec', 0.84, 1.8, 'Security', 'logins and ACLs', 'ci', 'pill', { w: 165, h: 56 }],
      ['x_mon', 1.68, 1.8, 'Monitoring', 'lag, ISR, disks', 'mon', 'pill', { w: 165, h: 56 }],
      ['x_test', 2.52, 1.8, 'Tests', 'pytest, a real broker', 'qual', 'pill', { w: 165, h: 56 }],
      ['x_cost', 3.36, 1.8, 'Retention', 'disks times days', 'snap', 'pill', { w: 165, h: 56 }]
    ],
    edges: [
      ['m1', 'k_src', 'k_prod', 1, { bx: 218, by: 96 }],
      ['m2', 'k_prod', 'k_brk', 2, { bx: 434, by: 96 }],
      ['m3', 'k_brk', 'k_con', 3, { bx: 650, by: 96 }],
      ['m4', 'k_con', 'k_use', 4, { bx: 866, by: 96 }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 2. A KRaft cluster                                                  */
  /* ------------------------------------------------------------------ */
  S.cluster = build({
    h: 400,
    label: 'A Kafka cluster in KRaft mode. Producers and consumers talk to brokers. Each broker stores the partitions that it holds as files on its disk, and followers copy the leader. A quorum of controllers keeps the metadata in a log of its own: topics, partitions, who leads, which brokers are alive.',
    nodes: [
      ['c_p', 0, 0, 'Producers', 'tills, app, web shop', 'src'],
      ['c_b1', 1, 0, 'Broker 1', 'leads some partitions', 'stg'],
      ['c_b2', 2, 0, 'Broker 2', 'holds copies', 'stg'],
      ['c_b3', 3, 0, 'Broker 3', 'holds copies', 'stg'],
      ['c_c', 0, 1, 'Consumers', 'groups, Connect, Streams', 'mart'],
      ['c_disk', 1, 1, 'Log on disk', 'segments and indexes', 'snap'],
      ['c_ctl', 2, 1, 'Controllers', 'a quorum of three voters', 'ci'],
      ['c_md', 3, 1, 'Metadata log', 'topics, leaders, brokers', 'mon']
    ],
    edges: [
      ['k1', 'c_p', 'c_b1', 1],
      ['k2', 'c_b1', 'c_b2', 2],
      ['k3', 'c_b2', 'c_b3', 3],
      ['k4', 'c_b1', 'c_disk', 4],
      ['k5', 'c_b1', 'c_c', 5],
      ['k6', 'c_ctl', 'c_md', 6],
      ['k7', 'c_ctl', 'c_b2', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 3. A partition is a log in files                                    */
  /* ------------------------------------------------------------------ */
  S.log = build({
    h: 400,
    label: 'One partition on one broker. A producer appends records to the end of the active segment, a file. When the segment is full, the broker closes it and starts a new one named after its first offset. Index files let a reader find an offset without scanning the file. Consumers read from any offset, and retention deletes whole old segments.',
    nodes: [
      ['l_p', 0, 0, 'Producer', 'sends a batch of records', 'src'],
      ['l_act', 1, 0, 'Active segment', 'the file being written', 'stg'],
      ['l_old', 2, 0, 'Closed segments', 'named by first offset', 'int'],
      ['l_ret', 3, 0, 'Retention', 'deletes old segments', 'qual'],
      ['l_idx', 1, 1, 'Index files', 'offset to file position', 'mon'],
      ['l_c1', 0, 1, 'Consumer A', 'reads from offset 5000', 'mart'],
      ['l_c2', 2, 1, 'Consumer B', 'reads from offset 0', 'mart'],
      ['l_off', 3, 1, 'Offsets', 'a number per record', 'ci']
    ],
    edges: [
      ['k1', 'l_p', 'l_act', 1],
      ['k2', 'l_act', 'l_old', 2],
      ['k3', 'l_old', 'l_ret', 3],
      ['k4', 'l_idx', 'l_act', 4],
      ['k5', 'l_act', 'l_c1', 5],
      ['k6', 'l_old', 'l_c2', 6]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 4. A key picks a partition                                          */
  /* ------------------------------------------------------------------ */
  S.partitions = build({
    h: 400,
    label: 'How a record gets its partition. The key, here the store, goes through the hash function murmur2. The hash is made positive and divided by the number of partitions. The remainder is the partition. The same key always gives the same partition, as long as the number of partitions does not change.',
    nodes: [
      ['p_rec', 0, 0, 'Record', 'key s01, value an order', 'src'],
      ['p_hash', 1, 0, 'murmur2(key)', 'the hash of the key bytes', 'stg'],
      ['p_mod', 2, 0, 'hash mod N', 'N is the partition count', 'int'],
      ['p_p0', 3, 0, 'Partition 0', 'a log of its own', 'mart'],
      ['p_p1', 3, 1, 'Partition 1', 'a log of its own', 'mart'],
      ['p_p2', 2, 1, 'Partition 2', 'a log of its own', 'mart'],
      ['p_cons', 0, 1, 'Consumer group', 'one consumer per partition', 'con'],
      ['p_add', 1, 1, 'Add partitions', 'the keys move', 'qual']
    ],
    edges: [
      ['k1', 'p_rec', 'p_hash', 1],
      ['k2', 'p_hash', 'p_mod', 2],
      ['k3', 'p_mod', 'p_p0', 3],
      ['k4', 'p_mod', 'p_p1', 4],
      ['k5', 'p_mod', 'p_p2', 5],
      ['k6', 'p_p2', 'p_cons', 6],
      ['k7', 'p_add', 'p_mod', 7]
    ],
    tags: [{ id: 'tg_same', x: 20, y: 300, t: 'same key, same partition', c: 'mart' }, { id: 'tg_move', x: 350, y: 300, t: 'more partitions: keys move', c: 'qual' }]
  });

  /* ------------------------------------------------------------------ */
  /* 5. Inside a producer                                                */
  /* ------------------------------------------------------------------ */
  S.produce = build({
    h: 400,
    label: 'What happens inside a producer. The application calls send. The record is serialised, a partitioner picks the partition, and the record waits in a batch for that partition. A sender thread sends full or old batches to the leader of each partition. The leader appends the batch, the followers copy it, and the acknowledgement comes back according to the acks setting.',
    nodes: [
      ['w_app', 0, 0, 'Your code', 'producer.produce(...)', 'src'],
      ['w_ser', 1, 0, 'Serialize', 'key and value to bytes', 'stg'],
      ['w_part', 2, 0, 'Partitioner', 'hash of the key', 'int'],
      ['w_acc', 3, 0, 'Batches', 'one per partition, linger.ms', 'snap'],
      ['w_net', 3, 1, 'Sender thread', 'one request per broker', 'air'],
      ['w_lead', 2, 1, 'Leader broker', 'appends to its log', 'mart'],
      ['w_fol', 1, 1, 'Followers', 'fetch from the leader', 'ing'],
      ['w_ack', 0, 1, 'Acknowledgement', 'acks 0, 1 or all', 'ci']
    ],
    edges: [
      ['k1', 'w_app', 'w_ser', 1],
      ['k2', 'w_ser', 'w_part', 2],
      ['k3', 'w_part', 'w_acc', 3],
      ['k4', 'w_acc', 'w_net', 4],
      ['k5', 'w_net', 'w_lead', 5],
      ['k6', 'w_lead', 'w_fol', 6],
      ['k7', 'w_fol', 'w_ack', 7]
    ],
    tags: [{ id: 'tg_batch', x: 700, y: 300, t: 'fewer, bigger batches', c: 'snap' }]
  });

  /* ------------------------------------------------------------------ */
  /* 6. Replication and failure                                          */
  /* ------------------------------------------------------------------ */
  S.replication = build({
    h: 400,
    label: 'Replication for one partition with three copies. The leader takes the writes. Two followers fetch from it. The in-sync set is the replicas that are caught up. The high watermark is the offset that every in-sync replica has, and consumers read only up to it. When the leader dies, the controller picks a new leader from the in-sync set.',
    nodes: [
      ['r_p', 0, 0, 'Producer', 'acks=all', 'src'],
      ['r_lead', 1, 0, 'Leader', 'broker 1, takes the writes', 'stg'],
      ['r_f1', 2, 0, 'Follower', 'broker 2, fetches', 'ing'],
      ['r_f2', 3, 0, 'Follower', 'broker 3, fetches', 'ing'],
      ['r_isr', 1, 1, 'In-sync replicas', 'the caught-up copies', 'qual'],
      ['r_hw', 2, 1, 'High watermark', 'readable up to here', 'mon'],
      ['r_ctl', 3, 1, 'Controller', 'picks a new leader', 'ci'],
      ['r_c', 0, 1, 'Consumer', 'reads below the mark', 'mart']
    ],
    edges: [
      ['k1', 'r_p', 'r_lead', 1],
      ['k2', 'r_lead', 'r_f1', 2],
      ['k3', 'r_f1', 'r_f2', 3],
      ['k4', 'r_lead', 'r_isr', 4],
      ['k5', 'r_isr', 'r_hw', 5],
      ['k6', 'r_hw', 'r_c', 6],
      ['k7', 'r_ctl', 'r_lead', 7]
    ],
    tags: [{ id: 'tg_min', x: 20, y: 300, t: 'min.insync.replicas', c: 'qual' }, { id: 'tg_lost', x: 350, y: 300, t: 'acks=1 can lose a write', c: 'mon' }]
  });

  /* ------------------------------------------------------------------ */
  /* 7. A consumer group                                                 */
  /* ------------------------------------------------------------------ */
  S.groups = build({
    h: 400,
    label: 'A consumer group. A topic has six partitions. The group coordinator, a broker, hands each partition to one consumer of the group. Each consumer reads its partitions and commits its position to the internal topic __consumer_offsets. Lag is the end of a partition minus the committed offset.',
    nodes: [
      ['g_topic', 0, 0, 'Topic orders', 'six partitions', 'src'],
      ['g_coord', 1, 0, 'Group coordinator', 'a broker, by hash of the group', 'ci'],
      ['g_c1', 2, 0, 'Consumer 1', 'partitions 0, 1, 2', 'mart'],
      ['g_c2', 3, 0, 'Consumer 2', 'partitions 3, 4, 5', 'mart'],
      ['g_off', 2, 1, '__consumer_offsets', 'the committed positions', 'snap'],
      ['g_lag', 1, 1, 'Lag', 'end minus committed', 'mon'],
      ['g_idle', 3, 1, 'Consumer 3', 'idle: no partition left', 'qual'],
      ['g_scale', 0, 1, 'More consumers', 'at most one per partition', 'air']
    ],
    edges: [
      ['k1', 'g_topic', 'g_coord', 1],
      ['k2', 'g_coord', 'g_c1', 2],
      ['k3', 'g_c1', 'g_c2', 3],
      ['k4', 'g_c1', 'g_off', 4],
      ['k5', 'g_off', 'g_lag', 5],
      ['k6', 'g_scale', 'g_idle', 6]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 8. A rebalance                                                      */
  /* ------------------------------------------------------------------ */
  S.rebalance = build({
    h: 400,
    label: 'A rebalance. A new consumer joins the group. In the eager protocol every member gives up all of its partitions, the leader of the group computes a new assignment, and everyone gets partitions again. In the cooperative and the new server-side protocols only the partitions that move are taken away and given to the new member.',
    nodes: [
      ['b_run', 0, 0, 'Group is running', 'A holds all six', 'mart'],
      ['b_join', 1, 0, 'Consumer B joins', 'sends a JoinGroup request', 'src'],
      ['b_rev', 2, 0, 'Revoke', 'eager: all six. Others: three', 'qual'],
      ['b_asg', 3, 0, 'Assign', 'who reads which partition', 'int'],
      ['b_new', 3, 1, 'A: 0, 1, 2', 'B: 3, 4, 5', 'mart'],
      ['b_pause', 2, 1, 'Pause', 'nothing is read meanwhile', 'mon'],
      ['b_coop', 1, 1, 'Incremental', 'the rest keeps reading', 'ing'],
      ['b_srv', 0, 1, 'New protocol', 'the broker assigns', 'ci']
    ],
    edges: [
      ['k1', 'b_run', 'b_join', 1],
      ['k2', 'b_join', 'b_rev', 2],
      ['k3', 'b_rev', 'b_asg', 3],
      ['k4', 'b_asg', 'b_new', 4],
      ['k5', 'b_rev', 'b_pause', 5],
      ['k6', 'b_coop', 'b_pause', 6],
      ['k7', 'b_srv', 'b_coop', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 9. Process and commit                                               */
  /* ------------------------------------------------------------------ */
  S.delivery = build({
    h: 400,
    label: 'A consumer that reads a record, processes it and commits its position. If the position is committed before the work, a crash loses the record: at most once. If it is committed after the work, a crash repeats the record: at least once. With a transaction that writes the output and the position together, the result is exactly once inside Kafka.',
    nodes: [
      ['d_in', 0, 0, 'Input topic', 'orders', 'src'],
      ['d_poll', 1, 0, 'poll()', 'a batch of records', 'stg'],
      ['d_proc', 2, 0, 'Process', 'your work', 'int'],
      ['d_sink', 3, 0, 'Sink', 'a database or a topic', 'mart'],
      ['d_com', 2, 1, 'Commit', 'the offset of the next record', 'ci'],
      ['d_crash', 3, 1, 'A crash here', 'what happens on restart', 'qual'],
      ['d_tx', 1, 1, 'Transaction', 'output and offset together', 'air'],
      ['d_idem', 0, 1, 'Idempotent sink', 'a repeat does no harm', 'snap']
    ],
    edges: [
      ['k1', 'd_in', 'd_poll', 1],
      ['k2', 'd_poll', 'd_proc', 2],
      ['k3', 'd_proc', 'd_sink', 3],
      ['k4', 'd_proc', 'd_com', 4],
      ['k5', 'd_com', 'd_crash', 5],
      ['k6', 'd_tx', 'd_com', 6],
      ['k7', 'd_idem', 'd_sink', 7]
    ],
    tags: [{ id: 'tg_most', x: 20, y: 300, t: 'commit first: at most once', c: 'qual' }, { id: 'tg_least', x: 350, y: 300, t: 'commit last: at least once', c: 'snap' }]
  });

  /* ------------------------------------------------------------------ */
  /* 10. A transaction                                                   */
  /* ------------------------------------------------------------------ */
  S.txn = build({
    h: 400,
    label: 'A transaction in Kafka. The producer registers its transactional id with the transaction coordinator, which fences any older producer with the same id. It writes records to several partitions and sends the consumer positions to the transaction. On commit, the coordinator writes a commit marker into every partition that was touched. A consumer set to read committed does not read past the first open transaction.',
    nodes: [
      ['t_init', 0, 0, 'init_transactions', 'fences the old producer', 'src'],
      ['t_begin', 1, 0, 'begin', 'a transaction starts', 'stg'],
      ['t_out', 2, 0, 'Output records', 'in several partitions', 'int'],
      ['t_off', 3, 0, 'Send offsets', 'the input positions', 'snap'],
      ['t_com', 3, 1, 'Commit', 'a marker in each partition', 'ci'],
      ['t_coord', 2, 1, 'Coordinator', 'state in __transaction_state', 'mon'],
      ['t_rc', 1, 1, 'read_committed', 'stops at the first open one', 'mart'],
      ['t_abort', 0, 1, 'Abort', 'records are skipped', 'qual']
    ],
    edges: [
      ['k1', 't_init', 't_begin', 1],
      ['k2', 't_begin', 't_out', 2],
      ['k3', 't_out', 't_off', 3],
      ['k4', 't_off', 't_com', 4],
      ['k5', 't_com', 't_coord', 5],
      ['k6', 't_coord', 't_rc', 6],
      ['k7', 't_abort', 't_rc', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 11. Retention and compaction                                        */
  /* ------------------------------------------------------------------ */
  S.retention = build({
    h: 400,
    label: 'How a log gets smaller. With the delete policy the broker removes whole closed segments that are older than the retention time or beyond the size limit, judged by the timestamps of the records. With the compact policy a cleaner rewrites old segments and keeps the last record for each key. A record with a key and no value, a tombstone, deletes a key, and is itself removed after a while.',
    nodes: [
      ['x_act', 0, 0, 'Active segment', 'never deleted or cleaned', 'stg'],
      ['x_old', 1, 0, 'Closed segments', 'the head of the log', 'int'],
      ['x_del', 2, 0, 'Delete policy', 'by time or by size', 'qual'],
      ['x_gone', 3, 0, 'Segment deleted', 'the log start moves up', 'snap'],
      ['x_cmp', 1, 1, 'Compact policy', 'the cleaner keeps the last', 'ing'],
      ['x_last', 2, 1, 'Last value per key', 'offsets keep their gaps', 'mart'],
      ['x_tomb', 3, 1, 'Tombstone', 'a key with no value', 'mon'],
      ['x_read', 0, 1, 'A new consumer', 'reads the latest state', 'con']
    ],
    edges: [
      ['k1', 'x_act', 'x_old', 1],
      ['k2', 'x_old', 'x_del', 2],
      ['k3', 'x_del', 'x_gone', 3],
      ['k4', 'x_old', 'x_cmp', 4],
      ['k5', 'x_cmp', 'x_last', 5],
      ['k6', 'x_last', 'x_tomb', 6],
      ['k7', 'x_last', 'x_read', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 12. Kafka Connect                                                   */
  /* ------------------------------------------------------------------ */
  S.connect = build({
    h: 400,
    label: 'Kafka Connect. Workers run connectors. A source connector splits its work into tasks that read from an outside system and write records to Kafka topics, keeping their position in an internal topic. A sink connector does the opposite. Converters turn bytes into data and back, transforms change a record on the way, and a record that cannot be converted can be sent to a dead letter topic.',
    nodes: [
      ['n_ext', 0, 0, 'Outside system', 'files, a database', 'src'],
      ['n_srcc', 1, 0, 'Source connector', 'tasks on the workers', 'stg'],
      ['n_topic', 2, 0, 'Kafka topics', 'records with a converter', 'int'],
      ['n_snkc', 3, 0, 'Sink connector', 'tasks on the workers', 'ing'],
      ['n_tgt', 3, 1, 'Target system', 'files, a warehouse', 'mart'],
      ['n_dlq', 2, 1, 'Dead letter topic', 'records that failed', 'qual'],
      ['n_int', 1, 1, 'Internal topics', 'configs, offsets, status', 'snap'],
      ['n_smt', 0, 1, 'Transforms', 'change a record in flight', 'air']
    ],
    edges: [
      ['k1', 'n_ext', 'n_srcc', 1],
      ['k2', 'n_srcc', 'n_topic', 2],
      ['k3', 'n_topic', 'n_snkc', 3],
      ['k4', 'n_snkc', 'n_tgt', 4],
      ['k5', 'n_snkc', 'n_dlq', 5],
      ['k6', 'n_srcc', 'n_int', 6],
      ['k7', 'n_smt', 'n_srcc', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 13. Change data capture                                             */
  /* ------------------------------------------------------------------ */
  S.cdc = build({
    h: 400,
    label: 'Change data capture with Debezium on PostgreSQL. Every change to a table is first written to the write-ahead log. A logical replication slot lets the Debezium connector read the decoded changes in order and remembers how far it has read. Debezium writes one change event per row change to a topic for each table. If the connector stops, the slot makes the database keep the log.',
    nodes: [
      ['q_pg', 0, 0, 'PostgreSQL', 'orders and customers', 'src'],
      ['q_wal', 1, 0, 'Write-ahead log', 'every change, in order', 'stg'],
      ['q_slot', 2, 0, 'Replication slot', 'where the reader is', 'ci'],
      ['q_dbz', 3, 0, 'Debezium', 'a source connector', 'ing'],
      ['q_top', 3, 1, 'Topic per table', 'key, before, after, op', 'int'],
      ['q_flat', 2, 1, 'Unwrap', 'flat rows for sinks', 'air'],
      ['q_hold', 1, 1, 'WAL kept', 'while the reader is away', 'qual'],
      ['q_con', 0, 1, 'Consumers', 'warehouse, search, cache', 'mart']
    ],
    edges: [
      ['k1', 'q_pg', 'q_wal', 1],
      ['k2', 'q_wal', 'q_slot', 2],
      ['k3', 'q_slot', 'q_dbz', 3],
      ['k4', 'q_dbz', 'q_top', 4],
      ['k5', 'q_top', 'q_flat', 5],
      ['k6', 'q_flat', 'q_con', 6],
      ['k7', 'q_slot', 'q_hold', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 14. Kafka Streams                                                   */
  /* ------------------------------------------------------------------ */
  S.streams = build({
    h: 400,
    label: 'A Kafka Streams application. It reads an input topic, counts orders per store and minute in a state store on local disk, and writes the counts to an output topic. Every change to the state store is also written to a changelog topic, so that the state can be rebuilt on another machine. A step that needs a new key sends the records through a repartition topic first. With exactly-once processing the state, the output and the input position are committed together.',
    nodes: [
      ['s_in', 0, 0, 'Input topic', 'orders-s', 'src'],
      ['s_agg', 1, 0, 'Windowed count', 'per store and minute', 'stg'],
      ['s_store', 2, 0, 'State store', 'RocksDB on local disk', 'snap'],
      ['s_log', 3, 0, 'Changelog topic', 'every change of the store', 'int'],
      ['s_out', 1, 1, 'Output topic', 'order-counts', 'mart'],
      ['s_rep', 2, 1, 'Repartition topic', 'for a new key', 'air'],
      ['s_eos', 3, 1, 'Exactly once', 'one transaction per commit', 'ci'],
      ['s_late', 0, 1, 'Late record', 'dropped after the grace', 'qual']
    ],
    edges: [
      ['k1', 's_in', 's_agg', 1],
      ['k2', 's_agg', 's_store', 2],
      ['k3', 's_store', 's_log', 3],
      ['k4', 's_agg', 's_out', 4],
      ['k5', 's_agg', 's_rep', 5],
      ['k6', 's_out', 's_eos', 6],
      ['k7', 's_late', 's_agg', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 15. Who are you, and what may you do                                */
  /* ------------------------------------------------------------------ */
  S.security = build({
    h: 400,
    label: 'How a broker decides. A client connects to a listener. TLS encrypts the connection and can check certificates. A login with SASL or a client certificate gives the connection a principal, a name such as User:alice. For every request the authorizer looks for an ACL that allows or denies that principal the operation on the resource. Denials are logged.',
    nodes: [
      ['y_cl', 0, 0, 'Client', 'producer or consumer', 'src'],
      ['y_lis', 1, 0, 'Listener', 'SASL_PLAINTEXT or SSL', 'stg'],
      ['y_auth', 2, 0, 'Authentication', 'SCRAM login or certificate', 'ci'],
      ['y_pr', 3, 0, 'Principal', 'User:alice', 'int'],
      ['y_acl', 3, 1, 'Authorizer', 'the ACLs, deny wins', 'qual'],
      ['y_res', 2, 1, 'Resource', 'topic, group, cluster', 'mart'],
      ['y_log', 1, 1, 'Authorizer log', 'who was denied what', 'mon'],
      ['y_no', 0, 1, 'Denied', 'an authorization error', 'snap']
    ],
    edges: [
      ['k1', 'y_cl', 'y_lis', 1],
      ['k2', 'y_lis', 'y_auth', 2],
      ['k3', 'y_auth', 'y_pr', 3],
      ['k4', 'y_pr', 'y_acl', 4],
      ['k5', 'y_acl', 'y_res', 5],
      ['k6', 'y_acl', 'y_log', 6],
      ['k7', 'y_log', 'y_no', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 16. Running a cluster                                               */
  /* ------------------------------------------------------------------ */
  S.ops = build({
    h: 400,
    label: 'Running a cluster. Metrics from the brokers, such as under-replicated partitions, offline partitions and consumer lag, feed alerts. The routine work is a rolling restart for upgrades, moving partitions to a new broker, quotas for noisy clients, and a copy of the data in another cluster for disasters.',
    nodes: [
      ['o_met', 0, 0, 'Metrics', 'JMX from every broker', 'mon'],
      ['o_alert', 1, 0, 'Alerts', 'under-replicated, offline, lag', 'qual'],
      ['o_roll', 2, 0, 'Rolling restart', 'one broker at a time', 'stg'],
      ['o_move', 3, 0, 'Move partitions', 'to a new broker', 'int'],
      ['o_quota', 3, 1, 'Quotas', 'bytes per second per client', 'ci'],
      ['o_up', 2, 1, 'Upgrade', 'feature levels', 'air'],
      ['o_dr', 1, 1, 'Second cluster', 'a copy for disasters', 'snap'],
      ['o_lag', 0, 1, 'Consumer lag', 'the number users feel', 'mart']
    ],
    edges: [
      ['k1', 'o_met', 'o_alert', 1],
      ['k2', 'o_alert', 'o_roll', 2],
      ['k3', 'o_roll', 'o_move', 3],
      ['k4', 'o_move', 'o_quota', 4],
      ['k5', 'o_quota', 'o_up', 5],
      ['k6', 'o_up', 'o_dr', 6],
      ['k7', 'o_lag', 'o_met', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 17. Schemas                                                         */
  /* ------------------------------------------------------------------ */
  S.schemas = build({
    h: 400,
    label: 'Schemas. The producer registers the schema of its records with a registry, which gives it an id and checks it against the older versions. The record in Kafka is a magic byte, the schema id and the compact binary data. The consumer reads the id, fetches the schema once, and decodes the data. A change that breaks the compatibility rule is refused at registration, before any bad record is written.',
    nodes: [
      ['h_prod', 0, 0, 'Producer', 'has the new schema', 'src'],
      ['h_reg', 1, 0, 'Schema registry', 'ids and versions', 'ci'],
      ['h_chk', 2, 0, 'Compatibility', 'backward, forward, full', 'qual'],
      ['h_top', 3, 0, 'Topic', 'id plus binary data', 'int'],
      ['h_des', 3, 1, 'Deserializer', 'reads the id, decodes', 'stg'],
      ['h_cons', 2, 1, 'Consumer', 'gets a record', 'mart'],
      ['h_cache', 1, 1, 'Schema cache', 'one fetch per id', 'snap'],
      ['h_bad', 0, 1, 'Breaking change', 'refused at registration', 'mon']
    ],
    edges: [
      ['k1', 'h_prod', 'h_reg', 1],
      ['k2', 'h_reg', 'h_chk', 2],
      ['k3', 'h_prod', 'h_top', 3, { bx: 440, by: 55 }],
      ['k4', 'h_top', 'h_des', 4],
      ['k5', 'h_des', 'h_cons', 5],
      ['k6', 'h_des', 'h_cache', 6, { bx: 620, by: 330 }],
      ['k7', 'h_chk', 'h_bad', 7]
    ]
  });
})();
