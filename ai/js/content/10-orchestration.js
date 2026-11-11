/* Mission 10: state, memory, approvals and several agents. A LangGraph agent was run to a pause, resumed with an approval and with a refusal, replayed
   from a checkpoint, and resumed by a new graph object from a SQLite file. The counts (refunds written, tools that ran again, checkpoints) are
   recorded. The model is a script, so a real model may behave differently. Multi-agent patterns, long-term memory and agent-to-agent protocols
   come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var AR = G.file('code/agent_runs.py'), AG = G.file('agent/agent_graph.py');
  function ex(text, a, b) { var r = G.span(text, a, b); return G.lines(text, r[0], r[1]); }
  var RUNT = ex(AG, /def run_tools/, /return \{'messages': out\}/);
  var IN = G.counts('agent.interrupt'), DU = G.counts('agent.durable'), RP = G.counts('agent.replay'), RR = G.counts('agent.resume_runs_again'), TR = G.counts('agent.traces'), HI = G.table('agent.history').rows;
  G.expect(IN.refunds_before_resume === 0 && IN.refunds_after_approve === 1 && IN.refunds_after_deny === 0 && IN.next_node_while_paused.join() === 'tools' && IN.payload[0].tool === 'issue_refund', 'the interrupt');
  G.expect(DU.checkpoints_for_the_thread_while_paused === 3 && DU.refunds_after_resume_in_a_new_graph_object === 1 && DU.tables.indexOf('checkpoints') >= 0 && DU.tables.indexOf('writes') >= 0, 'the durable run');
  G.expect(RP.checkpoints === 7 && RP.tools_run_again.search_policies === 1 && RP.tools_run_again.orders_by_status === 1 && HI.length === 7 && HI[2][1] === 'tools', 'the replay');
  G.expect(RR.tool_calls_before_resume.search_policies === 1 && RR.tool_calls_after_resume.search_policies === 2 && RR.tool_calls_after_resume.issue_refund === 1, 'resume starts the node again');
  G.expect(TR.D_denied[TR.D_denied.length - 1][1].indexOf('Done') >= 0 && TR.D_denied[TR.D_denied.length - 2][1].indexOf('the approver said no') >= 0, 'the denied run still says Done');
  var BUG1 = [
    'def run_tools(state):',
    '    for call in state["messages"][-1]["tool_calls"]:',
    '        result = tools[call["name"]](**call["args"])',
    '        if call["name"] in WRITE_TOOLS:',
    '            decision = interrupt({"tool": call["name"], "args": call["args"]})',
    '            if decision != "approve":',
    '                result = "the approver said no"',
    '        out.append(tool_message(call, result))'
  ].join('\n');
  var FIX1 = [
    'def run_tools(state):',
    '    for call in state["messages"][-1]["tool_calls"]:',
    '        if call["name"] in WRITE_TOOLS:',
    '            decision = interrupt({"tool": call["name"], "args": call["args"]})   # ask first',
    '            if decision != "approve":',
    '                out.append(tool_message(call, "the approver said no"))',
    '                continue',
    '        result = tools[call["name"]](**call["args"])                            # run only after the answer',
    '        out.append(tool_message(call, result))'
  ].join('\n');
  var BUG2 = [
    'def ask(question, user):',
    '    config = {"configurable": {"thread_id": "assistant"}}',
    '    return graph.invoke({"messages": [user_message(question)], "steps": 0}, config)'
  ].join('\n');
  var FIX2 = [
    'def ask(question, user, conversation_id):',
    '    config = {"configurable": {"thread_id": user.id + ":" + conversation_id}}',
    '    return graph.invoke({"messages": [user_message(question)], "steps": 0}, config)'
  ].join('\n');

  LAB.addChapter({
    id: 'm10', n: 10, title: 'State, approvals and several agents', short: 'Orchestration', blurb: 'Checkpoints, a person in the loop, resume and replay, durable runs, memory, and when one agent becomes several', minutes: 54,
    focus: ['air', 'sf'],
    goals: [
      'Explain **state, checkpoints and threads**, and what they let you do.',
      'Add **human approval** to a write tool, and say what the approver must see.',
      'Say what **resume** does to the code before the question, and make it safe.',
      'Make a run **durable**: the state in a database, not in memory.',
      'Choose between **one agent and several**, and name the cost of each hop.',
      'Treat **memory** as data with labels, a retention period and a delete.'
    ],
    say: 'Mission 10 is about what happens to an agent over time. A run may pause for a person for three days, a worker may crash, a deploy may happen in the middle. I ran the LangGraph agent to a pause, resumed it with an approval and with a refusal, replayed it from a checkpoint, and resumed it from a SQLite file with a brand new graph object. All the counts are real: refunds written, tools run again, checkpoints saved. The model is still a script.',
    scenes: [
      B.talk({
        id: 'm10-talk', t: 1, src: 'docs', title: 'State, threads and memory',
        say: 'The word memory covers several different things. Press Next for the ones that matter to a data engineer, and where each one lives.',
        items: [
          ['State of a run', 'The messages, the step count and anything else the loop needs. It is saved after every step as a checkpoint, in a store of your choice. It lets you pause, resume, replay and inspect a run, and it is the part that a crash must not lose.', 'The data of one run.'],
          ['A thread', 'A thread is one conversation, with an id. The checkpointer keeps the state of each thread under its id. If two users share an id, they share a state, which is a leak. The id must be built from the user and the conversation.', 'One id for one person and conversation.'],
          ['Short-term memory', 'The conversation so far, which goes into every prompt. It grows with every step, and a long thread fills the window and the bill. Trim old messages, or replace them with a summary, and keep the system rules and the latest turns.', 'The history, trimmed to fit.'],
          ['Long-term memory', 'Facts that outlive a conversation: a preference, a decision, a name. They live in a store of their own, keyed by user, often searched like documents. They help, and they are data about a person.', 'Facts that last, stored per user.'],
          ['Memory is data', 'Give every memory an owner, a label, a source, a time to expire and a way to delete it. A user must be able to see and remove what is kept about them. A memory that came from a document can carry an injected instruction, so treat it as untrusted text.', 'Owner, label, expiry, delete.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-runs', t: 1, src: 'rec', title: 'Running a graph to a pause, and on', file: 'agent_runs.py', lang: 'python', code: AR,
        steps: [
          { say: 'These five small functions are how the recorder ran the graph of mission 8: to a pause, through a decision, and back through its checkpoints. LangGraph ' + G.meta('langgraph') + ' does the work. The functions only give it a shape that a lesson can read.', lines: null },
          { say: 'A thread is a dictionary with an id. The checkpointer keeps one saved state for each thread id, and every function below takes that dictionary.', lines: G.span(AR, /^def thread/, /return \{'configurable'/) },
          { say: '`run` streams the graph and returns what each node did. It stops when the graph ends, or when a node asks a person and the run pauses. The first argument is the starting state, or a command that resumes.', lines: G.span(AR, /^def run/, /return list\(graph\.stream/) },
          { say: '`paused` reads the saved state: the next node, and the questions that are waiting for a person. Your application shows these to the approver. The recording found the node `' + IN.next_node_while_paused.join(', ') + '` waiting with one question.', lines: G.span(AR, /^def paused/, /return list\(snap\.next\)/) },
          { say: '`decide` resumes with the answer of the person. The graph continues from the saved state, and the node that asked starts again, as the lab showed, and receives the answer from the `interrupt` call.', lines: G.span(AR, /^def decide/, /return run\(graph, Command/) },
          { say: '`checkpoints` lists every saved state of a thread, and `replay_from` runs the graph again from one of them. The recording had ' + RP.checkpoints + ' checkpoints for a run with three model calls.', lines: G.span(AR, /^def checkpoints/, /return graph\.invoke\(None, checkpoint\.config\)/) }
        ],
        note: 'The checkpointer is a parameter of `make_graph`. An in-memory one lasts as long as the process. A SQLite file or a database survives it, and the lab shows that.'
      }),

      B.widget({ id: 'm10-ckpt-lab', kind: 'ckpt', t: 1, src: 'rec', title: 'Lab: checkpoints, a pause for a person, and a resume' }),

      B.code({
        id: 'm10-interrupt', t: 1, src: 'rec', title: 'The approval inside the tool node', file: 'agent_graph.py (run_tools)', lang: 'python', code: RUNT,
        steps: [
          { say: 'This is the tool node from mission 8, and now the part about writes matters. A set of write tools is named at the top of the file. For these, the node does not run the tool at once. It asks a person first.', lines: null },
          { say: 'For a tool in the write set, the node calls `interrupt` with a payload: the tool, its arguments and a question. The graph stops there and saves its state. The application reads the payload with `paused` and shows it to a person.', lines: G.span(RUNT, /if approve_writes and name in WRITE_TOOLS/, /decision = interrupt/) },
          { say: 'When the decision comes back, the node continues from that line. Anything other than `approve` becomes a tool message that says the approver refused, and the model reads it. The tool does not run.', lines: G.span(RUNT, /if decision != 'approve'/, /^\s+continue$/) },
          { say: 'Only an approved call reaches the `try` that runs the tool. The order is the whole point: **ask, then run**. The bug hunt below puts the question after the call.', lines: G.span(RUNT, /^\s+try:/, /out\.append\(\{'role': 'tool', 'name': name, 'ok': True/) }
        ],
        note: 'The approval happens in the graph, and the rule that matters, such as a maximum amount, should also be enforced in the tool itself. An approval that nobody reads is a click, not a control.'
      }),

      B.flow({
        id: 'm10-multi', t: 1, src: 'docs', title: 'A supervisor with three workers', g: 'multi', legend: true,
        steps: [
          { say: 'When one agent has too many tools, or when parts of a job need different rights, a design with several agents is an option. This is the supervisor pattern. Press Next. The recording did not run it. It runs on the same loop as mission 8, so the ideas carry over.', cap: 'One supervisor, three workers.' },
          { say: 'Step 1. The question arrives at the supervisor. It is an agent whose tools are the other agents. It splits the question and decides which worker should handle each part.', on: ['b1', 'b2a', 'b2b', 'b2c'], focus: ['u_user', 'u_sup', 'u_w1', 'u_w2', 'u_w3'], cap: 'The supervisor splits and routes.' },
          { say: 'Step 2. The policy worker has only a search tool. The data worker has only a read-only query. The refund worker has a write tool. Each worker has the fewest tools and the narrowest rights for its job, and that is the real benefit.', focus: ['u_w1', 'u_w2', 'u_w3'], cap: 'Each worker gets the fewest rights.' },
          { say: 'Step 3. The refund worker\'s write goes to an approval gate, as in the lab. The approval belongs to the write, wherever the write is in the graph.', on: ['b3'], focus: ['u_w3', 'u_gate'], cap: 'A write still waits for a person.' },
          { say: 'Step 4. The workers report back to the supervisor, which writes one answer with its sources. They share one state, which records the question, what each worker found, and who approved what.', on: ['b4', 'b5'], focus: ['u_sup', 'u_ans', 'u_state'], cap: 'One answer, one state.' }
        ]
      }),

      B.cmp({
        id: 'm10-patterns', t: 1, src: 'docs', title: 'One agent, or several: the usual patterns',
        say: 'Several agents are an answer to a specific problem. Press Next to read the patterns, and what each costs. Every hop between agents is at least one more model call.',
        cols: ['Pattern', 'How it works', 'Use it when', 'It costs'],
        hl: 2,
        rows: [
          ['One agent, several tools', 'A single loop with a small set of tools.', 'Most cases. Start here.', 'Little. The model chooses among a few tools.'],
          ['Supervisor and workers', 'A supervisor routes parts of a job to worker agents with narrow tools.', 'Parts of the job need different tools or different rights.', 'A call for each hop, and a shared state to keep tidy.'],
          ['Handoff', 'An agent passes the conversation to another one that is better suited.', 'A support flow with clear roles, such as billing and returns.', 'The new agent needs the right context, and a loop of handoffs is possible.'],
          ['Pipeline', 'Agents run in a fixed order, each one using the output of the last.', 'The steps are known. That is a workflow with a model in each step.', 'Predictable, with a call for each stage.'],
          ['Critic and writer', 'One agent drafts, another reviews.', 'A check by a second pass is worth the cost.', 'Doubles the calls, and the critic can share the writer\'s blind spots.']
        ],
        steps: [
          { upto: 1, say: 'One agent with a few tools is the baseline. Many problems that look like they need several agents need better tools and a better prompt.' },
          { upto: 2, say: 'A supervisor earns its cost when workers need different rights. The data worker can read, and only the refund worker can write. That is a security design as much as an intelligence design.' },
          { upto: 3, say: 'A handoff fits roles that do not overlap. The risk is a conversation that is passed back and forth, so count the handoffs and set a limit.' },
          { upto: 4, say: 'A pipeline is a workflow. If the order is known, write it as one, and put the model in the steps that need judgement.' },
          { upto: 5, say: 'A critic can catch errors, and it doubles the calls. Measure on the evaluation set whether the critic improves the score enough to pay for itself.' }
        ],
        pick: 'Start with **one agent**. Split when a **permission boundary** or a crowded tool list asks for it, and put a **limit on hops** and a **trace across all agents**.'
      }),

      B.talk({
        id: 'm10-hitl', t: 1, src: 'docs', title: 'A person in the loop, done properly',
        say: 'Approval is only a control if a person can really judge what they approve. Press Next for what to design.',
        items: [
          ['Show the action, not the intent', 'The approver must see the tool, the order, the amount and the account, in plain words, as the interrupt payload of the recording does. "Approve this action?" with no detail trains people to click yes.', 'Specifics, not a vague question.'],
          ['Let them change it', 'A person may want to approve a smaller amount, or fix an argument. Let the decision carry edits, and validate the edited arguments as strictly as the model\'s.', 'Approve, edit or refuse.'],
          ['Say what a refusal does', 'On a refusal the tool does not run and the model is told. The model must then say plainly that the action did not happen. In the recording, the final message of a refused run still began with "Done", because a script wrote it. Test the refusal path.', 'A refusal needs an honest message.'],
          ['Time and place', 'A pause may last days. Notify the right person, set a time limit, define what happens at the limit (cancel, escalate), and store the request so that a restart does not lose it.', 'Plan for the wait.'],
          ['Keep a record', 'Log who approved what and when, with the arguments as shown. It is the audit trail, and it answers "who allowed this refund" after the fact.', 'The approval is part of the audit.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm10-a2a', t: 3, src: 'docs', title: 'Agent-to-agent protocols',
        say: 'MCP connects a model to tools. A second family of protocols connects agents to other agents, possibly built by other teams. This is documentation-level, and the area moves quickly. Check the current specification before you rely on any detail.',
        items: [
          ['The idea', 'Agent2Agent (A2A) is an open protocol for one agent to discover another, send it a task, and get results back, including long-running tasks and streamed updates. An agent publishes a description of what it can do, often called an agent card. As I found it, the project announced a 1.0 version in March 2026.', 'Tools talk to models. Agents talk to agents.'],
          ['How it differs from MCP', 'MCP exposes tools, resources and prompts to a model in an application. A2A lets two agents, which may be separate services with their own state and rights, collaborate on a task. A system can use both: an agent that calls tools through MCP, and talks to a partner agent through A2A.', 'Different layers, often used together.'],
          ['What to check', 'Who the other agent is and who it acts for, what it may do with your data, how it authenticates, how long a task may run, and what the logs show. A remote agent is a remote service that can return text for your model to read, so everything about untrusted input applies.', 'A remote agent is untrusted input.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'Why does the graph save a checkpoint after every step?',
        opts: [
          { t: 'So that a run can pause for a person, survive a crash, and be inspected or replayed', fb: '' },
          { t: 'To make the model faster', fb: 'It adds a small cost. It does not speed up the model.' },
          { t: 'To reduce the number of tokens', fb: 'A checkpoint stores the state. It does not shorten the prompt.' },
          { t: 'Because the model needs it', fb: 'The model never sees checkpoints.' }
        ],
        ok: 0, why: 'The state of each step is saved, so a run is data that you can store and continue. The recording had ' + RP.checkpoints + ' checkpoints for a run of three model calls, and a new graph object resumed a paused thread from the file.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'The node `run_tools` calls a read tool, and then calls `interrupt`. A person approves, and the run resumes. How many times does the read tool run in total?',
        opts: [
          { t: 'Twice: the node starts again from its first line on resume', fb: '' },
          { t: 'Once: the graph remembers what ran before the pause', fb: 'The graph saves state between nodes. Within a node, resume starts from the top.' },
          { t: 'Zero times: reads are skipped after a pause', fb: 'Nothing is skipped.' },
          { t: 'Three times: once for each message', fb: 'There is no such rule.' }
        ],
        ok: 0, why: 'In the recording `search_policies` ran ' + RR.tool_calls_before_resume.search_policies + ' time before the pause and ' + RR.tool_calls_after_resume.search_policies + ' in total after it. For a read that costs a call. For a write it would be a duplicate, so keep what comes before an interrupt idempotent, or split the node.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1,
        q: 'The approver refuses a refund. What must happen next?',
        opts: [
          { t: 'The tool does not run, and the model is told that the approver said no, so that it can report that the refund did not happen', fb: '' },
          { t: 'The tool runs anyway, and the refusal is logged', fb: 'Then the approval is decoration.' },
          { t: 'The run is deleted without a message', fb: 'The user is left with nothing.' },
          { t: 'The model is asked to try again until it is approved', fb: 'That is a way to wear the approver down. Stop, and say so.' }
        ],
        ok: 0, why: 'In the recorded refusal, `' + TR.D_denied[TR.D_denied.length - 2][1] + '` went back to the model. The refund count stayed at ' + IN.refunds_after_deny + '. The final message in the recording still started with "Done", which a real model must be tested not to do.'
      }),

      B.quiz({
        id: 'm10-q4', t: 2,
        q: 'A team replaces one agent that has five tools with a supervisor and five worker agents, "to be modular". What do they get first?',
        opts: [
          { t: 'More model calls for each question: every hop between agents is at least one more call, with a longer chain of things that can loop or fail', fb: '' },
          { t: 'A lower bill, because each agent is smaller', fb: 'Each hop adds calls. Smaller prompts do not make up for that by themselves.' },
          { t: 'Better answers by default', fb: 'Only if the evaluation says so.' },
          { t: 'Nothing changes except the code layout', fb: 'The cost and the failure modes change.' }
        ],
        ok: 0, why: 'In mission 8, a single agent used three model calls for a simple question. Adding a supervisor adds a call to route and one to merge, per worker. Split when a permission boundary or a crowded tool list asks for it, and measure the score and the cost of both.'
      }),

      B.quiz({
        id: 'm10-q5', t: 1,
        q: 'Every request of the assistant uses `thread_id = "assistant"`. What is the risk?',
        opts: [
          { t: 'All users share one saved state, so one person\'s conversation can appear in another\'s', fb: '' },
          { t: 'The graph runs slower', fb: 'Speed is not the issue.' },
          { t: 'The checkpoints are lost', fb: 'They are kept, under that single id.' },
          { t: 'None. The thread id is only a label', fb: 'It is the key of the saved state.' }
        ],
        ok: 0, why: 'The checkpointer keeps the state under the thread id. A constant id means a shared conversation: another user\'s messages are in your prompt. Build the id from the user and the conversation, and give the store access control and a retention period.'
      }),

      B.order({
        id: 'm10-ord', t: 1, q: 'Put the adding of an approval to a write tool in order.',
        items: [
          'Mark the tool as a write, and keep the list of write tools in code',
          'In the tool node, call `interrupt` with the tool, the arguments and a question, before running anything',
          'Save the state in a checkpointer, so that the run can wait',
          'Show the payload to a person, with the details, and collect approve, edit or refuse',
          'Resume with the decision. Run the tool only on approve',
          'On a refusal, tell the model, and test that the answer says so',
          'Log who decided, what they saw and when'
        ],
        why: 'The question must come before the action. The checkpointer lets the wait be long. The refusal path needs its own test, because it is easy to forget and it is where a wrong "Done" can appear.'
      }),

      B.bug({
        id: 'm10-bug', t: 1, src: 'rec', q: 'This node is meant to ask a person before it issues a refund. A reviewer says the refund happens even when the person says no. Click the line.',
        file: 'tools.py', lang: 'python', code: BUG1, bad: [3],
        hint: 'Which comes first, the call or the question?',
        why: 'Line 3 runs the tool before the question. By the time the `interrupt` asks the person, the refund has been issued, and a "no" only changes the message. In the recorded graph the question comes first, and the tool runs only after `approve`. Ask first, then run.',
        fix: FIX1,
        cheer: 'Ask, then run.'
      }),

      B.bug({
        id: 'm10-bug2', t: 2, src: 'docs', q: 'Users report that they sometimes see parts of other people\'s conversations. Click the line.',
        file: 'assistant.py', lang: 'python', code: BUG2, bad: [2],
        hint: 'What does the checkpointer use as a key?',
        why: 'The state of a run is saved under the thread id. A constant id gives every user the same saved state, so their messages mix. Build the id from the user and the conversation, check that the user may open that thread, and give the store a retention period.',
        fix: FIX2,
        cheer: 'One thread for one person and conversation.'
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: one agent or a supervisor with workers?',
        scenario: 'The Brewline assistant has three tools: a policy search, a read-only order query, and a refund that needs approval. Questions are usually about one of them, and sometimes two. The team wants "clean separation" and proposes a supervisor with three worker agents.',
        opts: [
          { t: 'One agent with the three tools, a step limit and an approval on the refund', d: 'One loop, one trace, the fewest model calls.' },
          { t: 'A supervisor with three worker agents', d: 'Clean separation, and each worker has one tool.', lose: 'Every question now costs a call to route, a call in the worker, and a call to merge, and each hop is a new place to loop or lose context. Three tools is not a crowd.' },
          { t: 'Three separate assistants, and the user picks one', d: 'Simple for the code.', lose: 'The user has to know which one to ask, and a question that needs two of them needs two conversations.' }
        ],
        pick: 0,
        why: 'The tool set is small and the rights are simple: two reads and one gated write. One agent is the cheapest design that works. Move to a supervisor when the write rights must be separated from the reads by more than an approval, or when the list of tools grows so long that the model chooses badly.',
        when: 'When different parts of the job belong to different teams, run with different credentials, or need different prompts, workers with narrow rights are a real security and ownership benefit.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, src: 'rec', title: 'Incident: a manager was notified twice, and the refund was issued twice', time: '16:45',
        alert: '**After the approval service was restarted, a refund of EUR 12.50 was issued twice, and the manager received two notification messages.** The tool node sends a notification to the manager, then asks for approval, then issues the refund. The run was paused for the approval when the service restarted, and it resumed from its saved state.',
        clues: ['The notification is sent before the `interrupt`, in the same node', 'In the recording the read tool before the interrupt ran again on resume', 'The refund tool has no idempotency key', 'A restart resumes the paused run from the checkpoint'],
        opts: [
          { t: 'Make the refund and the notification idempotent with a key, put the interrupt first or split the node, and test the tool counts across a resume', fb: '' },
          { t: 'Never restart the approval service', fb: 'Restarts happen. The design has to survive them.' },
          { t: 'Delete the checkpoints so that paused runs cannot resume', fb: 'Then every pause loses the request, which is worse.' },
          { t: 'Ask the approver to wait longer before approving', fb: 'Waiting does not change what resume does.' }
        ],
        best: 0,
        why: 'On resume the node starts again from its first line. In the recording the read tool ran twice: once before the pause and once after. A write placed before the question runs twice, and a write after it can too if the node fails halfway and is retried. An idempotency key makes the second one a no-op, and a node that asks first does nothing before the question.',
        checks: [
          ['Find the order', 'Read the node: what runs before the `interrupt`?'],
          ['Count the calls', 'Count the tool calls before and after a resume in a test, as the recording did.'],
          ['Move the question', 'Put the interrupt first, or split the node so that only the question is before the pause.'],
          ['Add keys', 'An idempotency key for the refund and the notification, derived from the order and the request.'],
          ['Clean up', 'Find the duplicate refund and the double notification, and reverse them with the owner of the till system.']
        ],
        tell: 'After a restart of the approval service, a paused run resumed and a refund and a notification went out twice, because the node starts again from its first line on resume and the notification came before the question. I moved the interrupt to the top of the node, gave the refund and the notification idempotency keys, and added a test that counts the tool calls across a resume. I reversed the duplicate refund with the till owner.',
        prevent: ['Put the **interrupt first**, or split the node', 'Give every write an **idempotency key**', 'Test the **tool counts across a resume**', 'Remember that a **restart resumes** paused runs']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'rec', title: 'Incident: the assistant said "Done" and the refund was refused', time: '09:10',
        alert: '**A manager asked for a refund. The approver said no, and the assistant told the manager "Done: the approver said no".** The manager read the first word, told the customer that the refund was on its way, and the customer called a day later. The final answer is written by the model from the tool result.',
        clues: ['The tool result said `the approver said no`', 'The recorded final message of the refused run begins with "Done"', 'Nothing compares what the answer claims with what the tools did', 'The refusal path is not in the evaluation set'],
        opts: [
          { t: 'Compose the answer about an action from the tool\'s status, or check the claim against a ledger of what the tools did, and add refusal cases to the evaluation set', fb: '' },
          { t: 'Remove the word "Done" from the prompt', fb: 'It hides one word, and the next answer says "Completed".' },
          { t: 'Hide refusals from the manager', fb: 'The manager must know that it did not happen.' },
          { t: 'Make approvers explain in detail why they refuse', fb: 'It helps the record, and it does not change what the assistant tells the manager.' }
        ],
        best: 0,
        why: 'A model can write a confident summary of an action that did not happen. For actions, the final message should come from the status that the tool returned, or be checked against a record of the tool calls, the same way the answer checks of mission 6 check numbers. The refusal path then belongs in the evaluation set, with a check that no success words appear.',
        checks: [
          ['Read the trace', 'The tool said no, and the final answer said done. The mismatch is in the last step.'],
          ['Fix the message', 'Build the sentence about an action from the status of the tool call, not from free text.'],
          ['Add a check', 'Compare the claims in the answer with a ledger of the calls: an action claimed with no successful call is a failure.'],
          ['Test it', 'Add refusal cases, and fail the release if the answer claims success.'],
          ['Tell the people involved', 'The manager and the customer need a correction.']
        ],
        tell: 'The assistant told a manager "Done" after the approver had refused a refund, because the model wrote the final message from free text. I changed the message about an action to come from the status that the tool returned, added a check of the claims in an answer against a ledger of the tool calls, and added refusal cases to the evaluation set with a rule that fails the release if the answer claims success. I corrected the message to the manager and the customer.',
        prevent: ['Build the **message about an action** from the tool status', 'Check the **claims against a ledger** of tool calls', 'Put the **refusal path** in the evaluation set', 'Count a **claimed action with no successful call** as a failure']
      }),

      B.qa({
        id: 'qa-state', t: 1, tag: 'Orchestration', secs: 60,
        q: 'How do you manage state and memory in an agent?',
        pts: ['The state of a run: messages, step count, saved as checkpoints', 'A thread id per user and conversation', 'Short-term memory is the history: trim or summarise it', 'Long-term memory is a store of facts per user', 'Memory is data: owner, label, expiry, delete', 'Access control and retention on the store'],
        short: 'I separate the kinds of memory. The state of a run is the messages and the step count, and I save it as a checkpoint after every step, under a thread id that I build from the user and the conversation, never a constant. In my recording, a state without the right reducer lost the history, and a constant thread id would share one conversation between all users.\n\nShort-term memory is the history that goes into every prompt. It grows with every step, so I trim old messages or replace them with a summary, and I keep the rules and the latest turns. Long-term memory is a separate store of facts that outlive a conversation, keyed by user and often searched like documents.\n\nI treat all of it as data: an owner, a label, a source, an expiry and a delete, access control on the store, and a retention period. A user can see and remove what is kept about them, and a memory that came from a document is untrusted text.',
        fu: [
          ['What do you do when the history gets long?', 'Keep the system rules and the last turns, summarise the middle, and drop what no longer matters. Test that the summary keeps the facts that the next steps need.'],
          ['How do you stop memory from being poisoned?', 'Do not store instructions from tool results or documents as facts about the user. Store the source, and let a person review what is kept.']
        ],
        trap: 'Treating memory as a feature and not as personal data with a lifecycle.',
        real: 'Describe how you stored conversation state and how long you kept it.'
      }),

      B.qa({
        id: 'qa-ckpt', t: 1, tag: 'Orchestration', secs: 60,
        q: 'What are checkpoints in an agent framework, and what do they give you?',
        pts: ['The state is saved after every step, per thread', 'Pause for a person and resume later', 'Survive a crash or a deploy', 'Inspect any step, and replay from one', 'Replay runs later nodes again, tools included', 'The store is a database with access control and retention'],
        short: 'A checkpoint is the saved state of a run after a step, together with the node that runs next, kept under the thread id in a store. In my recording, a run with three model calls had seven checkpoints.\n\nThey give me four things. A run can pause for a person and resume days later. A run survives a crash or a deploy: in my test a new graph object, created from nothing but a SQLite file and the thread id, resumed a paused run and finished it. I can inspect the state at any step, which is how I debug. And I can replay from a checkpoint, which runs every later node again, tools included, so a replay of a write must be idempotent.\n\nIn production the store is a database, and the state may hold the whole conversation and personal data, so it needs access control, a retention period and deletion.',
        fu: [
          ['What is the catch of resume?', 'The node that asked starts again from its first line. In my test a read before the interrupt ran twice. I keep that part idempotent or split the node.'],
          ['What would you use as a store?', 'A database that the team already operates and backs up. A SQLite file is fine for a test and for one process.']
        ],
        trap: 'Saying that a checkpoint makes the run safe to repeat. It makes it resumable. Safety needs idempotent tools.',
        real: 'Describe a run that you resumed or replayed and what you learned.'
      }),

      B.qa({
        id: 'qa-hitl', t: 1, tag: 'Orchestration', secs: 60,
        q: 'How do you add human approval to an agent?',
        pts: ['Mark writes, and pause before them with an interrupt', 'The approver sees the tool, the arguments and the amount', 'Approve, edit or refuse', 'On refusal the tool does not run, and the model says so', 'Time limits, notifications and escalation', 'Log who decided, what they saw and when'],
        short: 'I mark the tools that change something, and for those the tool node pauses before running anything: it calls an interrupt with the tool, the arguments and a question, the graph saves its state, and the application shows the details to a person. In my recording the refund count stayed at zero while the run waited, and went to one only after the approval.\n\nThe approver sees specifics, not a vague "approve this action": the order, the amount and the account. They can approve, edit or refuse. On a refusal the tool does not run, the model is told, and it must say plainly that the action did not happen. In my recording the final message of a refused run still began with "Done", because a script wrote it, so I test the refusal path and build the message from the tool status.\n\nI also set a time limit and an escalation for requests that wait, enforce limits in the tool itself, and log who decided what and when.',
        fu: [
          ['What do you put in the tool as well?', 'The rules that matter regardless of approval, such as a maximum amount and a check that the order exists in the conversation.'],
          ['What if approvers just click yes?', 'Show less routine and more risk: auto-approve small safe actions by rule, and make the unusual ones stand out.']
        ],
        trap: 'An approval after the action. The question must come first.',
        real: 'Describe an approval step you built and what the approver saw.'
      }),

      B.qa({
        id: 'qa-resume', t: 2, tag: 'Orchestration', secs: 60,
        q: 'What happens when a paused agent resumes, and what can go wrong?',
        pts: ['The state is loaded from the checkpoint', 'The node that paused starts again from its first line', 'Work before the interrupt runs a second time', 'A write before the question happens twice', 'Fix: interrupt first, split the node, idempotency keys', 'Test the tool counts across a resume'],
        short: 'On resume the framework loads the saved state and continues, with the answer of the person given to the node that paused. The important detail is that this node starts again from its first line, and the interrupt call returns the answer when it is reached again. So everything in that node before the interrupt runs a second time.\n\nIn my recording, a read tool before the interrupt ran once before the pause and twice in total after the resume. A read costs one call. A write or a notification before the question would happen twice, and so would a refund in a node that fails halfway and is retried.\n\nThe fixes are to put the interrupt first, to split the node so that only the question sits before the pause, and to give every write an idempotency key, so that a second call does nothing. And I add a test that counts the tool calls across a resume, as I did, because the failure is silent.',
        fu: [
          ['Why does it start from the first line?', 'The framework cannot resume in the middle of a function. It re-runs the node and feeds the saved answer to the interrupt call.'],
          ['What is an idempotency key?', 'A value, such as the order and the request id, that the receiving system uses to recognise a repeat and ignore it.']
        ],
        trap: 'Assuming that resume continues from the line after the interrupt.',
        real: 'Describe a duplicate action that you traced to a retry or a resume.'
      }),

      B.qa({
        id: 'qa-multi', t: 2, tag: 'Orchestration', secs: 90,
        q: 'When would you use several agents instead of one?',
        pts: ['Start with one agent and a small set of tools', 'Split when different parts need different rights or owners', 'A supervisor routes to workers with narrow tools', 'Every hop costs at least one more model call', 'Limit hops, share one state, trace across agents', 'Measure the score and the cost of both designs'],
        short: 'I start with one agent and a small set of tools, because many problems that look like they need several agents need better tools and a better prompt. I split when there is a real reason: parts of the job need different rights, different owners or different prompts, or the list of tools has grown so long that the model chooses badly.\n\nThe usual design is a supervisor that routes parts of a job to workers, each with narrow tools. The security benefit is real: the data worker can only read, and only the refund worker can write, behind an approval. The cost is also real: every hop is at least one more model call, so the bill and the delay grow, and there are more places to loop or lose context. A handoff between agents can bounce back and forth, so I put a limit on hops.\n\nI keep one shared state and one trace across all agents, so that a run can be explained, and I measure the score and the cost of the single agent and the multi-agent design on the same evaluation set.',
        fu: [
          ['What about agent-to-agent protocols?', 'They matter when agents belong to different teams or services. The remote agent is untrusted input, so I check who it acts for, what it may do and how it authenticates.'],
          ['What is the first thing you would simplify?', 'A multi-agent system built for modularity with three tools in total. I would merge it into one agent and compare the scores.']
        ],
        trap: 'Choosing several agents because the diagram looks cleaner. Each hop is a cost.',
        real: 'Describe a design where you split or merged agents, and what the numbers said.'
      }),

      B.qa({
        id: 'qa-memory', t: 2, tag: 'Orchestration', secs: 60,
        q: 'How do you design long-term memory for an assistant, and what are the risks?',
        pts: ['A store of facts per user, separate from the conversation', 'Store only what is useful and allowed', 'Owner, label, source, expiry and delete', 'The user can see and remove what is kept', 'Memories can carry injected text or wrong facts', 'Isolate users and apply retention'],
        short: 'Long-term memory is a store of facts that outlive a conversation, keyed by user, such as a preference or a decision, and often searched like documents. I decide what is worth keeping and what is allowed: it is data about a person, so I involve the privacy team.\n\nEvery memory gets an owner, a label, a source, a time to expire and a way to delete it. The user can see what is kept and remove it, memories of different users are isolated, and the store has access control and a retention period, so that nothing is kept for ever by accident.\n\nThe risks are privacy, wrong facts and injection. A memory written from a document or a tool result can carry an instruction for the model, so I do not store those as facts, I keep the source, and I let a person review what is kept for sensitive uses. And I measure whether memory improves the answers at all, because it also adds tokens to every prompt.',
        fu: [
          ['How do you retrieve memories?', 'Like documents: embed them, filter by user and label, take the best few, and put them in the prompt with their source and date.'],
          ['What would you never store?', 'Secrets, payment details, and anything that the user or the law says must not be kept.']
        ],
        trap: 'Saving everything the user says. It is a liability, and it makes answers worse.',
        real: 'Describe what you stored about users and how it expired.'
      }),

      B.qa({
        id: 'qa-multieval', t: 3, tag: 'Orchestration', secs: 60,
        q: 'How do you evaluate a multi-agent system?',
        pts: ['End-to-end task success on a set of tasks', 'The single-agent baseline: is the split worth it?', 'Per-agent traces, with hops and handoffs counted', 'Cost and delay per task, not per call', 'Failure attribution: which agent, which step', 'Safety cases for each agent with write rights'],
        short: 'I start from the outcome: a set of tasks with a definition of success, run end to end, many times, because runs differ. I always compare with a single agent that has the same tools, since splitting is a cost and has to earn its place on the scores.\n\nI trace the whole system as one tree, with a span for every agent and every tool call, and I count the hops and the handoffs, because a loop between agents is a failure that no single answer shows. I measure cost and delay per task, since every hop is another call.\n\nWhen a task fails, I want to know which agent and which step failed, so I read the traces of the failures and group them. And each agent that has write rights gets its own safety cases: an injected instruction, a request outside its job, an unapproved write.',
        fu: [
          ['What do you do about variance?', 'Run each task several times and report the rate and the spread, not one run.'],
          ['What would make you merge the agents?', 'The same scores at a lower cost with one agent, or a high rate of hops and handoffs that add nothing.']
        ],
        trap: 'Scoring only the final answer of the whole system.',
        real: 'Describe an ablation where you compared a multi-agent design with a single agent.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Orchestrator', color: '#C4B5FD',
        pts: [
          'The **state** of a run is saved as a **checkpoint** after every step, under a **thread id** built from the user and the conversation.',
          'A write tool **pauses for a person**: the graph saves its state and **nothing is written** until the decision. **Ask first, then run.**',
          '**Resume starts the node again from its first line**: work before the interrupt runs twice. Put the question first, split the node, and use **idempotency keys**.',
          'A **durable** run keeps its state in a database, so that a new process can resume it. The state is **data**: access control and retention.',
          '**One agent first.** Several agents are for **different rights or owners**, and each hop is a **call**. Limit hops, share a state, trace them all.',
          '**Memory is data**: owner, label, expiry, delete. A **refusal** must be reported honestly: build the message from the tool status.'
        ],
        lines: [
          'I put the question before the action.',
          'I count tool calls across a resume.',
          'I build the thread id from the user and the conversation.'
        ]
      })
    ]
  });
})();
