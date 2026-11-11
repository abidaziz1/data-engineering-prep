/* Diagram specs for the AI data engineering and agentic AI tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The Brewline AI platform on one page                             */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 620, label: 'The Brewline AI platform: documents are parsed, cut into chunks and indexed. A question goes to retrieval, which reads the index. A model writes the answer from the chunks. An agent adds tools, such as a read-only SQL query on the order tables, and loops. Evaluation, traces, safety, cost and release sit around the flow.',
    groups: [
      { id: 'g_src', x: 10, y: 52, w: 250, h: 270, t: 'SOURCES', c: 'src' },
      { id: 'g_data', x: 290, y: 52, w: 800, h: 290, t: 'YOUR DATA PLATFORM', c: 'sf' }
    ],
    nodes: [
      { id: 'd_docs', x: 22, y: 100, w: 226, h: 58, t: 'Documents', s: 'PDF, Word, HTML', c: 'src', k: 'chip' },
      { id: 'd_q', x: 22, y: 178, w: 226, h: 58, t: 'Questions', s: 'from store managers', c: 'src', k: 'chip' },
      { id: 'd_orders', x: 22, y: 256, w: 226, h: 58, t: 'Order tables', s: 'in the warehouse', c: 'src', k: 'chip' },
      { id: 'l_parsed', x: 310, y: 140, w: 200, h: 172, t: 'PARSED TEXT', s: 'clean, with labels', c: 'raw', k: 'layer' },
      { id: 'l_chunks', x: 545, y: 140, w: 200, h: 172, t: 'CHUNKS', s: 'sized for retrieval', c: 'stg', k: 'layer' },
      { id: 'l_index', x: 780, y: 140, w: 280, h: 172, t: 'INDEX', s: 'vectors, words, labels', c: 'mart', k: 'layer' },
      { id: 'c_ret', x: 310, y: 392, w: 240, h: 58, t: 'Retrieval', s: 'search, filter, fuse', c: 'air', k: 'chip' },
      { id: 'c_model', x: 580, y: 392, w: 220, h: 58, t: 'Model', s: 'writes the answer', c: 'con', k: 'chip' },
      { id: 'c_agent', x: 830, y: 392, w: 230, h: 58, t: 'Agent', s: 'loops, tools, approvals', c: 'dbt', k: 'chip' },
      { id: 'p_eval', x: 0, y: 540, w: 208, h: 52, t: 'Evaluation', s: 'scores each change', c: 'qual', k: 'pill' },
      { id: 'p_trace', x: 223, y: 540, w: 208, h: 52, t: 'Traces', s: 'what happened', c: 'mon', k: 'pill' },
      { id: 'p_safe', x: 446, y: 540, w: 208, h: 52, t: 'Safety', s: 'who sees, who does', c: 'sf', k: 'pill' },
      { id: 'p_cost', x: 669, y: 540, w: 208, h: 52, t: 'Cost', s: 'tokens and hours', c: 'snap', k: 'pill' },
      { id: 'p_ship', x: 892, y: 540, w: 208, h: 52, t: 'Release', s: 'ship behind a gate', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1', a: 'd_docs', b: 'l_parsed', d: H(248, 129, 310, 226), n: 1, nb: true },
      { id: 'e2', a: 'l_parsed', b: 'l_chunks', d: 'M510 226 H545', n: 2, bx: 527, by: 198 },
      { id: 'e3', a: 'l_chunks', b: 'l_index', d: 'M745 226 H780', n: 3, bx: 762, by: 198 },
      { id: 'e4', a: 'd_q', b: 'c_ret', d: H(248, 207, 310, 421), n: 4, nb: true },
      { id: 'e5', a: 'l_index', b: 'c_ret', d: V(800, 312, 480, 392), n: 5, bx: 640, by: 358 },
      { id: 'e6', a: 'c_ret', b: 'c_model', d: 'M550 421 H580', n: 6, bx: 565, by: 394 },
      { id: 'e7', a: 'c_model', b: 'c_agent', d: 'M800 421 H830', n: 7, bx: 815, by: 394 },
      { id: 'e8', a: 'd_orders', b: 'c_agent', d: 'M135 314 V486 H945 V450', n: 7, bx: 520, by: 486 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. An ingestion pipeline that is safe to run again                  */
  /* ------------------------------------------------------------------ */
  S.ingest = {
    w: 1100, h: 470, label: 'The ingestion pipeline. Documents are parsed, cleaned and labelled, then cut into chunks. Each chunk gets an id from a hash of its text. Only chunks that are new are embedded and written to the index. A state table remembers the hashes, and a deleted document removes its chunks. A new index is built next to the old one and an alias switches to it.',
    nodes: [
      { id: 'n_files', x: 20, y: 60, w: 220, h: 66, t: 'Raw documents', s: 'PDF, Word, HTML', c: 'src', k: 'chip' },
      { id: 'n_parse', x: 275, y: 60, w: 220, h: 66, t: 'Parse', s: 'text, tables, headings', c: 'raw', k: 'chip' },
      { id: 'n_clean', x: 530, y: 60, w: 250, h: 66, t: 'Clean and label', s: 'headers, PII, who, version', c: 'stg', k: 'chip' },
      { id: 'n_chunk', x: 815, y: 60, w: 250, h: 66, t: 'Chunk', s: 'by structure, sized', c: 'int', k: 'chip' },
      { id: 'n_hash', x: 815, y: 210, w: 250, h: 66, t: 'Hash each chunk', s: 'same text, same id', c: 'mart', k: 'chip' },
      { id: 'n_new', x: 530, y: 210, w: 250, h: 66, t: 'Only the new chunks', s: 'skip what is unchanged', c: 'air', k: 'chip' },
      { id: 'n_embed', x: 275, y: 210, w: 220, h: 66, t: 'Embed', s: 'one model, one version', c: 'con', k: 'chip' },
      { id: 'n_index', x: 20, y: 210, w: 220, h: 66, t: 'Index', s: 'vectors, words, labels', c: 'mart', k: 'chip' },
      { id: 'n_alias', x: 20, y: 370, w: 220, h: 66, t: 'Alias', s: 'which index is live', c: 'ci', k: 'chip' },
      { id: 'n_state', x: 530, y: 370, w: 250, h: 66, t: 'State table', s: 'document and chunk hashes', c: 'sf', k: 'chip' },
      { id: 'n_del', x: 815, y: 370, w: 250, h: 66, t: 'Deletes', s: 'gone document, no chunks', c: 'qual', k: 'chip' }
    ],
    edges: [
      { id: 'i1', a: 'n_files', b: 'n_parse', d: 'M240 93 H275', n: 1, bx: 257, by: 66 },
      { id: 'i2', a: 'n_parse', b: 'n_clean', d: 'M495 93 H530', n: 2, bx: 512, by: 66 },
      { id: 'i3', a: 'n_clean', b: 'n_chunk', d: 'M780 93 H815', n: 3, bx: 797, by: 66 },
      { id: 'i4', a: 'n_chunk', b: 'n_hash', d: 'M940 126 V210', n: 4, bx: 968, by: 168 },
      { id: 'i5', a: 'n_hash', b: 'n_new', d: 'M815 243 H780', n: 5, bx: 797, by: 216 },
      { id: 'i6', a: 'n_new', b: 'n_embed', d: 'M530 243 H495', n: 6, bx: 512, by: 216 },
      { id: 'i7', a: 'n_embed', b: 'n_index', d: 'M275 243 H240', n: 7, bx: 257, by: 216 },
      { id: 'i8', a: 'n_hash', b: 'n_state', d: V(930, 276, 700, 370), n: 5, nb: true },
      { id: 'i9', a: 'n_del', b: 'n_state', d: 'M815 403 H780', n: 8, bx: 797, by: 376 },
      { id: 'i10', a: 'n_state', b: 'n_new', d: 'M655 370 V276', n: 5, nb: true, k: 'ctl' },
      { id: 'i11', a: 'n_index', b: 'n_alias', d: 'M130 276 V370', n: 9, bx: 158, by: 322 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. One question through retrieval and generation                    */
  /* ------------------------------------------------------------------ */
  S.query = {
    w: 1100, h: 590, label: 'One question. It may be rewritten, then a keyword search and a vector search run side by side, each with a filter for who may read and which version is current. The two rankings are fused. The best chunks go into a prompt with the rules, the model writes an answer with citations, a check looks at it, and everything is logged.',
    nodes: [
      { id: 'q_q', x: 20, y: 100, w: 200, h: 70, t: 'Question', s: 'a store manager', c: 'src', k: 'chip' },
      { id: 'q_rw', x: 255, y: 100, w: 210, h: 70, t: 'Rewrite', s: 'optional. Measure it.', c: 'raw', k: 'chip' },
      { id: 'q_kw', x: 510, y: 40, w: 230, h: 66, t: 'Keyword search', s: 'BM25 on the chunks', c: 'stg', k: 'chip' },
      { id: 'q_vec', x: 510, y: 150, w: 230, h: 66, t: 'Vector search', s: 'nearest neighbours', c: 'int', k: 'chip' },
      { id: 'q_fuse', x: 800, y: 100, w: 200, h: 70, t: 'Fuse', s: 'reciprocal rank', c: 'mart', k: 'chip' },
      { id: 'q_filt', x: 510, y: 250, w: 230, h: 60, t: 'Filter inside', s: 'who may read, current', c: 'qual', k: 'chip' },
      { id: 'q_prompt', x: 20, y: 380, w: 230, h: 70, t: 'Prompt', s: 'rules, chunks, question', c: 'air', k: 'chip' },
      { id: 'q_model', x: 285, y: 380, w: 200, h: 70, t: 'Model', s: 'writes with citations', c: 'con', k: 'chip' },
      { id: 'q_check', x: 520, y: 380, w: 220, h: 70, t: 'Check', s: 'cited? allowed?', c: 'qual', k: 'chip' },
      { id: 'q_ans', x: 775, y: 380, w: 225, h: 70, t: 'Answer', s: 'to the manager', c: 'src', k: 'chip' },
      { id: 'q_log', x: 285, y: 500, w: 715, h: 56, t: 'Log: the question, the chunk ids, the answer, tokens and cost', c: 'mon', k: 'bar' }
    ],
    edges: [
      { id: 'a1', a: 'q_q', b: 'q_rw', d: 'M220 135 H255', n: 1, bx: 237, by: 108 },
      { id: 'a2a', a: 'q_rw', b: 'q_kw', d: H(465, 120, 510, 73), n: 2, nb: true },
      { id: 'a2b', a: 'q_rw', b: 'q_vec', d: H(465, 150, 510, 183), n: 2, bx: 488, by: 180 },
      { id: 'a3a', a: 'q_kw', b: 'q_fuse', d: H(740, 73, 800, 120), n: 3, nb: true },
      { id: 'a3b', a: 'q_vec', b: 'q_fuse', d: H(740, 183, 800, 150), n: 3, bx: 770, by: 172 },
      { id: 'a4', a: 'q_filt', b: 'q_vec', d: 'M625 250 V216', n: 3, nb: true, k: 'ctl' },
      { id: 'a5', a: 'q_fuse', b: 'q_prompt', d: 'M900 170 V330 H135 V380', n: 4, bx: 900, by: 250 },
      { id: 'a6', a: 'q_prompt', b: 'q_model', d: 'M250 415 H285', n: 5, bx: 267, by: 388 },
      { id: 'a7', a: 'q_model', b: 'q_check', d: 'M485 415 H520', n: 6, bx: 502, by: 388 },
      { id: 'a8', a: 'q_check', b: 'q_ans', d: 'M740 415 H775', n: 7, bx: 757, by: 388 },
      { id: 'a9', a: 'q_model', b: 'q_log', d: 'M385 450 V500', n: 8, bx: 413, by: 476, k: 'ctl' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. Three ways to find neighbours                                    */
  /* ------------------------------------------------------------------ */
  S.vectors = {
    w: 1100, h: 560, label: 'Three ways to find the nearest vectors. Exact search compares the query with every vector. An IVF index finds the nearest list centres and compares only inside those lists. An HNSW index enters a graph at the top layer and walks down, keeping a list of candidates.',
    groups: [
      { id: 'g_ex', x: 10, y: 40, w: 340, h: 500, t: 'EXACT', c: 'raw' },
      { id: 'g_ivf', x: 380, y: 40, w: 340, h: 500, t: 'IVF: LISTS', c: 'stg' },
      { id: 'g_hn', x: 750, y: 40, w: 340, h: 500, t: 'HNSW: A GRAPH', c: 'int' }
    ],
    nodes: [
      { id: 'x_q', x: 30, y: 100, w: 300, h: 60, t: 'Query vector', s: 'one embedding', c: 'src', k: 'chip' },
      { id: 'x_all', x: 30, y: 230, w: 300, h: 80, t: 'Compare with every vector', ss: ['all of them, every time'], c: 'raw', k: 'chip' },
      { id: 'x_top', x: 30, y: 380, w: 300, h: 60, t: 'Top 10', s: 'always right, slowest', c: 'mart', k: 'chip' },
      { id: 'v_q', x: 400, y: 100, w: 300, h: 60, t: 'Query vector', s: 'one embedding', c: 'src', k: 'chip' },
      { id: 'v_cent', x: 400, y: 215, w: 300, h: 80, t: 'Find the nearest list centres', ss: ['nprobe of the nlist lists'], c: 'stg', k: 'chip' },
      { id: 'v_in', x: 400, y: 330, w: 300, h: 80, t: 'Compare inside those lists', ss: ['a small part of the data'], c: 'int', k: 'chip' },
      { id: 'v_top', x: 400, y: 450, w: 300, h: 60, t: 'Top 10', s: 'misses what sits in another list', c: 'mart', k: 'chip' },
      { id: 'h_q', x: 770, y: 100, w: 300, h: 60, t: 'Query vector', s: 'one embedding', c: 'src', k: 'chip' },
      { id: 'h_top', x: 770, y: 215, w: 300, h: 80, t: 'Enter at the top layer', ss: ['few nodes, long jumps'], c: 'stg', k: 'chip' },
      { id: 'h_walk', x: 770, y: 330, w: 300, h: 80, t: 'Walk down the layers', ss: ['keep efSearch candidates'], c: 'int', k: 'chip' },
      { id: 'h_res', x: 770, y: 450, w: 300, h: 60, t: 'Top 10', s: 'more candidates, better recall', c: 'mart', k: 'chip' }
    ],
    edges: [
      { id: 'k1', a: 'x_q', b: 'x_all', d: 'M180 160 V230', n: 1, bx: 208, by: 196 },
      { id: 'k2', a: 'x_all', b: 'x_top', d: 'M180 310 V380', n: 2, bx: 208, by: 346 },
      { id: 'k3', a: 'v_q', b: 'v_cent', d: 'M550 160 V215', n: 1, bx: 578, by: 188 },
      { id: 'k4', a: 'v_cent', b: 'v_in', d: 'M550 295 V330', n: 2, bx: 578, by: 313 },
      { id: 'k5', a: 'v_in', b: 'v_top', d: 'M550 410 V450', n: 3, bx: 578, by: 432 },
      { id: 'k6', a: 'h_q', b: 'h_top', d: 'M920 160 V215', n: 1, bx: 948, by: 188 },
      { id: 'k7', a: 'h_top', b: 'h_walk', d: 'M920 295 V330', n: 2, bx: 948, by: 313 },
      { id: 'k8', a: 'h_walk', b: 'h_res', d: 'M920 410 V450', n: 3, bx: 948, by: 432 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. The agent loop                                                   */
  /* ------------------------------------------------------------------ */
  S.agent = {
    w: 1100, h: 470, label: 'The agent loop. The user asks. The model chooses a tool call or an answer. A router sends a tool call to the tools, a write goes through an approval first, and the result goes back to the model as an observation. An answer goes to the user. State and a checkpoint are saved after every step.',
    nodes: [
      { id: 'a_user', x: 20, y: 200, w: 190, h: 70, t: 'User', s: 'asks a question', c: 'src', k: 'chip' },
      { id: 'a_model', x: 260, y: 200, w: 230, h: 70, t: 'Model', s: 'tool call or answer', c: 'con', k: 'chip' },
      { id: 'a_route', x: 540, y: 200, w: 200, h: 70, t: 'Router', s: 'which one is it?', c: 'air', k: 'chip' },
      { id: 'a_final', x: 790, y: 200, w: 220, h: 70, t: 'Answer', s: 'back to the user', c: 'mart', k: 'chip' },
      { id: 'a_tools', x: 540, y: 50, w: 200, h: 70, t: 'Tools', s: 'search, SQL, refund', c: 'dbt', k: 'chip' },
      { id: 'a_gate', x: 800, y: 50, w: 210, h: 70, t: 'Approval', s: 'a person for a write', c: 'qual', k: 'chip' },
      { id: 'a_state', x: 260, y: 380, w: 750, h: 56, t: 'State: messages, step count, a checkpoint after every step', c: 'sf', k: 'bar' }
    ],
    edges: [
      { id: 'l1', a: 'a_user', b: 'a_model', d: 'M210 235 H260', n: 1, bx: 235, by: 208 },
      { id: 'l2', a: 'a_model', b: 'a_route', d: 'M490 235 H540', n: 2, bx: 515, by: 208 },
      { id: 'l3', a: 'a_route', b: 'a_tools', d: 'M640 200 V120', n: 3, bx: 668, by: 160 },
      { id: 'l4', a: 'a_tools', b: 'a_gate', d: 'M740 85 H800', n: 4, bx: 770, by: 58 },
      { id: 'l5', a: 'a_tools', b: 'a_model', d: 'M540 85 H375 V200', n: 5, bx: 375, by: 140 },
      { id: 'l6', a: 'a_route', b: 'a_final', d: 'M740 235 H790', n: 6, bx: 765, by: 208 },
      { id: 'l7', a: 'a_final', b: 'a_user', d: 'M900 270 V330 H115 V270', n: 7, bx: 520, by: 330 },
      { id: 'l8', a: 'a_model', b: 'a_state', d: 'M375 270 V380', n: 2, nb: true, k: 'ctl' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. MCP: one app, many servers                                       */
  /* ------------------------------------------------------------------ */
  S.mcp = {
    w: 1100, h: 560, label: 'The Model Context Protocol. A host application, the assistant, runs one client for each server. Each server exposes tools, resources and prompts over stdio or HTTP, and talks to its own backend: the order data, a ticket system, a file share.',
    groups: [{ id: 'g_host', x: 10, y: 50, w: 300, h: 460, t: 'THE HOST (THE ASSISTANT APP)', c: 'dbt' }],
    nodes: [
      { id: 'm_model', x: 30, y: 110, w: 260, h: 70, t: 'Model and agent loop', s: 'chooses tools', c: 'con', k: 'chip' },
      { id: 'm_c1', x: 30, y: 230, w: 260, h: 56, t: 'Client 1', s: 'one per server', c: 'air', k: 'chip' },
      { id: 'm_c2', x: 30, y: 320, w: 260, h: 56, t: 'Client 2', s: 'one per server', c: 'air', k: 'chip' },
      { id: 'm_c3', x: 30, y: 410, w: 260, h: 56, t: 'Client 3', s: 'one per server', c: 'air', k: 'chip' },
      { id: 'm_s1', x: 450, y: 220, w: 260, h: 76, t: 'Brewline data server', s: 'orders, policies', c: 'stg', k: 'chip' },
      { id: 'm_s2', x: 450, y: 310, w: 260, h: 76, t: 'Ticket server', s: 'create, read', c: 'int', k: 'chip' },
      { id: 'm_s3', x: 450, y: 400, w: 260, h: 76, t: 'Files server', s: 'read documents', c: 'raw', k: 'chip' },
      { id: 'm_b1', x: 820, y: 230, w: 250, h: 56, t: 'DuckDB', s: 'read-only', c: 'src', k: 'chip' },
      { id: 'm_b2', x: 820, y: 320, w: 250, h: 56, t: 'Ticket system', s: 'an API', c: 'src', k: 'chip' },
      { id: 'm_b3', x: 820, y: 410, w: 250, h: 56, t: 'File share', s: 'documents', c: 'src', k: 'chip' }
    ],
    edges: [
      { id: 'p0', a: 'm_model', b: 'm_c1', d: 'M160 180 V230', n: 1, bx: 188, by: 205 },
      { id: 'p1', a: 'm_c1', b: 'm_s1', d: 'M290 258 H450', n: 2, bx: 370, by: 230 },
      { id: 'p2', a: 'm_c2', b: 'm_s2', d: 'M290 348 H450', n: 2, nb: true },
      { id: 'p3', a: 'm_c3', b: 'm_s3', d: 'M290 438 H450', n: 2, nb: true },
      { id: 'p4', a: 'm_s1', b: 'm_b1', d: 'M710 258 H820', n: 3, bx: 765, by: 230 },
      { id: 'p5', a: 'm_s2', b: 'm_b2', d: 'M710 348 H820', n: 3, nb: true },
      { id: 'p6', a: 'm_s3', b: 'm_b3', d: 'M710 438 H820', n: 3, nb: true }
    ],
    tags: [
      { id: 't_msg', x: 340, y: 150, t: 'tools/list, tools/call, resources/read, prompts/get', c: 'air' },
      { id: 't_tr', x: 340, y: 500, t: 'stdio for a local server, HTTP for a remote one', c: 'sf' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. A supervisor and three workers                                   */
  /* ------------------------------------------------------------------ */
  S.multi = {
    w: 1100, h: 560, label: 'A supervisor with three workers. The supervisor reads the question and hands each part to a worker: a policy worker that searches documents, a data worker that runs a read-only query, and a refund worker whose write waits for a person. The workers report back, and the supervisor writes one answer. They share one state.',
    nodes: [
      { id: 'u_user', x: 20, y: 40, w: 220, h: 66, t: 'Store manager', s: 'one question', c: 'src', k: 'chip' },
      { id: 'u_sup', x: 440, y: 40, w: 260, h: 70, t: 'Supervisor', s: 'splits, routes, merges', c: 'dbt', k: 'chip' },
      { id: 'u_ans', x: 860, y: 40, w: 220, h: 66, t: 'One answer', s: 'with its sources', c: 'mart', k: 'chip' },
      { id: 'u_w1', x: 60, y: 250, w: 270, h: 76, t: 'Policy worker', s: 'search documents', c: 'stg', k: 'chip' },
      { id: 'u_w2', x: 415, y: 250, w: 270, h: 76, t: 'Data worker', s: 'read-only SQL', c: 'int', k: 'chip' },
      { id: 'u_w3', x: 770, y: 250, w: 270, h: 76, t: 'Refund worker', s: 'a write tool', c: 'raw', k: 'chip' },
      { id: 'u_gate', x: 770, y: 380, w: 270, h: 56, t: 'Approval gate', s: 'a person decides', c: 'qual', k: 'chip' },
      { id: 'u_state', x: 60, y: 480, w: 980, h: 54, t: 'Shared state: the question, what each worker found, who approved what', c: 'sf', k: 'bar' }
    ],
    edges: [
      { id: 'b1', a: 'u_user', b: 'u_sup', d: 'M240 73 H440', n: 1, bx: 340, by: 46 },
      { id: 'b2a', a: 'u_sup', b: 'u_w1', d: V(500, 110, 195, 250), n: 2, nb: true },
      { id: 'b2b', a: 'u_sup', b: 'u_w2', d: V(570, 110, 550, 250), n: 2, nb: true },
      { id: 'b2c', a: 'u_sup', b: 'u_w3', d: V(640, 110, 905, 250), n: 2, bx: 790, by: 190 },
      { id: 'b3', a: 'u_w3', b: 'u_gate', d: 'M905 326 V380', n: 3, bx: 933, by: 354 },
      { id: 'b4', a: 'u_sup', b: 'u_ans', d: 'M700 75 H860', n: 4, bx: 780, by: 48 },
      { id: 'b5', a: 'u_w2', b: 'u_state', d: 'M550 326 V480', n: 3, nb: true, k: 'ctl' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. A trace                                                          */
  /* ------------------------------------------------------------------ */
  S.trace = {
    w: 1100, h: 520, label: 'A trace. One request becomes one root span for the agent run. Under it sit a span for each model call and each tool call. The spans go to an exporter and then to a trace store, to metrics for tokens, cost and errors, to alerts, and to a set of examples for evaluation.',
    nodes: [
      { id: 't_req', x: 20, y: 40, w: 230, h: 66, t: 'Request', s: 'one question', c: 'src', k: 'chip' },
      { id: 't_root', x: 300, y: 40, w: 280, h: 66, t: 'invoke_agent', s: 'the root span', c: 'dbt', k: 'chip' },
      { id: 't_chat', x: 100, y: 230, w: 270, h: 66, t: 'chat (a model call)', s: 'tokens in, tokens out', c: 'con', k: 'chip' },
      { id: 't_tool', x: 480, y: 170, w: 270, h: 66, t: 'execute_tool', s: 'name, arguments, status', c: 'air', k: 'chip' },
      { id: 't_exp', x: 800, y: 130, w: 260, h: 66, t: 'Exporter', s: 'OpenTelemetry', c: 'sf', k: 'chip' },
      { id: 't_store', x: 800, y: 260, w: 260, h: 60, t: 'Trace store', s: 'search one request', c: 'mon', k: 'chip' },
      { id: 't_met', x: 440, y: 400, w: 200, h: 60, t: 'Metrics', s: 'tokens, cost, errors', c: 'mon', k: 'chip' },
      { id: 't_alert', x: 690, y: 400, w: 180, h: 60, t: 'Alerts', s: 'a limit is crossed', c: 'qual', k: 'chip' },
      { id: 't_eval', x: 910, y: 400, w: 170, h: 60, t: 'Eval set', s: 'bad cases', c: 'ci', k: 'chip' }
    ],
    edges: [
      { id: 'r1', a: 't_req', b: 't_root', d: 'M250 73 H300', n: 1, bx: 275, by: 46 },
      { id: 'r2a', a: 't_root', b: 't_chat', d: V(380, 106, 235, 230), n: 2, nb: true },
      { id: 'r2b', a: 't_root', b: 't_tool', d: V(500, 106, 615, 170), n: 2, bx: 570, by: 140 },
      { id: 'r3a', a: 't_chat', b: 't_exp', d: 'M370 263 H770 V190 H800', n: 3, nb: true },
      { id: 'r3b', a: 't_tool', b: 't_exp', d: 'M750 203 H800', n: 3, bx: 775, by: 176 },
      { id: 'r4', a: 't_exp', b: 't_store', d: 'M930 196 V260', n: 4, bx: 958, by: 228 },
      { id: 'r5', a: 't_store', b: 't_met', d: V(850, 320, 560, 400), n: 5, nb: true },
      { id: 'r6', a: 't_met', b: 't_alert', d: 'M640 430 H690', n: 6, bx: 665, by: 404 },
      { id: 'r7', a: 't_store', b: 't_eval', d: V(1010, 320, 995, 400), n: 7, bx: 1030, by: 360 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 9. Trust boundaries                                                 */
  /* ------------------------------------------------------------------ */
  S.trust = {
    w: 1100, h: 560, label: 'Trust boundaries. Untrusted text, such as documents, web pages, tool output and user messages, flows into the model. The model can call tools that have power: a read-only database, a refund API, e-mail. Controls sit on the boundaries: labels on inputs, least privilege on tools, approval for writes, checks on arguments and outputs, and an audit log.',
    groups: [
      { id: 'g_un', x: 10, y: 40, w: 290, h: 400, t: 'UNTRUSTED TEXT', c: 'qual', dash: true },
      { id: 'g_pw', x: 800, y: 40, w: 290, h: 400, t: 'TOOLS WITH POWER', c: 'dbt' }
    ],
    nodes: [
      { id: 's_doc', x: 30, y: 100, w: 250, h: 62, t: 'Documents', s: 'anyone can write one', c: 'src', k: 'chip' },
      { id: 's_web', x: 30, y: 190, w: 250, h: 62, t: 'Web pages', s: 'not yours', c: 'src', k: 'chip' },
      { id: 's_tool', x: 30, y: 280, w: 250, h: 62, t: 'Tool output', s: 'data, not orders', c: 'src', k: 'chip' },
      { id: 's_user', x: 30, y: 370, w: 250, h: 52, t: 'User messages', s: 'may be hostile', c: 'src', k: 'chip' },
      { id: 's_model', x: 440, y: 180, w: 220, h: 100, t: 'Model', ss: ['obeys the text it reads,', 'data or orders alike'], c: 'con', k: 'chip' },
      { id: 's_db', x: 820, y: 100, w: 250, h: 62, t: 'Read-only SQL', s: 'a role with few tables', c: 'stg', k: 'chip' },
      { id: 's_refund', x: 820, y: 190, w: 250, h: 62, t: 'Refund API', s: 'moves money', c: 'raw', k: 'chip' },
      { id: 's_mail', x: 820, y: 280, w: 250, h: 62, t: 'E-mail', s: 'leaves the company', c: 'raw', k: 'chip' },
      { id: 'k_in', x: 0, y: 480, w: 208, h: 52, t: 'Label inputs', s: 'trusted or not', c: 'qual', k: 'pill' },
      { id: 'k_priv', x: 223, y: 480, w: 208, h: 52, t: 'Least privilege', s: 'only the tools needed', c: 'sf', k: 'pill' },
      { id: 'k_app', x: 446, y: 480, w: 208, h: 52, t: 'Approval', s: 'a person for writes', c: 'ci', k: 'pill' },
      { id: 'k_arg', x: 669, y: 480, w: 208, h: 52, t: 'Check', s: 'arguments and output', c: 'mon', k: 'pill' },
      { id: 'k_log', x: 892, y: 480, w: 208, h: 52, t: 'Audit log', s: 'who asked for what', c: 'snap', k: 'pill' }
    ],
    edges: [
      { id: 'f1', a: 's_doc', b: 's_model', d: H(280, 131, 440, 215), n: 1, nb: true },
      { id: 'f2', a: 's_web', b: 's_model', d: H(280, 221, 440, 230), n: 1, nb: true },
      { id: 'f3', a: 's_tool', b: 's_model', d: H(280, 311, 440, 245), n: 1, nb: true },
      { id: 'f4', a: 's_user', b: 's_model', d: H(280, 396, 440, 262), n: 1, bx: 360, by: 330 },
      { id: 'f5a', a: 's_model', b: 's_db', d: H(660, 215, 820, 131), n: 2, nb: true },
      { id: 'f5b', a: 's_model', b: 's_refund', d: H(660, 230, 820, 221), n: 2, bx: 740, by: 200 },
      { id: 'f5c', a: 's_model', b: 's_mail', d: H(660, 245, 820, 311), n: 2, nb: true }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 10. Serving                                                         */
  /* ------------------------------------------------------------------ */
  S.serve = {
    w: 1100, h: 580, label: 'Serving the assistant. The app calls an API gateway. An agent service calls a retrieval service on a vector database, tools, and a model gateway that talks to the model providers. A cache sits in front of the model calls, a queue feeds workers that embed new documents, and secrets and monitoring serve every part.',
    nodes: [
      { id: 'v_app', x: 20, y: 60, w: 200, h: 66, t: 'Store app', s: 'web and mobile', c: 'src', k: 'chip' },
      { id: 'v_gw', x: 270, y: 60, w: 210, h: 66, t: 'API gateway', s: 'auth, limits', c: 'sf', k: 'chip' },
      { id: 'v_agent', x: 530, y: 60, w: 230, h: 66, t: 'Agent service', s: 'the loop, stateless', c: 'dbt', k: 'chip' },
      { id: 'v_mg', x: 820, y: 60, w: 260, h: 66, t: 'Model gateway', s: 'keys, retries, routing', c: 'con', k: 'chip' },
      { id: 'v_ret', x: 530, y: 220, w: 230, h: 66, t: 'Retrieval service', s: 'search and filters', c: 'air', k: 'chip' },
      { id: 'v_vdb', x: 530, y: 360, w: 230, h: 66, t: 'Vector database', s: 'the live index', c: 'mart', k: 'chip' },
      { id: 'v_cache', x: 820, y: 220, w: 260, h: 66, t: 'Cache', s: 'repeat prompts, answers', c: 'snap', k: 'chip' },
      { id: 'v_state', x: 270, y: 220, w: 210, h: 66, t: 'State store', s: 'threads, checkpoints', c: 'sf', k: 'chip' },
      { id: 'v_q', x: 20, y: 360, w: 200, h: 66, t: 'Queue', s: 'new documents', c: 'raw', k: 'chip' },
      { id: 'v_work', x: 270, y: 360, w: 210, h: 66, t: 'Embed workers', s: 'batch, retries', c: 'stg', k: 'chip' },
      { id: 'v_sec', x: 0, y: 500, w: 260, h: 52, t: 'Secrets', s: 'keys are not in code', c: 'qual', k: 'pill' },
      { id: 'v_mon', x: 280, y: 500, w: 260, h: 52, t: 'Monitoring', s: 'latency, errors, cost', c: 'mon', k: 'pill' },
      { id: 'v_bud', x: 560, y: 500, w: 260, h: 52, t: 'Budgets', s: 'a ceiling for tokens', c: 'snap', k: 'pill' },
      { id: 'v_rel', x: 840, y: 500, w: 260, h: 52, t: 'Release', s: 'canary, rollback', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 's1', a: 'v_app', b: 'v_gw', d: 'M220 93 H270', n: 1, bx: 245, by: 66 },
      { id: 's2', a: 'v_gw', b: 'v_agent', d: 'M480 93 H530', n: 2, bx: 505, by: 66 },
      { id: 's3', a: 'v_agent', b: 'v_mg', d: 'M760 93 H820', n: 3, bx: 790, by: 66 },
      { id: 's4', a: 'v_agent', b: 'v_ret', d: 'M645 126 V220', n: 4, bx: 673, by: 172 },
      { id: 's5', a: 'v_ret', b: 'v_vdb', d: 'M645 286 V360', n: 5, bx: 673, by: 322 },
      { id: 's6', a: 'v_mg', b: 'v_cache', d: 'M950 126 V220', n: 3, bx: 978, by: 172 },
      { id: 's7', a: 'v_agent', b: 'v_state', d: V(560, 126, 375, 220), n: 4, nb: true, k: 'ctl' },
      { id: 's8', a: 'v_q', b: 'v_work', d: 'M220 393 H270', n: 6, bx: 245, by: 366 },
      { id: 's9', a: 'v_work', b: 'v_vdb', d: 'M480 393 H530', n: 7, bx: 505, by: 366 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 11. A release for an AI change                                      */
  /* ------------------------------------------------------------------ */
  S.cicd = {
    w: 1100, h: 460, label: 'The release of an AI change. A change to a prompt, the chunking, the index, the model or the code opens a pull request. Tests and an offline evaluation on the golden set run, and a gate compares the scores with the current system. A passing change goes to a small share of traffic, online monitors watch it, and it is promoted or rolled back.',
    nodes: [
      { id: 'c_chg', x: 20, y: 60, w: 230, h: 70, t: 'A change', s: 'prompt, chunks, model', c: 'src', k: 'chip' },
      { id: 'c_pr', x: 290, y: 60, w: 200, h: 70, t: 'Pull request', s: 'reviewed', c: 'ci', k: 'chip' },
      { id: 'c_test', x: 530, y: 60, w: 230, h: 70, t: 'Tests', s: 'code and contracts', c: 'stg', k: 'chip' },
      { id: 'c_eval', x: 800, y: 60, w: 280, h: 70, t: 'Offline evaluation', s: 'the golden set', c: 'qual', k: 'chip' },
      { id: 'c_gate', x: 800, y: 210, w: 280, h: 70, t: 'Gate', s: 'not worse than today', c: 'dbt', k: 'chip' },
      { id: 'c_can', x: 530, y: 210, w: 230, h: 70, t: 'Canary', s: '5 percent of traffic', c: 'air', k: 'chip' },
      { id: 'c_mon', x: 290, y: 210, w: 200, h: 70, t: 'Online monitors', s: 'errors, cost, feedback', c: 'mon', k: 'chip' },
      { id: 'c_prom', x: 20, y: 210, w: 230, h: 70, t: 'Promote', s: 'or roll back', c: 'mart', k: 'chip' },
      { id: 'c_reg', x: 20, y: 360, w: 1060, h: 56, t: 'Registry: prompt versions, index versions, model names, eval results', c: 'sf', k: 'bar' }
    ],
    edges: [
      { id: 'd1', a: 'c_chg', b: 'c_pr', d: 'M250 95 H290', n: 1, bx: 270, by: 66 },
      { id: 'd2', a: 'c_pr', b: 'c_test', d: 'M490 95 H530', n: 2, bx: 510, by: 66 },
      { id: 'd3', a: 'c_test', b: 'c_eval', d: 'M760 95 H800', n: 3, bx: 780, by: 66 },
      { id: 'd4', a: 'c_eval', b: 'c_gate', d: 'M940 130 V210', n: 4, bx: 968, by: 172 },
      { id: 'd5', a: 'c_gate', b: 'c_can', d: 'M800 245 H760', n: 5, bx: 780, by: 218 },
      { id: 'd6', a: 'c_can', b: 'c_mon', d: 'M530 245 H490', n: 6, bx: 510, by: 218 },
      { id: 'd7', a: 'c_mon', b: 'c_prom', d: 'M290 245 H250', n: 7, bx: 270, by: 218 },
      { id: 'd8', a: 'c_gate', b: 'c_reg', d: 'M1010 280 V360', n: 4, nb: true, k: 'ctl' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 12. Data for a model                                                */
  /* ------------------------------------------------------------------ */
  S.models = {
    w: 1100, h: 460, label: 'Data for a model. Sources are filtered and de-duplicated, written in a training format, and split by group so that the validation set holds facts that training never saw. A training run produces a model that is scored against the current one and, if it is better, registered. Production feedback flows back into new examples.',
    nodes: [
      { id: 'f_src', x: 20, y: 60, w: 220, h: 70, t: 'Sources', s: 'answers, tickets, docs', c: 'src', k: 'chip' },
      { id: 'f_clean', x: 280, y: 60, w: 230, h: 70, t: 'Filter and de-duplicate', s: 'quality, PII, repeats', c: 'raw', k: 'chip' },
      { id: 'f_fmt', x: 550, y: 60, w: 220, h: 70, t: 'Format', s: 'JSONL, chat turns', c: 'stg', k: 'chip' },
      { id: 'f_split', x: 810, y: 60, w: 270, h: 70, t: 'Split by group', s: 'no leaks into validation', c: 'qual', k: 'chip' },
      { id: 'f_train', x: 810, y: 210, w: 270, h: 70, t: 'Train', s: 'full or LoRA', c: 'con', k: 'chip' },
      { id: 'f_eval', x: 550, y: 210, w: 220, h: 70, t: 'Evaluate', s: 'against the current model', c: 'mon', k: 'chip' },
      { id: 'f_reg', x: 280, y: 210, w: 230, h: 70, t: 'Register', s: 'version, data, scores', c: 'sf', k: 'chip' },
      { id: 'f_prod', x: 20, y: 210, w: 220, h: 70, t: 'Production', s: 'serves and collects', c: 'mart', k: 'chip' },
      { id: 'f_fb', x: 40, y: 360, w: 780, h: 56, t: 'Feedback: thumbs, edits and escalations become new examples', c: 'snap', k: 'bar' }
    ],
    edges: [
      { id: 'g1', a: 'f_src', b: 'f_clean', d: 'M240 95 H280', n: 1, bx: 260, by: 66 },
      { id: 'g2', a: 'f_clean', b: 'f_fmt', d: 'M510 95 H550', n: 2, bx: 530, by: 66 },
      { id: 'g3', a: 'f_fmt', b: 'f_split', d: 'M770 95 H810', n: 3, bx: 790, by: 66 },
      { id: 'g4', a: 'f_split', b: 'f_train', d: 'M945 130 V210', n: 4, bx: 973, by: 172 },
      { id: 'g5', a: 'f_train', b: 'f_eval', d: 'M810 245 H770', n: 5, bx: 790, by: 218 },
      { id: 'g6', a: 'f_eval', b: 'f_reg', d: 'M550 245 H510', n: 6, bx: 530, by: 218 },
      { id: 'g7', a: 'f_reg', b: 'f_prod', d: 'M280 245 H240', n: 7, bx: 260, by: 218 },
      { id: 'g8', a: 'f_prod', b: 'f_fb', d: 'M130 280 V360', n: 8, bx: 158, by: 322 },
      { id: 'g9', a: 'f_fb', b: 'f_src', d: 'M820 388 H1090 V20 H130 V60', n: 8, nb: true, k: 'ctl' }
    ]
  };
})();
