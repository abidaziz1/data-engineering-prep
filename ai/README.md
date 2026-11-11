# AI data engineering and agentic AI: from a PDF to a production agent

A guided, press-Next course for data engineers. Coach Ada follows **Brewline**, the coffee retailer, as it builds "Ask Brewline", an assistant that answers store managers from company documents and from the order tables. You see how a PDF becomes text and why a table breaks, how a chunk is cut and what the cut costs, how a vector index finds neighbours and where it gets them wrong, how an ingestion pipeline runs twice without doing the work twice, how retrieval is scored and a release is gated, what the model SDKs do when the API fails, how an agent loop moves, what travels on the wire in the Model Context Protocol, how a person approves a write, what a trace shows, and what happens when a document gives an order. Fifteen missions, three paths, labs, bug hunts, incident drills, interview questions and a boss round.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**No language model and no embedding model was used to make this course, and nothing in it ran on a cloud or on a model provider.** None could be reached from where it was built. So three parts are stand-ins, and every screen says which kind it is.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output of open-source tools run on one machine with the Brewline documents, written by `ai/verify/capture_ai.py`: **pypdf 7.0.1, python-docx 1.2.0 and BeautifulSoup 4.15.0** on generated PDF, Word and web files, **datasketch 2.0.0** (MinHash), **rank-bm25 0.2.2**, **FAISS 1.16.0** and **hnswlib 0.8.0** on 30,000 made-up vectors, **PostgreSQL 16.15 with pgvector 0.8.7** (through the pixeltable-pgserver wheel), the real **Anthropic 2.8.0 and OpenAI 3.49.0 client libraries** against a local stand-in server, **LangGraph 1.2.20** with a scripted model, the **MCP SDK 2.3.0** (a server and a client, with a tap on the wire, in two protocol versions), **sqlglot 30.31.0 with DuckDB 2.0.0**, **OpenTelemetry SDK 1.45.2**, **pytest 9.2.0**, and **check-jsonschema** on a workflow file. |
| **From documentation** | Everything about hosted models and services: what a provider keeps and charges, rate limits and batch interfaces, vector database products other than the three that ran, frameworks such as LangChain, LlamaIndex, CrewAI and AutoGen, protocol features beyond the ones recorded, the OWASP list, privacy and regulation (engineering practice, not legal advice), and every price. Those screens say so. |

The three stand-ins:

- **The embedding** is TF-IDF followed by an SVD, trained on the Brewline text. The mechanics (vectors, distance, indexes, filters, fusion, scores) are real. It cannot link "tips" and "gratuities" the way a neural model usually can, and the lessons say where that matters.
- **The model of the agent** is a script of replies. The loop, the errors, the step limits, the checkpoints and the approval are real. Which tool a real model would choose is not. In the injection experiment the stand-in obeys any instruction it reads, so the lesson says nothing about whether a real model would.
- **The model API** is a small local server that speaks the same protocol, scripted to fail in six ways. It proves what the client libraries send and how they retry. It says nothing about a provider.

Some labs are not measurements: the vector memory calculator, the token and cost labs and the release lab's canary rules do **arithmetic** or apply **example rules**, and they say so on screen. Prices, discounts and limits are examples.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 907 | about 8.5 hours | Starting out, or interviewing for a junior AI or data engineer role |
| **Senior** | 1,162 | about 11.5 hours | Everything in Junior, plus the design, evaluation, safety, cost and release decisions |
| **Everything** | 1,195 | about 12 hours | Adds the newest features and the deepest follow-up questions |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The map and the words | 28 min | 30 min | 30 min |
| 2 | Documents in | 31 min | 41 min | 41 min |
| 3 | Chunking | 22 min | 34 min | 34 min |
| 4 | Embeddings, vector indexes and search | 36 min | 44 min | 46 min |
| 5 | RAG pipelines you can run twice | 33 min | 42 min | 44 min |
| 6 | Evaluation | 32 min | 44 min | 46 min |
| 7 | Model APIs in pipelines | 32 min | 42 min | 45 min |
| 8 | Agents: the loop | 35 min | 43 min | 45 min |
| 9 | Tools, MCP and text-to-SQL | 30 min | 44 min | 46 min |
| 10 | State, approvals and several agents | 26 min | 40 min | 43 min |
| 11 | Traces, metrics and agent tests | 26 min | 36 min | 36 min |
| 12 | Safety, security and governance | 29 min | 44 min | 46 min |
| 13 | Shipping: serving, releases and cost | 30 min | 40 min | 42 min |
| 14 | Data for models | 29 min | 43 min | 46 min |
| 15 | Boss round and cheat sheet | 81 min | 117 min | 117 min |

A short mission 0 sets up the course: the map, the levels and how the screens work.

Mission 15 has two incident drills that mix missions, a design decision, a coding round in SQL on the real ranks of the 24 questions, a mock interview of up to 49 questions drawn from the earlier missions, a scorecard with a Review button for every question you missed, and a one-page cheat sheet in which every number comes from a recording.

## What job descriptions ask for, and where this course covers it

I read a small sample of AI data engineer, generative AI data engineer, AI engineer and agentic AI engineer postings through search. It was a **small sample of search results, so treat it as a direction and not a statistic**. The same themes came back again and again, and the missions follow them.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Pipelines that parse documents, clean them, chunk, embed and load a vector store; RAG pipelines | 2, 3, 4, 5 | **Recorded.** Real parsers, five chunkers scored on 24 questions, an ingestion pipeline run six times |
| Embeddings, vector databases (Pinecone, Weaviate, Milvus, Qdrant, Chroma, FAISS, pgvector, OpenSearch), HNSW and IVF, similarity metrics, metadata filtering | 4, 5 | **Recorded** for FAISS, hnswlib and pgvector. The hosted products are **from documentation** |
| Hybrid search, retrieval quality, document versioning, access control inside the search | 4, 5, 6 | **Recorded.** Keyword, vector and fused search scored by kind of question, the stale-chunk and permission leaks counted |
| Evaluation: RAG metrics, hallucination, groundedness, golden sets, LLM as judge, regression gates | 6, 11, 13 | Scores, a gate on five candidate changes, confidence intervals and cheap answer checks are **recorded**. Judging with a model is **from documentation** |
| LLM API integration: retries, rate limits, streaming, function calling, structured output, cost | 7 | **Recorded** with the real client libraries against a stand-in server |
| Agents: tool use, loops, state, human in the loop, multi-agent patterns, durable runs | 8, 10 | **Recorded** with LangGraph and a scripted model. Multi-agent patterns and agent-to-agent protocols are **from documentation** |
| Frameworks: LangGraph, LangChain, LlamaIndex, CrewAI, AutoGen, Semantic Kernel, provider agent SDKs | 8 | LangGraph is **recorded**. The rest is a **documentation** table with the questions to ask |
| MCP servers and clients, tool schemas, text-to-SQL with guardrails | 9 | **Recorded.** A real server and client with a tap on the wire, and a SQL guard run on fourteen statements |
| Guardrails, prompt injection, least privilege, privacy, governance, OWASP LLM risks | 12 (and 2, 5, 9) | The injection experiment and the defences are **recorded** with a stand-in model. The rest is **from documentation** |
| Observability: traces, metrics, token and cost monitoring, tests of agents | 11 | **Recorded** with OpenTelemetry and pytest, including copies of the agent that were broken on purpose |
| CI/CD for AI, prompt and index versioning, LLMOps, serving, cost control | 13 | A release workflow validated against the GitHub Actions schema and the gates **recorded**. Serving and canaries are **from documentation** |
| Fine-tuning data, preference data, batch inference, MLOps data work | 14 | **Recorded** for the data checks (de-duplication, a split that leaks and one that does not). Training itself was not run |
| Python and SQL | all | Python throughout, SQL in missions 4, 9 and 15 |
| Spark, Databricks, Kafka, medallion layers | not here | See the Databricks, AWS and Azure tutorials in this library. The next tutorial covers GCP |
| AWS, Azure and GCP services for AI (managed vector and model services) | not here | Cloud tutorials cover the platform. This course stays provider-neutral and says when it does |

## What you work through

- **Follow the Brewline documents.** A handbook PDF has a header on every page and a table that comes out as a row of words. You see the scan that returns no text, the meeting notes with an e-mail and an IBAN, and two handbook versions that are 81 percent alike. You cut 59 documents five ways and score each way on 24 questions. One rule cuts a phrase in half and loses a fact.
- **12 animated diagrams.** Orange packets travel along numbered arrows: the whole platform, the ingestion pipeline, one question through retrieval, three ways to find neighbours, the agent loop, an MCP host with its servers, a supervisor with workers, a trace, trust boundaries, serving, a release and the life of a training set.
- **2 terminal replays of real output.** pytest on the real agent and on two copies that were broken on purpose, and a schema check of a workflow file.
- **19 lab scenes in 18 labs.** Close or far for eight pairs of texts, three ways to measure a vector, and a memory bill. Recall against work for HNSW, IVF and compression. Filters and limits in pgvector. Score three searches, compute nDCG by hand, fuse two rankings. Where a permission filter runs. Six ingestion runs and an alias switch. Tokens and cost. What a client library does when the API fails. Replay four agent runs. Allow or refuse fourteen SQL statements. The messages on the wire in two protocol versions. Read the spans of a run. One planted order against four defences. Clean a fine-tuning set and split it honestly. Checkpoints, a pause for a person, and a resume. Seven changes meet the gates.
- **40 code walkthroughs.** Line-by-line explanations of the code that ran: parsers, chunkers, the stand-in embedder, hybrid search, the ingestion code, the evaluation gate, the model API calls, the agent graph, the MCP server and the tap on its wire, the SQL guard, tracing, tests, the defences and the fine-tuning checks.
- **67 quizzes, 27 bug hunts, 14 ordering games, 15 architecture decisions with a recommended answer, and 23 incident drills** with a first-move choice, a triage checklist, a way to tell the story and the prevention steps.
- **90 interview questions**, each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 16 chapters, 458 screens |
| Every frame walked in Chromium, with console, network, text size and overflow checks | No errors. Walked 907, 1,162 and 1,195 frames on the three paths |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. Body text stays at 14 px or larger. Labels inside diagrams scale down to between 9 and 12.4 px |
| Interaction test (`dev/e2e.js ai`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem, terminal and boss question, plus keys, text size, Map, paths, saving and reset. All 18 labs are also driven in the browser against values worked out by hand from the recording or by arithmetic | 1,952 checks passed |
| Recorded output (`ai/verify/capture_ai.py`) | 40 files, 30 result tables and 59 sets of counts: parsed text and cleaning, near-copies, five chunkers, the stand-in embedding, indexes and their recall, pgvector plans and limits, six ingestion runs, the scores and the gate, SDK retries and streams and a tool call, agent runs and checkpoints, MCP wire logs, the SQL guard, spans, pytest runs, a workflow validation, the injection experiment and the fine-tuning checks |
| Code in the lessons (`ai/verify/verify_ai.py`) | 72 pieces of Python parse, 52 imports are resolved and 48 keyword arguments of calls of the model SDKs, `with_options`, `add_conditional_edges` and `start_as_current_span` are checked against the installed libraries. JSON, JSON lines, YAML and SQL parse. The SQL of the coding round runs in DuckDB on the table shown on screen and gives the table shown on screen. The SQL guard, ingestion (a second run embeds nothing, an edit embeds one chunk, a label change none), the answer checks and the refund guard are run again, and so are the tests of the agent on the real agent and on the two broken copies, each of which must fail the one test that the lesson names |
| Lab logic (`ai/verify/check_widgets.js`) | 4,200 checks. The lab formulas for hit at k, MRR and nDCG are compared with a second implementation on all 1,024 lists of ten places, the scoreboard follows from the 24 recorded ranks, the vector measures keep their identities, and the recorded tables keep their invariants (recall rises with the settings, so does work, counts add up) |
| Controls | 6 deliberately broken inputs (a drop and a second statement, a table that is not allowed, a wrong number in an answer, a SQL solution with the wrong threshold, a second run that embeds something, a broken SQL statement) and a workflow with `run-on` for `runs-on`, which must all be refused |
| Recapture | `python3 ai/verify/verify_ai.py --recapture` runs the whole recording again and compares it with `js/real.js`: 641 keys compared, none differs. The keys under `pg.*` and the numbers that name seconds are allowed to vary a little between runs, and are counted |

### What was not checked

- **No language model, no embedding model and no provider.** What a real model would answer, choose or obey was not measured. The embedding, the agent model and the model API are stand-ins, and the lessons say so where it matters. The recorded scores of the search are scores of a stand-in on 24 questions about 59 short documents: read them as a direction. Two questions of difference is within the noise, and the lessons teach that with a confidence interval.
- **Nothing ran on a cloud, in a hosted vector database, or on a model provider's service.** Rate limits, batch interfaces, caching, provider fine-tuning, failover, data terms and every price are described from documentation or given as examples.
- **The vector numbers come from 30,000 made-up vectors in 40 Gaussian clusters.** Real embeddings are not that tidy. The best settings on your data differ, and the lessons say to measure.
- **Nothing was trained.** The fine-tuning mission checks the data: de-duplication, a split that leaks and one that does not. How a trained model behaves is documentation.
- **The release workflow was not run.** It was validated against the schema of GitHub Actions, and it is kept outside `.github/workflows` so that it never runs. The scripts that it names are not part of the course.
- **The hosted frameworks and products were not run.** LangChain, LlamaIndex, CrewAI, AutoGen, Semantic Kernel, the provider agent SDKs and the vector databases other than FAISS, hnswlib and pgvector appear in documentation tables.
- **The security guard is a teaching sample.** The SQL guard and the refund check show the layers. They are not a product, and a real one needs a long list of attacks and a review.
- **This is engineering practice and not legal advice.** Ask your legal and privacy teams which rules apply to you.

### Re-check before you rely on it

- **The Model Context Protocol.** The recording speaks the 2026-07-28 and 2025-11-25 versions, as the SDK 2.3.0 offered them. Features beyond the recorded ones (sampling, elicitation, roots, the authorization flow) are described from documentation. Check the specification of the version you target.
- **OpenTelemetry conventions for generative AI** were still in development when this was written, so attribute names may differ in your tools.
- **The OWASP list for language-model applications** is quoted with its 2025 numbering as found. Check the current list.
- **Agent-to-agent protocols** (A2A) are described from documentation, with a version that was current when this was written. Check the current one.
- **Library defaults and signatures** were recorded from anthropic 2.8.0, openai 3.49.0, langgraph 1.2.20, mcp 2.3.0 and pgvector 0.8.7. The retry numbers, the timeout and the settings of an index change between versions.
- **Provider features and prices**: structured output, batch and caching interfaces, fine-tuning services, rate limits and retirements. They change often. The lessons never quote a price as a fact.

## Files

```
ai/
  index.html, css/ai.css   the page and its colours (a violet accent)
  js/config.js             the course settings: Coach Ada, the paths, the sixteen levels
  js/graphs.js             12 diagram specs
  js/widgets.js            labs for documents, chunking, vectors, indexes, pgvector, scoring, access, ingestion, tokens and retries
  js/widgets2.js           labs for agents, the SQL guard, MCP, traces, defences, fine-tuning data, checkpoints and releases
  js/content/              one file per mission, 00 to 15
  js/real.js               the recording: files, tables and counts written by capture_ai.py
  verify/capture_ai.py     runs the real tools on the generated documents and writes js/real.js
  verify/verify_ai.py      checks every snippet, runs the modules again, and with --recapture records again
  verify/check_widgets.js  checks the logic of the labs against the recording and against a second implementation
  verify/corpus.py         the Brewline documents, the questions and the facts behind them
  verify/*.py              the code that the lessons show: parsekit, ragkit, ingest, evalkit, llm_calls, agent_graph, agent_runs,
                           mcp_server, mcp_tap, sqlguard, tracing, defences, finetune, test_agent, standin_llm
  verify/ci/               the example release workflow, validated and never run
```

## Run the checks

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r dev/requirements.txt        # the AI block at the end
python3 ai/verify/verify_ai.py             # snippets, modules, tests of the agent, lab logic and lint
python3 ai/verify/verify_ai.py --recapture # records everything again and compares it with js/real.js (about two minutes)
node dev/lint-content.js ai
node dev/e2e.js ai
node dev/smoke.js ai --path all
```

The recording needs Python 3.10 or later (it was made with 3.13). PostgreSQL with pgvector comes from the `pixeltable-pgserver` wheel, which carries its own server. A check whose tool is missing says so and is skipped.

Independent study material. Not affiliated with or endorsed by any model provider or by the open-source projects named here.
