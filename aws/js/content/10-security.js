/* Mission 10: security and networking. The envelope encryption round trip with KMS, the secret versions in Secrets Manager and the Parameter Store
   types were run with boto3 and moto, an AWS emulator, and the AES-GCM step with the cryptography library. The verifier runs the code of this mission
   again against the emulator. Endpoint prices, KMS and Secrets Manager prices, endpoint policies, security groups, PII practice and the audit
   services come from documentation. Nothing here ran on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ENV = G.counts('kms.envelope'), SEC = G.counts('secrets.versions'), SSM = G.counts('ssm.parameters');
  G.expect(ENV.data_key_bytes === 32 && ENV.key_spec === 'AES_256' && ENV.round_trip_ok === true && ENV.wrong_encryption_context.code === 'InvalidCiphertextException' && ENV.key_state === 'Enabled' && ENV.rotation_enabled_by_default === false, 'the envelope round trip works, and the wrong context fails');
  G.expect(SEC.current_password === 'v2-password' && SEC.previous_password === 'v1-password' && SEC.versions.length === 2 && SEC.versions[0][0] === 'AWSCURRENT' && SEC.versions[1][0] === 'AWSPREVIOUS' && SEC.missing.code === 'ResourceNotFoundException', 'two versions with the labels AWSCURRENT and AWSPREVIOUS');
  G.expect(SSM.types['/brewline/prod/db/password'] === 'SecureString' && SSM.types['/brewline/prod/athena/workgroup'] === 'String' && SSM.secure_value_without_decryption_is_clear_text === false, 'the Parameter Store types');

  var KMS = [
    'import os',
    'import boto3',
    'from cryptography.hazmat.primitives.ciphers.aead import AESGCM',
    '',
    'kms = boto3.client("kms", region_name="us-east-1")',
    'CONTEXT = {"dataset": "orders"}',
    '',
    'data_key = kms.generate_data_key(KeyId="alias/brewline-lake", KeySpec="AES_256", EncryptionContext=CONTEXT)',
    '',
    'plain = b"order O-5001 for customer C-0001, total 11.50"',
    'nonce = os.urandom(12)',
    'blob = nonce + AESGCM(data_key["Plaintext"]).encrypt(nonce, plain, b"orders")',
    '',
    '# keep blob and data_key["CiphertextBlob"] together, and drop data_key["Plaintext"]',
    '',
    'key = kms.decrypt(CiphertextBlob=data_key["CiphertextBlob"], EncryptionContext=CONTEXT)["Plaintext"]',
    'again = AESGCM(key).decrypt(blob[:12], blob[12:], b"orders")'
  ].join('\n');

  var SECRETS = [
    'import json',
    'import boto3',
    '',
    'sm = boto3.client("secretsmanager", region_name="us-east-1")',
    '',
    'sm.create_secret(Name="brewline/redshift", SecretString=json.dumps({"username": "etl", "password": "v1-password"}))',
    'sm.put_secret_value(SecretId="brewline/redshift", SecretString=json.dumps({"username": "etl", "password": "v2-password"}))',
    '',
    'now = json.loads(sm.get_secret_value(SecretId="brewline/redshift")["SecretString"])["password"]',
    'before = json.loads(sm.get_secret_value(SecretId="brewline/redshift", VersionStage="AWSPREVIOUS")["SecretString"])["password"]'
  ].join('\n');

  var PARAMS = [
    'import boto3',
    '',
    'ssm = boto3.client("ssm", region_name="us-east-1")',
    '',
    'ssm.put_parameter(Name="/brewline/prod/athena/workgroup", Value="brewline", Type="String")',
    'ssm.put_parameter(Name="/brewline/prod/db/password", Value="s3cret", Type="SecureString")',
    '',
    'found = ssm.get_parameters_by_path(Path="/brewline/prod", Recursive=True, WithDecryption=False)["Parameters"]',
    'password = ssm.get_parameter(Name="/brewline/prod/db/password", WithDecryption=True)["Parameter"]["Value"]'
  ].join('\n');

  var SECRET_BUG = [
    'sm = boto3.client("secretsmanager")',
    'secret = sm.get_secret_value(SecretId="brewline/redshift")',
    'print("loaded secret", secret)',
    'login = json.loads(secret["SecretString"])',
    'conn = connect(user=login["username"], password=login["password"])'
  ].join('\n');
  var SECRET_FIX = SECRET_BUG.replace('print("loaded secret", secret)', 'print("loaded secret version", secret["VersionId"])');

  var ENDPOINT = [
    '{',
    '  "Version": "2012-10-17",',
    '  "Statement": [',
    '    {',
    '      "Sid": "OnlyTheLakeBucket",',
    '      "Effect": "Allow",',
    '      "Principal": "*",',
    '      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],',
    '      "Resource": [',
    '        "arn:aws:s3:::brewline-lake",',
    '        "arn:aws:s3:::brewline-lake/*"',
    '      ]',
    '    }',
    '  ]',
    '}'
  ].join('\n');

  var TRAIL = [
    'SELECT eventtime, useridentity.arn AS who, eventname, requestparameters',
    'FROM cloudtrail_logs',
    "WHERE eventsource = 's3.amazonaws.com'",
    "  AND eventname IN ('PutBucketPolicy', 'DeleteBucketPolicy', 'PutBucketAcl')",
    "  AND eventtime > '2026-03-01T00:00:00Z'",
    'ORDER BY eventtime DESC;'
  ].join('\n');

  var MASK = [
    'CREATE VIEW curated.customers_safe AS',
    'SELECT customer_id,',
    "       to_hex(sha256(to_utf8(email || 'pepper-from-secrets-manager'))) AS email_hash,",
    "       substr(postal_code, 1, 3) AS postal_prefix,",
    '       segment',
    'FROM curated.customers;'
  ].join('\n');

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Security and networking: KMS, secrets, endpoints and PII', short: 'Security', blurb: 'Envelope encryption, secrets, VPC endpoints and security groups, PII handling, deletion and audit', minutes: 50,
    focus: ['qual', 'sf'],
    goals: [
      'Explain **envelope encryption**, and why the **encryption context** must match.',
      'Keep secrets in **Secrets Manager or Parameter Store**, and keep them out of code and logs.',
      'Choose between a **gateway endpoint, an interface endpoint and a NAT gateway**.',
      'Protect **PII** with masking and column grants, and delete a person from the lake.',
      'Use **CloudTrail, Config, GuardDuty and Macie** to see what happened.'
    ],
    say: 'Mission 10 is how you keep data safe once the pipelines work. Identity was mission 3. Here are the other layers: the keys that encrypt the data, the secrets that jobs need, the network paths between jobs and services, the personal data that must be protected and deleted, and the records that say who did what. The encryption round trip and the secret versions ran against an emulator. The network and audit parts come from documentation.',
    scenes: [
      B.talk({
        id: 'm10-talk', t: 1, src: 'docs', title: 'The layers of a secure data platform',
        say: 'No single control keeps a lake safe. Press Next for the layers, and where each is covered.',
        items: [
          ['Identity', 'Who may call what. Roles with least privilege, short-lived credentials, a deny that always wins (mission 3).', 'Who you are.'],
          ['Data', 'Encryption at rest and in transit, masking of personal data, column and row grants, and deletion (this mission and mission 4).', 'What the bytes show.'],
          ['Network', 'Which paths exist between jobs and services. Private subnets, endpoints, security groups, no public addresses for workers (this mission).', 'Where the traffic goes.'],
          ['Secrets', 'Passwords and tokens that jobs need. Kept in a secret store, fetched at run time, rotated, and never written to code, logs or Git.', 'What a job must know.'],
          ['Detection and audit', 'A record of every API call, rules that check the configuration, and alerts for odd behaviour (this mission).', 'What happened, and who did it.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm10-flow', t: 1, src: 'docs', title: 'Three paths out of a private subnet', g: 'net', legend: true,
        steps: [
          { say: 'Glue, Lambda and EMR workers sit in a private subnet with no public address. Press Next for the three paths they can use.', cap: 'Workers have no public address.' },
          { say: 'Path 1. S3 through a gateway endpoint. It is a route table entry, it is free, and the traffic stays on the AWS network.', on: ['n1', 'n2'], focus: ['wk', 'gw', 's3'], cap: 'S3: gateway endpoint, free.' },
          { say: 'Path 2. Other AWS services, such as Kinesis, STS and Secrets Manager, through interface endpoints. An endpoint is a network interface in your subnet. It has an hourly fee and a data fee.', on: ['n3', 'n4'], focus: ['wk', 'ie', 'svc'], cap: 'AWS services: interface endpoints.' },
          { say: 'Path 3. The internet, for package indexes and partner APIs, through a NAT gateway in a public subnet and the internet gateway. It has an hourly fee and a data fee, and it is the most expensive path.', on: ['n5', 'n6', 'n7'], focus: ['wk', 'nat', 'igw', 'net'], cap: 'The internet: NAT, the dear path.' }
        ]
      }),

      B.cmp({
        id: 'm10-paths', t: 1, src: 'docs', title: 'Gateway endpoint, interface endpoint or NAT gateway',
        say: 'Three ways to leave a private subnet. Press Next to compare them. The prices are example US rates from public price lists, and AWS changes them.',
        cols: ['Path', 'Reaches', 'How it works', 'Cost'],
        hl: 3,
        rows: [
          ['Gateway endpoint', 'S3 and DynamoDB', 'An entry in the route table that sends their addresses to the endpoint.', 'Free.'],
          ['Interface endpoint (PrivateLink)', 'Most other AWS services, and services of other accounts', 'A network interface with a private address in your subnet, and private DNS for the service name.', 'About $0.01 for each hour and each availability zone, and about $0.01 for each GB.'],
          ['NAT gateway', 'The internet', 'A managed gateway in a public subnet. Workers send traffic to it, and it sends the traffic out.', 'About $0.045 for each hour and about $0.045 for each GB.']
        ],
        steps: [
          { upto: 1, say: 'The gateway endpoint for S3 is free, and it should be in every VPC that runs data jobs. Mission 1 showed a bill of $4,100 without one.' },
          { upto: 2, say: 'Interface endpoints cost less than NAT per GB, and they add an hourly fee in every zone. They also keep the traffic off the internet, which some policies require.' },
          { upto: 3, say: 'NAT is the path for everything that is not an AWS service. Send as little through it as you can.' }
        ],
        pick: 'Create the **S3 gateway endpoint** first. Add **interface endpoints** for the services that carry the most traffic or that policy keeps off the internet. Leave **NAT** for the rest.'
      }),

      B.cmp({
        id: 'm10-sg', t: 2, src: 'docs', title: 'Security groups and network ACLs',
        say: 'Two firewalls work at different levels. Press Next to compare them.',
        cols: ['Question', 'Security group', 'Network ACL'],
        hl: 1,
        rows: [
          ['Where does it apply?', 'To a network interface, for example of a Glue connection, an endpoint or a Redshift node.', 'To a subnet, for all traffic that enters or leaves it.'],
          ['Stateful?', 'Yes. A reply to an allowed request is allowed automatically.', 'No. Replies need their own rule.'],
          ['What can a rule do?', 'Allow only. Everything not allowed is denied.', 'Allow or deny, checked in order of rule number.'],
          ['Typical use for data jobs', 'Allow HTTPS (443) from the job security group to the endpoint security group. Allow a Redshift port only from the job group.', 'Rarely changed. The default allows everything.']
        ],
        steps: [
          { upto: 2, say: 'The levels, and what each remembers.' },
          { upto: 4, say: 'Allow-only rules by group, and a default network ACL that stays out of the way.' }
        ],
        pick: 'Write **security group rules that name another security group**, not address ranges. A new job joins the group and gets the access, and nobody edits a CIDR list.'
      }),

      B.code({
        id: 'm10-endpoint', t: 2, src: 'docs', title: 'An endpoint policy for the S3 gateway endpoint', file: 'endpoint_policy.json', lang: 'json', code: ENDPOINT,
        steps: [
          { say: 'A gateway endpoint can carry a policy. It limits what can pass through this endpoint, on top of the IAM policy of the caller and the bucket policy. The default policy allows everything.', lines: null },
          { say: 'This policy allows only three S3 actions, and only on the lake bucket and its objects. A job in the VPC cannot copy data to a bucket in another account through this endpoint.', lines: G.span(ENDPOINT, /"Sid"/, /"Resource": \[/) },
          { say: 'Both ARNs are needed: the bucket ARN for `s3:ListBucket` and the object ARN, ending in `/*`, for reads and writes (mission 3).', lines: G.span(ENDPOINT, /"arn:aws:s3:::brewline-lake",/, /"arn:aws:s3:::brewline-lake\/\*"/) }
        ],
        note: 'Test an endpoint policy before you roll it out. Some services, such as Glue and EMR, read from buckets that AWS owns, and a policy that does not allow them makes jobs fail. The policy was checked for JSON syntax and action names by the verifier. It did not run on AWS.'
      }),

      B.talk({
        id: 'm10-envelope', t: 1, src: 'rec', title: 'Envelope encryption',
        say: 'KMS encrypts only small data directly. For big data it hands out a data key. Press Next for the pattern, and the numbers of a recorded run.',
        items: [
          ['A data key for each object or file', '`GenerateDataKey` returns a new key twice: in plain text and encrypted under the KMS key. In the recording it was ' + ENV.data_key_bytes + ' bytes, for the cipher ' + ENV.key_spec + '.', 'One key, two forms.'],
          ['Encrypt locally', 'The caller encrypts the data on its own machine with the plain key, here with AES-GCM, and then forgets the plain key.', 'KMS never sees the data.'],
          ['Store the encrypted key with the data', 'The encrypted data key travels next to the encrypted data. To read the data, the caller asks KMS to decrypt the data key, and then decrypts the data locally. Only someone who may use the KMS key can do it.', 'The key policy controls the data.'],
          ['The encryption context', 'A small set of name and value pairs that you pass in on both calls. KMS binds it to the data key. In the recording, a decrypt with the context `{"dataset": "customers"}` instead of `{"dataset": "orders"}` failed with `' + ENV.wrong_encryption_context.code + '`. The context also appears in CloudTrail, so it is useful for audit.', 'A label that must match.'],
          ['How S3 uses it', 'With SSE-KMS, S3 does this for every object. You see none of it, except in the key policy, in CloudTrail and in the bill.', 'S3 does the same dance.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-kms', t: 1, src: 'rec', title: 'Envelope encryption in code', file: 'envelope.py', lang: 'python', code: KMS,
        steps: [
          { say: 'The encryption context is the same on both calls. Here it names the dataset.', lines: G.span(KMS, /^CONTEXT/) },
          { say: 'Ask KMS for a data key under the key with the alias `brewline-lake`. The reply holds `Plaintext` and `CiphertextBlob`.', lines: G.span(KMS, /data_key = kms\.generate_data_key/) },
          { say: 'Encrypt the data locally with AES-GCM. The nonce must be new for every message. The dataset name is also bound to the ciphertext as extra authenticated data.', lines: G.span(KMS, /^plain = /, /^blob = /) },
          { say: 'Keep the encrypted data in `blob` and the encrypted key in `CiphertextBlob`, and drop the plain key. A stored plain key would defeat the whole design.', lines: G.span(KMS, /^# keep blob/) },
          { say: 'Later, ask KMS to decrypt the data key, with the same context, and decrypt the data. This call is where the key policy and the IAM policy are checked.', lines: G.span(KMS, /^key = kms\.decrypt/, /^again = /) }
        ],
        note: 'The verifier ran this code against moto, an emulator, and checked that the round trip returns the original bytes, that the data key has 32 bytes, and that a different context is refused with `InvalidCiphertextException`. The key policy and the permission checks of real KMS were not part of that run.'
      }),

      B.quiz({
        id: 'm10-q1', t: 1, src: 'rec',
        q: 'In the recorded run, the data key was created with the context `{"dataset": "orders"}`. A decrypt call used `{"dataset": "customers"}`. What happened?',
        opts: [
          { t: 'It worked, because the key is the same', fb: 'The context is bound to the data key. A different context is a different request.' },
          { t: 'It failed with InvalidCiphertextException', fb: '' },
          { t: 'It returned the data of the customers dataset', fb: 'KMS does not hold the data. It only decrypts the data key.' },
          { t: 'It returned an empty key', fb: 'There is no partial result. The call raises an error.' }
        ],
        ok: 1, why: 'KMS requires the same encryption context on decrypt as on encrypt. A mismatch fails with `' + ENV.wrong_encryption_context.code + '`. You can also write key policy conditions on the context, so that a role may decrypt only the data of one dataset.'
      }),

      B.cmp({
        id: 'm10-sse', t: 1, src: 'docs', title: 'Encryption of S3 data at rest',
        say: 'S3 offers several ways to encrypt at rest. Press Next to compare them. Mission 2 introduced the first two.',
        cols: ['Option', 'Who holds the key', 'Use it when'],
        hl: 2,
        rows: [
          ['SSE-S3', 'S3 manages the key. Every new object is encrypted with it by default.', 'You need encryption and nothing more. No setup, no extra cost.'],
          ['SSE-KMS', 'A KMS key. A key policy says who may use it, and CloudTrail records every use.', 'You need your own key, an audit trail of use, or the ability to disable the key.'],
          ['DSSE-KMS', 'A KMS key, with two layers of encryption.', 'A rule asks for two layers.'],
          ['SSE-C', 'You send the key with every request. S3 does not store it.', 'Rare. You manage and send the key yourself.'],
          ['Client-side', 'Your code encrypts before the upload, as in the envelope example.', 'Data must be unreadable even to the storage service.']
        ],
        steps: [
          { upto: 2, say: 'SSE-S3 is the default. SSE-KMS adds control and an audit trail.' },
          { upto: 5, say: 'The rarer options for special rules.' }
        ],
        pick: 'Use **SSE-S3** for ordinary data and **SSE-KMS with a bucket key** for data that needs a key policy and an audit trail. Turn on **key rotation** for customer managed keys, which is off by default.'
      }),

      B.talk({
        id: 'm10-kmsmodel', t: 2, src: 'docs', title: 'How KMS decides who may use a key',
        say: 'A KMS key has its own policy. Press Next for the rules that surprise people.',
        items: [
          ['The key policy is the root', 'Every KMS key has a key policy. A key policy that allows the account root principal lets IAM policies in the account grant access to the key. Without that statement, IAM policies are not enough, and only the key policy decides.', 'Key policy first.'],
          ['Both sides for cross-account use', 'The key policy of the owner account must allow the other account, and an identity policy in the other account must allow the role (mission 3).', 'Both accounts allow.'],
          ['Grants', 'A grant gives a service temporary permission to use a key, without editing the key policy. Services such as Glue and EBS use grants for you.', 'Short permission for a service.'],
          ['Aliases', 'An alias such as `alias/brewline-lake` is a name for a key. Code and policies can use the alias, so the key behind it can change.', 'Names, not ids.'],
          ['Rotation', 'Automatic rotation of a customer managed key replaces the key material every year by default, and old material stays available for decrypting old data. It is off by default, so you switch it on.', 'Turn it on.'],
          ['What it costs', 'About $1 a month for each customer managed key, and about $0.03 for every 10,000 requests in the US East example. S3 Bucket Keys let S3 reuse a key for many objects, and the documentation says they can cut KMS request traffic by up to 99 %.', 'Requests are the real cost.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: SSE-S3 or SSE-KMS for the curated bucket?',
        scenario: 'The curated bucket holds customer data that the security team wants to **audit**: who read which files, and the ability to **switch off access quickly**. The bucket sees about **200 million requests a month**. Example price: **$0.03 for each 10,000 KMS requests**.',
        opts: [
          { t: 'SSE-S3, the default', d: 'No setup, no extra cost.', lose: 'There is no key policy to switch off and no per-key audit trail. It does not meet the stated need.' },
          { t: 'SSE-KMS with a customer managed key, without bucket keys', d: 'A key policy, an audit trail and a switch to disable it.', lose: 'If every request calls KMS, 200 million requests cost about $600 a month, and heavy workloads can hit KMS request limits.' },
          { t: 'SSE-KMS with a customer managed key and S3 Bucket Keys', d: 'The same control and audit. With up to 99 % fewer KMS requests, the cost is closer to $6 a month.' }
        ],
        pick: 2,
        why: 'The need is audit and control, which only a customer managed key gives. The cost of KMS requests is the drawback, and bucket keys remove most of it.',
        when: 'Choose SSE-S3 when no one asks for a key policy or an audit trail. For data with strict rules, ask whether the rule needs a customer managed key at all, because many rules are met by SSE-S3 and good IAM.'
      }),

      B.order({
        id: 'm10-ord', t: 1, q: 'Put the steps of encrypting a new bucket with your own key in order.',
        items: [
          'Create the KMS key with a key policy, and an alias',
          'Switch on automatic rotation of the key',
          'Set SSE-KMS with the alias and S3 Bucket Keys as the default encryption of the bucket',
          'Give the job roles permission to use the key, in the key policy or the role policy',
          'Write and read an object with a job role to test the whole path',
          'Alarm on KMS errors and on changes to the key policy'
        ],
        why: 'The key comes first. The bucket default and the permissions follow. A test with the real job role finds a missing permission before a nightly job does, and the alarms watch the key afterwards.'
      }),

      B.talk({
        id: 'm10-secrets', t: 1, src: 'docs', title: 'Where secrets live',
        say: 'Jobs need passwords and tokens. Press Next for the rules.',
        items: [
          ['Not in code, not in Git, not in logs', 'A secret in a repository is a secret that many people and tools can read for years. A secret in a log is readable by everyone who can read the log.', 'Keep it out of text.'],
          ['Roles before secrets', 'Between AWS services, use IAM roles and no password. A secret is for things outside IAM: a database password, an API token of a partner.', 'Most access needs no secret.'],
          ['A secret store', 'Secrets Manager stores secrets, encrypts them with KMS, versions them with labels, and can rotate them with a function. Parameter Store holds values too, with a free standard tier, and a `SecureString` type for encrypted values.', 'Fetched at run time.'],
          ['Rotation', 'Change secrets on a schedule and after any leak. With versions, a running job can still use the previous value while the new one spreads.', 'Secrets expire.'],
          ['Least privilege', 'A role may read the secrets it needs, by name or path, and no others. Alarm when anyone reads a secret outside the usual roles.', 'Name the secrets in the policy.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-sm', t: 1, src: 'rec', title: 'Secrets Manager: versions and labels', file: 'secrets.py', lang: 'python', code: SECRETS,
        steps: [
          { say: 'Create a secret that holds a small JSON text with a user and a password.', lines: G.span(SECRETS, /sm\.create_secret/) },
          { say: 'Put a new value. Secrets Manager keeps the old value as a previous version and moves the label `AWSCURRENT` to the new one.', lines: G.span(SECRETS, /sm\.put_secret_value/) },
          { say: 'A read without a stage returns `AWSCURRENT`. In the recording it returned `' + SEC.current_password + '`.', lines: G.span(SECRETS, /^now = /) },
          { say: 'A read with `VersionStage="AWSPREVIOUS"` returns the value before the change, here `' + SEC.previous_password + '`. During a rotation, jobs that still hold the old value keep working for a while.', lines: G.span(SECRETS, /^before = /) }
        ],
        note: 'In the recording the secret had two versions, one labelled `AWSCURRENT` and one `AWSPREVIOUS`, and a read of a secret that does not exist failed with `' + SEC.missing.code + '`.'
      }),

      B.cmp({
        id: 'm10-ssm', t: 2, src: 'rec', title: 'Secrets Manager or Parameter Store',
        say: 'Both store values for jobs. Press Next to compare them. The Parameter Store facts include a recorded check.',
        cols: ['Question', 'Secrets Manager', 'Parameter Store'],
        hl: 1,
        rows: [
          ['Best for', 'Passwords, tokens and keys that rotate.', 'Settings such as a workgroup name, and small secrets.'],
          ['Rotation', 'Built in, with rotation functions for common databases.', 'None built in.'],
          ['Versions', 'Labels such as AWSCURRENT and AWSPREVIOUS.', 'A version number for each change.'],
          ['Types', 'One secret value.', 'String, StringList and SecureString. In the recording the workgroup name was a `String` and the password a `SecureString`.'],
          ['Cost', 'About $0.40 for each secret each month, and a small fee for each 10,000 calls.', 'The standard tier is free. Advanced parameters cost a little.'],
          ['Reading', '`get_secret_value`.', '`get_parameter` with `WithDecryption=True` for a SecureString. Without it you get the encrypted text, and in the recording it was not the clear text.']
        ],
        steps: [
          { upto: 2, say: 'Secrets Manager rotates. Parameter Store does not.' },
          { upto: 4, say: 'Versions and types.' },
          { upto: 6, say: 'Cost and reading. A SecureString read without decryption returns text that is not the password.' }
        ],
        pick: 'Put **passwords and tokens in Secrets Manager** and **plain settings in Parameter Store**. Give each role the **names** it needs.'
      }),

      B.code({
        id: 'm10-params', t: 2, src: 'rec', title: 'Parameter Store: String and SecureString', file: 'parameters.py', lang: 'python', code: PARAMS,
        steps: [
          { say: 'A plain setting is a `String`. Anyone who may read the parameter sees it.', lines: G.span(PARAMS, /athena\/workgroup/) },
          { say: 'A password is a `SecureString`. Parameter Store encrypts it with a KMS key.', lines: G.span(PARAMS, /db\/password", Value/) },
          { say: 'A listing by path shows names and types. With `WithDecryption=False` the value of a SecureString is the encrypted text.', lines: G.span(PARAMS, /^found = /) },
          { say: 'Decrypting needs `WithDecryption=True`, and permission to use the KMS key. A role that can read the parameter and cannot use the key gets an error, and that is the control you want.', lines: G.span(PARAMS, /^password = /) }
        ],
        note: 'In the recording, the two parameters were listed under `/brewline/prod`, with the types `String` and `SecureString`, and the encrypted value was not the clear text.'
      }),

      B.bug({
        id: 'm10-bug', t: 1, src: 'docs', q: 'A Lambda function fetches a database login from Secrets Manager. Click the line that leaks the secret.',
        file: 'login.py', lang: 'python', code: SECRET_BUG, bad: [3],
        hint: 'Where does print write in a Lambda function?',
        why: 'The output of `print` goes to CloudWatch Logs. The whole response of `get_secret_value` includes `SecretString`, so the password is now readable by everyone who can read the log group, and it stays there as long as the logs are kept. Log the version id or the name of the secret, and never the value.',
        fix: SECRET_FIX,
        cheer: 'Log the name, never the value.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1, src: 'rec',
        q: 'A password in Secrets Manager was changed once. Which label points to the new value?',
        opts: [
          { t: 'AWSPREVIOUS', fb: 'That is the label of the value before the change.' },
          { t: 'AWSCURRENT', fb: '' },
          { t: 'LATEST', fb: 'Secrets Manager has no label with that name.' },
          { t: 'The version number 2', fb: 'Versions have ids. The labels `AWSCURRENT` and `AWSPREVIOUS` are what you read by.' }
        ],
        ok: 1, why: 'A read without a stage returns `AWSCURRENT`. In the recording it returned `' + SEC.current_password + '`, and a read with `AWSPREVIOUS` returned `' + SEC.previous_password + '`.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1, src: 'docs',
        q: 'A Glue job needs the password of a database. Where do you keep it?',
        opts: [
          { t: 'In the job script, in a variable', fb: 'It would be in Git and in every copy of the script.' },
          { t: 'In an environment variable of the job, as plain text', fb: 'Anyone who can read the job definition reads the password, and it appears in tools that show job parameters.' },
          { t: 'In Secrets Manager, with the job role allowed to read that one secret', fb: '' },
          { t: 'In an S3 file next to the data', fb: 'Anyone who can read the bucket reads the password.' }
        ],
        ok: 2, why: 'The job fetches the secret at run time with its role, so the script holds only the name. The role can read only that secret. Rotation then needs no change to the job.'
      }),

      B.quiz({
        id: 'm10-q4', t: 2, src: 'docs',
        q: 'Workers send 3 TB a month to Kinesis through a NAT gateway at $0.045 for each GB. An interface endpoint in two zones costs $0.01 for each hour and zone, and $0.01 for each GB. About how much does the endpoint save in a 730 hour month? Ignore the NAT hourly fee, which you pay for other traffic anyway.',
        opts: [
          { t: 'About $9', fb: 'Far too low. Work out both bills: 3,000 GB at each per-GB price, plus the hourly fee of the endpoint.' },
          { t: 'About $90', fb: '' },
          { t: 'About $135', fb: 'That is the whole NAT data fee. The endpoint has fees of its own.' },
          { t: 'Nothing. NAT is always cheaper', fb: 'The data fee of NAT is more than four times that of the endpoint.' }
        ],
        ok: 1, why: 'Through NAT: 3,000 GB x $0.045 = $135. Through the endpoint: 3,000 GB x $0.01 = $30, plus 2 zones x 730 hours x $0.01 = $14.60, so $44.60 in all. The saving is $135 - $44.60 = $90.40. At 100 GB a month the endpoint would cost more, so the volume decides.'
      }),

      B.talk({
        id: 'm10-pii', t: 2, src: 'docs', title: 'Personal data in the lake',
        say: 'Personal data needs more than encryption. Press Next for the practices that auditors ask about.',
        items: [
          ['Find it', 'Amazon Macie scans S3 for sensitive data, such as names, e-mail addresses and card numbers, and reports where it is. You cannot protect what you have not found.', 'Know where it is.'],
          ['Collect less', 'Do not copy a column into the lake because it might be useful. A column that is not there cannot leak.', 'Minimize.'],
          ['Mask or hash before the curated layer', 'Replace an e-mail address with a salted hash, cut a postal code to a prefix, drop the name. Analysts get the shape of the data without the person.', 'Transform in the clean zone.'],
          ['Control access by column', 'Lake Formation grants `SELECT` on some columns, and Redshift supports column-level grants and masking. A role that has S3 access still sees only the columns it is granted.', 'Grants by column.'],
          ['Separate keys and zones', 'Keep the raw personal data in its own prefix or bucket with its own KMS key and a small set of roles, so a single key policy controls it.', 'A small blast radius.'],
          ['Retention and deletion', 'Keep personal data only as long as a rule allows, with a lifecycle rule, and have a tested way to delete one person from every copy.', 'Delete on schedule and on request.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-mask', t: 2, src: 'docs', title: 'A view that hides the person', file: 'customers_safe.sql', lang: 'sql', code: MASK,
        steps: [
          { say: 'The analysts do not need the e-mail address. They need to count distinct customers and join by a stable key. A view gives them that.', lines: null },
          { say: 'A salted hash of the e-mail replaces the address. The same address always gives the same hash, so joins and distinct counts work. The salt, here read from a secret store, stops anyone from guessing addresses and comparing hashes.', lines: G.span(MASK, /email_hash/) },
          { say: 'Only the first three characters of the postal code survive. It is enough for regions and not enough for a home.', lines: G.span(MASK, /postal_prefix/) },
          { say: 'Grant the analysts the view and not the table. In Lake Formation or Redshift the table keeps its column grants for the few roles that need it.', lines: G.span(MASK, /FROM curated\.customers/) }
        ],
        note: 'The statement is Athena SQL and was parsed by the verifier. The salt in the example is a placeholder: a real pipeline reads it from Secrets Manager. Hashing reduces the risk and does not remove the data from the scope of a privacy law in every case, so ask your privacy team.'
      }),

      B.talk({
        id: 'm10-delete', t: 2, src: 'docs', title: 'Deleting one person from the lake',
        say: 'A person asks you to delete their data. Press Next for what that means in a lake.',
        items: [
          ['Find every copy', 'The raw file, the clean Parquet, the curated table, the Redshift copy, the exports, the backups and the old versions in S3. A catalog and a data map tell you where to look.', 'Copies are the problem.'],
          ['Plain Parquet files', 'A Parquet file cannot lose one row. You rewrite the partition without the person, replace the files, and delete the old ones. It is slow, and it is why table formats help.', 'Rewrite the partition.'],
          ['Iceberg tables', '`DELETE FROM` removes the rows from the current table. The data files and old snapshots still hold them until you expire the snapshots and remove the files, with `VACUUM` in Athena.', 'Delete, then vacuum.'],
          ['Versions and backups', 'With S3 versioning, a delete adds a marker and keeps the old version (mission 2). Delete the versions too, and let the lifecycle rule remove old backups within the retention period.', 'Versions keep what you deleted.'],
          ['Prove it', 'Query every copy for the person afterwards, keep the evidence of the request and the result, and tell the privacy team what was done and when.', 'Check and record.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm10-audit', t: 1, src: 'docs', title: 'Seeing what happened',
        say: 'Six services give you the record, the checks and the alerts. Press Next to match each one to a question.',
        cols: ['Service', 'The question it answers', 'Detail'],
        hl: 1,
        rows: [
          ['CloudTrail', 'Who called which API, when, and from where?', 'Management events are recorded for you. Data events, such as S3 object reads, are off by default and cost extra. A trail writes to S3 for long keeping.'],
          ['AWS Config', 'Is this resource configured as the rules say?', 'It records configuration changes and checks rules, for example that buckets are not public and are encrypted.'],
          ['GuardDuty', 'Is something behaving like an attack?', 'It watches logs for unusual API calls and signs of stolen credentials. It can also watch S3 data events.'],
          ['Macie', 'Where is sensitive data in S3?', 'It scans objects and reports personal data.'],
          ['IAM Access Analyzer', 'What is shared outside my account?', 'It finds public and cross-account access, and can find unused permissions.'],
          ['Security Hub', 'What do all these tools say together?', 'It collects findings from the others and checks against security standards.']
        ],
        steps: [
          { upto: 2, say: 'The record of calls, and the check of configuration.' },
          { upto: 4, say: 'Threats and sensitive data.' },
          { upto: 6, say: 'What is shared, and one place for the findings.' }
        ],
        pick: 'Turn on **CloudTrail for the whole organization**, store it in a bucket that nobody can edit (mission 1), and query it with **Athena**. The rest add alerts on top of it.'
      }),

      B.code({
        id: 'm10-trail', t: 2, src: 'docs', title: 'Who changed the bucket policy?', file: 'cloudtrail.sql', lang: 'sql', code: TRAIL,
        steps: [
          { say: 'CloudTrail logs are JSON files in S3. A table over them lets Athena answer questions about the account. Partitioning by date and region keeps the scans small (mission 5).', lines: null },
          { say: 'The columns hold the time, the identity that called, the API name and the request. `useridentity.arn` says who.', lines: G.span(TRAIL, /SELECT eventtime/) },
          { say: 'Filter on the service and on the API names that change who can read a bucket.', lines: G.span(TRAIL, /WHERE eventsource/, /eventname IN/) },
          { say: 'And on a time range, newest first. This query is the first thing to run when a bucket turns out to be open.', lines: G.span(TRAIL, /eventtime >/, /ORDER BY/) }
        ],
        note: 'The statement is Athena SQL and was parsed by the verifier. It runs against a CloudTrail table that you create with the DDL from the CloudTrail documentation. It did not run on AWS.'
      }),

      B.quiz({
        id: 'm10-q5', t: 2, src: 'docs',
        q: 'A role has `s3:GetObject` on the whole lake bucket. Analysts must not see the e-mail column of `customers`. Which control hides the column?',
        opts: [
          { t: 'A bucket policy on the raw prefix', fb: 'It controls files. All columns are in the same Parquet file.' },
          { t: 'A column grant in Lake Formation or Redshift, or a view without the column', fb: '' },
          { t: 'A stronger KMS key', fb: 'Encryption protects data at rest. A role that may use the key reads every column.' },
          { t: 'A NAT gateway', fb: 'The network path has no knowledge of columns.' }
        ],
        ok: 1, why: 'A file holds all columns, so access to the file is access to the column. Column control needs a layer that understands tables: Lake Formation, Redshift grants, or a view that leaves the column out.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, src: 'docs', title: 'Incident: the Glue job hangs at start and times out', time: '02:20',
        alert: '**The nightly Glue job runs for 10 minutes and fails with a timeout when it tries to read the database password.** The job runs in a private subnet in a VPC connection. Nothing changed in the script. Last week the team moved the job to the VPC to reach the Redshift cluster.',
        clues: ['The log stops at the call to Secrets Manager, with a connection timeout', 'The subnet has no route to a NAT gateway and no endpoint for Secrets Manager', 'The S3 gateway endpoint exists, so reads from S3 work'],
        opts: [
          { t: 'Create an interface endpoint for Secrets Manager, with private DNS, and allow HTTPS from the job security group to the endpoint security group', fb: '' },
          { t: 'Give the job a public IP address', fb: 'Workers in a private subnet cannot get a public address, and one would break the security design.' },
          { t: 'Increase the job timeout to 60 minutes', fb: 'The call never reaches Secrets Manager. A longer wait only delays the failure.' },
          { t: 'Put the password in the job parameters as plain text', fb: 'It removes the call and puts the password in the job definition, where many people can read it.' }
        ],
        best: 0,
        why: 'A private subnet has paths only for what you add. S3 has the gateway endpoint, and Secrets Manager has nothing, so the call waits until it times out. An interface endpoint with private DNS gives the job a private path, and the security groups must allow HTTPS (port 443) between them.',
        checks: [
          ['Find where it stops', 'The log stops at the first call to a service other than S3.'],
          ['List the paths', 'The subnet has a gateway endpoint for S3 and no other route out.'],
          ['Add the endpoint', 'An interface endpoint for `secretsmanager` in the subnets of the job, with private DNS enabled.'],
          ['Open the port', 'The endpoint security group allows 443 from the job security group.'],
          ['Prevent it', 'Put the endpoints that every job needs in the VPC template: S3, Secrets Manager, STS, CloudWatch Logs.']
        ],
        tell: 'The nightly Glue job hung and timed out at the call to Secrets Manager, after we moved it into a private subnet to reach Redshift. The subnet had a gateway endpoint for S3 and no other way out, so the call to Secrets Manager could not connect. I created an interface endpoint for Secrets Manager with private DNS in the job subnets and allowed port 443 from the job security group, and the job ran. Our VPC template now includes the endpoints that every job needs, and a smoke test calls each service once after a network change.',
        prevent: ['Put **common endpoints** in the VPC template', 'Test **every service call** after a network change', 'Use **security groups that name groups**', 'Set a **short timeout** on calls, so a blocked path fails fast']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'docs', title: 'Incident: the deleted customer is still in the lake', time: '11:30',
        alert: '**A customer asked for deletion 3 weeks ago. The privacy team ran a query in Athena and still found the customer in the curated table and in the raw zone.** The platform team ran `DELETE` on the Iceberg curated table last week.',
        clues: ['The curated table is Iceberg and the DELETE ran without errors', 'The raw zone has JSON files and the clean zone has Parquet, with S3 versioning on', 'A time travel query on the curated table still returns the rows'],
        opts: [
          { t: 'Remove the person from every copy: rewrite the raw and clean partitions, expire snapshots and vacuum the Iceberg table, delete old S3 versions, and check each copy', fb: '' },
          { t: 'Run the DELETE again', fb: 'The current table is already clean. The rows remain in old snapshots, in the other zones and in old versions.' },
          { t: 'Tell the privacy team that the delete is done', fb: 'It is not done. The data is still readable in three places.' },
          { t: 'Drop the curated table and rebuild it', fb: 'It cleans one copy and leaves the raw files, the clean zone and the old versions.' }
        ],
        best: 0,
        why: 'A row delete in Iceberg hides the row from the current snapshot. Old snapshots, the data files, the raw and clean copies and the old S3 versions still hold it. Deleting a person means finding every copy, removing the person from each, removing the old snapshots and versions, and proving it with a query on each copy.',
        checks: [
          ['List the copies', 'Raw JSON, clean Parquet, curated Iceberg, exports, the Redshift table, backups.'],
          ['Check history', 'Time travel and S3 versions still return the rows.'],
          ['Delete in each copy', 'Rewrite raw and clean partitions, DELETE in tables, remove exports.'],
          ['Remove the history', 'Expire snapshots and run `VACUUM`, delete the old S3 versions.'],
          ['Prove it', 'Query every copy for the person and keep the evidence.']
        ],
        tell: 'A deleted customer was still in the lake because our DELETE on the Iceberg curated table only removed the rows from the current snapshot. The raw JSON, the clean Parquet, old Iceberg snapshots and old S3 versions still held the data. I listed every copy, rewrote the raw and clean partitions without the customer, deleted the rows in the tables, expired the snapshots and vacuumed, deleted the old object versions, and then queried each copy to prove the customer was gone. We now keep a data map with every copy of personal data, and a tested deletion runbook.',
        prevent: ['Keep a **data map** of every copy of personal data', 'Test the **deletion runbook** on a sample', 'Remember **snapshots and versions** keep deleted rows', 'Keep **evidence** of every request and result']
      }),

      B.qa({
        id: 'qa-kms', t: 1, tag: 'Security', secs: 90,
        q: 'How does KMS envelope encryption work, and how do you control who can decrypt?',
        pts: ['KMS encrypts small data. For big data it creates a data key', 'GenerateDataKey returns the key in plain and encrypted form', 'Encrypt locally, store the encrypted key with the data', 'Decrypt the data key through KMS, then the data', 'The key policy and IAM decide who may call KMS', 'The encryption context must match'],
        short: 'KMS keys encrypt only small data directly, so for a file I use envelope encryption. I ask KMS for a data key with `GenerateDataKey`. It returns the key twice, in plain text and encrypted under the KMS key. I encrypt the data locally with the plain key, then drop it, and I store the encrypted key next to the data.\n\nTo read, I ask KMS to decrypt the data key, then decrypt the data locally. KMS never sees the data, and only someone who may use the KMS key can read it. The key policy is the root of that control. It can let IAM policies in, and I add the permissions that the roles need.\n\nI pass an encryption context, a small set of labels such as the dataset name. It must match on decrypt, and in my test a different context failed with `InvalidCiphertextException`. The context also shows in CloudTrail, which helps the audit.\n\nS3 does this for every object with SSE-KMS. I turn on rotation and S3 Bucket Keys, which cut KMS requests by up to 99 %.',
        fu: [
          ['What happens if you disable the KMS key?', 'Nobody can decrypt the data keys, so the data is unreadable until the key is enabled again. It is a fast switch to stop access, and a risk if done by mistake.'],
          ['Why a data key and not the KMS key directly?', 'KMS limits the size of direct encryption to a few kilobytes, and calling KMS for every byte is slow and expensive. A data key encrypts locally.']
        ],
        trap: 'Saying that KMS stores or encrypts your data. It protects the keys, and the data is encrypted by a data key.',
        real: 'Describe a key policy you wrote and a failure it caused or prevented.'
      }),

      B.qa({
        id: 'qa-secrets', t: 1, tag: 'Security', secs: 60,
        q: 'How do you handle secrets in a data pipeline?',
        pts: ['IAM roles instead of keys wherever possible', 'Secrets Manager for passwords and tokens', 'Fetch at run time, by name, with a role that can read only that secret', 'Never in code, Git, logs or plain environment variables', 'Rotate, and use versions during rotation', 'Scan repositories and alarm on unusual reads'],
        short: 'First I avoid secrets. Between AWS services a role does the job, with short-lived credentials. For what is outside IAM, such as a database password or the token of a partner API, I use Secrets Manager.\n\nThe job gets only the name of the secret, and it fetches the value at run time with its role. The role can read that one secret and nothing else. The secret is encrypted with KMS, and it rotates on a schedule. Versions help here: a job that still holds the previous value keeps working while the new one spreads, and in my test the two values carried the labels `AWSCURRENT` and `AWSPREVIOUS`.\n\nI never put a secret in code, in Git, in a plain environment variable or in a log. A `print` of the whole API response in a Lambda function sends the password to CloudWatch Logs, which I check for in code review. I scan repositories for keys, and I alarm when a secret is read by a role that does not usually read it.',
        fu: [
          ['Secrets Manager or Parameter Store?', 'Secrets Manager for passwords that rotate. Parameter Store for plain settings and small secrets, with a free standard tier.'],
          ['What do you do after a leak?', 'Rotate the secret at once, find where it was used, and review the access logs for use of the old value.']
        ],
        trap: 'Putting the password in an environment variable and calling it secure. Anyone who can read the job definition reads it.',
        real: 'Describe how you rotated a secret without downtime.'
      }),

      B.qa({
        id: 'qa-vpc', t: 2, tag: 'Security', secs: 90,
        q: 'How do you design the network for data jobs on AWS?',
        pts: ['Workers in private subnets, no public addresses', 'S3 gateway endpoint: free', 'Interface endpoints for the services that carry traffic or must stay private', 'NAT gateway only for the internet, and watch its cost', 'Security groups that name groups', 'Endpoint policies and a test after each change'],
        short: 'Jobs run in private subnets with no public addresses. I give them three kinds of path.\n\nFor S3, a gateway endpoint. It is a route table entry and it is free, and without it, S3 traffic goes through the NAT gateway and costs $0.045 for each GB. In one case that was a bill of $4,100 a month.\n\nFor other AWS services such as Kinesis, STS and Secrets Manager, interface endpoints with private DNS. They cost about $0.01 for each hour and zone plus $0.01 for each GB, which is cheaper than NAT per GB once the volume is real, and they keep the traffic off the internet.\n\nFor the internet, a NAT gateway in a public subnet, used as little as possible.\n\nSecurity groups allow HTTPS from the job group to the endpoint group. Endpoint policies can limit a gateway endpoint to the lake bucket, but I test them, because Glue and EMR read from AWS-owned buckets. After a network change I run a small test that calls each service once.',
        fu: [
          ['Gateway or interface endpoint?', 'Gateway endpoints exist for S3 and DynamoDB and are free. Interface endpoints cover most other services and cost an hourly and a data fee.'],
          ['Security group or network ACL?', 'Security groups are stateful and allow only, attached to interfaces. Network ACLs are stateless and work at the subnet level. I use security groups and leave the default ACL.']
        ],
        trap: 'Moving a job into a VPC without checking what it calls. Every call to a service needs a path.',
        real: 'Describe a network problem you found after moving a job into a VPC.'
      }),

      B.qa({
        id: 'qa-lakesec', t: 2, tag: 'Security', secs: 90,
        q: 'How do you secure a data lake end to end?',
        pts: ['Accounts, roles and least privilege', 'Block Public Access, TLS only, encryption with KMS where needed', 'Private networking with endpoints', 'Column and row control with Lake Formation, masking of PII', 'Secrets in a secret store', 'CloudTrail, Config, GuardDuty and Macie, with alarms'],
        short: 'I layer the controls.\n\nIdentity: separate accounts for production, development and logs, roles with least privilege, short-lived credentials, and a deny for what must never happen. Storage: Block Public Access, ACLs disabled, TLS-only, versioning, and encryption, with a customer managed KMS key and bucket keys for sensitive data.\n\nNetwork: jobs in private subnets with an S3 gateway endpoint and interface endpoints for the services they call. Data: Lake Formation grants by table and column, personal data hashed or masked before the curated layer, a separate prefix and key for raw personal data, and a tested deletion runbook.\n\nSecrets live in Secrets Manager, fetched at run time by role.\n\nDetection: CloudTrail for the organization in a protected bucket, queried with Athena, Config rules for the configuration, GuardDuty for threats, Macie for personal data in S3, and alarms for the events that matter. I test the controls: I try, as an analyst role, to read what I should not.',
        fu: [
          ['What would you do first in a new account?', 'CloudTrail and Config, Block Public Access, a log account, and roles. Everything else builds on them.'],
          ['How do you test security controls?', 'With a role of each kind, I try the actions that must fail, and I run the policy linter and the access analyzer in the pipeline.']
        ],
        trap: 'Listing services without the order or the tests. A control that nobody tested is a hope.',
        real: 'Describe a control you added after an audit finding.'
      }),

      B.qa({
        id: 'qa-pii', t: 2, tag: 'Security', secs: 90,
        q: 'How do you handle personal data, and a deletion request, in a lake?',
        pts: ['Find it with Macie and a data map', 'Collect less', 'Hash or mask before the curated layer', 'Column grants in Lake Formation or Redshift', 'Separate zone and key for raw PII', 'Deletion: every copy, snapshots, versions, and proof'],
        short: 'I start by finding the personal data. Macie scans S3 for it, and a data map lists every table and copy that holds it. Then I collect less: a column that is not in the lake cannot leak.\n\nIn the clean zone I hash or mask what analysts do not need, for example a salted hash of the e-mail, so that joins and distinct counts still work, and the first three characters of a postal code. Analysts get a view and column grants through Lake Formation or Redshift, and not the raw table. Raw personal data sits in its own prefix with its own KMS key and a short list of roles.\n\nFor a deletion request I list every copy: raw, clean, curated, Redshift, exports and backups. I rewrite partitions of plain Parquet, run DELETE on Iceberg tables and then expire snapshots and VACUUM, delete old S3 versions, and then query every copy to prove the person is gone. I keep the evidence of the request and the result.',
        fu: [
          ['Why is a DELETE on Iceberg not enough?', 'It hides the rows from the current snapshot. Old snapshots and data files still contain them until you expire the snapshots and vacuum.'],
          ['Is a hash anonymous?', 'Not always. A salted hash of an e-mail address can still identify a person for someone who has the address, so ask the privacy team what the rules say.']
        ],
        trap: 'Saying that encryption solves privacy. A role that may decrypt reads everything, so access control by column is needed.',
        real: 'Describe how you found every copy of a person data, and how you proved deletion.'
      }),

      B.qa({
        id: 'qa-audit', t: 3, tag: 'Security', secs: 90,
        q: 'A bucket was found open to the world. How do you find out what happened?',
        pts: ['Close it first: Block Public Access', 'CloudTrail: who changed the bucket policy or ACL, and when', 'Data events or access logs: what was read', 'Config history: what the setting was before', 'Macie: what sensitive data was in it', 'Report, fix the cause, add a Config rule and an alarm'],
        short: 'First I close the exposure: Block Public Access on the bucket and the account, so that nothing else is read while I investigate. I do not delete evidence.\n\nThen I ask four questions. Who changed it? I query CloudTrail in Athena for `PutBucketPolicy`, `DeleteBucketPolicy` and `PutBucketAcl` on that bucket, which gives the identity, the time and the request. What was it before? AWS Config keeps the configuration history. What was read? Management events do not show object reads, so I use S3 server access logs or CloudTrail data events, if they were on, and I check the exposed period. What was in it? Macie reports the sensitive data in the bucket.\n\nWith that I write the report: the time window, the data, and who may have read it. The privacy team decides on notification. Then I fix the cause, a Config rule such as public-read prohibited, an Access Analyzer alert, a service control policy, and an alarm for policy changes on buckets.',
        fu: [
          ['Why are data events not on by default?', 'They are very large and they cost extra. You turn them on for the buckets where object-level history matters.'],
          ['How do you prevent it next time?', 'Block Public Access at the account level, a Config rule or Security Hub check, and a service control policy that stops anyone from turning it off.']
        ],
        trap: 'Starting the investigation before closing the exposure. Every minute of delay is more reads.',
        real: 'Describe an investigation you did with CloudTrail, and what it proved.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Security Steward', color: '#FECACA',
        pts: [
          '**Envelope encryption**: a data key encrypts the data, KMS encrypts the data key. A different **encryption context** failed with `' + ENV.wrong_encryption_context.code + '` in the recording.',
          'Use **SSE-S3** by default and **SSE-KMS with bucket keys** when you need a key policy and an audit trail. Turn **rotation** on.',
          '**Secrets** live in Secrets Manager, fetched at run time. The recording shows the labels **AWSCURRENT** and **AWSPREVIOUS**. Never log the value.',
          'An **S3 gateway endpoint** is free. **Interface endpoints** cost about $0.01 an hour and GB. **NAT** is for the internet.',
          '**Column grants and masked views** protect PII, since a file holds every column. A deletion must reach **every copy, snapshot and version**.',
          '**CloudTrail** says who did what, **Config** says what is configured, **GuardDuty** and **Macie** raise alerts. Query CloudTrail with Athena.'
        ],
        lines: [
          'I log the name of a secret, never its value.',
          'I put the endpoints in the VPC template.',
          'I prove a deletion with a query on every copy.'
        ]
      })
    ]
  });
})();
