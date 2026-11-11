/* Mission 13: shipping an AI assistant. The gates of a release were run on real results: five changes to retrieval went through the evaluation gate
   of mission 6, and two changes that break the agent went through the tests of mission 11. A release workflow was written as a file and validated
   against the schema of GitHub Actions, and a copy with a typo was refused. The workflow was not run on GitHub, and nothing ran in production.
   Serving, canaries, LLMOps, versions and cost practice come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var WF = G.file('ci/example-release.yml'), OK = G.file('ci/validate_ok.txt'), BAD = G.file('ci/validate_bad.txt'), CS = G.counts('ci.summary');
  var GD = G.counts('eval.gate_detail'), TS = G.counts('test.summary'), PN = G.counts('pipeline.notes'), AL = G.file('pipeline/alias.json');
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }
  G.expect(CS.ok.exit_code === 0 && CS.bad.exit_code === 1 && CS.workflow.jobs.join() === 'evaluation,unit' && CS.workflow.needs === 'unit', 'the workflow validation');
  G.expect(Object.keys(GD.candidates).length === 5 && GD.candidates['keyword search only'].verdict === 'pass' && GD.candidates['fixed 500 characters, no overlap'].verdict === 'fail', 'the gate verdicts');
  G.expect(TS.clean.failed === 0 && TS.no_limit.failed === 1 && TS.no_approval.failed === 1, 'the test verdicts');
  G.expect(PN['hit@3_new_model_index'] === 0.833 && PN['hit@3_old_model_index'] === 0.75, 'the two indexes');
  var BUG1 = [
    '  evaluation:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - name: Offline evaluation on the golden set',
    '        run: python evals/gate.py --candidate build/candidate --baseline releases/current',
    '        continue-on-error: true'
  ].join('\n');
  var FIX1 = [
    '  evaluation:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - name: Offline evaluation on the golden set',
    '        run: python evals/gate.py --candidate build/candidate --baseline releases/current --fail-on-regression'
  ].join('\n');
  var BUG2 = [
    'MODEL = "provider-model-latest"        # always the newest',
    '',
    'def ask(messages):',
    '    return client.messages.create(model=MODEL, max_tokens=300, messages=messages)'
  ].join('\n');
  var FIX2 = [
    'MODEL = "provider-model-2026-03-01"    # a pinned version: it changes when we change it',
    '',
    'def ask(messages):',
    '    reply = client.messages.create(model=MODEL, max_tokens=300, messages=messages)',
    '    log_call(model=MODEL, prompt_version=PROMPT_VERSION, usage=reply.usage)',
    '    return reply'
  ].join('\n');

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Shipping: serving, releases and cost', short: 'Shipping', blurb: 'What you release, how a change meets the gates, canaries and rollbacks, serving, and LLMOps', minutes: 50,
    focus: ['ci', 'snap'],
    goals: [
      'List the **artefacts** of an AI assistant that change, and give each a version.',
      'Put **tests, an evaluation gate and an attack set** in a release pipeline, cheapest first.',
      'Ship through a **canary** and roll back with **one write**.',
      'Describe how to **serve** a retrieval assistant: stateless service, state store, queue, gateway, cache.',
      'Say what **LLMOps** adds to MLOps, and what it does not replace.',
      'Control **cost** with budgets, limits and alerts.'
    ],
    say: 'Mission 13 is where the assistant leaves your laptop. A change can be a prompt, a chunk size, an embedding model, a tool or a model name, and every one of them can make the answers worse without any error. I ran seven changes through real gates: five changes to retrieval through the evaluation gate, and two changes that break the agent through its tests. All seven results are recorded. The release workflow is a file that I validated against the GitHub Actions schema. I did not run it, and nothing ran in production.',
    scenes: [
      B.talk({
        id: 'm13-talk', t: 1, src: 'docs', title: 'What you release, beyond the code',
        say: 'In a normal service the code is the release. In an assistant the behaviour comes from several things, and each one can change on its own. Press Next for the list.',
        items: [
          ['The prompt', 'A change of one sentence changes behaviour. Keep prompts in files in the repository, with a version that is logged with every answer, and review changes like code.', 'A prompt is code with a different syntax.'],
          ['The index and the chunker', 'A new chunk size or a new embedding model means a new index. Build it beside the live one, score it, and switch an alias. The index has a version, and so has the model that made it.', 'An index is a release.'],
          ['The model', 'A model name that points at "the latest" changes without you. Pin a version where you can, log it with every call, and run the evaluation set before you move to another one.', 'A model change is a release.'],
          ['The tools', 'A tool, or an MCP server, that changes its description or its behaviour changes what the agent does. Pin versions, review descriptions, and test the tools on their own.', 'A tool change is a release.'],
          ['The evaluation set and the limits', 'The golden set, the attack set, the step limit, the token budget and the permission rules are part of the system. They live in the repository, and a change to them is reviewed.', 'The safety net is versioned too.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm13-artifacts', t: 1, src: 'docs', title: 'Each artefact, its version, and the check it needs',
        say: 'A table to take to a design review. Press Next to read it in two halves. The left column is what changes, the right is what must run before it reaches users.',
        cols: ['What changes', 'How it is versioned', 'What must run first'],
        hl: 2,
        rows: [
          ['Prompt', 'A file in the repository, with a version string', 'The evaluation gate and the attack set'],
          ['Chunker and chunk size', 'Settings in code, and the id of the index that they built', 'The evaluation gate, and a read of sample chunks'],
          ['Embedding model', 'A model id stored with the index and checked by every query', 'A new index, the gate, then an alias switch'],
          ['Language model', 'A pinned version, logged with each call', 'The gate, the attack set and a canary'],
          ['Tools and servers', 'A version of the code, or a pinned version of a server', 'Unit tests of the tool, and a review of its description'],
          ['Limits and permissions', 'Config in the repository', 'The tests of the loop, and the attack set']
        ],
        steps: [
          { upto: 3, say: 'The prompt, the chunker and the embedding model all change what is retrieved and what is said. They share one check: the evaluation gate on the same questions, and for a new embedding model, a new index first.' },
          { upto: 6, say: 'The language model, the tools and the limits are the other half. A new language model needs the gate and the attack set, and a canary. A tool or a limit needs the tests of the loop, because the tool is code that acts.' }
        ],
        pick: 'Give **every artefact a version**, **log the versions** with each answer, and make **one pipeline** check them all. Then a bad answer can be linked to the change that caused it.'
      }),

      B.flow({
        id: 'm13-cicd', t: 1, src: 'docs', title: 'The release pipeline of an assistant', g: 'cicd', legend: true,
        steps: [
          { say: 'This is the path of a change to an assistant, from an edit to production. The gates come cheapest first. Press Next to follow a change to a prompt.', cap: 'A change, gates, a canary, a release.' },
          { say: 'Step 1. An edit to a prompt, the chunker, the model or a tool opens a pull request, and a person reviews it. The review reads the diff of the prompt, the way that it reads a diff of code.', on: ['d1'], focus: ['c_chg', 'c_pr'], cap: 'A pull request, reviewed.' },
          { say: 'Step 2. Tests run: the code and the contracts. In mission 11, four tests of the loop ran in a fraction of a second on a scripted model, and two broken copies were caught by exactly the right test.', on: ['d2'], focus: ['c_pr', 'c_test'], cap: 'Tests catch the loop and the tools.' },
          { say: 'Step 3. The offline evaluation runs the golden set on the candidate and on the current release. Step 4. The gate compares them question by question, and by kind, and blocks a change that is worse.', on: ['d3', 'd4'], focus: ['c_test', 'c_eval', 'c_gate'], cap: 'The evaluation gate blocks a regression.' },
          { say: 'Step 5. A passing change goes to a small share of traffic. Step 6. Online monitors watch tokens, tool errors, refusals and feedback against rules written in advance.', on: ['d5', 'd6'], focus: ['c_gate', 'c_can', 'c_mon'], cap: 'A canary with rules written in advance.' },
          { say: 'Step 7. If the monitors are quiet, the change is promoted. If not, it is rolled back, which is one write to an alias. The registry records which prompt, index, model and tools were released, with the scores that allowed it.', on: ['d7', 'd8'], focus: ['c_mon', 'c_prom', 'c_reg'], cap: 'Promote, or roll back, and record it.' }
        ]
      }),

      B.code({
        id: 'm13-workflow', t: 1, src: 'rec', title: 'The release checks, as a workflow file', file: 'example-release.yml', lang: 'yaml', code: WF,
        steps: [
          { say: 'This is the pipeline above as a GitHub Actions workflow. It is an example for the course, and it is kept outside the folder where GitHub looks for workflows, so it never runs. What I did run is a schema check of the file, on the next screen.', lines: null },
          { say: 'The trigger: a pull request that touches the prompts, the retrieval code, the tools or the evaluation files. A change to a README does not start an expensive evaluation.', lines: G.span(WF, /^on:/, /evals\/\*\*/) },
          { say: 'The first job runs the tests of the loop with a scripted model. It is fast and free, so it runs first.', lines: G.span(WF, /^  unit:/, /pytest -q tests\/test_agent\.py/) },
          { say: 'The second job has `needs: unit`: it runs only if the tests pass. It runs the evaluation gate against the current release, with a flag that makes it exit with an error on a regression. Then it runs the attack set, which must pass completely.', lines: G.span(WF, /^  evaluation:/, /attacks\.py --must-pass-all/) },
          { say: 'The exit code is the gate. A step that exits with an error stops the job, and a stopped job blocks the merge when the branch rules require the check. A check that cannot fail is not a gate, which the bug hunt below shows.', lines: G.span(WF, /fail-on-regression/, /fail-on-regression/) }
        ],
        note: 'The scripts that the workflow names, `evals/gate.py` and `evals/attacks.py`, are not part of this course. The gate logic is `gate` in evalkit.py of mission 6.'
      }),

      B.term({
        id: 'm13-validate', t: 1, src: 'rec', title: 'Validate the workflow before you push it',
        say: 'A schema check ran on the workflow, and then on a copy where I misspelled a key in both jobs. Look at the message: it names the job and the missing key.',
        lines: [].concat(
          G.plain(wrap(OK.replace(' -- ', ' - '), 92), { cmd: 'check-jsonschema --builtin-schema vendor.github-workflows example-release.yml', d: 90 }),
          [{ c: 'dim', t: '# the same file, with runs-on spelled run-on in both jobs', d: 500 }],
          G.plain(wrap(BAD, 92), { cmd: 'check-jsonschema --builtin-schema vendor.github-workflows example-release.yml', d: 90 })
        ),
        after: 'The schema knows the keys that GitHub accepts, so a typo fails in your terminal, and not in a run that waits in a queue. The exit code of **1** is what a hook or a pipeline step uses to stop. The check reads the structure of the file. It does not run it, and it cannot tell whether `evals/gate.py` exists or whether the gate is strict enough.',
        afterKind: 'tip',
        doneSay: 'Cheap checks first. A typo should die in seconds.'
      }),

      B.widget({ id: 'm13-release-lab', kind: 'release', t: 1, src: 'rec', title: 'Lab: seven changes meet the gates, and a canary rolls back' }),

      B.flow({
        id: 'm13-serve', t: 1, src: 'docs', title: 'Serving a retrieval assistant', g: 'serve', legend: true,
        steps: [
          { say: 'This is one way to serve the assistant. It is a documentation-level sketch, because nothing here ran in a cloud. Press Next to follow a question and a new document.', cap: 'Request path, state and ingestion.' },
          { say: 'Step 1 and 2. The store app calls an API gateway, which authenticates the user and limits the rate. Then the agent service takes the request. It holds no state of its own, so any copy of it can serve any request.', on: ['s1', 's2'], focus: ['v_app', 'v_gw', 'v_agent'], cap: 'Gateway, then a stateless agent service.' },
          { say: 'Step 3 to 5. The agent calls the retrieval service, which searches the vector database with the filter of the user. It calls a model gateway, which holds the keys, retries, routes to a provider and sits in front of a cache.', on: ['s3', 's4', 's5', 's6'], focus: ['v_agent', 'v_ret', 'v_vdb', 'v_mg', 'v_cache'], cap: 'Retrieval, and a gateway for models.' },
          { say: 'The state of a conversation lives in a state store, with the checkpoints of mission 10. That is what lets a run pause for a person and resume on another copy of the service.', on: ['s7'], focus: ['v_agent', 'v_state'], cap: 'State lives outside the service.' },
          { say: 'A new document goes to a queue, and workers embed it in batches with retries and write it to the index, as in mission 5. Ingestion never runs inside the request path.', on: ['s8', 's9'], focus: ['v_q', 'v_work', 'v_vdb'], cap: 'Ingestion through a queue.' },
          { say: 'Around it: secrets in a secret store, monitoring of latency, errors and cost, budgets with a ceiling for tokens, and a release process with a canary and a rollback.', focus: ['v_sec', 'v_mon', 'v_bud', 'v_rel'], keepGroups: true, cap: 'Secrets, monitoring, budgets, releases.' }
        ]
      }),

      B.talk({
        id: 'm13-serving', t: 1, src: 'docs', title: 'Serving: the decisions',
        say: 'The picture hides the decisions. These are documentation-level practices that hold for a container platform, a managed cloud service or a virtual machine. Press Next for each.',
        items: [
          ['Stateless service, state in a store', 'Keep the process free of conversation state, so that you can add copies, replace them and restart them. Put the state in a database that the team already runs, and give it access control and retention.', 'Any copy can serve any request.'],
          ['Stream, and set timeouts', 'Stream the answer to people, set a timeout for every call that you make, and a deadline for the whole request. A request that waits for ever holds a worker and a user.', 'Timeouts for each call and for the request.'],
          ['A gateway for models', 'One place that holds the provider keys, retries, limits the rate, logs tokens and cost, and can route to another model. Your services never see the keys, and a change of provider is a change in one place.', 'Keys, retries, routing and cost in one place.'],
          ['Caching with care', 'Cache the embedding of a repeated text, a repeated prefix of a prompt where the provider supports it, and, if you must, repeated answers. The cache key has to include everything that changes the answer: the role of the user, the version of the data, the prompt version.', 'The key includes the role and the versions.'],
          ['Containers and infrastructure as code', 'Package the service as a container with its dependencies pinned, define the infrastructure in code, and keep the settings of each environment in version control. Kubernetes is one way to run the containers, and it is a choice, not a requirement.', 'Pin it, script it, review it.'],
          ['Health and readiness', 'A health check that also reports the version of the prompt, the index and the embedding model that this copy uses, and refuses to become ready when the index and the model do not match.', 'A mismatch must stop the start.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm13-llmops', t: 1, src: 'docs', title: 'LLMOps: what it adds, and what it does not replace',
        say: 'Job posts say LLMOps. It is a name for the practices of this and the last mission. Press Next for what it adds to MLOps, and what stays the same.',
        items: [
          ['What stays the same', 'Version control, tests, CI, monitoring, environments, infrastructure as code, access control and incident handling. A team that does not do these for its data pipelines will not do them for an assistant.', 'Good engineering, still.'],
          ['What it adds', 'Prompts and retrieval settings as artefacts. Evaluation sets and judges as gates. Traces of model and tool calls. Token and cost budgets. Guardrails and attack sets. A person in the loop for actions. Provider management: pinned versions, failover, terms.', 'New artefacts, new gates, new costs.'],
          ['What shifts', 'Many teams do not train models, so training pipelines and feature stores matter less, and data pipelines for documents, indexes and evaluation matter more. The data engineer is closer to the centre than in many classic ML projects.', 'Data pipelines move to the centre.'],
          ['Tools', 'Platforms for traces and evaluations, prompt registries and gateways exist, from open-source projects and from vendors. Choose with these questions: does it speak standard traces, where does the data live, can it run in your network, and can you leave.', 'Choose by data, standards and exit.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm13-q1', t: 1,
        q: 'A teammate edits one sentence of the system prompt in a web console, and the behaviour of the assistant changes. What went wrong in the process?',
        opts: [
          { t: 'The prompt was changed outside version control and outside the gates, so nobody reviewed it and no score was run', fb: '' },
          { t: 'Prompts must never change', fb: 'They change often. The point is how.' },
          { t: 'The console is slow', fb: 'Speed is not the issue.' },
          { t: 'The prompt was too short', fb: 'Length did not cause the problem.' }
        ],
        ok: 0, why: 'A prompt is code with a different syntax. It belongs in the repository, with a version that is logged with every answer, a review, and the evaluation gate. Then a change in behaviour can be linked to one commit, and a bad one can be rolled back.'
      }),

      B.quiz({
        id: 'm13-q2', t: 1,
        q: 'The gate stopped the glossary-words change: hit@3 fell from ' + GD['baseline_hit@3'] + ' to ' + GD.candidates['glossary words added to each question'].cand + ', five questions worse and two better. Which is the right next step?',
        opts: [
          { t: 'Read the worse list, and make the change smaller, for example a rewrite for vague questions only, and run the gate again', fb: '' },
          { t: 'Merge it, two questions got better', fb: 'Five got worse, and they were the clear questions.' },
          { t: 'Loosen the gate until it passes', fb: 'The gate exists to stop exactly this.' },
          { t: 'Delete the evaluation set', fb: 'Then nothing is ever stopped, and nothing is ever known.' }
        ],
        ok: 0, why: 'A gate gives a reason and a list, and the list is the work. A trade between kinds of question needs a smaller change, or a decision that is written down with a reason. Changing the tolerance to get a pass defeats the control.'
      }),

      B.quiz({
        id: 'm13-q3', t: 1,
        q: 'The step limit is removed from the agent. Which gate catches it, and what does the recording show?',
        opts: [
          { t: 'The unit tests of the loop: exactly one test failed, with the recursion error of the framework', fb: '' },
          { t: 'The offline evaluation of retrieval', fb: 'Retrieval did not change, so it would pass.' },
          { t: 'Only the canary', fb: 'A canary can catch it, at the price of a real loop in front of real users. The test is cheaper.' },
          { t: 'Nothing: it can only be found in production', fb: 'The recorded test found it in a fraction of a second.' }
        ],
        ok: 0, why: 'With the limit removed, `' + G.file('test/pytest_no_limit.txt').split('\n').filter(function (l) { return /^FAILED/.test(l); })[0].replace(/ - .*/, '') + '` failed and the other three passed. Each rule of the loop has a test, so a broken rule points at the test that names it.'
      }),

      B.quiz({
        id: 'm13-q4', t: 1,
        q: 'A workflow step runs the evaluation gate with `continue-on-error: true`. What does that do?',
        opts: [
          { t: 'The job goes on, and the check shows green, even if the gate fails. It is no longer a gate', fb: '' },
          { t: 'It makes the gate faster', fb: 'It changes only what happens after a failure.' },
          { t: 'It retries the gate', fb: 'It does not retry.' },
          { t: 'It makes the gate stricter', fb: 'The opposite.' }
        ],
        ok: 0, why: 'A gate stops a merge by failing. With `continue-on-error` the failure is ignored and nothing is stopped. The check that cannot fail gives a false sense of safety, which is worse than no check.'
      }),

      B.quiz({
        id: 'm13-q5', t: 2,
        q: 'The new index scored ' + PN['hit@3_new_model_index'] + ' at 3 against ' + PN['hit@3_old_model_index'] + ' for the old one, and the alias was switched. An hour later the monitors show worse answers. What do you do first?',
        opts: [
          { t: 'Move the alias back to the previous index: one write, with no rebuild. Then analyse', fb: '' },
          { t: 'Rebuild the new index with other settings', fb: 'That takes time while users get worse answers.' },
          { t: 'Wait for more data', fb: 'Users are affected now.' },
          { t: 'Change the prompt to compensate', fb: 'It hides the cause, and adds a second change.' }
        ],
        ok: 0, why: 'The old index was kept as `previous` for exactly this. Going back takes one write. Analyse afterwards with the traces, and add the failing questions to the golden set, so that the gate sees them next time.'
      }),

      B.order({
        id: 'm13-ord', t: 1, q: 'Put the release of a prompt change in order.',
        items: [
          'Edit the prompt in a file, with a new version string, and open a pull request',
          'A person reviews the diff',
          'Run the tests of the loop and the tools',
          'Run the evaluation gate against the current release, and the attack set',
          'Release to a small share of traffic, and watch the monitors against written rules',
          'Promote, or roll back with one write',
          'Record the versions and the scores in the registry'
        ],
        why: 'Cheap gates come first, because most mistakes are caught there. The canary is for what offline tests cannot see. The registry makes the next incident easier, because the versions of every answer are known.'
      }),

      B.bug({
        id: 'm13-bug', t: 1, src: 'rec', q: 'The evaluation job of the release pipeline is always green, even on a change that clearly makes the answers worse. Click the line.',
        file: 'release.yml', lang: 'yaml', code: BUG1, bad: [7],
        hint: 'What does a failure of this step do to the job?',
        why: '`continue-on-error: true` lets the job go on, and the check show green, after the step fails. The gate runs and nothing listens to it. Remove it, and make the script exit with an error on a regression, as the example workflow does with `--fail-on-regression`.',
        fix: FIX1,
        cheer: 'A gate must be able to fail.'
      }),

      B.bug({
        id: 'm13-bug2', t: 2, src: 'docs', q: 'One Monday the assistant answers differently, with no deployment since Friday. Click the line that explains it.',
        file: 'ask.py', lang: 'python', code: BUG2, bad: [1],
        hint: 'What does "latest" mean to the provider?',
        why: 'A floating alias points at whatever the provider calls the newest model today. When the provider moves it, your behaviour changes with no change in your repository, and no gate saw it. Pin a version, log it with every call, and move to a new one through the pipeline.',
        fix: FIX2,
        cheer: 'Pin the model, and log the version.'
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: how do you move to a new language model?',
        scenario: 'A new model version is announced, cheaper and said to be better. The assistant serves 2,000 questions a day. The current model is pinned. Your golden set has 60 questions, and your attack set has 25 cases.',
        opts: [
          { t: 'Switch the model name in production today, because the announcement says it is better', d: 'Immediate savings.', lose: 'The announcement was measured on somebody else\'s tasks. Your formats, your tools and your refusals may behave differently, and nothing has checked them.' },
          { t: 'Run the golden set and the attack set on it, compare cost and score with the current model, canary it on a small share, and keep the old pin ready to restore', d: 'The decision rests on your questions, and the way back costs one change.' },
          { t: 'Never change a model that works', d: 'Safe, and stable.', lose: 'The pinned version will be retired one day, usually with a notice period, and then you must move in a hurry with no preparation. Cost and quality opportunities are lost while you wait.' }
        ],
        pick: 1,
        why: 'Treat a model change as any other release: the gate, the attack set, a canary and a rollback. Compare cost and quality together, since a cheaper model that breaks refusals is not cheaper. Plan for retirement dates, so that a forced move is a routine one.',
        when: 'If the old model is being retired soon, start the process earlier, and treat the date as a deadline for the gates, not for skipping them.'
      }),

      B.incident({
        id: 'm13-inc', t: 2, src: 'rec', title: 'Incident: a better index made the answers worse', time: '09:05',
        alert: '**Yesterday the team switched the alias to a rebuilt index with a new embedding model. This morning managers report wrong and missing answers.** The new index was built and switched in one afternoon. The team compared the vendor benchmark of the new model, and did not run the golden set. The old index is still there, as `previous`.',
        clues: ['No evaluation was run on the new index', 'In the recording the gate compared the two indexes on the same questions before the switch', 'The old index is kept as `previous`', 'The alias is one small write'],
        opts: [
          { t: 'Move the alias back to the previous index now, then run the golden set on both indexes and find the questions that got worse', fb: '' },
          { t: 'Keep the new index and tune the prompt around the problems', fb: 'Users stay on a worse system while you tune, and the cause is not known.' },
          { t: 'Delete the new index and say nothing', fb: 'You lose the evidence that you need for the analysis.' },
          { t: 'Trust the benchmark, and tell managers to ask again', fb: 'A benchmark measured something else. Your users are your test.' }
        ],
        best: 0,
        why: 'Roll back first, and it costs one write because the old index was kept. Then do what should have happened before: run the golden set on both indexes, read the worse list, and decide with numbers. Make the evaluation run a required step before an alias moves.',
        checks: [
          ['Roll back', 'Move the alias to `previous`, and confirm with a few questions.'],
          ['Keep the evidence', 'Do not delete the new index. It is the thing to analyse.'],
          ['Evaluate both', 'Run the golden set on both indexes, and read the questions that got worse, by kind.'],
          ['Decide', 'Fix the cause, or keep the old model. Write down why.'],
          ['Gate it', 'An alias may only move after a passing evaluation, and the score goes into the record.']
        ],
        tell: 'We switched to an index built with a new embedding model after reading a vendor benchmark and without running our golden set, and managers got worse answers. I moved the alias back to the previous index with one write, kept the new index for analysis, and ran the golden set on both. I made a passing evaluation a required step before an alias moves, with the scores written to the release record.',
        prevent: ['**Evaluate before you move an alias**', 'Keep the **previous index** for a day or more', 'A vendor benchmark is **not your test**', 'Record **scores with the release**']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, src: 'docs', title: 'Incident: the assistant changed on a Monday, with no release', time: '08:40',
        alert: '**Answers changed over the weekend, with no deployment, no prompt change and no index change. Refusals dropped, and the answers are longer.** The code calls the model through a floating alias, `provider-model-latest`. The provider updated the model that the alias points to. Nobody was told, and there is no record of which version answered.',
        clues: ['The alias is not pinned', 'The version is not logged with each answer', 'The golden set was not run after the change', 'Two incidents have shown the refusal rate dropping'],
        opts: [
          { t: 'Pin the previous version, log the model version with every call, run the golden set and the attack set on the new one, and move to it through the pipeline', fb: '' },
          { t: 'Keep the alias and add a line to the prompt about the old behaviour', fb: 'It patches symptoms, and the next update changes behaviour again.' },
          { t: 'Switch providers', fb: 'A different model is another change with no gate, and does not fix the process.' },
          { t: 'Ignore it, since the answers look fine', fb: 'Refusals dropped, which is a safety signal, and it will drift again.' }
        ],
        best: 0,
        why: 'A floating alias lets another party release into your system. Pin the version, log it, and treat a move as a release with the gate and the attack set. The drop in refusals shows why the attack set matters: it is behaviour that no answer-quality score would show.',
        checks: [
          ['Find what changed', 'Compare the version in the logs, if there is one, and the date of the change at the provider.'],
          ['Pin it', 'Use a dated version, so that behaviour changes only when you change it.'],
          ['Log it', 'Record the model version and the prompt version with every call.'],
          ['Evaluate', 'Run the golden set and the attack set on the new model before any move.'],
          ['Alert', 'Alert on a change in the refusal rate and the answer length.']
        ],
        tell: 'Answers changed on a Monday with no release because we called the model through a floating alias, and the provider updated what it points to. I pinned the previous dated version, started logging the model version and the prompt version with every call, and ran the golden set and the attack set on the new model before moving to it through the pipeline. I added alerts on the refusal rate and the answer length.',
        prevent: ['**Pin** the model version', '**Log** the model and prompt version with each call', 'Alert on **refusal rate and answer length**', 'A model change is a **release** with gates']
      }),

      B.qa({
        id: 'qa-ship', t: 1, tag: 'Shipping', secs: 90,
        q: 'How do you release a change to an AI assistant safely?',
        pts: ['Treat prompts, index, model and tools as versioned artefacts', 'Review the diff of each one', 'Tests of the loop, then the evaluation gate and the attack set', 'Compare with the current release, question by question', 'A canary with rules written in advance', 'Roll back with one write, and record the versions and scores'],
        short: 'I treat every part that shapes behaviour as an artefact with a version: the prompt in a file, the chunker settings and the index, the embedding model, the language model pinned to a dated version, the tools, and the limits. A change to any of them is a pull request that a person reviews.\n\nThen gates, cheapest first. Tests of the loop with a scripted model run in a second: in my recording, a copy without the step limit and a copy without the approval were each caught by exactly one test. Then the offline evaluation compares the candidate with the current release on the golden set, question by question and by kind, and the attack set must pass completely. In my recording, four of five retrieval changes failed that gate.\n\nA passing change goes to a small share of traffic, with rules written in advance for tokens, tool errors, refusals and feedback. Rolling back is one write to an alias, because the previous index is kept. And I record the versions and scores of every release.',
        fu: [
          ['What would you automate first?', 'The tests and the evaluation gate in CI. They pay back at the first change.'],
          ['What is hard to test offline?', 'Real user behaviour and real load. That is the canary\'s job.']
        ],
        trap: 'Describing deployment of code only. The prompt, the index and the model are releases too.',
        real: 'Describe a change that your gate stopped, or one that a canary caught.'
      }),

      B.qa({
        id: 'qa-cicd', t: 1, tag: 'Shipping', secs: 60,
        q: 'What does CI/CD look like for an LLM application?',
        pts: ['The same CI as any service: tests, linting, a build', 'Tests of the loop with a scripted model', 'An evaluation gate on a golden set, and an attack set', 'The gate fails the job on a regression', 'Versioned prompts, indexes and models', 'Deploy with a canary and an automatic rollback'],
        short: 'It is the CI of any service with extra gates. The usual parts stay: tests, linting, a build, and a deployment with environments. Then I add tests of the agent loop with a scripted model, which are fast and deterministic, an evaluation gate that runs the golden set on the candidate and on the current release and compares them question by question, and an attack set that must pass completely.\n\nThe gate has to be able to fail: the job exits with an error on a regression, and the branch rules require it. I validated an example workflow against the schema of GitHub Actions, and a typo in a key was caught at once. Prompts, indexes and models have versions, and the versions are logged with every answer.\n\nDeployment goes through a canary with rules written in advance, and a rollback that is one write to an alias or a pinned version. The cost of the evaluation run in tokens is part of the design, so I run the cheap gates first and the expensive ones only when the cheap ones pass.',
        fu: [
          ['What do you do about the cost of the evaluation?', 'Run the cheap tests first, keep the golden set small but varied, cache what does not change, and run the large set nightly rather than on every commit.'],
          ['What about flaky judges?', 'Calibrate them against human labels, and use deterministic checks for gates wherever possible.']
        ],
        trap: 'Putting an evaluation step in the pipeline that cannot block a release.',
        real: 'Describe a pipeline you built that blocked a bad change.'
      }),

      B.qa({
        id: 'qa-llmops', t: 1, tag: 'Shipping', secs: 60,
        q: 'What is LLMOps, and how does it differ from MLOps?',
        pts: ['The same base: versioning, tests, CI, monitoring, access control', 'New artefacts: prompts, retrieval settings, evaluation sets', 'New gates: evaluation, attack sets, judges', 'Traces of model and tool calls, and token cost', 'Guardrails and approvals for actions', 'Often no training, so data pipelines matter more'],
        short: 'LLMOps is a name for the practice of running applications built on language models. It keeps the base of MLOps and of any good engineering: version control, tests, CI, environments, monitoring, access control and incident handling.\n\nWhat it adds is new artefacts, new gates and new costs. The artefacts are prompts, retrieval settings, the golden set and the attack set, all versioned. The gates are an evaluation on a golden set and checks of safety, with a judge calibrated against people. The new signals are traces of model and tool calls, and token cost. And guardrails and approvals for actions that touch other systems.\n\nWhat often shifts is that many teams do not train models, so training pipelines matter less, and the pipelines for documents, indexes and evaluation matter more, which puts the data engineer near the centre. Tools exist for traces, prompts and evaluation, and I choose them by standards, by where the data lives and by whether I can leave.',
        fu: [
          ['Is it a new discipline?', 'It is the old one applied to new artefacts. The new parts are evaluation of fuzzy output and the cost model.'],
          ['What would you set up first?', 'Version control of prompts, a golden set with a gate, and traces with token metrics.']
        ],
        trap: 'Talking only about tools. Describe the practices that any tool supports.',
        real: 'Describe which LLMOps practices you introduced first, and why.'
      }),

      B.qa({
        id: 'qa-serve', t: 1, tag: 'Shipping', secs: 90,
        q: 'How would you deploy a RAG assistant?',
        pts: ['A stateless agent service, state in a database', 'A gateway for auth and limits, a gateway for models', 'A retrieval service and a vector store with the filter of the user', 'Ingestion through a queue and workers, not in the request path', 'Secrets, monitoring and budgets', 'Containers, infrastructure as code, canary releases'],
        short: 'I would keep the service stateless, with the conversation state and checkpoints in a database the team runs, so that I can add and replace copies. In front is an API gateway for authentication and rate limits. The agent service talks to a retrieval service that searches the vector store with the filter of the user, and to a model gateway that holds the provider keys, retries, limits the rate, logs tokens and cost, and can route to another model.\n\nIngestion is separate: a new document goes to a queue and workers embed it in batches with retries and write it to the index, as an idempotent job. It never runs in the request path.\n\nI stream answers, set a timeout for every call and a deadline for the request, and use a cache only with a key that includes the role and the versions. Secrets are in a secret store. Monitoring covers latency, errors, tokens and cost, with budgets and alerts. The service is a container, the infrastructure is code, and releases go through a canary with a rollback.',
        fu: [
          ['Where does the index live?', 'In a vector store that the team can operate, with the labels that the filter needs. For a modest size, pgvector in the existing database is a good first choice.'],
          ['What about scaling?', 'Scale the stateless service by adding copies, the embedding workers by queue depth, and watch the rate limits of the model provider, which are the usual ceiling.']
        ],
        trap: 'Drawing boxes with no decisions: state, timeouts, keys, cache keys and limits are the content.',
        real: 'Describe how you deployed a service that depends on an external model.'
      }),

      B.qa({
        id: 'qa-versions', t: 1, tag: 'Shipping', secs: 60,
        q: 'What do you version in an AI application, and how?',
        pts: ['Prompts: files with a version, logged with each answer', 'Indexes: an id, the embedding model id, the chunker settings', 'Language model: a pinned dated version', 'Tools and servers: code versions or pinned versions', 'Evaluation and attack sets: files in the repository', 'A registry that links a release to its scores'],
        short: 'Everything that shapes behaviour. Prompts live in files in the repository with a version string that is logged with every answer. Each index has an id, the id of the embedding model that made it, and the chunker settings, and the live one is chosen by an alias, with the previous one kept. The language model is pinned to a dated version, never to a floating alias, and the version is logged with each call.\n\nTools and servers have code versions, or pinned versions if I did not write them, and I review changes to their descriptions. The golden set, the attack set, the limits and the permission rules are files in the repository too, reviewed like code.\n\nA registry ties it together: for each release, the versions of all of these and the scores that allowed it. That way, when an answer is wrong, I can say which prompt, index, model and tools produced it, and what changed since the last good release.',
        fu: [
          ['Why log the versions with each answer?', 'So that a complaint can be traced to one combination of artefacts, and so that a change in behaviour can be linked to a change in a version.'],
          ['What if a provider retires a version?', 'Plan for it: watch announcements, and run the move through the pipeline before the date.']
        ],
        trap: 'Versioning the code and nothing else.',
        real: 'Describe how you traced a wrong answer back to a version.'
      }),

      B.qa({
        id: 'qa-canary', t: 2, tag: 'Shipping', secs: 60,
        q: 'How do you canary a prompt or a model change, and when do you roll back?',
        pts: ['A small share of traffic, chosen at random or by user', 'Compare against the current release on the same period', 'Rules written in advance: tokens, tool errors, refusals, feedback', 'Enough traffic to mean something', 'Roll back with one write when a rule is crossed', 'Add what you learn to the golden set'],
        short: 'I send a small share of traffic to the candidate, chosen at random or by user so that a conversation stays on one version, and I compare it with the current release over the same period. Before the canary starts I write the rules: tokens per request and cost, the tool error rate and steps per run, the failure rate of the cheap checks, the refusal rate, thumbs down and escalations, and latency at the 95th percentile.\n\nI need enough traffic for a rule to mean something, so a rare signal needs a longer canary. If a rule is crossed, I roll back with one write, to the previous version or index that I kept, and I analyse afterwards with the traces. If the monitors stay quiet, I raise the share in steps and then promote.\n\nWhat I learn goes back into the golden set, so that the next gate catches it. A canary is for what offline tests cannot see, such as real users and real load, and it does not replace the gate.',
        fu: [
          ['What if the traffic is tiny?', 'Then a canary says little. Rely on the offline set, shadow the candidate on real questions without showing the answers, and read the results.'],
          ['What is shadowing?', 'Run the candidate on real requests in parallel, log its answers and costs, and compare, with no effect on users.']
        ],
        trap: 'Starting a canary without rules. Then any result can be explained away.',
        real: 'Describe a canary that you rolled back and the rule that triggered it.'
      }),

      B.qa({
        id: 'qa-semcache', t: 3, tag: 'Shipping', secs: 60,
        q: 'Is a semantic cache a good idea?',
        pts: ['It returns a stored answer for a question that is similar, by embedding', 'It saves tokens and delay for repeated questions', 'Near is not the same: a different order id or role needs a different answer', 'The key must include the role and the data version', 'Staleness: expire on a change of the documents', 'Measure false hits before you ship it'],
        short: 'A semantic cache stores answers, and returns one when a new question is close enough to a stored one in embedding space. It can save tokens and delay for questions that repeat, such as the opening hours of a store.\n\nThe risk is that near is not the same. "Can I refund order 4412?" and "Can I refund order 4413?" are almost the same text and need different answers, and so do the same question from two roles. So the cache key must include the role of the user and the version of the data and the prompt, the similarity threshold must be tight, and answers that depend on a person, an order or a live number must not be cached at all.\n\nI also expire entries when the underlying documents change, so a changed policy cannot be served from the cache. And I measure the false hit rate on a labelled set of near-duplicate questions before I ship, because a cache that is wrong rarely is still wrong in front of a customer.',
        fu: [
          ['What would you cache first?', 'Embeddings of repeated texts and a repeated prefix of the prompt, which are exact and safe, before any answers.'],
          ['How do you test it?', 'Pairs of questions that look alike and need different answers, and a check that the cache never merges them.']
        ],
        trap: 'Keying the cache on the question text alone.',
        real: 'Describe a cache that you added to a model call and how you checked it for wrong hits.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Shipper', color: '#99F6E4',
        pts: [
          '**Prompts, indexes, embedding and language models, tools and limits** are all releases. Give each a **version** and log it with every answer.',
          '**Gates, cheapest first**: tests of the loop, the evaluation gate, the attack set, then a canary. A gate must be able to **fail the job**.',
          '**Pin the model.** A floating alias lets the provider release into your system.',
          'A release is **an alias move**: **one write** to go forward and **one write** to go back, with the previous index kept.',
          'Serve with a **stateless service**, state in a database, a **gateway for models**, ingestion through a **queue**, and cache keys that include the **role and the versions**.',
          '**LLMOps** is good engineering plus **new artefacts, new gates and a cost model**. Data pipelines move to the centre.'
        ],
        lines: [
          'I move an alias only after a passing evaluation.',
          'I pin the model and log the version.',
          'I write the canary rules before the canary starts.'
        ]
      })
    ]
  });
})();
