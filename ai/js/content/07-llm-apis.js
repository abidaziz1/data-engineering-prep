/* Mission 7: model APIs in pipelines. The real Anthropic and OpenAI client libraries were pointed at a local server that speaks the same protocol, and
   scripted to fail in six ways. What they sent, how many times, how long they waited, how a stream arrives, how a tool call travels and how a
   checked answer is accepted or refused were recorded. No provider was called and no language model was used, so nothing here says what a real
   model would answer. Batch APIs, caching, rate limits and failover come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LC = G.file('code/llm_calls.py'), REQ = G.file('llm/request_with_tools.json');
  var RT = G.table('llm.retries').rows, K = G.counts('llm.constants'), SM = G.counts('llm.stream'), TL = G.counts('llm.tools'), ST = G.counts('llm.structured');
  function rt(sdk, label) { return RT.filter(function (r) { return r[0] === sdk && r[1].indexOf(label) === 0; })[0]; }
  var R429 = rt('anthropic', '429 with retry-after'), R529 = rt('anthropic', '529'), R500 = rt('anthropic', '500'), R400 = rt('anthropic', '400'), RTO = rt('anthropic', 'an answer slower'), R0 = rt('anthropic', '429 with retries switched off');
  G.expect(K.anthropic.max_retries === 2 && K.anthropic.initial_retry_delay === 0.5 && K.anthropic.max_retry_delay === 8 && /read=600/.test(K.anthropic.timeout) && K.openai.max_retries === 2, 'the SDK defaults');
  G.expect(R429[2] === 2 && R529[2] === 3 && R500[2] === 3 && R500[4] === 'InternalServerError' && R400[2] === 1 && R400[4] === 'BadRequestError' && RTO[4] === 'APITimeoutError' && R0[2] === 1 && R0[4] === 'RateLimitError', 'what the SDK did in each failure');
  G.expect(RT.length === 12 && RT.filter(function (r) { return r[0] === 'openai'; }).length === 6, 'the OpenAI rows');
  G.expect(SM.anthropic_event_runs[0][0] === 'message_start' && SM.anthropic_event_runs[SM.anthropic_event_runs.length - 1][0] === 'message_stop' && SM.anthropic_usage.input === 21 && SM.openai_last_finish_reason === 'stop', 'the stream');
  G.expect(TL.response_stop_reason === 'tool_use' && TL.request_2_tool_use_id_matches === true && TL.request_2_roles.join() === 'user,assistant,user' && TL.requests_sent === 2, 'the tool call');
  G.expect(ST.checks.length === 3 && ST.checks[0].valid === true && ST.checks[1].valid === false && ST.checks[2].valid === false, 'the three checked answers');
  var SCHEMA = JSON.stringify(ST.schema, null, 2);
  var BUG1 = [
    'def ask(prompt):',
    '    while True:',
    '        try:',
    '            return client.messages.create(model=MODEL, max_tokens=300,',
    '                                          messages=[{"role": "user", "content": prompt}])',
    '        except Exception:',
    '            time.sleep(1)'
  ].join('\n');
  var FIX1 = [
    'def ask(prompt, deadline_s=60):',
    '    # the client retries 429 and 5xx with a growing wait, and raises a 400 at once',
    '    c = client.with_options(timeout=20, max_retries=3)',
    '    try:',
    '        return c.messages.create(model=MODEL, max_tokens=300,',
    '                                 messages=[{"role": "user", "content": prompt}])',
    '    except (anthropic.RateLimitError, anthropic.APIConnectionError, anthropic.InternalServerError):',
    '        queue.park(prompt)          # try again later, from the queue, not in a tight loop',
    '        return None'
  ].join('\n');
  var BUG2 = [
    'reply = client.messages.create(model=MODEL, max_tokens=200, messages=msgs)',
    'data = json.loads(reply.content[0].text)',
    'issue_refund(data["order_id"], data["amount"])'
  ].join('\n');
  var FIX2 = [
    'reply = client.messages.create(model=MODEL, max_tokens=200, messages=msgs)',
    'decision, why = check_decision(reply.content[0].text)        # the schema, from llm_calls.py',
    'if decision is None:',
    '    return retry_once_with_error(why)                         # tell the model what was wrong, once',
    'queue_for_approval(decision)                                  # a person approves a write'
  ].join('\n');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Model APIs in pipelines', short: 'Model APIs', blurb: 'Retries, timeouts, streams, tool calls, checked answers, tokens and cost', minutes: 50,
    focus: ['con', 'ci'],
    goals: [
      'Read a **model API call**: the messages, the limits, the content blocks, the stop reason and the usage.',
      'Say what the SDKs **retry on their own**, what they do not, and what the **default timeout** costs.',
      'Follow a **stream** and a **tool call** at the level of the requests.',
      'Make a model return **structured output** that code can trust, and refuse the rest.',
      'Budget **tokens and cost**, and name the levers that cut them.',
      'Design for **limits, batches, caches and failover**.'
    ],
    say: 'Mission 7 is where your pipeline meets a model, which is a web service that is slow, rate limited, sometimes down and priced by the token. I pointed the real Anthropic and OpenAI client libraries at a local server that I scripted to fail in six ways, and wrote down every request and every wait. No provider was called, and no model answered. The recording shows what the libraries do. It says nothing about what a real model would write.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, src: 'docs', title: 'A model API is a web service',
        say: 'Calling a model is an HTTP request with a JSON body. Press Next for what goes in, what comes out, and what you should wrap.',
        items: [
          ['The request', 'You send a model name, a list of messages with roles, a limit for the answer (`max_tokens`), and options such as the randomness (`temperature`), tools and a system prompt. The key goes in a header, and it comes from a secret store, never from code.', 'A JSON body, a key in a header.'],
          ['The response', 'The answer is a list of content blocks: text, or a request to call a tool. There is a stop reason that says why it ended: the model finished, the limit was hit, or it wants a tool. And there is a usage count of input and output tokens, which is your bill and your log.', 'Content, a stop reason, and usage.'],
          ['Two providers, one idea', 'The Anthropic and OpenAI libraries use different field names for the same ideas: messages in, content out, tools, streams, usage. A pipeline should wrap each provider in one function of its own, so that a change of provider or model is one file.', 'Wrap the provider in your own function.'],
          ['Pin the model', 'A model name can point at a version that changes. Pin a version where you can, log the model name with every call, and re-run the evaluation set when it changes. A silent model update is a release that nobody reviewed.', 'A model change is a release.'],
          ['Everything can fail', 'The network drops, the service is overloaded, a rate limit applies, the request is wrong, the answer is slow, the answer is cut off. A call that cannot fail does not exist, so every call has a plan for each case.', 'Plan for each way it fails.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-calls', t: 1, src: 'rec', title: 'The calls, as small functions', file: 'llm_calls.py', lang: 'python', code: LC,
        steps: [
          { say: 'This is the file that made the requests of this mission. Each function is a call that a pipeline would make. The recorder gave them clients that point at a local stand-in server, because I had no key and no network to a provider.', lines: null },
          { say: '`ask_anthropic` makes one call. The options go to `with_options`: a timeout and a number of retries, set for this call only. A model name, a limit for the answer, and a list of messages are all it needs.', lines: G.span(LC, /^def ask_anthropic/, /return c\.messages\.create/) },
          { say: 'The OpenAI function is the same idea with other names: `chat.completions.create` and a list of messages. Both libraries retry some failures by themselves. The next lab shows which.', lines: G.span(LC, /^def ask_openai/, /return c\.chat\.completions\.create/) },
          { say: 'Both libraries were created with a key that the stand-in accepts, and with a `base_url` that points at it. That is how I could run the real libraries without a provider. In your code the key comes from a secret store.', lines: null }
        ],
        note: 'The libraries are the real ones: anthropic ' + K.anthropic.version + ' and openai ' + K.openai.version + '. The server is a stand-in that I scripted, so the failures are the ones I chose.'
      }),

      B.widget({ id: 'm7-retry-lab', kind: 'retry', t: 1, src: 'rec', title: 'Lab: what the SDK does when the call fails' }),

      B.cmp({
        id: 'm7-errors', t: 1, src: 'rec', title: 'What to do with each failure',
        say: 'Each failure has one right reaction. Press Next to read them. The recorded libraries retry the first two kinds on their own, and they never retry a bad request.',
        cols: ['Failure', 'Meaning', 'Retry?', 'What the recording showed'],
        hl: 2,
        rows: [
          ['400', 'The request is wrong: a bad field, too many tokens.', 'No. Fix the request.', R400[2] + ' request, then ' + R400[4] + '.'],
          ['401, 403', 'The key is wrong, expired or not allowed.', 'No. Fix the key or the access.', 'Not recorded: the stand-in has no auth.'],
          ['429', 'A rate limit. The reply may name a pause in `retry-after`.', 'Yes, after the pause.', R429[2] + ' requests, with a wait of ' + R429[5] + '.'],
          ['500, 529', 'The service failed or is overloaded.', 'Yes, with a growing wait, a few times.', R500[2] + ' requests, then ' + R500[4] + ' for three 500s.'],
          ['A timeout', 'No answer in time.', 'Once or twice, if a repeat is safe.', RTO[2] + ' requests, then ' + RTO[4] + '.']
        ],
        steps: [
          { upto: 1, say: 'A 400 never gets better by repeating it. The recorded libraries sent it once and raised `' + R400[4] + '`. A loop of your own must not retry it either, or it spins forever.' },
          { upto: 2, say: 'A 401 or 403 is a problem of the key or of the permission, and a retry only fills the logs. I did not record it, because the stand-in does not check keys. It comes from the documentation of the services.' },
          { upto: 3, say: 'A 429 with a `retry-after` header: the libraries waited ' + R429[5] + ' and succeeded on the second request. Honour the header. It is the server telling you when to come back.' },
          { upto: 4, say: 'A 529 or 500: retried with a growing wait and some random jitter, so that many workers do not come back together. Three 500s in a row used up the retries and ended in `' + R500[4] + '`.' },
          { upto: 5, say: 'A slow answer is a failure after the timeout. The request was sent again, and a billed call may have started twice. Repeat only calls that are safe to repeat, and know that a repeat can cost twice.' }
        ],
        pick: 'Let the SDK **retry the transient errors** with its backoff. Never retry a **400**. Set a **timeout and a total budget** that match your deadline, and **park** what still fails in a queue.'
      }),

      B.code({
        id: 'm7-stream', t: 1, src: 'rec', title: 'A stream, event by event', file: 'llm_calls.py (streaming)', lang: 'python', code: G.lines(LC, G.at(LC, /^def stream_anthropic/), G.span(LC, /^def stream_openai/, /return list\(client\.chat\.completions/)[1]),
        steps: [
          { say: 'A user waiting for an answer does not want to wait for all of it. With streaming the service sends the answer in small pieces while the model writes it. This is the code that read a stream, with the real library, against the stand-in.', lines: null },
          { say: 'The Anthropic stream is a sequence of events. The code collects the type of each one, and then asks the stream for the final message, which holds the whole answer and the usage.', lines: G.span(G.lines(LC, G.at(LC, /^def stream_anthropic/), G.span(LC, /^def stream_openai/, /return list\(client\.chat\.completions/)[1]), /^def stream_anthropic/, /return events, final/) },
          { say: 'The order of the events that came back: `' + SM.anthropic_event_runs.map(function (r) { return r[0] + (r[1] > 1 ? ' x' + r[1] : ''); }).join(', ') + '`. A message starts, a content block starts, text arrives in deltas, the block stops, the usage arrives in the last delta, and the message stops.', lines: null },
          { say: 'The text was `' + SM.anthropic_text + '`, and the usage was ' + SM.anthropic_usage.input + ' input and ' + SM.anthropic_usage.output + ' output tokens. Usage arrives at the end of the stream, so a stream that you cancel early has no complete usage for the log.', lines: null },
          { say: 'The OpenAI library streams chunks, ' + SM.openai_chunks + ' of them here, and the last one carries a finish reason, `' + SM.openai_last_finish_reason + '`. The idea is the same: pieces, then a signal that it is done.', lines: G.span(G.lines(LC, G.at(LC, /^def stream_anthropic/), G.span(LC, /^def stream_openai/, /return list\(client\.chat\.completions/)[1]), /^def stream_openai/, /return list\(client/) }
        ],
        note: SM.note + ' Stream to people. For a batch job that nobody watches, a plain call is simpler and has fewer failure modes.'
      }),

      B.code({
        id: 'm7-tool', t: 1, src: 'rec', title: 'A tool call, as two requests', file: 'request 1', lang: 'json', code: REQ,
        steps: [
          { say: 'This is the first request, as the server received it. A tool is declared with a name, a description and a JSON schema for its input. The model reads the description to decide when to call it, so write it for a model.', lines: G.span(REQ, /"tools"/, /"input_schema"/) },
          { say: 'The schema says that `query` is a string and is required, and that `limit` is an integer and is optional. The model must send arguments that fit it. Your code must still check them, because a model can send anything.', lines: G.span(REQ, /"properties"/, /"required"/) },
          { say: 'The response did not hold text. Its stop reason was `' + TL.response_stop_reason + '`, and its content was a block of type `' + TL.response_block.type + '`: the name `' + TL.response_block.name + '` and the input `' + JSON.stringify(TL.response_block.input) + '`. The model asks. It does not run anything.', lines: null },
          { say: 'Your code runs the tool. The second request then carried the history in order: roles `' + TL.request_2_roles.join(', ') + '`. The assistant message holds the tool request, and the next user message holds the result, as a `tool_result` block with the same id. The recording checked that the ids match: ' + TL.request_2_tool_use_id_matches + '.', lines: null },
          { say: 'The final answer was `' + TL.final_text + '`, after ' + TL.requests_sent + ' requests. Two model calls for one answer is the price of a tool. In an agent that loops, the number of calls is not fixed, which is why missions 8 and 10 add limits.', lines: null }
        ],
        note: 'The code that made these requests is `answer_with_tool` in llm_calls.py above. The tool result was a fixed string, because no tool or model was involved in the choice.'
      }),

      B.code({
        id: 'm7-schema', t: 1, src: 'rec', title: 'A schema that code can trust', file: 'RefundDecision (JSON schema)', lang: 'json', code: SCHEMA,
        steps: [
          { say: 'A model that writes free text is hard to use in a pipeline. If the output has a shape, code can read it. This is the JSON schema that the library produced from a small class, `RefundDecision`, with three fields.', lines: null },
          { say: '`order_id` is a string, `approve` is a boolean, and `reason` is a string of at most 120 characters. The `required` list says that all three must be there.', lines: G.span(SCHEMA, /"properties"/, /"required"/) },
          { say: 'Providers can enforce a schema while the model writes, or you can ask for JSON in the prompt. Either way, the rule is the same: **validate every answer** against the schema in your code before anything acts on it.', lines: null }
        ],
        note: 'Whether a provider can force the model to follow a schema depends on the provider and the model. Check its documentation. Your validation stays in either case.'
      }),

      B.cmp({
        id: 'm7-checks', t: 1, src: 'rec', title: 'Three answers, checked',
        say: 'I wrote three answers that a model might give, and ran the check from llm_calls.py on each. Press Next for what it said. Only one of them is usable.',
        cols: ['What the model wrote', 'Valid', 'Why not'],
        hl: 2,
        rows: ST.checks.map(function (c) { return [c.text, c.valid ? 'yes' : 'no', c.error || '-']; }),
        steps: [
          { upto: 1, say: 'A clean answer that fits the schema: all three fields, the right types, a short reason. It is accepted, and the code gets an object.' },
          { upto: 2, say: 'The second has `approve` as the word "maybe", and no reason. The check lists both problems at once: `' + ST.checks[1].error + '`. The error text is useful to a person, and it can also go back to the model.' },
          { upto: 3, say: 'The third is polite: "Sure! Here is the JSON you asked for", and then the JSON. A parser rejects it: `' + ST.checks[2].error + '`. A model that adds words around the answer breaks a pipeline that parses blindly.' }
        ],
        pick: 'Validate **every** answer. On a failure, try **once** more with the error text in the message, and then **park** it for a person. Never act on a value that has not been checked, least of all an amount or an id.'
      }),

      B.widget({ id: 'm7-tokens-lab', kind: 'tokens', parts: [1, 2], t: 1, src: 'rec', title: 'Lab: what a question costs, and how to cut it' }),

      B.talk({
        id: 'm7-scale', t: 2, src: 'docs', title: 'At volume: limits, batches, caches and failover',
        say: 'One call is easy. Twenty thousand calls a night are an engineering problem. These are documentation-level practices, and each provider has its own names and numbers, so check yours. Press Next for each.',
        items: [
          ['Rate limits', 'Providers limit requests and tokens per minute for each key and each model. A bulk job needs a client-side limiter that stays under them, a cap on the number of calls in flight, and a reaction to the `retry-after` header. Burning through a limit makes every call slower, including the live ones that share the key.', 'Stay under the limit on your side.'],
          ['Batch interfaces', 'Many providers offer a batch interface: you submit many requests, and the results come back later, often at a lower price. It fits jobs that can wait, such as summarising documents overnight, and does not fit a chat. Check the window, the price and the size limits.', 'Cheaper, and slower on purpose.'],
          ['Prompt caching', 'Some providers charge less for a prefix of the prompt that was sent before, such as the rules or a long document. Put the part that repeats first and the part that changes last. Check how long a cache lives and what it costs.', 'Repeat the front of the prompt.'],
          ['Failover and gateways', 'A second provider or a second model can take over when the first is down or slow. Put the choice in one gateway function, with the same checks and the same evaluation set, because a different model gives different answers. Test the failover path before the day that you need it.', 'The second path must be tested.'],
          ['Idempotency', 'A retry can run a call twice. For a call that only reads or generates, that costs tokens. For a call that acts, such as sending an e-mail or issuing a refund, the action must be safe to repeat, with a key that makes the second one a no-op.', 'Make actions safe to repeat.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A model call returns HTTP 400 because `max_tokens` is larger than the model allows. What should the code do?',
        opts: [
          { t: 'Fix the request and log it. A retry sends the same wrong request', fb: '' },
          { t: 'Retry three times with a growing wait', fb: 'The recorded libraries sent it once. Waiting does not change a wrong value.' },
          { t: 'Switch to another provider', fb: 'It may fail the same way, and it hides a bug in your code.' },
          { t: 'Ignore it and return an empty answer', fb: 'A silent empty answer is the worst outcome for a user.' }
        ],
        ok: 0, why: 'A 400 means that the request is wrong, so the fix is in your code. In the recording the library sent it once and raised ' + R400[4] + '. A retry loop that includes 400 spins until someone stops it.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'A call hangs. The libraries have a default read timeout of ' + K.anthropic.timeout.replace(/.*read=(\d+).*/, '$1') + ' seconds and retry twice. What is the longest one hung call can hold a worker?',
        opts: [
          { t: 'About 30 minutes: three attempts of 10 minutes each, plus the waits', fb: '' },
          { t: 'About 10 minutes', fb: 'There are two retries, so there are three attempts.' },
          { t: '2 seconds', fb: 'That is the wait between attempts, not the timeout.' },
          { t: 'There is no limit', fb: 'There is a limit. It is just very long.' }
        ],
        ok: 0, why: 'Worst case is (retries + 1) times the timeout plus the waits: 3 times 600 seconds, about 30 minutes. A job with a deadline needs a timeout that matches it and a budget for the whole job, as the lab showed.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'The first response of a tool call has stop reason `tool_use`. What does your code do next?',
        opts: [
          { t: 'Run the tool with the arguments, and send the result back as a `tool_result` with the same id', fb: '' },
          { t: 'Show the content to the user as the answer', fb: 'It is a request to call a tool, not an answer.' },
          { t: 'Call the model again with the same messages', fb: 'It would ask for the same tool again.' },
          { t: 'Assume the model ran the tool', fb: 'The model runs nothing. Your code does.' }
        ],
        ok: 0, why: 'The model only asks. Your code checks the arguments, runs the tool, and sends the result in a second request with the `tool_use_id` of the request. The recording checked that the ids matched.'
      }),

      B.quiz({
        id: 'm7-q4', t: 1,
        q: 'A model answers "Sure! Here is the JSON: {...}". Your code calls `json.loads` on the whole text. What happens, and what is the right design?',
        opts: [
          { t: 'The parse fails. Validate against a schema, retry once with the error, and park what still fails', fb: '' },
          { t: 'It works, because JSON parsers skip words', fb: 'They do not. The recording shows the error.' },
          { t: 'It is fine to cut the words with a regular expression', fb: 'It is brittle, and still does not check the types or the ranges.' },
          { t: 'Ask the model to be more polite', fb: 'Politeness is not the problem. Unchecked output is.' }
        ],
        ok: 0, why: 'The recorded check said: ' + ST.checks[2].error + '. Use the structured features of the provider where they exist, and validate anyway. One retry with the error text fixes most format slips, and the rest goes to a queue.'
      }),

      B.quiz({
        id: 'm7-q5', t: 2,
        q: 'Your worker is cancelled halfway through a stream. What is missing from your log?',
        opts: [
          { t: 'The usage: the token counts arrive at the end of the stream', fb: '' },
          { t: 'The model name', fb: 'It is known from the request.' },
          { t: 'The first words of the answer', fb: 'You have them.' },
          { t: 'Nothing. The usage is sent first', fb: 'In the recording it arrived in the last delta.' }
        ],
        ok: 0, why: 'In the recorded event order, the usage arrived with `message_delta`, near the end. A cancelled stream has no complete count, so you estimate the cost from what you sent and received, and you log that it is an estimate.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the handling of one model call in order.',
        items: [
          'Build the request and set a timeout that matches the job',
          'Send it, and let the client retry transient errors with a growing wait',
          'Honour a `retry-after` header and stop at a total deadline',
          'Do not retry a 400. Log it as a bug',
          'Validate the answer against the schema',
          'On a failure, retry once with the error text, then park the item in a queue',
          'Log the model, the tokens, the cost and the outcome'
        ],
        why: 'The timeout and the retries protect against the network and the service. The deadline protects the job. The schema protects the code that acts on the answer. The log is what lets you explain the bill and find the bad cases.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'This helper is called by a nightly job. One night it runs for 14 hours and costs a lot. Click a line that makes this possible.',
        file: 'ask.py', lang: 'python', code: BUG1, bad: [2, 6],
        hint: 'What stops the loop, and which errors does it retry?',
        why: '`while True` never ends, and `except Exception` catches every error, including a 400 that can never succeed. The loop waits one second and sends the same wrong request again, for ever. Let the client retry the transient errors with its own backoff, set a timeout and a retry count, and park what still fails.',
        fix: FIX1,
        cheer: 'Bound every retry.'
      }),

      B.bug({
        id: 'm7-bug2', t: 1, q: 'This code acts on a model answer. Click the line that is dangerous.',
        file: 'refund.py', lang: 'python', code: BUG2, bad: [3],
        hint: 'Has anything checked the value before it moves money?',
        why: 'Line 3 sends whatever the model wrote straight to a refund. The text may not parse, the amount may be a string, negative or huge, and the order id may be invented. Validate against a schema, retry once with the error, and send a write to a person for approval.',
        fix: FIX2,
        cheer: 'Never act on unchecked output.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: the timeout and retry policy of a nightly job',
        scenario: 'A job summarises 20,000 documents every night through a model API, with a deadline of six hours and 40 workers. The libraries default to a read timeout of ' + K.anthropic.timeout.replace(/.*read=(\d+).*/, '$1') + ' seconds and ' + K.anthropic.max_retries + ' retries. An average call takes 8 seconds when the service is healthy.',
        opts: [
          { t: 'Keep the defaults', d: 'Nothing to change or maintain.', lose: 'One hung call holds a worker for up to 30 minutes. A bad hour of the service can block all 40 workers and miss the deadline.' },
          { t: 'A timeout of about 60 seconds, 3 retries, a limit on the calls in flight, and a queue for the items that still fail', d: 'A hung call costs a minute, the job respects the limits, and failures wait for the morning.' },
          { t: 'No retries, so that the job fails fast', d: 'Simple and predictable.', lose: 'Every transient 429 or 500 loses a document. Retrying those is cheap and correct.' }
        ],
        pick: 1,
        why: 'A timeout of several times the normal duration separates slow from hung. Retries absorb the transient errors, a limit on calls in flight keeps you under the rate limit, and a queue means that a bad hour costs a few documents, not the night. Measure the real duration first and set the numbers from it.',
        when: 'If the answers can wait, a provider batch interface is often cheaper and removes most of this plumbing. Then the work is checking the results and handling the failed items.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: the nightly job misses its window', time: '06:40',
        alert: '**The nightly summarisation job was still running at 06:40. It should have finished at 04:00.** The model service had a bad hour. The job uses 40 workers and the library defaults: a read timeout of ' + K.anthropic.timeout.replace(/.*read=(\d+).*/, '$1') + ' seconds and ' + K.anthropic.max_retries + ' retries. The logs show many calls with no answer for ten minutes.',
        clues: ['Worst case for one call is about 30 minutes with the defaults', 'All 40 workers were waiting on hung calls', 'The same items were retried again and again', 'There is no deadline for the job as a whole'],
        opts: [
          { t: 'Set a timeout that matches the normal duration, cap the retries, add a deadline for the whole job, and park failed items in a queue', fb: '' },
          { t: 'Add more workers so that more calls wait at once', fb: 'More workers hold more hung calls, and raise the load on a struggling service.' },
          { t: 'Retry forever until every document succeeds', fb: 'The job never finishes in a bad hour, and the bill grows.' },
          { t: 'Switch off the retries completely', fb: 'Transient errors then lose documents that a retry would save.' }
        ],
        best: 0,
        why: 'The defaults suit an interactive tool. A batch job with a deadline needs its own numbers. A short timeout turns a hang into a quick failure, a capped retry count bounds the work, a deadline for the whole job stops it from running past the morning, and a queue keeps the failed items for a calmer hour.',
        checks: [
          ['Find the stuck calls', 'List calls open for longer than a few times the normal duration.'],
          ['Read the policy', 'Which timeout and retry count does the client use? The defaults are in the library.'],
          ['Set the numbers', 'A timeout of a few times the median, a retry count of two or three, and a limit on calls in flight.'],
          ['Add a deadline', 'Stop taking new items after the deadline, and write what is left to a queue.'],
          ['Alert', 'Alert on calls older than the timeout, on the failure rate, and on a job that is past its expected end.']
        ],
        tell: 'Our nightly model job missed its window because the service had a bad hour and the library defaults let a hung call hold a worker for up to thirty minutes. I set the timeout to a few times the normal duration, capped the retries, put a limit on the calls in flight and a deadline on the whole job, and parked the failed items in a queue for the next run. I added alerts on calls that are older than the timeout and on a job past its expected end.',
        prevent: ['Set a **timeout and a retry count** for every client, from measured durations', 'Give the **whole job a deadline** as well as each call', 'Use a **queue** for items that fail', 'Alert on **old open calls**']
      }),

      B.incident({
        id: 'm7-inc2', t: 2, src: 'rec', title: 'Incident: prose around the JSON crashed a job', time: '02:15',
        alert: '**The overnight classification job crashed at 02:15 on a JSON decode error, and 3,000 documents were not processed.** The job parses the model output with `json.loads`. After a model update the answers began with "Sure! Here is the JSON you asked for:" for some documents.',
        clues: ['The prompt asks for JSON, and nothing validates it', 'The parse error is the one in the recording: invalid JSON, expected a value at column 1', 'The job stops at the first bad answer', 'The model version changed without a run of the evaluation set'],
        opts: [
          { t: 'Validate every answer against a schema, retry once with the error text, park what still fails, and pin and test the model version', fb: '' },
          { t: 'Cut everything before the first brace with a regular expression', fb: 'It hides this case, and fails again on the next change of wording. It checks no types.' },
          { t: 'Catch the exception and skip the document silently', fb: 'The document is lost without a trace, and nobody knows how many.' },
          { t: 'Tell the model "return only JSON" in capital letters', fb: 'It may help, and it is not a control. Your code still has to check.' }
        ],
        best: 0,
        why: 'A parser cannot enforce a format that only a prompt asked for. Validation turns a crash into a handled case, one retry with the error often fixes it, and a queue keeps the rest. A model update is a release, so the evaluation set runs before it reaches the job.',
        checks: [
          ['Read the error', 'The parse failed at the first character of the text. The model added words.'],
          ['Contain it', 'Make the job skip to the next document and write the failed ones to a queue.'],
          ['Fix the parse', 'Validate against the schema, with the types and the ranges as well as the syntax.'],
          ['Retry once', 'Send the error text back to the model once, and park the item if it fails again.'],
          ['Guard the model', 'Pin the model version, log it with every call, and run the evaluation set when it changes.']
        ],
        tell: 'An overnight classification job crashed because a model update made some answers start with a polite sentence before the JSON, and the job parsed the raw text. I made the job continue past a bad answer and queue it, validated every answer against a schema with one retry that returns the error text, and pinned the model version with an evaluation run before any change. The queue was processed in the morning with the new code.',
        prevent: ['**Validate** model output against a schema, never just parse it', 'One **retry with the error text**, then a queue', '**Pin** the model version and run the **evaluation set** on a change', 'A bad item must not stop the whole job']
      }),

      B.qa({
        id: 'qa-api', t: 1, tag: 'Model APIs', secs: 60,
        q: 'How do you call a model API reliably from a data pipeline?',
        pts: ['Wrap the provider in one function of your own', 'Timeout and retries set from measured durations', 'Let the client retry 429 and 5xx, never a 400', 'Honour retry-after, limit calls in flight, set a deadline', 'Validate the output, and queue what fails', 'Log the model, tokens, cost and outcome'],
        short: 'I wrap the provider in one function of my own, so that the rest of the code does not know the field names and a change of model is one file. In that function I set a timeout from the measured duration of a call, a small number of retries, and a limit on the calls in flight.\n\nThe client libraries retry the transient errors with a growing wait, and I checked that: they retried a 429, a 529 and 500s, honoured the retry-after header, and did not retry a 400. I never put a bad request in a retry loop. For a job with a deadline I add a budget for the whole job, and park items that still fail in a queue.\n\nI validate every answer against a schema before anything acts on it, and I log the model name, the tokens, the cost and the outcome of every call. With the defaults of the libraries that I recorded, a hung call can hold a worker for thirty minutes, so I always set my own numbers.',
        fu: [
          ['How do you keep keys safe?', 'In a secret store, read at start, never in code, logs or prompts, with a separate key for each environment and a plan to rotate.'],
          ['What do you log?', 'The model and version, the token counts, the latency, the outcome and a request id. The content only if the rules of privacy allow it.']
        ],
        trap: 'Wrapping the call in `while True` with a sleep. It retries errors that cannot succeed.',
        real: 'Describe an outage of a model API and how your pipeline behaved.'
      }),

      B.qa({
        id: 'qa-retry', t: 1, tag: 'Model APIs', secs: 60,
        q: 'How do you handle rate limits and failures from a model API?',
        pts: ['429: wait for retry-after, then back off', '5xx and overload: retry with exponential backoff and jitter', '400 and 401: do not retry, fix the cause', 'Limit concurrency and tokens per minute on your side', 'A total deadline, and a queue for the rest', 'Make retries of actions idempotent'],
        short: 'I treat each failure on its own terms. For a 429 I wait for the `retry-after` header when there is one, and otherwise back off. For a 500 or an overload I retry a few times with a growing wait and some random jitter, so that many workers do not return at the same moment. In my recording the libraries did exactly that: about half a second, then about a second, and then they gave up after two retries.\n\nI do not retry a 400, or a 401 or 403, because repeating the same wrong request or key cannot help; I fix the cause and alert.\n\nOn my side I limit the number of calls in flight and the tokens per minute, so that I stay under the limit and do not slow the live users who share the key. A total deadline stops a job from running into the day, and a queue holds what still failed. And I make sure a retry of an action, such as a refund, is idempotent.',
        fu: [
          ['What is jitter for?', 'A random part of the wait. Without it, a hundred workers that failed together all retry together, and fail together again.'],
          ['What if the provider is down for an hour?', 'The queue holds the work, a second provider or model may take it if I tested that path, and the job resumes when the first one is back.']
        ],
        trap: 'Retrying everything with a fixed wait. It hammers a service that is already overloaded.',
        real: 'Describe how you handled a rate limit in a bulk job.'
      }),

      B.qa({
        id: 'qa-schema', t: 1, tag: 'Model APIs', secs: 60,
        q: 'How do you get structured output from a model that code can rely on?',
        pts: ['Define a schema, for example with pydantic', 'Use the structured or tool features of the provider where available', 'Validate every answer in your code anyway', 'On failure, retry once with the error text', 'Park what still fails', 'Never act on unchecked values'],
        short: 'I define the shape I need as a schema, for example a pydantic class with the fields, the types and the limits, such as a reason of at most 120 characters. Then I ask the model for that shape. Where the provider can enforce a schema, or return the answer as a tool call with an input schema, I use that.\n\nBut I always validate in my own code, because a prompt or a feature is not a guarantee. In my recording a clean answer passed, an answer with "maybe" for a boolean and a missing field was refused with both problems listed, and an answer with a polite sentence before the JSON failed to parse at the first character.\n\nOn a failure I retry once, giving the model the error text, since that fixes most format slips. What still fails goes to a queue for a person. And I never let a value act, such as a refund amount, before it has passed the check and, for a write, an approval.',
        fu: [
          ['Is JSON mode enough?', 'It helps with syntax, not with your fields, types and ranges. I validate against the schema.'],
          ['How do you handle a field the model should not guess?', 'Make it optional, allow a value such as null, and tell the model to leave it empty when the text does not say.']
        ],
        trap: 'Parsing the text with a regular expression and hoping. It breaks on the next model update.',
        real: 'Describe a schema you used and how you handled an answer that failed it.'
      }),

      B.qa({
        id: 'qa-tool', t: 1, tag: 'Model APIs', secs: 60,
        q: 'How does tool calling work at the level of the API?',
        pts: ['Declare tools with a name, a description and an input schema', 'The model answers with a tool request, not text', 'The model runs nothing: your code does', 'Send the result back with the same id', 'Check the arguments, they are untrusted', 'The loop can repeat, so bound it'],
        short: 'I declare each tool with a name, a description written for a model, and a JSON schema for its input. I send those with the messages. If the model decides that it needs a tool, the response has the stop reason `tool_use` and a block with the tool name and the arguments, instead of text. The model runs nothing.\n\nMy code takes over. It checks the arguments, because they come from a model and are untrusted, runs the tool, and sends a second request with the history in order: the user message, the assistant message with the tool request, and a user message with a `tool_result` block that carries the same id. In my recording the roles were user, assistant, user, the ids matched, and the second call returned the answer.\n\nThe model may ask for another tool, so this is a loop, and the loop needs a limit on the number of steps, which is the subject of the next missions.',
        fu: [
          ['How do you write a good tool description?', 'Say what it does, when to use it, what each argument means, and what it returns. A model chooses tools by their descriptions.'],
          ['What if the tool fails?', 'Return the error as the tool result, with a message the model can act on, so that it can try again or stop.']
        ],
        trap: 'Believing that the model calls the function. It only asks, and your code decides whether to run it.',
        real: 'Describe a tool you exposed and how you checked its arguments.'
      }),

      B.qa({
        id: 'qa-cost', t: 1, tag: 'Model APIs', secs: 60,
        q: 'How do you control the cost of model calls?',
        pts: ['Count tokens in and out, by feature and by user', 'Send fewer, better chunks and a short prompt', 'Cache the repeated prefix and repeated answers', 'A smaller model where the evaluation allows it', 'Batch interfaces for work that can wait', 'Budgets, alerts and a log of cost per answer'],
        short: 'First I measure: every call logs the tokens in and out, the model and the feature, so that I can see where the money goes. The prompt is usually the bulk of it, so the biggest lever is to send fewer and better chunks and a short set of rules. In my lab, the chunks were most of the input tokens.\n\nThen the other levers, each with a cost in quality or time. A cache for a repeated prefix, or for repeated answers when the role allows it. A smaller model for the cases where the evaluation set shows it holds the score. A batch interface for work that can wait, often cheaper. And limits: a maximum number of steps for an agent, a maximum number of tokens for an answer, and a budget with an alert for each day.\n\nI change one lever at a time and run the evaluation set, because a saving that lowers the score is not a saving.',
        fu: [
          ['What do you alert on?', 'Tokens per request, cost per day, calls per answer for an agent, and a sudden change in any of them.'],
          ['Is a cache safe?', 'Only if the key includes everything that changes the answer, such as the role and the version of the data.']
        ],
        trap: 'Switching to a cheaper model without an evaluation run.',
        real: 'Describe a cost you cut and what you measured before and after.'
      }),

      B.qa({
        id: 'qa-failover', t: 2, tag: 'Model APIs', secs: 60,
        q: 'How do you design for provider failover?',
        pts: ['One gateway function in front of every provider', 'Same input and output types, same checks', 'Fail over on errors and slowness, with a limit', 'A second model gives different answers: evaluate it', 'Test the failover path regularly', 'Log which provider answered'],
        short: 'I put one gateway function in front of the providers, so that the rest of the code sees the same request and the same response type, and a change of provider or model is a change in one place. The same validation and the same checks run on every answer, whoever wrote it.\n\nThe gateway fails over on errors, overload and slowness, with a limit on how long it tries the first one, and it logs which provider and model answered, so that quality and cost can be compared.\n\nTwo things take care. A second model gives different answers, with different formats and quirks, so I run the golden set on it before it ever serves traffic, and I accept a lower quality only where I decided that. And a failover path that is never used breaks silently, so I test it on a schedule, with a small share of real traffic or a drill.',
        fu: [
          ['What about data privacy with a second provider?', 'It must meet the same rules. A fallback that sends private data to a provider that the company has not approved is a breach.'],
          ['When is failover not worth it?', 'For batch jobs that can wait. A queue and a retry the next hour are simpler and cheaper.']
        ],
        trap: 'Adding a second provider without evaluating it or testing the switch.',
        real: 'Describe how your system behaved when a provider was down.'
      }),

      B.qa({
        id: 'qa-constrained', t: 3, tag: 'Model APIs', secs: 60,
        q: 'What is constrained decoding, and does it replace validation?',
        pts: ['The model may only produce tokens that fit a grammar or a schema', 'It guarantees syntax, not truth', 'Fewer retries for malformed output', 'Some providers offer it, as a structured output feature', 'The values can still be wrong or out of range', 'Validate meaning and ranges in code anyway'],
        short: 'Constrained decoding limits which tokens a model may produce at each step, so that the output fits a grammar or a JSON schema. Some providers offer it as a structured-output feature, and some open-model servers support grammars. It guarantees the syntax, so malformed JSON and polite words around it disappear, and fewer retries are needed.\n\nIt does not guarantee that the content is true or in range. A valid JSON can still hold an amount of a million, an order id that does not exist, or a wrong decision. So I validate meaning in code: ranges, ids against the database, rules such as the maximum refund, and then an approval for a write.\n\nI use it for the shape and my own checks for the substance. The features differ by provider and model, so I read the documentation, and I keep my validation in place so that I can change provider.',
        fu: [
          ['What is the cost?', 'Some added delay, and limits on which schema features are supported. Check the documentation.'],
          ['Does a refusal fit a schema?', 'Add a field or a variant for it. A schema with no way to say "I cannot" invites a made-up value.']
        ],
        trap: 'Believing that a schema-valid answer is a correct answer.',
        real: 'Describe how you combined structured output with your own checks.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'API Handler', color: '#C7D2FE',
        pts: [
          'A model call is an **HTTP request**: messages in, content blocks, a stop reason and **usage** out. Wrap each provider in **one function of your own**.',
          'The recorded SDKs **retry 429, 5xx and timeouts** with a growing wait and jitter, honour **retry-after**, and **never retry a 400**. Defaults can hold a worker for **30 minutes**.',
          'A **stream** is events with usage at the end. A **tool call** is two requests: the model asks, your code runs the tool and returns a `tool_result` with the same id.',
          '**Validate every answer** against a schema. Retry once with the error text, park what fails, and never act on an unchecked value.',
          'The **prompt is the bill**. Cut it with fewer chunks, a cache, a smaller model or a batch, and test each lever on the evaluation set.',
          'A job needs a **deadline**, a **queue**, limits on **calls in flight**, and **idempotent actions**.'
        ],
        lines: [
          'I set my own timeout and retry count.',
          'I validate before I act.',
          'I log the model, the tokens and the cost of every call.'
        ]
      })
    ]
  });
})();
