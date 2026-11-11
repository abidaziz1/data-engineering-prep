/* Mission 9: tools, the Model Context Protocol and text-to-SQL. A real MCP server and client (the MCP Python SDK) talked over stdio with a tap on the
   wire, in the newest protocol version and in the one before it. A SQL guard (sqlglot in front of DuckDB) was run on fourteen statements, with a
   read-only connection and with no protection at all on a copy. No language model wrote the SQL: the fourteen statements were written by hand to
   cover what a model might write. How to secure an MCP server, and how to evaluate text-to-SQL, come from documentation and common practice. */
(function () {
  var B = LAB.b, G = LAB.get;
  var MS = G.file('mcp/mcp_server.py'), MT = G.file('mcp/mcp_tap.py'), SG = G.file('code/sqlguard.py');
  var WI = G.table('mcp.wire').rows, WL = G.table('mcp.wire_legacy').rows, SE = G.counts('mcp.session'), SL = G.counts('mcp.session_legacy'), FP = G.counts('mcp.footprint');
  var SS = G.counts('sqlguard.summary'), SD = G.table('sqlguard.decisions').rows;
  function bytes(rows) { return rows.reduce(function (a, r) { return a + r[4]; }, 0); }
  function dec(label) { return SD.filter(function (r) { return r[0].indexOf(label) === 0; })[0]; }
  var DCOMMENT = dec('a comment hides'), DEMAIL = dec('personal data'), DDROP = dec('a drop'), DFILE = dec('read a file'), DCROSS = dec('a cross join'), DLIM = dec('a limit of a million');
  G.expect(WI.length === 18 && WL.length === 19 && WI[0][2] === 'server/discover' && WL[0][2] === 'initialize' && WL[2][2] === 'notifications/initialized', 'the two wire logs');
  G.expect(SE.protocol_version === '2026-07-28' && SL.protocol_version === '2025-11-25' && SE.tools.join() === 'search_policies,orders_by_status,issue_refund', 'the MCP session');
  G.expect(FP.tools === 3 && FP.chars_per_tool === 511 && FP.tokens_for_40_such_tools === 5110, 'the tool definition footprint');
  G.expect(SS.queries === 14 && SS.allowed === 7 && SS.refused === 7 && SS.refused_that_the_database_alone_would_have_run === 1, 'the SQL guard summary');
  G.expect(DEMAIL[2] === 'refused' && /^10 row/.test(DEMAIL[4]) && DCOMMENT[2] === 'allowed' && /DROP/.test(DDROP[3]) === true && /table functions/.test(DFILE[3]) && /timeout after 1 s/.test(DCROSS[4]) && /lowered from 1000000 to 100/.test(DLIM[3]), 'the decisions that the lessons quote');
  var BUG1 = [
    'def run_query(sql):',
    '    if "DROP" in sql.upper() or "DELETE" in sql.upper():',
    '        return "refused"',
    '    return con.execute(sql).fetchall()'
  ].join('\n');
  var FIX1 = [
    'def run_query(sql):',
    '    safe_sql, notes = check(sql)                  # parse: one SELECT, allowed tables and columns, a limit',
    '    return run_readonly(DB_PATH, safe_sql)        # a read-only connection, no files, a memory cap, a timeout'
  ].join('\n');
  var BUG2 = [
    '@app.tool(annotations=ToolAnnotations(readOnlyHint=True))',
    'def issue_refund(order_id: str, amount: float) -> str:',
    '    """Refund an order."""',
    '    return till.refund(order_id, amount)'
  ].join('\n');
  var FIX2 = [
    '@app.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=False))',
    'def issue_refund(order_id: str, amount: float) -> str:',
    '    """Refund an order. This writes to the till system, so a person must approve it before the call."""',
    '    return till.refund(order_id, amount)'
  ].join('\n');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Tools, MCP and text-to-SQL', short: 'Tools and MCP', blurb: 'An MCP server on the wire, the guard in front of a model that writes SQL, and the layers that hold when one fails', minutes: 58,
    focus: ['air', 'qual'],
    goals: [
      'Say what **MCP** is, and what a host, a client and a server each do.',
      'Read **real MCP messages**: discovery, a tool definition, a call and a result, in two protocol versions.',
      'Explain **tools, resources and prompts**, and why a tool annotation is only a hint.',
      'Put **a guard in front of text-to-SQL**: parse, allow list, limit, read-only connection, timeout.',
      'Say why **a read-only connection alone is not enough**, and why a text filter is not a parser.',
      'Say what it costs to expose **many tools**.'
    ],
    say: 'Mission 9 is where the assistant touches real systems. First the Model Context Protocol, which is how a host application talks to tool servers. I ran a real MCP server and client with a tap on the wire, so every message is real, in two protocol versions. Then the case that scares everybody: a model that writes SQL. I put a guard in front of DuckDB and sent it fourteen statements. A read-only connection alone let a customer e-mail query run, and only the guard stopped it. The statements are written by me, since no model was used.',
    scenes: [
      B.talk({
        id: 'm9-talk', t: 1, src: 'docs', title: 'Three ways a model reaches your systems',
        say: 'A model that can only write text is limited. Press Next for the three ways that it gets hands, and the idea of MCP.',
        items: [
          ['Tools in your application', 'You declare functions with schemas, as in mission 7, and your code runs them. It is simple, and every application repeats the work: each one wraps the same database, the same ticket system, in its own way.', 'Fast to write, written again for every app.'],
          ['MCP: a protocol for tool servers', 'The Model Context Protocol lets a **server** expose tools, resources and prompts in a standard way, and any **host** that speaks the protocol can use them. One server for the order data works in a chat app, an IDE and your own agent. It turns many-to-many wiring into one protocol.', 'Write the server once, use it in many hosts.'],
          ['Text-to-SQL', 'A tool whose argument is a SQL query. The model writes the query from a question and a schema, and the tool runs it. It answers questions that no fixed tool anticipates, and it is the riskiest tool you can give a model, because SQL can read everything and change a lot.', 'Powerful, and dangerous without layers.'],
          ['Roles in MCP', 'The **host** is the application with the model and the user, such as an assistant app. It runs one **client** for each server. A **server** exposes capabilities and talks to its own backend. The client and the server exchange JSON-RPC messages over stdio, for a local server, or over HTTP, for a remote one.', 'Host, clients, servers.'],
          ['Three capabilities', '**Tools** are actions that the model may choose. **Resources** are data that the host or the user may attach, such as a schema. **Prompts** are templates that a user picks, such as a starting prompt for a question about an order. Tools are model-controlled, resources are application-controlled, prompts are user-controlled.', 'Tools, resources, prompts: who controls each.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'One host, many servers', g: 'mcp', legend: false,
        steps: [
          { say: 'This is how MCP is arranged. The host is the assistant. It starts a client for each server. Each server talks to its own backend. Press Next to follow a question about order counts.', cap: 'Host, clients, servers, backends.' },
          { say: 'Step 1. The model in the host decides that it needs the number of completed orders. It tells its client for the data server.', on: ['p0'], focus: ['m_model', 'm_c1'], cap: 'The model picks a tool.' },
          { say: 'Step 2. The client sends a JSON-RPC request to the Brewline data server: `tools/call`, with the tool name and its arguments. Over stdio the server runs as a child process of the host.', on: ['p1'], focus: ['m_c1', 'm_s1'], tags: ['t_msg', 't_tr'], cap: 'A JSON-RPC call to the server.' },
          { say: 'Step 3. The server does the work against its backend, here a read-only DuckDB, and returns a result. A ticket server and a files server follow the same shape, each with its own backend and its own permissions.', on: ['p4', 'p2', 'p3', 'p5', 'p6'], focus: ['m_s1', 'm_b1', 'm_s2', 'm_s3'], cap: 'The backend stays behind the server.' }
        ]
      }),

      B.code({
        id: 'm9-server', t: 1, src: 'rec', title: 'An MCP server for the Brewline data', file: 'mcp_server.py', lang: 'python', code: MS,
        steps: [
          { say: 'This is the server that I ran with the MCP Python SDK ' + G.meta('mcp') + '. It exposes three tools, one resource and one prompt. It is short because the SDK turns the type hints and the docstrings into the schemas and the descriptions that a model will read.', lines: null },
          { say: 'The server has a name and instructions. The instructions are text that a host can show to the model: what this server is for and the rule that writes need a person.', lines: G.span(MS, /^app = MCPServer/, /^app = MCPServer/) },
          { say: '`search_policies` is a read tool. Its docstring becomes the description. The arguments `query` and `limit` and their types become the input schema. The annotation `readOnlyHint=True` tells a host that this tool changes nothing.', lines: [G.at(MS, /^def search_policies/) - 1, G.span(MS, /^def search_policies/, /return hits\[:limit\]/)[1]] },
          { say: '`orders_by_status` takes `Literal[\'COMPLETED\', \'CANCELLED\', \'PENDING\']`. The SDK writes that as an `enum` in the schema, so a wrong status is refused before the function runs. That is the error of mission 8, caught by the schema.', lines: [G.at(MS, /^def orders_by_status/) - 1, G.span(MS, /^def orders_by_status/, /return \{'status': status/)[1]] },
          { say: '`issue_refund` is a write. Its annotations say so: not read-only, destructive, not idempotent. Its docstring says that a person must approve it. Note that the function itself does not ask anyone. The approval is the job of the host, and the annotation is only a hint.', lines: G.span(MS, /readOnlyHint=False, destructiveHint=True/, /return 'refunded %\.2f on %s'/) },
          { say: 'A **resource** is data that the host can attach, here the columns of the orders table. A **prompt** is a template that a user can pick, here a starting prompt for a question about one order. Neither is chosen by the model.', lines: G.span(MS, /^@app\.resource/, /Do not issue a refund yourself/) },
          { say: 'The last line runs the server over stdio. A host starts it as a child process and talks to it on the standard input and output. No port is opened, so there is nothing to attack from the network.', lines: G.span(MS, /app\.run\('stdio'\)/, /app\.run\('stdio'\)/) }
        ],
        note: 'The counts of orders in this server are fixed numbers, chosen to match the DuckDB data of the agent in mission 8. A real server would query the warehouse.'
      }),

      B.widget({ id: 'm9-wire-lab', kind: 'mcpwire', t: 1, src: 'rec', title: 'Lab: the messages on the wire, in two protocol versions' }),

      B.code({
        id: 'm9-tap', t: 1, src: 'rec', title: 'How I looked at the wire', file: 'mcp_tap.py', lang: 'python', code: MT,
        steps: [
          { say: 'To see the real messages, I did not change the server or the client. I put a tap between them: a small program that starts the real server as a child process, copies every line in either direction to a log, and passes it on unchanged.', lines: null },
          { say: 'It starts the server with pipes for its input and output. The client believes that the tap is the server.', lines: G.span(MT, /^log = open/, /^child = subprocess/) },
          { say: '`pump` reads lines from one side, writes a log entry with the direction, and writes the line to the other side. A line is one JSON-RPC message, which is why a plain tap is enough for stdio.', lines: G.span(MT, /^def pump/, /dst\.flush\(\)/) },
          { say: 'Two threads, one for each direction. When the client closes its end, the tap closes the server\'s input and waits. The table of messages in the lab is this log, with the sizes counted.', lines: G.span(MT, /threading\.Thread/, /child\.wait\(\)/) }
        ],
        note: 'Over HTTP you would look at the traffic with a proxy that you trust. Over stdio, a tap like this one is the simplest way, and it is also a reminder that anything on the wire is visible to the host.'
      }),

      B.talk({
        id: 'm9-mcpsec', t: 2, src: 'docs', title: 'Securing an MCP server',
        say: 'A tool server is a way for text to cause actions, so it is a security boundary. This is documentation-level guidance that matches the security advice of the protocol, in broad strokes. Press Next for each point.',
        items: [
          ['Trust the server less than your own code', 'A host that connects a server it did not write is running someone else\'s tool descriptions and results inside its model. A tool description can contain instructions. A result can too. Treat both as untrusted input, and connect only servers that you reviewed.', 'A description is input, and input can attack.'],
          ['Annotations are hints', 'A tool can say that it is read-only or destructive. A host may use that to decide on a prompt for approval, and it should not rely on it from a server that it does not trust. A server author can set it wrong, as the bug hunt below shows.', 'A hint is not a guarantee.'],
          ['Least privilege on the server side', 'The server runs with the rights of the credentials that you gave it. Give it a read-only database role with few tables, a token that can only read, and no access to the whole file system. The rights of the server are the upper limit of what a hijacked agent can do.', 'The server is the blast radius.'],
          ['Authorize remote servers properly', 'A remote server needs authentication and authorization that the specification describes: tokens for the user, scoped to the server, never passed on to other services. A server must not act with more rights than the user who asked.', 'Act as the user, not above the user.'],
          ['Consent and logs', 'Show the user what a write will do before it runs, and log every tool call with the user, the tool, the arguments and the result size. A log is how you answer "who asked for this refund" after the fact.', 'Approve what changes. Log everything.'],
          ['Keep the footprint small', 'Every tool definition is text in every request. Expose only the tools that a task needs, and pin the version of a server so that a changed description cannot arrive unreviewed.', 'Small, pinned, reviewed.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm9-guard', t: 1, src: 'rec', title: 'A guard between a model and a database', file: 'sqlguard.py', lang: 'python', code: SG,
        steps: [
          { say: 'This is the guard that sat between the fourteen statements and DuckDB. The docstring is the plan: the model proposes, the guard decides, and the database enforces what the guard cannot see. Five rules, and the fifth is the one that still holds when the parser is wrong.', lines: null },
          { say: 'The configuration is plain data: three tables that may be read, three columns that may never appear, and a cap of 100 on the limit. A change to it goes through code review, because it is the policy.', lines: G.span(SG, /^ALLOWED_TABLES/, /^MAX_LIMIT/) },
          { say: 'Rule 1: parse the text with sqlglot. Text that is not SQL is refused. More than one statement is refused. A statement that is not a SELECT is refused, so a `DROP`, a `COPY` and an `ATTACH` all stop here, with a reason.', lines: G.span(SG, /^def check/, /only SELECT is allowed, found/) },
          { say: 'Rule 2: every table must be on the allow list, or be a name that the query defined itself with a WITH clause. A table function such as `read_csv` is refused, because it reads files and URLs. `SELECT email FROM customers` is stopped here, because `customers` is not allowed.', lines: G.span(SG, /ctes = /, /is not on the allow list/) },
          { say: 'Rule 3: no column on the deny list, wherever it appears in the query. Rule 4: a limit is added when there is none, and a limit above the cap is lowered. In the recording `LIMIT 1000000` became `LIMIT 100`.', lines: G.span(SG, /for c in stmt\.find_all\(exp\.Column\)/, /return stmt\.sql\(dialect=dialect\), notes/) },
          { say: 'Rule 5 is not about the text. The query runs on a **read-only connection**, with no access to files or the network, a memory cap and a timer that interrupts the query after a second. If the parser misses something, these still hold.', lines: G.span(SG, /^def run_readonly/, /con\.close\(\)/) }
        ],
        note: 'The guard is a sample for the course and not a product. A real one also checks joins, functions, and the cost of the query, and it is tested with a long list of attacks. The principle of layers is the lesson.'
      }),

      B.widget({ id: 'm9-sql-lab', kind: 'sqlguard', t: 1, src: 'rec', title: 'Lab: allow or refuse, and what each layer caught' }),

      B.cmp({
        id: 'm9-layers', t: 1, src: 'rec', title: 'Which layer caught what',
        say: 'Fourteen statements, four possible outcomes each. Press Next to see the cases where a layer mattered. The statements are written by me to cover what a model might write. Each row below is a recorded result.',
        cols: ['The statement', 'Guard', 'Read-only connection alone', 'No protection (a copy)'],
        hl: 1,
        rows: [DDROP, DEMAIL, DFILE, DCOMMENT, DLIM, DCROSS].map(function (r) { return [r[0], r[2] + (r[3] ? ': ' + r[3] : ''), r[4].slice(0, 54), r[5].slice(0, 54)]; }),
        steps: [
          { upto: 1, say: 'A `DROP`: the guard refuses it by its type. The read-only connection also refuses it. Without any protection, on a copy, the table was gone. This is the case that everybody expects.' },
          { upto: 2, say: 'Personal data in a table: `SELECT email FROM customers`. The guard refused it, because the table is not on the allow list. The read-only connection **ran it and returned 10 rows**. Read-only means that nothing changes. It does not mean that nothing leaks.' },
          { upto: 3, say: 'Reading a file with `read_csv`: refused by the guard as a table function. The database refused it too, because external access was switched off. On the copy without protection, it returned a key from a file.' },
          { upto: 4, say: 'A comment: `-- ; DROP TABLE orders` after a normal query. The guard **allowed** it, because the parser reads the rest of the line as a comment. It returned two rows. A filter that looked for the word DROP would have refused a harmless query.' },
          { upto: 5, say: 'A limit of a million: allowed, with the limit lowered to 100. The cap protects the model, the network and the bill.' },
          { upto: 6, say: 'A cross join of five copies of the orders table: the guard allowed it and added a limit, which does not help, because the work happens before the limit. The timeout interrupted it after one second. On a copy with no protection I did not run it, because it would have kept the machine busy for about a minute.' }
        ],
        pick: 'Use **layers**: a parser with an allow list, a read-only role with access to as few tables and columns as possible, and a timeout and a cap on rows. Each layer catches what another one misses.'
      }),

      B.talk({
        id: 'm9-t2sql', t: 1, src: 'docs', title: 'Text-to-SQL in practice',
        say: 'A guard keeps a bad query from doing harm. It does not make the query right. Press Next for what makes the answers right, from documentation and common practice.',
        items: [
          ['Show only what is needed', 'Give the model the schema of the allowed tables and columns, with a short description of each, and a few example questions with their queries. A model that sees fifty tables guesses. A model that sees three and their meaning does better.', 'A small, described schema.'],
          ['Prefer views and a semantic layer', 'Define "completed order" and "revenue" once, in a view or a metrics layer, so that every query uses the same definition. Let the model query the view. Personal columns stay out of the view, which also enforces access in the database.', 'Define the business terms once.'],
          ['Validate before running', 'Parse the query, check the tables and columns, and ask the database for a plan or a cost estimate before it runs. Reject a query that scans too much, as well as one that is unsafe.', 'Check the shape and the cost.'],
          ['Run it where it can do little harm', 'A read-only role, a read replica or a small warehouse, a statement timeout, a row limit, and a cap on the data a query may scan. Your warehouse has settings for these. Use them as a second line behind the guard.', 'The database enforces its own limits.'],
          ['Show your work', 'Show the user the SQL and the number of rows, and let them correct it. A number from a query that nobody can read is a number that nobody can check. Ask a question back when the request is ambiguous.', 'Make the query visible.'],
          ['Measure it', 'Keep a set of questions with correct queries or correct results, and score execution accuracy: does the query return the right rows? Include questions that must be refused, such as a request for personal data.', 'Execution accuracy, and refusals.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'In MCP over stdio, who starts the server?',
        opts: [
          { t: 'The host application, as a child process, and its client talks to it on standard input and output', fb: '' },
          { t: 'The server starts itself and opens a public port', fb: 'Over stdio there is no port. The host starts the process.' },
          { t: 'The model, when it needs a tool', fb: 'The model produces text. It cannot start processes.' },
          { t: 'A cloud service that hosts the protocol', fb: 'A remote server uses HTTP. Stdio is local.' }
        ],
        ok: 0, why: 'The host runs one client for each server, and for a local server the client starts it as a child process. The recorded tap sat between the two and saw every line.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'A tool is annotated `readOnlyHint=True`. Can the host rely on that to skip an approval?',
        opts: [
          { t: 'Only if it trusts the server. An annotation is a hint from the author of the server, and it can be wrong or hostile', fb: '' },
          { t: 'Yes, annotations are enforced by the protocol', fb: 'The protocol carries the hint. It does not enforce it.' },
          { t: 'No, a host must always approve every tool', fb: 'That is safe and tiresome. Trusted read tools may skip it.' },
          { t: 'Yes, the model checks it', fb: 'The model does not enforce permissions.' }
        ],
        ok: 0, why: 'A hint is information. A server that you wrote and reviewed can be trusted to set it right. A server that you did not write can set it to anything, so the host decides on its own policy, and the server still runs with least privilege.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: '`SELECT email FROM customers` ran on a read-only connection and returned 10 rows. What is the right conclusion?',
        opts: [
          { t: 'A read-only connection stops changes, not reads. An allow list of tables and columns is needed as well', fb: '' },
          { t: 'The connection was not read-only', fb: 'It was. Reading is exactly what read-only allows.' },
          { t: 'The database has a bug', fb: 'It did what it was told.' },
          { t: 'Text-to-SQL cannot be made safe', fb: 'It can be made much safer with layers. This case is one of the layers working.' }
        ],
        ok: 0, why: 'In the recording this was the one statement that the database alone would have run and the guard refused: ' + SS.refused_that_the_database_alone_would_have_run + ' of ' + SS.refused + ' refusals. Also hide personal columns in the database with a view or a column privilege, so that the rule does not live only in the guard.'
      }),

      B.quiz({
        id: 'm9-q4', t: 1,
        q: 'A guard refuses any query whose text contains the word DROP. A user asks for the orders whose note says "drop off at the back door". What happens?',
        opts: [
          { t: 'The harmless query is refused, and a real attack in other words may pass. Parse the SQL instead of searching the text', fb: '' },
          { t: 'It works as intended', fb: 'It blocks a good query, and an attacker has other ways to write the same command.' },
          { t: 'The query runs, and the word DROP is ignored', fb: 'The text filter refuses it.' },
          { t: 'The database blocks it anyway', fb: 'The text filter blocks it before the database sees it.' }
        ],
        ok: 0, why: 'A text search is wrong in both directions. In the recording, a comment containing `DROP TABLE` after a normal query was **allowed** by the parser, because it was a comment, and it returned two rows, while a statement that really was a DROP was refused by its type.'
      }),

      B.quiz({
        id: 'm9-q5', t: 2,
        q: 'Your MCP server exposes 40 tools like the three recorded ones, at about ' + FP.chars_per_tool + ' characters of definition each. What does it cost on every request?',
        opts: [
          { t: 'About ' + FP.tokens_for_40_such_tools + ' tokens of definitions, whether or not the model uses any of them', fb: '' },
          { t: 'Nothing, tools are free until they are called', fb: 'The definitions are text in the prompt of every request.' },
          { t: 'About 40 tokens', fb: 'Each definition takes hundreds of characters.' },
          { t: 'Only the tokens of the tools that are called', fb: 'The definitions of all of them are sent.' }
        ],
        ok: 0, why: 'The three recorded tools took ' + FP.json_chars_of_tool_definitions + ' characters, about ' + FP.tokens_for_these_tools + ' tokens at four characters a token. Forty such tools would take about ' + FP.tokens_for_40_such_tools + '. More tools also mean more wrong choices, so expose only what a task needs.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put one text-to-SQL request through its layers, in order.',
        items: [
          'The model proposes a query from the question and the described schema',
          'Parse it: one statement, and it is a SELECT',
          'Check the tables and columns against the allow list and the deny list',
          'Add or lower the limit',
          'Run it on a read-only role with no file access, a memory cap and a timeout',
          'Return a bounded result, and show the query to the user',
          'Log the user, the query, the rows and the time'
        ],
        why: 'The first layers reject what the text shows. The last layers hold when the parser is wrong. Showing the query lets a person see a wrong join, and the log makes the call accountable.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, q: 'This tool runs SQL for an assistant. A reviewer says that it is both unsafe and too strict. Click the line.',
        file: 'tool.py', lang: 'python', code: BUG1, bad: [2],
        hint: 'A filter that searches the text of a query.',
        why: 'Searching the text for words is not parsing. It refuses a harmless query with the word in a string or a comment, and it lets through `COPY`, `ATTACH`, a table function, a personal column and a long cross join, none of which contain the words. Parse the statement, check its type, tables and columns, and run it on a restricted connection.',
        fix: FIX1,
        cheer: 'Parse, do not search.'
      }),

      B.bug({
        id: 'm9-bug2', t: 2, src: 'rec', q: 'This MCP tool moves money. A host skips the approval prompt for it. Click the line that explains why.',
        file: 'server.py', lang: 'python', code: BUG2, bad: [1],
        hint: 'What does the annotation tell a host?',
        why: 'The annotation `readOnlyHint=True` tells the host that the tool changes nothing. The tool issues a refund. A host that trusts the hint skips the approval. Mark a write as not read-only, destructive and not idempotent, as the recorded server does, say in the description that it needs approval, and still enforce the approval in the host and in the tool.',
        fix: FIX2,
        cheer: 'Annotate writes honestly.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: free SQL or fixed query tools?',
        scenario: 'Managers ask about orders all day. Most questions are the same ten: orders by status, revenue by day, orders by store. A few are new every week. The assistant needs to answer them from the warehouse.',
        opts: [
          { t: 'Only a free SQL tool with a guard', d: 'One tool answers everything, including new questions.', lose: 'Every common question depends on the model writing the join and the definitions right, and a wrong "completed order" gives a confident wrong number. It is the hardest design to test and to keep cheap.' },
          { t: 'Fixed, parameterised tools for the common questions, and a guarded SQL tool on a read replica for the rest', d: 'The ten common questions are exact, cheap and tested. The long tail still works, with the guard and a view of the data.' },
          { t: 'Only fixed tools', d: 'Safe and predictable.', lose: 'Every new question needs a developer. Managers will go around the assistant.' }
        ],
        pick: 1,
        why: 'Fixed tools give exact answers with definitions that you control, and they are cheap to evaluate. The guarded SQL tool, on a replica and over views that hide personal data, keeps the assistant useful for questions that nobody planned. Promote a free query to a fixed tool when it becomes common.',
        when: 'If almost every question is new, such as for analysts, invest more in the semantic layer, the examples and the evaluation of the SQL tool, and keep the guard and the replica.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: the assistant listed customer e-mails', time: '13:20',
        alert: '**A manager asked "which customers ordered the pistachio drink?" and the assistant answered with names and e-mail addresses.** The SQL tool runs on a read-only database role. There is no parser in front of it. The `customers` table holds e-mail, phone and card number.',
        clues: ['The role is read-only, so nothing was changed', 'The table with personal data is readable by that role', 'No allow list of tables or columns exists', 'In the recording `SELECT email FROM customers` ran on a read-only connection and returned 10 rows'],
        opts: [
          { t: 'Add a guard with an allow list of tables and a deny list of columns, move the assistant to views without personal data, and test requests for personal data', fb: '' },
          { t: 'Tell the model never to select personal columns', fb: 'It is an instruction that a user or a document can talk it out of.' },
          { t: 'Make the role read-only twice', fb: 'It is already read-only. The problem is what it may read.' },
          { t: 'Remove the SQL tool and tell managers to ask an analyst', fb: 'It stops the leak and the use. The layers are the better fix.' }
        ],
        best: 0,
        why: 'Read-only stops writes, and it does nothing about reads. The rule "no personal data" has to be enforced twice: in the database, where the assistant\'s role sees only views without those columns, and in a guard that refuses the table and the columns by name. A test that asks for personal data must be refused.',
        checks: [
          ['Contain it', 'Switch the SQL tool off or restrict it to a view, and find out what the answer showed and to whom.'],
          ['Find the gap', 'List the tables and columns that the assistant\'s role can read.'],
          ['Fix the database', 'Give the role only views without personal columns, or column privileges.'],
          ['Fix the guard', 'Add the allow list and deny list, and parse the SQL.'],
          ['Test and tell', 'Add tests that request e-mails and phones. Tell the privacy team, because personal data was shown.']
        ],
        tell: 'An assistant answered a question about a drink with customer e-mails, because its SQL tool ran on a read-only role that could read the customers table. I switched the tool to views without personal columns, added a guard that parses the SQL and refuses tables and columns that are not allowed, and added tests that ask for e-mails and phones and must be refused. I reported the exposure to the privacy team.',
        prevent: ['**Read-only is not private**: restrict what a role can read', 'Enforce the rule in **the database and in a guard**', 'Give an assistant **views** without personal columns', 'Test that requests for personal data are **refused**']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, src: 'rec', title: 'Incident: an assistant query keeps the warehouse busy', time: '10:05',
        alert: '**The warehouse has been busy for ten minutes with one query from the assistant, and the credits used are going up.** A manager asked for "customers who ordered the same drink in the same store", and the model joined the orders table to itself several times with no join condition. The guard allows it and adds `LIMIT 100`.',
        clues: ['The limit is applied after the join, so it does not reduce the work', 'There is no statement timeout on the assistant\'s role', 'In the recording a cross join was allowed by the guard and interrupted after 1 second by the timeout', 'The query is still running'],
        opts: [
          { t: 'Cancel the query, set a statement timeout and a scan or cost cap on the role, and teach the guard to refuse a join with no condition', fb: '' },
          { t: 'Wait for it to finish, it has a limit', fb: 'The limit applies to the output. The work is in the join.' },
          { t: 'Raise the warehouse size so it finishes faster', fb: 'It costs more per minute, and the query may not finish at all.' },
          { t: 'Ask the model to write better queries', fb: 'It helps a little. A limit in the database does not depend on the model.' }
        ],
        best: 0,
        why: 'The database must protect itself, because a guard that reads text cannot predict the work of every query. A statement timeout and a cap on the data a query may scan or the credits it may use stop the next one. The guard can add a rule against joins with no condition, and a plan or cost estimate before running catches more.',
        checks: [
          ['Cancel it', 'Find the query by role and cancel it. Check what else is waiting.'],
          ['Set limits', 'A statement timeout on the assistant\'s role, and a cap on the bytes scanned or the credits that a query may use, with the settings of your warehouse.'],
          ['Guard it', 'Refuse a join with no condition, and check the plan or the estimated cost before running.'],
          ['Isolate', 'Run the assistant on its own small warehouse or a replica, so that it cannot slow the rest.'],
          ['Alert', 'Alert on long queries and on the credits of that role.']
        ],
        tell: 'An assistant query joined the orders table to itself with no condition and kept the warehouse busy while the credits climbed. I cancelled it, set a statement timeout and a scan cap on the assistant\'s role, moved it to its own small warehouse, and taught the guard to refuse a join without a condition and to look at the plan before running. I added alerts on long queries and on the credits of that role.',
        prevent: ['A **timeout and a scan or credit cap** on the role', 'A **limit does not cut the work** of a join', 'A **separate small warehouse** for the assistant', 'Check the **plan or the cost** before you run']
      }),

      B.qa({
        id: 'qa-mcp', t: 1, tag: 'MCP', secs: 90,
        q: 'What is the Model Context Protocol, and how do the host, the client and the server work together?',
        pts: ['A standard way to expose tools, resources and prompts to AI applications', 'The host is the application with the model and the user', 'One client for each server', 'Servers wrap backends such as databases and ticket systems', 'JSON-RPC over stdio for local or HTTP for remote', 'Write a server once, use it from many hosts'],
        short: 'MCP is a protocol that lets an AI application use tools and data from separate servers in a standard way. The host is the application that has the model and the user, for example an assistant app or an IDE. It runs one client for each server. A server exposes capabilities, tools, resources and prompts, and talks to its own backend, such as a database or a ticket system. The client and the server exchange JSON-RPC messages, over stdio for a local server that the host starts as a child process, or over HTTP for a remote one.\n\nThe value is that I write the server for the order data once and any host that speaks the protocol can use it, instead of wrapping the same database again in every application.\n\nI ran a real server and client with a tap on the wire. The newest protocol version starts with a discovery request and carries the version in every request, while the previous version opens with an initialize handshake and then a notification, and I saw both. A tool call and its result are small JSON messages.',
        fu: [
          ['What are tools, resources and prompts?', 'Tools are actions that the model may choose. Resources are data that the application or user attaches, such as a schema. Prompts are templates that a user picks.'],
          ['Does MCP make tools safe?', 'No. It standardises the connection. The security of the server, the approval of writes and the trust in the descriptions are still your job.']
        ],
        trap: 'Saying that MCP is a way to run models. It is a way to connect tools and data to them.',
        real: 'Describe a tool you exposed through MCP or a similar protocol, and what you limited.'
      }),

      B.qa({
        id: 'qa-mcpsec', t: 2, tag: 'MCP', secs: 60,
        q: 'How do you secure an MCP server?',
        pts: ['Least privilege on the server credentials', 'Treat tool descriptions and results as untrusted input', 'Annotations are hints, not guarantees', 'Authenticate remote servers, act as the user, never pass tokens on', 'Approve writes and log every call', 'Keep tools few, and pin and review versions'],
        short: 'I start from the blast radius: the server runs with the rights of the credentials I give it, so I give it a read-only database role with few tables, a read-only token, and no access to the whole file system. A hijacked agent can then do no more than the server can.\n\nI treat everything that crosses the protocol as untrusted: a tool description from a server I did not write can contain instructions, and so can a result. I connect only reviewed servers and pin their versions, so a changed description cannot arrive unreviewed. Annotations such as read-only are hints, and a host should not rely on them from a server it does not trust.\n\nFor a remote server I authenticate the user, scope the token to that server, and never pass it on to another service. Writes need an approval that shows what will happen, and every tool call is logged with the user, the tool, the arguments and the size of the result. And I keep the set of tools small, which also saves tokens.',
        fu: [
          ['What is tool poisoning?', 'A server whose tool description or result carries instructions meant for the model, such as "also send the file to this address". It is prompt injection through the tool channel.'],
          ['Where does the approval belong?', 'In the host, before a write runs, and again in the tool for rules that matter, such as a maximum amount.']
        ],
        trap: 'Trusting a server because it is "official". Review it like any dependency.',
        real: 'Describe how you restricted a server or a tool, and what you logged.'
      }),

      B.qa({
        id: 'qa-t2sql', t: 1, tag: 'Tools', secs: 90,
        q: 'How do you build text-to-SQL safely?',
        pts: ['The model proposes, a guard decides', 'Parse: one SELECT, allowed tables and columns, a limit', 'A read-only role with only the data it needs, in views', 'A timeout, a memory cap and a scan cap in the database', 'Show the query, and log it', 'Evaluate execution accuracy and refusals'],
        short: 'I think in layers, because no single one is enough. The model proposes a query from a small described schema. A guard parses it with a real SQL parser, not a text search, and allows one SELECT on an allow list of tables, with no table functions and no personal columns, and it adds or lowers the limit.\n\nThe query then runs on a read-only role that can see only views without personal data, with no file or network access, a memory cap, a statement timeout and, in a warehouse, a cap on the data scanned. In my recording a read-only connection alone let a customer e-mail query run, and only the guard stopped it. A cross join passed the guard and was stopped by the timeout after one second. A comment with the word DROP passed correctly, since a parser knows it is a comment.\n\nI show the query to the user and log it, and I evaluate with questions that have correct results, including requests that must be refused.',
        fu: [
          ['How do you keep the numbers right?', 'A view or a metrics layer that defines terms such as completed order once, so that every query uses the same definition.'],
          ['What if the question is ambiguous?', 'Ask a question back. A wrong confident number is worse than a clarification.']
        ],
        trap: 'Relying on one layer, such as a prompt that says "only write SELECT".',
        real: 'Describe a guard or a restriction you put around model-written SQL.'
      }),

      B.qa({
        id: 'qa-readonly', t: 1, tag: 'Tools', secs: 60,
        q: 'Is a read-only database connection enough to make text-to-SQL safe?',
        pts: ['It stops writes, drops and changes', 'It does not stop reads of sensitive data', 'It does not stop a query that burns resources', 'Add an allow list of tables and columns', 'Add a timeout, a memory cap and a scan cap', 'Use views so the rule lives in the database too'],
        short: 'No. A read-only connection stops changes: in my recording it refused a DROP, a second statement, a file write and an attach. It does nothing about what can be read. A query for customer e-mails ran on a read-only connection and returned ten rows, and only the guard\'s allow list refused it.\n\nIt also does nothing about the work: a cross join of several copies of a table passed the guard and would have kept the database busy for about a minute, and a timeout interrupted it after one second. So I add an allow list of tables and a deny list of columns, a statement timeout, a memory cap and, where the warehouse supports it, a cap on the data scanned.\n\nAnd I put the sensitive rule in the database too, by giving the role views without the personal columns, so that the protection does not depend only on a parser that I wrote.',
        fu: [
          ['What else can read-only not stop?', 'A query that reads a very large table and returns an aggregate that reveals something it should not, such as a count of a small group. Row-level rules and minimum group sizes cover that.'],
          ['Where do the limits belong?', 'In the database role first, because the database does the work. The guard is a second line.']
        ],
        trap: 'Saying that read-only means safe. It means that nothing changes.',
        real: 'Describe how you limited what an automated query could read or cost.'
      }),

      B.qa({
        id: 'qa-evalsql', t: 2, tag: 'Tools', secs: 60,
        q: 'How do you evaluate text-to-SQL?',
        pts: ['Questions with a correct result or a correct query', 'Execution accuracy: does the result match?', 'Compare results, not the text of the SQL', 'Include ambiguous questions and ones that must be refused', 'Track cost and time of each query', 'Add production failures to the set'],
        short: 'I keep a set of questions with a correct answer, and I score execution accuracy: I run the model\'s query and the reference query and compare the results, ignoring order where order does not matter. I do not compare the text of the SQL, because many different queries are right.\n\nThe set includes questions in other words, questions that are ambiguous, where the right behaviour is to ask a question back, and questions that must be refused, such as a request for personal data, or a query that would scan too much. I score those separately, because a model that answers everything is not good.\n\nI also track the cost and time of each query and the share that the guard refused, since a rise in refusals can mean that the schema description got worse. And, as with retrieval, I add failures from production to the set every week.',
        fu: [
          ['What about a query that is right by luck?', 'Use several questions on the same tables, and look at the SQL of the failures and a sample of the passes.'],
          ['How do you handle new tables?', 'Update the schema description, add questions for them, and run the whole set before they reach the assistant.']
        ],
        trap: 'Comparing the generated SQL to a reference as text.',
        real: 'Describe how you checked that a model-written query returned the right rows.'
      }),

      B.qa({
        id: 'qa-mcpmore', t: 3, tag: 'MCP', secs: 60,
        q: 'What does MCP offer besides tools, and what risks come with it?',
        pts: ['Resources and prompts, as in the recorded server', 'Features that let a server ask the client: model sampling, user input, roots', 'Each feature adds a way for text to cause an action', 'Consent and visible approval for every one', 'Authorization for remote servers', 'Check the version of the specification that you target'],
        short: 'Besides tools, the protocol has resources, which are data that an application attaches, and prompts, which are templates that a user picks. I ran both in the recorded server. The specification also describes features in which the server asks the client for something, such as asking the model of the host to complete a text, asking the user for input, or learning which folders the client exposes. They change from version to version, so I check the version that I target.\n\nEach of them adds trust surface. A server that can ask the host\'s model to complete text can try to steer it, and a server that can ask the user a question can phrase it to get something it should not. So the host must show the user what is asked and by which server, and ask for consent, and the server runs with least privilege.\n\nFor a remote server I also need authorization that acts as the user, with a token that is scoped to that server and never passed on.',
        fu: [
          ['How did the version change the wire?', 'In my recording, the newest version starts with a discovery request and repeats the version in each request. The older one opens with an initialize handshake and a notification.'],
          ['What would you not expose?', 'Anything that lets text trigger an irreversible action without a person who sees the details.']
        ],
        trap: 'Treating a protocol feature as safe because it is in a specification.',
        real: 'Describe how you decided which capabilities of a server to expose.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Tool Smith', color: '#FBCFE8',
        pts: [
          '**MCP** lets a host use tools, resources and prompts from servers through one protocol: **host, one client for each server, and servers** over stdio or HTTP.',
          'The wire is **JSON-RPC**. The newest version starts with `server/discover` and repeats the version in each request. The previous one opens with an `initialize` handshake.',
          'An **annotation is a hint**. A server is the **blast radius**: give it least privilege, and treat descriptions and results as untrusted input.',
          'For text-to-SQL use **layers**: a **parser** with an allow list, a **read-only role** over views, and a **timeout, memory and scan cap**. Read-only stops writes. It does not stop reads.',
          'A **text filter is not a parser**. A comment with DROP is harmless, and COPY, ATTACH and read_csv have no such word.',
          '**Many tools cost tokens** on every request, and make wrong choices more likely.'
        ],
        lines: [
          'I ask what the server could do with the credentials I gave it.',
          'I parse SQL, and I let the database enforce its own limits.',
          'I expose the fewest tools that do the job.'
        ]
      })
    ]
  });
})();
