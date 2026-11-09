/* Mission 1: the map. Accounts, Regions, the services of a data platform, the five meters of the bill, shared responsibility.
   Documentation only: nothing here ran on AWS, and the prices are examples. */
(function () {
  var B = LAB.b;
  var ARNS = [
    'arn:aws:s3:::brewline-lake/raw/orders/dt=2026-03-14/orders-0001.json',
    'arn:aws:iam::123456789012:role/brewline-glue-etl',
    'arn:aws:glue:us-east-1:123456789012:table/brewline_lake/orders',
    'arn:aws:kinesis:us-east-1:123456789012:stream/orders'
  ].join('\n');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The AWS map for data engineers', short: 'Map', blurb: 'Accounts, Regions, the services of a data platform and the five meters of the bill', minutes: 24,
    focus: ['sf'],
    goals: [
      'Say what an **account**, a **Region** and an **Availability Zone** are, and what lives where.',
      'Explain why a data team uses **more than one account**.',
      'Name the **service for each job** of a data platform.',
      'Name the **five meters** of an AWS bill and find the biggest one.',
      'Say what **shared responsibility** leaves to you.'
    ],
    say: 'Mission 1 is the map. AWS has hundreds of services, and a data engineer works with about a dozen of them. Know what each one is for, where it runs and what it bills on, and every later mission fits into place. Every screen in this mission comes from documentation, because nothing here ran on AWS.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, src: 'docs', title: 'Five things to know about an account',
        say: 'Before any service, five ideas that every later mission uses. Press Next for each.',
        items: [
          ['An account is a boundary', 'An AWS account holds resources and bills for them. It is a security boundary and a billing boundary. Nothing in one account can touch another unless somebody grants it.', 'Resources, bills and permissions all stop at the account edge.'],
          ['A Region is a place', 'A Region is a geographic area with several data centres, such as `us-east-1` in Northern Virginia or `eu-west-1` in Ireland. Most resources, S3 buckets included, live in one Region. Data leaves a Region only when you copy it, and copying costs money.', 'Choose the Region once and carefully.'],
          ['An Availability Zone is a group of data centres', 'A Region has several Availability Zones. Each zone has its own power and network, so a service that spreads over zones survives the loss of one. Traffic between zones is billed.', 'Spread for safety, and remember the transfer fee.'],
          ['Everything has an ARN', 'An Amazon Resource Name identifies one resource: partition, service, Region, account and a resource name. Policies, logs and alarms refer to resources by ARN. The next screen shows four of them.', 'The ARN is the address that policies use.'],
          ['Global or Regional', 'IAM, the service that decides who may do what, is global. Most other services are Regional. S3 is a special case: a bucket name is unique across all accounts and Regions, but the bucket itself lives in one Region.', 'Know which of your services is global.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit.', t: 'When something is "missing", check the Region in the console or the CLI first. A resource in `eu-west-1` is invisible from `us-east-1`.' }
      }),

      B.code({
        id: 'm1-arn', t: 1, src: 'docs', title: 'Four ARNs', file: 'arns.txt', lang: 'text', code: ARNS,
        steps: [
          { say: 'The pattern is `arn:partition:service:region:account-id:resource`. Some services leave parts empty. Read the four examples in turn.', lines: null },
          { say: 'An S3 object. The Region and the account are empty, because the bucket name is already unique. The resource is the bucket and the key. A bucket itself has an ARN without the key.', lines: [1, 1] },
          { say: 'An IAM role. IAM is global, so the Region is empty. The account id says who owns the role, and `role/` is the type.', lines: [2, 2] },
          { say: 'A Glue table. It has a Region and an account, and the resource says `table/` then the database and the table name.', lines: [3, 3] },
          { say: 'A Kinesis stream. The type is `stream/`. When you write a policy for a stream you copy this form.', lines: [4, 4] }
        ],
        note: 'The most common policy mistake is an ARN of the wrong shape: an action on objects with the ARN of the bucket, or the other way round. Mission 3 shows the exact error.'
      }),

      B.cmp({
        id: 'm1-orgs', t: 1, src: 'docs', title: 'One account or many',
        say: 'A data team can run everything in one account, or give each environment its own. Press Next to compare them on six questions.',
        cols: ['Question', 'One account for everything', 'An account for each environment'],
        hl: 2,
        rows: [
          ['Blast radius', 'A mistake or a leaked key reaches production data.', 'A mistake in development stays in the development account.'],
          ['Permissions', 'Long policies keep developers away from production resources.', 'The account boundary does most of the work. Developers have no role in production.'],
          ['Cost', 'One bill. Tags are the only way to split it.', 'The bill splits by account, and one payer account can still pay all of them.'],
          ['Quotas', 'All teams share the limits of one account.', 'Limits apply to each account, so a test cannot use up the production quota.'],
          ['Audit', 'Logs from everything sit together, and an administrator can edit them.', 'A separate log account holds the audit trail where the engineers cannot change it.'],
          ['Effort', 'Quick to start.', 'Needs AWS Organizations and a baseline that every new account gets.']
        ],
        steps: [
          { upto: 2, say: 'Safety first. A separate account contains mistakes and removes the need for clever policies.' },
          { upto: 4, say: 'Cost and limits. Teams stop surprising each other when the bill and the quota belong to the account.' },
          { upto: 6, say: 'Audit and effort. The extra account for logs is cheap, and the setup effort is paid once.' }
        ],
        pick: 'Start with **at least a production account and a non-production account**, and a **log account** that engineers cannot edit. Put the lake of each environment in its own account.'
      }),

      B.talk({
        id: 'm1-org2', t: 2, src: 'docs', title: 'Organizations, service control policies and Control Tower',
        say: 'Three services manage many accounts. Press Next for each.',
        items: [
          ['AWS Organizations', 'Groups accounts into organizational units, sends one consolidated bill to a payer account, and lets you apply policies to a whole unit at once.', 'The tree of accounts.'],
          ['Service control policies', 'An SCP sets the **maximum** permissions for the accounts under it. It never grants anything. A role in the account still needs an identity policy that allows the action, and the SCP must not block it. Typical uses: deny leaving the organization, deny turning off logging, limit the Regions.', 'A ceiling, not a grant.'],
          ['AWS Control Tower', 'Builds a landing zone on Organizations: a log archive account, an audit account and baseline guardrails. A new account created through it starts with the baseline already applied.', 'A faster start to a multi-account setup.'],
          ['IAM Identity Center', 'Single sign-on for people into many accounts. Engineers sign in once, and pick a role in an account. No long-lived access keys for people.', 'People sign in here, jobs use roles.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm1-services', t: 1, src: 'docs', title: 'The service for each job',
        say: 'A data platform needs a service for each job. Press Next to read twelve of them in three groups. The right column is the meter that each service bills on.',
        cols: ['Job', 'Service', 'Use it when', 'You pay for'],
        hl: 1,
        rows: [
          ['Keep files', 'S3', 'Always. It is the lake.', 'GB-months, requests, data out'],
          ['Know the tables', 'Glue Data Catalog', 'More than one engine reads the same tables.', 'Objects stored and requests, above a free amount'],
          ['Transform in batch', 'Glue ETL jobs', 'Spark jobs with no cluster to run.', 'DPU-hours'],
          ['Control the engine', 'EMR, EMR Serverless', 'You need other engines or full control.', 'Instance-hours, or vCPU and memory hours'],
          ['Query files with SQL', 'Athena', 'Ad hoc and scheduled SQL on S3.', 'Terabytes scanned'],
          ['Serve dashboards', 'Redshift', 'Many users and repeated queries.', 'Node-hours or RPU-hours, plus storage'],
          ['Take in a stream', 'Kinesis Data Streams, MSK', 'Real-time events.', 'Shard-hours or GB, or broker-hours'],
          ['Land a stream in S3', 'Firehose', 'Batch a stream into files.', 'GB ingested'],
          ['Copy a database', 'Database Migration Service', 'Change data capture from a database.', 'Replication hours'],
          ['React to an event', 'Lambda', 'Short code, triggered by something.', 'Requests and GB-seconds'],
          ['Queue and fan out', 'SQS, SNS, EventBridge', 'Decouple, retry, route.', 'Requests'],
          ['Run steps in order', 'Step Functions, MWAA', 'Branches, retries, waits.', 'State transitions, or environment hours']
        ],
        steps: [
          { upto: 4, say: 'Storage and compute. S3 holds the files, the catalog names the tables, and Glue or EMR transform them.' },
          { upto: 8, say: 'Ask and serve. Athena queries the lake. Redshift serves repeated queries. Streams and DMS bring new data in.' },
          { upto: 12, say: 'Glue it together. Functions react, queues absorb, state machines order the work.' }
        ],
        pick: 'Learn the **meter** of each service. Interviewers ask "what does it cost" about as often as "what does it do", and the meter is the first half of the answer.'
      }),

      B.talk({
        id: 'm1-meters', t: 1, src: 'docs', title: 'The five meters of an AWS bill',
        say: 'Almost every line of an AWS bill is one of five meters. Press Next for each. The prices are examples from public pages, and they change.',
        items: [
          ['Storage', 'You pay for each GB for each month. S3 Standard is about $0.023 for each GB-month at an example US rate. Older data can move to cheaper classes. Versions and incomplete uploads count too.', 'Lifecycle rules are the lever.'],
          ['Requests', 'S3 charges for each 1,000 requests, with PUT, COPY and LIST costing about ten times more than GET. Millions of small files mean millions of requests, which is a second reason to keep files large.', 'Few, big files.'],
          ['Compute time', 'Glue bills DPU-hours by the second with a one minute minimum. Lambda bills GB-seconds and requests. Redshift bills node-hours or RPU-hours. Idle compute bills the same as busy compute unless it stops.', 'Stop what is not working.'],
          ['Data scanned or processed', 'Athena bills for the bytes it reads, about $5 for each TB. A NAT gateway bills for each GB that passes through it. Reading less, or routing differently, cuts these lines.', 'Read less. Route differently.'],
          ['Data transfer', 'Data into AWS is free. Data out to the internet costs about $0.09 for each GB after a monthly amount. Traffic between Availability Zones costs about $0.01 for each GB, and between Regions more.', 'Keep traffic in one zone when you can.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The surprise bills.', t: 'Most of them come from the last two meters: a NAT gateway that carries S3 traffic, an Athena query that scans a whole CSV lake, or traffic that crosses zones for no reason.' }
      }),

      B.cmp({
        id: 'm1-region', t: 1, src: 'docs', title: 'Choosing a Region',
        say: 'Six questions decide the Region of a data platform. Press Next to read them.',
        cols: ['Question', 'What to check', 'A common answer'],
        hl: 1,
        rows: [
          ['Where are the users and sources?', 'Latency and the cost of moving data to the lake.', 'The Region closest to the sources of the data.'],
          ['What does the law say?', 'Data residency rules for personal data.', 'A Region inside the same legal area.'],
          ['Is the service there?', 'Newer services and features reach some Regions first.', 'Check the Regional services table before you design.'],
          ['What does it cost?', 'Prices differ by Region.', 'Compare the lines that dominate your bill.'],
          ['What if it fails?', 'A Region-wide outage is rare, but it happens.', 'Replicate critical data to a second Region and test a restore.'],
          ['Does data cross Regions?', 'Transfer between Regions is billed and slower.', 'Avoid it in the hot path. Use it for backup.']
        ],
        steps: [
          { upto: 2, say: 'Place and law. The sources and the legal area narrow the list quickly.' },
          { upto: 4, say: 'Services and price. Check that every service you need is in the Region before you commit.' },
          { upto: 6, say: 'Failure and traffic. Plan the second Region for backup, and keep cross-Region traffic out of the daily path.' }
        ],
        pick: 'Pick the Region **closest to your data sources that satisfies the law**, confirm that every service you need runs there, and replicate only what you must restore.'
      }),

      B.talk({
        id: 'm1-shared', t: 1, src: 'docs', title: 'Shared responsibility',
        say: 'AWS and you each secure part of the system. Press Next for each point.',
        items: [
          ['AWS secures the cloud', 'The buildings, the hardware, the network between data centres and the software of the managed services. You do not patch S3 or Athena.', 'Their side.'],
          ['You secure what you put in it', 'Who may read the data, how it is encrypted, which network paths exist, and how the services are configured. A managed service still needs your configuration.', 'Your side.'],
          ['The failures are on your side', 'A bucket made public by mistake, an access key committed to a repository, a role that allows everything, a snapshot nobody encrypted. These cause most data breaches in the cloud, and none of them is an AWS fault.', 'Common ways data leaks.'],
          ['Tools that find them', 'IAM Access Analyzer finds access you did not intend, AWS Config checks settings against rules, and CloudTrail records who called what. Switch them on in every account.', 'Switch them on at the start.']
        ],
        cols: 2
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A teammate says "the lake bucket is in Ireland". What does that tell you?',
        opts: [
          { t: 'The bucket name only works for people in Ireland', fb: 'Bucket names are global. They work from anywhere.' },
          { t: 'The data is stored in the `eu-west-1` Region and stays there unless somebody copies it', fb: '' },
          { t: 'The bucket is available in every Region, with Ireland as the main copy', fb: 'S3 does not replicate across Regions unless you set up replication.' },
          { t: 'Only users with an Irish IP address can read the data', fb: 'Where data is stored has no effect on who may read it. IAM decides that.' }
        ],
        ok: 1, why: 'A bucket lives in one Region. The data does not leave it unless you copy it or turn on replication. This is why the Region matters for law, latency and cost.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'You create a bucket named `data` and get an error that the name is taken. Why?',
        opts: [
          { t: 'Someone else in the world already owns a bucket named `data`', fb: '' },
          { t: 'You already have a bucket with that name in another Region of your account', fb: 'That is possible, but the error comes more often from another account. Bucket names are unique across all accounts.' },
          { t: 'Bucket names must be at least ten characters long', fb: 'The minimum is three characters. The name is taken, not too short.' },
          { t: 'S3 reserves the word `data` for AWS', fb: 'There is no such reserved word.' }
        ],
        ok: 0, why: 'Bucket names share one namespace across all accounts. That is why a company prefix and an environment, as in `brewline-lake-prod`, avoid clashes.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Which of these services is global and not tied to one Region?',
        opts: [
          { t: 'Amazon Kinesis Data Streams', fb: 'A stream lives in one Region.' },
          { t: 'AWS Glue', fb: 'Glue databases and jobs belong to a Region.' },
          { t: 'AWS IAM', fb: '' },
          { t: 'Amazon Athena', fb: 'Athena runs in the Region you choose.' }
        ],
        ok: 2, why: 'IAM users, roles and policies apply to the whole account. That is why an IAM role works in every Region, while the Glue job that uses it lives in one.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the setup of a new account for the data team in order.',
        items: [
          'Create the account inside the organization, in the unit for workloads',
          'Apply guardrails: deny leaving the organization and deny turning off logging',
          'Set up sign-in through IAM Identity Center and create the roles',
          'Turn on a budget alert and the cost tags',
          'Create the lake bucket with encryption, versioning and Block Public Access',
          'Add the network endpoints before the first job runs'
        ],
        why: 'Boundaries first, then identity, then money, then data. Putting the guardrails before the first workload means nothing ever runs without them. The endpoints come before the first job so that no traffic takes the expensive path.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: how many accounts for Brewline?',
        scenario: 'Brewline has **8 engineers**, one production lake and a wish to test changes safely. Finance wants a clear bill for production. The security lead wants an audit trail that engineers cannot edit.',
        opts: [
          { t: 'One account for everything, with policies and tags to separate environments', d: 'Quick to start. One bill.', lose: 'A mistake in a test reaches production, the audit trail sits where administrators can edit it, and the production bill must be rebuilt from tags.' },
          { t: 'Three accounts: development, production, and a log account that only the security lead manages', d: 'A boundary around production, a clean bill, and a protected trail.' },
          { t: 'A separate account for each engineer and each service', d: 'The strictest separation.', lose: 'Dozens of accounts for 8 engineers. Every account needs the baseline, the roles and the billing view, and sharing data between them needs cross-account access. The effort is larger than the risk it removes.' }
        ],
        pick: 1,
        why: 'Three accounts match the three needs: safe testing, a clean production bill and a protected trail. The effort is one baseline applied three times.',
        when: 'A larger company with independent data domains adds an account for each domain, and a central account for the catalog and the governance. Add accounts when a boundary solves a real problem, not before.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'docs', title: 'Incident: the NAT gateway bill', time: '10:15',
        alert: '**The monthly bill shows about $4,100 for "NAT Gateway", up from $40.** Nobody changed an instance type. The only new thing is a nightly Spark job on EMR that reads about 3 TB from the S3 lake. The cluster runs in a private subnet.',
        clues: ['The private subnet routes `0.0.0.0/0` to a NAT gateway', 'The VPC has no endpoint for S3', 'A NAT gateway charges for each GB that passes through it'],
        opts: [
          { t: 'Add an S3 gateway endpoint to the route tables of the private subnets', fb: '' },
          { t: 'Move the NAT gateway to a bigger size', fb: 'A NAT gateway has no sizes to pick. It bills by the hour and by the GB, so the traffic is the problem.' },
          { t: 'Ask the job to read less data by compressing the files', fb: 'Compression helps the job, but the S3 traffic still goes through the NAT gateway. Fix the path first.' },
          { t: 'Put the cluster in a public subnet', fb: 'It removes the NAT charge and exposes the workers to the internet. The endpoint fixes the cost without the risk.' }
        ],
        best: 0,
        why: 'Traffic to S3 does not need the internet. A gateway endpoint adds a route that sends S3 traffic over the AWS network, and it has no hourly or data charge. 3 TB a night is about 90,000 GB a month, and at $0.045 for each GB that is the whole bill.',
        checks: [
          ['Find the line', 'Cost Explorer, grouped by usage type, shows `NatGateway-Bytes` as the growing line.'],
          ['Find the traffic', 'VPC flow logs or the NAT gateway metrics show that the bytes go to S3 addresses.'],
          ['Check the path', 'The route table of the private subnet sends everything to the NAT gateway. There is no S3 route.'],
          ['Fix and measure', 'Add the S3 gateway endpoint. The next night the bytes through the NAT gateway fall to almost nothing.'],
          ['Set the rule', 'Every VPC gets an S3 gateway endpoint in the template, so the mistake cannot return.']
        ],
        tell: 'Our NAT gateway bill rose from about $40 to about $4,100 in a month. The cause was a new nightly Spark job on EMR in a private subnet that read 3 TB from S3, and the VPC had no S3 endpoint, so every byte went through the NAT gateway at $0.045 for each GB. I added an S3 gateway endpoint to the route tables, which costs nothing, and the traffic through the NAT gateway fell to almost zero the next night. We now include the endpoint in the VPC template, and a budget alarm watches the NAT gateway line.',
        prevent: ['Add an **S3 gateway endpoint** to every VPC template', 'Create **budget alerts** for single lines as well as the total', 'Review **NAT gateway bytes** in the weekly cost check', 'Use **interface endpoints** for the other AWS services that jobs call']
      }),

      B.qa({
        id: 'qa-map', t: 1, tag: 'AWS', secs: 60,
        q: 'Walk me through the AWS services you would use to build a data platform.',
        pts: ['S3 as the lake, with raw, clean and curated zones', 'Glue Data Catalog for the table definitions', 'Glue or EMR for the transformations', 'Athena and Redshift to query', 'Kinesis, Firehose or DMS to bring data in', 'Step Functions to order the jobs, and IAM, KMS and CloudWatch around it'],
        short: 'I start with S3 as the lake, with a raw zone for files as received, a clean zone for typed Parquet and a curated zone for business tables. The Glue Data Catalog stores the table definitions, so every engine sees the same schema.\n\nData comes in through DMS for database changes, Kinesis and Firehose for events, and file uploads for supplier files. Glue jobs, or EMR when I need more control, move data between the zones. Athena queries the lake and Redshift serves dashboards that need fast repeated queries.\n\nStep Functions orders the jobs with retries. IAM roles give each job only the access it needs, KMS encrypts the buckets, and CloudWatch and budgets watch the platform. CloudFormation or Terraform builds all of it from code. For each service I would also say what it costs: storage, requests, compute time, data scanned or data moved.',
        fu: [
          ['Why three zones in the lake?', 'Raw is the copy I can always rebuild from. Clean has types and no duplicates in a cheap columnar format. Curated is small and shaped for questions.'],
          ['When do you choose EMR over Glue?', 'When I need an engine Glue does not offer, full control of the cluster, or a long-running cluster that is cheaper than many short jobs.']
        ],
        trap: 'Listing services without saying why. Every service in the answer needs one reason and one meter.',
        real: 'Describe the platform your team runs and the one service you would change.'
      }),

      B.qa({
        id: 'qa-accounts', t: 2, tag: 'AWS', secs: 90,
        q: 'Why would you use several AWS accounts for a data platform?',
        pts: ['The account is a security and billing boundary', 'Separate production from development', 'A log account nobody can edit', 'Quotas apply to each account', 'Organizations, service control policies and Control Tower', 'The cost: cross-account access and a baseline for each account'],
        short: 'An account is both a security boundary and a billing boundary, so I use separate accounts to contain mistakes and to split the bill without relying on tags. A developer with no role in the production account cannot damage production, whatever the policies say.\n\nI keep at least three: development, production and a log account where CloudTrail and access logs are written and nobody can edit them. Quotas also apply to each account, so a load test cannot use up the production limits.\n\nI manage them with AWS Organizations. Service control policies set a ceiling, for example no leaving the organization and no switching off logging. Control Tower can build the starting baseline. People sign in through IAM Identity Center and assume roles.\n\nThe price is effort. Sharing data between accounts needs cross-account access, and every new account needs the baseline. So I add an account when a boundary solves a real problem.',
        fu: [
          ['What does a service control policy do?', 'It limits what the accounts under it can do. It never grants permissions. The role still needs an identity policy that allows the action.'],
          ['How do two accounts share a bucket?', 'The bucket policy in the owning account allows the other account or its role, and the other account allows its role to use the bucket. Both sides must allow it.']
        ],
        trap: 'Saying that more accounts are always better. The answer is a boundary where it solves a problem, and a baseline that makes new accounts cheap.',
        real: 'Describe how many accounts your company uses and the boundary that mattered most.'
      }),

      B.qa({
        id: 'qa-bill', t: 2, tag: 'AWS', secs: 90,
        q: 'The monthly AWS bill of the data platform doubled. How do you find out why?',
        pts: ['Cost Explorer by service, then by usage type', 'Compare with the previous month, line by line', 'Tags or accounts to find the owner', 'Check the usual suspects: NAT gateway, Athena scans, Glue DPU hours, S3 requests, data transfer', 'Find what changed: a new job, a new table, a changed query', 'Budgets and anomaly detection so it is found early next time'],
        short: 'I open Cost Explorer, group by service and compare with the previous month to find the line that grew. Then I group by usage type inside that service, because the usage type names the meter: NAT gateway bytes, Athena bytes scanned, Glue DPU hours, S3 requests or data transfer.\n\nNext I find the owner with accounts or cost allocation tags, and ask what changed: a new job, a table that lost its partitions, a query that now selects every column, or a cluster that no longer stops.\n\nI check the usual suspects first. A NAT gateway carrying S3 traffic, an Athena query that scans a whole CSV lake, an idle cluster, and millions of small S3 requests. For a deep look I use the Cost and Usage Report queried with Athena.\n\nTo find it early next time I set budgets on single lines and turn on cost anomaly detection.',
        fu: [
          ['How do you assign cost to teams?', 'Separate accounts, and cost allocation tags on the resources that support them. Activate the tags in billing, because they only appear after that.'],
          ['Name the three cheapest fixes.', 'An S3 gateway endpoint for S3 traffic, Parquet with partitions for Athena, and auto-stop on every cluster.']
        ],
        trap: 'Starting with a guess. Start with the data: service, usage type, owner, and what changed.',
        real: 'Describe a bill spike you found and the one change that fixed it.'
      }),

      B.qa({
        id: 'qa-shared', t: 1, tag: 'AWS', secs: 60,
        q: 'What does the shared responsibility model mean for a data team?',
        pts: ['AWS secures the cloud: buildings, hardware, managed service software', 'You secure what you put in it', 'Access, encryption and network settings are yours', 'Most breaches come from configuration, not from AWS', 'Tools: Access Analyzer, Config, CloudTrail', 'Say what you configured yourself'],
        short: 'AWS is responsible for the security of the cloud: the buildings, the hardware, the network and the software of managed services such as S3 and Athena. I am responsible for the security of what I put in the cloud: who may read the data, how it is encrypted, which network paths exist and how each service is configured.\n\nFor a data team that means bucket policies and Block Public Access, least-privilege roles, encryption keys, and keeping access keys out of code. A managed service still needs my configuration. Most cloud data breaches come from configuration mistakes such as a public bucket or an over-broad role, not from a failure inside AWS.\n\nI use IAM Access Analyzer to find access I did not intend, AWS Config to check settings against rules, and CloudTrail to record who called what, and I switch them on in every account from the start.',
        fu: [
          ['Who encrypts the data in S3?', 'S3 encrypts new objects by default with keys it manages. I choose a stronger setting, such as my own KMS key, when the data needs control over the key.'],
          ['Give an example of a mistake on the customer side.', 'A role with `s3:*` on `*`, an access key committed to Git, or a bucket policy that allows `Principal: "*"`.']
        ],
        trap: 'Saying that AWS handles security. It handles its part. The settings of your account are yours.',
        real: 'Describe a security setting that you added to an account and what it catches.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Cloud Scout', color: '#BFDBFE',
        pts: [
          'An **account** is a security and billing boundary. A **Region** is a place, and data stays in it unless you copy it.',
          'Use **several accounts**: at least development, production and a log account that engineers cannot edit.',
          'Know the **service and the meter** for each job: S3, the catalog, Glue, Athena, Redshift, streams, functions, queues, state machines.',
          'A bill is **five meters**: storage, requests, compute time, data scanned or processed, and data transfer.',
          'You secure what you put in the cloud. Most leaks are **configuration**, and tools exist to find them.'
        ],
        lines: [
          'I can say what a service costs and what it does.',
          'I put a boundary where it solves a problem.',
          'I look at the data of the bill before I guess.'
        ]
      })
    ]
  });
})();
