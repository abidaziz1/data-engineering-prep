/* Mission 11: observability and tests of agent behaviour. One agent run was traced with the OpenTelemetry SDK: a root span, a span for each model call
   and each tool call, with token counts, an error status and the recorded exception. The token counts are estimated from the length of the scripted
   messages, because no model ran. The tests of the agent were run with pytest on the real agent and on two copies that were broken on purpose.
   Metrics, alerts, privacy in traces and LLM observability platforms come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TG = G.file('code/tracing.py'), TA = G.file('test/test_agent.py');
  var SP = G.table('otel.spans'), SU = G.counts('otel.summary'), TS = G.counts('test.summary');
  var P0 = G.file('test/pytest_clean.txt'), P1 = G.file('test/pytest_no_limit.txt'), P2 = G.file('test/pytest_no_approval.txt');
  function toks(row) { var a = row[4].match(/input_tokens=(\d+), usage\.output_tokens=(\d+)/); return a ? [+a[1], +a[2]] : null; }
  var CH = SP.rows.filter(function (r) { return r[2] === 'CLIENT'; }).map(toks);
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }
  function term(txt, cmd) {
    return G.plain(wrap(txt, 92), { cmd: cmd, d: 90 });
  }
  G.expect(SU.spans === 6 && SU.model_calls === 3 && SU.tool_calls === 2 && SU.tool_errors === 1 && SU.input_tokens_total === 202 && SU.output_tokens_total === 46, 'the spans of the traced run');
  G.expect(CH.length === 3 && CH[0][0] === 15 && CH[1][0] === 72 && CH[2][0] === 115, 'the input tokens of the three model calls grow');
  G.expect(TS.clean.passed === 4 && TS.clean.failed === 0 && TS.no_limit.failed === 1 && TS.no_approval.failed === 1 && TS.no_limit.passed === 3, 'the pytest runs');
  var BUG1 = [
    'with tracer.start_as_current_span("chat") as span:',
    '    span.set_attribute("gen_ai.request.model", MODEL)',
    '    span.set_attribute("user_question", question)',
    '    span.set_attribute("model_answer", answer)'
  ].join('\n');
  var FIX1 = [
    'with tracer.start_as_current_span("chat") as span:',
    '    span.set_attribute("gen_ai.request.model", MODEL)',
    '    span.set_attribute("question_chars", len(question))',
    '    span.set_attribute("prompt_version", PROMPT_VERSION)',
    '    span.set_attribute("conversation_id", conversation_id)    # the text itself stays in a protected store with a retention period'
  ].join('\n');
  var BUG2 = [
    'def traced(name, fn):',
    '    def wrapper(**kw):',
    '        with tracer.start_as_current_span("execute_tool " + name):',
    '            try:',
    '                return fn(**kw)',
    '            except Exception as e:',
    '                return "ERROR: " + str(e)',
    '    return wrapper'
  ].join('\n');
  var FIX2 = [
    'def traced(name, fn):',
    '    def wrapper(**kw):',
    '        with tracer.start_as_current_span("execute_tool " + name) as span:',
    '            try:',
    '                return fn(**kw)',
    '            except Exception as e:',
    '                span.record_exception(e)',
    '                span.set_status(Status(StatusCode.ERROR, str(e)))',
    '                return "ERROR: " + str(e)            # the model still reads the error, and the trace knows it failed',
    '    return wrapper'
  ].join('\n');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Traces, metrics and agent tests', short: 'Observability', blurb: 'Spans for every model and tool call, what to measure, privacy in traces, and tests of behaviour', minutes: 48,
    focus: ['mon', 'ci'],
    goals: [
      'Say what **a trace and a span** are, and what an agent run looks like as one.',
      'Record **model and tool calls** with tokens, status and exceptions.',
      'Choose **metrics and alerts** that find a runaway, a leak or a bad release.',
      'Keep **personal data** out of traces and logs.',
      'Test **behaviour**: the tool chosen, the steps taken, the refusal, the approval.',
      'Show that **a test can fail**, with a copy of the agent that is broken on purpose.'
    ],
    say: 'Mission 11 is about seeing inside. An agent run is a tree of model calls and tool calls, and the final answer hides almost all of it. I traced one run with the OpenTelemetry SDK and read the spans: three model calls, two tool calls, one error that the user never saw. Then I wrote four tests of the agent and ran them with pytest on the real agent and on two copies that I broke on purpose, to see that the tests fail when they should. The token counts in the trace are estimates, because no model ran.',
    scenes: [
      B.talk({
        id: 'm11-talk', t: 1, src: 'docs', title: 'Three signals, and why an agent needs the first',
        say: 'Logs, metrics and traces are the three signals of any service. An agent makes traces worth more than usual. Press Next for each.',
        items: [
          ['Logs', 'A line of text for an event: a request arrived, a tool failed. Good for details, hard to read as a whole, and a place where private data leaks if you log content.', 'Events, one at a time.'],
          ['Metrics', 'Numbers over time: requests per minute, tokens per request, the share of tool errors, cost per day. They are cheap to store, easy to alert on, and say that something is wrong without saying why.', 'Numbers that you can alert on.'],
          ['Traces', 'A trace follows one request through all the work that it caused. It is a tree of spans. Each span is a piece of work with a start, an end, a status and attributes. For an agent the tree shows every model call and tool call in order, which is exactly the thing that you cannot see from the answer.', 'The path of one request.'],
          ['The conventions', 'OpenTelemetry is a standard for producing and exporting these signals. It has conventions for generative AI: spans for the agent run, for each model call and for each tool call, with attributes for the model name and the token counts. As I found them, these conventions are still in development, so names can change. Pick a backend that can store standard traces.', 'A standard way to name things, still moving.'],
          ['Why agents need them', 'A normal service is a fixed path, and its logs tell the story. An agent chooses its path. Two runs of the same question can take different routes at different cost. Without traces you cannot answer: why did this cost so much, why did it call that tool, where did it fail.', 'The path is not fixed, so record it.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm11-flow', t: 1, src: 'rec', title: 'A request becomes a trace, and a trace feeds the rest', g: 'trace', legend: true,
        steps: [
          { say: 'This is where the spans of an agent run go. A request creates a trace. The spans are exported to a store, and from the store come metrics, alerts and new test cases. Press Next to follow it.', cap: 'A trace and what uses it.' },
          { say: 'Step 1. The request starts the **root span**, `invoke_agent`. It covers the whole run, so its duration is the delay that the user felt.', on: ['r1'], focus: ['t_req', 't_root'], cap: 'The root span is the whole run.' },
          { say: 'Step 2. Under it, every model call is a child span and every tool call is another. In the recording the run had ' + SU.spans + ' spans: ' + SU.model_calls + ' model calls and ' + SU.tool_calls + ' tool calls under one root.', on: ['r2a', 'r2b'], focus: ['t_root', 't_chat', 't_tool'], cap: 'A span for each model call and tool call.' },
          { say: 'Step 3. An exporter sends the spans to a trace store, where one request can be searched and read as a tree. Here the exporter keeps them in memory, so that the lessons can read them.', on: ['r3a', 'r3b', 'r4'], focus: ['t_exp', 't_store'], cap: 'Export, then store.' },
          { say: 'Step 4. Metrics are computed from the spans: tokens, cost and errors. An alert fires when a limit is crossed, for example a run with far more tokens than usual.', on: ['r5', 'r6'], focus: ['t_store', 't_met', 't_alert'], cap: 'Metrics and alerts from spans.' },
          { say: 'Step 5. The traces of bad runs, found by a thumbs down or an alert, become new cases in the evaluation set. The trace is where tomorrow\'s test comes from.', on: ['r7'], focus: ['t_store', 't_eval'], cap: 'A bad trace becomes a test.' }
        ]
      }),

      B.code({
        id: 'm11-tracing', t: 1, src: 'rec', title: 'Tracing the agent, in code', file: 'tracing.py', lang: 'python', code: TG,
        steps: [
          { say: 'This is the code that traced the run of mission 8. It uses the OpenTelemetry SDK ' + G.meta('opentelemetry-sdk') + '. The docstring says what to keep in mind: the attribute names follow conventions that are still in development, and the token counts are estimates, because no model ran.', lines: null },
          { say: '`setup` creates a tracer and an exporter that keeps the spans in memory. A real service would export to a collector. The rest of the code does not change.', lines: G.span(TG, /^def setup/, /return provider\.get_tracer/) },
          { say: '`TracedModel` wraps the model of the graph. Each call becomes a span of kind client. It records the operation, the model name, and the number of tokens that went in and out, here counted as one token for four characters of the messages.', lines: G.span(TG, /^class TracedModel/, /return reply/) },
          { say: '`traced` wraps a tool. One span for each call, with the tool name. If the tool raises, the span gets an error status and the exception is recorded as an event, and then the error goes on, so that the graph can hand it to the model as a message.', lines: G.span(TG, /^def traced/, /return wrapper/) },
          { say: '`run_agent` opens the root span. Every span that the graph creates while it runs is a child of it, because the tracer keeps the current span in a context. The wrapping is the only change to the agent: the graph itself is the same code.', lines: G.span(TG, /^def run_agent/, /return graph\.invoke\(state\)/) }
        ],
        note: 'A framework or a vendor library may add this for you. Look at the attribute names that it uses, and at what it puts into them, before you send it to a store.'
      }),

      B.widget({ id: 'm11-spans-lab', kind: 'spans', t: 1, src: 'rec', title: 'Lab: read the spans of one run, and ask the trace questions' }),

      B.rows({
        id: 'm11-spans', t: 1, src: 'rec', title: 'The six spans, as a table',
        steps: [
          {
            say: 'The same six spans as a table, exactly as the exporter returned them. Read the status column first: one tool span has an error. The agent recovered, so the root span is not marked as an error.',
            tabs: [{ layer: 'SPANS', name: 'One agent run', c: 'mon', cols: SP.cols, rows: SP.rows.map(function (r) { return r.map(String); }), chg: [[2, 3]], trk: 0 }],
            notes: ['The input tokens of the three model calls were ' + CH.map(function (x) { return x[0]; }).join(', ') + ': each call carries the whole conversation so far, so the input grows with every step, and a long run costs more than the sum of equal steps.']
          }
        ]
      }),

      B.cmp({
        id: 'm11-attrs', t: 1, src: 'docs', title: 'What to record in a span, and what to keep out',
        say: 'A span is as useful as its attributes. Press Next to read what to record and the care that each one needs. The names follow the OpenTelemetry conventions for generative AI, which are still in development.',
        cols: ['Attribute', 'Why record it', 'Care'],
        hl: 2,
        rows: [
          ['Model name and version', 'A change of model shows up in the traces, and in cost and quality.', 'Record the exact version when the provider gives one.'],
          ['Input and output tokens', 'They are the bill. A growing input means a growing history.', 'Estimates are fine, and say that they are estimates.'],
          ['Tool name and status', 'Which tools are used, and how often they fail.', 'Record the error type, not a private value inside it.'],
          ['Prompt and index versions', 'To link a change in behaviour to a release.', 'A version id, never the whole prompt in every span.'],
          ['User or conversation id', 'To find the trace of a complaint.', 'An opaque id, never a name or an e-mail address.'],
          ['The question and the answer', 'To debug a bad answer.', 'They hold personal data. Store them elsewhere, with access control and a retention period, and link by id.']
        ],
        steps: [
          { upto: 2, say: 'The model and the tokens are the first things to record. They answer "what did this run cost and with which model".' },
          { upto: 4, say: 'The tool status and the version of the prompt and the index link behaviour to causes. A rise in tool errors after a release points at the release.' },
          { upto: 6, say: 'The last two need care. An id lets you find a trace. The text of the question and the answer is the data that most often should not sit in a trace at all.' }
        ],
        pick: 'Record **what you need to explain cost, speed and failure**, with **opaque ids**. Keep **content** in a protected store with a retention period, and link to it.'
      }),

      B.talk({
        id: 'm11-metrics', t: 1, src: 'docs', title: 'What to measure, and what to alert on',
        say: 'Metrics turn traces into numbers that you can watch. This is documentation-level practice. Press Next for the ones that find real problems of an AI application.',
        items: [
          ['Speed', 'The delay of a whole run, and of a model call, at the median and at the 95th percentile. The average hides the slow ones that users remember. For a stream, the time to the first piece matters more than the time to the last.', 'Percentiles, not the average.'],
          ['Cost', 'Tokens in and out, and cost, for each request, for each feature and for each day. An alert on the daily total and on the request that is far above normal. This is how a loop or a prompt that grew shows up.', 'Tokens per request, and a daily budget.'],
          ['Behaviour of the agent', 'The number of steps in a run, the share of runs that hit the step limit, the number of repeated tool calls, and the tool error rate for each tool. A rise in any of them is a sign of a loop, a broken tool or a bad prompt.', 'Steps, limits hit, repeats, tool errors.'],
          ['Quality signals', 'The share of answers that fail the cheap checks of mission 6, the rate of refusals, the number of thumbs down, the share of questions with no answer. They are weak for each answer and strong as rates.', 'Rates of the signals you can compute.'],
          ['Sampling and cost of tracing', 'Keeping every trace of a busy service costs money. Keep all errors and all slow runs, and a sample of the rest. Decide what you keep before the volume makes the decision for you.', 'Keep the failures, sample the rest.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-agent-eval', t: 2, src: 'docs', title: 'Testing and evaluating an agent',
        say: 'An agent has two things to test: the loop that you wrote, and the behaviour of the model inside it. Press Next for how each is tested.',
        items: [
          ['The loop, with a scripted model', 'The graph, the limit, the router, the error handling and the approval are plain code. Test them with a scripted model, which gives the same replies every time. These tests are fast, free and exact, and they run on every commit. The next screens show four of them.', 'Deterministic tests of the code.'],
          ['The behaviour, with a real model', 'Whether a real model chooses the right tool, stops in a sensible number of steps, refuses what it must and tells the truth about a refusal is tested on a set of tasks, with a real model, many times, because each run differs. Score the path (the trace) as well as the final answer.', 'Statistical tests of the model.'],
          ['What to score', 'Task success, the tools used and their order, the number of steps, the cost, and safety cases: a request for personal data, an injected instruction in a document, a write that is not approved. A run can end with a right answer by a bad path, and the path is what costs money.', 'The path, the cost and the refusals.'],
          ['From production', 'A trace that a user flagged becomes a case in the set, with the expected path. Over time the set covers what users really do. Re-run it when you change the prompt, the tools or the model.', 'Failures become test cases.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-tests', t: 1, src: 'rec', title: 'Four tests of the agent loop', file: 'test_agent.py', lang: 'python', code: TA,
        steps: [
          { say: 'These are the four tests that I ran with pytest ' + G.meta('pytest') + '. They use the graph of mission 8 with scripted models and fake tools that record their calls. Each one checks a rule of the loop, not an answer.', lines: null },
          { say: 'The first test: the agent calls the two tools in order, then answers, in three model calls. It checks the path, with the list of tool calls, and the count of steps.', lines: G.span(TA, /^def test_two_tools_then_an_answer/, /startswith\('14 days'\)/) },
          { say: 'The second: a wrong status comes back as a message with the allowed values, and the model fixes it. The test checks that the error message is in the conversation and that only the good call reached the tool.', lines: G.span(TA, /^def test_a_wrong_argument/, /assert calls == \['orders_by_status'\]/) },
          { say: 'The third: a model that repeats the same call is stopped at the step limit, with a graceful message. This is the test that would fail if someone removed the limit.', lines: G.span(TA, /^def test_a_loop_stops/, /startswith\('I stopped after'\)/) },
          { say: 'The fourth: a write waits for a person. While the run is paused, the refund tool has not been called. After the approval it has been called exactly once. This is the test that would fail if someone removed the approval.', lines: G.span(TA, /^def test_a_write_waits/, /calls\.count\('issue_refund'\) == 1/) },
          { say: 'At the top, a switch for the lesson: `AGENT_BREAK` takes away the step limit or the approval, on purpose. It is how the next screen proves that the tests can fail.', lines: G.span(TA, /^BREAK = /, /^BREAK = /) }
        ],
        note: 'A scripted model makes these tests deterministic, and it also means that they say nothing about a real model. They protect the code around the model.'
      }),

      B.term({
        id: 'm11-pytest', t: 1, src: 'rec', title: 'The tests, on the real agent and on two broken copies',
        say: 'First the four tests on the real agent. Then on a copy where the step limit is gone. Then on a copy where the approval is gone. Watch which test fails each time, and which ones keep passing.',
        lines: [].concat(
          term(P0, 'pytest -q test_agent.py'),
          [{ c: 'dim', t: '# the same tests, with the step limit taken away (AGENT_BREAK=no_limit)', d: 500 }],
          term(P1, 'AGENT_BREAK=no_limit pytest -q test_agent.py'),
          [{ c: 'dim', t: '# the same tests, with the approval taken away (AGENT_BREAK=no_approval)', d: 500 }],
          term(P2, 'AGENT_BREAK=no_approval pytest -q test_agent.py')
        ),
        after: 'The real agent passes all **' + TS.clean.passed + '** tests. With the limit removed, exactly **one** test fails, the one about the step limit, with the recursion error of the framework. With the approval removed, exactly **one** other test fails, the one that checks that nothing is written while the run waits. A test that cannot fail proves nothing, so breaking the code on purpose is how you check your tests.',
        afterKind: 'tip',
        doneSay: 'Each rule of the loop has a test that fails when the rule is broken. Run them on every commit, because they take a fraction of a second.'
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'The agent recovered from a tool error, and the user got a good answer. Does the trace of the run show the error?',
        opts: [
          { t: 'Yes: the tool span has an error status and the recorded exception, while the root span is not an error', fb: '' },
          { t: 'No, errors are only visible when the run fails', fb: 'A span records its own status. The run did not fail, and the tool call did.' },
          { t: 'Only if the user complains', fb: 'The trace is written whether or not anybody complains.' },
          { t: 'Yes, and the root span is marked as an error too', fb: 'The agent recovered, so the root span is fine.' }
        ],
        ok: 0, why: 'In the recording one execute_tool span had the status ERROR and ' + SP.rows.filter(function (r) { return r[3] === 'ERROR'; })[0][5] + ' recorded events, and the run still ended with an answer. This is what traces are for: errors that the user never saw, and that cost tokens.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'The input tokens of the three model calls were ' + CH.map(function (x) { return x[0]; }).join(', ') + '. Why do they grow?',
        opts: [
          { t: 'Each call carries the whole conversation so far, including the earlier tool results', fb: '' },
          { t: 'The model gets more expensive during a run', fb: 'The price per token does not change. The number of tokens does.' },
          { t: 'Tracing adds tokens', fb: 'Tracing records the counts. It does not change them.' },
          { t: 'The user typed more words', fb: 'The question is the same in every call.' }
        ],
        ok: 0, why: 'The messages list grows with every step, and the model has no memory between calls, so the whole list is sent again. The cost of a run grows faster than the number of steps, which is why long runs and large tool results are expensive.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1,
        q: 'A developer adds `span.set_attribute("user_question", question)` to every model span. What is the problem?',
        opts: [
          { t: 'Questions can hold personal data, and now it sits in every trace, in a store with wide access and no retention limit', fb: '' },
          { t: 'Attributes make spans slower', fb: 'A small cost. The privacy problem is the real one.' },
          { t: 'The attribute name is not allowed', fb: 'The name is fine. The content is the problem.' },
          { t: 'There is no problem, traces are internal', fb: 'Internal systems leak too, and people with trace access may not be allowed to read the data.' }
        ],
        ok: 0, why: 'Record opaque ids, lengths and versions in the trace, and keep the text in a protected store, with access control and a retention period, linked by an id. That way the people who debug latency do not read private conversations.'
      }),

      B.quiz({
        id: 'm11-q4', t: 1,
        q: 'The tests of the loop use a scripted model. What do they not tell you?',
        opts: [
          { t: 'Whether a real model chooses the right tool and stops sensibly', fb: '' },
          { t: 'Whether the step limit works', fb: 'They test exactly that.' },
          { t: 'Whether a write waits for approval', fb: 'They test that too.' },
          { t: 'Whether the error message reaches the model', fb: 'They check that.' }
        ],
        ok: 0, why: 'A scripted model fixes the replies, so the code around it can be tested exactly. How a real model behaves needs a second kind of test, with a real model, many runs, and a score of the path and the outcome.'
      }),

      B.quiz({
        id: 'm11-q5', t: 2,
        q: 'With the approval removed from the agent, which of the four tests fails, and why is that the right test to fail?',
        opts: [
          { t: 'The one that checks nothing is written while the run waits: without an approval the refund is called at once', fb: '' },
          { t: 'The one about the step limit', fb: 'That one fails when the limit is removed, not the approval.' },
          { t: 'All four', fb: 'In the recording only one failed.' },
          { t: 'None. The tests cannot see approvals', fb: 'They can: they count the calls that reached the tool.' }
        ],
        ok: 0, why: 'The recording shows `' + P2.split('\n').filter(function (l) { return /^FAILED/.test(l); })[0].replace(/ - .*/, '') + '` as the only failure. Each test is tied to one rule, so a broken rule points at the test that names it.'
      }),

      B.order({
        id: 'm11-ord', t: 1, q: 'Put the instrumenting of an agent in order.',
        items: [
          'Start a root span for the run, with the agent name',
          'Wrap the model so that each call is a span with the model name and the tokens',
          'Wrap each tool so that each call is a span with its name and status',
          'On an error, record the exception and set an error status, and let the error go on',
          'Keep personal content out of the attributes, and use opaque ids',
          'Export the spans, and sample so that all errors and slow runs are kept',
          'Compute metrics and alerts from the spans'
        ],
        why: 'The root span makes the tree. The model and tool spans fill it. The error handling makes failures visible, and the privacy rule keeps the traces safe to share. Sampling and metrics come last, once the spans exist.'
      }),

      B.bug({
        id: 'm11-bug', t: 1, src: 'docs', q: 'A privacy review finds a problem in this instrumentation. Click the line.',
        file: 'trace.py', lang: 'python', code: BUG1, bad: [3, 4],
        hint: 'What is in the questions and the answers?',
        why: 'The question and the answer are put into the span. They can contain names, e-mail addresses and other personal data, and a trace store usually has wider access and a longer life than a chat database. Record lengths, versions and an opaque conversation id, and keep the text in a protected store with its own retention.',
        fix: FIX1,
        cheer: 'Ids and lengths in traces, text elsewhere.'
      }),

      B.bug({
        id: 'm11-bug2', t: 2, src: 'rec', q: 'The dashboard shows a 0 percent error rate for the tools. The logs show many tool failures. Click the line that explains it.',
        file: 'trace.py', lang: 'python', code: BUG2, bad: [7],
        hint: 'Who tells the span that the call failed?',
        why: 'The wrapper catches the exception and returns a string, and nothing marks the span as failed. The status stays at unset, so every span looks fine. Record the exception and set an error status, then return the message so the model can read it. The recorded wrapper does both.',
        fix: FIX2,
        cheer: 'A caught error is still an error in the trace.'
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: where do the traces go?',
        scenario: 'The Brewline assistant will serve 2,000 questions a day. The team wants traces, token metrics and a way to turn bad runs into test cases. The traces may touch personal data. Several vendors offer hosted platforms for traces and evaluations of language-model applications, and the company already runs an OpenTelemetry collector for its other services.',
        opts: [
          { t: 'Instrument with OpenTelemetry, send to the existing collector and a store the company runs, and add an evaluation layer on top', d: 'Standard instrumentation, data stays inside, and the backend can be swapped.' },
          { t: 'Use the SDK of one hosted platform everywhere in the code', d: 'The fastest start, with a good interface for traces and evaluations.', lose: 'The instrumentation is tied to the vendor, and the data leaves the company before anyone has decided that it may. Moving later means rewriting the instrumentation.' },
          { t: 'Log the whole conversation to the application logs and search it', d: 'Nothing new to run.', lose: 'There is no tree and no token metric, the text of every conversation sits in logs with wide access, and a bad run cannot be turned into a test without copying data by hand.' }
        ],
        pick: 0,
        why: 'Standard instrumentation keeps the choice of backend open, and the collector the company already runs keeps the data inside. A hosted platform can still receive the same spans if privacy and cost allow it. Decide what leaves the building before the first trace does.',
        when: 'If the data is not sensitive, and the team is small and needs to move fast, a hosted platform with OpenTelemetry support can be the right start. Check what it stores and where.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'rec', title: 'Incident: the cost per answer doubled and nobody knows why', time: '11:25',
        alert: '**The token cost per answer has doubled over two weeks, with the same traffic and no release.** The model, the prompt and the chunk settings are unchanged. The traces show that the later model calls of a run carry far more input tokens than the first. Some tool results are very long.',
        clues: ['In the recorded run the input tokens were ' + CH.map(function (x) { return x[0]; }).join(', ') + ' for three calls', 'Each call sends the whole conversation again', 'A tool that returns a whole page of text puts it into every later call', 'Nothing alerts on tokens per request'],
        opts: [
          { t: 'Read the traces for the biggest runs, cap the size of tool results, trim or summarise old messages, and add an alert on tokens per request', fb: '' },
          { t: 'Switch to a cheaper model today', fb: 'It lowers the price per token and leaves the waste. It may also lower quality, which nobody measured.' },
          { t: 'Limit questions to 50 words', fb: 'The question is a tiny part of the input. The history and the tool results are the bulk.' },
          { t: 'Turn off tracing to save cost', fb: 'It would remove the only evidence of the cause.' }
        ],
        best: 0,
        why: 'Tokens grow with the length of the conversation, because every call re-sends it, and a large tool result is re-sent at every later step. The trace shows the input tokens of each model call, so the biggest runs point at the tool or the history that grew. Cap tool results, trim or summarise, and alert on tokens per request.',
        checks: [
          ['Find the biggest runs', 'Sort traces by total input tokens. Open the top few and read the span of each tool call.'],
          ['Find the culprit', 'Which tool result is long, and which step carries it for the rest of the run?'],
          ['Cap and trim', 'Limit the size of tool results, summarise old messages, and keep the rules and the latest turns.'],
          ['Measure', 'Run the evaluation set before and after, to check that the answers did not get worse.'],
          ['Alert', 'Alert on tokens per request and on steps per run, using a percentile of normal.']
        ],
        tell: 'Our cost per answer doubled without a release. The traces showed that later model calls in a run carried far more input tokens, because a tool returned long text that was sent again at every step. I capped the size of tool results, summarised old messages, ran the evaluation set before and after to check the quality, and added alerts on tokens per request and steps per run.',
        prevent: ['Alert on **tokens per request** and **steps per run**', 'Cap the **size of tool results**', 'Trim or summarise **history**', 'Run the **evaluation set** after any such change']
      }),

      B.qa({
        id: 'qa-obs', t: 1, tag: 'Observability', secs: 90,
        q: 'How do you monitor an LLM application in production?',
        pts: ['Traces: a span for each model and tool call', 'Metrics: speed percentiles, tokens, cost, tool errors, steps', 'Quality signals: cheap checks, refusals, thumbs', 'Alerts on rates and on outliers', 'Privacy: ids in traces, content in a protected store', 'Failures become test cases'],
        short: 'I use the three signals, and I lean on traces. Each agent run is a trace: a root span, and a span for each model call and each tool call, with the model name, the tokens and the status. In my recording a run of three model calls and two tool calls had one tool error that the user never saw.\n\nFrom the spans I build metrics: latency at the median and the 95th percentile, tokens and cost for each request and each day, steps for each run, the share of runs that hit the step limit, and the error rate of each tool. I add quality signals that I can compute: the share of answers that fail the cheap checks, the rate of refusals, and thumbs down.\n\nI alert on rates and on outliers, not on single events, for example tokens per request far above normal, which finds a loop or a growing prompt. I keep opaque ids in traces and the text in a protected store with a retention period, and I turn flagged traces into cases for the evaluation set.',
        fu: [
          ['What do you alert on first?', 'The daily cost and the tokens per request, because a runaway shows there first, and the tool error rate.'],
          ['How do you sample?', 'Keep all errors and slow runs and a sample of the rest, decided in advance.']
        ],
        trap: 'Logging whole conversations to find bugs. It is a privacy problem and gives no tree.',
        real: 'Describe an incident that a trace helped you explain.'
      }),

      B.qa({
        id: 'qa-trace', t: 1, tag: 'Observability', secs: 60,
        q: 'What does a trace of an agent run contain?',
        pts: ['A root span for the run', 'A child span for each model call', 'A child span for each tool call', 'Attributes: model, tokens, tool name', 'Status, and exceptions as events', 'Opaque ids, and no private text'],
        short: 'A trace of an agent run is a tree. The root span covers the whole run, so its duration is the delay that the user felt. Under it there is a child span for each model call, with the model name and the number of tokens in and out, and one for each tool call, with the tool name and a status.\n\nWhen a tool fails the span gets an error status and the exception is recorded as an event. In my recording, a run had three model spans, two tool spans and one root, and one of the tool spans had an error with two recorded events, while the run ended well. The input tokens of the model spans grew from 15 to 72 to 115, which showed that every call re-sends the conversation.\n\nI use the attribute names of the OpenTelemetry conventions for generative AI, which are still in development. And I keep opaque ids, lengths and versions in the trace, and the text of questions and answers in a protected store.',
        fu: [
          ['How does a span find its parent?', 'The tracer keeps the current span in a context, so a span that starts inside another one becomes its child.'],
          ['What else would you add?', 'The prompt version, the index version and the conversation id, so that a change in behaviour can be linked to a release.']
        ],
        trap: 'Putting the full prompt and answer in every span.',
        real: 'Describe the attributes you recorded and what you left out.'
      }),

      B.qa({
        id: 'qa-metrics-ai', t: 1, tag: 'Observability', secs: 60,
        q: 'Which metrics and alerts would you set up for an AI assistant?',
        pts: ['Latency at the median and the 95th percentile', 'Tokens and cost for each request and for each day', 'Steps for each run, runs that hit the limit, repeated calls', 'Tool error rate for each tool', 'Cheap-check failures, refusals, thumbs down', 'Alerts on outliers and on rates'],
        short: 'I group them. For speed: the delay of a run and of a model call, at the median and the 95th percentile, and for a stream the time to the first piece. For cost: tokens and cost for each request, for each feature and for each day, with an alert on the daily total and on a request far above normal, because that is how a loop or a prompt that grew shows up.\n\nFor the behaviour of an agent: the number of steps in a run, the share of runs that hit the step limit, repeated tool calls, and the error rate for each tool. For quality: the share of answers that fail the cheap checks, the rate of refusals, the share of questions with no answer, and thumbs down. Each is weak for a single answer and strong as a rate.\n\nI alert on outliers and on changes of rate, not on a single failure, because a retry often fixed it. And I look at all of them after every release.',
        fu: [
          ['Why the 95th percentile?', 'The average hides slow runs. A user remembers the slow one.'],
          ['What would tell you a release is bad?', 'A jump in tokens or steps per run, a rise in tool errors or cheap-check failures, and a fall in thumbs up, right after the release.']
        ],
        trap: 'Watching only the average latency and the daily bill.',
        real: 'Describe a dashboard you built for a model-based service.'
      }),

      B.qa({
        id: 'qa-agenteval', t: 2, tag: 'Observability', secs: 90,
        q: 'How do you test and evaluate an agent?',
        pts: ['Two kinds of test: the loop and the model behaviour', 'The loop: scripted model, deterministic, on every commit', 'Behaviour: real model, many runs, scored by outcome and path', 'Safety cases: refusals, injection, unapproved writes', 'Prove that tests can fail by breaking the code', 'Failures from production become cases'],
        short: 'I separate two things. The loop is plain code: the graph, the router, the step limit, the error handling and the approval. I test it with a scripted model that gives the same replies every time, so the tests are fast, free and exact, and they run on every commit. In my recording I had four: the two tools in order, a wrong argument that is fixed, a loop that stops at the limit, and a write that waits for a person.\n\nThe behaviour of the model is a statistical question, so I test it on a set of tasks with a real model, many runs, and I score the outcome and the path: the tools used, the steps, the cost. I include safety cases such as a request for personal data, an injected instruction in a document, and a write that is not approved.\n\nI also check that my tests can fail: I broke the agent on purpose, by removing the limit and then the approval, and exactly the right test failed each time. And flagged traces from production become new cases.',
        fu: [
          ['Why score the path?', 'A right answer reached by ten wasted steps or the wrong tool is a cost problem now and an accuracy problem later.'],
          ['How many runs?', 'Enough to see the spread: each run of a real model differs, so I look at a rate over many runs, not one.']
        ],
        trap: 'Testing only the final answer. The path is where cost and risk are.',
        real: 'Describe a test of an agent that caught a regression.'
      }),

      B.qa({
        id: 'qa-privacy-trace', t: 2, tag: 'Observability', secs: 60,
        q: 'How do you handle privacy in traces and logs of an AI application?',
        pts: ['Questions and answers can hold personal data', 'Record opaque ids, lengths, versions and statuses in traces', 'Keep content in a protected store, linked by id', 'Retention periods, and deletion on request', 'Access control: who can read traces and who can read content', 'Mask before logging, and test for leaks'],
        short: 'The text of questions and answers can contain personal data, and a trace store usually has wider access and a longer life than I want for that. So I record opaque ids, the lengths, the model and prompt versions, tokens and statuses in the traces, and I keep the content in a protected store with its own access control and retention period, linked by the conversation id. Whoever debugs latency does not read private conversations, and whoever needs the text can ask for it with a reason.\n\nI mask known patterns, such as e-mail addresses and phone numbers, before anything is logged, and I test for leaks by scanning the traces and logs for those patterns in CI. I apply the retention period to traces, logs, caches, saved agent state and evaluation sets alike, and I support deletion of a user\'s data across all of them.\n\nThis ties to mission 2, where I masked at parse time: the earlier the better.',
        fu: [
          ['What about debugging a bad answer?', 'Look up the content by conversation id with the right permission, fix the case, and add it to the evaluation set in masked form.'],
          ['What about a vendor platform?', 'Check what it stores, where, for how long, and whether it can delete on request, before any trace is sent.']
        ],
        trap: 'Putting the whole prompt and answer in a span attribute for convenience.',
        real: 'Describe how you kept private data out of logs.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Trace Reader', color: '#FDE68A',
        pts: [
          'A **trace** is a tree: a **root span** for the run, a **span for each model call and each tool call**, with tokens, status and exceptions.',
          'An agent recovers from errors that the user never sees. **Only the trace shows them.** A caught error still needs an **error status**.',
          'The **input tokens grow** with every step, because each call re-sends the conversation. Cap tool results, trim history, and **alert on tokens per request and steps per run**.',
          'Keep **opaque ids, lengths and versions** in traces. Keep **text** in a protected store with retention.',
          'Test the **loop** with a **scripted model** on every commit, and the **model behaviour** with real runs, scoring the **path** and the outcome.',
          '**Break the code on purpose** to prove that each test can fail.'
        ],
        lines: [
          'I read the trace before I change the prompt.',
          'I keep content out of traces.',
          'I check that my tests fail when the rule is broken.'
        ]
      })
    ]
  });
})();
