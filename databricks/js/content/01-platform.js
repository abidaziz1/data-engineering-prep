/* Mission 1: the platform. Planes, compute types, billing, and the Azure view. Documentation only: nothing here ran on Databricks. */
(function () {
  var B = LAB.b;

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The Databricks platform', short: 'Platform', blurb: 'Planes, compute, billing and the Azure view', minutes: 26,
    focus: ['sf'],
    goals: [
      'Say what Databricks adds to **Apache Spark**: managed compute, Delta tables, a catalog and jobs.',
      'Draw the **control plane**, the **compute plane** and **your storage**, and say where the data lives.',
      'Pick a **compute type** for a notebook, a nightly job and a dashboard.',
      'Explain what a **DBU** is and why an idle cluster still bills.',
      'Name the main differences between **Azure Databricks** and Databricks on AWS.'
    ],
    say: 'Mission 1 is the map of the platform. Spark is an engine that runs code on many machines. Databricks is the service that starts those machines, stores the tables, names and protects the data, and runs your jobs on a schedule. Know the pieces and where each one runs, and the later missions fit into place. Every screen in this mission comes from documentation, because nothing here ran on Databricks.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, src: 'docs', title: 'Five pieces of Databricks',
        say: 'Databricks has five pieces you will use every day. Press Next for each.',
        items: [
          ['A workspace', 'The web app and API at your own URL. You write notebooks and SQL there, create jobs, and manage compute. People sign in with the company identity. One company usually has one workspace for each environment: development, test and production.', 'The place you work in.'],
          ['Compute', 'Spark runs on compute: a **cluster** of virtual machines with one driver and many workers, or **serverless** compute that Databricks runs for you. You start it, run code on it, and stop it. It bills while it runs.', 'The machines that run your code.'],
          ['Tables in your storage', 'A table is a folder of Parquet files plus a transaction log, in **Delta Lake** format, in your own cloud storage: ADLS Gen2 on Azure, S3 on AWS. Compute can disappear and the tables stay.', 'Data lives in storage, not on compute.'],
          ['Unity Catalog', 'The catalog gives every table a three-part name, `catalog.schema.table`. It stores the grants, records lineage, and sits between compute and storage. Mission 7 covers it.', 'Names, permissions and lineage.'],
          ['Jobs and pipelines', 'A **job** runs tasks on a schedule or on a trigger, with retries and alerts. A **pipeline** is a managed set of tables that Databricks keeps up to date. Missions 8 and 9 cover them.', 'Running work without a person.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Where the data is.', t: 'Delete the cluster and nothing is lost. Delete the files in storage and the table is gone.' }
      }),

      B.flow({
        id: 'm1-planes', t: 1, src: 'docs', title: 'Control plane, compute plane and your storage', g: 'planes', legend: true,
        steps: [
          { say: 'Databricks splits into places. The control plane runs in the Databricks account. Compute runs either in your cloud subscription (classic) or in a Databricks-managed layer (serverless). Your tables stay in your storage. Press Next to follow one cluster start.', cap: 'Three places, and the arrows between them.' },
          { say: 'Step 1. You click Start on a cluster in the web app. The web app is part of the control plane. It passes the request to the cluster manager.', on: ['p1'], focus: ['ui', 'cm'], cap: 'The control plane receives the request.' },
          { say: 'Step 2. For classic compute, the cluster manager asks your cloud for virtual machines. They start inside your own network and your own subscription: one driver and as many workers as you configured.', on: ['p2'], focus: ['cm', 'vm'], cap: 'Classic compute: the VMs are yours, and so is the VM bill.' },
          { say: 'Step 2, serverless version. A job from the scheduler can run on serverless compute instead. Databricks owns those machines and starts them quickly. You do not pick instance types and you do not see the VMs.', on: ['p3'], focus: ['jb', 'sv'], cap: 'Serverless compute: Databricks runs the machines.' },
          { say: 'Step 3. Both kinds of compute read and write the same tables in your storage. The Delta files do not move when you change the compute type.', on: ['p4', 'p5'], focus: ['vm', 'sv', 'lake'], tags: ['tg_data'], cap: 'Compute is replaceable. The tables are not.' },
          { say: 'Step 4. Unity Catalog checks the privileges before compute reads or writes a table, and it controls which storage paths the compute may reach. It runs in the control plane.', on: ['p6'], focus: ['uc', 'lake'], tags: ['tg_data'], cap: 'Every access goes through the catalog.' }
        ]
      }),

      B.cmp({
        id: 'm1-compute', t: 1, src: 'docs', title: 'Compute types and when to use each',
        say: 'Databricks offers three families of compute: serverless, classic, and SQL warehouses. Press Next to read them one at a time. The documentation guides the choice, and the guidance changes, so check the current page before a design review.',
        cols: ['Compute', 'Best for', 'Where the VMs run', 'What you pay'],
        hl: 1,
        rows: [
          ['Serverless compute for notebooks and jobs', 'Interactive notebooks, and scheduled jobs for the task types it supports', 'Databricks account', 'One usage rate that includes the infrastructure'],
          ['Jobs compute (classic)', 'Scheduled jobs that need your own settings, or tasks serverless does not support, such as JAR and spark-submit', 'Your subscription', 'DBUs at the jobs rate, plus the VMs'],
          ['All-purpose compute (classic)', 'Interactive work that needs classic features, such as the RDD API or R', 'Your subscription', 'DBUs at the all-purpose rate, plus the VMs'],
          ['SQL warehouse, serverless', 'SQL queries, dashboards, BI tools and SQL transformations', 'Databricks account', 'One usage rate that includes the infrastructure'],
          ['SQL warehouse, pro or classic', 'SQL with custom networking, for example a query against an outside database', 'Your subscription', 'DBUs plus the VMs']
        ],
        steps: [
          { upto: 1, say: 'Serverless first. The documentation recommends it for interactive notebooks, and it is the default for job task types that support it. Databricks sets the machine size and scales it for you.' },
          { upto: 3, say: 'Classic compute: jobs compute and all-purpose compute. You choose the VM types and the number of workers. The documentation advises against all-purpose compute for production jobs, because its rate for each DBU is higher.' },
          { upto: 5, say: 'SQL warehouses run SQL only. Serverless is recommended for BI, ETL and exploration. Pro and classic warehouses run in your subscription, which matters when the query must reach a private network.' }
        ],
        pick: 'Start with **serverless** for notebooks, jobs and SQL when your workspace has it. Use **jobs compute** when a task needs your own libraries, instance types or a JAR. Keep **all-purpose compute** for developers, with auto-termination on.'
      }),

      B.talk({
        id: 'm1-bill', t: 1, src: 'docs', title: 'What a DBU is and what you pay',
        say: 'The bill has two parts on classic compute and one part on serverless. Press Next for each point.',
        items: [
          ['DBU', 'A **Databricks Unit** measures processing capability. Each VM type uses a number of DBUs each hour, and Databricks bills the DBUs you use by the second. The price of one DBU depends on the compute type and on your plan.', 'A unit of usage, not a unit of money.'],
          ['Classic compute: two bills', 'Databricks charges the DBUs. Your cloud provider charges the virtual machines, the disks and the network. You see them on two invoices, or on one invoice with two lines. A cost estimate must add both.', 'DBUs plus VMs.'],
          ['Serverless: one bill', 'The usage rate already includes the infrastructure. You see one line for the DBUs, and there is no VM line to tune.', 'One rate, no VM bill.'],
          ['An idle cluster still bills', 'A cluster bills from the moment it starts until it stops, whether a query runs or not. **Auto-termination** stops it after a set number of idle minutes. Without it, a cluster that someone forgot can bill for days.', 'Billing follows uptime, not work.'],
          ['Rates are not fixed numbers', 'Rates differ by cloud, region, plan and contract. The cost lab in mission 10 uses example rates so you can see the shape of the bill. Read your own contract for real numbers.', 'Use your own rates.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm1-azure', t: 1, src: 'docs', title: 'Azure Databricks and Databricks on AWS',
        say: 'Spark, Delta Lake and Unity Catalog work the same way on both clouds. The differences sit in the names around identity, storage and networking. Press Next to read them.',
        cols: ['Topic', 'Azure Databricks', 'Databricks on AWS'],
        hl: 1,
        rows: [
          ['Who signs in', 'Microsoft Entra ID users, groups and service principals', 'The Databricks account with SSO, or an identity provider you connect'],
          ['Object storage', 'ADLS Gen2, addressed as `abfss://container@account.dfs.core.windows.net/path`', 'S3, addressed as `s3://bucket/path`'],
          ['Storage access for Unity Catalog', 'An **access connector** with a managed identity, held in a storage credential', 'An **IAM role** that Unity Catalog assumes, held in a storage credential'],
          ['Secrets from outside', 'A secret scope backed by Azure Key Vault', 'A Databricks-backed secret scope, or a call to the cloud secret store'],
          ['Own network', 'VNet injection: the cluster VMs run in a virtual network you manage', 'A customer-managed VPC for the cluster VMs'],
          ['Private connectivity', 'Azure Private Link', 'AWS PrivateLink'],
          ['Billing', 'A Microsoft service that appears on the Azure invoice', 'Billed by Databricks, or through the AWS Marketplace']
        ],
        steps: [
          { upto: 2, say: 'Identity and storage. On Azure, Microsoft Entra ID is the one place that knows your people. Tables sit in ADLS Gen2.' },
          { upto: 5, say: 'Access, secrets and network. The access connector is the Azure answer to the IAM role. Mission 12 builds it step by step.' },
          { upto: 7, say: 'Private connectivity and billing. A finance team asks about the invoice before it asks about Spark, so know which invoice the numbers appear on.' }
        ],
        pick: 'Learn the Azure names for **identity**, **storage access** and **secrets**. Interviewers on an Azure team ask about the access connector and Key Vault-backed scopes more often than about Spark settings.'
      }),

      B.talk({
        id: 'm1-objects', t: 1, src: 'docs', title: 'What you find in a workspace',
        say: 'Open a workspace and you see a few kinds of objects. Press Next to meet them.',
        items: [
          ['Notebooks', 'Documents with cells of Python, SQL, Scala or R. You run them on compute and see results below each cell. Good for exploring. Weak as the only home of production code, because a notebook is hard to test and review.', 'Explore here.'],
          ['Git folders', 'A checkout of a Git repository inside the workspace. You edit, commit and push from there. Production code should live in a repository, and Databricks should run it from there.', 'Code belongs in Git.'],
          ['Jobs and pipelines', 'A job runs tasks in order, with a schedule, retries and alerts. A pipeline is a set of tables that Databricks maintains. Both appear in the sidebar with their run history.', 'The things that run.'],
          ['SQL editor and dashboards', 'Write a query, run it on a SQL warehouse, save it, and pin it to a dashboard. Analysts spend most of their time here.', 'For people who write SQL.'],
          ['Volumes', 'A volume is a governed folder for files that are not tables: raw CSV and JSON, images, models. You address it as `/Volumes/catalog/schema/volume/path`.', 'Files with permissions.'],
          ['Secrets', 'A secret scope holds keys and passwords. Code reads one with `dbutils.secrets.get`, and the value shows as `[REDACTED]` in the output.', 'Keep passwords out of code.']
        ],
        cols: 2
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'You delete a classic cluster. What happens to the Delta tables it wrote?',
        opts: [
          { t: 'They are deleted, because they lived on the cluster\'s disks', fb: 'Tables live in cloud storage, not on the cluster. The disks go away with the VMs, and the tables do not.' },
          { t: 'They stay in your cloud storage, and any compute can read them again', fb: '' },
          { t: 'They move to the control plane for safekeeping', fb: 'The control plane does not hold your table files.' },
          { t: 'They become read-only until you create a new cluster with the same name', fb: 'A table has no link to a cluster name.' }
        ],
        ok: 1, why: 'Delta tables are Parquet files and a transaction log in your storage account. Compute is replaceable. This is why you can run the same table on a small cluster at night and on a SQL warehouse by day.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'A developer leaves an all-purpose cluster running over a long weekend. Auto-termination was off. What do you pay for?',
        opts: [
          { t: 'Nothing, because no query ran', fb: 'Billing follows uptime. A running cluster bills with or without queries.' },
          { t: 'The DBUs, plus the virtual machines at your cloud provider, for every hour it ran', fb: '' },
          { t: 'Only the VMs, because DBUs count work done', fb: 'DBUs accrue for every hour the cluster is up, idle hours included.' },
          { t: 'Only the DBUs, because the VMs are free in your own subscription', fb: 'Your cloud provider bills the VMs in your subscription.' }
        ],
        ok: 1, why: 'Classic compute bills both parts for every hour it is up. Set auto-termination on every all-purpose cluster, for example after 30 to 60 idle minutes, and use a cluster policy so nobody can turn it off by accident.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the start of a classic cluster in order.',
        items: [
          'You click Start in the web app, which runs in the control plane',
          'The cluster manager receives the request',
          'The cluster manager asks your cloud for virtual machines in your network',
          'The machines boot and Databricks Runtime starts the driver and the workers',
          'The cluster shows as running and a notebook can attach to it'
        ],
        why: 'Request, manager, cloud, boot, attach. The minutes of waiting happen in the third and fourth steps, when real virtual machines start. Serverless compute is quick because Databricks keeps machines ready.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: where does the nightly pipeline run?',
        scenario: 'The Brewline pipeline runs for about **40 minutes** every night. It uses Python and SQL tasks only, reads and writes Delta tables, and needs no custom libraries beyond a few from PyPI. The team wants **low cost** and **no cluster tuning**.',
        opts: [
          { t: 'The shared all-purpose cluster that developers use', d: 'It exists already. No new setup.', lose: 'The nightly run competes with developers for the same machines, and the all-purpose rate for each DBU is higher. The documentation advises against it for production jobs.' },
          { t: 'A classic jobs compute cluster that starts for each run', d: 'Own VM types, own settings.', lose: 'It works and the DBU rate is lower than all-purpose. But the team now chooses VM types and worker counts, waits for VMs to start, and pays two bills. That is more work than this job needs.' },
          { t: 'Serverless compute for jobs', d: 'Databricks sizes and scales it. One usage rate.' }
        ],
        pick: 2,
        why: 'Python and SQL tasks are a supported case, and the goal is no tuning. Serverless starts fast, scales on its own and has no VM bill to forecast. Run the first week on serverless and compare the cost with a classic estimate for the same job.',
        when: 'Choose **classic jobs compute** when a task needs a JAR or spark-submit, an init script, a specific instance type, or a library that serverless does not allow. Choose it also when a long, steady job costs less on reserved VMs. Compare real costs before you decide.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'docs', title: 'Incident: analysts wait for the cluster every morning', time: '08:50',
        alert: '**Analysts say the first query of the day takes 6 minutes.** After that, queries are fast. The SQL runs on a classic all-purpose cluster with auto-termination set to 30 minutes.',
        clues: ['The cluster stops overnight, as designed', 'The event log shows a start that takes several minutes', 'Finance asked last month to cut compute cost'],
        opts: [
          { t: 'Switch the analysts to a serverless SQL warehouse', fb: '' },
          { t: 'Turn auto-termination off so the cluster never stops', fb: 'The wait disappears and the cluster bills 24 hours a day. Finance will notice.' },
          { t: 'Add 10 more workers to the cluster', fb: 'More workers do not shorten the start. They add VMs to start and to pay for.' },
          { t: 'Ask the analysts to start the cluster at 08:00', fb: 'It moves the wait to a person and keeps it. It also relies on nobody forgetting.' }
        ],
        best: 0,
        why: 'The delay is the start of virtual machines, and auto-termination is the reason for the start. Serverless warehouses start in seconds, stop themselves when idle, and bill only while they run. You get a fast first query and no idle cost.',
        checks: [
          ['Read the symptom', 'Only the first query is slow. That points to start time, not to query speed.'],
          ['Check the event log', 'The log shows the cluster terminating after idle time and starting again in the morning.'],
          ['List the options', 'Keep it running (costly), warm it up by hand (fragile), pre-warm with a pool (classic, still has costs), or use serverless (fast start, stops itself).'],
          ['Test on one team', 'Move the analysts to a serverless SQL warehouse for a week. Compare the first-query time and the cost.'],
          ['Set the rule', 'A cluster policy limits all-purpose clusters to a short auto-termination time.']
        ],
        tell: 'Analysts waited 6 minutes for the first query each morning because their all-purpose cluster stopped overnight and had to start virtual machines. I did not turn auto-termination off, because that would bill the cluster around the clock. I moved the analysts to a serverless SQL warehouse, which starts in seconds and stops when idle. The first query now returns quickly and we saw no idle cost. To prevent the same trouble, we added a cluster policy that caps auto-termination for all-purpose clusters.',
        prevent: ['Use **serverless SQL warehouses** for analyst work', 'Add a **cluster policy** that limits idle time and size', 'Watch the **usage dashboard** for clusters with long uptime and little work', 'Tag compute with the **team and the project** so cost has an owner']
      }),

      B.qa({
        id: 'qa-platform', t: 1, tag: 'Platform', secs: 60,
        q: 'What is Databricks, and how is it different from running Apache Spark yourself?',
        pts: ['Spark is the engine, Databricks is the managed platform around it', 'Compute that starts and stops on demand, classic or serverless', 'Delta Lake tables in your own cloud storage', 'Unity Catalog for names, grants and lineage', 'Jobs, pipelines and a workspace for notebooks, SQL and dashboards', 'You still own the data and pay for compute by usage'],
        short: 'Apache Spark is the open-source engine that splits work over many machines. Databricks is a managed platform built around it. It starts and stops the compute for you, either as clusters in my cloud subscription or as serverless compute. It stores tables in Delta Lake format in my own cloud storage, so the data outlives any cluster.\n\nOn top sit Unity Catalog, which names tables and controls who can read them, and jobs and pipelines, which run work on a schedule with retries. A workspace gives people notebooks, a SQL editor and dashboards.\n\nRunning Spark myself means I build and patch the cluster, the scheduler, the catalog and the security. With Databricks I trade that work for a usage bill, measured in DBUs. I keep my data in my storage, and I still decide the design.',
        fu: [
          ['Where does the data live?', 'In your own storage: ADLS Gen2 on Azure, S3 on AWS. Delta Lake tables are files plus a transaction log. Deleting a cluster does not touch them.'],
          ['What do you pay for?', 'On classic compute, DBUs to Databricks and the virtual machines to your cloud provider. On serverless, one usage rate that includes the infrastructure. Storage is billed by your cloud.']
        ],
        trap: 'Saying "Databricks is Spark in the cloud" and stopping. The answer should name the pieces Databricks adds: managed compute, Delta tables, the catalog and jobs.',
        real: 'Say which Databricks features your team used and which part of Spark you no longer had to run.'
      }),

      B.qa({
        id: 'qa-planes', t: 2, tag: 'Platform', secs: 90,
        q: 'Explain the control plane and the compute plane. Where does the data live, and who runs the machines?',
        pts: ['Control plane: web app, API, job scheduler, cluster manager, catalog, in the Databricks account', 'Classic compute plane: VMs in your subscription, in your network', 'Serverless compute plane: managed by Databricks, in the same region as the workspace', 'Tables stay in your storage in both cases', 'Network controls differ: VNet injection for classic, network policies for serverless', 'The privileges are checked by Unity Catalog in the control plane'],
        short: 'The control plane is Databricks\' side. It runs the web app and API, the job scheduler, the cluster manager and Unity Catalog. It lives in the Databricks account.\n\nThe compute plane is where Spark runs. With classic compute the virtual machines start in my own cloud subscription and my own network, so I control the network and I pay the VM bill. With serverless compute Databricks runs the machines in its own account, in the same region as my workspace. I give up control of instance types and gain fast starts and no VM management.\n\nMy tables stay in my own storage in both cases. Compute reads and writes them, and Unity Catalog checks the privileges first. For a regulated company I would use classic compute in a private network, or serverless compute with network policies and private endpoints, and I would confirm with the security team which option meets the rule.',
        fu: [
          ['Where do notebooks and results live?', 'Notebook source is stored in the workspace, which sits in the control plane. Results and logs follow your workspace settings. Check the documentation for your cloud before you promise a customer where results are stored.'],
          ['How do you keep traffic private?', 'Run the cluster in your own network (VNet injection on Azure), use Private Link to the workspace and the storage, and turn off public IPs on the nodes. For serverless, use network policies and private endpoints.']
        ],
        trap: 'Saying the data never leaves your account. Tables stay in your storage, but serverless compute is in the Databricks account and reads them from there.',
        real: 'Describe how your workspace was deployed and what your security team required.'
      }),

      B.qa({
        id: 'qa-compute', t: 2, tag: 'Platform', secs: 90,
        q: 'How do you choose compute for a nightly job, for a data scientist, and for a dashboard?',
        pts: ['Nightly job: serverless jobs compute, or jobs compute when it needs custom settings', 'Never all-purpose compute for production jobs', 'Data scientist: serverless notebooks or a small all-purpose cluster with auto-termination', 'Dashboard: a serverless SQL warehouse', 'Cluster policies, tags and budgets as the guardrails', 'Compare real cost for one week before you commit'],
        short: 'For the nightly job I start with serverless jobs compute, because it starts fast, scales on its own and has no VM bill. If the job needs a JAR, an init script or a specific instance type, I use classic jobs compute, which starts for the run and stops when it ends. I do not run production jobs on all-purpose compute. Its rate for each DBU is higher, and the job competes with people for the machines.\n\nFor a data scientist I use serverless notebooks, or a small all-purpose cluster with auto-termination after about 30 to 60 minutes when they need classic features.\n\nFor a dashboard I use a serverless SQL warehouse, because it starts in seconds and stops when idle.\n\nI add cluster policies for size and idle time, and tags for team and project. Then I compare one week of real cost before I lock the choice.',
        fu: [
          ['When would serverless cost more?', 'For a long, steady job on full machines that you could run on discounted VMs. Estimate both and compare, because the rates differ by plan and region.'],
          ['What is a cluster policy?', 'A rule set that limits what users may configure: the maximum size, the allowed VM types, the idle time and required tags. It keeps cost and settings consistent.']
        ],
        trap: 'Giving one answer for every workload. The point is that different workloads fit different compute.',
        real: 'Describe a compute choice that cut your bill, with the before and after numbers.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Platform Pilot', color: '#BFDBFE',
        pts: [
          'Databricks is the **platform around Spark**: workspace, compute, Delta tables, Unity Catalog, jobs.',
          'The **control plane** is Databricks\' side. **Classic compute** runs in your subscription. **Serverless** runs in a Databricks-managed layer.',
          'Tables are files and a log in **your storage**. Compute is replaceable.',
          'Classic compute bills **DBUs plus VMs** for every hour it is up. Serverless bills one rate. Set **auto-termination**.',
          'Use serverless first, **jobs compute** for custom settings, and **all-purpose** only for people.',
          'Azure names: **Entra ID**, **ADLS Gen2**, **access connector**, **Key Vault**, **VNet injection**.'
        ],
        lines: [
          'The tables stay in my storage, so I can change the compute.',
          'I never run a production job on an all-purpose cluster.',
          'I compare real cost for a week before I commit to a compute choice.'
        ]
      })
    ]
  });
})();
