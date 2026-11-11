/* Lab widgets for the agent, tool, MCP, trace, safety and fine-tuning missions. Each one registers LAB.W.<kind>.
   What a lab shows comes from js/real.js: a LangGraph agent driven by a scripted model (the model is a list of replies, so the loop, the errors,
   the limits and the approval are real and the choices are not), an MCP server and client that talked over stdio, a SQL guard in front of DuckDB,
   OpenTelemetry spans, and checks on a fine-tuning set. No language model was used. A lab that only does arithmetic says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + inner + '</div></div>'; }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(x) { return '$' + (x >= 100 ? fmtN(x, 0) : x >= 1 ? fmtN(x, 2) : x >= 0.01 ? fmtN(x, 3) : x === 0 ? '0' : x.toPrecision(2)); }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }
  function big(b, span, cls) { return '<div class="big' + (cls ? ' ' + cls : '') + '"><b>' + b + '</b><span>' + span + '</span></div>'; }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n lane-wide">' + esc(label) + '</span><div class="lane-track"><div class="gbar' + (cls ? ' ' + cls : '') + '" style="left:0;width:' + pc + '%">&nbsp;</div></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  function callout(k, t) { return '<div class="callout ' + k + '">' + md(t) + '</div>'; }
  function cut(t, n) { t = String(t); return t.length > n ? t.slice(0, n - 3) + '...' : t; }

  /* ====================== Agent loop lab ====================== */
  (function () {
    var KEYS = ['A', 'B', 'C', 'D', 'D_denied'];
    function pill(role, text) {
      if (role === 'interrupt') return '<span class="pill warn">paused</span>';
      if (role === 'give_up') return '<span class="pill bad">stopped</span>';
      if (role === 'tools') return /ERROR/.test(text) ? '<span class="pill bad">error</span>' : '<span class="pill good">ok</span>';
      return /^answer/.test(text) ? '<span class="pill good">answer</span>' : '<span class="pill">call</span>';
    }
    W.agent = {
      steps: function () { return 3; },
      hint: 'Replay a run, one message at a time.',
      say: function (s, i) {
        return [
          'This is a real LangGraph graph with two nodes, a model and a set of tools, and a router between them. The model is a script, so it always chooses what the recording says. Everything else is real: the messages, the tool calls, the errors. Pick a run, and press the button to read one message at a time. Before you press, say what the model will do next.',
          'Same question, two designs. In a workflow, your code decides the steps and the model only writes the answer. In an agent, the model decides each step. Pick one and read the cost. The agent can handle a question that you did not plan for, and it asks the model more often.',
          'A loop needs a way out. Run C repeats the same call. Without a limit it never stops. Pick a limit and read what the caller gets: a graceful answer, or an exception that your code must catch.'
        ][i];
      },
      mood: function (s, i) { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ag || (A.local.ag = { k: 0, n: 1, w: 'workflow', l: 1 }), h = '<div class="lab">', S = G.table('agent.scenarios'), TR = G.counts('agent.traces');
        if (i === 0) {
          var key = KEYS[st.k], tr = TR[key], n = Math.min(st.n, tr.length), shown = tr.slice(0, n), models = shown.filter(function (x) { return x[0] === 'model'; }).length, tools = shown.filter(function (x) { return x[0] === 'tools'; }).length;
          h += row('Run', chips(KEYS.map(function (x, q) { return q; }), st.k, 'ag-k', function (q) { return S.rows[q][0]; })) +
            '<div class="lab-out">' + big(models, 'model calls so far') + big(tools, 'tool results so far') + big(n + ' of ' + tr.length, 'messages shown') + '</div>' +
            '<ol class="chain">' + shown.map(function (x) { return '<li class="' + (x[0] === 'tools' && !/ERROR/.test(x[1]) ? 'used' : x[0] === 'tools' ? 'skip' : '') + '"><div><b>' + esc(x[0]) + '</b> ' + pill(x[0], x[1]) + '<br><span>' + esc(cut(x[1], 140)) + '</span></div></li>'; }).join('') + '</ol>' +
            '<div class="sel-chips"><button type="button" class="sel-chip" data-act="ag-n" data-v="1"' + (n >= tr.length ? ' disabled' : '') + '>Show the next message</button><button type="button" class="sel-chip" data-act="ag-n" data-v="all">Show all</button><button type="button" class="sel-chip" data-act="ag-n" data-v="0">Restart</button></div>' +
            (n >= tr.length ? callout('tip', '**How it ended:** ' + S.rows[st.k][3] + '. Model calls: ' + S.rows[st.k][1] + ', tool calls: ' + S.rows[st.k][2] + '. ' + (key === 'B' ? 'The error went back to the model as a message, with the allowed values in it, and the model fixed its own argument. An error message written for a model is part of the design of a tool.' : key === 'C' ? 'The model asked for the same thing six times. Nothing in the loop noticed. A limit did.' : key === 'D' ? 'The write did not run until a person approved it. The graph stopped at the interrupt and waited, and nothing was written before the approval.' : key === 'D_denied' ? 'The person said no. The tool did not run, and the model was told so in a message. Look at the final answer: it still says "Done", because the script says it. A real model must be told to report a refusal truthfully, and an evaluation must check that it does.' : 'Two tools, one after the other. The model chose the second call after it read the first result.')) : '') +
            '<p class="lab-note">The model is a script of ' + (key === 'A' ? 'three' : key === 'D' || key === 'D_denied' ? 'two' : 'three') + ' replies. A real model chooses its own, so a real run differs from this one. Graph code: `agent_graph.py`, shown in the mission.</p>';
        } else if (i === 1) {
          var D = G.counts('agent.workflow_vs_agent'), x = D[st.w];
          h += row('Design', chips(['workflow', 'agent'], st.w, 'ag-w')) +
            '<div class="lab-out">' + big(x.model_calls, 'model calls', x.model_calls > 1 ? 'warn' : 'good') + big(x.tool_calls, 'tool calls') + big(x.steps_decided_by, 'decides the steps') + big(x.repeatable ? 'yes' : 'no', 'same steps every time', x.repeatable ? 'good' : 'warn') + '</div>' +
            callout('tip', st.w === 'workflow' ? 'A workflow for this question: search the policies, count the orders, and ask the model once to write the answer. The code decides the order, so the cost is known and a test can check each step. If the question needs a tool that the workflow does not call, it cannot do it.' : 'The agent asked the model to choose each step: three model calls for the same answer. It can take a path nobody wrote, and it can also take a bad one. Plan for a limit, for evaluation of the path, and for a cost that varies from question to question.') +
            '<p class="lab-note">' + esc(D.note) + '</p>';
        } else {
          var L = G.counts('agent.limits'), C = S.rows[2], opts = ['no limit', 'our own limit of ' + L.our_limit + ' steps', 'the library limit (recursion_limit ' + L.recursion_limit_used + ')'];
          h += row('Limit', chips(opts.map(function (x, q) { return q; }), st.l, 'ag-l', function (q) { return opts[q]; })) +
            (st.l === 0 ? '<div class="lab-out">' + big('no end', 'model calls', 'bad') + big('no end', 'tool calls', 'bad') + '</div>' + callout('bad', 'The model keeps asking for the same search, the tool keeps answering, and the loop keeps going. Every pass is a billed model call and a tool call. Something outside has to stop it: a quota, a timeout, or a person, usually after the bill has grown. I did not run this case, for that reason. It is what the loop would do.') :
              st.l === 1 ? '<div class="lab-out">' + big(C[1], 'model calls') + big(C[2], 'tool calls') + big('answer', 'what the caller got', 'good') + '</div>' + callout('good', 'After ' + L.our_limit + ' steps a router sent the run to a node that gives up gracefully: `' + esc(C[3].replace(/^answer: /, '')) + '`. The caller gets an answer it can show, and a trace that says why. This is a limit that you wrote, so you decide what happens at the end.') :
                '<div class="lab-out">' + big(L.recursion_limit_used, 'steps allowed') + big('error', 'what the caller got', 'bad') + '</div>' + callout('warn', 'LangGraph stops a run itself after a number of steps (the `recursion_limit` setting), and it **raises an error**: `' + esc(L.recursion_error) + '` Catch it and turn it into a message, or the user sees a stack trace. Use your own limit for the normal case, and keep this one as a net.')) +
            '<p class="lab-note">Recorded with langgraph ' + L.langgraph + '. A step here is one node run, and the library counts model and tool nodes alike.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'ag-k') { st.k = +v; st.n = 1; }
          if (act === 'ag-n') { st.n = v === 'all' ? 99 : v === '0' ? 1 : st.n + 1; }
          if (act === 'ag-w') st.w = v;
          if (act === 'ag-l') st.l = +v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== SQL guard lab ====================== */
  (function () {
    function summary() { return G.counts('sqlguard.summary'); }
    W.sqlguard = {
      steps: function () { return 2; },
      hint: 'Allow or refuse? Decide before you look.',
      say: function (s, i) {
        return [
          'A model writes SQL for the store managers. Between the model and the database sits a guard that I wrote: it parses the statement with sqlglot, allows one SELECT on three tables, hides three columns and caps the limit. Fourteen statements went through it. For each, say allow or refuse, and then read the verdict and what the database would have done without the guard.',
          'Three layers, each catching what another misses. The guard reads the text. The read-only connection is a permission of the database. The timeout and the limit protect the machine. Read the whole table, and find the statement that only one layer stopped.'
        ][i];
      },
      mood: function (s, i) { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sg || (A.local.sg = { q: 0, g: {} }), h = '<div class="lab">', T = G.table('sqlguard.decisions'), SM = summary();
        if (i === 0) {
          var r = T.rows[st.q], g = st.g[st.q], really = r[2] === 'allowed', done = Object.keys(st.g).length, right = Object.keys(st.g).filter(function (k) { return (st.g[k] === 'allow') === (T.rows[+k][2] === 'allowed'); }).length;
          h += row('What the model wrote', chips(T.rows.map(function (x, n) { return n; }), st.q, 'sg-q', function (n) { return T.rows[n][0]; })) +
            code('model-output.sql', 'sql', r[1].replace(/\.\.\.$/, '')) +
            '<div class="sel-chips"><button type="button" class="sel-chip' + (g === 'allow' ? ' on' : '') + '" data-act="sg-g" data-v="allow">Allow</button><button type="button" class="sel-chip' + (g === 'refuse' ? ' on' : '') + '" data-act="sg-g" data-v="refuse">Refuse</button></div>' +
            (g ? '<div class="callout ' + ((g === 'allow') === really ? 'good' : 'warn') + '"><b>' + ((g === 'allow') === really ? 'Right.' : 'The guard said ' + r[2] + '.') + '</b> ' + esc(r[2]) + (r[3] ? ': ' + esc(r[3]) : '') + '.</div>' +
              '<div class="pair"><div><div class="compiled-h">A read-only connection, no guard</div><div class="expr' + (/^[0-9]+ row/.test(r[4]) && !really ? ' err' : '') + '">' + esc(cut(r[4], 150)) + '</div></div><div><div class="compiled-h">No protection at all (on a copy)</div><div class="expr' + (!/^not run|^failed/.test(r[5]) && !really ? ' err' : '') + '">' + esc(cut(r[5], 150)) + '</div></div></div>' : '') +
            '<p class="lab-note">Answered ' + done + ' of ' + T.rows.length + ', right ' + right + '. Allowed tables: ' + SM.allowed_tables.join(', ') + '. Hidden columns: ' + SM.denied_columns.join(', ') + '. Maximum limit: ' + SM.max_limit + '. DuckDB ' + G.meta('duckdb') + ' and sqlglot ' + G.meta('sqlglot') + '.</p>';
        } else {
          h += '<div class="lab-out">' + big(SM.queries, 'statements') + big(SM.allowed, 'allowed', 'good') + big(SM.refused, 'refused', 'warn') + big(SM.refused_that_the_database_alone_would_have_run, 'refused that a read-only connection alone would have run', 'bad') + '</div>' +
            table(['What the model wrote', 'Guard', 'Read-only connection alone', 'No protection (a copy)'], T.rows.map(function (r) { return [r[0], r[2], cut(r[4], 46), cut(r[5], 46)]; }), null, function (r, ri, ci) { return ci === 1 ? (T.rows[ri][2] === 'refused' ? 'wgood' : '') : ''; }) +
            callout('tip', '**The read-only connection** stopped the drop, the second statement, the file read and the write, with the errors of the database. It did **not** stop `SELECT email FROM customers`: reading a table is allowed on a read-only connection. Only the allow list of the guard stopped it. The two layers cover different things.') +
            callout('tip', '**The timeout** is a third layer. The guard allowed the cross join (it added a limit of 100, which does not help when the work happens before the limit), and the run was interrupted after one second. Put limits on time and on rows in the database role too, not only in the text of the query.') +
            callout('warn', '**A comment is not a second command.** `-- ; DROP TABLE orders` was allowed because the parser reads it as a comment, and it returned two rows. A guard that looks for the word DROP in the text would have refused a harmless query. Parse, do not search.');
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'sg-q') st.q = +v; if (act === 'sg-g') st.g[st.q] = v; A.render(true); };
      }
    };
  })();

  /* ====================== MCP wire lab ====================== */
  (function () {
    var MODES = [['2026-07-28 (no handshake)', 'mcp.wire'], ['2025-11-25 (a handshake first)', 'mcp.wire_legacy']];
    var FILES = [['tool definition', 'mcp/tool_definition.json'], ['tool call', 'mcp/tool_call.json'], ['tool result', 'mcp/tool_result.json']];
    W.mcpwire = {
      steps: function () { return 3; },
      hint: 'Pick a version. Count messages and bytes.',
      say: function (s, i) {
        return [
          'I started a real MCP server as a child process and put a tap on the wire, so every line that the client and the server sent is in this table. The same session ran twice: once with the newest protocol version, once with the older one that starts with a handshake. Pick a version, and compare the messages and the bytes.',
          'Three messages are the whole idea. The server describes a tool with a JSON schema. The client calls it with arguments. The server returns content and a flag that says whether it is an error. Pick one and read the JSON as it went over the wire.',
          'A tool definition is text that the model reads on every request. It is not free. Pick the number of tools of your server and read the tokens that the definitions cost, before the model has said a word.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.mw || (A.local.mw = { m: 0, f: 0, n: 3, sel: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table(MODES[st.m][1]), tot = T.rows.reduce(function (a, r) { return a + r[4]; }, 0), calls = T.rows.filter(function (r) { return r[2] === 'tools/call'; }), cb = calls.reduce(function (a, r) { return a + r[4]; }, 0) / calls.length;
          h += row('Protocol version', chips(MODES.map(function (x, n) { return n; }), st.m, 'mw-m', function (n) { return MODES[n][0]; })) +
            '<div class="lab-out">' + big(T.rows.length, 'messages') + big(fmtN(tot), 'bytes in total') + big(fmtN(cb), 'bytes in an average tools/call request') + '</div>' +
            table(T.cols, T.rows, function (r, ri) { return ri === st.sel ? 'new' : ''; }, null) +
            (st.m === 0 ? code('first request (2026-07-28)', 'json', G.file('mcp/first_request.json')) : '') +
            callout('tip', st.m === 0 ? 'No handshake: the client sends `server/discover` once, and every later request carries the protocol version, the client name and the client capabilities in `_meta`, so a server can answer any request without remembering the client. That is why each request is bigger (about ' + fmtN(cb) + ' bytes) than in the older version, and why any server instance can answer it.' : 'The older version opens with `initialize`, and then sends a notification that the client is ready. The server keeps that session in memory, so a request must reach the same server. Later requests are small because the session holds the details.') +
            '<p class="lab-note">Recorded with the MCP Python SDK ' + G.meta('mcp') + ' over stdio. The two versions are the ones that this release can speak. A protocol changes over time: read the specification of the version you target.</p>';
        } else if (i === 1) {
          var f = FILES[st.f], S = G.counts('mcp.session');
          h += row('Message', chips(FILES.map(function (x, n) { return n; }), st.f, 'mw-f', function (n) { return FILES[n][0]; })) + code(f[1].split('/')[1], 'json', G.file(f[1])) +
            callout('tip', st.f === 0 ? 'The `inputSchema` is JSON Schema, and the status is an `enum`, so a client or a model knows the allowed values. `readOnlyHint: true` tells the host that this tool does not change anything. A hint is information from the server, not a guarantee, so the host should not trust the hint of a server that it does not trust.' : st.f === 1 ? 'The client names the tool and sends `arguments`. The `_meta` block repeats the version and the client, which is the stateless design.' : 'The result holds `content`, a list of typed parts, and `isError`. A tool that fails returns `isError: true` with a text that the model can read. A protocol error (a bad method) is a different thing.') +
            table(['Call', 'Is it an error?', 'What came back'], [['a good call', 'no', cut(S.call_ok.text, 90)], ['a status that is not allowed', 'yes', cut(S.call_bad_argument.text.replace(/\n/g, ' '), 90)], ['a tool that raised', 'yes', cut(S.call_tool_error.text, 90)], ['a tool that does not exist', 'yes', cut(S.call_unknown.text, 90)]], null, function (r, ri, ci) { return ci === 1 ? (r[1] === 'yes' ? 'wbad' : 'wgood') : ''; });
        } else {
          var F = G.counts('mcp.footprint'), n = st.n, tok = Math.round(n * F.chars_per_tool / F.rule_of_thumb_chars_per_token), per1000 = tok * 1000 / 1e6 * 3;
          h += row('Tools on the server', chips([3, 10, 40, 100], st.n, 'mw-n')) +
            '<div class="lab-out">' + big(fmtN(tok), 'tokens of tool definitions in each request', tok > 20000 ? 'bad' : tok > 4000 ? 'warn' : 'good') + big(usd(per1000), 'for 1,000 requests, at an example $3 per million tokens') + '</div>' +
            callout('tip', 'The three recorded tools take **' + F.json_chars_of_tool_definitions + ' characters** of JSON, about ' + F.tokens_for_these_tools + ' tokens at four characters a token (the rule of thumb in the recording, not a measurement of a real tokenizer). That is **' + F.chars_per_tool + ' characters for each tool**, so ' + n + ' such tools cost about ' + fmtN(tok) + ' tokens. Every request pays it, whether the model uses the tools or not.') +
            callout('warn', 'More tools also mean more wrong choices. Keep a server small, write descriptions for a model, and expose only the tools a task needs. Hosts that load tools on demand exist, and you should check what yours does.') +
            '<p class="lab-note">Arithmetic on a recorded size. The price is an example.</p>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'mw-m') st.m = +v; if (act === 'mw-f') st.f = +v; if (act === 'mw-n') st.n = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Trace lab ====================== */
  (function () {
    var QS = [
      ['Which span failed?', function (T, SM) { var bad = T.rows.filter(function (r) { return r[3] === 'ERROR'; })[0]; return 'The span **' + bad[0] + '**, with status ERROR and ' + bad[5] + ' recorded events (' + SM.event_names_on_the_failed_span.join(', ') + '). Its parent, the agent span, is not marked as an error, because the agent recovered: the next tool call worked. A trace tells you about the error that the user never saw.'; }],
      ['How many tokens did the whole run use?', function (T, SM) { return '**' + SM.input_tokens_total + '** input and **' + SM.output_tokens_total + '** output, over ' + SM.model_calls + ' model calls. The input grows with each call (15, then 72, then 115 tokens), because every call carries the whole conversation so far. Cost grows faster than the number of steps.'; }],
      ['How many tool calls were there, and what did they do?', function (T, SM) { return '**' + SM.tool_calls + '** tool calls and **' + SM.tool_errors + '** error. Both were `orders_by_status`: the first with a wrong status, the second with the right one. Without the spans you would see only the final answer, `' + SM.answer + '`.'; }],
      ['What would you alert on?', function () { return 'Errors of a tool as a share of its calls, the input tokens of a run (a loop shows as a long run and a growing count), and the number of model calls of a run. An alert on one failed span is noise, because a retry fixed it. An alert on a rate is a signal.'; }]
    ];
    W.spans = {
      steps: function () { return 2; },
      hint: 'Click a span. Then ask the trace a question.',
      say: function (s, i) {
        return [
          'This is one agent run as OpenTelemetry spans, recorded with the OpenTelemetry SDK. The root span is the agent run. Under it sit a span for each model call and each tool call. Click a span to read its attributes. The attribute names follow the GenAI conventions, which are still in development, so your tools may use older or newer names.',
          'A trace is only worth the questions that it answers. Pick a question, read the answer from the six spans, and notice what you could not know from the final answer alone.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sp || (A.local.sp = { s: 2, q: 0 }), h = '<div class="lab">', T = G.table('otel.spans'), SM = G.counts('otel.summary');
        if (i === 0) {
          var r = T.rows[st.s], attrs = r[4].split(', ');
          h += '<div class="tree">' + T.rows.map(function (x, n) { return '<div class="tn' + (n === st.s ? ' pick' : '') + '" style="--d:' + (x[1] ? 1 : 0) + '"><span class="ty">' + (x[1] ? (x[2] === 'CLIENT' ? 'model' : 'tool') : 'agent') + '</span><button type="button" data-act="sp-s" data-v="' + n + '">' + esc(x[0]) + '</button><span class="ok"><span class="tag ' + (x[3] === 'ERROR' ? 'n' : 'y') + '">' + (x[3] === 'ERROR' ? 'error' : 'ok') + '</span></span></div>'; }).join('') + '</div>' +
            '<div class="lab-out">' + big(r[2], 'span kind') + big(r[3], 'status', r[3] === 'ERROR' ? 'bad' : 'good') + big(r[5], 'events', r[5] ? 'warn' : '') + '</div>' +
            '<ul class="keylist">' + attrs.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
            callout('tip', r[1] === '' ? 'The root span covers the whole run, so its duration is the latency that the user felt, and every other span explains a part of it.' : r[2] === 'CLIENT' ? 'A model call. The two token counts are the numbers that you multiply by a price. Record the model name and the version too, so a change of model shows up in the traces.' : r[3] === 'ERROR' ? 'The tool raised, and the span recorded the exception as events. The agent saw the error as a message and tried again, so the run still ended well.' : 'A tool call. Record its name and the size of its result, and keep the arguments out of the trace if they can hold personal data.') +
            '<p class="lab-note">Recorded with ' + esc(SM.sdk) + '. ' + esc(SM.note) + '</p>';
        } else {
          h += row('Question', chips(QS.map(function (x, n) { return n; }), st.q, 'sp-q', function (n) { return QS[n][0]; })) + callout('good', QS[st.q][1](T, SM)) +
            '<div class="lab-out">' + big(SM.spans, 'spans') + big(SM.model_calls, 'model calls') + big(SM.tool_calls, 'tool calls') + big(SM.input_tokens_total + ' / ' + SM.output_tokens_total, 'tokens in / out') + '</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'sp-s') st.s = +v; if (act === 'sp-q') st.q = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Prompt injection lab ====================== */
  (function () {
    W.defence = {
      steps: function () { return 2; },
      hint: 'Pick a defence. Read what it saved.',
      say: function (s, i) {
        return [
          'A supplier document was edited, and it now contains a sentence that is an order: refund this order to this account. A keyword search on a refund question finds it, because the sentence repeats the words of the question. Retrieval has no idea that text is an order. Read where the poisoned chunk landed.',
          'Four runs of the same attack against the same agent, each with one more defence. The model in these runs is a stand-in that obeys the injected sentence, so I can say nothing about a real model. What the lab shows is what the rest of the system does either way. Pick a run.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.df || (A.local.df = { r: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var R = G.counts('inject.retrieval');
          h += '<div class="callout tip"><b>' + esc(R.question) + '</b></div>' +
            '<div class="lab-out">' + big(R.poisoned_chunk_rank, 'rank of the poisoned chunk', R.poisoned_chunk_rank === 1 ? 'bad' : 'warn') + big(R.right_chunk_rank_without_it, 'rank of the right chunk, without the poisoned one') + big(R.chunks, 'chunks in the index') + '</div>' +
            callout('warn', esc(R.why.charAt(0).toUpperCase() + R.why.slice(1)) + ' The text came in through the data path and sits at the top of the prompt, next to the real policy.') +
            callout('tip', 'A person reading the chunk sees an order that has nothing to do with a refund policy. A model reads it as more text, and an instruction in text can steer a model. The OWASP list of risks for language-model applications names this prompt injection, and the indirect form, through a document, is the one data engineers meet.');
        } else {
          var T = G.table('inject.outcomes'), r = T.rows[st.r], paid = r[2] !== 'none', note = G.counts('inject.note').model;
          h += row('Run', chips(T.rows.map(function (x, n) { return n; }), st.r, 'df-r', function (n) { return T.rows[n][0]; })) +
            '<div class="lab-out">' + big(r[2], 'money refunded', paid ? 'bad' : 'good') + big(r[4], 'a person was asked', r[4] === 'yes' ? 'warn' : '') + '</div>' +
            '<div class="callout tip"><b>Defence:</b> ' + esc(r[1]) + '<br><b>How it ended:</b> ' + esc(r[3]) + '</div>' +
            callout(paid ? 'bad' : 'good', [
              'The assistant had a refund tool, nobody checked, and **EUR 500** went out because of a sentence in a document. Nothing in the model, the prompt or the retrieval stopped it.',
              'The assistant was never given the write tool, so there was nothing to call. This is the strongest defence, and it is free: give an assistant only the tools of its job.',
              'The write tool exists, and every write waits for a person. This time the person said no, so nothing was written. An approval only works if the person sees what the call is, the order and the amount, and not a vague "approve this action".',
              'The tool refuses an order that the conversation never mentioned, and an amount above 50. Even if the model obeys, the tool does not. A tool is the last place where a rule can be enforced in code.'
            ][st.r]) +
            '<p class="lab-note">' + esc(note.charAt(0).toUpperCase() + note.slice(1)) + '</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'df-r') st.r = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== Fine-tuning data lab ====================== */
  (function () {
    W.finetune = {
      steps: function () { return 2; },
      hint: 'Clean the set, then split it honestly.',
      say: function (s, i) {
        return [
          'Brewline wants a small model to answer policy questions, so I generated training examples from the 27 facts. Real data is never clean. I added repeats and spacing variants on purpose. Pick a stage and watch the count. Exact de-duplication on normalised text removes what looks different and is the same.',
          'Now the split. A random split puts several phrasings of the same fact into training and into validation, so the validation score measures memory. A split that groups by fact keeps every phrasing of a fact on one side. Pick a split and count the leaks.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ft || (A.local.ft = { s: 0, p: 0 }), h = '<div class="lab">', D = G.counts('finetune.dataset');
        if (i === 0) {
          var stages = [['generated from the facts', D.generated], ['plus ' + D.repeats_added + ' repeats and ' + D.spacing_variants_added + ' spacing variants', D.after_adding_repeats], ['after exact de-duplication', D.after_exact_dedup], ['after near-duplicate removal', D.after_near_dedup]], max = D.after_adding_repeats;
          h += row('Stage', chips(stages.map(function (x, n) { return n; }), st.s, 'ft-s', function (n) { return stages[n][0]; })) +
            stages.map(function (x, n) { return bar(x[0], x[1], max, String(x[1]), n === st.s ? '' : 'off'); }).join('') +
            '<div class="lab-out">' + big(stages[st.s][1], 'examples', st.s === 1 ? 'warn' : 'good') + big(D.facts, 'facts behind them') + big(fmtN(D.words_per_example_mean, 1), 'words per example on average') + '</div>' +
            callout('tip', [
              'Each fact became several questions and answers, **' + D.generated + '** in all. This is the set before the dirt gets in.',
              'A copy of a file, a re-run of a script and a paste with extra spaces give **' + (D.after_adding_repeats - D.generated) + '** extra rows. The model sees those facts more often, and learns to repeat them. Nobody sees this in the loss.',
              'Normalising the text (case and spaces) and hashing it removed **' + (D.after_adding_repeats - D.after_exact_dedup) + '** rows. The count is back at **' + D.after_exact_dedup + '**.',
              'A near-duplicate check (MinHash again) removed **' + (D.after_exact_dedup - D.after_near_dedup) + '** more. A threshold that is too low removes real variety, so keep the phrasings that differ in meaning and drop the ones that differ in spelling.'
            ][st.s]) +
            '<p class="lab-note">Code: `finetune.py`. The 27 facts and the questions are made up for the Brewline story. A real set needs real questions, written or reviewed by people.</p>';
        } else {
          var T = G.table('finetune.split'), r = T.rows[st.p];
          h += row('Split', chips(T.rows.map(function (x, n) { return n; }), st.p, 'ft-p', function (n) { return T.rows[n][0]; })) +
            '<div class="lab-out">' + big(r[1], 'training examples') + big(r[2], 'validation examples') + big(r[3], 'validation answers that also appear in training', r[3] ? 'bad' : 'good') + '</div>' +
            bar('validation answers seen in training', r[3], r[2], r[3] + ' of ' + r[2], r[3] ? 'bad' : '') +
            callout(r[3] ? 'warn' : 'good', r[3] ? '**All ' + r[3] + '** validation answers also sit in the training set, because the same fact appears in several phrasings and the random split spread them over both sides. The model only has to remember. A high validation score here says nothing about a fact the model has never seen.' : 'Every phrasing of a fact is on one side. A validation answer is a fact that training never showed, so the score now measures what the model can do with something new. It is lower, and it is honest.') +
            '<p class="lab-note">Split by the thing that must not leak: the fact, the customer, the document, the day. Time series are split by date for the same reason.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'ft-s') st.s = v; if (act === 'ft-p') st.p = v; A.render(true); };
      }
    };
  })();

  /* ====================== Checkpoint, pause and replay lab ====================== */
  (function () {
    function toolsOf(trace) { return trace.filter(function (x) { return x[0] === 'model' && /^call /.test(x[1]); }).map(function (x) { return x[1].replace(/^call /, '').replace(/\(.*/, ''); }); }
    W.ckpt = {
      steps: function () { return 4; },
      hint: 'Pick a checkpoint. Then a decision.',
      say: function (s, i) {
        return [
          'Every step of the graph saves a checkpoint: the state and the node that runs next. This is the list of the checkpoints of one real run, from the start to the end. Pick one. A replay from a checkpoint runs every node after it again, and a tool node is a node.',
          'A write tool asks for approval, and the graph stops. The state is saved, and nothing is written. Pick the decision of the person and read what happened to the refund, and what the model is told.',
          'There is a catch in how a paused run continues. When it resumes, the node that asked starts again from its first line. Anything in that node before the question runs a second time. Read the counts of the two runs.',
          'The checkpoints went to a SQLite file. A new graph object, as in a new process, picked up the paused thread from that file and finished it. That is what durable means here: the run does not live in memory.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ck2 || (A.local.ck2 = { c: 2, d: 'approve' }), h = '<div class="lab">', HI = G.table('agent.history'), RP = G.counts('agent.replay'), IN = G.counts('agent.interrupt'), TR = G.counts('agent.traces');
        if (i === 0) {
          var r = HI.rows[st.c], names = toolsOf(TR.A), again = [];
          HI.rows.forEach(function (x, n) { if (x[1] === 'tools' && n >= st.c) again.push(names[HI.rows.slice(0, n).filter(function (y) { return y[1] === 'tools'; }).length]); });
          h += row('Checkpoint', chips(HI.rows.map(function (x, n) { return n; }), st.c, 'ck-c')) +
            '<div class="lab-out">' + big(r[1], 'node that runs next') + big(r[2], 'model calls so far') + big(r[3], 'messages so far') + big(again.length, 'tool calls that run again', again.length ? 'warn' : 'good') + '</div>' +
            '<p class="lab-note">Tools that run again from here: ' + (again.length ? again.map(esc).join(', ') : 'none') + '. Counted from the recorded run.</p>' +
            callout('tip', 'The recording replayed from the first checkpoint whose next node was `tools`, with ' + RP.replayed_from.model_calls + ' model call behind it. The nodes after it ran again, and the tools that ran again were **' + Object.keys(RP.tools_run_again).map(function (k) { return k + ' ' + RP.tools_run_again[k] + ' time'; }).join(', ') + '**. The run ended with ' + RP.final_messages + ' messages, the same as the first time, because the model is a script. A real model may choose differently on a replay, which is what makes it useful for debugging and risky for actions.') +
            '<p class="lab-note">The run has ' + RP.checkpoints + ' checkpoints. A replay of a read is cheap. A replay of a write is a second write unless the write is idempotent.</p>';
        } else if (i === 1) {
          var denied = st.d === 'deny', ev = TR[denied ? 'D_denied' : 'D'], last = ev[ev.length - 2][1];
          h += row('The person says', chips(['approve', 'deny'], st.d, 'ck-d')) +
            '<div class="lab-out">' + big(IN.refunds_before_resume, 'refunds written while it waited', 'good') + big(denied ? IN.refunds_after_deny : IN.refunds_after_approve, 'refunds written after the decision', denied ? 'good' : 'warn') + big(IN.next_node_while_paused.join(', '), 'node that was waiting') + '</div>' +
            code('what the person was asked', 'json', JSON.stringify(IN.payload[0], null, 2)) +
            callout(denied ? 'tip' : 'warn', denied ? 'The tool did not run, and the model was told: `' + esc(last) + '`. Read the final message of the trace: it still says "Done". The script writes it, and a real model has to be told to report a refusal truthfully, and an evaluation has to check that it does.' : 'The tool ran once, after the decision. Before it, nothing was written, although the model had already asked. The question shows the person the tool, the order and the amount, which is what they need to decide.') +
            '<p class="lab-note">The pause is a feature of the graph: the state is saved and the process may end. The decision arrives later, from a person, through the application.</p>';
        } else if (i === 2) {
          var R = G.counts('agent.resume_runs_again'), before = R.tool_calls_before_resume, after = R.tool_calls_after_resume;
          h += table(['Tool', 'Calls before the pause', 'Calls after the resume'], Object.keys(after).sort().map(function (k) { return [k, String(before[k] || 0), String(after[k])]; }), null, function (r, ri, ci) { return ci === 2 && +r[2] > +r[1] && r[0] !== 'issue_refund' ? 'wbad' : ''; }) +
            callout('warn', esc(R.explanation.charAt(0).toUpperCase() + R.explanation.slice(1)) + ' `search_policies` ran **once** before the pause and **twice** in total after the resume. It is a read, so it only cost a call. If it had been a write, it would have written twice.') +
            callout('tip', 'Three habits. Put the `interrupt` as early as you can in a node. Keep the work before it idempotent. Or split the node in two, so that everything before the question is one node and runs once. Test it: count the tool calls before and after a resume, as the recording did.');
        } else {
          var D = G.counts('agent.durable');
          h += '<div class="lab-out">' + big(D.checkpoints_for_the_thread_while_paused, 'checkpoints in the file while it waited') + big(D.refunds_after_resume_in_a_new_graph_object, 'refund written by a new graph object after the resume', 'good') + '</div>' +
            table(['The store', 'Its tables'], [[D.store, D.tables.join(', ')]]) +
            callout('tip', 'The first graph object ran until the pause and was thrown away. A second one, created from nothing but the file and the thread id, resumed the run and wrote the refund. In production the store is a database, and a worker that crashes, a deploy, or three days of waiting for a person do not lose the run.') +
            callout('warn', 'A saved state is data, and it may hold personal data and the whole conversation. Give the store access control and a retention period, and delete old threads. State that is kept for ever is a privacy problem and a cost.');
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ck-c') st.c = +v; if (act === 'ck-d') st.d = v; A.render(true); };
      }
    };
  })();

  /* ====================== Release gate lab ====================== */
  (function () {
    var STAGES = ['Unit tests of the loop (scripted model)', 'Offline evaluation on the golden set', 'Attack set', 'Canary on a share of traffic', 'Promote'];
    function changes() {
      var GD = G.counts('eval.gate_detail'), TS = G.counts('test.summary'), out = [];
      Object.keys(GD.candidates).forEach(function (k) { out.push({ n: k, kind: 'eval', g: GD.candidates[k] }); });
      out.push({ n: 'the step limit removed from the agent', kind: 'test', t: TS.no_limit, file: 'test/pytest_no_limit.txt' });
      out.push({ n: 'the approval removed from the agent', kind: 'test', t: TS.no_approval, file: 'test/pytest_no_approval.txt' });
      return out;
    }
    W.release = {
      steps: function () { return 2; },
      hint: 'Pick a change. See where it stops.',
      say: function (s, i) {
        return [
          'A release pipeline is a series of gates, cheapest first. Pick a change and follow it. Seven changes are here: five changes to retrieval, scored by the gate of mission 6, and two changes that break the agent, caught by the tests of mission 11. All seven results are recorded. The canary and the promotion are not, because nothing ran in production.',
          'Even after the gates, a release goes out to a small share of traffic first. The alias of mission 5 makes the way back one write. Press the button to roll back, and read what it takes.'
        ][i];
      },
      mood: function (s, i) { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.rl || (A.local.rl = { c: 0, live: 'index-v2.db' }), h = '<div class="lab">', C = changes();
        if (i === 0) {
          var c = C[st.c], stage = [], note;
          if (c.kind === 'test') {
            var failed = c.t.failed, name = G.file(c.file).split('\n').filter(function (l) { return /^FAILED/.test(l); })[0].replace(/^FAILED test_agent\.py::/, '').replace(/ - .*/, '');
            stage = [['fail', failed + ' of ' + (c.t.passed + c.t.failed) + ' tests failed: ' + name], ['skip', 'not reached'], ['skip', 'not reached'], ['skip', 'not reached'], ['skip', 'not reached']];
            note = 'The change was stopped at the first gate, in a fraction of a second, with a test that names the rule that it broke. Nothing was evaluated and nothing went near a user.';
          } else {
            var g = c.g;
            stage = [['pass', 'the loop is unchanged, and its tests pass'], [g.verdict, 'hit@3 ' + g.base + ' to ' + g.cand + ', ' + g.worse.length + ' worse, ' + g.better.length + ' better' + (g.reasons.length ? '. ' + g.reasons[0] : '')]];
            if (g.verdict === 'pass') stage = stage.concat([['next', 'would run next: not recorded here'], ['next', 'would run next: not recorded here'], ['next', 'after the gates']]);
            else stage = stage.concat([['skip', 'not reached'], ['skip', 'not reached'], ['skip', 'not reached']]);
            note = g.verdict === 'pass' ? 'It passes the offline gate with no question better or worse. It still goes to the attack set and then to a canary. A pass of one gate is permission to meet the next gate.' : 'The gate stopped it, with a reason and the list of questions that got worse: ' + (g.worse.join(', ') || 'none') + '. ' + (g.better.length ? 'Questions that got better: ' + g.better.join(', ') + '. A trade like this needs a decision, not a pass.' : 'No question got better.');
          }
          h += row('Change', chips(C.map(function (x, n) { return n; }), st.c, 'rl-c', function (n) { return C[n].n; })) +
            '<ol class="chain">' + STAGES.map(function (t, n) { var x = stage[n] || ['skip', '']; return '<li class="' + (x[0] === 'pass' ? 'used' : x[0] === 'skip' || x[0] === 'next' ? 'skip' : '') + '"><div><b>' + esc(t) + '</b> <span class="pill ' + (x[0] === 'pass' ? 'good' : x[0] === 'fail' ? 'bad' : '') + '">' + (x[0] === 'pass' ? 'pass' : x[0] === 'fail' ? 'fail' : x[0] === 'next' ? 'next' : 'not reached') + '</span><br><span>' + esc(x[1]) + '</span></div></li>'; }).join('') + '</ol>' +
            callout(c.kind === 'test' || c.g.verdict === 'fail' ? 'warn' : 'tip', note) +
            '<p class="lab-note">Gates cheapest first: tests take a second, an evaluation takes minutes and costs tokens, a canary takes hours and reaches real users.</p>';
        } else {
          var AL = JSON.parse(G.file('pipeline/alias.json')), live = st.live, back = live === AL.previous;
          h += '<div class="lab-out">' + big(live, 'the alias points here', back ? 'warn' : 'good') + big(AL.model_id, 'embedding model of the new index') + big('one write', 'to switch, either way') + '</div>' +
            '<div class="sel-chips"><button type="button" class="sel-chip" data-act="rl-live" data-v="' + (back ? AL.live : AL.previous) + '">' + (back ? 'Switch to ' + AL.live + ' again' : 'Roll back to ' + AL.previous) + '</button></div>' +
            code('alias.json', 'json', JSON.stringify({ live: live, previous: back ? AL.live : AL.previous, model_id: AL.model_id }, null, 2)) +
            callout('tip', back ? 'Rolled back. Every query is served by the old index again, and the new one is still there for analysis. Nothing was rebuilt.' : 'The new index is live. The old one is kept as `previous`, so that going back is the same one write.') +
            table(['What to watch on a canary', 'An example rule to abort'], [['Tokens per request and cost per answer', 'more than 30 percent above the current release'], ['Tool error rate and steps per run', 'above the 99th percentile of the current release'], ['Failures of the cheap answer checks, and refusals', 'any rise that the gate did not predict'], ['Thumbs down and escalations to a person', 'a rise over a day, on enough traffic to mean something'], ['Latency at the 95th percentile', 'a rise that breaks the promise to the user']]) +
            '<p class="lab-note">The rules in the table are examples that a team writes for itself. The mechanism is the lesson: a small share first, rules written in advance, and a way back that costs one write.</p>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'rl-c') st.c = +v; if (act === 'rl-live') st.live = v; A.render(true); };
      }
    };
  })();

  /* A scene can show only some steps of a lab: {kind: 'tokens', parts: [0]} or {kind: 'tokens', parts: [1, 2]}. The lab then sees its own step numbers. */
  Object.keys(W).forEach(function (kind) {
    var w = W[kind];
    if (!w || typeof w.steps !== 'function' || w._parts) return;
    var steps = w.steps, say = w.say, mood = w.mood, render = w.render;
    function p(s, i) { return s && s.parts ? s.parts[i] : i; }
    w.steps = function (s) { return s && s.parts ? s.parts.length : steps(s); };
    w.say = function (s, i) { return say(s, p(s, i)); };
    w.mood = function (s, i) { return mood ? mood(s, p(s, i)) : 'happy'; };
    w.render = function (box, s, i, A, o) { return render(box, s, p(s, i), A, o); };
    w._parts = true;
  });
})();
