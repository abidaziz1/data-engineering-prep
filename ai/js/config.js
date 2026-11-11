/* AI data engineering and agentic AI: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js). This course uses Coach Ada.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'ai',
  storageKey: 'dep.ai.v1',
  coachPhoto: '',
  coach: { id: 'ada', name: 'Ada', role: 'your AI coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'AI data engineering<br><span>and agentic AI, from raw documents to production agents</span>',
    sub: 'The AI data platform · Documents in · Chunking · Embeddings and vector search · RAG pipelines · Evaluation · Model APIs · Agents · Tools and MCP · State and approvals · Traces · Safety · Shipping · Data for models',
    say: 'Hi, I am Coach Ada. This course follows Brewline, the coffee retailer, as it builds an assistant for its store managers. You will see how a PDF turns into text and why a table breaks, how a chunk is cut and what the cut costs, how a vector index finds neighbours and where it gets them wrong, how a pipeline runs twice without doing the work twice, how retrieval is scored, what the model SDKs do when the API fails, how an agent loop moves, what travels on the wire in the Model Context Protocol, how a person approves a write, and what happens when a document gives an order. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. No language model and no embedding model was used to make this course, because none could be reached, so I say on every screen what is real and what is a stand-in. The real parts ran on one machine: PDF, Word and HTML parsers, MinHash, FAISS and hnswlib, PostgreSQL with pgvector, the Anthropic and OpenAI client libraries (talking to a local stand-in server), LangGraph, an MCP server and client, a SQL guard on DuckDB, and OpenTelemetry. The stand-ins are an embedding made with TF-IDF and an SVD, a scripted model, and a small tokenizer trained on the Brewline text. Screens with a Recorded tag show what ran. Everything about hosted models and services comes from documentation, and those screens say so. Prices are examples. Independent study material, not affiliated with or endorsed by any model provider or the open-source projects named here.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch documents, vectors, agents and tool calls move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior AI or data engineer is asked about LLM pipelines and agents, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, evaluation, safety, cost and release decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Platform Mapper', 'Document Wrangler', 'Chunk Cutter', 'Vector Navigator', 'Pipeline Keeper', 'Retrieval Judge', 'API Handler', 'Loop Builder', 'Tool Smith', 'Orchestrator', 'Trace Reader', 'Guardian', 'Shipper', 'Data Alchemist', 'Agent Architect'],
  miniMap: {
    caption: 'You are here in the Brewline AI platform:',
    row1: [['src', 'Documents'], ['stg', 'Parse and chunk'], ['int', 'Embed and index'], ['mart', 'Retrieve'], ['con', 'Models and agents']],
    row2: [['sf', 'Platform'], ['air', 'Agents and tools'], ['mon', 'Evals and traces'], ['qual', 'Safety'], ['snap', 'Pipelines'], ['ci', 'Shipping']]
  },
  sql: { role: 'brewline_assistant (read-only)', wh: 'DuckDB', db: 'brewline' },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', tsql: 'SQL' }
};
