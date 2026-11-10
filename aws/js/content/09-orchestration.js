/* Mission 9: orchestration. The nightly pipeline as an Amazon States Language definition, the same pipeline as a CloudFormation resource (cfn-lint
   found nothing) and the results of asl-validator on the good definition and on three broken copies were run on one machine. The retry lab is
   arithmetic from the Step Functions documentation. Standard and Express limits, prices and Airflow facts come from documentation and the AWS SDK
   service models. Step Functions, Glue and Athena did not run on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;
  var GOOD = G.file('cfn/pipeline_good.json'), YAML = G.file('cfn/pipeline.yaml'), BAD_NEXT = G.file('cfn/pipeline_next_to_a_missing_state.json'), BAD_END = G.file('cfn/pipeline_no_end.json'), BAD_TYPE = G.file('cfn/pipeline_unknown_type.json');
  var AV = G.counts('asl.validate'), LINT = G.text('cfn.lint_good');
  G.expect(AV['pipeline_good.json'].valid === true && AV['pipeline_good.json'].errors.length === 0, 'the good definition is valid');
  G.expect(AV['pipeline_next_to_a_missing_state.json'].valid === false && AV['pipeline_next_to_a_missing_state.json'].errors.length === 2 && /MISSING_TRANSITION_TARGET/.test(AV['pipeline_next_to_a_missing_state.json'].errors[0]), 'a Next that points nowhere is reported');
  G.expect(/TERMINAL_STATE_WITH_NEXT/.test(AV['pipeline_no_end.json'].errors[0]) && /SCHEMA_VALIDATION_FAILED/.test(AV['pipeline_unknown_type.json'].errors[0]), 'the other two broken copies are reported');
  G.expect(/no findings/.test(LINT), 'cfn-lint finds nothing in the pipeline template');
  var DEF = JSON.parse(GOOD), RS = DEF.States.RunGlueJob;
  G.expect(RS.Retry[0].IntervalSeconds === 30 && RS.Retry[0].BackoffRate === 2 && RS.Retry[0].MaxAttempts === 5 && /startJobRun\.sync$/.test(RS.Resource), 'the Glue state retries 5 times from 30 seconds with a rate of 2 and waits for the job');
  var WAITS = [], TOTAL = 0;
  for (var k = 0; k < RS.Retry[0].MaxAttempts; k++) { var w = RS.Retry[0].IntervalSeconds * Math.pow(RS.Retry[0].BackoffRate, k); WAITS.push(w); TOTAL += w; }
  G.expect(WAITS.join() === '30,60,120,240,480' && TOTAL === 930, 'the waits are 30, 60, 120, 240 and 480 seconds, 930 in all');
  G.expect(DEF.States.CheckRowCount.End === true && DEF.States.Failed.Type === 'Fail' && Object.keys(DEF.States).length === 4, 'four states, ending at CheckRowCount or at Failed');

  /* the part of each definition that the bug hunt shows: the Glue state */
  function glueState(code) { return G.lines(code, G.at(code, /"RunGlueJob": \{/), G.at(code, /"Next": "CheckRowCounts?"/) + 1); }
  var BUG_CODE = glueState(BAD_NEXT), FIX_CODE = glueState(GOOD);
  G.expect(BUG_CODE.split('\n').filter(function (l, i) { return l !== FIX_CODE.split('\n')[i]; }).length === 1 && BUG_CODE.split('\n').length === FIX_CODE.split('\n').length, 'the buggy excerpt differs in one line');
  var BUG_LINE = G.at(BUG_CODE, /"Next": "CheckRowCounts"/);

  var SCHED = [
    'import json',
    'import boto3',
    '',
    'sch = boto3.client("scheduler", region_name="us-east-1")',
    '',
    'sch.create_schedule(',
    '    Name="orders-nightly",',
    '    ScheduleExpression="cron(0 2 * * ? *)",',
    '    ScheduleExpressionTimezone="America/New_York",',
    '    FlexibleTimeWindow={"Mode": "OFF"},',
    '    Target={',
    '        "Arn": "arn:aws:states:us-east-1:123456789012:stateMachine:brewline-orders-pipeline",',
    '        "RoleArn": "arn:aws:iam::123456789012:role/brewline-scheduler",',
    '        "Input": json.dumps({"scheduled_time": "<aws.scheduler.scheduled-time>"}),',
    '        "RetryPolicy": {"MaximumRetryAttempts": 3, "MaximumEventAgeInSeconds": 3600},',
    '    },',
    ')'
  ].join('\n');

  var START = [
    'import datetime',
    'import boto3',
    '',
    'sfn = boto3.client("stepfunctions", region_name="us-east-1")',
    '',
    'run_date = datetime.date(2026, 3, 14)',
    'sfn.start_execution(',
    '    stateMachineArn="arn:aws:states:us-east-1:123456789012:stateMachine:brewline-orders-pipeline",',
    '    name="orders-" + run_date.isoformat(),',
    '    input="{\\"run_date\\": \\"" + run_date.isoformat() + "\\"}",',
    ')'
  ].join('\n');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Orchestration: Step Functions, schedules and Airflow', short: 'Orchestration', blurb: 'State machines with retries and catches, schedules, Standard and Express workflows, and when to choose managed Airflow', minutes: 45,
    focus: ['air', 'mon'],
    goals: [
      'Read a **state machine** in the Amazon States Language: states, `Retry`, `Catch`, `.sync`.',
      'Compute a **retry schedule** and check that it covers the failure you expect.',
      'Choose **Standard or Express** workflows, and **Step Functions or Airflow**.',
      'Start a run on a **schedule**, and name it so that a repeat is refused.',
      'Catch a broken definition **before** you deploy it.'
    ],
    say: 'Mission 9 is the order of work. A nightly pipeline needs steps in a sequence, retries when a step is blocked for a while, and a message to a human when it cannot continue. I use the state machine of the Brewline pipeline, in JSON and as a CloudFormation resource, and the answers of a validator to three broken copies. The retry lab is arithmetic from the documentation. Nothing ran on AWS.',
    scenes: [
      B.talk({
        id: 'm9-talk', t: 1, src: 'docs', title: 'What an orchestrator does',
        say: 'A pipeline is more than a list of jobs. Press Next for the five things an orchestrator adds.',
        items: [
          ['Order and dependencies', 'Step 2 starts only after step 1 succeeded. Steps that do not depend on each other run in parallel.', 'What runs when.'],
          ['Waiting for long work', 'A Glue job takes 20 minutes. The orchestrator starts it, waits, and continues when it ends. The waiting costs nothing in a managed service.', 'Wait without a server.'],
          ['Retries and failure paths', 'A step that fails for a reason that passes by itself is tried again after a wait. A step that cannot succeed sends the run to a failure path: tell a person, clean up, stop.', 'Retry what can pass.'],
          ['History', 'Every run keeps a record of each step, its input and output and its time. When something breaks at 02:10, you open the run and see which step and why.', 'A trace of every run.'],
          ['Schedules and triggers', 'Something must start the run: a schedule, an event, or a person. The run should have a name that makes a repeat visible.', 'Who starts it, and how often.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'The nightly pipeline as a state machine', g: 'sfn', legend: true,
        steps: [
          { say: 'The pipeline has four states and two paths. Press Next to follow the run.', cap: 'Four states, two paths.' },
          { say: 'Step 1. `RunGlueJob` starts the Glue job for the day and waits until it ends. Step Functions does not move on while the job runs.', on: ['f1'], focus: ['glue', 'chk'], cap: 'Run the job and wait.' },
          { say: 'Step 2. `CheckRowCount` runs an Athena query that counts the rows of yesterday. This is the data quality check of the pipeline. The state ends the run.', on: ['f2'], focus: ['chk', 'ok'], cap: 'Check the result.' },
          { say: 'Failure path. A Catch on either state sends the run to `NotifyFailure`, which publishes a message to an SNS topic, and then to a `Fail` state, so the run is marked as failed.', on: ['f3', 'f4', 'f5'], focus: ['nt', 'fl'], cap: 'Tell someone, then fail.' },
          { say: 'The Glue state also has a retry. If the job is already running at its concurrency limit, the state waits and tries again: 30, 60, 120, 240 and 480 seconds.', tags: ['tg_retry'], focus: ['glue'], cap: 'Retry with a growing wait.' }
        ]
      }),

      B.code({
        id: 'm9-asl', t: 1, src: 'rec', title: 'The pipeline in the States Language', file: 'pipeline.json', lang: 'json', code: GOOD,
        steps: [
          { say: 'A state machine is JSON in the Amazon States Language. It passed asl-validator. The definition says where to start and lists the states.', lines: G.span(GOOD, /"Comment"/, /"StartAt"/) },
          { say: 'A `Task` state calls a service. The resource `glue:startJobRun.sync` starts the Glue job and waits for it to finish. Without `.sync` the state would finish at once, and the next state would run while the job is still going.', lines: G.span(GOOD, /"Type": "Task"/, /^      \},$/) },
          { say: '`Retry` handles errors that can pass. Glue refuses a run when the job is at its concurrency limit, so the state waits 30 seconds and tries again, doubles the wait each time, and gives up after 5 retries.', lines: G.span(GOOD, /"Retry": \[/, /^      \],$/) },
          { say: '`Catch` handles what retries could not fix. For any error, `States.ALL`, the run goes to `NotifyFailure`.', lines: G.span(GOOD, /"Catch": \[/, /^      \],$/) },
          { say: '`Next` names the state that runs when this one succeeds.', lines: G.span(GOOD, /"Next": "CheckRowCount"/) },
          { say: '`CheckRowCount` runs an Athena query and waits for it. It ends the run with `End: true`. A real pipeline adds a state that reads the count and a Choice state that fails the run when the count is too low.', lines: G.span(GOOD, /"CheckRowCount": \{/, /"End": true/) },
          { say: '`NotifyFailure` publishes to an SNS topic, and continues to `Failed`.', lines: G.span(GOOD, /"NotifyFailure": \{/, /"Next": "Failed"/) },
          { say: 'A `Fail` state ends the run and marks it failed, with an error name and a cause. The run history now shows a failure, which an alarm can watch.', lines: G.span(GOOD, /"Failed": \{/, /"Cause"/) }
        ],
        note: 'The topic ARN is a placeholder in the JSON file. The CloudFormation version on the next screen fills it with a reference.'
      }),

      B.code({
        id: 'm9-yaml', t: 2, src: 'rec', title: 'The same pipeline as a CloudFormation resource', file: 'pipeline.yaml', lang: 'yaml', code: YAML,
        steps: [
          { say: 'The state machine is a resource of a template. cfn-lint found nothing in it. Code review and deployment then work like any other infrastructure (mission 12).', lines: null },
          { say: 'The role that Step Functions assumes when it runs. This template gives it only the trust policy, so it may be assumed and may do nothing.', lines: G.span(YAML, /PipelineRole:/, /Action: sts:AssumeRole/) },
          { say: 'The topic for failure messages.', lines: G.span(YAML, /FailureTopic:/, /Type: AWS::SNS::Topic/) },
          { say: 'The state machine resource: a name, the role, and the definition inline in YAML. It is the same states as the JSON file.', lines: G.span(YAML, /OrdersPipeline:/, /StartAt/) },
          { say: '`!Ref FailureTopic` puts the real topic ARN where the JSON file had a placeholder.', lines: G.span(YAML, /TopicArn: !Ref/) }
        ],
        note: 'cfn-lint checks the template, not whether the role can do the work. This role has no permission to start a Glue job, run an Athena query or publish to SNS, so the first run would fail with an access error. Give the role a least-privilege policy for exactly those three actions (mission 3).'
      }),

      B.cmp({
        id: 'm9-validate', t: 1, src: 'rec', title: 'Catching a broken definition before you deploy',
        say: 'asl-validator checks a definition on your machine, with no AWS account. I changed one thing at a time in the good file and kept what the validator said. Press Next to read the results.',
        cols: ['File', 'What I changed', 'What the validator said'],
        hl: 2,
        rows: [
          ['pipeline_good.json', 'Nothing', 'valid, no errors'],
          ['pipeline_next_to_a_missing_state.json', '`Next` is `CheckRowCounts`, with an extra s', AV['pipeline_next_to_a_missing_state.json'].errors.map(function (e) { return e.replace(/^MISSING_TRANSITION_TARGET: /, 'MISSING_TRANSITION_TARGET: '); }).join(' and ')],
          ['pipeline_no_end.json', 'The `CheckRowCount` state has neither `End` nor `Next`', AV['pipeline_no_end.json'].errors[0]],
          ['pipeline_unknown_type.json', 'The `Failed` state has the type `Failure` instead of `Fail`', AV['pipeline_unknown_type.json'].errors[0]]
        ],
        steps: [
          { upto: 1, say: 'The good definition has no findings.' },
          { upto: 2, say: 'A typo in a state name. The validator reports the missing target, and that the real state can no longer be reached.' },
          { upto: 4, say: 'A state that does not say what comes next, and a state type that does not exist. Both are found without a deploy.' }
        ],
        pick: 'Run the validator in your **pull request checks** (mission 12). A typo in a state name is found in seconds, and not at 02:00 on the first run.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, src: 'rec', q: 'The validator reports that a state cannot be reached, and the first state points nowhere. Click the line that causes it.',
        file: 'pipeline_bug.json', lang: 'json', code: BUG_CODE, bad: [BUG_LINE],
        hint: 'Compare the name in `Next` with the name of the state it should reach.',
        why: 'The next state is called `CheckRowCount`, and `Next` says `CheckRowCounts`. No state has that name, so the validator reported `MISSING_TRANSITION_TARGET` twice: once for the unreachable state and once for the missing target. A deploy would fail, or worse, a typo in a rarely used branch would surface in production.',
        fix: FIX_CODE,
        cheer: 'Names in Next must match exactly.'
      }),

      B.cmp({
        id: 'm9-types', t: 1, src: 'docs', title: 'The state types',
        say: 'Eight state types make every workflow. Press Next to read them.',
        cols: ['State', 'What it does', 'Typical use in a data pipeline'],
        hl: 2,
        rows: [
          ['Task', 'Calls a service or a function.', 'Start a Glue job, run an Athena query, invoke Lambda, publish to SNS.'],
          ['Choice', 'Branches on a value.', 'Fail the run when the row count is below a minimum.'],
          ['Wait', 'Waits for a time or until a date.', 'Wait for a partner file for 10 minutes before the next check.'],
          ['Parallel', 'Runs branches at the same time.', 'Load orders and customers together.'],
          ['Map', 'Runs the same steps for each item of a list.', 'Process each file of a day. Distributed Map can read the list from S3 and run thousands of items.'],
          ['Pass', 'Passes or reshapes data.', 'Build the input of the next state.'],
          ['Succeed', 'Ends the run as a success.', 'The end of a branch.'],
          ['Fail', 'Ends the run as a failure, with an error and a cause.', 'After the notification of a failure.']
        ],
        steps: [
          { upto: 3, say: 'Doing work, deciding and waiting.' },
          { upto: 5, say: 'Parallel and repeated work.' },
          { upto: 8, say: 'Shaping data and ending the run.' }
        ],
        pick: 'Keep the state machine about **order and decisions**. The heavy work belongs to Glue, Athena or Lambda, which the Task states call.'
      }),

      B.cmp({
        id: 'm9-integ', t: 1, src: 'docs', title: 'Three ways a Task calls a service',
        say: 'The end of the resource name decides whether Step Functions waits. Press Next to read the three patterns.',
        cols: ['Pattern', 'Resource name', 'What happens', 'Example'],
        hl: 2,
        rows: [
          ['Request and response', 'arn:aws:states:::sns:publish', 'Calls the service, takes the answer, moves on at once.', 'Publish a message, invoke a Lambda function.'],
          ['Run a job', 'arn:aws:states:::glue:startJobRun.sync', 'Starts the job and waits until it ends. The state succeeds or fails with the job.', 'A Glue job, an Athena query, an EMR step.'],
          ['Wait for a callback', 'arn:aws:states:::sqs:sendMessage.waitForTaskToken', 'Sends a task token and waits until something calls back with it.', 'A manual approval, or a job outside AWS.']
        ],
        steps: [
          { upto: 1, say: 'The state moves on as soon as the call returns.' },
          { upto: 2, say: '`.sync` is what makes a pipeline wait for real work. Without it, the next state runs while the job is still going.' },
          { upto: 3, say: 'A callback waits for something to call back with a token. Set a timeout, so a lost callback cannot hang the run forever.' }
        ],
        pick: 'Use **`.sync`** for jobs and queries, and a **timeout** on every state that waits. A run that waits for ever is a failure you find on Monday.'
      }),

      B.widget({ id: 'm9-lab', kind: 'retry', t: 1, src: 'docs', title: 'Lab: a retry schedule' }),

      B.cmp({
        id: 'm9-errors', t: 2, src: 'docs', title: 'Retry and Catch',
        say: 'Failures come in two kinds. Press Next to see which block handles which.',
        cols: ['Question', 'Retry', 'Catch'],
        hl: 1,
        rows: [
          ['What is it for?', 'An error that can pass by itself: a concurrency limit, a throttle, a short outage.', 'An error that will not pass: bad input, a missing permission, a failed job.'],
          ['What does it do?', 'Waits, then runs the same state again.', 'Sends the run to another state, with the error as input.'],
          ['How is it written?', '`ErrorEquals`, `IntervalSeconds`, `BackoffRate`, `MaxAttempts`, and optionally `MaxDelaySeconds` and `JitterStrategy`.', '`ErrorEquals`, `Next`, and optionally `ResultPath` to keep the original input next to the error.'],
          ['Which errors?', 'Names such as `States.TaskFailed`, `States.Timeout`, or a service error such as `Glue.ConcurrentRunsExceededException`. `States.ALL` matches every error.', 'The same names. Put `States.ALL` last.'],
          ['Order', 'Retries run first. When they are used up, a matching Catch takes over.', 'A Catch only sees an error that the retries did not cure.']
        ],
        steps: [
          { upto: 2, say: 'Retry waits and repeats. Catch moves to a failure path.' },
          { upto: 4, say: 'The error names and how to write the blocks.' },
          { upto: 5, say: 'Retries come first, and the Catch is the last resort.' }
        ],
        pick: 'Retry only **errors that can pass**. A bad parameter fails the same way every time, so send it straight to a **Catch**. Add **jitter** when many runs may retry at the same moment.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1, src: 'rec',
        q: 'In the recorded pipeline the Glue state has `IntervalSeconds` 30, `BackoffRate` 2 and `MaxAttempts` 5. How long does it keep retrying at most?',
        opts: [
          { t: '150 seconds, which is 5 times 30', fb: 'The wait grows with every retry. It is not 30 seconds each time.' },
          { t: '930 seconds, which is 15 minutes and 30 seconds', fb: '' },
          { t: '480 seconds', fb: 'That is the last wait only. Add all five.' },
          { t: '1,920 seconds', fb: 'That adds a sixth wait of 960 seconds. There are only 5 retries.' }
        ],
        ok: 1, why: 'The waits are 30, 60, 120, 240 and 480 seconds, so 930 seconds in all. A Glue slot that frees up within 15 minutes is covered. The common default of 5 seconds, a rate of 2 and 3 attempts waits only 35 seconds.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1, src: 'docs',
        q: 'A state machine starts a Glue job with `glue:startJobRun` and no `.sync`. The job takes 20 minutes and fails after 15. What does the state machine report?',
        opts: [
          { t: 'A failure after 15 minutes', fb: 'Without .sync the state does not wait for the job, so it cannot see the failure.' },
          { t: 'Success in a few seconds, and the next state runs while the job still works', fb: '' },
          { t: 'A timeout after 20 minutes', fb: 'There is no wait, so no timeout is reached.' },
          { t: 'The job is cancelled by Step Functions', fb: 'Step Functions only calls StartJobRun. It does not manage the job afterwards.' }
        ],
        ok: 1, why: 'The call returns as soon as Glue has accepted the run. The state succeeds, and the next state, for example the row-count check, runs on data that is not there yet. Use `glue:startJobRun.sync` to wait for the end of the job and to fail with it.'
      }),

      B.quiz({
        id: 'm9-q3', t: 2, src: 'docs',
        q: 'A Glue state fails because a job parameter has the wrong name. What should the state machine do?',
        opts: [
          { t: 'Retry 5 times with a growing wait', fb: 'The parameter will be wrong on every attempt. The retries only delay the notification.' },
          { t: 'Go to a Catch, notify a person, and fail the run', fb: '' },
          { t: 'Ignore the error and continue', fb: 'The next state would run on missing data.' },
          { t: 'Retry forever', fb: 'It never succeeds and holds a run open.' }
        ],
        ok: 1, why: 'A wrong parameter is not an error that passes by itself. Retry only handles errors that can pass, such as a concurrency limit. Everything else goes to a Catch with a clear message.'
      }),

      B.cmp({
        id: 'm9-stdexp', t: 2, src: 'docs', title: 'Standard or Express workflows',
        say: 'Step Functions has two workflow types, and you cannot change the type of a state machine after you create it. Press Next to compare them.',
        cols: ['Question', 'Standard', 'Express'],
        hl: 1,
        rows: [
          ['How long can a run last?', 'Up to a year.', 'Up to 5 minutes.'],
          ['What are the delivery guarantees?', 'Each state runs once, unless you set a retry. The history is kept.', 'At least once. A state can run again.'],
          ['How is it billed?', 'Per state transition, about $0.025 for 1,000 in the US East example.', 'Per request and for the duration and memory used.'],
          ['Good for', 'Batch pipelines, human approval, long jobs, anything you want to audit step by step.', 'High-volume, short event processing, such as one run for each file or message.'],
          ['What about the history?', 'A step-by-step history of every run in the console.', 'Logs, which you must switch on.']
        ],
        steps: [
          { upto: 2, say: 'Duration and delivery.' },
          { upto: 5, say: 'Price and fit. A nightly pipeline of ten transitions costs a fraction of a cent on Standard.' }
        ],
        pick: 'Use **Standard** for pipelines. Use **Express** for short, high-volume event work, where a run lasts seconds and a per-transition price would add up.'
      }),

      B.quiz({
        id: 'm9-q4', t: 2, src: 'docs',
        q: 'The nightly pipeline runs for about 40 minutes with a Glue job that waits. Which workflow type do you create?',
        opts: [
          { t: 'Express, because it is cheaper', fb: 'Express runs for at most 5 minutes. A 40 minute run does not fit.' },
          { t: 'Standard', fb: '' },
          { t: 'Either. You can change the type later', fb: 'The type of a state machine cannot be changed after it is created.' },
          { t: 'Neither. Step Functions cannot wait for a job', fb: '`.sync` integrations wait for a job to end.' }
        ],
        ok: 1, why: 'A run longer than 5 minutes needs Standard, which allows a run of up to a year. For ten transitions a night, the price is a fraction of a cent a month.'
      }),

      B.talk({
        id: 'm9-map', t: 2, src: 'docs', title: 'The Map state and big lists',
        say: 'Sometimes a pipeline must run the same steps for many items. Press Next for how Map does it.',
        items: [
          ['Inline Map', 'Takes a list from the input and runs the same steps for each item, with a limit on how many run at once. Good for a few dozen items.', 'A list in the input.'],
          ['Distributed Map', 'Reads the list from S3 itself, for example every object under a prefix or every row of a CSV file, and runs child workflows for each batch, up to a high concurrency. Good for thousands of files.', 'A list in S3.'],
          ['Control the load', 'Set a maximum concurrency, so the services behind the Map are not overwhelmed. Set a tolerated failure percentage, so a few bad files do not fail the whole run.', 'Limit the pressure.'],
          ['When to use Glue instead', 'If the work for each item is a Spark transformation, a Glue job that reads the whole prefix is cheaper and simpler than thousands of small tasks. Map fits when each item needs a different decision or a call to a service.', 'Many items, small work.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm9-start', t: 2, src: 'docs', title: 'Start a run, and name it', file: 'start_run.py', lang: 'python', code: START,
        steps: [
          { say: 'The run date is an input of the pipeline. A re-run for an earlier day passes that day.', lines: G.span(START, /^run_date/) },
          { say: 'For Standard workflows, the name of an execution must be unique for the state machine. A name made from the run date means that a second start for the same day is refused instead of running twice. You can reuse a name 90 days after the first run closes.', lines: G.span(START, /name="orders-"/) },
          { say: 'The input is JSON text. The state machine reads `$.run_date` and passes it to the Glue job and to the Athena query.', lines: G.span(START, /input=/) }
        ],
        note: 'The call follows the AWS SDK service model, which I used to check the parameter names. It did not run on AWS. A refused duplicate start is a feature: it protects a load that is not safe to repeat.'
      }),

      B.code({
        id: 'm9-sched', t: 2, src: 'docs', title: 'EventBridge Scheduler starts the pipeline', file: 'schedule.py', lang: 'python', code: SCHED,
        steps: [
          { say: 'EventBridge Scheduler is a service for schedules. It can start a state machine directly, with no Lambda in between.', lines: G.span(SCHED, /sch\.create_schedule/, /Name=/) },
          { say: 'A cron expression, and a time zone. 02:00 in New York means a different UTC time in summer and winter, and the schedule follows the time zone for you.', lines: G.span(SCHED, /ScheduleExpression="cron/, /ScheduleExpressionTimezone/) },
          { say: 'A flexible time window of `OFF` starts the run at the exact time. `FLEXIBLE` spreads starts over a window, which suits many schedules at the same time.', lines: G.span(SCHED, /FlexibleTimeWindow/) },
          { say: 'The target is the state machine itself: for Step Functions, its ARN is enough. The role must be allowed to call `states:StartExecution` on it. The input becomes the input of the run, and the scheduler replaces `<aws.scheduler.scheduled-time>` with the time of the schedule.', lines: G.span(SCHED, /Target=\{/, /"Input"/) },
          { say: 'If the start fails, the scheduler retries, here up to 3 times within an hour.', lines: G.span(SCHED, /"RetryPolicy"/) }
        ],
        note: 'I checked the parameter names and the allowed values against the AWS SDK service model. The call did not run on AWS.'
      }),

      B.talk({
        id: 'm9-airflow', t: 1, src: 'docs', title: 'Managed Airflow (MWAA)',
        say: 'Apache Airflow is the other common orchestrator. Press Next for what AWS runs for you.',
        items: [
          ['What Airflow is', 'Workflows are Python files called DAGs: tasks and their dependencies. A scheduler starts runs, workers execute tasks, and a web UI shows runs, logs and retries. It has a large library of integrations, with operators for Glue, Athena, Redshift and EMR.', 'Python DAGs and a rich UI.'],
          ['What MWAA runs', 'Amazon Managed Workflows for Apache Airflow runs the scheduler, the workers and the web server in an environment. DAG files, plugins and a requirements file live in an S3 bucket. You choose an environment class, from mw1.micro to mw1.2xlarge, and the number of workers.', 'Airflow without the servers.'],
          ['What it costs', 'An environment is billed by the hour, whether or not a DAG runs. The small class costs about $0.49 an hour in the US East example, which is about $358 for a 730 hour month, plus workers and storage.', 'Always on, always billed.'],
          ['When it fits', 'The team already writes Airflow DAGs, needs dynamic DAGs built from Python, backfills over date ranges, many dependencies between hundreds of tasks, or tasks outside AWS. It also keeps you portable to other clouds.', 'Airflow skills and big DAG graphs.'],
          ['The next tutorial', 'Airflow itself has a mission in its own tutorial later in this library. Here you only need to know where it fits next to Step Functions.', 'Details come later.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm9-which', t: 1, src: 'docs', title: 'Step Functions, Airflow or something simpler',
        say: 'Several tools can order the work of a pipeline. Press Next to match the need to the tool.',
        cols: ['You need', 'Use', 'Because'],
        hl: 1,
        rows: [
          ['A few AWS steps in order, with retries, no servers, billed by use', 'Step Functions', 'Built-in service integrations, a visual history, and a price of cents.'],
          ['Hundreds of tasks, Python DAGs, backfills, a team that knows Airflow', 'MWAA', 'The Airflow model and tooling, managed. Billed all day.'],
          ['A chain of Glue jobs and crawlers only', 'Glue workflows and triggers', 'Built into Glue. Little else is needed.'],
          ['Start one job at a set time', 'EventBridge Scheduler', 'A schedule, a target and a retry. Nothing to run.'],
          ['One query every night', 'A scheduled Athena query or a Lambda', 'An orchestrator would be more than the job needs.']
        ],
        steps: [
          { upto: 2, say: 'Steps in AWS, or a big Airflow estate.' },
          { upto: 5, say: 'Smaller needs get smaller tools.' }
        ],
        pick: 'Start with **EventBridge Scheduler and Step Functions**. Choose **MWAA** for a reason: Airflow skills, DAGs that Python builds, or very many tasks. Do not run an Airflow environment for three jobs.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the steps of the nightly orders pipeline in order.',
        items: [
          'A schedule starts the state machine with a run name made from the date',
          'The Glue job runs, and the state waits for it to end',
          'If Glue is at its concurrency limit, the state waits and tries again',
          'An Athena query counts yesterday rows, and the state waits for the result',
          'A check fails the run when the count is below the minimum',
          'On any failure, a message goes to the team and the run is marked failed'
        ],
        why: 'The schedule starts a uniquely named run. The job comes first, with retries for a blocked slot. The data check comes after the data exists. Failures go to people and are visible in the run history.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: how do you orchestrate Brewline pipelines?',
        scenario: 'Brewline has **6 pipelines**, each with 5 to 10 steps: Glue jobs, Athena queries, a Redshift load and notifications. They run **nightly** or **hourly**. The two engineers know **Python** and have **never run Airflow**. The data platform budget is **tight**.',
        opts: [
          { t: 'Step Functions for each pipeline, started by EventBridge Scheduler', d: 'Serverless. About a cent a month in transitions for the nightly ones. Built-in Glue, Athena and Redshift Data API steps.' },
          { t: 'An MWAA environment with a DAG for each pipeline', d: 'The Airflow model, and Python DAGs.', lose: 'About $358 a month for the small class before workers, billed whether or not DAGs run, and a new tool for two engineers to learn, for six simple pipelines.' },
          { t: 'Cron on one small EC2 instance that runs scripts', d: 'Cheap and familiar.', lose: 'No retries with history, no failure paths, no visible runs, and one instance that is a single point of failure. Someone has to patch and watch it.' }
        ],
        pick: 0,
        why: 'The pipelines are short and in AWS, and the team is small. Step Functions has the retries, the failure paths and the history, and it bills by use. The price is a cent a month against $358 for an always-on Airflow environment.',
        when: 'Choose MWAA when the number of tasks grows to hundreds, when DAGs are generated from Python, when the team already works in Airflow, or when tasks must run outside AWS. The two can also work together: Airflow can start a state machine for the AWS part.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'docs', title: 'Incident: the nightly run failed on a concurrency error', time: '02:12',
        alert: '**The nightly orders pipeline failed at 02:12 and the on-call message says Glue.ConcurrentRunsExceededException.** The Glue job `orders-to-parquet` allows one concurrent run. The 01:50 backfill run is still going, and it ends around 02:00 to 02:10. The state machine has a retry of 5 seconds, a rate of 2 and 3 attempts.',
        clues: ['The error is a limit on concurrent runs, which passes when the backfill ends', 'The retry waits 5, 10 and 20 seconds, 35 seconds in all', 'The backfill was started by hand and has run for 20 minutes'],
        opts: [
          { t: 'Lengthen the retry so that it covers a blocked slot, for example 30 seconds, a rate of 2 and 5 attempts, which waits 15 minutes and 30 seconds', fb: '' },
          { t: 'Remove the Retry block and rely on the Catch', fb: 'The Catch would notify at once for an error that passes by itself. That is the wrong way round.' },
          { t: 'Raise the job concurrency to 10 so that runs never collide', fb: 'Two runs of this job would write the same partitions at the same time. The limit protects the data (mission 4).' },
          { t: 'Restart the pipeline by hand every night at 03:00', fb: 'It replaces a retry block with a person. It fixes nothing in the design.' }
        ],
        best: 0,
        why: 'A concurrency limit passes when the other run ends, which can take minutes. A retry of 35 seconds in all gave up too early, and the Catch notified the team. A schedule of 30, 60, 120, 240 and 480 seconds covers 15 minutes and 30 seconds, as the recorded definition does. The limit itself should stay at 1, because two runs of the same job would collide.',
        checks: [
          ['Read the error', '`Glue.ConcurrentRunsExceededException` is a limit, which passes by itself.'],
          ['Read the retry', '5, 10 and 20 seconds is 35 seconds in all.'],
          ['Find the blocker', 'The backfill run started by hand is still working.'],
          ['Change the schedule', 'Retry at 30 seconds, rate 2, 5 attempts, which waits 930 seconds.'],
          ['Prevent it', 'Start backfills through the same state machine, so that they follow the same rules and the same names.']
        ],
        tell: 'The nightly run failed because the Glue job allows one concurrent run, and a backfill that I had started by hand was still going. The state machine retried only for 35 seconds in total, then fell through to the failure path. I changed the retry to 30 seconds with a rate of 2 and 5 attempts, which waits up to 15 minutes and 30 seconds, and the run now waits for the slot. We keep the job at one concurrent run so two runs cannot write the same partitions, and we start backfills through the state machine, with the run date in the name.',
        prevent: ['Make the **retry window longer than the longest expected block**', 'Keep the **concurrency limit** where it protects the data', 'Start **backfills through the same state machine**', 'Name runs by **run date**, so a duplicate start is refused']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, src: 'docs', title: 'Incident: the pipeline says success and the table is empty', time: '07:55',
        alert: '**The pipeline run finished in 6 seconds and shows a success.** The dashboard for yesterday is empty. The Glue job ran for 18 minutes after that and then failed on a missing permission. Last week someone replaced `glue:startJobRun.sync` with `glue:startJobRun` in the definition.',
        clues: ['The state machine history shows each state with a duration of one or two seconds', 'The Glue run history shows a failed run that began at the same time', 'The row-count state returned zero and nothing checked it'],
        opts: [
          { t: 'Restore `.sync` so that the state waits for the job, and add a state that fails the run when the count is zero', fb: '' },
          { t: 'Add a Wait state of 20 minutes after the Glue state', fb: 'It guesses how long the job takes. The next slow day breaks it, and a failed job is still reported as a success.' },
          { t: 'Retry the Glue state when the table is empty', fb: 'The state succeeded. Nothing triggers a retry, and the job failure is invisible to it.' },
          { t: 'Alert when the run takes less than a minute', fb: 'A useful extra alarm. It does not repair the definition that hides the job failure.' }
        ],
        best: 0,
        why: 'Without `.sync` the state ends as soon as Glue accepts the run, so Step Functions never sees the job fail, and the row-count query ran before any data existed. With `.sync` the state waits and fails with the job, and the Catch tells the team. A final check that fails the run on a zero count catches the same class of error from any cause.',
        checks: [
          ['Compare the durations', 'Seconds in Step Functions, 18 minutes in Glue. The state did not wait.'],
          ['Read the definition', 'The Glue resource has no `.sync`.'],
          ['Check the count', 'The count returned zero and nothing checked it.'],
          ['Fix the definition', 'Use `glue:startJobRun.sync`, and add a Choice that fails the run below a minimum count.'],
          ['Prevent it', 'Review definitions in pull requests, and alert on runs that are shorter than the usual time.']
        ],
        tell: 'The pipeline reported a success after 6 seconds while the table was empty. Someone had changed the Glue state from startJobRun.sync to startJobRun, so Step Functions no longer waited for the job, and the row-count query ran before any data existed. The Glue job then failed on a missing permission, and the run history never showed it. I restored the sync integration, added a Choice state that fails the run when the count is below a minimum, and fixed the permission. Definitions now go through review, and we alarm on runs that are much shorter than usual.',
        prevent: ['Use **`.sync`** for every job and query', 'Add a **row-count gate** that fails the run', 'Review **definition changes** like code', 'Alarm on **runs that end much faster than usual**']
      }),

      B.qa({
        id: 'qa-sfn', t: 1, tag: 'Orchestration', secs: 60,
        q: 'What is AWS Step Functions, and how would you use it for a data pipeline?',
        pts: ['State machines in the Amazon States Language', 'Task states call Glue, Athena, Lambda, SNS and more', '.sync waits for a job to finish', 'Retry for errors that pass, Catch for the rest', 'Standard for pipelines, Express for short high-volume work', 'A run history for every execution'],
        short: 'Step Functions runs state machines written in the Amazon States Language. Task states call AWS services directly: start a Glue job, run an Athena query, invoke Lambda, publish to SNS.\n\nFor the nightly pipeline I use Standard workflows. A Glue state with `.sync` starts the job and waits until it ends, so the next state runs on real data. A Retry block handles errors that pass, for example a concurrency limit, with a growing wait. A Catch sends other failures to a notification and a Fail state, so the run shows as failed. After the load, an Athena query counts the rows and a Choice state fails the run when the count is too low.\n\nEvery run keeps a history of each step with its input, output and time, so I can open a failed run at 02:00 and see the step. I name each run by its date, so a duplicate start is refused, and EventBridge Scheduler starts it at a set time.\n\nA nightly run costs a fraction of a cent.',
        fu: [
          ['What does .sync do?', 'It starts the job and waits for it to end, then succeeds or fails with it. Without it the state ends as soon as the service accepts the call.'],
          ['When would you use Express?', 'For short runs of up to five minutes at a high volume, such as processing each file or message, where a per-transition price would add up.']
        ],
        trap: 'Describing Step Functions as a scheduler. It orders and retries work, and something else starts it.',
        real: 'Describe a pipeline you built as a state machine, and the failure it handled.'
      }),

      B.qa({
        id: 'qa-retry', t: 1, tag: 'Orchestration', secs: 90,
        q: 'How do you handle failures in an orchestrated pipeline: retries, catches and alerts?',
        pts: ['Retry only errors that can pass by themselves', 'Exponential backoff, a maximum delay and jitter', 'A retry window longer than the longest expected block', 'Catch the rest, notify and fail the run', 'Timeouts on every waiting state', 'Alarm on failed runs and on runs that are too short'],
        short: 'I separate errors that pass from errors that do not. A concurrency limit, a throttle or a short outage passes, so the state retries with a growing wait. A wrong parameter or a missing permission does not, so it goes straight to a Catch.\n\nFor the retry I choose the numbers against the failure. A Glue job at its concurrency limit can take 10 minutes to free a slot, so 30 seconds, a rate of 2 and 5 attempts, which waits 930 seconds, covers it, and the common default of 35 seconds does not. A maximum delay caps the wait, and jitter keeps many runs from retrying together.\n\nThe Catch notifies a person through SNS and ends in a Fail state, so the run is marked as failed. Every waiting state has a timeout, so a lost callback cannot hang a run.\n\nI alarm on failed runs, and on runs that finish much faster than usual, which can mean that a step did not wait.',
        fu: [
          ['What is jitter?', 'A random part of the wait, so that many runs that failed together do not retry at the same moment.'],
          ['Where do retries stop?', 'When the maximum attempts are used up. Then a matching Catch takes over, or the run fails.']
        ],
        trap: 'Retrying everything. A retry on a bad parameter only delays the alert.',
        real: 'Describe a retry setting that you changed after a real failure.'
      }),

      B.qa({
        id: 'qa-orchchoose', t: 2, tag: 'Orchestration', secs: 90,
        q: 'Step Functions or Airflow: how do you choose?',
        pts: ['Step Functions: serverless, AWS-native, billed by use, history', 'Airflow (MWAA): Python DAGs, backfills, big graphs, portable', 'MWAA is billed by the hour, always', 'Team skills and the number of tasks decide', 'They can work together', 'Do not run Airflow for a handful of jobs'],
        short: 'I choose by the size of the estate and the skills of the team.\n\nStep Functions is serverless and AWS-native. It has built-in integrations with Glue, Athena, Redshift and Lambda, retries and failure paths, and a history of every run. It bills per state transition, so a nightly pipeline costs a fraction of a cent.\n\nAirflow, on AWS as MWAA, fits when the team already writes DAGs in Python, when DAGs are generated from code, when there are hundreds of tasks with many dependencies, when I need backfills over date ranges, or when tasks run outside AWS. An environment bills by the hour, about $0.49 for the small class, around $358 a month, whether or not anything runs.\n\nFor six pipelines of ten steps and a team that has never run Airflow, I use Step Functions with EventBridge Scheduler. The two can also work together, with Airflow starting a state machine for the AWS part.',
        fu: [
          ['What does Airflow do better?', 'Dynamic DAGs built from Python, backfills over date ranges, a large library of operators, and a UI for runs and retries across hundreds of tasks.'],
          ['What does Step Functions do better?', 'Nothing to run, a price per use, direct calls to many AWS services, and tight IAM integration.']
        ],
        trap: 'Choosing Airflow because it is popular. At a small size it costs more and does less than a state machine.',
        real: 'Describe an orchestrator decision you made and the cost numbers.'
      }),

      B.qa({
        id: 'qa-rerun', t: 2, tag: 'Orchestration', secs: 90,
        q: 'How do you re-run or backfill a pipeline safely?',
        pts: ['The run takes a date as input', 'Each step is safe to repeat', 'Name runs by date, so a duplicate start is refused', 'A backfill goes through the same state machine', 'Limit the concurrency of backfills', 'Check counts after the re-run'],
        short: 'The pipeline takes the run date as input, so a re-run for an earlier day is the same pipeline with another date. For that to be safe, every step must give the same result when it runs again: a load overwrites the partition of that date, or merges on a key, and does not append.\n\nI name each run after its date. For Standard workflows an execution name is unique, so a second start for the same date is refused, which protects a load that is not safe to repeat. For a deliberate re-run I use a new name with a suffix, after I have checked that the steps allow it.\n\nA backfill goes through the same state machine, not through a separate script, so it follows the same retries, alerts and history. I limit how many dates run at once, so the backfill does not collide with the nightly run on the job concurrency limit, and I run the days in order when later days depend on earlier ones.\n\nAfter the re-run I compare row counts with the source.',
        fu: [
          ['What if two runs for the same date overlap?', 'The name makes the second start fail. The job concurrency limit and a conditional write protect the data when a name is not enough.'],
          ['How do you backfill 90 days?', 'A Map state over the dates with a low maximum concurrency, or a script that starts one run for each day with a delay.']
        ],
        trap: 'Backfilling with a separate script outside the orchestrator. It skips the retries, the alerts and the history.',
        real: 'Describe a backfill you ran, and how you checked that it was right.'
      }),

      B.qa({
        id: 'qa-design', t: 2, tag: 'Orchestration', secs: 90,
        q: 'Design the nightly orders pipeline from end to end. What do you build?',
        pts: ['A schedule starts a state machine with the run date', 'Wait for the source data to be complete', 'A Glue job with .sync, retries and a concurrency limit', 'A data quality gate that can fail the run', 'Publish only after the gate passes', 'Alarms, a run history and a runbook'],
        short: 'A schedule in EventBridge Scheduler starts a Standard state machine at 02:00, with a name made from the run date.\n\nThe first state checks that the source data for the day is complete, for example that the partner file is in S3 and the DMS latency is low, and waits or fails if not. A Glue job loads and cleans the data, started with `.sync`, with a retry for a concurrency limit and a limit of one concurrent run so that two runs cannot write the same partitions.\n\nAn Athena query counts the rows of the day and compares them with the source and with a minimum. A Choice state fails the run when the check does not pass. Only after it passes, the pipeline publishes: it refreshes the Redshift table or updates the partition in the catalog.\n\nAny failure goes to a Catch that notifies the team through SNS and ends the run as failed. I alarm on failed runs and on runs that are much faster or slower than usual. A short runbook says how to re-run a date.',
        fu: [
          ['How do you stop bad data reaching the dashboards?', 'Publish after the quality gate, not before. Write to a staging location and switch the partition or the table only when the checks pass.'],
          ['How do you handle a late file?', 'A Wait state with a limit and a check, and a failure with a clear message if the file does not arrive.']
        ],
        trap: 'Listing services without the checks. A pipeline that cannot fail on bad data is not finished.',
        real: 'Describe a pipeline you owned, its checks and the last time it failed.'
      }),

      B.qa({
        id: 'qa-dmap', t: 3, tag: 'Orchestration', secs: 90,
        q: 'How would you process 5,000 files a day with Step Functions?',
        pts: ['Distributed Map reads the list of objects from S3', 'Child workflows run in parallel with a maximum concurrency', 'Tolerated failure percentage', 'Each item must be safe to repeat', 'Consider a Glue job that reads the whole prefix', 'Results go to S3 and a summary state reads them'],
        short: 'A Distributed Map state can read the list of objects under a prefix straight from S3, and run a child workflow for each batch of items, with a maximum concurrency that I set to protect the services behind it. I set a tolerated failure percentage, so a few bad files do not fail the whole run, and I collect the failures in a result file for a person to read.\n\nEach item must be safe to repeat, because Map can retry. The child workflow writes with a name made from the file, or merges on a key.\n\nBefore I choose it, I ask whether Map is the right tool. If the work for each file is a Spark transformation, a Glue job that reads the whole prefix is cheaper and simpler than thousands of small tasks. Map fits when each file needs a different decision, a call to a service, or a separate failure path.\n\nI check the cost: a transition price for each child workflow, so 5,000 items of five states is 25,000 transitions, about 60 cents a day on Standard.',
        fu: [
          ['What is the difference between inline Map and Distributed Map?', 'Inline Map takes its list from the input and runs inside the parent execution, for a few dozen items. Distributed Map reads from S3 and runs child executions at high scale.'],
          ['What do you do about the failures?', 'A tolerated failure percentage, a result file that lists failed items, and a way to re-run only those.']
        ],
        trap: 'Using Map for work that one Spark job does better.',
        real: 'Describe a fan-out job you built and its concurrency limit.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Flow Builder', color: '#A7F3D0',
        pts: [
          'A **state machine** is JSON: `Task`, `Choice`, `Wait`, `Parallel`, `Map`, `Pass`, `Succeed`, `Fail`. Validate it **before** you deploy: the recorded validator found a typo in `Next` and an unknown type.',
          '`glue:startJobRun.sync` **waits** for the job. Without `.sync` the state ends at once and the next one runs on missing data.',
          '**Retry** handles errors that pass. The recorded schedule waits 30, 60, 120, 240 and 480 seconds, **930** in all. **Catch** handles the rest.',
          'Use **Standard** workflows for pipelines, up to a year. **Express** runs for at most 5 minutes.',
          'Name a Standard run after its **date**: a duplicate start is refused. EventBridge Scheduler starts it at a set time.',
          '**MWAA** bills by the hour, about $358 a month for the small class. Choose it for **Airflow skills and big DAGs**.'
        ],
        lines: [
          'I wait for the job and check the count.',
          'I retry what passes and catch the rest.',
          'I validate the definition before I deploy.'
        ]
      })
    ]
  });
})();
