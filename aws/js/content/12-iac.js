/* Mission 12: infrastructure as code and delivery. The Brewline lake template, the broken copy with five injected mistakes and what cfn-lint said about both,
   and the pytest files with their moto fixture (three tests pass, and the same tests fail on a handler with a missing decode) were run on one machine.
   The workflow file and the CLI commands were checked by the verifier (YAML parsed, flags read from the CLI help). Change sets, drift,
   rollbacks, CDK, Terraform and delivery practice come from documentation. Nothing here ran on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;
  var Y = G.file('cfn/lake.yaml'), BAD = G.file('cfn/lake_bug.yaml'), LINT = G.counts('cfn.lint'), TS = G.counts('test.summary');
  var LG = G.text('cfn.lint_good'), LB = G.text('cfn.lint_bug'), CONF = G.file('lambda/conftest.py'), TEST = G.file('lambda/test_handler.py');
  var RULES = LINT.findings.map(function (f) { return f.rule; });
  G.expect(LINT.good_rc === 0 && LINT.bug_rc === 2 && LINT.findings.length === 5 && RULES.join() === 'E3002,E3030,E1010,E3003,E3012', 'cfn-lint finds nothing in the good template and five problems in the broken one');
  G.expect(/no findings/.test(LG) && /E3002/.test(LB) && /E3012/.test(LB), 'the recorded cfn-lint text');
  G.expect(TS.passed === 3 && TS.pass_rc === 0 && TS.fail_rc === 1 && TS.failed_with_bug === true, 'three tests pass, and the same tests fail on the buggy handler');
  var FINDING = {}; LINT.findings.forEach(function (f) { FINDING[f.rule] = f; });

  function slice(code, a, b) { var s = G.span(code, a, b); return G.lines(code, s[0], s[1]); }
  var ENC_BUG = slice(BAD, /BucketEncryption:/, /BucketKeyEnabled/), ENC_FIX = slice(Y, /BucketEncryption:/, /BucketKeyEnabled/);
  G.expect(ENC_BUG.split('\n').length === ENC_FIX.split('\n').length && ENC_BUG.split('\n').filter(function (l, i) { return l !== ENC_FIX.split('\n')[i]; }).length === 1, 'the encryption excerpt differs in one line');
  var ENC_LINE = G.at(ENC_BUG, /SSEAlgorithm: aws:kmss/);
  var POL_BUG = slice(BAD, /Policies:/, /Resource: !GetAtt LakeBucket\.Arnn/), POL_FIX = slice(Y, /Policies:/, /Resource: !GetAtt LakeBucket\.Arn$/m);
  G.expect(POL_BUG.split('\n').length === POL_FIX.split('\n').length && POL_BUG.split('\n').filter(function (l, i) { return l !== POL_FIX.split('\n')[i]; }).length === 1, 'the policy excerpt differs in one line');
  var POL_LINE = G.at(POL_BUG, /Arnn/);

  var CLI = [
    'cfn-lint cfn/lake.yaml',
    '',
    'aws cloudformation deploy \\',
    '  --template-file cfn/lake.yaml \\',
    '  --stack-name brewline-lake-prod \\',
    '  --parameter-overrides Env=prod \\',
    '  --capabilities CAPABILITY_NAMED_IAM \\',
    '  --no-execute-changeset',
    '',
    'aws cloudformation describe-change-set \\',
    '  --stack-name brewline-lake-prod \\',
    '  --change-set-name CHANGESET_NAME_FROM_THE_DEPLOY_OUTPUT',
    '',
    'aws cloudformation execute-change-set \\',
    '  --stack-name brewline-lake-prod \\',
    '  --change-set-name CHANGESET_NAME_FROM_THE_DEPLOY_OUTPUT',
    '',
    'aws cloudformation wait stack-update-complete --stack-name brewline-lake-prod',
    'aws cloudformation detect-stack-drift --stack-name brewline-lake-prod'
  ].join('\n');

  var GHA = [
    'name: deploy',
    'on:',
    '  push:',
    '    branches: [main]',
    '',
    'permissions:',
    '  id-token: write',
    '  contents: read',
    '',
    'jobs:',
    '  dev:',
    '    runs-on: ubuntu-latest',
    '    environment: dev',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: aws-actions/configure-aws-credentials@v4',
    '        with:',
    '          role-to-assume: arn:aws:iam::123456789012:role/brewline-deploy-dev',
    '          aws-region: us-east-1',
    '      - run: pip install cfn-lint pytest "moto[all]" boto3',
    '      - run: cfn-lint cfn/*.yaml',
    '      - run: pytest -q',
    '      - run: >',
    '          aws cloudformation deploy --template-file cfn/lake.yaml',
    '          --stack-name brewline-lake-dev --parameter-overrides Env=dev',
    '          --capabilities CAPABILITY_NAMED_IAM'
  ].join('\n');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Infrastructure as code and delivery', short: 'IaC', blurb: 'CloudFormation templates, change sets and drift, testing AWS code with an emulator, and a pipeline from pull request to production', minutes: 50,
    focus: ['ci'],
    goals: [
      'Read a **CloudFormation** template, and say what `Retain`, `!Ref` and `!GetAtt` do.',
      'Catch template mistakes with **cfn-lint** before a deploy.',
      'Read a **change set**, and spot a **replacement** of a stateful resource.',
      'Test a Lambda handler with **pytest and moto**, with no AWS account.',
      'Describe a **pipeline** from pull request to two accounts, with no stored keys.'
    ],
    say: 'Mission 12 is how the platform gets built the same way every time. The infrastructure lives in a template that is reviewed, linted and deployed by a pipeline, and the code that runs on it is tested before it ships. I ran the real tools on the Brewline template and on a copy with five mistakes. The pipeline and the change set behaviour come from documentation. Nothing here ran on AWS.',
    scenes: [
      B.talk({
        id: 'm12-talk', t: 1, src: 'docs', title: 'Why infrastructure as code',
        say: 'A platform built by clicking in the console cannot be rebuilt or reviewed. Press Next for what code gives you.',
        items: [
          ['Repeatable', 'The same template builds development and production, with a different parameter. There is no list of steps that someone has to remember.', 'Same input, same result.'],
          ['Reviewable', 'A change is a pull request. A colleague reads the diff, tools lint it, and the history says who changed what and why.', 'Changes are visible.'],
          ['Testable', 'You can lint a template, run unit tests on the code, and deploy to a development account before production.', 'Mistakes are found early.'],
          ['Recoverable', 'If an account is lost or damaged, the template rebuilds the platform. The data needs backups, and the structure comes from code.', 'Rebuild on demand.'],
          ['The enemies', 'Console edits that are not in code, an environment that differs from the others, secrets typed into templates, and a delete that takes data with it.', 'Drift, snowflakes, secrets, deletion.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm12-yaml', t: 1, src: 'rec', title: 'The Brewline lake as a template', file: 'lake.yaml', lang: 'yaml', code: Y,
        steps: [
          { say: 'One template builds a bucket, a catalog database, a role and a Glue job. cfn-lint found nothing in it. The next screens read it from the top.', lines: null },
          { say: 'A parameter. The same template builds `dev` and `prod`, and only the value changes.', lines: G.span(Y, /^Parameters:/, /Default: dev/) },
          { say: '`DeletionPolicy` and `UpdateReplacePolicy` of `Retain` protect the data. If the stack is deleted, or the bucket is replaced by an update, CloudFormation leaves the old bucket where it is.', lines: G.span(Y, /DeletionPolicy: Retain/, /UpdateReplacePolicy: Retain/) },
          { say: 'The bucket name uses `!Sub` to put the environment and the account id into a string. Names are global, so the account id keeps them unique.', lines: G.span(Y, /BucketName:/) },
          { say: 'Versioning, and the four switches of Block Public Access (mission 2).', lines: G.span(Y, /VersioningConfiguration:/, /RestrictPublicBuckets/) },
          { say: 'Default encryption with KMS and a bucket key (mission 10).', lines: G.span(Y, /BucketEncryption:/, /BucketKeyEnabled/) },
          { say: 'Two lifecycle rules: raw data moves to a cheaper class after 30 days, and unfinished uploads are aborted after 7 days (mission 2).', lines: G.span(Y, /LifecycleConfiguration:/, /DaysAfterInitiation/) },
          { say: 'The catalog database for the lake. `!Ref AWS::AccountId` is a pseudo parameter.', lines: G.span(Y, /CatalogDatabase:/, /Name: !Sub brewline_lake/) },
          { say: 'The role of the Glue job. The first part is the trust policy: Glue may assume the role.', lines: G.span(Y, /GlueRole:/, /Action: sts:AssumeRole/) },
          { say: 'A managed policy for Glue itself, and an inline policy for the lake. It names the object ARN with `/*` for reads and writes and the bucket ARN for listing, as mission 3 taught. `!GetAtt` reads the ARN of the bucket from the resource.', lines: G.span(Y, /ManagedPolicyArns:/, /Resource: !GetAtt LakeBucket\.Arn/) },
          { say: 'The Glue job. It takes its role from `!GetAtt GlueRole.Arn`, and its size and bookmark setting from mission 4.', lines: G.span(Y, /OrdersJob:/, /--enable-metrics/) },
          { say: 'An output shows the bucket name after the deploy, for other stacks and for people.', lines: G.span(Y, /^Outputs:/, /Value: !Ref LakeBucket/) }
        ],
        note: 'cfn-lint 1.60.0 found nothing in this template. cfn-lint checks the shape of the template against the CloudFormation schema. It does not deploy anything and does not know your account.'
      }),

      B.cmp({
        id: 'm12-fn', t: 1, src: 'docs', title: 'The functions you meet in every template',
        say: 'Five intrinsic functions make templates work. Press Next to read them, with examples from the Brewline template.',
        cols: ['Function', 'What it does', 'In the template'],
        hl: 2,
        rows: [
          ['!Ref', 'The value of a parameter, or the main identifier of a resource.', '`!Ref LakeBucket` is the bucket name. `!Ref Env` is the parameter.'],
          ['!GetAtt', 'An attribute of a resource, such as its ARN.', '`!GetAtt LakeBucket.Arn`, `!GetAtt GlueRole.Arn`.'],
          ['!Sub', 'A string with `${name}` placeholders replaced by parameters and attributes.', '`brewline-lake-${Env}-${AWS::AccountId}`'],
          ['!If and conditions', 'A value that depends on a condition, for example only in production.', 'Not in this template. It is how a template differs between environments.'],
          ['Pseudo parameters', 'Values that CloudFormation knows: the account id, the region, the stack name.', '`AWS::AccountId`']
        ],
        steps: [
          { upto: 3, say: 'The three that every template uses: references, attributes and substitution.' },
          { upto: 5, say: 'Conditions and pseudo parameters keep one template usable in many places.' }
        ],
        pick: 'Use `!Ref` and `!GetAtt` to **connect resources**, and never type an ARN that the template can read. The dependency order then follows from the references.'
      }),

      B.term({
        id: 'm12-lint', t: 1, src: 'rec', title: 'cfn-lint on the good and on the broken template',
        say: 'cfn-lint checks a template against the CloudFormation schema on your machine. I ran it on the Brewline template, and on a copy where I injected five mistakes. Watch the two runs.',
        lines: function () { return G.plain(LG, { cmd: 'cfn-lint lake.yaml' }).concat(G.plain(LB, { cmd: 'cfn-lint lake_bug.yaml' })); },
        after: 'Five different rules fired: E3002 for a property that does not exist (`VersioningConfig`), E3030 for a value that is not allowed (`aws:kmss`), E1010 for an attribute that does not exist (`!GetAtt LakeBucket.Arnn`), E3003 for a required property that is missing (`Command` of the Glue job), and E3012 for a wrong type (`NumberOfWorkers: five`). The exit code is 2 when there are errors and 0 when there are none, so a pipeline stops on it.',
        afterKind: 'tip',
        doneSay: 'Every one of those would have failed a deploy, some of them after resources were already created. cfn-lint finds them in a second, before anything exists.'
      }),

      B.bug({
        id: 'm12-bug', t: 1, src: 'rec', q: 'cfn-lint reports E3030 for this part of a template. Click the line that it rejects.',
        file: 'lake_bug.yaml', lang: 'yaml', code: ENC_BUG, bad: [ENC_LINE],
        hint: 'Compare the value with the list of allowed values in the message.',
        why: 'The message of the linter was: `' + FINDING.E3030.message + '`. The value `aws:kmss` has an extra s. A deploy would have been refused, and a typo like this in a rarely used resource would be found at the worst time.',
        fix: ENC_FIX,
        cheer: 'The linter knows every allowed value.'
      }),

      B.bug({
        id: 'm12-bug2', t: 2, src: 'rec', q: 'cfn-lint reports E1010 for this role policy. Click the line that refers to something that does not exist.',
        file: 'lake_bug.yaml', lang: 'yaml', code: POL_BUG, bad: [POL_LINE],
        hint: 'Which attributes does an S3 bucket have?',
        why: 'The attribute is called `Arn`, and the template asks for `Arnn`. The linter listed the attributes that a bucket has, and `Arn` is the first of them. Without the check, the stack would fail during creation, after the bucket already exists.',
        fix: POL_FIX,
        cheer: 'GetAtt needs a real attribute.'
      }),

      B.quiz({
        id: 'm12-q1', t: 1, src: 'rec',
        q: 'A template has `NumberOfWorkers: five` in a Glue job. Which kind of finding does cfn-lint report?',
        opts: [
          { t: 'E3012: the value is not of type integer', fb: '' },
          { t: 'E1010: an attribute does not exist', fb: 'That rule is for `!GetAtt` with an attribute that the resource does not have.' },
          { t: 'E3030: the value is not one of the allowed values', fb: 'That rule is for properties with a fixed list of values, such as the encryption algorithm.' },
          { t: 'Nothing. CloudFormation converts the word', fb: 'It does not. The recorded linter reported the type.' }
        ],
        ok: 0, why: 'The recorded finding was `' + FINDING.E3012.rule + ' ' + FINDING.E3012.message + '` at line ' + FINDING.E3012.line + '. The schema says that `NumberOfWorkers` is an integer.'
      }),

      B.cmp({
        id: 'm12-stack', t: 1, src: 'docs', title: 'The life of a stack',
        say: 'A stack is a set of resources that CloudFormation manages as one unit. Press Next to follow what happens when you create, change and delete it.',
        cols: ['Event', 'What CloudFormation does', 'When it goes wrong'],
        hl: 2,
        rows: [
          ['Create', 'Creates the resources in dependency order, and reports CREATE_COMPLETE.', 'If one fails, it deletes what it created and leaves the stack in ROLLBACK_COMPLETE. You delete the stack and start again.'],
          ['Update', 'Compares the template with the stack, and changes, adds or removes resources. A change can update in place, update with a short interruption, or replace the resource.', 'If one fails, it rolls back to the old state: UPDATE_ROLLBACK_COMPLETE.'],
          ['Delete', 'Deletes the resources. A resource with `DeletionPolicy: Retain` is left in place.', 'A bucket that is not empty cannot be deleted. The stack reports DELETE_FAILED.'],
          ['Drift', 'You can ask CloudFormation to compare the real resources with the template.', 'A resource that someone changed in the console shows as MODIFIED.']
        ],
        steps: [
          { upto: 1, say: 'Creation is all or nothing.' },
          { upto: 2, say: 'An update can replace a resource, and the next screens show why that matters.' },
          { upto: 4, say: 'A delete follows the policy of each resource. Drift detection finds the edits that were not made in code.' }
        ],
        pick: 'Put **`DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`** on every resource that holds data: buckets, databases and streams with retention.'
      }),

      B.talk({
        id: 'm12-changeset', t: 1, src: 'docs', title: 'Change sets: read before you deploy',
        say: 'A change set shows what an update will do before it does it. Press Next for how to read one.',
        items: [
          ['Preview the change', 'You create a change set from a new template. CloudFormation lists every resource that it will add, modify or remove. Nothing changes until someone executes it.', 'A dry run.'],
          ['The Replacement column', 'For each change, the set says whether the resource is replaced: True, False or Conditional. A replacement creates a new resource and deletes the old one. For a stateless resource that is fine. For a bucket, a database or a stream it can mean an empty new resource.', 'Replacement is the word to look for.'],
          ['What forces a replacement', 'It depends on the property. Changing the name of a bucket, which is fixed at creation, replaces the bucket. Turning on versioning does not. The documentation of each resource says "Update requires: Replacement" or "No interruption" for each property.', 'The property decides.'],
          ['How Retain helps', 'With `UpdateReplacePolicy: Retain`, the old bucket stays after the replacement. The data is not lost. The new bucket is empty, and your jobs now write to a different place until you move the data.', 'The old resource survives.'],
          ['The rule for pipelines', 'Make the pipeline show the change set to a person, or fail the pipeline automatically when a change set replaces a stateful resource.', 'No replacements by surprise.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm12-q2', t: 2, src: 'docs',
        q: 'Someone changes the `BucketName` pattern in the template, and the change set says Replacement: True for the lake bucket, which has `UpdateReplacePolicy: Retain`. What happens when the change set is executed?',
        opts: [
          { t: 'CloudFormation renames the bucket and the data stays in it', fb: 'S3 buckets cannot be renamed. A new name means a new bucket.' },
          { t: 'A new empty bucket is created, and the old bucket stays with its data but is no longer part of the stack', fb: '' },
          { t: 'CloudFormation copies the data to the new bucket', fb: 'It does not copy data. You do that yourself.' },
          { t: 'The update fails because the bucket is not empty', fb: 'Retain keeps the old bucket. It does not block the update.' }
        ],
        ok: 1, why: 'The name of a bucket is fixed at creation, so the change replaces the bucket. With `Retain`, the old one is left in place, which saves the data. The new one is empty, so every job and dashboard that points to it sees no data until you copy the old data over or change the name back.'
      }),

      B.code({
        id: 'm12-cli', t: 1, src: 'docs', title: 'Deploy with a change set', file: 'deploy.sh', lang: 'bash', code: CLI,
        steps: [
          { say: 'Lint first. The command stops with a non-zero exit code on an error.', lines: G.span(CLI, /^cfn-lint/) },
          { say: '`deploy` creates the stack or a change set from the template. `--parameter-overrides` sets `Env`. A template that creates IAM roles needs `--capabilities`, and a named role needs `CAPABILITY_NAMED_IAM`, as a confirmation that you know it creates identities.', lines: G.span(CLI, /^aws cloudformation deploy/, /--capabilities/) },
          { say: '`--no-execute-changeset` stops after the change set is created, so a person or a pipeline step can read it.', lines: G.span(CLI, /--no-execute-changeset/) },
          { say: '`describe-change-set` lists the changes, including the Replacement flag.', lines: G.span(CLI, /describe-change-set/, /--change-set-name/) },
          { say: '`execute-change-set` applies it, and `wait` blocks until the stack is done.', lines: G.span(CLI, /execute-change-set/, /wait stack-update-complete/) },
          { say: '`detect-stack-drift` compares the real resources with the template. Run it every night (the next screens).', lines: G.span(CLI, /detect-stack-drift/) }
        ],
        note: 'The verifier read the options of `aws cloudformation deploy` from the CLI help and checked the other commands against the AWS SDK service model. Nothing ran on AWS, and the change set name is a placeholder.'
      }),

      B.cmp({
        id: 'm12-tools', t: 1, src: 'docs', title: 'CloudFormation, CDK, Terraform or the console',
        say: 'Several tools build infrastructure. Press Next to compare them. Terraform has its own tutorial later in this library.',
        cols: ['Tool', 'You write', 'State and deployment', 'Good for'],
        hl: 3,
        rows: [
          ['CloudFormation', 'YAML or JSON templates', 'AWS keeps the state. Change sets and rollback are built in.', 'AWS only, a few dozen resources, the fewest moving parts.'],
          ['AWS CDK', 'Python, TypeScript or another language', 'It synthesizes CloudFormation templates, so the deployment is CloudFormation.', 'Loops, reuse and tests in a language that the team knows.'],
          ['Terraform', 'HCL', 'You keep a state file, for example in S3, and run plan and apply.', 'Several clouds, a large provider list, and teams with Terraform skills.'],
          ['The console', 'Clicks', 'Nothing is recorded.', 'Exploring. Never for anything that you need twice.']
        ],
        steps: [
          { upto: 2, say: 'CloudFormation is the base, and CDK writes it for you.' },
          { upto: 4, say: 'Terraform is the main alternative, and the console is for exploring.' }
        ],
        pick: 'For an **AWS-only platform** of a few dozen resources, start with **CloudFormation**. Move to **CDK** when templates repeat the same pattern many times. Choose **Terraform** for multiple clouds or existing skills.'
      }),

      B.code({
        id: 'm12-conftest', t: 1, src: 'rec', title: 'Testing AWS code without AWS: the fixture', file: 'conftest.py', lang: 'python', code: CONF,
        steps: [
          { say: 'pytest runs the file `conftest.py` first. It sets fake credentials and a region, so that boto3 never looks for a real account.', lines: G.span(CONF, /os\.environ\.setdefault\("AWS_ACCESS_KEY_ID"/, /AWS_DEFAULT_REGION/) },
          { say: 'The fixture opens `mock_aws` from moto, which replaces the AWS endpoints with an emulator in memory.', lines: G.span(CONF, /@pytest\.fixture/, /with mock_aws\(\):/) },
          { say: 'Inside the mock it creates an empty bucket.', lines: G.span(CONF, /create_bucket/) },
          { say: 'The handler is imported and reloaded inside the mock, because it creates its boto3 client when the module loads. A client made before the mock starts would talk to real AWS.', lines: G.span(CONF, /import handler/, /yield handler/) }
        ],
        note: 'This is the file that ran in the recording. Three tests used it and passed in about half a second.'
      }),

      B.code({
        id: 'm12-tests', t: 1, src: 'rec', title: 'Three tests for the S3 handler', file: 'test_handler.py', lang: 'python', code: TEST,
        steps: [
          { say: 'Test data and a helper that builds the part of an S3 event that the handler reads. Note the encoded key: it is what S3 really sends (mission 8).', lines: G.span(TEST, /^ORDERS/, /^def put_orders/) },
          { say: 'The first test: three orders, one cancelled. The summary must count three and add up the other two: 19.5.', lines: G.span(TEST, /def test_summary_skips_cancelled_orders/, /revenue_usd/) },
          { say: 'The second test sends the same event twice. The first call writes and the second says it was already done. This is the test that proves the handler is safe to repeat.', lines: G.span(TEST, /def test_a_repeated_event_writes_nothing_twice/, /== \("written", "already done"\)/) },
          { say: 'The third test uses a key with a space, which arrives with a plus sign. It checks the decoding.', lines: G.span(TEST, /def test_a_key_with_a_space_arrives_with_a_plus/, /orders 0002\.json"$/) }
        ],
        note: 'In the recording these tests passed (' + TS.passed + ' passed). Against a handler that does not decode the key, the first test failed with `NoSuchKey` (mission 8). The tests found the bug without an AWS account.'
      }),

      B.talk({
        id: 'm12-moto', t: 2, src: 'docs', title: 'What an emulator can tell you',
        say: 'An emulator such as moto is fast and free, and it is not AWS. Press Next for where it helps and where it stops.',
        items: [
          ['Good for', 'The logic of your code, the shape of requests and responses, the order of calls, errors that your code must handle, and repeated events. It runs in a second, in CI, with no account and no cost.', 'Your code, not the service.'],
          ['Not good for', 'The behaviour of real services under load, exact error messages, timing, eventual consistency, quotas, and the engines themselves: Athena does not run a query, a Glue job does not run Spark, and a state machine does not run to completion the way it does on AWS.', 'The service itself.'],
          ['Permissions are special', 'IAM checks are not enforced by default. The recorded permission labs needed a special mode and an exact count of setup calls. A passing test does not prove that a policy is right. Check policies with a linter and in a real account.', 'Do not trust a pass for IAM.'],
          ['Common traps', 'A boto3 client created at import time, before the mock starts. Real credentials in the environment. A region that differs between the test and the code.', 'Create clients inside the mock.'],
          ['The test layers', 'Unit tests for pure functions. Emulator tests for code that calls AWS. A few integration tests in a development account, with real data of a small size. Use each layer for what it is good at.', 'Three layers.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'The path of a change to production', g: 'cicd', legend: true,
        steps: [
          { say: 'A change goes through lint, tests, a development account and a person before it reaches production. Press Next to follow it.', cap: 'A path with gates.' },
          { say: 'Step 1. A pull request in Git. A colleague reads the diff of the template and the code.', on: ['d1'], focus: ['git', 'ci'], cap: 'A pull request.' },
          { say: 'Step 2. The pipeline lints the templates with cfn-lint and the IAM policies with a policy linter, and runs the unit and emulator tests. A failure blocks the merge.', focus: ['ci'], cap: 'Lint and tests.' },
          { say: 'Step 3. After the merge, the pipeline proves who it is with a short-lived token and assumes a deploy role. No access key is stored anywhere (mission 3).', on: ['d2'], focus: ['ci', 'oidc'], cap: 'A token, not a key.' },
          { say: 'Step 4. It creates a change set in the development account and deploys it.', on: ['d3'], focus: ['oidc', 'dev'], cap: 'Deploy to development.' },
          { say: 'Step 5. A smoke test runs one small real run of the pipeline in development, and checks that its output is right.', on: ['d4'], focus: ['dev', 'tst'], cap: 'A small real run.' },
          { say: 'Step 6. A person looks at the change set for production and approves it. The same pipeline then deploys the same template to the production account with its own role.', on: ['d5', 'd6'], focus: ['tst', 'apr', 'prd'], cap: 'Approve, then production.' },
          { say: 'Every night a drift check compares production with the template, and alarms on a difference.', on: ['d7'], focus: ['prd', 'drf'], cap: 'Drift is checked nightly.' }
        ]
      }),

      B.code({
        id: 'm12-gha', t: 2, src: 'docs', title: 'A deploy workflow with no stored keys', file: 'deploy.yml', lang: 'yaml', code: GHA,
        steps: [
          { say: 'The workflow runs when someone merges to `main`.', lines: G.span(GHA, /^name:/, /branches: \[main\]/) },
          { say: '`id-token: write` lets the job ask GitHub for a signed identity token. The job cannot assume a role without it (mission 3).', lines: G.span(GHA, /^permissions:/, /contents: read/) },
          { say: 'The job uses a GitHub environment named `dev`, where you can set approval rules and secrets.', lines: G.span(GHA, /^jobs:/, /environment: dev/) },
          { say: 'The configure step exchanges the token for temporary credentials of the role `brewline-deploy-dev`. The role trusts only this repository and branch.', lines: G.span(GHA, /configure-aws-credentials/, /aws-region/) },
          { say: 'Lint and test before anything is deployed. If either fails, the job stops.', lines: G.span(GHA, /pip install/, /pytest -q/) },
          { say: 'Deploy to the development stack. A production job would use its own environment, its own role and a manual approval.', lines: G.span(GHA, /aws cloudformation deploy/, /CAPABILITY_NAMED_IAM/) }
        ],
        note: 'The verifier parsed the file as YAML. The role and the repository trust are the ones of mission 3. The workflow did not run on GitHub or on AWS.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put the steps of a safe delivery in order.',
        items: [
          'Open a pull request with the change',
          'Lint the templates and the policies, and run the tests',
          'Merge, and assume the deploy role with a short-lived token',
          'Create the change set in the development account and read it',
          'Deploy, and run a smoke test in development',
          'After approval, deploy the same template to production, and check drift every night'
        ],
        why: 'Cheap checks come first, then a real deploy in a safe account, then a person, then production. The same template moves through every stage, so production runs what development tested.'
      }),

      B.talk({
        id: 'm12-envs', t: 2, src: 'docs', title: 'Environments and promotion',
        say: 'Development and production should differ in values, not in design. Press Next for the rules.',
        items: [
          ['One template, many accounts', 'The template is the same. A parameter or a stack setting says `dev` or `prod`. Separate accounts give separate bills, quotas and blast radius (mission 1).', 'Same shape, different values.'],
          ['Build once, deploy many', 'Promote the same version of the template and the code from development to production. A different build for production means that production runs something nobody tested.', 'Promote the artifact.'],
          ['Names carry the environment', 'Put the environment and the account id into names, as in the lake template. A name that is the same in both accounts invites a mistake that touches the wrong one.', 'No shared names.'],
          ['Configuration outside the code', 'Environment settings come from parameters or from Parameter Store. Secrets come from Secrets Manager (mission 10). Neither is typed into a template.', 'Values from stores.'],
          ['No shared stacks', 'Do not let development and production use the same stack, bucket or database. A shared resource is a bug waiting for a deploy.', 'Separate everything.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm12-drift', t: 2, src: 'docs', title: 'Drift',
        say: 'Someone fixes a problem in the console at night. Press Next for what that does to the template.',
        items: [
          ['What drift is', 'A difference between a resource as it exists and as its template says it should be. A security group opened by hand, a bucket policy edited in the console, a Glue job with another worker count.', 'The world differs from the code.'],
          ['How you find it', 'CloudFormation drift detection compares the real properties with the template, and marks resources as IN_SYNC or MODIFIED. Run it on a schedule and alarm on a difference.', 'Compare every night.'],
          ['What you do about it', 'Decide which one is right. If the change was good, put it into the template through a pull request. If not, deploy the template again to put the resource back.', 'Code wins, or code learns.'],
          ['How you prevent it', 'Give humans read-only roles in production and let only the deploy role write. Use a service control policy for the few actions that must never happen by hand. An emergency role exists, is logged, and is followed by a pull request.', 'Make the console read-only.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm12-q3', t: 1, src: 'docs',
        q: 'A stack has a bucket with `DeletionPolicy: Retain`. Someone deletes the stack. What happens to the bucket?',
        opts: [
          { t: 'It is deleted with the stack, and its data is lost', fb: 'That is the Delete policy, which is the default for most resources.' },
          { t: 'It stays in the account with its data, and is no longer managed by any stack', fb: '' },
          { t: 'CloudFormation moves its data to another bucket', fb: 'CloudFormation never copies data.' },
          { t: 'The stack deletion is blocked', fb: 'The stack is deleted. Retain only affects the resource.' }
        ],
        ok: 1, why: 'The resource is left where it is, with its data. That protects the lake from a careless delete, and it leaves a bucket that nobody manages. Import it into a stack again, or delete it on purpose.'
      }),

      B.quiz({
        id: 'm12-q4', t: 2, src: 'docs',
        q: 'A template creates a named IAM role, and `aws cloudformation deploy` stops with an error about capabilities. What do you add?',
        opts: [
          { t: '`--capabilities CAPABILITY_NAMED_IAM`', fb: '' },
          { t: '`--role-arn` with an administrator role', fb: 'A role to deploy with does not replace the confirmation that the template creates IAM resources.' },
          { t: '`--no-fail-on-empty-changeset`', fb: 'That option is for a change set with no changes.' },
          { t: '`--disable-rollback`', fb: 'That changes what happens after a failure. It does not give the capability.' }
        ],
        ok: 0, why: 'CloudFormation requires you to acknowledge that a template creates identities. `CAPABILITY_IAM` is enough for roles with generated names. A role with a name that you chose needs `CAPABILITY_NAMED_IAM`.'
      }),

      B.quiz({
        id: 'm12-q5', t: 1, src: 'rec',
        q: 'The test run of the handler passes with moto. Does that prove that the IAM policy of the Lambda role is right?',
        opts: [
          { t: 'Yes. The test called S3 with the same code', fb: 'The emulator does not enforce IAM unless you switch on a special mode.' },
          { t: 'No. The emulator does not check the policy of the role, so the policy needs a linter and a test in a real account', fb: '' },
          { t: 'Yes, because moto copies the policies of your account', fb: 'moto knows nothing about your account.' },
          { t: 'Only if the test uses a real bucket', fb: 'A real bucket is a real service call, which is the integration test. A unit test with moto does not need one.' }
        ],
        ok: 1, why: 'The emulator tests the logic of your code. IAM needs a separate check: a policy linter for the names and ARNs, and a real run in the development account with the real role.'
      }),

      B.cmp({
        id: 'm12-rollback', t: 2, src: 'docs', title: 'When a deploy fails',
        say: 'Deploys fail. Press Next to read what state you are in and what to do.',
        cols: ['State', 'What it means', 'What to do'],
        hl: 2,
        rows: [
          ['ROLLBACK_COMPLETE', 'The first creation failed, and CloudFormation removed what it had created.', 'Read the failed event, fix the template, delete the empty stack, and create it again.'],
          ['UPDATE_ROLLBACK_COMPLETE', 'An update failed, and the stack went back to the old state.', 'Read the failed event, fix the cause, and update again.'],
          ['UPDATE_ROLLBACK_FAILED', 'The update failed, and the rollback also failed. Often a resource was changed by hand and no longer fits.', 'Fix the resource, then continue the rollback. If one resource cannot be fixed, continue and skip it, and put it right afterwards.'],
          ['DELETE_FAILED', 'A resource could not be deleted, for example a bucket that is not empty.', 'Empty or fix the resource, and delete the stack again.']
        ],
        steps: [
          { upto: 2, say: 'Failures that rolled back cleanly. Read the event that failed first.' },
          { upto: 4, say: 'A failed rollback and a failed delete need a hand. The cause is almost always a resource that was changed outside the stack.' }
        ],
        pick: 'Read the **first failed event** in the stack events. The later ones are consequences. After a failed rollback, fix the resource and run `continue-update-rollback`.'
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'docs', title: 'Decision: how does Brewline define its infrastructure?',
        scenario: 'Brewline runs **only on AWS** and will for the next two years. **Three engineers** write Python and SQL. The platform has about **40 resources** in two accounts. They want **reviews, tests, change previews and rollback**, and as **few new tools** as possible.',
        opts: [
          { t: 'CloudFormation templates in YAML, linted and deployed by a pipeline', d: 'AWS keeps the state. Change sets, rollback and drift detection are built in. Nothing new to install except the linter.' },
          { t: 'Terraform with a state file in S3', d: 'A strong tool with a large community.', lose: 'A second tool to learn, a state file to protect and lock, and a state backend to set up, for a team that has no multi-cloud need. It makes sense when a second cloud arrives.' },
          { t: 'CDK in Python, from the start', d: 'Code, loops and unit tests for infrastructure.', lose: 'It adds a toolchain, a bootstrap in each account and a layer between the code and the template. For 40 resources the template is easy to write by hand. It pays off when many pipelines repeat one pattern.' }
        ],
        pick: 0,
        why: 'For a small AWS-only platform, plain CloudFormation has the fewest moving parts and the features that the team asked for. The linter adds the fast feedback.',
        when: 'Move to CDK when you generate the same pipeline for 20 teams. Move to Terraform when a second cloud or an existing Terraform skill set arrives. The next tutorials of this library cover Terraform on its own.'
      }),

      B.incident({
        id: 'm12-inc', t: 2, src: 'docs', title: 'Incident: the lake bucket is empty after a deploy', time: '07:45',
        alert: '**Every dashboard is empty after last night\'s deploy.** The pipeline report says the deploy succeeded. The lake bucket named in the config exists and holds no objects. Yesterday the template changed the bucket name from `brewline-lake-${Env}` to `brewline-lake-${Env}-${AWS::AccountId}`.',
        clues: ['The change set of the deploy showed Replacement: True for the bucket, and nobody read it', 'A bucket with the old name still exists and holds 40 TB', 'The bucket has `UpdateReplacePolicy: Retain`'],
        opts: [
          { t: 'Point the jobs back to the old bucket or copy the data into the new one, then change the pipeline so that replacements of stateful resources fail the build', fb: '' },
          { t: 'Delete the new bucket and redeploy', fb: 'The template still names the new bucket, so the same replacement happens again.' },
          { t: 'Roll back the stack with the console', fb: 'A rollback of a successful update is another change. It would replace the bucket again.' },
          { t: 'Wait. The data will appear', fb: 'CloudFormation never copies data between buckets.' }
        ],
        best: 0,
        why: 'A name is fixed when a bucket is created, so the change replaced the bucket. `Retain` saved the 40 TB in the old bucket, and the new bucket is empty. Move the data or the jobs, keep the old name in the template if nothing needs the new one, and make the pipeline fail when a change set replaces a stateful resource.',
        checks: [
          ['Read the change set', 'Replacement: True for the bucket, in the log of the deploy.'],
          ['Find the data', 'The old bucket still holds 40 TB, thanks to Retain.'],
          ['Choose a repair', 'Set the name back to the old value, or copy the data to the new bucket and update the readers.'],
          ['Stop the repeat', 'The pipeline reads the change set and fails on Replacement for a bucket, a database or a stream.'],
          ['Say it plainly', 'Tell the team what happened, how long the data was missing, and what changed.']
        ],
        tell: 'After a deploy, every dashboard was empty. We had changed the bucket name pattern in the template, which made CloudFormation replace the lake bucket. The change set showed Replacement True, but nobody read it. Because the bucket had an UpdateReplacePolicy of Retain, the old bucket with 40 TB survived, and the new one was empty. I pointed the jobs back to the old bucket, kept the old name in the template, and copied nothing. The pipeline now reads every change set and fails when a stateful resource is replaced, unless a person approves it.',
        prevent: ['Fail the pipeline on **Replacement** of a bucket, database or stream', 'Keep **Retain** on every resource that holds data', 'Show the **change set** to a person for production', 'Never put a **new naming scheme** into an existing resource without a plan']
      }),

      B.incident({
        id: 'm12-inc2', t: 2, src: 'docs', title: 'Incident: the stack is stuck in UPDATE_ROLLBACK_FAILED', time: '23:30',
        alert: '**A deploy failed at 23:10 and the stack is now in UPDATE_ROLLBACK_FAILED.** Nothing can be deployed to production. The failed event says that the rollback could not restore the Glue job. Earlier this week an engineer deleted the Glue role by hand in the console, to test something.',
        clues: ['The stack events show the rollback failing on the `GlueRole` resource', 'The role no longer exists, but the stack believes it does', 'Drift detection was never turned on for this stack'],
        opts: [
          { t: 'Recreate the missing role by hand with the same name, then continue the rollback, and afterwards put the real state into the template', fb: '' },
          { t: 'Delete the stack with the console', fb: 'It would delete resources that hold production data unless they are retained, and it does not solve the cause.' },
          { t: 'Update the stack again with the same template', fb: 'The stack cannot update while it is in UPDATE_ROLLBACK_FAILED.' },
          { t: 'Create a second stack with the same resources', fb: 'The names collide with the resources of the first stack.' }
        ],
        best: 0,
        why: 'The rollback needs the resource to be in the state that the stack remembers. The role was deleted outside CloudFormation, so the stack cannot restore the job that depends on it. Recreate the role, run `continue-update-rollback` (and skip a resource only if it cannot be fixed), and then deploy the corrected template. A nightly drift check and read-only human roles would have shown the problem days before.',
        checks: [
          ['Read the failed event', 'The rollback fails on the role that someone deleted.'],
          ['Compare with the world', 'The console shows no role with that name.'],
          ['Restore the resource', 'Create the role again with the same name and the same trust policy.'],
          ['Continue the rollback', '`aws cloudformation continue-update-rollback`, with `--resources-to-skip` only if needed.'],
          ['Prevent it', 'Read-only human roles in production, a nightly drift check, and a rule that fixes go through a pull request.']
        ],
        tell: 'A production deploy failed and the rollback failed too, which left the stack in UPDATE_ROLLBACK_FAILED. An engineer had deleted the Glue role in the console earlier in the week, so the stack could not restore the job. I recreated the role with the same name and trust policy, continued the rollback, and then deployed the corrected template. We now give humans read-only roles in production, check drift every night, and route every fix through a pull request.',
        prevent: ['Give humans **read-only roles** in production', 'Run **drift detection** every night', 'Send every fix through a **pull request**', 'Know how to run **continue-update-rollback**']
      }),

      B.qa({
        id: 'qa-iac', t: 1, tag: 'IaC', secs: 60,
        q: 'Why do you define infrastructure as code, and how do you do it on AWS?',
        pts: ['Repeatable, reviewable, testable, recoverable', 'CloudFormation templates, or CDK or Terraform', 'Lint before deploy, preview with a change set', 'Retain on stateful resources', 'Separate accounts, same template', 'Drift detection and read-only humans'],
        short: 'Code makes the platform repeatable, reviewable, testable and recoverable. The same template builds development and production with a different parameter, a change is a pull request, and a lost account can be rebuilt.\n\nOn AWS I use CloudFormation for a platform of a few dozen resources, because AWS keeps the state and gives me change sets, rollback and drift detection. I lint every template with cfn-lint, which caught five different mistakes in my test in a second: a wrong property, a wrong value, a wrong attribute, a missing property and a wrong type.\n\nBefore deploying I read the change set, and I look for Replacement on stateful resources. Buckets, databases and streams have DeletionPolicy and UpdateReplacePolicy of Retain. Environments are separate accounts that run the same template, and humans have read-only roles in production, so the console cannot cause drift. A nightly drift check alarms on any difference.\n\nFor multi-cloud I would use Terraform, and for many similar pipelines CDK.',
        fu: [
          ['What is a change set?', 'A preview of what an update will do: which resources are added, modified or removed, and whether each is replaced. Nothing changes until it is executed.'],
          ['What does Retain do?', 'It leaves the resource in place when the stack is deleted or the resource is replaced, so the data is not lost.']
        ],
        trap: 'Saying that you use IaC and then fixing things in the console. The code must stay the source of truth.',
        real: 'Describe an infrastructure change that you previewed and what the change set showed.'
      }),

      B.qa({
        id: 'qa-cfn', t: 1, tag: 'IaC', secs: 90,
        q: 'What can go wrong with CloudFormation, and how do you protect production?',
        pts: ['A replacement of a stateful resource', 'A failed rollback after drift', 'Capabilities for IAM resources', 'Retain policies', 'Change sets reviewed or checked by the pipeline', 'Drift detection and read-only roles'],
        short: 'The worst case is a replacement. Some properties, such as the name of a bucket, cannot change in place, so the update creates a new resource and deletes the old one. With a bucket, you may get an empty bucket. I put DeletionPolicy and UpdateReplacePolicy of Retain on everything that holds data, and I read the Replacement column of every change set. The pipeline can fail automatically when a change set replaces a bucket, a database or a stream.\n\nThe second case is drift. If someone changes or deletes a resource in the console, a later rollback can fail and leave the stack in UPDATE_ROLLBACK_FAILED. I fix the resource and run continue-update-rollback. To prevent it, humans get read-only roles in production and the pipeline checks drift every night.\n\nSmaller issues: a template that creates IAM roles needs the capability option, a create that fails leaves ROLLBACK_COMPLETE and I delete the stack and start again, and a bucket that is not empty blocks a delete.\n\nI lint templates with cfn-lint before every deploy.',
        fu: [
          ['What does Replacement: Conditional mean?', 'Whether the resource is replaced depends on the new value of the property. Check the documentation of the property or the details of the change.'],
          ['How do you recover from UPDATE_ROLLBACK_FAILED?', 'Fix the resource that blocked the rollback, then run continue-update-rollback. Skip a resource only if it cannot be fixed, and put it right afterwards.']
        ],
        trap: 'Executing a change set without reading the Replacement column.',
        real: 'Describe a deploy that went wrong and what you changed in the process.'
      }),

      B.qa({
        id: 'qa-cicd', t: 2, tag: 'IaC', secs: 90,
        q: 'Describe a CI/CD pipeline for a data platform on AWS.',
        pts: ['Pull request, then lint and tests', 'OIDC: a short-lived token, no stored keys', 'Deploy to a development account with a change set', 'A smoke test with a small real run', 'Approval, then the same template to production', 'A nightly drift check'],
        short: 'A pull request starts the pipeline. It lints the templates with cfn-lint and the IAM policies with a policy linter, and runs the unit tests and the emulator tests with pytest and moto. A failure blocks the merge.\n\nAfter the merge, the pipeline proves its identity with a short-lived token from the CI system and assumes a deploy role through OIDC, so no access key is stored anywhere. The role trusts only this repository and branch. It creates a change set in the development account, deploys it, and runs a smoke test: one small real run of the pipeline with a check on the output.\n\nFor production, a person reads the change set, and the pipeline deploys the same template with a separate role in the production account. It fails on a replacement of a stateful resource unless that was approved.\n\nEvery night a drift check compares production with the template. Rollbacks and fixes go through the same pipeline. I promote one version through all stages, and I do not build differently for production.',
        fu: [
          ['Why OIDC?', 'A stored access key can leak and does not expire. A token from the CI system is short-lived, and the trust policy can limit it to one repository and branch.'],
          ['What does a smoke test check?', 'That the deployed pipeline can process a small real input end to end and produce the expected output, which a template check cannot show.']
        ],
        trap: 'Describing deploy steps and no checks. The lint, the tests and the change set review are the safety.',
        real: 'Describe a pipeline you built and a gate that stopped a bad change.'
      }),

      B.qa({
        id: 'qa-testing', t: 2, tag: 'IaC', secs: 90,
        q: 'How do you test code that calls AWS?',
        pts: ['Unit tests for pure functions', 'moto for code that calls AWS, with no account', 'Create clients inside the mock', 'Test failures and repeated events', 'The emulator does not prove IAM or service behaviour', 'A few integration tests in a development account'],
        short: 'I test in three layers. First, pure functions, such as the logic that summarizes a file, with plain unit tests. Second, the code that calls AWS, with pytest and moto, an emulator that runs in memory: a fixture opens the mock, creates the bucket, and imports the handler inside the mock, so that its boto3 client talks to the emulator. Third, a few integration tests in a development account with a small real input.\n\nWith moto I test the failures that matter: an event with an encoded key, the same event twice, a missing object. In my test, three tests passed on the good handler, and the first one failed with NoSuchKey on a handler that forgot to decode the key. I found that with no account.\n\nI know the limits. moto does not enforce IAM by default, and it does not run Athena queries, Spark or state machines the way AWS does. So I lint policies, and I check permissions and service behaviour in the development account.\n\nThe layers run in CI on every pull request.',
        fu: [
          ['What is the usual moto mistake?', 'Creating a boto3 client at import time, before the mock starts, so the test talks to real AWS or fails with credentials.'],
          ['Can moto test IAM?', 'Only in a special mode, and it is not a proof. I use a policy linter and a real role in a development account.']
        ],
        trap: 'Trusting a green emulator test for permissions or performance.',
        real: 'Describe a bug that a test with moto found, and what the test looked like.'
      }),

      B.qa({
        id: 'qa-envs', t: 2, tag: 'IaC', secs: 90,
        q: 'How do you manage development, staging and production environments?',
        pts: ['Separate accounts with the same template', 'Parameters for the values that differ', 'Build once, promote the artifact', 'Environment and account in names', 'Config in Parameter Store, secrets in Secrets Manager', 'No shared stacks, buckets or databases'],
        short: 'Each environment is its own account, so that bills, quotas and the blast radius are separate. The same template builds all of them, and only parameters differ: the environment name, sizes, and settings such as a smaller worker count in development.\n\nI build once and promote. The same version of the template and the code goes through development, staging and production, so production runs what was tested. A separate build for production would be untested.\n\nNames carry the environment and the account id, so no name is the same in two environments. Settings that differ come from parameters or Parameter Store, and secrets from Secrets Manager. Nothing is typed into a template.\n\nNo environment shares a stack, a bucket or a database with another. For data, development uses a small sample or masked copies and not production personal data. Access follows the same idea: humans have wide rights in development and read-only rights in production, and the pipeline is the only writer.',
        fu: [
          ['How do you test with production-like data?', 'A masked or sampled copy in a separate account, with the same schema and a smaller size. Never copy personal data to development without masking.'],
          ['What do you do with a hotfix?', 'The same pipeline, with a short review and the smoke test. Never a hand edit in production.']
        ],
        trap: 'Using one account with prefixes for each environment. A mistake or a leaked key reaches all of them.',
        real: 'Describe how a change moved from development to production in your team.'
      }),

      B.qa({
        id: 'qa-tools', t: 3, tag: 'IaC', secs: 90,
        q: 'CloudFormation, CDK or Terraform: how do you choose?',
        pts: ['CloudFormation: AWS-native, state kept by AWS, change sets, rollback', 'CDK: code that synthesizes CloudFormation', 'Terraform: multi-cloud, state file, plan and apply, large provider list', 'Team skills and the number of clouds decide', 'Size and repetition decide CDK', 'Avoid mixing without a reason'],
        short: 'I choose by the number of clouds, the size of the estate and the skills of the team.\n\nCloudFormation is AWS-native. AWS keeps the state, and change sets, rollback and drift detection are built in. For an AWS-only platform of a few dozen resources it has the fewest moving parts.\n\nCDK lets me write the same infrastructure in Python or TypeScript, with loops, functions and unit tests, and it synthesizes CloudFormation, so the deployment is the same. It pays off when many pipelines or accounts repeat one pattern, at the price of a toolchain and a bootstrap in each account.\n\nTerraform uses HCL and a state file that I must store and lock, for example in S3. It has a very large provider list, so I choose it for several clouds or when the team already knows it. Plan and apply give a preview like a change set.\n\nI avoid mixing tools for the same resources. I also keep stateful resources protected, whatever the tool.',
        fu: [
          ['What is state in Terraform?', 'A file that maps your code to real resources. It must be stored safely, locked during changes, and treated as sensitive.'],
          ['When would you use CDK?', 'When the same pattern repeats many times, for example one pipeline for each of 20 teams, and I want it as code with tests.']
        ],
        trap: 'Choosing by fashion. The number of clouds and the size of the platform are what decide.',
        real: 'Describe a tooling decision you made for infrastructure, and what you gave up.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Stack Builder', color: '#DDD6FE',
        pts: [
          'Infrastructure as code is **repeatable, reviewable, testable and recoverable**. The Brewline template builds a bucket, a database, a role and a job from one file.',
          '**cfn-lint** found five different mistakes in a second: ' + RULES.join(', ') + '. It exits with code 2 on errors, so a pipeline stops.',
          'Read the **change set**. **Replacement** of a bucket, database or stream is the dangerous word. **Retain** keeps the old data.',
          '**pytest with moto** tested a handler with no account: three tests passed, and a missing decode failed with `NoSuchKey`. An emulator does **not** prove IAM.',
          'A pipeline lints, tests, assumes a role with a **short-lived token**, previews a change set, deploys to development, approves, and deploys the **same template** to production.',
          'Check **drift** every night, give humans **read-only roles** in production, and know **continue-update-rollback**.'
        ],
        lines: [
          'I read the change set before I execute it.',
          'I keep Retain on everything that holds data.',
          'I promote one build through every stage.'
        ]
      })
    ]
  });
})();
