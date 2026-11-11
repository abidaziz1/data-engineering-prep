/* Mission 0: pick a path, see the whole AI platform, meet the Brewline setup, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var D = G.counts('docs.set'), FM = G.cols('docs.formats', ['file', 'format', 'audience', 'version', 'current']);
  G.expect(D.documents === 59 && D.core === 13 && D.questions === 24, 'the size of the document set');
  var TOOLS = 'pypdf ' + G.meta('pypdf') + ', python-docx, BeautifulSoup, datasketch, rank-bm25, FAISS ' + G.meta('faiss-cpu') + ', hnswlib, PostgreSQL with pgvector ' + G.counts('pg.versions').pgvector + ', the Anthropic ' + G.meta('anthropic') + ' and OpenAI ' + G.meta('openai') + ' client libraries, LangGraph ' + G.meta('langgraph') + ', the MCP SDK ' + G.meta('mcp') + ', sqlglot with DuckDB, and OpenTelemetry';

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole AI platform', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Ask Brewline: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee, and its store managers ask the same questions all day: what is the refund rule, what do I do when a delivery is late, how many orders were completed. The company builds "Ask Brewline", an assistant that answers from its documents and its order tables. This course builds the data side of it. Press Next to follow one document and one question.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. Documents arrive as PDF, Word and web pages. A parser turns each one into clean text and keeps what the search will need: the headings, the tables, who may read the file, which version it is, and whether it is the current one.', on: ['e1'], focus: ['d_docs', 'l_parsed'], cap: 'Parse, clean and label.' },
          { say: 'Step 2. The text is cut into chunks of a few hundred characters. A search returns pieces, and a prompt has limited room, so the size and the borders of a chunk decide what the assistant can find.', on: ['e2'], focus: ['l_parsed', 'l_chunks'], cap: 'The cut decides what can be found.' },
          { say: 'Step 3. Every chunk goes into an index three times over: as a vector from an embedding model, as words for keyword search, and with its labels. The pipeline that does this must be safe to run again, because documents change.', on: ['e3'], focus: ['l_chunks', 'l_index'], cap: 'One chunk, three ways to find it.' },
          { say: 'Step 4. A manager asks a question. Retrieval searches the index with a filter for what this person may read, runs a keyword and a vector search, and fuses the two rankings.', on: ['e4', 'e5'], focus: ['d_q', 'c_ret', 'l_index'], cap: 'Retrieval reads the index for one person.' },
          { say: 'Step 5. The best chunks go into a prompt, and a model writes the answer from them, with the names of its sources. The model is a service that you call through an API, and the call can fail, so the code around it matters.', on: ['e6'], focus: ['c_ret', 'c_model'], cap: 'The model writes from the chunks.' },
          { say: 'Step 6. An agent puts the model in a loop. It can call tools, such as a read-only query on the order tables, and it must ask a person before it writes, for example before a refund. The tools are where the assistant touches real systems.', on: ['e7', 'e8'], focus: ['c_model', 'c_agent', 'd_orders'], cap: 'The agent loop and its tools.' },
          { say: 'Around the flow sit five controls. Evaluation scores every change against questions with known answers. Traces show what happened in a run. Safety decides who sees what and who may act. Cost watches tokens and hours. Release moves a change into production behind a gate. Each one has a mission.', focus: ['p_eval', 'p_trace', 'p_safe', 'p_cost', 'p_ship'], keepGroups: true, cap: 'Five controls around the data path.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same topics, different expectations. Press Next to read the gap area by area. A senior is judged on decisions and on what happens when something breaks, not on knowing more library names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Documents', 'Parse a PDF, a Word file and a web page into text.', 'Clean and label documents, remove near-copies, mask personal data and keep versions.'],
          ['Chunking', 'Cut text into chunks and say why the size matters.', 'Choose the strategy and size with a score, and keep structure and labels in each chunk.'],
          ['Vectors and search', 'Explain an embedding and run a vector search.', 'Pick an index and its settings, mix keyword and vector search, and filter inside the search.'],
          ['RAG pipelines', 'Build ingest and query steps that work.', 'Make ingestion idempotent, handle deletes and model changes, and switch indexes safely.'],
          ['Evaluation', 'Check answers by hand on a few questions.', 'Build a question set, score retrieval and answers, and gate a release on the scores.'],
          ['Model APIs', 'Call a model and read the result.', 'Handle retries, timeouts, limits, streaming and structured output, and budget the tokens.'],
          ['Agents', 'Explain the loop of model, tool and result.', 'Design state, limits, approvals and recovery, and choose between a workflow and an agent.'],
          ['Tools and MCP', 'Write a tool with a schema.', 'Design tool contracts, a safe text-to-SQL path and an MCP server with least privilege.'],
          ['Orchestration', 'Run a graph from start to end.', 'Run it durably: checkpoints, resume, replay, and several agents with one state.'],
          ['Observability', 'Read a log of a run.', 'Instrument traces, token and cost metrics, and alerts, and evaluate agent behaviour.'],
          ['Safety', 'Know that a prompt can be hijacked.', 'Design for prompt injection, access control, privacy and audit, with the model assumed to fail.'],
          ['Shipping', 'Deploy a service.', 'Run budgets, caches, canaries, index versions and a release gate for prompts and models.'],
          ['Data for models', 'Prepare a clean training file.', 'Prevent leaks between training and validation, version data and models, and judge a fine-tune against the alternatives.']
        ],
        steps: [
          { upto: 4, say: 'Documents, chunking, vectors and pipelines. A junior builds the steps. A senior makes them safe to run twice and cheap to change.' },
          { upto: 8, say: 'Evaluation, model APIs, agents and tools. This is where an assistant starts to act, and a design mistake costs money.' },
          { upto: 13, say: 'Orchestration, observability, safety, shipping and data for models. They decide whether the system stays trustworthy in production.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior AI or data engineer role. **Senior path** if you have built pipelines already: it includes every junior topic and adds the design, evaluation, safety, cost and release decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'rec', title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is the document set that the whole course uses. Brewline keeps its rules in files of several formats. Each file has an audience, a version and a flag that says whether it is the current one. The twelve below are the core files. There are ' + D.documents + ' in all, because I added ' + D.extra + ' short ones so that a search has something to get wrong.',
            tabs: [{ layer: 'DOCUMENTS', name: 'The core documents', c: 'raw', cols: FM.cols, rows: FM.rows, trk: 0 }],
            notes: ['I wrote these files myself and generated them as real PDF, Word and web files, so that the parsers in this course had real formats to read. The handbook exists twice, as version 1 and version 2, on purpose: the refund window changed from 30 to 14 days, and an assistant must not quote the old one.']
          },
          {
            say: 'The assistant answers for a person, and people see different things. A role is a set of audiences. A store manager may read the all-staff and the manager documents, and never the finance or the HR ones. The index must carry this label from the document to every chunk.',
            tabs: [{
              layer: 'ROLES', name: 'Who may read what', c: 'raw',
              cols: ['Role', 'May read', 'Cannot read'],
              rows: [
                ['staff', 'all-staff', 'managers, finance, hr'],
                ['manager', 'all-staff, managers', 'finance, hr'],
                ['finance', 'all-staff, finance', 'managers, hr'],
                ['hr', 'all-staff, hr', 'managers, finance']
              ],
              trk: 0
            }],
            notes: ['Mission 5 shows what leaks when the filter runs in the wrong place, and mission 12 shows how a role reaches a tool.']
          },
          {
            say: 'The agent has three tools. Two only read. One writes, and it moves money, so a person must approve every call. The difference between a read tool and a write tool is the most important line in the design of an agent.',
            tabs: [{
              layer: 'TOOLS', name: 'The tools of the assistant', c: 'raw',
              cols: ['Tool', 'What it does', 'Reads or writes', 'Guard'],
              rows: [
                ['search_policies', 'finds policy chunks for a question', 'reads', 'filter by role'],
                ['orders_by_status', 'counts orders of a status', 'reads', 'allowed values only'],
                ['issue_refund', 'refunds an order', 'writes', 'a person approves every call']
              ],
              trk: 0
            }],
            notes: ['Missions 8 to 10 build the loop around these tools, and mission 12 attacks them.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + TOOLS + '. A **From documentation** tag means the fact comes from public documentation as I found it. Nothing in this course ran on a cloud or on a model provider.', 'Recorded, or from documentation. Never both, never guessed.'],
          ['Three stand-ins', 'I could not reach a language model or an embedding model from where I worked, so three parts are stand-ins that I say so about each time. The **embedding** is TF-IDF with an SVD, which works from the words of the Brewline files. The **model** of the agent is a script of replies. The **model API** is a small local server that speaks the same protocol. What the stand-ins cannot tell you, I do not tell you.', 'A stand-in proves the plumbing, not the intelligence.'],
          ['Prices are examples', 'Every price and discount in this course is an example for practice, and providers change them. A lab that shows a bill is arithmetic on example rates. Read the price page of your provider before you promise a number.', 'The shape of the bill is the lesson. The numbers are not a quote.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
