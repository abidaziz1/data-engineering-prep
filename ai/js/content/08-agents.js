/* Mission 8: agent fundamentals. A LangGraph agent with a model node, a tool node and a router was run with a scripted model: the model is a list of
   replies, so the loop, the error messages, the step limits and the state are real, and the choices are not. A real model chooses its own replies,
   so a real run differs from the recorded one. Which framework to use, how to write tools and prompts come from documentation and common practice. */
(function () {
  var B = LAB.b, G = LAB.get;
  var AG = G.file('agent/agent_graph.py');
  var TR = G.counts('agent.traces'), SC = G.table('agent.scenarios').rows, LM = G.counts('agent.limits'), WA = G.counts('agent.workflow_vs_agent'), RD = G.counts('agent.reducer');
  function trace(k) { return TR[k].map(function (x) { return (x[0] + '      ').slice(0, 9) + '| ' + x[1].replace(/\n/g, ' ').slice(0, 96); }).join('\n'); }
  var TB = trace('B'), TC = trace('C');
  G.expect(TR.A.length === 5 && TR.B.length === 5 && TR.C.length === 12 && TR.B[1][1].indexOf('ERROR: unknown status') >= 0 && TR.C[TR.C.length - 1][0] === 'give_up', 'the three traces');
  G.expect(SC[0][1] === 3 && SC[0][2] === 2 && SC[1][1] === 3 && SC[2][1] === 6 && SC[2][2] === 5, 'model and tool calls in the scenarios');
  G.expect(LM.our_limit === 6 && LM.recursion_limit_used === 10 && /Recursion limit of 10/.test(LM.recursion_error), 'the limits');
  G.expect(WA.workflow.model_calls === 1 && WA.agent.model_calls === 3 && WA.workflow.repeatable === true && WA.agent.repeatable === false, 'workflow against agent');
  G.expect(RD.without_reducer.length === 1 && RD.with_reducer.length === 3, 'the missing reducer replaces the history');
  var BUG1 = [
    'def run(question):',
    '    messages = [user(question)]',
    '    while True:',
    '        reply = model(messages)',
    '        if reply.tool_calls:',
    '            for call in reply.tool_calls:',
    '                messages.append(tool_result(call, tools[call.name](**call.args)))',
    '        else:',
    '            return reply.text'
  ].join('\n');
  var FIX1 = [
    'def run(question, max_steps=6):',
    '    messages = [user(question)]',
    '    for step in range(max_steps):',
    '        reply = model(messages)',
    '        if not reply.tool_calls:',
    '            return reply.text',
    '        for call in reply.tool_calls:',
    '            try:',
    '                result = tools[call.name](**call.args)',
    '            except Exception as e:',
    '                result = "ERROR: " + str(e)            # the model reads the error and can try again',
    '            messages.append(tool_result(call, result))',
    '    return "I stopped after %d steps without an answer." % max_steps'
  ].join('\n');
  var BUG2 = [
    'class State(TypedDict):',
    '    messages: list',
    '    steps: int'
  ].join('\n');
  var FIX2 = [
    'import operator',
    'from typing import Annotated, TypedDict',
    '',
    'class State(TypedDict):',
    '    messages: Annotated[list, operator.add]    # new messages are added, never replaced',
    '    steps: int'
  ].join('\n');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Agents: the loop', short: 'Agents', blurb: 'The loop of model, tools and state, errors as messages, limits, and when not to use an agent', minutes: 48,
    focus: ['air', 'con'],
    goals: [
      'Describe the **agent loop**: the model chooses, the code runs the tool, the result goes back.',
      'Read a **LangGraph graph** with a model node, a tool node and a router.',
      'Return **tool errors as messages** so that the model can recover.',
      'Bound a loop with **a step limit that you own**, and know what the framework limit does.',
      'Choose between **a workflow and an agent**, and say what each costs.',
      'Say why a state field needs **a reducer**.'
    ],
    say: 'Mission 8 is the agent loop. An agent sounds like magic, and it is a while loop: ask the model, run the tool that it asked for, put the result back, ask again. I built one with LangGraph and drove it with a scripted model, so that every run is the same and every number is real: how many model calls, how many tool calls, what an error looks like to the model, and what stops a loop that never ends. A real model would choose its own steps, and I say so every time it matters.',
    scenes: [
      B.talk({
        id: 'm8-talk', t: 1, src: 'docs', title: 'What an agent is, and is not',
        say: 'The word is used for many things. Press Next for the definition that this course uses, and the parts that every agent has.',
        items: [
          ['A loop with a model in it', 'An agent is a loop. The model reads the conversation so far and either asks for a tool or writes an answer. If it asks for a tool, your code runs it and adds the result to the conversation. Then the model reads again. The loop ends when the model answers, or when a limit stops it.', 'Ask, run, add the result, ask again.'],
          ['The model chooses, the code executes', 'The model decides which tool and with which arguments. It cannot run anything. Your code decides whether to run it, checks the arguments, and returns the result. All of the safety of an agent lives in this gap.', 'The gap between asking and running.'],
          ['State', 'The conversation, the number of steps, and anything else the loop needs is the state. It is data that you can save, inspect, and resume. Mission 10 saves it after every step.', 'The state is data, and you own it.'],
          ['A workflow is not an agent', 'In a workflow your code decides the steps, and the model fills in a step, for example by writing the answer. It is cheaper, easier to test and repeatable. An agent decides the steps itself, which handles questions that nobody planned, and which costs more and varies from run to run.', 'Who decides the next step?'],
          ['What goes wrong', 'A loop that repeats the same call, a tool that fails in a way the model cannot read, a wrong tool chosen, a cost that is different for every question, an action taken that nobody approved. Each has a fix in code, and this mission and the next four show them.', 'Every failure has a place in the code.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm8-flow', t: 1, src: 'rec', title: 'The loop, step by step', g: 'agent', legend: true,
        steps: [
          { say: 'This is the loop of the Brewline agent. The user asks, the model decides, a router sends the run to the tools or to the answer, and the state is saved after every step. Press Next to follow one question.', cap: 'The agent loop on one page.' },
          { say: 'Step 1. The user asks: how long do customers have to return beans, and how many orders are completed? Step 2. The model reads it and replies with a request to call the search tool.', on: ['l1', 'l2'], focus: ['a_user', 'a_model'], cap: 'The model chooses a tool.' },
          { say: 'Step 3. A router looks at the reply. A request for a tool goes to the tools. A reply with text goes to the answer. The router is plain code. It is not the model.', on: ['l3'], focus: ['a_route', 'a_tools'], cap: 'Plain code routes the reply.' },
          { say: 'Step 5. The tool result goes back to the model as a message, and the model reads again. In the recording the second reply asked for `orders_by_status`, and the tool answered with a number.', on: ['l5', 'l2'], focus: ['a_tools', 'a_model'], cap: 'The result goes back to the model.' },
          { say: 'Step 6. When the model answers in text, the router ends the loop and the answer goes to the user. In the recording: ' + SC[0][1] + ' model calls and ' + SC[0][2] + ' tool calls for this question.', on: ['l6', 'l7'], focus: ['a_route', 'a_final', 'a_user'], cap: 'Text ends the loop.' },
          { say: 'The state holds the messages and the step count, and a checkpoint is saved after every step. A write tool does not run straight away. It goes through an approval first, which mission 10 adds. A limit on the steps is how this loop ends when the model never answers.', on: ['l4', 'l8'], focus: ['a_gate', 'a_state'], cap: 'State, approval and a limit.' }
        ]
      }),

      B.code({
        id: 'm8-graph', t: 1, src: 'rec', title: 'The agent in code: a graph of three nodes', file: 'agent_graph.py', lang: 'python', code: AG,
        steps: [
          { say: 'This is the whole agent. The lessons show it, and the recorder ran it. It uses LangGraph ' + G.meta('langgraph') + ', which models an agent as a graph: nodes that do work, and edges that say what comes next. The model is a script, so the file has no model call. Read it as a loop in graph form.', lines: null },
          { say: 'The state has two fields. `messages` is the conversation, and it is annotated with `operator.add`, a **reducer**: new messages are added to the list, never replacing it. `steps` counts how many times the model was asked.', lines: G.span(AG, /^class State/, /steps: int/) },
          { say: 'The scripted model: a list of replies, or functions that read the messages and return a reply. Like a real model it keeps nothing between calls. The step is chosen from the messages that it is given, by counting its own earlier replies.', lines: G.span(AG, /^class ScriptedModel/, /return step\(messages\) if callable/) },
          { say: '`call_model` asks the model, and returns the reply as a new message with the role assistant and the step count plus one. This is the only place where the count goes up.', lines: G.span(AG, /def call_model/, /'steps': state\['steps'\] \+ 1\}/) },
          { say: '`run_tools` takes the tool requests of the last message and runs them. An unknown tool is not an exception: it becomes a message that says so. A tool that raises is caught, and the error text goes back to the model as a message with `ok: False`, so that it can try again.', lines: G.span(AG, /def run_tools/, /return \{'messages': out\}/) },
          { say: '`route` is the only decision in the graph. A message with `final` ends the run. Otherwise, if the model has been asked as many times as `max_steps` allows, the run goes to `give_up`. Otherwise it goes to the tools. The limit is yours, written in plain code.', lines: G.span(AG, /def give_up/, /return 'give_up' if state\['steps'\] >= max_steps else 'tools'/) },
          { say: 'Then the graph is wired. Start goes to the model. The model goes to the router, and the router picks one of three. The tools go back to the model. That edge is the loop. The graph is compiled with an optional checkpointer, which mission 10 uses to save the state.', lines: G.span(AG, /g = StateGraph\(State\)/, /return g\.compile/) }
        ],
        note: 'Node `run_tools` also holds an `interrupt` for write tools. It is the subject of mission 10. Everything in this file ran for the recording.'
      }),

      B.widget({ id: 'm8-agent-lab', kind: 'agent', t: 1, src: 'rec', title: 'Lab: replay four runs, compare designs, pick a limit' }),

      B.code({
        id: 'm8-trace', t: 1, src: 'rec', title: 'An error that the model can read', file: 'run B (a wrong argument)', lang: 'text', code: TB,
        steps: [
          { say: 'Run B of the recording, as the graph produced it. Five messages: who wrote each, and what it said. The script has the model make a mistake on purpose, so that you can see what the loop does with it.', lines: null },
          { say: 'The model asks for the orders with the status `done`. There is no such status. The tool does not know it.', lines: [1, 1] },
          { say: 'The tool raised an error, the graph caught it, and the text went back as a message: `' + TR.B[1][1].replace(/^orders_by_status ERROR: /, '') + '`. Read the end of the message. It lists the allowed values. An error written for a model says what was wrong and what is allowed.', lines: [2, 2] },
          { say: 'The model reads that and asks again with `COMPLETED`. In the recording the script picks the first allowed value from the error text, as a real model might. The fix happened in the loop, with no person involved.', lines: [3, 3] },
          { say: 'The tool answers with the number, and the model writes the answer. Three model calls and two tool calls, and one of the tool calls was a mistake that cost a little and no more.', lines: [4, 5] }
        ],
        note: 'If the tool had raised and the graph had not caught it, the whole run would have ended with a stack trace. Returning the error as a message is a design choice for tools in agents.'
      }),

      B.code({
        id: 'm8-loop', t: 1, src: 'rec', title: 'A loop that never ends, and the limit that stops it', file: 'run C (the same call again)', lang: 'text', code: TC,
        steps: [
          { say: 'Run C is the dangerous one. The script makes the model ask for the same search again after every result, and it never writes an answer. Without a limit this would run until something outside stopped it.', lines: null },
          { say: 'Look at the pattern in the first four lines: the same call, `search_policies(query=\'refund\')`, and the same kind of result, twice. Nothing in the model, the tool or the router noticed that nothing new was learned.', lines: [1, 4] },
          { say: 'After ' + LM.our_limit + ' model calls the router sent the run to `give_up`, which wrote the last message: `' + TR.C[TR.C.length - 1][1] + '`. ' + SC[2][1] + ' model calls and ' + SC[2][2] + ' tool calls, and then a graceful answer.', lines: [TR.C.length, TR.C.length] },
          { say: 'The framework has a limit of its own, which I set to ' + LM.recursion_limit_used + ' steps for the test. It stops the run by raising an error: `' + LM.recursion_error.slice(0, 74) + '...`. Your own limit is better for the normal case, because it ends with an answer and a log line that you wrote.', lines: null }
        ],
        note: 'A step limit stops the cost. It does not fix the loop. In the incident below, the real fix is a tool that returns something new, or a check that stops on a repeated call.'
      }),

      B.cmp({
        id: 'm8-workflow', t: 1, src: 'rec', title: 'The same answer as a workflow and as an agent',
        say: 'Both designs gave the same answer to the same question in the recording. Press Next to compare what each one cost and what each one can do.',
        cols: ['', 'Workflow', 'Agent'],
        hl: 2,
        rows: [
          ['Who decides the steps', WA.workflow.steps_decided_by, WA.agent.steps_decided_by],
          ['Model calls', String(WA.workflow.model_calls), String(WA.agent.model_calls)],
          ['Tool calls', String(WA.workflow.tool_calls), String(WA.agent.tool_calls)],
          ['The same steps every time', WA.workflow.repeatable ? 'yes' : 'no', WA.agent.repeatable ? 'yes' : 'no'],
          ['A question nobody planned', 'It fails, or a person adds a branch.', 'It may find a path. It may also find a bad one.']
        ],
        steps: [
          { upto: 1, say: 'In a workflow the code decides: search the policies, count the orders, then ask the model to write the answer from both. In an agent, the model decides each step.' },
          { upto: 2, say: 'The workflow asked the model **once**. The agent asked it **three times**, to choose each step and to write the answer. Each call is a bill and a delay.' },
          { upto: 3, say: 'Tool calls were the same here: two. In general an agent can call more, fewer, or other tools than you planned.' },
          { upto: 4, say: 'A workflow takes the same steps for the same input, which makes it easy to test. An agent does not promise that, so you test its behaviour on many questions.' },
          { upto: 5, say: 'The agent can handle a question that you did not plan for, and that is its whole value. Everything else about it is a cost.' }
        ],
        pick: 'Use a **workflow** when you know the steps. Use an **agent** when the path depends on what is found, and then **limit, log and test** it. Many good systems are a workflow with one agent step inside.'
      }),

      B.talk({
        id: 'm8-tools', t: 1, src: 'docs', title: 'Designing a tool for a model',
        say: 'A tool is an interface whose caller is a model. The rules are close to the rules for an API, and a few are special. Press Next for each.',
        items: [
          ['A name and a description for a model', 'The model chooses tools by reading their descriptions. Say what the tool does, when to use it, and what it returns, in plain words. A vague description leads to wrong choices. Few well-described tools beat many similar ones.', 'The description is the interface.'],
          ['A narrow input schema', 'Use enums for fixed values, types for numbers, and limits for sizes. In the recording the status was one of three values, and the wrong one was caught. The narrower the schema, the fewer ways to be wrong, and your code still checks every argument.', 'Narrow inputs, checked in code.'],
          ['Errors written for a model', 'Return a message that says what was wrong and what is allowed: "unknown status \'done\'. allowed: COMPLETED, CANCELLED, PENDING". A model can fix that. It cannot fix "error 500".', 'Say what is allowed.'],
          ['Bounded results', 'Return a limited amount of text: the first few rows, a count, a short excerpt. A tool that returns a whole table fills the window and the bill. Return a handle or a page marker if there is more.', 'A small result, with a way to ask for more.'],
          ['Read or write', 'Say which tools only read and which change something. Writes need an approval, idempotency and an audit record. Give an agent only the tools that its job needs, because every tool is a thing that a hijacked agent can use.', 'Give it the fewest tools that work.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm8-prompt', t: 2, src: 'docs', title: 'The prompt of an agent is configuration',
        say: 'The system prompt tells the model what it is, what it may do and when to stop. It is text, and it changes behaviour as much as code does. Press Next for how to treat it.',
        items: [
          ['What goes in', 'The role of the assistant, the tools and when to use each, how to cite sources, what to do when the sources do not answer (say so, and do not guess), and when to stop. Keep it short and concrete.', 'Role, tools, citations, refusals, stopping.'],
          ['What stays out', 'Secrets, internal addresses, and rules that only a prompt enforces. A prompt can be argued with by a user or a document. A rule that matters, such as who may be refunded, belongs in code.', 'Rules that matter live in code.'],
          ['Version it', 'Keep the prompt in a file under version control, with a version number that is logged with every run. Run the evaluation set when it changes. A prompt edited in a dashboard is a release that nobody reviewed.', 'A prompt change is a release.'],
          ['Test the behaviour', 'Agents are tested on behaviour: did it choose the right tool, stop after a sensible number of steps, refuse what it must? Add those cases to the golden set and check the trace as well as the final text.', 'Test the path as well as the answer.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm8-frameworks', t: 1, src: 'docs', title: 'The frameworks that job posts name',
        say: 'Job posts for agent roles name many frameworks. Press Next to read them in groups. I ran only LangGraph for this course, so the rest is from their documentation, in broad strokes. Frameworks change fast, so check the current state before you choose.',
        cols: ['Group', 'Examples', 'What it gives you', 'Think about'],
        hl: 2,
        rows: [
          ['Graph and state', 'LangGraph', 'Nodes, edges, state, checkpoints, interrupts, streaming. The agent is a graph that you control.', 'More code than a prebuilt agent. Full control of the loop.'],
          ['Component libraries', 'LangChain, LlamaIndex, Haystack', 'Loaders, splitters, retrievers, tool wrappers and integrations. LlamaIndex centres on data and indexing.', 'Fast to start. Read what they hide.'],
          ['Multi-agent', 'CrewAI, AutoGen, Semantic Kernel', 'Several agents with roles that talk to each other, or plugins for apps. Microsoft has several projects in this area.', 'More agents mean more calls, cost and ways to loop.'],
          ['Provider SDKs', 'OpenAI Agents SDK, Claude Agent SDK', 'A loop, tools, handoffs, guardrails and tracing that match one provider.', 'Easy to start, tied to the provider.'],
          ['Plain code', 'A loop of fifty lines', 'No dependency. You see every call.', 'You build state, retries and tracing yourself.']
        ],
        steps: [
          { upto: 1, say: 'LangGraph is the one in this course. It treats the agent as a graph with state that can be saved and resumed, which suits long-running agents and approvals.' },
          { upto: 2, say: 'LangChain, LlamaIndex and Haystack bring components. They save time on loaders and retrievers, and they can hide a prompt or a retry that you need to see.' },
          { upto: 3, say: 'CrewAI, AutoGen and Semantic Kernel lean toward several agents or toward plugging models into applications. More agents is not more intelligence: it is more calls.' },
          { upto: 4, say: 'The provider SDKs give you a ready loop with tools, handoffs and guardrails for one provider. Convenient, and a commitment.' },
          { upto: 5, say: 'And a plain loop is a fair choice for a simple agent. It is also the best way to learn what the frameworks do.' }
        ],
        pick: 'Pick the **smallest tool that gives you state, limits, approvals and traces**, and make sure that you can read what it sends to the model. A framework is a dependency, and the loop is the part that you must understand.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'In an agent loop, which part runs the tool?',
        opts: [
          { t: 'Your code, after it has checked the arguments that the model asked for', fb: '' },
          { t: 'The model, inside the provider', fb: 'The model only produces a request. It has no access to your functions.' },
          { t: 'The framework, with no checks', fb: 'A framework may run your function, and you decide what it checks first.' },
          { t: 'The user', fb: 'Only for an approval step. The call itself is run by code.' }
        ],
        ok: 0, why: 'The model asks and the code executes. That gap is where you validate arguments, check permissions, ask a person, and write the audit record.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'Run C repeated the same search again and again. What ended it in the recording?',
        opts: [
          { t: 'A step limit in the router that sent the run to a node that gives up', fb: '' },
          { t: 'The model realised that it was repeating itself', fb: 'The script never changed its reply. The model did not stop.' },
          { t: 'The tool ran out of results', fb: 'The tool answered every time.' },
          { t: 'The provider cancelled the run', fb: 'No provider was involved.' }
        ],
        ok: 0, why: 'After ' + LM.our_limit + ' model calls the router sent the run to `give_up`. A loop needs a limit that you wrote, because nothing in the model or the tool stops a repetition.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'The tool raises an exception for an unknown status. Why does the graph catch it and return it as a message?',
        opts: [
          { t: 'So that the model can read the error and try again, and the run does not end in a stack trace', fb: '' },
          { t: 'To hide errors from the logs', fb: 'The error is in the trace and the logs. It is also given to the model.' },
          { t: 'Because exceptions are slow', fb: 'Speed is not the reason.' },
          { t: 'Because the framework forbids exceptions', fb: 'It does not. This is a design choice.' }
        ],
        ok: 0, why: 'In run B the message listed the allowed values, and the next reply used one of them. The run recovered with no person. A tool that crashes the loop has to be fixed by an engineer.'
      }),

      B.quiz({
        id: 'm8-q4', t: 1,
        q: 'A process always does three things in the same order: fetch an order, find the policy, write a decision. Which design fits?',
        opts: [
          { t: 'A workflow: the code runs the three steps, and the model writes the decision', fb: '' },
          { t: 'An agent that chooses its own tools', fb: 'The steps are known, so an agent adds cost and variation for nothing.' },
          { t: 'Several agents that talk to each other', fb: 'It multiplies the cost for a fixed process.' },
          { t: 'Fine-tuning a model', fb: 'The problem is orchestration, not behaviour.' }
        ],
        ok: 0, why: 'When you know the steps, write them. The recorded workflow asked the model once, the agent three times, for the same answer. Choose an agent when the path depends on what is found.'
      }),

      B.quiz({
        id: 'm8-q5', t: 2,
        q: 'A LangGraph state declares `messages: list` with no annotation. Two nodes each return `{"messages": [one message]}`. What does the state hold at the end?',
        opts: [
          { t: 'Only the message of the last node, because without a reducer a returned value replaces the field', fb: '' },
          { t: 'Both messages, because lists are always added together', fb: 'Only a reducer such as `operator.add` adds. Plain assignment replaces.' },
          { t: 'The starting message and both new ones', fb: 'That is the result with `Annotated[list, operator.add]`.' },
          { t: 'An error', fb: 'It runs without an error, and that is the danger.' }
        ],
        ok: 0, why: 'In the recording, the plain list ended as ' + JSON.stringify(RD.without_reducer) + ' and the list with `operator.add` as ' + JSON.stringify(RD.with_reducer) + '. Without the reducer the agent forgets everything but the last message, and nothing fails.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the building of an agent loop in order.',
        items: [
          'Write the tools, each with a narrow schema and errors that say what is allowed',
          'Define the state: the messages with a reducer, and the step count',
          'Write the node that asks the model and adds its reply',
          'Write the node that runs the requested tools and returns errors as messages',
          'Write the router: a final answer ends, too many steps gives up, otherwise run the tools',
          'Wire the graph and test it with a scripted model before a real one',
          'Add traces, limits and an evaluation set of behaviours'
        ],
        why: 'The tools and the state are the foundation. The router holds the rules of the loop. A scripted model lets you test the loop deterministically, which a real model never allows. Traces and behaviour tests come last, and they are not optional.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'This agent loop works in the demo. In production one run keeps going for an hour. Click the line that allows it.',
        file: 'agent.py', lang: 'python', code: BUG1, bad: [3],
        hint: 'What ends the loop if the model never answers?',
        why: '`while True` has no way out except an answer. If the model keeps asking for tools, the loop runs, and bills, for ever. The tool call is also not guarded: an exception ends the run. Count the steps and give up at a limit, and return tool errors as messages.',
        fix: FIX1,
        cheer: 'Every loop needs a limit.'
      }),

      B.bug({
        id: 'm8-bug2', t: 2, src: 'rec', q: 'An agent forgets what the user asked after the first tool call. The graph runs without errors. Click the line that causes it.',
        file: 'state.py', lang: 'python', code: BUG2, bad: [2],
        hint: 'How does LangGraph combine what two nodes return?',
        why: 'Without a reducer, the value that a node returns replaces the field. `messages` was replaced by the new message each time, so the history was lost. The recording shows it: `' + JSON.stringify(RD.without_reducer) + '` against `' + JSON.stringify(RD.with_reducer) + '`. Annotate the field with `operator.add`.',
        fix: FIX2,
        cheer: 'A list in the state needs a reducer.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'rec', title: 'Decision: how does the assistant decide whether an order is refundable?',
        scenario: 'A manager asks "Can I refund order ORD-2026-0412?". The answer needs the order (a tool), the policy (a search), and a judgement. Brewline has 40 such questions an hour. The process is the same every time: fetch the order, find the policy, decide.',
        opts: [
          { t: 'A free agent with all the tools, which decides its own steps', d: 'Flexible. It can cope with odd questions.', lose: 'It costs about three model calls where one is enough (' + WA.agent.model_calls + ' against ' + WA.workflow.model_calls + ' in the recording), and it may skip a step or take one twice. A refund decision should be the same for the same order.' },
          { t: 'A workflow: fetch the order, search the policy, and ask the model once to decide with both', d: 'One model call, the same steps every time, easy to test.' },
          { t: 'A single prompt with the whole policy and no tools', d: 'The simplest thing.', lose: 'It cannot read the order, and it sends the whole policy on every call.' }
        ],
        pick: 1,
        why: 'The path is known, so the code should own it. The model does the one thing that code cannot: weigh the order against the policy and write the decision. The result is cheaper, repeatable and testable. The write itself is a separate step that a person approves.',
        when: 'Use an agent for the questions that do not fit the workflow, for example "why were refunds high last week?", where the next step depends on what the last one found.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: one question costs ten times the usual', time: '15:30',
        alert: '**The cost for one user session is ten times the average, and the trace shows the same search call repeated.** The agent asked for `search_policies` with the query "refund" again and again, and each result looked the same to it. The run ended only when a worker timed out. There is no step limit.',
        clues: ['The trace shows the same tool call with the same arguments', 'The results did not change between calls', 'There is no limit on the steps', 'In run C of the recording the limit of ' + LM.our_limit + ' ended the same pattern'],
        opts: [
          { t: 'Add a step limit that gives up gracefully, stop when the same call repeats, and fix the tool so that its result says when there is nothing more', fb: '' },
          { t: 'Raise the worker timeout so that runs can finish', fb: 'The run never finishes. A longer timeout only costs more.' },
          { t: 'Remove the search tool', fb: 'It removes the capability and not the loop. The model will repeat another call.' },
          { t: 'Ask the model not to repeat itself in the prompt', fb: 'It may help a little. It is not a control, and the next odd input does it again.' }
        ],
        best: 0,
        why: 'Nothing in a loop notices a repetition unless you write it down. A hard limit on steps caps the cost, a check for a repeated call with the same arguments catches the pattern at the second time, and a tool result that says "no more results" gives the model a reason to stop. Count loops in the traces and alert on long runs.',
        checks: [
          ['Read the trace', 'List the tool calls of the run. Are they the same? Are the results the same?'],
          ['Cap it', 'Add a step limit that ends with a clear message, as `give_up` does.'],
          ['Detect repeats', 'If the same tool and the same arguments appear twice, stop or change the instruction.'],
          ['Fix the tool', 'Return a short result that says "no further results", or a page marker, so the model knows when to stop.'],
          ['Alert', 'Alert on runs with more steps or more tokens than the 99th percentile.']
        ],
        tell: 'One session cost ten times the average because the agent repeated the same search call and got the same answer each time, with no limit on steps. I added a step limit that gives up with a clear message, a check that stops when the same call repeats with the same arguments, and a tool result that says when there is nothing more. I added an alert on runs that are longer or more expensive than usual.',
        prevent: ['A **step limit** on every agent, that you own', 'Detect **repeated calls**', 'Tool results that say **when there is no more**', 'Alert on **long or costly runs**']
      }),

      B.qa({
        id: 'qa-agent', t: 1, tag: 'Agents', secs: 60,
        q: 'What is an AI agent, and how does it differ from a workflow?',
        pts: ['A loop: the model chooses a tool or answers', 'The model asks, your code runs the tool', 'The result goes back, and the model chooses again', 'A workflow: the code decides the steps', 'An agent costs more and varies, a workflow is repeatable', 'Use an agent when the path depends on what is found'],
        short: 'An agent is a loop with a model in it. The model reads the conversation and either asks for a tool or writes an answer. If it asks for a tool, my code checks the arguments, runs the tool and adds the result to the conversation, and the model chooses again, until it answers or a limit stops it. The model asks. It never runs anything.\n\nA workflow is the other design: my code decides the steps, and the model fills in one of them, for example by writing the answer. In my recording the same question took one model call as a workflow and three as an agent, and the workflow took the same steps every time while the agent does not promise that.\n\nSo I use a workflow when I know the steps, because it is cheaper and easier to test, and an agent when the path depends on what is found. Then I add limits, logging and tests of behaviour, because an agent can loop, choose a wrong tool and cost something different on every question.',
        fu: [
          ['Where is the safety in an agent?', 'In the gap between the request and the execution: argument checks, permissions, approval of writes, limits and an audit record.'],
          ['Can an agent contain a workflow?', 'Yes, and the other way round: a workflow often has one agent step for the part that needs to explore.']
        ],
        trap: 'Saying that an agent is a model that acts by itself. The model asks, and your code acts.',
        real: 'Describe something you built as a workflow or as an agent, and why.'
      }),

      B.qa({
        id: 'qa-loop', t: 1, tag: 'Agents', secs: 60,
        q: 'Walk me through the loop of a tool-using agent.',
        pts: ['The user message and the state go to the model', 'The reply is a tool request or a final answer', 'A router sends tool requests to the tools', 'The result is added to the messages as an observation', 'Errors are returned as messages', 'A limit and a give-up path end a loop that never answers'],
        short: 'The user message goes into the state, and I call the model with the messages and the tool definitions. The reply is either a request to call a tool or a final answer. A router, which is plain code, decides: a final answer ends the run, and a tool request goes to the tool node.\n\nThe tool node checks the arguments, runs the tool, and adds the result to the messages. If the tool raises, I return the error as a message that says what was wrong and what is allowed, so that the model can try again. In my recording, a wrong status was fixed on the second try with no person.\n\nThen the model is called again with the longer conversation. The loop ends when the model answers, or when my step limit sends the run to a give-up node with a clear message. I save the state after every step, so that I can inspect and resume it.',
        fu: [
          ['Why is the router not the model?', 'Whether to stop is a rule that I want to write and test. I use the model for the choices that need judgement.'],
          ['What do you log?', 'Each step: the tool, the arguments, the result size, the tokens and the time, so that a long or odd run can be explained.']
        ],
        trap: 'Describing only the happy path. The interviewer wants limits, errors and state.',
        real: 'Describe an agent loop you built and how it ended in the worst case.'
      }),

      B.qa({
        id: 'qa-limits', t: 1, tag: 'Agents', secs: 60,
        q: 'How do you keep an agent from running away?',
        pts: ['A step limit that ends with a clear message', 'A repeated-call check', 'A token and time budget for each run', 'Few tools, and read-only by default', 'Approval for writes', 'Alerts on long or expensive runs'],
        short: 'I bound the loop in several ways, because nothing in a model stops a repetition by itself. A step limit that I own ends the run with a clear message: in my recording, a model that asked for the same search again and again was stopped after six steps with five tool calls, and the caller got an answer instead of a stack trace. The framework has its own limit and it raises an error, so I keep it as a net and handle the error.\n\nI add a check for a repeated call with the same arguments, a budget of tokens and time for each run, and a small set of tools, read-only unless the job needs a write, with an approval for every write. And I alert on runs that are longer or more costly than the 99th percentile, because that is how a runaway shows up in production.\n\nA limit protects the bill. It does not fix the cause, so I read the trace of every run that hits it.',
        fu: [
          ['What would you choose as the step limit?', 'A few steps above the longest legitimate run in the logs. Too low cuts good runs, and too high allows a loop to cost a lot.'],
          ['What happens at the limit?', 'A graceful message, a log line, and perhaps a handover to a person. Never a silent failure.']
        ],
        trap: 'Relying on the framework limit alone. It ends with an exception.',
        real: 'Describe a runaway agent run and the limit that you added.'
      }),

      B.qa({
        id: 'qa-when', t: 2, tag: 'Agents', secs: 60,
        q: 'When would you not use an agent?',
        pts: ['When the steps are known: write a workflow', 'When the answer must be exact and repeatable', 'When the cost per request must be fixed', 'When a mistake is expensive and there is no approval step', 'When a single retrieval and prompt is enough', 'When you cannot test its behaviour'],
        short: 'I avoid an agent when the steps are known, because a workflow is cheaper, repeatable and easy to test. In my recording the same question took one model call as a workflow and three as an agent.\n\nI also avoid it when the answer must be exact and the same every time, such as a calculation or a decision under a policy, when the cost per request must be predictable, and when a mistake is expensive and there is no place for an approval. A single retrieval and one prompt is often enough for a question about a document, and an agent around it adds calls and ways to fail.\n\nAnd I avoid it when I cannot test the behaviour. An agent needs a set of behaviour tests as well as answer tests: did it choose the right tool, stop after a reasonable number of steps, refuse what it should? If I cannot write those, I am not ready to ship one.',
        fu: [
          ['What is a good use of an agent?', 'Open questions where the next step depends on what the last one found, such as investigating why a number changed.'],
          ['Can you start with a workflow and add an agent?', 'Yes, and it is my usual path: a workflow for the known cases, and an agent step for the part that needs to explore.']
        ],
        trap: 'Picking an agent because it is fashionable. Pick it for a path that cannot be written down.',
        real: 'Describe a feature where you chose a workflow over an agent and what it saved.'
      }),

      B.qa({
        id: 'qa-graph', t: 1, tag: 'Agents', secs: 60,
        q: 'Why would you use a graph framework such as LangGraph for an agent?',
        pts: ['The agent is explicit: nodes, edges and a router', 'State with reducers that you control', 'Checkpoints let you save, inspect and resume', 'Interrupts support human approval', 'Streaming and tracing hooks', 'The cost: more code, and a dependency to understand'],
        short: 'A graph makes the agent explicit. The nodes are the steps, the edges and the router are the rules of the loop, and the state is a typed object with reducers that say how updates combine. In my recording the graph had three nodes and a router, and I could read the whole control flow in a few lines.\n\nThe framework adds things that I would otherwise build: a checkpointer that saves the state after every step, so that a run can be inspected and resumed, an interrupt for human approval, and streaming of the steps. In my recording, a write waited for approval, and a new graph object resumed from the saved state.\n\nThe cost is a dependency and more code than a prebuilt agent, and some details need care, such as a state field without a reducer, which silently replaces the history. For a very simple agent a plain loop is also fine, and I pick the smallest tool that gives me state, limits, approvals and traces.',
        fu: [
          ['What is a reducer?', 'A rule for combining the old value of a state field with an update. `operator.add` on a list appends. Without one, the update replaces the value.'],
          ['What would you check before adopting one?', 'That I can read exactly what is sent to the model, that I can test with a scripted model, and that its checkpointing fits my store.']
        ],
        trap: 'Choosing a framework for its list of integrations and not for how it handles state and control.',
        real: 'Describe how you chose between a framework and a plain loop.'
      }),

      B.qa({
        id: 'qa-tooldesign', t: 1, tag: 'Agents', secs: 60,
        q: 'How do you design tools for an agent?',
        pts: ['A clear name and description, written for a model', 'A narrow schema: enums, types, limits', 'Errors that say what was wrong and what is allowed', 'Bounded results, with a way to ask for more', 'Read tools and write tools are separated', 'Few tools, and the fewest that do the job'],
        short: 'I treat a tool as an API whose caller is a model. The name and the description say what it does, when to use it and what it returns, in plain words, because the model chooses by reading them. The input schema is narrow: enums for fixed values, types, and limits, and I check every argument in code anyway.\n\nErrors are written for a model. In my recording, the message "unknown status done, allowed COMPLETED, CANCELLED, PENDING" let the next call fix itself. Results are bounded: a count, a few rows, a short excerpt, with a way to ask for more, so that a tool does not fill the window.\n\nI separate read tools from write tools, put an approval and an idempotency key on every write, and keep the set small, because each extra tool is one more choice that the model can get wrong and one more thing that a hijacked agent can use.',
        fu: [
          ['How many tools is too many?', 'When the model starts to choose wrongly, or when the definitions take a large share of the prompt. In my recording, three tools took a few hundred tokens, and forty would cost thousands in every request.'],
          ['How do you test a tool?', 'Unit tests as for any function, tests of its error messages, and agent-level tests that check it is chosen for the right questions.']
        ],
        trap: 'Exposing every internal function as a tool. The model will use the wrong one.',
        real: 'Describe a tool you rewrote because the model used it badly.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Loop Builder', color: '#BAE6FD',
        pts: [
          'An **agent is a loop**: the model asks for a tool or answers, **your code runs the tool**, the result goes back.',
          'A **router in plain code** decides: a final answer ends, too many steps gives up, otherwise run the tools.',
          'Return **tool errors as messages** that say what is allowed, and the model can recover.',
          'Own a **step limit**. The framework limit raises an error. Check for **repeated calls**.',
          'A **workflow** is cheaper and repeatable. An **agent** handles the unplanned and costs more. Use the smallest design that works.',
          'A state field that holds a list needs a **reducer**, or the history is replaced.'
        ],
        lines: [
          'I decide who chooses the next step: my code or the model.',
          'I write the limit before I write the loop.',
          'I write tool errors for the model that reads them.'
        ]
      })
    ]
  });
})();
