/* Mission 1: the map. Tenant, subscriptions, resource groups, regions, the services of a data platform, the five meters of the bill,
   shared responsibility, and where Microsoft Fabric fits. Documentation only: nothing here ran on Azure, and the prices are examples. */
(function () {
  var B = LAB.b;
  var IDS = [
    '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-brewline-data-prod/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod',
    '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-brewline-data-prod/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod/blobServices/default/containers/raw',
    'https://stbrewlinelakeprod.dfs.core.windows.net/raw/orders/dt=2026-03-14/orders-0001.json',
    'abfss://raw@stbrewlinelakeprod.dfs.core.windows.net/orders/dt=2026-03-14/orders-0001.json'
  ].join('\n');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The Azure map for data engineers', short: 'Map', blurb: 'Tenants, subscriptions, regions, the services of a data platform and the five meters of the bill', minutes: 26,
    focus: ['sf'],
    goals: [
      'Say what a **tenant**, a **subscription**, a **resource group** and a **region** are, and what lives where.',
      'Read a **resource ID** and tell it from a data address.',
      'Explain why a data team uses **more than one subscription**.',
      'Name the **service for each job** of a data platform, and the AWS service it matches.',
      'Name the **five meters** of an Azure bill and find the biggest one.',
      'Say what **shared responsibility** leaves to you, and where **Fabric** fits.'
    ],
    say: 'Mission 1 is the map. Azure has hundreds of services, and a data engineer works with about a dozen of them. Know what each one is for, where it runs and what it bills on, and every later mission fits into place. Every screen in this mission comes from documentation, because nothing here ran on Azure.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, src: 'docs', title: 'Five things to know before any service',
        say: 'Before any service, five ideas that every later mission uses. Press Next for each.',
        items: [
          ['A tenant is a directory', 'A tenant is one Microsoft Entra ID directory. It holds the users, groups and identities of an organization. Every subscription trusts exactly one tenant. Identity lives here, and it is why one sign-in works across all your subscriptions.', 'Identity belongs to the tenant.'],
          ['A subscription is a boundary', 'A subscription holds resources and receives the bill for them. It is a billing boundary, an access boundary and the place where quotas apply. Nothing in one subscription can touch another unless somebody grants it.', 'Resources, bills, quotas and permissions stop at the subscription edge.'],
          ['A resource group is a folder with a life', 'A resource group holds resources that share a lifecycle, such as everything for one data platform. You can deploy, tag, lock and delete it as one unit. A resource lives in exactly one group, and the group has a location of its own for its metadata.', 'Group what is deployed and deleted together.'],
          ['A region is a place', 'A region is a geographic area with data centers, such as `westeurope` in the Netherlands. Most resources live in one region. Many regions have availability zones: separate buildings with their own power and network. Data leaves a region only when you copy it, and copying costs money.', 'Choose the region once and carefully.'],
          ['Everything has a resource ID', 'Azure Resource Manager gives every resource an ID: subscription, resource group, provider, type and name. Role assignments, policies, locks and templates refer to resources by ID. The next screens show four addresses, and they are not all the same kind of thing.', 'The resource ID is the address that management tools use.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit.', t: 'When something is "missing", check the directory and the subscription filter in the portal first, then the region. A resource in another subscription is invisible from this one.' }
      }),

      B.code({
        id: 'm1-rid', t: 1, src: 'docs', title: 'Four addresses for one lake', file: 'addresses.txt', lang: 'text', code: IDS,
        steps: [
          { say: 'The same lake has four different addresses, and each one is for a different tool. Read them in turn. The first two are resource IDs for management. The last two are data addresses.', lines: null },
          { say: 'A resource ID for the storage account. It has the pattern `/subscriptions/ID/resourceGroups/NAME/providers/NAMESPACE/TYPE/NAME`. Role assignments and templates use this form.', lines: [1, 1] },
          { say: 'A child resource appends its own parts. A container is `blobServices/default/containers/raw` below the account. A role assigned to this ID reaches only this container.', lines: [2, 2] },
          { say: 'A URL for the data. The account name is the first part of the host. `dfs` is the Data Lake endpoint, and `blob` is the blob endpoint of the same account. The path is the container, then the blob name.', lines: [3, 3] },
          { say: 'An `abfss` path, which is what Spark, Databricks and Synapse use. Read it as container `raw`, at the account, then the path. The `s` means TLS. You cannot paste this into a browser.', lines: [4, 4] }
        ],
        note: 'The most common confusion is to give a tool the wrong kind of address: a data URL where a resource ID belongs in a role assignment, or the reverse. Mission 3 shows the error that follows.'
      }),

      B.flow({
        id: 'm1-hier', t: 1, src: 'docs', title: 'The hierarchy: roles and policy flow downward', g: 'tenant', legend: true,
        steps: [
          { say: 'One tenant, and below it a tree. Press Next to walk down it. What you assign at one level reaches everything below that level.', cap: 'The Azure hierarchy.' },
          { say: 'Step 1. The tenant is the directory. Users, groups and managed identities live here, and the tenant also owns the root management group.', on: ['t1'], focus: ['tn', 'mg'], tags: ['tg_down'], cap: 'Identity at the top.' },
          { say: 'Step 2. Management groups hold subscriptions in a tree. One group for shared services and one for the workloads. A policy or a role assigned to a group applies to every subscription in it.', on: ['t2a', 't2b'], focus: ['mg', 'mgp', 'mgl'], tags: ['tg_down'], cap: 'Group subscriptions to govern them together.' },
          { say: 'Step 3. Subscriptions hold the work. Brewline has one for production, one for development and one for platform services such as logs. Each has its own bill, its own quotas and its own blast radius.', on: ['t3a', 't3b', 't3c'], focus: ['mgp', 'mgl', 'sl', 'sp', 'sd'], tags: ['tg_bill'], cap: 'The bill belongs to a subscription.' },
          { say: 'Step 4. Resource groups hold what is deployed together. Step 5. The resources sit inside them. A role assigned at the resource group reaches this storage account and every other resource in the group.', on: ['t4', 't5'], focus: ['sp', 'rg', 'rs'], tags: ['tg_down'], cap: 'A role at a resource group reaches its resources.' }
        ]
      }),

      B.cmp({
        id: 'm1-orgs', t: 1, src: 'docs', title: 'One subscription or many',
        say: 'A data team can run everything in one subscription, or give each environment its own. Press Next to compare them on six questions.',
        cols: ['Question', 'One subscription for everything', 'A subscription for each environment'],
        hl: 2,
        rows: [
          ['Blast radius', 'A mistake or a leaked key reaches production data.', 'A mistake in development stays in the development subscription.'],
          ['Permissions', 'Careful role assignments on each resource group keep developers away from production.', 'The subscription boundary does most of the work. Developers hold no role in production.'],
          ['Cost', 'One bill. Tags and resource groups are the only way to split it.', 'The bill splits by subscription, and it can still roll up to one billing account.'],
          ['Quotas', 'All teams share the limits of one subscription.', 'Limits apply to each subscription, so a test cannot use up the production quota.'],
          ['Audit', 'Logs sit with everything else, where an owner can change them.', 'A separate platform subscription holds the logs where engineers cannot change them.'],
          ['Effort', 'Quick to start.', 'Needs management groups, policy and a baseline that every new subscription gets.']
        ],
        steps: [
          { upto: 2, say: 'Safety first. A separate subscription contains mistakes and removes the need for clever role assignments.' },
          { upto: 4, say: 'Cost and limits. Teams stop surprising each other when the bill and the quota belong to the subscription.' },
          { upto: 6, say: 'Audit and effort. The extra subscription for logs is cheap, and the setup effort is paid once.' }
        ],
        pick: 'Start with **at least a production and a non-production subscription**, and a **platform subscription** for logs that engineers cannot change. Put the lake of each environment in its own subscription.'
      }),

      B.talk({
        id: 'm1-gov', t: 2, src: 'docs', title: 'Management groups, policy and landing zones',
        say: 'Four ideas manage many subscriptions. Press Next for each.',
        items: [
          ['Management groups', 'A tree above the subscriptions, up to six levels deep below the root. A role assignment or a policy at a group flows to every subscription below it. Keep the tree shallow, and group by how you govern, not by the org chart.', 'The tree of subscriptions.'],
          ['Azure Policy', 'Rules that check or enforce settings: deny a storage account with public access, require a tag, deploy diagnostic settings when a resource appears. A policy has an effect such as audit, deny, modify or deployIfNotExists. Assign it at a management group and every new resource is covered.', 'Guardrails that apply by themselves.'],
          ['Landing zones', 'The Cloud Adoption Framework describes a landing zone: a subscription that arrives with the network, identity, policy and logging already in place. Teams get a landing zone, and they build in it. Bicep or Terraform modules create them the same way each time.', 'A baseline that every new subscription gets.'],
          ['Blueprints are going away', 'Azure Blueprints is being retired. Microsoft moved the end date to January 2027, with phases that start in July 2026, and points to deployment stacks and template specs instead. If an older guide tells you to use Blueprints, read the retirement page first.', 'Use deployment stacks and template specs.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm1-services', t: 1, src: 'docs', title: 'The service for each job',
        say: 'A data platform needs a service for each job. Press Next to read twelve of them in three groups. The right column is the meter that each service bills on.',
        cols: ['Job', 'Service', 'Use it when', 'You pay for'],
        hl: 1,
        rows: [
          ['Keep files', 'Blob Storage with ADLS Gen2', 'Always. It is the lake.', 'GB-months by tier, operations, data out'],
          ['Know the data', 'Microsoft Purview, Unity Catalog', 'Many teams need to find, classify and trace data.', 'Capacity units, or DBUs with Databricks'],
          ['Move data in batch', 'Data Factory', 'Copy and orchestrate, with little or no code.', 'Activity runs and DIU-hours'],
          ['Transform with Spark', 'Databricks, Synapse Spark, Fabric', 'Heavy cleaning and joins in code.', 'VM hours and DBUs, or vCore-hours'],
          ['Query files with SQL', 'Synapse serverless SQL pool', 'Ad hoc and scheduled SQL on the lake.', 'TB of data processed'],
          ['Serve dashboards', 'Synapse dedicated pool, Fabric Warehouse', 'Many users and repeated queries.', 'DWU-hours, or Fabric capacity'],
          ['Take in a stream', 'Event Hubs', 'Real-time events.', 'Throughput units or processing units, and events'],
          ['Land a stream in the lake', 'Event Hubs Capture, Stream Analytics', 'Batch a stream into files.', 'Throughput units, or streaming units'],
          ['React to an event', 'Event Grid, Functions', 'Short code, triggered by something.', 'Operations, and executions with GB-seconds'],
          ['Queue and route', 'Storage queues, Service Bus', 'Decouple, retry, route.', 'Operations, or messaging units'],
          ['Run steps in order', 'Data Factory, Logic Apps', 'Branches, retries, waits.', 'Activity runs, or actions'],
          ['Watch it all', 'Azure Monitor, Log Analytics', 'Always.', 'GB of logs ingested and kept']
        ],
        steps: [
          { upto: 4, say: 'Storage and compute. The lake holds the files, a catalog names the data, and Data Factory or Spark move and transform it.' },
          { upto: 8, say: 'Ask and serve. Serverless SQL queries the lake. A dedicated pool serves repeated queries. Event Hubs brings new events in.' },
          { upto: 12, say: 'Glue it together. Functions react, queues absorb, pipelines order the work, and Monitor watches.' }
        ],
        pick: 'Learn the **meter** of each service. Interviewers ask "what does it cost" about as often as "what does it do", and the meter is the first half of the answer.'
      }),

      B.cmp({
        id: 'm1-aws', t: 1, src: 'docs', title: 'If you know AWS: the same jobs on Azure',
        say: 'Many people arrive from AWS, and the jobs are the same. Press Next to read the matches in three groups. The last column is the difference that causes the most mistakes.',
        cols: ['AWS', 'Azure', 'A difference to know'],
        hl: 1,
        rows: [
          ['S3 bucket', 'Storage account, container, ADLS Gen2', 'There is a storage account above the container. With a hierarchical namespace, folders are real and can be renamed in one step.'],
          ['IAM roles and policies', 'Entra ID, Azure RBAC, managed identities', 'You assign a built-in role at a scope, instead of writing a policy for each identity. Data access has its own roles.'],
          ['Organizations and accounts', 'Management groups and subscriptions', 'The tenant, the identity directory, sits above all of them.'],
          ['Glue ETL and crawlers', 'Data Factory, Spark in Databricks or Synapse', 'There is no single Glue that does both. Copy and orchestration are one service, Spark is another.'],
          ['Glue Data Catalog', 'Purview, Unity Catalog, lake databases', 'No single catalog is shared by every engine out of the box.'],
          ['Athena', 'Synapse serverless SQL pool', 'T-SQL, not Presto SQL. The billing meter is the same: data processed.'],
          ['Redshift', 'Synapse dedicated SQL pool, Fabric Warehouse', 'A dedicated pool always stores a table in 60 distributions.'],
          ['Kinesis Data Streams', 'Event Hubs', 'You choose the partition count when you create the hub. Consumers share partitions through a checkpoint store in blobs.'],
          ['Firehose', 'Event Hubs Capture, Stream Analytics', 'Capture writes Avro files to the lake on a time or size window.'],
          ['SQS', 'Storage queues, Service Bus', 'A storage queue has no built-in dead-letter queue. Service Bus does.'],
          ['EventBridge, SNS', 'Event Grid, Service Bus topics', 'Event Grid pushes events to handlers, and retries them for a limited time.'],
          ['Lambda', 'Azure Functions', 'Pick a hosting plan. The newer serverless plan is Flex Consumption.'],
          ['Step Functions', 'Data Factory pipelines, Logic Apps, Durable Functions', 'A pipeline is JSON made in a visual editor, with its own expression language.'],
          ['KMS, Secrets Manager', 'Key Vault', 'One service holds keys, secrets and certificates.'],
          ['CloudFormation', 'Bicep, ARM templates', 'Bicep compiles to ARM JSON. A what-if shows changes before you deploy.'],
          ['CloudWatch, VPC endpoints', 'Azure Monitor, private endpoints', 'Logs are queried with KQL. A private endpoint needs a private DNS zone to work.']
        ],
        steps: [
          { upto: 6, say: 'Storage, identity, compute and catalog. The names change, and so do the boundaries: the storage account and the tenant are layers you did not have.' },
          { upto: 11, say: 'Query, warehouse and streaming. The jobs match closely. Watch the dead-letter queue and the checkpoint store.' },
          { upto: 16, say: 'Events, orchestration, secrets, delivery and monitoring. Same jobs, different shapes.' }
        ],
        pick: 'Think in **jobs, not names**. For each AWS service you know, say the job, find the Azure service for it, and ask one question: what is the boundary and what is the meter?'
      }),

      B.talk({
        id: 'm1-meters', t: 1, src: 'docs', title: 'The five meters of an Azure bill',
        say: 'Almost every line of an Azure bill is one of five meters. Press Next for each. The prices are examples from public pages, and they change.',
        items: [
          ['Storage', 'You pay for each GB for each month, at a rate set by the tier and the redundancy. Hot costs most to keep and least to read. Archive costs least to keep and most to read. Versions, snapshots and soft-deleted data count too.', 'Lifecycle rules are the lever.'],
          ['Operations', 'Storage charges for each 10,000 operations, and writes cost more than reads. Millions of tiny files mean millions of operations, which is a second reason to keep files large.', 'Few, big files.'],
          ['Compute time', 'Data Factory bills activity runs and DIU-hours. A dedicated SQL pool bills for every hour it exists, running or idle. Spark bills VM hours and, with Databricks, DBUs. Idle compute bills the same as busy compute unless it stops.', 'Pause or stop what is not working.'],
          ['Data processed or ingested', 'A serverless SQL pool bills for the TB it processes. Log Analytics bills for the GB of logs it ingests. A private endpoint bills for the GB that pass through it. Reading less, or logging less, cuts these lines.', 'Read less. Log less.'],
          ['Data transfer', 'Data into Azure is free. Data out to the internet costs money after a monthly free amount. Copies between regions are billed too, and replication to a paired region is one of them.', 'Keep traffic in one region when you can.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The surprise bills.', t: 'Most of them come from three lines: a dedicated pool left running, a log workspace that takes every log of every resource, and a serverless query that scans a whole CSV lake.' }
      }),

      B.cmp({
        id: 'm1-region', t: 1, src: 'docs', title: 'Choosing a region',
        say: 'Six questions decide the region of a data platform. Press Next to read them.',
        cols: ['Question', 'What to check', 'A common answer'],
        hl: 1,
        rows: [
          ['Where are the users and sources?', 'Latency and the cost of moving data into the lake.', 'The region closest to the sources of the data.'],
          ['What does the law say?', 'Data residency rules for personal data.', 'A region inside the same legal area.'],
          ['Is the service there?', 'Newer services and features reach some regions first. Availability zones exist in many regions, not all.', 'Check the products-by-region table before you design.'],
          ['What does it cost?', 'Prices differ by region.', 'Compare the lines that dominate your bill.'],
          ['What if it fails?', 'A region-wide outage is rare, but it happens. Most regions have a paired region for geo-redundant storage.', 'Replicate critical data to the pair, and test a restore.'],
          ['Does data cross regions?', 'Transfer between regions is billed and slower.', 'Avoid it in the hot path. Use it for backup.']
        ],
        steps: [
          { upto: 2, say: 'Place and law. The sources and the legal area narrow the list quickly.' },
          { upto: 4, say: 'Services and price. Check that every service you need is in the region before you commit.' },
          { upto: 6, say: 'Failure and traffic. Plan the pair for backup, and keep cross-region traffic out of the daily path.' }
        ],
        pick: 'Pick the region **closest to your data sources that satisfies the law**, confirm that every service you need runs there, and replicate only what you must restore.'
      }),

      B.talk({
        id: 'm1-shared', t: 1, src: 'docs', title: 'Shared responsibility',
        say: 'Microsoft and you each secure part of the system. Press Next for each point.',
        items: [
          ['Microsoft secures the cloud', 'The buildings, the hardware, the network between data centers and the software of the managed services. You do not patch Blob Storage or Data Factory.', 'Their side.'],
          ['You secure what you put in it', 'Who may read the data, how it is encrypted, which network paths exist, and how each service is configured. A managed service still needs your configuration.', 'Your side.'],
          ['The failures are on your side', 'A storage account left open to the internet, an account key committed to a repository, an Owner role given to a pipeline, a secret in a pipeline parameter. These cause most data breaches in the cloud, and none of them is a Microsoft fault.', 'Common ways data leaks.'],
          ['Tools that find them', 'Microsoft Defender for Cloud scores your settings, Azure Policy blocks the bad ones, and the activity log records who changed what. Switch them on in every subscription.', 'Switch them on at the start.']
        ],
        cols: 2
      }),

      B.talk({
        id: 'm1-fabric', t: 2, src: 'docs', title: 'Where Microsoft Fabric fits',
        say: 'You will hear the word Fabric in every Azure data interview. Press Next for four points, and keep them honest. Fabric gets a tutorial of its own later.',
        items: [
          ['What it is', 'Microsoft Fabric is a software-as-a-service analytics platform. It keeps data in OneLake, one logical lake in Delta and Parquet, and offers a lakehouse, a warehouse, pipelines, real-time analytics and Power BI under one capacity that you buy by size.', 'One platform, one lake, one capacity.'],
          ['What it replaces', 'Fabric is where Microsoft is putting its new investment for what Synapse and Data Factory did. Synapse as a whole has not been retired, but parts of it have, and the guidance for new work points to Fabric. Read the retirement notices for each Synapse feature you rely on.', 'The direction is clear. The dates are per feature.'],
          ['Why this course still teaches the Azure services', 'Most platforms that exist today run on storage accounts, Data Factory, Synapse and Event Hubs. The ideas carry over: a lake of Parquet and Delta, identities and roles, pipelines, partitions and checkpoints, and a meter for everything. You can read a Fabric design once you can read these.', 'The ideas carry over.'],
          ['What to say in an interview', 'Say what you ran, name the Azure services, and say how you would move it to Fabric: the data stays in open formats, the pipelines and the SQL need porting, and the identity and cost rules change. Do not claim experience you do not have.', 'Honest, specific, and curious.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'You try to create a storage account named `st-brewline-lake`. Azure rejects the name. Why?',
        opts: [
          { t: 'Storage account names allow only lower-case letters and digits, 3 to 24 characters, so the dashes are not allowed', fb: '' },
          { t: 'The name must be at least 30 characters long', fb: 'The limit is 24, and the minimum is 3.' },
          { t: 'Dashes are allowed only in production subscriptions', fb: 'No subscription allows them in a storage account name.' },
          { t: 'The name must start with a capital letter', fb: 'Capital letters are not allowed at all.' }
        ],
        ok: 0, why: 'The name becomes the first part of the endpoint host, `st...blob.core.windows.net`, so it must be a valid host label, lower case, and unique across Azure. That is why a company prefix and an environment, as in `stbrewlinelakeprod`, avoid clashes. This rule comes from the documentation.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Which level of the hierarchy is the boundary for quotas and for the bill?',
        opts: [
          { t: 'The tenant', fb: 'The tenant is the identity directory. It holds no resources and no bill.' },
          { t: 'The resource group', fb: 'A resource group groups resources. Quotas and the bill belong to the subscription above it.' },
          { t: 'The subscription', fb: '' },
          { t: 'The region', fb: 'A region is a place. A subscription spans all regions.' }
        ],
        ok: 2, why: 'A subscription holds the resources, receives the bill and carries the quotas. Cost analysis can group by resource group or by tag, but those are views of a subscription, not boundaries of their own.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'A teammate cannot see the storage account that you just created and can see in the portal. What do you check first?',
        opts: [
          { t: 'The storage account is replicated to the wrong paired region', fb: 'Replication does not hide the account from anyone.' },
          { t: 'Whether the teammate is in the same directory and subscription filter, and holds any role at that scope', fb: '' },
          { t: 'Storage accounts are visible only to their creator for 24 hours', fb: 'There is no such rule.' },
          { t: 'Whether the account name has a capital letter', fb: 'Names are lower case, and the name has no effect on visibility.' }
        ],
        ok: 1, why: 'The portal shows only the subscriptions that the signed-in identity can see, and only the ones in the selected directory and filter. With no role at that scope, the account is invisible. A Reader role at the subscription or the resource group fixes it.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the setup of a new subscription for the data team in order.',
        items: [
          'Create the subscription under the right management group',
          'Apply the policies: deny public storage accounts, require tags',
          'Create the Entra groups and assign the roles at the resource group',
          'Set a budget and an alert at the subscription',
          'Create the lake storage account, hardened, in its resource group',
          'Add the private endpoints before the first pipeline runs'
        ],
        why: 'Boundaries first, then identity, then money, then data. A policy in place before the first resource means nothing is ever created without it. The private endpoints come before the first pipeline so that no data takes the public path.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: how many subscriptions for Brewline?',
        scenario: 'Brewline Europe has **8 engineers**, one production lake and a wish to test changes safely. Finance wants a clear bill for production. The security lead wants an audit trail that engineers cannot change.',
        opts: [
          { t: 'One subscription for everything, with resource groups, roles and tags to separate environments', d: 'Quick to start. One bill.', lose: 'A mistake in a test reaches production, the audit trail sits where owners can change it, and the production bill must be rebuilt from tags.' },
          { t: 'Three subscriptions: development, production, and a platform subscription that only the security lead manages', d: 'A boundary around production, a clean bill, and a protected trail.' },
          { t: 'A separate subscription for each engineer and each service', d: 'The strictest separation.', lose: 'Dozens of subscriptions for 8 engineers. Each one needs the baseline, the policies and the roles, and sharing data between them needs cross-subscription access. The effort is larger than the risk it removes.' }
        ],
        pick: 1,
        why: 'Three subscriptions match the three needs: safe testing, a clean production bill and a protected trail. The effort is one baseline applied three times, and management groups apply the policies to all of them at once.',
        when: 'A larger company with independent data domains adds a subscription for each domain, and a platform subscription for the shared catalog and governance. Add subscriptions when a boundary solves a real problem, not before.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'docs', title: 'Incident: the bill rose by 60 percent', time: '10:15',
        alert: '**The cost of `sub-brewline-prod` is 60 percent above last month, and nobody changed an instance size.** The only new things are a Synapse dedicated SQL pool that an engineer created for a test, and a diagnostic setting that sends the logs of every resource to one workspace. Few resources carry tags.',
        clues: ['Cost analysis can group by resource, by meter and by tag', 'A dedicated pool bills for every hour it exists', 'Log Analytics bills for each GB ingested'],
        opts: [
          { t: 'Open cost analysis, group by resource and then by meter, and compare with last month to find the lines that grew', fb: '' },
          { t: 'Delete the resource group with the newest resources', fb: 'That is drastic and may delete the production pipeline. Find the cause first.' },
          { t: 'Ask Microsoft to explain the bill', fb: 'Support has the same data you do. The cost analysis view answers this in minutes.' },
          { t: 'Turn off every diagnostic setting', fb: 'You lose the audit trail and the alerts. Cut the volume of the noisy logs instead.' }
        ],
        best: 0,
        why: 'The meter names the cause. Grouped by resource, the pool and the workspace stand out. Grouped by meter, DWU hours and data ingested are the lines that grew. The fix is to pause the pool when it is idle and to send only the logs that someone reads.',
        checks: [
          ['Find the line', 'Cost analysis, grouped by service and then by meter, compared with the previous month.'],
          ['Find the owner', 'Group by resource group and by tag. Missing tags are themselves a finding.'],
          ['Check the usual suspects', 'A dedicated pool left running, a workspace taking all logs, a serverless query on CSV, egress.'],
          ['Fix and measure', 'Pause the pool, narrow the diagnostic setting, and watch the daily cost for a week.'],
          ['Set the rule', 'A budget with an alert, a required-tag policy, and an anomaly alert on the subscription.']
        ],
        tell: 'The cost of our production subscription rose 60 percent in a month. Cost analysis grouped by meter showed two lines that grew: the hours of a Synapse dedicated pool that an engineer had created for a test and left running, and the data ingested by a Log Analytics workspace that received every log of every resource. I paused the pool, narrowed the diagnostic setting to the logs we query, and added a budget alert and a policy that requires an owner tag. The daily cost fell to the old level within a week.',
        prevent: ['Set a **budget with alerts** on every subscription', 'Require an **owner tag** with a policy', 'Pause **idle pools** with a schedule', 'Choose **which logs** each diagnostic setting sends']
      }),

      B.qa({
        id: 'qa-map', t: 1, tag: 'Azure', secs: 60,
        q: 'Walk me through the Azure services you would use to build a data platform.',
        pts: ['ADLS Gen2 as the lake, with raw, clean and curated zones', 'Data Factory to copy and orchestrate', 'Databricks or Synapse Spark for heavy transforms', 'Synapse serverless or a dedicated pool, and Power BI, to query', 'Event Hubs for streams, Event Grid and Functions for reactions', 'Entra ID, Key Vault and Monitor around it, and Bicep to build it'],
        short: 'I start with a storage account with a hierarchical namespace as the lake, with a raw zone for files as received, a clean zone for typed Parquet and a curated zone for business tables. A catalog such as Purview or Unity Catalog names and governs the data.\n\nData comes in through Data Factory for database changes, Event Hubs for events, and file uploads for supplier files. Data Factory moves data between zones and orders the work, and Spark in Databricks or Synapse does the heavy cleaning. A serverless SQL pool queries the lake, and a dedicated pool or Power BI serves dashboards that need fast repeated queries.\n\nEntra ID gives each pipeline a managed identity with a role at the right scope, Key Vault holds secrets and keys, and Azure Monitor and budgets watch the platform. Bicep builds all of it from code. For each service I also say what it costs: storage, operations, compute time, data processed or data moved.',
        fu: [
          ['Why three zones in the lake?', 'Raw is the copy I can always rebuild from. Clean has types and no duplicates in a cheap columnar format. Curated is small and shaped for questions.'],
          ['When do you choose Databricks over Synapse Spark?', 'When the team wants one governed platform for SQL, Spark and machine learning, with Unity Catalog, and is willing to pay the DBU premium. Synapse Spark suits a team that already works in a Synapse workspace.']
        ],
        trap: 'Listing services without saying why. Every service in the answer needs one reason and one meter.',
        real: 'Describe the platform your team runs and the one service you would change.'
      }),

      B.qa({
        id: 'qa-hier', t: 2, tag: 'Azure', secs: 90,
        q: 'Why would you use several subscriptions for a data platform, and how do you manage them?',
        pts: ['The subscription is a billing, access and quota boundary', 'Separate production from development', 'A platform subscription for logs that nobody can edit', 'Management groups carry roles and policy to many subscriptions', 'Azure Policy as guardrails, and a landing zone baseline', 'The cost: a baseline for each subscription and cross-subscription access'],
        short: 'A subscription is a billing boundary, an access boundary and the place where quotas apply, so I use separate subscriptions to contain mistakes and to split the bill without relying on tags. A developer with no role in production cannot damage production, whatever else is configured.\n\nI keep at least three: development, production and a platform subscription where logs are written and engineers cannot change them. Quotas also apply to each subscription, so a load test cannot use up the production limits.\n\nI manage them with management groups. A role assignment or an Azure Policy at a group reaches every subscription below it: deny public storage, require tags, deploy diagnostic settings. A landing zone gives each new subscription the baseline. People sign in through Entra ID.\n\nThe price is effort. Sharing data between subscriptions needs cross-subscription roles, and every new subscription needs the baseline. So I add a subscription when a boundary solves a real problem.',
        fu: [
          ['What does Azure Policy do that a role cannot?', 'A role says who may act. A policy says what a resource may look like, whoever creates it. It can deny a bad setting, require a tag, or add a missing one.'],
          ['How does a pipeline in one subscription read a lake in another?', 'The identity of the pipeline gets a data role on the other lake, at the account or container. The firewall or private endpoint of that lake must allow the caller too.']
        ],
        trap: 'Saying that more subscriptions are always better. The answer is a boundary where it solves a problem, and a baseline that makes new ones cheap.',
        real: 'Describe how many subscriptions your company uses and the boundary that mattered most.'
      }),

      B.qa({
        id: 'qa-bill', t: 2, tag: 'Azure', secs: 90,
        q: 'The monthly Azure bill of the data platform doubled. How do you find out why?',
        pts: ['Cost analysis by service, then by meter', 'Compare with the previous month, line by line', 'Tags, resource groups or subscriptions to find the owner', 'Check the usual suspects: a running dedicated pool, log ingestion, serverless scans, egress, small-file operations', 'Find what changed: a new resource, a new diagnostic setting, a changed query', 'Budgets and anomaly alerts so it is found early next time'],
        short: 'I open cost analysis, group by service and compare with the previous month to find the line that grew. Then I group by meter inside that service, because the meter names the cause: DWU hours, data processed, data ingested, operations or data transfer.\n\nNext I find the owner with subscriptions, resource groups or tags, and ask what changed: a new pool that was left running, a diagnostic setting that sends every log, a query that now selects every column of a CSV lake, or a pipeline that copies millions of tiny files.\n\nI check the usual suspects first. A dedicated pool running all night, a Log Analytics workspace with no filter, a serverless query that scans the whole lake, and egress to the internet. For a deep look I export the cost data to the lake and query it.\n\nTo find it early next time I set budgets with alerts and turn on anomaly alerts on every subscription.',
        fu: [
          ['How do you assign cost to teams?', 'Separate subscriptions, plus tags on resources, enforced by policy. Tags apply from the time you add them, so add them early.'],
          ['Name the three cheapest fixes.', 'Pause the dedicated pool when idle, send only the logs you read, and read Parquet instead of CSV in serverless.']
        ],
        trap: 'Starting with a guess. Start with the data: service, meter, owner, and what changed.',
        real: 'Describe a bill spike you found and the one change that fixed it.'
      }),

      B.qa({
        id: 'qa-shared', t: 1, tag: 'Azure', secs: 60,
        q: 'What does the shared responsibility model mean for a data team?',
        pts: ['Microsoft secures the cloud: buildings, hardware, managed service software', 'You secure what you put in it', 'Access, encryption and network settings are yours', 'Most breaches come from configuration, not from Azure', 'Tools: Defender for Cloud, Azure Policy, the activity log', 'Say what you configured yourself'],
        short: 'Microsoft is responsible for the security of the cloud: the buildings, the hardware, the network and the software of managed services such as Blob Storage and Data Factory. I am responsible for the security of what I put in the cloud: who may read the data, how it is encrypted, which network paths exist and how each service is configured.\n\nFor a data team that means roles at the right scope, a storage account with public access off and the account key disabled, private endpoints where the data is sensitive, and secrets in Key Vault instead of in code. A managed service still needs my configuration. Most cloud data breaches come from configuration mistakes such as a public storage account or an over-broad role, not from a failure inside Azure.\n\nI use Defender for Cloud to find weak settings, Azure Policy to block them, and the activity log to see who changed what, and I switch them on in every subscription from the start.',
        fu: [
          ['Who encrypts the data in a storage account?', 'Storage encrypts all data at rest with keys that Microsoft manages. I choose my own key in Key Vault when the data needs control over the key.'],
          ['Give an example of a mistake on the customer side.', 'An account key committed to Git, Owner given to a pipeline, or a container set to allow anonymous reads.']
        ],
        trap: 'Saying that Microsoft handles security. It handles its part. The settings of your subscription are yours.',
        real: 'Describe a security setting that you added to a subscription and what it catches.'
      }),

      B.qa({
        id: 'qa-aws', t: 1, tag: 'Azure', secs: 60,
        q: 'You know AWS well. How do the main services of an AWS data platform map to Azure?',
        pts: ['S3 maps to a storage account with ADLS Gen2', 'IAM maps to Entra ID, RBAC and managed identities', 'Glue maps to Data Factory plus Spark in Databricks or Synapse', 'Athena maps to Synapse serverless, Redshift to a dedicated pool or Fabric Warehouse', 'Kinesis maps to Event Hubs, SQS and SNS to Service Bus and Event Grid', 'Say the differences as well as the names'],
        short: 'S3 maps to a storage account with ADLS Gen2, where a container takes the place of the bucket and a hierarchical namespace gives real folders and ACLs. IAM maps to Microsoft Entra ID, Azure RBAC and managed identities: I assign a built-in role at a scope instead of writing a policy for each identity.\n\nGlue splits in two: Data Factory copies and orchestrates, and Spark runs in Databricks or Synapse. Athena maps to the Synapse serverless SQL pool, both billed by data processed, and Redshift maps to a dedicated SQL pool, which always stores a table in 60 distributions, or to Fabric Warehouse.\n\nKinesis maps to Event Hubs, with partitions and a checkpoint store in blobs. SQS maps to storage queues, which have no built-in dead-letter queue, or to Service Bus, which has one. EventBridge and SNS map to Event Grid. Lambda is Functions, Step Functions is Data Factory or Logic Apps, KMS and Secrets Manager are Key Vault, and CloudFormation is Bicep.\n\nThe jobs match. The boundaries differ, so I always ask what the boundary and the meter are.',
        fu: [
          ['What is the biggest surprise for an AWS engineer?', 'The layers above the container: the storage account, the subscription and the tenant. Permissions, networking and cost each attach at a different layer.'],
          ['Where is there no match?', 'Glue crawlers and a single shared catalog. On Azure you use Purview, Unity Catalog or a lake database, and they do not all share one metastore.']
        ],
        trap: 'Giving a table of names with no differences. The interviewer wants to hear that you know where the analogy breaks.',
        real: 'Describe one thing you built on AWS and how you would build it on Azure.'
      }),

      B.qa({
        id: 'qa-fabric', t: 2, tag: 'Azure', secs: 60,
        q: 'Where does Microsoft Fabric fit next to Synapse and Data Factory?',
        pts: ['Fabric is a SaaS analytics platform on OneLake', 'It offers lakehouse, warehouse, pipelines, real-time and Power BI under one capacity', 'New investment goes to Fabric, and Synapse parts are being retired one by one', 'Check the retirement notices for each feature you use', 'Data stays in Delta and Parquet, so it is portable', 'Say what you would port and what changes'],
        short: 'Fabric is a software-as-a-service analytics platform. It keeps data in OneLake, one logical lake in open formats, and gives you a lakehouse, a warehouse, pipelines, real-time analytics and Power BI under one capacity that you size and pay for.\n\nMicrosoft is putting its new investment there. Synapse as a whole has not been retired, but several parts of it have, and the guidance for new work points to Fabric, so for each Synapse or Data Factory feature I read the retirement notice before I build on it.\n\nThe move is mostly practical. The data is already Parquet or Delta, so it stays. Pipelines and SQL need porting, since Fabric Warehouse is not fully compatible with a dedicated pool. Identity, network and cost rules change, because you buy capacity and not separate services.\n\nSo for an existing platform I keep it running and plan the move by workload, and for a new platform I start by comparing Fabric with the Azure services on cost and on the features I need.',
        fu: [
          ['Is the data locked into Fabric?', 'No. OneLake stores Delta and Parquet, so other engines can read it. What you port is the code and the pipelines.'],
          ['When would you still choose Databricks?', 'When the team already runs Unity Catalog, needs its machine learning tools, or wants to stay neutral across clouds.']
        ],
        trap: 'Claiming that Synapse is dead or that Fabric solves everything. Both are overstatements.',
        real: 'Describe one workload and the platform you would choose for it today.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Tenant Scout', color: '#BFDBFE',
        pts: [
          'A **tenant** holds identity. A **subscription** is a billing, access and quota boundary. A **region** is a place, and data stays in it unless you copy it.',
          'Use **several subscriptions**: at least development, production and a platform subscription for logs that engineers cannot change.',
          'Know the **service and the meter** for each job: storage, Data Factory, Spark, serverless SQL, dedicated pools, Event Hubs, Functions, queues.',
          'A bill is **five meters**: storage, operations, compute time, data processed or ingested, and data transfer.',
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
