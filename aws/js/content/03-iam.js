/* Mission 3: IAM and STS. Who is calling, how a request is signed, how a policy is read, how AWS decides, roles and temporary credentials,
   cross-account access and the usual AccessDenied causes. The signing chain, the ten policy decisions, the assume-role response and the policy
   lint results were recorded with botocore, boto3 against moto (which enforces identity policies) and parliament. The evaluation rules,
   the cross-account and KMS rules and the web identity setup come from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TRUTH = G.counts('iam.truth').rows, ASSUME = G.counts('iam.assume'), SIG = G.counts('sigv4.keys'), LINT = G.counts('policy.lint');
  var READ = G.file('iam/read_curated.json'), WRONG = G.file('iam/wrong_arns.json'), TRUST = G.file('iam/trust_account.json'), TRUSTGLUE = G.file('iam/trust_glue.json');
  G.expect(TRUTH.length === 10 && TRUTH.filter(function (r) { return r.result === 'allow'; }).length === 3, 'ten recorded requests, three allowed');
  G.expect(ASSUME.access_key_prefix === 'ASIA' && ASSUME.has_session_token && ASSUME.assumed_role_user_arn.indexOf(':assumed-role/raw-reader/etl-run-1') > 0, 'the assume-role response');
  G.expect(SIG.matches_the_documentation && SIG.recomputed_matches, 'the signature equals the AWS documentation');
  G.expect(LINT.wrong_arns.length === 2 && LINT.wrong_arns.every(function (f) { return f.issue === 'RESOURCE_MISMATCH'; }) && LINT.read_curated.length === 0 && LINT.misspelled_action[0].issue === 'UNKNOWN_ACTION', 'parliament findings');
  var row = function (n) { return TRUTH[n]; };

  var OIDC = [
    '{',
    '  "Version": "2012-10-17",',
    '  "Statement": [',
    '    {',
    '      "Effect": "Allow",',
    '      "Principal": {',
    '        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"',
    '      },',
    '      "Action": "sts:AssumeRoleWithWebIdentity",',
    '      "Condition": {',
    '        "StringEquals": {',
    '          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"',
    '        },',
    '        "StringLike": {',
    '          "token.actions.githubusercontent.com:sub": "repo:brewline/data-platform:ref:refs/heads/main"',
    '        }',
    '      }',
    '    }',
    '  ]',
    '}'
  ].join('\n');
  var OIDC_BUG = OIDC.replace('repo:brewline/data-platform:ref:refs/heads/main', 'repo:*');
  var LISTPREFIX = [
    '{',
    '  "Version": "2012-10-17",',
    '  "Statement": [',
    '    {',
    '      "Sid": "ListOnlyCuratedFolders",',
    '      "Effect": "Allow",',
    '      "Action": "s3:ListBucket",',
    '      "Resource": "arn:aws:s3:::brewline-lake",',
    '      "Condition": { "StringLike": { "s3:prefix": ["curated/*"] } }',
    '    },',
    '    {',
    '      "Sid": "ReadCurated",',
    '      "Effect": "Allow",',
    '      "Action": "s3:GetObject",',
    '      "Resource": "arn:aws:s3:::brewline-lake/curated/*"',
    '    }',
    '  ]',
    '}'
  ].join('\n');
  var ASSUMECODE = [
    "sts = boto3.client('sts')",
    "reply = sts.assume_role(RoleArn='arn:aws:iam::123456789012:role/raw-reader', RoleSessionName='etl-run-1', DurationSeconds=900)",
    "keys = reply['Credentials']",
    "s3 = boto3.client('s3', aws_access_key_id=keys['AccessKeyId'],",
    "                  aws_secret_access_key=keys['SecretAccessKey'],",
    "                  aws_session_token=keys['SessionToken'])"
  ].join('\n');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'IAM: identities, policies and roles', short: 'IAM', blurb: 'Signing, policies, the evaluation rule, roles, temporary credentials and cross-account access', minutes: 42,
    focus: ['sf', 'qual'],
    goals: [
      'Tell **users, roles and sessions** apart, and say why jobs use roles.',
      'Read a **policy**: effect, action, resource, condition, principal.',
      'Apply the **evaluation rule**: explicit deny, then limits, then an allow.',
      'Write an **S3 policy** with the right ARNs, and debug an **AccessDenied**.',
      'Explain **AssumeRole**, a **trust policy**, **temporary credentials** and **cross-account** access.'
    ],
    say: 'Mission 3 is IAM, the service that decides every request. Every AWS call carries a signature that says who is calling, and then IAM answers one question: may this caller do this action on this resource? Most production problems with AWS data platforms are IAM problems, so this mission has the most hands-on screens. The signing, the ten decisions and the policy checks are recorded. The rules for layers I could not run come from documentation.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, src: 'docs', title: 'Who is calling',
        say: 'IAM knows several kinds of caller. Press Next for each, and notice which ones should do the work of a data platform.',
        items: [
          ['The root user', 'The identity that created the account. It can do everything and cannot be limited by IAM policies. Protect it with a hardware key, do not make access keys for it, and use it only for the few tasks that need it.', 'Locked away after setup.'],
          ['IAM users', 'A user has a name and can have long-term access keys. Long-term keys do not expire, leak into code and logs, and are hard to track. People should sign in through IAM Identity Center instead, and jobs should use roles.', 'Avoid them.'],
          ['IAM roles', 'A role has permissions and no password or keys of its own. A caller **assumes** the role and receives **temporary credentials** that expire. Glue jobs, Lambda functions, CI pipelines and people all work through roles.', 'The identity of a job.'],
          ['Sessions', 'When you assume a role you get a session with a name, such as `etl-run-1`. The session ARN, `arn:aws:sts::123456789012:assumed-role/raw-reader/etl-run-1`, appears in CloudTrail, so the name should say who or what is acting.', 'The record of who acted.'],
          ['Service principals', 'AWS services such as `glue.amazonaws.com` are principals too. A role names the service that may assume it in its trust policy. That is how a Glue job gets its role.', 'Services assume roles too.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm3-sig-lab', kind: 'sigv4', t: 2, src: 'rec', title: 'Lab: how a request is signed' }),

      B.talk({
        id: 'm3-sig', t: 2, src: 'rec', title: 'What the signature gives you',
        say: 'The lab showed the mechanics. Here is what to take from it. Press Next for each point.',
        items: [
          ['Proof without sending the secret', 'The signature is made with a key derived from your secret key, and the secret key never leaves the machine. AWS holds the same secret, repeats the calculation and compares. The recorded signature equals the one printed in the AWS documentation, and so did my own HMAC chain in two languages.', 'The proof travels, the secret does not.'],
          ['A request cannot be changed on the way', 'The signature covers the method, the path, the query, the signed headers and the hash of the body. Changing any of them gives a different signature. The lab changed one character of the secret, the date, the Region, one header and one signed header, and every signature was different.', 'Tampering breaks the signature.'],
          ['The date is part of it', 'AWS rejects a request whose timestamp is more than a few minutes away from its own clock. A server with a wrong clock sees `SignatureDoesNotMatch` or a request-expired error that has nothing to do with permissions.', 'Check the clock before the policy.'],
          ['You rarely do it yourself', 'The SDKs and the CLI sign every call. You meet signing when you build a presigned URL, call an API from a language without an SDK, or debug `SignatureDoesNotMatch`. A wrong secret, an extra proxy header, a wrong Region or a clock that is off are the usual causes.', 'Know it, so the error is not a mystery.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm3-policy', t: 1, src: 'rec', title: 'Reading a policy', file: 'read_curated.json', lang: 'json', code: READ,
        steps: [
          { say: 'An identity policy is a JSON document with a version and a list of statements. This one lets a role read the curated zone. It is one of the policies in the recorded run, and the linter parliament found nothing wrong with it.', lines: null },
          { say: '`Effect` is `Allow` or `Deny`. `Action` names the API call, written as the service, a colon, and the call: `s3:GetObject`. A list is fine, and `s3:*` means all S3 actions.', lines: G.span(READ, /"Sid": "ReadCurated"/, /"Action": "s3:GetObject"/) },
          { say: '`Resource` says on what. An **object** has its own ARN: the bucket ARN, a slash and the key. `curated/*` matches every key under `curated/`. This statement lets the role read objects there and nothing else.', lines: G.span(READ, /"Resource": "arn:aws:s3:::brewline-lake\/curated\/\*"/) },
          { say: 'A second statement lets the role list the bucket. Listing is an action on the **bucket**, so its ARN has no key and no slash. This is the most common mistake in S3 policies. The next screens show it.', lines: G.span(READ, /"Sid": "ListTheBucket"/, /"Resource": "arn:aws:s3:::brewline-lake"$/) }
        ],
        note: 'A statement can also have a `Principal`, which names who it applies to, and a `Condition`, which narrows when it applies. A policy attached to a role or user has no `Principal`, because the attachment says who. A policy attached to a bucket needs one.'
      }),

      B.cmp({
        id: 'm3-types', t: 1, src: 'docs', title: 'Six kinds of policy',
        say: 'IAM has several kinds of policy. Press Next to read them. The key question for each: does it grant permissions, or only limit them?',
        cols: ['Kind', 'Attached to', 'Grants or limits', 'Typical use'],
        hl: 2,
        rows: [
          ['Identity-based policy', 'A user, group or role', 'Grants', 'What this role may do.'],
          ['Resource-based policy', 'A resource, such as a bucket, a key or a queue', 'Grants', 'Who may use this resource, including other accounts.'],
          ['Permissions boundary', 'A user or role', 'Limits', 'A ceiling for roles that developers create for themselves.'],
          ['Service control policy', 'An organization, a unit or an account', 'Limits', 'Guardrails: no leaving the organization, only some Regions.'],
          ['Session policy', 'One role session, passed when assuming', 'Limits', 'A narrower session from a broad role.'],
          ['VPC endpoint policy', 'A VPC endpoint', 'Limits', 'Which buckets and actions may pass through this endpoint.']
        ],
        steps: [
          { upto: 2, say: 'The two that grant. A caller gets access from an identity policy, a resource policy, or both.' },
          { upto: 5, say: 'The three that limit. They never give permissions. They remove permissions that another policy would grant.' },
          { upto: 6, say: 'The endpoint policy limits what can pass through a private path. Mission 10 uses it.' }
        ],
        pick: 'Remember the split: **identity and resource policies grant. Boundaries, SCPs, session policies and endpoint policies limit.** A request needs a grant that no limit takes away and no deny cancels.'
      }),

      B.flow({
        id: 'm3-eval', t: 1, src: 'docs', title: 'How AWS decides a request', g: 'iam', legend: true,
        steps: [
          { say: 'Every request goes through the same path. Press Next to follow one. The order matters, because a deny stops it early.', cap: 'One path for every request.' },
          { say: 'Step 1. The request says who calls, which action, and on which resource. In this example, a role session calls `s3:GetObject` on an object.', on: ['i1'], focus: ['rq', 'au'], cap: 'Who, what, on which resource.' },
          { say: 'Step 2. AWS checks the signature, or the session token. A request that is not signed is refused before any policy is read.', on: ['i1'], focus: ['au'], cap: 'Authentication first.' },
          { say: 'Step 3. Is there an **explicit deny** in any policy that applies? If yes, the answer is deny, and nothing else is looked at. A deny overrides every allow.', on: ['i2'], focus: ['dn'], tags: ['tg_deny'], cap: 'An explicit deny always wins.' },
          { say: 'Step 4. If the account is in an organization, the service control policy must allow the action. An SCP never grants. It sets the maximum.', on: ['i3'], focus: ['sc'], cap: 'The organization can cap what the account may do.' },
          { say: 'Step 5. A permissions boundary and a session policy, if there are any, must allow the action too. They cap what an identity policy can grant.', on: ['i4'], focus: ['bd'], cap: 'More limits, if present.' },
          { say: 'Step 6. Now AWS looks for an allow, in the identity policy or the resource policy. In the same account, one of them is enough. Across accounts, both are needed. Found: allow. Not found: deny, the default.', on: ['i5', 'i6', 'i7'], focus: ['al', 'ok', 'no'], cap: 'No allow means deny.' }
        ]
      }),

      B.widget({ id: 'm3-eval-lab', kind: 'evaluator', t: 1, src: 'rec', title: 'Lab: allow or deny' }),

      B.cmp({
        id: 'm3-truth', t: 1, src: 'rec', title: 'Ten real requests',
        say: 'These are the ten requests from the lab, as the emulator answered them with real IAM policies. Press Next to read them in three groups. HTTP 403 with `AccessDenied` is the answer for every deny.',
        cols: ['Caller', 'Request', 'Answer', 'Why'],
        hl: 2,
        rows: TRUTH.map(function (r) { return [r.who, '`' + r.action + '` on ' + r.resource, r.result === 'allow' ? 'allow' : '**deny** (' + r.status + ')', r.why + '.']; }),
        steps: [
          { upto: 6, say: 'The analyst, with a read policy and a deny. The cases: allow, implicit deny, a write, an explicit deny, a list, another bucket.' },
          { upto: 8, say: 'The same actions with policies that name the wrong kind of ARN. This is the classic mistake, and it looks exactly like a missing permission.' },
          { upto: 10, say: 'A role session with temporary credentials. The session gets the permissions of the role and no more.' }
        ],
        pick: 'When a request is denied, ask **which statement should have allowed it, and why it did not match**. Wrong ARN shape, wrong action name and a missing resource are the usual answers.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This policy was meant to let a role read the curated zone and list the bucket. Both calls get AccessDenied. Click a line that is wrong.',
        file: 'wrong_arns.json', lang: 'json', code: WRONG, bad: [G.at(WRONG, /"Resource": "arn:aws:s3:::brewline-lake"$/), G.at(WRONG, /"Resource": "arn:aws:s3:::brewline-lake\/\*"/)],
        hint: 'Objects and buckets have different ARNs. Check which action goes with which ARN.',
        why: 'The first statement allows `s3:GetObject`, an action on objects, but names the bucket ARN, so no object matches. The second allows `s3:ListBucket`, an action on the bucket, but names the object ARN, so the bucket does not match. In the recorded run both calls were denied with HTTP 403. The linter parliament flags both: ' + LINT.wrong_arns.map(function (f) { return '`' + f.issue + '` ' + f.detail; }).join(' and ') + '.',
        fix: READ,
        cheer: 'Match the action to the right ARN. Reading actions and resources together is how you debug IAM.'
      }),

      B.code({
        id: 'm3-assume', t: 1, src: 'rec', title: 'Assuming a role', file: 'assume_role.py', lang: 'python', code: ASSUMECODE,
        steps: [
          { say: 'A caller that is allowed to assume a role asks the Security Token Service for a session. The call needs the role ARN, a name for the session and, optionally, how long the session should last.', lines: [1, 2] },
          { say: 'The reply holds temporary credentials. In the recorded run the access key started with `' + ASSUME.access_key_prefix + '` (long-term keys start with `AKIA`), and there was a session token, which the SDK must send with every request. The credentials expire: I asked for ' + ASSUME.requested_duration_seconds + ' seconds.', lines: [3, 3] },
          { say: 'You build a client with all three values. This client acts as the role, and the policies of the role decide every call. In the lab, the same role could read `raw/` and could not read `curated/`.', lines: [4, 6] }
        ],
        note: 'The response held these fields: ' + ASSUME.response_fields.join(', ') + '. The assumed role user ARN was `' + ASSUME.assumed_role_user_arn + '`. A real session can last from 15 minutes up to the maximum session duration of the role, which is 1 hour by default and at most 12 hours. A role that assumes another role is limited to 1 hour (documentation).'
      }),

      B.code({
        id: 'm3-trust', t: 1, src: 'rec', title: 'Two documents on every role', file: 'trust_account.json', lang: 'json', code: TRUST,
        steps: [
          { say: 'A role has two kinds of policy, and people confuse them. The **trust policy** says who may assume the role. The **permissions policies** say what the role may do once assumed.', lines: null },
          { say: 'This trust policy lets principals of the account `123456789012` assume the role. Any identity in that account whose own policy allows `sts:AssumeRole` for this role can do it. This is the trust policy of the `raw-reader` role in the recorded run.', lines: G.span(TRUST, /"Principal"/, /"Action": "sts:AssumeRole"/) },
          { say: 'The trust policy of a Glue job role looks different: its principal is the service `glue.amazonaws.com`, which is how the Glue service gets to use the role. A role that nobody trusts cannot be used by anybody, however generous its permissions.', lines: null }
        ],
        note: 'The trust policy of a Glue job role: ' + TRUSTGLUE.replace(/\s+/g, ' ') + ' When a call fails with "not authorized to perform sts:AssumeRole", read the trust policy first.'
      }),

      B.talk({
        id: 'm3-passrole', t: 2, src: 'docs', title: 'iam:PassRole',
        say: 'One permission puzzles people: `iam:PassRole`. Press Next to see what it is for.',
        items: [
          ['What it is', 'When you create a Glue job, a Lambda function or a state machine, you tell the service which role to use. `iam:PassRole` is the permission to hand that role to the service. It is checked at creation time, not when the job runs.', 'Permission to give a role to a service.'],
          ['Why it exists', 'Without it, anyone who can create a Lambda function could attach an administrator role to it and run code as that role. `PassRole` lets you control which roles each person may hand to which services.', 'It stops privilege escalation.'],
          ['How to scope it', 'Allow `iam:PassRole` only on the ARNs of the roles a person needs, such as `brewline-glue-etl`, and add the condition `iam:PassedToService` with the service name. Never allow it on `*`.', 'A named role and a named service.'],
          ['The usual error', 'A pipeline that creates Glue jobs fails with "not authorized to perform iam:PassRole on resource ...". The fix is a statement that allows it for that role, in the identity that creates the job, not in the role itself.', 'Fix it in the creator, not in the role.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm3-least', t: 2, src: 'docs', title: 'Narrowing a list permission', file: 'list_prefix.json', lang: 'json', code: LISTPREFIX,
        steps: [
          { say: 'An analyst may read `curated/`. Listing is an action on the whole bucket, so a plain allow would let the analyst list every key, including `raw/`. A condition fixes that.', lines: null },
          { say: 'The condition key `s3:prefix` is the prefix the caller puts in the list request. `StringLike` with `curated/*` allows listing only when the request names a prefix under `curated/`. A request with no prefix is denied.', lines: G.span(LISTPREFIX, /"Sid": "ListOnlyCuratedFolders"/, /"Condition"/) },
          { say: 'The read statement stays on the object ARN. Together, the analyst can list and read `curated/` and sees nothing else.', lines: G.span(LISTPREFIX, /"Sid": "ReadCurated"/, /"Resource": "arn:aws:s3:::brewline-lake\/curated\/\*"/) }
        ],
        note: 'The emulator does not evaluate conditions, so this behaviour is from documentation and was not recorded. The linter checked the action and resource names. Common condition keys: `aws:PrincipalOrgID` (any account of my organization), `aws:SecureTransport`, `aws:SourceVpce` (only through a given endpoint), `aws:RequestedRegion`.'
      }),

      B.code({
        id: 'm3-oidc', t: 2, src: 'docs', title: 'A deploy role for GitHub Actions, with no stored keys', file: 'trust_github.json', lang: 'json', code: OIDC,
        steps: [
          { say: 'A pipeline needs access to AWS. Do not store an access key in the CI secrets. Register the identity provider of GitHub in IAM and let the pipeline trade its short-lived token for a role session.', lines: null },
          { say: 'The principal is the OpenID Connect provider that you registered in the account, and the action is `sts:AssumeRoleWithWebIdentity`. This is the trust policy of the deploy role.', lines: G.span(OIDC, /"Principal"/, /"Action": "sts:AssumeRoleWithWebIdentity"/) },
          { say: 'The `aud` claim must be `sts.amazonaws.com`, so that only tokens meant for AWS are accepted.', lines: G.span(OIDC, /"StringEquals"/, /:aud"/) },
          { say: 'The `sub` claim names the repository and the branch. This line is the one that matters. Without it, **any GitHub repository in the world** that can present a token could assume the role.', lines: G.span(OIDC, /"StringLike"/, /:sub"/) }
        ],
        note: 'This follows the documentation of GitHub and AWS. I checked that the JSON is valid, and nothing here ran on AWS. Scope `sub` to the repository and the branch or environment that deploys, and give the role only the permissions that the deployment needs.'
      }),

      B.bug({
        id: 'm3-bug2', t: 2, src: 'docs', q: 'This trust policy was meant to let only the deployment repository assume the role. Click the line that makes it far too open.',
        file: 'trust_github.json', lang: 'json', code: OIDC_BUG, bad: [G.at(OIDC_BUG, /:sub"/)],
        hint: 'Look at which claim names the repository.',
        why: 'The `sub` condition `repo:*` matches the token of **any repository of any owner**. Anyone with a GitHub account can write a workflow that presents a valid token and assume this role. Scope the condition to the exact repository and branch, for example `repo:brewline/data-platform:ref:refs/heads/main`.',
        fix: OIDC,
        cheer: 'A wildcard in a trust policy is a door left open.'
      }),

      B.cmp({
        id: 'm3-xacct', t: 2, src: 'docs', title: 'Sharing the lake with another account',
        say: 'A partner account needs to read part of the lake. Press Next to see what each side must do, and what an encrypted bucket adds.',
        cols: ['Where', 'What must allow it', 'Typical statement'],
        hl: 1,
        rows: [
          ['The bucket, in your account', 'A bucket policy that names the partner role', 'Allow `s3:GetObject` on `shared/*` to `arn:aws:iam::210987654321:role/partner-reader`.'],
          ['The partner account', 'An identity policy on the partner role', 'Allow `s3:GetObject` on your bucket. Both sides must allow, because the accounts differ.'],
          ['The KMS key, if the bucket uses SSE-KMS', 'The key policy, and the partner identity policy', 'Allow `kms:Decrypt` on the key. The key must be a customer managed key in the same Region. The default `aws/s3` key cannot be shared.'],
          ['Anything that limits', 'SCPs, boundaries, a VPC endpoint policy', 'A limit in either account can still block the call.']
        ],
        steps: [
          { upto: 2, say: 'Both accounts must allow the access. One side alone is a deny.' },
          { upto: 4, say: 'Encryption and limits add two more places to check when the call fails.' }
        ],
        pick: 'For a cross-account `AccessDenied` on an encrypted object, check **three places**: the bucket policy, the key policy and the identity policy of the caller. Then check for a limit in either account.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Which of these policy types can give a role permission to read an S3 object?',
        opts: [
          { t: 'A service control policy on the account', fb: 'An SCP only limits. It never grants.' },
          { t: 'A permissions boundary on the role', fb: 'A boundary only limits. It never grants.' },
          { t: 'An identity-based policy attached to the role', fb: '' },
          { t: 'A session policy passed when assuming the role', fb: 'A session policy only limits what the session can do.' }
        ],
        ok: 2, why: 'Identity-based and resource-based policies grant. The others limit. A request needs a grant that no limit takes away.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'A job role allows `s3:GetObject` on `arn:aws:s3:::brewline-lake`. It reads `curated/orders/a.parquet` and gets AccessDenied. Why?',
        opts: [
          { t: 'S3 is down in that Region', fb: 'An outage would not give AccessDenied.' },
          { t: 'The policy names the bucket ARN, and an object has its own ARN ending in `/*`', fb: '' },
          { t: 'GetObject cannot be allowed in a policy', fb: 'It can. The resource in this policy is wrong.' },
          { t: 'The role must be in the same Region as the bucket', fb: 'IAM roles are global. Regions play no part here.' }
        ],
        ok: 1, why: 'In the recorded run, a policy with this mistake was denied with HTTP 403, exactly as a missing permission would be. The fix is the object ARN `arn:aws:s3:::brewline-lake/*` or a prefix of it.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'A policy allows `s3:*` on everything and another statement denies `s3:DeleteObject` on the bucket. The role deletes an object. What happens?',
        opts: [
          { t: 'The delete works, because the allow is broader', fb: 'Breadth does not matter. A deny beats any allow.' },
          { t: 'The delete is denied, because an explicit deny wins', fb: '' },
          { t: 'IAM picks the statement that comes last', fb: 'Order in a policy does not matter.' },
          { t: 'The delete works once, then is blocked', fb: 'There is no such counter.' }
        ],
        ok: 1, why: 'In the recorded run, the analyst could read `curated/` but not `curated/orders/secret/`, because the deny matched. An explicit deny overrides every allow, in every policy, whatever the order.'
      }),

      B.quiz({
        id: 'm3-q4', t: 1,
        q: 'A job was given temporary credentials 90 minutes ago, with a one hour limit, and now every call fails with `ExpiredToken`. What is the right fix?',
        opts: [
          { t: 'Create a long-term access key for the job instead', fb: 'That trades a short expiry for a permanent secret that can leak.' },
          { t: 'Get new credentials by assuming the role again, or let the SDK refresh them', fb: '' },
          { t: 'Add `sts:*` to the role', fb: 'Permissions are not the problem. The credentials have simply expired.' },
          { t: 'Ask AWS to extend the session', fb: 'Sessions cannot be extended. You assume the role again.' }
        ],
        ok: 1, why: 'Temporary credentials expire by design. A job that runs longer than the session needs a client that refreshes them, which the SDKs do when you give them a role to assume, or a shorter job.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the debugging of an AccessDenied in a sensible order.',
        items: [
          'Read the full error: which principal, which action, which resource',
          'Check the identity policy of the principal for an allow that matches the action and the resource ARN',
          'Check the resource policy, such as the bucket policy, and for a deny',
          'Check limits: service control policy, permissions boundary, session policy, endpoint policy',
          'For encrypted data, check the KMS key policy and the `kms:` permissions',
          'Confirm with CloudTrail or the policy simulator, then change one thing at a time'
        ],
        why: 'Start with the facts in the error, then walk the layers from the identity outward. Encrypted data adds the key. Change one thing at a time, so you know which change worked.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: how does the CI pipeline get access to AWS?',
        scenario: 'The Brewline pipeline runs in GitHub Actions and deploys templates to the production account. It needs **temporary** access for a few minutes at a time. The security lead does not want secrets in the CI settings.',
        opts: [
          { t: 'An IAM user with an access key, stored in the CI secrets', d: 'Simple. Works in any CI.', lose: 'A key that never expires sits in a place many people can reach, and it leaks into logs. Rotating it is manual work that gets skipped.' },
          { t: 'The identity provider of GitHub, and a deploy role that the pipeline assumes with its short-lived token', d: 'No stored secret. The role session expires on its own.' },
          { t: 'The root user keys, so nothing ever fails for lack of permission', d: 'Fast to set up.', lose: 'IAM policies cannot limit the root user, and one leak is a full account takeover. Never do this.' }
        ],
        pick: 1,
        why: 'The pipeline proves who it is with a token that GitHub signs, and AWS exchanges it for a session that expires. There is no key to leak, rotate or forget. Scope the trust policy to the repository and branch, and give the role only the permissions the deployment needs.',
        when: 'A CI system without OpenID Connect support, such as an old on-premises server, may need long-term keys. Then rotate them on a schedule, limit them to one role through a policy, and alarm on their use from unknown places.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'docs', title: 'Incident: a leaked access key', time: '03:10',
        alert: '**AWS Health reports that an access key of the `ci-deploy` user was found in a public repository.** CloudTrail shows calls from an unknown address in the last hour: 40 virtual machines launched in a Region nobody uses, and a call to list every bucket.',
        clues: ['The key belongs to an IAM user with broad permissions', 'The calls come from an address outside the company', 'The key was committed to a repository by mistake'],
        opts: [
          { t: 'Deactivate the key now, then investigate with CloudTrail', fb: '' },
          { t: 'Delete the repository and hope nobody copied the key', fb: 'Copies and clones of the key may exist already. The key stays valid until you deactivate it.' },
          { t: 'Wait for the morning to avoid waking the team', fb: 'Every hour the attacker can launch resources and read data.' },
          { t: 'Create a second key for the user and keep both', fb: 'This adds a new secret and leaves the leaked one working.' }
        ],
        best: 0,
        why: 'Deactivating the key stops the attacker at once, and it is reversible if you were wrong. After that you can search CloudTrail for everything the key did, stop the machines it launched, and look for other changes it made, such as new users, roles or keys.',
        checks: [
          ['Stop the access', 'Deactivate the access key in IAM. Do not delete it yet, so the key id stays in the record.'],
          ['Find the damage', 'Search CloudTrail for the key id: every call, every Region. List the resources it created.'],
          ['Contain it', 'Terminate what it launched, remove any user, role or key it created, and check for new policies and trust relationships.'],
          ['Clean up', 'Remove the key from the Git history, rotate any other secret in that repository, and replace the user with a role.'],
          ['Prevent it', 'Use roles and OpenID Connect instead of long-term keys, turn on secret scanning, and add a budget alarm for unusual spend.']
        ],
        tell: 'AWS told us that an access key of our CI user was in a public repository, and CloudTrail showed an outside address launching 40 machines in an unused Region. I deactivated the key within minutes, then used CloudTrail to list everything it had done, terminated the machines and checked that it had not created users, roles or keys. We removed the key from the repository history, and replaced the CI user with a role that GitHub assumes through OpenID Connect, so no long-term key exists any more. We also added secret scanning and a budget alarm on unexpected spend.',
        prevent: ['Use **roles and web identity**, not long-term keys', 'Turn on **secret scanning** in the repository', 'Set an **SCP that denies unused Regions**', 'Add **budget and anomaly alarms** so unusual spend is noticed']
      }),

      B.incident({
        id: 'm3-inc2', t: 2, src: 'docs', title: 'Incident: the Glue job cannot read the new bucket', time: '08:20',
        alert: '**The nightly Glue job fails with AccessDenied on `s3:GetObject`**, but only for the new `curated-pii` prefix. The role has `s3:GetObject` on the whole lake bucket. The new prefix is encrypted with a customer managed KMS key, which the security team created last week.',
        clues: ['The job reads other prefixes without trouble', 'The new prefix uses SSE-KMS with a customer managed key', 'The error is AccessDenied on the GetObject call'],
        opts: [
          { t: 'Allow `kms:Decrypt` for the role in the key policy and in the role policy', fb: '' },
          { t: 'Give the role `s3:*` on every bucket', fb: 'The S3 permission was already there. A bigger S3 permission will not fix a KMS problem and breaks least privilege.' },
          { t: 'Turn off encryption on the prefix', fb: 'This removes a control that security asked for, and the failure was a missing permission, not a design flaw.' },
          { t: 'Switch the Glue job to another Region', fb: 'The Region plays no part, and the key must be in the Region of the bucket.' }
        ],
        best: 0,
        why: 'Reading an object that is encrypted with a customer managed key needs permission on the object and permission to use the key. S3 calls KMS on behalf of the caller, so the caller needs `kms:Decrypt`, and the key policy must allow it too. The default encryption with an S3 managed key needs no such permission, which is why only the new prefix failed.',
        checks: [
          ['Read the error', 'It says AccessDenied on `GetObject`, and only for the encrypted prefix.'],
          ['Find the key', '`head-object` shows `ServerSideEncryption: aws:kms` and the key ARN.'],
          ['Check the key policy', 'The key policy must allow the role, directly or through IAM, to `kms:Decrypt` and, for writes, `kms:GenerateDataKey`.'],
          ['Check the role', 'The identity policy needs the `kms:` actions on that key ARN.'],
          ['Test and record', 'Run the job again. Add the key to the role template so the next bucket works from day one.']
        ],
        tell: 'The Glue job failed with AccessDenied on one new prefix. That prefix is encrypted with a customer managed KMS key, and the job role had S3 permission but no permission to use the key. I added kms:Decrypt and kms:GenerateDataKey for that key to the role policy and confirmed that the key policy allows the role. The job ran that night. I added the key permissions to the role template, so the next encrypted prefix works from the start.',
        prevent: ['Treat **KMS permissions** as part of every encrypted data path', 'Keep **the key ARN in the role template**', 'Test a new key with the job role before the first production run', 'Add an **alarm on AccessDenied** for the pipeline roles']
      }),

      B.qa({
        id: 'qa-iam', t: 1, tag: 'IAM', secs: 60,
        q: 'Explain IAM users, roles and policies. Which would a Glue job use?',
        pts: ['A user is a long-term identity with keys', 'A role is assumed and gives temporary credentials', 'A policy is a JSON document of allow and deny statements', 'Jobs, functions and pipelines use roles', 'People sign in through Identity Center and assume roles', 'A role has a trust policy and permissions policies'],
        short: 'IAM decides who may do what. A user is a long-term identity with its own keys. A role has no keys of its own. A caller assumes the role and gets temporary credentials that expire. A policy is a JSON document of statements, each with an effect, actions, resources and optional conditions.\n\nA Glue job uses a role. The role has a trust policy that names `glue.amazonaws.com`, so the service may assume it, and permissions policies that say what the job may do, for example read `raw/` and write `clean/`. Nothing is stored in the job, and the credentials expire on their own.\n\nI avoid IAM users with keys. People sign in through IAM Identity Center and assume a role, and pipelines assume a role through web identity. If a key leaks, a user key stays valid until somebody notices, while a role session ends by itself.',
        fu: [
          ['What does the trust policy do?', 'It says who may assume the role. The permissions policies say what the role may do once someone has assumed it.'],
          ['Why not give the job an access key?', 'A long-term key does not expire, ends up in code and logs, and needs rotation. A role session expires on its own.']
        ],
        trap: 'Describing roles as "users with permissions". A role has no credentials until somebody assumes it.',
        real: 'Describe the role that your main pipeline uses and what it may touch.'
      }),

      B.qa({
        id: 'qa-eval', t: 2, tag: 'IAM', secs: 90,
        q: 'How does AWS decide whether a request is allowed?',
        pts: ['The default is deny', 'An explicit deny anywhere wins', 'Service control policies and permission boundaries limit what can be granted', 'An allow in an identity policy or a resource policy grants it', 'Same account: one allow is enough. Cross-account: both sides must allow', 'Conditions narrow when a statement applies'],
        short: 'The default is deny. AWS authenticates the request, then looks at every policy that applies. If any of them has an explicit deny that matches, the request is denied, whatever else allows it.\n\nNext come the limits. If the account is in an organization, a service control policy must allow the action. A permissions boundary and a session policy, if they exist, must allow it too. These never grant anything. They only cap what the identity policy can grant.\n\nThen AWS looks for an allow. Inside one account, an allow in the identity policy or in the resource policy is enough. Across accounts, both sides must allow. Conditions on a statement narrow when it applies, for example only over TLS or only for one prefix.\n\nIf nothing allows the request, it is denied.',
        fu: [
          ['A role has s3:* on everything and a boundary that allows only ec2. What happens on S3?', 'Denied. The boundary caps the identity policy, so the S3 permission is not effective.'],
          ['Does the order of statements matter?', 'No. All applicable statements are evaluated together, and a deny wins.']
        ],
        trap: 'Saying that the most specific policy wins. Specificity does not matter. A deny wins, and otherwise any allow that no limit blocks is enough.',
        real: 'Describe an AccessDenied you debugged and which layer caused it.'
      }),

      B.qa({
        id: 'qa-assume', t: 2, tag: 'IAM', secs: 90,
        q: 'How does a role get assumed, and what is a trust policy?',
        pts: ['The caller needs permission to call sts:AssumeRole on the role', 'The role trust policy must name the caller', 'STS returns temporary credentials with a session token', 'The session has a name, and CloudTrail records it', 'The session duration has a maximum, and role chaining is limited to one hour', 'Services, accounts and web identities can all be trusted principals'],
        short: 'A caller asks the Security Token Service to assume a role, giving the role ARN and a session name. Two things must be true. The role trust policy must name the caller, for example an account, a service or a web identity provider. And the policy of the caller must allow `sts:AssumeRole` on that role.\n\nSTS returns temporary credentials: an access key, a secret and a session token, with an expiry. The client sends all three with each call. The session gets the permissions of the role, narrowed by any session policy, and CloudTrail records the session name, so I name sessions after the job or the person.\n\nThe duration can be 15 minutes up to the maximum of the role, which is one hour by default and up to twelve. A session created by one role assuming another is limited to one hour.\n\nFor pipelines I use web identity, so there is no stored key at all.',
        fu: [
          ['What is an external ID?', 'A value that a third party must send when assuming a role in your account. It protects against the confused deputy problem, where a service is tricked into acting for the wrong customer.'],
          ['How do people use roles?', 'They sign in through IAM Identity Center, which gives them short-lived credentials for a role in each account.']
        ],
        trap: 'Fixing a failed assume by widening the role permissions. The trust policy decides who may assume. Permissions decide what they may do.',
        real: 'Describe a trust policy you wrote and what you scoped it to.'
      }),

      B.qa({
        id: 'qa-xacct', t: 2, tag: 'IAM', secs: 90,
        q: 'Another account needs to read data from your S3 lake, and the bucket is encrypted with KMS. What do you set up?',
        pts: ['A bucket policy that allows the partner role', 'An identity policy in the partner account that allows the call', 'A customer managed KMS key, with a key policy that allows the partner role', 'kms:Decrypt on the key, in the key policy and the identity policy', 'The key must be in the same Region, and the default S3 key cannot be shared', 'Check SCPs and endpoint policies on both sides, then test with a real call'],
        short: 'Both accounts must allow the access. In my account, the bucket policy names the partner role and allows `s3:GetObject` on the shared prefix. In the partner account, an identity policy on that role allows the same calls on my bucket.\n\nIf the bucket uses SSE-KMS, the key becomes a third place. It must be a customer managed key in the Region of the bucket, because the default S3 key cannot be shared. The key policy must allow the partner role to `kms:Decrypt`, and the partner identity policy needs the `kms:` actions on the key ARN as well.\n\nLimits can still block it: a service control policy or a boundary in either account, or an endpoint policy on the path. I test with a real call from the partner role and fix one layer at a time. For many partners I would look at Lake Formation or S3 Access Points, to manage the access in one place.',
        fu: [
          ['Why does it work in the same account with only an identity policy?', 'Inside one account, an allow in either the identity policy or the resource policy is enough. Across accounts both are needed.'],
          ['What do you do about object ownership?', 'With ACLs disabled and bucket owner enforced, the bucket owner owns every object, and policies alone control access.']
        ],
        trap: 'Fixing only one side. Cross-account access fails until every place on the path allows it.',
        real: 'Describe a cross-account share you set up and the check that found the missing piece.'
      }),

      B.qa({
        id: 'qa-least', t: 2, tag: 'IAM', secs: 90,
        q: 'How do you implement least privilege for a data platform without slowing the team down?',
        pts: ['A role for each job, scoped to its zone and prefix', 'Start narrow, widen from the AccessDenied evidence', 'Access Analyzer policy generation from CloudTrail, and last-accessed data', 'Conditions, such as prefix, TLS and organization', 'Permission boundaries for roles that developers create', 'Roles in templates, reviewed like code'],
        short: 'I give each job its own role, scoped to what that job touches: the raw loader writes `raw/` and nothing else, a Glue job reads `raw/` and writes `clean/`, analysts read `curated/`. The roles live in templates and are reviewed like any other code.\n\nTo avoid guessing, I start narrow and widen from evidence: the AccessDenied errors in CloudTrail show what is missing. For existing roles, IAM Access Analyzer can generate a policy from the CloudTrail activity, and the last-accessed information shows permissions that were never used and can go.\n\nI use conditions where they help: a prefix on list permissions, TLS only, my organization only. For roles that developers create themselves, a permissions boundary sets a ceiling, so a mistake cannot grant more than the team may have. An alarm on AccessDenied for pipeline roles tells me early when a change broke a path.',
        fu: [
          ['What is a permissions boundary for?', 'It caps what a role can be given, so people can create roles without being able to create an administrator.'],
          ['What do you do about wildcards?', 'I avoid `*` for resources and for actions in production, and where a service needs one, I limit it with a condition.']
        ],
        trap: 'Saying you use administrator access in development "to move fast". Roles from development tend to reach production templates.',
        real: 'Describe a policy you narrowed, and how you knew what to remove.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Policy Reader', color: '#DDD6FE',
        pts: [
          'Jobs use **roles**. People use **single sign-on**. Avoid **long-term keys**.',
          'A request is **signed**. The signature covers the method, the path, the headers and the body, and the secret never travels.',
          'A request is allowed only with **no explicit deny**, **no limit that blocks it**, and **an allow**. The default is deny.',
          '**Objects and buckets have different ARNs.** `s3:GetObject` needs `bucket/*`. `s3:ListBucket` needs `bucket`.',
          'A role has a **trust policy** (who may assume it) and **permissions policies** (what it may do). Credentials are **temporary**.',
          'Across accounts, **both sides allow**. With KMS, add the **key policy**. Pipelines use **web identity** with a scoped `sub`.'
        ],
        lines: [
          'I read the ARN before I read the permission.',
          'I give each job its own role and no stored keys.',
          'I debug one layer at a time, and I change one thing at a time.'
        ]
      })
    ]
  });
})();
